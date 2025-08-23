// Main application controller
class App {
    constructor() {
        this.currentPage = 'home';
        this.game = null;
        this.init();
    }

    async init() {
        // Setup multidevice navigation FIRST to prevent conflicts
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
        } else {
            // If page doesn't exist, show home
            this.showPage('home');
        }
        
        // Show the selected page
        document.querySelectorAll('.page-content').forEach(page => {
            page.style.display = 'none';
        });
        
        const targetPageElement = document.getElementById(pageName + '-page');
        if (targetPageElement) {
            targetPageElement.style.display = 'block';
        }
        
        this.currentPage = pageName;
        
        // Update active navigation state
        this.updateNavigationState(pageName);
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

// Game Engine Class
class Game {
    constructor(players) {
        this.players = players;
        this.playerCount = players.length;
        this.currentTurn = 0;
        this.currentPresident = 0;
        this.currentChancellor = null;
        this.liberalPolicies = 0;
        this.fascistPolicies = 0;
        this.policyDeck = this.createPolicyDeck();
        this.discardPile = [];
        this.gamePhase = 'election'; // election, legislation, executive
        this.votes = [];
        this.electionTracker = 0;
        this.lastElection = null;
        this.gameOver = false;
        this.winner = null;
        
        // Enhanced game state
        this.policyStacks = [];
        this.currentPolicyStack = null;
        this.presidentDiscarded = null;
        this.executivePowers = [];
        this.gameLog = [];
        this.lastChancellor = null;
        this.consecutiveFailedElections = 0;
        
        this.assignRoles();
        this.shufflePolicyDeck();
        this.setupPolicyStacks();
        this.logGameEvent('phase', 'Game initialized with ' + this.playerCount + ' players');
        this.logGameEvent('action', 'Roles assigned and policy deck shuffled');
    }

    assignRoles() {
        const distribution = this.getRoleDistribution();
        const roles = [];
        
        // Add roles based on distribution
        for (let i = 0; i < distribution.liberals; i++) {
            roles.push('liberal');
        }
        for (let i = 0; i < distribution.fascists; i++) {
            roles.push('fascist');
        }
        roles.push('hitler');
        
        // Shuffle roles and assign to players
        this.shuffleArray(roles);
        this.playerRoles = {};
        this.players.forEach((player, index) => {
            this.playerRoles[player] = roles[index];
        });
    }

    getRoleDistribution() {
        const distributions = {
            5: { liberals: 3, fascists: 1, hitler: 1 },
            6: { liberals: 4, fascists: 1, hitler: 1 },
            7: { liberals: 4, fascists: 2, hitler: 1 },
            8: { liberals: 5, fascists: 2, hitler: 1 },
            9: { liberals: 6, fascists: 2, hitler: 1 },
            10: { liberals: 6, fascists: 3, hitler: 1 }
        };
        return distributions[this.playerCount] || distributions[5];
    }

    createPolicyDeck() {
        const deck = [];
        // Add 6 Liberal policies
        for (let i = 0; i < 6; i++) {
            deck.push('liberal');
        }
        // Add 11 Fascist policies
        for (let i = 0; i < 11; i++) {
            deck.push('fascist');
        }
        return deck;
    }

    shufflePolicyDeck() {
        this.shuffleArray(this.policyDeck);
    }

    setupPolicyStacks() {
        // Create stacks of three cards
        this.policyStacks = [];
        while (this.policyDeck.length >= 3) {
            this.policyStacks.push(this.policyDeck.splice(0, 3));
        }
        this.logGameEvent('action', 'Policy cards organized into ' + this.policyStacks.length + ' stacks');
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    nextTurn() {
        if (this.gameOver) return;
        
        this.currentTurn++;
        this.currentPresident = (this.currentPresident + 1) % this.playerCount;
        this.currentChancellor = null;
        this.gamePhase = 'election';
        this.votes = [];
        this.consecutiveFailedElections = 0;
        
        // Check for election tracker failure
        if (this.electionTracker >= 3) {
            this.enactTopPolicy();
            this.electionTracker = 0;
            this.logGameEvent('action', 'Election tracker failure! Top policy enacted automatically');
        }
        
        this.logGameEvent('phase', 'Turn ' + this.currentTurn + ' begins');
        this.logGameEvent('action', this.players[this.currentPresident] + ' is now President');
    }

    submitVote(vote) {
        if (this.gamePhase !== 'election') return;
        
        this.votes.push(vote);
        this.logGameEvent('vote', 'Vote submitted: ' + vote);
        
        if (this.votes.length === this.playerCount) {
            this.resolveElection();
        }
    }

    resolveElection() {
        const jaVotes = this.votes.filter(vote => vote === 'ja').length;
        const neinVotes = this.votes.filter(vote => vote === 'nein').length;
        
        if (jaVotes > neinVotes) {
            // Election successful
            this.gamePhase = 'legislation';
            this.electionTracker = 0;
            this.lastElection = 'success';
            this.consecutiveFailedElections = 0;
            this.logGameEvent('action', 'Election successful! ' + jaVotes + ' Ja vs ' + neinVotes + ' Nein');
            this.logGameEvent('phase', 'Legislation phase begins');
        } else {
            // Election failed
            this.electionTracker++;
            this.consecutiveFailedElections++;
            this.lastElection = 'failed';
            this.logGameEvent('action', 'Election failed! ' + neinVotes + ' Nein vs ' + jaVotes + ' Ja');
            this.logGameEvent('action', 'Election tracker: ' + this.electionTracker + '/3');
            
            if (this.electionTracker >= 3) {
                this.enactTopPolicy();
                this.electionTracker = 0;
            }
            
            this.nextTurn();
        }
    }

    choosePolicyStack(stackIndex) {
        if (this.gamePhase !== 'legislation') return false;
        if (stackIndex < 0 || stackIndex >= this.policyStacks.length) return false;
        
        this.currentPolicyStack = this.policyStacks[stackIndex];
        this.gamePhase = 'president-discard';
        this.logGameEvent('action', this.players[this.currentPresident] + ' chose policy stack ' + (stackIndex + 1));
        this.logGameEvent('phase', 'President must discard one policy card');
        return true;
    }

    presidentDiscard(cardIndex) {
        if (this.gamePhase !== 'president-discard') return false;
        if (cardIndex < 0 || cardIndex >= this.currentPolicyStack.length) return false;
        
        this.presidentDiscarded = this.currentPolicyStack.splice(cardIndex, 1)[0];
        this.discardPile.push(this.presidentDiscarded);
        this.gamePhase = 'chancellor-choose';
        
        this.logGameEvent('action', this.players[this.currentPresident] + ' discarded ' + this.presidentDiscarded + ' policy');
        this.logGameEvent('phase', 'Chancellor must choose one policy to enact');
        return true;
    }

    chancellorEnact(cardIndex) {
        if (this.gamePhase !== 'chancellor-choose') return false;
        if (cardIndex < 0 || cardIndex >= this.currentPolicyStack.length) return false;
        
        const enactedPolicy = this.currentPolicyStack.splice(cardIndex, 1)[0];
        this.enactPolicy(enactedPolicy);
        
        // Remove the used stack
        this.policyStacks = this.policyStacks.filter(stack => stack !== this.currentPolicyStack);
        
        // Check for executive powers
        this.checkExecutivePowers();
        
        // Check for win conditions
        if (!this.checkWinConditions()) {
            this.nextTurn();
        }
        
        return true;
    }

    choosePolicy(policy) {
        if (this.gamePhase !== 'legislation') return;
        
        // Enact the chosen policy
        if (policy === 'liberal') {
            this.liberalPolicies++;
        } else {
            this.fascistPolicies++;
        }
        
        // Check for win conditions
        if (this.checkWinConditions()) {
            return;
        }
        
        // Check for executive powers
        if (this.fascistPolicies >= 3 && this.fascistPolicies <= 5) {
            this.gamePhase = 'executive';
        } else {
            this.nextTurn();
        }
    }

    enactPolicy(policy) {
        if (policy === 'liberal') {
            this.liberalPolicies++;
            this.logGameEvent('policy', 'Liberal policy enacted! Total: ' + this.liberalPolicies + '/5');
        } else {
            this.fascistPolicies++;
            this.logGameEvent('action', 'Fascist policy enacted! Total: ' + this.fascistPolicies + '/6');
        }
        
        // Check for win conditions
        this.checkWinConditions();
    }

    enactTopPolicy() {
        if (this.policyDeck.length === 0) return;
        
        const policy = this.policyDeck.pop();
        this.enactPolicy(policy);
        this.logGameEvent('action', 'Top policy enacted due to election tracker failure');
    }

    checkExecutivePowers() {
        if (this.fascistPolicies >= 3 && this.fascistPolicies <= 5) {
            this.gamePhase = 'executive';
            this.logGameEvent('action', 'Executive powers unlocked! President gains special abilities');
            
            // Add available powers based on fascist policy count
            this.executivePowers = [];
            if (this.fascistPolicies >= 3) this.executivePowers.push('investigate');
            if (this.fascistPolicies >= 4) this.executivePowers.push('special_election');
            if (this.fascistPolicies >= 5) this.executivePowers.push('policy_peek');
        }
    }

    useExecutivePower(power, targetPlayer = null) {
        if (this.gamePhase !== 'executive') return false;
        if (!this.executivePowers.includes(power)) return false;
        
        switch (power) {
            case 'investigate':
                if (targetPlayer !== null) {
                    const role = this.playerRoles[this.players[targetPlayer]];
                    this.logGameEvent('action', this.players[this.currentPresident] + ' investigated ' + this.players[targetPlayer] + ' (Role: ' + role + ')');
                }
                break;
            case 'special_election':
                if (targetPlayer !== null) {
                    this.currentPresident = targetPlayer;
                    this.logGameEvent('action', this.players[targetPlayer] + ' appointed as President through special election');
                }
                break;
            case 'policy_peek':
                const topCards = this.policyDeck.slice(-3);
                this.logGameEvent('action', this.players[this.currentPresident] + ' peeked at top 3 policy cards');
                this.logGameEvent('action', 'Top cards: ' + topCards.join(', '));
                break;
        }
        
        // Remove used power
        this.executivePowers = this.executivePowers.filter(p => p !== power);
        
        // If no more powers, continue to next turn
        if (this.executivePowers.length === 0) {
            this.nextTurn();
        }
        
        return true;
    }

    checkWinConditions() {
        // Liberal win conditions
        if (this.liberalPolicies >= 5) {
            this.gameOver = true;
            this.winner = 'liberal';
            this.logGameEvent('phase', 'GAME OVER! Liberals win with 5 policies!');
            return true;
        }
        
        // Fascist win conditions
        if (this.fascistPolicies >= 6) {
            this.gameOver = true;
            this.winner = 'fascist';
            this.logGameEvent('phase', 'GAME OVER! Fascists win with 6 policies!');
            return true;
        }
        
        // Hitler execution win (would be implemented in executive phase)
        
        return false;
    }

    logGameEvent(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        this.gameLog.push({
            type: type,
            message: message,
            timestamp: timestamp
        });
        
        // Keep only last 50 log entries
        if (this.gameLog.length > 50) {
            this.gameLog = this.gameLog.slice(-50);
        }
    }

    getGameHTML() {
        if (this.gameOver) {
            return this.getGameOverHTML();
        }
        
        return `
            <div class="game-page">
                <div class="game-header">
                    <h2>Secret Hitler - Game in Progress</h2>
                    <div class="game-info">
                        <span>Turn: ${this.currentTurn + 1}</span>
                        <span>President: ${this.players[this.currentPresident]}</span>
                        <span>Phase: ${this.gamePhase.replace('-', ' ').toUpperCase()}</span>
                    </div>
                </div>
                
                <div class="game-board">
                    <div class="policy-tracks">
                        <div class="policy-track liberal-track">
                            <h3>Liberal Policies: ${this.liberalPolicies}/5</h3>
                            <div class="track-spaces">
                                ${this.getTrackSpaces(this.liberalPolicies, 5, 'liberal')}
                            </div>
                        </div>
                        <div class="policy-track fascist-track">
                            <h3>Fascist Policies: ${this.fascistPolicies}/6</h3>
                            <div class="track-spaces">
                                ${this.getTrackSpaces(this.fascistPolicies, 6, 'fascist')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="election-tracker">
                        <h3>Election Tracker: ${this.electionTracker}/3</h3>
                        <div class="tracker-spaces">
                            ${this.getTrackerSpaces()}
                        </div>
                    </div>
                    
                    <div class="game-status">
                        ${this.getGameStatusHTML()}
                    </div>
                </div>
                
                <div class="game-log">
                    <div class="log-header">
                        <h3>Game Log</h3>
                        <div class="log-controls">
                            <span class="spoiler-warning">⚠️ Contains game information</span>
                            <button class="log-toggle-btn btn btn-outline" data-expanded="false">
                                <span class="toggle-text">Show Log</span>
                                <span class="toggle-icon">▼</span>
                            </button>
                        </div>
                    </div>
                    <div class="log-entries collapsed" id="game-log-entries">
                        ${this.getGameLogHTML()}
                    </div>
                </div>
                
                <div class="game-actions">
                    ${this.getGameActionsHTML()}
                </div>
                
                <div class="game-controls">
                    <button id="next-turn-btn" class="btn btn-primary">Next Turn</button>
                    <button id="game-back-home-btn" class="btn btn-outline">Back to Home</button>
                </div>
            </div>
        `;
    }

    getTrackerSpaces() {
        let spaces = '';
        for (let i = 0; i < 3; i++) {
            const filled = i < this.electionTracker;
            spaces += `<span class="tracker-space ${filled ? 'filled' : ''}">${i + 1}</span>`;
        }
        return spaces;
    }

    getGameLogHTML() {
        return this.gameLog.slice().reverse().map(entry => `
            <div class="log-entry ${entry.type}">
                <div class="log-timestamp">${entry.timestamp}</div>
                <div class="log-message">${entry.message}</div>
            </div>
        `).join('');
    }

    getGameActionsHTML() {
        switch (this.gamePhase) {
            case 'election':
                return `
                    <div class="action-phase">
                        ${this.currentChancellor === null
                            ? `
                                <h3>Choose Chancellor</h3>
                                <p>${this.players[this.currentPresident]} (President) must choose a Chancellor</p>
                                <div class="chancellor-options">
                                    ${this.players.map((player, index) => 
                                        index !== this.currentPresident && index !== this.lastChancellor ?
                                            `<button class="chancellor-btn btn btn-primary" data-chancellor="${index}">${player}</button>` :
                                            ''
                                    ).join('')}
                                </div>
                              `
                            : `
                                <h3>Government Vote</h3>
                                <p>${this.players[this.currentPresident]} nominates ${this.players[this.currentChancellor]} for Chancellor.</p>
                                <p>${this.players[this.currentChancellor]} for Chancellor?</p>
                                <div class="vote-options">
                                    <button class="vote-btn btn btn-primary" data-vote="ja">Ja</button>
                                    <button class="vote-btn btn btn-secondary" data-vote="nein">Nein</button>
                                </div>
                                <p class="vote-progress">Votes submitted: ${this.votes.length}/${this.playerCount}</p>
                              `
                        }
                    </div>
                `;
            case 'legislation':
                return `
                    <div class="action-phase">
                        <h3>Choose Policy Stack</h3>
                        <p>${this.players[this.currentPresident]} (President) must choose a policy stack</p>
                        <div class="policy-stack-options">
                            ${this.policyStacks.map((stack, index) => 
                                `<button class="stack-btn btn btn-primary" data-stack="${index}">Stack ${index + 1} (${stack.length} cards)</button>`
                            ).join('')}
                        </div>
                    </div>
                `;
            case 'president-discard':
                return `
                    <div class="action-phase">
                        <h3>Discard Policy Card</h3>
                        <p>${this.players[this.currentPresident]} (President) must discard one card</p>
                        <div class="discard-options">
                            ${this.currentPolicyStack.map((policy, index) => 
                                `<button class="discard-btn btn btn-secondary" data-discard="${index}">Discard ${policy}</button>`
                            ).join('')}
                        </div>
                    </div>
                `;
            case 'chancellor-choose':
                return `
                    <div class="action-phase">
                        <h3>Enact Policy</h3>
                        <p>${this.players[this.currentChancellor]} (Chancellor) must choose one policy to enact</p>
                        <div class="enact-options">
                            ${this.currentPolicyStack.map((policy, index) => 
                                `<button class="enact-btn btn btn-primary" data-enact="${index}">Enact ${policy}</button>`
                            ).join('')}
                        </div>
                    </div>
                `;
            case 'executive':
                return `
                    <div class="action-phase">
                        <h3>Executive Powers</h3>
                        <p>${this.players[this.currentPresident]} (President) has special powers</p>
                        <div class="power-options">
                            ${this.executivePowers.map(power => 
                                `<button class="power-btn btn btn-accent" data-power="${power}">Use ${power.replace('_', ' ')}</button>`
                            ).join('')}
                        </div>
                    </div>
                `;
            default:
                return '<p>Game phase not recognized</p>';
        }
    }

    getTrackSpaces(current, max, type) {
        let spaces = '';
        for (let i = 0; i < max; i++) {
            const filled = i < current;
            const isWin = i === max - 1;
            const hasPower = type === 'fascist' && i >= 2 && i <= 4;
            
            let classes = 'track-space';
            if (filled) classes += ' filled';
            if (isWin) classes += ' win';
            if (hasPower) classes += ' power';
            
            spaces += `<span class="${classes}">${i + 1}</span>`;
        }
        return spaces;
    }

    getGameStatusHTML() {
        switch (this.gamePhase) {
            case 'election':
                return `
                    <div class="election-phase">
                        <h3>Presidential Election</h3>
                        <p>${this.players[this.currentPresident]} is President</p>
                        <p>Election Tracker: ${this.electionTracker}/3</p>
                        ${this.votes.length > 0 ? `<p>Votes: ${this.votes.filter(v => v === 'ja').length} Ja, ${this.votes.filter(v => v === 'nein').length} Nein</p>` : ''}
                    </div>
                `;
            case 'legislation':
                return `
                    <div class="legislation-phase">
                        <h3>Policy Legislation</h3>
                        <p>Choose a policy stack to work with</p>
                        <p>Available stacks: ${this.policyStacks.length}</p>
                    </div>
                `;
            case 'president-discard':
                return `
                    <div class="president-discard-phase">
                        <h3>President's Choice</h3>
                        <p>Discard one policy card from the selected stack</p>
                        <p>Stack contains: ${this.currentPolicyStack.join(', ')}</p>
                    </div>
                `;
            case 'chancellor-choose':
                return `
                    <div class="chancellor-choose-phase">
                        <h3>Chancellor's Choice</h3>
                        <p>Choose one policy to enact</p>
                        <p>Available policies: ${this.currentPolicyStack.join(', ')}</p>
                    </div>
                `;
            case 'executive':
                return `
                    <div class="executive-phase">
                        <h3>Executive Powers</h3>
                        <p>President has special powers due to ${this.fascistPolicies} Fascist policies</p>
                        <p>Available powers: ${this.executivePowers.join(', ')}</p>
                    </div>
                `;
            default:
                return '<p>Game phase not recognized</p>';
        }
    }

    getGameOverHTML() {
        return `
            <div class="game-page">
                <div class="game-over">
                    <h2>Game Over!</h2>
                    <div class="winner-announcement ${this.winner}">
                        <h3>${this.winner.charAt(0).toUpperCase() + this.winner.slice(1)} Team Wins!</h3>
                        <p>Final Score: Liberal ${this.liberalPolicies}/5, Fascist ${this.fascistPolicies}/6</p>
                    </div>
                    
                    <div class="final-board">
                        <h3>Final Game Board</h3>
                        <div class="policy-tracks">
                            <div class="policy-track liberal-track">
                                <h4>Liberal Policies: ${this.liberalPolicies}/5</h4>
                                <div class="track-spaces">
                                    ${this.getTrackSpaces(this.liberalPolicies, 5, 'liberal')}
                                </div>
                            </div>
                            <div class="policy-track fascist-track">
                                <h4>Fascist Policies: ${this.fascistPolicies}/6</h4>
                                <div class="track-spaces">
                                    ${this.getTrackSpaces(this.fascistPolicies, 6, 'fascist')}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="game-actions">
                        <button data-navigate="setup" class="btn btn-primary">Play Again</button>
                        <button data-navigate="home" class="btn btn-outline">Back to Home</button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
