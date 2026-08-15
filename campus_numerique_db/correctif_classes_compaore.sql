UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY['Tle A', U&'1\00E8re A', '2nde A']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'COMPAORE' AND c.prenom = 'Jean-Pierre';

-- Vérification (regarde surtout via la page "Mon Profil" dans le navigateur)
SELECT c.nom, c.prenom, pp.classes
FROM authentification.comptes c
JOIN pedagogie.profils_profs pp ON pp.id_user = c.id_user
WHERE c.nom = 'COMPAORE';
