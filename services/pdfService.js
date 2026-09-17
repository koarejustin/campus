const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Palette "Arbre à Palabres" — la même identité que le web et les autres
// documents (guide Flutter, etc.), pour que tout ce qui sort de l'appli
// se ressemble.
const GREEN = '#2F6B3F';
const GREEN_DARK = '#1F4A2C';
const GOLD = '#C9932A';
const BARK = '#3D3524';
const IVORY = '#FDFAF2';
const BORDER = '#DCD3B8';
const TEXT = '#1E2818';
const MUTED = '#6B5D42';

function today() {
    return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ══════════════════════════════════════
// FICHES D'IDENTIFIANTS (mots de passe temporaires)
// ══════════════════════════════════════
function streamFichesIdentifiants(res, { comptes, ecole, siteUrl }) {
    const nomEcole = ecole || 'Établissement';
    const doc = new PDFDocument({ size: 'A4', margin: 28, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="fiches-identifiants.pdf"');
    doc.pipe(res);

    const pageW = doc.page.width, pageH = doc.page.height;
    const marginX = 28, marginY = 28;
    const gap = 12;
    const cardW = (pageW - marginX * 2 - gap) / 2;
    const cardH = 158;
    let col = 0, y = marginY;

    comptes.forEach((c) => {
        if (y + cardH > pageH - marginY) {
            doc.addPage();
            y = marginY;
            col = 0;
        }
        const x = marginX + col * (cardW + gap);
        drawFiche(doc, x, y, cardW, cardH, c, nomEcole, siteUrl);
        if (col === 0) {
            col = 1;
        } else {
            col = 0;
            y += cardH + gap;
        }
    });

    doc.end();
}

function drawFiche(doc, x, y, w, h, c, nomEcole, siteUrl) {
    const headH = 34;
    doc.roundedRect(x, y, w, h, 10).lineWidth(1).strokeColor(BORDER).stroke();
    doc.save();
    doc.roundedRect(x, y, w, headH, 10).clip();
    doc.rect(x, y, w, headH).fill(GREEN_DARK);
    doc.restore();
    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
        .text(nomEcole.toUpperCase(), x + 12, y + 12, { width: w - 24 });

    let cy = y + headH + 10;
    const nom = `${c.prenom || ''} ${(c.nom || '').toUpperCase()}`.trim();
    doc.fillColor(TEXT).fontSize(12).font('Helvetica-Bold').text(nom, x + 12, cy, { width: w - 24 });
    cy += 16;

    const sousTitre = c.classe
        ? c.classe
        : (c.nom_enfant ? `Parent de ${c.prenom_enfant || ''} ${c.nom_enfant || ''} (${c.classe_enfant || ''})` : '');
    if (sousTitre) {
        doc.fillColor(GREEN_DARK).fontSize(9).font('Helvetica-Bold').text(sousTitre, x + 12, cy, { width: w - 24 });
    }
    cy += 14;

    doc.moveTo(x + 12, cy).lineTo(x + w - 12, cy).dash(2, { space: 2 }).strokeColor(BORDER).stroke();
    doc.undash();
    cy += 6;

    doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text('MATRICULE', x + 12, cy);
    doc.fillColor(TEXT).fontSize(11).font('Courier-Bold').text(c.code_unique || '', x + 12, cy + 10, { width: w - 24 });
    cy += 28;

    doc.moveTo(x + 12, cy).lineTo(x + w - 12, cy).dash(2, { space: 2 }).strokeColor(BORDER).stroke();
    doc.undash();
    cy += 6;

    doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text('MOT DE PASSE', x + 12, cy);
    doc.fillColor(GREEN).fontSize(12).font('Courier-Bold').text(c.mot_de_passe_temporaire || '', x + 12, cy + 10, { width: w - 24 });
    cy += 28;

    if (siteUrl) {
        doc.fillColor(MUTED).fontSize(7).font('Helvetica').text(siteUrl, x + 12, cy, { width: w - 24, align: 'center' });
    }
}

// ══════════════════════════════════════
// TABLEAU GÉNÉRIQUE (absences, convocations…)
// ══════════════════════════════════════
function streamTablePdf(res, { title, subtitle, filename, columns, rows }) {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const pageW = doc.page.width, pageH = doc.page.height;
    const marginX = 30, marginY = 30;
    const totalW = pageW - marginX * 2;
    const rowH = 22;
    const headH = 26;

    // Largeurs de colonnes : proportionnelles à ce que chaque appelant
    // demande (colonnes larges pour "Élève"/"Motif", étroites pour "Date").
    const totalWeight = columns.reduce((s, c) => s + (c.weight || 1), 0);
    let cx = marginX;
    columns.forEach(c => { c._x = cx; c._w = (totalW * (c.weight || 1)) / totalWeight; cx += c._w; });

    function drawPageHeader(isFirst) {
        let y = marginY;
        if (isFirst) {
            doc.fillColor(TEXT).fontSize(15).font('Helvetica-Bold').text(title, marginX, y);
            y += 20;
            doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`${subtitle} · ${rows.length} ligne(s) · Généré le ${today()}`, marginX, y);
            y += 20;
        }
        doc.rect(marginX, y, totalW, headH).fill(GREEN_DARK);
        columns.forEach(c => {
            doc.fillColor('#fff').fontSize(8.5).font('Helvetica-Bold')
                .text(c.label.toUpperCase(), c._x + 6, y + 8, { width: c._w - 12, lineBreak: false });
        });
        return y + headH;
    }

    let y = drawPageHeader(true);
    rows.forEach((row, i) => {
        if (y + rowH > pageH - marginY) {
            doc.addPage();
            y = drawPageHeader(false);
        }
        if (i % 2 === 1) doc.rect(marginX, y, totalW, rowH).fill(IVORY);
        doc.strokeColor(BORDER).lineWidth(0.5).moveTo(marginX, y + rowH).lineTo(marginX + totalW, y + rowH).stroke();
        columns.forEach(c => {
            const val = row[c.key] != null ? String(row[c.key]) : '';
            doc.fillColor(c.colorKey && row[c.colorKey] ? row[c.colorKey] : TEXT)
                .fontSize(8.5).font('Helvetica')
                .text(val, c._x + 6, y + 6, { width: c._w - 12, height: rowH - 8, lineBreak: false, ellipsis: true });
        });
        y += rowH;
    });

    if (!rows.length) {
        doc.fillColor(MUTED).fontSize(10).font('Helvetica').text('Aucune donnée à afficher.', marginX, y + 16);
    }

    // Numérotation des pages — la position tombe volontairement dans la
    // marge basse de la page ; sans désactiver cette marge le temps du
    // dessin, PDFKit considère le texte "hors zone" et insère toute
    // seule une page vierge supplémentaire avant de l'écrire.
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.page.margins.bottom = 0;
        doc.fillColor(MUTED).fontSize(7.5).font('Helvetica')
            .text(`Campus Numérique FASO · Page ${i + 1}/${range.count}`, marginX, pageH - 20, { width: totalW, align: 'center', lineBreak: false });
    }

    doc.end();
}

// ══════════════════════════════════════
// BULLETIN DE NOTES — calé sur le modèle papier de l'établissement.
// data vient de services/bulletinService.calculerBulletinComplet().
// ══════════════════════════════════════
async function streamBulletinPdf(res, data, baseUrl) {
    // Le QR de vérification doit être généré AVANT de commencer à écrire
    // dans le flux PDF (doc.pipe(res)) — QRCode.toBuffer est asynchrone,
    // et pdfkit ne permet pas d'attendre au milieu d'un flux déjà démarré.
    let qrBuffer = null;
    if (data.signature && data.signature.code_verification && baseUrl) {
        try {
            const url = `${baseUrl}/verifier-bulletin.html?code=${data.signature.code_verification}`;
            qrBuffer = await QRCode.toBuffer(url, { width: 300, margin: 1, color: { dark: '#1E2818', light: '#FFFFFF' } });
        } catch (e) {
            console.error('QRCode.toBuffer:', e.message);
        }
    }

    const doc = new PDFDocument({ size: 'A4', margin: 32, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bulletin_T${data.trimestre}_${(data.eleve.code_unique || '').replace(/[^a-zA-Z0-9]/g, '')}.pdf"`);
    doc.pipe(res);

    const pageW = doc.page.width, pageH = doc.page.height;
    const marginX = 32, marginY = 32;
    const totalW = pageW - marginX * 2;
    let y = marginY;

    // En-tête
    doc.roundedRect(marginX, y, totalW, 46, 8).fill(GREEN_DARK);
    doc.fillColor('#fff').fontSize(15).font('Helvetica-Bold').text(data.etablissement.toUpperCase(), marginX, y + 9, { width: totalW, align: 'center' });
    doc.fontSize(9.5).font('Helvetica').text(
        `BULLETIN DE NOTES — ${data.trimestre}${data.trimestre === 1 ? 'ER' : 'ÈME'} TRIMESTRE — ANNÉE SCOLAIRE ${data.annee_scolaire}`,
        marginX, y + 29, { width: totalW, align: 'center' }
    );
    y += 46 + 14;

    // Bloc identité élève — deux colonnes
    const colW = totalW / 2;
    const dateNaiss = data.eleve.date_naissance ? new Date(data.eleve.date_naissance).toLocaleDateString('fr-FR') : '—';
    const champsGauche = [
        ['Nom et prénom(s)', `${data.eleve.prenom} ${data.eleve.nom}`.toUpperCase()],
        ['Sexe', data.eleve.sexe || '—'],
        ['Date et lieu de naissance', dateNaiss + (data.eleve.lieu_naissance ? ` à ${data.eleve.lieu_naissance}` : '')],
        ['Matricule', data.eleve.code_unique],
    ];
    const champsDroite = [['Classe', data.eleve.classe], ['Effectif de la classe', String(data.effectif_classe)], ['Année scolaire', data.annee_scolaire]];
    let yG = y, yD = y;
    for (const [label, val] of champsGauche) {
        doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(label.toUpperCase(), marginX, yG);
        doc.fillColor(TEXT).fontSize(10).font('Helvetica-Bold').text(val || '—', marginX, yG + 10);
        yG += 26;
    }
    for (const [label, val] of champsDroite) {
        doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(label.toUpperCase(), marginX + colW, yD);
        doc.fillColor(TEXT).fontSize(10).font('Helvetica-Bold').text(val || '—', marginX + colW, yD + 10);
        yD += 26;
    }
    y = Math.max(yG, yD) + 8;

    // Tableau des matières
    const cols = [
        { key: 'nom', label: 'Discipline', weight: 2.3 },
        { key: 'coefficient', label: 'Coef', weight: 0.55 },
        { key: 'devoirs', label: 'Devoirs', weight: 0.85 },
        { key: 'compo', label: 'Compo.', weight: 0.85 },
        { key: 'moyenne', label: 'Moyenne', weight: 0.9 },
        { key: 'note_ponderee', label: 'Note pond.', weight: 0.95 },
        { key: 'rang', label: 'Rang', weight: 0.6 },
        { key: 'appreciation', label: 'Appréciation du professeur', weight: 2.4 },
    ];
    const totalWeight = cols.reduce((s, c) => s + c.weight, 0);
    let cx = marginX;
    for (const c of cols) { c._x = cx; c._w = (totalW * c.weight) / totalWeight; cx += c._w; }
    const headH = 22;

    function drawHead() {
        doc.rect(marginX, y, totalW, headH).fill(GREEN_DARK);
        for (const c of cols) {
            doc.fillColor('#fff').fontSize(7.3).font('Helvetica-Bold').text(c.label.toUpperCase(), c._x + 4, y + 7, { width: c._w - 8, align: c.key === 'nom' || c.key === 'appreciation' ? 'left' : 'center', lineBreak: false });
        }
        y += headH;
    }
    drawHead();

    let domaineActuel = '';
    let sommePond = 0, sommeCoef = 0;
    data.matieres.forEach((m, i) => {
        if (m.domaine && m.domaine !== domaineActuel) {
            domaineActuel = m.domaine;
            if (y + 14 > pageH - marginY - 90) { doc.addPage(); y = marginY; drawHead(); }
            doc.rect(marginX, y, totalW, 13).fill(IVORY);
            doc.fillColor(GREEN_DARK).fontSize(6.8).font('Helvetica-Bold').text(m.domaine.toUpperCase(), marginX + 4, y + 3, { width: totalW - 8 });
            y += 13;
        }

        const appreciationH = doc.font('Helvetica').fontSize(7.2).heightOfString(m.appreciation || '—', { width: cols[7]._w - 8 });
        const rowH = Math.max(18, appreciationH + 8);
        if (y + rowH > pageH - marginY - 90) { doc.addPage(); y = marginY; drawHead(); }

        if (i % 2 === 1) doc.rect(marginX, y, totalW, rowH).fill(IVORY);
        doc.strokeColor(BORDER).lineWidth(0.5).moveTo(marginX, y + rowH).lineTo(marginX + totalW, y + rowH).stroke();

        const noteColor = m.moyenne === null ? MUTED : (m.moyenne >= 10 ? GREEN : '#A93226');
        const vals = {
            nom: m.nom,
            coefficient: String(m.coefficient),
            devoirs: m.devoirs.length ? (m.devoirs.reduce((a, b) => a + b, 0) / m.devoirs.length).toFixed(1) : '—',
            compo: m.compos.length ? m.compos[m.compos.length - 1].toFixed(1) : '—',
            moyenne: m.moyenne !== null ? m.moyenne.toFixed(2) : '—',
            note_ponderee: m.note_ponderee !== null ? m.note_ponderee.toFixed(2) : '—',
            rang: m.rang ? String(m.rang) : '—',
            appreciation: m.appreciation || '—',
        };
        for (const c of cols) {
            const isNum = !['nom', 'appreciation'].includes(c.key);
            doc.fillColor(c.key === 'moyenne' || c.key === 'note_ponderee' ? noteColor : TEXT)
                .fontSize(c.key === 'nom' ? 7.6 : 7.2).font(c.key === 'nom' ? 'Helvetica-Bold' : 'Helvetica')
                .text(vals[c.key], c._x + 4, y + 5, { width: c._w - 8, align: isNum ? 'center' : 'left' });
        }
        sommePond += (m.note_ponderee || 0);
        sommeCoef += m.coefficient;
        y += rowH;
    });

    // Totaux
    doc.rect(marginX, y, totalW, 20).fill(GREEN_DARK);
    doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold').text('TOTAUX', marginX + 4, y + 6, { width: cols[1]._x - marginX - 8 });
    doc.text(String(sommeCoef), cols[1]._x + 4, y + 6, { width: cols[1]._w - 8, align: 'center' });
    doc.text(sommePond.toFixed(2), cols[5]._x + 4, y + 6, { width: cols[5]._w - 8, align: 'center' });
    y += 20 + 12;

    // Synthèse — cartes
    const cartes = [
        ['Moyenne du trimestre', data.moyenne_generale !== null ? data.moyenne_generale.toFixed(2) + '/20' : '—'],
        ['Mention', data.mention || '—'],
        ['Rang', data.rang_general ? `${data.rang_general}e / ${data.effectif_classe}` : '—'],
        ['Moyenne de la classe', data.moyenne_classe !== null ? data.moyenne_classe.toFixed(2) : '—'],
        ['Meilleure moyenne', data.meilleure_moyenne !== null ? data.meilleure_moyenne.toFixed(2) : '—'],
        ['Plus faible moyenne', data.plus_faible_moyenne !== null ? data.plus_faible_moyenne.toFixed(2) : '—'],
        ['Moyenne annuelle', data.moyenne_annuelle !== null ? data.moyenne_annuelle.toFixed(2) + '/20' : '—'],
        ['Rang annuel', data.rang_annuel ? `${data.rang_annuel}e / ${data.effectif_classe}` : '—'],
        ['Décision', data.decision || '—'],
    ];
    const carteW = totalW / 3, carteH = 42;
    const carteRows = Math.ceil(cartes.length / 3);
    if (y + carteRows * (carteH + 8) > pageH - marginY - 50) { doc.addPage(); y = marginY; }
    cartes.forEach((c, i) => {
        const cx2 = marginX + (i % 3) * carteW;
        const cy2 = y + Math.floor(i / 3) * (carteH + 8);
        const accent = c[0] === 'Décision' && data.decision && data.decision.startsWith('À revoir');
        doc.roundedRect(cx2, cy2, carteW - 8, carteH, 6).lineWidth(1).strokeColor(accent ? '#A93226' : BORDER).stroke();
        doc.fillColor(MUTED).fontSize(7).font('Helvetica').text(c[0].toUpperCase(), cx2 + 8, cy2 + 8, { width: carteW - 24 });
        doc.fillColor(accent ? '#A93226' : TEXT).fontSize(c[0] === 'Décision' ? 9.5 : 12).font('Helvetica-Bold').text(c[1], cx2 + 8, cy2 + 20, { width: carteW - 24 });
    });
    y += carteRows * (carteH + 8) + 2;

    if (data.mention_honneur) {
        if (y + 24 > pageH - marginY - 30) { doc.addPage(); y = marginY; }
        doc.roundedRect(marginX, y, totalW, 22, 6).fill(GOLD);
        doc.fillColor('#fff').fontSize(9.5).font('Helvetica-Bold').text(data.mention_honneur.toUpperCase(), marginX, y + 6, { width: totalW, align: 'center' });
        y += 22 + 10;
    }

    // Signature
    const sigBlockH = qrBuffer ? 118 : 50;
    if (y + sigBlockH > pageH - marginY) { doc.addPage(); y = marginY; }
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(`Bulletin généré le ${today()}`, marginX, y);

    const sigX = marginX + totalW - 160;
    if (data.signature) {
        const dateSign = new Date(data.signature.date_signature).toLocaleDateString('fr-FR');
        doc.fillColor(GREEN_DARK).fontSize(9).font('Helvetica-Bold').text('Signé électroniquement', sigX, y, { width: 160, align: 'center' });
        doc.fillColor(TEXT).fontSize(7.5).font('Helvetica').text(`Par ${data.signature.signataire}`, sigX, y + 13, { width: 160, align: 'center' });
        doc.fillColor(MUTED).fontSize(7).font('Helvetica').text(`Le ${dateSign}`, sigX, y + 24, { width: 160, align: 'center' });
        if (qrBuffer) {
            doc.image(qrBuffer, sigX + 55, y + 36, { width: 50, height: 50 });
            doc.fillColor(MUTED).fontSize(5.6).font('Helvetica').text('Scanner pour vérifier l\'authenticité', sigX, y + 88, { width: 160, align: 'center' });
        }
        if (data.signature.modifie) {
            doc.fillColor('#A93226').fontSize(6.8).font('Helvetica-Bold')
                .text('⚠ Notes modifiées depuis la signature', sigX, y + (qrBuffer ? 100 : 36), { width: 160, align: 'center' });
        }
    } else {
        doc.fillColor(TEXT).fontSize(9).font('Helvetica-Bold').text('La Direction', sigX, y, { width: 160, align: 'center' });
        doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(data.etablissement, sigX, y + 26, { width: 160, align: 'center' });
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.page.margins.bottom = 0;
        doc.fillColor(MUTED).fontSize(7).font('Helvetica')
            .text(`${data.etablissement} · Page ${i + 1}/${range.count}`, marginX, pageH - 18, { width: totalW, align: 'center', lineBreak: false });
    }

    doc.end();
}

module.exports = { streamFichesIdentifiants, streamTablePdf, streamBulletinPdf };
