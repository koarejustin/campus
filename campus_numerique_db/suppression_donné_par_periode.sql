-- ============================================================
-- NETTOYAGE - PAR PÉRIODE
-- ============================================================

-- 1. Supprimer les absences de plus de 2 ans (archivées)
DELETE FROM gestion.absences 
WHERE date_absence < NOW() - INTERVAL '2 years';

-- 2. Supprimer les convocations de plus de 1 an (passées)
DELETE FROM gestion.convocations 
WHERE date_convocation < NOW() - INTERVAL '1 year';

-- 3. Supprimer les notifications de plus de 3 mois (lues)
DELETE FROM gestion.notifications 
WHERE (est_lu = true OR lue = true)
  AND created_at < NOW() - INTERVAL '3 months';

-- 4. Supprimer les logs d'audit de plus de 1 an
DELETE FROM gestion.audit_logs 
WHERE created_at < NOW() - INTERVAL '1 year';