-- ============================================================
-- TABLE DE CONFIGURATION DE L'ÉTABLISSEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS gestion.configuration (
    id_config SERIAL PRIMARY KEY,
    nom_etablissement VARCHAR(255) NOT NULL DEFAULT 'Campus Numérique FASO',
    slogan TEXT,
    logo_url TEXT,
    logo_favicon_url TEXT,
    adresse TEXT,
    telephone VARCHAR(20),
    email_contact VARCHAR(255),
    site_web VARCHAR(255),
    couleur_primaire VARCHAR(7) DEFAULT '#3B82F6',
    couleur_secondaire VARCHAR(7) DEFAULT '#10B981',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES authentification.comptes(id_user)
);

-- Ajouter un commentaire
COMMENT ON TABLE gestion.configuration IS 'Configuration globale de l''établissement';

-- Insérer la configuration par défaut
INSERT INTO gestion.configuration (nom_etablissement, slogan, couleur_primaire, couleur_secondaire)
VALUES (
    'Mon Nouveau Lycée',
    'L''excellence au service de la réussite',
    '#3B82F6',
    '#10B981'
)
ON CONFLICT DO NOTHING;

-- Vérifier
SELECT * FROM gestion.configuration;