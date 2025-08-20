# Secret Hitler - Gameplay Setup Guide

## Overview

This Secret Hitler implementation provides a complete, playable version of the popular social deduction game with both pass-and-play and multi-device capabilities. The game includes all core mechanics, executive powers, and a comprehensive game flow system.

## Game Features

### ✅ **Complete Game Engine**
- **Role Assignment**: Automatic distribution of Liberal, Fascist, and Hitler roles
- **Policy Management**: 6 Liberal + 11 Fascist policy cards with stack-based system
- **Election System**: Presidential elections with voting mechanics
- **Legislation Phases**: Policy enactment through President and Chancellor
- **Executive Powers**: Special abilities unlocked at 3+ Fascist policies
- **Win Conditions**: Liberal (5 policies) vs Fascist (6 policies) victory tracking

### ✅ **Game Phases**
1. **Election**: President chooses Chancellor
2. **Legislation**: President selects policy stack
3. **President Discard**: President discards one policy card
4. **Chancellor Choose**: Chancellor enacts remaining policy
5. **Executive**: Special powers (if unlocked)

### ✅ **Executive Powers**
- **3 Fascist Policies**: Investigate Loyalty
- **4 Fascist Policies**: Special Election
- **5 Fascist Policies**: Policy Peek

## How to Play

### 1. **Start a Game**
- Navigate to the home page
- Click "Create Game" for multi-device play
- Click "Try Demo" to experience gameplay mechanics
- Click "Pass & Play Game" for single-device play (BETA)

### 2. **Game Setup**
- Select player count (5-10 players)
- Enter player names
- Roles are automatically assigned
- Policy deck is shuffled and organized into stacks

### 3. **Game Flow**
- **Turn Structure**: Each turn follows the complete phase cycle
- **President Rotation**: Presidency passes to next player each turn
- **Election Tracker**: Failed elections increment tracker (3 failures = auto-policy)
- **Policy Stacks**: Cards organized in groups of 3 for strategic choice

### 4. **Strategic Elements**
- **Chancellor Selection**: Cannot choose same person twice in a row
- **Policy Stack Choice**: President must select from available stacks
- **Discard Strategy**: President discards one card, Chancellor enacts another
- **Executive Timing**: Powers can be used strategically during executive phase

## Game Mechanics

### **Voting System**
- All players vote Ja (Yes) or Nein (No) on elections
- Majority determines election success/failure
- Failed elections increment election tracker

### **Policy Enactment**
- President selects policy stack
- President discards one card
- Chancellor enacts one of remaining cards
- Policy effects immediately applied

### **Win Conditions**
- **Liberal Victory**: Enact 5 Liberal policies
- **Fascist Victory**: Enact 6 Fascist policies
- **Hitler Execution**: (Implemented in executive phase)

### **Election Tracker**
- Tracks consecutive failed elections
- At 3 failures, top policy automatically enacted
- Resets after successful election or auto-enactment

## User Interface

### **Game Board**
- **Policy Tracks**: Visual representation of enacted policies
- **Election Tracker**: Shows current failure count
- **Phase Display**: Current game phase and turn number
- **Game Log**: Timestamped record of all game events

### **Action Buttons**
- **Phase-Specific Actions**: Buttons change based on current game state
- **Player Selection**: Interactive buttons for all player choices
- **Policy Management**: Clear options for stack and card selection
- **Executive Powers**: Special ability buttons when available

### **Responsive Design**
- **Mobile Optimized**: Touch-friendly interface for all devices
- **Adaptive Layout**: Automatically adjusts to screen size
- **Accessibility**: Clear visual indicators and readable text

## Demo Mode

The demo page (`demo.html`) provides an interactive way to experience all game mechanics:

- **Phase Progression**: Click "Next Phase" to advance through game phases
- **Interactive Elements**: All buttons and game elements are functional
- **Visual Feedback**: See how the game board updates with each action
- **Game Log**: Watch the complete game history build in real-time
- **Reset Function**: Start over anytime to explore different scenarios

## Technical Implementation

### **Game Engine**
- **State Management**: Comprehensive game state tracking
- **Event System**: Logged game events with timestamps
- **Validation**: Input validation and game rule enforcement
- **Responsiveness**: Real-time UI updates based on game state

### **Data Structure**
- **Player Management**: Player names, roles, and turn order
- **Policy System**: Deck, stacks, and discard pile management
- **Game History**: Complete log of all game actions and phases
- **Configuration**: Player count-based role distribution

### **User Experience**
- **Intuitive Flow**: Clear progression through game phases
- **Visual Feedback**: Immediate response to all user actions
- **Error Prevention**: Validation prevents invalid game states
- **Accessibility**: Clear labeling and consistent interface patterns

## Getting Started

### **Quick Start**
1. Open `index.html` in your browser
2. Click "Try Demo" to experience gameplay
3. Use "Next Phase" button to progress through game
4. Explore all game mechanics and phases

### **Full Game Setup**
1. Click "Create Game" for multi-device play
2. Select player count and enter names
3. Share game ID with other players
4. Start game when all players join

### **Pass & Play**
1. Click "Pass & Play Game" (BETA)
2. Set up player count and names
3. Pass device between players during gameplay
4. Follow on-screen instructions for each phase

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Support**: iOS Safari, Chrome Mobile
- **Progressive Web App**: Installable on supported devices
- **Offline Capable**: Works without internet connection

## Future Enhancements

- **Role Reveal System**: Secure role viewing for players
- **Advanced Executive Powers**: Full implementation of all special abilities
- **Game Statistics**: Win rates, player performance tracking
- **Custom Rules**: Configurable game variants and house rules
- **AI Opponents**: Computer-controlled players for solo play

## Support

For questions or issues:
- Check the demo page for gameplay examples
- Review the game rules for clarification
- Examine the browser console for technical details
- Refer to the source code for implementation specifics

---

**Enjoy playing Secret Hitler!** 🎭🎮
