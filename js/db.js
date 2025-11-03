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
  orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const db = getFirestore(app);

function sanitizeGameName(raw) {
  const trimmed = String(raw || '').trim();
  const collapsed = trimmed.replace(/\s+/g, ' ');
  const cleaned = collapsed.replace(/[^A-Za-z0-9 _\-'.!?:()/]/g, '');
  return cleaned.slice(0, 48) || 'Secret Hitler';
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
  // 4-character unambiguous code (exclude 0/O and 1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export async function createGame(gameName, playerNames, hostPasswordHash = null) {
  await ensureAnonymousAuth();
  // Generate a unique 4-char ID (retry a few times just in case of collision)
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
    expireAt: new Date(Date.now() + 15 * 60 * 1000)
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
  console.log('Setting up history subscription for game:', gameId);
  const col = collection(doc(db, 'games', gameId), 'history');
  // Order by clientOrder only to avoid requiring a composite Firestore index
  const q = query(col, orderBy('clientOrder', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      console.log('History snapshot received, doc count:', snap.docs.length);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log('Mapped history items:', items);
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


