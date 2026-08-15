import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../surveillant/surveillant_convocations_screen.dart';
import '../surveillant/surveillant_cahiers_screen.dart';
import '../surveillant/surveillant_annonces_screen.dart';
import 'direction_edt_screen.dart';
import 'direction_profs_screen.dart';
import 'direction_parents_screen.dart';
import 'direction_alumni_screen.dart';
import 'direction_compositions_screen.dart';
import 'direction_elections_screen.dart';
import 'direction_signatures_screen.dart';
import 'direction_profil_screen.dart';

// Incidents, Comptabilité et Agenda Direction sont volontairement retirés du
// menu (décision produit — dépendent respectivement de la mise en place du
// paiement en ligne et d'une réactivation plus tardive). Les écrans restent
// dans le code (surveillant_incidents_screen.dart, direction_cotisations_screen.dart,
// direction_agenda_screen.dart) prêts à être réintégrés : il suffit de
// réimporter et rajouter un _PlusItem.

class _PlusItem {
  final String label;
  final IconData icon;
  final Color color;
  final WidgetBuilder builder;
  final bool directionOnly;
  const _PlusItem(this.label, this.icon, this.color, this.builder, {this.directionOnly = false});
}

// Sur le web, direction.html est une seule et même page pour DIRECTION et
// SURVEILLANT : la Direction voit tout, le Surveillant garde Élèves /
// Absences / Convocations / Incidents / Emploi du temps mais les sections
// Corps enseignant / Parents / Anciens Élèves / Signatures / Comptabilité /
// Agenda / Compositions / Élections / Communication restent verrouillées
// (badge "DIR" visible, grisées). On reproduit ce même verrouillage ici
// plutôt que de construire deux applications séparées.
class DirectionPlusScreen extends StatelessWidget {
  const DirectionPlusScreen({super.key});

  static final _items = <_PlusItem>[
    _PlusItem('Convocations', Icons.mail_rounded, kAmber, (_) => const SurveillantConvocationsScreen()),
    _PlusItem('Emploi du temps', Icons.calendar_month_rounded, kIndigo, (_) => const DirectionEdtScreen()),
    _PlusItem('Cahiers de texte', Icons.menu_book_rounded, kGreen, (_) => const SurveillantCahiersScreen()),
    _PlusItem('Corps enseignant', Icons.co_present_rounded, kGreen, (_) => const DirectionProfsScreen(), directionOnly: true),
    _PlusItem('Parents', Icons.family_restroom_rounded, kParentGradient.colors.first, (_) => const DirectionParentsScreen(), directionOnly: true),
    _PlusItem('Anciens élèves', Icons.workspace_premium_rounded, kAlumniGradient.colors.first, (_) => const DirectionAlumniScreen(), directionOnly: true),
    _PlusItem('Signatures', Icons.verified_rounded, kDirectionGradient.colors.first, (_) => const DirectionSignaturesScreen(), directionOnly: true),
    _PlusItem('Compositions', Icons.assignment_rounded, kIndigo, (_) => const DirectionCompositionsScreen(), directionOnly: true),
    _PlusItem('Élections', Icons.how_to_vote_rounded, kAmber, (_) => const DirectionElectionsScreen(), directionOnly: true),
    _PlusItem('Communication', Icons.campaign_rounded, kRed, (_) => const SurveillantAnnoncesScreen(), directionOnly: true),
    _PlusItem('Mon profil', Icons.person_rounded, kDirectionGradient.colors.first, (_) => const DirectionProfilScreen()),
  ];

  @override
  Widget build(BuildContext context) {
    final isDirection = ApiClient.instance.user?['role_actuel'] == 'DIRECTION';
    return Scaffold(
      appBar: AppBar(title: const Text('Plus')),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.2),
        itemCount: _items.length,
        itemBuilder: (context, i) {
          final item = _items[i];
          final locked = item.directionOnly && !isDirection;
          return Card(
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {
                if (locked) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('🔒 Section réservée à la Direction'), backgroundColor: kTextGray));
                  return;
                }
                Navigator.of(context).push(MaterialPageRoute(builder: item.builder));
              },
              child: Opacity(
                opacity: locked ? 0.45 : 1,
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 42, height: 42,
                            decoration: BoxDecoration(color: item.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                            alignment: Alignment.center,
                            child: Icon(item.icon, color: item.color, size: 22),
                          ),
                          if (locked) ...[
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: kTextGray.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(6)),
                              child: const Text('DIR', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: kTextGray)),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(item.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: kTextDark)),
                    ],
                  ),
                ),
              ),
            ),
          ).animate().fadeIn(delay: (i * 30).ms, duration: 240.ms).scale(begin: const Offset(0.9, 0.9), end: const Offset(1, 1), curve: Curves.easeOutCubic);
        },
      ),
    );
  }
}
