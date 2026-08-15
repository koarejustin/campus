import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../services/api_client.dart';
import '../../../theme.dart';
import '../../../utils.dart';
import '../../../widgets/skeleton.dart';
import 'ape_role.dart';

class ApeDashboardScreen extends StatefulWidget {
  const ApeDashboardScreen({super.key});

  @override
  State<ApeDashboardScreen> createState() => _ApeDashboardScreenState();
}

class _ApeDashboardScreenState extends State<ApeDashboardScreen> {
  bool _loading = true;
  double _totalPaye = 0, _totalDu = 0;
  List<dynamic> _bureau = [];
  List<dynamic> _forum = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/parents/cotisations'),
        ApiClient.instance.get('/ape/bureau'),
        ApiClient.instance.get('/ape/forum'),
      ]);
      final cotisations = results[0];
      final bureau = results[1];
      final forum = results[2];
      final resume = cotisations['resume'] as Map<String, dynamic>? ?? {};
      setState(() {
        _totalPaye = toDouble(resume['total_paye']);
        _totalDu = toDouble(resume['total_du']);
        _bureau = bureau['bureau'] ?? [];
        _forum = (forum['posts'] as List? ?? []).take(3).toList();
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (ApeRole.instance.estMembreBureau)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(gradient: kApeGradient, borderRadius: BorderRadius.circular(14)),
              child: Row(
                children: [
                  const Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Text('Membre du bureau — ${ApeRole.instance.poste}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12.5)),
                ],
              ),
            ).animate().fadeIn(duration: 300.ms),
          if (_loading)
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.7,
              children: List.generate(2, (_) => const Skeleton(height: 90)),
            )
          else
            Row(
              children: [
                Expanded(child: _kpi('Payé (moi)', '${_totalPaye.toStringAsFixed(0)} F', kGreen, Icons.check_circle_rounded)),
                const SizedBox(width: 12),
                Expanded(child: _kpi('Restant dû', '${_totalDu.toStringAsFixed(0)} F', kRed, Icons.schedule_rounded)),
              ],
            ),
          const SizedBox(height: 22),
          const Text('Le bureau', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
          const SizedBox(height: 10),
          if (_loading)
            const SkeletonList(count: 3, itemHeight: 56)
          else if (_bureau.isEmpty)
            const Text('Aucun membre de bureau renseigné', style: TextStyle(color: kTextGray))
          else
            for (int i = 0; i < _bureau.length; i++)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  dense: true,
                  leading: CircleAvatar(
                    backgroundColor: kApeGradient.colors.first.withValues(alpha: 0.12),
                    child: Text((_bureau[i]['prenom'] ?? '?').toString().isNotEmpty ? _bureau[i]['prenom'][0] : '?', style: TextStyle(color: kApeGradient.colors.first, fontWeight: FontWeight.w800)),
                  ),
                  title: Text('${_bureau[i]['prenom'] ?? ''} ${_bureau[i]['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  subtitle: Text(_bureau[i]['poste'] ?? '', style: const TextStyle(fontSize: 11.5)),
                ),
              ).animate().fadeIn(delay: (i * 60).ms, duration: 260.ms),
          if (!_loading && _forum.isNotEmpty) ...[
            const SizedBox(height: 22),
            const Text('Derniers messages du forum', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
            const SizedBox(height: 10),
            for (final p in _forum)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  dense: true,
                  leading: const CircleAvatar(backgroundColor: kBg, child: Icon(Icons.forum_rounded, color: Color(0xFFDB2777), size: 18)),
                  title: Text('${p['prenom'] ?? ''} ${p['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                  subtitle: Text(p['contenu'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _kpi(String label, String value, Color color, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
            Text(label, style: const TextStyle(fontSize: 10.5, color: kTextGray, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
