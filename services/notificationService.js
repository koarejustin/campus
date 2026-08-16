// ================================================================
// CAMPUS NUMÉRIQUE FASO — services/notificationService.js
// ================================================================
const db = require('../config/db');
const firebaseAdmin = require('./firebaseAdmin');

// S'assurer que la table a les bonnes colonnes (migration auto)
async function ensureColumns() {
    try {
        await db.query(`ALTER TABLE gestion.notifications ADD COLUMN IF NOT EXISTS titre VARCHAR(255)`);
        await db.query(`ALTER TABLE gestion.notifications ADD COLUMN IF NOT EXISTS lien TEXT`);
        await db.query(`ALTER TABLE gestion.notifications ADD COLUMN IF NOT EXISTS est_lu BOOLEAN NOT NULL DEFAULT false`);
        // Compatibilité : si la colonne s'appelle "lue" au lieu de "est_lu"
        await db.query(`ALTER TABLE gestion.notifications ADD COLUMN IF NOT EXISTS lue BOOLEAN NOT NULL DEFAULT false`);
        await db.query(`
            CREATE TABLE IF NOT EXISTS authentification.fcm_tokens (
                id_user UUID NOT NULL,
                token TEXT NOT NULL,
                plateforme VARCHAR(20) DEFAULT 'android',
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id_user, token)
            )
        `);
    } catch (e) {
        // Silencieux
    }
}
ensureColumns().catch(() => {});

// ── Enregistrer/rafraîchir le token FCM d'un appareil (un utilisateur peut
// avoir plusieurs appareils, donc plusieurs tokens) ──
exports.registerFcmToken = async (idUser, token, plateforme = 'android') => {
    try {
        await db.query(`
            INSERT INTO authentification.fcm_tokens (id_user, token, plateforme, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (id_user, token) DO UPDATE SET updated_at = NOW(), plateforme = $3
        `, [idUser, token, plateforme]);
        return true;
    } catch (err) {
        console.error('registerFcmToken error:', err.message);
        return false;
    }
};

// ── Envoyer une notification à un ou plusieurs utilisateurs ──
// destinataires : UUID string OU tableau de UUID
exports.sendNotification = async (destinataires, type, titre, contenu, lien = null) => {
    try {
        const ids = Array.isArray(destinataires) ? destinataires : [destinataires];
        if (!ids.length) return;

        // ✅ Un seul aller-retour réseau pour tous les destinataires (avant :
        // une requête par destinataire dans une boucle séquentielle — pour
        // une annonce à 49 élèves, ça faisait 49 allers-retours vers Supabase
        // l'un après l'autre, monopolisant le pool de connexions limité et
        // provoquant des timeouts en cascade sur les autres requêtes en
        // attente pendant ce temps).
        await db.query(`
            INSERT INTO gestion.notifications (id_user, type, titre, contenu, lien, est_lu, lue)
            SELECT unnest($1::uuid[]), $2, $3, $4, $5, false, false
        `, [ids, type, titre || '', contenu || '', lien]);

        // Envoyer via Socket.IO si disponible (temps réel)
        try {
            const { getIO } = require('../server');
            const io = getIO ? getIO() : null;
            if (io) {
                for (const id_user of ids) {
                    io.to(`user_${id_user}`).emit('nouvelle_notification', {
                        type, titre, contenu, lien,
                        created_at: new Date().toISOString()
                    });
                }
            }
        } catch (e) { /* Socket.IO optionnel */ }

        // Envoyer en push mobile (Firebase) si des tokens sont enregistrés —
        // ne bloque jamais la notification in-app si Firebase est absent/échoue.
        if (firebaseAdmin.isEnabled()) {
            try {
                const tokRes = await db.query(
                    `SELECT token FROM authentification.fcm_tokens WHERE id_user = ANY($1::uuid[])`,
                    [ids]
                );
                const tokens = tokRes.rows.map(r => r.token);
                if (tokens.length) {
                    const { invalides } = await firebaseAdmin.sendPush(tokens, { title: titre, body: contenu, data: { type, lien: lien || '' } });
                    if (invalides.length) {
                        await db.query(`DELETE FROM authentification.fcm_tokens WHERE token = ANY($1::text[])`, [invalides]);
                    }
                }
            } catch (e) { /* push optionnel */ }
        }

        return true;
    } catch (err) {
        console.error('sendNotification error:', err.message);
        return false;
    }
};

// ── Récupérer les notifications non lues d'un utilisateur ──
exports.getUnreadNotifications = async (userId) => {
    try {
        const r = await db.query(`
            SELECT id_notification, type, titre, contenu, lien,
                   COALESCE(est_lu, lue, false) AS lue,
                   created_at
            FROM gestion.notifications
            WHERE id_user = $1 AND COALESCE(est_lu, lue, false) = false
            ORDER BY created_at DESC
            LIMIT 50
        `, [userId]);
        return r.rows;
    } catch (err) {
        console.error('getUnreadNotifications error:', err.message);
        return [];
    }
};

// ── Récupérer toutes les notifications (lues + non lues) ──
exports.getNotifications = async (userId, limit = 50, offset = 0) => {
    try {
        const r = await db.query(`
            SELECT id_notification, type, titre, contenu, lien,
                   COALESCE(est_lu, lue, false) AS lue,
                   created_at
            FROM gestion.notifications
            WHERE id_user = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);
        return r.rows;
    } catch (err) {
        console.error('getNotifications error:', err.message);
        return [];
    }
};

// ── Compter les notifications non lues ──
exports.getUnreadCount = async (userId) => {
    try {
        const r = await db.query(`
            SELECT COUNT(*) AS count
            FROM gestion.notifications
            WHERE id_user = $1 AND COALESCE(est_lu, lue, false) = false
        `, [userId]);
        return parseInt(r.rows[0]?.count || 0);
    } catch (err) {
        console.error('getUnreadCount error:', err.message);
        return 0;
    }
};

// ── Marquer une notification comme lue ──
exports.markNotificationAsRead = async (notifId, userId) => {
    try {
        const r = await db.query(`
            UPDATE gestion.notifications
            SET est_lu = true, lue = true
            WHERE id_notification = $1 AND id_user = $2
            RETURNING id_notification
        `, [notifId, userId]);
        return r.rows.length > 0;
    } catch (err) {
        console.error('markNotificationAsRead error:', err.message);
        return false;
    }
};

// ── Marquer toutes les notifications comme lues ──
exports.markAllNotificationsAsRead = async (userId) => {
    try {
        await db.query(`
            UPDATE gestion.notifications
            SET est_lu = true, lue = true
            WHERE id_user = $1
        `, [userId]);
        return true;
    } catch (err) {
        console.error('markAllNotificationsAsRead error:', err.message);
        return false;
    }
};

// ── Supprimer une notification ──
exports.deleteNotification = async (notifId, userId) => {
    try {
        const r = await db.query(`
            DELETE FROM gestion.notifications
            WHERE id_notification = $1 AND id_user = $2
            RETURNING id_notification
        `, [notifId, userId]);
        return r.rows.length > 0;
    } catch (err) {
        console.error('deleteNotification error:', err.message);
        return false;
    }
};
