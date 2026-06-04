# BP LAB 2026 — Knowledge Document (Documento di Conoscenza)

> **Scopo:** Manuale completo per sviluppi futuri, onboarding nuovi sviluppatori e riferimento tecnico del progetto.
> **Versione:** 1.0 — 04 Giugno 2026
> **Progetto:** Menu Bar/BP LAB 2026 — Pannello di amministrazione per generare menu stampabili
> **Creato da:** Nico Skolp — Creative Director & Developer

---

## INDICE

1. [Visione e Contesto](#1-visione-e-contesto)
2. [Architettura Generale](#2-architettura-generale)
3. [Tecnologie e Vincoli](#3-tecnologie-e-vincoli)
4. [Sistema di Stato (AdminState)](#4-sistema-di-stato-adminstate)
5. [Sistema di Rendering (AdminPreview)](#5-sistema-di-rendering-adminpreview)
6. [Sistema WebGL/Sfondi (AdminWebGL)](#6-sistema-webglsfondi-adminwebgl)
7. [Generatore Radar Chart (ChartGenerator)](#7-generatore-radar-chart-chartgenerator)
8. [Interfaccia Utente (Admin App)](#8-interfaccia-utente-admin-app)
9. [Sistema di Griglia e Blocchi](#9-sistema-di-griglia-e-blocchi)
10. [Colori e Palette](#10-colori-e-palette)
11. [Tipografia e Font](#11-tipografia-e-font)
12. [Formato Pagina e Stampa](#12-formato-pagina-e-stampa)
13. [Imposizione a Sella (Saddle Stitch)](#13-imposizione-a-sella-saddle-stitch)
14. [Generazione PDF (WeasyPrint)](#14-generazione-pdf-weasyprint)
15. [Esportazione e Flusso di Lavoro](#15-esportazione-e-flusso-di-lavoro)
16. [Drink List Completa](#16-drink-list-completa)
17. [Struttura delle Pagine](#17-struttura-delle-pagine)
18. [Configurazione Preset (Stato Corrente)](#18-configurazione-preset-stato-corrente)
19. [Bug Noti e FAQ](#19-bug-noti-e-faq)
20. [Roadmap e Sviluppi Futuri](#20-roadmap-e-sviluppi-futuri)
21. [Glossario](#21-glossario)

---

## 1. VISIONE E CONTESTO

### 1.1 Il Progetto

**BP LAB 2026** è il menu cocktail stampabile del BP LAB, locale situato nel quartiere Madonnella di Bari. Il progetto fa parte dell'iniziativa artistica **"La Via dei Colori"**, un laboratorio diffuso di luce, bellezza e partecipazione che trasforma il margine urbano attraverso interventi cromatici.

### 1.2 Concept Creativo

Il colore è narrazione. La drink list è l'estensione liquida di questa metamorfosi: **8 Signature cocktail**, ognuno associato a un'opera astratta generata proceduralmente (WebGL/SVG). La scomposizione cromatica diventa esperienza sensoriale — l'identità visiva de La Via dei Colori prende vita in ogni sorso.

### 1.3 Obiettivo Tecnico

Creare un pannello di amministrazione WYSIWYG che permetta di:
- Progettare visivamente ogni pagina del menu
- Controllare tipografia, colori, spaziatura a livello globale e per singola pagina
- Generare sfondi astratti procedurali via WebGL/SVG
- Esportare in PDF professionale con imposizione a sella (saddle-stitch booklet)
- Esportare in HTML standalone + JSON per la generazione offline via WeasyPrint

---

## 2. ARCHITETTURA GENERALE

### 2.1 Panoramica

```
┌──────────────────────────────────────────────────────────────────┐
│                        admin.html (GUI)                          │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │ Nav      │  │ Preview (centro) │  │ Controls (destra)    │   │
│  │ (sinistra│  │ - Pagina/Spread/ │  │ - Colori/Tipografia  │   │
│  │  220px)  │  │   Tutte          │  │ - Griglia/Blocchi    │   │
│  │          │  │ - Zoom 10-200%   │  │ - WebGL/Sfondi       │   │
│  │ 24 pages │  │ - Click blocco   │  │ - Export footer      │   │
│  └──────────┘  └──────────────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ chart-gen.js │  │ admin-state  │  │ admin-webgl  │
    │ (RadarChart) │  │ (CRUD+LState)│  │ (SVG bgs)    │
    └──────────────┘  └──────┬───────┘  └──────────────┘
                             │
                      ┌──────┴───────┐
                      │ admin-preview│
                      │ (HTML render)│
                      └──────────────┘
```

### 2.2 Ordine di Caricamento

I 5 file JavaScript sono caricati in `admin.html` in questo ordine preciso:

```html
<script src="js/chart-generator.js?v=6"></script>   <!-- 1. RadarChart (dipendenza) -->
<script src="js/admin-state.js?v=6"></script>        <!-- 2. AdminState (stato)     -->
<script src="js/admin-preview.js?v=6"></script>      <!-- 3. AdminPreview (render)  -->
<script src="js/admin-webgl.js?v=6"></script>        <!-- 4. AdminWebGL (sfondi)    -->
<script src="js/admin.js?v=6"></script>              <!-- 5. AdminApp (UI binding)  -->
```

**Regola:** Ogni file espone un oggetto su `window.*`. L'ordine è critico perché ogni modulo può dipendere dai precedenti.

### 2.3 Namespace Globali

| Namespace | File | Ruolo |
|-----------|------|-------|
| `window.RadarChart` | `chart-generator.js` | Generatore radar chart SVG (4 assi) |
| `window.AdminState` | `admin-state.js` | Stato globale, CRUD, localStorage, migrazione |
| `window.AdminPreview` | `admin-preview.js` | Rendering HTML/CSS delle pagine |
| `window.AdminWebGL` | `admin-webgl.js` | Generatore sfondi SVG procedurali |
| `window.AdminApp` | `admin.js` | UI binding, eventi, esportazione |

### 2.4 Flusso Dati

```
drinks.json ──► AdminState.init() ──► localStorage ──► AdminPreview.getPageHTML()
                     │                      │
                     ▼                      ▼
              migrateLegacyPages()    renderPreview()
                     │                      │
                     ▼                      ▼
              pages + grid + blocks   HTML nel previewContainer
```

---

## 3. TECNOLOGIE E VINCOLI

### 3.1 Stack Tecnologico

| Layer | Tecnologia | Note |
|-------|-----------|------|
| **Frontend** | HTML5 + CSS3 + JavaScript ES5 | No framework, vanilla JS |
| **Font** | Tuaf (display), ABC Camera (body) | Formato OTF, trial license |
| **Stato** | localStorage (`bplab_admin_v8`) | ~4.6 MB il salvataggio completo |
| **Dati** | JSON (`drinks.json`, `admin-save.json`) | Caricato via fetch |
| **Sfondi** | Canvas 2D + SVG inline | No WebGL reale, usa Canvas fallback |
| **PDF** | WeasyPrint (Python) | Da HTML generato |
| **Build** | Nessuno | Caricamento diretto file |

### 3.2 Vincoli Severi

1. **Solo `var`, no `const/let`** — Compatibilità browser legacy
2. **No arrow functions** — Solo `function` keyword
3. **No template literals** — Solo concatenazione stringhe con `+`
4. **Tutti i JS devono passare `node --check`** senza errori
5. **CSS custom properties** per colori e tipografia
6. **Nessuna dipendenza npm** per l'app principale (solo per v2_app sperimentale)

---

## 4. SISTEMA DI STATO (AdminState)

### 4.1 Struttura dello Stato

```javascript
state = {
  drinksData: { title, subtitle, prefazione[], vermouth_experience{}, drinks[] },
  typography:  { h1: 42, h2: 24, h3: 16, body: 11, caption: 8 },      // pt
  palette:     { bg, h1Color, h2Color, h3Color, bodyColor, captionColor, extra[] },
  layout:      { padTop, padRight, padBottom, padLeft, blockGap, lineHeight }, // mm
  pages:       { "1": { type, label, grid, blocks, backgroundId, ... }, ... },
  pageOrder:   [1, 2, 25, 3, 4, ...],  // ordine pagine (array di number)
  backgrounds: { "bg_123": { id, svg, config, created }, ... },
  print:       { bleed, pageW, pageH, cropMarks },
  selectedPage: 1,
  selectedBlock: { page: 3, blockId: "b1" } | null
}
```

### 4.2 Metodi Principali

| Metodo | Descrizione |
|--------|-------------|
| `init()` | Carica `drinks.json`, ripristina da localStorage, esegue migrazione |
| `getState()` | Restituisce l'intero oggetto stato |
| `getPageConfig(pageNum)` | Restituisce config pagina con override applicati |
| `addBlankPage()` | Aggiunge nuova pagina vuota con griglia 1×1 |
| `removePage(pageNum)` | Rimuove pagina e aggiorna pageOrder |
| `movePageUp/Down(pageNum)` | Riordina pagine |
| `updateTypography(key, value)` | Aggiorna tipografia globale |
| `updatePalette(key, value)` | Aggiorna colore palette |
| `updateLayout(key, value)` | Aggiorna spaziatura globale |
| `addBlock(pageNum, type)` | Aggiunge blocco (text/image) |
| `removeBlock(pageNum, blockId)` | Rimuove blocco |
| `updateBlock(pageNum, blockId, field, value)` | Aggiorna campo blocco |
| `applyBlockLevel(pageNum, blockId, level)` | Applica preset tipografico |
| `moveBlock(pageNum, blockId, direction)` | Sposta blocco (up/down/left/right) |
| `addRow(pageNum)` | Aggiunge riga alla griglia |
| `removeRow(pageNum, rowId)` | Rimuove riga |
| `addBackground(id, svg, config)` | Salva sfondo generato |
| `assignBackgroundToPage(pageNum, bgId)` | Assegna sfondo a pagina |
| `exportJSON()` | Esporta drinks.json |
| `saveToStorage()` | Salva in localStorage |
| `migrateLegacyPages()` | Converte vecchio formato al nuovo grid system |

### 4.3 Sistema di Caricamento (loadFromStorage)

La funzione `loadFromStorage()` ora segue un ordine di priorità:

1. **File `admin-save.json`** — caricato per primo via fetch. È la fonte di verità del progetto.
2. **localStorage** — fallback solo se il file non è disponibile (es. offline).
3. **Default** — se nessuna fonte è disponibile, genera pagine vuote dai default.

Questo garantisce che il preset completo (4.6 MB, con sfondi e blocchi) venga sempre caricato correttamente, anche dopo un reset del localStorage.

### 4.4 Sistema di Override per Pagina

Ogni pagina può avere override per:
- **Tipografia:** `overrides.typography.h1`, `.h2`, `.h3`
- **Spaziatura:** `overrides.layout.padTop`, `.padBottom`, `.blockGap`
- **Colore:** `bgColorOverride` (colore sfondo personalizzato)
- **Sfondo:** `backgroundId` (riferimento a sfondo WebGL)

Gli override vengono applicati in `getPageConfig()`:

```javascript
return {
  ...page,
  typography: { ...state.typography, ...typoOverride },
  palette: { ...state.palette, ...paletteOverride },
  layout: { ...state.layout, ...layoutOverride }
};
```

---

## 5. SISTEMA DI RENDERING (AdminPreview)

### 5.1 Funzione Principale: `getPageHTML(pageNum, adminState)`

Flusso di rendering:

1. Estrae `state`, `palette`, `typography`, `layout`, `blocks`, `grid`
2. Se la pagina ha `grid` + `blocks` (nuovo sistema):
   - Per ogni `grid.rows[]`:
     - Determina `rowFlex`: se almeno un blocco ha `fixedHeight=true` → `flex: 1`, altrimenti `flex: 0 0 auto`
     - Mappa blocchi in `colSlots[]` per `colIndex`
     - Per ogni slot: calcola `buildBlockStyle()` + `buildBlockContent()`
   - Wrapper con bleed + padding + palette CSS vars
3. Altrimenti → `getFallbackPageHTML()` (render legacy)

### 5.2 `buildBlockStyle(block, t, p)`

Risoluzione dello stile di un blocco:

1. Se `block.level` è definito → applica preset tipografico (font, size, weight, transform, lineH, letterSpacing)
2. Risolve colore in ordine:
   - `style.colorKey` → palette key (es. `h1Color`, `extra0`)
   - `style.color` → hex legacy
   - `block.level` → `p[level + 'Color']` (es. `h1` → `p.h1Color`)
3. Restituisce stringa CSS inline

### 5.3 `buildBlockContent(block)`

| Tipo Blocco | Output |
|-------------|--------|
| `chart` | `RadarChart.generateRadar()` SVG |
| `image` | `<img src="...">` o placeholder |
| `text` | Contenuto escapato con `<br>` per newline |

### 5.4 Modalità di Preview

| Modalità | Metodo | Descrizione |
|----------|--------|-------------|
| `single` | `render(pageNum)` | Una pagina singola centrata |
| `spread` | `renderSpread(left, right)` | Due pagine affiancate |
| `all` | `renderAll()` | Tutte le pagine in colonna |

### 5.5 Sistema di Zoom

```javascript
zoomLevel: 0.1 – 2.0  (10% – 200%)
baseScale = scaleToFit()  // adatta alla finestra
finalScale = baseScale * zoomLevel
```

---

## 6. SISTEMA WEBGL/SFONDI (AdminWebGL)

### 6.1 Panoramica

**Nome modulo:** `window.AdminWebGL`
**File:** `app/js/admin-webgl.js`
**Nota:** Nonostante il nome, NON usa WebGL. Usa Canvas 2D + SVG inline. Il rendering è basato su composizione geometrica di forme SVG precaricate.

### 6.2 Pipeline di Generazione

```
Forme SVG (17 file) ──► Caricamento XHR ──► shapesMap{}
                            │
Palette colori ◄────────────┤
Parametri (perRow, gap,     │
  bigTiles, prob, mode) ────┤
                            ▼
                    generateLayout()
                    (calcola griglia blocchi)
                            │
                            ▼
                    generateSVG()
                    (compone SVG finale)
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        renderSVGToCanvas()      addBackground()
        (preview nel pannello)    (salva in state)
```

### 6.3 Parametri di Generazione

| Parametro | Default | Range | Descrizione |
|-----------|---------|-------|-------------|
| `perRow` | 4 | 1–15 | Colonne nella griglia |
| `marginX` | 0 | 0–200 | Margine orizzontale (px su 540 canvas) |
| `marginY` | 0 | 0–200 | Margine verticale (px) |
| `gapX` | 0 | 0–100 | Gap tra colonne |
| `gapY` | 0 | 0–100 | Gap tra righe |
| `bigTiles` | true | — | Attiva tile grandi |
| `bigTileProb` | 0.30 | 0–1 | Probabilità tile grande |
| `bigTileMode` | 2×2 | auto/2×1/1×2/2×2 | Dimensione tile grandi |
| `usePairs` | false | — | Disegna forme solo su tile pari |

### 6.4 Palette WebGL

La palette per gli sfondi è selezionabile tramite swatches cliccabili. I colori attivi sono quelli della palette globale + extra. Il primo colore (bg) è usato come sfondo, i successivi come colori dei tile e delle forme.

### 6.5 Forme SVG

17 forme caricate da `app/svgs/`:
`Forma_1, 3, 5, 6, 9, 11, 12, 13, 14, 15, 16, 17, 18, 20, 100, 101, 102.svg`

Dimensioni sorgente: 540×675 px (proporzione 4:5, come la pagina 148×185 mm)

### 6.6 Canvas di Anteprima

Il canvas nel pannello SFONDO ha dimensioni 540×675 px. La preview viene renderizzata come immagine da SVG via Blob URL.

---

## 7. GENERATORE RADAR CHART (ChartGenerator)

### 7.1 Panoramica

**Nome modulo:** `window.RadarChart`
**File:** `app/js/chart-generator.js`

Genera SVG inline di un grafico radar a 4 assi per rappresentare il profilo gustativo di ogni cocktail Signature.

### 7.2 Assi del Grafico

| Asse | Label | Posizione | Valore Max |
|------|-------|-----------|------------|
| **S** (Sweet) | Dolce | Alto (270°) | 5 |
| **A** (Acid) | Acido | Destra (0°) | 5 |
| **B** (Bitter) | Amaro | Basso (90°) | 5 |
| **F** (Lab) | Lab Factor | Sinistra (180°) | 5 |

### 7.3 API

```javascript
RadarChart.generateRadar(drinkData, config)

// drinkData: { name, taste: { sweet, acid, bitter, labFactor } }
// config: { width, height, colors: { grid, area, axis, text }, opacity }
// Restituisce: stringa SVG completa
```

### 7.4 Struttura SVG

1. 5 anelli concentrici (diamond rings, scale 1–5)
2. 4 linee degli assi
3. Poligono riempito (taste area)
4. Punti sugli angoli del poligono
5. Label degli assi

### 7.5 Valori dei Drink (dal Preset corrente)

| Drink | Sweet | Acid | Bitter | Lab |
|-------|-------|------|--------|-----|
| BIANCO SPORCO | 4 | 3 | 2 | 3 |
| EL DORADO | 3 | 2 | 4 | 3 |
| THE ORANGE COUNTY | 4 | 4 | 4 | 3 |
| RED • EMPTION | 3 | 3 | 4 | 4 |
| PINK FLUID | 5 | 2 | 2 | 5 |
| PURPLE RAIN | 3 | 0 | 4 | 3 |
| BLU WAVE | 2 | 1 | 2 | 5 |
| GREEN MATCHA | 3 | 3 | 3 | 3 |

---

## 8. INTERFACCIA UTENTE (Admin App)

### 8.1 Layout a 3 Colonne + Barra Laterale

```
┌──────────┬───────────────────────┬──────────────────────────────────┐
│ NAV BAR  │     PREVIEW AREA      │     CONTROLS (3 colonne)         │
│ (220px)  │                       │ ┌─────────┬────────┬──────────┐ │
│          │   Toolbar:            │ │ ASSETS  │ PAGINA │ SFONDO   │ │
│ Pag. 1 ■ │   [Pagina][Spread]    │ │         │        │          │ │
│ Pag. 2   │   [Tutte] [Zoom===]   │ │ Colori  │ Grid   │ Canvas   │ │
│ Pag. 3   │                       │ │ Tipo    │ Blocchi│ Palette  │ │
│ ...      │   ┌───────────────┐   │ │ Spazio  │ Sfondo │ Params   │ │
│ Pag. 24  │   │               │   │ │ Stampa  │ Overrd │ Generate │ │
│          │   │  ANTEPRIMA    │   │ │         │        │ Apply    │ │
│ [+Nuova] │   │  PAGINA       │   │ │         │        │ Gallery  │ │
│ [Elimina]│   │               │   │ │         │        │          │ │
│          │   └───────────────┘   │ └─────────┴────────┴──────────┘ │
│          │                       │ ┌──────────────────────────────┐ │
│          │   Pag. 1 / 24         │ │ [PDF] [HTML] [JSON] [Reset]  │ │
│          │                       │ └──────────────────────────────┘ │
└──────────┴───────────────────────┴──────────────────────────────────┘
```

### 8.2 Componenti UI

#### Colonna ASSETS
- **Colori:** 6 color picker (Bg, H1, H2, H3, Body, Caption) + colori extra
- **Tipografia:** 5 slider (H1 12-72pt, H2 10-48pt, H3 8-32pt, Body 6-18pt, Caption 5-14pt)
- **Spaziatura:** 6 slider (Pad T/R/B/L 5-80mm, Block Gap 0-20mm, Line Height 1-3)
- **Stampa:** Bleed (0-10mm), Crop toggle, W/H (50-500mm)

#### Colonna PAGINA
- **Griglia:** Row Gap slider, controlli per riga (colonne -/+, gap), bottoni +Testo / +Immagine
- **Blocco (se selezionato):**
  - Altezza: toggle Auto / %
  - Livello tipografico: H1/H2/H3/Body/Cap
  - Sposta: ▲▼◀▶
  - Style: Font, Size, Weight, Colore (swatches), Valign, Halign, Transform, Line Height
  - Contenuto: textarea o URL immagine + file upload
  - Azioni: Elimina, Duplica
- **Sfondo:** anteprima, rimuovi, colori di background
- **Override:** Tipografia (H1/H2/H3), Spaziatura (Pad Top/Bottom, Block Gap)
- **Contenuti:** editor specifici per tipo pagina

#### Colonna SFONDO
- Canvas anteprima (540×675)
- Palette swatches selezionabili
- Parametri slider (Row, MX, MY, GX, GY, Big Tiles, Use Pairs, Prob)
- Big Tile Mode select (Auto, 2×1, 1×2, 2×2)
- GENERA / APPLICA bottoni
- Griglia thumbnail sfondi generati

#### Barra Laterale (NAV)
- 24 thumbnail pagine con badge tipo (Cover, Drink, Bg, Lista, Spec, Info)
- Frecce ▲▼ per riordinare
- Bottone + Nuova Pagina, Elimina

### 8.3 Eventi e Binding

Tutti gli event listener sono registrati in `admin.js` dopo `DOMContentLoaded`. Il flusso di init:

```
DOMContentLoaded
  → AdminState.init()      // carica dati e stato
  → bindTypography()        // 5 slider tipografia
  → bindPalette()           // 6 color picker
  → bindLayout()            // 6 slider spaziatura + bleed/crop/W/H
  → bindZoom()              // zoom slider
  → initWebglSwatches()     // palette WebGL
  → bindWebGL()             // generator + apply
  → bindExport()            // PDF STAMPA / PDF PAGINE / HTML / JSON / Reset
  → bindPreviewMode()       // Pagina/Spread/Tutte
  → renderNavigation()      // barra laterale
  → renderBackgroundGrid()  // thumbnail sfondi
  → renderPageControls()    // controlli pagina
  → renderPreview()         // anteprima
```

### 8.4 Sistema di Toast

Notifiche temporanee in basso al centro, 2.5 secondi. Tipi: default, `success` (bordo teal), `error` (bordo danger).

---

## 9. SISTEMA DI GRIGLIA E BLOCCHI

### 9.1 Struttura di una Pagina

```javascript
{
  type: "drink-left",           // tipo pagina
  label: "BIANCO SPORCO",       // etichetta visibile
  drinkNumber: 1,               // riferimento al drink (per drink-left)
  section: "intramontabili",    // sezione (per list)
  backgroundId: "bg_123",       // riferimento sfondo
  bgColorOverride: "#ff0000",   // colore sfondo override
  overrides: {                  // override per pagina
    typography: { h1: 48 },
    layout: { padTop: 15 }
  },
  grid: {
    rows: [
      { id: "r1", cols: 1, gap: 8 },
      { id: "r2", cols: 1, gap: 8 },
      { id: "r3", cols: 2, gap: 8 },
      { id: "r4", cols: 1, gap: 8 }
    ],
    rowGap: 8                    // gap tra le righe (mm)
  },
  blocks: [
    {
      id: "b1",
      type: "text",              // text | image | chart
      gridRow: 1,                // numero riga (1-based)
      colSpan: 1,                // span colonne
      colIndex: 1,               // indice colonna (1-based)
      widthPct: 100,             // larghezza in %
      content: "BIANCO SPORCO",  // contenuto testo
      imageUrl: "",              // URL immagine (per type: image)
      chartData: {},             // dati grafico (per type: chart)
      level: "h1",               // livello tipografico (h1/h2/h3/body/caption/null)
      style: {
        font: "Tuaf",
        size: 55,
        weight: "bold",
        colorKey: "h1Color",     // riferimento palette
        align: "left",
        valign: "center",
        transform: "uppercase",
        letterSpacing: 3,
        lineH: 1.1,
        fixedHeight: null        // true = riempie spazio disponibile
      }
    }
  ]
}
```

### 9.2 Tipi di Pagina e Loro Griglie Predefinite

| Tipo | Griglia | Blocchi | Note |
|------|---------|---------|------|
| **cover** | 3 righe × 1 col | B1: titolo (h1, row 2), B2: subtitle (row 3) | Row 1 vuota |
| **prefazione** | 1 riga × 1 col (nel preset attuale: 5×1 con 12 blocchi) | Blocchi di testo personalizzati | |
| **drink-left** | 4 righe: 1col, 1col, 2col, 1col | B1: nome (h1), B2: profilo (h2), B3: ingredienti (h3 col 2), B4: chart | |
| **drink-right** | 1 riga × 1 col | B1: immagine | Sfondo WebGL |
| **list** | R1 (1col) + N righe (2col) | btitle + coppie nome/profilo | Intramontabili, After Dinner, Analcolici |
| **vermouth** | 2 righe × 1 colonna | B1: titolo (h2), B2-B4: Vermouth/Bitter/Spezie (body) | |
| **colophon** | 2 righe × 1 col | B1: "BP LAB 2026" (h2), B2: copyright (caption) | |
| **back-cover** | 1 riga × 1 col | Vuoto | Solo sfondo WebGL |
| **blank** | 1 riga × 1 col | 1 blocco testo vuoto | Pagina personalizzata |

### 9.3 Risoluzione del Colore di un Blocco

Ordine di priorità:
1. `style.colorKey` → lookup nella palette (`p.h1Color`, `p.extra0`, ecc.)
2. `style.color` → valore hex diretto (legacy)
3. `block.level` → `p[level + 'Color']` (es. `h1` → `p.h1Color`)

### 9.4 Sistema fixedHeight

- **Toggle Auto (off):** blocco `flex: 0 0 auto`, si chiude al contenuto
- **Toggle % (on):** blocco `flex: 1`, riempie lo spazio disponibile
- La riga si adatta: se nessun blocco ha `fixedHeight` → `flex: 0 0 auto`; se almeno uno → `flex: 1`

---

## 10. COLORI E PALETTE

### 10.1 Chiavi Palette

```javascript
palette = {
  bg: '#121420',            // sfondo pagina
  h1Color: '#F2CD77',      // titoli H1 (oro)
  h2Color: '#7BBEBC',      // sottotitoli H2 (teal)
  h3Color: '#e0e0e0',      // H3 / testo ingredienti
  bodyColor: '#e0e0e0',    // corpo testo
  captionColor: '#a0a0a0', // caption / footer
  extra: []                 // colori aggiuntivi per blocchi
}
```

### 10.2 Colori del Preset Corrente

Dal file `admin-save (10).json`:

| Chiave | Colore | Uso |
|--------|--------|-----|
| `bg` | `#ffffff` | Sfondo pagina |
| `h1Color` | `#000000` | Titoli |
| `h2Color` | `#000000` | Sottotitoli |
| `h3Color` | `#000000` | H3 / ingredienti |
| `bodyColor` | `#000000` | Corpo testo |
| `captionColor` | `#000000` | Caption |
| `extra[0]` | `#f6ecca` | Crema |
| `extra[1]` | `#e0ba71` | Oro chiaro |
| `extra[2]` | `#e38059` | Arancio/terracotta |
| `extra[3]` | `#f7979b` | Rosa |
| `extra[4]` | `#b080d6` | Viola |
| `extra[5]` | `#4889ad` | Blu |
| `extra[6]` | `#81a885` | Verde |
| `extra[7]` | `#c73c3f` | Rosso |

### 10.3 CSS Variables Generate

```css
--color-bg: #ffffff;
--color-h1: #000000;
--color-h2: #000000;
--color-h3: #000000;
--color-body: #000000;
--color-caption: #000000;
--color-border: rgba(0, 0, 0, 0.3);
--font-display: 'Tuaf', sans-serif;
--font-body: 'ABC Camera', sans-serif;
--tp-h1: 42pt;
--tp-h2: 24pt;
--tp-h3: 11pt;
--tp-body: 11pt;
--tp-caption: 14pt;
```

---

## 11. TIPOGRAFIA E FONT

### 11.1 Font in Uso

| Font | File | Peso | Uso |
|------|------|------|-----|
| **Tuaf Trial Bold** | `TuafTrial-Bold.otf` | 700 | Display (H1, H2) |
| **Tuaf Trial Bold Italic** | `TuafTrial-BoldIt.otf` | 700 italic | Display corsivo |
| **ABC Camera Plain Regular** | `ABCCameraPlain-Regular-Trial.otf` | 400 | Body, H3, caption |
| **ABC Camera Plain Bold** | `ABCCameraPlain-Bold-Trial.otf` | 700 | Body bold |
| **ABC Camera Plain Regular Italic** | `ABCCameraPlain-RegularItalic-Trial.otf` | 400 italic | Citazioni |
| **ABC Camera Plain Bold Italic** | `ABCCameraPlain-BoldItalic-Trial.otf` | 700 italic | Citazioni bold |

### 11.2 Valori Tipografici (Preset Corrente)

| Livello | Font | Size | Weight | Transform | Letter Spacing | Line Height |
|---------|------|------|--------|-----------|----------------|-------------|
| **h1** | Tuaf | 42pt | bold | uppercase | 2px | 1.2 |
| **h2** | Tuaf | 24pt | bold | uppercase | 2px | 1.2 |
| **h3** | ABC Camera | 11pt | normal | none | 1px | 1.4 |
| **body** | ABC Camera | 11pt | normal | none | 0px | 1.6 |
| **caption** | ABC Camera | 14pt | normal | none | 0px | 1.4 |

### 11.3 Livelli Tipografici dei Blocchi

Quando un blocco ha `level` impostato, eredita automaticamente il preset corrispondente. Modificando manualmente font/size/weight/transform il level viene resettato a `null`.

---

## 12. FORMATO PAGINA E STAMPA

### 12.1 Dimensioni (Preset Corrente)

```javascript
print = {
  bleed: 3,        // mm
  pageW: 148,      // mm
  pageH: 185,      // mm
  cropMarks: false // crocini di taglio
}
```

### 12.2 Area di Stampa Effettiva

Con bleed 3mm:
- **Pagina effettiva:** 148 × 185 mm
- **Con bleed:** 154 × 191 mm (3mm extra per lato)
- **Proporzioni:** ~4:5 (0.8)

### 12.3 Spaziatura (Preset Corrente)

```javascript
layout = {
  padTop: 10,      // mm
  padRight: 8,     // mm
  padBottom: 5,    // mm
  padLeft: 8,      // mm
  blockGap: 2,     // mm — gap tra blocchi nella stessa riga
  lineHeight: 1    // moltiplicatore
}
```

---

## 13. IMPOSIZIONE A SELLA (Saddle Stitch)

### 13.1 Concetto

L'imposizione a sella (saddle-stitch) organizza le pagine in modo che, una volta stampate, piegate e pinzate al centro, appaiano nell'ordine corretto. È il metodo standard per booklet, riviste e menu.

### 13.2 Regola Matematica

Per N pagine totali, ogni foglio contiene 4 pagine (2 per facciata). La somma dei numeri di pagina su ogni facciata è costante:

```
facciata fronte: [N, 1]     somma = N+1
facciata retro:  [2, N-1]   somma = N+1
```

### 13.3 Algoritmo

```javascript
total = ceil(pagine / 4) * 4;  // padding a multiplo di 4
for (i = 0; i < fogli; i++) {
  a = i * 2;
  c = total - 1 - a;
  f = a + 1;
  e = total - 2 - a;
  spreads.push([c, a]);  // fronte
  spreads.push([f, e]);  // retro
}
```

### 13.4 Layout del Foglio di Stampa

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌──────────┐        ┌──────────┐      │
│  │          │        │          │      │
│  │ Pag. N   │  SPINE │ Pag. 1   │      │
│  │          │   │    │          │      │
│  └──────────┘        └──────────┘      │
│                                         │
│  ◤ crop mark              crop mark ◥  │
│                                         │
└─────────────────────────────────────────┘
```

Dimensioni foglio per stampa: `(pageW * 2 + bleed * 2) × (pageH + bleed * 2)` = `302 × 191 mm`

### 13.5 Elementi di Stampa

- **Bleed:** 3mm su tutti i lati (il background si estende nel bleed)
- **Crop marks:** agli angoli del trim (5mm × 0.3mm)
- **Spine marks:** centro top/bottom (0.3mm × 5mm)
- **Background fill:** si ferma alla spine (centro foglio)

---

## 14. GENERAZIONE PDF (WeasyPrint)

### 14.1 Script Python

**File:** `app/generate_pdf.py` (497 righe)
**Dipende da:** `weasyprint`, `admin-save.json`, `data/drinks.json`

### 14.2 Comportamento

1. Se esiste `app/admin-save.json` → usa lo stato salvato (grid+blocks)
2. Se non esiste → genera layout legacy 24 pagine da `drinks.json`
3. Produce `menu-print.html` (HTML intermedio)
4. Con WeasyPrint installato: genera PDF (`BP_LAB_2026_{W}x{H}.pdf`)

### 14.3 Comando

```bash
./generate.sh
```

Lo script:
1. Attiva il virtual environment `.venv/`
2. Installa weasyprint se necessario
3. Configura `DYLD_LIBRARY_PATH` per Homebrew (macOS)
4. Esegue `python3 app/generate_pdf.py`
5. Output: `BP_LAB_2026_148x185.pdf` nella root

### 14.4 WeasyPrint Notes

- Supporta `@page { size: 148mm 185mm; bleed: 3mm; }`
- Rispetta `-webkit-print-color-adjust: exact` e `print-color-adjust: exact`
- I font devono essere accessibili come file locali (`.otf`)
- Le immagini base64 inline sono supportate

---

## 15. ESPORTAZIONE E FLUSSO DI LAVORO

### 15.1 Pulsanti Export (Footer)

| Bottone | Output | Descrizione |
|---------|--------|-------------|
| **PDF STAMPA** | Nuova finestra → print dialog | Imposizione a sella (saddle-stitch), pagine riordinate per la stampa tipografica. Pronto per la stampa su fogli grandi |
| **PDF PAGINE** | Nuova finestra → print dialog | Pagine singole in ordine sequenziale (1, 2, 3...), una per foglio. Utile per anteprima, revisione o stampa non rilegata |
| **HTML** | `menu-print.html` + `admin-save.json` | Download ZIP-like (2 file separati). Da spostare in `app/` e eseguire `./generate.sh` |
| **JSON** | `drinks-export.json` | Solo dati drink, senza stato pagine |
| **Reset** | — | Cancella localStorage e ricarica |

### 15.2 Flusso di Lavoro Completo

1. **Design:** Usare `admin.html` nel browser per progettare il menu
2. **Salvataggio:** Automatico in localStorage ad ogni modifica
3. **Backup:** Cliccare HTML per scaricare `admin-save.json` (backup completo)
4. **Esportazione:** Cliccare JSON per esportare solo i dati drink
5. **PDF Stampa:** Cliccare PDF STAMPA per imposizione a sella (ordine tipografia: [N,1], [2,N-1], ...)
6. **PDF Pagine:** Cliccare PDF PAGINE per pagine singole in ordine 1→N (per anteprima/revisione)
7. **PDF Finale (WeasyPrint):**
   - Opzione A: Cliccare PDF STAMPA per stampa diretta via browser (imposizione a sella)
   - Opzione B: Cliccare PDF PAGINE per stampa diretta via browser (pagine singole)
   - Opzione C: Scaricare HTML, copiare `admin-save.json` in `app/`, eseguire `./generate.sh`

---

## 16. DRINK LIST COMPLETA

### 16.1 Signature Cocktails (8 drink)

| # | Nome | Profilo | Base Alcolica | Note |
|---|------|---------|---------------|------|
| 1 | **BIANCO SPORCO** | DOLCE - CREMOSO | Gin Barmaster | Latte di mandorla, melone bianco, pandan, meringue |
| 2 | **EL DORADO** | FRESCO - SPARKLING | Tequila Corralejo | Curcuma, Galliano, ananas, bergamotto, bambù |
| 3 | **THE ORANGE COUNTY** | ESOTICO - SPICED | Rum Mix (Botran, Worthy Park, Clairin) | Sambuco, mango, passion fruit, Jerry Thomas bitter |
| 4 | **RED • EMPTION** | AFFUMICATO - AROMATICO | Mezcal 400 Conejos | Goji, Sotol, pink citrus, lampone, peperoncino |
| 5 | **PINK FLUID** | SILKY - TROPICALE | Cachaça Princesa | Banana, guava rosa, yogurt, candy floss, berry dust |
| 6 | **PURPLE RAIN** | FLOREALE - SOUR | Grappa Gaiarine Prosecco | Butterfly pea, cardamomo, vermouth, lavanda, ibisco |
| 7 | **BLU WAVE** | SAPIDO - DRY | Gin Mazzetti, Rum-Bar | Finocchio, sedano, blueberry, tonica, cappero |
| 8 | **GREEN MATCHA** | ERBACEO - SETOSO | Whiskey Koshi no Shinobu | Sake yuzu, fieno greco, tè verde, bamboo, latte di riso |

### 16.2 Intramontabili (7 drink)

| # | Nome | Profilo |
|---|------|---------|
| 1 | MORNING BREEZE | FRESCO - FRUTTATO |
| 2 | TRINIDAD ICED TEA | SPICED - SPARKLING |
| 3 | BASIL SMASH | AGRUMATO - BASILICO |
| 4 | MAI - TAI "44" | ESOTICO - DECISO |
| 5 | TOMMY'S MARGARITA | AGAVE - ASPRO |
| 6 | KNICKERBOCKER | FRESCO - ESOTICO |
| 7 | PENICILLIN | AFFUMICATO - SPEZIATO |

### 16.3 After Dinner — Vintage (5 drink)

| # | Nome | Profilo |
|---|------|---------|
| 8 | HANKY PANKY | AROMATICO - GINEPRO |
| 9 | VIEUX CARRÉ | ABBOCCATO - AROMATICO |
| 10 | SAZERAC | ANICE - DECISO |
| 11 | ROB ROY | AFFUMICATO - DECISO |
| 12 | TUXEDO | DECISO - DRY |

### 16.4 Analcolici — Alcohol Free (5 drink)

| # | Nome | Profilo |
|---|------|---------|
| 1 | AMERICA-NO | APERITIVO - BITTER |
| 2 | LILY'S PASSION | FRESCO - AGRUMATO |
| 3 | CALIFORNICATION | DOLCE - FRUTTATO |
| 4 | BASIL MULE | FRESCO - SPICY |
| 5 | MORNING BREEZE | FRESCO - SPICY |

### 16.5 Vermouth Experience

| Categoria | Opzioni |
|-----------|---------|
| **Vermouth** | Red, Dry, White |
| **Bitter** | Citrus, Asia, Herbs, Flower |
| **Spezie** | Cardamomo, Anice Stellato, Chiodi di Garofano, Zest Limone, Zest Arancia, Zest Pompelmo |

---

## 17. STRUTTURA DELLE PAGINE

### 17.1 Ordine Pagine (Preset Corrente)

| Posizione | N° | Tipo | Label | Drink # |
|-----------|----|------|-------|---------|
| 1 | 1 | cover | Cover | — |
| 2 | 2 | prefazione | Prefazione | — |
| 3 | 25 | (extra) | — | — |
| 4 | 3 | drink-left | BIANCO SPORCO | 1 |
| 5 | 4 | drink-right | BIANCO SPORCO | — |
| 6 | 5 | drink-left | EL DORADO | 2 |
| 7 | 6 | drink-right | EL DORADO | — |
| 8 | 7 | drink-left | THE ORANGE COUNTY | 3 |
| 9 | 8 | drink-right | THE ORANGE COUNTY | — |
| 10 | 9 | drink-left | RED • EMPTION | 4 |
| 11 | 10 | drink-right | RED • EMPTION | — |
| 12 | 11 | drink-left | PINK FLUID | 5 |
| 13 | 12 | drink-right | PINK FLUID | — |
| 14 | 13 | drink-left | PURPLE RAIN | 6 |
| 15 | 14 | drink-right | PURPLE RAIN | — |
| 16 | 15 | drink-left | BLU WAVE | 7 |
| 17 | 16 | drink-right | BLU WAVE | — |
| 18 | 17 | drink-left | GREEN MATCHA | 8 |
| 19 | 18 | drink-right | GREEN MATCHA | — |
| 20 | 19 | list | Intramontabili | — |
| 21 | 20 | list | After Dinner | — |
| 22 | 21 | list | Analcolici | — |
| 23 | 22 | vermouth | Vermouth Experience | — |
| 24 | 23 | colophon | Colophon | — |
| 25 | 24 | back-cover | Back Cover | — |

**Nota:** C'è una pagina extra (25) inserita nel pageOrder dopo la prefazione. 25 pagine totali nell'ordine corrente.

### 17.2 Sfondi Assegnati

| Pagina | Background ID |
|--------|---------------|
| 1 (Cover) | `bg_1780488860762_37` |
| 2 (Prefazione) | `bg_1780489224352_9` |
| 3 (BIANCO SPORCO left) | `bg_1780488913928_39` |
| 4 (BIANCO SPORCO right) | `bg_1780490727848_40` |
| 5 (EL DORADO left) | `bg_1780488928827_40` |
| 6 (EL DORADO right) | `bg_1780490743194_41` |
| 7 (THE ORANGE COUNTY left) | `bg_1780488940764_41` |
| 8 (THE ORANGE COUNTY right) | `bg_1780490756294_42` |
| 9 (RED • EMPTION left) | `bg_1780490897960_60` |
| 10 (RED • EMPTION right) | `bg_1780490772131_43` |
| 11 (PINK FLUID left) | `bg_1780488958694_42` |
| 12 (PINK FLUID right) | `bg_1780490795280_44` |
| 13 (PURPLE RAIN left) | `bg_1780488989841_43` |
| 14 (PURPLE RAIN right) | `bg_1780490814689_48` |
| 15 (BLU WAVE left) | `bg_1780489012574_44` |
| 16 (BLU WAVE right) | `bg_1780490840711_55` |
| 17 (GREEN MATCHA left) | `bg_1780489040361_45` |
| 18 (GREEN MATCHA right) | `bg_1780490864047_59` |

Le pagine list, vermouth, colophon e back-cover non hanno sfondo assegnato.

---

## 18. CONFIGURAZIONE PRESET (STATO CORRENTE)

### 18.1 Riepilogo Completo

```
┌─────────────────────────────────────────────────────┐
│                 BP LAB 2026 — PRESET                 │
├─────────────────────────────────────────────────────┤
│ FORMATO:        148 × 185 mm, bleed 3mm             │
│ ORIENTAMENTO:   Verticale (portrait)                │
│ PAGINE:         25 (24 + 1 extra)                   │
│ STAMPA:         Imposizione a sella, no crocini     │
├─────────────────────────────────────────────────────┤
│ TIPOGRAFIA:     H1: 42pt | H2: 24pt | H3: 11pt     │
│                 Body: 11pt | Caption: 14pt          │
├─────────────────────────────────────────────────────┤
│ PALETTE:        Sfondo bianco, testo nero           │
│                 Extra: 8 colori pastello/vibranti    │
├─────────────────────────────────────────────────────┤
│ LAYOUT:         Pad T:10 R:8 B:5 L:8 mm             │
│                 BlockGap: 2mm | LineH: 1.0          │
├─────────────────────────────────────────────────────┤
│ FONT:           Tuaf (display) + ABC Camera (body)  │
│ SFONDI:         18 sfondi WebGL generati            │
│ DRINK:          8 Signature + 24 classici/analcolici │
└─────────────────────────────────────────────────────┘
```

### 18.2 Differenze dal Default

| Parametro | Default | Preset Corrente |
|-----------|---------|-----------------|
| `bg` | `#121420` | `#ffffff` |
| `h1Color` | `#F2CD77` | `#000000` |
| `h2Color` | `#7BBEBC` | `#000000` |
| `h3Color` | `#e0e0e0` | `#000000` |
| `bodyColor` | `#e0e0e0` | `#000000` |
| `captionColor` | `#a0a0a0` | `#000000` |
| `typography.h3` | 16pt | 11pt |
| `typography.caption` | 8pt | 14pt |
| `layout.padTop` | 24mm | 10mm |
| `layout.padRight` | 24mm | 8mm |
| `layout.padBottom` | 24mm | 5mm |
| `layout.padLeft` | 24mm | 8mm |
| `layout.blockGap` | 6mm | 2mm |
| `layout.lineHeight` | 1.6 | 1.0 |
| `print.cropMarks` | false | false |
| `extra` | `[]` | 8 colori |

---

## 19. BUG NOTI E FAQ

### 19.1 Bug Noti (da QA Report)

| ID | Severità | Descrizione | Stato |
|----|----------|-------------|-------|
| B1 | MEDIUM | WebGL canvas nero al caricamento iniziale. Richiede interazione slider per popolarsi | Aperto |
| B2 | MEDIUM | ID display errati per tutti gli slider WebGL (es. `valWebglPerRow` vs `valPerRow`) | Aperto |
| B3 | LOW | Background assegnato non sempre visibile nell'anteprima | Aperto |

### 19.2 FAQ

**D: Come si aggiunge un nuovo cocktail Signature?**
R: Modificare `app/data/drinks.json`, aggiungere un drink con `category: "Signature"`. Poi in `admin-state.js`, `buildPageDefaults()`, aggiungere le entry per `drink-left` e `drink-right`.

**D: Come si cambia il formato pagina?**
R: Dal pannello ASSETS → Stampa, modificare W e H. I valori sono in mm. Questo aggiorna `state.print.pageW` e `state.print.pageH`.

**D: Come si fa il backup dello stato?**
R: Cliccare il bottone HTML nell'export footer. Scarica `menu-print.html` + `admin-save.json`. Copiare `admin-save.json` nella cartella `app/` per usarlo con `generate_pdf.py`.

**D: Perché il PDF dal browser è diverso da WeasyPrint?**
R: Il PDF dal browser usa l'imposizione a sella (fogli grandi con 2 pagine per facciata). WeasyPrint genera pagine singole. Per la stampa professionale, usare l'export PDF dal browser.

**D: Come si resetta tutto?**
R: Bottone Reset nell'export footer. Cancella localStorage e ricarica la pagina con i default.

**D: I font sono commerciali? Posso usarli?**
R: I font Tuaf e ABC Camera sono in versione Trial. Per uso commerciale è necessaria una licenza.

---

## 20. ROADMAP E SVILUPPI FUTURI

### 20.1 Miglioramenti Prioritari

1. **Fix WebGL display IDs** — Correggere la formula di generazione degli ID nel binding degli slider
2. **Auto-render WebGL canvas** — Chiamare `generateLive()` dopo `loadSVGs()` in `init()`
3. **Supporto multi-lingua** — Aggiungere layer i18n per menu multilingue
4. **Export PDF lato client** — Usare jsPDF o simile per generare PDF senza WeasyPrint
5. **Drag & Drop blocchi** — Riordinare blocchi via drag nell'anteprima
6. **Undo/Redo** — Cronologia modifiche con Ctrl+Z / Ctrl+Y

### 20.2 Feature Desiderate

- **Anteprima colori reali** — Simulazione stampa (CMYK, FOGRA39)
- **Importazione dati esterni** — Caricare drink list da CSV/Excel
- **Template salvabili** — Salvare/caricare configurazioni di pagina come template
- **Versioning automatico** — Salvataggi incrementali con storico
- **Modalità presentazione** — Fullscreen slideshow del menu
- **Generazione varianti** — A/B testing di layout con switch rapido
- **Esportazione multipiattaforma** — Oltre al PDF, formati per social media (Instagram story, post)

### 20.3 Debito Tecnico

- Migrare da ES5 a ES6+ con build step (Vite/Webpack)
- Sostituire localStorage con IndexedDB per file grandi (>5MB)
- Refactoring `admin.js` (1462 righe) in moduli più piccoli
- Aggiungere test automatizzati (Playwright per E2E)
- Documentare API con JSDoc

---

## 21. GLOSSARIO

| Termine | Definizione |
|---------|-------------|
| **Admin Panel** | L'interfaccia di amministrazione (`admin.html`) |
| **Bleed** | Area di stampa che si estende oltre il bordo pagina (3mm), tagliata via in rifilatura |
| **Block** | Un elemento di contenuto in una pagina (testo, immagine, chart) |
| **Booklet** | Pubblicazione stampata fronte-retro e pinzata al centro (saddle-stitch) |
| **Canvas 2D** | API HTML5 per disegno bitmap, usata per l'anteprima sfondi |
| **Color Key** | Riferimento simbolico a un colore della palette (es. `h1Color`) |
| **Crop Marks** | Marcatori di taglio agli angoli della pagina stampata |
| **Drink Left** | Pagina sinistra di uno spread, contiene i dettagli del cocktail |
| **Drink Right** | Pagina destra di uno spread, contiene lo sfondo WebGL e immagine |
| **fixedHeight** | Proprietà blocco: se `true`, il blocco riempie lo spazio disponibile |
| **Grid System** | Sistema di righe e colonne per il layout delle pagine |
| **Imposition** | Disposizione delle pagine sul foglio di stampa per la rilegatura |
| **Lab Factor** | Asse del radar chart che rappresenta il carattere/complessità del drink |
| **Level** | Livello tipografico predefinito (h1, h2, h3, body, caption) |
| **Override** | Valore che sovrascrive l'impostazione globale per una pagina specifica |
| **Palette Extra** | Colori aggiuntivi oltre ai 6 principali, usati per blocchi personalizzati |
| **Row** | Una riga nella griglia di layout di una pagina |
| **Saddle Stitch** | Rilegatura a punto metallico (pinzatura al centro) |
| **Sheet** | Foglio di stampa fisico, contiene 4 pagine (2 fronte + 2 retro) |
| **Spine** | La piega centrale del booklet stampato |
| **Spread** | Coppia di pagine affiancate (sinistra + destra) |
| **Taste Map** | Il grafico radar a 4 assi che visualizza il profilo gustativo |
| **Toast** | Notifica temporanea nell'interfaccia |
| **WebGL** | Nel contesto del progetto: generatore di sfondi astratti (in realtà Canvas 2D + SVG) |
| **WeasyPrint** | Libreria Python per convertire HTML/CSS in PDF |
| **WYSIWYG** | What You See Is What You Get — anteprima fedele del risultato finale |

---

## APPENDICE A: RIFERIMENTI FILE

### File Sorgente Principali

| File | Percorso | Righe | Ruolo |
|------|----------|-------|-------|
| `admin.html` | `app/admin.html` | 136 | GUI principale |
| `index.html` | `app/index.html` | 20 | Entry point (legacy) |
| `menu-print.html` | `app/menu-print.html` | generato | Template stampa |
| `admin.js` | `app/js/admin.js` | 1462 | UI binding, eventi, export |
| `admin-state.js` | `app/js/admin-state.js` | 858 | Stato globale, CRUD |
| `admin-preview.js` | `app/js/admin-preview.js` | 611 | Rendering HTML pagine |
| `admin-webgl.js` | `app/js/admin-webgl.js` | 268 | Generatore sfondi |
| `chart-generator.js` | `app/js/chart-generator.js` | 199 | Radar chart SVG |
| `admin.css` | `app/css/admin.css` | 989 | Stili GUI admin |
| `typography.css` | `app/css/typography.css` | 147 | Font e variabili |
| `screen.css` | `app/css/screen.css` | 157 | Stili anteprima |
| `print.css` | `app/css/print.css` | 49 | Stili stampa |
| `drinks.json` | `app/data/drinks.json` | 591 | Dati drink |
| `admin-save.json` | `app/admin-save.json` | — | Stato salvato |
| `generate_pdf.py` | `app/generate_pdf.py` | 497 | Script PDF |
| `generate.sh` | `generate.sh` | 35 | Wrapper shell |

### Preset

| File | Descrizione |
|------|-------------|
| `Preset/admin-save (10).json` | Stato completo (~4.6 MB) — 25 pagine, 18 sfondi |
| `Preset/drinks-export (9).json` | Dati drink esportati — 25 drink totali |

---

*Documento generato il 04 Giugno 2026 da Nico Skolp per BP LAB.*
*Per aggiornamenti e sviluppo futuro, fare riferimento a questo documento come fonte unica di verità.*
