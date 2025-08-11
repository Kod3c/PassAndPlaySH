<?php
/**
 * Games API Endpoint
 * Handles game creation, joining, and management
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../classes/Game.php';

try {
    $game = new Game();
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            if (isset($_GET['id'])) {
                // Get specific game info
                $gameInfo = $game->getGameInfo($_GET['id']);
                echo json_encode($gameInfo);
            } else {
                // Get all available games
                $games = $game->getAvailableGames();
                echo json_encode($games);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                throw new Exception('Invalid JSON input');
            }
            
            $action = $input['action'] ?? '';
            
            switch ($action) {
                case 'create':
                    if (!isset($input['name']) || !isset($input['maxPlayers']) || !isset($input['hostName'])) {
                        throw new Exception('Missing required fields: name, maxPlayers, hostName');
                    }
                    
                    $result = $game->createGame(
                        $input['name'],
                        (int)$input['maxPlayers'],
                        $input['hostName']
                    );
                    echo json_encode($result);
                    break;
                    
                case 'join':
                    if (!isset($input['gameId']) || !isset($input['playerName'])) {
                        throw new Exception('Missing required fields: gameId, playerName');
                    }
                    
                    $result = $game->joinGame(
                        $input['gameId'],
                        $input['playerName']
                    );
                    echo json_encode($result);
                    break;
                    
                case 'start':
                    if (!isset($input['gameId']) || !isset($input['hostId'])) {
                        throw new Exception('Missing required fields: gameId, hostId');
                    }
                    
                    $result = $game->startGame(
                        $input['gameId'],
                        $input['hostId']
                    );
                    echo json_encode($result);
                    break;
                    
                default:
                    throw new Exception('Invalid action: ' . $action);
            }
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
