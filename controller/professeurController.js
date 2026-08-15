const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════
// Normalisation des noms de matières (accents, casse, espaces)
// Utilisée pour faire correspondre profils_profs.matieres (texte libre)
// avec les vrais id_matiere de pedagogie.matieres
// ═══════════════════════════════════════════
function _normMat(s) {
    return String(s || '').toLowerCase()
        .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/[îï]/g, 'i')
        .replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c')
        .replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// ═══════════════════════════════════════════
// PROFIL PROFESSEUR
// ═══════════════════════════════════════════
exports.getProfil = async (req, res) => {
    try {
        const profId = req.user?.id;

        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS matieres TEXT[]`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS annees_exp SMALLINT DEFAULT 0`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS photo_url TEXT`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS classes TEXT[]`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS diplome VARCHAR(150)`);

        const r = await db.query(`
            SELECT c.nom, c.prenom, c.email, c.telephone, c.code_unique,
                   p.specialite, p.biographie, p.date_arrivee, p.photo_url,
                   p.matieres, p.annees_exp, p.classes, p.diplome
            FROM authentification.comptes c
            LEFT JOIN pedagogie.profils_profs p ON p.id_user = c.id_user
            WHERE c.id_user = $1
        `, [profId]);
        if (!r.rows.length) return res.status(404).json({ message: 'Profil introuvable' });

        let profil = r.rows[0];
        profil.matieres = profil.matieres || [];
        profil.classes = profil.classes || [];
        profil.diplome = profil.diplome || null;

        // Si photo_url n'est pas dans la requête, essayer de la récupérer séparément
        if (!profil.photo_url) {
            try {
                const rp = await db.query(
                    `SELECT photo_url FROM pedagogie.profils_profs WHERE id_user=$1`, [profId]
                );
                if (rp.rows.length && rp.rows[0].photo_url) {
                    profil.photo_url = rp.rows[0].photo_url;
                }
            } catch (e) { }
        }

        // Biographie automatique si aucune n'a été renseignée (basée sur les vraies données)
        if (!profil.biographie || !String(profil.biographie).trim()) {
            const matieresTxt = (profil.matieres && profil.matieres.length)
                ? profil.matieres.join(' et ')
                : 'plusieurs matières';
            const expTxt = profil.annees_exp
                ? `${profil.annees_exp} an${profil.annees_exp > 1 ? 's' : ''} d'expérience`
                : 'une solide expérience pédagogique';
            profil.biographie = `Professeur de ${matieresTxt} · ${expTxt}.`;
        }

        res.json({ success: true, profil });
    } catch (e) {
        console.error('Erreur getProfil:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.updateProfil = async (req, res) => {
    try {
        const profId = req.user?.id;
        const {
            nom, prenom, email,
            telephone, specialite, biographie,
            annees_exp, matieres, classes, diplome
        } = req.body;

        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS matieres TEXT[]`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS annees_exp SMALLINT DEFAULT 0`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS photo_url TEXT`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS classes TEXT[]`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS diplome VARCHAR(150)`);

        if (nom) {
            await db.query(
                `UPDATE authentification.comptes SET nom=$1 WHERE id_user=$2`,
                [String(nom).trim(), profId]
            );
        }
        if (prenom) {
            await db.query(
                `UPDATE authentification.comptes SET prenom=$1 WHERE id_user=$2`,
                [String(prenom).trim(), profId]
            );
        }
        if (email) {
            await db.query(
                `UPDATE authentification.comptes SET email=$1 WHERE id_user=$2`,
                [String(email).trim(), profId]
            );
        }

        let telClean = null;
        if (telephone) {
            telClean = String(telephone).replace(/\s/g, '').replace(/[^0-9+]/g, '');
            if (telClean.length >= 8) {
                try {
                    await db.query(
                        `UPDATE authentification.comptes SET telephone=$1 WHERE id_user=$2`,
                        [telClean, profId]
                    );
                } catch (eTel) {
                    console.warn('Téléphone rejeté:', eTel.message);
                }
            } else {
                telClean = null;
            }
        }

        let matieresArray = [];
        if (matieres) {
            if (typeof matieres === 'string') {
                try {
                    matieresArray = JSON.parse(matieres);
                } catch (e) {
                    matieresArray = matieres.split(',').map(m => m.trim()).filter(Boolean);
                }
            } else if (Array.isArray(matieres)) {
                matieresArray = matieres;
            }
            matieresArray = matieresArray.filter(v => v && typeof v === 'string');
        }

        let classesArray = [];
        if (classes) {
            if (typeof classes === 'string') {
                try {
                    classesArray = JSON.parse(classes);
                } catch (e) {
                    classesArray = classes.split(',').map(c => c.trim()).filter(Boolean);
                }
            } else if (Array.isArray(classes)) {
                classesArray = classes;
            }
            classesArray = classesArray.filter(v => v && typeof v === 'string');
        }

        const validYears = parseInt(annees_exp, 10);
        const anneesExpValue = Number.isInteger(validYears) && validYears >= 0 ? validYears : null;

        await db.query(
            `INSERT INTO pedagogie.profils_profs (id_user, specialite, biographie, telephone, matieres, classes, diplome, annees_exp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id_user) DO UPDATE SET
                specialite = EXCLUDED.specialite,
                biographie = EXCLUDED.biographie,
                telephone = COALESCE(EXCLUDED.telephone, pedagogie.profils_profs.telephone),
                matieres = COALESCE(EXCLUDED.matieres, pedagogie.profils_profs.matieres),
                classes = COALESCE(EXCLUDED.classes, pedagogie.profils_profs.classes),
                diplome = COALESCE(EXCLUDED.diplome, pedagogie.profils_profs.diplome),
                annees_exp = COALESCE(EXCLUDED.annees_exp, pedagogie.profils_profs.annees_exp)`,
            [profId, specialite || '', biographie || '', telClean, matieresArray.length ? matieresArray : null, classesArray.length ? classesArray : null, diplome || null, anneesExpValue]
        );

        let photo_url = null;
        if (req.file) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            photo_url = `/uploads/${req.file.filename}`;
            try {
                const updatePhoto = await db.query(
                    `UPDATE pedagogie.profils_profs SET photo_url=$1 WHERE id_user=$2 RETURNING photo_url`,
                    [photo_url, profId]
                );
                if (updatePhoto.rows.length === 0) {
                    await db.query(
                        `INSERT INTO pedagogie.profils_profs (id_user, photo_url) VALUES ($1, $2)
                         ON CONFLICT (id_user) DO UPDATE SET photo_url=$2`,
                        [profId, photo_url]
                    );
                }
                console.log('✅ Photo uploadée avec succès:', photo_url);
            } catch (e) {
                console.warn('⚠️ Erreur sauvegarde photo:', e.message);
                photo_url = null;
            }
        }

        const updatedProfil = await db.query(`
            SELECT c.nom, c.prenom, c.email, c.telephone, c.code_unique,
                   p.specialite, p.biographie, p.photo_url, p.matieres, p.classes, p.diplome, p.annees_exp
            FROM authentification.comptes c
            LEFT JOIN pedagogie.profils_profs p ON p.id_user = c.id_user
            WHERE c.id_user = $1
        `, [profId]);

        res.json({
            success: true,
            message: 'Profil mis à jour',
            profil: updatedProfil.rows[0] || { nom, prenom, email, telephone: telClean, specialite, biographie, photo_url, matieres: matieresArray, classes: classesArray, diplome: diplome || null, annees_exp: anneesExpValue },
            photo_url
        });
    } catch (e) {
        console.error('Erreur updateProfil:', e);
        res.status(500).json({ message: 'Erreur serveur: ' + e.message });
    }
};

exports.getProfilById = async (req, res) => {
    try {
        const profId = req.params.id;
        const requester = req.user;

        if (!profId) {
            return res.status(400).json({ message: 'Identifiant du professeur requis' });
        }

        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS matieres TEXT[]`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS annees_exp SMALLINT DEFAULT 0`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS photo_url TEXT`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS classes TEXT[]`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS diplome VARCHAR(150)`);

        const r = await db.query(`
            SELECT c.nom, c.prenom, c.email, c.telephone, c.code_unique,
                   p.specialite, p.biographie, p.date_arrivee, p.photo_url,
                   p.matieres, p.annees_exp, p.classes, p.diplome
            FROM authentification.comptes c
            LEFT JOIN pedagogie.profils_profs p ON p.id_user = c.id_user
            WHERE c.id_user = $1
              AND c.role_actuel = 'PROFESSEUR'
              AND c.est_actif = true
        `, [profId]);

        if (!r.rows.length) return res.status(404).json({ message: 'Profil introuvable' });

        const profil = r.rows[0];
        profil.matieres = profil.matieres || [];
        profil.classes = profil.classes || [];

        const isSelf = requester.id === profId;
        const isAdmin = ['DIRECTION', 'SURVEILLANT'].includes(requester.role);

        if (!isSelf && !isAdmin) {
            if (requester.role === 'ELEVE') {
                const student = await db.query(
                    `SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user = $1`,
                    [requester.id]
                );
                if (!student.rows.length) {
                    return res.status(403).json({ message: 'Accès refusé' });
                }
                const studentClasse = student.rows[0].classe_actuelle;
                if (!profil.classes.some(c => String(c).trim().toLowerCase() === String(studentClasse).trim().toLowerCase())) {
                    return res.status(403).json({ message: 'Accès refusé' });
                }
            } else {
                return res.status(403).json({ message: 'Accès refusé' });
            }
        }

        res.json({ success: true, profil });
    } catch (e) {
        console.error('Erreur getProfilById:', e);
        res.status(500).json({ message: 'Erreur serveur' });
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
// MES MATIÈRES — vraies matières du prof avec leur vrai id_matiere
// + vrai coefficient officiel pour la classe demandée (moyennesEngine)
// (remplace le faux id + coefficient deviné côté frontend)
// ═══════════════════════════════════════════
exports.getMesMatieres = async (req, res) => {
    try {
        const profId = req.user?.id;
        const classeQuery = req.query.classe || null;

        const profRes = await db.query(
            `SELECT matieres FROM pedagogie.profils_profs WHERE id_user = $1`,
            [profId]
        );
        const mesMatieresNoms = profRes.rows[0]?.matieres || [];

        const toutesMatieres = await db.query(
            `SELECT id_matiere, nom_matiere, coefficient FROM pedagogie.matieres ORDER BY id_matiere`
        );

        // Programme officiel de la classe demandée (coefficients réels Burkina Faso)
        let programme = null;
        let engineNorm = null;
        if (classeQuery) {
            try {
                const engine = require('../services/moyennesEngine');
                programme = engine.getProgramme(classeQuery);
                engineNorm = engine.normaliserNomMatiereAvecAlias;
            } catch (e) {
                console.warn('moyennesEngine indisponible pour getMesMatieres:', e.message);
            }
        }

        const resultat = [];
        for (const nomProf of mesMatieresNoms) {
            const match = toutesMatieres.rows.find(
                m => _normMat(m.nom_matiere) === _normMat(nomProf)
            );
            if (!match) {
                console.warn(`⚠️ Matière "${nomProf}" (profil prof ${profId}) introuvable dans pedagogie.matieres`);
                continue;
            }

            // Chercher le vrai coefficient de cette matière pour CETTE classe
            // (via le même système d'alias que moyennesEngine, pas une simple comparaison de texte)
            let coefficient = match.coefficient; // repli : coefficient générique
            let horsProgramme = true;
            if (programme && engineNorm) {
                const cible = engineNorm(nomProf);
                const entree = programme.find(p => engineNorm(p.nom) === cible);
                if (entree) { coefficient = entree.coef; horsProgramme = false; }
            }

            resultat.push({
                id_matiere: match.id_matiere,
                nom_matiere: match.nom_matiere,
                coefficient,
                hors_programme: horsProgramme
            });
        }

        res.json({ success: true, matieres: resultat });
    } catch (e) {
        console.error('Erreur getMesMatieres:', e);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
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

        // 🔒 Sécurité : construire l'ensemble des id_matiere réellement enseignés par ce prof
        const profRes = await db.query(
            `SELECT matieres FROM pedagogie.profils_profs WHERE id_user = $1`,
            [profId]
        );
        const mesMatieresNoms = profRes.rows[0]?.matieres || [];
        const toutesMatieres = await db.query(`SELECT id_matiere, nom_matiere FROM pedagogie.matieres`);
        const idsAutorises = new Set(
            toutesMatieres.rows
                .filter(m => mesMatieresNoms.some(nm => _normMat(nm) === _normMat(m.nom_matiere)))
                .map(m => m.id_matiere)
        );

        let saved = 0;
        let refusees = 0;
        for (const n of notes) {
            if (!n.id_eleve || !n.id_matiere || n.note === undefined) continue;

            // 🔒 Refuser toute note sur une matière que ce prof n'enseigne pas
            if (!idsAutorises.has(parseInt(n.id_matiere))) {
                console.warn(`⚠️ Note refusée : prof ${profId} n'enseigne pas la matière id=${n.id_matiere}`);
                refusees++;
                continue;
            }

            const note = parseFloat(n.note);
            if (isNaN(note) || note < 0 || note > 20) continue;

            const matiereResult = await db.query(
                `SELECT nom_matiere FROM pedagogie.matieres WHERE id_matiere = $1`,
                [n.id_matiere]
            );
            const matiereNom = matiereResult.rows[0]?.nom_matiere || 'matière';

            const typeEval = (n.type_evaluation || 'DEVOIR').toUpperCase();
            const existing = await db.query(
                `SELECT id_evaluation FROM pedagogie.notes_evaluations
                 WHERE id_eleve = $1 AND id_matiere = $2 AND id_professeur = $3
                 AND trimestre = $4 AND annee_scolaire = $5 AND type_evaluation = $6`,
                [n.id_eleve, n.id_matiere, profId, trimestre, annee_scolaire, typeEval]
            );

            if (existing.rows.length > 0) {
                const typeEvalU = (n.type_evaluation || 'DEVOIR').toUpperCase();
                await db.query(
                    `UPDATE pedagogie.notes_evaluations
                     SET note = $1, type_evaluation = $2, date_evaluation = NOW()
                     WHERE id_evaluation = $3`,
                    [note, typeEvalU, existing.rows[0].id_evaluation]
                );
                console.log(`✅ Note mise à jour pour élève ${n.id_eleve} - ${matiereNom}: ${note}/20`);
            } else {
                const typeEvalI = (n.type_evaluation || 'DEVOIR').toUpperCase();
                await db.query(
                    `INSERT INTO pedagogie.notes_evaluations
                     (id_eleve, id_matiere, id_professeur, note, trimestre, annee_scolaire, type_evaluation, date_evaluation)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                    [n.id_eleve, n.id_matiere, profId, note, trimestre, annee_scolaire, typeEvalI]
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
        res.json({
            success: true,
            message: `${saved} note(s) enregistrée(s)` + (refusees ? ` — ${refusees} refusée(s) (matière non autorisée)` : '')
        });
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
                   r.classe_concernee, r.date_depot, r.est_visible,
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
            est_visible: row.est_visible !== false,
            visible: row.est_visible !== false,
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

// ✅ Avant : stub qui ne faisait rien (ne touchait ni :id ni la BD) — le
// bouton "Visible/Masqué" du web ne fonctionnait donc pas (en plus d'un
// mismatch PATCH/PUT côté frontend, corrigé aussi).
exports.toggleVisibilite = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { id } = req.params;
        const check = await db.query(`
            SELECT r.est_visible FROM pedagogie.ressources_pedagogiques r
            JOIN pedagogie.profils_profs pp ON pp.id_prof = r.id_prof
            WHERE r.id_ressource=$1 AND pp.id_user=$2
        `, [id, profId]);
        if (!check.rows.length) return res.status(403).json({ message: 'Non autorisé' });

        const nouvelleValeur = !(check.rows[0].est_visible !== false);
        await db.query(
            `UPDATE pedagogie.ressources_pedagogiques SET est_visible=$1 WHERE id_ressource=$2`,
            [nouvelleValeur, id]
        );
        res.json({ success: true, est_visible: nouvelleValeur });
    } catch (e) {
        console.error('Erreur toggleVisibilite:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
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
        const EXAM_CLASSES = ['3ème', 'Tle A', 'Tle D'];
        const params = [];
        if (classe && EXAM_CLASSES.includes(classe)) {
            q += ` AND pe.classe_actuelle=$1`;
            params.push(classe);
        } else {
            // Par défaut (ou si une classe hors-examen est demandée) : uniquement les classes d'examen
            q += ` AND pe.classe_actuelle IN ('3ème','Tle A','Tle D')`;
        }
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

// ═══════════════════════════════════════════
// DEVOIRS
// ═══════════════════════════════════════════
exports.getDevoirs = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { classe } = req.query;

        let query = `
            SELECT d.*, 
                   to_char(d.date_limite, 'DD/MM/YYYY') AS date_limite_fr
            FROM pedagogie.devoirs d
            WHERE d.id_prof = $1
        `;
        const params = [profId];

        if (classe) {
            query += ` AND d.classe = $2`;
            params.push(classe);
        }

        query += ` ORDER BY d.date_limite ASC`;

        const result = await db.query(query, params);
        res.json({ success: true, devoirs: result.rows });
    } catch (error) {
        console.error('Erreur getDevoirs:', error.message);
        res.json({ success: true, devoirs: [] });
    }
};

exports.createDevoir = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { titre, description, matiere, classe, date_limite } = req.body;

        if (!titre || !matiere || !classe || !date_limite) {
            return res.status(400).json({ success: false, message: 'Titre, matière, classe et date limite requis' });
        }

        const result = await db.query(`
            INSERT INTO pedagogie.devoirs (id_prof, titre, description, matiere, classe, date_limite)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [profId, titre, description || '', matiere, classe, date_limite]);

        // Envoyer une notification aux élèves de la classe concernée uniquement
        try {
            const notificationService = require('../services/notificationService');
            const eleves = await db.query(`
                SELECT c.id_user 
                FROM authentification.comptes c
                JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
                WHERE pe.classe_actuelle = $1 AND c.est_actif = true
            `, [classe]);

            if (eleves.rows.length > 0) {
                const dateFr = new Date(date_limite).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                await notificationService.sendNotification(
                    eleves.rows.map(e => e.id_user),
                    'DEVOIR',
                    `📝 Nouveau devoir en ${matiere}`,
                    `${titre} — À rendre le ${dateFr}`,
                    '/eleve.html?page=programme&tab=devoirs'
                );
                console.log(`🔔 Notification devoir envoyée à ${eleves.rows.length} élèves de ${classe}`);
            }
        } catch (notifError) {
            console.warn('Erreur notification devoir:', notifError.message);
        }

        res.json({ success: true, message: 'Devoir créé avec succès', devoir: result.rows[0] });
    } catch (error) {
        console.error('Erreur createDevoir:', error.message);
        res.status(500).json({ success: false, message: 'Erreur lors de la création du devoir' });
    }
};

exports.updateDevoir = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { id } = req.params;
        const { titre, description, matiere, classe, date_limite, est_visible } = req.body;

        // Vérifier que le devoir appartient bien au professeur
        const check = await db.query(
            'SELECT id_devoir FROM pedagogie.devoirs WHERE id_devoir = $1 AND id_prof = $2',
            [id, profId]
        );

        if (check.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Non autorisé' });
        }

        await db.query(`
            UPDATE pedagogie.devoirs
            SET titre = COALESCE($1, titre),
                description = COALESCE($2, description),
                matiere = COALESCE($3, matiere),
                classe = COALESCE($4, classe),
                date_limite = COALESCE($5, date_limite),
                est_visible = COALESCE($6, est_visible)
            WHERE id_devoir = $7
        `, [titre, description, matiere, classe, date_limite, est_visible, id]);

        res.json({ success: true, message: 'Devoir mis à jour' });
    } catch (error) {
        console.error('Erreur updateDevoir:', error.message);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
    }
};

exports.deleteDevoir = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { id } = req.params;

        // Récupérer la classe du devoir avant suppression (pour notifier les élèves)
        const before = await db.query(
            'SELECT classe FROM pedagogie.devoirs WHERE id_devoir = $1 AND id_prof = $2',
            [id, profId]
        );

        if (before.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Devoir non trouvé ou non autorisé' });
        }

        const classe = before.rows[0].classe || null;

        const result = await db.query(
            'DELETE FROM pedagogie.devoirs WHERE id_devoir = $1 AND id_prof = $2 RETURNING id_devoir',
            [id, profId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Devoir non trouvé ou non autorisé' });
        }

        // Émettre via Socket.IO pour que les élèves de la classe soient notifiés
        try {
            const { getIO } = require('../server');
            const io = getIO ? getIO() : null;
            if (io && classe) {
                const room = `classe_${String(classe).replace(/\s+/g, '_')}`;
                io.to(room).emit('devoir-changed', { action: 'deleted', id: id, classe });
            }
        } catch (e) { /* Socket.IO optionnel */ }

        res.json({ success: true, message: 'Devoir supprimé' });
    } catch (error) {
        console.error('Erreur deleteDevoir:', error.message);
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
    }
};

// ========== ANNONCES REÇUES (lecture seule) ==========
exports.getAnnonces = async (req, res) => {
    try {
        let annonces = [];

        // 1. Annonces de vie_scolaire.annonces
        try {
            const r = await db.query(`
                SELECT id::text AS id_annonce, titre, contenu,
                       COALESCE(type,'INFO') AS priorite,
                       created_at AS date_publication,
                       destinataires
                FROM vie_scolaire.annonces
                WHERE destinataires IN ('tous', 'profs', 'all', 'professeur', 'PROFESSEUR') OR destinataires IS NULL
                ORDER BY created_at DESC
                LIMIT 50
            `);
            annonces = r.rows;
        } catch (e) { console.warn('annonces:', e.message); }

        // 2. Annonces de gestion.annonces_officielles
        try {
            const r2 = await db.query(`
                SELECT id_annonce::text AS id_annonce, titre, contenu,
                       type AS priorite, date_publication,
                       COALESCE(destinataires, 'tous') as destinataires
                FROM gestion.annonces_officielles
                WHERE COALESCE(destinataires, 'tous') IN ('tous', 'profs', 'all', 'professeur')
                ORDER BY date_publication DESC
                LIMIT 50
            `);
            annonces = [...annonces, ...r2.rows];
        } catch (e) { console.warn('gestion.annonces_officielles:', e.message); }

        // 3. Annonces de vie_scolaire.annonces_officielles
        try {
            const r3 = await db.query(`
                SELECT id_annonce::text AS id_annonce, titre,
                       corps_annonce as contenu, priorite, date_publication,
                       COALESCE(destinataires, 'tous') as destinataires
                FROM vie_scolaire.annonces_officielles
                WHERE COALESCE(destinataires, 'tous') IN ('tous', 'profs', 'all', 'professeur')
                ORDER BY date_publication DESC
                LIMIT 50
            `);
            annonces = [...annonces, ...r3.rows];
        } catch (e) { console.warn('annonces_officielles:', e.message); }

        // Déduplication par titre + contenu
        const uniqueMap = new Map();
        for (const annonce of annonces) {
            const key = `${annonce.titre}_${annonce.contenu?.substring(0, 100)}`;
            if (!uniqueMap.has(key)) uniqueMap.set(key, annonce);
        }

        const annoncesUniques = Array.from(uniqueMap.values());
        annoncesUniques.sort((a, b) => new Date(b.date_publication) - new Date(a.date_publication));

        res.json({
            success: true,
            count: annoncesUniques.length,
            annonces: annoncesUniques.slice(0, 50)
        });
    } catch (error) {
        console.error('getAnnonces prof:', error.message);
        res.status(500).json({ success: false, annonces: [] });
    }
};

// ═══════════════════════════════════════════
// COPIES CORRIGÉES SCANNÉES
// Le prof scanne une copie après correction et choisit de l'envoyer
// à l'élève ou de la garder pour lui (preuve en cas de contestation).
// ═══════════════════════════════════════════
exports.uploadCopieScannee = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { id_eleve, id_matiere, trimestre, type_evaluation, note, visible_eleve } = req.body;
        if (!profId) return res.status(401).json({ message: 'Non authentifié' });
        if (!req.file) return res.status(400).json({ message: 'Fichier requis (scan ou photo de la copie)' });
        if (!id_eleve || !id_matiere || !trimestre) {
            return res.status(400).json({ message: 'Élève, matière et trimestre requis' });
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS pedagogie.copies_scannees (
                id_copie        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                id_eleve        UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
                id_matiere      INTEGER     REFERENCES pedagogie.matieres(id_matiere),
                id_professeur   UUID        NOT NULL REFERENCES authentification.comptes(id_user),
                trimestre       SMALLINT    NOT NULL CHECK (trimestre IN (1,2,3)),
                type_evaluation VARCHAR(20) DEFAULT 'DEVOIR',
                url_fichier     TEXT        NOT NULL,
                note            NUMERIC(5,2),
                visible_eleve   BOOLEAN     NOT NULL DEFAULT FALSE,
                date_upload     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => {});

        const url_fichier = `/uploads/${req.file.filename}`;

        const r = await db.query(`
            INSERT INTO pedagogie.copies_scannees
                (id_eleve, id_matiere, id_professeur, trimestre, type_evaluation, url_fichier, note, visible_eleve)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id_copie, date_upload
        `, [
            id_eleve, parseInt(id_matiere), profId, parseInt(trimestre),
            (type_evaluation || 'DEVOIR').toUpperCase(), url_fichier,
            note ? parseFloat(note) : null,
            visible_eleve === 'true' || visible_eleve === true
        ]);

        res.json({
            success: true,
            message: visible_eleve === 'true' || visible_eleve === true
                ? 'Copie envoyée à l\'élève'
                : 'Copie enregistrée (gardée pour vous)',
            copie: r.rows[0]
        });
    } catch (e) {
        console.error('uploadCopieScannee:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

exports.getCopiesScannees = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { id_eleve, trimestre } = req.query;
        if (!profId) return res.status(401).json({ message: 'Non authentifié' });

        let q = `
            SELECT cs.id_copie, cs.id_eleve, cs.trimestre, cs.type_evaluation,
                   cs.url_fichier, cs.note, cs.visible_eleve, cs.date_upload,
                   m.nom_matiere, c.nom, c.prenom
            FROM pedagogie.copies_scannees cs
            LEFT JOIN pedagogie.matieres m ON m.id_matiere = cs.id_matiere
            JOIN authentification.comptes c ON c.id_user = cs.id_eleve
            WHERE cs.id_professeur = $1
        `;
        const params = [profId];
        if (id_eleve) { params.push(id_eleve); q += ` AND cs.id_eleve = $${params.length}`; }
        if (trimestre) { params.push(parseInt(trimestre)); q += ` AND cs.trimestre = $${params.length}`; }
        q += ` ORDER BY cs.date_upload DESC LIMIT 100`;

        const r = await db.query(q, params);
        res.json({ success: true, copies: r.rows });
    } catch (e) {
        console.error('getCopiesScannees:', e.message);
        res.json({ success: true, copies: [] });
    }
};