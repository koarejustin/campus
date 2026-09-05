const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const normalizeClasse = (s) => String(s || '').trim().toLowerCase()
    .replace(/è/g, 'e').replace(/é/g, 'e').replace(/ê/g, 'e').replace(/û/g, 'u')
    .replace(/\s+/g, '').replace(/eme$/g, 'e').replace(/ème$/g, 'e');

// ✅ Sessions multi-appareils plafonnées : une même personne doit pouvoir
// être connectée depuis son ordinateur ET son téléphone en même temps
// (usage réel : import Excel sur PC, consultation sur mobile), mais un
// compte ne doit pas pouvoir servir à un nombre illimité de connexions
// simultanées (partage/vol d'identifiants). MAX_SESSIONS appareils actifs
// par compte ; au-delà, la session la plus ancienne est fermée pour faire
// de la place à la nouvelle.
const MAX_SESSIONS_PAR_COMPTE = 2;

async function _creerSession(idUser, userAgent) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS authentification.sessions_actives (
            id_session UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_user UUID NOT NULL,
            session_token UUID NOT NULL,
            user_agent TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    // Nettoie les sessions de plus de 24h (durée de vie du JWT) pour ce
    // compte avant de recompter — évite d'accumuler des lignes mortes.
    await db.query(
        `DELETE FROM authentification.sessions_actives WHERE id_user = $1 AND created_at < NOW() - INTERVAL '24 hours'`,
        [idUser]
    );
    const sessionToken = crypto.randomUUID();
    await db.query(
        `INSERT INTO authentification.sessions_actives (id_user, session_token, user_agent) VALUES ($1, $2, $3)`,
        [idUser, sessionToken, userAgent || null]
    );
    // Garde seulement les MAX_SESSIONS_PAR_COMPTE plus récentes — ferme les
    // plus anciennes en trop (la nouvelle vient d'être insérée, donc jamais
    // elle-même supprimée ici).
    await db.query(
        `DELETE FROM authentification.sessions_actives
         WHERE id_user = $1 AND id_session NOT IN (
             SELECT id_session FROM authentification.sessions_actives
             WHERE id_user = $1 ORDER BY created_at DESC LIMIT $2
         )`,
        [idUser, MAX_SESSIONS_PAR_COMPTE]
    );
    return sessionToken;
}

// --- LOGIN & ACTIVATION ---
exports.login = async (req, res) => {
    const { code_unique, mot_de_passe, role, context } = req.body;
    try {
        const query = `
            SELECT c.*, p.classe_actuelle, pa.poste_occupe
            FROM authentification.comptes c
            LEFT JOIN vie_scolaire.profils_eleves p ON c.id_user = p.id_user
            LEFT JOIN authentification.profils_administratifs pa ON c.id_user = pa.id_user
            WHERE c.code_unique = $1`;
        const result = await db.query(query, [code_unique]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Matricule inconnu." });
        }

        const user = result.rows[0];

        // --- MODIFICATION ICI : On gère 'NON_ACTIVE' en plus de null ---
        if (user.mot_de_passe === null || user.mot_de_passe === 'NON_ACTIVE') {
            const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
            await db.query(
                'UPDATE authentification.comptes SET mot_de_passe = $1 WHERE id_user = $2',
                [hashedPassword, user.id_user]
            );
            const sessionToken = await _creerSession(user.id_user, req.headers['user-agent']);

            // Générer le Token après activation
            const token = jwt.sign(
                { id: user.id_user, role: user.role_actuel, classe: user.classe_actuelle, sid: sessionToken },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.status(200).json({
                success: true,
                activated: true,
                token,
                user: {
                    nom: user.nom,
                    prenom: user.prenom,
                    code_unique: user.code_unique,
                    role_actuel: user.role_actuel,
                    classe_actuelle: user.classe_actuelle || (user.role_actuel === 'DIRECTION' ? 'DIRECTION' : 'N/A'),
                    poste_occupe: user.poste_occupe || null
                },
                message: "Compte activé ! Vous êtes maintenant connecté."
            });
        }

        // Vérification du rôle
        if (!user.role_actuel) {
            return res.status(403).json({ success: false, message: "Rôle non défini pour cet utilisateur. Contactez l'administration." });
        }

        if (role && user.role_actuel !== role) {
            return res.status(403).json({ success: false, message: `Rôle non autorisé. Vous êtes ${user.role_actuel}, accès ${role} demandé.` });
        }

        if (role === 'ELEVE' && context && user.classe_actuelle) {
            if (normalizeClasse(context) !== normalizeClasse(user.classe_actuelle)) {
                return res.status(403).json({ success: false, message: `Classe incorrecte pour ce matricule. Votre classe est ${user.classe_actuelle}.` });
            }
        }

        // Comparaison Bcrypt
        const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
        if (!isMatch) return res.status(400).json({ success: false, message: "Mot de passe incorrect." });

        // ── Sessions plafonnées à 2 appareils par compte ──
        // ⚠️ L'ancien mécanisme utilisait un Map en mémoire
        // (req.app.locals.activeSessions) qui n'était initialisé nulle part
        // dans le projet — il n'a donc jamais réellement bloqué quoi que ce
        // soit, et de toute façon un Map en mémoire ne survit pas à un
        // redémarrage/redéploiement du serveur. Puis remplacé par un jeton
        // unique en base (1 seul appareil à la fois) — mais une même
        // personne doit pouvoir utiliser son PC ET son téléphone. Désormais :
        // jusqu'à MAX_SESSIONS_PAR_COMPTE appareils actifs, vérifiés à
        // chaque requête dans authMiddleware.js.
        const sessionToken = await _creerSession(user.id_user, req.headers['user-agent']);

        // Génération du Token
        const token = jwt.sign(
            { id: user.id_user, role: user.role_actuel, classe: user.classe_actuelle, sid: sessionToken },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // --- MODIFICATION ICI : Retourner les clés attendues par le Dashboard ---
        res.status(200).json({
            success: true,
            token,
            user: {
                nom: user.nom,
                prenom: user.prenom,
                code_unique: user.code_unique,
                role_actuel: user.role_actuel,
                classe_actuelle: user.classe_actuelle || (user.role_actuel === 'DIRECTION' ? 'DIRECTION' : 'N/A'),
                poste_occupe: user.poste_occupe || null
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
};

exports.register = async (req, res) => {
    res.status(501).json({ message: "Utilisez la simulation pour créer des comptes." });
};

// ── Déconnexion explicite : ferme cette session précise (libère tout de
// suite une des MAX_SESSIONS_PAR_COMPTE places, plutôt que d'attendre les
// 24h d'expiration du token). ──
exports.logout = async (req, res) => {
    try {
        if (req.user?.id && req.user?.sid) {
            await db.query(
                `DELETE FROM authentification.sessions_actives WHERE id_user = $1 AND session_token = $2`,
                [req.user.id, req.user.sid]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('logout:', err.message);
        res.json({ success: true }); // la déconnexion côté client ne doit jamais échouer
    }
};

// ── Changer son propre mot de passe (tous rôles) ──
exports.changerMotDePasse = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
        if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });
        if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
            return res.status(400).json({ success: false, message: 'Ancien et nouveau mot de passe requis' });
        }
        if (String(nouveau_mot_de_passe).length < 8) {
            return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit faire au moins 8 caractères' });
        }

        const r = await db.query(`SELECT mot_de_passe FROM authentification.comptes WHERE id_user = $1`, [userId]);
        if (!r.rows.length) return res.status(404).json({ success: false, message: 'Compte introuvable' });

        const isMatch = await bcrypt.compare(ancien_mot_de_passe, r.rows[0].mot_de_passe);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Ancien mot de passe incorrect' });

        const hash = await bcrypt.hash(nouveau_mot_de_passe, 10);
        await db.query(`UPDATE authentification.comptes SET mot_de_passe = $1 WHERE id_user = $2`, [hash, userId]);

        res.json({ success: true, message: 'Mot de passe modifié avec succès' });
    } catch (err) {
        console.error('changerMotDePasse:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};