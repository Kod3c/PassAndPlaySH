// Main application controller
class App {
    constructor() {
        this.currentPage = 'home';
        this.basePath = this.getBasePath();
        this.game = null;
        this.init();
    }

    init() {
        this.setupRouting();
        this.restorePageFromURL();
        this.setupEventListeners();
        this.setupThemeSwitcher();
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
        this.currentPage = pageName;
        
        // Update browser history if requested
        if (updateHistory) {
            const url = pageName === 'home' ? this.basePath + '/' : this.basePath + `/${pageName}`;
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
        
        // Update active navigation
        this.updateActiveNavigation(pageName);
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
            if (event.target.matches('[data-navigate]')) {
                const page = event.target.dataset.navigate;
                this.navigateToPage(page);
            }
        });

        // Setup rules page navigation
        document.addEventListener('click', (event) => {
            if (event.target.matches('.rule-nav-btn')) {
                const section = event.target.dataset.section;
                this.showRulesSection(section);
            }
        });

        // Setup other event listeners
        this.setupHeaderNavigation();
        this.setupGameSetupListeners();
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

    setThemeSwitcherState(enabled) {
        const themeSwitcher = document.querySelector('.theme-switcher');
        const themeOptions = document.querySelectorAll('.theme-option');
        const enableThemeBtn = document.getElementById('enable-theme-btn');
        
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
        const isCurrentlyEnabled = !document.querySelector('.theme-switcher').classList.contains('disabled');
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

        // Start game button
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
    }

    getCurrentPlayerCount() {
        const currentCountSpan = document.querySelector('.current-count');
        return currentCountSpan ? parseInt(currentCountSpan.textContent) : 0;
    }

    updatePlayerCount(newCount) {
        // Update the display
        const currentCountSpan = document.querySelector('.current-count');
        if (currentCountSpan) {
            currentCountSpan.textContent = newCount;
        }

        // Update button states
        const minusBtn = document.getElementById('player-minus');
        const plusBtn = document.getElementById('player-plus');
        
        if (minusBtn) {
            minusBtn.disabled = newCount === 0;
        }
        if (plusBtn) {
            plusBtn.disabled = newCount >= 10;
        }

        // Update role distribution and player inputs
        this.selectPlayerCount(newCount);
    }

    selectPlayerCount(count) {
        const playerInputs = document.getElementById('player-inputs');
        const roleInfo = document.getElementById('role-info');
        const startGameBtn = document.getElementById('start-game-btn');
        
        if (!playerInputs || !roleInfo || !startGameBtn) return;

        if (count === 0) {
            // Hide role distribution and player inputs when count is 0
            roleInfo.innerHTML = '<p>Select player count to see role distribution</p>';
            playerInputs.innerHTML = '<p>Select player count to add players</p>';
            startGameBtn.disabled = true;
            return;
        }

        // Update role distribution display
        const distribution = this.getRoleDistribution(count);
        const liberalPercent = Math.round((distribution.liberals / count) * 100);
        const fascistPercent = Math.round((distribution.fascists / count) * 100);
        const hitlerPercent = Math.round((distribution.hitler / count) * 100);
        
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

        // Generate player input fields based on selected count
        playerInputs.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'player-input-group';
            inputGroup.innerHTML = `
                <label for="player-${i}">Player ${i}:</label>
                <input type="text" id="player-${i}" class="player-name-input" placeholder="Enter player name">
            `;
            playerInputs.appendChild(inputGroup);
        }

        // Enable start game button
        startGameBtn.disabled = false;
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
        
        this.assignRoles();
        this.shufflePolicyDeck();
        this.dealInitialCards();
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

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    dealInitialCards() {
        // Deal 3 policy cards to each player
        this.playerCards = {};
        this.players.forEach(player => {
            this.playerCards[player] = [];
            for (let i = 0; i < 3; i++) {
                if (this.policyDeck.length > 0) {
                    this.playerCards[player].push(this.policyDeck.pop());
                }
            }
        });
    }

    nextTurn() {
        if (this.gameOver) return;
        
        this.currentTurn++;
        this.currentPresident = (this.currentPresident + 1) % this.playerCount;
        this.currentChancellor = null;
        this.gamePhase = 'election';
        this.votes = [];
        this.electionTracker = 0;
        
        // Check for election tracker failure
        if (this.electionTracker >= 3) {
            this.enactTopPolicy();
            this.electionTracker = 0;
        }
    }

    submitVote(vote) {
        if (this.gamePhase !== 'election') return;
        
        this.votes.push(vote);
        
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
        } else {
            // Election failed
            this.electionTracker++;
            this.lastElection = 'failed';
            this.nextTurn();
        }
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

    enactTopPolicy() {
        if (this.policyDeck.length === 0) return;
        
        const policy = this.policyDeck.pop();
        if (policy === 'liberal') {
            this.liberalPolicies++;
        } else {
            this.fascistPolicies++;
        }
        
        this.checkWinConditions();
    }

    checkWinConditions() {
        // Liberal win conditions
        if (this.liberalPolicies >= 5) {
            this.gameOver = true;
            this.winner = 'liberal';
            return true;
        }
        
        // Fascist win conditions
        if (this.fascistPolicies >= 6) {
            this.gameOver = true;
            this.winner = 'fascist';
            return true;
        }
        
        // Hitler execution win (would be implemented in executive phase)
        
        return false;
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
                        <span>Phase: ${this.gamePhase}</span>
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
                    
                    <div class="game-status">
                        ${this.getGameStatusHTML()}
                    </div>
                </div>
                
                <div class="game-actions">
                    <button id="next-turn-btn" class="btn btn-primary">Next Turn</button>
                    <button id="game-back-home-btn" class="btn btn-outline">Back to Home</button>
                </div>
            </div>
        `;
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
                        <p>Choose a policy to enact:</p>
                        <div class="policy-choices">
                            <button class="policy-btn btn btn-primary" data-policy="liberal">Liberal Policy</button>
                            <button class="policy-btn btn btn-secondary" data-policy="fascist">Fascist Policy</button>
                        </div>
                    </div>
                `;
            case 'executive':
                return `
                    <div class="executive-phase">
                        <h3>Executive Powers</h3>
                        <p>President has special powers due to ${this.fascistPolicies} Fascist policies</p>
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
