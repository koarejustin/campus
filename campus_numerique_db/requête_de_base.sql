-- ============================================================
-- VUE D'ENSEMBLE DE LA BASE
-- ============================================================

-- 1. Lister tous les schémas et leurs tables
SELECT 
    table_schema, 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as nb_colonnes
FROM information_schema.tables t
WHERE table_schema IN ('authentification', 'vie_scolaire', 'pedagogie', 'gestion_ape', 'gestion')
ORDER BY table_schema, table_name;

-- 2. Voir la structure détaillée d'une table
\d authentification.comptes
-- ou
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'authentification' AND table_name = 'comptes'
ORDER BY ordinal_position;