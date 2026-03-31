-- ============================================================
-- DIAGNOSTIC - CONNEXIONS
-- ============================================================

-- 1. Voir les connexions actives
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query,
    state_change
FROM pg_stat_activity
WHERE datname = 'campus_numerique_db'
  AND state = 'active'
ORDER BY state_change DESC;

-- 2. Tuer une connexion bloquée
-- SELECT pg_terminate_backend(pid);

-- 3. Voir les locks
SELECT 
    l.locktype,
    l.relation::regclass,
    l.mode,
    l.granted,
    a.usename,
    a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation IS NOT NULL
ORDER BY l.granted;