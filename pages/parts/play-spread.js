// Table Spread Module for Secret Hitler Play Page
export const TableSpreadModule = {
    // Table spread card configuration - memorized visual arrangement
    TABLE_SPREAD_CONFIG: [
        { rotate: 18, className: 'table-card-1' },
        { rotate: 14, className: 'table-card-2' },
        { rotate: 10, className: 'table-card-3' },
        { rotate: 6, className: 'table-card-4' },
        { rotate: 3, className: 'table-card-5' },
        { rotate: 1, className: 'table-card-6' },
        { rotate: -1, className: 'table-card-7' },
        { rotate: -3, className: 'table-card-8' },
        { rotate: -6, className: 'table-card-9' },
        { rotate: -10, className: 'table-card-10' },
        { rotate: -14, className: 'table-card-11' },
        { rotate: -18, className: 'table-card-12' }
    ],

    // Current table spread count
    currentTableSpreadCount: 0,

    // Function to update the table spread visualization
    updateTableSpreadVisual(count) {
        const tableSpread = document.querySelector('.table-spread');
        if (!tableSpread) return;

        // Remove existing table cards
        const existingTableCards = tableSpread.querySelectorAll('.table-card');
        existingTableCards.forEach(card => card.remove());

        // Add new table cards based on count
        for (let i = 0; i < count && i < this.TABLE_SPREAD_CONFIG.length; i++) {
            const config = this.TABLE_SPREAD_CONFIG[i];
            const card = document.createElement('div');
            card.className = `table-card ${config.className}`;
            card.style.backgroundImage = 'url(../images/policy-back.png)';
            card.style.transform = `rotate(${config.rotate}deg)`;
            card.style.backgroundSize = 'cover';
            card.style.backgroundPosition = 'center';
            card.style.border = '3px solid var(--propaganda-black)';
            card.style.borderRadius = '6px';
            card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2), inset 0 0 0 3px rgba(241,230,178,0.6)';
            card.style.margin = '0 -18px';
            card.style.transformOrigin = '50% 100%';
            
            tableSpread.appendChild(card);
        }

        // Update responsive styles
        this.updateResponsiveTableSpreadStyles(count);
    },

    // Function to update responsive styles for different screen sizes
    updateResponsiveTableSpreadStyles(count) {
        // Remove existing responsive styles
        const existingStyles = document.getElementById('dynamic-table-spread-styles');
        if (existingStyles) existingStyles.remove();

        // Create new style element
        const style = document.createElement('style');
        style.id = 'dynamic-table-spread-styles';
        
        let css = '';
        
        // Small screens (≤640px)
        css += '@media (max-width: 640px) {';
        for (let i = 0; i < count && i < this.TABLE_SPREAD_CONFIG.length; i++) {
            const config = this.TABLE_SPREAD_CONFIG[i];
            css += `.table-spread .table-card.${config.className} { 
                width: var(--play-card-w, 56px); 
                height: var(--play-card-h, 82px); 
                margin: 0 -18px; 
                transform: rotate(${config.rotate}deg); 
            }`;
        }
        css += '}';
        
        // Very small screens (≤360px)
        css += '@media (max-width: 360px) {';
        for (let i = 0; i < count && i < this.TABLE_SPREAD_CONFIG.length; i++) {
            const config = this.TABLE_SPREAD_CONFIG[i];
            css += `.table-spread .table-card.${config.className} { 
                width: var(--play-card-w, 50px); 
                height: var(--play-card-h, 74px); 
                margin: 0 -20px; 
                transform: rotate(${config.rotate}deg); 
            }`;
        }
        css += '}';
        
        // Large screens (≥768px)
        css += '@media (min-width: 768px) {';
        for (let i = 0; i < count && i < this.TABLE_SPREAD_CONFIG.length; i++) {
            const config = this.TABLE_SPREAD_CONFIG[i];
            css += `.table-spread .table-card.${config.className} { 
                width: var(--play-card-w, 72px); 
                height: var(--play-card-h, 104px); 
                margin: 0 -18px; 
                transform: rotate(${config.rotate}deg); 
            }`;
        }
        css += '}';
        
        style.textContent = css;
        document.head.appendChild(style);
    },

    // Function to increment table spread count
    incrementTableSpreadCount() {
        if (this.currentTableSpreadCount < this.TABLE_SPREAD_CONFIG.length) {
            this.currentTableSpreadCount++;
            this.updateTableSpreadVisual(this.currentTableSpreadCount);
            console.log(`Table spread count increased to: ${this.currentTableSpreadCount}`);
        }
    },

    // Function to decrement table spread count
    decrementTableSpreadCount() {
        if (this.currentTableSpreadCount > 0) {
            this.currentTableSpreadCount--;
            this.updateTableSpreadVisual(this.currentTableSpreadCount);
            console.log(`Table spread count decreased to: ${this.currentTableSpreadCount}`);
        }
    },

    // Function to set table spread count
    setTableSpreadCount(count) {
        this.currentTableSpreadCount = Math.max(0, Math.min(count, this.TABLE_SPREAD_CONFIG.length));
        this.updateTableSpreadVisual(this.currentTableSpreadCount);
        console.log(`Table spread count set to: ${this.currentTableSpreadCount}`);
    },

    // Function to calculate table spread count from game state
    calculateTableSpreadCountFromGameState(game) {
        if (!game) return 0;
        
        console.log(`=== TABLE SPREAD CALCULATION ===`);
        console.log(`Full game object:`, game);
        
        // For now, let's use a simpler approach - just show the policy stack size
        // This should be the actual number of cards available to draw
        const policyStackSize = game.currentPolicyStack?.length || 0;
        console.log(`Using policy stack size directly: ${policyStackSize}`);
        
        // If no policy stack data, default to a reasonable number
        if (policyStackSize === 0) {
            console.log(`No policy stack data, defaulting to 8 cards`);
            return 8;
        }
        
        console.log(`================================`);
        return policyStackSize;
    },

    // Function to update the table spread count display
    updateTableSpreadCountDisplay(count) {
        const countDisplay = document.getElementById('table-spread-count-display');
        if (countDisplay) {
            countDisplay.textContent = count;
        }
    },

    // Initialize the module
    init() {
        this.setTableSpreadCount(6); // Start with 6 cards
    }
};

// Export individual functions for backward compatibility
export const incrementTableSpreadCount = () => TableSpreadModule.incrementTableSpreadCount();
export const decrementTableSpreadCount = () => TableSpreadModule.decrementTableSpreadCount();
export const setTableSpreadCount = (count) => TableSpreadModule.setTableSpreadCount(count);
export const calculateTableSpreadCountFromGameState = (game) => TableSpreadModule.calculateTableSpreadCountFromGameState(game);
export const updateTableSpreadCountDisplay = (count) => TableSpreadModule.updateTableSpreadCountDisplay(count);