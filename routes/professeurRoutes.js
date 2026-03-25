const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controller/professeurController');

// ── Multer config ──
let uploadFichier, uploadPhoto;
try {
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    // Storage pour ressources pédagogiques
    const storageFichier = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            cb(null, `res_${Date.now()}_${safeName}`);
        }
    });

    // Storage pour photos de profil
    const storagePhoto = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `photo_${req.user?.id || Date.now()}${ext}`);
        }
    });

    // Filtre : PDF, Word, vidéos, images, audio
    const fileFilter = (req, file, cb) => {
        const allowed = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'text/plain'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé: ' + file.mimetype), false);
        }
    };

    const photoFilter = (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Seules les images sont acceptées pour la photo'), false);
    };

    uploadFichier = multer({
        storage: storageFichier,
        limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max
        fileFilter
    });

    uploadPhoto = multer({
        storage: storagePhoto,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
        fileFilter: photoFilter
    });

} catch (e) {
    console.error('Multer non disponible:', e.message);
    const noop = { single: () => (req, res, next) => next() };
    uploadFichier = noop;
    uploadPhoto = noop;
}

// ── Gestion erreurs multer ──
function handleUpload(uploadMiddleware) {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err) {
                console.error('Erreur upload:', err.message);
                return res.status(400).json({ success: false, message: 'Erreur upload: ' + err.message });
            }
            next();
        });
    };
}

// ── Profil ──
router.get('/profil', authMiddleware, ctrl.getProfil);
router.put('/profil', authMiddleware, handleUpload(uploadPhoto.single('photo')), ctrl.updateProfil);

// ── Élèves ──
router.get('/eleves', authMiddleware, ctrl.getEleves);

// ── Notes ──
router.post('/notes', authMiddleware, ctrl.saveNotes);

// ── Ressources ──
router.get('/ressources', authMiddleware, ctrl.getRessources);
router.post('/ressources', authMiddleware, handleUpload(uploadFichier.single('fichier')), ctrl.ajouterRessource);
router.put('/ressources/:id/visibilite', authMiddleware, ctrl.toggleVisibilite);
router.delete('/ressources/:id', authMiddleware, ctrl.supprimerRessource);

// ── Orientation ──
router.get('/orientation', authMiddleware, ctrl.getOrientation);
router.post('/orientation', authMiddleware, ctrl.saveOrientation);

// ── Cahier de texte ──
router.post('/cahier-texte', authMiddleware, ctrl.saveCT);
router.get('/cahier-texte', authMiddleware, ctrl.getCT);

module.exports = router;
