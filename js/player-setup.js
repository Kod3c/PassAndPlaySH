/**
 * Enhanced player setup functionality for Secret Hitler
 */

// Wait for the page to load
window.addEventListener('load', function() {
  // Add random name buttons to player inputs
  addRandomNameButtons();
  
  // Add event listeners to player count buttons
  const countButtons = document.querySelectorAll('.player-count-btn');
  countButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      // Highlight the selected button
      countButtons.forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      
      // Add random name buttons after a delay to allow inputs to be created
      setTimeout(addRandomNameButtons, 100);
    });
  });
  
  // Add styles
  addStyles();
});

/**
 * Add random name generation buttons to player input fields
 */
function addRandomNameButtons() {
  const inputGroups = document.querySelectorAll('#player-inputs .input-group');
  
  inputGroups.forEach(function(group) {
    // Skip if button already exists
    if (group.querySelector('.random-btn')) return;
    
    const input = group.querySelector('input');
    if (!input) return;
    
    // Create the random name button
    const btn = document.createElement('button');
    btn.className = 'random-btn';
    btn.innerHTML = '🎲';
    btn.title = 'Generate random name';
    btn.type = 'button';
    
    // Add click handler
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      input.value = generateRandomName();
      // Trigger input event to validate
      const event = new Event('input', { bubbles: true });
      input.dispatchEvent(event);
    });
    
    // Add button to the input group
    group.appendChild(btn);
  });
}

/**
 * Generate a random player name
 */
function generateRandomName() {
  const firstNames = [
    'Alex', 'Bailey', 'Casey', 'Dana', 'Ellis', 'Finley', 'Gray', 'Harper',
    'Jordan', 'Kennedy', 'Logan', 'Morgan', 'Parker', 'Quinn', 'Riley', 'Taylor'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia',
    'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Martin', 'Lee'
  ];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return firstName + ' ' + lastName;
}

/**
 * Add CSS styles for the player setup enhancements
 */
function addStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .player-count-btn.selected {
      background-color: #4a4a4a;
      color: white;
      font-weight: bold;
    }
    
    .random-btn {
      background: none;
      border: none;
      font-size: 1.2em;
      cursor: pointer;
      padding: 0 8px;
      margin-left: 5px;
    }
    
    .random-btn:hover {
      transform: scale(1.2);
    }
    
    .input-group {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .input-group input {
      flex-grow: 1;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    /* Add validation styles */
    .input-group input.invalid {
      border-color: #ff3860;
      background-color: rgba(255, 56, 96, 0.1);
    }
    
    .input-group input.duplicate {
      border-color: #ffdd57;
      background-color: rgba(255, 221, 87, 0.1);
    }
  `;
  document.head.appendChild(style);
}

/**
 * Validate player names (no duplicates, no empty names)
 */
function validatePlayerNames() {
  const inputs = document.querySelectorAll('#player-inputs input');
  const startBtn = document.getElementById('start-game-btn');
  let valid = true;
  const names = new Set();
  
  inputs.forEach(function(input) {
    const value = input.value.trim();
    
    // Check for empty names
    if (!value) {
      valid = false;
      input.classList.add('invalid');
      input.classList.remove('duplicate');
    } else {
      input.classList.remove('invalid');
      
      // Check for duplicate names
      if (names.has(value.toLowerCase())) {
        valid = false;
        input.classList.add('duplicate');
      } else {
        input.classList.remove('duplicate');
        names.add(value.toLowerCase());
      }
    }
  });
  
  // Enable/disable start button based on validation
  if (startBtn) {
    startBtn.disabled = !valid;
  }
  
  return valid;
}

// Add input event listener to validate player names
window.addEventListener('load', function() {
  const playerInputs = document.getElementById('player-inputs');
  if (playerInputs) {
    playerInputs.addEventListener('input', validatePlayerNames);
  }
});
