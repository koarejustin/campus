-- ================================================================
-- COUVERTURE DES MATIÈRES PAR CLASSE
-- À relancer à tout moment (notamment après ajout de vrais profs)
-- pour voir quelles matières n'ont encore aucun professeur assigné.
-- ================================================================

-- 1. Vue d'ensemble : pour chaque classe, la liste des matières
--    couvertes et par qui
SELECT
    classe,
    STRING_AGG(DISTINCT matiere || ' (' || prof || ')', ', ' ORDER BY matiere || ' (' || prof || ')') AS matieres_couvertes
FROM (
    SELECT
        UNNEST(pp.classes) AS classe,
        UNNEST(pp.matieres) AS matiere,
        c.prenom || ' ' || c.nom AS prof
    FROM pedagogie.profils_profs pp
    JOIN authentification.comptes c ON c.id_user = pp.id_user
    WHERE c.role_actuel = 'PROFESSEUR' AND c.est_actif = true
) t
GROUP BY classe
ORDER BY classe;

-- 2. Liste brute : une ligne par (classe, matière, prof) — utile pour
--    repérer une matière sans AUCUNE ligne pour une classe donnée
SELECT
    UNNEST(pp.classes) AS classe,
    UNNEST(pp.matieres) AS matiere,
    c.prenom || ' ' || c.nom AS prof
FROM pedagogie.profils_profs pp
JOIN authentification.comptes c ON c.id_user = pp.id_user
WHERE c.role_actuel = 'PROFESSEUR' AND c.est_actif = true
ORDER BY classe, matiere;
