import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/skeleton.dart';

class CompositionsScreen extends StatefulWidget {
  const CompositionsScreen({super.key});

  @override
  State<CompositionsScreen> createState() => _CompositionsScreenState();
}

class _CompositionsScreenState extends State<CompositionsScreen> {
  bool _loading = true;
  List<dynamic> _compositions = [];
  List<dynamic> _examens = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/eleves/compositions');
      setState(() {
        _compositions = data['compositions'] ?? [];
        _examens = data['examensBlancs'] ?? [];
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _card(Map item, int i, Color color) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: color.withValues(alpha: 0.12), child: Icon(Icons.edit_note_rounded, color: color, size: 20)),
        title: Text(item['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text('${item['date_debut_fr'] ?? ''} → ${item['date_fin_fr'] ?? ''}', style: const TextStyle(fontSize: 12)),
      ),
    ).animate().fadeIn(delay: (i * 60).ms, duration: 280.ms).slideX(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Compositions')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 4, itemHeight: 76))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text('Compositions', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
                  const SizedBox(height: 10),
                  if (_compositions.isEmpty) const Text('Aucune composition programmée', style: TextStyle(color: kTextGray)),
                  for (int i = 0; i < _compositions.length; i++) _card(_compositions[i], i, kIndigo),
                  if (_examens.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Text('Examens blancs', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
                    const SizedBox(height: 10),
                    for (int i = 0; i < _examens.length; i++) _card(_examens[i], i, kAmber),
                  ],
                ],
              ),
            ),
    );
  }
}
