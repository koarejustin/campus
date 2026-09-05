-- ================================================================
-- MIGRATION v2 — Système de moyennes avancées
-- Basée sur la vraie structure de campus_numerique_db
-- À exécuter UNE FOIS dans pgAdmin sur campus_numerique_db
-- ================================================================

-- 1. Ajouter type_evaluation sur notes_evaluations
ALTER TABLE pedagogie.notes_evaluations
  ADD COLUMN IF NOT EXISTS type_evaluation VARCHAR(20) DEFAULT 'DEVOIR'
  CHECK (type_evaluation IN ('DEVOIR','COMPO','COMPOSITION','RATTRAPAGE','EXAMEN'));

COMMENT ON COLUMN pedagogie.notes_evaluations.type_evaluation
  IS 'DEVOIR = contrôle continu | COMPO = composition trimestrielle';

-- 2. Index de performance
CREATE INDEX IF NOT EXISTS idx_notes_eleve_trimestre
  ON pedagogie.notes_evaluations (id_eleve, trimestre);

-- 3. Ajouter statut + accusé de réception sur convocations
ALTER TABLE gestion.convocations
  ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'ENVOYEE'
  CHECK (statut IN ('ENVOYEE','LU','VALIDE','ANNULEE')),
  ADD COLUMN IF NOT EXISTS date_accuse TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accuse_par UUID REFERENCES authentification.comptes(id_user);

-- 4. Vérification finale
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'pedagogie' AND table_name = 'notes_evaluations'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'gestion' AND table_name = 'convocations'
ORDER BY ordinal_position;
