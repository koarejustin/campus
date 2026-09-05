const jwt = require('jsonwebtoken');
const db = require('../config/db');

// ✅ Sessions plafonnées à 2 appareils par compte (voir authController.js —
// _creerSession/MAX_SESSIONS_PAR_COMPTE) : le token porte un identifiant de
// session (sid) enregistré dans authentification.sessions_actives à la
// connexion. Si un 3e appareil se connecte, la session la plus ancienne est
// fermée (sa ligne supprimée) — son token, lui, reste valide en apparence
// (JWT immuable) mais ne correspond plus à aucune ligne ici, donc rejeté
// dès la requête suivante.
async function authMiddleware(req, res, next) {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: "Accès refusé. Aucun token fourni." });
    }

    try {
        const tokenPur = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = jwt.verify(tokenPur, process.env.JWT_SECRET);

        if (decoded.sid) {
            const r = await db.query(
                'SELECT 1 FROM authentification.sessions_actives WHERE id_user = $1 AND session_token = $2',
                [decoded.id, decoded.sid]
            );
            if (!r.rows.length) {
                return res.status(401).json({
                    message: "Session fermée : trop d'appareils connectés sur ce compte, ou déconnexion depuis un autre appareil.",
                    code: 'SESSION_REMPLACEE'
                });
            }
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token non valide." });
    }
}

function ensureRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Accès refusé. Aucun utilisateur connecté." });
        }
        if (req.user.role !== role) {
            return res.status(403).json({ message: `Accès refusé. Ce point de terminaison est réservé aux ${role}.` });
        }
        next();
    };
}

// Comme ensureRole, mais accepte une liste de rôles autorisés — utile pour
// les routes partagées entre plusieurs rôles (ex: DIRECTION + SURVEILLANT).
function ensureRoleIn(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Accès refusé. Aucun utilisateur connecté." });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Accès refusé. Ce point de terminaison est réservé aux rôles : ${roles.join(', ')}.` });
        }
        next();
    };
}

module.exports = authMiddleware;
module.exports.ensureRole = ensureRole;
module.exports.ensureRoleIn = ensureRoleIn;