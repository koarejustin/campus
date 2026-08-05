/**
 * ================================================================
 * MOTEUR DE CALCUL DES MOYENNES - BURKINA FASO
 * Système Post-Primaire et Secondaire (6ème → Terminale)
 * Conforme au programme officiel MENA/BF
 * ================================================================
 */

const PROGRAMMES = {
  '6ème': [
    { nom: 'Français',                          coef: 3, domaine: 'Lettres' },
    { nom: 'Mathématiques',                     coef: 3, domaine: 'Sciences' },
    { nom: 'Histoire-Géographie',               coef: 2, domaine: 'Lettres' },
    { nom: 'Sciences de la Vie et de la Terre', coef: 2, domaine: 'Sciences' },
    { nom: 'Anglais',                           coef: 2, domaine: 'Langues' },
    { nom: 'Éducation Civique et Morale',       coef: 1, domaine: 'Lettres' },
    { nom: 'Éducation Physique et Sportive',    coef: 1, domaine: 'EPS' },
    { nom: 'Arts Plastiques',                   coef: 1, domaine: 'Arts' },
    { nom: 'Informatique / TIC',                coef: 1, domaine: 'Tech' },
  ],
  '5ème': [
    { nom: 'Français',                          coef: 3, domaine: 'Lettres' },
    { nom: 'Mathématiques',                     coef: 3, domaine: 'Sciences' },
    { nom: 'Histoire-Géographie',               coef: 2, domaine: 'Lettres' },
    { nom: 'Sciences de la Vie et de la Terre', coef: 2, domaine: 'Sciences' },
    { nom: 'Anglais',                           coef: 2, domaine: 'Langues' },
    { nom: 'Éducation Civique et Morale',       coef: 1, domaine: 'Lettres' },
    { nom: 'Éducation Physique et Sportive',    coef: 1, domaine: 'EPS' },
    { nom: 'Arts Plastiques',                   coef: 1, domaine: 'Arts' },
    { nom: 'Informatique / TIC',                coef: 1, domaine: 'Tech' },
  ],
  '4ème': [
    { nom: 'Français',                          coef: 3, domaine: 'Lettres' },
    { nom: 'Mathématiques',                     coef: 3, domaine: 'Sciences' },
    { nom: 'Histoire-Géographie',               coef: 2, domaine: 'Lettres' },
    { nom: 'Sciences de la Vie et de la Terre', coef: 2, domaine: 'Sciences' },
    { nom: 'Physique-Chimie',                   coef: 2, domaine: 'Sciences' },
    { nom: 'Anglais',                           coef: 2, domaine: 'Langues' },
    { nom: 'Allemand',                          coef: 1, domaine: 'Langues', optionnel: true },
    { nom: 'Éducation Civique et Morale',       coef: 1, domaine: 'Lettres' },
    { nom: 'Éducation Physique et Sportive',    coef: 1, domaine: 'EPS' },
    { nom: 'Informatique / TIC',                coef: 1, domaine: 'Tech' },
  ],
  '3ème': [
    { nom: 'Français',                          coef: 3, domaine: 'Lettres' },
    { nom: 'Mathématiques',                     coef: 3, domaine: 'Sciences' },
    { nom: 'Histoire-Géographie',               coef: 2, domaine: 'Lettres' },
    { nom: 'Sciences de la Vie et de la Terre', coef: 2, domaine: 'Sciences' },
    { nom: 'Physique-Chimie',                   coef: 2, domaine: 'Sciences' },
    { nom: 'Anglais',                           coef: 2, domaine: 'Langues' },
    { nom: 'Allemand',                          coef: 1, domaine: 'Langues', optionnel: true },
    { nom: 'Éducation Civique et Morale',       coef: 1, domaine: 'Lettres' },
    { nom: 'Éducation Physique et Sportive',    coef: 1, domaine: 'EPS' },
    { nom: 'Informatique / TIC',                coef: 1, domaine: 'Tech' },
  ],
  '2nde A': [
    { nom: 'Français',                          coef: 4, domaine: 'Lettres' },
    { nom: 'Mathématiques',                     coef: 3, domaine: 'Sciences' },
    { nom: 'Histoire-Géographie',               coef: 3, domaine: 'Lettres' },
    { nom: 'Anglais',                           coef: 3, domaine: 'Langues' },
    { nom: 'Sciences de la Vie et de la Terre', coef: 2, domaine: 'Sciences' },
    { nom: 'Physique-Chimie',                   coef: 2, domaine: 'Sciences' },
    { nom: 'Allemand',                          coef: 2, domaine: 'Langues', optionnel: true },
    { nom: 'Éducation Civique et Morale',       coef: 1, domaine: 'Lettres' },
    { nom: 'Éducation Physique et Sportive',    coef: 1, domaine: 'EPS' },
    { nom: 'Informatique / TIC',                coef: 1, domaine: 'Tech' },
  ],
  '2nde C': [
    { nom: 'Mathématiques',                     coef: 4, domaine: 'Sciences' },
    { nom: 'Physique-Chimie',                   coef: 4, domaine: 'Sciences' },
    { nom: 'Français',                          coef: 3, domaine: 'Lettres' },
    { nom: 'Sciences de la Vie et de la Terre', coef: 3, domaine: 'Sciences' },
    { nom: 'Histoire-Géographie',               coef: 2, domaine: 'Lettres' },
    { nom: 'Anglais',                           coef: 2, domaine: 'Langues' },
    { nom: 'Éducation Civique et Morale',       coef: 1, domaine: 'Lettres' },
    { nom: 'Éducation Physique et Sportive',    coef: 1, domaine: 'EPS' },
    { nom: 'Informatique / TIC',                coef: 1, domaine: 'Tech' },
  ],
  '1ère A': [
    { nom: 'Français / Littérature',            coef: 5, domaine: 'Lettres' },
    { nom: 'Histoire-Géographie',               coef: 4, domaine: 'Lettres' },
    { nom: 'Anglais',                           coef: 4, domaine: 'Langues' },
    { nom: 'Philosophie',                       coef: 3, domaine: 'Lettres' },
    { nom: 'Mathématiques',                     coef: 2, domaine: 'Sciences' },
    { nom: 'Allemand',                          coef: 2, domaine: 'Langues', optionnel: true },
    { nom: 'Sciences de la Vie et de la Terre', coef: 1, domaine: 'Sciences' },
    { nom: 'Éducation Civique et Morale',       coef: 1, domaine: 'Lettres' },
    { nom: 'Éducation Physique et Sportive',    coef: 1, domaine: 'EPS' },
    { nom: 'Informatique / TIC',                coef: 1, domaine: 'Tech' },
  ],
  '1ère D': [
    { nom: 'Mathématiques',                     coef: 4, domaine: 'Sciences' },
    { nom: 'Sciences de la Vie et de la Terre', coef: 4, domaine: 'Sciences' },
    { nom: 'Physique-Chimie',                   coef: 4, domaine: 'Sciences' },
    { nom: 'Français',                          coef: 3, domaine: 'Lettres' },
    { nom: 'Histoire-Géographie',               coef: 2, domaine: 'Lettres' },
    { nom: 'Anglais',                           coef: 2, domaine: 'Langues' },
    { nom: 'Philosophie',                       coef: 2, domaine: 'Lettres' },
    { nom: 'Éducation Civique et Morale',       coef: 1, domaine: 'Lettres' },
    { nom: 'Éducation Physique et Sportive',    coef: 1, domaine: 'EPS' },
    { nom: 'Informatique / TIC',                coef: 1, domaine: 'Tech' },
  ],
  'Tle A': [
    { nom: 'Français / Littérature',            coef: 5, domaine: 'Lettres' },
    { nom: 'Philosophie',                       coef: 4, domaine: 'Lettres' },
    { nom: 'Histoire-Géographie',               coef: 4, domaine: 'Lettres' },
    { nom: 'Anglais',                           coef: 4, domaine: 'Langues' },
    { nom: 'Mathématiques',                     coef: 2, domaine: 'Sciences' },
    { nom: 'Allemand',                          coef: 2, domaine: 'Langues', optionnel: true },
    { nom: 'Sciences de la Vie et de la Terre', coef: 1, domaine: 'Sciences' },
    { nom: 'Éducation Civique et Morale',       coef: 1, domaine: 'Lettres' },
    { nom: 'Éducation Physique et Sportive',    coef: 1, domaine: 'EPS' },
    { nom: 'Informatique / TIC',                coef: 1, domaine: 'Tech' },
  ],
  'Tle D': [
    { nom: 'Mathématiques',                     coef: 5, domaine: 'Sciences' },
    { nom: 'Sciences de la Vie et de la Terre', coef: 5, domaine: 'Sciences' },
    { nom: 'Physique-Chimie',                   coef: 4, domaine: 'Sciences' },
    { nom: 'Français',                          coef: 3, domaine: 'Lettres' },
    { nom: 'Philosophie',                       coef: 2, domaine: 'Lettres' },
    { nom: 'Histoire-Géographie',               coef: 2, domaine: 'Lettres' },
    { nom: 'Anglais',                           coef: 2, domaine: 'Langues' },
    { nom: 'Éducation Civique et Morale',       coef: 1, domaine: 'Lettres' },
    { nom: 'Éducation Physique et Sportive',    coef: 1, domaine: 'EPS' },
    { nom: 'Informatique / TIC',                coef: 1, domaine: 'Tech' },
  ],
};

const ALIAS_CLASSES = {
  '6e':'6ème','6eme':'6ème','5e':'5ème','5eme':'5ème',
  '4e':'4ème','4eme':'4ème','3e':'3ème','3eme':'3ème',
  '2nda':'2nde A','2ndea':'2nde A','seconde a':'2nde A',
  '2ndc':'2nde C','2ndec':'2nde C','seconde c':'2nde C',
  '1a':'1ère A','1ere a':'1ère A','premiere a':'1ère A',
  '1d':'1ère D','1ere d':'1ère D','premiere d':'1ère D',
  'tle a':'Tle A','terminale a':'Tle A','ta':'Tle A',
  'tle d':'Tle D','terminale d':'Tle D','td':'Tle D',
};

function normaliserClasse(classe) {
  if (!classe) return null;
  const c = String(classe).trim();
  if (PROGRAMMES[c]) return c;
  const key = c.toLowerCase().replace(/[èéê]/g,'e').replace(/[àâ]/g,'a').replace(/\s+/g,' ');
  return ALIAS_CLASSES[key] || c;
}

function normaliserNomMatiere(nom) {
  if (!nom) return '';
  // Normaliser : supprimer accents, minuscules, espaces multiples
  var n = nom.toLowerCase()
    .replace(/[èéê]/g,'e').replace(/[àâ]/g,'a').replace(/[îï]/g,'i')
    .replace(/[ôö]/g,'o').replace(/[ùûü]/g,'u').replace(/[ç]/g,'c')
    .replace(/\s*\/\s*/g,' ').replace(/\s+/g,' ').trim();
  return n;
}

// Table de correspondance entre noms BD et noms officiels du programme
var ALIASES_MATIERES = {
  // Noms BD → nom normalisé du programme
  'mathematiques': 'mathematiques',
  'maths':         'mathematiques',
  'math':          'mathematiques',
  'francais':      'francais / litterature',
  'français':      'francais / litterature',
  'francais / litterature': 'francais / litterature',
  'svt':           'sciences de la vie et de la terre',
  'sciences de la vie et de la terre': 'sciences de la vie et de la terre',
  'biologie':      'sciences de la vie et de la terre',
  'physique-chimie': 'physique-chimie',
  'physique chimie': 'physique-chimie',
  'pc':            'physique-chimie',
  'histoire-geographie': 'histoire-geographie',
  'histoire geographie': 'histoire-geographie',
  'hg':            'histoire-geographie',
  'anglais':       'anglais',
  'philosophie':   'philosophie',
  'philo':         'philosophie',
  'eps':           'education physique et sportive',
  'education physique et sportive': 'education physique et sportive',
  'sport':         'education physique et sportive',
  'informatique':  'informatique / tic',
  'tic':           'informatique / tic',
  'informatique / tic': 'informatique / tic',
  'ecm':           'education civique et morale',
  'education civique et morale': 'education civique et morale',
  'allemand':      'allemand',
  'espagnol':      'espagnol',
};

function normaliserNomMatiereAvecAlias(nom) {
  var base = normaliserNomMatiere(nom);
  return ALIASES_MATIERES[base] || base;
}

function getMention(m) {
  if (m === null || m === undefined) return null;
  if (m >= 16) return 'Très Bien';
  if (m >= 14) return 'Bien';
  if (m >= 12) return 'Assez Bien';
  if (m >= 10) return 'Passable';
  return 'Insuffisant';
}

// Règle officielle BF : (moy_devoirs×1 + moy_compo×2) / 3
function calculerMoyenneMatiere(notes) {
  if (!notes || notes.length === 0) return null;
  const devoirs = notes.filter(n => !n.type_evaluation || ['DEVOIR','RATTRAPAGE',null,undefined].includes(n.type_evaluation));
  const compos  = notes.filter(n => ['COMPO','COMPOSITION','EXAMEN'].includes(n.type_evaluation));

  if (devoirs.length === 0 && compos.length === 0) {
    return Math.round((notes.reduce((a,n) => a + parseFloat(n.note||0), 0) / notes.length) * 100) / 100;
  }
  const moyD = devoirs.length ? devoirs.reduce((a,n) => a + parseFloat(n.note||0), 0) / devoirs.length : null;
  const moyC = compos.length  ? compos.reduce((a,n)  => a + parseFloat(n.note||0), 0) / compos.length  : null;

  if (moyD !== null && moyC === null) return Math.round(moyD * 100) / 100;
  if (moyC !== null && moyD === null) return Math.round(moyC * 100) / 100;
  return Math.round(((moyD * 1 + moyC * 2) / 3) * 100) / 100;
}

function calculerMoyenneGenerale(classe, notesParMatiere) {
  const classeNorm = normaliserClasse(classe);
  const programme  = PROGRAMMES[classeNorm] || [];
  let sommePond = 0, sommeCoefs = 0;
  const detail = [];

  for (const mat of programme) {
    const found = notesParMatiere.find(n =>
      normaliserNomMatiereAvecAlias(n.nom_matiere) === normaliserNomMatiereAvecAlias(mat.nom)
    );
    const moy = found ? calculerMoyenneMatiere(found.notes) : null;
    if (moy !== null) { sommePond += moy * mat.coef; sommeCoefs += mat.coef; }
    detail.push({ nom: mat.nom, domaine: mat.domaine, coefficient: mat.coef,
                  moyenne: moy, optionnel: !!mat.optionnel, mention: getMention(moy) });
  }

  // Notes hors-programme
  for (const n of notesParMatiere) {
    if (!detail.find(d => normaliserNomMatiereAvecAlias(d.nom) === normaliserNomMatiereAvecAlias(n.nom_matiere))) {
      const moy = calculerMoyenneMatiere(n.notes);
      detail.push({ nom: n.nom_matiere, domaine: 'Autre', coefficient: 1,
                    moyenne: moy, optionnel: true, mention: getMention(moy), horsProgamme: true });
      if (moy !== null) { sommePond += moy; sommeCoefs += 1; }
    }
  }

  const mg = sommeCoefs > 0 ? Math.round((sommePond / sommeCoefs) * 100) / 100 : null;
  return {
    classe: classeNorm, moyenne_generale: mg, mention: getMention(mg),
    admis: mg !== null && mg >= 10, detail_matieres: detail,
    total_coefs: sommeCoefs, programme_complet: programme.length > 0,
  };
}

function calculerEvolution(toutesNotes, classe) {
  if (!toutesNotes || !toutesNotes.length) return [];
  const parTrimestre = {};
  for (const n of toutesNotes) {
    const t = n.trimestre || 'N/A';
    if (!parTrimestre[t]) parTrimestre[t] = [];
    parTrimestre[t].push(n);
  }
  const evo = [];
  for (const [trimestre, notes] of Object.entries(parTrimestre)) {
    const parMatiere = {};
    for (const n of notes) {
      if (!parMatiere[n.nom_matiere||'?']) parMatiere[n.nom_matiere||'?'] = [];
      parMatiere[n.nom_matiere||'?'].push(n);
    }
    const r = calculerMoyenneGenerale(classe, Object.entries(parMatiere).map(([nom,ns]) => ({ nom_matiere: nom, notes: ns })));
    evo.push({ periode: `Trimestre ${trimestre}`, trimestre: parseInt(trimestre)||0, moyenne: r.moyenne_generale, detail: r.detail_matieres });
  }
  return evo.sort((a,b) => a.trimestre - b.trimestre);
}

function noteMinimalePourCible(moyActuelle, coefsUtilises, coefRestant, cible = 10) {
  if (!moyActuelle || coefsUtilises === 0) return cible;
  const n = (cible * (coefsUtilises + coefRestant) - moyActuelle * coefsUtilises) / coefRestant;
  if (n > 20) return null;
  return Math.max(0, Math.ceil(n * 10) / 10);
}

function detecterBaisses(evolution) {
  if (evolution.length < 2) return [];
  const parMatiere = {};
  for (const pt of evolution) {
    for (const m of (pt.detail||[])) {
      if (m.moyenne === null) continue;
      if (!parMatiere[m.nom]) parMatiere[m.nom] = [];
      parMatiere[m.nom].push({ trimestre: pt.trimestre, moyenne: m.moyenne });
    }
  }
  const alertes = [];
  for (const [matiere, hist] of Object.entries(parMatiere)) {
    if (hist.length < 2) continue;
    const baisse = hist[hist.length-2].moyenne - hist[hist.length-1].moyenne;
    if (baisse >= 3)   alertes.push({ matiere, alerte: 'CRITIQUE',  baisse: Math.round(baisse*10)/10, historique: hist });
    else if (baisse >= 1.5) alertes.push({ matiere, alerte: 'ATTENTION', baisse: Math.round(baisse*10)/10, historique: hist });
  }
  return alertes;
}

function getProgramme(classe) {
  return PROGRAMMES[normaliserClasse(classe)] || null;
}

module.exports = {
  PROGRAMMES, calculerMoyenneGenerale, calculerMoyenneMatiere,
  calculerEvolution, noteMinimalePourCible, detecterBaisses,
  getMention, normaliserClasse, getProgramme, normaliserNomMatiereAvecAlias,
};
