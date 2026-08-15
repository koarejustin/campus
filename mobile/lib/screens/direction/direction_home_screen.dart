import 'package:flutter/material.dart';
import '../../theme.dart';
import '../surveillant/surveillant_absences_screen.dart';
import 'direction_dashboard_screen.dart';
import 'direction_eleves_screen.dart';
import 'direction_plus_screen.dart';

class DirectionHomeScreen extends StatefulWidget {
  const DirectionHomeScreen({super.key});

  @override
  State<DirectionHomeScreen> createState() => _DirectionHomeScreenState();
}

class _DirectionHomeScreenState extends State<DirectionHomeScreen> {
  int _index = 0;
  void _goTo(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final screens = [
      DirectionDashboardScreen(onNavigate: _goTo),
      const DirectionElevesScreen(),
      const SurveillantAbsencesScreen(),
      const DirectionPlusScreen(),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _goTo,
        backgroundColor: Colors.white,
        indicatorColor: kDirectionGradient.colors.first.withValues(alpha: 0.14),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded, color: Color(0xFF1E293B)), label: 'Accueil'),
          NavigationDestination(icon: Icon(Icons.groups_outlined), selectedIcon: Icon(Icons.groups_rounded, color: Color(0xFF1E293B)), label: 'Élèves'),
          NavigationDestination(icon: Icon(Icons.event_busy_outlined), selectedIcon: Icon(Icons.event_busy_rounded, color: Color(0xFF1E293B)), label: 'Absences'),
          NavigationDestination(icon: Icon(Icons.apps_rounded), selectedIcon: Icon(Icons.apps_rounded, color: Color(0xFF1E293B)), label: 'Plus'),
        ],
      ),
    );
  }
}
