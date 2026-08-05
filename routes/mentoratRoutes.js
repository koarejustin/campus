const express = require('express');
const router = express.Router();
const mentoratController = require('../controller/mentoratController');
const authMiddleware = require('../middleware/authMiddleware');

// Tous les routes requièrent l'authentification
router.use(authMiddleware);

// ========== RELATIONS DE MENTORAT ==========
router.post('/relation/create', mentoratController.createRelationMentorat);
router.get('/eleves', mentoratController.getElevesMentorat);
router.get('/alumni-mentor', mentoratController.getAlumniMentor);
router.post('/demandes', mentoratController.requestMentorat);
router.get('/demandes', mentoratController.getDemandes);
router.put('/demandes/:id_demande/repondre', mentoratController.repondreDemande);

// ========== JOURNAL DE BORD ==========
router.post('/journal/entree', mentoratController.addEntreeJournal);
router.get('/journal/:id_relation', mentoratController.getJournalBord);
router.put('/journal/:id_journal', mentoratController.updateEntreeJournal);
router.delete('/journal/:id_journal', mentoratController.deleteEntreeJournal);

// ========== OBJECTIFS DE MENTORAT ==========
router.post('/objectif/create', mentoratController.createObjectifMentorat);
router.get('/objectifs/:id_relation', mentoratController.getObjectifsMentorat);
router.put('/objectif/:id_objectif', mentoratController.updateObjectifMentorat);

// ========== ORIENTATIONS LITTÉRATURE / SCIENCE ==========
router.post('/orientation/set', mentoratController.setOrientationEleve);
router.get('/orientation/:id_relation', mentoratController.getOrientationEleve);
router.get('/orientations/all', mentoratController.getElevesAvecOrientations);

// ========== TABLEAU DE BORD ==========
router.get('/dashboard', mentoratController.getDashboardMentorat);
router.get('/resultats-eleve/:id_eleve', mentoratController.getResultatsEleveMentorat);

module.exports = router;
