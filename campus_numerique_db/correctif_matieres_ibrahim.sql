-- Vérifier d'abord ce qui est stocké exactement
SELECT c.nom, c.prenom, pp.matieres
FROM authentification.comptes c
JOIN pedagogie.profils_profs pp ON pp.id_user = c.id_user
WHERE c.nom ILIKE '%TRAORE%' AND c.prenom ILIKE '%Ibrahim%';

-- Correctif direct (valeur explicite, insensible à l'encodage du terminal)
UPDATE pedagogie.profils_profs pp SET
    matieres = ARRAY['Français', 'Philosophie']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'TRAORE' AND c.prenom = 'Ibrahim';

-- Vérification
SELECT c.nom, c.prenom, pp.matieres
FROM authentification.comptes c
JOIN pedagogie.profils_profs pp ON pp.id_user = c.id_user
WHERE c.nom ILIKE '%TRAORE%' AND c.prenom ILIKE '%Ibrahim%';
