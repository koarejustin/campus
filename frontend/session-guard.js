// ================================================================
// CAMPUS NUMÉRIQUE FASO — session-guard.js
// Détecte quand CETTE session a été fermée par le serveur (trop
// d'appareils connectés sur le compte, ou déconnexion demandée depuis un
// autre appareil) et redirige proprement vers la connexion avec un
// message clair, au lieu de laisser la page échouer silencieusement sur
// chaque appel API. Inclus sur les 7 pages de rôle.
// ================================================================
(function () {
  "use strict";
  if (window.__sessionGuardInstalled) return;
  window.__sessionGuardInstalled = true;

  var handling = false;
  function handleSessionReplaced() {
    if (handling) return;
    handling = true;
    try { localStorage.removeItem('user_session'); } catch (e) {}
    alert("Vous avez été déconnecté : ce compte est déjà utilisé sur trop d'appareils, ou une déconnexion a été demandée ailleurs.");
    window.location.href = 'login.html';
  }

  var _origFetch = window.fetch;
  window.fetch = function () {
    return _origFetch.apply(this, arguments).then(function (res) {
      if (res.status === 401) {
        res.clone().json().then(function (data) {
          if (data && data.code === 'SESSION_REMPLACEE') handleSessionReplaced();
        }).catch(function () {});
      }
      return res;
    });
  };

  // Certaines pages utilisent XMLHttpRequest via jQuery/anciens appels —
  // couvert aussi pour ne rien manquer.
  var _origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function () {
    this.addEventListener('load', function () {
      if (this.status === 401) {
        try {
          var data = JSON.parse(this.responseText);
          if (data && data.code === 'SESSION_REMPLACEE') handleSessionReplaced();
        } catch (e) {}
      }
    });
    return _origOpen.apply(this, arguments);
  };
})();
