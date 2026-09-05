-- ============================================================
-- NETTOYAGE - ABSENCES
-- ============================================================

-- 1. Archiver les vieilles absences (créer table d'archive)
CREATE TABLE IF NOT EXISTS gestion.absences_archive (LIKE gestion.absences INCLUDING ALL);
CREATE INDEX idx_absences_archive_date ON gestion.absences_archive(date_absence);

-- 2. Déplacer les absences de plus de 2 ans vers archive
WITH moved AS (
    DELETE FROM gestion.absences 
    WHERE date_absence < NOW() - INTERVAL '2 years'
    RETURNING *
)
INSERT INTO gestion.absences_archive SELECT * FROM moved;

-- 3. Compter ce qui a été archivé
SELECT COUNT(*) AS archivees FROM gestion.absences_archive 
WHERE date_absence < NOW() - INTERVAL '2 years';

-- 4. Supprimer définitivement les absences de plus de 3 ans (si archive OK)
DELETE FROM gestion.absences_archive 
WHERE date_absence < NOW() - INTERVAL '3 years';