const db = require('../config/db');

// Retourne des statistiques pour le dashboard d'administration
exports.getStats = async (req, res) => {
    // Contrôle simple de rôle (attendre que le token fournisse 'role')
    const role = req.user && req.user.role ? req.user.role : null;
    if (!role) return res.status(403).json({ message: 'Rôle non défini.' });

    // Autoriser les directions et surveillants et tout rôle admin-like
    const allowed = ['DIRECTION', 'SURVEILLANT', 'ADMIN'];
    if (!allowed.includes(role.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé pour ce rôle.' });
    }

    try {
        const stats = {
            users: 0,
            courses: 0,
            classes: 0,
            professors: 0,
            absences: 0,
            alerts: 0
        };

        // Utilise des requêtes tolérantes : si une table n'existe pas, on ignore l'erreur
        try {
            const r1 = await db.query('SELECT COUNT(*) FROM authentification.comptes');
            stats.users = r1.rows[0].count || 0;
        } catch (e) {}

        try {
            const r2 = await db.query('SELECT COUNT(*) FROM authentification.cours');
            stats.courses = r2.rows[0].count || 0;
        } catch (e) {}

        // Tentatives optionnelles pour d'autres compteurs
        try {
            const r3 = await db.query("SELECT COUNT(DISTINCT classe) FROM authentification.comptes");
            stats.classes = r3.rows[0].count || 0;
        } catch (e) {}

        try {
            const r4 = await db.query("SELECT COUNT(*) FROM authentification.professeurs");
            stats.professors = r4.rows[0].count || 0;
        } catch (e) {}

        try {
            const r5 = await db.query("SELECT COUNT(*) FROM gestion.absences");
            stats.absences = r5.rows[0].count || 0;
        } catch (e) {}

        try {
            const r6 = await db.query("SELECT COUNT(*) FROM communication.alertes WHERE lu = false");
            stats.alerts = r6.rows[0].count || 0;
        } catch (e) {}

        res.json({ success: true, stats });
    } catch (err) {
        console.error('Erreur getStats:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};
