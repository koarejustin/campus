-- ================================================================
-- Signature électronique réelle des bulletins
-- (remplace le système actuel qui ne persiste rien nulle part)
-- ================================================================
CREATE TABLE IF NOT EXISTS pedagogie.bulletins_signes (
    id_signature    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_eleve        UUID        NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    trimestre       SMALLINT    NOT NULL CHECK (trimestre IN (1,2,3)),
    annee_scolaire  VARCHAR(9)  NOT NULL DEFAULT '2025-2026',
    id_signataire   UUID        NOT NULL REFERENCES authentification.comptes(id_user),
    date_signature  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_eleve, trimestre, annee_scolaire)
);

CREATE INDEX IF NOT EXISTS idx_bulletins_signes_eleve ON pedagogie.bulletins_signes(id_eleve);
CREATE INDEX IF NOT EXISTS idx_bulletins_signes_tri ON pedagogie.bulletins_signes(trimestre, annee_scolaire);

SELECT 'Table pedagogie.bulletins_signes créée ✅' AS statut;
