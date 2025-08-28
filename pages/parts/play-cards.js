// Card Management - Policy card rendering, table spread management, discard pile management, card overlay systems

// Render policy cards into the first N slots of a track
function renderPoliciesToSlots(containerEl, filledCount, type) {
    if (!containerEl) return;
    const total = containerEl.children.length;
    for (let i = 0; i < total; i++) {
        const slot = containerEl.children[i];
        if (!slot) continue;
        // Ensure only one policy card element inside slot when filled
        const existing = slot.querySelector('.policy-card');
        if (i < filledCount) {
            if (!existing) {
                const card = document.createElement('div');
                card.className = 'policy-card ' + (type === 'liberal' ? 'liberal' : 'fascist');
                // Use image backgrounds for authenticity
                card.style.backgroundImage = type === 'liberal' ? "url('../../images/liberal.png')" : "url('../../images/facist.png')";
                // Let CSS handle the transform for responsive sizing
                card.style.zIndex = '3';
                slot.appendChild(card);
                slot.classList.add('filled');
                
                // Remove bullet overlay when slot is filled
                const bulletOverlay = slot.querySelector('.bullet-overlay');
                if (bulletOverlay) bulletOverlay.remove();
            } else {
                existing.style.backgroundImage = type === 'liberal' ? "url('../../images/liberal.png')" : "url('../../images/facist.png')";
                // Let CSS handle the transform for responsive sizing
                existing.style.zIndex = '3';
                slot.classList.add('filled');
                
                // Remove bullet overlay when slot is filled
                const bulletOverlay = slot.querySelector('.bullet-overlay');
                if (bulletOverlay) bulletOverlay.remove();
            }
        } else {
            if (existing) existing.remove();
            // Remove bullet overlay when slot is not filled, EXCEPT for the 4th and 5th fascist slots
            if (!(type === 'fascist' && (i === 3 || i === 4))) {
                const bulletOverlay = slot.querySelector('.bullet-overlay');
                if (bulletOverlay) bulletOverlay.remove();
            }
            slot.classList.remove('filled');
        }
    }
    
    /* ========================================
       CSS OVERRIDE BACKUP - JAVASCRIPT FALLBACK
       ========================================
       
       This function ensures policy cards display correctly even if there are
       conflicting inline styles or CSS loading issues.
       
       What it does:
       1. Removes any inline 'scale' transforms that might override CSS
       2. Ensures proper positioning (absolute, centered)
       3. Runs after a 10ms delay to catch any late-applied styles
       
       This is a safety net to prevent policy cards from being enlarged
       or positioned incorrectly on narrow devices.
    */
    setTimeout(() => {
        const cards = containerEl.querySelectorAll('.policy-card');
        cards.forEach(card => {
            // Remove any inline transform styles that might override CSS
            if (card.style.transform && card.style.transform.includes('scale')) {
                card.style.removeProperty('transform');
            }
            // Ensure proper positioning
            card.style.position = 'absolute';
            card.style.top = '50%';
            card.style.left = '50%';
        });
    }, 10);
}

// Add skull backgrounds to all fascist slots and bullet overlays to slots 4 and 5
function addBulletOverlaysToFascistSlots(containerEl) {
    if (!containerEl || containerEl.children.length < 6) return;
    
    // Add skull backgrounds to slots 1, 2, and 3 (indices 0, 1, 2) using same method as slots 4 and 5
    for (let i = 0; i < 3; i++) {
        const slot = containerEl.children[i];
        if (!slot) continue;
        
        if (!slot.classList.contains('filled')) {
            // Add skull background or update existing one
            let skullBackground = slot.querySelector('.skull-background');
            if (!skullBackground) {
                skullBackground = document.createElement('div');
                skullBackground.className = 'skull-background';
                slot.appendChild(skullBackground);
                console.log(`Skull background added to fascist slot ${i + 1}`);
            }
            // Always update the opacity (whether new or existing)
            skullBackground.style.cssText = `
                position: absolute;
                inset: 0;
                background-image: url('../../images/skull.png');
                background-repeat: no-repeat;
                background-position: center;
                background-size: 46% auto;
                opacity: 0.15;
                filter: brightness(0) invert(1);
                pointer-events: none;
                z-index: 1;
            `;
        }
    }
    
    // Add trio-cards to slot 3 (index 2) on top of skull background
    const thirdSlot = containerEl.children[2]; // Index 2 = 3rd slot
    if (thirdSlot && !thirdSlot.classList.contains('filled')) {
        const existingTrioCards = thirdSlot.querySelector('.trio-cards-overlay');
        if (!existingTrioCards) {
            const trioCardsOverlay = document.createElement('div');
            trioCardsOverlay.className = 'trio-cards-overlay';
            trioCardsOverlay.style.cssText = `
                position: absolute;
                top: 55%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 36.4px;
                height: auto;
                pointer-events: none;
                z-index: 15;
                opacity: 1.0;
            `;
            trioCardsOverlay.innerHTML = '<img src="../../images/trio-cards.png" alt="Trio Cards" style="width: 100%; height: auto;">';
            thirdSlot.appendChild(trioCardsOverlay);
            console.log('Trio cards overlay added to 3rd fascist slot');
        }
    }
    
    const fourthSlot = containerEl.children[3]; // Index 3 = 4th slot
    const fifthSlot = containerEl.children[4]; // Index 4 = 5th slot
    
    if (!fourthSlot || !fifthSlot) return;
    
    // Add skull background and bullet overlay to 4th slot (index 3)
    if (!fourthSlot.classList.contains('filled')) {
        // Add skull background or update existing one
        let skullBackground = fourthSlot.querySelector('.skull-background');
        if (!skullBackground) {
            skullBackground = document.createElement('div');
            skullBackground.className = 'skull-background';
            fourthSlot.appendChild(skullBackground);
            console.log('Skull background added to 4th fascist slot');
        }
        // Always update the opacity (whether new or existing)
        skullBackground.style.cssText = `
            position: absolute;
            inset: 0;
            background-image: url('../../images/skull.png');
            background-repeat: no-repeat;
            background-position: center;
            background-size: 46% auto;
            opacity: 0.75;
            filter: brightness(0) invert(1);
            pointer-events: none;
            z-index: 1;
        `;
        
        // Add bullet overlay
        const existingBullet = fourthSlot.querySelector('.bullet-overlay');
        if (!existingBullet) {
            const bulletOverlay = document.createElement('div');
            bulletOverlay.className = 'bullet-overlay';
            bulletOverlay.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 28px;
                height: auto;
                pointer-events: none;
                z-index: 15;
                opacity: 1.0;
            `;
            bulletOverlay.innerHTML = '<img src="../../images/bullet.png" alt="Bullet" style="width: 100%; height: auto;">';
            fourthSlot.appendChild(bulletOverlay);
            console.log('Bullet overlay added to 4th fascist slot');
        }
    }
    
    // Add skull background and bullet overlay to 5th slot (index 4)
    if (!fifthSlot.classList.contains('filled')) {
        // Add skull background or update existing one
        let skullBackground = fifthSlot.querySelector('.skull-background');
        if (!skullBackground) {
            skullBackground = document.createElement('div');
            skullBackground.className = 'skull-background';
            fifthSlot.appendChild(skullBackground);
            console.log('Skull background added to 5th fascist slot');
        }
        // Always update the opacity (whether new or existing)
        skullBackground.style.cssText = `
            position: absolute;
            inset: 0;
            background-image: url('../../images/skull.png');
            background-repeat: no-repeat;
            background-position: center;
            background-size: 46% auto;
            opacity: 0.75;
            filter: brightness(0) invert(1);
            pointer-events: none;
            z-index: 1;
        `;
        
        // Add bullet overlay
        const existingBullet = fifthSlot.querySelector('.bullet-overlay');
        if (!existingBullet) {
            const bulletOverlay = document.createElement('div');
            bulletOverlay.className = 'bullet-overlay';
            bulletOverlay.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 28px;
                height: auto;
                pointer-events: none;
                z-index: 15;
                opacity: 1.0;
            `;
            bulletOverlay.innerHTML = '<img src="../../images/bullet.png" alt="Bullet" style="width: 100%; height: auto;">';
            fifthSlot.appendChild(bulletOverlay);
            console.log('Bullet overlay added to 5th fascist slot');
        }
    }
}

// President draw interactions on table-spread (local-only visuals)
let spreadPDListeners = false;
let spreadPDRevealed = 0;
let spreadPDAssigned = null;
let spreadFanShown = false;
let drawnCards = null;

// Get the actual policy cards from the game state instead of random generation
function getActualTopThreePolicies() {
    if (drawnCards) return drawnCards;
    
    // This should be replaced with actual game state when available
    // For now, we'll use a placeholder that will be updated when the game state is properly integrated
    const totalCards = 17; // 6 Liberal + 11 Fascist
    const liberalCount = 6;
    const fascistCount = 11;
    
    // Simulate drawing from the top of the deck
    const remainingLiberal = Math.max(0, liberalCount - (latestGame?.liberalPolicies || 0));
    const remainingFascist = Math.max(0, fascistCount - (latestGame?.fascistPolicies || 0));
    const totalRemaining = remainingLiberal + remainingFascist;
    
    if (totalRemaining < 3) {
        // Not enough cards, reshuffle discard pile
        console.log('Deck running low, should reshuffle discard pile');
        // Reset discard count when deck is reshuffled
        resetDiscardCount();
        return ['liberal', 'liberal', 'fascist']; // Placeholder
    }
    
    // For now, return a reasonable distribution based on remaining cards
    const policies = [];
    const liberalRatio = remainingLiberal / totalRemaining;
    
    for (let i = 0; i < 3; i++) {
        if (Math.random() < liberalRatio && remainingLiberal > 0) {
            policies.push('liberal');
        } else {
            policies.push('facist');
        }
    }
    
    drawnCards = policies;
    return policies;
}

function spreadAssignTopThree() {
    if (Array.isArray(spreadPDAssigned) && spreadPDAssigned.length === 3) return spreadPDAssigned;
    spreadPDAssigned = getActualTopThreePolicies();
    return spreadPDAssigned;
}

function teardownSpreadPresidentDrawUI() {
    const spread = document.querySelector('.table-spread');
    if (!spread) return;
    const cards = Array.from(spread.querySelectorAll('.table-card'));
    const topThree = cards.slice(-3);
    topThree.forEach(c => { c.classList.remove('glow', 'lifting', 'is-front', 'liberal', 'facist'); c.style.transform = ''; c.style.opacity = ''; c.style.pointerEvents = ''; });
    // remove listeners by cloning nodes
    topThree.forEach((card) => { const clone = card.cloneNode(true); card.parentNode.replaceChild(clone, card); });
    spreadPDListeners = false;
    spreadPDRevealed = 0;
    spreadPDAssigned = null;
    spreadFanShown = false;
    // Remove overlay if present
    const overlay = document.getElementById('reveal-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    // Remove single spread tooltip if present
    const tip = document.getElementById('spread-tooltip');
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
    
    // Hide the "View Cards" button when teardown occurs
    const viewCardsBtn = document.getElementById('view-cards-btn');
    if (viewCardsBtn) {
        viewCardsBtn.style.display = 'none';
    }
}

function initSpreadPresidentDrawUI(gameId) {
    // Validate gameId parameter
    if (!gameId) {
        console.error('initSpreadPresidentDrawUI called without gameId:', gameId);
        return;
    }
    
    const spread = document.querySelector('.table-spread');
    if (!spread) return;
    const cards = Array.from(spread.querySelectorAll('.table-card'));
    if (cards.length < 3) return;
    // row-reverse means leftmost are last in DOM order
    const topThree = cards.slice(-3);
    
    // Clear any existing state
    topThree.forEach(c => { 
        c.classList.remove('glow', 'lifting', 'is-front', 'liberal', 'facist'); 
        c.style.transform = ''; 
        c.style.opacity = ''; 
        c.style.pointerEvents = ''; 
    });
    
    // highlight and add one tooltip centered above spread
    topThree.forEach(c => c.classList.add('glow'));
    if (!document.getElementById('spread-tooltip')) {
        const tip = document.createElement('div');
        tip.id = 'spread-tooltip';
        tip.className = 'spread-tooltip';
        tip.textContent = 'Tap or swipe up';
        // Position centered over the middle of the three highlighted cards
        const mid = topThree[1];
        const sr = spread.getBoundingClientRect();
        const mr = mid.getBoundingClientRect();
        const relX = mr.left + mr.width / 2 - sr.left;
        const relY = mr.top - sr.top;
        tip.style.position = 'absolute';
        tip.style.left = relX + 'px';
        tip.style.top = relY + 'px';
        spread.appendChild(tip);
    }
    const vals = spreadAssignTopThree();
    if (spreadPDListeners) return;
    spreadPDListeners = true;
    // Group drag state so all three follow the finger together
    let groupDragging = false;
    let startX = 0, startY = 0;
    let moved = false; let tapStart = 0;
    
    // Define revealAllToCenterFan function with access to gameId
    const revealAllToCenterFan = () => {
        // Debug logging
        console.log('revealAllToCenterFan called with gameId:', gameId);
        
        if (spreadFanShown) return;
        spreadFanShown = true;
        
        // Hide the "View Cards" button when overlay is shown
        const viewCardsBtn = document.getElementById('view-cards-btn');
        if (viewCardsBtn) {
            viewCardsBtn.style.display = 'none';
        }
        
        // Remove the "Tap or Swipe Up" tip when cards are revealed
        const tip = document.getElementById('spread-tooltip');
        if (tip && tip.parentNode) {
            tip.parentNode.removeChild(tip);
        }
        
        // Get current dragged positions of the three cards
        const currentPositions = topThree.map(card => {
            const transform = getComputedStyle(card).transform;
            const matrix = new DOMMatrix(transform);
            return { x: matrix.m41, y: matrix.m42 };
        });
        
        // Build overlay and move three clones from their current positions to center
        const overlayId = 'reveal-overlay';
        let overlay = document.getElementById(overlayId);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = overlayId;
            overlay.className = 'reveal-overlay';
            document.body.appendChild(overlay);
        }
        // Add instruction banner and actions
        const instr = document.createElement('div');
        instr.className = 'reveal-instruction';
        instr.textContent = 'Select Two to give to your Chancellor';
        overlay.appendChild(instr);
        // Add a close (X) button to dismiss the overlay without changing state
        const closeBtn = document.createElement('button');
        closeBtn.setAttribute('type', 'button');
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '12px';
        closeBtn.style.right = '12px';
        closeBtn.style.width = '36px';
        closeBtn.style.height = '36px';
        closeBtn.style.padding = '0';
        closeBtn.style.border = '3px solid var(--propaganda-black)';
        closeBtn.style.background = 'var(--off-white)';
        closeBtn.style.fontWeight = '900';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.lineHeight = '1';
        closeBtn.style.borderRadius = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.zIndex = '1';
        closeBtn.addEventListener('click', function() {
            const ov = document.getElementById('reveal-overlay');
            if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
            
            // Reset the spread state and remove glow from cards
            spreadFanShown = false;
            topThree.forEach(c => { 
                c.classList.remove('lifting', 'is-front', 'liberal', 'facist'); 
                c.style.transform = ''; 
                c.style.opacity = ''; 
                c.style.pointerEvents = ''; 
            });
            
            // Re-add the tip since we're back to the initial state
            if (!document.getElementById('spread-tooltip')) {
                const tip = document.createElement('div');
                tip.id = 'spread-tooltip';
                tip.className = 'spread-tooltip';
                tip.textContent = 'Tap or swipe up';
                // Position centered over the middle of the three highlighted cards
                const mid = topThree[1];
                const sr = spread.getBoundingClientRect();
                const mr = mid.getBoundingClientRect();
                const relX = mr.left + mr.width / 2 - sr.left;
                const relY = mr.top - sr.top;
                tip.style.position = 'absolute';
                tip.style.left = relX + 'px';
                tip.style.top = relY + 'px';
                spread.appendChild(tip);
            }
            
            // Re-add glow to the top three cards
            topThree.forEach(c => c.classList.add('glow'));
            
            // Show the "View Cards" button in the floating navigation
            const viewCardsBtn = document.getElementById('view-cards-btn');
            if (viewCardsBtn) {
                viewCardsBtn.style.display = 'block';
            }
        });
        overlay.appendChild(closeBtn);
        const actions = document.createElement('div');
        actions.className = 'reveal-actions';
        const sendBtn = document.createElement('button');
        sendBtn.className = 'reveal-btn';
        sendBtn.textContent = 'Send to Chancellor';
        sendBtn.disabled = true;
        actions.appendChild(sendBtn);
        overlay.appendChild(actions);
        const centerX = Math.round(window.innerWidth / 2);
        const centerY = Math.round(window.innerHeight / 2);
        const sampleRect = topThree[0].getBoundingClientRect();
        // Responsive scale: smaller overlays on phones
        const _vw2 = window.innerWidth || (document && document.documentElement && document.documentElement.clientWidth) || 0;
        let scale = 1.4;
        if (_vw2 <= 360) {
            scale = 1.0;
        } else if (_vw2 <= 640) {
            scale = 1.15;
        }
        const spacing = Math.max(96, Math.round(sampleRect.width * 1.25 * scale));
        const orderMap = [2, 1, 0]; // map to left, center, right visually
        const overlayCards = [];
        orderMap.forEach((srcIdx, posIdx) => {
            const src = topThree[srcIdx];
            const policy = vals[srcIdx];
            // Style source to appear flipped and hide glow
            src.classList.add('is-front');
            src.classList.add(policy);
            src.classList.remove('glow');
            // Hide originals so only overlay cards are visible
            src.style.opacity = '0';
            src.style.pointerEvents = 'none';
            
            // Create overlay clone starting from current dragged position (face down)
            const clone = document.createElement('div');
            clone.className = 'reveal-card';
            clone.style.backgroundImage = 'url(../../images/policy-back.png)'; // Start face down
            clone.style.transition = 'transform 240ms ease-out, left 240ms ease-out, top 240ms ease-out';
            
            // Start from current dragged position
            const startX = sampleRect.left + currentPositions[srcIdx].x;
            const startY = sampleRect.top + currentPositions[srcIdx].y;
            clone.style.left = startX + 'px';
            clone.style.top = startY + 'px';
            clone.style.transform = 'scale(1) rotate(0deg)';
            clone.style.zIndex = '10'; // Set initial z-index
            overlay.appendChild(clone);
            overlayCards.push(clone);
            
            // Animate to final position
            const targetX = centerX + (posIdx - 1) * spacing;
            const targetY = centerY;
            const finalLeft = Math.round(targetX - (sampleRect.width * scale) / 2);
            const finalTop = Math.round(targetY - (sampleRect.height * scale) / 2);
            const rot = posIdx === 0 ? -8 : (posIdx === 2 ? 8 : 0);
            
            requestAnimationFrame(() => {
                clone.style.left = finalLeft + 'px';
                clone.style.top = finalTop + 'px';
                clone.style.transform = `scale(${scale}) rotate(${rot}deg)`;
                
                // After position animation completes, flip the card
                setTimeout(() => {
                    clone.style.transition = 'transform 300ms ease-out';
                    clone.style.transform = `scale(${scale}) rotate(${rot}deg) rotateY(180deg)`;
                    
                    // Halfway through flip, change to front image
                    setTimeout(() => {
                        clone.style.backgroundImage = policy === 'liberal' ? 'url(../../images/liberal.png)' : 'url(../../images/facist.png)';
                        clone.classList.add(policy);
                    }, 150);
                    
                    // Complete the flip
                    setTimeout(() => {
                        clone.style.transform = `scale(${scale}) rotate(${rot}deg)`;
                    }, 300);
                }, 300); // Wait for position animation to complete
            });
        });
        spreadPDRevealed = 3;

        // Selection logic: click to toggle; enable send when exactly 2 selected
        function updateSendState() {
            const selected = overlayCards.filter(c => c.classList.contains('selected'));
            sendBtn.disabled = (selected.length !== 2);
            
            // Update z-index for selected cards to make them pop to the top
            overlayCards.forEach(card => {
                if (card.classList.contains('selected')) {
                    card.style.zIndex = '20'; // Higher z-index for selected cards
                } else {
                    card.style.zIndex = '10'; // Lower z-index for unselected cards
                }
            });
        }
        overlayCards.forEach((c) => {
            c.style.cursor = 'pointer';
            c.addEventListener('click', function() {
                if (c.classList.contains('selected')) {
                    c.classList.remove('selected');
                } else {
                    // Limit to 2 selected
                    const selected = overlayCards.filter(cc => cc.classList.contains('selected'));
                    if (selected.length >= 2) return;
                    c.classList.add('selected');
                }
                updateSendState();
            });
        });
        updateSendState();
        
        // Handle sending cards to chancellor
        sendBtn.addEventListener('click', async function() {
            console.log('Send button clicked with gameId:', gameId);
            
            // Validate gameId is available
            if (!gameId) {
                console.error('gameId is undefined in send button click handler');
                alert('Game session error. Please refresh the page and try again.');
                return;
            }
            
            const selected = overlayCards.filter(c => c.classList.contains('selected'));
            console.log('Selected cards:', selected);
            
            if (selected.length !== 2) {
                console.log('Not enough cards selected:', selected.length);
                return;
            }
            
            // Get the selected card policies
            const selectedPolicies = selected.map(card => {
                if (card.classList.contains('liberal')) return 'liberal';
                if (card.classList.contains('facist')) return 'fascist';
                return 'liberal'; // fallback
            });
            
            console.log('Selected policies:', selectedPolicies);
            
            // Get the discarded policy (the one not selected)
            const discardedPolicy = overlayCards.find(card => !card.classList.contains('selected'));
            const discardedPolicyType = discardedPolicy ? 
                (discardedPolicy.classList.contains('liberal') ? 'liberal' : 'fascist') : 'liberal';
            
            console.log('Discarded policy:', discardedPolicyType);
            
            try {
                console.log('Calling updateGameStateAfterPresidentDraw...');
                // Update game state to remove the top 3 cards and move to chancellor phase
                await updateGameStateAfterPresidentDraw(selectedPolicies, discardedPolicyType);
                
                console.log('Game state updated successfully');
                
                // Close the overlay and clean up
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                
                // Clean up the spread state and remove glow from cards
                spreadFanShown = false;
                topThree.forEach(c => { 
                    c.classList.remove('lifting', 'is-front', 'liberal', 'facist'); 
                    c.style.transform = ''; 
                    c.style.opacity = ''; 
                    c.style.pointerEvents = ''; 
                });
                
                // Remove the tip since we're moving to the next phase
                const tip = document.getElementById('spread-tooltip');
                if (tip && tip.parentNode) {
                    tip.parentNode.removeChild(tip);
                }
                
                // Hide the "View Cards" button since we're moving to next phase
                const viewCardsBtn = document.getElementById('view-cards-btn');
                if (viewCardsBtn) {
                    viewCardsBtn.style.display = 'none';
                }
                
                // Update the visual deck to show fewer cards and add discarded card to pile
                updateDeckVisualAfterDraw();
                
                // Move to chancellor phase
                setStatus(gameId, 'President has drawn cards. Waiting for Chancellor to choose...');
                
            } catch (error) {
                console.error('Failed to update game state:', error);
                console.error('Full error object:', error);
                
                // Provide more helpful error messages
                let errorMessage = 'Failed to send cards to Chancellor. ';
                if (error.message.includes('Game ID not found')) {
                    errorMessage += 'Game session error. Please refresh the page and try again.';
                } else if (error.message.includes('Game data not loaded')) {
                    errorMessage += 'Game data is still loading. Please wait a moment and try again.';
                } else {
                    errorMessage += 'Please try again. Error: ' + error.message;
                }
                
                alert(errorMessage);
            }
        });
    };
    
    topThree.forEach((card, idx) => {
        const policy = vals[idx];
        function onDown(e) {
            if (spreadFanShown) return;
            if (card.classList.contains('is-front')) return;
            groupDragging = true; moved = false; tapStart = Date.now();
            const pt = e.touches ? e.touches[0] : e;
            startX = pt.clientX; startY = pt.clientY;
            topThree.forEach(c => c.classList.add('lifting'));
        }
        function onMove(e) {
            if (!groupDragging) return;
            const pt = e.touches ? e.touches[0] : e;
            const dx = pt.clientX - startX; const dy = pt.clientY - startY;
            if (Math.abs(dx) + Math.abs(dy) > 10) moved = true;
            const ty = Math.min(0, dy); // Only restrict upward movement
            const tx = dx; // Allow full horizontal movement
            topThree.forEach(c => { c.style.transform = `translate(${tx}px, ${ty}px)`; });
        }
        function onUp(e) {
            if (!groupDragging) return;
            groupDragging = false; topThree.forEach(c => c.classList.remove('lifting'));
            const pt = e.changedTouches ? e.changedTouches[0] : e;
            const deltaY = pt.clientY - startY;
            const tapDuration = Date.now() - tapStart;
            if (deltaY < -60 || (!moved && tapDuration < 300)) {
                revealAllToCenterFan();
            } else {
                topThree.forEach(c => { c.style.transform = ''; });
            }
        }
        card.addEventListener('mousedown', onDown);
        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseup', onUp);
        card.addEventListener('mouseleave', onUp);
        card.addEventListener('touchstart', onDown, { passive: true });
        card.addEventListener('touchmove', onMove, { passive: true });
        card.addEventListener('touchend', onUp);
        card.addEventListener('touchcancel', onUp);
        // Also handle simple click to reveal
        card.addEventListener('click', function() { revealAllToCenterFan(); });
    });
    
    // Ensure glow is visible by forcing a reflow
    setTimeout(() => {
        topThree.forEach(c => {
            if (!c.classList.contains('glow')) {
                c.classList.add('glow');
            }
        });
        
        // Debug: log the glow state
        console.log('Glow state after initialization:', topThree.map(c => ({
            element: c,
            hasGlow: c.classList.contains('glow'),
            classes: Array.from(c.classList)
        })));
    }, 100);
    
    // Add event listener for the "View Cards" button
    const viewCardsBtn = document.getElementById('view-cards-btn');
    if (viewCardsBtn) {
        viewCardsBtn.addEventListener('click', function() {
            // Hide the button
            viewCardsBtn.style.display = 'none';
            
            // Show the overlay again
            revealAllToCenterFan();
        });
    }
    
    // Add event listener for the "Repair Game" button
    const repairGameMainBtn = document.getElementById('repair-game-main-btn');
    if (repairGameMainBtn) {
        repairGameMainBtn.addEventListener('click', async function() {
            try {
                repairGameMainBtn.disabled = true;
                repairGameMainBtn.textContent = '🔧 Repairing...';
                
                const gameId = getGameId();
                const repaired = await repairGameState(gameId);
                
                if (repaired) {
                    repairGameMainBtn.textContent = '✅ Repaired!';
                    setTimeout(() => {
                        repairGameMainBtn.textContent = '🔧 Repair';
                        repairGameMainBtn.disabled = false;
                    }, 2000);
                } else {
                    repairGameMainBtn.textContent = '✅ No Issues';
                    setTimeout(() => {
                        repairGameMainBtn.textContent = '🔧 Repair';
                        repairGameMainBtn.disabled = false;
                    }, 2000);
                }
            } catch (err) {
                console.error('Game repair failed:', err);
                repairGameMainBtn.textContent = '❌ Failed';
                repairGameMainBtn.disabled = false;
                setTimeout(() => {
                    repairGameMainBtn.textContent = '🔧 Repair';
                }, 3000);
            }
        });
    }
}

// Export functions for use in other modules
window.renderPoliciesToSlots = renderPoliciesToSlots;
window.addBulletOverlaysToFascistSlots = addBulletOverlaysToFascistSlots;
window.initSpreadPresidentDrawUI = initSpreadPresidentDrawUI;
window.teardownSpreadPresidentDrawUI = teardownSpreadPresidentDrawUI;
