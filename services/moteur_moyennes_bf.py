#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════════
  MOTEUR DE CALCUL DES MOYENNES - Système Éducatif Burkina Faso
  
  Ce module gère le calcul avancé des moyennes selon :
  - Les coefficients par classe et série
  - Les types de notes (évaluations continues vs compositions)
  - Le barème officiel (sur 20)
  - L'évolution historique et courbes prédictives
═══════════════════════════════════════════════════════════════════════════════
"""

import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import statistics


@dataclass
class Note:
    """Représente une note d'évaluation"""
    valeur: float
    matiere: str
    type_eval: str  # 'DEVOIR' ou 'COMPOSITION'
    trimestre: int
    date: str
    coefficient: float = 1.0


@dataclass
class MoyenneMatiere:
    """Résultat du calcul de moyenne par matière"""
    matiere: str
    moyenne: float
    notes: List[float]
    coefficient: float
    total_pondere: float


class MoteurMoyennesBF:
    """
    Moteur de calcul des moyennes conforme au système éducatif burkkinabé
    """

    # Configurations des coefficients par classe et série
    COEFFICIENTS = {
        'SIXIEME': {
            'GENERAL': {
                'Français': 3, 'Anglais': 2, 'Mathématiques': 3,
                'Histoire-Géographie': 2, 'Sciences de la Vie et de la Terre (SVT)': 2,
                'Physique-Chimie': 2, 'Éducation Physique et Sportive (EPS)': 1,
                'Éducation Civique et Morale (ECM)': 1
            }
        },
        'CINQUIEME': {
            'GENERAL': {
                'Français': 3, 'Anglais': 2, 'Allemand': 1, 'Mathématiques': 3,
                'Histoire-Géographie': 2, 'Sciences de la Vie et de la Terre (SVT)': 2,
                'Physique-Chimie': 2, 'Éducation Physique et Sportive (EPS)': 1,
                'Éducation Civique et Morale (ECM)': 1
            }
        },
        'QUATRIEME': {
            'GENERAL': {
                'Français': 3, 'Anglais': 2, 'Allemand': 1, 'Mathématiques': 3,
                'Histoire-Géographie': 2, 'Sciences de la Vie et de la Terre (SVT)': 2,
                'Physique-Chimie': 2, 'Éducation Physique et Sportive (EPS)': 1,
                'Éducation Civique et Morale (ECM)': 1
            }
        },
        'TROISIEME': {
            'GENERAL': {
                'Français': 4, 'Anglais': 3, 'Allemand': 2, 'Mathématiques': 4,
                'Histoire-Géographie': 3, 'Sciences de la Vie et de la Terre (SVT)': 3,
                'Physique-Chimie': 3, 'Éducation Physique et Sportive (EPS)': 1,
                'Éducation Civique et Morale (ECM)': 2
            }
        },
        'SECONDE': {
            'GENERALE': {
                'Français': 3, 'Anglais': 2, 'Allemand': 1, 'Espagnol': 1,
                'Mathématiques': 3, 'Histoire-Géographie': 2,
                'Sciences de la Vie et de la Terre (SVT)': 2, 'Physique-Chimie': 2,
                'Éducation Physique et Sportive (EPS)': 1,
                'Éducation Civique et Morale (ECM)': 1, 'Informatique / TIC': 2
            }
        },
        'PREMIERE': {
            'A4': {
                'Français': 5, 'Philosophie': 4, 'Anglais': 4, 'Allemand': 3,
                'Espagnol': 3, 'Littérature Générale': 4, 'Histoire-Géographie': 3,
                'Mathématiques': 2, 'Sciences de la Vie et de la Terre (SVT)': 1,
                'Éducation Physique et Sportive (EPS)': 1, 'Éducation Civique et Morale (ECM)': 1
            },
            'D': {
                'Français': 2, 'Philosophie': 2, 'Anglais': 2, 'Mathématiques': 4,
                'Physique-Chimie': 5, 'Sciences de la Vie et de la Terre (SVT)': 5,
                'Histoire-Géographie': 1, 'Éducation Physique et Sportive (EPS)': 1,
                'Éducation Civique et Morale (ECM)': 1
            },
            'C': {
                'Français': 2, 'Philosophie': 2, 'Anglais': 2, 'Mathématiques': 5,
                'Physique-Chimie': 5, 'Sciences de la Vie et de la Terre (SVT)': 4,
                'Sciences de l\'Ingénieur': 4, 'Histoire-Géographie': 1,
                'Éducation Physique et Sportive (EPS)': 1, 'Éducation Civique et Morale (ECM)': 1
            }
        },
        'TERMINALE': {
            'A4': {
                'Français': 5, 'Philosophie': 4, 'Anglais': 4, 'Allemand': 3,
                'Espagnol': 3, 'Littérature Générale': 4, 'Histoire-Géographie': 3,
                'Mathématiques': 2, 'Sciences de la Vie et de la Terre (SVT)': 1,
                'Éducation Physique et Sportive (EPS)': 1, 'Éducation Civique et Morale (ECM)': 1
            },
            'D': {
                'Français': 2, 'Philosophie': 2, 'Anglais': 2, 'Mathématiques': 4,
                'Physique-Chimie': 5, 'Sciences de la Vie et de la Terre (SVT)': 5,
                'Histoire-Géographie': 1, 'Éducation Physique et Sportive (EPS)': 1,
                'Éducation Civique et Morale (ECM)': 1
            },
            'C': {
                'Français': 2, 'Philosophie': 2, 'Anglais': 2, 'Mathématiques': 5,
                'Physique-Chimie': 5, 'Sciences de la Vie et de la Terre (SVT)': 4,
                'Sciences de l\'Ingénieur': 4, 'Histoire-Géographie': 1,
                'Éducation Physique et Sportive (EPS)': 1, 'Éducation Civique et Morale (ECM)': 1
            }
        }
    }

    def __init__(self):
        """Initialisation du moteur"""
        self.dernier_calcul = None
        self.alertes = []

    def calculer_moyenne_matiere(
        self, 
        notes_brutes: List[float], 
        type_eval: str = 'DEVOIR'
    ) -> float:
        """
        Calcule la moyenne pondérée pour une matière.
        
        Prise en compte du type d'évaluation :
        - DEVOIR : moyenne arithmétique simple
        - COMPOSITION : poids augmenté (80% composition, 20% devoirs)
        
        Args:
            notes_brutes: Liste des notes brutes (0-20)
            type_eval: Type d'évaluation ('DEVOIR' ou 'COMPOSITION')
            
        Returns:
            Moyenne pondérée (0-20)
        """
        if not notes_brutes:
            return 0.0

        # Séparer les notes par type
        compositions = [n for n, t in notes_brutes if t == 'COMPOSITION']
        devoirs = [n for n, t in notes_brutes if t == 'DEVOIR']

        if compositions and devoirs:
            # Formule pondérée officielle BF : 60% composition + 40% devoirs
            moy_comp = statistics.mean(compositions)
            moy_dev = statistics.mean(devoirs)
            return round((moy_comp * 0.6) + (moy_dev * 0.4), 2)
        elif compositions:
            return round(statistics.mean(compositions), 2)
        else:
            return round(statistics.mean(notes_brutes), 2) if notes_brutes else 0.0

    def calculer_moyenne_generale(
        self,
        classe: str,
        serie: str,
        notes_par_matiere: Dict[str, List[Tuple[float, str]]]
    ) -> Dict:
        """
        Calcule la moyenne générale de l'élève.
        
        Args:
            classe: Classe (SIXIEME, CINQUIEME, ..., TERMINALE)
            serie: Série (GENERAL, A4, D, C, etc.)
            notes_par_matiere: Dict {nom_matiere: [(valeur, type), ...]}
            
        Returns:
            Dict avec moyenne_generale, details, alertes
        """
        if classe not in self.COEFFICIENTS:
            return {'erreur': f'Classe {classe} non reconnue'}

        if serie not in self.COEFFICIENTS[classe]:
            # Chercher la série par défaut
            serie = list(self.COEFFICIENTS[classe].keys())[0]

        coeffs_classe = self.COEFFICIENTS[classe][serie]
        details = {}
        somme_pondere = 0.0
        somme_coefs = 0.0

        # Calculer moyenne pour chaque matière
        for matiere, notes in notes_par_matiere.items():
            if matiere not in coeffs_classe:
                continue

            moyenne_m = self.calculer_moyenne_matiere(notes)
            coeff = coeffs_classe[matiere]

            details[matiere] = {
                'moyenne': moyenne_m,
                'coefficient': coeff,
                'ponderation': moyenne_m * coeff,
                'nombre_notes': len(notes)
            }

            somme_pondere += moyenne_m * coeff
            somme_coefs += coeff

        # Moyenne générale
        moyenne_generale = round(somme_pondere / somme_coefs, 2) if somme_coefs > 0 else 0.0

        self.dernier_calcul = {
            'classe': classe,
            'serie': serie,
            'moyenne_generale': moyenne_generale,
            'details': details,
            'somme_coefs': somme_coefs,
            'timestamp': datetime.now().isoformat()
        }

        return {
            'success': True,
            'moyenne_generale': moyenne_generale,
            'appréciation': self._generer_appreciation(moyenne_generale),
            'details': details,
            'somme_coefs': somme_coefs
        }

    def calculer_evolution(
        self,
        notes_chronologiques: List[Dict]
    ) -> Dict:
        """
        Analyse l'évolution des moyennes dans le temps.
        
        Args:
            notes_chronologiques: Liste ordonnée {note, date, matiere, trimestre}
            
        Returns:
            Dict avec evolution_trimestrielle, tendance, regression
        """
        if not notes_chronologiques:
            return {'evolution': [], 'tendance': 'STABLE'}

        # Grouper par trimestre
        par_trimestre = {}
        for n in notes_chronologiques:
            t = n.get('trimestre', 1)
            if t not in par_trimestre:
                par_trimestre[t] = []
            par_trimestre[t].append(n['note'])

        # Calculer moyennes trimestrielles
        evolution = []
        moyennes = []
        for t in sorted(par_trimestre.keys()):
            moy_t = round(statistics.mean(par_trimestre[t]), 2)
            moyennes.append(moy_t)
            evolution.append({'trimestre': t, 'moyenne': moy_t, 'count': len(par_trimestre[t])})

        # Déterminer tendance
        if len(moyennes) >= 2:
            diff = moyennes[-1] - moyennes[0]
            if diff > 1:
                tendance = 'HAUSSE'
            elif diff < -1:
                tendance = 'BAISSE'
            else:
                tendance = 'STABLE'
        else:
            tendance = 'INSUFFISANT'

        return {
            'evolution': evolution,
            'tendance': tendance,
            'premiere_moyenne': moyennes[0] if moyennes else None,
            'derniere_moyenne': moyennes[-1] if moyennes else None
        }

    def note_minimale_pour_cible(
        self,
        moyenne_actuelle: float,
        somme_coefs: float,
        prochains_devoirs: int,
        cible: float
    ) -> float:
        """
        Calcule la note minimale nécessaire aux prochains devoirs pour atteindre une cible.
        
        Args:
            moyenne_actuelle: Moyenne générale actuelle
            somme_coefs: Somme des coefficients utilisés
            prochains_devoirs: Nombre de devoirs à venir (avec coefficient moyen 1)
            cible: Cible de moyenne souhaitée
            
        Returns:
            Note minimale (0-20) ou -1 si impossible
        """
        if somme_coefs == 0:
            return -1

        # Formule : (cible * (coefs + n_devoirs) - moyenne_actuelle * coefs) / n_devoirs
        numerateur = (cible * (somme_coefs + prochains_devoirs)) - (moyenne_actuelle * somme_coefs)
        note_min = numerateur / prochains_devoirs

        # Vérifier si c'est possible
        if note_min > 20:
            return 20.01  # Impossible (> 20)
        if note_min < 0:
            return 0.0  # Possible avec 0

        return round(note_min, 2)

    def detecter_baisses(self, evolution: Dict) -> List[Dict]:
        """
        Détecte les baisses de régime et génère des alertes.
        
        Returns:
            Liste d'alertes avec severite et message
        """
        alertes = []
        
        if evolution.get('tendance') == 'BAISSE':
            derniere = evolution.get('derniere_moyenne', 0)
            premiere = evolution.get('premiere_moyenne', 0)
            diff = premiere - derniere

            if diff > 3:
                alertes.append({
                    'severite': 'CRITIQUE',
                    'message': f'Baisse significative de {diff:.1f} points',
                    'type': 'BAISSE_GENERALE'
                })
            else:
                alertes.append({
                    'severite': 'AVERTISSEMENT',
                    'message': f'Baisse de {diff:.1f} points observée',
                    'type': 'BAISSE_LEGERE'
                })

        return alertes

    def _generer_appreciation(self, moyenne: float) -> str:
        """Génère une appréciation qualitative de la moyenne"""
        if moyenne >= 18:
            return 'Excellent'
        elif moyenne >= 15:
            return 'Très Bon'
        elif moyenne >= 12:
            return 'Bon'
        elif moyenne >= 10:
            return 'Satisfaisant'
        elif moyenne >= 8:
            return 'Passable'
        else:
            return 'Insuffisant'


# ═══════════════════════════════════════════════════════════════════════════════
# FONCTION PRINCIPALE POUR FASTAPI
# ═══════════════════════════════════════════════════════════════════════════════

def calculer_donnees_courbe(id_eleve: str, classe: str, serie: str, notes_brutes: List[Dict]) -> Dict:
    """
    Calcule toutes les données nécessaires pour la courbe interactive.
    
    Format notes_brutes :
    [
        {"note": 15.5, "matiere": "Français", "type": "DEVOIR", "trimestre": 1, "date": "2025-01-15"},
        ...
    ]
    
    Returns:
        Dict complet pour le frontend
    """
    moteur = MoteurMoyennesBF()

    # Transformer les données
    notes_par_matiere = {}
    for n in notes_brutes:
        mat = n['matiere']
        if mat not in notes_par_matiere:
            notes_par_matiere[mat] = []
        notes_par_matiere[mat].append((n['note'], n['type']))

    # Calculs
    resultat_moy = moteur.calculer_moyenne_generale(classe, serie, notes_par_matiere)
    evolution = moteur.calculer_evolution(notes_brutes)
    alertes = moteur.detecter_baisses(evolution)

    # Prédictions
    mg = resultat_moy.get('moyenne_generale', 0)
    coefs = resultat_moy.get('somme_coefs', 0)
    predictions = {
        'pour_avoir_10': moteur.note_minimale_pour_cible(mg, coefs, 2, 10),
        'pour_avoir_12': moteur.note_minimale_pour_cible(mg, coefs, 2, 12),
        'pour_avoir_14': moteur.note_minimale_pour_cible(mg, coefs, 2, 14),
        'pour_maintenir': moteur.note_minimale_pour_cible(mg, coefs, 2, mg) if mg > 0 else None
    }

    # Courbe chronologique
    courbe = [
        {
            'index': i + 1,
            'note': n['note'],
            'matiere': n['matiere'],
            'type': n['type'],
            'date': n['date']
        }
        for i, n in enumerate(sorted(notes_brutes, key=lambda x: x['date']))
    ]

    return {
        'id_eleve': id_eleve,
        'classe': classe,
        'serie': serie,
        'moyenne_generale': resultat_moy,
        'evolution': evolution,
        'predictions': predictions,
        'alertes': alertes,
        'courbe_chronologique': courbe,
        'details_matieres': resultat_moy.get('details', {}),
        'timestamp': datetime.now().isoformat()
    }


if __name__ == '__main__':
    # Test local
    test_notes = [
        {'note': 16, 'matiere': 'Français', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-10'},
        {'note': 14, 'matiere': 'Français', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-20'},
        {'note': 15, 'matiere': 'Mathématiques', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-15'},
        {'note': 13, 'matiere': 'Mathématiques', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-25'},
        {'note': 17, 'matiere': 'Mathématiques', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-02-05'},
    ]

    resultat = calculer_donnees_courbe('eleve123', 'SECONDE', 'GENERALE', test_notes)
    print(json.dumps(resultat, indent=2, ensure_ascii=False))
