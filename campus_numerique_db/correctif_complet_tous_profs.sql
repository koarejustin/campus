-- ================================================================
-- CORRECTIF COMPLET ET DÉFINITIF — classes ET matières de tous les
-- profs, avec des valeurs explicites (aucune dépendance à l'encodage
-- du terminal). À exécuter une fois, écrase toute corruption restante.
-- ================================================================

UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY['Tle A', U&'1\00E8re A', '2nde A'],
    matieres = ARRAY[U&'\00C9conomie']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'COMPAORE' AND c.prenom = 'Jean-Pierre';

UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY['Tle D', U&'1\00E8re D', '2nde C', U&'3\00E8me', U&'4\00E8me'],
    matieres = ARRAY['SVT']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'ZONGO' AND c.prenom = 'Charles';

UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY['Tle A', 'Tle D', U&'1\00E8re A', U&'1\00E8re D', '2nde A', '2nde C'],
    matieres = ARRAY['Anglais']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'OUEDRAOGO' AND c.prenom = 'Paul';

UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY[U&'3\00E8me', U&'4\00E8me', U&'5\00E8me', U&'6\00E8me'],
    matieres = ARRAY[U&'Histoire-G\00E9ographie']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'NANA' AND c.prenom = 'Sophie';

UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY[U&'3\00E8me', U&'4\00E8me', U&'5\00E8me', U&'6\00E8me'],
    matieres = ARRAY[U&'Fran\00E7ais']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'SOME' AND c.prenom = 'Honorine';

UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY[U&'5\00E8me', U&'6\00E8me', U&'4\00E8me'],
    matieres = ARRAY[U&'Math\00E9matiques']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'DIALLO' AND c.prenom = 'Moussa';

UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY['Tle A', 'Tle D', U&'1\00E8re A', U&'1\00E8re D'],
    matieres = ARRAY['Informatique']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'TAPSOBA' AND c.prenom = 'Rasmata';

UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY['Tle A', 'Tle D', U&'1\00E8re A', U&'1\00E8re D', '2nde A', '2nde C', U&'3\00E8me', U&'4\00E8me', U&'5\00E8me', U&'6\00E8me'],
    matieres = ARRAY['EPS']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'SAWADOGO' AND c.prenom = 'Alimata';

UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY['Tle A', U&'1\00E8re A', '2nde A', 'Tle D'],
    matieres = ARRAY[U&'Fran\00E7ais', 'Philosophie']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'TRAORE' AND c.prenom = 'Ibrahim';

UPDATE pedagogie.profils_profs pp SET
    classes = ARRAY['Tle D', U&'1\00E8re D', '2nde C', U&'3\00E8me'],
    matieres = ARRAY[U&'Math\00E9matiques', 'Physique-Chimie']
FROM authentification.comptes c
WHERE pp.id_user = c.id_user AND c.nom = 'KABORE' AND c.prenom = 'Marie';

-- Vérification finale — regarde bien ce résultat dans le terminal ET
-- va vérifier chaque profil concerné dans le navigateur ensuite
SELECT c.nom, c.prenom, pp.classes, pp.matieres
FROM authentification.comptes c
JOIN pedagogie.profils_profs pp ON pp.id_user = c.id_user
WHERE c.role_actuel = 'PROFESSEUR'
ORDER BY c.nom;
