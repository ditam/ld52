
const WIDTH = 800;
const HEIGHT = 500;

const levels = [
  {
    ROWS: 3,
    COLS: 3,
    SCORE: 4
  }, {
    ROWS: 4,
    COLS: 5,
    SCORE: 8
  }, {
    ROWS: 4,
    COLS: 8,
    SCORE: 15
  }, {
    ROWS: 5,
    COLS: 10,
    SCORE: 25
  }
];

let currentLevel = 0;

const map = [];

let body, container, picker, targetScore;
let bgMusic;
const sounds = {};

// These colors are available in the picker. Other colors (e.g. transparent, gold) can be valid, but not pickable.
// TODO: keep in sync with CSS - apply CSS rules dynamically?
// TODO: use color objects, with readable name and CSS color codes
const colors = ['red', 'green', 'blue', 'sienna', 'gray'];

function deepCopy(o) {
  return JSON.parse(JSON.stringify(o));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCurrentColor() {
  return colors.filter(color => body.hasClass(color))[0];
}

let clickCount = 0;
function playClickSound() {
  const clicks = [
    sounds.click01,
    sounds.click02,
    sounds.click03,
    sounds.click03,
    sounds.click02,
    sounds.click01
  ];
  clicks[clickCount % clicks.length].play();
  clickCount++;
}

function switchToNextColor() {
  if (body.hasClass('loading')) {
    return;
  }

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

  // picker shows the upcoming color
  const nextNextIndex = (nextIndex + 1) % (colors.length);
  picker.css('background-color', colors[nextNextIndex]);

  sounds.toggle.play();
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
      const cellEl = $('<div></div>').addClass('cell flair').appendTo(rowEl);
      const cell = {
        rowIndex: i,
        cellIndex: j,
        color: 'transparent',
        el: cellEl // NB: this is why the map can not be deep copied naively
      };
      row.push(cell);

      // when clicked, it is painted, and the color is updated in the map representation
      cellEl.on('click', () => {
        if (body.hasClass('loading')) {
          return;
        }
        playClickSound();
        const color = getCurrentColor();
        cellEl.css('background-color', color);
        cell.color = color;

        checkComplete();
      });
    }
    map.push(row);
  }

  targetScore.empty();
  for(let s=0; s<levels[currentLevel].SCORE; s++) {
    $('<div></div>').addClass('score-cell').appendTo(targetScore);
  }

  console.log('done:', map);
}

function checkComplete() {
  const isCellFilled = (c) => c.color !== 'transparent';
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
        cell.color = 'transparent';
      } else if (change.ripens === true) {
        cell.color = 'gold';
      } else if (change.pests === true) {
        cell.color = 'red';
      }
      cell.el.css('background-color', cell.color);
    }
  }
}

function getRandomIntFromInterval(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
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
  // if there are not enough pests for the map size, they are placed randomly
  await delay(500);
  mapChanges = getClearChangeset();
  const mapSize = levels[currentLevel].ROWS * levels[currentLevel].COLS;
  if (countNeighboursOfType(map[0][0], 'red', 1000) < mapSize/10) {
    const pestCount = Math.floor(mapSize/10);
    const previousPests = {}; // lookup ht for duplicate detection
    for (let i=0;i<pestCount;i++) {
      let x;
      let y;
      do {
        x = getRandomIntFromInterval(0, levels[currentLevel].ROWS - 1);
        y = getRandomIntFromInterval(0, levels[currentLevel].COLS - 1);
      } while (previousPests[x + '|' + y])
      previousPests[x + '|' + y] = true;
      mapChanges[x][y] = {
        pests: true
      };
    }
  }
  applyMapChanges(mapChanges);

  // water not next to ground seeps away
  await delay(500);
  mapChanges = getClearChangeset();
  forEachCellOfType('blue', c => {
    if (countNeighboursOfType(c, 'sienna') < 1) {
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

  // wheat next to pests is eaten
  await delay(500);
  mapChanges = getClearChangeset();
  forEachCellOfType('gold', c => {
    if (countNeighboursOfType(c, 'red') > 0) {
      mapChanges[c.rowIndex][c.cellIndex] = {
        deletion: true
      };
    }
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

  // display score
  const score = countNeighboursOfType(map[0][0], 'gold', 1000);
  $('.score-cell').slice(0, score).addClass('filled');
  await delay(700);

  // TODO: fade or delete non-wheat tiles for visible score

  // score check (score is the remaining wheat)
  await delay(500);
  if (score >= levels[currentLevel].SCORE) {
    // increment level if possible
    if (levels[currentLevel + 1]) {
      currentLevel = currentLevel + 1;
    }
    sounds.success.play();
    // TODO: else: congrats
  } else {
    sounds.failure.play();
  }

  generate();

  body.removeClass('loading');
}

let DEBUG = location && location.hostname==='localhost';
$(document).ready(function() {
  body = $('body');
  container = $('#container');
  picker = $('#picker');
  targetScore = $('#target-score');

  picker.css({
    top: (body.innerHeight() / 2 - 13) + 'px',
    left: (body.innerWidth() / 2 - 13) + 'px'
  });

  // initialize audio assets
  bgMusic = new Audio('music_01.mp3');
  bgMusic.addEventListener('ended', function() {
    this.currentTime = 0;
    this.play();
  }, false);

  sounds.click01 = new Audio('sound_01.mp3');
  sounds.click02 = new Audio('sound_02.mp3');
  sounds.click03 = new Audio('sound_03.mp3');
  sounds.toggle = new Audio('sound_toggle.mp3');
  sounds.success = new Audio('sound_success.mp3');
  sounds.failure = new Audio('sound_failure.mp3');

  // This is mostly just to unlock the fullscreen request and audio APIs via user interaction,
  // but it might also look cool, and it teaches the color pick mechanic.
  picker.one('click', () => {
    console.log('starting');

    if (!DEBUG) {
      document.documentElement.requestFullscreen();
    }

    bgMusic.play();

    body.addClass('green');
    picker.css('background-color', 'blue');
    generate();

    const verticalCenter = body.innerHeight() / 2;
    const horizontalCenter = body.innerWidth() / 2;

    picker.css({
      top: (verticalCenter - 150) + 'px',
      left: (horizontalCenter - 200) + 'px'
    });

    container.css({
      top: (verticalCenter - 75) + 'px',
      left: (horizontalCenter - 200) + 'px'
    });

    const row = $('.row');
    targetScore.css({
      top: (verticalCenter - 150) + 'px',
      left: (horizontalCenter - 200) + 45 + 'px'
    });

    // all subsequent clicks will just toggle color
    picker.on('click', switchToNextColor);
  });
});
