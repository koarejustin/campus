-- ============================================================
-- VOIR LES DISCUSSIONS PAR CLASSE (forum de classe)
-- ============================================================

SELECT classe, COUNT(*) AS nb_messages, MAX(created_at) AS dernier_message
FROM vie_scolaire.forum_classe
GROUP BY classe
ORDER BY nb_messages DESC;

-- Derniers messages d'une classe précise (remplace la valeur)
SELECT fc.*, c.nom, c.prenom
FROM vie_scolaire.forum_classe fc
JOIN authentification.comptes c ON c.id_user = fc.id_user
WHERE fc.classe = '3ème'
ORDER BY fc.created_at DESC
LIMIT 30;

-- Discussions inter-classes (le "Grand Flux" entre toutes les classes)
SELECT COUNT(*) AS total_messages, MIN(created_at) AS premier, MAX(created_at) AS dernier
FROM vie_scolaire.inter_classes_msgs;
