-- ============================================================
-- NETTOYAGE - CONVOCATIONS
-- ============================================================

-- 1. Supprimer les convocations passées de plus de 6 mois
DELETE FROM gestion.convocations 
WHERE date_convocation < NOW() - INTERVAL '6 months';

-- 2. Archiver avant suppression
CREATE TABLE IF NOT EXISTS gestion.convocations_archive (LIKE gestion.convocations);
INSERT INTO gestion.convocations_archive 
SELECT * FROM gestion.convocations 
WHERE date_convocation < NOW() - INTERVAL '6 months';

DELETE FROM gestion.convocations 
WHERE date_convocation < NOW() - INTERVAL '6 months';

-- 3. Vider toutes les convocations (urgence)
BEGIN;
SELECT COUNT(*) FROM gestion.convocations;
DELETE FROM gestion.convocations;
COMMIT;