import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:file_picker/file_picker.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';
import 'direction_eleve_detail_screen.dart';

class DirectionElevesScreen extends StatefulWidget {
  const DirectionElevesScreen({super.key});

  @override
  State<DirectionElevesScreen> createState() => _DirectionElevesScreenState();
}

class _DirectionElevesScreenState extends State<DirectionElevesScreen> {
  bool _loading = true;
  List<dynamic> _eleves = [];
  final _searchCtrl = TextEditingController();
  String? _classe;

  bool get _isDirection => ApiClient.instance.user?['role_actuel'] == 'DIRECTION';

  @override
  void initState() {
    super.initState();
    _load();
    _searchCtrl.addListener(_load);
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final q = _searchCtrl.text.trim();
      final params = <String>[];
      if (q.isNotEmpty) params.add('q=${Uri.encodeQueryComponent(q)}');
      if (_classe != null && _classe!.isNotEmpty) params.add('classe=${Uri.encodeQueryComponent(_classe!)}');
      final qs = params.isNotEmpty ? '?${params.join('&')}' : '';
      final data = await ApiClient.instance.get('/admin/eleves$qs');
      setState(() => _eleves = data['eleves'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openAddForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _AddEleveForm(onSaved: _load),
    );
  }

  void _openImportExcel() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _ImportExcelSheet(onDone: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Élèves'),
        actions: [
          if (_isDirection) IconButton(icon: const Icon(Icons.upload_file_rounded), tooltip: 'Importer Excel', onPressed: _openImportExcel),
        ],
      ),
      floatingActionButton: _isDirection
          ? FloatingActionButton.extended(
              onPressed: _openAddForm,
              backgroundColor: kDirectionGradient.colors.first,
              icon: const Icon(Icons.person_add_rounded),
              label: const Text('Élève'),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Rechercher un élève...',
                isDense: true,
                prefixIcon: const Icon(Icons.search_rounded, size: 18),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 8))
                : RefreshIndicator(
                    onRefresh: _load,
                    child: _eleves.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: const [
                              Padding(padding: EdgeInsets.only(top: 80), child: Center(child: Text('Aucun élève trouvé', style: TextStyle(color: kTextGray)))),
                            ],
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 90),
                            itemCount: _eleves.length,
                            itemBuilder: (context, i) {
                              final e = _eleves[i];
                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: kDirectionGradient.colors.first.withValues(alpha: 0.1),
                                    child: Text((e['prenom'] ?? '?').toString().isNotEmpty ? e['prenom'][0] : '?', style: TextStyle(color: kDirectionGradient.colors.first, fontWeight: FontWeight.w800)),
                                  ),
                                  title: Text('${e['prenom'] ?? ''} ${e['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                                  subtitle: Text('${e['classe'] ?? ''} · ${e['code_unique'] ?? ''}', style: const TextStyle(fontSize: 11.5)),
                                  trailing: e['moyenne'] != null
                                      ? Text('${toDouble(e['moyenne']).toStringAsFixed(1)}/20', style: TextStyle(fontWeight: FontWeight.w800, color: kDirectionGradient.colors.first, fontSize: 12.5))
                                      : const Icon(Icons.chevron_right_rounded, color: kTextGray),
                                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => DirectionEleveDetailScreen(idUser: e['id_user'], nomComplet: '${e['prenom'] ?? ''} ${e['nom'] ?? ''}'))),
                                ),
                              ).animate().fadeIn(duration: 200.ms, delay: (i * 20).ms);
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _AddEleveForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _AddEleveForm({required this.onSaved});

  @override
  State<_AddEleveForm> createState() => _AddEleveFormState();
}

class _AddEleveFormState extends State<_AddEleveForm> {
  final _prenomCtrl = TextEditingController();
  final _nomCtrl = TextEditingController();
  final _classeCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _telCtrl = TextEditingController();
  bool _saving = false;
  String? _error;
  Map<String, dynamic>? _result;

  Future<void> _submit() async {
    if (_prenomCtrl.text.trim().isEmpty || _nomCtrl.text.trim().isEmpty || _classeCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Prénom, nom et classe requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/admin/eleves', {
        'prenom': _prenomCtrl.text.trim(),
        'nom': _nomCtrl.text.trim(),
        'classe': _classeCtrl.text.trim(),
        if (_emailCtrl.text.trim().isNotEmpty) 'email': _emailCtrl.text.trim(),
        if (_telCtrl.text.trim().isNotEmpty) 'telephone': _telCtrl.text.trim(),
      });
      if (r['success'] == true) {
        setState(() => _result = r);
        widget.onSaved();
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
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.85,
      child: Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              const Text('Nouvel élève', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              if (_result != null) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: kGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(children: [Icon(Icons.check_circle_rounded, color: kGreen, size: 18), SizedBox(width: 6), Text('Compte créé', style: TextStyle(fontWeight: FontWeight.w800, color: kGreen))]),
                      const SizedBox(height: 10),
                      Text('Matricule : ${_result!['code_unique']}', style: const TextStyle(fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                      const SizedBox(height: 4),
                      Text('Mot de passe temporaire : ${_result!['mot_de_passe_temporaire']}', style: const TextStyle(fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                      const SizedBox(height: 6),
                      const Text('⚠️ Notez ces identifiants maintenant, ils ne seront plus affichés ensuite.', style: TextStyle(fontSize: 11, color: kTextGray)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(width: double.infinity, height: 46, child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Fermer'))),
              ] else ...[
                TextField(controller: _prenomCtrl, decoration: const InputDecoration(labelText: 'Prénom', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: _nomCtrl, decoration: const InputDecoration(labelText: 'Nom', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: _classeCtrl, decoration: const InputDecoration(labelText: 'Classe', hintText: '6ème A', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: _emailCtrl, decoration: const InputDecoration(labelText: 'Email (optionnel)', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: _telCtrl, decoration: const InputDecoration(labelText: 'Téléphone (optionnel)', border: OutlineInputBorder())),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _submit,
                    style: ElevatedButton.styleFrom(backgroundColor: kDirectionGradient.colors.first, foregroundColor: Colors.white),
                    child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Créer le compte', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ImportExcelSheet extends StatefulWidget {
  final VoidCallback onDone;
  const _ImportExcelSheet({required this.onDone});

  @override
  State<_ImportExcelSheet> createState() => _ImportExcelSheetState();
}

class _ImportExcelSheetState extends State<_ImportExcelSheet> {
  String? _fileName;
  List<int>? _fileBytes;
  bool _loading = false;
  String? _error;
  List<dynamic>? _preview;
  int _nbOk = 0;
  int _nbErreurs = 0;
  bool _committed = false;

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['xlsx', 'xls']);
    if (result == null || result.files.isEmpty) return;
    final f = result.files.first;
    if (f.bytes == null) return;
    setState(() {
      _fileBytes = f.bytes;
      _fileName = f.name;
      _preview = null;
      _committed = false;
    });
    _preview1();
  }

  Future<void> _preview1() async {
    if (_fileBytes == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final r = await ApiClient.instance.multipart(
        '/admin/eleves/import-excel',
        {'dryRun': 'true'},
        fileField: 'fichier',
        fileBytes: _fileBytes,
        fileName: _fileName,
      );
      if (r['success'] == true) {
        setState(() {
          _preview = r['resultats'] ?? [];
          _nbOk = r['nb_ok'] ?? 0;
          _nbErreurs = r['nb_erreurs'] ?? 0;
        });
      } else {
        setState(() => _error = r['message'] ?? 'Erreur de lecture du fichier');
      }
    } catch (_) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _confirmImport() async {
    if (_fileBytes == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final r = await ApiClient.instance.multipart(
        '/admin/eleves/import-excel',
        {'dryRun': 'false'},
        fileField: 'fichier',
        fileBytes: _fileBytes,
        fileName: _fileName,
      );
      if (r['success'] == true) {
        setState(() {
          _preview = r['resultats'] ?? [];
          _nbOk = r['nb_ok'] ?? 0;
          _nbErreurs = r['nb_erreurs'] ?? 0;
          _committed = true;
        });
        widget.onDone();
      } else {
        setState(() => _error = r['message'] ?? 'Erreur import');
      }
    } catch (_) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.85,
      child: Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            const Text('Importer des élèves (Excel)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text('Colonnes attendues : Nom, Prénom, Classe (requis), Email, Téléphone (optionnels)', style: TextStyle(fontSize: 11.5, color: kTextGray)),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _pickFile,
              icon: const Icon(Icons.attach_file_rounded),
              label: Text(_fileName ?? 'Choisir un fichier .xlsx'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 46)),
            ),
            if (_loading) const Padding(padding: EdgeInsets.only(top: 20), child: Center(child: CircularProgressIndicator())),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5))),
            if (_preview != null) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Chip(label: Text('$_nbOk OK'), backgroundColor: kGreen.withValues(alpha: 0.12), labelStyle: const TextStyle(color: kGreen, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 8),
                  if (_nbErreurs > 0) Chip(label: Text('$_nbErreurs erreur(s)'), backgroundColor: kRed.withValues(alpha: 0.12), labelStyle: const TextStyle(color: kRed, fontWeight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 10),
              Expanded(
                child: ListView.builder(
                  itemCount: _preview!.length,
                  itemBuilder: (context, i) {
                    final row = _preview![i];
                    final ok = row['statut'] != 'ERREUR';
                    return ListTile(
                      dense: true,
                      leading: Icon(ok ? Icons.check_circle_rounded : Icons.error_rounded, color: ok ? kGreen : kRed, size: 18),
                      title: Text('${row['prenom'] ?? ''} ${row['nom'] ?? ''}', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                      subtitle: Text(ok ? '${row['classe'] ?? ''} · ${_committed ? row['code_unique'] ?? '' : row['code_previsionnel'] ?? ''}' : row['message'] ?? '', style: const TextStyle(fontSize: 11)),
                    );
                  },
                ),
              ),
              const SizedBox(height: 10),
              if (!_committed)
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton(
                    onPressed: (_loading || _nbOk == 0) ? null : _confirmImport,
                    style: ElevatedButton.styleFrom(backgroundColor: kDirectionGradient.colors.first, foregroundColor: Colors.white),
                    child: Text('Confirmer l\'import de $_nbOk élève(s)', style: const TextStyle(fontWeight: FontWeight.w800)),
                  ),
                )
              else
                SizedBox(width: double.infinity, height: 46, child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Terminé'))),
            ],
          ],
        ),
      ),
    );
  }
}
