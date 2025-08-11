<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secret Hitler Backend Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .info { background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        input { padding: 8px; margin: 5px; width: 200px; }
        .result { background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin: 10px 0; border-radius: 5px; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <h1>Secret Hitler Backend Test</h1>
    
    <div id="status" class="status info">Checking backend status...</div>
    
    <h2>Database Status</h2>
    <button onclick="checkStatus()">Check Status</button>
    <div id="statusResult" class="result"></div>
    
    <h2>Game Management</h2>
    
    <h3>Create Game</h3>
    <input type="text" id="gameName" placeholder="Game Name" value="Test Game">
    <input type="number" id="maxPlayers" placeholder="Max Players" value="6" min="5" max="10">
    <input type="text" id="hostName" placeholder="Host Name" value="Test Host">
    <button onclick="createGame()">Create Game</button>
    <div id="createResult" class="result"></div>
    
    <h3>Join Game</h3>
    <input type="text" id="gameId" placeholder="Game ID">
    <input type="text" id="playerName" placeholder="Player Name" value="Test Player">
    <button onclick="joinGame()">Join Game</button>
    <div id="joinResult" class="result"></div>
    
    <h3>Get Game Info</h3>
    <input type="text" id="getGameId" placeholder="Game ID">
    <button onclick="getGameInfo()">Get Game Info</button>
    <div id="gameInfoResult" class="result"></div>
    
    <h3>Available Games</h3>
    <button onclick="getAvailableGames()">Get Available Games</button>
    <div id="availableGamesResult" class="result"></div>
    
    <script>
        // Check status on page load
        window.onload = function() {
            checkStatus();
        };
        
        async function checkStatus() {
            try {
                const response = await fetch('api/status.php');
                const data = await response.json();
                
                const statusDiv = document.getElementById('status');
                const resultDiv = document.getElementById('statusResult');
                
                if (data.connected) {
                    statusDiv.className = 'status success';
                    statusDiv.textContent = 'Backend connected successfully!';
                } else {
                    statusDiv.className = 'status error';
                    statusDiv.textContent = 'Backend connection failed!';
                }
                
                resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                
            } catch (error) {
                document.getElementById('status').className = 'status error';
                document.getElementById('status').textContent = 'Error checking status: ' + error.message;
            }
        }
        
        async function createGame() {
            const gameName = document.getElementById('gameName').value;
            const maxPlayers = document.getElementById('maxPlayers').value;
            const hostName = document.getElementById('hostName').value;
            
            try {
                const response = await fetch('api/games.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'create',
                        name: gameName,
                        maxPlayers: parseInt(maxPlayers),
                        hostName: hostName
                    })
                });
                
                const data = await response.json();
                const resultDiv = document.getElementById('createResult');
                
                if (data.success) {
                    // Store the game ID for testing
                    document.getElementById('gameId').value = data.game_id;
                    resultDiv.innerHTML = '<pre class="success">' + JSON.stringify(data, null, 2) + '</pre>';
                } else {
                    resultDiv.innerHTML = '<pre class="error">' + JSON.stringify(data, null, 2) + '</pre>';
                }
                
            } catch (error) {
                document.getElementById('createResult').innerHTML = '<pre class="error">Error: ' + error.message + '</pre>';
            }
        }
        
        async function joinGame() {
            const gameId = document.getElementById('gameId').value;
            const playerName = document.getElementById('playerName').value;
            
            try {
                const response = await fetch('api/games.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'join',
                        gameId: gameId,
                        playerName: playerName
                    })
                });
                
                const data = await response.json();
                const resultDiv = document.getElementById('joinResult');
                
                if (data.success) {
                    resultDiv.innerHTML = '<pre class="success">' + JSON.stringify(data, null, 2) + '</pre>';
                } else {
                    resultDiv.innerHTML = '<pre class="error">' + JSON.stringify(data, null, 2) + '</pre>';
                }
                
            } catch (error) {
                document.getElementById('joinResult').innerHTML = '<pre class="error">Error: ' + error.message + '</pre>';
            }
        }
        
        async function getGameInfo() {
            const gameId = document.getElementById('getGameId').value;
            
            try {
                const response = await fetch(`api/games.php?id=${gameId}`);
                const data = await response.json();
                const resultDiv = document.getElementById('gameInfoResult');
                
                if (data.success) {
                    resultDiv.innerHTML = '<pre class="success">' + JSON.stringify(data, null, 2) + '</pre>';
                } else {
                    resultDiv.innerHTML = '<pre class="error">' + JSON.stringify(data, null, 2) + '</pre>';
                }
                
            } catch (error) {
                document.getElementById('gameInfoResult').innerHTML = '<pre class="error">Error: ' + error.message + '</pre>';
            }
        }
        
        async function getAvailableGames() {
            try {
                const response = await fetch('api/games.php');
                const data = await response.json();
                const resultDiv = document.getElementById('availableGamesResult');
                
                if (data.success) {
                    resultDiv.innerHTML = '<pre class="success">' + JSON.stringify(data, null, 2) + '</pre>';
                } else {
                    resultDiv.innerHTML = '<pre class="error">' + JSON.stringify(data, null, 2) + '</pre>';
                }
                
            } catch (error) {
                document.getElementById('availableGamesResult').innerHTML = '<pre class="error">Error: ' + error.message + '</pre>';
            }
        }
    </script>
</body>
</html>
