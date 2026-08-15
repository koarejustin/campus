import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../role_select_screen.dart';

const _kClassesConnues = ['6ème', '5ème', '4ème', '3ème', '2nde A', '2nde C', '1ère A', '1ère D', 'Tle A', 'Tle D'];

class ProfProfilScreen extends StatefulWidget {
  const ProfProfilScreen({super.key});

  @override
  State<ProfProfilScreen> createState() => _ProfProfilScreenState();
}

class _ProfProfilScreenState extends State<ProfProfilScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;

  final _prenomCtrl = TextEditingController();
  final _nomCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _telCtrl = TextEditingController();
  final _specialiteCtrl = TextEditingController();
  final _diplomeCtrl = TextEditingController();
  final _anneesCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  final _matiereInputCtrl = TextEditingController();

  List<String> _matieres = [];
  Set<String> _classes = {};
  String? _photoUrl;
  List<int>? _newPhotoBytes;
  String? _newPhotoName;
  String _codeUnique = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/professeurs/profil');
      final p = data['profil'] as Map<String, dynamic>? ?? {};
      _prenomCtrl.text = p['prenom'] ?? '';
      _nomCtrl.text = p['nom'] ?? '';
      _emailCtrl.text = p['email'] ?? '';
      _telCtrl.text = p['telephone'] ?? '';
      _specialiteCtrl.text = p['specialite'] ?? '';
      _diplomeCtrl.text = p['diplome'] ?? '';
      _anneesCtrl.text = toInt(p['annees_exp']) > 0 ? toInt(p['annees_exp']).toString() : '';
      _bioCtrl.text = p['biographie'] ?? '';
      _matieres = List<String>.from(p['matieres'] ?? []);
      _classes = Set<String>.from(p['classes'] ?? []);
      _photoUrl = p['photo_url'];
      _codeUnique = p['code_unique'] ?? '';
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final x = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85, maxWidth: 800);
    if (x == null) return;
    final bytes = await x.readAsBytes();
    setState(() {
      _newPhotoBytes = bytes;
      _newPhotoName = x.name;
    });
  }

  void _addMatiere(String raw) {
    final v = raw.trim();
    if (v.isEmpty) return;
    if (!_matieres.contains(v)) setState(() => _matieres.add(v));
    _matiereInputCtrl.clear();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final r = await ApiClient.instance.multipart(
        '/professeurs/profil',
        {
          'nom': _nomCtrl.text.trim(),
          'prenom': _prenomCtrl.text.trim(),
          'email': _emailCtrl.text.trim(),
          'telephone': _telCtrl.text.trim(),
          'specialite': _specialiteCtrl.text.trim(),
          'biographie': _bioCtrl.text.trim(),
          'annees_exp': _anneesCtrl.text.trim(),
          'diplome': _diplomeCtrl.text.trim(),
          'matieres': _matieres.join(','),
          'classes': _classes.join(','),
        },
        method: 'PUT',
        fileField: _newPhotoBytes != null ? 'photo' : null,
        fileBytes: _newPhotoBytes,
        fileName: _newPhotoName,
      );
      if (r['success'] == true) {
        setState(() {
          _photoUrl = r['photo_url'] ?? _photoUrl;
          _newPhotoBytes = null;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profil mis à jour'), backgroundColor: kGreen));
        }
      } else {
        setState(() => _error = r['message'] ?? 'Erreur');
      }
    } catch (_) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _logout() async {
    await ApiClient.instance.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const RoleSelectScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mon profil'), actions: [
        IconButton(onPressed: _logout, icon: const Icon(Icons.logout_rounded, color: kRed)),
      ]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Center(
                  child: Stack(
                    children: [
                      Container(
                        width: 92, height: 92,
                        decoration: BoxDecoration(
                          gradient: kProfGradient, shape: BoxShape.circle,
                          image: _newPhotoBytes != null
                              ? DecorationImage(image: MemoryImage(Uint8List.fromList(_newPhotoBytes!)), fit: BoxFit.cover)
                              : (_photoUrl != null && _photoUrl!.isNotEmpty)
                                  ? DecorationImage(image: NetworkImage('${ApiClient.baseUrl.replaceFirst('/api', '')}$_photoUrl'), fit: BoxFit.cover)
                                  : null,
                        ),
                        alignment: Alignment.center,
                        child: (_newPhotoBytes == null && (_photoUrl == null || _photoUrl!.isEmpty))
                            ? Text(_prenomCtrl.text.isNotEmpty ? _prenomCtrl.text[0].toUpperCase() : '?',
                                style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w900))
                            : null,
                      ),
                      Positioned(
                        right: 0, bottom: 0,
                        child: InkWell(
                          onTap: _pickPhoto,
                          child: Container(
                            width: 30, height: 30,
                            decoration: BoxDecoration(color: kIndigo, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                            alignment: Alignment.center,
                            child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 15),
                          ),
                        ),
                      ),
                    ],
                  ),
                ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack, begin: const Offset(0.6, 0.6), end: const Offset(1, 1)).fadeIn(duration: 300.ms),
                const SizedBox(height: 10),
                Center(child: Text(_codeUnique, style: const TextStyle(color: kTextGray, fontSize: 12, fontFamily: 'monospace'))),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(child: _miniStat('Classes', '${_classes.length}')),
                    const SizedBox(width: 10),
                    Expanded(child: _miniStat('Matières', '${_matieres.length}')),
                    const SizedBox(width: 10),
                    Expanded(child: _miniStat('Exp.', _anneesCtrl.text.isEmpty ? '—' : '${_anneesCtrl.text} an(s)')),
                  ],
                ).animate().fadeIn(delay: 100.ms, duration: 300.ms),
                const SizedBox(height: 22),
                _sectionTitle('Informations'),
                Row(children: [
                  Expanded(child: _field(_prenomCtrl, 'Prénom')),
                  const SizedBox(width: 10),
                  Expanded(child: _field(_nomCtrl, 'Nom')),
                ]),
                const SizedBox(height: 10),
                _field(_emailCtrl, 'Email'),
                const SizedBox(height: 10),
                _field(_telCtrl, 'Téléphone'),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: _field(_specialiteCtrl, 'Spécialité')),
                  const SizedBox(width: 10),
                  Expanded(child: _field(_diplomeCtrl, 'Diplôme')),
                ]),
                const SizedBox(height: 10),
                _field(_anneesCtrl, "Années d'expérience", keyboard: TextInputType.number),
                const SizedBox(height: 10),
                _field(_bioCtrl, 'Biographie', maxLines: 3),
                const SizedBox(height: 22),
                _sectionTitle('Matières enseignées'),
                Wrap(
                  spacing: 6, runSpacing: 6,
                  children: [
                    for (final m in _matieres)
                      Chip(
                        label: Text(m, style: const TextStyle(fontSize: 12)),
                        onDeleted: () => setState(() => _matieres.remove(m)),
                        backgroundColor: kGreen.withValues(alpha: 0.1),
                        side: BorderSide.none,
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _matiereInputCtrl,
                  decoration: InputDecoration(
                    hintText: 'Ajouter une matière puis Entrée',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    suffixIcon: IconButton(icon: const Icon(Icons.add_rounded), onPressed: () => _addMatiere(_matiereInputCtrl.text)),
                  ),
                  onSubmitted: _addMatiere,
                ),
                const SizedBox(height: 22),
                _sectionTitle('Classes attribuées'),
                Wrap(
                  spacing: 6, runSpacing: 6,
                  children: _kClassesConnues.map((c) {
                    final selected = _classes.contains(c);
                    return FilterChip(
                      label: Text(c, style: const TextStyle(fontSize: 12)),
                      selected: selected,
                      selectedColor: kIndigo,
                      labelStyle: TextStyle(color: selected ? Colors.white : kTextDark, fontWeight: FontWeight.w700),
                      onSelected: (v) => setState(() => v ? _classes.add(c) : _classes.remove(c)),
                    );
                  }).toList(),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 14),
                  Text(_error!, style: const TextStyle(color: kRed, fontSize: 13)),
                ],
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    style: ElevatedButton.styleFrom(backgroundColor: kGreen, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    child: _saving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Enregistrer', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ),
                const SizedBox(height: 28),
              ],
            ),
    );
  }

  Widget _sectionTitle(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(t, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kTextDark)),
      );

  Widget _miniStat(String label, String value) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: kGreen)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 10.5, color: kTextGray, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, {int maxLines = 1, TextInputType? keyboard}) {
    return TextField(
      controller: ctrl,
      maxLines: maxLines,
      keyboardType: keyboard,
      decoration: InputDecoration(labelText: label, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
    );
  }
}
