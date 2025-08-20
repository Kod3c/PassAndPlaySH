-- Secret Hitler Database Schema
-- MySQL Version for XAMPP

-- Create games table
CREATE TABLE IF NOT EXISTS `games` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `max_players` INT NOT NULL DEFAULT 5,
    `current_players` INT NOT NULL DEFAULT 0,
    `status` ENUM('lobby', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'lobby',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `host_id` VARCHAR(36) NULL,
    `game_data` JSON NULL,
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create players table
CREATE TABLE IF NOT EXISTS `players` (
    `id` VARCHAR(36) PRIMARY KEY,
    `game_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `is_host` BOOLEAN NOT NULL DEFAULT FALSE,
    `is_claimed` BOOLEAN NOT NULL DEFAULT FALSE,
    `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `last_active` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE CASCADE,
    INDEX `idx_game_id` (`game_id`),
    INDEX `idx_name` (`name`),
    INDEX `idx_is_claimed` (`is_claimed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create game_actions table for logging
CREATE TABLE IF NOT EXISTS `game_actions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `game_id` VARCHAR(36) NOT NULL,
    `player_id` VARCHAR(36) NULL,
    `action_type` ENUM('phase', 'vote', 'policy', 'executive', 'system') NOT NULL,
    `action_data` JSON NOT NULL,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE SET NULL,
    INDEX `idx_game_id` (`game_id`),
    INDEX `idx_timestamp` (`timestamp`),
    INDEX `idx_action_type` (`action_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create game_policies table for tracking enacted policies
CREATE TABLE IF NOT EXISTS `game_policies` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `game_id` VARCHAR(36) NOT NULL,
    `policy_type` ENUM('liberal', 'fascist') NOT NULL,
    `enacted_by` VARCHAR(36) NULL,
    `enacted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`enacted_by`) REFERENCES `players`(`id`) ON DELETE SET NULL,
    INDEX `idx_game_id` (`game_id`),
    INDEX `idx_policy_type` (`policy_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create game_votes table for tracking election votes
CREATE TABLE IF NOT EXISTS `game_votes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `game_id` VARCHAR(36) NOT NULL,
    `player_id` VARCHAR(36) NOT NULL,
    `vote` ENUM('ja', 'nein') NOT NULL,
    `voted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_player_vote` (`game_id`, `player_id`),
    INDEX `idx_game_id` (`game_id`),
    INDEX `idx_vote` (`vote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data for testing
INSERT IGNORE INTO `games` (`id`, `name`, `max_players`, `status`) VALUES
('demo-game-001', 'Demo Game', 5, 'lobby');

-- Insert sample players for demo game
INSERT IGNORE INTO `players` (`id`, `game_id`, `name`, `is_host`) VALUES
('demo-player-001', 'demo-game-001', 'Alice', TRUE),
('demo-player-002', 'demo-game-001', 'Bob', FALSE),
('demo-player-003', 'demo-game-001', 'Charlie', FALSE),
('demo-player-004', 'demo-game-001', 'Diana', FALSE),
('demo-player-005', 'demo-game-001', 'Eve', FALSE);
