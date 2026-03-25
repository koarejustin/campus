// ================================================================
// SERVICE DE NOTIFICATIONS - VERSION FINALE
// ================================================================

const db = require('../config/db');

async function sendNotification(utilisateursIds, type, titre, contenu, lien = null) {
    if (!utilisateursIds || utilisateursIds.length === 0) return false;

    try {
        const values = [];
        const placeholders = [];

        for (let i = 0; i < utilisateursIds.length; i++) {
            const idx = i * 7;
            placeholders.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7})`);
            values.push(
                utilisateursIds[i],
                type,
                titre,
                contenu,
                lien,
                false,
                new Date()
            );
        }

        await db.query(`
            INSERT INTO gestion.notifications 
            (id_user, type, titre, contenu, lien, lue, created_at)
            VALUES ${placeholders.join(',')}
        `, values);

        const io = require('../server').getIO();
        if (io) {
            for (const id of utilisateursIds) {
                io.to(`user-${id}`).emit('new-notification', {
                    type, titre, contenu, lien, created_at: new Date()
                });
            }
        }

        console.log(`✅ Notification envoyée à ${utilisateursIds.length} utilisateur(s)`);
        return true;

    } catch (err) {
        console.error('Erreur envoi notification:', err.message);
        return false;
    }
}

async function getUnreadNotifications(userId) {
    try {
        const result = await db.query(`
            SELECT id_notification, type, titre, contenu, lien, created_at
            FROM gestion.notifications
            WHERE id_user = $1 AND lue = false
            ORDER BY created_at DESC
            LIMIT 50
        `, [userId]);
        return result.rows;
    } catch (err) {
        console.error('Erreur récupération notifications:', err.message);
        return [];
    }
}

async function getNotifications(userId, limit = 50, offset = 0) {
    try {
        const result = await db.query(`
            SELECT id_notification, type, titre, contenu, lien, lue, created_at
            FROM gestion.notifications
            WHERE id_user = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);
        return result.rows;
    } catch (err) {
        console.error('Erreur récupération notifications:', err.message);
        return [];
    }
}

async function markNotificationAsRead(notificationId, userId) {
    try {
        const result = await db.query(`
            UPDATE gestion.notifications
            SET lue = true
            WHERE id_notification = $1 AND id_user = $2
            RETURNING id_notification
        `, [notificationId, userId]);
        return result.rows.length > 0;
    } catch (err) {
        console.error('Erreur marquage notification:', err.message);
        return false;
    }
}

async function markAllNotificationsAsRead(userId) {
    try {
        await db.query(`
            UPDATE gestion.notifications
            SET lue = true
            WHERE id_user = $1 AND lue = false
        `, [userId]);
        return true;
    } catch (err) {
        console.error('Erreur marquage toutes notifications:', err.message);
        return false;
    }
}

async function getUnreadCount(userId) {
    try {
        const result = await db.query(`
            SELECT COUNT(*) as count
            FROM gestion.notifications
            WHERE id_user = $1 AND lue = false
        `, [userId]);
        return parseInt(result.rows[0].count);
    } catch (err) {
        console.error('Erreur comptage notifications:', err.message);
        return 0;
    }
}

async function deleteNotification(notificationId, userId) {
    try {
        const result = await db.query(`
            DELETE FROM gestion.notifications
            WHERE id_notification = $1 AND id_user = $2
            RETURNING id_notification
        `, [notificationId, userId]);
        return result.rows.length > 0;
    } catch (err) {
        console.error('Erreur suppression notification:', err.message);
        return false;
    }
}

module.exports = {
    sendNotification,
    getUnreadNotifications,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadCount,
    deleteNotification
};