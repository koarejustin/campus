-- ============================================================
-- VOIR TOUS LES SCHÉMAS ET TOUTES LES TABLES (l'architecture complète)
-- ============================================================

-- 1. Liste des schémas (les "dossiers" de la base)
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY 1;

-- 2. Toutes les tables, groupées par schéma
-- (ignore auth/storage/realtime/vault/graphql/pgbouncer/extensions/public :
--  ce sont les schémas internes de Supabase, pas les tiens)
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('authentification', 'pedagogie', 'vie_scolaire', 'gestion', 'gestion_ape')
ORDER BY table_schema, table_name;

-- 3. Structure d'UNE table précise (remplace les valeurs)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'pedagogie' AND table_name = 'devoirs'
ORDER BY ordinal_position;

-- 4. Combien de lignes dans chaque table d'un schéma (repérer vite où sont les données)
SELECT relname AS table_name, n_live_tup AS nb_lignes
FROM pg_stat_user_tables
WHERE schemaname = 'pedagogie'
ORDER BY n_live_tup DESC;
