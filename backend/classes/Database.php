<?php
/**
 * Database Class
 * Handles all database operations for the Secret Hitler game
 */

require_once __DIR__ . '/../config/database.php';

class Database {
    private $pdo;
    private $config;
    
    public function __construct() {
        $this->config = new DatabaseConfig();
        $this->pdo = $this->config->getConnection();
    }
    
    /**
     * Execute a query with parameters
     * @param string $sql
     * @param array $params
     * @return PDOStatement
     */
    public function execute($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new Exception("Database execution failed: " . $e->getMessage());
        }
    }
    
    /**
     * Execute a query and return a single row
     * @param string $sql
     * @param array $params
     * @return array|false
     */
    public function query($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetch();
    }
    
    /**
     * Execute a query and return all rows
     * @param string $sql
     * @param array $params
     * @return array
     */
    public function queryAll($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Execute a query and return a single value
     * @param string $sql
     * @param array $params
     * @return mixed
     */
    public function queryValue($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetchColumn();
    }
    
    /**
     * Begin a transaction
     */
    public function beginTransaction() {
        $this->pdo->beginTransaction();
    }
    
    /**
     * Commit a transaction
     */
    public function commit() {
        $this->pdo->commit();
    }
    
    /**
     * Rollback a transaction
     */
    public function rollback() {
        $this->pdo->rollback();
    }
    
    /**
     * Get the last inserted ID
     * @return string
     */
    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Generate a UUID
     * @return string
     */
    public function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
    
    /**
     * Check if a table exists
     * @param string $tableName
     * @return bool
     */
    public function tableExists($tableName) {
        $sql = "SHOW TABLES LIKE ?";
        $result = $this->query($sql, [$tableName]);
        return $result !== false;
    }
    
    /**
     * Get table structure
     * @param string $tableName
     * @return array
     */
    public function getTableStructure($tableName) {
        $sql = "DESCRIBE " . $tableName;
        return $this->queryAll($sql);
    }
    
    /**
     * Get database statistics
     * @return array
     */
    public function getStats() {
        $stats = [];
        
        // Count games by status
        $sql = "SELECT status, COUNT(*) as count FROM games GROUP BY status";
        $statusCounts = $this->queryAll($sql);
        $stats['games_by_status'] = $statusCounts;
        
        // Count total players
        $stats['total_players'] = $this->queryValue("SELECT COUNT(*) FROM players");
        
        // Count active games
        $stats['active_games'] = $this->queryValue("SELECT COUNT(*) FROM games WHERE status = 'active'");
        
        // Count completed games
        $stats['completed_games'] = $this->queryValue("SELECT COUNT(*) FROM games WHERE status = 'completed'");
        
        return $stats;
    }
    
    /**
     * Clean up old data
     * @param int $daysOld
     * @return int
     */
    public function cleanupOldData($daysOld = 30) {
        $deleted = 0;
        
        try {
            $this->beginTransaction();
            
            // Delete old completed games
            $sql = "DELETE FROM games WHERE status = 'completed' AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)";
            $stmt = $this->execute($sql, [$daysOld]);
            $deleted += $stmt->rowCount();
            
            // Delete old game actions
            $sql = "DELETE ga FROM game_actions ga 
                    LEFT JOIN games g ON ga.game_id = g.id 
                    WHERE g.id IS NULL OR (g.status = 'completed' AND g.updated_at < DATE_SUB(NOW(), INTERVAL ? DAY))";
            $stmt = $this->execute($sql, [$daysOld]);
            $deleted += $stmt->rowCount();
            
            $this->commit();
            return $deleted;
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
}
