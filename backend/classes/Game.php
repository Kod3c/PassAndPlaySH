<?php
/**
 * Game Class
 * Handles game creation, management, and state for Secret Hitler
 */

require_once __DIR__ . '/Database.php';

class Game {
    private $db;
    private $gameId;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    /**
     * Create a new game
     * @param string $name
     * @param int $maxPlayers
     * @param string $hostName
     * @return array
     */
    public function createGame($name, $maxPlayers, $hostName) {
        try {
            $this->db->beginTransaction();
            
            // Validate inputs
            if (!$this->validateGameName($name)) {
                throw new Exception("Invalid game name");
            }
            
            if (!$this->validatePlayerCount($maxPlayers)) {
                throw new Exception("Invalid player count");
            }
            
            if (!$this->validatePlayerName($hostName)) {
                throw new Exception("Invalid host name");
            }
            
            // Generate game ID
            $gameId = $this->db->generateUUID();
            
            // Create game record
            $sql = "INSERT INTO games (id, name, max_players, current_players) VALUES (?, ?, ?, 1)";
            $this->db->execute($sql, [$gameId, $name, $maxPlayers]);
            
            // Add host player
            $hostId = $this->db->generateUUID();
            $sql = "INSERT INTO players (id, game_id, name, is_host) VALUES (?, ?, ?, TRUE)";
            $this->db->execute($sql, [$hostId, $gameId, $hostName]);
            
            // Initialize game state
            $sql = "INSERT INTO game_state (game_id, policy_deck) VALUES (?, ?)";
            $policyDeck = $this->createInitialPolicyDeck();
            $this->db->execute($sql, [$gameId, json_encode($policyDeck)]);
            
            // Initialize policy board
            $sql = "INSERT INTO policy_board (game_id) VALUES (?)";
            $this->db->execute($sql, [$gameId]);
            
            // Initialize game phases
            $sql = "INSERT INTO game_phases (game_id) VALUES (?)";
            $this->db->execute($sql, [$gameId]);
            
            // Log game creation
            $this->logAction($gameId, $hostId, 'game_start', [
                'game_name' => $name,
                'max_players' => $maxPlayers,
                'host_name' => $hostName
            ]);
            
            $this->db->commit();
            
            return [
                'success' => true,
                'game_id' => $gameId,
                'host_id' => $hostId,
                'message' => 'Game created successfully'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Join an existing game
     * @param string $gameId
     * @param string $playerName
     * @return array
     */
    public function joinGame($gameId, $playerName) {
        try {
            $this->db->beginTransaction();
            
            // Check if game exists and is in lobby
            $game = $this->db->query(
                "SELECT * FROM games WHERE id = ? AND status = 'lobby'",
                [$gameId]
            );
            
            if (!$game) {
                throw new Exception("Game not found or already started");
            }
            
            // Check if player name is already taken in this game
            $existingPlayer = $this->db->query(
                "SELECT id FROM players WHERE game_id = ? AND name = ?",
                [$gameId, $playerName]
            );
            
            if ($existingPlayer) {
                throw new Exception("Player name already taken in this game");
            }
            
            // Check if game is full
            if ($game['current_players'] >= $game['max_players']) {
                throw new Exception("Game is full");
            }
            
            // Add player
            $playerId = $this->db->generateUUID();
            $sql = "INSERT INTO players (id, game_id, name) VALUES (?, ?, ?)";
            $this->db->execute($sql, [$playerId, $gameId, $playerName]);
            
            // Update player count
            $sql = "UPDATE games SET current_players = current_players + 1 WHERE id = ?";
            $this->db->execute($sql, [$gameId]);
            
            // Log player join
            $this->logAction($gameId, $playerId, 'player_join', [
                'player_name' => $playerName,
                'new_player_count' => $game['current_players'] + 1
            ]);
            
            $this->db->commit();
            
            return [
                'success' => true,
                'player_id' => $playerId,
                'message' => 'Joined game successfully'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Start a game
     * @param string $gameId
     * @param string $hostId
     * @return array
     */
    public function startGame($gameId, $hostId) {
        try {
            $this->db->beginTransaction();
            
            // Verify host permissions
            $host = $this->db->query(
                "SELECT * FROM players WHERE id = ? AND game_id = ? AND is_host = TRUE",
                [$hostId, $gameId]
            );
            
            if (!$host) {
                throw new Exception("Only the host can start the game");
            }
            
            // Check if game is ready to start
            $game = $this->db->query(
                "SELECT * FROM games WHERE id = ? AND status = 'lobby'",
                [$gameId]
            );
            
            if (!$game) {
                throw new Exception("Game cannot be started");
            }
            
            if ($game['current_players'] < 5) {
                throw new Exception("Need at least 5 players to start");
            }
            
            // Assign roles
            $this->assignRoles($gameId);
            
            // Update game status
            $sql = "UPDATE games SET status = 'active' WHERE id = ?";
            $this->db->execute($sql, [$gameId]);
            
            // Log game start
            $this->logAction($gameId, null, 'game_start', [
                'player_count' => $game['current_players'],
                'started_by' => $hostId
            ]);
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => 'Game started successfully'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get game information
     * @param string $gameId
     * @return array
     */
    public function getGameInfo($gameId) {
        try {
            // Get basic game info
            $game = $this->db->query(
                "SELECT * FROM games WHERE id = ?",
                [$gameId]
            );
            
            if (!$game) {
                return ['success' => false, 'error' => 'Game not found'];
            }
            
            // Get players
            $players = $this->db->queryAll(
                "SELECT id, name, role, is_host, is_connected FROM players WHERE game_id = ? ORDER BY created_at",
                [$gameId]
            );
            
            // Get game state
            $gameState = $this->db->query(
                "SELECT * FROM game_state WHERE game_id = ?",
                [$gameId]
            );
            
            // Get policy board
            $policyBoard = $this->db->query(
                "SELECT * FROM policy_board WHERE game_id = ?",
                [$gameId]
            );
            
            // Get current votes if game is active
            $currentVotes = [];
            if ($game['status'] === 'active') {
                $currentVotes = $this->db->queryAll(
                    "SELECT p.name, cv.vote FROM current_votes cv 
                     JOIN players p ON cv.player_id = p.id 
                     WHERE cv.game_id = ?",
                    [$gameId]
                );
            }
            
            return [
                'success' => true,
                'game' => $game,
                'players' => $players,
                'game_state' => $gameState,
                'policy_board' => $policyBoard,
                'current_votes' => $currentVotes
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get all available games
     * @return array
     */
    public function getAvailableGames() {
        try {
            $games = $this->db->queryAll(
                "SELECT g.*, COUNT(p.id) as player_count 
                 FROM games g 
                 LEFT JOIN players p ON g.id = p.game_id 
                 WHERE g.status = 'lobby' 
                 GROUP BY g.id 
                 ORDER BY g.created_at DESC"
            );
            
            return [
                'success' => true,
                'games' => $games
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Assign roles to players
     * @param string $gameId
     */
    private function assignRoles($gameId) {
        $players = $this->db->queryAll(
            "SELECT id FROM players WHERE game_id = ? ORDER BY RAND()",
            [$gameId]
        );
        
        $playerCount = count($players);
        $roleDistribution = $this->getRoleDistribution($playerCount);
        
        // Assign roles
        foreach ($players as $index => $player) {
            $role = $roleDistribution[$index];
            $sql = "UPDATE players SET role = ? WHERE id = ?";
            $this->db->execute($sql, [$role, $player['id']]);
        }
        
        // Log role assignments
        $this->logAction($gameId, null, 'role_assignment', [
            'player_count' => $playerCount,
            'role_distribution' => $roleDistribution
        ]);
    }
    
    /**
     * Get role distribution based on player count
     * @param int $playerCount
     * @return array
     */
    private function getRoleDistribution($playerCount) {
        switch ($playerCount) {
            case 5: return ['liberal', 'liberal', 'liberal', 'fascist', 'hitler'];
            case 6: return ['liberal', 'liberal', 'liberal', 'liberal', 'fascist', 'hitler'];
            case 7: return ['liberal', 'liberal', 'liberal', 'liberal', 'fascist', 'fascist', 'hitler'];
            case 8: return ['liberal', 'liberal', 'liberal', 'liberal', 'liberal', 'fascist', 'fascist', 'hitler'];
            case 9: return ['liberal', 'liberal', 'liberal', 'liberal', 'liberal', 'fascist', 'fascist', 'fascist', 'hitler'];
            case 10: return ['liberal', 'liberal', 'liberal', 'liberal', 'liberal', 'liberal', 'fascist', 'fascist', 'fascist', 'hitler'];
            default: throw new Exception("Invalid player count: $playerCount");
        }
    }
    
    /**
     * Create initial policy deck
     * @return array
     */
    private function createInitialPolicyDeck() {
        $deck = [];
        
        // Add 6 liberal policies
        for ($i = 0; $i < 6; $i++) {
            $deck[] = 'liberal';
        }
        
        // Add 11 fascist policies
        for ($i = 0; $i < 11; $i++) {
            $deck[] = 'fascist';
        }
        
        // Shuffle the deck
        shuffle($deck);
        
        return $deck;
    }
    
    /**
     * Log a game action
     * @param string $gameId
     * @param string|null $playerId
     * @param string $actionType
     * @param array $actionData
     */
    private function logAction($gameId, $playerId, $actionType, $actionData) {
        $actionId = $this->db->generateUUID();
        $sql = "INSERT INTO game_actions (id, game_id, player_id, action_type, action_data) VALUES (?, ?, ?, ?, ?)";
        $this->db->execute($sql, [$actionId, $gameId, $playerId, $actionType, json_encode($actionData)]);
    }
    
    /**
     * Validate game name
     * @param string $name
     * @return bool
     */
    private function validateGameName($name) {
        return preg_match('/^[a-zA-Z0-9\s\-_]{3,50}$/', $name);
    }
    
    /**
     * Validate player count
     * @param int $count
     * @return bool
     */
    private function validatePlayerCount($count) {
        return $count >= 5 && $count <= 10;
    }
    
    /**
     * Validate player name
     * @param string $name
     * @return bool
     */
    private function validatePlayerName($name) {
        return preg_match('/^[a-zA-Z0-9\s\-_]{2,25}$/', $name);
    }
}
