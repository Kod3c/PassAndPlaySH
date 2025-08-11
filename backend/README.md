# Secret Hitler Multi-Device Backend

This is the backend implementation for converting the pass-and-play Secret Hitler game into a multi-device experience.

## Setup Instructions

### 1. Database Setup

1. **Install MySQL/MariaDB** (version 8.0+ recommended)
2. **Create Database:**
   ```sql
   CREATE DATABASE secret_hitler CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. **Import Schema:**
   ```bash
   mysql -u root -p secret_hitler < database/schema.sql
   ```

### 2. PHP Requirements

- PHP 8.0+ (8.1+ recommended)
- PDO extension
- JSON extension
- MySQL extension

### 3. Configuration

Edit `config/database.php` with your database credentials:
```php
const DB_HOST = 'localhost';
const DB_NAME = 'secret_hitler';
const DB_USER = 'your_username';
const DB_PASS = 'your_password';
```

### 4. Web Server Setup

#### Option A: Built-in PHP Server (Development)
```bash
cd backend
php -S localhost:8000
```

#### Option B: Apache/Nginx
- Point your web server to the `backend` directory
- Ensure `.htaccess` is configured for URL rewriting
- Make sure PHP is properly configured

## API Endpoints

### Status Check
- **GET** `/api/status.php` - Check database connectivity and system health

### Games Management
- **GET** `/api/games.php` - Get all available games
- **GET** `/api/games.php?id={gameId}` - Get specific game info
- **POST** `/api/games.php` - Create, join, or start games

#### POST Actions:

**Create Game:**
```json
{
    "action": "create",
    "name": "Game Name",
    "maxPlayers": 6,
    "hostName": "Host Name"
}
```

**Join Game:**
```json
{
    "action": "join",
    "gameId": "uuid-here",
    "playerName": "Player Name"
}
```

**Start Game:**
```json
{
    "action": "start",
    "gameId": "uuid-here",
    "hostId": "host-uuid-here"
}
```

## Testing

1. **Start the backend server**
2. **Open** `http://localhost:8000/test.php` in your browser
3. **Test the API endpoints** using the interactive test interface

## Database Schema

The backend uses 9 main tables:

1. **games** - Core game information
2. **players** - Player details and roles
3. **game_state** - Current game state and policy deck
4. **policy_board** - Visual policy tracks
5. **current_votes** - Active election votes
6. **game_actions** - Complete action history
7. **executive_powers** - Power usage tracking
8. **game_phases** - Phase and turn management
9. **game_statistics** - Completed game results

## Architecture

```
Frontend (PWA) ←→ API Endpoints ←→ Game Classes ←→ Database
                     ↓
                WebSocket Server ←→ Real-time Updates
```

## Next Steps

1. **Implement WebSocket server** for real-time communication
2. **Add game mechanics** (voting, policy enactment, etc.)
3. **Create frontend integration** with the existing PWA
4. **Add authentication and security** measures
5. **Implement anti-cheat** systems

## Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check database credentials in `config/database.php`
   - Ensure MySQL service is running
   - Verify database exists

2. **Permission Denied**
   - Check file permissions
   - Ensure web server can read/write to backend directory

3. **API Not Responding**
   - Check PHP error logs
   - Verify URL rewriting is working
   - Test with the built-in test page

### Debug Mode:

Enable error reporting in PHP:
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

## Security Notes

⚠️ **This is a development version. For production:**

1. **Use HTTPS** for all communications
2. **Implement proper authentication**
3. **Add rate limiting**
4. **Validate all inputs**
5. **Use environment variables** for sensitive data
6. **Implement proper session management**

## Development Workflow

1. **Make changes** to PHP classes
2. **Test locally** using the test page
3. **Update database schema** if needed
4. **Test API endpoints** with Postman/Insomnia
5. **Integrate with frontend** when ready

## Support

For issues or questions:
1. Check the error logs
2. Test with the provided test page
3. Verify database connectivity
4. Check PHP configuration
