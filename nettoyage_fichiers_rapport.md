# Nettoyage des fichiers — Campus Numérique FASO

## 🟢 GROUPE 1 — Sûr à supprimer (confirmé dans nos échanges précédents)

Code mort confirmé, ancien, ou remplacé :
- `getMoyennesAvancees_v2.js` — brouillon, son contenu est déjà dans eleveController.js
- `eleveRoutes_backup.js` — ancien fichier de sauvegarde
- `eleveMiddleware.js` — copie erronée d'alumniMiddleware, jamais utilisée dans les routes actives
- `courseController.js` + `courseRoutes.js` — interrogent une table qui n'existe pas (`authentification.cours`), confirmés inutilisés
- `Prof.sql` — sous-ensemble de Professeurs.sql
- `alumni_profil_extension.sql` — sous-ensemble de alumni_tables.sql
- `Vue_unifie_codé.sql` — sous-ensemble de Vue_unifié.sql
- `moteur_moyennes_bf_cpython-314.pyc` — fichier compilé Python, ne devrait jamais être gardé (régénéré automatiquement)
- `tmp_alumni_script.js`, `tmp_eleve_script.js` — fichiers temporaires (le nom "tmp" le dit)
- `EleveMoyennes.vue` — fichier Vue.js isolé dans un projet qui n'utilise pas Vue, expérience abandonnée
- `EXEMPLES_API_SURVEILLANTS.js` — fichier d'exemple/référence, pas du code utilisé
- `logs_nodejs.txt`, `logs_nodejs_error.txt`, `logs_python.txt`, `logs_python_error.txt` — logs, pas du code source

## 🟢 GROUPE 2 — Environnement Python mal placé (`.venv`)

Ces fichiers sont l'intérieur de ton environnement virtuel Python (`python.exe`, `pip.exe`...) — ils ne devraient **jamais** être dans ton dossier de projet ni suivis par Git, ils se régénèrent automatiquement à chaque `python -m venv`. À supprimer du dossier racine (le vrai `.venv/` reste intact ailleurs sur ton PC) :

`python.exe`, `pythonw.exe`, `pip.exe`, `pip3.exe`, `pip3_14.exe`, `dotenv.exe`, `idna.exe`, `uvicorn.exe`, `typing_extensions.py`, `pyvenv.cfg`, `activate`, `activate.bat`, `activate.fish`, `deactivate.bat`, `Activate.ps1`, `scripts_0_`

## 🟡 GROUPE 3 — Documentation redondante (22 fichiers sur le même sujet)

Toute cette doc "comment démarrer" / "statut" est remplacée par le cahier des charges progressif qu'on tient à jour ensemble. Je recommande de tout supprimer et de garder uniquement le cahier des charges :

`00_LIRE_D_ABORD.txt`, `ALLEZ_Y.txt`, `CHECKLIST_VERIFICATION.md`, `COMMANDES_POWERSHELL.txt`, `DEMARRAGE_MANUEL_WINDOWS.md`, `DEMARRER_EN_3_ETAPES.txt`, `DEMARRER_MAINTENANT.txt`, `DOCUMENTATION_MOYENNES.md`, `DOCUMENTATION_SURVEILLANTS.md`, `D_OU_VENAIENT_LES_ERREURS.md`, `FINAL_STATUS.txt`, `GUIDE_DEMARRAGE.md`, `INDEX_FICHIERS.md`, `LIRE_MOI_DABORD.txt`, `QUICK_START.md`, `README_DEMARRAGE.txt`, `README_MOYENNES.md`, `RESOLUTION_COMPLETE.md`, `RESUME_COURT.txt`, `RESUME_FINAL.md`, `RESUME_INTEGRATION.md`, `STATUS_RESUME.txt`

## 🟠 GROUPE 4 — À vérifier avant de supprimer (je ne suis pas sûr à 100%)

Je n'ai pas assez d'éléments pour être certain que ces fichiers sont morts — vérifie qu'aucune page ne les charge avant de les retirer :
- `Direction.sql` / `Direction_detailler.sql` — quasi identiques, garde un seul (vérifie lequel correspond à ta vraie base)
- `surveillant.sql` / `surveillant_detaillé.sql` — même chose
- `notifications.js` — possible doublon de `notificationController.js`/`notificationService.js`
- `admin.js` — possible doublon de `adminController.js`
- `eleveRouteMoyennes.js` — la route des moyennes semble déjà dans `eleveRoutes.js`
- `dashboard_moyennes_frontend.js`, `bulletin.js` — semblent être d'anciens prototypes avant la version actuelle d'`eleve.html`
- `mentorat.css`, `mentorat.js` — vérifie si `eleve.html`/`alumni.html` les chargent encore
- `surveillance-forms.js`, `surveillance-modals.html` — semblent dater d'avant la refonte de `surveillant.html`
- `migration_moyennes_v2.sql`, `CREER_TABLES.sql`, `16b_migration_coefficients.sql` — anciens scripts jamais appliqués (confirmé plus tôt) à ta vraie base
- Tous les scripts SQL "diagnostic"/"vérif" (`diagnostic2.sql`, `diagnostic3.sql`, `verif_finale.sql`, `verification_integrité.sql`, etc.) — utiles comme historique, mais plus nécessaires au fonctionnement

## 🔴 GROUPE 5 — Fichiers Git mal placés (ne pas toucher)

`COMMIT_EDITMSG`, `FETCH_HEAD`, `HEAD`, `ORIG_HEAD`, `index`, `description`, `config` — ce sont des fichiers internes de Git. Ils ne devraient normalement jamais apparaître comme ça à la racine de ton projet ; si tu les vois là, c'est probablement un souci d'upload de ta part vers moi, pas un vrai problème dans ton dossier réel. Je ne recommande **aucune action** dessus — ne les supprime surtout pas de ton vrai dossier `.git` s'ils y sont, ça casserait ton historique Git.

## ✅ À garder absolument
`cahier_de_charge.docx` (spec d'origine), `package.json`, `package-lock.json`, tous les vrais Controller/Routes/HTML en cours d'utilisation, `moyennesEngine.js`, `moteur_moyennes_bf.py` (service séparé confirmé volontaire), `sauvegarde.sql`/`sauvegarde_v2.sql` (vraies sauvegardes de ta base).
