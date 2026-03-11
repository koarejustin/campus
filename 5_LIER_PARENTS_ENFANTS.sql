-- ================================================================
-- CAMPUS NUMÉRIQUE FASO — LIAISON PARENTS ↔ ENFANTS
-- ================================================================
-- Logique : la simulation a créé les familles par paires :
--   PAR-2026-3000  →  CN-2026-2000  (i=0)
--   PAR-2026-3001  →  CN-2026-2001  (i=1)
--   ...
--   PAR-2026-3499  →  CN-2026-2499  (i=499)
-- 
-- Le numéro de fin est identique : 3000+i pour le parent, 2000+i pour l'élève
-- On exploite ça pour lier automatiquement les 500 familles.
-- ================================================================
-- IMPORTANT : Exécuter ce fichier UNE SEULE FOIS
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : S'assurer que la table a bien une contrainte UNIQUE
-- (pour éviter les doublons si on relance le script)
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_relation_parent_eleve'
    ) THEN
        ALTER TABLE vie_scolaire.relations_parents_eleves
        ADD CONSTRAINT uq_relation_parent_eleve UNIQUE (id_parent, id_eleve);
        RAISE NOTICE 'Contrainte UNIQUE ajoutée sur (id_parent, id_eleve)';
    ELSE
        RAISE NOTICE 'Contrainte UNIQUE déjà présente';
    END IF;
END $$;


-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Insérer les 500 liaisons parent → enfant
-- En joignant sur le suffixe numérique commun
-- PAR-2026-3XXX  ←→  CN-2026-2XXX  (XXX = 000 à 499)
-- ────────────────────────────────────────────────────────────────
INSERT INTO vie_scolaire.relations_parents_eleves (id_parent, id_eleve, lien_parente)
SELECT
    p.id_user   AS id_parent,
    e.id_user   AS id_eleve,
    'Parent'    AS lien_parente
FROM authentification.comptes p
JOIN authentification.comptes e
    ON RIGHT(p.code_unique, 3) = RIGHT(e.code_unique, 3)  -- même numéro de fin (000→499)
WHERE p.role_actuel = 'PARENT'
  AND e.role_actuel = 'ELEVE'
  AND p.code_unique LIKE 'PAR-2026-%'
  AND e.code_unique LIKE 'CN-2026-%'
ON CONFLICT (id_parent, id_eleve) DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 3 : Vérification — compter les liaisons créées
-- ────────────────────────────────────────────────────────────────
SELECT COUNT(*) AS liaisons_creees
FROM vie_scolaire.relations_parents_eleves;
-- Attendu : 500 lignes (+ éventuelles liaisons tests déjà existantes)


-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 4 : Vérifier 5 exemples concrets
-- ────────────────────────────────────────────────────────────────
SELECT
    p.code_unique  AS matricule_parent,
    p.nom          AS nom_famille,
    p.prenom       AS prenom_parent,
    r.lien_parente,
    e.code_unique  AS matricule_eleve,
    e.prenom       AS prenom_eleve,
    ep.classe_actuelle AS classe
FROM vie_scolaire.relations_parents_eleves r
JOIN authentification.comptes p  ON r.id_parent = p.id_user
JOIN authentification.comptes e  ON r.id_eleve  = e.id_user
JOIN vie_scolaire.profils_eleves ep ON e.id_user = ep.id_user
ORDER BY p.code_unique
LIMIT 10;


-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 5 : Vérifier qu'aucun parent n'est sans enfant
-- ────────────────────────────────────────────────────────────────
SELECT
    COUNT(*) AS parents_sans_enfant
FROM authentification.comptes p
WHERE p.role_actuel = 'PARENT'
  AND p.code_unique LIKE 'PAR-2026-%'
  AND NOT EXISTS (
      SELECT 1 FROM vie_scolaire.relations_parents_eleves r
      WHERE r.id_parent = p.id_user
  );
-- Attendu : 0


-- ────────────────────────────────────────────────────────────────
-- ÉTAPE 6 : Résumé final par classe
-- ────────────────────────────────────────────────────────────────
SELECT
    ep.classe_actuelle         AS classe,
    COUNT(r.id_relation)       AS nb_liaisons,
    COUNT(DISTINCT r.id_eleve) AS nb_eleves_lies
FROM vie_scolaire.relations_parents_eleves r
JOIN vie_scolaire.profils_eleves ep ON r.id_eleve = ep.id_user
GROUP BY ep.classe_actuelle
ORDER BY ep.classe_actuelle;
