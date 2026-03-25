-- Table avis d'orientation des professeurs
CREATE TABLE IF NOT EXISTS pedagogie.avis_orientation (
    id              BIGSERIAL    PRIMARY KEY,
    id_prof         UUID         NOT NULL REFERENCES authentification.comptes(id_user),
    id_eleve        UUID         NOT NULL REFERENCES authentification.comptes(id_user),
    points_forts    TEXT,
    points_faibles  TEXT,
    serie_recommandee VARCHAR(20),
    commentaire     TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_avis_eleve ON pedagogie.avis_orientation(id_eleve);
CREATE INDEX IF NOT EXISTS idx_avis_prof  ON pedagogie.avis_orientation(id_prof);
