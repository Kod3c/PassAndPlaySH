# Secret Hitler Pass‑and‑Play PWA

**Purpose**: Build a few‑page, pass‑and‑play web app that digitally runs a game of Secret Hitler on one device, handling hidden roles, elections, policy legislation, and executive powers with strong privacy UX.

**Scope**: One device, offline‑capable, no accounts/servers, no networking. Clean, dependency‑free HTML/CSS/JS across a small number of focused pages where needed.

---

## Current Implementation Status

### ✅ Completed (Phase 0-1)
- **Basic PWA structure** with service worker and manifest
- **SPA routing system** with client-side navigation
- **Setup page** with player count selection (5-10 players) and role distribution display
- **Player name input system** with dynamic form generation
- **Rules page** with comprehensive game rules and instructions
- **Responsive design** with modern UI components
- **Basic offline capability** with service worker caching
- **Complete theme system** with 5 different themes and theme switcher

### 🚧 In Progress (Phase 2)
- **Core game engine** implementation
- **Game state management** and local storage persistence
- **Role reveal system** with secure handoff screens

### 📋 Next Steps (Phase 3-4)
- **Main game board** with policy tracking
- **Election system** with nomination and voting
- **Legislation flow** with policy drawing and enactment
- **Executive powers** implementation
- **Complete game flow** from setup to win conditions

---

## Implementation Phases

### Phase 0-1: Foundation ✅ COMPLETED
**Goal**: Establish basic PWA structure and SPA routing
- **PWA Setup**: Service worker, manifest, basic offline functionality
- **SPA Architecture**: Client-side routing with URL management
- **Basic UI**: Setup page, rules page, and responsive design system

### Phase 2: Core Game Engine 🚧 IN PROGRESS
**Goal**: Implement the fundamental game mechanics and state management
- **Game Engine**: Core Secret Hitler rules implementation
- **State Management**: Game state persistence and local storage
- **Role System**: Hidden role assignment and secure handoffs
- **Basic Game Flow**: Initial game setup and role distribution

### Phase 3: Game Mechanics (Planned)
**Goal**: Implement the complete game loop with all core mechanics
- **Election System**: Nomination and voting interfaces
- **Legislation Flow**: Policy drawing, discarding, and enactment
- **Executive Powers**: Special abilities implementation
- **Game Board**: Main game interface with policy tracking

### Phase 4: Polish and Enhancement (Planned)
**Goal**: Complete the game experience with advanced features
- **Game Flow**: Complete round progression and win conditions
- **UI Polish**: Enhanced animations, transitions, and visual feedback
- **Advanced Accessibility**: Screen reader support, high contrast modes
- **Performance Optimization**: Smooth operation on all devices

---

## Project Goals

1. **Faithful game flow**: 🔄 Implement setup, hidden roles, election/voting, legislative sessions, executive powers, and win conditions for 5–10 players.
2. **Pass‑and‑play privacy**: 🔄 Provide safe identity reveals and handoffs that minimize accidental information leaks.
3. **Focused simplicity**: ✅ Ship as a small set of focused HTML pages with manifest/service worker for installability.
4. **Offline first**: ✅ Work without a network once loaded; persist game state locally and recover after refresh.
5. **Accessibility & clarity**: ✅ Large touch targets, color‑blind safe cues, simple copy, and reduced‑motion support.
6. **Resilience**: 🔄 Undo/redo for mis‑taps, robust rule enforcement, and protections against illegal actions.

---

## How to Run

### Option 1: Simple HTTP Server
1. Clone or download this repository
2. Navigate to the project directory
3. Start a local HTTP server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (if you have http-server installed)
   npx http-server
   ```
4. Open your browser and go to `http://localhost:8000`

### Option 2: Live Server (VS Code)
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 3: Direct File Opening
- Simply open `index.html` in your browser (note: some features may not work due to CORS restrictions)

---

## Theme System

The app includes a comprehensive theme system with 5 different themes that can be switched using the theme switcher in the top-right corner:

### Available Themes
- **Default** - Original blue gradient design with white cards
- **Dark** - Dark backgrounds with light text for reduced eye strain
- **High Contrast** - High contrast colors for accessibility
- **Warm** - Warm orange/red gradient with cozy color palette
- **Cool** - Cool blue gradient with modern color scheme

### Features
- **Theme Persistence** - Your theme choice is automatically saved and restored
- **Instant Switching** - Themes apply immediately without page reload
- **Consistent UI** - All components automatically adapt to the selected theme
- **Mobile Friendly** - Theme switcher works perfectly on all device sizes
- **Accessibility** - High contrast theme for better readability

### Demo
Check out `theme-demo.html` to see all themes in action with various UI components.

---

## File Structure

```
PassAndPlaySH/
├── index.html              # Main entry point with SPA structure
├── manifest.json           # PWA manifest
├── sw.js                  # Service worker
├── styles/
│   └── main.css          # Complete stylesheet with all game pages
├── js/
│   └── app.js            # Main application logic with SPA routing
├── pages/                 # (Directory exists but currently empty)
└── README.md             # This file
```

---

## Features

### ✅ Implemented Features
- **Basic PWA structure** with offline capability and installability
- **SPA routing system** with client-side navigation
- **Setup page** with player count selection and role distribution
- **Player name input system** with dynamic form generation
- **Rules page** with comprehensive game instructions
- **Responsive design** optimized for mobile and desktop
- **Service worker** for basic offline functionality and caching
- **Modern UI components** with consistent styling and animations

### 🔄 In Progress Features
- **Core game engine** implementation
- **Game state management** and persistence
- **Role assignment system** with secure handoffs

### 📋 Planned Features
- **Main game board** with policy tracking
- **Election and voting system** 
- **Policy legislation flow**
- **Executive powers implementation**
- **Complete game loop** from setup to win conditions
- **Undo/redo system** for mistake correction
- **Game export/import** functionality

---

## Game Rules Summary

Secret Hitler is a social deduction game where:
- **Liberals** (3-6 players) try to enact 5 Liberal policies or identify and execute Hitler
- **Fascists** (1-3 players) try to enact 6 Fascist policies or have Hitler elected Chancellor after 3 Fascist policies
- **Hitler** (1 player) is hidden among the Fascists and doesn't know who the other Fascists are

### Game Flow
1. **Setup**: 🔄 Roles are secretly assigned with secure handoffs
2. **Election**: 📋 Players nominate and vote for President and Chancellor
3. **Legislation**: 📋 President draws 3 policies, discards 1, Chancellor chooses from remaining 2
4. **Executive Powers**: 📋 Certain Fascist policies unlock special abilities
5. **Repeat**: 📋 Continue until win condition is met

---

## Technical Details

### Architecture
- **Vanilla JavaScript** - No external dependencies
- **SPA Structure** - Single page application with client-side routing
- **Service Worker** - Enables basic offline functionality and PWA features
- **Local Storage** - Planned for game state persistence
- **Modular design** - Clean separation between routing logic and UI

### Browser Support
- Modern browsers with ES6+ support
- Service Worker support for offline functionality
- Local Storage support for game persistence (planned)

### Performance
- Lightweight implementation (< 100KB total)
- Fast page transitions with SPA routing
- Efficient routing and state management
- Minimal memory footprint

---

## Known Issues and Bug States

### 🐛 Current Limitations
- **Game engine not implemented** - Core game mechanics are not yet functional
- **Missing game pages** - Main game board, election, and legislation interfaces not yet created
- **No game state persistence** - Local storage implementation is planned but not yet implemented
- **Limited functionality** - Currently only setup and rules pages are fully functional

### ✅ Resolved Issues
- **SPA routing** - Client-side navigation now works correctly
- **Subdirectory hosting** - App works properly when hosted in subdirectories
- **Responsive design** - Layout works correctly on different screen sizes
- **Basic PWA functionality** - Service worker and manifest are properly configured

---

## Contributing

This is a personal project in early development. The project has successfully completed the foundation phase with SPA routing and basic UI, but the core game mechanics are still being implemented. Contributions for the game engine, game state management, and game interface development would be particularly valuable.

---

## License

This project is for educational and personal use. Secret Hitler is a trademark of its respective owners.
