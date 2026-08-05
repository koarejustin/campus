const db = require('../config/db');

/**
 * CONTRÔLEUR MENTORAT ET JOURNAL DE BORD
 * Gère les relations de mentorat entre alumni et élèves
 * Permet la création et la gestion du journal partagé
 */

// ========== RELATIONS DE MENTORAT ==========

/**
 * Créer une relation de mentorat
 * Seul l'alumni peut créer une relation avec un élève
 */
exports.createRelationMentorat = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        const { id_eleve, description, domaines_assistance } = req.body;

        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });
        if (!id_eleve) return res.status(400).json({ message: 'ID élève requis' });

        // Vérifier que l'utilisateur est alumni
        const userCheck = await db.query(
            `SELECT role_actuel FROM authentification.comptes WHERE id_user = $1`,
            [alumniId]
        );
        if (!userCheck.rows.length || userCheck.rows[0].role_actuel !== 'ALUMNI') {
            return res.status(403).json({ message: 'Seul un alumni peut créer une relation de mentorat' });
        }

        // Vérifier que l'élève existe
        const eleveCheck = await db.query(
            `SELECT id_user FROM authentification.comptes WHERE id_user = $1 AND role_actuel = 'ELEVE'`,
            [id_eleve]
        );
        if (!eleveCheck.rows.length) {
            return res.status(404).json({ message: 'Élève introuvable' });
        }

        // Créer la relation
        const result = await db.query(`
            INSERT INTO gestion_ape.relations_mentorat
            (id_alumni, id_eleve, description, domaines_assistance, statut)
            VALUES ($1, $2, $3, $4, 'actif')
            ON CONFLICT (id_alumni, id_eleve) 
            DO UPDATE SET 
                statut = 'actif',
                date_fin = NULL
            RETURNING *
        `, [alumniId, id_eleve, description || null, domaines_assistance || []]);

        res.json({
            success: true,
            message: 'Relation de mentorat créée',
            relation: result.rows[0]
        });
    } catch (error) {
        console.error('createRelationMentorat:', error);
        res.status(500).json({ message: 'Erreur création mentorat: ' + error.message });
    }
};

/**
 * Récupérer les élèves mentorés par l'alumni connecté
 */
exports.getElevesMentorat = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });

        const result = await db.query(`
            SELECT 
                rm.id_relation,
                rm.id_eleve,
                ac.nom,
                ac.prenom,
                ac.code_unique,
                pe.classe_actuelle,
                (SELECT AVG(note) FROM pedagogie.notes_evaluations WHERE id_eleve = ac.id_user) as moyenne_generale,
                rm.statut,
                rm.date_debut,
                rm.domaines_assistance,
                rm.description,
                COUNT(DISTINCT jb.id_journal) as nb_entrees_journal,
                COUNT(DISTINCT om.id_objectif) as nb_objectifs
            FROM gestion_ape.relations_mentorat rm
            JOIN authentification.comptes ac ON rm.id_eleve = ac.id_user
            LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = ac.id_user
            LEFT JOIN gestion_ape.journal_de_bord jb ON jb.id_relation = rm.id_relation
            LEFT JOIN gestion_ape.objectifs_mentorat om ON om.id_relation = rm.id_relation
            WHERE rm.id_alumni = $1 AND rm.statut = 'actif'
            GROUP BY rm.id_relation, ac.id_user, pe.id_user, pe.classe_actuelle
            ORDER BY rm.date_debut DESC
        `, [alumniId]);

        res.json({
            success: true,
            eleves: result.rows.map(e => ({
                ...e,
                moyenne_generale: e.moyenne_generale ? Math.round(e.moyenne_generale * 100) / 100 : null
            }))
        });
    } catch (error) {
        console.error('getElevesMentorat:', error);
        res.status(500).json({ message: 'Erreur récupération élèves: ' + error.message });
    }
};

/**
 * Récupérer l'alumni mentor d'un élève
 */
exports.getAlumniMentor = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        if (!eleveId) return res.status(401).json({ message: 'Non authentifié' });

        const result = await db.query(`
            SELECT 
                rm.id_relation,
                rm.id_alumni,
                ac.nom,
                ac.prenom,
                ac.code_unique,
                pa.photo_url,
                pa.profession,
                pa.domaine_expertise,
                pa.entreprise_actuelle,
                rm.statut,
                rm.date_debut,
                rm.domaines_assistance,
                rm.description
            FROM gestion_ape.relations_mentorat rm
            JOIN authentification.comptes ac ON rm.id_alumni = ac.id_user
            LEFT JOIN gestion_ape.profils_alumni pa ON pa.id_user = ac.id_user
            WHERE rm.id_eleve = $1 AND rm.statut = 'actif'
            LIMIT 1
        `, [eleveId]);

        if (!result.rows.length) {
            return res.json({ success: true, alumni: null, message: 'Pas de mentor actuellement' });
        }

        res.json({
            success: true,
            alumni: result.rows[0]
        });
    } catch (error) {
        console.error('getAlumniMentor:', error);
        res.status(500).json({ message: 'Erreur récupération mentor: ' + error.message });
    }
};

// ========== JOURNAL DE BORD ==========

/**
 * Ajouter une entrée au journal de bord
 * Peut être écrite par l'alumni OU l'élève
 */
exports.addEntreeJournal = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id_relation, titre, contenu, type_entree, is_prive } = req.body;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });
        if (!id_relation || !titre || !contenu) {
            return res.status(400).json({ message: 'Données manquantes (relation, titre, contenu)' });
        }

        // Vérifier que l'utilisateur a accès à cette relation
        const relationCheck = await db.query(`
            SELECT id_relation, id_alumni, id_eleve
            FROM gestion_ape.relations_mentorat
            WHERE id_relation = $1 AND (id_alumni = $2 OR id_eleve = $2)
        `, [id_relation, userId]);

        if (!relationCheck.rows.length) {
            return res.status(403).json({ message: 'Accès non autorisé à cette relation' });
        }

        const result = await db.query(`
            INSERT INTO gestion_ape.journal_de_bord
            (id_relation, id_auteur, titre, contenu, type_entree, is_prive, date_creation, date_modification)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING *
        `, [id_relation, userId, titre, contenu, type_entree || 'note', is_prive || false]);

        res.json({
            success: true,
            message: 'Entrée ajoutée au journal',
            entree: result.rows[0]
        });
    } catch (error) {
        console.error('addEntreeJournal:', error);
        res.status(500).json({ message: 'Erreur ajout entrée: ' + error.message });
    }
};

/**
 * Récupérer le journal de bord d'une relation de mentorat
 */
exports.getJournalBord = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id_relation } = req.params;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        // Vérifier l'accès
        const relationCheck = await db.query(`
            SELECT id_alumni, id_eleve FROM gestion_ape.relations_mentorat
            WHERE id_relation = $1
        `, [id_relation]);

        if (!relationCheck.rows.length) {
            return res.status(404).json({ message: 'Relation introuvable' });
        }

        const relation = relationCheck.rows[0];
        const isAlumni = relation.id_alumni === userId;
        const isEleve = relation.id_eleve === userId;

        if (!isAlumni && !isEleve) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        // Récupérer les entrées du journal
        let query = `
            SELECT 
                jb.*,
                ac.prenom,
                ac.nom,
                ac.code_unique,
                CASE WHEN ac.role_actuel = 'ALUMNI' THEN 'Alumni' ELSE 'Élève' END as role_auteur
            FROM gestion_ape.journal_de_bord jb
            JOIN authentification.comptes ac ON jb.id_auteur = ac.id_user
            WHERE jb.id_relation = $1
        `;

        // Si c'est l'élève, ne pas montrer les entrées privées de l'alumni
        if (isEleve) {
            query += ` AND (jb.is_prive = FALSE OR jb.id_auteur = $2)`;
        }

        query += ` ORDER BY jb.date_creation DESC`;

        const params = isEleve ? [id_relation, userId] : [id_relation];
        const result = await db.query(query, params);

        res.json({
            success: true,
            entrees: result.rows
        });
    } catch (error) {
        console.error('getJournalBord:', error);
        res.status(500).json({ message: 'Erreur récupération journal: ' + error.message });
    }
};

/**
 * Mettre à jour une entrée du journal
 * Seul l'auteur peut modifier son entrée
 */
exports.updateEntreeJournal = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id_journal } = req.params;
        const { titre, contenu, type_entree, is_prive } = req.body;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        // Vérifier que l'utilisateur est l'auteur
        const entreeCheck = await db.query(`
            SELECT id_auteur FROM gestion_ape.journal_de_bord
            WHERE id_journal = $1
        `, [id_journal]);

        if (!entreeCheck.rows.length) {
            return res.status(404).json({ message: 'Entrée introuvable' });
        }

        if (entreeCheck.rows[0].id_auteur !== userId) {
            return res.status(403).json({ message: 'Vous ne pouvez modifier que vos propres entrées' });
        }

        const result = await db.query(`
            UPDATE gestion_ape.journal_de_bord
            SET 
                titre = COALESCE($2, titre),
                contenu = COALESCE($3, contenu),
                type_entree = COALESCE($4, type_entree),
                is_prive = COALESCE($5, is_prive),
                date_modification = NOW()
            WHERE id_journal = $1
            RETURNING *
        `, [id_journal, titre, contenu, type_entree, is_prive]);

        res.json({
            success: true,
            message: 'Entrée mise à jour',
            entree: result.rows[0]
        });
    } catch (error) {
        console.error('updateEntreeJournal:', error);
        res.status(500).json({ message: 'Erreur mise à jour: ' + error.message });
    }
};

/**
 * Supprimer une entrée du journal
 */
exports.deleteEntreeJournal = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id_journal } = req.params;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        // Vérifier que l'utilisateur est l'auteur
        const entreeCheck = await db.query(`
            SELECT id_auteur FROM gestion_ape.journal_de_bord
            WHERE id_journal = $1
        `, [id_journal]);

        if (!entreeCheck.rows.length) {
            return res.status(404).json({ message: 'Entrée introuvable' });
        }

        if (entreeCheck.rows[0].id_auteur !== userId) {
            return res.status(403).json({ message: 'Vous ne pouvez supprimer que vos propres entrées' });
        }

        await db.query(`DELETE FROM gestion_ape.journal_de_bord WHERE id_journal = $1`, [id_journal]);

        res.json({ success: true, message: 'Entrée supprimée' });
    } catch (error) {
        console.error('deleteEntreeJournal:', error);
        res.status(500).json({ message: 'Erreur suppression: ' + error.message });
    }
};

// ========== OBJECTIFS DE MENTORAT ==========

/**
 * Créer un objectif de mentorat
 */
exports.createObjectifMentorat = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id_relation, description, date_limite, priorite } = req.body;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });
        if (!id_relation || !description) {
            return res.status(400).json({ message: 'Données manquantes' });
        }

        // Seul l'alumni peut créer des objectifs
        const relationCheck = await db.query(`
            SELECT id_alumni FROM gestion_ape.relations_mentorat
            WHERE id_relation = $1 AND id_alumni = $2
        `, [id_relation, userId]);

        if (!relationCheck.rows.length) {
            return res.status(403).json({ message: 'Seul l\'alumni peut créer des objectifs' });
        }

        const result = await db.query(`
            INSERT INTO gestion_ape.objectifs_mentorat
            (id_relation, description, date_limite, priorite, statut)
            VALUES ($1, $2, $3, $4, 'en_cours')
            RETURNING *
        `, [id_relation, description, date_limite || null, priorite || 'normal']);

        res.json({
            success: true,
            message: 'Objectif créé',
            objectif: result.rows[0]
        });
    } catch (error) {
        console.error('createObjectifMentorat:', error);
        res.status(500).json({ message: 'Erreur création objectif: ' + error.message });
    }
};

/**
 * Récupérer les objectifs d'une relation
 */
exports.getObjectifsMentorat = async (req, res) => {
    try {
        const { id_relation } = req.params;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const result = await db.query(`
            SELECT * FROM gestion_ape.objectifs_mentorat
            WHERE id_relation = $1
            ORDER BY priorite DESC, date_limite ASC
        `, [id_relation]);

        res.json({
            success: true,
            objectifs: result.rows
        });
    } catch (error) {
        console.error('getObjectifsMentorat:', error);
        res.status(500).json({ message: 'Erreur récupération objectifs: ' + error.message });
    }
};

/**
 * Mettre à jour le statut d'un objectif
 */
exports.updateObjectifMentorat = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id_objectif } = req.params;
        const { statut, notes_alumni, notes_eleve } = req.body;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const result = await db.query(`
            UPDATE gestion_ape.objectifs_mentorat
            SET 
                statut = COALESCE($2, statut),
                notes_alumni = COALESCE($3, notes_alumni),
                notes_eleve = COALESCE($4, notes_eleve),
                date_completion = CASE WHEN $2 = 'atteint' THEN NOW() ELSE date_completion END
            WHERE id_objectif = $1
            RETURNING *
        `, [id_objectif, statut, notes_alumni, notes_eleve]);

        res.json({
            success: true,
            message: 'Objectif mise à jour',
            objectif: result.rows[0]
        });
    } catch (error) {
        console.error('updateObjectifMentorat:', error);
        res.status(500).json({ message: 'Erreur mise à jour: ' + error.message });
    }
};

/**
 * Récupérer le tableau de bord complet du mentorat
 * Résumé: élèves mentorés, moyennes, objectifs actifs, dernières entrées du journal
 */
exports.getDashboardMentorat = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });

        // Élèves mentorés
        const eleves = await db.query(`
            SELECT 
                rm.id_relation,
                ac.id_user,
                ac.nom,
                ac.prenom,
                ac.code_unique,
                pe.classe_actuelle,
                (SELECT AVG(note) FROM pedagogie.notes_evaluations WHERE id_eleve = ac.id_user) as moyenne
            FROM gestion_ape.relations_mentorat rm
            JOIN authentification.comptes ac ON rm.id_eleve = ac.id_user
            LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = ac.id_user
            WHERE rm.id_alumni = $1 AND rm.statut = 'actif'
        `, [alumniId]);

        // Objectifs actifs
        const objectifs = await db.query(`
            SELECT om.*, rm.id_eleve
            FROM gestion_ape.objectifs_mentorat om
            JOIN gestion_ape.relations_mentorat rm ON rm.id_relation = om.id_relation
            WHERE rm.id_alumni = $1 AND om.statut = 'en_cours'
            ORDER BY om.priorite DESC, om.date_limite ASC
            LIMIT 10
        `, [alumniId]);

        // Dernières entrées du journal
        const dernieres_entrees = await db.query(`
            SELECT 
                jb.*,
                ac.prenom,
                ac.nom,
                rm.id_eleve
            FROM gestion_ape.journal_de_bord jb
            JOIN authentification.comptes ac ON jb.id_auteur = ac.id_user
            JOIN gestion_ape.relations_mentorat rm ON jb.id_relation = rm.id_relation
            WHERE rm.id_alumni = $1
            ORDER BY jb.date_creation DESC
            LIMIT 10
        `, [alumniId]);

        res.json({
            success: true,
            dashboard: {
                nb_eleves_mentores: eleves.rows.length,
                eleves: eleves.rows,
                objectifs_actifs: objectifs.rows,
                dernieres_entrees: dernieres_entrees.rows
            }
        });
    } catch (error) {
        console.error('getDashboardMentorat:', error);
        res.status(500).json({ message: 'Erreur dashboard: ' + error.message });
    }
};

/**
 * Récupérer les résultats scolaires d'un élève mentoré
 */
exports.getResultatsEleveMentorat = async (req, res) => {
    try {
        const { id_eleve } = req.params;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        // Vérifier que l'utilisateur a accès (alumni mentor ou élève lui-même)
        const accessCheck = await db.query(`
            SELECT id_relation, id_alumni, id_eleve FROM gestion_ape.relations_mentorat
            WHERE id_eleve = $1 AND (id_alumni = $2 OR id_eleve = $2)
        `, [id_eleve, userId]);

        if (!accessCheck.rows.length && userId !== id_eleve) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        // Récupérer les données de l'élève
        const eleve = await db.query(`
            SELECT 
                c.nom,
                c.prenom,
                c.code_unique,
                pe.classe_actuelle
            FROM authentification.comptes c
            LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            WHERE c.id_user = $1
        `, [id_eleve]);

        if (!eleve.rows.length) {
            return res.status(404).json({ message: 'Élève introuvable' });
        }

        // Récupérer les notes par trimestre
        const notes = await db.query(`
            SELECT 
                ne.trimestre,
                m.nom_matiere,
                AVG(ne.note) as moyenne_matiere,
                COUNT(*) as nb_evaluations
            FROM pedagogie.notes_evaluations ne
            LEFT JOIN pedagogie.matieres m ON ne.id_matiere = m.id_matiere
            WHERE ne.id_eleve = $1
            GROUP BY ne.trimestre, m.nom_matiere
            ORDER BY ne.trimestre ASC, moyenne_matiere DESC
        `, [id_eleve]);

        // Moyenne générale par trimestre
        const moyennes = await db.query(`
            SELECT 
                trimestre,
                ROUND(AVG(note)::numeric, 2) as moyenne_trimestre,
                COUNT(*) as nb_notes
            FROM pedagogie.notes_evaluations
            WHERE id_eleve = $1
            GROUP BY trimestre
            ORDER BY trimestre ASC
        `, [id_eleve]);

        res.json({
            success: true,
            eleve: eleve.rows[0],
            notes_par_matiere: notes.rows,
            moyennes_par_trimestre: moyennes.rows
        });
    } catch (error) {
        console.error('getResultatsEleveMentorat:', error);
        res.status(500).json({ message: 'Erreur récupération résultats: ' + error.message });
    }
};

// ========== ORIENTATIONS SCIENCES / LITTÉRATURE ==========

/**
 * Définir une orientation (Littérature ou Science) pour un élève mentoré
 * Seul l'alumni peut définir l'orientation
 */
exports.setOrientationEleve = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        const { id_relation, orientation, justification } = req.body;

        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });
        if (!id_relation || !orientation) {
            return res.status(400).json({ message: 'Relations et orientation requis' });
        }

        // Vérifier que l'orientation est valide
        if (!['Littérature', 'Science', 'Indécis'].includes(orientation)) {
            return res.status(400).json({ message: 'Orientation invalide (Littérature, Science ou Indécis)' });
        }

        // Vérifier que c'est l'alumni de cette relation
        const relationCheck = await db.query(`
            SELECT id_relation, id_alumni, id_eleve FROM gestion_ape.relations_mentorat
            WHERE id_relation = $1 AND id_alumni = $2
        `, [id_relation, alumniId]);

        if (!relationCheck.rows.length) {
            return res.status(403).json({ message: 'Vous n\'êtes pas responsable de cette relation' });
        }

        const result = await db.query(`
            UPDATE gestion_ape.relations_mentorat
            SET 
                orientation_suggeree = $2,
                justification_orientation = $3,
                date_orientation_suggeree = NOW()
            WHERE id_relation = $1
            RETURNING *
        `, [id_relation, orientation, justification || null]);

        res.json({
            success: true,
            message: 'Orientation définie',
            relation: result.rows[0]
        });
    } catch (error) {
        console.error('setOrientationEleve:', error);
        res.status(500).json({ message: 'Erreur définition orientation: ' + error.message });
    }
};

/**
 * Récupérer l'orientation d'un élève mentoré
 */
exports.getOrientationEleve = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        const { id_relation } = req.params;

        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });

        const result = await db.query(`
            SELECT 
                rm.id_relation,
                rm.orientation_suggeree,
                rm.justification_orientation,
                rm.date_orientation_suggeree,
                ac.nom,
                ac.prenom,
                pe.classe_actuelle
            FROM gestion_ape.relations_mentorat rm
            JOIN authentification.comptes ac ON rm.id_eleve = ac.id_user
            LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = ac.id_user
            WHERE rm.id_relation = $1 AND rm.id_alumni = $2
        `, [id_relation, alumniId]);

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Relation introuvable' });
        }

        res.json({
            success: true,
            orientation: result.rows[0]
        });
    } catch (error) {
        console.error('getOrientationEleve:', error);
        res.status(500).json({ message: 'Erreur récupération orientation: ' + error.message });
    }
};

/**
 * Récupérer tous les élèves avec leurs orientations
 */
exports.getElevesAvecOrientations = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });

        const result = await db.query(`
            SELECT 
                rm.id_relation,
                rm.id_eleve,
                ac.nom,
                ac.prenom,
                ac.code_unique,
                pe.classe_actuelle,
                rm.orientation_suggeree,
                rm.justification_orientation,
                rm.date_orientation_suggeree,
                (SELECT AVG(note) FROM pedagogie.notes_evaluations WHERE id_eleve = ac.id_user) as moyenne
            FROM gestion_ape.relations_mentorat rm
            JOIN authentification.comptes ac ON rm.id_eleve = ac.id_user
            LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = ac.id_user
            WHERE rm.id_alumni = $1 AND rm.statut = 'actif'
            ORDER BY ac.nom, ac.prenom
        `, [alumniId]);

        res.json({
            success: true,
            eleves: result.rows
        });
    } catch (error) {
        console.error('getElevesAvecOrientations:', error);
        res.status(500).json({ message: 'Erreur récupération élèves: ' + error.message });
    }
};

/**
 * Permet à un élève d'envoyer une demande de mentorat/conseil.
 * La demande est stockée dans `gestion_ape.demandes_mentorat` pour traitement par les alumni.
 */
exports.requestMentorat = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const { id_alumni, message, domaines } = req.body;
        if (!eleveId) return res.status(401).json({ message: 'Non authentifié' });
        // Créer la table si besoin
        await db.query(`CREATE TABLE IF NOT EXISTS gestion_ape.demandes_mentorat (
            id_demande SERIAL PRIMARY KEY,
            id_eleve UUID NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
            id_alumni UUID REFERENCES authentification.comptes(id_user) ON DELETE SET NULL,
            message TEXT,
            domaines_assistance TEXT[],
            statut VARCHAR(20) DEFAULT 'ouvert' CHECK (statut IN ('ouvert','acceptée','refusée','traitée')),
            date_creation TIMESTAMPTZ DEFAULT NOW()
        )`).catch(() => { });

        const result = await db.query(`
            INSERT INTO gestion_ape.demandes_mentorat (id_eleve, id_alumni, message, domaines_assistance)
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [eleveId, id_alumni || null, message || null, domaines || []]);

        res.json({ success: true, demande: result.rows[0] });
    } catch (error) {
        console.error('requestMentorat:', error);
        res.status(500).json({ message: 'Erreur création demande: ' + error.message });
    }
};

/**
 * Lister les demandes de mentorat en attente pour l'alumni connecté
 * (adressées à lui précisément, OU ouvertes à tout le monde)
 */
exports.getDemandes = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });

        await db.query(`CREATE TABLE IF NOT EXISTS gestion_ape.demandes_mentorat (
            id_demande SERIAL PRIMARY KEY,
            id_eleve UUID NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
            id_alumni UUID REFERENCES authentification.comptes(id_user) ON DELETE SET NULL,
            message TEXT,
            domaines_assistance TEXT[],
            statut VARCHAR(20) DEFAULT 'ouvert' CHECK (statut IN ('ouvert','acceptée','refusée','traitée')),
            date_creation TIMESTAMPTZ DEFAULT NOW()
        )`).catch(() => { });

        const result = await db.query(`
            SELECT d.id_demande, d.message, d.domaines_assistance, d.statut, d.date_creation,
                   c.id_user AS id_eleve, c.nom, c.prenom, c.code_unique, pe.classe_actuelle
            FROM gestion_ape.demandes_mentorat d
            JOIN authentification.comptes c ON c.id_user = d.id_eleve
            LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = d.id_eleve
            WHERE d.statut = 'ouvert'
              AND (d.id_alumni = $1 OR d.id_alumni IS NULL)
            ORDER BY d.date_creation DESC
        `, [alumniId]);

        res.json({ success: true, demandes: result.rows });
    } catch (error) {
        console.error('getDemandes:', error);
        res.status(500).json({ message: 'Erreur récupération demandes: ' + error.message });
    }
};

/**
 * Répondre à une demande de mentorat (accepter → crée la relation, ou refuser)
 */
exports.repondreDemande = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        const { id_demande } = req.params;
        const { accepter } = req.body; // true = accepter, false = refuser

        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });

        const demandeRes = await db.query(
            `SELECT * FROM gestion_ape.demandes_mentorat WHERE id_demande = $1 AND statut = 'ouvert'`,
            [id_demande]
        );
        if (!demandeRes.rows.length) {
            return res.status(404).json({ message: 'Demande introuvable ou déjà traitée' });
        }
        const demande = demandeRes.rows[0];

        if (accepter) {
            await db.query(`
                INSERT INTO gestion_ape.relations_mentorat
                (id_alumni, id_eleve, description, domaines_assistance, statut)
                VALUES ($1, $2, $3, $4, 'actif')
                ON CONFLICT (id_alumni, id_eleve)
                DO UPDATE SET statut = 'actif', date_fin = NULL
            `, [alumniId, demande.id_eleve, demande.message || null, demande.domaines_assistance || []]);

            await db.query(
                `UPDATE gestion_ape.demandes_mentorat SET statut = 'acceptée', id_alumni = $2 WHERE id_demande = $1`,
                [id_demande, alumniId]
            );
            res.json({ success: true, message: 'Demande acceptée, relation de mentorat créée' });
        } else {
            await db.query(
                `UPDATE gestion_ape.demandes_mentorat SET statut = 'refusée' WHERE id_demande = $1`,
                [id_demande]
            );
            res.json({ success: true, message: 'Demande refusée' });
        }
    } catch (error) {
        console.error('repondreDemande:', error);
        res.status(500).json({ message: 'Erreur traitement demande: ' + error.message });
    }
};

