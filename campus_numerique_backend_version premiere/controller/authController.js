const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- LOGIN & ACTIVATION ---
exports.login = async (req, res) => {
    const { code_unique, mot_de_passe, role } = req.body;
    try {
        const query = `
            SELECT c.*, p.classe_actuelle 
            FROM authentification.comptes c
            LEFT JOIN vie_scolaire.profils_eleves p ON c.id_user = p.id_user
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

            return res.status(200).json({
                success: true,
                activated: true,
                message: "Compte activé ! Reconnectez-vous avec ce mot de passe."
            });
        }

        // Vérification du rôle
        if (role && user.role_actuel !== role) {
            return res.status(403).json({ success: false, message: "Rôle non autorisé pour ce portail." });
        }

        // Comparaison Bcrypt
        const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
        if (!isMatch) return res.status(400).json({ success: false, message: "Mot de passe incorrect." });

        // Génération du Token
        const token = jwt.sign(
            { id: user.id_user, role: user.role_actuel, classe: user.classe_actuelle },
            process.env.JWT_SECRET || 'ma_cle_secrete',
            { expiresIn: '24h' }
        );

        // --- MODIFICATION ICI : Retourner les clés attendues par le Dashboard ---
        res.status(200).json({
            success: true,
            token,
            user: {
                nom: user.nom,
                prenom: user.prenom,
                code_unique: user.code_unique, // Clé synchronisée avec le script du dashboard
                role_actuel: user.role_actuel,
                classe_actuelle: user.classe_actuelle || (user.role_actuel === 'DIRECTION' ? 'DIRECTION' : 'N/A')
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