-- ============================================================
-- VOIR LES NOTES
-- ============================================================
-- ⚠️ Il existe DEUX tables qui se ressemblent : pedagogie.notes
-- (vide, 0 ligne — jamais utilisée par l'appli) et
-- pedagogie.notes_evaluations (la vraie, utilisée partout dans le
-- code). Utilise toujours notes_evaluations.

SELECT
    e.code_unique, e.nom, e.prenom,
    m.nom_matiere, n.note, n.type_evaluation, n.trimestre, n.date_evaluation
FROM pedagogie.notes_evaluations n
JOIN authentification.comptes e ON e.id_user = n.id_eleve
LEFT JOIN pedagogie.matieres m ON m.id_matiere = n.id_matiere
ORDER BY n.date_evaluation DESC
LIMIT 50;

-- Notes d'un élève précis (remplace le nom)
SELECT m.nom_matiere, n.note, n.type_evaluation, n.trimestre
FROM pedagogie.notes_evaluations n
JOIN authentification.comptes e ON e.id_user = n.id_eleve
LEFT JOIN pedagogie.matieres m ON m.id_matiere = n.id_matiere
WHERE LOWER(e.nom) LIKE '%nom_a_chercher%'
ORDER BY n.trimestre, m.nom_matiere;

-- Moyenne par classe et par matière
SELECT pe.classe_actuelle, m.nom_matiere, ROUND(AVG(n.note), 2) AS moyenne
FROM pedagogie.notes_evaluations n
JOIN vie_scolaire.profils_eleves pe ON pe.id_user = n.id_eleve
LEFT JOIN pedagogie.matieres m ON m.id_matiere = n.id_matiere
GROUP BY pe.classe_actuelle, m.nom_matiere
ORDER BY pe.classe_actuelle, m.nom_matiere;
