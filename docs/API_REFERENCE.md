# BP LAB 2026 — API Reference

> Riferimento completo delle API JavaScript del pannello di amministrazione.

## Indice

- [AdminState](#adminstate)
- [AdminPreview](#adminpreview)
- [AdminWebGL](#adminwebgl)
- [RadarChart](#radarchart)
- [AdminApp](#adminapp)

---

## AdminState

**Namespace:** `window.AdminState`
**File:** `app/js/admin-state.js`

### Inizializzazione

#### `AdminState.init() → Promise<state>`
Carica `data/drinks.json`, ripristina da localStorage, esegue migrazione pagine legacy. Restituisce l'oggetto stato completo.

```javascript
await AdminState.init();
var state = AdminState.getState();
```

### Stato

#### `AdminState.getState() → object`
Restituisce l'oggetto stato completo (riferimento live).

#### `AdminState.saveToStorage()`
Salva lo stato corrente in localStorage (`bplab_admin_v8`).

#### `AdminState.loadFromStorage()`
Carica lo stato da localStorage. Chiamato automaticamente da `init()`.

#### `AdminState.resetDefaults()`
Ripristina i valori predefiniti, cancella localStorage.

### Pagine

#### `AdminState.getOrderedPageIds() → number[]`
Restituisce l'array ordinato degli ID pagina.

#### `AdminState.getTotalPages() → number`
Restituisce il numero totale di pagine.

#### `AdminState.addBlankPage() → number`
Aggiunge una nuova pagina vuota con griglia 1×1. Restituisce l'ID.

#### `AdminState.removePage(pageNum)`
Rimuove una pagina e aggiorna pageOrder.

#### `AdminState.movePageUp(pageNum)`
Sposta la pagina in alto nell'ordine.

#### `AdminState.movePageDown(pageNum)`
Sposta la pagina in basso nell'ordine.

#### `AdminState.getPageConfig(pageNum) → object`
Restituisce la configurazione completa della pagina con override applicati.

```javascript
var config = AdminState.getPageConfig(3);
// { type, label, typography, palette, layout, grid, blocks, ... }
```

### Palette

#### `AdminState.updatePalette(key, value)`
Aggiorna un colore della palette (`bg`, `h1Color`, `h2Color`, `h3Color`, `bodyColor`, `captionColor`).

#### `AdminState.getPaletteColors() → string[]`
Restituisce array di tutti i colori palette (6 principali + extra).

#### `AdminState.addPaletteColor(color)`
Aggiunge un colore extra alla palette.

#### `AdminState.removePaletteColor(index)`
Rimuove un colore extra.

#### `AdminState.updatePaletteExtra(index, color)`
Aggiorna un colore extra.

#### `AdminState.resolvePaletteColor(key) → string`
Risolve una chiave palette (es. `h1Color`, `extra0`) nel valore hex.

### Tipografia

#### `AdminState.updateTypography(key, value)`
Aggiorna un valore tipografico (`h1`, `h2`, `h3`, `body`, `caption`).

```javascript
AdminState.updateTypography('h1', 48); // 48pt
```

### Layout

#### `AdminState.updateLayout(key, value)`
Aggiorna un valore di spaziatura (`padTop`, `padRight`, `padBottom`, `padLeft`, `blockGap`, `lineHeight`).

```javascript
AdminState.updateLayout('padTop', 15); // 15mm
```

### Override Pagina

#### `AdminState.updatePageOverride(pageNum, section, key, value)`
Imposta un override per una pagina specifica.

```javascript
AdminState.updatePageOverride(3, 'typography', 'h1', 55);
AdminState.updatePageOverride(3, 'layout', 'padTop', 20);
```

### Blocchi

#### `AdminState.addBlock(pageNum, type) → object | null`
Aggiunge un blocco (`text` o `image`) alla pagina. Restituisce il blocco creato.

#### `AdminState.removeBlock(pageNum, blockId)`
Rimuove un blocco dalla pagina.

#### `AdminState.updateBlock(pageNum, blockId, field, value)`
Aggiorna un campo del blocco. Supporta notazione puntata (`style.font`, `style.size`, etc.).

```javascript
AdminState.updateBlock(3, 'b1', 'content', 'Nuovo testo');
AdminState.updateBlock(3, 'b1', 'style.size', 36);
AdminState.updateBlock(3, 'b1', 'style.colorKey', 'h1Color');
```

#### `AdminState.applyBlockLevel(pageNum, blockId, level)`
Applica un preset tipografico al blocco (`h1`, `h2`, `h3`, `body`, `caption`).

#### `AdminState.moveBlock(pageNum, blockId, direction)`
Sposta il blocco (`up`, `down`, `left`, `right`).

#### `AdminState.selectBlock(pageNum, blockId)`
Seleziona un blocco per l'editing.

#### `AdminState.deselectBlock()`
Deseleziona il blocco corrente.

### Griglia

#### `AdminState.updatePageGrid(pageNum, key, value)`
Aggiorna un parametro della griglia (es. `rowGap`).

#### `AdminState.addRow(pageNum) → object | null`
Aggiunge una riga alla griglia della pagina.

#### `AdminState.removeRow(pageNum, rowId)`
Rimuove una riga e i blocchi associati.

#### `AdminState.updateRowConfig(pageNum, rowId, key, value)`
Aggiorna la configurazione di una riga (`cols`, `gap`).

```javascript
AdminState.updateRowConfig(3, 'r1', 'cols', 2);
AdminState.updateRowConfig(3, 'r1', 'gap', 8);
```

### Sfondi

#### `AdminState.addBackground(id, svgStr, config)`
Salva uno sfondo generato nello stato.

#### `AdminState.removeBackground(id)`
Rimuove uno sfondo e lo dissocia dalle pagine.

#### `AdminState.assignBackgroundToPage(pageNum, bgId)`
Assegna uno sfondo a una pagina.

#### `AdminState.setPageBgColor(pageNum, color)`
Imposta un colore di sfondo per la pagina (o `null` per rimuovere).

### Dati Drink

#### `AdminState.getDrinkByNumber(num) → object | null`
Recupera un drink Signature per numero.

#### `AdminState.updateDrink(drinkNumber, field, value)`
Aggiorna un campo del drink (nome, profilo, ingredienti).

### Esportazione

#### `AdminState.exportJSON() → string`
Esporta i dati drink come JSON formattato.

#### `AdminState.rebuildPageOrder()`
Ricostruisce `pageOrder` dalle chiavi di `pages`.

### Migrazione

#### `AdminState.migrateLegacyPages()`
Converte il vecchio formato pagine al nuovo sistema grid+blocks. Chiamato automaticamente da `init()`.

---

## AdminPreview

**Namespace:** `window.AdminPreview`
**File:** `app/js/admin-preview.js`

### Inizializzazione

#### `AdminPreview.init(containerId) → self`
Inizializza il modulo con l'ID del container DOM.

### Rendering

#### `AdminPreview.render(pageNum, adminState)`
Renderizza una pagina singola nel container.

#### `AdminPreview.renderSpread(leftNum, rightNum, adminState)`
Renderizza due pagine affiancate (spread).

#### `AdminPreview.renderAll(adminState)`
Renderizza tutte le pagine in colonna.

#### `AdminPreview.getPageHTML(pageNum, adminState) → string`
Restituisce l'HTML di una pagina (usato internamente e per export).

### Zoom e Modalità

#### `AdminPreview.setZoom(level)`
Imposta il livello di zoom (1.0 = 100%).

#### `AdminPreview.getZoom() → number`
Restituisce il livello di zoom corrente.

#### `AdminPreview.setMode(mode)`
Imposta la modalità di preview (`single`, `spread`, `all`).

#### `AdminPreview.getMode() → string`
Restituisce la modalità corrente.

---

## AdminWebGL

**Namespace:** `window.AdminWebGL`
**File:** `app/js/admin-webgl.js`

### Inizializzazione

#### `AdminWebGL.init(canvasId) → self`
Inizializza il canvas di anteprima e carica le forme SVG.

### Generazione

#### `AdminWebGL.generate(config) → string`
Genera uno sfondo SVG e restituisce la stringa SVG completa.

```javascript
var svgStr = AdminWebGL.generate({
  paletteIndices: [0, 1, 2, 3, 4, 5],
  perRow: 4,
  marginX: 0,
  marginY: 0,
  gapX: 0,
  gapY: 0,
  bigTiles: true,
  bigTileProb: 0.3,
  bigTileMode: '2x2',
  usePairs: false
});
```

#### `AdminWebGL.generateLive(config)`
Genera e visualizza l'anteprima sul canvas.

#### `AdminWebGL.generateAsync(config) → Promise<string>`
Versione asincrona di `generate()`.

#### `AdminWebGL.getConfig() → object`
Legge i parametri correnti dai controlli DOM.

### Utility

#### `AdminWebGL.isApiAvailable() → Promise<boolean>`
Verifica se i file SVG sono accessibili.

---

## RadarChart

**Namespace:** `window.RadarChart`
**File:** `app/js/chart-generator.js`

### API

#### `RadarChart.generateRadar(drinkData, config) → string`
Genera un SVG radar chart a 4 assi.

```javascript
var svg = RadarChart.generateRadar(
  {
    name: 'BIANCO SPORCO',
    taste: { sweet: 4, acid: 3, bitter: 2, labFactor: 3 }
  },
  {
    width: 200,
    height: 200,
    colors: {
      grid: '#e0e0e0',
      area: '#F2CD77',
      axis: '#333333',
      text: '#333333'
    },
    opacity: 0.3
  }
);
// Restituisce: '<svg xmlns="..." ...>...</svg>'
```

### Parametri

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `drinkData.name` | string | — | Nome del drink |
| `drinkData.taste.sweet` | number | 0 | Dolcezza (0-5) |
| `drinkData.taste.acid` | number | 0 | Acidità (0-5) |
| `drinkData.taste.bitter` | number | 0 | Amaro (0-5) |
| `drinkData.taste.labFactor` | number | 0 | Fattore Lab (0-5) |
| `config.width` | number | 300 | Larghezza SVG in px |
| `config.height` | number | 300 | Altezza SVG in px |
| `config.colors.grid` | string | `#e0e0e0` | Colore griglia |
| `config.colors.area` | string | `#FF6B35` | Colore area riempita |
| `config.colors.axis` | string | `#333333` | Colore assi |
| `config.colors.text` | string | `#333333` | Colore testo |
| `config.opacity` | number | 0.3 | Opacità area (0-1) |

---

## AdminApp

**Namespace:** `window.AdminApp`
**File:** `app/js/admin.js`

### API Pubblica

#### `AdminApp.updateAll()`
Forza l'aggiornamento completo dell'interfaccia (navigazione, controlli, preview, sfondi).

```javascript
// Dopo una modifica programmatica dello stato:
AdminState.updateTypography('h1', 48);
AdminApp.updateAll();
```

### Struttura Interna

Il modulo `admin.js` è una IIFE che registra event listener su `DOMContentLoaded`. Espone solo `updateAll()` come API pubblica. Tutti i binding sono interni:

- `bindTypography()` — 5 slider tipografia
- `bindPalette()` — 6 color picker + extra
- `bindLayout()` — 6 slider spaziatura + bleed/crop/W/H
- `bindZoom()` — zoom slider
- `bindWebGL()` — generator + apply
- `bindExport()` — PDF/HTML/JSON/Reset
- `bindPreviewMode()` — Pagina/Spread/Tutte
- `renderNavigation()` — barra laterale thumbnails
- `renderBackgroundGrid()` — griglia sfondi
- `renderPageControls()` — controlli pagina dinamici
- `renderPreview()` — anteprima centrale

### Flusso di Inizializzazione

```
DOMContentLoaded
  → AdminState.init()
  → bind*() — tutti i listener
  → initWebglSwatches()
  → render*() — render iniziale
```
