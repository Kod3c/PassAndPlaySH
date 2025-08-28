// Game constants and configuration for Secret Hitler
// These values can be safely extracted without breaking functionality

export const HEARTBEAT_INTERVAL_MS = 25 * 1000; // 25s

export const RULE_KEYS = ['ov','setup','roles','flow','powers','legislative','win','ref'];

// Game configuration constants
export const GAME_CONFIG = {
    MAX_LIBERAL_POLICIES: 5,
    MAX_FASCIST_POLICIES: 6,
    ELECTION_TRACKER_MAX: 3
};
