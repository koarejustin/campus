import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';
import '../../widgets/notification_bell.dart';

class ProfDashboardScreen extends StatefulWidget {
  final void Function(int tabIndex) onNavigate;
  const ProfDashboardScreen({super.key, required this.onNavigate});

  @override
  State<ProfDashboardScreen> createState() => _ProfDashboardScreenState();
}

class _ClasseStat {
  final String classe;
  final int nbEleves;
  final int nbNotes;
  final double? moyenne;
  _ClasseStat(this.classe, this.nbEleves, this.nbNotes, this.moyenne);
  double get tauxNotes => nbEleves == 0 ? 0 : nbNotes / nbEleves;
}

class _ProfDashboardScreenState extends State<ProfDashboardScreen> {
  bool _loading = true;
  Map<String, dynamic>? _profil;
  List<_ClasseStat> _classesStats = [];
  List<dynamic> _ressourcesRecentes = [];
  int _ressourcesVisibles = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final profilData = await ApiClient.instance.get('/professeurs/profil');
      final profil = profilData['profil'] as Map<String, dynamic>?;
      final classes = List<String>.from(profil?['classes'] ?? []);

      final results = await Future.wait([
        Future.wait(classes.map((c) => ApiClient.instance.get('/professeurs/eleves?classe=${Uri.encodeQueryComponent(c)}&trimestre=1'))),
        ApiClient.instance.get('/professeurs/ressources'),
      ]);
      final elevesParClasse = results[0] as List;
      final ressourcesData = results[1] as Map<String, dynamic>;

      final stats = <_ClasseStat>[];
      for (int i = 0; i < classes.length; i++) {
        final eleves = (elevesParClasse[i]['eleves'] as List?) ?? [];
        final avecNote = eleves.where((e) => e['moyenne'] != null).toList();
        final moyClasse = avecNote.isEmpty
            ? null
            : avecNote.map((e) => toDouble(e['moyenne'])).reduce((a, b) => a + b) / avecNote.length;
        stats.add(_ClasseStat(classes[i], eleves.length, avecNote.length, moyClasse));
      }

      final ressources = (ressourcesData['ressources'] as List?) ?? [];

      setState(() {
        _profil = profil;
        _classesStats = stats;
        _ressourcesRecentes = ressources.take(5).toList();
        _ressourcesVisibles = ressources.where((r) => r['visible'] == true).length;
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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

  Color _tauxColor(double taux) {
    if (taux >= 0.8) return kGreen;
    if (taux >= 0.4) return kAmber;
    return kRed;
  }

  @override
  Widget build(BuildContext context) {
    final totalEleves = _classesStats.fold<int>(0, (s, c) => s + c.nbEleves);
    final totalNotes = _classesStats.fold<int>(0, (s, c) => s + c.nbNotes);
    final tauxGlobal = totalEleves == 0 ? 0.0 : totalNotes / totalEleves;
    final classesAvecMoy = _classesStats.where((c) => c.moyenne != null).toList();
    final moyGenerale = classesAvecMoy.isEmpty
        ? null
        : classesAvecMoy.map((c) => c.moyenne!).reduce((a, b) => a + b) / classesAvecMoy.length;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
              decoration: const BoxDecoration(gradient: kProfGradient),
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
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.18),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 1.4),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _initiale(_profil?['prenom']),
                          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${_greeting()}, ${_profil?['prenom'] ?? ''} ${_greetingEmoji()}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        _profil?['specialite'] ?? 'Professeur',
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
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12, crossAxisSpacing: 12,
              childAspectRatio: 1.7,
              children: List.generate(4, (_) => const Skeleton(height: 90)),
            )
          else
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12, crossAxisSpacing: 12,
              childAspectRatio: 1.7,
              children: [
                _StatCard(label: 'Mes élèves', value: '$totalEleves', icon: Icons.groups_rounded, color: kGreen, onTap: () => widget.onNavigate(1), delay: 0),
                _StatCard(label: 'Notes saisies', value: '${(tauxGlobal * 100).round()}%', icon: Icons.fact_check_rounded, color: _tauxColor(tauxGlobal), onTap: () => widget.onNavigate(1), delay: 80),
                _StatCard(label: 'Moy. générale', value: moyGenerale != null ? '${moyGenerale.toStringAsFixed(2)}/20' : '—', icon: Icons.grade_rounded, color: kIndigo, onTap: () => widget.onNavigate(1), delay: 160),
                _StatCard(label: 'Ressources', value: '$_ressourcesVisibles', icon: Icons.folder_copy_rounded, color: kAmber, onTap: () => widget.onNavigate(4), delay: 240),
              ],
            ),
          const SizedBox(height: 22),
          const Text('Mes classes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
          const SizedBox(height: 10),
          if (_loading)
            const SkeletonList(count: 3, itemHeight: 70)
          else if (_classesStats.isEmpty)
            const Text('Aucune classe assignée pour le moment', style: TextStyle(color: kTextGray))
          else
            for (int i = 0; i < _classesStats.length; i++)
              Builder(builder: (context) {
                final c = _classesStats[i];
                final color = _tauxColor(c.tauxNotes);
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(c.classe, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                            Text(
                              c.moyenne != null ? 'Moy. ${c.moyenne!.toStringAsFixed(2)}/20' : 'Aucune note',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.moyenne != null ? color : kTextGray),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: TweenAnimationBuilder<double>(
                            tween: Tween(begin: 0, end: c.tauxNotes),
                            duration: const Duration(milliseconds: 700),
                            curve: Curves.easeOutCubic,
                            builder: (context, v, _) => LinearProgressIndicator(
                              value: v, minHeight: 8,
                              backgroundColor: kBg,
                              valueColor: AlwaysStoppedAnimation(color),
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text('${c.nbNotes}/${c.nbEleves} élèves notés', style: const TextStyle(fontSize: 11, color: kTextGray)),
                      ],
                    ),
                  ),
                ).animate().fadeIn(delay: (i * 80).ms, duration: 280.ms).slideX(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
              }),
          if (!_loading && _ressourcesRecentes.isNotEmpty) ...[
            const SizedBox(height: 22),
            const Text('Ressources récentes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
            const SizedBox(height: 10),
            for (int i = 0; i < _ressourcesRecentes.length; i++)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  dense: true,
                  leading: const CircleAvatar(backgroundColor: kBg, child: Icon(Icons.description_rounded, color: kGreen, size: 18)),
                  title: Text(_ressourcesRecentes[i]['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  subtitle: Text(_ressourcesRecentes[i]['cls'] ?? '', style: const TextStyle(fontSize: 11)),
                  onTap: () => widget.onNavigate(4),
                ),
              ).animate().fadeIn(delay: (300 + i * 60).ms, duration: 260.ms),
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
  final int delay;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color, required this.onTap, required this.delay});

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
    ).animate().fadeIn(delay: delay.ms, duration: 300.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutCubic);
  }
}
