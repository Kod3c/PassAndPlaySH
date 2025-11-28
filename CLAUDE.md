# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Secret Hitler - Pass and Play is a web-based implementation of the Secret Hitler board game supporting both local pass-and-play and Firebase-based multi-device online gameplay modes.

## Architecture

### Firebase-Based Multiplayer (Primary Implementation)

The active implementation uses Firebase Firestore for real-time multiplayer:

- **Game Flow**: [create.html](pages/create.html) → [lobby.html](pages/lobby.html) → [play.html](pages/play.html)
- **Core Game Logic**: [js/gameplay.js](js/gameplay.js) (extremely large file, ~2500+ lines, read in sections)
- **Database Layer**: [js/db.js](js/db.js) - Firestore operations, game CRUD, history logging, cleanup
- **Rendering**: [js/renderers.js](js/renderers.js) - Pure DOM manipulation functions
- **Helpers**: [js/helpers.js](js/helpers.js) - Game rule logic and visibility checks
- **Session Management**: [js/session-manager.js](js/session-manager.js) - Multi-tab conflict detection
- **Modals**: [js/modals.js](js/modals.js) - UI modal controllers

### Data Model

**Firestore Structure:**
```
games/{gameId}/
  - Document fields: state, playerCount, createdAt, updatedAt, expireAt, hostName, settings, etc.
  - players/{playerId} - Player documents with name, seat, alive, role, lastSeen
  - history/{eventId} - Event log with ts, type, visibility, message, actorId, audience, party
```

**Game States**: `lobby` → `active` / `in_progress` → `completed`

**Game Phases**: Tracked in game document - election, legislation, executive actions, policy enactment

### Legacy Local Game (Deprecated)

- **Location**: [js/app.js](js/app.js) - Contains deprecated `Game` class (lines 783-1434)
- **Status**: NOT used by Firebase implementation, kept for historical reference only
- **Known Issues**: setupPolicyStacks() bug (uses 15/17 cards), incomplete policy deck tracking

## Development Commands

### Local Development

1. Install XAMPP (Apache server)
2. Place project in `C:\xampp\htdocs\PassAndPlaySH\`
3. Start Apache in XAMPP control panel
4. Navigate to `http://localhost/PassAndPlaySH/`

The app automatically connects to the remote Firebase backend - no local database setup needed.

### Firebase Configuration

- **Project**: secrethitlerme (Firebase)
- **Indexes**: Defined in [firestore.indexes.json](firestore.indexes.json)
- **Config**: [js/firebase.js](js/firebase.js) contains API keys (public, safe to commit)

Deploy indexes: `firebase deploy --only firestore:indexes`

## Code Organization

### Module Responsibilities

- **[js/gameplay.js](js/gameplay.js)**: All game state management, phase transitions, superpower system, role assignment, policy drawing
- **[js/db.js](js/db.js)**: Firestore CRUD, real-time subscriptions, history event logging with visibility levels (public/private/partied/silent)
- **[js/renderers.js](js/renderers.js)**: Pure rendering functions with no game state dependencies (renderSlots, renderTracker, renderPlayers)
- **[js/helpers.js](js/helpers.js)**: Game rules (eligibleChancellorIds), event visibility (canSeeEvent), role banner management
- **[js/utils.js](js/utils.js)**: URL/session helpers (getGameId, getYouPlayerId, formatTime)
- **[js/constants.js](js/constants.js)**: Game constants (HEARTBEAT_INTERVAL_MS, RULE_KEYS)

### File Naming Patterns

- HTML pages: `pages/*.html`
- Page-specific styles: `pages/parts/*.css`
- Global styles: `styles/*.css`
- Images: `images/*.png`
- Admin tools: `admin/*.html`

## Key Patterns

### History Logging System

The game uses a 4-tier visibility system for event logging:

```javascript
// Public - everyone sees
await logPublic(gameId, 'Election succeeded!');

// Private - specific player IDs only
await logPrivate(gameId, 'You are Hitler', [playerId]);

// Partied - team-specific (fascist/liberal)
await logPartied(gameId, 'Fascist team wins!', 'fascist');

// Silent - admin/debug only
await logSilent(gameId, 'Internal state transition');
```

### Session Conflict Detection

The SessionManager prevents multi-tab issues by:
1. Writing unique sessionId to Firestore player doc
2. Monitoring sessionId changes via snapshot listener
3. Showing modal and blocking UI if conflict detected

### Superpower System

Fascist policies unlock executive powers based on player count:
- **5-6 players**: Slot 3 (policy peek), Slots 4-5 (execution)
- **7-8 players**: Slot 2 (investigation), Slot 3 (special election), Slots 4-5 (execution)
- **9-10 players**: Slots 1-2 (investigation), Slot 3 (special election), Slots 4-5 (execution)

Implementation: `getSuperpowerForSlot()` in [js/gameplay.js](js/gameplay.js)

## Critical Sections

### Role Assignment Security

- Roles are assigned server-side equivalent through careful Firestore writes
- Each player only sees their own role via private history events
- Role visibility is controlled by `canSeeEvent()` filtering

### Policy Deck Management

- 17 total cards: 6 liberal, 11 fascist
- Deck is shuffled and stored in game document
- Cards drawn in sets of 3 for president/chancellor flow
- Discard pile tracked separately

### Multi-Device Sync

All state changes go through Firestore transactions:
```javascript
await runTransaction(db, async (txn) => {
  // Read game state
  // Validate transition
  // Write updates
});
```

## Testing and Debugging

### Browser Console Helpers

When [pages/play.html](pages/play.html) is loaded:
- `window.debugFascistSlots(playerCount)` - Test slot overlay rendering

### Admin Tools

- [admin/cleanup.html](admin/cleanup.html) - Remove old/expired games
- [admin/test-cleanup.html](admin/test-cleanup.html) - Dry-run cleanup preview

### Game Cleanup

Automatic TTL rules in [js/db.js](js/db.js):
- Lobbies: 15 minutes (via `expireAt` field)
- Completed games: 7 days
- Abandoned games: 24 hours of inactivity
- Max age: 30 days regardless of state

## Common Tasks

### Adding a New Game Phase

1. Update game state in [js/gameplay.js](js/gameplay.js) - modify state machine
2. Add rendering logic in renderActions*() functions
3. Update button permissions in manageButtonPermissions()
4. Add history logging for visibility
5. Test state transitions via Firestore console

### Modifying UI Rendering

1. **Pure DOM changes**: Edit [js/renderers.js](js/renderers.js)
2. **Game-state-dependent rendering**: Edit [js/gameplay.js](js/gameplay.js)
3. **Styles**: Edit `pages/parts/play-styles.css` or `pages/parts/play-specific.css`

### Adding New History Events

Use appropriate visibility level:
```javascript
import { logPublic, logPrivate, logPartied, logSilent } from './db.js';

// Choose based on who should see the event
await logPublic(gameId, 'Public announcement', { type: 'phase' });
```

## Important Notes

- **Never modify [js/app.js](js/app.js) Game class** - it's deprecated legacy code
- **[js/gameplay.js](js/gameplay.js) is very large** - read in sections using offset/limit parameters
- **Firebase config is public** - API keys in [js/firebase.js](js/firebase.js) are safe to commit
- **ES6 modules**: All JS files use `import`/`export`, served as `type="module"`
- **Cache busting**: HTML files use `?v=timestamp` query params for CSS/JS
- **PWA ready**: [manifest.json](manifest.json) supports installation as mobile app
