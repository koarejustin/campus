-- Liste toutes les matières de tous les profs pour repérage visuel
-- (plus fiable que du filtrage automatique vu les soucis d'encodage terminal)
SELECT c.nom, c.prenom, pp.matieres
FROM pedagogie.profils_profs pp
JOIN authentification.comptes c ON c.id_user = pp.id_user
ORDER BY c.nom;
