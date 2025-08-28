// Game Repair - Game repair functionality and manual repair tools

// Main repair function
async function repairGameState(gameId) {
    try {
        console.log(`Starting game repair for ${gameId}`);
        
        const game = latestGame;
        const players = latestPlayers || [];
        
        if (!game || !players.length) {
            throw new Error('Game data not loaded');
        }
        
        const issues = detectGameIssues(gameId, game, players);
        console.log(`Detected ${issues.length} issues:`, issues);
        
        if (issues.length === 0) {
            console.log('No issues detected');
            return false;
        }
        
        // Perform repairs
        const repaired = await performRepairs(gameId, issues);
        
        if (repaired) {
            console.log('Game repair completed successfully');
            setStatus(gameId, 'Game repaired successfully!');
        } else {
            console.log('Game repair failed');
            setStatus(gameId, 'Game repair failed. Please try again.');
        }
        
        return repaired;
        
    } catch (error) {
        console.error('Game repair error:', error);
        setStatus(gameId, `Repair failed: ${error.message}`);
        throw error;
    }
}

// Perform specific repairs
async function performRepairs(gameId, issues) {
    try {
        const gameRef = doc(db, 'games', gameId);
        
        for (const issue of issues) {
            console.log(`Repairing issue: ${issue}`);
            
            switch (issue) {
                case 'missing_president':
                    await repairMissingPresident(gameId, gameRef);
                    break;
                    
                case 'stuck_nomination':
                    await repairStuckNomination(gameId, gameRef);
                    break;
                    
                case 'stuck_voting':
                    await repairStuckVoting(gameId, gameRef);
                    break;
                    
                case 'stuck_president_draw':
                    await repairStuckPresidentDraw(gameId, gameRef);
                    break;
                    
                case 'stuck_chancellor_choice':
                    await repairStuckChancellorChoice(gameId, gameRef);
                    break;
                    
                default:
                    console.log(`Unknown issue type: ${issue}`);
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('Repair execution failed:', error);
        return false;
    }
}

// Repair missing president
async function repairMissingPresident(gameId, gameRef) {
    try {
        const players = latestPlayers || [];
        if (players.length === 0) {
            throw new Error('No players available');
        }
        
        // Find next available president
        let nextPres = null;
        
        // First, try to find a player who hasn't been president recently
        const recentPresidents = [];
        if (latestGame.termLimitLastPresidentId) {
            recentPresidents.push(latestGame.termLimitLastPresidentId);
        }
        
        for (const player of players) {
            if (player.alive !== false && !recentPresidents.includes(player.id)) {
                nextPres = player;
                break;
            }
        }
        
        // If no suitable player found, just pick the first available
        if (!nextPres) {
            nextPres = players.find(p => p.alive !== false) || players[0];
        }
        
        if (!nextPres) {
            throw new Error('No suitable president found');
        }
        
        // Assign president
        await updateDoc(gameRef, {
            currentPresidentPlayerId: nextPres.id,
            nominatedChancellorPlayerId: null,
            electionVotes: {},
            voteResolution: null,
            policyPhase: null,
            enactedPolicy: null
        });
        
        console.log(`Repaired missing president: ${nextPres.name || nextPres.id}`);
        setStatus(gameId, `President assigned: ${nextPres.name || 'Player'}`);
        
    } catch (error) {
        console.error('Failed to repair missing president:', error);
        throw error;
    }
}

// Repair stuck nomination
async function repairStuckNomination(gameId, gameRef) {
    try {
        // This usually means we need a president
        if (!latestGame.currentPresidentPlayerId) {
            await repairMissingPresident(gameId, gameRef);
        } else {
            // Clear any stuck state
            await updateDoc(gameRef, {
                nominatedChancellorPlayerId: null,
                electionVotes: {},
                voteResolution: null,
                policyPhase: null,
                enactedPolicy: null
            });
            
            console.log('Repaired stuck nomination phase');
            setStatus(gameId, 'Nomination phase reset');
        }
        
    } catch (error) {
        console.error('Failed to repair stuck nomination:', error);
        throw error;
    }
}

// Repair stuck voting
async function repairStuckVoting(gameId, gameRef) {
    try {
        const votes = latestGame.electionVotes || {};
        const players = latestPlayers || [];
        const alivePlayers = players.filter(p => p.alive !== false);
        
        if (Object.keys(votes).length >= alivePlayers.length) {
            // All votes are in, resolve the election
            await maybeResolveElectionVote(gameId);
            console.log('Repaired stuck voting by resolving election');
        } else {
            // Clear stuck voting state
            await updateDoc(gameRef, {
                electionVotes: {},
                voteResolution: null
            });
            
            console.log('Repaired stuck voting by clearing state');
            setStatus(gameId, 'Voting phase reset');
        }
        
    } catch (error) {
        console.error('Failed to repair stuck voting:', error);
        throw error;
    }
}

// Repair stuck president draw
async function repairStuckPresidentDraw(gameId, gameRef) {
    try {
        // Reset to nomination phase
        await updateDoc(gameRef, {
            policyPhase: null,
            selectedPolicies: null,
            discardedPolicy: null,
            enactedPolicy: null
        });
        
        console.log('Repaired stuck president draw phase');
        setStatus(gameId, 'President draw phase reset');
        
    } catch (error) {
        console.error('Failed to repair stuck president draw:', error);
        throw error;
    }
}

// Repair stuck chancellor choice
async function repairStuckChancellorChoice(gameId, gameRef) {
    try {
        // Reset to nomination phase
        await updateDoc(gameRef, {
            policyPhase: null,
            selectedPolicies: null,
            discardedPolicy: null,
            enactedPolicy: null,
            currentChancellorPlayerId: null
        });
        
        console.log('Repaired stuck chancellor choice phase');
        setStatus(gameId, 'Chancellor choice phase reset');
        
    } catch (error) {
        console.error('Failed to repair stuck chancellor choice:', error);
        throw error;
    }
}

// Manual repair functions for specific issues

// Force advance to next government
async function forceAdvanceGovernment(gameId) {
    try {
        const gameRef = doc(db, 'games', gameId);
        await advanceToNextGovernment(gameId, gameRef);
        console.log('Forced government advancement');
        return true;
    } catch (error) {
        console.error('Failed to force advance government:', error);
        return false;
    }
}

// Reset game phase
async function resetGamePhase(gameId, phase) {
    try {
        const gameRef = doc(db, 'games', gameId);
        
        const resetData = {
            policyPhase: phase,
            nominatedChancellorPlayerId: null,
            electionVotes: {},
            voteResolution: null,
            enactedPolicy: null,
            selectedPolicies: null,
            discardedPolicy: null
        };
        
        await updateDoc(gameRef, resetData);
        
        console.log(`Reset game phase to: ${phase}`);
        setStatus(gameId, `Game phase reset to: ${phase}`);
        
        return true;
        
    } catch (error) {
        console.error('Failed to reset game phase:', error);
        return false;
    }
}

// Clear all votes
async function clearAllVotes(gameId) {
    try {
        const gameRef = doc(db, 'games', gameId);
        
        await updateDoc(gameRef, {
            electionVotes: {},
            voteResolution: null
        });
        
        console.log('Cleared all votes');
        setStatus(gameId, 'All votes cleared');
        
        return true;
        
    } catch (error) {
        console.error('Failed to clear votes:', error);
        return false;
    }
}

// Reset election tracker
async function resetElectionTracker(gameId) {
    try {
        const gameRef = doc(db, 'games', gameId);
        
        await updateDoc(gameRef, {
            electionTracker: 0
        });
        
        console.log('Reset election tracker');
        setStatus(gameId, 'Election tracker reset');
        
        return true;
        
    } catch (error) {
        console.error('Failed to reset election tracker:', error);
        return false;
    }
}

// Comprehensive game reset
async function comprehensiveGameReset(gameId) {
    try {
        const gameRef = doc(db, 'games', gameId);
        
        const resetData = {
            currentPresidentPlayerId: null,
            currentChancellorPlayerId: null,
            nominatedChancellorPlayerId: null,
            electionVotes: {},
            voteResolution: null,
            policyPhase: null,
            enactedPolicy: null,
            selectedPolicies: null,
            discardedPolicy: null,
            electionTracker: 0,
            termLimitLastPresidentId: null,
            termLimitLastChancellorId: null
        };
        
        await updateDoc(gameRef, resetData);
        
        console.log('Comprehensive game reset completed');
        setStatus(gameId, 'Game completely reset');
        
        return true;
        
    } catch (error) {
        console.error('Failed to perform comprehensive reset:', error);
        return false;
    }
}

// Export functions for use in other modules
window.repairGameState = repairGameState;
window.performRepairs = performRepairs;
window.repairMissingPresident = repairMissingPresident;
window.repairStuckNomination = repairStuckNomination;
window.repairStuckVoting = repairStuckVoting;
window.repairStuckPresidentDraw = repairStuckPresidentDraw;
window.repairStuckChancellorChoice = repairStuckChancellorChoice;
window.forceAdvanceGovernment = forceAdvanceGovernment;
window.resetGamePhase = resetGamePhase;
window.clearAllVotes = clearAllVotes;
window.resetElectionTracker = resetElectionTracker;
window.comprehensiveGameReset = comprehensiveGameReset;
