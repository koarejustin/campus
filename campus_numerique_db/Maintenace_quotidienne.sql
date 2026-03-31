-- ============================================================
-- MAINTENANCE - ANALYSE ET VACUUM
-- ============================================================

-- 1. Analyser les statistiques des tables
ANALYZE;

-- 2. Analyser une table spécifique
ANALYZE pedagogie.notes_evaluations;

-- 3. Voir les tables ayant besoin de VACUUM
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) AS ratio_dead
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY ratio_dead DESC;

-- 4. VACUUM (nettoyage)
VACUUM VERBOSE;

-- 5. VACUUM FULL (compactage - verrouille la table)
VACUUM FULL VERBOSE pedagogie.notes_evaluations;

-- 6. REINDEX (reconstruire les index)
REINDEX DATABASE campus_numerique_db;