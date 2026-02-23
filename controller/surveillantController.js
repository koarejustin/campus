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
/**
 * Enregistrer une absence d'élève (Cahier des charges: Surveillants gèrent les absences)
 * Visible uniquement pour l'élève et son parent (confidentialité stricte)
 */
exports.recordAbsence = async (req, res) => {
    const { id_eleve, date, justification, raison } = req.body;
    const role = req.user?.role;

    // Vérification: Seuls les surveillants et direction peuvent enregistrer des absences
    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé. Seuls les surveillants et directeurs peuvent enregistrer des absences.' });
    }

    try {
        // Insérer l'absence dans la base
        const query = `
            INSERT INTO gestion.absences (id_eleve, date_absence, justifiee, raison_absence, enregistre_par)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [id_eleve, date, justification || false, raison, req.user.id];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Absence enregistrée avec succès',
            absence: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur enregistrement absence:', error);
        res.status(500).json({ message: 'Erreur lors de l\'enregistrement de l\'absence' });
    }
};

// Consulter toutes les absences (filtrable par classe ou élève)
exports.getAbsences = async (req, res) => {
    const { classe, id_eleve, justifiee } = req.query;
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
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;

        if (classe) {
            query += ` AND p.classe_actuelle ILIKE $${paramIndex}`;
            values.push(`%${classe}%`);
            paramIndex++;
        }

        if (id_eleve) {
            query += ` AND a.id_eleve = $${paramIndex}`;
            values.push(id_eleve);
            paramIndex++;
        }

        if (justifiee) {
            query += ` AND a.justifiee = $${paramIndex}`;
            values.push(justifiee === 'true');
            paramIndex++;
        }

        query += ` ORDER BY a.date_absence DESC`;

        const result = await db.query(query, values);
        res.json({
            count: result.rows.length,
            absences: result.rows
        });
    } catch (error) {
        console.error('Erreur consultation absences:', error);
        res.status(500).json({ message: 'Erreur lors de la consultation des absences' });
    }
};

// ============== GESTION DES CONVOCATIONS ==============
/**
 * Créer une convocation privée (Cahier des charges: Visible UNIQUEMENT élève + parent)
 * Les convocations sont privées et confidentiales
 */
exports.createConvocation = async (req, res) => {
    const { id_eleve, sujet, description, date_convocation, motif } = req.body;
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        // Créer la convocation
        const convocationQuery = `
            INSERT INTO gestion.convocations (id_eleve, sujet, description, date_convocation, motif, creee_par, date_creation)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [id_eleve, sujet, description, date_convocation, motif, req.user.id];
        const result = await db.query(convocationQuery, values);

        // Créer une notification pour l'élève ET son parent
        const notificationQuery = `
            INSERT INTO gestion.notifications (id_user, type, contenu, lue)
            SELECT $1, 'CONVOCATION', $2, false
            UNION ALL
            SELECT r.id_parent, 'CONVOCATION_ENFANT', $2, false
            FROM vie_scolaire.relations_parents_eleves r
            WHERE r.id_eleve = $1
        `;
        await db.query(notificationQuery, [id_eleve, `Convocation: ${sujet}`]);

        res.status(201).json({
            message: 'Convocation créée et envoyée à l\'élève et son parent',
            convocation: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur création convocation:', error);
        res.status(500).json({ message: 'Erreur lors de la création de la convocation' });
    }
};

// Récupérer les convocations créées
exports.getConvocations = async (req, res) => {
    const { id_eleve, statut } = req.query;
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
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
        let paramIndex = 1;

        if (id_eleve) {
            query += ` AND c.id_eleve = $${paramIndex}`;
            values.push(id_eleve);
            paramIndex++;
        }

        if (statut) {
            query += ` AND c.statut = $${paramIndex}`;
            values.push(statut);
            paramIndex++;
        }

        query += ` ORDER BY c.date_creation DESC`;

        const result = await db.query(query, values);
        res.json({
            count: result.rows.length,
            convocations: result.rows
        });
    } catch (error) {
        console.error('Erreur consultation convocations:', error);
        res.status(500).json({ message: 'Erreur lors de la consultation des convocations' });
    }
};

// ============== COHÉSION SCOLAIRE & PRÉVENTION ==============
/**
 * Envoyer un message de prévention/sensibilisation (section II du cahier des charges)
 * Destiné à toute l'école ou une classe spécifique
 */
exports.sendPreventionMessage = async (req, res) => {
    const { titre, contenu, destinataires, type_classe } = req.body; // type_classe: 'TOUT', 'CLASSE_X', etc.
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const messageQuery = `
            INSERT INTO gestion.messages_prevention (titre, contenu, destinataires, type_destinataires, creee_par, date_creation)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [titre, contenu, JSON.stringify(destinataires), type_classe, req.user.id];
        const result = await db.query(messageQuery, values);

        res.status(201).json({
            message: 'Message de prévention envoyé avec succès',
            prevention_message: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur envoi message prévention:', error);
        res.status(500).json({ message: 'Erreur lors de l\'envoi du message de prévention' });
    }
};

// Signaler une tension ou incident (Médiation)
exports.reportIncident = async (req, res) => {
    const { titre, description, type_incident, eleves_impliques, urgence } = req.body;
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const incidentQuery = `
            INSERT INTO gestion.incidents (titre, description, type_incident, eleves_impliques, urgence, signale_par, date_signalement)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [titre, description, type_incident, JSON.stringify(eleves_impliques), urgence, req.user.id];
        const result = await db.query(incidentQuery, values);

        // Créer une notification pour la direction
        const notificationDir = `
            INSERT INTO gestion.notifications (id_user, type, contenu, lue)
            SELECT prof.id_parent, 'INCIDENT', $1, false
            FROM authentification.comptes prof
            WHERE prof.role_actuel = 'DIRECTION'
        `;
        await db.query(notificationDir, [`Incident signalé: ${titre}`]);

        res.status(201).json({
            message: 'Incident signalé avec succès',
            incident: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur signalement incident:', error);
        res.status(500).json({ message: 'Erreur lors du signalement de l\'incident' });
    }
};

// ============== RÉCUPÉRER LES INCIDENTS ==============
exports.getIncidents = async (req, res) => {
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const query = `
            SELECT * FROM gestion.incidents
            ORDER BY date_signalement DESC
            LIMIT 50
        `;
        const result = await db.query(query);

        res.json({
            count: result.rows.length,
            incidents: result.rows || []
        });
    } catch (error) {
        console.error('Erreur récupération incidents:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

// Récupérer les surveillants avec leur statut
exports.getSurveillants = async (req, res) => {
    const role = req.user?.role;

    if (!['SURVEILLANT', 'DIRECTION', 'ADMIN'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const query = `
            SELECT 
                c.id_user,
                c.code_unique as matricule,
                c.nom,
                c.prenom,
                adm.poste_occupe as fonction,
                adm.signature_numerique_active,
                c.created_at as date_embauche,
                COUNT(DISTINCT a.id_eleve) as absences_enregistrees,
                COUNT(DISTINCT conv.id_eleve) as convocations_creees
            FROM authentification.comptes c
            JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
            LEFT JOIN gestion.absences a ON c.id_user = a.enregistre_par
            LEFT JOIN gestion.convocations conv ON c.id_user = conv.creee_par
            WHERE c.role_actuel = 'SURVEILLANT'
            GROUP BY c.id_user, adm.poste_occupe, adm.signature_numerique_active
            ORDER BY c.nom, c.prenom
        `;
        const result = await db.query(query);

        res.json({
            count: result.rows.length,
            surveillants: result.rows
        });
    } catch (error) {
        console.error('Erreur récupération surveillants:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des surveillants' });
    }
};

// ============== CANAL OFFICIEL (DIFFUSION GÉNÉRALE) ==============
/**
 * Publier un communiqué officiel (Direction + Surveillants)
 * Visible par TOUS les élèves et parents (section III du cahier)
 */
exports.publishOfficialAnnouncement = async (req, res) => {
    const { titre, contenu, type_annonce, destinataires } = req.body;
    const role = req.user?.role;

    if (!['DIRECTION', 'SURVEILLANT'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Seule la direction et les surveillants peuvent publier des annonces officielles' });
    }

    try {
        const query = `
            INSERT INTO gestion.annonces_officielles (titre, contenu, type, publie_par, date_publication)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const values = [titre, contenu, type_annonce, req.user.id];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Annonce officielle publiée',
            announcement: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur publication annonce:', error);
        res.status(500).json({ message: 'Erreur lors de la publication de l\'annonce' });
    }
};

// ============== JUSTIFICATION ABSENCE ==============
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

// ============== MESSAGES & COMMUNICATIONS ==============
exports.sendMessage = async (req, res) => {
    const { id_destinataire, contenu, type, est_privee } = req.body;

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

// ============== ANNONCES ==============
exports.getAnnouncements = async (req, res) => {
    try {
        const query = `
            SELECT a.*, c.nom, c.prenom
            FROM gestion.annonces_officielles a
            JOIN authentification.comptes c ON a.publie_par = c.id_user
            ORDER BY a.date_publication DESC
            LIMIT 20
        `;
        const result = await db.query(query);
        res.json(result.rows || []);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json([]);
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
            LIMIT 10
        `;
        const result = await db.query(query);
        res.json(result.rows || []);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json([]);
    }
};

// ============== UPLOAD PHOTO PROFIL ==============
exports.uploadPhoto = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });

        // Construire l'URL publique
        const filename = req.file.filename;
        const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

        // S'assurer que la colonne existe (migration légère)
        try {
            await db.query(`ALTER TABLE authentification.profils_administratifs ADD COLUMN IF NOT EXISTS photo_url TEXT`);
        } catch (e) { /* ignore */ }

        // Tenter UPDATE, sinon INSERT
        const updateRes = await db.query(
            `UPDATE authentification.profils_administratifs SET photo_url = $1 WHERE id_user = $2 RETURNING *`,
            [photoUrl, userId]
        );

        if (updateRes.rows.length === 0) {
            // Insérer une ligne minimale
            await db.query(
                `INSERT INTO authentification.profils_administratifs (id_user, poste_occupe, signature_numerique_active, photo_url)
                 VALUES ($1, $2, $3, $4)`,
                [userId, 'Surveillant', false, photoUrl]
            );
        }

        res.json({ message: 'Photo enregistrée', photo_url: photoUrl });
    } catch (error) {
        console.error('Erreur upload photo:', error);
        res.status(500).json({ message: 'Erreur lors de l\'upload de la photo' });
    }
};
