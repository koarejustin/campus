-- ============================================================
-- ÉLÈVES - Liste complète
-- ============================================================

-- 1. Tous les élèves
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    c.email,
    c.telephone,
    pe.classe_actuelle AS classe,
    to_char(pe.date_naissance, 'DD/MM/YYYY') AS date_naissance,
    CASE 
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        WHEN c.mot_de_passe IS NULL THEN '⚪ Sans mot de passe'
        ELSE '🟢 Actif'
    END AS statut_compte,
    c.est_actif,
    to_char(c.date_creation, 'DD/MM/YYYY') AS date_inscription,
    to_char(c.derniere_connexion, 'DD/MM/YYYY HH24:MI') AS derniere_connexion,
    -- Statistiques académiques
    ROUND(AVG(n.note)::numeric, 2) AS moyenne_generale,
    COUNT(DISTINCT n.id_evaluation) AS nb_notes,
    (SELECT COUNT(*) FROM gestion.absences WHERE id_eleve = c.id_user) AS nb_absences,
    (SELECT COUNT(*) FROM gestion.absences WHERE id_eleve = c.id_user AND justifiee = false) AS absences_non_justifiees,
    (SELECT COUNT(*) FROM gestion.convocations WHERE id_eleve = c.id_user) AS nb_convocations
FROM authentification.comptes c
JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
LEFT JOIN pedagogie.notes_evaluations n ON c.id_user = n.id_eleve
WHERE c.role_actuel = 'ELEVE'
GROUP BY c.code_unique, c.nom, c.prenom, c.email, c.telephone, pe.classe_actuelle, pe.date_naissance, c.mot_de_passe, c.est_actif, c.date_creation, c.derniere_connexion
ORDER BY pe.classe_actuelle, c.nom, c.prenom;

-- 2. Élèves par classe
SELECT 
    pe.classe_actuelle AS classe,
    COUNT(*) AS effectif,
    SUM(CASE WHEN c.est_actif THEN 1 ELSE 0 END) AS actifs,
    SUM(CASE WHEN c.mot_de_passe = 'NON_ACTIVE' THEN 1 ELSE 0 END) AS a_activer,
    ROUND(AVG(n.note)::numeric, 2) AS moyenne_classe
FROM authentification.comptes c
JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
LEFT JOIN pedagogie.notes_evaluations n ON c.id_user = n.id_eleve AND n.trimestre = 1
WHERE c.role_actuel = 'ELEVE'
GROUP BY pe.classe_actuelle
ORDER BY pe.classe_actuelle;

-- 3. Un élève par classe (pour tests)
SELECT DISTINCT ON (pe.classe_actuelle)
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    pe.classe_actuelle AS classe,
    CASE WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴' ELSE '🟢' END AS statut
FROM authentification.comptes c
JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
WHERE c.role_actuel = 'ELEVE'
ORDER BY pe.classe_actuelle, c.nom;

-- 4. Élèves sans notes (à surveiller)
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    pe.classe_actuelle AS classe
FROM authentification.comptes c
JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
LEFT JOIN pedagogie.notes_evaluations n ON c.id_user = n.id_eleve
WHERE c.role_actuel = 'ELEVE'
  AND n.id_evaluation IS NULL
ORDER BY pe.classe_actuelle, c.nom;