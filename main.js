
const WIDTH = 800;
const HEIGHT = 500;

const ROWS = 5;
const COLS = 16;

const map = [];

let body, container, picker;

// TODO: keep in sync with CSS - apply CSS rules dynamically?
// TODO: use color objects, with readable name and CSS color codes
const colors = ['red', 'green', 'blue'];

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
  body.addClass(colors[nextIndex]);
}

function generate() {
  console.log('-cont:', container);
  for (let i=0; i<ROWS; i++) {
    const row = [];
    const rowEl = $('<div></div>').addClass('row').appendTo(container);
    for (let j=0; j<COLS; j++) {
      const cellEl = $('<div></div>').addClass('cell').appendTo(rowEl);
      const cell = {
        color: 'blank',
        el: cellEl
      };
      row.push(cell);

      // when clicked, it is painted, and the color is updated in the map representation
      cellEl.on('click', () => {
        const color = getCurrentColor();
        cellEl.css('background-color', color);
        cell.color = color;
      });
    }
    map.push(row);
  }
  console.log('done:', map);
}

$(document).ready(function() {
  console.log('Hello H');

  body = $('body');
  container = $('#container');
  picker = $('#picker');

  picker.on('click', switchToNextColor);

  generate();
});
