const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const app = express();
const path = require('path');

app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du frontend
app.use(express.static('frontend'));
// Servir les uploads (photos de profils)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Chargement des Routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const adminRoutes = require('./routes/adminRoutes');
const surveillantRoutes = require('./routes/surveillantRoutes');
const eleveRoutes = require('./routes/eleveRoutes');
const parentRoutes = require('./routes/parentRoutes');
const professeurRoutes = require('./routes/professeurRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/cours', courseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/surveillants', surveillantRoutes);
app.use('/api/eleves', eleveRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/professeurs', professeurRoutes);

// Route racine - Page d'accueil du serveur
app.get('/', async (req, res) => {
    try {
        // Récupérer les stats
        let stats = { users: 0, courses: 0, usersOnline: 8 };

        try {
            const r1 = await db.query('SELECT COUNT(*) FROM authentification.comptes');
            stats.users = r1.rows[0].count || 0;
        } catch (e) { }

        try {
            const r2 = await db.query('SELECT COUNT(*) FROM authentification.cours');
            stats.courses = r2.rows[0].count || 0;
        } catch (e) { }

        // Récupérer les cours
        let courses = [];
        try {
            const r3 = await db.query('SELECT id, nom, description FROM authentification.cours LIMIT 12');
            courses = r3.rows || [];
        } catch (e) { }

        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Campus Numérique - Accueil Serveur</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .stat-card { transition: all 0.3s ease; }
        .stat-card:hover { transform: translateY(-5px); }
        .course-card { transition: all 0.3s ease; }
        .course-card:hover { transform: scale(1.05); }
    </style>
</head>
<body class="bg-gradient-to-br from-indigo-50 via-white to-purple-50">
    <nav class="fixed top-0 w-full h-20 z-50 px-12 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div class="flex items-center gap-3">
            <div class="bg-indigo-600 p-2 rounded-xl shadow-lg">
                <i data-lucide="layout-grid" class="text-white w-5 h-5"></i>
            </div>
            <span class="text-2xl font-black italic uppercase">CAMPUS<span class="text-indigo-600">NUM</span></span>
        </div>
        <div class="text-sm text-slate-500 font-bold">🚀 Serveur Actif</div>
    </nav>

    <main class="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div class="text-center mb-16">
            <h1 class="text-5xl font-black italic uppercase tracking-tight mb-2">
                Bienvenue au <span class="text-indigo-600">Campus Numérique</span>
            </h1>
            <p class="text-slate-500 font-bold text-sm uppercase tracking-widest">Portail d'Administration Scolaire</p>
        </div>

        <!-- Statistiques -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div class="stat-card bg-white p-8 rounded-3xl border border-slate-100 shadow-md">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-slate-400 text-sm font-bold uppercase">Utilisateurs</p>
                        <p class="text-4xl font-black text-slate-900 mt-2">${stats.users}</p>
                    </div>
                    <div class="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                        <i data-lucide="users" class="text-indigo-600 w-8 h-8"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card bg-white p-8 rounded-3xl border border-slate-100 shadow-md">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-slate-400 text-sm font-bold uppercase">En Ligne</p>
                        <p class="text-4xl font-black text-slate-900 mt-2">${stats.usersOnline}</p>
                    </div>
                    <div class="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                        <i data-lucide="activity" class="text-emerald-600 w-8 h-8"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card bg-white p-8 rounded-3xl border border-slate-100 shadow-md">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-slate-400 text-sm font-bold uppercase">Cours</p>
                        <p class="text-4xl font-black text-slate-900 mt-2">${stats.courses}</p>
                    </div>
                    <div class="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                        <i data-lucide="book-open" class="text-purple-600 w-8 h-8"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cours -->
        <div>
            <h2 class="text-3xl font-black italic uppercase mb-8">Catalogue des Cours</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${courses.map(course => `
                    <div class="course-card bg-white p-6 rounded-2xl border border-slate-100 shadow-md hover:shadow-xl">
                        <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                            <i data-lucide="book-marked" class="text-indigo-600"></i>
                        </div>
                        <h3 class="font-black text-lg mb-2">${course.nom || 'Sans titre'}</h3>
                        <p class="text-slate-500 text-sm">${course.description || 'Aucune description'}</p>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Footer -->
        <div class="mt-16 text-center pt-8 border-t border-slate-200">
            <p class="text-slate-400 text-sm">
                ✨ Campus Numérique © 2025 | Plateforme Scolaire Intégrée
            </p>
        </div>
    </main>

    <script>
        if (window.lucide) lucide.createIcons();
    </script>
</body>
</html>`;

        res.send(html);
    } catch (error) {
        console.error('Erreur page accueil:', error);
        res.send('<h1>Campus Numérique</h1><p>Serveur actif ✓</p>');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    console.log(`✅ Prêt pour le laboratoire virtuel [cite: 2025-09-23]`);
});
