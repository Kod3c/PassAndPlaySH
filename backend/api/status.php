<?php
/**
 * Status API Endpoint
 * Checks database connectivity and system health
 * Auto-initializes database if needed
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

require_once __DIR__ . '/../config/database.php';

try {
    // Try to get status
    $status = DatabaseConfig::getStatus();
    
    // If database doesn't exist or has no tables, initialize it
    if (!$status['connected'] || empty($status['tables'])) {
        try {
            DatabaseConfig::initializeDatabase();
            $status = DatabaseConfig::getStatus();
            $status['initialized'] = true;
        } catch (Exception $e) {
            $status['initialization_error'] = $e->getMessage();
        }
    }
    
    // Add system information
    $status['system'] = [
        'php_version' => PHP_VERSION,
        'server_time' => date('Y-m-d H:i:s'),
        'timezone' => date_default_timezone_get(),
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time')
    ];
    
    // Add database configuration info
    $status['database_config'] = [
        'type' => 'SQLite',
        'file' => DatabaseConfig::DB_FILE,
        'path' => realpath(__DIR__ . '/../' . DatabaseConfig::DB_FILE)
    ];
    
    echo json_encode($status);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'connected' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
