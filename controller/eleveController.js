const db = require('../config/db');
const notificationService = require('../services/notificationService');

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

// ========== FONCTION POUR AJOUTER LES COLONNES MANQUANTES ==========
async function ensureMessageColumns() {
    try {
        await db.query(`ALTER TABLE vie_scolaire.forum_classe ADD COLUMN IF NOT EXISTS type_msg VARCHAR(20) DEFAULT 'text'`);
        await db.query(`ALTER TABLE vie_scolaire.forum_classe ADD COLUMN IF NOT EXISTS url_audio TEXT`);
        await db.query(`ALTER TABLE vie_scolaire.forum_classe ADD COLUMN IF NOT EXISTS duree INT`);
        await db.query(`ALTER TABLE vie_scolaire.forum_classe ADD COLUMN IF NOT EXISTS est_supprime BOOLEAN DEFAULT FALSE`);
        await db.query(`ALTER TABLE vie_scolaire.forum_classe ADD COLUMN IF NOT EXISTS supprime_pour_soi BOOLEAN DEFAULT FALSE`);
        await db.query(`ALTER TABLE vie_scolaire.forum_classe ADD COLUMN IF NOT EXISTS supprime_par UUID`);

        await db.query(`ALTER TABLE vie_scolaire.inter_classes_msgs ADD COLUMN IF NOT EXISTS type_msg VARCHAR(20) DEFAULT 'text'`);
        await db.query(`ALTER TABLE vie_scolaire.inter_classes_msgs ADD COLUMN IF NOT EXISTS url_audio TEXT`);
        await db.query(`ALTER TABLE vie_scolaire.inter_classes_msgs ADD COLUMN IF NOT EXISTS duree INT`);
        await db.query(`ALTER TABLE vie_scolaire.inter_classes_msgs ADD COLUMN IF NOT EXISTS est_supprime BOOLEAN DEFAULT FALSE`);
        await db.query(`ALTER TABLE vie_scolaire.inter_classes_msgs ADD COLUMN IF NOT EXISTS supprime_pour_soi BOOLEAN DEFAULT FALSE`);
        await db.query(`ALTER TABLE vie_scolaire.inter_classes_msgs ADD COLUMN IF NOT EXISTS supprime_par UUID`);

        console.log('✅ Colonnes messages vocaux vérifiées');
    } catch (e) {
        console.warn('Erreur ajout colonnes:', e.message);
    }
}

// Appeler la fonction pour créer les colonnes
ensureMessageColumns().catch(console.warn);

// ========== BULLETIN & NOTES ==========
exports.getBulletin = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const trimestre = req.query.trimestre || 1;

        if (!eleveId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

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

        const notesQuery = `
            SELECT 
                COALESCE(m.nom_matiere, 'Matiere') as matiere,
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
        if (!eleveId) return res.status(401).json({ message: 'Non authentifié' });

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
        if (!eleveId) return res.status(401).json({ message: 'Non authentifié' });

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
// eleveController.js - fonction getAnnonces à modifier

exports.getAnnonces = async (req, res) => {
    try {
        let annonces = [];

        // 1. Annonces de vie_scolaire.annonces (avec filtre destinataire)
        try {
            await db.query(`CREATE TABLE IF NOT EXISTS vie_scolaire.annonces (
                id SERIAL PRIMARY KEY, 
                titre VARCHAR(255) NOT NULL, 
                contenu TEXT, 
                type VARCHAR(50) DEFAULT 'INFO', 
                destinataires VARCHAR(50) DEFAULT 'tous',  -- 'tous', 'eleves', 'parents', 'profs'
                auteur_id UUID, 
                auteur_role VARCHAR(50), 
                created_at TIMESTAMP DEFAULT NOW()
            )`).catch(() => { });

            await db.query(`ALTER TABLE vie_scolaire.annonces ADD COLUMN IF NOT EXISTS destinataires VARCHAR(50) DEFAULT 'tous'`).catch(() => { });

            // FILTRE IMPORTANT : seulement les annonces pour 'tous' ou 'eleves'
            const r = await db.query(`
                SELECT id::text AS id_annonce, titre, contenu,
                       COALESCE(type,'INFO') AS priorite, 
                       created_at AS date_publication,
                       destinataires,
                       CASE 
                           WHEN type='URGENT' THEN '🔴 URGENT'
                           WHEN type='INFO' THEN '🔵 INFO'
                           ELSE '⚪ NORMAL' 
                       END AS icone_priorite
                FROM vie_scolaire.annonces
                WHERE destinataires IN ('tous', 'eleves', 'all', 'eleve') OR destinataires IS NULL
                ORDER BY created_at DESC
                LIMIT 30  -- ← CHANGEMENT : LIMIT 30 au lieu de 20 pour éviter l'écrasement
            `);
            annonces = r.rows;
        } catch (e1) { console.warn('annonces:', e1.message); }

        // 2. Annonces de vie_scolaire.annonces_officielles (avec filtre)
        try {
            // Vérifier si la table a une colonne destinataires
            const colCheck = await db.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_schema='vie_scolaire' AND table_name='annonces_officielles' AND column_name='destinataires'
            `);

            if (colCheck.rows.length === 0) {
                // Ajouter la colonne si elle n'existe pas
                await db.query(`ALTER TABLE vie_scolaire.annonces_officielles ADD COLUMN IF NOT EXISTS destinataires VARCHAR(50) DEFAULT 'tous'`);
            }

            const r2 = await db.query(`
                SELECT id_annonce::text AS id_annonce, titre, 
                       corps_annonce as contenu, priorite, date_publication,
                       COALESCE(destinataires, 'tous') as destinataires,
                       CASE 
                           WHEN priorite='Urgente' THEN '🔴 URGENT' 
                           WHEN priorite='Info' THEN '🔵 INFO' 
                           ELSE '⚪ NORMAL' 
                       END AS icone_priorite
                FROM vie_scolaire.annonces_officielles
                WHERE COALESCE(destinataires, 'tous') IN ('tous', 'eleves', 'all', 'eleve')
                ORDER BY date_publication DESC
                LIMIT 30
            `);
            annonces = [...annonces, ...r2.rows];
        } catch (e2) { console.warn('vie_scolaire.annonces_officielles:', e2.message); }

        // 3. Annonces de gestion.annonces_officielles (avec filtre)
        try {
            const c2 = await db.query(`SELECT column_name FROM information_schema.columns 
                WHERE table_schema='gestion' AND table_name='annonces_officielles'`);
            const cols2 = c2.rows.map(r => r.column_name);

            const idC = cols2.includes('id') ? 'id::text' : cols2.includes('id_annonce') ? 'id_annonce::text' : "'0'";
            const conC = cols2.includes('contenu') ? 'contenu' : cols2.includes('corps_annonce') ? 'corps_annonce' : "''";
            const datC = cols2.includes('date_publication') ? 'date_publication' : cols2.includes('created_at') ? 'created_at' : 'NOW()';
            const typC = cols2.includes('type') ? "COALESCE(type,'Info')" : cols2.includes('priorite') ? "COALESCE(priorite,'Info')" : "'Info'";
            const destC = cols2.includes('destinataires') ? 'destinataires' : "'tous'";

            const r2 = await db.query(`
                SELECT ${idC} AS id_annonce, titre, ${conC} AS contenu,
                       ${typC} AS priorite, ${datC} AS date_publication,
                       ${destC} as destinataires,
                       CASE 
                           WHEN ${typC} ILIKE 'urgent' THEN '🔴 URGENT'
                           WHEN ${typC} ILIKE 'info'   THEN '🔵 INFO'
                           ELSE '⚪ NORMAL' 
                       END AS icone_priorite
                FROM gestion.annonces_officielles
                WHERE ${destC} IN ('tous', 'eleves', 'all', 'eleve')
                ORDER BY ${datC} DESC
                LIMIT 30
            `);
            annonces = [...annonces, ...r2.rows];
        } catch (e2) { console.warn('gestion.annonces_officielles:', e2.message); }

        // Déduplication et tri par date (plus récent en premier)
        const uniqueMap = new Map();
        for (const annonce of annonces) {
            // Utiliser titre + contenu + date comme clé unique approximative
            const key = `${annonce.titre}_${annonce.contenu?.substring(0, 100)}_${annonce.date_publication}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, annonce);
            }
        }

        const annoncesUniques = Array.from(uniqueMap.values());
        annoncesUniques.sort((a, b) => new Date(b.date_publication) - new Date(a.date_publication));

        res.json({
            success: true,
            count: annoncesUniques.length,
            annonces: annoncesUniques.slice(0, 30)  // ← 30 annonces maximum, pas d'écrasement
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
            FROM gestion.activites
            ORDER BY date_debut ASC
            LIMIT 30
        `;

        const result = await db.query(query);
        res.json({ success: true, count: result.rows.length, activites: result.rows || [] });
    } catch (error) {
        console.error('Erreur récupération activités:', error.message);
        res.json({ success: true, count: 0, activites: [] });
    }
};

// ========== RESSOURCES PÉDAGOGIQUES ==========
exports.getRessources = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        if (!eleveId) return res.status(401).json({ message: 'Non authentifie' });

        const classeRes = await db.query(
            'SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user=$1',
            [eleveId]
        );
        const classe = classeRes.rows[0]?.classe_actuelle || '';

        const r = await db.query(`
            SELECT
                rp.id_ressource    AS id,
                rp.titre,
                rp.type_document   AS type,
                rp.url_fichier     AS url,
                rp.classe_concernee,
                rp.date_depot      AS date_ajout,
                c.nom              AS prof_nom,
                c.prenom           AS prof_prenom,
                pp.specialite      AS matiere
            FROM pedagogie.ressources_pedagogiques rp
            JOIN pedagogie.profils_profs pp ON pp.id_prof = rp.id_prof
            JOIN authentification.comptes c ON c.id_user = pp.id_user
            WHERE (rp.classe_concernee = $1 OR rp.classe_concernee = 'TOUTES')
            ORDER BY rp.date_depot DESC
            LIMIT 50
        `, [classe]);

        res.json({
            success: true,
            count: r.rows.length,
            ressources: r.rows.map(row => ({
                id: row.id,
                titre: row.titre,
                type: (row.type || 'cours').toLowerCase(),
                url: row.url || '',
                classe: row.classe_concernee,
                date_ajout: row.date_ajout,
                prof_nom: row.prof_nom,
                prof_prenom: row.prof_prenom,
                matiere: row.matiere || '',
            }))
        });
    } catch (error) {
        console.error('getRessources eleve:', error.message);
        res.status(500).json({ success: false, message: error.message, ressources: [] });
    }
};

// ========== HORAIRE DE L'ÉLÈVE ==========
exports.getHoraire = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        if (!eleveId) return res.status(401).json({ message: 'Non authentifié' });

        const classeQuery = `SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user = $1`;
        const classeResult = await db.query(classeQuery, [eleveId]);

        if (classeResult.rows.length === 0) {
            return res.status(404).json({ message: 'Classe non trouvée' });
        }

        const classe = classeResult.rows[0].classe_actuelle;

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
        if (!eleveId) return res.status(401).json({ message: 'Non authentifié' });

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

        const absenceQuery = `
            SELECT COUNT(*) as total FROM gestion.absences WHERE id_eleve = $1 AND justifiee = false
        `;
        const absenceResult = await db.query(absenceQuery, [eleveId]);

        const absTotalR = await db.query(`SELECT COUNT(*) AS t FROM gestion.absences WHERE id_eleve=$1`, [eleveId]).catch(() => ({ rows: [{ t: 0 }] }));
        const convTotalR = await db.query(`SELECT COUNT(*) AS t FROM gestion.convocations WHERE id_eleve=$1`, [eleveId]).catch(() => ({ rows: [{ t: 0 }] }));
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
                    absences_non_justifiees: parseInt(absenceResult.rows[0]?.total || 0),
                    absences_total: parseInt(absTotalR.rows[0]?.t || 0),
                    convocations_total: parseInt(convTotalR.rows[0]?.t || 0)
                }
            }
        });

    } catch (error) {
        console.error('Erreur récupération statistiques:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.getOrientation = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        if (!eleveId) return res.status(401).json({ success: false, avis: [] });
        await db.query(`CREATE TABLE IF NOT EXISTS pedagogie.avis_orientation (id SERIAL PRIMARY KEY, id_prof UUID NOT NULL, id_eleve UUID NOT NULL, points_forts TEXT, points_faibles TEXT, serie_recommandee VARCHAR(50), commentaire TEXT, updated_at TIMESTAMP DEFAULT NOW(), UNIQUE(id_prof, id_eleve))`).catch(() => { });
        await db.query(`ALTER TABLE pedagogie.avis_orientation ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`).catch(() => { });
        const r = await db.query(`
            SELECT ao.id, ao.points_forts, ao.points_faibles,
                   ao.serie_recommandee, ao.commentaire,
                   COALESCE(ao.updated_at, NOW()) AS updated_at,
                   c.nom AS prof_nom, c.prenom AS prof_prenom
            FROM pedagogie.avis_orientation ao
            JOIN authentification.comptes c ON c.id_user = ao.id_prof
            WHERE ao.id_eleve = $1
            ORDER BY COALESCE(ao.updated_at, NOW()) DESC
        `, [eleveId]);
        res.json({ success: true, avis: r.rows });
    } catch (e) {
        console.error('getOrientation:', e.message);
        res.json({ success: true, avis: [] });
    }
};


// ========== FORUM DE CLASSE ==========
exports.getForumClasse = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        if (!eleveId) return res.status(401).json({ messages: [] });

        const classeRes = await db.query(
            'SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user=$1', [eleveId]
        );
        const classe = classeRes.rows[0]?.classe_actuelle;
        if (!classe) return res.json({ messages: [] });

        const chk = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='vie_scolaire' AND table_name='forum_classe'`);
        const fc = chk.rows.map(r => r.column_name);
        if (!fc.length) {
            await db.query(`CREATE TABLE vie_scolaire.forum_classe (id SERIAL PRIMARY KEY, classe VARCHAR(50) NOT NULL, id_auteur UUID NOT NULL, nom_auteur VARCHAR(100), initiales VARCHAR(5), texte TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())`);
        } else if (!fc.includes('id') || !fc.includes('classe')) {
            await db.query(`ALTER TABLE vie_scolaire.forum_classe RENAME TO forum_classe_old`).catch(() => { });
            await db.query(`CREATE TABLE vie_scolaire.forum_classe (id SERIAL PRIMARY KEY, classe VARCHAR(50) NOT NULL, id_auteur UUID NOT NULL, nom_auteur VARCHAR(100), initiales VARCHAR(5), texte TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())`).catch(() => { });
        } else {
            await db.query(`ALTER TABLE vie_scolaire.forum_classe ADD COLUMN IF NOT EXISTS initiales VARCHAR(5)`).catch(() => { });
        }
        const r = await db.query(`
            SELECT id, texte, nom_auteur, id_auteur::text, initiales,
                   to_char(created_at, 'HH24:MI') AS time,
                   to_char(created_at, 'DD/MM/YYYY') AS date
            FROM vie_scolaire.forum_classe
            WHERE classe = $1 ORDER BY created_at ASC LIMIT 100
        `, [classe]);
        res.json({ success: true, messages: r.rows });
    } catch (e) {
        console.error('getForumClasse:', e.message);
        res.json({ success: true, messages: [] });
    }
};

exports.postForumClasse = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const { texte } = req.body;
        if (!eleveId || !texte) return res.status(400).json({ message: 'Texte requis' });

        const classeRes = await db.query(
            'SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user=$1', [eleveId]
        );
        const classe = classeRes.rows[0]?.classe_actuelle;

        const userRes = await db.query(
            'SELECT nom, prenom FROM authentification.comptes WHERE id_user=$1', [eleveId]
        );
        const u = userRes.rows[0] || {};
        const nom_auteur = (u.prenom || '') + ' ' + (u.nom || '');

        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS vie_scolaire.forum_classe (
                    id SERIAL PRIMARY KEY, classe VARCHAR(50) NOT NULL,
                    id_auteur UUID NOT NULL, nom_auteur VARCHAR(100),
                    texte TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
                )
            `);
        } catch (e) { }

        const initiales = (((u.prenom || '')[0] || '') + ((u.nom || '')[0] || '')).toUpperCase();
        const r = await db.query(
            `INSERT INTO vie_scolaire.forum_classe (classe, id_auteur, nom_auteur, initiales, texte)
             VALUES ($1,$2,$3,$4,$5) RETURNING id, to_char(created_at,'HH24:MI') AS time, to_char(created_at,'DD/MM/YYYY') AS date`,
            [classe, eleveId, nom_auteur.trim(), initiales, texte]
        );

        // 🔔 NOTIFICATION : après avoir posté dans le forum de classe
        if (r && r.rows && r.rows[0]) {
            try {
                const autresEleves = await db.query(`
                    SELECT id_user FROM vie_scolaire.profils_eleves 
                    WHERE classe_actuelle = $1 AND id_user != $2
                `, [classe, eleveId]);

                if (autresEleves.rows.length > 0) {
                    const destinataires = autresEleves.rows.map(e => e.id_user);
                    await notificationService.sendNotification(
                        destinataires,
                        'FORUM_CLASSE',
                        '💬 Nouveau message dans le forum',
                        `${nom_auteur} a posté un message dans le forum de classe`,
                        '/eleve.html?page=forum-classe'
                    );
                    console.log(`🔔 Notification forum classe envoyée à ${destinataires.length} élèves`);
                }
            } catch (e) { console.warn('Erreur notification forum classe:', e.message); }
        }

        res.json({ success: true, msg: r.rows[0] });
    } catch (e) {
        console.error('postForumClasse:', e.message);
        res.status(500).json({ message: e.message });
    }
};

// ========== GRAND ÉLÈVES ==========
exports.getGrandEleves = async (req, res) => {
    try {
        const { tag } = req.query;
        const eleveId = req.user?.id;

        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS vie_scolaire.grand_eleves_posts (
                    id SERIAL PRIMARY KEY,
                    id_auteur UUID NOT NULL,
                    nom_auteur VARCHAR(100),
                    initiales VARCHAR(5),
                    texte TEXT NOT NULL,
                    tag VARCHAR(50) DEFAULT 'GENERAL',
                    likes INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await db.query(`
                CREATE TABLE IF NOT EXISTS vie_scolaire.grand_eleves_likes (
                    id_post INT, id_user UUID,
                    PRIMARY KEY (id_post, id_user)
                )
            `);
        } catch (e) { }

        let query = `
            SELECT p.id, p.texte, p.tag, p.nom_auteur, p.initiales,
                   p.likes, to_char(p.created_at,'DD/MM/YYYY') AS date,
                   to_char(p.created_at,'HH24:MI') AS time,
                   EXISTS(SELECT 1 FROM vie_scolaire.grand_eleves_likes l WHERE l.id_post=p.id AND l.id_user=$1::uuid) AS liked_by_me
            FROM vie_scolaire.grand_eleves_posts p
        `;
        const params = [eleveId];
        if (tag && tag !== 'TOUT') {
            query += ' WHERE p.tag = $2';
            params.push(tag);
        }
        query += ' ORDER BY p.created_at DESC LIMIT 50';

        const r = await db.query(query, params);
        res.json({ success: true, posts: r.rows });
    } catch (e) {
        console.error('getGrandEleves:', e.message);
        res.json({ success: true, posts: [] });
    }
};

exports.postGrandEleves = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const { texte, tag } = req.body;
        if (!eleveId || !texte) return res.status(400).json({ message: 'Texte requis' });

        const userRes = await db.query(
            'SELECT nom, prenom FROM authentification.comptes WHERE id_user=$1', [eleveId]
        );
        const u = userRes.rows[0] || {};
        const nom = (u.prenom || '') + ' ' + (u.nom || '');
        const initiales = ((u.prenom || '')[0] || '') + ((u.nom || '')[0] || '');

        const r = await db.query(
            `INSERT INTO vie_scolaire.grand_eleves_posts (id_auteur, nom_auteur, initiales, texte, tag)
             VALUES ($1,$2,$3,$4,$5) RETURNING id`,
            [eleveId, nom.trim(), initiales.toUpperCase(), texte, (tag || 'GENERAL').toUpperCase()]
        );

        // 🔔 NOTIFICATION : après avoir posté dans Grand Élèves
        if (r && r.rows && r.rows[0]) {
            try {
                const tousEleves = await db.query(`
                    SELECT id_user FROM authentification.comptes 
                    WHERE role_actuel = 'ELEVE' AND id_user != $1 AND est_actif = true
                `, [eleveId]);

                if (tousEleves.rows.length > 0) {
                    await notificationService.sendNotification(
                        tousEleves.rows.map(e => e.id_user),
                        'GRAND_ELEVES',
                        `🌍 Nouvelle publication - ${tag || 'Général'}`,
                        `${nom} a posté dans Grand Élèves : ${texte.substring(0, 50)}${texte.length > 50 ? '...' : ''}`,
                        '/eleve.html?page=grand-eleves'
                    );
                    console.log(`🔔 Notification Grand Élèves envoyée à ${tousEleves.rows.length} élèves`);
                }
            } catch (e) { console.warn('Erreur notification grand élèves:', e.message); }
        }

        res.json({ success: true, id: r.rows[0].id });
    } catch (e) {
        console.error('postGrandEleves:', e.message);
        res.status(500).json({ message: e.message });
    }
};

exports.likeGrandEleves = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const postId = parseInt(req.params.postId);
        if (!eleveId || !postId) return res.status(400).json({ message: 'Invalide' });

        const existing = await db.query(
            'SELECT 1 FROM vie_scolaire.grand_eleves_likes WHERE id_post=$1 AND id_user=$2',
            [postId, eleveId]
        );
        if (existing.rows.length) {
            await db.query('DELETE FROM vie_scolaire.grand_eleves_likes WHERE id_post=$1 AND id_user=$2', [postId, eleveId]);
            await db.query('UPDATE vie_scolaire.grand_eleves_posts SET likes = GREATEST(0, likes-1) WHERE id=$1', [postId]);
            res.json({ success: true, liked: false });
        } else {
            await db.query('INSERT INTO vie_scolaire.grand_eleves_likes (id_post, id_user) VALUES ($1,$2)', [postId, eleveId]);
            await db.query('UPDATE vie_scolaire.grand_eleves_posts SET likes = likes+1 WHERE id=$1', [postId]);
            res.json({ success: true, liked: true });
        }
    } catch (e) {
        console.error('likeGrandEleves:', e.message);
        res.status(500).json({ message: e.message });
    }
};

// ========== INTER-CLASSES ==========
exports.getInterClasses = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const classe_cible = req.query.classe_cible || '';
        if (!eleveId) return res.json({ messages: [] });

        const classeRes = await db.query(
            'SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user=$1', [eleveId]
        );
        const maClasse = classeRes.rows[0]?.classe_actuelle || '';

        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS vie_scolaire.inter_classes_msgs (
                    id SERIAL PRIMARY KEY,
                    classe_from VARCHAR(50), classe_to VARCHAR(50),
                    id_auteur UUID, nom_auteur VARCHAR(100),
                    texte TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
                )
            `);
        } catch (e) { }

        const r = await db.query(`
            SELECT id, texte, nom_auteur, id_auteur, classe_from, classe_to,
                   to_char(created_at,'HH24:MI') AS time
            FROM vie_scolaire.inter_classes_msgs
            WHERE (classe_from=$1 AND classe_to=$2) OR (classe_from=$2 AND classe_to=$1)
            ORDER BY created_at ASC LIMIT 100
        `, [maClasse, classe_cible]);

        res.json({ success: true, messages: r.rows });
    } catch (e) {
        console.error('getInterClasses:', e.message);
        res.json({ success: true, messages: [] });
    }
};

exports.postInterClasses = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const { texte, classe_cible } = req.body;
        if (!eleveId || !texte) return res.status(400).json({ message: 'Texte requis' });

        const classeRes = await db.query(
            'SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user=$1', [eleveId]
        );
        const maClasse = classeRes.rows[0]?.classe_actuelle || '';
        const userRes = await db.query(
            'SELECT nom, prenom FROM authentification.comptes WHERE id_user=$1', [eleveId]
        );
        const u = userRes.rows[0] || {};
        const nom = ((u.prenom || '') + ' ' + (u.nom || '')).trim();

        await db.query(
            `INSERT INTO vie_scolaire.inter_classes_msgs (classe_from, classe_to, id_auteur, nom_auteur, texte)
             VALUES ($1,$2,$3,$4,$5)`,
            [maClasse, classe_cible || '', eleveId, nom, texte]
        );

        // 🔔 NOTIFICATION : après avoir posté dans inter-classes
        if (classe_cible) {
            try {
                const elevesCible = await db.query(`
                    SELECT id_user FROM vie_scolaire.profils_eleves 
                    WHERE classe_actuelle = $1
                `, [classe_cible]);

                if (elevesCible.rows.length > 0) {
                    await notificationService.sendNotification(
                        elevesCible.rows.map(e => e.id_user),
                        'INTER_CLASSE',
                        '💬 Nouveau message inter-classes',
                        `${nom} (${maClasse}) a posté un message pour ${classe_cible}`,
                        '/eleve.html?page=inter-classes'
                    );
                    console.log(`🔔 Notification inter-classe envoyée à ${elevesCible.rows.length} élèves de ${classe_cible}`);
                }
            } catch (e) { console.warn('Erreur notification inter-classe:', e.message); }
        }

        res.json({ success: true });
    } catch (e) {
        console.error('postInterClasses:', e.message);
        res.status(500).json({ message: e.message });
    }
};

// ========== DEVOIRS / PROGRAMME ==========
exports.getDevoirs = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        if (!eleveId) return res.json({ devoirs: [] });

        const classeRes = await db.query(
            'SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user=$1', [eleveId]
        );
        const classe = classeRes.rows[0]?.classe_actuelle || '';

        try {
            const r = await db.query(`
                SELECT ct.titre_seance AS titre, ct.travail_faire AS description,
                       ct.matiere, to_char(ct.date_seance, 'DD/MM/YYYY') AS date_devoir,
                       c.nom AS prof_nom, c.prenom AS prof_prenom
                FROM pedagogie.cahiers_texte ct
                JOIN authentification.comptes c ON c.id_user = ct.id_prof
                WHERE ct.classe = $1 AND ct.travail_faire IS NOT NULL AND ct.travail_faire != ''
                ORDER BY ct.date_seance DESC LIMIT 20
            `, [classe]);

            return res.json({ success: true, devoirs: r.rows });
        } catch (e2) {
            return res.json({ success: true, devoirs: [] });
        }
    } catch (e) {
        console.error('getDevoirs:', e.message);
        res.json({ success: true, devoirs: [] });
    }
};

exports.getMonProfil = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        if (!eleveId) return res.status(401).json({ success: false });
        await db.query(`ALTER TABLE vie_scolaire.profils_eleves ADD COLUMN IF NOT EXISTS role_special VARCHAR(50) DEFAULT NULL`).catch(() => { });
        const r = await db.query(`SELECT p.classe_actuelle, p.role_special, c.nom, c.prenom, c.code_unique FROM vie_scolaire.profils_eleves p JOIN authentification.comptes c ON c.id_user = p.id_user WHERE p.id_user = $1`, [eleveId]);
        if (!r.rows.length) return res.status(404).json({ success: false });
        const row = r.rows[0];
        res.json({ success: true, profil: { nom: row.nom, prenom: row.prenom, code_unique: row.code_unique, classe: row.classe_actuelle, role_special: row.role_special || null } });
    } catch (e) { res.status(500).json({ success: false }); }
};

// ========== SUPPRESSION DE MESSAGES ==========
exports.deleteForumMessage = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { type, messageId } = req.params;
        const { pourTous } = req.body;

        let table, idField;
        if (type === 'classe') {
            table = 'vie_scolaire.forum_classe';
            idField = 'id';
        } else if (type === 'inter') {
            table = 'vie_scolaire.inter_classes_msgs';
            idField = 'id';
        } else {
            return res.status(400).json({ message: 'Type de message invalide' });
        }

        const message = await db.query(`SELECT id_auteur FROM ${table} WHERE ${idField} = $1`, [messageId]);
        if (!message.rows.length) return res.status(404).json({ message: 'Message non trouvé' });
        if (message.rows[0].id_auteur !== userId) {
            return res.status(403).json({ message: 'Vous ne pouvez supprimer que vos propres messages' });
        }

        if (pourTous) {
            await db.query(
                `UPDATE ${table} SET texte = '[Ce message a été supprimé par l\'auteur]', est_supprime = true WHERE ${idField} = $1`,
                [messageId]
            );
        } else {
            await db.query(
                `UPDATE ${table} SET supprime_par = $1, supprime_pour_soi = true WHERE ${idField} = $2`,
                [userId, messageId]
            );
        }

        res.json({ success: true, message: 'Message supprimé' });
    } catch (error) {
        console.error('Erreur suppression message:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== MESSAGES VOCAUX ==========
exports.postMessageVocal = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { type, classe_cible, conv_id } = req.body;

        if (!req.file) return res.status(400).json({ message: 'Aucun fichier audio' });

        const userRes = await db.query(
            'SELECT nom, prenom FROM authentification.comptes WHERE id_user=$1', [userId]
        );
        const u = userRes.rows[0] || {};
        const nom = (u.prenom || '') + ' ' + (u.nom || '');

        const url_audio = `/uploads/audio/${req.file.filename}`;
        let result;

        if (type === 'classe') {
            const classeRes = await db.query(
                'SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user=$1', [userId]
            );
            const classe = classeRes.rows[0]?.classe_actuelle;

            result = await db.query(
                `INSERT INTO vie_scolaire.forum_classe 
                (classe, id_auteur, nom_auteur, texte, type_msg, url_audio, duree)
                VALUES ($1, $2, $3, $4, 'audio', $5, $6) RETURNING id, to_char(created_at,'HH24:MI') AS time`,
                [classe, userId, nom, 'Message vocal', url_audio, req.body.duree || null]
            );

            const autresEleves = await db.query(
                `SELECT id_user FROM vie_scolaire.profils_eleves WHERE classe_actuelle = $1 AND id_user != $2`,
                [classe, userId]
            );
            if (autresEleves.rows.length) {
                const notificationService = require('../services/notificationService');
                await notificationService.sendNotification(
                    autresEleves.rows.map(e => e.id_user),
                    'FORUM_CLASSE',
                    '🎤 Nouveau message vocal',
                    `${nom} a envoyé un message vocal dans le forum`,
                    '/eleve.html?page=forum-classe'
                );
            }

        } else if (type === 'inter') {
            const classeRes = await db.query(
                'SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user=$1', [userId]
            );
            const maClasse = classeRes.rows[0]?.classe_actuelle || '';

            result = await db.query(
                `INSERT INTO vie_scolaire.inter_classes_msgs 
                (classe_from, classe_to, id_auteur, nom_auteur, texte, type_msg, url_audio, duree)
                VALUES ($1, $2, $3, $4, $5, 'audio', $6, $7) RETURNING id, to_char(created_at,'HH24:MI') AS time`,
                [maClasse, classe_cible || conv_id, userId, nom, 'Message vocal', url_audio, req.body.duree || null]
            );

            const elevesCible = await db.query(
                `SELECT id_user FROM vie_scolaire.profils_eleves WHERE classe_actuelle = $1`,
                [classe_cible]
            );
            if (elevesCible.rows.length) {
                const notificationService = require('../services/notificationService');
                await notificationService.sendNotification(
                    elevesCible.rows.map(e => e.id_user),
                    'INTER_CLASSE',
                    '🎤 Nouveau message vocal',
                    `${nom} (${maClasse}) a envoyé un message vocal`,
                    '/eleve.html?page=inter-classes'
                );
            }
        }

        res.json({ success: true, msg: result.rows[0] });
    } catch (error) {
        console.error('Erreur envoi message vocal:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== APPELS VIDÉO ==========
// Stockage temporaire des salles d'appel
const sallesVideo = new Map();

exports.creerSalleVideo = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { type, destinataire, classe } = req.body;

        const roomId = `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        sallesVideo.set(roomId, {
            id: roomId,
            type,
            destinataire: destinataire || classe,
            createur: userId,
            participants: [userId],
            created_at: new Date()
        });

        setTimeout(() => {
            const salle = sallesVideo.get(roomId);
            if (salle && salle.participants.length <= 1) {
                sallesVideo.delete(roomId);
            }
        }, 3600000);

        res.json({ success: true, roomId, message: 'Salle créée' });
    } catch (error) {
        console.error('Erreur création salle:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.rejoindreSalleVideo = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { roomId } = req.params;

        const salle = sallesVideo.get(roomId);
        if (!salle) {
            return res.status(404).json({ message: 'Salle introuvable ou expirée' });
        }

        if (!salle.participants.includes(userId)) {
            salle.participants.push(userId);
        }

        res.json({ success: true, salle });
    } catch (error) {
        console.error('Erreur rejoindre salle:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.quitterSalleVideo = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { roomId } = req.params;

        const salle = sallesVideo.get(roomId);
        if (salle) {
            salle.participants = salle.participants.filter(id => id !== userId);
            if (salle.participants.length === 0) {
                sallesVideo.delete(roomId);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur quitter salle:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.getSallesActives = async (req, res) => {
    try {
        const userId = req.user?.id;
        const salles = [];

        for (const [roomId, salle] of sallesVideo) {
            if (salle.participants.includes(userId)) {
                salles.push({
                    roomId,
                    participants: salle.participants.length,
                    type: salle.type,
                    created_at: salle.created_at
                });
            }
        }

        res.json({ success: true, salles });
    } catch (error) {
        console.error('Erreur récupération salles:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.signalisationWebRTC = async (req, res) => {
    try {
        const { roomId, signal, destinataire } = req.body;

        const io = require('../server').getIO();
        if (io) {
            io.to(`call_${roomId}`).emit('webrtc-signal', {
                signal,
                from: req.user.id,
                to: destinataire
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur signalisation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};