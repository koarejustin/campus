-- ============================================================
-- VOIR LES PARENTS
-- ============================================================

SELECT c.code_unique, c.nom, c.prenom, c.email, c.telephone, c.est_actif
FROM authentification.comptes c
WHERE c.role_actuel = 'PARENT'
ORDER BY c.nom, c.prenom;

-- Avec leurs enfants liés
SELECT
    p.code_unique AS code_parent, p.nom AS nom_parent, p.prenom AS prenom_parent,
    e.code_unique AS code_eleve, e.nom AS nom_eleve, e.prenom AS prenom_eleve
FROM authentification.comptes p
JOIN vie_scolaire.relations_parents_eleves r ON r.id_parent = p.id_user
JOIN authentification.comptes e ON e.id_user = r.id_eleve
WHERE p.role_actuel = 'PARENT'
ORDER BY p.nom, e.nom;
