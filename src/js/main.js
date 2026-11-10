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

// Sliders: <div class="swiper" data-swiper='{"slidesPerView":3}'>
document.querySelectorAll('[data-swiper]').forEach((el) => {
  let opts = {};
  try { opts = JSON.parse(el.dataset.swiper); } catch (e) {}
  const scope = el.closest('section') || el.parentElement;
  new Swiper(el, {
    navigation: { nextEl: scope.querySelector('.swiper-next'), prevEl: scope.querySelector('.swiper-prev') },
    pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
    ...opts,
  });
});
