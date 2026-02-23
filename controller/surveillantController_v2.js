/**
 * ENHANCED SURVEILLANT CONTROLLER
 * Toutes les fonctionnalités réelles avec données de base
 */

const db = require('../config/db');

// ============== RÉCUPÉRER LES ÉLÈVES ==============
exports.getElevesForClass = async (req, res) => {
    const { classe } = req.query;
    try {
        const query = `
            SELECT 
                c.id_user,
                c.code_unique,
                c.nom,
                c.prenom,
                p.classe_actuelle
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves p ON c.id_user = p.id_user
            WHERE c.role_actuel = 'ELEVE'
            ${classe ? `AND p.classe_actuelle ILIKE $1` : ''}
            ORDER BY c.nom, c.prenom
        `;
        const values = classe ? [`%${classe}%`] : [];
        const result = await db.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur récupération élèves:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

// ============== STATISTIQUES SURVEILLANT ==============
exports.getSurveillantStats = async (req, res) => {
    const userId = req.user?.id;
    try {
        const stats = {};

        // Absences enregistrées
        try {
            const absences = await db.query(
                `SELECT COUNT(*) as count FROM gestion.absences WHERE enregistre_par = $1`,
                [userId]
            );
            stats.absences = absences.rows[0]?.count || 0;
        } catch (e) { stats.absences = 0; }

        // Absences non justifiées
        try {
            const nonJustified = await db.query(
                `SELECT COUNT(*) as count FROM gestion.absences WHERE justifiee = false AND date_absence >= NOW() - INTERVAL '30 days'`,
                []
            );
            stats.absences_non_justifiees = nonJustified.rows[0]?.count || 0;
        } catch (e) { stats.absences_non_justifiees = 0; }

        // Convocations créées
        try {
            const convos = await db.query(
                `SELECT COUNT(*) as count FROM gestion.convocations WHERE creee_par = $1`,
                [userId]
            );
            stats.convocations = convos.rows[0]?.count || 0;
        } catch (e) { stats.convocations = 0; }

        // Incidents signalés
        try {
            const incidents = await db.query(
                `SELECT COUNT(*) as count FROM gestion.incidents WHERE signale_par = $1`,
                [userId]
            );
            stats.incidents = incidents.rows[0]?.count || 0;
        } catch (e) { stats.incidents = 0; }

        res.json(stats);
    } catch (error) {
        console.error('Erreur statistiques:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

// ============== GESTION DES ABSENCES ==============
exports.recordAbsence = async (req, res) => {
    const { id_eleve, date, justification, raison } = req.body;
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const query = `
            INSERT INTO gestion.absences (id_eleve, date_absence, justifiee, raison_absence, enregistre_par, created_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [id_eleve, date, justification || false, raison, req.user.id];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Absence enregistrée',
            absence: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur absence:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

exports.getAbsences = async (req, res) => {
    const { classe, justifiee, days = 30 } = req.query;
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        let query = `
            SELECT 
                a.*,
                c.code_unique,
                c.nom,
                c.prenom,
                p.classe_actuelle
            FROM gestion.absences a
            JOIN authentification.comptes c ON a.id_eleve = c.id_user
            JOIN vie_scolaire.profils_eleves p ON c.id_user = p.id_user
            WHERE a.date_absence >= NOW() - INTERVAL '${parseInt(days)} days'
        `;
        const values = [];

        if (classe) {
            query += ` AND p.classe_actuelle ILIKE $${values.length + 1}`;
            values.push(`%${classe}%`);
        }

        if (justifiee !== undefined) {
            query += ` AND a.justifiee = $${values.length + 1}`;
            values.push(justifiee === 'true');
        }

        query += ` ORDER BY a.date_absence DESC`;
        const result = await db.query(query, values);

        res.json({
            count: result.rows.length,
            absences: result.rows
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

exports.updateAbsenceJustification = async (req, res) => {
    const { id_absence, justifiee } = req.body;
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const query = `
            UPDATE gestion.absences 
            SET justifiee = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id_absence = $2
            RETURNING *
        `;
        const result = await db.query(query, [justifiee, id_absence]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Absence non trouvée' });
        }

        res.json({ message: 'Justification mise à jour', absence: result.rows[0] });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

// ============== GESTION DES CONVOCATIONS ==============
exports.createConvocation = async (req, res) => {
    const { id_eleve, sujet, description, date_convocation, motif } = req.body;
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const query = `
            INSERT INTO gestion.convocations (id_eleve, sujet, description, date_convocation, motif, creee_par, date_creation)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [id_eleve, sujet, description, date_convocation, motif, req.user.id];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Convocation créée et envoyée',
            convocation: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

exports.getConvocations = async (req, res) => {
    const { id_eleve } = req.query;
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION', 'ELEVE', 'PARENT'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        let query = `
            SELECT 
                c.*,
                comp.code_unique,
                comp.nom,
                comp.prenom,
                p.classe_actuelle
            FROM gestion.convocations c
            JOIN authentification.comptes comp ON c.id_eleve = comp.id_user
            JOIN vie_scolaire.profils_eleves p ON comp.id_user = p.id_user
            WHERE 1=1
        `;
        const values = [];

        if (id_eleve) {
            query += ` AND c.id_eleve = $${values.length + 1}`;
            values.push(id_eleve);
        }

        query += ` ORDER BY c.date_creation DESC`;
        const result = await db.query(query, values);

        res.json({
            count: result.rows.length,
            convocations: result.rows
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

// ============== GESTION DES INCIDENTS ==============
exports.reportIncident = async (req, res) => {
    const { titre, description, type_incident, eleves_impliques, urgence } = req.body;
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const query = `
            INSERT INTO gestion.incidents (titre, description, type_incident, eleves_impliques, urgence, signale_par, date_signalement)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [titre, description, type_incident, JSON.stringify(eleves_impliques), urgence, req.user.id];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Incident signalé',
            incident: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

exports.getIncidents = async (req, res) => {
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const query = `
            SELECT * FROM gestion.incidents
            ORDER BY date_signalement DESC
        `;
        const result = await db.query(query);

        res.json({
            count: result.rows.length,
            incidents: result.rows
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

// ============== MESSAGES & COMMUNICATIONS ==============
exports.sendMessage = async (req, res) => {
    const { id_destinataire, contenu, type, est_privee } = req.body;
    const role = req.user?.role;

    try {
        const query = `
            INSERT INTO gestion.messages (id_expediteur, id_destinataire, contenu, type, est_privee, date_envoi)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [req.user.id, id_destinataire, contenu, type, est_privee || false];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Message envoyé',
            msg: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

exports.getMessages = async (req, res) => {
    const userId = req.user?.id;
    const { id_autre_user } = req.query;

    try {
        const query = `
            SELECT * FROM gestion.messages
            WHERE (id_expediteur = $1 OR id_destinataire = $1)
            ${id_autre_user ? `AND (id_expediteur = $2 OR id_destinataire = $2)` : ''}
            ORDER BY date_envoi DESC
            LIMIT 50
        `;
        const values = [userId];
        if (id_autre_user) values.push(id_autre_user);

        const result = await db.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

// ============== ANNONCES OFFICIELLES ==============
exports.publishAnnouncement = async (req, res) => {
    const { titre, contenu, type_annonce } = req.body;
    const role = req.user?.role;

    if (!['DIRECTION', 'SURVEILLANT'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const query = `
            INSERT INTO gestion.annonces (titre, contenu, type, publie_par, date_publication)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [titre, contenu, type_annonce, req.user.id];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Annonce publiée',
            announcement: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        const query = `
            SELECT * FROM gestion.annonces
            ORDER BY date_publication DESC
            LIMIT 20
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

// ============== PLANIFICATION ACTIVITÉS ==============
exports.createActivity = async (req, res) => {
    const { titre, description, date_debut, date_fin, type_activite } = req.body;
    const role = req.user?.role;

    if (!['DIRECTION', 'SURVEILLANT'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const query = `
            INSERT INTO gestion.activites (titre, description, date_debut, date_fin, type_activite, planifiee_par, date_creation)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [titre, description, date_debut, date_fin, type_activite, req.user.id];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Activité planifiée',
            activity: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

exports.getActivities = async (req, res) => {
    try {
        const query = `
            SELECT * FROM gestion.activites
            WHERE date_debut >= NOW()
            ORDER BY date_debut ASC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};
