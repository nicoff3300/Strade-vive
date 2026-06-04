/**
 * Radar Chart Generator Module
 * Generates inline SVG strings for print-quality taste map radar charts
 * 
 * 4-axis radar: S (Dolce/Sweet), A (Acido/Acid), B (Amaro/Bitter), F (Lab Factor)
 */

/**
 * Generate a radar chart SVG from drink taste data
 * @param {Object} drinkData - Drink data with name and taste profile
 * @param {Object} config - Chart configuration
 * @returns {string} - Self-contained SVG string
 */
function generateRadar(drinkData, config) {
  // Default configuration
  var defaultConfig = {
    width: 300,
    height: 300,
    colors: {
      grid: '#e0e0e0',
      area: '#FF6B35',
      axis: '#333333',
      text: '#333333'
    },
    opacity: 0.3
  };
  
  // Merge provided config with defaults (avoiding ES6 optional chaining / nullish coalescing)
  var cfg = {
    width: (config && config.width !== undefined) ? config.width : defaultConfig.width,
    height: (config && config.height !== undefined) ? config.height : defaultConfig.height,
    colors: {
      grid: (config && config.colors && config.colors.grid !== undefined) ? config.colors.grid : defaultConfig.colors.grid,
      area: (config && config.colors && config.colors.area !== undefined) ? config.colors.area : defaultConfig.colors.area,
      axis: (config && config.colors && config.colors.axis !== undefined) ? config.colors.axis : defaultConfig.colors.axis,
      text: (config && config.colors && config.colors.text !== undefined) ? config.colors.text : defaultConfig.colors.text
    },
    opacity: (config && config.opacity !== undefined) ? config.opacity : defaultConfig.opacity
  };
  
  // Chart dimensions
  var cx = cfg.width / 2;
  var cy = cfg.height / 2;
  var maxRadius = Math.min(cfg.width, cfg.height) / 2 - 50; // Leave room for labels
  
  // 4 axes: Sweet (top), Acid (right), Bitter (bottom), Lab (left)
  var angleOffsets = [270, 0, 90, 180].map(function(deg) {
    return (deg * Math.PI) / 180;
  });
  var axisFullLabels = ['Dolce', 'Acido', 'Amaro', 'Lab'];
  
  // Helper: Get point position for a value on an axis
  function getAxisPoint(axisIndex, value, maxValue) {
    if (maxValue === undefined) maxValue = 5;
    var angle = angleOffsets[axisIndex];
    var radius = (value / maxValue) * maxRadius;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  }
  
  // Build SVG content
  var svgContent = '';
  
  // Background (transparent)
  svgContent += '<rect width="' + cfg.width + '" height="' + cfg.height + '" fill="transparent"/>';
  
  // Draw 5 concentric diamond rings (scale 0-5)
  svgContent += '<g class="radar-rings">';
  for (var ring = 1; ring <= 5; ring++) {
    var points = [];
    for (var axis = 0; axis < 4; axis++) {
      var pt = getAxisPoint(axis, ring);
      points.push(pt.x + ',' + pt.y);
    }
    svgContent += '<polygon points="' + points.join(' ') + '" fill="none" stroke="' + cfg.colors.grid + '" stroke-width="1" opacity="' + (0.3 + ring * 0.05) + '"/>';
  }
  svgContent += '</g>';
  
  // Draw 4 axis lines
  svgContent += '<g class="radar-axes">';
  for (var axis = 0; axis < 4; axis++) {
    var pt = getAxisPoint(axis, 5);
    svgContent += '<line x1="' + cx + '" y1="' + cy + '" x2="' + pt.x + '" y2="' + pt.y + '" stroke="' + cfg.colors.axis + '" stroke-width="1.5"/>';
  }
  svgContent += '</g>';
  
  // Draw filled area polygon for taste profile
  if (drinkData && drinkData.taste) {
    var tastePoints = [];
    var values = [
      drinkData.taste.sweet !== undefined ? drinkData.taste.sweet : 0,
      drinkData.taste.acid !== undefined ? drinkData.taste.acid : 0,
      drinkData.taste.bitter !== undefined ? drinkData.taste.bitter : 0,
      drinkData.taste.labFactor !== undefined ? drinkData.taste.labFactor : 0
    ];
    
    for (var axis = 0; axis < 4; axis++) {
      var pt = getAxisPoint(axis, values[axis]);
      tastePoints.push(pt.x + ',' + pt.y);
    }
    
    // Filled polygon without glow
    svgContent += '<polygon points="' + tastePoints.join(' ') + '" fill="#000000" stroke="#000000" stroke-width="2" fill-opacity="0.3" class="taste-area"/>';
    
    // Corner points on the area
    for (var axis = 0; axis < 4; axis++) {
      var pt = getAxisPoint(axis, values[axis]);
      svgContent += '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="4" fill="#000000" stroke="#ffffff" stroke-width="1.5"/>';
    }
  }
  
  // Draw axis labels at tips
  svgContent += '<g class="radar-labels">';
  for (var axis = 0; axis < 4; axis++) {
    var pt = getAxisPoint(axis, 5.5);
    var fullLabel = axisFullLabels[axis];
    
    var textAnchor = 'middle';
    if (fullLabel === 'Acido') textAnchor = 'start';
    if (fullLabel === 'Lab') textAnchor = 'end';
    
    var labelY = pt.y;
    if (fullLabel === 'Amaro') {
      labelY += 10;
    }
    
    svgContent += '<text x="' + pt.x + '" y="' + labelY + '" text-anchor="' + textAnchor + '" font-family="ABC Camera, system-ui, sans-serif" font-size="15" fill="#000000">' + fullLabel + '</text>';
  }
  svgContent += '</g>';
  
  // Wrap in SVG element
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + cfg.width + '" height="' + cfg.height + '" viewBox="0 0 ' + cfg.width + ' ' + cfg.height + '" role="img" aria-label="Taste map radar chart for ' + ((drinkData && drinkData.name) ? drinkData.name : 'Unknown drink') + '">' + svgContent + '</svg>';
  
  return svg;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateRadar: generateRadar };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
  window.RadarChart = { generateRadar: generateRadar };
}