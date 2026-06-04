window.AdminWebGL = (function() {
  var canvas = null;
  var ctx = null;
  var shapesMap = {};
  var shapesLoaded = false;
  var SRC_W = 540;
  var SRC_H = 675;

  var files = [
    'Forma_1.svg','Forma_3.svg','Forma_5.svg','Forma_6.svg','Forma_9.svg',
    'Forma_11.svg','Forma_12.svg','Forma_13.svg','Forma_14.svg','Forma_15.svg',
    'Forma_16.svg','Forma_17.svg','Forma_18.svg','Forma_20.svg',
    'Forma_100.svg','Forma_101.svg','Forma_102.svg'
  ];

  function loadSVGs() {
    if (shapesLoaded) return Promise.resolve(shapesMap);
    var promises = files.map(function(f) {
      return new Promise(function(resolve) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'svgs/' + f, true);
        xhr.overrideMimeType('text/plain');
        xhr.onload = function() {
          if (xhr.status === 200) {
            var text = xhr.responseText;
            var match = text.match(/<(polygon|ellipse|rect|circle|path)[^>]*>/);
            if (match) {
              var raw = match[0];
              if (raw.indexOf('/>') === -1) raw = raw.slice(0, -1) + '/>';
              var cleaned = raw.replace(/\s+class="[^"]*"/g, '');
              var name = f.replace('.svg', '');
              resolve({ name: name, element: cleaned });
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
        xhr.onerror = function() { resolve(null); };
        xhr.send();
      });
    });
    return Promise.all(promises).then(function(results) {
      shapesMap = {};
      for (var i = 0; i < results.length; i++) {
        if (results[i]) {
          shapesMap[results[i].name] = results[i].element;
        }
      }
      shapesLoaded = true;
      console.log('[WebGL] Loaded ' + Object.keys(shapesMap).length + ' SVG shapes as text');
      return shapesMap;
    });
  }

  function parsePaletteIndices(indices) {
    var defaultColors = ['#1d1b39','#4c4d9b','#7bbebc','#939c69','#f2cd77','#e3bfd7','#c66845','#6b342c'];
    var pal = window.AdminState ? window.AdminState.getPaletteColors() : defaultColors;
    if (!indices || indices.length === 0) return pal;
    var selected = [];
    for (var i = 0; i < indices.length; i++) {
      if (indices[i] >= 0 && indices[i] < pal.length) {
        selected.push(pal[indices[i]]);
      }
    }
    return selected.length ? selected : pal;
  }

  function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function generateLayout(config) {
    var perRow = config.perRow, marginX = config.marginX, marginY = config.marginY;
    var gapX = config.gapX, gapY = config.gapY, bigTiles = config.bigTiles;
    var bigTileProb = config.bigTileProb, bigTileMode = config.bigTileMode;

    var availW = SRC_W - 2 * marginX - gapX * (perRow - 1);
    var cellW = availW / perRow;
    var cellH = cellW * (SRC_H / SRC_W);
    var availH = SRC_H - 2 * marginY;
    var rows = 0, used = 0;
    while (used + cellH <= availH + 0.01) {
      used += (rows === 0) ? cellH : gapY + cellH;
      rows++;
    }
    if (rows < 1) rows = 1;
    var cols = perRow;
    var occupied = [];
    for (var ri = 0; ri < rows; ri++) { occupied[ri] = []; for (var ci = 0; ci < cols; ci++) occupied[ri][ci] = false; }
    var blocks = [];

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (occupied[r][c]) continue;
        var sw = 1, sh = 1;
        if (bigTiles && Math.random() < bigTileProb) {
          var mode = bigTileMode === 'auto' ? randomChoice(['2x1','1x2','2x2']) : bigTileMode;
          if (mode === '2x1') { sw = 2; sh = 1; }
          else if (mode === '1x2') { sw = 1; sh = 2; }
          else { sw = 2; sh = 2; }
          var canPlace = (r + sh <= rows && c + sw <= cols);
          if (canPlace) {
            for (var rr = r; rr < r + sh; rr++)
              for (var cc = c; cc < c + sw; cc++)
                if (occupied[rr][cc]) canPlace = false;
          }
          if (!canPlace) { sw = 1; sh = 1; }
        }
        for (var rr2 = r; rr2 < r + sh; rr2++)
          for (var cc2 = c; cc2 < c + sw; cc2++)
            occupied[rr2][cc2] = true;
        var bw = sw * cellW + (sw - 1) * gapX;
        var bh = sh * cellH + (sh - 1) * gapY;
        var bx = marginX + c * (cellW + gapX);
        var by = marginY + r * (cellH + gapY);
        blocks.push({ bx: bx, by: by, bw: bw, bh: bh, cols: sw, rows: sh });
      }
    }
    return blocks;
  }

  function buildDefs() {
    var names = Object.keys(shapesMap);
    var defs = '';
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      defs += '<g id="s-' + name + '"><g transform="translate(-270,-337.5)">' + shapesMap[name] + '</g></g>';
    }
    return defs;
  }

  function generateSVG(config) {
    var palette = parsePaletteIndices(config.paletteIndices);
    var bgColor = palette[0];
    var pool = palette.slice(1);
    var blocks = generateLayout(config);
    var shapeNames = Object.keys(shapesMap);

    var rects = '';
    for (var j = 0; j < blocks.length; j++) {
      var block = blocks[j];
      var blockColor = randomChoice(pool.length ? pool : palette);
      rects += '<rect x="' + block.bx + '" y="' + block.by + '" width="' + block.bw + '" height="' + block.bh + '" fill="' + blockColor + '"/>';
    }

    var uses = '';
    if (shapeNames.length > 0) {
      for (var k = 0; k < blocks.length; k++) {
        var block2 = blocks[k];
        var usePairs = config.usePairs;
        if ((usePairs && k % 2 === 0) || !usePairs) {
          var shapeColor = randomChoice(pool.length ? pool : palette);
          var shapeName = randomChoice(shapeNames);
          var cx = block2.bx + block2.bw / 2;
          var cy = block2.by + block2.bh / 2;
          var scale = Math.min(block2.bw / SRC_W, block2.bh / SRC_H);
          uses += '<use href="#s-' + shapeName + '" fill="' + shapeColor + '" transform="translate(' + cx + ',' + cy + ') scale(' + scale + ')"/>';
        }
      }
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 675" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">' +
      '<rect width="540" height="675" fill="' + bgColor + '"/>' +
      '<defs>' + buildDefs() + '</defs>' +
      rects +
      uses +
      '</svg>';
  }

  function renderSVGToCanvas(svgStr) {
    if (!ctx || !canvas) return;
    var img = new Image();
    var blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    img.onload = function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return {
    init: function(canvasId) {
      canvas = document.getElementById(canvasId);
      if (canvas) {
        canvas.width = SRC_W;
        canvas.height = SRC_H;
        ctx = canvas.getContext('2d');
      }
      loadSVGs().then(function() {
        if (canvas && ctx) {
          var defaultCfg = {
            paletteIndices: [0, 1, 2, 3, 4, 5],
            perRow: 4, marginX: 0, marginY: 0, gapX: 0, gapY: 0,
            bigTiles: true, bigTileProb: 0.3, bigTileMode: '2x2', usePairs: false
          };
          var svgStr = generateSVG(defaultCfg);
          renderSVGToCanvas(svgStr);
        }
      });
      return this;
    },

    generate: function(config) {
      return generateSVG(config);
    },

    generateLive: function(config) {
      if (!canvas || !ctx) return;
      var svgStr = generateSVG(config);
      renderSVGToCanvas(svgStr);
    },

    generateAsync: function(config) {
      var svgStr = generateSVG(config);
      return Promise.resolve(svgStr);
    },

    getConfig: function() {
      var indices = [];
      var swatches = document.querySelectorAll('#webglPaletteSwatches .color-swatch');
      if (swatches.length > 0) {
        for (var i = 0; i < swatches.length; i++) {
          if (swatches[i].classList.contains('active')) {
            var idx = parseInt(swatches[i].getAttribute('data-idx'), 10);
            if (!isNaN(idx)) indices.push(idx);
          }
        }
      }
      // Fallback to data attribute on container
      if (indices.length === 0) {
        var container = document.getElementById('webglPaletteSwatches');
        if (container && container.getAttribute('data-indices')) {
          var parsed = JSON.parse(container.getAttribute('data-indices'));
          if (Array.isArray(parsed)) indices = parsed;
        }
      }
      if (indices.length === 0) indices = [0, 1, 2, 3, 4, 5];
      return {
        paletteIndices: indices,
        perRow: parseInt(document.getElementById('webglPerRow') ? document.getElementById('webglPerRow').value : 4) || 4,
        marginX: parseInt(document.getElementById('webglMarginX') ? document.getElementById('webglMarginX').value : 0) || 0,
        marginY: parseInt(document.getElementById('webglMarginY') ? document.getElementById('webglMarginY').value : 0) || 0,
        gapX: parseInt(document.getElementById('webglGapX') ? document.getElementById('webglGapX').value : 0) || 0,
        gapY: parseInt(document.getElementById('webglGapY') ? document.getElementById('webglGapY').value : 0) || 0,
        bigTiles: document.getElementById('webglBigTiles') ? document.getElementById('webglBigTiles').checked : true,
        bigTileProb: parseFloat(document.getElementById('webglBigTileProb') ? document.getElementById('webglBigTileProb').value : 0.3) || 0.3,
        bigTileMode: document.getElementById('webglBigTileMode') ? document.getElementById('webglBigTileMode').value : '2x2',
        usePairs: document.getElementById('webglUsePairs') ? document.getElementById('webglUsePairs').checked : false
      };
    },

    isApiAvailable: function() {
      return new Promise(function(resolve) {
        try {
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', 'svgs/Forma_1.svg', true);
          xhr.timeout = 2000;
          xhr.onload = function() { resolve(xhr.status === 200); };
          xhr.onerror = function() { resolve(false); };
          xhr.ontimeout = function() { resolve(false); };
          xhr.send();
        } catch(e) { resolve(false); }
      });
    }
  };
})();
