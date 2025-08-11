<?php
/**
 * Database Configuration
 * Secret Hitler Multi-Device Game
 */

class DatabaseConfig {
    // Database connection settings
    const DB_HOST = 'localhost';
    const DB_NAME = 'secret_hitler';
    const DB_USER = 'root';
    const DB_PASS = '';
    const DB_CHARSET = 'utf8mb4';
    
    // Connection options
    const DB_OPTIONS = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ];
    
    /**
     * Get database connection
     * @return PDO
     * @throws Exception
     */
    public static function getConnection() {
        try {
            $dsn = "mysql:host=" . self::DB_HOST . ";dbname=" . self::DB_NAME . ";charset=" . self::DB_CHARSET;
            $pdo = new PDO($dsn, self::DB_USER, self::DB_PASS, self::DB_OPTIONS);
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
            $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
            
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
}
