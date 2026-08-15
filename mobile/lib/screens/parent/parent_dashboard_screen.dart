import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';
import '../../widgets/notification_bell.dart';
import 'parent_state.dart';
import 'child_switcher.dart';

class ParentDashboardScreen extends StatefulWidget {
  final void Function(int tabIndex) onNavigate;
  const ParentDashboardScreen({super.key, required this.onNavigate});

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  bool _loading = true;
  double? _moyenne;
  int _absencesNonJust = 0;
  int _convocationsEnAttente = 0;
  List<dynamic> _dernieresNotes = [];
  List<dynamic> _annonces = [];

  @override
  void initState() {
    super.initState();
    ParentState.instance.addListener(_load);
    _load();
  }

  @override
  void dispose() {
    ParentState.instance.removeListener(_load);
    super.dispose();
  }

  Future<void> _load() async {
    final enfantId = ParentState.instance.selectedId;
    if (enfantId == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/parents/bulletin-enfant?enfant_id=$enfantId&trimestre=1'),
        ApiClient.instance.get('/parents/absences-enfant?enfant_id=$enfantId'),
        ApiClient.instance.get('/parents/convocations-enfant?enfant_id=$enfantId'),
        ApiClient.instance.get('/parents/annonces'),
      ]);
      final bulletin = results[0];
      final absences = results[1];
      final convocations = results[2];
      final annonces = results[3];
      setState(() {
        _moyenne = toDoubleOrNull(bulletin['moyenne_generale']);
        _dernieresNotes = (bulletin['detail_matieres'] as List? ?? []).where((m) => m['moyenne'] != null).take(3).toList();
        _absencesNonJust = absences['absences_non_justifiees'] ?? 0;
        _convocationsEnAttente = ((convocations['convocations'] as List?) ?? []).where((c) => c['statut'] != 'ACCUSE_RECU').length;
        _annonces = (annonces['annonces'] as List? ?? []).take(2).toList();
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _initiale(String? p) => (p == null || p.isEmpty) ? '?' : p[0].toUpperCase();

  String _greeting() {
    final h = DateTime.now().hour;
    if (h >= 5 && h < 12) return 'Bonjour';
    if (h >= 12 && h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  String _greetingEmoji() {
    final h = DateTime.now().hour;
    if (h >= 5 && h < 12) return '🌅';
    if (h >= 12 && h < 18) return '☀️';
    return '🌙';
  }

  Color _noteColor(double m) => m >= 14 ? kGreen : (m >= 10 ? kAmber : kRed);

  @override
  Widget build(BuildContext context) {
    final user = ApiClient.instance.user;
    final ps = ParentState.instance;
    final enfant = ps.selected;

    if (ps.enfants.isEmpty) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(24),
        child: Text('Aucun enfant relié à ce compte pour le moment.', style: TextStyle(color: kTextGray), textAlign: TextAlign.center),
      ));
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
              decoration: const BoxDecoration(gradient: kParentGradient),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(top: -30, right: -20, child: Container(width: 110, height: 110, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.08)))),
                  Positioned(bottom: -40, left: -30, child: Container(width: 130, height: 130, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.06)))),
                  const Positioned(top: -4, right: -8, child: NotificationBell(color: Colors.white)),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        width: 52, height: 52,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.18), border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 1.4)),
                        alignment: Alignment.center,
                        child: Text(_initiale(user?['prenom']), style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                      ),
                      const SizedBox(height: 12),
                      Text('${_greeting()}, ${user?['prenom'] ?? ''} ${_greetingEmoji()}', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800)),
                      if (enfant != null) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(30)),
                          child: Text('👨‍👩‍👧 ${enfant['nom_complet'] ?? ''} · ${enfant['classe'] ?? ''}', style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.15, end: 0, curve: Curves.easeOutCubic),
          ChildSwitcher(onChanged: _load),
          const SizedBox(height: 8),
          if (_loading)
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.7,
              children: List.generate(2, (_) => const Skeleton(height: 90)),
            )
          else
            Row(
              children: [
                Expanded(
                  child: _StatCard(label: 'Moyenne générale', value: _moyenne != null ? '${_moyenne!.toStringAsFixed(2)}/20' : '—', icon: Icons.grade_rounded, color: kIndigo, onTap: () => widget.onNavigate(1)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(label: 'Absences non just.', value: '$_absencesNonJust', icon: Icons.event_busy_rounded, color: _absencesNonJust > 0 ? kRed : kGreen, onTap: () => widget.onNavigate(2)),
                ),
              ],
            ),
          if (!_loading && _convocationsEnAttente > 0) ...[
            const SizedBox(height: 12),
            InkWell(
              onTap: () => widget.onNavigate(3),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: kAmber.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14), border: Border.all(color: kAmber.withValues(alpha: 0.3))),
                child: Row(
                  children: [
                    const Icon(Icons.mail_rounded, color: kAmber, size: 20),
                    const SizedBox(width: 10),
                    Expanded(child: Text('$_convocationsEnAttente convocation(s) en attente d\'accusé de réception', style: const TextStyle(color: kAmber, fontWeight: FontWeight.w700, fontSize: 12.5))),
                    const Icon(Icons.chevron_right_rounded, color: kAmber),
                  ],
                ),
              ),
            ).animate().fadeIn(duration: 300.ms),
          ],
          const SizedBox(height: 22),
          const Text('Dernières notes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
          const SizedBox(height: 10),
          if (_loading)
            const SkeletonList(count: 2, itemHeight: 60)
          else if (_dernieresNotes.isEmpty)
            const Text('Aucune note pour le moment', style: TextStyle(color: kTextGray))
          else
            for (int i = 0; i < _dernieresNotes.length; i++)
              Builder(builder: (context) {
                final m = _dernieresNotes[i];
                final note = toDouble(m['moyenne']);
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    dense: true,
                    leading: CircleAvatar(backgroundColor: _noteColor(note).withValues(alpha: 0.12), child: Icon(Icons.menu_book_rounded, color: _noteColor(note), size: 18)),
                    title: Text(m['nom'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    trailing: Text('${note.toStringAsFixed(2)}/20', style: TextStyle(color: _noteColor(note), fontWeight: FontWeight.w800)),
                    onTap: () => widget.onNavigate(1),
                  ),
                ).animate().fadeIn(delay: (i * 80).ms, duration: 260.ms);
              }),
          if (!_loading && _annonces.isNotEmpty) ...[
            const SizedBox(height: 22),
            const Text('Annonces', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
            const SizedBox(height: 10),
            for (final a in _annonces)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  dense: true,
                  leading: const CircleAvatar(backgroundColor: kBg, child: Icon(Icons.campaign_rounded, color: kIndigo, size: 18)),
                  title: Text(a['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(height: 8),
              Text(value, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: color)),
              Text(label, style: const TextStyle(fontSize: 10.5, color: kTextGray, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}
