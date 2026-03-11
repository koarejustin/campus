/**
 * SURVEILLANCE FORMS - Tous les formulaires et modales
 * Gère les absences, convocations, incidents, activités
 */

const ModalesHTML = {
    absence: `
        <div id="modal-absence" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <form class="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl" onsubmit="submitAbsence(event)">
                <h2 class="text-xl font-bold mb-6 text-slate-900">Enregistrer une Absence</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Élève <span class="text-red-600">*</span></label>
                        <select id="absence-eleve" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                            <option value="">-- Sélectionner élève --</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Date <span class="text-red-600">*</span></label>
                        <input type="date" id="absence-date" class="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Raison <span class="text-red-600">*</span></label>
                        <textarea id="absence-raison" class="w-full px-3 py-2 border border-slate-300 rounded-lg" rows="3" placeholder="Maladie, retard, etc..." required></textarea>
                    </div>
                    <div class="flex gap-2 pt-4">
                        <button type="submit" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">✓ Enregistrer</button>
                        <button type="button" onclick="closeModal('modal-absence')" class="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg">✕ Annuler</button>
                    </div>
                </div>
            </form>
        </div>
    `,

    convocation: `
        <div id="modal-convocation" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <form class="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl my-10" onsubmit="submitConvocation(event)">
                <h2 class="text-xl font-bold mb-6 text-slate-900">Créer une Convocation Privée</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Élève <span class="text-red-600">*</span></label>
                        <select id="convocation-eleve" class="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                            <option value="">-- Sélectionner élève --</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Sujet <span class="text-red-600">*</span></label>
                        <input type="text" id="convocation-sujet" class="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: Retard réitéré" required>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Description <span class="text-red-600">*</span></label>
                        <textarea id="convocation-description" class="w-full px-3 py-2 border border-slate-300 rounded-lg" rows="3" required></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Date & Heure <span class="text-red-600">*</span></label>
                        <input type="datetime-local" id="convocation-date" class="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                    </div>
                    <div class="bg-blue-50 border-l-4 border-blue-600 p-3 text-xs text-blue-900">
                        <strong>Info</strong>: Privée - élève + parents uniquement
                    </div>
                    <div class="flex gap-2 pt-4">
                        <button type="submit" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">✓ Créer</button>
                        <button type="button" onclick="closeModal('modal-convocation')" class="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg">✕ Annuler</button>
                    </div>
                </div>
            </form>
        </div>
    `,

    prevention: `
        <div id="modal-prevention" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <form class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-2xl my-10" onsubmit="submitPreventionMessage(event)">
                <h2 class="text-xl font-bold mb-6 text-slate-900">Message de Prévention & Sensibilisation</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Titre <span class="text-red-600">*</span></label>
                        <input type="text" id="prevention-titre" class="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: Sensibilisation - Harcèlement Scolaire" required>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Message <span class="text-red-600">*</span></label>
                        <textarea id="prevention-contenu" class="w-full px-3 py-2 border border-slate-300 rounded-lg" rows="5" required></textarea>
                    </div>
                    <div class="bg-emerald-50 border-l-4 border-emerald-600 p-3 text-xs text-emerald-900">
                        <strong>Info</strong>: Tous les élèves seront notifiés
                    </div>
                    <div class="flex gap-2 pt-4">
                        <button type="submit" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg">✓ Envoyer</button>
                        <button type="button" onclick="closeModal('modal-prevention')" class="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg">✕ Annuler</button>
                    </div>
                </div>
            </form>
        </div>
    `,

    incident: `
        <div id="modal-incident" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <form class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-2xl my-10" onsubmit="submitIncident(event)">
                <h2 class="text-xl font-bold mb-6 text-slate-900">Signaler une Tension / Incident</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Titre <span class="text-red-600">*</span></label>
                        <input type="text" id="incident-titre" class="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: Altercation verbale" required>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Description <span class="text-red-600">*</span></label>
                        <textarea id="incident-description" class="w-full px-3 py-2 border border-slate-300 rounded-lg" rows="4" required></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Type</label>
                            <select id="incident-type" class="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                <option value="ALTERCATION">Altercation</option>
                                <option value="HARCLEMENT">Harcèlement</option>
                                <option value="VIOLENCE">Violence</option>
                                <option value="AUTRE">Autre</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Urgence</label>
                            <select id="incident-urgence" class="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                <option value="BASSE">Basse</option>
                                <option value="NORMALE">Normale</option>
                                <option value="HAUTE">Haute</option>
                            </select>
                        </div>
                    </div>
                    <div class="bg-rose-50 border-l-4 border-rose-600 p-3 text-xs text-rose-900">
                        <strong>Info</strong>: La direction sera notifiée immédiatement
                    </div>
                    <div class="flex gap-2 pt-4">
                        <button type="submit" class="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg">✓ Signaler</button>
                        <button type="button" onclick="closeModal('modal-incident')" class="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg">✕ Annuler</button>
                    </div>
                </div>
            </form>
        </div>
    `,

    activite: `
        <div id="modal-activite" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <form class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-2xl my-10" onsubmit="submitActivity(event)">
                <h2 class="text-xl font-bold mb-6 text-slate-900">Planifier une Activité</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Titre <span class="text-red-600">*</span></label>
                        <input type="text" id="activite-titre" class="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Description</label>
                        <textarea id="activite-description" class="w-full px-3 py-2 border border-slate-300 rounded-lg" rows="3"></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Début <span class="text-red-600">*</span></label>
                            <input type="datetime-local" id="activite-debut" class="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Fin</label>
                            <input type="datetime-local" id="activite-fin" class="w-full px-3 py-2 border border-slate-300 rounded-lg">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Type</label>
                        <select id="activite-type" class="w-full px-3 py-2 border border-slate-300 rounded-lg">
                            <option value="SPORT">Sport</option>
                            <option value="CULTURE">Culture</option>
                            <option value="SCOLAIRE">Scolaire</option>
                            <option value="VACANCES">Vacances</option>
                        </select>
                    </div>
                    <div class="flex gap-2 pt-4">
                        <button type="submit" class="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg">✓ Planifier</button>
                        <button type="button" onclick="closeModal('modal-activite')" class="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg">✕ Annuler</button>
                    </div>
                </div>
            </form>
        </div>
    `,

    absencesList: `
        <div id="modal-absences-list" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <div class="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 shadow-2xl my-10">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-slate-900">Absences Enregistrées</h2>
                    <button onclick="closeModal('modal-absences-list')" class="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
                </div>
                <div class="space-y-2 max-h-96 overflow-y-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-slate-100 sticky top-0">
                            <tr>
                                <th class="p-2 text-left font-bold text-slate-700">Élève</th>
                                <th class="p-2 text-left font-bold text-slate-700">Date</th>
                                <th class="p-2 text-left font-bold text-slate-700">Raison</th>
                                <th class="p-2 text-center font-bold text-slate-700">Justifiée</th>
                            </tr>
                        </thead>
                        <tbody id="absences-table-body">
                            <tr><td colspan="4" class="p-4 text-center text-slate-500">Chargement...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="closeModal('modal-absences-list')" class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg">Fermer</button>
                </div>
            </div>
        </div>
    `
};

// ========== CRÉER LES MODALES AU CHARGEMENT ==========
document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.innerHTML = Object.values(ModalesHTML).join('');
    document.body.appendChild(container);
});

// ========== UTILITAIRES ==========
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        if (modalId !== 'modal-absences-list') {
            loadElevesForModal();
        } else {
            loadAbsencesList();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    if (e.target.id && e.target.id.includes('modal')) {
        if (e.target.classList.contains('bg-black/50')) {
            e.target.classList.add('hidden');
        }
    }
});

// ========== CHARGER ÉLÈVES ==========
async function loadElevesForModal() {
    try {
        const user = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = user.token;

        const res = await fetch('/api/surveillants/eleves', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const eleves = await res.json();
            ['absence-eleve', 'convocation-eleve'].forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    select.innerHTML = '<option value="">-- Sélectionner --</option>';
                    eleves.forEach(e => {
                        const opt = document.createElement('option');
                        opt.value = e.id_user;
                        opt.textContent = `${e.nom} ${e.prenom} (${e.classe_actuelle})`;
                        select.appendChild(opt);
                    });
                }
            });
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ========== SOUMETTRE ABSENCE ==========
async function submitAbsence(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('user_session') || '{}');
    const token = user.token;

    const data = {
        id_eleve: document.getElementById('absence-eleve').value,
        date: document.getElementById('absence-date').value,
        raison: document.getElementById('absence-raison').value,
        justification: false
    };

    try {
        const res = await fetch('/api/surveillants/absences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert('✓ Absence enregistrée');
            closeModal('modal-absence');
            document.getElementById('modal-absence').querySelector('form').reset();
        } else {
            alert('✕ Erreur');
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ========== SOUMETTRE CONVOCATION ==========
async function submitConvocation(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('user_session') || '{}');
    const token = user.token;

    const data = {
        id_eleve: document.getElementById('convocation-eleve').value,
        sujet: document.getElementById('convocation-sujet').value,
        description: document.getElementById('convocation-description').value,
        date_convocation: document.getElementById('convocation-date').value,
        motif: 'DISCIPLINE'
    };

    try {
        const res = await fetch('/api/surveillants/convocations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert('✓ Convocation créée et privée (élève + parents)');
            closeModal('modal-convocation');
            document.getElementById('modal-convocation').querySelector('form').reset();
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ========== SOUMETTRE PRÉVENTION ==========
async function submitPreventionMessage(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('user_session') || '{}');
    const token = user.token;

    const data = {
        titre: document.getElementById('prevention-titre').value,
        contenu: document.getElementById('prevention-contenu').value,
        type_annonce: 'PREVENTION'
    };

    try {
        const res = await fetch('/api/surveillants/announcements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert('✓ Message de prévention envoyé');
            closeModal('modal-prevention');
            document.getElementById('modal-prevention').querySelector('form').reset();
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ========== SOUMETTRE INCIDENT ==========
async function submitIncident(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('user_session') || '{}');
    const token = user.token;

    const data = {
        titre: document.getElementById('incident-titre').value,
        description: document.getElementById('incident-description').value,
        type_incident: document.getElementById('incident-type').value,
        eleves_impliques: [],
        urgence: document.getElementById('incident-urgence').value
    };

    try {
        const res = await fetch('/api/surveillants/incidents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert('✓ Incident signalé');
            closeModal('modal-incident');
            document.getElementById('modal-incident').querySelector('form').reset();
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ========== SOUMETTRE ACTIVITÉ ==========
async function submitActivity(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('user_session') || '{}');
    const token = user.token;

    const data = {
        titre: document.getElementById('activite-titre').value,
        description: document.getElementById('activite-description').value,
        date_debut: document.getElementById('activite-debut').value,
        date_fin: document.getElementById('activite-fin').value,
        type_activite: document.getElementById('activite-type').value
    };

    try {
        const res = await fetch('/api/surveillants/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert('✓ Activité planifiée');
            closeModal('modal-activite');
            document.getElementById('modal-activite').querySelector('form').reset();
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ========== CHARGER ABSENCES ==========
async function loadAbsencesList() {
    const user = JSON.parse(localStorage.getItem('user_session') || '{}');
    const token = user.token;

    try {
        const res = await fetch('/api/surveillants/absences?days=30', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const tbody = document.getElementById('absences-table-body');

            if (!data.absences || data.absences.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">Aucune absence</td></tr>';
                return;
            }

            tbody.innerHTML = data.absences.map(a => `
                <tr class="border-t hover:bg-slate-50">
                    <td class="p-2">${a.nom} ${a.prenom}</td>
                    <td class="p-2">${new Date(a.date_absence).toLocaleDateString('fr-FR')}</td>
                    <td class="p-2">${a.raison_absence || '-'}</td>
                    <td class="p-2 text-center">
                        <label class="flex items-center justify-center gap-2 cursor-pointer">
                            <input type="checkbox" ${a.justifiee ? 'checked' : ''} onchange="updateJustification('${a.id_absence}', this.checked)">
                            <span>${a.justifiee ? '✓' : 'Non'}</span>
                        </label>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function updateJustification(id_absence, justifiee) {
    const user = JSON.parse(localStorage.getItem('user_session') || '{}');
    const token = user.token;

    try {
        await fetch('/api/surveillants/absences/justification', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id_absence, justifiee })
        });
    } catch (error) {
        console.error('Erreur:', error);
    }
}
