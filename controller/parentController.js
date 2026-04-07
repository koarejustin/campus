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
const getEnfantsPourParent = async (parentId) => {
    try {
        try {
            const r = await db.query(`
                SELECT DISTINCT pe.id_eleve as id_enfant
                FROM vie_scolaire.relations_parents_eleves pe
                WHERE pe.id_parent = $1
            `, [parentId]);
            if (r.rows.length > 0) return r.rows.map(r => r.id_enfant);
        } catch (e1) { }

        const parentInfo = await db.query(
            `SELECT nom FROM authentification.comptes WHERE id_user = $1`, [parentId]
        );
        if (!parentInfo.rows.length) return [];
        const nomFamille = parentInfo.rows[0].nom;

        const r2 = await db.query(`
            SELECT c.id_user as id_enfant
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            WHERE c.nom = $1 AND c.role_actuel = 'ELEVE' AND c.est_actif = true
            LIMIT 1
        `, [nomFamille]);
        return r2.rows.map(r => r.id_enfant);
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

        const enfantsQuery = `
            SELECT p.id_user FROM vie_scolaire.profils_eleves p
            JOIN vie_scolaire.relations_parents_eleves pe ON p.id_user = pe.id_eleve
            WHERE pe.id_parent = $1 AND p.id_user = $2
            LIMIT 1
        `;
        const accessCheck = await db.query(enfantsQuery, [parentId, enfantId]);

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

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

        const notesQuery = `
            SELECT 
                COALESCE(m.nom_matiere, 'Matière') as nom_matiere,
                m.coefficient,
                AVG(n.note) as valeur_note,
                COUNT(n.id_evaluation) as nb_evaluations
            FROM pedagogie.notes_evaluations n
            LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
            WHERE n.id_eleve = $1 AND n.trimestre = $2
            GROUP BY m.nom_matiere, m.coefficient
            ORDER BY valeur_note DESC
        `;

        const notesResult = await db.query(notesQuery, [enfantId, trimestre]);

        const notes = notesResult.rows.map(r => ({
            nom_matiere: r.nom_matiere,
            valeur_note: r.valeur_note ? Math.round(parseFloat(r.valeur_note) * 100) / 100 : null,
            coefficient: parseInt(r.coefficient) || 1,
            nb_evaluations: r.nb_evaluations
        }));

        res.json({
            success: true,
            enfant: {
                nom_complet: `${eleve.prenom} ${eleve.nom}`,
                prenom: eleve.prenom,
                nom: eleve.nom,
                code_unique: eleve.code_unique,
                classe: eleve.classe_actuelle,
                moyenne_generale: eleve.moyenne_generale ? Math.round(parseFloat(eleve.moyenne_generale) * 100) / 100 : null
            },
            notes: notes,
            notes_par_matiere: notes,
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
            JOIN vie_scolaire.relations_parents_eleves pe ON p.id_user = pe.id_eleve
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
                prenom: e.prenom,
                nom: e.nom,
                code_unique: e.code_unique,
                classe: e.classe_actuelle,
                classe_actuelle: e.classe_actuelle,
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

        const accessQuery = `
            SELECT 1 FROM vie_scolaire.relations_parents_eleves
            WHERE id_parent = $1 AND id_eleve = $2 LIMIT 1
        `;
        const accessCheck = await db.query(accessQuery, [parentId, enfantId]);

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const query = `
            SELECT 
                id_convocation,
                sujet,
                description,
                date_convocation,
                motif,
                date_creation,
                UPPER(COALESCE(statut, 'ENVOYEE')) AS statut,
                date_accuse,
                accuse_par,
                CASE 
                    WHEN date_convocation < NOW() THEN 'PASSEE'
                    WHEN date_convocation <= NOW() + INTERVAL '3 DAYS' THEN 'URGENTE'
                    ELSE 'PROCHAINE'
                END as periode
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

        const accessQuery = `
            SELECT 1 FROM vie_scolaire.relations_parents_eleves
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
        let annonces = [];

        // 1. Récupérer depuis vie_scolaire.annonces
        try {
            const r = await db.query(`
                SELECT id::text AS id_annonce, 
                       titre, 
                       contenu,
                       COALESCE(type, 'INFO') AS priorite, 
                       created_at AS date_publication,
                       destinataires
                FROM vie_scolaire.annonces
                WHERE destinataires IN ('tous', 'parents', 'all', 'parent')
                ORDER BY created_at DESC
                LIMIT 30
            `);
            annonces = r.rows;
        } catch (e) {
            console.log('Erreur vie_scolaire.annonces:', e.message);
        }

        // 2. Récupérer depuis gestion.annonces_officielles
        try {
            const r2 = await db.query(`
                SELECT id_annonce::text AS id_annonce, 
                       titre, 
                       contenu, 
                       type AS priorite, 
                       date_publication,
                       COALESCE(destinataires, 'tous') as destinataires
                FROM gestion.annonces_officielles
                WHERE COALESCE(destinataires, 'tous') IN ('tous', 'parents', 'all', 'parent')
                ORDER BY date_publication DESC
                LIMIT 30
            `);
            annonces = [...annonces, ...r2.rows];
        } catch (e) {
            console.log('Erreur gestion.annonces_officielles:', e.message);
        }

        // Déduplication
        const uniqueMap = new Map();
        for (const annonce of annonces) {
            const key = `${annonce.titre}_${(annonce.contenu || '').substring(0, 100)}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, annonce);
            }
        }

        const annoncesUniques = Array.from(uniqueMap.values());
        annoncesUniques.sort((a, b) => new Date(b.date_publication) - new Date(a.date_publication));

        console.log(`📢 ${annoncesUniques.length} annonces chargées pour parent`);

        res.json({
            success: true,
            count: annoncesUniques.length,
            annonces: annoncesUniques.slice(0, 30)
        });

    } catch (error) {
        console.error('Erreur getAnnonces:', error);
        res.json({ success: true, count: 0, annonces: [] });
    }
};

// ========== PROFIL DU PARENT ==========
exports.getProfilParent = async (req, res) => {
    try {
        const parentId = req.user?.id;
        if (!parentId) return res.status(401).json({ message: 'Non authentifié' });

        await db.query(`ALTER TABLE gestion_ape.profils_parents ADD COLUMN IF NOT EXISTS photo_url TEXT`);

        const base = await db.query(
            `SELECT id_user, code_unique, nom, prenom, email, telephone, est_actif
             FROM authentification.comptes WHERE id_user = $1`, [parentId]
        );
        if (!base.rows.length) return res.status(404).json({ message: 'Profil non trouvé' });
        const c = base.rows[0];

        let profession = null, adresse = null, biographie = null, photo_url = null, statut_ape = 'MEMBRE';
        try {
            const extra = await db.query(
                `SELECT profession, adresse, COALESCE(biographie, bio) AS biographie,
                        photo_url, COALESCE(statut_ape, 'MEMBRE') AS statut_ape
                 FROM gestion_ape.profils_parents WHERE id_user = $1`, [parentId]
            );
            if (extra.rows.length) {
                profession = extra.rows[0].profession;
                adresse = extra.rows[0].adresse;
                biographie = extra.rows[0].biographie;
                photo_url = extra.rows[0].photo_url;
                statut_ape = extra.rows[0].statut_ape;
            }
        } catch (e2) { }

        res.json({
            success: true,
            profil: {
                id: c.id_user, nom: c.nom, prenom: c.prenom,
                nom_complet: `${c.prenom} ${c.nom}`,
                code_unique: c.code_unique, email: c.email,
                telephone: c.telephone,
                profession, adresse, biographie, bio: biographie,
                photo_url, statut_ape, compte_actif: c.est_actif
            }
        });
    } catch (error) {
        console.error('getProfilParent:', error.message);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

exports.updateProfilParent = async (req, res) => {
    try {
        const parentId = req.user?.id;
        if (!parentId) return res.status(401).json({ message: 'Non authentifié' });

        await db.query(`ALTER TABLE gestion_ape.profils_parents ADD COLUMN IF NOT EXISTS telephone VARCHAR(20)`);
        await db.query(`ALTER TABLE gestion_ape.profils_parents ADD COLUMN IF NOT EXISTS adresse TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_parents ADD COLUMN IF NOT EXISTS biographie TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_parents ADD COLUMN IF NOT EXISTS bio TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_parents ADD COLUMN IF NOT EXISTS photo_url TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_parents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);

        const { telephone, adresse, profession, biographie, bio, photo_url } = req.body;
        const bioFinal = biographie || bio || null;

        await db.query(`
            INSERT INTO gestion_ape.profils_parents
                (id_user, profession, adresse, biographie, bio, telephone, photo_url, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id_user) DO UPDATE SET
                profession   = COALESCE(EXCLUDED.profession, gestion_ape.profils_parents.profession),
                adresse      = COALESCE(EXCLUDED.adresse, gestion_ape.profils_parents.adresse),
                biographie   = COALESCE(EXCLUDED.biographie, gestion_ape.profils_parents.biographie),
                bio          = COALESCE(EXCLUDED.bio, gestion_ape.profils_parents.bio),
                telephone    = COALESCE(EXCLUDED.telephone, gestion_ape.profils_parents.telephone),
                photo_url    = COALESCE(EXCLUDED.photo_url, gestion_ape.profils_parents.photo_url),
                updated_at   = NOW()
        `, [parentId, profession || null, adresse || null, bioFinal, bioFinal, telephone || null, photo_url || null]);

        res.json({ success: true, message: 'Profil mis à jour' });
    } catch (error) {
        console.error('updateProfilParent:', error.message);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ========== AVIS D'ORIENTATION DU PARENT ==========
exports.getOrientationEnfant = async (req, res) => {
    try {
        const parentId = req.user?.id;
        const enfantId = req.query.enfant_id;
        if (!parentId || !enfantId) return res.json({ success: true, avis: [] });

        await db.query(`CREATE TABLE IF NOT EXISTS pedagogie.avis_orientation (
            id SERIAL PRIMARY KEY, id_prof UUID NOT NULL, id_eleve UUID NOT NULL,
            points_forts TEXT, points_faibles TEXT, serie_recommandee VARCHAR(100),
            commentaire TEXT, updated_at TIMESTAMP DEFAULT NOW(),
            source VARCHAR(20) DEFAULT 'PROF',
            UNIQUE(id_prof, id_eleve)
        )`).catch(() => { });
        await db.query(`ALTER TABLE pedagogie.avis_orientation ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'PROF'`).catch(() => { });

        const r = await db.query(`
            SELECT ao.id, ao.points_forts, ao.points_faibles, ao.serie_recommandee,
                   ao.commentaire, COALESCE(ao.updated_at, NOW()) AS updated_at,
                   c.nom AS auteur_nom, c.prenom AS auteur_prenom,
                   COALESCE(ao.source, 'PROF') AS source
            FROM pedagogie.avis_orientation ao
            JOIN authentification.comptes c ON c.id_user = ao.id_prof
            WHERE ao.id_eleve = $1
            ORDER BY COALESCE(ao.updated_at, NOW()) DESC
        `, [enfantId]);
        res.json({ success: true, avis: r.rows });
    } catch (e) {
        console.error('getOrientationEnfant:', e.message);
        res.json({ success: true, avis: [] });
    }
};

exports.addOrientationAvis = async (req, res) => {
    try {
        const parentId = req.user?.id;
        const { enfant_id, serie_recommandee, commentaire } = req.body;
        if (!parentId || !enfant_id) return res.status(400).json({ message: 'Données manquantes' });

        await db.query(`CREATE TABLE IF NOT EXISTS pedagogie.avis_orientation (
            id SERIAL PRIMARY KEY, id_prof UUID NOT NULL, id_eleve UUID NOT NULL,
            points_forts TEXT, points_faibles TEXT, serie_recommandee VARCHAR(100),
            commentaire TEXT, updated_at TIMESTAMP DEFAULT NOW(),
            source VARCHAR(20) DEFAULT 'PROF',
            UNIQUE(id_prof, id_eleve)
        )`).catch(() => { });
        await db.query(`ALTER TABLE pedagogie.avis_orientation ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'PROF'`).catch(() => { });

        await db.query(`
            INSERT INTO pedagogie.avis_orientation
                (id_prof, id_eleve, serie_recommandee, commentaire, updated_at, source)
            VALUES ($1, $2, $3, $4, NOW(), 'PARENT')
            ON CONFLICT (id_prof, id_eleve) DO UPDATE SET
                serie_recommandee = EXCLUDED.serie_recommandee,
                commentaire       = EXCLUDED.commentaire,
                updated_at        = NOW(),
                source            = 'PARENT'
        `, [parentId, enfant_id, serie_recommandee || null, commentaire || null]);

        res.json({ success: true, message: "Avis d'orientation enregistré" });
    } catch (e) {
        console.error('addOrientationAvis:', e.message);
        res.status(500).json({ message: e.message });
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
                CASE 
                    WHEN date_fin < NOW() THEN 'TERMINÉE'
                    WHEN date_debut <= NOW() AND date_fin >= NOW() THEN 'EN COURS'
                    ELSE 'À VENIR'
                END as statut
            FROM gestion.activites
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