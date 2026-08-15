import 'package:flutter/material.dart';
import '../../theme.dart';
import 'parent_state.dart';
import 'parent_dashboard_screen.dart';
import 'parent_bulletin_screen.dart';
import 'parent_absences_screen.dart';
import 'parent_convocations_screen.dart';
import 'parent_plus_screen.dart';

class ParentHomeScreen extends StatefulWidget {
  const ParentHomeScreen({super.key});

  @override
  State<ParentHomeScreen> createState() => _ParentHomeScreenState();
}

class _ParentHomeScreenState extends State<ParentHomeScreen> {
  int _index = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    ParentState.instance.load().then((_) {
      if (mounted) setState(() => _loading = false);
    });
  }

  void _goTo(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final screens = [
      ParentDashboardScreen(onNavigate: _goTo),
      const ParentBulletinScreen(),
      const ParentAbsencesScreen(),
      const ParentConvocationsScreen(),
      const ParentPlusScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _goTo,
        backgroundColor: Colors.white,
        indicatorColor: kParentGradient.colors.first.withValues(alpha: 0.14),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded, color: Color(0xFFF59E0B)), label: 'Accueil'),
          const NavigationDestination(icon: Icon(Icons.grade_outlined), selectedIcon: Icon(Icons.grade_rounded, color: Color(0xFFF59E0B)), label: 'Bulletin'),
          const NavigationDestination(icon: Icon(Icons.event_busy_outlined), selectedIcon: Icon(Icons.event_busy_rounded, color: Color(0xFFF59E0B)), label: 'Absences'),
          const NavigationDestination(icon: Icon(Icons.mail_outline_rounded), selectedIcon: Icon(Icons.mail_rounded, color: Color(0xFFF59E0B)), label: 'Convoc.'),
          const NavigationDestination(icon: Icon(Icons.apps_rounded), selectedIcon: Icon(Icons.apps_rounded, color: Color(0xFFF59E0B)), label: 'Plus'),
        ],
      ),
    );
  }
}
