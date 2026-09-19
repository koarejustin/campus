-- ================================================================
-- Format de matricule totalement libre par école (gabarits)
-- ================================================================
-- 27_prefixes_matricules_configurables.sql ne permettait de changer
-- que le texte du préfixe et l'année, dans une structure figée
-- "PREFIXE-ANNEE-NUMERO" (toujours des tirets, toujours dans cet
-- ordre). Une vraie école (ex: LPC0034SJF — vu sur un bulletin réel :
-- pas de tiret, numéro collé, suffixe après, pas d'année) a besoin
-- d'un format entièrement libre.
--
-- Remplace les 6 colonnes matricule_prefixe_* par 6 colonnes
-- matricule_gabarit_* : un modèle texte librement composé par
-- l'école, avec deux emplacements possibles :
--   {ANNEE}         → remplacé par matricule_annee
--   {NUMERO:N}       → numéro séquentiel, complété à N chiffres
--   {NUMERO}         → numéro séquentiel, sans complément
-- Tout le reste du texte est gardé tel quel (préfixe, suffixe,
-- séparateurs ou non...).
--
-- Valeurs par défaut = équivalentes à l'ancien système codé en dur
-- ("CN-2026-2001" etc.), donc rien ne change pour l'école actuelle
-- tant que la Direction ne modifie pas ces champs.
-- ================================================================

ALTER TABLE gestion.configuration
    ADD COLUMN IF NOT EXISTS matricule_gabarit_eleve VARCHAR(60) NOT NULL DEFAULT 'CN-{ANNEE}-{NUMERO:4}',
    ADD COLUMN IF NOT EXISTS matricule_gabarit_prof VARCHAR(60) NOT NULL DEFAULT 'PROF-{ANNEE}-{NUMERO:3}',
    ADD COLUMN IF NOT EXISTS matricule_gabarit_parent VARCHAR(60) NOT NULL DEFAULT 'PAR-{ANNEE}-{NUMERO:4}',
    ADD COLUMN IF NOT EXISTS matricule_gabarit_alumni VARCHAR(60) NOT NULL DEFAULT 'ALUM-{ANNEE}-{NUMERO:3}',
    ADD COLUMN IF NOT EXISTS matricule_gabarit_surveillant VARCHAR(60) NOT NULL DEFAULT 'SURV-{ANNEE}-{NUMERO:3}',
    ADD COLUMN IF NOT EXISTS matricule_gabarit_direction VARCHAR(60) NOT NULL DEFAULT 'DIR-{ANNEE}-{NUMERO:3}';

ALTER TABLE gestion.configuration
    DROP COLUMN IF EXISTS matricule_prefixe_eleve,
    DROP COLUMN IF EXISTS matricule_prefixe_prof,
    DROP COLUMN IF EXISTS matricule_prefixe_parent,
    DROP COLUMN IF EXISTS matricule_prefixe_alumni,
    DROP COLUMN IF EXISTS matricule_prefixe_surveillant,
    DROP COLUMN IF EXISTS matricule_prefixe_direction;

SELECT 'Gabarits de matricule libres ajoutés ✅' AS statut;
