-- ================================================================
-- Retrait de la fonctionnalité "Orientation" (avis prof/parent/alumni,
-- suggestion Littérature/Science) — prévue pour être enlevée depuis le
-- début, trop de fonctionnalités à gérer en parallèle (18/09/2026).
-- Vérifié avant suppression : pedagogie.avis_orientation était vide
-- (0 ligne) — aucune donnée réelle perdue.
-- ================================================================

DROP TABLE IF EXISTS pedagogie.avis_orientation;

ALTER TABLE gestion_ape.relations_mentorat
    DROP COLUMN IF EXISTS orientation_suggeree,
    DROP COLUMN IF EXISTS justification_orientation,
    DROP COLUMN IF EXISTS date_orientation_suggeree;

SELECT 'Fonctionnalité Orientation retirée de la base ✅' AS statut;
