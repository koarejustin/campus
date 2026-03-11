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

        // Compter les élèves actifs
        try {
            const r1 = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel = 'ELEVE' AND est_actif = true");
            stats.users = parseInt(r1.rows[0].count) || 0;
        } catch (e) {}

        // Compter les professeurs actifs
        try {
            const r4 = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel = 'PROFESSEUR' AND est_actif = true");
            stats.professors = parseInt(r4.rows[0].count) || 0;
        } catch (e) {}

        // Compter les classes distinctes
        try {
            const r3 = await db.query("SELECT COUNT(DISTINCT classe_actuelle) FROM vie_scolaire.profils_eleves WHERE classe_actuelle IS NOT NULL");
            stats.classes = parseInt(r3.rows[0].count) || 0;
        } catch (e) {}

        // Compter les surveillants
        try {
            const r7 = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel = 'SURVEILLANT' AND est_actif = true");
            stats.surveillants = parseInt(r7.rows[0].count) || 0;
        } catch (e) {}

        // Compter les absences non justifiées du mois
        try {
            const r5 = await db.query("SELECT COUNT(*) FROM gestion.absences WHERE justifiee = false AND date_absence >= date_trunc('month', NOW())");
            stats.absences = parseInt(r5.rows[0].count) || 0;
        } catch (e) {}

        // Compter les convocations en attente
        try {
            const r6 = await db.query("SELECT COUNT(*) FROM gestion.convocations WHERE date_convocation >= NOW()");
            stats.alerts = parseInt(r6.rows[0].count) || 0;
        } catch (e) {}

        // Compter les parents
        try {
            const r8 = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel = 'PARENT' AND est_actif = true");
            stats.parents = parseInt(r8.rows[0].count) || 0;
        } catch (e) {}

        // Taux de présence (approx: élèves sans absence ce mois / total élèves)
        try {
            const rAbs = await db.query("SELECT COUNT(DISTINCT id_eleve) FROM gestion.absences WHERE date_absence >= date_trunc('month', NOW())");
            const absCount = parseInt(rAbs.rows[0].count) || 0;
            const total = stats.users > 0 ? stats.users : 1;
            stats.presence = Math.round(((total - absCount) / total) * 100);
        } catch (e) { stats.presence = 95; }

        res.json({ success: true, stats });
    } catch (err) {
        console.error('Erreur getStats:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};
