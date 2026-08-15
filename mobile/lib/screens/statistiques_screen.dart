import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../utils.dart';
import '../widgets/skeleton.dart';

class StatistiquesScreen extends StatefulWidget {
  const StatistiquesScreen({super.key});

  @override
  State<StatistiquesScreen> createState() => _StatistiquesScreenState();
}

class _StatistiquesScreenState extends State<StatistiquesScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;

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
      final data = await ApiClient.instance.get('/eleves/moyennes-avancees');
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

  Color _moyColor(num? m) {
    if (m == null) return kTextGray;
    if (m >= 14) return kGreen;
    if (m >= 10) return kAmber;
    return kRed;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Statistiques avancées')),
      body: _loading
          ? ListView(
              padding: const EdgeInsets.all(16),
              children: const [Skeleton(height: 110), SizedBox(height: 16), Skeleton(height: 200), SizedBox(height: 16), SkeletonList(count: 3)],
            )
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: kRed)))
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final d = _data!;
    final moyenne = toDoubleOrNull(d['moyenne_generale']);
    final mention = d['mention'] as String?;
    final admis = d['admis'] == true;
    final evolution = (d['evolution_trimestrielle'] as List?) ?? [];
    final predictif = d['predictif'] as Map<String, dynamic>? ?? {};
    final alertes = (d['alertes_baisses'] as List?) ?? [];
    final stats = d['stats'] as Map<String, dynamic>? ?? {};
    final meilleure = stats['meilleure_matiere'] as Map<String, dynamic>?;
    final difficile = stats['matiere_en_difficulte'] as Map<String, dynamic>?;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Bandeau moyenne + mention
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(gradient: kBrandGradient),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Moyenne générale', style: TextStyle(color: Colors.white70, fontSize: 12.5, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(moyenne != null ? '${moyenne.toStringAsFixed(2)}/20' : '—',
                          style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
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
                  height: 170,
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
                          return Padding(padding: const EdgeInsets.only(top: 4), child: Text('T${evolution[i]['trimestre']}', style: const TextStyle(fontSize: 10.5, color: kTextGray, fontWeight: FontWeight.w700)));
                        })),
                      ),
                      lineBarsData: [
                        LineChartBarData(
                          isCurved: true,
                          color: kIndigo,
                          barWidth: 3,
                          dotData: const FlDotData(show: true),
                          belowBarData: BarAreaData(show: true, color: kIndigo.withValues(alpha: 0.08)),
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

          if (alertes.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text('Alertes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
            const SizedBox(height: 10),
            for (int i = 0; i < alertes.length; i++)
              Builder(builder: (context) {
                final a = alertes[i];
                final critique = a['alerte'] == 'CRITIQUE';
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  color: (critique ? kRed : kAmber).withValues(alpha: 0.06),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: (critique ? kRed : kAmber).withValues(alpha: 0.3))),
                  child: ListTile(
                    leading: Icon(Icons.trending_down_rounded, color: critique ? kRed : kAmber),
                    title: Text(a['matiere'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                    subtitle: Text('Baisse de ${a['baisse']} points par rapport au trimestre précédent', style: const TextStyle(fontSize: 12)),
                  ),
                ).animate().fadeIn(delay: (i * 80).ms, duration: 280.ms);
              }),
          ],

          const SizedBox(height: 20),
          const Text('Pour progresser', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
          const SizedBox(height: 10),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (predictif['trimestre_complet'] == true)
                    const Text('Le trimestre est déjà complet — plus de simulation possible.', style: TextStyle(color: kTextGray, fontSize: 13))
                  else ...[
                    _predictRow('Pour atteindre 10/20', predictif['pour_avoir_10']),
                    _predictRow('Pour atteindre 12/20', predictif['pour_avoir_12']),
                    _predictRow('Pour atteindre 14/20', predictif['pour_avoir_14']),
                    _predictRow('Pour maintenir ta moyenne', predictif['pour_maintenir']),
                  ],
                ],
              ),
            ),
          ).animate().fadeIn(delay: 200.ms, duration: 300.ms),

          const SizedBox(height: 20),
          Row(
            children: [
              if (meilleure != null)
                Expanded(
                  child: _highlightCard('Meilleure matière', meilleure['nom'], toDoubleOrNull(meilleure['moyenne']), kGreen),
                ),
              if (meilleure != null && difficile != null) const SizedBox(width: 12),
              if (difficile != null)
                Expanded(
                  child: _highlightCard('À travailler', difficile['nom'], toDoubleOrNull(difficile['moyenne']), kRed),
                ),
            ],
          ),
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
          Text(
            v == null ? 'Impossible' : '${v.toStringAsFixed(1)}/20',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: v == null ? kRed : _moyColor(v)),
          ),
        ],
      ),
    );
  }

  Widget _highlightCard(String label, String? matiere, double? moyenne, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 11.5, color: kTextGray, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(matiere ?? '—', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
            const SizedBox(height: 4),
            Text(moyenne != null ? '${moyenne.toStringAsFixed(2)}/20' : '—', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16)),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 260.ms, duration: 300.ms);
  }
}
