const db = require('../config/db');

exports.getAllCourses = async (req, res) => {
    try {
        // Récupération sécurisée via le JWT (Middleware authGuard) [cite: 41]
        const { classe, role } = req.user;

        // 1. DIRECTION et PROFESSEUR : Accès à tout le catalogue pour gestion [cite: 16, 25]
        if (role === 'DIRECTION' || role === 'PROFESSEUR') {
            const result = await db.query('SELECT * FROM authentification.cours ORDER BY classe, titre');
            return res.status(200).json(result.rows);
        }

        // 2. ÉLÈVE : Étanchéité numérique stricte 
        // Il ne voit QUE les cours de sa propre classe 
        if (role === 'ELEVE') {
            const result = await db.query(
                'SELECT * FROM authentification.cours WHERE classe = $1 ORDER BY titre',
                [classe]
            );
            return res.status(200).json(result.rows);
        }

        // 3. Sécurité par défaut pour les autres rôles (PARENTS, ALUMNI, etc.)
        // Un parent n'a pas accès au catalogue complet des cours [cite: 42]
        res.status(403).json({ message: "Accès non autorisé à cet espace de cours." });

    } catch (err) {
        console.error("Erreur récupération cours:", err.message);
        res.status(500).json({ message: "Erreur serveur lors de la récupération" });
    }
};