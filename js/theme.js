/**
 * Theme Management System
 * Handles dark/light mode switching with localStorage persistence
 */

class ThemeManager {
  constructor() {
    this.themeToggle = null;
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.init();
  }

  init() {
    // Apply initial theme
    this.applyTheme(this.currentTheme);
    
    // Find and setup theme toggle button
    this.themeToggle = document.getElementById('theme-toggle');
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }
    
    // Listen for system theme changes
    this.watchSystemTheme();
  }

  getStoredTheme() {
    return localStorage.getItem('secret-hitler-theme');
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme(theme) {
    // Remove existing theme classes
    document.documentElement.removeAttribute('data-theme');
    
    // Apply new theme
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Store preference
    localStorage.setItem('secret-hitler-theme', theme);
    this.currentTheme = theme;
    
    // Update theme toggle button state
    this.updateToggleState();
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
  }

  updateToggleState() {
    if (!this.themeToggle) return;
    
    const lightIcon = this.themeToggle.querySelector('.light-icon');
    const darkIcon = this.themeToggle.querySelector('.dark-icon');
    
    if (this.currentTheme === 'dark') {
      lightIcon.style.opacity = '0';
      darkIcon.style.opacity = '1';
    } else {
      lightIcon.style.opacity = '1';
      darkIcon.style.opacity = '0';
    }
  }

  watchSystemTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      // Only update if user hasn't manually set a preference
      if (!this.getStoredTheme()) {
        const newTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(newTheme);
      }
    });
  }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
