-- 1. NOMINATION AU BUREAU APE
-- On prend Karim (notre parent de test) et on le nomme President
INSERT INTO gestion_ape.bureau_direction (id_parent, poste, date_nomination, peut_signer_documents)
SELECT id_parent, 'PRESIDENT', CURRENT_DATE, TRUE 
FROM gestion_ape.profils_parents 
WHERE id_user = (SELECT id_user FROM authentification.comptes WHERE code_unique = 'PAR001');

-- 2. AJOUT D'UN MEMBRE ACTIF
-- (Supposons qu'on cree un autre parent rapidement)
INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, est_actif, mot_de_passe)
VALUES ('PAR002', 'DIALLO', 'Mariam', 'PARENT', TRUE, 'pwd_mariam');

INSERT INTO gestion_ape.profils_parents (id_user, profession)
SELECT id_user, 'Medecin' FROM authentification.comptes WHERE code_unique = 'PAR002';

INSERT INTO gestion_ape.bureau_direction (id_parent, poste)
SELECT id_parent, 'TRESORIER' FROM gestion_ape.profils_parents 
WHERE id_user = (SELECT id_user FROM authentification.comptes WHERE code_unique = 'PAR002');


SELECT 
    c.nom, 
    c.prenom, 
    b.poste, 
    b.date_nomination,
    b.peut_signer_documents
FROM gestion_ape.bureau_direction b
JOIN gestion_ape.profils_parents pp ON b.id_parent = pp.id_parent
JOIN authentification.comptes c ON pp.id_user = c.id_user;