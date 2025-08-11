// Secret Hitler Pass & Play PWA
// Main application file

class SecretHitlerApp {
    constructor() {
        this.gameState = null;
        this.currentPage = 'home';
    }

    init() {
        // Check if we're landing on a specific route and restore the page state
        this.restorePageFromURL();
        
        this.bindEvents();
        this.checkForSavedGame();
        this.setupServiceWorker();
    }

    restorePageFromURL() {
        const currentPath = window.location.pathname;
        const basePath = currentPath.includes('/PassAndPlaySH') ? '/PassAndPlaySH' : '';
        
        // Extract the page name from the URL
        let pageName = 'home';
        if (currentPath !== basePath + '/' && currentPath !== '/') {
            // Remove the base path and leading slash to get the page name
            const pathWithoutBase = currentPath.replace(basePath, '').replace(/^\//, '');
            if (pathWithoutBase && pathWithoutBase !== 'index.html') {
                pageName = pathWithoutBase;
            }
        }
        
        // If we're not on the home page, load the appropriate page content
        if (pageName !== 'home') {
            this.currentPage = pageName;
            this.loadPageContent(pageName);
        }
    }

    bindEvents() {
        // New Game button
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                console.log('New Game button clicked');
                this.navigateToPage('setup');
            });
        } else {
            console.error('New Game button not found');
        }

        // Load Game button
        const loadGameBtn = document.getElementById('load-game-btn');
        if (loadGameBtn) {
            loadGameBtn.addEventListener('click', () => {
                console.log('Load Game button clicked');
                this.loadSavedGame();
            });
        } else {
            console.error('Load Game button not found');
        }

        // Rules button
        const rulesBtn = document.getElementById('rules-btn');
        if (rulesBtn) {
            rulesBtn.addEventListener('click', () => {
                console.log('Rules button clicked');
                this.navigateToPage('rules');
            });
        } else {
            console.error('Rules button not found');
        }

        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });
    }

    navigateToPage(pageName) {
        this.currentPage = pageName;
        
        // Update browser history with proper base path
        const currentPath = window.location.pathname;
        const basePath = currentPath.includes('/PassAndPlaySH') ? '/PassAndPlaySH' : '';
        const url = pageName === 'home' ? basePath + '/' : basePath + `/${pageName}`;
        window.history.pushState({ page: pageName }, '', url);
        
        // Load page content
        this.loadPageContent(pageName);
    }

    async loadPageContent(pageName) {
        try {
            // Get the current path to determine the base URL
            const currentPath = window.location.pathname;
            const basePath = currentPath.includes('/PassAndPlaySH') ? '/PassAndPlaySH' : '';
            const response = await fetch(`${basePath}/pages/${pageName}.html`);
            
            if (response.ok) {
                const content = await response.text();
                this.updateMainContent(content);
            } else {
                console.error(`Failed to load page: ${pageName}`);
                this.showError(`Could not load ${pageName} page`);
            }
        } catch (error) {
            console.error('Error loading page:', error);
            this.showError('Network error loading page');
        }
    }

    updateMainContent(content) {
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = content;
            // Re-bind events for the new content
            this.bindPageEvents();
        }
    }

    bindPageEvents() {
        // Bind events based on current page
        switch (this.currentPage) {
            case 'setup':
                this.bindSetupEvents();
                break;
            case 'game':
                this.bindGameEvents();
                break;
            case 'election':
                this.bindElectionEvents();
                break;
            case 'legislation':
                this.bindLegislationEvents();
                break;
            case 'executive-powers':
                this.bindExecutivePowersEvents();
                break;
            case 'role-reveal':
                this.bindRoleRevealEvents();
                break;
        }
    }

    checkForSavedGame() {
        const savedGame = localStorage.getItem('secretHitlerGame');
        if (savedGame) {
            try {
                this.gameState = JSON.parse(savedGame);
                // Enable load game button if we have a saved game
                const loadBtn = document.getElementById('load-game-btn');
                if (loadBtn) {
                    loadBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error parsing saved game:', error);
                localStorage.removeItem('secretHitlerGame');
            }
        }
    }

    loadSavedGame() {
        if (this.gameState) {
            this.navigateToPage('game');
        } else {
            this.showError('No saved game found');
        }
    }

    saveGameState() {
        if (this.gameState) {
            localStorage.setItem('secretHitlerGame', JSON.stringify(this.gameState));
        }
    }

    showError(message) {
        // Simple error display - can be enhanced later
        alert(message);
    }

    handlePopState(event) {
        if (event.state && event.state.page) {
            this.currentPage = event.state.page;
            this.loadPageContent(event.state.page);
        }
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // Get the current path to determine the base URL for service worker
                const currentPath = window.location.pathname;
                const basePath = currentPath.includes('/PassAndPlaySH') ? '/PassAndPlaySH' : '';
                const registration = await navigator.serviceWorker.register(basePath + '/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    // Game state management methods (to be implemented)
    startNewGame() {
        this.gameState = {
            players: [],
            roles: [],
            currentPhase: 'setup',
            electionTracker: 0,
            policies: {
                liberal: 0,
                fascist: 0
            },
            deck: [],
            discard: [],
            currentPresident: null,
            currentChancellor: null,
            lastGovernment: null,
            gameLog: [],
            timestamp: Date.now()
        };
        this.saveGameState();
    }

    resetGame() {
        this.gameState = null;
        localStorage.removeItem('secretHitlerGame');
        this.navigateToPage('home');
    }

    bindSetupEvents() {
        const playerCountBtns = document.querySelectorAll('.player-count-btn');
        const playerInputs = document.getElementById('player-inputs');
        const roleInfo = document.getElementById('role-info');
        const startGameBtn = document.getElementById('start-game-btn');
        const backBtn = document.getElementById('back-to-home-btn');

        // Player count selection
        playerCountBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const count = parseInt(btn.dataset.count);
                this.selectPlayerCount(count, playerInputs, roleInfo, startGameBtn);
            });
        });

        // Start game button
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.initializeGame();
            });
        }

        // Back button
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.navigateToPage('home');
            });
        }
    }

    selectPlayerCount(count, playerInputs, roleInfo, startGameBtn) {
        // Clear previous selection
        const playerCountBtns = document.querySelectorAll('.player-count-btn');
        playerCountBtns.forEach(btn => btn.classList.remove('selected'));
        
        // Mark selected button
        const selectedBtn = document.querySelector(`[data-count="${count}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
        // Update role distribution display
        const distribution = this.getRoleDistribution(count);
        roleInfo.innerHTML = `
            <div class="role-distribution-visual">
                <div class="distribution-header">
                    <h5>Role Breakdown</h5>
                    <div class="total-players">Total: ${count} Players</div>
                </div>
                <div class="role-cards">
                    <div class="role-card liberal">
                        <div class="role-icon">🕊️</div>
                        <div class="role-name">Liberal</div>
                        <div class="role-count">${distribution.liberals}</div>
                        <div class="role-percentage">${Math.round((distribution.liberals / count) * 100)}%</div>
                    </div>
                    <div class="role-card fascist">
                        <div class="role-icon">⚔️</div>
                        <div class="role-name">Fascist</div>
                        <div class="role-count">${distribution.fascists}</div>
                        <div class="role-percentage">${Math.round((distribution.fascists / count) * 100)}%</div>
                    </div>
                    <div class="role-card hitler">
                        <div class="role-icon">👑</div>
                        <div class="role-name">Hitler</div>
                        <div class="role-count">${distribution.hitler}</div>
                        <div class="role-percentage">${Math.round((distribution.hitler / count) * 100)}%</div>
                    </div>
                </div>
                <div class="distribution-summary">
                    <div class="summary-item">
                        <span class="summary-label">Liberal Majority:</span>
                        <span class="summary-value ${distribution.liberals > (distribution.fascists + distribution.hitler) ? 'yes' : 'no'}">${distribution.liberals > (distribution.fascists + distribution.hitler) ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Fascist Team:</span>
                        <span class="summary-value">${distribution.fascists + distribution.hitler} players</span>
                    </div>
                </div>
            </div>
        `;

        // Generate player input fields
        playerInputs.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group';
            inputGroup.innerHTML = `
                <label for="player-${i}">Player ${i + 1}:</label>
                <input type="text" id="player-${i}" placeholder="Enter name" required>
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
            9: { liberals: 5, fascists: 3, hitler: 1 },
            10: { liberals: 6, fascists: 3, hitler: 1 }
        };
        return distributions[playerCount] || distributions[5]; // Default to 5 players if invalid count
    }

    initializeGame() {
        const playerCount = this.getSelectedPlayerCount();
        const playerNames = this.getPlayerNames(playerCount);
        
        if (playerNames.length !== playerCount) {
            this.showError('Please enter all player names');
            return;
        }

        // Initialize game engine
        if (typeof SecretHitlerGameEngine !== 'undefined') {
            const gameEngine = new SecretHitlerGameEngine();
            this.gameState = gameEngine.initializeGame(playerCount, playerNames);
            
            // Navigate to role reveal
            this.navigateToPage('role-reveal');
        } else {
            this.showError('Game engine not loaded');
        }
    }

    getSelectedPlayerCount() {
        const selectedBtn = document.querySelector('.player-count-btn.selected');
        return selectedBtn ? parseInt(selectedBtn.dataset.count) : 5;
    }

    getPlayerNames(playerCount) {
        const names = [];
        for (let i = 0; i < playerCount; i++) {
            const input = document.getElementById(`player-${i}`);
            if (input && input.value.trim()) {
                names.push(input.value.trim());
            }
        }
        return names;
    }

    // Role reveal page functionality
    bindRoleRevealEvents() {
        const nextPlayerBtn = document.getElementById('next-player-btn');
        const startGameBtn = document.getElementById('start-game-btn');
        
        if (nextPlayerBtn) {
            nextPlayerBtn.addEventListener('click', () => {
                this.nextPlayerRoleReveal();
            });
        }
        
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startGameAfterRoleReveal();
            });
        }
        
        // Initialize role reveal for current player
        this.initializeRoleReveal();
    }

    initializeRoleReveal() {
        if (!this.gameState) return;
        
        const currentPlayerIndex = this.gameState.currentPlayerIndex || 0;
        const currentPlayer = this.gameState.players[currentPlayerIndex];
        
        // Update player name display
        const playerNameElement = document.getElementById('current-player-name');
        if (playerNameElement) {
            playerNameElement.textContent = currentPlayer.name;
        }
        
        // Update role display
        this.updateRoleDisplay(currentPlayer);
        
        // Show/hide appropriate buttons
        const nextPlayerBtn = document.getElementById('next-player-btn');
        const startGameBtn = document.getElementById('start-game-btn');
        
        if (currentPlayerIndex === this.gameState.players.length - 1) {
            // Last player - show start game button
            if (nextPlayerBtn) nextPlayerBtn.style.display = 'none';
            if (startGameBtn) startGameBtn.style.display = 'block';
        } else {
            // Not last player - show next player button
            if (nextPlayerBtn) nextPlayerBtn.style.display = 'block';
            if (startGameBtn) startGameBtn.style.display = 'none';
        }
    }

    updateRoleDisplay(player) {
        const roleCard = document.getElementById('role-card');
        const roleTitle = document.getElementById('role-title');
        const roleDescription = document.getElementById('role-description');
        const teamInfo = document.getElementById('team-info');
        const teamDescription = document.getElementById('team-description');
        const roleInstructions = document.getElementById('role-instructions');
        
        if (!roleCard || !roleTitle || !roleDescription || !teamInfo || !teamDescription || !roleInstructions) return;
        
        // Set role card styling
        roleCard.className = `role-card ${player.role}`;
        
        // Update role title and description
        if (player.role === 'hitler') {
            roleTitle.textContent = 'Hitler';
            roleDescription.textContent = 'You are Hitler, a Fascist who doesn\'t know the other Fascists. If you become Chancellor after 3 Fascist policies, Fascists win!';
        } else if (player.role === 'fascist') {
            roleTitle.textContent = 'Fascist';
            roleDescription.textContent = 'You are a Fascist. Work with other Fascists to enact 6 Fascist policies or have Hitler elected Chancellor after 3 Fascist policies.';
        } else {
            roleTitle.textContent = 'Liberal';
            roleDescription.textContent = 'You are a Liberal. Work with other Liberals to enact 5 Liberal policies or identify and execute Hitler.';
        }
        
        // Update team information
        if (player.role === 'hitler') {
            teamDescription.textContent = 'You are a Fascist, but you don\'t know who the other Fascists are. They know who you are.';
        } else if (player.role === 'fascist') {
            teamDescription.textContent = 'You are a Fascist. You know who the other Fascists are, including Hitler.';
        } else {
            teamDescription.textContent = 'You are a Liberal. You don\'t know who the other Liberals are.';
        }
        
        // Update instructions
        this.updateRoleInstructions(roleInstructions, player.role);
    }

    updateRoleInstructions(container, role) {
        if (!container) return;
        
        let instructions = [];
        
        if (role === 'hitler') {
            instructions = [
                'You are a Fascist but don\'t know who the other Fascists are',
                'If you are elected Chancellor after 3 Fascist policies, Fascists win',
                'Be very careful not to reveal your identity',
                'Try to get elected Chancellor when the time is right'
            ];
        } else if (role === 'fascist') {
            instructions = [
                'Enact 6 Fascist policies to win',
                'OR have Hitler elected Chancellor after 3 Fascist policies',
                'Work with other Fascists to pass Fascist policies',
                'Try to appear Liberal to avoid suspicion'
            ];
        } else {
            instructions = [
                'Enact 5 Liberal policies to win',
                'OR identify and execute Hitler',
                'Work with other Liberals to pass Liberal policies',
                'Be careful not to reveal your identity to Fascists'
            ];
        }
        
        container.innerHTML = instructions.map(instruction => `<li>${instruction}</li>`).join('');
    }

    nextPlayerRoleReveal() {
        if (!this.gameState) return;
        
        this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex || 0) + 1;
        this.saveGameState();
        
        // Show handoff screen briefly
        this.showHandoffScreen();
        
        // Then show next player's role
        setTimeout(() => {
            this.initializeRoleReveal();
        }, 2000);
    }

    showHandoffScreen() {
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = `
                <div class="handoff-screen">
                    <h2>Pass Device to Next Player</h2>
                    <p>Please pass this device to <strong>${this.gameState.players[this.gameState.currentPlayerIndex].name}</strong></p>
                    <p class="handoff-warning">Do not show your role to other players!</p>
                </div>
            `;
        }
    }

    startGameAfterRoleReveal() {
        if (!this.gameState) return;
        
        // Start the game
        if (typeof SecretHitlerGameEngine !== 'undefined') {
            const gameEngine = new SecretHitlerGameEngine();
            this.gameState = gameEngine.startGame(this.gameState);
            this.saveGameState();
            
            // Navigate to main game page
            this.navigateToPage('game');
        }
    }

    // Game page functionality
    bindGameEvents() {
        const startElectionBtn = document.getElementById('start-election-btn');
        const viewRulesBtn = document.getElementById('view-rules-btn');
        const saveGameBtn = document.getElementById('save-game-btn');
        const newGameBtn = document.getElementById('new-game-btn');
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (startElectionBtn) {
            startElectionBtn.addEventListener('click', () => {
                this.startElection();
            });
        }
        
        if (viewRulesBtn) {
            viewRulesBtn.addEventListener('click', () => {
                this.navigateToPage('rules');
            });
        }
        
        if (saveGameBtn) {
            saveGameBtn.addEventListener('click', () => {
                this.saveGameState();
            });
        }
        
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.resetGame();
            });
        }
        
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.undoAction();
            });
        }
        
        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                this.redoAction();
            });
        }
        
        // Initialize game display
        this.initializeGameDisplay();
    }

    initializeGameDisplay() {
        if (!this.gameState) return;
        
        this.updatePolicyTracks();
        this.updateElectionTracker();
        this.updateCurrentGovernment();
        this.updatePlayerList();
        this.updateGameLog();
        this.updateDeckStatus();
    }

    updatePolicyTracks() {
        // Update Liberal policy track
        const liberalSlots = document.getElementById('liberal-policy-slots');
        const liberalCount = document.getElementById('liberal-count');
        
        if (liberalSlots && liberalCount) {
            liberalSlots.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const slot = document.createElement('div');
                slot.className = `policy-slot ${i < this.gameState.policies.liberal ? 'filled liberal' : ''}`;
                liberalSlots.appendChild(slot);
            }
            liberalCount.textContent = this.gameState.policies.liberal;
        }
        
        // Update Fascist policy track
        const fascistSlots = document.getElementById('fascist-policy-slots');
        const fascistCount = document.getElementById('fascist-count');
        
        if (fascistSlots && fascistCount) {
            fascistSlots.innerHTML = '';
            for (let i = 0; i < 6; i++) {
                const slot = document.createElement('div');
                slot.className = `policy-slot ${i < this.gameState.policies.fascist ? 'filled fascist' : ''}`;
                fascistSlots.appendChild(slot);
            }
            fascistCount.textContent = this.gameState.policies.fascist;
        }
    }

    updateElectionTracker() {
        const trackerSlots = document.querySelectorAll('.tracker-slot');
        trackerSlots.forEach((slot, index) => {
            if (index < this.gameState.electionTracker) {
                slot.classList.add('filled');
            } else {
                slot.classList.remove('filled');
            }
        });
    }

    updateCurrentGovernment() {
        const presidentElement = document.getElementById('current-president');
        const chancellorElement = document.getElementById('current-chancellor');
        
        if (presidentElement) {
            presidentElement.textContent = this.gameState.currentPresident ? 
                this.gameState.players[this.gameState.currentPresident].name : 'None';
        }
        
        if (chancellorElement) {
            chancellorElement.textContent = this.gameState.currentChancellor ? 
                this.gameState.players[this.gameState.currentChancellor].name : 'None';
        }
    }

    updatePlayerList() {
        const playersGrid = document.getElementById('players-grid');
        if (!playersGrid) return;
        
        playersGrid.innerHTML = '';
        this.gameState.players.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${!player.isAlive ? 'dead' : ''}`;
            
            let statusClass = '';
            if (index === this.gameState.currentPresident) statusClass = 'current-president';
            else if (index === this.gameState.currentChancellor) statusClass = 'current-chancellor';
            
            if (statusClass) playerCard.classList.add(statusClass);
            
            playerCard.innerHTML = `
                <h4>${player.name}</h4>
                <p class="player-status">${player.isAlive ? 'Alive' : 'Dead'}</p>
                ${statusClass ? `<p class="role-label">${statusClass.replace('-', ' ')}</p>` : ''}
            `;
            
            playersGrid.appendChild(playerCard);
        });
    }

    updateGameLog() {
        const logEntries = document.getElementById('log-entries');
        if (!logEntries) return;
        
        logEntries.innerHTML = '';
        this.gameState.gameLog.slice(-10).forEach(entry => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = `
                <span class="timestamp">${new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span class="action">${entry.action}</span>
            `;
            logEntries.appendChild(logEntry);
        });
    }

    updateDeckStatus() {
        const deckCount = document.getElementById('deck-count');
        const discardCount = document.getElementById('discard-count');
        
        if (deckCount) deckCount.textContent = this.gameState.deck.length;
        if (discardCount) discardCount.textContent = this.gameState.discard.length;
    }

    startElection() {
        if (!this.gameState) return;
        
        // Initialize election state
        this.gameState.currentPhase = 'election';
        this.gameState.electionPhase = 'nomination';
        this.gameState.electionVotes = [];
        this.gameState.selectedChancellor = null;
        
        // Select first president if none selected
        if (this.gameState.currentPresident === null) {
            this.gameState.currentPresident = 0;
        }
        
        this.saveGameState();
        
        // Navigate to election page
        this.navigateToPage('election');
    }

    undoAction() {
        // TODO: Implement undo functionality
        console.log('Undo action');
    }

    redoAction() {
        // TODO: Implement redo functionality
        console.log('Redo action');
    }

    bindElectionEvents() {
        // Election page functionality
        const confirmNominationBtn = document.getElementById('confirm-nomination-btn');
        const continueBtn = document.getElementById('continue-btn');
        const nomineesGrid = document.getElementById('nominees-grid');
        const voteButtons = document.querySelectorAll('.vote-btn');

        if (confirmNominationBtn) {
            confirmNominationBtn.addEventListener('click', () => {
                this.confirmChancellorNomination();
            });
        }

        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.continueAfterElection();
            });
        }

        // Bind vote buttons
        voteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vote = e.target.dataset.vote;
                this.submitVote(vote);
            });
        });

        // Initialize election display
        this.initializeElectionDisplay();
    }

    initializeElectionDisplay() {
        if (!this.gameState) return;
        
        this.updateElectionDisplay();
        this.populateNomineesGrid();
        this.updateElectionTracker();
    }

    updatePresidentVotes(votesElement, voteCountElement, voteListElement) {
        if (!votesElement || !voteCountElement || !voteListElement) return;

        const presidentVotes = this.gameState.presidentVotes || [];
        const presidentVoteCount = presidentVotes.length;

        voteCountElement.textContent = presidentVoteCount;
        voteListElement.innerHTML = '';

        presidentVotes.forEach(vote => {
            const voteItem = document.createElement('li');
            voteItem.textContent = vote;
            voteListElement.appendChild(voteItem);
        });
    }

    updateChancellorVotes(votesElement, voteCountElement, voteListElement) {
        if (!votesElement || !voteCountElement || !voteListElement) return;

        const chancellorVotes = this.gameState.chancellorVotes || [];
        const chancellorVoteCount = chancellorVotes.length;

        voteCountElement.textContent = chancellorVoteCount;
        voteListElement.innerHTML = '';

        chancellorVotes.forEach(vote => {
            const voteItem = document.createElement('li');
            voteItem.textContent = vote;
            voteListElement.appendChild(voteItem);
        });
    }

    nominateChancellor() {
        if (!this.gameState) return;
        
        // This method is called when starting an election from the game page
        this.gameState.currentPhase = 'election';
        this.gameState.electionVotes = [];
        this.gameState.selectedChancellor = null;
        this.saveGameState();
        
        this.navigateToPage('election');
    }

    voteChancellor() {
        // This method is deprecated - using new election system
        console.warn('voteChancellor method is deprecated');
    }

    submitPresidentVote(vote) {
        if (!this.gameState) return;
        
        const presidentVoteInput = document.getElementById('president-vote-input');
        if (presidentVoteInput) presidentVoteInput.value = '';

        this.voteChancellor();
    }

    submitChancellorVote(vote) {
        if (!this.gameState) return;
        
        const chancellorVoteInput = document.getElementById('chancellor-vote-input');
        if (chancellorVoteInput) chancellorVoteInput.value = '';

        this.voteChancellor();
    }

    // New election system methods
    confirmChancellorNomination() {
        if (!this.gameState || !this.gameState.selectedChancellor) {
            this.showError('Please select a Chancellor candidate first.');
            return;
        }

        // Move to voting phase
        this.gameState.electionPhase = 'voting';
        this.gameState.currentChancellor = this.gameState.selectedChancellor;
        this.saveGameState();
        
        this.showVotingPhase();
    }

    submitVote(vote) {
        if (!this.gameState) return;
        
        if (!this.gameState.electionVotes) {
            this.gameState.electionVotes = [];
        }

        // Add vote (in real implementation, this would be per player)
        this.gameState.electionVotes.push(vote);
        this.saveGameState();
        
        this.updateVotingProgress();
        
        // Check if all votes are in
        if (this.gameState.electionVotes.length >= this.gameState.players.length) {
            this.resolveElection();
        }
    }

    continueAfterElection() {
        if (!this.gameState) return;
        
        // Check if election was successful
        const jaVotes = this.gameState.electionVotes.filter(v => v === 'ja').length;
        const neinVotes = this.gameState.electionVotes.filter(v => v === 'nein').length;
        
        if (jaVotes > neinVotes) {
            // Election successful - move to legislation
            this.gameState.currentPhase = 'legislation';
            this.gameState.electionTracker = 0; // Reset failed elections
            this.saveGameState();
            this.navigateToPage('legislation');
        } else {
            // Election failed
            this.gameState.electionTracker++;
            this.gameState.currentPhase = 'election';
            this.gameState.electionVotes = [];
            this.gameState.selectedChancellor = null;
            this.saveGameState();
            
            // Check if 3 failed elections in a row
            if (this.gameState.electionTracker >= 3) {
                this.enactFailedElectionPolicy();
            } else {
                this.showNominationPhase();
            }
        }
    }

    showNominationPhase() {
        const nominationPhase = document.getElementById('nomination-phase');
        const votingPhase = document.getElementById('voting-phase');
        const electionResult = document.getElementById('election-result');
        
        if (nominationPhase) nominationPhase.style.display = 'block';
        if (votingPhase) votingPhase.style.display = 'none';
        if (electionResult) electionResult.style.display = 'none';
    }

    showVotingPhase() {
        const nominationPhase = document.getElementById('nomination-phase');
        const votingPhase = document.getElementById('voting-phase');
        const electionResult = document.getElementById('election-result');
        
        if (nominationPhase) nominationPhase.style.display = 'none';
        if (votingPhase) votingPhase.style.display = 'block';
        if (electionResult) electionResult.style.display = 'none';
    }

    showElectionResult() {
        const nominationPhase = document.getElementById('nomination-phase');
        const votingPhase = document.getElementById('voting-phase');
        const electionResult = document.getElementById('election-result');
        
        if (nominationPhase) nominationPhase.style.display = 'none';
        if (votingPhase) votingPhase.style.display = 'none';
        if (electionResult) electionResult.style.display = 'block';
    }

    updateElectionDisplay() {
        if (!this.gameState) return;
        
        // Update election info
        const electionNumber = document.getElementById('election-number');
        const failedElections = document.getElementById('failed-elections');
        const currentPresident = document.getElementById('current-president');
        const currentChancellor = document.getElementById('current-chancellor');
        const presidentName = document.getElementById('president-name');
        const governmentCandidates = document.getElementById('government-candidates');
        
        if (electionNumber) electionNumber.textContent = this.gameState.electionTracker + 1;
        if (failedElections) failedElections.textContent = this.gameState.electionTracker || 0;
        
        if (currentPresident && this.gameState.currentPresident !== null) {
            currentPresident.textContent = this.gameState.players[this.gameState.currentPresident].name;
        }
        
        if (currentChancellor && this.gameState.currentChancellor !== null) {
            currentChancellor.textContent = this.gameState.players[this.gameState.currentChancellor].name;
        }
        
        if (presidentName && this.gameState.currentPresident !== null) {
            presidentName.textContent = this.gameState.players[this.gameState.currentPresident].name;
        }
        
        if (governmentCandidates) {
            const presName = this.gameState.currentPresident !== null ? this.gameState.players[this.gameState.currentPresident].name : 'Unknown';
            const chanName = this.gameState.currentChancellor !== null ? this.gameState.players[this.gameState.currentChancellor].name : 'Unknown';
            governmentCandidates.textContent = `${presName} and ${chanName}`;
        }
    }

    populateNomineesGrid() {
        if (!this.gameState) return;
        
        const nomineesGrid = document.getElementById('nominees-grid');
        if (!nomineesGrid) return;
        
        nomineesGrid.innerHTML = '';
        
        // Show all eligible players (not current president, not dead)
        this.gameState.players.forEach((player, index) => {
            if (player.isAlive && index !== this.gameState.currentPresident) {
                const nomineeBtn = document.createElement('button');
                nomineeBtn.className = 'nominee-btn';
                nomineeBtn.textContent = player.name;
                nomineeBtn.dataset.playerId = index;
                
                nomineeBtn.addEventListener('click', () => {
                    this.selectChancellorNominee(index);
                });
                
                nomineesGrid.appendChild(nomineeBtn);
            }
        });
    }

    selectChancellorNominee(playerId) {
        if (!this.gameState) return;
        
        // Clear previous selection
        const nomineeBtns = document.querySelectorAll('.nominee-btn');
        nomineeBtns.forEach(btn => btn.classList.remove('selected'));
        
        // Select new nominee
        const selectedBtn = document.querySelector(`[data-player-id="${playerId}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
        this.gameState.selectedChancellor = playerId;
        
        // Enable confirm button
        const confirmBtn = document.getElementById('confirm-nomination-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    }

    updateVotingProgress() {
        if (!this.gameState) return;
        
        const votesCast = document.getElementById('votes-cast');
        const totalVotes = document.getElementById('total-votes');
        
        if (votesCast) votesCast.textContent = this.gameState.electionVotes.length;
        if (totalVotes) totalVotes.textContent = this.gameState.players.length;
    }

    resolveElection() {
        if (!this.gameState) return;
        
        const jaVotes = this.gameState.electionVotes.filter(v => v === 'ja').length;
        const neinVotes = this.gameState.electionVotes.filter(v => v === 'nein').length;
        
        // Update vote counts
        const jaVotesElement = document.getElementById('ja-votes');
        const neinVotesElement = document.getElementById('nein-votes');
        const voteOutcome = document.getElementById('vote-outcome');
        
        if (jaVotesElement) jaVotesElement.textContent = jaVotes;
        if (neinVotesElement) neinVotesElement.textContent = neinVotes;
        
        if (voteOutcome) {
            if (jaVotes > neinVotes) {
                voteOutcome.textContent = 'Election Successful!';
                voteOutcome.className = 'vote-outcome success';
            } else {
                voteOutcome.textContent = 'Election Failed!';
                voteOutcome.className = 'vote-outcome failure';
            }
        }
        
        this.showElectionResult();
    }

    enactFailedElectionPolicy() {
        if (!this.gameState) return;
        
        // Draw top policy from deck and enact it
        if (this.gameState.deck.length > 0) {
            const policy = this.gameState.deck.pop();
            this.gameState.policies[policy]++;
            this.gameState.electionTracker = 0; // Reset tracker
            
            // Log the action
            this.gameState.gameLog.push({
                action: 'Failed Election Policy Enacted',
                policy: policy,
                timestamp: Date.now()
            });
            
            this.saveGameState();
            
            // Check win conditions
            if (this.checkWinConditions()) {
                this.endGame();
            } else {
                // Continue to next round
                this.nextRound();
            }
        }
    }

    checkWinConditions() {
        if (!this.gameState) return false;
        
        // Check Liberal win (5 Liberal policies)
        if (this.gameState.policies.liberal >= 5) {
            return 'liberal';
        }
        
        // Check Fascist win (6 Fascist policies)
        if (this.gameState.policies.fascist >= 6) {
            return 'fascist';
        }
        
        // Check Hitler execution
        if (this.gameState.hitlerExecuted) {
            return 'liberal';
        }
        
        return false;
    }

    nextRound() {
        if (!this.gameState) return;
        
        // Select next president
        this.gameState.currentPresident = (this.gameState.currentPresident + 1) % this.gameState.players.length;
        
        // Skip dead players
        while (!this.gameState.players[this.gameState.currentPresident].isAlive) {
            this.gameState.currentPresident = (this.gameState.currentPresident + 1) % this.gameState.players.length;
        }
        
        this.gameState.currentPhase = 'election';
        this.gameState.electionVotes = [];
        this.gameState.selectedChancellor = null;
        this.saveGameState();
        
        this.navigateToPage('election');
    }

    endGame() {
        if (!this.gameState) return;
        
        const winner = this.checkWinConditions();
        alert(`Game Over! ${winner.charAt(0).toUpperCase() + winner.slice(1)}s win!`);
        
        // Reset game
        this.resetGame();
    }

    bindLegislationEvents() {
        // Legislation page functionality
        const backToGameBtn = document.getElementById('back-to-game-btn');
        const nominatePolicyBtn = document.getElementById('nominate-policy-btn');
        const votePolicyBtn = document.getElementById('vote-policy-btn');
        const policyVotes = document.getElementById('policy-votes');
        const policyVoteCount = document.getElementById('policy-vote-count');
        const policyVoteList = document.getElementById('policy-vote-list');
        const policyVoteInput = document.getElementById('policy-vote-input');
        const policyVoteSubmit = document.getElementById('policy-vote-submit');

        if (backToGameBtn) {
            backToGameBtn.addEventListener('click', () => {
                this.navigateToPage('game');
            });
        }

        if (nominatePolicyBtn) {
            nominatePolicyBtn.addEventListener('click', () => {
                this.nominatePolicy();
            });
        }

        if (votePolicyBtn) {
            votePolicyBtn.addEventListener('click', () => {
                this.votePolicy();
            });
        }

        if (policyVotes) {
            this.updatePolicyVotes(policyVotes, policyVoteCount, policyVoteList);
        }

        if (policyVoteInput && policyVoteSubmit) {
            policyVoteInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    policyVoteSubmit.click();
                }
            });
            policyVoteSubmit.addEventListener('click', () => {
                this.submitPolicyVote(policyVoteInput.value.trim());
            });
        }

        // Initialize legislation display
        this.initializeLegislationDisplay();
    }

    initializeLegislationDisplay() {
        if (!this.gameState) return;
        
        this.updatePolicyVotes(document.getElementById('policy-votes'), document.getElementById('policy-vote-count'), document.getElementById('policy-vote-list'));
    }

    updatePolicyVotes(votesElement, voteCountElement, voteListElement) {
        if (!votesElement || !voteCountElement || !voteListElement) return;

        const policyVotes = this.gameState.policyVotes || [];
        const policyVoteCount = policyVotes.length;

        voteCountElement.textContent = policyVoteCount;
        voteListElement.innerHTML = '';

        policyVotes.forEach(vote => {
            const voteItem = document.createElement('li');
            voteItem.textContent = vote;
            voteListElement.appendChild(voteItem);
        });
    }

    nominatePolicy() {
        if (!this.gameState) return;
        
        const policyInput = document.getElementById('policy-input');
        const policyName = policyInput ? policyInput.value.trim() : null;

        if (!policyName) {
            this.showError('Please enter a policy name.');
            return;
        }

        if (this.gameState.policies.liberal >= 5 || this.gameState.policies.fascist >= 6) {
            this.showError('Game already won. Cannot nominate more policies.');
            return;
        }

        if (this.gameState.policyVotes.includes(policyName)) {
            this.showError('That policy has already been nominated.');
            return;
        }

        this.gameState.policyVotes.push(policyName);
        this.saveGameState();

        this.updatePolicyVotes(document.getElementById('policy-votes'), document.getElementById('policy-vote-count'), document.getElementById('policy-vote-list'));
    }

    votePolicy() {
        if (!this.gameState) return;
        
        const policyVoteInput = document.getElementById('policy-vote-input');
        const policyVote = policyVoteInput ? policyVoteInput.value.trim() : null;

        if (!policyVote) {
            this.showError('Please enter a policy vote.');
            return;
        }

        if (this.gameState.policyVotes.includes(policyVote)) {
            this.showError('You have already voted for this policy.');
            return;
        }

        this.gameState.policyVotes.push(policyVote);
        this.saveGameState();

        this.updatePolicyVotes(document.getElementById('policy-votes'), document.getElementById('policy-vote-count'), document.getElementById('policy-vote-list'));

        if (this.gameState.policyVotes.length >= this.gameState.players.length) {
            this.navigateToPage('executive-powers');
        }
    }

    submitPolicyVote(vote) {
        if (!this.gameState) return;
        
        const policyVoteInput = document.getElementById('policy-vote-input');
        if (policyVoteInput) policyVoteInput.value = '';

        this.votePolicy();
    }

    bindExecutivePowersEvents() {
        // Executive Powers page functionality
        const backToGameBtn = document.getElementById('back-to-game-btn');
        const nominatePowerBtn = document.getElementById('nominate-power-btn');
        const votePowerBtn = document.getElementById('vote-power-btn');
        const powerVotes = document.getElementById('power-votes');
        const powerVoteCount = document.getElementById('power-vote-count');
        const powerVoteList = document.getElementById('power-vote-list');
        const powerVoteInput = document.getElementById('power-vote-input');
        const powerVoteSubmit = document.getElementById('power-vote-submit');

        if (backToGameBtn) {
            backToGameBtn.addEventListener('click', () => {
                this.navigateToPage('game');
            });
        }

        if (nominatePowerBtn) {
            nominatePowerBtn.addEventListener('click', () => {
                this.nominatePower();
            });
        }

        if (votePowerBtn) {
            votePowerBtn.addEventListener('click', () => {
                this.votePower();
            });
        }

        if (powerVotes) {
            this.updatePowerVotes(powerVotes, powerVoteCount, powerVoteList);
        }

        if (powerVoteInput && powerVoteSubmit) {
            powerVoteInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    powerVoteSubmit.click();
                }
            });
            powerVoteSubmit.addEventListener('click', () => {
                this.submitPowerVote(powerVoteInput.value.trim());
            });
        }

        // Initialize executive powers display
        this.initializeExecutivePowersDisplay();
    }

    initializeExecutivePowersDisplay() {
        if (!this.gameState) return;
        
        this.updatePowerVotes(document.getElementById('power-votes'), document.getElementById('power-vote-count'), document.getElementById('power-vote-list'));
    }

    updatePowerVotes(votesElement, voteCountElement, voteListElement) {
        if (!votesElement || !voteCountElement || !voteListElement) return;

        const powerVotes = this.gameState.powerVotes || [];
        const powerVoteCount = powerVotes.length;

        voteCountElement.textContent = powerVoteCount;
        voteListElement.innerHTML = '';

        powerVotes.forEach(vote => {
            const voteItem = document.createElement('li');
            voteItem.textContent = vote;
            voteListElement.appendChild(voteItem);
        });
    }

    nominatePower() {
        if (!this.gameState) return;
        
        const powerInput = document.getElementById('power-input');
        const powerName = powerInput ? powerInput.value.trim() : null;

        if (!powerName) {
            this.showError('Please enter a power name.');
            return;
        }

        if (this.gameState.powerVotes.includes(powerName)) {
            this.showError('That power has already been nominated.');
            return;
        }

        this.gameState.powerVotes.push(powerName);
        this.saveGameState();

        this.updatePowerVotes(document.getElementById('power-votes'), document.getElementById('power-vote-count'), document.getElementById('power-vote-list'));
    }

    votePower() {
        if (!this.gameState) return;
        
        const powerVoteInput = document.getElementById('power-vote-input');
        const powerVote = powerVoteInput ? powerVoteInput.value.trim() : null;

        if (!powerVote) {
            this.showError('Please enter a power vote.');
            return;
        }

        if (this.gameState.powerVotes.includes(powerVote)) {
            this.showError('You have already voted for this power.');
            return;
        }

        this.gameState.powerVotes.push(powerVote);
        this.saveGameState();

        this.updatePowerVotes(document.getElementById('power-votes'), document.getElementById('power-vote-count'), document.getElementById('power-vote-list'));

        if (this.gameState.powerVotes.length >= this.gameState.players.length) {
            this.navigateToPage('game'); // Assuming game page is the next step after executive powers
        }
    }

    submitPowerVote(vote) {
        if (!this.gameState) return;
        
        const powerVoteInput = document.getElementById('power-vote-input');
        if (powerVoteInput) powerVoteInput.value = '';

        this.votePower();
    }
}

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecretHitlerApp;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.secretHitlerApp = new SecretHitlerApp();
    window.secretHitlerApp.init();
});
