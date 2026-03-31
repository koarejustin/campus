-- ============================================================
-- DIAGNOSTIC - MESSAGES
-- ============================================================

-- 1. Compter les messages par table
SELECT 'forum_classe' AS table_name, COUNT(*) AS total FROM vie_scolaire.forum_classe
UNION ALL
SELECT 'inter_classes_msgs', COUNT(*) FROM vie_scolaire.inter_classes_msgs
UNION ALL
SELECT 'messages_salle', COUNT(*) FROM pedagogie.messages_salle
UNION ALL
SELECT 'forum_parents', COUNT(*) FROM gestion_ape.forum_parents
ORDER BY total DESC;

-- 2. Messages par classe (forum)
SELECT classe, COUNT(*) AS nb_messages
FROM vie_scolaire.forum_classe
GROUP BY classe
ORDER BY nb_messages DESC;

-- 3. Messages par mois
SELECT 
    DATE_TRUNC('month', created_at) AS mois,
    COUNT(*) AS total_messages
FROM vie_scolaire.forum_classe
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mois DESC;

-- 4. Taille totale des tables de messages
SELECT 
    'vie_scolaire.forum_classe' AS table_name,
    pg_size_pretty(pg_total_relation_size('vie_scolaire.forum_classe')) AS taille
UNION ALL
SELECT 'vie_scolaire.inter_classes_msgs', pg_size_pretty(pg_total_relation_size('vie_scolaire.inter_classes_msgs'))
UNION ALL
SELECT 'pedagogie.messages_salle', pg_size_pretty(pg_total_relation_size('pedagogie.messages_salle'));