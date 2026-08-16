const express = require('express');
const router = express.Router();
const surveillantController = require('../controller/surveillantController');
const authMiddleware = require('../middleware/authMiddleware');
const { ensureRoleIn } = require('../middleware/authMiddleware');
const dirOuSurv = ensureRoleIn(['DIRECTION', 'SURVEILLANT']);
const multer = require('multer');
const path = require('path');

// ✅ En mémoire (pas sur disque) : le contrôleur envoie ensuite le fichier
// à Supabase Storage via services/fileStorage.js — le disque local de
// Render est effacé à chaque redéploiement.
const upload = multer({
	storage: multer.memoryStorage(),
	fileFilter: function (req, file, cb) {
		const allowed = /jpeg|jpg|png|gif/;
		const ext = allowed.test(path.extname(file.originalname).toLowerCase());
		const mime = allowed.test(file.mimetype);
		if (ext && mime) cb(null, true);
		else cb(new Error('Seuls les fichiers images sont autorisés'));
	},
	limits: { fileSize: 2 * 1024 * 1024 }
});

// ============== DONNÉES ==============
// ✅ SÉCURITÉ : n'importe quel compte connecté (élève, parent, alumni)
// pouvait lister le nom + identifiant de connexion de toute une classe.
router.get('/eleves', authMiddleware, dirOuSurv, surveillantController.getElevesForClass);

// ============== STATISTIQUES ==============
router.get('/stats', authMiddleware, surveillantController.getSurveillantStats);

// ============== ABSENCES ==============
router.post('/absences', authMiddleware, surveillantController.recordAbsence);
router.get('/absences', authMiddleware, surveillantController.getAbsences);
router.put('/absences/justification', authMiddleware, surveillantController.updateAbsenceJustification);
router.delete('/absences/:id', authMiddleware, surveillantController.deleteAbsence);

// ============== CONVOCATIONS ==============
router.post('/convocations', authMiddleware, surveillantController.createConvocation);
router.get('/convocations', authMiddleware, surveillantController.getConvocations);

// ============== INCIDENTS ==============
router.post('/incidents', authMiddleware, surveillantController.reportIncident);
router.get('/incidents', authMiddleware, surveillantController.getIncidents);

// ============== MESSAGES - COMMENTÉ (si fonctions manquantes) ==============
// router.post('/messages', authMiddleware, surveillantController.sendMessage);
// router.get('/messages', authMiddleware, surveillantController.getMessages);

// ============== ANNONCES ==============
router.post('/announcements', authMiddleware, surveillantController.publishOfficialAnnouncement);
router.get('/announcements', authMiddleware, surveillantController.getAnnouncements);

// ============== ACTIVITÉS - COMMENTÉ ==============
// router.post('/activities', authMiddleware, surveillantController.createActivity);
// router.get('/activities', surveillantController.getActivities);

// ============== CAHIERS DE TEXTE ==============
router.get('/cahiers-texte', authMiddleware, surveillantController.getCahiersTexte);

// ============== PHOTO PROFIL ==============
router.post('/photo', authMiddleware, upload.single('photo'), surveillantController.uploadPhoto);

// ============== SURVEILLANTS (LISTE) ==============
router.get('/list', authMiddleware, surveillantController.getSurveillants);

module.exports = router;