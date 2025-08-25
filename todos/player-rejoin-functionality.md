# Issue: Implement Player Rejoin Functionality for Disconnections and Accidental Tab Closures

## Problem Statement
Currently, if a player gets disconnected from the internet, closes their browser tab accidentally, or refreshes the page during an active Secret Hitler game, they lose their connection to the game and cannot rejoin. This creates a poor user experience and can disrupt ongoing games, especially in longer sessions.

## Why This Feature is Needed
1. **User Experience**: Accidental tab closures and network interruptions are common occurrences that shouldn't permanently remove players from games
2. **Game Continuity**: Secret Hitler games can last 30+ minutes, and losing a player mid-game can ruin the experience for everyone
3. **Mobile Usage**: Mobile users frequently switch between apps or have their browser backgrounded, leading to disconnections
4. **Network Reliability**: WiFi drops, mobile data switching, and other network issues shouldn't permanently eject players

## Current State Analysis
The codebase already has:
- Firebase Firestore for real-time game state management
- Anonymous authentication system
- Player management with unique IDs and seat assignments
- Real-time game state synchronization via `onGameSnapshot`
- Game history tracking system

## Proposed Solution

### 1. **Session Persistence Layer**
- Store player session data in `localStorage` including:
  - Current game ID
  - Player name and seat number
  - Last known game state timestamp
  - Player authentication token

### 2. **Rejoin Detection & Flow**
- **On page load**: Check `localStorage` for existing game session
- **Auto-rejoin prompt**: If valid session exists, show rejoin dialog
- **Session validation**: Verify the game still exists and player is still valid
- **State restoration**: Reconnect to real-time game updates

### 3. **Database Schema Updates**
```javascript
// Add to players collection
{
  name: "Player Name",
  seat: 1,
  alive: true,
  createdAt: timestamp,
  lastSeen: timestamp,        // NEW: Track when player was last active
  isConnected: true,          // NEW: Real-time connection status
  sessionId: "unique-session-id" // NEW: For rejoin validation
}
```

### 4. **Connection Status Management**
- Implement heartbeat system to track player connectivity
- Update `isConnected` field in real-time
- Handle "ghost" players who appear offline but may return
- Clean up stale connections after reasonable timeout

### 5. **Rejoin UI Components**
- **Rejoin Modal**: Appears on page load if valid session detected
- **Connection Status Indicator**: Show which players are currently online
- **Rejoin Button**: In lobby and game pages for manual reconnection
- **Session Recovery**: Automatic state restoration without losing game progress

## Implementation Details

### Frontend Changes
1. **`js/app.js`**: Add session management and rejoin detection
2. **`pages/join.html`**: Enhance with rejoin functionality
3. **`pages/play.html`**: Add connection status and rejoin options
4. **`js/db.js`**: Add connection tracking and session management

### Backend Considerations
1. **Firestore Security Rules**: Ensure players can only rejoin their own sessions
2. **Rate Limiting**: Prevent abuse of rejoin functionality
3. **Session Expiry**: Clean up old sessions to prevent security issues

## User Experience Flow
1. **Player disconnects** → Session data saved to `localStorage`
2. **Player returns** → Page detects existing session
3. **Rejoin prompt** → "Welcome back! Rejoin your game?"
4. **Validation** → Check game exists and player is still valid
5. **Reconnection** → Restore game state and real-time updates
6. **Seamless continuation** → Player resumes exactly where they left off

## Technical Benefits
- **Non-blocking**: Rejoin attempts don't interfere with active games
- **Secure**: Players can only rejoin their own sessions
- **Efficient**: Minimal database overhead for connection tracking
- **Scalable**: Works with existing Firebase infrastructure

## Success Metrics
- Reduced player frustration from accidental disconnections
- Increased game completion rates
- Better mobile user experience
- Positive user feedback on game reliability

## Priority
**High** - This feature directly impacts user retention and game completion rates, making it essential for a polished multiplayer experience.

## Estimated Effort
- **Frontend**: 2-3 days (session management, UI components)
- **Backend**: 1-2 days (database schema, connection tracking)
- **Testing**: 1 day (various disconnection scenarios)
- **Total**: 4-6 days

## Notes
This feature will significantly improve the user experience and make the game more robust for real-world usage scenarios where network interruptions and accidental closures are common.

---
*Created: $(date)*
*Status: Open*
*Type: Feature Request*
*Priority: High*
