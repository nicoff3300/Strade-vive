function initMenu() {
  return fetch('data/drinks.json')
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      var container = document.getElementById('menuApp');
      if (!container) return;
      
      // Page 1: Cover
      var cover = document.createElement('div');
      cover.className = 'single-page-wrapper';
      cover.innerHTML = '<section class="page cover">' +
        '<div class="cover-title">' + (data.title || '') + '</div>' +
        '<div class="cover-subtitle">' + (data.subtitle || '') + '</div>' +
        '</section>';
      container.appendChild(cover);

      // Page 2: Prefazione
      var prefa = document.createElement('div');
      prefa.className = 'single-page-wrapper';
      var prefaContent = (data.prefazione || []).map(function(p, i) {
        if (i === 0) return '<h2 class="display-medium">' + p + '</h2>';
        if (p.indexOf('"') === 0) return '<div class="quote">' + p + '</div>';
        if (p.indexOf('—') === 0) return '<div class="quote-cite">' + p + '</div>';
        return '<p>' + p + '</p>';
      }).join('<br>');
      
      prefa.innerHTML = '<section class="page" style="justify-content: flex-start; padding-top: 40mm;">' +
        '<div style="width:100%">' + prefaContent + '</div>' +
        '<div class="page-number">Pag. 2</div>' +
        '</section>';
      container.appendChild(prefa);

      // Pages 3-18: Drink Spreads
      var signatureDrinks = (data.drinks || []).filter(function(d) {
        return d.category === 'Signature';
      });
      
      for (var i = 0; i < signatureDrinks.length; i += 2) {
        var drinkL = signatureDrinks[i];
        
        var spread = document.createElement('div');
        spread.className = 'spread';
        
        var pageL = document.createElement('section');
        pageL.className = 'page drink-detail';
        
        var chartSvg = window.RadarChart ? window.RadarChart.generateRadar(drinkL, {
          size: 150,
          colors: { primary: '#F2CD77', secondary: '#7BBEBC' }
        }) : '<div class="chart-placeholder">Radar Chart Missing</div>';

        pageL.innerHTML = '<div class="display-large">' + (drinkL.name || '') + '</div>' +
          '<div class="profile-tag">' + (drinkL.profile || '') + '</div>' +
          '<ul class="ingredient-list">' +
            (drinkL.ingredients || []).map(function(ing) { return '<li>' + ing + '</li>'; }).join('') +
          '</ul>' +
          '<div class="radar-chart-container">' + chartSvg + '</div>' +
          '<div class="page-number">Pag. ' + (3 + i) + '</div>';

        var pageR = document.createElement('section');
        pageR.className = 'page webgl-placeholder';
        pageR.innerHTML = '<div class="display-medium">[Immagine: ' + (drinkL.name || '') + ']</div>' +
          '<div class="page-number">Pag. ' + (4 + i) + '</div>';

        spread.appendChild(pageL);
        spread.appendChild(pageR);
        container.appendChild(spread);
      }
    })
    .catch(function(e) {
      console.error("Init error:", e);
    });
}

function renderMenu() {
  var container = document.getElementById('menuApp');
  if (!container) return;
  container.innerHTML = '';
  
  return fetch('data/drinks.json')
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      // Page 1
      var wrap1 = document.createElement('div');
      wrap1.className = 'single-page-wrapper';
      wrap1.innerHTML = '<section class="page cover"><div class="cover-title">' + (data.title || '') + '</div><div class="cover-subtitle">' + (data.subtitle || '') + '</div></section>';
      container.appendChild(wrap1);

      // Page 2
      var wrap2 = document.createElement('div');
      wrap2.className = 'single-page-wrapper';
      var prefaText = (data.prefazione || []).map(function(p, i) {
        if (i === 0) return '<h2 class="display-medium">' + p + '</h2>';
        if (p.indexOf('"') === 0) return '<div class="quote">' + p + '</div>';
        if (p.indexOf('—') === 0) return '<div class="quote-cite">' + p + '</div>';
        return '<p>' + p + '</p>';
      }).join('<br>');
      wrap2.innerHTML = '<section class="page" style="justify-content: flex-start; padding-top: 40mm;"><div style="width:100%">' + prefaText + '</div><div class="page-number">Pag. 2</div></section>';
      container.appendChild(wrap2);

      // Pages 3-18 (Signature Spreads)
      var sigs = (data.drinks || []).filter(function(d) {
        return d.category === 'Signature';
      });
      for (var i = 0; i < 8; i++) {
        var drink = sigs[i];
        if (!drink) continue;
        var pgNumL = 3 + (i * 2);
        var pgNumR = 4 + (i * 2);
        
        var spread = document.createElement('div');
        spread.className = 'spread';
        
        var pageL = document.createElement('section');
        pageL.className = 'page drink-detail';
        var chart = window.RadarChart ? window.RadarChart.generateRadar(drink, { size: 160 }) : 'Chart Error';
        pageL.innerHTML = '<div class="display-large">' + (drink.name || '') + '</div>' +
          '<div class="profile-tag">' + (drink.profile || '') + '</div>' +
          '<ul class="ingredient-list">' +
            (drink.ingredients || []).map(function(ing) { return '<li>' + ing + '</li>'; }).join('') +
          '</ul>' +
          '<div class="radar-chart-container">' + chart + '</div>' +
          '<div class="page-number">Pag. ' + pgNumL + '</div>';
        
        var pageR = document.createElement('section');
        pageR.className = 'page webgl-placeholder';
        pageR.innerHTML = '<div class="display-medium">[Immagine: ' + (drink.name || '') + ']</div><div class="page-number">Pag. ' + pgNumR + '</div>';
        
        spread.appendChild(pageL);
        spread.appendChild(pageR);
        container.appendChild(spread);
      }

      // Page 19: Intramontabili
      var intra = (data.drinks || []).filter(function(d) {
        return d.category && d.category.indexOf('INTRAMONTABILI') !== -1;
      });
      var wrap19 = document.createElement('div');
      wrap19.className = 'single-page-wrapper';
      wrap19.innerHTML = '<section class="page" style="justify-content: flex-start; padding-top: 30mm;">' +
        '<h2 class="display-medium">Le Nostre Proposte Intramontabili</h2>' +
        '<div class="list-container">' +
          intra.map(function(d) { return laItem(d); }).join('') +
        '</div>' +
        '<div class="page-number">Pag. 19</div>' +
        '</section>';
      container.appendChild(wrap19);

      // Page 20: After Dinner
      var after = (data.drinks || []).filter(function(d) {
        return d.category && d.category.indexOf('AFTER DINNER') !== -1;
      });
      var wrap20 = document.createElement('div');
      wrap20.className = 'single-page-wrapper';
      wrap20.innerHTML = '<section class="page" style="justify-content: flex-start; padding-top: 30mm;">' +
        '<h2 class="display-medium">After Dinner</h2>' +
        '<div class="list-container">' +
          after.map(function(d) { return laItem(d); }).join('') +
        '</div>' +
        '<div class="page-number">Pag. 20</div>' +
        '</section>';
      container.appendChild(wrap20);

      // Page 21: Analcolici
      var alcoholFree = (data.drinks || []).filter(function(d) {
        return d.category === 'Alcohol Free';
      });
      var wrap21 = document.createElement('div');
      wrap21.className = 'single-page-wrapper';
      wrap21.innerHTML = '<section class="page" style="justify-content: flex-start; padding-top: 30mm;">' +
        '<h2 class="display-medium">Analcolici</h2>' +
        '<div class="list-container">' +
          alcoholFree.map(function(d) { return laItem(d); }).join('') +
        '</div>' +
        '<div class="page-number">Pag. 21</div>' +
        '</section>';
      container.appendChild(wrap21);

      // Page 22: Vermouth Experience
      var ve = data.vermouth_experience || { vermouth: [], bitter: [], spezie: [] };
      var wrap22 = document.createElement('div');
      wrap22.className = 'single-page-wrapper';
      wrap22.innerHTML = '<section class="page" style="justify-content: flex-start; padding-top: 30mm;">' +
        '<h2 class="display-medium">The Spiritual Machine</h2>' +
        '<div class="vermouth-grid">' +
          '<div class="vermouth-col">' +
            '<h4>Vermouth</h4>' +
            '<ul>' + (ve.vermouth || []).map(function(v) { return '<li>' + v + '</li>'; }).join('') + '</ul>' +
          '</div>' +
          '<div class="vermouth-col">' +
            '<h4>Bitter</h4>' +
            '<ul>' + (ve.bitter || []).map(function(b) { return '<li>' + b + '</li>'; }).join('') + '</ul>' +
          '</div>' +
          '<div class="vermouth-col">' +
            '<h4>Spezie</h4>' +
            '<ul>' + (ve.spezie || []).map(function(s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="page-number">Pag. 22</div>' +
        '</section>';
      container.appendChild(wrap22);

      // Page 23: Colophon
      var wrap23 = document.createElement('div');
      wrap23.className = 'single-page-wrapper';
      wrap23.innerHTML = '<section class="page" style="justify-content: center; text-align: center;">' +
        '<div class="display-medium">BP LAB 2026</div>' +
        '<div style="font-size: 9pt; color: var(--color-text-muted); margin-top: 20px;">' +
          '© 2026 BP LAB. All rights reserved.<br>' +
          'Design: Visual Studio / Sisyphus' +
        '</div>' +
        '<div class="page-number">Pag. 23</div>' +
        '</section>';
      container.appendChild(wrap23);

      // Page 24: Back Cover
      var wrap24 = document.createElement('div');
      wrap24.className = 'single-page-wrapper';
      wrap24.innerHTML = '<section class="page webgl-placeholder">' +
        '<div class="display-medium">[WebGL Background — Back Cover]</div>' +
        '<div class="page-number">Pag. 24</div>' +
        '</section>';
      container.appendChild(wrap24);
    })
    .catch(function(e) {
      console.error("Render error:", e);
    });
}

function laItem(drink) {
  return '<div class="list-item">' +
    '<div class="list-item-header">' +
      '<span class="list-item-name">' + (drink.name || '') + '</span>' +
      '<span class="list-item-profile">' + (drink.profile || '') + '</span>' +
    '</div>' +
    '<div class="list-item-ingredients">' + (drink.ingredients || []).join(', ') + '</div>' +
    '</div>';
}

renderMenu();
