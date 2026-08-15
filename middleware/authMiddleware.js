const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: "Accès refusé. Aucun token fourni." });
    }

    try {
        const tokenPur = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = jwt.verify(tokenPur, process.env.JWT_SECRET);
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