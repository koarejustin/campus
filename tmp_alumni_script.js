
        /* ═══════════════════════════════════════════════════════════
           SÉCURITÉ CÔTÉ CLIENT (première ligne de défense)
           La vraie sécurité est dans le backend (alumniMiddleware.js)
           ═══════════════════════════════════════════════════════════ */
        (function () {
            const token = localStorage.getItem('token');
            const session = JSON.parse(localStorage.getItem('user_session') || '{}');

            // Pas de token → login
            if (!token) {
                window.location.replace('login.html');
                return;
            }

            // Rôle différent de ALUMNI → rediriger vers la bonne page
            if (session.role_actuel && session.role_actuel !== 'ALUMNI') {
                // Rediriger vers l'espace correspondant au rôle
                const redirects = {
                    'ELEVE': 'eleve.html',
                    'PROFESSEUR': 'professeur.html',
                    'PARENT': 'parent.html',
                    'SURVEILLANT': 'surveillant.html',
                    'ADMIN': 'admin.html'
                };
                const dest = redirects[session.role_actuel] || 'login.html';
                window.location.replace(dest);
                return;
            }

            // Token présent mais rôle inconnu (ex: token forgé sans session correcte)
            if (!session.role_actuel) {
                localStorage.clear();
                window.location.replace('login.html');
                return;
            }
        })();

        /* ═══════════════════════════════════════════════════════════
           INITIALISATION
           ═══════════════════════════════════════════════════════════ */
        const API = window.API_BASE || 'http://localhost:5000/api';
        const currentUser = JSON.parse(localStorage.getItem('user_session') || '{}');
        let currentMentoratEleveName = '';
        // En-têtes d'authentification
        const authH = () => ({
            'Authorization': 'Bearer ' + localStorage.getItem('token'),
            'Content-Type': 'application/json'
        });

        // Échappement HTML (protection XSS)
        const esc = s => (s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        // Initiales
        const ini = (p = '', n = '') =>
            ((p[0] || '') + (n[0] || '')).toUpperCase() || '?';

        /* ─── Toast ─────────────────────────────────────────────── */
        function toast(msg, type = 'ok') {
            const el = document.getElementById('toast');
            el.textContent = msg;
            el.className = 'show ' + type;
            clearTimeout(el._t);
            el._t = setTimeout(() => el.className = '', 3000);
        }

        /* ─── Navigation ────────────────────────────────────────── */
        function go(page) {
            document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
            document.getElementById('pg-' + page).classList.add('on');
            document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
            const activeNi = document.querySelector(`.ni[onclick="go('${page}')"]`);
            if (activeNi) activeNi.classList.add('on');

            if (page === 'accueil') loadAccueil();
            else if (page === 'mentorats') { loadMentorats(); loadElevesDisponibles(); loadListeElevesOrientations(); }
            else if (page === 'journal') loadElevesMentorat();
            else if (page === 'profil') loadProfil();
        }

        /* ─── Déconnexion ───────────────────────────────────────── */
        function logout() {
            localStorage.clear();
            window.location.replace('login.html');
        }

        /* ─── Modales ───────────────────────────────────────────── */
        function fermerModal(id) {
            document.getElementById(id).style.display = 'none';
        }

        function fermerModalOrientation() {
            fermerModal('modal-orientation');
        }

        /* ═══════════════════════════════════════════════════════════
           ACCUEIL
           ═══════════════════════════════════════════════════════════ */
        async function loadAccueil() {
            document.getElementById('accueil-prenom').textContent =
                currentUser.prenom || 'Ancien Élève';

            try {
                const [mentorats, dashboard] = await Promise.all([
                    fetch(`${API}/alumni/mentorats`, { headers: authH() }).then(r => r.json()),
                    fetch(`${API}/mentorat/dashboard`, { headers: authH() }).then(r => r.json()).catch(() => ({}))
                ]);

                // Stats
                const nbMentorats = (mentorats.mentorats || []).length;
                const nbEleves = dashboard.dashboard?.nb_eleves_mentores ?? dashboard.nb_eleves_mentores ?? '—';
                const nbJournal = dashboard.dashboard?.dernieres_entrees?.length ?? dashboard.dernieres_entrees?.length ?? 0;
                document.getElementById('stat-mentorats').textContent = nbMentorats;
                document.getElementById('stat-eleves').textContent = nbEleves;
                document.getElementById('stat-avis').textContent = nbJournal || '—';

                // Derniers conseils
                const list = (mentorats.mentorats || []).slice(0, 3);
                document.getElementById('accueil-mentorats').innerHTML = list.length
                    ? list.map(c => `
                        <div class="msg-bubble">
                            <div class="msg-avatar">${esc(c.prenom?.[0] || 'A')}</div>
                            <div>
                                <strong>${esc(c.prenom)} ${esc(c.nom)}</strong>
                                <div class="msg-txt">${esc(c.contenu_conseil).substring(0, 120)}…</div>
                            </div>
                        </div>`).join('')
                    : '<div class="empty">Aucun conseil publié pour le moment</div>';

            } catch (e) {
                console.error('loadAccueil:', e);
                document.getElementById('accueil-mentorats').innerHTML =
                    '<div class="empty">Erreur de chargement</div>';
            }
        }

        /* ═══════════════════════════════════════════════════════════
           MENTORATS
           ═══════════════════════════════════════════════════════════ */
        async function loadMentorats() {
            document.getElementById('mentorats-list').innerHTML =
                '<div class="empty"><div class="spinner"></div>Chargement…</div>';
            try {
                const r = await fetch(`${API}/alumni/mentorats`, { headers: authH() });
                const d = await r.json();
                document.getElementById('mentorats-list').innerHTML =
                    (d.mentorats || []).length
                        ? (d.mentorats).map(m => `
                            <div class="msg-bubble">
                                <div class="msg-avatar">${esc(m.prenom?.[0] || 'A')}</div>
                                <div style="flex:1;">
                                    <strong>${esc(m.prenom)} ${esc(m.nom)}</strong>
                                    ${m.titre ? `<div style="font-weight:600; color:var(--accent); margin:4px 0;">${esc(m.titre)}</div>` : ''}
                                    <div class="msg-txt">${esc(m.contenu_conseil)}</div>
                                    ${m.filiere_suggeree
                                ? `<small style="color:var(--accent); font-weight:700;">🎯 ${esc(m.filiere_suggeree)}</small>`
                                : ''}
                                </div>
                            </div>`).join('')
                        : '<div class="empty">Aucun mentorat pour le moment</div>';
            } catch (e) {
                document.getElementById('mentorats-list').innerHTML =
                    '<div class="empty">Erreur de chargement</div>';
            }
        }

        function openMentoratModal() {
            document.getElementById('conseil-titre').value = '';
            document.getElementById('conseil-contenu').value = '';
            document.getElementById('conseil-filiere').value = '';
            document.getElementById('modal-mentorat').style.display = 'flex';
        }

        function submitConseil() {
            const titre = document.getElementById('conseil-titre').value.trim();
            const contenu = document.getElementById('conseil-contenu').value.trim();
            const filiere = document.getElementById('conseil-filiere').value;

            if (!titre || !contenu) {
                toast('⚠️ Le titre et le contenu sont requis', 'err');
                return;
            }

            fetch(`${API}/alumni/mentorats`, {
                method: 'POST',
                headers: authH(),
                body: JSON.stringify({
                    titre: titre,
                    contenu: contenu,
                    filiere_suggeree: filiere || null
                })
            })
                .then(r => r.json())
                .then(d => {
                    if (d.success) {
                        toast('✅ Conseil publié avec succès !', 'ok');
                        fermerModal('modal-mentorat');
                        loadMentorats();
                    } else {
                        toast('❌ Erreur : ' + (d.message || 'Erreur inconnue'), 'err');
                    }
                })
                .catch(() => toast('❌ Erreur réseau', 'err'));
        }

        /* ─── Élèves disponibles pour mentorat ──────────────── */
        async function loadElevesDisponibles() {
            document.getElementById('eleves-disponibles').innerHTML =
                '<div class="empty"><div class="spinner"></div>Chargement…</div>';
            try {
                const r = await fetch(`${API}/alumni/orientation/eleves`, { headers: authH() });
                const d = await r.json();
                const eleves = d.eleves || [];

                document.getElementById('eleves-disponibles').innerHTML =
                    eleves.length
                        ? eleves.map(e => `
                            <div style="display:flex; align-items:center; justify-content:space-between;
                                padding:10px 12px; border-radius:10px; background:#F8FAFF;
                                border:1px solid var(--border); margin-bottom:8px;">
                                <div>
                                    <strong>${esc(e.prenom)} ${esc(e.nom)}</strong>
                                    <div style="font-size:.72rem; color:var(--muted);">
                                        ${esc(e.classe_actuelle || '')} · ${esc(e.code_unique)}
                                    </div>
                                </div>
                                <button class="btn-p" onclick="demarrerMentorat('${e.id_user}', '${esc(e.prenom)} ${esc(e.nom)}')">
                                    🤝 Mentorer
                                </button>
                            </div>`).join('')
                        : '<div class="empty">Aucun élève disponible pour le moment</div>';
            } catch (e) {
                document.getElementById('eleves-disponibles').innerHTML =
                    '<div class="empty">Erreur de chargement</div>';
            }
        }

        async function demarrerMentorat(idEleve, nom) {
            if (!confirm(`Voulez-vous vraiment devenir le mentor de ${nom} ?`)) return;

            try {
                const r = await fetch(`${API}/mentorat/relation/create`, {
                    method: 'POST',
                    headers: authH(),
                    body: JSON.stringify({ id_eleve: idEleve, description: 'Relation de mentorat créée' })
                });
                const d = await r.json();
                if (d.success) {
                    toast('✅ Relation de mentorat créée !', 'ok');
                    loadElevesDisponibles();
                    loadListeElevesOrientations();
                } else {
                    toast('❌ ' + (d.message || 'Erreur'), 'err');
                }
            } catch (e) {
                toast('❌ Erreur réseau', 'err');
            }
        }
        async function loadListeElevesOrientations() {
            document.getElementById('liste-eleves-orientations').innerHTML =
                '<div class="empty"><div class="spinner"></div>Chargement…</div>';
            try {
                const r = await fetch(`${API}/mentorat/eleves`, { headers: authH() });
                const d = await r.json();
                const eleves = d.eleves || [];

                document.getElementById('liste-eleves-orientations').innerHTML =
                    eleves.length
                        ? eleves.map(e => `
                            <div style="display:flex; align-items:center; justify-content:space-between;
                                padding:10px 12px; border-radius:10px; background:#F8FAFF;
                                border:1px solid var(--border); margin-bottom:8px;">
                                <div>
                                    <strong>${esc(e.prenom)} ${esc(e.nom)}</strong>
                                    <div style="font-size:.72rem; color:var(--muted);">
                                        ${esc(e.classe_actuelle || '')}
                                        ${e.orientation
                                ? ` · <span style="color:#7C3AED; font-weight:700;">${esc(e.orientation)}</span>`
                                : ' · <span style="color:#F59E0B;">Non définie</span>'}
                                    </div>
                                </div>
                                <button class="btn-p" onclick="ouvrirModalOrientation(${e.id_relation},'${esc(e.prenom)} ${esc(e.nom)}')">
                                    🎯 Orienter
                                </button>
                            </div>`).join('')
                        : '<div class="empty">Aucun élève mentoré pour le moment</div>';
            } catch (e) {
                document.getElementById('liste-eleves-orientations').innerHTML =
                    '<div class="empty">Erreur de chargement</div>';
            }
        }

        function ouvrirModalOrientation(idRelation, nom) {
            document.getElementById('orientation-eleve-nom').textContent = nom;
            document.getElementById('orientation-relation-id').value = idRelation;
            document.querySelectorAll('input[name="orientation"]').forEach(r => r.checked = false);
            document.getElementById('orientation-justification').value = '';
            const m = document.getElementById('modal-orientation');
            m.style.display = 'flex';
        }

        async function submitOrientation() {
            const idRelation = document.getElementById('orientation-relation-id').value;
            const orientation = document.querySelector('input[name="orientation"]:checked')?.value;
            const justification = document.getElementById('orientation-justification').value.trim();

            if (!orientation) {
                toast('⚠️ Veuillez choisir une orientation', 'err');
                return;
            }

            try {
                const r = await fetch(`${API}/mentorat/orientation/set`, {
                    method: 'POST',
                    headers: authH(),
                    body: JSON.stringify({ id_relation: idRelation, orientation, justification })
                });
                const d = await r.json();
                if (d.success) {
                    toast('✅ Orientation enregistrée !', 'ok');
                    fermerModalOrientation();
                    loadListeElevesOrientations();
                } else {
                    toast('❌ ' + (d.message || 'Erreur'), 'err');
                }
            } catch (e) {
                toast('❌ Erreur réseau', 'err');
            }
        }

        /* ═══════════════════════════════════════════════════════════
           JOURNAL DE BORD
           ═══════════════════════════════════════════════════════════ */
        async function loadElevesMentorat() {
            document.getElementById('eleves-mentorat-list').innerHTML =
                '<div class="empty"><div class="spinner"></div>Chargement…</div>';
            try {
                const r = await fetch(`${API}/mentorat/eleves`, { headers: authH() });
                const d = await r.json();
                const eleves = d.eleves || [];

                document.getElementById('eleves-mentorat-list').innerHTML =
                    eleves.length
                        ? eleves.map(e => `
                            <div onclick="chargerDetailMentorat(${e.id_relation},'${esc(e.prenom)} ${esc(e.nom)}')"
                                style="padding:10px; border-radius:8px; cursor:pointer; margin-bottom:6px;
                                border:1px solid var(--border); transition:background .15s;"
                                onmouseover="this.style.background='#F0F2F8'"
                                onmouseout="this.style.background=''">
                                <div style="font-weight:700; font-size:.82rem;">${esc(e.prenom)} ${esc(e.nom)}</div>
                                <div style="font-size:.68rem; color:var(--muted);">${esc(e.classe_actuelle || '')}</div>
                            </div>`).join('')
                        : '<div class="empty">Aucun élève mentoré</div>';
            } catch (e) {
                document.getElementById('eleves-mentorat-list').innerHTML =
                    '<div class="empty">Erreur de chargement</div>';
            }
        }

        async function chargerDetailMentorat(idRelation, nom) {
            currentMentoratEleveName = nom || currentMentoratEleveName;
            const container = document.getElementById('mentorat-detail-container');
            container.innerHTML = '<div class="empty"><div class="spinner"></div>Chargement…</div>';

            try {
                const [journal, resultats] = await Promise.all([
                    fetch(`${API}/mentorat/journal/${idRelation}`, { headers: authH() }).then(r => r.json()),
                    fetch(`${API}/mentorat/resultats-eleve/${idRelation}`, { headers: authH() })
                        .then(r => r.json()).catch(() => ({ resultats: [] }))
                ]);

                const entrees = journal.entrees || [];

                container.innerHTML = `
                    <div class="card" style="margin-bottom:16px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                            <h3 style="font-weight:700; color:var(--ink);">📖 Journal de ${esc(currentMentoratEleveName)}</h3>
                            <button class="btn-p" onclick="ouvrirModalEntree(${idRelation})">✍️ Nouvelle entrée</button>
                        </div>
                        <div id="journal-entrees">
                            ${entrees.length
                        ? entrees.map(e => `
                                    <div style="padding:12px; border-radius:10px; background:#F8FAFF;
                                        border:1px solid var(--border); margin-bottom:10px;">
                                        <div style="display:flex; justify-content:space-between;">
                                            <strong style="font-size:.85rem;">${esc(e.titre || 'Sans titre')}</strong>
                                            <small style="color:var(--muted); font-size:.68rem;">
                                                ${new Date(e.date_creation || e.created_at).toLocaleDateString('fr-FR')}
                                            </small>
                                        </div>
                                        <div style="font-size:.78rem; color:var(--muted); margin-top:6px;">
                                            ${esc(e.contenu)}
                                        </div>
                                        ${(e.is_prive || e.est_prive) ? `
                                            <div style="margin-top:10px; font-size:.75rem; color:#B91C1C; font-weight:700;">🔒 Privée</div>
                                        ` : ''}
                                    </div>`).join('')
                        : '<div class="empty">Aucune entrée dans le journal</div>'
            }
                        </div >
                    </div > `;
            } catch (e) {
                container.innerHTML = '<div class="empty">Erreur de chargement du journal</div>';
            }
        }

        function ouvrirModalEntree(idRelation) {
            document.getElementById('entree-relation-id').value = idRelation;
            document.getElementById('entree-id-edit').value = '';
            document.getElementById('entree-titre').value = '';
            document.getElementById('entree-contenu').value = '';
            document.getElementById('entree-type').value = 'note';
            document.getElementById('entree-prive').checked = false;
            document.getElementById('modal-entree').style.display = 'flex';
        }

        async function submitEntree() {
            const idRelation = document.getElementById('entree-relation-id').value;
            const titre = document.getElementById('entree-titre').value.trim();
            const contenu = document.getElementById('entree-contenu').value.trim();
            const type = document.getElementById('entree-type').value;
            const prive = document.getElementById('entree-prive').checked;

            if (!contenu) { toast('⚠️ Le contenu est requis', 'err'); return; }

            try {
                const r = await fetch(`${API}/mentorat/journal/entree`, {
                    method: 'POST',
                    headers: authH(),
                    body: JSON.stringify({ id_relation: idRelation, titre, contenu, type, est_prive: prive })
                });
                const d = await r.json();
                if (d.success) {
                    toast('✅ Entrée publiée !', 'ok');
                    fermerModal('modal-entree');
                    chargerDetailMentorat(idRelation, currentMentoratEleveName);
                } else {
                    toast('❌ ' + (d.message || 'Erreur'), 'err');
                }
            } catch (e) {
                toast('❌ Erreur réseau', 'err');
            }
        }

        /* ═══════════════════════════════════════════════════════════
           PROFIL
           ═══════════════════════════════════════════════════════════ */
        async function loadProfil() {
            try {
                const r = await fetch(`${API}/alumni/profil`, { headers: authH() });
                const d = await r.json();
                if (!d.success) return;
                const p = d.profil;

                document.getElementById('pr-pn').value = p.prenom || '';
                document.getElementById('pr-nn').value = p.nom || '';
                document.getElementById('pr-nc').textContent = `${ p.prenom || '' } ${ p.nom || '' } `.trim();
                document.getElementById('pr-cc').textContent = p.code_unique || '';
                document.getElementById('pr-pa').value = p.poste_actuel || '';
                document.getElementById('pr-en').value = p.entreprise_actuelle || '';
                document.getElementById('pr-tl').value = p.telephone || '';
                document.getElementById('pr-vr').value = p.ville_residence || '';
                document.getElementById('pr-de').value = p.domaine_expertise || '';
                document.getElementById('pr-sa').value = p.secteur_activite || '';
                document.getElementById('pr-bi').value = p.biographie || '';
                document.getElementById('pr-li').value = p.linkedin_url || '';
                document.getElementById('pr-sw').value = p.site_web || '';
                document.getElementById('pr-ex').textContent = p.domaine_expertise || '—';
                document.getElementById('pr-se').textContent = p.secteur_activite || '—';

                // Avatar
                const av = document.getElementById('pr-av');
                const avt = document.getElementById('pr-av-t');
                if (p.photo_url) {
                    av.style.backgroundImage = `url(${ p.photo_url })`;
                    av.style.backgroundSize = 'cover';
                    av.style.backgroundPosition = 'center';
                    avt.style.display = 'none';
                } else {
                    av.style.backgroundImage = '';
                    avt.textContent = ini(p.prenom, p.nom);
                    avt.style.display = 'block';
                }
            } catch (e) {
                console.error('Erreur chargement profil:', e);
                toast('❌ Erreur chargement du profil', 'err');
            }
        }

        async function saveProfil() {
            const btn = document.getElementById('btn-sv');
            btn.disabled = true;
            btn.textContent = 'Enregistrement…';

            try {
                const data = {
                    poste_actuel: document.getElementById('pr-pa').value.trim(),
                    entreprise_actuelle: document.getElementById('pr-en').value.trim(),
                    telephone: document.getElementById('pr-tl').value.trim(),
                    ville_residence: document.getElementById('pr-vr').value.trim(),
                    domaine_expertise: document.getElementById('pr-de').value.trim(),
                    secteur_activite: document.getElementById('pr-sa').value.trim(),
                    biographie: document.getElementById('pr-bi').value.trim(),
                    linkedin_url: document.getElementById('pr-li').value.trim(),
                    site_web: document.getElementById('pr-sw').value.trim()
                };

                const r = await fetch(`${API}/alumni/profil`, {
                    method: 'PUT',
                    headers: authH(),
                    body: JSON.stringify(data)
                });
                const d = await r.json();

                if (d.success) {
                    toast('✅ Profil enregistré !', 'ok');
                    // Mettre à jour les infos affichées
                    document.getElementById('pr-ex').textContent = data.domaine_expertise || '—';
                    document.getElementById('pr-se').textContent = data.secteur_activite || '—';
                } else {
                    toast('❌ Erreur : ' + (d.message || 'Erreur inconnue'), 'err');
                }
            } catch (e) {
                toast('❌ Erreur réseau', 'err');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Enregistrer';
            }
        }

        async function uploadPhoto(input) {
            const f = input.files[0];
            if (!f) return;
            if (f.size > 2 * 1024 * 1024) {
                toast('⚠️ Photo trop lourde (max 2 Mo)', 'err');
                return;
            }

            const rd = new FileReader();
            rd.onload = async e => {
                const url = e.target.result;
                // Aperçu immédiat
                const av = document.getElementById('pr-av');
                const avt = document.getElementById('pr-av-t');
                av.style.backgroundImage = `url(${ url })`;
                av.style.backgroundSize = 'cover';
                av.style.backgroundPosition = 'center';
                avt.style.display = 'none';

                try {
                    const r = await fetch(`${API}/alumni/profil`, {
                        method: 'PUT',
                        headers: authH(),
                        body: JSON.stringify({ photo_url: url })
                    });
                    const d = await r.json();
                    if (d.success) {
                        toast('✅ Photo mise à jour !', 'ok');
                        // Synchroniser la session locale
                        const sess = JSON.parse(localStorage.getItem('user_session') || '{}');
                        sess.photo_url = url;
                        localStorage.setItem('user_session', JSON.stringify(sess));
                    } else {
                        toast('❌ Erreur sauvegarde photo', 'err');
                    }
                } catch (err) {
                    toast('❌ Erreur réseau', 'err');
                }
            };
            rd.readAsDataURL(f);
        }

        /* ═══════════════════════════════════════════════════════════
           DÉMARRAGE
           ═══════════════════════════════════════════════════════════ */
        document.getElementById('sb-nom').textContent =
            ((currentUser.prenom || '') + ' ' + (currentUser.nom || '')).trim() || '—';
        document.getElementById('sb-mat').textContent = currentUser.code_unique || '—';

        // Charger la page d'accueil
        go('accueil');

        // Icônes Lucide si disponibles
        if (window.lucide) lucide.createIcons();
    