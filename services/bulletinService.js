const db = require('../config/db');
const engine = require('./moyennesEngine');

// Moyenne annuelle de chaque élève d'une classe — moyenne des trimestres
// où il a des notes (1, 2 ou 3 selon l'avancement de l'année scolaire).
// Réutilisé par le bulletin (un seul élève) et par le passage de classe
// (toute la classe, pour proposer une décision par élève).
async function calculerMoyennesAnnuellesClasse(classe, idsClasse, anneeScolaire) {
    const notesAnneeRes = await db.query(`
        SELECT n.id_eleve, n.trimestre, COALESCE(n.type_evaluation, 'DEVOIR') AS type_evaluation,
               COALESCE(m.nom_matiere, 'Matière inconnue') AS nom_matiere, n.note
        FROM pedagogie.notes_evaluations n
        LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
        WHERE n.id_eleve = ANY($1::uuid[]) AND n.annee_scolaire = $2
    `, [idsClasse, anneeScolaire]);
    const parEleveTrimestre = {};
    for (const n of notesAnneeRes.rows) {
        const key = n.id_eleve + '|' + n.trimestre;
        if (!parEleveTrimestre[key]) parEleveTrimestre[key] = [];
        parEleveTrimestre[key].push(n);
    }
    const moyenneAnnuelleParEleve = {};
    for (const id of idsClasse) {
        const moyennesTrimestres = [];
        for (const tri of [1, 2, 3]) {
            const notes = parEleveTrimestre[id + '|' + tri];
            if (!notes || !notes.length) continue;
            const parMat = {};
            for (const n of notes) {
                if (!parMat[n.nom_matiere]) parMat[n.nom_matiere] = [];
                parMat[n.nom_matiere].push(n);
            }
            const npm = Object.entries(parMat).map(([nom_matiere, ns]) => ({ nom_matiere, notes: ns }));
            const r = engine.calculerMoyenneGenerale(classe, npm);
            if (r.moyenne_generale !== null) moyennesTrimestres.push(r.moyenne_generale);
        }
        moyenneAnnuelleParEleve[id] = moyennesTrimestres.length
            ? Math.round((moyennesTrimestres.reduce((a, b) => a + b, 0) / moyennesTrimestres.length) * 100) / 100
            : null;
    }
    return moyenneAnnuelleParEleve;
}

// Construit toutes les données d'un bulletin (élève + toute sa classe,
// pour calculer les rangs) — utilisé à la fois par le PDF et, plus tard,
// par n'importe quel autre affichage qui voudrait le même calcul complet.
async function calculerBulletinComplet(idEleve, trimestre, anneeScolaire) {
    const eleveRes = await db.query(
        `SELECT pe.classe_actuelle, pe.date_naissance, pe.sexe, pe.lieu_naissance, c.nom, c.prenom, c.code_unique
         FROM vie_scolaire.profils_eleves pe
         JOIN authentification.comptes c ON c.id_user = pe.id_user
         WHERE pe.id_user = $1`, [idEleve]
    );
    if (!eleveRes.rows.length) return null;
    const { classe_actuelle, date_naissance, sexe, lieu_naissance, nom, prenom, code_unique } = eleveRes.rows[0];

    const camaradesRes = await db.query(
        `SELECT c.id_user, c.nom, c.prenom FROM vie_scolaire.profils_eleves pe
         JOIN authentification.comptes c ON c.id_user = pe.id_user
         WHERE pe.classe_actuelle = $1 AND c.role_actuel = 'ELEVE' AND c.est_actif = true
         ORDER BY c.nom, c.prenom`,
        [classe_actuelle]
    );
    const camarades = camaradesRes.rows;
    const idsClasse = camarades.map(c => c.id_user);

    const notesRes = await db.query(`
        SELECT n.id_eleve, n.note, n.trimestre, COALESCE(n.type_evaluation, 'DEVOIR') AS type_evaluation,
               COALESCE(m.nom_matiere, 'Matière inconnue') AS nom_matiere
        FROM pedagogie.notes_evaluations n
        LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
        WHERE n.id_eleve = ANY($1::uuid[]) AND n.trimestre = $2 AND n.annee_scolaire = $3
    `, [idsClasse, trimestre, anneeScolaire]);

    const parEleve = {};
    for (const id of idsClasse) parEleve[id] = [];
    for (const n of notesRes.rows) if (parEleve[n.id_eleve]) parEleve[n.id_eleve].push(n);

    // Résultat complet (moyenne + détail matières) pour chaque élève de
    // la classe — nécessaire pour calculer le rang par matière et le
    // rang général, pas seulement pour l'élève demandé.
    const resultatsParEleve = {};
    for (const id of idsClasse) {
        const parMat = {};
        for (const n of parEleve[id]) {
            if (!parMat[n.nom_matiere]) parMat[n.nom_matiere] = [];
            parMat[n.nom_matiere].push(n);
        }
        const npm = Object.entries(parMat).map(([nom_matiere, notes]) => ({ nom_matiere, notes }));
        resultatsParEleve[id] = engine.calculerMoyenneGenerale(classe_actuelle, npm);
    }

    const moi = resultatsParEleve[idEleve];
    if (!moi) return null;

    // Rang général
    const rangsGeneraux = engine.calculerRangs(idsClasse.map(id => ({ id, moyenne: resultatsParEleve[id].moyenne_generale })));
    const monRangGeneral = rangsGeneraux.find(r => r.id === idEleve);
    const moyennesValides = rangsGeneraux.map(r => r.moyenne).filter(m => m !== null);

    // Rang par matière — un classement séparé pour chaque discipline du
    // programme, comme sur le bulletin papier.
    const rangsParMatiere = {};
    for (const mat of moi.detail_matieres) {
        const items = idsClasse.map(id => {
            const d = resultatsParEleve[id].detail_matieres.find(m => m.nom === mat.nom);
            return { id, moyenne: d ? d.moyenne : null };
        });
        rangsParMatiere[mat.nom] = engine.calculerRangs(items).find(r => r.id === idEleve)?.rang ?? null;
    }

    // Appréciations du professeur, une par matière pour ce trimestre.
    const apprecRes = await db.query(`
        SELECT m.nom_matiere, a.texte FROM pedagogie.appreciations a
        JOIN pedagogie.matieres m ON a.id_matiere = m.id_matiere
        WHERE a.id_eleve = $1 AND a.trimestre = $2 AND a.annee_scolaire = $3
    `, [idEleve, trimestre, anneeScolaire]);
    const apprecParMatiere = {};
    const _norm = engine.normaliserNomMatiereAvecAlias;
    for (const a of apprecRes.rows) {
        apprecParMatiere[a.nom_matiere] = a.texte;
        apprecParMatiere[_norm(a.nom_matiere)] = a.texte;
    }

    const configRes = await db.query(`SELECT nom_etablissement FROM gestion.configuration LIMIT 1`);
    const nomEtablissement = configRes.rows[0]?.nom_etablissement || 'Établissement';

    // Signature électronique de ce bulletin (si la Direction l'a déjà
    // signé) — permet au PDF d'imprimer un QR code de vérification et
    // de détecter si les notes ont changé depuis la signature.
    const sigRes = await db.query(`
        SELECT bs.code_verification, bs.date_signature, bs.moyenne_signee, bs.decision_signee,
               s.nom AS signataire_nom, s.prenom AS signataire_prenom
        FROM pedagogie.bulletins_signes bs
        JOIN authentification.comptes s ON s.id_user = bs.id_signataire
        WHERE bs.id_eleve = $1 AND bs.trimestre = $2 AND bs.annee_scolaire = $3
    `, [idEleve, trimestre, anneeScolaire]);
    const sig = sigRes.rows[0] || null;

    // Moyenne annuelle, rang annuel et décision de passage n'ont de sens
    // qu'une fois l'année terminée — un bulletin de 1er ou 2e trimestre
    // n'affiche donc ni l'un ni l'autre (voir plus bas, "trimestreNum").
    // Moyenne des trimestres où l'élève a des notes (1, 2 ou 3 selon
    // l'avancement de l'année), pas seulement le trimestre de ce bulletin.
    const trimestreNum = parseInt(trimestre);
    const moyenneAnnuelleParEleve = await calculerMoyennesAnnuellesClasse(classe_actuelle, idsClasse, anneeScolaire);
    const rangsAnnuels = engine.calculerRangs(idsClasse.map(id => ({ id, moyenne: moyenneAnnuelleParEleve[id] })));
    const monRangAnnuel = rangsAnnuels.find(r => r.id === idEleve);
    const moyenneAnnuelle = moyenneAnnuelleParEleve[idEleve] ?? null;

    // Décision de fin d'année — basée sur la moyenne annuelle si elle
    // existe déjà (au moins un trimestre saisi), sinon sur la moyenne du
    // bulletin en cours. Seuil réglable (même seuil que "Passable").
    const seuilPassage = engine.getSeuils().passable;
    const moyennePourDecision = moyenneAnnuelle !== null ? moyenneAnnuelle : moi.moyenne_generale;
    const decision = moyennePourDecision === null ? null : (moyennePourDecision >= seuilPassage ? 'Passe en classe supérieure' : "À revoir en conseil de classe");
    const decisionExposee = trimestreNum === 3 ? decision : null;

    // Au 2e trimestre, le bulletin rappelle la moyenne du 1er trimestre
    // (simple repère pour le lecteur, pas une moyenne annuelle calculée).
    let moyenneTrimestrePrecedent = null;
    if (trimestreNum === 2) {
        const notesT1Res = await db.query(`
            SELECT n.note, COALESCE(n.type_evaluation, 'DEVOIR') AS type_evaluation,
                   COALESCE(m.nom_matiere, 'Matière inconnue') AS nom_matiere
            FROM pedagogie.notes_evaluations n
            LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
            WHERE n.id_eleve = $1 AND n.trimestre = 1 AND n.annee_scolaire = $2
        `, [idEleve, anneeScolaire]);
        const parMatT1 = notesT1Res.rows.reduce((acc, n) => { (acc[n.nom_matiere] = acc[n.nom_matiere] || []).push(n); return acc; }, {});
        const npmT1 = Object.entries(parMatT1).map(([nom_matiere, notes]) => ({ nom_matiere, notes }));
        moyenneTrimestrePrecedent = engine.calculerMoyenneGenerale(classe_actuelle, npmT1).moyenne_generale;
    }

    const mentionHonneur = engine.getMentionHonneur(moi.moyenne_generale);

    // Détail devoirs/composition — utile seulement pour l'élève demandé
    // (les autres élèves de la classe ne servent qu'au calcul des rangs).
    // Indexé par nom brut ET par nom normalisé (la BD dit "SVT", le
    // programme officiel dit "Sciences de la Vie et de la Terre").
    const detailDevoirsCompos = {};
    for (const [nomMat, notes] of Object.entries(
        parEleve[idEleve].reduce((acc, n) => { (acc[n.nom_matiere] = acc[n.nom_matiere] || []).push(n); return acc; }, {})
    )) {
        const detail = {
            devoirs: notes.filter(n => ['DEVOIR', 'DEVOIR1', 'DEVOIR2', 'RATTRAPAGE'].includes(n.type_evaluation)).map(n => parseFloat(n.note)),
            compos: notes.filter(n => ['COMPO', 'COMPOSITION', 'EXAMEN'].includes(n.type_evaluation)).map(n => parseFloat(n.note)),
        };
        detailDevoirsCompos[nomMat] = detail;
        detailDevoirsCompos[engine.normaliserNomMatiereAvecAlias(nomMat)] = detail;
    }

    return {
        etablissement: nomEtablissement,
        eleve: { nom, prenom, code_unique, classe: classe_actuelle, date_naissance, sexe, lieu_naissance },
        trimestre, annee_scolaire: anneeScolaire,
        effectif_classe: idsClasse.length,
        moyenne_generale: moi.moyenne_generale,
        mention: moi.mention,
        mention_honneur: mentionHonneur,
        rang_general: monRangGeneral ? monRangGeneral.rang : null,
        moyenne_classe: moyennesValides.length ? Math.round((moyennesValides.reduce((a, b) => a + b, 0) / moyennesValides.length) * 100) / 100 : null,
        meilleure_moyenne: moyennesValides.length ? Math.max(...moyennesValides) : null,
        plus_faible_moyenne: moyennesValides.length ? Math.min(...moyennesValides) : null,
        // Réservés au bulletin du 3e trimestre — voir commentaire plus haut.
        moyenne_annuelle: trimestreNum === 3 ? moyenneAnnuelle : null,
        rang_annuel: trimestreNum === 3 ? (monRangAnnuel ? monRangAnnuel.rang : null) : null,
        decision: decisionExposee,
        moyenne_trimestre_precedent: moyenneTrimestrePrecedent,
        signature: sig ? {
            code_verification: sig.code_verification,
            date_signature: sig.date_signature,
            signataire: `${sig.signataire_prenom} ${sig.signataire_nom}`,
            // "modifié depuis la signature" — les notes ou la décision ont
            // changé après coup (correction, ressaisie...), donc le PDF
            // généré maintenant ne correspond plus exactement à ce qui a
            // été signé. Tolérance de 0.01 pour l'arrondi flottant.
            modifie: (
                (sig.moyenne_signee !== null && moi.moyenne_generale !== null && Math.abs(parseFloat(sig.moyenne_signee) - moi.moyenne_generale) > 0.01) ||
                (sig.moyenne_signee === null) !== (moi.moyenne_generale === null) ||
                (sig.decision_signee || null) !== (decisionExposee || null)
            ),
        } : null,
        matieres: moi.detail_matieres.map(m => ({
            nom: m.nom, domaine: m.domaine, coefficient: m.coefficient, moyenne: m.moyenne,
            note_ponderee: m.moyenne !== null ? Math.round(m.moyenne * m.coefficient * 100) / 100 : null,
            rang: rangsParMatiere[m.nom] || null,
            // Si le prof n'a saisi aucun commentaire, on affiche une
            // appréciation par défaut basée sur la note plutôt qu'un tiret —
            // le prof garde toujours la main : son texte, s'il existe, prime.
            appreciation: apprecParMatiere[m.nom] || apprecParMatiere[_norm(m.nom)] || engine.getAppreciationAuto(m.moyenne),
            devoirs: (detailDevoirsCompos[m.nom] || detailDevoirsCompos[_norm(m.nom)] || {}).devoirs || [],
            compos: (detailDevoirsCompos[m.nom] || detailDevoirsCompos[_norm(m.nom)] || {}).compos || [],
        })),
    };
}

// Liste d'une classe avec la moyenne annuelle de chacun et une décision
// suggérée — sert d'écran de départ pour le passage de classe. La
// Direction peut ensuite corriger n'importe quelle décision à la main
// (un redoublement peut être décidé en conseil de classe même avec une
// moyenne suffisante, et inversement).
async function construireRosterPassage(classe, anneeScolaire) {
    const elevesRes = await db.query(
        `SELECT c.id_user, c.nom, c.prenom, c.code_unique, pe.statut_scolaire
         FROM vie_scolaire.profils_eleves pe
         JOIN authentification.comptes c ON c.id_user = pe.id_user
         WHERE pe.classe_actuelle = $1 AND c.role_actuel = 'ELEVE' AND c.est_actif = true
         ORDER BY c.nom, c.prenom`,
        [classe]
    );
    const idsClasse = elevesRes.rows.map(r => r.id_user);
    const moyennesParEleve = await calculerMoyennesAnnuellesClasse(classe, idsClasse, anneeScolaire);
    const seuilPassage = engine.getSeuils().passable;

    const estTerminale = classe.trim().toLowerCase().startsWith('tle');

    return elevesRes.rows.map(e => {
        const moyenne = moyennesParEleve[e.id_user] ?? null;
        let suggestion = null;
        if (moyenne !== null) {
            const admis = moyenne >= seuilPassage;
            // Terminale n'a pas de classe suivante — un admis est diplômé,
            // pas "promu" vers une classe qui n'existe pas.
            suggestion = estTerminale ? (admis ? 'DIPLOME' : 'REDOUBLE') : (admis ? 'PROMU' : 'REDOUBLE');
        }
        return {
            id_eleve: e.id_user, nom: e.nom, prenom: e.prenom, code_unique: e.code_unique,
            statut_scolaire: e.statut_scolaire || 'INSCRIT',
            moyenne_annuelle: moyenne,
            decision_suggeree: suggestion,
        };
    });
}

module.exports = { calculerBulletinComplet, construireRosterPassage };
