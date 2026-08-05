# 📚 DOCUMENTATION - Système de Calcul des Moyennes Burkina Faso

## 🎯 Vue d'Ensemble

Ce système fournit un calcul **avancé**, **temps réel** et **prédictif** des moyennes scolaires conforme au système éducatif burkinabé (6ème à Terminale).

### ✨ Fonctionnalités Principales

1. **Calcul Dynamique des Moyennes**
   - Prise en compte des coefficients par classe et série
   - Gestion des types d'évaluations (devoirs vs compositions)
   - Barème sur 20 (Burkina Faso)

2. **Courbe Analytique Interactive**
   - Visualisation graphique en temps réel
   - Évolution note par note
   - Comparaison avec la moyenne générale

3. **Analyse Prédictive**
   - Note minimale pour atteindre une cible
   - Détection automatique des baisses
   - Recommandations intelligentes

4. **Synchronisation Temps Réel**
   - Mise à jour instantanée lors de nouvelles notes
   - Notifications WebSocket
   - Historique complet sauvegardé

5. **Gestion des Convocations**
   - Synchronisation avec le statut de l'élève
   - Accusé de réception automatique
   - Affichage sur le tableau de bord

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vue.js)                        │
│              EleveMoyennes.vue Component                     │
│                  - Courbe interactive                       │
│                  - Tableau de bord                          │
│                  - Prédictions                              │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│               BACKEND NODE.JS (Express)                      │
│          eleveRouteMoyennes.js Endpoints                     │
│   - GET  /api/eleves/moyennes-courbe/:trimestre            │
│   - POST /api/eleves/courbe-data                           │
│   - GET  /api/eleves/historique-moyennes                   │
│   - POST /api/eleves/predictions-notes                     │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│           API FASTAPI (Python) - Port 8001                  │
│              services/api_moyennes.py                       │
│   - POST /api/moyennes/calculer                            │
│   - POST /api/moyennes/courbe-interactive                  │
│   - POST /api/moyennes/analyse-predictive                  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│             MOTEUR PYTHON (Calcul)                          │
│         services/moteur_moyennes_bf.py                      │
│   MoteurMoyennesBF avec coefficients burkinabé              │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│              BASE DE DONNÉES PostgreSQL                      │
│  - pedagogie.matieres (matières réelles)                   │
│  - pedagogie.coefficients_par_classe (coeffs)              │
│  - pedagogie.notes_evaluations (notes)                     │
│  - pedagogie.historique_moyennes (cache/historique)        │
│  - gestion.convocations (convocations)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Structure des Données

### 1. Table `pedagogie.matieres`

Contient **toutes les matières réelles** du système éducatif burkinabé :

```sql
CREATE TABLE pedagogie.matieres (
    id_matiere UUID PRIMARY KEY,
    libelle_matiere VARCHAR(100) UNIQUE NOT NULL,
    coefficient INT,
    domaine VARCHAR(100),
    specialites_concernees VARCHAR(255)
);

-- Exemples :
-- Français, Anglais, Mathématiques, SVT, Physique-Chimie
-- EPS, ECM, Histoire-Géographie, Philosophie (Terminale)
```

### 2. Table `pedagogie.coefficients_par_classe`

Stocke les coefficients **par classe et série** :

```sql
CREATE TABLE pedagogie.coefficients_par_classe (
    classe VARCHAR(20),          -- SIXIEME, SECONDE, TERMINALE, etc.
    serie VARCHAR(10),           -- GENERAL, A4, D, C
    matiere_id UUID,
    coefficient_corrige INT,
    type_note VARCHAR(50)        -- EVALUATION_CONTINUE ou COMPOSITION
);

-- Exemples :
-- (SECONDE, GENERALE, Français_id, 3, EVALUATION_CONTINUE)
-- (TERMINALE, A4, Français_id, 5, COMPOSITION)
-- (TERMINALE, D, Physique_id, 5, COMPOSITION)
```

### 3. Table `pedagogie.notes_evaluations`

Chaque évaluation de l'élève :

```sql
CREATE TABLE pedagogie.notes_evaluations (
    id_evaluation UUID PRIMARY KEY,
    id_eleve UUID,               -- Référence à l'élève
    id_matiere UUID,             -- Matière
    id_professeur UUID,          -- Qui a saisi
    note NUMERIC(5,2),           -- 0-20
    trimestre SMALLINT,          -- 1, 2 ou 3
    type_evaluation VARCHAR(50), -- DEVOIR ou COMPOSITION
    date_evaluation TIMESTAMPTZ,
    classe_eleve VARCHAR(20),    -- Classe de l'élève au moment du devoir
    serie_eleve VARCHAR(10)      -- Série
);
```

### 4. Table `pedagogie.historique_moyennes` (Nouveau)

Cache les moyennes calculées pour performance :

```sql
CREATE TABLE pedagogie.historique_moyennes (
    id_eleve UUID,
    classe VARCHAR(20),
    serie VARCHAR(10),
    trimestre SMALLINT,
    annee_scolaire VARCHAR(9),
    moyenne_generale NUMERIC(5,2),
    moyenne_par_matiere JSONB,   -- {"Français": 15.5, "Maths": 12}
    date_calcul TIMESTAMPTZ
);
```

---

## 🔧 Installation & Configuration

### Étape 1 : Prérequis

```bash
# Python 3.8+
python3 --version

# Node.js
node --version
npm --version

# PostgreSQL
psql --version
```

### Étape 2 : Cloner et configurer

```bash
cd campus_numerique_backend

# Copier et adapter les fichiers de configuration
cp .env.example .env
# Éditer .env avec vos paramètres
```

### Étape 3 : Exécuter les migrations SQL

```bash
# Se connecter à PostgreSQL
psql -U postgres -d campus_numerique_db

# Exécuter les scripts SQL dans l'ordre :
\i campus_numerique_db/16b_migration_coefficients.sql
\i campus_numerique_db/16_matieres_coefficients_burkina.sql
```

### Étape 4 : Installer les dépendances

```bash
# Python
pip install fastapi uvicorn pydantic psycopg2-binary

# Node.js (frontend)
npm install chart.js vue-chartjs
```

### Étape 5 : Lancer les services

**Terminal 1 - Backend Node.js :**
```bash
npm start
# ou
node server.js
```

**Terminal 2 - API Python :**
```bash
python3 services/api_moyennes.py
# Accessible sur http://localhost:8001
```

**Terminal 3 - Frontend (optionnel si développement) :**
```bash
cd frontend
npm run dev
```

---

## 📡 Endpoints API

### Backend Node.js (Port 3000)

#### 1. GET `/api/eleves/moyennes-courbe/:trimestre`

Récupère les moyennes et courbe pour un trimestre donné.

**Paramètres :**
- `trimestre` : 1, 2 ou 3

**Response :**
```json
{
  "success": true,
  "data": {
    "classe": "SECONDE",
    "serie": "GENERALE",
    "moyenne_generale": {
      "moyenne_generale": 14.25,
      "appreciation": "Très Bon"
    },
    "evolution": {
      "evolution": [
        {"trimestre": 1, "moyenne": 14.5, "count": 12}
      ],
      "tendance": "STABLE"
    },
    "predictions": {
      "pour_avoir_10": 8.5,
      "pour_avoir_12": 11.2,
      "pour_avoir_14": 14.0
    },
    "courbe_chronologique": [...],
    "alertes": []
  }
}
```

#### 2. GET `/api/eleves/historique-moyennes`

Récupère l'historique complet des moyennes.

**Response :**
```json
{
  "success": true,
  "data": [
    {
      "classe": "SECONDE",
      "serie": "GENERALE",
      "trimestre": 1,
      "moyenne_generale": 14.25,
      "moyenne_par_matiere": {
        "Français": 15.5,
        "Mathématiques": 13.0
      }
    }
  ]
}
```

#### 3. POST `/api/eleves/predictions-notes`

Calcule la note minimale pour atteindre une cible.

**Payload :**
```json
{
  "cible": 14,
  "prochains_devoirs": 2
}
```

**Response :**
```json
{
  "success": true,
  "data": {
    "statut": "POSSIBLE",
    "note_minimale": 14.5,
    "conseil": "Il faut minimum 14.5/20 aux 2 prochains devoirs"
  }
}
```

### API Python FastAPI (Port 8001)

#### 1. POST `/api/moyennes/calculer`

Calcule les moyennes avec tous les détails.

**Payload :**
```json
{
  "id_eleve": "user-uuid",
  "classe": "SECONDE",
  "serie": "GENERALE",
  "notes": [
    {
      "note": 15.5,
      "matiere": "Français",
      "type": "DEVOIR",
      "trimestre": 1,
      "date": "2025-01-10"
    }
  ]
}
```

#### 2. POST `/api/moyennes/analyse-predictive`

Analyse prédictive simple.

**Payload :**
```json
{
  "moyenne_actuelle": 14.0,
  "somme_coefs": 25,
  "cible": 15,
  "prochains_devoirs": 2
}
```

---

## 📊 Coefficients Burkinabé

### 🔹 Classes 6ème-4ème (Premier Cycle)

| Matière | Coefficient |
|---------|------------|
| Français | 3 |
| Mathématiques | 3 |
| Anglais | 2 |
| Histoire-Géographie | 2 |
| SVT | 2 |
| Physique-Chimie | 2 |
| EPS | 1 |
| ECM | 1 |

**Somme des coefficients : 16**

### 🔹 Classe 3ème (BFEM)

| Matière | Coefficient |
|---------|------------|
| Français | 4 |
| Mathématiques | 4 |
| Anglais | 3 |
| SVT | 3 |
| Physique-Chimie | 3 |
| Histoire-Géographie | 3 |
| ECM | 2 |
| EPS | 1 |

**Somme des coefficients : 23**

### 🔹 Seconde Générale

| Matière | Coefficient |
|---------|------------|
| Français | 3 |
| Mathématiques | 3 |
| Anglais | 2 |
| Histoire-Géographie | 2 |
| SVT | 2 |
| Physique-Chimie | 2 |
| Informatique | 2 |
| ECM | 1 |
| EPS | 1 |

**Somme des coefficients : 18**

### 🔹 Terminale Série A4 (Littéraire)

| Matière | Coefficient |
|---------|------------|
| Français | 5 |
| Philosophie | 4 |
| Littérature Générale | 4 |
| Anglais | 4 |
| Allemand | 3 |
| Espagnol | 3 |
| Histoire-Géographie | 3 |
| Mathématiques | 2 |
| SVT | 1 |
| ECM | 1 |
| EPS | 1 |

**Somme des coefficients : 31**

### 🔹 Terminale Série D (SVT)

| Matière | Coefficient |
|---------|------------|
| Mathématiques | 4 |
| Physique-Chimie | 5 |
| SVT | 5 |
| Français | 2 |
| Philosophie | 2 |
| Anglais | 2 |
| Histoire-Géographie | 1 |
| ECM | 1 |
| EPS | 1 |

**Somme des coefficients : 23**

### 🔹 Terminale Série C (Math+Physique)

| Matière | Coefficient |
|---------|------------|
| Mathématiques | 5 |
| Physique-Chimie | 5 |
| SVT | 4 |
| Sciences de l'Ingénieur | 4 |
| Français | 2 |
| Philosophie | 2 |
| Anglais | 2 |
| Histoire-Géographie | 1 |
| ECM | 1 |
| EPS | 1 |

**Somme des coefficients : 27**

---

## 🔄 Flux de Calcul des Moyennes

### Algorithme Principal

```
1. Récupérer toutes les notes de l'élève
2. Grouper par matière
3. Pour chaque matière :
   a. Séparer compositions et devoirs
   b. Moyenne = (moy_compositions × 0.8) + (moy_devoirs × 0.2)
4. Calculer moyenne générale pondérée :
   MG = Σ(moyenne_matière × coefficient) / Σ coefficients
5. Sauvegarder en cache pour performance
6. Générer alertes et prédictions
```

### Exemple de Calcul

**Données :**
- Classe : SECONDE GENERALE
- Notes Français : [14 (dev), 16 (comp)]
- Notes Maths : [13 (dev), 15 (dev)]

**Calcul Français :**
- Moy compositions = 16
- Moy devoirs = 14
- Moyenne = (16 × 0.8) + (14 × 0.2) = 15.2

**Calcul Maths :**
- Pas de composition
- Moyenne = (13 + 15) / 2 = 14.0

**Moyenne Générale :**
- MG = (15.2 × 3 + 14.0 × 3) / (3 + 3)
- MG = (45.6 + 42.0) / 6
- MG = **14.6/20**

---

## 🚨 Détection des Alertes

### Critères

| Type | Condition | Sévérité |
|------|-----------|----------|
| Baisse Générale | Δ > 3 points | 🔴 CRITIQUE |
| Baisse Légère | 1 < Δ ≤ 3 | 🟡 AVERTISSEMENT |
| Moyenne Faible | MG < 8 | 🔴 CRITIQUE |
| Matière Fragile | Note < 8 | 🟡 AVERTISSEMENT |

---

## 💾 Synchronisation Temps Réel

### WebSocket Events

**Serveur → Client :**
```javascript
// Quand une note est ajoutée
io.to(`eleve-${idEleve}`).emit('mise-a-jour-moyennes', {
  nouvelle_moyenne_generale: 14.5,
  alerte_majeure: false
});

// Quand une convocation est mise à jour
io.to(`eleve-${idEleve}`).emit('convocation-maj', {
  id_convocation: '...',
  nouveau_statut: 'LU'
});
```

---

## 📱 Utilisation Frontend

### Composant Vue.js

```vue
<template>
  <div>
    <!-- Affiche la courbe interactive -->
    <EleveMoyennes />
  </div>
</template>

<script>
import EleveMoyennes from '@/components/EleveMoyennes.vue';

export default {
  components: { EleveMoyennes }
};
</script>
```

### Appels API depuis le frontend

```javascript
// Récupérer moyennes + courbe
const response = await fetch('/api/eleves/moyennes-courbe/1', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

// Calculer prédiction
const prediction = await fetch('/api/eleves/predictions-notes', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ cible: 14, prochains_devoirs: 2 })
});
```

---

## 🐛 Dépannage

### Problème : "API Python non accessible"

```bash
# Vérifier que FastAPI tourne
curl http://localhost:8001/

# Lancer manuellement
python3 services/api_moyennes.py
```

### Problème : "Pas de notes trouvées"

Vérifier que :
1. Les notes existent en BDD
2. Le type_evaluation est défini (DEVOIR ou COMPOSITION)
3. L'élève a une classe_actuelle

### Problème : "Coefficients incorrects"

Vérifier table `pedagogie.coefficients_par_classe` :

```sql
SELECT * FROM pedagogie.coefficients_par_classe
WHERE classe = 'SECONDE' AND serie = 'GENERALE';
```

---

## 📝 Notes & Améliorations Futures

- [ ] Intégration BD pour cache des prédictions
- [ ] Graphique 3D pour comparaison multi-élèves
- [ ] Export PDF des bulletins
- [ ] API mobile natif
- [ ] Notifications push sur baisses
- [ ] IA pour recommandations d'orientation

---

**Version:** 1.0.0  
**Dernier update:** 2025-07-01  
**Système:** Burkina Faso 🇧🇫
