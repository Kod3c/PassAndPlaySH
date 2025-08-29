

import { app } from '../js/firebase.js';
import { onHistory, logPublic } from '../js/db.js?v=2';
import { getFirestore, doc, getDoc, onSnapshot, collection, query, orderBy, updateDoc, serverTimestamp, runTransaction, increment } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Import extracted utility functions
import { getGameId, hidePreloader, setPreloader, getYouPlayerId, formatTime } from './utils.js';
import { HEARTBEAT_INTERVAL_MS, RULE_KEYS } from './constants.js';
import { renderSlots, renderTracker, renderPlayers } from './renderers.js';
import { eligibleChancellorIds, canSeeEvent, setRoleBannerVisibility } from './helpers.js';
import { openOrderModal, closeOrderModal, openHistoryModal, closeHistoryModal } from './modals.js';

const db = getFirestore(app);
let latestGame = null;
let latestPlayers = [];
let historyUnsub = null;
let historyItems = [];
let localPaused = false;
let lastStatusMessage = null;
// Constant moved to constants.js
let heartbeatTimer = null;
let afkUnsub = null; let lastAfkSeenOrder = 0;
let isNominating = false; // Flag to prevent modal re-opening during nomination

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
                card.style.backgroundImage = type === 'liberal' ? "url('../images/liberal.png')" : "url('../images/facist.png')";
                // Let CSS handle the transform for responsive sizing
                card.style.zIndex = '3';
                card.style.zIndex = '3';
                slot.appendChild(card);
                slot.classList.add('filled');
                
                // Remove bullet overlay when slot is filled
                const bulletOverlay = slot.querySelector('.bullet-overlay');
                if (bulletOverlay) bulletOverlay.remove();
            } else {
                existing.style.backgroundImage = type === 'liberal' ? "url('../images/liberal.png')" : "url('../images/facist.png')";
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
    
    console.log(`🎯 Updating fascist slots for player count: ${playerCount}`);
    console.log(`📊 Container has ${containerEl.children.length} slots total`);
    
    // Clear any existing overlays in slots 1-3 first
    for (let i = 0; i < 3; i++) {
        const slot = containerEl.children[i];
        if (slot && !slot.classList.contains('filled')) {
            // Remove existing overlays
            const existingOverlays = slot.querySelectorAll('.eyeglass-overlay, .president-overlay, .trio-cards-overlay, .trio-cards-eye-overlay');
            if (existingOverlays.length > 0) {
                console.log(`🧹 Clearing ${existingOverlays.length} existing overlays from slot ${i + 1}`);
                existingOverlays.forEach(overlay => overlay.remove());
            }
        }
    }
    
    // Configure slots based on player count
    if (playerCount >= 5 && playerCount <= 6) {
        // 5-6 players: Slot 3 gets trio-cards-eye
        console.log('🔧 Applying 5-6 player configuration...');
        addTrioCardsEyeToSlot(containerEl.children[2]); // Slot 3 (index 2)
        console.log('✅ 5-6 player configuration: Slot 3 = trio-cards-eye');
        
    } else if (playerCount >= 7 && playerCount <= 8) {
        // 7-8 players: Slot 2 gets eyeglass, Slot 3 gets president
        console.log('🔧 Applying 7-8 player configuration...');
        addEyeglassToSlot(containerEl.children[1]); // Slot 2 (index 1)
        addPresidentToSlot(containerEl.children[2]); // Slot 3 (index 2)
        console.log('✅ 7-8 player configuration: Slot 2 = eyeglass, Slot 3 = president');
        
    } else if (playerCount >= 9 && playerCount <= 10) {
        // 9-10 players: Slots 1 & 2 get eyeglass, Slot 3 gets president
        console.log('🔧 Applying 9-10 player configuration...');
        addEyeglassToSlot(containerEl.children[0]); // Slot 1 (index 0)
        addEyeglassToSlot(containerEl.children[1]); // Slot 2 (index 1)
        addPresidentToSlot(containerEl.children[2]); // Slot 3 (index 2)
        console.log('✅ 9-10 player configuration: Slots 1&2 = eyeglass, Slot 3 = president');
        
    } else {
        console.warn(`⚠️ Unhandled player count: ${playerCount}. No slot configuration applied.`);
    }
    
    // Log final state for debugging
    for (let i = 0; i < 3; i++) {
        const slot = containerEl.children[i];
        if (slot) {
            const overlays = slot.querySelectorAll('.eyeglass-overlay, .president-overlay, .trio-cards-eye-overlay');
            const overlayTypes = Array.from(overlays).map(o => o.className.replace('-overlay', '')).join(', ');
            console.log(`🔍 Slot ${i + 1} final state: ${overlayTypes || 'no overlays'}`);
        }
    }
}

// Helper function to add eyeglass overlay to a slot
function addEyeglassToSlot(slot) {
    if (!slot) {
        console.warn('🚫 Cannot add eyeglass: slot is null');
        return;
    }
    if (slot.classList.contains('filled')) {
        console.log('⏭️ Skipping eyeglass on filled slot');
        return;
    }
    
    const existingOverlay = slot.querySelector('.eyeglass-overlay');
    if (existingOverlay) {
        console.log('ℹ️ Eyeglass overlay already exists');
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'eyeglass-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 32px;
        height: auto;
        pointer-events: none;
        z-index: 15;
        opacity: 1.0;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    `;
    
    // Create image element to handle loading errors
    const img = document.createElement('img');
    img.src = '../images/eyeglass.png';
    img.alt = 'Investigation Power';
    img.style.cssText = 'width: 100%; height: auto;';
    
    img.onload = () => console.log('✅ Eyeglass image loaded successfully');
    img.onerror = () => console.error('❌ Failed to load eyeglass.png');
    
    overlay.appendChild(img);
    slot.appendChild(overlay);
    console.log('👓 Eyeglass overlay added to fascist slot');
}

// Helper function to add president overlay to a slot
function addPresidentToSlot(slot) {
    if (!slot) {
        console.warn('🚫 Cannot add president: slot is null');
        return;
    }
    if (slot.classList.contains('filled')) {
        console.log('⏭️ Skipping president on filled slot');
        return;
    }
    
    const existingOverlay = slot.querySelector('.president-overlay');
    if (existingOverlay) {
        console.log('ℹ️ President overlay already exists');
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'president-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 32px;
        height: auto;
        pointer-events: none;
        z-index: 15;
        opacity: 1.0;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    `;
    
    // Create image element to handle loading errors
    const img = document.createElement('img');
    img.src = '../images/president.png';
    img.alt = 'Special Election Power';
    img.style.cssText = 'width: 100%; height: auto;';
    
    img.onload = () => console.log('✅ President image loaded successfully');
    img.onerror = () => console.error('❌ Failed to load president.png');
    
    overlay.appendChild(img);
    slot.appendChild(overlay);
    console.log('👑 President overlay added to fascist slot');
}

// Helper function to add trio-cards-eye overlay to a slot (for 5-6 players)
function addTrioCardsEyeToSlot(slot) {
    if (!slot || slot.classList.contains('filled')) return;
    
    const existingOverlay = slot.querySelector('.trio-cards-eye-overlay');
    if (!existingOverlay) {
        const overlay = document.createElement('div');
        overlay.className = 'trio-cards-eye-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 55%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 36.4px;
            height: auto;
            pointer-events: none;
            z-index: 15;
            opacity: 1.0;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        `;
        overlay.innerHTML = '<img src="../images/trio-cards-eye.png" alt="Policy Peek Power" style="width: 100%; height: auto;">';
        slot.appendChild(overlay);
        console.log('🔍 Trio-cards-eye overlay added to fascist slot');
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
        console.log(`🔄 Using fallback player count from latestPlayers.length: ${playerCount}`);
    }
    if (!playerCount || playerCount <= 0) {
        console.warn('No valid player count found for slot refresh, defaulting to 5');
        playerCount = 5; // Default fallback
    }
    
    console.log(`🎯 Final player count for slot update: ${playerCount}`);
    console.log(`🔄 Refreshing fascist slots for updated player count: ${playerCount}`);
    updateFascistSlotsForPlayerCount(fascistSlotsEl, playerCount);
}

// Manual debug function - call this from browser console to force update slots for testing
window.debugFascistSlots = function(testPlayerCount) {
    console.log('🧪 Manual fascist slots debug called');
    if (testPlayerCount) {
        console.log(`🎯 Testing with forced player count: ${testPlayerCount}`);
        const fascistSlotsEl = document.getElementById('fascist-slots');
        if (fascistSlotsEl) {
            updateFascistSlotsForPlayerCount(fascistSlotsEl, testPlayerCount);
        }
    } else {
        refreshFascistSlotsForPlayerCount();
    }
};

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
                background-image: url('../images/skull.png');
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
    
    // Dynamic slot configuration is now handled by updateFascistSlotsForPlayerCount()
    // Remove the old trio-cards overlay to prevent conflicts
    const thirdSlot = containerEl.children[2]; // Index 2 = 3rd slot
    if (thirdSlot) {
        const existingTrioCards = thirdSlot.querySelector('.trio-cards-overlay');
        if (existingTrioCards) {
            existingTrioCards.remove();
            console.log('🧹 Removed old trio-cards overlay to prevent conflicts');
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
            background-image: url('../images/skull.png');
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
            bulletOverlay.innerHTML = '<img src="../images/bullet.png" alt="Bullet" style="width: 100%; height: auto;">';
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
            background-image: url('../images/skull.png');
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
            bulletOverlay.innerHTML = '<img src="../images/bullet.png" alt="Bullet" style="width: 100%; height: auto;">';
            fifthSlot.appendChild(bulletOverlay);
            console.log('Bullet overlay added to 5th fascist slot');
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
    console.log(`🎯 Triggering superpower UI for: ${superpower.name}`);
    
    // Update game state to indicate superpower is pending
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
        pendingSuperpower: {
            type: superpower.type,
            name: superpower.name,
            description: superpower.description,
            slot: fascistSlot,
            activatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
    });

    // Show superpower modal to the president
    showSuperpowerModal(superpower, fascistSlot);
}

function showSuperpowerModal(superpower, fascistSlot) {
    // Check if user is the current president
    const youId = computeYouId(getGameId());
    const isPresident = latestGame && latestGame.currentPresidentPlayerId === youId;
    
    if (!isPresident) {
        // Show notification for non-president players
        setStatus(getGameId(), `${superpower.name} activated! President must use this power.`);
        return;
    }

    // Create modal for president
    const modal = document.createElement('div');
    modal.id = 'superpower-modal';
    modal.className = 'modal-overlay superpower-modal';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <div class="modal-title">🦸‍♂️ Executive Power Activated</div>
                <div class="modal-subtitle">Fascist Policy ${fascistSlot}</div>
            </div>
            <div class="modal-body">
                <div class="superpower-info">
                    <div class="superpower-name">${superpower.name}</div>
                    <div class="superpower-description">${superpower.description}</div>
                </div>
                <div class="superpower-actions">
                    <button id="activate-superpower-btn" class="btn btn-primary">Activate Power</button>
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

function handlePolicyPeek() {
    setStatus(getGameId(), 'Policy Peek: Examining the top 3 policy cards...');
    // TODO: Implement policy peek logic
    console.log('🔍 Policy Peek activated - showing top 3 cards to president');
}

function handleInvestigation() {
    setStatus(getGameId(), 'Investigation: President is investigating a player...');
    // TODO: Implement investigation logic  
    console.log('🔍 Investigation activated - president investigating player loyalty');
}

function handleSpecialElection() {
    setStatus(getGameId(), 'Special Election: President is choosing the next candidate...');
    // TODO: Implement special election logic
    console.log('🗳️ Special Election activated - president choosing next presidential candidate');
}

function handleExecution() {
    setStatus(getGameId(), 'Execution: President is choosing a player to execute...');
    // TODO: Implement execution logic
    console.log('💀 Execution activated - president executing a player');
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
        
        // Update fascist slots 1-3 based on player count
        let playerCount = latestGame?.playerCount;
        if (!playerCount || playerCount <= 0) {
            playerCount = (latestPlayers || []).length;
        }
        if (!playerCount || playerCount <= 0) {
            console.warn('No valid player count found for slot updates, defaulting to 5');
            playerCount = 5; // Default fallback
        }
        
        updateFascistSlotsForPlayerCount(fascistSlotsEl, playerCount);
    }

    const squares = document.querySelectorAll('#election-tracker .square');
    squares.forEach((sq, idx) => {
        if (et > idx) sq.classList.add('active');
        else sq.classList.remove('active');
    });

    // Update table spread count based on current game state
    const tableSpreadCount = calculateTableSpreadCountFromGameState(game);
    setTableSpreadCount(tableSpreadCount);
    console.log(`Table spread updated from game state: ${tableSpreadCount} cards remaining`);
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

function setStatus(gameId, message, delayMs = 0) {
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
                if (gameId && message && message !== lastStatusMessage) {
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
            if (gameId && message && message !== lastStatusMessage) {
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
        setStatus(gameId, `${pres ? (pres.name || 'President') : 'President'}: Draw 3 policy cards`);
        try { initSpreadPresidentDrawUI(gameId); } catch (_) {}
        // Clean up any existing overlays when entering president draw phase
        cleanupAllPolicyOverlays();
    } else {
        setStatus(gameId, 'Waiting for the President to draw policy cards…');
        try { teardownSpreadPresidentDrawUI(); } catch (_) {}
        // Clean up any existing overlays for non-presidents
        cleanupAllPolicyOverlays();
    }
}

function renderPhaseChancellorChoice(gameId, youId, game, players, actionsCenter) {
    const chancId = game.currentChancellorPlayerId || null;
    const chanc = players.find(p => p && p.id === chancId) || null;
    
    if (youId && youId === chancId) {
        setStatus(gameId, `${chanc ? (chanc.name || 'Chancellor') : 'Chancellor'}: Choose 1 policy to enact`);
        
        // Automatically show the chancellor choice overlay for the chancellor
        showChancellorChoiceOverlay(game);
        
        // Also show the button as a fallback in case they need to reopen it
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
        
    } else {
        setStatus(gameId, `Waiting for ${chanc ? (chanc.name || 'Chancellor') : 'Chancellor'} to choose a policy…`);
        // Clean up any existing overlays for non-chancellors
        cleanupAllPolicyOverlays();
    }
}

function renderPhaseCompleted(gameId, youId, game, players, actionsCenter) {
    // Clean up any remaining overlays when entering completed phase
    cleanupAllPolicyOverlays();
    
    const enactedPolicy = game.enactedPolicy;
    if (enactedPolicy) {
        setStatus(gameId, `${enactedPolicy === 'liberal' ? 'Liberal' : 'Fascist'} policy enacted! Policy phase completed.`);
    } else {
        setStatus(gameId, 'Policy phase completed. Waiting for next turn...');
    }
    
    // Add a manual advancement button in case automatic advancement fails
    const manualAdvanceBtn = document.createElement('button');
    manualAdvanceBtn.id = 'manual-advance-btn';
    manualAdvanceBtn.className = 'btn btn-primary';
    manualAdvanceBtn.textContent = 'Advance to Next Turn';
    manualAdvanceBtn.style.marginTop = '16px';
    manualAdvanceBtn.style.marginBottom = '16px';
    manualAdvanceBtn.style.display = 'block';
    manualAdvanceBtn.style.marginLeft = 'auto';
    manualAdvanceBtn.style.marginRight = 'auto';
    
    manualAdvanceBtn.addEventListener('click', async function() {
        try {
            console.log('Manual advancement triggered');
            manualAdvanceBtn.disabled = true;
            manualAdvanceBtn.textContent = 'Advancing...';
            
            const gameRef = doc(db, 'games', gameId);
            await advanceToNextGovernment(gameId, gameRef);
            
            // Success - button will be removed when phase changes
            manualAdvanceBtn.textContent = '✅ Advanced!';
        } catch (error) {
            console.error('Manual advancement failed:', error);
            manualAdvanceBtn.disabled = false;
            manualAdvanceBtn.textContent = '❌ Failed - Try Again';
            alert('Manual advancement failed: ' + error.message);
        }
    });
    
    actionsCenter.appendChild(manualAdvanceBtn);
}

// Chancellor choice overlay (similar to president's overlay)
function showChancellorChoiceOverlay(game) {
    const presidentCards = game.presidentDrawnCards || [];
    if (presidentCards.length !== 2) {
        console.error('Expected 2 president cards, got:', presidentCards.length);
        return;
    }
    
    // Build overlay similar to president's reveal overlay
    const overlayId = 'chancellor-choice-overlay';
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.className = 'reveal-overlay';
        document.body.appendChild(overlay);
    }
    
    // Add instruction banner
    const instr = document.createElement('div');
    instr.className = 'reveal-instruction';
                    instr.textContent = 'Click to flip, then select one to enact';
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
    const enactBtn = document.createElement('button');
    enactBtn.className = 'reveal-btn';
    enactBtn.textContent = 'Enact Selected Policy';
    enactBtn.disabled = true;
    actions.appendChild(enactBtn);
    overlay.appendChild(actions);
    
    const centerX = Math.round(window.innerWidth / 2);
    const centerY = Math.round(window.innerHeight / 2);
    // Responsive scale: reduce card size on narrow screens so overlays don't overwhelm UI
    const _vw = window.innerWidth || (document && document.documentElement && document.documentElement.clientWidth) || 0;
    let scale = 1.4;
    if (_vw <= 360) {
        scale = 0.95;
    } else if (_vw <= 640) {
        scale = 1.1;
    }
    
    const overlayCards = [];
    
    // Create two cards fanned out in an arc, starting face down
    presidentCards.forEach((policy, index) => {
        const clone = document.createElement('div');
        clone.className = 'reveal-card';
        clone.style.backgroundImage = 'url(../images/policy-back.png)'; // Start face down
        clone.style.cursor = 'pointer';
        clone.dataset.policy = policy; // Store the policy type for later
        clone.dataset.index = index; // Store the index
        
        // Fan the cards in an arc - left card rotated left, right card rotated right
        const angle = index === 0 ? -12 : 12; // Left card -12°, right card +12° (reduced rotation)
        const radius = 100; // Distance from center (reduced from 140)
        const cardAngle = (index - 0.5) * Math.PI / 4; // Spread over 45 degrees (reduced from 60)
        
        const targetX = centerX + Math.sin(cardAngle) * radius;
        const targetY = centerY - Math.cos(cardAngle) * radius;
        
        const finalLeft = Math.round(targetX - (92 * scale) / 2); // 92 is card width
        const finalTop = Math.round(targetY - (132 * scale) / 2); // 132 is card height
        
        clone.style.left = finalLeft + 'px';
        clone.style.top = finalTop + 'px';
        clone.style.transform = `scale(${scale}) rotate(${angle}deg)`;
        clone.style.transformOrigin = 'center center';
        clone.style.transition = 'transform 300ms ease-out, box-shadow 200ms ease-out';
        clone.dataset.originalTransform = `scale(${scale}) rotate(${angle}deg)`; // Store original transform
        
        overlay.appendChild(clone);
        overlayCards.push(clone);
        
        // Add click handler for flipping and selection
        clone.addEventListener('click', function() {
            if (!clone.classList.contains('flipped')) {
                // First click: flip both cards simultaneously
                // Prevent multiple simultaneous flips
                if (overlayCards.some(card => card.classList.contains('flipping'))) {
                    return;
                }
                flipAllCards();
            } else {
                // Second click: select/deselect the card
                if (clone.classList.contains('selected')) {
                    clone.classList.remove('selected');
                    clone.style.zIndex = ''; // Reset z-index
                } else {
                    // Deselect all cards first
                    overlayCards.forEach(c => {
                        c.classList.remove('selected');
                        c.style.zIndex = ''; // Reset z-index for all cards
                    });
                    // Select this card
                    clone.classList.add('selected');
                    clone.style.zIndex = '10'; // Bring selected card to front
                }
                updateEnactButtonState();
            }
        });
    });
    
    // Function to flip all cards simultaneously
    function flipAllCards() {
        console.log('Starting card flip animation...');
        
        // Mark all cards as flipping to prevent multiple simultaneous flips
        overlayCards.forEach(card => card.classList.add('flipping'));
        
        overlayCards.forEach((card, index) => {
            const policy = presidentCards[index];
            console.log(`Flipping card ${index}: ${policy} policy`);
            
            // Temporarily disable CSS transitions during the flip
            const originalTransition = card.style.transition;
            card.style.transition = 'none';
            
            // Start the flip animation for each card
            const originalTransform = card.dataset.originalTransform;
            console.log(`Card ${index} original transform:`, originalTransform);
            // Add rotateY(90deg) to the existing transform
            card.style.transform = originalTransform + ' rotateY(90deg)';
            console.log(`Card ${index} flipped transform:`, card.style.transform);
            
            // Halfway through the flip, change the image
            setTimeout(() => {
                console.log(`Card ${index} changing image to:`, policy);
                
                // Preload the image to ensure it's available
                const img = new Image();
                img.onload = () => {
                    card.style.backgroundImage = policy === 'liberal' ? 'url(../images/liberal.png)' : 'url(../images/facist.png)';
                    card.classList.add(policy);
                    card.classList.add('flipped');
                    card.classList.remove('flipping'); // Remove flipping class
                    console.log(`Card ${index} flipped classes:`, card.className);
                    
                    // Complete the flip - remove the rotateY(90deg) to return to original state
                    setTimeout(() => {
                        console.log(`Card ${index} completing flip, restoring transform:`, originalTransform);
                        card.style.transform = originalTransform;
                        // Re-enable CSS transitions
                        card.style.transition = originalTransition;
                    }, 200);
                };
                
                // Safety timeout to ensure cards are always restored
                setTimeout(() => {
                    if (card.classList.contains('flipping')) {
                        console.warn(`Card ${index} still flipping after timeout, forcing completion`);
                        card.classList.remove('flipping');
                        card.style.transform = originalTransform;
                        card.style.transition = originalTransition;
                    }
                }, 1000);
                img.onerror = () => {
                    console.error(`Failed to load image for ${policy} policy`);
                    // Still complete the flip even if image fails
                    card.classList.add(policy);
                    card.classList.add('flipped');
                    card.classList.remove('flipping');
                    
                    // Fallback: ensure card is visible with a colored background
                    if (policy === 'liberal') {
                        card.style.backgroundColor = 'var(--liberal-blue)';
                        card.style.backgroundImage = 'none';
                    } else {
                        card.style.backgroundColor = 'var(--fascist-red)';
                        card.style.backgroundImage = 'none';
                    }
                    
                    setTimeout(() => {
                        card.style.transform = originalTransform;
                        card.style.transition = originalTransition;
                    }, 200);
                };
                
                // Safety timeout for error case too
                setTimeout(() => {
                    if (card.classList.contains('flipping')) {
                        console.warn(`Card ${index} still flipping after error timeout, forcing completion`);
                        card.classList.remove('flipping');
                        card.style.transform = originalTransform;
                        card.style.transition = originalTransition;
                    }
                }, 1000);
                img.src = policy === 'liberal' ? '../images/liberal.png' : '../images/facist.png';
            }, 200);
        });
    }
    
    // Update enact button state
    function updateEnactButtonState() {
        const flipped = overlayCards.filter(c => c.classList.contains('flipped'));
        const selected = overlayCards.filter(c => c.classList.contains('selected'));
        
        // Only enable enact button when both cards are flipped AND one is selected
        enactBtn.disabled = (flipped.length !== 2 || selected.length !== 1);
    }
    
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
    
    updateEnactButtonState();
}

// Clean up all policy-related overlays
function cleanupAllPolicyOverlays() {
    // Clean up chancellor choice overlay
    const chancellorOverlay = document.getElementById('chancellor-choice-overlay');
    if (chancellorOverlay && chancellorOverlay.parentNode) {
        chancellorOverlay.parentNode.removeChild(chancellorOverlay);
    }
    
    // Clean up president draw overlay
    const presidentOverlay = document.getElementById('reveal-overlay');
    if (presidentOverlay && presidentOverlay.parentNode) {
        presidentOverlay.parentNode.removeChild(presidentOverlay);
    }
    
    // Clean up any spread tooltips
    const spreadTooltip = document.getElementById('spread-tooltip');
    if (spreadTooltip && spreadTooltip.parentNode) {
        spreadTooltip.parentNode.removeChild(spreadTooltip);
    }
    
    // Reset spread state
    spreadPDRevealed = 0;
    spreadPDAssigned = null;
    spreadFanShown = false;
    spreadPDListeners = false;
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
              clone.style.backgroundImage = 'url(../images/policy-back.png)'; // Start face down
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
                          clone.style.backgroundImage = policy === 'liberal' ? 'url(../images/liberal.png)' : 'url(../images/facist.png)';
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

// Helper function to update game state after president draws cards
async function updateGameStateAfterPresidentDraw(selectedPolicies, discardedPolicy) {
    const gameId = getGameId();
    console.log('updateGameStateAfterPresidentDraw called with:', { gameId, selectedPolicies, discardedPolicy });
    
    if (!gameId) {
        throw new Error('Game ID not found');
    }
    
    if (!latestGame) {
        throw new Error('Game data not loaded yet');
    }
    
    console.log('Current game state:', latestGame);
    
    try {
        // Update the game document to reflect that cards have been drawn
        const gameRef = doc(db, 'games', gameId);
        console.log('Updating game document:', gameRef.path);
        
        const updateData = {
            policyPhase: 'chancellor_choice',
            presidentDrawnCards: selectedPolicies,
            presidentDiscardedCard: discardedPolicy,
            updatedAt: serverTimestamp()
        };
        
        console.log('Update data:', updateData);
        
        await updateDoc(gameRef, updateData);
        console.log('Game document updated successfully');
        
        // Log the action
        console.log('Logging public action...');
        await logPublic(gameId, `President drew 3 policy cards and discarded 1 ${discardedPolicy} policy`, {
            type: 'policy_draw',
            actorId: latestGame.currentPresidentPlayerId,
            selectedPolicies: selectedPolicies,
            discardedPolicy: discardedPolicy
        });
        console.log('Public action logged successfully');
        
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
    console.log('Adding discarded card to discard pile');
    
    // Use our dynamic discard pile module to increment the count
    incrementDiscardCount();
    
    console.log('Discarded card added successfully');
}

// Helper function for chancellor to enact a policy
async function enactPolicyAsChancellor(enactedPolicy, discardedPolicy) {
    const gameId = getGameId();
    if (!gameId || !latestGame) {
        throw new Error('Game not found');
    }
    
    try {
        console.log('Enacting policy:', enactedPolicy, 'Discarded:', discardedPolicy);
        console.log('Current game state before update:', latestGame);
        
        // Update the game document to reflect the enacted policy
        const gameRef = doc(db, 'games', gameId);
        const updates = {
            policyPhase: 'completed',
            enactedPolicy: enactedPolicy,
            chancellorDiscardedCard: discardedPolicy,
            updatedAt: serverTimestamp()
        };
        
        // Increment the appropriate policy counter
        if (enactedPolicy === 'liberal') {
            updates.liberalPolicies = increment(1);
        } else if (enactedPolicy === 'fascist') {
            updates.fascistPolicies = increment(1);
        }
        
        console.log('Updating game with:', updates);
        await updateDoc(gameRef, updates);
        console.log('Policy enacted successfully');
        
        // Log the action
        await logPublic(gameId, `Chancellor enacted a ${enactedPolicy} policy`, {
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
        
        console.log(`Table spread updated after policy enactment: ${newTableSpreadCount} cards remaining`);
        
        // Check if this triggers executive powers
        const newLiberalCount = (latestGame.liberalPolicies || 0) + (enactedPolicy === 'liberal' ? 1 : 0);
        const newFascistCount = (latestGame.fascistPolicies || 0) + (enactedPolicy === 'fascist' ? 1 : 0);
        
        // Only trigger superpowers if a fascist policy was enacted
        if (enactedPolicy === 'fascist') {
            const playerCount = latestGame.playerCount || (latestPlayers || []).length;
            const superpower = getSuperpowerForSlot(newFascistCount, playerCount);
            
            if (superpower) {
                console.log(`🦸‍♂️ Superpower triggered: ${superpower.name} for slot ${newFascistCount} with ${playerCount} players`);
                
                // Log the superpower activation
                await logPublic(gameId, `${superpower.name} activated! President must use this power.`, {
                    type: 'superpower_activated',
                    superpower: superpower.name,
                    fascistPolicies: newFascistCount,
                    playerCount: playerCount
                });
                
                // Trigger the superpower UI
                await triggerSuperpowerUI(gameId, superpower, newFascistCount);
            }
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

// Separate function to advance to next government
async function advanceToNextGovernment(gameId, gameRef) {
    console.log('Advancing to next government...');
    
    // Get fresh game state
    const gameSnap = await getDoc(gameRef);
    if (!gameSnap.exists()) {
        throw new Error('Game no longer exists');
    }
    const currentGame = gameSnap.data();
    
    const prevChancellorId = currentGame.currentChancellorPlayerId || null;
    const prevPresidentId = currentGame.currentPresidentPlayerId || null;
    
    console.log('Previous chancellor:', prevChancellorId);
    console.log('Previous president:', prevPresidentId);
    console.log('Current players:', latestPlayers);
    
    // Get alive players and sort by orderIndex
    const orderedAlive = (latestPlayers || [])
        .filter(p => p && p.alive !== false)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    console.log('Ordered alive players:', orderedAlive);
    
    if (orderedAlive.length === 0) {
        console.error('No alive players found!');
        throw new Error('No alive players found');
    }
    
    // Find current president index
    const currentPresidentId = currentGame.currentPresidentPlayerId;
    const currentIndex = orderedAlive.findIndex(p => p.id === currentPresidentId);
    
    console.log('Current president ID:', currentPresidentId);
    console.log('Current president index:', currentIndex);
    
    if (currentIndex === -1) {
        console.error('Current president not found in alive players!');
        // Fallback: use the first player as next president
        const nextPresident = orderedAlive[0];
        console.log('Using fallback next president:', nextPresident);
        
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
        console.log('Fallback government advancement completed');
        
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
    
    // Calculate next president index
    const nextIndex = (currentIndex + 1) % orderedAlive.length;
    const nextPresident = orderedAlive[nextIndex];
    
    console.log('Next president index:', nextIndex);
    console.log('Next president:', nextPresident);
    
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

    console.log('Advancing with updates:', advanceUpdates);
    await updateDoc(gameRef, advanceUpdates);
    console.log('Government advancement completed successfully');
    
    // Clean up any remaining overlays after advancing
    cleanupAllPolicyOverlays();

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
    console.log('Applying fallback cleanup to prevent getting stuck...');
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
        console.log('Fallback cleanup applied successfully');
        
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
    console.log('Rendering actions for phase:', phase, 'Game state:', {
        policyPhase: game.policyPhase,
        enactedPolicy: game.enactedPolicy,
        currentPresident: game.currentPresidentPlayerId,
        currentChancellor: game.currentChancellorPlayerId,
        voteResolution: game.voteResolution
    });
    
    if (phase === 'nomination') {
        // Clean up any lingering overlays when entering nomination phase
        cleanupAllPolicyOverlays();
        return renderPhaseNomination(gameId, youId, game, players, actionsCenter);
    }
    if (phase === 'voting') return renderPhaseVoting(gameId, youId, game, players, actionsCenter);
    if (phase === 'president_draw') return renderPhasePresidentDraw(gameId, youId, game, players, actionsCenter);
    if (phase === 'chancellor_choice') return renderPhaseChancellorChoice(gameId, youId, game, players, actionsCenter);
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
        
        // Update fascist slots 1-3 based on player count (using fallback for initial render)
        let playerCount = latestGame?.playerCount;
        if (!playerCount || playerCount <= 0) {
            playerCount = (latestPlayers || []).length;
        }
        if (!playerCount || playerCount <= 0) {
            console.warn('No valid player count found for initial slot setup, defaulting to 5');
            playerCount = 5; // Default fallback
        }
        
        updateFascistSlotsForPlayerCount(fascistSlots, playerCount);
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

    function renderHistory() {
        if (!historyBody) return;
        historyBody.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.gap = '8px';

        const visibleItems = (historyItems || []).filter(evt => canSeeEvent(evt, youPlayerDoc()));

        if (visibleItems.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'No history yet.';
            historyBody.appendChild(p);
            return;
        }

        visibleItems.forEach((evt) => {
            const row = document.createElement('div');
            row.className = 'order-item';
            const left = document.createElement('div');
            left.className = 'order-left';
            const time = document.createElement('div');
            time.className = 'order-num';
            time.textContent = formatTime(evt.ts);
            const msg = document.createElement('div');
            msg.style.fontWeight = '800';
            msg.textContent = evt.message || '';
            left.appendChild(time);
            left.appendChild(msg);
            row.appendChild(left);

            const right = document.createElement('div');
            right.className = 'order-right';
            const tag = document.createElement('span');
            tag.className = 'badge-pres';
            tag.textContent = (evt.visibility || 'public').toUpperCase();
            right.appendChild(tag);
            row.appendChild(right);

            wrap.appendChild(row);
        });
        historyBody.appendChild(wrap);
    }

    // Function moved to modals.js

    // Function moved to modals.js
            orderBtn?.addEventListener('click', () => openOrderModal(latestPlayers, latestGame, orderBody, orderModal, setRoleBannerVisibility));
orderClose?.addEventListener('click', () => closeOrderModal(orderModal, setRoleBannerVisibility));
orderModal?.addEventListener('click', function(e) { if (e.target === orderModal) closeOrderModal(orderModal, setRoleBannerVisibility); });

// Role envelope event listener
const roleEnvelope = document.getElementById('role-envelope');
roleEnvelope?.addEventListener('click', openRoleOverlay);

    // Function moved to modals.js

    // Function moved to modals.js
    historyBtn?.addEventListener('click', () => openHistoryModal(historyModal, historyBody, historyUnsub, gid, onHistory, historyItems, canSeeEvent, formatTime, setRoleBannerVisibility));
    historyClose?.addEventListener('click', () => closeHistoryModal(historyModal, setRoleBannerVisibility, historyUnsub));
    historyModal?.addEventListener('click', function(e) { if (e.target === historyModal) closeHistoryModal(historyModal, setRoleBannerVisibility, historyUnsub); });

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
        const ids = eligibleChancellorIds(latestGame, latestPlayers || []);
        if (!ids.length) {
            const p = document.createElement('p');
            p.textContent = 'No eligible candidates right now.';
            nominationBody.appendChild(p);
        } else {
            const list = document.createElement('div');
            list.style.display = 'grid';
            list.style.gridTemplateColumns = '1fr 1fr';
            list.style.gap = '10px';
            ids.forEach(id => {
                const pl = (latestPlayers || []).find(pp => pp && pp.id === id);
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary';
                btn.style.width = '100%';
                btn.style.minHeight = '56px';
                btn.style.fontSize = '1rem';
                btn.setAttribute('data-nominate', id);
                btn.textContent = pl ? (pl.name || 'Player') : 'Player';
                list.appendChild(btn);
            });
            // If odd count, center the last button across both columns
            if (ids.length % 2 === 1) {
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
    console.log('🚀 openRoleOverlay called');
    const roleOverlay = document.getElementById('role-overlay');
    const roleText = document.getElementById('role-text');
    const membershipBtn = document.getElementById('membership-btn');
    const roleBtn = document.getElementById('role-btn');
    const compatriotsBtn = document.getElementById('compatriots-btn');
    const doneBtn = document.getElementById('role-done-btn');
    
    console.log('🔍 Found elements:', {
        roleOverlay: !!roleOverlay,
        roleText: !!roleText,
        membershipBtn: !!membershipBtn,
        roleBtn: !!roleBtn,
        compatriotsBtn: !!compatriotsBtn,
        doneBtn: !!doneBtn
    });
    
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
    
    // Set up button states and permissions
    console.log('🎯 Setting up button permissions for player:', youPlayer?.role + ' (' + youPlayer?.party + ')');
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
    console.log('🔍 setupButtonPermissions called with:', {
        youPlayer: youPlayer?.role + ' (' + youPlayer?.party + ')',
        gamePlayerCount: game?.playerCount,
        latestPlayersLength: (latestPlayers || []).length
    });
    
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
    
    // Log the current state for debugging
    console.log('Setting up button permissions:', {
        gamePlayerCount: game.playerCount,
        fallbackPlayerCount: playerCount,
        latestPlayersLength: latestPlayers.length,
        gameState: game.state,
        youPlayerRole: youPlayer.role,
        youPlayerParty: youPlayer.party
    });
    
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
    
    // Debug logging to help troubleshoot
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
    
    // Membership and role start enabled but censored (showing placeholder text)
    membershipBtn.disabled = false;
    roleBtn.disabled = false;
    membershipBtn.style.opacity = '1';
    roleBtn.style.opacity = '1';
    membershipBtn.title = 'Click to reveal your party membership';
    roleBtn.title = 'Click to reveal your secret role';
    
    // Comrades button visibility and permissions
    const roleActionsMain = document.querySelector('.role-actions-main');
    console.log('🔍 Found roleActionsMain:', !!roleActionsMain);
    
    if (isFascist) {
        console.log('🎯 Player is Fascist, checking player count:', playerCount);
        // Show comrades button for Fascists at 5+ players
        // At 5-6 players: All Fascists (including Hitler) know each other
        // At 7+ players: Fascists know each other, but Hitler doesn't know them
        if (playerCount >= 5) {
            console.log('✅ Enabling comrades button for Fascist at', playerCount, 'players');
            compatriotsBtn.style.removeProperty('display');
            compatriotsBtn.disabled = false;
            compatriotsBtn.style.opacity = '1';
            compatriotsBtn.title = 'View your Fascist allies';
            roleActionsMain?.classList.remove('comrades-hidden');
            console.log('🔧 Button state after enabling:', {
                display: compatriotsBtn.style.display,
                disabled: compatriotsBtn.disabled,
                opacity: compatriotsBtn.style.opacity,
                roleActionsMainClasses: roleActionsMain?.classList.toString()
            });
            
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
            console.log('❌ Hiding comrades button for Fascist at', playerCount, 'players (need 5+ players)');
            compatriotsBtn.style.display = 'none';
            roleActionsMain?.classList.add('comrades-hidden');
        }
    } else {
        // Show comrades button for Liberals with fun message
        console.log('🎭 Enabling comrades button for Liberal player');
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

        const repairBtn = document.createElement('button');
        repairBtn.id = 'repair-game-btn';
        repairBtn.className = 'btn';
        repairBtn.textContent = '🔧 Repair Game State';
        list.appendChild(repairBtn);

        const quitBtn = document.createElement('button');
        quitBtn.id = 'quit-game-btn';
        quitBtn.className = 'btn';
        quitBtn.textContent = '⚠️ Quit Game for Everyone';
        list.appendChild(quitBtn);

        // Add duplicate game button only for host (seat 1)
        const you = youPlayerDoc();
        if (you && you.seat === 1) {
            const duplicateBtn = document.createElement('button');
            duplicateBtn.id = 'duplicate-game-btn';
            duplicateBtn.className = 'btn';
            duplicateBtn.textContent = '🔄 End and Duplicate Game';
            list.appendChild(duplicateBtn);
        }

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
            const ok = confirm('This will end the game for everyone. Are you sure?');
            if (!ok) return;
            try {
                await updateDoc(doc(db, 'games', gid), { state: 'cancelled', updatedAt: serverTimestamp() });
                try { await logPublic(gid, `Game ended by ${yourName}`, { type: 'end', actorId: youId || null }); } catch (_) {}
            } catch (err) {
                console.error('Failed to end game', err);
            } finally {
                closeMenuModal();
                window.location.href = '../index.html';
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

        if (t.id === 'repair-game-btn') {
            try {
                repairBtn.disabled = true;
                repairBtn.textContent = '🔧 Repairing...';
                
                const repaired = await repairGameState(gid);
                
                if (repaired) {
                    repairBtn.textContent = '✅ Repaired!';
                    setTimeout(() => {
                        repairBtn.textContent = '🔧 Repair Game State';
                        repairBtn.disabled = false;
                    }, 2000);
                } else {
                    repairBtn.textContent = '✅ No Issues Found';
                    setTimeout(() => {
                        repairBtn.textContent = '🔧 Repair Game State';
                        repairBtn.disabled = false;
                    }, 2000);
                }
                
                // Don't close modal - let user see the result
            } catch (err) {
                console.error('Game repair failed:', err);
                repairBtn.textContent = '❌ Repair Failed';
                repairBtn.disabled = false;
                setTimeout(() => {
                    repairBtn.textContent = '🔧 Repair Game State';
                }, 3000);
            }
            return;
        }

        if (t.id === 'duplicate-game-btn') {
            const ok = confirm('This will end the current game and create a new one with the same players. Are you sure?');
            if (!ok) return;
            
            try {
                // Collect current game data
                const currentGame = latestGame;
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
                
                // End the current game
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
                
                // Close modal and redirect to create page with pre-filled data
                closeMenuModal();
                
                // Build URL with game data
                const params = new URLSearchParams();
                params.set('duplicate', 'true');
                params.set('gameName', currentGame?.name || 'Secret Hitler Game');
                params.set('playerCount', String(sortedPlayers.length));
                params.set('playerNames', sortedPlayers.join(','));
                
                // Note: Host password is not preserved for security reasons
                // Users will need to set a new password if desired
                
                // Redirect to create page
                window.location.href = `../pages/create.html?${params.toString()}`;
                
            } catch (err) {
                console.error('Failed to duplicate game:', err);
                alert('Failed to duplicate game. Please try again.');
            }
            return;
        }
    });

    if (!gid) { setStatus('', 'Missing game id'); hidePreloader(); return; }

    const gameRef = doc(db, 'games', gid);
    let gameReady = false;
    let playersReady = false;
    function maybeHide() {
        if (gameReady && playersReady) hidePreloader();
    }
    const snap = await getDoc(gameRef);
    if (!snap.exists()) { setStatus(gid, 'Game not found'); hidePreloader(); return; }
    setStatus(gid, 'Game in progress');

    onSnapshot(gameRef, (s) => {
        latestGame = s.exists() ? s.data() : null;
        if (!latestGame) { setStatus(gid, 'Game unavailable'); hidePreloader(); return; }
        if (latestGame.state === 'cancelled') { 
            setStatus(gid, 'Game cancelled'); 
            hidePreloader();
            // Redirect all players to join page when game is cancelled
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
        console.log(`Table spread initialized from game state: ${tableSpreadCount} cards remaining`);
        
        // Update player strip highlights if ids available
        renderPlayers(playersStrip, latestPlayers.map(p => ({
            ...p,
            isPresident: latestGame && (latestGame.currentPresidentPlayerId === p.id),
            isChancellor: latestGame && (latestGame.currentChancellorPlayerId === p.id)
        })));
        // Update policy counters and election tracker if present
        updateFromGame(latestGame);
        
        // Refresh fascist slot superpowers based on current player count
        console.log('🔄 About to call refreshFascistSlotsForPlayerCount() from game update');
        refreshFascistSlotsForPlayerCount();
        
        // Update floating role banner for this device
        updateRoleBanner(latestGame, gid);
        updateRoleEnvelope(latestGame, gid);
        
        // Refresh role overlay permissions if it's currently open
        refreshRoleOverlayPermissions();
        // Update actions (nomination UI etc.)
        renderActions(gid);
        // Attempt resolve vote if complete
        maybeResolveElectionVote(gid);
        
        // Reset nomination flag when we detect the phase has changed from nomination to voting
        if (latestGame && latestGame.nominatedChancellorPlayerId && isNominating) {
            // We've moved from nomination to voting phase, reset the flag
            isNominating = false;
        }
        
        // Check for game issues and show repair button if needed
        if (latestPlayers && latestPlayers.length > 0) {
            const issues = detectGameIssues(gid, latestGame, latestPlayers);
            const repairBtn = document.getElementById('repair-game-main-btn');
            if (repairBtn) {
                if (issues.length > 0) {
                    repairBtn.style.display = 'block';
                    repairBtn.title = `Repair ${issues.length} detected issues`;
                } else {
                    repairBtn.style.display = 'none';
                }
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
        updateRoleEnvelope(latestGame, gid);
        
        // Refresh fascist slot superpowers when player list updates
        console.log('🔄 About to call refreshFascistSlotsForPlayerCount() from player update');
        refreshFascistSlotsForPlayerCount();
        
        // Refresh role overlay permissions if it's currently open
        refreshRoleOverlayPermissions();
        
        // Re-render history when players (and thus your party) resolves
        renderHistory();
        // Update actions when players change (eligibility)
        renderActions(gid);
        // Attempt to resolve election when players/votes change
        maybeResolveElectionVote(gid);
        playersReady = true;
        maybeHide();
    });

    // Removed redirect for help-btn; now opens in-game modal

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
            
            // Try to resolve the election immediately after this vote
            maybeResolveElectionVote(gid);
        } catch (err) {
            console.error('Failed to submit vote', err);
        }
    });

    // Helper: resolve election when enough votes are in to determine outcome
    let lastResolvedNomineeId = null;
    async function maybeResolveElectionVote(gameId) {
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
            // Note: 50/50 is a failed election (nein >= majority threshold)
            const remainingVotes = totalVoters - numVotes;
            const canPass = ja > (totalVoters / 2);
            const canFail = nein >= Math.ceil((totalVoters + 1) / 2); // nein >= majority threshold
            
            // Log early resolution attempt
            console.log(`Election check: ${ja} Ja, ${nein} Nein, ${numVotes}/${totalVoters} votes. Can pass: ${canPass}, Can fail: ${canFail}`);
            
            // If we can't resolve early, wait for more votes
            if (!canPass && !canFail && numVotes < totalVoters) {
                console.log('Waiting for more votes - outcome still uncertain');
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
                    payload.electionTracker = 0;
                    payload.currentChancellorPlayerId = currentNominee;
                    payload.nominatedChancellorPlayerId = null;
                    // Optional: set term limits for next nomination phase
                    payload.termLimitLastPresidentId = g.currentPresidentPlayerId || null;
                    payload.termLimitLastChancellorId = currentNominee;
                } else {
                    payload.electionTracker = (typeof g.electionTracker === 'number' ? g.electionTracker : 0) + 1;
                    // Clear failed nominee
                    payload.nominatedChancellorPlayerId = null;
                }
                tx.update(gameRef, payload);
                return { ja, nein, passed };
            });

            if (outcome) {
                lastResolvedNomineeId = nomineeId;
                console.log(`Election resolved: ${outcome.passed ? 'PASSED' : 'FAILED'} with ${outcome.ja} Ja / ${outcome.nein} Nein votes`);
                try {
                    if (outcome.passed) {
                        await logPublic(gameId, `Election passed: ${outcome.ja} Ja / ${outcome.nein} Nein`, { type: 'vote' });
                    } else {
                        await logPublic(gameId, `Election failed: ${outcome.nein} Nein / ${outcome.ja} Ja`, { type: 'vote' });
                        await logPublic(gameId, 'Election tracker advanced by 1', { type: 'system' });
                    }
                } catch (_) {}
            }
        } catch (err) {
            console.error('Failed to resolve election vote', err);
        }
    }

    // Debug button handler
    const debugBtn = document.getElementById('debug-btn');
    if (debugBtn) {
        debugBtn.addEventListener('click', function() {
            debugGameState(gid);
        });
    }

});

// ===== DYNAMIC DISCARD PILE MODULE =====

// Card configuration data - memorized visual order
const DISCARD_CARD_CONFIG = [
    { translateY: -2, rotate: -15, zIndex: 2, className: 'policy-on-discard' },
    { translateY: -3, rotate: 12, zIndex: 3, className: 'policy-on-discard-top' },
    { translateY: -4, rotate: -8, zIndex: 4, className: 'policy-on-discard-2' },
    { translateY: -5, rotate: 18, zIndex: 5, className: 'policy-on-discard-3' },
    { translateY: -6, rotate: -22, zIndex: 6, className: 'policy-on-discard-4' },
    { translateY: -7, rotate: 6, zIndex: 7, className: 'policy-on-discard-5' },
    { translateY: -8, rotate: -14, zIndex: 8, className: 'policy-on-discard-6' },
    { translateY: -9, rotate: 20, zIndex: 9, className: 'policy-on-discard-7' },
    { translateY: -10, rotate: -10, zIndex: 10, className: 'policy-on-discard-8' },
    { translateY: -11, rotate: 16, zIndex: 11, className: 'policy-on-discard-9' },
    { translateY: -12, rotate: -25, zIndex: 12, className: 'policy-on-discard-10' }
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
        card.style.transform = `translateY(${config.translateY}px) rotate(${config.rotate}deg) scale(${RESPONSIVE_SCALES.base})`;
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
            console.log(`Discard count persisted to database: ${currentDiscardCount}`);
            
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
    
    console.log(`Discard count increased to: ${currentDiscardCount}`);
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
                console.log(`Discard count decreased in database: ${currentDiscardCount}`);
                
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
        
        console.log(`Discard count decreased to: ${currentDiscardCount}`);
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
        console.log(`Table spread updated after deck reshuffle: ${newTableSpreadCount} cards remaining`);
    }
    
    // Reset the cumulative discard count in the database when deck is reshuffled
    try {
        const gameId = getGameId();
        if (gameId && latestGame) {
            const gameRef = doc(db, 'games', gameId);
            await updateDoc(gameRef, {
                totalDiscardedCards: 0,
                presidentDiscardedCard: null,
                chancellorDiscardedCard: null,
                updatedAt: serverTimestamp()
            });
            console.log(`Discard count reset in database (deck reshuffled)`);
        }
    } catch (error) {
        console.error('Failed to reset discard count in database:', error);
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
        console.log(`Table spread updated after discard count load: ${newTableSpreadCount} cards remaining`);
    }
    
    console.log(`Discard count set to: ${currentDiscardCount}`);
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
    
    console.log(`Calculated discard count from game state: ${count}`);
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

// Manual force refresh function for debugging
function forceRefreshDiscardPile() {
    console.log('=== FORCE REFRESH DISCARD PILE ===');
    const gameId = getGameId();
    console.log('Game ID:', gameId);
    console.log('Latest Game:', latestGame);
    console.log('Current Discard Count:', currentDiscardCount);
    
    if (latestGame) {
        const calculatedCount = calculateDiscardCountFromGameState(latestGame);
        console.log('Calculated count from game state:', calculatedCount);
        console.log('Stored count in game:', latestGame.totalDiscardedCards);
        
        // Force update the visual
        setDiscardCount(calculatedCount);
        updateDiscardPileVisual(calculatedCount);
        updateCountDisplay(calculatedCount);
        
        console.log('Force refresh completed. New count:', calculatedCount);
    } else {
        console.log('No game data available');
    }
    console.log('=== END FORCE REFRESH ===');
}

// Make it globally accessible for console debugging
window.forceRefreshDiscardPile = forceRefreshDiscardPile;

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
        console.log(`Table spread count increased to: ${currentTableSpreadCount}`);
    }
}

// Function to decrement table spread count
function decrementTableSpreadCount() {
    if (currentTableSpreadCount > 0) {
        currentTableSpreadCount--;
        updateTableSpreadVisual(currentTableSpreadCount);
        console.log(`Table spread count decreased to: ${currentTableSpreadCount}`);
    }
}

// Function to set table spread count
function setTableSpreadCount(count) {
    currentTableSpreadCount = Math.max(0, Math.min(count, TABLE_SPREAD_CONFIG.length));
    updateTableSpreadVisual(currentTableSpreadCount);
    console.log(`Table spread count set to: ${currentTableSpreadCount}`);
}

// Function to calculate table spread count from game state
function calculateTableSpreadCountFromGameState(game) {
    if (!game) return 0;
    
    console.log(`=== TABLE SPREAD CALCULATION ===`);
    console.log(`Full game object:`, game);
    
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
    
    console.log(`Liberal policies enacted: ${game.liberalPolicies || 0}`);
    console.log(`Fascist policies enacted: ${game.fascistPolicies || 0}`);
    console.log(`Total discarded cards: ${game.totalDiscardedCards || 0}`);
    console.log(`Current policy stack: ${game.currentPolicyStack?.length || 0}`);
    console.log(`Calculated remaining cards: ${remainingCards}`);
    console.log(`================================`);
    
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

// Manual force refresh function for debugging table spread
function forceRefreshTableSpread() {
    console.log('=== FORCE REFRESH TABLE SPREAD ===');
    const gameId = getGameId();
    console.log('Game ID:', gameId);
    console.log('Latest Game:', latestGame);
    console.log('Current Table Spread Count:', currentTableSpreadCount);
    
    if (latestGame) {
        const calculatedCount = calculateTableSpreadCountFromGameState(latestGame);
        console.log('Calculated count from game state:', calculatedCount);
        
        // Force update the visual
        setTableSpreadCount(calculatedCount);
        
        console.log('Force refresh completed. New count:', calculatedCount);
    } else {
        console.log('No game data available');
    }
    console.log('=== END FORCE REFRESH ===');
}

// Make it globally accessible for console debugging
window.forceRefreshTableSpread = forceRefreshTableSpread;

// ===== END DYNAMIC TABLE SPREAD MODULE =====

// Comprehensive game repair and diagnostic system
async function repairGameState(gameId) {
    console.log('=== GAME REPAIR SYSTEM ACTIVATED ===');
    
    if (!gameId || !latestGame) {
        console.error('Cannot repair: missing game ID or game data');
        return false;
    }
    
    try {
        const gameRef = doc(db, 'games', gameId);
        const repairUpdates = {};
        let repairsApplied = 0;
        
        console.log('Analyzing game state for issues...');
        
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
            
            console.log(`Applying ${repairsApplied} repairs:`, repairUpdates);
            await updateDoc(gameRef, repairUpdates);
            
            // Log the repair action
            await logPublic(gameId, `Game automatically repaired: ${repairsApplied} issues fixed`, {
                type: 'system_repair',
                repairsApplied: repairsApplied
            });
            
            // Refresh the visual discard pile after repair
            if (repairUpdates.totalDiscardedCards !== undefined) {
                console.log('Refreshing discard pile visual after repair');
                setDiscardCount(repairUpdates.totalDiscardedCards);
                
                // Force a complete visual refresh
                setTimeout(() => {
                    const newCount = repairUpdates.totalDiscardedCards;
                    console.log(`Force refreshing discard pile to show ${newCount} cards`);
                    updateDiscardPileVisual(newCount);
                    updateCountDisplay(newCount);
                }, 100);
            }
            
            console.log('Game repair completed successfully');
            return true;
        } else {
            console.log('No repairs needed - game state is healthy');
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
    
    console.log('=== DISCARD PILE REPAIR ANALYSIS ===');
    console.log('Game object:', game);
    console.log('President discarded card:', game.presidentDiscardedCard);
    console.log('Chancellor discarded card:', game.chancellorDiscardedCard);
    console.log('President discarded cards array:', game.presidentDiscardedCards);
    console.log('Chancellor discarded cards array:', game.chancellorDiscardedCards);
    console.log('Other discarded cards:', game.discardedCards);
    console.log('Total discarded cards (stored):', game.totalDiscardedCards);
    
    // Check if discard count is inconsistent with game state
    const calculatedDiscardCount = calculateDiscardCountFromGameState(game);
    const storedDiscardCount = game.totalDiscardedCards || 0;
    
    console.log('Calculated discard count:', calculatedDiscardCount);
    console.log('Stored discard count:', storedDiscardCount);
    
    if (calculatedDiscardCount !== storedDiscardCount) {
        console.log(`Discard pile inconsistency detected: calculated=${calculatedDiscardCount}, stored=${storedDiscardCount}`);
        
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
        console.log('Repair needed: true');
    } else {
        console.log('No discard pile repair needed');
    }
    
    console.log('=== END DISCARD PILE REPAIR ANALYSIS ===');
    return needsRepair;
}

// Repair stuck game phases
function repairStuckGamePhase(gameId, game, repairUpdates) {
    let needsRepair = false;
    
    // Check for stuck completed phase
    if (game.policyPhase === 'completed' && game.enactedPolicy) {
        const timeSinceUpdate = game.updatedAt ? (Date.now() - game.updatedAt.toDate().getTime()) : 0;
        const isStuck = timeSinceUpdate > 10000; // 10 seconds
        
        if (isStuck) {
            console.log('Stuck game phase detected - advancing to next government');
            
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
        console.log(`${playersNeedingOrder.length} players missing orderIndex - fixing`);
        
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
        console.log(`${deadPlayers.length} dead players detected - this may be intentional`);
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
        console.log(`Invalid liberal policy count: ${liberalPolicies} - capping at 5`);
        repairUpdates.liberalPolicies = 5;
        needsRepair = true;
    }
    
    if (fascistPolicies > 6) {
        console.log(`Invalid fascist policy count: ${fascistPolicies} - capping at 6`);
        repairUpdates.fascistPolicies = 6;
        needsRepair = true;
    }
    
    // Check if game should be over
    if (liberalPolicies >= 5 || fascistPolicies >= 6) {
        console.log('Game should be over - checking for missing end state');
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
        console.log(`Invalid election tracker value: ${electionTracker} - fixing to valid range`);
        repairUpdates.electionTracker = Math.max(0, Math.min(3, electionTracker));
        needsRepair = true;
    }
    
    // Check if game should end due to 3 failed elections
    if (electionTracker >= 3 && game.state === 'playing') {
        console.log('Game should end due to 3 failed elections');
        repairUpdates.state = 'completed';
        repairUpdates.winner = 'fascist';
        repairUpdates.endReason = 'election_tracker';
        needsRepair = true;
    }
    
    return needsRepair;
}

// Enhanced debug function with repair capabilities
function debugGameState(gameId) {
    console.log('=== GAME STATE DEBUG ===');
    console.log('Game ID:', gameId);
    console.log('Latest Game:', latestGame);
    console.log('Latest Players:', latestPlayers);
    
    if (latestGame) {
        console.log('Game State:', latestGame.state);
        console.log('Policy Phase:', latestGame.policyPhase);
        console.log('Enacted Policy:', latestGame.enactedPolicy);
        console.log('Current President:', latestGame.currentPresidentPlayerId);
        console.log('Current Chancellor:', latestGame.currentChancellorPlayerId);
        console.log('Nominated Chancellor:', latestGame.nominatedChancellorPlayerId);
        console.log('Vote Resolution:', latestGame.voteResolution);
        console.log('Election Votes:', latestGame.electionVotes);
        console.log('President Index:', latestGame.presidentIndex);
        console.log('Liberal Policies:', latestGame.liberalPolicies);
        console.log('Fascist Policies:', latestGame.fascistPolicies);
        console.log('Election Tracker:', latestGame.electionTracker);
        console.log('Total Discarded Cards:', latestGame.totalDiscardedCards);
        console.log('Last Repair:', latestGame.lastRepairAt);
        
        const phase = computePhase(latestGame);
        console.log('Computed Phase:', phase);
        
        // Check for common issues
        const issues = detectGameIssues(gameId, latestGame, latestPlayers);
        if (issues.length > 0) {
            console.log('=== DETECTED ISSUES ===');
            issues.forEach(issue => console.log(`- ${issue}`));
            console.log('=== END ISSUES ===');
        }
    }
    
    if (latestPlayers && latestPlayers.length > 0) {
        console.log('Player Details:');
        latestPlayers.forEach((player, index) => {
            console.log(`  ${index + 1}. ${player.name || 'Player'} (ID: ${player.id}, Order: ${player.orderIndex}, Alive: ${player.alive !== false})`);
        });
    }
    
    console.log('========================');
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
                    console.log('Auto-repairing critical game issues...');
                    try {
                        await repairGameState(gameId);
                        console.log('Auto-repair completed successfully');
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