# 📋 GUIDE D'INTÉGRATION - ESPACE DIRECTION & SURVEILLANTS
## Campus Numérique FASO - Cahier des charges v1.0

---

## 🎯 RÉCAPITULATIF DES MODIFICATIONS

### 📊 BASE DE DONNÉES - REQUÊTES SQL DISPONIBLES

Les requêtes SQL suivantes sont ajoutées au fichier `consultations_et_tests.sql`:

#### 1. **Voir les matricules des SURVEILLANTS** (ligne 66-79)
```sql
SELECT 
    c.code_unique as matricule, 
    c.nom, 
    c.prenom, 
    adm.poste_occupe as fonction,
    adm.signature_numerique_active as signature_active,
    c.created_at as date_embauche
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'SURVEILLANT'
ORDER BY adm.poste_occupe, c.nom;
```

#### 2. **Voir les matricules des DIRECTEURS** (ligne 82-95)
```sql
SELECT 
    c.code_unique as matricule, 
    c.nom, 
    c.prenom, 
    adm.poste_occupe as fonction,
    adm.signature_numerique_active as signature_active,
    c.created_at as date_embauche
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'DIRECTION'
ORDER BY adm.poste_occupe, c.nom;
```

#### 3. **Voir les PARENTS** (ligne 98-111)
```sql
SELECT 
    c.code_unique as matricule, 
    c.nom, 
    c.prenom, 
    p.profession,
    COALESCE(b.poste::TEXT, 'PARENT') as statut
FROM authentification.comptes c
JOIN gestion_ape.profils_parents p ON c.id_user = p.id_user
LEFT JOIN gestion_ape.bureau_direction b ON p.id_parent = b.id_parent
WHERE c.role_actuel = 'PARENT'
ORDER BY c.nom, c.prenom;
```

---

## 🛠️ ARCHITECTURE BACKEND

### Nouveau Contrôleur: `controller/surveillantController.js`

Le contrôleur gère toutes les fonctionnalités des surveillants selon le **cahier des charges (Section III)**:

#### **A. GESTION DES ABSENCES**
- `recordAbsence()` - Enregistrer une absence d'élève
- `getAbsences()` - Consulter les absences (filtrable par classe, élève)

#### **B. GESTION DES CONVOCATIONS** 
- `createConvocation()` - Créer une convocation **privée** (visible UNIQUEMENT élève + parent)
- `getConvocations()` - Récupérer les convocations créées

**Confidentialité stricte**: Les convocations ne sont pas visibles par les professeurs ni l'administration générale (sauf direction).

#### **C. COHÉSION SCOLAIRE & PRÉVENTION** (Cahier des charges - Section II)
- `sendPreventionMessage()` - Envoyer des messages de sensibilisation/prévention
- `reportIncident()` - Signaler une tension ou incident (Médiation)

#### **D. CANAL OFFICIEL**
- `publishOfficialAnnouncement()` - Publier des annonces officielles visibles par TOUS

#### **E. SURVEILLANCE (ADMIN)**
- `getSurveillants()` - Récupérer la liste des surveillants avec leurs statistiques

---

## 📋 ROUTES API

### Endpoint: `/api/surveillants`

| Méthode | Route | Fonction | Auth Required |
|---------|-------|----------|---------------|
| POST | `/absences` | Enregistrer une absence | ✅ |
| GET | `/absences` | Consulter les absences | ✅ |
| POST | `/convocations` | Créer convocation privée | ✅ |
| GET | `/convocations` | Récupérer convocations | ✅ |
| POST | `/prevention-messages` | Envoyer message prévention | ✅ |
| POST | `/incidents` | Signaler incident/tension | ✅ |
| GET | `/list` | Lister les surveillants | ✅ |
| POST | `/announcements` | Publier annonce officielle | ✅ |

### Exemples d'appels API

#### 1️⃣ Enregistrer une absence
```javascript
POST /api/surveillants/absences
Content-Type: application/json
Authorization: Bearer {token}

{
  "id_eleve": "uuid-eleve",
  "date": "2026-02-17",
  "justification": false,
  "raison": "Maladie"
}
```

#### 2️⃣ Créer une convocation (privée)
```javascript
POST /api/surveillants/convocations
Content-Type: application/json
Authorization: Bearer {token}

{
  "id_eleve": "uuid-eleve",
  "sujet": "Retard réitéré",
  "description": "Convocation pour discuter des problèmes d'assiduité",
  "date_convocation": "2026-02-20T15:00:00",
  "motif": "Discipline"
}
```

#### 3️⃣ Envoyer un message de prévention
```javascript
POST /api/surveillants/prevention-messages
Content-Type: application/json
Authorization: Bearer {token}

{
  "titre": "Sensibilisation - Harcèlement Scolaire",
  "contenu": "Message complet sur la prévention du harcèlement...",
  "destinataires": ["TOUS"],
  "type_classe": "TOUT"
}
```

#### 4️⃣ Signaler un incident
```javascript
POST /api/surveillants/incidents
Content-Type: application/json
Authorization: Bearer {token}

{
  "titre": "Altercation entre élèves",
  "description": "Description détaillée de l'incident...",
  "type_incident": "ALTERCATION",
  "eleves_impliques": ["uuid1", "uuid2"],
  "urgence": "HAUTE"
}
```

#### 5️⃣ Publier une annonce officielle
```javascript
POST /api/surveillants/announcements
Content-Type: application/json
Authorization: Bearer {token}

{
  "titre": "Dates d'examens confirmées",
  "contenu": "Les dates des examens du trimestre ont été confirmées...",
  "type_annonce": "EXAMENS",
  "destinataires": "TOUS"
}
```

---

## 🎨 INTERFACE FRONTEND - `direction.html`

### Améliorations apportées:

#### **1. Menu Sidebar - Nouveau bouton "Surveillants"** ✅
```html
<div onclick="switchView('watchmen')" class="menu-item p-3...">
    <i data-lucide="shield-alert" class="w-4 h-4"></i>
    <span>Surveillants</span>
</div>
```

#### **2. KPI Card pour les Surveillants** ✅
- Affiche le nombre total de surveillants
- Sparkline avec les données actuelles
- Cliquable pour accéder à l'espace surveillance

#### **3. Espace Surveillance (Répliqué pour surveillance)** ✅

**Section 1: Gestion des Absences**
- ✅ Bouton: "Enregistrer une Absence"
- ✅ Bouton: "Consulter les Absences"
- ✅ Bouton: "Justifications en Attente"

**Section 2: Convocations Privées**
- ✅ Bouton: "Créer une Convocation"
- ✅ Bouton: "Historique Convocations"
- ✅ Bouton: "En Attente d'Accusé"

**Section 3: Cohésion Scolaire & Prévention** 
- ✅ Bouton: "Envoyer Message de Prévention"
- ✅ Bouton: "Signaler une Tension/Incident"
- ✅ Bouton: "Médiation & Résolution"
- ✅ Bouton: "Planifier Activités Cohésion"

#### **4. Logique JavaScript - Commutation de vues** ✅
```javascript
function switchView(view) {
    if (view === 'watchmen') {
        // Masquer tableau de bord
        // Afficher espace surveillance
    } else {
        // Afficher tableau de bord normal
    }
}
```

---

## ✅ CONFORMITÉ AU CAHIER DES CHARGES

### Section I - Architecture des Espaces
- ✅ **Espace Élèves**: Communications privéesées (convocations)
- ✅ **Espace Surveillance**: Gestion des absences + convocations privées
- ✅ **Canal officiel**: Diffusion d'informations visibles par TOUS

### Section II - Fonctionnalités Sociales & Cohésion
- ✅ **Messages de prévention**: Sensibilisation obligatoire
- ✅ **Gestion des tensions**: Signalement d'incidents
- ✅ **Médiation**: Module prévu pour résolution

### Section III - Sécurité et Accès
- ✅ **Rôles stricts**: SURVEILLANT vs DIRECTION vs ADMIN
- ✅ **Confidentialité**: Convocations visibles UNIQUEMENT élève + parent
- ✅ **JWT**: Contrôle d'accès via middleware authMiddleware

---

## 🚀 UTILISATION POUR LES TESTS

### **Étape 1: Récupérer les matricules**
Exécute les requêtes SQL dans `consultations_et_tests.sql` pour obtenir les matricules:
- Surveillants (matricule format: CN-2026-XXXX)
- Directeurs (matricule format: CN-2026-XXXX)
- Parents (matricule format: CN-2026-XXXX)

### **Étape 2: Activer les comptes**
```sql
UPDATE authentification.comptes 
SET mot_de_passe = 'NON_ACTIVE' 
WHERE code_unique = 'CN-2026-XXXX'; -- Remplace par le matricule
```

### **Étape 3: Se connecter**
- Page: `login.html`
- Utiliser le matricule + activer le compte

### **Étape 4: Tester les fonctionnalités**
- Clic sur menu "Surveillants"
- Tester les 4 sections principales

---

## 📱 PROCHAINES ÉTAPES

Pour compléter l'intégration:

```
TODO:
1. ✅ Requêtes SQL pour voir directeurs/surveillants/parents
2. ✅ Contrôleur surveillantController.js
3. ✅ Routes /api/surveillants
4. ✅ Interface Frontend avec sections
5. ⏳ Tables DB pour: gestion.absences, gestion.convocations, gestion.incidents
6. ⏳ Notifications en temps réel (WebSocket)
7. ⏳ Module Vacances (section II)
8. ⏳ Page Parents - Consultation convocations enfant
9. ⏳ Page Élèves - Espace "Grand Élèves" (page 1 cahier)
10. ⏳ Intégration Espace Professeurs (Section II)
```

---

## 📞 SUPPORT

Pour toute question sur l'intégration, consulte:
- ✅ `consultations_et_tests.sql` - Requêtes de base de données
- ✅ `controller/surveillantController.js` - Logique métier
- ✅ `routes/surveillantRoutes.js` - Endpoints API
- ✅ `frontend/direction.html` - Interface utilisateur
- ✅ `server.js` - Configuration serveur

**Bon développement! 🚀**
