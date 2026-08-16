// ================================================================
// CAMPUS NUMÉRIQUE FASO — Service Worker
//
// Portée réaliste (voir discussion avec l'utilisateur) : garantir que
// l'appli s'ouvre toujours (même coupure réseau) et que les dernières
// pages consultées restent lisibles. PAS un vrai mode hors-ligne complet
// — les données (notes, messages, cotisations...) exigent toujours une
// connexion au serveur, comme WhatsApp ou Gmail.
// ================================================================

const CACHE_NAME = 'campus-numerique-v2';
const APP_SHELL = [
  '/eleve.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/vendor/chart.umd.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ne jamais mettre en cache les appels API — les données doivent
  // toujours être fraîches ; en cas d'échec réseau, laisser l'erreur
  // remonter normalement (pas de fausses données affichées).
  if (req.url.includes('/api/')) return;

  // Uniquement les requêtes GET peuvent être mises en cache.
  if (req.method !== 'GET') return;

  // ✅ Chart.js (/vendor/) est un fichier statique versionné qui ne
  // change jamais entre deux déploiements identiques — le stratégie
  // "réseau d'abord" ci-dessous le retéléchargeait entièrement (~200 Ko)
  // à chaque chargement de page, ce qui dépassait le délai d'attente
  // côté élève sur une connexion lente et affichait "Graphique
  // indisponible" même avec du réseau. Cache d'abord : instantané dès
  // la deuxième visite, sans jamais retélécharger inutilement.
  if (req.url.includes('/vendor/')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('/eleve.html'))
      )
  );
});
