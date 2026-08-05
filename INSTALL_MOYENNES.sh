#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  SCRIPT D'INSTALLATION COMPLÈTE - Système de Moyennes Burkina Faso
# ═══════════════════════════════════════════════════════════════════════════════

echo "🚀 Installation du système de calcul des moyennes..."

# 1. Installer les packages Python
echo "📦 Installation des dépendances Python..."
pip install fastapi uvicorn pydantic python-multipart psycopg2-binary

# 2. Installer Chart.js pour le frontend (si npm existe)
if command -v npm &> /dev/null; then
    echo "📦 Installation Chart.js..."
    npm install chart.js vue-chartjs
fi

# 3. Variables d'environnement
echo "⚙️  Configuration des variables d'environnement..."

# Créer fichier .env.python s'il n'existe pas
cat > .env.python << 'EOF'
# Configuration FastAPI
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8001

# PostgreSQL
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=votreMotDePasse
DB_NAME=campus_numerique_db

# Node.js (pour les appels de retour)
NODE_URL=http://localhost:3000
EOF

echo "✓ Fichier .env.python créé (à adapter avec vos paramètres)"

# 4. Exécuter les scripts SQL
echo "🗄️  Exécution des migrations SQL..."
echo "Veuillez exécuter manuellement ces fichiers SQL dans l'ordre :"
echo "  1. campus_numerique_db/16b_migration_coefficients.sql"
echo "  2. campus_numerique_db/16_matieres_coefficients_burkina.sql"

# 5. Lancer l'API Python (en arrière-plan)
echo "🚀 Lancement de l'API FastAPI sur le port 8001..."
# Vous pouvez utiliser pm2 ou un autre process manager
# pm2 start services/api_moyennes.py --name "api-moyennes" --interpreter python3

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "✅ Installation terminée !"
echo ""
echo "📋 PROCHAINES ÉTAPES :"
echo ""
echo "1. Configurer les variables d'environnement :"
echo "   - Éditer .env.python avec vos paramètres PostgreSQL"
echo "   - Éditer .env du frontend avec NODE_URL"
echo ""
echo "2. Exécuter les migrations SQL :"
echo "   psql -U postgres -d campus_numerique_db -f campus_numerique_db/16b_migration_coefficients.sql"
echo "   psql -U postgres -d campus_numerique_db -f campus_numerique_db/16_matieres_coefficients_burkina.sql"
echo ""
echo "3. Lancer les services :"
echo "   Backend Node.js  : npm start (ou node server.js)"
echo "   API Python       : python3 services/api_moyennes.py"
echo "   Frontend Vue     : npm run dev"
echo ""
echo "4. Tester l'API :"
echo "   curl http://localhost:8001/"
echo ""
echo "5. Ajouter la route Express :"
echo "   Importer eleveRouteMoyennes.js dans routes/index.js"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
