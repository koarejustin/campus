/**
 * ================================================================
 * FRONTEND : Système de moyennes avancées pour eleve.html
 * À injecter dans la section <script> de eleve.html
 * Nécessite Chart.js (déjà chargé dans ton fichier)
 * ================================================================
 */

// ── Variables globales du module moyennes ────────────────────────
let chartEvolution = null;
let chartMatieres  = null;
let donneesMoyennes = null;

// ── Chargement principal ─────────────────────────────────────────
async function loadMoyennesAvancees(trimestre = '') {
  const container = document.getElementById('moyennes-container');
  if (!container) return;

  // Skeleton loader
  container.innerHTML = `
    <div class="sk-block" style="height:120px;border-radius:16px;margin-bottom:16px;background:linear-gradient(90deg,#e8eaf0 25%,#f4f5f8 50%,#e8eaf0 75%);background-size:200% 100%;animation:sk-shine 1.4s infinite"></div>
    <div class="sk-block" style="height:300px;border-radius:16px;background:linear-gradient(90deg,#e8eaf0 25%,#f4f5f8 50%,#e8eaf0 75%);background-size:200% 100%;animation:sk-shine 1.4s infinite"></div>
  `;

  try {
    const url = `${API}/eleves/moyennes-avancees${trimestre ? '?trimestre=' + trimestre : ''}`;
    const res  = await fetch(url, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    donneesMoyennes = data;
    renderMoyennesDashboard(data);
  } catch (e) {
    container.innerHTML = `
      <div style="padding:24px;background:#fff;border-radius:16px;border:1px solid #fee2e2;color:#c0392b;font-size:.82rem">
        ⚠️ Impossible de charger les moyennes : ${e.message}
      </div>`;
  }
}

// ── Rendu principal ──────────────────────────────────────────────
function renderMoyennesDashboard(data) {
  const container = document.getElementById('moyennes-container');
  if (!container) return;

  const mg      = data.moyenne_generale;
  const mention = data.mention || '—';
  const couleur = mg >= 14 ? '#10B981' : mg >= 10 ? '#3B49DF' : '#C0392B';
  const evolution = data.evolution_trimestrielle || [];
  const alertes   = data.alertes_baisses || [];
  const predictif = data.predictif || {};
  const stats     = data.stats || {};

  container.innerHTML = `
    <!-- Carte Moyenne Générale -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">

      <div style="background:#fff;border-radius:20px;padding:20px;border:1px solid var(--border);text-align:center;grid-column:1/2">
        <div style="font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:8px">
          Moyenne Générale · ${data.trimestre === 'tous' ? 'Globale' : 'T' + data.trimestre}
        </div>
        <div style="font-size:3rem;font-weight:900;color:${couleur};line-height:1;font-family:'Syne',sans-serif">
          ${mg !== null ? mg.toFixed(2) : '—'}
        </div>
        <div style="font-size:.72rem;font-weight:700;color:${couleur};margin-top:6px">${mention}</div>
        <div style="width:100%;height:6px;background:#f0f2f8;border-radius:3px;margin-top:12px;overflow:hidden">
          <div style="height:100%;width:${mg !== null ? (mg/20*100) : 0}%;background:${couleur};border-radius:3px;transition:width .8s ease"></div>
        </div>
      </div>

      <div style="background:#fff;border-radius:20px;padding:20px;border:1px solid var(--border)">
        <div style="font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:10px">Meilleure Matière</div>
        ${stats.meilleure_matiere ? `
          <div style="font-size:.88rem;font-weight:700;color:var(--ink)">${stats.meilleure_matiere.nom}</div>
          <div style="font-size:1.6rem;font-weight:900;color:#10B981">${stats.meilleure_matiere.moyenne}</div>
          <div style="font-size:.65rem;color:var(--muted)">Coef. ${stats.meilleure_matiere.coefficient}</div>
        ` : '<div style="color:var(--muted);font-size:.8rem">Aucune note</div>'}
      </div>

      <div style="background:#fff;border-radius:20px;padding:20px;border:1px solid var(--border)">
        <div style="font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:10px">À Surveiller</div>
        ${stats.matiere_en_difficulte ? `
          <div style="font-size:.88rem;font-weight:700;color:var(--ink)">${stats.matiere_en_difficulte.nom}</div>
          <div style="font-size:1.6rem;font-weight:900;color:#C0392B">${stats.matiere_en_difficulte.moyenne}</div>
          <div style="font-size:.65rem;color:#C0392B">En dessous de 10</div>
        ` : '<div style="color:#10B981;font-size:.8rem;font-weight:700">✓ Tout va bien</div>'}
      </div>
    </div>

    <!-- Sélecteur de trimestre -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${['', '1', '2', '3'].map(t => `
        <button onclick="loadMoyennesAvancees('${t}')"
          style="padding:6px 16px;border-radius:20px;border:1px solid var(--border);
                 background:${(data.trimestre === (t||'tous') || (!t && data.trimestre==='tous')) ? 'var(--accent)' : '#fff'};
                 color:${(data.trimestre === (t||'tous') || (!t && data.trimestre==='tous')) ? '#fff' : 'var(--ink)'};
                 font-size:.72rem;font-weight:700;cursor:pointer">
          ${t ? 'Trimestre ' + t : 'Tous'}
        </button>
      `).join('')}
    </div>

    <!-- Graphique : Courbe d'évolution + Analyse prédictive -->
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px">

      <div style="background:#fff;border-radius:20px;padding:20px;border:1px solid var(--border)">
        <div style="font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:16px">
          📈 Évolution des Moyennes
        </div>
        <canvas id="chart-evolution" height="180"></canvas>
        ${evolution.length === 0 ? '<div style="text-align:center;color:var(--muted);font-size:.8rem;padding:40px">Pas encore de données multi-trimestres</div>' : ''}
      </div>

      <div style="background:#fff;border-radius:20px;padding:20px;border:1px solid var(--border)">
        <div style="font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:16px">
          🎯 Analyse Prédictive
        </div>
        <div style="font-size:.7rem;color:var(--muted);margin-bottom:12px">Note min. au prochain devoir (coef 2) pour :</div>
        ${[
          { label: 'Obtenir 10/20', val: predictif.pour_avoir_10,  color: '#C0392B' },
          { label: 'Atteindre 12', val: predictif.pour_avoir_12,  color: '#E67E22' },
          { label: 'Viser 14',     val: predictif.pour_avoir_14,  color: '#10B981' },
          { label: 'Maintenir',    val: predictif.pour_maintenir, color: '#3B49DF' },
        ].map(p => `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-size:.7rem;font-weight:600;color:var(--ink)">${p.label}</span>
              <span style="font-size:.82rem;font-weight:900;color:${p.color}">
                ${p.val === null ? '🚫 Impossible' : p.val === undefined ? '—' : p.val + ' / 20'}
              </span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Graphique : Moyennes par matière -->
    <div style="background:#fff;border-radius:20px;padding:20px;border:1px solid var(--border);margin-bottom:16px">
      <div style="font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:16px">
        📊 Moyennes par Matière
      </div>
      <canvas id="chart-matieres" height="120"></canvas>
    </div>

    <!-- Tableau détaillé des matières -->
    <div style="background:#fff;border-radius:20px;padding:20px;border:1px solid var(--border);margin-bottom:16px">
      <div style="font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:16px">
        📋 Détail par Matière · ${data.eleve?.classe || ''}
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.78rem">
          <thead>
            <tr style="border-bottom:2px solid var(--border)">
              <th style="text-align:left;padding:8px 12px;font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Matière</th>
              <th style="text-align:center;padding:8px 12px;font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Coef</th>
              <th style="text-align:center;padding:8px 12px;font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Moyenne</th>
              <th style="text-align:center;padding:8px 12px;font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Mention</th>
              <th style="text-align:left;padding:8px 12px;font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Progression</th>
            </tr>
          </thead>
          <tbody>
            ${(data.detail_matieres || []).map(m => {
              const c = m.moyenne >= 14 ? '#10B981' : m.moyenne >= 10 ? '#3B49DF' : m.moyenne !== null ? '#C0392B' : '#94a3b8';
              return `
              <tr style="border-bottom:1px solid #f0f2f8">
                <td style="padding:10px 12px;font-weight:600;color:var(--ink)">${m.nom}${m.optionnel ? ' <span style="font-size:.6rem;color:var(--muted)">(opt.)</span>' : ''}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:800;color:var(--muted)">${m.coefficient}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:900;color:${c};font-size:.95rem">
                  ${m.moyenne !== null ? m.moyenne.toFixed(2) : '—'}
                </td>
                <td style="padding:10px 12px;text-align:center">
                  <span style="padding:2px 10px;border-radius:20px;font-size:.6rem;font-weight:700;background:${c}18;color:${c}">
                    ${m.mention || '—'}
                  </span>
                </td>
                <td style="padding:10px 12px">
                  <div style="height:6px;background:#f0f2f8;border-radius:3px;width:100%;overflow:hidden">
                    <div style="height:100%;width:${m.moyenne !== null ? (m.moyenne/20*100) : 0}%;background:${c};border-radius:3px"></div>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Alertes baisses -->
    ${alertes.length > 0 ? `
    <div style="background:#fff;border-radius:20px;padding:20px;border:1px solid #fee2e2;margin-bottom:16px">
      <div style="font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#C0392B;margin-bottom:12px">
        ⚠️ Alertes · Baisses Détectées
      </div>
      ${alertes.map(a => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;background:${a.alerte==='CRITIQUE'?'#fef2f2':'#fffbeb'};margin-bottom:8px">
          <span style="font-size:1.2rem">${a.alerte === 'CRITIQUE' ? '🔴' : '🟡'}</span>
          <div>
            <div style="font-weight:700;font-size:.8rem;color:var(--ink)">${a.matiere}</div>
            <div style="font-size:.7rem;color:var(--muted)">Baisse de ${a.baisse} pts · ${a.alerte}</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `;

  // Injecter les styles skeleton si absent
  if (!document.getElementById('sk-style')) {
    const s = document.createElement('style');
    s.id = 'sk-style';
    s.textContent = '@keyframes sk-shine{0%{background-position:200% 0}100%{background-position:-200% 0}}';
    document.head.appendChild(s);
  }

  // ── Graphique évolution ──
  setTimeout(() => {
    const ctxEvo = document.getElementById('chart-evolution');
    if (ctxEvo && evolution.length > 0 && window.Chart) {
      if (chartEvolution) chartEvolution.destroy();
      chartEvolution = new Chart(ctxEvo, {
        type: 'line',
        data: {
          labels: evolution.map(e => e.periode),
          datasets: [{
            label: 'Moyenne Générale',
            data: evolution.map(e => e.moyenne),
            borderColor: '#3B49DF',
            backgroundColor: 'rgba(59,73,223,.08)',
            borderWidth: 3,
            pointBackgroundColor: '#3B49DF',
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.4,
            fill: true,
          }, {
            label: 'Seuil de passage (10)',
            data: evolution.map(() => 10),
            borderColor: '#C0392B',
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(2) + '/20' : '—'}`
              }
            }
          },
          scales: {
            y: { min: 0, max: 20, ticks: { font: { size: 10 } }, grid: { color: '#f0f2f8' } },
            x: { ticks: { font: { size: 10 } }, grid: { display: false } }
          }
        }
      });
    }

    // ── Graphique matières ──
    const ctxMat = document.getElementById('chart-matieres');
    if (ctxMat && window.Chart) {
      const matieres = (data.detail_matieres || []).filter(m => m.moyenne !== null);
      if (chartMatieres) chartMatieres.destroy();
      chartMatieres = new Chart(ctxMat, {
        type: 'bar',
        data: {
          labels: matieres.map(m => m.nom.length > 20 ? m.nom.substring(0, 18) + '…' : m.nom),
          datasets: [{
            label: 'Moyenne /20',
            data: matieres.map(m => m.moyenne),
            backgroundColor: matieres.map(m =>
              m.moyenne >= 14 ? 'rgba(16,185,129,.7)' :
              m.moyenne >= 10 ? 'rgba(59,73,223,.7)' :
              'rgba(192,57,43,.7)'
            ),
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.parsed.y.toFixed(2)} / 20`
              }
            }
          },
          scales: {
            y: { min: 0, max: 20, ticks: { font: { size: 10 } }, grid: { color: '#f0f2f8' } },
            x: { ticks: { font: { size: 9 }, maxRotation: 30 }, grid: { display: false } }
          }
        }
      });
    }
  }, 100);
}

// ── Mise à jour temps réel via Socket.io ────────────────────────
// À appeler dans ton init Socket.io existant
function initMoyennesRealtime(socket) {
  if (!socket) return;
  // Quand un prof enregistre une note pour cet élève
  socket.on('note-ajoutee', (data) => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    if (data.id_eleve === session.id_user || data.classe === session.classe_actuelle) {
      // Recharger les moyennes avec un petit délai pour laisser le temps à la BD
      setTimeout(() => {
        if (document.getElementById('moyennes-container')) {
          loadMoyennesAvancees();
        }
      }, 1000);
    }
  });
}

// ── Mise à jour statut convocation en temps réel ─────────────────
async function loadConvocationsRealtime() {
  try {
    const res  = await fetch(`${API}/eleves/convocations`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) return;

    const badge = document.getElementById('badge-convocations');
    const container = document.getElementById('convocations-list');

    // Mettre à jour le badge dans la sidebar
    const enAttente = (data.convocations || []).filter(c =>
      c.statut === 'ENVOYEE' || c.statut === 'EN_ATTENTE'
    ).length;

    if (badge) {
      badge.textContent = enAttente > 0 ? enAttente : '';
      badge.style.display = enAttente > 0 ? 'flex' : 'none';
    }

    if (!container) return;

    if (data.convocations.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--muted)">
          <div style="font-size:2rem;margin-bottom:8px">✅</div>
          <div style="font-size:.82rem">Aucune convocation</div>
        </div>`;
      return;
    }

    container.innerHTML = data.convocations.map(c => {
      const statutColor = {
        'ENVOYEE':   { bg: '#fef9c3', color: '#92400e', icon: '🕐', label: 'En attente' },
        'EN_ATTENTE':{ bg: '#fef9c3', color: '#92400e', icon: '🕐', label: 'En attente' },
        'LU':        { bg: '#dcfce7', color: '#166534', icon: '✅', label: 'Lu par parent' },
        'VALIDE':    { bg: '#dcfce7', color: '#166534', icon: '✅', label: 'Validé' },
        'PASSEE':    { bg: '#f1f5f9', color: '#64748b', icon: '📁', label: 'Passée' },
      };
      const s = statutColor[c.statut] || statutColor['ENVOYEE'];
      const urgent = c.periode === 'URGENTE';

      return `
        <div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:10px;
                    border:1px solid ${urgent ? '#fecaca' : 'var(--border)'};
                    border-left:4px solid ${urgent ? '#C0392B' : 'var(--accent)'}">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
            <div style="font-weight:700;font-size:.85rem;color:var(--ink)">${c.sujet || 'Convocation'}</div>
            <span style="padding:2px 10px;border-radius:20px;font-size:.6rem;font-weight:700;
                         background:${s.bg};color:${s.color}">
              ${s.icon} ${s.label}
            </span>
          </div>
          ${c.description ? `<div style="font-size:.75rem;color:var(--muted);margin-bottom:8px">${c.description}</div>` : ''}
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:.7rem;color:var(--muted)">
              📅 ${new Date(c.date_convocation).toLocaleDateString('fr-FR', {weekday:'short',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}
              ${urgent ? ' <span style="color:#C0392B;font-weight:700">— URGENT</span>' : ''}
            </div>
            ${c.date_accuse ? `
              <div style="font-size:.65rem;color:#10B981">
                ✓ Accusé reçu le ${new Date(c.date_accuse).toLocaleDateString('fr-FR')}
              </div>` : ''}
          </div>
        </div>`;
    }).join('');

  } catch (e) {
    console.warn('loadConvocationsRealtime:', e.message);
  }
}

// Écouter les mises à jour de statut des convocations via Socket.io
function initConvocationsRealtime(socket) {
  if (!socket) return;
  socket.on('convocation-lue', (data) => {
    // Le parent a lu/validé une convocation → recharger
    loadConvocationsRealtime();
  });
  socket.on('convocation-validee', (data) => {
    loadConvocationsRealtime();
  });
}
