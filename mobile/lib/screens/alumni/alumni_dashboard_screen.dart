import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';
import '../../widgets/notification_bell.dart';

class AlumniDashboardScreen extends StatefulWidget {
  final void Function(int tabIndex) onNavigate;
  const AlumniDashboardScreen({super.key, required this.onNavigate});

  @override
  State<AlumniDashboardScreen> createState() => _AlumniDashboardScreenState();
}

class _AlumniDashboardScreenState extends State<AlumniDashboardScreen> {
  bool _loading = true;
  int _nbConseils = 0;
  int _nbEleves = 0;
  List<dynamic> _dernieresEntrees = [];
  List<dynamic> _derniersConseils = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/alumni/mentorats?mine=true'),
        ApiClient.instance.get('/mentorat/dashboard'),
      ]);
      final mentorats = results[0];
      final dashboard = results[1]['dashboard'] as Map<String, dynamic>? ?? {};
      setState(() {
        _derniersConseils = (mentorats['mentorats'] as List? ?? []);
        _nbConseils = _derniersConseils.length;
        _nbEleves = dashboard['nb_eleves_mentores'] ?? 0;
        _dernieresEntrees = (dashboard['dernieres_entrees'] as List? ?? []).take(3).toList();
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
              decoration: const BoxDecoration(gradient: kAlumniGradient),
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
                      const SizedBox(height: 4),
                      const Text('Espace Alumni · Mentorat', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.15, end: 0, curve: Curves.easeOutCubic),
          const SizedBox(height: 16),
          if (_loading)
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.7,
              children: List.generate(2, (_) => const Skeleton(height: 90)),
            )
          else
            Row(
              children: [
                Expanded(child: _StatCard(label: 'Conseils publiés', value: '$_nbConseils', icon: Icons.tips_and_updates_rounded, color: kAlumniGradient.colors.first, onTap: () => widget.onNavigate(1))),
                const SizedBox(width: 12),
                Expanded(child: _StatCard(label: 'Élèves mentorés', value: '$_nbEleves', icon: Icons.groups_rounded, color: kIndigo, onTap: () => widget.onNavigate(3))),
              ],
            ),
          const SizedBox(height: 22),
          const Text('Dernières entrées de journal', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
          const SizedBox(height: 10),
          if (_loading)
            const SkeletonList(count: 2, itemHeight: 60)
          else if (_dernieresEntrees.isEmpty)
            const Text('Aucune entrée pour le moment', style: TextStyle(color: kTextGray))
          else
            for (final e in _dernieresEntrees)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  dense: true,
                  leading: const CircleAvatar(backgroundColor: kBg, child: Icon(Icons.menu_book_rounded, color: Color(0xFFF59E0B), size: 18)),
                  title: Text(e['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  subtitle: Text('${e['prenom'] ?? ''} ${e['nom'] ?? ''}', style: const TextStyle(fontSize: 11.5)),
                  onTap: () => widget.onNavigate(3),
                ),
              ),
          if (!_loading && _derniersConseils.isNotEmpty) ...[
            const SizedBox(height: 22),
            const Text('Vos derniers conseils', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
            const SizedBox(height: 10),
            for (final c in _derniersConseils.take(3))
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  dense: true,
                  leading: const CircleAvatar(backgroundColor: kBg, child: Icon(Icons.tips_and_updates_rounded, color: Color(0xFFF59E0B), size: 18)),
                  title: Text(c['titre'] ?? c['contenu_conseil'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
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
