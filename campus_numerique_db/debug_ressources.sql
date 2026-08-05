-- Test exact de la requête getRessources pour Tatiana (Tle D)
SELECT
    rp.id_ressource,
    rp.titre,
    rp.type_document,
    rp.classe_concernee,
    rp.est_visible,
    pp.id_prof,
    pp.id_user,
    c.nom,
    c.prenom
FROM pedagogie.ressources_pedagogiques rp
JOIN pedagogie.profils_profs pp ON pp.id_prof = rp.id_prof
JOIN authentification.comptes c ON c.id_user = pp.id_user
WHERE rp.est_visible = true
  AND (
    rp.classe_concernee = 'Tle D'
    OR rp.classe_concernee = 'TOUTES'
    OR rp.classe_concernee IS NULL
  )
ORDER BY rp.date_depot DESC
LIMIT 5;

-- Si 0 résultats, tester sans filtre classe
SELECT COUNT(*) AS sans_filtre_classe
FROM pedagogie.ressources_pedagogiques rp
JOIN pedagogie.profils_profs pp ON pp.id_prof = rp.id_prof
JOIN authentification.comptes c ON c.id_user = pp.id_user
WHERE rp.est_visible = true;
