# Secret Hitler - Pass and Play

A web-based implementation of the Secret Hitler board game with both pass-and-play and multi-device gameplay modes.

## Features

- **Pass and Play**: Single device gameplay for local groups
- **Multi-Device**: Online multiplayer with backend persistence
- **Demo Mode**: Interactive tutorial and demonstration
- **Complete Game Rules**: Full Secret Hitler gameplay implementation
- **Modern UI**: Responsive design with theme support

## Quick Start

### Option 1: Local Development (Recommended)
1. Install [XAMPP](https://www.apachefriends.org/)
2. Place project in `C:\xampp\htdocs\PassAndPlaySH\`
3. Start Apache service in XAMPP
4. Open `http://localhost/PassAndPlaySH/`
5. Game connects to remote Plesk database automatically

### Option 2: Plesk Hosting
1. Upload files to your Plesk hosting
2. Database already configured and ready
3. Open your domain to play

## Game Modes

- **Demo**: Learn the game mechanics
- **Pass & Play**: Local multiplayer on one device
- **Multi-Device**: Online multiplayer with friends

## Documentation

- [GAMEPLAY.md](GAMEPLAY.md) - Complete gameplay mechanics
- [LOCAL-DEVELOPMENT.md](LOCAL-DEVELOPMENT.md) - Local development setup
- [MYSQL-SETUP.md](MYSQL-SETUP.md) - Database configuration
- [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) - Project organization

## Development

The game is built with:
- **Frontend**: HTML5, CSS3, JavaScript (ES6)
- **Backend**: PHP with MySQL database
- **Architecture**: RESTful API with offline fallback

## Database

- **Host**: Remote Plesk MySQL server
- **Connection**: Automatic from both local and production
- **Schema**: Includes game state, players, and history

## License

This project is for educational and personal use.
