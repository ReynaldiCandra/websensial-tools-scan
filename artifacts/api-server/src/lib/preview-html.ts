import { toWaNumber } from "./phone";

export type PreviewTemplateStyle =
  | "classic"
  | "fashion-catalog"
  | "company-modern"
  | "company-elegant"
  | "company-minimal";

export interface PreviewPageData {
  businessName: string;
  ownerName?: string | null;
  category: string;
  phone: string;
  address?: string | null;
  tagline: string;
  services: string[];
  aboutText: string;
  colorScheme: string;
}

const THEMES: Record<string, { primary: string; light: string; ink: string }> = {
  indigo: { primary: "#4f46e5", light: "#eef2ff", ink: "#171832" },
  emerald: { primary: "#059669", light: "#ecfdf5", ink: "#102b24" },
  amber: { primary: "#d97706", light: "#fffbeb", ink: "#33220f" },
  rose: { primary: "#e11d48", light: "#fff1f2", ink: "#35131d" },
  violet: { primary: "#7c3aed", light: "#f5f3ff", ink: "#24163b" },
  slate: { primary: "#475569", light: "#f1f5f9", ink: "#111827" },
};

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[char] ?? char).replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
}

function safeUrl(value: string): string {
  return escape(value).replace(/[\u0000-\u0020]/g, "");
}

function htmlText(value: string): string {
  return escape(value).replace(/\n/g, "<br>");
}

function waLink(phone: string, message: string): string {
  const number = toWaNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "#contact";
}

function pageHead(title: string, description: string, style: string): string {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff"><meta name="description" content="${escape(description)}"><title>${escape(title)}</title><style>${style}</style></head>`;
}

const PRODUCTS = [
  { category: "OUTER & ATASAN", name: "Blazer Linen Classic", price: 289000, oldPrice: 389000, discount: 26, rating: "4.9", reviews: 128, sold: 580, stock: 24, image: "photo-1490481651871-ab68de25d43d" },
  { category: "KOLEKSI DAILY", name: "Everyday Knit Top", price: 159000, oldPrice: 219000, discount: 27, rating: "4.8", reviews: 96, sold: 540, stock: 18, image: "photo-1529139574466-a303027c1d8b" },
  { category: "DRESS & PESTA", name: "Satin Midi Dress", price: 329000, oldPrice: 429000, discount: 23, rating: "5.0", reviews: 74, sold: 520, stock: 12, image: "photo-1483985988355-763728e1935b" },
  { category: "AKSESORIS", name: "Mini Shoulder Bag", price: 199000, oldPrice: 279000, discount: 29, rating: "4.9", reviews: 82, sold: 490, stock: 31, image: "photo-1523381210434-271e8be1f52b" },
];

export function renderFashionCatalogHTML(data: PreviewPageData): string {
  const name = escape(data.businessName);
  const tagline = escape(data.tagline);
  const category = escape(data.category);
  const number = toWaNumber(data.phone);
  const contactUrl = safeUrl(waLink(data.phone, `Halo ${data.ownerName ?? data.businessName}, saya ingin bertanya tentang koleksi ${data.businessName}.`));
  const theme = THEMES[data.colorScheme] ?? THEMES.indigo;
  const formatPrice = (value: number) => `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
  const cards = PRODUCTS.map((product, index) => `
    <article class="product-card">
      <div class="product-photo">
        <img src="https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=640&q=68" alt="Contoh produk ${escape(product.name)}" loading="${index === 0 ? "eager" : "lazy"}" ${index === 0 ? 'fetchpriority="high"' : ""}>
        <span class="discount">Diskon ${product.discount}%</span>
        <button class="favorite" type="button" aria-label="Simpan ${escape(product.name)}" aria-pressed="false">♡</button>
      </div>
      <div class="product-info">
        <div class="product-category">${product.category}</div>
        <h2>${escape(product.name)}</h2>
        <div class="old-price">${formatPrice(product.oldPrice)}</div>
        <div class="price">${formatPrice(product.price)}</div>
        <div class="product-meta"><span class="rating">★</span> ${product.rating} <span class="muted">(${product.reviews})</span><span class="dot">·</span><span class="muted">Terjual ${product.sold}</span></div>
        <div class="stock">Stok: ${product.stock}</div>
        <button class="add-product" type="button" data-product="${escape(product.name)}" aria-label="Tambah ${escape(product.name)} ke pilihan">+</button>
      </div>
    </article>`).join("");

  return `${pageHead(data.businessName, data.tagline, `
    *{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#202833;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.demo{background:#202833;color:#fff;text-align:center;padding:9px 12px;font-size:12px}.demo strong{color:#f6ce75}header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e9ebef;padding:14px max(18px,calc((100% - 1120px)/2));display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-weight:800;font-size:18px;color:#202833;text-decoration:none}.brand span{color:${theme.primary}}.header-link{color:${theme.primary};font-size:13px;font-weight:700;text-decoration:none}.intro{max-width:1120px;margin:auto;padding:30px 18px 18px}.eyebrow{font-size:11px;letter-spacing:.14em;font-weight:800;color:${theme.primary};text-transform:uppercase}.intro h1{font-size:clamp(24px,5vw,36px);line-height:1.1;margin:8px 0}.intro p{margin:0;color:#68717c;font-size:14px}.toolbar{max-width:1120px;margin:0 auto 12px;padding:0 18px;display:flex;justify-content:space-between;align-items:center;color:#69727d;font-size:12px}.toolbar strong{color:#202833}.product-grid{max-width:1120px;margin:0 auto;padding:0 14px 90px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.product-card{position:relative;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 3px 14px #1d26300d;min-width:0}.product-photo{height:clamp(145px,25vw,250px);position:relative;background:linear-gradient(135deg,#e8e9eb,#d9dce0);overflow:hidden}.product-photo img{width:100%;height:100%;object-fit:cover;display:block}.discount{position:absolute;left:10px;top:10px;background:#bb2027;color:white;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:800;transform:rotate(-2deg)}.favorite{position:absolute;right:10px;top:10px;width:34px;height:34px;border:0;border-radius:50%;background:#ffffffd9;color:#747b83;font-size:23px;cursor:pointer}.favorite[aria-pressed=true]{color:#e73555}.product-info{padding:13px 13px 16px;position:relative;min-height:168px}.product-category{font-size:10px;letter-spacing:.06em;font-weight:700;color:#7c858f;margin-bottom:5px}.product-info h2{font-size:15px;line-height:1.25;margin:0 22px 8px 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:38px;color:#202833}.old-price{font-size:11px;color:#8b9199;text-decoration:line-through}.price{font-size:18px;font-weight:850;color:#b6262d;margin:3px 0 9px}.product-meta{font-size:11px;color:#4e5964;white-space:nowrap}.rating{color:#f2ae00;font-size:16px}.muted{color:#838b94}.dot{color:#c3c7cc;padding:0 5px}.stock{font-size:11px;color:#7b838c;margin-top:9px}.add-product{position:absolute;right:10px;bottom:10px;width:34px;height:34px;border:0;border-radius:50%;background:#e7eaee;color:${theme.primary};font-size:23px;line-height:1;cursor:pointer}.add-product:hover{background:${theme.primary};color:#fff}.floating-contact{position:fixed;right:20px;bottom:18px;z-index:8;border:0;border-radius:999px;background:#08b982;color:white;padding:13px 19px;font-size:14px;font-weight:800;text-decoration:none;box-shadow:0 5px 18px #0002}.toast{position:fixed;left:50%;bottom:78px;transform:translate(-50%,12px);opacity:0;pointer-events:none;background:#202833;color:white;border-radius:10px;padding:11px 15px;font-size:13px;transition:.2s;z-index:9}.toast.show{opacity:1;transform:translate(-50%,0)}footer{text-align:center;color:#89919a;padding:18px;font-size:11px}@media(max-width:760px){.product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0 8px 90px}.product-photo{height:clamp(165px,44vw,240px)}.product-info{padding:11px 10px 15px;min-height:170px}.product-info h2{font-size:14px}.price{font-size:17px}.product-meta{font-size:10px}.intro{padding-top:24px}}@media(min-width:761px) and (max-width:1000px){.product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
  `)}</head><body>
    <div class="demo">PREVIEW DEMO <strong>· Kartu produk contoh</strong> dibuat untuk presentasi</div>
    <header><a class="brand" href="#top">✦ <span>${name}</span></a><a class="header-link" href="${safeUrl(contactUrl)}">Hubungi toko ↗</a></header>
    <main id="top"><section class="intro"><div class="eyebrow">${category} · Koleksi pilihan</div><h1>${name}</h1><p>${htmlText(data.tagline)}</p></section>
      <div class="toolbar"><span><strong>Koleksi unggulan</strong> · Produk contoh untuk demo</span><span id="selection-count">0 dipilih</span></div>
      <section class="product-grid" aria-label="Katalog produk contoh">${cards}</section>
    </main>
    <a class="floating-contact" id="contact" href="${safeUrl(contactUrl)}">WhatsApp toko</a><div class="toast" role="status" aria-live="polite"></div>
    <footer>Produk dan harga pada halaman ini adalah contoh demo · © ${new Date().getFullYear()} ${name}</footer>
    <script>
      (()=>{const selected=[];const toast=document.querySelector('.toast');let timer;document.querySelectorAll('.favorite').forEach(button=>button.addEventListener('click',()=>{const active=button.getAttribute('aria-pressed')==='true';button.setAttribute('aria-pressed',String(!active));button.textContent=active?'♡':'♥'}));document.querySelectorAll('.add-product').forEach(button=>button.addEventListener('click',()=>{selected.push(button.dataset.product);document.querySelector('#selection-count').textContent=selected.length+' dipilih';toast.textContent=button.dataset.product+' ditambahkan ke pilihan';toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),1800)}));const contact=document.querySelector('#contact');contact.addEventListener('click',event=>{if(selected.length&&${number ? "true" : "false"}){event.preventDefault();location.href='https://wa.me/${number}?text='+encodeURIComponent('Halo, saya tertarik dengan: '+selected.join(', '))}})})();
    </script>
  </body></html>`;
}

export function renderPremiumProfileHTML(data: PreviewPageData, style: Exclude<PreviewTemplateStyle, "classic" | "fashion-catalog">): string {
  const name = escape(data.businessName);
  const category = escape(data.category);
  const tagline = escape(data.tagline);
  const about = escape(data.aboutText);
  const address = escape(data.address ?? "");
  const theme = THEMES[data.colorScheme] ?? THEMES.indigo;
  const icon = data.category === "Kuliner" ? "✦" : data.category === "Fashion" ? "✧" : "◈";
  const contactUrl = safeUrl(waLink(data.phone, `Halo ${data.ownerName ?? data.businessName}, saya ingin tahu lebih lanjut tentang ${data.businessName}.`));
  const services = data.services.map((service, index) => `<article class="service"><span>0${index + 1}</span><h3>${escape(service)}</h3><i>↗</i></article>`).join("");
  const titleFont = style === "company-elegant" ? "Georgia,serif" : "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

  return `${pageHead(data.businessName, data.tagline, `
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);font-family:${titleFont};background:#fff;--primary:${theme.primary};--soft:${theme.light};--ink:${theme.ink};--muted:#727782}.demo{padding:9px 18px;background:#151922;color:#fff;text-align:center;font:11px Inter,system-ui,sans-serif;letter-spacing:.04em}.demo b{color:#d9c38b}nav{height:72px;display:flex;align-items:center;justify-content:space-between;max-width:1120px;padding:0 24px;margin:auto}.brand{font-size:16px;font-weight:800;text-decoration:none;color:var(--ink)}.brand span{color:var(--primary)}nav a:last-child,.cta{background:var(--primary);color:#fff;padding:12px 18px;border-radius:${style === "company-elegant" ? "3px" : style === "company-minimal" ? "8px" : "999px"};text-decoration:none;font:700 12px Inter,system-ui,sans-serif}.hero{min-height:490px;background:linear-gradient(110deg,#111827ed,#17202bd9),radial-gradient(ellipse at 80% 20%,var(--primary),transparent 55%);color:white;display:flex;align-items:center}.hero-inner{width:min(1120px,100%);padding:76px 24px;margin:auto}.eyebrow{text-transform:uppercase;letter-spacing:.18em;color:#d9c38b;font:700 11px Inter,system-ui,sans-serif}.hero h1{font-size:clamp(42px,7vw,76px);line-height:1.03;letter-spacing:-.045em;max-width:850px;margin:18px 0}.hero p{max-width:620px;color:#e2e5e9;font-size:17px;line-height:1.7;margin:0 0 28px}.hero .cta{display:inline-block;background:#fff;color:var(--ink);padding:15px 22px}.section{max-width:1120px;margin:auto;padding:82px 24px}.section-heading{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:30px}.section-heading small{color:var(--primary);font:800 11px Inter,system-ui,sans-serif;letter-spacing:.15em;text-transform:uppercase}.section-heading h2{font-size:clamp(28px,4vw,42px);letter-spacing:-.03em;margin:8px 0 0}.service-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.service{position:relative;padding:24px;border:1px solid #e8e8e5;border-radius:${style === "company-elegant" ? "2px" : style === "company-minimal" ? "8px" : "14px"};min-height:122px;display:flex;flex-direction:column;justify-content:space-between}.service span{color:var(--primary);font:700 11px Inter,system-ui,sans-serif}.service h3{font-size:18px;margin:20px 25px 0 0}.service i{position:absolute;right:22px;bottom:20px;color:var(--primary);font-style:normal}.about{background:var(--soft)}.about-inner{max-width:1120px;margin:auto;padding:72px 24px;display:grid;grid-template-columns:.8fr 1.2fr;gap:70px;align-items:center}.about-mark{aspect-ratio:1.1;border-radius:${style === "company-elegant" ? "2px" : "18px"};background:linear-gradient(145deg,var(--primary),var(--ink));display:grid;place-items:center;color:white;font-size:96px}.about h2{font-size:clamp(28px,4vw,42px);letter-spacing:-.03em;margin:10px 0}.about p{color:#525b65;line-height:1.9;font-size:15px}.contact{max-width:900px;margin:68px auto;padding:54px 24px;border-radius:${style === "company-elegant" ? "2px" : "20px"};background:var(--ink);color:#fff;text-align:center}.contact h2{font-size:clamp(28px,4vw,42px);margin:12px 0}.contact p{color:#d5d8dd;margin:0 0 24px}.contact .cta{display:inline-block}.contact-info{margin-top:18px;color:#bec3cb;font:12px Inter,system-ui,sans-serif}footer{border-top:1px solid #e8e8e5;text-align:center;padding:24px;color:var(--muted);font:11px Inter,system-ui,sans-serif}@media(max-width:700px){nav{height:62px;padding:0 16px}.hero{min-height:410px}.hero-inner{padding:60px 20px}.hero p{font-size:15px}.section{padding:58px 18px}.service-grid{grid-template-columns:1fr 1fr;gap:8px}.service{padding:16px;min-height:112px}.service h3{font-size:15px}.about-inner{padding:56px 18px;grid-template-columns:1fr;gap:25px}.about-mark{aspect-ratio:1.8;font-size:65px}.contact{margin:38px 14px;padding:42px 18px}.section-heading{align-items:start;flex-direction:column}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
  `)}</head><body>
    <div class="demo">WEBSENSIAL WEBSITE CONCEPT <b>· PREMIUM PREVIEW</b></div>
    <nav><a class="brand" href="#top">${icon} <span>${name}</span></a><a href="${safeUrl(contactUrl)}">Konsultasi ↗</a></nav>
    <main id="top"><section class="hero"><div class="hero-inner"><div class="eyebrow">${category} · ${name}</div><h1>${htmlText(data.tagline)}</h1><p>${htmlText(data.aboutText)}</p><a class="cta" href="${safeUrl(contactUrl)}">Hubungi Kami&nbsp; ↗</a></div></section>
      <section class="section"><div class="section-heading"><div><small>Yang Kami Tawarkan</small><h2>Layanan unggulan</h2></div></div><div class="service-grid">${services}</div></section>
      <section class="about"><div class="about-inner"><div class="about-mark" aria-hidden="true">${icon}</div><div><div class="eyebrow">Tentang Kami</div><h2>Mengutamakan kualitas di setiap detail.</h2><p>${htmlText(data.aboutText)}</p>${address ? `<p>⌖ ${address}</p>` : ""}</div></div></section>
      <section class="contact" id="contact"><div class="eyebrow">Kami siap membantu</div><h2>Mari mulai percakapan.</h2><p>Ceritakan kebutuhan Anda, kami dengan senang hati membantu.</p><a class="cta" href="${safeUrl(contactUrl)}" target="_blank" rel="noopener">Chat via WhatsApp ↗</a>${data.phone ? `<div class="contact-info">${escape(data.phone)}</div>` : ""}</section>
    </main><footer>© ${new Date().getFullYear()} ${name} · ${category} <br><br>Website concept by Websensial</footer>
  </body></html>`;
}
