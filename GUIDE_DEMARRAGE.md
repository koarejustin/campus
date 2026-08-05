# 🚀 GUIDE COMPLET DE DÉMARRAGE - Campus Numérique

## ✅ Prérequis Vérifiés

- ✅ Base de données PostgreSQL initialisée
- ✅ Migrations SQL exécutées (`16b_migration_coefficients.sql` + `16_matieres_coefficients_burkina.sql`)
- ✅ Dépendances Node.js installées (`npm install`)
- ✅ Dépendances Python installées (`pip install -r requirements-python.txt`)
- ✅ Virtualenv Python configuré

---

## 🎯 MÉTHODE 1 : Démarrage Automatique (Recommandé)

### Pour Windows (CMD ou PowerShell)
```bash
# Cliquez simplement sur ce fichier dans l'Explorateur Windows :
demarrer.bat

# OU lancez via PowerShell :
.\demarrer.ps1
```

Ce script va automatiquement :
1. ✅ Démarrer l'API Python (port 8001) en arrière-plan
2. ✅ Démarrer le Backend Node.js (port 3000) en arrière-plan
3. ✅ Afficher un résumé avec tous les URLs
4. ✅ Créer les fichiers logs automatiquement

**Résultat après 5 secondes :**
```
╔════════════════════════════════════════════════════════════════════╗
║   ✅ SERVICES DÉMARRÉS AVEC SUCCÈS                                ║
╠════════════════════════════════════════════════════════════════════╣
║  🐍 API Python...................... http://localhost:8001         ║
║  🟢 Backend Node.js.................. http://localhost:3000        ║
║                                                                    ║
║  📊 Dashboard des moyennes........ http://localhost:3000/eleves   ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 🎯 MÉTHODE 2 : Démarrage Manuel (Avancé)

### Terminal 1 - API Python
```powershell
# Option A : Avec virtualenv
.\.venv\Scripts\python.exe services/api_moyennes.py

# Option B : Avec Python global
python3 services/api_moyennes.py
```

**Vérification :** Ouvrez http://localhost:8001 dans votre navigateur
```json
{"status": "ok", "service": "Calcul des Moyennes - Burkina Faso"}
```

### Terminal 2 - Backend Node.js
```powershell
# Assurez-vous que npm start est configuré dans package.json
npm start

# Ou directement
node server.js
```

**Vérification :** Ouvrez http://localhost:3000 dans votre navigateur
```
Campus Numérique - Page d'accueil
```

### Terminal 3 - Tests (Optionnel)
```powershell
python3 test_moyennes.py
```

---

## 🔍 VÉRIFICATION DU DÉMARRAGE

### 1. API Python (Port 8001)

```bash
# Test en ligne de commande
curl http://localhost:8001

# Réponse attendue :
# {"status": "ok", "service": "Calcul des Moyennes - Burkina Faso"}
```

### 2. Backend Node.js (Port 3000)

```bash
# Test en ligne de commande
curl http://localhost:3000

# Réponse attendue :
# <!DOCTYPE html> ... (page HTML)
```

### 3. Routes des Moyennes

```bash
# Tester un endpoint (remplacer avec vos IDs réels)
curl "http://localhost:3000/api/eleves/moyennes/moyennes-courbe/1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Réponse attendue :
# {
#   "success": true,
#   "data": {
#     "moyenne_generale": 14.5,
#     "matieres": [...],
#     "courbe": [...]
#   }
# }
```

---

## 🛑 ARRÊT DES SERVICES

### Méthode 1 : Par les Scripts
```bash
# Si vous utilisiez demarrer.bat ou demarrer.ps1
# Appuyez simplement sur Ctrl+C dans le terminal

# Les processus Python et Node.js seront automatiquement arrêtés
```

### Méthode 2 : Manuellement
```powershell
# Arrêter Node.js
Stop-Process -Name "node" -Force

# Arrêter Python
Stop-Process -Name "python" -Force
```

### Méthode 3 : Task Manager (Windows)
1. Ouvrez `Ctrl + Shift + Esc`
2. Trouvez "python.exe" → Cliquez "Terminer les tâches"
3. Trouvez "node.exe" → Cliquez "Terminer les tâches"

---

## 📊 STRUCTURE DES PORTS

| Service | Port | URL | Type |
|---------|------|-----|------|
| API Python | 8001 | `http://localhost:8001` | FastAPI (Calculs) |
| Backend Node.js | 3000 | `http://localhost:3000` | Express.js (Routage) |
| WebSocket | 3000 | `ws://localhost:3000` | Socket.io (Temps réel) |
| Base de données | 5432 | - | PostgreSQL |

---

## 🧪 TEST DE LA FONCTIONNALITÉ

### 1. Connectez-vous comme élève
```
URL : http://localhost:3000
Identifiants : (utilisez vos IDs élèves test)
```

### 2. Allez au tableau de bord des moyennes
```
URL : http://localhost:3000/eleves
Section : "Moyennes et Prédictions"
```

### 3. Vérifiez les éléments affichés
- ✅ Moyenne générale (format X.XX/20)
- ✅ Graphique avec courbe analytique
- ✅ Tableau détail des matières
- ✅ Prédictions (notes pour cibles)
- ✅ Évolution trimestrielle
- ✅ Alertes (si moyennes en baisse)

---

## 🔴 TROUBLESHOOTING

### Erreur : "Port 8001 déjà utilisé"
```powershell
# Trouver le processus utilisant le port
Get-NetTCPConnection -LocalPort 8001 | Select-Object OwningProcess

# Arrêter le processus (remplacer PID)
Stop-Process -Id PID -Force
```

### Erreur : "Port 3000 déjà utilisé"
```powershell
# Idem pour port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Stop-Process -Id PID -Force
```

### Erreur : "ModuleNotFoundError: No module named 'fastapi'"
```powershell
# Réinstallez les dépendances Python
.\.venv\Scripts\python.exe -m pip install -r requirements-python.txt
```

### Erreur : "Cannot find module 'express'"
```powershell
# Réinstallez les dépendances Node.js
npm install
```

### Erreur : "connexion à la base de données échouée"
```powershell
# Vérifiez que PostgreSQL tourne
# Vérifiez les credentials dans .env
# Vérifiez que les migrations ont été exécutées
```

---

## 📝 FICHIERS DE LOGS

Les logs sont créés automatiquement lors du démarrage :

| Fichier | Contenu |
|---------|---------|
| `logs_python.txt` | Output standard de l'API Python |
| `logs_python_error.txt` | Erreurs de l'API Python |
| `logs_nodejs.txt` | Output standard du Backend Node.js |
| `logs_nodejs_error.txt` | Erreurs du Backend Node.js |

**Consulter les logs :**
```powershell
# Pour Python
Get-Content -Tail 20 logs_python.txt

# Pour Node.js
Get-Content -Tail 20 logs_nodejs.txt
```

---

## 🎓 FLUX UTILISATEUR

```
1. Élève se connecte
   ↓
2. Accède au tableau de bord → http://localhost:3000/eleves
   ↓
3. Clique sur "Moyennes et Prédictions"
   ↓
4. Composant Vue.js charge
   ↓
5. Requête HTTP vers http://localhost:3000/api/eleves/moyennes/moyennes-courbe/1
   ↓
6. Express.js reçoit la requête → routes/eleveRouteMoyennes.js
   ↓
7. Requête à FastAPI http://localhost:8001/api/moyennes/courbe-interactive
   ↓
8. Python calcule les moyennes → Retour JSON
   ↓
9. Express.js cache et retourne à Vue.js
   ↓
10. Vue.js affiche le graphique + tableau + prédictions
```

---

## 🚨 POINTS CRITIQUES À VÉRIFIER

✅ **Base de données :**
- Les migrations sont exécutées
- Les tables `pedagogie.matieres`, `pedagogie.coefficients_par_classe`, `pedagogie.historique_moyennes` existent
- Les données de coefficients sont présentes

✅ **Python API :**
- La connexion à PostgreSQL fonctionne (dans `services/api_moyennes.py`)
- Le port 8001 est libre
- FastAPI démarre sans erreur

✅ **Express.js :**
- Les routes de moyennes sont importées dans `server.js`
- Le middleware d'authentification fonctionne
- Le port 3000 est libre

✅ **Vue.js :**
- Le composant `EleveMoyennes.vue` est importé dans la vue des élèves
- Chart.js est installé (`npm install chart.js vue-chartjs`)
- Le token JWT est stocké en localStorage

---

## 📞 SUPPORT

Si vous rencontrez des problèmes :

1. **Consultez les fichiers de logs** (voir section "Fichiers de logs")
2. **Testez les endpoints individuellement** avec curl
3. **Vérifiez les prérequis** (PostgreSQL, Node.js, Python)
4. **Redémarrez les services** complètement
5. **Consultez la documentation** : `DOCUMENTATION_MOYENNES.md`

---

**Version :** 1.0.0  
**Dernière mise à jour :** 2026-07-01  
**Statut :** ✅ Production Ready
