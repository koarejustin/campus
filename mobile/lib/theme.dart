import 'package:flutter/material.dart';

// Mêmes couleurs que la version web (dégradé indigo → violet utilisé
// partout dans frontend/*.html) pour que l'appli mobile reste cohérente
// avec ce que les élèves connaissent déjà.
const Color kIndigo = Color(0xFF4F46E5);
const Color kViolet = Color(0xFF7C3AED);
const Color kBg = Color(0xFFF8FAFF);
const Color kTextDark = Color(0xFF0F172A);
const Color kTextGray = Color(0xFF64748B);
const Color kBorder = Color(0xFFE2E8F0);
const Color kGreen = Color(0xFF059669);
const Color kRed = Color(0xFFEF4444);
const Color kAmber = Color(0xFFF59E0B);

const LinearGradient kBrandGradient = LinearGradient(
  colors: [kIndigo, kViolet],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Même dégradé que celui déjà utilisé pour les avatars "professeur" côté
// web (eleve.html) — sert d'identité visuelle propre à l'espace Prof pour
// qu'on le distingue de l'espace Élève au premier coup d'œil.
const LinearGradient kProfGradient = LinearGradient(
  colors: [Color(0xFF10B981), Color(0xFF059669)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Identité visuelle Parent — chaleureux (famille), distinct des espaces
// Élève (indigo) et Professeur (vert).
const LinearGradient kParentGradient = LinearGradient(
  colors: [Color(0xFFF59E0B), Color(0xFFEA580C)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Identité APE (au sein de l'espace Parent) — même famille de teintes que
// Parent mais différenciée pour qu'on sache qu'on a changé d'espace.
const LinearGradient kApeGradient = LinearGradient(
  colors: [Color(0xFFDB2777), Color(0xFFBE185D)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Identité Surveillant — bleu ardoise, sérieux/sécurité.
const LinearGradient kSurveillantGradient = LinearGradient(
  colors: [Color(0xFF0EA5E9), Color(0xFF0369A1)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Identité Direction — même dégradé de marque principal mais plus sombre,
// pour signaler "espace admin" tout en restant dans la même famille.
const LinearGradient kDirectionGradient = LinearGradient(
  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Identité Alumni — ambre/or, distinct, évoque "diplôme/réussite".
const LinearGradient kAlumniGradient = LinearGradient(
  colors: [Color(0xFFF59E0B), Color(0xFFB45309)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: kBg,
    colorScheme: ColorScheme.fromSeed(seedColor: kIndigo),
    fontFamily: 'Roboto',
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: kTextDark,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: kBorder),
      ),
    ),
  );
}
