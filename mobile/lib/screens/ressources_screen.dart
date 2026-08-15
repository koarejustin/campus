import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/skeleton.dart';

class RessourcesScreen extends StatefulWidget {
  const RessourcesScreen({super.key});

  @override
  State<RessourcesScreen> createState() => _RessourcesScreenState();
}

class _RessourcesScreenState extends State<RessourcesScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _ressources = [];

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
      final data = await ApiClient.instance.get('/eleves/ressources');
      if (data['success'] == true) {
        setState(() => _ressources = data['ressources'] ?? []);
      } else {
        setState(() => _error = data['message'] ?? 'Erreur de chargement');
      }
    } catch (e) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  IconData _iconFor(String? type) {
    switch (type) {
      case 'video':
        return Icons.play_circle_fill_rounded;
      case 'pdf':
        return Icons.picture_as_pdf_rounded;
      case 'lien':
      case 'link':
        return Icons.link_rounded;
      default:
        return Icons.description_rounded;
    }
  }

  Future<void> _open(String url) async {
    if (url.isEmpty) return;
    final full = url.startsWith('http') ? url : '${ApiClient.baseUrl.replaceFirst('/api', '')}$url';
    final uri = Uri.tryParse(full);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ressources')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6, itemHeight: 76))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: kRed)))
              : _ressources.isEmpty
                  ? const Center(child: Text('Aucune ressource pour le moment', style: TextStyle(color: kTextGray)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _ressources.length,
                        itemBuilder: (context, i) {
                          final r = _ressources[i];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: ListTile(
                              onTap: () => _open(r['url'] ?? ''),
                              leading: CircleAvatar(
                                backgroundColor: kIndigo.withValues(alpha: 0.12),
                                child: Icon(_iconFor(r['type']), color: kIndigo, size: 20),
                              ),
                              title: Text(r['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text('${r['prof_prenom'] ?? ''} ${r['prof_nom'] ?? ''}'.trim(), style: const TextStyle(fontSize: 12)),
                              trailing: const Icon(Icons.open_in_new_rounded, color: kTextGray, size: 18),
                            ),
                          ).animate().fadeIn(delay: (i * 60).ms, duration: 280.ms).slideX(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
                        },
                      ),
                    ),
    );
  }
}
