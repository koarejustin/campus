-- ================================================================
-- CAMPUS NUMÉRIQUE FASO — TABLES POUR MENTORAT ET JOURNAL DE BORD
-- ================================================================
-- Ce script crée:
-- 1. Table de relation alumni-élève mentoré
-- 2. Table du journal de bord partagé (logbook)
-- 3. Indices de performance
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : Créer la table des relations de mentorat (alumni-élève)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gestion_ape.relations_mentorat (
    id_relation       SERIAL        PRIMARY KEY,
    id_alumni         UUID          NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    id_eleve          UUID          NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    date_debut        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_fin          TIMESTAMPTZ,
    statut            VARCHAR(20)   DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'terminé')),
    description       TEXT,
    domaines_assistance TEXT[],     -- [Académique, Orientation, Projet, Bien-être]
    -- Colonnes pour l'orientation Littérature/Science
    orientation_suggeree VARCHAR(20) CHECK (orientation_suggeree IN ('Littérature', 'Science', 'Indécis')),
    justification_orientation TEXT,
    date_orientation_suggeree TIMESTAMPTZ,
    UNIQUE(id_alumni, id_eleve)
);

CREATE INDEX IF NOT EXISTS idx_mentorat_alumni ON gestion_ape.relations_mentorat(id_alumni);
CREATE INDEX IF NOT EXISTS idx_mentorat_eleve ON gestion_ape.relations_mentorat(id_eleve);
CREATE INDEX IF NOT EXISTS idx_mentorat_statut ON gestion_ape.relations_mentorat(statut);

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Créer la table du journal de bord partagé
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gestion_ape.journal_de_bord (
    id_journal         BIGSERIAL     PRIMARY KEY,
    id_relation        INTEGER       NOT NULL REFERENCES gestion_ape.relations_mentorat(id_relation) ON DELETE CASCADE,
    id_auteur          UUID          NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    titre              VARCHAR(255)  NOT NULL,
    contenu            TEXT          NOT NULL,
    type_entree        VARCHAR(30)   DEFAULT 'note' CHECK (type_entree IN ('note', 'objectif', 'reflexion', 'feedback')),
    date_creation      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification  TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
    is_prive           BOOLEAN       DEFAULT FALSE,  -- Si TRUE, seul l'alumni peut voir
    fichier_joint      TEXT,         -- URL du fichier attaché si existe
    tags               TEXT[]        DEFAULT '{}' -- Pour catégoriser les entrées
);

CREATE INDEX IF NOT EXISTS idx_journal_relation ON gestion_ape.journal_de_bord(id_relation);
CREATE INDEX IF NOT EXISTS idx_journal_auteur ON gestion_ape.journal_de_bord(id_auteur);
CREATE INDEX IF NOT EXISTS idx_journal_date ON gestion_ape.journal_de_bord(date_creation DESC);
CREATE INDEX IF NOT EXISTS idx_journal_type ON gestion_ape.journal_de_bord(type_entree);

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 3 : Créer une table pour les objectifs de mentorat
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gestion_ape.objectifs_mentorat (
    id_objectif    BIGSERIAL     PRIMARY KEY,
    id_relation    INTEGER       NOT NULL REFERENCES gestion_ape.relations_mentorat(id_relation) ON DELETE CASCADE,
    description    TEXT          NOT NULL,
    date_fixation  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_limite    TIMESTAMPTZ,
    statut         VARCHAR(20)   DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'atteint', 'reporté', 'annulé')),
    priorite       VARCHAR(10)   DEFAULT 'normal' CHECK (priorite IN ('haute', 'normal', 'basse')),
    notes_alumni   TEXT,
    notes_eleve    TEXT,
    date_completion TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_objectif_relation ON gestion_ape.objectifs_mentorat(id_relation);
CREATE INDEX IF NOT EXISTS idx_objectif_statut ON gestion_ape.objectifs_mentorat(statut);

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 4 : Ajouter une colonne pour les notes de l'élève dans ses profils
-- ────────────────────────────────────────────────────────────────
ALTER TABLE vie_scolaire.profils_eleves 
ADD COLUMN IF NOT EXISTS moyenne_academique DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS dernier_bulletin_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS statut_scolaire VARCHAR(50);

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 5 : Commentaires sur les tables
-- ────────────────────────────────────────────────────────────────
COMMENT ON TABLE gestion_ape.relations_mentorat IS 'Définit les relations de mentorat entre alumni et élèves';
COMMENT ON TABLE gestion_ape.journal_de_bord IS 'Journal partagé entre alumni et élève pour documenter le mentorat';
COMMENT ON TABLE gestion_ape.objectifs_mentorat IS 'Objectifs fixés dans le cadre du mentorat';

COMMENT ON COLUMN gestion_ape.journal_de_bord.type_entree IS 'Type d''entrée: note (simple note), objectif (suivi d''objectif), reflexion (réflexion commune), feedback (retours)';
COMMENT ON COLUMN gestion_ape.journal_de_bord.is_prive IS 'Si TRUE, cette entrée n''est visible que par l''alumni (notes privées)';
COMMENT ON COLUMN gestion_ape.objectifs_mentorat.priorite IS 'Niveau de priorité de l''objectif';
