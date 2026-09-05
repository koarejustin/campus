-- =============================================================================
-- SCRIPT 17 : MATIERES - BURKINA FASO
-- Peuple pedagogie.matieres (les matières réellement enseignées), utilisée
-- comme référence par toutes les notes/évaluations (id_matiere en clé
-- étrangère un peu partout : notes_evaluations, cahiers de texte, QCM...).
--
-- ⚠️ DANGER si relancé sur une base déjà en service : TRUNCATE ... CASCADE
-- supprime aussi toutes les notes déjà enregistrées (elles référencent
-- id_matiere). Ce script est fait pour l'installation initiale d'un
-- nouvel établissement — jamais sur une base avec de vraies notes dedans.
--
-- ⚠️ Le "coefficient" ci-dessous est UNIQUE PAR MATIÈRE (une seule valeur
-- pour "Mathématiques", par exemple) — la vraie structure du Burkina Faso
-- donne un coefficient DIFFÉRENT selon la classe et la série (Maths pèse
-- 3 en 6ème, 5 en Tle C, 2 en 1ère A...). Une table à une seule colonne
-- ne peut PAS représenter ça. C'est pour cette raison que le calcul réel
-- des moyennes n'utilise JAMAIS cette colonne : il vit entièrement dans
-- services/moyennesEngine.js (objet PROGRAMMES, un barème complet par
-- classe). Le coefficient stocké ici sert seulement d'indication par
-- défaut ailleurs dans l'appli (ex: liste des matières côté Corps
-- Enseignant) — pas au calcul du bulletin. Si tu changes un coefficient
-- dans moyennesEngine.js, tu n'as RIEN à changer ici : ce sont deux
-- systèmes séparés et c'est volontaire.
-- =============================================================================

-- 1. Suppression des anciennes données pour repartir de zéro
TRUNCATE TABLE pedagogie.matieres CASCADE;

-- 2. TABLE MATIERES — nom + coefficient indicatif.
-- Schéma réel : pedagogie.matieres(id_matiere SERIAL, nom_matiere VARCHAR,
-- coefficient INTEGER) — pas de colonne domaine ni UUID.
-- ============================================
INSERT INTO pedagogie.matieres (nom_matiere, coefficient) VALUES
    ('Mathematiques', 3),
    ('Francais', 3),
    ('SVT', 2),
    ('Physique-Chimie', 2),
    ('Anglais', 2),
    ('Histoire-Geographie', 2),
    ('EPS', 1),
    ('Philosophie', 3),
    ('Allemand', 1),
    ('ECM', 1),
    ('Arts Plastiques', 1);

-- 3. VÉRIFICATION
SELECT nom_matiere, coefficient FROM pedagogie.matieres ORDER BY id_matiere;

-- ── Pour voir le VRAI barème par classe (celui qui compte réellement) ──
-- ouvre services/moyennesEngine.js et regarde l'objet PROGRAMMES.
