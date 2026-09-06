-- =============================================================================
-- SCRIPT 22 : UN ÉLÈVE DOIT TOUJOURS AVOIR UN PARENT LIÉ
--
-- Symétrique à la règle déjà en place côté parent : un parent ne peut pas
-- être actif (est_actif=true) sans élève lié
-- (trg_prevent_parent_activation, voir authentification.prevent_parent_activation).
-- Ce script ajoute la règle inverse : un élève ne peut pas être actif sans
-- au moins un parent lié.
--
-- Conséquence pratique : createEleve / importElevesExcel créent maintenant
-- l'élève avec est_actif=false. Il s'active automatiquement dès que
-- createParent ou importParentsExcel le lient à un parent (voir ces
-- fonctions dans controller/adminController.js). Tant qu'aucun parent n'est
-- lié, l'élève n'apparaît pas dans "Effectif Total" (getStats compte
-- uniquement est_actif=true) — c'est voulu : ça rend visible qu'un élève
-- n'est pas encore complètement inscrit.
--
-- Déjà appliqué directement en base le 2026-09-06 — ce script est la
-- version rejouable pour une nouvelle installation.
-- =============================================================================

CREATE OR REPLACE FUNCTION authentification.prevent_eleve_activation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    has_relation BOOLEAN := FALSE;
BEGIN
    IF (NEW.role_actuel = 'ELEVE' AND NEW.est_actif = TRUE) THEN
        SELECT EXISTS (
            SELECT 1 FROM vie_scolaire.relations_parents_eleves r WHERE r.id_eleve = NEW.id_user
        ) INTO has_relation;

        IF NOT has_relation THEN
            RAISE EXCEPTION 'Activation refusée : un élève doit avoir au moins un parent lié.';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_eleve_activation ON authentification.comptes;

CREATE TRIGGER trg_prevent_eleve_activation
BEFORE INSERT OR UPDATE ON authentification.comptes
FOR EACH ROW EXECUTE FUNCTION authentification.prevent_eleve_activation();

-- Vérification
SELECT 'Trigger cree' AS statut, tgname FROM pg_trigger WHERE tgname = 'trg_prevent_eleve_activation';
