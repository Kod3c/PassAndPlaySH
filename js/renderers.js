// Simple DOM rendering functions for Secret Hitler game
// These functions just create DOM elements and don't reference game state

export function renderSlots(el, count) {
    if (!el) return;
    
    el.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const s = document.createElement('div');
        s.className = 'slot';
        
        // Add module classes for fascist slots
        if (el.id === 'fascist-slots') {
            if (i === 0) s.classList.add('custom-module');        // Slot 1
            if (i === 1) s.classList.add('custom-module');        // Slot 2  
            // Slot 3 trio-cards-eye is now managed by JavaScript based on player count
            // Slots 4 & 5 get bullets (handled separately)
            // Slot 6 gets fascist-win (handled by CSS)
        }
        
        el.appendChild(s);
    }
}

export function renderTracker(el) {
    if (!el) return;

    el.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const b = document.createElement('div');
        b.className = 'square';
        b.textContent = String(i + 1);
        b.dataset.index = String(i);
        b.dataset.defaultNumber = String(i + 1);
        el.appendChild(b);
    }
}

export function renderPlayers(el, players) {
    if (!el) return;

    el.innerHTML = '';
    (players || []).forEach(p => {
        const chip = document.createElement('div');
        chip.className = 'player-chip';
        const icons = [];
        if (p.isPresident) icons.push('👑');
        if (p.isChancellor) icons.push('🔨');
        const prefix = icons.length ? icons.join('') + ' ' : '';
        const deadEmoji = (p.alive === false) ? '💀 ' : '';
        chip.textContent = deadEmoji + prefix + (p.name || 'Player');
        if (p.isPresident) chip.classList.add('is-president');
        if (p.isChancellor) chip.classList.add('is-chancellor');
        if (p.alive === false) chip.classList.add('is-dead');
        el.appendChild(chip);
    });
}
