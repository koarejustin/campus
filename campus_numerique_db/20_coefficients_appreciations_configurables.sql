-- ============================================================
-- SCRIPT 20 : Coefficients configurables, appréciations profs,
-- pondération devoirs/composition et seuils de mention.
--
-- Avant ce script, tout ça vivait codé en dur dans
-- services/moyennesEngine.js (objet PROGRAMMES) — remplacé
-- pour être éditable par la Direction sans toucher au code.
-- ============================================================

-- 1. Coefficients par classe × matière (remplace l'objet PROGRAMMES)
CREATE TABLE IF NOT EXISTS pedagogie.coefficients (
    id_coefficient SERIAL PRIMARY KEY,
    classe VARCHAR(20) NOT NULL,
    nom_matiere VARCHAR(100) NOT NULL,
    coefficient SMALLINT NOT NULL DEFAULT 1,
    domaine VARCHAR(50),
    optionnel BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES authentification.comptes(id_user),
    UNIQUE(classe, nom_matiere)
);

-- 2. Appréciation du professeur — une par élève × matière × trimestre,
-- distincte des notes (pedagogie.notes_evaluations peut contenir
-- plusieurs notes pour le même trimestre, l'appréciation est unique).
CREATE TABLE IF NOT EXISTS pedagogie.appreciations (
    id_appreciation SERIAL PRIMARY KEY,
    id_eleve UUID NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    id_professeur UUID REFERENCES authentification.comptes(id_user),
    id_matiere INTEGER NOT NULL REFERENCES pedagogie.matieres(id_matiere) ON DELETE CASCADE,
    trimestre SMALLINT NOT NULL CHECK (trimestre IN (1, 2, 3)),
    annee_scolaire VARCHAR(9) NOT NULL DEFAULT '2025-2026',
    texte TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_eleve, id_matiere, trimestre, annee_scolaire)
);

CREATE INDEX IF NOT EXISTS idx_appreciations_eleve ON pedagogie.appreciations(id_eleve, trimestre, annee_scolaire);

-- 3. Pondération devoirs/composition + seuils de mention, sur la table
-- de configuration existante (une seule ligne = un seul établissement).
ALTER TABLE gestion.configuration
    ADD COLUMN IF NOT EXISTS poids_devoirs NUMERIC(3,2) NOT NULL DEFAULT 0.4,
    ADD COLUMN IF NOT EXISTS poids_composition NUMERIC(3,2) NOT NULL DEFAULT 0.6,
    ADD COLUMN IF NOT EXISTS seuil_tres_bien NUMERIC(4,2) NOT NULL DEFAULT 16,
    ADD COLUMN IF NOT EXISTS seuil_bien NUMERIC(4,2) NOT NULL DEFAULT 14,
    ADD COLUMN IF NOT EXISTS seuil_assez_bien NUMERIC(4,2) NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS seuil_passable NUMERIC(4,2) NOT NULL DEFAULT 10;
