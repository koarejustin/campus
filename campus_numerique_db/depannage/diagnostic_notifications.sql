-- ============================================================
-- DIAGNOSTIC - NOTIFICATIONS
-- ============================================================

-- 1. Compter les notifications
SELECT 
    COUNT(*) AS total,
    SUM(CASE WHEN est_lu = true OR lue = true THEN 1 ELSE 0 END) AS lues,
    SUM(CASE WHEN (est_lu = false OR est_lu IS NULL) AND (lue = false OR lue IS NULL) THEN 1 ELSE 0 END) AS non_lues
FROM gestion.notifications;

-- 2. Notifications par type
SELECT type, COUNT(*) AS total
FROM gestion.notifications
GROUP BY type
ORDER BY total DESC;

-- 3. Notifications par utilisateur (top 10)
SELECT 
    c.code_unique,
    c.nom,
    c.prenom,
    COUNT(*) AS nb_notifications
FROM gestion.notifications n
JOIN authentification.comptes c ON n.id_user = c.id_user
GROUP BY c.code_unique, c.nom, c.prenom
ORDER BY nb_notifications DESC
LIMIT 10;