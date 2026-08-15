/// PostgreSQL renvoie les colonnes NUMERIC/DECIMAL/BIGINT (AVG, COUNT, SUM...)
/// sous forme de String en JSON (pour éviter les pertes de précision côté
/// pg), alors que le reste de l'API renvoie des vrais nombres. Ce helper
/// accepte les deux formes sans jamais planter — à utiliser partout où une
/// valeur numérique vient directement de l'API plutôt que d'un cast brut.
double? toDoubleOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v);
  return null;
}

double toDouble(dynamic v, [double fallback = 0]) => toDoubleOrNull(v) ?? fallback;

int toInt(dynamic v, [int fallback = 0]) {
  final d = toDoubleOrNull(v);
  return d?.round() ?? fallback;
}
