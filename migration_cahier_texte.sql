-- ══════════════════════════════════════════
-- Cahier de texte des professeurs
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pedagogie.cahiers_texte (
    id           BIGSERIAL PRIMARY KEY,
    id_prof      UUID         NOT NULL REFERENCES authentification.comptes(id_user),
    classe       VARCHAR(20)  NOT NULL,
    matiere      VARCHAR(100) NOT NULL,
    titre_seance VARCHAR(200) NOT NULL,
    contenu      TEXT,
    travail_faire TEXT,
    date_seance  DATE         NOT NULL DEFAULT CURRENT_DATE,
    heure_debut  TIME,
    heure_fin    TIME,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ct_prof ON pedagogie.cahiers_texte(id_prof, date_seance DESC);
CREATE INDEX IF NOT EXISTS idx_ct_classe ON pedagogie.cahiers_texte(classe, date_seance DESC);

COMMENT ON TABLE pedagogie.cahiers_texte IS 'Cahier de texte - séances des professeurs';
