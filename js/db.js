// Minimal Firestore helper module for game creation and lobby
// Responsibilities:
// - Ensure Firebase Auth (anonymous)
// - Create a game with initial players
// - Subscribe to a game's public data and players list

import { app } from './firebase.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  deleteDoc,
  writeBatch,
  limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const db = getFirestore(app);

function sanitizeGameName(raw) {
  const trimmed = String(raw || '').trim();
  const collapsed = trimmed.replace(/\s+/g, ' ');
  const cleaned = collapsed.replace(/[^A-Za-z0-9 _\-'.!?:()/]/g, '');
  return cleaned.slice(0, 48) || 'Secret Hitler Game';
}

function sanitizePlayerName(raw) {
  const trimmed = String(raw || '').trim();
  const collapsed = trimmed.replace(/\s+/g, ' ');
  const cleaned = collapsed.replace(/[^A-Za-z0-9 _\-'.]/g, '');
  return cleaned.slice(0, 24);
}

function normalizeNameKey(name) {
  return String(name || '')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function ensureAnonymousAuth() {
  try {
    const auth = getAuth(app);
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser;
  } catch (_) {
    return null;
  }
}

function generateGameId() {
  // 5-character unambiguous code (exclude 0/O and 1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export async function createGame(gameName, playerNames, hostPasswordHash = null, showVoteDetails = true) {
  await ensureAnonymousAuth();
  // Generate a unique 5-char ID (retry a few times just in case of collision)
  let gameId = '';
  let gameRef = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    gameId = generateGameId();
    gameRef = doc(db, 'games', gameId);
    // eslint-disable-next-line no-await-in-loop
    const existing = await getDoc(gameRef);
    if (!existing.exists()) break;
    if (attempt === 4) {
      throw new Error('Failed to create a unique game ID. Please try again.');
    }
  }
  const createdAt = serverTimestamp();

  // Validate and sanitize player names
  const sanitized = Array.isArray(playerNames) ? playerNames.map(sanitizePlayerName).filter(n => n) : [];
  if (sanitized.length < 5) {
    throw new Error('At least 5 valid player names are required.');
  }
  // Duplicate check (case-insensitive, whitespace-normalized)
  const keys = sanitized.map(normalizeNameKey);
  const uniqueCount = new Set(keys).size;
  if (uniqueCount !== sanitized.length) {
    throw new Error('Duplicate player names are not allowed.');
  }

  // Generate game name as "Secret Hitler - {gameId}"
  const generatedGameName = `Secret Hitler - ${gameId}`;

  await setDoc(gameRef, {
    id: gameId,
    name: generatedGameName,
    state: 'lobby',
    playerCount: sanitized.length,
    createdAt,
    updatedAt: createdAt,
    hostName: sanitized.length > 0 ? sanitized[0] : null,
    hostPasswordHash: hostPasswordHash || null,
    // Set initial expiry to 15 minutes from now; TTL will remove stale lobbies
    expireAt: new Date(Date.now() + 15 * 60 * 1000),
    // Game settings
    settings: {
      showVoteDetails: showVoteDetails
    }
  }, { merge: true });

  const playersCol = collection(gameRef, 'players');
  for (let i = 0; i < sanitized.length; i++) {
    const name = sanitized[i];
    await addDoc(playersCol, {
      name,
      seat: i + 1,
      alive: true,
      createdAt: serverTimestamp()
    });
  }

  return gameId;
}

export async function getGame(gameId) {
  const snap = await getDoc(doc(db, 'games', gameId));
  return snap.exists() ? snap.data() : null;
}

export function onGameSnapshot(gameId, callback) {
  const gameRef = doc(db, 'games', gameId);
  const playersQuery = query(collection(gameRef, 'players'), orderBy('seat', 'asc'));

  const unsubscribers = [];
  let latestGame = null;
  let latestPlayers = [];

  const emit = () => {
    if (typeof callback === 'function') callback({ game: latestGame, players: latestPlayers });
  };

  unsubscribers.push(onSnapshot(gameRef, (snap) => {
    latestGame = snap.exists() ? snap.data() : null;
    emit();
  }));

  unsubscribers.push(onSnapshot(playersQuery, (snap) => {
    latestPlayers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    emit();
  }));

  return () => unsubscribers.forEach(u => { try { u(); } catch (_) {} });
}

// Subscribe to history timeline ordered by time, then clientOrder
export function onHistory(gameId, callback, limit = 200) {
  const col = collection(doc(db, 'games', gameId), 'history');
  // Order by clientOrder only to avoid requiring a composite Firestore index
  const q = query(col, orderBy('clientOrder', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (typeof callback === 'function') callback(items);
    },
    (err) => {
      // Best-effort: surface an empty list on error so UI shows a friendly state
      console.warn('History subscription error', err);
      if (typeof callback === 'function') callback([]);
    }
  );
}


// History logging helpers
// Visibility levels: 'public' (everyone), 'private' (specific players),
// 'partied' (party members), 'silent' (admins/diagnostics only)
export async function addHistoryEvent(gameId, event) {
  try {
    // Ensure auth to allow serverTimestamp
    await ensureAnonymousAuth();
  } catch (_) {}

  const historyCol = collection(doc(db, 'games', gameId), 'history');
  // Provide a stable secondary sort key to break ties for same server ts
  const nowMs = Date.now();
  const perfMs = (typeof performance !== 'undefined' && performance.now) ? Math.floor(performance.now() % 1000) : Math.floor(Math.random() * 1000);
  const clientOrder = nowMs * 1000 + perfMs;

  const payload = {
    ts: serverTimestamp(),
    clientOrder,
    type: String(event && event.type || 'system'),
    visibility: String(event && event.visibility || 'public'),
    message: String(event && event.message || ''),
    actorId: event && event.actorId ? String(event.actorId) : null,
    audience: Array.isArray(event && event.audience) ? event.audience.slice(0, 16).map(String) : null,
    party: event && event.party ? String(event.party) : null,
    meta: event && event.meta ? event.meta : null
  };

  try {
    await addDoc(historyCol, payload);
  } catch (e) {
    // Best-effort only
    console.warn('Failed to add history event', e);
  }
}

export async function logPublic(gameId, message, extra = {}) {
  return addHistoryEvent(gameId, { visibility: 'public', type: extra.type || 'system', message, actorId: extra.actorId || null, meta: extra.meta || null });
}

export async function logPrivate(gameId, message, audiencePlayerIds, extra = {}) {
  const audience = Array.isArray(audiencePlayerIds) ? audiencePlayerIds : (audiencePlayerIds ? [audiencePlayerIds] : []);
  return addHistoryEvent(gameId, { visibility: 'private', type: extra.type || 'system', message, audience, actorId: extra.actorId || null, meta: extra.meta || null });
}

export async function logPartied(gameId, message, party, extra = {}) {
  const normalizedParty = (party || '').toString().toLowerCase();
  return addHistoryEvent(gameId, { visibility: 'partied', type: extra.type || 'system', message, party: normalizedParty, actorId: extra.actorId || null, meta: extra.meta || null });
}

export async function logSilent(gameId, message, extra = {}) {
  return addHistoryEvent(gameId, { visibility: 'silent', type: extra.type || 'system', message, actorId: extra.actorId || null, meta: extra.meta || null });
}


// ============================================================================
// Game Cleanup Functions
// ============================================================================

/**
 * Configuration for game cleanup thresholds
 */
const CLEANUP_CONFIG = {
  // Expire lobbies that haven't started after 15 minutes (handled by expireAt field)
  LOBBY_EXPIRY_MINUTES: 15,
  // Remove completed games after 7 days
  COMPLETED_GAME_RETENTION_DAYS: 7,
  // Remove abandoned active games with no player activity for 24 hours
  ABANDONED_GAME_HOURS: 24,
  // Remove any game older than 30 days regardless of state
  MAX_GAME_AGE_DAYS: 30,
  // Maximum games to process in one batch
  BATCH_SIZE: 100
};

/**
 * Delete a game and all its subcollections (players, history)
 * @param {string} gameId - The game ID to delete
 * @returns {Promise<boolean>} True if deleted, false if error
 */
export async function deleteGame(gameId) {
  try {
    await ensureAnonymousAuth();
    const gameRef = doc(db, 'games', gameId);

    // Delete all subcollections in batches
    const subcollections = ['players', 'history'];

    for (const subcollection of subcollections) {
      const colRef = collection(gameRef, subcollection);
      let deletedCount = 0;

      // Keep deleting batches until empty
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const q = query(colRef, limit(CLEANUP_CONFIG.BATCH_SIZE));
        const snapshot = await getDocs(q);

        if (snapshot.empty) break;

        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        await batch.commit();
        deletedCount += snapshot.size;
      }

      console.log(`Deleted ${deletedCount} documents from ${gameId}/${subcollection}`);
    }

    // Finally delete the game document itself
    await deleteDoc(gameRef);
    console.log(`Deleted game: ${gameId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete game ${gameId}:`, error);
    return false;
  }
}

/**
 * Find and delete expired games based on cleanup rules
 * @param {Object} options - Cleanup options
 * @param {boolean} options.dryRun - If true, only returns games that would be deleted
 * @param {number} options.maxGames - Maximum number of games to process
 * @returns {Promise<Object>} Cleanup results
 */
export async function cleanupOldGames(options = {}) {
  const { dryRun = false, maxGames = CLEANUP_CONFIG.BATCH_SIZE } = options;

  try {
    await ensureAnonymousAuth();

    const now = new Date();
    const results = {
      scanned: 0,
      deleted: 0,
      failed: 0,
      reasons: {
        expired: 0,
        completed: 0,
        abandoned: 0,
        tooOld: 0
      },
      games: []
    };

    // Calculate threshold dates
    const completedThreshold = new Date(now.getTime() - CLEANUP_CONFIG.COMPLETED_GAME_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const abandonedThreshold = new Date(now.getTime() - CLEANUP_CONFIG.ABANDONED_GAME_HOURS * 60 * 60 * 1000);
    const maxAgeThreshold = new Date(now.getTime() - CLEANUP_CONFIG.MAX_GAME_AGE_DAYS * 24 * 60 * 60 * 1000);

    // Strategy: Get all games and filter client-side to avoid composite index requirements
    // For large databases, you'd want to set up proper indexes instead

    // Get all games (limited to maxGames for safety)
    const allGamesQuery = query(
      collection(db, 'games'),
      orderBy('createdAt', 'desc'),
      limit(maxGames)
    );

    const allGamesSnapshot = await getDocs(allGamesQuery);
    results.scanned = allGamesSnapshot.size;

    // Process each game and determine if it should be cleaned up
    for (const docSnap of allGamesSnapshot.docs) {
      const game = docSnap.data();
      const createdAt = game.createdAt?.toDate?.();
      const updatedAt = game.updatedAt?.toDate?.();
      const expireAt = game.expireAt?.toDate?.();
      const state = game.state || 'unknown';

      let shouldDelete = false;
      let reason = null;

      // Rule 1: Check if expired (has expireAt and it's in the past)
      if (expireAt && expireAt < now) {
        shouldDelete = true;
        reason = 'expired';
        results.reasons.expired++;
      }
      // Rule 2: Check if completed and old
      else if (state === 'completed' && updatedAt && updatedAt < completedThreshold) {
        shouldDelete = true;
        reason = 'completed_old';
        results.reasons.completed++;
      }
      // Rule 3: Check if too old (regardless of state)
      else if (createdAt && createdAt < maxAgeThreshold) {
        shouldDelete = true;
        reason = 'too_old';
        results.reasons.tooOld++;
      }
      // Rule 4: Check if abandoned (active but no recent activity)
      else if ((state === 'active' || state === 'in_progress') && updatedAt && updatedAt < abandonedThreshold) {
        // Check if any player has recent activity
        const playersCol = collection(docSnap.ref, 'players');
        // eslint-disable-next-line no-await-in-loop
        const playersSnapshot = await getDocs(playersCol);

        let hasRecentActivity = false;
        for (const playerDoc of playersSnapshot.docs) {
          const player = playerDoc.data();
          const lastSeen = player.lastSeen?.toDate?.();
          if (lastSeen && lastSeen > abandonedThreshold) {
            hasRecentActivity = true;
            break;
          }
        }

        if (!hasRecentActivity) {
          shouldDelete = true;
          reason = 'abandoned';
          results.reasons.abandoned++;
        }
      }

      // If game should be deleted, add to results
      if (shouldDelete && reason) {
        const gameInfo = {
          id: docSnap.id,
          name: game.name || 'Unknown',
          state: state,
          reason: reason,
          createdAt: createdAt,
          updatedAt: updatedAt,
          expireAt: expireAt
        };

        results.games.push(gameInfo);

        if (!dryRun) {
          // eslint-disable-next-line no-await-in-loop
          const deleted = await deleteGame(docSnap.id);
          if (deleted) {
            results.deleted++;
          } else {
            results.failed++;
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}

/**
 * Get cleanup statistics without deleting anything
 * @returns {Promise<Object>} Statistics about cleanable games
 */
export async function getCleanupStats() {
  return cleanupOldGames({ dryRun: true, maxGames: 500 });
}


