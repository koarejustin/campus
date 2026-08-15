import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';
import '../../widgets/notification_bell.dart';
import '../surveillant/surveillant_convocations_screen.dart';
import 'direction_profs_screen.dart';

class DirectionDashboardScreen extends StatefulWidget {
  final void Function(int tabIndex) onNavigate;
  const DirectionDashboardScreen({super.key, required this.onNavigate});

  @override
  State<DirectionDashboardScreen> createState() => _DirectionDashboardScreenState();
}

class _DirectionDashboardScreenState extends State<DirectionDashboardScreen> {
  bool _loading = true;
  Map<String, dynamic> _stats = {};

  bool get _isDirection => ApiClient.instance.user?['role_actuel'] == 'DIRECTION';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/stats');
      setState(() => _stats = data['stats'] as Map<String, dynamic>? ?? {});
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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

  @override
  Widget build(BuildContext context) {
    final user = ApiClient.instance.user;
    final moyennesClasses = (_stats['moyennes_classes'] as Map?) ?? {};
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
              decoration: const BoxDecoration(gradient: kDirectionGradient),
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
                        child: const Icon(Icons.admin_panel_settings_rounded, color: Colors.white, size: 24),
                      ),
                      const SizedBox(height: 12),
                      Text('${_greeting()}, ${user?['prenom'] ?? ''} ${_greetingEmoji()}', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      const Text('Espace Direction', style: TextStyle(color: Colors.white70, fontSize: 13)),
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
              mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.3,
              children: List.generate(8, (_) => const Skeleton(height: 90)),
            )
          else
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.3,
              children: [
                _StatCard(label: 'Élèves', value: '${_stats['users'] ?? '—'}', icon: Icons.groups_rounded, color: kIndigo, onTap: () => widget.onNavigate(1)),
                _StatCard(
                  label: 'Professeurs', value: '${_stats['professors'] ?? '—'}', icon: Icons.co_present_rounded, color: kGreen,
                  onTap: () {
                    if (_isDirection) {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const DirectionProfsScreen()));
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('🔒 Section réservée à la Direction'), backgroundColor: kTextGray));
                    }
                  },
                ),
                _StatCard(label: 'Surveillants', value: '${_stats['surveillants'] ?? '—'}', icon: Icons.shield_rounded, color: kSurveillantGradient.colors.first),
                _StatCard(label: 'Présence', value: _stats['presence'] != null ? '${_stats['presence']}%' : '—', icon: Icons.how_to_reg_rounded, color: kGreen),
                _StatCard(label: 'Absences', value: '${_stats['absences'] ?? '—'}', icon: Icons.event_busy_rounded, color: kRed, onTap: () => widget.onNavigate(2)),
                // "alerts" côté API = nombre de notifications système non lues
                // (toutes confondues, tous rôles) — ça n'a jamais été un vrai
                // compte de convocations. Le backend expose maintenant un vrai
                // "convocations_en_attente" dédié (statut != ACCUSE_RECU).
                _StatCard(
                  label: 'Convocations en attente', value: '${_stats['convocations_en_attente'] ?? '—'}', icon: Icons.mail_outline_rounded, color: kAmber,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SurveillantConvocationsScreen())),
                ),
                _StatCard(label: 'Moyenne générale', value: _stats['moyenne_generale'] != null ? '${toDouble(_stats['moyenne_generale']).toStringAsFixed(1)}/20' : '—', icon: Icons.trending_up_rounded, color: kAlumniGradient.colors.first),
              ],
            ),
          if (!_loading && moyennesClasses.isNotEmpty) ...[
            const SizedBox(height: 24),
            const Text('Moyenne par classe', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
            const SizedBox(height: 10),
            for (final entry in moyennesClasses.entries)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    SizedBox(width: 70, child: Text(entry.key.toString(), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700))),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: (toDouble(entry.value) / 20).clamp(0, 1),
                          minHeight: 10,
                          backgroundColor: kBg,
                          color: kDirectionGradient.colors.first,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(toDouble(entry.value).toStringAsFixed(1), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kTextGray)),
                  ],
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
  final VoidCallback? onTap;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color, this.onTap});

  @override
  Widget build(BuildContext context) {
    final content = Padding(
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
    );
    if (onTap == null) return Card(child: content);
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: content,
      ),
    );
  }
}
