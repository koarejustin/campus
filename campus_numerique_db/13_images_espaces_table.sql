-- ============================================================
-- TABLE DES IMAGES PAR ESPACE
-- ============================================================

CREATE TABLE IF NOT EXISTS gestion.images_espaces (
    id_image SERIAL PRIMARY KEY,
    espace VARCHAR(50) NOT NULL, -- 'accueil', 'eleves', 'professeurs', 'parents', 'direction', 'galerie'
    type_image VARCHAR(50) DEFAULT 'hero', -- 'hero', 'banner', 'background', 'illustration', 'logo'
    titre VARCHAR(255),
    description TEXT,
    url_image TEXT NOT NULL,
    ordre INTEGER DEFAULT 0,
    est_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES authentification.comptes(id_user)
);

-- Index pour accélérer les recherches
CREATE INDEX idx_images_espace ON gestion.images_espaces(espace, est_active);
CREATE INDEX idx_images_type ON gestion.images_espaces(type_image);

-- Ajouter quelques images par défaut (commentaires pour l'instant)
COMMENT ON TABLE gestion.images_espaces IS 'Images personnalisables par espace de l''application';