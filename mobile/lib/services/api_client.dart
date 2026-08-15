import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Client HTTP partagé par tout l'app — parle à la même API Node/Express
/// que les pages web (frontend/eleve.html). Même système de token (Bearer).
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  // En dev sur ce PC, le serveur Node tourne sur localhost:3000.
  // Pour tester depuis un vrai téléphone plus tard, remplacer par
  // l'adresse IP du PC sur le réseau local, ou l'URL ngrok.
  static const String baseUrl = 'http://localhost:3000/api';

  String? _token;
  Map<String, dynamic>? _user;

  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isLoggedIn => _token != null;

  /// L'id de l'utilisateur n'est pas renvoyé dans `user` par /auth/login,
  /// seulement dans le JWT — on le lit directement dans le token (pas de
  /// vérification de signature nécessaire, juste pour comparer "est-ce moi
  /// l'auteur de ce message ?" côté UI).
  String? get userId {
    if (_token == null) return null;
    try {
      final parts = _token!.split('.');
      if (parts.length != 3) return null;
      final normalized = base64Url.normalize(parts[1]);
      final payload = jsonDecode(utf8.decode(base64Url.decode(normalized)));
      return payload['id'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<void> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    final userJson = prefs.getString('user');
    if (userJson != null) _user = jsonDecode(userJson);
  }

  Future<Map<String, dynamic>> login(String codeUnique, String motDePasse, {String role = 'ELEVE'}) async {
    final r = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'code_unique': codeUnique,
        'mot_de_passe': motDePasse,
        'role': role,
      }),
    );
    final data = jsonDecode(r.body) as Map<String, dynamic>;
    if (r.statusCode == 200 && data['success'] == true) {
      _token = data['token'];
      _user = data['user'];
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', _token!);
      await prefs.setString('user', jsonEncode(_user));
    }
    return data;
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
  }

  Future<Map<String, dynamic>> get(String path) async {
    final r = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: {'Authorization': 'Bearer $_token'},
    );
    if (r.statusCode == 401) {
      // Session expirée ou invalide : on force une reconnexion.
      await logout();
    }
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  /// Pour les routes qui renvoient un fichier brut (ex: modèle Excel à
  /// télécharger) plutôt que du JSON.
  Future<List<int>> getBytes(String path) async {
    final r = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: {'Authorization': 'Bearer $_token'},
    );
    if (r.statusCode == 401) await logout();
    return r.bodyBytes;
  }

  /// Certaines routes Surveillant renvoient un tableau JSON brut (pas
  /// `{ success, ... }`) — variante de `get` pour ces cas-là.
  Future<List<dynamic>> getList(String path) async {
    final r = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: {'Authorization': 'Bearer $_token'},
    );
    if (r.statusCode == 401) await logout();
    final decoded = jsonDecode(r.body);
    return decoded is List ? decoded : [];
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final r = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: {'Authorization': 'Bearer $_token', 'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (r.statusCode == 401) await logout();
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> delete(String path, {Map<String, dynamic>? body}) async {
    final r = await http.delete(
      Uri.parse('$baseUrl$path'),
      headers: {'Authorization': 'Bearer $_token', 'Content-Type': 'application/json'},
      body: body != null ? jsonEncode(body) : null,
    );
    if (r.statusCode == 401) await logout();
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) async {
    final r = await http.put(
      Uri.parse('$baseUrl$path'),
      headers: {'Authorization': 'Bearer $_token', 'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (r.statusCode == 401) await logout();
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    final r = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: {'Authorization': 'Bearer $_token', 'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (r.statusCode == 401) await logout();
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  /// Envoi multipart (upload de fichier + champs texte) — utilisé pour la
  /// photo de profil, les ressources pédagogiques et les copies scannées.
  /// `method` : 'POST' ou 'PUT'.
  Future<Map<String, dynamic>> multipart(
    String path,
    Map<String, String> fields, {
    String method = 'POST',
    String? fileField,
    List<int>? fileBytes,
    String? fileName,
  }) async {
    final req = http.MultipartRequest(method, Uri.parse('$baseUrl$path'));
    req.headers['Authorization'] = 'Bearer $_token';
    req.fields.addAll(fields);
    if (fileField != null && fileBytes != null) {
      req.files.add(http.MultipartFile.fromBytes(fileField, fileBytes, filename: fileName ?? 'file'));
    }
    final streamed = await req.send();
    final resp = await http.Response.fromStream(streamed);
    if (resp.statusCode == 401) await logout();
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }
}
