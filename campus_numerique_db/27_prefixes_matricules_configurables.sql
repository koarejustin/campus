-- ================================================================
-- Préfixes de matricule configurables par école
-- ================================================================
-- Avant : "CN-2026-XXXX", "PROF-2026-XXX", "DIR-2027-001"... étaient
-- codés en dur (14 fois, dans adminController.js) — aucun moyen pour
-- une autre école de personnaliser son format sans que je modifie le
-- code, et le "2026"/"2027" resterait figé à chaque nouvelle année
-- scolaire tant que quelqu'un n'édite pas le code à la main.
--
-- Valeurs par défaut = exactement ce qui était codé en dur, donc rien
-- ne change pour l'école actuelle tant que la Direction ne va pas
-- modifier ces champs dans Paramètres.
--
-- Cette table est volontairement EXCLUE de RESET_AVANT_DEPLOIEMENT_REEL.sql
-- (voir gestion.configuration dans "CE QUI EST GARDÉ") — les préfixes
-- choisis par une école survivent donc à un reset complet.
-- ================================================================

ALTER TABLE gestion.configuration
    ADD COLUMN IF NOT EXISTS matricule_prefixe_eleve VARCHAR(20) NOT NULL DEFAULT 'CN',
    ADD COLUMN IF NOT EXISTS matricule_prefixe_prof VARCHAR(20) NOT NULL DEFAULT 'PROF',
    ADD COLUMN IF NOT EXISTS matricule_prefixe_parent VARCHAR(20) NOT NULL DEFAULT 'PAR',
    ADD COLUMN IF NOT EXISTS matricule_prefixe_alumni VARCHAR(20) NOT NULL DEFAULT 'ALUM',
    ADD COLUMN IF NOT EXISTS matricule_prefixe_surveillant VARCHAR(20) NOT NULL DEFAULT 'SURV',
    ADD COLUMN IF NOT EXISTS matricule_prefixe_direction VARCHAR(20) NOT NULL DEFAULT 'DIR',
    ADD COLUMN IF NOT EXISTS matricule_annee VARCHAR(10) NOT NULL DEFAULT '2026';

SELECT 'Préfixes de matricule configurables ajoutés ✅' AS statut;
