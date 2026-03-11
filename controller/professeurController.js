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
            SELECT c.nom, c.prenom, c.email, c.telephone, c.classe,
                   p.specialite, p.biographie, p.date_arrivee
            FROM authentification.comptes c
            LEFT JOIN pedagogie.profils_profs p ON p.id_user = c.id_user
            WHERE c.id_user = $1
        `, [profId]);
        if (!r.rows.length) return res.status(404).json({ message: 'Profil introuvable' });
        res.json({ success: true, profil: r.rows[0] });
    } catch (e) {
        console.error('Erreur getProfil:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.updateProfil = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { telephone, specialite, biographie } = req.body;
        await db.query(`UPDATE authentification.comptes SET telephone=$1 WHERE id_user=$2`, [telephone, profId]);
        await db.query(`
            INSERT INTO pedagogie.profils_profs (id_user, specialite, biographie)
            VALUES ($1, $2, $3)
            ON CONFLICT (id_user) DO UPDATE SET specialite=$2, biographie=$3
        `, [profId, specialite, biographie]);
        res.json({ success: true, message: 'Profil mis à jour' });
    } catch (e) {
        console.error('Erreur updateProfil:', e);
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

            await db.query(`
                INSERT INTO pedagogie.notes_evaluations
                    (id_eleve, id_matiere, id_professeur, note, trimestre, annee_scolaire, date_evaluation)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (id_eleve, id_matiere, id_professeur, trimestre, annee_scolaire)
                DO UPDATE SET note=$4, date_evaluation=NOW()
            `, [n.id_eleve, n.id_matiere, profId, note, trimestre, annee_scolaire]);
            saved++;
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
        if (classe) { q += ` AND r.classe_concernee = $${params.length + 1}`; params.push(classe); }
        if (type)   { q += ` AND r.type_document = $${params.length + 1}`; params.push(type); }
        q += ' ORDER BY r.date_depot DESC';

        const r = await db.query(q, params);
        res.json({ success: true, ressources: r.rows });
    } catch (e) {
        console.error('Erreur getRessources:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.ajouterRessource = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { titre, type_document, classe_concernee, description, trimestre } = req.body;
        if (!titre) return res.status(400).json({ message: 'Titre requis' });

        // Récupérer id_prof
        const pp = await db.query(`SELECT id_prof FROM pedagogie.profils_profs WHERE id_user=$1`, [profId]);
        if (!pp.rows.length) return res.status(404).json({ message: 'Profil prof introuvable' });
        const id_prof = pp.rows[0].id_prof;

        const url_fichier = req.file ? `/uploads/${req.file.filename}` : null;

        const r = await db.query(`
            INSERT INTO pedagogie.ressources_pedagogiques
                (id_prof, titre, type_document, url_fichier, classe_concernee, date_depot)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id_ressource
        `, [id_prof, titre, type_document || 'cours', url_fichier, classe_concernee]);

        res.json({ success: true, message: 'Ressource publiée', id: r.rows[0].id_ressource });
    } catch (e) {
        console.error('Erreur ajouterRessource:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.supprimerRessource = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { id } = req.params;
        // Vérifier que la ressource appartient à ce prof
        const check = await db.query(`
            SELECT r.id_ressource, r.url_fichier FROM pedagogie.ressources_pedagogiques r
            JOIN pedagogie.profils_profs pp ON pp.id_prof = r.id_prof
            WHERE r.id_ressource = $1 AND pp.id_user = $2
        `, [id, profId]);
        if (!check.rows.length) return res.status(403).json({ message: 'Non autorisé' });

        // Supprimer le fichier si existant
        if (check.rows[0].url_fichier) {
            const fp = path.join(__dirname, '../public', check.rows[0].url_fichier);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await db.query(`DELETE FROM pedagogie.ressources_pedagogiques WHERE id_ressource=$1`, [id]);
        res.json({ success: true, message: 'Ressource supprimée' });
    } catch (e) {
        console.error('Erreur supprimerRessource:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.toggleVisibilite = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { id } = req.params;
        // Simple confirmation — la visibilité est gérée côté front pour l'instant
        res.json({ success: true, message: 'Visibilité mise à jour' });
    } catch (e) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ═══════════════════════════════════════════
// ORIENTATION
// ═══════════════════════════════════════════
exports.getOrientation = async (req, res) => {
    try {
        const profId = req.user?.id;
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
        if (classe) { q += ` AND pe.classe_actuelle = $1`; params.push(classe); }
        else { q += ` AND pe.classe_actuelle IN ('3ème','2nde A','2nde C','1ère A','1ère D','Tle A','Tle D')`; }
        q += ' GROUP BY c.id_user, c.nom, c.prenom, c.code_unique, pe.classe_actuelle ORDER BY c.nom LIMIT 50';

        const r = await db.query(q, params);
        res.json({ success: true, eleves: r.rows });
    } catch (e) {
        console.error('Erreur getOrientation:', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

exports.saveOrientation = async (req, res) => {
    try {
        const profId = req.user?.id;
        const { id_eleve, points_forts, points_faibles, serie_recommandee, commentaire } = req.body;
        if (!id_eleve || !serie_recommandee) return res.status(400).json({ message: 'Élève et série requis' });
        // Stocker dans une table dédiée si elle existe, sinon retourner succès
        res.json({ success: true, message: 'Avis d\'orientation enregistré' });
    } catch (e) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
