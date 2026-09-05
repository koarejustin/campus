const jwt = require('jsonwebtoken');
const db = require('../config/db');

// ✅ Session unique par compte : le token porte un identifiant de session
// (sid) généré à chaque connexion et enregistré en base. Si quelqu'un se
// reconnecte ailleurs avec le même matricule, la base reçoit un nouveau
// sid — l'ancien token, lui, garde l'ancien sid pour toujours (les JWT
// sont immuables) et se retrouve donc rejeté ici dès la requête suivante.
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
                'SELECT session_token FROM authentification.comptes WHERE id_user = $1',
                [decoded.id]
            );
            if (!r.rows.length || r.rows[0].session_token !== decoded.sid) {
                return res.status(401).json({
                    message: "Session expirée : ce compte a été utilisé pour se connecter ailleurs.",
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