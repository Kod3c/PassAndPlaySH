// Utility functions for Secret Hitler game
// These functions have no dependencies and can be safely extracted

export function getGameId() {
    const p = new URLSearchParams(window.location.search);
    return p.get('game') || localStorage.getItem('sh_currentGameId') || '';
}

export function hidePreloader() {
    const o = document.getElementById('preloader-overlay');
    if (o) o.style.display = 'none';
}

export function setPreloader(text) {
    const t = document.getElementById('preloader-text');
    if (t && text) t.textContent = text;
}

export function getYouPlayerId(gameId) {
    try { return sessionStorage.getItem(`sh_playerId_${gameId}`) || null; } catch (_) { return null; }
}

export function formatTime(ts) {
    try {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : null);
        if (!d) return '';
        return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
    } catch (_) { return ''; }
}
