-- ================================================================
-- ALUMNI - ORIENTATIONS LITTÉRATURE/SCIENCE
-- ================================================================
-- Ajoute une table pour tracer les orientations conseillées par les alumni
-- aux élèves qu'ils mentorés

ALTER TABLE gestion_ape.relations_mentorat 
ADD COLUMN IF NOT EXISTS orientation_suggeree VARCHAR(20),
ADD COLUMN IF NOT EXISTS date_orientation_suggeree TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS justification_orientation TEXT;

-- Index pour rechercher facilement les élèves orientés
CREATE INDEX IF NOT EXISTS idx_mentorat_orientation ON gestion_ape.relations_mentorat(orientation_suggeree);

-- Ajouter des contraintes
ALTER TABLE gestion_ape.relations_mentorat 
ADD CONSTRAINT check_orientation CHECK (
    orientation_suggeree IS NULL 
    OR orientation_suggeree IN ('Littérature', 'Science', 'Indécis')
);

COMMENT ON COLUMN gestion_ape.relations_mentorat.orientation_suggeree IS 'Orientation conseillée: Littérature, Science, ou Indécis';
COMMENT ON COLUMN gestion_ape.relations_mentorat.justification_orientation IS 'Justification de l''orientation conseillée';
