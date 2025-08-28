// Game Phases - Phase-specific logic for nomination, voting, policy drawing, chancellor choice, and phase completion

// Phase rendering functions
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

// Main actions rendering function
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

// Export functions for use in other modules
window.renderActions = renderActions;
window.renderPhaseNomination = renderPhaseNomination;
window.renderPhaseVoting = renderPhaseVoting;
window.renderPhasePresidentDraw = renderPhasePresidentDraw;
window.renderPhaseChancellorChoice = renderPhaseChancellorChoice;
window.renderPhaseCompleted = renderPhaseCompleted;
