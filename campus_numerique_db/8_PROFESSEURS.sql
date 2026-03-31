-- ===========================================================
-- SCRIPT 8 — GESTION DES PROFESSEURS
-- Campus Numérique FASO · 2025-2026
-- ===========================================================
-- ORDRE D'EXÉCUTION :
--   1. Créer la table profils_profs (si pas encore fait)
--   2. Insérer les comptes professeurs
--   3. Insérer leurs profils pédagogiques
--   4. Requêtes de consultation & maintenance
-- ===========================================================


-- ===========================================================
-- ÉTAPE 1 — TABLE profils_profs
-- ===========================================================
CREATE TABLE IF NOT EXISTS pedagogie.profils_profs (
    id_prof       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user       UUID UNIQUE NOT NULL REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    matieres      TEXT[],           -- ex: ARRAY['Mathématiques','Physique']
    classes       TEXT[],           -- ex: ARRAY['Tle D','1ère D','2nde C']
    diplome       VARCHAR(150),     -- ex: 'Licence Mathématiques - Université de Ouaga'
    annees_exp    SMALLINT DEFAULT 0,
    telephone     VARCHAR(20),
    photo_url     TEXT,
    biographie    TEXT,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ===========================================================
-- ÉTAPE 2 — INSÉRER LES COMPTES PROFESSEURS
-- Les mots de passe sont mis à 'NON_ACTIVE' → chaque prof
-- définira son propre mot de passe à la première connexion.
-- ===========================================================
INSERT INTO authentification.comptes
    (code_unique, nom, prenom, email, role_actuel, mot_de_passe, est_actif, date_creation)
VALUES
  ('PROF-2026-001','KABORE','Marie',        'marie.kabore@campusfaso.bf',    'PROFESSEUR','NON_ACTIVE',TRUE, NOW()),
  ('PROF-2026-002','TRAORE','Ibrahim',      'ibrahim.traore@campusfaso.bf',  'PROFESSEUR','NON_ACTIVE',TRUE, NOW()),
  ('PROF-2026-003','OUEDRAOGO','Paul',      'paul.ouedraogo@campusfaso.bf',  'PROFESSEUR','NON_ACTIVE',TRUE, NOW()),
  ('PROF-2026-004','NANA','Sophie',         'sophie.nana@campusfaso.bf',     'PROFESSEUR','NON_ACTIVE',TRUE, NOW()),
  ('PROF-2026-005','ZONGO','Charles',       'charles.zongo@campusfaso.bf',   'PROFESSEUR','NON_ACTIVE',TRUE, NOW()),
  ('PROF-2026-006','SOME','Honorine',       'honorine.some@campusfaso.bf',   'PROFESSEUR','NON_ACTIVE',TRUE, NOW()),
  ('PROF-2026-007','DIALLO','Moussa',       'moussa.diallo@campusfaso.bf',   'PROFESSEUR','NON_ACTIVE',TRUE, NOW()),
  ('PROF-2026-008','TAPSOBA','Rasmata',     'rasmata.tapsoba@campusfaso.bf', 'PROFESSEUR','NON_ACTIVE',TRUE, NOW()),
  ('PROF-2026-009','SAWADOGO','Alimata',    'alimata.sawadogo@campusfaso.bf','PROFESSEUR','NON_ACTIVE',TRUE, NOW()),
  ('PROF-2026-010','COMPAORE','Jean-Pierre','jp.compaore@campusfaso.bf',     'PROFESSEUR','NON_ACTIVE',TRUE, NOW())
ON CONFLICT (code_unique) DO NOTHING;


-- ===========================================================
-- ÉTAPE 3 — INSÉRER LES PROFILS PÉDAGOGIQUES
-- ===========================================================
INSERT INTO pedagogie.profils_profs (id_user, matieres, classes, diplome, annees_exp, telephone)
SELECT id_user,
    ARRAY['Mathématiques','Physique-Chimie'],
    ARRAY['Tle D','1ère D','2nde C','3ème'],
    'Licence Mathématiques · Université de Ouagadougou', 8, '+226 70 00 00 01'
FROM authentification.comptes WHERE code_unique = 'PROF-2026-001'
ON CONFLICT (id_user) DO NOTHING;

INSERT INTO pedagogie.profils_profs (id_user, matieres, classes, diplome, annees_exp, telephone)
SELECT id_user,
    ARRAY['Français','Philosophie'],
    ARRAY['Tle A','1ère A','2nde A'],
    'Master Lettres Modernes · Université Ouaga 1', 12, '+226 70 00 00 02'
FROM authentification.comptes WHERE code_unique = 'PROF-2026-002'
ON CONFLICT (id_user) DO NOTHING;

INSERT INTO pedagogie.profils_profs (id_user, matieres, classes, diplome, annees_exp, telephone)
SELECT id_user,
    ARRAY['Anglais'],
    ARRAY['Tle A','Tle D','1ère A','1ère D','2nde A','2nde C'],
    'Licence LEA · Université Ouaga 2', 6, '+226 70 00 00 03'
FROM authentification.comptes WHERE code_unique = 'PROF-2026-003'
ON CONFLICT (id_user) DO NOTHING;

INSERT INTO pedagogie.profils_profs (id_user, matieres, classes, diplome, annees_exp, telephone)
SELECT id_user,
    ARRAY['Histoire-Géographie'],
    ARRAY['3ème','4ème','5ème','6ème'],
    'Licence Histoire · Université de Koudougou', 5, '+226 70 00 00 04'
FROM authentification.comptes WHERE code_unique = 'PROF-2026-004'
ON CONFLICT (id_user) DO NOTHING;

INSERT INTO pedagogie.profils_profs (id_user, matieres, classes, diplome, annees_exp, telephone)
SELECT id_user,
    ARRAY['SVT','Sciences de la Vie'],
    ARRAY['Tle D','1ère D','2nde C','3ème','4ème'],
    'Licence Biologie · Université Joseph Ki-Zerbo', 9, '+226 70 00 00 05'
FROM authentification.comptes WHERE code_unique = 'PROF-2026-005'
ON CONFLICT (id_user) DO NOTHING;

INSERT INTO pedagogie.profils_profs (id_user, matieres, classes, diplome, annees_exp, telephone)
SELECT id_user,
    ARRAY['Français'],
    ARRAY['3ème','4ème','5ème','6ème'],
    'Licence Lettres · Université de Ouagadougou', 7, '+226 70 00 00 06'
FROM authentification.comptes WHERE code_unique = 'PROF-2026-006'
ON CONFLICT (id_user) DO NOTHING;

INSERT INTO pedagogie.profils_profs (id_user, matieres, classes, diplome, annees_exp, telephone)
SELECT id_user,
    ARRAY['Mathématiques'],
    ARRAY['5ème','6ème','4ème'],
    'Licence Mathématiques · Université de Koudougou', 4, '+226 70 00 00 07'
FROM authentification.comptes WHERE code_unique = 'PROF-2026-007'
ON CONFLICT (id_user) DO NOTHING;

INSERT INTO pedagogie.profils_profs (id_user, matieres, classes, diplome, annees_exp, telephone)
SELECT id_user,
    ARRAY['Informatique','Technologie'],
    ARRAY['Tle A','Tle D','1ère A','1ère D'],
    'Licence Informatique · 2iE Ouagadougou', 3, '+226 70 00 00 08'
FROM authentification.comptes WHERE code_unique = 'PROF-2026-008'
ON CONFLICT (id_user) DO NOTHING;

INSERT INTO pedagogie.profils_profs (id_user, matieres, classes, diplome, annees_exp, telephone)
SELECT id_user,
    ARRAY['EPS','Sport'],
    ARRAY['Tle A','Tle D','1ère A','1ère D','2nde A','2nde C','3ème','4ème','5ème','6ème'],
    'Licence STAPS · INJEPS Ouagadougou', 11, '+226 70 00 00 09'
FROM authentification.comptes WHERE code_unique = 'PROF-2026-009'
ON CONFLICT (id_user) DO NOTHING;

INSERT INTO pedagogie.profils_profs (id_user, matieres, classes, diplome, annees_exp, telephone)
SELECT id_user,
    ARRAY['Économie','Gestion'],
    ARRAY['Tle A','1ère A','2nde A'],
    'Master Économie · Université Ouaga 2', 15, '+226 70 00 00 10'
FROM authentification.comptes WHERE code_unique = 'PROF-2026-010'
ON CONFLICT (id_user) DO NOTHING;


-- ===========================================================
-- ÉTAPE 4 — REQUÊTES DE CONSULTATION
-- ===========================================================

-- ── A. VOIR TOUS LES PROFESSEURS + STATUT MOT DE PASSE ──
SELECT
    c.code_unique                               AS matricule,
    c.nom,
    c.prenom,
    c.email,
    CASE
        WHEN c.mot_de_passe = 'NON_ACTIVE'       THEN '🔴 Pas encore connecté'
        WHEN c.mot_de_passe IS NULL              THEN '⚪ Aucun mot de passe'
        ELSE                                          '🟢 Actif (mot de passe hashé)'
    END                                         AS statut_mdp,
    c.est_actif,
    c.date_creation                             AS date_inscription
FROM authentification.comptes c
WHERE c.role_actuel = 'PROFESSEUR'
ORDER BY c.nom, c.prenom;


-- ── B. PROFESSEURS + DÉTAILS PÉDAGOGIQUES COMPLETS ──
SELECT
    c.code_unique                               AS matricule,
    c.nom,
    c.prenom,
    c.email,
    p.matieres,
    p.classes,
    p.diplome,
    p.annees_exp                                AS années_expérience,
    p.telephone,
    CASE
        WHEN c.mot_de_passe = 'NON_ACTIVE'       THEN '🔴 À activer'
        ELSE                                          '🟢 Connecté'
    END                                         AS statut,
    c.est_actif
FROM authentification.comptes c
LEFT JOIN pedagogie.profils_profs p ON c.id_user = p.id_user
WHERE c.role_actuel = 'PROFESSEUR'
ORDER BY c.nom;


-- ── C. VOIR QUELLES MATIÈRES ENSEIGNE CHAQUE PROF (format lisible) ──
SELECT
    c.code_unique                               AS matricule,
    c.prenom || ' ' || c.nom                    AS professeur,
    array_to_string(p.matieres, ' · ')          AS matières_enseignées,
    array_to_string(p.classes,  ' | ')          AS classes_attribuées,
    p.annees_exp || ' ans'                      AS expérience
FROM authentification.comptes c
JOIN pedagogie.profils_profs p ON c.id_user = p.id_user
WHERE c.role_actuel = 'PROFESSEUR'
ORDER BY c.nom;


-- ── D. PROFS QUI NE SE SONT PAS ENCORE CONNECTÉS (à relancer) ──
SELECT
    c.code_unique                               AS matricule,
    c.prenom || ' ' || c.nom                    AS professeur,
    c.email
FROM authentification.comptes c
WHERE c.role_actuel = 'PROFESSEUR'
    AND c.mot_de_passe = 'NON_ACTIVE'
ORDER BY c.nom;


-- ── E. PROFS SANS PROFIL PÉDAGOGIQUE (diagnostic) ──
SELECT
    c.code_unique                               AS matricule,
    c.nom,
    c.prenom
FROM authentification.comptes c
LEFT JOIN pedagogie.profils_profs p ON c.id_user = p.id_user
WHERE c.role_actuel = 'PROFESSEUR'
    AND p.id_user IS NULL;


-- ===========================================================
-- MAINTENANCE
-- ===========================================================

-- ── RÉINITIALISER LE MOT DE PASSE D'UN PROF (premier accès) ──
-- Remplace PROF-2026-001 par le matricule voulu
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE code_unique = 'PROF-2026-001';

-- ── RÉINITIALISER TOUS LES PROFS D'UN COUP ──
UPDATE authentification.comptes
SET mot_de_passe = 'NON_ACTIVE'
WHERE role_actuel = 'PROFESSEUR';

-- ── DÉSACTIVER UN PROF (départ de l'établissement) ──
UPDATE authentification.comptes
SET est_actif = FALSE
WHERE code_unique = 'PROF-2026-001';

-- ── CHANGER L'EMAIL D'UN PROF ──
UPDATE authentification.comptes
SET email = 'nouvel.email@campusfaso.bf'
WHERE code_unique = 'PROF-2026-001';

-- ── AJOUTER UNE MATIÈRE À UN PROF EXISTANT ──
UPDATE pedagogie.profils_profs
SET matieres = array_append(matieres, 'Informatique'),
    updated_at = NOW()
WHERE id_user = (SELECT id_user FROM authentification.comptes WHERE code_unique = 'PROF-2026-001');

-- ── CHANGER LES CLASSES D'UN PROF ──
UPDATE pedagogie.profils_profs
SET classes = ARRAY['Tle D','1ère D'],
    updated_at = NOW()
WHERE id_user = (SELECT id_user FROM authentification.comptes WHERE code_unique = 'PROF-2026-001');

