// Helper functions for Secret Hitler game
// These functions have minimal dependencies and can be safely extracted

export function eligibleChancellorIds(game, players) {
    if (!game || !players) return [];
    const presId = game.currentPresidentPlayerId || null;
    const lastPres = game.termLimitLastPresidentId || null;
    const lastChanc = game.termLimitLastChancellorId || null;

    // Count alive players to determine if term limit for president applies
    const aliveCount = players.filter(p => p && p.alive !== false).length;

    return players
        .filter(p => p && p.id && p.alive !== false)
        .filter(p => p.id !== presId) // Current president cannot be chancellor
        .filter(p => p.id !== lastChanc) // Last chancellor cannot be chancellor again
        .filter(p => {
            // Last president cannot be chancellor if there are more than 5 alive players
            if (p.id === lastPres && aliveCount > 5) {
                return false;
            }
            return true;
        })
        .map(p => p.id);
}

export function canSeeEvent(evt, youPlayer) {
    if (!evt || !youPlayer) return false;
    
    const vis = (evt && evt.visibility) || 'public';
    if (vis === 'silent') return false;
    if (vis === 'public') return true;
    
    if (vis === 'private') {
        const audience = Array.isArray(evt && evt.audience) ? evt.audience : [];
        return audience.includes(youPlayer.id);
    }
    
    if (vis === 'partied') {
        const party = ((evt && evt.party) || '').toString().toLowerCase();
        const yourParty = ((youPlayer && youPlayer.party) || '').toString().toLowerCase();
        return party && yourParty && party === yourParty;
    }
    
    return false;
}

export function setRoleBannerVisibility(visible) {
    const banner = document.getElementById('role-banner');
    if (!banner) return;
    banner.style.visibility = visible ? 'visible' : 'hidden';
}
