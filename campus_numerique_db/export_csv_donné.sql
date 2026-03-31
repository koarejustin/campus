-- Méthode 1 : Une seule ligne (recommandé)
\copy (SELECT code_unique, nom, prenom, role_actuel, email, telephone, CASE WHEN est_actif THEN 'Actif' ELSE 'Inactif' END AS statut, to_char(date_creation, 'YYYY-MM-DD') AS date_inscription, to_char(derniere_connexion, 'YYYY-MM-DD HH24:MI') AS derniere_connexion FROM authentification.comptes ORDER BY role_actuel, nom, prenom) TO '/tmp/utilisateurs.csv' CSV HEADER;

-- Méthode 2 : Si la ligne est trop longue, utiliser \o
\o /tmp/utilisateurs.csv
SELECT 
    code_unique,
    nom,
    prenom,
    role_actuel,
    email,
    telephone,
    CASE WHEN est_actif THEN 'Actif' ELSE 'Inactif' END AS statut,
    to_char(date_creation, 'YYYY-MM-DD') AS date_inscription,
    to_char(derniere_connexion, 'YYYY-MM-DD HH24:MI') AS derniere_connexion
FROM authentification.comptes
ORDER BY role_actuel, nom, prenom;
\o