-- ============================================================
-- DIAGNOSTIC - PERFORMANCE
-- ============================================================

-- 1. Voir les requêtes lentes (nécessite pg_stat_statements)
-- Activer l'extension si besoin : CREATE EXTENSION pg_stat_statements;

-- ⚠️ Depuis PostgreSQL 13, pg_stat_statements a renommé total_time en
-- total_exec_time et mean_time en mean_exec_time.
SELECT
    query,
    calls,
    total_exec_time / 1000 AS total_seconds,
    mean_exec_time AS mean_ms,
    rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Voir les tables les plus grosses
-- ⚠️ pg_stat_user_tables utilise "relname", pas "tablename" (contrairement
-- à pg_indexes/information_schema.tables qui utilisent bien "tablename").
SELECT
    schemaname,
    relname AS tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS taille_totale,
    n_live_tup AS lignes_estimées
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
LIMIT 10;

-- 3. Voir les index inutilisés
-- ⚠️ pg_stat_user_indexes utilise "relname" (table) et "indexrelname" (index).
SELECT
    schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan AS nb_utilisations,
    pg_size_pretty(pg_relation_size(indexrelname::regclass)) AS taille
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelname::regclass) DESC;