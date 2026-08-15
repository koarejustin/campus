import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';
import 'parent_state.dart';
import 'child_switcher.dart';

class ParentBulletinScreen extends StatefulWidget {
  const ParentBulletinScreen({super.key});

  @override
  State<ParentBulletinScreen> createState() => _ParentBulletinScreenState();
}

class _ParentBulletinScreenState extends State<ParentBulletinScreen> {
  int _trimestre = 1;
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;

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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.instance.get('/parents/bulletin-enfant?enfant_id=$enfantId&trimestre=$_trimestre');
      if (data['success'] == true) {
        setState(() => _data = data);
      } else {
        setState(() => _error = data['message'] ?? 'Erreur de chargement');
      }
    } catch (e) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _moyColor(double? m) {
    if (m == null) return kTextGray;
    if (m >= 14) return kGreen;
    if (m >= 10) return kAmber;
    return kRed;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bulletin')),
      body: Column(
        children: [
          ChildSwitcher(onChanged: _load),
          if (ParentState.instance.enfants.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Row(
                children: [1, 2, 3].map((t) {
                  final selected = t == _trimestre;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('Trimestre $t'),
                      selected: selected,
                      selectedColor: kParentGradient.colors.first,
                      labelStyle: TextStyle(color: selected ? Colors.white : kTextDark, fontWeight: FontWeight.w700),
                      onSelected: (_) { setState(() => _trimestre = t); _load(); },
                    ),
                  );
                }).toList(),
              ),
            ),
          if (_loading)
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: const [Skeleton(height: 100), SizedBox(height: 16), Skeleton(height: 190), SizedBox(height: 16), SkeletonList(count: 3)],
              ),
            )
          else if (_error != null || _data == null)
            Expanded(child: Center(child: Text(_error ?? 'Aucune donnée', style: const TextStyle(color: kRed))))
          else
            Expanded(child: _buildContent()),
        ],
      ),
    );
  }

  Widget _buildContent() {
    final d = _data!;
    final moyenne = toDoubleOrNull(d['moyenne_generale']);
    final mention = d['mention'] as String?;
    final admis = d['admis'] == true;
    final matieres = (d['detail_matieres'] as List?) ?? [];
    final evolution = (d['evolution_trimestrielle'] as List?) ?? [];
    final predictif = d['predictif'] as Map<String, dynamic>? ?? {};

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(gradient: kParentGradient),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Moyenne générale', style: TextStyle(color: Colors.white70, fontSize: 12.5, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(moyenne != null ? '${moyenne.toStringAsFixed(2)}/20' : '—', style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
                      if (mention != null) Text(mention, style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(20)),
                    child: Text(admis ? '✅ Admis(e)' : '⚠️ Non admis(e)', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12.5)),
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.12, end: 0, curve: Curves.easeOutCubic),

          if (evolution.length >= 2) ...[
            const SizedBox(height: 18),
            const Text('Évolution par trimestre', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 20, 20, 12),
                child: SizedBox(
                  height: 160,
                  child: LineChart(
                    LineChartData(
                      minY: 0, maxY: 20,
                      gridData: FlGridData(show: true, horizontalInterval: 5, drawVerticalLine: false, getDrawingHorizontalLine: (v) => FlLine(color: kBorder, strokeWidth: 1)),
                      borderData: FlBorderData(show: false),
                      titlesData: FlTitlesData(
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 26, interval: 5, getTitlesWidget: (v, m) => Text('${v.toInt()}', style: const TextStyle(fontSize: 10, color: kTextGray)))),
                        bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 24, getTitlesWidget: (v, m) {
                          final i = v.toInt();
                          if (i < 0 || i >= evolution.length) return const SizedBox.shrink();
                          return Text('T${evolution[i]['trimestre']}', style: const TextStyle(fontSize: 10.5, color: kTextGray, fontWeight: FontWeight.w700));
                        })),
                      ),
                      lineBarsData: [
                        LineChartBarData(
                          isCurved: true, color: kParentGradient.colors.first, barWidth: 3,
                          dotData: const FlDotData(show: true),
                          belowBarData: BarAreaData(show: true, color: kParentGradient.colors.first.withValues(alpha: 0.08)),
                          spots: [for (int i = 0; i < evolution.length; i++) FlSpot(i.toDouble(), toDouble(evolution[i]['moyenne']))],
                        ),
                      ],
                    ),
                    duration: const Duration(milliseconds: 700),
                  ),
                ),
              ),
            ).animate().fadeIn(delay: 150.ms, duration: 400.ms),
          ],

          const SizedBox(height: 18),
          const Text('Notes par matière', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
          const SizedBox(height: 10),
          if (matieres.isEmpty)
            const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Text('Aucune note pour ce trimestre', style: TextStyle(color: kTextGray)))
          else
            for (int i = 0; i < matieres.length; i++)
              Builder(builder: (context) {
                final m = matieres[i];
                final note = toDoubleOrNull(m['moyenne']);
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(m['nom'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
                              Text('Coeff. ${m['coefficient']}', style: const TextStyle(fontSize: 11.5, color: kTextGray)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(color: _moyColor(note).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                          child: Text(note != null ? '${note.toStringAsFixed(2)}/20' : '—', style: TextStyle(color: _moyColor(note), fontWeight: FontWeight.w800)),
                        ),
                      ],
                    ),
                  ),
                ).animate().fadeIn(delay: (200 + i * 60).ms, duration: 280.ms).slideX(begin: 0.05, end: 0, curve: Curves.easeOutCubic);
              }),

          if (predictif.isNotEmpty) ...[
            const SizedBox(height: 18),
            const Text('Pour progresser', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _predictRow('Pour atteindre 10/20', predictif['pour_avoir_10']),
                    _predictRow('Pour atteindre 12/20', predictif['pour_avoir_12']),
                    _predictRow('Pour atteindre 14/20', predictif['pour_avoir_14']),
                    _predictRow('Pour maintenir la moyenne', predictif['pour_maintenir']),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _predictRow(String label, dynamic value) {
    final v = toDoubleOrNull(value);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13, color: kTextGray))),
          Text(v == null ? 'Impossible' : '${v.toStringAsFixed(1)}/20', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: v == null ? kRed : _moyColor(v))),
        ],
      ),
    );
  }
}
