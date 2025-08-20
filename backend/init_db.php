<?php
/**
 * Database Initialization Script
 * Secret Hitler Multi-Device Game
 * MySQL Version for Plesk Hosting
 */

require_once __DIR__ . '/config/database.php';

echo "Secret Hitler Database Initialization\n";
echo "=====================================\n\n";

try {
    echo "1. Testing database connection...\n";
    if (DatabaseConfig::testConnection()) {
        echo "   ✓ Database connection successful\n\n";
    } else {
        throw new Exception("Database connection failed");
    }
    
    echo "2. Initializing database schema...\n";
    if (DatabaseConfig::initializeDatabase()) {
        echo "   ✓ Database schema initialized successfully\n\n";
    } else {
        throw new Exception("Schema initialization failed");
    }
    
    echo "3. Verifying database status...\n";
    $status = DatabaseConfig::getStatus();
    if ($status['connected']) {
        echo "   ✓ Database is ready\n";
        echo "   - Host: " . $status['host'] . "\n";
        echo "   - Database: " . $status['database'] . "\n";
        echo "   - Tables: " . implode(', ', $status['tables']) . "\n";
        echo "   - Games: " . $status['game_count'] . "\n";
        echo "   - Players: " . $status['player_count'] . "\n";
        echo "   - Timestamp: " . $status['timestamp'] . "\n\n";
    } else {
        throw new Exception("Database verification failed: " . $status['error']);
    }
    
    echo "🎉 Database initialization completed successfully!\n";
    echo "You can now run the Secret Hitler game with full backend support.\n\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
    echo "Troubleshooting:\n";
    echo "1. Verify the database 'shpassandplay' exists in Plesk\n";
    echo "2. Check that user 'secrethitler' has proper permissions\n";
    echo "3. Ensure MySQL service is running on 66.179.253.5:3306\n";
    echo "4. Verify firewall allows connections to port 3306\n\n";
    
    exit(1);
}



