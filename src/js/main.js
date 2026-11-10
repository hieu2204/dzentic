import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectFade, Thumbs } from 'swiper/modules';
import { Fancybox } from '@fancyapps/ui';
import AOS from 'aos';
import { CountUp } from 'countup.js';

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
      document.querySelectorAll('[data-swiper]').forEach((el) => {
        if (el.swiper && !el.offsetParent) el.swiper.navigation && el.swiper.navigation.update();
      });
      panels.filter((p) => !p.hidden).forEach((p) => p.querySelectorAll('[data-swiper]').forEach((el) => {
        if (el.swiper) { el.swiper.update(); el.swiper.navigation && el.swiper.navigation.update(); }
      }));
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
