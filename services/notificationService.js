// ================================================================
// CAMPUS NUMÉRIQUE FASO — services/notificationService.js
// ================================================================
const db = require('../config/db');

// S'assurer que la table a les bonnes colonnes (migration auto)
async function ensureColumns() {
    try {
        await db.query(`ALTER TABLE gestion.notifications ADD COLUMN IF NOT EXISTS titre VARCHAR(255)`);
        await db.query(`ALTER TABLE gestion.notifications ADD COLUMN IF NOT EXISTS lien TEXT`);
        await db.query(`ALTER TABLE gestion.notifications ADD COLUMN IF NOT EXISTS est_lu BOOLEAN NOT NULL DEFAULT false`);
        // Compatibilité : si la colonne s'appelle "lue" au lieu de "est_lu"
        await db.query(`ALTER TABLE gestion.notifications ADD COLUMN IF NOT EXISTS lue BOOLEAN NOT NULL DEFAULT false`);
    } catch (e) {
        // Silencieux
    }
}
ensureColumns().catch(() => {});

// ── Envoyer une notification à un ou plusieurs utilisateurs ──
// destinataires : UUID string OU tableau de UUID
exports.sendNotification = async (destinataires, type, titre, contenu, lien = null) => {
    try {
        const ids = Array.isArray(destinataires) ? destinataires : [destinataires];
        if (!ids.length) return;

        // Insérer en batch
        for (const id_user of ids) {
            await db.query(`
                INSERT INTO gestion.notifications (id_user, type, titre, contenu, lien, est_lu, lue)
                VALUES ($1, $2, $3, $4, $5, false, false)
            `, [id_user, type, titre || '', contenu || '', lien]);
        }

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
