-- =============================================================================
-- SUPPRESSION DE L'EMPLOI DU TEMPS (toutes classes)
-- À exécuter toi-même dans Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- 1. Vérifie AVANT
SELECT classe, COUNT(*) AS nb_seances
FROM pedagogie.emploi_du_temps
GROUP BY classe
ORDER BY classe;

-- 2. Suppression
DELETE FROM pedagogie.emploi_du_temps;

-- 3. Vérifie APRÈS : doit renvoyer 0
SELECT COUNT(*) AS seances_restantes FROM pedagogie.emploi_du_temps;

COMMIT;
-- Si le résultat de l'étape 3 n'affiche pas 0, tape ROLLBACK; à la place.
