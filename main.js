
const WIDTH = 800;
const HEIGHT = 500;

const levels = [
  {
    COLS: 3,
    ROWS: 3,
    SCORE: 4
  }, {
    COLS: 5,
    ROWS: 4,
    SCORE: 10
  }, {
    COLS: 7,
    ROWS: 4,
    SCORE: 20
  }
];

let currentLevel = 0;

const map = [];

let body, container, picker;

// These colors are available in the picker. Other colors (e.g. black, gold) can be valid, but not pickable.
// TODO: keep in sync with CSS - apply CSS rules dynamically?
// TODO: use color objects, with readable name and CSS color codes
const colors = ['red', 'green', 'blue', 'brown', 'gray'];

function deepCopy(o) {
  return JSON.parse(JSON.stringify(o));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  // delete any existing map
  map.forEach(row => {
    row.forEach(cell => {
      cell.el.remove();
    });
  });
  // empty array (truncating because const)
  map.length = 0;

  // generate map of current level
  for (let i=0; i<levels[currentLevel].ROWS; i++) {
    const row = [];
    const rowEl = $('<div></div>').addClass('row').appendTo(container);
    for (let j=0; j<levels[currentLevel].COLS; j++) {
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
        if (body.hasClass('loading')) {
          return;
        }
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

function countNeighboursOfType(targetCell, type, range = 1) {
  const neighbours = [];

  for (let i=0; i<levels[currentLevel].ROWS; i++) {
    const row = map[i];
    for (let j=0; j<levels[currentLevel].COLS; j++) {
      const cell = row[j];
      if (
        targetCell !== cell && // not neighbouring self
        (Math.abs(targetCell.rowIndex - i) <= range) &&
        (Math.abs(targetCell.cellIndex - j) <= range)
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
  for (let i=0; i<levels[currentLevel].ROWS; i++) {
    for (let j=0; j<levels[currentLevel].COLS; j++) {
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

async function harvest() {
  console.log('starting harvest...');
  body.addClass('loading');

  // to mutate the map in stages, we keep track of the new state, we do not modify during scanning
  let mapChanges;
  function getClearChangeset() {
    let changeSet = [];
    for (let i=0; i<levels[currentLevel].ROWS; i++) {
      const row = [];
      for (let j=0; j<levels[currentLevel].COLS; j++) {
        const cell = {};
        row.push(cell);
      }
      changeSet.push(row);
    }
    return changeSet;
  }

  // === Apply harvest rules stage by stage. ===
  // water not next to ground seeps away
  await delay(500);
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
  await delay(500);
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
  await delay(500);
  mapChanges = getClearChangeset();
  forEachCellOfType('green', c => {
    mapChanges[c.rowIndex][c.cellIndex] = {
      ripens: true
    };
  });
  applyMapChanges(mapChanges);

  // wheat not in range of harvesters is discarded
  await delay(500);
  mapChanges = getClearChangeset();
  forEachCellOfType('gold', c => {
    if (countNeighboursOfType(c, 'gray', 2) < 1) {
      mapChanges[c.rowIndex][c.cellIndex] = {
        deletion: true
      };
    }
  });
  applyMapChanges(mapChanges);

  // TODO: fade or delete non-wheat tiles for visible score
  // TODO: show score

  // score check (score is the remaining wheat)
  await delay(500);
  if (countNeighboursOfType(map[0][0], 'gold', 1000) >= levels[currentLevel].SCORE) {
    // increment level if possible
    if (levels[currentLevel + 1]) {
      currentLevel = currentLevel + 1;
    }
    // TODO: else: congrats
  }

  generate();

  body.removeClass('loading');
}

$(document).ready(function() {
  console.log('Hello H');

  body = $('body');
  container = $('#container');
  picker = $('#picker');

  picker.on('click', switchToNextColor);

  generate();
});
