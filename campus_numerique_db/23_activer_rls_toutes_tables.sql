-- =============================================================================
-- SCRIPT 23 : ACTIVER ROW LEVEL SECURITY SUR TOUTES LES TABLES
--
-- Alerte Supabase reçue le 08/09/2026 : "Table publicly accessible — Anyone
-- with your project URL can read, edit, and delete all data in this table
-- because Row-Level Security is not enabled." Vérifié : la quasi-totalité
-- des tables de l'appli (authentification.comptes compris — mots de passe
-- hachés, données personnelles élèves/parents) n'avait PAS RLS activé.
--
-- Ce que ça veut dire concrètement : n'importe qui connaissant l'URL du
-- projet Supabase (et sa clé publique "anon", souvent visible dans le code
-- front-end d'une appli qui utilise le SDK Supabase) pouvait lire/modifier/
-- supprimer directement ces tables via l'API REST automatique de Supabase,
-- en contournant complètement le serveur Node.js et ses vérifications.
--
-- ⚠️ Sans risque pour l'application : vérifié que le rôle de connexion
-- ("postgres", celui utilisé par DATABASE_URL) a l'attribut BYPASSRLS —
-- l'appli continue de fonctionner exactement pareil. Cette activation
-- bloque UNIQUEMENT l'accès public via l'API Supabase (anon/authenticated),
-- pas la connexion directe du serveur.
--
-- Aucune "policy" n'est créée ici volontairement : RLS activé sans policy
-- = accès refusé par défaut pour tout rôle autre que ceux qui contournent
-- RLS. C'est exactement le comportement voulu, puisque personne ne doit
-- accéder à ces tables autrement que via le serveur Node.js.
-- =============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname IN ('authentification','vie_scolaire','pedagogie','gestion','gestion_ape')
          AND rowsecurity = false
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Vérification — doit renvoyer 0
SELECT COUNT(*) AS tables_encore_sans_rls
FROM pg_tables
WHERE schemaname IN ('authentification','vie_scolaire','pedagogie','gestion','gestion_ape')
  AND rowsecurity = false;
