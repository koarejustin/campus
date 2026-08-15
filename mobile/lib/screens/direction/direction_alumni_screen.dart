import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class DirectionAlumniScreen extends StatefulWidget {
  const DirectionAlumniScreen({super.key});

  @override
  State<DirectionAlumniScreen> createState() => _DirectionAlumniScreenState();
}

class _DirectionAlumniScreenState extends State<DirectionAlumniScreen> {
  bool _loading = true;
  List<dynamic> _alumni = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/alumni');
      setState(() => _alumni = data['alumni'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Alumni')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 8))
          : RefreshIndicator(
              onRefresh: _load,
              child: _alumni.isEmpty
                  ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: const [Padding(padding: EdgeInsets.only(top: 80), child: Center(child: Text('Aucun alumni', style: TextStyle(color: kTextGray))))])
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
                      itemCount: _alumni.length,
                      itemBuilder: (context, i) {
                        final a = _alumni[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(backgroundColor: kAlumniGradient.colors.first.withValues(alpha: 0.1), child: Text((a['prenom'] ?? '?').toString().isNotEmpty ? a['prenom'][0] : '?', style: TextStyle(color: kAlumniGradient.colors.first, fontWeight: FontWeight.w800))),
                            title: Text('${a['prenom'] ?? ''} ${a['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                            subtitle: Text([
                              if ((a['profession'] ?? '').toString().isNotEmpty) a['profession'],
                              if ((a['derniere_classe'] ?? '').toString().isNotEmpty) 'Promo ${a['annee_diplome'] ?? ''} (${a['derniere_classe']})',
                            ].where((s) => s != null && s.toString().isNotEmpty).join(' · '), style: const TextStyle(fontSize: 11.5)),
                          ),
                        ).animate().fadeIn(duration: 200.ms, delay: (i * 20).ms);
                      },
                    ),
            ),
    );
  }
}
