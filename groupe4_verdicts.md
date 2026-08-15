# Groupe 4 — Verdicts après vérification

J'ai cherché si chaque fichier était réellement chargé quelque part
(dans les autres fichiers .js/.html, et dans server.js). Voici le
résultat précis, plus de doute :

## 🟢 Confirmés morts — sûrs à supprimer
Aucune trace nulle part, y compris dans server.js :
- `notifications.js`
- `admin.js`
- `eleveRouteMoyennes.js`
- `dashboard_moyennes_frontend.js`
- `bulletin.js`
- `surveillance-forms.js`
- `surveillance-modals.html`

## 🔴 Confirmés VIVANTS — ne pas supprimer
- `mentorat.css` et `mentorat.js` — chargés à la fois par `alumni.html`
  et `eleve.html`. Je m'étais trompé en les mettant dans la liste
  "à vérifier", ils sont bien utilisés.

## 🟢 Doublons confirmés — garde le premier de chaque paire, supprime le second
- Garde `Direction.sql` (33 lignes, plus complet) → supprime
  `Direction_detailler.sql` (19 lignes, sous-ensemble)
- Garde `surveillant.sql` (47 lignes, plus complet) → supprime
  `surveillant_detaillé.sql` (19 lignes, sous-ensemble)

## 🟡 Scripts SQL diagnostic/vérif — laissés à ton choix
Toujours pas de danger technique à les garder ou les supprimer (ce sont
juste des requêtes de consultation, rien d'automatisé n'en dépend). Si
tu veux du rangement, tu peux les supprimer sans risque :
`diagnostic2.sql`, `diagnostic3.sql`, `diagnostic_complet.sql`,
`diagnostic_ressources.sql`, `DIAGNOSTIC_COLONNES.sql`,
`verif_finale.sql`, `verif_prof.sql`, `verification_conexion.sql`,
`verification_integrité.sql`, `voir_compte_utulisateurs.sql`,
`connexion_et_tests.sql`, `CONNEXION_ET_CONSULTATION.sql`,
`convocation_requete.sql`, `debug_ressources.sql`,
`diagnostique_des_messages.sql`, `export_csv_donné.sql`,
`performance_lenteur.sql`, `recuperer_donnees.sql`,
`requête_de_base.sql`, `absence_urgent.sql`, `compter_rôle.sql`

## 🟡 Anciennes migrations jamais appliquées — sûr de supprimer
Confirmé plus tôt dans notre session que ces scripts n'ont jamais été
exécutés sur ta vraie base :
`migration_moyennes_v2.sql`, `CREER_TABLES.sql`,
`16b_migration_coefficients.sql`
