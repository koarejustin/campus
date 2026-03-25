const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════
// PROFIL PROFESSEUR
// ═══════════════════════════════════════════
exports.getProfil = async (req, res) => {
    try {
        const profId = req.user?.id;
        const r = await db.query(`
            SELECT c.nom, c.prenom, c.email, c.telephone, c.code_unique,
                   p.specialite, p.biographie, p.date_arrivee
            FROM authentification.comptes c
            LEFT JOIN pedagogie.profils_profs p ON p.id_user = c.id_user
            WHERE c.id_user = $1
        `, [profId]);
        if (!r.rows.length) return res.status(404).json({ message: 'Profil introuvable' });

        let profil = r.rows[0];
        try {
            const rp = await db.query(
                `SELECT photo_url FROM pedagogie.profils_profs WHERE id_user=$1`, [profId]
            );
            if (rp.rows.length) profil.photo_url = rp.rows[0].photo_url;
        } catch (e) { }

        res.json({ success: true, profil });
    } catch (e) {
        console.error('Erreur getProfil:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.updateProfil = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { telephone, specialite, biographie } = req.body;

        if (telephone) {
            const telClean = String(telephone).replace(/\s/g, '').replace(/[^0-9+]/g, '');
            if (telClean.length >= 8) {
                try {
                    await db.query(
                        `UPDATE authentification.comptes SET telephone=$1 WHERE id_user=$2`,
                        [telClean, profId]
                    );
                } catch (eTel) {
                    console.warn('Téléphone rejeté:', eTel.message);
                }
            }
        }

        const existing = await db.query(
            `SELECT id_prof FROM pedagogie.profils_profs WHERE id_user=$1`, [profId]
        );
        if (existing.rows.length > 0) {
            await db.query(
                `UPDATE pedagogie.profils_profs 
                 SET specialite=$1, biographie=$2 
                 WHERE id_user=$3`,
                [specialite || '', biographie || '', profId]
            );
        } else {
            await db.query(
                `INSERT INTO pedagogie.profils_profs (id_user, specialite, biographie)
                 VALUES ($1, $2, $3)`,
                [profId, specialite || '', biographie || '']
            );
        }

        let photo_url = null;
        if (req.file) {
            photo_url = `/uploads/${req.file.filename}`;
            try {
                await db.query(
                    `UPDATE pedagogie.profils_profs SET photo_url=$1 WHERE id_user=$2`,
                    [photo_url, profId]
                );
            } catch (e) {
                try {
                    await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS photo_url TEXT`);
                    await db.query(
                        `UPDATE pedagogie.profils_profs SET photo_url=$1 WHERE id_user=$2`,
                        [photo_url, profId]
                    );
                    console.log('✅ Colonne photo_url créée automatiquement');
                } catch (e2) {
                    console.warn('⚠️ Impossible de sauvegarder la photo:', e2.message);
                    photo_url = null;
                }
            }
        }

        res.json({
            success: true,
            message: 'Profil mis à jour',
            profil: { telephone, specialite, biographie, photo_url }
        });
    } catch (e) {
        console.error('Erreur updateProfil:', e);
        res.status(500).json({ message: 'Erreur serveur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// ÉLÈVES PAR CLASSE
// ═══════════════════════════════════════════
exports.getEleves = async (req, res) => {
    try {
        const { classe, trimestre = 1 } = req.query;
        const profId = req.user?.id;
        if (!classe) return res.status(400).json({ message: 'Classe requise' });

        const r = await db.query(`
            SELECT c.id_user, c.nom, c.prenom, c.code_unique,
                   ROUND(AVG(n.note)::numeric, 2) as moyenne
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            LEFT JOIN pedagogie.notes_evaluations n ON n.id_eleve = c.id_user
                AND n.trimestre = $2 AND n.id_professeur = $3
            WHERE pe.classe_actuelle = $1 AND c.est_actif = true
            GROUP BY c.id_user, c.nom, c.prenom, c.code_unique
            ORDER BY c.nom, c.prenom
        `, [classe, trimestre, profId]);

        res.json({ success: true, classe, eleves: r.rows });
    } catch (e) {
        console.error('Erreur getEleves:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ═══════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════
exports.saveNotes = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { notes, trimestre = 1, annee_scolaire = '2025-2026' } = req.body;
        if (!notes || !Array.isArray(notes)) return res.status(400).json({ message: 'Notes requises' });

        let saved = 0;
        for (const n of notes) {
            if (!n.id_eleve || !n.id_matiere || n.note === undefined) continue;
            const note = parseFloat(n.note);
            if (isNaN(note) || note < 0 || note > 20) continue;

            const matiereResult = await db.query(
                `SELECT nom_matiere FROM pedagogie.matieres WHERE id_matiere = $1`,
                [n.id_matiere]
            );
            const matiereNom = matiereResult.rows[0]?.nom_matiere || 'matière';

            const existing = await db.query(
                `SELECT id_evaluation FROM pedagogie.notes_evaluations
                 WHERE id_eleve = $1 AND id_matiere = $2 AND id_professeur = $3
                 AND trimestre = $4 AND annee_scolaire = $5`,
                [n.id_eleve, n.id_matiere, profId, trimestre, annee_scolaire]
            );

            if (existing.rows.length > 0) {
                await db.query(
                    `UPDATE pedagogie.notes_evaluations
                     SET note = $1, date_evaluation = NOW()
                     WHERE id_evaluation = $2`,
                    [note, existing.rows[0].id_evaluation]
                );
                console.log(`✅ Note mise à jour pour élève ${n.id_eleve} - ${matiereNom}: ${note}/20`);
            } else {
                await db.query(
                    `INSERT INTO pedagogie.notes_evaluations
                     (id_eleve, id_matiere, id_professeur, note, trimestre, annee_scolaire, date_evaluation)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [n.id_eleve, n.id_matiere, profId, note, trimestre, annee_scolaire]
                );
                console.log(`✅ Nouvelle note insérée pour élève ${n.id_eleve} - ${matiereNom}: ${note}/20`);
            }
            saved++;

            try {
                const notificationService = require('../services/notificationService');

                await notificationService.sendNotification(
                    [n.id_eleve],
                    'NOTE',
                    'Nouvelle note',
                    `Note de ${note}/20 en ${matiereNom}`,
                    '/eleve.html?page=bulletin'
                );

                const parentResult = await db.query(
                    `SELECT id_parent FROM vie_scolaire.relations_parents_eleves WHERE id_eleve = $1`,
                    [n.id_eleve]
                );
                if (parentResult.rows.length > 0) {
                    await notificationService.sendNotification(
                        parentResult.rows.map(r => r.id_parent),
                        'NOTE',
                        'Note de votre enfant',
                        `Votre enfant a reçu ${note}/20 en ${matiereNom}`,
                        '/parent.html?page=bulletin'
                    );
                }
            } catch (e) { console.warn('Erreur notification note:', e.message); }
        }
        res.json({ success: true, message: `${saved} note(s) enregistrée(s)` });
    } catch (e) {
        console.error('Erreur saveNotes:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ═══════════════════════════════════════════
// RESSOURCES PÉDAGOGIQUES
// ═══════════════════════════════════════════
exports.getRessources = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { classe, type } = req.query;
        let q = `
            SELECT r.id_ressource, r.titre, r.type_document, r.url_fichier,
                   r.classe_concernee, r.date_depot,
                   c.nom as prof_nom, c.prenom as prof_prenom
            FROM pedagogie.ressources_pedagogiques r
            JOIN pedagogie.profils_profs pp ON pp.id_prof = r.id_prof
            JOIN authentification.comptes c ON c.id_user = pp.id_user
            WHERE pp.id_user = $1
        `;
        const params = [profId];
        if (classe) { q += ` AND r.classe_concernee=$${params.length + 1}`; params.push(classe); }
        if (type) { q += ` AND r.type_document=$${params.length + 1}`; params.push(type); }
        q += ' ORDER BY r.date_depot DESC';

        const r = await db.query(q, params);

        const ressources = r.rows.map(row => ({
            id_ressource: row.id_ressource,
            titre: row.titre,
            type: (row.type_document || 'cours').toLowerCase(),
            type_document: row.type_document,
            url: row.url_fichier,
            url_fichier: row.url_fichier,
            cls: row.classe_concernee,
            classe_cible: row.classe_concernee,
            classe_concernee: row.classe_concernee,
            date_ajout: row.date_depot,
            date_depot: row.date_depot,
            date: row.date_depot
                ? new Date(row.date_depot).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                : '—',
            taille: '—',
            format: row.url_fichier ? row.url_fichier.split('.').pop().toUpperCase() : '—',
            est_visible: true,
            visible: true,
            mat: 'Ma matière',
            prof_nom: row.prof_nom,
            prof_prenom: row.prof_prenom,
        }));

        res.json({ success: true, ressources });
    } catch (e) {
        console.error('Erreur getRessources:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.ajouterRessource = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { titre, type_ressource, type_document, classe_cible, classe_concernee } = req.body;
        const typeDoc = (type_document || type_ressource || 'cours').toLowerCase();
        const classeDoc = classe_concernee || classe_cible || 'TOUTES';

        if (!titre) return res.status(400).json({ message: 'Titre requis' });

        const pp = await db.query(
            `SELECT id_prof FROM pedagogie.profils_profs WHERE id_user=$1`, [profId]
        );
        if (!pp.rows.length) return res.status(404).json({
            message: 'Profil prof introuvable. Allez d\'abord dans Mon Profil et enregistrez.'
        });
        const id_prof = pp.rows[0].id_prof;
        const url_fichier = req.file ? `/uploads/${req.file.filename}` : null;

        const r = await db.query(`
            INSERT INTO pedagogie.ressources_pedagogiques
                (id_prof, titre, type_document, url_fichier, classe_concernee, date_depot)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id_ressource, titre, type_document, url_fichier, classe_concernee, date_depot
        `, [id_prof, titre, typeDoc, url_fichier, classeDoc]);

        const row = r.rows[0];
        if (row && classeDoc) {
            try {
                const notificationService = require('../services/notificationService');

                let elevesIds = [];
                if (classeDoc === 'TOUTES') {
                    const eleves = await db.query(`
                        SELECT id_user FROM authentification.comptes 
                        WHERE role_actuel = 'ELEVE' AND est_actif = true
                    `);
                    elevesIds = eleves.rows.map(e => e.id_user);
                } else {
                    const eleves = await db.query(`
                        SELECT c.id_user FROM authentification.comptes c
                        JOIN vie_scolaire.profils_eleves p ON c.id_user = p.id_user
                        WHERE c.role_actuel = 'ELEVE' AND p.classe_actuelle = $1
                    `, [classeDoc]);
                    elevesIds = eleves.rows.map(e => e.id_user);
                }

                if (elevesIds.length > 0) {
                    await notificationService.sendNotification(
                        elevesIds,
                        'RESSOURCE',
                        'Nouvelle ressource',
                        `${titre} a été publié pour votre classe`,
                        '/eleve.html?page=ressources'
                    );
                }
            } catch (e) { console.warn('Erreur notification ressource:', e.message); }
        }
        res.json({
            success: true,
            message: 'Ressource publiée avec succès',
            ressource: {
                id_ressource: row.id_ressource,
                titre: row.titre,
                type: (row.type_document || 'cours').toLowerCase(),
                type_document: row.type_document,
                url: row.url_fichier,
                url_fichier: row.url_fichier,
                cls: row.classe_concernee,
                classe_cible: row.classe_concernee,
                classe_concernee: row.classe_concernee,
                date_ajout: row.date_depot,
                date: new Date(row.date_depot).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                taille: req.file ? (req.file.size > 1048576
                    ? (req.file.size / 1048576).toFixed(1) + ' Mo'
                    : Math.round(req.file.size / 1024) + ' Ko') : '—',
                format: row.url_fichier ? row.url_fichier.split('.').pop().toUpperCase() : '—',
                est_visible: true,
                visible: true,
                mat: 'Ma matière',
            }
        });
    } catch (e) {
        console.error('Erreur ajouterRessource:', e);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

exports.supprimerRessource = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { id } = req.params;
        const check = await db.query(`
            SELECT r.id_ressource, r.url_fichier FROM pedagogie.ressources_pedagogiques r
            JOIN pedagogie.profils_profs pp ON pp.id_prof = r.id_prof
            WHERE r.id_ressource=$1 AND pp.id_user=$2
        `, [id, profId]);
        if (!check.rows.length) return res.status(403).json({ message: 'Non autorisé' });
        if (check.rows[0].url_fichier) {
            const fp = path.join(__dirname, '../public', check.rows[0].url_fichier);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await db.query(`DELETE FROM pedagogie.ressources_pedagogiques WHERE id_ressource=$1`, [id]);
        res.json({ success: true, message: 'Ressource supprimée' });
    } catch (e) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.toggleVisibilite = async (req, res) => {
    res.json({ success: true });
};

// ═══════════════════════════════════════════
// ORIENTATION
// ═══════════════════════════════════════════
exports.getOrientation = async (req, res) => {
    try {
        const { classe } = req.query;
        let q = `
            SELECT c.id_user, c.nom, c.prenom, c.code_unique,
                   pe.classe_actuelle as classe,
                   ROUND(AVG(n.note)::numeric, 2) as moyenne
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            LEFT JOIN pedagogie.notes_evaluations n ON n.id_eleve = c.id_user
            WHERE c.est_actif = true
        `;
        const params = [];
        if (classe) { q += ` AND pe.classe_actuelle=$1`; params.push(classe); }
        else { q += ` AND pe.classe_actuelle IN ('3ème','2nde A','2nde C','1ère A','1ère D','Tle A','Tle D')`; }
        q += ' GROUP BY c.id_user,c.nom,c.prenom,c.code_unique,pe.classe_actuelle ORDER BY c.nom LIMIT 50';
        const r = await db.query(q, params);
        res.json({ success: true, eleves: r.rows });
    } catch (e) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.saveOrientation = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { id_eleve_code, points_forts, points_faibles, serie_recommandee, commentaire } = req.body;

        if (!id_eleve_code) return res.status(400).json({ message: 'Matricule élève requis' });
        if (!commentaire && !serie_recommandee) return res.status(400).json({ message: 'Ajoutez un commentaire ou une série recommandée' });

        const eleve = await db.query(
            `SELECT id_user FROM authentification.comptes WHERE code_unique=$1 AND role_actuel='ELEVE'`,
            [id_eleve_code]
        );
        if (!eleve.rows.length) return res.status(404).json({ message: 'Élève introuvable : ' + id_eleve_code });
        const eleveId = eleve.rows[0].id_user;

        const existing = await db.query(
            `SELECT id FROM pedagogie.avis_orientation WHERE id_prof=$1 AND id_eleve=$2`,
            [profId, eleveId]
        );
        if (existing.rows.length) {
            await db.query(
                `UPDATE pedagogie.avis_orientation
                 SET points_forts=$1, points_faibles=$2, serie_recommandee=$3,
                     commentaire=$4, updated_at=NOW()
                 WHERE id=$5`,
                [points_forts || '', points_faibles || '', serie_recommandee || '',
                commentaire || '', existing.rows[0].id]
            );
        } else {
            await db.query(
                `INSERT INTO pedagogie.avis_orientation
                 (id_prof, id_eleve, points_forts, points_faibles, serie_recommandee, commentaire)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [profId, eleveId, points_forts || '', points_faibles || '',
                    serie_recommandee || '', commentaire || '']
            );
        }

        if (eleveId) {
            try {
                const notificationService = require('../services/notificationService');

                await notificationService.sendNotification(
                    [eleveId],
                    'ORIENTATION',
                    'Conseil d\'orientation',
                    commentaire || `Un professeur a partagé un conseil pour votre orientation`,
                    '/eleve.html?page=orientation'
                );

                const parentResult = await db.query(
                    `SELECT id_parent FROM vie_scolaire.relations_parents_eleves WHERE id_eleve = $1`,
                    [eleveId]
                );
                if (parentResult.rows.length > 0) {
                    await notificationService.sendNotification(
                        parentResult.rows.map(r => r.id_parent),
                        'ORIENTATION',
                        'Orientation de votre enfant',
                        `Votre enfant a reçu un conseil d'orientation`,
                        '/parent.html?page=orientation'
                    );
                }
            } catch (e) { console.warn('Erreur notification orientation:', e.message); }
        }

        res.json({ success: true, message: "Avis publié — visible par l'élève" });
    } catch (e) {
        console.error('saveOrientation:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// CAHIER DE TEXTE
// ═══════════════════════════════════════════
exports.saveCT = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { classe, matiere, titre, contenu, taf, date_seance, heure_debut, heure_fin } = req.body;
        if (!titre || !matiere || !classe) {
            return res.status(400).json({ message: 'Titre, matière et classe requis' });
        }
        const r = await db.query(`
            INSERT INTO pedagogie.cahiers_texte
                (id_prof, classe, matiere, titre_seance, contenu, travail_faire,
                 date_seance, heure_debut, heure_fin)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING id, date_seance, titre_seance
        `, [profId, classe, matiere, titre, contenu || '', taf || '',
            date_seance || new Date().toISOString().split('T')[0],
            heure_debut || null, heure_fin || null]);

        res.json({
            success: true,
            message: 'Séance enregistrée',
            seance: r.rows[0]
        });
    } catch (e) {
        console.error('Erreur saveCT:', e);
        res.status(500).json({ message: 'Erreur serveur: ' + e.message });
    }
};

exports.getCT = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { classe, limit = 50 } = req.query;
        let q = `
            SELECT id, classe, matiere, titre_seance AS titre,
                   contenu, travail_faire AS taf,
                   to_char(date_seance,'YYYY-MM-DD') AS date_seance,
                   to_char(heure_debut,'HH24:MI') AS heure_debut,
                   to_char(heure_fin,'HH24:MI') AS heure_fin,
                   created_at
            FROM pedagogie.cahiers_texte
            WHERE id_prof = $1
        `;
        const params = [profId];
        if (classe) { q += ' AND classe=$2'; params.push(classe); }
        q += ' ORDER BY date_seance DESC, created_at DESC LIMIT $' + (params.length + 1);
        params.push(parseInt(limit));

        const r = await db.query(q, params);
        res.json({ success: true, seances: r.rows });
    } catch (e) {
        console.error('Erreur getCT:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};