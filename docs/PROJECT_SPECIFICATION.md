# BP LAB 2026 — Specifica Completa del Progetto

## 1. Panoramica

**Progetto:** Menu Bar/BP LAB 2026 - Pannello di amministrazione per generare menu stampabili
**Formato pagina:** 148 x 185 mm (personalizzato, configurabile)
**Stampa:** Imposizione a sella (saddle-stitch booklet), bleed 3mm, crocini
**Font:** Tuaf (display), ABC Camera (body)
**Output:** PDF via browser print dialog + HTML + JSON export

## 2. Architettura Generale

Il progetto è composto da 5 file JavaScript caricati in ordine:
1. `chart-generator.js` — Generatore radar chart SVG (dipende da window.RadarChart)
2. `admin-state.js` — Stato, migrazione, metodi CRUD (espone `window.AdminState`)
3. `admin-preview.js` — Rendering HTML/CSS delle pagine (espone `window.AdminPreview`)
4. `admin-webgl.js` — Generatore sfondi WebGL/SVG (espone `window.AdminWebGL`)
5. `admin.js` — UI bindings, eventi, esportazione (espone `window.AdminApp`)

**Vincoli severi:**
- Solo `var`, no `const/let`, no arrow functions, solo string concatenation (no template literals)
- Tutti i JS devono passare `node --check` senza errori
- CSS custom properties per colori e tipografia

## 3. Sistema Colori (Palette)

### Chiavi palette (salvate in localStorage):
```js
{ bg: '#121420', h1Color: '#F2CD77', h2Color: '#7BBEBC', h3Color: '#e0e0e0', bodyColor: '#e0e0e0', captionColor: '#a0a0a0', extra: [] }
```

### CSS Variables generate al render:
```
--color-bg, --color-h1, --color-h2, --color-h3, --color-body, --color-caption, --font-display, --font-body
```

### Tipografia:
```js
{ h1: 42, h2: 24, h3: 16, body: 11, caption: 8 }  // tutti in pt
```

### Layout:
```js
{ padTop: 24, padRight: 24, padBottom: 24, padLeft: 24, blockGap: 6, lineHeight: 1.6 }  // mm
```

### Stampa:
```js
{ bleed: 3, pageW: 148, pageH: 185, cropMarks: false }
```

## 4. Sistema Blocchi e Griglia

### Ogni pagina ha:
```js
{ type, label, grid: { rows: [{id, cols, gap}], rowGap }, blocks: [{id, type, gridRow, colIndex, widthPct, content, style, level, chartData?}] }
```

### Livelli Tipografici (level):
```
h1 → font Tuaf, size typography.h1, uppercase bold
h2 → font Tuaf, size typography.h2, uppercase bold  
h3 → font ABC Camera, size typography.h3, transform none (normale)
body → font ABC Camera, size typography.body
caption → font ABC Camera, size typography.caption
```

### Mappatura Blocchi per tipo pagina:

| Tipo Pagina | Griglia | Blocchi | Note |
|---|---|---|---|
| **cover** | 3 rows × 1 col | B1: titolo (h1, row 2), B2: subtitle (caption, row 3) | Row 1 vuota |
| **prefazione** | 1×1 | B1: testo prefazione (body) | |
| **drink-left** | 4×1 | B1: nome (h1), B2: profilo (h2), B3: ingredienti (h3), B4: chart | Ogni Signature drink |
| **drink-right** | 1×1 | Vuoto (sfondo WebGL) | |
| **list** | Riga titolo (1 col) + N righe (2 col) | btitle: titolo (h2), B1: nome drink (no level, col 1, captionColor), B2: profilo (no level, col 2, h2Color) | Intramontabili/After Dinner/Analcolici |
| **vermouth** | 2×1 | B1: "The Spiritual Machine" (h2), B2: Vermouth/Bitter/Spezie (body) | |
| **colophon** | 2×1 | B1: "BP LAB 2026" (h2), B2: copyright (caption) | |
| **back-cover** | 1×1 | Vuoto | Sfondo WebGL |

### Risoluzione colore blocco:
1. `style.colorKey` → risolvi da palette live (`p[h1Color]`, `p[extra0]`, ecc.)
2. `style.color` (hex legacy)
3. `block.level` → `p[level + 'Color']` (es. h1 → h1Color)

## 5. GUI — 3 Colonne

### Colonna 1 — ASSETS (sinistra)

**Colori:**
- 6 color picker: Bg, H1, H2, H3, Body, Caption
- Colori extra (aggiungibili/rimuovibili)
- Ogni campo: `<input type="color">` + `<input class="hex-input">` + `<span class="swatch">`

**Tipografia:**
- 5 slider range: H1 (12-72pt), H2 (10-48pt), H3 (8-32pt), Body (6-18pt), Caption (5-14pt)
- Mostra valore corrente + "pt"

**Spaziatura:**
- 6 slider: Pad Top/Right/Bottom/Left (5-80mm), Block Gap (0-20mm), Line Height (1-3)

**Stampa:**
- Bleed (0-10mm), Crop toggle, W (50-500mm), H (50-500mm)

### Colonna 2 — PAGINA (centro)

**Intestazione:** "PAGINA N — Label"

**Sezione Griglia:**
- Row Gap slider
- Per ogni riga: label "Riga N", tasto cancella, controlli colonne (-/+/span), gap slider, bottoni "+ Testo" / "+ Immagine"
- Bottone "+ Aggiungi riga"

**Sezione Blocco (se selezionato):**
- Width % slider
- Altezza toggle (Auto / %) — `style.fixedHeight`
- Livello Tipografico: 5 bottoni (H1/H2/H3/Body/Cap) — `applyBlockLevel()`
- Sposta: ▲/▼ (gridRow), ◀/▶ (colIndex)
- Style overrides: Font (select Tuaf/ABC Camera), Size (number), Weight (select Normal/Bold), Colore (swatches grid), Valign, Halign, Transform, Line Height
- Contenuto: textarea (testo) o URL + file upload (immagine)
- Azioni: Elimina, Duplica

**Sezione Sfondo:**
- Miniature background, bottone "Rimuovi sfondo", colore override

**Override Pagina:**
- Tipografia: H1/H2/H3 override per pagina
- Spaziatura: PadTop/PadBottom/BlockGap override per pagina

### Colonna 3 — SFONDO (destra)

- Mini canvas preview
- WebGL palette swatches (attivabili/disattivabili)
- Parametri: Row, MX, MY, GX, GY, Big Tiles toggle, Use Pairs toggle, Prob slider, Big Tile Mode select
- **Bottone GENERA** — genera e salva background senza applicare
- **Bottone APPLICA** — applica l'ultimo background generato alla pagina corrente
- Griglia thumbnail backgrounds (click per assegnare a pagina, X per eliminare)

### Toolbar Preview (sopra anteprima centrale)

- 3 bottoni: Pagina / Spread / Tutte
- Slider zoom (10-200%)
- Indicatore "Pag. N / Totale"

### Footer Export

- PDF (apre nuova finestra → print dialog con saddle-stitch imposition)
- HTML (scarica menu-print.html + admin-save.json)
- JSON (esporta drinks.json)
- Reset (cancella localStorage e ricarica)

## 6. Sistema di Rendering

### getPageHTML(pageNum, adminState) — admin-preview.js

1. Estrae state, palette, typography, layout, blocks, grid
2. Se `pageInfo.grid && pageInfo.blocks`:
   - Per ogni riga `grid.rows[]`:
     - Determina `rowFlex`: se almeno un blocco nella riga ha `fixedHeight=true`, riga = `flex:1`, altrimenti `flex:0 0 auto`
     - Mappa blocchi della riga in `colSlots[]` (basato su `gridRow` e `colIndex`)
     - Per ogni slot: calcola `buildBlockStyle()` + `buildBlockContent()`
     - slot e blocco condividono `flex` uguale
   - Wrapper con bleed + padding + palette CSS vars
3. Altrimenti → `getFallbackPageHTML()` (legacy)

### buildBlockStyle(block, t, p)
- Se `block.level`: applica preset tipografico (font, size, weight, transform, lineH)
- Risolve colore: `colorKey → p[key]` > `s.color` > `block.level → p[level+'Color']`
- Restituisce stringa CSS inline

### buildBlockContent(block)
- Chart → RadarChart.generateRadar()
- Image → `<img>` o placeholder
- Text → escaped content con `<br>` per newline

### Page Height (fixedHeight toggle)
- Toggle Auto (off): blocco `flex: 0 0 auto`, si chiude al contenuto
- Toggle % (on): blocco `flex: 1`, riempie lo spazio
- La riga si adatta: se nessun blocco ha fixedHeight → `flex: 0 0 auto`; se almeno uno ha fixedHeight → `flex: 1`

## 7. Pagine di Default (24 pagina)

1. Cover (titolo + subtitle)
2. Prefazione (testo introduttivo)
3-18. 8 drink Signature (sinistra + destra)
19. Lista Intramontabili (7 drink classici)
20. Lista After Dinner (5 drink)
21. Lista Analcolici (5 drink)
22. Vermouth Experience (The Spiritual Machine)
23. Colophon
24. Back Cover

## 8. Saddle-Stitch Imposition (PDF Export)

- Ogni foglio = 2 facce, ogni faccia = 2 pagine
- Regola N+1: la somma di ogni coppia = total + 1
- Padding a multiplo di 4 con pagine vuote
- Spread layout: [N+1-c, N+1-a] + [N+1-f, N+1-e]
- Bleed 3mm su tutti i lati
- Crocini agli angoli di trim
- Spine marks (top/bottom center)
- Background fill si ferma alla spine

## 9. Migrazione Dati (migrateLegacyPages)

Eseguita ad ogni caricamento. Costruisce grid+blocks per ogni pagina che non li ha già.
1. Migra vecchi grid (cols/rows → rows array)
2. Aggiunge colIndex/widthPct/level mancanti
3. Crea grid+blocks per ogni tipo pagina con contenuti da drinks.json
4. Converte `style.color` (hex) → `style.colorKey` mappando ai nuovi palette keys
5. Mappa vecchie chiavi: gold→h1Color, teal→h2Color, text→bodyColor, muted→captionColor, bgDeep/bgDark→eliminati

## 10. Esportazione HTML

Il bottone HTML scarica:
- `menu-print.html` — tutte le pagine in HTML con CSS
- `admin-save.json` — stato completo del progetto (da mettere in `app/` per `generate_pdf.py`)

Il file Python `generate_pdf.py` legge `admin-save.json` e genera PDF con WeasyPrint.
