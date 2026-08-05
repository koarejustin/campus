#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════════
  SCRIPT DE TEST - Calcul des Moyennes
  
  Utilisation :
  python3 test_moyennes.py
═══════════════════════════════════════════════════════════════════════════════
"""

import json
import sys
sys.path.insert(0, 'services')

from moteur_moyennes_bf import calculer_donnees_courbe, MoteurMoyennesBF

def test_calcul_simple():
    """Test simple du moteur"""
    print("=" * 80)
    print("TEST 1 : Calcul Simple - SECONDE GENERALE")
    print("=" * 80)

    notes_test = [
        # Français
        {'note': 14, 'matiere': 'Français', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-05'},
        {'note': 16, 'matiere': 'Français', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-15'},
        
        # Mathématiques
        {'note': 15, 'matiere': 'Mathématiques', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-08'},
        {'note': 13, 'matiere': 'Mathématiques', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-18'},
        {'note': 14, 'matiere': 'Mathématiques', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-28'},
        
        # Anglais
        {'note': 12, 'matiere': 'Anglais', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-10'},
        {'note': 13, 'matiere': 'Anglais', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-20'},
        
        # Histoire-Géographie
        {'note': 17, 'matiere': 'Histoire-Géographie', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-12'},
        {'note': 15, 'matiere': 'Histoire-Géographie', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-22'},
        
        # SVT
        {'note': 11, 'matiere': 'Sciences de la Vie et de la Terre (SVT)', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-09'},
        {'note': 12, 'matiere': 'Sciences de la Vie et de la Terre (SVT)', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-19'},
        
        # Physique-Chimie
        {'note': 10, 'matiere': 'Physique-Chimie', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-06'},
        {'note': 11, 'matiere': 'Physique-Chimie', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-16'},
        
        # EPS
        {'note': 18, 'matiere': 'Éducation Physique et Sportive (EPS)', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-11'},
        
        # ECM
        {'note': 14, 'matiere': 'Éducation Civique et Morale (ECM)', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-07'},
    ]

    resultat = calculer_donnees_courbe('eleve-test-001', 'SECONDE', 'GENERALE', notes_test)

    print(f"\n📊 RÉSULTAT :")
    print(f"  Moyenne Générale : {resultat['moyenne_generale']['moyenne_generale']:.2f}/20")
    print(f"  Appréciation : {resultat['moyenne_generale']['appreciation']}")
    print(f"  Somme coeffs : {resultat['moyenne_generale']['somme_coefs']}")

    print(f"\n📚 DÉTAILS PAR MATIÈRE :")
    for matiere, detail in resultat['details_matieres'].items():
        print(f"  {matiere:40} : {detail['moyenne']:5.2f}/20 × {detail['coefficient']} = {detail['ponderation']:6.2f}")

    print(f"\n📈 ÉVOLUTION :")
    print(f"  Tendance : {resultat['evolution']['tendance']}")
    print(f"  Première moyenne : {resultat['evolution']['premiere_moyenne']:.2f}")
    print(f"  Dernière moyenne : {resultat['evolution']['derniere_moyenne']:.2f}")

    print(f"\n🔮 PRÉDICTIONS (2 prochains devoirs) :")
    print(f"  Pour 10/20 : {resultat['predictions']['pour_avoir_10']:.2f}/20")
    print(f"  Pour 12/20 : {resultat['predictions']['pour_avoir_12']:.2f}/20")
    print(f"  Pour 14/20 : {resultat['predictions']['pour_avoir_14']:.2f}/20")
    print(f"  Pour maintenir : {resultat['predictions']['pour_maintenir']:.2f}/20")

    if resultat['alertes']:
        print(f"\n⚠️  ALERTES :")
        for alerte in resultat['alertes']:
            print(f"  [{alerte['severite']}] {alerte['message']}")
    else:
        print("\n✅ Aucune alerte")

    print("\n" + "=" * 80)


def test_série_a4():
    """Test pour série A4 (Terminale Littéraire)"""
    print("\n" + "=" * 80)
    print("TEST 2 : Terminale Série A4 (Littéraire)")
    print("=" * 80)

    notes_test = [
        # Français (coeff 5)
        {'note': 18, 'matiere': 'Français', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-05'},
        {'note': 17, 'matiere': 'Français', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-15'},
        
        # Philosophie (coeff 4)
        {'note': 16, 'matiere': 'Philosophie', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-08'},
        {'note': 15, 'matiere': 'Philosophie', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-18'},
        
        # Anglais (coeff 4)
        {'note': 14, 'matiere': 'Anglais', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-10'},
        {'note': 13, 'matiere': 'Anglais', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-20'},
        
        # Littérature (coeff 4)
        {'note': 17, 'matiere': 'Littérature Générale', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-12'},
        {'note': 18, 'matiere': 'Littérature Générale', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-22'},
        
        # Mathématiques (coeff 2) - Faible
        {'note': 8, 'matiere': 'Mathématiques', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-09'},
        {'note': 9, 'matiere': 'Mathématiques', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-19'},
        
        # SVT (coeff 1)
        {'note': 10, 'matiere': 'Sciences de la Vie et de la Terre (SVT)', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-06'},
        
        # EPS (coeff 1)
        {'note': 16, 'matiere': 'Éducation Physique et Sportive (EPS)', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-11'},
    ]

    resultat = calculer_donnees_courbe('eleve-a4-001', 'TERMINALE', 'A4', notes_test)

    print(f"\n📊 RÉSULTAT :")
    print(f"  Moyenne Générale : {resultat['moyenne_generale']['moyenne_generale']:.2f}/20")
    print(f"  Appréciation : {resultat['moyenne_generale']['appreciation']}")

    print(f"\n📚 TOP MATIÈRES (Série A4) :")
    top_3 = sorted(resultat['details_matieres'].items(), 
                   key=lambda x: x[1]['moyenne'], reverse=True)[:3]
    for i, (matiere, detail) in enumerate(top_3, 1):
        print(f"  {i}. {matiere} : {detail['moyenne']:.2f}/20 (coeff {detail['coefficient']})")

    print("\n" + "=" * 80)


def test_série_d():
    """Test pour série D (Terminale SVT)"""
    print("\n" + "=" * 80)
    print("TEST 3 : Terminale Série D (Sciences Naturelles)")
    print("=" * 80)

    notes_test = [
        # Mathématiques (coeff 4)
        {'note': 16, 'matiere': 'Mathématiques', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-05'},
        {'note': 15, 'matiere': 'Mathématiques', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-15'},
        
        # Physique-Chimie (coeff 5)
        {'note': 17, 'matiere': 'Physique-Chimie', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-08'},
        {'note': 18, 'matiere': 'Physique-Chimie', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-18'},
        
        # SVT (coeff 5)
        {'note': 19, 'matiere': 'Sciences de la Vie et de la Terre (SVT)', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-10'},
        {'note': 20, 'matiere': 'Sciences de la Vie et de la Terre (SVT)', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-20'},
        
        # Français (coeff 2)
        {'note': 12, 'matiere': 'Français', 'type': 'DEVOIR', 'trimestre': 1, 'date': '2025-01-12'},
        {'note': 13, 'matiere': 'Français', 'type': 'COMPOSITION', 'trimestre': 1, 'date': '2025-01-22'},
    ]

    resultat = calculer_donnees_courbe('eleve-d-001', 'TERMINALE', 'D', notes_test)

    print(f"\n📊 RÉSULTAT :")
    print(f"  Moyenne Générale : {resultat['moyenne_generale']['moyenne_generale']:.2f}/20")
    print(f"  Appréciation : {resultat['moyenne_generale']['appreciation']}")
    print(f"  ⭐ EXCELLENT POUR SÉRIE D !")

    print("\n" + "=" * 80)


def test_prédictions():
    """Test du système de prédictions"""
    print("\n" + "=" * 80)
    print("TEST 4 : Analyse Prédictive")
    print("=" * 80)

    moteur = MoteurMoyennesBF()

    # Scénario 1 : Élève en difficulté
    print("\n📌 Scénario 1 : Élève avec moyenne 9/20")
    note = moteur.note_minimale_pour_cible(9.0, 18, 2, 12)
    print(f"  Note minimale pour 12/20 : {note:.2f}/20")

    # Scénario 2 : Élève excellent
    print("\n📌 Scénario 2 : Élève avec moyenne 17/20")
    note = moteur.note_minimale_pour_cible(17.0, 18, 2, 18)
    print(f"  Note minimale pour 18/20 : {note:.2f}/20")

    # Scénario 3 : Impossible
    print("\n📌 Scénario 3 : Impossible d'atteindre 20 avec moyenne 10")
    note = moteur.note_minimale_pour_cible(10.0, 18, 1, 20)
    print(f"  Note nécessaire : {note:.2f}/20 ❌ (impossible)")

    print("\n" + "=" * 80)


if __name__ == '__main__':
    print("\n")
    print("  ╔════════════════════════════════════════════════════════════════════════════════╗")
    print("  ║     TESTS - MOTEUR DE CALCUL DES MOYENNES - BURKINA FASO                      ║")
    print("  ╚════════════════════════════════════════════════════════════════════════════════╝")
    print()

    # Exécuter les tests
    test_calcul_simple()
    test_série_a4()
    test_série_d()
    test_prédictions()

    print("\n✅ Tous les tests sont terminés !\n")
