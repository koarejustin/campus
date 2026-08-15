import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../utils.dart';
import '../widgets/skeleton.dart';
import '../widgets/notification_bell.dart';

class DashboardScreen extends StatefulWidget {
  final void Function(int tabIndex) onNavigate;
  const DashboardScreen({super.key, required this.onNavigate});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loading = true;
  double? _moyenne;
  int? _absencesNonJustifiees;
  List<dynamic> _prochainsDevoirs = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/eleves/bulletin?trimestre=1'),
        ApiClient.instance.get('/eleves/absences'),
        ApiClient.instance.get('/eleves/devoirs'),
      ]);
      final bulletin = results[0];
      final absences = results[1];
      final devoirs = results[2];
      setState(() {
        _moyenne = toDoubleOrNull(bulletin['eleve']?['moyenne_generale']);
        _absencesNonJustifiees = absences['absences_non_justifiees'];
        _prochainsDevoirs = (devoirs['devoirs'] as List? ?? []).take(3).toList();
      });
    } catch (_) {
      // Silencieux : chaque onglet dédié réessaiera et affichera l'erreur.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ApiClient.instance.user;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
              decoration: const BoxDecoration(gradient: kBrandGradient),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  // Formes décoratives translucides pour donner du relief au bandeau.
                  Positioned(
                    top: -30, right: -20,
                    child: Container(width: 110, height: 110,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.08))),
                  ),
                  Positioned(
                    bottom: -40, left: -30,
                    child: Container(width: 130, height: 130,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.06))),
                  ),
                  const Positioned(top: -4, right: -8, child: NotificationBell(color: Colors.white)),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        width: 56, height: 56,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.18),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 1.4),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _initiale(user?['prenom']),
                          style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${_greeting()}, ${user?['prenom'] ?? ''} ${_greetingEmoji()}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        '${user?['classe_actuelle'] ?? ''} · ${user?['code_unique'] ?? ''}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.15, end: 0, curve: Curves.easeOutCubic),
          const SizedBox(height: 16),
          if (_loading)
            Row(
              children: const [
                Expanded(child: Skeleton(height: 92)),
                SizedBox(width: 12),
                Expanded(child: Skeleton(height: 92)),
              ],
            )
          else
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: 'Moyenne générale',
                    value: _moyenne != null ? '${_moyenne!.toStringAsFixed(2)}/20' : '—',
                    color: kIndigo,
                    icon: Icons.grade_rounded,
                    onTap: () => widget.onNavigate(1),
                  ).animate().fadeIn(delay: 80.ms, duration: 350.ms).slideY(begin: 0.25, end: 0, curve: Curves.easeOutCubic),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    label: 'Absences non just.',
                    value: '${_absencesNonJustifiees ?? 0}',
                    color: (_absencesNonJustifiees ?? 0) > 0 ? kRed : kGreen,
                    icon: Icons.event_busy_rounded,
                    onTap: () => widget.onNavigate(2),
                  ).animate().fadeIn(delay: 160.ms, duration: 350.ms).slideY(begin: 0.25, end: 0, curve: Curves.easeOutCubic),
                ),
              ],
            ),
          const SizedBox(height: 20),
          const Text('Prochains devoirs', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
          const SizedBox(height: 10),
          if (_loading)
            const SkeletonList(count: 2, itemHeight: 64)
          else ...[
            if (_prochainsDevoirs.isEmpty)
              const Text('Aucun devoir à venir 🎉', style: TextStyle(color: kTextGray)),
            for (int i = 0; i < _prochainsDevoirs.length; i++)
              Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  leading: const CircleAvatar(backgroundColor: kBg, child: Icon(Icons.menu_book_rounded, color: kIndigo, size: 20)),
                  title: Text(_prochainsDevoirs[i]['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(_prochainsDevoirs[i]['matiere'] ?? ''),
                  trailing: Text(_shortDate(_prochainsDevoirs[i]['date_limite']), style: const TextStyle(color: kTextGray, fontSize: 12)),
                  onTap: () => widget.onNavigate(3),
                ),
              ).animate().fadeIn(delay: (220 + i * 90).ms, duration: 300.ms).slideX(begin: 0.08, end: 0, curve: Curves.easeOutCubic),
          ],
        ],
      ),
    );
  }

  String _initiale(String? prenom) {
    if (prenom == null || prenom.isEmpty) return '?';
    return prenom[0].toUpperCase();
  }

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

  String _shortDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;
  const _StatCard({required this.label, required this.value, required this.color, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(height: 10),
              Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
              const SizedBox(height: 2),
              Text(label, style: const TextStyle(fontSize: 11.5, color: kTextGray, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}
