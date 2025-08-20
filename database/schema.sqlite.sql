-- Secret Hitler Multi-Device Database Schema
-- SQLite version for easy setup

-- Core games table
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'completed')),
    max_players INTEGER NOT NULL,
    current_players INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('liberal', 'fascist', 'hitler')),
    is_host BOOLEAN DEFAULT 0,
    is_connected BOOLEAN DEFAULT 1,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Game state table
CREATE TABLE IF NOT EXISTS game_state (
    game_id TEXT PRIMARY KEY,
    current_turn INTEGER DEFAULT 0,
    current_president INTEGER DEFAULT 0,
    current_chancellor TEXT,
    liberal_policies INTEGER DEFAULT 0,
    fascist_policies INTEGER DEFAULT 0,
    election_tracker INTEGER DEFAULT 0,
    policy_deck TEXT NOT NULL, -- JSON stored as TEXT
    discard_pile TEXT DEFAULT '[]', -- JSON stored as TEXT
    last_action DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Policy board tracking for visual representation
CREATE TABLE IF NOT EXISTS policy_board (
    game_id TEXT PRIMARY KEY,
    liberal_track TEXT NOT NULL DEFAULT '[]', -- JSON stored as TEXT
    fascist_track TEXT NOT NULL DEFAULT '[]', -- JSON stored as TEXT
    election_tracker_position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Vote tracking table for current election
CREATE TABLE IF NOT EXISTS current_votes (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    vote TEXT NOT NULL CHECK (vote IN ('ja', 'nein')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (game_id, player_id)
);

-- Game actions log for history and recovery
CREATE TABLE IF NOT EXISTS game_actions (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    player_id TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('game_start', 'role_assignment', 'election_start', 'nomination', 'vote_submitted', 'election_result', 'policy_enacted', 'power_used', 'turn_advance', 'game_end')),
    action_data TEXT NOT NULL, -- JSON stored as TEXT
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
);

-- Executive powers tracking
CREATE TABLE IF NOT EXISTS executive_powers (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    power_type TEXT NOT NULL CHECK (power_type IN ('investigate', 'special_election', 'policy_peek', 'execution')),
    target_player_id TEXT,
    used_by_player_id TEXT NOT NULL,
    power_result TEXT, -- JSON stored as TEXT
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (target_player_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (used_by_player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Game phase and turn management
CREATE TABLE IF NOT EXISTS game_phases (
    game_id TEXT PRIMARY KEY,
    current_phase TEXT DEFAULT 'election' CHECK (current_phase IN ('election', 'legislation', 'executive')),
    phase_step TEXT DEFAULT 'nomination' CHECK (phase_step IN ('nomination', 'voting', 'president_choice', 'chancellor_choice', 'power_usage')),
    last_chancellor_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (last_chancellor_id) REFERENCES players(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_votes_game_id ON current_votes(game_id);
CREATE INDEX IF NOT EXISTS idx_actions_game_id ON game_actions(game_id);
CREATE INDEX IF NOT EXISTS idx_powers_game_id ON executive_powers(game_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_games_timestamp 
    AFTER UPDATE ON games
    FOR EACH ROW
    BEGIN
        UPDATE games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_policy_board_timestamp 
    AFTER UPDATE ON policy_board
    FOR EACH ROW
    BEGIN
        UPDATE policy_board SET updated_at = CURRENT_TIMESTAMP WHERE game_id = NEW.game_id;
    END;

CREATE TRIGGER IF NOT EXISTS update_game_phases_timestamp 
    AFTER UPDATE ON game_phases
    FOR EACH ROW
    BEGIN
        UPDATE game_phases SET updated_at = CURRENT_TIMESTAMP WHERE game_id = NEW.game_id;
    END;



