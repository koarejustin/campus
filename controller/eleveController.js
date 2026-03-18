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
        if (!eleveId) return res.status(401).json({ message: 'Non authentifié' });

        // Récupérer la classe de l'élève
        const classeResult = await db.query(
            `SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user = $1`,
            [eleveId]
        );
        const classe = classeResult.rows[0]?.classe_actuelle;
        if (!classe) return res.status(404).json({ message: 'Classe non trouvée' });

        // Récupérer les vraies ressources publiées par les profs pour cette classe
        // ou pour "TOUTES" les classes
        const result = await db.query(`
            SELECT
                r.id_ressource,
                r.titre,
                r.type_document,
                r.url_fichier,
                r.classe_concernee,
                r.date_depot,
                COALESCE(c.nom, 'Professeur')    AS prof_nom,
                COALESCE(c.prenom, '')            AS prof_prenom
            FROM pedagogie.ressources_pedagogiques r
            LEFT JOIN pedagogie.profils_profs pp ON pp.id_prof = r.id_prof
            LEFT JOIN authentification.comptes c  ON c.id_user = pp.id_user
            WHERE (r.classe_concernee = $1 OR r.classe_concernee = 'TOUTES')
            ORDER BY r.date_depot DESC
        `, [classe]);

        const ressources = result.rows.map(r => {
            const url = r.url_fichier || '';
            const ext = url ? url.split('.').pop().toLowerCase() : '';
            const type = /^(mp4|webm|mov|avi|mkv|ogv)$/.test(ext) ? 'video'
                : /^(mp3|ogg|wav|m4a)$/.test(ext) ? 'audio'
                : /^(jpg|jpeg|png|gif|webp)$/.test(ext) ? 'image'
                : (r.type_document || 'cours').toLowerCase();
            return {
                id:           r.id_ressource,
                titre:        r.titre,
                type,
                type_document: r.type_document,
                url,
                classe:       r.classe_concernee,
                date_ajout:   r.date_depot,
                format:       ext ? ext.toUpperCase() : '—',
                prof:         r.prof_prenom + ' ' + r.prof_nom
            };
        });

        res.json({
            success: true,
            count: ressources.length,
            classe,
            ressources
        });

    } catch (error) {
        console.error('Erreur récupération ressources élève:', error);
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
        if (!eleveId) return res.status(401).json({ message: 'Non authentifié' });

        const trimestre = req.query.trimestre || null;

        // Moyenne + stats globales
        const statsQuery = trimestre
            ? `SELECT AVG(note) as moyenne_generale, MAX(note) as meilleure_note,
                      MIN(note) as pire_note, COUNT(*) as nb_evaluations
               FROM pedagogie.notes_evaluations
               WHERE id_eleve = $1 AND trimestre = $2`
            : `SELECT AVG(note) as moyenne_generale, MAX(note) as meilleure_note,
                      MIN(note) as pire_note, COUNT(*) as nb_evaluations
               FROM pedagogie.notes_evaluations WHERE id_eleve = $1`;
        const statsResult = await db.query(statsQuery, trimestre ? [eleveId, trimestre] : [eleveId]);
        const stats = statsResult.rows[0] || {};

        // Notes par matière (avec nom de matière)
        const notesQuery = trimestre
            ? `SELECT COALESCE(m.nom_matiere, 'Matière') as matiere,
                      COALESCE(m.nom_matiere, 'Matière') as nom_matiere,
                      COALESCE(m.coefficient, 2) as coefficient,
                      ROUND(AVG(n.note)::numeric, 2) as note_moyenne,
                      ROUND(AVG(n.note)::numeric, 2) as valeur_note,
                      COUNT(n.id_evaluation) as nb_evaluations
               FROM pedagogie.notes_evaluations n
               LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
               WHERE n.id_eleve = $1 AND n.trimestre = $2
               GROUP BY m.nom_matiere, m.coefficient
               ORDER BY note_moyenne DESC`
            : `SELECT COALESCE(m.nom_matiere, 'Matière') as matiere,
                      COALESCE(m.nom_matiere, 'Matière') as nom_matiere,
                      COALESCE(m.coefficient, 2) as coefficient,
                      ROUND(AVG(n.note)::numeric, 2) as note_moyenne,
                      ROUND(AVG(n.note)::numeric, 2) as valeur_note,
                      COUNT(n.id_evaluation) as nb_evaluations
               FROM pedagogie.notes_evaluations n
               LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
               WHERE n.id_eleve = $1
               GROUP BY m.nom_matiere, m.coefficient
               ORDER BY note_moyenne DESC`;
        const notesResult = await db.query(notesQuery, trimestre ? [eleveId, trimestre] : [eleveId]);

        // Absences
        const absenceResult = await db.query(
            `SELECT COUNT(*) as total FROM gestion.absences WHERE id_eleve = $1 AND justifiee = false`,
            [eleveId]
        );

        // Evolution trimestrielle
        const evoResult = await db.query(`
            SELECT trimestre as tri, ROUND(AVG(note)::numeric, 2) as moy
            FROM pedagogie.notes_evaluations
            WHERE id_eleve = $1
            GROUP BY trimestre ORDER BY trimestre
        `, [eleveId]);

        res.json({
            success: true,
            statistiques: {
                academique: {
                    moyenne: Math.round((stats.moyenne_generale || 0) * 100) / 100,
                    meilleure_note: Math.round((stats.meilleure_note || 0) * 100) / 100,
                    pire_note: Math.round((stats.pire_note || 0) * 100) / 100,
                    evaluations_totales: parseInt(stats.nb_evaluations || 0)
                },
                discipline: {
                    absences_non_justifiees: parseInt(absenceResult.rows[0]?.total || 0)
                },
                notes_par_matiere: notesResult.rows,
                evolution_trimestrielle: evoResult.rows.map(r => ({
                    tri: 'T' + r.tri, trimestre: r.tri, moy: parseFloat(r.moy || 0)
                }))
            },
            // Format direct pour compatibilité dashboard parent
            notes_par_matiere: notesResult.rows
        });

    } catch (error) {
        console.error('Erreur getStatistiques:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ═══════════════════════════════════════════
// FORUM DE CLASSE (messages réels en BD)
// ═══════════════════════════════════════════
exports.getForumClasse = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const classe = (await db.query(
            `SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user=$1`, [eleveId]
        )).rows[0]?.classe_actuelle;
        if (!classe) return res.json({ success: true, messages: [] });

        // Créer table si besoin
        await db.query(`
            CREATE TABLE IF NOT EXISTS vie_scolaire.forum_classe (
                id SERIAL PRIMARY KEY,
                classe TEXT NOT NULL,
                id_auteur INTEGER NOT NULL,
                nom_auteur TEXT,
                initiales TEXT,
                texte TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(() => {});

        const r = await db.query(`
            SELECT f.id, f.id_auteur, f.nom_auteur, f.initiales, f.texte,
                   to_char(f.created_at AT TIME ZONE 'Africa/Ouagadougou','HH24:MI') as time,
                   to_char(f.created_at,'YYYY-MM-DD') as date
            FROM vie_scolaire.forum_classe f
            WHERE f.classe = $1
            ORDER BY f.created_at ASC
            LIMIT 100
        `, [classe]);
        res.json({ success: true, classe, messages: r.rows });
    } catch(e) {
        console.warn('getForumClasse:', e.message);
        res.json({ success: true, messages: [] });
    }
};

exports.postForumClasse = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const { texte } = req.body;
        if (!texte?.trim()) return res.status(400).json({ success: false, message: 'Message vide' });

        const u = await db.query(
            `SELECT c.nom, c.prenom, pe.classe_actuelle
             FROM authentification.comptes c
             JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
             WHERE c.id_user = $1`, [eleveId]
        );
        if (!u.rows.length) return res.status(404).json({ success: false, message: 'Élève non trouvé' });
        const { nom, prenom, classe_actuelle } = u.rows[0];
        const nom_auteur = prenom + ' ' + nom.charAt(0) + '.';
        const initiales = (prenom.charAt(0) + nom.charAt(0)).toUpperCase();

        await db.query(`
            CREATE TABLE IF NOT EXISTS vie_scolaire.forum_classe (
                id SERIAL PRIMARY KEY, classe TEXT NOT NULL, id_auteur INTEGER NOT NULL,
                nom_auteur TEXT, initiales TEXT, texte TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(() => {});

        const r = await db.query(`
            INSERT INTO vie_scolaire.forum_classe (classe, id_auteur, nom_auteur, initiales, texte)
            VALUES ($1,$2,$3,$4,$5) RETURNING id, to_char(created_at,'HH24:MI') as time
        `, [classe_actuelle, eleveId, nom_auteur, initiales, texte.trim()]);

        res.json({ success: true, message: r.rows[0], nom_auteur, initiales });
    } catch(e) {
        console.error('postForumClasse:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
};

// ═══════════════════════════════════════════
// INTER-CLASSES (messages entre classes)
// ═══════════════════════════════════════════
exports.getInterClasses = async (req, res) => {
    try {
        const { classe_cible } = req.query;
        const eleveId = req.user?.id;
        const u = await db.query(
            `SELECT pe.classe_actuelle FROM vie_scolaire.profils_eleves pe WHERE pe.id_user=$1`, [eleveId]
        );
        const maClasse = u.rows[0]?.classe_actuelle;
        if (!maClasse || !classe_cible) return res.json({ success: true, messages: [] });

        await db.query(`
            CREATE TABLE IF NOT EXISTS vie_scolaire.inter_classes (
                id SERIAL PRIMARY KEY, classe_source TEXT, classe_cible TEXT,
                id_auteur INTEGER, nom_auteur TEXT, initiales TEXT,
                texte TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(() => {});

        // Messages entre les 2 classes (bidirectionnel)
        const r = await db.query(`
            SELECT id, id_auteur, nom_auteur, initiales, texte, classe_source,
                   to_char(created_at AT TIME ZONE 'Africa/Ouagadougou','HH24:MI') as time
            FROM vie_scolaire.inter_classes
            WHERE (classe_source=$1 AND classe_cible=$2) OR (classe_source=$2 AND classe_cible=$1)
            ORDER BY created_at ASC LIMIT 100
        `, [maClasse, classe_cible]);
        res.json({ success: true, messages: r.rows, ma_classe: maClasse });
    } catch(e) {
        console.warn('getInterClasses:', e.message);
        res.json({ success: true, messages: [] });
    }
};

exports.postInterClasses = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const { texte, classe_cible } = req.body;
        if (!texte?.trim() || !classe_cible) return res.status(400).json({ success: false, message: 'Données manquantes' });

        const u = await db.query(`
            SELECT c.nom, c.prenom, pe.classe_actuelle
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            WHERE c.id_user = $1`, [eleveId]
        );
        if (!u.rows.length) return res.status(404).json({ success: false });
        const { nom, prenom, classe_actuelle } = u.rows[0];
        const nom_auteur = prenom + ' ' + nom.charAt(0) + '.';
        const initiales = (prenom.charAt(0) + nom.charAt(0)).toUpperCase();

        await db.query(`
            CREATE TABLE IF NOT EXISTS vie_scolaire.inter_classes (
                id SERIAL PRIMARY KEY, classe_source TEXT, classe_cible TEXT,
                id_auteur INTEGER, nom_auteur TEXT, initiales TEXT,
                texte TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(() => {});

        const r = await db.query(`
            INSERT INTO vie_scolaire.inter_classes (classe_source, classe_cible, id_auteur, nom_auteur, initiales, texte)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, to_char(created_at,'HH24:MI') as time
        `, [classe_actuelle, classe_cible, eleveId, nom_auteur, initiales, texte.trim()]);

        res.json({ success: true, message: r.rows[0], nom_auteur, initiales, classe_source: classe_actuelle });
    } catch(e) {
        console.error('postInterClasses:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
};

// ═══════════════════════════════════════════
// GRAND ÉLÈVES (posts publics entre élèves)
// ═══════════════════════════════════════════
exports.getGrandEleves = async (req, res) => {
    try {
        const { tag } = req.query;
        await db.query(`
            CREATE TABLE IF NOT EXISTS vie_scolaire.grand_eleves_posts (
                id SERIAL PRIMARY KEY, id_auteur INTEGER, nom_auteur TEXT,
                classe_auteur TEXT, initiales TEXT, color TEXT DEFAULT '#3B49DF',
                texte TEXT NOT NULL, tag TEXT DEFAULT 'GENERAL',
                likes INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(() => {});
        await db.query(`
            CREATE TABLE IF NOT EXISTS vie_scolaire.grand_eleves_likes (
                id_post INTEGER, id_user INTEGER, PRIMARY KEY(id_post, id_user)
            )
        `).catch(() => {});

        let q = `
            SELECT p.id, p.id_auteur, p.nom_auteur, p.classe_auteur, p.initiales,
                   p.color, p.texte, p.tag, p.likes,
                   to_char(p.created_at,'DD/MM HH24:MI') as time
            FROM vie_scolaire.grand_eleves_posts p
        `;
        const params = [];
        if (tag && tag !== 'TOUT') { q += ` WHERE p.tag=$1`; params.push(tag); }
        q += ` ORDER BY p.created_at DESC LIMIT 50`;
        const r = await db.query(q, params);
        res.json({ success: true, posts: r.rows });
    } catch(e) {
        console.warn('getGrandEleves:', e.message);
        res.json({ success: true, posts: [] });
    }
};

exports.postGrandEleves = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const { texte, tag } = req.body;
        if (!texte?.trim()) return res.status(400).json({ success: false, message: 'Message vide' });

        const u = await db.query(`
            SELECT c.nom, c.prenom, pe.classe_actuelle
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            WHERE c.id_user = $1`, [eleveId]
        );
        if (!u.rows.length) return res.status(404).json({ success: false });
        const { nom, prenom, classe_actuelle } = u.rows[0];
        const nom_auteur = prenom + ' ' + nom;
        const initiales = (prenom.charAt(0) + nom.charAt(0)).toUpperCase();
        const colors = ['#3B49DF','#7C3AED','#059669','#DC2626','#D97706','#0891B2'];
        const color = colors[eleveId % colors.length];

        const r = await db.query(`
            INSERT INTO vie_scolaire.grand_eleves_posts (id_auteur, nom_auteur, classe_auteur, initiales, color, texte, tag)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, to_char(created_at,'DD/MM HH24:MI') as time
        `, [eleveId, nom_auteur, classe_actuelle, initiales, color, texte.trim(), tag || 'GENERAL']);

        res.json({ success: true, post: r.rows[0] });
    } catch(e) {
        console.error('postGrandEleves:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.likePost = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        const { id } = req.params;
        await db.query(`
            CREATE TABLE IF NOT EXISTS vie_scolaire.grand_eleves_likes (
                id_post INTEGER, id_user INTEGER, PRIMARY KEY(id_post, id_user)
            )
        `).catch(() => {});
        // Toggle like
        const exists = await db.query(
            `SELECT 1 FROM vie_scolaire.grand_eleves_likes WHERE id_post=$1 AND id_user=$2`, [id, eleveId]
        );
        if (exists.rows.length) {
            await db.query(`DELETE FROM vie_scolaire.grand_eleves_likes WHERE id_post=$1 AND id_user=$2`, [id, eleveId]);
            await db.query(`UPDATE vie_scolaire.grand_eleves_posts SET likes = GREATEST(likes-1,0) WHERE id=$1`, [id]);
            res.json({ success: true, liked: false });
        } else {
            await db.query(`INSERT INTO vie_scolaire.grand_eleves_likes VALUES ($1,$2)`, [id, eleveId]);
            await db.query(`UPDATE vie_scolaire.grand_eleves_posts SET likes = likes+1 WHERE id=$1`, [id]);
            res.json({ success: true, liked: true });
        }
    } catch(e) {
        res.status(500).json({ success: false });
    }
};

// ═══════════════════════════════════════════
// VIE SCOLAIRE (vraies activités depuis BD)
// ═══════════════════════════════════════════
exports.getVieScolaire = async (req, res) => {
    try {
        const r = await db.query(`
            SELECT id_activite, titre, description, date_debut, date_fin,
                   type_activite as tag, lieu,
                   CASE
                     WHEN date_fin < NOW() THEN 'TERMINÉE'
                     WHEN date_debut <= NOW() THEN 'EN COURS'
                     ELSE 'À VENIR'
                   END as statut
            FROM gestion.activities
            ORDER BY date_debut ASC
            LIMIT 20
        `);
        res.json({ success: true, activites: r.rows });
    } catch(e) {
        console.warn('getVieScolaire:', e.message);
        res.json({ success: true, activites: [] });
    }
};

// ═══════════════════════════════════════════
// ORIENTATION (vrais avis des profs + alumni)
// ═══════════════════════════════════════════
exports.getOrientationEleve = async (req, res) => {
    try {
        const eleveId = req.user?.id;
        // Chercher les avis d'orientation enregistrés par les profs pour cet élève
        const r = await db.query(`
            SELECT o.id, o.points_forts, o.points_faibles, o.serie_recommandee,
                   o.commentaire, o.created_at,
                   c.nom as prof_nom, c.prenom as prof_prenom, c.role_actuel as role
            FROM pedagogie.orientations o
            JOIN authentification.comptes c ON c.id_user = o.id_professeur
            WHERE o.id_eleve_code = (
                SELECT code_unique FROM authentification.comptes WHERE id_user = $1
            )
            ORDER BY o.created_at DESC
        `, [eleveId]);
        res.json({ success: true, avis: r.rows });
    } catch(e) {
        console.warn('getOrientationEleve:', e.message);
        res.json({ success: true, avis: [] });
    }
};
