# Secret Hitler - Clean Project Structure

## Core Application Files

### Frontend
- `index.html` - Main home page with game options
- `demo.html` - Interactive gameplay demonstration
- `pages/play.html` - Multi-device game setup and gameplay
- `js/app.js` - Main game engine and application logic
- `styles/main.css` - Core styling and game mechanics CSS
- `styles/themes.css` - Theme system and color schemes

### Backend (MySQL)
- `backend/config/database.php` - MySQL database configuration for XAMPP
- `backend/init_db.php` - Database initialization script
- `backend/api/status.php` - Backend status and health check
- `backend/api/games.php` - Game creation, joining, and management
- `backend/classes/Database.php` - Database connection and operations
- `backend/classes/Game.php` - Game logic and state management

### Database
- `database/schema.sql` - MySQL database schema and sample data

### Documentation
- `readme.md` - Main project overview and setup instructions
- `GAMEPLAY.md` - Complete gameplay mechanics documentation
- `MYSQL-SETUP.md` - MySQL database setup guide for XAMPP

## What Was Removed

### Unnecessary Files (Deleted)
- `setup.bat` / `setup.ps1` - Startup scripts (not needed with XAMPP)
- `new-style.md` - Old documentation
- `conversion-plan.md` - Old conversion notes
- `changelog.md` - Old changelog
- `sw.js` - Service worker (not needed)
- `manifest.json` - PWA manifest (not needed)
- `database/schema.sqlite.sql` - Old SQLite schema
- `backend/test.php` - Test file
- `backend/README.md` - Redundant documentation
- `backend/composer.json` - Not needed for simple setup
- `backend/websocket/` - Empty directory

## Current Structure

```
PassAndPlaySH/
├── index.html              # Main home page
├── demo.html               # Gameplay demo
├── pages/
│   └── play.html          # Multi-device game
├── js/
│   └── app.js             # Game engine
├── styles/
│   ├── main.css           # Core styles
│   └── themes.css         # Theme system
├── backend/                # MySQL backend
│   ├── config/
│   │   └── database.php   # Database config
│   ├── api/
│   │   ├── status.php     # Health check
│   │   └── games.php      # Game API
│   ├── classes/
│   │   ├── Database.php   # DB operations
│   │   └── Game.php       # Game logic
│   └── init_db.php        # DB setup
├── database/
│   └── schema.sql         # MySQL schema
├── readme.md               # Project overview
├── GAMEPLAY.md            # Game mechanics
└── MYSQL-SETUP.md         # Database setup
```

## Purpose of Remaining Files

- **Frontend**: Complete Secret Hitler game with demo and multi-device support
- **Backend**: MySQL-based game management and persistence
- **Database**: Game state storage and player management
- **Documentation**: Setup guides and gameplay instructions

The project is now clean and focused, with only the essential files needed for a fully functional Secret Hitler game using MySQL and XAMPP.
