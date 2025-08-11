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

        // Generate player input fields
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
        // Collect player names
        const playerInputs = document.querySelectorAll('.player-name-input');
        const players = Array.from(playerInputs)
            .map(input => input.value.trim())
            .filter(name => name.length > 0);

        if (players.length < 5) {
            alert('Please enter at least 5 player names');
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
