-- ================================================================
-- CAMPUS NUMÉRIQUE FASO — ENRICHISSEMENT PROFIL PARENT + FORUM APE
-- ================================================================
-- Ajoute : telephone, photo_url, adresse dans profils_parents
-- Crée   : gestion_ape.forum_parents pour les discussions en temps réel
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : Ajouter les colonnes de profil manquantes
-- ────────────────────────────────────────────────────────────────
ALTER TABLE gestion_ape.profils_parents
    ADD COLUMN IF NOT EXISTS telephone   VARCHAR(20)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS adresse     TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS photo_url   TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS bio         TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP;

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Créer la table forum_parents (discussions APE)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gestion_ape.forum_parents (
    id_post       SERIAL        PRIMARY KEY,
    id_auteur     UUID          NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    contenu       TEXT          NOT NULL CHECK (LENGTH(contenu) BETWEEN 1 AND 2000),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nb_likes      INTEGER       NOT NULL DEFAULT 0,
    est_modere    BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_forum_parents_date ON gestion_ape.forum_parents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_parents_auteur ON gestion_ape.forum_parents(id_auteur);

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 3 : Table des likes (pour éviter les doublons)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gestion_ape.forum_likes (
    id_post   INTEGER  NOT NULL REFERENCES gestion_ape.forum_parents(id_post) ON DELETE CASCADE,
    id_user   UUID     NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    PRIMARY KEY (id_post, id_user)
);

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 4 : Insérer quelques messages de départ pour le forum
-- ────────────────────────────────────────────────────────────────
INSERT INTO gestion_ape.forum_parents (id_auteur, contenu, created_at, nb_likes)
SELECT 
    (SELECT id_user FROM authentification.comptes WHERE role_actuel = 'PARENT' ORDER BY RANDOM() LIMIT 1),
    'Bonjour à tous les parents ! La réunion du samedi 15 mars est confirmée à 9h au lycée. Qui peut apporter des chaises supplémentaires ? 🙏',
    NOW() - INTERVAL '2 hours',
    12
WHERE NOT EXISTS (SELECT 1 FROM gestion_ape.forum_parents LIMIT 1);

INSERT INTO gestion_ape.forum_parents (id_auteur, contenu, created_at, nb_likes)
SELECT 
    (SELECT id_user FROM authentification.comptes WHERE role_actuel = 'PARENT' ORDER BY RANDOM() LIMIT 1),
    'Proposition : organiser des cours de soutien pendant les vacances d''"'"'avril pour les classes de Terminale. Les profs volontaires seraient rémunérés par les cotisations APE. Qui est d''"'"'accord ? 📚',
    NOW() - INTERVAL '5 hours',
    31
WHERE (SELECT COUNT(*) FROM gestion_ape.forum_parents) < 2;

INSERT INTO gestion_ape.forum_parents (id_auteur, contenu, created_at, nb_likes)
SELECT 
    (SELECT id_user FROM authentification.comptes WHERE role_actuel = 'PARENT' ORDER BY RANDOM() LIMIT 1),
    'Les résultats des compositions du 1er trimestre sont disponibles dans vos espaces parents. Félicitations à tous les élèves qui ont progressé ! 🎉',
    NOW() - INTERVAL '1 day',
    24
WHERE (SELECT COUNT(*) FROM gestion_ape.forum_parents) < 3;

-- ────────────────────────────────────────────────────────────────
-- VÉRIFICATION
-- ────────────────────────────────────────────────────────────────
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'gestion_ape' AND table_name = 'profils_parents'
ORDER BY ordinal_position;

SELECT COUNT(*) AS posts_forum FROM gestion_ape.forum_parents;
