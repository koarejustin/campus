-- ============================================================
-- DIAGNOSTIC - INTÉGRITÉ ET COHÉRENCE
-- ============================================================

-- 1. Vérifier les clés étrangères cassées (orphan records)
SELECT 'notes_evaluations' AS table_name, COUNT(*) AS nb_orphelins
FROM pedagogie.notes_evaluations n
LEFT JOIN authentification.comptes c ON n.id_eleve = c.id_user
WHERE c.id_user IS NULL
UNION ALL
SELECT 'absences', COUNT(*)
FROM gestion.absences a
LEFT JOIN authentification.comptes c ON a.id_eleve = c.id_user
WHERE c.id_user IS NULL
UNION ALL
SELECT 'convocations', COUNT(*)
FROM gestion.convocations conv
LEFT JOIN authentification.comptes c ON conv.id_eleve = c.id_user
WHERE c.id_user IS NULL;

-- 2. Vérifier les doublons dans les relations parents-enfants
SELECT id_parent, id_eleve, COUNT(*) AS doublons
FROM vie_scolaire.relations_parents_eleves
GROUP BY id_parent, id_eleve
HAVING COUNT(*) > 1;

-- 3. Vérifier les notes hors intervalle (0-20)
SELECT COUNT(*) AS notes_invalides
FROM pedagogie.notes_evaluations
WHERE note < 0 OR note > 20;

-- 4. Vérifier les comptes avec le même email
SELECT email, COUNT(*) AS doublons
FROM authentification.comptes
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;