(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar') || document.querySelector('.sb');
    if (!sidebar) return;

    // Créer le bouton s'il n'existe pas
    if (!document.getElementById('hamburger-btn')) {
      const btn = document.createElement('button');
      btn.className = 'hamburger';
      btn.id = 'hamburger-btn';
      btn.innerHTML = '<span></span><span></span><span></span>';
      document.body.appendChild(btn);

      const ov = document.createElement('div');
      ov.className = 'sidebar-overlay';
      ov.id = 'sidebar-overlay';
      document.body.appendChild(ov);

      const toggle = () => {
        sidebar.classList.toggle('open');
        btn.classList.toggle('open');
        ov.classList.toggle('visible');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
      };

      btn.addEventListener('click', toggle);
      ov.addEventListener('click', toggle);

      // Fermer sur clic lien
      document.querySelectorAll('.ni, .sidebar a, .sb a').forEach(el => {
        el.addEventListener('click', () => { if (window.innerWidth < 769) toggle(); });
      });
    }
  });
})();