-- Secret Hitler Multi-Device Database Schema
-- Based on conversion plan with simplified, optimized structure

-- Core games table
CREATE TABLE games (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status ENUM('lobby', 'active', 'completed') DEFAULT 'lobby',
    max_players INT NOT NULL,
    current_players INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE players (
    id VARCHAR(36) PRIMARY KEY,
    game_id VARCHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL,
    role ENUM('liberal', 'fascist', 'hitler') NULL,
    is_host BOOLEAN DEFAULT FALSE,
    is_connected BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Game state table
CREATE TABLE game_state (
    game_id VARCHAR(36) PRIMARY KEY,
    current_turn INT DEFAULT 0,
    current_president INT DEFAULT 0,
    current_chancellor VARCHAR(36) NULL,
    liberal_policies INT DEFAULT 0,
    fascist_policies INT DEFAULT 0,
    election_tracker INT DEFAULT 0,
    policy_deck JSON NOT NULL,
    discard_pile JSON DEFAULT '[]',
    last_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Policy board tracking for visual representation
CREATE TABLE policy_board (
    game_id VARCHAR(36) PRIMARY KEY,
    liberal_track JSON NOT NULL DEFAULT '[]',
    fascist_track JSON NOT NULL DEFAULT '[]',
    election_tracker_position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);

-- Vote tracking table for current election
CREATE TABLE current_votes (
    id VARCHAR(36) PRIMARY KEY,
    game_id VARCHAR(36) NOT NULL,
    player_id VARCHAR(36) NOT NULL,
    vote ENUM('ja', 'nein') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    UNIQUE KEY unique_player_vote (game_id, player_id)
);

-- Game actions log for history and recovery
CREATE TABLE game_actions (
    id VARCHAR(36) PRIMARY KEY,
    game_id VARCHAR(36) NOT NULL,
    player_id VARCHAR(36) NULL,
    action_type ENUM('game_start', 'role_assignment', 'election_start', 'nomination', 'vote_submitted', 'election_result', 'policy_enacted', 'power_used', 'turn_advance', 'game_end') NOT NULL,
    action_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE SET NULL
);

-- Executive powers tracking
CREATE TABLE executive_powers (
    id VARCHAR(36) PRIMARY KEY,
    game_id VARCHAR(36) NOT NULL,
    power_type ENUM('investigate', 'special_election', 'policy_peek', 'execution') NOT NULL,
    target_player_id VARCHAR(36) NULL,
    used_by_player_id VARCHAR(36) NOT NULL,
    power_result JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
    FOREIGN KEY (target_player_id) REFERENCES players(player_id) ON DELETE SET NULL,
    FOREIGN KEY (used_by_player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

-- Game phase and turn management
CREATE TABLE game_phases (
    game_id VARCHAR(36) PRIMARY KEY,
    current_phase ENUM('election', 'legislation', 'executive') DEFAULT 'election',
    phase_step ENUM('nomination', 'voting', 'president_choice', 'chancellor_choice', 'power_usage') DEFAULT 'nomination',
    last_chancellor_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
    FOREIGN KEY (last_chancellor_id) REFERENCES players(player_id) ON DELETE SET NULL
);

-- Game statistics for completed games
CREATE TABLE game_statistics (
    id VARCHAR(36) PRIMARY KEY,
    game_id VARCHAR(36) NOT NULL,
    winner ENUM('liberal', 'fascist') NOT NULL,
    reason VARCHAR(100) NOT NULL,
    final_state JSON NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_game_state_updated ON game_state(updated_at);
CREATE INDEX idx_current_votes_game ON current_votes(game_id);
CREATE INDEX idx_game_actions_game ON game_actions(game_id);
CREATE INDEX idx_game_actions_created ON game_actions(created_at);
CREATE INDEX idx_executive_powers_game ON executive_powers(game_id);
CREATE INDEX idx_game_phases_game ON game_phases(game_id);
CREATE INDEX idx_game_statistics_game ON game_statistics(game_id);

-- Sample data for testing
INSERT INTO games (id, name, max_players, current_players) VALUES 
('test-game-1', 'Test Game 1', 6, 0),
('test-game-2', 'Test Game 2', 8, 0);

-- Helper function to generate UUIDs (MySQL 8.0+)
DELIMITER //
CREATE FUNCTION generate_uuid() RETURNS VARCHAR(36)
READS SQL DATA
DETERMINISTIC
BEGIN
    RETURN UUID();
END //
DELIMITER ;
