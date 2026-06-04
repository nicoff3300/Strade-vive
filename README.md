# BP LAB 2026 — Menu Bar Admin Panel

> Strumento web per progettare, visualizzare in anteprima ed esportare in PDF un menu cocktail di 24 pagine (formato 148 × 185 mm), con imposizione a sella (saddle-stitch booklet), bleed 3mm e crocini di taglio.

## Avvio Rapido

```bash
# 1. Avvia un server locale nella cartella app/
cd app/
python3 -m http.server 8080

# 2. Apri nel browser
open http://localhost:8080/admin.html
```

## Struttura

```
App_menuBP_def/
├── KNOWLEDGE.md              # Documento di conoscenza completo
├── README.md                 # Questo file
├── generate.sh               # Script per generare PDF
├── docs/
│   ├── PROJECT_SPECIFICATION.md  # Specifica tecnica originale
│   ├── CHANGELOG.md              # Cronologia modifiche
│   └── API_REFERENCE.md          # Riferimento API JavaScript
├── Preset/
│   ├── admin-save (10).json      # Stato completo (~4.6 MB)
│   └── drinks-export (9).json    # Dati drink esportati
└── app/
    ├── admin.html                # GUI principale (136 righe)
    ├── index.html                # Entry point legacy
    ├── test-chart.html           # Test radar chart
    ├── generate_pdf.py           # Script Python per PDF (497 righe)
    ├── admin-save.json           # Salvataggio corrente
    ├── css/
    │   ├── admin.css             # Stili GUI (989 righe)
    │   ├── typography.css        # Font e variabili CSS
    │   ├── screen.css            # Stili anteprima
    │   └── print.css             # Stili stampa @page
    ├── js/
    │   ├── admin.js              # UI binding, eventi, export (1462 righe)
    │   ├── admin-state.js        # Stato globale, CRUD (858 righe)
    │   ├── admin-preview.js      # Rendering HTML pagine (611 righe)
    │   ├── admin-webgl.js        # Generatore sfondi SVG (268 righe)
    │   └── chart-generator.js    # Radar chart SVG (199 righe)
    ├── fonts/                    # Tuaf + ABC Camera (6 file OTF)
    ├── svgs/                     # 17 forme SVG per sfondi
    └── data/
        └── drinks.json           # Dati drink (25 cocktail)
```

## Tecnologie

- HTML5 + CSS3 + JavaScript ES5 (vanilla, no framework)
- Canvas 2D + SVG per sfondi procedurali
- Font: Tuaf (display) + ABC Camera (body)
- Python + WeasyPrint per generazione PDF offline
- localStorage per persistenza stato

## Preset Corrente

| Parametro | Valore |
|-----------|--------|
| Formato | 148 × 185 mm, bleed 3mm |
| Pagine | 25 (24 + 1 extra) |
| Palette | Sfondo bianco, testo nero, 8 colori extra |
| Tipografia | H1: 42pt, H2: 24pt, H3: 11pt, Body: 11pt, Caption: 14pt |
| Spaziatura | Pad: 10/8/5/8 mm, BlockGap: 2mm, LineH: 1.0 |
| Font | Tuaf (display) + ABC Camera (body) |
| Drink | 8 Signature, 12 classici, 5 analcolici |

## Esportazione PDF

```bash
# Opzione A: PDF STAMPA (imposizione a sella per tipografia)
# Cliccare "PDF STAMPA" nel footer dell'admin panel

# Opzione B: PDF PAGINE (pagine singole in ordine, per anteprima)
# Cliccare "PDF PAGINE" nel footer dell'admin panel

# Opzione C: Via WeasyPrint (pagine singole, offline)
./generate.sh
```

## Documentazione

- **KNOWLEDGE.md** — Manuale completo per sviluppi futuri (4500+ righe)
- **docs/PROJECT_SPECIFICATION.md** — Specifica tecnica originale
- **docs/API_REFERENCE.md** — Riferimento completo API JavaScript
- **docs/CHANGELOG.md** — Cronologia delle modifiche
