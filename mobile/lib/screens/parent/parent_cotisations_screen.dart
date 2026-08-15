import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';

class ParentCotisationsScreen extends StatefulWidget {
  const ParentCotisationsScreen({super.key});

  @override
  State<ParentCotisationsScreen> createState() => _ParentCotisationsScreenState();
}

class _ParentCotisationsScreenState extends State<ParentCotisationsScreen> {
  bool _loading = true;
  List<dynamic> _cotisations = [];
  double _totalPaye = 0, _totalDu = 0, _totalGeneral = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/parents/cotisations');
      final resume = data['resume'] as Map<String, dynamic>? ?? {};
      setState(() {
        _cotisations = data['cotisations'] ?? [];
        _totalPaye = toDouble(resume['total_paye']);
        _totalDu = toDouble(resume['total_du']);
        _totalGeneral = toDouble(resume['total_general']);
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _fmtMontant(dynamic v) => '${toDouble(v).toStringAsFixed(0)} FCFA';

  Color _statutColor(String? s) {
    switch (s) {
      case 'PAYE': return kGreen;
      case 'ANNULE': return kTextGray;
      default: return kAmber;
    }
  }

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cotisations APE')),
      body: _loading
          ? ListView(padding: const EdgeInsets.all(16), children: const [Skeleton(height: 100), SizedBox(height: 16), SkeletonList(count: 5)])
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    children: [
                      Expanded(child: _kpi('Payé', _totalPaye, kGreen)),
                      const SizedBox(width: 10),
                      Expanded(child: _kpi('Restant dû', _totalDu, kRed)),
                      const SizedBox(width: 10),
                      Expanded(child: _kpi('Total annuel', _totalGeneral, kTextDark)),
                    ],
                  ).animate().fadeIn(duration: 300.ms),
                  const SizedBox(height: 20),
                  const Text('Historique', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
                  const SizedBox(height: 10),
                  if (_cotisations.isEmpty)
                    const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: Text('Aucune cotisation enregistrée', style: TextStyle(color: kTextGray)))),
                  for (int i = 0; i < _cotisations.length; i++)
                    Builder(builder: (context) {
                      final c = _cotisations[i];
                      final color = _statutColor(c['statut_paiement']);
                      final paye = c['statut_paiement'] == 'PAYE';
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(backgroundColor: color.withValues(alpha: 0.12), child: Icon(paye ? Icons.check_circle_rounded : Icons.schedule_rounded, color: color, size: 20)),
                          title: Text(c['motif_cotisation'] ?? 'Cotisation', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                          subtitle: Text('${c['prenom_enfant'] ?? ''} ${c['nom_enfant'] ?? ''} · ${_formatDate(c['date_cotisation'])}', style: const TextStyle(fontSize: 11.5)),
                          trailing: Text(_fmtMontant(c['montant']), style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 13)),
                        ),
                      ).animate().fadeIn(delay: (i * 60).ms, duration: 250.ms).slideX(begin: 0.05, end: 0, curve: Curves.easeOutCubic);
                    }),
                ],
              ),
            ),
    );
  }

  Widget _kpi(String label, double value, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        child: Column(
          children: [
            Text(value.toStringAsFixed(0), style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: color)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 10, color: kTextGray, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
