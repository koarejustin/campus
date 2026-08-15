const db = require('../config/db');
const notificationService = require('../services/notificationService');

/**
 * ESPACE APE (Association des Parents d'Élèves)
 * Conforme au cahier des charges (IV. Espace Bureau des Parents) :
 *  - Gestion APE : cotisations, projets de l'école
 *  - Communication interne : discussions entre parents
 *  - Implication dans l'orientation : conseils de choix de séries
 *
 * Deux niveaux d'accès, comme dans une vraie APE burkinabè :
 *  - Parent simple (MEMBRE) : consulte ses propres cotisations, participe au forum
 *  - Membre du bureau (PRESIDENT / TRESORIER / SECRETAIRE) : gère les cotisations
 *    de tous les parents, publie au nom du bureau. Seul le PRESIDENT (et toute
 *    fonction avec peut_signer_documents=true) peut signer des documents officiels.
 */

// Résout le rôle APE de l'utilisateur connecté (null si simple parent sans fonction)
const getRoleApe = async (userId) => {
    const r = await db.query(`
        SELECT b.poste, b.peut_signer_documents
        FROM gestion_ape.bureau_direction b
        JOIN gestion_ape.profils_parents pp ON pp.id_parent = b.id_parent
        WHERE pp.id_user = $1
    `, [userId]);
    return r.rows[0] || null;
};

// ========== MON RÔLE APE ==========
exports.getMonRole = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const role = await getRoleApe(userId);
        res.json({
            success: true,
            est_membre_bureau: !!role,
            poste: role?.poste || null,
            peut_signer_documents: role?.peut_signer_documents || false
        });
    } catch (error) {
        console.error('Erreur getMonRole APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== LISTE DU BUREAU (visible par tous les parents) ==========
exports.getBureau = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                b.poste,
                b.date_nomination,
                b.peut_signer_documents,
                c.nom,
                c.prenom,
                pp.photo_url,
                pp.telephone
            FROM gestion_ape.bureau_direction b
            JOIN gestion_ape.profils_parents pp ON pp.id_parent = b.id_parent
            JOIN authentification.comptes c ON c.id_user = pp.id_user
            ORDER BY
                CASE b.poste
                    WHEN 'PRESIDENT' THEN 1
                    WHEN 'TRESORIER' THEN 2
                    WHEN 'SECRETAIRE' THEN 3
                    ELSE 4
                END
        `);
        res.json({ success: true, bureau: result.rows });
    } catch (error) {
        console.error('Erreur getBureau APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== VUE D'ENSEMBLE COTISATIONS (bureau uniquement) ==========
exports.getToutesCotisations = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const role = await getRoleApe(userId);
        if (!role) {
            return res.status(403).json({ message: 'Réservé aux membres du bureau APE.' });
        }

        const result = await db.query(`
            SELECT
                cp.id_cotisation, cp.montant, cp.date_cotisation, cp.statut_paiement,
                cp.motif_cotisation, cp.periode_concernee,
                parent.nom AS nom_parent, parent.prenom AS prenom_parent,
                enfant.nom AS nom_enfant, enfant.prenom AS prenom_enfant,
                pe.classe_actuelle
            FROM gestion_ape.cotisations_parents cp
            LEFT JOIN authentification.comptes parent ON parent.id_user = cp.id_parent
            LEFT JOIN authentification.comptes enfant ON enfant.id_user = cp.id_eleve
            LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = cp.id_eleve
            ORDER BY cp.date_cotisation DESC
        `);

        const total_collecte = result.rows
            .filter(c => c.statut_paiement === 'PAYE')
            .reduce((s, c) => s + parseFloat(c.montant || 0), 0);
        const total_attendu = result.rows
            .reduce((s, c) => s + parseFloat(c.montant || 0), 0);

        res.json({
            success: true,
            cotisations: result.rows,
            resume: { total_collecte, total_attendu, count: result.rows.length }
        });
    } catch (error) {
        console.error('Erreur getToutesCotisations APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== ENREGISTRER UNE COTISATION (PRESIDENT / TRESORIER uniquement) ==========
exports.enregistrerCotisation = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const role = await getRoleApe(userId);
        if (!role || !['PRESIDENT', 'TRESORIER'].includes(role.poste)) {
            return res.status(403).json({ message: 'Seuls le Président et le Trésorier peuvent enregistrer une cotisation.' });
        }

        const { id_parent, id_eleve, montant, motif_cotisation, periode_concernee, statut_paiement } = req.body;
        if (!id_parent || !montant) {
            return res.status(400).json({ message: 'Parent et montant requis' });
        }

        const result = await db.query(`
            INSERT INTO gestion_ape.cotisations_parents
                (id_parent, id_eleve, montant, motif_cotisation, periode_concernee, statut_paiement)
            VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'EN_ATTENTE'))
            RETURNING *
        `, [id_parent, id_eleve || null, montant, motif_cotisation || null, periode_concernee || null, statut_paiement || null]);

        const nouvelleCotisation = result.rows[0];

        // 🔔 Notification interne au parent — seulement si ce n'est pas déjà
        // enregistré comme payé (pas besoin de "à régler" pour du déjà réglé)
        if (nouvelleCotisation.statut_paiement !== 'PAYE') {
            try {
                const montantFmt = new Intl.NumberFormat('fr-FR').format(parseFloat(montant));
                await notificationService.sendNotification(
                    [id_parent],
                    'COTISATION_APE',
                    '💰 Nouvelle cotisation à régler',
                    `${montantFmt} FCFA — ${motif_cotisation || 'Cotisation APE'}`,
                    '/parent.html?page=cotisations'
                );
            } catch (e) { console.warn('Erreur notification cotisation:', e.message); }
        }

        res.json({ success: true, cotisation: nouvelleCotisation });
    } catch (error) {
        console.error('Erreur enregistrerCotisation APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== METTRE À JOUR LE STATUT D'UNE COTISATION (bureau uniquement) ==========
exports.updateStatutCotisation = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id_cotisation } = req.params;
        const { statut_paiement } = req.body;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const role = await getRoleApe(userId);
        if (!role || !['PRESIDENT', 'TRESORIER'].includes(role.poste)) {
            return res.status(403).json({ message: 'Seuls le Président et le Trésorier peuvent modifier une cotisation.' });
        }
        if (!['EN_ATTENTE', 'PAYE', 'ANNULE'].includes(statut_paiement)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }

        const result = await db.query(`
            UPDATE gestion_ape.cotisations_parents
            SET statut_paiement = $2, updated_at = NOW()
            WHERE id_cotisation = $1
            RETURNING *
        `, [id_cotisation, statut_paiement]);

        if (!result.rows.length) return res.status(404).json({ message: 'Cotisation introuvable' });

        const cotisation = result.rows[0];

        // 🔔 Notification interne au parent à chaque changement de statut
        try {
            const montantFmt = new Intl.NumberFormat('fr-FR').format(parseFloat(cotisation.montant));
            const libelles = {
                PAYE: `✅ Cotisation reçue — ${montantFmt} FCFA`,
                EN_ATTENTE: `⏳ Cotisation en attente — ${montantFmt} FCFA`,
                ANNULE: `❌ Cotisation annulée — ${montantFmt} FCFA`
            };
            await notificationService.sendNotification(
                [cotisation.id_parent],
                'COTISATION_APE',
                libelles[statut_paiement] || 'Mise à jour de cotisation',
                cotisation.motif_cotisation || 'Cotisation APE',
                '/parent.html?page=cotisations'
            );
        } catch (e) { console.warn('Erreur notification changement statut cotisation:', e.message); }

        res.json({ success: true, cotisation });
    } catch (error) {
        console.error('Erreur updateStatutCotisation APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== FORUM APE (communication interne — tous les parents) ==========
exports.getForum = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT fp.id_post, fp.contenu, fp.created_at, fp.nb_likes, fp.est_modere,
                   c.nom, c.prenom, c.id_user AS id_auteur
            FROM gestion_ape.forum_parents fp
            JOIN authentification.comptes c ON c.id_user = fp.id_auteur
            WHERE fp.est_modere = FALSE
            ORDER BY fp.created_at DESC
            LIMIT 50
        `);
        res.json({ success: true, posts: result.rows });
    } catch (error) {
        console.error('Erreur getForum APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.publierForum = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { contenu } = req.body;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });
        if (!contenu || !contenu.trim()) return res.status(400).json({ message: 'Message vide' });

        const result = await db.query(`
            INSERT INTO gestion_ape.forum_parents (id_auteur, contenu)
            VALUES ($1, $2)
            RETURNING *
        `, [userId, contenu.trim()]);

        res.json({ success: true, post: result.rows[0] });
    } catch (error) {
        console.error('Erreur publierForum APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.likeForum = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id_post } = req.params;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const already = await db.query(
            `SELECT 1 FROM gestion_ape.forum_likes WHERE id_post = $1 AND id_user = $2`,
            [id_post, userId]
        );
        if (already.rows.length) {
            await db.query(`DELETE FROM gestion_ape.forum_likes WHERE id_post = $1 AND id_user = $2`, [id_post, userId]);
            await db.query(`UPDATE gestion_ape.forum_parents SET nb_likes = GREATEST(nb_likes - 1, 0) WHERE id_post = $1`, [id_post]);
            return res.json({ success: true, liked: false });
        }
        await db.query(`INSERT INTO gestion_ape.forum_likes (id_post, id_user) VALUES ($1, $2)`, [id_post, userId]);
        await db.query(`UPDATE gestion_ape.forum_parents SET nb_likes = nb_likes + 1 WHERE id_post = $1`, [id_post]);
        res.json({ success: true, liked: true });
    } catch (error) {
        console.error('Erreur likeForum APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== PROJETS APE (gérés par le bureau, visibles par tous) ==========
exports.getProjets = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.id_projet, p.titre, p.description, p.budget, p.date_debut, p.date_fin, p.statut,
                   c.nom AS cree_par_nom, c.prenom AS cree_par_prenom
            FROM gestion_ape.projets_ape p
            LEFT JOIN authentification.comptes c ON c.id_user = p.cree_par
            ORDER BY p.date_debut DESC
        `);
        res.json({ success: true, projets: result.rows });
    } catch (error) {
        console.error('Erreur getProjets APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.creerProjet = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const role = await getRoleApe(userId);
        if (!role) return res.status(403).json({ message: 'Réservé aux membres du bureau APE.' });

        const { titre, description, budget, date_debut, date_fin } = req.body;
        if (!titre) return res.status(400).json({ message: 'Titre requis' });

        const result = await db.query(`
            INSERT INTO gestion_ape.projets_ape (titre, description, budget, date_debut, date_fin, cree_par)
            VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6)
            RETURNING *
        `, [titre, description || null, budget || null, date_debut || null, date_fin || null, userId]);

        res.json({ success: true, projet: result.rows[0] });
    } catch (error) {
        console.error('Erreur creerProjet APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== ORIENTATION — avis des parents sur leur(s) enfant(s) ==========
exports.getOrientationEnfant = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id_eleve } = req.query;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });
        if (!id_eleve) return res.status(400).json({ message: 'id_eleve requis' });

        // Vérifie que cet élève est bien un enfant de ce parent
        const lien = await db.query(
            `SELECT 1 FROM vie_scolaire.relations_parents_eleves WHERE id_parent = $1 AND id_eleve = $2`,
            [userId, id_eleve]
        );
        if (!lien.rows.length) {
            return res.status(403).json({ message: 'Cet élève n\'est pas rattaché à votre compte parent.' });
        }

        const result = await db.query(`
            SELECT co.id_conseil, co.contenu_conseil, co.filiere_suggeree, co.date_conseil,
                   c.nom AS auteur_nom, c.prenom AS auteur_prenom, c.role_actuel AS auteur_role
            FROM pedagogie.conseils_orientation co
            JOIN authentification.comptes c ON c.id_user = co.id_auteur
            WHERE co.id_eleve = $1
            ORDER BY co.date_conseil DESC
        `, [id_eleve]);

        res.json({ success: true, avis: result.rows });
    } catch (error) {
        console.error('Erreur getOrientationEnfant APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.ajouterAvisOrientation = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id_eleve, contenu_conseil, filiere_suggeree } = req.body;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });
        if (!id_eleve || !contenu_conseil) {
            return res.status(400).json({ message: 'Élève et contenu requis' });
        }

        const lien = await db.query(
            `SELECT 1 FROM vie_scolaire.relations_parents_eleves WHERE id_parent = $1 AND id_eleve = $2`,
            [userId, id_eleve]
        );
        if (!lien.rows.length) {
            return res.status(403).json({ message: 'Cet élève n\'est pas rattaché à votre compte parent.' });
        }

        const result = await db.query(`
            INSERT INTO pedagogie.conseils_orientation (id_eleve, id_auteur, contenu_conseil, filiere_suggeree)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [id_eleve, userId, contenu_conseil, filiere_suggeree || null]);

        res.json({ success: true, avis: result.rows[0] });
    } catch (error) {
        console.error('Erreur ajouterAvisOrientation APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== RÉSOUDRE UN MATRICULE EN id_user (bureau uniquement, pour saisir une cotisation) ==========
exports.resoudreMatricule = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const role = await getRoleApe(userId);
        if (!role) return res.status(403).json({ message: 'Réservé aux membres du bureau APE.' });

        const { matricule } = req.params;
        const result = await db.query(
            `SELECT id_user, nom, prenom, role_actuel FROM authentification.comptes WHERE code_unique = $1`,
            [matricule]
        );
        if (!result.rows.length) return res.status(404).json({ message: 'Matricule introuvable' });
        res.json({ success: true, compte: result.rows[0] });
    } catch (error) {
        console.error('Erreur resoudreMatricule APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ========== MES ENFANTS (pour peupler les sélecteurs côté frontend) ==========
exports.getMesEnfants = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const result = await db.query(`
            SELECT c.id_user AS id_eleve, c.nom, c.prenom, pe.classe_actuelle
            FROM vie_scolaire.relations_parents_eleves r
            JOIN authentification.comptes c ON c.id_user = r.id_eleve
            LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            WHERE r.id_parent = $1
        `, [userId]);

        res.json({ success: true, enfants: result.rows });
    } catch (error) {
        console.error('Erreur getMesEnfants APE:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
