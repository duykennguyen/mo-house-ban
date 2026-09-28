// Mô House · Chuyển nhượng — đọc view công khai public_sale_listings (chỉ đọc, không đăng nhập)
(function () {
  const C = window.MO_CONFIG;

  // Mọi chữ lấy từ database đều đi qua esc() trước khi chèn vào trang
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Chỉ nhận link ảnh trong site (anh/...) hoặc https — chặn javascript: và đường dẫn lạ
  const url = (s) => (/^(https:\/\/|anh\/)[^"'<>\s]*$/.test(s || "") ? s : "");

  // 18000000000 → "18 tỷ" · 11200000000 → "11,2 tỷ" · 2950000000 → "2,95 tỷ"
  function gia(v) {
    if (v == null) return "Liên hệ";
    if (v >= 1e9) return (v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + " tỷ";
    return (v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " triệu";
  }
  const m2 = (v) => (v ? Number(v).toLocaleString("vi-VN") + " m²" : "");

  async function doc(query) {
    const r = await fetch(`${C.SUPABASE_URL}/rest/v1/public_sale_listings?${query}`, {
      headers: { apikey: C.SUPABASE_ANON_KEY, Accept: "application/json" },
    });
    if (!r.ok) throw new Error("Không tải được dữ liệu (" + r.status + ")");
    return r.json();
  }

  const lienHe = (ten) => {
    const loi = encodeURIComponent(`Chào Mô Đi Phê, tôi quan tâm tài sản "${ten}".`);
    return `<div class="nut-hang">
      <a class="nut chinh" href="${esc(C.ZALO)}" target="_blank" rel="noopener">Nhắn Zalo</a>
      <a class="nut" href="${esc(C.WHATSAPP)}?text=${loi}" target="_blank" rel="noopener">WhatsApp</a></div>`;
  };

  // ---------- Trang danh mục ----------
  async function danhMuc(el) {
    try {
      const ds = await doc("select=slug,title,tagline,area_label,kind_label,land_area_m2,asking_price,cover_url,sort&order=sort");
      if (!ds.length) { el.innerHTML = `<p class="bao">Hiện chưa có tài sản nào đang chào bán.</p>`; return; }
      el.innerHTML = ds.map((t) => `
        <a class="the" href="tai-san.html?ma=${encodeURIComponent(t.slug)}">
          <div class="anh" style="background-image:url('${esc(url(t.cover_url))}')" role="img" aria-label="${esc(t.title)}"></div>
          <div class="than">
            <span class="nhan">${esc(t.kind_label)}</span>
            <h2>${esc(t.title)}</h2>
            <p class="mo-ta">${esc(t.area_label)}${t.land_area_m2 ? " · " + m2(t.land_area_m2) + " đất" : ""}</p>
            <p class="mo-ta">${esc(t.tagline)}</p>
            <div class="gia">${gia(t.asking_price)} <small>giá chào</small></div>
          </div>
        </a>`).join("");
    } catch (e) {
      el.innerHTML = `<p class="bao">${esc(e.message)}. Tải lại trang sau ít phút.</p>`;
    }
  }

  // ---------- Trang chi tiết ----------
  const bangDong = (ds) => ds?.length
    ? `<table class="bang">${ds.map((d) => `<tr><th>${esc(d.nhan)}</th><td>${esc(d.gia_tri)}</td></tr>`).join("")}</table>` : "";
  const hangAnh = (ds) => ds?.length
    ? `<div class="anh-hang">${ds.map((a) => `<button type="button" data-anh="${esc(url(a.url))}" data-cap="${esc(a.chu_thich)}">
        <img src="${esc(url(a.url))}" alt="${esc(a.chu_thich)}" loading="lazy"></button>`).join("")}</div>` : "";

  async function chiTiet(el) {
    const ma = new URLSearchParams(location.search).get("ma") || "";
    if (!/^[a-z0-9-]+$/.test(ma)) { el.innerHTML = `<p class="bao wrap">Không tìm thấy tài sản. <a href="./">Xem danh sách</a></p>`; return; }
    let t;
    try { [t] = await doc("select=*&slug=eq." + encodeURIComponent(ma)); }
    catch (e) { el.innerHTML = `<p class="bao wrap">${esc(e.message)}</p>`; return; }
    if (!t) { el.innerHTML = `<p class="bao wrap">Tài sản này không còn chào bán hoặc đường dẫn sai. <a href="./">Xem danh sách</a></p>`; return; }

    document.title = `${t.title} · Mô House Chuyển nhượng`;
    const lp = t.legal_public || {}, cf = t.cash_flow || {};
    el.innerHTML = `
      ${t.cover_url ? `<div class="ts-bia" style="background-image:url('${esc(url(t.cover_url))}')" role="img" aria-label="${esc(t.title)}"></div>` : ""}
      <div class="wrap">
        <section class="ts-tieu-de">
          <div>
            <span class="nhan">${esc(t.kind_label)}</span>
            <h1>${esc(t.title)}</h1>
            <p class="phu">${esc(t.area_label)}</p>
            <p>${esc(t.summary)}</p>
          </div>
          <aside class="hop-gia">
            <span class="nhan">Giá chào bán</span>
            <div class="so">${t.asking_price ? Number(t.asking_price).toLocaleString("vi-VN") + " đ" : "Liên hệ"}</div>
            <p>${esc(t.price_note)}</p>
            ${lienHe(t.title)}
          </aside>
        </section>

        <section class="muc"><h2>Tổng quan</h2>${bangDong(t.facts)}
          ${t.map_url ? `<p class="ghi-chu"><a href="${esc(url(t.map_url))}" target="_blank" rel="noopener">Xem vị trí trên Google Maps</a></p>` : ""}</section>

        ${t.highlights?.length ? `<section class="muc"><h2>Ưu điểm nổi bật</h2><ul class="ds">${t.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></section>` : ""}

        ${t.photos?.length ? `<section class="muc"><h2>Hình ảnh</h2>${hangAnh(t.photos)}</section>` : ""}

        ${t.sections?.length ? `<section class="muc"><h2>Chi tiết không gian</h2><div class="cap-muc">${t.sections.map((s) =>
          `<div><h3>${esc(s.tieu_de)}</h3>${bangDong(s.dong)}${hangAnh(s.anh)}</div>`).join("")}</div></section>` : ""}

        ${cf.bang?.length ? `<section class="muc"><h2>Dòng tiền & doanh thu</h2>
          ${cf.mo_ta ? `<p>${esc(cf.mo_ta)}</p>` : ""}
          <table class="bang dong-tien"><tr><th>Hạng mục</th><th>Theo tháng / đêm</th><th>Theo năm</th></tr>
          ${cf.bang.map((r) => `<tr><td>${esc(r.hang_muc)}</td><td>${esc(r.thang)}</td><td>${esc(r.nam)}</td></tr>`).join("")}</table>
          ${cf.ghi_chu ? `<p class="ghi-chu">${esc(cf.ghi_chu)}</p>` : ""}</section>` : ""}

        <section class="muc"><h2>Pháp lý</h2>
          ${lp.hinh_thuc ? bangDong([
            { nhan: "Hình thức", gia_tri: lp.hinh_thuc }, lp.loai_dat && { nhan: "Loại đất", gia_tri: lp.loai_dat },
            { nhan: "Tình trạng", gia_tri: lp.tinh_trang }].filter(Boolean)) : `<p class="trong">Đang cập nhật.</p>`}
          ${lp.ghi_chu ? `<p class="ghi-chu">${esc(lp.ghi_chu)}</p>` : ""}</section>

        ${t.risks?.length ? `<section class="muc"><h2>Điểm cần lưu ý</h2><ul class="ds luu-y">${t.risks.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
          <p class="ghi-chu">Chúng tôi nêu minh bạch để bên mua chủ động trong bài toán đầu tư.</p></section>` : ""}

        <section class="muc"><h2>Liên hệ xem nhà</h2><p>Hẹn xem tài sản, nhận hồ sơ pháp lý đầy đủ khi thẩm định.</p>${lienHe(t.title)}</section>
      </div>`;
  }

  // ---------- Xem ảnh lớn ----------
  function xemAnh() {
    const hop = document.createElement("div");
    hop.className = "xem-anh";
    hop.innerHTML = `<button class="dong" type="button" aria-label="Đóng">×</button><figure><img alt=""><figcaption></figcaption></figure>`;
    document.body.appendChild(hop);
    const dong = () => hop.classList.remove("mo");
    hop.addEventListener("click", (e) => { if (e.target === hop || e.target.classList.contains("dong")) dong(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") dong(); });
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-anh]");
      if (!b) return;
      hop.querySelector("img").src = b.dataset.anh;
      hop.querySelector("img").alt = b.dataset.cap;
      hop.querySelector("figcaption").textContent = b.dataset.cap;
      hop.classList.add("mo");
    });
  }

  const ds = document.getElementById("danh-muc");
  const ct = document.getElementById("chi-tiet");
  if (ds) danhMuc(ds);
  if (ct) { chiTiet(ct); xemAnh(); }
})();
