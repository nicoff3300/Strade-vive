window.AdminState = (function() {
  var STORAGE_KEY = 'bplab_admin_v8';

  var DEFAULTS = {
    palette: {
      bg: '#121420',
      h1Color: '#F2CD77',
      h2Color: '#7BBEBC',
      h3Color: '#e0e0e0',
      bodyColor: '#e0e0e0',
      captionColor: '#a0a0a0',
      extra: []
    },
    typography: {
      h1: 42,
      h2: 24,
      h3: 16,
      body: 11,
      caption: 8
    },
    layout: {
      padTop: 24,
      padRight: 24,
      padBottom: 24,
      padLeft: 24,
      blockGap: 6,
      lineHeight: 1.6
    },
    print: { bleed: 3, pageW: 148, pageH: 185, cropMarks: false },
    selectedPage: 1,
    selectedBlock: null
  };

  var VERSION = 7;

  var state = {
    drinksData: null,
    typography: deepClone(DEFAULTS.typography),
    palette: deepClone(DEFAULTS.palette),
    layout: deepClone(DEFAULTS.layout),
    pages: {},
    backgrounds: {},
    pageOrder: [],
    print: deepClone(DEFAULTS.print),
    selectedPage: 0,
    selectedBlock: null
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  var undoStack = [];
  var redoStack = [];
  var isApplyingHistory = false;
  var recordTimer = null;

  function getSnapshot() {
    return JSON.stringify({
      typography: state.typography,
      palette: state.palette,
      layout: state.layout,
      drinksData: state.drinksData,
      pages: state.pages,
      pageOrder: state.pageOrder,
      backgrounds: state.backgrounds,
      print: state.print,
      selectedPage: state.selectedPage,
      selectedBlock: state.selectedBlock
    });
  }

  function pushToUndo(snapshot) {
    if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== snapshot) {
      undoStack.push(snapshot);
      if (undoStack.length > 50) undoStack.shift();
      redoStack = [];
    }
  }

  function applySnapshot(snapshotStr) {
    try {
      var parsed = JSON.parse(snapshotStr);
      state.typography = parsed.typography;
      state.palette = parsed.palette;
      state.layout = parsed.layout;
      state.drinksData = parsed.drinksData;
      state.pages = parsed.pages;
      state.pageOrder = parsed.pageOrder;
      state.backgrounds = parsed.backgrounds;
      state.print = parsed.print;
      state.selectedPage = parsed.selectedPage;
      state.selectedBlock = parsed.selectedBlock;
    } catch (e) {
      console.error('Failed to apply snapshot:', e);
    }
  }

  function recordHistory(immediate) {
    if (isApplyingHistory) return;
    var snapshot = getSnapshot();
    if (immediate) {
      clearTimeout(recordTimer);
      pushToUndo(snapshot);
    } else {
      clearTimeout(recordTimer);
      recordTimer = setTimeout(function() {
        pushToUndo(snapshot);
      }, 400);
    }
  }

  function buildPageDefaults() {
    var sigs = state.drinksData ? state.drinksData.drinks.filter(function(d) { return d.category === 'Signature'; }) : [];
    return {
      "1":  { type: "cover",     label: "Cover" },
      "2":  { type: "prefazione", label: "Prefazione" },
      "3":  { type: "drink-left", drinkNumber: 1,  label: sigs[0] ? sigs[0].name : "Drink 1" },
      "4":  { type: "drink-right", backgroundId: null, label: sigs[0] ? sigs[0].name : "Drink 1 Image" },
      "5":  { type: "drink-left", drinkNumber: 2,  label: sigs[1] ? sigs[1].name : "Drink 2" },
      "6":  { type: "drink-right", backgroundId: null, label: sigs[1] ? sigs[1].name : "Drink 2 Image" },
      "7":  { type: "drink-left", drinkNumber: 3,  label: sigs[2] ? sigs[2].name : "Drink 3" },
      "8":  { type: "drink-right", backgroundId: null, label: sigs[2] ? sigs[2].name : "Drink 3 Image" },
      "9":  { type: "drink-left", drinkNumber: 4,  label: sigs[3] ? sigs[3].name : "Drink 4" },
      "10": { type: "drink-right", backgroundId: null, label: sigs[3] ? sigs[3].name : "Drink 4 Image" },
      "11": { type: "drink-left", drinkNumber: 5,  label: sigs[4] ? sigs[4].name : "Drink 5" },
      "12": { type: "drink-right", backgroundId: null, label: sigs[4] ? sigs[4].name : "Drink 5 Image" },
      "13": { type: "drink-left", drinkNumber: 6,  label: sigs[5] ? sigs[5].name : "Drink 6" },
      "14": { type: "drink-right", backgroundId: null, label: sigs[5] ? sigs[5].name : "Drink 6 Image" },
      "15": { type: "drink-left", drinkNumber: 7,  label: sigs[6] ? sigs[6].name : "Drink 7" },
      "16": { type: "drink-right", backgroundId: null, label: sigs[6] ? sigs[6].name : "Drink 7 Image" },
      "17": { type: "drink-left", drinkNumber: 8,  label: sigs[7] ? sigs[7].name : "Drink 8" },
      "18": { type: "drink-right", backgroundId: null, label: sigs[7] ? sigs[7].name : "Drink 8 Image" },
      "19": { type: "list",     section: "intramontabili", label: "Intramontabili" },
      "20": { type: "list",     section: "after-dinner",   label: "After Dinner" },
      "21": { type: "list",     section: "analcolici",     label: "Analcolici" },
      "22": { type: "vermouth", label: "Vermouth Experience" },
      "23": { type: "colophon", label: "Colophon" },
      "24": { type: "back-cover", backgroundId: null, label: "Back Cover" }
    };
  }

  function mergePages(savedPages) {
    var defaults = buildPageDefaults();
    var merged = {};
    var savedKeys = savedPages ? Object.keys(savedPages) : [];
    if (savedKeys.length > 0) {
      for (var i = 0; i < savedKeys.length; i++) {
        var key = savedKeys[i];
        var def = defaults[key] || { type: 'blank', label: 'Page ' + key };
        merged[key] = Object.assign({}, def, savedPages[key]);
      }
    } else {
      for (var i = 1; i <= 24; i++) {
        var key = String(i);
        merged[key] = Object.assign({}, defaults[key] || { type: 'list', label: 'Page ' + i });
      }
    }
    return merged;
  }

  return {
    init: function() {
      var self = this;
      return fetch('data/drinks.json')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          state.drinksData = data;
        })
        .catch(function(e) {
          console.warn('Failed to load drinks.json:', e);
          state.drinksData = { title: 'Menu', subtitle: '', drinks: [], prefazione: [], vermouth_experience: { vermouth: [], bitter: [], spezie: [] } };
        })
        .then(function() {
          return self.loadFromStorage();
        })
        .then(function() {
          if (state.pageOrder.length === 0) self.rebuildPageOrder();
          if (state.selectedPage <= 0 && state.pageOrder.length > 0) {
            state.selectedPage = state.pageOrder[0];
          }
          self.saveToStorage();
          return state;
        });
    },

    rebuildPageOrder: function() {
      state.pageOrder = Object.keys(state.pages).map(Number).sort(function(a, b) { return a - b; });
    },

    getOrderedPageIds: function() {
      return state.pageOrder.slice();
    },

    getTotalPages: function() {
      return state.pageOrder.length;
    },

    movePageUp: function(pageNum) {
      var idx = state.pageOrder.indexOf(pageNum);
      if (idx <= 0) return;
      var tmp = state.pageOrder[idx];
      state.pageOrder[idx] = state.pageOrder[idx - 1];
      state.pageOrder[idx - 1] = tmp;
      state.selectedPage = pageNum;
      this.saveToStorage();
    },

    movePageDown: function(pageNum) {
      var idx = state.pageOrder.indexOf(pageNum);
      if (idx < 0 || idx >= state.pageOrder.length - 1) return;
      var tmp = state.pageOrder[idx];
      state.pageOrder[idx] = state.pageOrder[idx + 1];
      state.pageOrder[idx + 1] = tmp;
      state.selectedPage = pageNum;
      this.saveToStorage();
    },

    addBlankPage: function() {
      var maxId = 0;
      for (var i = 0; i < state.pageOrder.length; i++) {
        if (state.pageOrder[i] > maxId) maxId = state.pageOrder[i];
      }
      var newId = maxId + 1;
      var p = String(newId);
      state.pages[p] = {
        type: 'blank',
        label: 'Pagina Vuota',
        grid: { rows: [{ id: 'r1', cols: 1, gap: 4 }], rowGap: 4 },
        blocks: [
          { id: 'b1', type: 'text', gridRow: 1, colSpan: 1, widthPct: 100,
            content: '',
            style: { font: 'ABC Camera', size: 12, weight: 'normal', color: state.palette.bodyColor || '#e0e0e0', align: 'left', valign: 'center', transform: 'none', lineH: 1.4 }
          }
        ]
      };
      state.pageOrder.push(newId);
      state.selectedPage = newId;
      this.saveToStorage();
      return newId;
    },

    removePage: function(pageNum) {
      var idx = state.pageOrder.indexOf(pageNum);
      if (idx < 0) return;
      state.pageOrder.splice(idx, 1);
      delete state.pages[String(pageNum)];
      if (state.selectedPage === pageNum) {
        state.selectedPage = state.pageOrder.length > 0 ? state.pageOrder[Math.min(idx, state.pageOrder.length - 1)] : 0;
      }
      if (state.selectedBlock && state.selectedBlock.page === pageNum) {
        state.selectedBlock = null;
      }
      this.saveToStorage();
    },

    updatePageLabel: function(pageNum, label) {
      var p = String(pageNum);
      if (state.pages[p]) {
        state.pages[p].label = label;
        this.saveToStorage();
        recordHistory(true);
      }
    },

    getState() {
      return state;
    },

    getDrinkByNumber: function(num) {
      if (!state.drinksData || !state.drinksData.drinks) return null;
      var drinks = state.drinksData.drinks;
      for (var i = 0; i < drinks.length; i++) {
        if (drinks[i].number === num && drinks[i].category === 'Signature') return drinks[i];
      }
      return null;
    },

    resolvePaletteColor: function(key) {
      if (key && key.indexOf('extra') === 0) {
        var idx = parseInt(key.substring(5), 10);
        return (state.palette.extra || [])[idx] || '#888888';
      }
      return state.palette[key] || '#888888';
    },

    getPaletteColors: function() {
      var keys = ['bg', 'h1Color', 'h2Color', 'h3Color', 'bodyColor', 'captionColor'];
      var colors = [];
      for (var ki = 0; ki < keys.length; ki++) {
        colors.push(state.palette[keys[ki]] || DEFAULTS.palette[keys[ki]] || '#888888');
      }
      var extras = state.palette.extra || [];
      for (var i = 0; i < extras.length; i++) {
        colors.push(extras[i]);
      }
      return colors;
    },

    addPaletteColor: function(color) {
      if (!state.palette.extra) state.palette.extra = [];
      state.palette.extra.push(color || '#888888');
      this.saveToStorage();
    },

    removePaletteColor: function(index) {
      if (!state.palette.extra) return;
      state.palette.extra.splice(index, 1);
      this.saveToStorage();
    },

    updatePaletteExtra: function(index, color) {
      if (!state.palette.extra) state.palette.extra = [];
      if (index >= 0 && index < state.palette.extra.length) {
        state.palette.extra[index] = color;
      }
      this.saveToStorage();
    },

    loadFromStorage: function() {
      var self = this;
      return new Promise(function(resolve) {
        try {
          var saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            var parsed = JSON.parse(saved);
            if (parsed && parsed.pages && Object.keys(parsed.pages).length > 0) {
              state.typography = Object.assign({}, DEFAULTS.typography, parsed.typography || {});
              state.palette = Object.assign({}, DEFAULTS.palette, parsed.palette || {});
              state.layout = Object.assign({}, DEFAULTS.layout, parsed.layout || {});
              state.backgrounds = parsed.backgrounds || {};
              state.print = Object.assign({}, DEFAULTS.print, parsed.print || {});
              state.selectedPage = parsed.selectedPage || 1;
              state.pageOrder = parsed.pageOrder || [];
              state.pages = mergePages(parsed.pages || {});
              if (parsed.drinksData) state.drinksData = parsed.drinksData;
              self.migrateLegacyPages();
              if (state.pageOrder.length === 0) self.rebuildPageOrder();
              self.saveToStorage();
              console.log('[AdminState] Loaded state from localStorage');
              undoStack = [getSnapshot()];
              redoStack = [];
              resolve();
              return;
            }
          }
        } catch (e) {
          console.warn('Failed to load from localStorage, falling back to admin-save.json:', e);
        }

        fetch('admin-save.json?' + Date.now())
          .then(function(res) {
            if (!res.ok) throw new Error('not found');
            return res.json();
          })
          .then(function(parsed) {
            state.typography = Object.assign({}, DEFAULTS.typography, parsed.typography || {});
            state.palette = Object.assign({}, DEFAULTS.palette, parsed.palette || {});
            state.layout = Object.assign({}, DEFAULTS.layout, parsed.layout || {});
            state.backgrounds = parsed.backgrounds || {};
            state.print = Object.assign({}, DEFAULTS.print, parsed.print || {});
            state.selectedPage = parsed.selectedPage || 1;
            state.pageOrder = parsed.pageOrder || [];
            state.pages = mergePages(parsed.pages || {});
            if (parsed.drinksData) state.drinksData = parsed.drinksData;
            self.migrateLegacyPages();
            if (state.pageOrder.length === 0) self.rebuildPageOrder();
            self.saveToStorage();
            console.log('[AdminState] Loaded preset from admin-save.json');
            undoStack = [getSnapshot()];
            redoStack = [];
            resolve();
          })
          .catch(function() {
            state.pages = mergePages({});
            self.migrateLegacyPages();
            self.rebuildPageOrder();
            undoStack = [getSnapshot()];
            redoStack = [];
            resolve();
          });
      });
    },

    saveToStorage() {
      try {
        var toSave = {
          typography: state.typography,
          palette: state.palette,
          layout: state.layout,
          _version: VERSION,
          drinksData: state.drinksData,
          pages: state.pages,
          pageOrder: state.pageOrder,
          backgrounds: state.backgrounds,
          print: state.print,
          selectedPage: state.selectedPage,
          selectedBlock: state.selectedBlock
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        recordHistory(false);
      } catch (e) {
        console.warn('Failed to save to storage:', e);
      }
    },

    updateTypography(key, value) {
      state.typography[key] = value;
      this.saveToStorage();
    },

    updateLayout(key, value) {
      state.layout[key] = value;
      this.saveToStorage();
    },

    updatePalette(key, value) {
      state.palette[key] = value;
      this.saveToStorage();
    },

    updatePageOverride(pageNum, section, key, value) {
      var p = String(pageNum);
      if (!state.pages[p]) {
        state.pages[p] = buildPageDefaults()[p] || { type: 'list', label: 'Page ' + p };
      }
      if (!state.pages[p].overrides) state.pages[p].overrides = {};
      if (!state.pages[p].overrides[section]) state.pages[p].overrides[section] = {};
      state.pages[p].overrides[section][key] = value;
      this.saveToStorage();
    },

    getPageConfig: function(pageNum) {
      var p = String(pageNum);
      var page = state.pages[p] || buildPageDefaults()[p] || { type: 'list', label: 'Page ' + p };
      var typoOverride = (page.overrides && page.overrides.typography) || {};
      var layoutOverride = (page.overrides && page.overrides.layout) || {};
      var paletteOverride = (page.overrides && page.overrides.palette) || {};
      var layout = state.layout ? Object.assign({}, state.layout) : deepClone(DEFAULTS.layout);
      if (layoutOverride.padTop !== undefined) layout.padTop = layoutOverride.padTop;
      if (layoutOverride.padBottom !== undefined) layout.padBottom = layoutOverride.padBottom;
      if (layoutOverride.padLeft !== undefined) layout.padLeft = layoutOverride.padLeft;
      if (layoutOverride.padRight !== undefined) layout.padRight = layoutOverride.padRight;
      if (layoutOverride.blockGap !== undefined) layout.blockGap = layoutOverride.blockGap;
      
      var typography = Object.assign({}, state.typography || {}, typoOverride);
      var palette = Object.assign({}, state.palette || {}, paletteOverride);
      
      var merged = Object.assign({}, page);
      merged.typography = typography;
      merged.palette = palette;
      merged.layout = layout;
      return merged;
    },

    updateDrink(drinkNumber, field, value) {
      if (!state.drinksData || !state.drinksData.drinks) return;
      var drink = null;
      for (var i = 0; i < state.drinksData.drinks.length; i++) {
        if (state.drinksData.drinks[i].number === drinkNumber && state.drinksData.drinks[i].category === 'Signature') {
          drink = state.drinksData.drinks[i];
          break;
        }
      }
      if (drink) {
        drink[field] = value;
      }
      this.saveToStorage();
    },

    addBackground(id, svgStr, config) {
      state.backgrounds[id] = { id: id, svg: svgStr, config: config, created: Date.now() };
      this.saveToStorage();
    },

    removeBackground(id) {
      delete state.backgrounds[id];
      for (var i = 1; i <= 24; i++) {
        var key = String(i);
        if (state.pages[key] && state.pages[key].backgroundId === id) {
          state.pages[key].backgroundId = null;
        }
      }
      this.saveToStorage();
    },

    assignBackgroundToPage(pageNum, bgId) {
      var p = String(pageNum);
      if (!state.pages[p]) {
        state.pages[p] = buildPageDefaults()[p] || { type: 'list', label: 'Page ' + p };
      }
      state.pages[p].backgroundId = bgId;
      state.pages[p].bgColorOverride = null;
      this.saveToStorage();
    },

    setPageBgColor: function(pageNum, color) {
      var p = String(pageNum);
      if (!state.pages[p]) return;
      state.pages[p].bgColorOverride = color || null;
      if (color) state.pages[p].backgroundId = null;
      this.saveToStorage();
    },

    resetDefaults() {
      localStorage.removeItem(STORAGE_KEY);
      state.typography = deepClone(DEFAULTS.typography);
      state.palette = deepClone(DEFAULTS.palette);
      state.layout = deepClone(DEFAULTS.layout);
      state.pages = mergePages({});
      state.pageOrder = [];
      state.backgrounds = {};
      state.print = deepClone(DEFAULTS.print);
      state.selectedPage = 1;
      state.selectedBlock = null;
      this.rebuildPageOrder();
    },

    migrateLegacyPages: function() {
      var pages = state.pages;
      var data = state.drinksData;

      function toNewGrid(oldGrid) {
        if (!oldGrid) oldGrid = { rows: 1, cols: 1, gap: 4 };
        var rows = [];
        for (var ri = 0; ri < (oldGrid.rows || 1); ri++) {
          rows.push({ id: 'r' + (ri + 1), cols: (oldGrid.cols || 1), gap: (oldGrid.gap || 4) });
        }
        return { rows: rows, rowGap: (oldGrid.gap || 4) };
      }

      for (var ki in pages) {
        var pg = pages[ki];
        if (pg && pg.grid && pg.grid.cols !== undefined && pg.grid.rows !== undefined && pg.blocks) {
          var oldGap = pg.grid.gap || 4;
          var oldCols = pg.grid.cols || 1;
          var oldRows = pg.grid.rows || 1;
          var newRows = [];
          for (var ri2 = 0; ri2 < oldRows; ri2++) {
            newRows.push({ id: 'r' + (ri2 + 1), cols: oldCols, gap: oldGap });
          }
          pg.grid = { rows: newRows, rowGap: oldGap };
          for (var bi = 0; bi < (pg.blocks || []).length; bi++) {
            var blk = pg.blocks[bi];
            if (blk.colIndex === undefined) {
              var colCount = 0;
              for (var bj = 0; bj < bi; bj++) {
                if ((pg.blocks[bj].gridRow || 1) === (blk.gridRow || 1)) colCount++;
              }
              blk.colIndex = colCount + 1;
            }
            if (blk.widthPct === undefined) {
              var rowConfig = newRows[blk.gridRow - 1] || { cols: 1, gap: 4 };
              var colsInRow = rowConfig.cols || 1;
              var blocksInRow = 0;
              for (var bk = 0; bk < (pg.blocks || []).length; bk++) {
                if (pg.blocks[bk].gridRow === blk.gridRow) blocksInRow++;
              }
              blk.widthPct = 100 / (colsInRow || 1);
            }
            delete blk.gridCol;
            delete blk.rowSpan;
          }
        }
      }

      for (var ki2 in pages) {
        var pg2 = pages[ki2];
        if (!pg2 || !pg2.blocks) continue;
        for (var bi2 = 0; bi2 < pg2.blocks.length; bi2++) {
          var blk2 = pg2.blocks[bi2];
          if (blk2.colIndex === undefined) {
            var count = 0;
            for (var bj2 = 0; bj2 < bi2; bj2++) {
              if ((pg2.blocks[bj2].gridRow || 1) === (blk2.gridRow || 1)) count++;
            }
            blk2.colIndex = count + 1;
          }
          if (blk2.widthPct === undefined) {
            var rc = (pg2.grid && pg2.grid.rows) ? (pg2.grid.rows[(blk2.gridRow || 1) - 1] || { cols: 1 }) : { cols: 1 };
            blk2.widthPct = 100 / (rc.cols || 1);
          }
          if (blk2.level === undefined) {
            var sz = (blk2.style && blk2.style.size) || 12;
            if (blk2.style && blk2.style.font === 'Tuaf') {
              blk2.level = sz >= 28 ? 'h1' : 'h2';
            } else {
              blk2.level = sz >= 14 ? 'h3' : (sz <= 8 ? 'caption' : 'body');
            }
          }
        }
      }

      for (var i = 1; i <= 24; i++) {
        var key = String(i);
        var page = pages[key];
        if (!page) continue;
        if (page.grid && page.blocks) continue;

        switch (page.type) {
          case 'cover':
            page.grid = toNewGrid({ rows: 3, cols: 1, gap: 8 });
            page.blocks = [
              { id: 'b1', type: 'text', gridRow: 2, colSpan: 1, widthPct: 100, content: data ? data.title : '', style: { font: 'Tuaf', size: 48, weight: 'bold', colorKey: 'h1Color', align: 'center', valign: 'center', transform: 'uppercase', letterSpacing: 6, lineH: 1.1 }, level: 'h1', colIndex: 1 },
              { id: 'b2', type: 'text', gridRow: 3, colSpan: 1, widthPct: 100, content: data ? data.subtitle : '', style: { font: 'ABC Camera', size: 14, weight: 'normal', colorKey: 'h2Color', align: 'center', valign: 'center', transform: 'uppercase', letterSpacing: 8, lineH: 1.4 }, level: 'caption', colIndex: 1 }
            ];
            break;

          case 'prefazione': {
            var prefaText = '';
            if (data && data.prefazione) {
              prefaText = data.prefazione.join('\n\n');
            }
            page.grid = toNewGrid({ rows: 1, cols: 1, gap: 4 });
            page.blocks = [
              { id: 'b1', type: 'text', gridRow: 1, colSpan: 1, widthPct: 100, colIndex: 1, content: prefaText, style: { font: 'ABC Camera', size: 8, weight: 'normal', colorKey: 'bodyColor', align: 'left', valign: 'center', transform: 'none', lineH: 1.4, fixedHeight: true, letterSpacing: 0 }, level: 'caption' }
            ];
            break;
          }

          case 'drink-left': {
            var dn = page.drinkNumber || 1;
            var drink = this.getDrinkByNumber(dn);
            if (drink) {
              page.grid = toNewGrid({ rows: 3, cols: 1, gap: 8 });
              page.blocks = [
                { id: 'b1', type: 'text', gridRow: 1, colSpan: 1, widthPct: 100, colIndex: 1, content: drink.name || '', style: { font: 'Tuaf', size: 36, weight: 'bold', colorKey: 'h1Color', align: 'left', valign: 'center', transform: 'uppercase', letterSpacing: 3, lineH: 1.1 }, level: 'h1' },
                { id: 'b2', type: 'text', gridRow: 2, colSpan: 1, widthPct: 100, colIndex: 1, content: drink.profile || '', style: { font: 'ABC Camera', size: 14, weight: 'normal', colorKey: 'h2Color', align: 'left', valign: 'center', transform: 'uppercase', letterSpacing: 2, lineH: 1.4 }, level: 'h2' },
                { id: 'b3', type: 'text', gridRow: 3, colSpan: 1, widthPct: 100, colIndex: 1, content: (drink.ingredients || []).join('\n'), style: { font: 'ABC Camera', size: 11, weight: 'normal', colorKey: 'h3Color', align: 'left', valign: 'center', transform: 'none', lineH: 1.8 }, level: 'h3' },
                { id: 'bchart', type: 'chart', gridRow: 4, colSpan: 1, widthPct: 100, colIndex: 1, content: '', style: { valign: 'center', align: 'center', fixedHeight: true }, chartData: drink.taste || {} }
              ];
            } else {
              page.grid = toNewGrid({ rows: 1, cols: 1, gap: 0 });
              page.blocks = [];
            }
            break;
          }

          case 'drink-right':
            page.grid = toNewGrid({ rows: 1, cols: 1, gap: 0 });
            page.blocks = [];
            break;

          case 'list': {
            var section = page.section || '';
            var items = [];
            var listTitle = '';
            if (data && data.drinks) {
              if (section === 'intramontabili') {
                items = data.drinks.filter(function(d) { return d.category && d.category.indexOf('INTRAMONTABILI') !== -1; });
                listTitle = 'Intramontabili';
              } else if (section === 'after-dinner') {
                items = data.drinks.filter(function(d) { return d.category && d.category.indexOf('AFTER') !== -1; });
                listTitle = 'After Dinner';
              } else {
                items = data.drinks.filter(function(d) { return d.category === 'Alcohol Free'; });
                listTitle = 'Analcolici';
              }
            }
            var listRows = [{ id: 'r1', cols: 1, gap: 4 }];
            for (var li = 0; li < items.length; li++) {
              listRows.push({ id: 'r' + (li + 2), cols: 2, gap: 8 });
            }
            page.grid = { rows: listRows, rowGap: 6 };
            page.blocks = [];
            page.blocks.push(
              { id: 'btitle', type: 'text', gridRow: 1, colIndex: 1, widthPct: 100, content: listTitle, style: { font: 'Tuaf', size: 24, weight: 'bold', colorKey: 'h1Color', align: 'left', valign: 'center', transform: 'capitalize', letterSpacing: 2, lineH: 1 } }
            );
            for (var li = 0; li < items.length; li++) {
              var item = items[li];
              var itemRow = li + 2;
              page.blocks.push(
                { id: 'b' + (li * 2 + 1), type: 'text', gridRow: itemRow, colIndex: 1, widthPct: 50, content: item.name || '', style: { font: 'ABC Camera', size: 16, weight: 'normal', colorKey: 'captionColor', align: 'left', valign: 'center', transform: 'uppercase', lineH: 1.4, letterSpacing: 1 }, level: 'h3' },
                { id: 'b' + (li * 2 + 2), type: 'text', gridRow: itemRow, colIndex: 2, widthPct: 50, content: item.profile || '', style: { font: 'ABC Camera', size: 11, weight: 'normal', colorKey: 'h2Color', align: 'right', valign: 'center', transform: 'uppercase', lineH: 1.2 }, level: 'body' }
              );
            }
            break;
          }

          case 'vermouth': {
            var ve = data ? data.vermouth_experience : { vermouth: [], bitter: [], spezie: [] };
            page.grid = toNewGrid({ rows: 3, cols: 3, gap: 8 });
            page.grid.rows[0].cols = 1;
            page.blocks = [
              { id: 'b1', type: 'text', gridRow: 1, colSpan: 1, colIndex: 1, widthPct: 100, content: 'The Spiritual\nMachine', style: { font: 'Tuaf', size: 24, weight: 'bold', colorKey: 'h1Color', align: 'center', valign: 'center', transform: 'capitalize', letterSpacing: 4, lineH: 1.2, fixedHeight: null } },
              { id: 'b2', type: 'text', gridRow: 2, colSpan: 1, colIndex: 1, widthPct: 100, content: 'Vermouth\n' + (ve.vermouth || []).join('\n'), style: { font: 'ABC Camera', size: 11, weight: 'normal', colorKey: 'bodyColor', align: 'center', valign: 'center', transform: 'none', lineH: 1.6, letterSpacing: 0 }, level: 'body' },
              { id: 'b3', type: 'text', gridRow: 2, colIndex: 2, widthPct: 100, content: 'Bitter\n' + (ve.bitter || []).join('\n'), style: { font: 'ABC Camera', size: 11, weight: 'normal', colorKey: 'bodyColor', align: 'left', valign: 'center', transform: 'none', lineH: 1.6, letterSpacing: 0 }, level: 'body' },
              { id: 'b4', type: 'text', gridRow: 2, colIndex: 3, widthPct: 100, content: 'Spezie\n' + (ve.spezie || []).join('\n'), style: { font: 'ABC Camera', size: 11, weight: 'normal', colorKey: 'bodyColor', align: 'left', valign: 'center', transform: 'none', lineH: 1.6, letterSpacing: 0 }, level: 'body' }
            ];
            break;
          }

          case 'colophon':
            page.grid = toNewGrid({ rows: 2, cols: 1, gap: 8 });
            page.blocks = [
              { id: 'b1', type: 'text', gridRow: 1, colSpan: 1, widthPct: 100, colIndex: 1, content: 'BP LAB\n2026', style: { font: 'Tuaf', size: 24, weight: 'bold', colorKey: 'h1Color', align: 'center', valign: 'center', transform: 'uppercase', letterSpacing: 6, lineH: 1.2, fixedHeight: true }, level: 'h2' },
              { id: 'b2', type: 'text', gridRow: 2, colSpan: 1, widthPct: 100, colIndex: 1, content: '\u00a9 2026 BP LAB. All rights reserved.\nDesign: Visual Studio / Sisyphus', style: { font: 'ABC Camera', size: 9, weight: 'normal', colorKey: 'captionColor', align: 'center', valign: 'center', transform: 'none', lineH: 1.6 }, level: 'caption' }
            ];
            break;

          case 'back-cover':
            page.grid = toNewGrid({ rows: 1, cols: 1, gap: 0 });
            page.blocks = [];
            break;

          default:
            page.grid = toNewGrid({ rows: 1, cols: 1, gap: 0 });
            page.blocks = [];
        }
      }

      for (var ki3 in pages) {
        var pg3 = pages[ki3];
        if (!pg3 || !pg3.blocks) continue;
        for (var bi3 = 0; bi3 < pg3.blocks.length; bi3++) {
          var blk3 = pg3.blocks[bi3];
          if (blk3.level === undefined && blk3.style) {
            var sz3 = blk3.style.size || 12;
            if (blk3.style.font === 'Tuaf') {
              blk3.level = sz3 >= 28 ? 'h1' : 'h2';
            } else {
              blk3.level = sz3 >= 14 ? 'h3' : (sz3 <= 8 ? 'caption' : 'body');
            }
          }
          if (blk3.colIndex === undefined) blk3.colIndex = 1;
          if (blk3.style) {
            var paletteColors = [state.palette.bg, state.palette.h1Color, state.palette.h2Color, state.palette.h3Color, state.palette.bodyColor, state.palette.captionColor];
            var paletteKeys = ['bg', 'h1Color', 'h2Color', 'h3Color', 'bodyColor', 'captionColor'];
            if (blk3.style.color !== undefined && blk3.style.colorKey === undefined) {
              var found = null;
              for (var pm = 0; pm < paletteColors.length; pm++) {
                if (blk3.style.color === paletteColors[pm]) { found = paletteKeys[pm]; break; }
              }
              if (!found && state.palette.extra) {
                for (var ei = 0; ei < state.palette.extra.length; ei++) {
                  if (blk3.style.color === state.palette.extra[ei]) { found = 'extra' + ei; break; }
                }
              }
              if (found) {
                blk3.style.colorKey = found;
                delete blk3.style.color;
              }
            }
            if (blk3.style && blk3.style.colorKey) {
              var oldKey = blk3.style.colorKey;
              if (oldKey === 'gold') blk3.style.colorKey = 'h1Color';
              else if (oldKey === 'teal') blk3.style.colorKey = 'h2Color';
              else if (oldKey === 'text') blk3.style.colorKey = 'bodyColor';
              else if (oldKey === 'muted') blk3.style.colorKey = 'captionColor';
              else if (oldKey === 'bgDeep' || oldKey === 'bgDark') delete blk3.style.colorKey;
            }
          }
        }
      }
    },

    selectBlock: function(pageNum, blockId) {
      state.selectedBlock = { page: pageNum, blockId: blockId };
      this.saveToStorage();
    },

    deselectBlock: function() {
      state.selectedBlock = null;
      this.saveToStorage();
    },

    addBlock: function(pageNum, type, rowNum) {
      var p = String(pageNum);
      var page = state.pages[p];
      if (!page) return null;
      if (!page.blocks) page.blocks = [];
      if (!page.grid) page.grid = { rows: [{ id: 'r1', cols: 1, gap: 4 }], rowGap: 4 };
      var grid = page.grid;
      
      // Unique block ID generation
      var ids = page.blocks.map(function(b) { return b.id; });
      var counter = page.blocks.length + 1;
      while (ids.indexOf('b' + counter) >= 0) {
        counter++;
      }
      var newId = 'b' + counter;

      var rowIdx = (typeof rowNum === 'number' && !isNaN(rowNum)) ? rowNum : (page.blocks.length < (grid.rows || []).length ? (page.blocks.length + 1) : 1);
      var rowConfig = (grid.rows || [])[rowIdx - 1] || { cols: 1, gap: 4 };
      var defaultWidth = 100 / (rowConfig.cols || 1);
      
      var colCount = 0;
      for (var cb = 0; cb < page.blocks.length; cb++) {
        if (page.blocks[cb].gridRow === rowIdx) {
          colCount = Math.max(colCount, (page.blocks[cb].colIndex || 0));
        }
      }
      
      var isImage = type === 'image';
      var block = {
        id: newId,
        type: isImage ? 'image' : 'text',
        gridRow: rowIdx,
        colIndex: colCount + 1,
        widthPct: defaultWidth,
        content: isImage ? '' : 'Nuovo blocco',
        imageUrl: isImage ? '' : undefined,
        style: isImage ? { valign: 'center', align: 'center' } : { font: 'ABC Camera', size: 12, weight: 'normal', colorKey: 'bodyColor', align: 'left', valign: 'center', transform: 'none', lineH: 1.4 }
      };
      page.blocks.push(block);
      this.saveToStorage();
      return block;
    },

    removeBlock: function(pageNum, blockId) {
      var p = String(pageNum);
      var page = state.pages[p];
      if (!page || !page.blocks) return;
      
      var deletedBlock = null;
      for (var i = 0; i < page.blocks.length; i++) {
        if (page.blocks[i].id === blockId) {
          deletedBlock = page.blocks[i];
          break;
        }
      }
      
      page.blocks = page.blocks.filter(function(b) { return b.id !== blockId; });
      
      if (deletedBlock) {
        var rowNum = deletedBlock.gridRow;
        var rowBlocks = page.blocks.filter(function(b) { return b.gridRow === rowNum; });
        rowBlocks.sort(function(a, b) { return (a.colIndex || 1) - (b.colIndex || 1); });
        for (var j = 0; j < rowBlocks.length; j++) {
          rowBlocks[j].colIndex = j + 1;
        }
      }
      
      if (state.selectedBlock && state.selectedBlock.page === pageNum && state.selectedBlock.blockId === blockId) {
        state.selectedBlock = null;
      }
      this.saveToStorage();
    },

    duplicateBlock: function(pageNum, blockId) {
      var p = String(pageNum);
      var page = state.pages[p];
      if (!page || !page.blocks) return null;
      
      var sourceBlock = null;
      for (var i = 0; i < page.blocks.length; i++) {
        if (page.blocks[i].id === blockId) {
          sourceBlock = page.blocks[i];
          break;
        }
      }
      if (!sourceBlock) return null;
      
      var newId = 'b' + (page.blocks.length + 1);
      var ids = page.blocks.map(function(b) { return b.id; });
      var counter = page.blocks.length + 1;
      while (ids.indexOf('b' + counter) >= 0) {
        counter++;
      }
      newId = 'b' + counter;

      var newBlock = JSON.parse(JSON.stringify(sourceBlock));
      newBlock.id = newId;

      var rowNum = sourceBlock.gridRow || 1;
      var ci = 0;
      for (var k = 0; k < page.blocks.length; k++) {
        if (page.blocks[k].gridRow === rowNum) {
          ci = Math.max(ci, (page.blocks[k].colIndex || 0));
        }
      }
      newBlock.colIndex = ci + 1;

      page.blocks.push(newBlock);
      this.saveToStorage();
      return newBlock;
    },

    updateBlock: function(pageNum, blockId, field, value) {
      var p = String(pageNum);
      var page = state.pages[p];
      if (!page || !page.blocks) return;
      var styleFields = ['font', 'size', 'weight', 'transform', 'letterSpacing', 'lineH'];
      for (var i = 0; i < page.blocks.length; i++) {
        if (page.blocks[i].id === blockId) {
          if (field.indexOf('style.') === 0) {
            var styleKey = field.substring(6);
            page.blocks[i].style[styleKey] = value;
            for (var sf = 0; sf < styleFields.length; sf++) {
              if (styleKey === styleFields[sf]) {
                page.blocks[i].level = null;
                break;
              }
            }
          } else {
            page.blocks[i][field] = value;
          }
          break;
        }
      }
      this.saveToStorage();
    },

    applyBlockLevel: function(pageNum, blockId, level) {
      var p = String(pageNum);
      var page = state.pages[p];
      if (!page || !page.blocks) return;
      var t = state.typography;
      var presets = {
        h1: { font: 'Tuaf', size: t.h1 || 28, weight: 'bold', transform: 'uppercase', letterSpacing: 2, lineH: 1.2 },
        h2: { font: 'Tuaf', size: t.h2 || 18, weight: 'bold', transform: 'uppercase', letterSpacing: 2, lineH: 1.2 },
        h3: { font: 'ABC Camera', size: t.h3 || 14, weight: 'normal', transform: 'uppercase', letterSpacing: 1, lineH: 1.4 },
        body: { font: 'ABC Camera', size: t.body || 10, weight: 'normal', transform: 'none', letterSpacing: 0, lineH: 1.6 },
        caption: { font: 'ABC Camera', size: t.caption || 8, weight: 'normal', transform: 'none', letterSpacing: 0, lineH: 1.4 }
      };
      var preset = presets[level] || presets.body;
      for (var i = 0; i < page.blocks.length; i++) {
        if (page.blocks[i].id === blockId) {
          page.blocks[i].level = level;
          var s = page.blocks[i].style;
          s.font = preset.font;
          s.size = preset.size;
          s.weight = preset.weight;
          s.transform = preset.transform;
          s.letterSpacing = preset.letterSpacing;
          s.lineH = preset.lineH;
          break;
        }
      }
      this.saveToStorage();
    },

    moveBlock: function(pageNum, blockId, direction) {
      var p = String(pageNum);
      var page = state.pages[p];
      if (!page || !page.blocks || !page.grid) return;
      var grid = page.grid;
      var rows = grid.rows || [];
      var bi = -1;
      for (var i = 0; i < page.blocks.length; i++) {
        if (page.blocks[i].id === blockId) { bi = i; break; }
      }
      if (bi < 0) return;
      var block = page.blocks[bi];
      var curRow = block.gridRow || 1;

      if (direction === 'up' || direction === 'down') {
        var newRow;
        if (direction === 'up') {
          newRow = curRow <= 1 ? rows.length : curRow - 1;
        } else {
          newRow = curRow >= rows.length ? 1 : curRow + 1;
        }
        if (newRow !== curRow) {
          block.gridRow = newRow;
        }
      } else if (direction === 'left' || direction === 'right') {
        var rowConfig = rows[curRow - 1] || { cols: 1 };
        var maxCols = rowConfig.cols || 1;
        var oldCi = block.colIndex || 1;
        var newCi;
        if (direction === 'left') {
          newCi = oldCi <= 1 ? maxCols : oldCi - 1;
        } else {
          newCi = oldCi >= maxCols ? 1 : oldCi + 1;
        }
        for (var j = 0; j < page.blocks.length; j++) {
          if (j !== bi && page.blocks[j].gridRow === curRow && page.blocks[j].colIndex === newCi) {
            page.blocks[j].colIndex = oldCi;
            break;
          }
        }
        block.colIndex = newCi;
      }
      this.saveToStorage();
    },

    updatePageGrid: function(pageNum, key, value) {
      var p = String(pageNum);
      if (!state.pages[p]) return;
      if (!state.pages[p].grid) state.pages[p].grid = { rows: [{ id: 'r1', cols: 1, gap: 4 }], rowGap: 4 };
      state.pages[p].grid[key] = value;
      this.saveToStorage();
    },

    addRow: function(pageNum) {
      var p = String(pageNum);
      var page = state.pages[p];
      if (!page) return null;
      if (!page.grid) page.grid = { rows: [{ id: 'r1', cols: 1, gap: 4 }], rowGap: 4 };
      
      var ids = page.grid.rows.map(function(r) { return r.id; });
      var counter = page.grid.rows.length + 1;
      while (ids.indexOf('r' + counter) >= 0) {
        counter++;
      }
      var rowId = 'r' + counter;
      
      page.grid.rows.push({ id: rowId, cols: 1, gap: 4 });
      this.saveToStorage();
      return page.grid.rows[page.grid.rows.length - 1];
    },

    removeRow: function(pageNum, rowId) {
      var p = String(pageNum);
      var page = state.pages[p];
      if (!page || !page.grid || !page.grid.rows) return;
      var idx = -1;
      for (var i = 0; i < page.grid.rows.length; i++) {
        if (page.grid.rows[i].id === rowId) { idx = i; break; }
      }
      if (idx === -1) return;
      page.grid.rows.splice(idx, 1);
      var rowNum = idx + 1;
      page.blocks = (page.blocks || []).filter(function(b) { return b.gridRow !== rowNum; });
      for (var j = 0; j < (page.blocks || []).length; j++) {
        if (page.blocks[j].gridRow > rowNum) {
          page.blocks[j].gridRow = page.blocks[j].gridRow - 1;
        }
      }
      if (page.grid.rows.length === 0) {
        page.grid.rows.push({ id: 'r1', cols: 1, gap: 4 });
      }
      this.saveToStorage();
    },

    updateRowConfig: function(pageNum, rowId, key, value) {
      var p = String(pageNum);
      var page = state.pages[p];
      if (!page || !page.grid || !page.grid.rows) return;
      for (var i = 0; i < page.grid.rows.length; i++) {
        if (page.grid.rows[i].id === rowId) {
          page.grid.rows[i][key] = value;
          break;
        }
      }
      this.saveToStorage();
    },

    exportJSON() {
      return JSON.stringify(state.drinksData, null, 2);
    },

    recordHistory: function(immediate) {
      recordHistory(immediate);
    },

    undo: function() {
      if (undoStack.length <= 1) return false;
      var current = getSnapshot();
      redoStack.push(current);
      var prev = undoStack.pop();
      if (prev === current && undoStack.length > 0) {
        prev = undoStack.pop();
      }
      isApplyingHistory = true;
      applySnapshot(prev);
      isApplyingHistory = false;
      try {
        localStorage.setItem(STORAGE_KEY, getSnapshot());
      } catch (e) {}
      return true;
    },

    redo: function() {
      if (redoStack.length === 0) return false;
      var next = redoStack.pop();
      undoStack.push(getSnapshot());
      isApplyingHistory = true;
      applySnapshot(next);
      isApplyingHistory = false;
      try {
        localStorage.setItem(STORAGE_KEY, getSnapshot());
      } catch (e) {}
      return true;
    },

    canUndo: function() {
      return undoStack.length > 1;
    },

    canRedo: function() {
      return redoStack.length > 0;
    }
  };
})();
