const express = require('express');
const router = express.Router();
const ctrl = require('../controller/adminController');
const auth = require('../middleware/authMiddleware');
const db = require('../config/db');

// ── Stats dashboard ──
router.get('/stats', auth, ctrl.getStats);

// ── Élèves ──
router.get('/eleves', auth, ctrl.getElevesDir);
router.get('/eleve/:id', auth, ctrl.getEleveDetail);
router.post('/eleves', auth, ctrl.createEleve);

// ── Corps enseignant ──
router.get('/corps', auth, ctrl.getProfesseurs);
router.get('/professeurs', auth, ctrl.getProfesseurs);
router.post('/professeurs', auth, ctrl.createProfesseur);

// ── Cahiers de texte ──
router.get('/cahiers', auth, ctrl.getCahiersTexte);
router.get('/cahiers-texte', auth, ctrl.getCahiersTexte);
router.get('/cahier-texte/:prof_id', auth, ctrl.getCahierProf);

// ── Bulletins & Signatures ──
router.get('/bulletins', auth, ctrl.getBulletins);

// ── Agenda ──
router.get('/agenda', auth, ctrl.getAgenda);
router.post('/agenda', auth, ctrl.createAgenda);

// ── Message vers profs ──
router.post('/message-prof', auth, ctrl.messageProf);

// ── Cotisations ──
router.get('/cotisations', auth, ctrl.getCotisations);
router.post('/paiement', auth, ctrl.savePaiement);

// ── Compositions et examens ──
router.get('/compositions', auth, ctrl.getCompositions);
router.post('/compositions', auth, ctrl.createComposition);
router.put('/compositions/:id', auth, ctrl.updateComposition);
router.delete('/compositions/:id', auth, ctrl.deleteComposition);

// ── Élections scolaires ──
router.get('/elections', auth, ctrl.getElections);
router.post('/elections', auth, ctrl.setElection);
router.delete('/elections', auth, ctrl.removeElection);
// Récupérer l'image d'un espace spécifique
router.get('/espace-image/:espace', async (req, res) => {
    try {
        const { espace } = req.params;
        const result = await db.query(
            `SELECT url_image, type_image, titre 
             FROM gestion.images_espaces 
             WHERE espace = $1 AND est_active = true 
             ORDER BY ordre ASC 
             LIMIT 1`,
            [espace]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, image: result.rows[0] });
        } else {
            res.json({ success: true, image: null });
        }
    } catch (error) {
        console.error('Erreur récupération image espace:', error);
        res.status(500).json({ success: false });
    }
});
// ============================================================
// ROUTE POUR RÉCUPÉRER LA CONFIGURATION (nom école, logo)
// ============================================================
router.get('/config', async (req, res) => {
    try {
        const result = await db.query('SELECT nom_etablissement, slogan, logo_url FROM gestion.configuration LIMIT 1');
        if (result.rows.length > 0) {
            res.json({ success: true, config: result.rows[0] });
        } else {
            res.json({ success: true, config: { nom_etablissement: 'Saint Joseph', slogan: '' } });
        }
    } catch (error) {
        console.error('Erreur récupération config:', error);
        res.status(500).json({ success: false });
    }
});
module.exports = router;
