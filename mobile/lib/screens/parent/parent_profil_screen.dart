import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../role_select_screen.dart';
import 'ape/ape_home_screen.dart';

class ParentProfilScreen extends StatefulWidget {
  const ParentProfilScreen({super.key});

  @override
  State<ParentProfilScreen> createState() => _ParentProfilScreenState();
}

class _ParentProfilScreenState extends State<ParentProfilScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;
  Map<String, dynamic>? _profil;

  final _telCtrl = TextEditingController();
  final _adresseCtrl = TextEditingController();
  final _professionCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  String? _photoUrl;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/parents/profil');
      final p = data['profil'] as Map<String, dynamic>? ?? {};
      setState(() {
        _profil = p;
        _telCtrl.text = p['telephone'] ?? '';
        _adresseCtrl.text = p['adresse'] ?? '';
        _professionCtrl.text = p['profession'] ?? '';
        _bioCtrl.text = p['biographie'] ?? p['bio'] ?? '';
        _photoUrl = p['photo_url'];
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

  Future<void> _save() async {
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.put('/parents/profil', {
        'telephone': _telCtrl.text.trim(),
        'adresse': _adresseCtrl.text.trim(),
        'profession': _professionCtrl.text.trim(),
        'biographie': _bioCtrl.text.trim(),
        if (_photoUrl != null) 'photo_url': _photoUrl,
      });
      if (r['success'] == true) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profil mis à jour'), backgroundColor: kGreen));
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
    return NetworkImage('${ApiClient.baseUrl.replaceFirst('/api', '')}$_photoUrl');
  }

  @override
  Widget build(BuildContext context) {
    final nom = _profil?['nom'] ?? '';
    final prenom = _profil?['prenom'] ?? '';
    final code = _profil?['code_unique'] ?? '';
    final statutApe = _profil?['statut_ape'];
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
                        decoration: BoxDecoration(gradient: kParentGradient, shape: BoxShape.circle, image: avatar != null ? DecorationImage(image: avatar, fit: BoxFit.cover) : null),
                        alignment: Alignment.center,
                        child: avatar == null ? Text(prenom.isNotEmpty ? prenom[0].toUpperCase() : '?', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)) : null,
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
                const SizedBox(height: 12),
                Center(child: Text('$prenom $nom', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kTextDark))),
                Center(child: Text(code, style: const TextStyle(color: kTextGray, fontSize: 12, fontFamily: 'monospace'))),
                if (statutApe != null && statutApe != 'MEMBRE')
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(color: kApeGradient.colors.first.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                        child: Text('🎖️ Bureau APE — $statutApe', style: TextStyle(color: kApeGradient.colors.first, fontWeight: FontWeight.w800, fontSize: 11.5)),
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                TextField(controller: _telCtrl, decoration: const InputDecoration(labelText: 'Téléphone', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _adresseCtrl, decoration: const InputDecoration(labelText: 'Adresse', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _professionCtrl, decoration: const InputDecoration(labelText: 'Profession', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _bioCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Biographie', border: OutlineInputBorder())),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: kRed, fontSize: 13)),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    style: ElevatedButton.styleFrom(backgroundColor: kParentGradient.colors.first, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    child: _saving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Enregistrer', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ApeHomeScreen())),
                  icon: Icon(Icons.groups_rounded, color: kApeGradient.colors.first),
                  label: Text('Espace APE', style: TextStyle(color: kApeGradient.colors.first, fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(side: BorderSide(color: kApeGradient.colors.first), minimumSize: const Size(double.infinity, 46)),
                ),
                const SizedBox(height: 12),
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
