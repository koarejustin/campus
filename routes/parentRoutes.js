const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const parentController = require('../controller/parentController');

// Routes parents
router.get('/mes-enfants', authMiddleware, (req, res, next) => {
    if (typeof parentController.getMesEnfants !== 'function') {
        return res.status(500).json({ error: 'getMesEnfants is not a function' });
    }
    parentController.getMesEnfants(req, res, next);
});

router.get('/bulletin-enfant', authMiddleware, (req, res, next) => {
    if (typeof parentController.getBulletinEnfant !== 'function') {
        return res.status(500).json({ error: 'getBulletinEnfant is not a function' });
    }
    parentController.getBulletinEnfant(req, res, next);
});

router.get('/convocations-enfant', authMiddleware, (req, res, next) => {
    if (typeof parentController.getConvocationsEnfant !== 'function') {
        return res.status(500).json({ error: 'getConvocationsEnfant is not a function' });
    }
    parentController.getConvocationsEnfant(req, res, next);
});

router.get('/absences-enfant', authMiddleware, (req, res, next) => {
    if (typeof parentController.getAbsencesEnfant !== 'function') {
        return res.status(500).json({ error: 'getAbsencesEnfant is not a function' });
    }
    parentController.getAbsencesEnfant(req, res, next);
});

router.get('/annonces', authMiddleware, (req, res, next) => {
    if (typeof parentController.getAnnonces !== 'function') {
        return res.status(500).json({ error: 'getAnnonces is not a function' });
    }
    parentController.getAnnonces(req, res, next);
});

router.get('/cotisations', authMiddleware, (req, res, next) => {
    if (typeof parentController.getCotisations !== 'function') {
        return res.status(500).json({ error: 'getCotisations is not a function' });
    }
    parentController.getCotisations(req, res, next);
});

router.get('/profil', authMiddleware, (req, res, next) => {
    if (typeof parentController.getProfilParent !== 'function') {
        return res.status(500).json({ error: 'getProfilParent is not a function' });
    }
    parentController.getProfilParent(req, res, next);
});

router.put('/profil', authMiddleware, (req, res, next) => {
    if (typeof parentController.updateProfilParent !== 'function') {
        return res.status(500).json({ error: 'updateProfilParent is not a function' });
    }
    parentController.updateProfilParent(req, res, next);
});

router.get('/orientation-enfant', authMiddleware, (req, res, next) => {
    if (typeof parentController.getOrientationEnfant !== 'function') {
        return res.status(500).json({ error: 'getOrientationEnfant is not a function' });
    }
    parentController.getOrientationEnfant(req, res, next);
});

router.post('/orientation-avis', authMiddleware, (req, res, next) => {
    if (typeof parentController.addOrientationAvis !== 'function') {
        return res.status(500).json({ error: 'addOrientationAvis is not a function' });
    }
    parentController.addOrientationAvis(req, res, next);
});

module.exports = router;