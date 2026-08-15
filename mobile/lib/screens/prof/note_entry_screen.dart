import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';

class NoteEntryScreen extends StatefulWidget {
  final Map eleve;
  final String classe;
  final int trimestre;
  const NoteEntryScreen({super.key, required this.eleve, required this.classe, required this.trimestre});

  @override
  State<NoteEntryScreen> createState() => _NoteEntryScreenState();
}

class _TypeEval {
  static const devoir1 = 'DEVOIR1';
  static const devoir2 = 'DEVOIR2';
  static const composition = 'COMPOSITION';
  static const options = {devoir1: 'Devoir 1', devoir2: 'Devoir 2', composition: 'Composition'};
}

class _NoteEntryScreenState extends State<NoteEntryScreen> {
  bool _loading = true;
  List<dynamic> _matieres = [];
  final Map<int, TextEditingController> _ctrls = {};
  final Map<int, String> _types = {};
  final Map<int, int> _shakeTriggers = {};
  bool _saving = false;
  bool _saved = false;

  bool _scanOpen = false;
  int? _scanMatiereId;
  String? _scanFileName;
  List<int>? _scanBytes;
  bool _envoyerEleve = true;
  bool _scanSending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in _ctrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/professeurs/mes-matieres?classe=${Uri.encodeQueryComponent(widget.classe)}');
      final matieres = (data['matieres'] as List?) ?? [];
      for (final m in matieres) {
        final id = toInt(m['id_matiere']);
        _ctrls[id] = TextEditingController();
        _types[id] = _TypeEval.devoir1;
        _shakeTriggers[id] = 0;
      }
      setState(() {
        _matieres = matieres;
        if (matieres.isNotEmpty) _scanMatiereId = toInt(matieres.first['id_matiere']);
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  ({String label, Color color}) _mention(double note) {
    if (note >= 16) return (label: 'Excellent', color: kGreen);
    if (note >= 14) return (label: 'Très bien', color: kGreen);
    if (note >= 12) return (label: 'Bien', color: const Color(0xFF0EA5E9));
    if (note >= 10) return (label: 'Assez bien', color: kAmber);
    if (note >= 8) return (label: 'Passable', color: const Color(0xFFF97316));
    return (label: 'Insuffisant', color: kRed);
  }

  void _onNoteChanged(int idMatiere, String raw) {
    final v = double.tryParse(raw.replaceAll(',', '.'));
    if (v != null && (v > 20 || v < 0)) {
      setState(() => _shakeTriggers[idMatiere] = (_shakeTriggers[idMatiere] ?? 0) + 1);
      final clamped = v.clamp(0, 20).toString();
      Future.microtask(() {
        _ctrls[idMatiere]?.text = clamped;
        _ctrls[idMatiere]?.selection = TextSelection.collapsed(offset: clamped.length);
      });
    } else {
      setState(() {});
    }
  }

  Future<void> _submit() async {
    final notes = <Map<String, dynamic>>[];
    for (final m in _matieres) {
      final id = toInt(m['id_matiere']);
      final raw = _ctrls[id]?.text.trim() ?? '';
      if (raw.isEmpty) continue;
      final v = double.tryParse(raw.replaceAll(',', '.'));
      if (v == null) continue;
      notes.add({
        'id_eleve': widget.eleve['id_user'],
        'id_matiere': id,
        'note': v.clamp(0, 20),
        'type_evaluation': _types[id],
      });
    }
    if (notes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Renseigne au moins une note avant de valider')));
      return;
    }
    setState(() => _saving = true);
    try {
      final r = await ApiClient.instance.post('/professeurs/notes', {
        'notes': notes,
        'trimestre': widget.trimestre,
      });
      if (r['success'] == true) {
        setState(() => _saved = true);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['message'] ?? 'Notes enregistrées'), backgroundColor: kGreen));
        }
        Timer(const Duration(milliseconds: 1400), () {
          if (mounted) setState(() => _saved = false);
        });
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['message'] ?? 'Erreur'), backgroundColor: kRed));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur réseau'), backgroundColor: kRed));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickCamera() async {
    final picker = ImagePicker();
    final x = await picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (x == null) return;
    final bytes = await x.readAsBytes();
    setState(() {
      _scanBytes = bytes;
      _scanFileName = x.name;
    });
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png']);
    if (result == null || result.files.isEmpty) return;
    final f = result.files.first;
    if (f.bytes == null) return;
    setState(() {
      _scanBytes = f.bytes;
      _scanFileName = f.name;
    });
  }

  Future<void> _sendScan() async {
    if (_scanBytes == null || _scanMatiereId == null) return;
    setState(() => _scanSending = true);
    try {
      final r = await ApiClient.instance.multipart(
        '/professeurs/copies-scannees',
        {
          'id_eleve': widget.eleve['id_user'].toString(),
          'id_matiere': _scanMatiereId.toString(),
          'trimestre': widget.trimestre.toString(),
          'visible_eleve': _envoyerEleve.toString(),
        },
        fileField: 'scan',
        fileBytes: _scanBytes,
        fileName: _scanFileName,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(r['message'] ?? (r['success'] == true ? 'Copie envoyée' : 'Erreur')),
          backgroundColor: r['success'] == true ? kGreen : kRed,
        ));
      }
      if (r['success'] == true) {
        setState(() {
          _scanBytes = null;
          _scanFileName = null;
          _scanOpen = false;
        });
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur réseau'), backgroundColor: kRed));
    } finally {
      if (mounted) setState(() => _scanSending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final prenom = widget.eleve['prenom'] ?? '';
    final nom = widget.eleve['nom'] ?? '';
    final code = widget.eleve['code_unique'] ?? '';
    final moy = toDoubleOrNull(widget.eleve['moyenne']);

    return Scaffold(
      appBar: AppBar(title: Text('$prenom $nom')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: kIndigo.withValues(alpha: 0.12),
                              child: Text(prenom.isNotEmpty ? prenom[0] : '?', style: const TextStyle(color: kIndigo, fontWeight: FontWeight.w800)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('$prenom $nom', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                  Text('$code · ${widget.classe}', style: const TextStyle(fontSize: 11.5, color: kTextGray)),
                                ],
                              ),
                            ),
                            if (moy != null)
                              Text('${moy.toStringAsFixed(2)}/20', style: TextStyle(fontWeight: FontWeight.w800, color: moy >= 10 ? kGreen : kRed)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_matieres.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: Text('Aucune matière trouvée pour ton profil sur cette classe', style: TextStyle(color: kTextGray))),
                      )
                    else
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        childAspectRatio: 0.78,
                        mainAxisSpacing: 12, crossAxisSpacing: 12,
                        children: [for (int i = 0; i < _matieres.length; i++) _subjectCard(i)],
                      ),
                    const SizedBox(height: 20),
                    InkWell(
                      onTap: () => setState(() => _scanOpen = !_scanOpen),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          border: Border.all(color: kBorder, style: BorderStyle.solid, width: 1.4),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.document_scanner_outlined, color: kTextGray, size: 18),
                            const SizedBox(width: 8),
                            const Expanded(child: Text('Scanner la copie corrigée (optionnel)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13))),
                            Icon(_scanOpen ? Icons.expand_less_rounded : Icons.expand_more_rounded, color: kTextGray),
                          ],
                        ),
                      ),
                    ),
                    if (_scanOpen) ...[
                      const SizedBox(height: 12),
                      _scanSection(),
                    ],
                    const SizedBox(height: 90),
                  ],
                ),
                Positioned(
                  left: 16, right: 16, bottom: 16,
                  child: SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _saved ? kGreen : kIndigo,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 4,
                      ),
                      child: _saving
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : _saved
                              ? const Icon(Icons.check_rounded).animate().scale(duration: 300.ms, curve: Curves.easeOutBack)
                              : const Text('Valider', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _subjectCard(int index) {
    final m = _matieres[index];
    final id = toInt(m['id_matiere']);
    final coef = toInt(m['coefficient']);
    final ctrl = _ctrls[id]!;
    final v = double.tryParse(ctrl.text.replaceAll(',', '.'));
    final mention = v != null ? _mention(v.clamp(0, 20)) : null;

    return KeyedSubtree(
      key: ValueKey('${id}_${_shakeTriggers[id]}'),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(child: Text(m['nom_matiere'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5), maxLines: 1, overflow: TextOverflow.ellipsis)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: kIndigo.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                    child: Text('×$coef', style: const TextStyle(color: kIndigo, fontSize: 10, fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _types[id],
                  isExpanded: true,
                  style: const TextStyle(fontSize: 11, color: kTextDark),
                  items: _TypeEval.options.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                  onChanged: (v) => setState(() => _types[id] = v ?? _TypeEval.devoir1),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: ctrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                decoration: InputDecoration(
                  hintText: '—/20',
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: mention?.color ?? kBorder)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: mention?.color ?? kBorder)),
                ),
                onChanged: (t) => _onNoteChanged(id, t),
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: v != null ? (v.clamp(0, 20) / 20) : 0),
                  duration: const Duration(milliseconds: 350),
                  builder: (context, val, _) => LinearProgressIndicator(
                    value: val, minHeight: 6,
                    backgroundColor: kBg,
                    valueColor: AlwaysStoppedAnimation(mention?.color ?? kBorder),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                mention?.label ?? ' ',
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: mention?.color ?? kTextGray),
              ),
            ],
          ),
        ),
      ).animate(target: (_shakeTriggers[id] ?? 0) > 0 ? 1 : 0).shake(hz: 4, curve: Curves.easeInOut, duration: 350.ms),
    );
  }

  Widget _scanSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Matière', style: TextStyle(fontSize: 11.5, color: kTextGray, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            DropdownButtonHideUnderline(
              child: DropdownButton<int>(
                value: _scanMatiereId,
                isExpanded: true,
                items: _matieres.map((m) => DropdownMenuItem(value: toInt(m['id_matiere']), child: Text(m['nom_matiere'] ?? ''))).toList(),
                onChanged: (v) => setState(() => _scanMatiereId = v),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickCamera,
                    icon: const Icon(Icons.photo_camera_rounded, size: 18),
                    label: const Text('Prendre une photo', style: TextStyle(fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickFile,
                    icon: const Icon(Icons.attach_file_rounded, size: 18),
                    label: const Text('Choisir un fichier', style: TextStyle(fontSize: 12)),
                  ),
                ),
              ],
            ),
            if (_scanFileName != null) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.insert_drive_file_rounded, size: 16, color: kIndigo),
                  const SizedBox(width: 6),
                  Expanded(child: Text(_scanFileName!, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis)),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 16),
                    onPressed: () => setState(() { _scanBytes = null; _scanFileName = null; }),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: RadioListTile<bool>(
                    value: true, groupValue: _envoyerEleve,
                    dense: true, contentPadding: EdgeInsets.zero,
                    title: const Text('Envoyer à l\'élève', style: TextStyle(fontSize: 11.5)),
                    onChanged: (v) => setState(() => _envoyerEleve = v ?? true),
                  ),
                ),
                Expanded(
                  child: RadioListTile<bool>(
                    value: false, groupValue: _envoyerEleve,
                    dense: true, contentPadding: EdgeInsets.zero,
                    title: const Text('Garder pour moi', style: TextStyle(fontSize: 11.5)),
                    onChanged: (v) => setState(() => _envoyerEleve = v ?? true),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_scanBytes == null || _scanSending) ? null : _sendScan,
                style: ElevatedButton.styleFrom(backgroundColor: kGreen, foregroundColor: Colors.white),
                child: _scanSending
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Envoyer la copie'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
