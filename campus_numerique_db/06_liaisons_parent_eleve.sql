-- =============================================================================
-- SCRIPT 06 : VERSION CORRIGÉE (SANS ACCENTS TECHNIQUES)
-- =============================================================================

-- 1. On nettoie si jamais une partie a été créée
DROP TABLE IF EXISTS gestion_ape.liens_familiaux;
DROP TABLE IF EXISTS gestion_ape.profils_tuteurs;
DROP TYPE IF EXISTS type_parente;

-- 2. Création du type sans accents (plus sûr pour le système)
CREATE TYPE type_parente AS ENUM (
    'PERE', 
    'MERE', 
    'TUTEUR_LEGAL', 
    'GRAND_FRERE', 
    'GRANDE_SOEUR', 
    'ONCLE_TANTE'
);

-- 3. Table des Responsables
CREATE TABLE gestion_ape.profils_tuteurs (
    id_tuteur UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    lien_parente type_parente NOT NULL, 
    profession VARCHAR(255),
    est_membre_bureau_ape BOOLEAN DEFAULT FALSE
);

-- 4. Table de liaison avec l'élève
CREATE TABLE gestion_ape.liens_familiaux (
    id_lien SERIAL PRIMARY KEY,
    id_tuteur UUID REFERENCES gestion_ape.profils_tuteurs(id_tuteur) ON DELETE CASCADE,
    id_eleve UUID REFERENCES vie_scolaire.profils_eleves(id_eleve) ON DELETE CASCADE,
    justificatif_legal TEXT, 
    date_validation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN gestion_ape.liens_familiaux.justificatif_legal IS 'Preuve physique fournie au lycee pour valider le tutorat.';