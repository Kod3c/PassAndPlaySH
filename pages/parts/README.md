# Secret Hitler Play Page - Modular Structure

This directory contains the segmented components of the original `play.html` file, organized for better maintainability and code organization.

## File Structure

### Core Files
- **`play-main.html`** - Main HTML structure with game board, player strips, and basic layout
- **`play-styles.css`** - All CSS styles for the play page (already existed)
- **`play-core.js`** - Core game logic, state management, and Firebase integration

### Feature Modules
- **`play-phases.js`** - Phase-specific logic (nomination, voting, policy drawing, etc.)
- **`play-cards.js`** - Policy card management, table spread, and discard pile
- **`play-interactions.js`** - User interactions, voting, nomination, and game actions
- **`play-modals.js`** - All modal functionality (role overlay, rules, history, order, menu)
- **`play-utils.js`** - Helper functions, deck management, and utility functions
- **`play-repair.js`** - Game repair functionality and manual repair tools

### Components
- **`play-components.html`** - All modal HTML structures and overlays

## How It Works

1. **`play-main.html`** loads the basic structure and imports `play-core.js`
2. **`play-core.js`** imports all the feature modules
3. **`play-components.html`** is dynamically loaded to provide modal structures
4. Each module exports its functions to the global scope for cross-module communication

## Benefits of This Structure

- **Maintainability**: Each file has a single responsibility
- **Readability**: Easier to find and modify specific features
- **Debugging**: Issues can be isolated to specific modules
- **Collaboration**: Multiple developers can work on different modules simultaneously
- **Testing**: Individual modules can be tested in isolation

## Module Dependencies

```
play-core.js
├── play-phases.js
├── play-cards.js
├── play-interactions.js
├── play-modals.js
├── play-utils.js
└── play-repair.js
```

## Usage

To use this modular structure:

1. Ensure all files are in the `pages/parts/` directory
2. Access the game through `play-main.html`
3. All functionality should work exactly as before
4. No data loss or feature degradation

## Migration Notes

- All original functionality has been preserved
- Global variables and functions are maintained for compatibility
- Event listeners are properly distributed across modules
- Firebase integration remains intact
- Responsive design and mobile support unchanged

## Future Improvements

- Consider using ES6 modules with proper import/export
- Implement proper dependency injection
- Add unit tests for individual modules
- Create a build process for production optimization
