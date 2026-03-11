-- ================================================================
-- DIAGNOSTIC COMPLET — Toutes les vraies colonnes
-- Exécute ce script et colle le résultat complet
-- ================================================================

\echo '=== authentification.comptes ==='
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='authentification' AND table_name='comptes' ORDER BY ordinal_position;

\echo '=== vie_scolaire.profils_eleves ==='
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='vie_scolaire' AND table_name='profils_eleves' ORDER BY ordinal_position;

\echo '=== pedagogie.matieres ==='
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='pedagogie' AND table_name='matieres' ORDER BY ordinal_position;

\echo '=== pedagogie.notes_evaluations ==='
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='pedagogie' AND table_name='notes_evaluations' ORDER BY ordinal_position;

\echo '=== pedagogie.ressources_pedagogiques ==='
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='pedagogie' AND table_name='ressources_pedagogiques' ORDER BY ordinal_position;

\echo '=== gestion — TOUTES les tables ==='
SELECT table_name, column_name, data_type FROM information_schema.columns
WHERE table_schema='gestion' ORDER BY table_name, ordinal_position;

\echo '=== pedagogie.profils_profs (si existe) ==='
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='pedagogie' AND table_name='profils_profs' ORDER BY ordinal_position;
