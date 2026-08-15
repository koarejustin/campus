import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';
import 'note_entry_screen.dart';

class NotesScreen extends StatefulWidget {
  const NotesScreen({super.key});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  int _trimestre = 1;
  List<String> _classes = [];
  String? _classeSel;
  bool _loadingClasses = true;
  bool _loadingEleves = false;
  List<dynamic> _eleves = [];
  final _searchCtrl = TextEditingController();
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadClasses();
    _searchCtrl.addListener(() => setState(() => _search = _searchCtrl.text.trim().toLowerCase()));
  }

  Future<void> _loadClasses() async {
    setState(() => _loadingClasses = true);
    try {
      final data = await ApiClient.instance.get('/professeurs/mes-classes');
      final classes = List<String>.from(data['classes'] ?? []);
      setState(() {
        _classes = classes;
        _classeSel = classes.isNotEmpty ? classes.first : null;
      });
      if (_classeSel != null) await _loadEleves();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingClasses = false);
    }
  }

  Future<void> _loadEleves() async {
    if (_classeSel == null) return;
    setState(() => _loadingEleves = true);
    try {
      final data = await ApiClient.instance.get('/professeurs/eleves?classe=${Uri.encodeQueryComponent(_classeSel!)}&trimestre=$_trimestre');
      setState(() => _eleves = data['eleves'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingEleves = false);
    }
  }

  Color _moyColor(double? m) {
    if (m == null) return kTextGray;
    return m >= 10 ? kGreen : kRed;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _search.isEmpty
        ? _eleves
        : _eleves.where((e) {
            final full = '${e['prenom']} ${e['nom']} ${e['code_unique']}'.toLowerCase();
            return full.contains(_search);
          }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Saisie des notes')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [1, 2, 3].map((t) {
                final selected = t == _trimestre;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text('Trimestre $t'),
                    selected: selected,
                    selectedColor: kGreen,
                    labelStyle: TextStyle(color: selected ? Colors.white : kTextDark, fontWeight: FontWeight.w700),
                    onSelected: (_) {
                      setState(() => _trimestre = t);
                      _loadEleves();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          if (_loadingClasses)
            const Padding(padding: EdgeInsets.all(16), child: Skeleton(height: 40))
          else if (_classes.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('Aucune classe assignée pour le moment', style: TextStyle(color: kTextGray)),
            )
          else ...[
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: _classes.map((c) {
                  final selected = c == _classeSel;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(c),
                      selected: selected,
                      selectedColor: kIndigo,
                      labelStyle: TextStyle(color: selected ? Colors.white : kTextDark, fontWeight: FontWeight.w700, fontSize: 12.5),
                      onSelected: (_) {
                        setState(() => _classeSel = c);
                        _loadEleves();
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
              child: TextField(
                controller: _searchCtrl,
                decoration: InputDecoration(
                  hintText: 'Rechercher un élève...',
                  prefixIcon: const Icon(Icons.search_rounded, size: 20),
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kBorder)),
                ),
              ),
            ),
            Expanded(
              child: _loadingEleves
                  ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 8, itemHeight: 60))
                  : filtered.isEmpty
                      ? const Center(child: Text('Aucun élève trouvé', style: TextStyle(color: kTextGray)))
                      : RefreshIndicator(
                          onRefresh: _loadEleves,
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                            itemCount: filtered.length,
                            itemBuilder: (context, i) {
                              final e = filtered[i];
                              final moy = toDoubleOrNull(e['moyenne']);
                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: kIndigo.withValues(alpha: 0.12),
                                    child: Text(
                                      '${(e['prenom'] ?? '?').toString().isNotEmpty ? e['prenom'][0] : '?'}',
                                      style: const TextStyle(color: kIndigo, fontWeight: FontWeight.w800),
                                    ),
                                  ),
                                  title: Text('${e['prenom'] ?? ''} ${e['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                                  subtitle: Text(e['code_unique'] ?? '', style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
                                  trailing: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                    decoration: BoxDecoration(color: _moyColor(moy).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                                    child: Text(
                                      moy != null ? '${moy.toStringAsFixed(1)}/20' : '—',
                                      style: TextStyle(color: _moyColor(moy), fontWeight: FontWeight.w800, fontSize: 12),
                                    ),
                                  ),
                                  onTap: () async {
                                    await Navigator.of(context).push(MaterialPageRoute(
                                      builder: (_) => NoteEntryScreen(
                                        eleve: e,
                                        classe: _classeSel!,
                                        trimestre: _trimestre,
                                      ),
                                    ));
                                    _loadEleves();
                                  },
                                ),
                              ).animate().fadeIn(delay: (i * 40).ms, duration: 220.ms).slideX(begin: 0.05, end: 0, curve: Curves.easeOutCubic);
                            },
                          ),
                        ),
            ),
          ],
        ],
      ),
    );
  }
}
