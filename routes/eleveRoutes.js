const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const ctrl    = require('../controller/eleveController');

// Bulletin et notes
router.get('/bulletin',     auth, ctrl.getBulletin);

// Absences  →  export renommé getMesAbsences
router.get('/absences',     auth, ctrl.getMesAbsences);

// Convocations  →  export renommé getMesConvocations
router.get('/convocations', auth, ctrl.getMesConvocations);

// Annonces officielles
router.get('/annonces',     auth, ctrl.getAnnonces);

// Activités
router.get('/activites',    auth, ctrl.getActivites);

// Ressources pédagogiques
router.get('/ressources',   auth, ctrl.getRessources);

// Emploi du temps / Programme
router.get('/horaire',      auth, ctrl.getHoraire);

// Statistiques dashboard
router.get('/statistiques', auth, ctrl.getStatistiques);

module.exports = router;
