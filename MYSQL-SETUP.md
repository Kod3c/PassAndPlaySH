# MySQL Database Setup for Secret Hitler

## Prerequisites
- Plesk hosting account with MySQL/MariaDB
- Database `shpassandplay` already created
- Database user `secrethitler` with proper permissions
- PHP support enabled on your hosting

## Database Connection Details

**Host:** `66.179.253.5`  
**Database:** `shpassandplay`  
**Username:** `secrethitler`  
**Password:** `Roobear0515!`  
**Port:** `3306`

## Setup Steps

### 1. Database Creation (Already Done)
✅ Database `shpassandplay` created in Plesk  
✅ User `secrethitler` created with password `Roobear0515!`  
✅ User has access to the database  

### 2. Upload Project Files
1. Upload all project files to your Plesk hosting
2. Ensure the `backend/` directory is accessible
3. Verify file permissions are correct (644 for files, 755 for directories)

### 3. Test Database Connection
1. Visit: `http://sh.cobalt.onl/backend/api/status.php`
2. Should see JSON response with database status
3. If connection fails, check firewall and MySQL service

### 4. Initialize Database Schema
1. Run the initialization script: `http://sh.cobalt.onl/backend/init_db.php`
2. This will create all necessary tables
3. Verify success message appears

## Database Structure

The database includes these tables:
- `games` - Game sessions and metadata
- `players` - Player information and game membership
- `game_actions` - Log of all game events
- `game_policies` - Tracking of enacted policies
- `game_votes` - Election voting records

## Troubleshooting

### Common Issues:
1. **"Access denied"** - Verify user permissions in Plesk
2. **"Connection refused"** - Check if MySQL service is running
3. **"Host not allowed"** - Ensure firewall allows connections to port 3306
4. **"Database not found"** - Verify database exists in Plesk

### Plesk Settings to Check:
1. **MySQL Service** - Ensure it's running
2. **User Permissions** - User should have full access to `shpassandplay` database
3. **Firewall Rules** - Allow connections to port 3306
4. **PHP Extensions** - Ensure PDO and MySQL extensions are enabled

## File Locations
- Database config: `backend/config/database.php`
- Schema file: `database/schema.sql`
- Init script: `backend/init_db.php`
- API endpoints: `backend/api/`

## Testing the Setup

After setup, you can:
1. Create new games
2. Join existing games
3. Use full backend functionality
4. Store game state and history

The game will automatically detect the backend and switch from offline mode to full online mode.

## Security Notes
- Database is configured for remote connections
- User has access only to the specific database
- Consider restricting access to specific IPs if needed
- Ensure strong password protection
