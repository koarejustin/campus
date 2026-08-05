/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  COMPOSANT VUE.JS - Tableau de Bord Moyennes et Courbe Analytique
 *  
 *  À ajouter à frontend/src/components/EleveMoyennes.vue
 *  
 *  Dépendances :
 *  - Chart.js
 *  - vue-chartjs
 * ═══════════════════════════════════════════════════════════════════════════════
 */

<template>
  <div class="container-moyennes">
    <!-- HEADER -->
    <div class="header-moyennes">
      <h1>📊 Tableau de Bord - Moyennes & Évolution</h1>
      <p>{{ prenom }} {{ nom }}</p>
      <button v-if="trimestres.length > 1" @click="afficherSelectTrimestre = !afficherSelectTrimestre" class="btn-filter">
        Trimestre {{ trimestreActuel }}
      </button>
    </div>

    <!-- SÉLECTEUR TRIMESTRE -->
    <div v-if="afficherSelectTrimestre" class="select-trimestre">
      <button
        v-for="t in trimestres"
        :key="t"
        @click="changerTrimestre(t)"
        :class="{ active: t === trimestreActuel }"
      >
        Trimestre {{ t }}
      </button>
    </div>

    <!-- LOADING -->
    <div v-if="chargement" class="loading">
      <span>⏳ Calcul des moyennes en cours...</span>
    </div>

    <!-- ERREUR -->
    <div v-if="erreur" class="erreur">
      <strong>⚠️ Erreur :</strong> {{ erreur }}
    </div>

    <!-- CONTENU PRINCIPAL -->
    <div v-if="!chargement && donnees" class="contenu-moyennes">

      <!-- 1. MOYENNE GÉNÉRALE - BIG CARD -->
      <div class="card-grande moyenne-generale">
        <div class="valeur-principale">{{ donnees.moyenne_generale.moyenne_generale.toFixed(2) }}/20</div>
        <div class="appreciation">{{ donnees.moyenne_generale.appreciation }}</div>
        <div class="stats">
          <span>📈 Somme coeffs : {{ donnees.moyenne_generale.somme_coefs }}</span>
        </div>
      </div>

      <!-- 2. ÉVOLUTION & TENDANCE -->
      <div class="card-evolution">
        <h3>📉 Évolution Trimestrielle</h3>
        <div class="evolution-items">
          <div v-for="item in donnees.evolution.evolution" :key="item.trimestre" class="evolution-item">
            <span>T{{ item.trimestre }}</span>
            <strong>{{ item.moyenne.toFixed(2) }}</strong>
            <small>({{ item.count }} notes)</small>
          </div>
        </div>
        <div :class="['tendance', donnees.evolution.tendance.toLowerCase()]">
          <strong>Tendance : {{ donnees.evolution.tendance }}</strong>
        </div>
      </div>

      <!-- 3. ALERTES S'IL Y EN A -->
      <div v-if="donnees.alertes.length > 0" class="alertes">
        <h3>⚠️ Alertes</h3>
        <div v-for="(alerte, idx) in donnees.alertes" :key="idx" :class="['alerte', alerte.severite.toLowerCase()]">
          <strong>{{ alerte.type }}</strong> — {{ alerte.message }}
        </div>
      </div>

      <!-- 4. PRÉDICTIONS -->
      <div class="card-predictions">
        <h3>🔮 Prédictions</h3>
        <div class="predictions-grid">
          <div class="prediction-item">
            <span>Pour 10/20</span>
            <strong :class="{ possible: predictions.pour_avoir_10 <= 20, impossible: predictions.pour_avoir_10 > 20 }">
              {{ formatPrediction(predictions.pour_avoir_10) }}
            </strong>
          </div>
          <div class="prediction-item">
            <span>Pour 12/20</span>
            <strong :class="{ possible: predictions.pour_avoir_12 <= 20, impossible: predictions.pour_avoir_12 > 20 }">
              {{ formatPrediction(predictions.pour_avoir_12) }}
            </strong>
          </div>
          <div class="prediction-item">
            <span>Pour 14/20</span>
            <strong :class="{ possible: predictions.pour_avoir_14 <= 20, impossible: predictions.pour_avoir_14 > 20 }">
              {{ formatPrediction(predictions.pour_avoir_14) }}
            </strong>
          </div>
          <div class="prediction-item">
            <span>Pour maintenir</span>
            <strong v-if="predictions.pour_maintenir"
              :class="{ possible: predictions.pour_maintenir <= 20, impossible: predictions.pour_maintenir > 20 }">
              {{ formatPrediction(predictions.pour_maintenir) }}
            </strong>
            <strong v-else>-</strong>
          </div>
        </div>
      </div>

      <!-- 5. COURBE ANALYTIQUE PRINCIPALE -->
      <div class="courbe-container">
        <h3>📈 Courbe Analytique - Évolution Note par Note</h3>
        <canvas ref="chartEvolution"></canvas>
      </div>

      <!-- 6. TABLEAU DES MOYENNES PAR MATIÈRE -->
      <div class="tableau-matieres">
        <h3>📚 Détails par Matière</h3>
        <table>
          <thead>
            <tr>
              <th>Matière</th>
              <th>Moyenne</th>
              <th>Coefficient</th>
              <th>Pondération</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(detail, matiere) in donnees.details_matieres" :key="matiere">
              <td><strong>{{ matiere }}</strong></td>
              <td>{{ detail.moyenne.toFixed(2) }}</td>
              <td>× {{ detail.coefficient }}</td>
              <td>{{ (detail.moyenne * detail.coefficient).toFixed(2) }}</td>
              <td>{{ detail.nombre_notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 7. CONVOCATIONS RÉCENTES -->
      <div v-if="donnees.convocations && donnees.convocations.length > 0" class="convocations">
        <h3>📋 Convocations Récentes</h3>
        <div v-for="conv in donnees.convocations" :key="conv.id_convocation" :class="['convocation', conv.statut.toLowerCase()]">
          <div class="conv-titre">{{ conv.motif }}</div>
          <div class="conv-date">{{ formatDate(conv.date_convocation) }}</div>
          <div class="conv-status">
            <span :class="['badge', conv.statut.toLowerCase()]">{{ conv.statut }}</span>
            <span v-if="conv.accusé_reception_date" class="accord">✓ Accusé reçu</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default {
  name: 'EleveMoyennes',
  components: { Line },
  data() {
    return {
      donnees: null,
      predictions: {},
      chargement: true,
      erreur: null,
      trimestreActuel: 1,
      trimestres: [1, 2, 3],
      afficherSelectTrimestre: false,
      prenom: '',
      nom: '',
      chart: null
    };
  },
  async mounted() {
    await this.chargerMoyennes();
    // Souscrire aux mises à jour en temps réel
    this.$socket.on('mise-a-jour-moyennes', () => {
      this.chargerMoyennes();
    });
  },
  methods: {
    async chargerMoyennes() {
      try {
        this.chargement = true;
        this.erreur = null;

        // Appel API
        const response = await fetch(
          `/api/eleves/moyennes-courbe/${this.trimestreActuel}`,
          {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }
        );

        if (!response.ok) throw new Error('Erreur lors du chargement');

        const res = await response.json();
        this.donnees = res.data;
        this.predictions = res.data.predictions || {};
        this.prenom = res.data.prenom || 'Élève';
        this.nom = res.data.nom || '';

        // Initialiser le graphique
        this.$nextTick(() => {
          this.initChart();
        });

      } catch (error) {
        console.error('Erreur:', error);
        this.erreur = error.message;
      } finally {
        this.chargement = false;
      }
    },

    initChart() {
      if (!this.donnees) return;

      const ctx = this.$refs.chartEvolution?.getContext('2d');
      if (!ctx) return;

      // Détruire ancien graphique si existe
      if (this.chart) this.chart.destroy();

      const courbeData = this.donnees.courbe_chronologique || [];
      
      this.chart = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: courbeData.map((_, i) => `Note ${i + 1}`),
          datasets: [
            {
              label: 'Évolution des notes',
              data: courbeData.map(n => n.note),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: 'rgb(75, 192, 192)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            },
            {
              label: 'Moyenne générale',
              data: Array(courbeData.length).fill(this.donnees.moyenne_generale.moyenne_generale),
              borderColor: 'rgba(255, 99, 132, 0.8)',
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            title: {
              display: true,
              text: `Courbe Trimestre ${this.trimestreActuel}`
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const note = courbeData[context.dataIndex];
                  return `${note.matiere} (${note.type}) : ${context.parsed.y.toFixed(2)}/20`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 20,
              ticks: {
                callback: function(value) {
                  return value + '/20';
                }
              }
            }
          }
        }
      });
    },

    changerTrimestre(trimestre) {
      this.trimestreActuel = trimestre;
      this.afficherSelectTrimestre = false;
      this.chargerMoyennes();
    },

    formatPrediction(valeur) {
      if (valeur > 20) return '❌ Impossible';
      if (valeur < 0) return '✓ Garanti';
      return `${valeur.toFixed(1)}/20`;
    },

    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
};
</script>

<style scoped>
.container-moyennes {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header-moyennes {
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 2px solid #007bff;
  padding-bottom: 20px;
}

.header-moyennes h1 {
  font-size: 2em;
  color: #333;
  margin-bottom: 5px;
}

.header-moyennes p {
  font-size: 1.1em;
  color: #666;
}

.btn-filter {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  margin-top: 10px;
}

.btn-filter:hover {
  background-color: #0056b3;
}

.select-trimestre {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.select-trimestre button {
  padding: 8px 16px;
  border: 2px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.select-trimestre button.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.loading, .erreur {
  text-align: center;
  padding: 20px;
  font-size: 1.1em;
}

.erreur {
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
}

.contenu-moyennes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.card-grande {
  grid-column: 1 / -1;
}

.moyenne-generale {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.valeur-principale {
  font-size: 3em;
  font-weight: bold;
  margin-bottom: 10px;
}

.appreciation {
  font-size: 1.5em;
  margin-bottom: 20px;
  opacity: 0.9;
}

.card-evolution,
.card-predictions,
.courbe-container,
.tableau-matieres,
.alertes,
.convocations {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.card-evolution {
  grid-column: 1 / -1;
}

.evolution-items {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 5px;
}

.evolution-item {
  text-align: center;
}

.evolution-item span {
  font-weight: bold;
  display: block;
}

.evolution-item strong {
  font-size: 1.3em;
  color: #007bff;
}

.evolution-item small {
  display: block;
  color: #999;
  font-size: 0.85em;
}

.tendance {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  font-weight: bold;
}

.tendance.hausse {
  background-color: #d4edda;
  color: #155724;
}

.tendance.baisse {
  background-color: #f8d7da;
  color: #721c24;
}

.tendance.stable {
  background-color: #d1ecf1;
  color: #0c5460;
}

.alertes {
  grid-column: 1 / -1;
}

.alerte {
  padding: 12px;
  margin: 8px 0;
  border-left: 4px solid;
  border-radius: 4px;
}

.alerte.critique {
  background-color: #f8d7da;
  color: #721c24;
  border-left-color: #dc3545;
}

.alerte.avertissement {
  background-color: #fff3cd;
  color: #856404;
  border-left-color: #ffc107;
}

.predictions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.prediction-item {
  text-align: center;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 5px;
}

.prediction-item span {
  display: block;
  font-size: 0.9em;
  color: #666;
  margin-bottom: 8px;
}

.prediction-item strong {
  font-size: 1.3em;
  display: block;
}

.prediction-item strong.possible {
  color: #28a745;
}

.prediction-item strong.impossible {
  color: #dc3545;
}

.courbe-container {
  grid-column: 1 / -1;
}

.courbe-container canvas {
  max-height: 400px;
}

.tableau-matieres {
  grid-column: 1 / -1;
}

.tableau-matieres table {
  width: 100%;
  border-collapse: collapse;
}

.tableau-matieres th,
.tableau-matieres td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.tableau-matieres th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #333;
}

.tableau-matieres tr:hover {
  background-color: #f8f9fa;
}

.convocations {
  grid-column: 1 / -1;
}

.convocation {
  padding: 15px;
  margin: 10px 0;
  border-left: 4px solid;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.convocation.en_attente {
  border-left-color: #ffc107;
}

.convocation.lu {
  border-left-color: #17a2b8;
}

.convocation.valide {
  border-left-color: #28a745;
}

.conv-titre {
  font-weight: bold;
  color: #333;
}

.conv-date {
  font-size: 0.9em;
  color: #999;
  margin: 5px 0;
}

.conv-status {
  margin-top: 8px;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 0.85em;
  font-weight: bold;
  margin-right: 8px;
}

.badge.en_attente {
  background-color: #fff3cd;
  color: #856404;
}

.badge.lu {
  background-color: #d1ecf1;
  color: #0c5460;
}

.badge.valide {
  background-color: #d4edda;
  color: #155724;
}

.accord {
  color: #28a745;
  font-size: 0.9em;
}

@media (max-width: 768px) {
  .contenu-moyennes {
    grid-template-columns: 1fr;
  }

  .valeur-principale {
    font-size: 2em;
  }

  .header-moyennes h1 {
    font-size: 1.5em;
  }
}
</style>
