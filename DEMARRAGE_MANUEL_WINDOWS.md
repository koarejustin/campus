╔════════════════════════════════════════════════════════════════════════════════╗
║                     GUIDE DE DÉMARRAGE - DÉBOGAGE                             ║
║                        Windows PowerShell / CMD                                ║
╚════════════════════════════════════════════════════════════════════════════════╝


🔧 FIXES APPLIQUÉES
═══════════════════════════════════════════════════════════════════════════════════

PROBLÈME #1 : Python introuvable
  CAUSE : python3 n'existe pas sur Windows
  FIX : ✅ Utiliser le virtualenv : .\.venv\Scripts\python.exe
  
PROBLÈME #2 : Module axios manquant
  CAUSE : Dépendance Node.js manquante  
  FIX : ✅ npm install axios (EXÉCUTÉ)


═══════════════════════════════════════════════════════════════════════════════════
🚀 DÉMARRAGE CORRECT
═══════════════════════════════════════════════════════════════════════════════════


OPTION 1 : Automatique (Recommandé - NOUVEAU)
═════════════════════════════════════════════════════════════════════════════════

  Cliquez sur : demarrer.bat
  
  OU
  
  Lancez : .\demarrer.ps1
  
  Les scripts sont maintenant corrigés pour détecter Python correctement !


OPTION 2 : Manuel - PowerShell (Correct)
═════════════════════════════════════════════════════════════════════════════════

# Terminal 1 - API Python
  
  # Activez le virtualenv
  .\.venv\Scripts\Activate.ps1
  
  # Lancez l'API
  .\.venv\Scripts\python.exe services/api_moyennes.py
  
  # OU (si virtualenv n'existe pas)
  python services/api_moyennes.py


# Terminal 2 - Backend Node.js
  
  # Lancez npm start
  npm start


OPTION 3 : Manuel - CMD (Correct)
═════════════════════════════════════════════════════════════════════════════════

# Terminal 1 - API Python (CMD)

  REM Activez le virtualenv
  .\.venv\Scripts\activate.bat
  
  REM Lancez l'API
  python services/api_moyennes.py
  
  REM OU (chemin complet)
  .\.venv\Scripts\python.exe services/api_moyennes.py


# Terminal 2 - Backend Node.js (CMD)

  npm start


═════════════════════════════════════════════════════════════════════════════════
✅ VÉRIFICATION
═════════════════════════════════════════════════════════════════════════════════

Après démarrage, vous devriez voir :

Terminal 1 (Python) :
  ✅ INFO:     Uvicorn running on http://0.0.0.0:8001
  ✅ Application startup complete

Terminal 2 (Node.js) :
  ✅ ✅ Socket.io initialisé
  ✅ Server running on port 3000
  
Test API :
  curl http://localhost:8001
  → {"status": "ok", "service": "Calcul des Moyennes - Burkina Faso"}


═════════════════════════════════════════════════════════════════════════════════
📋 RÉSUMÉ DES CHANGEMENTS
═════════════════════════════════════════════════════════════════════════════════

✅ npm install axios - Module installé
✅ demarrer.bat - Script corrigé pour détecter Python
✅ demarrer.ps1 - Script corrigé pour détecter Python


═════════════════════════════════════════════════════════════════════════════════
🎯 PROCHAINES ÉTAPES
═════════════════════════════════════════════════════════════════════════════════

1. Fermez les anciens terminaux (s'il y en a)

2. Utilisez UNE des 3 options ci-dessus pour démarrer

3. Vérifiez que les 2 services tournent :
   - API Python sur port 8001
   - Backend Node.js sur port 3000

4. Ouvrez http://localhost:3000 dans votre navigateur

5. Connectez-vous et testez "Moyennes et Prédictions"


═════════════════════════════════════════════════════════════════════════════════
❓ SI ÇA NE MARCHE TOUJOURS PAS
═════════════════════════════════════════════════════════════════════════════════

❌ "python: command not found"
  → Installez Python depuis python.org
  → OU utilisez .\.venv\Scripts\python.exe

❌ "Cannot find module 'axios'"
  → npm install axios (déjà fait, mais vous pouvez réexécuter)

❌ "Port 8001 déjà utilisé"
  → Stop-Process -Name python -Force

❌ "Port 3000 déjà utilisé"
  → Stop-Process -Name node -Force

Consultez GUIDE_DEMARRAGE.md pour plus de troubleshooting


═════════════════════════════════════════════════════════════════════════════════
