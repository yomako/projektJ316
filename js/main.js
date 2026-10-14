(function () {
  'use strict';

  /* ==========================================================
     Konfiguracja
     ========================================================== */

  // Link do bramki płatności (np. PayU, Przelewy24, Tpay, zrzutka).
  // Dopóki pusty, przycisk przewija do danych do przelewu tradycyjnego.
  var PAYMENT_URL = '';

  var BILLBOARD_COST = 12000;
  var STAGE_COST = 3000;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var formatPLN = function (n) {
    return n.toLocaleString('pl-PL', { maximumFractionDigits: 0 }).replace(/ /g, ' ') + ' zł';
  };

  /* ---------- Google Analytics – zdarzenia ---------- */
  // gtag sam respektuje stan zgód (Consent Mode), więc można wołać zawsze
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  /* ---------- Toast ---------- */
  var toastEl = $('.toast');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 3200);
  }

  /* ---------- Nagłówek ---------- */
  var header = $('.site-header');
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 30);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menu mobilne ---------- */
  var navToggle = $('.nav-toggle');
  var nav = $('#nav');

  function setNav(open) {
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  navToggle.addEventListener('click', function () {
    setNav(!nav.classList.contains('is-open'));
  });
  $$('a', nav).forEach(function (a) {
    a.addEventListener('click', function () { setNav(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) setNav(false);
  });

  /* ---------- Aktywny link w nawigacji ---------- */
  var navLinks = $$('.nav a[href^="#"]:not(.btn)');
  var sectionMap = navLinks
    .map(function (a) { return { link: a, section: $(a.getAttribute('href')) }; })
    .filter(function (x) { return x.section; });

  if ('IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sectionMap.forEach(function (x) {
          x.link.classList.toggle('is-current', x.section === entry.target);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sectionMap.forEach(function (x) { navObserver.observe(x.section); });
  }

  /* ---------- Animacje przy przewijaniu ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el, i) {
      // lekkie opóźnienie dla elementów w tej samej siatce
      var siblings = el.parentElement ? $$(':scope > .reveal', el.parentElement) : [];
      var idx = siblings.indexOf(el);
      if (idx > 0) el.style.transitionDelay = Math.min(idx * 80, 400) + 'ms';
      revealObserver.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Licznik 100% ---------- */
  var counter = $('[data-count]');
  if (counter && 'IntersectionObserver' in window) {
    var target = parseInt(counter.getAttribute('data-count'), 10);
    var counterObserver = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      counterObserver.disconnect();
      var start = performance.now();
      var duration = 1400;
      counter.textContent = '0';
      (function tick(now) {
        var p = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        counter.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    }, { threshold: 0.6 });
    counterObserver.observe(counter);
  }

  /* ---------- Kampania – zakładki ---------- */
  var campaign = $('[data-campaign]');
  if (campaign) {
    var tabs = $$('.campaign-tab', campaign);
    var panels = $$('.campaign-panel', campaign);
    var progress = $('.campaign-progress span', campaign);
    var prevBtn = $('[data-campaign-prev]', campaign);
    var nextBtn = $('[data-campaign-next]', campaign);
    var current = 0;

    function showStep(index, focusTab) {
      index = Math.max(0, Math.min(tabs.length - 1, index));
      current = index;
      tabs.forEach(function (tab, i) {
        var active = i === index;
        tab.classList.toggle('is-active', active);
        tab.classList.toggle('is-done', i < index);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
        panels[i].classList.toggle('is-active', active);
      });
      progress.style.width = ((index + 1) / tabs.length * 100) + '%';
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === tabs.length - 1;
      if (focusTab) tabs[index].focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        showStep(i);
        track('campaign_step_view', { step: i + 1 });
      });
      tab.addEventListener('keydown', function (e) {
        var map = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
        if (e.key in map) {
          e.preventDefault();
          showStep(map[e.key], true);
        }
      });
    });
    prevBtn.addEventListener('click', function () { showStep(current - 1); });
    nextBtn.addEventListener('click', function () { showStep(current + 1); });

    // przesuwanie palcem na telefonie
    var panelsWrap = $('.campaign-panels', campaign);
    var touchX = null;
    panelsWrap.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    panelsWrap.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) showStep(current + (dx < 0 ? 1 : -1));
      touchX = null;
    });

    showStep(0);
  }

  /* ---------- Lightbox ---------- */
  var lightbox = $('.lightbox');
  if (lightbox && typeof lightbox.showModal === 'function') {
    var lbImg = $('img', lightbox);
    $$('[data-lightbox]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var img = $('img', btn);
        lbImg.src = btn.getAttribute('data-lightbox');
        lbImg.alt = img ? img.alt : '';
        lightbox.showModal();
        track('campaign_image_zoom', { image: btn.getAttribute('data-lightbox') });
      });
    });
    $('.lightbox-close', lightbox).addEventListener('click', function () { lightbox.close(); });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) lightbox.close();
    });
  } else {
    $$('[data-lightbox]').forEach(function (btn) {
      btn.addEventListener('click', function () { window.open(btn.getAttribute('data-lightbox'), '_blank'); });
    });
  }

  /* ---------- Cegiełki + wizualizacja kosztu ---------- */
  var tiers = $$('.tier');
  var costFill = $('[data-cost-fill]');
  var costCaption = $('[data-cost-caption]');
  var payAmount = $('[data-pay-amount]');
  var selectedAmount = null;

  function describe(amount) {
    var pct = amount / BILLBOARD_COST * 100;
    var stages = amount / STAGE_COST;
    var pctText = pct < 1 ? pct.toLocaleString('pl-PL', { maximumFractionDigits: 1 }) : Math.round(pct);
    var stagesText;
    if (stages >= 1) {
      stagesText = stages.toLocaleString('pl-PL', { maximumFractionDigits: 2 }) + ' etapu kampanii';
      if (Number.isInteger(stages)) stagesText = stages === 1 ? 'pełny 1 etap kampanii' : stages + ' pełne etapy kampanii';
    } else {
      stagesText = Math.round(stages * 100) + '% jednego etapu';
    }
    return 'Twoja cegiełka <strong>' + formatPLN(amount) + '</strong> to <strong>' + pctText +
      '%</strong> całego billboardu – ' + stagesText + '.';
  }

  function selectTier(tier) {
    tiers.forEach(function (t) {
      var on = t === tier;
      t.setAttribute('aria-checked', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    selectedAmount = parseInt(tier.getAttribute('data-amount'), 10);
    // minimalna widoczna szerokość, żeby małe kwoty też było widać
    var width = Math.max(selectedAmount / BILLBOARD_COST * 100, 1.2);
    costFill.style.width = width + '%';
    costCaption.innerHTML = describe(selectedAmount);
    payAmount.textContent = formatPLN(selectedAmount);
  }

  tiers.forEach(function (tier, i) {
    tier.tabIndex = i === 0 ? 0 : -1;
    tier.addEventListener('click', function () {
      selectTier(tier);
      track('select_donation_amount', { value: selectedAmount, currency: 'PLN' });
    });
    tier.addEventListener('keydown', function (e) {
      var dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      var next = tiers[(i + dir + tiers.length) % tiers.length];
      next.focus();
      selectTier(next);
    });
  });

  /* ---------- Przycisk płatności ---------- */
  var payBtn = $('[data-pay-button]');
  if (payBtn) {
    payBtn.addEventListener('click', function () {
      track('donate_click', {
        method: PAYMENT_URL ? 'online' : 'online_unavailable',
        value: selectedAmount || undefined,
        currency: 'PLN'
      });
    });
    if (PAYMENT_URL) {
      payBtn.href = PAYMENT_URL;
      payBtn.target = '_blank';
      payBtn.rel = 'noopener';
    } else {
      payBtn.href = '#przelew';
      payBtn.addEventListener('click', function () {
        toast('Płatności online wkrótce – skorzystaj z przelewu lub BLIK na telefon.');
      });
    }
  }

  /* ---------- Kopiowanie danych do przelewu ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (err) { reject(err); }
      document.body.removeChild(ta);
    });
  }

  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      copyText(btn.getAttribute('data-copy')).then(function () {
        btn.classList.add('is-copied');
        btn.textContent = 'Skopiowano';
        toast('Skopiowano do schowka');
        track('copy_payment_details', { field: btn.closest('.bank-row').querySelector('dt').textContent });
        setTimeout(function () {
          btn.classList.remove('is-copied');
          btn.textContent = 'Kopiuj';
        }, 2000);
      }, function () {
        toast('Nie udało się skopiować – zaznacz tekst ręcznie.');
      });
    });
  });

  /* ---------- Kontakt mailowy ---------- */
  $$('a[href^="mailto:"]').forEach(function (a) {
    a.addEventListener('click', function () {
      track('contact_click', { location: a.closest('section, footer') ? a.closest('section, footer').id || 'footer' : 'page' });
    });
  });

  /* ---------- Rok w stopce ---------- */
  var year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
