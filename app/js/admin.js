(function() {
  'use strict';

  var adminState, preview, webgl;
  var bgCounter = 0;

  function showToast(msg, type) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (type || '') + ' show';
    clearTimeout(el._hide);
    el._hide = setTimeout(function() { el.classList.remove('show'); }, 2500);
  }

  function getPageBadge(type) {
    var map = {
      'cover': ['Cover', 'badge-cover'],
      'prefazione': ['Testo', 'badge-special'],
      'drink-left': ['Drink', 'badge-spread'],
      'drink-right': ['Bg', 'badge-list'],
      'list': ['Lista', 'badge-list'],
      'vermouth': ['Spec', 'badge-special'],
      'colophon': ['Info', 'badge-special'],
      'back-cover': ['Cover', 'badge-cover'],
      'blank': ['Vuota', 'badge-list']
    };
    return map[type] || ['Pag', 'badge-list'];
  }

  function renderNavigation() {
    var list = document.getElementById('pageNavList');
    if (!list) return;
    list.innerHTML = '';
    var state = adminState.getState();
    var orderedIds = adminState.getOrderedPageIds();

    for (var i = 0; i < orderedIds.length; i++) {
      var pn = orderedIds[i];
      var cfg = adminState.getPageConfig(pn);
      var pi = state.pages[String(pn)] || {};
      var b = getPageBadge(cfg.type);
      var isActive = state.selectedPage === pn;

      var thumb = document.createElement('div');
      thumb.className = 'page-thumb' + (isActive ? ' active' : '');
      thumb.setAttribute('data-page', pn);
      thumb.style.cursor = 'pointer';
      thumb.innerHTML = '<div class="page-thumb-top"><span class="page-thumb-num">' + pn + '</span><span class="badge ' + b[1] + '">' + b[0] + '</span>' +
        '<div class="page-thumb-arrows"><button class="page-thumb-up" data-page="' + pn + '">&#9650;</button>' +
        '<button class="page-thumb-down" data-page="' + pn + '">&#9660;</button></div></div>' +
        '<span class="page-thumb-title">' + (pi.label || '') + '</span>';

      (function(pageNum) {
        thumb.addEventListener('click', function(e) {
          if (e.target.tagName === 'BUTTON') return;
          e.stopPropagation();
          try {
            adminState.getState().selectedPage = pageNum;
            adminState.saveToStorage();
            updateAll();
          } catch(err) {
            console.error('Nav click error:', err);
          }
        });
      })(pn);

      (function(pageNum, currentLabel) {
        var titleEl = thumb.querySelector('.page-thumb-title');
        if (titleEl) {
          titleEl.addEventListener('click', function(e) {
            e.stopPropagation();
            var newName = prompt('Rinomina pagina ' + pageNum + ':', currentLabel);
            if (newName !== null) {
              var val = newName.trim();
              adminState.updatePageLabel(pageNum, val);
              updateAll();
            }
          });
        }
      })(pn, pi.label || '');

      list.appendChild(thumb);
    }

    // Bind up/down buttons
    var ups = list.querySelectorAll('.page-thumb-up');
    for (var ui = 0; ui < ups.length; ui++) {
      ups[ui].addEventListener('click', function(e) {
        e.stopPropagation();
        var p = parseInt(this.getAttribute('data-page'), 10);
        adminState.movePageUp(p);
        updateAll();
      });
    }
    var dns = list.querySelectorAll('.page-thumb-down');
    for (var di = 0; di < dns.length; di++) {
      dns[di].addEventListener('click', function(e) {
        e.stopPropagation();
        var p = parseInt(this.getAttribute('data-page'), 10);
        adminState.movePageDown(p);
        updateAll();
      });
    }
  }

  function bindTypography() {
    var state = adminState.getState();
    (function() {
      var el = document.getElementById('ctrlH1');
      var vl = document.getElementById('valH1');
      if (el) { el.value = state.typography.h1; if (vl) vl.textContent = state.typography.h1 + 'pt'; }
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateTypography('h1', v); if (vl) vl.textContent = v + 'pt'; debouncePreview(); });
    })();
    (function() {
      var el = document.getElementById('ctrlH2');
      var vl = document.getElementById('valH2');
      if (el) { el.value = state.typography.h2; if (vl) vl.textContent = state.typography.h2 + 'pt'; }
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateTypography('h2', v); if (vl) vl.textContent = v + 'pt'; debouncePreview(); });
    })();
    (function() {
      var el = document.getElementById('ctrlH3');
      var vl = document.getElementById('valH3');
      if (el) { el.value = state.typography.h3; if (vl) vl.textContent = state.typography.h3 + 'pt'; }
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateTypography('h3', v); if (vl) vl.textContent = v + 'pt'; debouncePreview(); });
    })();
    (function() {
      var el = document.getElementById('ctrlBody');
      var vl = document.getElementById('valBody');
      if (el) { el.value = state.typography.body; if (vl) vl.textContent = state.typography.body + 'pt'; }
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateTypography('body', v); if (vl) vl.textContent = v + 'pt'; debouncePreview(); });
    })();
    (function() {
      var el = document.getElementById('ctrlCaption');
      var vl = document.getElementById('valCaption');
      if (el) { el.value = state.typography.caption; if (vl) vl.textContent = state.typography.caption + 'pt'; }
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateTypography('caption', v); if (vl) vl.textContent = v + 'pt'; debouncePreview(); });
    })();
  }

  function bindPalette() {
    var keys = ['Bg', 'H1', 'H2', 'H3', 'Body', 'Caption'];
    var stateKeys = ['bg', 'h1Color', 'h2Color', 'h3Color', 'bodyColor', 'captionColor'];

    keys.forEach(function(k, idx) {
      var ci = document.getElementById('col' + k);
      var hi = document.getElementById('hex' + k);
      var swatch = ci && ci.parentElement ? ci.parentElement.querySelector('.swatch') : null;
      if (!ci || !hi) return;

      var sk = stateKeys[idx];
      var sv = adminState.getState().palette[sk];
      if (sv) { ci.value = sv; hi.value = sv; if (swatch) swatch.style.background = sv; }

      function fromColor(e) {
        var v = e.target.value;
        hi.value = v;
        if (swatch) swatch.style.background = v;
        adminState.updatePalette(sk, v);
        debouncePreview();
      }
      function fromHex(e) {
        var v = e.target.value.trim();
        if (/^#[0-9a-fA-F]{3,6}$/.test(v)) {
          if (v.length === 4) v = '#' + v[1]+v[1] + v[2]+v[2] + v[3]+v[3];
          ci.value = v;
          if (swatch) swatch.style.background = v;
          adminState.updatePalette(sk, v);
          debouncePreview();
        }
      }
      ci.addEventListener('input', fromColor);
      hi.addEventListener('change', fromHex);
    });

    renderExtraColors();
    bindExtraColorAdd();
  }

  function renderExtraColors() {
    var container = document.getElementById('extraColorsContainer');
    if (!container) return;
    container.innerHTML = '';
    var extras = adminState.getState().palette.extra || [];
    for (var ei = 0; ei < extras.length; ei++) {
      var color = extras[ei];
      var idx = ei;
      var html = '<div class="field"><label>C' + (idx + 1) + '</label><div class="color-picker-row">';
      html += '<input type="color" id="ctrlExtra' + idx + '" value="' + (color || '#888') + '">';
      html += '<input class="hex-input" id="hexExtra' + idx + '" value="' + (color || '#888') + '">';
      html += '<span class="swatch" style="background:' + (color || '#888') + ';"></span>';
      html += '<button class="admin-btn small danger" id="delExtra' + idx + '" style="padding:2px 6px;margin-left:4px;">\u2715</button>';
      html += '</div></div>';
      container.innerHTML += html;
    }

    for (var bi = 0; bi < extras.length; bi++) {
      (function(idx) {
        var ci = document.getElementById('ctrlExtra' + idx);
        var hi = document.getElementById('hexExtra' + idx);
        var sw = ci && ci.parentElement ? ci.parentElement.querySelector('.swatch') : null;
        var del = document.getElementById('delExtra' + idx);
        if (!ci || !hi) return;
        ci.addEventListener('input', function() {
          hi.value = ci.value;
          if (sw) sw.style.background = ci.value;
          adminState.updatePaletteExtra(idx, ci.value);
          debouncePreview();
        });
        hi.addEventListener('change', function() {
          var v = hi.value.trim();
          if (/^#[0-9a-fA-F]{3,6}$/.test(v)) {
            if (v.length === 4) v = '#' + v[1]+v[1] + v[2]+v[2] + v[3]+v[3];
            ci.value = v;
            if (sw) sw.style.background = v;
            adminState.updatePaletteExtra(idx, v);
            debouncePreview();
          }
        });
        if (del) {
          del.addEventListener('click', function(e) {
            e.stopPropagation();
            adminState.removePaletteColor(idx);
            renderExtraColors();
            updateAll();
          });
        }
      })(bi);
    }
  }

  function bindExtraColorAdd() {
    var btn = document.getElementById('btnAddExtraColor');
    if (!btn) return;
    btn.addEventListener('click', function() {
      adminState.addPaletteColor();
      renderExtraColors();
      updateAll();
    });
  }

  function bindLayout() {
    var layoutFields = [
      { id: 'ctrlPadTop', key: 'padTop', suf: 'mm', prec: 0 },
      { id: 'ctrlPadRight', key: 'padRight', suf: 'mm', prec: 0 },
      { id: 'ctrlPadBottom', key: 'padBottom', suf: 'mm', prec: 0 },
      { id: 'ctrlPadLeft', key: 'padLeft', suf: 'mm', prec: 0 },
      { id: 'ctrlBlockGap', key: 'blockGap', suf: 'mm', prec: 0 },
      { id: 'ctrlLineHeight', key: 'lineHeight', suf: '', prec: 1 }
    ];

    layoutFields.forEach(function(f) {
      var input = document.getElementById(f.id);
      if (!input) return;
      var valId = 'val' + f.id.charAt(4).toUpperCase() + f.id.slice(5);
      var valSpan = document.getElementById(valId);
      var sv = adminState.getState().layout[f.key];
      if (sv !== undefined) input.value = sv;
      if (valSpan) valSpan.textContent = Number(sv || 0).toFixed(f.prec) + f.suf;
    });

    // Bind individually to avoid closure trap
    (function() {
      var el = document.getElementById('ctrlPadTop');
      var vl = document.getElementById('valPadTop');
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateLayout('padTop', v); if (vl) vl.textContent = v + 'mm'; debouncePreview(); });
    })();
    (function() {
      var el = document.getElementById('ctrlPadRight');
      var vl = document.getElementById('valPadRight');
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateLayout('padRight', v); if (vl) vl.textContent = v + 'mm'; debouncePreview(); });
    })();
    (function() {
      var el = document.getElementById('ctrlPadBottom');
      var vl = document.getElementById('valPadBottom');
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateLayout('padBottom', v); if (vl) vl.textContent = v + 'mm'; debouncePreview(); });
    })();
    (function() {
      var el = document.getElementById('ctrlPadLeft');
      var vl = document.getElementById('valPadLeft');
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateLayout('padLeft', v); if (vl) vl.textContent = v + 'mm'; debouncePreview(); });
    })();
    (function() {
      var el = document.getElementById('ctrlBlockGap');
      var vl = document.getElementById('valBlockGap');
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateLayout('blockGap', v); if (vl) vl.textContent = v + 'mm'; debouncePreview(); });
    })();
    (function() {
      var el = document.getElementById('ctrlLineHeight');
      var vl = document.getElementById('valLineHeight');
      if (el) el.addEventListener('input', function() { var v = parseFloat(el.value); adminState.updateLayout('lineHeight', v); if (vl) vl.textContent = v.toFixed(1); debouncePreview(); });
    })();

    var bleed = document.getElementById('ctrlBleed');
    var crop = document.getElementById('ctrlCropMarks');
    var valBleed = document.getElementById('valBleed');

    if (bleed) {
      bleed.value = adminState.getState().print.bleed || 3;
      if (valBleed) valBleed.textContent = bleed.value;
      bleed.addEventListener('input', function() {
        adminState.getState().print.bleed = parseInt(bleed.value);
        if (valBleed) valBleed.textContent = bleed.value;
        adminState.saveToStorage();
        debouncePreview();
      });
    }
    if (crop) {
      crop.checked = adminState.getState().print.cropMarks || false;
      crop.addEventListener('change', function() {
        adminState.getState().print.cropMarks = crop.checked;
        adminState.saveToStorage();
      });
    }

    (function() {
      var el = document.getElementById('ctrlPageW');
      var vl = document.getElementById('valPageW');
      if (el) { el.value = adminState.getState().print.pageW || 148; if (vl) vl.textContent = el.value; }
      if (el) el.addEventListener('input', function() { var v = parseInt(el.value) || 148; adminState.getState().print.pageW = v; if (vl) vl.textContent = v; adminState.saveToStorage(); debouncePreview(); });
    })();
    (function() {
      var el = document.getElementById('ctrlPageH');
      var vl = document.getElementById('valPageH');
      if (el) { el.value = adminState.getState().print.pageH || 185; if (vl) vl.textContent = el.value; }
      if (el) el.addEventListener('input', function() { var v = parseInt(el.value) || 185; adminState.getState().print.pageH = v; if (vl) vl.textContent = v; adminState.saveToStorage(); debouncePreview(); });
    })();
  }

  function bindZoom() {
    var zoomSlider = document.getElementById('ctrlZoom');
    var valZoom = document.getElementById('valZoom');
    if (!zoomSlider) return;
    zoomSlider.addEventListener('input', function() {
      var pct = parseInt(zoomSlider.value);
      preview.setZoom(pct / 100);
      if (valZoom) valZoom.textContent = pct + '%';
      renderPreview();
    });
  }

  function bindWebGL() {
    var rangeInputs = ['webglPerRow','webglMarginX','webglMarginY','webglGapX','webglGapY','webglBigTileProb'];
    rangeInputs.forEach(function(id) {
      var el = document.getElementById(id);
      var valEl = document.getElementById('val' + id.charAt(0).toUpperCase() + id.slice(1));
      if (!el) return;
      el.addEventListener('input', function() {
        if (valEl) valEl.textContent = el.value;
        liveWebglPreview();
      });
    });

    var liveTimer = null;
    function liveWebglPreview() {
      clearTimeout(liveTimer);
      liveTimer = setTimeout(function() {
        webgl.generateLive(webgl.getConfig());
      }, 80);
    }

    var pal = document.getElementById('webglPaletteSwatches');
    if (pal) pal.addEventListener('click', liveWebglPreview);
    var bt = document.getElementById('webglBigTiles');
    if (bt) bt.addEventListener('change', liveWebglPreview);
    var btm = document.getElementById('webglBigTileMode');
    if (btm) btm.addEventListener('change', liveWebglPreview);
    var up = document.getElementById('webglUsePairs');
    if (up) up.addEventListener('change', liveWebglPreview);

    webgl.isApiAvailable().then(function(ok) {
      var badge = document.getElementById('webglStatus');
      if (badge) {
        badge.className = 'status-badge ' + (ok ? 'online' : 'offline');
        badge.innerHTML = ok ? '&#x2705; API Online' : '&#x26A0;&#xFE0F; Offline (canvas fallback)';
      }
    });

    document.getElementById('btnWebglGenerate').addEventListener('click', function() {
      var cfg = webgl.getConfig();
      var svgStr = webgl.generate(cfg);
      if (svgStr) {
        var bgId = 'bg_' + Date.now() + '_' + (++bgCounter);
        adminState.addBackground(bgId, svgStr, cfg);
        renderBackgroundGrid();
        showToast('Sfondo generato e salvato', 'success');
      }
    });

    document.getElementById('btnWebglApply').addEventListener('click', function() {
      var page = adminState.getState().selectedPage;
      var bgs = adminState.getState().backgrounds;
      var ids = Object.keys(bgs);
      if (ids.length === 0) {
        showToast('Genera prima uno sfondo', 'error');
        return;
      }
      adminState.assignBackgroundToPage(page, ids[ids.length - 1]);
      debouncePreview();
      showToast('Sfondo applicato a pagina ' + page, 'success');
    });
  }

  function renderBackgroundGrid() {
    var grid = document.getElementById('webglBgGrid');
    if (!grid) return;
    var bgs = adminState.getState().backgrounds;
    var ids = Object.keys(bgs);
    grid.innerHTML = '';
    if (ids.length === 0) {
      grid.innerHTML = '<div style="font-size:10px;color:var(--color-text-muted);text-align:center;padding:12px;">No backgrounds yet</div>';
      return;
    }
    ids.slice().reverse().forEach(function(id) {
      var bg = bgs[id];
      var thumb = document.createElement('div');
      thumb.className = 'bg-thumb';
      thumb.style.cssText = 'aspect-ratio:4/5;border-radius:4px;overflow:hidden;border:1px solid var(--admin-border);cursor:pointer;position:relative;';
      thumb.innerHTML = bg.svg + '<button class="bg-del" data-id="' + id + '">\u2715</button>';
      thumb.querySelector('.bg-del').addEventListener('click', function(e) {
        e.stopPropagation();
        adminState.removeBackground(id);
        renderBackgroundGrid();
        debouncePreview();
      });
      thumb.addEventListener('click', function() {
        var page = adminState.getState().selectedPage;
        adminState.assignBackgroundToPage(page, id);
        adminState.getState().selectedPage = page;
        adminState.saveToStorage();
        showToast('Assigned to page ' + page, 'success');
        updateAll();
      });
      grid.appendChild(thumb);
    });
  }

  function renderPageControls() {
    var container = document.getElementById('pageControls');
    var header = document.getElementById('panelPageHeader');
    if (!container) return;

    var state = adminState.getState();
    var page = state.selectedPage;
    var config = adminState.getPageConfig(page);
    var pageInfo = state.pages[String(page)] || {};
    var bgId = pageInfo.backgroundId;
    var bgs = state.backgrounds;
    var overrides = pageInfo.overrides || {};
    var selBlock = state.selectedBlock;
    var blocks = pageInfo.blocks || [];
    var grid = pageInfo.grid || { rows: [{ id: 'r1', cols: 1, gap: 4 }], rowGap: 4 };

    if (header) header.textContent = 'PAGINA ' + page + ' \u2014 ' + (pageInfo.label || config.type);

    var html = '';
    var paletteColors = adminState.getPaletteColors();
    var paletteKeys = ['bg', 'h1Color', 'h2Color', 'h3Color', 'bodyColor', 'captionColor'];

    // --- GRIGLIA section ---
    html += '<details class="pane-section" open><summary class="pane-section-title">Griglia</summary>';

    // Row Gap
    html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">';
    html += '<div style="flex:1;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Row Gap <span id="valRowGap">' + (grid.rowGap || 4) + '</span>mm</label><input type="range" id="rowGap" min="0" max="20" step="1" value="' + (grid.rowGap || 4) + '" style="width:100%;"></div>';
    html += '</div>';

    // Per-row controls
    var rows = grid.rows || [];
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      html += '<div style="border:1px solid var(--admin-border);border-radius:6px;padding:6px;margin-bottom:6px;">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">';
      html += '<span style="font-size:10px;font-weight:700;color:var(--admin-accent);">Riga ' + (ri + 1) + '</span>';
      html += '<button class="admin-btn small danger" id="delRow_' + row.id + '" style="padding:2px 6px;font-size:8px;margin:0;">\u2715</button>';
      html += '</div>';
      html += '<div style="display:flex;gap:6px;align-items:center;">';
      html += '<div style="flex:1;min-width:40px;"><label style="font-size:9px;color:var(--admin-text-muted);display:block;">Col</label><div style="display:flex;align-items:center;gap:2px;"><button class="admin-btn small" id="rowColsMinus_' + row.id + '" style="width:20px;padding:1px;font-size:9px;">-</button><span id="valRowCols_' + row.id + '" style="font-size:12px;font-weight:700;color:var(--admin-accent);min-width:16px;text-align:center;">' + (row.cols || 1) + '</span><button class="admin-btn small" id="rowColsPlus_' + row.id + '" style="width:20px;padding:1px;font-size:9px;">+</button></div></div>';
      html += '<div style="flex:2;min-width:60px;"><label style="font-size:9px;color:var(--admin-text-muted);display:block;">Gap <span id="valRowGap_' + row.id + '">' + (row.gap || 4) + '</span>mm</label><input type="range" id="rowGapSlider_' + row.id + '" min="0" max="20" step="1" value="' + (row.gap || 4) + '" style="width:100%;"></div>';
      html += '</div>';
      html += '<div style="display:flex;gap:4px;margin-top:4px;">';
      html += '<button class="admin-btn small gold row-add-text" data-row="' + (ri + 1) + '" id="rowAddText_' + row.id + '" style="flex:1;font-size:9px;padding:3px;">+ Testo</button>';
      html += '<button class="admin-btn small row-add-image" data-row="' + (ri + 1) + '" id="rowAddImage_' + row.id + '" style="flex:1;font-size:9px;padding:3px;">+ Immagine</button>';
      html += '</div></div>';
    }

    html += '<button class="admin-btn small" id="btnAddRow" style="font-size:10px;">+ Aggiungi riga</button>';
    html += '</details>';

    // --- BLOCCO section or Add button ---
    if (selBlock && selBlock.page === page) {
      var currentBlock = null;
      for (var bi = 0; bi < blocks.length; bi++) {
        if (blocks[bi].id === selBlock.blockId) { currentBlock = blocks[bi]; break; }
      }

      if (currentBlock) {
        var s = currentBlock.style || {};
        var rowIdx = currentBlock.gridRow || 1;
        html += '<details class="pane-section" open><summary class="pane-section-title">Blocco #' + currentBlock.id + ' \u2014 Riga ' + rowIdx + '</summary>';

        // Position
        html += '<div style="margin-bottom:8px;">';
        html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Altezza</label><div class="toggle-wrapper" style="margin:0;flex:1;"><label style="font-size:9px;margin:0;">Auto</label><label class="toggle"><input type="checkbox" id="blkFixedHeight"' + (s.fixedHeight ? ' checked' : '') + '><span class="slider-switch"></span></label><label style="font-size:9px;margin:0;">%</label></div></div>';
        html += '<div class="field"><label>Larghezza <span class="val" id="valBlkWidthPct">' + (currentBlock.widthPct || 100) + '</span>%</label><input type="range" id="blkWidthPct" min="10" max="100" step="5" value="' + (currentBlock.widthPct || 100) + '"></div>';
        html += '</div>';

        // Style
        html += '<div style="border-top:1px solid var(--admin-border);padding-top:8px;margin-bottom:8px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--admin-text-dim);margin-bottom:6px;">Livello Tipografico</div>';
        var levels = ['h1', 'h2', 'h3', 'body', 'caption'];
        var levelLabels = ['H1', 'H2', 'H3', 'Body', 'Cap'];
        html += '<div style="display:flex;gap:4px;margin-bottom:10px;">';
        for (var li = 0; li < levels.length; li++) {
          var lv = levels[li];
          var isLvlActive = currentBlock.level === lv;
          html += '<button class="admin-btn small' + (isLvlActive ? ' primary' : '') + '" id="blkLevel_' + lv + '" style="flex:1;padding:4px 2px;font-size:8px;">' + levelLabels[li] + '</button>';
        }
        html += '</div></div>';

        // Move
        html += '<div style="border-top:1px solid var(--admin-border);padding-top:8px;margin-bottom:8px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--admin-text-dim);margin-bottom:6px;">Sposta</div>';
        html += '<div style="display:flex;gap:4px;margin-bottom:4px;">';
        html += '<button class="admin-btn small" id="blkMoveUp" style="flex:1;font-size:10px;">&#9650; Righe</button>';
        html += '<button class="admin-btn small" id="blkMoveDown" style="flex:1;font-size:10px;">&#9660; Righe</button>';
        html += '</div><div style="display:flex;gap:4px;">';
        html += '<button class="admin-btn small" id="blkMoveLeft" style="flex:1;font-size:10px;">&#9664; Colonne</button>';
        html += '<button class="admin-btn small" id="blkMoveRight" style="flex:1;font-size:10px;">&#9654; Colonne</button>';
        html += '</div></div>';

        // Style
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
        html += '<div style="flex:1;min-width:70px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Font</label><select class="admin-select" id="blkFont" style="padding:4px 6px;font-size:11px;"><option value="Tuaf"' + (s.font === 'Tuaf' ? ' selected' : '') + '>Tuaf</option><option value="ABC Camera"' + (s.font === 'ABC Camera' ? ' selected' : '') + '>ABC Camera</option></select></div>';
        html += '<div style="flex:1;min-width:50px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Size</label><input type="number" class="admin-textarea" id="blkSize" value="' + (s.size || 12) + '" min="4" max="120" style="padding:4px 6px;font-size:11px;"></div>';
        html += '<div style="flex:1;min-width:60px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Weight</label><select class="admin-select" id="blkWeight" style="padding:4px 6px;font-size:11px;"><option value="normal"' + (s.weight === 'normal' ? ' selected' : '') + '>Normal</option><option value="bold"' + (s.weight === 'bold' ? ' selected' : '') + '>Bold</option></select></div>';
        html += '<div style="flex:1;min-width:80px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Colore</label><div class="color-swatch-grid" id="blkColorSwatches">';
        for (var ci = 0; ci < paletteKeys.length; ci++) {
          var isActiveSwatch = s.colorKey === paletteKeys[ci];
          html += '<div class="color-swatch' + (isActiveSwatch ? ' active' : '') + '" data-key="' + paletteKeys[ci] + '" style="background:' + paletteColors[ci] + ';"></div>';
        }
        var extras = adminState.getState().palette.extra || [];
        for (var ei = 0; ei < extras.length; ei++) {
          var extraKey = 'extra' + ei;
          var isActiveExtra = s.colorKey === extraKey;
          html += '<div class="color-swatch' + (isActiveExtra ? ' active' : '') + '" data-key="' + extraKey + '" style="background:' + extras[ei] + ';"></div>';
        }
        html += '</div></div>';
        html += '</div>';
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;flex-direction:column;margin-top:6px;">';
        var valigns = ['top', 'center', 'bottom', 'stretch'];
        html += '<div style="flex:1;min-width:60px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Valign</label><div style="display:flex;gap:2px;">';
        for (var vai = 0; vai < valigns.length; vai++) {
          var va = valigns[vai];
          html += '<button class="admin-btn small' + ((s.valign || 'center') === va ? ' primary' : '') + '" id="blkValign' + va.charAt(0).toUpperCase() + va.slice(1) + '" style="flex:1;padding:4px 2px;font-size:8px;">' + va + '</button>';
        }
        html += '</div></div>';
        var aligns = ['left', 'center', 'right'];
        html += '<div style="flex:1;min-width:60px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Halign</label><div style="display:flex;gap:2px;">';
        for (var ai = 0; ai < aligns.length; ai++) {
          var a = aligns[ai];
          html += '<button class="admin-btn small' + (s.align === a ? ' primary' : '') + '" id="blkAlign' + a.charAt(0).toUpperCase() + a.slice(1) + '" style="flex:1;padding:4px 2px;font-size:9px;">' + a.charAt(0).toUpperCase() + '</button>';
        }
        html += '</div></div>';
        html += '<div style="flex:1;min-width:70px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Transform</label><select class="admin-select" id="blkTransform" style="padding:4px 6px;font-size:11px;">';
        var transforms = ['none', 'uppercase', 'lowercase', 'capitalize'];
        for (var ti = 0; ti < transforms.length; ti++) {
          var tr = transforms[ti];
          html += '<option value="' + tr + '"' + (s.transform === tr ? ' selected' : '') + '>' + tr.charAt(0).toUpperCase() + tr.slice(1) + '</option>';
        }
        html += '</select></div>';
        html += '<div style="flex:1;min-width:50px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">L.H</label><input type="number" class="admin-textarea" id="blkLineH" value="' + (s.lineH || 1.4) + '" min="0.5" max="3" step="0.1" style="padding:4px 6px;font-size:11px;"></div>';
        html += '</div></div>';

        // Content
        html += '<div style="border-top:1px solid var(--admin-border);padding-top:8px;margin-bottom:8px;">';
        html += '<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--admin-text-dim);margin-bottom:6px;">Contenuto</div>';
        if (currentBlock.type === 'image') {
          html += '<label style="font-size:10px;color:var(--admin-text-muted);display:block;">URL Immagine</label>';
          html += '<input class="admin-textarea" id="blkImageUrl" value="' + esc(currentBlock.imageUrl || '') + '" style="width:100%;padding:6px;font-size:11px;margin-bottom:6px;">';
          html += '<div style="font-size:9px;color:var(--admin-text-muted);margin-bottom:8px;">URL esterna tipo https://esempio.com/foto.jpg</div>';
          html += '<label style="font-size:10px;color:var(--admin-text-muted);display:block;">Oppure carica da file</label>';
          html += '<input type="file" id="blkImageFile" accept="image/*" style="width:100%;font-size:10px;padding:4px;margin-bottom:8px;">';
        } else {
          html += '<textarea class="admin-textarea" id="blkContent" rows="4" style="resize:vertical;">' + esc(currentBlock.content || '') + '</textarea>';
        }
        html += '</div>';

        html += '</div>';

        // Box Highlights & Spacing Override (Sfondo e Spaziatura Box)
        html += '<details class="pane-section"><summary class="pane-section-title">Evidenziazione Box</summary>';
        
        // Background color swatches
        html += '<div style="margin-bottom:8px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;margin-bottom:4px;">Colore Sfondo Box</label><div class="color-swatch-grid" id="blkBgColorSwatches">';
        var isTransparentBg = !s.bgColorKey;
        html += '<div class="color-swatch' + (isTransparentBg ? ' active' : '') + '" data-key="" style="background:transparent;border:1px dashed var(--admin-text-muted);" title="Nessuno"></div>';
        for (var ci = 0; ci < paletteKeys.length; ci++) {
          var isActiveBgSwatch = s.bgColorKey === paletteKeys[ci];
          html += '<div class="color-swatch' + (isActiveBgSwatch ? ' active' : '') + '" data-key="' + paletteKeys[ci] + '" style="background:' + paletteColors[ci] + ';"></div>';
        }
        var extras = adminState.getState().palette.extra || [];
        for (var ei = 0; ei < extras.length; ei++) {
          var extraKey = 'extra' + ei;
          var isActiveBgExtra = s.bgColorKey === extraKey;
          html += '<div class="color-swatch' + (isActiveBgExtra ? ' active' : '') + '" data-key="' + extraKey + '" style="background:' + extras[ei] + ';"></div>';
        }
        html += '</div></div>';

        // Padding Verticale slider
        var padV = s.paddingV !== undefined ? s.paddingV : (s.padding || 0);
        html += '<div style="margin-bottom:8px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Padding Box Vert. <span id="valBlkPaddingV">' + padV + '</span>mm</label><input type="range" id="blkPaddingV" min="0" max="24" step="1" value="' + padV + '" style="width:100%;"></div>';

        // Padding Orizzontale slider
        var padH = s.paddingH !== undefined ? s.paddingH : (s.padding || 0);
        html += '<div style="margin-bottom:8px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Padding Box Oriz. <span id="valBlkPaddingH">' + padH + '</span>mm</label><input type="range" id="blkPaddingH" min="0" max="24" step="1" value="' + padH + '" style="width:100%;"></div>';

        // Border radius slider
        html += '<div style="margin-bottom:8px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;">Arrotondamento Angoli <span id="valBlkRadius">' + (s.borderRadius || 0) + '</span>mm</label><input type="range" id="blkRadius" min="0" max="24" step="1" value="' + (s.borderRadius || 0) + '" style="width:100%;"></div>';

        // Hug width toggle
        html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;"><label style="font-size:10px;color:var(--admin-text-muted);display:block;flex:1;">Adatta larghezza al testo (Hug content)</label><div class="toggle-wrapper" style="margin:0;"><label class="toggle"><input type="checkbox" id="blkHugWidth"' + (s.hugWidth ? ' checked' : '') + '><span class="slider-switch"></span></label></div></div>';

        html += '</details>';

        // Actions
        html += '<div style="display:flex;gap:4px;">';
        html += '<button class="admin-btn danger small" id="btnDeleteBlock" style="flex:1;">Elimina</button>';
        html += '<button class="admin-btn small" id="btnDuplicateBlock" style="flex:1;">Duplica</button>';
        html += '</div>';

        html += '</details>';
      }
    }

    // --- SFONDO section ---
    html += '<details class="pane-section" open><summary class="pane-section-title">Sfondo</summary>';
    if (bgId && bgs[bgId]) {
      html += '<div style="overflow:hidden;width:100%;height:60px;border-radius:6px;margin-bottom:6px;">' + bgs[bgId].svg + '</div>';
      html += '<button class="admin-btn small danger" id="btnRemoveBg">Rimuovi sfondo</button>';
    } else if (pageInfo.bgColorOverride) {
      html += '<div style="width:100%;height:32px;border-radius:6px;margin-bottom:6px;background:' + pageInfo.bgColorOverride + ';border:1px solid var(--admin-border);"></div>';
      html += '<button class="admin-btn small danger" id="btnRemoveBg">Rimuovi colore</button>';
    } else {
      html += '<div style="font-size:10px;color:var(--color-text-muted);padding:4px 0;">Nessuno sfondo. Genera nella colonna SFONDO o scegli un colore:</div>';
      html += '<div class="color-swatch-grid" id="bgColorSwatches" style="margin-top:4px;">';
      for (var cci = 0; cci < paletteColors.length; cci++) {
        html += '<div class="color-swatch" data-color="' + paletteColors[cci] + '" data-idx="' + cci + '" style="background:' + paletteColors[cci] + ';"></div>';
      }
      html += '<div class="color-swatch" data-color="" data-idx="-1" style="background:transparent;border:1px dashed var(--admin-text-muted);" title="Nessuno"></div>';
      html += '</div>';
    }
    html += '</details>';

    // --- Override Tipografia ---
    html += '<details class="pane-section"><summary class="pane-section-title">Override Tipografia</summary>';
    html += makeOverrideField('H1', 'pgH1', 'typography', 'h1', config.typography.h1, 12, 72, 1, 'pt');
    html += makeOverrideField('H2', 'pgH2', 'typography', 'h2', config.typography.h2, 10, 48, 1, 'pt');
    html += makeOverrideField('H3', 'pgH3', 'typography', 'h3', config.typography.h3, 8, 32, 1, 'pt');
    html += makeOverrideField('Body', 'pgBody', 'typography', 'body', config.typography.body, 6, 24, 1, 'pt');
    html += makeOverrideField('Caption', 'pgCaption', 'typography', 'caption', config.typography.caption, 5, 18, 1, 'pt');
    html += '</details>';

    // --- Override Spaziatura ---
    html += '<details class="pane-section"><summary class="pane-section-title">Override Spaziatura</summary>';
    html += makeOverrideField('Pad Top', 'pgPadTopOvr', 'layout', 'padTop', config.layout.padTop, 5, 80, 1, 'mm');
    html += makeOverrideField('Pad Bottom', 'pgPadBottomOvr', 'layout', 'padBottom', config.layout.padBottom, 5, 80, 1, 'mm');
    html += makeOverrideField('Pad Left', 'pgPadLeftOvr', 'layout', 'padLeft', config.layout.padLeft, 5, 80, 1, 'mm');
    html += makeOverrideField('Pad Right', 'pgPadRightOvr', 'layout', 'padRight', config.layout.padRight, 5, 80, 1, 'mm');
    html += makeOverrideField('Block Gap', 'pgBlockGapOvr', 'layout', 'blockGap', config.layout.blockGap, 0, 20, 1, 'mm');
    html += makeOverrideField('Line Height', 'pgLineHeightOvr', 'layout', 'lineHeight', config.layout.lineHeight, 1.0, 2.5, 0.1, '');
    html += '</details>';

    // --- Contenuti ---
    html += '<details class="pane-section" open><summary class="pane-section-title">Contenuti</summary>';

    if (config.type === 'cover') {
      html += '<div class="field"><label>Title</label><textarea class="admin-textarea" id="pgTitle" rows="2">' + esc(state.drinksData.title) + '</textarea></div>';
      html += '<div class="field"><label>Subtitle</label><input class="admin-textarea" id="pgSubtitle" value="' + esc(state.drinksData.subtitle) + '"></div>';
    } else if (config.type === 'prefazione') {
      html += '<div class="field"><label>Prefazione</label><textarea class="admin-textarea" id="pgPrefazione" rows="10">' + esc((state.drinksData.prefazione || []).join('\n---\n')) + '</textarea></div>';
    } else if (config.type === 'drink-left') {
      var dn_val = pageInfo.drinkNumber || 1;
      var d_val = adminState.getDrinkByNumber(dn_val);
      if (d_val) {
        html += '<div class="field"><label>Nome</label><input class="admin-textarea" id="pgDrinkName" value="' + esc(d_val.name) + '"></div>';
        html += '<div class="field"><label>Profilo</label><input class="admin-textarea" id="pgDrinkProfile" value="' + esc(d_val.profile || '') + '"></div>';
        html += '<div class="field"><label>Ingredienti</label><textarea class="admin-textarea" id="pgDrinkIng" rows="6">' + esc((d_val.ingredients || []).join('\n')) + '</textarea></div>';
        if (d_val.taste) {
          html += '<div style="border-top:1px solid var(--admin-border);padding-top:6px;margin-top:6px;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--admin-text-dim);margin-bottom:4px;">Assi Grafico</div>';
          html += '<div class="field"><label>S (Dolce) <span id="valPgSweet">' + d_val.taste.sweet + '</span>/5</label><input type="range" id="pgSweet" min="0" max="5" step="1" value="' + (d_val.taste.sweet||0) + '"></div>';
          html += '<div class="field"><label>A (Acido) <span id="valPgAcid">' + d_val.taste.acid + '</span>/5</label><input type="range" id="pgAcid" min="0" max="5" step="1" value="' + (d_val.taste.acid||0) + '"></div>';
          html += '<div class="field"><label>B (Amaro) <span id="valPgBitter">' + d_val.taste.bitter + '</span>/5</label><input type="range" id="pgBitter" min="0" max="5" step="1" value="' + (d_val.taste.bitter||0) + '"></div>';
          html += '<div class="field"><label>F (Lab) <span id="valPgLab">' + d_val.taste.labFactor + '</span>/5</label><input type="range" id="pgLab" min="0" max="5" step="1" value="' + (d_val.taste.labFactor||0) + '"></div>';
          html += '</div>';
        }
      }
    } else if (config.type === 'list') {
      html += '<div style="font-size:10px;">Modifica i contenuti selezionando i blocchi nella pagina.</div>';
    } else if (config.type === 'vermouth') {
      html += '<div style="font-size:10px;">Modifica i contenuti selezionando i blocchi nella pagina.</div>';
    } else if (config.type === 'colophon') {
      html += '<div style="font-size:10px;">Colophon.</div>';
    } else if (config.type === 'back-cover') {
      html += '<div style="font-size:10px;">Back cover.</div>';
    } else if (config.type === 'drink-right') {
      html += '<div style="font-size:10px;">Pagina immagine.</div>';
    } else {
      html += '<div style="font-size:10px;">Seleziona un blocco per modificarlo.</div>';
    }

    html += '</details>';
    container.innerHTML = html;

    // Bind row gap slider
    bindRowGapSlider();

    // Bind per-row controls
    for (var rj = 0; rj < rows.length; rj++) {
      bindRowControls(rows[rj].id);
    }

    // Bind add row
    var btnAddRow = document.getElementById('btnAddRow');
    if (btnAddRow) {
      btnAddRow.addEventListener('click', function() {
        adminState.addRow(page);
        updateAll();
      });
    }

    // Bind block controls if block selected
    if (selBlock && selBlock.page === page && currentBlock) {
      bindBlockHeightToggle(currentBlock.id);
      bindBlockWidthPct(currentBlock.id);
      bindBlockInput('blkSize', currentBlock.id, 'style.size', 'number');
      bindBlockInput('blkLineH', currentBlock.id, 'style.lineH', 'float');
      bindBlockSelect('blkFont', currentBlock.id, 'style.font');
      bindBlockSelect('blkWeight', currentBlock.id, 'style.weight');
      bindBlockSelect('blkTransform', currentBlock.id, 'style.transform');
      bindBlockColorSwatches(currentBlock.id, s.colorKey || 'bodyColor');
      bindBlockBgColorSwatches(currentBlock.id, s.bgColorKey || '');
      bindBlockSlider('blkPaddingV', 'valBlkPaddingV', currentBlock.id, 'style.paddingV');
      bindBlockSlider('blkPaddingH', 'valBlkPaddingH', currentBlock.id, 'style.paddingH');
      bindBlockSlider('blkRadius', 'valBlkRadius', currentBlock.id, 'style.borderRadius');
      bindBlockToggle('blkHugWidth', currentBlock.id, 'style.hugWidth');
      bindBlockValignButtons(currentBlock.id, s.valign || 'center');
      bindBlockAlignButtons(currentBlock.id, s.align || 'left');
      bindBlockTextarea('blkContent', currentBlock.id);

      if (currentBlock.type === 'image') {
        bindBlockImageUrl(currentBlock.id);
        bindBlockImageFile(currentBlock.id);
      }

      bindBlockLevelButtons(currentBlock.id, currentBlock.level);
      bindBlockMoveButtons(currentBlock.id);

      document.getElementById('btnDeleteBlock').addEventListener('click', function() {
        adminState.removeBlock(page, currentBlock.id);
        updateAll();
      });

      document.getElementById('btnDuplicateBlock').addEventListener('click', function() {
        var pNum = adminState.getState().selectedPage;
        var dup = adminState.duplicateBlock(pNum, currentBlock.id);
        if (dup) {
          adminState.selectBlock(pNum, dup.id);
        }
        updateAll();
      });
    }

    if (document.getElementById('btnAddBlock')) {
      document.getElementById('btnAddBlock').addEventListener('click', function() {
        adminState.addBlock(page, 'text');
        updateAll();
      });
    }

    if (document.getElementById('btnAddImage')) {
      document.getElementById('btnAddImage').addEventListener('click', function() {
        adminState.addBlock(page, 'image');
        updateAll();
      });
    }

    // Bind existing controls
    var btnRemove = document.getElementById('btnRemoveBg');
    if (btnRemove) btnRemove.addEventListener('click', function() {
      state.pages[String(page)].backgroundId = null;
      state.pages[String(page)].bgColorOverride = null;
      adminState.saveToStorage();
      updateAll();
    });

    // Bind bg color swatches
    var bgSwatches = document.querySelectorAll('#bgColorSwatches .color-swatch');
    for (var bsi = 0; bsi < bgSwatches.length; bsi++) {
      (function(sw) {
        sw.addEventListener('click', function() {
          var color = sw.getAttribute('data-color');
          if (color) {
            adminState.setPageBgColor(page, color);
          } else {
            adminState.setPageBgColor(page, null);
          }
          updateAll();
        });
      })(bgSwatches[bsi]);
    }

    bindPgOvr('pgH1', 'valPgH1', 'typography', 'h1');
    bindPgOvr('pgH2', 'valPgH2', 'typography', 'h2');
    bindPgOvr('pgH3', 'valPgH3', 'typography', 'h3');
    bindPgOvr('pgBody', 'valPgBody', 'typography', 'body');
    bindPgOvr('pgCaption', 'valPgCaption', 'typography', 'caption');
    bindPgOvr('pgPadTopOvr', 'valPgPadTopOvr', 'layout', 'padTop');
    bindPgOvr('pgPadBottomOvr', 'valPgPadBottomOvr', 'layout', 'padBottom');
    bindPgOvr('pgPadLeftOvr', 'valPgPadLeftOvr', 'layout', 'padLeft');
    bindPgOvr('pgPadRightOvr', 'valPgPadRightOvr', 'layout', 'padRight');
    bindPgOvr('pgBlockGapOvr', 'valPgBlockGapOvr', 'layout', 'blockGap');
    bindPgOvr('pgLineHeightOvr', 'valPgLineHeightOvr', 'layout', 'lineHeight');

    if (config.type === 'cover') {
      bindPgInput('pgTitle', function(v) { state.drinksData.title = v; });
      bindPgInput('pgSubtitle', function(v) { state.drinksData.subtitle = v; });
    } else if (config.type === 'prefazione') {
      bindPgInput('pgPrefazione', function(v) { state.drinksData.prefazione = v.split('\n---\n'); });
    } else if (config.type === 'drink-left') {
      var dn2 = pageInfo.drinkNumber || 1;
      var d2 = adminState.getDrinkByNumber(dn2);
      if (d2) {
        bindPgInput('pgDrinkName', function(v) { d2.name = v; });
        bindPgInput('pgDrinkProfile', function(v) { d2.profile = v; });
        bindPgInput('pgDrinkIng', function(v) { d2.ingredients = v.split('\n').filter(function(l) { return l.trim(); }); });
        bindPgInputAsFloat('pgSweet', 'valPgSweet', function(v) { d2.taste.sweet = v; });
        bindPgInputAsFloat('pgAcid', 'valPgAcid', function(v) { d2.taste.acid = v; });
        bindPgInputAsFloat('pgBitter', 'valPgBitter', function(v) { d2.taste.bitter = v; });
        bindPgInputAsFloat('pgLab', 'valPgLab', function(v) { d2.taste.labFactor = v; });
      }
    }
  }

  function bindBlockInput(id, blockId, field, type) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() {
      var page = adminState.getState().selectedPage;
      var v = type === 'number' ? parseInt(el.value) : (type === 'float' ? parseFloat(el.value) : el.value);
      adminState.updateBlock(page, blockId, field, v);
      if (field.indexOf('style.') === 0) adminState.updateBlock(page, blockId, 'level', null);
      debouncePreview();
    });
  }

  function bindBlockSelect(id, blockId, field) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function() {
      var page = adminState.getState().selectedPage;
      adminState.updateBlock(page, blockId, field, el.value);
      if (field.indexOf('style.') === 0) adminState.updateBlock(page, blockId, 'level', null);
      debouncePreview();
    });
  }

  function bindBlockAlignButtons(blockId, currentAlign) {
    var aligns = ['left','center','right'];
    for (var i = 0; i < aligns.length; i++) {
      var a = aligns[i];
      var btn = document.getElementById('blkAlign' + a.charAt(0).toUpperCase() + a.slice(1));
      if (!btn) continue;
      btn.addEventListener('click', function(align) {
        return function() {
          var page = adminState.getState().selectedPage;
          adminState.updateBlock(page, blockId, 'style.align', align);
          // Update button active states
          for (var j = 0; j < aligns.length; j++) {
            var b = document.getElementById('blkAlign' + aligns[j].charAt(0).toUpperCase() + aligns[j].slice(1));
            if (b) b.classList.remove('primary');
          }
          document.getElementById('blkAlign' + align.charAt(0).toUpperCase() + align.slice(1)).classList.add('primary');
          debouncePreview();
        };
      }(a));
    }
  }

  function bindBlockTextarea(id, blockId) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() {
      var page = adminState.getState().selectedPage;
      adminState.updateBlock(page, blockId, 'content', el.value);
      debouncePreview();
    });
  }

  function bindBlockImageUrl(blockId) {
    var el = document.getElementById('blkImageUrl');
    if (!el) return;
    el.addEventListener('input', function() {
      var page = adminState.getState().selectedPage;
      adminState.updateBlock(page, blockId, 'imageUrl', el.value);
      debouncePreview();
    });
  }

  function bindBlockImageFile(blockId) {
    var el = document.getElementById('blkImageFile');
    if (!el) return;
    el.addEventListener('change', function() {
      var file = el.files && el.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        var page = adminState.getState().selectedPage;
        adminState.updateBlock(page, blockId, 'imageUrl', e.target.result);
        var urlInput = document.getElementById('blkImageUrl');
        if (urlInput) urlInput.value = e.target.result;
        debouncePreview();
      };
      reader.readAsDataURL(file);
    });
  }

  function bindBlockLevelButtons(blockId, currentLevel) {
    var levels = ['h1', 'h2', 'h3', 'body', 'caption'];
    for (var i = 0; i < levels.length; i++) {
      var lv = levels[i];
      var btn = document.getElementById('blkLevel_' + lv);
      if (!btn) continue;
      btn.addEventListener('click', function(level) {
        return function() {
          var page = adminState.getState().selectedPage;
          adminState.applyBlockLevel(page, blockId, level);
          updateAll();
        };
      }(lv));
    }
  }

  function bindBlockMoveButtons(blockId) {
    var btnUp = document.getElementById('blkMoveUp');
    var btnDown = document.getElementById('blkMoveDown');
    var btnLeft = document.getElementById('blkMoveLeft');
    var btnRight = document.getElementById('blkMoveRight');
    var page = adminState.getState().selectedPage;
    if (btnUp) {
      btnUp.addEventListener('click', function() {
        adminState.moveBlock(page, blockId, 'up');
        updateAll();
      });
    }
    if (btnDown) {
      btnDown.addEventListener('click', function() {
        adminState.moveBlock(page, blockId, 'down');
        updateAll();
      });
    }
    if (btnLeft) {
      btnLeft.addEventListener('click', function() {
        adminState.moveBlock(page, blockId, 'left');
        updateAll();
      });
    }
    if (btnRight) {
      btnRight.addEventListener('click', function() {
        adminState.moveBlock(page, blockId, 'right');
        updateAll();
      });
    }
  }

  function makeOverrideField(label, id, section, key, globalVal, min, max, step, unit) {
    var valId = 'val' + id.charAt(0).toUpperCase() + id.slice(1);
    return '<div class="field"><label>' + label + ' <span class="val" id="' + valId + '">' + globalVal + '</span>' + unit + '</label><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + globalVal + '"></div>';
  }

  function bindPgOvr(id, valId, section, key) {
    var el = document.getElementById(id);
    var vl = document.getElementById(valId);
    if (!el) return;
    el.addEventListener('input', function() {
      var v = parseFloat(el.value);
      if (vl) vl.textContent = v;
      adminState.updatePageOverride(adminState.getState().selectedPage, section, key, v);
      debouncePreview();
    });
  }

  function bindPgInput(id, setter) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() {
      setter(el.value);
      adminState.saveToStorage();
      debouncePreview();
    });
  }

  function bindPgInputAsFloat(id, valId, setter) {
    var el = document.getElementById(id);
    var vl = document.getElementById(valId);
    if (!el) return;
    el.addEventListener('input', function() {
      var v = parseFloat(el.value);
      if (vl) vl.textContent = v;
      setter(v);
      adminState.saveToStorage();
      debouncePreview();
    });
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function initWebglSwatches() {
    var container = document.getElementById('webglPaletteSwatches');
    if (!container) return;
    var paletteKeys = ['bg', 'h1Color', 'h2Color', 'h3Color', 'bodyColor', 'captionColor'];
    var paletteColors = adminState.getPaletteColors();
    var paletteLabels = ['BG', 'H1', 'H2', 'H3', 'Body', 'Cap'];
    var activeIndices = [0, 1, 2, 3, 4, 5];
    var totalColors = paletteColors.length;
    for (var ei2 = 0; ei2 < totalColors; ei2++) {
      if (ei2 >= 6) activeIndices.push(ei2);
    }
    container.innerHTML = '';
    for (var i = 0; i < totalColors; i++) {
      var sw = document.createElement('div');
      sw.className = 'color-swatch active';
      sw.setAttribute('data-idx', String(i));
      sw.setAttribute('data-color', paletteColors[i]);
      sw.style.background = paletteColors[i];
      sw.title = 'C' + (i + 1) + ' (' + paletteColors[i] + ')';
      (function(idx, el) {
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          el.classList.toggle('active');
          var allSw = container.querySelectorAll('.color-swatch');
          var newIdxs = [];
          for (var j = 0; j < allSw.length; j++) {
            if (allSw[j].classList.contains('active')) {
              newIdxs.push(parseInt(allSw[j].getAttribute('data-idx'), 10));
            }
          }
          // Store on container for getConfig to read
          container.setAttribute('data-indices', JSON.stringify(newIdxs));
          // Trigger live preview
          if (window.AdminWebGL) {
            window.AdminWebGL.generateLive(window.AdminWebGL.getConfig());
          }
        });
      })(i, sw);
      container.appendChild(sw);
    }
    container.setAttribute('data-indices', JSON.stringify(activeIndices));
  }

  function bindExport() {
    document.getElementById('btnExportPDF').addEventListener('click', function() {
      var orderedIds = adminState.getOrderedPageIds();
      var state = adminState.getState();
      var prt = state.print || {};
      var pw = prt.pageW || 148;
      var ph = prt.pageH || 185;
      var b = prt.bleed || 3;
      var sw = pw * 2 + b * 2;
      var sh = ph + b * 2;
      var cm = Math.min(5, b);
      var n = orderedIds.length;
      var sheets = Math.ceil(n / 4);
      var total = sheets * 4; // must be multiple of 4 for saddle-stitch

      // Pad to multiple of 4 with blank pages
      var pageMap = orderedIds.slice();
      while (pageMap.length < total) {
        var emptyId = pageMap.length + 1;
        while (pageMap.indexOf(emptyId) >= 0) emptyId++;
        pageMap.push(emptyId);
      }

      // Saddle-stitch spreads: each sheet has 2 faces (front + back), each face has 2 pages
      // Rule: each pair sums to total + 1
      var spreads = [];
      for (var si = 0; si < sheets; si++) {
        var a = si * 2;
        var c = total - 1 - a;
        var f = a + 1;
        var e = total - 2 - a;
        spreads.push([pageMap[c], pageMap[a]]);
        spreads.push([pageMap[f], pageMap[e]]);
      }

      function crop(x, y) {
        return '<div style="position:absolute;pointer-events:none;z-index:99;top:' + (y - cm) + 'mm;left:' + x + 'mm;width:0.3mm;height:' + cm + 'mm;background:#000;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;"></div>' +
               '<div style="position:absolute;pointer-events:none;z-index:99;top:' + y + 'mm;left:' + (x - cm) + 'mm;width:' + cm + 'mm;height:0.3mm;background:#000;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;"></div>';
      }

      function pageBg(pageInfo, left) {
        var color = pageInfo.bgColorOverride || state.palette.bg || '#121420';
        var bgId = pageInfo.backgroundId;
        var bgs = state.backgrounds;
        var svg = (bgId && bgs[bgId] && bgs[bgId].svg) ? bgs[bgId].svg : '';
        var x = left ? 0 : pw + b;
        var s = 'position:absolute;top:0;left:' + x + 'mm;width:' + (pw + b) + 'mm;height:100%;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;';
        var h = '<div style="' + s + 'background-color:' + color + ';"></div>';
        if (svg) h += '<div style="' + s + 'overflow:hidden;">' + svg + '</div>';
        return h;
      }

      function isBlank(pn) {
        return !state.pages[String(pn)] || state.pages[String(pn)].type === 'blank' && (!state.pages[String(pn)].blocks || state.pages[String(pn)].blocks.length === 0);
      }

      function pageContent(pn) {
        if (isBlank(pn)) {
          return '<div style="width:100%;height:100%;background:' + (state.palette.bg || '#121420') + ';"></div>';
        }
        var html = preview.getPageHTML(pn, adminState);
        html = html.replace('width: ' + pw + 'mm;', 'width:100%;');
        html = html.replace('height: ' + ph + 'mm;', 'height:100%;');
        html = html.replace(/\boverflow:\s*hidden\b/gi, 'overflow:visible');
        return html;
      }

      function spineMarks() {
        var x = pw + b;
        return '<div style="position:absolute;top:' + (b / 2) + 'mm;left:' + x + 'mm;width:0.3mm;height:' + cm + 'mm;background:#000;z-index:99;pointer-events:none;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;"></div>' +
               '<div style="position:absolute;bottom:' + (b / 2) + 'mm;left:' + x + 'mm;width:0.3mm;height:' + cm + 'mm;background:#000;z-index:99;pointer-events:none;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;"></div>';
      }

      var css =
        '<style>' +
        '*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}' +
        '@media print{@page{size:' + sw + 'mm ' + sh + 'mm;margin:0;}}' +
        '.sheet{width:' + sw + 'mm;height:' + sh + 'mm;position:relative;page-break-after:always;overflow:hidden;}' +
        '.sheet:last-child{page-break-after:auto;}' +
        '</style>';

      var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>BP LAB 2026 — Imposizione a Sella</title>' + css + '</head><body>';

      for (var si = 0; si < spreads.length; si++) {
        var leftId = spreads[si][0];
        var rightId = spreads[si][1];
        var leftInfo = state.pages[String(leftId)] || {};
        var rightInfo = state.pages[String(rightId)] || {};
        var lx = b, rx = pw + b, y = b;

        html += '<div class="sheet">' +
          pageBg(leftInfo, true) + pageBg(rightInfo, false) +
          '<div style="position:absolute;top:' + y + 'mm;left:' + lx + 'mm;width:' + pw + 'mm;height:' + ph + 'mm;overflow:hidden;z-index:1;">' + pageContent(leftId) + '</div>' +
          '<div style="position:absolute;top:' + y + 'mm;left:' + rx + 'mm;width:' + pw + 'mm;height:' + ph + 'mm;overflow:hidden;z-index:1;">' + pageContent(rightId) + '</div>' +
          crop(lx, y) + crop(lx + pw, y) + crop(lx, y + ph) + crop(lx + pw, y + ph) +
          crop(rx, y) + crop(rx + pw, y) + crop(rx, y + ph) + crop(rx + pw, y + ph) +
          spineMarks() +
          '</div>';
      }

      html += '<div style="font-size:8px;color:#999;text-align:center;padding:8px;">Imposizione a sella — ' + spreads.length + ' spread su ' + sheets + ' fogli — FOGRA39 CMYK — taglia su crocini</div></body></html>';

      var blob = new Blob([html], { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      var win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', function() { this.print(); }, { once: true });
      }
      showToast(spreads.length + ' spread su ' + sheets + ' fogli — ' + sw + '×' + sh + 'mm — FOGRA39 CMYK', 'success');
    });
    document.getElementById('btnExportPDFPages').addEventListener('click', function() {
      var orderedIds = adminState.getOrderedPageIds();
      var state = adminState.getState();
      var prt = state.print || {};
      var pw = prt.pageW || 148;
      var ph = prt.pageH || 185;
      var b = prt.bleed || 3;

      function isBlank(pn) {
        return !state.pages[String(pn)] || state.pages[String(pn)].type === 'blank' && (!state.pages[String(pn)].blocks || state.pages[String(pn)].blocks.length === 0);
      }

      function pageContent(pn) {
        if (isBlank(pn)) {
          return '<div style="width:100%;height:100%;background:' + (state.palette.bg || '#121420') + ';"></div>';
        }
        var html = preview.getPageHTML(pn, adminState);
        html = html.replace('width: ' + pw + 'mm;', 'width:100%;');
        html = html.replace('height: ' + ph + 'mm;', 'height:100%;');
        html = html.replace(/\boverflow:\s*hidden\b/gi, 'overflow:visible');
        return html;
      }

      function pageBg(pageInfo) {
        var color = pageInfo.bgColorOverride || state.palette.bg || '#121420';
        var bgId = pageInfo.backgroundId;
        var bgs = state.backgrounds;
        var svg = (bgId && bgs[bgId] && bgs[bgId].svg) ? bgs[bgId].svg : '';
        var s = 'position:absolute;top:0;left:0;width:100%;height:100%;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;';
        var h = '<div style="' + s + 'background-color:' + color + ';"></div>';
        if (svg) h += '<div style="' + s + 'overflow:hidden;">' + svg + '</div>';
        return h;
      }

      var sw = pw + b * 2;
      var sh = ph + b * 2;

      var css =
        '<style>' +
        '*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}' +
        '@media print{@page{size:' + sw + 'mm ' + sh + 'mm;margin:0;}}' +
        '.single-sheet{width:' + sw + 'mm;height:' + sh + 'mm;position:relative;page-break-after:always;overflow:hidden;}' +
        '.single-sheet:last-child{page-break-after:auto;}' +
        '</style>';

      var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>BP LAB 2026 — Pagine Singole</title>' + css + '</head><body>';

      for (var i = 0; i < orderedIds.length; i++) {
        var pid = orderedIds[i];
        var pageInfo = state.pages[String(pid)] || {};
        html += '<div class="single-sheet">' +
          pageBg(pageInfo) +
          '<div style="position:absolute;top:' + b + 'mm;left:' + b + 'mm;width:' + pw + 'mm;height:' + ph + 'mm;overflow:hidden;z-index:1;">' + pageContent(pid) + '</div>' +
          '</div>';
      }

      html += '<div style="font-size:8px;color:#999;text-align:center;padding:8px;">Pagine singole — ' + orderedIds.length + ' pagine — taglia su bordo</div></body></html>';

      var blob = new Blob([html], { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      var win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', function() { this.print(); }, { once: true });
      }
      showToast(orderedIds.length + ' pagine singole — ' + pw + '×' + ph + 'mm', 'success');
    });
    document.getElementById('btnExportHTML').addEventListener('click', function() {
      var orderedIds = adminState.getOrderedPageIds();
      var html = '';
      for (var i = 0; i < orderedIds.length; i++) {
        html += preview.getPageHTML(orderedIds[i], adminState);
      }

      var state = adminState.getState();
      var print = state.print || {};
      var pw = print.pageW || 148;
      var ph = print.pageH || 185;
      var bleed = print.bleed || 3;

      var full = '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>BP LAB 2026</title>' +
        '<style>' +
        '*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;}' +
        '@page{size:' + pw + 'mm ' + ph + 'mm;margin:0;bleed:' + bleed + 'mm;}' +
        '@media print{body{background:none;padding:0;display:block;}}' +
        'body{display:flex;flex-direction:column;align-items:center;padding:12px 0;background:#0b0d17;}' +
        '.preview-page{margin-bottom:8px;}}' +
        '<link rel="stylesheet" href="css/typography.css">' +
        '<link rel="stylesheet" href="css/screen.css">' +
        '<link rel="stylesheet" href="css/print.css">' +
        '</head><body class="print-body"><div class="menu-container print-menu">' + html + '</div></body></html>';

      download(full, 'menu-print.html', 'text/html');

      var stateExport = JSON.stringify({
        _version: state._version,
        pageOrder: orderedIds,
        typography: state.typography,
        palette: state.palette,
        layout: state.layout,
        print: state.print,
        pages: state.pages,
        backgrounds: state.backgrounds,
        drinksData: state.drinksData
      }, null, 2);
      download(stateExport, 'admin-save.json', 'application/json');

      showToast('HTML + state JSON scaricati. Sposta i file in app/ e esegui: ./generate.sh', 'success');
    });
    document.getElementById('btnExportJSON').addEventListener('click', function() {
      download(adminState.exportJSON(), 'drinks-export.json', 'application/json');
      showToast('JSON downloaded', 'success');
    });
    document.getElementById('btnResetDefault').addEventListener('click', function() {
      if (confirm('Reset all to defaults?')) {
        adminState.resetDefaults();
        setTimeout(function() { location.reload(); }, 300);
      }
    });
  }

  function download(content, name, mime) {
    var b = new Blob([content], { type: mime });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  function bindPreviewMode() {
    var btns = document.querySelectorAll('.preview-mode-btn');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        btns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        preview.setMode(btn.dataset.mode);
        renderPreview();
      });
    });
  }

  function bindRowGapSlider() {
    var slider = document.getElementById('rowGap');
    var valSpan = document.getElementById('valRowGap');
    if (!slider) return;
    slider.addEventListener('input', function() {
      var v = parseInt(slider.value);
      var page = adminState.getState().selectedPage;
      var pageInfo = adminState.getState().pages[String(page)];
      if (pageInfo && pageInfo.grid) {
        pageInfo.grid.rowGap = v;
        adminState.saveToStorage();
      }
      if (valSpan) valSpan.textContent = v;
      debouncePreview();
    });
  }

  function bindRowControls(rowId) {
    var minus = document.getElementById('rowColsMinus_' + rowId);
    var plus = document.getElementById('rowColsPlus_' + rowId);
    var valSpan = document.getElementById('valRowCols_' + rowId);
    var gapSlider = document.getElementById('rowGapSlider_' + rowId);
    var gapVal = document.getElementById('valRowGap_' + rowId);
    var delBtn = document.getElementById('delRow_' + rowId);
    var page = adminState.getState().selectedPage;

    if (minus && plus && valSpan) {
      minus.addEventListener('click', function() {
        var pageInfo = adminState.getState().pages[String(page)];
        if (!pageInfo || !pageInfo.grid) return;
        for (var i = 0; i < pageInfo.grid.rows.length; i++) {
          if (pageInfo.grid.rows[i].id === rowId) {
            var v = Math.max(1, (pageInfo.grid.rows[i].cols || 1) - 1);
            pageInfo.grid.rows[i].cols = v;
            adminState.saveToStorage();
            valSpan.textContent = v;
            break;
          }
        }
        debouncePreview();
      });
      plus.addEventListener('click', function() {
        var pageInfo = adminState.getState().pages[String(page)];
        if (!pageInfo || !pageInfo.grid) return;
        for (var i = 0; i < pageInfo.grid.rows.length; i++) {
          if (pageInfo.grid.rows[i].id === rowId) {
            var v = Math.min(12, (pageInfo.grid.rows[i].cols || 1) + 1);
            pageInfo.grid.rows[i].cols = v;
            adminState.saveToStorage();
            valSpan.textContent = v;
            break;
          }
        }
        debouncePreview();
      });
    }

    if (gapSlider && gapVal) {
      gapSlider.addEventListener('input', function() {
        var v = parseInt(gapSlider.value);
        var pageInfo = adminState.getState().pages[String(page)];
        if (!pageInfo || !pageInfo.grid) return;
        for (var i = 0; i < pageInfo.grid.rows.length; i++) {
          if (pageInfo.grid.rows[i].id === rowId) {
            pageInfo.grid.rows[i].gap = v;
            adminState.saveToStorage();
            gapVal.textContent = v;
            break;
          }
        }
        debouncePreview();
      });
    }

    if (delBtn) {
      delBtn.addEventListener('click', function() {
        adminState.removeRow(page, rowId);
        updateAll();
      });
    }

    var rowAddText = document.getElementById('rowAddText_' + rowId);
    var rowAddImage = document.getElementById('rowAddImage_' + rowId);
    if (rowAddText) {
      rowAddText.addEventListener('click', function(e) {
        e.stopPropagation();
        var rowNum = parseInt(this.getAttribute('data-row'), 10);
        var blk = adminState.addBlock(page, 'text', rowNum);
        if (blk) {
          adminState.selectBlock(page, blk.id);
        }
        updateAll();
      });
    }
    if (rowAddImage) {
      rowAddImage.addEventListener('click', function(e) {
        e.stopPropagation();
        var rowNum = parseInt(this.getAttribute('data-row'), 10);
        var blk = adminState.addBlock(page, 'image', rowNum);
        if (blk) {
          adminState.selectBlock(page, blk.id);
        }
        updateAll();
      });
    }
  }

  function bindBlockWidthPct(blockId) {
    var slider = document.getElementById('blkWidthPct');
    var valSpan = document.getElementById('valBlkWidthPct');
    if (!slider) return;
    slider.addEventListener('input', function() {
      var page = adminState.getState().selectedPage;
      var v = parseInt(slider.value);
      adminState.updateBlock(page, blockId, 'widthPct', v);
      if (valSpan) valSpan.textContent = v;
      debouncePreview();
    });
  }

  function bindBlockHeightToggle(blockId) {
    var toggle = document.getElementById('blkFixedHeight');
    if (!toggle) return;
    toggle.addEventListener('change', function() {
      var page = adminState.getState().selectedPage;
      adminState.updateBlock(page, blockId, 'style.fixedHeight', toggle.checked ? true : null);
      debouncePreview();
    });
  }

  function bindBlockColorSwatches(blockId, currentKey) {
    var container = document.getElementById('blkColorSwatches');
    if (!container) return;
    var swatches = container.querySelectorAll('.color-swatch');
    var page = adminState.getState().selectedPage;
    for (var i = 0; i < swatches.length; i++) {
      (function(sw) {
        sw.addEventListener('click', function() {
          var key = sw.getAttribute('data-key');
          adminState.updateBlock(page, blockId, 'style.colorKey', key);
          for (var j = 0; j < swatches.length; j++) {
            swatches[j].classList.remove('active');
          }
          sw.classList.add('active');
          debouncePreview();
        });
      })(swatches[i]);
    }
  }

  function bindBlockBgColorSwatches(blockId, currentKey) {
    var container = document.getElementById('blkBgColorSwatches');
    if (!container) return;
    var swatches = container.querySelectorAll('.color-swatch');
    var page = adminState.getState().selectedPage;
    for (var i = 0; i < swatches.length; i++) {
      (function(sw) {
        sw.addEventListener('click', function() {
          var key = sw.getAttribute('data-key') || null;
          adminState.updateBlock(page, blockId, 'style.bgColorKey', key);
          for (var j = 0; j < swatches.length; j++) {
            swatches[j].classList.remove('active');
          }
          sw.classList.add('active');
          debouncePreview();
        });
      })(swatches[i]);
    }
  }

  function bindBlockSlider(id, valId, blockId, statePath) {
    var el = document.getElementById(id);
    var vl = document.getElementById(valId);
    if (!el) return;
    var page = adminState.getState().selectedPage;
    el.addEventListener('input', function() {
      var v = parseInt(el.value, 10);
      if (vl) vl.textContent = v;
      adminState.updateBlock(page, blockId, statePath, v);
      debouncePreview();
    });
  }

  function bindBlockToggle(id, blockId, statePath) {
    var el = document.getElementById(id);
    if (!el) return;
    var page = adminState.getState().selectedPage;
    el.addEventListener('change', function() {
      adminState.updateBlock(page, blockId, statePath, el.checked ? true : null);
      debouncePreview();
    });
  }

  function bindBlockValignButtons(blockId, currentValign) {
    var valigns = ['top', 'center', 'bottom', 'stretch'];
    for (var i = 0; i < valigns.length; i++) {
      var v = valigns[i];
      var btn = document.getElementById('blkValign' + v.charAt(0).toUpperCase() + v.slice(1));
      if (!btn) continue;
      btn.addEventListener('click', function(valign) {
        return function() {
          var p = adminState.getState().selectedPage;
          adminState.updateBlock(p, blockId, 'style.valign', valign);
          for (var j = 0; j < valigns.length; j++) {
            var b = document.getElementById('blkValign' + valigns[j].charAt(0).toUpperCase() + valigns[j].slice(1));
            if (b) b.classList.remove('primary');
          }
          document.getElementById('blkValign' + valign.charAt(0).toUpperCase() + valign.slice(1)).classList.add('primary');
          debouncePreview();
        };
      }(v));
    }
  }

  var previewTimer = null;
  function debouncePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function() { renderPreview(); }, 100);
  }

  function renderPreview() {
    var state = adminState.getState();
    var mode = preview.getMode();
    var page = state.selectedPage;
    var total = adminState.getTotalPages();
    document.getElementById('pageIndicator').textContent = 'Pag. ' + page + ' / ' + total;

    if (mode === 'single') {
      preview.render(page, adminState);
    } else if (mode === 'spread') {
      var orderedIds = adminState.getOrderedPageIds();
      var idx = orderedIds.indexOf(page);
      if (idx < 0) idx = 0;
      var left = page;
      var right = orderedIds[idx + 1] || 0;
      preview.renderSpread(left, right, adminState);
    } else {
      preview.renderAll(adminState);
    }
  }

  function updateAll() {
    try { renderNavigation(); } catch(e) { console.error('renderNavigation:', e); }
    try { renderPageControls(); } catch(e) { console.error('renderPageControls:', e); }
    try { renderPreview(); } catch(e) { console.error('renderPreview:', e); }
    try { renderBackgroundGrid(); } catch(e) { console.error('renderBackgroundGrid:', e); }
  }

  function bindUndoRedo() {
    var btnUndo = document.getElementById('btnUndo');
    var btnRedo = document.getElementById('btnRedo');
    if (btnUndo) {
      btnUndo.addEventListener('click', function() {
        if (adminState.undo()) {
          showToast('Annullato', 'success');
          updateAll();
        }
      });
    }
    if (btnRedo) {
      btnRedo.addEventListener('click', function() {
        if (adminState.redo()) {
          showToast('Ripristinato', 'success');
          updateAll();
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      var hasCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (hasCmdOrCtrl && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (adminState.redo()) {
            showToast('Ripristinato', 'success');
            updateAll();
          }
        } else {
          if (adminState.undo()) {
            showToast('Annullato', 'success');
            updateAll();
          }
        }
      } else if (hasCmdOrCtrl && e.key === 'y') {
        e.preventDefault();
        if (adminState.redo()) {
          showToast('Ripristinato', 'success');
          updateAll();
        }
      }
    });
  }

  function bindVisualInteraction() {
    var container = document.getElementById('previewContainer');
    if (!container) return;

    var startX = 0;
    var startY = 0;
    var isDragging = false;
    var dragStarted = false;
    var isResizing = false;

    // Drag state
    var srcPageNum = null;
    var srcBlockId = null;
    var srcBlockEl = null;

    // Resize state
    var resizeBlock = null;
    var resizeAdjBlock = null;
    var resizeSide = 'right';
    var resizeStartW1 = 0;
    var resizeStartW2 = 0;
    var resizeTotalPct = 100;
    var resizeRowWidthPx = 0;

    container.addEventListener('mousedown', function(e) {
      // 1. Check if clicking on resize handle
      var handleEl = e.target.closest('.blk-resize-handle');
      if (handleEl) {
        e.preventDefault();
        e.stopPropagation();

        var blockEl = handleEl.closest('.page-block');
        if (!blockEl) return;

        var pageEl = blockEl.closest('.preview-page');
        if (!pageEl) return;

        var pageNum = parseInt(pageEl.getAttribute('data-page'), 10);
        var blockId = blockEl.getAttribute('data-block-id');
        var rowNum = parseInt(blockEl.getAttribute('data-row-num'), 10);
        var colIndex = parseInt(blockEl.getAttribute('data-col-index'), 10);
        var side = handleEl.getAttribute('data-side') || 'right';

        var pageCfg = adminState.getState().pages[String(pageNum)];
        if (!pageCfg || !pageCfg.blocks) return;

        var blocks = pageCfg.blocks;
        var B1 = null;
        var B2 = null;

        var adjColIndex = (side === 'left') ? colIndex - 1 : colIndex + 1;
        for (var i = 0; i < blocks.length; i++) {
          if (blocks[i].id === blockId) { B1 = blocks[i]; }
          if (blocks[i].gridRow === rowNum && blocks[i].colIndex === adjColIndex) { B2 = blocks[i]; }
        }

        if (!B1) return;

        var rowCfg = (pageCfg.grid && pageCfg.grid.rows && pageCfg.grid.rows[rowNum - 1]) || { cols: 1 };
        var colCount = rowCfg.cols || 1;

        isResizing = true;
        startX = e.clientX;
        resizeBlock = B1;
        resizeAdjBlock = B2;
        resizeSide = side;
        resizeStartW1 = B1.widthPct !== undefined ? B1.widthPct : (100 / colCount);
        resizeStartW2 = (B2 && B2.widthPct !== undefined) ? B2.widthPct : (100 / colCount);
        resizeTotalPct = resizeStartW1 + resizeStartW2;

        var rowEl = blockEl.closest('.grid-row');
        resizeRowWidthPx = rowEl ? rowEl.getBoundingClientRect().width : 1;

        document.body.classList.add('resizing-active');
        document.body.style.cursor = 'col-resize';
        return;
      }

      // 2. Check if clicking on page block (not resize handle)
      var blockEl = e.target.closest('.page-block');
      if (blockEl) {
        var pageEl = blockEl.closest('.preview-page');
        if (!pageEl) return;

        var pageNum = parseInt(pageEl.getAttribute('data-page'), 10);
        var blockId = blockEl.getAttribute('data-block-id');

        isDragging = true;
        dragStarted = false;
        startX = e.clientX;
        startY = e.clientY;
        srcPageNum = pageNum;
        srcBlockId = blockId;
        srcBlockEl = blockEl;
      }
    });

    window.addEventListener('mousemove', function(e) {
      if (isResizing) {
        e.preventDefault();
        var deltaX = e.clientX - startX;
        var deltaPct = (deltaX / resizeRowWidthPx) * 100;
        
        var newW1;
        if (resizeSide === 'left') {
          newW1 = resizeStartW1 - deltaPct;
        } else {
          newW1 = resizeStartW1 + deltaPct;
        }

        if (resizeAdjBlock) {
          newW1 = Math.max(10, Math.min(resizeTotalPct - 10, newW1));
          var newW2 = resizeTotalPct - newW1;
          resizeBlock.widthPct = newW1;
          resizeAdjBlock.widthPct = newW2;
        } else {
          newW1 = Math.max(10, Math.min(90, newW1));
          resizeBlock.widthPct = newW1;
        }

        // Real-time smooth render (no debouncing for dragging)
        renderPreview();
        return;
      }

      if (isDragging && srcBlockEl) {
        if (!dragStarted) {
          var dx = e.clientX - startX;
          var dy = e.clientY - startY;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            dragStarted = true;
            srcBlockEl.classList.add('blk-dragging');
            document.body.style.cursor = 'grabbing';
          }
        }

        if (dragStarted) {
          e.preventDefault();
          
          // Hover target checking
          var targetEl = document.elementFromPoint(e.clientX, e.clientY);
          var targetBlockEl = targetEl ? targetEl.closest('.page-block') : null;
          var targetEmptyEl = targetEl ? targetEl.closest('.page-block-empty') : null;
          var targetRowEl = targetEl ? targetEl.closest('.grid-row') : null;
          var targetPageEl = targetEl ? targetEl.closest('.preview-page') : null;

          // Clear hovers
          var hovers = container.querySelectorAll('.drop-hover');
          for (var h = 0; h < hovers.length; h++) {
            hovers[h].classList.remove('drop-hover');
          }

          var tgtPageNum = targetPageEl ? parseInt(targetPageEl.getAttribute('data-page'), 10) : null;
          if (tgtPageNum === srcPageNum) {
            if (targetBlockEl && targetBlockEl !== srcBlockEl) {
              targetBlockEl.classList.add('drop-hover');
            } else if (targetEmptyEl) {
              targetEmptyEl.classList.add('drop-hover');
            } else if (targetRowEl) {
              targetRowEl.classList.add('drop-hover');
            }
          }
        }
      }
    });

    window.addEventListener('mouseup', function(e) {
      if (isResizing) {
        isResizing = false;
        document.body.classList.remove('resizing-active');
        document.body.style.cursor = '';
        
        // Finalize state and record undo history
        adminState.saveToStorage();
        adminState.recordHistory(true);
        updateAll();
        return;
      }

      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        if (srcBlockEl) {
          srcBlockEl.classList.remove('blk-dragging');
        }

        if (dragStarted) {
          dragStarted = false;
          e.preventDefault();

          // Clear hovers
          var hovers = container.querySelectorAll('.drop-hover');
          for (var h = 0; h < hovers.length; h++) {
            hovers[h].classList.remove('drop-hover');
          }

          var targetEl = document.elementFromPoint(e.clientX, e.clientY);
          if (targetEl) {
            var targetBlockEl = targetEl.closest('.page-block');
            var targetEmptyEl = targetEl.closest('.page-block-empty');
            var targetRowEl = targetEl.closest('.grid-row');
            var targetPageEl = targetEl.closest('.preview-page');

            var tgtPageNum = targetPageEl ? parseInt(targetPageEl.getAttribute('data-page'), 10) : null;
            if (tgtPageNum === srcPageNum) {
              var pageCfg = adminState.getState().pages[String(srcPageNum)];
              var blocks = pageCfg ? (pageCfg.blocks || []) : [];
              var srcBlock = null;
              for (var b = 0; b < blocks.length; b++) {
                if (blocks[b].id === srcBlockId) { srcBlock = blocks[b]; break; }
              }

              if (srcBlock) {
                var changed = false;

                if (targetBlockEl && targetBlockEl !== srcBlockEl) {
                  var tgtBlockId = targetBlockEl.getAttribute('data-block-id');
                  var tgtBlock = null;
                  for (var b = 0; b < blocks.length; b++) {
                    if (blocks[b].id === tgtBlockId) { tgtBlock = blocks[b]; break; }
                  }

                  if (tgtBlock) {
                    if (srcBlock.gridRow === tgtBlock.gridRow) {
                      // Swap columns
                      var tmpCol = srcBlock.colIndex || 1;
                      srcBlock.colIndex = tgtBlock.colIndex || 1;
                      tgtBlock.colIndex = tmpCol;

                      var tmpWidth = srcBlock.widthPct;
                      srcBlock.widthPct = tgtBlock.widthPct;
                      tgtBlock.widthPct = tmpWidth;
                      changed = true;
                    } else {
                      // Swap gridRow and colIndex
                      var tmpRow = srcBlock.gridRow || 1;
                      srcBlock.gridRow = tgtBlock.gridRow || 1;
                      tgtBlock.gridRow = tmpRow;

                      var tmpCol = srcBlock.colIndex || 1;
                      srcBlock.colIndex = tgtBlock.colIndex || 1;
                      tgtBlock.colIndex = tmpCol;

                      var tmpWidth = srcBlock.widthPct;
                      srcBlock.widthPct = tgtBlock.widthPct;
                      tgtBlock.widthPct = tmpWidth;
                      changed = true;
                    }
                  }
                } else if (targetEmptyEl) {
                  var tgtRow = parseInt(targetEmptyEl.getAttribute('data-row-num'), 10);
                  var tgtCol = parseInt(targetEmptyEl.getAttribute('data-col-index'), 10);
                  
                  srcBlock.gridRow = tgtRow;
                  srcBlock.colIndex = tgtCol;

                  var rowCfg = (pageCfg.grid && pageCfg.grid.rows && pageCfg.grid.rows[tgtRow - 1]) || { cols: 1 };
                  srcBlock.widthPct = 100 / (rowCfg.cols || 1);
                  changed = true;
                } else if (targetRowEl) {
                  var tgtRow = parseInt(targetRowEl.getAttribute('data-row-num'), 10);
                  var rowCfg = (pageCfg.grid && pageCfg.grid.rows && pageCfg.grid.rows[tgtRow - 1]) || { cols: 1 };
                  var colCount = rowCfg.cols || 1;

                  // Find first free index
                  var occupied = {};
                  for (var b = 0; b < blocks.length; b++) {
                    if (blocks[b].gridRow === tgtRow) {
                      occupied[blocks[b].colIndex || 1] = true;
                    }
                  }
                  var freeCol = -1;
                  for (var c = 1; c <= colCount; c++) {
                    if (!occupied[c]) { freeCol = c; break; }
                  }

                  if (freeCol !== -1) {
                    srcBlock.gridRow = tgtRow;
                    srcBlock.colIndex = freeCol;
                    srcBlock.widthPct = 100 / colCount;
                    changed = true;
                  }
                }

                if (changed) {
                  adminState.saveToStorage();
                  adminState.recordHistory(true);
                  updateAll();
                }
              }
            }
          }
        }
        srcBlockEl = null;
      }
    });
  }

  window.AdminApp = {
    updateAll: updateAll
  };

  document.addEventListener('DOMContentLoaded', function() {
    console.log('[Admin] DOM ready');

    // Escape key — deselect block
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (adminState && adminState.getState().selectedBlock) {
          adminState.deselectBlock();
          updateAll();
        }
      }
    });

    adminState = window.AdminState;
    preview = window.AdminPreview;
    webgl = window.AdminWebGL;

    preview.init('previewContainer');
    webgl.init('webglCanvas');
    bindVisualInteraction();

    // Bind static nav footer buttons (outside renderNavigation)
    var btnAdd = document.getElementById('btnAddBlank');
    if (btnAdd) {
      btnAdd.addEventListener('click', function() {
        adminState.addBlankPage();
        updateAll();
      });
    }
    var btnDel = document.getElementById('btnDeletePage');
    if (btnDel) {
      btnDel.addEventListener('click', function() {
        var sp = adminState.getState().selectedPage;
        if (sp > 0 && confirm('Eliminare pagina ' + sp + '?')) {
          adminState.removePage(sp);
          updateAll();
        }
      });
    }

    adminState.init().then(function() {
      console.log('[Admin] State initialized, selectedPage:', adminState.getState().selectedPage);

      bindTypography();
      bindPalette();
      bindLayout();
      bindZoom();
      initWebglSwatches();
      bindWebGL();
      bindExport();
      bindUndoRedo();
      bindPreviewMode();
      renderNavigation();
      renderBackgroundGrid();
      renderPageControls();
      renderPreview();
    }).catch(function(err) {
      console.error('[Admin] Init failed:', err);
    });
  });
})();
