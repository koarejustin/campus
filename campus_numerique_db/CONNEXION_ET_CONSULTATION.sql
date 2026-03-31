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
    m.nom_matiere      AS matiere,
    n.note,
    n.trimestre,
    n.annee_scolaire,
    n.date_evaluation AS date_saisie
FROM pedagogie.notes_evaluations n
JOIN authentification.comptes c ON n.id_eleve = c.id_user
JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
ORDER BY n.date_evaluation DESC
LIMIT 10;


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


    -- Supprimer toutes les annonces de vie_scolaire.annonces
DELETE FROM vie_scolaire.annonces;

-- Supprimer toutes les annonces de gestion.annonces_officielles  
DELETE FROM gestion.annonces_officielles;

-- Supprimer toutes les annonces de vie_scolaire.annonces_officielles
DELETE FROM vie_scolaire.annonces_officielles;

-- Supprimer tous les avis d'orientation
DELETE FROM pedagogie.avis_orientation;

DELETE FROM vie_scolaire.annonces;
DELETE FROM gestion.annonces_officielles;

campus_numerique_db=# SELECT DISTINCT classe_actuelle,
campus_numerique_db-#        octet_length(classe_actuelle),
campus_numerique_db-#        ascii(substring(classe_actuelle,2,1)) as deuxieme_char_code
campus_numerique_db-# FROM vie_scolaire.profils_eleves
campus_numerique_db-# ORDER BY classe_actuelle;
 classe_actuelle | octet_length | deuxieme_char_code
-----------------+--------------+--------------------
 1ère A          |            7 |                352
 1ère D          |            7 |                352
 2nde A          |            6 |                110
 2nde C          |            6 |                110
 3ème            |            5 |                352
 4ème            |            5 |                352
 5ème            |            5 |                352
 6ème            |            5 |                352
 Tle A           |            5 |                108
 Tle D           |            5 |                108
(10 lignes)


UPDATE vie_scolaire.profils_eleves 
SET classe_actuelle = convert_from('\x31c3a872652041', 'UTF8')
WHERE encode(classe_actuelle::bytea,'hex') = '31c5a072652041';

UPDATE vie_scolaire.profils_eleves 
SET classe_actuelle = convert_from('\x31c3a872652044', 'UTF8')
WHERE encode(classe_actuelle::bytea,'hex') = '31c5a072652044';

UPDATE vie_scolaire.profils_eleves 
SET classe_actuelle = convert_from('\x33c3a86d65', 'UTF8')
WHERE encode(classe_actuelle::bytea,'hex') = '33c5a06d65';

UPDATE vie_scolaire.profils_eleves 
SET classe_actuelle = convert_from('\x34c3a86d65', 'UTF8')
WHERE encode(classe_actuelle::bytea,'hex') = '34c5a06d65';

UPDATE vie_scolaire.profils_eleves 
SET classe_actuelle = convert_from('\x35c3a86d65', 'UTF8')
WHERE encode(classe_actuelle::bytea,'hex') = '35c5a06d65';

UPDATE vie_scolaire.profils_eleves 
SET classe_actuelle = convert_from('\x36c3a86d65', 'UTF8')
WHERE encode(classe_actuelle::bytea,'hex') = '36c5a06d65';



SELECT DISTINCT classe_actuelle, encode(classe_actuelle::bytea,'hex') FROM vie_scolaire.profils_eleves ORDER BY 1;


SELECT 
    m.nom_matiere,
    n.note,
    n.trimestre,
    n.date_evaluation
FROM pedagogie.notes_evaluations n
JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
WHERE n.id_eleve = (SELECT id_user FROM authentification.comptes WHERE code_unique = 'CN-2026-2009')
ORDER BY n.date_evaluation DESC;



-- Trouver les tables qui contiennent des messages
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%message%' OR table_name LIKE '%forum%';

-- Voir la structure de la table messages
\d messages
-- ou
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages';


-- Voir toutes les tables avec leurs schémas
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%message%' OR table_name LIKE '%forum%'
ORDER BY table_schema, table_name;

-- Voir les messages du forum de classe (principal)
SELECT * FROM vie_scolaire.forum_classe LIMIT 10;

-- Voir les messages de la salle des profs
SELECT * FROM pedagogie.messages_salle LIMIT 10;

-- Voir les messages des parents
SELECT * FROM gestion_ape.forum_parents LIMIT 10;

-- Voir les messages de prévention
SELECT * FROM gestion.messages_prevention LIMIT 10;

-- Voir les messages (si table existe)
SELECT * FROM gestion.messages LIMIT 10;




-- Compter les messages
SELECT 
    'vie_scolaire.forum_classe' as table_name, 
    COUNT(*) as total 
FROM vie_scolaire.forum_classe
UNION ALL
SELECT 'vie_scolaire.forum_classe_old', COUNT(*) FROM vie_scolaire.forum_classe_old
UNION ALL
SELECT 'pedagogie.messages_salle', COUNT(*) FROM pedagogie.messages_salle
UNION ALL
SELECT 'gestion_ape.forum_parents', COUNT(*) FROM gestion_ape.forum_parents
UNION ALL
SELECT 'gestion.messages_prevention', COUNT(*) FROM gestion.messages_prevention
UNION ALL
SELECT 'gestion.messages', COUNT(*) FROM gestion.messages
UNION ALL
SELECT 'gestion_ape.forum_likes', COUNT(*) FROM gestion_ape.forum_likes
UNION ALL
SELECT 'gestion_ape.forum_reactions', COUNT(*) FROM gestion_ape.forum_reactions;

-- Commencer une transaction
BEGIN;

-- Ajouter une colonne est_supprime si elle n'existe pas
ALTER TABLE vie_scolaire.forum_classe ADD COLUMN IF NOT EXISTS est_supprime BOOLEAN DEFAULT FALSE;
ALTER TABLE vie_scolaire.forum_classe_old ADD COLUMN IF NOT EXISTS est_supprime BOOLEAN DEFAULT FALSE;
ALTER TABLE pedagogie.messages_salle ADD COLUMN IF NOT EXISTS est_supprime BOOLEAN DEFAULT FALSE;
ALTER TABLE gestion_ape.forum_parents ADD COLUMN IF NOT EXISTS est_supprime BOOLEAN DEFAULT FALSE;
ALTER TABLE gestion.messages_prevention ADD COLUMN IF NOT EXISTS est_supprime BOOLEAN DEFAULT FALSE;
ALTER TABLE gestion.messages ADD COLUMN IF NOT EXISTS est_supprime BOOLEAN DEFAULT FALSE;

-- Soft delete : marquer comme supprimé
UPDATE vie_scolaire.forum_classe SET est_supprime = TRUE, contenu = '[Message supprimé]' WHERE est_supprime = FALSE;
UPDATE vie_scolaire.forum_classe_old SET est_supprime = TRUE, contenu = '[Message supprimé]' WHERE est_supprime = FALSE;
UPDATE pedagogie.messages_salle SET est_supprime = TRUE, contenu = '[Message supprimé]' WHERE est_supprime = FALSE;
UPDATE gestion_ape.forum_parents SET est_supprime = TRUE, contenu = '[Message supprimé]' WHERE est_supprime = FALSE;
UPDATE gestion.messages_prevention SET est_supprime = TRUE, contenu = '[Message supprimé]' WHERE est_supprime = FALSE;
UPDATE gestion.messages SET est_supprime = TRUE, contenu = '[Message supprimé]' WHERE est_supprime = FALSE;

-- Vérifier
SELECT 
    (SELECT COUNT(*) FROM vie_scolaire.forum_classe WHERE est_supprime = FALSE) as forum_restants,
    (SELECT COUNT(*) FROM pedagogie.messages_salle WHERE est_supprime = FALSE) as salle_restants;

-- Valider
COMMIT;

-- ⚠️ ATTENTION : Suppression définitive et irréversible

-- Faire une sauvegarde
CREATE TABLE messages_backup_20260322 AS 
SELECT 'vie_scolaire.forum_classe' as source, * FROM vie_scolaire.forum_classe;

INSERT INTO messages_backup_20260322 
SELECT 'vie_scolaire.forum_classe_old', * FROM vie_scolaire.forum_classe_old;

INSERT INTO messages_backup_20260322 
SELECT 'pedagogie.messages_salle', * FROM pedagogie.messages_salle;

INSERT INTO messages_backup_20260322 
SELECT 'gestion_ape.forum_parents', * FROM gestion_ape.forum_parents;

INSERT INTO messages_backup_20260322 
SELECT 'gestion.messages_prevention', * FROM gestion.messages_prevention;

INSERT INTO messages_backup_20260322 
SELECT 'gestion.messages', * FROM gestion.messages;

-- Vérifier la sauvegarde
SELECT source, COUNT(*) FROM messages_backup_20260322 GROUP BY source;

-- Supprimer définitivement
BEGIN;
DELETE FROM vie_scolaire.forum_classe;
DELETE FROM vie_scolaire.forum_classe_old;
DELETE FROM pedagogie.messages_salle;
DELETE FROM gestion_ape.forum_parents;
DELETE FROM gestion.messages_prevention;
DELETE FROM gestion.messages;
DELETE FROM gestion_ape.forum_likes;
DELETE FROM gestion_ape.forum_reactions;
DELETE FROM gestion_ape.forum_typing;
COMMIT;

-- Vérifier
SELECT 
    (SELECT COUNT(*) FROM vie_scolaire.forum_classe) as forum,
    (SELECT COUNT(*) FROM pedagogie.messages_salle) as salle;


    -- Voir les messages par classe
SELECT classe_cible, COUNT(*) 
FROM vie_scolaire.forum_classe 
GROUP BY classe_cible;

-- Supprimer les messages de la classe 3ème
DELETE FROM vie_scolaire.forum_classe 
WHERE classe_cible = '3ème';

-- Ou avec soft delete
UPDATE vie_scolaire.forum_classe 
SET est_supprime = TRUE 
WHERE classe_cible = '3ème';


-- Voir les messages du forum
SELECT * FROM vie_scolaire.forum_classe LIMIT 10;

-- Supprimer les messages du forum (soft delete)
BEGIN;
ALTER TABLE vie_scolaire.forum_classe ADD COLUMN IF NOT EXISTS est_supprime BOOLEAN DEFAULT FALSE;
UPDATE vie_scolaire.forum_classe SET est_supprime = TRUE;
COMMIT;

-- Ou suppression définitive
BEGIN;
DELETE FROM vie_scolaire.forum_classe;
COMMIT;


-- Voir combien de messages tu vas supprimer
SELECT 
    (SELECT COUNT(*) FROM vie_scolaire.forum_classe) as forum_classe,
    (SELECT COUNT(*) FROM vie_scolaire.forum_classe_old) as forum_old,
    (SELECT COUNT(*) FROM pedagogie.messages_salle) as salle,
    (SELECT COUNT(*) FROM gestion_ape.forum_parents) as parents;

-- Supprimer tout (hard delete)
BEGIN;
DELETE FROM vie_scolaire.forum_classe;
DELETE FROM vie_scolaire.forum_classe_old;
DELETE FROM pedagogie.messages_salle;
DELETE FROM gestion_ape.forum_parents;
DELETE FROM gestion.messages_prevention;
DELETE FROM gestion_ape.forum_likes;
DELETE FROM gestion_ape.forum_reactions;
COMMIT;

-- Vérifier que tout est vide
SELECT 
    (SELECT COUNT(*) FROM vie_scolaire.forum_classe) as forum_classe,
    (SELECT COUNT(*) FROM pedagogie.messages_salle) as salle;


    -- Voir les messages par classe
SELECT classe, COUNT(*)
FROM vie_scolaire.forum_classe
GROUP BY classe;