-- ⚠️ ATTENTION : Supprime TOUTES les absences
BEGIN;
SELECT COUNT(*) AS nb_a_supprimer FROM gestion.absences;
DELETE FROM gestion.absences;
COMMIT;
-- Vérifier
SELECT COUNT(*) AS restant FROM gestion.absences;