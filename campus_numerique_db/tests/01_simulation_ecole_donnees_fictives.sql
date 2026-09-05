-- =============================================================================
-- SCRIPT DE TEST : SIMULATION ECOLE (DONNEES FICTIVES)
-- =============================================================================

-- 1. CREATION DE MATIERES
INSERT INTO pedagogie.matieres (nom_matiere, coefficient) VALUES 
('Mathematiques', 5),
('Francais', 4),
('SVT', 3),
('Physique-Chimie', 3),
('Anglais', 2);

-- 2. CREATION D'UN COMPTE PROFESSEUR ET SON PROFIL
-- Mot de passe fictif : 'password123'
INSERT INTO authentification.comptes (code_unique, nom, prenom, email, role_actuel, est_actif, mot_de_passe)
VALUES ('PROF001', 'ZONGO', 'Issa', 'issa.zongo@test.bf', 'PROFESSEUR', TRUE, 'hash_fictif_123')
RETURNING id_user; -- Note l'ID genere pour l'etape suivante

-- On insere le profil (remplace l'ID si necessaire)
INSERT INTO pedagogie.profils_profs (id_user, specialite)
SELECT id_user, 'Sciences Exactes' FROM authentification.comptes WHERE code_unique = 'PROF001';

-- 3. CREATION D'UN COMPTE ELEVE ET SON PROFIL
INSERT INTO authentification.comptes (code_unique, nom, prenom, email, role_actuel, est_actif, mot_de_passe)
VALUES ('ELE001', 'OUEDRAOGO', 'Amina', 'amina@test.bf', 'ELEVE', TRUE, 'hash_fictif_456');

INSERT INTO vie_scolaire.profils_eleves (id_user, classe_actuelle, date_naissance)
SELECT id_user, '3eme A', '2010-05-15' FROM authentification.comptes WHERE code_unique = 'ELE001';

-- 4. INSERTION DE NOTES DE TEST
INSERT INTO pedagogie.notes (id_eleve, id_prof, id_matiere, valeur_note, trimestre, annee_scolaire, est_validee_par_direction)
SELECT 
    (SELECT id_eleve FROM vie_scolaire.profils_eleves LIMIT 1),
    (SELECT id_prof FROM pedagogie.profils_profs LIMIT 1),
    (SELECT id_matiere FROM pedagogie.matieres WHERE nom_matiere = 'Mathematiques'),
    15.5, 1, '2025-2026', TRUE;

INSERT INTO pedagogie.notes (id_eleve, id_prof, id_matiere, valeur_note, trimestre, annee_scolaire, est_validee_par_direction)
SELECT 
    (SELECT id_eleve FROM vie_scolaire.profils_eleves LIMIT 1),
    (SELECT id_prof FROM pedagogie.profils_profs LIMIT 1),
    (SELECT id_matiere FROM pedagogie.matieres WHERE nom_matiere = 'Francais'),
    12.0, 1, '2025-2026', FALSE; -- Celle-ci ne sera pas visible par le parent

    -- =============================================================================
-- SCRIPT DE TEST MASSIF : SIMULATION COMPLETE (DONNEES FICTIVES)
-- =============================================================================

-- 1. AJOUT DE MATIERES SUPPLEMENTAIRES
INSERT INTO pedagogie.matieres (nom_matiere, coefficient) VALUES 
('Histoire-Geographie', 3),
('EPS', 2),
('Philosophie', 4),
('Informatique', 2);

-- 2. CREATION DE PLUSIEURS PROFESSEURS
-- Prof de Lettres
INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, est_actif, mot_de_passe)
VALUES ('PROF002', 'SAWADOGO', 'Moussa', 'PROFESSEUR', TRUE, 'hash_test_2');

INSERT INTO pedagogie.profils_profs (id_user, specialite)
SELECT id_user, 'Lettres et Philosophie' FROM authentification.comptes WHERE code_unique = 'PROF002';

-- Prof de Sport
INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, est_actif, mot_de_passe)
VALUES ('PROF003', 'TRAORE', 'Sali', 'PROFESSEUR', TRUE, 'hash_test_3');

INSERT INTO pedagogie.profils_profs (id_user, specialite)
SELECT id_user, 'EPS' FROM authentification.comptes WHERE code_unique = 'PROF003';

-- 3. CREATION DE PLUSIEURS ELEVES
-- Eleve 2
INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, est_actif, mot_de_passe)
VALUES ('ELE002', 'KAMBOU', 'Sié', 'ELEVE', TRUE, 'hash_test_ele2');

INSERT INTO vie_scolaire.profils_eleves (id_user, classe_actuelle, date_naissance)
SELECT id_user, '3eme A', '2009-11-20' FROM authentification.comptes WHERE code_unique = 'ELE002';

-- Eleve 3 (Frere/Soeur de l'eleve 1 pour tester les familles)
INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, est_actif, mot_de_passe)
VALUES ('ELE003', 'OUEDRAOGO', 'Kader', 'ELEVE', TRUE, 'hash_test_ele3');

INSERT INTO vie_scolaire.profils_eleves (id_user, classe_actuelle, date_naissance)
SELECT id_user, '6eme B', '2013-02-10' FROM authentification.comptes WHERE code_unique = 'ELE003';

-- 4. CREATION D'UN PARENT ET LIAISONS FAMILIALES
INSERT INTO authentification.comptes (code_unique, nom, prenom, email, role_actuel, est_actif, mot_de_passe)
VALUES ('PAR001', 'OUEDRAOGO', 'Karim', 'karim.parent@test.bf', 'PARENT', TRUE, 'hash_test_par');

INSERT INTO gestion_ape.profils_parents (id_user, profession)
SELECT id_user, 'Entrepreneur' FROM authentification.comptes WHERE code_unique = 'PAR001';

-- Liaison du parent avec ses deux enfants (Amina et Kader)
INSERT INTO gestion_ape.liens_familiaux (id_tuteur, id_eleve, lien_parente)
SELECT 
    (SELECT id_parent FROM gestion_ape.profils_parents WHERE id_user = (SELECT id_user FROM authentification.comptes WHERE code_unique = 'PAR001')),
    id_eleve, 
    'PERE'
FROM vie_scolaire.profils_eleves 
WHERE id_user IN (SELECT id_user FROM authentification.comptes WHERE code_unique IN ('ELE001', 'ELE003'));

-- 5. INSERTION DE PLUSIEURS NOTES POUR TESTER LES MOYENNES
-- On met des notes a Amina (ELE001)
INSERT INTO pedagogie.notes (id_eleve, id_prof, id_matiere, valeur_note, trimestre, annee_scolaire, est_validee_par_direction)
SELECT 
    (SELECT id_eleve FROM vie_scolaire.profils_eleves pe JOIN authentification.comptes c ON pe.id_user = c.id_user WHERE c.code_unique = 'ELE001'),
    (SELECT id_prof FROM pedagogie.profils_profs pp JOIN authentification.comptes c ON pp.id_user = c.id_user WHERE c.code_unique = 'PROF002'),
    (SELECT id_matiere FROM pedagogie.matieres WHERE nom_matiere = 'Histoire-Geographie'),
    14.5, 1, '2025-2026', TRUE;

-- On met des notes a Sié (ELE002)
INSERT INTO pedagogie.notes (id_eleve, id_prof, id_matiere, valeur_note, trimestre, annee_scolaire, est_validee_par_direction)
SELECT 
    (SELECT id_eleve FROM vie_scolaire.profils_eleves pe JOIN authentification.comptes c ON pe.id_user = c.id_user WHERE c.code_unique = 'ELE002'),
    (SELECT id_prof FROM pedagogie.profils_profs pp JOIN authentification.comptes c ON pp.id_user = c.id_user WHERE c.code_unique = 'PROF001'),
    (SELECT id_matiere FROM pedagogie.matieres WHERE nom_matiere = 'Mathematiques'),
    08.0, 1, '2025-2026', TRUE;