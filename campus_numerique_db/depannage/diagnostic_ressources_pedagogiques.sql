-- ================================================================
-- DIAGNOSTIC — Vérifier tes données en base
-- Exécute ces requêtes une par une dans pgAdmin
-- ================================================================

-- 1. Vérifier la structure exacte de ta table ressources
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'pedagogie' 
  AND table_name = 'ressources_pedagogiques'
ORDER BY ordinal_position;

-- 2. Voir TOUTES les ressources (même invisibles)
-- ⚠️ Les noms "type_ressource", "classe_cible", "id_professeur",
-- "date_ajout" n'ont jamais existé dans cette table — seules les colonnes
-- ci-dessous sont réelles (vérifié via la requête 1 ci-dessus).
SELECT id_ressource, titre, type_document, classe_concernee, est_visible, id_prof, date_depot
FROM pedagogie.ressources_pedagogiques
ORDER BY date_depot DESC;

-- 3. Vérifier les notes d'un élève précis (remplace le nom/prénom)
SELECT
    n.id_evaluation,
    n.note,
    n.trimestre,
    n.type_evaluation,
    n.date_evaluation,
    m.nom_matiere,
    m.coefficient
FROM pedagogie.notes_evaluations n
JOIN authentification.comptes c ON c.id_user = n.id_eleve
LEFT JOIN pedagogie.matieres m ON m.id_matiere = n.id_matiere
WHERE LOWER(c.nom) LIKE '%nom_a_remplacer%' OR LOWER(c.prenom) LIKE '%prenom_a_remplacer%'
ORDER BY n.trimestre, n.date_evaluation;

-- 4. Vérifier les matières en base
SELECT id_matiere, nom_matiere, coefficient FROM pedagogie.matieres ORDER BY nom_matiere;
