import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class SurveillantConvocationsScreen extends StatefulWidget {
  const SurveillantConvocationsScreen({super.key});

  @override
  State<SurveillantConvocationsScreen> createState() => _SurveillantConvocationsScreenState();
}

class _SurveillantConvocationsScreenState extends State<SurveillantConvocationsScreen> {
  bool _loading = true;
  List<dynamic> _convocations = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/surveillants/convocations');
      setState(() => _convocations = data['convocations'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _ConvocationForm(onSaved: _load),
    );
  }

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Convocations')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        backgroundColor: kSurveillantGradient.colors.first,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Convoquer'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6, itemHeight: 96))
          : _convocations.isEmpty
              ? const Center(child: Text('Aucune convocation', style: TextStyle(color: kTextGray)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                    itemCount: _convocations.length,
                    itemBuilder: (context, i) {
                      final c = _convocations[i];
                      final vu = c['statut_accuse_reception'] == true;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(child: Text('${c['prenom'] ?? ''} ${c['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14))),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(color: (vu ? kGreen : kAmber).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                                    child: Text(c['statut_accuse_label'] ?? '', style: TextStyle(color: vu ? kGreen : kAmber, fontSize: 10, fontWeight: FontWeight.w800)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(c['sujet'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              const SizedBox(height: 4),
                              Text(_formatDate(c['date_convocation']), style: TextStyle(color: kSurveillantGradient.colors.first, fontSize: 12, fontWeight: FontWeight.w700)),
                              if ((c['description'] ?? '').toString().isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(c['description'], style: const TextStyle(fontSize: 12.5, color: kTextGray)),
                              ],
                            ],
                          ),
                        ),
                      ).animate().fadeIn(delay: (i * 60).ms, duration: 250.ms).slideY(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
                    },
                  ),
                ),
    );
  }
}

class _ConvocationForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _ConvocationForm({required this.onSaved});

  @override
  State<_ConvocationForm> createState() => _ConvocationFormState();
}

class _ConvocationFormState extends State<_ConvocationForm> {
  final _codeCtrl = TextEditingController();
  final _sujetCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  DateTime _date = DateTime.now().add(const Duration(days: 1));
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_codeCtrl.text.trim().isEmpty || _sujetCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Matricule et sujet requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/surveillants/convocations', {
        'code_unique_eleve': _codeCtrl.text.trim(),
        'sujet': _sujetCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'date_convocation': '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}',
      });
      if (r['success'] == true) {
        widget.onSaved();
        if (mounted) Navigator.pop(context);
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
      height: MediaQuery.of(context).size.height * 0.8,
      child: Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              const Text('Nouvelle convocation', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              TextField(controller: _codeCtrl, decoration: const InputDecoration(labelText: 'Matricule élève', hintText: 'CN-2026-XXXX', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _sujetCtrl, decoration: const InputDecoration(labelText: 'Sujet', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description (optionnel)', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_today_rounded, size: 16),
                label: Text('${_date.day}/${_date.month}/${_date.year}'),
                onPressed: () async {
                  final picked = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2024), lastDate: DateTime(2030));
                  if (picked != null) setState(() => _date = picked);
                },
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: kSurveillantGradient.colors.first, foregroundColor: Colors.white),
                  child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Convoquer', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
