const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const eleveController = require('../controller/eleveController');

/**
 * Routes ÉLÈVE
 * Tous les endpoints nécessitent une authentification
 * Rôle requis : 'ELEVE'
 */

// Bulletin et notes
router.get('/bulletin', authMiddleware, eleveController.getBulletin);

// Convocations (privées)
router.get('/convocations', authMiddleware, eleveController.getMesConvocations);

// Absences justifiées
router.get('/absences', authMiddleware, eleveController.getMesAbsences);

// Annonces officielles
router.get('/annonces', authMiddleware, eleveController.getAnnonces);

// Activités et événements
router.get('/activites', authMiddleware, eleveController.getActivites);

// Ressources pédagogiques
router.get('/ressources', authMiddleware, eleveController.getRessources);

// Horaire personnel
router.get('/horaire', authMiddleware, eleveController.getHoraire);

// Statistiques académiques
router.get('/statistiques', authMiddleware, eleveController.getStatistiques);

module.exports = router;
