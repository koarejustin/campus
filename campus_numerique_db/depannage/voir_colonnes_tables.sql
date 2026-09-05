-- ================================================================
-- SCRIPT DIAGNOSTIC — Lister TOUTES les colonnes des tables utilisées
-- Coller ce résultat dans le chat pour que je puisse corriger le code
-- ================================================================

SELECT '=== vie_scolaire.profils_eleves ===' AS table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'vie_scolaire' AND table_name = 'profils_eleves'
ORDER BY ordinal_position;

SELECT '=== pedagogie.profils_profs ===' AS table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'pedagogie' AND table_name = 'profils_profs'
ORDER BY ordinal_position;

SELECT '=== authentification.comptes ===' AS table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'authentification' AND table_name = 'comptes'
ORDER BY ordinal_position;

SELECT '=== pedagogie.ressources_pedagogiques ===' AS table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'pedagogie' AND table_name = 'ressources_pedagogiques'
ORDER BY ordinal_position;

SELECT '=== pedagogie.notes_evaluations ===' AS table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'pedagogie' AND table_name = 'notes_evaluations'
ORDER BY ordinal_position;

SELECT '=== pedagogie.matieres ===' AS table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'pedagogie' AND table_name = 'matieres'
ORDER BY ordinal_position;

SELECT '=== gestion.absences ===' AS table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'gestion' AND table_name = 'absences'
ORDER BY ordinal_position;

SELECT '=== gestion.convocations ===' AS table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'gestion' AND table_name = 'convocations'
ORDER BY ordinal_position;

SELECT '=== gestion.annonces_officielles ===' AS table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'gestion' AND table_name = 'annonces_officielles'
ORDER BY ordinal_position;

SELECT '=== gestion.activites ===' AS table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'gestion' AND table_name = 'activites'
ORDER BY ordinal_position;
