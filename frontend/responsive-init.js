/* ================================================================
   CAMPUS NUMÉRIQUE FASO — responsive-init.js
   Script à inclure dans TOUS les HTML AVANT </body>
   <script src="responsive-init.js"></script>
   ================================================================ */

(function () {
  // Trouver la sidebar (class="sidebar" ou class="sb")
  const sidebar = document.querySelector('.sidebar') || document.querySelector('.sb');

  // Ne rien faire si pas de sidebar (pages simples : login, index, classes)
  if (!sidebar) return;

  // ── Créer le bouton hamburger ────────────────────────────────────
  const hamburger = document.createElement('button');
  hamburger.className = 'hamburger';
  hamburger.setAttribute('aria-label', 'Menu');
  hamburger.setAttribute('id', 'hamburger-btn');
  hamburger.innerHTML = '<span></span><span></span><span></span>';
  document.body.appendChild(hamburger);

  // ── Créer l'overlay ──────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function openMenu() {
    sidebar.classList.add('open');
    hamburger.classList.add('open');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    sidebar.classList.remove('open');
    hamburger.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeMenu() : openMenu();
  });

  overlay.addEventListener('click', closeMenu);

  // ── Fermer le menu quand on clique sur un item nav ───────────────
  document.querySelectorAll('.ni').forEach(ni => {
    ni.addEventListener('click', () => {
      if (window.innerWidth < 640) closeMenu();
    });
  });

  // ── Fermer sur resize si on passe en desktop ─────────────────────
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 640) closeMenu();
  });
})();
