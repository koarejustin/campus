import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class ProfRessourcesScreen extends StatefulWidget {
  const ProfRessourcesScreen({super.key});

  @override
  State<ProfRessourcesScreen> createState() => _ProfRessourcesScreenState();
}

class _ProfRessourcesScreenState extends State<ProfRessourcesScreen> {
  bool _loading = true;
  List<dynamic> _ressources = [];
  List<String> _classes = [];
  String _typeFilter = 'toutes';

  static const _typeColors = {
    'cours': kGreen, 'td': Color(0xFF0EA5E9), 'exercice': kAmber, 'doc': Color(0xFF7C3AED),
  };

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      final data = await ApiClient.instance.get('/professeurs/mes-classes');
      setState(() => _classes = List<String>.from(data['classes'] ?? []));
    } catch (_) {}
    await _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/professeurs/ressources');
      setState(() => _ressources = data['ressources'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleVisible(dynamic id) async {
    final r = await ApiClient.instance.multipart('/professeurs/ressources/$id/visibilite', {}, method: 'PUT');
    if (r['success'] == true) _load();
  }

  Future<void> _delete(dynamic id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer cette ressource ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Supprimer', style: TextStyle(color: kRed))),
        ],
      ),
    );
    if (confirm == true) {
      await ApiClient.instance.delete('/professeurs/ressources/$id');
      _load();
    }
  }

  Future<void> _open(String? url) async {
    if (url == null || url.isEmpty) return;
    final full = url.startsWith('http') ? url : '${ApiClient.baseUrl.replaceFirst('/api', '')}$url';
    final uri = Uri.tryParse(full);
    if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _openPublishForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _PublishForm(classes: _classes, onSaved: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _typeFilter == 'toutes' ? _ressources : _ressources.where((r) => r['type'] == _typeFilter).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Ressources & Cours')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openPublishForm,
        backgroundColor: kGreen,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Publier'),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
              children: [
                _filterChip('toutes', 'Toutes'),
                _filterChip('cours', '📄 Cours'),
                _filterChip('td', '📝 TD'),
                _filterChip('video', '🎥 Vidéos'),
                _filterChip('doc', '📎 Docs'),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5, itemHeight: 76))
                : filtered.isEmpty
                    ? const Center(child: Text('Aucune ressource dans ce filtre', style: TextStyle(color: kTextGray)))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
                          itemCount: filtered.length,
                          itemBuilder: (context, i) {
                            final r = filtered[i];
                            final visible = r['visible'] == true;
                            final color = _typeColors[r['type']] ?? kTextGray;
                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: ListTile(
                                onTap: () => _open(r['url']),
                                leading: Stack(
                                  children: [
                                    CircleAvatar(backgroundColor: color.withValues(alpha: 0.12), child: Icon(_iconFor(r['type']), color: color, size: 18)),
                                    if (!visible)
                                      Positioned(
                                        right: -2, top: -2,
                                        child: Container(width: 10, height: 10, decoration: const BoxDecoration(color: kRed, shape: BoxShape.circle)),
                                      ),
                                  ],
                                ),
                                title: Text(r['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                subtitle: Text('${r['cls'] ?? ''} · ${r['date'] ?? ''}', style: const TextStyle(fontSize: 11)),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: Icon(visible ? Icons.visibility_rounded : Icons.visibility_off_rounded, size: 18, color: visible ? kGreen : kTextGray),
                                      onPressed: () => _toggleVisible(r['id_ressource']),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline_rounded, size: 18, color: kRed),
                                      onPressed: () => _delete(r['id_ressource']),
                                    ),
                                  ],
                                ),
                              ),
                            ).animate().fadeIn(delay: (i * 60).ms, duration: 250.ms).slideX(begin: 0.05, end: 0, curve: Curves.easeOutCubic);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String value, String label) {
    final selected = _typeFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label, style: const TextStyle(fontSize: 12)),
        selected: selected,
        selectedColor: kGreen,
        labelStyle: TextStyle(color: selected ? Colors.white : kTextDark, fontWeight: FontWeight.w700),
        onSelected: (_) => setState(() => _typeFilter = value),
      ),
    );
  }

  IconData _iconFor(String? type) {
    switch (type) {
      case 'video': return Icons.play_circle_fill_rounded;
      case 'td': return Icons.assignment_rounded;
      case 'exercice': return Icons.edit_note_rounded;
      default: return Icons.description_rounded;
    }
  }
}

class _PublishForm extends StatefulWidget {
  final List<String> classes;
  final VoidCallback onSaved;
  const _PublishForm({required this.classes, required this.onSaved});

  @override
  State<_PublishForm> createState() => _PublishFormState();
}

class _PublishFormState extends State<_PublishForm> {
  PlatformFile? _file;
  final _titreCtrl = TextEditingController();
  String _type = 'cours';
  bool _toutesClasses = true;
  String? _classeCible;
  bool _saving = false;
  String? _error;

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    if (result == null || result.files.isEmpty) return;
    setState(() {
      _file = result.files.first;
      if (_titreCtrl.text.isEmpty) {
        _titreCtrl.text = _file!.name.replaceAll(RegExp(r'\.[^.]+$'), '');
      }
      final ext = (_file!.extension ?? '').toLowerCase();
      if (['mp4', 'webm', 'mov'].contains(ext)) _type = 'video';
      else if (ext == 'pdf') _type = 'cours';
    });
  }

  Future<void> _submit() async {
    if (_titreCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Titre requis');
      return;
    }
    if (!_toutesClasses && _classeCible == null) {
      setState(() => _error = 'Choisis une classe destinataire');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.multipart(
        '/professeurs/ressources',
        {
          'titre': _titreCtrl.text.trim(),
          'type_ressource': _type.toUpperCase(),
          'classe_cible': _toutesClasses ? 'TOUTES' : (_classeCible ?? 'TOUTES'),
        },
        fileField: _file != null ? 'fichier' : null,
        fileBytes: _file?.bytes,
        fileName: _file?.name,
      );
      if (r['success'] == true) {
        widget.onSaved();
        if (mounted) Navigator.pop(context);
      } else {
        setState(() => _error = r['message'] ?? 'Erreur');
      }
    } catch (_) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // ✅ S'ouvre déjà haut (90% de l'écran) pour que tout le formulaire soit
    // visible d'un coup, sans avoir à faire glisser la fenêtre vers le haut.
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.9,
      child: Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            const Text('Publier une ressource', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            InkWell(
              onTap: _pickFile,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  border: Border.all(color: kBorder, width: 1.4),
                  borderRadius: BorderRadius.circular(12),
                  color: kBg,
                ),
                child: Column(
                  children: [
                    Icon(_file != null ? Icons.check_circle_rounded : Icons.cloud_upload_outlined, color: _file != null ? kGreen : kTextGray, size: 28),
                    const SizedBox(height: 8),
                    Text(_file?.name ?? 'Choisir un fichier (optionnel)', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'cours', child: Text('📄 Cours')),
                DropdownMenuItem(value: 'td', child: Text('📝 TD / Exercices')),
                DropdownMenuItem(value: 'exercice', child: Text('✏️ Correction')),
                DropdownMenuItem(value: 'video', child: Text('🎥 Vidéo')),
                DropdownMenuItem(value: 'doc', child: Text('📎 Autre')),
              ],
              onChanged: (v) => setState(() => _type = v ?? 'cours'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Text('Toutes mes classes'),
                    selected: _toutesClasses,
                    selectedColor: kGreen,
                    labelStyle: TextStyle(color: _toutesClasses ? Colors.white : kTextDark, fontSize: 12, fontWeight: FontWeight.w700),
                    onSelected: (_) => setState(() => _toutesClasses = true),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Text('Une classe'),
                    selected: !_toutesClasses,
                    selectedColor: kGreen,
                    labelStyle: TextStyle(color: !_toutesClasses ? Colors.white : kTextDark, fontSize: 12, fontWeight: FontWeight.w700),
                    onSelected: (_) => setState(() => _toutesClasses = false),
                  ),
                ),
              ],
            ),
            if (!_toutesClasses) ...[
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _classeCible,
                decoration: const InputDecoration(labelText: 'Classe destinataire', border: OutlineInputBorder()),
                items: widget.classes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) => setState(() => _classeCible = v),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                style: ElevatedButton.styleFrom(backgroundColor: kGreen, foregroundColor: Colors.white),
                child: _saving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Envoyer aux élèves', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }
}
