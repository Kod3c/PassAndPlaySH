# Secret Hitler Pass‑and‑Play PWA

**Purpose**: Build a few‑page, pass‑and‑play web app that digitally runs a game of Secret Hitler on one device, handling hidden roles, elections, policy legislation, and executive powers with strong privacy UX.

**Scope**: One device, offline‑capable, no accounts/servers, no networking. Clean, dependency‑free HTML/CSS/JS across a small number of focused pages where needed.

---

## Current Implementation Status

### ✅ Completed (Phase 0-3)
- **Complete PWA structure** with multi-page navigation and service worker
- **Full game engine** with complete Secret Hitler rules implementation
- **Comprehensive game state management** and local storage persistence
- **All core game pages** implemented and functional:
  - Setup page with player configuration
  - Role reveal with secure handoff screens
  - Main game board with policy tracking
  - Election system with nomination and voting
  - Legislation flow with policy drawing and enactment
  - Executive powers implementation
- **Responsive design** with accessibility features
- **Offline capability** with service worker caching
- **Complete game flow** from setup to win conditions

### 🚧 In Progress (Phase 4)
- **UI polish and visual enhancements**
- **Advanced accessibility features**
- **Performance optimization**

### 📋 Next Steps (Phase 5-6)
- **Undo/redo system** for mistake correction
- **Game export/import** functionality
- **Advanced game statistics** and analytics
- **Cross-browser compatibility** testing
- **Mobile touch optimization**

---

## Implementation Phases

### Phase 0-1: Foundation ✅ COMPLETED
**Goal**: Establish basic PWA structure and core game engine
- **PWA Setup**: Service worker, manifest, offline functionality
- **Game Engine**: Complete Secret Hitler rules implementation
- **Basic UI**: Multi-page structure with navigation

### Phase 2-3: Core Game Flow ✅ COMPLETED
**Goal**: Implement the complete game loop with all mechanics
- **Election System**: ✅ Complete nomination and voting interfaces
- **Legislation Flow**: ✅ Policy drawing, discarding, and enactment
- **Executive Powers**: ✅ All special abilities implemented
- **Game State Management**: ✅ Round progression and win conditions
- **Role Reveal**: ✅ Secure handoff screens with privacy protection

### Phase 4: UI Polish and Enhancement 🚧 IN PROGRESS
**Goal**: Enhance user experience with visual improvements and accessibility
- **Visual Polish**: Improved animations, transitions, and visual feedback
- **Advanced Accessibility**: Screen reader support, high contrast modes
- **Performance Optimization**: Smooth operation on all devices
- **Mobile Optimization**: Touch interactions and mobile-specific features

### Phase 5: Advanced Features (Planned)
**Goal**: Implement sophisticated game mechanics and quality-of-life improvements
- **Undo/Redo System**: Allow players to correct mistakes and review decisions
- **Game Export/Import**: Save and load game states for later continuation
- **House Rules Support**: Configurable game variants and optional rules
- **Game Statistics**: Track win rates, policy enactment patterns, and player performance

### Phase 6: Testing and Deployment (Planned)
**Goal**: Comprehensive testing, bug fixes, and preparation for public use
- **Game Testing**: Extensive playtesting of all game scenarios and edge cases
- **Cross-browser Compatibility**: Ensure consistent experience across different browsers
- **Documentation**: Complete user guides, troubleshooting, and maintenance information
- **Performance Testing**: Load testing and optimization for various devices

---

## Project Goals

1. **Faithful game flow**: ✅ Accurately implement setup, hidden roles, election/voting, legislative sessions, executive powers, and win conditions for 5–10 players.
2. **Pass‑and‑play privacy**: ✅ Provide safe identity reveals and handoffs that minimize accidental information leaks.
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

## File Structure

```
PassAndPlaySH/
├── index.html              # Main entry point
├── manifest.json           # PWA manifest
├── sw.js                  # Service worker
├── styles/
│   └── main.css          # Complete stylesheet with all game pages
├── js/
│   ├── app.js            # Main application logic (1300+ lines)
│   └── gameEngine.js     # Core game rules engine (500+ lines)
├── pages/
│   ├── setup.html        # Game setup page
│   ├── role-reveal.html  # Role assignment and handoff
│   ├── game.html         # Main game board
│   ├── election.html     # Election and voting interface
│   ├── legislation.html  # Policy drawing and enactment
│   ├── executive-powers.html # Special abilities interface
│   └── rules.html        # Game rules page
└── README.md             # This file
```

---

## Features

### ✅ Implemented Features
- **Complete PWA structure** with offline capability and installability
- **Full game engine** implementing all Secret Hitler mechanics
- **All game pages** fully functional and styled
- **Responsive design** optimized for mobile and desktop
- **Local storage** for game state persistence
- **Service worker** for offline functionality and caching
- **Accessibility features** including large touch targets and keyboard navigation
- **Secure role reveal** with privacy-protected handoffs
- **Complete game flow** from setup to win conditions

### 🔄 In Progress Features
- **UI polish** and visual enhancements
- **Advanced accessibility** improvements
- **Performance optimization** for various devices

### 📋 Planned Features
- **Undo/redo system** for mistake correction
- **Export/import** game state functionality
- **Game statistics** and analytics
- **House rules** support and variants

---

## Game Rules Summary

Secret Hitler is a social deduction game where:
- **Liberals** (3-6 players) try to enact 5 Liberal policies or identify and execute Hitler
- **Fascists** (1-3 players) try to enact 6 Fascist policies or have Hitler elected Chancellor after 3 Fascist policies
- **Hitler** (1 player) is hidden among the Fascists and doesn't know who the other Fascists are

### Game Flow
1. **Setup**: ✅ Roles are secretly assigned with secure handoffs
2. **Election**: ✅ Players nominate and vote for President and Chancellor
3. **Legislation**: ✅ President draws 3 policies, discards 1, Chancellor chooses from remaining 2
4. **Executive Powers**: ✅ Certain Fascist policies unlock special abilities
5. **Repeat**: ✅ Continue until win condition is met

---

## Technical Details

### Architecture
- **Vanilla JavaScript** - No external dependencies
- **Multi-page structure** - Each game phase has its own focused page
- **Service Worker** - Enables offline functionality and PWA features
- **Local Storage** - Game state persistence without external servers
- **Modular design** - Clean separation between game logic and UI

### Browser Support
- Modern browsers with ES6+ support
- Service Worker support for offline functionality
- Local Storage support for game persistence

### Performance
- Lightweight implementation (< 200KB total)
- Fast page transitions
- Efficient game state management
- Minimal memory footprint

---

## Known Issues and Bug States

### 🐛 Minor Issues
- **Visual polish**: Some UI elements could benefit from additional styling refinement
- **Mobile optimization**: Touch interactions could be further optimized for small screens
- **Performance**: Some animations may need optimization on lower-end devices

### ✅ Resolved Issues
- **Game flow**: Complete game loop is fully functional
- **State management**: Game state persistence and recovery works correctly
- **Privacy**: Role reveal and handoff screens properly protect information
- **Rules implementation**: All game mechanics accurately follow Secret Hitler rules

---

## Contributing

This is a personal project, but suggestions and feedback are welcome! The project has successfully completed the core game implementation and is now focused on polish and enhancement. Contributions for UI improvements, accessibility features, and performance optimization are particularly valuable.

---

## License

This project is for educational and personal use. Secret Hitler is a trademark of its respective owners.
