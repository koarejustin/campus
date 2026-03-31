-- Compter par rôle
SELECT role_actuel, COUNT(*) 
FROM authentification.comptes 
GROUP BY role_actuel 
ORDER BY role_actuel;

-- Liste des comptes à activer (NON_ACTIVE)
SELECT code_unique, nom, prenom, role_actuel 
FROM authentification.comptes 
WHERE mot_de_passe = 'NON_ACTIVE' 
ORDER BY role_actuel, nom;