-- Réassigne la note de Maths (id_evaluation=17, 19.50, Tatiana VASSEUR)
-- vers Marie KABORE, la vraie enseignante de Mathématiques en Tle D
UPDATE pedagogie.notes_evaluations
SET id_professeur = (
    SELECT c.id_user FROM authentification.comptes c WHERE c.code_unique = 'PROF-2026-001'
)
WHERE id_evaluation = 17;

-- Vérification
SELECT n.id_evaluation, n.note, m.nom_matiere, c.nom AS prof_nom, c.prenom AS prof_prenom
FROM pedagogie.notes_evaluations n
JOIN authentification.comptes c ON c.id_user = n.id_professeur
LEFT JOIN pedagogie.matieres m ON m.id_matiere = n.id_matiere
WHERE n.id_evaluation = 17;
