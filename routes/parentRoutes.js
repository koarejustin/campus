const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const parentController = require('../controller/parentController');

// Mes enfants
router.get('/mes-enfants', authMiddleware, parentController.getMesEnfants);

// Bulletin d'un enfant
router.get('/bulletin-enfant', authMiddleware, parentController.getBulletinEnfant);

// Convocations d'un enfant
router.get('/convocations-enfant', authMiddleware, parentController.getConvocationsEnfant);

// Absences d'un enfant
router.get('/absences-enfant', authMiddleware, parentController.getAbsencesEnfant);

// Annonces officielles
router.get('/annonces', authMiddleware, parentController.getAnnonces);

// Activités et événements
router.get('/activites', authMiddleware, parentController.getActivites);

// Cotisations APE
router.get('/cotisations', authMiddleware, parentController.getCotisations);

// Messages de la direction
router.get('/messages', authMiddleware, parentController.getMessages);

// Profil du parent - GET + PUT
router.get('/profil', authMiddleware, parentController.getProfilParent);
router.put('/profil', authMiddleware, parentController.updateProfilParent);

// Forum APE
router.get('/forum', authMiddleware, parentController.getForumPosts);
router.post('/forum', authMiddleware, parentController.addForumPost);
router.post('/forum/:id/like', authMiddleware, parentController.likeForumPost);

module.exports = router;
