const express = require('express');
const router = express.Router();
const alumniController = require('../controller/alumniController');
const authMiddleware = require('../middleware/authMiddleware');
const requireAlumni = require('../middleware/alumniMiddleware');

/**
 * ROUTES ESPACE ALUMNI - Campus Numérique FASO
 *
 * Double sécurité sur toutes les routes :
 *   1. authMiddleware  → vérifie que le JWT est valide
 *   2. requireAlumni   → vérifie en base que l'utilisateur est bien ALUMNI
 *
 * Résultat : un élève, un prof, un parent — même avec un token valide —
 * ne peut PAS accéder à ces routes.
 *
 * Exception : /profil-public/:id est accessible à tout utilisateur authentifié
 * (un élève doit pouvoir consulter la fiche d'un mentor), donc elle est
 * déclarée AVANT les gardes globales ci-dessous.
 */

// ── Profil public d'un mentor (élèves, profs, direction — pas seulement alumni) ──
router.get('/profil-public/:id', authMiddleware, alumniController.getProfilAlumniById);

// ── Garde globale sur le reste du routeur ──────────────────────────────────────
router.use(authMiddleware);
router.use(requireAlumni);  // <-- ajout de la vérification de rôle ALUMNI

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
