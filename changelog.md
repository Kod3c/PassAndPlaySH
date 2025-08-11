# Changelog

## [0.5.3] - 2024-12-19

### 🚨 Critical Bug Fixes
- **Fixed subdirectory hosting navigation** - App now works correctly when hosted in subdirectories like `/PassAndPlaySH/`
- **Resolved "could not load setup page" error** - Start New Game button now navigates to correct setup page
- **Fixed browser history URLs** - Navigation now creates proper relative paths instead of absolute paths
- **Corrected service worker registration** - Service worker now registers with correct base path for subdirectory hosting
- **Fixed 404 errors on page refresh** - Pages like `/setup` now work correctly when refreshed
- **Improved SPA routing** - Service worker now handles direct URL access and redirects to index.html
- **Route restoration** - App automatically detects current route from URL and restores page state on load

### 🔧 Technical Improvements
- **Enhanced base path detection** - App automatically detects when hosted in subdirectory and adjusts all URLs accordingly
- **Updated PWA manifest** - Fixed absolute paths in `start_url`, `scope`, and shortcut URLs to work with subdirectory hosting
- **Improved service worker caching** - All cached file paths now use correct base path for subdirectory hosting
- **Fixed notification icon paths** - Push notification icons now use correct base path
- **Enhanced service worker** - Added navigation request handling for SPA routing
- **URL-based page restoration** - App can now restore any page state from the URL on initial load
- **Better error handling** - Graceful fallback to index.html for missing routes

### 📁 Files Modified
- `js/app.js` - Fixed `navigateToPage` method to use proper base paths and updated service worker registration
- `manifest.json` - Changed all absolute paths (`/`) to relative paths (`./`) for subdirectory compatibility
- `sw.js` - Added dynamic base path detection and updated all cached file paths

### 🐛 Issues Resolved
1. **Navigation to wrong URLs** - Fixed by implementing proper base path detection in `navigateToPage` method
2. **Service worker registration failure** - Fixed by using correct base path for service worker registration
3. **PWA manifest compatibility** - Fixed absolute paths that prevented proper PWA functionality in subdirectories
4. **Caching issues** - Service worker now caches files from correct locations when hosted in subdirectories
5. **Notification icon paths** - Push notification icons now display correctly in subdirectory hosting
6. **404 errors on page refresh** - Fixed by improving SPA routing and route restoration

### 🌐 Hosting Compatibility
- **Subdirectory hosting support** - App now works correctly when hosted at paths like `http://localhost/PassAndPlaySH/`
- **Relative path navigation** - All internal navigation now uses relative paths that work regardless of hosting location
- **Dynamic base path detection** - App automatically adapts to different hosting configurations

### 🔍 Root Cause Analysis
The navigation issues were caused by hardcoded absolute paths throughout the application:
1. **Primary Issue**: `navigateToPage` method creating absolute URLs like `/setup` instead of `/PassAndPlaySH/setup`
2. **Secondary Issues**: Service worker registration, PWA manifest, and caching all using absolute paths
3. **Hosting Impact**: Absolute paths work only when app is hosted at root domain, not in subdirectories

### ✅ Verification
- Start New Game button now correctly navigates to setup page
- Browser history shows correct URLs with proper base path
- Service worker registers and caches files from correct locations
- PWA manifest works properly in subdirectory hosting
- All internal navigation between game pages functions correctly
- Pages now work correctly when refreshed in the browser
- No more 404 errors when using browser back/forward or refreshing

### 📋 Previous Versions
- **0.5.2** - Fixed broken button functionality and JavaScript syntax errors
- **0.5.1** - Initial implementation with basic game structure
- **0.5.0** - Core game engine and player setup functionality

---

## [0.5.2] - 2024-12-19

### 🚨 Critical Bug Fixes
- **Fixed broken button functionality** - All main navigation buttons now work properly
- **Resolved JavaScript syntax errors** that were preventing the app from loading
- **Fixed malformed HTML** in the `selectPlayerCount` method
- **Corrected dataset access** in `getSelectedPlayerCount` method
- **Added missing class closing brace** for `SecretHitlerApp` class
- **Removed duplicate event listeners** that were causing conflicts
- **Fixed DOM timing issue** - Event listeners now bind after DOM is fully loaded
- **Fixed page navigation paths** - Corrected fetch URLs for proper page loading

### 🔧 Technical Improvements
- **Enhanced button selection logic** - Player count buttons now properly show selected state
- **Added fallback values** in `getRoleDistribution` to prevent undefined returns
- **Fixed script tag dependencies** - Added missing `gameEngine.js` and removed duplicates
- **Updated service worker cache** to include all necessary JavaScript files
- **Improved error handling** throughout the application

### 📁 Files Modified
- `js/app.js` - Fixed syntax errors, logic issues, and missing functionality
- `index.html` - Corrected script dependencies and removed duplicate tags
- `sw.js` - Added missing JavaScript files to cache list
- `debug-index.html` - Created for troubleshooting button functionality
- `test-buttons.html` - Created for basic JavaScript functionality testing

### 🐛 Issues Resolved
1. **Buttons not responding to clicks** - Fixed by resolving JavaScript syntax errors
2. **Player count selection not working** - Fixed dataset access and selection logic
3. **Role distribution display errors** - Added fallback values for invalid player counts
4. **Missing game engine functionality** - Added proper script dependencies
5. **Service worker caching issues** - Ensured all necessary files are cached
6. **Page navigation failing** - Fixed fetch URL paths for proper page loading

### 🧪 Testing & Debugging
- **Created debug version** of main page with inline logging
- **Added comprehensive error checking** for button elements and event listeners
- **Implemented test pages** to isolate JavaScript functionality issues
- **Added console logging** throughout the application for troubleshooting

### 📱 PWA Improvements
- **Enhanced offline functionality** by caching all required JavaScript files
- **Improved service worker** to handle all application assets
- **Better error handling** for offline scenarios

### 🔍 Root Cause Analysis
The button functionality issues were caused by multiple cascading problems:
1. **Primary Issue**: Missing closing brace in `SecretHitlerApp` class causing JavaScript syntax error
2. **Secondary Issues**: Malformed HTML, incorrect dataset access, missing selection logic
3. **Dependency Issues**: Missing script files and duplicate script tags
4. **Caching Issues**: Service worker not caching all necessary files

### ✅ Verification
- All main navigation buttons now function properly
- Player count selection works with visual feedback
- Role distribution displays correctly for all player counts
- JavaScript console shows no syntax errors
- Application loads completely without blocking

### 📋 Previous Versions
- **0.5.1** - Initial implementation with basic game structure
- **0.5.0** - Core game engine and player setup functionality

---

## [0.5.1] - Initial Release

- Basic game structure and navigation
- Player setup and role assignment
- Game engine foundation
- PWA capabilities

## [0.5.0] - Core Development

- Secret Hitler game logic implementation
- Player management system
- Basic UI and styling
- Offline functionality foundation

## [0.5.2] - 2025-08-10
- Enhanced player distribution graphic on new game setup: modernized .players-grid and .player-card styles with improved layout, card shadows, rounded corners, hover effects, and avatar support for a more visually appealing experience.
