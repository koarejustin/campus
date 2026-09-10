import 'package:flutter/material.dart';

// Palette "Arbre à Palabres" — mêmes couleurs que la version web (vert
// feuillage/or/ivoire, remplaçant le dégradé indigo→violet générique)
// pour que l'appli mobile reste cohérente avec ce que les élèves
// connaissent déjà. Les noms de constantes (kIndigo, kViolet...) sont
// restés tels quels pour ne pas casser toutes les références existantes.
const Color kIndigo = Color(0xFF2F6B3F);
const Color kViolet = Color(0xFF1F4A2C);
const Color kBg = Color(0xFFFAF4E8);
const Color kTextDark = Color(0xFF1E2818);
const Color kTextGray = Color(0xFF6B5D42);
const Color kBorder = Color(0xFFDCD3B8);
const Color kGreen = Color(0xFF587530);
const Color kRed = Color(0xFFC0392B);
const Color kAmber = Color(0xFFC9932A);

const LinearGradient kBrandGradient = LinearGradient(
  colors: [kIndigo, kViolet],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Même dégradé que celui déjà utilisé pour les avatars "professeur" côté
// web (eleve.html) — sert d'identité visuelle propre à l'espace Prof pour
// qu'on le distingue de l'espace Élève au premier coup d'œil.
const LinearGradient kProfGradient = LinearGradient(
  colors: [Color(0xFF6B8E3D), Color(0xFF587530)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Identité visuelle Parent — terre cuite chaleureuse (famille/foyer),
// distincte de l'or Alumni et du vert feuillage Élève/Direction.
const LinearGradient kParentGradient = LinearGradient(
  colors: [Color(0xFFB5502F), Color(0xFF7A3320)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Identité APE (au sein de l'espace Parent) — même famille de teintes que
// Parent mais différenciée pour qu'on sache qu'on a changé d'espace.
const LinearGradient kApeGradient = LinearGradient(
  colors: [Color(0xFF9C4A3D), Color(0xFF7A2E22)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Identité Surveillant — pierre/sauge, sérieux et discret (vigilance),
// sans rompre avec la palette terre du reste de l'appli.
const LinearGradient kSurveillantGradient = LinearGradient(
  colors: [Color(0xFF6B7A5C), Color(0xFF4A5540)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Identité Direction — même dégradé de marque principal mais plus sombre,
// pour signaler "espace admin" tout en restant dans la même famille.
const LinearGradient kDirectionGradient = LinearGradient(
  colors: [Color(0xFF23301C), Color(0xFF1E2818)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Identité Alumni — ambre/or, distinct, évoque "diplôme/réussite".
const LinearGradient kAlumniGradient = LinearGradient(
  colors: [Color(0xFFC9932A), Color(0xFF8A6118)],
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
