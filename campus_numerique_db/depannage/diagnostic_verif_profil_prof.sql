-- Vérifier que le prof d5b1068f a un profil dans profils_profs
SELECT pp.id_prof, pp.id_user, c.nom, c.prenom
FROM pedagogie.profils_profs pp
JOIN authentification.comptes c ON c.id_user = pp.id_user
WHERE pp.id_prof = 'd5b1068f-0d26-4294-a481-5ae134c327cc'::uuid
   OR pp.id_user = 'd5b1068f-0d26-4294-a481-5ae134c327cc'::uuid;

-- Vérifier aussi la classe actuelle de Tatiana
SELECT id_user, classe_actuelle 
FROM vie_scolaire.profils_eleves 
WHERE id_user IN (
  SELECT id_user FROM authentification.comptes 
  WHERE LOWER(nom) LIKE '%vasseur%'
);
