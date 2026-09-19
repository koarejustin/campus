const express = require('express');
const router = express.Router();
const ctrl = require('../controller/adminController');
const auth = require('../middleware/authMiddleware');
const { ensureRoleIn } = require('../middleware/authMiddleware');
const db = require('../config/db');
const multer = require('multer');
const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
// ⚠️ "startsWith('image/')" laissait passer image/svg+xml — un SVG peut
// contenir du <script> exécutable, contrairement à un vrai fichier
// image (jpeg/png/webp/gif). Liste explicite plutôt qu'un préfixe.
const IMAGE_MIME_AUTORISES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (IMAGE_MIME_AUTORISES.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Seules les images (JPEG, PNG, WEBP, GIF) sont acceptées'), false);
    }
});

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

// ── Fiches d'identifiants (PDF) ──
router.post('/fiches-identifiants/pdf', auth, dirSeule, ctrl.getFichesIdentifiantsPdf);

// ── Bulletin d'un élève (PDF) ──
router.get('/bulletin-eleve/pdf', auth, dirOuSurv, ctrl.getBulletinElevePdf);

// ── Barème & Notes (coefficients, pondération, seuils de mention) ──
router.get('/coefficients', auth, dirSeule, ctrl.getCoefficients);
router.post('/coefficients', auth, dirSeule, ctrl.addCoefficient);
router.put('/coefficients/:id_coefficient', auth, dirSeule, ctrl.updateCoefficient);
router.delete('/coefficients/:id_coefficient', auth, dirSeule, ctrl.deleteCoefficient);
router.get('/configuration-notes', auth, dirSeule, ctrl.getConfigurationNotes);
router.put('/configuration-notes', auth, dirSeule, ctrl.updateConfigurationNotes);

// ── Passage de classe / année scolaire ──
router.get('/annee-scolaire', auth, dirOuSurv, ctrl.getAnneeScolaire);
router.post('/annee-scolaire/avancer', auth, dirSeule, ctrl.avancerAnneeScolaire);
router.get('/passage/roster', auth, dirSeule, ctrl.getRosterPassage);
router.post('/passage/executer', auth, dirSeule, ctrl.executerPassage);

// ── Réinitialiser le mot de passe d'un compte (tous rôles) ──
router.put('/comptes/:id/reset-password', auth, dirSeule, ctrl.resetMotDePasse);

// ── Zone dangereuse : réinitialisation complète (vide toute la base +
// le stockage, télécharge une archive automatiquement avant) ──
router.post('/reinitialisation-complete', auth, dirSeule, ctrl.reinitialisationComplete);

// ── Élèves ──
router.get('/eleves', auth, dirOuSurv, ctrl.getElevesDir);
router.put('/eleves/:id', auth, dirSeule, ctrl.updateEleve);
router.get('/eleve/:id', auth, dirOuSurv, ctrl.getEleveDetail);
router.post('/eleves', auth, dirSeule, ctrl.createEleve);
router.post('/eleves/import-excel', auth, dirSeule, uploadExcel.single('fichier'), ctrl.importElevesExcel);

// ── Corps enseignant ──
router.get('/corps', auth, dirSeule, ctrl.getProfesseurs);
router.get('/professeurs', auth, dirSeule, ctrl.getProfesseurs);
router.post('/professeurs', auth, dirSeule, ctrl.createProfesseur);
router.post('/professeurs/import-excel', auth, dirSeule, uploadExcel.single('fichier'), ctrl.importProfesseursExcel);
router.put('/professeurs/:id/classes-matieres', auth, dirSeule, ctrl.updateClassesMatieresProf);
router.post('/surveillants', auth, dirSeule, ctrl.createSurveillant);
router.post('/surveillants/import-excel', auth, dirSeule, uploadExcel.single('fichier'), ctrl.importSurveillantsExcel);
router.post('/alumni', auth, dirSeule, ctrl.createAlumni);
router.post('/alumni/import-excel', auth, dirSeule, uploadExcel.single('fichier'), ctrl.importAlumniExcel);
router.post('/parents', auth, dirSeule, ctrl.createParent);
router.post('/parents/import-excel', auth, dirSeule, uploadExcel.single('fichier'), ctrl.importParentsExcel);

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
// Publique (sans auth) : vérification d'un bulletin via son code QR imprimé
router.get('/verifier-bulletin/:code', ctrl.verifierBulletin);

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
        const result = await db.query('SELECT nom_etablissement, logo_url, adresse, annee_scolaire_active FROM gestion.configuration LIMIT 1');
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
        const result = await db.query(`
            SELECT nom_etablissement, slogan, logo_url, adresse, telephone, email_contact,
                   matricule_prefixe_eleve, matricule_prefixe_prof, matricule_prefixe_parent,
                   matricule_prefixe_alumni, matricule_prefixe_surveillant, matricule_prefixe_direction,
                   matricule_annee
            FROM gestion.configuration LIMIT 1
        `);
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

// ── Modifier le nom/logo/coordonnées de l'établissement (Direction seule) ──
router.put('/config', auth, dirSeule, uploadImage.single('logo'), ctrl.updateConfig);

// ── Images des cartes du portail d'accueil (Direction seule) ──
router.get('/images-espaces', auth, dirSeule, ctrl.getImagesEspaces);
router.put('/images-espaces/:espace', auth, dirSeule, uploadImage.single('image'), ctrl.updateImageEspace);

module.exports = router;
