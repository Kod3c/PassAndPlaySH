// Secret Hitler Game Engine
// Handles all game rules, state management, and game flow

class SecretHitlerGameEngine {
    constructor() {
        this.roleDistribution = {
            5: { liberals: 3, fascists: 1, hitler: 1 },
            6: { liberals: 4, fascists: 1, hitler: 1 },
            7: { liberals: 4, fascists: 2, hitler: 1 },
            8: { liberals: 5, fascists: 2, hitler: 1 },
            9: { liberals: 5, fascists: 3, hitler: 1 },
            10: { liberals: 6, fascists: 3, hitler: 1 }
        };
        
        this.policyDeck = {
            liberal: 6,
            fascist: 11
        };
        
        this.executivePowers = {
            3: 'investigate',
            4: 'policyPeek',
            5: 'specialElection',
            6: 'execution'
        };
    }

    // Initialize a new game
    initializeGame(playerCount, playerNames, options = {}) {
        if (playerCount < 5 || playerCount > 10) {
            throw new Error('Player count must be between 5 and 10');
        }

        if (playerNames.length !== playerCount) {
            throw new Error('Player names count must match player count');
        }

        const distribution = this.roleDistribution[playerCount];
        
        // Create players array
        const players = playerNames.map((name, index) => ({
            id: index,
            name: name,
            isAlive: true,
            role: null, // Will be assigned
            hasBeenPresident: false,
            hasBeenChancellor: false,
            termCount: 0
        }));

        // Create and shuffle roles
        const roles = this.createRoles(distribution);
        this.shuffleArray(roles);
        
        // Assign roles to players
        players.forEach((player, index) => {
            player.role = roles[index];
        });

        // Create and shuffle policy deck
        const deck = this.createPolicyDeck();
        this.shuffleArray(deck);

        // Initialize game state
        const gameState = {
            players: players,
            currentPhase: 'setup',
            electionTracker: 0,
            policies: {
                liberal: 0,
                fascist: 0
            },
            deck: deck,
            discard: [],
            currentPresident: null,
            currentChancellor: null,
            lastGovernment: null,
            gameLog: [],
            timestamp: Date.now(),
            options: options,
            playerCount: playerCount
        };

        return gameState;
    }

    // Create roles array based on distribution
    createRoles(distribution) {
        const roles = [];
        
        // Add liberals
        for (let i = 0; i < distribution.liberals; i++) {
            roles.push('liberal');
        }
        
        // Add fascists
        for (let i = 0; i < distribution.fascists; i++) {
            roles.push('fascist');
        }
        
        // Add Hitler
        roles.push('hitler');
        
        return roles;
    }

    // Create policy deck
    createPolicyDeck() {
        const deck = [];
        
        // Add liberal policies
        for (let i = 0; i < this.policyDeck.liberal; i++) {
            deck.push('liberal');
        }
        
        // Add fascist policies
        for (let i = 0; i < this.policyDeck.fascist; i++) {
            deck.push('fascist');
        }
        
        return deck;
    }

    // Fisher-Yates shuffle algorithm
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Start the game (move from setup to election phase)
    startGame(gameState) {
        if (gameState.currentPhase !== 'setup') {
            throw new Error('Game can only be started from setup phase');
        }

        gameState.currentPhase = 'election';
        gameState.currentPresident = this.selectNextPresident(gameState);
        
        this.logAction(gameState, 'Game started', {
            firstPresident: gameState.currentPresident
        });

        return gameState;
    }

    // Select next president (simple rotation for now)
    selectNextPresident(gameState) {
        const alivePlayers = gameState.players.filter(p => p.isAlive);
        
        if (gameState.currentPresident === null) {
            // First president - random selection
            return alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
        }

        // Find current president index and move to next
        const currentIndex = alivePlayers.findIndex(p => p.id === gameState.currentPresident);
        const nextIndex = (currentIndex + 1) % alivePlayers.length;
        
        return alivePlayers[nextIndex].id;
    }

    // Nominate chancellor
    nominateChancellor(gameState, presidentId, chancellorId) {
        if (gameState.currentPhase !== 'election') {
            throw new Error('Can only nominate during election phase');
        }

        if (gameState.currentPresident !== presidentId) {
            throw new Error('Only current president can nominate');
        }

        if (chancellorId === presidentId) {
            throw new Error('President cannot nominate themselves');
        }

        const chancellor = gameState.players.find(p => p.id === chancellorId);
        if (!chancellor || !chancellor.isAlive) {
            throw new Error('Invalid chancellor selection');
        }

        if (gameState.lastGovernment && 
            gameState.lastGovernment.president === presidentId && 
            gameState.lastGovernment.chancellor === chancellorId) {
            throw new Error('Cannot repeat the same government');
        }

        gameState.currentChancellor = chancellorId;
        gameState.currentPhase = 'voting';

        this.logAction(gameState, 'Chancellor nominated', {
            president: presidentId,
            chancellor: chancellorId
        });

        return gameState;
    }

    // Vote on government
    vote(gameState, playerId, vote) {
        if (gameState.currentPhase !== 'voting') {
            throw new Error('Can only vote during voting phase');
        }

        if (vote !== 'ja' && vote !== 'nein') {
            throw new Error('Vote must be "ja" or "nein"');
        }

        const player = gameState.players.find(p => p.id === playerId);
        if (!player || !player.isAlive) {
            throw new Error('Invalid player');
        }

        // Store vote (in real implementation, this would be more sophisticated)
        if (!gameState.currentVotes) {
            gameState.currentVotes = {};
        }
        gameState.currentVotes[playerId] = vote;

        this.logAction(gameState, 'Vote cast', {
            player: playerId,
            vote: vote
        });

        return gameState;
    }

    // Resolve election results
    resolveElection(gameState) {
        if (gameState.currentPhase !== 'voting') {
            throw new Error('Can only resolve election during voting phase');
        }

        const votes = gameState.currentVotes || {};
        const jaVotes = Object.values(votes).filter(v => v === 'ja').length;
        const neinVotes = Object.values(votes).filter(v => v === 'nein').length;
        const totalVotes = jaVotes + neinVotes;

        if (totalVotes < gameState.players.filter(p => p.isAlive).length) {
            throw new Error('Not all players have voted');
        }

        const governmentPasses = jaVotes > neinVotes;

        if (governmentPasses) {
            // Government passes - move to legislation phase
            gameState.currentPhase = 'legislation';
            gameState.lastGovernment = {
                president: gameState.currentPresident,
                chancellor: gameState.currentChancellor
            };
            
            // Update player stats
            const president = gameState.players.find(p => p.id === gameState.currentPresident);
            const chancellor = gameState.players.find(p => p.id === gameState.currentChancellor);
            
            if (president) president.hasBeenPresident = true;
            if (chancellor) chancellor.hasBeenChancellor = true;

            this.logAction(gameState, 'Government elected', {
                president: gameState.currentPresident,
                chancellor: gameState.currentChancellor
            });
        } else {
            // Government fails - advance election tracker
            gameState.electionTracker++;
            gameState.currentPhase = 'election';
            
            // Check for failed election policy enactment
            if (gameState.electionTracker >= 3) {
                this.enactFailedElectionPolicy(gameState);
            } else {
                // Select next president
                gameState.currentPresident = this.selectNextPresident(gameState);
            }

            this.logAction(gameState, 'Government failed', {
                electionTracker: gameState.electionTracker
            });
        }

        // Clear votes
        delete gameState.currentVotes;
        gameState.currentChancellor = null;

        return gameState;
    }

    // Enact policy due to failed elections
    enactFailedElectionPolicy(gameState) {
        if (gameState.deck.length === 0) {
            this.reshuffleDiscard(gameState);
        }

        const policy = gameState.deck.pop();
        gameState.policies[policy]++;
        gameState.electionTracker = 0;

        this.logAction(gameState, 'Policy enacted (failed election)', {
            policy: policy,
            liberalPolicies: gameState.policies.liberal,
            fascistPolicies: gameState.policies.fascist
        });

        // Check win conditions
        this.checkWinConditions(gameState);
    }

    // Legislative session - president draws and discards
    presidentLegislation(gameState, presidentId, discardedPolicy) {
        if (gameState.currentPhase !== 'legislation') {
            throw new Error('Can only perform legislation during legislation phase');
        }

        if (gameState.currentPresident !== presidentId) {
            throw new Error('Only current president can perform legislation');
        }

        if (gameState.deck.length < 3) {
            this.reshuffleDiscard(gameState);
        }

        // Draw 3 policies
        const drawnPolicies = gameState.deck.splice(-3, 3);
        
        // Remove discarded policy
        const discardIndex = drawnPolicies.indexOf(discardedPolicy);
        if (discardIndex === -1) {
            throw new Error('Invalid policy discard');
        }

        drawnPolicies.splice(discardIndex, 1);
        gameState.discard.push(discardedPolicy);

        // Chancellor now chooses from remaining 2
        gameState.availablePolicies = drawnPolicies;
        gameState.currentPhase = 'chancellorChoice';

        this.logAction(gameState, 'President legislation', {
            president: presidentId,
            discardedPolicy: discardedPolicy,
            availablePolicies: drawnPolicies
        });

        return gameState;
    }

    // Chancellor enacts policy
    chancellorEnactPolicy(gameState, chancellorId, enactedPolicy) {
        if (gameState.currentPhase !== 'chancellorChoice') {
            throw new Error('Can only enact policy during chancellor choice phase');
        }

        if (gameState.currentChancellor !== chancellorId) {
            throw new Error('Only current chancellor can enact policy');
        }

        if (!gameState.availablePolicies.includes(enactedPolicy)) {
            throw new Error('Invalid policy selection');
        }

        // Enact the policy
        gameState.policies[enactedPolicy]++;
        
        // Remove from available policies and add remaining to discard
        const remainingPolicies = gameState.availablePolicies.filter(p => p !== enactedPolicy);
        gameState.discard.push(...remainingPolicies);
        
        // Clear available policies
        delete gameState.availablePolicies;

        this.logAction(gameState, 'Policy enacted', {
            chancellor: chancellorId,
            policy: enactedPolicy,
            liberalPolicies: gameState.policies.liberal,
            fascistPolicies: gameState.policies.fascist
        });

        // Check for executive powers
        if (enactedPolicy === 'fascist') {
            this.checkExecutivePower(gameState);
        }

        // Check win conditions
        this.checkWinConditions(gameState);

        // Move to next round
        this.nextRound(gameState);

        return gameState;
    }

    // Check for executive powers
    checkExecutivePower(gameState) {
        const fascistCount = gameState.policies.fascist;
        
        if (this.executivePowers[fascistCount]) {
            gameState.currentPhase = 'executivePower';
            gameState.availablePower = this.executivePowers[fascistCount];
            
            this.logAction(gameState, 'Executive power unlocked', {
                power: this.executivePowers[fascistCount],
                fascistPolicies: fascistCount
            });
        }
    }

    // Check win conditions
    checkWinConditions(gameState) {
        const liberalPolicies = gameState.policies.liberal;
        const fascistPolicies = gameState.policies.fascist;

        // Liberal win conditions
        if (liberalPolicies >= 5) {
            gameState.winner = 'liberal';
            gameState.winCondition = 'liberalPolicies';
            gameState.currentPhase = 'gameOver';
            return;
        }

        // Fascist win conditions
        if (fascistPolicies >= 6) {
            gameState.winner = 'fascist';
            gameState.winCondition = 'fascistPolicies';
            gameState.currentPhase = 'gameOver';
            return;
        }

        // Hitler execution win (handled in execution power)
        // Hitler election win (handled in election resolution)
    }

    // Move to next round
    nextRound(gameState) {
        if (gameState.currentPhase === 'gameOver') {
            return gameState;
        }

        // Select next president
        gameState.currentPresident = this.selectNextPresident(gameState);
        gameState.currentPhase = 'election';

        this.logAction(gameState, 'Next round', {
            newPresident: gameState.currentPresident
        });

        return gameState;
    }

    // Reshuffle discard pile into deck
    reshuffleDiscard(gameState) {
        if (gameState.discard.length === 0) {
            throw new Error('No cards in discard pile to reshuffle');
        }

        gameState.deck = [...gameState.discard];
        gameState.discard = [];
        this.shuffleArray(gameState.deck);

        this.logAction(gameState, 'Deck reshuffled', {
            cardsShuffled: gameState.deck.length
        });
    }

    // Log game actions
    logAction(gameState, action, details = {}) {
        const logEntry = {
            timestamp: Date.now(),
            action: action,
            details: details,
            phase: gameState.currentPhase
        };

        gameState.gameLog.push(logEntry);
    }

    // Get game state summary
    getGameSummary(gameState) {
        return {
            phase: gameState.currentPhase,
            players: gameState.players.map(p => ({
                id: p.id,
                name: p.name,
                isAlive: p.isAlive,
                role: p.role
            })),
            policies: gameState.policies,
            electionTracker: gameState.electionTracker,
            currentPresident: gameState.currentPresident,
            currentChancellor: gameState.currentChancellor,
            winner: gameState.winner,
            winCondition: gameState.winCondition
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecretHitlerGameEngine;
}
