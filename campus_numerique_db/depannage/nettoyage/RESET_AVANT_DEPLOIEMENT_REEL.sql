-- ================================================================
-- ⚠️⚠️⚠️  RESET COMPLET AVANT DÉPLOIEMENT RÉEL  ⚠️⚠️⚠️
-- ================================================================
-- À lancer UNE SEULE FOIS, le jour où tu remplaces toutes les
-- données de test/simulation par les vraies données de l'école.
--
-- NE PAS lancer si tu n'es pas sûr — ça vide TOUS les comptes,
-- élèves, notes, messages, devoirs, absences... de la base.
-- Irréversible (sauf si tu as une sauvegarde récente).
--
-- AVANT DE LANCER :
--   1. Fais une sauvegarde (Supabase → Database → Backups, ou
--      pg_dump) même si Supabase en garde déjà automatiquement.
--   2. Vérifie que tu es bien connecté à la BONNE base (le nom du
--      projet en haut du SQL Editor doit être le tien).
--   3. Lis ce qui est gardé vs vidé juste en dessous.
--
-- CE QUI EST GARDÉ (pas touché par ce script) :
--   - La structure de toutes les tables (rien n'est supprimé/cassé)
--   - pedagogie.matieres (la liste officielle des matières + coefficients)
--   - gestion.configuration (nom/logo de l'école — à modifier via
--     l'interface Direction après le reset, pas ici)
--   - gestion.images_espaces / gestion.photos_espaces (les visuels
--     déjà en place — à changer manuellement si besoin)
--
-- CE QUI EST VIDÉ : absolument tous les comptes (élèves, profs,
-- parents, direction, surveillants, alumni, APE) et tout leur
-- contenu (notes, devoirs, messages, absences, notifications...).
-- ================================================================

BEGIN;

TRUNCATE TABLE
    -- Comptes et profils (la base de tout — cascade vers presque
    -- tout le reste automatiquement grâce à CASCADE ci-dessous)
    authentification.comptes,
    authentification.fcm_tokens,
    authentification.profils_administratifs,

    -- Pédagogie
    pedagogie.avis_orientation,
    pedagogie.bulletins_signes,
    pedagogie.cahier_texte,
    pedagogie.cahiers_texte,
    pedagogie.compositions,
    pedagogie.conseils_orientation,
    pedagogie.copies_scannees,
    pedagogie.devoirs,
    pedagogie.emploi_du_temps,
    pedagogie.messages_prives,
    pedagogie.messages_salle,
    pedagogie.notes,
    pedagogie.notes_evaluations,
    pedagogie.profils_profs,
    pedagogie.qcm,
    pedagogie.qcm_reponses,
    pedagogie.ressources_pedagogiques,
    pedagogie.salle_des_profs_virtuelle,

    -- Vie scolaire
    vie_scolaire.annonces,
    vie_scolaire.annonces_officielles,
    vie_scolaire.elections,
    vie_scolaire.evenements,
    vie_scolaire.forum_classe,
    vie_scolaire.forum_reactions,
    vie_scolaire.grand_eleves_commentaires,
    vie_scolaire.grand_eleves_likes,
    vie_scolaire.grand_eleves_posts,
    vie_scolaire.grand_flux,
    vie_scolaire.grand_flux_eleves,
    vie_scolaire.inter_classes_msgs,
    vie_scolaire.mediation,
    vie_scolaire.profils_eleves,
    vie_scolaire.relations_parents_eleves,
    vie_scolaire.suivi_disciplinaire,

    -- Gestion (⚠️ configuration, images_espaces, photos_espaces
    -- volontairement EXCLUS de cette liste, voir en-tête)
    gestion.absences,
    gestion.activites,
    gestion.annonces_officielles,
    gestion.audit_logs,
    gestion.convocations,
    gestion.elections,
    gestion.incidents,
    gestion.messages,
    gestion.messages_prevention,
    gestion.notifications,
    gestion.offres_alumni,
    gestion.projets_ape,

    -- APE / alumni
    gestion_ape.bureau_direction,
    gestion_ape.cotisations_parents,
    gestion_ape.demandes_mentorat,
    gestion_ape.forum_likes,
    gestion_ape.forum_parents,
    gestion_ape.forum_reactions,
    gestion_ape.forum_typing,
    gestion_ape.journal_de_bord,
    gestion_ape.mentorats,
    gestion_ape.objectifs_mentorat,
    gestion_ape.profils_alumni,
    gestion_ape.profils_parents,
    gestion_ape.projets_ape,
    gestion_ape.relations_mentorat
CASCADE;

-- ================================================================
-- Recréer LE PREMIER vrai compte Direction pour pouvoir se
-- reconnecter juste après (mot_de_passe = NULL déclenche l'écran
-- "premier mot de passe" au premier login, comme pour tout compte
-- fraîchement importé — pas besoin de gérer le hachage ici).
-- Remplace le code_unique / nom / prénom / email avant de lancer.
-- ================================================================
INSERT INTO authentification.comptes
    (code_unique, nom, prenom, email, role_actuel, mot_de_passe, est_actif)
VALUES
    ('DIR-0001', 'NOM_A_REMPLACER', 'PRENOM_A_REMPLACER', 'direction@ecole.bf', 'DIRECTION', NULL, true);

COMMIT;

-- Après COMMIT : connecte-toi avec le code_unique ci-dessus, choisis
-- ton mot de passe au premier écran de connexion, puis utilise
-- l'espace Direction pour importer les vrais élèves/profs/parents
-- (fichier Excel) et pour renseigner le vrai nom/logo de l'école
-- dans les paramètres.
