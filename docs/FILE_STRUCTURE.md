# BP LAB 2026 — Guida alla Struttura dei File

> Mappa completa di tutti i file del progetto e delle loro relazioni.

---

## Visione d'Insieme

```
App_menuBP_def/
│
├── 📄 README.md                    # Guida rapida e panoramica
├── 📄 KNOWLEDGE.md                 # Documento di conoscenza (4500+ righe)
├── 🔧 generate.sh                  # Script shell per generare PDF
│
├── 📁 docs/                        # Documentazione
│   ├── PROJECT_SPECIFICATION.md    # Specifica tecnica originale
│   ├── API_REFERENCE.md            # Riferimento API JavaScript
│   ├── CHANGELOG.md                # Cronologia modifiche
│   └── FILE_STRUCTURE.md           # Questo file
│
├── 📁 Preset/                      # File di configurazione (preset)
│   ├── admin-save (10).json        # Salvataggio completo stato (~4.6 MB)
│   └── drinks-export (9).json      # Dati drinks esportati
│
└── 📁 app/                         # Applicazione principale
    │
    ├── 🌐 HTML
    │   ├── admin.html              # GUI pannello amministrazione (136 righe)
    │   ├── index.html              # Entry point legacy (20 righe)
    │   └── test-chart.html         # Pagina test radar chart (265 righe)
    │
    ├── 🎨 CSS
    │   ├── admin.css               # Stili GUI admin (989 righe)
    │   ├── typography.css          # @font-face + variabili CSS (147 righe)
    │   ├── screen.css              # Stili anteprima schermo (157 righe)
    │   └── print.css               # Stili stampa @page (49 righe)
    │
    ├── 📜 JavaScript
    │   ├── chart-generator.js      # Radar chart SVG (199 righe)
    │   │   └── window.RadarChart
    │   ├── admin-state.js          # Stato + localStorage + CRUD (858 righe)
    │   │   └── window.AdminState
    │   ├── admin-preview.js        # Rendering HTML pagine (611 righe)
    │   │   └── window.AdminPreview
    │   ├── admin-webgl.js          # Sfondi SVG procedurali (268 righe)
    │   │   └── window.AdminWebGL
    │   └── admin.js                # UI binding + eventi + export (1462 righe)
    │       └── window.AdminApp
    │
    ├── 🔤 Font (6 file OTF)
    │   ├── TuafTrial-Bold.otf
    │   ├── TuafTrial-BoldIt.otf
    │   ├── ABCCameraPlain-Regular-Trial.otf
    │   ├── ABCCameraPlain-RegularItalic-Trial.otf
    │   ├── ABCCameraPlain-Bold-Trial.otf
    │   └── ABCCameraPlain-BoldItalic-Trial.otf
    │
    ├── 🖼️ SVG (17 forme geometriche)
    │   ├── Forma_1, 3, 5, 6, 9.svg
    │   ├── Forma_11, 12, 13, 14, 15.svg
    │   ├── Forma_16, 17, 18, 20.svg
    │   └── Forma_100, 101, 102.svg
    │
    ├── 📊 Dati
    │   └── data/
    │       └── drinks.json         # 25 cocktail (591 righe JSON)
    │
    ├── 🐍 Python
    │   └── generate_pdf.py         # Genera PDF via WeasyPrint (497 righe)
    │
    └── 💾 Stato
        └── admin-save.json         # Salvataggio corrente (copia lavoro)
```

---

## Diagramma delle Dipendenze

```
chart-generator.js
       │
       ▼
admin-state.js ──────┐
       │              │
       ▼              ▼
admin-preview.js  admin-webgl.js
       │              │
       └──────┬───────┘
              ▼
          admin.js
              │
              ▼
         admin.html
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
admin.css  screen.css  print.css
    │
    ▼
typography.css
    │
    ▼
fonts/*.otf
    │
    ▼
svgs/*.svg  ←── admin-webgl.js
    │
    ▼
data/drinks.json  ←── admin-state.js
```

---

## Flusso Dati

```
drinks.json ──► fetch() ──► AdminState.init()
                                 │
                  ┌──────────────┤
                  ▼              ▼
           localStorage    migrateLegacyPages()
           (bplab_admin_v8)      │
                  │              ▼
                  │       pages + grid + blocks
                  │              │
                  └──────┬───────┘
                         ▼
                  AdminState.getState()
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   AdminPreview    AdminWebGL      AdminApp
   .getPageHTML()  .generate()     .updateAll()
          │              │              │
          ▼              ▼              ▼
   HTML pagine     SVG sfondi     UI binding
          │              │              │
          └──────────────┴──────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Export PDF     Export HTML    Export JSON
   (imposizione)   (menu-print)   (drinks-export)
          │
          ▼
   generate_pdf.py
          │
          ▼
   WeasyPrint → PDF
```

---

## Convenzioni di Naming

| Tipo | Pattern | Esempio |
|------|---------|---------|
| File JS | `kebab-case.js` | `chart-generator.js` |
| File CSS | `kebab-case.css` | `admin.css` |
| Namespace JS | `PascalCase` | `window.AdminState` |
| Metodi | `camelCase()` | `getPageHTML()` |
| ID DOM | `camelCase` | `ctrlH1`, `btnExportPDF` |
| ID Blocchi | `b` + numero | `b1`, `b2`, `bchart` |
| ID Righe | `r` + numero | `r1`, `r2` |
| ID Sfondi | `bg_` + timestamp + counter | `bg_1780488913928_39` |
| Chiavi Palette | `camelCase` | `h1Color`, `bodyColor` |
| Chiavi Extra | `extra` + indice | `extra0`, `extra1` |
| LocalStorage | `snake_case` | `bplab_admin_v8` |

---

## Dimensioni File

| File | Dimensione | Righe |
|------|-----------|-------|
| `admin-save (10).json` | ~4.6 MB | 6123 |
| `admin.js` | ~47 KB | 1462 |
| `admin.css` | ~20 KB | 989 |
| `admin-state.js` | ~28 KB | 858 |
| `admin-preview.js` | ~19 KB | 611 |
| `drinks.json` | ~15 KB | 591 |
| `generate_pdf.py` | ~17 KB | 497 |
| `admin-webgl.js` | ~9 KB | 268 |
| `chart-generator.js` | ~6 KB | 199 |
| `screen.css` | ~3 KB | 157 |
| `typography.css` | ~3 KB | 147 |
| `admin.html` | ~6 KB | 136 |
| `print.css` | ~1 KB | 49 |
| `generate.sh` | ~1 KB | 35 |

---

## File Generati (non in repo)

| File | Generato da | Descrizione |
|------|-------------|-------------|
| `menu-print.html` | `admin.js` (export HTML) | HTML pronto per la stampa |
| `BP_LAB_2026_148x185.pdf` | `generate_pdf.py` | PDF finale |
| `admin-save.json` (in `app/`) | `admin.js` (export HTML) | Copia di lavoro per PDF |

---

## File Esterni (non inclusi)

Questi file esistono nel progetto originale ma non sono stati inclusi nella cartella definitiva perché non essenziali:

- `Anti_menu_BP/` — Workspace parallelo e prototipo React v2
- `DatiSalvati/` — Versioni intermedie dei salvataggi
- `Drinklist (v.2) 2.pdf/` — Immagini PNG della drinklist
- `Drinklist_data/` — File Numbers, XLSX, MD sorgente
- `Font/` — Copia ridondante dei font
- `Java/` — Script sperimentali (DrawBot, WebGL standalone)
- `scripts/` — Directory vuota
- `test-output/` — Screenshot e report QA
- `webgl/` — WebGL standalone
- `.sisyphus/` — Tool di planning AI
- `.venv/` — Virtual environment Python
- File PDF generati (vari output)
- File sorgente (.docx, .ai, .numbers)
