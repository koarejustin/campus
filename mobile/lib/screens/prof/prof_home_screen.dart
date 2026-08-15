import 'package:flutter/material.dart';
import '../../theme.dart';
import 'prof_dashboard_screen.dart';
import 'notes_screen.dart';
import 'cahier_texte_screen.dart';
import 'prof_devoirs_screen.dart';
import 'prof_plus_screen.dart';

class ProfHomeScreen extends StatefulWidget {
  const ProfHomeScreen({super.key});

  @override
  State<ProfHomeScreen> createState() => _ProfHomeScreenState();
}

class _ProfHomeScreenState extends State<ProfHomeScreen> {
  int _index = 0;

  void _goTo(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final screens = [
      ProfDashboardScreen(onNavigate: _goTo),
      const NotesScreen(),
      const CahierTexteScreen(),
      const ProfDevoirsScreen(),
      const ProfPlusScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _goTo,
        backgroundColor: Colors.white,
        indicatorColor: kGreen.withValues(alpha: 0.14),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded, color: kGreen), label: 'Accueil'),
          NavigationDestination(icon: Icon(Icons.grade_outlined), selectedIcon: Icon(Icons.grade_rounded, color: kGreen), label: 'Notes'),
          NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book_rounded, color: kGreen), label: 'Cahier'),
          NavigationDestination(icon: Icon(Icons.assignment_outlined), selectedIcon: Icon(Icons.assignment_rounded, color: kGreen), label: 'Devoirs'),
          NavigationDestination(icon: Icon(Icons.apps_rounded), selectedIcon: Icon(Icons.apps_rounded, color: kGreen), label: 'Plus'),
        ],
      ),
    );
  }
}
