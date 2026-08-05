╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                  🎓 CAMPUS NUMÉRIQUE - SYSTÈME DE MOYENNES                    ║
║                                                                                ║
║                         GUIDE RAPIDE DE DÉMARRAGE                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝


📌 POUR DÉMARRER LES SERVICES EN 1 CLIC :
═══════════════════════════════════════════════════════════════════════════════

  1️⃣  Cliquez sur → demarrer.bat  (ou double-clic)

C'est tout ! Les services vont démarrer automatiquement.


📊 ACCÈS AUX SERVICES :
═══════════════════════════════════════════════════════════════════════════════

  🐍 API Python (Calculs)........... http://localhost:8001
  🟢 Backend Node.js (Routage)...... http://localhost:3000
  📊 Tableau de bord............... http://localhost:3000/eleves


⚙️ DÉMARRAGE MANUEL (Avancé) :
═══════════════════════════════════════════════════════════════════════════════

  Terminal 1 (API Python) :
  ├─ .\.venv\Scripts\python.exe services/api_moyennes.py
  │  ou
  └─ python3 services/api_moyennes.py

  Terminal 2 (Backend Node.js) :
  ├─ npm start
  │  ou
  └─ node server.js

  Terminal 3 (Tests - Optionnel) :
  └─ python3 test_moyennes.py


🛑 ARRÊTER LES SERVICES :
═══════════════════════════════════════════════════════════════════════════════

  Appuyez sur Ctrl+C dans le terminal de démarrage
  Les services seront automatiquement arrêtés


📋 DOCUMENTATION COMPLÈTE :
═══════════════════════════════════════════════════════════════════════════════

  GUIDE_DEMARRAGE.md ............ Guide complet avec troubleshooting
  DOCUMENTATION_MOYENNES.md ..... Référence technique complète
  QUICK_START.md ................ Démarrage 5 minutes
  RESUME_INTEGRATION.md ......... Intégration étape par étape


✅ VÉRIFICATION :
═══════════════════════════════════════════════════════════════════════════════

  Après 5 secondes, vous devriez voir dans un terminal :

  ╔════════════════════════════════════════════════════════════════════╗
  ║   ✅ SERVICES DÉMARRÉS AVEC SUCCÈS                                ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  🐍 API Python...................... http://localhost:8001         ║
  ║  🟢 Backend Node.js.................. http://localhost:3000        ║
  ║                                                                    ║
  ║  📊 Dashboard des moyennes........ http://localhost:3000/eleves   ║
  ╚════════════════════════════════════════════════════════════════════╝


🔗 FLUX D'ACCÈS APRÈS DÉMARRAGE :
═══════════════════════════════════════════════════════════════════════════════

  1. Ouvrez votre navigateur → http://localhost:3000
  2. Connectez-vous comme élève
  3. Accédez à votre tableau de bord
  4. Cliquez sur "Moyennes et Prédictions"
  5. Consultez votre courbe analytique interactive


📁 STRUCTURE DES FICHIERS CLÉS :
═══════════════════════════════════════════════════════════════════════════════

  demarrer.bat ..................... Script de démarrage (Windows CMD)
  demarrer.ps1 ..................... Script de démarrage (PowerShell)
  GUIDE_DEMARRAGE.md ............... Guide complet
  
  services/
  ├─ api_moyennes.py .............. API FastAPI (port 8001)
  └─ moteur_moyennes_bf.py ......... Moteur de calcul Burkina Faso
  
  routes/
  ├─ eleveRouteMoyennes.js ......... Routes Express pour moyennes
  ├─ convocationsSocket.js ......... WebSocket temps réel
  └─ eleveRoutes.js ............... Routes élèves générales
  
  frontend/src/components/
  └─ EleveMoyennes.vue ............. Composant Vue.js (affichage)
  
  campus_numerique_db/
  ├─ 16b_migration_coefficients.sql  Migrations base de données
  └─ 16_matieres_coefficients_burkina.sql  Données coefficients


🚀 RACCOURCIS :
═══════════════════════════════════════════════════════════════════════════════

  npm run api:python .............. Démarre uniquement l'API Python
  npm run test:moyennes ........... Lance les tests
  npm run db:migrate .............. Exécute les migrations SQL
  npm start ........................ Démarre le serveur Node.js


💡 CONSEILS :
═══════════════════════════════════════════════════════════════════════════════

  ✅ Toujours démarrer avec demarrer.bat ou demarrer.ps1
  ✅ Garder les terminaux ouverts pour voir les logs en temps réel
  ✅ Si erreur, consultez les fichiers logs_*.txt
  ✅ Vérifier que PostgreSQL est démarré
  ✅ Les ports 8001 et 3000 doivent être libres


❓ QUESTIONS ?
═══════════════════════════════════════════════════════════════════════════════

  Consultez : GUIDE_DEMARRAGE.md → Section TROUBLESHOOTING


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                         🎉 PRÊT À DÉMARRER ! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
