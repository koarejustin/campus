const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controller/professeurController');

// Multer pour upload fichiers
let upload;
try {
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `res_${Date.now()}${ext}`);
        }
    });
    upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });
} catch (e) {
    // multer non installé → upload désactivé
    upload = { single: () => (req, res, next) => next() };
}

// ── Profil ──
router.get('/profil',   authMiddleware, ctrl.getProfil);
router.put('/profil',   authMiddleware, ctrl.updateProfil);

// ── Élèves ──
router.get('/eleves',   authMiddleware, ctrl.getEleves);

// ── Notes ──
router.post('/notes',   authMiddleware, ctrl.saveNotes);

// ── Ressources ──
router.get('/ressources',                    authMiddleware, ctrl.getRessources);
router.post('/ressources',                   authMiddleware, upload.single('fichier'), ctrl.ajouterRessource);
router.put('/ressources/:id/visibilite',     authMiddleware, ctrl.toggleVisibilite);
router.delete('/ressources/:id',             authMiddleware, ctrl.supprimerRessource);

// ── Orientation ──
router.get('/orientation',   authMiddleware, ctrl.getOrientation);
router.post('/orientation',  authMiddleware, ctrl.saveOrientation);

module.exports = router;
