-- ============================================================
-- NETTOYAGE - DONNÉES DE TEST
-- ============================================================

-- 1. Supprimer les messages de test (forum, etc.)
DELETE FROM vie_scolaire.forum_classe 
WHERE texte ILIKE '%test%' OR texte ILIKE '%demo%' OR texte ILIKE '%essai%';

DELETE FROM vie_scolaire.inter_classes_msgs 
WHERE texte ILIKE '%test%' OR texte ILIKE '%demo%';

DELETE FROM pedagogie.messages_salle 
WHERE contenu ILIKE '%test%' OR contenu ILIKE '%demo%';

-- 2. Supprimer les comptes de test (jamais connectés, créés il y a +30 jours)
DELETE FROM authentification.comptes 
WHERE date_creation < NOW() - INTERVAL '30 days'
  AND derniere_connexion IS NULL
  AND mot_de_passe = 'NON_ACTIVE'
  AND code_unique NOT LIKE 'DIR%'  -- Garder les comptes officiels
  AND code_unique NOT LIKE 'SURV%'
  AND code_unique NOT LIKE 'PROF%';