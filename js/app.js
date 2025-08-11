// Main application controller
class App {
    constructor() {
        this.currentPage = 'home';
        this.basePath = this.getBasePath();
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
                event.preventDefault();
                const pageName = event.target.dataset.navigate;
                this.navigateToPage(pageName);
            }
        });

        // Setup other event listeners
        this.setupGameSetupListeners();
    }

    setupThemeSwitcher() {
        // Get saved theme or default to 'default'
        const savedTheme = localStorage.getItem('selectedTheme') || 'default';
        this.setTheme(savedTheme);
        
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
        // Player count selection
        const playerCountBtns = document.querySelectorAll('.player-count-btn');
        if (playerCountBtns.length > 0) {
            playerCountBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const count = parseInt(btn.dataset.count);
                    this.selectPlayerCount(count);
                });
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

    selectPlayerCount(count) {
        const playerInputs = document.getElementById('player-inputs');
        const roleInfo = document.getElementById('role-info');
        const startGameBtn = document.getElementById('start-game-btn');
        
        if (!playerInputs || !roleInfo || !startGameBtn) return;

        // Update role distribution display
        const distribution = this.getRoleDistribution(count);
        const liberalPercent = Math.round((distribution.liberals / count) * 100);
        const fascistPercent = Math.round((distribution.fascists / count) * 100);
        const hitlerPercent = Math.round((distribution.hitler / count) * 100);
        
        roleInfo.innerHTML = `
            <div class="role-distribution-grid">
                <div class="role liberal">
                    <div class="role-label">Liberal</div>
                    <div class="role-count">${distribution.liberals}</div>
                    <div class="role-percentage">${liberalPercent}%</div>
                </div>
                <div class="role fascist">
                    <div class="role-label">Fascist</div>
                    <div class="role-count">${distribution.fascists}</div>
                    <div class="role-percentage">${fascistPercent}%</div>
                </div>
                <div class="role hitler">
                    <div class="role-label">Hitler</div>
                    <div class="role-count">${distribution.hitler}</div>
                    <div class="role-percentage">${hitlerPercent}%</div>
                </div>
            </div>
        `;

        // Generate mobile-friendly player selection with +/- buttons
        playerInputs.innerHTML = `
            <div class="player-selection-container">
                <div class="player-count-display">
                    <span class="current-count">5</span> / <span class="max-count">${count}</span> players
                </div>
                <div class="player-controls">
                    <button class="player-btn player-minus" id="player-minus" disabled>-</button>
                    <button class="player-btn player-plus" id="player-plus">+</button>
                </div>
                <div class="player-list" id="player-list">
                    <!-- Player items will be generated here -->
                </div>
                <div class="add-player-section">
                    <input type="text" id="new-player-input" class="new-player-input" placeholder="Enter player name">
                    <button class="btn btn-primary" id="add-player-btn">Add Player</button>
                </div>
            </div>
        `;

        // Initialize player list with 5 players
        this.initializePlayerList(5);
        
        // Setup player control event listeners
        this.setupPlayerControls(count);

        // Enable start game button
        startGameBtn.disabled = false;
    }

    initializePlayerList(initialCount) {
        const playerList = document.getElementById('player-list');
        if (!playerList) return;

        playerList.innerHTML = '';
        for (let i = 1; i <= initialCount; i++) {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.innerHTML = `
                <span class="player-name">Player ${i}</span>
                <button class="remove-player-btn" data-index="${i-1}">×</button>
            `;
            playerList.appendChild(playerItem);
        }

        // Update current count display
        const currentCountSpan = document.querySelector('.current-count');
        if (currentCountSpan) {
            currentCountSpan.textContent = initialCount;
        }

        // Update minus button state
        const minusBtn = document.getElementById('player-minus');
        if (minusBtn) {
            minusBtn.disabled = initialCount <= 5;
        }
    }

    setupPlayerControls(maxCount) {
        const plusBtn = document.getElementById('player-plus');
        const minusBtn = document.getElementById('player-minus');
        const addPlayerBtn = document.getElementById('add-player-btn');
        const newPlayerInput = document.getElementById('new-player-input');

        if (!plusBtn || !minusBtn || !addPlayerBtn || !newPlayerInput) return;

        // Plus button - add player
        plusBtn.addEventListener('click', () => {
            const currentCount = this.getCurrentPlayerCount();
            if (currentCount < maxCount) {
                this.addPlayer();
            }
        });

        // Minus button - remove player
        minusBtn.addEventListener('click', () => {
            const currentCount = this.getCurrentPlayerCount();
            if (currentCount > 5) {
                this.removePlayer();
            }
        });

        // Add player button
        addPlayerBtn.addEventListener('click', () => {
            this.addPlayerByName();
        });

        // Enter key in input field
        newPlayerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addPlayerByName();
            }
        });

        // Setup event delegation for removing individual players
        this.setupPlayerRemovalListeners();
    }

    setupPlayerRemovalListeners() {
        // Use event delegation for dynamically added player items
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-player-btn')) {
                const playerItem = event.target.closest('.player-item');
                if (playerItem) {
                    this.removeSpecificPlayer(playerItem);
                }
            }
        });
    }

    removeSpecificPlayer(playerItem) {
        const currentCount = this.getCurrentPlayerCount();
        
        if (currentCount <= 5) {
            alert('Minimum 5 players required');
            return;
        }

        // Remove the specific player item
        playerItem.remove();

        // Update count display
        const currentCountSpan = document.querySelector('.current-count');
        if (currentCountSpan) {
            currentCountSpan.textContent = currentCount - 1;
        }

        // Update button states
        this.updatePlayerButtonStates();
    }

    getCurrentPlayerCount() {
        const playerItems = document.querySelectorAll('.player-item');
        return playerItems.length;
    }

    addPlayer() {
        const playerList = document.getElementById('player-list');
        const currentCount = this.getCurrentPlayerCount();
        const maxCount = parseInt(document.querySelector('.max-count').textContent);

        if (currentCount >= maxCount) return;

        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <span class="player-name">Player ${currentCount + 1}</span>
            <button class="remove-player-btn" data-index="${currentCount}">×</button>
        `;
        playerList.appendChild(playerItem);

        // Update count display
        const currentCountSpan = document.querySelector('.current-count');
        if (currentCountSpan) {
            currentCountSpan.textContent = currentCount + 1;
        }

        // Update button states
        this.updatePlayerButtonStates();
    }

    removePlayer() {
        const playerItems = document.querySelectorAll('.player-item');
        const currentCount = playerItems.length;

        if (currentCount <= 5) return;

        // Remove the last player
        playerItems[currentCount - 1].remove();

        // Update count display
        const currentCountSpan = document.querySelector('.current-count');
        if (currentCountSpan) {
            currentCountSpan.textContent = currentCount - 1;
        }

        // Update button states
        this.updatePlayerButtonStates();
    }

    addPlayerByName() {
        const input = document.getElementById('new-player-input');
        const name = input.value.trim();

        if (!name) return;

        const playerList = document.getElementById('player-list');
        const currentCount = this.getCurrentPlayerCount();
        const maxCount = parseInt(document.querySelector('.max-count').textContent);

        if (currentCount >= maxCount) {
            alert(`Maximum ${maxCount} players allowed`);
            return;
        }

        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <span class="player-name">${name}</span>
            <button class="remove-player-btn" data-index="${currentCount}">×</button>
        `;
        playerList.appendChild(playerItem);

        // Clear input
        input.value = '';

        // Update count display
        const currentCountSpan = document.querySelector('.current-count');
        if (currentCountSpan) {
            currentCountSpan.textContent = currentCount + 1;
        }

        // Update button states
        this.updatePlayerButtonStates();
    }

    updatePlayerButtonStates() {
        const currentCount = this.getCurrentPlayerCount();
        const maxCount = parseInt(document.querySelector('.max-count').textContent);
        const minusBtn = document.getElementById('player-minus');
        const plusBtn = document.getElementById('player-plus');

        if (minusBtn) {
            minusBtn.disabled = currentCount <= 5;
        }
        if (plusBtn) {
            plusBtn.disabled = currentCount >= maxCount;
        }
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
        // Collect player names from the new player list
        const playerItems = document.querySelectorAll('.player-item .player-name');
        const players = Array.from(playerItems)
            .map(span => span.textContent.trim())
            .filter(name => name.length > 0);

        if (players.length < 5) {
            alert('Please add at least 5 players');
            return;
        }

        // Store player data and navigate to game
        localStorage.setItem('gamePlayers', JSON.stringify(players));
        this.navigateToPage('game');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
