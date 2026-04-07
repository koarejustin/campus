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
        } catch (e) { }
        // LIGNE 59 - CORRIGÉ (utiliser pedagogie.ressources_pedagogiques si elle existe)
        try {
            const r2 = await db.query('SELECT COUNT(*) FROM pedagogie.ressources_pedagogiques');
            stats.courses = r2.rows[0].count || 0;
        } catch (e) { stats.courses = 0; }
        // Tentatives optionnelles pour d'autres compteurs
        try {
            const r3 = await db.query("SELECT COUNT(DISTINCT classe) FROM authentification.comptes");
            stats.classes = r3.rows[0].count || 0;
        } catch (e) { }

        try {
            const r4 = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='PROFESSEUR'");
            stats.professors = r4.rows[0].count || 0;
        } catch (e) { }

        try {
            const r5 = await db.query("SELECT COUNT(*) FROM gestion.absences");
            stats.absences = r5.rows[0].count || 0;
        } catch (e) { }
        // LIGNE 74 - CORRIGÉ
        try {
            const r6 = await db.query("SELECT COUNT(*) FROM gestion.notifications WHERE est_lu = false OR lue = false");
            stats.alerts = r6.rows[0].count || 0;
        } catch (e) { }
        // Moyennes par classe pour graphique performances
        try {
            const r7 = await db.query(`
                SELECT pe.classe_actuelle AS classe,
                       ROUND(AVG(n.note)::numeric,2) AS moyenne
                FROM pedagogie.notes_evaluations n
                JOIN vie_scolaire.profils_eleves pe ON pe.id_user = n.id_eleve
                WHERE n.trimestre = 1
                GROUP BY pe.classe_actuelle
            `);
            stats.moyennes_classes = {};
            r7.rows.forEach(r => { stats.moyennes_classes[r.classe] = parseFloat(r.moyenne); });
        } catch (e) { }

        // Nombre de surveillants
        try {
            const r8 = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='SURVEILLANT'");
            stats.surveillants = parseInt(r8.rows[0].count) || 0;
        } catch (e) { }

        // Moyenne générale tous élèves
        try {
            const rm = await db.query(`
                SELECT ROUND(AVG(note)::numeric,2) AS moy FROM pedagogie.notes_evaluations WHERE trimestre=1
            `);
            stats.moyenne_generale = rm.rows[0]?.moy || null;
        } catch (e) { }

        // Taux présence (100 - taux absence)
        try {
            const rp = await db.query(`
                SELECT COUNT(DISTINCT id_eleve)::float / NULLIF((SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='ELEVE'),0) * 100 AS taux_abs
                FROM gestion.absences WHERE date_absence >= NOW() - INTERVAL '30 days'
            `);
            const taux_abs = parseFloat(rp.rows[0]?.taux_abs) || 0;
            stats.presence = Math.round(100 - taux_abs);
        } catch (e) { stats.presence = 95; }

        res.json({ success: true, stats });
    } catch (err) {
        console.error('Erreur getStats:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};


// ═══════════════════════════════════════════
// PROFESSEURS (corps enseignant)
// ═══════════════════════════════════════════
exports.getProfesseurs = async (req, res) => {
    try {
        const r = await db.query(`
            SELECT c.id_user, c.code_unique, c.nom, c.prenom,
                   c.email, c.telephone, c.est_actif,
                   p.specialite, p.biographie, p.photo_url,
                   p.date_arrivee,
                   COUNT(DISTINCT ct.classe) AS nb_classes,
                   COUNT(DISTINCT ct.id)     AS nb_seances
            FROM authentification.comptes c
            LEFT JOIN pedagogie.profils_profs p ON p.id_user = c.id_user
            LEFT JOIN pedagogie.cahiers_texte ct ON ct.id_prof = c.id_user
            WHERE c.role_actuel = 'PROFESSEUR' AND c.est_actif = true
            GROUP BY c.id_user, c.code_unique, c.nom, c.prenom,
                     c.email, c.telephone, c.est_actif,
                     p.specialite, p.biographie, p.photo_url, p.date_arrivee
            ORDER BY c.nom, c.prenom
        `);
        res.json({
            success: true,
            professeurs: r.rows.map(p => ({
                id: p.id_user,
                id_user: p.id_user,
                code: p.code_unique,
                code_unique: p.code_unique,
                nom: p.nom,
                prenom: p.prenom,
                email: p.email,
                telephone: p.telephone,
                specialite: p.specialite || '',
                matiere: p.specialite || '',
                biographie: p.biographie || '',
                photo_url: p.photo_url || null,
                nb_classes: parseInt(p.nb_classes) || 0,
                nb_seances: parseInt(p.nb_seances) || 0,
                statut: 'Permanent',
                est_actif: p.est_actif
            }))
        });
    } catch (e) {
        console.error('getProfesseurs:', e.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// ═══════════════════════════════════════════
// CAHIERS DE TEXTE (liste globale)
// ═══════════════════════════════════════════
exports.getCahiersTexte = async (req, res) => {
    try {
        // Retourner les dernières séances avec infos prof
        const r = await db.query(`
            SELECT DISTINCT ON (ct.id_prof, ct.classe, ct.matiere)
                c.id_user        AS prof_id,
                c.nom            AS prof_nom,
                c.prenom         AS prof_prenom,
                ct.matiere,
                ct.classe,
                ct.titre_seance  AS titre,
                ct.contenu,
                ct.date_seance,
                COUNT(ct2.id) OVER (PARTITION BY ct.id_prof) AS nb_seances
            FROM pedagogie.cahiers_texte ct
            JOIN authentification.comptes c ON c.id_user = ct.id_prof
            LEFT JOIN pedagogie.cahiers_texte ct2 ON ct2.id_prof = ct.id_prof
            ORDER BY ct.id_prof, ct.classe, ct.matiere, ct.date_seance DESC
        `);
        res.json({
            success: true,
            cahiers: r.rows.map(row => ({
                prof_id: row.prof_id,
                prof_nom: row.prof_nom,
                prof_prenom: row.prof_prenom,
                matiere: row.matiere,
                classe: row.classe,
                titre: row.titre,
                contenu: row.contenu || '',
                date_seance: row.date_seance,
                nb_seances: parseInt(row.nb_seances) || 1
            }))
        });
    } catch (e) {
        console.error('getCahiersTexte:', e.message);
        res.json({ success: true, cahiers: [] }); // Ne pas bloquer si table vide
    }
};

// ═══════════════════════════════════════════
// CAHIER D'UN PROF (séances)
// ═══════════════════════════════════════════
exports.getCahierProf = async (req, res) => {
    try {
        const { prof_id } = req.params;

        // Résoudre prof_id : peut être UUID ou code_unique
        let realProfId = prof_id;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(prof_id);
        if (!isUUID) {
            const found = await db.query(
                'SELECT id_user FROM authentification.comptes WHERE code_unique=$1',
                [prof_id]
            );
            if (found.rows.length) realProfId = found.rows[0].id_user;
        }

        const r = await db.query(`
            SELECT ct.id, ct.classe, ct.matiere,
                   ct.titre_seance AS titre,
                   ct.contenu, ct.travail_faire AS taf,
                   to_char(ct.date_seance,'DD/MM/YYYY') AS date_seance,
                   to_char(ct.date_seance,'YYYY-MM-DD') AS date_iso,
                   to_char(ct.heure_debut,'HH24:MI') AS heure_debut,
                   to_char(ct.heure_fin,'HH24:MI')   AS heure_fin,
                   c.nom, c.prenom
            FROM pedagogie.cahiers_texte ct
            JOIN authentification.comptes c ON c.id_user = ct.id_prof
            WHERE ct.id_prof = $1
            ORDER BY ct.date_seance DESC, ct.created_at DESC
            LIMIT 100
        `, [realProfId]);
        res.json({
            success: true,
            seances: r.rows.map(s => ({
                id: s.id,
                classe: s.classe,
                matiere: s.matiere,
                titre: s.titre,
                titre_seance: s.titre,
                contenu: s.contenu || '',
                description: s.contenu || '',
                taf: s.taf || '',
                date_seance: s.date_seance,
                date: s.date_seance,
                date_iso: s.date_iso,
                heure_debut: s.heure_debut || '',
                heure_fin: s.heure_fin || '',
            }))
        });
    } catch (e) {
        console.error('getCahierProf:', e.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// ═══════════════════════════════════════════
// ÉLÈVE - FICHE DÉTAILLÉE
// ═══════════════════════════════════════════
exports.getEleveDetail = async (req, res) => {
    try {
        const { id } = req.params;
        // Accepter UUID ou code_unique
        const eleve = await db.query(`
            SELECT c.id_user, c.code_unique, c.nom, c.prenom,
                   c.email, c.telephone,
                   pe.classe_actuelle, pe.date_naissance,
                   COALESCE(pp.photo_url,'') AS photo_url
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            LEFT JOIN pedagogie.profils_profs pp ON pp.id_user = c.id_user
            WHERE c.id_user::text = $1 OR c.code_unique = $1
        `, [id]);
        if (!eleve.rows.length) return res.status(404).json({ message: 'Élève introuvable' });

        // Utiliser le vrai UUID pour les requêtes suivantes
        const realId = eleve.rows[0].id_user;

        // Notes
        const notes = await db.query(`
            SELECT n.note, n.trimestre, n.date_evaluation,
                   m.nom_matiere AS matiere, m.coefficient,
                   c.nom AS prof_nom, c.prenom AS prof_prenom
            FROM pedagogie.notes_evaluations n
            JOIN pedagogie.matieres m ON m.id_matiere = n.id_matiere
            JOIN authentification.comptes c ON c.id_user = n.id_professeur
            WHERE n.id_eleve = $1
            ORDER BY n.trimestre, m.nom_matiere
        `, [realId]);

        // Absences
        const absences = await db.query(`
            SELECT date_absence, justifiee, raison_absence
            FROM gestion.absences
            WHERE id_eleve = $1
            ORDER BY date_absence DESC LIMIT 20
        `, [realId]);

        res.json({
            success: true,
            eleve: eleve.rows[0],
            notes: notes.rows,
            absences: absences.rows
        });
    } catch (e) {
        console.error('getEleveDetail:', e.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// ═══════════════════════════════════════════
// ÉLÈVES - Liste pour direction
// ═══════════════════════════════════════════
exports.getElevesDir = async (req, res) => {
    try {
        const { classe, q } = req.query;
        let sql = `
            SELECT c.id_user, c.code_unique, c.nom, c.prenom,
                   c.email, c.telephone, c.est_actif,
                   pe.classe_actuelle AS classe,
                   ROUND(AVG(n.note)::numeric,1) AS moyenne,
                   COUNT(DISTINCT a.id_absence) AS nb_absences
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            LEFT JOIN pedagogie.notes_evaluations n ON n.id_eleve = c.id_user
            LEFT JOIN gestion.absences a ON a.id_eleve = c.id_user
            WHERE c.role_actuel = 'ELEVE' AND c.est_actif = true
        `;
        const params = [];
        if (classe) {
            // Utiliser ILIKE pour être insensible aux variantes d'encodage
            params.push(classe);
            sql += ' AND (pe.classe_actuelle = $' + params.length +
                ' OR pe.classe_actuelle ILIKE $' + params.length + ')';
        }
        if (q) {
            params.push('%' + q + '%', '%' + q + '%', '%' + q + '%');
            sql += ' AND (c.nom ILIKE $' + (params.length - 2) + ' OR c.prenom ILIKE $' + (params.length - 1) + ' OR c.code_unique ILIKE $' + params.length + ')';
        }
        sql += ' GROUP BY c.id_user, c.code_unique, c.nom, c.prenom, c.email, c.telephone, c.est_actif, pe.classe_actuelle';
        // Log pour debug
        console.log('getElevesDir — classe filtre:', JSON.stringify(classe));
        const lim = classe ? 100 : 500;
        sql += ' ORDER BY pe.classe_actuelle, c.nom LIMIT ' + lim;
        const r = await db.query(sql, params);
        res.json({
            success: true,
            eleves: r.rows.map(e => ({
                id_user: e.id_user,
                code_unique: e.code_unique,
                nom: e.nom,
                prenom: e.prenom,
                email: e.email,
                telephone: e.telephone,
                classe: e.classe,
                moyenne: e.moyenne,
                nb_absences: parseInt(e.nb_absences) || 0
            }))
        });
    } catch (e) {
        console.error('getElevesDir:', e.message);
        res.status(500).json({ success: false, eleves: [] });
    }
};

// ═══════════════════════════════════════════
// BULLETINS - pour signatures direction
// ═══════════════════════════════════════════
exports.getBulletins = async (req, res) => {
    try {
        const { trimestre = 1 } = req.query;
        const r = await db.query(`
            SELECT c.id_user, c.code_unique, c.nom, c.prenom,
                   pe.classe_actuelle AS classe,
                   ROUND(AVG(n.note)::numeric, 2) AS moyenne,
                   COUNT(n.id_evaluation) AS nb_notes,
                   false AS signe
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            LEFT JOIN pedagogie.notes_evaluations n
                ON n.id_eleve = c.id_user AND n.trimestre = $1
            WHERE c.role_actuel = 'ELEVE' AND c.est_actif = true
            GROUP BY c.id_user, c.code_unique, c.nom, c.prenom, pe.classe_actuelle
            HAVING COUNT(n.id_evaluation) > 0
            ORDER BY pe.classe_actuelle, c.nom
            LIMIT 100
        `, [parseInt(trimestre)]);
        res.json({ success: true, bulletins: r.rows });
    } catch (e) {
        res.json({ success: true, bulletins: [] });
    }
};

// ═══════════════════════════════════════════
// AGENDA
// ═══════════════════════════════════════════
exports.getAgenda = async (req, res) => {
    try {
        const r = await db.query(`
            SELECT id_activite AS id, titre, description,
                   to_char(date_debut,'DD/MM/YYYY HH24:MI') AS date_debut,
                   to_char(date_fin,'DD/MM/YYYY HH24:MI')   AS date_fin,
                   type_activite AS type
            FROM gestion.activites
            ORDER BY date_debut DESC LIMIT 50
        `);
        res.json({ success: true, evenements: r.rows });
    } catch (e) {
        res.json({ success: true, evenements: [] });
    }
};

exports.createAgenda = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { titre, description, date_debut, date_fin, type_activite } = req.body;
        if (!titre || !date_debut) return res.status(400).json({ message: 'Titre et date requis' });
        // Essayer avec planifiee_par, sinon sans
        try {
            await db.query(
                `INSERT INTO gestion.activites (titre, description, date_debut, date_fin, type_activite, planifiee_par)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [titre, description || '', date_debut, date_fin || date_debut, type_activite || 'general', userId]
            );
        } catch (e2) {
            // Si la colonne planifiee_par n'existe pas
            await db.query(
                `INSERT INTO gestion.activites (titre, description, date_debut, date_fin, type_activite)
                 VALUES ($1,$2,$3,$4,$5)`,
                [titre, description || '', date_debut, date_fin || date_debut, type_activite || 'general']
            );
        }
        res.json({ success: true, message: 'Evenement ajoute' });
    } catch (e) {
        console.error('createAgenda:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// MESSAGE VERS PROFS
// ═══════════════════════════════════════════
exports.messageProf = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { message, destinataire, prive } = req.body;
        if (!message) return res.status(400).json({ message: 'Message requis' });
        const user = await db.query(
            'SELECT nom, prenom, code_unique FROM authentification.comptes WHERE id_user=$1', [userId]
        );
        const row = user.rows[0] || {};
        const nom = (row.nom || 'Direction') + ' ' + (row.prenom || '');
        const fromCode = row.code_unique || 'DIR';

        // ── MESSAGE PRIVÉ : insérer dans pedagogie.messages_prives ──
        if (prive && destinataire) {
            try {
                // Résoudre le destinataire : peut être un id_user, un code_unique ou un nom
                let destId = null;
                // Essai par id direct (numérique)
                if (/^\d+$/.test(String(destinataire))) {
                    destId = parseInt(destinataire);
                } else {
                    // Sinon chercher par code_unique
                    const destRes = await db.query(
                        'SELECT id_user FROM authentification.comptes WHERE code_unique = $1 OR nom ILIKE $2 LIMIT 1',
                        [destinataire, '%' + destinataire + '%']
                    );
                    if (destRes.rows.length) destId = destRes.rows[0].id_user;
                }

                if (!destId) {
                    return res.status(404).json({ success: false, message: 'Professeur introuvable' });
                }

                await db.query(
                    `INSERT INTO pedagogie.messages_prives (expediteur_id, destinataire_id, contenu, lu, created_at)
                     VALUES ($1, $2, $3, false, NOW())`,
                    [userId, destId, message]
                );

                // Notification Socket.IO si disponible
                const io = req.app?.locals?.io;
                if (io) {
                    io.to('user-' + destId).emit('msg-prive', {
                        expediteur_nom: nom.trim(),
                        contenu: message,
                        created_at: new Date()
                    });
                }

                return res.json({ success: true, message: 'Message privé envoyé au professeur' });
            } catch (e2) {
                console.error('messageProf privé:', e2.message);
                return res.status(500).json({ message: 'Erreur envoi message privé: ' + e2.message });
            }
        }

        // ── MESSAGE GÉNÉRAL : insérer dans messages_salle ──
        let msgId = Date.now();
        try {
            const r = await db.query(
                `INSERT INTO pedagogie.messages_salle (conv_id, from_code, from_nom, contenu, type_msg)
                 VALUES ('general',$1,$2,$3,'text') RETURNING id, date_envoi`,
                [fromCode, nom.trim(), message]
            );
            msgId = r.rows[0].id;
        } catch (e2) { console.warn('insert messages_salle:', e2.message); }

        // Émettre via Socket.IO pour que les profs voient en temps réel
        const io = req.app?.locals?.io;
        if (io) {
            io.to('salle-profs').emit('msg-salle', {
                id: msgId,
                from: fromCode,
                nom: nom.trim(),
                txt: message,
                conv_id: 'general',
                type: 'text',
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                isDirection: true
            });
        }

        res.json({ success: true, message: 'Message envoyé dans la salle des profs' });
    } catch (e) {
        console.error('messageProf:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// CRÉER UN ÉLÈVE
// ═══════════════════════════════════════════
exports.createEleve = async (req, res) => {
    try {
        const { prenom, nom, classe, email, telephone } = req.body;
        if (!prenom || !nom || !classe) {
            return res.status(400).json({ message: 'Prénom, nom et classe requis' });
        }

        const bcrypt = require('bcrypt');

        // Générer un code unique
        const countR = await db.query(
            "SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='ELEVE'"
        );
        const nb = parseInt(countR.rows[0].count) || 0;
        const code = 'CN-2026-' + String(2000 + nb + 1).padStart(4, '0');

        // Mot de passe par défaut = code
        const hash = await bcrypt.hash(code, 10);

        // Créer le compte
        const r = await db.query(`
            INSERT INTO authentification.comptes
            (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
            VALUES ($1,$2,$3,$4,$5,$6,'ELEVE',true)
            RETURNING id_user, code_unique
        `, [code, nom.toUpperCase(), prenom, email || null, telephone || null, hash]);

        const eleveId = r.rows[0].id_user;

        // Créer le profil élève
        await db.query(`
            INSERT INTO vie_scolaire.profils_eleves (id_user, classe_actuelle)
            VALUES ($1, $2)
        `, [eleveId, classe]);

        res.json({
            success: true,
            message: 'Élève créé avec succès',
            code_unique: code,
            id_user: eleveId
        });
    } catch (e) {
        console.error('createEleve:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// CRÉER UN PROFESSEUR
// ═══════════════════════════════════════════
exports.createProfesseur = async (req, res) => {
    try {
        const { prenom, nom, specialite, email, telephone } = req.body;
        if (!prenom || !nom || !specialite) {
            return res.status(400).json({ message: 'Prenom, nom et specialite requis' });
        }
        const bcrypt = require('bcrypt');
        const countR = await db.query(
            "SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='PROFESSEUR'"
        );
        const nb = parseInt(countR.rows[0].count) || 0;
        const code = 'PROF-2026-' + String(nb + 11).padStart(3, '0');
        const hash = await bcrypt.hash(code, 10);

        const r = await db.query(`
            INSERT INTO authentification.comptes
            (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
            VALUES ($1,$2,$3,$4,$5,$6,'PROFESSEUR',true)
            RETURNING id_user, code_unique
        `, [code, nom.toUpperCase(), prenom, email || null, telephone || null, hash]);

        const profId = r.rows[0].id_user;
        await db.query(
            `INSERT INTO pedagogie.profils_profs (id_user, specialite) VALUES ($1,$2)
             ON CONFLICT (id_user) DO UPDATE SET specialite=$2`,
            [profId, specialite]
        );

        res.json({ success: true, message: 'Professeur cree', code_unique: code });
    } catch (e) {
        console.error('createProfesseur:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// COTISATIONS
// ═══════════════════════════════════════════
exports.getCotisations = async (req, res) => {
    try {
        try {
            const r = await db.query(`
                SELECT ca.*, co.code_unique, co.nom, co.prenom, pe.classe_actuelle AS classe
                FROM gestion.cotisations_ape ca
                LEFT JOIN authentification.comptes co ON co.id_user = ca.id_eleve
                LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = ca.id_eleve
                ORDER BY ca.date_paiement DESC LIMIT 500
            `);
            return res.json({ success: true, cotisations: r.rows });
        } catch (e1) {
            const r2 = await db.query(`
                SELECT cp.*, co.code_unique, co.nom, co.prenom, pe.classe_actuelle AS classe
                FROM gestion_ape.cotisations_parents cp
                LEFT JOIN authentification.comptes co ON co.id_user = cp.id_parent
                LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = cp.id_eleve
                ORDER BY cp.date_cotisation DESC LIMIT 500
            `);
            return res.json({ success: true, cotisations: r2.rows });
        }
    } catch (e) {
        res.json({ success: true, cotisations: [] });
    }
};

// ═══════════════════════════════════════════
// PAIEMENT
// ═══════════════════════════════════════════
exports.savePaiement = async (req, res) => {
    try {
        const { famille, montant, date_paiement, eleve_code } = req.body;
        if (!famille || !montant) return res.status(400).json({ message: 'Famille et montant requis' });
        let eleveId = null;
        if (eleve_code) {
            const r = await db.query(`SELECT id_user FROM authentification.comptes WHERE code_unique=$1`, [eleve_code]);
            if (r.rows.length) eleveId = r.rows[0].id_user;
        }
        try {
            await db.query(
                `INSERT INTO gestion.cotisations_ape (id_eleve, famille, montant, date_paiement, statut, enregistre_par)
                 VALUES ($1,$2,$3,$4,'payé',$5)
                 ON CONFLICT (id_eleve) DO UPDATE SET montant=$3, date_paiement=$4, statut='payé'`,
                [eleveId, famille, parseFloat(montant), date_paiement || new Date().toISOString().split('T')[0], req.user?.id]
            );
        } catch (e2) { console.warn('savePaiement:', e2.message); }
        res.json({ success: true, message: 'Paiement enregistré' });
    } catch (e) {
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// COMPOSITIONS & EXAMENS BLANCS
// ═══════════════════════════════════════════
exports.getCompositions = async (req, res) => {
    try {
        const { type } = req.query;
        let query = `
            SELECT c.*, 
                   to_char(c.date_debut, 'DD/MM/YYYY') AS date_debut_fr,
                   to_char(c.date_fin, 'DD/MM/YYYY') AS date_fin_fr,
                   u.nom AS auteur_nom, u.prenom AS auteur_prenom
            FROM pedagogie.compositions c
            LEFT JOIN authentification.comptes u ON u.id_user = c.publie_par
            WHERE c.est_visible = true
        `;
        const params = [];

        if (type) {
            query += ` AND c.type_composition = $1`;
            params.push(type);
        }

        query += ` ORDER BY c.date_debut DESC`;

        const result = await db.query(query, params);
        res.json({ success: true, compositions: result.rows });
    } catch (err) {
        console.error('getCompositions:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.createComposition = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { titre, description, type_composition, date_debut, date_fin, classes_concernees } = req.body;

        if (!titre || !type_composition || !date_debut) {
            return res.status(400).json({ message: 'Titre, type et date requis' });
        }

        if (type_composition === 'EXAMEN_BLANC' && (!classes_concernees || classes_concernees.length === 0)) {
            return res.status(400).json({ message: 'Pour un examen blanc, précisez les classes concernées' });
        }

        const result = await db.query(`
            INSERT INTO pedagogie.compositions
                (titre, description, type_composition, date_debut, date_fin, classes_concernees, publie_par)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [titre, description || '', type_composition, date_debut, date_fin || null, classes_concernees || null, userId]);

        // Notifier les élèves concernés
        try {
            const notificationService = require('../services/notificationService');

            let elevesIds = [];
            if (type_composition === 'COMPOSITION') {
                const eleves = await db.query(`
                    SELECT id_user FROM authentification.comptes WHERE role_actuel = 'ELEVE' AND est_actif = true
                `);
                elevesIds = eleves.rows.map(e => e.id_user);
            } else if (type_composition === 'EXAMEN_BLANC' && classes_concernees) {
                for (const classe of classes_concernees) {
                    const eleves = await db.query(`
                        SELECT c.id_user FROM authentification.comptes c
                        JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
                        WHERE c.role_actuel = 'ELEVE' AND pe.classe_actuelle = $1
                    `, [classe]);
                    elevesIds.push(...eleves.rows.map(e => e.id_user));
                }
            }

            if (elevesIds.length > 0) {
                const lien = type_composition === 'EXAMEN_BLANC' ? '/eleve.html?page=programme&tab=examens' : '/eleve.html?page=programme&tab=compos';
                await notificationService.sendNotification(
                    [...new Set(elevesIds)],
                    type_composition === 'EXAMEN_BLANC' ? 'EXAMEN_BLANC' : 'COMPOSITION',
                    `📅 ${titre}`,
                    description || (type_composition === 'EXAMEN_BLANC' ? 'Examen blanc programmé' : 'Composition programmée'),
                    lien
                );
            }
        } catch (e) { console.warn('Erreur notification composition:', e.message); }

        res.json({ success: true, message: 'Composition publiée', composition: result.rows[0] });
    } catch (err) {
        console.error('createComposition:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.updateComposition = async (req, res) => {
    try {
        const { id } = req.params;
        const { titre, description, date_debut, date_fin, est_visible } = req.body;

        const result = await db.query(`
            UPDATE pedagogie.compositions
            SET titre = COALESCE($1, titre),
                description = COALESCE($2, description),
                date_debut = COALESCE($3, date_debut),
                date_fin = COALESCE($4, date_fin),
                est_visible = COALESCE($5, est_visible)
            WHERE id_composition = $6
            RETURNING *
        `, [titre, description, date_debut, date_fin, est_visible, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Composition non trouvée' });
        }

        res.json({ success: true, message: 'Composition mise à jour', composition: result.rows[0] });
    } catch (err) {
        console.error('updateComposition:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.deleteComposition = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'DELETE FROM pedagogie.compositions WHERE id_composition = $1 RETURNING id_composition',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Composition non trouvée' });
        }

        res.json({ success: true, message: 'Composition supprimée' });
    } catch (err) {
        console.error('deleteComposition:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
// ============================================================
// ÉLECTIONS SCOLAIRES
// ============================================================
exports.getElections = async (req, res) => {
    try {
        // Récupérer tous les élèves actifs
        const elevesRes = await db.query(`
            SELECT c.code_unique, c.nom, c.prenom,
                   e.classe_actuelle
            FROM authentification.comptes c
            LEFT JOIN pedagogie.profils_eleves e ON e.id_user = c.id_user
            WHERE c.role_actuel = 'ELEVE' AND c.est_actif = true
            ORDER BY e.classe_actuelle, c.nom, c.prenom
        `);

        // Récupérer les postes attribués — essayer plusieurs noms de table
        let electionsRows = [];
        try {
            const elRes = await db.query(`
                SELECT el.code_unique_eleve AS code_unique, el.poste,
                       c.nom, c.prenom,
                       e.classe_actuelle AS classe
                FROM gestion.elections el
                JOIN authentification.comptes c ON c.code_unique = el.code_unique_eleve
                LEFT JOIN pedagogie.profils_eleves e ON e.id_user = c.id_user
                ORDER BY el.poste, c.nom
            `);
            electionsRows = elRes.rows;
        } catch (e) {
            // Table inexistante — retourner liste vide
            electionsRows = [];
        }

        const postesLabels = {
            PRESIDENT: 'Président(e) des Élèves',
            VICE_PRESIDENT: 'Vice-Président(e)',
            SECRETAIRE: 'Secrétaire Général(e)',
            TRESORIER: 'Trésorier(e)',
            CHEF_CLASSE: 'Chef de Classe',
            CHEF_CLASSE_ADJ: 'Chef de Classe Adjoint(e)'
        };

        res.json({
            success: true,
            eleves: elevesRes.rows,
            elections: electionsRows,
            postes_labels: postesLabels
        });
    } catch (e) {
        console.error('getElections:', e.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.setElection = async (req, res) => {
    try {
        const { eleve_code, poste } = req.body;
        if (!eleve_code || !poste) {
            return res.status(400).json({ success: false, message: 'Code élève et poste requis' });
        }

        // Créer la table si elle n'existe pas
        await db.query(`
            CREATE TABLE IF NOT EXISTS gestion.elections (
                id SERIAL PRIMARY KEY,
                code_unique_eleve VARCHAR(50) NOT NULL,
                poste VARCHAR(50) NOT NULL,
                date_attribution TIMESTAMP DEFAULT NOW(),
                UNIQUE(code_unique_eleve)
            )
        `);

        // Vérifier que l'élève existe
        const check = await db.query(
            'SELECT code_unique FROM authentification.comptes WHERE code_unique = $1 AND est_actif = true',
            [eleve_code]
        );
        if (!check.rows.length) {
            return res.json({ success: false, message: 'Matricule introuvable' });
        }

        // Insérer ou mettre à jour
        await db.query(`
            INSERT INTO gestion.elections (code_unique_eleve, poste)
            VALUES ($1, $2)
            ON CONFLICT (code_unique_eleve) DO UPDATE SET poste = $2, date_attribution = NOW()
        `, [eleve_code, poste]);

        const postesLabels = {
            PRESIDENT: 'Président(e) des Élèves',
            VICE_PRESIDENT: 'Vice-Président(e)',
            SECRETAIRE: 'Secrétaire Général(e)',
            TRESORIER: 'Trésorier(e)',
            CHEF_CLASSE: 'Chef de Classe',
            CHEF_CLASSE_ADJ: 'Chef de Classe Adjoint(e)'
        };

        res.json({
            success: true,
            message: `${postesLabels[poste] || poste} attribué à ${eleve_code}`
        });
    } catch (e) {
        console.error('setElection:', e.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + e.message });
    }
};

exports.removeElection = async (req, res) => {
    try {
        const { eleve_code } = req.body;
        if (!eleve_code) {
            return res.status(400).json({ success: false, message: 'Code élève requis' });
        }

        try {
            await db.query(
                'DELETE FROM gestion.elections WHERE code_unique_eleve = $1',
                [eleve_code]
            );
        } catch (e) {
            // Table inexistante, rien à supprimer
        }

        res.json({ success: true, message: 'Poste retiré' });
    } catch (e) {
        console.error('removeElection:', e.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.createComposition = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { titre, description, type_composition, date_debut, date_fin, classes_concernees } = req.body;

        if (!titre || !type_composition || !date_debut) {
            return res.status(400).json({ message: 'Titre, type et date requis' });
        }

        const result = await db.query(`
            INSERT INTO pedagogie.compositions
                (titre, description, type_composition, date_debut, date_fin, classes_concernees, publie_par)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [titre, description || '', type_composition, date_debut, date_fin || null, classes_concernees || null, userId]);

        // ========== NOTIFICATION EN TEMPS RÉEL ==========
        try {
            const notificationService = require('../services/notificationService');
            const io = req.app?.locals?.io;

            let elevesIds = [];

            if (type_composition === 'COMPOSITION') {
                const eleves = await db.query(`
                    SELECT id_user FROM authentification.comptes 
                    WHERE role_actuel = 'ELEVE' AND est_actif = true
                `);
                elevesIds = eleves.rows.map(e => e.id_user);
            } else if (type_composition === 'EXAMEN_BLANC' && classes_concernees) {
                for (const classe of classes_concernees) {
                    const eleves = await db.query(`
                        SELECT c.id_user FROM authentification.comptes c
                        JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
                        WHERE c.role_actuel = 'ELEVE' AND pe.classe_actuelle = $1
                    `, [classe]);
                    elevesIds.push(...eleves.rows.map(e => e.id_user));
                }
            }

            // Envoyer les notifications en base de données
            if (elevesIds.length > 0) {
                const lien = type_composition === 'EXAMEN_BLANC'
                    ? '/eleve.html?page=programme&tab=examens'
                    : '/eleve.html?page=programme&tab=compos';

                await notificationService.sendNotification(
                    [...new Set(elevesIds)],
                    type_composition === 'EXAMEN_BLANC' ? 'EXAMEN_BLANC' : 'COMPOSITION',
                    `📅 ${titre}`,
                    description || (type_composition === 'EXAMEN_BLANC' ? 'Examen blanc programmé' : 'Composition programmée'),
                    lien
                );

                // Notifier en temps réel via Socket.IO
                if (io) {
                    io.emit('nouvelle-composition', {
                        titre,
                        type: type_composition,
                        date: date_debut,
                        message: description || 'Une nouvelle épreuve a été programmée'
                    });
                }
            }

            console.log(`🔔 Notification composition envoyée à ${elevesIds.length} élèves`);
        } catch (e) {
            console.warn('Erreur notification composition:', e.message);
        }

        res.json({ success: true, message: 'Composition publiée', composition: result.rows[0] });
    } catch (err) {
        console.error('createComposition:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

