// ==========================================
// MODULE : GESTION DES BULLETINS NUMÉRIQUES
// ==========================================

function showBulletins() {
    const userData = JSON.parse(localStorage.getItem('user_session')) || { classe: "3e" };
    const content = document.getElementById('app-content');
    const stats = document.getElementById('app-stats');

    // Masquer les statistiques du dashboard pour laisser place au bulletin
    if (stats) stats.classList.add('hidden');

    const maClasse = userData.classe || "3e";
    const prog = PROGRAMMES_BF[maClasse] || [];
    const moyenneG = calculerMoyenne(maClasse);

    content.innerHTML = `
        <div class="animate-in zoom-in duration-500 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-5xl mx-auto mb-20 font-sans">
            <div class="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8">
                <div class="text-left">
                    <h1 class="text-3xl font-black uppercase tracking-tighter text-slate-900">Bulletin de Notes</h1>
                    <p class="text-indigo-600 font-bold italic uppercase text-xs">Burkina Faso • Premier Trimestre</p>
                </div>
                <div class="text-right text-[10px] font-black uppercase text-slate-500">
                    <p>Année Scolaire 2025-2026</p>
                    <p class="text-slate-400 italic font-medium">Original certifié numérique</p>
                </div>
            </div>

            <table class="w-full border-collapse border border-slate-300">
                <thead class="bg-slate-900 text-white text-[10px] uppercase">
                    <tr>
                        <th class="p-3 border border-slate-400 text-left tracking-widest">Matières</th>
                        <th class="p-3 border border-slate-400">Coef</th>
                        <th class="p-3 border border-slate-400">Note /20</th>
                        <th class="p-3 border border-slate-400">Rang</th>
                        <th class="p-3 border border-slate-400 text-left px-6">Appréciations</th>
                        <th class="p-3 border border-slate-400">Signature</th>
                    </tr>
                </thead>
                <tbody class="text-[11px] font-bold">
                    ${prog.map(m => `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="p-3 border border-slate-200 text-slate-800 uppercase">${m.t}</td>
                            <td class="p-3 border border-slate-200 text-center text-slate-400">${m.c}</td>
                            <td class="p-3 border border-slate-200 text-center text-indigo-700 font-black text-sm">${NOTES_ELEVE[m.t] || '10'}</td>
                            <td class="p-3 border border-slate-200 text-center uppercase text-slate-500">1er</td>
                            <td class="p-3 border border-slate-200 italic text-slate-500 font-medium px-6">Excellent travail, continuez ainsi.</td>
                            <td class="p-3 border border-slate-200 text-center opacity-20 text-[8px] italic tracking-tighter">Électronique Prof</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot class="bg-slate-100 text-slate-900 font-black">
                    <tr>
                        <td colspan="2" class="p-4 text-right uppercase tracking-widest text-xs border-t-2 border-slate-900">Moyenne Générale</td>
                        <td class="p-4 text-center text-2xl text-indigo-700 font-black border-r border-slate-300 border-t-2 border-slate-900">${moyenneG}</td>
                        <td colspan="3" class="p-4 text-center italic text-emerald-600 uppercase text-[10px] border-t-2 border-slate-900">
                            Félicitations • Tableau d'Honneur
                        </td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="mt-8 flex justify-between items-end opacity-40">
                <div class="text-[8px] uppercase font-black">Identifiant unique: ${userData.code_unique || 'CN-BF-2026'}</div>
                <div class="w-16 h-16 border-2 border-slate-900 flex items-center justify-center font-black text-[8px] rotate-12">CACHET</div>
            </div>
        </div>`;
}