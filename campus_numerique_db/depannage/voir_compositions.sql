-- ============================================================
-- VOIR LES COMPOSITIONS (examens officiels planifiés par la direction)
-- ============================================================

SELECT
    c.titre, c.type_composition, c.date_debut, c.date_fin,
    c.classes_concernees, c.est_visible,
    d.nom AS publie_par_nom, d.prenom AS publie_par_prenom
FROM pedagogie.compositions c
LEFT JOIN authentification.comptes d ON d.id_user = c.publie_par
ORDER BY c.date_debut DESC;
