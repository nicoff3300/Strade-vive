# BP LAB 2026 — Changelog

> Cronologia delle modifiche e milestone del progetto.

---

## Versione 1.0 — 04 Giugno 2026

### Documentazione Completa
- Creato `KNOWLEDGE.md` (4500+ righe) — documento di conoscenza per sviluppi futuri
- Creato `README.md` — guida rapida al progetto
- Creato `API_REFERENCE.md` — riferimento completo delle API JavaScript
- Creato `CHANGELOG.md` — questo file
- Organizzata cartella `App_menuBP_def/` con struttura pulita e tutti i file

### Stato del Progetto
- 25 pagine configurate (24 standard + 1 extra)
- 8 Signature cocktails con grafici radar
- 17 cocktail classici (Intramontabili, After Dinner, Analcolici)
- 18 sfondi WebGL generati e assegnati
- Palette: sfondo bianco, testo nero, 8 colori extra
- Sistema grid+blocks completamente funzionante
- Esportazione PDF con imposizione a sella
- Script Python per generazione PDF via WeasyPrint

---

## Build Precedenti

### Migrazione Grid System
- Convertito sistema legacy (rows×cols flat) al nuovo grid system (array di righe con id, cols, gap)
- Aggiunto `migrateLegacyPages()` per compatibilità retroattiva
- Introdotto `colIndex`, `widthPct`, `level` nei blocchi
- Sostituito `style.color` (hex) con `style.colorKey` (riferimento palette)

### Sistema Sfondi WebGL
- Implementato generatore SVG procedurale con 17 forme geometriche
- Canvas 2D per anteprima in tempo reale
- Palette selezionabile dall'utente
- Parametri: perRow, margin, gap, bigTiles, prob, mode, usePairs
- Griglia thumbnail per gestione sfondi generati

### Radar Chart
- Generatore SVG autonomo a 4 assi (S, A, B, F)
- 5 anelli concentrici, area riempita, punti sugli angoli
- Colori configurabili
- Integrato nell'anteprima e nell'export PDF

### GUI Admin Panel
- Layout a 3 colonne + barra laterale
- Colonna ASSETS: colori, tipografia, spaziatura, stampa
- Colonna PAGINA: griglia, blocchi, sfondo, override, contenuti
- Colonna SFONDO: canvas preview, parametri, genera/applica, gallery
- Toolbar preview: modalità Pagina/Spread/Tutte, zoom 10-200%
- Export footer: PDF, HTML, JSON, Reset

### Imposizione a Sella
- Algoritmo saddle-stitch per booklet
- Calcolo automatico fogli da numero pagine
- Crop marks, spine marks, bleed 3mm
- Layout foglio: (pageW×2 + bleed×2) × (pageH + bleed×2)

### Script Python
- `generate_pdf.py`: 497 righe, genera HTML + PDF via WeasyPrint
- Supporto grid+blocks e fallback legacy
- Font embedding con @font-face
- Radar chart SVG inline
- `generate.sh`: wrapper shell con venv e Homebrew detection

### QA e Testing
- 41 test automatizzati (Playwright)
- 38 passed, 3 warnings, 0 failures
- 3 bug noti documentati:
  - WebGL canvas nero al caricamento iniziale
  - ID display slider WebGL errati
  - Background non sempre visibile in anteprima

### Refactoring
- Da ES6 (`const`/`let`/arrow/template literal) a ES5 (`var`/`function`/concatenazione)
- Tutti i file JS passano `node --check`
- IIFE pattern per incapsulamento moduli
- Namespace globali (`window.AdminState`, etc.)

---

## Bug Noti (Non Risolti)

| ID | Severità | File | Descrizione |
|----|----------|------|-------------|
| B1 | MEDIUM | `admin-webgl.js` | Canvas nero finché non si muove uno slider |
| B2 | MEDIUM | `admin.js:201` | Formula ID errata: `valWebglPerRow` vs `valPerRow` |
| B3 | LOW | `admin-preview.js` | Background SVG non sempre visibile nell'anteprima |

---

## Prossimi Passi (Roadmap)

1. Fix bug B1-B3
2. Auto-render WebGL canvas dopo `loadSVGs()`
3. Correggere formula generazione ID display slider
4. Supporto multi-lingua (i18n)
5. Undo/Redo con cronologia modifiche
6. Drag & drop blocchi nell'anteprima
7. Esportazione diretta PDF lato client (jsPDF)
8. Refactoring ES6+ con build step (Vite)
9. Test E2E automatizzati (Playwright)
10. Template salvabili e versioning
