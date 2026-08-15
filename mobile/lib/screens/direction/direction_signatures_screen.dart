import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';

class DirectionSignaturesScreen extends StatefulWidget {
  const DirectionSignaturesScreen({super.key});

  @override
  State<DirectionSignaturesScreen> createState() => _DirectionSignaturesScreenState();
}

class _DirectionSignaturesScreenState extends State<DirectionSignaturesScreen> {
  bool _loading = true;
  int _trimestre = 1;
  List<dynamic> _bulletins = [];
  final Set<dynamic> _selected = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _selected.clear(); });
    try {
      final data = await ApiClient.instance.get('/admin/bulletins?trimestre=$_trimestre');
      setState(() => _bulletins = data['bulletins'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<String?> _askPassword() {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmer la signature'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Entrez votre mot de passe pour signer électroniquement.', style: TextStyle(fontSize: 12.5)),
            const SizedBox(height: 12),
            TextField(controller: ctrl, obscureText: true, decoration: const InputDecoration(labelText: 'Mot de passe', border: OutlineInputBorder())),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, ctrl.text),
            style: ElevatedButton.styleFrom(backgroundColor: kDirectionGradient.colors.first, foregroundColor: Colors.white),
            child: const Text('Signer'),
          ),
        ],
      ),
    );
  }

  Future<void> _signerUn(dynamic idEleve) async {
    final pwd = await _askPassword();
    if (pwd == null || pwd.isEmpty) return;
    try {
      final r = await ApiClient.instance.post('/admin/bulletins/signer', {'id_eleve': idEleve, 'trimestre': _trimestre, 'mot_de_passe': pwd});
      if (r['success'] == true) {
        _load();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Bulletin signé ✓'), backgroundColor: kGreen));
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['message'] ?? 'Erreur'), backgroundColor: kRed));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur réseau'), backgroundColor: kRed));
    }
  }

  Future<void> _signerLot() async {
    if (_selected.isEmpty) return;
    final pwd = await _askPassword();
    if (pwd == null || pwd.isEmpty) return;
    try {
      final r = await ApiClient.instance.post('/admin/bulletins/signer-lot', {'ids_eleves': _selected.toList(), 'trimestre': _trimestre, 'mot_de_passe': pwd});
      if (r['success'] == true) {
        _load();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['message'] ?? 'Signés'), backgroundColor: kGreen));
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['message'] ?? 'Erreur'), backgroundColor: kRed));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur réseau'), backgroundColor: kRed));
    }
  }

  @override
  Widget build(BuildContext context) {
    final nonSignes = _bulletins.where((b) => b['signe'] != true).length;
    return Scaffold(
      appBar: AppBar(title: const Text('Signatures des bulletins')),
      floatingActionButton: _selected.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: _signerLot,
              backgroundColor: kDirectionGradient.colors.first,
              icon: const Icon(Icons.verified_rounded),
              label: Text('Signer ${_selected.length} bulletin(s)'),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                for (final t in [1, 2, 3])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('Trimestre $t'),
                      selected: _trimestre == t,
                      onSelected: (_) { setState(() => _trimestre = t); _load(); },
                      selectedColor: kDirectionGradient.colors.first.withValues(alpha: 0.16),
                      labelStyle: TextStyle(color: _trimestre == t ? kDirectionGradient.colors.first : kTextGray, fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
              ],
            ),
          ),
          if (!_loading && _bulletins.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Text('$nonSignes bulletin(s) non signé(s) sur ${_bulletins.length}', style: const TextStyle(fontSize: 11.5, color: kTextGray)),
                ],
              ),
            ),
          Expanded(
            child: _loading
                ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 8))
                : RefreshIndicator(
                    onRefresh: _load,
                    child: _bulletins.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: const [Padding(padding: EdgeInsets.only(top: 80), child: Center(child: Text('Aucun bulletin pour ce trimestre', style: TextStyle(color: kTextGray))))],
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                            itemCount: _bulletins.length,
                            itemBuilder: (context, i) {
                              final b = _bulletins[i];
                              final signe = b['signe'] == true;
                              final id = b['id_user'];
                              final selected = _selected.contains(id);
                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  leading: signe
                                      ? const Icon(Icons.verified_rounded, color: kGreen)
                                      : Checkbox(
                                          value: selected,
                                          onChanged: (v) => setState(() => v == true ? _selected.add(id) : _selected.remove(id)),
                                          activeColor: kDirectionGradient.colors.first,
                                        ),
                                  title: Text('${b['prenom'] ?? ''} ${b['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                  subtitle: Text('${b['classe'] ?? ''} · ${b['nb_notes'] ?? 0} note(s) · Moy. ${b['moyenne'] != null ? toDouble(b['moyenne']).toStringAsFixed(1) : '—'}/20', style: const TextStyle(fontSize: 11)),
                                  trailing: signe
                                      ? const Text('Signé', style: TextStyle(color: kGreen, fontWeight: FontWeight.w700, fontSize: 11.5))
                                      : TextButton(onPressed: () => _signerUn(id), child: const Text('Signer', style: TextStyle(fontSize: 11.5))),
                                ),
                              ).animate().fadeIn(duration: 200.ms, delay: (i * 15).ms);
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}
