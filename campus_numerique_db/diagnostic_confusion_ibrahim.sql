-- 1. Profil déclaré d'Ibrahim TRAORE (matières officiellement assignées)
SELECT c.code_unique, c.nom, c.prenom, pp.specialite, pp.matieres, pp.classes
FROM authentification.comptes c
JOIN pedagogie.profils_profs pp ON pp.id_user = c.id_user
WHERE c.nom ILIKE '%TRAORE%' AND c.prenom ILIKE '%Ibrahim%';

-- 2. Toutes les notes qu'il a réellement saisies (et dans quelle matière)
SELECT n.id_evaluation, n.trimestre, n.type_evaluation, n.note, n.date_evaluation,
       m.nom_matiere, ce.nom AS eleve_nom, ce.prenom AS eleve_prenom, pe.classe_actuelle
FROM pedagogie.notes_evaluations n
JOIN authentification.comptes c ON c.id_user = n.id_professeur
JOIN authentification.comptes ce ON ce.id_user = n.id_eleve
JOIN vie_scolaire.profils_eleves pe ON pe.id_user = n.id_eleve
LEFT JOIN pedagogie.matieres m ON m.id_matiere = n.id_matiere
WHERE c.nom ILIKE '%TRAORE%' AND c.prenom ILIKE '%Ibrahim%'
ORDER BY n.date_evaluation;

-- 3. Qui d'autre enseigne les Mathématiques en Tle D (pour savoir à qui
--    cette note de 19.50 devrait vraiment appartenir)
SELECT c.code_unique, c.nom, c.prenom, pp.matieres, pp.classes
FROM authentification.comptes c
JOIN pedagogie.profils_profs pp ON pp.id_user = c.id_user
WHERE c.role_actuel = 'PROFESSEUR'
  AND ('Mathématiques' = ANY(pp.matieres) OR 'Tle D' = ANY(pp.classes));
