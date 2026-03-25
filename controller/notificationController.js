// ================================================================
// CONTROLLER DES NOTIFICATIONS
// ================================================================

const notificationService = require('../services/notificationService');

exports.getUnreadNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await notificationService.getUnreadNotifications(userId);
        const count = await notificationService.getUnreadCount(userId);

        res.json({
            success: true,
            count,
            notifications
        });
    } catch (err) {
        console.error('Erreur getUnreadNotifications:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const notifications = await notificationService.getNotifications(userId, limit, offset);
        const unreadCount = await notificationService.getUnreadCount(userId);

        res.json({
            success: true,
            unreadCount,
            notifications
        });
    } catch (err) {
        console.error('Erreur getNotifications:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const success = await notificationService.markNotificationAsRead(id, userId);

        if (success) {
            res.json({ success: true, message: 'Notification marquée comme lue' });
        } else {
            res.status(404).json({ success: false, message: 'Notification non trouvée' });
        }
    } catch (err) {
        console.error('Erreur markAsRead:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await notificationService.markAllNotificationsAsRead(userId);

        res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
    } catch (err) {
        console.error('Erreur markAllAsRead:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await notificationService.getUnreadCount(userId);

        res.json({ success: true, count });
    } catch (err) {
        console.error('Erreur getUnreadCount:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const success = await notificationService.deleteNotification(id, userId);

        if (success) {
            res.json({ success: true, message: 'Notification supprimée' });
        } else {
            res.status(404).json({ success: false, message: 'Notification non trouvée' });
        }
    } catch (err) {
        console.error('Erreur deleteNotification:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};