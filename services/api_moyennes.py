#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════════
  API FASTAPI - Calcul des Moyennes en Temps Réel
  Port : 8001
  
  Endpoints :
  - POST /api/moyennes/calculer — Calcul complet des moyennes
  - GET  /api/moyennes/eleve/{id_eleve} — Récupération données courbe
  - POST /api/moyennes/courbe-interactive — Données pour graphique
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
from datetime import datetime
import sys
import os

# Import du moteur
sys.path.insert(0, os.path.dirname(__file__))
from moteur_moyennes_bf import calculer_donnees_courbe, MoteurMoyennesBF

# ═══════════════════════════════════════════════════════════════════════════════
# MODÈLES PYDANTIC
# ═══════════════════════════════════════════════════════════════════════════════

class NoteInput(BaseModel):
    """Modèle pour une note d'évaluation"""
    note: float
    matiere: str
    type: str  # 'DEVOIR' ou 'COMPOSITION'
    trimestre: int
    date: str
    coefficient: Optional[float] = 1.0


class CalculMoyennesRequest(BaseModel):
    """Requête pour calculer les moyennes"""
    id_eleve: str
    classe: str
    serie: str
    notes: List[NoteInput]


class MoyennesResponse(BaseModel):
    """Réponse du calcul des moyennes"""
    success: bool
    moyenne_generale: float
    appreciation: str
    details: Dict
    evolution: Dict
    predictions: Dict
    alertes: List[Dict]
    courbe: List[Dict]
    timestamp: str


# ═══════════════════════════════════════════════════════════════════════════════
# INITIALISATION FASTAPI
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="API Moyennes Burkina",
    description="Calcul avancé des moyennes scolaires",
    version="1.0.0"
)

# CORS pour accepter les requêtes depuis Node.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

moteur = MoteurMoyennesBF()

# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """Endpoint de vérification"""
    return {
        "status": "ok",
        "service": "Calcul des Moyennes - Burkina Faso",
        "version": "1.0.0"
    }


@app.post("/api/moyennes/calculer")
async def calculer_moyennes(request: CalculMoyennesRequest) -> Dict:
    """
    Calcule la moyenne générale et génère les données pour la courbe.
    
    Exemple de requête :
    ```json
    {
        "id_eleve": "user-123",
        "classe": "SECONDE",
        "serie": "GENERALE",
        "notes": [
            {"note": 15.5, "matiere": "Français", "type": "DEVOIR", "trimestre": 1, "date": "2025-01-10"},
            {"note": 14.0, "matiere": "Mathématiques", "type": "COMPOSITION", "trimestre": 1, "date": "2025-01-20"}
        ]
    }
    ```
    """
    try:
        # Transformer les notes
        notes_formatees = [
            {
                'note': n.note,
                'matiere': n.matiere,
                'type': n.type,
                'trimestre': n.trimestre,
                'date': n.date
            }
            for n in request.notes
        ]

        # Calcul via le moteur
        resultat = calculer_donnees_courbe(
            request.id_eleve,
            request.classe,
            request.serie,
            notes_formatees
        )

        return {
            "success": True,
            "data": resultat,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/moyennes/eleve/{id_eleve}")
async def get_moyennes_eleve(id_eleve: str, classe: str = "SECONDE", serie: str = "GENERALE") -> Dict:
    """
    Récupère les moyennes stockées pour un élève.
    
    À implémenter avec base de données PostgreSQL.
    """
    return {
        "success": True,
        "id_eleve": id_eleve,
        "classe": classe,
        "serie": serie,
        "message": "Endpoint en construction - connexion BDD requise"
    }


@app.post("/api/moyennes/courbe-interactive")
async def courbe_interactive(request: CalculMoyennesRequest) -> Dict:
    """
    Retourne les données formatées pour une courbe interactive.
    """
    try:
        notes_formatees = [
            {
                'note': n.note,
                'matiere': n.matiere,
                'type': n.type,
                'trimestre': n.trimestre,
                'date': n.date
            }
            for n in request.notes
        ]

        resultat = calculer_donnees_courbe(
            request.id_eleve,
            request.classe,
            request.serie,
            notes_formatees
        )

        # Formater pour Chart.js
        return {
            "success": True,
            "chartData": {
                "labels": [f"Note {i+1}" for i in range(len(resultat['courbe_chronologique']))],
                "datasets": [
                    {
                        "label": "Évolution des notes",
                        "data": [n['note'] for n in resultat['courbe_chronologique']],
                        "borderColor": "rgb(75, 192, 192)",
                        "backgroundColor": "rgba(75, 192, 192, 0.1)",
                        "tension": 0.4,
                        "fill": True
                    }
                ]
            },
            "moyennes_par_matiere": resultat['details_matieres'],
            "moyenne_generale": resultat['moyenne_generale']['moyenne_generale'],
            "evolution": resultat['evolution'],
            "predictions": resultat['predictions'],
            "alertes": resultat['alertes'],
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/moyennes/analyse-predictive")
async def analyse_predictive(
    moyenne_actuelle: float,
    somme_coefs: float,
    cible: float,
    prochains_devoirs: int = 2
) -> Dict:
    """
    Analyse prédictive : note minimale pour atteindre une cible.
    """
    note_min = moteur.note_minimale_pour_cible(moyenne_actuelle, somme_coefs, prochains_devoirs, cible)
    
    if note_min > 20:
        statut = "IMPOSSIBLE"
        conseil = f"Impossible d'atteindre {cible} avec les conditions actuelles"
    elif note_min < 0:
        statut = "GARANTIE"
        conseil = f"Cible de {cible} atteinte même avec 0/20 aux prochains devoirs"
    else:
        statut = "POSSIBLE"
        conseil = f"Il faut minimum {note_min:.1f}/20 aux {prochains_devoirs} prochains devoir(s)"

    return {
        "success": True,
        "statut": statut,
        "note_minimale": note_min,
        "conseil": conseil,
        "moyenne_actuelle": moyenne_actuelle,
        "cible": cible,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LANCEMENT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
