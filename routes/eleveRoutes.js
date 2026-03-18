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

// Forum de classe
router.get('/forum-classe',    auth, ctrl.getForumClasse);
router.post('/forum-classe',   auth, ctrl.postForumClasse);

// Inter-classes
router.get('/inter-classes',   auth, ctrl.getInterClasses);
router.post('/inter-classes',  auth, ctrl.postInterClasses);

// Grand Élèves
router.get('/grand-eleves',    auth, ctrl.getGrandEleves);
router.post('/grand-eleves',   auth, ctrl.postGrandEleves);
router.post('/grand-eleves/:id/like', auth, ctrl.likePost);

// Vie scolaire
router.get('/vie-scolaire',    auth, ctrl.getVieScolaire);

// Orientation élève
router.get('/orientation',     auth, ctrl.getOrientationEleve);

module.exports = router;
