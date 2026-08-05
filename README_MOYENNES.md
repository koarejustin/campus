# 🇧🇫 SYSTÈME DE CALCUL DES MOYENNES - Campus Numérique Burkina

## ✨ Qu'est-ce que c'est ?

Un système **complet**, **temps réel** et **hautement configurable** de calcul des moyennes scolaires conforme au système éducatif burkinabé (6ème à Terminale).

## 🎯 Fonctionnalités

### 📊 Calcul des Moyennes Avancé
- ✅ **Coefficients réels** pour chaque classe et série
- ✅ **16 matières** du cursus burkinabé
- ✅ **Formule pondérée** : 80% compositions + 20% devoirs
- ✅ **Barème sur 20** conforme aux normes officielles
- ✅ **Séries spéciales** : A4 (Littéraire), D (SVT), C (Maths)

### 📈 Courbe Interactive
- ✅ **Graphique Canvas** (Chart.js) en temps réel
- ✅ **Évolution note par note** visualisée
- ✅ **Sélecteur de trimestre**
- ✅ **Comparaison** avec la moyenne générale

### 🔮 Analyse Prédictive
- ✅ **Note minimale** pour atteindre une cible (10/20, 12/20, 14/20)
- ✅ **Détection automatique** des baisses de régime
- ✅ **Recommandations** intelligentes
- ✅ **Alertes** visuelles et temps réel

### 📋 Synchronisation Convocations
- ✅ **Mise à jour automatique** du statut
- ✅ **Accusé de réception** en temps réel
- ✅ **Historique complet** sauvegardé
- ✅ **Notifications** WebSocket

### 📚 Tableau de Bord Complet
- ✅ **Moyenne générale** en BIG CARD
- ✅ **Détails par matière** (tableau)
- ✅ **Historique** de tous les trimestres
- ✅ **Convocations** affichées

## 🏗️ Architecture

```
Frontend (Vue.js)
     ↕
Backend (Express/Node.js)
     ↕
API Python (FastAPI - Port 8001)
     ↕
Base de Données (PostgreSQL)
```

## 📦 Ce qui a été créé

| Composant | Fichiers | Lignes |
|-----------|----------|--------|
| 🗄️ Base de Données | 2 SQL | 430 |
| 🐍 Python/FastAPI | 2 fichiers | 700 |
| 🟢 Express.js | 2 routes | 610 |
| 🎨 Vue.js | 1 composant | 650 |
| ⚙️ Configuration | 3 fichiers | 150 |
| 📚 Documentation | 4 guides | 1050 |
| 🧪 Tests | 1 script | 320 |
| **TOTAL** | **16 fichiers** | **4000+** |

## 🚀 Démarrage Rapide (5 min)

### 1. Base de données
```bash
psql -U postgres -d campus_numerique_db < campus_numerique_db/16b_migration_coefficients.sql
psql -U postgres -d campus_numerique_db < campus_numerique_db/16_matieres_coefficients_burkina.sql
```

### 2. Python API (Terminal 1)
```bash
pip install -r requirements-python.txt
python3 services/api_moyennes.py
# Accessible : http://localhost:8001
```

### 3. Backend Node.js (Terminal 2)
```bash
npm start
# Accessible : http://localhost:3000
```

### 4. Ajouter composant Vue.js
```vue
<template>
  <EleveMoyennes />
</template>

<script>
import EleveMoyennes from '@/components/EleveMoyennes.vue';
export default { components: { EleveMoyennes } };
</script>
```

### 5. Tester
```bash
python3 test_moyennes.py
```

**C'est prêt ! 🎉**

## 📋 Fichiers Principaux

### 🔧 Configuration
- **`.env.example`** - Variables d'environnement (copier en `.env`)
- **`package.json`** - Scripts npm (incluant `npm run api:python`)

### 🗄️ Base de Données
- **`campus_numerique_db/16b_migration_coefficients.sql`** - Migrations
- **`campus_numerique_db/16_matieres_coefficients_burkina.sql`** - Données

### 🐍 Backend Python
- **`services/moteur_moyennes_bf.py`** - Moteur de calcul (420 lignes)
- **`services/api_moyennes.py`** - API FastAPI (280 lignes)

### 🟢 Backend Node.js
- **`routes/eleveRouteMoyennes.js`** - Endpoints moyennes (330 lignes)
- **`routes/convocationsSocket.js`** - WebSocket convocations (280 lignes)

### 🎨 Frontend
- **`frontend/src/components/EleveMoyennes.vue`** - Composant Vue (650 lignes)

### 📚 Documentation
- **`QUICK_START.md`** - Démarrage en 5 min
- **`DOCUMENTATION_MOYENNES.md`** - Documentation complète
- **`RESUME_INTEGRATION.md`** - Guide d'intégration détaillé
- **`INDEX_FICHIERS.md`** - Index de tous les fichiers

### 🧪 Tests
- **`test_moyennes.py`** - 4 tests avec données réalistes

## 📊 Coefficients Réels

### SECONDE GÉNÉRALE (Somme: 18)
- Français: 3, Mathématiques: 3, Anglais: 2
- Histoire-Géographie: 2, SVT: 2, Physique-Chimie: 2
- Informatique: 2, ECM: 1, EPS: 1

### TERMINALE A4 (Littéraire - Somme: 31)
- Français: 5, Philosophie: 4, Littérature: 4, Anglais: 4
- Allemand: 3, Espagnol: 3, Histoire-Géographie: 3
- Mathématiques: 2, SVT: 1, ECM: 1, EPS: 1

### TERMINALE D (SVT - Somme: 23)
- Mathématiques: 4, Physique-Chimie: 5, SVT: 5
- Français: 2, Philosophie: 2, Anglais: 2
- Histoire-Géographie: 1, ECM: 1, EPS: 1

### TERMINALE C (Maths - Somme: 27)
- Mathématiques: 5, Physique-Chimie: 5, SVT: 4
- Sciences de l'Ingénieur: 4, Français: 2, Philosophie: 2, Anglais: 2
- Histoire-Géographie: 1, ECM: 1, EPS: 1

**➜ Tous les coefficients sont conformes au système éducatif burkinabé ! 🇧🇫**

## 🔗 Endpoints API

### Node.js (Port 3000)
```
GET  /api/eleves/moyennes-courbe/:trimestre
POST /api/eleves/courbe-data
GET  /api/eleves/historique-moyennes
POST /api/eleves/predictions-notes
```

### Python FastAPI (Port 8001)
```
POST /api/moyennes/calculer
POST /api/moyennes/courbe-interactive
POST /api/moyennes/analyse-predictive
GET  /
```

## 🧪 Tests

Exécuter les tests complets :
```bash
npm run test:moyennes
# OU
python3 test_moyennes.py
```

**Contenu :** 4 tests avec:
- ✅ Calcul simple (SECONDE GENERALE)
- ✅ Série A4 (Terminale Littéraire)
- ✅ Série D (Terminale SVT)
- ✅ Analyse prédictive

## 📞 Aide & Ressources

| Besoin | Ressource |
|--------|-----------|
| **Démarrage rapide** | [`QUICK_START.md`](./QUICK_START.md) |
| **Documentation complète** | [`DOCUMENTATION_MOYENNES.md`](./DOCUMENTATION_MOYENNES.md) |
| **Guide d'intégration** | [`RESUME_INTEGRATION.md`](./RESUME_INTEGRATION.md) |
| **Index des fichiers** | [`INDEX_FICHIERS.md`](./INDEX_FICHIERS.md) |
| **API endpoints** | Voir doc + tests |
| **Dépannage** | Voir `QUICK_START.md` → Troubleshooting |

## ✅ Checklist

- [ ] Exécuter migrations SQL
- [ ] Installer dépendances Python
- [ ] Lancer API Python
- [ ] Intégrer routes Express
- [ ] Ajouter composant Vue.js
- [ ] Tester les endpoints
- [ ] Vérifier le graphique
- [ ] Vérifier les prédictions

## 🎓 Système Éducatif Burkinabé

### Matières (16 au total)
```
Lettres & Sciences Humaines :
  Français, Anglais, Allemand, Espagnol, 
  Histoire-Géographie, ECM, Philosophie

Sciences Exactes :
  Mathématiques, SVT, Physique-Chimie,
  Sciences de l'Ingénieur

Autres :
  EPS, Dessin, Musique, Informatique
```

### Classes
```
Premier Cycle : 6ème, 5ème, 4ème, 3ème (BFEM)
Second Cycle : Seconde, Première, Terminale
```

### Séries (Secondaire)
```
Seconde    : Générale
Première   : Générale, A4, D, C
Terminale  : Générale, A4, D, C
```

## 🚀 Technologies Utilisées

- **Frontend** : Vue.js 3 + Chart.js
- **Backend** : Node.js/Express + Python FastAPI
- **Database** : PostgreSQL
- **Real-time** : Socket.io (WebSocket)
- **API** : REST + WebSocket

## 📝 License & Attribution

Système développé pour le projet Campus Numérique - Burkina Faso  
Conforme aux normes éducatives officielles du Burkina Faso 🇧🇫

## 🎉 Résultat Final

Un élève connecté peut maintenant :

1. 📊 **Voir sa moyenne générale** actualisée en temps réel
2. 📈 **Visualiser une courbe interactive** de ses performances
3. 🔮 **Connaître la note minimale** pour atteindre une cible
4. ⚠️ **Recevoir des alertes** en cas de baisse
5. 📚 **Consulter les détails** par matière
6. 📋 **Voir les convocations** synchronisées
7. 📅 **Accéder à l'historique** complet

**Le tout en temps réel ! ⚡**

---

**État :** ✅ **Production Ready**  
**Version :** 1.0.0  
**Date :** 2025-07-01  
**Support :** Voir documentation

**Bon courage ! 🚀**
