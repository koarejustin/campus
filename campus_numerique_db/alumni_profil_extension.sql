-- Extension de la table profils_alumni pour inclure des champs similaires à profils_parents
-- Ajout de colonnes pour un profil complet d'alumni

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
ADD COLUMN IF NOT EXISTS reseaux_sociaux JSONB DEFAULT '{}';

-- Création d'un index pour les recherches par domaine d'expertise
CREATE INDEX IF NOT EXISTS idx_profils_alumni_domaine ON gestion_ape.profils_alumni(domaine_expertise);
CREATE INDEX IF NOT EXISTS idx_profils_alumni_secteur ON gestion_ape.profils_alumni(secteur_activite);
CREATE INDEX IF NOT EXISTS idx_profils_alumni_disponible ON gestion_ape.profils_alumni(disponible_mentorat);

-- Commentaire sur la table
COMMENT ON TABLE gestion_ape.profils_alumni IS 'Profils détaillés des anciens élèves avec informations professionnelles et personnelles';