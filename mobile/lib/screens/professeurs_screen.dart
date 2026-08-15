import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../utils.dart';
import '../widgets/skeleton.dart';

class ProfesseursScreen extends StatefulWidget {
  const ProfesseursScreen({super.key});

  @override
  State<ProfesseursScreen> createState() => _ProfesseursScreenState();
}

class _ProfesseursScreenState extends State<ProfesseursScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _profs = [];

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
      final data = await ApiClient.instance.get('/eleves/professeurs');
      if (data['success'] == true) {
        setState(() => _profs = data['professeurs'] ?? []);
      } else {
        setState(() => _error = data['message'] ?? 'Erreur de chargement');
      }
    } catch (e) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openDetail(String? id) async {
    if (id == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _ProfDetailSheet(id: id),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes professeurs')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6, itemHeight: 84))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: kRed)))
              : _profs.isEmpty
                  ? const Center(child: Text('Aucun professeur trouvé pour ta classe', style: TextStyle(color: kTextGray)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _profs.length,
                        itemBuilder: (context, i) {
                          final p = _profs[i];
                          final matieres = (p['matieres'] as List?)?.join(', ') ?? '';
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(12),
                              onTap: () => _openDetail(p['id_user']?.toString()),
                              leading: CircleAvatar(
                                radius: 26,
                                backgroundColor: kIndigo.withValues(alpha: 0.12),
                                child: Text(
                                  '${(p['prenom'] ?? '?').toString().isNotEmpty ? p['prenom'][0] : '?'}${(p['nom'] ?? '').toString().isNotEmpty ? p['nom'][0] : ''}',
                                  style: const TextStyle(color: kIndigo, fontWeight: FontWeight.w800, fontSize: 16),
                                ),
                              ),
                              title: Text('${p['prenom'] ?? ''} ${p['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                              subtitle: Text(
                                (p['specialite'] ?? '').toString().isNotEmpty ? p['specialite'] : (matieres.isNotEmpty ? matieres : 'Professeur'),
                                style: const TextStyle(fontSize: 12.5),
                              ),
                              trailing: const Icon(Icons.chevron_right_rounded, color: kTextGray),
                            ),
                          ).animate().fadeIn(delay: (i * 60).ms, duration: 280.ms).slideX(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
                        },
                      ),
                    ),
    );
  }
}

class _ProfDetailSheet extends StatefulWidget {
  final String id;
  const _ProfDetailSheet({required this.id});

  @override
  State<_ProfDetailSheet> createState() => _ProfDetailSheetState();
}

class _ProfDetailSheetState extends State<_ProfDetailSheet> {
  bool _loading = true;
  Map<String, dynamic>? _profil;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiClient.instance.get('/eleves/professeur/${widget.id}');
      setState(() => _profil = (data['profil'] ?? data) as Map<String, dynamic>?);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: _loading
            ? const SizedBox(height: 200, child: Center(child: CircularProgressIndicator()))
            : _profil == null || _profil!['nom'] == null
                ? const SizedBox(height: 120, child: Center(child: Text('Profil introuvable', style: TextStyle(color: kRed))))
                : SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2))),
                        const SizedBox(height: 20),
                        Container(
                          width: 76, height: 76,
                          decoration: const BoxDecoration(gradient: kBrandGradient, shape: BoxShape.circle),
                          alignment: Alignment.center,
                          child: Text(
                            ((_profil!['prenom'] ?? '?').toString().isNotEmpty ? _profil!['prenom'][0] : '?').toUpperCase(),
                            style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text('${_profil!['prenom'] ?? ''} ${_profil!['nom'] ?? ''}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 2),
                        Text(_profil!['specialite'] ?? 'Professeur', style: const TextStyle(color: kTextGray, fontSize: 13)),
                        if ((_profil!['biographie'] ?? '').toString().isNotEmpty) ...[
                          const SizedBox(height: 16),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(color: kBg, borderRadius: BorderRadius.circular(12)),
                            child: Text(_profil!['biographie'], style: const TextStyle(fontSize: 13, color: kTextDark, height: 1.4)),
                          ),
                        ],
                        const SizedBox(height: 16),
                        if ((_profil!['diplome'] ?? '').toString().isNotEmpty)
                          _infoLine(Icons.school_rounded, _profil!['diplome']),
                        if (toInt(_profil!['annees_exp']) > 0)
                          _infoLine(Icons.calendar_today_rounded, '${toInt(_profil!['annees_exp'])} an(s) d\'expérience'),
                        if ((_profil!['matieres'] as List?)?.isNotEmpty == true) ...[
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 6, runSpacing: 6,
                            children: (_profil!['matieres'] as List).map((m) => Chip(
                              label: Text(m.toString(), style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: kGreen)),
                              backgroundColor: kGreen.withValues(alpha: 0.1),
                              side: BorderSide.none,
                              visualDensity: VisualDensity.compact,
                            )).toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _infoLine(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 16, color: kTextGray),
          const SizedBox(width: 8),
          Text(text, style: const TextStyle(fontSize: 13, color: kTextDark)),
        ],
      ),
    );
  }
}
