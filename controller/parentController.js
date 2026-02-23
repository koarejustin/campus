const db = require('../config/db');

/**
 * ESPACE PARENT - Contrôleur pour toutes les fonctionnalités
 * Un parent peut :
 * - Consulter le bulletin et les notes de son enfant
 * - Voir les convocations concernant son enfant
 * - Consulter les absences de son enfant
 * - Voir les annonces officielles
 * - Suivre les activités/événements
 * - Consulter les messages de la direction
 * - Gérer les cotisations (APE)
 */

// ========== LIEN PARENT-ENFANT ==========
// D'abord on récupère l'ID enfant depuis la relation parent-enfant
const getEnfantsPourParent = async (parentId) => {
    try {
        const query = `
            SELECT DISTINCT p.id_user as id_enfant
            FROM vie_scolaire.profils_eleves p
            JOIN liaisons_parentales.parent_eleve pe ON p.id_user = pe.id_eleve
            WHERE pe.id_parent = $1
        `;
        const result = await db.query(query, [parentId]);
        return result.rows.map(r => r.id_enfant);
    } catch (error) {
        console.error('Erreur récupération enfants:', error);
        return [];
    }
};

// ========== BULLETIN DE L'ENFANT ==========
exports.getBulletinEnfant = async (req, res) => {
    try {
        const parentId = req.user?.id;
        const enfantId = req.query.enfant_id;
        const trimestre = req.query.trimestre || 1;

        if (!parentId || !enfantId) {
            return res.status(401).json({ message: 'Données manquantes' });
        }

        // Vérifier que le parent a accès à cet enfant
        const enfantsQuery = `
            SELECT id_user FROM vie_scolaire.profils_eleves p
            JOIN liaisons_parentales.parent_eleve pe ON p.id_user = pe.id_eleve
            WHERE pe.id_parent = $1 AND p.id_user = $2
            LIMIT 1
        `;
        const accessCheck = await db.query(enfantsQuery, [parentId, enfantId]);

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        // Récupérer le bulletin
        const bulletinQuery = `
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

        const result = await db.query(bulletinQuery, [enfantId, trimestre]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Profil enfant non trouvé' });
        }

        const eleve = result.rows[0];

        // Notes par matière
        const notesQuery = `
            SELECT 
                COALESCE(m.libelle_matiere, 'Matière') as matiere,
                AVG(n.note) as note_moyenne,
                COUNT(n.id_evaluation) as nb_evaluations
            FROM pedagogie.notes_evaluations n
            LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
            WHERE n.id_eleve = $1 AND n.trimestre = $2
            GROUP BY m.libelle_matiere
            ORDER BY note_moyenne DESC
        `;

        const notesResult = await db.query(notesQuery, [enfantId, trimestre]);

        res.json({
            success: true,
            enfant: {
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

// ========== MES ENFANTS ==========
exports.getMesEnfants = async (req, res) => {
    try {
        const parentId = req.user?.id;

        if (!parentId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        const query = `
            SELECT 
                p.id_user,
                c.code_unique,
                c.nom,
                c.prenom,
                p.classe_actuelle,
                (SELECT AVG(note) FROM pedagogie.notes_evaluations WHERE id_eleve = p.id_user) as moyenne_generale
            FROM vie_scolaire.profils_eleves p
            JOIN liaisons_parentales.parent_eleve pe ON p.id_user = pe.id_eleve
            JOIN authentification.comptes c ON p.id_user = c.id_user
            WHERE pe.id_parent = $1
            ORDER BY c.nom
        `;

        const result = await db.query(query, [parentId]);

        res.json({
            success: true,
            count: result.rows.length,
            enfants: result.rows.map(e => ({
                id_enfant: e.id_user,
                nom_complet: `${e.prenom} ${e.nom}`,
                code_unique: e.code_unique,
                classe: e.classe_actuelle,
                moyenne_generale: e.moyenne_generale ? Math.round(e.moyenne_generale * 100) / 100 : 'N/A'
            })) || []
        });

    } catch (error) {
        console.error('Erreur récupération enfants:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== CONVOCATIONS DE L'ENFANT ==========
exports.getConvocationsEnfant = async (req, res) => {
    try {
        const parentId = req.user?.id;
        const enfantId = req.query.enfant_id;

        if (!parentId || !enfantId) {
            return res.status(401).json({ message: 'Données manquantes' });
        }

        // Vérifier accès
        const accessQuery = `
            SELECT 1 FROM liaisons_parentales.parent_eleve 
            WHERE id_parent = $1 AND id_eleve = $2 LIMIT 1
        `;
        const accessCheck = await db.query(accessQuery, [parentId, enfantId]);

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        // Les convocations sont privées (visible seulement élève + parents)
        const query = `
            SELECT 
                id_convocation,
                sujet,
                description,
                date_convocation,
                motif,
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

        const result = await db.query(query, [enfantId]);

        res.json({
            success: true,
            count: result.rows.length,
            convocations: result.rows || []
        });

    } catch (error) {
        console.error('Erreur récupération convocations:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== ABSENCES DE L'ENFANT ==========
exports.getAbsencesEnfant = async (req, res) => {
    try {
        const parentId = req.user?.id;
        const enfantId = req.query.enfant_id;

        if (!parentId || !enfantId) {
            return res.status(401).json({ message: 'Données manquantes' });
        }

        // Vérifier accès
        const accessQuery = `
            SELECT 1 FROM liaisons_parentales.parent_eleve 
            WHERE id_parent = $1 AND id_eleve = $2 LIMIT 1
        `;
        const accessCheck = await db.query(accessQuery, [parentId, enfantId]);

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const query = `
            SELECT 
                id_absence,
                date_absence,
                justifiee,
                raison_absence,
                created_at,
                CASE 
                    WHEN justifiee = true THEN 'JUSTIFIÉE'
                    ELSE 'NON JUSTIFIÉE'
                END as statut
            FROM gestion.absences
            WHERE id_eleve = $1
            ORDER BY date_absence DESC
        `;

        const result = await db.query(query, [enfantId]);

        const justifiees = result.rows.filter(a => a.justifiee === true).length;
        const nonJustifiees = result.rows.filter(a => a.justifiee === false).length;

        res.json({
            success: true,
            count_total: result.rows.length,
            absences_justifiees: justifiees,
            absences_non_justifiees: nonJustifiees,
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

// ========== ÉVÉNEMENTS & ACTIVITÉS ==========
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
                CASE 
                    WHEN date_fin < NOW() THEN 'TERMINÉE'
                    WHEN date_debut <= NOW() AND date_fin >= NOW() THEN 'EN COURS'
                    ELSE 'À VENIR'
                END as statut
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

// ========== COTISATIONS APE ==========
exports.getCotisations = async (req, res) => {
    try {
        const parentId = req.user?.id;

        if (!parentId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        // Récupérer les cotisations APE pour ce parent
        const query = `
            SELECT 
                id_cotisation,
                montant,
                date_cotisation,
                statut_paiement,
                motif_cotisation,
                periode_concernee,
                CASE 
                    WHEN statut_paiement = 'PAYE' THEN '✅ Payé'
                    WHEN statut_paiement = 'EN_ATTENTE' THEN '⏳ En attente'
                    ELSE '❌ Non payé'
                END as statut_label
            FROM gestion_ape.cotisations_parents
            WHERE id_parent = $1
            ORDER BY date_cotisation DESC
        `;

        const result = await db.query(query, [parentId]);

        let totalDu = 0;
        let totalPaye = 0;

        result.rows.forEach(c => {
            if (c.statut_paiement === 'PAYE') {
                totalPaye += c.montant;
            } else {
                totalDu += c.montant;
            }
        });

        res.json({
            success: true,
            count: result.rows.length,
            resume: {
                montant_total_du: totalDu,
                montant_total_paye: totalPaye,
                montant_total: totalDu + totalPaye
            },
            cotisations: result.rows || []
        });

    } catch (error) {
        console.error('Erreur récupération cotisations:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== MESSAGES DE LA DIRECTION ==========
exports.getMessages = async (req, res) => {
    try {
        const parentId = req.user?.id;

        if (!parentId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        // Messages adressés aux parents
        const query = `
            SELECT 
                id_message,
                titre,
                contenu,
                date_envoi,
                priorite,
                est_lu,
                CASE 
                    WHEN priorite = 'URGENT' THEN '🔴'
                    WHEN priorite = 'NORMAL' THEN '⚪'
                    ELSE '💙'
                END as icone
            FROM gestion.messages
            WHERE destinataire_type = 'PARENT' AND destinataire_id = $1
            ORDER BY date_envoi DESC
            LIMIT 50
        `;

        const result = await db.query(query, [parentId]);

        res.json({
            success: true,
            count: result.rows.length,
            non_lus: result.rows.filter(m => !m.est_lu).length,
            messages: result.rows || []
        });

    } catch (error) {
        console.error('Erreur récupération messages:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== PROFIL DU PARENT ==========
exports.getProfilParent = async (req, res) => {
    try {
        const parentId = req.user?.id;

        if (!parentId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        // Récupérer infos parent
        const query = `
            SELECT 
                c.id_user,
                c.code_unique,
                c.nom,
                c.prenom,
                c.email,
                c.est_actif,
                p.profession,
                (SELECT COUNT(*) FROM liaisons_parentales.parent_eleve WHERE id_parent = c.id_user) as nb_enfants
            FROM authentification.comptes c
            LEFT JOIN gestion_ape.profils_parents p ON c.id_user = p.id_user
            WHERE c.id_user = $1
        `;

        const result = await db.query(query, [parentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Profil non trouvé' });
        }

        const parent = result.rows[0];

        res.json({
            success: true,
            profil: {
                nom_complet: `${parent.prenom} ${parent.nom}`,
                code_unique: parent.code_unique,
                email: parent.email,
                profession: parent.profession || 'N/A',
                nb_enfants: parent.nb_enfants,
                compte_actif: parent.est_actif
            }
        });

    } catch (error) {
        console.error('Erreur récupération profil:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
