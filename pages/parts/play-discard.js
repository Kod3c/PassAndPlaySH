// Discard Pile Module for Secret Hitler Play Page
export const DiscardPileModule = {
    // Card configuration data - memorized visual order
    DISCARD_CARD_CONFIG: [
        { translateY: -5, rotate: -15, zIndex: 2, className: 'policy-on-discard' },
        { translateY: -8, rotate: 12, zIndex: 3, className: 'policy-on-discard-top' },
        { translateY: -11, rotate: -8, zIndex: 4, className: 'policy-on-discard-2' },
        { translateY: -14, rotate: 18, zIndex: 5, className: 'policy-on-discard-3' },
        { translateY: -17, rotate: -22, zIndex: 6, className: 'policy-on-discard-4' },
        { translateY: -20, rotate: 6, zIndex: 7, className: 'policy-on-discard-5' },
        { translateY: -23, rotate: -14, zIndex: 8, className: 'policy-on-discard-6' },
        { translateY: -26, rotate: 20, zIndex: 9, className: 'policy-on-discard-7' },
        { translateY: -29, rotate: -10, zIndex: 10, className: 'policy-on-discard-8' },
        { translateY: -32, rotate: 16, zIndex: 11, className: 'policy-on-discard-9' },
        { translateY: -35, rotate: -25, zIndex: 12, className: 'policy-on-discard-10' }
    ],

    // Responsive scaling factors
    RESPONSIVE_SCALES: {
        base: 1.0,
        small: 1.0,
        large: 1.0
    },

    // Current discard count
    currentDiscardCount: 0,

    // Function to update the discard pile visualization
    updateDiscardPileVisual(count) {
        const discardStack = document.querySelector('.card-stack.discard');
        if (!discardStack) return;

        // Remove existing policy cards (keep the base discard card)
        const existingPolicyCards = discardStack.querySelectorAll('.stack-card:not(.is-discard)');
        existingPolicyCards.forEach(card => card.remove());

        // Add new policy cards based on count
        for (let i = 0; i < count && i < this.DISCARD_CARD_CONFIG.length; i++) {
            const config = this.DISCARD_CARD_CONFIG[i];
            const card = document.createElement('div');
            card.className = `stack-card ${config.className}`;
            card.style.backgroundImage = 'url(../images/policy-back.png)';
            card.style.transform = `translateY(${config.translateY}px) rotate(${config.rotate}deg) scale(${this.RESPONSIVE_SCALES.base})`;
            card.style.transformOrigin = '50% 50%';
            card.style.zIndex = config.zIndex;
            
            discardStack.appendChild(card);
        }

        // Update responsive styles
        this.updateResponsiveDiscardStyles(count);
        
        // Update count display
        this.updateCountDisplay(count);
    },

    // Function to update responsive styles for different screen sizes
    updateResponsiveDiscardStyles(count) {
        // Remove existing responsive styles
        const existingStyles = document.getElementById('dynamic-discard-styles');
        if (existingStyles) existingStyles.remove();

        // Create new style element
        const style = document.createElement('style');
        style.id = 'dynamic-discard-styles';
        
        let css = '';
        
        // Small screens (≤640px)
        css += '@media (max-width: 640px) {';
        for (let i = 0; i < count && i < this.DISCARD_CARD_CONFIG.length; i++) {
            const config = this.DISCARD_CARD_CONFIG[i];
            css += `.card-stack.discard .stack-card.${config.className} { transform: translateY(${config.translateY}px) rotate(${config.rotate}deg) scale(${this.RESPONSIVE_SCALES.small}) !important; }`;
        }
        css += '}';
        
        // Very small screens (≤360px)
        css += '@media (max-width: 360px) {';
        for (let i = 0; i < count && i < this.DISCARD_CARD_CONFIG.length; i++) {
            const config = this.DISCARD_CARD_CONFIG[i];
            css += `.card-stack.discard .stack-card.${config.className} { transform: translateY(${config.translateY}px) rotate(${config.rotate}deg) scale(${this.RESPONSIVE_SCALES.small}) !important; }`;
        }
        css += '}';
        
        // Large screens (≥768px)
        css += '@media (min-width: 768px) {';
        for (let i = 0; i < count && i < this.DISCARD_CARD_CONFIG.length; i++) {
            const config = this.DISCARD_CARD_CONFIG[i];
            // Scale up the translateY for larger screens
            const scaledTranslateY = Math.round(config.translateY * 1.6);
            css += `.card-stack.discard .stack-card.${config.className} { transform: translateY(${scaledTranslateY}px) rotate(${config.rotate}deg) scale(${this.RESPONSIVE_SCALES.large}) !important; }`;
        }
        css += '}';
        
        style.textContent = css;
        document.head.appendChild(style);
    },

    // Function to increment discard count (called when cards are discarded)
    incrementDiscardCount() {
        this.currentDiscardCount++;
        this.updateDiscardPileVisual(this.currentDiscardCount);
        console.log(`Discard count increased to: ${this.currentDiscardCount}`);
    },

    // Function to decrement discard count (called when deck is reshuffled)
    decrementDiscardCount() {
        if (this.currentDiscardCount > 0) {
            this.currentDiscardCount--;
            this.updateDiscardPileVisual(this.currentDiscardCount);
            console.log(`Discard count decreased to: ${this.currentDiscardCount}`);
        }
    },

    // Function to reset discard count (called when deck is reshuffled)
    resetDiscardCount() {
        this.currentDiscardCount = 0;
        this.updateDiscardPileVisual(this.currentDiscardCount);
        console.log(`Discard count reset to 0 (deck reshuffled)`);
    },

    // Function to set discard count (called when game state is loaded)
    setDiscardCount(count) {
        this.currentDiscardCount = Math.max(0, count);
        this.updateDiscardPileVisual(this.currentDiscardCount);
        console.log(`Discard count set to: ${this.currentDiscardCount}`);
    },

    // Function to calculate discard count from game state
    calculateDiscardCountFromGameState(game) {
        if (!game) return 0;
        
        let count = 0;
        
        // Count president discarded cards
        if (game.presidentDiscardedCard) count++;
        if (game.presidentDiscardedCards && Array.isArray(game.presidentDiscardedCards)) {
            count += game.presidentDiscardedCards.length;
        }
        
        // Count chancellor discarded cards
        if (game.chancellorDiscardedCard) count++;
        if (game.chancellorDiscardedCards && Array.isArray(game.chancellorDiscardedCards)) {
            count += game.chancellorDiscardedCards.length;
        }
        
        // Count any other discarded cards from game history
        if (game.discardedCards && Array.isArray(game.discardedCards)) {
            count += game.discardedCards.length;
        }
        
        console.log(`Calculated discard count from game state: ${count}`);
        return count;
    },

    // Function to update the count display
    updateCountDisplay(count) {
        const countDisplay = document.getElementById('discard-count-display');
        if (countDisplay) {
            countDisplay.textContent = count;
        }
    },

    // Initialize the module
    init() {
        this.setDiscardCount(0);
    }
};

// Export individual functions for backward compatibility
export const incrementDiscardCount = () => DiscardPileModule.incrementDiscardCount();
export const decrementDiscardCount = () => DiscardPileModule.decrementDiscardCount();
export const resetDiscardCount = () => DiscardPileModule.resetDiscardCount();
export const setDiscardCount = (count) => DiscardPileModule.setDiscardCount(count);
export const calculateDiscardCountFromGameState = (game) => DiscardPileModule.calculateDiscardCountFromGameState(game);