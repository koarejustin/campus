-- ================================================================
-- CAMPUS NUMÉRIQUE FASO — CONNEXION ET ACTIVATION DES COMPTES
-- ================================================================
-- Exécuter dans psql ou pgAdmin sur : campus_numerique_db
-- Ordre : lire → activer → tester → vérifier
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- ÉTAPE 1 — VOIR TOUS LES COMPTES ET LEUR ÉTAT
-- ════════════════════════════════════════════════════════════════

SELECT
    code_unique     AS matricule,
    nom,
    prenom,
    role_actuel     AS role,
    CASE
        WHEN mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        WHEN mot_de_passe IS NULL        THEN '⚪ Sans mot de passe'
        ELSE                                  '🟢 Prêt à se connecter'
    END             AS statut
FROM authentification.comptes
ORDER BY
    CASE role_actuel
        WHEN 'DIRECTION'   THEN 1
        WHEN 'SURVEILLANT' THEN 2
        WHEN 'PROFESSEUR'  THEN 3
        WHEN 'ELEVE'       THEN 4
        WHEN 'PARENT'      THEN 5
        WHEN 'ALUMNI'      THEN 6
        ELSE                    7
    END,
    nom;


-- ════════════════════════════════════════════════════════════════
-- ÉTAPE 2 — COMPTES DE TEST PRÊTS À L'EMPLOI
-- (Copier le matricule → coller dans login.html)
-- ════════════════════════════════════════════════════════════════

-- 👑 DIRECTION
SELECT code_unique AS matricule, nom, prenom, role_actuel
FROM authentification.comptes
WHERE role_actuel = 'DIRECTION'
ORDER BY nom;

-- 👮 SURVEILLANTS
SELECT code_unique AS matricule, nom, prenom, adm.poste_occupe
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'SURVEILLANT'
ORDER BY nom;

-- 🎓 ÉLÈVES — 1 par classe pour les tests
SELECT DISTINCT ON (p.classe_actuelle)
    c.code_unique   AS matricule,
    c.nom,
    c.prenom,
    p.classe_actuelle AS classe
FROM authentification.comptes c
JOIN vie_scolaire.profils_eleves p ON c.id_user = p.id_user
WHERE c.role_actuel = 'ELEVE'
ORDER BY p.classe_actuelle, c.nom;

-- 👨‍👩‍👧 PARENTS — les 5 premiers
SELECT
    c.code_unique AS matricule,
    c.nom,
    c.prenom
FROM authentification.comptes c
WHERE c.role_actuel = 'PARENT'
ORDER BY c.nom
LIMIT 5;

-- 🎓 ALUMNI
SELECT code_unique AS matricule, nom, prenom
FROM authentification.comptes
WHERE role_actuel = 'ALUMNI'
ORDER BY nom;


-- ════════════════════════════════════════════════════════════════
-- ÉTAPE 3 — ACTIVER UN COMPTE PRÉCIS
-- ════════════════════════════════════════════════════════════════
-- Le compte passe à "NON_ACTIVE" → au 1er login, l'utilisateur
-- choisit son mot de passe définitif.

-- Activer UN compte (remplacer le matricule)
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE code_unique = 'REMPLACER_PAR_MATRICULE';

-- Exemple — activer la direction :
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE code_unique = 'DIR-2026-001';

-- Exemple — activer le surveillant Moussa :
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE code_unique = 'SURV-2026-001';


-- ════════════════════════════════════════════════════════════════
-- ÉTAPE 4 — ACTIVER TOUS LES COMPTES D'UN SEUL RÔLE
-- ════════════════════════════════════════════════════════════════

-- Activer tous les SURVEILLANTS
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE role_actuel = 'SURVEILLANT';

-- Activer tous les ÉLÈVES
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE role_actuel = 'ELEVE';

-- Activer tous les PARENTS
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE role_actuel = 'PARENT';

-- Activer tous les ALUMNI
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE role_actuel = 'ALUMNI';


-- ════════════════════════════════════════════════════════════════
-- ÉTAPE 5 — VÉRIFIER LES DONNÉES DANS LA BASE
-- ════════════════════════════════════════════════════════════════

-- Résumé par rôle (combien de comptes, combien activés)
SELECT
    role_actuel                                                    AS role,
    COUNT(*)                                                       AS total,
    SUM(CASE WHEN mot_de_passe != 'NON_ACTIVE' THEN 1 ELSE 0 END) AS actives,
    SUM(CASE WHEN mot_de_passe = 'NON_ACTIVE'  THEN 1 ELSE 0 END) AS a_activer
FROM authentification.comptes
GROUP BY role_actuel
ORDER BY role_actuel;

-- Voir les absences enregistrées
SELECT
    a.date_absence,
    c.code_unique AS matricule,
    c.nom, c.prenom,
    p.classe_actuelle,
    a.justifiee,
    a.raison_absence
FROM gestion.absences a
JOIN authentification.comptes c       ON a.id_eleve = c.id_user
JOIN vie_scolaire.profils_eleves p    ON c.id_user  = p.id_user
ORDER BY a.date_absence DESC
LIMIT 20;

-- Voir les convocations
SELECT
    conv.date_convocation,
    conv.sujet,
    conv.motif,
    c.nom, c.prenom,
    p.classe_actuelle
FROM gestion.convocations conv
JOIN authentification.comptes c      ON conv.id_eleve = c.id_user
JOIN vie_scolaire.profils_eleves p   ON c.id_user = p.id_user
ORDER BY conv.date_convocation DESC
LIMIT 20;

-- Voir les incidents
SELECT
    i.date_signalement,
    i.titre,
    i.urgence,
    i.type_incident,
    c.nom AS signale_par
FROM gestion.incidents i
JOIN authentification.comptes c ON i.signale_par = c.id_user
ORDER BY i.date_signalement DESC
LIMIT 20;

-- Voir les annonces officielles
SELECT
    a.titre,
    a.type,
    a.date_publication,
    c.nom AS publie_par,
    c.role_actuel
FROM gestion.annonces_officielles a
JOIN authentification.comptes c ON a.publie_par = c.id_user
ORDER BY a.date_publication DESC;

-- Vérifier les liens parent → enfant
SELECT
    p.code_unique  AS matricule_parent,
    p.nom          AS parent,
    e.code_unique  AS matricule_enfant,
    e.nom          AS enfant,
    pe.classe_actuelle,
    r.lien_parente
FROM vie_scolaire.relations_parents_eleves r
JOIN authentification.comptes p            ON r.id_parent = p.id_user
JOIN authentification.comptes e            ON r.id_eleve  = e.id_user
JOIN vie_scolaire.profils_eleves pe        ON e.id_user   = pe.id_user
ORDER BY p.nom;

-- Vérifier les notes enregistrées
SELECT
    c.code_unique AS matricule,
    c.nom, c.prenom,
    m.libelle_matiere,
    n.note,
    n.trimestre
FROM pedagogie.notes_evaluations n
JOIN authentification.comptes c  ON n.id_eleve   = c.id_user
JOIN pedagogie.matieres m        ON n.id_matiere = m.id_matiere
ORDER BY c.nom, n.trimestre, m.libelle_matiere
LIMIT 30;
