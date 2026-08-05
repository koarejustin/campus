
    // Charger Chart.js avec fallback si CDN indisponible
    (function () {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onerror = function () {
        console.warn('Chart.js non disponible — graphiques désactivés');
        window.Chart = function (ctx, cfg) {
          this.data = cfg.data || {};
          this.options = cfg.options || {};
          this.update = function () { };
          this.destroy = function () { };
        };
        window.Chart.register = function () { };
      };
      document.head.appendChild(s);
    })();
  