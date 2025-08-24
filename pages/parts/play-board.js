// Game Board Module for Secret Hitler Play Page
export const BoardModule = {
    // Get the main board HTML
    getHTML() {
        return `
<div class="play-wrapper">
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo" onclick="window.location.href='../index.html'">
                    <span class="logo-icon">🎭</span>
                    <div class="logo-text">
                        <h1>Secret Hitler</h1>
                        <p class="subtitle">Mobile Edition</p>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <main class="play-main">
        <div class="board-shell">
            <div id="role-banner" class="floating-role">
                <div class="role-bar"><span id="role-badge" class="role-tag"></span></div>
            </div>
            <div id="players-strip" class="players-strip"></div>
            <div class="board-area">
                <div class="board-frame">
                    <div class="tracks">
                        <section class="track liberal">
                            <div class="track-title">Liberal Policies</div>
                            <div class="slots" id="liberal-slots"></div>
                        </section>
                        <div id="status" class="status-banner">Loading…</div>
                        <section class="track fascist">
                            <div class="track-title">Fascist Policies</div>
                            <div class="slots" id="fascist-slots"></div>
                        </section>
                    </div>
                    <div class="policy-summary">
                        <div class="policy-card-wrap">
                            <div class="policy-card-title">Liberal Policies</div>
                            <div class="policy-chip liberal"><span class="policy-label">Liberal</span> <span class="count" id="liberal-count">0/5</span></div>
                        </div>
                        <div class="policy-card-wrap">
                            <div class="policy-card-title">Fascist Policies</div>
                            <div class="policy-chip fascist"><span class="policy-label">Fascist</span> <span class="count" id="fascist-count">0/6</span></div>
                        </div>
                    </div>
                    <div class="tracker-row">
                        <div class="tracker-label">Failed Elections</div>
                        <div class="tracker" id="election-tracker"></div>
                    </div>
                </div>
                <!-- Cards area - centered under play field -->
                <div class="cards-area" aria-hidden="false">
                    <div class="cards-row">
                        <div class="role-envelope" id="role-envelope" title="Click to view your secret role">
                            <img src="../images/envelope.png" alt="My Secret Role" class="envelope-image">
                        </div>
                        <div class="table-spread">
                            <!-- Table cards will be dynamically generated here -->
                        </div>
                        <div class="card-stack discard" aria-label="Discard Pile">
                            <div class="stack-card is-discard"></div>
                            <!-- Policy cards will be dynamically generated here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="floating-footer">
        <div class="actions-bar">
            <div class="actions-left">
                <button id="menu-btn" class="btn">☰ Menu</button>
                <button id="help-btn" class="btn">📖 Rules</button>
            </div>
            <div class="actions-center">
                <button id="view-cards-btn" class="btn btn-primary" style="display: none;">🃏 View Cards</button>
            </div>
            <div class="actions-right">
                <button id="history-btn" class="btn">🕒 History</button>
                <button id="order-btn" class="btn">👥 Order</button>
            </div>
        </div>
    </footer>
</div>`;
    },

    // Get the preloader HTML
    getPreloaderHTML() {
        return `
<div id="preloader-overlay" class="preloader-overlay" aria-hidden="false">
    <div class="loader">
        <div class="spinner"></div>
        <div id="preloader-text" class="loader-text">Loading board…</div>
    </div>
</div>`;
    },

    // Initialize board UI elements
    init() {
        // Initialize slots
        const liberalSlots = document.getElementById('liberal-slots');
        const fascistSlots = document.getElementById('fascist-slots');
        const tracker = document.getElementById('election-tracker');

        this.renderSlots(liberalSlots, 5);
        this.renderSlots(fascistSlots, 6);
        this.renderTracker(tracker);
    },

    // Helper to render policy slots
    renderSlots(el, count) {
        if (!el) return;
        el.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const s = document.createElement('div');
            s.className = 'slot';
            el.appendChild(s);
        }
    },

    // Helper to render election tracker
    renderTracker(el) {
        if (!el) return;
        el.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const b = document.createElement('div');
            b.className = 'square';
            b.textContent = String(i + 1);
            b.dataset.index = String(i);
            el.appendChild(b);
        }
    },

    // Update board from game state
    updateFromGame(game) {
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
        if (liberalSlotsEl) this.renderPoliciesToSlots(liberalSlotsEl, Math.min(lib, 5), 'liberal');
        if (fascistSlotsEl) this.renderPoliciesToSlots(fascistSlotsEl, Math.min(fas, 6), 'fascist');

        const squares = document.querySelectorAll('#election-tracker .square');
        squares.forEach((sq, idx) => {
            if (et > idx) sq.classList.add('active');
            else sq.classList.remove('active');
        });
    },

    // Render policy cards into slots
    renderPoliciesToSlots(containerEl, filledCount, type) {
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
    },

    // Render players strip
    renderPlayers(el, players) {
        if (!el) return;
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
};

export default BoardModule;