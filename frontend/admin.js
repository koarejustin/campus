/**
 * CAMPUS NUMÉRIQUE FASO - ESPACE ADMINISTRATION
 * Adapté pour : Justin KOARE (DIRECTION) & SURVEILLANTS
 */

// --- 1. INITIALISATION DE L'INTERFACE ADMIN ---
function initAdminInterface(role) {
    const menuContainer = document.getElementById('sidebar-menu');
    const userData = JSON.parse(localStorage.getItem('user_session')) || {};

    // Configuration des menus selon le Cahier des Charges (Source I.3)
    const menus = {
        'DIRECTION': [
            { icon: 'layout-dashboard', label: 'Tableau de Bord', action: 'showAdminDashboard' },
            { icon: 'users', label: 'Gestion Élèves', action: 'manageStudents' },
            { icon: 'briefcase', label: 'Corps Enseignant', action: 'manageStaff' },
            { icon: 'wallet', label: 'Comptabilité / APE', action: 'viewFinance' },
            { icon: 'check-square', label: 'Signatures PDF', action: 'viewValidation' },
            { icon: 'megaphone', label: 'Canal Officiel', action: 'viewCanal' }
        ],
        'SURVEILLANT': [
            { icon: 'layout-dashboard', label: 'Tableau de Bord', action: 'showAdminDashboard' },
            { icon: 'user-x', label: 'Absences & Retards', action: 'manageAbsences' },
            { icon: 'clipboard-list', label: 'Convocations', action: 'viewConvocations' },
            { icon: 'calendar', label: 'Calendrier Scolaire', action: 'viewCalendar' }
        ]
    };

    const activeMenu = menus[role] || menus['DIRECTION'];

    // Injection du menu spécifique Admin dans la sidebar
    if (menuContainer) {
        menuContainer.innerHTML = `
            <div class="mb-10 px-4">
                <h1 class="text-xl font-black italic tracking-tighter text-indigo-600">ÉCOLE<span class="text-slate-900">NUM</span></h1>
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Admin Portal</p>
            </div>
            <div class="space-y-1">
                ${activeMenu.map(i => `
                    <div onclick="${i.action}('${role}')" class="group cursor-pointer p-4 rounded-2xl flex items-center gap-4 hover:bg-indigo-50 transition-all">
                        <i data-lucide="${i.icon}" class="w-5 h-5 text-slate-400 group-hover:text-indigo-600"></i>
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-600">${i.label}</span>
                    </div>
                `).join('')}
            </div>
            <div onclick="logout()" class="mt-10 p-4 border-t border-slate-50 flex items-center gap-4 text-rose-500 cursor-pointer group">
                <i data-lucide="log-out" class="w-5 h-5 group-hover:translate-x-1 transition-transform"></i>
                <span class="text-[10px] font-black uppercase tracking-widest text-rose-500">Déconnexion</span>
            </div>
        `;
    }

    if (window.lucide) lucide.createIcons();
    showAdminDashboard(role);
}

// --- 2. LE DASHBOARD PRINCIPAL (Look Premium) ---
function showAdminDashboard(role) {
    const content = document.getElementById('app-content');
    const statsContainer = document.getElementById('app-stats');
    const userData = JSON.parse(localStorage.getItem('user_session')) || {};

    // Cacher les stats de l'élève s'il y en a
    if (statsContainer) statsContainer.classList.add('hidden');

    content.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10 pb-20">
            
            <div class="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 gap-6">
                <div class="flex items-center gap-5">
                    <div class="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-xl font-black shadow-2xl rotate-3">
                        ${userData.prenom ? userData.prenom[0] : 'A'}
                    </div>
                    <div>
                        <h2 class="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                            Bonjour, ${userData.prenom || 'Admin'}
                        </h2>
                        <p class="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-2">
                            ${role} • ${userData.code_unique || 'ADMIN-BF'}
                        </p>
                    </div>
                </div>
                <div class="bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100">
                    <p class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 text-center">État du Système</p>
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        <span class="text-xs font-black text-indigo-900">SERVEUR CONNECTÉ (5000)</span>
                    </div>
                </div>
            </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        ${renderStatCard('Effectif Total', '500', 'users', 'bg-indigo-50 text-indigo-600')}
                        ${renderStatCard('Classes Actives', '10', 'layout', 'bg-amber-50 text-amber-600')}
                        ${renderStatCard('Professeurs', '24', 'graduation-cap', 'bg-emerald-50 text-emerald-600')}
                        ${renderStatCard('Alertes Absence', '12', 'alert-circle', 'bg-rose-50 text-rose-600')}
                    </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div class="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50 relative overflow-hidden">
                    <div class="flex justify-between items-center mb-10">
                        <h3 class="font-black uppercase italic text-xs tracking-widest text-slate-400">Présence par Niveau</h3>
                        <div class="w-3 h-3 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200"></div>
                    </div>
                    <div class="h-64 flex items-end justify-between gap-3 px-2">
                        ${['6e', '5e', '4e', '3e', '2A', '2C', '1A', '1D', 'TA', 'TD'].map(n => `
                            <div class="flex flex-col items-center gap-3 w-full group">
                                <div class="w-full bg-slate-100 rounded-2xl group-hover:bg-indigo-600 transition-all duration-500 cursor-pointer relative" style="height: ${Math.floor(Math.random() * 60) + 30}%">
                                    <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-indigo-600 opacity-0 group-hover:opacity-100">98%</span>
                                </div>
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">${n}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-white relative">
                    <div class="absolute top-8 right-8 text-indigo-500/20"><i data-lucide="megaphone" class="w-20 h-20"></i></div>
                    <h3 class="font-black uppercase text-[10px] text-indigo-400 mb-8 tracking-[0.2em] italic">Canal de Diffusion</h3>
                    <div class="space-y-4 relative z-10">
                        <div class="p-5 bg-white/5 rounded-[2rem] border border-white/10 hover:border-indigo-500 transition-all cursor-pointer">
                            <p class="text-[11px] leading-relaxed text-slate-300 italic font-medium">"La réunion avec l'APE est confirmée pour samedi."</p>
                            <div class="flex justify-between items-center mt-4">
                                <span class="text-[8px] bg-indigo-600 px-2 py-1 rounded text-white font-black uppercase">Direction</span>
                                <span class="text-[8px] text-slate-500 font-bold uppercase italic tracking-widest">Posté il y a 2h</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="viewCanal()" class="w-full mt-8 bg-white text-slate-900 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-400 hover:text-white transition-all shadow-xl">
                        Nouveau Message
                    </button>
                </div>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();

    // Récupération des statistiques dynamiques depuis le backend
    (async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user_session') || '{}');
            const token = user && user.token ? user.token : null;
            const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
            const res = await fetch('/api/admin/stats', { headers });
            if (!res.ok) return; // ne pas casser l'UI si erreur
            const data = await res.json();
            if (data && data.stats) {
                const s = data.stats;
                const set = (key, value) => {
                    const el = document.getElementById('stat-' + key);
                    if (el) el.textContent = value;
                };
                set('effectif-total', s.users);
                set('classes-actives', s.classes);
                set('professeurs', s.professors || s.professors);
                set('alertes-absence', s.alerts || s.absences);
            }
        } catch (e) {
            console.warn('Impossible de charger les stats admin', e.message);
        }
    })();
}

// --- 3. FONCTIONS COMPOSANTS (UI) ---

function renderStatCard(label, value, icon, colors) {
    // Génère un ID sûr pour chaque stat à partir du label
    const id = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    return `
        <div class="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-50 group hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer">
            <div class="flex items-center gap-5">
                <div class="w-14 h-14 ${colors} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <i data-lucide="${icon}" class="w-7 h-7"></i>
                </div>
                <div>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">${label}</p>
                    <h4 id="stat-${id}" class="text-2xl font-black text-slate-900 tracking-tighter italic">${value}</h4>
                </div>
            </div>
        </div>
    `;
}

// --- 4. GESTION DES ÉLÈVES (Le tableau 500 élèves) ---
function manageStudents() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="animate-in slide-in-from-right-10 duration-700 bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-50">
            <div class="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div>
                    <h2 class="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Effectifs</h2>
                    <p class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Base de données : 500 Élèves</p>
                </div>
                <div class="flex gap-4">
                    <div class="bg-slate-50 px-6 py-4 rounded-2xl flex items-center gap-3">
                        <i data-lucide="search" class="w-4 h-4 text-slate-300"></i>
                        <input type="text" placeholder="Rechercher un élève..." class="bg-transparent border-none outline-none text-xs font-bold text-slate-600">
                    </div>
                    <button class="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">
                        Ajouter
                    </button>
                </div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-left border-separate border-spacing-y-4">
                    <thead>
                        <tr class="text-[10px] uppercase text-slate-400 font-black tracking-widest italic">
                            <th class="px-8 py-2">Identité</th>
                            <th class="px-8 py-2">Code</th>
                            <th class="px-8 py-2">Classe</th>
                            <th class="px-8 py-2">Scolarité</th>
                            <th class="px-8 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="text-xs font-bold">
                        ${renderStudentRow('ZONGO Issa', 'CN-2026-2000', '3e', '125 000 / 150 000', 'text-amber-500')}
                        ${renderStudentRow('KABORÉ Aminata', 'CN-2026-2001', 'Tle D', 'SOLDE PAYÉ', 'text-emerald-500')}
                        ${renderStudentRow('SAWADOGO Moussa', 'CN-2026-2002', '4e', 'EN ATTENTE', 'text-rose-500')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderStudentRow(name, id, classe, status, colorClass) {
    return `
        <tr class="bg-slate-50/50 hover:bg-white hover:shadow-xl transition-all rounded-3xl group cursor-pointer">
            <td class="px-8 py-6 rounded-l-[2rem] italic font-black uppercase text-slate-800 tracking-tight">${name}</td>
            <td class="px-8 py-6 text-indigo-500 font-mono text-[10px]">${id}</td>
            <td class="px-8 py-6"><span class="bg-indigo-100 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] uppercase font-black">${classe}</span></td>
            <td class="px-8 py-6 ${colorClass} uppercase text-[10px] font-black italic tracking-tighter">${status}</td>
            <td class="px-8 py-6 rounded-r-[2rem]">
                <button class="w-10 h-10 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 rounded-xl flex items-center justify-center transition-all">
                    <i data-lucide="more-horizontal" class="w-5 h-5"></i>
                </button>
            </td>
        </tr>
    `;
}