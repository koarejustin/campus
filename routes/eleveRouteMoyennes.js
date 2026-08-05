/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  ROUTES MOYENNES ET COURBE ANALYTIQUE - Express
 *  
 *  À ajouter à routes/eleveRoutes.js
 *  Endpoints :
 *  - GET  /api/eleves/moyennes-courbe/:trimestre
 *  - POST /api/eleves/courbe-data
 *  - GET  /api/eleves/historique-moyennes
 *  - POST /api/eleves/predictions-notes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const axios = require('axios');
const db = require('../config/db');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const io = require('socket.io-client');

// URL de l'API Python FastAPI
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8001';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET : Récupérer moyennes et courbe analytique pour un trimestre
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/moyennes-courbe/:trimestre', authMiddleware, async (req, res) => {
    try {
        const eleveId = req.user.id;
        const trimestre = parseInt(req.params.trimestre) || 1;

        // 1. Récupérer profil de l'élève
        const eleveRes = await db.query(`
            SELECT pe.classe_actuelle, pe.serie, c.nom, c.prenom
            FROM vie_scolaire.profils_eleves pe
            JOIN authentification.comptes c ON c.id_user = pe.id_user
            WHERE pe.id_user = $1
        `, [eleveId]);

        if (!eleveRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Profil introuvable' });
        }

        const { classe_actuelle, serie } = eleveRes.rows[0];

        // 2. Récupérer notes pour le trimestre demandé
        const notesRes = await db.query(`
            SELECT
                n.note,
                n.trimestre,
                COALESCE(n.type_evaluation, 'DEVOIR') AS type_evaluation,
                n.date_evaluation::text AS date_evaluation,
                m.libelle_matiere AS matiere,
                COALESCE(m.coefficient, 1) AS coefficient
            FROM pedagogie.notes_evaluations n
            LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
            WHERE n.id_eleve = $1
              AND n.trimestre = $2
            ORDER BY n.date_evaluation
        `, [eleveId, trimestre]);

        const notes = notesRes.rows.map(n => ({
            note: parseFloat(n.note),
            matiere: n.matiere,
            type: n.type_evaluation,
            trimestre: n.trimestre,
            date: n.date_evaluation,
            coefficient: n.coefficient
        }));

        if (notes.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Aucune note pour ce trimestre',
                data: {
                    classe: classe_actuelle,
                    serie: serie || 'GENERAL',
                    trimestre: trimestre,
                    notes: [],
                    moyenne_generale: 0,
                    evolution: {},
                    courbe: []
                }
            });
        }

        // 3. Appel à l'API Python FastAPI
        const apiResponse = await axios.post(
            `${PYTHON_API_URL}/api/moyennes/courbe-interactive`,
            {
                id_eleve: eleveId,
                classe: classe_actuelle,
                serie: serie || 'GENERAL',
                notes: notes.map(n => ({
                    note: n.note,
                    matiere: n.matiere,
                    type: n.type,
                    trimestre: n.trimestre,
                    date: n.date
                }))
            }
        );

        // 4. Sauvegarder en cache (optionnel)
        await db.query(`
            INSERT INTO pedagogie.historique_moyennes 
            (id_eleve, classe, serie, trimestre, annee_scolaire, moyenne_generale, moyenne_par_matiere, date_calcul)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id_eleve, classe, serie, trimestre, annee_scolaire) 
            DO UPDATE SET 
                moyenne_generale = $6,
                moyenne_par_matiere = $7,
                date_calcul = NOW()
        `, [
            eleveId,
            classe_actuelle,
            serie || 'GENERAL',
            trimestre,
            '2025-2026',
            apiResponse.data.moyenne_generale,
            JSON.stringify(apiResponse.data.moyennes_par_matiere)
        ]).catch(err => console.log('Cache historique skipped:', err.message));

        // 5. Récupérer les convocations liées
        const convocationsRes = await db.query(`
            SELECT 
                c.id_convocation,
                c.motif,
                c.description,
                c.date_convocation,
                c.statut,
                c.accusé_reception_date
            FROM gestion.convocations c
            WHERE c.id_eleve = $1
              AND c.date_convocation >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY c.date_convocation DESC
            LIMIT 5
        `, [eleveId]);

        res.status(200).json({
            success: true,
            data: {
                ...apiResponse.data,
                classe: classe_actuelle,
                serie: serie || 'GENERAL',
                trimestre: trimestre,
                convocations: convocationsRes.rows || []
            }
        });

    } catch (error) {
        console.error('Erreur moyennes-courbe:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. POST : Recalculer courbe interactive (temps réel)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/courbe-data', authMiddleware, async (req, res) => {
    try {
        const eleveId = req.user.id;
        const { trimestre = 1 } = req.body;

        // Récupérer toutes les notes (sans filtre trimestre)
        const notesRes = await db.query(`
            SELECT
                n.note,
                n.trimestre,
                COALESCE(n.type_evaluation, 'DEVOIR') AS type_evaluation,
                n.date_evaluation::text AS date_evaluation,
                m.libelle_matiere AS matiere
            FROM pedagogie.notes_evaluations n
            LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
            WHERE n.id_eleve = $1
            ORDER BY n.date_evaluation DESC
            LIMIT 100
        `, [eleveId]);

        const notes = notesRes.rows.map(n => ({
            note: parseFloat(n.note),
            matiere: n.matiere,
            type: n.type_evaluation,
            trimestre: n.trimestre,
            date: n.date_evaluation
        }));

        // Format pour Chart.js
        const datasets = {};
        notes.forEach(n => {
            if (!datasets[n.matiere]) datasets[n.matiere] = [];
            datasets[n.matiere].push(n.note);
        });

        const courbeData = {
            labels: notes.map((_, i) => `Note ${i + 1}`),
            datasets: Object.entries(datasets).map(([matiere, notesList], idx) => ({
                label: matiere,
                data: notesList,
                borderColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 206, 86)',
                    'rgb(153, 102, 255)'
                ][idx % 5],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.1)',
                    'rgba(255, 99, 132, 0.1)',
                    'rgba(54, 162, 235, 0.1)',
                    'rgba(255, 206, 86, 0.1)',
                    'rgba(153, 102, 255, 0.1)'
                ][idx % 5],
                tension: 0.4,
                fill: false
            }))
        };

        res.json({ success: true, data: courbeData });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET : Historique des moyennes (tous les trimestres)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/historique-moyennes', authMiddleware, async (req, res) => {
    try {
        const eleveId = req.user.id;

        const historique = await db.query(`
            SELECT
                classe,
                serie,
                trimestre,
                annee_scolaire,
                moyenne_generale,
                moyenne_par_matiere,
                date_calcul
            FROM pedagogie.historique_moyennes
            WHERE id_eleve = $1
            ORDER BY annee_scolaire DESC, trimestre DESC
        `, [eleveId]);

        res.json({
            success: true,
            data: historique.rows.map(h => ({
                ...h,
                moyenne_par_matiere: JSON.parse(h.moyenne_par_matiere || '{}')
            }))
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. POST : Calcul prédictif - quelle note pour quelle cible ?
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/predictions-notes', authMiddleware, async (req, res) => {
    try {
        const { cible = 12, prochains_devoirs = 2 } = req.body;
        const eleveId = req.user.id;

        // Récupérer la classe et moyenne actuelle
        const eleveRes = await db.query(`
            SELECT pe.classe_actuelle, pe.serie
            FROM vie_scolaire.profils_eleves pe
            WHERE pe.id_user = $1
        `, [eleveId]);

        if (!eleveRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Profil non trouvé' });
        }

        const { classe_actuelle, serie } = eleveRes.rows[0];

        // Récupérer dernier historique de moyennes
        const historique = await db.query(`
            SELECT moyenne_generale, JSONB_OBJECT_AGG(key, value) as coefs_total
            FROM pedagogie.historique_moyennes h
            LEFT JOIN JSONB_EACH_TEXT(h.moyenne_par_matiere) ON true
            WHERE h.id_eleve = $1
            ORDER BY h.date_calcul DESC
            LIMIT 1
        `, [eleveId]);

        if (!historique.rows.length) {
            return res.status(200).json({
                success: true,
                message: 'Pas de données de moyennes encore',
                data: null
            });
        }

        const { moyenne_generale } = historique.rows[0];
        const somme_coefs = 20; // À adapter selon la classe

        // Appel API Python
        const prediction = await axios.post(
            `${PYTHON_API_URL}/api/moyennes/analyse-predictive`,
            {
                moyenne_actuelle: moyenne_generale,
                somme_coefs: somme_coefs,
                cible: cible,
                prochains_devoirs: prochains_devoirs
            }
        );

        res.json({
            success: true,
            data: prediction.data
        });

    } catch (error) {
        console.error('Erreur predictions:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. WEBSOCKET : Notification temps réel quand une note est ajoutée
// ═══════════════════════════════════════════════════════════════════════════════

// À ajouter au fichier server.js :
// io.on('connection', (socket) => {
//     socket.on('nouvelle-note', async (data) => {
//         // Recalculer moyennes et émettre
//         const moyennes = await recalculer_moyennes(data.id_eleve);
//         io.to(`eleve-${data.id_eleve}`).emit('mise-a-jour-moyennes', moyennes);
//     });
// });

module.exports = router;
