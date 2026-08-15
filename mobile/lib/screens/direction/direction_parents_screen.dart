import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class DirectionParentsScreen extends StatefulWidget {
  const DirectionParentsScreen({super.key});

  @override
  State<DirectionParentsScreen> createState() => _DirectionParentsScreenState();
}

class _DirectionParentsScreenState extends State<DirectionParentsScreen> {
  bool _loading = true;
  List<dynamic> _parents = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/parents');
      setState(() => _parents = data['parents'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Parents')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 8))
          : RefreshIndicator(
              onRefresh: _load,
              child: _parents.isEmpty
                  ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: const [Padding(padding: EdgeInsets.only(top: 80), child: Center(child: Text('Aucun parent', style: TextStyle(color: kTextGray))))])
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
                      itemCount: _parents.length,
                      itemBuilder: (context, i) {
                        final p = _parents[i];
                        final enfants = (p['enfants'] ?? '').toString();
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(backgroundColor: kParentGradient.colors.first.withValues(alpha: 0.1), child: Text((p['prenom'] ?? '?').toString().isNotEmpty ? p['prenom'][0] : '?', style: TextStyle(color: kParentGradient.colors.first, fontWeight: FontWeight.w800))),
                            title: Text('${p['prenom'] ?? ''} ${p['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                            subtitle: Text(enfants.isNotEmpty ? 'Enfant(s) : $enfants' : 'Aucun enfant lié', style: const TextStyle(fontSize: 11.5)),
                            trailing: Text('${p['nb_enfants'] ?? 0}', style: TextStyle(fontWeight: FontWeight.w800, color: kParentGradient.colors.first)),
                          ),
                        ).animate().fadeIn(duration: 200.ms, delay: (i * 20).ms);
                      },
                    ),
            ),
    );
  }
}
