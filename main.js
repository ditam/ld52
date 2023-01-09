
const WIDTH = 800;
const HEIGHT = 500;

const ROWS = 3;
const COLS = 5;

const map = [];

let body, container, picker;

// These colors are available in the picker. Other colors (e.g. black, gold) can be valid, but not pickable.
// TODO: keep in sync with CSS - apply CSS rules dynamically?
// TODO: use color objects, with readable name and CSS color codes
const colors = ['red', 'green', 'blue', 'brown', 'gray'];

function deepCopy(o) {
  return JSON.parse(JSON.stringify(o));
}

function getCurrentColor() {
  return colors.filter(color => body.hasClass(color))[0];
}

function switchToNextColor() {
  const currentColor = getCurrentColor();
  const currentIndex = colors.findIndex(color => {
    return color === currentColor;
  });

  console.assert(body.hasClass(currentColor), 'Invalid current color state');
  console.assert(colors[currentIndex] === currentColor, 'Color index error');

  body.removeClass(currentColor);

  const nextIndex = (currentIndex + 1) % (colors.length);
  const nextColor = colors[nextIndex];
  body.addClass(nextColor);

  console.log('Color is now:', nextColor);

  // picker shows the upcoming color
  const nextNextIndex = (nextIndex + 1) % (colors.length);
  picker.css('background-color', colors[nextNextIndex]);
}

function generate() {
  for (let i=0; i<ROWS; i++) {
    const row = [];
    const rowEl = $('<div></div>').addClass('row').appendTo(container);
    for (let j=0; j<COLS; j++) {
      const cellEl = $('<div></div>').addClass('cell').appendTo(rowEl);
      const cell = {
        rowIndex: i,
        cellIndex: j,
        color: 'black',
        el: cellEl // NB: this is why the map can not be deep copied naively
      };
      row.push(cell);

      // when clicked, it is painted, and the color is updated in the map representation
      cellEl.on('click', () => {
        const color = getCurrentColor();
        cellEl.css('background-color', color);
        cell.color = color;

        checkComplete();
      });
    }
    map.push(row);
  }
  console.log('done:', map);
}

function checkComplete() {
  const isCellFilled = (c) => c.color !== 'black';
  const isRowFilled = (r) => r.every(isCellFilled);
  const complete = map.every(isRowFilled);
  console.log('Complete:', complete);
  if (complete) {
    harvest();
  }
}

function forEachCellOfType(type, fn) {
  map.forEach(row => {
    row.forEach(cell => {
      if (cell.color === type) {
        fn(cell);
      }
    });
  });
}

function countNeighboursOfType(targetCell, type) {
  const neighbours = [];

  for (let i=0; i<ROWS; i++) {
    const row = map[i];
    for (let j=0; j<COLS; j++) {
      const cell = row[j];
      if (
        targetCell !== cell && // not neighbouring self
        (Math.abs(targetCell.rowIndex - i) <= 1) &&
        (Math.abs(targetCell.cellIndex - j) <= 1)
      ) {
        neighbours.push(cell);
      }
    }
  }

  let count = 0;
  neighbours.forEach(n => {
    if (n.color === type) {
      count++;
    }
  });

  return count;
}

// TODO: async delays to apply UI effects
function applyMapChanges(mapChanges) {
  for (let i=0; i<ROWS; i++) {
    for (let j=0; j<COLS; j++) {
      const cell = map[i][j];
      const change = mapChanges[i][j];
      if (change.deletion === true) {
        cell.color = 'black';
      } else if (change.ripens === true) {
        cell.color = 'gold';
      }
      cell.el.css('background-color', cell.color);
    }
  }
}

function harvest() {
  // TODO: blockInteractions

  // to mutate the map in stages, we keep track of the new state, we do not modify during scanning
  let mapChanges;
  function getClearChangeset() {
    let changeSet = [];
    for (let i=0; i<ROWS; i++) {
      const row = [];
      for (let j=0; j<COLS; j++) {
        const cell = {};
        row.push(cell);
      }
      changeSet.push(row);
    }
    return changeSet;
  }

  // === Apply harvest rules stage by stage. ===
  // water not next to ground seeps away
  mapChanges = getClearChangeset();
  forEachCellOfType('blue', c => {
    if (countNeighboursOfType(c, 'brown') < 1) {
      mapChanges[c.rowIndex][c.cellIndex] = {
        deletion: true
      };
    }
  });
  applyMapChanges(mapChanges);

  // plants not next to water wither
  mapChanges = getClearChangeset();
  forEachCellOfType('green', c => {
    if (countNeighboursOfType(c, 'blue') < 1) {
      mapChanges[c.rowIndex][c.cellIndex] = {
        deletion: true
      };
    }
  });
  applyMapChanges(mapChanges);

  // remaining plants turn to wheat
  mapChanges = getClearChangeset();
  forEachCellOfType('green', c => {
    mapChanges[c.rowIndex][c.cellIndex] = {
      ripens: true
    };
  });
  applyMapChanges(mapChanges);

  // wheat not in range of harvesters is discarded
  mapChanges = getClearChangeset();
  forEachCellOfType('gold', c => {
    if (countNeighboursOfType(c, 'gray', 2) < 1) {
      mapChanges[c.rowIndex][c.cellIndex] = {
        deletion: true
      };
    }
  });
  applyMapChanges(mapChanges);

  // TODO: unblock interactions
}

$(document).ready(function() {
  console.log('Hello H');

  body = $('body');
  container = $('#container');
  picker = $('#picker');

  picker.on('click', switchToNextColor);

  generate();
});
