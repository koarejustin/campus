const express = require('express');
const router = express.Router();
const surveillantController = require('../controller/surveillantController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname);
		const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
		cb(null, name);
	}
});

const upload = multer({
	storage,
	fileFilter: function (req, file, cb) {
		const allowed = /jpeg|jpg|png|gif/;
		const ext = allowed.test(path.extname(file.originalname).toLowerCase());
		const mime = allowed.test(file.mimetype);
		if (ext && mime) cb(null, true);
		else cb(new Error('Seuls les fichiers images sont autorisés'));
	},
	limits: { fileSize: 2 * 1024 * 1024 }
});

/**
 * ROUTES SURVEILLANCE - Cahier des charges
 */

// ============== DONNÉES ==============
router.get('/eleves', authMiddleware, surveillantController.getElevesForClass);

// ============== ABSENCES ==============
router.post('/absences', authMiddleware, surveillantController.recordAbsence);
router.get('/absences', authMiddleware, surveillantController.getAbsences);
router.put('/absences/justification', authMiddleware, surveillantController.updateAbsenceJustification);

// ============== CONVOCATIONS ==============
router.post('/convocations', authMiddleware, surveillantController.createConvocation);
router.get('/convocations', authMiddleware, surveillantController.getConvocations);

// ============== INCIDENTS ==============
router.post('/incidents', authMiddleware, surveillantController.reportIncident);
router.get('/incidents', authMiddleware, surveillantController.getIncidents);

// ============== MESSAGES ==============
router.post('/messages', authMiddleware, surveillantController.sendMessage);
router.get('/messages', authMiddleware, surveillantController.getMessages);

// ============== ANNONCES ==============
router.post('/announcements', authMiddleware, surveillantController.publishOfficialAnnouncement);
router.get('/announcements', surveillantController.getAnnouncements);

// ============== ACTIVITÉS ==============
router.post('/activities', authMiddleware, surveillantController.createActivity);
router.get('/activities', surveillantController.getActivities);

module.exports = router;

// Upload photo de profil (Surveillant)
// Note: route ajoutée après l'export pour rester simple — l'ordre importe peu pour Express
router.post('/photo', authMiddleware, upload.single('photo'), surveillantController.uploadPhoto);
