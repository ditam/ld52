
const WIDTH = 800;
const HEIGHT = 500;

const ROWS = 5;
const COLS = 16;

const map = [];

let body, container, picker;

function getCurrentColor() {
  if (body.hasClass('red')) {
    return 'red';
  } else if (body.hasClass('green')) {
    return 'green';
  } else {
    return 'blue';
  }
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

  picker.on('click', function() {
    console.log('picker click!');
    if (body.hasClass('green')) {
      body.removeClass('green');
      body.addClass('blue');
    } else if (body.hasClass('blue')) {
      body.removeClass('blue');
      body.addClass('red');
    } else if (body.hasClass('red')) {
      body.removeClass('red');
      body.addClass('green');
    }
  });

  generate();
});
