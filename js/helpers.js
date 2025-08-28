// Helper functions for Secret Hitler game
// These functions have minimal dependencies and can be safely extracted

export function eligibleChancellorIds(game, players) {
    if (!game || !players) return [];
    const presId = game.currentPresidentPlayerId || null;
    const lastPres = game.termLimitLastPresidentId || null;
    const lastChanc = game.termLimitLastChancellorId || null;
    return players
        .filter(p => p && p.id && p.alive !== false)
        .filter(p => p.id !== presId)
        .filter(p => p.id !== lastPres && p.id !== lastChanc)
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
