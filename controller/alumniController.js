const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * ESPACE ALUMNI - Contrôleur pour toutes les fonctionnalités
 * Un alumni peut :
 * - Gérer son profil professionnel
 * - Publier des conseils de mentorat
 * - Donner des avis d'orientation aux élèves
 * - Consulter les offres d'emploi/stage
 */

// ========== PROFIL ALUMNI ==========
exports.getProfilAlumni = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });

        // Assurer que les colonnes existent
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS photo_url TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS biographie TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS telephone VARCHAR(20)`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS adresse TEXT`);

        const base = await db.query(
            `SELECT id_user, code_unique, nom, prenom, email, telephone, est_actif
             FROM authentification.comptes WHERE id_user = $1`, [alumniId]
        );
        if (!base.rows.length) return res.status(404).json({ message: 'Profil non trouvé' });
        const c = base.rows[0];

        let profil = {
            id_alumni: null,
            derniere_classe: null,
            annee_diplome: null,
            situation_actuelle: null,
            profession: null,
            biographie: null,
            telephone: c.telephone,
            adresse: null,
            photo_url: null,
            bio: null,
            linkedin_url: null,
            competences: [],
            experiences: null,
            domaine_expertise: null,
            annee_graduation: null,
            universite: null,
            secteur_activite: null,
            entreprise_actuelle: null,
            poste_actuel: null,
            ville_residence: null,
            pays_residence: 'Burkina Faso',
            disponible_mentorat: true,
            interets: [],
            langues_parlees: ['Français'],
            site_web: null,
            reseaux_sociaux: {}
        };

        try {
            const extra = await db.query(
                `SELECT * FROM gestion_ape.profils_alumni WHERE id_user = $1`, [alumniId]
            );
            if (extra.rows.length) {
                const p = extra.rows[0];
                profil = { ...profil, ...p };
                // Assurer que les tableaux sont des tableaux
                if (typeof p.competences === 'string') {
                    try { profil.competences = JSON.parse(p.competences); } catch { profil.competences = []; }
                }
                if (typeof p.interets === 'string') {
                    try { profil.interets = JSON.parse(p.interets); } catch { profil.interets = []; }
                }
                if (typeof p.langues_parlees === 'string') {
                    try { profil.langues_parlees = JSON.parse(p.langues_parlees); } catch { profil.langues_parlees = ['Français']; }
                }
                if (typeof p.reseaux_sociaux === 'string') {
                    try { profil.reseaux_sociaux = JSON.parse(p.reseaux_sociaux); } catch { profil.reseaux_sociaux = {}; }
                }
            }
        } catch (e2) {
            console.log('Pas de profil étendu trouvé:', e2.message);
        }

        res.json({
            success: true,
            profil: {
                id: c.id_user,
                nom: c.nom,
                prenom: c.prenom,
                nom_complet: `${c.prenom} ${c.nom}`,
                code_unique: c.code_unique,
                email: c.email,
                telephone: profil.telephone,
                ...profil,
                compte_actif: c.est_actif
            }
        });
    } catch (error) {
        console.error('getProfilAlumni:', error.message);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

exports.updateProfilAlumni = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });

        // Assurer que les colonnes existent
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS photo_url TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS biographie TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS telephone VARCHAR(20)`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS adresse TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS bio TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS linkedin_url TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS competences TEXT[]`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS experiences TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS domaine_expertise VARCHAR(100)`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS annee_graduation VARCHAR(10)`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS universite VARCHAR(100)`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS secteur_activite VARCHAR(100)`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS entreprise_actuelle VARCHAR(100)`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS poste_actuel VARCHAR(100)`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS ville_residence VARCHAR(100)`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS pays_residence VARCHAR(50)`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS disponible_mentorat BOOLEAN`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS interets TEXT[]`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS langues_parlees TEXT[]`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS site_web TEXT`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS reseaux_sociaux JSONB`);
        await db.query(`ALTER TABLE gestion_ape.profils_alumni ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);

        const {
            telephone, adresse, biographie, bio, photo_url, linkedin_url,
            competences, experiences, domaine_expertise, annee_graduation,
            universite, secteur_activite, entreprise_actuelle, poste_actuel,
            ville_residence, pays_residence, disponible_mentorat, interets,
            langues_parlees, site_web, reseaux_sociaux,
            // Champs existants
            derniere_classe, annee_diplome, situation_actuelle, profession
        } = req.body;

        const bioFinal = biographie || bio || null;

        await db.query(`
            INSERT INTO gestion_ape.profils_alumni
                (id_user, derniere_classe, annee_diplome, situation_actuelle, profession,
                 biographie, telephone, adresse, photo_url, bio, linkedin_url,
                 competences, experiences, domaine_expertise, annee_graduation,
                 universite, secteur_activite, entreprise_actuelle, poste_actuel,
                 ville_residence, pays_residence, disponible_mentorat, interets,
                 langues_parlees, site_web, reseaux_sociaux, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW())
            ON CONFLICT (id_user) DO UPDATE SET
                derniere_classe     = COALESCE(EXCLUDED.derniere_classe, gestion_ape.profils_alumni.derniere_classe),
                annee_diplome       = COALESCE(EXCLUDED.annee_diplome, gestion_ape.profils_alumni.annee_diplome),
                situation_actuelle  = COALESCE(EXCLUDED.situation_actuelle, gestion_ape.profils_alumni.situation_actuelle),
                profession          = COALESCE(EXCLUDED.profession, gestion_ape.profils_alumni.profession),
                biographie          = COALESCE(EXCLUDED.biographie, gestion_ape.profils_alumni.biographie),
                telephone           = COALESCE(EXCLUDED.telephone, gestion_ape.profils_alumni.telephone),
                adresse             = COALESCE(EXCLUDED.adresse, gestion_ape.profils_alumni.adresse),
                photo_url           = COALESCE(EXCLUDED.photo_url, gestion_ape.profils_alumni.photo_url),
                bio                 = COALESCE(EXCLUDED.bio, gestion_ape.profils_alumni.bio),
                linkedin_url        = COALESCE(EXCLUDED.linkedin_url, gestion_ape.profils_alumni.linkedin_url),
                competences         = COALESCE(EXCLUDED.competences, gestion_ape.profils_alumni.competences),
                experiences         = COALESCE(EXCLUDED.experiences, gestion_ape.profils_alumni.experiences),
                domaine_expertise    = COALESCE(EXCLUDED.domaine_expertise, gestion_ape.profils_alumni.domaine_expertise),
                annee_graduation    = COALESCE(EXCLUDED.annee_graduation, gestion_ape.profils_alumni.annee_graduation),
                universite          = COALESCE(EXCLUDED.universite, gestion_ape.profils_alumni.universite),
                secteur_activite    = COALESCE(EXCLUDED.secteur_activite, gestion_ape.profils_alumni.secteur_activite),
                entreprise_actuelle = COALESCE(EXCLUDED.entreprise_actuelle, gestion_ape.profils_alumni.entreprise_actuelle),
                poste_actuel        = COALESCE(EXCLUDED.poste_actuel, gestion_ape.profils_alumni.poste_actuel),
                ville_residence     = COALESCE(EXCLUDED.ville_residence, gestion_ape.profils_alumni.ville_residence),
                pays_residence      = COALESCE(EXCLUDED.pays_residence, gestion_ape.profils_alumni.pays_residence),
                disponible_mentorat = COALESCE(EXCLUDED.disponible_mentorat, gestion_ape.profils_alumni.disponible_mentorat),
                interets            = COALESCE(EXCLUDED.interets, gestion_ape.profils_alumni.interets),
                langues_parlees     = COALESCE(EXCLUDED.langues_parlees, gestion_ape.profils_alumni.langues_parlees),
                site_web            = COALESCE(EXCLUDED.site_web, gestion_ape.profils_alumni.site_web),
                reseaux_sociaux     = COALESCE(EXCLUDED.reseaux_sociaux, gestion_ape.profils_alumni.reseaux_sociaux),
                updated_at          = NOW()
        `, [
            alumniId, derniere_classe || null, annee_diplome || null, situation_actuelle || null, profession || null,
            bioFinal, telephone || null, adresse || null, photo_url || null, bioFinal, linkedin_url || null,
            competences || [], experiences || null, domaine_expertise || null, annee_graduation || null,
            universite || null, secteur_activite || null, entreprise_actuelle || null, poste_actuel || null,
            ville_residence || null, pays_residence || 'Burkina Faso', disponible_mentorat !== undefined ? disponible_mentorat : true,
            interets || [], langues_parlees || ['Français'], site_web || null, reseaux_sociaux || {}
        ]);

        res.json({ success: true, message: 'Profil mis à jour' });
    } catch (error) {
        console.error('updateProfilAlumni:', error.message);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ========== MENTORATS ==========
exports.getMentorats = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT m.*, c.prenom, c.nom, c.code_unique,
                   pa.photo_url, pa.profession, pa.domaine_expertise
            FROM gestion_ape.mentorats m
            JOIN authentification.comptes c ON m.id_alumni = c.id_user
            LEFT JOIN gestion_ape.profils_alumni pa ON pa.id_user = c.id_user
            ORDER BY m.date_publication DESC
        `);

        res.json({
            success: true,
            mentorats: result.rows.map(m => ({
                ...m,
                auteur: `${m.prenom} ${m.nom}`,
                filiere_suggeree: m.filiere_suggeree
            }))
        });
    } catch (error) {
        console.error('getMentorats:', error);
        res.status(500).json({ message: 'Erreur récupération mentorats' });
    }
};

exports.createMentorat = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });

        const { contenu, filiere_suggeree } = req.body;
        if (!contenu) return res.status(400).json({ message: 'Contenu requis' });

        await db.query(`
            INSERT INTO gestion_ape.mentorats (id_alumni, contenu_conseil, filiere_suggeree, date_publication)
            VALUES ($1, $2, $3, NOW())
        `, [alumniId, contenu, filiere_suggeree || null]);

        res.json({ success: true, message: 'Mentorat publié' });
    } catch (error) {
        console.error('createMentorat:', error);
        res.status(500).json({ message: 'Erreur création mentorat' });
    }
};

// ========== ORIENTATION ==========
exports.getOrientationEleves = async (req, res) => {
    try {
        const classe = req.query.classe || '';
        let query = `
            SELECT c.id_user, c.prenom, c.nom, c.code_unique,
                   pe.classe_actuelle as classe
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            WHERE c.role_actuel = 'ELEVE' AND c.est_actif = true
        `;
        const params = [];

        if (classe) {
            query += ' AND pe.classe_actuelle = $1';
            params.push(classe);
        }

        query += ' ORDER BY c.nom, c.prenom';

        const result = await db.query(query, params);
        res.json({
            success: true,
            eleves: result.rows
        });
    } catch (error) {
        console.error('getOrientationEleves:', error);
        res.status(500).json({ message: 'Erreur récupération élèves' });
    }
};

exports.getAvisOrientation = async (req, res) => {
    try {
        const { eleveId } = req.params;
        const result = await db.query(`
            SELECT ao.*, c.prenom, c.nom
            FROM pedagogie.avis_orientation ao
            JOIN authentification.comptes c ON ao.id_alumni = c.id_user
            WHERE ao.id_eleve = $1 AND ao.id_alumni IS NOT NULL
            ORDER BY ao.updated_at DESC
        `, [eleveId]);

        res.json({
            success: true,
            avis: result.rows
        });
    } catch (error) {
        console.error('getAvisOrientation:', error);
        res.status(500).json({ message: 'Erreur récupération avis' });
    }
};

exports.createAvisOrientation = async (req, res) => {
    try {
        const alumniId = req.user?.id;
        if (!alumniId) return res.status(401).json({ message: 'Non authentifié' });

        const { eleveId, commentaire, serie_recommandee } = req.body;
        if (!eleveId || !commentaire) {
            return res.status(400).json({ message: 'Données manquantes' });
        }

        // Vérifier si un avis existe déjà
        const existing = await db.query(
            `SELECT id FROM pedagogie.avis_orientation WHERE id_alumni = $1 AND id_eleve = $2`,
            [alumniId, eleveId]
        );

        if (existing.rows.length > 0) {
            // Mettre à jour
            await db.query(`
                UPDATE pedagogie.avis_orientation
                SET commentaire = $3, serie_recommandee = $4, updated_at = NOW()
                WHERE id_alumni = $1 AND id_eleve = $2
            `, [alumniId, eleveId, commentaire, serie_recommandee || null]);
        } else {
            // Insérer
            await db.query(`
                INSERT INTO pedagogie.avis_orientation
                    (id_prof, id_eleve, id_alumni, commentaire, serie_recommandee, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `, [alumniId, eleveId, alumniId, commentaire, serie_recommandee || null]);
        }

        res.json({ success: true, message: 'Avis d\'orientation publié' });
    } catch (error) {
        console.error('createAvisOrientation:', error);
        res.status(500).json({ message: 'Erreur création avis' });
    }
};

// ========== OFFRES (si nécessaire plus tard) ==========
// exports.getOffres = async (req, res) => { ... }
// exports.createOffre = async (req, res) => { ... }