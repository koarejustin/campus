const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { ensureRole } = require('../middleware/authMiddleware');
const ctrl = require('../controller/professeurController');
const db = require('../config/db');

// ✅ SÉCURITÉ : ce fichier n'appliquait jusqu'ici que "es-tu connecté" (auth),
// jamais "es-tu bien un professeur" — n'importe quel compte (élève, parent,
// alumni) pouvait créer de faux devoirs, falsifier le cahier de texte, ou
// uploader une fausse "copie corrigée" au nom d'un prof.
router.use(authMiddleware, ensureRole('PROFESSEUR'));

// ── Multer config ──
let uploadFichier, uploadPhoto, uploadCopie;
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

    // Storage pour copies corrigées scannées
    const storageCopie = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname) || '.jpg';
            cb(null, `copie_${Date.now()}${ext}`);
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

    // ✅ Filtre dédié et strict pour les copies scannées : PDF ou image
    // uniquement — contrairement à celui des ressources pédagogiques
    // (qui accepte volontairement bien plus large), on ne veut ici que
    // ce qui correspond réellement à une copie d'élève.
    const copieFilter = (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Seuls les PDF et images sont acceptés pour une copie'), false);
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

    uploadCopie = multer({
        storage: storageCopie,
        limits: { fileSize: 15 * 1024 * 1024 }, // 15 Mo max — une photo de copie suffit largement
        fileFilter: copieFilter
    });

} catch (e) {
    console.error('Multer non disponible:', e.message);
    const noop = { single: () => (req, res, next) => next() };
    uploadFichier = noop;
    uploadPhoto = noop;
    uploadCopie = noop;
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
router.get('/profil/:id', authMiddleware, ctrl.getProfilById);
router.put('/profil', authMiddleware, handleUpload(uploadPhoto.single('photo')), ctrl.updateProfil);

// ── Élèves ──
router.get('/eleves', authMiddleware, ctrl.getEleves);

// ── Mes matières (vrais id_matiere, pour la saisie de notes) ──
router.get('/mes-matieres', authMiddleware, ctrl.getMesMatieres);

// ── Notes ──
router.post('/notes', authMiddleware, ctrl.saveNotes);

// ── Ressources ──
router.get('/ressources', authMiddleware, ctrl.getRessources);
router.post('/ressources', authMiddleware, handleUpload(uploadFichier.single('fichier')), ctrl.ajouterRessource);
router.put('/ressources/:id/visibilite', authMiddleware, ctrl.toggleVisibilite);
router.delete('/ressources/:id', authMiddleware, ctrl.supprimerRessource);

// ── Cahier de texte ──
router.post('/cahier-texte', authMiddleware, ctrl.saveCT);
router.get('/cahier-texte', authMiddleware, ctrl.getCT);
// Devoirs (pour les professeurs)
router.get('/devoirs', authMiddleware, ctrl.getDevoirs);
router.post('/devoirs', authMiddleware, ctrl.createDevoir);
router.put('/devoirs/:id', authMiddleware, ctrl.updateDevoir);
router.delete('/devoirs/:id', authMiddleware, ctrl.deleteDevoir);
// ── Annonces reçues (lecture seule) ──
router.get('/annonces', authMiddleware, ctrl.getAnnonces);

// ── Copies corrigées scannées ──
router.post('/copies-scannees', authMiddleware, handleUpload(uploadCopie.single('scan')), ctrl.uploadCopieScannee);
router.get('/copies-scannees', authMiddleware, ctrl.getCopiesScannees);
// ========== MES CLASSES ET MATIERES ==========
router.get('/mes-classes', authMiddleware, async (req, res) => {
    try {
        const profId = req.user.id;

        // Récupérer les vraies classes et matières assignées au professeur
        const profResult = await db.query(`
            SELECT classes, matieres FROM pedagogie.profils_profs
            WHERE id_user = $1
        `, [profId]);

        let classes = profResult.rows[0]?.classes || [];
        let matieres = profResult.rows[0]?.matieres || [];

        // Si vraiment aucune classe assignée en base, fallback générique (prof peut choisir)
        if (classes.length === 0) {
            classes = ['6ème', '5ème', '4ème', '3ème', '2nde A', '2nde C', '1ère A', '1ère D', 'Tle A', 'Tle D'];
        }
        if (matieres.length === 0) {
            matieres = ['Mathématiques', 'Français', 'Anglais'];
        }

        res.json({
            success: true,
            classes: classes,
            matieres: matieres
        });
    } catch (error) {
        console.error('Erreur mes-classes:', error.message);
        // Fallback
        res.json({
            success: true,
            classes: ['6ème', '5ème', '4ème', '3ème', '2nde A', '2nde C', '1ère A', '1ère D', 'Tle A', 'Tle D'],
            matieres: ['Mathématiques', 'Français', 'Anglais']
        });
    }
});

// ========== LISTE DES PROFS POUR LA SALLE ==========
router.get('/liste-salle', authMiddleware, async (req, res) => {
    try {
        const profId = req.user.id;

        const result = await db.query(`
            SELECT c.id_user, c.code_unique, c.nom, c.prenom, 
                   p.specialite
            FROM authentification.comptes c
            LEFT JOIN pedagogie.profils_profs p ON p.id_user = c.id_user
            WHERE c.role_actuel = 'PROFESSEUR' 
            AND c.id_user != $1
            AND c.est_actif = true
            ORDER BY c.nom, c.prenom
        `, [profId]);

        res.json({
            success: true,
            profs: result.rows.map(p => ({
                code_unique: p.code_unique,
                prenom: p.prenom,
                nom: p.nom,
                specialite: p.specialite || 'Professeur'
            }))
        });
    } catch (error) {
        console.error('Erreur liste-salle:', error.message);
        res.json({ success: true, profs: [] });
    }
});
// ========== MESSAGES PRIVÉS ==========
router.get('/messages-prives', authMiddleware, async (req, res) => {
    try {
        const profId = req.user.id;

        const messages = await db.query(`
            SELECT mp.*, 
                   c.nom as expediteur_nom, 
                   c.prenom as expediteur_prenom,
                   c.role_actuel as expediteur_role
            FROM pedagogie.messages_prives mp
            JOIN authentification.comptes c ON c.id_user = mp.expediteur_id
            WHERE mp.destinataire_id = $1 OR mp.expediteur_id = $1
            ORDER BY mp.created_at DESC
            LIMIT 100
        `, [profId]);

        res.json({ success: true, messages: messages.rows });
    } catch (error) {
        console.error('Erreur getMessagesPrives:', error);
        res.json({ success: true, messages: [] });
    }
});

router.patch('/messages-prives/:id/lu', authMiddleware, async (req, res) => {
    try {
        const profId = req.user.id;
        const messageId = req.params.id;

        const result = await db.query(`
            UPDATE pedagogie.messages_prives
            SET lu = true
            WHERE id_message = $1 AND destinataire_id = $2
            RETURNING *
        `, [messageId, profId]);

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Message introuvable ou accès refusé.' });
        }

        res.json({ success: true, message: 'Message marqué comme lu.', data: result.rows[0] });
    } catch (error) {
        console.error('Erreur markMessagePriveLu:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

router.post('/messages-prives', authMiddleware, async (req, res) => {
    try {
        const profId = req.user.id;
        const { destinataire_id, contenu } = req.body;

        if (!destinataire_id || !contenu) {
            return res.status(400).json({ message: 'Destinataire et contenu requis' });
        }

        const result = await db.query(`
            INSERT INTO pedagogie.messages_prives 
            (expediteur_id, destinataire_id, contenu, lu, created_at)
            VALUES ($1, $2, $3, false, NOW())
            RETURNING *
        `, [profId, destinataire_id, contenu]);

        // Notification
        try {
            const notificationService = require('../services/notificationService');
            await notificationService.sendNotification(
                [destinataire_id],
                'MESSAGE_PRIVE',
                '💬 Nouveau message privé',
                `Vous avez reçu un message privé`,
                '/professeur.html?page=messages'
            );
        } catch (e) { }

        res.json({ success: true, message: result.rows[0] });
    } catch (error) {
        console.error('Erreur sendMessagePrive:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
module.exports = router;
