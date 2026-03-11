-- ================================================================
-- CAMPUS NUMÉRIQUE FASO — CRÉATION DES TABLES MANQUANTES
-- ================================================================
-- INSTRUCTIONS :
--   1. Ouvrir pgAdmin ou psql
--   2. Se connecter à : campus_numerique_db
--   3. Copier-coller CE FICHIER ENTIER et exécuter
--   4. Toutes les tables seront créées sans toucher aux données
-- ================================================================


-- ── Créer les schémas s'ils n'existent pas ──────────────────────
CREATE SCHEMA IF NOT EXISTS gestion;
CREATE SCHEMA IF NOT EXISTS pedagogie;


-- ════════════════════════════════════════════════════════════════
-- SCHÉMA : gestion
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gestion.absences (
    id_absence      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_eleve        UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    date_absence    DATE        NOT NULL,
    justifiee       BOOLEAN     NOT NULL DEFAULT false,
    raison_absence  TEXT,
    enregistre_par  UUID        NOT NULL REFERENCES authentification.comptes(id_user),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_absences_eleve  ON gestion.absences(id_eleve);
CREATE INDEX IF NOT EXISTS idx_absences_date   ON gestion.absences(date_absence);
CREATE INDEX IF NOT EXISTS idx_absences_justif ON gestion.absences(justifiee);


CREATE TABLE IF NOT EXISTS gestion.convocations (
    id_convocation   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_eleve         UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    sujet            VARCHAR(255) NOT NULL,
    description      TEXT,
    date_convocation TIMESTAMPTZ NOT NULL,
    motif            VARCHAR(100) NOT NULL DEFAULT 'DISCIPLINE',
    creee_par        UUID        NOT NULL REFERENCES authentification.comptes(id_user),
    date_creation    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_convocations_eleve ON gestion.convocations(id_eleve);
CREATE INDEX IF NOT EXISTS idx_convocations_date  ON gestion.convocations(date_convocation);


CREATE TABLE IF NOT EXISTS gestion.incidents (
    id_incident      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    titre            VARCHAR(255) NOT NULL,
    description      TEXT,
    type_incident    VARCHAR(100) NOT NULL,
    eleves_impliques JSONB        NOT NULL DEFAULT '[]',
    urgence          VARCHAR(50)  NOT NULL DEFAULT 'NORMALE',
    signale_par      UUID        NOT NULL REFERENCES authentification.comptes(id_user),
    date_signalement TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_incidents_urgence ON gestion.incidents(urgence);
CREATE INDEX IF NOT EXISTS idx_incidents_date    ON gestion.incidents(date_signalement);


CREATE TABLE IF NOT EXISTS gestion.messages_prevention (
    id_prevention      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    titre              VARCHAR(255) NOT NULL,
    contenu            TEXT        NOT NULL,
    destinataires      JSONB        NOT NULL DEFAULT '["TOUS"]',
    type_destinataires VARCHAR(50)  NOT NULL DEFAULT 'TOUT',
    creee_par          UUID        NOT NULL REFERENCES authentification.comptes(id_user),
    date_creation      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS gestion.messages (
    id_message      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_expediteur   UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    id_destinataire UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    contenu         TEXT        NOT NULL,
    type            VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    est_privee      BOOLEAN     NOT NULL DEFAULT false,
    date_envoi      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_expediteur   ON gestion.messages(id_expediteur);
CREATE INDEX IF NOT EXISTS idx_messages_destinataire ON gestion.messages(id_destinataire);


CREATE TABLE IF NOT EXISTS gestion.annonces_officielles (
    id_annonce       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    titre            VARCHAR(255) NOT NULL,
    contenu          TEXT        NOT NULL,
    type             VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
    publie_par       UUID        NOT NULL REFERENCES authentification.comptes(id_user),
    date_publication TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_annonces_date ON gestion.annonces_officielles(date_publication);


CREATE TABLE IF NOT EXISTS gestion.activites (
    id_activite    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    titre          VARCHAR(255) NOT NULL,
    description    TEXT,
    date_debut     TIMESTAMPTZ NOT NULL,
    date_fin       TIMESTAMPTZ,
    type_activite  VARCHAR(100) NOT NULL DEFAULT 'EVENEMENT',
    planifiee_par  UUID        NOT NULL REFERENCES authentification.comptes(id_user),
    date_creation  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_activites_date ON gestion.activites(date_debut);


CREATE TABLE IF NOT EXISTS gestion.notifications (
    id_notification UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user         UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    type            VARCHAR(100) NOT NULL,
    contenu         TEXT        NOT NULL,
    lue             BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON gestion.notifications(id_user);
CREATE INDEX IF NOT EXISTS idx_notifs_lue  ON gestion.notifications(lue);


-- ════════════════════════════════════════════════════════════════
-- SCHÉMA : pedagogie
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pedagogie.matieres (
    id_matiere      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    libelle_matiere VARCHAR(100) NOT NULL UNIQUE,
    coefficient     SMALLINT    NOT NULL DEFAULT 1,
    classe          VARCHAR(20),
    est_active      BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO pedagogie.matieres (libelle_matiere, coefficient, classe) VALUES
    ('Français',            4, NULL),
    ('Mathématiques',       4, NULL),
    ('Histoire-Géographie', 2, NULL),
    ('Anglais',             2, NULL),
    ('Sciences de la Vie',  2, NULL),
    ('Physique-Chimie',     3, NULL),
    ('Philosophie',         2, 'Tle A'),
    ('Économie',            2, '2nde A'),
    ('Arts Plastiques',     1, '6ème'),
    ('Éducation Physique',  1, NULL)
ON CONFLICT (libelle_matiere) DO NOTHING;


CREATE TABLE IF NOT EXISTS pedagogie.notes_evaluations (
    id_evaluation   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_eleve        UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    id_matiere      UUID        NOT NULL REFERENCES pedagogie.matieres(id_matiere),
    id_professeur   UUID        REFERENCES authentification.comptes(id_user),
    note            NUMERIC(5,2) NOT NULL CHECK (note >= 0 AND note <= 20),
    trimestre       SMALLINT    NOT NULL CHECK (trimestre IN (1, 2, 3)),
    annee_scolaire  VARCHAR(9)  NOT NULL DEFAULT '2025-2026',
    date_evaluation TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    commentaire     TEXT
);
CREATE INDEX IF NOT EXISTS idx_notes_eleve     ON pedagogie.notes_evaluations(id_eleve);
CREATE INDEX IF NOT EXISTS idx_notes_matiere   ON pedagogie.notes_evaluations(id_matiere);
CREATE INDEX IF NOT EXISTS idx_notes_trimestre ON pedagogie.notes_evaluations(trimestre);


-- ════════════════════════════════════════════════════════════════
-- COLONNE date_creation — ajouter si absente
-- ════════════════════════════════════════════════════════════════
ALTER TABLE authentification.comptes
    ADD COLUMN IF NOT EXISTS date_creation TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;


-- ════════════════════════════════════════════════════════════════
-- TABLE relations_parents_eleves — ajouter si absente
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vie_scolaire.relations_parents_eleves (
    id_relation  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_parent    UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    id_eleve     UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    lien_parente VARCHAR(50) NOT NULL DEFAULT 'Parent',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_parent, id_eleve)
);
CREATE INDEX IF NOT EXISTS idx_rel_parent ON vie_scolaire.relations_parents_eleves(id_parent);
CREATE INDEX IF NOT EXISTS idx_rel_eleve  ON vie_scolaire.relations_parents_eleves(id_eleve);


-- ════════════════════════════════════════════════════════════════
-- VÉRIFICATION FINALE — tables créées
-- ════════════════════════════════════════════════════════════════
SELECT schemaname AS schema, tablename AS table
FROM pg_tables
WHERE schemaname IN ('authentification','vie_scolaire','gestion_ape','gestion','pedagogie')
ORDER BY schemaname, tablename;
