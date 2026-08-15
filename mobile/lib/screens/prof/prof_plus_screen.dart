import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme.dart';
import 'prof_ressources_screen.dart';
import 'prof_annonces_screen.dart';
import 'prof_copies_screen.dart';
import 'prof_profil_screen.dart';

class _PlusItem {
  final String label;
  final IconData icon;
  final Color color;
  final WidgetBuilder builder;
  const _PlusItem(this.label, this.icon, this.color, this.builder);
}

class ProfPlusScreen extends StatelessWidget {
  const ProfPlusScreen({super.key});

  static final _items = <_PlusItem>[
    _PlusItem('Ressources', Icons.folder_copy_rounded, kGreen, (_) => const ProfRessourcesScreen()),
    _PlusItem('Annonces', Icons.campaign_rounded, kRed, (_) => const ProfAnnoncesScreen()),
    _PlusItem('Copies envoyées', Icons.document_scanner_rounded, kIndigo, (_) => const ProfCopiesScreen()),
    _PlusItem('Mon profil', Icons.person_rounded, kGreen, (_) => const ProfProfilScreen()),
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
