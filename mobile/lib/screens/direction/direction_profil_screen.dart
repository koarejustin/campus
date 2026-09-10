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
  bool _savingConfig = false;
  bool _uploadingLogo = false;
  Map<String, dynamic>? _config;
  String? _photoUrl;
  String? _logoUrl;

  final _nomCtrl = TextEditingController();
  final _sloganCtrl = TextEditingController();
  final _adresseCtrl = TextEditingController();
  final _telCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();

  bool get _isDirection => ApiClient.instance.user?['role_actuel'] == 'DIRECTION';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nomCtrl.dispose();
    _sloganCtrl.dispose();
    _adresseCtrl.dispose();
    _telCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/config');
      final config = data['config'] as Map<String, dynamic>?;
      setState(() {
        _config = config;
        _logoUrl = config?['logo_url'] as String?;
        _nomCtrl.text = (config?['nom_etablissement'] as String?) ?? '';
        _sloganCtrl.text = (config?['slogan'] as String?) ?? '';
        _adresseCtrl.text = (config?['adresse'] as String?) ?? '';
        _telCtrl.text = (config?['telephone'] as String?) ?? '';
        _emailCtrl.text = (config?['email_contact'] as String?) ?? '';
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveConfig() async {
    setState(() => _savingConfig = true);
    try {
      final r = await ApiClient.instance.multipart(
        '/admin/config',
        {
          'nom_etablissement': _nomCtrl.text.trim(),
          'slogan': _sloganCtrl.text.trim(),
          'adresse': _adresseCtrl.text.trim(),
          'telephone': _telCtrl.text.trim(),
          'email_contact': _emailCtrl.text.trim(),
        },
        method: 'PUT',
      );
      if (!mounted) return;
      if (r['success'] == true) {
        setState(() => _config = r['config'] as Map<String, dynamic>? ?? _config);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Établissement mis à jour'), backgroundColor: kGreen));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['message'] ?? 'Erreur'), backgroundColor: kRed));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur réseau'), backgroundColor: kRed));
    } finally {
      if (mounted) setState(() => _savingConfig = false);
    }
  }

  Future<void> _pickAndUploadLogo() async {
    final picker = ImagePicker();
    final x = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85, maxWidth: 800);
    if (x == null) return;
    setState(() => _uploadingLogo = true);
    try {
      final bytes = await x.readAsBytes();
      final r = await ApiClient.instance.multipart(
        '/admin/config',
        {},
        method: 'PUT',
        fileField: 'logo',
        fileBytes: bytes,
        fileName: x.name,
      );
      if (!mounted) return;
      if (r['success'] == true) {
        final config = r['config'] as Map<String, dynamic>?;
        setState(() => _logoUrl = config?['logo_url'] as String? ?? _logoUrl);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Logo mis à jour'), backgroundColor: kGreen));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['message'] ?? 'Erreur'), backgroundColor: kRed));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur réseau'), backgroundColor: kRed));
    } finally {
      if (mounted) setState(() => _uploadingLogo = false);
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
          Text(_isDirection ? 'Paramètres de l\'établissement' : 'Établissement',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kTextDark)),
          const SizedBox(height: 10),
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
          else if (_isDirection)
            _buildEditableConfig()
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

  Widget _buildEditableConfig() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(
                    color: kBorder.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(12),
                    image: _logoUrl != null && _logoUrl!.isNotEmpty
                        ? DecorationImage(image: NetworkImage(_logoUrl!), fit: BoxFit.contain)
                        : null,
                  ),
                  alignment: Alignment.center,
                  child: (_logoUrl == null || _logoUrl!.isEmpty)
                      ? const Icon(Icons.image_outlined, color: kTextGray, size: 22)
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _uploadingLogo ? null : _pickAndUploadLogo,
                    icon: _uploadingLogo
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.upload_rounded, size: 16),
                    label: const Text('Changer le logo'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _configField(_nomCtrl, 'Nom de l\'établissement', Icons.school_rounded),
            const SizedBox(height: 10),
            _configField(_sloganCtrl, 'Slogan', Icons.short_text_rounded),
            const SizedBox(height: 10),
            _configField(_adresseCtrl, 'Adresse', Icons.location_on_outlined),
            const SizedBox(height: 10),
            _configField(_telCtrl, 'Téléphone', Icons.call_outlined),
            const SizedBox(height: 10),
            _configField(_emailCtrl, 'Email de contact', Icons.mail_outline_rounded),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton.icon(
                onPressed: _savingConfig ? null : _saveConfig,
                icon: _savingConfig
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.check_rounded, size: 18),
                label: const Text('Enregistrer'),
                style: ElevatedButton.styleFrom(backgroundColor: kIndigo, foregroundColor: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _configField(TextEditingController ctrl, String label, IconData icon) {
    return TextField(
      controller: ctrl,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 18),
        isDense: true,
        border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
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
