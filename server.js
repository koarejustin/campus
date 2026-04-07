const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./config/db');
const app = express();
const server = http.createServer(app);

// ================================================================
// DÉCLARATION POUR NOTIFICATIONS
// ================================================================
let _io = null;
function setIO(ioInstance) {
    _io = ioInstance;
}
function getIO() {
    return _io;
}

// ═══════════════════════════════════════════
// SOCKET.IO — Messagerie temps réel
// ═══════════════════════════════════════════
let io;
try {
    const { Server } = require('socket.io');
    const jwt = require('jsonwebtoken');

    io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
    app.locals.io = io;
    setIO(io);  // ✅ UNE SEULE FOIS

    io.on('connection', (socket) => {
        // Auth: le client envoie son token pour rejoindre le bon room
        socket.on('auth', async (data) => {
            try {
                if (data && data.token) {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'ma_cle_secrete');
                    if (decoded.role === 'PROFESSEUR' || decoded.role === 'DIRECTION' || decoded.role === 'SURVEILLANT') {
                        socket.join('salle-profs');
                        socket.emit('joined', { room: 'salle-profs', code: data.code });
                        console.log(`✅ ${data.code || decoded.role} a rejoint salle-profs`);
                    }
                    socket.userId = decoded.id;
                    socket.userRole = decoded.role;
                    socket.userCode = data.code;
                }
            } catch (e) { console.warn('Socket auth failed:', e.message); }
        });

        // ── Rebroadcast msg-salle (profs ↔ profs + direction) ──
        socket.on('msg-salle', async (msg) => {
            try {
                const conv_id = msg.conv_id || 'general';
                const fromCode = socket.userCode || msg.from || 'inconnu';
                const fromNom = msg.nom || fromCode;
                const txt = msg.txt || '';
                const type = msg.type || 'text';
                const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                // Sauvegarder en BD
                let msgId = Date.now();
                try {
                    const r = await db.query(
                        `INSERT INTO pedagogie.messages_salle (conv_id, from_code, from_nom, contenu, type_msg)
                         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                        [conv_id, fromCode, fromNom, txt, type]
                    );
                    msgId = r.rows[0].id;
                } catch (e2) { console.warn('BD msg-salle insert:', e2.message); }

                // Diffuser à tout le room salle-profs
                io.to('salle-profs').emit('msg-salle', {
                    id: msgId,
                    from: fromCode,
                    nom: fromNom,
                    txt: txt,
                    conv_id: conv_id,
                    type: type,
                    time: time,
                    isDirection: socket.userRole === 'DIRECTION'
                });
            } catch (e) { console.warn('msg-salle handler:', e.message); }
        });

        // ── Poll vote ──
        socket.on('poll-vote', (data) => {
            io.to('salle-profs').emit('poll-vote', data);
        });

        socket.on('disconnect', () => {
            if (socket.userCode) {
                io.to('salle-profs').emit('user-left', { code: socket.userCode });
            }
        });

        // Écoute l'événement pour envoyer les messages d'absences aux élèves
        socket.on('sendAbsence', (data) => {
            const conv_id = data.conv_id || 'general';
            io.to('salle-profs').emit('receiveAbsence', {
                conv_id,
                message: data.message,
            });
        });

        // Écoute l'événement pour envoyer les messages des parents aux élèves
        socket.on('sendParentMessage', (data) => {
            const conv_id = data.conv_id || 'general';
            io.to('salle-profs').emit('receiveParentMessage', {
                conv_id,
                message: data.message,
            });
        });
    });

    console.log('✅ Socket.io initialisé');
} catch (e) {
    console.warn('⚠️ Socket.io non disponible:', e.message);
}

// ═══════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════
app.use(cors());
app.use(express.json());

// ── Fichiers statiques ──
app.use(express.static('frontend'));

// ── UPLOADS : s'assurer que le dossier existe puis le servir ──
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Forcer UTF-8 ──
app.use((req, res, next) => {
    db.query("SET client_encoding = 'UTF8'").catch(() => { });
    next();
});

// ═══════════════════════════════════════════
// ROUTES API
// ═══════════════════════════════════════════
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const surveillantRoutes = require('./routes/surveillantRoutes');
const eleveRoutes = require('./routes/eleveRoutes');
const parentRoutes = require('./routes/parentRoutes');
const professeurRoutes = require('./routes/professeurRoutes');
const alumniRoutes = require('./routes/alumniRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/surveillants', surveillantRoutes);
app.use('/api/eleves', eleveRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/professeurs', professeurRoutes);
app.use('/api/alumni', alumniRoutes);

// ── Upload média salle des profs ──
const multer = require('multer');
const msgStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, `msg_${Date.now()}_${safeName}`);
    }
});
const msgUpload = multer({
    storage: msgStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg',
            'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];
        cb(null, allowed.includes(file.mimetype));
    }
});

const jwt = require('jsonwebtoken');
app.post('/api/messages/upload', (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return res.status(401).json({ success: false, message: 'Non authentifié' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'ma_cle_secrete');
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Token invalide' });
    }
}, msgUpload.single('media'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });

        const conv_id = req.body.conv_id || 'general';
        const from_code = req.user.code_unique || req.user.id;
        const from_nom = req.body.nom || 'Professeur';
        const type_msg = req.body.type || 'media';
        const url = `/uploads/${req.file.filename}`;

        let msgId = Date.now();
        try {
            const r = await db.query(
                `INSERT INTO pedagogie.messages_salle
                    (conv_id, from_code, from_nom, contenu, type_msg)
                    VALUES ($1,$2,$3,$4,$5)
                    RETURNING id, date_envoi`,
                [conv_id, from_code, from_nom, url, type_msg]
            );
            msgId = r.rows[0].id;
        } catch (e) {
            console.warn('BD insert media msg:', e.message);
        }

        if (io) {
            io.to('salle-profs').emit('msg-salle', {
                id: msgId,
                from: from_code,
                nom: from_nom,
                txt: url,
                conv_id,
                type: type_msg,
                fileName: req.file.originalname,
                fileSize: req.file.size > 1048576
                    ? (req.file.size / 1048576).toFixed(1) + ' Mo'
                    : Math.round(req.file.size / 1024) + ' Ko',
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            });
        }

        res.json({
            success: true,
            url,
            id: msgId,
            fileName: req.file.originalname,
            fileSize: req.file.size > 1048576
                ? (req.file.size / 1048576).toFixed(1) + ' Mo'
                : Math.round(req.file.size / 1024) + ' Ko',
        });
    } catch (e) {
        console.error('Upload media msg:', e.message);
        res.status(500).json({ success: false, message: 'Erreur serveur: ' + e.message });
    }
});

// ── Messages salle des profs ──
app.get('/api/messages/:conv_id', async (req, res) => {
    try {
        const { conv_id } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 60, 200);
        const r = await db.query(
            `SELECT id, conv_id, from_code, from_nom,
                    contenu AS txt, type_msg AS type, reply_to, date_envoi
                    FROM pedagogie.messages_salle
                WHERE conv_id = $1
                ORDER BY date_envoi ASC
                LIMIT $2`,
            [conv_id, limit]
        );
        res.json({
            success: true,
            messages: r.rows.map(m => ({
                id: m.id,
                from: m.from_code,
                nom: m.from_nom,
                txt: m.txt,
                conv_id: m.conv_id,
                type: m.type,
                time: new Date(m.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                date: new Date(m.date_envoi).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            }))
        });
    } catch (e) {
        console.warn('GET messages:', e.message);
        res.json({ success: true, messages: [] });
    }
});

// ── Santé du serveur ──
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

// ================================================================
// ROUTES NOTIFICATIONS
// ================================================================
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

// ================================================================
// EXPORTS POUR NOTIFICATIONS
// ================================================================
module.exports.getIO = getIO;
module.exports.setIO = setIO;

// ═══════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur + WebSocket lancé sur le port ${PORT}`);
    db.query('SELECT 1').then(() => console.log('✅ Connecté à PostgreSQL')).catch(e => console.error('❌ BD:', e.message));
});