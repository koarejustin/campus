const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const normalizeClasse = (s) => String(s || '').trim().toLowerCase()
    .replace(/è/g, 'e').replace(/é/g, 'e').replace(/ê/g, 'e').replace(/û/g, 'u')
    .replace(/\s+/g, '').replace(/eme$/g, 'e').replace(/ème$/g, 'e');

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
            await db.query('UPDATE authentification.comptes SET mot_de_passe = $1 WHERE id_user = $2', [hashedPassword, user.id_user]);

            // Générer le Token après activation
            const token = jwt.sign(
                { id: user.id_user, role: user.role_actuel, classe: user.classe_actuelle },
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

        // ── Vérifier si déjà connecté (même matricule) ──
        const activeSessions = req.app?.locals?.activeSessions;
        if (activeSessions && activeSessions.has(user.code_unique)) {
            const existing = activeSessions.get(user.code_unique);
            // Optionnel: refuser ou forcer déconnexion
            // Pour l'instant: accepter mais invalider l'ancienne session
            activeSessions.delete(user.code_unique);
            console.log(`⚠️ Double connexion détectée pour ${user.code_unique} - ancienne session invalidée`);
        }

        // Génération du Token
        const token = jwt.sign(
            { id: user.id_user, role: user.role_actuel, classe: user.classe_actuelle },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Enregistrer la session active
        if (activeSessions) {
            activeSessions.set(user.code_unique, {
                token,
                id_user: user.id_user,
                loginAt: new Date()
            });
        }

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

// ── Changer son propre mot de passe (tous rôles) ──
exports.changerMotDePasse = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
        if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });
        if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
            return res.status(400).json({ success: false, message: 'Ancien et nouveau mot de passe requis' });
        }
        if (String(nouveau_mot_de_passe).length < 4) {
            return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit faire au moins 4 caractères' });
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