-- ============================================================
-- VOIR LE CAHIER DE TEXTE
-- ============================================================
-- ⚠️ Il existe DEUX tables pour le cahier de texte, et les DEUX
-- contiennent de vraies données (cahier_texte : 3 lignes,
-- cahiers_texte : 7 lignes) — signe que le code a dû basculer de
-- l'une à l'autre à un moment, sans que l'ancienne soit vidée.
-- Vérifie dans controller/*.js laquelle est vraiment utilisée
-- aujourd'hui (grep "cahier_texte" et "cahiers_texte" séparément)
-- avant de considérer l'une des deux comme obsolète.

SELECT id_seance, id_professeur, classe, matiere, titre, date_seance, heure_debut, heure_fin
FROM pedagogie.cahier_texte
ORDER BY date_seance DESC;

SELECT id, id_prof, classe, matiere, titre_seance, date_seance, heure_debut, heure_fin
FROM pedagogie.cahiers_texte
ORDER BY date_seance DESC;
