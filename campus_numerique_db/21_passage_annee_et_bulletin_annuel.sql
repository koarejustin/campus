-- ============================================================
-- SCRIPT 21 : Passage d'année scolaire + compléments bulletin
-- (moyenne/rang annuels, mentions d'honneur, sexe/lieu de
-- naissance, année scolaire active, historique de scolarité).
-- ============================================================

-- 1. Compléments identité élève, pour le bulletin
ALTER TABLE vie_scolaire.profils_eleves
    ADD COLUMN IF NOT EXISTS sexe CHAR(1) CHECK (sexe IN ('M', 'F')),
    ADD COLUMN IF NOT EXISTS lieu_naissance VARCHAR(100);

-- 2. statut_scolaire existait déjà mais n'était utilisé nulle part —
-- on lui donne enfin un sens : INSCRIT (par défaut) / REDOUBLANT /
-- DIPLOME / PARTI. Les lignes existantes sans valeur deviennent INSCRIT.
UPDATE vie_scolaire.profils_eleves SET statut_scolaire = 'INSCRIT' WHERE statut_scolaire IS NULL;
ALTER TABLE vie_scolaire.profils_eleves ALTER COLUMN statut_scolaire SET DEFAULT 'INSCRIT';

-- 3. Année scolaire active + seuils des mentions d'honneur
ALTER TABLE gestion.configuration
    ADD COLUMN IF NOT EXISTS annee_scolaire_active VARCHAR(9) NOT NULL DEFAULT '2025-2026',
    ADD COLUMN IF NOT EXISTS seuil_felicitations NUMERIC(4,2) NOT NULL DEFAULT 16,
    ADD COLUMN IF NOT EXISTS seuil_encouragement NUMERIC(4,2) NOT NULL DEFAULT 14,
    ADD COLUMN IF NOT EXISTS seuil_tableau_honneur NUMERIC(4,2) NOT NULL DEFAULT 12;

-- 4. Historique de scolarité — trace chaque décision de fin d'année
-- (promu / redouble / diplômé / parti), pour garder un audit même
-- après que classe_actuelle ait changé.
CREATE TABLE IF NOT EXISTS vie_scolaire.historique_scolarite (
    id_historique SERIAL PRIMARY KEY,
    id_eleve UUID NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    annee_scolaire VARCHAR(9) NOT NULL,
    classe_depart VARCHAR(20) NOT NULL,
    classe_arrivee VARCHAR(20),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('PROMU', 'REDOUBLE', 'DIPLOME', 'PARTI')),
    moyenne_annuelle NUMERIC(5,2),
    decide_par UUID REFERENCES authentification.comptes(id_user),
    date_decision TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_histo_scolarite_eleve ON vie_scolaire.historique_scolarite(id_eleve);
