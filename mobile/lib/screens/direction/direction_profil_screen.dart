import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../role_select_screen.dart';

class DirectionProfilScreen extends StatefulWidget {
  const DirectionProfilScreen({super.key});

  @override
  State<DirectionProfilScreen> createState() => _DirectionProfilScreenState();
}

class _DirectionProfilScreenState extends State<DirectionProfilScreen> {
  bool _loading = true;
  bool _uploading = false;
  Map<String, dynamic>? _config;
  String? _photoUrl;

  bool get _isDirection => ApiClient.instance.user?['role_actuel'] == 'DIRECTION';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/config');
      setState(() => _config = data['config'] as Map<String, dynamic>?);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickAndUpload() async {
    final picker = ImagePicker();
    final x = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80, maxWidth: 800);
    if (x == null) return;
    setState(() => _uploading = true);
    try {
      final bytes = await x.readAsBytes();
      final r = await ApiClient.instance.multipart('/surveillants/photo', {}, fileField: 'photo', fileBytes: bytes, fileName: x.name);
      if (r['photo_url'] != null) {
        setState(() => _photoUrl = r['photo_url']);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Photo enregistrée'), backgroundColor: kGreen));
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['message'] ?? 'Erreur'), backgroundColor: kRed));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur réseau'), backgroundColor: kRed));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _logout() async {
    await ApiClient.instance.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const RoleSelectScreen()), (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final user = ApiClient.instance.user;
    final nom = user?['nom'] ?? '';
    final prenom = user?['prenom'] ?? '';
    final code = user?['code_unique'] ?? '';
    final roleLabel = _isDirection ? 'Direction' : 'Surveillant';

    return Scaffold(
      appBar: AppBar(title: const Text('Mon profil')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Stack(
              children: [
                Container(
                  width: 88, height: 88,
                  decoration: BoxDecoration(gradient: kDirectionGradient, shape: BoxShape.circle, image: _photoUrl != null ? DecorationImage(image: NetworkImage(_photoUrl!), fit: BoxFit.cover) : null),
                  alignment: Alignment.center,
                  child: _photoUrl == null ? Text(prenom.toString().isNotEmpty ? prenom[0].toUpperCase() : '?', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)) : null,
                ),
                Positioned(
                  right: 0, bottom: 0,
                  child: InkWell(
                    onTap: _uploading ? null : _pickAndUpload,
                    child: Container(
                      width: 30, height: 30,
                      decoration: BoxDecoration(color: kDirectionGradient.colors.first, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                      alignment: Alignment.center,
                      child: _uploading
                          ? const SizedBox(width: 13, height: 13, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 15),
                    ),
                  ),
                ),
              ],
            ),
          ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack, begin: const Offset(0.6, 0.6), end: const Offset(1, 1)).fadeIn(duration: 300.ms),
          const SizedBox(height: 12),
          Center(child: Text('$prenom $nom', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kTextDark))),
          Center(child: Text(code, style: const TextStyle(color: kTextGray, fontSize: 12, fontFamily: 'monospace'))),
          const SizedBox(height: 6),
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(color: kDirectionGradient.colors.first.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
              child: Text(roleLabel, style: TextStyle(color: kDirectionGradient.colors.first, fontWeight: FontWeight.w800, fontSize: 11.5)),
            ),
          ),
          const SizedBox(height: 24),
          const Text('Établissement', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kTextDark)),
          const SizedBox(height: 10),
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _infoRow(Icons.school_rounded, 'Nom', _config?['nom_etablissement']),
                    _infoRow(Icons.short_text_rounded, 'Slogan', _config?['slogan']),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 24),
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

  Widget _infoRow(IconData icon, String label, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: kTextGray),
          const SizedBox(width: 8),
          Text('$label : ', style: const TextStyle(fontSize: 12.5, color: kTextGray)),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}
