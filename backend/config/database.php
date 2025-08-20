<?php
/**
 * Database Configuration
 * Secret Hitler Multi-Device Game
 * Using SQLite for simplicity
 */

class DatabaseConfig {
    // Database file path (relative to backend directory)
    const DB_FILE = 'secret_hitler.db';
    
    // Connection options
    const DB_OPTIONS = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ];
    
    /**
     * Get database connection
     * @return PDO
     * @throws Exception
     */
    public static function getConnection() {
        try {
            $dbPath = __DIR__ . '/../' . self::DB_FILE;
            $pdo = new PDO("sqlite:$dbPath", null, null, self::DB_OPTIONS);
            
            // Enable foreign keys
            $pdo->exec('PRAGMA foreign_keys = ON');
            
            return $pdo;
        } catch (PDOException $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    /**
     * Test database connection
     * @return bool
     */
    public static function testConnection() {
        try {
            $pdo = self::getConnection();
            $pdo->query("SELECT 1");
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Get database status
     * @return array
     */
    public static function getStatus() {
        try {
            $pdo = self::getConnection();
            
            // Check if tables exist
            $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
            
            // Get game count
            $gameCount = $pdo->query("SELECT COUNT(*) FROM games")->fetchColumn();
            
            // Get player count
            $playerCount = $pdo->query("SELECT COUNT(*) FROM players")->fetchColumn();
            
            return [
                'connected' => true,
                'tables' => $tables,
                'game_count' => $gameCount,
                'player_count' => $playerCount,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            return [
                'connected' => false,
                'error' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    /**
     * Initialize database with schema
     * @return bool
     */
    public static function initializeDatabase() {
        try {
            $pdo = self::getConnection();
            
            // Read and execute schema
            $schemaPath = __DIR__ . '/../../database/schema.sqlite.sql';
            if (file_exists($schemaPath)) {
                $schema = file_get_contents($schemaPath);
                $pdo->exec($schema);
                return true;
            } else {
                throw new Exception("Schema file not found: $schemaPath");
            }
        } catch (Exception $e) {
            throw new Exception("Database initialization failed: " . $e->getMessage());
        }
    }
}
