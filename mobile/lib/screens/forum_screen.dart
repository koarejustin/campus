import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/skeleton.dart';

class ForumScreen extends StatelessWidget {
  const ForumScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Forum'),
          bottom: const TabBar(
            isScrollable: true,
            labelColor: kIndigo,
            unselectedLabelColor: kTextGray,
            indicatorColor: kIndigo,
            tabs: [
              Tab(text: 'Forum de classe'),
              Tab(text: 'Inter-classes'),
              Tab(text: 'Grand Élèves'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _MessageBoard(type: 'classe'),
            _InterClassesBoard(),
            _GrandElevesBoard(),
          ],
        ),
      ),
    );
  }
}

class _MessageBoard extends StatefulWidget {
  final String type; // 'classe' ou 'inter'
  final String? classeCible;
  const _MessageBoard({required this.type, this.classeCible});

  @override
  State<_MessageBoard> createState() => _MessageBoardState();
}

class _MessageBoardState extends State<_MessageBoard> {
  bool _loading = true;
  List<dynamic> _messages = [];
  final _ctrl = TextEditingController();
  bool _sending = false;
  final _myId = ApiClient.instance.userId;
  Map<String, dynamic>? _replyTarget; // {id, auteur, texte} — comme _replyTo côté web

  String get _getPath => widget.type == 'classe'
      ? '/eleves/forum-classe'
      : '/eleves/inter-classes${widget.classeCible != null ? '?classe_cible=${Uri.encodeQueryComponent(widget.classeCible!)}' : ''}';

  String get _postPath => widget.type == 'classe' ? '/eleves/forum-classe' : '/eleves/inter-classes';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant _MessageBoard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.classeCible != widget.classeCible) _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get(_getPath);
      setState(() => _messages = data['messages'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final texte = _ctrl.text.trim();
    if (texte.isEmpty) return;
    setState(() => _sending = true);
    try {
      final body = <String, dynamic>{'texte': texte, 'reply_to': _replyTarget?['id']};
      if (widget.type == 'inter' && widget.classeCible != null) {
        body['classe_cible'] = widget.classeCible;
      }
      final r = await ApiClient.instance.post(_postPath, body);
      if (r['success'] == true) {
        _ctrl.clear();
        setState(() => _replyTarget = null);
        await _load();
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _delete(dynamic messageId, bool pourTous) async {
    try {
      await ApiClient.instance.delete('/eleves/forum-message/${widget.type}/$messageId', body: {'pourTous': pourTous});
      await _load();
    } catch (_) {}
  }

  // Réactions multiples (façon Facebook) sur un message — chaque élève a au
  // plus une réaction active par message, qu'il peut changer ou retirer.
  static const _reactions = [
    {'type': 'like', 'emoji': '👍'},
    {'type': 'love', 'emoji': '❤️'},
    {'type': 'dislike', 'emoji': '👎'},
    {'type': 'angry', 'emoji': '😠'},
  ];

  Future<void> _toggleReaction(Map m, String type) async {
    final id = m['id'];
    final maReaction = m['ma_reaction'];
    final counts = Map<String, dynamic>.from(m['reactions'] ?? {});
    setState(() {
      if (maReaction == type) {
        counts[type] = ((counts[type] ?? 1) as num) - 1;
        m['ma_reaction'] = null;
      } else {
        if (maReaction != null) counts[maReaction] = ((counts[maReaction] ?? 1) as num) - 1;
        counts[type] = ((counts[type] ?? 0) as num) + 1;
        m['ma_reaction'] = type;
      }
      m['reactions'] = counts;
    });
    try {
      await ApiClient.instance.post('/eleves/forum-reaction', {'type_forum': widget.type, 'id_message': id, 'type_reaction': type});
    } catch (_) {}
  }

  // Rangée de réactions toujours visible — pas de "like" par défaut caché
  // derrière un tap unique : chaque type de réaction (👍/❤️/👎/😠) est son
  // propre bouton, pour que ce soit clair dès le premier coup d'œil que ce
  // n'est pas un simple like (les élèves d'une classe ne sont pas toujours
  // d'accord entre eux).
  Widget _reactionsBar(Map m, bool mine) {
    final counts = Map<String, dynamic>.from(m['reactions'] ?? {});
    final maReaction = m['ma_reaction'];
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Wrap(
        spacing: 6,
        children: [
          for (final r in _reactions)
            InkWell(
              onTap: () => _toggleReaction(m, r['type']!),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: maReaction == r['type'] ? kIndigo.withValues(alpha: 0.16) : (mine ? Colors.white.withValues(alpha: 0.12) : kBg),
                  borderRadius: BorderRadius.circular(12),
                  border: maReaction == r['type'] ? Border.all(color: kIndigo, width: 1) : null,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(r['emoji']!, style: const TextStyle(fontSize: 12)),
                    if (((counts[r['type']] ?? 0) as num) > 0) ...[
                      const SizedBox(width: 3),
                      Text('${counts[r['type']]}', style: TextStyle(fontSize: 10, color: mine ? Colors.white70 : kTextGray, fontWeight: FontWeight.w700)),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _setReply(Map m) {
    setState(() => _replyTarget = {'id': m['id'], 'auteur': m['nom_auteur'] ?? 'Vous', 'texte': m['texte'] ?? ''});
  }

  // Menu façon WhatsApp au tap sur un message : répondre + suppression,
  // exactement comme sur eleve.html (ouvrirMenuMessage).
  void _openMessageMenu(Map m, bool mine) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2))),
            ListTile(
              leading: const Text('↩️'),
              title: const Text('Répondre'),
              onTap: () {
                Navigator.pop(context);
                _setReply(m);
              },
            ),
            ListTile(
              leading: const Text('🗑️'),
              title: const Text('Supprimer pour moi'),
              onTap: () {
                Navigator.pop(context);
                _delete(m['id'], false);
              },
            ),
            if (mine)
              ListTile(
                leading: const Text('🗑️'),
                title: const Text('Supprimer pour tout le monde', style: TextStyle(color: kRed)),
                onTap: () {
                  Navigator.pop(context);
                  _delete(m['id'], true);
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Index id → message pour retrouver le message cité par reply_to.
    final byId = {for (final m in _messages) m['id'].toString(): m};

    return Column(
      children: [
        Expanded(
          child: _loading
              ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6, itemHeight: 56))
              : _messages.isEmpty
                  ? const Center(child: Text('Aucun message pour le moment', style: TextStyle(color: kTextGray)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, i) {
                          final m = _messages[i];
                          final mine = m['id_auteur']?.toString() == _myId;
                          final cited = m['reply_to'] != null ? byId[m['reply_to'].toString()] : null;
                          return Align(
                            alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                            child: GestureDetector(
                              onTap: () => _openMessageMenu(m, mine),
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                  color: mine ? kIndigo : Colors.white,
                                  borderRadius: BorderRadius.only(
                                    topLeft: const Radius.circular(14),
                                    topRight: const Radius.circular(14),
                                    bottomLeft: Radius.circular(mine ? 14 : 3),
                                    bottomRight: Radius.circular(mine ? 3 : 14),
                                  ),
                                  border: mine ? null : Border.all(color: kBorder),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (!mine)
                                      Text(m['nom_auteur'] ?? '', style: const TextStyle(color: kIndigo, fontWeight: FontWeight.w800, fontSize: 11.5)),
                                    if (!mine) const SizedBox(height: 2),
                                    if (cited != null)
                                      Container(
                                        margin: const EdgeInsets.only(bottom: 6),
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                        decoration: BoxDecoration(
                                          color: mine ? Colors.white.withValues(alpha: 0.15) : kIndigo.withValues(alpha: 0.08),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border(left: BorderSide(color: mine ? Colors.white : kIndigo, width: 3)),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(cited['nom_auteur'] ?? 'Vous', style: TextStyle(color: mine ? Colors.white : kIndigo, fontWeight: FontWeight.w700, fontSize: 10.5)),
                                            Text(
                                              (cited['texte'] ?? '').toString(),
                                              maxLines: 2, overflow: TextOverflow.ellipsis,
                                              style: TextStyle(color: mine ? Colors.white70 : kTextGray, fontSize: 10.5),
                                            ),
                                          ],
                                        ),
                                      ),
                                    Text(m['texte'] ?? '', style: TextStyle(color: mine ? Colors.white : kTextDark, fontSize: 13.5)),
                                    const SizedBox(height: 4),
                                    Text(m['time'] ?? '', style: TextStyle(color: mine ? Colors.white70 : kTextGray, fontSize: 10)),
                                    _reactionsBar(m, mine),
                                  ],
                                ),
                              ),
                            ),
                          ).animate().fadeIn(duration: 220.ms).slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic);
                        },
                      ),
                    ),
        ),
        SafeArea(
          top: false,
          child: Column(
            children: [
              if (_replyTarget != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: kIndigo.withValues(alpha: 0.08),
                  child: Row(
                    children: [
                      const Icon(Icons.reply_rounded, size: 16, color: kIndigo),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_replyTarget!['auteur'], style: const TextStyle(color: kIndigo, fontWeight: FontWeight.w800, fontSize: 11.5)),
                            Text(
                              (_replyTarget!['texte'] as String).length > 60 ? '${(_replyTarget!['texte'] as String).substring(0, 60)}…' : _replyTarget!['texte'],
                              maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: kTextGray, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18, color: kTextGray),
                        onPressed: () => setState(() => _replyTarget = null),
                      ),
                    ],
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _ctrl,
                        decoration: InputDecoration(
                          hintText: 'Écrire un message...',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: kBorder)),
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    CircleAvatar(
                      backgroundColor: kIndigo,
                      child: _sending
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : IconButton(icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18), onPressed: _send),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Onglet Inter-Classes : ajoute un sélecteur de classe cible au-dessus du fil.
class _InterClassesBoard extends StatefulWidget {
  const _InterClassesBoard();

  @override
  State<_InterClassesBoard> createState() => _InterClassesBoardState();
}

class _InterClassesBoardState extends State<_InterClassesBoard> {
  List<String> _classes = [];
  String? _classeCible;

  @override
  void initState() {
    super.initState();
    _loadClasses();
  }

  Future<void> _loadClasses() async {
    try {
      final data = await ApiClient.instance.get('/eleves/classes');
      setState(() => _classes = List<String>.from(data['classes'] ?? []));
    } catch (_) {}
  }

  // Une couleur stable par nom de classe (même classe = même couleur à
  // chaque ouverture), pour repérer un fil d'un coup d'œil.
  static const _palette = [kIndigo, kGreen, kAmber, kRed, Color(0xFF0EA5E9), Color(0xFFDB2777), Color(0xFF7C3AED), Color(0xFF16A34A)];
  Color _colorFor(String classe) => _palette[classe.hashCode.abs() % _palette.length];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_classes.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
            child: SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _classeChip('Toutes', null, kTextGray),
                  for (final c in _classes) _classeChip(c, c, _colorFor(c)),
                ],
              ),
            ),
          ),
        Expanded(child: _MessageBoard(type: 'inter', classeCible: _classeCible)),
      ],
    );
  }

  Widget _classeChip(String label, String? value, Color color) {
    final selected = _classeCible == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: selected ? Colors.white : color)),
        selected: selected,
        selectedColor: color,
        backgroundColor: color.withValues(alpha: 0.1),
        side: BorderSide(color: color.withValues(alpha: selected ? 1 : 0.3)),
        onSelected: (_) => setState(() => _classeCible = value),
      ),
    );
  }
}

/// Mur "Grand Élèves" : tous les élèves de l'école, lecture seule sauf pour
/// les élèves élus (Chef de Classe, Bureau des Élèves — voir poste_elu de
/// /eleves/mon-profil, alimenté par les Élections côté Direction).
class _GrandElevesBoard extends StatefulWidget {
  const _GrandElevesBoard();

  @override
  State<_GrandElevesBoard> createState() => _GrandElevesBoardState();
}

class _GrandElevesBoardState extends State<_GrandElevesBoard> {
  static const _tags = [
    {'value': 'TOUT', 'label': 'Tous', 'emoji': ''},
    {'value': 'SPORT', 'label': 'Sport', 'emoji': '🏅'},
    {'value': 'CONCOURS', 'label': 'Concours', 'emoji': '📝'},
    {'value': 'CULTURE', 'label': 'Culture', 'emoji': '🎭'},
    {'value': 'ENTRAIDE', 'label': 'Entraide', 'emoji': '🤝'},
  ];
  static const _composeTags = [
    {'value': 'ENTRAIDE', 'label': '🤝 Entraide'},
    {'value': 'SPORT', 'label': '🏅 Sport'},
    {'value': 'CONCOURS', 'label': '📝 Concours'},
    {'value': 'CULTURE', 'label': '🎭 Culture'},
    {'value': 'INFO', 'label': 'ℹ️ Info'},
  ];

  bool _loading = true;
  List<dynamic> _posts = [];
  String _tag = 'TOUT';
  String? _posteElu;
  final _ctrl = TextEditingController();
  String _composeTag = 'ENTRAIDE';
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _loadProfil();
    _load();
  }

  Future<void> _loadProfil() async {
    try {
      final data = await ApiClient.instance.get('/eleves/mon-profil');
      setState(() => _posteElu = data['profil']?['poste_elu']);
    } catch (_) {}
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final path = _tag == 'TOUT' ? '/eleves/grand-eleves' : '/eleves/grand-eleves?tag=${Uri.encodeQueryComponent(_tag)}';
      final data = await ApiClient.instance.get(path);
      setState(() => _posts = data['posts'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _publier() async {
    final texte = _ctrl.text.trim();
    if (texte.isEmpty) return;
    setState(() => _sending = true);
    try {
      final r = await ApiClient.instance.post('/eleves/grand-eleves', {'texte': texte, 'tag': _composeTag});
      if (r['success'] == true) {
        _ctrl.clear();
        await _load();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['message'] ?? 'Erreur'), backgroundColor: kRed));
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _like(dynamic postId) async {
    // Optimiste, comme sur le web : on bascule tout de suite puis on
    // rafraîchit depuis le serveur pour rester en phase.
    setState(() {
      final p = _posts.firstWhere((p) => p['id'] == postId, orElse: () => null);
      if (p != null) {
        final likedNow = !(p['liked_by_me'] == true);
        p['liked_by_me'] = likedNow;
        p['likes'] = (p['likes'] ?? 0) + (likedNow ? 1 : -1);
      }
    });
    try {
      await ApiClient.instance.post('/eleves/grand-eleves/$postId/like', {});
      await _load();
    } catch (_) {}
  }

  void _openCommentaires(Map post) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _CommentairesSheet(post: post, onChanged: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
          child: SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (final t in _tags)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('${t['emoji']} ${t['label']}'.trim(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _tag == t['value'] ? Colors.white : kIndigo)),
                      selected: _tag == t['value'],
                      selectedColor: kIndigo,
                      backgroundColor: kIndigo.withValues(alpha: 0.08),
                      onSelected: (_) { setState(() => _tag = t['value']!); _load(); },
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (_posteElu != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.account_balance_rounded, size: 14, color: kIndigo),
                        const SizedBox(width: 6),
                        Expanded(child: Text('$_posteElu — vous pouvez publier ici', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kIndigo))),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _ctrl,
                      maxLines: 3,
                      decoration: InputDecoration(hintText: 'Publier une annonce pour toute l\'école...', isDense: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _composeTag,
                            isDense: true,
                            decoration: InputDecoration(isDense: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
                            items: [for (final t in _composeTags) DropdownMenuItem(value: t['value'], child: Text(t['label']!, style: const TextStyle(fontSize: 12)))],
                            onChanged: (v) => setState(() => _composeTag = v ?? 'ENTRAIDE'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _sending ? null : _publier,
                          style: ElevatedButton.styleFrom(backgroundColor: kIndigo, foregroundColor: Colors.white),
                          child: _sending ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Publier'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              decoration: BoxDecoration(color: kIndigo.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(20)),
              child: const Text('👁️ Lecture seule · Tu peux liker · Seuls le Chef de Classe et le Bureau des Élèves publient ici', textAlign: TextAlign.center, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: kIndigo)),
            ),
          ),
        const SizedBox(height: 10),
        Expanded(
          child: _loading
              ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5, itemHeight: 90))
              : _posts.isEmpty
                  ? const Center(child: Text('Aucune publication', style: TextStyle(color: kTextGray)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        itemCount: _posts.length,
                        itemBuilder: (context, i) {
                          final p = _posts[i];
                          final liked = p['liked_by_me'] == true;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Row(
                                          children: [
                                            Text(p['nom_auteur'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                            const SizedBox(width: 6),
                                            Text(p['time'] ?? '', style: const TextStyle(fontSize: 10.5, color: kTextGray)),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(color: kIndigo.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                                        child: Text(p['tag'] ?? 'GENERAL', style: const TextStyle(fontSize: 9.5, color: kIndigo, fontWeight: FontWeight.w700)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(p['texte'] ?? '', style: const TextStyle(fontSize: 13, color: kTextDark, height: 1.4)),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      InkWell(
                                        onTap: () => _like(p['id']),
                                        borderRadius: BorderRadius.circular(20),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(liked ? Icons.favorite_rounded : Icons.favorite_border_rounded, size: 16, color: liked ? kRed : kTextGray),
                                              const SizedBox(width: 4),
                                              Text('${p['likes'] ?? 0}', style: TextStyle(fontSize: 12, color: liked ? kRed : kTextGray, fontWeight: FontWeight.w700)),
                                            ],
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      InkWell(
                                        onTap: () => _openCommentaires(p),
                                        borderRadius: BorderRadius.circular(20),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.mode_comment_outlined, size: 15, color: kTextGray),
                                              const SizedBox(width: 4),
                                              Text('${p['nb_commentaires'] ?? 0}', style: const TextStyle(fontSize: 12, color: kTextGray, fontWeight: FontWeight.w700)),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ).animate().fadeIn(duration: 220.ms, delay: (i * 30).ms).slideY(begin: 0.06, end: 0);
                        },
                      ),
                    ),
        ),
      ],
    );
  }
}

/// Fil de commentaires d'une publication "Grand Élèves" — ouvert au tap sur
/// l'icône commentaire. Contrairement à la publication elle-même (réservée
/// aux élèves élus), n'importe quel élève peut commenter.
class _CommentairesSheet extends StatefulWidget {
  final Map post;
  final VoidCallback onChanged;
  const _CommentairesSheet({required this.post, required this.onChanged});

  @override
  State<_CommentairesSheet> createState() => _CommentairesSheetState();
}

class _CommentairesSheetState extends State<_CommentairesSheet> {
  bool _loading = true;
  List<dynamic> _commentaires = [];
  final _ctrl = TextEditingController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/eleves/grand-eleves/${widget.post['id']}/commentaires');
      setState(() => _commentaires = data['commentaires'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _envoyer() async {
    final texte = _ctrl.text.trim();
    if (texte.isEmpty) return;
    setState(() => _sending = true);
    try {
      final r = await ApiClient.instance.post('/eleves/grand-eleves/${widget.post['id']}/commentaires', {'texte': texte});
      if (r['success'] == true) {
        _ctrl.clear();
        await _load();
        widget.onChanged();
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.8,
      child: Column(
        children: [
          const SizedBox(height: 10),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2))),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text('Commentaires', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          ),
          Expanded(
            child: _loading
                ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 4, itemHeight: 56))
                : _commentaires.isEmpty
                    ? const Center(child: Text('Aucun commentaire pour le moment', style: TextStyle(color: kTextGray)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _commentaires.length,
                        itemBuilder: (context, i) {
                          final c = _commentaires[i];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CircleAvatar(radius: 15, backgroundColor: kIndigo.withValues(alpha: 0.12), child: Text(c['initiales'] ?? '?', style: const TextStyle(color: kIndigo, fontSize: 10.5, fontWeight: FontWeight.w800))),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(color: kBg, borderRadius: BorderRadius.circular(12)),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(c['nom_auteur'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5)),
                                            const SizedBox(width: 6),
                                            Text(c['time'] ?? '', style: const TextStyle(fontSize: 9.5, color: kTextGray)),
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Text(c['texte'] ?? '', style: const TextStyle(fontSize: 12.5)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _ctrl,
                      decoration: InputDecoration(
                        hintText: 'Écrire un commentaire...',
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: kBorder)),
                      ),
                      onSubmitted: (_) => _envoyer(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: kIndigo,
                    child: _sending
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : IconButton(icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18), onPressed: _envoyer),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
