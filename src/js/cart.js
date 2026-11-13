// Giỏ hàng dùng chung (bản tĩnh, lưu sessionStorage 'dz-cart' = { id: { q, s } }).
// - Nút thêm: <button data-add-to-cart data-product="id"> hoặc data-products="id1,id2" (bộ sản phẩm)
// - Số lượng: nếu nút nằm trong [data-qty-scope] thì đọc [data-qty-value] (text) hoặc [data-qty-input] (value)
// - Drawer (#cart-drawer) được dựng bằng JS và mở sau khi thêm; #mo-gio-hang trên URL cũng mở drawer.
// - Badge giỏ ở header: mọi phần tử [data-cart-count] được cập nhật theo giỏ.

const KEY = 'dz-cart';
const IMG = 'assets/img/san-pham/';

export const CATALOG = {
  'blue-light': { name: 'Blue Light Shield Tone-Up Fluid Sunscreen', size: '50 g', price: 1000000, tag: 'CHỐNG NẮNG', img: IMG + 'blue-light-shield.webp' },
  neobright: { name: 'NeoBright Repair Cream', size: '50 g', price: 890000, tag: 'PHỤC HỒI', img: IMG + 'neobright-repair-cream.webp' },
  cleansing: { name: 'Purifying Cleansing Gel', size: '150 ml', price: 450000, tag: 'LÀM SẠCH', img: IMG + 'cleansing-gel.webp' },
  'photo-defense': { name: 'Photo Defense Brightening Serum', size: '30 ml', price: 1200000, tag: 'CHĂM SÓC CHUYÊN SÂU', img: IMG + 'photo-defense-brightening-serum.webp' },
  retino: { name: 'Retino Renewal Brightening Serum', size: '30 ml', price: 1350000, tag: 'CHĂM SÓC CHUYÊN SÂU', img: IMG + 'retino-renewal-brightening-serum.webp' },
  zinc: { name: 'Zinc Complex Serum', size: '30 ml', price: 780000, tag: 'CHĂM SÓC CHUYÊN SÂU', img: IMG + 'zinc-complex-serum.webp' },
  blemish: { name: 'Blemish Recovery Hydrating Cream', size: '50 g', price: 690000, tag: 'PHỤC HỒI', img: IMG + 'step-blemish-cream.webp' },
};

// Giỏ mẫu mặc định (khớp trang giỏ hàng trong Figma) khi chưa có dữ liệu
const DEFAULT_CART = { 'blue-light': { q: 1, s: true }, neobright: { q: 1, s: true }, cleansing: { q: 2, s: true } };
let memory = null;

export const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VNĐ';
export function load() {
  try {
    const v = sessionStorage.getItem(KEY);
    return v ? JSON.parse(v) : JSON.parse(JSON.stringify(memory || DEFAULT_CART));
  } catch (e) { return JSON.parse(JSON.stringify(memory || DEFAULT_CART)); }
}
export function save(c) { memory = c; try { sessionStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* bỏ qua */ } }
export const count = (c = load()) => Object.keys(c).reduce((n, id) => n + (c[id].q > 0 ? c[id].q : 0), 0);

export function add(id, q = 1) {
  if (!CATALOG[id]) return load();
  const c = load();
  const cur = c[id] && c[id].q > 0 ? c[id].q : 0;
  c[id] = { q: Math.min(99, cur + q), s: true };
  save(c);
  return c;
}

export function syncBadges() {
  const n = count();
  document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = n; });
}

// ---- Trang giỏ hàng / thanh toán: dựng dòng cho sản phẩm có trong giỏ nhưng chưa có trong HTML tĩnh ----
const setText = (el, t) => { if (el) el.textContent = t; };
export function fillCartRow(li, id) {
  const p = CATALOG[id];
  li.dataset.id = id; li.dataset.price = p.price;
  setText(li.querySelector('.sr-only'), 'Chọn ' + p.name);
  const img = li.querySelector('img.object-contain'); if (img) { img.src = p.img; img.alt = p.name; }
  setText(li.querySelector('p.text-brown'), p.tag);
  setText(li.querySelector('h3 a'), p.name);
  li.querySelectorAll('p').forEach((el) => {
    if (/^Khối lượng/.test(el.textContent)) el.textContent = 'Khối lượng: ' + p.size;
    else if (/^Đơn giá/.test(el.textContent)) el.textContent = 'Đơn giá: ' + fmt(p.price);
  });
  li.querySelectorAll('div').forEach((el) => { if (el.children.length === 0 && /VNĐ$/.test(el.textContent.trim())) el.textContent = fmt(p.price); });
  setText(li.querySelector('[data-row-total]'), fmt(p.price));
  setText(li.querySelector('[data-qty-value]'), '1');
}
export function fillLine(li, id) {
  const p = CATALOG[id];
  li.dataset.line = id; li.dataset.price = p.price; li.dataset.qty = '1';
  const img = li.querySelector('img'); if (img) { img.src = p.img; img.alt = p.name; }
  const ps = li.querySelectorAll('.min-w-0 p'); if (ps[0]) ps[0].textContent = p.name; if (ps[1]) ps[1].textContent = p.size;
  setText(li.querySelector('[data-line-total]'), fmt(p.price));
}
// container: <ul>; sel: selector của dòng; attr: 'id' | 'line'; fill: fillCartRow | fillLine
export function ensureRows(container, sel, attrName, fill) {
  const c = load(); const tpl = container.querySelector(sel); if (!tpl) return;
  Object.keys(c).forEach((id) => {
    if (!CATALOG[id] || !(c[id].q > 0)) return;
    if (container.querySelector('[data-' + attrName + '="' + id + '"]')) return;
    const li = tpl.cloneNode(true); li.classList.remove('hidden'); li.style.opacity = '';
    fill(li, id); container.appendChild(li);
  });
}

// ---- Drawer ----
let drawer = null; let lastFocus = null;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ensureDrawer() {
  if (drawer) return drawer;
  drawer = document.createElement('div');
  drawer.id = 'cart-drawer'; drawer.setAttribute('data-drawer', ''); drawer.setAttribute('aria-hidden', 'true');
  drawer.className = 'group invisible fixed inset-0 z-[100] transition-[visibility] duration-300 [&.is-open]:visible';
  drawer.innerHTML = `
  <div data-drawer-close class="absolute inset-0 bg-navy/45 opacity-0 transition-opacity duration-300 group-[.is-open]:opacity-100"></div>
  <aside role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" tabindex="-1" class="absolute right-0 top-0 flex h-full w-full max-w-[480px] translate-x-full flex-col bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.18)] transition-transform duration-300 focus:outline-none group-[.is-open]:translate-x-0">
    <div class="flex items-center gap-3 border-b border-gray-ee px-6 py-5">
      <h2 id="cart-drawer-title" class="flex-1 text-xl font-medium text-navy" data-drawer-title>Giỏ hàng</h2>
      <button type="button" data-drawer-close class="grid size-8 place-items-center rounded-sm text-xl leading-none text-navy hover:bg-brown-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brown" aria-label="Đóng giỏ hàng"><span aria-hidden="true">&times;</span></button>
    </div>
    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
      <div data-drawer-status class="flex items-center gap-2.5 rounded-sm bg-[#eaf4ec] px-3.5 py-3" role="status" hidden>
        <span aria-hidden="true" class="shrink-0 text-sm text-[#2f5d3a]">✓</span>
        <p class="flex-1 text-sm leading-5 text-[#2f5d3a]" data-drawer-status-text></p>
      </div>
      <div class="flex flex-col gap-3 rounded-md bg-brown-50 px-5 py-4">
        <p class="text-sm leading-5 tracking-[0.14px] text-navy">Đơn hàng của bạn được miễn phí giao hàng tiêu chuẩn toàn quốc.</p>
        <div class="h-1 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến độ miễn phí vận chuyển"><div class="h-1 w-full rounded-full bg-brown"></div></div>
      </div>
      <ul class="flex flex-col gap-3" data-drawer-list></ul>
      <p data-drawer-empty class="py-8 text-center text-sm leading-5 text-gray-66" hidden>Giỏ hàng của bạn đang trống.</p>
    </div>
    <div class="flex flex-col gap-3 bg-bg px-6 pb-6 pt-5">
      <div class="flex items-start justify-between gap-4 text-sm leading-5 tracking-[0.14px]"><span class="text-gray-49" data-drawer-sub-label>Tạm tính</span><span class="font-medium text-navy" data-drawer-sub>0 VNĐ</span></div>
      <p class="text-xs leading-4 text-gray-66">Giao hàng tiêu chuẩn miễn phí cho mọi đơn hàng.</p>
      <a href="gio-hang.html" class="inline-flex h-12 w-full items-center justify-center rounded-sm bg-brown px-6 text-base leading-[22px] tracking-[0.224px] text-bg hover:bg-brown-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown whitespace-nowrap">Đi tới giỏ hàng</a>
      <button type="button" data-drawer-close class="inline-flex h-12 w-full items-center justify-center rounded-sm border border-brown px-6 text-base leading-[22px] tracking-[0.224px] text-brown hover:bg-brown-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown whitespace-nowrap">Tiếp tục mua sắm</button>
    </div>
  </aside>`;
  document.body.appendChild(drawer);
  drawer.querySelectorAll('[data-drawer-close]').forEach((b) => b.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', (e) => {
    if (!drawer.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    const panel = drawer.querySelector('[role="dialog"]');
    const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0]; const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  return drawer;
}

function renderDrawer(addedIds) {
  const d = ensureDrawer(); const c = load();
  const list = d.querySelector('[data-drawer-list]'); list.innerHTML = '';
  let n = 0; let sub = 0;
  Object.keys(c).forEach((id) => {
    const p = CATALOG[id]; const it = c[id];
    if (!p || !(it.q > 0)) return;
    n += it.q; sub += it.q * p.price;
    const li = document.createElement('li'); li.className = 'flex items-center gap-4';
    li.innerHTML = `
      <div class="relative h-20 w-16 shrink-0">
        <img src="${p.img}" alt="${p.name}" class="size-full rounded-sm object-contain">
        <span class="absolute -top-2 left-[52px] grid size-[22px] place-items-center rounded-full bg-navy text-xs leading-4 text-bg">${it.q}</span>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-1"><p class="text-sm font-medium leading-5 tracking-[0.14px] text-navy">${p.name}</p><p class="text-xs leading-4 text-gray-66">${p.size}</p></div>
      <p class="shrink-0 whitespace-nowrap text-sm font-medium leading-5 tracking-[0.14px] text-navy">${fmt(p.price * it.q)}</p>`;
    if (addedIds && addedIds.indexOf(id) > -1) li.classList.add('rounded-sm', 'bg-brown-50', 'p-2', '-mx-2');
    list.appendChild(li);
  });
  d.querySelector('[data-drawer-title]').textContent = 'Giỏ hàng (' + n + ')';
  d.querySelector('[data-drawer-sub-label]').textContent = 'Tạm tính (' + n + ' sản phẩm)';
  d.querySelector('[data-drawer-sub]').textContent = fmt(sub);
  d.querySelector('[data-drawer-empty]').hidden = n > 0;
  const st = d.querySelector('[data-drawer-status]');
  if (addedIds && addedIds.length) {
    st.hidden = false;
    d.querySelector('[data-drawer-status-text]').textContent = addedIds.length === 1
      ? 'Đã thêm ' + CATALOG[addedIds[0]].name + ' vào giỏ hàng.'
      : 'Đã thêm bộ ' + addedIds.length + ' sản phẩm vào giỏ hàng.';
  } else { st.hidden = true; }
  syncBadges();
}

export function openDrawer(addedIds, trigger) {
  renderDrawer(addedIds);
  lastFocus = trigger || document.activeElement;
  drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('overflow-hidden');
  setTimeout(() => drawer.querySelector('[role="dialog"]').focus(), 50);
}
export function closeDrawer() {
  if (!drawer || !drawer.classList.contains('is-open')) return;
  drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('overflow-hidden');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function qtyFor(btn) {
  const box = btn.closest('[data-qty-scope]');
  if (!box || btn.hasAttribute('data-add-set') || btn.dataset.products) return 1;
  const v = box.querySelector('[data-qty-value]'); const i = box.querySelector('[data-qty-input]');
  const q = parseInt(v ? v.textContent : i ? i.value : '1', 10);
  return q > 0 ? q : 1;
}

function badgeBump() {
  document.querySelectorAll('[data-cart-count]').forEach((el) => { el.classList.remove('cart-bump'); void el.offsetWidth; el.classList.add('cart-bump'); });
}
// Ảnh sản phẩm "bay" tới icon giỏ ở header, sau đó callback
function flyToCart(btn, done) {
  const target = document.querySelector('[data-cart-count]');
  const holder = btn.closest('li, article, [data-qty-scope], section') || document;
  const src = [...holder.querySelectorAll('img')].find((i) => i.offsetParent && /\.(webp|png|jpe?g)/i.test(i.currentSrc || i.src) && i.getBoundingClientRect().width > 60);
  if (!target || !src || matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
  const a = src.getBoundingClientRect(); const b = target.getBoundingClientRect();
  const g = document.createElement('img'); g.src = src.currentSrc || src.src; g.alt = ''; g.setAttribute('aria-hidden', 'true');
  const size = Math.min(110, a.width);
  g.style.cssText = 'position:fixed;z-index:200;pointer-events:none;object-fit:contain;border-radius:8px;left:' + (a.left + a.width / 2 - size / 2) + 'px;top:' + (a.top + a.height / 2 - size / 2) + 'px;width:' + size + 'px;height:' + size + 'px;';
  document.body.appendChild(g);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const an = g.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx * 0.6 + 'px,' + (dy * 0.6 - 40) + 'px) scale(.55)', opacity: .95, offset: .6 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.12)', opacity: .2 }], { duration: 620, easing: 'cubic-bezier(.5,0,.3,1)' });
  an.onfinish = () => { g.remove(); done(); };
}

export function initCart() {
  syncBadges();
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    const ids = (btn.dataset.products || btn.dataset.product || '').split(',').map((s) => s.trim()).filter((id) => CATALOG[id]);
    if (!ids.length) return;
    const q = qtyFor(btn);
    ids.forEach((id) => add(id, q));
    flyToCart(btn, () => { syncBadges(); badgeBump(); openDrawer(ids, btn); });
  });
  if (location.hash === '#mo-gio-hang') openDrawer(null);
  window.addEventListener('storage', syncBadges);
  window.DZCart = { CATALOG, load, save, count, fmt, add, openDrawer, closeDrawer, syncBadges, ensureRows, fillCartRow, fillLine };
}
