const express = require('express');
const router = express.Router();
const courseController = require('../controller/courseController');
const authGuard = require('../middleware/authMiddleware'); // Ton gardien est ici !

// On utilise authGuard pour que seuls les connectés voient les cours
router.get('/', authGuard, courseController.getAllCourses);

module.exports = router;