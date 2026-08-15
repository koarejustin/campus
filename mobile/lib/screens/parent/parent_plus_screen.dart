import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme.dart';
import 'parent_cotisations_screen.dart';
import 'parent_annonces_screen.dart';
import 'parent_profil_screen.dart';
import 'ape/ape_home_screen.dart';

class _PlusItem {
  final String label;
  final IconData icon;
  final Color color;
  final WidgetBuilder builder;
  const _PlusItem(this.label, this.icon, this.color, this.builder);
}

class ParentPlusScreen extends StatelessWidget {
  const ParentPlusScreen({super.key});

  static final _items = <_PlusItem>[
    _PlusItem('Cotisations APE', Icons.payments_rounded, Color(0xFFF59E0B), (_) => const ParentCotisationsScreen()),
    _PlusItem('Annonces', Icons.campaign_rounded, kRed, (_) => const ParentAnnoncesScreen()),
    _PlusItem('Espace APE', Icons.groups_rounded, Color(0xFFDB2777), (_) => const ApeHomeScreen()),
    _PlusItem('Mon profil', Icons.person_rounded, Color(0xFFF59E0B), (_) => const ParentProfilScreen()),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plus')),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.25),
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
