const express = require('express');
const router = express.Router();
const ctrl = require('../controller/adminController');
const auth = require('../middleware/authMiddleware');
const { ensureRoleIn } = require('../middleware/authMiddleware');
const db = require('../config/db');
const multer = require('multer');
const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ✅ SÉCURITÉ : deux niveaux d'accès désormais appliqués côté serveur (pas
// seulement caché côté interface) — le partage Direction/Surveillant ne
// couvre que ce qui relève réellement de la surveillance (élèves, absences,
// emploi du temps, tableau de bord). Tout le reste (corps enseignant,
// parents, alumni, signatures, compositions, élections, cotisations,
// communication) reste réservé à la Direction seule.
const dirOuSurv = ensureRoleIn(['DIRECTION', 'SURVEILLANT']);
const dirSeule = ensureRoleIn(['DIRECTION']);

// ── Stats dashboard ──
router.get('/stats', auth, dirOuSurv, ctrl.getStats);

// ── Élèves ──
router.get('/eleves', auth, dirOuSurv, ctrl.getElevesDir);
router.get('/eleve/:id', auth, dirOuSurv, ctrl.getEleveDetail);
router.post('/eleves', auth, dirSeule, ctrl.createEleve);
router.post('/eleves/import-excel', auth, dirSeule, uploadExcel.single('fichier'), ctrl.importElevesExcel);

// ── Corps enseignant ──
router.get('/corps', auth, dirSeule, ctrl.getProfesseurs);
router.get('/professeurs', auth, dirSeule, ctrl.getProfesseurs);
router.post('/professeurs', auth, dirSeule, ctrl.createProfesseur);
router.post('/surveillants', auth, dirSeule, ctrl.createSurveillant);
router.post('/alumni', auth, dirSeule, ctrl.createAlumni);
router.post('/parents', auth, dirSeule, ctrl.createParent);

// ── Parents ──
router.get('/parents', auth, dirSeule, ctrl.getParents);

// ── Alumni (anciens élèves) ──
router.get('/alumni', auth, dirSeule, ctrl.getAlumni);

// ── Absences ──
router.delete('/absences/:id', auth, dirOuSurv, ctrl.deleteAbsence);

// ── Emploi du temps (par classe) — consultation partagée Direction/Surveillant,
// gestion (créer/modifier/supprimer) réservée à la Direction ──
router.get('/emploi-du-temps', auth, dirOuSurv, ctrl.getEmploiDuTemps);
router.post('/emploi-du-temps', auth, dirSeule, ctrl.createSeanceEdt);
router.put('/emploi-du-temps/:id', auth, dirSeule, ctrl.updateSeanceEdt);
router.delete('/emploi-du-temps/:id', auth, dirSeule, ctrl.deleteSeanceEdt);
router.get('/emploi-du-temps/modele', auth, dirSeule, ctrl.getEmploiDuTempsTemplate);
router.post('/emploi-du-temps/import-excel', auth, dirSeule, uploadExcel.single('fichier'), ctrl.importEmploiDuTempsExcel);

// ── Cahiers de texte ──
router.get('/cahiers', auth, dirOuSurv, ctrl.getCahiersTexte);
router.get('/cahiers-texte', auth, dirOuSurv, ctrl.getCahiersTexte);
router.get('/cahier-texte/:prof_id', auth, dirOuSurv, ctrl.getCahierProf);

// ── Bulletins & Signatures (Direction seule — responsabilité officielle) ──
router.get('/bulletins', auth, dirSeule, ctrl.getBulletins);
router.post('/bulletins/signer', auth, dirSeule, ctrl.signerBulletin);
router.post('/bulletins/signer-lot', auth, dirSeule, ctrl.signerBulletinsLot);

// ── Agenda ──
router.get('/agenda', auth, dirOuSurv, ctrl.getAgenda);
router.post('/agenda', auth, dirOuSurv, ctrl.createAgenda);

// ── Message vers profs (Direction seule) ──
router.post('/message-prof', auth, dirSeule, ctrl.messageProf);

// ── Cotisations (Direction seule — comptabilité) ──
router.get('/cotisations', auth, dirSeule, ctrl.getCotisations);
router.post('/paiement', auth, dirSeule, ctrl.savePaiement);
router.put('/cotisations/:id_cotisation/statut', auth, dirSeule, ctrl.updateStatutCotisation);

// ── Compositions et examens (Direction seule) ──
router.get('/compositions', auth, dirSeule, ctrl.getCompositions);
router.post('/compositions', auth, dirSeule, ctrl.createComposition);
router.put('/compositions/:id', auth, dirSeule, ctrl.updateComposition);
router.delete('/compositions/:id', auth, dirSeule, ctrl.deleteComposition);

// ── Élections scolaires (Direction seule) ──
router.get('/elections', auth, dirSeule, ctrl.getElections);
router.post('/elections', auth, dirSeule, ctrl.setElection);
router.delete('/elections', auth, dirSeule, ctrl.removeElection);

// Récupérer l'image d'un espace spécifique
router.get('/espace-image/:espace', auth, async (req, res) => {
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
// ✅ SÉCURITÉ : auth ajouté — données non exposées sans token
// Exception : login.html et classes.html ont besoin de /config sans token
// => On crée une route publique séparée /config-public pour ces pages
// ============================================================
router.get('/config-public', async (req, res) => {
    try {
        const result = await db.query('SELECT nom_etablissement, logo_url, adresse FROM gestion.configuration LIMIT 1');
        if (result.rows.length > 0) {
            res.json({ success: true, config: result.rows[0] });
        } else {
            res.json({ success: true, config: { nom_etablissement: 'Saint Joseph' } });
        }
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

router.get('/config', auth, async (req, res) => {
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
