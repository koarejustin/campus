-- ============================================================
-- NETTOYAGE - MESSAGES
-- ============================================================

-- 1. Supprimer les messages de plus de 1 an (forum)
DELETE FROM vie_scolaire.forum_classe 
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM vie_scolaire.inter_classes_msgs 
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM pedagogie.messages_salle 
WHERE date_envoi < NOW() - INTERVAL '1 year';

-- 2. Supprimer les messages d'une classe spécifique
DELETE FROM vie_scolaire.forum_classe 
WHERE classe = '3ème' OR classe = 'Terminale';

-- 3. Soft delete (marquer comme supprimé au lieu de supprimer)
ALTER TABLE vie_scolaire.forum_classe ADD COLUMN IF NOT EXISTS est_supprime BOOLEAN DEFAULT false;

UPDATE vie_scolaire.forum_classe 
SET est_supprime = true, texte = '[Message archivé]'
WHERE created_at < NOW() - INTERVAL '6 months';

-- 4. Vider complètement une table (urgence)
BEGIN;
TRUNCATE TABLE vie_scolaire.forum_classe;
TRUNCATE TABLE vie_scolaire.inter_classes_msgs;
TRUNCATE TABLE pedagogie.messages_salle;
COMMIT;