(function () {
  'use strict';

  /* ==========================================================
     Baner zgód – Google Consent Mode v2
     Domyślne stany zgód ustawia skrypt w <head> (index.html),
     tutaj obsługujemy wybór użytkownika i jego aktualizację.
     ========================================================== */

  var STORAGE_KEY = 'j316_consent';
  var VERSION = 1;                       // podbij, jeśli zmienisz kategorie – baner pokaże się ponownie
  var MAX_AGE = 365 * 24 * 60 * 60 * 1000; // ponowne pytanie po 12 miesiącach

  var banner = document.querySelector('.consent');
  if (!banner) return;

  var settings = banner.querySelector('.consent-settings');
  var settingsBtn = banner.querySelector('[data-consent-action="settings"]');
  var saveBtn = banner.querySelector('[data-consent-action="save"]');
  var toggles = Array.prototype.slice.call(banner.querySelectorAll('[data-consent-key]'));

  function gtagSafe() {
    if (typeof window.gtag === 'function') window.gtag.apply(null, arguments);
  }

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (c && c.v === VERSION && Date.now() - c.ts < MAX_AGE) return c;
    } catch (e) {}
    return null;
  }

  function write(choice) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(choice)); } catch (e) {}
  }

  // usuwa cookies GA po wycofaniu zgody
  function clearAnalyticsCookies() {
    var host = location.hostname;
    var domains = ['', host, '.' + host, '.' + host.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (part) {
      var name = part.split('=')[0].trim();
      if (name === '_ga' || name.indexOf('_ga_') === 0 || name === '_gid' || name.indexOf('_gat') === 0) {
        domains.forEach(function (d) {
          document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
        });
      }
    });
  }

  function apply(choice) {
    var m = choice.marketing ? 'granted' : 'denied';
    gtagSafe('consent', 'update', {
      analytics_storage: choice.analytics ? 'granted' : 'denied',
      ad_storage: m,
      ad_user_data: m,
      ad_personalization: m
    });
    if (!choice.analytics) clearAnalyticsCookies();
  }

  function save(analytics, marketing) {
    var prev = read();
    var choice = { v: VERSION, ts: Date.now(), analytics: !!analytics, marketing: !!marketing };
    write(choice);
    apply(choice);
    hide();
    // po wycofaniu wcześniej udzielonej zgody przeładowanie zatrzymuje działające już skrypty
    if (prev && ((prev.analytics && !choice.analytics) || (prev.marketing && !choice.marketing))) {
      location.reload();
    }
  }

  function toggleSettings(open) {
    settings.hidden = !open;
    saveBtn.hidden = !open;
    settingsBtn.hidden = open;
    settingsBtn.setAttribute('aria-expanded', String(open));
  }

  function show(withSettings) {
    var c = read();
    toggles.forEach(function (t) {
      t.checked = c ? !!c[t.getAttribute('data-consent-key')] : false;
    });
    toggleSettings(!!withSettings);
    banner.hidden = false;
    requestAnimationFrame(function () { banner.classList.add('is-visible'); });
    var first = banner.querySelector('.consent-actions button:not([hidden])');
    if (first && withSettings) first.focus();
  }

  function hide() {
    banner.classList.remove('is-visible');
    setTimeout(function () { banner.hidden = true; }, 300);
  }

  banner.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-consent-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-consent-action');
    var get = function (key) {
      var t = banner.querySelector('[data-consent-key="' + key + '"]');
      return t && t.checked;
    };
    if (action === 'accept') save(true, true);
    else if (action === 'reject') save(false, false);
    else if (action === 'settings') toggleSettings(true);
    else if (action === 'save') save(get('analytics'), get('marketing'));
  });

  Array.prototype.slice.call(document.querySelectorAll('[data-consent-open]')).forEach(function (el) {
    el.addEventListener('click', function () { show(true); });
  });

  if (!read()) show(false);
})();
