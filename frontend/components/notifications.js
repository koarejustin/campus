/* ================================================================
   CAMPUS NUMÉRIQUE FASO — /components/notifications.js
   Fonctionnalités :
   - Cloche dans le header avec badge compteur
   - Panel déroulant avec liste des notifications
   - Clic sur une notification → redirection vers la bonne page
   - Son à chaque nouvelle notification
   - Polling toutes les 30s pour détecter les nouvelles notifs
   ================================================================ */

(function () {

  /* ── 1. Son de notification via Web Audio API (pas de fichier .mp3 requis) ── */
  function playNotifSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Note 1 : Do
      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.connect(g1); g1.connect(ctx.destination);
      o1.type = 'sine';
      o1.frequency.setValueAtTime(880, ctx.currentTime);
      o1.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.1);
      g1.gain.setValueAtTime(0.3, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o1.start(ctx.currentTime);
      o1.stop(ctx.currentTime + 0.3);

      // Note 2 : Mi (légèrement après)
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.type = 'sine';
      o2.frequency.setValueAtTime(1320, ctx.currentTime + 0.15);
      g2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o2.start(ctx.currentTime + 0.15);
      o2.stop(ctx.currentTime + 0.5);

    } catch (e) {
      // Web Audio pas supporté, pas grave
    }
  }

  /* ── 2. Mapping type de notification → page de redirection ── */
  const NOTIF_REDIRECT = {
    'DEVOIR':        (lien) => lien || '/eleve.html?page=programme&tab=devoirs',
    'COMPOSITION':   (lien) => lien || '/eleve.html?page=programme&tab=compos',
    'EXAMEN_BLANC':  (lien) => lien || '/eleve.html?page=programme&tab=examens',
    'FORUM_CLASSE':  (lien) => lien || '/eleve.html?page=forum-classe',
    'INTER_CLASSE':  (lien) => lien || '/eleve.html?page=inter-classes',
    'GRAND_ELEVES':  (lien) => lien || '/eleve.html?page=grand-eleves',
    'ANNONCE':       (lien) => lien || '/eleve.html?page=annonces',
    'CONVOCATION':   (lien) => lien || '/eleve.html?page=convocations',
    'ABSENCE':       (lien) => lien || '/eleve.html?page=absences',
    'ORIENTATION':   (lien) => lien || '/eleve.html?page=orientation',
  };

  /* ── 3. Naviguer vers la page cible (fonctionne avec goPage si dispo) ── */
  function naviguerVers(lien, type) {
    // Calculer l'URL cible
    const resolver = NOTIF_REDIRECT[type];
    const urlCible = resolver ? resolver(lien) : (lien || null);

    if (!urlCible) return;

    // Extraire page et tab depuis l'URL
    const url = new URL(urlCible, window.location.origin);
    const page = url.searchParams.get('page');
    const tab  = url.searchParams.get('tab');

    // Si on est déjà sur eleve.html et que goPage existe
    if (typeof window.goPage === 'function' && page) {
      window.goPage(page);
      // Si un onglet est précisé, l'activer après un court délai
      if (tab) {
        setTimeout(() => {
          const tabEl = document.querySelector(`#pg-${page} .tab[onclick*="'${tab}'"]`);
          if (typeof window.progTab === 'function') {
            window.progTab(tab, tabEl);
          }
        }, 300);
      }
    } else {
      // Navigation classique
      window.location.href = urlCible;
    }
  }

  /* ── 4. Formater la date de façon lisible ── */
  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = Math.floor((now - d) / 1000);
      if (diff < 60)     return 'À l\'instant';
      if (diff < 3600)   return `Il y a ${Math.floor(diff / 60)} min`;
      if (diff < 86400)  return `Il y a ${Math.floor(diff / 3600)} h`;
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch (e) { return ''; }
  }

  /* ── 5. Icône selon le type de notif ── */
  function iconePourType(type) {
    const icons = {
      'DEVOIR':       '📝',
      'COMPOSITION':  '📋',
      'EXAMEN_BLANC': '🎓',
      'FORUM_CLASSE': '💬',
      'INTER_CLASSE': '💬',
      'GRAND_ELEVES': '🌍',
      'ANNONCE':      '📢',
      'CONVOCATION':  '⚠️',
      'ABSENCE':      '📅',
      'ORIENTATION':  '🎯',
    };
    return icons[type] || '🔔';
  }

  /* ── 6. Construire et injecter la cloche dans la page ── */
  function injecterCloche() {
    // Chercher le header du dashboard ou le pg-hd du premier panneau visible
    const pgHd = document.querySelector('.pg-hd');
    if (!pgHd || document.getElementById('notif-btn')) return;

    // Créer le bouton cloche
    const btn = document.createElement('div');
    btn.id = 'notif-btn';
    btn.style.cssText = `
      position: relative; cursor: pointer; width: 40px; height: 40px;
      background: var(--bg2, #F1F5F9); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; flex-shrink: 0; transition: background 0.2s;
      border: 1px solid var(--border, #E2E8F0);
    `;
    btn.innerHTML = `
      🔔
      <span id="notif-badge" style="
        display: none; position: absolute; top: -3px; right: -3px;
        background: #EF4444; color: white; font-size: 0.55rem;
        font-weight: 800; border-radius: 50%; min-width: 17px; height: 17px;
        display: none; align-items: center; justify-content: center;
        padding: 0 3px; border: 2px solid white; line-height: 1;
      ">0</span>
    `;
    btn.addEventListener('click', togglePanel);
    pgHd.appendChild(btn);

    // Créer le panel
    const panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.style.cssText = `
      display: none; position: fixed; top: 60px; right: 16px;
      width: min(360px, calc(100vw - 32px));
      background: var(--card-bg, white); border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15); z-index: 9999;
      border: 1px solid var(--border, #E2E8F0); overflow: hidden;
      max-height: 80vh;
    `;
    panel.innerHTML = `
      <div style="
        padding: 14px 16px; font-weight: 800; font-size: 0.85rem;
        border-bottom: 1px solid var(--border, #E2E8F0);
        display: flex; justify-content: space-between; align-items: center;
      ">
        🔔 Notifications
        <button id="notif-mark-all" style="
          font-size: 0.65rem; font-weight: 700; color: #6366F1;
          background: none; border: none; cursor: pointer; padding: 0;
        ">Tout marquer lu</button>
      </div>
      <div id="notif-list" style="overflow-y: auto; max-height: calc(80vh - 50px);"></div>
    `;
    document.body.appendChild(panel);

    document.getElementById('notif-mark-all').addEventListener('click', marquerToutLu);

    // Fermer le panel si clic en dehors
    document.addEventListener('click', function (e) {
      if (!btn.contains(e.target) && !panel.contains(e.target)) {
        panel.style.display = 'none';
      }
    });
  }

  /* ── 7. Ouvrir / fermer le panel ── */
  function togglePanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) chargerNotifications();
  }

  /* ── 8. Charger les notifications depuis l'API ── */
  async function chargerNotifications() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    list.innerHTML = '<div style="padding:20px;text-align:center;color:#94A3B8;font-size:0.8rem;">Chargement...</div>';

    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = session.token;
      if (!token) return;

      const r = await fetch('/api/notifications?limit=30', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await r.json();
      const notifs = data.notifications || [];

      if (!notifs.length) {
        list.innerHTML = '<div style="padding:30px;text-align:center;"><div style="font-size:2rem;margin-bottom:8px;">🔕</div><div style="color:#94A3B8;font-size:0.8rem;">Aucune notification</div></div>';
        return;
      }

      list.innerHTML = notifs.map(n => {
        const icone = iconePourType(n.type);
        const date  = formatDate(n.created_at);
        const lue   = n.lue || n.est_lu;
        return `
          <div data-id="${n.id_notification || n.id}" data-type="${n.type || ''}" data-lien="${n.lien || ''}"
            onclick="window._notifClick(this)"
            style="
              padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--border-light, #F1F5F9);
              display: flex; gap: 12px; align-items: flex-start;
              background: ${lue ? 'transparent' : 'rgba(99,102,241,0.04)'};
              transition: background 0.15s;
            "
            onmouseenter="this.style.background='rgba(99,102,241,0.08)'"
            onmouseleave="this.style.background='${lue ? 'transparent' : 'rgba(99,102,241,0.04)'}'"
          >
            <div style="font-size:1.2rem;flex-shrink:0;margin-top:2px;">${icone}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:${lue ? '500' : '700'};font-size:0.8rem;color:var(--text,#1E293B);line-height:1.3;margin-bottom:3px;">
                ${escH(n.titre || '')}
              </div>
              <div style="font-size:0.72rem;color:#64748B;line-height:1.4;">${escH(n.contenu || '')}</div>
              <div style="font-size:0.65rem;color:#94A3B8;margin-top:4px;">${date}</div>
            </div>
            ${!lue ? '<div style="width:8px;height:8px;background:#6366F1;border-radius:50%;flex-shrink:0;margin-top:6px;"></div>' : ''}
          </div>
        `;
      }).join('');

    } catch (e) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:#EF4444;font-size:0.75rem;">Erreur de chargement</div>';
    }
  }

  /* ── 9. Clic sur une notification : marquer lu + rediriger ── */
  window._notifClick = async function (el) {
    const id   = el.dataset.id;
    const type = el.dataset.type;
    const lien = el.dataset.lien;

    // Marquer comme lu
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      if (session.token && id) {
        await fetch(`/api/notifications/${id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + session.token }
        });
      }
    } catch (e) {}

    // Fermer le panel
    const panel = document.getElementById('notif-panel');
    if (panel) panel.style.display = 'none';

    // Rediriger
    naviguerVers(lien, type);
  };

  /* ── 10. Marquer tout comme lu ── */
  async function marquerToutLu() {
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      if (!session.token) return;
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + session.token }
      });
      mettreAJourBadge(0);
      chargerNotifications();
    } catch (e) {}
  }

  /* ── 11. Mettre à jour le badge compteur sur la cloche ── */
  function mettreAJourBadge(count) {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  /* ── 12. Polling : vérifie les nouvelles notifs toutes les 30s ── */
  let _lastCount = 0;

  async function verifierNouvellesNotifs() {
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      if (!session.token) return;

      const r = await fetch('/api/notifications/count', {
        headers: { 'Authorization': 'Bearer ' + session.token }
      });
      const data = await r.json();
      const count = data.count || 0;

      mettreAJourBadge(count);

      // S'il y a plus de notifs qu'avant → jouer le son
      if (count > _lastCount && _lastCount >= 0) {
        const diff = count - _lastCount;
        // Jouer le son autant de fois qu'il y a de nouvelles notifs (max 3)
        const nbSons = Math.min(diff, 3);
        for (let i = 0; i < nbSons; i++) {
          setTimeout(() => playNotifSound(), i * 400);
        }
      }
      _lastCount = count;

    } catch (e) {
      // Silencieux si erreur réseau
    }
  }

  /* ── Utilitaire ── */
  function escH(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── 13. Initialisation ── */
  function init() {
    injecterCloche();
    _lastCount = -1; // -1 pour ne pas jouer de son au premier chargement
    verifierNouvellesNotifs();
    // Polling toutes les 30 secondes
    setInterval(verifierNouvellesNotifs, 30000);
  }

  // Démarrer après que le DOM soit chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM déjà prêt (script chargé après le DOM)
    setTimeout(init, 500);
  }

})();
