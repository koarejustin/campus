-- ============================================================
-- NETTOYAGE - LOGS D'AUDIT
-- ============================================================

-- 1. Archiver les logs avant suppression
CREATE TABLE IF NOT EXISTS gestion.audit_logs_archive (LIKE gestion.audit_logs);

INSERT INTO gestion.audit_logs_archive 
SELECT * FROM gestion.audit_logs 
WHERE created_at < NOW() - INTERVAL '6 months';

-- 2. Supprimer les logs de plus de 6 mois
DELETE FROM gestion.audit_logs 
WHERE created_at < NOW() - INTERVAL '6 months';

-- 3. Supprimer les logs d'un utilisateur spécifique
DELETE FROM gestion.audit_logs 
WHERE id_user IN (
    SELECT id_user FROM authentification.comptes 
    WHERE code_unique = 'TEST-USER'
);

-- 4. Vider tous les logs (urgence)
TRUNCATE TABLE gestion.audit_logs;