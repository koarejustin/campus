const db = require('../config/db');

/**
 * ESPACE ÉLÈVE - Contrôleur pour toutes les fonctionnalités
 * L'élève peut :
 * - Consulter son bulletin et ses notes
 * - Voir les convocations qui le concernent
 * - Regarder ses absences justifiées/non justifiées
 * - Consulter les annonces officielles
 * - Voir les activités/événements scolaires
 * - Accéder à des ressources pédagogiques
 */

// ========== BULLETIN & NOTES ==========
exports.getBulletin = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const trimestre = req.query.trimestre || 1;

        if (!eleveId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        // Récupérer le bulletin de l'élève
        const query = `
            SELECT 
                p.*, 
                c.nom, 
                c.prenom,
                c.code_unique,
                (SELECT AVG(note) FROM pedagogie.notes_evaluations 
                 WHERE id_eleve=$1 AND trimestre=$2) as moyenne_generale
            FROM vie_scolaire.profils_eleves p
            JOIN authentification.comptes c ON p.id_user = c.id_user
            WHERE p.id_user = $1
        `;

        const result = await db.query(query, [eleveId, trimestre]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Profil élève non trouvé' });
        }

        const eleve = result.rows[0];

        // Récupérer les notes par matière
        const notesQuery = `
            SELECT 
                COALESCE(m.nom_matiere, 'Matière') as matiere,
                AVG(n.note) as note_moyenne,
                COUNT(n.id_evaluation) as nb_evaluations,
                MAX(n.note) as meilleure_note,
                MIN(n.note) as plus_basse_note
            FROM pedagogie.notes_evaluations n
            LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
            WHERE n.id_eleve = $1 AND n.trimestre = $2
            GROUP BY m.nom_matiere
            ORDER BY note_moyenne DESC
        `;

        const notesResult = await db.query(notesQuery, [eleveId, trimestre]);

        res.json({
            success: true,
            eleve: {
                nom_complet: `${eleve.prenom} ${eleve.nom}`,
                code_unique: eleve.code_unique,
                classe: eleve.classe_actuelle,
                moyenne_generale: Math.round(eleve.moyenne_generale * 100) / 100
            },
            notes_par_matiere: notesResult.rows || [],
            trimestre: trimestre
        });

    } catch (error) {
        console.error('Erreur récupération bulletin:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== CONVOCATIONS PRIVÉES ==========
exports.getMesConvocations = async (req, res) => {
    try {
        const eleveId = req.user?.id;

        if (!eleveId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        // Les convocations ne sont visibles QUE par l'élève lui-même
        const query = `
            SELECT 
                id_convocation,
                sujet,
                description,
                date_convocation,
                motif,
                creee_par,
                date_creation,
                CASE 
                    WHEN date_convocation < NOW() THEN 'PASSEE'
                    WHEN date_convocation <= NOW() + INTERVAL '3 DAYS' THEN 'URGENTE'
                    ELSE 'PROCHAINE'
                END as statut
            FROM gestion.convocations
            WHERE id_eleve = $1
            ORDER BY date_convocation DESC
        `;

        const result = await db.query(query, [eleveId]);

        res.json({
            success: true,
            count: result.rows.length,
            convocations: result.rows || [],
            message: result.rows.length === 0 ? 'Aucune convocation pour vous' : ''
        });

    } catch (error) {
        console.error('Erreur récupération convocations:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== ABSENCES JUSTIFIÉES ==========
exports.getMesAbsences = async (req, res) => {
    try {
        const eleveId = req.user?.id;

        if (!eleveId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        const query = `
            SELECT 
                id_absence,
                date_absence,
                justifiee,
                raison_absence,
                enregistre_par,
                created_at,
                CASE 
                    WHEN justifiee = true THEN 'JUSTIFIÉE'
                    WHEN justifiee = false THEN 'NON JUSTIFIÉE'
                    ELSE 'EN ATTENTE'
                END as statut
            FROM gestion.absences
            WHERE id_eleve = $1
            ORDER BY date_absence DESC
        `;

        const result = await db.query(query, [eleveId]);

        const absencesNonJustifiees = result.rows.filter(a => a.justifiee === false).length;
        const absencesJustifiees = result.rows.filter(a => a.justifiee === true).length;

        res.json({
            success: true,
            count_total: result.rows.length,
            absences_justifiees: absencesJustifiees,
            absences_non_justifiees: absencesNonJustifiees,
            absences: result.rows || []
        });

    } catch (error) {
        console.error('Erreur récupération absences:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== ANNONCES OFFICIELLES ==========
exports.getAnnonces = async (req, res) => {
    try {
        const query = `
            SELECT 
                id_annonce,
                titre,
                corps_annonce as contenu,
                priorite,
                date_publication,
                CASE 
                    WHEN priorite = 'Urgente' THEN '🔴 URGENT'
                    WHEN priorite = 'Info' THEN '🔵 INFO'
                    ELSE '⚪ NORMAL'
                END as icone_priorite
            FROM vie_scolaire.annonces_officielles
            ORDER BY date_publication DESC
            LIMIT 20
        `;

        const result = await db.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            annonces: result.rows || []
        });

    } catch (error) {
        console.error('Erreur récupération annonces:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== ACTIVITÉS & ÉVÉNEMENTS ==========
exports.getActivites = async (req, res) => {
    try {
        const query = `
            SELECT 
                id_activite,
                titre,
                date_debut,
                date_fin,
                type_activite as categorie,
                description,
                lieu,
                CASE 
                    WHEN date_fin < NOW() THEN 'TERMINÉE'
                    WHEN date_debut <= NOW() AND date_fin >= NOW() THEN 'EN COURS'
                    WHEN date_debut > NOW() THEN 'À VENIR'
                END as statut,
                EXTRACT(EPOCH FROM (date_fin - date_debut)) / 3600 as duree_heures
            FROM gestion.activities
            ORDER BY date_debut ASC
            LIMIT 30
        `;

        const result = await db.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            activites: result.rows || []
        });

    } catch (error) {
        console.error('Erreur récupération activités:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== RESSOURCES PÉDAGOGIQUES ==========
exports.getRessources = async (req, res) => {
    try {
        const eleveId = req.user?.id;

        if (!eleveId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        // Simule des ressources pédagogiques (cours, exercices, documents)
        const ressources = [
            {
                id: 1,
                titre: "Cours de Français - Grammaire",
                type: "COURS_VIDEO",
                matiere: "Français",
                duree_minutes: 45,
                date_ajout: new Date(),
                url: "/ressources/francais-grammaire-1.mp4"
            },
            {
                id: 2,
                titre: "Exercices Mathématiques - Algèbre",
                type: "EXERCICES",
                matiere: "Mathématiques",
                nb_exercices: 15,
                date_ajout: new Date(),
                url: "/ressources/maths-algebre-ex.pdf"
            },
            {
                id: 3,
                titre: "Présentation Histoire - Période Coloniale",
                type: "DOCUMENT",
                matiere: "Histoire",
                nb_pages: 25,
                date_ajout: new Date(),
                url: "/ressources/histoire-colonial.pdf"
            }
        ];

        res.json({
            success: true,
            count: ressources.length,
            ressources: ressources
        });

    } catch (error) {
        console.error('Erreur récupération ressources:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== HORAIRE DE L'ÉLÈVE ==========
exports.getHoraire = async (req, res) => {
    try {
        const eleveId = req.user?.id;

        if (!eleveId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        // Récupérer la classe de l'élève
        const classeQuery = `SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user = $1`;
        const classeResult = await db.query(classeQuery, [eleveId]);

        if (classeResult.rows.length === 0) {
            return res.status(404).json({ message: 'Classe non trouvée' });
        }

        const classe = classeResult.rows[0].classe_actuelle;

        // Horaire de type semaine
        const horaire = {
            classe: classe,
            semaine: [
                {
                    jour: "Lundi",
                    cours: [
                        { heure: "08:00-09:00", matiere: "Français", salle: "101", prof: "M. Diallo" },
                        { heure: "09:00-10:00", matiere: "Mathématiques", salle: "102", prof: "Mme Coulibaly" },
                        { heure: "10:00-10:15", matiere: "PAUSE", salle: "Cour", prof: "" },
                        { heure: "10:15-11:15", matiere: "Anglais", salle: "103", prof: "Mr Traore" }
                    ]
                },
                {
                    jour: "Mardi",
                    cours: [
                        { heure: "08:00-09:00", matiere: "Histoire", salle: "104", prof: "Mme Kone" },
                        { heure: "09:00-10:00", matiere: "Géographie", salle: "105", prof: "M. Toure" }
                    ]
                }
            ]
        };

        res.json({
            success: true,
            horaire: horaire
        });

    } catch (error) {
        console.error('Erreur récupération horaire:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== STATISTIQUES ACADÉMIQUES ==========
exports.getStatistiques = async (req, res) => {
    try {
        const eleveId = req.user?.id;

        if (!eleveId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        const statsQuery = `
            SELECT 
                AVG(note) as moyenne_generale,
                MAX(note) as meilleure_note,
                MIN(note) as pire_note,
                COUNT(*) as nb_evaluations
            FROM pedagogie.notes_evaluations
            WHERE id_eleve = $1
        `;

        const statsResult = await db.query(statsQuery, [eleveId]);
        const stats = statsResult.rows[0] || {};

        // Absences
        const absenceQuery = `
            SELECT COUNT(*) as total FROM gestion.absences WHERE id_eleve = $1 AND justifiee = false
        `;
        const absenceResult = await db.query(absenceQuery, [eleveId]);

        res.json({
            success: true,
            statistiques: {
                academique: {
                    moyenne: Math.round((stats.moyenne_generale || 0) * 100) / 100,
                    meilleure_note: Math.round((stats.meilleure_note || 0) * 100) / 100,
                    pire_note: Math.round((stats.pire_note || 0) * 100) / 100,
                    evaluations_totales: stats.nb_evaluations || 0
                },
                discipline: {
                    absences_non_justifiees: parseInt(absenceResult.rows[0]?.total || 0)
                }
            }
        });

    } catch (error) {
        console.error('Erreur récupération statistiques:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
