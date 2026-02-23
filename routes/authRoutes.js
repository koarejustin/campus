const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const authGuard = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/me', authGuard, (req, res) => {
    res.json({
        message: "Bienvenue sur votre profil sécurisé",
        user: req.user
    });
});

module.exports = router;