<?php
/**
 * Database Initialization Script
 * Creates SQLite database and imports schema
 */

require_once __DIR__ . '/config/database.php';

echo "Initializing Secret Hitler database...\n";

try {
    // Initialize database
    DatabaseConfig::initializeDatabase();
    echo "✅ Database initialized successfully!\n";
    
    // Test connection
    if (DatabaseConfig::testConnection()) {
        echo "✅ Database connection test passed!\n";
        
        // Get status
        $status = DatabaseConfig::getStatus();
        echo "📊 Database Status:\n";
        echo "   - Tables: " . count($status['tables']) . "\n";
        echo "   - Games: " . $status['game_count'] . "\n";
        echo "   - Players: " . $status['player_count'] . "\n";
        
        echo "\n🎉 Database is ready to use!\n";
        echo "You can now start the PHP server and test the game.\n";
        
    } else {
        echo "❌ Database connection test failed!\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}



