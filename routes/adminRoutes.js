const express = require('express');
const router  = express.Router();
const ctrl    = require('../controller/adminController');
const auth    = require('../middleware/authMiddleware');

// ── Stats dashboard ──
router.get('/stats',        auth, ctrl.getStats);

// ── Élèves ──
router.get('/eleves',       auth, ctrl.getElevesDir);
router.get('/eleve/:id',    auth, ctrl.getEleveDetail);
router.post('/eleves',      auth, ctrl.createEleve);

// ── Corps enseignant ──
router.get('/corps',        auth, ctrl.getProfesseurs);
router.get('/professeurs',  auth, ctrl.getProfesseurs);
router.post('/professeurs', auth, ctrl.createProfesseur);

// ── Cahiers de texte ──
router.get('/cahiers',               auth, ctrl.getCahiersTexte);
router.get('/cahiers-texte',         auth, ctrl.getCahiersTexte);
router.get('/cahier-texte/:prof_id', auth, ctrl.getCahierProf);

// ── Bulletins & Signatures ──
router.get('/bulletins',    auth, ctrl.getBulletins);

// ── Agenda ──
router.get('/agenda',       auth, ctrl.getAgenda);
router.post('/agenda',      auth, ctrl.createAgenda);

// ── Message vers profs ──
router.post('/message-prof', auth, ctrl.messageProf);

// ── Cotisations ──
router.get('/cotisations',  auth, ctrl.getCotisations);
router.post('/paiement',    auth, ctrl.savePaiement);

module.exports = router;
