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

module.exports = authMiddleware;
module.exports.ensureRole = ensureRole;