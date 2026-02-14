const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const app = express();

app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

app.use(cors());
app.use(express.json());

// Chargement des Routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/cours', courseRoutes);

// Dashboard HTML
app.get('/', async (req, res) => {
    try {
        const userCount = await db.query('SELECT COUNT(*) FROM authentification.comptes');
        const courseCount = await db.query('SELECT COUNT(*) FROM authentification.cours');

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #f4f7f6; min-height: 100vh;">
                <h1 style="color: #2c3e50;">🎓 Campus Numérique Faso - Dashboard</h1>
                <div style="display: flex; justify-content: center; gap: 30px; margin-top: 30px;">
                    <div style="padding: 20px; background: white; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <h2>👥 ${userCount.rows[0].count}</h2>
                        <p>Utilisateurs</p>
                    </div>
                    <div style="padding: 20px; background: white; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <h2>📚 ${courseCount.rows[0].count}</h2>
                        <p>Cours en ligne</p>
                    </div>
                </div>
                <p style="margin-top: 40px;">✅ Base <strong>${process.env.DB_NAME}</strong> connectée.</p>
            </div>
        `);
    } catch (err) {
        res.status(500).send("<h1>Erreur de connexion à la base</h1>");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    console.log(`✅ Prêt pour le laboratoire virtuel [cite: 2025-09-23]`);
});