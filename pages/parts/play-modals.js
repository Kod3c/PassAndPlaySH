// Game Modals - All modal functionality including role overlay, rules modal, history modal, order modal, and menu modal

// Role overlay functionality
function refreshRoleOverlayPermissions() {
    const gameId = getGameId();
    const youId = computeYouId(gameId);
    const game = latestGame;
    const players = latestPlayers || [];
    
    if (!game || !players.length || !youId) return;
    
    const youPlayer = players.find(p => p && p.id === youId);
    if (!youPlayer || !youPlayer.role) return;
    
    // Update role envelope click handler
    const envelope = document.getElementById('role-envelope');
    if (envelope) {
        envelope.onclick = () => showRoleOverlay(gameId, youPlayer);
    }
}

function showRoleOverlay(gameId, youPlayer) {
    const overlay = document.getElementById('role-overlay');
    const roleText = document.getElementById('role-text');
    const membershipBtn = document.getElementById('membership-btn');
    const roleBtn = document.getElementById('role-btn');
    const compatriotsBtn = document.getElementById('compatriots-btn');
    
    if (!overlay || !roleText || !membershipBtn || !roleBtn || !compatriotsBtn) return;
    
    // Reset all buttons to default state
    membershipBtn.textContent = '🏛️ View Membership';
    roleBtn.textContent = '👁️ View Role';
    compatriotsBtn.style.display = 'none';
    
    // Clear previous role display
    roleText.textContent = 'Hidden';
    roleText.removeAttribute('data-role');
    roleText.removeAttribute('data-party');
    
    // Set up button event handlers
    membershipBtn.onclick = () => showMembershipInfo(gameId, youPlayer);
    roleBtn.onclick = () => showRoleInfo(gameId, youPlayer);
    
    // Show compatriots button for fascists (7+ players)
    if (youPlayer.role === 'fascist' && latestPlayers.length >= 7) {
        compatriotsBtn.style.display = 'block';
        compatriotsBtn.onclick = () => showCompatriotsInfo(gameId, youPlayer);
    }
    
    // Show overlay
    overlay.style.display = 'flex';
}

function showMembershipInfo(gameId, youPlayer) {
    const roleText = document.getElementById('role-text');
    const membershipBtn = document.getElementById('membership-btn');
    
    if (!roleText || !membershipBtn) return;
    
    const game = latestGame;
    if (!game) return;
    
    // Show game info
    let info = 'Game Info:\n';
    info += `Players: ${latestPlayers.length}\n`;
    info += `Liberal Policies: ${game.liberalPolicies || 0}/5\n`;
    info += `Fascist Policies: ${game.fascistPolicies || 0}/6\n`;
    info += `Failed Elections: ${game.electionTracker || 0}/3\n`;
    
    if (game.currentPresidentPlayerId) {
        const pres = latestPlayers.find(p => p.id === game.currentPresidentPlayerId);
        info += `Current President: ${pres ? pres.name : 'Unknown'}\n`;
    }
    
    if (game.currentChancellorPlayerId) {
        const chanc = latestPlayers.find(p => p.id === game.currentChancellorPlayerId);
        info += `Current Chancellor: ${chanc ? chanc.name : 'Unknown'}\n`;
    }
    
    roleText.textContent = info;
    membershipBtn.textContent = '🔄 Refresh Info';
    membershipBtn.onclick = () => showMembershipInfo(gameId, youPlayer);
}

function showRoleInfo(gameId, youPlayer) {
    const roleText = document.getElementById('role-text');
    const roleBtn = document.getElementById('role-btn');
    
    if (!roleText || !roleBtn) return;
    
    // Show role information
    let roleInfo = '';
    
    if (youPlayer.role === 'hitler') {
        roleInfo = '👑 HITLER\n\nYou are Hitler!';
        roleText.setAttribute('data-role', 'hitler');
    } else if (youPlayer.role === 'fascist') {
        roleInfo = '🟥 FASCIST\n\nYou are a Fascist!';
        roleText.setAttribute('data-party', 'fascist');
    } else {
        roleInfo = '🟦 LIBERAL\n\nYou are a Liberal!';
        roleText.setAttribute('data-party', 'liberal');
    }
    
    roleText.textContent = roleInfo;
    roleBtn.textContent = '🔄 View Role Again';
    roleBtn.onclick = () => showRoleInfo(gameId, youPlayer);
}

function showCompatriotsInfo(gameId, youPlayer) {
    const roleText = document.getElementById('role-text');
    const compatriotsBtn = document.getElementById('compatriots-btn');
    
    if (!roleText || !compatriotsBtn) return;
    
    // Show other fascists
    const otherFascists = latestPlayers.filter(p => 
        p.id !== youPlayer.id && 
        p.role === 'fascist' && 
        p.alive !== false
    );
    
    let info = '👥 Your Fascist Comrades:\n\n';
    
    if (otherFascists.length === 0) {
        info += 'No other fascists found.';
    } else {
        otherFascists.forEach((fascist, index) => {
            info += `${index + 1}. ${fascist.name || 'Player'}\n`;
        });
    }
    
    roleText.textContent = info;
    compatriotsBtn.textContent = '🔄 View Comrades Again';
    compatriotsBtn.onclick = () => showCompatriotsInfo(gameId, youPlayer);
}

// Rules modal functionality
function initRulesModal() {
    const rulesModal = document.getElementById('rules-modal');
    const rulesContent = rulesModal?.querySelector('.rules-content');
    const ruleSections = rulesContent?.querySelectorAll('.rule-section');
    const ruleNavBtns = rulesModal?.querySelectorAll('.rule-nav-btn');
    const rulesPrev = document.getElementById('rules-prev');
    const rulesNext = document.getElementById('rules-next');
    const rulesIndicator = document.getElementById('rules-indicator');
    
    if (!rulesModal || !rulesContent || !ruleSections || !ruleNavBtns) return;
    
    let currentSectionIndex = 0;
    const totalSections = ruleSections.length;
    
    function showSection(index) {
        // Hide all sections
        ruleSections.forEach(section => section.classList.remove('active'));
        
        // Show current section
        ruleSections[index].classList.add('active');
        
        // Update navigation buttons
        ruleNavBtns.forEach(btn => btn.classList.remove('active'));
        ruleNavBtns[index].classList.add('active');
        
        // Update indicator
        if (rulesIndicator) {
            rulesIndicator.textContent = `${index + 1}/${totalSections}`;
        }
        
        // Update prev/next buttons
        if (rulesPrev) rulesPrev.disabled = index === 0;
        if (rulesNext) rulesPrev.disabled = index === totalSections - 1;
        
        currentSectionIndex = index;
    }
    
    // Navigation button click handlers
    ruleNavBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => showSection(index));
    });
    
    // Prev/Next button handlers
    if (rulesPrev) {
        rulesPrev.addEventListener('click', () => {
            if (currentSectionIndex > 0) {
                showSection(currentSectionIndex - 1);
            }
        });
    }
    
    if (rulesNext) {
        rulesNext.addEventListener('click', () => {
            if (currentSectionIndex < totalSections - 1) {
                showSection(currentSectionIndex + 1);
            }
        });
    }
    
    // Initialize with first section
    showSection(0);
}

// History modal functionality
function renderHistory() {
    const gameId = getGameId();
    const youId = computeYouId(gameId);
    
    if (!gameId || !youId) return;
    
    // Subscribe to history updates
    if (historyUnsub) {
        historyUnsub();
    }
    
    historyUnsub = onHistory(gameId, (items) => {
        historyItems = items || [];
        updateHistoryDisplay();
    });
}

function updateHistoryDisplay() {
    const historyBody = document.getElementById('history-body');
    if (!historyBody) return;
    
    const youId = computeYouId(getGameId());
    const visibleItems = historyItems.filter(canSeeEvent);
    
    if (visibleItems.length === 0) {
        historyBody.innerHTML = '<p style="text-align: center; color: #666;">No history yet.</p>';
        return;
    }
    
    // Group items by date
    const grouped = groupHistoryByDate(visibleItems);
    
    historyBody.innerHTML = '';
    
    Object.entries(grouped).forEach(([date, items]) => {
        const dateHeader = document.createElement('h4');
        dateHeader.textContent = date;
        dateHeader.style.margin = '20px 0 10px 0';
        dateHeader.style.borderBottom = '2px solid var(--propaganda-black)';
        dateHeader.style.paddingBottom = '5px';
        historyBody.appendChild(dateHeader);
        
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.style.margin = '8px 0';
            itemDiv.style.padding = '8px';
            itemDiv.style.border = '1px solid #ddd';
            itemDiv.style.borderRadius = '4px';
            itemDiv.style.backgroundColor = '#f9f9f9';
            
            const time = new Date(item.timestamp?.toDate() || item.timestamp || Date.now()).toLocaleTimeString();
            const message = item.message || 'Unknown event';
            
            itemDiv.innerHTML = `<strong>${time}</strong>: ${message}`;
            historyBody.appendChild(itemDiv);
        });
    });
}

function groupHistoryByDate(items) {
    const grouped = {};
    
    items.forEach(item => {
        const date = new Date(item.timestamp?.toDate() || item.timestamp || Date.now()).toLocaleDateString();
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(item);
    });
    
    // Sort items within each date group by timestamp
    Object.values(grouped).forEach(items => {
        items.sort((a, b) => {
            const timeA = a.timestamp?.toDate() || a.timestamp || 0;
            const timeB = b.timestamp?.toDate() || b.timestamp || 0;
            return timeB - timeA;
        });
    });
    
    return grouped;
}

function canSeeEvent(event) {
    if (!event) return false;
    
    const youId = computeYouId(getGameId());
    if (!youId) return true; // Show all if we can't determine player
    
    // Show events from this player
    if (event.actorId === youId) return true;
    
    // Show public events
    if (event.type === 'status' || event.type === 'public') return true;
    
    // Show role-specific events
    const youPlayer = latestPlayers.find(p => p.id === youId);
    if (!youPlayer || !youPlayer.role) return true;
    
    if (youPlayer.role === 'fascist' && event.type === 'fascist') return true;
    if (youPlayer.role === 'hitler' && event.type === 'hitler') return true;
    
    return false;
}

// Order modal functionality
function renderOrder() {
    const orderBody = document.getElementById('order-body');
    if (!orderBody) return;
    
    const players = latestPlayers || [];
    
    if (players.length === 0) {
        orderBody.innerHTML = '<p style="text-align: center; color: #666;">No players found.</p>';
        return;
    }
    
    orderBody.innerHTML = '';
    
    players.forEach((player, index) => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        
        const orderLeft = document.createElement('div');
        orderLeft.className = 'order-left';
        
        const orderNum = document.createElement('div');
        orderNum.className = 'order-num';
        orderNum.textContent = String(index + 1);
        orderLeft.appendChild(orderNum);
        
        const playerName = document.createElement('span');
        playerName.textContent = player.name || 'Player';
        orderLeft.appendChild(playerName);
        
        const orderRight = document.createElement('div');
        orderRight.className = 'order-right';
        
        // Add role badges if player has a role
        if (player.role) {
            const roleBadge = document.createElement('div');
            roleBadge.className = `badge-${player.role}`;
            roleBadge.textContent = player.role.toUpperCase();
            orderRight.appendChild(roleBadge);
        }
        
        // Add office badges
        if (latestGame) {
            if (latestGame.currentPresidentPlayerId === player.id) {
                const presBadge = document.createElement('div');
                presBadge.className = 'badge-pres';
                presBadge.textContent = 'PRES';
                orderRight.appendChild(presBadge);
            }
            
            if (latestGame.currentChancellorPlayerId === player.id) {
                const chancBadge = document.createElement('div');
                chancBadge.className = 'badge-chanc';
                chancBadge.textContent = 'CHANC';
                orderRight.appendChild(chancBadge);
            }
        }
        
        orderItem.appendChild(orderLeft);
        orderItem.appendChild(orderRight);
        orderBody.appendChild(orderItem);
    });
}

// Menu modal functionality
function renderMenu() {
    const menuBody = document.getElementById('menu-body');
    if (!menuBody) return;
    
    const gameId = getGameId();
    const youId = computeYouId(gameId);
    
    menuBody.innerHTML = '';
    
    // Game info section
    const gameInfo = document.createElement('div');
    gameInfo.style.marginBottom = '20px';
    gameInfo.style.padding = '15px';
    gameInfo.style.border = '2px solid var(--propaganda-black)';
    gameInfo.style.borderRadius = '8px';
    gameInfo.style.backgroundColor = '#f9f9f9';
    
    const gameTitle = document.createElement('h3');
    gameTitle.textContent = 'Game Information';
    gameTitle.style.margin = '0 0 10px 0';
    gameInfo.appendChild(gameTitle);
    
    if (latestGame) {
        const gameDetails = document.createElement('div');
        gameDetails.innerHTML = `
            <p><strong>Status:</strong> ${latestGame.state || 'Unknown'}</p>
            <p><strong>Players:</strong> ${latestPlayers.length}</p>
            <p><strong>Liberal Policies:</strong> ${latestGame.liberalPolicies || 0}/5</p>
            <p><strong>Fascist Policies:</strong> ${latestGame.fascistPolicies || 0}/6</p>
            <p><strong>Failed Elections:</strong> ${latestGame.electionTracker || 0}/3</p>
        `;
        gameInfo.appendChild(gameDetails);
    }
    
    menuBody.appendChild(gameInfo);
    
    // Action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.flexDirection = 'column';
    actionsDiv.style.gap = '10px';
    
    // Resume game button
    if (localPaused) {
        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'btn btn-primary';
        resumeBtn.textContent = '▶️ Resume Game';
        resumeBtn.style.width = '100%';
        resumeBtn.onclick = () => {
            try {
                localStorage.setItem(`sh_paused_${gameId}`, 'false');
                localPaused = false;
                document.getElementById('menu-modal').style.display = 'none';
                renderActions(gameId);
            } catch (_) {}
        };
        actionsDiv.appendChild(resumeBtn);
    }
    
    // Pause game button
    if (!localPaused) {
        const pauseBtn = document.createElement('button');
        pauseBtn.className = 'btn btn-secondary';
        pauseBtn.textContent = '⏸️ Pause Game (AFK)';
        pauseBtn.style.width = '100%';
        pauseBtn.onclick = () => {
            try {
                localStorage.setItem(`sh_paused_${gameId}`, 'true');
                localPaused = true;
                document.getElementById('menu-modal').style.display = 'none';
                renderActions(gameId);
            } catch (_) {}
        };
        actionsDiv.appendChild(pauseBtn);
    }
    
    // Leave game button
    const leaveBtn = document.createElement('button');
    leaveBtn.className = 'btn';
    leaveBtn.textContent = '🚪 Leave Game';
    leaveBtn.style.width = '100%';
    leaveBtn.onclick = () => {
        if (confirm('Are you sure you want to leave this game?')) {
            window.location.href = '../../index.html';
        }
    };
    actionsDiv.appendChild(leaveBtn);
    
    menuBody.appendChild(actionsDiv);
}

// Event listeners setup
document.addEventListener('DOMContentLoaded', function() {
    // Initialize rules modal
    initRulesModal();
    
    // Button click handlers
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            const rulesModal = document.getElementById('rules-modal');
            if (rulesModal) rulesModal.style.display = 'flex';
        });
    }
    
    const historyBtn = document.getElementById('history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            renderHistory();
            const historyModal = document.getElementById('history-modal');
            if (historyModal) historyModal.style.display = 'flex';
        });
    }
    
    const orderBtn = document.getElementById('order-btn');
    if (orderBtn) {
        orderBtn.addEventListener('click', () => {
            renderOrder();
            const orderModal = document.getElementById('order-modal');
            if (orderModal) orderModal.style.display = 'flex';
        });
    }
    
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            renderMenu();
            const menuModal = document.getElementById('menu-modal');
            if (menuModal) menuModal.style.display = 'flex';
        });
    }
    
    // Role overlay close button
    const roleCloseBtn = document.getElementById('role-close');
    if (roleCloseBtn) {
        roleCloseBtn.addEventListener('click', () => {
            const roleOverlay = document.getElementById('role-overlay');
            if (roleOverlay) roleOverlay.style.display = 'none';
        });
    }
    
    const roleDoneBtn = document.getElementById('role-done-btn');
    if (roleDoneBtn) {
        roleDoneBtn.addEventListener('click', () => {
            const roleOverlay = document.getElementById('role-overlay');
            if (roleOverlay) roleOverlay.style.display = 'none';
        });
    }
});

// Export functions for use in other modules
window.refreshRoleOverlayPermissions = refreshRoleOverlayPermissions;
window.showRoleOverlay = showRoleOverlay;
window.renderHistory = renderHistory;
window.renderOrder = renderOrder;
window.renderMenu = renderMenu;
