import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../utils.dart';
import '../widgets/skeleton.dart';

class BulletinScreen extends StatefulWidget {
  const BulletinScreen({super.key});

  @override
  State<BulletinScreen> createState() => _BulletinScreenState();
}

class _BulletinScreenState extends State<BulletinScreen> {
  int _trimestre = 1;
  bool _loading = true;
  String? _error;
  double? _moyenneGenerale;
  List<dynamic> _matieres = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.instance.get('/eleves/bulletin?trimestre=$_trimestre');
      if (data['success'] == true) {
        setState(() {
          _moyenneGenerale = toDoubleOrNull(data['eleve']?['moyenne_generale']);
          _matieres = data['notes_par_matiere'] ?? [];
        });
      } else {
        setState(() => _error = data['message'] ?? 'Erreur de chargement');
      }
    } catch (e) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _noteColor(double note) {
    if (note >= 14) return kGreen;
    if (note >= 10) return kAmber;
    return kRed;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bulletin')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [1, 2, 3].map((t) {
                final selected = t == _trimestre;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text('Trimestre $t'),
                    selected: selected,
                    selectedColor: kIndigo,
                    labelStyle: TextStyle(color: selected ? Colors.white : kTextDark, fontWeight: FontWeight.w700),
                    onSelected: (_) {
                      setState(() => _trimestre = t);
                      _load();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          if (_loading)
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: const [
                  Skeleton(height: 90),
                  SizedBox(height: 16),
                  Skeleton(height: 180),
                  SizedBox(height: 16),
                  SkeletonList(count: 3),
                ],
              ),
            )
          else if (_error != null)
            Expanded(child: Center(child: Text(_error!, style: const TextStyle(color: kRed))))
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _MoyenneCard(moyenne: _moyenneGenerale ?? 0)
                        .animate()
                        .fadeIn(duration: 350.ms)
                        .slideY(begin: 0.12, end: 0, curve: Curves.easeOutCubic),
                    const SizedBox(height: 16),
                    if (_matieres.isNotEmpty) ...[
                      _NotesChart(matieres: _matieres)
                          .animate()
                          .fadeIn(delay: 120.ms, duration: 400.ms),
                      const SizedBox(height: 16),
                    ],
                    if (_matieres.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: Text('Aucune note pour ce trimestre', style: TextStyle(color: kTextGray))),
                      ),
                    for (int i = 0; i < _matieres.length; i++)
                      Builder(builder: (context) {
                        final m = _matieres[i];
                        final note = toDouble(m['note_moyenne']);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(m['matiere'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5)),
                                      const SizedBox(height: 3),
                                      Text(
                                        '${m['nb_evaluations']} évaluation(s) · coeff. ${m['coefficient']}',
                                        style: const TextStyle(fontSize: 12, color: kTextGray),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: _noteColor(note).withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    '${note.toStringAsFixed(2)}/20',
                                    style: TextStyle(color: _noteColor(note), fontWeight: FontWeight.w800),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ).animate().fadeIn(delay: (200 + i * 70).ms, duration: 300.ms).slideX(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
                      }),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Bandeau moyenne générale avec compteur animé (0 → moyenne réelle).
class _MoyenneCard extends StatelessWidget {
  final double moyenne;
  const _MoyenneCard({required this.moyenne});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(gradient: kBrandGradient, borderRadius: BorderRadius.circular(16)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text('Moyenne générale', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: moyenne),
            duration: const Duration(milliseconds: 900),
            curve: Curves.easeOutCubic,
            builder: (context, value, _) => Text(
              '${value.toStringAsFixed(2)}/20',
              style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
    );
  }
}

/// Graphique en barres des moyennes par matière — anime sa montée au
/// chargement (fl_chart gère l'interpolation depuis 0 automatiquement).
class _NotesChart extends StatelessWidget {
  final List<dynamic> matieres;
  const _NotesChart({required this.matieres});

  @override
  Widget build(BuildContext context) {
    final limited = matieres.take(8).toList();
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 18, 16, 12),
        child: SizedBox(
          height: 200,
          child: BarChart(
            BarChartData(
              maxY: 20,
              minY: 0,
              gridData: FlGridData(
                show: true,
                horizontalInterval: 5,
                drawVerticalLine: false,
                getDrawingHorizontalLine: (v) => FlLine(color: kBorder, strokeWidth: 1),
              ),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(showTitles: true, reservedSize: 28, interval: 5,
                      getTitlesWidget: (v, meta) => Text('${v.toInt()}', style: const TextStyle(fontSize: 10, color: kTextGray))),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 34,
                    getTitlesWidget: (v, meta) {
                      final i = v.toInt();
                      if (i < 0 || i >= limited.length) return const SizedBox.shrink();
                      final nom = (limited[i]['matiere'] ?? '').toString();
                      final short = nom.length > 6 ? '${nom.substring(0, 6)}…' : nom;
                      return Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(short, style: const TextStyle(fontSize: 9.5, color: kTextGray)),
                      );
                    },
                  ),
                ),
              ),
              barGroups: [
                for (int i = 0; i < limited.length; i++)
                  BarChartGroupData(x: i, barRods: [
                    BarChartRodData(
                      toY: toDouble(limited[i]['note_moyenne']),
                      color: kIndigo,
                      width: 18,
                      borderRadius: BorderRadius.circular(6),
                      backDrawRodData: BackgroundBarChartRodData(show: true, toY: 20, color: kBg),
                    ),
                  ]),
              ],
            ),
            duration: const Duration(milliseconds: 700),
            curve: Curves.easeOutCubic,
          ),
        ),
      ),
    );
  }
}
