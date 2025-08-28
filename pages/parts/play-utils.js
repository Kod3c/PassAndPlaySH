// Game Utilities - Helper functions, deck management, table spread management, and other utility functions

// Table spread management
let currentTableSpreadCount = 17; // Default starting count
let currentDiscardCount = 0;

function setTableSpreadCount(count) {
    currentTableSpreadCount = Math.max(0, count);
    updateTableSpreadVisual();
}

function getTableSpreadCount() {
    return currentTableSpreadCount;
}

function setDiscardCount(count) {
    currentDiscardCount = Math.max(0, count);
    updateDiscardPileVisual();
}

function getDiscardCount() {
    return currentDiscardCount;
}

function resetDiscardCount() {
    currentDiscardCount = 0;
    updateDiscardPileVisual();
}

// Update the visual representation of the table spread
function updateTableSpreadVisual() {
    const spread = document.querySelector('.table-spread');
    if (!spread) return;
    
    // Clear existing cards
    spread.innerHTML = '';
    
    // Create the appropriate number of cards
    for (let i = 0; i < currentTableSpreadCount; i++) {
        const card = document.createElement('div');
        card.className = 'table-card';
        card.style.backgroundImage = 'url(../../images/policy-back.png)';
        spread.appendChild(card);
    }
    
    console.log(`Table spread updated: ${currentTableSpreadCount} cards displayed`);
}

// Update the visual representation of the discard pile
function updateDiscardPileVisual() {
    const discardStack = document.querySelector('.card-stack.discard');
    if (!discardStack) return;
    
    // Remove existing policy cards
    const existingPolicyCards = discardStack.querySelectorAll('.stack-card:not(.is-discard)');
    existingPolicyCards.forEach(card => card.remove());
    
    // Add policy cards based on discard count
    for (let i = 0; i < currentDiscardCount; i++) {
        const policyCard = document.createElement('div');
        policyCard.className = `stack-card policy-on-discard${i > 0 ? i : ''}`;
        policyCard.style.backgroundImage = 'url(../../images/policy-back.png)';
        discardStack.appendChild(policyCard);
    }
    
    console.log(`Discard pile updated: ${currentDiscardCount} policy cards displayed`);
}

// Calculate table spread count from game state
function calculateTableSpreadCountFromGameState(game) {
    if (!game) return 17; // Default starting count
    
    const totalCards = 17; // 6 Liberal + 11 Fascist
    const enactedLiberal = Number(game.liberalPolicies || 0);
    const enactedFascist = Number(game.fascistPolicies || 0);
    const totalEnacted = enactedLiberal + enactedFascist;
    
    // Cards removed from deck = enacted policies + discarded policies
    // For now, we'll assume 1 card is discarded per policy phase
    const discardedCards = totalEnacted; // This is a simplification
    
    const remainingCards = Math.max(0, totalCards - totalEnacted - discardedCards);
    
    console.log(`Calculated table spread: ${remainingCards} cards remaining (${totalCards} total - ${totalEnacted} enacted - ${discardedCards} discarded)`);
    
    return remainingCards;
}

// Calculate discard count from game state
function calculateDiscardCountFromGameState(game) {
    if (!game) return 0;
    
    const enactedLiberal = Number(game.liberalPolicies || 0);
    const enactedFascist = Number(game.fascistPolicies || 0);
    const totalEnacted = enactedLiberal + enactedFascist;
    
    // For now, we'll assume 1 card is discarded per policy phase
    // This should be updated when the actual discard tracking is implemented
    const discardedCards = totalEnacted;
    
    console.log(`Calculated discard count: ${discardedCards} cards (${totalEnacted} enacted policies)`);
    
    return discardedCards;
}

// Update deck visual after president draws cards
function updateDeckVisualAfterDraw() {
    // Reduce table spread by 3 (the drawn cards)
    const newCount = Math.max(0, currentTableSpreadCount - 3);
    setTableSpreadCount(newCount);
    
    // Add 1 card to discard pile (the discarded card)
    const newDiscardCount = currentDiscardCount + 1;
    setDiscardCount(newDiscardCount);
    
    console.log(`Deck updated after draw: ${newCount} cards remaining, ${newDiscardCount} in discard`);
}

// Game state update functions
async function updateGameStateAfterPresidentDraw(selectedPolicies, discardedPolicy) {
    const gameId = getGameId();
    if (!gameId) {
        throw new Error('Game ID not found');
    }
    
    const game = latestGame;
    if (!game) {
        throw new Error('Game data not loaded');
    }
    
    try {
        const gameRef = doc(db, 'games', gameId);
        
        // Update game state to move to chancellor phase
        const updateData = {
            policyPhase: 'chancellor_choice',
            // Store the two selected policies for the chancellor to choose from
            selectedPolicies: selectedPolicies,
            // Store the discarded policy
            discardedPolicy: discardedPolicy,
            // Clear any previous enacted policy
            enactedPolicy: null
        };
        
        await updateDoc(gameRef, updateData);
        
        console.log('Game state updated after president draw:', updateData);
        
        // Update local visual state
        updateDeckVisualAfterDraw();
        
    } catch (error) {
        console.error('Failed to update game state after president draw:', error);
        throw error;
    }
}

// Advance to next government
async function advanceToNextGovernment(gameId, gameRef) {
    try {
        // Get current game state
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) {
            throw new Error('Game not found');
        }
        
        const game = gameSnap.data();
        const players = latestPlayers || [];
        
        if (players.length === 0) {
            throw new Error('No players found');
        }
        
        // Find next president (rotate clockwise)
        const currentPresId = game.currentPresidentPlayerId;
        const currentPresIndex = players.findIndex(p => p.id === currentPresId);
        const nextPresIndex = (currentPresIndex + 1) % players.length;
        const nextPres = players[nextPresIndex];
        
        // Reset game state for new government
        const updateData = {
            currentPresidentPlayerId: nextPres.id,
            currentChancellorPlayerId: null,
            nominatedChancellorPlayerId: null,
            electionVotes: {},
            voteResolution: null,
            policyPhase: null,
            enactedPolicy: null,
            selectedPolicies: null,
            discardedPolicy: null,
            // Update term limits
            termLimitLastPresidentId: game.currentPresidentPlayerId,
            termLimitLastChancellorId: game.currentChancellorPlayerId
        };
        
        await updateDoc(gameRef, updateData);
        
        console.log(`Advanced to next government. New President: ${nextPres.name || nextPres.id}`);
        
        // Update status
        setStatus(gameId, `New government formed. ${nextPres.name || 'President'} is now President.`);
        
        // Reset visual state
        setTableSpreadCount(calculateTableSpreadCountFromGameState({ ...game, ...updateData }));
        setDiscardCount(calculateDiscardCountFromGameState({ ...game, ...updateData }));
        
    } catch (error) {
        console.error('Failed to advance to next government:', error);
        throw error;
    }
}

// Election vote resolution
function maybeResolveElectionVote(gameId) {
    const game = latestGame;
    if (!game || !game.nominatedChancellorPlayerId) return;
    
    const votes = game.electionVotes || {};
    const players = latestPlayers || [];
    const alivePlayers = players.filter(p => p.alive !== false);
    
    if (Object.keys(votes).length < alivePlayers.length) return; // Not all votes in yet
    
    // Count votes
    let jaVotes = 0;
    let neinVotes = 0;
    
    Object.entries(votes).forEach(([playerId, vote]) => {
        const player = players.find(p => p.id === playerId);
        if (player && player.alive !== false) {
            if (vote === 'ja') jaVotes++;
            else if (vote === 'nein') neinVotes++;
        }
    });
    
    // Determine result
    const passed = jaVotes > neinVotes;
    const voteResolution = { passed, jaVotes, neinVotes };
    
    console.log(`Election resolved: ${passed ? 'PASSED' : 'FAILED'} (${jaVotes} Ja, ${neinVotes} Nein)`);
    
    // Update game state
    updateElectionResult(gameId, voteResolution, passed);
}

// Update election result in game state
async function updateElectionResult(gameId, voteResolution, passed) {
    try {
        const gameRef = doc(db, 'games', gameId);
        
        const updateData = {
            voteResolution: voteResolution
        };
        
        if (passed) {
            // Election passed - move to policy phase
            updateData.policyPhase = 'president_draw';
            updateData.currentChancellorPlayerId = latestGame.nominatedChancellorPlayerId;
            
            // Update status
            setStatus(gameId, 'Election passed! President draws policy cards.');
            
        } else {
            // Election failed - advance election tracker
            const currentTracker = Number(latestGame.electionTracker || 0);
            updateData.electionTracker = currentTracker + 1;
            
            // Check if game should end due to failed elections
            if (currentTracker + 1 >= 3) {
                // Top-deck a policy
                const topDeckedPolicy = await topDeckPolicy(gameId);
                updateData.enactedPolicy = topDeckedPolicy;
                updateData.policyPhase = 'completed';
                
                setStatus(gameId, `Election failed! Top-decked ${topDeckedPolicy} policy enacted.`);
            } else {
                setStatus(gameId, `Election failed! Election tracker: ${currentTracker + 1}/3`);
            }
            
            // Reset for next government
            updateData.currentPresidentPlayerId = null;
            updateData.currentChancellorPlayerId = null;
            updateData.nominatedChancellorPlayerId = null;
            updateData.electionVotes = {};
        }
        
        await updateDoc(gameRef, updateData);
        
    } catch (error) {
        console.error('Failed to update election result:', error);
    }
}

// Top-deck a policy when election tracker reaches 3
async function topDeckPolicy(gameId) {
    // For now, return a random policy
    // This should be updated to use actual deck state
    const policies = ['liberal', 'fascist'];
    const randomPolicy = policies[Math.floor(Math.random() * policies.length)];
    
    console.log(`Top-decked policy: ${randomPolicy}`);
    
    // Update policy count
    const gameRef = doc(db, 'games', gameId);
    const updateData = {};
    
    if (randomPolicy === 'liberal') {
        updateData.liberalPolicies = increment(1);
    } else {
        updateData.fascistPolicies = increment(1);
    }
    
    await updateDoc(gameRef, updateData);
    
    return randomPolicy;
}

// Stuck game checker
function startStuckGameChecker(gameId) {
    return setInterval(async () => {
        try {
            const game = latestGame;
            if (!game || game.state !== 'playing') return;
            
            // Check for stuck states
            const issues = detectGameIssues(gameId, game, latestPlayers);
            
            if (issues.length > 0) {
                console.log('Detected game issues:', issues);
                
                // Auto-repair if possible
                const repaired = await autoRepairGame(gameId, issues);
                if (repaired) {
                    console.log('Game auto-repaired');
                }
            }
            
        } catch (error) {
            console.error('Stuck game checker error:', error);
        }
    }, 30000); // Check every 30 seconds
}

// Detect game issues
function detectGameIssues(gameId, game, players) {
    const issues = [];
    
    if (!game || !players) return issues;
    
    // Check for missing president
    if (!game.currentPresidentPlayerId) {
        issues.push('missing_president');
    }
    
    // Check for stuck nomination phase
    if (game.state === 'playing' && !game.nominatedChancellorPlayerId && !game.currentPresidentPlayerId) {
        issues.push('stuck_nomination');
    }
    
    // Check for stuck voting phase
    if (game.nominatedChancellorPlayerId && !game.voteResolution) {
        const votes = game.electionVotes || {};
        const alivePlayers = players.filter(p => p.alive !== false);
        
        if (Object.keys(votes).length >= alivePlayers.length) {
            issues.push('stuck_voting');
        }
    }
    
    // Check for stuck policy phase
    if (game.policyPhase === 'president_draw' && !game.selectedPolicies) {
        issues.push('stuck_president_draw');
    }
    
    if (game.policyPhase === 'chancellor_choice' && !game.enactedPolicy) {
        issues.push('stuck_chancellor_choice');
    }
    
    return issues;
}

// Auto-repair game issues
async function autoRepairGame(gameId, issues) {
    try {
        const gameRef = doc(db, 'games', gameId);
        
        for (const issue of issues) {
            switch (issue) {
                case 'missing_president':
                    // Assign next president
                    const players = latestPlayers || [];
                    if (players.length > 0) {
                        const nextPres = players[0]; // Simple fallback
                        await updateDoc(gameRef, { currentPresidentPlayerId: nextPres.id });
                        console.log(`Auto-assigned president: ${nextPres.name || nextPres.id}`);
                    }
                    break;
                    
                case 'stuck_voting':
                    // Force resolve voting
                    const votes = game.electionVotes || {};
                    const alivePlayers = latestPlayers.filter(p => p.alive !== false);
                    
                    if (Object.keys(votes).length >= alivePlayers.length) {
                        await maybeResolveElectionVote(gameId);
                    }
                    break;
                    
                // Add more auto-repair cases as needed
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('Auto-repair failed:', error);
        return false;
    }
}

// Export functions for use in other modules
window.setTableSpreadCount = setTableSpreadCount;
window.getTableSpreadCount = getTableSpreadCount;
window.setDiscardCount = setDiscardCount;
window.getDiscardCount = getDiscardCount;
window.resetDiscardCount = resetDiscardCount;
window.updateTableSpreadVisual = updateTableSpreadVisual;
window.updateDiscardPileVisual = updateDiscardPileVisual;
window.calculateTableSpreadCountFromGameState = calculateTableSpreadCountFromGameState;
window.calculateDiscardCountFromGameState = calculateDiscardCountFromGameState;
window.updateDeckVisualAfterDraw = updateDeckVisualAfterDraw;
window.updateGameStateAfterPresidentDraw = updateGameStateAfterPresidentDraw;
window.advanceToNextGovernment = advanceToNextGovernment;
window.maybeResolveElectionVote = maybeResolveElectionVote;
window.updateElectionResult = updateElectionResult;
window.topDeckPolicy = topDeckPolicy;
window.startStuckGameChecker = startStuckGameChecker;
window.detectGameIssues = detectGameIssues;
window.autoRepairGame = autoRepairGame;
