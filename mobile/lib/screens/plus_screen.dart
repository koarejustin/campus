import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme.dart';
import 'professeurs_screen.dart';
import 'ressources_screen.dart';
import 'forum_screen.dart';
import 'convocations_screen.dart';
import 'copies_screen.dart';
import 'compositions_screen.dart';
import 'horaire_screen.dart';
import 'annonces_screen.dart';
import 'statistiques_screen.dart';
import 'profil_screen.dart';

class _PlusItem {
  final String label;
  final IconData icon;
  final Color color;
  final WidgetBuilder builder;
  const _PlusItem(this.label, this.icon, this.color, this.builder);
}

class PlusScreen extends StatelessWidget {
  const PlusScreen({super.key});

  static final _items = <_PlusItem>[
    _PlusItem('Mes professeurs', Icons.people_alt_rounded, kIndigo, (_) => const ProfesseursScreen()),
    _PlusItem('Ressources', Icons.folder_copy_rounded, kIndigo, (_) => const RessourcesScreen()),
    _PlusItem('Forum', Icons.forum_rounded, kIndigo, (_) => const ForumScreen()),
    _PlusItem('Convocations', Icons.event_available_rounded, kAmber, (_) => const ConvocationsScreen()),
    _PlusItem('Copies scannées', Icons.document_scanner_rounded, kIndigo, (_) => const CopiesScreen()),
    _PlusItem('Compositions', Icons.edit_note_rounded, kIndigo, (_) => const CompositionsScreen()),
    _PlusItem('Emploi du temps', Icons.calendar_month_rounded, kIndigo, (_) => const HoraireScreen()),
    _PlusItem('Annonces', Icons.campaign_rounded, kRed, (_) => const AnnoncesScreen()),
    _PlusItem('Statistiques avancées', Icons.insights_rounded, kGreen, (_) => const StatistiquesScreen()),
    _PlusItem('Mon profil', Icons.person_rounded, kIndigo, (_) => const ProfilScreen()),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plus')),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.25,
        ),
        itemCount: _items.length,
        itemBuilder: (context, i) {
          final item = _items[i];
          return Card(
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: item.builder)),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 42, height: 42,
                      decoration: BoxDecoration(color: item.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                      alignment: Alignment.center,
                      child: Icon(item.icon, color: item.color, size: 22),
                    ),
                    const SizedBox(height: 12),
                    Text(item.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: kTextDark)),
                  ],
                ),
              ),
            ),
          ).animate().fadeIn(delay: (i * 50).ms, duration: 260.ms).scale(begin: const Offset(0.9, 0.9), end: const Offset(1, 1), curve: Curves.easeOutCubic);
        },
      ),
    );
  }
}
