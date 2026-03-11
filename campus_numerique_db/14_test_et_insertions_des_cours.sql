-- Création de la table cours si elle n'existe pas
CREATE TABLE IF NOT EXISTS authentification.cours (
    id_cours SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    enseignant VARCHAR(100),
    description TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajout de cours de test (seulement s'il n'y en a pas)
INSERT INTO authentification.cours (titre, enseignant, description)
VALUES 
('Programmation Node.js', 'Justin Koare', 'Apprendre à créer des API sécurisées.'),
('Base de données PostgreSQL', 'Justin Koare', 'Maîtriser SQL et les relations.'),
('Sécurité Web et JWT', 'Justin Koare', 'Protéger les applications avec des tokens.');


INSERT INTO authentification.cours (titre, enseignant, description)
VALUES ('Sécurité Réseaux', 'Justin Koare', 'Introduction aux pare-feu et serveurs sécurisés.');



SELECT code_unique, nom, est_actif, mot_de_passe 
FROM authentification.comptes;

SELECT code_unique, est_actif FROM authentification.comptes WHERE code_unique = 'ELE002';f


UPDATE authentification.cours 
SET titre = 'Securite Web et JWT', 
    description = 'Proteger les applications avec des tokens.' 
WHERE id_cours = 3;

UPDATE authentification.cours 
SET titre = 'Securite Reseaux', 
    description = 'Introduction aux pare-feu et serveurs securises.' 
WHERE id_cours = 4;

UPDATE authentification.cours 
SET titre = 'Base de donnees PostgreSQL', 
    description = 'Maitriser SQL et les relations.' 
WHERE id_cours = 2;

UPDATE authentification.cours 
SET titre = 'Programmation Node.js', 
    description = 'Apprendre a creer des API securisees.' 
WHERE id_cours = 1;

INSERT INTO authentification.cours (titre, enseignant, description, coefficient) VALUES 
('Mathematiques', 'M. SAWADOGO', 'Algebre, Geometrie et Analyse.', 5),
('Anglais', 'Mme OUEDRAOGO', 'Grammar, Vocabulary and Communication.', 2),
('EPS', 'M. TRAORE', 'Education Physique et Sportive.', 2);

INSERT INTO authentification.cours (titre, enseignant, description, coefficient) VALUES 
('Histoire', 'M. KONATE', 'Histoire du Burkina Faso et de l Afrique.', 3),
('Geographie', 'Mme SOME', 'Etude des climats et de la demographie.', 3),
('SVT', 'Dr. ILBOUDO', 'Sciences de la Vie et de la Terre : Biologie humaine.', 4);

INSERT INTO authentification.cours (titre, enseignant, description, coefficient) VALUES 
('Physique-Chimie', 'M. SAWADOGO', 'Etude de la matiere, des molecules et de l energie.', 4);
INSERT INTO authentification.cours (titre, enseignant, description, coefficient) VALUES 
('Philosophie', 'M. OUATTARA', 'Introduction a la pensee critique, la morale et la metaphysique.', 4);

-- On assigne la classe à l'élève KAMBOU (ELE002)
UPDATE authentification.comptes SET classe = 'Terminale' WHERE code_unique = 'ELE002';

-- On assigne la classe à tes nouveaux cours
UPDATE authentification.cours SET classe = '6eme' WHERE titre IN ('Anglais', 'Histoire', 'Geographie');
UPDATE authentification.cours SET classe = 'Terminale' WHERE titre IN ('Philosophie', 'Physique-Chimie', 'SVT');


-- On s'assure que les classes sont bien définies
UPDATE authentification.cours SET classe = '6eme' WHERE titre IN ('Histoire', 'Geographie');
UPDATE authentification.cours SET classe = '3eme' WHERE titre IN ('Physique-Chimie', 'SVT');
UPDATE authentification.cours SET classe = 'Terminale' WHERE titre IN ('Philosophie', 'Securite Web');