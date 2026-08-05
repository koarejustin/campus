# 🚀 QUICK START - Système de Moyennes en 5 minutes

## ⏱️ Démarrage Rapide (5 min)

### 1️⃣ Prérequis

```bash
# Vérifier que tout est installé
node --version      # ✓ v16+
python3 --version   # ✓ 3.8+
psql --version      # ✓ PostgreSQL
npm --version       # ✓ npm
```

### 2️⃣ Configuration (2 min)

```bash
# 1. Copier la configuration
cp .env.example .env

# 2. Éditer .env avec vos paramètres DB
# DB_HOST=localhost
# DB_USER=postgres
# DB_PASSWORD=votreMotDePasse
```

### 3️⃣ Base de Données (1 min)

```bash
# Exécuter les migrations
npm run db:migrate

# OU manuellement :
psql -U postgres -d campus_numerique_db < campus_numerique_db/16b_migration_coefficients.sql
psql -U postgres -d campus_numerique_db < campus_numerique_db/16_matieres_coefficients_burkina.sql
```

### 4️⃣ Installer les packages (1 min)

```bash
# Python
pip install -r requirements-python.txt

# Frontend (optionnel)
npm install chart.js vue-chartjs
```

### 5️⃣ Lancer les services (1 min)

**Terminal 1 - Backend Node.js :**
```bash
npm start
# Output : Server running on port 3000
```

**Terminal 2 - API Python :**
```bash
npm run api:python
# Output : Uvicorn running on http://0.0.0.0:8001
```

**Terminal 3 - Tests :**
```bash
npm run test:moyennes
# Affiche 4 tests complets ✅
```

---

## ✅ Vérification

```bash
# 1. API Python
curl http://localhost:8001/
# {"status": "ok", "service": "Calcul des Moyennes - Burkina Faso"}

# 2. API Node
curl http://localhost:3000/
# Voir la réponse du serveur

# 3. Test complet
python3 test_moyennes.py
# Devrait afficher les 4 tests
```

---

## 📦 Fichiers Importants

| Fichier | Rôle |
|---------|------|
| `services/moteur_moyennes_bf.py` | 🧮 Moteur de calcul |
| `services/api_moyennes.py` | 🌐 API FastAPI |
| `routes/eleveRouteMoyennes.js` | 🔗 Routes Express |
| `frontend/src/components/EleveMoyennes.vue` | 🎨 Composant Vue |
| `DOCUMENTATION_MOYENNES.md` | 📚 Documentation complète |

---

## 🔗 Endpoints à Tester

### API Python
```bash
POST http://localhost:8001/api/moyennes/calculer
GET  http://localhost:8001/
```

### API Node
```bash
GET  http://localhost:3000/api/eleves/moyennes-courbe/1
GET  http://localhost:3000/api/eleves/historique-moyennes
POST http://localhost:3000/api/eleves/predictions-notes
```

---

## 🎨 UI Disponible

Composant Vue.js complet avec :
- 📊 Courbe interactive (Chart.js)
- 🔮 Prédictions intelligentes
- ⚠️ Alertes en temps réel
- 📚 Tableau détails par matière
- 📈 Évolution trimestrielle

**À ajouter à votre page :**
```vue
<template>
  <EleveMoyennes />
</template>

<script>
import EleveMoyennes from '@/components/EleveMoyennes.vue';
export default {
  components: { EleveMoyennes }
};
</script>
```

---

## ⚠️ Dépannage Rapide

### Python API ne démarre pas
```bash
# Vérifier les dépendances
pip list | grep fastapi

# Réinstaller si absent
pip install -r requirements-python.txt

# Lancer avec debug
python3 -u services/api_moyennes.py
```

### Pas de notes affichées
```bash
# Vérifier les données en BDD
psql -U postgres -d campus_numerique_db
SELECT COUNT(*) FROM pedagogie.notes_evaluations;

# Si 0, ajouter des données de test manuellement
```

### Port déjà utilisé
```bash
# Node (port 3000)
lsof -i :3000
kill -9 <PID>

# Python (port 8001)
lsof -i :8001
kill -9 <PID>
```

---

## 📖 Pour Aller Plus Loin

- **Documentation complète** → `DOCUMENTATION_MOYENNES.md`
- **Résumé d'intégration** → `RESUME_INTEGRATION.md`
- **Configuration détaillée** → `.env.example`
- **Tests avancés** → `test_moyennes.py`

---

## 🎉 C'est Prêt !

Vous avez maintenant un système complet de calcul des moyennes avec :

✅ **Coefficients réels** (Burkina Faso)  
✅ **Calculs avancés** (80% compositions + 20% devoirs)  
✅ **Courbe interactive** (Chart.js)  
✅ **Prédictions intelligentes** (note minimale pour cible)  
✅ **Alertes automatiques** (détection baisses)  
✅ **Temps réel** (WebSocket)  
✅ **Historique complet** (cache + base)  

**Bon courage !** 🚀🇧🇫
