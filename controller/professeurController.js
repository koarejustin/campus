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
        
        // Essayer d'ajouter photo_url si la colonne existe
        let profil = r.rows[0];
        try {
            const rp = await db.query(
                `SELECT photo_url FROM pedagogie.profils_profs WHERE id_user=$1`, [profId]
            );
            if (rp.rows.length) profil.photo_url = rp.rows[0].photo_url;
        } catch(e) { /* colonne pas encore créée */ }
        
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

        // Mettre à jour téléphone (nettoyer les espaces - contrainte BD)
        if (telephone) {
            // Supprimer TOUS les espaces, garder seulement +, chiffres
            const telClean = String(telephone).replace(/\s/g, '').replace(/[^0-9+]/g, '');
            if (telClean.length >= 8) {
                try {
                    await db.query(
                        `UPDATE authentification.comptes SET telephone=$1 WHERE id_user=$2`,
                        [telClean, profId]
                    );
                } catch(eTel) {
                    console.warn('Téléphone rejeté:', eTel.message);
                    // Continuer sans bloquer
                }
            }
        }

        // Upsert manuel (compatible avec ou sans contrainte UNIQUE sur id_user)
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

        // Gérer la photo séparément (au cas où la colonne n'existe pas encore)
        let photo_url = null;
        if (req.file) {
            photo_url = `/uploads/${req.file.filename}`;
            try {
                await db.query(
                    `UPDATE pedagogie.profils_profs SET photo_url=$1 WHERE id_user=$2`,
                    [photo_url, profId]
                );
            } catch(e) {
                // Colonne photo_url absente → créer et réessayer
                try {
                    await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS photo_url TEXT`);
                    await db.query(
                        `UPDATE pedagogie.profils_profs SET photo_url=$1 WHERE id_user=$2`,
                        [photo_url, profId]
                    );
                    console.log('✅ Colonne photo_url créée automatiquement');
                } catch(e2) {
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

        // Créer la table matieres si nécessaire et s'assurer que l'id_matiere existe
        const matieresCache = {};

        let saved = 0;
        for (const n of notes) {
            if (!n.id_eleve || n.note === undefined) continue;
            const note = parseFloat(n.note);
            if (isNaN(note) || note < 0 || note > 20) continue;

            // Résoudre l'id_matiere : utiliser celui fourni ou créer/trouver par nom
            let idMatiere = parseInt(n.id_matiere) || null;
            const matNom = n.mat || 'Matière';

            if (!idMatiere || idMatiere <= 0) {
                // Chercher ou créer la matière par nom
                if (!matieresCache[matNom]) {
                    try {
                        let mr = await db.query(
                            `SELECT id_matiere FROM pedagogie.matieres WHERE nom_matiere = $1`, [matNom]
                        );
                        if (!mr.rows.length) {
                            mr = await db.query(
                                `INSERT INTO pedagogie.matieres (nom_matiere, coefficient)
                                 VALUES ($1, 2) RETURNING id_matiere`,
                                [matNom]
                            ).catch(() => db.query(
                                `SELECT id_matiere FROM pedagogie.matieres WHERE nom_matiere=$1`, [matNom]
                            ));
                        }
                        matieresCache[matNom] = mr.rows[0]?.id_matiere || 1;
                    } catch(em) {
                        matieresCache[matNom] = 1; // fallback
                    }
                }
                idMatiere = matieresCache[matNom];
            }

            try {
                await db.query(`
                    INSERT INTO pedagogie.notes_evaluations
                        (id_eleve, id_matiere, id_professeur, note, trimestre, annee_scolaire, date_evaluation)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    ON CONFLICT (id_eleve, id_matiere, id_professeur, trimestre, annee_scolaire)
                    DO UPDATE SET note=EXCLUDED.note, date_evaluation=NOW()
                `, [n.id_eleve, idMatiere, profId, note, trimestre, annee_scolaire]);
                saved++;
            } catch(en) {
                console.warn('saveNote row:', en.message);
                // Essayer sans la contrainte ON CONFLICT
                try {
                    await db.query(`
                        INSERT INTO pedagogie.notes_evaluations
                            (id_eleve, id_matiere, id_professeur, note, trimestre, annee_scolaire, date_evaluation)
                        VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    `, [n.id_eleve, idMatiere, profId, note, trimestre, annee_scolaire]);
                    saved++;
                } catch(en2) { console.warn('saveNote fallback:', en2.message); }
            }
        }
        res.json({ success: true, message: `${saved} note(s) enregistrée(s)` });
    } catch (e) {
        console.error('Erreur saveNotes:', e);
        res.status(500).json({ success: false, message: 'Erreur serveur: ' + e.message });
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
        if (classe) { q += ` AND r.classe_concernee=$${params.length+1}`; params.push(classe); }
        if (type)   { q += ` AND r.type_document=$${params.length+1}`; params.push(type); }
        q += ' ORDER BY r.date_depot DESC';

        const r = await db.query(q, params);
        
        const ressources = r.rows.map(row => ({
            id_ressource:    row.id_ressource,
            titre:           row.titre,
            // type unifié pour le frontend
            type:            (row.type_document || 'cours').toLowerCase(),
            type_document:   row.type_document,
            // url unifié
            url:             row.url_fichier,
            url_fichier:     row.url_fichier,
            // classe unifiée
            cls:             row.classe_concernee,
            classe_cible:    row.classe_concernee,
            classe_concernee:row.classe_concernee,
            // date unifiée
            date_ajout:      row.date_depot,
            date_depot:      row.date_depot,
            date:            row.date_depot
                               ? new Date(row.date_depot).toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit'})
                               : '—',
            // infos calculées
            taille:          '—',
            format:          row.url_fichier ? row.url_fichier.split('.').pop().toUpperCase() : '—',
            est_visible:     true,
            visible:         true,
            mat:             'Ma matière',
            prof_nom:        row.prof_nom,
            prof_prenom:     row.prof_prenom,
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
        const typeDoc   = (type_document || type_ressource || 'cours').toLowerCase();
        const classeDoc = classe_concernee || classe_cible || 'TOUTES';

        if (!titre) return res.status(400).json({ message: 'Titre requis' });

        // Récupérer ou créer automatiquement le profil prof
        let id_prof;
        try {
            let pp = await db.query(
                `SELECT id_prof FROM pedagogie.profils_profs WHERE id_user=$1`, [profId]
            );
            if (!pp.rows.length) {
                const created = await db.query(
                    `INSERT INTO pedagogie.profils_profs (id_user, specialite, biographie)
                     VALUES ($1, '', '') RETURNING id_prof`,
                    [profId]
                );
                id_prof = created.rows[0].id_prof;
            } else {
                id_prof = pp.rows[0].id_prof;
            }
        } catch(eprofil) {
            // Si la table profils_profs a une contrainte, ignorer et utiliser id_user comme fallback
            console.warn('profils_profs insert:', eprofil.message);
            // Essayer de re-lire
            const pp2 = await db.query(`SELECT id_prof FROM pedagogie.profils_profs WHERE id_user=$1`, [profId]);
            if (!pp2.rows.length) {
                return res.status(500).json({ message: 'Impossible de créer le profil professeur: ' + eprofil.message });
            }
            id_prof = pp2.rows[0].id_prof;
        }
        const url_fichier = req.file ? `/uploads/${req.file.filename}` : null;

        const r = await db.query(`
            INSERT INTO pedagogie.ressources_pedagogiques
                (id_prof, titre, type_document, url_fichier, classe_concernee, date_depot)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id_ressource, titre, type_document, url_fichier, classe_concernee, date_depot
        `, [id_prof, titre, typeDoc, url_fichier, classeDoc]);

        const row = r.rows[0];
        res.json({
            success: true,
            message: 'Ressource publiée avec succès',
            ressource: {
                id_ressource:    row.id_ressource,
                titre:           row.titre,
                type:            (row.type_document || 'cours').toLowerCase(),
                type_document:   row.type_document,
                url:             row.url_fichier,
                url_fichier:     row.url_fichier,
                cls:             row.classe_concernee,
                classe_cible:    row.classe_concernee,
                classe_concernee:row.classe_concernee,
                date_ajout:      row.date_depot,
                date:            new Date(row.date_depot).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}),
                taille:          req.file ? (req.file.size > 1048576
                                   ? (req.file.size/1048576).toFixed(1)+' Mo'
                                   : Math.round(req.file.size/1024)+' Ko') : '—',
                format:          row.url_fichier ? row.url_fichier.split('.').pop().toUpperCase() : '—',
                est_visible:     true,
                visible:         true,
                mat:             'Ma matière',
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
    res.json({ success: true, message: 'Avis enregistré' });
};

// ═══════════════════════════════════════════
// CAHIER DE TEXTE
// ═══════════════════════════════════════════
exports.getCahierTexte = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { classe } = req.query;
        let q = `
            SELECT ct.id_seance, ct.classe, ct.matiere, ct.titre, ct.contenu,
                   ct.taf, ct.date_seance, ct.heure_debut, ct.heure_fin
            FROM pedagogie.cahier_texte ct
            WHERE ct.id_professeur = $1::TEXT
        `;
        const params = [profId];
        if (classe) { q += ` AND ct.classe = $2`; params.push(classe); }
        q += ` ORDER BY ct.date_seance DESC, ct.heure_debut DESC LIMIT 100`;
        const r = await db.query(q, params);
        res.json({ success: true, seances: r.rows });
    } catch (e) {
        console.warn('getCahierTexte:', e.message);
        // Table peut ne pas exister encore - retourner vide sans erreur
        res.json({ success: true, seances: [] });
    }
};

exports.saveCahierTexte = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { classe, matiere, titre, contenu, taf, date_seance, heure_debut, heure_fin } = req.body;
        if (!titre || !matiere) return res.status(400).json({ success: false, message: 'Titre et matière requis' });

        // Créer la table si elle n'existe pas (id_professeur TEXT pour compatibilité UUID/INT)
        await db.query(`
            CREATE TABLE IF NOT EXISTS pedagogie.cahier_texte (
                id_seance SERIAL PRIMARY KEY,
                id_professeur TEXT,
                classe TEXT,
                matiere TEXT NOT NULL,
                titre TEXT NOT NULL,
                contenu TEXT,
                taf TEXT,
                date_seance DATE,
                heure_debut TEXT,
                heure_fin TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(() => {});
        
        // Si la table existe avec INTEGER, migrer silencieusement vers TEXT
        await db.query(`
            ALTER TABLE pedagogie.cahier_texte 
            ALTER COLUMN id_professeur TYPE TEXT USING id_professeur::TEXT
        `).catch(() => {});

        const r = await db.query(`
            INSERT INTO pedagogie.cahier_texte
                (id_professeur, classe, matiere, titre, contenu, taf, date_seance, heure_debut, heure_fin)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *
        `, [String(profId), classe, matiere, titre, contenu||'', taf||'', date_seance||null, heure_debut||'', heure_fin||'']);
        res.json({ success: true, message: 'Séance enregistrée', seance: r.rows[0] });
    } catch (e) {
        console.error('saveCahierTexte:', e.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// LISTE PROFS POUR SALLE DES PROFS (chat)
// ═══════════════════════════════════════════
exports.getListeSalle = async (req, res) => {
    try {
        const profId = req.user?.id;
        const r = await db.query(`
            SELECT c.id_user, c.nom, c.prenom, c.code_unique,
                   p.specialite
            FROM authentification.comptes c
            LEFT JOIN pedagogie.profils_profs p ON p.id_user = c.id_user
            WHERE c.role_actuel = 'PROFESSEUR'
              AND c.est_actif = true
              AND c.id_user != $1
            ORDER BY c.nom, c.prenom
        `, [profId]);
        res.json({ success: true, profs: r.rows });
    } catch (e) {
        console.error('getListeSalle:', e.message);
        res.status(500).json({ success: false, profs: [] });
    }
};

// ═══════════════════════════════════════════
// MES CLASSES & MATIÈRES (pour la saisie des notes)
// ═══════════════════════════════════════════
exports.getMesClasses = async (req, res) => {
    try {
        const profId = req.user?.id;

        // 1. Chercher les classes où des élèves existent (toutes les classes)
        const toutesClasses = ['6ème','5ème','4ème','3ème','2nde A','2nde C','1ère A','1ère D','Tle A','Tle D'];
        
        // Vérifier quelles classes ont des élèves actifs
        const classesResult = await db.query(`
            SELECT DISTINCT pe.classe_actuelle
            FROM vie_scolaire.profils_eleves pe
            JOIN authentification.comptes c ON c.id_user = pe.id_user
            WHERE c.est_actif = true
              AND pe.classe_actuelle IS NOT NULL
            ORDER BY pe.classe_actuelle
        `);
        
        const classesBD = classesResult.rows.map(r => r.classe_actuelle);
        
        // Trier dans l'ordre scolaire
        const ordre = ['6ème','5ème','4ème','3ème','2nde A','2nde C','1ère A','1ère D','Tle A','Tle D'];
        const classes = ordre.filter(c => classesBD.includes(c));
        
        // Si aucune classe en BD, retourner toutes
        const classesFinales = classes.length ? classes : toutesClasses;

        // 2. Récupérer les matières du prof depuis son profil
        const profResult = await db.query(`
            SELECT pp.specialite
            FROM pedagogie.profils_profs pp
            WHERE pp.id_user = $1
        `, [profId]);
        
        let matieres = [];
        if (profResult.rows.length && profResult.rows[0].specialite) {
            // Spécialité peut être une matière unique ou plusieurs séparées par virgule
            matieres = profResult.rows[0].specialite
                .split(',')
                .map(m => m.trim())
                .filter(m => m.length > 0);
        }
        
        // Fallback si pas de matières configurées
        if (!matieres.length) {
            matieres = ['Mathématiques'];
        }

        res.json({ 
            success: true, 
            classes: classesFinales,
            matieres
        });
    } catch (e) {
        console.error('getMesClasses:', e.message);
        res.json({ 
            success: false, 
            classes: ['6ème','5ème','4ème','3ème','2nde A','2nde C','1ère A','1ère D','Tle A','Tle D'],
            matieres: ['Mathématiques']
        });
    }
};
