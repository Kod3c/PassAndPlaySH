// Main application controller
class App {
    constructor() {
        this.currentPage = 'home';
        this.game = null;
        this.basePath = this.getBasePath();
        
        // SECURITY: Add console protection
        this.setupConsoleProtection();
        this.init();
    }

    // SECURITY: Setup console protection to prevent easy access to game state
    setupConsoleProtection() {
        // Only apply protection in production
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            // Override console methods that might expose game state
            const originalLog = console.log;
            const originalWarn = console.warn;
            const originalError = console.error;
            
            console.log = function(...args) {
                // Block logging of sensitive game objects
                if (args.some(arg => 
                    typeof arg === 'object' && 
                    (arg.playerRoles || arg.policyStacks || arg.discardPile)
                )) {
                    console.warn('Sensitive game information logging is blocked');
                    return;
                }
                originalLog.apply(console, args);
            };
            
            // Block access to game state through console
            Object.defineProperty(window, 'gameState', {
                get: function() {
                    console.warn('Game state access is restricted');
                    return undefined;
                }
            });
        }
    }

    async init() {
        // Setup routing FIRST to handle URL-based navigation
        this.setupRouting();
        // Setup multidevice navigation to prevent conflicts
        this.setupMultiDeviceNavigation();
        this.setupEventListeners();
        this.setupBetaAccess();
        this.setupThemeSwitcher();
        this.setupNavigationButtons();
        // Check if autoShowSection exists before calling
        if (typeof this.autoShowSection === 'function') {
            this.autoShowSection();
        }
        // Check if initializePlayerCount exists before calling
        if (typeof this.initializePlayerCount === 'function') {
            this.initializePlayerCount();
        }
    }

    getBasePath() {
        const currentPath = window.location.pathname;
        return currentPath.includes('/PassAndPlaySH') ? '/PassAndPlaySH' : '';
    }

    setupRouting() {
        // Handle browser back/forward navigation
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.navigateToPage(event.state.page, false);
            }
        });

        // Handle direct URL access (e.g., /setup)
        window.addEventListener('load', () => {
            this.restorePageFromURL();
        });
    }

    restorePageFromURL() {
        const currentPath = window.location.pathname;
        const basePath = this.basePath;
        
        // Extract the page name from the URL
        let pageName = 'home';
        if (currentPath !== basePath + '/' && currentPath !== '/') {
            // Remove the base path and leading slash to get the page name
            const pathWithoutBase = currentPath.replace(basePath, '').replace(/^\//, '');
            if (pathWithoutBase && pathWithoutBase !== 'index.html') {
                pageName = pathWithoutBase;
            }
        }
        
        // Navigate to the page without updating history (since we're restoring)
        if (pageName !== 'home') {
            this.navigateToPage(pageName, false);
        }
    }

    navigateToPage(pageName, updateHistory = true) {
        // Validate pageName
        if (!pageName || typeof pageName !== 'string') {
            console.error('Invalid page name:', pageName);
            return;
        }
        
        this.currentPage = pageName;
        
        // Update browser history if requested
        if (updateHistory) {
            // Use getBasePath() method if basePath is not defined
            const basePath = this.basePath || this.getBasePath() || '';
            const url = pageName === 'home' ? basePath + '/' : basePath + `/${pageName}`;
            window.history.pushState({ page: pageName }, '', url);
        }
        
        this.showPage(pageName);
    }

    showPage(pageName) {
        // Hide all page content
        const pages = document.querySelectorAll('.page-content');
        pages.forEach(page => page.style.display = 'none');
        
        // Show the requested page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.style.display = 'block';
            this.currentPage = pageName;
            // Update active navigation state
            this.updateActiveNavigation(pageName);
        } else {
            // If page doesn't exist, show home
            console.warn(`Page ${pageName} not found, redirecting to home`);
            this.showPage('home');
        }
    }

    showRulesSection(sectionName) {
        // Hide all rule sections
        const ruleSections = document.querySelectorAll('.rule-section');
        ruleSections.forEach(section => section.classList.remove('active'));
        
        // Show the requested section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update active navigation button
        const navButtons = document.querySelectorAll('.rule-nav-btn');
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        const activeButton = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    updateActiveNavigation(pageName) {
        // Remove active class from all nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        // Add active class to current page
        const activeItem = document.querySelector(`[data-page="${pageName}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    setupEventListeners() {
        // Setup navigation event listeners
        document.addEventListener('click', (event) => {
            // Check if the clicked element or any of its parents have data-navigate
            let navigateElement = event.target.closest('[data-navigate]');
            
            // Fallback: if closest() doesn't work, check the element and all its parents manually
            if (!navigateElement) {
                let currentElement = event.target;
                while (currentElement && currentElement !== document.body) {
                    if (currentElement.hasAttribute && currentElement.hasAttribute('data-navigate')) {
                        navigateElement = currentElement;
                        break;
                    }
                    currentElement = currentElement.parentElement;
                }
            }
            
            if (navigateElement) {
                const page = navigateElement.dataset.navigate;
                // Only navigate if page is defined and not 'multidevice'
                if (page && page !== 'multidevice') {
                    this.navigateToPage(page);
                }
            }
        });

        // Setup rules page navigation
        document.addEventListener('click', (event) => {
            // Check if the clicked element or any of its parents have the rule-nav-btn class
            const ruleNavElement = event.target.closest('.rule-nav-btn');
            if (ruleNavElement) {
                const section = ruleNavElement.dataset.section;
                this.showRulesSection(section);
            }
        });

        // Setup other event listeners
        this.setupHeaderNavigation();
        this.setupGameSetupListeners();
        this.setupMultiDeviceNavigation();
        this.setupBetaAccess();
    }

    setupHeaderNavigation() {
        // Make the Secret Hitler header clickable to navigate home
        const header = document.querySelector('header h1');
        if (header) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                this.navigateToPage('home');
            });
        }
    }

    setupThemeSwitcher() {
        // Get saved theme or default to 'default'
        const savedTheme = localStorage.getItem('selectedTheme') || 'default';
        this.setTheme(savedTheme);
        
        // Check if theme switcher should be enabled (default: disabled)
        const isThemeEnabled = localStorage.getItem('themeEnabled') === 'true';
        this.setThemeSwitcherState(isThemeEnabled);
        
        // Setup theme switcher event listeners
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.setTheme(theme);
                
                // Update active state
                themeOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Save theme preference
                localStorage.setItem('selectedTheme', theme);
            });
        });
        
        // Set initial active state
        themeOptions.forEach(option => {
            if (option.dataset.theme === savedTheme) {
                option.classList.add('active');
            }
        });
        
        // Setup enable theme button
        const enableThemeBtn = document.getElementById('enable-theme-btn');
        if (enableThemeBtn) {
            enableThemeBtn.addEventListener('click', () => {
                this.toggleThemeSwitcher();
            });
        }
    }

    setupNavigationButtons() {
        // Setup navigation button event listeners
        const joinGameBtn = document.getElementById('join-game-btn');
        if (joinGameBtn) {
            joinGameBtn.addEventListener('click', () => {
                window.location.href = 'pages/join.html';
            });
        }

        const viewRulesBtn = document.getElementById('view-rules-btn');
        if (viewRulesBtn) {
            viewRulesBtn.addEventListener('click', () => {
                window.location.href = 'pages/rules.html';
            });
        }
    }

    setThemeSwitcherState(enabled) {
        const themeSwitcher = document.querySelector('.theme-switcher');
        const themeOptions = document.querySelectorAll('.theme-option');
        const enableThemeBtn = document.getElementById('enable-theme-btn');
        
        // Check if theme switcher exists before trying to use it
        if (!themeSwitcher) {
            return; // Exit early if no theme switcher found
        }
        
        if (enabled) {
            themeSwitcher.classList.remove('disabled');
            themeOptions.forEach(option => {
                option.disabled = false;
            });
            if (enableThemeBtn) {
                enableThemeBtn.textContent = 'Disable Theme Selector';
                enableThemeBtn.classList.remove('btn-outline');
                enableThemeBtn.classList.add('btn-secondary');
            }
        } else {
            themeSwitcher.classList.add('disabled');
            themeOptions.forEach(option => {
                option.disabled = true;
            });
            if (enableThemeBtn) {
                enableThemeBtn.textContent = 'Enable Theme Selector';
                enableThemeBtn.classList.remove('btn-secondary');
                enableThemeBtn.classList.add('btn-outline');
            }
        }
    }

    toggleThemeSwitcher() {
        const themeSwitcher = document.querySelector('.theme-switcher');
        if (!themeSwitcher) return; // Exit if no theme switcher
        
        const isCurrentlyEnabled = !themeSwitcher.classList.contains('disabled');
        const newState = !isCurrentlyEnabled;
        
        this.setThemeSwitcherState(newState);
        localStorage.setItem('themeEnabled', newState.toString());
    }

    setTheme(themeName) {
        // Remove all theme attributes
        document.documentElement.removeAttribute('data-theme');
        
        // Apply the selected theme
        if (themeName !== 'default') {
            document.documentElement.setAttribute('data-theme', themeName);
        }
    }

    setupGameSetupListeners() {
        // Player count +/- buttons
        const minusBtn = document.getElementById('player-minus');
        const plusBtn = document.getElementById('player-plus');
        
        if (minusBtn && plusBtn) {
            minusBtn.addEventListener('click', () => {
                const currentCount = this.getCurrentPlayerCount();
                if (currentCount > 5) {
                    this.updatePlayerCount(currentCount - 1);
                } else if (currentCount === 5) {
                    this.updatePlayerCount(0);
                }
            });
            
            plusBtn.addEventListener('click', () => {
                const currentCount = this.getCurrentPlayerCount();
                if (currentCount === 0) {
                    this.updatePlayerCount(5);
                } else if (currentCount < 10) {
                    this.updatePlayerCount(currentCount + 1);
                }
            });
        }

        // Back to home button
        const backBtn = document.getElementById('back-to-home-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.navigateToPage('home');
            });
        }

        // Setup create game button (dynamically created)
        document.addEventListener('click', (event) => {
            if (event.target.id === 'create-game-btn') {
                this.startGame();
            }
        });

        // Setup create game validation
        this.setupCreateGameValidation();
        
        // Start at 0 players; first increment will jump to 5
    }

    setupCreateGameValidation() {
        // Add input event listeners to all player name inputs
        document.addEventListener('input', (event) => {
            if (event.target.classList.contains('player-name-input')) {
                this.validateCreateGameButton();
            }
        });
    }

    validateCreateGameButton() {
        const createGameBtn = document.getElementById('create-game-btn');
        if (!createGameBtn) return;

        const playerInputs = document.querySelectorAll('.player-name-input');
        const allFilled = Array.from(playerInputs).every(input => input.value.trim().length > 0);
        
        createGameBtn.disabled = !allFilled;
        
        if (allFilled) {
            createGameBtn.classList.remove('btn-secondary');
            createGameBtn.classList.add('btn-primary');
        } else {
            createGameBtn.classList.remove('btn-primary');
            createGameBtn.classList.add('btn-secondary');
        }
    }
    
    setupMultiDeviceNavigation() {
        // Remove the data-navigate attribute from multidevice buttons to prevent conflicts
        // and add direct click handlers
        const multideviceButtons = document.querySelectorAll('[data-navigate="multidevice"]');
        
        multideviceButtons.forEach((btn, index) => {
            // Remove the data-navigate attribute to prevent the general handler from triggering
            btn.removeAttribute('data-navigate');
            
            // Add specific click handler based on button index
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Simple relative path that should work from index.html
                const mode = index === 0 ? 'create' : 'join';
                
                // Use a simple relative path - this works when index.html is at the root
                const playPageUrl = 'pages/create.html?mode=' + mode;
                
                console.log('Navigating to:', playPageUrl);
                window.location.href = playPageUrl;
            });
        });
    }

    setupBetaAccess() {
        // Check if beta access is enabled via URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const hasBetaAccess = urlParams.has('beta') || urlParams.has('beta_access');
        
        if (hasBetaAccess) {
            // Enable the beta button
            const betaBtn = document.querySelector('[data-navigate="setup"]');
            if (betaBtn) {
                betaBtn.disabled = false;
                betaBtn.classList.remove('btn-primary');
                betaBtn.classList.add('btn-secondary');
                
                // Add a visual indicator that beta is active
                const betaTag = betaBtn.querySelector('.beta-tag');
                if (betaTag) {
                    betaTag.style.background = '#28a745'; // Green background for active beta
                    betaTag.textContent = 'BETA ACTIVE';
                }
            }
        }
    }

    getCurrentPlayerCount() {
        const currentCountSpan = document.querySelector('.current-count');
        return currentCountSpan ? parseInt(currentCountSpan.textContent) : 0;
    }

    updatePlayerCount(newCount) {
        const currentCount = this.getCurrentPlayerCount();
        
        if (newCount === currentCount) return;
        
        // Update the display
        const countDisplay = document.querySelector('.current-count');
        if (countDisplay) {
            countDisplay.textContent = newCount;
        }
        
        // Update role distribution and player inputs
        const roleInfo = document.getElementById('role-info');
        const playerInputs = document.getElementById('player-inputs');
        
        if (newCount === 0) {
            // Hide role distribution and player inputs when count is 0
            roleInfo.innerHTML = '<p>Select player count to see role distribution</p>';
            playerInputs.innerHTML = '';
            return;
        }

        // Update role distribution display
        const distribution = this.getRoleDistribution(newCount);
        const liberalPercent = Math.round((distribution.liberals / newCount) * 100);
        const fascistPercent = Math.round((distribution.fascists / newCount) * 100);
        const hitlerPercent = Math.round((distribution.hitler / newCount) * 100);
        
        roleInfo.innerHTML = `
            <div class="role-distribution-compact">
                <div class="role-item liberal">
                    <div class="role-icon"></div>
                    <div class="role-details">
                        <span class="role-name">Liberal</span>
                        <span class="role-stats">${distribution.liberals} (${liberalPercent}%)</span>
                    </div>
                </div>
                <div class="role-item fascist">
                    <div class="role-icon"></div>
                    <div class="role-details">
                        <span class="role-name">Fascist</span>
                        <span class="role-stats">${distribution.fascists} (${fascistPercent}%)</span>
                    </div>
                </div>
                <div class="role-item hitler">
                    <div class="role-icon"></div>
                    <div class="role-details">
                        <span class="role-name">Hitler</span>
                        <span class="role-stats">${distribution.hitler} (${hitlerPercent}%)</span>
                    </div>
                </div>
            </div>
        `;

        // Smart player input management - preserve existing names
        const existingInputs = playerInputs.querySelectorAll('.player-input-group');
        const existingNames = Array.from(existingInputs).map(group => {
            const input = group.querySelector('.player-name-input');
            return input ? input.value.trim() : '';
        });
        
        // Clear existing inputs
        playerInputs.innerHTML = '';
        
        // Add new inputs, preserving names where possible
        for (let i = 1; i <= newCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'player-input-group';
            
            // Preserve existing name if available, otherwise use empty placeholder
            const existingName = existingNames[i - 1] || '';
            const placeholder = existingName || `Enter player name`;
            
            inputGroup.innerHTML = `
                <label for="player-${i}">Player ${i}:</label>
                <input type="text" id="player-${i}" class="player-name-input" 
                       placeholder="${placeholder}" value="${existingName}">
            `;
            playerInputs.appendChild(inputGroup);
        }

        // Add Create Game button
        const createGameButton = document.createElement('div');
        createGameButton.className = 'create-game-section';
        createGameButton.innerHTML = `
            <button id="create-game-btn" class="btn btn-primary btn-large" disabled>
                <span class="btn-icon">🎮</span>
                <span class="btn-text">Create Game</span>
            </button>
            <p class="create-game-hint">Fill in all player names to start the game</p>
        `;
        playerInputs.appendChild(createGameButton);

        // Add input validation for the Create Game button
        this.setupCreateGameValidation();

        // Enable start game button
        // startGameBtn.disabled = false; // This line is removed as per the edit hint
        
        // Update button states
        const minusBtn = document.getElementById('player-minus');
        const plusBtn = document.getElementById('player-plus');
        
        if (minusBtn) {
            minusBtn.disabled = newCount <= 5;
        }
        if (plusBtn) {
            plusBtn.disabled = newCount >= 10;
        }
    }

    selectPlayerCount(count) {
        // Update the current count display
        const countDisplay = document.querySelector('.current-count');
        if (countDisplay) {
            countDisplay.textContent = count;
        }
        
        // Update button states
        const minusBtn = document.getElementById('player-minus');
        const plusBtn = document.getElementById('player-plus');
        
        if (minusBtn) {
            minusBtn.disabled = count <= 5;
        }
        if (plusBtn) {
            plusBtn.disabled = count >= 10;
        }
        
        // Don't call updatePlayerCount here to avoid infinite loops
        // The button click handlers will call updatePlayerCount directly
    }

    getRoleDistribution(playerCount) {
        const distributions = {
            5: { liberals: 3, fascists: 1, hitler: 1 },
            6: { liberals: 4, fascists: 1, hitler: 1 },
            7: { liberals: 4, fascists: 2, hitler: 1 },
            8: { liberals: 5, fascists: 2, hitler: 1 },
            9: { liberals: 6, fascists: 2, hitler: 1 },
            10: { liberals: 6, fascists: 3, hitler: 1 }
        };
        return distributions[playerCount] || distributions[5];
    }

    startGame() {
        // Collect player names from the input fields
        const playerInputs = document.querySelectorAll('.player-name-input');
        const players = Array.from(playerInputs)
            .map(input => input.value.trim())
            .filter(name => name.length > 0);

        if (players.length < 5) {
            alert('Please select at least 5 players and enter their names');
            return;
        }

        // Store player data and navigate to game
        localStorage.setItem('gamePlayers', JSON.stringify(players));
        
        // Initialize the game
        this.game = new Game(players);
        
        this.navigateToPage('game');
        this.updateGameDisplay();
    }

    updateGameDisplay() {
        if (!this.game) return;
        
        // Update the game page with current game state
        const gamePage = document.getElementById('game-page');
        if (gamePage) {
            gamePage.innerHTML = this.game.getGameHTML();
            this.setupGameEventListeners();
            // Show one-time alert when moving into legislation after a successful election
            if (this.game.pendingLegislationAlert) {
                alert(`${this.game.players[this.game.currentPresident]} (President) is picking policy cards...`);
                this.game.pendingLegislationAlert = false;
            }
        }
    }

    setupGameEventListeners() {
        if (!this.game) return;
        
        // Setup game-specific event listeners
        const nextTurnBtn = document.getElementById('next-turn-btn');
        if (nextTurnBtn) {
            nextTurnBtn.addEventListener('click', () => {
                this.game.nextTurn();
                this.updateGameDisplay();
            });
        }

        const backToHomeBtn = document.getElementById('game-back-home-btn');
        if (backToHomeBtn) {
            backToHomeBtn.addEventListener('click', () => {
                this.navigateToPage('home');
            });
        }

        // Setup voting buttons
        const voteButtons = document.querySelectorAll('.vote-btn');
        voteButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const vote = btn.dataset.vote;
                this.game.submitVote(vote);
                this.updateGameDisplay();
            });
        });

        // Setup policy choice buttons
        const policyButtons = document.querySelectorAll('.policy-btn');
        policyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const policy = btn.dataset.policy;
                this.game.choosePolicy(policy);
                this.updateGameDisplay();
            });
        });

        // Setup chancellor selection
        document.addEventListener('click', (event) => {
            const chancellorBtn = event.target.closest('.chancellor-btn');
            if (chancellorBtn) {
                const chancellorIndex = parseInt(chancellorBtn.dataset.chancellor);
                this.game.currentChancellor = chancellorIndex;
                this.game.lastChancellor = this.game.currentPresident; // Set last chancellor to current president
                this.updateGameDisplay();
            }
        });

        // Setup policy stack selection
        document.addEventListener('click', (event) => {
            const stackBtn = event.target.closest('.stack-btn');
            if (stackBtn) {
                const stackIndex = parseInt(stackBtn.dataset.stack);
                this.game.choosePolicyStack(stackIndex);
                this.updateGameDisplay();
            }
        });

        // Setup policy discard
        document.addEventListener('click', (event) => {
            const discardBtn = event.target.closest('.discard-btn');
            if (discardBtn) {
                const cardIndex = parseInt(discardBtn.dataset.discard);
                this.game.presidentDiscard(cardIndex);
                this.updateGameDisplay();
            }
        });

        // Setup policy enact
        document.addEventListener('click', (event) => {
            const enactBtn = event.target.closest('.enact-btn');
            if (enactBtn) {
                const cardIndex = parseInt(enactBtn.dataset.enact);
                this.game.chancellorEnact(cardIndex);
                this.updateGameDisplay();
            }
        });

        // Setup executive power use
        document.addEventListener('click', (event) => {
            const powerBtn = event.target.closest('.power-btn');
            if (powerBtn) {
                const power = powerBtn.dataset.power;
                // For simplicity, we'll just use the first player as the target for now
                // In a real game, this would require a UI to select a player
                this.game.useExecutivePower(power, null); 
                this.updateGameDisplay();
            }
        });

        // Setup log toggle
        document.addEventListener('click', (event) => {
            const logToggleBtn = event.target.closest('.log-toggle-btn');
            if (logToggleBtn) {
                const logEntries = document.getElementById('game-log-entries');
                const isExpanded = logToggleBtn.dataset.expanded === 'true';
                
                if (isExpanded) {
                    // Collapse log
                    logEntries.classList.add('collapsed');
                    logToggleBtn.dataset.expanded = 'false';
                    logToggleBtn.querySelector('.toggle-text').textContent = 'Show Log';
                    logToggleBtn.querySelector('.toggle-icon').textContent = '▼';
                } else {
                    // Expand log
                    logEntries.classList.remove('collapsed');
                    logToggleBtn.dataset.expanded = 'true';
                    logToggleBtn.querySelector('.toggle-text').textContent = 'Hide Log';
                    logToggleBtn.querySelector('.toggle-icon').textContent = '▲';
                }
            }
        });
    }
}

// ============================================================================
// DEPRECATED: Local Game Engine Class
// ============================================================================

// ============================================================================
// REMOVED: Deprecated Local Game Engine Class
// ============================================================================
// The deprecated Game class (652 lines) was removed during repository cleanup.
// It was used for the original local-only pass-and-play version but had known
// bugs and is not used by the current Firebase-based multiplayer implementation.
//
// All active game logic is now in:
// - pages/play.html - Main gameplay UI
// - js/gameplay.js - Game state management and Firebase integration
// - js/db.js - Firestore operations
// ============================================================================


// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // REMOVED: window.app = new App(); - Security fix to prevent console access
    const app = new App();
    
    // Basic console protection for production
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        Object.defineProperty(window, 'app', {
            get: function() {
                console.warn('Game state access is restricted');
                return undefined;
            }
        });
    }
});
