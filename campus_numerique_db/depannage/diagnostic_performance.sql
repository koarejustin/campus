-- ============================================================
-- DIAGNOSTIC - PERFORMANCE
-- ============================================================

-- 1. Voir les requêtes lentes (nécessite pg_stat_statements)
-- Activer l'extension si besoin : CREATE EXTENSION pg_stat_statements;

SELECT 
    query,
    calls,
    total_time / 1000 AS total_seconds,
    mean_time AS mean_ms,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- 2. Voir les tables les plus grosses
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS taille_totale,
    n_live_tup AS lignes_estimées
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- 3. Voir les index inutilisés (nécessite pg_stat_user_indexes)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS nb_utilisations,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS taille
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexname::regclass) DESC;