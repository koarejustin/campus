// --- 1. CONFIGURATION DES STYLES PAR MATIÈRE ---
const MATIERES_STYLE = {
    'Français': { col: 'bg-blue-500', icon: 'book-open' },
    'Mathématiques': { col: 'bg-rose-500', icon: 'function-square' },
    'Maths': { col: 'bg-rose-500', icon: 'function-square' },
    'SVT': { col: 'bg-emerald-500', icon: 'microscope' },
    'Physique-Chimie': { col: 'bg-indigo-500', icon: 'beaker' },
    'Hist-Géo': { col: 'bg-amber-500', icon: 'map' },
    'Anglais': { col: 'bg-purple-500', icon: 'languages' },
    'Philosophie': { col: 'bg-violet-600', icon: 'brain' },
    'Ed. Civique': { col: 'bg-sky-400', icon: 'shield-check' },
    'ECM': { col: 'bg-sky-400', icon: 'shield-check' },
    'EPS': { col: 'bg-orange-500', icon: 'dumbbell' },
    'Informatique': { col: 'bg-cyan-600', icon: 'monitor' },
    'ICCR': { col: 'bg-slate-500', icon: 'fingerprint' },
    'Immersion Patriotique': { col: 'bg-gradient-to-r from-[#009b3a] to-[#ef2b2d]', icon: 'flag' }
};

// --- 2. BASE DE DONNÉES DYNAMIQUE & NOTES ---
const NOTES_ELEVE = {
    'Maths': 14, 'Mathématiques': 14, 'Français': 12, 'Anglais': 15.5,
    'SVT': 13, 'Physique-Chimie': 11, 'Hist-Géo': 10, 'Philosophie': 14,
    'ECM': 16, 'EPS': 18, 'Informatique': 17, 'Immersion Patriotique': 19
};

const CALENDRIER_SCOLAIRE = {
    evaluations_trimestrielles: [
        { nom: "Compositions 1er Trimestre", date: "Décembre 2025" },
        { nom: "Compositions 2e Trimestre", date: "" },
        { nom: "Compositions 3e Trimestre", date: "" }
    ],
    devoirs_programmes: [
        { matiere: "Maths", date: "15 octobre" },
        { matiere: "Français", date: "22 octobre" }
    ],
    examens_officiels: [
        { nom: "Examen Blanc N°1", date: "" },
        { nom: "Examen Blanc N°2", date: "" },
        { nom: "Examen National (BAC/BEPC)", date: "" }
    ]
};

const PROGRAMMES_BF = {
    '6e': [{ t: "Français", p: "Mme Traoré", c: 4 }, { t: "Mathématiques", p: "M. Ouédraogo", c: 4 }, { t: "Anglais", p: "M. Smith", c: 2 }, { t: "Hist-Géo", p: "Mme Zongo", c: 2 }, { t: "SVT", p: "M. Barry", c: 2 }, { t: "ECM", p: "M. Sawadogo", c: 1 }, { t: "EPS", p: "M. Compaoré", c: 1 }, { t: "Informatique", p: "M. Traoré", c: 1 }],
    '5e': [{ t: "Français", p: "Mme Traoré", c: 4 }, { t: "Mathématiques", p: "M. Ouédraogo", c: 4 }, { t: "Anglais", p: "M. Smith", c: 2 }, { t: "Hist-Géo", p: "Mme Zongo", c: 2 }, { t: "SVT", p: "M. Barry", c: 2 }, { t: "ECM", p: "M. Sawadogo", c: 1 }, { t: "EPS", p: "M. Compaoré", c: 1 }, { t: "Informatique", p: "M. Traoré", c: 1 }],
    '4e': [{ t: "Français", p: "Mme Traoré", c: 4 }, { t: "Mathématiques", p: "M. Sanou", c: 4 }, { t: "Anglais", p: "Mme Kaboré", c: 3 }, { t: "Hist-Géo", p: "Mme Zongo", c: 2 }, { t: "SVT", p: "M. Barry", c: 2 }, { t: "Physique-Chimie", p: "M. Koné", c: 3 }, { t: "ECM", p: "M. Sawadogo", c: 1 }, { t: "EPS", p: "M. Compaoré", c: 1 }, { t: "Informatique", p: "M. Traoré", c: 1 }],
    '3e': [{ t: "Français", p: "Mme Traoré", c: 5 }, { t: "Mathématiques", p: "M. Sanou", c: 5 }, { t: "Anglais", p: "Mme Kaboré", c: 3 }, { t: "Hist-Géo", p: "Mme Zongo", c: 3 }, { t: "SVT", p: "M. Barry", c: 3 }, { t: "Physique-Chimie", p: "M. Koné", c: 4 }, { t: "ECM", p: "M. Sawadogo", c: 1 }, { t: "EPS", p: "M. Compaoré", c: 1 }],
    '2nde A': [{ t: "Français", p: "M. Diallo", c: 4 }, { t: "Mathématiques", p: "M. Sanou", c: 3 }, { t: "Anglais", p: "Mme Kaboré", c: 3 }, { t: "Hist-Géo", p: "M. Somé", c: 4 }, { t: "Philosophie", p: "M. Sawadogo", c: 2 }, { t: "SVT", p: "Mme Boni", c: 2 }, { t: "Immersion Patriotique", p: "Direction", c: 1 }, { t: "EPS", p: "M. Compaoré", c: 1 }],
    '2nde C': [{ t: "Mathématiques", p: "M. Sanou", c: 5 }, { t: "Physique-Chimie", p: "M. Koné", c: 4 }, { t: "SVT", p: "Mme Boni", c: 4 }, { t: "Français", p: "M. Diallo", c: 3 }, { t: "Anglais", p: "Mme Kaboré", c: 2 }, { t: "Hist-Géo", p: "M. Somé", c: 2 }, { t: "Immersion Patriotique", p: "Direction", c: 1 }, { t: "EPS", p: "M. Compaoré", c: 1 }],
    '1ere A': [{ t: "Français", p: "M. Diallo", c: 4 }, { t: "Philosophie", p: "M. Sawadogo", c: 4 }, { t: "Hist-Géo", p: "M. Somé", c: 4 }, { t: "Anglais", p: "Mme Kaboré", c: 3 }, { t: "Mathématiques", p: "M. Sanou", c: 2 }, { t: "Immersion Patriotique", p: "Direction", c: 1 }, { t: "EPS", p: "M. Compaoré", c: 1 }],
    '1ere D': [{ t: "Mathématiques", p: "M. Sanou", c: 5 }, { t: "Physique-Chimie", p: "M. Koné", c: 5 }, { t: "SVT", p: "Mme Boni", c: 4 }, { t: "Français", p: "M. Diallo", c: 3 }, { t: "Anglais", p: "Mme Kaboré", c: 2 }, { t: "Immersion Patriotique", p: "Direction", c: 1 }, { t: "EPS", p: "M. Compaoré", c: 1 }],
    'Tle A': [{ t: "Philosophie", p: "M. Sawadogo", c: 5 }, { t: "Français", p: "M. Diallo", c: 4 }, { t: "Hist-Géo", p: "M. Somé", c: 4 }, { t: "Anglais", p: "Mme Kaboré", c: 3 }, { t: "Immersion Patriotique", p: "Direction", c: 1 }, { t: "EPS", p: "M. Compaoré", c: 1 }],
    'Tle D': [{ t: "Mathématiques", p: "M. Sanou", c: 6 }, { t: "Physique-Chimie", p: "M. Koné", c: 6 }, { t: "SVT", p: "Mme Boni", c: 5 }, { t: "Philosophie", p: "M. Sawadogo", c: 3 }, { t: "Anglais", p: "Mme Kaboré", c: 2 }, { t: "Immersion Patriotique", p: "Direction", c: 1 }, { t: "EPS", p: "M. Compaoré", c: 1 }]
};

// --- 3. FONCTIONS DE CALCUL DYNAMIQUE ---
function calculerMoyenne(classe) {
    const prog = PROGRAMMES_BF[classe] || PROGRAMMES_BF['6e'];
    let totalPoints = 0, totalCoef = 0;
    prog.forEach(m => {
        const note = NOTES_ELEVE[m.t] || 10;
        totalPoints += note * m.c;
        totalCoef += m.c;
    });
    return (totalPoints / totalCoef).toFixed(2);
}

// --- 4. LOGIQUE DE NAVIGATION ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }
}

function launch(role, context) {
    if (role === 'ELEVE') localStorage.setItem('classe_cliquee', context);
    window.location.href = `login.html?role=${role}&context=${encodeURIComponent(context)}`;
}

// --- 6. PAGE SCOLARITÉ ---
function showScolarite() {
    const content = document.getElementById('app-content');
    const stats = document.getElementById('app-stats');
    if (stats) stats.classList.add('hidden');

    content.innerHTML = `
        <div class="animate-in slide-in-from-bottom-10 duration-500 max-w-2xl mx-auto py-10">
            <div class="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 text-center">
                <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <i data-lucide="credit-card" class="w-8 h-8"></i>
                </div>
                <h3 class="text-2xl font-black uppercase tracking-tighter mb-8">Ma Scolarité</h3>
                <div class="space-y-4 text-left">
                    <div class="p-6 bg-slate-50 rounded-3xl flex justify-between items-center border border-slate-100">
                        <span class="text-[10px] font-black text-slate-400 uppercase">Scolarité Totale</span>
                        <span class="font-black text-lg">150 000 FCFA</span>
                    </div>
                    <div class="p-6 bg-emerald-50 rounded-3xl flex justify-between items-center border border-emerald-100">
                        <span class="text-[10px] font-black text-emerald-600 uppercase">Montant Versé</span>
                        <span class="font-black text-lg text-emerald-700">125 000 FCFA</span>
                    </div>
                    <div class="p-6 bg-rose-50 rounded-3xl flex justify-between items-center border border-rose-100 text-rose-600">
                        <span class="text-[10px] font-black uppercase">Solde restant</span>
                        <span class="font-black text-lg italic">25 000 FCFA</span>
                    </div>
                </div>
                <button class="w-full mt-10 bg-slate-900 text-white p-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-lg hover:bg-emerald-600 transition-all">
                    Obtenir un reçu PDF
                </button>
            </div>
        </div>`;
    if (window.lucide) lucide.createIcons();
}

// --- 7. LOGIQUE DE L'EMPLOI DU TEMPS ---
function getTimetableHTML(classe) {
    const creneaux = [
        { h: "07h00 - 08h00", type: "cours" }, { h: "08h00 - 09h00", type: "cours" },
        { h: "09h00 - 10h00", type: "cours" }, { h: "10h00 - 10h15", type: "pause", label: "RECREATION" },
        { h: "10h15 - 11h15", type: "cours" }, { h: "11h15 - 12h15", type: "cours" },
        { h: "12h15 - 15h00", type: "pause", label: "PAUSE DEJEUNER" },
        { h: "15h00 - 16h00", type: "cours" }, { h: "16h00 - 17h00", type: "cours" }
    ];

    return `
        <div class="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h4 class="text-indigo-600 font-black text-[10px] uppercase mb-6 flex items-center gap-2 italic">
                <i data-lucide="clock" class="w-4 h-4"></i> Emploi du temps : ${classe}
            </h4>
            <div class="overflow-x-auto">
                <table class="w-full text-center border-separate border-spacing-y-1">
                    <thead>
                        <tr class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th class="p-3 text-left bg-slate-50 rounded-l-xl">Heures</th>
                            <th class="bg-slate-50">Lun</th><th class="bg-slate-50">Mar</th><th class="bg-slate-50">Mer</th>
                            <th class="bg-slate-50">Jeu</th><th class="bg-slate-50">Ven</th><th class="bg-slate-50 rounded-r-xl">Sam</th>
                        </tr>
                    </thead>
                    <tbody class="text-[10px] font-bold">
                        ${creneaux.map(c => {
        if (c.type === "pause") return `<tr><td colspan="7" class="p-2 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black italic uppercase text-center">${c.h} — ${c.label}</td></tr>`;
        return `<tr class="group">
                                <td class="p-3 text-left text-indigo-500 bg-indigo-50/30 rounded-l-xl border-l-2 border-indigo-500">${c.h}</td>
                                <td class="bg-slate-50/50 group-hover:bg-white transition-colors">Cours</td><td class="bg-slate-50/50 group-hover:bg-white transition-colors">Cours</td>
                                <td class="bg-slate-50/50 group-hover:bg-white transition-colors">Cours</td><td class="bg-slate-50/50 group-hover:bg-white transition-colors">Cours</td>
                                <td class="bg-slate-50/50 group-hover:bg-white transition-colors">Cours</td><td class="bg-slate-100 text-slate-400 rounded-r-xl">/</td>
                            </tr>`;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

// --- 8. ESPACE ACADÉMIQUE ---
async function loadAcademicSpace() {
    const content = document.getElementById('app-content');
    const statsContainer = document.getElementById('app-stats');
    const userData = JSON.parse(localStorage.getItem('user_session')) || {};
    const maClasse = userData.classe || userData.classe_actuelle || 'N/A';
    const estClasseExamen = maClasse.includes('3e') || maClasse.includes('Tle') || maClasse.includes('Terminale');

    if (statsContainer) statsContainer.classList.add('hidden');

    const getDateBadge = (date) => date !== "" ?
        `<span class="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter">${date}</span>` :
        `<span class="text-[9px] bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-lg font-black italic uppercase tracking-tighter animate-pulse">En attente...</span>`;

    content.innerHTML = `
        <div class="animate-in fade-in zoom-in duration-500 pb-20 space-y-6">
            <div class="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <i data-lucide="graduation-cap" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h2 class="text-xl font-black uppercase text-slate-800 tracking-tighter italic leading-none">Espace Académique</h2>
                        <p class="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1">${maClasse} • Burkina Faso</p>
                    </div>
                </div>
                <button onclick="exitAcademicSpace()" class="group bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg">
                    <i data-lucide="arrow-left" class="w-4 h-4 group-hover:-translate-x-1 transition-transform"></i> Retour
                </button>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div class="xl:col-span-3 space-y-6">
                    <section>
                        <div class="flex items-center gap-2 mb-4 ml-2">
                            <span class="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                            <h3 class="text-sm font-black text-slate-800 uppercase italic">Mes Cours & Supports</h3>
                        </div>
                        <div id="academic-gallery" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
                    </section>
                    ${getTimetableHTML(maClasse)}
                </div>

                <div class="space-y-6">
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] text-white shadow-2xl">
                        <h3 class="font-black uppercase text-[10px] flex items-center gap-2 text-indigo-400 mb-6 italic tracking-widest">
                            <i data-lucide="calendar-days" class="w-4 h-4"></i> Agenda Scolaire
                        </h3>
                        
                        <div class="space-y-6">
                            <div class="space-y-3">
                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span class="w-1 h-1 bg-emerald-500 rounded-full"></span> Devoirs
                                </p>
                                ${CALENDRIER_SCOLAIRE.devoirs_programmes.map(d => `
                                    <div class="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span class="text-[10px] font-bold uppercase text-slate-200">${d.matiere}</span>
                                        ${getDateBadge(d.date)}
                                    </div>
                                `).join('')}
                            </div>

                            <div class="space-y-3 pt-4 border-t border-white/5">
                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span class="w-1 h-1 bg-indigo-500 rounded-full"></span> Compositions
                                </p>
                                ${CALENDRIER_SCOLAIRE.evaluations_trimestrielles.map(c => `
                                    <div class="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span class="text-[10px] font-bold uppercase text-slate-200">${c.nom}</span>
                                        ${getDateBadge(c.date)}
                                    </div>
                                `).join('')}
                            </div>

                            ${estClasseExamen ? `
                            <div class="space-y-3 pt-4 border-t border-white/5">
                                <p class="text-[8px] font-black text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span class="w-1 h-1 bg-rose-500 rounded-full"></span> Examens Officiels
                                </p>
                                ${CALENDRIER_SCOLAIRE.examens_officiels.map(e => `
                                    <div class="flex justify-between items-center p-3 bg-rose-500/5 rounded-2xl border border-rose-500/20">
                                        <span class="text-[10px] font-bold uppercase text-rose-100">${e.nom}</span>
                                        ${getDateBadge(e.date)}
                                    </div>
                                `).join('')}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    renderAdaptiveCourses(maClasse);
}

function renderAdaptiveCourses(classe) {
    const gallery = document.getElementById('academic-gallery');
    const nomClasse = String(classe).trim();
    const currentProg = PROGRAMMES_BF[nomClasse] || PROGRAMMES_BF['6e'];

    gallery.innerHTML = currentProg.map((c) => {
        const style = MATIERES_STYLE[c.t] || { col: 'bg-slate-500', icon: 'book' };
        return `
        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group h-full">
            <div class="p-6 flex flex-col h-full">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-10 h-10 ${style.col} rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:rotate-6">
                        <i data-lucide="${style.icon}" class="w-5 h-5"></i>
                    </div>
                    <span class="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-1 rounded-md">COEF: ${c.c}</span>
                </div>
                <div class="mb-6 flex-grow">
                    <h4 class="text-sm font-black text-slate-800 uppercase leading-tight mb-1">${c.t}</h4>
                    <p class="text-[10px] font-bold text-slate-400 flex items-center gap-1 italic"><i data-lucide="user" class="w-3 h-3 text-indigo-500"></i> ${c.p}</p>
                </div>
                <button onclick="window.print()" class="w-full bg-slate-900 text-white p-3 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-md">
                    <i data-lucide="download-cloud" class="w-3.5 h-3.5"></i> Télécharger
                </button>
            </div>
        </div>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

// --- 9. DASHBOARD HOME ---
function showDashboardHome() {
    const userData = JSON.parse(localStorage.getItem('user_session')) || { prenom: "Élève" };
    const content = document.getElementById('app-content');
    const stats = document.getElementById('app-stats');
    const maClasse = userData.classe || userData.classe_actuelle || "3e";
    const moyenne = calculerMoyenne(maClasse);

    if (stats) {
        stats.classList.remove('hidden');
        stats.innerHTML = `
            <div class="bg-indigo-600 p-6 rounded-3xl shadow-lg text-white">
                <p class="text-[8px] font-black uppercase opacity-60 mb-1 tracking-widest">ID Unique</p>
                <h4 class="font-black text-lg italic">${userData.code_unique || 'E-2026-BF'}</h4>
            </div>
            <div class="bg-slate-900 p-6 rounded-3xl shadow-lg text-white">
                <p class="text-[8px] font-black uppercase opacity-60 mb-1 tracking-widest">Classe Réelle</p>
                <h4 class="font-black text-lg italic">${maClasse}</h4>
            </div>
            <div class="bg-emerald-600 p-6 rounded-3xl shadow-lg text-white">
                <p class="text-[8px] font-black uppercase opacity-60 mb-1 tracking-widest">Moyenne / 20</p>
                <h4 class="font-black text-lg italic tracking-widest">${moyenne}</h4>
            </div>`;
    }

    content.innerHTML = `
        <div id="welcome-box" class="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
            <h3 class="text-3xl font-light italic text-slate-400 tracking-tighter">
                Bienvenue dans ta classe, <span class="text-indigo-600 font-medium">${userData.prenom}</span>
            </h3>
        </div>
        <div id="dash-main-content" class="hidden opacity-0">
            <div class="bg-indigo-950 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-xl">
                <div class="relative z-10">
                    <h3 class="text-xl font-light italic mb-2">Tableau de Bord</h3>
                    <p class="text-indigo-300 font-medium text-sm opacity-80 uppercase tracking-widest text-[10px]">Tes informations scolaires sont à jour.</p>
                </div>
                <i data-lucide="sparkles" class="absolute right-8 top-8 w-24 h-24 text-white/5 rotate-12"></i>
            </div>
        </div>`;

    setTimeout(() => {
        const welcome = document.getElementById('welcome-box');
        const main = document.getElementById('dash-main-content');
        if (welcome) welcome.classList.add('animate-out', 'fade-out', 'duration-1000');
        setTimeout(() => {
            if (welcome) welcome.style.display = 'none';
            if (main) {
                main.classList.remove('hidden');
                main.classList.add('animate-in', 'fade-in', 'duration-700');
                main.style.opacity = "1";
            }
        }, 900);
    }, 3000);

    if (window.lucide) lucide.createIcons();
}

function exitAcademicSpace() {
    const statsContainer = document.getElementById('app-stats');
    if (statsContainer) statsContainer.classList.remove('hidden');
    showDashboardHome();
}

// --- 10. INITIALISATION DU DASHBOARD ---
function initDashboard(role, context, userData) {
    // 🛡️ DÉTECTION ADMIN (Source I.3 : Cloisonnement strict)
    if (role === 'DIRECTION' || role === 'SURVEILLANT') {
        showView('view-app'); // On affiche le conteneur principal

        // On vérifie que admin.js est chargé
        if (typeof initAdminInterface === "function") {
            initAdminInterface(role);
        } else {
            console.error("Fichier admin.js manquant !");
        }
        return; // ON ARRÊTE LA LOGIQUE ÉLÈVE ICI
    }

    const classeVoulue = localStorage.getItem('classe_cliquee');
    const classeReelle = userData.classe || userData.classe_actuelle;

    if (role === 'ELEVE' && classeVoulue && classeReelle !== classeVoulue) {
        alert(`ACCÈS REFUSÉ : Tu es en ${classeReelle}. Tu ne peux pas accéder à la classe de ${classeVoulue}.`);
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }

    showView('view-app');
    const menuContainer = document.getElementById('sidebar-menu');
    const menuItems = [
        { icon: 'layout-dashboard', label: 'Dashboard', action: 'showDashboardHome' },
        { icon: 'graduation-cap', label: 'Mon Programme', action: 'loadAcademicSpace' },
        { icon: 'file-text', label: 'Bulletins', action: 'showBulletins' },
        { icon: 'credit-card', label: 'Scolarité', action: 'showScolarite' }
    ];
    if (menuContainer) {
        menuContainer.innerHTML = menuItems.map(i => `<div onclick="${i.action}()" class="group cursor-pointer p-4 rounded-xl font-black text-slate-500 flex items-center gap-3 hover:bg-indigo-50 transition-all mb-1">
            <i data-lucide="${i.icon}" class="w-5 h-5 group-hover:text-indigo-600"></i><span class="group-hover:text-indigo-600 text-xs uppercase tracking-tight">${i.label}</span></div>`).join('') +
            `<div onclick="logout()" class="mt-8 p-4 rounded-xl font-black text-red-500 flex items-center gap-3 hover:bg-red-50 cursor-pointer transition-all"><i data-lucide="log-out" class="w-5 h-5"></i><span class="text-xs uppercase tracking-tight">Quitter</span></div>`;
    }
    showDashboardHome();
}

function logout() { localStorage.clear(); window.location.href = 'index.html'; }

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
        setTimeout(() => {
            const sessionData = localStorage.getItem('user_session');
            if (sessionData) initDashboard(params.get('role'), params.get('context'), JSON.parse(sessionData));
            else window.location.href = 'login.html';
        }, 50);
    } else {
        showView('view-home');
    }
});