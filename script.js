// --- Tambola Ticket Generator and Game Logic ---

const ticketDiv = document.getElementById('ticket');
const refreshBtn = document.getElementById('refreshBtn');
const startGameBtn = document.getElementById('startGameBtn');
const claimsDiv = document.getElementById('claims');
const claimCheckboxes = claimsDiv.querySelectorAll('input[type="checkbox"]');
const colorPicker = document.getElementById('colorPicker');
const textColorPicker = document.getElementById('textColorPicker');
const ticketWrapper = document.getElementById('ticketWrapper');
const ticketNoSpan = document.getElementById('ticketNo');

let ticket = [];
let gameStarted = false;
let crossed = Array.from({ length: 3 }, () => Array(9).fill(false));
let ticketNumber = 1;

function generateTicket() {
  // Column ranges: [1-10], [11-20], ..., [81-90]
  const colRanges = [
    [1, 10], [11, 20], [21, 30], [31, 40], [41, 50],
    [51, 60], [61, 70], [71, 80], [81, 90]
  ];

  let grid, colCounts;
  let attempts = 0;
  while (true) {
    // Step 1: For each row, pick 5 unique columns
    grid = Array.from({ length: 3 }, () => Array(9).fill(null));
    for (let row = 0; row < 3; row++) {
      let cols = Array.from({ length: 9 }, (_, i) => i);
      let chosenCols = [];
      for (let i = 0; i < 5; i++) {
        let idx = Math.floor(Math.random() * cols.length);
        chosenCols.push(cols.splice(idx, 1)[0]);
      }
      chosenCols.sort((a, b) => a - b); // for left-to-right filling
      for (let col of chosenCols) {
        grid[row][col] = 0; // placeholder
      }
    }
    // Step 2: Count numbers per column
    colCounts = Array(9).fill(0);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] !== null) colCounts[col]++;
      }
    }
    // Step 3: If any column has more than 3, retry
    if (colCounts.every(count => count >= 1 && count <= 3)) break;
    attempts++;
    if (attempts > 1000) throw new Error('Failed to generate valid ticket after many attempts');
  }
  // Step 4: For each column, generate random numbers in range, sort ascending
  let colNumbers = colRanges.map(([min, max], col) => {
    let count = colCounts[col];
    let nums = [];
    while (nums.length < count) {
      let n = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!nums.includes(n)) nums.push(n);
    }
    return nums.sort((a, b) => a - b);
  });
  // Step 5: Fill numbers into grid, top to bottom in each column
  let colIndexes = Array(9).fill(0);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] !== null) {
        grid[row][col] = colNumbers[col][colIndexes[col]++];
      }
    }
  }
  return grid;
}

function renderTicket() {
  ticketDiv.innerHTML = '';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const val = ticket[row][col];
      const cell = document.createElement('div');
      cell.className = 'cell' + (val === null ? ' blank' : '');
      if (val !== null) {
        cell.textContent = val;
        cell.tabIndex = 0;
        if (gameStarted) {
          cell.addEventListener('click', () => crossNumber(row, col, cell));
          if (crossed[row][col]) cell.classList.add('crossed');
        }
      }
      ticketDiv.appendChild(cell);
    }
  }
}

function crossNumber(row, col, cell) {
  if (!gameStarted || ticket[row][col] === null) return;
  crossed[row][col] = !crossed[row][col];
  cell.classList.toggle('crossed');
  updateClaims();
}

function resetClaims() {
  claimCheckboxes.forEach(cb => {
    cb.checked = false;
    cb.parentElement.parentElement.classList.remove('claim-active', 'claim-ticked', 'claim-flash');
  });
}

function updateClaims() {
  // Early Seven: 7 numbers crossed
  const crossedCount = crossed.flat().filter(Boolean).length;
  // Corners: first and last number in first and third rows
  function getRowNumbers(row) {
    return ticket[row].map((v, c) => v !== null ? {col: c, val: v} : null).filter(Boolean);
  }
  let cornersCells = [];
  [0,2].forEach(row => {
    const nums = getRowNumbers(row);
    if (nums.length > 0) {
      cornersCells.push([row, nums[0].col]);
      if (nums.length > 1) cornersCells.push([row, nums[nums.length-1].col]);
    }
  });
  // Lines: all 5 numbers in a row crossed
  const lines = [0, 1, 2].map(r =>
    ticket[r].map((v, c) => v !== null && crossed[r][c]).filter(Boolean).length === 5
  );
  // Full House: all 15 numbers crossed
  const fullHouse = crossedCount === 15;

  claimCheckboxes.forEach(cb => {
    const li = cb.parentElement.parentElement;
    let active = false;
    switch (cb.dataset.claim) {
      case 'earlySeven':
        active = crossedCount >= 7;
        break;
      case 'corners':
        active = cornersCells.length === 4 && cornersCells.every(([r, c]) => crossed[r][c]);
        break;
      case 'line1':
        active = lines[0];
        break;
      case 'line2':
        active = lines[1];
        break;
      case 'line3':
        active = lines[2];
        break;
      case 'fullHouse':
        active = fullHouse;
        break;
    }
    if (active && !cb.checked) {
      if (!li.classList.contains('claim-active')) {
        li.classList.add('claim-flash');
        setTimeout(() => li.classList.remove('claim-flash'), 1400);
      }
      li.classList.add('claim-active');
    } else {
      li.classList.remove('claim-active');
    }
  });
}

// Manual ticking of claims (for when someone else claims)
claimCheckboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    const li = cb.parentElement.parentElement;
    if (cb.checked) {
      li.classList.add('claim-ticked');
      li.classList.remove('claim-active', 'claim-flash');
    } else {
      li.classList.remove('claim-ticked');
    }
  });
});

function newTicket() {
  ticket = generateTicket();
  crossed = Array.from({ length: 3 }, () => Array(9).fill(false));
  gameStarted = false;
  startGameBtn.disabled = false;
  resetClaims();
  renderTicket();
  ticketNoSpan.textContent = 'Ticket No: ' + ticketNumber;
}

refreshBtn.addEventListener('click', () => {
  ticketNumber = Math.floor(Math.random() * 1000) + 1;
  newTicket();
});

startGameBtn.addEventListener('click', () => {
  gameStarted = true;
  startGameBtn.disabled = true;
  renderTicket();
});

colorPicker.addEventListener('change', updateTicketColor);
textColorPicker.addEventListener('change', updateTicketColor);

function updateTicketColor() {
  const color = colorPicker.value;
  const textColor = textColorPicker.value;
  ticketWrapper.className = '';
  ticketWrapper.classList.add('ticket-' + color);
  ticketWrapper.classList.add('text-' + textColor);
}

window.onload = () => {
  ticketNumber = Math.floor(Math.random() * 1000) + 1;
  newTicket();
  updateTicketColor();
}; 
