# Secret Hitler Pass‑and‑Play PWA

**Purpose**: Build a few‑page, pass‑and‑play web app that digitally runs a game of Secret Hitler on one device, handling hidden roles, elections, policy legislation, and executive powers with strong privacy UX.

**Scope**: One device, offline‑capable, no accounts/servers, no networking. Clean, dependency‑free HTML/CSS/JS across a small number of focused pages where needed.

**Current Version**: 0.2.8.3 (2024-12-19)

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
- **Multi-Device Infrastructure**: Complete backend with PHP/MySQL, RESTful APIs, and game management

### Phase 2: Game Builder & Setup System ✅ COMPLETED
**Goal**: Complete the game setup and configuration system to enable proper game initialization

#### ✅ Phase 2 Achievements:
- **Complete Game Setup Flow** - Role assignment system with secure distribution and player handoffs
- **Game Configuration Interface** - Game parameter customization, setup preferences, and validation
- **Setup System Architecture** - Robust setup state management, persistence, and error handling
- **User Experience & Polish** - Enhanced setup flow with progress indicators and accessibility features
- **Multi-Device Game System** - Complete backend infrastructure for creating and joining games

#### 🎯 Current Focus Areas:
- **WebSocket Real-Time Communication** - Implementing live game synchronization between devices
- **Game Engine Integration** - Porting existing game logic to backend for multi-device support
- **Advanced Game Mechanics** - Complete multiplayer game experience with real-time updates

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
│   └── play.html  # Multi-device game creation and joining
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
- **Complete game setup flow** with role assignment and secure handoffs
- **Game configuration interface** for customizing game parameters and rules
- **Setup validation and error handling** for proper game initialization
- **Join game page** with modern design and enhanced user experience
- **Enhanced rules page** with complete visual modernization and improved navigation

### 🔄 In Progress Features
- **WebSocket real-time communication** for multi-device gameplay
- **Game engine integration** with backend for multiplayer support
- **Advanced game mechanics** and rule enforcement

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

## Recent Updates (Version 0.2.8.3)

### 🎨 Join Game Page Design Overhaul
- **Complete Visual Modernization** - Transformed join game page with enhanced header design and modern form styling
- **Enhanced Header Design** - Added floating welcome icon with bounce animation and decorative elements
- **Modern Form Design** - Redesigned form inputs with enhanced styling, visual feedback, and icon integration
- **Improved Typography** - Applied gradient text effects and enhanced font weights throughout
- **Enhanced Join Game Section** - Added animated decorative lines and dots matching other pages
- **Form Enhancement** - Modernized form groups with icon integration and hover effects
- **Input Styling** - Enhanced input fields with gradient borders and focus animations
- **Select Dropdown** - Improved select dropdown with custom arrow and focus effects

### 🎯 Enhanced Game Information Form
- **Label Icons** - Added contextual icons (🎮 for Game ID, 👤 for Player Name)
- **Input Wrappers** - Enhanced input containers with decorative elements
- **Focus Effects** - Smooth focus transitions with gradient borders and shadows
- **Form Help** - Improved help text styling with hover color transitions

### 🏠 Enhanced Game Lobby Section
- **Game Info Card** - Redesigned game information display with modern card styling
- **Game ID Display** - Enhanced Game ID presentation with decorative elements
- **Player Container** - Modernized players list with enhanced styling and hover effects
- **Visual Hierarchy** - Improved spacing and typography for better readability

### 🎨 Visual Enhancements
- **Modern Card Design** - Applied consistent card styling with rounded corners and shadows
- **Smooth Animations** - Added cubic-bezier transitions and hover effects
- **Color Consistency** - Used CSS custom properties for consistent theming
- **Glass-morphism Effects** - Applied backdrop-filter and modern visual effects

### 📱 Responsive Design Improvements
- **Mobile-First Approach** - Optimized layout for all screen sizes
- **Touch-Friendly Elements** - Ensured proper spacing and sizing for mobile devices
- **Adaptive Forms** - Responsive form elements that adapt to screen size
- **Flexible Layouts** - Responsive containers that stack appropriately

### 🌟 User Experience Benefits
- **Professional Appearance** - Modern, polished design that matches other enhanced pages
- **Better Form Interaction** - Improved input focus states and visual feedback
- **Enhanced Navigation** - Clearer visual hierarchy and easier content discovery
- **Engaging Interactions** - Smooth animations and visual feedback throughout

### 📁 Files Modified
- **`pages/play.html`** - Enhanced join game page structure and styling
- **`changelog.md`** - Added documentation for join game page improvements

### 🎨 Design Consistency
- **Visual Harmony** - Maintains consistent design language with home page, create game page, and rules page
- **Component Reuse** - Applied same design patterns and styling approaches
- **Theme Integration** - Seamlessly integrated with existing color scheme and design system

---

## Recent Updates (Version 0.2.8.2)

### 🎨 Rules Page Design Overhaul
- **Complete Visual Modernization** - Transformed rules page with enhanced header design and modern navigation
- **Enhanced Header Design** - Added floating rules icon with bounce animation and decorative elements
- **Modern Navigation** - Redesigned navigation buttons with icons and enhanced hover effects
- **Improved Typography** - Applied gradient text effects and enhanced font weights throughout

### 🎯 Enhanced Section Headers
- **Icon Integration** - Added animated section icons with hover effects
- **Visual Hierarchy** - Improved spacing and typography for better readability
- **Gradient Accents** - Added subtle gradient lines and decorative elements

### 🔘 Enhanced Overview Section
- **Modern Card Design** - Redesigned overview cards with shimmer effects and hover animations
- **Improved Icons** - Enhanced card icons with drop shadows and scale effects
- **Better Layout** - Improved grid system and responsive behavior

### ⚙️ Enhanced Setup Section
- **Step-by-Step Design** - Modernized setup steps with gradient borders and hover effects
- **Visual Elements** - Enhanced role distribution and policy deck visuals
- **Interactive Elements** - Added hover animations and improved visual feedback

### 🔄 Enhanced Gameplay Section
- **Flow Visualization** - Improved game flow steps with better spacing and animations
- **Voting Example** - Redesigned voting cards with modern styling and hover effects
- **Visual Hierarchy** - Better organization of gameplay information

### 🎭 Enhanced Roles Section
- **Role Cards** - Modernized role cards with enhanced headers and content layout
- **Visual Indicators** - Added icons and improved typography for better readability
- **Hover Effects** - Smooth animations and visual feedback on interaction

### ⚡ Enhanced Special Powers Section
- **Power Cards** - Redesigned power cards with modern styling and animations
- **Visual Elements** - Enhanced power visuals with better spacing and effects
- **Usage Tips** - Improved layout and styling for power usage information

### 🏆 Enhanced Winning Section
- **Win Conditions** - Modernized win condition cards with gradient borders and hover effects
- **Visual Elements** - Enhanced track visualization and win way indicators
- **End Game Notes** - Improved styling and layout for end game considerations

### 🌟 User Experience Benefits
- **Professional Appearance** - Modern, polished design that matches home page aesthetic
- **Better Readability** - Improved typography and visual hierarchy
- **Enhanced Navigation** - Clearer section organization and easier content discovery
- **Engaging Interactions** - Smooth animations and visual feedback

---

## Recent Updates (Version 0.2.8.1)

### 🐛 Button Click Event Fix
- **Fixed Text/Icon Click Issues** - Resolved problem where clicking on button text or icons didn't trigger navigation
- **Enhanced Event Delegation** - Improved JavaScript event handling to properly detect clicks on all button elements
- **CSS Layer Fix** - Fixed z-index issues with pseudo-elements that were blocking click events
- **Better User Experience** - Users can now click anywhere on buttons (text, icons, or background) to navigate

### 🔧 Technical Improvements
- **Event Delegation Enhancement** - Added fallback parent element traversal for better click detection
- **CSS Optimization** - Fixed pseudo-element layering that was interfering with pointer events
- **Robust Click Handling** - Improved reliability of navigation events across all button elements

---

## Recent Updates (Version 0.1.8.1)

### 🎨 Create Game Page Design Overhaul
- **Complete Visual Modernization** - Transformed create game page to match home page design aesthetic
- **Enhanced Visual Hierarchy** - Improved typography, spacing, and layout for better user experience
- **Modern Card-Based Design** - Replaced basic sections with interactive enhanced sections
- **Professional Button System** - Enhanced buttons with icons, better shadows, and smooth animations

### 🚀 Enhanced Header Design
- **Floating Game Logo** - Added animated game icon (🎭) with backdrop blur effects and floating animation
- **Interactive Decorative Elements** - Subtle lines and pulsing dots that respond to hover interactions
- **Gradient Typography** - Modern text effects with improved font weights and letter spacing
- **Better Visual Balance** - Improved spacing and layout for professional appearance

### 🎯 Modern Section Headers
- **Icon Integration** - Added relevant emojis (👥 for Player Count, ✏️ for Player Names, 🏠 for Game Lobby)
- **Enhanced Typography** - Better font weights, colors, and spacing for improved readability
- **Visual Separators** - Subtle borders and hover effects for better section distinction
- **Interactive Elements** - Icons that respond to hover with color changes and scaling

### 🔘 Enhanced Player Count Selector
- **Modern Button Design** - Larger, more touch-friendly buttons with icons (➖/➕)
- **Better Visual Feedback** - Hover animations, shadows, shimmer effects, and smooth transitions
- **Improved Display** - Better typography and spacing for the player count display
- **Range Information** - Added "Range: 5-10 players" text for user clarity
- **Enhanced Interactions** - Smooth cubic-bezier transitions and hover states

### ✏️ Enhanced Player Input Fields
- **Card-Based Layout** - Each player input now in a modern card with hover effects and shadows
- **Better Spacing** - Improved padding and margins for better readability and touch interaction
- **Interactive Elements** - Hover animations, focus states, and smooth transitions
- **Professional Appearance** - Consistent with the overall design language and theme system

### 🎴 Modern Button System
- **Icon Integration** - Added relevant emojis (🚀 for Create Game, 🎯 for Join Game, 🚪 for Leave Game)
- **Size Variants** - Large buttons for primary actions, medium for secondary actions
- **Enhanced Hover Effects** - Scale, shadow, and transform animations with smooth transitions
- **Better Visual Hierarchy** - Clear distinction between primary and secondary actions
- **Touch-Friendly Design** - Optimized for both desktop and mobile interactions

### 🏠 Enhanced Game Lobby
- **Modern Header** - Added icon (🏠) and descriptive text for better context
- **Better Game Info Display** - Enhanced Game ID display with improved typography and spacing
- **Improved Player List** - Better spacing, hover effects, and visual hierarchy for player items
- **Enhanced Buttons** - Consistent button styling with icons and modern hover effects

### ✨ Visual Enhancements
- **Modern Card Design** - Rounded corners, multi-layered shadows, and hover effects
- **Gradient Accents** - Subtle gradient lines and text effects for visual interest
- **Smooth Animations** - Cubic-bezier transitions for polished, professional feel
- **Backdrop Filters** - Modern blur effects for glass-morphism design language
- **Interactive Elements** - Rich hover states with scale, shadow, and transform effects

### 📱 Responsive Design Improvements
- **Mobile-First Approach** - Optimized for all screen sizes with proper breakpoints
- **Touch-Friendly Interface** - Better button sizes and spacing for mobile devices
- **Adaptive Layout** - Elements adjust gracefully to different screen sizes
- **Performance Optimized** - Smooth animations that work efficiently on mobile devices
- **Enhanced Mobile Experience** - Improved touch interactions and visual feedback

### 🔧 Technical Improvements
- **CSS Custom Properties** - Consistent use of theme variables for maintainability
- **Modern CSS Features** - Backdrop filters, transforms, animations, and transitions
- **Performance Optimization** - Optimized transitions and hover effects for smooth performance
- **Accessibility Enhancements** - Better contrast, larger touch targets, and improved readability
- **Code Organization** - Better structured CSS with logical grouping and responsive design

### 🌟 User Experience Benefits
- **Professional Appearance** - Modern, polished interface that builds user confidence
- **Better Engagement** - Interactive elements and smooth animations increase user engagement
- **Improved Navigation** - Clear visual hierarchy and better button design improve usability
- **Consistent Design Language** - Matches the home page aesthetic for brand consistency
- **Mobile Excellence** - Optimized experience across all devices and screen sizes
- **Enhanced Setup Flow** - More intuitive and enjoyable game creation process

### 📁 Files Modified
- `pages/play.html` - Complete design overhaul with modern styling, enhanced sections, and improved user interface

### 🧪 Design Consistency
- **Visual Harmony** - Create game page now matches home page design aesthetic
- **Interactive Elements** - Consistent hover effects, animations, and visual feedback
- **Typography System** - Unified font weights, sizes, and color schemes
- **Component Library** - Reusable design patterns across all pages
- **Theme Integration** - Enhanced sections work seamlessly with all available themes

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

### 📱 Game Info Section
- **Info Cards Layout** - Horizontal layout with icons and descriptions for key game information
- **Interactive Elements** - Hover animations with smooth transitions and visual feedback
- **Better Organization** - Clear presentation of player count, duration, and game type
- **Visual Enhancements** - Subtle borders, shadows, and backdrop blur effects

### ✨ Overall Visual Improvements
- **Background Patterns** - Subtle radial gradients for depth and visual interest
- **Advanced Shadows** - Multi-layered shadows throughout for professional depth
- **Smooth Animations** - Cubic-bezier transitions for polished, professional feel
- **Backdrop Filters** - Modern blur effects for glass-morphism design language
- **Enhanced Responsiveness** - Optimized for all screen sizes with mobile-first approach

### 🎭 Interactive Elements
- **Hover States** - Rich hover interactions with scale, shadow, and transform effects
- **Animation Pausing** - Interactive elements pause animations on hover for better control
- **Visual Feedback** - Immediate response to user interactions with smooth transitions
- **Enhanced Accessibility** - Better contrast, larger touch targets, and improved readability

### 📱 Mobile Optimizations
- **Touch-Friendly Interface** - Better button sizes and spacing for mobile devices
- **Performance Optimized** - Smooth animations optimized for mobile performance
- **Responsive Layout** - Graceful adaptation to small screens with proper breakpoints
- **Touch Interactions** - Improved hover states and touch feedback for mobile users

### 🎨 Enhanced Footer
- **Modern Design** - Glass-morphism effect with backdrop blur and subtle borders
- **Better Spacing** - Improved margins and padding for visual balance
- **Visual Elements** - Subtle borders and gradients for professional appearance
- **Responsive Design** - Adapts gracefully to different screen sizes

### 📁 Files Modified
- `index.html` - Complete home page structure overhaul with modern layout and content
- `styles/main.css` - Comprehensive CSS modernization with animations, effects, and responsive design

### 🌟 User Experience Benefits
- **Professional Appearance** - Modern, polished interface that builds user confidence
- **Better Engagement** - Interactive elements and smooth animations increase user engagement
- **Improved Navigation** - Clear visual hierarchy and better button design improve usability
- **Mobile Excellence** - Optimized experience across all devices and screen sizes
- **Visual Appeal** - Engaging design that encourages exploration and interaction

### 🧪 Technical Improvements
- **CSS Animations** - Smooth transitions and transforms using modern CSS properties
- **Backdrop Filters** - Modern blur effects for glass-morphism design
- **Responsive Design** - Mobile-first approach with proper breakpoints
- **Performance** - Optimized animations and effects for smooth performance
- **Accessibility** - Better contrast, larger touch targets, and improved readability

---

## Contributing

This is a personal project in active development. The project has successfully completed Phase 1 (Foundation) and Phase 2 (Game Builder & Setup System) with advanced SPA routing, professional UI design, complete theming system, mobile optimization, and comprehensive multi-device backend infrastructure. We are currently implementing WebSocket real-time communication and advanced game mechanics for the complete multiplayer experience.

**Current Focus Areas:**
- WebSocket real-time communication implementation
- Game engine integration with backend for multiplayer support
- Advanced game mechanics and rule enforcement
- Complete multiplayer game experience with real-time updates

**Recent Achievements:**
- Complete join game page design overhaul with modern interface
- Enhanced rules page with complete visual modernization
- Button click event fixes and improved user experience
- Create game page design overhaul with professional styling
- Home page visual overhaul with modern design system
- Advanced mobile optimization and responsive design
- Professional theme system with 5 themes
- Multi-device backend infrastructure with PHP/MySQL
- Interactive role distribution system
- Comprehensive rules page with 6 tabs

---

## License

This project is for educational and personal use. Secret Hitler is a trademark of its respective owners.
