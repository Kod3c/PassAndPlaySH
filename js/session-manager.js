/**
 * Session Manager - Handles single-session enforcement per player
 * Detects when a player logs in from another device and boots the previous session
 */

import { getFirestore, doc, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

class SessionManager {
    constructor(app) {
        this.db = getFirestore(app);
        this.sessionId = this.generateSessionId();
        this.unsubscribe = null;
        this.gameId = null;
        this.playerId = null;
        this.onSessionConflict = null;
    }

    /**
     * Generate a unique session ID for this browser tab
     */
    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Start monitoring for session conflicts
     * @param {string} gameId - The game ID
     * @param {string} playerId - The player ID
     * @param {Function} onConflict - Callback when session conflict is detected
     */
    async startMonitoring(gameId, playerId, onConflict) {
        this.gameId = gameId;
        this.playerId = playerId;
        this.onSessionConflict = onConflict;

        // Set this session ID on the player document
        await this.claimSession();

        // Listen for changes to the player document
        const playerRef = doc(this.db, 'games', gameId, 'players', playerId);

        this.unsubscribe = onSnapshot(playerRef, (snapshot) => {
            if (!snapshot.exists()) {
                console.warn('Player document no longer exists');
                return;
            }

            const data = snapshot.data();
            const currentSessionId = data.sessionId;

            // If the sessionId changed and it's not ours, we've been booted
            if (currentSessionId && currentSessionId !== this.sessionId) {
                console.warn('Session conflict detected - another device claimed this player');
                this.handleSessionConflict();
            }
        });
    }

    /**
     * Claim this session by writing our session ID to the player document
     */
    async claimSession() {
        if (!this.gameId || !this.playerId) return;

        try {
            const playerRef = doc(this.db, 'games', this.gameId, 'players', this.playerId);
            await updateDoc(playerRef, {
                sessionId: this.sessionId,
                lastSeen: serverTimestamp()
            });
            console.log('Session claimed:', this.sessionId);
        } catch (error) {
            console.error('Failed to claim session:', error);
        }
    }

    /**
     * Handle session conflict by showing modal and stopping updates
     */
    handleSessionConflict() {
        // Stop monitoring
        this.stopMonitoring();

        // Call the conflict callback
        if (this.onSessionConflict) {
            this.onSessionConflict();
        } else {
            // Default behavior: show alert and redirect
            this.showDefaultConflictModal();
        }
    }

    /**
     * Default modal for session conflicts
     */
    showDefaultConflictModal() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'session-conflict-modal';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 99999;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 32px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;

        const icon = document.createElement('div');
        icon.style.cssText = `
            font-size: 64px;
            margin-bottom: 16px;
        `;
        icon.textContent = '⚠️';

        const title = document.createElement('h2');
        title.style.cssText = `
            margin: 0 0 16px 0;
            font-size: 24px;
            font-weight: 800;
            color: #101820;
        `;
        title.textContent = 'Session Conflict';

        const message = document.createElement('p');
        message.style.cssText = `
            margin: 0 0 24px 0;
            font-size: 16px;
            line-height: 1.5;
            color: #333;
        `;
        message.textContent = 'You have logged in from another device or browser tab. Only one session can be active at a time.';

        const button = document.createElement('button');
        button.style.cssText = `
            background: #DA291C;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 32px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s;
        `;
        button.textContent = 'Return to Home';
        button.addEventListener('click', () => {
            window.location.href = '../index.html';
        });
        button.addEventListener('mouseenter', () => {
            button.style.background = '#b82218';
        });
        button.addEventListener('mouseleave', () => {
            button.style.background = '#DA291C';
        });

        modal.appendChild(icon);
        modal.appendChild(title);
        modal.appendChild(message);
        modal.appendChild(button);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    /**
     * Stop monitoring for session conflicts
     */
    stopMonitoring() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    /**
     * Clean up when leaving the page
     */
    cleanup() {
        this.stopMonitoring();
    }
}

export default SessionManager;
