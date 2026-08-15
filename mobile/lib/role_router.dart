import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/prof/prof_home_screen.dart';
import 'screens/parent/parent_home_screen.dart';
import 'screens/alumni/alumni_home_screen.dart';
import 'screens/direction/direction_home_screen.dart';

/// Point unique de routage "rôle → écran d'accueil" — utilisé au démarrage
/// (session déjà enregistrée) et juste après une connexion réussie.
///
/// Comme sur le web (direction.html sert à la fois DIRECTION et
/// SURVEILLANT — voir login.html `pageForRole`), les deux rôles partagent
/// la même appli mobile ; c'est DirectionHomeScreen qui adapte l'interface
/// selon le rôle (sections Direction verrouillées pour un Surveillant).
Widget homeScreenFor(String? role) {
  switch (role) {
    case 'PROFESSEUR':
      return const ProfHomeScreen();
    case 'PARENT':
      return const ParentHomeScreen();
    case 'SURVEILLANT':
    case 'DIRECTION':
      return const DirectionHomeScreen();
    case 'ALUMNI':
      return const AlumniHomeScreen();
    default:
      return const HomeScreen();
  }
}
