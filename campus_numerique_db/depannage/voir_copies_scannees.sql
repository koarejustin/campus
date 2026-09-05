-- ============================================================
-- VOIR LES COPIES CORRIGÉES SCANNÉES
-- ============================================================

SELECT
    e.code_unique, e.nom, e.prenom,
    m.nom_matiere, cs.trimestre, cs.type_evaluation, cs.note,
    cs.visible_eleve, cs.date_upload,
    p.nom AS nom_prof
FROM pedagogie.copies_scannees cs
JOIN authentification.comptes e ON e.id_user = cs.id_eleve
JOIN authentification.comptes p ON p.id_user = cs.id_professeur
LEFT JOIN pedagogie.matieres m ON m.id_matiere = cs.id_matiere
ORDER BY cs.date_upload DESC;
