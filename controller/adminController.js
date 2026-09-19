const db = require('../config/db');
const pdfService = require('../services/pdfService');

// ✅ SÉCURITÉ : mot de passe temporaire aléatoire à la création d'un compte.
// Avant : le mot de passe par défaut était identique à l'identifiant
// (ex: identifiant CN-2026-2501 → mot de passe CN-2026-2501), et ces
// identifiants sont séquentiels donc devinables — n'importe qui pouvait se
// connecter à la place de l'élève/prof réel avant sa première connexion.
// Désormais le mot de passe initial est aléatoire et communiqué séparément
// par la Direction (affiché une seule fois à la création du compte).
function genTempPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

// ✅ Génération sûre d'un code_unique : deux requêtes qui arrivent en même
// temps (ex: deux imports Excel lancés à quelques secondes d'écart, ou un
// double-clic sur "Confirmer") lisent la même valeur de COUNT(*) et
// calculent donc le MÊME code — l'une des deux échoue alors sur la
// contrainte unique "comptes_code_unique_key". Découvert en conditions
// réelles : un import de 3 élèves donnait "0 créés, 3 erreurs" alors que
// les 3 comptes existaient bel et bien (créés par une requête concurrente
// qui avait gagné la course). Cette fonction retente avec le numéro
// suivant uniquement sur CE conflit précis — jamais sur une autre erreur.
async function insererAvecCodeUnique(genererCode, executerInsertion, maxTentatives = 5) {
    let derniereErreur;
    for (let tentative = 0; tentative < maxTentatives; tentative++) {
        const code = genererCode();
        try {
            return { code, resultat: await executerInsertion(code) };
        } catch (err) {
            const conflitCode = err.code === '23505' && /code_unique/.test(err.constraint || err.message || '');
            if (!conflitCode) throw err;
            derniereErreur = err;
        }
    }
    throw derniereErreur;
}

// ═══════════════════════════════════════════
// RÉINITIALISER LE MOT DE PASSE D'UN COMPTE (tous rôles)
// ═══════════════════════════════════════════
// ✅ Le mot de passe est haché (bcrypt) — irréversible par nature, comme
// partout ailleurs (banques, Google...). Impossible de "revoir" l'original,
// même en base. La seule vraie solution quand quelqu'un l'a perdu est de
// lui en générer un nouveau, affiché une seule fois ici, exactement comme
// à la création du compte.
exports.resetMotDePasse = async (req, res) => {
    try {
        const { id } = req.params;
        const bcrypt = require('bcryptjs');
        const compte = await db.query(
            `SELECT id_user, nom, prenom, code_unique, role_actuel FROM authentification.comptes WHERE id_user = $1`,
            [id]
        );
        if (!compte.rows.length) return res.status(404).json({ success: false, message: 'Compte introuvable' });

        const motDePasseTemp = genTempPassword();
        const hash = await bcrypt.hash(motDePasseTemp, 10);
        await db.query(`UPDATE authentification.comptes SET mot_de_passe = $1 WHERE id_user = $2`, [hash, id]);

        const c = compte.rows[0];
        res.json({
            success: true,
            message: 'Mot de passe réinitialisé',
            code_unique: c.code_unique,
            nom: c.nom,
            prenom: c.prenom,
            role_actuel: c.role_actuel,
            mot_de_passe_temporaire: motDePasseTemp
        });
    } catch (e) {
        console.error('resetMotDePasse:', e.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + e.message });
    }
};

// Retourne des statistiques pour le dashboard d'administration
exports.getStats = async (req, res) => {
    // Contrôle simple de rôle (attendre que le token fournisse 'role')
    const role = req.user && req.user.role ? req.user.role : null;
    console.log('getStats - req.user:', req.user);
    console.log('getStats - role:', role);
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
            const r3 = await db.query("SELECT COUNT(DISTINCT classe_actuelle) FROM vie_scolaire.profils_eleves WHERE classe_actuelle IS NOT NULL");
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

        // ✅ Vraies convocations en attente (pas encore accusées reçues) —
        // avant : direction.html affichait "alerts" (nombre de notifications
        // système non lues, toutes confondues) sous ce libellé, ce qui n'a
        // aucun rapport et donnait des chiffres énormes/faux.
        try {
            const r9 = await db.query(
                "SELECT COUNT(*) FROM gestion.convocations WHERE UPPER(COALESCE(statut,'ENVOYEE')) != 'ACCUSE_RECU'"
            );
            stats.convocations_en_attente = parseInt(r9.rows[0].count) || 0;
        } catch (e) { stats.convocations_en_attente = 0; }
        // Moyennes par classe pour graphique performances — trimestre demandé
        // par l'onglet cliqué (T1/T2/T3), ou moyenne toutes évaluations
        // confondues pour "Annuel" (pas de filtre trimestre).
        try {
            const trimestreDemande = ['1', '2', '3'].includes(String(req.query.trimestre)) ? parseInt(req.query.trimestre) : null;
            const r7 = await db.query(
                trimestreDemande
                    ? `SELECT pe.classe_actuelle AS classe, ROUND(AVG(n.note)::numeric,2) AS moyenne
                       FROM pedagogie.notes_evaluations n
                       JOIN vie_scolaire.profils_eleves pe ON pe.id_user = n.id_eleve
                       WHERE n.trimestre = $1
                       GROUP BY pe.classe_actuelle`
                    : `SELECT pe.classe_actuelle AS classe, ROUND(AVG(n.note)::numeric,2) AS moyenne
                       FROM pedagogie.notes_evaluations n
                       JOIN vie_scolaire.profils_eleves pe ON pe.id_user = n.id_eleve
                       GROUP BY pe.classe_actuelle`,
                trimestreDemande ? [trimestreDemande] : []
            );
            stats.moyennes_classes = {};
            r7.rows.forEach(r => { stats.moyennes_classes[r.classe] = parseFloat(r.moyenne); });
        } catch (e) { }

        // Répartition réelle des effectifs par classe (remplace les 5 lignes
        // qui étaient écrites en dur dans le HTML avec des chiffres fictifs)
        try {
            const rr = await db.query(`
                SELECT pe.classe_actuelle AS classe, COUNT(*) AS effectif
                FROM authentification.comptes c
                JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
                WHERE c.role_actuel = 'ELEVE' AND c.est_actif = true
                GROUP BY pe.classe_actuelle
                ORDER BY pe.classe_actuelle
            `);
            stats.repartition_classes = rr.rows.map(r => ({ classe: r.classe, effectif: parseInt(r.effectif) }));
        } catch (e) { stats.repartition_classes = []; }

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
        // ✅ Avec 0 élève réel, "100% de présence" est vrai au sens strict
        // (0 absent sur 0 élève) mais trompeur à l'affichage — ça ressemble
        // à une vraie mesure alors qu'il n'y a personne à mesurer. On
        // renvoie null (affiché "—" côté frontend) tant qu'il n'y a pas de
        // vrais élèves. Le fallback catch était aussi un chiffre inventé
        // (95) — remplacé par null également.
        try {
            const nbEleves = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='ELEVE' AND est_actif=true");
            if (parseInt(nbEleves.rows[0].count) === 0) {
                stats.presence = null;
            } else {
                const rp = await db.query(`
                    SELECT COUNT(DISTINCT id_eleve)::float / NULLIF((SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='ELEVE'),0) * 100 AS taux_abs
                    FROM gestion.absences WHERE date_absence >= NOW() - INTERVAL '30 days'
                `);
                const taux_abs = parseFloat(rp.rows[0]?.taux_abs) || 0;
                stats.presence = Math.round(100 - taux_abs);
            }
        } catch (e) { stats.presence = null; }

        res.json({ success: true, stats });
    } catch (err) {
        console.error('Erreur getStats:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};


// ═══════════════════════════════════════════
// FICHES D'IDENTIFIANTS (PDF) — remplace l'ancienne popup navigateur qui
// faisait window.print() ; génère un vrai PDF téléchargeable côté serveur.
// Les comptes (avec mot de passe temporaire en clair) arrivent dans le
// corps de la requête : ils ne sont disponibles qu'à l'instant de la
// création/import, jamais stockés ni re-consultables ensuite.
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// BARÈME & NOTES — coefficients par classe, pondération devoirs/
// composition, seuils de mention. Remplace l'objet PROGRAMMES codé en
// dur dans services/moyennesEngine.js ; chaque écriture recharge le
// cache en mémoire du moteur (chargerConfiguration) pour que le
// changement s'applique immédiatement, sans redéploiement.
// ═══════════════════════════════════════════
exports.getCoefficients = async (req, res) => {
    try {
        const { classe } = req.query;
        const q = classe
            ? await db.query(`SELECT id_coefficient, classe, nom_matiere, coefficient, domaine, optionnel FROM pedagogie.coefficients WHERE classe = $1 ORDER BY nom_matiere`, [classe])
            : await db.query(`SELECT id_coefficient, classe, nom_matiere, coefficient, domaine, optionnel FROM pedagogie.coefficients ORDER BY classe, nom_matiere`);
        res.json({ success: true, coefficients: q.rows });
    } catch (err) {
        console.error('getCoefficients:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

exports.updateCoefficient = async (req, res) => {
    try {
        const { id_coefficient } = req.params;
        const coef = parseInt(req.body.coefficient);
        if (isNaN(coef) || coef < 1 || coef > 20) {
            return res.status(400).json({ success: false, message: 'Coefficient invalide (doit être entre 1 et 20).' });
        }
        const upd = await db.query(
            `UPDATE pedagogie.coefficients SET coefficient = $1, updated_at = NOW(), updated_by = $2 WHERE id_coefficient = $3`,
            [coef, req.user?.id || null, id_coefficient]
        );
        if (upd.rowCount === 0) return res.status(404).json({ success: false, message: 'Coefficient introuvable.' });
        await rechargerMoteurNotes();
        res.json({ success: true });
    } catch (err) {
        console.error('updateCoefficient:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// ✅ Ajouter une matière au programme d'une classe — certaines écoles
// n'enseignent pas exactement les mêmes matières (ex: pas d'ECM en
// Terminale) ; avant, seule la modification d'un coefficient existant
// était possible, impossible d'ajouter/retirer une matière entière.
exports.addCoefficient = async (req, res) => {
    try {
        const { classe, nom_matiere, coefficient, domaine, optionnel } = req.body;
        if (!classe || !nom_matiere) {
            return res.status(400).json({ success: false, message: 'Classe et nom de matière requis.' });
        }
        const coef = parseInt(coefficient);
        if (isNaN(coef) || coef < 1 || coef > 20) {
            return res.status(400).json({ success: false, message: 'Coefficient invalide (doit être entre 1 et 20).' });
        }
        // La matière doit exister dans pedagogie.matieres pour qu'un
        // professeur puisse un jour y saisir des notes (id_matiere).
        await db.query(
            `INSERT INTO pedagogie.matieres (nom_matiere) VALUES ($1) ON CONFLICT (nom_matiere) DO NOTHING`,
            [nom_matiere.trim()]
        );
        const ins = await db.query(
            `INSERT INTO pedagogie.coefficients (classe, nom_matiere, coefficient, domaine, optionnel, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (classe, nom_matiere) DO NOTHING
             RETURNING id_coefficient`,
            [classe, nom_matiere.trim(), coef, domaine || 'Autre', !!optionnel, req.user?.id || null]
        );
        if (!ins.rows.length) {
            return res.status(409).json({ success: false, message: 'Cette matière existe déjà pour cette classe.' });
        }
        await rechargerMoteurNotes();
        res.json({ success: true, id_coefficient: ins.rows[0].id_coefficient });
    } catch (err) {
        console.error('addCoefficient:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// ✅ Retirer une matière du programme d'une classe — ne supprime pas
// les notes déjà saisies (elles restent visibles dans l'historique),
// seulement l'entrée du barème pour que la matière ne compte plus
// dans les nouveaux calculs de moyenne de cette classe.
exports.deleteCoefficient = async (req, res) => {
    try {
        const { id_coefficient } = req.params;
        const del = await db.query(`DELETE FROM pedagogie.coefficients WHERE id_coefficient = $1`, [id_coefficient]);
        if (del.rowCount === 0) return res.status(404).json({ success: false, message: 'Coefficient introuvable.' });
        await rechargerMoteurNotes();
        res.json({ success: true });
    } catch (err) {
        console.error('deleteCoefficient:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

exports.getConfigurationNotes = async (req, res) => {
    try {
        const q = await db.query(
            `SELECT poids_devoirs, poids_composition, seuil_tres_bien, seuil_bien, seuil_assez_bien, seuil_passable,
                    seuil_felicitations, seuil_encouragement, seuil_tableau_honneur, annee_scolaire_active
             FROM gestion.configuration LIMIT 1`
        );
        res.json({ success: true, config: q.rows[0] || {} });
    } catch (err) {
        console.error('getConfigurationNotes:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

exports.updateConfigurationNotes = async (req, res) => {
    try {
        const pd = parseFloat(req.body.poids_devoirs);
        const pc = parseFloat(req.body.poids_composition);
        if (isNaN(pd) || isNaN(pc) || pd < 0 || pc < 0 || Math.abs(pd + pc - 1) > 0.01) {
            return res.status(400).json({ success: false, message: 'La pondération devoirs + composition doit totaliser 1 (ex: 0.4 + 0.6).' });
        }
        const seuils = ['seuil_tres_bien', 'seuil_bien', 'seuil_assez_bien', 'seuil_passable']
            .map(k => parseFloat(req.body[k]));
        if (seuils.some(s => isNaN(s) || s < 0 || s > 20)) {
            return res.status(400).json({ success: false, message: 'Les seuils de mention doivent être entre 0 et 20.' });
        }
        const [seuilTb, seuilB, seuilAb, seuilP] = seuils;
        if (!(seuilTb > seuilB && seuilB > seuilAb && seuilAb > seuilP)) {
            return res.status(400).json({ success: false, message: 'Les seuils doivent être strictement décroissants : Très Bien > Bien > Assez Bien > Passable.' });
        }
        const seuilsHonneur = ['seuil_felicitations', 'seuil_encouragement', 'seuil_tableau_honneur']
            .map(k => parseFloat(req.body[k]));
        if (seuilsHonneur.some(s => isNaN(s) || s < 0 || s > 20)) {
            return res.status(400).json({ success: false, message: 'Les seuils de mention d\'honneur doivent être entre 0 et 20.' });
        }
        const [seuilFelic, seuilEncour, seuilTabHonneur] = seuilsHonneur;
        if (!(seuilFelic > seuilEncour && seuilEncour > seuilTabHonneur)) {
            return res.status(400).json({ success: false, message: 'Les seuils d\'honneur doivent être strictement décroissants : Félicitations > Encouragements > Tableau d\'honneur.' });
        }
        // gestion.configuration n'a qu'une seule ligne censée toujours
        // exister — si elle a été vidée (ex: remise à zéro complète),
        // l'UPDATE seul ne ferait rien silencieusement. On s'assure donc
        // qu'une ligne existe avant de mettre à jour.
        await db.query(`INSERT INTO gestion.configuration (nom_etablissement) SELECT 'Établissement' WHERE NOT EXISTS (SELECT 1 FROM gestion.configuration)`);
        await db.query(
            `UPDATE gestion.configuration SET poids_devoirs = $1, poids_composition = $2,
             seuil_tres_bien = $3, seuil_bien = $4, seuil_assez_bien = $5, seuil_passable = $6,
             seuil_felicitations = $7, seuil_encouragement = $8, seuil_tableau_honneur = $9,
             updated_at = NOW()`,
            [pd, pc, seuilTb, seuilB, seuilAb, seuilP, seuilFelic, seuilEncour, seuilTabHonneur]
        );
        await rechargerMoteurNotes();
        res.json({ success: true });
    } catch (err) {
        console.error('updateConfigurationNotes:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// ✅ Bulletin PDF d'un élève quelconque — pour Direction/Surveillant,
// même document que celui que l'élève/parent peuvent télécharger.
exports.getBulletinElevePdf = async (req, res) => {
    try {
        const eleveId = req.query.eleve_id;
        if (!eleveId) return res.status(400).json({ message: 'eleve_id requis' });
        const trimestre = parseInt(req.query.trimestre) || 1;
        const anneeScolaire = req.query.annee_scolaire || require('../services/moyennesEngine').getAnneeScolaireActive();
        const bulletinService = require('../services/bulletinService');
        const pdfService = require('../services/pdfService');
        const data = await bulletinService.calculerBulletinComplet(eleveId, trimestre, anneeScolaire);
        if (!data) return res.status(404).json({ message: 'Élève introuvable' });
        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        await pdfService.streamBulletinPdf(res, data, baseUrl);
    } catch (err) {
        console.error('getBulletinElevePdf:', err.message);
        res.status(500).json({ message: 'Erreur lors de la génération du bulletin' });
    }
};

async function rechargerMoteurNotes() {
    try { await require('../services/moyennesEngine').chargerConfiguration(); }
    catch (e) { console.error('Rechargement moteur de notes:', e.message); }
}

// ═══════════════════════════════════════════
// PASSAGE DE CLASSE — remplace l'objet PROGRAMMES codé en dur n'était
// que le premier problème : jusqu'ici, rien ne permettait de faire
// passer un élève en classe supérieure, le faire redoubler, ou clore
// une année scolaire — classe_actuelle n'était écrite qu'à la création
// du compte et jamais mise à jour ensuite. Voir services/bulletinService.js
// pour le calcul de la moyenne annuelle et la décision suggérée.
// ═══════════════════════════════════════════
exports.getAnneeScolaire = async (req, res) => {
    try {
        const q = await db.query(`SELECT annee_scolaire_active FROM gestion.configuration LIMIT 1`);
        res.json({ success: true, annee_scolaire_active: q.rows[0]?.annee_scolaire_active || '2025-2026' });
    } catch (err) {
        console.error('getAnneeScolaire:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

exports.avancerAnneeScolaire = async (req, res) => {
    try {
        const q = await db.query(`SELECT annee_scolaire_active FROM gestion.configuration LIMIT 1`);
        const actuelle = q.rows[0]?.annee_scolaire_active || '2025-2026';
        const m = actuelle.match(/^(\d{4})-(\d{4})$/);
        if (!m) return res.status(500).json({ success: false, message: 'Format d\'année scolaire invalide en base.' });
        const suivante = `${parseInt(m[1]) + 1}-${parseInt(m[2]) + 1}`;
        await db.query(`UPDATE gestion.configuration SET annee_scolaire_active = $1, updated_at = NOW()`, [suivante]);
        await rechargerMoteurNotes();
        res.json({ success: true, annee_scolaire_active: suivante });
    } catch (err) {
        console.error('avancerAnneeScolaire:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

exports.getRosterPassage = async (req, res) => {
    try {
        const { classe } = req.query;
        if (!classe) return res.status(400).json({ message: 'classe requise' });
        const engine = require('../services/moyennesEngine');
        const bulletinService = require('../services/bulletinService');
        const roster = await bulletinService.construireRosterPassage(classe, engine.getAnneeScolaireActive());
        res.json({ success: true, roster, annee_scolaire: engine.getAnneeScolaireActive() });
    } catch (err) {
        console.error('getRosterPassage:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

exports.executerPassage = async (req, res) => {
    const client = await db.connect();
    try {
        const { decisions } = req.body;
        if (!Array.isArray(decisions) || !decisions.length) {
            return res.status(400).json({ message: 'Aucune décision à appliquer' });
        }
        const decisionsValides = ['PROMU', 'REDOUBLE', 'DIPLOME', 'PARTI'];
        for (const d of decisions) {
            if (!d.id_eleve || !decisionsValides.includes(d.decision)) {
                return res.status(400).json({ message: 'Décision invalide pour un élève' });
            }
            if (d.decision === 'PROMU' && !d.classe_arrivee) {
                return res.status(400).json({ message: 'Classe d\'arrivée requise pour une promotion' });
            }
        }

        const engine = require('../services/moyennesEngine');
        const anneeScolaire = engine.getAnneeScolaireActive();

        await client.query('BEGIN');
        let traites = 0;
        for (const d of decisions) {
            const actuel = await client.query(
                `SELECT classe_actuelle FROM vie_scolaire.profils_eleves WHERE id_user = $1`, [d.id_eleve]
            );
            if (!actuel.rows.length) continue;
            const classeDepart = actuel.rows[0].classe_actuelle;

            const statutMap = { PROMU: 'INSCRIT', REDOUBLE: 'REDOUBLANT', DIPLOME: 'DIPLOME', PARTI: 'PARTI' };
            const classeArrivee = d.decision === 'PROMU' ? d.classe_arrivee : (d.decision === 'REDOUBLE' ? classeDepart : null);

            if (d.decision === 'PROMU') {
                await client.query(
                    `UPDATE vie_scolaire.profils_eleves SET classe_actuelle = $1, statut_scolaire = $2 WHERE id_user = $3`,
                    [classeArrivee, statutMap[d.decision], d.id_eleve]
                );
            } else {
                await client.query(
                    `UPDATE vie_scolaire.profils_eleves SET statut_scolaire = $1 WHERE id_user = $2`,
                    [statutMap[d.decision], d.id_eleve]
                );
            }
            // Diplômé ou parti : le compte sort des effectifs actifs (plus
            // de connexion possible) mais reste en base — rien n'est
            // supprimé, juste archivé.
            if (d.decision === 'DIPLOME' || d.decision === 'PARTI') {
                await client.query(`UPDATE authentification.comptes SET est_actif = false WHERE id_user = $1`, [d.id_eleve]);
            }

            await client.query(
                `INSERT INTO vie_scolaire.historique_scolarite
                 (id_eleve, annee_scolaire, classe_depart, classe_arrivee, decision, moyenne_annuelle, decide_par)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [d.id_eleve, anneeScolaire, classeDepart, classeArrivee, d.decision, d.moyenne_annuelle || null, req.user?.id || null]
            );
            traites++;
        }
        await client.query('COMMIT');
        res.json({ success: true, traites });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('executerPassage:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur — aucune modification appliquée.' });
    } finally {
        client.release();
    }
};

exports.getFichesIdentifiantsPdf = async (req, res) => {
    try {
        const comptes = Array.isArray(req.body.comptes) ? req.body.comptes : [];
        if (!comptes.length) return res.status(400).json({ message: 'Aucun compte à imprimer.' });
        pdfService.streamFichesIdentifiants(res, {
            comptes,
            ecole: req.body.ecole,
            siteUrl: req.body.siteUrl
        });
    } catch (err) {
        console.error('Erreur getFichesIdentifiantsPdf:', err.message);
        res.status(500).json({ message: 'Erreur lors de la génération du PDF.' });
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
                   p.date_arrivee, p.classes, p.matieres,
                   COUNT(DISTINCT ct.classe) AS nb_classes,
                   COUNT(DISTINCT ct.id)     AS nb_seances
            FROM authentification.comptes c
            LEFT JOIN pedagogie.profils_profs p ON p.id_user = c.id_user
            LEFT JOIN pedagogie.cahiers_texte ct ON ct.id_prof = c.id_user
            WHERE c.role_actuel = 'PROFESSEUR' AND c.est_actif = true
            GROUP BY c.id_user, c.code_unique, c.nom, c.prenom,
                     c.email, c.telephone, c.est_actif,
                     p.specialite, p.biographie, p.photo_url, p.date_arrivee,
                     p.classes, p.matieres
            ORDER BY c.nom, c.prenom
        `);
        // ✅ Les surveillants importés/créés n'apparaissaient NULLE PART dans
        // l'interface — aucune liste dédiée n'a jamais existé pour eux
        // (découvert en vérifiant pourquoi un import "réussi" restait
        // invisible). Ajoutés ici, dans le même panneau "Corps Enseignant"
        // où se trouvent déjà leurs boutons "Ajouter"/"Importer".
        const rs = await db.query(`
            SELECT c.id_user, c.code_unique, c.nom, c.prenom,
                   c.email, c.telephone, c.est_actif, pa.poste_occupe
            FROM authentification.comptes c
            LEFT JOIN authentification.profils_administratifs pa ON pa.id_user = c.id_user
            WHERE c.role_actuel = 'SURVEILLANT' AND c.est_actif = true
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
                classes: p.classes || [],
                matieres: p.matieres || [],
                nb_classes: parseInt(p.nb_classes) || 0,
                nb_seances: parseInt(p.nb_seances) || 0,
                est_actif: p.est_actif,
                role: 'PROFESSEUR'
            })),
            surveillants: rs.rows.map(s => ({
                id: s.id_user,
                id_user: s.id_user,
                code: s.code_unique,
                code_unique: s.code_unique,
                nom: s.nom,
                prenom: s.prenom,
                email: s.email,
                telephone: s.telephone,
                poste: s.poste_occupe || 'Surveillant',
                est_actif: s.est_actif,
                role: 'SURVEILLANT'
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
// Emploi du temps d'une classe donnée (Direction/Surveillant) — lit la même
// table réelle pedagogie.emploi_du_temps que l'espace Élève (getHoraire),
// contrairement à l'ancienne grille EDTS codée en dur côté direction.html.
exports.getEmploiDuTemps = async (req, res) => {
    try {
        const classe = (req.query.classe || '').trim();
        if (!classe) return res.status(400).json({ success: false, message: 'Classe requise' });

        const joursOrdre = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

        const r = await db.query(`
            SELECT et.id, et.jour_semaine, et.heure_debut, et.heure_fin, et.matiere, et.salle, et.id_prof,
                   c.nom AS prof_nom, c.prenom AS prof_prenom
            FROM pedagogie.emploi_du_temps et
            LEFT JOIN authentification.comptes c ON c.id_user = et.id_prof
            WHERE et.classe = $1
            ORDER BY et.jour_semaine, et.heure_debut
        `, [classe]);

        const parJour = {};
        for (const row of r.rows) {
            const jour = row.jour_semaine;
            if (!parJour[jour]) parJour[jour] = [];
            const fmt = (t) => String(t).slice(0, 5);
            parJour[jour].push({
                id: row.id,
                heure: `${fmt(row.heure_debut)}-${fmt(row.heure_fin)}`,
                heure_debut: fmt(row.heure_debut),
                heure_fin: fmt(row.heure_fin),
                matiere: row.matiere,
                salle: row.salle || '',
                id_prof: row.id_prof,
                prof: row.prof_nom ? `${row.prof_prenom || ''} ${row.prof_nom}`.trim() : ''
            });
        }

        const semaine = joursOrdre
            .filter(j => parJour[j])
            .map(j => ({ jour: j, cours: parJour[j] }));

        res.json({ success: true, horaire: { classe, semaine } });
    } catch (e) {
        console.error('getEmploiDuTemps:', e.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + e.message });
    }
};

const JOURS_VALIDES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Créer une séance dans l'emploi du temps d'une classe (Direction seule —
// l'emploi du temps est une responsabilité de direction, pas de surveillance).
exports.createSeanceEdt = async (req, res) => {
    try {
        const { classe, jour_semaine, heure_debut, heure_fin, matiere, id_prof, salle } = req.body;
        if (!classe || !jour_semaine || !heure_debut || !heure_fin || !matiere) {
            return res.status(400).json({ success: false, message: 'Classe, jour, horaires et matière requis' });
        }
        if (!JOURS_VALIDES.includes(jour_semaine)) {
            return res.status(400).json({ success: false, message: 'Jour invalide' });
        }
        if (heure_debut >= heure_fin) {
            return res.status(400).json({ success: false, message: 'L\'heure de fin doit être après l\'heure de début' });
        }
        const r = await db.query(
            `INSERT INTO pedagogie.emploi_du_temps (classe, jour_semaine, heure_debut, heure_fin, matiere, id_prof, salle)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [classe, jour_semaine, heure_debut, heure_fin, matiere, id_prof || null, salle || null]
        );
        res.json({ success: true, message: 'Séance ajoutée', seance: r.rows[0] });
    } catch (e) {
        console.error('createSeanceEdt:', e.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + e.message });
    }
};

// Modifier une séance existante — utilisé quand l'emploi du temps change en
// cours d'année (changement de prof, de salle, d'horaire...).
exports.updateSeanceEdt = async (req, res) => {
    try {
        const { id } = req.params;
        const { jour_semaine, heure_debut, heure_fin, matiere, id_prof, salle } = req.body;
        if (jour_semaine && !JOURS_VALIDES.includes(jour_semaine)) {
            return res.status(400).json({ success: false, message: 'Jour invalide' });
        }
        if (heure_debut && heure_fin && heure_debut >= heure_fin) {
            return res.status(400).json({ success: false, message: 'L\'heure de fin doit être après l\'heure de début' });
        }
        const r = await db.query(
            `UPDATE pedagogie.emploi_du_temps SET
                jour_semaine = COALESCE($1, jour_semaine),
                heure_debut = COALESCE($2, heure_debut),
                heure_fin = COALESCE($3, heure_fin),
                matiere = COALESCE($4, matiere),
                id_prof = COALESCE($5, id_prof),
                salle = COALESCE($6, salle)
             WHERE id = $7 RETURNING *`,
            [jour_semaine || null, heure_debut || null, heure_fin || null, matiere || null, id_prof || null, salle || null, id]
        );
        if (!r.rows.length) return res.status(404).json({ success: false, message: 'Séance introuvable' });
        res.json({ success: true, message: 'Séance modifiée', seance: r.rows[0] });
    } catch (e) {
        console.error('updateSeanceEdt:', e.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + e.message });
    }
};

exports.deleteSeanceEdt = async (req, res) => {
    try {
        const { id } = req.params;
        const r = await db.query('DELETE FROM pedagogie.emploi_du_temps WHERE id = $1 RETURNING id', [id]);
        if (!r.rows.length) return res.status(404).json({ success: false, message: 'Séance introuvable' });
        res.json({ success: true, message: 'Séance supprimée' });
    } catch (e) {
        console.error('deleteSeanceEdt:', e.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + e.message });
    }
};

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
        // ⚠️ La photo d'un élève vit dans vie_scolaire.profils_eleves —
        // ceci joignait par erreur pedagogie.profils_profs (table des
        // PROFS), donc photo_url restait toujours vide pour un élève
        // même après upload, puisqu'il n'y a jamais de ligne prof pour lui.
        const eleve = await db.query(`
            SELECT c.id_user, c.code_unique, c.nom, c.prenom,
                   c.email, c.telephone,
                   pe.classe_actuelle, pe.date_naissance, pe.sexe, pe.lieu_naissance,
                   COALESCE(pe.photo_url,'') AS photo_url
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
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
            WHERE c.role_actuel = 'ELEVE'
        `;
        // ⚠️ Pas de filtre sur est_actif ici : un élève sans parent lié est
        // inactif (trg_prevent_eleve_activation) mais doit quand même être
        // VISIBLE dans cette liste — sinon la Direction croit que l'import a
        // échoué alors que les comptes existent bien, juste en attente d'un
        // parent. Le frontend affiche un badge "en attente de parent" grâce
        // au champ est_actif renvoyé ci-dessous.
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
                nb_absences: parseInt(e.nb_absences) || 0,
                est_actif: e.est_actif
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
        await db.query(`
            CREATE TABLE IF NOT EXISTS pedagogie.bulletins_signes (
                id_signature    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                id_eleve        UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
                trimestre       SMALLINT    NOT NULL CHECK (trimestre IN (1,2,3)),
                annee_scolaire  VARCHAR(9)  NOT NULL DEFAULT '2025-2026',
                id_signataire   UUID        NOT NULL REFERENCES authentification.comptes(id_user),
                date_signature  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (id_eleve, trimestre, annee_scolaire)
            )
        `).catch(() => {});

        // ✅ Statut de signature réel (avant : toujours "false" en dur, jamais persisté)
        const r = await db.query(`
            SELECT c.id_user, c.code_unique, c.nom, c.prenom,
                   pe.classe_actuelle AS classe,
                   ROUND(AVG(n.note)::numeric, 2) AS moyenne,
                   COUNT(n.id_evaluation) AS nb_notes,
                   (bs.id_signature IS NOT NULL) AS signe
            FROM authentification.comptes c
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
            LEFT JOIN pedagogie.notes_evaluations n
                ON n.id_eleve = c.id_user AND n.trimestre = $1
            LEFT JOIN pedagogie.bulletins_signes bs
                ON bs.id_eleve = c.id_user AND bs.trimestre = $1
            WHERE c.role_actuel = 'ELEVE' AND c.est_actif = true
            GROUP BY c.id_user, c.code_unique, c.nom, c.prenom, pe.classe_actuelle, bs.id_signature
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
// SIGNATURE ÉLECTRONIQUE DES BULLETINS (réelle)
// Vérifie le mot de passe du signataire, puis persiste en base.
// ═══════════════════════════════════════════
// Génère un code de vérification aléatoire (12 caractères hexa, 48 bits
// d'entropie — impossible à deviner par force brute) pour le QR code du
// bulletin, et capture un instantané (moyenne + décision) au moment de
// la signature, pour pouvoir détecter plus tard une modification.
async function _signerUnBulletin(idEleve, trimestre, anneeScolaire, signataireId) {
    const crypto = require('crypto');
    const bulletinService = require('../services/bulletinService');
    const data = await bulletinService.calculerBulletinComplet(idEleve, trimestre, anneeScolaire);
    if (!data) return null;
    const codeVerification = crypto.randomBytes(6).toString('hex');
    const r = await db.query(`
        INSERT INTO pedagogie.bulletins_signes
            (id_eleve, trimestre, annee_scolaire, id_signataire, code_verification, moyenne_signee, decision_signee)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id_eleve, trimestre, annee_scolaire) DO NOTHING
        RETURNING code_verification
    `, [idEleve, trimestre, anneeScolaire, signataireId, codeVerification, data.moyenne_generale, data.decision]);
    return r.rows[0]?.code_verification || null;
}

exports.signerBulletin = async (req, res) => {
    try {
        const signataireId = req.user?.id;
        const { id_eleve, trimestre, mot_de_passe } = req.body;
        if (!signataireId) return res.status(401).json({ message: 'Non authentifié' });
        if (!id_eleve || !trimestre || !mot_de_passe) {
            return res.status(400).json({ message: 'Élève, trimestre et mot de passe requis' });
        }

        const bcrypt = require('bcryptjs');
        const compte = await db.query(
            `SELECT mot_de_passe FROM authentification.comptes WHERE id_user = $1`,
            [signataireId]
        );
        if (!compte.rows.length) return res.status(404).json({ message: 'Compte introuvable' });

        const ok = await bcrypt.compare(mot_de_passe, compte.rows[0].mot_de_passe);
        if (!ok) return res.status(403).json({ message: 'Mot de passe incorrect' });

        const anneeScolaire = require('../services/moyennesEngine').getAnneeScolaireActive();
        await _signerUnBulletin(id_eleve, parseInt(trimestre), anneeScolaire, signataireId);

        res.json({ success: true, message: 'Bulletin signé électroniquement' });
    } catch (e) {
        console.error('signerBulletin:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

exports.signerBulletinsLot = async (req, res) => {
    try {
        const signataireId = req.user?.id;
        const { ids_eleves, trimestre, mot_de_passe } = req.body;
        if (!signataireId) return res.status(401).json({ message: 'Non authentifié' });
        if (!Array.isArray(ids_eleves) || !ids_eleves.length || !trimestre || !mot_de_passe) {
            return res.status(400).json({ message: 'Liste d\'élèves, trimestre et mot de passe requis' });
        }

        const bcrypt = require('bcryptjs');
        const compte = await db.query(
            `SELECT mot_de_passe FROM authentification.comptes WHERE id_user = $1`,
            [signataireId]
        );
        if (!compte.rows.length) return res.status(404).json({ message: 'Compte introuvable' });

        const ok = await bcrypt.compare(mot_de_passe, compte.rows[0].mot_de_passe);
        if (!ok) return res.status(403).json({ message: 'Mot de passe incorrect' });

        const anneeScolaire = require('../services/moyennesEngine').getAnneeScolaireActive();
        for (const idEleve of ids_eleves) {
            await _signerUnBulletin(idEleve, parseInt(trimestre), anneeScolaire, signataireId);
        }

        res.json({ success: true, message: `${ids_eleves.length} bulletin(s) signé(s)` });
    } catch (e) {
        console.error('signerBulletinsLot:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ✅ Vérification publique d'un bulletin via son code QR — accessible sans
// authentification (un employeur, une autre école... n'a pas de compte
// sur la plateforme) mais uniquement par le code exact (48 bits, pas
// énumérable), affichée sur frontend/verifier-bulletin.html.
exports.verifierBulletin = async (req, res) => {
    try {
        const { code } = req.params;
        if (!code || !/^[a-f0-9]{12}$/i.test(code)) {
            return res.status(400).json({ success: false, message: 'Code invalide' });
        }
        const r = await db.query(`
            SELECT bs.id_eleve, bs.trimestre, bs.annee_scolaire, bs.date_signature,
                   bs.moyenne_signee, bs.decision_signee,
                   e.nom AS eleve_nom, e.prenom AS eleve_prenom, e.code_unique,
                   pe.classe_actuelle,
                   s.nom AS signataire_nom, s.prenom AS signataire_prenom
            FROM pedagogie.bulletins_signes bs
            JOIN authentification.comptes e ON e.id_user = bs.id_eleve
            JOIN vie_scolaire.profils_eleves pe ON pe.id_user = bs.id_eleve
            JOIN authentification.comptes s ON s.id_user = bs.id_signataire
            WHERE bs.code_verification = $1
        `, [code]);

        if (!r.rows.length) return res.json({ success: true, trouve: false });
        const b = r.rows[0];

        const configRes = await db.query(`SELECT nom_etablissement FROM gestion.configuration LIMIT 1`);
        const etablissement = configRes.rows[0]?.nom_etablissement || 'Établissement';

        // Recalcul en direct pour détecter une modification des notes
        // après la signature (correction, ressaisie...).
        const bulletinService = require('../services/bulletinService');
        const actuel = await bulletinService.calculerBulletinComplet(b.id_eleve, b.trimestre, b.annee_scolaire);
        const modifie = !!(actuel && actuel.signature && actuel.signature.modifie);

        res.json({
            success: true,
            trouve: true,
            etablissement,
            eleve: `${b.eleve_prenom} ${b.eleve_nom}`,
            code_unique: b.code_unique,
            classe: b.classe_actuelle,
            trimestre: b.trimestre,
            annee_scolaire: b.annee_scolaire,
            moyenne: b.moyenne_signee !== null ? parseFloat(b.moyenne_signee) : null,
            decision: b.decision_signee,
            signataire: `${b.signataire_prenom} ${b.signataire_nom}`,
            date_signature: b.date_signature,
            modifie,
        });
    } catch (e) {
        console.error('verifierBulletin:', e.message);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
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

// ✅ Préfixes/année de matricule configurables par école depuis Direction
// → Paramètres (gestion.configuration), au lieu d'être codés en dur —
// avant : "CN-2026-XXXX" etc. répétés 14 fois dans ce fichier, aucun
// moyen de personnaliser par école ni de changer l'année sans éditer le
// code. Valeurs par défaut = exactement ce qui était codé en dur avant,
// donc rien ne change tant que la Direction ne modifie rien.
async function _getPrefixesMatricule() {
    const r = await db.query(`
        SELECT matricule_prefixe_eleve, matricule_prefixe_prof, matricule_prefixe_parent,
               matricule_prefixe_alumni, matricule_prefixe_surveillant, matricule_prefixe_direction,
               matricule_annee
        FROM gestion.configuration LIMIT 1
    `);
    const c = r.rows[0] || {};
    return {
        eleve: c.matricule_prefixe_eleve || 'CN',
        prof: c.matricule_prefixe_prof || 'PROF',
        parent: c.matricule_prefixe_parent || 'PAR',
        alumni: c.matricule_prefixe_alumni || 'ALUM',
        surveillant: c.matricule_prefixe_surveillant || 'SURV',
        direction: c.matricule_prefixe_direction || 'DIR',
        annee: c.matricule_annee || '2026',
    };
}

// ═══════════════════════════════════════════
// CRÉER UN ÉLÈVE
// ═══════════════════════════════════════════
exports.createEleve = async (req, res) => {
    try {
        const { prenom, nom, classe, email, telephone, sexe, date_naissance, lieu_naissance } = req.body;
        if (!prenom || !nom || !classe) {
            return res.status(400).json({ message: 'Prénom, nom et classe requis' });
        }
        if (sexe && !['M', 'F'].includes(sexe)) {
            return res.status(400).json({ message: 'Sexe invalide (M ou F)' });
        }

        const bcrypt = require('bcryptjs');
        const prefixes = await _getPrefixesMatricule();

        const countR = await db.query(
            "SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='ELEVE'"
        );
        let nb = parseInt(countR.rows[0].count) || 0;

        // Mot de passe temporaire aléatoire (jamais égal à l'identifiant)
        const motDePasseTemp = genTempPassword();
        const hash = await bcrypt.hash(motDePasseTemp, 10);

        // ⚠️ Un déclencheur BD (trg_prevent_eleve_activation) refuse tout
        // élève est_actif=true sans parent lié — symétrique à la règle déjà
        // en place côté parent (trg_prevent_parent_activation). Le compte
        // est donc créé inactif ; il s'active automatiquement dès qu'un
        // parent lui est lié (voir createParent / importParentsExcel).
        const { code, resultat: r } = await insererAvecCodeUnique(
            () => `${prefixes.eleve}-${prefixes.annee}-` + String(2000 + (++nb)).padStart(4, '0'),
            (code) => db.query(`
                INSERT INTO authentification.comptes
                (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
                VALUES ($1,$2,$3,$4,$5,$6,'ELEVE',false)
                RETURNING id_user, code_unique
            `, [code, nom.toUpperCase(), prenom, email || null, telephone || null, hash])
        );

        const eleveId = r.rows[0].id_user;

        // Créer le profil élève
        await db.query(`
            INSERT INTO vie_scolaire.profils_eleves (id_user, classe_actuelle, sexe, date_naissance, lieu_naissance)
            VALUES ($1, $2, $3, $4, $5)
        `, [eleveId, classe, sexe || null, date_naissance || null, lieu_naissance || null]);

        res.json({
            success: true,
            message: 'Élève créé — en attente d\'un parent à lier pour être activé',
            code_unique: code,
            mot_de_passe_temporaire: motDePasseTemp,
            id_user: eleveId
        });
    } catch (e) {
        console.error('createEleve:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ✅ Modifier un élève — n'existait nulle part avant (aucune faute de
// frappe corrigible, aucune classe ajustable après création). Sert
// aussi de brique de base au passage de classe (changement en masse
// de classe_actuelle/statut_scolaire en fin d'année).
exports.updateEleve = async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, prenom, email, telephone, classe, sexe, date_naissance, lieu_naissance, statut_scolaire } = req.body;

        if (sexe && !['M', 'F'].includes(sexe)) {
            return res.status(400).json({ message: 'Sexe invalide (M ou F)' });
        }
        const statutsValides = ['INSCRIT', 'REDOUBLANT', 'DIPLOME', 'PARTI'];
        if (statut_scolaire && !statutsValides.includes(statut_scolaire)) {
            return res.status(400).json({ message: 'Statut scolaire invalide' });
        }

        if (nom !== undefined || prenom !== undefined || email !== undefined || telephone !== undefined) {
            await db.query(
                `UPDATE authentification.comptes SET
                   nom = COALESCE($1, nom), prenom = COALESCE($2, prenom),
                   email = COALESCE($3, email), telephone = COALESCE($4, telephone)
                 WHERE id_user = $5 AND role_actuel = 'ELEVE'`,
                [nom ? nom.toUpperCase() : null, prenom, email, telephone, id]
            );
        }
        const upd = await db.query(
            `UPDATE vie_scolaire.profils_eleves SET
               classe_actuelle = COALESCE($1, classe_actuelle),
               sexe = COALESCE($2, sexe),
               date_naissance = COALESCE($3, date_naissance),
               lieu_naissance = COALESCE($4, lieu_naissance),
               statut_scolaire = COALESCE($5, statut_scolaire)
             WHERE id_user = $6`,
            [classe, sexe, date_naissance, lieu_naissance, statut_scolaire, id]
        );
        if (upd.rowCount === 0) return res.status(404).json({ message: 'Élève introuvable' });
        res.json({ success: true });
    } catch (e) {
        console.error('updateEleve:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// CRÉER UN PROFESSEUR
// ═══════════════════════════════════════════
// ✅ Les classes/matières d'un prof sont une donnée administrative
// (qui enseigne quoi), pas une préférence personnelle — c'est la
// Direction qui les fixe ici, le prof ne peut plus se les
// auto-attribuer depuis son propre profil (voir professeurController.js).
function _parseListeAdmin(valeur) {
    if (!valeur) return null;
    if (Array.isArray(valeur)) return valeur.map(v => String(v).trim()).filter(Boolean);
    const arr = String(valeur).split(',').map(v => v.trim()).filter(Boolean);
    return arr.length ? arr : null;
}

// ✅ Convertit une date de naissance saisie en Excel (format JJ/MM/AAAA
// attendu) vers le format ISO (AAAA-MM-JJ) que Postgres exige — voir
// l'avertissement dans importElevesExcel pour le bug que ça corrige.
// Accepte aussi un objet Date JS (cellule Excel mise en forme "Date") et
// une valeur déjà en ISO. Retourne null si vide ou illisible plutôt que
// de planter l'insertion.
function _parseDateFrAdmin(valeur) {
    if (!valeur && valeur !== 0) return null;
    if (valeur instanceof Date && !isNaN(valeur)) {
        return valeur.toISOString().slice(0, 10);
    }
    const str = String(valeur).trim();
    if (!str) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (!m) return null;
    const jour = parseInt(m[1], 10);
    const mois = parseInt(m[2], 10);
    const annee = m[3];
    if (jour < 1 || jour > 31 || mois < 1 || mois > 12) return null;
    return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}

exports.createProfesseur = async (req, res) => {
    try {
        const { prenom, nom, specialite, email, telephone, classes, matieres } = req.body;
        if (!prenom || !nom || !specialite) {
            return res.status(400).json({ message: 'Prenom, nom et specialite requis' });
        }
        const bcrypt = require('bcryptjs');
        const prefixes = await _getPrefixesMatricule();
        const countR = await db.query(
            "SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='PROFESSEUR'"
        );
        let nb = parseInt(countR.rows[0].count) || 0;
        const motDePasseTemp = genTempPassword();
        const hash = await bcrypt.hash(motDePasseTemp, 10);

        const { code, resultat: r } = await insererAvecCodeUnique(
            () => `${prefixes.prof}-${prefixes.annee}-` + String((++nb) + 10).padStart(3, '0'),
            (code) => db.query(`
                INSERT INTO authentification.comptes
                (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
                VALUES ($1,$2,$3,$4,$5,$6,'PROFESSEUR',true)
                RETURNING id_user, code_unique
            `, [code, nom.toUpperCase(), prenom, email || null, telephone || null, hash])
        );

        const profId = r.rows[0].id_user;
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS classes TEXT[]`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS matieres TEXT[]`);
        await db.query(
            `INSERT INTO pedagogie.profils_profs (id_user, specialite, classes, matieres) VALUES ($1,$2,$3,$4)
             ON CONFLICT (id_user) DO UPDATE SET specialite=$2, classes=$3, matieres=$4`,
            [profId, specialite, _parseListeAdmin(classes), _parseListeAdmin(matieres)]
        );

        res.json({ success: true, message: 'Professeur cree', code_unique: code, mot_de_passe_temporaire: motDePasseTemp });
    } catch (e) {
        console.error('createProfesseur:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// ASSIGNER/MODIFIER LES CLASSES ET MATIÈRES D'UN PROF EXISTANT
// (fait à part de createProfesseur pour pouvoir corriger une
// affectation après coup, sans repasser par un ré-import Excel)
// ═══════════════════════════════════════════
exports.updateClassesMatieresProf = async (req, res) => {
    try {
        const { id } = req.params;
        const { classes, matieres } = req.body;

        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS classes TEXT[]`);
        await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS matieres TEXT[]`);
        const r = await db.query(
            `INSERT INTO pedagogie.profils_profs (id_user, classes, matieres) VALUES ($1,$2,$3)
             ON CONFLICT (id_user) DO UPDATE SET classes=$2, matieres=$3
             RETURNING classes, matieres`,
            [id, _parseListeAdmin(classes), _parseListeAdmin(matieres)]
        );
        res.json({ success: true, classes: r.rows[0].classes || [], matieres: r.rows[0].matieres || [] });
    } catch (e) {
        console.error('updateClassesMatieresProf:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// CRÉER UN SURVEILLANT
// ═══════════════════════════════════════════
exports.createSurveillant = async (req, res) => {
    try {
        const { prenom, nom, email, telephone, poste_occupe } = req.body;
        if (!prenom || !nom) {
            return res.status(400).json({ message: 'Prénom et nom requis' });
        }
        const bcrypt = require('bcryptjs');
        const prefixes = await _getPrefixesMatricule();
        const countR = await db.query(
            "SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='SURVEILLANT'"
        );
        let nb = parseInt(countR.rows[0].count) || 0;
        const motDePasseTemp = genTempPassword();
        const hash = await bcrypt.hash(motDePasseTemp, 10);

        const { code, resultat: r } = await insererAvecCodeUnique(
            () => `${prefixes.surveillant}-${prefixes.annee}-` + String(++nb).padStart(3, '0'),
            (code) => db.query(`
                INSERT INTO authentification.comptes
                (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
                VALUES ($1,$2,$3,$4,$5,$6,'SURVEILLANT',true)
                RETURNING id_user, code_unique
            `, [code, nom.toUpperCase(), prenom, email || null, telephone || null, hash])
        );

        const survId = r.rows[0].id_user;
        // ⚠️ Pas de ON CONFLICT ici : authentification.profils_administratifs
        // n'a pas de contrainte UNIQUE sur id_user (seulement sa PK id_admin) —
        // sans risque puisque survId vient d'être généré juste au-dessus.
        await db.query(
            `INSERT INTO authentification.profils_administratifs (id_user, poste_occupe) VALUES ($1,$2)`,
            [survId, poste_occupe || 'Surveillant']
        );

        res.json({ success: true, message: 'Surveillant créé', code_unique: code, mot_de_passe_temporaire: motDePasseTemp });
    } catch (e) {
        console.error('createSurveillant:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// IMPORT EXCEL — SURVEILLANTS
// Colonnes attendues : Nom, Prenom (obligatoires), Email, Telephone,
// Poste (optionnelles).
// ═══════════════════════════════════════════
exports.importSurveillantsExcel = async (req, res) => {
    let XLSX;
    try { XLSX = require('xlsx'); } catch (e) {
        return res.status(500).json({ message: "La librairie 'xlsx' n'est pas installée." });
    }
    try {
        if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });
        const dryRun = req.body.dryRun !== 'false';

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!rows.length) return res.status(400).json({ message: 'Le fichier est vide ou illisible.' });

        const bcrypt = require('bcryptjs');
        const prefixes = await _getPrefixesMatricule();
        const countR = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='SURVEILLANT'");
        let compteur = parseInt(countR.rows[0].count) || 0;

        const resultats = [];
        for (let i = 0; i < rows.length; i++) {
            const ligne = rows[i];
            const nom = getColExcel(ligne, ['nom']);
            const prenom = getColExcel(ligne, ['prenom', 'prénom']);
            const email = getColExcel(ligne, ['email', 'e-mail']) || null;
            const telephone = getColExcel(ligne, ['telephone', 'téléphone', 'tel']) || null;
            const poste = getColExcel(ligne, ['poste', 'poste_occupe', 'poste occupé']) || 'Surveillant';

            if (!nom || !prenom) {
                resultats.push({ ligne: i + 2, nom, prenom, statut: 'ERREUR', message: 'Nom et prénom sont obligatoires' });
                continue;
            }

            if (dryRun) {
                compteur++;
                const codePrevisionnel = `${prefixes.surveillant}-${prefixes.annee}-` + String(compteur).padStart(3, '0');
                resultats.push({ ligne: i + 2, nom: nom.toUpperCase(), prenom, email, telephone, poste, code_previsionnel: codePrevisionnel, statut: 'OK' });
                continue;
            }

            try {
                const motDePasseTemp = genTempPassword();
                const hash = await bcrypt.hash(motDePasseTemp, 10);
                const { code, resultat: r } = await insererAvecCodeUnique(
                    () => { compteur++; return `${prefixes.surveillant}-${prefixes.annee}-` + String(compteur).padStart(3, '0'); },
                    (code) => db.query(`
                        INSERT INTO authentification.comptes
                        (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
                        VALUES ($1,$2,$3,$4,$5,$6,'SURVEILLANT',true)
                        RETURNING id_user, code_unique
                    `, [code, nom.toUpperCase(), prenom, email, telephone, hash])
                );
                await db.query(
                    `INSERT INTO authentification.profils_administratifs (id_user, poste_occupe) VALUES ($1,$2)`,
                    [r.rows[0].id_user, poste]
                );
                resultats.push({ ligne: i + 2, nom: nom.toUpperCase(), prenom, code_unique: code, mot_de_passe_temporaire: motDePasseTemp, statut: 'CREE' });
            } catch (err) {
                resultats.push({ ligne: i + 2, nom, prenom, statut: 'ERREUR', message: err.message });
            }
        }

        res.json({
            success: true, dryRun, total: rows.length,
            nb_ok: resultats.filter(r => r.statut === 'OK' || r.statut === 'CREE').length,
            nb_erreurs: resultats.filter(r => r.statut === 'ERREUR').length,
            resultats
        });
    } catch (error) {
        console.error('importSurveillantsExcel:', error.message);
        res.status(500).json({ message: 'Erreur import: ' + error.message });
    }
};

// ═══════════════════════════════════════════
// CRÉER UN ALUMNI
// ═══════════════════════════════════════════
exports.createAlumni = async (req, res) => {
    try {
        const { prenom, nom, email, telephone, derniere_classe, annee_diplome } = req.body;
        if (!prenom || !nom) {
            return res.status(400).json({ message: 'Prénom et nom requis' });
        }
        const bcrypt = require('bcryptjs');
        const prefixes = await _getPrefixesMatricule();
        const countR = await db.query(
            "SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='ALUMNI'"
        );
        let nb = parseInt(countR.rows[0].count) || 0;
        const motDePasseTemp = genTempPassword();
        const hash = await bcrypt.hash(motDePasseTemp, 10);

        const { code, resultat: r } = await insererAvecCodeUnique(
            () => `${prefixes.alumni}-${prefixes.annee}-` + String(++nb).padStart(3, '0'),
            (code) => db.query(`
                INSERT INTO authentification.comptes
                (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
                VALUES ($1,$2,$3,$4,$5,$6,'ALUMNI',true)
                RETURNING id_user, code_unique
            `, [code, nom.toUpperCase(), prenom, email || null, telephone || null, hash])
        );

        const alumniId = r.rows[0].id_user;
        await db.query(
            `INSERT INTO gestion_ape.profils_alumni (id_user, derniere_classe, annee_diplome) VALUES ($1,$2,$3)
             ON CONFLICT (id_user) DO UPDATE SET derniere_classe=$2, annee_diplome=$3`,
            [alumniId, derniere_classe || null, annee_diplome || null]
        );

        res.json({ success: true, message: 'Alumni créé', code_unique: code, mot_de_passe_temporaire: motDePasseTemp });
    } catch (e) {
        console.error('createAlumni:', e.message);
        res.status(500).json({ message: 'Erreur: ' + e.message });
    }
};

// ═══════════════════════════════════════════
// CRÉER UN PARENT (avec liaison optionnelle à un élève par matricule —
// c'est ce compte qui alimente aussi l'espace APE, d'où la création du
// profil gestion_ape.profils_parents en même temps)
// ═══════════════════════════════════════════
exports.createParent = async (req, res) => {
    try {
        const { prenom, nom, email, telephone, profession, matricule_enfant, lien_parente } = req.body;
        if (!prenom || !nom) {
            return res.status(400).json({ message: 'Prénom et nom requis' });
        }
        // ✅ Requis : un déclencheur BD ("Activation refusée : un parent doit
        // avoir au moins un enfant lié ou être membre du bureau APE") rejette
        // déjà toute création de parent actif sans enfant lié — autant le
        // vérifier ici avec un message clair plutôt que de laisser échouer
        // l'INSERT plus bas avec une erreur SQL brute.
        if (!matricule_enfant) {
            return res.status(400).json({ message: 'Le matricule de l\'enfant (élève) est requis pour créer un compte parent' });
        }

        const eleve = await db.query(
            `SELECT id_user FROM authentification.comptes WHERE code_unique = $1 AND role_actuel = 'ELEVE'`,
            [String(matricule_enfant).trim()]
        );
        if (!eleve.rows.length) {
            return res.status(404).json({ message: `Aucun élève trouvé avec le matricule ${matricule_enfant}` });
        }
        const idEleve = eleve.rows[0].id_user;

        const bcrypt = require('bcryptjs');
        const prefixes = await _getPrefixesMatricule();
        const countR = await db.query(
            "SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='PARENT'"
        );
        let nb = parseInt(countR.rows[0].count) || 0;
        const motDePasseTemp = genTempPassword();
        const hash = await bcrypt.hash(motDePasseTemp, 10);

        // ⚠️ Un déclencheur BD (trg_prevent_parent_activation) refuse tout
        // parent est_actif=true sans relation vers un élève — mais cette
        // relation ne peut être créée qu'une fois le compte parent existant
        // (contrainte de clé étrangère). On crée donc le compte inactif
        // d'abord, on lie l'enfant, puis on active — le déclencheur retrouve
        // alors bien la relation et laisse passer l'activation.
        const { code, resultat: r } = await insererAvecCodeUnique(
            () => `${prefixes.parent}-${prefixes.annee}-` + String(++nb).padStart(4, '0'),
            (code) => db.query(`
                INSERT INTO authentification.comptes
                (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
                VALUES ($1,$2,$3,$4,$5,$6,'PARENT',false)
                RETURNING id_user, code_unique
            `, [code, nom.toUpperCase(), prenom, email || null, telephone || null, hash])
        );

        const parentId = r.rows[0].id_user;
        // ⚠️ Pas de ON CONFLICT ici : gestion_ape.profils_parents n'a pas de
        // contrainte UNIQUE sur id_user (seulement sa PK id_parent) — sans
        // risque puisque parentId vient d'être généré juste au-dessus.
        await db.query(
            `INSERT INTO gestion_ape.profils_parents (id_user, profession, telephone) VALUES ($1,$2,$3)`,
            [parentId, profession || null, telephone || null]
        );

        await db.query(
            `INSERT INTO vie_scolaire.relations_parents_eleves (id_parent, id_eleve, lien_parente) VALUES ($1,$2,$3)`,
            [parentId, idEleve, lien_parente || 'Parent']
        );

        await db.query(`UPDATE authentification.comptes SET est_actif = true WHERE id_user = $1`, [parentId]);
        // ⚠️ Symétrique : un élève créé sans parent était resté inactif
        // (trg_prevent_eleve_activation) — maintenant qu'un parent est lié,
        // on l'active. Sans effet si l'élève était déjà actif (autre parent).
        await db.query(`UPDATE authentification.comptes SET est_actif = true WHERE id_user = $1`, [idEleve]);

        res.json({ success: true, message: 'Parent créé', code_unique: code, mot_de_passe_temporaire: motDePasseTemp, lie_a_eleve: true });
    } catch (e) {
        console.error('createParent:', e.message);
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

        // ✅ Écrit dans la vraie table gestion_ape.cotisations_parents (gestion.cotisations_ape n'existe pas)
        // id_parent est trouvé via la relation parent-élève ; à défaut on garde une trace quand même
        let id_parent = null;
        if (eleveId) {
            const rp = await db.query(
                `SELECT id_parent FROM vie_scolaire.relations_parents_eleves WHERE id_eleve = $1 LIMIT 1`,
                [eleveId]
            );
            if (rp.rows.length) id_parent = rp.rows[0].id_parent;
        }

        const result = await db.query(`
            INSERT INTO gestion_ape.cotisations_parents
                (id_parent, id_eleve, montant, date_cotisation, statut_paiement, motif_cotisation)
            VALUES ($1, $2, $3, $4, 'PAYE', $5)
            RETURNING *
        `, [id_parent, eleveId, parseFloat(montant), date_paiement || new Date().toISOString(), famille]);

        res.json({ success: true, message: 'Paiement enregistré', cotisation: result.rows[0] });
    } catch (e) {
        console.error('savePaiement:', e.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + e.message });
    }
};

// ✅ Met réellement à jour le statut d'une cotisation existante — avant,
// le bouton "Marquer payé" de direction.html appelait savePaiement() qui
// INSÉRAIT une nouvelle ligne au lieu de mettre à jour l'originale,
// laissant la cotisation d'origine "en attente" en base.
exports.updateStatutCotisation = async (req, res) => {
    try {
        const { id_cotisation } = req.params;
        const { statut_paiement } = req.body;
        const statutsValides = ['PAYE', 'EN_ATTENTE', 'ANNULE'];
        if (!statutsValides.includes(statut_paiement)) {
            return res.status(400).json({ success: false, message: 'Statut invalide' });
        }
        const result = await db.query(
            `UPDATE gestion_ape.cotisations_parents SET statut_paiement = $1, updated_at = NOW()
             WHERE id_cotisation = $2 RETURNING *`,
            [statut_paiement, id_cotisation]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Cotisation introuvable' });
        res.json({ success: true, message: 'Statut mis à jour', cotisation: result.rows[0] });
    } catch (e) {
        console.error('updateStatutCotisation:', e.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + e.message });
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
                // Notification temps réel via Socket.IO
                const io = req.app?.locals?.io;
                if (io) {
                    io.emit('nouvelle-composition', {
                        titre,
                        type: type_composition,
                        date: date_debut,
                        message: description || 'Une nouvelle épreuve a été programmée'
                    });
                }
                console.log(`🔔 Notification composition envoyée à ${elevesIds.length} élèves`);
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
            LEFT JOIN vie_scolaire.profils_eleves e ON e.id_user = c.id_user
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
                LEFT JOIN vie_scolaire.profils_eleves e ON e.id_user = c.id_user
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

// ═══════════════════════════════════════════
// PARENTS
// ═══════════════════════════════════════════
exports.getParents = async (req, res) => {
    try {
        const r = await db.query(`
            SELECT c.id_user, c.code_unique, c.nom, c.prenom,
                   c.email, c.telephone, c.est_actif,
                   pp.profession, pp.photo_url,
                   COUNT(DISTINCT re.id_eleve) AS nb_enfants,
                   STRING_AGG(DISTINCT (ec.prenom || ' ' || ec.nom), ', ') AS enfants
            FROM authentification.comptes c
            LEFT JOIN gestion_ape.profils_parents pp ON pp.id_user = c.id_user
            LEFT JOIN vie_scolaire.relations_parents_eleves re ON re.id_parent = c.id_user
            LEFT JOIN authentification.comptes ec ON ec.id_user = re.id_eleve
            WHERE c.role_actuel = 'PARENT'
            GROUP BY c.id_user, c.code_unique, c.nom, c.prenom, c.email, c.telephone,
                     c.est_actif, pp.profession, pp.photo_url
            ORDER BY c.nom, c.prenom
        `);
        res.json({ success: true, parents: r.rows });
    } catch (e) {
        console.error('getParents:', e.message);
        res.json({ success: true, parents: [] });
    }
};

// ═══════════════════════════════════════════
// ALUMNI (anciens élèves)
// ═══════════════════════════════════════════
exports.getAlumni = async (req, res) => {
    try {
        const r = await db.query(`
            SELECT c.id_user, c.code_unique, c.nom, c.prenom,
                   c.email, c.telephone, c.est_actif,
                   pa.derniere_classe, pa.annee_diplome,
                   pa.situation_actuelle, pa.profession, pa.photo_url
            FROM authentification.comptes c
            LEFT JOIN gestion_ape.profils_alumni pa ON pa.id_user = c.id_user
            WHERE c.role_actuel = 'ALUMNI'
            ORDER BY pa.annee_diplome DESC NULLS LAST, c.nom, c.prenom
        `);
        res.json({ success: true, alumni: r.rows });
    } catch (e) {
        console.error('getAlumni:', e.message);
        res.json({ success: true, alumni: [] });
    }
};

// ═══════════════════════════════════════════
// SUPPRESSION D'UNE ABSENCE (Direction)
// ═══════════════════════════════════════════
exports.deleteAbsence = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `DELETE FROM gestion.absences WHERE id_absence = $1 RETURNING id_absence`,
            [id]
        );
        if (!result.rows.length) {
            return res.status(404).json({ message: 'Absence introuvable' });
        }
        res.json({ success: true, message: 'Absence supprimée' });
    } catch (error) {
        console.error('deleteAbsence (admin):', error.message);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ═══════════════════════════════════════════
// IMPORT EN MASSE DEPUIS EXCEL (élèves)
// Deux étapes obligatoires : aperçu (dryRun) puis confirmation — jamais
// d'insertion directe sans validation visuelle d'abord, pour éviter
// d'importer 500 lignes fausses par erreur.
// Colonnes attendues dans le fichier : Nom | Prenom | Classe | Email
// (optionnel) | Telephone (optionnel)
// ═══════════════════════════════════════════
exports.importElevesExcel = async (req, res) => {
    let XLSX;
    try {
        XLSX = require('xlsx');
    } catch (e) {
        return res.status(500).json({
            message: "La librairie 'xlsx' n'est pas installée. Lance 'npm install xlsx' dans ton projet puis redémarre le serveur."
        });
    }

    try {
        if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });

        const dryRun = req.body.dryRun !== 'false'; // aperçu par défaut, sauf si dryRun=false explicite

        // ✅ Lecture directe du buffer en mémoire (le fichier passe par
        // l'application Node.js, qui force déjà l'UTF-8 — aucun risque de
        // corruption d'accents comme on en a eu avec le SQL manuel).
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows.length) {
            return res.status(400).json({ message: 'Le fichier est vide ou illisible.' });
        }

        const bcrypt = require('bcryptjs');
        const prefixes = await _getPrefixesMatricule();
        const countR = await db.query(
            "SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='ELEVE'"
        );
        let compteur = parseInt(countR.rows[0].count) || 0;

        const resultats = [];
        for (let i = 0; i < rows.length; i++) {
            const ligne = rows[i];
            // Tolère plusieurs variantes d'en-têtes (Nom/nom/NOM...)
            const get = (obj, keys) => {
                for (const k of keys) {
                    for (const realKey of Object.keys(obj)) {
                        if (realKey.trim().toLowerCase() === k) return String(obj[realKey]).trim();
                    }
                }
                return '';
            };
            // ✅ Valeur BRUTE (sans String()) — nécessaire pour les dates :
            // Excel peut renvoyer soit du texte ("21/02/2008"), soit un objet
            // Date JS si la cellule est mise en forme "Date", et String(Date)
            // donnerait un texte inexploitable ("Thu Feb 21 2008...").
            const getRaw = (obj, keys) => {
                for (const k of keys) {
                    for (const realKey of Object.keys(obj)) {
                        if (realKey.trim().toLowerCase() === k) return obj[realKey];
                    }
                }
                return null;
            };
            const nom = get(ligne, ['nom']);
            const prenom = get(ligne, ['prenom', 'prénom']);
            const classe = get(ligne, ['classe']);
            const email = get(ligne, ['email', 'e-mail']) || null;
            const telephone = get(ligne, ['telephone', 'téléphone', 'tel']) || null;
            // ✅ Optionnelles : indispensables sur le bulletin officiel
            // (SEXE / DATE ET LIEU DE NAISSANCE) mais absentes avant de cet
            // import — restaient vides pour tout élève importé en masse.
            const sexeRaw = get(ligne, ['sexe']).toUpperCase();
            const sexe = ['M', 'F'].includes(sexeRaw) ? sexeRaw : null;
            // ⚠️ Le format saisi est JJ/MM/AAAA (convention française/burkinabè).
            // Sans conversion, Postgres l'interprète en MM/JJ/AAAA : les dates
            // avec jour ≤ 12 étaient silencieusement inversées (12/05/2013 →
            // stocké comme le 5 décembre au lieu du 12 mai) et celles avec
            // jour > 12 faisaient planter l'insertion (compte élève créé mais
            // sans fiche, "orphelin" — repéré avec CN-2026-2003 le 18/09/2026).
            const dateNaissance = _parseDateFrAdmin(getRaw(ligne, ['datenaissance', 'date de naissance', 'date_naissance']));
            const lieuNaissance = get(ligne, ['lieunaissance', 'lieu de naissance', 'lieu_naissance']) || null;

            if (!nom || !prenom || !classe) {
                resultats.push({ ligne: i + 2, nom, prenom, classe, statut: 'ERREUR', message: 'Nom, prénom et classe sont obligatoires' });
                continue;
            }

            if (dryRun) {
                compteur++;
                const codePrevisionnel = `${prefixes.eleve}-${prefixes.annee}-` + String(2000 + compteur).padStart(4, '0');
                resultats.push({ ligne: i + 2, nom: nom.toUpperCase(), prenom, classe, email, telephone, sexe, date_naissance: dateNaissance, lieu_naissance: lieuNaissance, code_previsionnel: codePrevisionnel, statut: 'OK' });
                continue;
            }

            try {
                const motDePasseTemp = genTempPassword();
                const hash = await bcrypt.hash(motDePasseTemp, 10);
                // ⚠️ Créé inactif — trg_prevent_eleve_activation refuse un élève
                // actif sans parent lié. S'active automatiquement dès qu'un
                // import de parents (voir importParentsExcel) le lie à un parent.
                const { code, resultat: r } = await insererAvecCodeUnique(
                    () => { compteur++; return `${prefixes.eleve}-${prefixes.annee}-` + String(2000 + compteur).padStart(4, '0'); },
                    (code) => db.query(`
                        INSERT INTO authentification.comptes
                        (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
                        VALUES ($1,$2,$3,$4,$5,$6,'ELEVE',false)
                        RETURNING id_user, code_unique
                    `, [code, nom.toUpperCase(), prenom, email, telephone, hash])
                );
                await db.query(
                    `INSERT INTO vie_scolaire.profils_eleves (id_user, classe_actuelle, sexe, date_naissance, lieu_naissance) VALUES ($1, $2, $3, $4, $5)`,
                    [r.rows[0].id_user, classe, sexe, dateNaissance, lieuNaissance]
                );
                resultats.push({ ligne: i + 2, nom: nom.toUpperCase(), prenom, classe, code_unique: code, mot_de_passe_temporaire: motDePasseTemp, statut: 'CREE', note: '🔒 En attente d\'un parent lié pour être activé' });
            } catch (err) {
                resultats.push({ ligne: i + 2, nom, prenom, classe, statut: 'ERREUR', message: err.message });
            }
        }

        const nbOk = resultats.filter(r => r.statut === 'OK' || r.statut === 'CREE').length;
        const nbErreurs = resultats.filter(r => r.statut === 'ERREUR').length;

        res.json({
            success: true,
            dryRun,
            total: rows.length,
            nb_ok: nbOk,
            nb_erreurs: nbErreurs,
            resultats
        });
    } catch (error) {
        console.error('importElevesExcel:', error.message);
        res.status(500).json({ message: 'Erreur import: ' + error.message });
    }
};

// ✅ Petit helper partagé par les 3 imports ci-dessous (Professeurs, Parents,
// Alumni) : tolère plusieurs variantes d'en-têtes (Nom/nom/NOM...), comme
// dans importElevesExcel.
function getColExcel(obj, keys) {
    for (const k of keys) {
        for (const realKey of Object.keys(obj)) {
            if (realKey.trim().toLowerCase() === k) return String(obj[realKey]).trim();
        }
    }
    return '';
}

// ═══════════════════════════════════════════
// IMPORT EXCEL — PROFESSEURS
// Colonnes attendues : Nom, Prenom, Specialite (obligatoires),
// Email, Telephone (optionnelles).
// ═══════════════════════════════════════════
exports.importProfesseursExcel = async (req, res) => {
    let XLSX;
    try { XLSX = require('xlsx'); } catch (e) {
        return res.status(500).json({ message: "La librairie 'xlsx' n'est pas installée." });
    }
    try {
        if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });
        const dryRun = req.body.dryRun !== 'false';

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!rows.length) return res.status(400).json({ message: 'Le fichier est vide ou illisible.' });

        const bcrypt = require('bcryptjs');
        const prefixes = await _getPrefixesMatricule();
        const countR = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='PROFESSEUR'");
        let compteur = parseInt(countR.rows[0].count) || 0;

        const resultats = [];
        for (let i = 0; i < rows.length; i++) {
            const ligne = rows[i];
            const nom = getColExcel(ligne, ['nom']);
            const prenom = getColExcel(ligne, ['prenom', 'prénom']);
            const specialite = getColExcel(ligne, ['specialite', 'spécialité', 'matiere', 'matière']);
            const email = getColExcel(ligne, ['email', 'e-mail']) || null;
            const telephone = getColExcel(ligne, ['telephone', 'téléphone', 'tel']) || null;
            // ✅ Optionnelles : "Classes" et "Matieres" (plusieurs valeurs
            // séparées par une virgule dans la même cellule, ex: "6ème, 5ème").
            // Si absentes, le prof n'a encore aucune classe assignée — à
            // corriger ensuite depuis "Gérer les profs", pas par le prof lui-même.
            const classesTxt = getColExcel(ligne, ['classes', 'classe']);
            const matieresTxt = getColExcel(ligne, ['matieres', 'matières']);

            if (!nom || !prenom || !specialite) {
                resultats.push({ ligne: i + 2, nom, prenom, statut: 'ERREUR', message: 'Nom, prénom et spécialité sont obligatoires' });
                continue;
            }

            if (dryRun) {
                compteur++;
                const codePrevisionnel = `${prefixes.prof}-${prefixes.annee}-` + String(compteur + 10).padStart(3, '0');
                resultats.push({ ligne: i + 2, nom: nom.toUpperCase(), prenom, specialite, email, telephone, classes: classesTxt || '', matieres: matieresTxt || '', code_previsionnel: codePrevisionnel, statut: 'OK' });
                continue;
            }

            try {
                const motDePasseTemp = genTempPassword();
                const hash = await bcrypt.hash(motDePasseTemp, 10);
                const { code, resultat: r } = await insererAvecCodeUnique(
                    () => { compteur++; return `${prefixes.prof}-${prefixes.annee}-` + String(compteur + 10).padStart(3, '0'); },
                    (code) => db.query(`
                        INSERT INTO authentification.comptes
                        (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
                        VALUES ($1,$2,$3,$4,$5,$6,'PROFESSEUR',true)
                        RETURNING id_user, code_unique
                    `, [code, nom.toUpperCase(), prenom, email, telephone, hash])
                );
                await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS classes TEXT[]`);
                await db.query(`ALTER TABLE pedagogie.profils_profs ADD COLUMN IF NOT EXISTS matieres TEXT[]`);
                await db.query(
                    `INSERT INTO pedagogie.profils_profs (id_user, specialite, classes, matieres) VALUES ($1,$2,$3,$4)
                     ON CONFLICT (id_user) DO UPDATE SET specialite=$2, classes=$3, matieres=$4`,
                    [r.rows[0].id_user, specialite, _parseListeAdmin(classesTxt), _parseListeAdmin(matieresTxt)]
                );
                resultats.push({ ligne: i + 2, nom: nom.toUpperCase(), prenom, specialite, code_unique: code, mot_de_passe_temporaire: motDePasseTemp, statut: 'CREE' });
            } catch (err) {
                resultats.push({ ligne: i + 2, nom, prenom, statut: 'ERREUR', message: err.message });
            }
        }

        res.json({
            success: true, dryRun, total: rows.length,
            nb_ok: resultats.filter(r => r.statut === 'OK' || r.statut === 'CREE').length,
            nb_erreurs: resultats.filter(r => r.statut === 'ERREUR').length,
            resultats
        });
    } catch (error) {
        console.error('importProfesseursExcel:', error.message);
        res.status(500).json({ message: 'Erreur import: ' + error.message });
    }
};

// ═══════════════════════════════════════════
// IMPORT EXCEL — ALUMNI
// Colonnes attendues : Nom, Prenom (obligatoires), Email, Telephone,
// DerniereClasse, AnneeDiplome (optionnelles).
// ═══════════════════════════════════════════
exports.importAlumniExcel = async (req, res) => {
    let XLSX;
    try { XLSX = require('xlsx'); } catch (e) {
        return res.status(500).json({ message: "La librairie 'xlsx' n'est pas installée." });
    }
    try {
        if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });
        const dryRun = req.body.dryRun !== 'false';

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!rows.length) return res.status(400).json({ message: 'Le fichier est vide ou illisible.' });

        const bcrypt = require('bcryptjs');
        const prefixes = await _getPrefixesMatricule();
        const countR = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='ALUMNI'");
        let compteur = parseInt(countR.rows[0].count) || 0;

        const resultats = [];
        for (let i = 0; i < rows.length; i++) {
            const ligne = rows[i];
            const nom = getColExcel(ligne, ['nom']);
            const prenom = getColExcel(ligne, ['prenom', 'prénom']);
            const email = getColExcel(ligne, ['email', 'e-mail']) || null;
            const telephone = getColExcel(ligne, ['telephone', 'téléphone', 'tel']) || null;
            const derniereClasse = getColExcel(ligne, ['derniereclasse', 'derniere classe', 'dernière classe', 'classe']) || null;
            const anneeDiplome = getColExcel(ligne, ['anneediplome', 'annee diplome', 'année diplôme', 'annee']) || null;

            if (!nom || !prenom) {
                resultats.push({ ligne: i + 2, nom, prenom, statut: 'ERREUR', message: 'Nom et prénom sont obligatoires' });
                continue;
            }

            if (dryRun) {
                compteur++;
                const codePrevisionnel = `${prefixes.alumni}-${prefixes.annee}-` + String(compteur).padStart(3, '0');
                resultats.push({ ligne: i + 2, nom: nom.toUpperCase(), prenom, email, telephone, code_previsionnel: codePrevisionnel, statut: 'OK' });
                continue;
            }

            try {
                const motDePasseTemp = genTempPassword();
                const hash = await bcrypt.hash(motDePasseTemp, 10);
                const { code, resultat: r } = await insererAvecCodeUnique(
                    () => { compteur++; return `${prefixes.alumni}-${prefixes.annee}-` + String(compteur).padStart(3, '0'); },
                    (code) => db.query(`
                        INSERT INTO authentification.comptes
                        (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
                        VALUES ($1,$2,$3,$4,$5,$6,'ALUMNI',true)
                        RETURNING id_user, code_unique
                    `, [code, nom.toUpperCase(), prenom, email, telephone, hash])
                );
                await db.query(
                    `INSERT INTO gestion_ape.profils_alumni (id_user, derniere_classe, annee_diplome) VALUES ($1,$2,$3)
                     ON CONFLICT (id_user) DO UPDATE SET derniere_classe=$2, annee_diplome=$3`,
                    [r.rows[0].id_user, derniereClasse, anneeDiplome]
                );
                resultats.push({ ligne: i + 2, nom: nom.toUpperCase(), prenom, code_unique: code, mot_de_passe_temporaire: motDePasseTemp, statut: 'CREE' });
            } catch (err) {
                resultats.push({ ligne: i + 2, nom, prenom, statut: 'ERREUR', message: err.message });
            }
        }

        res.json({
            success: true, dryRun, total: rows.length,
            nb_ok: resultats.filter(r => r.statut === 'OK' || r.statut === 'CREE').length,
            nb_erreurs: resultats.filter(r => r.statut === 'ERREUR').length,
            resultats
        });
    } catch (error) {
        console.error('importAlumniExcel:', error.message);
        res.status(500).json({ message: 'Erreur import: ' + error.message });
    }
};

// ═══════════════════════════════════════════
// IMPORT EXCEL — PARENTS
// Colonnes attendues : Nom, Prenom, MatriculeEnfant (obligatoires — un
// parent doit toujours être lié à un élève déjà existant, voir
// createParent ci-dessus pour le pourquoi), Email, Telephone,
// Profession, LienParente (optionnelles).
// ═══════════════════════════════════════════
exports.importParentsExcel = async (req, res) => {
    let XLSX;
    try { XLSX = require('xlsx'); } catch (e) {
        return res.status(500).json({ message: "La librairie 'xlsx' n'est pas installée." });
    }
    try {
        if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });
        const dryRun = req.body.dryRun !== 'false';

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!rows.length) return res.status(400).json({ message: 'Le fichier est vide ou illisible.' });

        const bcrypt = require('bcryptjs');
        const prefixes = await _getPrefixesMatricule();
        const countR = await db.query("SELECT COUNT(*) FROM authentification.comptes WHERE role_actuel='PARENT'");
        let compteur = parseInt(countR.rows[0].count) || 0;

        const resultats = [];
        for (let i = 0; i < rows.length; i++) {
            const ligne = rows[i];
            const nom = getColExcel(ligne, ['nom']);
            const prenom = getColExcel(ligne, ['prenom', 'prénom']);
            const matriculeEnfant = getColExcel(ligne, ['matriculeenfant', 'matricule enfant', 'matricule_enfant', 'matricule']);
            const email = getColExcel(ligne, ['email', 'e-mail']) || null;
            const telephone = getColExcel(ligne, ['telephone', 'téléphone', 'tel']) || null;
            const profession = getColExcel(ligne, ['profession']) || null;
            const lienParente = getColExcel(ligne, ['lienparente', 'lien parente', 'lien parenté', 'lien']) || 'Parent';

            if (!nom || !prenom || !matriculeEnfant) {
                resultats.push({ ligne: i + 2, nom, prenom, statut: 'ERREUR', message: 'Nom, prénom et matricule de l\'enfant sont obligatoires' });
                continue;
            }

            const eleve = await db.query(
                `SELECT c.id_user, c.nom AS nom_enfant, c.prenom AS prenom_enfant, pe.classe_actuelle AS classe_enfant
                 FROM authentification.comptes c
                 LEFT JOIN vie_scolaire.profils_eleves pe ON pe.id_user = c.id_user
                 WHERE c.code_unique = $1 AND c.role_actuel = 'ELEVE'`,
                [matriculeEnfant]
            );
            if (!eleve.rows.length) {
                resultats.push({ ligne: i + 2, nom, prenom, statut: 'ERREUR', message: `Aucun élève trouvé avec le matricule ${matriculeEnfant}` });
                continue;
            }
            const idEleve = eleve.rows[0].id_user;
            const infoEnfant = {
                matricule_enfant: matriculeEnfant,
                nom_enfant: eleve.rows[0].nom_enfant,
                prenom_enfant: eleve.rows[0].prenom_enfant,
                classe_enfant: eleve.rows[0].classe_enfant,
            };

            if (dryRun) {
                compteur++;
                const codePrevisionnel = `${prefixes.parent}-${prefixes.annee}-` + String(compteur).padStart(4, '0');
                resultats.push({ ligne: i + 2, nom: nom.toUpperCase(), prenom, email, telephone, ...infoEnfant, code_previsionnel: codePrevisionnel, statut: 'OK' });
                continue;
            }

            try {
                const motDePasseTemp = genTempPassword();
                const hash = await bcrypt.hash(motDePasseTemp, 10);
                // Voir createParent ci-dessus : compte créé inactif puis activé
                // après la liaison, à cause du déclencheur BD qui refuse tout
                // parent actif sans enfant lié.
                const { code, resultat: r } = await insererAvecCodeUnique(
                    () => { compteur++; return `${prefixes.parent}-${prefixes.annee}-` + String(compteur).padStart(4, '0'); },
                    (code) => db.query(`
                        INSERT INTO authentification.comptes
                        (code_unique, nom, prenom, email, telephone, mot_de_passe, role_actuel, est_actif)
                        VALUES ($1,$2,$3,$4,$5,$6,'PARENT',false)
                        RETURNING id_user, code_unique
                    `, [code, nom.toUpperCase(), prenom, email, telephone, hash])
                );
                const parentId = r.rows[0].id_user;

                await db.query(
                    `INSERT INTO gestion_ape.profils_parents (id_user, profession, telephone) VALUES ($1,$2,$3)`,
                    [parentId, profession, telephone]
                );
                await db.query(
                    `INSERT INTO vie_scolaire.relations_parents_eleves (id_parent, id_eleve, lien_parente) VALUES ($1,$2,$3)`,
                    [parentId, idEleve, lienParente]
                );
                await db.query(`UPDATE authentification.comptes SET est_actif = true WHERE id_user = $1`, [parentId]);
                // ⚠️ Active l'élève lié — voir la note dans createParent.
                await db.query(`UPDATE authentification.comptes SET est_actif = true WHERE id_user = $1`, [idEleve]);

                resultats.push({ ligne: i + 2, nom: nom.toUpperCase(), prenom, ...infoEnfant, code_unique: code, mot_de_passe_temporaire: motDePasseTemp, statut: 'CREE' });
            } catch (err) {
                resultats.push({ ligne: i + 2, nom, prenom, statut: 'ERREUR', message: err.message });
            }
        }

        res.json({
            success: true, dryRun, total: rows.length,
            nb_ok: resultats.filter(r => r.statut === 'OK' || r.statut === 'CREE').length,
            nb_erreurs: resultats.filter(r => r.statut === 'ERREUR').length,
            resultats
        });
    } catch (error) {
        console.error('importParentsExcel:', error.message);
        res.status(500).json({ message: 'Erreur import: ' + error.message });
    }
};

// ═══════════════════════════════════════════
// EMPLOI DU TEMPS — modèle Excel + import en masse
// ═══════════════════════════════════════════

// Génère et renvoie un fichier .xlsx modèle, coloré et prêt à remplir, pour
// que la Direction puisse préparer l'emploi du temps de plusieurs classes
// dans un seul fichier puis l'importer d'un coup.
exports.getEmploiDuTempsTemplate = async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();

        const sheet = workbook.addWorksheet('Emploi du temps');
        sheet.columns = [
            { header: 'Classe', key: 'classe', width: 14 },
            { header: 'Jour', key: 'jour', width: 12 },
            { header: 'Heure début', key: 'heure_debut', width: 13 },
            { header: 'Heure fin', key: 'heure_fin', width: 13 },
            { header: 'Matière', key: 'matiere', width: 16 },
            { header: 'Professeur (matricule ou nom complet)', key: 'professeur', width: 30 },
            { header: 'Salle', key: 'salle', width: 12 },
        ];

        const headerRow = sheet.getRow(1);
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { bottom: { style: 'thin', color: { argb: 'FF312E81' } } };
        });
        headerRow.height = 22;

        const exemples = [
            { classe: '6ème', jour: 'Lundi', heure_debut: '07:30', heure_fin: '09:00', matiere: 'Mathématiques', professeur: '', salle: '101' },
            { classe: '6ème', jour: 'Lundi', heure_debut: '09:00', heure_fin: '10:30', matiere: 'Français', professeur: '', salle: '101' },
            { classe: '2nde A', jour: 'Mardi', heure_debut: '07:30', heure_fin: '09:00', matiere: 'Anglais', professeur: '', salle: '204' },
        ];
        exemples.forEach((ex, i) => {
            const row = sheet.addRow(ex);
            row.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF8FAFF' : 'FFFFFFFF' } };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
            });
        });

        // Feuille d'instructions séparée — jours valides et format attendu,
        // pour éviter les erreurs de saisie qui feraient échouer l'import.
        const info = workbook.addWorksheet('Instructions');
        info.columns = [{ width: 90 }];
        const lignesInfo = [
            '📋 Comment remplir ce fichier',
            '',
            '• Une ligne = une séance de cours (une classe, un jour, un créneau horaire).',
            '• Colonne "Jour" : Lundi, Mardi, Mercredi, Jeudi, Vendredi ou Samedi uniquement.',
            '• Colonnes "Heure début" / "Heure fin" : format HH:MM (ex: 07:30).',
            '• Colonne "Professeur" : optionnelle — matricule (ex: PROF-2026-001) ou nom complet.',
            '• Colonne "Salle" : optionnelle.',
            '• Supprimez les lignes d\'exemple avant d\'importer, ou laissez-les — elles seront importées telles quelles si vous ne les modifiez pas.',
            '• Réimporter un fichier n\'écrase pas l\'existant : chaque ligne ajoute une nouvelle séance. Pour corriger une erreur, supprimez la séance depuis l\'application avant de réimporter.',
        ];
        lignesInfo.forEach((texte, i) => {
            const row = info.addRow([texte]);
            if (i === 0) row.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF4F46E5' } };
            else row.getCell(1).font = { size: 11 };
            row.height = 20;
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="modele_emploi_du_temps.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('getEmploiDuTempsTemplate:', e.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + e.message });
    }
};

exports.importEmploiDuTempsExcel = async (req, res) => {
    let XLSX;
    try {
        XLSX = require('xlsx');
    } catch (e) {
        return res.status(500).json({ success: false, message: "La librairie 'xlsx' n'est pas installée sur le serveur." });
    }

    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });

        const dryRun = req.body.dryRun !== 'false';

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows.length) {
            return res.status(400).json({ success: false, message: 'Le fichier est vide ou illisible.' });
        }

        const get = (obj, keys) => {
            for (const k of keys) {
                for (const realKey of Object.keys(obj)) {
                    if (realKey.trim().toLowerCase() === k) return String(obj[realKey]).trim();
                }
            }
            return '';
        };

        const resultats = [];
        for (let i = 0; i < rows.length; i++) {
            const ligne = rows[i];
            const classe = get(ligne, ['classe']);
            const jour = get(ligne, ['jour']);
            const heureDebut = get(ligne, ['heure début', 'heure debut', 'heure_debut']);
            const heureFin = get(ligne, ['heure fin', 'heure_fin']);
            const matiere = get(ligne, ['matière', 'matiere']);
            const profSaisi = get(ligne, ['professeur (matricule ou nom complet)', 'professeur', 'prof']);
            const salle = get(ligne, ['salle']) || null;

            if (!classe || !jour || !heureDebut || !heureFin || !matiere) {
                resultats.push({ ligne: i + 2, classe, jour, statut: 'ERREUR', message: 'Classe, jour, horaires et matière sont obligatoires' });
                continue;
            }
            if (!JOURS_VALIDES.includes(jour)) {
                resultats.push({ ligne: i + 2, classe, jour, statut: 'ERREUR', message: `Jour invalide (attendu: ${JOURS_VALIDES.join(', ')})` });
                continue;
            }
            if (!/^\d{1,2}:\d{2}$/.test(heureDebut) || !/^\d{1,2}:\d{2}$/.test(heureFin) || heureDebut >= heureFin) {
                resultats.push({ ligne: i + 2, classe, jour, statut: 'ERREUR', message: 'Heures invalides (format HH:MM, fin après début)' });
                continue;
            }

            let idProf = null;
            let profTrouve = '';
            if (profSaisi) {
                try {
                    const pr = await db.query(
                        `SELECT id_user, nom, prenom FROM authentification.comptes
                         WHERE role_actuel = 'PROFESSEUR' AND (code_unique = $1 OR (nom || ' ' || prenom) ILIKE $2 OR (prenom || ' ' || nom) ILIKE $2)
                         LIMIT 1`,
                        [profSaisi, `%${profSaisi}%`]
                    );
                    if (pr.rows.length) {
                        idProf = pr.rows[0].id_user;
                        profTrouve = `${pr.rows[0].prenom} ${pr.rows[0].nom}`;
                    }
                } catch (e) { /* professeur non trouvé — séance créée sans prof assigné */ }
            }

            if (dryRun) {
                resultats.push({
                    ligne: i + 2, classe, jour, heure_debut: heureDebut, heure_fin: heureFin, matiere, salle,
                    professeur: profSaisi ? (profTrouve || `⚠️ "${profSaisi}" introuvable — séance créée sans prof`) : '—',
                    statut: 'OK'
                });
                continue;
            }

            try {
                await db.query(
                    `INSERT INTO pedagogie.emploi_du_temps (classe, jour_semaine, heure_debut, heure_fin, matiere, id_prof, salle)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [classe, jour, heureDebut, heureFin, matiere, idProf, salle]
                );
                resultats.push({ ligne: i + 2, classe, jour, heure_debut: heureDebut, heure_fin: heureFin, matiere, statut: 'CREE' });
            } catch (err) {
                resultats.push({ ligne: i + 2, classe, jour, statut: 'ERREUR', message: err.message });
            }
        }

        const nbOk = resultats.filter(r => r.statut === 'OK' || r.statut === 'CREE').length;
        const nbErreurs = resultats.filter(r => r.statut === 'ERREUR').length;

        res.json({ success: true, dryRun, total: rows.length, nb_ok: nbOk, nb_erreurs: nbErreurs, resultats });
    } catch (error) {
        console.error('importEmploiDuTempsExcel:', error.message);
        res.status(500).json({ success: false, message: 'Erreur import: ' + error.message });
    }
};

// ═══════════════════════════════════════════
// PARAMÈTRES DE L'ÉTABLISSEMENT (nom, logo, coordonnées)
// ═══════════════════════════════════════════
exports.updateConfig = async (req, res) => {
    try {
        const { nom_etablissement, slogan, adresse, telephone, email_contact } = req.body;
        // ✅ Préfixes/année de matricule — voir _getPrefixesMatricule() plus
        // haut. Modifiables ici par n'importe quelle école, sans toucher au
        // code. Vide/absent = COALESCE garde la valeur déjà en base (donc
        // les valeurs par défaut posées par la migration ne sont jamais
        // écrasées par erreur si ces champs ne sont pas envoyés).
        const {
            matricule_prefixe_eleve, matricule_prefixe_prof, matricule_prefixe_parent,
            matricule_prefixe_alumni, matricule_prefixe_surveillant, matricule_prefixe_direction,
            matricule_annee,
        } = req.body;

        let logo_url = null;
        if (req.file) {
            const fileStorage = require('../services/fileStorage');
            logo_url = await fileStorage.saveUploadedFile(req.file, { prefix: 'logo', keyed: 'ecole' });
        }

        const existe = await db.query('SELECT id_config FROM gestion.configuration LIMIT 1');
        let r;
        if (existe.rows.length) {
            r = await db.query(`
                UPDATE gestion.configuration SET
                    nom_etablissement = COALESCE($1, nom_etablissement),
                    slogan = COALESCE($2, slogan),
                    adresse = COALESCE($3, adresse),
                    telephone = COALESCE($4, telephone),
                    email_contact = COALESCE($5, email_contact),
                    logo_url = COALESCE($6, logo_url),
                    matricule_prefixe_eleve = COALESCE(NULLIF($7, ''), matricule_prefixe_eleve),
                    matricule_prefixe_prof = COALESCE(NULLIF($8, ''), matricule_prefixe_prof),
                    matricule_prefixe_parent = COALESCE(NULLIF($9, ''), matricule_prefixe_parent),
                    matricule_prefixe_alumni = COALESCE(NULLIF($10, ''), matricule_prefixe_alumni),
                    matricule_prefixe_surveillant = COALESCE(NULLIF($11, ''), matricule_prefixe_surveillant),
                    matricule_prefixe_direction = COALESCE(NULLIF($12, ''), matricule_prefixe_direction),
                    matricule_annee = COALESCE(NULLIF($13, ''), matricule_annee),
                    updated_at = NOW()
                WHERE id_config = $14
                RETURNING *
            `, [
                nom_etablissement || null, slogan || null, adresse || null, telephone || null, email_contact || null, logo_url,
                matricule_prefixe_eleve || '', matricule_prefixe_prof || '', matricule_prefixe_parent || '',
                matricule_prefixe_alumni || '', matricule_prefixe_surveillant || '', matricule_prefixe_direction || '',
                matricule_annee || '', existe.rows[0].id_config,
            ]);
        } else {
            r = await db.query(`
                INSERT INTO gestion.configuration (nom_etablissement, slogan, adresse, telephone, email_contact, logo_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [nom_etablissement || 'Établissement', slogan || null, adresse || null, telephone || null, email_contact || null, logo_url]);
        }

        res.json({ success: true, config: r.rows[0] });
    } catch (error) {
        console.error('updateConfig:', error.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + error.message });
    }
};

// ═══════════════════════════════════════════
// IMAGES PAR ESPACE (cartes du portail d'accueil)
// ═══════════════════════════════════════════
// ⚠️ Pas de "surveillant" : le portail d'accueil n'a qu'une seule carte
// "direction", partagée par direction et surveillant — pas de carte séparée.
const ESPACES_VALIDES = ['eleves', 'professeurs', 'parents', 'ape', 'alumni', 'direction'];

exports.getImagesEspaces = async (req, res) => {
    try {
        const r = await db.query(`
            SELECT id_image, espace, url_image, titre, est_active
            FROM gestion.images_espaces
            ORDER BY espace, ordre
        `);
        res.json({ success: true, espaces: ESPACES_VALIDES, images: r.rows });
    } catch (error) {
        console.error('getImagesEspaces:', error.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + error.message });
    }
};

exports.updateImageEspace = async (req, res) => {
    try {
        const { espace } = req.params;
        if (!ESPACES_VALIDES.includes(espace)) {
            return res.status(400).json({ success: false, message: `Espace inconnu. Valeurs acceptées : ${ESPACES_VALIDES.join(', ')}` });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Aucune image reçue' });
        }

        const fileStorage = require('../services/fileStorage');
        const url_image = await fileStorage.saveUploadedFile(req.file, { prefix: 'espace', keyed: espace });

        const existe = await db.query(
            'SELECT id_image FROM gestion.images_espaces WHERE espace = $1 ORDER BY ordre LIMIT 1',
            [espace]
        );

        let r;
        if (existe.rows.length) {
            r = await db.query(`
                UPDATE gestion.images_espaces
                SET url_image = $1, est_active = true, updated_by = $2, updated_at = NOW()
                WHERE id_image = $3
                RETURNING *
            `, [url_image, req.user.id, existe.rows[0].id_image]);
        } else {
            r = await db.query(`
                INSERT INTO gestion.images_espaces (espace, url_image, ordre, est_active, updated_by)
                VALUES ($1, $2, 0, true, $3)
                RETURNING *
            `, [espace, url_image, req.user.id]);
        }

        res.json({ success: true, image: r.rows[0] });
    } catch (error) {
        console.error('updateImageEspace:', error.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + error.message });
    }
};


// ═══════════════════════════════════════════
// RÉINITIALISATION COMPLÈTE ("Zone dangereuse") — vide tous les
// comptes/données de test et remet une base prête pour un vrai
// déploiement. Triple protection avant toute action destructive :
// rôle DIRECTION (route), phrase de confirmation exacte tapée par
// l'utilisateur, ET son propre mot de passe actuel revérifié (une
// session ouverte ne suffit pas — voir aussi resetMotDePasse pour le
// même principe appliqué à un seul compte).
// ═══════════════════════════════════════════
exports.reinitialisationComplete = async (req, res) => {
    try {
        const { confirmation, mot_de_passe } = req.body;
        if (confirmation !== 'SUPPRIMER TOUT') {
            return res.status(400).json({ success: false, message: 'Phrase de confirmation incorrecte.' });
        }
        if (!mot_de_passe) {
            return res.status(400).json({ success: false, message: 'Mot de passe requis.' });
        }
        const bcrypt = require('bcryptjs');
        const compte = await db.query(`SELECT mot_de_passe FROM authentification.comptes WHERE id_user = $1`, [req.user.id]);
        if (!compte.rows.length || !(await bcrypt.compare(mot_de_passe, compte.rows[0].mot_de_passe))) {
            return res.status(403).json({ success: false, message: 'Mot de passe incorrect.' });
        }

        const resetService = require('../services/resetService');

        // 1) Archive AVANT toute destruction — lecture seule. Si ça
        // échoue, on s'arrête ici et rien n'est détruit.
        const archive = await resetService.construireArchive();

        // 2) Base + stockage — dans cet ordre uniquement parce que
        // l'archive (étape 1) a déjà réussi.
        await resetService.executerResetComplet();
        let stockage;
        try {
            stockage = await resetService.nettoyerStockage();
        } catch (e) {
            console.error('nettoyerStockage (après reset DB réussi):', e.message);
            stockage = { supabase_configure: false, erreur: e.message };
        }

        const nomFichier = `archive_avant_reset_${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
        res.json({ ...archive, stockage });
    } catch (error) {
        console.error('reinitialisationComplete:', error.message);
        res.status(500).json({ success: false, message: 'Erreur: ' + error.message });
    }
};
