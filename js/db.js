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
  // Format: SH + hour(12h) + minute + '-' + 4-char random (no 0/O/1/I)
  const now = new Date();
  let hour = now.getHours() % 12;
  if (hour === 0) hour = 12; // 12-hour clock
  const minute = now.getMinutes();
  const timePart = `SH${hour}${minute.toString().padStart(2, '0')}`;

  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${timePart}-${rand}`;
}

export async function createGame(gameName, playerNames, hostPasswordHash = null) {
  await ensureAnonymousAuth();

  const gameId = generateGameId();
  const gameRef = doc(db, 'games', gameId);
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

  await setDoc(gameRef, {
    id: gameId,
    name: sanitizeGameName(gameName),
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


