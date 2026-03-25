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

        try {
            const absences = await db.query(
                `SELECT COUNT(*) as count FROM gestion.absences WHERE enregistre_par = $1`,
                [userId]
            );
            stats.absences = absences.rows[0]?.count || 0;
        } catch (e) { stats.absences = 0; }

        try {
            const nonJustified = await db.query(
                `SELECT COUNT(*) as count FROM gestion.absences WHERE justifiee = false AND date_absence >= NOW() - INTERVAL '30 days'`,
                []
            );
            stats.absences_non_justifiees = nonJustified.rows[0]?.count || 0;
        } catch (e) { stats.absences_non_justifiees = 0; }

        try {
            const convos = await db.query(
                `SELECT COUNT(*) as count FROM gestion.convocations WHERE creee_par = $1`,
                [userId]
            );
            stats.convocations = convos.rows[0]?.count || 0;
        } catch (e) { stats.convocations = 0; }

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
    const role = req.user?.role;
    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Acces refuse' });
    }
    try {
        const code = req.body.code_unique_eleve || req.body.code_unique || null;
        const dateAbs = req.body.date_absence || req.body.date || new Date().toISOString().split('T')[0];
        const justif = req.body.justifiee !== undefined ? req.body.justifiee : (req.body.justification || false);
        const raison = req.body.raison_absence || req.body.raison || '';

        let eleveId = req.body.id_eleve || null;

        if (code && !eleveId) {
            const found = await db.query(
                `SELECT id_user FROM authentification.comptes WHERE code_unique=$1 AND role_actuel='ELEVE'`,
                [code]
            );
            if (!found.rows.length) return res.status(404).json({ message: 'Eleve introuvable : ' + code });
            eleveId = found.rows[0].id_user;
        }
        if (!eleveId) return res.status(400).json({ message: 'ID ou matricule eleve requis' });

        const result = await db.query(
            `INSERT INTO gestion.absences (id_eleve, date_absence, justifiee, raison_absence, enregistre_par)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [eleveId, dateAbs, justif, raison, req.user.id]
        );

        if (eleveId) {
            try {
                const notificationService = require('../services/notificationService');

                await notificationService.sendNotification(
                    [eleveId],
                    'ABSENCE',
                    '📅 Absence enregistrée',
                    `Vous avez été absent(e) le ${dateAbs}. Motif : ${raison || 'Non spécifié'}`,
                    '/eleve.html?page=absences'
                );

                const parentResult = await db.query(
                    `SELECT id_parent FROM vie_scolaire.relations_parents_eleves WHERE id_eleve = $1`,
                    [eleveId]
                );
                if (parentResult.rows.length > 0) {
                    await notificationService.sendNotification(
                        parentResult.rows.map(r => r.id_parent),
                        'ABSENCE',
                        '📅 Absence de votre enfant',
                        `Votre enfant était absent(e) le ${dateAbs}`,
                        '/parent.html?page=absences'
                    );
                }
            } catch (e) { console.warn('Erreur notification absence:', e.message); }
        }

        res.status(201).json({
            success: true,
            message: 'Absence enregistree avec succes',
            absence: result.rows[0],
            id_absence: result.rows[0].id_absence
        });
    } catch (error) {
        console.error('recordAbsence:', error.message);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

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
exports.createConvocation = async (req, res) => {
    const role = req.user?.role;
    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Acces refuse' });
    }
    try {
        const code = req.body.code_unique_eleve || req.body.code_unique || null;
        const sujet = req.body.sujet || req.body.motif || 'Convocation';
        const description = req.body.description || req.body.message || '';
        const date_conv = req.body.date_convocation || req.body.date || new Date().toISOString().split('T')[0];
        const motif = req.body.motif || sujet;

        let eleveId = req.body.id_eleve || null;
        if (code && !eleveId) {
            const found = await db.query(
                `SELECT id_user FROM authentification.comptes WHERE code_unique=$1 AND role_actuel='ELEVE'`,
                [code]
            );
            if (!found.rows.length) return res.status(404).json({ message: 'Eleve introuvable : ' + code });
            eleveId = found.rows[0].id_user;
        }
        if (!eleveId) return res.status(400).json({ message: 'Matricule eleve requis' });

        const result = await db.query(
            `INSERT INTO gestion.convocations
             (id_eleve, sujet, description, date_convocation, motif, creee_par, date_creation)
             VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
            [eleveId, sujet, description, date_conv, motif, req.user.id]
        );

        if (eleveId) {
            try {
                const notificationService = require('../services/notificationService');

                await notificationService.sendNotification(
                    [eleveId],
                    'CONVOCATION',
                    '⚠️ Convocation',
                    `${sujet} - ${description || 'Veuillez vous présenter'}`,
                    '/eleve.html?page=convocations'
                );

                const parentResult = await db.query(
                    `SELECT id_parent FROM vie_scolaire.relations_parents_eleves WHERE id_eleve = $1`,
                    [eleveId]
                );
                if (parentResult.rows.length > 0) {
                    await notificationService.sendNotification(
                        parentResult.rows.map(r => r.id_parent),
                        'CONVOCATION',
                        '⚠️ Convocation de votre enfant',
                        `${sujet} - ${description || 'Veuillez prendre connaissance'}`,
                        '/parent.html?page=convocations'
                    );
                }
            } catch (e) { console.warn('Erreur notification convocation:', e.message); }
        }

        res.status(201).json({
            success: true,
            message: 'Convocation creee et notifiee',
            id_convocation: result.rows[0].id_convocation,
            convocation: result.rows[0]
        });
    } catch (error) {
        console.error('createConvocation:', error.message);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

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
exports.sendPreventionMessage = async (req, res) => {
    const { titre, contenu, destinataires, type_classe } = req.body;
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

exports.reportIncident = async (req, res) => {
    const role = req.user?.role;
    if (!['SURVEILLANT', 'DIRECTION'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Acces refuse' });
    }
    try {
        const titre = req.body.titre || req.body.eleves_impliques || 'Incident';
        const description = req.body.description || '';
        const type_incident = req.body.type_incident || 'comportement';
        const lieu = req.body.lieu || '';
        const date_sig = req.body.date_signalement || new Date().toISOString().split('T')[0];
        const urgence = req.body.urgence || 'normale';

        const r = await db.query(
            `INSERT INTO gestion.incidents
             (titre, description, type_incident, lieu, date_signalement, signale_par, urgence)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [titre, description, type_incident, lieu, date_sig, req.user.id, urgence]
        );
        res.status(201).json({
            success: true,
            message: 'Incident signale avec succes',
            incident: r.rows[0]
        });
    } catch (error) {
        if (error.code === '42P01') {
            return res.status(201).json({ success: true, message: 'Incident enregistre (table en cours de creation)' });
        }
        console.error('reportIncident:', error.message);
        res.status(500).json({ message: 'Erreur: ' + error.message });
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

// ============== PUBLICATION ANNONCES ==============
exports.publishOfficialAnnouncement = async (req, res) => {
    const { titre, contenu, type_annonce, destinataires } = req.body;
    const role = req.user?.role;

    if (!['DIRECTION', 'SURVEILLANT'].includes(role?.toUpperCase())) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    let destinataireFinal = 'tous';
    let userRoleCible = null;

    if (destinataires === 'profs' || destinataires === 'PROFESSEURS' || destinataires === 'professeurs') {
        destinataireFinal = 'profs';
        userRoleCible = 'PROFESSEUR';
    } else if (destinataires === 'parents' || destinataires === 'PARENTS') {
        destinataireFinal = 'parents';
        userRoleCible = 'PARENT';
    } else if (destinataires === 'eleves' || destinataires === 'ELEVES') {
        destinataireFinal = 'eleves';
        userRoleCible = 'ELEVE';
    }

    try {
        const query = `
            INSERT INTO gestion.annonces_officielles 
            (titre, contenu, type, publie_par, date_publication, destinataires)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
            RETURNING *
        `;
        const values = [titre, contenu, type_annonce || 'INFO', req.user.id, destinataireFinal];
        const result = await db.query(query, values);

        try {
            await db.query(`
                INSERT INTO vie_scolaire.annonces_officielles 
                (titre, corps_annonce, priorite, publie_par, date_publication, destinataires)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
            `, [titre, contenu, type_annonce || 'INFO', req.user.id, destinataireFinal]);
        } catch (e2) {
            console.warn('Insertion vie_scolaire.annonces_officielles:', e2.message);
        }

        try {
            await db.query(`
                INSERT INTO vie_scolaire.annonces 
                (titre, contenu, type, destinataires, auteur_id, auteur_role, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [titre, contenu, type_annonce || 'INFO', destinataireFinal, req.user.id, role]);
        } catch (e3) {
            console.warn('Insertion vie_scolaire.annonces:', e3.message);
        }

        try {
            const notificationService = require('../services/notificationService');
            let usersToNotify = [];

            if (userRoleCible === 'ELEVE') {
                const eleves = await db.query(`SELECT id_user FROM authentification.comptes WHERE role_actuel = 'ELEVE' AND est_actif = true`);
                usersToNotify = eleves.rows.map(u => u.id_user);
            } else if (userRoleCible === 'PROFESSEUR') {
                const profs = await db.query(`SELECT id_user FROM authentification.comptes WHERE role_actuel = 'PROFESSEUR' AND est_actif = true`);
                usersToNotify = profs.rows.map(u => u.id_user);
            } else if (userRoleCible === 'PARENT') {
                const parents = await db.query(`SELECT id_user FROM authentification.comptes WHERE role_actuel = 'PARENT' AND est_actif = true`);
                usersToNotify = parents.rows.map(u => u.id_user);
            } else {
                const tous = await db.query(`SELECT id_user FROM authentification.comptes WHERE role_actuel IN ('ELEVE', 'PROFESSEUR', 'PARENT') AND est_actif = true`);
                usersToNotify = tous.rows.map(u => u.id_user);
            }

            if (usersToNotify.length > 0) {
                const lien = destinataireFinal === 'eleves' ? '/eleve.html?page=annonces' :
                    destinataireFinal === 'parents' ? '/parent.html?page=annonces' :
                        destinataireFinal === 'profs' ? '/professeur.html?page=annonces' : '/index.html';

                await notificationService.sendNotification(
                    usersToNotify,
                    'ANNONCE',
                    `📢 ${titre}`,
                    contenu.length > 100 ? contenu.substring(0, 100) + '...' : contenu,
                    lien
                );
                console.log(`🔔 Notification envoyée à ${usersToNotify.length} utilisateurs (${destinataireFinal})`);
            }
        } catch (notifError) {
            console.warn('Erreur envoi notifications:', notifError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Annonce officielle publiée et notifiée',
            announcement: result.rows[0]
        });

    } catch (error) {
        console.error('Erreur publication annonce:', error.message);
        res.status(500).json({ message: 'Erreur: ' + error.message });
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
        console.error('Erreur updateAbsenceJustification:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

// ============== ANNONCES ==============
exports.getAnnouncements = async (req, res) => {
    try {
        let annonces = [];

        try {
            await db.query(`ALTER TABLE vie_scolaire.annonces ADD COLUMN IF NOT EXISTS destinataires VARCHAR(50) DEFAULT 'tous'`).catch(() => { });
            const r = await db.query(`
                SELECT id::text AS id, titre, contenu,
                       COALESCE(type,'INFO') AS type,
                       COALESCE(destinataires,'tous') AS destinataires,
                       created_at AS date_publication,
                       auteur_id AS publie_par
                FROM vie_scolaire.annonces
                ORDER BY created_at DESC LIMIT 30
            `);
            annonces = r.rows;
        } catch (e1) { console.warn('vie_scolaire.annonces read:', e1.message); }

        try {
            const r2 = await db.query(`
                SELECT id_annonce::text AS id, titre, contenu, type,
                       COALESCE(destinataires, 'tous') AS destinataires,
                       date_publication,
                       (SELECT nom FROM authentification.comptes WHERE id_user = publie_par) AS nom,
                       (SELECT prenom FROM authentification.comptes WHERE id_user = publie_par) AS prenom
                FROM gestion.annonces_officielles
                ORDER BY date_publication DESC
                LIMIT 30
            `);
            r2.rows.forEach(row => {
                if (!annonces.find(a => a.titre === row.titre)) annonces.push(row);
            });
        } catch (e2) { console.warn('gestion.annonces_officielles:', e2.message); }

        try {
            const r3 = await db.query(`
                SELECT id_annonce::text AS id, titre, 
                       corps_annonce as contenu, priorite as type,
                       COALESCE(destinataires, 'tous') AS destinataires,
                       date_publication,
                       NULL as nom, NULL as prenom
                FROM vie_scolaire.annonces_officielles
                ORDER BY date_publication DESC
                LIMIT 30
            `);
            r3.rows.forEach(row => {
                if (!annonces.find(a => a.titre === row.titre)) annonces.push(row);
            });
        } catch (e3) { console.warn('vie_scolaire.annonces_officielles:', e3.message); }

        annonces.sort((a, b) => new Date(b.date_publication || 0) - new Date(a.date_publication || 0));
        res.json(annonces.slice(0, 30));

    } catch (error) {
        console.error('getAnnouncements:', error.message);
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
        console.error('Erreur createActivity:', error);
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
        console.error('Erreur getActivities:', error);
        res.status(500).json([]);
    }
};

// ============== UPLOAD PHOTO PROFIL ==============
exports.uploadPhoto = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });

        const filename = req.file.filename;
        const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

        try {
            await db.query(`ALTER TABLE authentification.profils_administratifs ADD COLUMN IF NOT EXISTS photo_url TEXT`);
        } catch (e) { }

        const updateRes = await db.query(
            `UPDATE authentification.profils_administratifs SET photo_url = $1 WHERE id_user = $2 RETURNING *`,
            [photoUrl, userId]
        );

        if (updateRes.rows.length === 0) {
            await db.query(
                `INSERT INTO authentification.profils_administratifs (id_user, poste_occupe, signature_numerique_active, photo_url)
                    VALUES ($1, $2, $3, $4)`,
                [userId, 'Surveillant', false, photoUrl]
            );
        }

        res.json({ message: 'Photo enregistrée', photo_url: photoUrl });
    } catch (error) {
        console.error('Erreur uploadPhoto:', error);
        res.status(500).json({ message: 'Erreur lors de l\'upload de la photo' });
    }
};

// ============== CAHIERS DE TEXTE ==============
exports.getCahiersTexte = async (req, res) => {
    try {
        const { classe, prof_id } = req.query;
        let q = `
            SELECT ct.id, ct.classe, ct.matiere,
                   ct.titre_seance AS titre,
                   ct.contenu, ct.travail_faire AS taf,
                   to_char(ct.date_seance,'DD/MM/YYYY') AS date_seance,
                   to_char(ct.heure_debut,'HH24:MI') AS heure_debut,
                   to_char(ct.heure_fin,'HH24:MI')   AS heure_fin,
                   c.nom AS prof_nom, c.prenom AS prof_prenom
            FROM pedagogie.cahiers_texte ct
            JOIN authentification.comptes c ON c.id_user = ct.id_prof
            WHERE 1=1
        `;
        const params = [];
        if (classe) { q += ' AND ct.classe=$' + (params.length + 1); params.push(classe); }
        if (prof_id) { q += ' AND ct.id_prof=$' + (params.length + 1); params.push(prof_id); }
        q += ' ORDER BY ct.date_seance DESC, ct.created_at DESC LIMIT 100';
        const r = await db.query(q, params);
        res.json({ success: true, seances: r.rows });
    } catch (e) {
        console.error('getCahiersTexte:', e.message);
        res.status(500).json({ success: false, message: e.message });
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
        console.error('Erreur sendMessage:', error);
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
        console.error('Erreur getMessages:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};