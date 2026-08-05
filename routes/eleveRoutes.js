const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { ensureRole } = require('../middleware/authMiddleware');
const eleveController = require('../controller/eleveController');
const professeurController = require('../controller/professeurController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const eleveAuth = [authMiddleware, ensureRole('ELEVE')];

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
router.get('/bulletin', eleveAuth, eleveController.getBulletin);

// Convocations (privées)
router.get('/convocations', eleveAuth, eleveController.getMesConvocations);

// Absences
router.get('/absences', eleveAuth, eleveController.getMesAbsences);

// Annonces officielles
router.get('/annonces', eleveAuth, eleveController.getAnnonces);

// Activités et événements (Vie Scolaire)
router.get('/activites', eleveAuth, eleveController.getActivites);

// Ressources pédagogiques
router.get('/ressources', eleveAuth, eleveController.getRessources);

// Horaire personnel
router.get('/horaire', eleveAuth, eleveController.getHoraire);

// Statistiques académiques
router.get('/statistiques', eleveAuth, eleveController.getStatistiques);

// Forum de classe
router.get('/forum-classe', eleveAuth, eleveController.getForumClasse);
router.post('/forum-classe', eleveAuth, eleveController.postForumClasse);

// Grand Élèves
router.get('/grand-eleves', eleveAuth, eleveController.getGrandEleves);
router.post('/grand-eleves', eleveAuth, eleveController.postGrandEleves);
router.post('/grand-eleves/:postId/like', eleveAuth, eleveController.likeGrandEleves);

// Inter-Classes
router.get('/inter-classes', eleveAuth, eleveController.getInterClasses);
router.get('/classes', eleveAuth, eleveController.getClassesList);
router.post('/inter-classes', eleveAuth, eleveController.postInterClasses);

// Devoirs / Programme (une seule route)
router.get('/devoirs', eleveAuth, eleveController.getDevoirs);

// Profil élève
router.get('/mon-profil', eleveAuth, eleveController.getMonProfil);

// Professeurs accessibles par classe
router.get('/professeurs', eleveAuth, eleveController.getProfesseurs);
router.get('/professeur/:id', eleveAuth, professeurController.getProfilById);

// ========== NOUVELLES ROUTES ==========

// Suppression de message (forum classe ou inter-classes)
router.delete('/forum-message/:type/:messageId', eleveAuth, eleveController.deleteForumMessage);

// Message vocal
router.post('/message-vocal', eleveAuth, uploadAudio.single('audio'), eleveController.postMessageVocal);

// Appels vidéo
router.post('/video-call/create', eleveAuth, eleveController.creerSalleVideo);
router.post('/video-call/join/:roomId', eleveAuth, eleveController.rejoindreSalleVideo);
router.delete('/video-call/leave/:roomId', eleveAuth, eleveController.quitterSalleVideo);
router.get('/video-call/active', eleveAuth, eleveController.getSallesActives);
router.post('/video-call/signal', eleveAuth, eleveController.signalisationWebRTC);

// Compositions et examens blancs
router.get('/compositions', eleveAuth, eleveController.getCompositions);

// ← AJOUTER CETTE LIGNE ICI
router.get('/moyennes-avancees', eleveAuth, eleveController.getMoyennesAvancees);

module.exports = router;