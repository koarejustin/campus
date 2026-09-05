// Portail d'accueil (index.html) et sélecteur de classe (classes.html) —
// redirige vers login.html avec le rôle et le contexte choisis.
// (L'ancien tableau de bord "view-app" avec données fictives — profs et
// notes inventés — a été supprimé : chaque rôle a sa propre page réelle
// depuis longtemps, éleve.html/professeur.html/etc., ce code n'était plus
// jamais atteint par aucune navigation réelle.)
function launch(role, context) {
    if (role === 'ELEVE') localStorage.setItem('classe_cliquee', context);
    window.location.href = `login.html?role=${role}&context=${encodeURIComponent(context)}`;
}
