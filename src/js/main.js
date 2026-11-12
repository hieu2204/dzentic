import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectFade, Thumbs } from 'swiper/modules';
import { Fancybox } from '@fancyapps/ui';
import AOS from 'aos';
import { CountUp } from 'countup.js';
import { initCart } from './cart.js';

Swiper.use([Navigation, Pagination, Autoplay, EffectFade, Thumbs]);
window.Swiper = Swiper;

// Scroll reveal
AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });

// Fancybox: <a data-fancybox="group" href="..."> (ảnh / video / iframe)
Fancybox.bind('[data-fancybox]', {});

// Count-up: <span data-count="1200" data-suffix="+" data-decimals="0">0</span>
const countEls = document.querySelectorAll('[data-count]');
if (countEls.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      new CountUp(el, parseFloat(el.dataset.count), {
        duration: parseFloat(el.dataset.duration || 2),
        decimalPlaces: parseInt(el.dataset.decimals || 0, 10),
        prefix: el.dataset.prefix || '',
        suffix: el.dataset.suffix || '',
        separator: el.dataset.separator ?? '.',
        decimal: ',',
      }).start();
      io.unobserve(el);
    });
  }, { threshold: 0.4 });
  countEls.forEach((el) => io.observe(el));
}

// Mobile menu: <button data-menu-toggle> + <div data-menu>
document.querySelectorAll('[data-menu-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const m = document.querySelector('[data-menu]');
    m && m.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', m && !m.classList.contains('hidden'));
  });
});

// Tabs: <div data-tabs> [data-tab="id"] (button, role=tab) + [data-tab-panel="id"] (panel, hidden)
// Style trạng thái active bằng Tailwind: aria-selected:... / group-aria-selected:...
document.querySelectorAll('[data-tabs]').forEach((root) => {
  const tabs = [...root.querySelectorAll('[data-tab]')].filter((t) => t.closest('[data-tabs]') === root);
  const panels = [...root.querySelectorAll('[data-tab-panel]')].filter((p) => p.closest('[data-tabs]') === root);
  const activate = (id) => {
    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p) => {
      const on = p.dataset.tabPanel === id;
      p.hidden = !on;
      if (on) { p.classList.remove('tab-in'); void p.offsetWidth; p.classList.add('tab-in'); }
    });
    // Swiper trong panel vừa hiện: cập nhật kích thước + trạng thái nút prev/next dùng chung
    requestAnimationFrame(() => {
      // Nút prev/next dùng chung cho nhiều slider trong các panel tab (có cả tab lồng nhau):
      // chỉ slider đang thật sự hiển thị (offsetParent) mới được điều khiển nút, slider ẩn thì ngắt điều khiển.
      document.querySelectorAll('[data-tab-panel] [data-swiper]').forEach((el) => {
        const s = el.swiper; if (!s || !s.navigation) return;
        const visible = el.offsetParent !== null;
        if (!visible) { if (!s._navOff) { s.navigation.destroy(); s._navOff = true; } }
      });
      document.querySelectorAll('[data-tab-panel] [data-swiper]').forEach((el) => {
        const s = el.swiper; if (!s || !s.navigation || el.offsetParent === null) return;
        s.update();
        if (s._navOff) { s.navigation.init(); s._navOff = false; }
        s.navigation.update();
      });
      AOS.refresh();
    });
  };
  tabs.forEach((t) => t.addEventListener('click', () => activate(t.dataset.tab)));
  root.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    n.focus(); activate(n.dataset.tab);
  });
  const first = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
  if (first) activate(first.dataset.tab);
});

// Sliders: <div class="swiper" data-swiper='{"slidesPerView":3}'>
// Bộ đếm: [data-swiper-current] / [data-swiper-total] trong cùng <section> (01 / 02)
const pad = (n) => String(n).padStart(2, '0');
document.querySelectorAll('[data-swiper]').forEach((el) => {
  let opts = {};
  try { opts = JSON.parse(el.dataset.swiper); } catch (e) {}
  const scope = el.closest('[data-swiper-scope]') || el.closest('section') || el.parentElement;
  const cur = scope.querySelector('[data-swiper-current]');
  const tot = scope.querySelector('[data-swiper-total]');
  const sw = new Swiper(el, {
    navigation: { nextEl: scope.querySelector('.swiper-next'), prevEl: scope.querySelector('.swiper-prev'), lockClass: 'swiper-button-nolock' },
    pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
    ...opts,
  });
  if (cur || tot) {
    const total = el.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)').length;
    const upd = () => { if (cur) cur.textContent = pad(sw.realIndex + 1); if (tot) tot.textContent = pad(total); };
    sw.on('slideChange', upd); upd();
  }
  // Loop vô hạn mượt cho slidesPerView:auto: HTML có N slide gốc + N bản sao (data-swiper-clones=N).
  // Khi trượt tới bản sao đầu tiên thì nhảy tức thì về slide gốc tương ứng (giao diện giống hệt nhau).
  const clones = parseInt(el.dataset.swiperClones || 0, 10);
  if (clones) {
    sw.on('transitionEnd', () => { if (sw.activeIndex >= clones) sw.slideTo(sw.activeIndex - clones, 0, false); });
  }
  // Slider nằm trong panel tab (đang ẩn lúc khởi tạo) không được giữ điều khiển nút dùng chung; tab sẽ bật lại khi panel hiện.
  if (el.closest('[data-tab-panel]') && sw.navigation && sw.params.navigation && sw.params.navigation.nextEl) { sw.navigation.destroy(); sw._navOff = true; }
  el.swiper = sw;
});

// Header sticky: khi cuộn quá top bar thì header cố định, nền sáng + viền giống các trang con
const siteHeader = document.querySelector('[data-site-header]');
if (siteHeader) {
  const offset = () => siteHeader.getBoundingClientRect().top + window.scrollY - (siteHeader.classList.contains('is-stuck') ? 0 : 0);
  let startY = offset();
  const onScroll = () => {
    const stuck = window.scrollY > startY;
    siteHeader.classList.toggle('is-stuck', stuck);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { if (!siteHeader.classList.contains('is-stuck')) startY = offset(); });
  onScroll();
}

// Store locator: bấm địa điểm (hoặc marker) -> hiện Google Maps của địa điểm đó; "Bản đồ tổng" quay lại bản đồ + marker thành phố
// <li data-clinic="id" data-q="Tên, địa chỉ"> ; <button data-marker="id"> ; [data-map-frame] iframe ; [data-map-reset]
document.querySelectorAll('[data-store-locator]').forEach((root) => {
  const frame = root.querySelector('[data-map-frame]');
  const back = root.querySelector('[data-map-reset]');
  const items = () => [...root.querySelectorAll('[data-clinic]')];
  const markers = () => [...root.querySelectorAll('[data-marker]')];
  const reset = () => {
    frame.hidden = true; frame.removeAttribute('src'); back.hidden = true;
    items().forEach((i) => i.removeAttribute('aria-current'));
    markers().forEach((m) => m.setAttribute('aria-pressed', 'false'));
  };
  const select = (id, scroll) => {
    const li = items().find((i) => i.dataset.clinic === id);
    if (!li) return;
    items().forEach((i) => i.setAttribute('aria-current', i === li ? 'true' : 'false'));
    markers().forEach((m) => m.setAttribute('aria-pressed', m.dataset.marker === id ? 'true' : 'false'));
    frame.src = 'https://www.google.com/maps?q=' + encodeURIComponent(li.dataset.q) + '&hl=vi&z=16&output=embed';
    frame.hidden = false; back.hidden = false;
    if (scroll) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  root.addEventListener('click', (e) => {
    const li = e.target.closest('[data-clinic]');
    const mk = e.target.closest('[data-marker]');
    if (li) select(li.dataset.clinic, false);
    else if (mk) select(mk.dataset.marker, true);
    else if (e.target.closest('[data-map-reset]')) reset();
    else if (e.target.closest('[data-tab]')) reset();
  });
  root.addEventListener('keydown', (e) => {
    const li = e.target.closest('[data-clinic]');
    if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(li.dataset.clinic, false); }
  });
});

// Flip card: <li data-flip aria-pressed="false"> chứa lớp [data-flip-back].
// Desktop (có hover): hover bằng CSS (group-hover, Tailwind v4 chỉ áp dụng trên thiết bị có hover). Mobile/cảm ứng: chạm để lật, chạm lại hoặc chạm ra ngoài để đóng.
// Bàn phím: Enter/Space lật.
const flipCards = [...document.querySelectorAll('[data-flip]')];
if (flipCards.length) {
  const touch = window.matchMedia('(hover: none)');
  const set = (el, on) => {
    el.setAttribute('aria-pressed', String(on));
    const b = el.querySelector('[data-flip-back]'); if (b) b.setAttribute('aria-hidden', String(!on));
  };
  flipCards.forEach((el) => {
    el.addEventListener('click', () => {
      if (!touch.matches) return;
      const on = el.getAttribute('aria-pressed') !== 'true';
      flipCards.forEach((o) => set(o, o === el ? on : false));
    });
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      set(el, el.getAttribute('aria-pressed') !== 'true');
    });
    el.addEventListener('blur', () => { if (!touch.matches) set(el, false); });
  });
  document.addEventListener('click', (e) => {
    if (touch.matches && !e.target.closest('[data-flip]')) flipCards.forEach((o) => set(o, false));
  });
}

// Video MP4 phát tại chỗ: <div data-video-card data-video-src="file.mp4" data-video-title="..."> chứa nút [data-video-play].
// Bấm nút -> thay ảnh bìa bằng <video controls autoplay playsinline>; chỉ một video phát tại một thời điểm; hết video hoặc lỗi -> trả về ảnh bìa.
const videoCards = [...document.querySelectorAll('[data-video-card]')];
if (videoCards.length) {
  const stop = (card) => {
    const v = card.querySelector('video'); if (!v) return;
    v.pause(); v.remove();
    const msg = card.querySelector('[data-video-error]'); if (msg) msg.remove();
    [...card.children].forEach((c) => { if (c._hidden) { c.style.display = c._hidden === '-' ? '' : c._hidden; delete c._hidden; } });
    card.classList.remove('is-playing');
  };
  const play = (card) => {
    videoCards.forEach((o) => { if (o !== card) stop(o); });
    if (card.querySelector('video')) return;
    const poster = card.querySelector('img'); 
    [...card.children].forEach((c) => { c._hidden = c.style.display || '-'; c.style.display = 'none'; });
    const v = document.createElement('video');
    v.src = card.dataset.videoSrc; v.controls = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto';
    if (poster) v.poster = poster.currentSrc || poster.src;
    v.setAttribute('aria-label', card.dataset.videoTitle || 'Video');
    v.className = 'absolute inset-0 z-20 size-full bg-ink object-cover';
    v.addEventListener('ended', () => stop(card));
    v.addEventListener('error', () => {
      const e = document.createElement('p'); e.setAttribute('data-video-error', '');
      e.className = 'absolute inset-x-6 bottom-6 z-20 rounded-sm bg-ink/70 px-4 py-3 text-sm text-bg';
      e.textContent = 'Không tải được video. Vui lòng thử lại sau.'; card.appendChild(e);
      setTimeout(() => stop(card), 2500);
    });
    card.classList.add('is-playing'); card.appendChild(v);
    const pr = v.play(); if (pr && pr.catch) pr.catch(() => {});
  };
  videoCards.forEach((card) => {
    card.querySelectorAll('[data-video-play]').forEach((b) => b.addEventListener('click', () => play(card)));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') videoCards.forEach(stop); });
}

// FAQ accordion (<details data-faq>): mở một câu hỏi thì tự đóng các câu hỏi khác trên trang.
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.hasAttribute('data-faq') || !d.open) return;
  document.querySelectorAll('details[data-faq][open]').forEach((o) => { if (o !== d) { if (window.DZ && window.DZ.closeDetails) window.DZ.closeDetails(o); else o.open = false; } });
}, true);

// Thanh gạch chân trượt cho tab: <div role="tablist" data-tab-indicator> ... tab active = [aria-selected="true"]
document.querySelectorAll('[data-tab-indicator]').forEach((list) => {
  const bar = document.createElement('span'); bar.className = 'tab-indicator'; bar.setAttribute('aria-hidden', 'true'); list.appendChild(bar);
  const place = (instant) => {
    const t = list.querySelector('[role="tab"][aria-selected="true"]'); if (!t) { bar.style.opacity = '0'; return; }
    const th = parseFloat(getComputedStyle(t).borderBottomWidth) || 2;
    if (instant) bar.style.transition = 'none';
    bar.style.height = th + 'px'; bar.style.width = t.offsetWidth + 'px';
    bar.style.transform = 'translate(' + t.offsetLeft + 'px,' + (t.offsetTop + t.offsetHeight - th) + 'px)'; bar.style.opacity = '1';
    if (instant) { void bar.offsetWidth; bar.style.transition = ''; }
  };
  const mo = new MutationObserver(() => place(false));
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => place(false)); ro.observe(list); list.querySelectorAll('[role="tab"]').forEach((t) => ro.observe(t)); }
  list.querySelectorAll('[role="tab"]').forEach((t) => mo.observe(t, { attributes: true, attributeFilter: ['aria-selected'] }));
  window.addEventListener('resize', () => place(true));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(true));
  place(true); setTimeout(() => place(true), 300);
});

// Trượt mở/đóng mượt cho một phần tử (dùng cho accordion): DZ.slide(el, show)
window.DZ = window.DZ || {};
window.DZ.slide = function (el, show) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.hidden = !show; return; }
  if (el._anim) el._anim.cancel();
  if (show) {
    el.hidden = false; const h = el.scrollHeight;
    el._anim = el.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
    el.style.overflow = 'hidden';
    el._anim.onfinish = () => { el.style.overflow = ''; el._anim = null; };
  } else {
    const h = el.offsetHeight; el.style.overflow = 'hidden';
    el._anim = el.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
    el._anim.onfinish = () => { el.hidden = true; el.style.overflow = ''; el._anim = null; };
  }
};

// Thẻ nghiêng 3D: <article data-tilt> nghiêng nhẹ theo chuột (chỉ thiết bị có hover + chuột)
const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (fineHover && !noMotion) {
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    let raf = 0;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width; const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.classList.add('is-tilting');
        el.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg'); el.style.setProperty('--ry', ((x - 0.5) * 6).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
    });
    el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.classList.remove('is-tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });

  // Con trỏ "Phát" bám theo chuột trên thẻ video
  const vcards = document.querySelectorAll('[data-video-card]');
  if (vcards.length) {
    const cur = document.createElement('div'); cur.className = 'play-cursor'; cur.setAttribute('aria-hidden', 'true'); cur.textContent = 'Phát'; document.body.appendChild(cur);
    let raf2 = 0, px = 0, py = 0;
    const move = () => { cur.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)'; raf2 = 0; };
    vcards.forEach((card) => {
      card.addEventListener('pointerenter', () => { if (!card.classList.contains('is-playing')) cur.classList.add('is-on'); });
      card.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; cur.classList.toggle('is-on', !card.classList.contains('is-playing')); if (!raf2) raf2 = requestAnimationFrame(move); });
      card.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
      card.addEventListener('click', () => cur.classList.remove('is-on'));
    });
  }
}

// Accordion <details> mở/đóng mượt (FAQ và nhóm bộ lọc). Đóng các câu khác qua DZ.closeDetails.
window.DZ = window.DZ || {};
function animDetails(d, opening) {
  const sum = d.querySelector(':scope > summary'); if (!sum) { d.open = opening; return; }
  if (d._anim) { d._anim.cancel(); d._anim = null; }
  const ease = 'cubic-bezier(.2,.7,.2,1)';
  d.style.overflow = 'hidden';
  if (opening) {
    const h0 = d.offsetHeight; d.open = true; const h1 = d.offsetHeight;
    d._anim = d.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 320, easing: ease });
    d._anim.onfinish = () => { d.style.overflow = ''; d._anim = null; };
    d._anim.oncancel = () => { d.style.overflow = ''; };
  } else {
    const h0 = d.offsetHeight; const h1 = sum.offsetHeight;
    d._anim = d.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 260, easing: ease });
    d._anim.onfinish = () => { d.open = false; d.style.overflow = ''; d._anim = null; };
    d._anim.oncancel = () => { d.style.overflow = ''; };
  }
}
window.DZ.closeDetails = (o) => { if (!o.open) return; if (noMotion) { o.open = false; } else animDetails(o, false); };
if (!noMotion) {
  document.querySelectorAll('details.group, details[data-faq]').forEach((d) => {
    const sum = d.querySelector(':scope > summary'); if (!sum) return;
    sum.addEventListener('click', (e) => { e.preventDefault(); animDetails(d, !d.open); });
  });
}

initCart();
