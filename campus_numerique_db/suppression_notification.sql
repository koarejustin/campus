-- ============================================================
-- NETTOYAGE - NOTIFICATIONS
-- ============================================================

-- 1. Supprimer les notifications lues de plus de 30 jours
DELETE FROM gestion.notifications 
WHERE (est_lu = true OR lue = true)
  AND created_at < NOW() - INTERVAL '30 days';

-- 2. Supprimer TOUTES les notifications d'un utilisateur
DELETE FROM gestion.notifications 
WHERE id_user IN (
    SELECT id_user FROM authentification.comptes 
    WHERE code_unique = 'CN-2026-XXXX'  -- Remplacer
);

-- 3. Vider toutes les notifications (urgence)
DELETE FROM gestion.notifications;

-- 4. Réinitialiser les compteurs de notifications
TRUNCATE TABLE gestion.notifications;