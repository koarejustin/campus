// ================================================================
// ROUTES DES NOTIFICATIONS
// ================================================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const notificationController = require('../controller/notificationController');

router.use(authMiddleware);

router.get('/unread', notificationController.getUnreadNotifications);
router.get('/', notificationController.getNotifications);
router.get('/count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;