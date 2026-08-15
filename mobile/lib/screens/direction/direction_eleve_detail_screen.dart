import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';

class DirectionEleveDetailScreen extends StatefulWidget {
  final dynamic idUser;
  final String nomComplet;
  const DirectionEleveDetailScreen({super.key, required this.idUser, required this.nomComplet});

  @override
  State<DirectionEleveDetailScreen> createState() => _DirectionEleveDetailScreenState();
}

class _DirectionEleveDetailScreenState extends State<DirectionEleveDetailScreen> {
  bool _loading = true;
  Map<String, dynamic>? _eleve;
  List<dynamic> _notes = [];
  List<dynamic> _absences = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/eleve/${widget.idUser}');
      setState(() {
        _eleve = data['eleve'] as Map<String, dynamic>?;
        _notes = data['notes'] ?? [];
        _absences = data['absences'] ?? [];
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.nomComplet)),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 26,
                                backgroundColor: kDirectionGradient.colors.first.withValues(alpha: 0.1),
                                child: Text((widget.nomComplet.isNotEmpty ? widget.nomComplet[0] : '?'), style: TextStyle(color: kDirectionGradient.colors.first, fontWeight: FontWeight.w900, fontSize: 20)),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(widget.nomComplet, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                                    Text(_eleve?['classe_actuelle'] ?? '', style: const TextStyle(fontSize: 12.5, color: kTextGray)),
                                    Text(_eleve?['code_unique'] ?? '', style: const TextStyle(fontSize: 11.5, color: kTextGray, fontFamily: 'monospace')),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 26),
                          _infoRow(Icons.email_outlined, 'Email', _eleve?['email']),
                          _infoRow(Icons.phone_outlined, 'Téléphone', _eleve?['telephone']),
                          _infoRow(Icons.cake_outlined, 'Naissance', _eleve?['date_naissance']),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      const Text('Notes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
                      const Spacer(),
                      Text('${_notes.length} évaluation(s)', style: const TextStyle(fontSize: 11.5, color: kTextGray)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (_notes.isEmpty)
                    const Text('Aucune note enregistrée', style: TextStyle(color: kTextGray))
                  else
                    for (final n in _notes)
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          dense: true,
                          title: Text(n['matiere'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                          subtitle: Text('${n['prof_prenom'] ?? ''} ${n['prof_nom'] ?? ''} · T${n['trimestre'] ?? ''}', style: const TextStyle(fontSize: 11)),
                          trailing: Text('${toDouble(n['note']).toStringAsFixed(1)}/20', style: TextStyle(fontWeight: FontWeight.w800, color: toDouble(n['note']) >= 10 ? kGreen : kRed)),
                        ),
                      ),
                  const SizedBox(height: 20),
                  const Text('Absences récentes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
                  const SizedBox(height: 10),
                  if (_absences.isEmpty)
                    const Text('Aucune absence enregistrée', style: TextStyle(color: kTextGray))
                  else
                    for (final a in _absences)
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          dense: true,
                          leading: Icon(a['justifiee'] == true ? Icons.check_circle_outline_rounded : Icons.cancel_outlined, color: a['justifiee'] == true ? kGreen : kRed, size: 18),
                          title: Text(a['date_absence'] ?? '', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                          subtitle: Text(a['raison_absence'] ?? (a['justifiee'] == true ? 'Justifiée' : 'Non justifiée'), style: const TextStyle(fontSize: 11)),
                        ),
                      ),
                ],
              ),
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
