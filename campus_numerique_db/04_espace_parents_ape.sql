-- 1. Profil individuel des parents (Espace Parents) [cite: 30]
CREATE TABLE gestion_ape.profils_parents (
    id_parent UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    profession VARCHAR(255), -- Utile pour le mentorat et l'orientation [cite: 30]
    biographie TEXT
);

-- 2. Structure du Bureau APE (Espace Bureau des Parents) [cite: 28]
-- Permet la gestion des cotisations et des projets de l'école [cite: 28, 29]
CREATE TABLE gestion_ape.bureau_direction (
    id_membre SERIAL PRIMARY KEY,
    id_parent UUID REFERENCES gestion_ape.profils_parents(id_parent),
    poste fonction_ape NOT NULL,
    date_nomination DATE DEFAULT CURRENT_DATE,
    peut_signer_documents BOOLEAN DEFAULT FALSE -- Pour les signatures officielles [cite: 25]
);

COMMENT ON TABLE gestion_ape.bureau_direction IS 'Gère les membres officiels ayant des droits de gestion APE';