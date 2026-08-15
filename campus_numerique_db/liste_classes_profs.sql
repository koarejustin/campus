SELECT c.nom, c.prenom, pp.classes
FROM pedagogie.profils_profs pp
JOIN authentification.comptes c ON c.id_user = pp.id_user
ORDER BY c.nom;
