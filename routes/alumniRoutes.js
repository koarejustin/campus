const express = require('express');
const router = express.Router();
const alumniController = require('../controller/alumniController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes pour l'espace alumni
router.use(authMiddleware);

// ========== PROFIL ==========
router.get('/profil', alumniController.getProfilAlumni);
router.put('/profil', alumniController.updateProfilAlumni);

// ========== MENTORATS ==========
router.get('/mentorats', alumniController.getMentorats);
router.post('/mentorats', alumniController.createMentorat);

// ========== ORIENTATION ==========
router.get('/orientation/eleves', alumniController.getOrientationEleves);
router.get('/orientation/:eleveId', alumniController.getAvisOrientation);
router.post('/orientation/commentaire', alumniController.createAvisOrientation);

// ========== OFFRES (commentées pour le moment) ==========
// router.get('/offres', alumniController.getOffres);
// router.post('/offres', alumniController.createOffre);

module.exports = router;