# Admin Tools

This directory contains administrative tools for managing Secret Hitler games.

## 🗑️ Game Cleanup Tool

### Usage

1. **Open the cleanup page**: Navigate to `admin/cleanup.html` in your browser
2. **Preview cleanup**: Click "Preview Cleanup (Dry Run)" to see what would be deleted
3. **Review results**: Check the list of games and reasons for deletion
4. **Run cleanup**: Click "Run Cleanup (Permanent)" to delete games (requires confirmation)

### Cleanup Rules

Games are removed based on the following criteria:

- **Expired lobbies**: Games with `expireAt` timestamp in the past (15 minutes after creation)
- **Old completed games**: Completed games older than 7 days
- **Abandoned games**: Active games with no player activity for 24 hours
- **Too old games**: Any game older than 30 days regardless of state

### Configuration

Default thresholds are defined in `js/db.js`:

```javascript
const CLEANUP_CONFIG = {
  LOBBY_EXPIRY_MINUTES: 15,
  COMPLETED_GAME_RETENTION_DAYS: 7,
  ABANDONED_GAME_HOURS: 24,
  MAX_GAME_AGE_DAYS: 30,
  BATCH_SIZE: 100
};
```

### Safety Features

- **Dry run mode**: Preview changes before committing
- **Double confirmation**: Required before permanent deletion
- **Batch processing**: Handles large datasets efficiently
- **Error tracking**: Failed deletions are reported
- **Audit trail**: Detailed logging in browser console

### Performance Note

The current implementation fetches all games and filters client-side to avoid requiring Firestore composite indexes. This works well for small to medium databases (< 1000 games).

For better performance with large databases:

1. Deploy the Firestore indexes using the included `firestore.indexes.json`
2. Run: `firebase deploy --only firestore:indexes`
3. Wait for indexes to build in Firebase Console

## 🧪 Test Page

Use `admin/test-cleanup.html` to verify the cleanup functions are working correctly:

- Import validation
- Stats retrieval test
- Configuration validation

## Programmatic Usage

You can also use the cleanup functions programmatically:

```javascript
import { cleanupOldGames, getCleanupStats, deleteGame } from './js/db.js';

// Get statistics without deleting
const stats = await getCleanupStats();
console.log(`Found ${stats.games.length} games to clean`);

// Run cleanup with custom options
const results = await cleanupOldGames({
  dryRun: false,  // Set to true for preview
  maxGames: 50    // Limit number of games to process
});

console.log(`Deleted ${results.deleted} games`);

// Delete a specific game
await deleteGame('ABC12');
```

## Scheduling Automated Cleanup

To run cleanup automatically, you can:

1. **Firebase Cloud Functions**: Set up a scheduled function
2. **GitHub Actions**: Run cleanup on a schedule
3. **Cron Job**: Use a server-side cron to call the cleanup endpoint

Example Cloud Function:

```javascript
exports.scheduledCleanup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const { cleanupOldGames } = require('./db');
    const results = await cleanupOldGames({ dryRun: false });
    console.log('Cleanup complete:', results);
  });
```
