-- =============================================================================
-- SCRIPT 08 : PEDAGOGIE, NOTES ET BULLETINS (VERSION FINALE)
-- =============================================================================

-- 1. Table des Matieres
CREATE TABLE IF NOT EXISTS pedagogie.matieres (
    id_matiere SERIAL PRIMARY KEY,
    nom_matiere VARCHAR(100) UNIQUE NOT NULL,
    coefficient INT DEFAULT 1
);

-- 2. Table des Notes (Le coeur du suivi)
CREATE TABLE IF NOT EXISTS pedagogie.notes (
    id_note SERIAL PRIMARY KEY,
    id_eleve UUID REFERENCES vie_scolaire.profils_eleves(id_eleve) ON DELETE CASCADE,
    id_prof UUID REFERENCES pedagogie.profils_profs(id_prof),
    id_matiere INT REFERENCES pedagogie.matieres(id_matiere),
    valeur_note NUMERIC(4,2) CHECK (valeur_note >= 0 AND valeur_note <= 20),
    trimestre INT CHECK (trimestre BETWEEN 1 AND 3),
    annee_scolaire VARCHAR(20),
    
    -- Etat de validation (Securite direction)
    est_validee_par_direction BOOLEAN DEFAULT FALSE,
    date_saisie TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_validation TIMESTAMP
);

-- 3. Espace Orientation Collaborative
-- Centralise les conseils des Profs, Parents et Alumni
CREATE TABLE IF NOT EXISTS pedagogie.conseils_orientation (
    id_conseil SERIAL PRIMARY KEY,
    id_eleve UUID REFERENCES vie_scolaire.profils_eleves(id_eleve),
    id_auteur UUID REFERENCES authentification.comptes(id_user), 
    contenu_conseil TEXT NOT NULL,
    filiere_suggeree VARCHAR(100), 
    date_conseil TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour accelerer l'affichage des bulletins
CREATE INDEX IF NOT EXISTS idx_notes_eleve ON pedagogie.notes(id_eleve);
CREATE INDEX IF NOT EXISTS idx_orientation_eleve ON pedagogie.conseils_orientation(id_eleve);

-- Commentaires officiels
COMMENT ON TABLE pedagogie.notes IS 'Table centrale des performances academiques.';
COMMENT ON COLUMN pedagogie.notes.est_validee_par_direction IS 'Si FALSE, la note est masquee sur le bulletin des parents.';