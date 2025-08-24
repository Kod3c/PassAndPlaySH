// Rules Modal Module for Secret Hitler Play Page
export const RulesModal = {
    // Get the complete rules modal HTML
    getHTML() {
        return `
<div id="rules-modal" class="modal-overlay rules-modal">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <div class="modal-title">Game Rules</div>
                <div class="modal-subtitle">Quick reference for in-game use</div>
            </div>
            <button id="rules-close" class="modal-close" aria-label="Close">×</button>
        </div>
        <div id="rules-body" class="modal-body">
            <div class="rules-quicknav">
                <button class="rule-nav-btn active" data-section="ov" aria-label="Overview">
                    <span class="nav-icon" aria-hidden="true">🎯</span>
                    <span class="nav-text">Overview</span>
                </button>
                <button class="rule-nav-btn" data-section="setup" aria-label="Setup">
                    <span class="nav-icon" aria-hidden="true">⚙️</span>
                    <span class="nav-text">Setup</span>
                </button>
                <button class="rule-nav-btn" data-section="roles" aria-label="Roles">
                    <span class="nav-icon" aria-hidden="true">🎭</span>
                    <span class="nav-text">Roles</span>
                </button>
                <button class="rule-nav-btn" data-section="flow" aria-label="Turn Order">
                    <span class="nav-icon" aria-hidden="true">🔄</span>
                    <span class="nav-text">Turn Order</span>
                </button>
                <button class="rule-nav-btn" data-section="powers" aria-label="Powers">
                    <span class="nav-icon" aria-hidden="true">⚡</span>
                    <span class="nav-text">Powers</span>
                </button>
                <button class="rule-nav-btn" data-section="legislative" aria-label="Legislative">
                    <span class="nav-icon" aria-hidden="true">📜</span>
                    <span class="nav-text">Legislative</span>
                </button>
                <button class="rule-nav-btn" data-section="win" aria-label="Victory">
                    <span class="nav-icon" aria-hidden="true">🏆</span>
                    <span class="nav-text">Victory</span>
                </button>
                <button class="rule-nav-btn" data-section="ref" aria-label="Reference">
                    <span class="nav-icon" aria-hidden="true">📑</span>
                    <span class="nav-text">Reference</span>
                </button>
            </div>
            <div class="rules-content">
                <section id="ov-section" class="rule-section active">
                    <div class="section-header">
                        <div class="section-icon">🎯</div>
                        <h3>Game Overview</h3>
                    </div>
                    <div class="overview-grid">
                        <div class="overview-card">
                            <div class="card-icon">👥</div>
                            <h4>Teams</h4>
                            <p>Liberals vs Fascists</p>
                            <span class="card-detail">Hidden roles</span>
                        </div>
                        <div class="overview-card">
                            <div class="card-icon">🎴</div>
                            <h4>Policies</h4>
                            <p>6 Fascist / 5 Liberal to win</p>
                            <span class="card-detail">See Victory</span>
                        </div>
                        <div class="overview-card">
                            <div class="card-icon">🔨</div>
                            <h4>Offices</h4>
                            <p>President & Chancellor</p>
                            <span class="card-detail">Rotate order</span>
                        </div>
                    </div>
                </section>

                <section id="setup-section" class="rule-section">
                    <div class="section-header">
                        <div class="section-icon">⚙️</div>
                        <h3>Setup</h3>
                    </div>
                    <div class="setup-steps">
                        <div class="setup-step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h4>Choose Roles by Player Count</h4>
                                <div class="role-distribution-visual">
                                    <div class="role-example"><div class="role-badge liberal"><span class="role-icon">🟦</span>Liberals</div><span class="role-count">5 players: 3L, 1F, 1H</span></div>
                                    <div class="role-example"><div class="role-badge liberal"><span class="role-icon">🟦</span>Liberals</div><span class="role-count">6 players: 4L, 1F, 1H</span></div>
                                    <div class="role-example"><div class="role-badge liberal"><span class="role-icon">🟦</span>Liberals</div><span class="role-count">7 players: 4L, 2F, 1H</span></div>
                                    <div class="role-example"><div class="role-badge liberal"><span class="role-icon">🟦</span>Liberals</div><span class="role-count">8 players: 5L, 2F, 1H</span></div>
                                    <div class="role-example"><div class="role-badge liberal"><span class="role-icon">🟦</span>Liberals</div><span class="role-count">9 players: 5L, 3F, 1H</span></div>
                                    <div class="role-example"><div class="role-badge liberal"><span class="role-icon">🟦</span>Liberals</div><span class="role-count">10 players: 6L, 3F, 1H</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="setup-step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h4>Prepare Decks</h4>
                                <p>Policy deck: 11 Fascist, 6 Liberal. Shuffle and place face down; discards face down. When fewer than 3 remain, reshuffle discards into a new deck.</p>
                            </div>
                        </div>
                        <div class="setup-step">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h4>Seat & Select First President</h4>
                                <p>Sit randomly around the table; assign player order clockwise. Randomly choose the first Presidential candidate.</p>
                            </div>
                        </div>
                        <div class="setup-step">
                            <div class="step-number">4</div>
                            <div class="step-content">
                                <h4>Secret Information (Night Phase)</h4>
                                <ul>
                                    <li>5–6 players: Hitler learns the identity of the single Fascist. The Fascist does not learn Hitler.</li>
                                    <li>7–10 players: Fascists learn one another. Hitler does not know the Fascists and the Fascists do not know Hitler.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="roles-section" class="rule-section">
                    <div class="section-header">
                        <div class="section-icon">🎭</div>
                        <h3>Roles & Knowledge</h3>
                    </div>
                    <div class="roles-grid">
                        <div class="role-card liberal"><div class="role-header"><div class="role-icon">🟦</div><h4>Liberal</h4></div><div class="role-info"><p class="role-description">Work together to enact 5 Liberal policies or execute Hitler.</p><div class="role-abilities"><h5>You know:</h5><ul><li>Only that you are Liberal.</li></ul></div></div></div>
                        <div class="role-card fascist"><div class="role-header"><div class="role-icon">🟥</div><h4>Fascist</h4></div><div class="role-info"><p class="role-description">Coordinate covertly to enact 6 Fascist policies or elect Hitler after 3 Fascist policies.</p><div class="role-abilities"><h5>You know:</h5><ul><li>Other Fascists (7–10 players).</li><li>Hitler's identity is unknown to you.</li></ul></div></div></div>
                        <div class="role-card hitler"><div class="role-header"><div class="role-icon">👑</div><h4>Hitler</h4></div><div class="role-info"><p class="role-description">Deceive the Liberals and avoid detection.</p><div class="role-abilities"><h5>You know:</h5><ul><li>At 5–6 players: the single Fascist.</li><li>At 7–10 players: no one.</li></ul></div></div></div>
                    </div>
                </section>

                <section id="flow-section" class="rule-section">
                    <div class="section-header">
                        <div class="section-icon">🔄</div>
                        <h3>Turn Order</h3>
                    </div>
                    <div class="gameplay-flow">
                        <div class="flow-step">
                            <div class="flow-icon">👑</div>
                            <h4>Nominate</h4>
                            <p>President nominates a Chancellor.</p>
                        </div>
                        <div class="flow-arrow">→</div>
                        <div class="flow-step">
                            <div class="flow-icon">🗳️</div>
                            <h4>Vote</h4>
                            <p>All players vote Ja/Nein. Majority passes.</p>
                        </div>
                        <div class="flow-arrow">→</div>
                        <div class="flow-step">
                            <div class="flow-icon">🎴</div>
                            <h4>Legislate</h4>
                            <p>Pres draws 3, discards 1; Chanc enacts 1 of 2.</p>
                        </div>
                        <div class="flow-arrow">→</div>
                        <div class="flow-step">
                            <div class="flow-icon">⚡</div>
                            <h4>Powers</h4>
                            <p>Some Fascist policies trigger powers.</p>
                        </div>
                    </div>
                </section>

                <section id="powers-section" class="rule-section">
                    <div class="section-header">
                        <div class="section-icon">⚡</div>
                        <h3>Executive Powers</h3>
                    </div>
                    <div class="powers-grid">
                        <div class="power-card">
                            <div class="power-header">
                                <span class="power-number">3</span>
                                <h4>Policy Peek</h4>
                            </div>
                            <p>President looks at top 3 policy cards.</p>
                        </div>
                        <div class="power-card">
                            <div class="power-header">
                                <span class="power-number">4</span>
                                <h4>Investigation</h4>
                            </div>
                            <p>President checks a player's loyalty.</p>
                        </div>
                        <div class="power-card">
                            <div class="power-header">
                                <span class="power-number">5</span>
                                <h4>Special Election</h4>
                            </div>
                            <p>President picks the next Presidential candidate.</p>
                        </div>
                    </div>
                    <div class="power-notes">
                        <div class="notes-header"><div class="notes-icon">📏</div><h4>Power Timing by Player Count</h4></div>
                        <ul>
                            <li><strong>5–6 players</strong>: 3 Policy Peek, 4 Execution, 5 Execution.</li>
                            <li><strong>7–8 players</strong>: 2 Investigation, 3 Special Election, 4 Execution, 5 Execution.</li>
                            <li><strong>9–10 players</strong>: 1 Investigation, 2 Investigation, 3 Special Election, 4 Execution, 5 Execution.</li>
                        </ul>
                    </div>
                </section>

                <section id="legislative-section" class="rule-section">
                    <div class="section-header">
                        <div class="section-icon">📜</div>
                        <h3>Legislative Session & Veto</h3>
                    </div>
                    <div class="powers-intro"><div class="powers-header"><div class="powers-icon">🎴</div><p>President draws 3 policies, discards 1 face down, passes 2 to Chancellor. Chancellor discards 1 and enacts 1 face down.</p></div></div>
                    <ul>
                        <li>All discards and enacted cards are secret (face down).</li>
                        <li>If fewer than 3 remain in deck, reshuffle the discard pile to form a new deck.</li>
                        <li><strong>Veto Power</strong> unlocks after 5 Fascist policies are enacted. Chancellor may propose a veto; if the President agrees, discard both cards and advance the Election Tracker by 1 (no policy is enacted).</li>
                        <li>Top-deck policies (after 3 failed elections) do not trigger Executive Powers.</li>
                    </ul>
                    <div class="powers-intro"><div class="powers-header"><div class="powers-icon">🚫</div><p><strong>Eligibility & Term Limits:</strong> The last elected President and last elected Chancellor are ineligible to be nominated as Chancellor in the next government. No player can be Chancellor in two consecutive governments.</p></div></div>
                </section>

                <section id="win-section" class="rule-section">
                    <div class="section-header">
                        <div class="section-icon">🏆</div>
                        <h3>Victory Conditions</h3>
                    </div>
                    <div class="winning-conditions">
                        <div class="win-condition liberal-win">
                            <div class="win-header">
                                <div class="win-icon">🟦</div>
                                <h4>Liberals</h4>
                            </div>
                            <div class="win-ways">
                                <div class="win-way"><span class="way-icon">✅</span><span class="way-text">Pass 5 Liberal policies</span></div>
                                <div class="win-way"><span class="way-icon">🎯</span><span class="way-text">Execute Hitler</span></div>
                            </div>
                        </div>
                        <div class="win-condition fascist-win">
                            <div class="win-header">
                                <div class="win-icon">🟥</div>
                                <h4>Fascists</h4>
                            </div>
                            <div class="win-ways">
                                <div class="win-way"><span class="way-icon">✅</span><span class="way-text">Pass 6 Fascist policies</span></div>
                                <div class="win-way"><span class="way-icon">👑</span><span class="way-text">Elect Hitler Chancellor after 3 Fascist policies</span></div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="ref-section" class="rule-section">
                    <div class="section-header">
                        <div class="section-icon">📑</div>
                        <h3>Reference</h3>
                    </div>
                    <div class="pdf-actions">
                        <a class="btn btn-outline" href="../Secret_Hitler_Rules.pdf" target="_blank" rel="noopener">Open Official Rules (PDF)</a>
                        <a class="btn" href="../Secret_Hitler_Rules.pdf" download>Download PDF</a>
                    </div>
                    <p class="mt-3" style="text-align:center;color:var(--dark-beige);">This in-game summary covers all core rules. Use the PDF for full artwork and extended clarifications.</p>
                </section>
            </div>
            <div class="rules-bottomnav" aria-hidden="false">
                <div class="rules-bottomnav-inner">
                    <button id="rules-prev" class="btn" aria-label="Previous section">← Prev</button>
                    <div id="rules-indicator" class="indicator">1/7</div>
                    <button id="rules-next" class="btn btn-primary" aria-label="Next section">Next →</button>
                </div>
            </div>
        </div>
    </div>
</div>`;
    },

    // Initialize rules modal behavior
    init() {
        const rulesModal = document.getElementById('rules-modal');
        const rulesClose = document.getElementById('rules-close');
        const ruleNavButtons = rulesModal?.querySelectorAll('.rule-nav-btn');
        const ruleSections = rulesModal?.querySelectorAll('.rule-section');
        const rulesPrevBtn = document.getElementById('rules-prev');
        const rulesNextBtn = document.getElementById('rules-next');
        const rulesIndicator = document.getElementById('rules-indicator');

        const ruleKeys = ['ov','setup','roles','flow','powers','legislative','win','ref'];
        
        function getActiveIndex() {
            let idx = 0;
            ruleSections?.forEach((sec, i) => { if (sec.classList.contains('active')) idx = i; });
            return idx;
        }
        
        function setActiveByIndex(idx) {
            const clamped = Math.max(0, Math.min((ruleSections?.length || 1) - 1, idx));
            const targetId = `${ruleKeys[clamped]}-section`;
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

        // Initialize indicator
        if (rulesIndicator) rulesIndicator.textContent = `${getActiveIndex() + 1}/${ruleSections?.length || 1}`;

        // Swipe gestures for mobile
        const body = document.getElementById('rules-body');
        if (body) {
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
        }

        // Make section headers tappable to jump to next section on mobile
        const mq = window.matchMedia('(max-width: 640px)');
        const headers = rulesModal?.querySelectorAll('.rule-section .section-header');
        headers?.forEach(h => {
            h.style.cursor = mq.matches ? 'pointer' : '';
            h.addEventListener('click', function() {
                if (!mq.matches) return;
                setActiveByIndex(getActiveIndex() + 1);
            });
        });

        return { setActiveByIndex, getActiveIndex };
    }
};

export default RulesModal;