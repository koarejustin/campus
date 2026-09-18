-- ================================================================
-- Retire les FK updated_by -> comptes sur coefficients / images_espaces
-- ================================================================
-- Ces deux tables sont des tables de CONFIGURATION (barème par classe,
-- photos des cartes du portail), volontairement exclues du script de
-- reset complet (RESET_AVANT_DEPLOIEMENT_REEL.sql). Mais leur colonne
-- updated_by référençait authentification.comptes en FK, donc
-- TRUNCATE ... CASCADE sur comptes les vidait quand même malgré leur
-- exclusion explicite — vécu 2 fois (18 et 19/09/2026), réparé les 2
-- fois depuis une sauvegarde.
--
-- updated_by reste une donnée informative (qui a modifié en dernier)
-- mais n'a plus besoin d'être une contrainte stricte : la colonne
-- reste, juste sans FK, donc plus aucun TRUNCATE ne peut la cascader.
-- ================================================================

ALTER TABLE pedagogie.coefficients
    DROP CONSTRAINT IF EXISTS coefficients_updated_by_fkey;

ALTER TABLE gestion.images_espaces
    DROP CONSTRAINT IF EXISTS images_espaces_updated_by_fkey;

SELECT 'FK updated_by retirées (coefficients, images_espaces) ✅' AS statut;
