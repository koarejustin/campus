-- ============================================================
-- VOIR LES BULLETINS SIGNÉS (signature électronique)
-- ============================================================

SELECT
    e.code_unique, e.nom, e.prenom,
    b.trimestre, b.annee_scolaire, b.date_signature,
    s.nom AS signataire_nom, s.prenom AS signataire_prenom
FROM pedagogie.bulletins_signes b
JOIN authentification.comptes e ON e.id_user = b.id_eleve
JOIN authentification.comptes s ON s.id_user = b.id_signataire
ORDER BY b.date_signature DESC;

-- Élèves dont le bulletin d'un trimestre n'est PAS encore signé
SELECT e.code_unique, e.nom, e.prenom, pe.classe_actuelle
FROM authentification.comptes e
JOIN vie_scolaire.profils_eleves pe ON pe.id_user = e.id_user
WHERE e.role_actuel = 'ELEVE'
  AND NOT EXISTS (
    SELECT 1 FROM pedagogie.bulletins_signes b
    WHERE b.id_eleve = e.id_user AND b.trimestre = 1 AND b.annee_scolaire = '2026-2027'
  );
