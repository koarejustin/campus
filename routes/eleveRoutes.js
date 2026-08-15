const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { ensureRole } = require('../middleware/authMiddleware');
const eleveController = require('../controller/eleveController');
const professeurController = require('../controller/professeurController');

const eleveAuth = [authMiddleware, ensureRole('ELEVE')];

// Bulletin et notes
router.get('/bulletin', eleveAuth, eleveController.getBulletin);

// Convocations (privées)
router.get('/convocations', eleveAuth, eleveController.getMesConvocations);

// Absences
router.get('/absences', eleveAuth, eleveController.getMesAbsences);

// Annonces officielles
router.get('/annonces', eleveAuth, eleveController.getAnnonces);

// Activités et événements (Vie Scolaire)
router.get('/activites', eleveAuth, eleveController.getActivites);

// Ressources pédagogiques
router.get('/ressources', eleveAuth, eleveController.getRessources);

// Horaire personnel
router.get('/horaire', eleveAuth, eleveController.getHoraire);

// Statistiques académiques
router.get('/statistiques', eleveAuth, eleveController.getStatistiques);

// Forum de classe
router.get('/forum-classe', eleveAuth, eleveController.getForumClasse);
router.post('/forum-classe', eleveAuth, eleveController.postForumClasse);
router.post('/forum-reaction', eleveAuth, eleveController.toggleForumReaction);

// Grand Élèves
router.get('/grand-eleves', eleveAuth, eleveController.getGrandEleves);
router.post('/grand-eleves', eleveAuth, eleveController.postGrandEleves);
router.post('/grand-eleves/:postId/like', eleveAuth, eleveController.likeGrandEleves);
router.get('/grand-eleves/:postId/commentaires', eleveAuth, eleveController.getCommentairesGrandEleves);
router.post('/grand-eleves/:postId/commentaires', eleveAuth, eleveController.postCommentaireGrandEleves);

// Inter-Classes
router.get('/inter-classes', eleveAuth, eleveController.getInterClasses);
router.get('/classes', eleveAuth, eleveController.getClassesList);
router.post('/inter-classes', eleveAuth, eleveController.postInterClasses);

// Devoirs / Programme (une seule route)
router.get('/devoirs', eleveAuth, eleveController.getDevoirs);

// Profil élève
router.get('/mon-profil', eleveAuth, eleveController.getMonProfil);

// Professeurs accessibles par classe
router.get('/professeurs', eleveAuth, eleveController.getProfesseurs);
router.get('/professeur/:id', eleveAuth, professeurController.getProfilById);

// ========== NOUVELLES ROUTES ==========

// Suppression de message (forum classe ou inter-classes)
router.delete('/forum-message/:type/:messageId', eleveAuth, eleveController.deleteForumMessage);

// Compositions et examens blancs
router.get('/compositions', eleveAuth, eleveController.getCompositions);

// ← AJOUTER CETTE LIGNE ICI
router.get('/moyennes-avancees', eleveAuth, eleveController.getMoyennesAvancees);

// Copies corrigées scannées (partagées par le prof)
router.get('/copies-scannees', eleveAuth, eleveController.getMesCopiesScannees);

module.exports = router;