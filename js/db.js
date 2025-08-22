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

export async function createGame(gameName, playerNames) {
  await ensureAnonymousAuth();

  const gameId = generateGameId();
  const gameRef = doc(db, 'games', gameId);
  const createdAt = serverTimestamp();

  await setDoc(gameRef, {
    id: gameId,
    name: gameName || 'Secret Hitler Game',
    state: 'lobby',
    playerCount: Array.isArray(playerNames) ? playerNames.length : 0,
    createdAt,
    updatedAt: createdAt,
    // Set initial expiry to 15 minutes from now; TTL will remove stale lobbies
    expireAt: new Date(Date.now() + 15 * 60 * 1000)
  }, { merge: true });

  const playersCol = collection(gameRef, 'players');
  for (let i = 0; i < playerNames.length; i++) {
    const name = String(playerNames[i] || '').trim();
    if (!name) continue;
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


