-- ============================================================
-- VOIR LES ALUMNI (anciens élèves)
-- ============================================================

SELECT c.code_unique, c.nom, c.prenom, c.email, c.est_actif
FROM authentification.comptes c
WHERE c.role_actuel = 'ALUMNI'
ORDER BY c.nom, c.prenom;

-- Avec leur profil détaillé (parcours, métier, mentorat)
SELECT
    c.code_unique, c.nom, c.prenom,
    pa.derniere_classe, pa.annee_diplome, pa.situation_actuelle,
    pa.poste_actuel, pa.entreprise_actuelle, pa.disponible_mentorat
FROM authentification.comptes c
JOIN gestion_ape.profils_alumni pa ON pa.id_user = c.id_user
WHERE c.role_actuel = 'ALUMNI'
ORDER BY pa.annee_diplome DESC;
