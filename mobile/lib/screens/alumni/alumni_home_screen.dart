import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import 'alumni_dashboard_screen.dart';
import 'alumni_mentorats_screen.dart';
import 'alumni_demandes_screen.dart';
import 'alumni_journal_screen.dart';
import 'alumni_profil_screen.dart';

class AlumniHomeScreen extends StatefulWidget {
  const AlumniHomeScreen({super.key});

  @override
  State<AlumniHomeScreen> createState() => _AlumniHomeScreenState();
}

class _AlumniHomeScreenState extends State<AlumniHomeScreen> {
  int _index = 0;
  int _demandesCount = 0;

  void _goTo(int i) => setState(() => _index = i);

  @override
  void initState() {
    super.initState();
    _loadBadge();
  }

  Future<void> _loadBadge() async {
    try {
      final data = await ApiClient.instance.get('/mentorat/demandes');
      if (mounted) setState(() => _demandesCount = (data['demandes'] as List? ?? []).length);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      AlumniDashboardScreen(onNavigate: _goTo),
      const AlumniMentoratsScreen(),
      AlumniDemandesScreen(onChanged: _loadBadge),
      const AlumniJournalScreen(),
      const AlumniProfilScreen(),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) { _goTo(i); if (i == 2) _loadBadge(); },
        backgroundColor: Colors.white,
        indicatorColor: kAlumniGradient.colors.first.withValues(alpha: 0.14),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded, color: Color(0xFFF59E0B)), label: 'Accueil'),
          const NavigationDestination(icon: Icon(Icons.groups_outlined), selectedIcon: Icon(Icons.groups_rounded, color: Color(0xFFF59E0B)), label: 'Mentorats'),
          NavigationDestination(
            icon: _demandesCount > 0 ? Badge(label: Text('$_demandesCount'), child: const Icon(Icons.inbox_outlined)) : const Icon(Icons.inbox_outlined),
            selectedIcon: const Icon(Icons.inbox_rounded, color: Color(0xFFF59E0B)),
            label: 'Demandes',
          ),
          const NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book_rounded, color: Color(0xFFF59E0B)), label: 'Journal'),
          const NavigationDestination(icon: Icon(Icons.person_outline_rounded), selectedIcon: Icon(Icons.person_rounded, color: Color(0xFFF59E0B)), label: 'Profil'),
        ],
      ),
    );
  }
}
