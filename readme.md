# Secret Hitler Pass‑and‑Play PWA

**Purpose**: Build a few‑page, pass‑and‑play web app that digitally runs a game of Secret Hitler on one device, handling hidden roles, elections, policy legislation, and executive powers with strong privacy UX.

**Scope**: One device, offline‑capable, no accounts/servers, no networking. Clean, dependency‑free HTML/CSS/JS across a small number of focused pages where needed.

**Current Version**: 0.1.8.0 (2024-12-19)

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETED
**Goal**: Establish complete PWA structure, SPA routing, and polished user interface
- **PWA Setup**: Service worker, manifest, offline functionality, and installability
- **SPA Architecture**: Client-side routing with URL management and subdirectory hosting support
- **Complete UI System**: Setup page, rules page, and comprehensive responsive design system
- **Advanced Theme System**: Complete theming with 5 themes, theme switcher, and theme persistence
- **Mobile-First Design**: Touch-friendly controls, responsive layouts, and mobile optimization
- **Professional Visual Design**: Modern card-based design, animations, and glass-morphism effects
- **Role Distribution System**: Interactive role assignment with player name preservation
- **Rules Page**: Comprehensive 6-tab rules system with interactive learning elements

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
├── pages/                 # Multi-device game interface
│   └── multidevice.html  # Multi-device game creation and joining
├── backend/               # Backend infrastructure for multi-device games
│   ├── api/              # RESTful API endpoints
│   ├── classes/          # PHP classes for database and game logic
│   ├── config/           # Database configuration
│   └── websocket/        # WebSocket server (planned)
├── database/              # Database schema and structure
└── README.md             # This file
```

---

## Features

### ✅ Implemented Features
- **Complete PWA structure** with offline capability, installability, and service worker
- **Advanced SPA routing system** with client-side navigation and subdirectory hosting support
- **Professional setup page** with player count selection (5-10 players) and role distribution
- **Smart player name input system** with dynamic form generation and name preservation
- **Comprehensive rules page** with 6 interactive tabs and rich visual content
- **Mobile-first responsive design** optimized for all screen sizes and devices
- **Complete theme system** with 5 themes, theme switcher, and theme persistence
- **Advanced mobile optimization** with touch-friendly controls, responsive breakpoints, and mobile layouts
- **Professional visual design** with modern card-based design, animations, and glass-morphism effects
- **Role distribution system** with interactive cards, responsive layouts, and player name preservation
- **Multi-device infrastructure** with PHP/MySQL backend, RESTful APIs, and game management system
- **Beta feature management** with controlled access to experimental features

### 🔄 In Progress Features
- **Complete game setup flow** with role assignment and secure handoffs
- **Game configuration interface** for customizing game parameters and rules
- **Setup validation and error handling** for proper game initialization
- **WebSocket real-time communication** for multi-device gameplay

### 📋 Planned Features
- **Basic gameplay mechanics** with core Secret Hitler game engine
- **Main game board** with policy tracking, game state, and visual elements
- **Election and voting system** with nomination, ballot functionality, and government formation
- **Policy legislation flow** with drawing, discarding, and enactment mechanics
- **Executive powers** and special abilities implementation
- **Complete game loop** from setup to win conditions with full rule enforcement
- **Game state persistence** and recovery with local storage
- **Advanced game mechanics** and rule enforcement with undo/redo functionality

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
- **Vanilla JavaScript** - No external dependencies for frontend
- **PHP/MySQL Backend** - Complete backend infrastructure for multi-device games
- **SPA Structure** - Single page application with client-side routing
- **Service Worker** - Enables offline functionality and PWA features
- **Local Storage** - Planned for game state persistence
- **Modular design** - Clean separation between routing logic and UI
- **CSS Custom Properties** - Advanced theme system using CSS variables
- **Responsive Design** - Mobile-first approach with comprehensive breakpoints

### Browser Support
- Modern browsers with ES6+ support
- Service Worker support for offline functionality
- Local Storage support for game persistence (planned)
- CSS Custom Properties support for theming
- Touch support for mobile devices

### Performance
- Lightweight frontend implementation (< 100KB total)
- Fast page transitions with SPA routing
- Efficient routing and state management
- Minimal memory footprint
- Optimized mobile experience with touch-friendly controls
- Responsive design with smooth animations and transitions

---

## Known Issues and Bug States

### 🐛 Current Limitations
- **Game engine not implemented** - Core game mechanics are not yet functional
- **Missing game pages** - Main game board, election, and legislation interfaces not yet created
- **No game state persistence** - Local storage implementation is planned but not yet implemented
- **Limited functionality** - Currently only setup and rules pages are fully functional

### ✅ Resolved Issues
- **SPA routing** - Client-side navigation now works correctly with subdirectory hosting support
- **Responsive design** - Layout works correctly on all screen sizes with mobile-first approach
- **Complete PWA functionality** - Service worker, manifest, and offline capabilities properly configured
- **Advanced theme system** - Complete theming with 5 themes, switcher, and persistence
- **Mobile player selection** - Intuitive +/- controls with responsive sizing and touch optimization
- **Touch-friendly interface** - Optimized for mobile devices with large touch targets and responsive breakpoints
- **Professional visual design** - Modern card-based design with animations and glass-morphism effects
- **Role distribution system** - Interactive cards with responsive layouts and player name preservation
- **Multi-device infrastructure** - Backend APIs, database schema, and game management system

---

## Recent Updates (Version 0.1.8.0)

### 🎨 Home Page Visual Overhaul
- **Complete Design Modernization** - Transformed home page from basic layout to modern, engaging interface
- **Enhanced Visual Hierarchy** - Improved typography, spacing, and layout for better user experience
- **Modern Card-Based Design** - Replaced simple feature list with interactive feature cards
- **Professional Button System** - Enhanced buttons with icons, better shadows, and smooth animations

### 🚀 Enhanced Header Design
- **Floating Game Logo** - Added animated game icon (🎭) with backdrop blur effects and floating animation
- **Interactive Decorative Elements** - Subtle lines and pulsing dots that respond to hover interactions
- **Gradient Typography** - Modern text effects with improved font weights and letter spacing
- **Better Visual Balance** - Improved spacing and layout for professional appearance

### 🎯 Improved Welcome Section
- **Enhanced Visual Elements** - Larger welcome icon with bounce animation and drop shadows
- **Better Typography** - Gradient text effects, improved font weights, and better readability
- **Visual Separators** - Subtle decorative lines to separate content sections
- **Improved Spacing** - Better margins and padding for breathing room and visual hierarchy

### 🔘 Modern Button System
- **Icon Integration** - Added relevant emojis to all buttons for better visual communication
- **Size Variants** - Large buttons for primary actions, medium for secondary actions
- **Enhanced Hover Effects** - Scale, shadow, and transform animations with smooth transitions
- **Better Visual Feedback** - Shimmer effects, improved shadows, and professional animations
- **Touch-Friendly Design** - Optimized for both desktop and mobile interactions

### 🎴 Feature Cards Redesign
- **Interactive Card Layout** - Modern rounded corners, multi-layered shadows, and backdrop blur effects
- **Hover Animations** - Scale, rotation, and transform effects with smooth cubic-bezier transitions
- **Better Visual Hierarchy** - Improved spacing, typography, and content organization
- **Enhanced Shadows** - Multi-layered shadows for depth and professional appearance
- **Glass-Morphism Effects** - Modern backdrop blur and transparency effects

---

## Contributing

This is a personal project in active development. The project has successfully completed Phase 1 (Foundation) with advanced SPA routing, professional UI design, complete theming system, and mobile optimization. We are currently in Phase 2 implementing the complete game builder and setup system. Contributions for the setup system, role management, game configuration, and setup user experience would be particularly valuable.

**Current Focus Areas:**
- Game setup flow and role assignment system
- Game configuration interface and customization
- Setup validation and error handling
- Setup state management and persistence
- Setup user experience and accessibility
- WebSocket real-time communication implementation

**Recent Achievements:**
- Complete home page visual overhaul with modern design
- Advanced mobile optimization and responsive design
- Professional theme system with 5 themes
- Multi-device backend infrastructure
- Interactive role distribution system
- Comprehensive rules page with 6 tabs

---

## License

This project is for educational and personal use. Secret Hitler is a trademark of its respective owners.
