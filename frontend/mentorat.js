/**
 * MENTORAT - Journal de Bord
 * Gère l'affichage et les interactions du journal partagé entre alumni et élèves
 */

const MentoratAPI = {
    BASE: window.API_BASE || 'http://localhost:5000/api',

    authHeaders() {
        const token = localStorage.getItem('token');
        return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    },

    // Relations de mentorat
    async createRelation(id_eleve, description, domaines) {
        const res = await fetch(`${this.BASE}/mentorat/relation/create`, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify({ id_eleve, description, domaines_assistance: domaines })
        });
        return res.json();
    },

    async getElevesMentorat() {
        const res = await fetch(`${this.BASE}/mentorat/eleves`, { headers: this.authHeaders() });
        return res.json();
    },

    async getAlumniMentor() {
        const res = await fetch(`${this.BASE}/mentorat/alumni-mentor`, { headers: this.authHeaders() });
        return res.json();
    },

    // Journal de bord
    async addEntree(id_relation, titre, contenu, type_entree = 'note', is_prive = false) {
        const res = await fetch(`${this.BASE}/mentorat/journal/entree`, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify({ id_relation, titre, contenu, type_entree, is_prive })
        });
        return res.json();
    },

    async getJournal(id_relation) {
        const res = await fetch(`${this.BASE}/mentorat/journal/${id_relation}`, {
            headers: this.authHeaders()
        });
        return res.json();
    },

    async updateEntree(id_journal, updates) {
        const res = await fetch(`${this.BASE}/mentorat/journal/${id_journal}`, {
            method: 'PUT',
            headers: this.authHeaders(),
            body: JSON.stringify(updates)
        });
        return res.json();
    },

    async deleteEntree(id_journal) {
        const res = await fetch(`${this.BASE}/mentorat/journal/${id_journal}`, {
            method: 'DELETE',
            headers: this.authHeaders()
        });
        return res.json();
    },

    // Objectifs
    async createObjectif(id_relation, description, date_limite, priorite = 'normal') {
        const res = await fetch(`${this.BASE}/mentorat/objectif/create`, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify({ id_relation, description, date_limite, priorite })
        });
        return res.json();
    },

    async getObjectifs(id_relation) {
        const res = await fetch(`${this.BASE}/mentorat/objectifs/${id_relation}`, {
            headers: this.authHeaders()
        });
        return res.json();
    },

    async updateObjectif(id_objectif, statut, notes_alumni, notes_eleve) {
        const res = await fetch(`${this.BASE}/mentorat/objectif/${id_objectif}`, {
            method: 'PUT',
            headers: this.authHeaders(),
            body: JSON.stringify({ statut, notes_alumni, notes_eleve })
        });
        return res.json();
    },

    // Dashboard et résultats
    async getDashboard() {
        const res = await fetch(`${this.BASE}/mentorat/dashboard`, { headers: this.authHeaders() });
        return res.json();
    },

    async getResultatsEleve(id_eleve) {
        const res = await fetch(`${this.BASE}/mentorat/resultats-eleve/${id_eleve}`, {
            headers: this.authHeaders()
        });
        return res.json();
    },

    // Orientations
    async setOrientationEleve(id_relation, orientation, justification) {
        const res = await fetch(`${this.BASE}/mentorat/orientation/set`, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify({ id_relation, orientation, justification })
        });
        return res.json();
    },

    async getOrientationEleve(id_relation) {
        const res = await fetch(`${this.BASE}/mentorat/orientation/${id_relation}`, {
            headers: this.authHeaders()
        });
        return res.json();
    },

    async getElevesAvecOrientations() {
        const res = await fetch(`${this.BASE}/mentorat/orientations/all`, {
            headers: this.authHeaders()
        });
        return res.json();
    }
};

// ============= AFFICHAGE ET GESTION DU JOURNAL =============

async function loadJournalDeBord(idRelation) {
    try {
        const data = await MentoratAPI.getJournal(idRelation);
        if (data.success) {
            afficherEntreesJournal(data.entrees, idRelation);
        } else {
            console.error('Erreur:', data.message);
        }
    } catch (error) {
        console.error('Erreur lors du chargement du journal:', error);
    }
}

function afficherEntreesJournal(entrees, idRelation) {
    const container = document.getElementById('journal-entrees');
    if (!container) return;

    if (!entrees || entrees.length === 0) {
        container.innerHTML = '<div class="empty">📝 Aucune entrée pour le moment. Commencez à écrire votre histoire !</div>';
        return;
    }

    container.innerHTML = entrees.map(entree => `
        <div class="entree-journal ${entree.is_prive ? 'prive' : ''}" data-id="${entree.id_journal}">
            <div class="entree-header">
                <div class="entree-auteur">
                    <strong>${entree.prenom} ${entree.nom}</strong>
                    <span class="role-badge">${entree.role_auteur}</span>
                </div>
                <div class="entree-date">${new Date(entree.date_creation).toLocaleDateString('fr-FR')}</div>
            </div>
            
            <div class="entree-title">${escapeHtml(entree.titre)}</div>
            <div class="entree-type badge-${entree.type_entree}">
                ${getTypeIcon(entree.type_entree)} ${entree.type_entree}
            </div>
            
            <div class="entree-content">
                ${escapeHtml(entree.contenu).replace(/\n/g, '<br>')}
            </div>
            
            ${entree.is_prive ? '<div class="badge-prive">🔒 Privée (alumni seulement)</div>' : ''}
            
            <div class="entree-footer">
                <small>${new Date(entree.date_creation).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}</small>
                ${isCurrentUserAuthor(entree) ? `
                    <div class="entree-actions">
                        <button onclick="editEntree(${entree.id_journal})" class="btn-small">✏️ Modifier</button>
                        <button onclick="deleteEntree(${entree.id_journal})" class="btn-small btn-danger">🗑️ Supprimer</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');

    // Mettre à jour les styles avec Lucide icons si disponible
    if (window.lucide) {
        lucide.createIcons();
    }
}

function getTypeIcon(type) {
    const icons = {
        'note': '📝',
        'objectif': '🎯',
        'reflexion': '💭',
        'feedback': '💬'
    };
    return icons[type] || '📄';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

function isCurrentUserAuthor(entree) {
    const currentUser = JSON.parse(localStorage.getItem('user_session') || '{}');
    return entree.id_auteur === currentUser.id;
}

// ============= MODALES D'AJOUT/MODIFICATION =============

async function ouvrirAjoutEntree(idRelation, typeDefaut = 'note') {
    const modal = document.getElementById('modal-entree');
    if (!modal) return;

    document.getElementById('entree-relation-id').value = idRelation;
    document.getElementById('entree-titre').value = '';
    document.getElementById('entree-type').value = typeDefaut;
    document.getElementById('entree-contenu').value = '';
    document.getElementById('entree-prive').checked = false;
    document.getElementById('entree-id-edit').value = '';

    modal.style.display = 'flex';
}

function fermerModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

async function submitEntree() {
    const idRelation = parseInt(document.getElementById('entree-relation-id').value);
    const titre = document.getElementById('entree-titre').value.trim();
    const contenu = document.getElementById('entree-contenu').value.trim();
    const type = document.getElementById('entree-type').value;
    const is_prive = document.getElementById('entree-prive').checked;
    const idEdit = document.getElementById('entree-id-edit').value;

    if (!titre || !contenu) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    try {
        let result;
        if (idEdit) {
            // Modification
            result = await MentoratAPI.updateEntree(parseInt(idEdit), {
                titre,
                contenu,
                type_entree: type,
                is_prive
            });
        } else {
            // Création
            result = await MentoratAPI.addEntree(idRelation, titre, contenu, type, is_prive);
        }

        if (result.success) {
            alert(idEdit ? 'Entrée mise à jour' : 'Entrée ajoutée au journal');
            fermerModal('modal-entree');
            loadJournalDeBord(idRelation);
        } else {
            alert('Erreur: ' + result.message);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue');
    }
}

async function editEntree(idJournal) {
    // À implémenter: charger l'entrée et ouvrir la modale d'édition
    console.log('Édition de l\'entrée:', idJournal);
}

async function deleteEntree(idJournal) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;

    try {
        const result = await MentoratAPI.deleteEntree(idJournal);
        if (result.success) {
            alert('Entrée supprimée');
            // Recharger le journal
            const idRelation = document.getElementById('journal-entrees').closest('[data-relation]')?.getAttribute('data-relation');
            if (idRelation) loadJournalDeBord(idRelation);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ============= AFFICHAGE DES ÉLÈVES MENTORÉS (POUR ALUMNI) =============

async function loadElevesMentorat() {
    try {
        const data = await MentoratAPI.getElevesMentorat();
        if (data.success) {
            afficherListeElevesMentorat(data.eleves);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function afficherListeElevesMentorat(eleves) {
    const container = document.getElementById('eleves-mentorat-list');
    if (!container) return;

    if (!eleves || eleves.length === 0) {
        container.innerHTML = '<div class="empty">Vous ne mentorés aucun élève pour le moment</div>';
        return;
    }

    container.innerHTML = eleves.map(eleve => `
        <div class="card-eleve" onclick="selectEleveMentorat(${eleve.id_relation}, '${eleve.id_eleve}')">
            <div class="eleve-header">
                <strong>${escapeHtml(eleve.prenom)} ${escapeHtml(eleve.nom)}</strong>
                <span class="classe-badge">${eleve.classe_actuelle || 'N/A'}</span>
            </div>
            <div class="eleve-info">
                <small>Inscrit le ${new Date(eleve.date_debut).toLocaleDateString('fr-FR')}</small>
                ${eleve.moyenne_generale ? `<div class="moyenne">Moyenne: <strong>${eleve.moyenne_generale}/20</strong></div>` : ''}
            </div>
            <div class="eleve-stats">
                <span>📝 ${eleve.nb_entrees_journal} entrées</span>
                <span>🎯 ${eleve.nb_objectifs} objectifs</span>
            </div>
        </div>
    `).join('');
}

async function selectEleveMentorat(idRelation, idEleve) {
    // Afficher le journal de cet élève et ses résultats
    const container = document.getElementById('mentorat-detail-container');
    if (!container) return;

    try {
        const [journal, resultats] = await Promise.all([
            MentoratAPI.getJournal(idRelation),
            MentoratAPI.getResultatsEleve(idEleve)
        ]);

        if (journal.success && resultats.success) {
            afficherDetailEleveMentorat(resultats.eleve, journal.entrees, resultats.notes_par_matiere, idRelation);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function afficherDetailEleveMentorat(eleve, entrees, notes, idRelation) {
    const container = document.getElementById('mentorat-detail-container');
    if (!container) return;

    container.innerHTML = `
        <div class="detail-eleve">
            <div class="eleve-card">
                <h3>${escapeHtml(eleve.nom_complet)}</h3>
                <p class="classe">${eleve.classe}</p>
                <div class="resultats">
                    <h4>📊 Résultats scolaires</h4>
                    <div class="moyenne-generale">
                        Moyenne générale: <strong>${eleve.moyenne_generale || 'N/A'}/20</strong>
                    </div>
                    <div class="notes-list">
                        ${notes.map(note => `
                            <div class="note-item">
                                <span>${escapeHtml(note.matiere)}</span>
                                <strong>${note.moyenne_matiere.toFixed(2)}/20</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="journal-container" data-relation="${idRelation}">
                <div class="journal-header">
                    <h4>📖 Journal de Bord Partagé</h4>
                    <button class="btn-p" onclick="ouvrirAjoutEntree(${idRelation})">➕ Nouvelle entrée</button>
                </div>
                <div id="journal-entrees">
                    ${entrees.length > 0 ? '' : '<div class="empty">Aucune entrée pour le moment</div>'}
                </div>
            </div>
        </div>
    `;

    afficherEntreesJournal(entrees, idRelation);
}

// ============= AFFICHAGE DU MENTOR (POUR ÉLÈVES) =============

async function loadMentorEleve() {
    try {
        const data = await MentoratAPI.getAlumniMentor();
        if (data.success && data.alumni) {
            afficherProfilMentor(data.alumni);
        } else {
            document.getElementById('mentor-container').innerHTML = `
                <div class="card mentor-empty" style="padding:20px;text-align:center;">
                    <div class="empty">📚 Vous n'avez pas de mentor pour le moment.</div>
                    <button class="btn-p" style="margin-top:16px;" onclick="demanderConseil()">Demander un mentor</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('mentor-container').innerHTML = `
            <div class="card mentor-error" style="padding:20px;text-align:center;">
                <div class="empty">Erreur lors du chargement du mentor.</div>
                <button class="btn-p" style="margin-top:16px;" onclick="demanderConseil()">Demander un mentor</button>
            </div>
        `;
    }
}

function afficherProfilMentor(alumni) {
    const container = document.getElementById('mentor-container');
    if (!container) return;

    container.innerHTML = `
        <div class="card mentor-profile">
            <div class="mentor-header">
                <div class="mentor-avatar">${(alumni.prenom?.[0] || 'A').toUpperCase()}</div>
                <div class="mentor-info">
                    <h3>${escapeHtml(alumni.prenom)} ${escapeHtml(alumni.nom)}</h3>
                    ${alumni.profession ? `<p class="profession">${escapeHtml(alumni.profession)}</p>` : ''}
                    ${alumni.entreprise_actuelle ? `<p class="entreprise">${escapeHtml(alumni.entreprise_actuelle)}</p>` : ''}
                </div>
            </div>
            
            <div class="mentor-details">
                ${alumni.domaine_expertise ? `<p><strong>Domaine:</strong> ${escapeHtml(alumni.domaine_expertise)}</p>` : ''}
                ${alumni.description ? `<p class="description">${escapeHtml(alumni.description)}</p>` : ''}
            </div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn-p" onclick="ouvrirJournalEleve(${alumni.id_relation})">
                    📖 Voir notre journal de bord
                </button>
                <button class="btn-p" onclick="demanderConseil('${escapeHtml(alumni.id_alumni || alumni.id_user || '')}')">
                    ✉️ Demander un conseil
                </button>
            </div>
        </div>
    `;
}

async function ouvrirJournalEleve(idRelation) {
    // Charger le journal pour l'élève
    const container = document.getElementById('eleve-journal-container');
    if (!container) return;

    try {
        const data = await MentoratAPI.getJournal(idRelation);
        if (data.success) {
            container.innerHTML = `
                <div class="journal-eleve-view">
                    <h3>📖 Notre Journal de Bord</h3>
                    <button class="btn-p" onclick="ouvrirAjoutEntree(${idRelation})">➕ Ajouter une réflexion</button>
                    <div id="journal-entrees-eleve" data-relation="${idRelation}"></div>
                </div>
            `;
            afficherEntreesJournal(data.entrees, idRelation);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ============= ORIENTATIONS LITTÉRATURE / SCIENCE =============

async function loadListeElevesOrientations() {
    try {
        const data = await MentoratAPI.getElevesAvecOrientations();
        if (data.success) {
            afficherListeElevesOrientations(data.eleves);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function afficherListeElevesOrientations(eleves) {
    const container = document.getElementById('liste-eleves-orientations');
    if (!container) return;

    if (!eleves || eleves.length === 0) {
        container.innerHTML = '<div class="empty">Aucun élève mentoré</div>';
        return;
    }

    container.innerHTML = `
        <div class="orientations-grid">
            ${eleves.map(eleve => `
                <div class="orientation-card" onclick="selectEleveOrientation(${eleve.id_relation}, '${eleve.prenom} ${eleve.nom}')">
                    <div class="orientation-header">
                        <strong style="font-size: 0.9rem;">${escapeHtml(eleve.prenom)} ${escapeHtml(eleve.nom)}</strong>
                        <span class="classe-badge">${eleve.classe_actuelle || 'N/A'}</span>
                    </div>
                    
                    <div class="orientation-status">
                        ${eleve.orientation_suggeree ? 
                            `<div class="orientation-set">
                                <strong>🎯 Orientation: ${eleve.orientation_suggeree}</strong>
                                ${eleve.justification_orientation ? 
                                    `<p class="justification">"${escapeHtml(eleve.justification_orientation.substring(0, 100))}"</p>` 
                                    : ''}
                            </div>` 
                            : '<div class="no-orientation">⚠️ Pas d\'orientation définie</div>'}
                    </div>
                    
                    <div class="orientation-stats">
                        ${eleve.moyenne ? `<span>📊 ${Number(eleve.moyenne).toFixed(2)}/20</span>` : ''}
                    </div>
                    
                    <button class="btn-small" onclick="event.stopPropagation(); openOrientationModal(${eleve.id_relation}, '${escapeHtml(eleve.prenom + ' ' + eleve.nom)}')">
                        Définir orientation
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function selectEleveOrientation(idRelation, nomEleve) {
    openOrientationModal(idRelation, nomEleve);
}

function openOrientationModal(idRelation, nomEleve) {
    const modal = document.getElementById('modal-orientation');
    if (!modal) {
        console.error('Modal orientation non trouvée');
        return;
    }

    document.getElementById('orientation-relation-id').value = idRelation;
    document.getElementById('orientation-eleve-nom').textContent = nomEleve;
    document.getElementById('orientation-littérature').checked = false;
    document.getElementById('orientation-science').checked = false;
    document.getElementById('orientation-justification').value = '';

    // Charger l'orientation existante
    loadCurrentOrientation(idRelation);

    modal.style.display = 'flex';
}

async function loadCurrentOrientation(idRelation) {
    try {
        const data = await MentoratAPI.getOrientationEleve(idRelation);
        if (data.success && data.orientation.orientation_suggeree) {
            const orientation = data.orientation.orientation_suggeree;
            if (orientation === 'Littérature') {
                document.getElementById('orientation-littérature').checked = true;
            } else if (orientation === 'Science') {
                document.getElementById('orientation-science').checked = true;
            }
            document.getElementById('orientation-justification').value = data.orientation.justification_orientation || '';
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function fermerModalOrientation() {
    const modal = document.getElementById('modal-orientation');
    if (modal) modal.style.display = 'none';
}

async function submitOrientation() {
    const idRelation = parseInt(document.getElementById('orientation-relation-id').value);
    const justification = document.getElementById('orientation-justification').value.trim();

    let orientation = null;
    if (document.getElementById('orientation-littérature').checked) {
        orientation = 'Littérature';
    } else if (document.getElementById('orientation-science').checked) {
        orientation = 'Science';
    }

    if (!orientation) {
        alert('Veuillez sélectionner une orientation');
        return;
    }

    try {
        const result = await MentoratAPI.setOrientationEleve(idRelation, orientation, justification);
        if (result.success) {
            alert('Orientation définie avec succès');
            fermerModalOrientation();
            loadListeElevesOrientations();
        } else {
            alert('Erreur: ' + result.message);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue');
    }
}

