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

-- 2. Voir TOUTES tes ressources (même invisibles)
SELECT 
    id_ressource,
    titre,
    COALESCE(type_ressource, type_document) AS type,
    COALESCE(classe_cible, classe_concernee) AS classe,
    est_visible,
    COALESCE(id_professeur, id_prof) AS id_prof,
    COALESCE(date_ajout, date_depot) AS date
FROM pedagogie.ressources_pedagogiques
ORDER BY COALESCE(date_ajout, date_depot) DESC;

-- 3. Vérifier les notes de Tatiana
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
WHERE LOWER(c.nom) LIKE '%vasseur%' OR LOWER(c.prenom) LIKE '%tatiana%'
ORDER BY n.trimestre, n.date_evaluation;

-- 4. Vérifier les matières en base
SELECT id_matiere, nom_matiere, coefficient FROM pedagogie.matieres ORDER BY nom_matiere;



SELECT id_ressource, titre, type_document, classe_concernee, est_visible, id_prof, date_depot
FROM pedagogie.ressources_pedagogiques
ORDER BY date_depot DESC;
