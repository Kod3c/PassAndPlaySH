// Game Interactions - User interaction handling, voting, nomination, and other game actions

// Vote handling
function handleVote(vote) {
    const gameId = getGameId();
    const youId = computeYouId(gameId);
    if (!gameId || !youId) {
        console.error('Cannot vote: missing gameId or youId');
        return;
    }
    
    console.log(`Player ${youId} voting ${vote} in game ${gameId}`);
    
    // Update local UI immediately for responsiveness
    const voteBtn = document.getElementById('vote-toggle-btn');
    if (voteBtn) {
        voteBtn.innerHTML = `<span class="vote-label">${vote.toUpperCase()}</span><span class="vote-count">(Voted)</span>`;
        voteBtn.disabled = true;
        voteBtn.setAttribute('aria-disabled', 'true');
        voteBtn.className = 'btn btn-black';
    }
    
    // Hide the vote popover
    const popover = document.getElementById('vote-popover');
    if (popover) {
        popover.style.display = 'none';
    }
    
    // Submit vote to Firebase
    submitVote(gameId, youId, vote);
}

// Submit vote to Firebase
async function submitVote(gameId, youId, vote) {
    try {
        const gameRef = doc(db, 'games', gameId);
        const voteData = {};
        voteData[`electionVotes.${youId}`] = vote;
        
        await updateDoc(gameRef, voteData);
        console.log(`Vote ${vote} submitted successfully for player ${youId}`);
        
        // Update status to show vote was recorded
        setStatus(gameId, `Vote recorded: ${vote.toUpperCase()}`);
        
    } catch (error) {
        console.error('Failed to submit vote:', error);
        alert('Failed to submit vote. Please try again.');
        
        // Re-enable voting if submission failed
        const voteBtn = document.getElementById('vote-toggle-btn');
        if (voteBtn) {
            voteBtn.disabled = false;
            voteBtn.removeAttribute('aria-disabled');
            voteBtn.className = 'btn btn-black btn-attention btn-flashy';
            voteBtn.innerHTML = '<span class="vote-label">Vote</span><span class="vote-count">(Retry)</span>';
        }
    }
}

// Nomination handling
function openNominationModal() {
    const gameId = getGameId();
    const youId = computeYouId(gameId);
    const game = latestGame;
    const players = latestPlayers || [];
    
    if (!game || !players.length) {
        console.error('Cannot open nomination modal: game or players not loaded');
        return;
    }
    
    const presId = game.currentPresidentPlayerId;
    if (youId !== presId) {
        console.error('Only the President can nominate a Chancellor');
        return;
    }
    
    // Set nomination flag to prevent modal re-opening
    isNominating = true;
    
    const modal = document.getElementById('nomination-modal');
    const body = document.getElementById('nomination-body');
    
    if (!modal || !body) {
        console.error('Nomination modal elements not found');
        return;
    }
    
    // Clear previous content
    body.innerHTML = '';
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = 'Choose a Chancellor';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    body.appendChild(title);
    
    // Get eligible players
    const eligibleIds = eligibleChancellorIds(game, players);
    const eligiblePlayers = players.filter(p => eligibleIds.includes(p.id));
    
    if (eligiblePlayers.length === 0) {
        const noPlayers = document.createElement('p');
        noPlayers.textContent = 'No eligible players found.';
        noPlayers.style.textAlign = 'center';
        noPlayers.style.color = '#666';
        body.appendChild(noPlayers);
    } else {
        // Create player selection buttons
        eligiblePlayers.forEach(player => {
            const btn = document.createElement('button');
            btn.className = 'btn player-select-btn';
            btn.textContent = player.name || 'Player';
            btn.style.margin = '8px';
            btn.style.minWidth = '120px';
            
            btn.addEventListener('click', async () => {
                try {
                    btn.disabled = true;
                    btn.textContent = 'Nominating...';
                    
                    await nominateChancellor(gameId, player.id);
                    
                    // Close modal on success
                    modal.style.display = 'none';
                    
                } catch (error) {
                    console.error('Failed to nominate Chancellor:', error);
                    alert('Failed to nominate Chancellor. Please try again.');
                    btn.disabled = false;
                    btn.textContent = player.name || 'Player';
                }
            });
            
            body.appendChild(btn);
        });
    }
    
    // Show modal
    modal.style.display = 'flex';
}

// Nominate a Chancellor
async function nominateChancellor(gameId, chancellorId) {
    try {
        const gameRef = doc(db, 'games', gameId);
        
        await updateDoc(gameRef, {
            nominatedChancellorPlayerId: chancellorId,
            electionVotes: {},
            voteResolution: null,
            policyPhase: null,
            enactedPolicy: null
        });
        
        console.log(`Chancellor ${chancellorId} nominated successfully`);
        
        // Update status
        const chancellor = latestPlayers.find(p => p.id === chancellorId);
        if (chancellor) {
            setStatus(gameId, `Chancellor nominated: ${chancellor.name || 'Player'}`);
        }
        
    } catch (error) {
        console.error('Failed to nominate Chancellor:', error);
        throw error;
    }
}

// Chancellor choice overlay
function showChancellorChoiceOverlay(game) {
    if (!game) return;
    
    const gameId = getGameId();
    const youId = computeYouId(gameId);
    
    if (!gameId || !youId) {
        console.error('Cannot show chancellor choice: missing gameId or youId');
        return;
    }
    
    const chancId = game.currentChancellorPlayerId;
    if (youId !== chancId) {
        console.error('Only the Chancellor can see policy cards');
        return;
    }
    
    // Create overlay
    const overlayId = 'chancellor-choice-overlay';
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.className = 'reveal-overlay';
        document.body.appendChild(overlay);
    }
    
    // Clear previous content
    overlay.innerHTML = '';
    
    // Add instruction banner
    const instr = document.createElement('div');
    instr.className = 'reveal-instruction';
    instr.textContent = 'Choose 1 policy to enact';
    overlay.appendChild(instr);
    
    // Add close button
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
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    });
    
    overlay.appendChild(closeBtn);
    
    // Add actions
    const actions = document.createElement('div');
    actions.className = 'reveal-actions';
    const enactBtn = document.createElement('button');
    enactBtn.className = 'reveal-btn';
    enactBtn.textContent = 'Enact Policy';
    enactBtn.disabled = true;
    actions.appendChild(enactBtn);
    overlay.appendChild(actions);
    
    // Create two policy cards (face down initially)
    const centerX = Math.round(window.innerWidth / 2);
    const centerY = Math.round(window.innerHeight / 2);
    const spacing = 120;
    const cardWidth = 92;
    const cardHeight = 132;
    
    const leftCard = createPolicyCard('left', centerX - spacing/2 - cardWidth/2, centerY - cardHeight/2);
    const rightCard = createPolicyCard('right', centerX + spacing/2 - cardWidth/2, centerY - cardHeight/2);
    
    overlay.appendChild(leftCard);
    overlay.appendChild(rightCard);
    
    // Handle card selection
    let selectedCard = null;
    
    function updateEnactState() {
        enactBtn.disabled = !selectedCard;
    }
    
    [leftCard, rightCard].forEach(card => {
        card.addEventListener('click', function() {
            // Deselect other card
            [leftCard, rightCard].forEach(c => c.classList.remove('selected'));
            
            // Select this card
            card.classList.add('selected');
            selectedCard = card;
            
            updateEnactState();
        });
    });
    
    // Handle enacting policy
    enactBtn.addEventListener('click', async function() {
        if (!selectedCard) return;
        
        try {
            enactBtn.disabled = true;
            enactBtn.textContent = 'Enacting...';
            
            // Get the selected policy type
            const policyType = selectedCard.dataset.policy;
            
            // Enact the policy
            await enactPolicy(gameId, policyType);
            
            // Close overlay on success
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            
        } catch (error) {
            console.error('Failed to enact policy:', error);
            alert('Failed to enact policy. Please try again.');
            enactBtn.disabled = false;
            enactBtn.textContent = 'Enact Policy';
        }
    });
    
    updateEnactState();
    
    // Show overlay
    overlay.style.display = 'flex';
}

// Create a policy card for chancellor choice
function createPolicyCard(position, x, y) {
    const card = document.createElement('div');
    card.className = 'reveal-card';
    card.dataset.position = position;
    card.dataset.policy = Math.random() < 0.5 ? 'liberal' : 'fascist'; // Random for now
    
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.style.cursor = 'pointer';
    
    // Start face down
    card.style.backgroundImage = 'url(../../images/policy-back.png)';
    
    // Add hover effect
    card.addEventListener('mouseenter', function() {
        if (!this.classList.contains('selected')) {
            this.style.transform = 'scale(1.05)';
        }
    });
    
    card.addEventListener('mouseleave', function() {
        if (!this.classList.contains('selected')) {
            this.style.transform = 'scale(1)';
        }
    });
    
    return card;
}

// Enact a policy
async function enactPolicy(gameId, policyType) {
    try {
        const gameRef = doc(db, 'games', gameId);
        const game = latestGame;
        
        if (!game) {
            throw new Error('Game data not loaded');
        }
        
        // Update policy count
        const updateData = {};
        if (policyType === 'liberal') {
            updateData.liberalPolicies = increment(1);
        } else {
            updateData.fascistPolicies = increment(1);
        }
        
        // Mark policy phase as completed
        updateData.policyPhase = 'completed';
        updateData.enactedPolicy = policyType;
        
        await updateDoc(gameRef, updateData);
        
        console.log(`${policyType} policy enacted successfully`);
        
        // Update status
        setStatus(gameId, `${policyType === 'liberal' ? 'Liberal' : 'Fascist'} policy enacted!`);
        
    } catch (error) {
        console.error('Failed to enact policy:', error);
        throw error;
    }
}

// Clean up all policy overlays
function cleanupAllPolicyOverlays() {
    // Remove reveal overlay
    const revealOverlay = document.getElementById('reveal-overlay');
    if (revealOverlay && revealOverlay.parentNode) {
        revealOverlay.parentNode.removeChild(revealOverlay);
    }
    
    // Remove chancellor choice overlay
    const chancellorOverlay = document.getElementById('chancellor-choice-overlay');
    if (chancellorOverlay && chancellorOverlay.parentNode) {
        chancellorOverlay.parentNode.removeChild(chancellorOverlay);
    }
    
    // Remove spread tooltip
    const spreadTooltip = document.getElementById('spread-tooltip');
    if (spreadTooltip && spreadTooltip.parentNode) {
        spreadTooltip.parentNode.removeChild(spreadTooltip);
    }
}

// Event listeners setup
document.addEventListener('DOMContentLoaded', function() {
    // Vote button event delegation
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-vote]')) {
            const vote = e.target.dataset.vote;
            handleVote(vote);
        }
    });
    
    // Nomination button event delegation
    document.addEventListener('click', function(e) {
        if (e.target.matches('#open-nominate-btn')) {
            openNominationModal();
        }
    });
    
    // Modal close buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('.modal-close')) {
            const modal = e.target.closest('.modal-overlay');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.matches('.modal-overlay')) {
            e.target.style.display = 'none';
        }
    });
    
    // Vote toggle button
    document.addEventListener('click', function(e) {
        if (e.target.matches('#vote-toggle-btn')) {
            const popover = document.getElementById('vote-popover');
            if (popover) {
                popover.style.display = popover.style.display === 'block' ? 'none' : 'block';
            }
        }
    });
});

// Export functions for use in other modules
window.handleVote = handleVote;
window.openNominationModal = openNominationModal;
window.showChancellorChoiceOverlay = showChancellorChoiceOverlay;
window.cleanupAllPolicyOverlays = cleanupAllPolicyOverlays;
