# Local Development Setup

## Overview
This guide shows how to run the Secret Hitler game locally while connecting to your remote Plesk database. This allows you to develop and test locally while using the production database.

## Prerequisites
- XAMPP installed and running
- Apache and MySQL services started
- PHP enabled
- Project files in `C:\xampp\htdocs\PassAndPlaySH\`

## Database Connection
Your local files will connect to:
- **Host:** `66.179.253.5` (Remote Plesk)
- **Database:** `shpassandplay`
- **Username:** `secrethitler`
- **Password:** `Roobear0515!`

## Setup Steps

### 1. Start XAMPP Services
1. Open XAMPP Control Panel
2. Start Apache service
3. Start MySQL service (optional - only needed if you want local MySQL too)
4. Verify Apache is running (green status)

### 2. Project Location
Ensure your project is in: `C:\xampp\htdocs\PassAndPlaySH\`

### 3. Test Database Connection
1. Open: `http://localhost/PassAndPlaySH/backend/api/status.php`
2. Should show JSON response with remote database status
3. If connection fails, check:
   - Internet connection
   - Firewall allows outbound connections to port 3306
   - Plesk MySQL service is running

### 4. Initialize Database (if needed)
1. Open: `http://localhost/PassAndPlaySH/backend/init_db.php`
2. This will create tables in your remote Plesk database
3. Verify success message appears

### 5. Test the Game
1. Open: `http://localhost/PassAndPlaySH/`
2. Click "Play Multi-Device Game"
3. The game should connect to your remote database
4. Create and join games to test functionality

## File Structure for Local Development
```
C:\xampp\htdocs\PassAndPlaySH\
├── index.html
├── demo.html
├── pages/
│   └── play.html          # Backend URL: localhost/PassAndPlaySH/backend
├── js/
│   └── app.js
├── styles/
├── backend/                # PHP backend (connects to remote DB)
│   ├── config/
│   │   └── database.php   # Remote DB config
│   ├── api/
│   ├── classes/
│   └── init_db.php
└── database/
    └── schema.sql
```

## Benefits of This Setup
- **Local Development**: Fast development and testing
- **Remote Database**: Persistent data storage
- **No Local DB Setup**: Use existing Plesk database
- **Easy Deployment**: Same code works locally and on Plesk

## Troubleshooting

### Connection Issues
1. **"Failed to fetch"** - Check if Apache is running
2. **"Database connection failed"** - Check internet connection and Plesk status
3. **"Access denied"** - Verify database credentials

### Local Server Issues
1. **"Page not found"** - Check project path in htdocs
2. **"PHP errors"** - Ensure PHP is enabled in XAMPP
3. **"Permission denied"** - Check file permissions

### Database Issues
1. **"Tables don't exist"** - Run `init_db.php`
2. **"Connection timeout"** - Check firewall and Plesk status
3. **"Host not allowed"** - Verify Plesk allows remote connections

## Switching to Production
When ready to deploy:
1. Upload files to Plesk hosting
2. Change `backendUrl` in `pages/play.html` to `http://sh.cobalt.onl/backend`
3. Test on live site

## Development Workflow
1. **Code Locally**: Edit files in your local project
2. **Test Locally**: Use `http://localhost/PassAndPlaySH/`
3. **Database**: All data stored remotely on Plesk
4. **Deploy**: Upload to Plesk when ready

This setup gives you the best of both worlds: fast local development with persistent remote data storage!
