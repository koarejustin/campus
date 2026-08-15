const express = require('express');
const router = express.Router();
const apeController = require('../controller/apeController');
const authMiddleware = require('../middleware/authMiddleware');

// Toutes les routes APE nécessitent d'être authentifié
router.use(authMiddleware);

// Mon rôle dans le bureau APE (ou simple membre)
router.get('/mon-role', apeController.getMonRole);

// Liste du bureau (Président, Trésorier, Secrétaire...) — visible par tous les parents
router.get('/bureau', apeController.getBureau);

// Cotisations — vue d'ensemble et gestion (bureau uniquement, vérifié dans le controller)
router.get('/cotisations/toutes', apeController.getToutesCotisations);
router.post('/cotisations', apeController.enregistrerCotisation);
router.put('/cotisations/:id_cotisation/statut', apeController.updateStatutCotisation);

// Forum de communication interne entre parents
router.get('/forum', apeController.getForum);
router.post('/forum', apeController.publierForum);
router.post('/forum/:id_post/like', apeController.likeForum);

// Projets APE — visibles par tous, création réservée au bureau (vérifié dans le controller)
router.get('/projets', apeController.getProjets);
router.post('/projets', apeController.creerProjet);

// Orientation — un parent consulte/ajoute des avis sur SES enfants (vérifié dans le controller)
router.get('/orientation-enfant', apeController.getOrientationEnfant);
router.post('/orientation-enfant', apeController.ajouterAvisOrientation);

// Liste des enfants du parent connecté (pour peupler les sélecteurs côté frontend)
router.get('/mes-enfants', apeController.getMesEnfants);

// Résoudre un matricule en id_user (bureau uniquement, pour la saisie de cotisation)
router.get('/resoudre-matricule/:matricule', apeController.resoudreMatricule);

module.exports = router;
