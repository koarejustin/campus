-- ================================================================
-- CAMPUS NUMÉRIQUE FASO — TABLES POUR ESPACE ALUMNI
-- ================================================================
-- Étend profils_alumni avec des colonnes complètes
-- Crée la table mentorats pour les conseils
-- Crée la table avis_orientation pour les conseils aux élèves
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : Étendre la table profils_alumni
-- ────────────────────────────────────────────────────────────────
ALTER TABLE gestion_ape.profils_alumni
ADD COLUMN IF NOT EXISTS biographie TEXT,
ADD COLUMN IF NOT EXISTS telephone VARCHAR(20),
ADD COLUMN IF NOT EXISTS adresse TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS competences TEXT[],
ADD COLUMN IF NOT EXISTS experiences TEXT,
ADD COLUMN IF NOT EXISTS domaine_expertise VARCHAR(100),
ADD COLUMN IF NOT EXISTS annee_graduation VARCHAR(10),
ADD COLUMN IF NOT EXISTS universite VARCHAR(100),
ADD COLUMN IF NOT EXISTS secteur_activite VARCHAR(100),
ADD COLUMN IF NOT EXISTS entreprise_actuelle VARCHAR(100),
ADD COLUMN IF NOT EXISTS poste_actuel VARCHAR(100),
ADD COLUMN IF NOT EXISTS ville_residence VARCHAR(100),
ADD COLUMN IF NOT EXISTS pays_residence VARCHAR(50) DEFAULT 'Burkina Faso',
ADD COLUMN IF NOT EXISTS disponible_mentorat BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS interets TEXT[],
ADD COLUMN IF NOT EXISTS langues_parlees TEXT[] DEFAULT ARRAY['Français'],
ADD COLUMN IF NOT EXISTS site_web TEXT,
ADD COLUMN IF NOT EXISTS reseaux_sociaux JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Création des index pour les recherches
CREATE INDEX IF NOT EXISTS idx_profils_alumni_domaine ON gestion_ape.profils_alumni(domaine_expertise);
CREATE INDEX IF NOT EXISTS idx_profils_alumni_secteur ON gestion_ape.profils_alumni(secteur_activite);
CREATE INDEX IF NOT EXISTS idx_profils_alumni_disponible ON gestion_ape.profils_alumni(disponible_mentorat);

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Créer la table mentorats
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gestion_ape.mentorats (
    id_mentorat       SERIAL        PRIMARY KEY,
    id_alumni         UUID          NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    contenu_conseil   TEXT          NOT NULL CHECK (LENGTH(contenu_conseil) BETWEEN 1 AND 5000),
    filiere_suggeree  VARCHAR(100),
    date_publication  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mentorats_date ON gestion_ape.mentorats(date_publication DESC);
CREATE INDEX IF NOT EXISTS idx_mentorats_alumni ON gestion_ape.mentorats(id_alumni);

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 3 : Créer la table avis_orientation (si elle n'existe pas)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedagogie.avis_orientation (
    id_avis          SERIAL        PRIMARY KEY,
    id_alumni        UUID          NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    id_eleve         UUID          NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    commentaire      TEXT          NOT NULL CHECK (LENGTH(commentaire) BETWEEN 1 AND 2000),
    serie_recommandee VARCHAR(50),
    date_avis        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_avis_orientation_eleve ON pedagogie.avis_orientation(id_eleve);
CREATE INDEX IF NOT EXISTS idx_avis_orientation_alumni ON pedagogie.avis_orientation(id_alumni);
CREATE INDEX IF NOT EXISTS idx_avis_orientation_date ON pedagogie.avis_orientation(date_avis DESC);

-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 4 : Insérer quelques mentorats de départ
-- ────────────────────────────────────────────────────────────────
INSERT INTO gestion_ape.mentorats (id_alumni, contenu_conseil, filiere_suggeree, date_publication)
SELECT
    c.id_user,
    'En tant qu''ancien élève, je recommande vivement d''investir du temps dans les projets pratiques. C''est ce qui m''a le plus aidé dans ma carrière professionnelle. N''hésitez pas à demander de l''aide aux professeurs !',
    'Informatique',
    NOW() - INTERVAL '5 days'
FROM authentification.comptes c
WHERE c.role_actuel = 'ALUMNI'
ORDER BY RANDOM()
LIMIT 1;

-- Commentaire sur les tables
COMMENT ON TABLE gestion_ape.profils_alumni IS 'Profils détaillés des anciens élèves avec informations professionnelles et personnelles';
COMMENT ON TABLE gestion_ape.mentorats IS 'Conseils et témoignages partagés par les alumni';
COMMENT ON TABLE pedagogie.avis_orientation IS 'Avis d''orientation donnés par les alumni aux élèves';