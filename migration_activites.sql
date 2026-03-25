-- Table agenda / activités (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS gestion.activites (
    id_activite   BIGSERIAL    PRIMARY KEY,
    titre         VARCHAR(200) NOT NULL,
    description   TEXT,
    date_debut    TIMESTAMPTZ  NOT NULL,
    date_fin      TIMESTAMPTZ,
    type_activite VARCHAR(50)  NOT NULL DEFAULT 'general',
    planifiee_par UUID,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activites_date ON gestion.activites(date_debut DESC);
