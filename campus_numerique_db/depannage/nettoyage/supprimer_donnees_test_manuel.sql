-- =============================================================================
-- SUPPRESSION MANUELLE DES COMPTES DE TEST (élèves/profs/parents/alumni)
-- À exécuter toi-même dans Supabase SQL Editor.
-- Ne touche JAMAIS au compte DIRECTION réel (DIR-2027-001).
-- =============================================================================

BEGIN;

-- 1. Vérifie AVANT : doit lister uniquement des comptes de test (jamais
--    DIR-2027-001). Si tu vois autre chose que des ELEVE/PROFESSEUR/
--    PARENT/ALUMNI de test ici, ARRÊTE-TOI et ne continue pas.
SELECT code_unique, nom, prenom, role_actuel
FROM authentification.comptes
WHERE role_actuel != 'DIRECTION'
ORDER BY role_actuel;

-- 2. Suppression (CASCADE supprime aussi les lignes liées : profils,
--    relations parent-élève, etc. — c'est voulu, ce sont des comptes de test)
DELETE FROM authentification.comptes
WHERE role_actuel != 'DIRECTION';

-- 3. Vérifie APRÈS : ne doit plus rester que ton compte DIRECTION réel
SELECT code_unique, nom, prenom, role_actuel FROM authentification.comptes;

COMMIT;
-- Si le résultat de l'étape 3 n'affiche QUE DIR-2027-001, tout est bon.
-- Si quelque chose semble faux avant le COMMIT, tape ROLLBACK; à la place.
