<?php
/**
 * Database Configuration
 * Secret Hitler Multi-Device Game
 * Using MySQL for XAMPP (Local Development)
 */

class DatabaseConfig {
    // MySQL connection settings for Plesk (Local)
    const DB_HOST = 'localhost';
    const DB_NAME = 'shpassandplay';
    const DB_USER = 'secrethitler';
    const DB_PASS = 'Roobear0515!';
    const DB_PORT = 3306;
    
    // Connection options
    const DB_OPTIONS = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ];
    
    /**
     * Get database connection
     * @return PDO
     * @throws Exception
     */
    public static function getConnection() {
        try {
            $dsn = "mysql:host=" . self::DB_HOST . ";port=" . self::DB_PORT . ";dbname=" . self::DB_NAME . ";charset=utf8mb4";
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
                'database' => self::DB_NAME,
                'host' => self::DB_HOST,
                'tables' => $tables,
                'game_count' => $gameCount,
                'player_count' => $playerCount,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            return [
                'connected' => false,
                'error' => $e->getMessage(),
                'database' => self::DB_NAME,
                'host' => self::DB_HOST,
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
            $schemaPath = __DIR__ . '/../../database/schema.sql';
            if (file_exists($schemaPath)) {
                $schema = file_get_contents($schemaPath);
                
                // Split schema into individual statements
                $statements = array_filter(array_map('trim', explode(';', $schema)));
                
                foreach ($statements as $statement) {
                    if (!empty($statement)) {
                        $pdo->exec($statement);
                    }
                }
                
                return true;
            } else {
                throw new Exception("Schema file not found: $schemaPath");
            }
        } catch (Exception $e) {
            throw new Exception("Database initialization failed: " . $e->getMessage());
        }
    }
}
