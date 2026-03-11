-- ================================================================
-- CAMPUS NUMÉRIQUE FASO — CONSULTATION ET ACTIVATION DES COMPTES
-- ================================================================
-- INSTRUCTIONS :
--   Exécuter APRÈS le fichier 1_CREER_TABLES.sql
--   Copier-coller chaque bloc UN PAR UN dans pgAdmin ou psql
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- BLOC A — ÉTAT GÉNÉRAL DE TOUS LES COMPTES
-- ════════════════════════════════════════════════════════════════

SELECT
    code_unique  AS matricule,
    nom,
    prenom,
    role_actuel  AS role,
    CASE
        WHEN mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        WHEN mot_de_passe IS NULL        THEN '⚪ Sans mot de passe'
        ELSE                                  '🟢 Prêt à se connecter'
    END          AS statut
FROM authentification.comptes
ORDER BY
    CASE role_actuel
        WHEN 'DIRECTION'   THEN 1
        WHEN 'SURVEILLANT' THEN 2
        WHEN 'PROFESSEUR'  THEN 3
        WHEN 'ELEVE'       THEN 4
        WHEN 'PARENT'      THEN 5
        WHEN 'ALUMNI'      THEN 6
        ELSE 7
    END,
    nom, prenom;


-- ════════════════════════════════════════════════════════════════
-- BLOC B — DIRECTION (matricules pour se connecter)
-- ════════════════════════════════════════════════════════════════

SELECT
    c.code_unique        AS matricule,
    c.nom,
    c.prenom,
    adm.poste_occupe     AS fonction,
    CASE
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        ELSE '🟢 Prêt'
    END                  AS statut
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'DIRECTION'
ORDER BY c.nom;


-- ════════════════════════════════════════════════════════════════
-- BLOC C — SURVEILLANTS (matricules pour se connecter)
-- ════════════════════════════════════════════════════════════════

SELECT
    c.code_unique        AS matricule,
    c.nom,
    c.prenom,
    adm.poste_occupe     AS fonction,
    CASE
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        ELSE '🟢 Prêt'
    END                  AS statut
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'SURVEILLANT'
ORDER BY c.nom;


-- ════════════════════════════════════════════════════════════════
-- BLOC D — TOUS LES ÉLÈVES avec classe et numéro
-- ════════════════════════════════════════════════════════════════

SELECT
    c.code_unique       AS matricule,
    c.nom,
    c.prenom,
    p.classe_actuelle   AS classe,
    CASE
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        ELSE '🟢 Prêt'
    END                 AS statut
FROM authentification.comptes c
JOIN vie_scolaire.profils_eleves p ON c.id_user = p.id_user
WHERE c.role_actuel = 'ELEVE'
ORDER BY p.classe_actuelle, c.nom, c.prenom;


-- Un élève de test par classe (pour tester rapidement)
SELECT DISTINCT ON (p.classe_actuelle)
    c.code_unique     AS matricule,
    c.nom,
    c.prenom,
    p.classe_actuelle AS classe
FROM authentification.comptes c
JOIN vie_scolaire.profils_eleves p ON c.id_user = p.id_user
WHERE c.role_actuel = 'ELEVE'
ORDER BY p.classe_actuelle, c.nom;


-- ════════════════════════════════════════════════════════════════
-- BLOC E — TOUS LES PARENTS avec leur numéro
-- ════════════════════════════════════════════════════════════════

SELECT
    c.code_unique  AS matricule,
    c.nom,
    c.prenom,
    CASE
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        ELSE '🟢 Prêt'
    END            AS statut
FROM authentification.comptes c
WHERE c.role_actuel = 'PARENT'
ORDER BY c.nom, c.prenom;


-- ════════════════════════════════════════════════════════════════
-- BLOC F — TOUS LES ALUMNI
-- ════════════════════════════════════════════════════════════════

SELECT
    code_unique AS matricule,
    nom,
    prenom,
    CASE
        WHEN mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        ELSE '🟢 Prêt'
    END         AS statut
FROM authentification.comptes
WHERE role_actuel = 'ALUMNI'
ORDER BY nom;


-- ════════════════════════════════════════════════════════════════
-- BLOC G — ACTIVATION DES COMPTES
-- (copier le bloc correspondant au rôle voulu)
-- ════════════════════════════════════════════════════════════════

-- Activer UN compte précis
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE code_unique = 'REMPLACER_PAR_MATRICULE';

-- Activer la DIRECTION
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE role_actuel = 'DIRECTION';

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

-- Activer TOUT LE MONDE d'un seul coup (utile pour les tests)
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE';


-- ════════════════════════════════════════════════════════════════
-- BLOC H — LIENS PARENT → ENFANT
-- ════════════════════════════════════════════════════════════════

SELECT
    parent.code_unique   AS matricule_parent,
    parent.nom           AS nom_parent,
    parent.prenom        AS prenom_parent,
    enfant.code_unique   AS matricule_enfant,
    enfant.nom           AS nom_enfant,
    enfant.prenom        AS prenom_enfant,
    pe.classe_actuelle   AS classe_enfant,
    r.lien_parente
FROM vie_scolaire.relations_parents_eleves r
JOIN authentification.comptes parent ON r.id_parent = parent.id_user
JOIN authentification.comptes enfant ON r.id_eleve  = enfant.id_user
JOIN vie_scolaire.profils_eleves pe  ON enfant.id_user = pe.id_user
ORDER BY parent.nom, parent.prenom;


-- Lier un parent à son enfant (remplacer les matricules)
INSERT INTO vie_scolaire.relations_parents_eleves (id_parent, id_eleve, lien_parente)
SELECT
    (SELECT id_user FROM authentification.comptes WHERE code_unique = 'MATRICULE_PARENT'),
    (SELECT id_user FROM authentification.comptes WHERE code_unique = 'MATRICULE_ENFANT'),
    'Père'
ON CONFLICT (id_parent, id_eleve) DO NOTHING;


-- ════════════════════════════════════════════════════════════════
-- BLOC I — DONNÉES VIE SCOLAIRE (après saisie par surveillant)
-- ════════════════════════════════════════════════════════════════

-- Toutes les absences
SELECT
    a.date_absence,
    c.code_unique    AS matricule,
    c.nom,
    c.prenom,
    p.classe_actuelle,
    CASE WHEN a.justifiee THEN '✅ Justifiée' ELSE '❌ Non justifiée' END AS statut,
    a.raison_absence
FROM gestion.absences a
JOIN authentification.comptes c      ON a.id_eleve = c.id_user
JOIN vie_scolaire.profils_eleves p   ON c.id_user  = p.id_user
ORDER BY a.date_absence DESC;


-- Toutes les convocations
SELECT
    conv.date_convocation,
    conv.sujet,
    conv.motif,
    c.code_unique    AS matricule_eleve,
    c.nom,
    c.prenom,
    p.classe_actuelle
FROM gestion.convocations conv
JOIN authentification.comptes c     ON conv.id_eleve = c.id_user
JOIN vie_scolaire.profils_eleves p  ON c.id_user = p.id_user
ORDER BY conv.date_convocation DESC;


-- Tous les incidents signalés
SELECT
    i.date_signalement,
    i.titre,
    i.type_incident,
    i.urgence,
    c.nom    AS signale_par_nom,
    c.prenom AS signale_par_prenom
FROM gestion.incidents i
JOIN authentification.comptes c ON i.signale_par = c.id_user
ORDER BY
    CASE i.urgence
        WHEN 'HAUTE'   THEN 1
        WHEN 'NORMALE' THEN 2
        WHEN 'BASSE'   THEN 3
    END,
    i.date_signalement DESC;


-- Toutes les annonces officielles publiées
SELECT
    a.date_publication,
    a.titre,
    a.type,
    c.nom        AS publie_par,
    c.role_actuel
FROM gestion.annonces_officielles a
JOIN authentification.comptes c ON a.publie_par = c.id_user
ORDER BY a.date_publication DESC;


-- ════════════════════════════════════════════════════════════════
-- BLOC J — NOTES ET BULLETINS (après saisie par professeur)
-- ════════════════════════════════════════════════════════════════

-- Toutes les notes enregistrées
SELECT
    c.code_unique      AS matricule,
    c.nom,
    c.prenom,
    m.libelle_matiere  AS matiere,
    n.note,
    n.trimestre,
    n.annee_scolaire
FROM pedagogie.notes_evaluations n
JOIN authentification.comptes c ON n.id_eleve   = c.id_user
JOIN pedagogie.matieres m       ON n.id_matiere = m.id_matiere
ORDER BY c.nom, n.trimestre, m.libelle_matiere;


-- Moyenne générale par élève (Trimestre 1)
SELECT
    c.code_unique        AS matricule,
    c.nom,
    c.prenom,
    p.classe_actuelle    AS classe,
    ROUND(AVG(n.note)::NUMERIC, 2) AS moyenne
FROM pedagogie.notes_evaluations n
JOIN authentification.comptes c      ON n.id_eleve = c.id_user
JOIN vie_scolaire.profils_eleves p   ON c.id_user  = p.id_user
WHERE n.trimestre = 1
GROUP BY c.id_user, c.code_unique, c.nom, c.prenom, p.classe_actuelle
ORDER BY moyenne DESC;


-- ════════════════════════════════════════════════════════════════
-- BLOC K — RÉSUMÉ SYSTÈME (diagnostic rapide)
-- ════════════════════════════════════════════════════════════════

SELECT
    role_actuel                                                     AS role,
    COUNT(*)                                                        AS total,
    SUM(CASE WHEN mot_de_passe != 'NON_ACTIVE' THEN 1 ELSE 0 END)  AS actives,
    SUM(CASE WHEN mot_de_passe  = 'NON_ACTIVE' THEN 1 ELSE 0 END)  AS a_activer
FROM authentification.comptes
GROUP BY role_actuel
ORDER BY
    CASE role_actuel
        WHEN 'DIRECTION'   THEN 1
        WHEN 'SURVEILLANT' THEN 2
        WHEN 'ELEVE'       THEN 4
        WHEN 'PARENT'      THEN 5
        WHEN 'ALUMNI'      THEN 6
        ELSE 7
    END;
