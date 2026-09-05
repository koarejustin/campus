-- ============================================================
-- DIAGNOSTIC - LOGS D'AUDIT
-- ============================================================

-- 1. Voir la taille de la table d'audit
SELECT 
    pg_size_pretty(pg_total_relation_size('gestion.audit_logs')) AS taille_totale,
    COUNT(*) AS nb_logs
FROM gestion.audit_logs;

-- 2. Dernières modifications
SELECT 
    created_at,
    id_user,
    action,
    table_name,
    record_id,
    nouvelles_valeurs
FROM gestion.audit_logs
ORDER BY created_at DESC
LIMIT 20;

-- 3. Modifications par utilisateur
SELECT 
    c.code_unique,
    c.nom,
    c.prenom,
    COUNT(*) AS nb_modifications
FROM gestion.audit_logs a
LEFT JOIN authentification.comptes c ON a.id_user = c.id_user
GROUP BY c.code_unique, c.nom, c.prenom
ORDER BY nb_modifications DESC;