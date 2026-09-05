// ================================================================
// CAMPUS NUMÉRIQUE FASO — ui-animations.js
// Petit utilitaire partagé : compteur animé pour les chiffres des
// cartes, et détection automatique des sections qui s'affichent pour
// leur appliquer un fondu au chargement. Respecte prefers-reduced-motion.
// ================================================================
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Compteur animé ──
  // Anime un élément texte de sa valeur actuelle (ou 0) vers `target`.
  // Garde tout suffixe non numérique (ex: "%", "/20") intact.
  window.animateNumber = function (el, target, opts) {
    if (!el) return;
    opts = opts || {};
    var duration = opts.duration || 600;
    var decimals = opts.decimals || 0;
    var suffix = opts.suffix !== undefined ? opts.suffix : '';

    if (target === null || target === undefined || isNaN(parseFloat(target))) {
      el.textContent = (target === null || target === undefined) ? '—' : target;
      return;
    }
    var targetNum = parseFloat(target);
    if (reduceMotion) {
      el.textContent = (decimals ? targetNum.toFixed(decimals) : Math.round(targetNum)) + suffix;
      return;
    }
    var startNum = parseFloat(el.textContent) || 0;
    if (!isFinite(startNum)) startNum = 0;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      var value = startNum + (targetNum - startNum) * eased;
      el.textContent = (decimals ? value.toFixed(decimals) : Math.round(value)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = (decimals ? targetNum.toFixed(decimals) : Math.round(targetNum)) + suffix;
    }
    requestAnimationFrame(step);
  };

  // ── Fondu automatique des sections qui deviennent actives ──
  // Beaucoup de pages de ce projet basculent l'affichage via une classe
  // "on" (ex: .sec.on, .pg.on) plutôt que de recharger la page. On
  // observe ces changements de classe et on rejoue une animation
  // d'apparition à chaque fois, sans que chaque page ait à le coder.
  if (!reduceMotion && "MutationObserver" in window) {
    var SEEN_CLASS = 'ui-reveal-played';
    function playReveal(el) {
      el.classList.remove('ui-reveal');
      // force reflow pour pouvoir rejouer l'animation une 2e fois
      void el.offsetWidth;
      el.classList.add('ui-reveal');
    }
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName !== 'class') return;
        var el = m.target;
        var isActive = el.classList.contains('on') || el.classList.contains('active');
        if (isActive && (el.classList.contains('sec') || el.classList.contains('pg'))) {
          playReveal(el);
        }
      });
    });
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('.sec, .pg').forEach(function (el) {
        observer.observe(el, { attributes: true });
      });
    });
  }
})();
