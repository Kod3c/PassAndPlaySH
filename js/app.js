// Main application controller - Simplified Frontend Only
class App {
    constructor() {
        this.currentPage = 'home';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupThemeSwitcher();
        this.setupBasicNavigation();
        this.initializePlayerCount();
    }

    setupBasicNavigation() {
        // Handle browser back/forward navigation
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.navigateToPage(event.state.page, false);
            }
        });

        // Handle direct URL access
        window.addEventListener('load', () => {
            this.restorePageFromURL();
        });
    }

    restorePageFromURL() {
        const currentPath = window.location.pathname;
        
        // Extract the page name from the URL
        let pageName = 'home';
        if (currentPath !== '/' && currentPath !== '/index.html') {
            // Remove leading slash to get the page name
            pageName = currentPath.replace(/^\//, '').replace('.html', '');
        }
        
        // Navigate to the page without updating history
        if (pageName !== 'home') {
            this.navigateToPage(pageName, false);
        }
    }

    navigateToPage(pageName, updateHistory = true) {
        console.log('Navigating to page:', pageName); // Debug log
        this.currentPage = pageName;
        
        // Update browser history if requested
        if (updateHistory) {
            const url = pageName === 'home' ? '/' : `/${pageName}`;
            window.history.pushState({ page: pageName }, '', url);
        }
        
        this.showPage(pageName);
    }

    showPage(pageName) {
        console.log('Showing page:', pageName); // Debug log
        
        // Hide all page content
        const pages = document.querySelectorAll('.page-content');
        pages.forEach(page => page.style.display = 'none');
        
        // Show the requested page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.style.display = 'block';
            console.log('Page found and displayed:', pageName); // Debug log
        } else {
            console.log('Page not found:', pageName); // Debug log
            // If page doesn't exist, show home
            this.showPage('home');
        }
        
        this.currentPage = pageName;
        this.updateNavigationState(pageName);
    }

    updateNavigationState(pageName) {
        // Update active navigation state if navigation exists
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems.length > 0) {
            navItems.forEach(item => item.classList.remove('active'));
            const activeItem = document.querySelector(`[data-page="${pageName}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }

    setupEventListeners() {
        // Setup navigation event listeners
        document.addEventListener('click', (event) => {
            let navigateElement = event.target.closest('[data-navigate]');
            
            if (!navigateElement) {
                let currentElement = event.target;
                while (currentElement && currentElement !== document.body) {
                    if (currentElement.hasAttribute('data-navigate')) {
                        navigateElement = currentElement;
                        break;
                    }
                    currentElement = currentElement.parentElement;
                }
            }
            
            if (navigateElement) {
                const page = navigateElement.dataset.navigate;
                this.navigateToPage(page);
            }
        });

        // Setup rules page navigation
        document.addEventListener('click', (event) => {
            const ruleNavElement = event.target.closest('.rule-nav-btn');
            if (ruleNavElement) {
                const section = ruleNavElement.dataset.section;
                this.showRulesSection(section);
            }
        });

        this.setupHeaderNavigation();
        this.setupFormHandling();
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
        
        // Check if theme switcher should be enabled
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

    setupFormHandling() {
        // Basic form handling for player setup
        const playerForm = document.getElementById('player-setup-form');
        if (playerForm) {
            playerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePlayerSetup();
            });
        }

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
    }

    getCurrentPlayerCount() {
        const playerCountElement = document.getElementById('player-count');
        if (playerCountElement) {
            return parseInt(playerCountElement.textContent) || 5;
        }
        return 5;
    }

    updatePlayerCount(count) {
        const playerCountElement = document.getElementById('player-count');
        if (playerCountElement) {
            playerCountElement.textContent = count;
            this.updatePlayerInputs(count);
        }
    }

    updatePlayerInputs(count) {
        const playerInputsContainer = document.getElementById('player-inputs');
        if (!playerInputsContainer) return;

        playerInputsContainer.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'form-group';
            playerDiv.innerHTML = `
                <label for="player-${i + 1}">Player ${i + 1} Name:</label>
                <input type="text" id="player-${i + 1}" name="player-${i + 1}" 
                       placeholder="Enter player name" required>
            `;
            playerInputsContainer.appendChild(playerDiv);
        }
    }

    handlePlayerSetup() {
        const playerCount = this.getCurrentPlayerCount();
        const players = [];
        
        for (let i = 0; i < playerCount; i++) {
            const input = document.getElementById(`player-${i + 1}`);
            if (input && input.value.trim()) {
                players.push(input.value.trim());
            }
        }
        
        if (players.length === playerCount) {
            // Store player names for later use
            localStorage.setItem('gamePlayers', JSON.stringify(players));
            
            // Navigate to the game creation page
            this.navigateToPage('game-creation');
        } else {
            alert('Please fill in all player names');
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

    // Utility function to show/hide elements
    showElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'block';
        }
    }

    hideElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        }
    }

    // Utility function to add/remove classes
    addClass(selector, className) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add(className);
        }
    }

    removeClass(selector, className) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.remove(className);
        }
    }

    initializePlayerCount() {
        // Initialize player count and generate player inputs when setup page is shown
        this.updatePlayerInputs(5); // Start with 5 players by default
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
