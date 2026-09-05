-- =============================================================================
-- SCRIPT 16B : MIGRATION - Ajout des colonnes manquantes pour Coefficients
-- =============================================================================

-- 1. Ajouter colonne domaine à pedagogie.matieres
ALTER TABLE pedagogie.matieres
    ADD COLUMN IF NOT EXISTS domaine VARCHAR(100),
    ADD COLUMN IF NOT EXISTS specialites_concernees VARCHAR(255) DEFAULT 'TOUS';

-- 2. Créer table coefficients_par_classe si absente
CREATE TABLE IF NOT EXISTS pedagogie.coefficients_par_classe (
    id_coeff SERIAL PRIMARY KEY,
    classe VARCHAR(20) NOT NULL, -- 'SIXIEME', 'CINQUIEME', 'SECONDE', etc.
    serie VARCHAR(10) NOT NULL DEFAULT 'GENERAL', -- 'A4', 'D', 'C', 'GENERAL'
    matiere_id UUID NOT NULL REFERENCES pedagogie.matieres(id_matiere) ON DELETE CASCADE,
    coefficient_corrige SMALLINT NOT NULL DEFAULT 1,
    type_note VARCHAR(50) DEFAULT 'EVALUATION_CONTINUE', -- 'EVALUATION_CONTINUE' ou 'COMPOSITION'
    date_creation TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(classe, serie, matiere_id)
);

CREATE INDEX IF NOT EXISTS idx_coeff_classe ON pedagogie.coefficients_par_classe(classe);
CREATE INDEX IF NOT EXISTS idx_coeff_serie ON pedagogie.coefficients_par_classe(serie);
CREATE INDEX IF NOT EXISTS idx_coeff_matiere ON pedagogie.coefficients_par_classe(matiere_id);

-- 3. Ajouter colonnes à notes_evaluations pour type et classe
ALTER TABLE pedagogie.notes_evaluations
    ADD COLUMN IF NOT EXISTS type_evaluation VARCHAR(50) DEFAULT 'DEVOIR',
    ADD COLUMN IF NOT EXISTS classe_eleve VARCHAR(20),
    ADD COLUMN IF NOT EXISTS serie_eleve VARCHAR(10) DEFAULT 'GENERAL';

-- 4. Table pour historique des moyennes
CREATE TABLE IF NOT EXISTS pedagogie.historique_moyennes (
    id_historique SERIAL PRIMARY KEY,
    id_eleve UUID NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    classe VARCHAR(20),
    serie VARCHAR(10),
    trimestre SMALLINT CHECK (trimestre IN (1, 2, 3)),
    annee_scolaire VARCHAR(9),
    moyenne_generale NUMERIC(5,2),
    moyenne_par_matiere JSONB, -- Format: {"Français": 15.5, "Maths": 12}
    date_calcul TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_eleve, classe, serie, trimestre, annee_scolaire)
);

CREATE INDEX IF NOT EXISTS idx_historique_eleve ON pedagogie.historique_moyennes(id_eleve);

-- 5. Mettre à jour les matieres existantes avec domaine
UPDATE pedagogie.matieres SET domaine = 'Lettres et Sciences Humaines'
    WHERE libelle_matiere IN ('Français', 'Anglais', 'Histoire-Géographie', 'Philosophie', 'Économie');

UPDATE pedagogie.matieres SET domaine = 'Sciences Exactes'
    WHERE libelle_matiere IN ('Mathématiques', 'Sciences de la Vie', 'Physique-Chimie');

UPDATE pedagogie.matieres SET domaine = 'Disciplines Transversales'
    WHERE libelle_matiere IN ('Éducation Physique', 'Arts Plastiques', 'Musique');

-- 6. Verification
SELECT COUNT(*) as matieres_total FROM pedagogie.matieres;
SELECT COUNT(*) as colonnes_coeff FROM pedagogie.coefficients_par_classe;
