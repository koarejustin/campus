const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const eleveController = require('../controller/eleveController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========== CONFIGURATION UPLOAD AUDIO ==========
const audioDir = path.join(__dirname, '../public/uploads/audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, audioDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `audio_${Date.now()}${ext}`);
    }
});

const uploadAudio = multer({
    storage: audioStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Seuls les fichiers audio sont acceptés'));
        }
    }
});

// Bulletin et notes
router.get('/bulletin', authMiddleware, eleveController.getBulletin);

// Convocations (privées)
router.get('/convocations', authMiddleware, eleveController.getMesConvocations);

// Absences
router.get('/absences', authMiddleware, eleveController.getMesAbsences);

// Annonces officielles
router.get('/annonces', authMiddleware, eleveController.getAnnonces);

// Activités et événements (Vie Scolaire)
router.get('/activites', authMiddleware, eleveController.getActivites);

// Ressources pédagogiques
router.get('/ressources', authMiddleware, eleveController.getRessources);

// Horaire personnel
router.get('/horaire', authMiddleware, eleveController.getHoraire);

// Statistiques académiques
router.get('/statistiques', authMiddleware, eleveController.getStatistiques);

// Orientation
router.get('/orientation', authMiddleware, eleveController.getOrientation);

// Forum de classe
router.get('/forum-classe', authMiddleware, eleveController.getForumClasse);
router.post('/forum-classe', authMiddleware, eleveController.postForumClasse);

// Grand Élèves
router.get('/grand-eleves', authMiddleware, eleveController.getGrandEleves);
router.post('/grand-eleves', authMiddleware, eleveController.postGrandEleves);
router.post('/grand-eleves/:postId/like', authMiddleware, eleveController.likeGrandEleves);

// Inter-Classes
router.get('/inter-classes', authMiddleware, eleveController.getInterClasses);
router.post('/inter-classes', authMiddleware, eleveController.postInterClasses);

// Devoirs / Programme (une seule route)
router.get('/devoirs', authMiddleware, eleveController.getDevoirs);

// Profil élève
router.get('/mon-profil', authMiddleware, eleveController.getMonProfil);

// ========== NOUVELLES ROUTES ==========

// Suppression de message (forum classe ou inter-classes)
router.delete('/forum-message/:type/:messageId', authMiddleware, eleveController.deleteForumMessage);

// Message vocal
router.post('/message-vocal', authMiddleware, uploadAudio.single('audio'), eleveController.postMessageVocal);

// Appels vidéo
router.post('/video-call/create', authMiddleware, eleveController.creerSalleVideo);
router.post('/video-call/join/:roomId', authMiddleware, eleveController.rejoindreSalleVideo);
router.delete('/video-call/leave/:roomId', authMiddleware, eleveController.quitterSalleVideo);
router.get('/video-call/active', authMiddleware, eleveController.getSallesActives);
router.post('/video-call/signal', authMiddleware, eleveController.signalisationWebRTC);

// Compositions et examens blancs
router.get('/compositions', authMiddleware, eleveController.getCompositions);

module.exports = router;