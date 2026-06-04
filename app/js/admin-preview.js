window.AdminPreview = (function() {
  var container = null;
  var viewMode = 'single';
  var zoomLevel = 1.0;

  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escAttr(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function scaleToFit(pageEl) {
    if (!container) return 1;
    var cw = container.clientWidth - 40;
    var ch = container.clientHeight - 40;
    if (ch < 1 || cw < 1) return 0.3;
    var st = window.AdminState ? window.AdminState.getState() : null;
    var pw = st && st.print ? (st.print.pageW || 148) : 148;
    var ph = st && st.print ? (st.print.pageH || 185) : 185;
    var scaleX = (cw * 0.96) / pw;
    var scaleY = (ch * 0.96) / ph;
    return Math.min(scaleX, scaleY, 1.8);
  }

  function getTypographyStyles(state) {
    var t = state.typography || {};
    return (
      '--font-display: Tuaf, sans-serif;' +
      '--font-body: ABC Camera, sans-serif;' +
      '--tp-h1: ' + (t.h1 || 28) + 'pt;' +
      '--tp-h2: ' + (t.h2 || 18) + 'pt;' +
      '--tp-h3: ' + (t.h3 || 14) + 'pt;' +
      '--tp-body: ' + (t.body || 10) + 'pt;' +
      '--tp-caption: ' + (t.caption || 8) + 'pt;' +
      '--tp-letterSpacing: 2px;'
    );
  }

  function getPaletteStyles(palette) {
    var p = palette || {};
    return (
      '--color-bg: ' + (p.bg || '#121420') + ';' +
      '--color-h1: ' + (p.h1Color || '#F2CD77') + ';' +
      '--color-h2: ' + (p.h2Color || '#7BBEBC') + ';' +
      '--color-h3: ' + (p.h3Color || '#e0e0e0') + ';' +
      '--color-body: ' + (p.bodyColor || '#e0e0e0') + ';' +
      '--color-caption: ' + (p.captionColor || '#a0a0a0') + ';' +
      '--color-border: rgba(242,205,121,0.3);'
    );
  }

  function buildBlockStyle(block, t, p) {
    var s = block.style || {};
    var fontFamily = (s.font || '').indexOf('Tuaf') !== -1 ? 'var(--font-display)' : 'var(--font-body)';
    var size = s.size || 12;
    var weight = s.weight || 'normal';
    var transform = s.transform || 'none';
    var letterSpacing = s.letterSpacing || 0;
    var lineH = s.lineH || 1.4;

    if (block.level && t) {
      var presets = {
        h1: { font: 'Tuaf', size: t.h1 || 28, weight: 'bold', transform: 'uppercase', letterSpacing: 2, lineH: 1.2 },
        h2: { font: 'Tuaf', size: t.h2 || 18, weight: 'bold', transform: 'uppercase', letterSpacing: 2, lineH: 1.2 },
        h3: { font: 'ABC Camera', size: t.h3 || 14, weight: 'normal', transform: 'none', letterSpacing: 1, lineH: 1.4 },
        body: { font: 'ABC Camera', size: t.body || 10, weight: 'normal', transform: 'none', letterSpacing: 0, lineH: 1.6 },
        caption: { font: 'ABC Camera', size: t.caption || 8, weight: 'normal', transform: 'none', letterSpacing: 0, lineH: 1.4 }
      };
      var preset = presets[block.level] || presets.body;
      fontFamily = (preset.font || '').indexOf('Tuaf') !== -1 ? 'var(--font-display)' : 'var(--font-body)';
      size = preset.size;
      weight = preset.weight;
      transform = preset.transform;
      letterSpacing = preset.letterSpacing;
      lineH = preset.lineH;
    }

    var color = 'var(--color-body)';
    if (s.colorKey && p) {
      if (s.colorKey.indexOf('extra') === 0) {
        var extraIdx = parseInt(s.colorKey.substring(5), 10);
        var extras = p.extra || [];
        color = extras[extraIdx] || color;
      } else {
        color = p[s.colorKey] || color;
      }
    } else if (s.color) {
      color = s.color;
    } else if (block.level && p) {
      var levelColor = p[block.level + 'Color'];
      if (levelColor) color = levelColor;
    }

    var styles =
      'font-family: ' + fontFamily + ';' +
      'font-size: ' + size + 'pt;' +
      'font-weight: ' + weight + ';' +
      'color: ' + color + ';' +
      'text-align: ' + (s.align || 'left') + ';' +
      'line-height: ' + lineH + ';';
    if (transform && transform !== 'none') styles += 'text-transform: ' + transform + ';';
    if (letterSpacing) styles += 'letter-spacing: ' + letterSpacing + 'px;';
    return styles;
  }

  function buildBlockContent(block) {
    if (block.type === 'chart') {
      var chartHTML = '';
      if (window.RadarChart && block.chartData) {
        try {
          chartHTML = window.RadarChart.generateRadar(
            { taste: block.chartData, hasChart: true },
            { width: 180, height: 180, colors: { grid: '#000000', area: '#000000', axis: '#000000', text: '#000000' }, opacity: 0.3 }
          );
        } catch(e) {
          chartHTML = '<div style="color:#a0a0a0;font-style:italic;">Chart Error</div>';
        }
      }
      return chartHTML;
    }
    if (block.type === 'image') {
      if (block.imageUrl) {
        return '<img src="' + block.imageUrl + '" style="width:100%;height:100%;object-fit:contain;" alt="">';
      }
      return '<div style="color:var(--color-caption);font-size:9px;border:1px dashed var(--admin-border);width:100%;height:100%;display:flex;align-items:center;justify-content:center;">Inserisci URL immagine</div>';
    }
    if (block.content) {
      return esc(block.content).replace(/\n/g, '<br>');
    }
    return '';
  }

  function getFallbackPageHTML(pageNum, adminState, pageConfig, p, t, lay, data, pageInfo, bgId, bgs, bgSVG, capSize, lh) {
    var h1size = (t.h1 || 28) + 'pt';
    var h2size = (t.h2 || 18) + 'pt';
    var h3size = (t.h3 || 14) + 'pt';
    var bodySize = (t.body || 10) + 'pt';
    var ls = '2px';
    var typoInline = 'font-size: ' + h1size + '; line-height: 1.2; color: ' + (p.h1Color || '#F2CD77') + ';';
    var typoMedium = 'font-size: ' + h2size + '; color: ' + (p.h1Color || '#F2CD77') + ';';
    var typoMuted = 'color: ' + (p.captionColor || '#a0a0a0') + ';';
    var innerHTML = '';
    var extraClass = '';

    var padT = (lay.padTop !== undefined ? lay.padTop : 20) + 'mm';
    var padR = (lay.padRight !== undefined ? lay.padRight : 20) + 'mm';
    var padB = (lay.padBottom !== undefined ? lay.padBottom : 20) + 'mm';
    var padL = (lay.padLeft !== undefined ? lay.padLeft : 20) + 'mm';

    switch (pageConfig.type) {
      case 'cover':
        innerHTML =
          '<div style="font-family: var(--font-display); text-transform: uppercase; letter-spacing: 4px; font-size: ' + h1size + '; color: ' + (p.h1Color || '#F2CD77') + '; margin-bottom: 10px;">' + esc(data ? data.title : '') + '</div>' +
          '<div style="font-family: var(--font-body); font-size: ' + h2size + '; letter-spacing: 5px; ' + typoMuted + '">' + esc(data ? data.subtitle : '') + '</div>';
        break;

      case 'prefazione': {
        extraClass = 'prefazione-page';
        var prefaData = data ? data.prefazione : [];
        var prefaHtml = '';
        prefaData.forEach(function(para, i) {
          if (i === 0) {
            prefaHtml += '<div style="font-family: var(--font-display); text-transform: uppercase; letter-spacing: ' + ls + '; ' + typoMedium + '">' + esc(para) + '</div>';
          } else if (para.startsWith('"')) {
            prefaHtml += '<div style="font-style: italic; color: ' + (p.bodyColor || '#e0e0e0') + '; margin: 1.5em 0; font-size: ' + h3size + '; line-height: 1.8; text-align: center; max-width: 80%; margin-left: auto; margin-right: auto;">' + esc(para) + '</div>';
          } else if (para.startsWith('\u2014')) {
            prefaHtml += '<div style="text-align: right; font-size: ' + bodySize + '; ' + typoMuted + ' margin-top: 5px;">' + esc(para) + '</div>';
          } else {
            prefaHtml += '<p style="margin: 0.5em 0;">' + esc(para) + '</p>';
          }
          if (i > 0 && i < prefaData.length - 1) prefaHtml += '<br>';
        });
        innerHTML = '<div style="width:100%;">' + prefaHtml + '</div>';
        break;
      }

      case 'drink-left': {
        extraClass = 'drink-detail';
        var drinkNum = pageConfig.drinkNumber || 1;
        var drink = adminState.getDrinkByNumber(drinkNum);
        if (drink) {
          var chartSize = 220;
          var chartSVG = '';
          if (window.RadarChart && drink.taste && drink.hasChart) {
            try {
              chartSVG = window.RadarChart.generateRadar(drink, {
                width: chartSize, height: chartSize,
                colors: { grid: (p.captionColor || '#000000'), area: (p.h1Color || '#000000'), axis: (p.captionColor || '#000000'), text: (p.h1Color || '#000000') },
                opacity: 0.3
              });
            } catch(e) {
              chartSVG = '<div style="color:' + (p.captionColor || '#a0a0a0') + ';font-style:italic;">Chart Error</div>';
            }
          }
          var ingHTML = (drink.ingredients || []).map(function(ing) {
            return '<li style="margin-bottom: 4px; padding-left: 15px; position: relative; font-size: ' + bodySize + '; text-transform: uppercase; list-style: none;"><span style="position: absolute; left: 0; color: ' + (p.h1Color || '#F2CD77') + ';">&bull;</span>' + esc(ing) + '</li>';
          }).join('');
          innerHTML =
            '<div style="font-family: var(--font-display); text-transform: uppercase; letter-spacing: ' + ls + '; ' + typoInline + '">' + esc(drink.name) + '</div>' +
            '<div style="font-family: var(--font-body); font-size: ' + h3size + '; text-transform: uppercase; color: ' + (p.h2Color || '#7BBEBC') + '; letter-spacing: 1px; font-style: italic; margin-top: 8px;">' + esc(drink.profile || '') + '</div>' +
            '<ul style="list-style: none; padding: 0; margin: 20px 0;">' + ingHTML + '</ul>' +
            (chartSVG ? '<div style="margin-top: 10px;">' + chartSVG + '</div>' : '');
        }
        break;
      }

      case 'drink-right':
        extraClass = 'webgl-placeholder';
        if (!bgSVG) {
          var drinkNum2 = pageConfig.drinkNumber || 1;
          var drink2 = adminState.getDrinkByNumber(drinkNum2);
          innerHTML = '<div style="' + typoMedium + '">[Immagine: ' + esc(drink2 ? drink2.name : '') + ']</div>';
        }
        break;

      case 'list': {
        extraClass = 'list-page';
        var section = pageConfig.section || '';
        var items = [];
        var title = '';
        if (data && data.drinks) {
          if (section === 'intramontabili') {
            items = data.drinks.filter(function(d) { return d.category && d.category.indexOf('INTRAMONTABILI') !== -1; });
            title = 'Le Nostre Proposte Intramontabili';
          } else if (section === 'after-dinner') {
            items = data.drinks.filter(function(d) { return d.category && d.category.indexOf('AFTER') !== -1; });
            title = 'After Dinner';
          } else if (section === 'analcolici') {
            items = data.drinks.filter(function(d) { return d.category === 'Alcohol Free'; });
            title = 'Analcolici';
          } else {
            items = data.drinks.filter(function(d) { return d.category === 'Signature'; }).slice(0, 5);
            title = pageConfig.label || 'List';
          }
        }
        var listItems = items.map(function(d) {
          return '<div style="border-bottom: 1px solid var(--color-border, rgba(242,205,121,0.3)); padding-bottom: 10px; margin-bottom: 10px;">' +
            '<div style="display: flex; justify-content: space-between; align-items: baseline;">' +
            '<span style="font-family: var(--font-display); font-size: ' + h3size + '; color: ' + (p.h1Color || '#F2CD77') + ';">' + esc(d.name) + '</span>' +
            '<span style="font-size: ' + bodySize + '; color: ' + (p.h2Color || '#7BBEBC') + '; text-transform: uppercase;">' + esc(d.profile || '') + '</span>' +
            '</div>' +
            '<div style="font-size: ' + capSize + '; ' + typoMuted + ' margin-top: 5px;">' + esc((d.ingredients || []).join(', ')) + '</div>' +
            '</div>';
        }).join('');
        innerHTML =
          '<div style="font-family: var(--font-display); text-transform: uppercase; letter-spacing: ' + ls + '; ' + typoMedium + '; margin-bottom: 20px;">' + title + '</div>' +
          '<div style="width: 100%;">' + listItems + '</div>';
        break;
      }

      case 'vermouth': {
        extraClass = 'vermouth-page';
        var ve = data ? data.vermouth_experience : { vermouth: [], bitter: [], spezie: [] };
        var colStyle = 'text-align: center;';
        var h4Style = 'font-family: var(--font-display); font-size: ' + bodySize + '; color: ' + (p.h1Color || '#F2CD77') + '; border-bottom: 1px solid var(--color-border, rgba(242,205,121,0.3)); padding-bottom: 5px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: ' + ls + ';';
        var ulStyle = 'list-style: none; padding: 0; font-size: ' + capSize + '; color: ' + (p.bodyColor || '#e0e0e0') + ';';
        innerHTML =
          '<div style="font-family: var(--font-display); text-transform: uppercase; letter-spacing: ' + ls + '; ' + typoMedium + '; text-align: center; margin-bottom: 20px;">The Spiritual Machine</div>' +
          '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%;">' +
          '<div style="' + colStyle + '"><h4 style="' + h4Style + '">Vermouth</h4><ul style="' + ulStyle + '">' + ve.vermouth.map(function(v) { return '<li style="margin-bottom:3px;">' + esc(v) + '</li>'; }).join('') + '</ul></div>' +
          '<div style="' + colStyle + '"><h4 style="' + h4Style + '">Bitter</h4><ul style="' + ulStyle + '">' + ve.bitter.map(function(b) { return '<li style="margin-bottom:3px;">' + esc(b) + '</li>'; }).join('') + '</ul></div>' +
          '<div style="' + colStyle + '"><h4 style="' + h4Style + '">Spezie</h4><ul style="' + ulStyle + '">' + ve.spezie.map(function(s) { return '<li style="margin-bottom:3px;">' + esc(s) + '</li>'; }).join('') + '</ul></div>' +
          '</div>';
        break;
      }

      case 'colophon':
        innerHTML =
          '<div style="font-family: var(--font-display); text-transform: uppercase; letter-spacing: ' + ls + '; ' + typoMedium + '; text-align: center;">BP LAB 2026</div>' +
          '<div style="font-size: 9pt; ' + typoMuted + '; margin-top: 20px; text-align: center;">&copy; 2026 BP LAB. All rights reserved.<br>Design: Visual Studio / Sisyphus</div>';
        break;

      case 'back-cover':
        extraClass = 'webgl-placeholder';
        if (!bgSVG) {
          innerHTML = '<div style="' + typoMedium + '">[WebGL Background \u2014 Back Cover]</div>';
        }
        break;

      default:
        innerHTML = '<div style="' + typoMuted + '">Page ' + pageNum + '</div>';
    }

    var print = adminState.getState().print || {};
    var pageW = print.pageW || 148;
    var pageH = print.pageH || 185;
    var bleed = print.bleed || 3;
    var bleedPx = bleed + 'mm';
    var bgColor = pageInfo.bgColorOverride || p.bg || '#121420';
    var bgLayerHTML = '<div style="position:absolute;top:-' + bleedPx + ';left:-' + bleedPx + ';width:calc(100% + ' + (2 * bleed) + 'mm);height:calc(100% + ' + (2 * bleed) + 'mm);background-color:' + bgColor + ';z-index:-1;"></div>';
    if (bgSVG) {
      bgLayerHTML += '<div style="position:absolute;top:-' + bleedPx + ';left:-' + bleedPx + ';width:calc(100% + ' + (2 * bleed) + 'mm);height:calc(100% + ' + (2 * bleed) + 'mm);z-index:0;pointer-events:none;overflow:hidden;">' + bgSVG + '</div>';
    }
    var legacyStyle =
      'width: ' + pageW + 'mm;' +
      'height: ' + pageH + 'mm;' +
      'position: relative;' +
      'overflow: hidden;' +
      'color: ' + (p.bodyColor || '#e0e0e0') + ';' +
      'padding: ' + padT + ' ' + padR + ' ' + padB + ' ' + padL + ';' +
      'display: flex;' +
      'flex-direction: column;' +
      (extraClass === 'prefazione-page' ? 'justify-content:flex-start;align-items:flex-start;text-align:left;' : 'justify-content:center;align-items:center;text-align:center;') +
      'font-family: var(--font-body);' +
      'line-height: ' + lh + ';';

    var isSelectedPage = adminState.getState().selectedPage === pageNum;
    var activeClass = isSelectedPage ? ' active-page' : '';
    return '<div class="preview-page' + (extraClass ? ' ' + extraClass : '') + activeClass + '" style="' + legacyStyle + ' ' + getPaletteStyles(p) + ' ' + getTypographyStyles({typography: t, palette: p}) + '" data-page="' + pageNum + '">' +
      bgLayerHTML +
      '<div style="position:relative;z-index:1;width:100%;height:100%;display:flex;flex-direction:column;' + (extraClass === 'prefazione-page' ? 'justify-content:flex-start;align-items:flex-start;text-align:left;' : 'justify-content:center;align-items:center;text-align:center;') + '">' +
      innerHTML +
      '</div></div>';
  }

  function buildRowsHTML(blocks, rows, t, p) {
    var html = '';
    if (!rows) return html;
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri] || { cols: 1, gap: 4 };
      var rowBlocks = [];
      for (var bi = 0; bi < blocks.length; bi++) {
        if (blocks[bi].gridRow === ri + 1) {
          rowBlocks.push(blocks[bi]);
        }
      }
      var colCount = row.cols || 1;
      var rowStyle = 'display: flex; flex-direction: row; gap: ' + (row.gap || 4) + 'px;';
      html += '<div class="page-row" style="' + rowStyle + '">';
      for (var ci = 0; ci < colCount; ci++) {
        var block = rowBlocks[ci] || null;
        if (block) {
          var blockStyle = buildBlockStyle(block, t, p);
          var blockContent = buildBlockContent(block);
          html += '<div class="page-block" data-block-id="' + escAttr(block.id || '') + '" style="flex: ' + (block.widthPct || (100 / colCount)) + '%; ' + blockStyle + ' overflow: hidden;">' + blockContent + '</div>';
        } else {
          html += '<div class="page-block-empty" style="flex: 1;"></div>';
        }
      }
      html += '</div>';
    }
    return html;
  }

  function getPageHTML(pageNum, adminState) {
    if (!adminState) return '';
    var state = adminState.getState();
    var pageConfig = adminState.getPageConfig(pageNum);
    var p = pageConfig.palette || {};
    var t = pageConfig.typography || {};
    var lay = pageConfig.layout || {};
    var data = state.drinksData || {};
    var pageInfo = pageConfig;
    var bgId = pageInfo.backgroundId || null;
    var bgs = state.backgrounds || {};
    var bgSVG = (bgId && bgs[bgId] && bgs[bgId].svg) ? bgs[bgId].svg : '';
    var capSize = (t.caption || 8) + 'pt';
    var lh = lay.lineHeight || 1.6;
    var selectedBlock = state.selectedBlock;

    var pageW = state.print.pageW || 148;
    var pageH = state.print.pageH || 185;
    var bleed = state.print.bleed || 3;

    var padT = (lay.padTop !== undefined ? lay.padTop : 24) + 'mm';
    var padR = (lay.padRight !== undefined ? lay.padRight : 24) + 'mm';
    var padB = (lay.padBottom !== undefined ? lay.padBottom : 24) + 'mm';
    var padL = (lay.padLeft !== undefined ? lay.padLeft : 24) + 'mm';

    if (pageInfo.grid && pageInfo.blocks) {
      var grid = pageInfo.grid;
      var blocks = pageInfo.blocks || [];
      var rows = grid.rows || [];
      var rowGap = grid.rowGap || 4;

      var gridStyle =
        'display: flex;' +
        'flex-direction: column;' +
        'gap: ' + rowGap + 'mm;' +
        'width: 100%;' +
        'flex: 1;' +
        'position: relative;' +
        'z-index: 1;';

      var rowsHTML = '';
      var footerHTML = '';
      for (var ri = 0; ri < rows.length; ri++) {
        var rowCfg = rows[ri];
        var colCount = rowCfg.cols || 1;
        var colGap = rowCfg.gap || 4;

        var colSlots = [];
        for (var ci = 0; ci < colCount; ci++) colSlots.push(null);

        for (var bi = 0; bi < blocks.length; bi++) {
          if (blocks[bi].type === 'chart') {
            footerHTML = buildBlockContent(blocks[bi]);
            continue;
          }
          if (blocks[bi].gridRow === (ri + 1)) {
            var ci2 = (blocks[bi].colIndex || 1) - 1;
            if (ci2 >= 0 && ci2 < colCount) colSlots[ci2] = blocks[bi];
          }
        }

        var rowHasFixed = false;
        for (var si = 0; si < colSlots.length; si++) {
          var blk = colSlots[si];
          if (blk && blk.style && blk.style.fixedHeight) { rowHasFixed = true; break; }
        }
        var rowFlex = rowHasFixed ? 'flex: 1;min-height:0;' : 'flex: 0 0 auto;';
        var rowStyle = 'display: flex;' + 'gap: ' + colGap + 'mm;' + rowFlex;

        var blocksInRowHTML = '';
        for (var si = 0; si < colSlots.length; si++) {
          var blk = colSlots[si];
          if (!blk) {
            blocksInRowHTML += '<div class="page-block-empty" data-row-num="' + (ri + 1) + '" data-col-index="' + (si + 1) + '" style="flex:1;min-width:0;display:flex;flex-direction:column;min-height:20px;border:1px dashed transparent;"></div>';
            continue;
          }
          var valign = (blk.style && blk.style.valign) || 'center';
          var halign = (blk.style && blk.style.align) || 'left';
          var valignMap = { top: 'flex-start', center: 'center', bottom: 'flex-end', stretch: 'stretch' };
          var halignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
          var alignVal = valignMap[valign] || 'center';
          var justifyVal = halignMap[halign] || 'flex-start';
          var isFixed = blk.style && blk.style.fixedHeight;
          var blkFlex = isFixed ? '1' : '0 0 auto';
          var slotWidth = blk.widthPct !== undefined ? blk.widthPct : (100 / colCount);
          var slotStyle = 'flex: ' + slotWidth + '%;min-width:0;display:flex;flex-direction:column;position:relative;';
          var blkStyle =
            'flex: ' + blkFlex + ';' +
            'width: 100%;' +
            'display: flex;' +
            'align-items: ' + alignVal + ';' +
            'justify-content: ' + justifyVal + ';' +
            buildBlockStyle(blk, t, p) +
            'overflow: visible;position:relative;';

          var isSelected = selectedBlock && selectedBlock.page === pageNum && selectedBlock.blockId === blk.id;
          var blkClass = 'page-block' + (isSelected ? ' selected' : '');
          var blkContent = buildBlockContent(blk);
          
          var resizeHandleHTML = '';
          if (isSelected && colCount > 1) {
            var colIdx = blk.colIndex || 1;
            if (colIdx < colCount) {
              resizeHandleHTML += '<div class="blk-resize-handle blk-resize-handle-right" data-side="right" style="position:absolute;top:0;right:-' + (colGap / 2) + 'mm;width:' + Math.max(4, colGap) + 'mm;height:100%;cursor:col-resize;z-index:99;"></div>';
            }
            if (colIdx > 1) {
              resizeHandleHTML += '<div class="blk-resize-handle blk-resize-handle-left" data-side="left" style="position:absolute;top:0;left:-' + (colGap / 2) + 'mm;width:' + Math.max(4, colGap) + 'mm;height:100%;cursor:col-resize;z-index:99;"></div>';
            }
          }

          blocksInRowHTML += '<div style="' + slotStyle + '" class="slot-wrapper" data-row-num="' + (ri + 1) + '" data-col-index="' + (si + 1) + '">' +
            '<div class="' + blkClass + '" data-block-id="' + blk.id + '" data-row-num="' + (ri + 1) + '" data-col-index="' + (si + 1) + '" style="' + blkStyle + '">' +
              '<span style="display:block;width:100%;white-space:pre-wrap;word-break:break-word;pointer-events:none;">' + blkContent + '</span>' +
              resizeHandleHTML +
            '</div>' +
          '</div>';
        }
        rowsHTML += '<div class="grid-row" data-row-num="' + (ri + 1) + '" style="' + rowStyle + '">' + blocksInRowHTML + '</div>';
      }

      var baseStyle =
        'width: ' + pageW + 'mm;' +
        'height: ' + pageH + 'mm;' +
        'position: relative;' +
        'overflow: hidden;' +
        'color: ' + (p.bodyColor || '#e0e0e0') + ';' +
        'padding: ' + padT + ' ' + padR + ' ' + padB + ' ' + padL + ';' +
        'display: flex;' +
        'flex-direction: column;' +
        'font-family: var(--font-body);' +
        'line-height: ' + lh + ';';

      var bleedPx = bleed + 'mm';
      var bgColor = pageInfo.bgColorOverride || p.bg || '#121420';
      var bgLayerHTML = '<div style="position:absolute;top:-' + bleedPx + ';left:-' + bleedPx + ';width:calc(100% + ' + (2 * bleed) + 'mm);height:calc(100% + ' + (2 * bleed) + 'mm);background-color:' + bgColor + ';z-index:-1;"></div>';
      if (bgSVG) {
        bgLayerHTML += '<div style="position:absolute;top:-' + bleedPx + ';left:-' + bleedPx + ';width:calc(100% + ' + (2 * bleed) + 'mm);height:calc(100% + ' + (2 * bleed) + 'mm);z-index:0;pointer-events:none;overflow:hidden;">' + bgSVG + '</div>';
      }

      var footerPart = footerHTML ? '<div class="page-footer" style="position:absolute;bottom:0;left:0;display:flex;align-items:center;justify-content:flex-start;padding:8px 0;z-index:2;width:auto;">' + footerHTML + '</div>' : '';

      var isSelectedPage = adminState.getState().selectedPage === pageNum;
      var activeClass = isSelectedPage ? ' active-page' : '';
      return '<div class="preview-page' + activeClass + '" style="' + baseStyle + ' ' + getPaletteStyles(p) + ' ' + getTypographyStyles({typography: t, palette: p}) + '" data-page="' + pageNum + '">' +
        bgLayerHTML +
        '<div class="page-grid" style="' + gridStyle + '">' +
        rowsHTML +
        '</div>' +
        footerPart +
        '</div>';
    }

    return getFallbackPageHTML(pageNum, adminState, pageConfig, p, t, lay, data, pageInfo, bgId, bgs, bgSVG, capSize, lh);
  }

  function handlePreviewClick(e) {
    var blockEl = e.target.closest('.page-block');
    if (blockEl) {
      var pageEl = blockEl.closest('.preview-page');
      if (!pageEl) return;
      var pageNum = parseInt(pageEl.getAttribute('data-page'), 10);
      var blockId = blockEl.getAttribute('data-block-id');
      if (pageNum && blockId && window.AdminState) {
        window.AdminState.selectBlock(pageNum, blockId);
        window.AdminState.getState().selectedPage = pageNum;
        window.AdminState.saveToStorage();
        if (window.AdminApp && window.AdminApp.updateAll) {
          window.AdminApp.updateAll();
        }
      }
      return;
    }
    var pageEl = e.target.closest('.preview-page');
    if (pageEl) {
      var pageNum = parseInt(pageEl.getAttribute('data-page'), 10);
      if (pageNum && window.AdminState) {
        window.AdminState.getState().selectedPage = pageNum;
        window.AdminState.deselectBlock();
        window.AdminState.saveToStorage();
        if (window.AdminApp && window.AdminApp.updateAll) {
          window.AdminApp.updateAll();
        }
      }
      return;
    }
    // Click outside any block/page — deselect
    if (window.AdminState && window.AdminState.getState().selectedBlock) {
      window.AdminState.deselectBlock();
      if (window.AdminApp && window.AdminApp.updateAll) {
        window.AdminApp.updateAll();
      }
    }
  }

  return {
    init: function(containerId) {
      container = document.getElementById(containerId);
      if (container) {
        container.addEventListener('click', handlePreviewClick);
      }
      return this;
    },

    setMode: function(mode) {
      viewMode = mode;
    },

    getMode: function() { return viewMode; },

    setZoom: function(level) {
      zoomLevel = level;
    },

    getZoom: function() {
      return zoomLevel;
    },

    render: function(pageNum, adminState) {
      if (!container || !adminState) return;
      var scrollTop = container.scrollTop;
      var scrollLeft = container.scrollLeft;
      var parentScrollTop = container.parentElement ? container.parentElement.scrollTop : 0;
      var parentScrollLeft = container.parentElement ? container.parentElement.scrollLeft : 0;

      container.innerHTML = '';

      var baseScale = scaleToFit();
      var finalScale = baseScale * zoomLevel;
      var pageHTML = getPageHTML(pageNum, adminState);

      var wrapper = document.createElement('div');
      wrapper.className = 'preview-page-wrapper';
      wrapper.style.transform = 'scale(' + finalScale + ')';
      wrapper.style.transformOrigin = 'top center';
      wrapper.innerHTML = pageHTML;
      container.appendChild(wrapper);

      container.scrollTop = scrollTop;
      container.scrollLeft = scrollLeft;
      if (container.parentElement) {
        container.parentElement.scrollTop = parentScrollTop;
        container.parentElement.scrollLeft = parentScrollLeft;
      }
    },

    renderSpread: function(leftNum, rightNum, adminState) {
      if (!container || !adminState) return;
      var scrollTop = container.scrollTop;
      var scrollLeft = container.scrollLeft;
      var parentScrollTop = container.parentElement ? container.parentElement.scrollTop : 0;
      var parentScrollLeft = container.parentElement ? container.parentElement.scrollLeft : 0;

      container.innerHTML = '';

      var baseScale = Math.min(scaleToFit() * 0.9, 1.2);
      var finalScale = baseScale * zoomLevel;
      var leftHTML = getPageHTML(leftNum, adminState);
      var rightHTML = getPageHTML(rightNum, adminState);

      var wrapper = document.createElement('div');
      wrapper.className = 'preview-spread-wrapper';
      wrapper.style.transform = 'scale(' + finalScale + ')';
      wrapper.style.transformOrigin = 'top center';
      wrapper.innerHTML =
        '<div style="border-right: 1px solid rgba(255,255,255,0.05);">' + leftHTML + '</div>' +
        '<div>' + rightHTML + '</div>';
      container.appendChild(wrapper);

      container.scrollTop = scrollTop;
      container.scrollLeft = scrollLeft;
      if (container.parentElement) {
        container.parentElement.scrollTop = parentScrollTop;
        container.parentElement.scrollLeft = parentScrollLeft;
      }
    },

    renderAll: function(adminState) {
      if (!container || !adminState) return;
      var scrollTop = container.scrollTop;
      var scrollLeft = container.scrollLeft;
      var parentScrollTop = container.parentElement ? container.parentElement.scrollTop : 0;
      var parentScrollLeft = container.parentElement ? container.parentElement.scrollLeft : 0;

      container.innerHTML = '';

      var cw = container.clientWidth - 40;
      var baseScale = Math.min(cw / 400, 0.55);
      var finalScale = baseScale * zoomLevel;

      var orderedIds = adminState.getOrderedPageIds();
      var innerHTML = '';
      var spreadGap = '10px';

      if (orderedIds.length > 0) {
        innerHTML += '<div class="preview-spread-row" style="display:flex;gap:' + spreadGap + ';margin-bottom:' + spreadGap + ';">';
        innerHTML += '<div class="preview-page-slot">' + getPageHTML(orderedIds[0], adminState) + '</div>';
        innerHTML += '</div>';
      }

      for (var i = 1; i < orderedIds.length - 1; i += 2) {
        var leftPage = orderedIds[i];
        var rightPage = orderedIds[i + 1] || 0;
        innerHTML += '<div class="preview-spread-row" style="display:flex;gap:' + spreadGap + ';margin-bottom:' + spreadGap + ';">';
        innerHTML += '<div class="preview-page-slot">' + getPageHTML(leftPage, adminState) + '</div>';
        if (rightPage > 0) {
          innerHTML += '<div class="preview-page-slot">' + getPageHTML(rightPage, adminState) + '</div>';
        }
        innerHTML += '</div>';
      }

      var lastIdx = orderedIds.length - 1;
      if (orderedIds.length > 1 && orderedIds.length % 2 === 0) {
        innerHTML += '<div class="preview-spread-row" style="display:flex;gap:' + spreadGap + ';margin-bottom:' + spreadGap + ';">';
        innerHTML += '<div class="preview-page-slot">' + getPageHTML(orderedIds[lastIdx], adminState) + '</div>';
        innerHTML += '</div>';
      }

      var allWrapper = document.createElement('div');
      allWrapper.style.transform = 'scale(' + finalScale + ')';
      allWrapper.style.transformOrigin = 'top center';
      allWrapper.innerHTML = innerHTML;
      container.appendChild(allWrapper);

      container.scrollTop = scrollTop;
      container.scrollLeft = scrollLeft;
      if (container.parentElement) {
        container.parentElement.scrollTop = parentScrollTop;
        container.parentElement.scrollLeft = parentScrollLeft;
      }
    },

    getPageHTML: getPageHTML
  };
})();
