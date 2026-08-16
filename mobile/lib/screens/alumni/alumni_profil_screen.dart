import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../role_select_screen.dart';

class AlumniProfilScreen extends StatefulWidget {
  const AlumniProfilScreen({super.key});

  @override
  State<AlumniProfilScreen> createState() => _AlumniProfilScreenState();
}

class _AlumniProfilScreenState extends State<AlumniProfilScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;
  Map<String, dynamic>? _profil;
  String? _photoUrl;
  bool _disponibleMentorat = true;
  List<String> _competences = [];
  final _competenceCtrl = TextEditingController();

  final _posteCtrl = TextEditingController();
  final _entrepriseCtrl = TextEditingController();
  final _telCtrl = TextEditingController();
  final _villeCtrl = TextEditingController();
  final _domaineCtrl = TextEditingController();
  final _secteurCtrl = TextEditingController();
  final _linkedinCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _posteCtrl.dispose();
    _entrepriseCtrl.dispose();
    _telCtrl.dispose();
    _villeCtrl.dispose();
    _domaineCtrl.dispose();
    _secteurCtrl.dispose();
    _linkedinCtrl.dispose();
    _bioCtrl.dispose();
    _competenceCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/alumni/profil');
      final p = data['profil'] as Map<String, dynamic>? ?? {};
      setState(() {
        _profil = p;
        _posteCtrl.text = p['poste_actuel'] ?? '';
        _entrepriseCtrl.text = p['entreprise_actuelle'] ?? '';
        _telCtrl.text = p['telephone'] ?? '';
        _villeCtrl.text = p['ville_residence'] ?? '';
        _domaineCtrl.text = p['domaine_expertise'] ?? '';
        _secteurCtrl.text = p['secteur_activite'] ?? '';
        _linkedinCtrl.text = p['linkedin_url'] ?? '';
        _bioCtrl.text = p['bio'] ?? p['biographie'] ?? '';
        _photoUrl = p['photo_url'];
        _disponibleMentorat = p['disponible_mentorat'] ?? true;
        final comp = p['competences'];
        _competences = comp is List ? comp.map((e) => e.toString()).toList() : [];
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final x = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70, maxWidth: 500);
    if (x == null) return;
    final bytes = await x.readAsBytes();
    final ext = x.name.split('.').last.toLowerCase();
    final mime = ext == 'png' ? 'image/png' : 'image/jpeg';
    setState(() => _photoUrl = 'data:$mime;base64,${base64Encode(bytes)}');
  }

  void _addCompetence() {
    final v = _competenceCtrl.text.trim();
    if (v.isEmpty || _competences.contains(v)) return;
    setState(() {
      _competences.add(v);
      _competenceCtrl.clear();
    });
  }

  Future<void> _save() async {
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.put('/alumni/profil', {
        'poste_actuel': _posteCtrl.text.trim(),
        'entreprise_actuelle': _entrepriseCtrl.text.trim(),
        'telephone': _telCtrl.text.trim(),
        'ville_residence': _villeCtrl.text.trim(),
        'domaine_expertise': _domaineCtrl.text.trim(),
        'secteur_activite': _secteurCtrl.text.trim(),
        'linkedin_url': _linkedinCtrl.text.trim(),
        'bio': _bioCtrl.text.trim(),
        'disponible_mentorat': _disponibleMentorat,
        'competences': _competences,
        if (_photoUrl != null) 'photo_url': _photoUrl,
      });
      if (r['success'] == true) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profil mis à jour ✓'), backgroundColor: kGreen));
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
    Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const RoleSelectScreen()), (route) => false);
  }

  ImageProvider? _avatarImage() {
    if (_photoUrl == null || _photoUrl!.isEmpty) return null;
    if (_photoUrl!.startsWith('data:')) {
      final b64 = _photoUrl!.split(',').last;
      try {
        return MemoryImage(base64Decode(b64));
      } catch (_) {
        return null;
      }
    }
    if (_photoUrl!.startsWith('http')) return NetworkImage(_photoUrl!);
    return NetworkImage('${ApiClient.baseUrl.replaceFirst('/api', '')}$_photoUrl');
  }

  @override
  Widget build(BuildContext context) {
    final nom = _profil?['nom'] ?? '';
    final prenom = _profil?['prenom'] ?? '';
    final code = _profil?['code_unique'] ?? '';
    final email = _profil?['email'] ?? '';
    final avatar = _avatarImage();

    return Scaffold(
      appBar: AppBar(title: const Text('Mon profil')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Center(
                  child: Stack(
                    children: [
                      Container(
                        width: 88, height: 88,
                        decoration: BoxDecoration(gradient: kAlumniGradient, shape: BoxShape.circle, image: avatar != null ? DecorationImage(image: avatar, fit: BoxFit.cover) : null),
                        alignment: Alignment.center,
                        child: avatar == null ? Text(prenom.isNotEmpty ? prenom[0].toUpperCase() : '?', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)) : null,
                      ),
                      Positioned(
                        right: 0, bottom: 0,
                        child: InkWell(
                          onTap: _pickPhoto,
                          child: Container(
                            width: 30, height: 30,
                            decoration: BoxDecoration(color: kAlumniGradient.colors.first, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                            alignment: Alignment.center,
                            child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 15),
                          ),
                        ),
                      ),
                    ],
                  ),
                ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack, begin: const Offset(0.6, 0.6), end: const Offset(1, 1)).fadeIn(duration: 300.ms),
                const SizedBox(height: 12),
                Center(child: Text('$prenom $nom', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kTextDark))),
                Center(child: Text(code, style: const TextStyle(color: kTextGray, fontSize: 12, fontFamily: 'monospace'))),
                if (email.toString().isNotEmpty) Center(child: Text(email, style: const TextStyle(color: kTextGray, fontSize: 12))),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: kAlumniGradient.colors.first.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14)),
                  child: Row(
                    children: [
                      Icon(Icons.volunteer_activism_rounded, color: kAlumniGradient.colors.first, size: 20),
                      const SizedBox(width: 10),
                      const Expanded(child: Text('Disponible pour du mentorat', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5))),
                      Switch(
                        value: _disponibleMentorat,
                        activeColor: kAlumniGradient.colors.first,
                        onChanged: (v) => setState(() => _disponibleMentorat = v),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Situation professionnelle', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kTextDark)),
                const SizedBox(height: 10),
                TextField(controller: _posteCtrl, decoration: const InputDecoration(labelText: 'Poste actuel', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _entrepriseCtrl, decoration: const InputDecoration(labelText: 'Entreprise', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _secteurCtrl, decoration: const InputDecoration(labelText: 'Secteur d\'activité', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _domaineCtrl, decoration: const InputDecoration(labelText: 'Domaine d\'expertise', border: OutlineInputBorder())),
                const SizedBox(height: 20),
                const Text('Coordonnées', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kTextDark)),
                const SizedBox(height: 10),
                TextField(controller: _telCtrl, decoration: const InputDecoration(labelText: 'Téléphone', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _villeCtrl, decoration: const InputDecoration(labelText: 'Ville de résidence', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _linkedinCtrl, decoration: const InputDecoration(labelText: 'LinkedIn (URL)', border: OutlineInputBorder())),
                const SizedBox(height: 20),
                const Text('Compétences', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kTextDark)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _competenceCtrl,
                        decoration: const InputDecoration(hintText: 'Ajouter une compétence', border: OutlineInputBorder(), isDense: true),
                        onSubmitted: (_) => _addCompetence(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _addCompetence,
                      icon: const Icon(Icons.add_rounded),
                      style: IconButton.styleFrom(backgroundColor: kAlumniGradient.colors.first),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8, runSpacing: 8,
                  children: [
                    for (final c in _competences)
                      Chip(
                        label: Text(c, style: const TextStyle(fontSize: 12)),
                        backgroundColor: kAlumniGradient.colors.first.withValues(alpha: 0.1),
                        deleteIcon: const Icon(Icons.close_rounded, size: 15),
                        onDeleted: () => setState(() => _competences.remove(c)),
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                const Text('Bio', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kTextDark)),
                const SizedBox(height: 10),
                TextField(controller: _bioCtrl, maxLines: 4, decoration: const InputDecoration(labelText: 'Quelques mots sur votre parcours...', border: OutlineInputBorder())),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: kRed, fontSize: 13)),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    style: ElevatedButton.styleFrom(backgroundColor: kAlumniGradient.colors.first, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    child: _saving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Enregistrer', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity, height: 46,
                  child: OutlinedButton.icon(
                    onPressed: _logout,
                    icon: const Icon(Icons.logout_rounded, color: kRed),
                    label: const Text('Déconnexion', style: TextStyle(color: kRed, fontWeight: FontWeight.w700)),
                    style: OutlinedButton.styleFrom(side: const BorderSide(color: kRed)),
                  ),
                ),
              ],
            ),
    );
  }
}
