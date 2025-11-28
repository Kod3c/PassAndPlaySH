

import { app } from '../js/firebase.js';
import SessionManager from '../js/session-manager.js';
import { onHistory, logPublic, logPrivate } from '../js/db.js?v=2';
import { getFirestore, doc, getDoc, getDocs, onSnapshot, collection, query, orderBy, updateDoc, serverTimestamp, runTransaction, increment } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Import extracted utility functions
import { getGameId, hidePreloader, setPreloader, getYouPlayerId, formatTime } from './utils.js';
import { HEARTBEAT_INTERVAL_MS, RULE_KEYS } from './constants.js';
import { renderSlots, renderTracker, renderPlayers } from './renderers.js';
import { eligibleChancellorIds, canSeeEvent, setRoleBannerVisibility } from './helpers.js';
import { openOrderModal, closeOrderModal, openHistoryModal, closeHistoryModal } from './modals.js';

const db = getFirestore(app);
const sessionManager = new SessionManager(app);
let latestGame = null;
let latestPlayers = [];
let historyUnsub = null;
let historyItems = [];
let localPaused = false;
let lastStatusMessage = null;
// Constant moved to constants.js
let heartbeatTimer = null;
let isProcessingSuperpower = false; // Flag to prevent modal re-showing during superpower processing
let afkUnsub = null; let lastAfkSeenOrder = 0;
let isNominating = false; // Flag to prevent modal re-opening during nomination
let isHostQuitting = false; // Flag to prevent snapshot redirect when host is quitting to create page

// Track last logged state to prevent duplicate console logs
let lastLoggedState = {
    renderActionsPhase: null,
    renderActionsPolicyPhase: null,
    roleOverlayElements: null,
    buttonPermissionsState: null,
    buttonPermissionsDebug: null,
    buttonState: null,
    refreshPlayerInfo: null
};

// Functions moved to utils.js

async function ensureAuth() {
    const auth = getAuth(app);
    if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch (_) {}
    }
    return auth.currentUser;
}

function computeYouId(gameId) {
    const fromSession = getYouPlayerId(gameId);
    if (fromSession) return fromSession;
    const auth = getAuth(app);
    const uid = auth && auth.currentUser ? auth.currentUser.uid : null;
    if (!uid) return null;
    const m = (latestPlayers || []).find(p => p && p.uid === uid);
    return m ? m.id : null;
}

async function startSessionMonitoring(gameId) {
    try {
        const youId = computeYouId(gameId);
        if (!youId) return;

        await sessionManager.startMonitoring(gameId, youId, () => {
            // Custom handler for play page - show modal and prevent further actions
            sessionManager.showDefaultConflictModal();
        });
    } catch (error) {
        console.error('Failed to start session monitoring:', error);
    }
}

function heartbeatOnce(gameId) {
    try {
        const youId = computeYouId(gameId);
        if (!youId) return;
        const playerRef = doc(db, 'games', gameId, 'players', youId);
        updateDoc(playerRef, { lastSeen: serverTimestamp() }).catch(() => {});
    } catch (_) { /* no-op */ }
}

// Functions moved to renderers.js

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
                card.style.backgroundImage = type === 'liberal' ? "url('../images/liberal.png')" : "url('../images/fascist.png')";
                // Let CSS handle the transform for responsive sizing
                card.style.zIndex = '3';
                card.style.zIndex = '3';
                slot.appendChild(card);
                slot.classList.add('filled');
                
                // Remove bullet overlay when slot is filled
                const bulletOverlay = slot.querySelector('.bullet-overlay');
                if (bulletOverlay) bulletOverlay.remove();
            } else {
                existing.style.backgroundImage = type === 'liberal' ? "url('../images/liberal.png')" : "url('../images/fascist.png')";
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

// Dynamic function to update fascist slots 1-3 based on player count
function updateFascistSlotsForPlayerCount(containerEl, playerCount) {
    if (!containerEl || containerEl.children.length < 6) {
        console.warn('🚫 Cannot update fascist slots: invalid container or insufficient slots');
        return;
    }
    
    
    // Clear any existing overlays AND CSS module classes in slots 1-3 first (from ALL slots, filled or not)
    for (let i = 0; i < 3; i++) {
        const slot = containerEl.children[i];
        if (slot) {
            // Remove existing overlays from all slots, regardless of filled status
            const existingOverlays = slot.querySelectorAll('.eyeglass-overlay, .president-overlay, .trio-cards-overlay, .trio-cards-eye-overlay');
            existingOverlays.forEach(overlay => overlay.remove());
            
            // Remove CSS module classes that force background images
            const moduleClasses = ['trio-cards-eye-module', 'custom-module', 'has-president-overlay'];
            moduleClasses.forEach(className => {
                slot.classList.remove(className);
            });
        }
    }
    
    // Configure slots based on player count
    if (playerCount >= 5 && playerCount <= 6) {
        // 5-6 players: Slot 3 gets trio-cards-eye
        const slot3 = containerEl.children[2];
        if (slot3) {
            slot3.classList.add('trio-cards-eye-module'); // Add CSS class for background image
            addTrioCardsEyeToSlot(slot3); // Add JavaScript overlay
        }
        
    } else if (playerCount >= 7 && playerCount <= 8) {
        // 7-8 players: Slot 2 gets eyeglass, Slot 3 gets president
        addEyeglassToSlot(containerEl.children[1]); // Slot 2 (index 1)
        addPresidentToSlot(containerEl.children[2]); // Slot 3 (index 2)
        
    } else if (playerCount >= 9 && playerCount <= 10) {
        // 9-10 players: Slots 1 & 2 get eyeglass, Slot 3 gets president
        addEyeglassToSlot(containerEl.children[0]); // Slot 1 (index 0)
        addEyeglassToSlot(containerEl.children[1]); // Slot 2 (index 1)
        addPresidentToSlot(containerEl.children[2]); // Slot 3 (index 2)
        
    } else {
        console.warn(`⚠️ Unhandled player count: ${playerCount}. No slot configuration applied.`);
    }
}

// Helper function to add eyeglass overlay to a slot
function addEyeglassToSlot(slot) {
    if (!slot) {
        console.warn('🚫 Cannot add eyeglass: slot is null');
        return;
    }
    if (slot.classList.contains('filled')) {
        return;
    }

    const existingOverlay = slot.querySelector('.eyeglass-overlay');
    if (existingOverlay) {
        return;
    }

    // Remove skull background if it exists
    const skullBackground = slot.querySelector('.skull-background');
    if (skullBackground) {
        skullBackground.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'eyeglass-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 55%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 30px;
        height: auto;
        pointer-events: none;
        z-index: 20;
        opacity: 0.6;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    `;

    // Create image element to handle loading errors
    const img = document.createElement('img');
    img.src = '../images/eyeglass.png?v=8';
    img.alt = 'Investigation Power';
    img.style.cssText = 'width: 100%; height: auto;';

    img.onload = () => console.log('✅ Eyeglass image loaded successfully');
    img.onerror = () => console.error('❌ Failed to load eyeglass.png');

    overlay.appendChild(img);
    slot.appendChild(overlay);
}

// Helper function to add president overlay to a slot
function addPresidentToSlot(slot) {
    if (!slot) {
        console.warn('🚫 Cannot add president: slot is null');
        return;
    }
    if (slot.classList.contains('filled')) {
        return;
    }

    const existingOverlay = slot.querySelector('.president-overlay');
    if (existingOverlay) {
        return;
    }

    // Remove skull background if it exists
    const skullBackground = slot.querySelector('.skull-background');
    if (skullBackground) {
        skullBackground.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'president-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 55%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 30px;
        height: auto;
        pointer-events: none;
        z-index: 20;
        opacity: 0.6;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    `;
    
    // Create image element to handle loading errors
    const img = document.createElement('img');
    img.src = '../images/president.png?v=8';
    img.alt = 'Special Election Power';
    img.style.cssText = 'width: 100%; height: auto;';
    
    img.onload = () => console.log('✅ President image loaded successfully');
    img.onerror = () => console.error('❌ Failed to load president.png');
    
    overlay.appendChild(img);
    slot.appendChild(overlay);
    slot.classList.add('has-president-overlay');
}

// Helper function to add trio-cards-eye overlay to a slot (for 5-6 players)
function addTrioCardsEyeToSlot(slot) {
    if (!slot || slot.classList.contains('filled')) return;

    const existingOverlay = slot.querySelector('.trio-cards-eye-overlay');
    if (!existingOverlay) {
        // Remove skull background if it exists
        const skullBackground = slot.querySelector('.skull-background');
        if (skullBackground) {
            skullBackground.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'trio-cards-eye-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 55%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: auto;
            pointer-events: none;
            z-index: 20;
            opacity: 1.0;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        `;
        overlay.innerHTML = '<img src="../images/eyeglass.png?v=8" alt="Policy Peek Power" style="width: 100%; height: auto;">';
        slot.appendChild(overlay);
    }
}

// Utility function to refresh fascist slots when player count changes
function refreshFascistSlotsForPlayerCount() {
    const fascistSlotsEl = document.getElementById('fascist-slots');
    if (!fascistSlotsEl) {
        console.warn('🚫 Cannot refresh slots: fascist-slots element not found');
        return;
    }
    
    let playerCount = latestGame?.playerCount;
    const playersLength = (latestPlayers || []).length;
    
    console.log('🔍 DEBUG: Player count detection:', {
        'latestGame.playerCount': latestGame?.playerCount,
        'latestPlayers.length': playersLength,
        'latestGame': latestGame ? 'exists' : 'null',
        'latestPlayers': latestPlayers ? `array with ${playersLength} items` : 'null'
    });
    
    if (!playerCount || playerCount <= 0) {
        playerCount = playersLength;
    }
    if (!playerCount || playerCount <= 0) {
        console.warn('No valid player count found for slot refresh, defaulting to 5');
        playerCount = 5; // Default fallback
    }
    
    updateFascistSlotsForPlayerCount(fascistSlotsEl, playerCount);
}


// Add skull backgrounds to all fascist slots and bullet overlays to slots 4 and 5
function addBulletOverlaysToFascistSlots(containerEl) {
    if (!containerEl || containerEl.children.length < 6) return;

    // Add skull backgrounds to slots 1 and 2 ONLY (indices 0, 1)
    // Slot 3 (index 2) is handled by player-count-specific logic (human-eye, eyeglass, or president)
    for (let i = 0; i < 2; i++) {
        const slot = containerEl.children[i];
        if (!slot) continue;

        if (!slot.classList.contains('filled')) {
            // Add skull background or update existing one
            let skullBackground = slot.querySelector('.skull-background');
            if (!skullBackground) {
                skullBackground = document.createElement('div');
                skullBackground.className = 'skull-background';
                slot.appendChild(skullBackground);
            }
            // Always update the opacity (whether new or existing)
            skullBackground.style.cssText = `
                position: absolute;
                inset: 0;
                background-image: url('../images/skull.png');
                background-repeat: no-repeat;
                background-position: center;
                background-size: 46% auto;
                opacity: 0.75;
                filter: brightness(0) invert(1);
                pointer-events: none;
                z-index: 1;
            `;
        }
    }

    // Note: Slot 3 overlays (trio-cards-eye/human-eye, eyeglass, president) are handled by player-count-specific logic
    
    const fourthSlot = containerEl.children[3]; // Index 3 = 4th slot
    const fifthSlot = containerEl.children[4]; // Index 4 = 5th slot
    
    if (!fourthSlot || !fifthSlot) return;
    
    // Add bullet overlay to 4th slot (index 3)
    if (!fourthSlot.classList.contains('filled')) {
        // Add bullet overlay
        const existingBullet = fourthSlot.querySelector('.bullet-overlay');
        if (!existingBullet) {
            const bulletOverlay = document.createElement('div');
            bulletOverlay.className = 'bullet-overlay';
            bulletOverlay.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(40deg);
                width: 33px;
                height: auto;
                pointer-events: none;
                z-index: 20;
                opacity: 0.6;
            `;
            bulletOverlay.innerHTML = '<img src="../images/bullet.png?v=8" alt="Bullet" style="width: 100%; height: auto;">';
            fourthSlot.appendChild(bulletOverlay);
        }
    }
    
    // Add bullet overlay to 5th slot (index 4)
    if (!fifthSlot.classList.contains('filled')) {
        // Add bullet overlay
        const existingBullet = fifthSlot.querySelector('.bullet-overlay');
        if (!existingBullet) {
            const bulletOverlay = document.createElement('div');
            bulletOverlay.className = 'bullet-overlay';
            bulletOverlay.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(40deg);
                width: 33px;
                height: auto;
                pointer-events: none;
                z-index: 20;
                opacity: 0.6;
            `;
            bulletOverlay.innerHTML = '<img src="../images/bullet.png?v=8" alt="Bullet" style="width: 100%; height: auto;">';
            fifthSlot.appendChild(bulletOverlay);
        }
    }
}

// Superpower system functions
function getSuperpowerForSlot(fascistPolicyCount, playerCount) {
    const superpowers = {
        5: { // 5-6 players
            3: { name: 'Policy Peek', type: 'policy_peek', description: 'President examines the top 3 policy cards' },
            4: { name: 'Execution', type: 'execution', description: 'President executes a player' },
            5: { name: 'Execution', type: 'execution', description: 'President executes a player' }
        },
        7: { // 7-8 players  
            2: { name: 'Investigation', type: 'investigation', description: 'President investigates a player\'s loyalty' },
            3: { name: 'Special Election', type: 'special_election', description: 'President picks the next Presidential candidate' },
            4: { name: 'Execution', type: 'execution', description: 'President executes a player' },
            5: { name: 'Execution', type: 'execution', description: 'President executes a player' }
        },
        9: { // 9-10 players
            1: { name: 'Investigation', type: 'investigation', description: 'President investigates a player\'s loyalty' },
            2: { name: 'Investigation', type: 'investigation', description: 'President investigates a player\'s loyalty' },
            3: { name: 'Special Election', type: 'special_election', description: 'President picks the next Presidential candidate' },
            4: { name: 'Execution', type: 'execution', description: 'President executes a player' },
            5: { name: 'Execution', type: 'execution', description: 'President executes a player' }
        }
    };

    // Determine superpower config based on player count
    let config;
    if (playerCount <= 6) {
        config = superpowers[5];
    } else if (playerCount <= 8) {
        config = superpowers[7];
    } else {
        config = superpowers[9];
    }

    return config[fascistPolicyCount] || null;
}

async function triggerSuperpowerUI(gameId, superpower, fascistSlot) {

    // Capture the current President ID BEFORE any updates
    // This prevents race conditions with the onSnapshot listener
    const presidentId = latestGame.currentPresidentPlayerId;
    console.log(`🔍 Triggering superpower for President ID: ${presidentId}`);

    // Update game state to indicate superpower is pending
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
        pendingSuperpower: {
            type: superpower.type,
            name: superpower.name,
            description: superpower.description,
            slot: fascistSlot,
            presidentId: presidentId, // Store who the President was when this was triggered
            activatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
    });

    // Show superpower modal to the president
    showSuperpowerModal(superpower, fascistSlot);
}

function showSuperpowerModal(superpower, fascistSlot) {
    // Check if user is the president who should use this superpower
    // Use the presidentId stored in pendingSuperpower, not currentPresidentPlayerId
    // This prevents race conditions where the presidency has already advanced
    const youId = computeYouId(getGameId());
    const superpowerPresidentId = latestGame?.pendingSuperpower?.presidentId;
    const isPresidentForThisSuperpower = superpowerPresidentId && youId === superpowerPresidentId;

    console.log(`🔍 Superpower modal check: youId=${youId}, superpowerPresidentId=${superpowerPresidentId}, isPresident=${isPresidentForThisSuperpower}`);

    if (!isPresidentForThisSuperpower) {
        // Show notification for non-president players
        setStatus(getGameId(), `${superpower.name} activated! President must use this power.`);
        return;
    }

    // Create modal for president
    const modal = document.createElement('div');
    modal.id = 'superpower-modal';
    modal.className = 'modal-overlay superpower-modal';

    // Execution is required, other powers can be skipped
    const isExecutionPower = superpower.type === 'execution';
    const skipButtonHTML = isExecutionPower ? '' : '<button id="skip-superpower-btn" class="btn btn-secondary">Don\'t Use</button>';

    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header" style="justify-content: center;">
                <div class="modal-title">🦸‍♂️ Executive Power Available</div>
            </div>
            <div class="modal-body">
                <div class="superpower-info">
                    <div class="superpower-name">${superpower.name}</div>
                    <div class="superpower-description">${superpower.description}</div>
                </div>
                <div class="superpower-actions">
                    <button id="activate-superpower-btn" class="btn btn-primary">Activate Power</button>
                    ${skipButtonHTML}
                    <div class="superpower-note">You must use this power before the next government</div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle activation
    const activateBtn = document.getElementById('activate-superpower-btn');
    activateBtn.addEventListener('click', () => {
        handleSuperpowerActivation(superpower.type);
        modal.remove();
    });

    // Handle skip (only if not execution)
    if (!isExecutionPower) {
        const skipBtn = document.getElementById('skip-superpower-btn');
        skipBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to skip using ${superpower.name}? This power will be lost.`)) {
                modal.remove();
                completeSuperpower(getGameId(), superpower.type, true);
            }
        });
    }

    // Show modal
    requestAnimationFrame(() => {
        modal.style.display = 'flex';
    });
}

function handleSuperpowerActivation(superpowerType) {
    switch (superpowerType) {
        case 'policy_peek':
            handlePolicyPeek();
            break;
        case 'investigation':
            handleInvestigation();
            break;
        case 'special_election':
            handleSpecialElection();
            break;
        case 'execution':
            handleExecution();
            break;
        default:
            console.error('Unknown superpower type:', superpowerType);
    }
}

async function handlePolicyPeek() {
    const gameId = getGameId();
    if (!gameId || !latestGame) {
        console.error('❌ Cannot perform Policy Peek: No game found');
        return;
    }

    setStatus(gameId, 'Policy Peek: Examining the top 3 policy cards...');

    try {
        // Get the actual top 3 cards from the deck
        const topThreeCards = getActualTopThreePolicies();
        console.log('🔍 Policy Peek - Top 3 cards:', topThreeCards);

        // Create modal to show the top 3 cards
        const modal = document.createElement('div');
        modal.id = 'policy-peek-modal';
        modal.className = 'modal-overlay superpower-modal';
        modal.innerHTML = `
            <div class="modal-card policy-peek-modal-card">
                <button class="modal-close" aria-label="Close" id="policy-peek-close">×</button>
                <div class="modal-body">
                    <div class="policy-peek-header">
                        <div class="policy-peek-icon">🔍</div>
                        <h3 class="policy-peek-title">Policy Peek</h3>
                        <p class="policy-peek-subtitle">Top 3 cards from the deck</p>
                    </div>
                    <div class="policy-peek-cards">
                        ${topThreeCards.map((cardType, index) => {
                            const imageName = cardType;
                            return `
                            <div class="policy-peek-card-wrapper" style="animation-delay: ${index * 0.15}s">
                                <div class="policy-peek-card-img">
                                    <img src="../images/${imageName}.png" alt="${cardType} policy" />
                                </div>
                                <div class="policy-peek-card-position">#${index + 1}</div>
                            </div>
                        `}).join('')}
                    </div>
                    <div class="policy-peek-note">
                        <p>Cards remain in this order and will be drawn by the next President.</p>
                    </div>
                    <div class="policy-peek-actions">
                        <button id="policy-peek-done" class="btn btn-primary">Got it!</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle close button
        document.getElementById('policy-peek-close').addEventListener('click', async () => {
            modal.remove();
            await completeSuperpower(gameId, 'policy_peek');
        });

        // Handle completion
        document.getElementById('policy-peek-done').addEventListener('click', async () => {
            modal.remove();
            await completeSuperpower(gameId, 'policy_peek');
        });

        // Show modal
        requestAnimationFrame(() => {
            modal.style.display = 'flex';
        });

        // Log the superpower usage
        await logPublic(gameId, 'President used Policy Peek power', {
            type: 'superpower_used',
            superpowerType: 'policy_peek',
            actorId: latestGame.pendingSuperpower?.presidentId || latestGame.currentPresidentPlayerId
        });

    } catch (error) {
        console.error('❌ Policy Peek failed:', error);
        setStatus(gameId, 'Policy Peek failed. Please try again.');
    }
}

async function handleInvestigation() {
    const gameId = getGameId();
    if (!gameId || !latestGame || !latestPlayers) {
        console.error('❌ Cannot perform Investigation: No game or players found');
        return;
    }
    
    setStatus(gameId, 'Investigation: President is choosing a player to investigate...');
    
    try {
        const youId = computeYouId(gameId);
        
        // Get eligible players (everyone except president)
        // Note: Players can be investigated multiple times
        const eligiblePlayers = latestPlayers.filter(p =>
            p.id !== latestGame.currentPresidentPlayerId &&
            p.alive !== false
        );
        
        if (eligiblePlayers.length === 0) {
            setStatus(gameId, 'No players available to investigate');
            await completeSuperpower(gameId, 'investigation');
            return;
        }
        
        // Create player selection modal
        const modal = document.createElement('div');
        modal.id = 'investigation-modal';
        modal.className = 'modal-overlay superpower-modal';
        modal.innerHTML = `
            <div class="modal-card policy-peek-modal-card">
                <button class="modal-close" aria-label="Close" id="investigation-close">×</button>
                <div class="modal-body">
                    <div class="policy-peek-header">
                        <div class="policy-peek-icon">🔍</div>
                        <h3 class="policy-peek-title">Investigation</h3>
                        <p class="policy-peek-subtitle">Choose a player to investigate</p>
                    </div>
                    <div class="investigation-players">
                        ${eligiblePlayers.map(player => `
                            <button class="btn btn-primary investigation-player-btn" data-player-id="${player.id}">
                                ${player.name || 'Unnamed Player'}
                            </button>
                        `).join('')}
                    </div>
                    <div class="policy-peek-note">
                        <p>You will see this player's party membership (Liberal or Fascist).</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        // Handle close button
        document.getElementById('investigation-close').addEventListener('click', () => {
            modal.remove();
        });

        // Handle player selection
        modal.addEventListener('click', async (e) => {
            if (e.target.classList.contains('investigation-player-btn') || e.target.closest('.investigation-player-btn')) {
                const btn = e.target.classList.contains('investigation-player-btn') ? e.target : e.target.closest('.investigation-player-btn');
                const targetPlayerId = btn.dataset.playerId;
                const targetPlayer = latestPlayers.find(p => p.id === targetPlayerId);

                if (!targetPlayer) return;

                modal.remove();
                await performInvestigation(gameId, targetPlayer);
            }
        });

        // Show modal
        requestAnimationFrame(() => {
            modal.style.display = 'flex';
        });
        
    } catch (error) {
        console.error('❌ Investigation failed:', error);
        setStatus(gameId, 'Investigation failed. Please try again.');
    }
}

async function handleSpecialElection() {
    const gameId = getGameId();
    if (!gameId || !latestGame || !latestPlayers) {
        console.error('❌ Cannot perform Special Election: No game or players found');
        return;
    }
    
    setStatus(gameId, 'Special Election: President is choosing the next presidential candidate...');
    
    try {
        const youId = computeYouId(gameId);
        
        // Get eligible players (everyone except current president)
        const eligiblePlayers = latestPlayers.filter(p =>
            p.id !== latestGame.currentPresidentPlayerId && p.alive !== false
        );
        
        if (eligiblePlayers.length === 0) {
            setStatus(gameId, 'No players available for special election');
            await completeSuperpower(gameId, 'special_election');
            return;
        }
        
        // Create player selection modal
        const modal = document.createElement('div');
        modal.id = 'special-election-modal';
        modal.className = 'modal-overlay superpower-modal';
        modal.innerHTML = `
            <div class="modal-card policy-peek-modal-card">
                <button class="modal-close" aria-label="Close" id="special-election-close">×</button>
                <div class="modal-body">
                    <div class="policy-peek-header">
                        <div class="policy-peek-icon">🗳️</div>
                        <h3 class="policy-peek-title">Special Election</h3>
                        <p class="policy-peek-subtitle">Choose the next Presidential candidate</p>
                    </div>
                    <div class="special-election-players">
                        ${eligiblePlayers.map(player => `
                            <button class="btn btn-primary special-election-player-btn" data-player-id="${player.id}">
                                ${player.name || 'Unnamed Player'}
                            </button>
                        `).join('')}
                    </div>
                    <div class="policy-peek-note">
                        <p>This player will become the next Presidential candidate, bypassing normal turn order.</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle close button
        document.getElementById('special-election-close').addEventListener('click', () => {
            modal.remove();
        });

        // Handle player selection
        modal.addEventListener('click', async (e) => {
            if (e.target.classList.contains('special-election-player-btn') || e.target.closest('.special-election-player-btn')) {
                const btn = e.target.classList.contains('special-election-player-btn') ? e.target : e.target.closest('.special-election-player-btn');
                const targetPlayerId = btn.dataset.playerId;
                const targetPlayer = latestPlayers.find(p => p.id === targetPlayerId);

                if (!targetPlayer) return;

                modal.remove();
                await performSpecialElection(gameId, targetPlayer);
            }
        });

        // Show modal
        requestAnimationFrame(() => {
            modal.style.display = 'flex';
        });
        
    } catch (error) {
        console.error('❌ Special Election failed:', error);
        setStatus(gameId, 'Special Election failed. Please try again.');
    }
}

async function handleExecution() {
    const gameId = getGameId();
    if (!gameId || !latestGame || !latestPlayers) {
        console.error('❌ Cannot perform Execution: No game or players found');
        return;
    }
    
    setStatus(gameId, 'Execution: President is choosing a player to execute...');
    
    try {
        const youId = computeYouId(gameId);

        // Get eligible players (all alive players - president can execute anyone including themselves)
        const eligiblePlayers = latestPlayers.filter(p => p.alive !== false);

        if (eligiblePlayers.length === 0) {
            setStatus(gameId, 'No players available to execute');
            await completeSuperpower(gameId, 'execution');
            return;
        }

        // Create player selection modal with warning
        const modal = document.createElement('div');
        modal.id = 'execution-modal';
        modal.className = 'modal-overlay superpower-modal';
        modal.innerHTML = `
            <div class="modal-card policy-peek-modal-card">
                <button class="modal-close" aria-label="Close" id="execution-close">×</button>
                <div class="modal-body">
                    <div class="policy-peek-header">
                        <div class="policy-peek-icon">💀</div>
                        <h3 class="policy-peek-title">Execution</h3>
                        <p class="policy-peek-subtitle">Choose a player to execute</p>
                    </div>
                    <div class="execution-warning">
                        <div class="warning-icon">⚠️</div>
                        <p><strong>Note:</strong> If you execute Hitler, Liberals win immediately!</p>
                    </div>
                    <div class="execution-players">
                        ${eligiblePlayers.map(player => `
                            <button class="btn btn-primary execution-player-btn" data-player-id="${player.id}">
                                ${player.name || 'Unnamed Player'}
                            </button>
                        `).join('')}
                    </div>
                    <div class="policy-peek-note">
                        <p>The executed player will be removed from the game permanently.</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle close button
        document.getElementById('execution-close').addEventListener('click', () => {
            modal.remove();
        });

        // Handle player selection
        modal.addEventListener('click', async (e) => {
            if (e.target.classList.contains('execution-player-btn') || e.target.closest('.execution-player-btn')) {
                const btn = e.target.classList.contains('execution-player-btn') ? e.target : e.target.closest('.execution-player-btn');
                const targetPlayerId = btn.dataset.playerId;
                const targetPlayer = latestPlayers.find(p => p.id === targetPlayerId);

                if (!targetPlayer) return;

                modal.remove();
                await performExecution(gameId, targetPlayer);
            }
        });

        // Show modal
        requestAnimationFrame(() => {
            modal.style.display = 'flex';
        });
        
    } catch (error) {
        console.error('❌ Execution failed:', error);
        setStatus(gameId, 'Execution failed. Please try again.');
    }
}

// Helper function to complete a superpower and clear pending state
async function completeSuperpower(gameId, superpowerType) {
    try {
        const gameRef = doc(db, 'games', gameId);
        await updateDoc(gameRef, {
            pendingSuperpower: null,
            updatedAt: serverTimestamp()
        });

        setStatus(gameId, `${superpowerType.replace('_', ' ')} power completed.`);

        // Now advance to next government after superpower is complete
        await advanceToNextGovernment(gameId, gameRef);
    } catch (error) {
        console.error('❌ Failed to complete superpower:', error);
    } finally {
        // Clear the processing flag after superpower is complete
        isProcessingSuperpower = false;
    }
}

// Helper function to perform investigation and show result
async function performInvestigation(gameId, targetPlayer) {
    try {
        isProcessingSuperpower = true; // Set flag to prevent modal re-showing
        // Mark player as investigated
        const playerRef = doc(db, 'games', gameId, 'players', targetPlayer.id);
        await updateDoc(playerRef, {
            investigated: true,
            updatedAt: serverTimestamp()
        });
        
        // Show investigation result to president
        // Investigation reveals party membership (Hitler shows as Fascist, not as Hitler)
        const party = targetPlayer.party || 'liberal';
        const membership = party.charAt(0).toUpperCase() + party.slice(1).toLowerCase(); // Capitalize: Liberal or Fascist
        
        const resultModal = document.createElement('div');
        resultModal.id = 'investigation-result-modal';
        resultModal.className = 'modal-overlay superpower-modal';
        resultModal.innerHTML = `
            <div class="modal-card policy-peek-modal-card">
                <button class="modal-close" aria-label="Close" id="investigation-result-close">×</button>
                <div class="modal-body">
                    <div class="policy-peek-header">
                        <div class="policy-peek-icon">🔍</div>
                        <h3 class="policy-peek-title">Investigation Result</h3>
                        <p class="policy-peek-subtitle">${targetPlayer.name || 'Unnamed Player'}</p>
                    </div>
                    <div class="investigation-result">
                        <div class="membership-reveal ${membership.toLowerCase()}">
                            <div class="membership-icon">${membership === 'Liberal' ? '🟦' : '🟥'}</div>
                            <div class="membership-text">${membership}</div>
                        </div>
                    </div>
                    <div class="policy-peek-note">
                        <p>You may share this information (or lie about it) with other players.</p>
                    </div>
                    <div class="policy-peek-actions">
                        <button id="investigation-result-done" class="btn btn-primary">Got it!</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(resultModal);

        // Handle close button
        document.getElementById('investigation-result-close').addEventListener('click', () => {
            resultModal.remove();
        });

        document.getElementById('investigation-result-done').addEventListener('click', () => {
            resultModal.remove();
        });

        requestAnimationFrame(() => {
            resultModal.style.display = 'flex';
        });
        
        // Log the investigation
        await logPublic(gameId, `President investigated ${targetPlayer.name || 'a player'}`, {
            type: 'superpower_used',
            superpowerType: 'investigation',
            actorId: latestGame.currentPresidentPlayerId,
            targetId: targetPlayer.id
        });
        
        await completeSuperpower(gameId, 'investigation');

    } catch (error) {
        console.error('❌ Investigation failed:', error);
        setStatus(gameId, 'Investigation failed. Please try again.');
        isProcessingSuperpower = false; // Clear flag on error
    }
}

// Helper function to perform special election
async function performSpecialElection(gameId, targetPlayer) {
    try {
        isProcessingSuperpower = true; // Set flag to prevent modal re-showing
        const gameRef = doc(db, 'games', gameId);

        // Get current game state to preserve the president index
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) {
            throw new Error('Game not found');
        }
        const currentGame = gameSnap.data();

        // Save the current president index so we can restore normal rotation after special election
        // Note: Do NOT set isSpecialElection here - it will be set when the special election round starts
        await updateDoc(gameRef, {
            specialElectionCandidate: targetPlayer.id,
            savedPresidentIndex: currentGame.presidentIndex, // Save current index to restore later
            updatedAt: serverTimestamp()
        });

        // Log the special election
        await logPublic(gameId, `President chose ${targetPlayer.name || 'a player'} as the next Presidential candidate`, {
            type: 'superpower_used',
            superpowerType: 'special_election',
            actorId: latestGame.currentPresidentPlayerId,
            targetId: targetPlayer.id
        });

        setStatus(gameId, `Special Election: ${targetPlayer.name || 'Player'} will be the next Presidential candidate.`);
        await completeSuperpower(gameId, 'special_election');

    } catch (error) {
        console.error('❌ Special Election failed:', error);
        setStatus(gameId, 'Special Election failed. Please try again.');
        isProcessingSuperpower = false; // Clear flag on error
    }
}

// Helper function to perform execution
async function performExecution(gameId, targetPlayer) {
    try {
        isProcessingSuperpower = true; // Set flag to prevent modal re-showing
        // Check if target is Hitler - this ends the game with Liberal victory
        if (targetPlayer.role === 'hitler') {
            const gameRef = doc(db, 'games', gameId);
            await updateDoc(gameRef, {
                gamePhase: 'ended',
                winner: 'liberal',
                winCondition: 'hitler_executed',
                endedAt: serverTimestamp(),
                pendingSuperpower: null,
                updatedAt: serverTimestamp()
            });
            
            // Log Hitler execution and game end
            await logPublic(gameId, `🎯 President executed Hitler! Liberals win!`, {
                type: 'game_end',
                winner: 'liberal',
                winCondition: 'hitler_executed',
                executedPlayerId: targetPlayer.id
            });
            
            setStatus(gameId, '🎯 Hitler has been executed! Liberals win the game!');
            isProcessingSuperpower = false; // Clear flag since we're not calling completeSuperpower
            return;
        }
        
        // Mark player as executed (remove from game)
        const playerRef = doc(db, 'games', gameId, 'players', targetPlayer.id);
        await updateDoc(playerRef, {
            executed: true,
            alive: false,
            updatedAt: serverTimestamp()
        });
        
        // Log the execution
        await logPublic(gameId, `💀 President executed ${targetPlayer.name || 'a player'}`, {
            type: 'superpower_used',
            superpowerType: 'execution',
            actorId: latestGame.currentPresidentPlayerId,
            targetId: targetPlayer.id
        });
        
        setStatus(gameId, `💀 ${targetPlayer.name || 'Player'} has been executed and removed from the game.`);
        await completeSuperpower(gameId, 'execution');

    } catch (error) {
        console.error('❌ Execution failed:', error);
        setStatus(gameId, 'Execution failed. Please try again.');
        isProcessingSuperpower = false; // Clear flag on error
    }
}

function updateFromGame(game) {
    if (!game) return;
    const lib = Number(game.liberalPolicies || 0);
    const fas = Number(game.fascistPolicies || 0);
    const et = Number(game.electionTracker || 0);

    const libEl = document.getElementById('liberal-count');
    const fasEl = document.getElementById('fascist-count');
    if (libEl) libEl.textContent = `${lib}/5`;
    if (fasEl) fasEl.textContent = `${fas}/6`;

    // Place enacted policy cards into the board tracks
    const liberalSlotsEl = document.getElementById('liberal-slots');
    const fascistSlotsEl = document.getElementById('fascist-slots');
    if (liberalSlotsEl) renderPoliciesToSlots(liberalSlotsEl, Math.min(lib, 5), 'liberal');
    if (fascistSlotsEl) renderPoliciesToSlots(fascistSlotsEl, Math.min(fas, 6), 'fascist');
    
    // Always add bullet overlays to 4th and 5th fascist slots to show upcoming superpowers
    if (fascistSlotsEl) {
        addBulletOverlaysToFascistSlots(fascistSlotsEl);
    }

    const squares = document.querySelectorAll('#election-tracker .square');
    squares.forEach((sq, idx) => {
        if (et > idx) {
            sq.classList.add('active');
            sq.textContent = 'X';
        } else {
            sq.classList.remove('active');
            sq.textContent = sq.dataset.defaultNumber || String(idx + 1);
        }
    });

    // Update table spread count based on current game state
    const tableSpreadCount = calculateTableSpreadCountFromGameState(game);
    setTableSpreadCount(tableSpreadCount);
}

function updateRoleBanner(game, gameId) {
    const banner = document.getElementById('role-banner');
    const badge = document.getElementById('role-badge');
    const youId = computeYouId(gameId);
    if (!banner || !badge || !game || !youId) {
        if (banner) banner.style.display = 'none';
        document.body.classList.remove('role-banner-visible');
        return;
    }
    const isPres = game.currentPresidentPlayerId && (game.currentPresidentPlayerId === youId);
    const isChanc = game.currentChancellorPlayerId && (game.currentChancellorPlayerId === youId);
    if (!isPres && !isChanc) { banner.style.display = 'none'; document.body.classList.remove('role-banner-visible'); return; }
    let text = '';
    let cls = 'role-tag';
    if (isPres && isChanc) { text = '👑🔨 President & Chancellor'; }
    else if (isPres) { text = '👑 President'; }
    else if (isChanc) { text = '🔨 Chancellor'; }
    badge.className = cls;
    badge.textContent = text;
    banner.style.display = 'block';
    document.body.classList.add('role-banner-visible');
}

function updateDeadBanner(game, gameId) {
    const banner = document.getElementById('dead-banner');
    if (!banner) {
        console.warn('💀 Dead banner element not found');
        return;
    }

    const youId = computeYouId(gameId);
    if (!game || !youId) {
        console.log('💀 No game or youId, hiding banner', { game: !!game, youId });
        banner.style.display = 'none';
        return;
    }

    // Try to find player in latestPlayers first (more up-to-date), then fall back to game.players
    const players = (latestPlayers && latestPlayers.length > 0) ? latestPlayers : (game.players || []);
    const you = players.find(p => p && p.id === youId);

    if (!you) {
        console.log('💀 Player not found', {
            youId,
            latestPlayersCount: latestPlayers?.length || 0,
            gamePlayersCount: game.players?.length || 0,
            playersChecked: players.length
        });
        banner.style.display = 'none';
        return;
    }

    const isDead = you.alive === false || you.executed === true;
    console.log('💀 Dead banner check:', {
        youId,
        playerName: you.name,
        alive: you.alive,
        executed: you.executed,
        isDead
    });

    if (isDead) {
        console.log('💀 SHOWING DEAD BANNER');
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

async function showVictoryModal(game) {
    // Don't show if game isn't ended or modal already exists
    if (!game || game.gamePhase !== 'ended') return;
    if (document.getElementById('victory-modal')) return;

    const winner = game.winner; // 'liberal' or 'fascist'
    const winCondition = game.winCondition; // 'policy', 'hitler_executed', 'hitler_elected'

    // Fetch players from Firestore if latestPlayers is empty
    let players = latestPlayers;
    if (!players || players.length === 0) {
        console.log('🎯 latestPlayers empty, fetching from Firestore...');
        const gameId = getGameId();
        const playersSnapshot = await getDocs(query(collection(db, 'games', gameId, 'players'), orderBy('orderIndex', 'asc')));
        players = playersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('🎯 Fetched players:', players);
    }

    // Determine victory reason text
    let reasonText = '';
    if (winCondition === 'policy') {
        if (winner === 'liberal') {
            reasonText = '5 Liberal Policies Enacted';
        } else {
            reasonText = '6 Fascist Policies Enacted';
        }
    } else if (winCondition === 'hitler_executed') {
        reasonText = 'Hitler Was Executed';
    } else if (winCondition === 'hitler_elected') {
        reasonText = 'Hitler Elected Chancellor';
    } else {
        reasonText = 'Victory Achieved';
    }

    // Determine team display
    const teamIcon = winner === 'liberal' ? '🕊️' : '🦅';
    const teamName = winner === 'liberal' ? 'Liberals' : 'Fascists';
    const teamClass = winner === 'liberal' ? 'liberal' : 'fascist';

    // Organize players by team
    const liberals = [];
    const fascists = [];
    let hitler = null;

    console.log('🎯 Victory Modal - players:', players);
    console.log('🎯 Victory Modal - players count:', players?.length);

    (players || []).forEach(player => {
        console.log('🎯 Processing player:', {
            name: player.name,
            role: player.role,
            membership: player.membership,
            alive: player.alive,
            executed: player.executed
        });

        const isDead = player.alive === false || player.executed === true;
        const playerData = {
            name: player.name || 'Unknown',
            role: player.role || 'unknown',
            membership: player.membership || 'Liberal',
            isDead: isDead
        };

        if (player.role === 'hitler') {
            console.log('🎯 Found Hitler:', player.name);
            hitler = playerData;
        } else if (player.membership === 'Fascist' || player.role === 'fascist') {
            console.log('🎯 Found Fascist:', player.name);
            fascists.push(playerData);
        } else {
            console.log('🎯 Found Liberal:', player.name);
            liberals.push(playerData);
        }
    });

    console.log('🎯 Final teams:', { liberals, fascists, hitler });

    // Build role reveals HTML
    const liberalsHTML = liberals.map(p => `
        <div class="victory-player ${p.isDead ? 'dead' : ''}">
            <span class="victory-player-icon">${p.isDead ? '💀' : '👤'}</span>
            <span class="victory-player-name">${p.name}</span>
            <span class="victory-player-role">Liberal</span>
        </div>
    `).join('');

    const fascistsHTML = fascists.map(p => `
        <div class="victory-player ${p.isDead ? 'dead' : ''}">
            <span class="victory-player-icon">${p.isDead ? '💀' : '👤'}</span>
            <span class="victory-player-name">${p.name}</span>
            <span class="victory-player-role">Fascist</span>
        </div>
    `).join('');

    const hitlerHTML = hitler ? `
        <div class="victory-player hitler ${hitler.isDead ? 'dead' : ''}">
            <span class="victory-player-icon">${hitler.isDead ? '💀' : '👤'}</span>
            <span class="victory-player-name">${hitler.name}</span>
            <span class="victory-player-role">Hitler</span>
        </div>
    ` : '';

    // Game stats
    const liberalPolicies = game.liberalPolicies || 0;
    const fascistPolicies = game.fascistPolicies || 0;

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'victory-modal';
    modal.className = 'modal-overlay victory-modal';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-body">
                <div class="victory-header ${teamClass}">
                    <div class="victory-icon">${teamIcon}</div>
                    <h2 class="victory-title">${teamName} Win!</h2>
                    <p class="victory-subtitle">${reasonText}</p>
                </div>
                <div class="victory-content">
                    <div class="victory-section">
                        <h3 class="victory-section-title">Final Policies</h3>
                        <div class="victory-stats">
                            <div class="victory-stat">
                                <div class="victory-stat-value liberal">${liberalPolicies}</div>
                                <div class="victory-stat-label">Liberal</div>
                            </div>
                            <div class="victory-stat">
                                <div class="victory-stat-value fascist">${fascistPolicies}</div>
                                <div class="victory-stat-label">Fascist</div>
                            </div>
                        </div>
                    </div>
                    <div class="victory-section">
                        <h3 class="victory-section-title">Role Reveals</h3>
                        <div class="victory-roles">
                            <div class="victory-team">
                                <h4 class="victory-team-header liberal">🕊️ Liberal Team</h4>
                                ${liberalsHTML || '<p style="text-align:center;opacity:0.5;font-size:0.85rem;">No liberals</p>'}
                            </div>
                            <div class="victory-team">
                                <h4 class="victory-team-header fascist">🦅 Fascist Team</h4>
                                ${hitlerHTML}
                                ${fascistsHTML || ''}
                                ${!hitlerHTML && !fascistsHTML ? '<p style="text-align:center;opacity:0.5;font-size:0.85rem;">No fascists</p>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="victory-actions">
                    <button id="victory-lobby-btn" class="btn btn-primary">Back to Lobby</button>
                    <button id="victory-history-btn" class="btn btn-secondary">View Log</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle back to lobby button
    document.getElementById('victory-lobby-btn').addEventListener('click', () => {
        const gameId = getGameId();
        window.location.href = `./join.html?game=${encodeURIComponent(gameId)}`;
    });

    // Handle view history button
    document.getElementById('victory-history-btn').addEventListener('click', () => {
        modal.remove();
        // Open history modal if available
        const historyBtn = document.getElementById('history-btn');
        if (historyBtn) historyBtn.click();
    });

    // Show modal
    requestAnimationFrame(() => {
        modal.style.display = 'flex';
    });
}

function updateRoleEnvelope(game, gameId) {
    const envelope = document.getElementById('role-envelope');
    if (!envelope) return;

    // Always show the role envelope at 100% opacity
    envelope.style.display = 'block';
    envelope.style.opacity = '1';
    envelope.style.filter = 'none';

    if (!game || !gameId) {
        envelope.title = 'Role envelope (game loading...)';
        return;
    }
    
    const youId = computeYouId(gameId);
    if (!youId) {
        envelope.title = 'Role envelope (waiting for player ID...)';
        return;
    }
    
    const youPlayer = (latestPlayers || []).find(p => p && p.id === youId);
    if (!youPlayer || !youPlayer.role) {
        envelope.title = 'Role envelope (waiting for role assignment...)';
        return;
    }
    
    // Player has a role - envelope is fully functional
    if (game.state === 'playing' && youPlayer.role) {
        envelope.title = 'Click to view your secret role';
    } else {
        envelope.title = `Role envelope (game state: ${game.state || 'unknown'})`;
    }
}

function setStatus(gameId, message, delayMs = 0, logToHistory = false) {
    try {
        const el = document.getElementById('status');
        if (!el) return;

        if (delayMs > 0) {
            // Clear any existing delayed status
            if (window.delayedStatusTimer) {
                clearTimeout(window.delayedStatusTimer);
            }

            // Set delayed status
            window.delayedStatusTimer = setTimeout(() => {
                el.textContent = message || '';
                // retrigger small animation
                el.classList.remove('status-updated');
                void el.offsetWidth;
                el.classList.add('status-updated');
                // Only log to history if explicitly requested and message is different
                if (logToHistory && gameId && message && message !== lastStatusMessage) {
                    lastStatusMessage = message;
                    try { logPublic(gameId, message, { type: 'status' }); } catch (_) {}
                }
            }, delayMs);
        } else {
            // Immediate status update
            el.textContent = message || '';
            // retrigger small animation
            el.classList.remove('status-updated');
            void el.offsetWidth;
            el.classList.add('status-updated');
            // Only log to history if explicitly requested and message is different
            if (logToHistory && gameId && message && message !== lastStatusMessage) {
                lastStatusMessage = message;
                try { logPublic(gameId, message, { type: 'status' }); } catch (_) {}
            }
        }
    } catch (_) { /* no-op */ }
}

// Function moved to renderers.js

// Function moved to helpers.js

function computePhase(game) {
    if (!game || game.state !== 'playing') return 'idle';
    const voteResolution = (game.voteResolution || null);
    if (!voteResolution) {
        const nomineeId = game.nominatedChancellorPlayerId || null;
        return nomineeId ? 'voting' : 'nomination';
    }
    let passed = false;
    if (typeof voteResolution === 'string') {
        passed = (voteResolution === 'ja');
    } else if (typeof voteResolution === 'object') {
        passed = !!voteResolution.passed;
    }
    if (passed) {
        const policyPhase = (game.policyPhase || null);
        if (policyPhase === 'veto_proposed') return 'veto_proposed';
        if (policyPhase === 'chancellor_choice') return 'chancellor_choice';
        if (policyPhase === 'completed') return 'completed';
        return policyPhase || 'president_draw';
    }
    return 'post_vote';
}

function renderPhaseNomination(gameId, youId, game, players, actionsCenter) {
    const presId = game.currentPresidentPlayerId || null;
    const pres = players.find(p => p && p.id === presId) || null;
    if (youId && youId === presId) {
        if (pres) { setStatus(gameId, `${pres.name || 'President'}: Nominate a Chancellor`); }
        const chooseBtn = document.createElement('button');
        chooseBtn.id = 'open-nominate-btn';
        chooseBtn.className = 'btn btn-primary';
        chooseBtn.textContent = 'Choose Chancellor';
        actionsCenter.appendChild(chooseBtn);
    } else {
        setStatus(gameId, 'Waiting for the President to nominate a Chancellor…');
    }
    // Clean up any existing overlays when changing phases
    cleanupAllPolicyOverlays();
}

function renderPhaseVoting(gameId, youId, game, players, actionsCenter) {
    const nomineeId = game.nominatedChancellorPlayerId || null;
    const chanc = players.find(p => p && p.id === nomineeId) || null;
    if (chanc) setStatus(gameId, `Chancellor nominated: ${chanc.name || 'Player'}`);

    const votes = (game.electionVotes && typeof game.electionVotes === 'object') ? game.electionVotes : {};
    const aliveIds = (players || []).filter(p => p && p.alive !== false).map(p => p.id);
    const totalVoters = aliveIds.length || players.length;
    const numVotes = Object.keys(votes).filter(k => aliveIds.includes(k)).length;
    const youVoted = youId ? !!votes[youId] : false;

    const wrap = document.createElement('div');
    wrap.className = 'vote-pop-wrap';
    wrap.style.margin = '0 auto';

    const voteBtn = document.createElement('button');
    voteBtn.id = 'vote-toggle-btn';
    voteBtn.style.minWidth = '160px';
    voteBtn.style.minHeight = '44px';
    voteBtn.style.fontSize = '1.05rem';
    const votedValue = youVoted ? String(votes[youId]).toUpperCase() : 'Vote';
    voteBtn.innerHTML = `<span class="vote-label">${votedValue}</span><span class="vote-count">(${numVotes}/${totalVoters})</span>`;
    const canVote = youId && aliveIds.includes(youId) && !youVoted;
    if (canVote) {
        voteBtn.className = 'btn btn-black btn-attention btn-flashy';
    } else {
        voteBtn.className = 'btn btn-black';
        voteBtn.disabled = true;
        voteBtn.setAttribute('aria-disabled', 'true');
    }
    wrap.appendChild(voteBtn);
    if (canVote) {
        const pop = document.createElement('div');
        pop.id = 'vote-popover';
        pop.className = 'vote-popover';
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '8px';
        const yesBtn = document.createElement('button');
        yesBtn.className = 'btn btn-primary';
        yesBtn.setAttribute('data-vote', 'ja');
        yesBtn.textContent = 'Ja';
        const noBtn = document.createElement('button');
        noBtn.className = 'btn';
        noBtn.setAttribute('data-vote', 'nein');
        noBtn.textContent = 'Nein';
        row.appendChild(yesBtn);
        row.appendChild(noBtn);
        pop.appendChild(row);
        wrap.appendChild(pop);
    }
    actionsCenter.appendChild(wrap);
    
    // Clean up any existing overlays when changing phases
    cleanupAllPolicyOverlays();
}

function renderPhasePresidentDraw(gameId, youId, game, players, actionsCenter) {
    const presId = game.currentPresidentPlayerId || null;
    const pres = players.find(p => p && p.id === presId) || null;
    if (youId && youId === presId) {
        // Check if there are enough cards to draw
        if (currentTableSpreadCount < 3) {
            setStatus(gameId, `${pres ? (pres.name || 'President') : 'President'}: Shuffle discard pile`);
        } else {
            setStatus(gameId, `${pres ? (pres.name || 'President') : 'President'}: Draw 3 policy cards`);
        }

        try { initSpreadPresidentDrawUI(gameId); } catch (_) {}
        // Clean up overlays but preserve president draw overlay during re-renders
        cleanupAllPolicyOverlays(['president_draw']);

        // Add shuffle button if there are too few cards to draw
        if (currentTableSpreadCount < 3) {
            const shuffleBtn = document.createElement('button');
            shuffleBtn.id = 'shuffle-discard-btn';
            shuffleBtn.className = 'btn btn-primary';
            shuffleBtn.textContent = 'Shuffle Discard Pile';

            shuffleBtn.addEventListener('click', async function() {
                try {
                    shuffleBtn.disabled = true;
                    shuffleBtn.textContent = 'Shuffling...';

                    await resetDiscardCount();

                    // Wait for the game state to be updated with the new shuffled deck
                    // We need to wait a bit for Firebase to propagate the changes
                    await new Promise(resolve => {
                        let attempts = 0;
                        const maxAttempts = 50; // 5 seconds max (50 * 100ms)
                        const checkInterval = setInterval(() => {
                            attempts++;
                            // Check if latestGame has been updated with deckPosition = 0
                            if (latestGame && latestGame.deckPosition === 0 && latestGame.policyDeckOrder && latestGame.policyDeckOrder.length > 3) {
                                clearInterval(checkInterval);
                                resolve();
                            } else if (attempts >= maxAttempts) {
                                console.warn('Timeout waiting for game state update after reshuffle');
                                clearInterval(checkInterval);
                                resolve(); // Proceed anyway
                            }
                        }, 100);
                    });

                    // Update status message after successful shuffle
                    setStatus(gameId, `${pres ? (pres.name || 'President') : 'President'}: Draw 3 policy cards`);

                    // Reinitialize the president draw UI to enable card selection
                    try {
                        teardownSpreadPresidentDrawUI();
                        initSpreadPresidentDrawUI(gameId);
                    } catch (err) {
                        console.error('Failed to reinitialize president draw UI:', err);
                    }

                    // Success - remove button after shuffle
                    shuffleBtn.textContent = '✅ Shuffled!';
                    setTimeout(() => {
                        if (shuffleBtn.parentNode) {
                            shuffleBtn.parentNode.removeChild(shuffleBtn);
                        }
                    }, 1000);
                } catch (error) {
                    console.error('Shuffle failed:', error);
                    shuffleBtn.disabled = false;
                    shuffleBtn.textContent = '❌ Failed - Try Again';
                    alert('Shuffle failed: ' + error.message);
                }
            });

            actionsCenter.appendChild(shuffleBtn);
        }
    } else {
        setStatus(gameId, 'Waiting for the President to draw policy cards…');
        try { teardownSpreadPresidentDrawUI(); } catch (_) {}
        // Clean up overlays but preserve them during re-renders for the active president
        cleanupAllPolicyOverlays(['president_draw']);
    }
}

function renderPhaseChancellorChoice(gameId, youId, game, players, actionsCenter) {
    const chancId = game.currentChancellorPlayerId || null;
    const chanc = players.find(p => p && p.id === chancId) || null;

    if (youId && youId === chancId) {
        setStatus(gameId, `${chanc ? (chanc.name || 'Chancellor') : 'Chancellor'}: Choose 1 policy to enact`);

        // Only show the overlay if it doesn't already exist
        if (!document.getElementById('chancellor-choice-overlay')) {
            showChancellorChoiceOverlay(game);
        }

        // Also show the button as a fallback in case they need to reopen it
        if (!document.getElementById('show-chancellor-cards-btn')) {
            const showCardsBtn = document.createElement('button');
            showCardsBtn.id = 'show-chancellor-cards-btn';
            showCardsBtn.className = 'btn btn-secondary';
            showCardsBtn.textContent = 'Reopen Policy Cards';
            showCardsBtn.style.marginTop = '16px';
            showCardsBtn.style.marginBottom = '16px';
            showCardsBtn.style.display = 'block';
            showCardsBtn.style.marginLeft = 'auto';
            showCardsBtn.style.marginRight = 'auto';

            showCardsBtn.addEventListener('click', function() {
                showChancellorChoiceOverlay(game);
            });

            actionsCenter.appendChild(showCardsBtn);
        }

    } else {
        setStatus(gameId, `Waiting for ${chanc ? (chanc.name || 'Chancellor') : 'Chancellor'} to choose a policy…`);
        // Clean up overlays but preserve them during re-renders for the active chancellor
        cleanupAllPolicyOverlays(['chancellor_choice']);
    }
}

function renderPhaseVetoProposed(gameId, youId, game, players, actionsCenter) {
    const presId = game.currentPresidentPlayerId || null;
    const pres = players.find(p => p && p.id === presId) || null;
    const chancId = game.currentChancellorPlayerId || null;
    const chanc = players.find(p => p && p.id === chancId) || null;

    if (youId && youId === presId) {
        setStatus(gameId, 'Chancellor proposes veto. Accept or reject?');

        // Create veto decision buttons for the president
        const vetoDecisionDiv = document.createElement('div');
        vetoDecisionDiv.className = 'veto-decision-container';
        vetoDecisionDiv.style.cssText = 'display: flex; gap: 12px; justify-content: center; align-items: center; margin: 16px auto;';

        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'btn btn-primary';
        acceptBtn.textContent = '✅ Accept Veto';
        acceptBtn.style.minWidth = '140px';
        acceptBtn.style.minHeight = '48px';
        acceptBtn.title = 'Discard both policies and advance election tracker';

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn btn-secondary';
        rejectBtn.textContent = '❌ Reject Veto';
        rejectBtn.style.minWidth = '140px';
        rejectBtn.style.minHeight = '48px';
        rejectBtn.title = 'Chancellor must enact one policy';

        acceptBtn.addEventListener('click', async function() {
            if (!confirm('Accept the veto? Both policies will be discarded and the election tracker will advance.')) {
                return;
            }

            try {
                acceptBtn.disabled = true;
                rejectBtn.disabled = true;
                acceptBtn.textContent = 'Processing...';
                await acceptVeto(gameId);
            } catch (error) {
                console.error('Failed to accept veto:', error);
                alert('Failed to accept veto: ' + error.message);
                acceptBtn.disabled = false;
                rejectBtn.disabled = false;
                acceptBtn.textContent = '✅ Accept Veto';
            }
        });

        rejectBtn.addEventListener('click', async function() {
            if (!confirm('Reject the veto? The Chancellor will be forced to enact one of the two policies.')) {
                return;
            }

            try {
                acceptBtn.disabled = true;
                rejectBtn.disabled = true;
                rejectBtn.textContent = 'Processing...';
                await rejectVeto(gameId);
            } catch (error) {
                console.error('Failed to reject veto:', error);
                alert('Failed to reject veto: ' + error.message);
                acceptBtn.disabled = false;
                rejectBtn.disabled = false;
                rejectBtn.textContent = '❌ Reject Veto';
            }
        });

        vetoDecisionDiv.appendChild(acceptBtn);
        vetoDecisionDiv.appendChild(rejectBtn);
        actionsCenter.appendChild(vetoDecisionDiv);

    } else if (youId && youId === chancId) {
        setStatus(gameId, `Waiting for ${pres ? (pres.name || 'President') : 'President'} to respond to veto proposal...`);
    } else {
        setStatus(gameId, `${chanc ? (chanc.name || 'Chancellor') : 'Chancellor'} proposed veto. Waiting for ${pres ? (pres.name || 'President') : 'President'} to respond...`);
    }
}

// Track if we've already initiated advancement for this completed phase
let advancementInitiated = false;
let lastAdvancedCompletedTimestamp = null;

function renderPhaseCompleted(gameId, youId, game, players, actionsCenter) {
    // Clean up any remaining overlays when entering completed phase
    cleanupAllPolicyOverlays();

    const enactedPolicy = game.enactedPolicy;

    // Don't advance if there's a pending superpower
    if (game.pendingSuperpower) {
        setStatus(gameId, `${enactedPolicy === 'liberal' ? 'Liberal' : 'Fascist'} policy enacted! Waiting for President to use superpower...`);
        return;
    }

    if (enactedPolicy) {
        setStatus(gameId, `${enactedPolicy === 'liberal' ? 'Liberal' : 'Fascist'} policy enacted! Advancing to next turn...`);
    } else {
        setStatus(gameId, 'Policy phase completed. Advancing to next turn...');
    }

    // Check if we've already advanced for this specific completed phase
    // Use game's updatedAt timestamp as a unique identifier for this phase
    const currentPhaseTimestamp = game.updatedAt?.seconds || game.updatedAt;

    if (advancementInitiated && lastAdvancedCompletedTimestamp === currentPhaseTimestamp) {
        // Already advancing for this phase, don't call again
        return;
    }

    // Mark that we're advancing for this specific phase
    advancementInitiated = true;
    lastAdvancedCompletedTimestamp = currentPhaseTimestamp;

    // Auto-advance to next turn immediately
    const gameRef = doc(db, 'games', gameId);
    advanceToNextGovernment(gameId, gameRef)
        .then(() => {
            // Reset flag on success so we can advance again next time
            advancementInitiated = false;
        })
        .catch(error => {
            console.error('Auto-advancement failed:', error);
            setStatus(gameId, '❌ Failed to advance to next turn');
            // Reset flag on error so manual retry is possible
            advancementInitiated = false;
        });
}

// Chancellor choice overlay (matching president's overlay logic)
function showChancellorChoiceOverlay(game) {
    const presidentCards = game.presidentDrawnCards || [];
    console.log(`🎴 Chancellor receiving cards: [${presidentCards.join(', ')}]`);
    if (presidentCards.length !== 2) {
        console.error('Expected 2 president cards, got:', presidentCards.length);
        return;
    }

    // Build overlay similar to president's reveal overlay
    const overlayId = 'chancellor-choice-overlay';
    let overlay = document.getElementById(overlayId);
    if (overlay) {
        // If overlay already exists, remove it completely and create fresh
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    // Create new overlay
    overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.className = 'reveal-overlay';
    document.body.appendChild(overlay);

    // Add instruction banner
    const instr = document.createElement('div');
    instr.className = 'reveal-instruction';
    // Check if veto is enabled (5 fascist policies enacted)
    const vetoEnabled = (game.fascistPolicies >= 5);
    instr.textContent = vetoEnabled ? 'Click to flip, then enact one policy or propose veto' : 'Click to flip, then select one to enact';
    overlay.appendChild(instr);

    // Add a close (X) button to dismiss the overlay without changing state
    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    // Position in top-right; reuse overlay z-index context
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
        const ov = document.getElementById('chancellor-choice-overlay');
        if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    });
    overlay.appendChild(closeBtn);

    // Add actions
    const actions = document.createElement('div');
    actions.className = 'reveal-actions';

    // Check if veto is enabled (5 fascist policies enacted)
    const vetoEnabled = (game.fascistPolicies >= 5);

    const enactBtn = document.createElement('button');
    enactBtn.className = 'reveal-btn';
    enactBtn.textContent = 'Enact Selected Policy';
    enactBtn.disabled = true;
    actions.appendChild(enactBtn);

    // Add veto button if veto power is enabled
    let vetoBtn = null;
    if (vetoEnabled) {
        vetoBtn = document.createElement('button');
        vetoBtn.className = 'reveal-btn veto-btn';
        vetoBtn.textContent = '🚫 Propose Veto';
        vetoBtn.style.marginLeft = '12px';
        vetoBtn.style.background = 'var(--fascist-red, #9B2226)';
        vetoBtn.style.color = 'white';
        vetoBtn.title = 'Request to veto this agenda (President must agree)';
        actions.appendChild(vetoBtn);
    }

    overlay.appendChild(actions);

    const centerX = Math.round(window.innerWidth / 2);
    const centerY = Math.round(window.innerHeight / 2);
    // Responsive scale: reduce card size on narrow screens so overlays don't overwhelm UI
    const _vw = window.innerWidth || (document && document.documentElement && document.documentElement.clientWidth) || 0;
    let scale = 1.4;
    if (_vw <= 360) {
        scale = 1.0;
    } else if (_vw <= 640) {
        scale = 1.15;
    }

    const overlayCards = [];
    let cardsFlipped = false;

    // Create two cards starting face down
    presidentCards.forEach((policy, index) => {
        const clone = document.createElement('div');
        clone.className = 'reveal-card';
        clone.style.backgroundImage = 'url(../images/policy-back.png)'; // Start face down
        clone.style.cursor = 'pointer';
        clone.dataset.policy = policy; // Store policy for later

        // Fan the cards in an arc - left card rotated left, right card rotated right
        const rot = index === 0 ? -8 : 8; // Matching president's rotation
        const spacing = 120; // Horizontal spacing between cards

        const targetX = centerX + (index - 0.5) * spacing;
        const targetY = centerY;

        const finalLeft = Math.round(targetX - (92 * scale) / 2); // 92 is card width
        const finalTop = Math.round(targetY - (132 * scale) / 2); // 132 is card height

        clone.style.left = finalLeft + 'px';
        clone.style.top = finalTop + 'px';
        clone.style.transform = `scale(${scale}) rotate(${rot}deg)`;
        clone.style.transition = 'transform 300ms ease-out';
        clone.style.zIndex = '10'; // Set initial z-index

        overlay.appendChild(clone);
        overlayCards.push(clone);
    });

    // Function to flip all cards
    function flipAllCards() {
        if (cardsFlipped) return; // Already flipped
        cardsFlipped = true;

        overlayCards.forEach((clone, index) => {
            const policy = presidentCards[index];
            const rot = index === 0 ? -8 : 8;

            clone.style.transition = 'transform 300ms ease-out';
            clone.style.transform = `scale(${scale}) rotate(${rot}deg) rotateY(180deg)`;

            // Halfway through flip, change to front image
            setTimeout(() => {
                clone.style.backgroundImage = policy === 'liberal' ? 'url(../images/liberal.png)' : 'url(../images/fascist.png)';
                clone.classList.add(policy);
                clone.classList.add('flipped'); // Mark as flipped for CSS styling
            }, 150);

            // Complete the flip
            setTimeout(() => {
                clone.style.transform = `scale(${scale}) rotate(${rot}deg)`;
            }, 300);
        });
    }

    // Selection logic: click to toggle; enable enact when exactly 1 selected
    function updateEnactState() {
        const selected = overlayCards.filter(c => c.classList.contains('selected'));
        enactBtn.disabled = (selected.length !== 1);

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
        c.addEventListener('click', function() {
            // First click flips all cards
            if (!cardsFlipped) {
                flipAllCards();
                return;
            }

            // After cards are flipped, handle selection
            if (c.classList.contains('selected')) {
                c.classList.remove('selected');
            } else {
                // Limit to 1 selected
                const selected = overlayCards.filter(cc => cc.classList.contains('selected'));
                if (selected.length >= 1) {
                    // Deselect all others
                    overlayCards.forEach(cc => cc.classList.remove('selected'));
                }
                c.classList.add('selected');
            }
            updateEnactState();
        });
    });
    updateEnactState();

    // Handle enact button click
    enactBtn.addEventListener('click', async function() {
        const selected = overlayCards.find(c => c.classList.contains('selected'));
        if (!selected) return;

        const selectedIndex = overlayCards.indexOf(selected);
        const enactedPolicy = presidentCards[selectedIndex];
        const discardedPolicy = presidentCards[1 - selectedIndex];

        try {
            await enactPolicyAsChancellor(enactedPolicy, discardedPolicy);

            // Close the overlay
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }

        } catch (error) {
            console.error('Failed to enact policy:', error);
            alert('Failed to enact policy. Please try again. Error: ' + error.message);
        }
    });

    // Handle veto button click
    if (vetoBtn) {
        vetoBtn.addEventListener('click', async function() {
            if (!confirm('Propose to veto this agenda? The President must agree for the veto to succeed.')) {
                return;
            }

            try {
                await proposeVeto();

                // Close the overlay
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }

            } catch (error) {
                console.error('Failed to propose veto:', error);
                alert('Failed to propose veto. Please try again. Error: ' + error.message);
            }
        });
    }
}

// Clean up all policy-related overlays
// Optional parameter: phases where overlays should be preserved
function cleanupAllPolicyOverlays(preserveInPhases = []) {
    const currentPhase = latestGame ? computePhase(latestGame) : null;
    const shouldPreserve = preserveInPhases.includes(currentPhase);

    // Don't clean up chancellor overlay if we're in chancellor_choice phase and should preserve
    const chancellorOverlay = document.getElementById('chancellor-choice-overlay');
    if (chancellorOverlay && chancellorOverlay.parentNode) {
        if (!shouldPreserve || currentPhase !== 'chancellor_choice') {
            chancellorOverlay.parentNode.removeChild(chancellorOverlay);
        }
    }

    // Don't clean up president overlay if we're in president_draw phase and should preserve
    const presidentOverlay = document.getElementById('reveal-overlay');
    if (presidentOverlay && presidentOverlay.parentNode) {
        if (!shouldPreserve || currentPhase !== 'president_draw') {
            presidentOverlay.parentNode.removeChild(presidentOverlay);
        }
    }

    // Clean up spread tooltips (these can always be cleaned as they're just hints)
    const spreadTooltip = document.getElementById('spread-tooltip');
    if (spreadTooltip && spreadTooltip.parentNode) {
        spreadTooltip.parentNode.removeChild(spreadTooltip);
    }

    // Only reset spread state if we're not preserving president_draw phase
    if (!shouldPreserve || currentPhase !== 'president_draw') {
        spreadPDRevealed = 0;
        spreadPDAssigned = null;
        spreadFanShown = false;
        spreadPDListeners = false;
    }
}

// Clean up chancellor choice overlay (kept for backward compatibility)
function cleanupChancellorChoiceOverlay() {
    const overlay = document.getElementById('chancellor-choice-overlay');
    if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
    }
}

// President draw interactions on table-spread (local-only visuals)
let spreadPDListeners = false;
let spreadPDRevealed = 0;
let spreadPDAssigned = null;
let spreadFanShown = false;
let drawnCards = null;

// Get the actual policy cards from the game state using the deck order
function getActualTopThreePolicies() {
    if (drawnCards) return drawnCards;

    const game = latestGame;
    if (!game) {
        console.warn('No game loaded yet, using placeholder policies');
        return ['liberal', 'liberal', 'fascist'];
    }

    // Use the policy deck order from the game state
    const policyDeckOrder = game.policyDeckOrder || [];
    const deckPosition = game.deckPosition || 0;

    // Check if we have enough cards in the deck
    if (!policyDeckOrder || policyDeckOrder.length === 0) {
        console.error('No policy deck order found in game state');
        return ['liberal', 'liberal', 'fascist']; // Fallback
    }

    // Check if we need to reshuffle (not enough cards left)
    if (deckPosition + 3 > policyDeckOrder.length) {
        console.warn('Not enough cards in deck, need to reshuffle');
        // Return placeholder - the reshuffle should happen before drawing
        return ['liberal', 'liberal', 'fascist'];
    }

    // Draw the next 3 cards from the deck
    const policies = policyDeckOrder.slice(deckPosition, deckPosition + 3);

    if (policies.length !== 3) {
        console.error('Failed to draw 3 cards from deck');
        return ['liberal', 'liberal', 'fascist']; // Fallback
    }

    console.log(`🎴 President drawing cards from deck: position ${deckPosition}, cards: [${policies.join(', ')}]`);

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
    topThree.forEach(c => { c.classList.remove('glow', 'lifting', 'is-front', 'liberal', 'fascist'); c.style.transform = ''; c.style.opacity = ''; c.style.pointerEvents = ''; });
    // remove listeners by cloning nodes
    topThree.forEach((card) => { const clone = card.cloneNode(true); card.parentNode.replaceChild(clone, card); });
    spreadPDListeners = false;
    spreadPDRevealed = 0;
    spreadPDAssigned = null;
    spreadFanShown = false;
    drawnCards = null; // CRITICAL: Reset the cache so next draw gets fresh cards from deck
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
    let topThree = cards.slice(-3);

    // Remove all old event listeners by cloning nodes BEFORE adding new ones
    topThree = topThree.map(card => {
        const clone = card.cloneNode(true);
        if (card.parentNode) {
            card.parentNode.replaceChild(clone, card);
        }
        return clone;
    });

    // Clear any existing state
    topThree.forEach(c => {
        c.classList.remove('glow', 'lifting', 'is-front', 'liberal', 'fascist');
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
    // Reset the listeners flag since we've cleaned up old listeners
    spreadPDListeners = false;
    spreadPDListeners = true;
    // Group drag state so all three follow the finger together
    let groupDragging = false;
    let startX = 0, startY = 0;
    let moved = false; let tapStart = 0;
    
    // Define revealAllToCenterFan function with access to gameId
    const revealAllToCenterFan = () => {
        // Debug logging
        
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
                c.classList.remove('lifting', 'is-front', 'liberal', 'fascist'); 
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
        const orderMap = [0, 1, 2]; // Display cards in deck order: left, center, right
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
              clone.style.backgroundImage = 'url(../images/policy-back.png)'; // Start face down
              clone.style.transition = 'transform 240ms ease-out, left 240ms ease-out, top 240ms ease-out';

              // CRITICAL: Store the actual policy type as a data attribute so we don't lose track
              clone.dataset.policyType = policy;

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
                          clone.style.backgroundImage = policy === 'liberal' ? 'url(../images/liberal.png)' : 'url(../images/fascist.png)';
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
            
            // Validate gameId is available
            if (!gameId) {
                console.error('gameId is undefined in send button click handler');
                alert('Game session error. Please refresh the page and try again.');
                return;
            }
            
            const selected = overlayCards.filter(c => c.classList.contains('selected'));
            
            if (selected.length !== 2) {
                return;
            }
            
            // Get the selected card policies using the data attribute (reliable source of truth)
            const selectedPolicies = selected.map(card => {
                return card.dataset.policyType || 'liberal'; // fallback
            });


            // Get the discarded policy (the one not selected)
            const discardedPolicy = overlayCards.find(card => !card.classList.contains('selected'));
            const discardedPolicyType = discardedPolicy ?
                (discardedPolicy.dataset.policyType || 'liberal') : 'liberal';

            console.log(`🎯 President sending to Chancellor: [${selectedPolicies.join(', ')}], discarded: ${discardedPolicyType}`);

            try {
                // Update game state to remove the top 3 cards and move to chancellor phase
                await updateGameStateAfterPresidentDraw(selectedPolicies, discardedPolicyType);
                
                
                // Close the overlay and clean up
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                
                // Clean up the spread state and remove glow from cards
                spreadFanShown = false;
                topThree.forEach(c => { 
                    c.classList.remove('lifting', 'is-front', 'liberal', 'fascist'); 
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
    // Clone the button to remove old event listeners
    const viewCardsBtn = document.getElementById('view-cards-btn');
    if (viewCardsBtn) {
        const newViewCardsBtn = viewCardsBtn.cloneNode(true);
        viewCardsBtn.parentNode?.replaceChild(newViewCardsBtn, viewCardsBtn);

        newViewCardsBtn.addEventListener('click', function() {
            // Hide the button
            newViewCardsBtn.style.display = 'none';

            // Show the overlay again
            revealAllToCenterFan();
        });
    }
}

// Helper function to update game state after president draws cards
async function updateGameStateAfterPresidentDraw(selectedPolicies, discardedPolicy) {
    const gameId = getGameId();
    
    if (!gameId) {
        throw new Error('Game ID not found');
    }
    
    if (!latestGame) {
        throw new Error('Game data not loaded yet');
    }
    
    
    try {
        // Update the game document to reflect that cards have been drawn
        const gameRef = doc(db, 'games', gameId);

        // Increment deck position by 3 (we drew 3 cards)
        const currentDeckPosition = latestGame.deckPosition || 0;
        const newDeckPosition = currentDeckPosition + 3;

        // Track discarded deck positions for the deck viewer
        const discardedDeckPositions = latestGame.discardedDeckPositions || [];

        // The president discarded 1 of the 3 drawn cards
        // We need to figure out which index it was
        const drawnPolicies = getActualTopThreePolicies();
        console.log(`📋 Drawn policies: [${drawnPolicies.join(', ')}], Selected: [${selectedPolicies.join(', ')}], Discarded: ${discardedPolicy}`);

        // Create a mapping of deck indices to the 3 drawn cards
        const drawnDeckIndices = [currentDeckPosition, currentDeckPosition + 1, currentDeckPosition + 2];

        // Find which index was discarded (the one NOT in selectedPolicies)
        const selectedCopy = [...selectedPolicies]; // Make a copy so we don't modify the original
        let presidentDiscardedIndex = -1;

        for (let i = 0; i < 3; i++) {
            const deckIndex = drawnDeckIndices[i];
            const policyAtIndex = drawnPolicies[i];

            // Check if this card is in the selected list
            const selectedIdx = selectedCopy.indexOf(policyAtIndex);
            if (selectedIdx !== -1) {
                // This card was selected, remove it from the copy so we don't match it again
                selectedCopy.splice(selectedIdx, 1);
            } else {
                // This card was NOT selected, so it's the discarded one
                discardedDeckPositions.push(deckIndex);
                presidentDiscardedIndex = i;
                console.log(`🗑️ President discarded card at deck position ${deckIndex} (${policyAtIndex})`);
                break;
            }
        }

        // Store the deck indices of the cards sent to chancellor (for later when chancellor discards)
        const chancellorCardIndices = drawnDeckIndices.filter((_, i) => i !== presidentDiscardedIndex);

        const updateData = {
            policyPhase: 'chancellor_choice',
            presidentDrawnCards: selectedPolicies,
            presidentDiscardedCard: discardedPolicy,
            chancellorCardIndices: chancellorCardIndices, // Store which deck indices chancellor has
            deckPosition: newDeckPosition,
            discardedDeckPositions: discardedDeckPositions,
            updatedAt: serverTimestamp()
        };


        await updateDoc(gameRef, updateData);

        // Log the action (don't reveal which policy was discarded)
        const presidentPlayer = latestPlayers.find(p => p.id === latestGame.currentPresidentPlayerId);
        const presidentName = presidentPlayer ? presidentPlayer.name : 'President';
        await logPublic(gameId, `${presidentName} drew 3 policy cards and discarded 1`, {
            type: 'policy_draw',
            actorId: latestGame.currentPresidentPlayerId
        });

        // Log the discarded policy privately to the President only
        await logPrivate(gameId, `You discarded a ${discardedPolicy} policy`, [latestGame.currentPresidentPlayerId], {
            type: 'policy_draw_detail',
            actorId: latestGame.currentPresidentPlayerId,
            discardedPolicy: discardedPolicy
        });

    } catch (error) {
        console.error('Error updating game state:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        throw error;
    }
}

// Helper function to update the visual table spread and deck after cards are drawn
function updateDeckVisualAfterDraw() {
    const spread = document.querySelector('.table-spread');
    if (!spread) return;
    
    const cards = Array.from(spread.querySelectorAll('.table-card'));
    if (cards.length < 3) return;
    
    // Remove the top 3 cards from the visual spread
    const topThree = cards.slice(-3);
    topThree.forEach(card => {
        if (card.parentNode) {
            card.parentNode.removeChild(card);
        }
    });
    
    // Add the discarded card to the discard pile
    addDiscardedCardToPile();
}



// Helper function to add discarded card to discard pile
function addDiscardedCardToPile() {
    
    // Use our dynamic discard pile module to increment the count
    incrementDiscardCount();

}

// Helper function for chancellor to propose a veto
async function proposeVeto() {
    const gameId = getGameId();
    if (!gameId || !latestGame) {
        throw new Error('Game not found');
    }

    const gameRef = doc(db, 'games', gameId);
    const presidentCards = latestGame.presidentDrawnCards || [];

    console.log('🚫 Chancellor proposing veto');

    // Update game state to indicate veto is proposed
    await updateDoc(gameRef, {
        policyPhase: 'veto_proposed',
        vetoProposed: {
            chancellorId: latestGame.currentChancellorPlayerId,
            presidentId: latestGame.currentPresidentPlayerId,
            cards: presidentCards, // Store the 2 cards that would be vetoed
            proposedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
    });

    // Log the veto proposal
    await logPublic(gameId, 'Chancellor proposes to veto the agenda', {
        type: 'veto_proposed',
        chancellorId: latestGame.currentChancellorPlayerId
    });

    setStatus(gameId, 'Chancellor proposes veto. Waiting for President\'s response...');
}

// Helper function for president to accept a veto
async function acceptVeto(gameId) {
    if (!latestGame) {
        throw new Error('Game not found');
    }

    const gameRef = doc(db, 'games', gameId);
    console.log('✅ President accepting veto');

    // Discard both policies and advance election tracker
    await updateDoc(gameRef, {
        policyPhase: null,
        presidentDrawnCards: [],
        vetoProposed: null,
        electionTracker: increment(1),
        // Clear current government
        currentChancellorPlayerId: null,
        nominatedChancellorPlayerId: null,
        voteResolution: null,
        electionVotes: {},
        // Set term limits
        termLimitLastChancellorId: latestGame.currentChancellorPlayerId,
        termLimitLastPresidentId: latestGame.currentPresidentPlayerId,
        updatedAt: serverTimestamp()
    });

    // Log the veto acceptance
    await logPublic(gameId, '🚫 Veto accepted! Both policies discarded. Election tracker advances.', {
        type: 'veto_accepted',
        presidentId: latestGame.currentPresidentPlayerId,
        chancellorId: latestGame.currentChancellorPlayerId
    });

    // Increment discard count by 2 (both policies discarded)
    incrementDiscardCount();
    incrementDiscardCount();

    setStatus(gameId, 'Veto accepted. Advancing to next government...');

    // Check if election tracker reached 3 (chaos policy)
    const newElectionTracker = (latestGame.electionTracker || 0) + 1;
    if (newElectionTracker >= 3) {
        // Three failed elections (including this veto) - enact chaos policy
        await logPublic(gameId, `⚠️ Election tracker: 3/3 failed elections. Enacting chaos policy!`, { type: 'system' });
        await enactChaosPolicy(gameId, gameRef);
        return;
    }

    // Log warning if tracker is at 2
    if (newElectionTracker === 2) {
        await logPublic(gameId, '⚠️ Warning: One more failed election will enact a random policy!', { type: 'warning' });
    }

    // Advance to next government
    setTimeout(async () => {
        try {
            await advanceToNextGovernment(gameId, gameRef);
        } catch (error) {
            console.error('Failed to advance after veto:', error);
        }
    }, 1500);
}

// Helper function for president to reject a veto
async function rejectVeto(gameId) {
    if (!latestGame) {
        throw new Error('Game not found');
    }

    const gameRef = doc(db, 'games', gameId);
    console.log('❌ President rejecting veto');

    // Return to chancellor_choice phase, forcing chancellor to enact a policy
    await updateDoc(gameRef, {
        policyPhase: 'chancellor_choice',
        vetoProposed: null,
        updatedAt: serverTimestamp()
    });

    // Log the veto rejection
    await logPublic(gameId, '❌ Veto rejected! Chancellor must enact a policy.', {
        type: 'veto_rejected',
        presidentId: latestGame.currentPresidentPlayerId,
        chancellorId: latestGame.currentChancellorPlayerId
    });

    setStatus(gameId, 'Veto rejected. Chancellor must choose a policy to enact.');
}

// Helper function for chancellor to enact a policy
async function enactPolicyAsChancellor(enactedPolicy, discardedPolicy) {
    const gameId = getGameId();
    if (!gameId || !latestGame) {
        throw new Error('Game not found');
    }

    // Capture the fascist count BEFORE any database updates
    // This prevents race conditions with the onSnapshot listener
    const previousFascistCount = latestGame.fascistPolicies || 0;
    console.log(`🔍 Captured previousFascistCount BEFORE update: ${previousFascistCount}`);

    try {
        // Track which deck position the chancellor discarded
        const discardedDeckPositions = latestGame.discardedDeckPositions || [];

        // The chancellor received 2 cards from the president, and we stored their deck indices
        const chancellorCardIndices = latestGame.chancellorCardIndices || [];
        const presidentCards = latestGame.presidentDrawnCards || [];

        console.log(`🎴 Chancellor has cards at indices: [${chancellorCardIndices.join(', ')}], policies: [${presidentCards.join(', ')}]`);

        // Find which of the 2 chancellor cards was discarded
        for (let i = 0; i < presidentCards.length; i++) {
            if (presidentCards[i] === discardedPolicy) {
                const deckIndex = chancellorCardIndices[i];
                discardedDeckPositions.push(deckIndex);
                console.log(`🗑️ Chancellor discarded card at deck position ${deckIndex} (${discardedPolicy})`);
                break;
            }
        }

        // Calculate the new fascist count to check for superpowers
        // Use previousFascistCount (captured at start) to avoid race conditions
        const newFascistCount = previousFascistCount + (enactedPolicy === 'fascist' ? 1 : 0);
        const playerCount = latestGame.playerCount || (latestPlayers || []).length;
        const superpower = (enactedPolicy === 'fascist') ? getSuperpowerForSlot(newFascistCount, playerCount) : null;

        // Debug logging to verify superpower triggering
        if (enactedPolicy === 'fascist') {
            console.log(`🔍 SUPERPOWER CHECK: previousCount=${previousFascistCount}, newCount=${newFascistCount}, playerCount=${playerCount}, superpower=${superpower ? superpower.name : 'none'}`);
        }

        // Capture the current President ID BEFORE any updates to prevent race conditions
        const currentPresidentId = latestGame.currentPresidentPlayerId;

        // Update the game document to reflect the enacted policy
        const gameRef = doc(db, 'games', gameId);
        const updates = {
            policyPhase: 'completed',
            enactedPolicy: enactedPolicy,
            chancellorDiscardedCard: discardedPolicy,
            discardedDeckPositions: discardedDeckPositions,
            updatedAt: serverTimestamp()
        };

        // If there's a superpower, set pendingSuperpower in the same update
        // This prevents race conditions where renderPhaseCompleted might advance the presidency
        if (superpower) {
            updates.pendingSuperpower = {
                type: superpower.type,
                name: superpower.name,
                description: superpower.description,
                slot: newFascistCount,
                presidentId: currentPresidentId,
                activatedAt: serverTimestamp()
            };
        }

        // Increment the appropriate policy counter
        if (enactedPolicy === 'liberal') {
            updates.liberalPolicies = increment(1);
        } else if (enactedPolicy === 'fascist') {
            updates.fascistPolicies = increment(1);
        }

        await updateDoc(gameRef, updates);

        // Log the action with Chancellor's name
        const chancellorPlayer = latestPlayers.find(p => p.id === latestGame.currentChancellorPlayerId);
        const chancellorName = chancellorPlayer ? chancellorPlayer.name : 'Chancellor';
        await logPublic(gameId, `${chancellorName} enacted a ${enactedPolicy} policy`, {
            type: 'policy_enact',
            actorId: latestGame.currentChancellorPlayerId,
            enactedPolicy: enactedPolicy,
            discardedPolicy: discardedPolicy
        });
        
        // Increment discard pile count for chancellor's discarded card
        incrementDiscardCount();
        
        // Update table spread count after policy enactment
        const newTableSpreadCount = calculateTableSpreadCountFromGameState({
            ...latestGame,
            liberalPolicies: (latestGame.liberalPolicies || 0) + (enactedPolicy === 'liberal' ? 1 : 0),
            fascistPolicies: (latestGame.fascistPolicies || 0) + (enactedPolicy === 'fascist' ? 1 : 0)
        });
        setTableSpreadCount(newTableSpreadCount);
        
        
        // Check if this triggers executive powers
        const newLiberalCount = (latestGame.liberalPolicies || 0) + (enactedPolicy === 'liberal' ? 1 : 0);
        // newFascistCount already calculated above before the database update

        console.log(`📊 Policy enacted: ${enactedPolicy}, New fascist count: ${newFascistCount}, Previous count (captured): ${previousFascistCount}`);

        // Check for policy win conditions
        if (newLiberalCount >= 5) {
            // Liberals win by enacting 5 policies
            await updateDoc(gameRef, {
                gamePhase: 'ended',
                winner: 'liberal',
                winCondition: 'policy',
                endedAt: serverTimestamp()
            });
            await logPublic(gameId, `🟦 Liberals enacted 5 policies! Liberals win!`, {
                type: 'game_end',
                winner: 'liberal',
                winCondition: 'policy'
            });
            setStatus(gameId, '🟦 5 Liberal policies enacted! Liberals win the game!');
            return; // Stop here, don't advance to next government
        } else if (newFascistCount >= 6) {
            // Fascists win by enacting 6 policies
            await updateDoc(gameRef, {
                gamePhase: 'ended',
                winner: 'fascist',
                winCondition: 'policy',
                endedAt: serverTimestamp()
            });
            await logPublic(gameId, `🟥 Fascists enacted 6 policies! Fascists win!`, {
                type: 'game_end',
                winner: 'fascist',
                winCondition: 'policy'
            });
            setStatus(gameId, '🟥 6 Fascist policies enacted! Fascists win the game!');
            return; // Stop here, don't advance to next government
        }

        // Check if veto power was just unlocked
        if (newFascistCount === 5 && previousFascistCount < 5) {
            await logPublic(gameId, `🚫 Veto Power Unlocked! The Chancellor may now propose to veto policies (President must agree).`, {
                type: 'veto_unlocked',
                fascistPolicies: newFascistCount
            });
        }

        // Only log and show UI if a superpower was set (already set in database above)
        if (superpower) {
            // Log the superpower activation
            await logPublic(gameId, `${superpower.name} activated! President must use this power.`, {
                type: 'superpower_activated',
                superpower: superpower.name,
                fascistPolicies: newFascistCount,
                playerCount: playerCount
            });

            // Show the superpower modal (pendingSuperpower already set in database above)
            showSuperpowerModal(superpower, newFascistCount);
        }
        
        // Clean up all overlays immediately after policy enactment
        cleanupAllPolicyOverlays();
        
        // Wait a moment for the first update to complete, then advance to next government
        setTimeout(async () => {
            try {
                await advanceToNextGovernment(gameId, gameRef);
            } catch (advanceError) {
                console.error('Failed to advance to next government:', advanceError);
                // Apply fallback cleanup to prevent getting stuck
                await applyFallbackCleanup(gameId, gameRef);
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error enacting policy:', error);
        throw error;
    }
}

// Function to enact chaos policy (when 3 elections fail)
async function enactChaosPolicy(gameId, gameRef) {
    try {
        // Calculate remaining cards in deck
        const liberalTotal = 6;
        const fascistTotal = 11;
        const liberalEnacted = latestGame?.liberalPolicies || 0;
        const fascistEnacted = latestGame?.fascistPolicies || 0;
        const totalDiscarded = latestGame?.totalDiscardedCards || 0;

        // Calculate remaining cards of each type
        const remainingLiberal = Math.max(0, liberalTotal - liberalEnacted);
        const remainingFascist = Math.max(0, fascistTotal - fascistEnacted);
        const totalRemaining = remainingLiberal + remainingFascist - totalDiscarded;

        // Randomly select a policy weighted by remaining cards
        const liberalRatio = totalRemaining > 0 ? remainingLiberal / (remainingLiberal + remainingFascist) : 0.35;
        const chaosPolicy = Math.random() < liberalRatio ? 'liberal' : 'fascist';

        // Update game state
        const updates = {
            electionTracker: 0, // Reset tracker after chaos
            updatedAt: serverTimestamp()
        };

        // Increment the appropriate policy counter
        if (chaosPolicy === 'liberal') {
            updates.liberalPolicies = increment(1);
        } else {
            updates.fascistPolicies = increment(1);
        }

        await updateDoc(gameRef, updates);

        // Log the chaos policy enactment
        await logPublic(gameId, `🎲 Chaos! A ${chaosPolicy} policy was enacted from the top of the deck`, {
            type: 'chaos_policy',
            enactedPolicy: chaosPolicy
        });

        // Update table spread count
        const newLiberalCount = (latestGame.liberalPolicies || 0) + (chaosPolicy === 'liberal' ? 1 : 0);
        const newFascistCount = (latestGame.fascistPolicies || 0) + (chaosPolicy === 'fascist' ? 1 : 0);
        const newTableSpreadCount = calculateTableSpreadCountFromGameState({
            ...latestGame,
            liberalPolicies: newLiberalCount,
            fascistPolicies: newFascistCount
        });
        setTableSpreadCount(newTableSpreadCount);

        // Check for policy win conditions after chaos policy
        if (newLiberalCount >= 5) {
            await updateDoc(gameRef, {
                gamePhase: 'ended',
                winner: 'liberal',
                winCondition: 'policy',
                endedAt: serverTimestamp()
            });
            await logPublic(gameId, `🟦 Liberals enacted 5 policies! Liberals win!`, {
                type: 'game_end',
                winner: 'liberal',
                winCondition: 'policy'
            });
            setStatus(gameId, '🟦 5 Liberal policies enacted! Liberals win the game!');
            return; // Stop here, don't advance
        } else if (newFascistCount >= 6) {
            await updateDoc(gameRef, {
                gamePhase: 'ended',
                winner: 'fascist',
                winCondition: 'policy',
                endedAt: serverTimestamp()
            });
            await logPublic(gameId, `🟥 Fascists enacted 6 policies! Fascists win!`, {
                type: 'game_end',
                winner: 'fascist',
                winCondition: 'policy'
            });
            setStatus(gameId, '🟥 6 Fascist policies enacted! Fascists win the game!');
            return; // Stop here, don't advance
        }

        // Note: Chaos policies do NOT trigger executive powers per game rules

        // Wait a moment, then advance to next government
        setTimeout(async () => {
            try {
                await advanceToNextGovernment(gameId, gameRef);
            } catch (advanceError) {
                console.error('Failed to advance after chaos policy:', advanceError);
                await applyFallbackCleanup(gameId, gameRef);
            }
        }, 1500);

    } catch (error) {
        console.error('Error enacting chaos policy:', error);
        throw error;
    }
}

// Separate function to advance to next government
async function advanceToNextGovernment(gameId, gameRef) {

    // Get fresh game state
    const gameSnap = await getDoc(gameRef);
    if (!gameSnap.exists()) {
        throw new Error('Game no longer exists');
    }
    const currentGame = gameSnap.data();

    // Don't advance if there's a pending superpower
    if (currentGame.pendingSuperpower) {
        console.log('Skipping advancement - pending superpower exists');
        return;
    }

    // Check if we're still in completed phase OR if this is a failed election - if not, someone else already advanced
    const isCompletedPhase = currentGame.policyPhase === 'completed';
    const isFailedElection = currentGame.voteResolution && !currentGame.voteResolution.passed;

    if (!isCompletedPhase && !isFailedElection) {
        console.log('Skipping advancement - already advanced (not in completed phase or failed election)');
        return;
    }
    
    const prevChancellorId = currentGame.currentChancellorPlayerId || null;
    const prevPresidentId = currentGame.currentPresidentPlayerId || null;
    
    
    // Get alive players and sort by orderIndex
    const orderedAlive = (latestPlayers || [])
        .filter(p => p && p.alive !== false)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    
    if (orderedAlive.length === 0) {
        console.error('No alive players found!');
        throw new Error('No alive players found');
    }
    
    // Find current president index
    const currentPresidentId = currentGame.currentPresidentPlayerId;
    const currentIndex = orderedAlive.findIndex(p => p.id === currentPresidentId);


    if (currentIndex === -1) {
        console.error('Current president not found in alive players!');
        // Fallback: use the first player as next president
        const nextPresident = orderedAlive[0];

        const fallbackUpdates = {
            // Clear out policy phase artifacts
            policyPhase: null,
            enactedPolicy: null,
            presidentDrawnCards: [],
            presidentDiscardedCard: null,
            chancellorDiscardedCard: null,
            // Clear current chancellor and nomination
            currentChancellorPlayerId: null,
            nominatedChancellorPlayerId: null,
            // Reset vote state
            voteResolution: null,
            electionVotes: {},
            // Set term limits
            termLimitLastChancellorId: prevChancellorId,
            termLimitLastPresidentId: prevPresidentId,
            // Set next president
            presidentIndex: 0,
            currentPresidentPlayerId: nextPresident.id,
            updatedAt: serverTimestamp()
        };

        await updateDoc(gameRef, fallbackUpdates);

        // Clean up any remaining overlays after fallback advancement
        cleanupAllPolicyOverlays();

        // Announce rotation
        await logPublic(
            gameId,
            `Next President: ${nextPresident.name || 'Player'}. President, please nominate a Chancellor.`,
            { type: 'rotation', actorId: nextPresident.id }
        );

        return;
    }

    // Check if we're ending a special election round or starting one
    let nextPresident;
    let nextIndex;

    if (currentGame.isSpecialElection && currentGame.savedPresidentIndex !== undefined) {
        // We just finished a special election round, restore normal rotation
        console.log('🔄 Ending special election, restoring normal rotation from saved index:', currentGame.savedPresidentIndex);

        // Resume from the saved index (which was the president who triggered the special election)
        // Move to the NEXT president in the normal rotation
        nextIndex = (currentGame.savedPresidentIndex + 1) % orderedAlive.length;
        nextPresident = orderedAlive[nextIndex];

    } else if (currentGame.specialElectionCandidate) {
        // Starting a special election - use the chosen candidate as next president
        console.log('🗳️ Starting special election with candidate:', currentGame.specialElectionCandidate);

        nextPresident = orderedAlive.find(p => p.id === currentGame.specialElectionCandidate);

        if (!nextPresident) {
            console.error('Special election candidate not found in alive players!');
            // Fallback to normal rotation
            nextIndex = (currentIndex + 1) % orderedAlive.length;
            nextPresident = orderedAlive[nextIndex];
        } else {
            // Find the index of the special election president
            nextIndex = orderedAlive.findIndex(p => p.id === currentGame.specialElectionCandidate);
        }

    } else {
        // Normal rotation - calculate next president index
        nextIndex = (currentIndex + 1) % orderedAlive.length;
        nextPresident = orderedAlive[nextIndex];
    }
    
    
    if (!nextPresident) {
        console.error('Next president calculation failed!');
        throw new Error('Failed to calculate next president');
    }

    const advanceUpdates = {
        // Clear out policy phase artifacts so UI returns to nomination
        policyPhase: null,
        enactedPolicy: null,
        presidentDrawnCards: [],
        // DON'T clear discarded card fields - they represent permanent game state
        // presidentDiscardedCard: null,        // Keep this for discard pile tracking
        // chancellorDiscardedCard: null,       // Keep this for discard pile tracking
        // Clear current chancellor and nomination
        currentChancellorPlayerId: null,
        nominatedChancellorPlayerId: null,
        // Reset vote state so computePhase() returns 'nomination'
        voteResolution: null,
        electionVotes: {},
        // Set term limits for next turn eligibility
        termLimitLastChancellorId: prevChancellorId,
        termLimitLastPresidentId: prevPresidentId,
        // Rotate president
        presidentIndex: nextIndex,
        currentPresidentPlayerId: nextPresident.id,
        updatedAt: serverTimestamp()
    };

    // Handle special election state transitions
    if (currentGame.isSpecialElection && currentGame.savedPresidentIndex !== undefined) {
        // We just finished a special election round - clear all special election flags
        advanceUpdates.isSpecialElection = false;
        advanceUpdates.specialElectionCandidate = null;
        advanceUpdates.savedPresidentIndex = null;
        console.log('🔄 Cleared special election flags, returning to normal rotation');

    } else if (currentGame.specialElectionCandidate) {
        // We're starting a special election round - set the flag
        advanceUpdates.isSpecialElection = true;
        advanceUpdates.specialElectionCandidate = null; // Clear this after using it
        console.log('🗳️ Started special election round');
    }

    await updateDoc(gameRef, advanceUpdates);

    // Clean up any remaining overlays and reset card cache after advancing
    cleanupAllPolicyOverlays();
    teardownSpreadPresidentDrawUI(); // Reset drawnCards cache for next president

    // Announce rotation and prompt nomination
    try {
        await logPublic(
            gameId,
            `Next President: ${nextPresident.name || 'Player'}. President, please nominate a Chancellor.`,
            { type: 'rotation', actorId: nextPresident.id }
        );
    } catch (e) {
        console.error('Failed to log rotation message:', e);
    }
}

// Fallback cleanup function to prevent getting stuck
async function applyFallbackCleanup(gameId, gameRef) {
    try {
        const fallbackUpdates = {
            policyPhase: null,
            enactedPolicy: null,
            presidentDrawnCards: [],
            // Preserve discarded card information to maintain discard pile
            // presidentDiscardedCard: null,        // Keep this
            // chancellorDiscardedCard: null,       // Keep this
            currentChancellorPlayerId: null,
            nominatedChancellorPlayerId: null,
            voteResolution: null,
            electionVotes: {},
            updatedAt: serverTimestamp()
        };
        
        await updateDoc(gameRef, fallbackUpdates);
        
        // Clean up any remaining overlays after fallback cleanup
        cleanupAllPolicyOverlays();
        
        // Log the cleanup
        await logPublic(gameId, 'Game state reset due to advancement failure. Please restart the game phase.', {
            type: 'system_error'
        });
        
    } catch (cleanupError) {
        console.error('Failed to apply fallback cleanup:', cleanupError);
    }
}

function renderActions(gameId) {
    const actionsCenter = document.querySelector('.actions-center');
    if (!actionsCenter) return;

    // Preserve vote popover state before clearing
    const votePopover = document.getElementById('vote-popover');
    const wasPopoverOpen = votePopover && votePopover.style.display === 'block';

    actionsCenter.innerHTML = '';

    const youId = computeYouId(gameId);
    const game = latestGame;
    const players = latestPlayers || [];
    if (!game || !players.length) return;

    if (localPaused) {
        const pausedMsg = document.createElement('div');
        pausedMsg.className = 'status-text';
        pausedMsg.textContent = 'Paused (AFK). Open Menu to resume.';
        actionsCenter.appendChild(pausedMsg);
        return;
    }

    if (game.state !== 'playing') return;

    const phase = computePhase(game);

    // Only log when phase or policy phase changes
    if (lastLoggedState.renderActionsPhase !== phase || lastLoggedState.renderActionsPolicyPhase !== game.policyPhase) {
        console.log('Rendering actions for phase:', phase, 'Game state:', {
            policyPhase: game.policyPhase,
            enactedPolicy: game.enactedPolicy,
            currentPresident: game.currentPresidentPlayerId,
            currentChancellor: game.currentChancellorPlayerId,
            voteResolution: game.voteResolution
        });
        lastLoggedState.renderActionsPhase = phase;
        lastLoggedState.renderActionsPolicyPhase = game.policyPhase;
    }
    
    if (phase === 'nomination') {
        // Clean up any lingering overlays when entering nomination phase
        cleanupAllPolicyOverlays();
        return renderPhaseNomination(gameId, youId, game, players, actionsCenter);
    }
    if (phase === 'voting') {
        renderPhaseVoting(gameId, youId, game, players, actionsCenter);
        // Restore vote popover state if it was open before re-render
        if (wasPopoverOpen) {
            const newPopover = document.getElementById('vote-popover');
            if (newPopover) {
                newPopover.style.display = 'block';
            }
        }
        return;
    }
    if (phase === 'president_draw') return renderPhasePresidentDraw(gameId, youId, game, players, actionsCenter);
    if (phase === 'chancellor_choice') return renderPhaseChancellorChoice(gameId, youId, game, players, actionsCenter);
    if (phase === 'veto_proposed') return renderPhaseVetoProposed(gameId, youId, game, players, actionsCenter);
    if (phase === 'completed') return renderPhaseCompleted(gameId, youId, game, players, actionsCenter);
    // For other phases not yet implemented, show a neutral status
    setStatus(gameId, 'Proceeding to next phase…');
}

document.addEventListener('DOMContentLoaded', async function() {
    const gid = getGameId();
    // Ensure we have an auth user so we can match uid if session id missing
    await ensureAuth();
    try { localPaused = localStorage.getItem(`sh_paused_${gid}`) === 'true'; } catch (_) {}
    const status = document.getElementById('status');
    const liberalSlots = document.getElementById('liberal-slots');
    const fascistSlots = document.getElementById('fascist-slots');
    const tracker = document.getElementById('election-tracker');
    const playersStrip = document.getElementById('players-strip');

    renderSlots(liberalSlots, 5);
    renderSlots(fascistSlots, 6);
    renderTracker(tracker);
    
    // Add bullet overlays to 4th and 5th fascist slots immediately after creation
    if (fascistSlots) {
        addBulletOverlaysToFascistSlots(fascistSlots);
    }

    // Role banner is inline now, no dynamic positioning required

    // Order modal handlers (set up early so button works even if game load fails)
    const orderBtn = document.getElementById('order-btn');
    const orderModal = document.getElementById('order-modal');
    const orderClose = document.getElementById('order-close');
    const orderBody = document.getElementById('order-body');

    // History modal handlers
    const historyBtn = document.getElementById('history-btn');
    const historyModal = document.getElementById('history-modal');
    const historyClose = document.getElementById('history-close');
    const historyBody = document.getElementById('history-body');

    // Nomination modal handlers
    const nominationModal = document.getElementById('nomination-modal');
    const nominationClose = document.getElementById('nomination-close');
    const nominationBody = document.getElementById('nomination-body');

    // Function moved to helpers.js

    // Function moved to utils.js

    function youPlayerDoc() {
        const id = computeYouId(gid);
        return (latestPlayers || []).find(p => p && p.id === id) || null;
    }

    // Function moved to helpers.js

    // renderHistory function removed - now handled in modals.js
            orderBtn?.addEventListener('click', () => openOrderModal(latestPlayers, latestGame, orderBody, orderModal, setRoleBannerVisibility));
orderClose?.addEventListener('click', () => closeOrderModal(orderModal, setRoleBannerVisibility));
orderModal?.addEventListener('click', function(e) { if (e.target === orderModal) closeOrderModal(orderModal, setRoleBannerVisibility); });

// Role envelope event listener
const roleEnvelope = document.getElementById('role-envelope');
roleEnvelope?.addEventListener('click', openRoleOverlay);

    // Function moved to modals.js

    // Function moved to modals.js
    historyBtn?.addEventListener('click', async () => {
        // Subscribe to history if not already subscribed
        if (!historyUnsub) {
            // Wait for initial history data before opening modal
            await new Promise((resolve) => {
                historyUnsub = onHistory(gid, (items) => {
                    historyItems = items || [];
                    resolve(); // Resolve on first data receive
                });
            });
        }
        const youPlayer = youPlayerDoc();
        const showVoteDetails = latestGame?.settings?.showVoteDetails !== false; // Default true
        openHistoryModal(historyModal, historyBody, historyItems, youPlayer, canSeeEvent, formatTime, setRoleBannerVisibility, showVoteDetails);
    });
    historyClose?.addEventListener('click', () => closeHistoryModal(historyModal, setRoleBannerVisibility));
    historyModal?.addEventListener('click', function(e) { if (e.target === historyModal) closeHistoryModal(historyModal, setRoleBannerVisibility); });

    function openNominationModal() {
        if (!nominationModal) return;
        if (isNominating) return; // Prevent opening during nomination transition
        const youId = computeYouId(gid);
        const presId = latestGame && latestGame.currentPresidentPlayerId;
        if (!youId || !presId || youId !== presId) return;
        if (latestGame && latestGame.nominatedChancellorPlayerId) return;
        
        // Additional safety check - if we're in voting phase, don't open nomination modal
        if (latestGame && latestGame.nominatedChancellorPlayerId && latestGame.electionVotes) {
            return;
        }
        nominationBody.innerHTML = '';
        const eligibleIds = eligibleChancellorIds(latestGame, latestPlayers || []);
        const alivePlayers = (latestPlayers || []).filter(p => p && p.id && p.alive !== false);

        if (alivePlayers.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'No players available.';
            nominationBody.appendChild(p);
        } else {
            const list = document.createElement('div');
            list.style.display = 'grid';
            list.style.gridTemplateColumns = '1fr 1fr';
            list.style.gap = '10px';

            alivePlayers.forEach(pl => {
                const isEligible = eligibleIds.includes(pl.id);
                const isYou = pl.id === youId;
                const btn = document.createElement('button');
                btn.style.width = '100%';
                btn.style.minHeight = '56px';
                btn.style.fontSize = '1rem';

                if (isEligible) {
                    btn.className = 'btn btn-primary';
                    btn.setAttribute('data-nominate', pl.id);
                    btn.textContent = pl.name || 'Player';
                } else {
                    btn.className = 'btn';
                    btn.disabled = true;
                    const reason = isYou ? "(INELIGIBLE - THAT'S YOU!)" : '(Ineligible)';
                    btn.textContent = (pl.name || 'Player') + ' ' + reason;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                }

                list.appendChild(btn);
            });

            // If odd count, center the last button across both columns
            if (alivePlayers.length % 2 === 1) {
                const lastBtn = list.lastElementChild;
                if (lastBtn) {
                    lastBtn.style.gridColumn = '1 / -1';
                    lastBtn.style.justifySelf = 'center';
                    lastBtn.style.width = '60%';
                }
            }
            nominationBody.appendChild(list);
        }
        nominationModal.style.display = 'flex';
        setRoleBannerVisibility(false);
    }
    function closeNominationModal() { if (nominationModal) { nominationModal.style.display = 'none'; setRoleBannerVisibility(true); } }
    nominationClose?.addEventListener('click', closeNominationModal);
    nominationModal?.addEventListener('click', function(e) { if (e.target === nominationModal) closeNominationModal(); });

    // Rules modal handlers
    const rulesBtn = document.getElementById('help-btn');
    const rulesModal = document.getElementById('rules-modal');
    const rulesClose = document.getElementById('rules-close');
    const ruleNavButtons = rulesModal?.querySelectorAll('.rule-nav-btn');
    const ruleSections = rulesModal?.querySelectorAll('.rule-section');
    const rulesPrevBtn = document.getElementById('rules-prev');
    const rulesNextBtn = document.getElementById('rules-next');
    const rulesIndicator = document.getElementById('rules-indicator');

    // Constants moved to constants.js
    function getActiveIndex() {
        let idx = 0;
        ruleSections?.forEach((sec, i) => { if (sec.classList.contains('active')) idx = i; });
        return idx;
    }
    function setActiveByIndex(idx) {
        const clamped = Math.max(0, Math.min((ruleSections?.length || 1) - 1, idx));
        const targetId = `${RULE_KEYS[clamped]}-section`;
        // switch sections
        ruleSections?.forEach(sec => sec.classList.toggle('active', sec.id === targetId));
        // switch top nav active state
        ruleNavButtons?.forEach((b) => {
            const k = b.getAttribute('data-section');
            b.classList.toggle('active', `${k}-section` === targetId);
        });
        // update indicator
        if (rulesIndicator) rulesIndicator.textContent = `${clamped + 1}/${ruleSections?.length || 1}`;
        // scroll top of modal body for new section
        const body = document.getElementById('rules-body');
        if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
    }
            function openRulesModal() { if (rulesModal) { rulesModal.style.display = 'flex'; setRoleBannerVisibility(false); } }
function closeRulesModal() { if (rulesModal) { rulesModal.style.display = 'none'; setRoleBannerVisibility(true); } }

// Role overlay functions
function openRoleOverlay() {
    const roleOverlay = document.getElementById('role-overlay');
    const roleText = document.getElementById('role-text');
    const membershipBtn = document.getElementById('membership-btn');
    const roleBtn = document.getElementById('role-btn');
    const compatriotsBtn = document.getElementById('compatriots-btn');
    const doneBtn = document.getElementById('role-done-btn');

    // Only log element detection once (when state changes)
    const elementsFound = `${!!roleOverlay}${!!roleText}${!!membershipBtn}${!!roleBtn}${!!compatriotsBtn}${!!doneBtn}`;
    if (lastLoggedState.roleOverlayElements !== elementsFound) {
        console.log('🔍 Found elements:', {
            roleOverlay: !!roleOverlay,
            roleText: !!roleText,
            membershipBtn: !!membershipBtn,
            roleBtn: !!roleBtn,
            compatriotsBtn: !!compatriotsBtn,
            doneBtn: !!doneBtn
        });
        lastLoggedState.roleOverlayElements = elementsFound;
    }

    if (!roleOverlay || !roleText || !membershipBtn || !roleBtn || !compatriotsBtn || !doneBtn) {
        console.error('Role modal elements not found');
        return;
    }
    
    // Get current player's data
    const gameId = getGameId();
    const youId = computeYouId(gameId);
    const youPlayer = (latestPlayers || []).find(p => p && p.id === youId);
    const game = latestGame;
    
    if (!youPlayer || !game) {
        roleText.textContent = 'Player not found or game not loaded';
        roleText.style.color = '#666';
        // Disable all action buttons
        membershipBtn.disabled = true;
        roleBtn.disabled = true;
        compatriotsBtn.disabled = true;
        return;
    }
    
    // Additional validation for game state
    if (game.state !== 'playing') {
        roleText.textContent = 'Game not started yet';
        roleText.style.color = '#666';
        // Disable all action buttons
        membershipBtn.disabled = true;
        roleBtn.disabled = true;
        compatriotsBtn.disabled = true;
        return;
    }

    // Set up button states and permissions (log only when player role/party changes)
    const playerInfo = `${youPlayer?.role}:${youPlayer?.party}`;
    if (lastLoggedState.refreshPlayerInfo !== playerInfo) {
        console.log('🎯 Setting up button permissions for player:', youPlayer?.role + ' (' + youPlayer?.party + ')');
        lastLoggedState.refreshPlayerInfo = playerInfo;
    }
    setupButtonPermissions(youPlayer, game, membershipBtn, roleBtn, compatriotsBtn);
    
    // Set up event listeners
    membershipBtn.onclick = () => showMembership(youPlayer, roleText, membershipBtn);
    roleBtn.onclick = () => showRole(youPlayer, roleText, roleBtn);
    compatriotsBtn.onclick = () => {
        if (!compatriotsBtn.disabled) {
            showCompatriots(youPlayer, game, roleText);
        }
    };
    
    // Set up a retry mechanism for permissions in case game data is still loading
    let retryCount = 0;
    const maxRetries = 3;
    const retryPermissions = () => {
        if (retryCount < maxRetries && (!game.playerCount || game.playerCount <= 0)) {
            retryCount++;
            console.log(`Retrying permissions setup (attempt ${retryCount}/${maxRetries})`);
            setTimeout(() => {
                if (latestGame && latestGame.playerCount) {
                    setupButtonPermissions(youPlayer, latestGame, membershipBtn, roleBtn, compatriotsBtn);
                } else if (retryCount < maxRetries) {
                    retryPermissions();
                }
            }, 1000 * retryCount); // Exponential backoff
        }
    };
    retryPermissions();
    doneBtn.onclick = () => {
        roleOverlay.style.display = 'none';
        setRoleBannerVisibility(true);
    };
    
    // Start with hidden role
    roleText.textContent = 'Hidden';
    roleText.style.color = '#000';
    
    // Reset buttons to censored state
    membershipBtn.textContent = '🏛️ View Membership';
    roleBtn.textContent = '👁️ View Role';
    membershipBtn.style.background = 'rgba(241, 230, 178, 0.8)';
    roleBtn.style.background = 'var(--highlight-cream)';
    membershipBtn.style.borderColor = 'var(--propaganda-black)';
    roleBtn.style.borderColor = 'var(--propaganda-black)';
    
    // Clear any existing help text
    const existingHelpText = roleText.querySelector('div[style*="font-style: italic"]');
    if (existingHelpText) {
        existingHelpText.remove();
    }
    

    
    // Show overlay with smooth transition
    roleOverlay.style.display = 'flex';
    roleOverlay.style.animation = 'fadeIn 0.3s ease-in-out';
    setRoleBannerVisibility(false);
}

function closeRoleOverlay() {
    const roleOverlay = document.getElementById('role-overlay');
    if (roleOverlay) {
        roleOverlay.style.display = 'none';
        setRoleBannerVisibility(true);
    }
}

function refreshRoleOverlayPermissions() {
    // Only refresh if the role overlay is currently open
    const roleOverlay = document.getElementById('role-overlay');
    if (!roleOverlay || roleOverlay.style.display === 'none') {
        return;
    }
    
    const membershipBtn = document.getElementById('membership-btn');
    const roleBtn = document.getElementById('role-btn');
    const compatriotsBtn = document.getElementById('compatriots-btn');
    
    if (!membershipBtn || !roleBtn || !compatriotsBtn) {
        return;
    }
    
    const gameId = getGameId();
    const youId = computeYouId(gameId);
    const youPlayer = (latestPlayers || []).find(p => p && p.id === youId);
    const game = latestGame;
    
    if (youPlayer && game) {
        console.log('Refreshing role overlay permissions:', {
            gameId,
            youId,
            youPlayerRole: youPlayer.role,
            youPlayerParty: youPlayer.party,
            gameState: game.state,
            gamePlayerCount: game.playerCount,
            latestPlayersLength: latestPlayers.length
        });
        setupButtonPermissions(youPlayer, game, membershipBtn, roleBtn, compatriotsBtn);
        

        
        // Clear any existing help text
        const roleText = document.getElementById('role-text');
        if (roleText) {
            const existingHelpText = roleText.querySelector('div[style*="font-style: italic"]');
            if (existingHelpText) {
                existingHelpText.remove();
            }
        }
    }
}

// New core functions for the three-button role modal
function setupButtonPermissions(youPlayer, game, membershipBtn, roleBtn, compatriotsBtn) {
    // Ensure we have a reliable player count
    let playerCount = game.playerCount;
    if (!playerCount || playerCount <= 0) {
        playerCount = (latestPlayers || []).length;
        // If still no valid count, try to get it from the game document
        if (!playerCount || playerCount <= 0) {
            console.warn('No valid player count found, defaulting to 5');
            playerCount = 5; // Default fallback
        }
    }

    // Only log when state changes (role, party, or player count)
    const stateKey = `${youPlayer?.role}:${youPlayer?.party}:${playerCount}`;
    if (lastLoggedState.buttonPermissionsState !== stateKey) {
        console.log('🔍 setupButtonPermissions called with:', {
            youPlayer: youPlayer?.role + ' (' + youPlayer?.party + ')',
            gamePlayerCount: game?.playerCount,
            latestPlayersLength: (latestPlayers || []).length
        });
        console.log('Setting up button permissions:', {
            gamePlayerCount: game.playerCount,
            fallbackPlayerCount: playerCount,
            latestPlayersLength: latestPlayers.length,
            gameState: game.state,
            youPlayerRole: youPlayer.role,
            youPlayerParty: youPlayer.party
        });
        lastLoggedState.buttonPermissionsState = stateKey;
    }
    
    // Additional validation for game state
    if (!game || game.state !== 'playing') {
        console.warn('Game not in playing state, disabling comrades button');
        compatriotsBtn.disabled = true;
        compatriotsBtn.style.opacity = '0.6';
        compatriotsBtn.title = 'Game not started yet';
        return;
    }
    
    // Ensure we have valid player data
    if (!latestPlayers || latestPlayers.length === 0) {
        console.warn('No players loaded yet, disabling comrades button');
        compatriotsBtn.disabled = true;
        compatriotsBtn.style.opacity = '0.6';
        compatriotsBtn.title = 'Player data not loaded yet';
        return;
    }
    
    const isFascist = (youPlayer.party || '').toString().toUpperCase() === 'FASCIST' ||
                      (youPlayer.role || '').toString().toUpperCase() === 'FASCIST';

    // Debug logging (only when fascist status changes within same state)
    const fascistKey = `${stateKey}:${isFascist}`;
    if (lastLoggedState.buttonPermissionsDebug !== fascistKey) {
        console.log('setupButtonPermissions debug:', {
            playerCount,
            isFascist,
            party: youPlayer.party,
            role: youPlayer.role,
            partyUpper: (youPlayer.party || '').toString().toUpperCase(),
            roleUpper: (youPlayer.role || '').toString().toUpperCase(),
            gamePlayerCount: game.playerCount,
            latestPlayersLength: (latestPlayers || []).length,
            gameState: game.state,
            gameId: game.id
        });
        lastLoggedState.buttonPermissionsDebug = fascistKey;
    }
    
    // Membership and role start enabled but censored (showing placeholder text)
    membershipBtn.disabled = false;
    roleBtn.disabled = false;
    membershipBtn.style.opacity = '1';
    roleBtn.style.opacity = '1';
    membershipBtn.title = 'Click to reveal your party membership';
    roleBtn.title = 'Click to reveal your secret role';
    
    // Comrades button visibility and permissions
    const roleActionsMain = document.querySelector('.role-actions-main');
    
    if (isFascist) {
        // Show comrades button for Fascists at 5+ players
        // At 5-6 players: All Fascists (including Hitler) know each other
        // At 7+ players: Fascists know each other, but Hitler doesn't know them
        if (playerCount >= 5) {
            compatriotsBtn.style.removeProperty('display');
            compatriotsBtn.disabled = false;
            compatriotsBtn.style.opacity = '1';
            compatriotsBtn.title = 'View your Fascist allies';
            roleActionsMain?.classList.remove('comrades-hidden');

            // Only log button state once per configuration
            const buttonStateKey = `${fascistKey}:enabled:${playerCount}`;
            if (lastLoggedState.buttonState !== buttonStateKey) {
                console.log('🔧 Button state after enabling:', {
                    display: compatriotsBtn.style.display,
                    disabled: compatriotsBtn.disabled,
                    opacity: compatriotsBtn.style.opacity,
                    roleActionsMainClasses: roleActionsMain?.classList.toString()
                });
                lastLoggedState.buttonState = buttonStateKey;
            }

            // Clear any existing help text
            const roleText = document.getElementById('role-text');
            if (roleText) {
                const helpText = roleText.querySelector('div[style*="font-style: italic"]');
                if (helpText) {
                    helpText.remove();
                }
            }
        } else {
            // Hide button completely for games with less than 5 players
            const hideStateKey = `${fascistKey}:hidden:${playerCount}`;
            if (lastLoggedState.buttonState !== hideStateKey) {
                console.log('❌ Hiding comrades button for Fascist at', playerCount, 'players (need 5+ players)');
                lastLoggedState.buttonState = hideStateKey;
            }
            compatriotsBtn.style.display = 'none';
            roleActionsMain?.classList.add('comrades-hidden');
        }
    } else {
        // Show comrades button for Liberals with fun message
        compatriotsBtn.style.removeProperty('display');
        compatriotsBtn.disabled = false;
        compatriotsBtn.style.opacity = '1';
        compatriotsBtn.title = 'See what Liberals see (hint: nothing!)';
        roleActionsMain?.classList.remove('comrades-hidden');
    }
    
    // Add visual feedback for button states
    membershipBtn.title = 'Click to reveal your party membership';
    roleBtn.title = 'Click to reveal your secret role';
}

// Helper function to close all views and reset to hidden state
function closeAllViews(roleText) {
    // Clear any existing help text
    const existingHelpText = roleText.querySelector('div[style*="font-style: italic"]');
    if (existingHelpText) {
        existingHelpText.remove();
    }
    
    // Reset to hidden state
    roleText.textContent = 'Hidden';
    roleText.style.color = '#000';
    
    // Reset button states back to original
    const membershipBtn = document.getElementById('membership-btn');
    const roleBtn = document.getElementById('role-btn');
    
    if (membershipBtn) {
        membershipBtn.textContent = '🏛️ View Membership';
        membershipBtn.style.background = 'rgba(0, 174, 239, 0.1)';
        membershipBtn.style.borderColor = 'var(--liberal-blue)';
    }
    
    if (roleBtn) {
        roleBtn.textContent = '👁️ View Role';
        roleBtn.style.background = 'var(--highlight-cream)';
        roleBtn.style.borderColor = 'var(--propaganda-black)';
    }
}

function showMembership(youPlayer, roleText, membershipBtn) {
    const party = (youPlayer.party || '').toString().toUpperCase();
    
    // Check if membership is currently shown or hidden
    const isCurrentlyShown = roleText.textContent.includes('Party:') && 
                           !roleText.textContent.includes('Hidden') &&
                           !roleText.textContent.includes('Your Fascist Comrades:') &&
                           !roleText.textContent.includes('No other Fascist players');
    
    if (isCurrentlyShown) {
        // Hide membership - return to hidden state
        roleText.textContent = 'Hidden';
        roleText.style.color = '#000';
        membershipBtn.textContent = '🏛️ View Membership';
        membershipBtn.style.background = 'rgba(0, 174, 239, 0.1)';
        membershipBtn.style.borderColor = 'var(--liberal-blue)';
    } else {
        // Close any other views first
        closeAllViews(roleText);
        
        // Show membership
        roleText.textContent = `Party: ${party}`;
        
        // Set colors based on party (same color scheme as role text)
        if (party === 'FASCIST') {
            roleText.style.color = '#DA291C'; // Fascist red
            membershipBtn.style.background = 'rgba(218, 41, 28, 0.1)';
            membershipBtn.style.borderColor = '#DA291C';
        } else {
            roleText.style.color = '#00AEEF'; // Liberal blue
            membershipBtn.style.background = 'rgba(0, 174, 239, 0.1)';
            membershipBtn.style.borderColor = 'var(--liberal-blue)';
        }
        
        membershipBtn.textContent = '🙈 Hide Membership';
    }
    

    
    // Add subtle animation
    roleText.style.animation = 'none';
    roleText.offsetHeight; // Trigger reflow
    roleText.style.animation = 'fadeIn 0.3s ease-in-out';
}

function showRole(youPlayer, roleText, roleBtn) {
    const role = (youPlayer.role || '').toString().toUpperCase();
    const party = (youPlayer.party || '').toString().toUpperCase();
    
    // Check if role is currently hidden or shown
    const isCurrentlyHidden = roleText.textContent === 'Hidden' || 
                            roleText.textContent.includes('Party:') ||
                            roleText.textContent.includes('Your Fascist Comrades:') ||
                            roleText.textContent.includes('No other Fascist players') ||
                            roleText.textContent.includes('Your Liberal Comrades:');
    
    if (isCurrentlyHidden) {
        // Close any other views first
        closeAllViews(roleText);
        
        const label = role ? `${role}${party && role !== party ? ' – ' + party : ''}` : 'Not assigned yet';
        roleText.textContent = label;
        
        // Set colors based on role
        if (role === 'HITLER') roleText.style.color = '#DA291C';
        else if (party === 'FASCIST' || role === 'FASCIST') roleText.style.color = '#DA291C';
        else roleText.style.color = '#00AEEF';
        
        roleBtn.textContent = '🙈 Hide Role';
        roleBtn.style.background = 'rgba(218, 41, 28, 0.1)';
        roleBtn.style.borderColor = '#DA291C';
    } else {
        roleText.textContent = 'Hidden';
        roleText.style.color = '#000';
        roleBtn.textContent = '👁️ View Role';
        roleBtn.style.background = 'var(--highlight-cream)';
        roleBtn.style.borderColor = 'var(--propaganda-black)';
    }
    

    
    // Add subtle animation
    roleText.style.animation = 'none';
    roleText.offsetHeight; // Trigger reflow
    roleText.style.animation = 'fadeIn 0.3s ease-in-out';
}

function showCompatriots(youPlayer, game, roleText) {
    const isFascist = (youPlayer.party || '').toString().toUpperCase() === 'FASCIST' ||
                      (youPlayer.role || '').toString().toUpperCase() === 'FASCIST';

    // Check if comrades view is currently shown
    const isCurrentlyShown = roleText.textContent.includes('Your Fascist Comrades:') ||
                            roleText.textContent.includes('No other Fascist players') ||
                            roleText.textContent.includes('Your Liberal Comrades:');

    if (isCurrentlyShown) {
        // Hide comrades - return to hidden state
        closeAllViews(roleText);
        return;
    }

    // Close any other views first
    closeAllViews(roleText);

    if (isFascist) {
        // Handle Fascist players
        const fascistPlayers = (latestPlayers || []).filter(p =>
            p && p.id !== youPlayer.id &&
            ((p.party || '').toString().toUpperCase() === 'FASCIST' ||
             (p.role || '').toString().toUpperCase() === 'FASCIST')
        );

        if (fascistPlayers.length === 0) {
            roleText.textContent = 'No other Fascist players to reveal';
            roleText.style.color = '#000';

            // Add explanation
            const helpText = document.createElement('div');
            helpText.style.fontSize = '0.75rem';
            helpText.style.color = '#666';
            helpText.style.marginTop = '8px';
            helpText.style.fontStyle = 'italic';
            helpText.textContent = 'This means you are the only Fascist player in the game.';
            roleText.appendChild(helpText);
        } else {
            const names = fascistPlayers.map(p => p.name || 'Unknown Player').join('\n');
            roleText.textContent = `Your Fascist Comrades:\n${names}`;
            roleText.style.color = '#DA291C';

            // Add explanation
            const helpText = document.createElement('div');
            helpText.style.fontSize = '0.75rem';
            helpText.style.color = '#666';
            helpText.style.marginTop = '8px';
            helpText.style.fontStyle = 'italic';
            helpText.textContent = `You know ${fascistPlayers.length} other Fascist player${fascistPlayers.length === 1 ? '' : 's'}. Work together to pass Fascist policies!`;
            roleText.appendChild(helpText);
        }
    } else {
        // Handle Liberal players with fun message
        roleText.textContent = '🤷‍♂️ Your Liberal Comrades:';
        roleText.style.color = '#00AEEF';

        // Add fun explanation about not knowing teammates
        const helpText = document.createElement('div');
        helpText.style.fontSize = '0.75rem';
        helpText.style.color = '#666';
        helpText.style.marginTop = '8px';
        helpText.style.fontStyle = 'italic';
        helpText.textContent = 'You have no idea who your Liberal teammates are - and that\'s part of the fun! Trust your instincts and work together to pass Liberal policies! 🕵️‍♀️';
        roleText.appendChild(helpText);
    }

    // Add subtle animation
    roleText.style.animation = 'none';
    roleText.offsetHeight; // Trigger reflow
    roleText.style.animation = 'fadeIn 0.3s ease-in-out';
}
    if (rulesBtn) {
        rulesBtn.addEventListener('click', function(e) {
            try { e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); } catch (_) {}
            openRulesModal();
        }, { capture: true });
    }
    rulesClose?.addEventListener('click', closeRulesModal);
    rulesModal?.addEventListener('click', function(e) { if (e.target === rulesModal) closeRulesModal(); });
    
    // Role overlay close button event listener
    const roleClose = document.getElementById('role-close');
    roleClose?.addEventListener('click', closeRoleOverlay);
    
    // Role overlay click outside to close
    const roleOverlay = document.getElementById('role-overlay');
    roleOverlay?.addEventListener('click', function(e) { if (e.target === roleOverlay) closeRoleOverlay(); });
    // Tab switching inside rules modal
    ruleNavButtons?.forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.getAttribute('data-section');
            ruleNavButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            ruleSections?.forEach(sec => {
                if (sec.id === `${target}-section`) sec.classList.add('active');
                else sec.classList.remove('active');
            });
            // update indicator after manual switch
            setActiveByIndex(getActiveIndex());
        });
    });
    // Prev/Next controls
    rulesPrevBtn?.addEventListener('click', function() {
        setActiveByIndex(getActiveIndex() - 1);
    });
    rulesNextBtn?.addEventListener('click', function() {
        setActiveByIndex(getActiveIndex() + 1);
    });
    // Initialize indicator when modal opens
    if (rulesIndicator) rulesIndicator.textContent = `${getActiveIndex() + 1}/${ruleSections?.length || 1}`;

    // Swipe gestures for mobile
    (function enableSwipe() {
        const body = document.getElementById('rules-body');
        if (!body) return;
        let touchStartX = 0, touchStartY = 0, touching = false, moved = false;
        body.addEventListener('touchstart', function(e) {
            if (!e.touches || e.touches.length !== 1) return;
            const t = e.touches[0];
            touchStartX = t.clientX; touchStartY = t.clientY; touching = true; moved = false;
        }, { passive: true });
        body.addEventListener('touchmove', function(e) {
            if (!touching || !e.touches || e.touches.length !== 1) return;
            const t = e.touches[0];
            const dx = t.clientX - touchStartX; const dy = t.clientY - touchStartY;
            if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) moved = true;
        }, { passive: true });
        body.addEventListener('touchend', function(e) {
            if (!touching) return; touching = false;
            const changed = e.changedTouches && e.changedTouches[0];
            if (!changed) return;
            const dx = changed.clientX - touchStartX; const dy = changed.clientY - touchStartY;
            if (!moved || Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
            if (dx < 0) setActiveByIndex(getActiveIndex() + 1); else setActiveByIndex(getActiveIndex() - 1);
        });
    })();

    // Make section headers tappable to jump to next section on mobile
    (function enableHeaderTap() {
        const mq = window.matchMedia('(max-width: 640px)');
        const headers = rulesModal?.querySelectorAll('.rule-section .section-header');
        headers?.forEach(h => {
            h.style.cursor = mq.matches ? 'pointer' : '';
            h.addEventListener('click', function() {
                if (!mq.matches) return;
                setActiveByIndex(getActiveIndex() + 1);
            });
        });
    })();
    // Esc to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && rulesModal && rulesModal.style.display === 'flex') {
            closeRulesModal();
        }
        if (e.key === 'Escape' && roleOverlay && roleOverlay.style.display === 'flex') {
            closeRoleOverlay();
        }
    });

    // Menu modal handlers
    const menuBtn = document.getElementById('menu-btn');
    const menuModal = document.getElementById('menu-modal');
    const menuClose = document.getElementById('menu-close');
    const menuBody = document.getElementById('menu-body');
    const menuTitle = menuModal?.querySelector('.modal-title');

    function isSoundEnabled() {
        try { return localStorage.getItem('sh_sound_enabled') !== 'false'; } catch (_) { return true; }
    }
    function setSoundEnabled(enabled) {
        try { localStorage.setItem('sh_sound_enabled', enabled ? 'true' : 'false'); } catch (_) {}
    }
    function sanitizePlayerNameLocal(raw) {
        const trimmed = String(raw || '').trim();
        const collapsed = trimmed.replace(/\s+/g, ' ');
        const cleaned = collapsed.replace(/[^A-Za-z0-9 _\-'.]/g, '');
        return cleaned.slice(0, 24);
    }

    function renderMenu() {
        if (!menuBody) return;
        menuBody.innerHTML = '';
        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '8px';

        const leaveBtn = document.createElement('button');
        leaveBtn.id = 'leave-game-btn';
        leaveBtn.className = 'btn';
        leaveBtn.textContent = '↩️ Leave Game (rejoin later)';
        list.appendChild(leaveBtn);

        const pauseBtn = document.createElement('button');
        pauseBtn.id = 'pause-toggle-btn';
        pauseBtn.className = 'btn';
        pauseBtn.textContent = localPaused ? '▶️ Resume Game' : '⏸️ Pause Game (AFK)';
        list.appendChild(pauseBtn);

        const soundBtn = document.createElement('button');
        soundBtn.id = 'sound-toggle-btn';
        soundBtn.className = 'btn';
        soundBtn.textContent = isSoundEnabled() ? '🔇 Disable Sound Effects' : '🔊 Enable Sound Effects';
        list.appendChild(soundBtn);

        const nameBtn = document.createElement('button');
        nameBtn.id = 'change-name-btn';
        nameBtn.className = 'btn';
        nameBtn.textContent = '✏️ Change Name';
        list.appendChild(nameBtn);

        // Add host-only buttons (seat 1)
        const you = youPlayerDoc();
        if (you && you.seat === 1) {
            const hostOptionsBtn = document.createElement('button');
            hostOptionsBtn.id = 'host-options-btn';
            hostOptionsBtn.className = 'btn';
            hostOptionsBtn.textContent = '👑 Host Only Options';
            list.appendChild(hostOptionsBtn);
        }

        menuBody.appendChild(list);
    }

    function renderHostOptionsMenu() {
        if (!menuBody) return;
        menuBody.innerHTML = '';
        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '8px';

        const backBtn = document.createElement('button');
        backBtn.id = 'host-back-btn';
        backBtn.className = 'btn';
        backBtn.textContent = '← Back to Menu';
        list.appendChild(backBtn);

        // Vote details toggle - simple button style
        const showVoteDetails = latestGame?.settings?.showVoteDetails !== false; // Default true
        const voteToggleBtn = document.createElement('button');
        voteToggleBtn.id = 'toggle-vote-details-btn';
        voteToggleBtn.className = 'btn';
        const icon = showVoteDetails ? '👁️' : '🔒';
        const state = showVoteDetails ? 'SHOWN' : 'HIDDEN';
        voteToggleBtn.textContent = `${icon} Vote Visibility: ${state}`;

        list.appendChild(voteToggleBtn);

        const quitBtn = document.createElement('button');
        quitBtn.id = 'quit-game-btn';
        quitBtn.className = 'btn';
        quitBtn.textContent = '⚠️ Quit Game for Everyone';
        list.appendChild(quitBtn);

        const duplicateBtn = document.createElement('button');
        duplicateBtn.id = 'duplicate-game-btn';
        duplicateBtn.className = 'btn';
        duplicateBtn.textContent = '🔄 End and Duplicate Game';
        list.appendChild(duplicateBtn);

        menuBody.appendChild(list);
    }


    function openMenuModal() {
        renderMenu();
        try {
            const you = youPlayerDoc();
            const yourName = you ? (you.name || 'Player') : 'Player';
            if (menuTitle) menuTitle.textContent = `Menu — ${yourName}`;
        } catch (_) {}
        if (menuModal) menuModal.style.display = 'flex';
        setRoleBannerVisibility(false);
    }
    function closeMenuModal() { if (menuModal) { menuModal.style.display = 'none'; setRoleBannerVisibility(true); } }
    if (menuBtn) {
        // Use capture and stop propagation to avoid other handlers firing
        menuBtn.addEventListener('click', function(e) {
            try { e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); } catch (_) {}
            openMenuModal();
        }, { capture: true });
    }
    menuClose?.addEventListener('click', closeMenuModal);
    menuModal?.addEventListener('click', function(e) { if (e.target === menuModal) closeMenuModal(); });

    // (Removed global delegation that could cause unintended opens)

    // Menu actions (delegated)
    menuBody?.addEventListener('click', async function(e) {
        const t = e.target;
        if (!(t && t.matches && t.matches('button'))) return;
        const youId = computeYouId(gid);
        const youDoc = (latestPlayers || []).find(p => p && p.id === youId) || null;
        const yourName = youDoc ? (youDoc.name || 'Player') : 'Player';

        if (t.id === 'leave-game-btn') {
            try {
                if (youId) {
                    try { await updateDoc(doc(db, 'games', gid, 'players', youId), { uid: null, leftAt: serverTimestamp(), updatedAt: serverTimestamp() }); } catch (_) {}
                    try { await logPublic(gid, `${yourName} left the game`, { type: 'leave', actorId: youId }); } catch (_) {}
                }
                try { sessionStorage.removeItem(`sh_playerId_${gid}`); } catch (_) {}
            } finally {
                closeMenuModal();
                window.location.href = `./join.html?game=${encodeURIComponent(gid)}`;
            }
            return;
        }

        if (t.id === 'quit-game-btn') {
            const ok = confirm('This will end the game for everyone and redirect to game creation with the same players. Are you sure?');
            if (!ok) return;
            try {
                // Collect current game data
                const currentPlayers = latestPlayers || [];

                // Validate we have enough players
                const validPlayers = currentPlayers.filter(p => p && p.name && p.name.trim());
                if (validPlayers.length < 5) {
                    alert('Cannot create new game: Need at least 5 valid player names.');
                    return;
                }

                // Sort players by seat to maintain order
                const sortedPlayers = validPlayers
                    .sort((a, b) => (a.seat || 0) - (b.seat || 0))
                    .map(p => p.name.trim());

                // Build URL with game data
                const params = new URLSearchParams();
                params.set('duplicate', 'true');
                params.set('playerCount', String(sortedPlayers.length));
                params.set('playerNames', sortedPlayers.join(','));

                // Set flag to prevent snapshot redirect for host
                isHostQuitting = true;

                // Close modal
                closeMenuModal();

                // End the current game first
                await updateDoc(doc(db, 'games', gid), {
                    state: 'cancelled',
                    updatedAt: serverTimestamp()
                });

                try {
                    await logPublic(gid, `Game ended by ${yourName}`, {
                        type: 'end',
                        actorId: youId || null
                    });
                } catch (_) {}

                // Now redirect to create page (snapshot listener will see the flag and skip redirect)
                window.location.href = `../pages/create.html?${params.toString()}`;

            } catch (err) {
                console.error('Failed to end game and create new:', err);
                alert('Failed to end game and create new. Please try again.');
                isHostQuitting = false; // Reset flag on error
            }
            return;
        }

        if (t.id === 'pause-toggle-btn') {
            localPaused = !localPaused;
            try { localStorage.setItem(`sh_paused_${gid}`, localPaused ? 'true' : 'false'); } catch (_) {}
            try {
                if (localPaused) await logPublic(gid, `${yourName} is AFK`, { type: 'status', actorId: youId || null });
                else await logPublic(gid, `${yourName} returned`, { type: 'status', actorId: youId || null });
            } catch (_) {}
            renderMenu();
            renderActions(gid);
            return;
        }

        if (t.id === 'sound-toggle-btn') {
            const newState = !isSoundEnabled();
            setSoundEnabled(newState);
            renderMenu();
            return;
        }

        if (t.id === 'change-name-btn') {
            const currentName = youDoc ? (youDoc.name || '') : '';
            const input = prompt('Enter your new name (max 24 chars):', currentName);
            if (input === null) return;
            const cleaned = sanitizePlayerNameLocal(input);
            if (!cleaned) return;
            if (!youId) return;
            try {
                await updateDoc(doc(db, 'games', gid, 'players', youId), { name: cleaned, updatedAt: serverTimestamp() });
                try { await logPublic(gid, `${currentName || 'Player'} is now ${cleaned}`, { type: 'rename', actorId: youId }); } catch (_) {}
            } catch (err) {
                console.error('Failed to change name', err);
            }
            closeMenuModal();
            return;
        }

        if (t.id === 'host-options-btn') {
            renderHostOptionsMenu();
            return;
        }

        if (t.id === 'host-back-btn') {
            renderMenu();
            return;
        }

        if (t.id === 'toggle-vote-details-btn') {
            try {
                const currentValue = latestGame?.settings?.showVoteDetails !== false; // Default true
                const newValue = !currentValue;
                const gameRef = doc(db, 'games', gid);
                await updateDoc(gameRef, {
                    'settings.showVoteDetails': newValue,
                    updatedAt: serverTimestamp()
                });
                await logPublic(gid, `Host ${newValue ? 'enabled' : 'hid'} individual vote choices in history`, { type: 'settings', actorId: youId || null });
                renderHostOptionsMenu();
            } catch (err) {
                console.error('Failed to toggle vote details', err);
                alert('Failed to update setting: ' + err.message);
            }
            return;
        }

        if (t.id === 'duplicate-game-btn') {
            try {
                // Collect current game data
                const currentPlayers = latestPlayers || [];

                // Validate we have enough players
                const validPlayers = currentPlayers.filter(p => p && p.name && p.name.trim());
                if (validPlayers.length < 5) {
                    alert('Cannot duplicate game: Need at least 5 valid player names.');
                    return;
                }

                // Sort players by seat to maintain order
                const sortedPlayers = validPlayers
                    .sort((a, b) => (a.seat || 0) - (b.seat || 0))
                    .map(p => p.name.trim());

                // Build URL with game data
                const params = new URLSearchParams();
                params.set('duplicate', 'true');
                params.set('playerCount', String(sortedPlayers.length));
                params.set('playerNames', sortedPlayers.join(','));

                // Set flag to prevent snapshot redirect for host
                isHostQuitting = true;

                // Close modal
                closeMenuModal();

                // End the current game first
                await updateDoc(doc(db, 'games', gid), {
                    state: 'cancelled',
                    updatedAt: serverTimestamp()
                });

                try {
                    await logPublic(gid, `Game ended by ${yourName} to duplicate with same players`, {
                        type: 'end',
                        actorId: youId || null
                    });
                } catch (_) {}

                // Now redirect to create page (snapshot listener will see the flag and skip redirect)
                window.location.href = `../pages/create.html?${params.toString()}`;

            } catch (err) {
                console.error('Failed to duplicate game:', err);
                alert('Failed to duplicate game. Please try again.');
                isHostQuitting = false; // Reset flag on error
            }
            return;
        }
    });

    if (!gid) { setStatus('', 'Missing game id'); hidePreloader(); return; }

    // Preloader text rotation
    const preloaderMessages = [
        'Loading game…',
        'Shuffling policies…',
        'Setting up the board…',
        'Preparing roles…',
        'Almost ready…'
    ];
    let preloaderIndex = 0;
    // Set initial message immediately
    setPreloader(preloaderMessages[preloaderIndex]);
    const preloaderInterval = setInterval(() => {
        preloaderIndex = (preloaderIndex + 1) % preloaderMessages.length;
        setPreloader(preloaderMessages[preloaderIndex]);
    }, 2000);

    // Clear interval when preloader is hidden
    const originalHidePreloader = hidePreloader;
    const hidePreloaderWithCleanup = () => {
        clearInterval(preloaderInterval);
        originalHidePreloader();
    };

    const gameRef = doc(db, 'games', gid);
    let gameReady = false;
    let playersReady = false;
    function maybeHide() {
        if (gameReady && playersReady) hidePreloaderWithCleanup();
    }
    const snap = await getDoc(gameRef);
    if (!snap.exists()) { setStatus(gid, 'Game not found'); hidePreloaderWithCleanup(); return; }

    // Check if game is cancelled on initial load
    const initialGameData = snap.data();
    if (initialGameData && initialGameData.state === 'cancelled') {
        setStatus(gid, 'Game cancelled');
        hidePreloaderWithCleanup();
        try {
            alert('This game has been ended. You can join a new game or rejoin this one.');
        } catch (_) {}
        window.location.href = `./join.html?game=${encodeURIComponent(gid)}`;
        return;
    }

    setStatus(gid, 'Game in progress');

    onSnapshot(gameRef, (s) => {
        latestGame = s.exists() ? s.data() : null;
        if (!latestGame) { setStatus(gid, 'Game unavailable'); hidePreloaderWithCleanup(); return; }
        if (latestGame.state === 'cancelled') {
            setStatus(gid, 'Game cancelled');
            hidePreloaderWithCleanup();
            // Skip redirect if host is quitting to create page
            if (isHostQuitting) {
                return;
            }
            // Redirect all other players to join page when game is cancelled
            try {
                alert('This game has been ended. You can join a new game or rejoin this one.');
            } catch (_) {}
            window.location.href = `./join.html?game=${encodeURIComponent(gid)}`;
            return;
        }
        
        // Initialize discard pile count from game state
        const discardCount = calculateDiscardCountFromGameState(latestGame);
        setDiscardCount(discardCount);
        
        // Initialize table spread count from game state
        const tableSpreadCount = calculateTableSpreadCountFromGameState(latestGame);
        setTableSpreadCount(tableSpreadCount);
        
        // Update player strip highlights if ids available
        renderPlayers(playersStrip, latestPlayers.map(p => ({
            ...p,
            isPresident: latestGame && (latestGame.currentPresidentPlayerId === p.id),
            isChancellor: latestGame && (latestGame.currentChancellorPlayerId === p.id)
        })));
        // Update policy counters and election tracker if present
        updateFromGame(latestGame);
                    // Update floating role banner for this device
        updateRoleBanner(latestGame, gid);
        updateDeadBanner(latestGame, gid);
        updateRoleEnvelope(latestGame, gid);
        
        // Refresh role overlay permissions if it's currently open
        refreshRoleOverlayPermissions();
        // Update actions (nomination UI etc.)
        renderActions(gid);
        // Refresh fascist slot icons based on player count
        refreshFascistSlotsForPlayerCount();
        // Attempt resolve vote if complete
        maybeResolveElectionVote(gid);
        
        // Reset nomination flag when we detect the phase has changed from nomination to voting
        if (latestGame && latestGame.nominatedChancellorPlayerId && isNominating) {
            // We've moved from nomination to voting phase, reset the flag
            isNominating = false;
        }


        // Show victory modal if game has ended
        if (latestGame && latestGame.gamePhase === 'ended') {
            showVictoryModal(latestGame);
        }

        // Check if there's a pending superpower and show modal (handles page refresh)
        if (latestGame && latestGame.pendingSuperpower) {
            const youId = computeYouId(gid);
            const superpowerPresidentId = latestGame.pendingSuperpower.presidentId;

            // Only show modal if this user is the president who needs to use the superpower
            // AND if no superpower-related modal is already visible
            // AND we're not currently processing a superpower (prevents race condition)
            const hasSuperpowerModal = document.getElementById('superpower-modal') ||
                                      document.getElementById('policy-peek-modal') ||
                                      document.getElementById('investigation-modal') ||
                                      document.getElementById('special-election-modal') ||
                                      document.getElementById('execution-modal');

            if (youId === superpowerPresidentId && !hasSuperpowerModal && !isProcessingSuperpower) {
                const superpower = {
                    type: latestGame.pendingSuperpower.type,
                    name: latestGame.pendingSuperpower.name,
                    description: latestGame.pendingSuperpower.description
                };
                const fascistSlot = latestGame.pendingSuperpower.slot;

                console.log(`🔄 Page loaded/refreshed with pending superpower - showing modal for ${superpower.name}`);
                showSuperpowerModal(superpower, fascistSlot);
            }
        }

        gameReady = true;
        maybeHide();
    });

    // Subscribe to players ordered by orderIndex
    onSnapshot(query(collection(db, 'games', gid, 'players'), orderBy('orderIndex', 'asc')), (snapColl) => {
        latestPlayers = snapColl.docs.map(d => ({ id: d.id, ...d.data() })) || [];
        renderPlayers(playersStrip, latestPlayers.map(p => ({
            ...p,
            isPresident: latestGame && (latestGame.currentPresidentPlayerId === p.id),
            isChancellor: latestGame && (latestGame.currentChancellorPlayerId === p.id)
        })));
        // Also refresh the banner after players load (needed for uid->id map)
        updateRoleBanner(latestGame, gid);
        updateDeadBanner(latestGame, gid);
        updateRoleEnvelope(latestGame, gid);

        // Refresh role overlay permissions if it's currently open
        refreshRoleOverlayPermissions();


        // Update actions when players change (eligibility)
        renderActions(gid);
        // Note: maybeResolveElectionVote is already called by game listener, no need to duplicate here
        playersReady = true;
        maybeHide();
    });

    // Removed redirect for help-btn; now opens in-game modal

    // Start session monitoring to detect conflicts
    startSessionMonitoring(gid);

    // Presence heartbeat to keep this player's session marked active while playing
    heartbeatOnce(gid);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(function() { heartbeatOnce(gid); }, HEARTBEAT_INTERVAL_MS);

    // Start stuck game checker to automatically fix stuck games
    const stuckGameChecker = startStuckGameChecker(gid);

    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') heartbeatOnce(gid);
    });
    window.addEventListener('beforeunload', function() {
        heartbeatOnce(gid);
        if (stuckGameChecker) clearInterval(stuckGameChecker);
        sessionManager.cleanup();
    });

    // Background: surface AFK/return notifications from history as a brief status banner
    if (!afkUnsub) {
        try {
            afkUnsub = onHistory(gid, (items) => {
                try {
                    const youId = computeYouId(gid);
                    const visible = (items || []).filter(canSeeEvent);
                    const matches = visible.filter((evt) => {
                        const msg = String(evt && evt.message || '');
                        const isAfk = msg.includes(' is AFK');
                        const isReturn = msg.includes(' returned');
                        if (!(evt && evt.type === 'status' && (isAfk || isReturn))) return false;
                        if (youId && evt.actorId && evt.actorId === youId) return false; // don't notify yourself
                        return true;
                    });
                    if (!matches.length) return;
                    const newest = matches[matches.length - 1];
                    const order = Number(newest && newest.clientOrder || 0);
                    if (!(order > lastAfkSeenOrder)) return;
                    lastAfkSeenOrder = order;
                    // Update banner without re-logging to history
                    setStatus('', newest.message || '');
                } catch (_) { /* no-op */ }
            });
        } catch (_) { /* no-op */ }
    }
    window.addEventListener('beforeunload', function() { if (afkUnsub) { try { afkUnsub(); } catch (_) {} afkUnsub = null; } });

    // Nomination click handler (event delegation on document)
    document.addEventListener('click', async function(e) {
        const t = e.target;
        if (t && t.matches && t.matches('#open-nominate-btn')) {
            e.preventDefault();
            openNominationModal();
            return;
        }
        if (!(t && t.matches && t.matches('button[data-nominate]'))) return;
        const candidateId = t.getAttribute('data-nominate');
        if (!candidateId) return;
        const youId = computeYouId(gid);
        const presId = latestGame && latestGame.currentPresidentPlayerId;
        if (!youId || !presId || youId !== presId) return; // Only president can nominate
        
        // Set flag to prevent modal re-opening during nomination
        isNominating = true;
        
        try {
            await ensureAuth();
            // Write nomination
            await updateDoc(doc(db, 'games', gid), {
                nominatedChancellorPlayerId: candidateId,
                electionVotes: {},
                voteResolution: null,
                updatedAt: serverTimestamp()
            });
            // Log publicly
            try {
                const p = (latestPlayers || []).find(pp => pp && pp.id === candidateId);
                await logPublic(gid, `President nominated ${p ? (p.name || 'a player') : 'a player'} as Chancellor`, { type: 'nomination', actorId: presId });
                await logPublic(gid, 'Chancellor vote began', { type: 'vote' });
            } catch (_) {}
            // Close modal after successful nomination
            const nominationModal = document.getElementById('nomination-modal');
            if (nominationModal) {
                // Force immediate hiding with CSS
                nominationModal.style.display = 'none';
                nominationModal.style.opacity = '0';
                nominationModal.style.visibility = 'hidden';
                nominationModal.style.pointerEvents = 'none';
                
                setRoleBannerVisibility(true);
                
                // Also clear the modal body to prevent any lingering content
                const nominationBody = document.getElementById('nomination-body');
                if (nominationBody) {
                    nominationBody.innerHTML = '';
                }
            }
            
            // Don't reset the flag here - let the Firebase listener handle it
            // when the phase actually changes from nomination to voting
            
            // Safety fallback - reset flag after a very short delay if Firebase doesn't fire
            setTimeout(() => {
                if (isNominating) {
                    isNominating = false;
                }
            }, 100);
        } catch (err) {
            console.error('Failed to nominate chancellor', err);
            isNominating = false; // Reset flag on error
        }
    });

    // Voting click handler
    document.addEventListener('click', async function(e) {
        const t = e.target;
        // Toggle vote popover (support clicks on inner elements)
        const toggleBtn = (t && t.closest) ? t.closest('#vote-toggle-btn') : null;
        if (toggleBtn) {
            e.preventDefault();
            const pop = document.getElementById('vote-popover');
            if (pop) {
                pop.style.display = (pop.style.display === 'block') ? 'none' : 'block';
            }
            return;
        }
        // Submit vote (support clicks on inner elements)
        const voteBtn = (t && t.closest) ? t.closest('button[data-vote]') : null;
        if (!voteBtn) return;
        const vote = voteBtn.getAttribute('data-vote');
        if (!vote || (vote !== 'ja' && vote !== 'nein')) return;
        const youId = computeYouId(gid);
        if (!youId) return;
        const game = latestGame;
        if (!game || !game.nominatedChancellorPlayerId) return;
        try {
            await ensureAuth();
            await updateDoc(doc(db, 'games', gid), {
                ["electionVotes." + youId]: vote,
                updatedAt: serverTimestamp()
            });
            const pop = document.getElementById('vote-popover');
            if (pop) pop.style.display = 'none';

            // Log vote - show individual choice if setting enabled (default true)
            const voter = latestPlayers.find(p => p.id === youId);
            if (voter) {
                const showVoteDetails = game.settings?.showVoteDetails !== false; // Default true
                if (showVoteDetails) {
                    await logPublic(gid, `${voter.name} voted ${vote.toUpperCase()}`, { type: 'vote', actorId: youId });
                } else {
                    await logPublic(gid, `${voter.name} voted`, { type: 'vote', actorId: youId });
                }
            }

            // Try to resolve the election immediately after this vote
            maybeResolveElectionVote(gid);
        } catch (err) {
            console.error('Failed to submit vote', err);
        }
    });

    // Helper: resolve election when enough votes are in to determine outcome
    let lastResolvedNomineeId = null;
    let resolveElectionTimer = null;
    let isResolvingElection = false;
    async function maybeResolveElectionVote(gameId) {
        // Debounce: prevent multiple simultaneous calls
        if (isResolvingElection) {
            return;
        }

        // Debounce: wait 100ms for multiple rapid changes to settle
        clearTimeout(resolveElectionTimer);
        resolveElectionTimer = setTimeout(async () => {
            await maybeResolveElectionVoteInternal(gameId);
        }, 100);
    }

    async function maybeResolveElectionVoteInternal(gameId) {
        if (isResolvingElection) return;
        isResolvingElection = true;
        try {
            const game = latestGame;
            if (!game) return;
            const nomineeId = game.nominatedChancellorPlayerId || null;
            if (!nomineeId) return;
            const votes = (game.electionVotes && typeof game.electionVotes === 'object') ? game.electionVotes : {};
            const aliveIds = (latestPlayers || []).filter(p => p && p.alive !== false).map(p => p.id);
            const totalVoters = aliveIds.length || (latestPlayers || []).length;
            const numVotes = Object.keys(votes).filter(k => aliveIds.includes(k)).length;
            if (!totalVoters || numVotes === 0) return;
            if (lastResolvedNomineeId === nomineeId) return;

            // Check if we can resolve early based on current votes
            const validVotes = Object.entries(votes).filter(([pid]) => aliveIds.includes(pid)).map(([,v]) => String(v));
            const ja = validVotes.filter(v => v === 'ja').length;
            const nein = validVotes.filter(v => v === 'nein').length;

            // Early resolution: if remaining votes can't change the outcome
            // Note: 50/50 is a failed election (need MORE than half to pass)
            const remainingVotes = totalVoters - numVotes;
            const canPass = ja > (totalVoters / 2);
            const canFail = nein >= Math.ceil(totalVoters / 2); // nein >= half means fail

            // Log early resolution attempt
            console.log(`Vote resolution check: ${ja} ja, ${nein} nein, ${numVotes}/${totalVoters} votes in. canPass=${canPass}, canFail=${canFail}, remaining=${remainingVotes}`);
            console.log(`Alive players:`, aliveIds);
            console.log(`Votes:`, votes);

            // If we can't resolve early, wait for more votes
            if (!canPass && !canFail && numVotes < totalVoters) {
                console.log(`Not resolving yet - waiting for more votes`);
                return;
            }
            
            if (canPass || canFail) {
                console.log(`Early resolution possible: ${canPass ? 'PASS' : 'FAIL'} (${remainingVotes} votes remaining won\'t change outcome)`);
            }

            const gameRef = doc(db, 'games', gameId);
            const outcome = await runTransaction(getFirestore(app), async (tx) => {
                const snap = await tx.get(gameRef);
                if (!snap.exists()) return null;
                const g = snap.data();
                const currentNominee = g.nominatedChancellorPlayerId || null;
                if (!currentNominee || currentNominee !== nomineeId) return null;
                const already = g.voteResolution && g.voteResolution.nomineeId === currentNominee && g.voteResolution.at;
                if (already) return null;
                const gvotes = (g.electionVotes && typeof g.electionVotes === 'object') ? g.electionVotes : {};
                const aliveNow = (latestPlayers || []).filter(p => p && p.alive !== false).map(p => p.id);
                const totalNow = aliveNow.length || (latestPlayers || []).length;
                const validVotes = Object.entries(gvotes).filter(([pid]) => aliveNow.includes(pid)).map(([,v]) => String(v));
                if (totalNow === 0) return null;

                // Use the early resolution values we calculated above
                // Note: This may resolve before all players have voted if outcome is certain
                const ja = validVotes.filter(v => v === 'ja').length;
                const nein = validVotes.filter(v => v === 'nein').length;
                const passed = ja > (totalNow / 2);
                const payload = {
                    voteResolution: { nomineeId: currentNominee, ja, nein, passed, at: serverTimestamp() },
                    electionVotes: {},
                    updatedAt: serverTimestamp()
                };
                if (passed) {
                    // Check for Hitler election win condition
                    // Fetch the nominee player to check if they are Hitler
                    const nomineePlayerRef = doc(db, 'games', gameId, 'players', currentNominee);
                    const nomineePlayerSnap = await tx.get(nomineePlayerRef);
                    const isHitler = nomineePlayerSnap.exists() && nomineePlayerSnap.data().role === 'hitler';
                    const fascistPolicies = g.fascistPolicies || 0;

                    // If Hitler is elected Chancellor after 3+ fascist policies, Fascists win
                    if (isHitler && fascistPolicies >= 3) {
                        payload.gamePhase = 'ended';
                        payload.winner = 'fascist';
                        payload.winCondition = 'hitler_elected';
                        payload.endedAt = serverTimestamp();
                        payload.electionTracker = 0;
                        payload.currentChancellorPlayerId = currentNominee;
                        payload.nominatedChancellorPlayerId = null;
                        payload.termLimitLastPresidentId = g.currentPresidentPlayerId || null;
                        payload.termLimitLastChancellorId = currentNominee;
                        tx.update(gameRef, payload);
                        return { ja, nein, passed, electionTracker: 0, hitlerElected: true };
                    }

                    // Normal Chancellor election
                    payload.electionTracker = 0;
                    payload.currentChancellorPlayerId = currentNominee;
                    payload.nominatedChancellorPlayerId = null;
                    // Optional: set term limits for next nomination phase
                    payload.termLimitLastPresidentId = g.currentPresidentPlayerId || null;
                    payload.termLimitLastChancellorId = currentNominee;
                } else {
                    // Cap election tracker at 3 maximum
                    const newTrackerValue = Math.min(3, (typeof g.electionTracker === 'number' ? g.electionTracker : 0) + 1);
                    payload.electionTracker = newTrackerValue;
                    // Clear failed nominee
                    payload.nominatedChancellorPlayerId = null;
                }
                tx.update(gameRef, payload);
                return { ja, nein, passed, electionTracker: payload.electionTracker, hitlerElected: false };
            });

            if (outcome) {
                lastResolvedNomineeId = nomineeId;
                try {
                    if (outcome.passed) {
                        await logPublic(gameId, `Election passed`, { type: 'vote' });

                        // Check if Hitler was elected - if so, log the win and skip normal government formation
                        if (outcome.hitlerElected) {
                            const chancPlayer = latestPlayers.find(p => p.id === nomineeId);
                            const chancName = chancPlayer ? chancPlayer.name : 'Unknown';
                            await logPublic(gameId, `👑 ${chancName} (Hitler) elected Chancellor! Fascists win!`, {
                                type: 'game_end',
                                winner: 'fascist',
                                winCondition: 'hitler_elected',
                                chancellorId: nomineeId
                            });
                            setStatus(gameId, '👑 Hitler elected Chancellor! Fascists win the game!');
                        } else {
                            // Normal government formation
                            // Log the new government formation with President and Chancellor names
                            const presPlayer = latestPlayers.find(p => p.id === latestGame.currentPresidentPlayerId);
                            const chancPlayer = latestPlayers.find(p => p.id === nomineeId);
                            const presName = presPlayer ? presPlayer.name : 'Unknown';
                            const chancName = chancPlayer ? chancPlayer.name : 'Unknown';
                            await logPublic(gameId, `${presName} (President) and ${chancName} (Chancellor) form the government`, { type: 'government' });
                        }
                    } else {
                        await logPublic(gameId, `Election failed`, { type: 'vote' });

                        // Use the tracker value returned from the transaction
                        const newTrackerValue = outcome.electionTracker || 0;
                        await logPublic(gameId, `⚠️ Election tracker: ${newTrackerValue}/3 failed elections`, { type: 'system' });

                        const gameRef = doc(db, 'games', gameId);

                        if (newTrackerValue >= 3) {
                            // Three failed elections - enact chaos policy
                            await enactChaosPolicy(gameId, gameRef);
                        } else {
                            // Less than 3 failures - just warn and advance
                            if (newTrackerValue === 2) {
                                await logPublic(gameId, '⚠️ Warning: One more failed election will enact a random policy!', { type: 'warning' });
                            }
                            // Advance to next president after failed election
                            await advanceToNextGovernment(gameId, gameRef);
                        }
                    }
                } catch (_) {}
            }
        } catch (err) {
            console.error('Failed to resolve election vote', err);
        } finally {
            isResolvingElection = false;
        }
    }

});

// ===== DYNAMIC DISCARD PILE MODULE =====

// Card configuration data - memorized visual order
const DISCARD_CARD_CONFIG = [
    { translateY: -4, rotate: -15, zIndex: 2, className: 'policy-on-discard' },
    { translateY: -8, rotate: 12, zIndex: 3, className: 'policy-on-discard-top' },
    { translateY: -12, rotate: -8, zIndex: 4, className: 'policy-on-discard-2' },
    { translateY: -16, rotate: 18, zIndex: 5, className: 'policy-on-discard-3' },
    { translateY: -20, rotate: -22, zIndex: 6, className: 'policy-on-discard-4' },
    { translateY: -23, rotate: 6, zIndex: 7, className: 'policy-on-discard-5' },
    { translateY: -25.5, rotate: -14, zIndex: 8, className: 'policy-on-discard-6' },
    { translateY: -27.5, rotate: 20, zIndex: 9, className: 'policy-on-discard-7' },
    { translateY: -29, rotate: -10, zIndex: 10, className: 'policy-on-discard-8' },
    { translateY: -30.25, rotate: 16, zIndex: 11, className: 'policy-on-discard-9' },
    { translateY: -31.25, rotate: -25, zIndex: 12, className: 'policy-on-discard-10' }
];

// Responsive scaling factors
const RESPONSIVE_SCALES = {
    base: 1.0,
    small: 1.0,
    large: 1.0
};

// Current discard count
let currentDiscardCount = 0;

// Function to update the discard pile visualization
function updateDiscardPileVisual(count) {
    const discardStack = document.querySelector('.card-stack.discard');
    if (!discardStack) return;

    // Remove existing policy cards (keep the base discard card)
    const existingPolicyCards = discardStack.querySelectorAll('.stack-card:not(.is-discard)');
    existingPolicyCards.forEach(card => card.remove());

    // Add new policy cards based on count
    for (let i = 0; i < count && i < DISCARD_CARD_CONFIG.length; i++) {
        const config = DISCARD_CARD_CONFIG[i];
        const card = document.createElement('div');
        card.className = `stack-card ${config.className}`;
        card.style.backgroundImage = 'url(../images/policy-back.png)';
        card.style.setProperty('transform', `translateY(${config.translateY}px) rotate(${config.rotate}deg) scale(${RESPONSIVE_SCALES.base})`, 'important');
        card.style.transformOrigin = '50% 50%';
        card.style.zIndex = config.zIndex;

        discardStack.appendChild(card);
    }

    // Update responsive styles
    updateResponsiveDiscardStyles(count);
    
    // Update count display
    updateCountDisplay(count);
    
    // Update table spread count when discard pile changes (if game state is available)
    if (latestGame && !window.isUpdatingTableSpread) {
        window.isUpdatingTableSpread = true;
        setTimeout(() => {
            const newTableSpreadCount = calculateTableSpreadCountFromGameState(latestGame);
            setTableSpreadCount(newTableSpreadCount);
            window.isUpdatingTableSpread = false;
        }, 100);
    }
}

// Function to update responsive styles for different screen sizes
function updateResponsiveDiscardStyles(count) {
    // Remove existing responsive styles
    const existingStyles = document.getElementById('dynamic-discard-styles');
    if (existingStyles) existingStyles.remove();

    // Create new style element
    const style = document.createElement('style');
    style.id = 'dynamic-discard-styles';
    
    let css = '';
    
    // Small screens (≤640px)
    css += '@media (max-width: 640px) {';
    for (let i = 0; i < count && i < DISCARD_CARD_CONFIG.length; i++) {
        const config = DISCARD_CARD_CONFIG[i];
        css += `.card-stack.discard .stack-card.${config.className} { transform: translateY(${config.translateY}px) rotate(${config.rotate}deg) scale(${RESPONSIVE_SCALES.small}) !important; }`;
    }
    css += '}';
    
    // Very small screens (≤360px)
    css += '@media (max-width: 360px) {';
    for (let i = 0; i < count && i < DISCARD_CARD_CONFIG.length; i++) {
        const config = DISCARD_CARD_CONFIG[i];
        css += `.card-stack.discard .stack-card.${config.className} { transform: translateY(${config.translateY}px) rotate(${config.rotate}deg) scale(${RESPONSIVE_SCALES.small}) !important; }`;
    }
    css += '}';
    
    // Large screens (≥768px)
    css += '@media (min-width: 768px) {';
    for (let i = 0; i < count && i < DISCARD_CARD_CONFIG.length; i++) {
        const config = DISCARD_CARD_CONFIG[i];
        // Scale up the translateY for larger screens
        const scaledTranslateY = Math.round(config.translateY * 1.6);
        css += `.card-stack.discard .stack-card.${config.className} { transform: translateY(${scaledTranslateY}px) rotate(${config.rotate}deg) scale(${RESPONSIVE_SCALES.large}) !important; }`;
    }
    css += '}';
    
    document.head.appendChild(style);
}

// Function to increment discard count (called when cards are discarded)
async function incrementDiscardCount() {
    currentDiscardCount++;
    updateDiscardPileVisual(currentDiscardCount);
    
    // Persist the discard count to the database so it survives game state reloads
    try {
        const gameId = getGameId();
        if (gameId && latestGame) {
            const gameRef = doc(db, 'games', gameId);
            await updateDoc(gameRef, {
                totalDiscardedCards: increment(1),
                updatedAt: serverTimestamp()
            });
            
            // Update table spread count based on updated game state
            const newTableSpreadCount = calculateTableSpreadCountFromGameState({
                ...latestGame,
                totalDiscardedCards: (latestGame.totalDiscardedCards || 0) + 1
            });
            setTableSpreadCount(newTableSpreadCount);
        }
    } catch (error) {
        console.error('Failed to persist discard count to database:', error);
    }
    
}

// Function to decrement discard count (called when deck is reshuffled)
async function decrementDiscardCount() {
    if (currentDiscardCount > 0) {
        currentDiscardCount--;
        updateDiscardPileVisual(currentDiscardCount);
        
        // Update the database to reflect the decreased count
        try {
            const gameId = getGameId();
            if (gameId && latestGame) {
                const gameRef = doc(db, 'games', gameId);
                await updateDoc(gameRef, {
                    totalDiscardedCards: increment(-1),
                    updatedAt: serverTimestamp()
                });
                
                // Update table spread count based on updated game state
                const newTableSpreadCount = calculateTableSpreadCountFromGameState({
                    ...latestGame,
                    totalDiscardedCards: Math.max(0, (latestGame.totalDiscardedCards || 0) - 1)
                });
                setTableSpreadCount(newTableSpreadCount);
            }
        } catch (error) {
            console.error('Failed to update discard count in database:', error);
        }
        
    }
}

// Function to reset discard count (called when deck is reshuffled)
async function resetDiscardCount() {
    currentDiscardCount = 0;
    updateDiscardPileVisual(currentDiscardCount);

    // Update table spread count when deck is reshuffled (all discarded cards return to deck)
    if (latestGame) {
        const newTableSpreadCount = calculateTableSpreadCountFromGameState(latestGame);
        setTableSpreadCount(newTableSpreadCount);
    }

    // Reshuffle the policy deck
    try {
        const gameId = getGameId();
        if (gameId && latestGame) {
            // Calculate remaining policies in the game
            const liberalCount = 6;
            const fascistCount = 11;
            const enactedLiberal = latestGame.liberalPolicies || 0;
            const enactedFascist = latestGame.fascistPolicies || 0;
            const remainingLiberal = liberalCount - enactedLiberal;
            const remainingFascist = fascistCount - enactedFascist;

            // Build new deck with remaining policies
            const newDeck = [];
            for (let i = 0; i < remainingLiberal; i++) {
                newDeck.push('liberal');
            }
            for (let i = 0; i < remainingFascist; i++) {
                newDeck.push('fascist');
            }

            // Fisher-Yates shuffle
            for (let i = newDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
            }

            console.log(`🔀 Reshuffling deck with ${remainingLiberal} Liberal and ${remainingFascist} Fascist policies (${newDeck.length} total)`);

            const gameRef = doc(db, 'games', gameId);
            await updateDoc(gameRef, {
                totalDiscardedCards: 0,
                presidentDiscardedCard: null,
                chancellorDiscardedCard: null,
                policyDeckOrder: newDeck,
                deckPosition: 0,
                discardedDeckPositions: [], // Clear discarded positions since we reshuffled
                updatedAt: serverTimestamp()
            });
            console.log(`Discard count reset and deck reshuffled in database`);
        }
    } catch (error) {
        console.error('Failed to reset discard count and reshuffle deck:', error);
    }

    console.log(`Discard count reset to 0 (deck reshuffled)`);
}

// Function to set discard count (called when game state is loaded)
function setDiscardCount(count) {
    currentDiscardCount = Math.max(0, count);
    updateDiscardPileVisual(currentDiscardCount);
    
    // Update table spread count when discard count is loaded from game state
    if (latestGame) {
        const newTableSpreadCount = calculateTableSpreadCountFromGameState(latestGame);
        setTableSpreadCount(newTableSpreadCount);
    }
    
}

// Function to calculate discard count from game state
function calculateDiscardCountFromGameState(game) {
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
    
    // Use cumulative discard count if available (this persists across turns)
    if (game.totalDiscardedCards && typeof game.totalDiscardedCards === 'number') {
        count = Math.max(count, game.totalDiscardedCards);
    }
    
    return count;
}

// Initialize discard pile with 0 cards
document.addEventListener('DOMContentLoaded', function() {
    setDiscardCount(0);
    
    // Add test buttons for development (remove in production)
    addTestButtons();
});

// Function to add test buttons for development
function addTestButtons() {
    const actionsCenter = document.querySelector('.actions-center');
    if (!actionsCenter) return;
    
    const testDiv = document.createElement('div');
    testDiv.style.marginTop = '10px';
    testDiv.style.textAlign = 'center';
    testDiv.innerHTML = `
        <button onclick="incrementDiscardCount().catch(console.error)" style="margin: 2px; padding: 4px 8px; font-size: 12px;">+1 Discard</button>
        <button onclick="decrementDiscardCount().catch(console.error)" style="margin: 2px; padding: 4px 8px; font-size: 12px;">-1 Discard</button>
        <button onclick="resetDiscardCount().catch(console.error)" style="margin: 2px; padding: 4px 8px; font-size: 12px;">Reset</button>
        <button onclick="forceRefreshDiscardPile()" style="margin: 2px; padding: 4px 8px; font-size: 12px;">🔄 Force Refresh</button>
        <span style="margin-left: 10px; font-size: 12px;">Count: <span id="discard-count-display">0</span></span>
    `;
    
    actionsCenter.appendChild(testDiv);
    
    // Update count display
    updateCountDisplay(currentDiscardCount);
}

// Function to update the count display
function updateCountDisplay(count) {
    const countDisplay = document.getElementById('discard-count-display');
    if (countDisplay) {
        countDisplay.textContent = count;
    }
}


// ===== END DYNAMIC DISCARD PILE MODULE =====

// ===== DYNAMIC TABLE SPREAD MODULE =====

// Table spread card configuration - memorized visual arrangement
const TABLE_SPREAD_CONFIG = [
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
];

// Current table spread count
let currentTableSpreadCount = 0;

// Function to update the table spread visualization
function updateTableSpreadVisual(count) {
    const tableSpread = document.querySelector('.table-spread');
    if (!tableSpread) return;

    // Remove existing table cards
    const existingTableCards = tableSpread.querySelectorAll('.table-card');
    existingTableCards.forEach(card => card.remove());

    // Add new table cards based on count
    for (let i = 0; i < count && i < TABLE_SPREAD_CONFIG.length; i++) {
        const config = TABLE_SPREAD_CONFIG[i];
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
    updateResponsiveTableSpreadStyles(count);
}

// Function to update responsive styles for different screen sizes
function updateResponsiveTableSpreadStyles(count) {
    // Remove existing responsive styles
    const existingStyles = document.getElementById('dynamic-table-spread-styles');
    if (existingStyles) existingStyles.remove();

    // Create new style element
    const style = document.createElement('style');
    style.id = 'dynamic-table-spread-styles';
    
    let css = '';
    
    // Small screens (≤640px)
    css += '@media (max-width: 640px) {';
    for (let i = 0; i < count && i < TABLE_SPREAD_CONFIG.length; i++) {
        const config = TABLE_SPREAD_CONFIG[i];
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
    for (let i = 0; i < count && i < TABLE_SPREAD_CONFIG.length; i++) {
        const config = TABLE_SPREAD_CONFIG[i];
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
    for (let i = 0; i < count && i < TABLE_SPREAD_CONFIG.length; i++) {
        const config = TABLE_SPREAD_CONFIG[i];
        css += `.table-spread .table-card.${config.className} { 
            width: var(--play-card-w, 72px); 
            height: var(--play-card-h, 104px); 
            margin: 0 -18px; 
            transform: rotate(${config.rotate}deg); 
        }`;
    }
    css += '}';
    
    document.head.appendChild(style);
}

// Function to increment table spread count
function incrementTableSpreadCount() {
    if (currentTableSpreadCount < TABLE_SPREAD_CONFIG.length) {
        currentTableSpreadCount++;
        updateTableSpreadVisual(currentTableSpreadCount);
    }
}

// Function to decrement table spread count
function decrementTableSpreadCount() {
    if (currentTableSpreadCount > 0) {
        currentTableSpreadCount--;
        updateTableSpreadVisual(currentTableSpreadCount);
    }
}

// Function to set table spread count
function setTableSpreadCount(count) {
    currentTableSpreadCount = Math.max(0, Math.min(count, TABLE_SPREAD_CONFIG.length));
    updateTableSpreadVisual(currentTableSpreadCount);
}

// Function to calculate table spread count from game state
function calculateTableSpreadCountFromGameState(game) {
    if (!game) return 0;
    
    
    // Calculate remaining policy cards
    let remainingCards = 17; // Total policy deck size
    
    // Subtract enacted policies
    if (game.liberalPolicies) {
        remainingCards -= game.liberalPolicies;
    }
    if (game.fascistPolicies) {
        remainingCards -= game.fascistPolicies;
    }
    
    // Subtract discarded policies using the totalDiscardedCards field
    if (game.totalDiscardedCards) {
        remainingCards -= game.totalDiscardedCards;
    }
    
    // Subtract cards currently in play (if any)
    if (game.currentPolicyStack && Array.isArray(game.currentPolicyStack)) {
        remainingCards -= game.currentPolicyStack.length;
    }
    
    // Ensure we don't go below 0 or above the maximum
    remainingCards = Math.max(0, Math.min(remainingCards, TABLE_SPREAD_CONFIG.length));
    
    
    return remainingCards;
}

// Initialize table spread with correct count from game state
document.addEventListener('DOMContentLoaded', function() {
    // Start with 17 cards (full deck) if no game state, otherwise calculate from game
    const initialCount = latestGame ? calculateTableSpreadCountFromGameState(latestGame) : 17;
    setTableSpreadCount(initialCount);
    
    // Update test buttons to include table spread controls
    updateTestButtons();
});

// Function to update test buttons to include table spread controls
function updateTestButtons() {
    const testDiv = document.querySelector('.cards-area .test-buttons');
    if (!testDiv) return;
    
    // Add table spread controls
    const tableSpreadControls = document.createElement('div');
    tableSpreadControls.style.marginTop = '10px';
    tableSpreadControls.style.textAlign = 'center';
    tableSpreadControls.innerHTML = `
        <button onclick="incrementTableSpreadCount()" style="margin: 2px; padding: 4px 8px; font-size: 12px;">+1 Spread</button>
        <button onclick="decrementTableSpreadCount()" style="margin: 2px; padding: 4px 8px; font-size: 12px;">-1 Spread</button>
        <button onclick="setTableSpreadCount(17)" style="margin: 2px; padding: 4px 8px; font-size: 12px;">Full Deck</button>
        <button onclick="forceRefreshTableSpread()" style="margin: 2px; padding: 4px 8px; font-size: 12px;">Refresh</button>
        <span style="margin-left: 10px; font-size: 12px;">Spread: <span id="table-spread-count-display">17</span></span>
    `;
    
    testDiv.appendChild(tableSpreadControls);
    
    // Update count display
    updateTableSpreadCountDisplay(currentTableSpreadCount);
}

// Function to update the table spread count display
function updateTableSpreadCountDisplay(count) {
    const countDisplay = document.getElementById('table-spread-count-display');
    if (countDisplay) {
        countDisplay.textContent = count;
    }
}


// ===== END DYNAMIC TABLE SPREAD MODULE =====

// Comprehensive game repair and diagnostic system
async function repairGameState(gameId) {
    
    if (!gameId || !latestGame) {
        console.error('Cannot repair: missing game ID or game data');
        return false;
    }
    
    try {
        const gameRef = doc(db, 'games', gameId);
        const repairUpdates = {};
        let repairsApplied = 0;
        
        
        // 1. Fix discard pile inconsistencies
        if (repairDiscardPile(gameId, latestGame, repairUpdates)) {
            repairsApplied++;
        }
        
        // 2. Fix stuck game phases
        if (repairStuckGamePhase(gameId, latestGame, repairUpdates)) {
            repairsApplied++;
        }
        
        // 3. Fix player state inconsistencies
        if (repairPlayerStates(gameId, latestGame, latestPlayers, repairUpdates)) {
            repairsApplied++;
        }
        
        // 4. Fix policy count inconsistencies
        if (repairPolicyCounts(gameId, latestGame, repairUpdates)) {
            repairsApplied++;
        }
        
        // 5. Fix election tracker issues
        if (repairElectionTracker(gameId, latestGame, repairUpdates)) {
            repairsApplied++;
        }
        
        // Apply all repairs if any were found
        if (repairsApplied > 0) {
            repairUpdates.updatedAt = serverTimestamp();
            repairUpdates.lastRepairAt = serverTimestamp();
            repairUpdates.repairsApplied = repairsApplied;
            
            await updateDoc(gameRef, repairUpdates);
            
            // Log the repair action
            await logPublic(gameId, `Game automatically repaired: ${repairsApplied} issues fixed`, {
                type: 'system_repair',
                repairsApplied: repairsApplied
            });
            
            // Refresh the visual discard pile after repair
            if (repairUpdates.totalDiscardedCards !== undefined) {
                setDiscardCount(repairUpdates.totalDiscardedCards);
                
                // Force a complete visual refresh
                setTimeout(() => {
                    const newCount = repairUpdates.totalDiscardedCards;
                    updateDiscardPileVisual(newCount);
                    updateCountDisplay(newCount);
                }, 100);
            }
            
            return true;
        } else {
            return false;
        }
        
    } catch (error) {
        console.error('Game repair failed:', error);
        return false;
    }
}

// Repair discard pile inconsistencies
function repairDiscardPile(gameId, game, repairUpdates) {
    let needsRepair = false;
    
    console.log('Total discarded cards (stored):', game.totalDiscardedCards);
    
    // Check if discard count is inconsistent with game state
    const calculatedDiscardCount = calculateDiscardCountFromGameState(game);
    const storedDiscardCount = game.totalDiscardedCards || 0;
    
    
    if (calculatedDiscardCount !== storedDiscardCount) {
        
        // Use the calculated count as the source of truth
        repairUpdates.totalDiscardedCards = calculatedDiscardCount;
        
        // Also ensure individual discard fields are consistent
        if (game.presidentDiscardedCard && !game.presidentDiscardedCards) {
            repairUpdates.presidentDiscardedCards = [game.presidentDiscardedCard];
        }
        if (game.chancellorDiscardedCard && !game.chancellorDiscardedCards) {
            repairUpdates.chancellorDiscardedCards = [game.chancellorDiscardedCard];
        }
        
        needsRepair = true;
    } else {
    }
    
    return needsRepair;
}

// Repair stuck game phases
function repairStuckGamePhase(gameId, game, repairUpdates) {
    let needsRepair = false;

    // Check for stuck completed phase
    if (game.policyPhase === 'completed' && game.enactedPolicy) {
        // Don't repair if there's a pending superpower waiting to be used
        if (game.pendingSuperpower) {
            return false;
        }

        const timeSinceUpdate = game.updatedAt ? (Date.now() - game.updatedAt.toDate().getTime()) : 0;
        const isStuck = timeSinceUpdate > 10000; // 10 seconds

        if (isStuck) {
            
            // Clear policy phase artifacts
            repairUpdates.policyPhase = null;
            repairUpdates.enactedPolicy = null;
            repairUpdates.presidentDrawnCards = [];
            repairUpdates.currentChancellorPlayerId = null;
            repairUpdates.nominatedChancellorPlayerId = null;
            repairUpdates.voteResolution = null;
            repairUpdates.electionVotes = {};
            
            // Set term limits for next turn
            repairUpdates.termLimitLastChancellorId = game.currentChancellorPlayerId;
            repairUpdates.termLimitLastPresidentId = game.currentPresidentPlayerId;
            
            // Find next president
            const orderedAlive = (latestPlayers || [])
                .filter(p => p && p.alive !== false)
                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            
            if (orderedAlive.length > 0) {
                const currentIndex = orderedAlive.findIndex(p => p.id === game.currentPresidentPlayerId);
                const nextIndex = (currentIndex + 1) % orderedAlive.length;
                const nextPresident = orderedAlive[nextIndex];
                
                repairUpdates.presidentIndex = nextIndex;
                repairUpdates.currentPresidentPlayerId = nextPresident.id;
            }
            
            needsRepair = true;
        }
    }
    
    return needsRepair;
}

// Repair player state inconsistencies
function repairPlayerStates(gameId, game, players, repairUpdates) {
    let needsRepair = false;
    
    if (!players || players.length === 0) return false;
    
    // Check for players with missing orderIndex
    const playersNeedingOrder = players.filter(p => p && typeof p.orderIndex !== 'number');
    if (playersNeedingOrder.length > 0) {
        
        // Assign order indices based on current array order
        playersNeedingOrder.forEach((player, index) => {
            const playerRef = doc(db, 'games', gameId, 'players', player.id);
            updateDoc(playerRef, { orderIndex: index }).catch(console.error);
        });
        
        needsRepair = true;
    }
    
    // Check for dead players who shouldn't be dead
    const deadPlayers = players.filter(p => p && p.alive === false);
    if (deadPlayers.length > 0) {
        // Don't auto-repair dead players as this could be legitimate game state
    }
    
    return needsRepair;
}

// Repair policy count inconsistencies
function repairPolicyCounts(gameId, game, repairUpdates) {
    let needsRepair = false;
    
    // Check if policy counts are within valid ranges
    const liberalPolicies = game.liberalPolicies || 0;
    const fascistPolicies = game.fascistPolicies || 0;
    
    if (liberalPolicies > 5) {
        repairUpdates.liberalPolicies = 5;
        needsRepair = true;
    }
    
    if (fascistPolicies > 6) {
        repairUpdates.fascistPolicies = 6;
        needsRepair = true;
    }
    
    // Check if game should be over
    if (liberalPolicies >= 5 || fascistPolicies >= 6) {
        if (game.state === 'playing') {
            repairUpdates.state = 'completed';
            repairUpdates.winner = liberalPolicies >= 5 ? 'liberal' : 'fascist';
            needsRepair = true;
        }
    }
    
    return needsRepair;
}

// Repair election tracker issues
function repairElectionTracker(gameId, game, repairUpdates) {
    let needsRepair = false;

    const electionTracker = game.electionTracker || 0;

    // Check if election tracker is within valid range
    if (electionTracker < 0 || electionTracker > 3) {
        repairUpdates.electionTracker = Math.max(0, Math.min(3, electionTracker));
        needsRepair = true;
    }

    // Note: 3 failed elections should enact a chaos policy, not end the game
    // The chaos policy itself can end the game if it results in 5 liberal or 6 fascist policies

    return needsRepair;
}


// Detect common game issues
function detectGameIssues(gameId, game, players) {
    const issues = [];
    
    if (!game || !players) return issues;
    
    // Check discard pile consistency
    const calculatedDiscardCount = calculateDiscardCountFromGameState(game);
    const storedDiscardCount = game.totalDiscardedCards || 0;
    if (calculatedDiscardCount !== storedDiscardCount) {
        issues.push(`Discard pile count mismatch: calculated=${calculatedDiscardCount}, stored=${storedDiscardCount}`);
    }
    
    // Check for stuck phases
    if (game.policyPhase === 'completed' && game.enactedPolicy) {
        const timeSinceUpdate = game.updatedAt ? (Date.now() - game.updatedAt.toDate().getTime()) : 0;
        if (timeSinceUpdate > 10000) {
            issues.push(`Game stuck in completed phase for ${Math.round(timeSinceUpdate / 1000)} seconds`);
        }
    }
    
    // Check policy count validity
    const liberalPolicies = game.liberalPolicies || 0;
    const fascistPolicies = game.fascistPolicies || 0;
    if (liberalPolicies > 5) issues.push(`Invalid liberal policy count: ${liberalPolicies}`);
    if (fascistPolicies > 6) issues.push(`Invalid fascist policy count: ${fascistPolicies}`);
    
    // Check election tracker
    const electionTracker = game.electionTracker || 0;
    if (electionTracker < 0 || electionTracker > 3) {
        issues.push(`Invalid election tracker value: ${electionTracker}`);
    }
    
    // Check player consistency
    const playersWithoutOrder = players.filter(p => p && typeof p.orderIndex !== 'number');
    if (playersWithoutOrder.length > 0) {
        issues.push(`${playersWithoutOrder.length} players missing orderIndex`);
    }
    
    return issues;
}

// Enhanced periodic check to detect and fix stuck games using repair system
function startStuckGameChecker(gameId) {
    const checkInterval = setInterval(async () => {
        try {
            if (!latestGame || latestGame.state !== 'playing') return;
            
            // Check for any game issues that need repair
            const issues = detectGameIssues(gameId, latestGame, latestPlayers);
            if (issues.length > 0) {
                console.warn('Auto-detected game issues:', issues);
                
                // Only auto-repair if there are critical issues (stuck phases, invalid counts)
                const criticalIssues = issues.filter(issue => 
                    issue.includes('stuck') || 
                    issue.includes('Invalid') || 
                    issue.includes('mismatch')
                );
                
                if (criticalIssues.length > 0) {
                    try {
                        await repairGameState(gameId);
                    } catch (repairError) {
                        console.error('Auto-repair failed:', repairError);
                        
                        // Fallback to old stuck game handling
                        const phase = computePhase(latestGame);
                        if (phase === 'completed') {
                            const timeSinceUpdate = latestGame.updatedAt ? (Date.now() - latestGame.updatedAt.toDate().getTime()) : 0;
                            const isStuck = timeSinceUpdate > 15000; // 15 seconds
                            
                            if (isStuck) {
                                console.warn('Fallback: Auto-advancing stuck game in completed phase');
                                try {
                                    const gameRef = doc(db, 'games', gameId);
                                    await advanceToNextGovernment(gameId, gameRef);
                                } catch (advanceError) {
                                    console.error('Fallback advancement failed:', advanceError);
                                    await applyFallbackCleanup(gameId, gameRef);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in enhanced stuck game checker:', error);
        }
    }, 10000); // Check every 10 seconds (less aggressive than before)
    
    // Return the interval ID so it can be cleared later
    return checkInterval;
}