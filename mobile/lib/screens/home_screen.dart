import 'package:flutter/material.dart';
import '../theme.dart';
import 'dashboard_screen.dart';
import 'bulletin_screen.dart';
import 'absences_screen.dart';
import 'devoirs_screen.dart';
import 'plus_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  void _goTo(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(onNavigate: _goTo),
      const BulletinScreen(),
      const AbsencesScreen(),
      const DevoirsScreen(),
      const PlusScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _goTo,
        backgroundColor: Colors.white,
        indicatorColor: kIndigo.withValues(alpha: 0.12),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded, color: kIndigo), label: 'Accueil'),
          NavigationDestination(icon: Icon(Icons.grade_outlined), selectedIcon: Icon(Icons.grade_rounded, color: kIndigo), label: 'Bulletin'),
          NavigationDestination(icon: Icon(Icons.event_busy_outlined), selectedIcon: Icon(Icons.event_busy_rounded, color: kIndigo), label: 'Absences'),
          NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book_rounded, color: kIndigo), label: 'Devoirs'),
          NavigationDestination(icon: Icon(Icons.apps_rounded), selectedIcon: Icon(Icons.apps_rounded, color: kIndigo), label: 'Plus'),
        ],
      ),
    );
  }
}
