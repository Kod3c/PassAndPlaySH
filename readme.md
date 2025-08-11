# Secret Hitler Pass‑and‑Play PWA

**Purpose**: Build a few‑page, pass‑and‑play web app that digitally runs a game of Secret Hitler on one device, handling hidden roles, elections, policy legislation, and executive powers with strong privacy UX.

**Scope**: One device, offline‑capable, no accounts/servers, no networking. Clean, dependency‑free HTML/CSS/JS across a small number of focused pages where needed.

**Current Version**: 0.6.2 (2024-12-19)

---

## Implementation Phases

### Phase 0-1: Foundation ✅ COMPLETED
**Goal**: Establish basic PWA structure and SPA routing
- **PWA Setup**: Service worker, manifest, basic offline functionality
- **SPA Architecture**: Client-side routing with URL management
- **Basic UI**: Setup page, rules page, and responsive design system
- **Theme System**: Complete theming with 5 themes and switcher
- **Mobile Optimization**: Touch-friendly controls and responsive design

### Phase 2: Game Builder & Setup System 🚧 IN PROGRESS - CURRENT
**Goal**: Complete the game setup and configuration system to enable proper game initialization

#### 🎯 Specific TODOs for Phase 2 Completion:

**Game Setup Flow (Priority 1)**
- [ ] Complete role assignment system with secure distribution
- [ ] Implement player handoff screens for role reveals
- [ ] Add setup validation to ensure proper game configuration
- [ ] Create game initialization and start functionality
- [ ] Build setup completion and game transition flow

**Game Configuration Interface (Priority 2)**
- [ ] Add game parameter customization (optional rules, variants)
- [ ] Implement setup preferences and defaults
- [ ] Create configuration validation and error handling
- [ ] Add setup recovery and modification capabilities
- [ ] Build setup export/import for saved configurations

**Setup System Architecture (Priority 3)**
- [ ] Design robust setup state management
- [ ] Implement setup data persistence and recovery
- [ ] Add setup undo/redo functionality
- [ ] Create setup error recovery mechanisms
- [ ] Build setup testing and validation tools

**User Experience & Polish (Priority 4)**
- [ ] Enhance setup flow with progress indicators
- [ ] Add setup help and guidance system
- [ ] Implement setup accessibility features
- [ ] Create setup tutorial and onboarding
- [ ] Polish setup animations and transitions

#### 🔧 Technical Requirements for Phase 2:
- **Setup Engine**: Complete game initialization system
- **State Management**: Setup state persistence and validation
- **Role System**: Secure role assignment and distribution
- **Validation Logic**: Game setup rule enforcement
- **User Interface**: Intuitive setup flow and configuration

### Phase 3: Basic Gameplay (Planned)
**Goal**: Implement core game mechanics and basic gameplay
- **Game Engine**: Core Secret Hitler rules implementation
- **Game Board**: Main game interface with policy tracking
- **Election System**: Nomination, voting, and government formation
- **Basic Game Flow**: Turn progression and win condition checking
- **Game State Management**: Local storage and persistence

### Phase 4: Advanced Gameplay & Polish (Planned)
**Goal**: Complete the game experience with advanced features
- **Legislation Flow**: Policy drawing, discarding, and enactment
- **Executive Powers**: Special abilities and advanced mechanics
- **Game Enhancement**: Undo/redo, game export/import, advanced rules
- **UI Polish**: Enhanced animations, accessibility, and performance
- **Testing & Refinement**: Comprehensive testing and bug fixes

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
│   ├── main.css          # Complete stylesheet with all game pages
│   └── themes.css        # Theme system and CSS variables
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
- **Complete theme system** with 5 themes and theme switcher
- **Mobile-optimized player selection** with +/- controls
- **Subdirectory hosting compatibility** for various deployment scenarios

### 🔄 In Progress Features
- **Game builder/setup system** implementation
- **Complete game setup flow** with role assignment and handoffs
- **Game configuration interface** for customizing game parameters
- **Setup validation and error handling** for proper game initialization

### 📋 Planned Features
- **Basic gameplay mechanics** with core game engine
- **Main game board** with policy tracking and game state
- **Election and voting system** with nomination and ballot functionality
- **Policy legislation flow** with drawing, discarding, and enactment
- **Executive powers** and special abilities
- **Complete game loop** from setup to win conditions
- **Game state persistence** and recovery
- **Advanced game mechanics** and rule enforcement

---

## Game Rules Summary

Secret Hitler is a social deduction game where:
- **Liberals** (3-6 players) try to enact 5 Liberal policies or identify and execute Hitler
- **Fascists** (1-3 players) try to enact 6 Fascist policies or have Hitler elected Chancellor after 3 Fascist policies
- **Hitler** (1 player) is hidden among the Fascists and doesn't know who the other Fascists are

### Game Flow
1. **Setup**: 🔄 Roles are secretly assigned with secure handoffs
2. **Election**: 🔄 Players nominate and vote for President and Chancellor
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
- **CSS Custom Properties** - Theme system using CSS variables

### Browser Support
- Modern browsers with ES6+ support
- Service Worker support for offline functionality
- Local Storage support for game persistence (planned)
- CSS Custom Properties support for theming

### Performance
- Lightweight implementation (< 100KB total)
- Fast page transitions with SPA routing
- Efficient routing and state management
- Minimal memory footprint
- Optimized mobile experience with touch-friendly controls

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
- **Theme system** - Complete theming with 5 themes and switcher
- **Mobile player selection** - Intuitive +/- controls for player count adjustment
- **Touch-friendly interface** - Optimized for mobile devices with large touch targets

---

## Recent Updates (Version 0.6.2)

### 🎯 Mobile Player Selection System
- Replaced individual player count buttons with intuitive +/- system
- Mobile-first design with large touch-friendly controls (4rem on mobile)
- Centered layout with clean, organized appearance
- Dynamic updates for role distribution and player input fields

### 🔧 Technical Improvements
- Smart button states (disabled at limits)
- Event-driven UI updates throughout the system
- Responsive button sizing for different screen sizes
- Improved mobile experience and touch interaction

---

## Contributing

This is a personal project in active development. The project has successfully completed the foundation phase with SPA routing, basic UI, and mobile optimization. We are currently in Phase 2 implementing the complete game builder and setup system. Contributions for the setup system, role management, game configuration, and setup user experience would be particularly valuable.

**Current Focus Areas:**
- Game setup flow and role assignment system
- Game configuration interface and customization
- Setup validation and error handling
- Setup state management and persistence
- Setup user experience and accessibility

---

## License

This project is for educational and personal use. Secret Hitler is a trademark of its respective owners.
