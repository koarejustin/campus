/**
 * ================================================================
 * CONTROLLER : getMoyennesAvancees — VERSION CORRIGÉE
 * Basé sur la vraie structure de la base :
 *   - pedagogie.notes_evaluations (id_eleve = id_user direct, libelle_matiere)
 *   - pedagogie.matieres (id_matiere UUID, libelle_matiere, coefficient)
 * À ajouter à la fin de eleveController.js
 * Route : GET /api/eleves/moyennes-avancees?trimestre=1
 * ================================================================
 */

// Au tout début de eleveController.js, ajouter :
// const engine = require('./moyennesEngine'); // ajuste le chemin selon ton arbo

exports.getMoyennesAvancees = async (req, res) => {
  try {
    const eleveId = req.user?.id;
    if (!eleveId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const engine = require('./moyennesEngine'); // adapte le chemin

    // 1. Récupérer la classe de l'élève
    const classeRes = await db.query(
      `SELECT pe.classe_actuelle, c.nom, c.prenom, c.code_unique
       FROM vie_scolaire.profils_eleves pe
       JOIN authentification.comptes c ON c.id_user = pe.id_user
       WHERE pe.id_user = $1`, [eleveId]
    );
    if (!classeRes.rows.length)
      return res.status(404).json({ success: false, message: 'Profil introuvable' });

    const { classe_actuelle, nom, prenom, code_unique } = classeRes.rows[0];

    // 2. Migration auto — ajouter type_evaluation si absent
    await db.query(`
      ALTER TABLE pedagogie.notes_evaluations
      ADD COLUMN IF NOT EXISTS type_evaluation VARCHAR(20) DEFAULT 'DEVOIR'
    `).catch(() => {});

    // 3. Récupérer toutes les notes (tous trimestres)
    //    ATTENTION : libelle_matiere dans pedagogie.matieres (pas nom_matiere)
    const notesRes = await db.query(`
      SELECT
        n.note,
        n.trimestre,
        COALESCE(n.type_evaluation, 'DEVOIR')        AS type_evaluation,
        COALESCE(n.date_evaluation::text, NOW()::text) AS date_evaluation,
        COALESCE(m.libelle_matiere, 'Matière inconnue') AS nom_matiere,
        COALESCE(m.coefficient, 1)                   AS coefficient
      FROM pedagogie.notes_evaluations n
      LEFT JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
      WHERE n.id_eleve = $1
      ORDER BY n.trimestre, n.date_evaluation
    `, [eleveId]);

    const toutesNotes = notesRes.rows;

    // 4. Filtrer par trimestre si demandé
    const trimestreDemande = req.query.trimestre ? parseInt(req.query.trimestre) : null;
    const notesFiltrees = trimestreDemande
      ? toutesNotes.filter(n => parseInt(n.trimestre) === trimestreDemande)
      : toutesNotes;

    // 5. Grouper par matière
    const parMatiere = {};
    for (const n of notesFiltrees) {
      if (!parMatiere[n.nom_matiere]) parMatiere[n.nom_matiere] = [];
      parMatiere[n.nom_matiere].push(n);
    }
    const notesParMatiere = Object.entries(parMatiere)
      .map(([nom_matiere, notes]) => ({ nom_matiere, notes }));

    // 6. Calcul principal via le moteur BF
    const resultat = engine.calculerMoyenneGenerale(classe_actuelle, notesParMatiere);

    // 7. Évolution trimestrielle
    const evolution = engine.calculerEvolution(toutesNotes, classe_actuelle);

    // 8. Analyse prédictive
    const mg = resultat.moyenne_generale;
    const coefsTotaux = resultat.total_coefs;
    const predictif = {
      pour_avoir_10:  engine.noteMinimalePourCible(mg, coefsTotaux, 2, 10),
      pour_avoir_12:  engine.noteMinimalePourCible(mg, coefsTotaux, 2, 12),
      pour_avoir_14:  engine.noteMinimalePourCible(mg, coefsTotaux, 2, 14),
      pour_maintenir: mg ? engine.noteMinimalePourCible(mg, coefsTotaux, 2, mg) : null,
    };

    // 9. Alertes baisses de régime
    const alertes = engine.detecterBaisses(evolution);

    // 10. Courbe chronologique (note par note)
    const courbeChronologique = notesFiltrees.map((n, i) => ({
      index: i + 1,
      note: parseFloat(n.note),
      matiere: n.nom_matiere,
      type: n.type_evaluation,
      trimestre: n.trimestre,
      date: n.date_evaluation,
    }));

    // 11. Stats rapides
    const matieresSorted = resultat.detail_matieres
      .filter(m => m.moyenne !== null)
      .sort((a, b) => b.moyenne - a.moyenne);

    res.json({
      success: true,
      eleve: { nom: `${prenom} ${nom}`, code_unique, classe: classe_actuelle },
      trimestre: trimestreDemande || 'tous',
      moyenne_generale:      resultat.moyenne_generale,
      mention:               resultat.mention,
      admis:                 resultat.admis,
      detail_matieres:       resultat.detail_matieres,
      programme_officiel:    engine.getProgramme(classe_actuelle),
      evolution_trimestrielle: evolution,
      courbe_chronologique:  courbeChronologique,
      predictif,
      alertes_baisses:       alertes,
      stats: {
        nb_notes_total:       toutesNotes.length,
        nb_notes_trimestre:   notesFiltrees.length,
        meilleure_matiere:    matieresSorted[0] || null,
        matiere_en_difficulte: resultat.detail_matieres
          .filter(m => m.moyenne !== null && m.moyenne < 10)
          .sort((a, b) => a.moyenne - b.moyenne)[0] || null,
      }
    });

  } catch (error) {
    console.error('getMoyennesAvancees:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
