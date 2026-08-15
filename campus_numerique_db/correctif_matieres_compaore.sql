UPDATE pedagogie.profils_profs pp SET
    matieres = ARRAY[U&'\00C9conomie']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'COMPAORE' AND c.prenom = 'Jean-Pierre';

-- Vérification (le navigateur affichera "Économie" correctement même si
-- ton terminal PowerShell montre encore des caractères bizarres)
SELECT c.nom, c.prenom, pp.matieres
FROM authentification.comptes c
JOIN pedagogie.profils_profs pp ON pp.id_user = c.id_user
WHERE c.nom = 'COMPAORE';
