-- ================================================================
-- CORRECTIF 1 : Coefficients Terminale D (confirmé par Justin)
-- Mathématiques = 5, Physique-Chimie = 4 (la table avait les deux inversés)
-- ================================================================
UPDATE pedagogie.coefficients_par_classe c
SET coefficient_corrige = 5
FROM pedagogie.matieres m
WHERE c.matiere_id = m.id_matiere
  AND c.classe = 'TERMINALE' AND c.serie = 'D'
  AND m.libelle_matiere = 'Mathématiques';

UPDATE pedagogie.coefficients_par_classe c
SET coefficient_corrige = 4
FROM pedagogie.matieres m
WHERE c.matiere_id = m.id_matiere
  AND c.classe = 'TERMINALE' AND c.serie = 'D'
  AND m.libelle_matiere = 'Physique-Chimie';

-- Vérification
SELECT m.libelle_matiere, c.coefficient_corrige
FROM pedagogie.coefficients_par_classe c
JOIN pedagogie.matieres m ON m.id_matiere = c.matiere_id
WHERE c.classe = 'TERMINALE' AND c.serie = 'D'
ORDER BY c.coefficient_corrige DESC;


-- ================================================================
-- CORRECTIF 2 : Table des projets APE (utilisée par le nouvel espace
-- Bureau APE — n'existait pas encore dans la base)
-- ================================================================
CREATE TABLE IF NOT EXISTS gestion_ape.projets_ape (
    id_projet     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    titre         VARCHAR(255) NOT NULL,
    description   TEXT,
    budget        NUMERIC(12,2),
    date_debut    DATE         NOT NULL DEFAULT CURRENT_DATE,
    date_fin      DATE,
    statut        VARCHAR(20)  NOT NULL DEFAULT 'EN_COURS'
                  CHECK (statut IN ('EN_COURS','TERMINE','ANNULE')),
    cree_par      UUID         REFERENCES authentification.comptes(id_user),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projets_ape_statut ON gestion_ape.projets_ape(statut);

SELECT 'Table gestion_ape.projets_ape créée avec succès ✅' AS statut;
