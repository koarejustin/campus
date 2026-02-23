const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
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
};