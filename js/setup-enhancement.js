// Player setup enhancements
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    enhancePlayerSetup();
  }, 500);
});

function enhancePlayerSetup() {
  // Add random name buttons
  addRandomNameButtons();
  
  // Add event listener for player count buttons
  const playerCountBtns = document.querySelectorAll('.player-count-btn');
  playerCountBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      // Add selected class
      playerCountBtns.forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      
      // Add random name buttons after inputs are generated
      setTimeout(function() {
        addRandomNameButtons();
      }, 100);
    });
  });
}

function addRandomNameButtons() {
  const inputGroups = document.querySelectorAll('#player-inputs .input-group');
  
  inputGroups.forEach(function(group) {
    // Skip if button already exists
    if (group.querySelector('.random-name-btn')) return;
    
    const input = group.querySelector('input');
    if (!input) return;
    
    const btn = document.createElement('button');
    btn.className = 'random-name-btn';
    btn.textContent = '🎲';
    btn.title = 'Generate random name';
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      input.value = generateRandomName();
    });
    
    group.appendChild(btn);
  });
}

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

// Add CSS styles when the page loads
document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    .player-count-btn.selected {
      background-color: #4a4a4a;
      color: white;
      font-weight: bold;
    }
    
    .random-name-btn {
      background: none;
      border: none;
      font-size: 1.2em;
      cursor: pointer;
      padding: 0 8px;
      margin-left: 5px;
    }
    
    .random-name-btn:hover {
      transform: scale(1.2);
    }
  `;
  document.head.appendChild(style);
});
