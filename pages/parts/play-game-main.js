// Main Game Logic Module for Secret Hitler Play Page
import { app } from '../../js/firebase.js';
import { onHistory, logPublic } from '../../js/db.js';
import { getFirestore, doc, getDoc, onSnapshot, collection, query, orderBy, updateDoc, serverTimestamp, runTransaction, increment } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { DiscardPileModule, incrementDiscardCount, decrementDiscardCount, resetDiscardCount, setDiscardCount, calculateDiscardCountFromGameState } from './play-discard.js';
import { TableSpreadModule, incrementTableSpreadCount, decrementTableSpreadCount, setTableSpreadCount, calculateTableSpreadCountFromGameState } from './play-spread.js';

// Initialize Firebase and game state
const db = getFirestore(app);
let latestGame = null;
let latestPlayers = [];
let historyUnsub = null;
let historyItems = [];
let localPaused = false;
let lastStatusMessage = null;
const HEARTBEAT_INTERVAL_MS = 25 * 1000; // 25s
let heartbeatTimer = null;
let afkUnsub = null; 
let lastAfkSeenOrder = 0;

// Game helper functions
function getGameId() {
    const p = new URLSearchParams(window.location.search);
    return p.get('game') || localStorage.getItem('sh_currentGameId') || '';
}

function hidePreloader() {
    const o = document.getElementById('preloader-overlay');
    if (o) o.style.display = 'none';
}

function setPreloader(text) {
    const t = document.getElementById('preloader-text');
    if (t && text) t.textContent = text;
}

function getYouPlayerId(gameId) {
    try { return sessionStorage.getItem(`sh_playerId_${gameId}`) || null; } catch (_) { return null; }
}

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

function renderSlots(el, count) {
    el.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const s = document.createElement('div');
        s.className = 'slot';
        el.appendChild(s);
    }
}

function renderTracker(el) {
    el.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const b = document.createElement('div');
        b.className = 'square';
        b.textContent = String(i + 1);
        b.dataset.index = String(i);
        el.appendChild(b);
    }
}

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
                // Rotate left a bit more and scale up 5%
                card.style.transform = 'translate(-50%, -50%) rotate(-5deg) scale(1.05)';
                card.style.zIndex = '3';
                slot.appendChild(card);
                slot.classList.add('filled');
            } else {
                existing.style.backgroundImage = type === 'liberal' ? "url('../images/liberal.png')" : "url('../images/facist.png')";
                existing.style.transform = 'translate(-50%, -50%) rotate(-5deg) scale(1.05)';
                existing.style.zIndex = '3';
                slot.classList.add('filled');
            }
        } else {
            if (existing) existing.remove();
            slot.classList.remove('filled');
        }
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

    const squares = document.querySelectorAll('#election-tracker .square');
    squares.forEach((sq, idx) => {
        if (et > idx) sq.classList.add('active');
        else sq.classList.remove('active');
    });
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
    if (!envelope || !game || !gameId) return;
    
    const youId = computeYouId(gameId);
    if (!youId) {
        envelope.style.display = 'none';
        return;
    }
    
    const youPlayer = (latestPlayers || []).find(p => p && p.id === youId);
    if (!youPlayer || !youPlayer.role) {
        envelope.style.display = 'none';
        return;
    }
    
    // Only show envelope if player has a role assigned and game is in playing state
    if (game.state === 'playing' && youPlayer.role) {
        envelope.style.display = 'block';
    } else {
        envelope.style.display = 'none';
    }
}

function setStatus(gameId, message) {
    try {
        const el = document.getElementById('status');
        if (!el) return;
        el.textContent = message || '';
        // retrigger small animation
        el.classList.remove('status-updated');
        void el.offsetWidth;
        el.classList.add('status-updated');
        if (gameId && message && message !== lastStatusMessage) {
            lastStatusMessage = message;
            try { logPublic(gameId, message, { type: 'status' }); } catch (_) {}
        }
    } catch (_) { /* no-op */ }
}

function renderPlayers(el, players) {
    el.innerHTML = '';
    (players || []).forEach(p => {
        const chip = document.createElement('div');
        chip.className = 'player-chip';
        const icons = [];
        if (p.isPresident) icons.push('👑');
        if (p.isChancellor) icons.push('🔨');
        const prefix = icons.length ? icons.join('') + ' ' : '';
        chip.textContent = prefix + (p.name || 'Player');
        if (p.isPresident) chip.classList.add('is-president');
        if (p.isChancellor) chip.classList.add('is-chancellor');
        el.appendChild(chip);
    });
}

// Initialize the game when DOM is ready
async function initializeGame() {
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

    // Initialize discard and table spread modules
    DiscardPileModule.init();
    TableSpreadModule.init();

    if (!gid) { 
        setStatus('', 'Missing game id'); 
        hidePreloader(); 
        return; 
    }

    const gameRef = doc(db, 'games', gid);
    let gameReady = false;
    let playersReady = false;
    
    function maybeHide() {
        if (gameReady && playersReady) hidePreloader();
    }
    
    const snap = await getDoc(gameRef);
    if (!snap.exists()) { 
        setStatus(gid, 'Game not found'); 
        hidePreloader(); 
        return; 
    }
    setStatus(gid, 'Game in progress');

    // Subscribe to game updates
    onSnapshot(gameRef, (s) => {
        latestGame = s.exists() ? s.data() : null;
        if (!latestGame) { 
            setStatus(gid, 'Game unavailable'); 
            hidePreloader(); 
            return; 
        }
        if (latestGame.state === 'cancelled') { 
            setStatus(gid, 'Game cancelled'); 
            hidePreloader(); 
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
        updateRoleEnvelope(latestGame, gid);
        
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
        
        playersReady = true;
        maybeHide();
    });

    // Presence heartbeat to keep this player's session marked active while playing
    heartbeatOnce(gid);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(function() { heartbeatOnce(gid); }, HEARTBEAT_INTERVAL_MS);
    
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') heartbeatOnce(gid);
    });
    
    window.addEventListener('beforeunload', function() { 
        heartbeatOnce(gid); 
    });

    // Set up all modal event handlers
    setupModalHandlers();
}

// Set up modal event handlers
function setupModalHandlers() {
    // Order modal handlers
    const orderBtn = document.getElementById('order-btn');
    const orderModal = document.getElementById('order-modal');
    const orderClose = document.getElementById('order-close');
    const orderBody = document.getElementById('order-body');

    function openOrderModal() {
        orderBody.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'order-list';
        if (!latestPlayers || latestPlayers.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'Player order not available yet.';
            orderBody.appendChild(p);
        } else {
            latestPlayers.forEach((p, idx) => {
                const row = document.createElement('div');
                row.className = 'order-item';
                const left = document.createElement('div');
                left.className = 'order-left';
                const num = document.createElement('div');
                num.className = 'order-num';
                num.textContent = String(idx + 1);
                const name = document.createElement('div');
                name.style.fontWeight = '800';
                name.textContent = p.name || 'Player';
                left.appendChild(num);
                left.appendChild(name);
                row.appendChild(left);

                const right = document.createElement('div');
                right.className = 'order-right';
                if (latestGame && latestGame.currentPresidentPlayerId === p.id) {
                    const pres = document.createElement('span');
                    pres.className = 'badge-pres';
                    pres.textContent = '👑 President';
                    right.appendChild(pres);
                }
                if (latestGame && latestGame.currentChancellorPlayerId === p.id) {
                    const chanc = document.createElement('span');
                    chanc.className = 'badge-chanc';
                    chanc.textContent = '🔨 Chancellor';
                    right.appendChild(chanc);
                }
                row.appendChild(right);
                list.appendChild(row);
            });
            orderBody.appendChild(list);
        }
        orderModal.style.display = 'flex';
    }

    function closeOrderModal() { 
        orderModal.style.display = 'none'; 
    }
    
    orderBtn?.addEventListener('click', openOrderModal);
    orderClose?.addEventListener('click', closeOrderModal);
    orderModal?.addEventListener('click', function(e) { 
        if (e.target === orderModal) closeOrderModal(); 
    });

    // History modal handlers
    const historyBtn = document.getElementById('history-btn');
    const historyModal = document.getElementById('history-modal');
    const historyClose = document.getElementById('history-close');
    const historyBody = document.getElementById('history-body');

    function openHistoryModal() {
        if (!historyModal) return;
        historyModal.style.display = 'flex';
        // Subscribe on open
        if (!historyUnsub) {
            try {
                historyUnsub = onHistory(getGameId(), (items) => {
                    historyItems = items || [];
                    renderHistory();
                });
            } catch (_) {}
        }
        renderHistory();
    }

    function closeHistoryModal() {
        if (historyModal) historyModal.style.display = 'none';
        if (historyUnsub) { 
            try { historyUnsub(); } catch (_) {} 
            historyUnsub = null; 
        }
    }

    function renderHistory() {
        if (!historyBody) return;
        historyBody.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.gap = '8px';

        const visibleItems = (historyItems || []).filter(evt => {
            const vis = (evt && evt.visibility) || 'public';
            if (vis === 'public') return true;
            return false; // Simplified for now
        });

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
            const msg = document.createElement('div');
            msg.style.fontWeight = '800';
            msg.textContent = evt.message || '';
            left.appendChild(msg);
            row.appendChild(left);
            wrap.appendChild(row);
        });
        historyBody.appendChild(wrap);
    }

    historyBtn?.addEventListener('click', openHistoryModal);
    historyClose?.addEventListener('click', closeHistoryModal);
    historyModal?.addEventListener('click', function(e) { 
        if (e.target === historyModal) closeHistoryModal(); 
    });

    // Menu modal handlers
    const menuBtn = document.getElementById('menu-btn');
    const menuModal = document.getElementById('menu-modal');
    const menuClose = document.getElementById('menu-close');
    const menuBody = document.getElementById('menu-body');

    function openMenuModal() {
        renderMenu();
        if (menuModal) menuModal.style.display = 'flex';
    }

    function closeMenuModal() { 
        if (menuModal) { 
            menuModal.style.display = 'none'; 
        } 
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

        const quitBtn = document.createElement('button');
        quitBtn.id = 'quit-game-btn';
        quitBtn.className = 'btn';
        quitBtn.textContent = '⚠️ Quit Game for Everyone';
        list.appendChild(quitBtn);

        menuBody.appendChild(list);
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openMenuModal();
        }, { capture: true });
    }
    menuClose?.addEventListener('click', closeMenuModal);
    menuModal?.addEventListener('click', function(e) { 
        if (e.target === menuModal) closeMenuModal(); 
    });

    // Menu actions (delegated)
    menuBody?.addEventListener('click', async function(e) {
        const t = e.target;
        if (!(t && t.matches && t.matches('button'))) return;
        const gid = getGameId();
        
        if (t.id === 'leave-game-btn') {
            try {
                sessionStorage.removeItem(`sh_playerId_${gid}`);
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
                await updateDoc(doc(db, 'games', gid), { 
                    state: 'cancelled', 
                    updatedAt: serverTimestamp() 
                });
            } catch (err) {
                console.error('Failed to end game', err);
            } finally {
                closeMenuModal();
                window.location.href = '../index.html';
            }
            return;
        }
    });

    // Rules modal handlers
    const rulesBtn = document.getElementById('help-btn');
    const rulesModal = document.getElementById('rules-modal');
    const rulesClose = document.getElementById('rules-close');

    function openRulesModal() { 
        if (rulesModal) { 
            rulesModal.style.display = 'flex'; 
        } 
    }
    
    function closeRulesModal() { 
        if (rulesModal) { 
            rulesModal.style.display = 'none'; 
        } 
    }

    if (rulesBtn) {
        rulesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openRulesModal();
        }, { capture: true });
    }
    rulesClose?.addEventListener('click', closeRulesModal);
    rulesModal?.addEventListener('click', function(e) { 
        if (e.target === rulesModal) closeRulesModal(); 
    });

    // Role overlay handlers
    const roleEnvelope = document.getElementById('role-envelope');
    const roleOverlay = document.getElementById('role-overlay');
    const roleClose = document.getElementById('role-close');

    function openRoleOverlay() {
        const roleText = document.getElementById('role-text');
        const toggleBtn = document.getElementById('role-toggle-btn');
        const doneBtn = document.getElementById('role-done-btn');
        
        if (!roleOverlay || !roleText || !toggleBtn || !doneBtn) return;
        
        // Get current player's role
        const gameId = getGameId();
        const youId = computeYouId(gameId);
        const youPlayer = (latestPlayers || []).find(p => p && p.id === youId);
        
        if (!youPlayer) {
            roleText.textContent = 'Player not found';
            return;
        }
        
        let shown = false;
        
        function setRoleLabelVisible(visible) {
            shown = visible;
            if (!visible) {
                roleText.textContent = 'Hidden';
                roleText.style.color = '#000';
                toggleBtn.textContent = '👁️ Reveal my secret role';
            } else {
                const role = (youPlayer.role || '').toString().toUpperCase();
                const party = (youPlayer.party || '').toString().toUpperCase();
                const label = role ? `${role}${party && role !== party ? ' – ' + party : ''}` : 'Not assigned yet';
                
                roleText.textContent = label;
                if (role === 'HITLER') roleText.style.color = '#DA291C';
                else if (party === 'FASCIST' || role === 'FASCIST') roleText.style.color = '#DA291C';
                else roleText.style.color = '#00AEEF';
                
                toggleBtn.textContent = '🙈 Hide my secret role';
            }
        }
        
        // Set up event listeners
        toggleBtn.onclick = function() {
            setRoleLabelVisible(!shown);
        };
        
        doneBtn.onclick = function() {
            roleOverlay.style.display = 'none';
        };
        
        // Start hidden
        setRoleLabelVisible(false);
        
        // Show overlay
        roleOverlay.style.display = 'flex';
    }
    
    function closeRoleOverlay() {
        if (roleOverlay) {
            roleOverlay.style.display = 'none';
        }
    }

    roleEnvelope?.addEventListener('click', openRoleOverlay);
    roleClose?.addEventListener('click', closeRoleOverlay);
    roleOverlay?.addEventListener('click', function(e) { 
        if (e.target === roleOverlay) closeRoleOverlay(); 
    });
}

// Export the initialization function
export { initializeGame };

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}