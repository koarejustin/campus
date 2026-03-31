-- ================================================================
-- SCRIPT 9 — TABLE RESSOURCES PÉDAGOGIQUES
-- À exécuter dans psql ou pgAdmin sur campus_numerique_db
-- ================================================================

-- Création de la table
CREATE TABLE IF NOT EXISTS pedagogie.ressources_pedagogiques (
    id_ressource    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    id_professeur   UUID         NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    id_matiere      UUID         REFERENCES pedagogie.matieres(id_matiere),
    titre           VARCHAR(255) NOT NULL,
    description     TEXT,
    type_ressource  VARCHAR(50)  NOT NULL DEFAULT 'COURS'
                    CHECK (type_ressource IN ('COURS','TD','CORRECTION','VIDEO','AUTRE')),
    classe_cible    VARCHAR(30)  NOT NULL DEFAULT 'TOUTES',
    trimestre       SMALLINT     CHECK (trimestre IN (1,2,3)),
    url_fichier     TEXT,
    nom_fichier_original TEXT,
    taille_fichier  BIGINT,
    est_visible     BOOLEAN      NOT NULL DEFAULT true,
    date_ajout      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les lectures fréquentes
CREATE INDEX IF NOT EXISTS idx_ressources_prof    ON pedagogie.ressources_pedagogiques(id_professeur);
CREATE INDEX IF NOT EXISTS idx_ressources_classe  ON pedagogie.ressources_pedagogiques(classe_cible);
CREATE INDEX IF NOT EXISTS idx_ressources_visible ON pedagogie.ressources_pedagogiques(est_visible);

-- Vérification
SELECT 'Table pedagogie.ressources_pedagogiques créée avec succès ✅' AS statut;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'pedagogie' AND table_name = 'ressources_pedagogiques'
ORDER BY ordinal_position;
