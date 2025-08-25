# Issue: Implement Superpowers for Policy Track Tiles

## Current State
The game currently has a basic policy track system where:
- Liberal policies advance on a 5-space track
- Fascist policies advance on a 6-space track  
- Executive powers are unlocked at specific fascist policy counts (3, 4, 5)
- Track spaces are rendered with basic CSS classes (`filled`, `win`, `power`)

## Proposed Enhancement: Tile-Based Superpowers

### 1. **Superpower Tile System**
Instead of just unlocking executive powers at policy thresholds, each individual tile on the policy tracks should grant specific superpowers when activated.

### 2. **Implementation Approach**

#### A. Enhanced Tile Data Structure
```javascript
// Replace simple track spaces with rich tile objects
this.policyTracks = {
    liberal: [
        { position: 1, power: null, activated: false },
        { position: 2, power: 'investigate_liberal', activated: false },
        { position: 3, power: 'policy_peek_liberal', activated: false },
        { position: 4, power: 'special_election_liberal', activated: false },
        { position: 5, power: 'liberal_victory', activated: false }
    ],
    fascist: [
        { position: 1, power: null, activated: false },
        { position: 2, power: null, activated: false },
        { position: 3, power: 'investigate', activated: false },
        { position: 4, power: 'special_election', activated: false },
        { position: 5, power: 'policy_peek', activated: false },
        { position: 6, power: 'fascist_victory', activated: false }
    ]
};
```

#### B. Superpower Activation Logic
```javascript
enactPolicy(policy) {
    if (policy === 'liberal') {
        this.liberalPolicies++;
        // Activate tile superpower
        this.activateTileSuperpower('liberal', this.liberalPolicies - 1);
    } else {
        this.fascistPolicies++;
        // Activate tile superpower
        this.activateTileSuperpower('fascist', this.fascistPolicies - 1);
    }
}

activateTileSuperpower(trackType, position) {
    const track = this.policyTracks[trackType];
    if (track[position] && track[position].power) {
        track[position].activated = true;
        this.grantSuperpower(track[position].power);
        this.logGameEvent('superpower', `${trackType} tile ${position + 1} activated: ${track[position].power}`);
    }
}
```

#### C. Enhanced Superpower System
```javascript
grantSuperpower(powerType) {
    switch (powerType) {
        case 'investigate':
            this.executivePowers.push('investigate');
            break;
        case 'special_election':
            this.executivePowers.push('special_election');
            break;
        case 'policy_peek':
            this.executivePowers.push('policy_peek');
            break;
        case 'investigate_liberal':
            this.executivePowers.push('investigate_liberal'); // Liberal-specific version
            break;
        case 'policy_peek_liberal':
            this.executivePowers.push('policy_peek_liberal');
            break;
        // Add more unique superpowers
    }
}
```

### 3. **Visual Enhancements**

#### A. Dynamic Tile Rendering
```javascript
getTrackSpaces(current, max, type) {
    let spaces = '';
    const track = this.policyTracks[type];
    
    for (let i = 0; i < max; i++) {
        const tile = track[i];
        const filled = i < current;
        const isWin = i === max - 1;
        const hasPower = tile.power !== null;
        const isActivated = tile.activated;
        
        let classes = 'track-space';
        if (filled) classes += ' filled';
        if (isWin) classes += ' win';
        if (hasPower) classes += ' power';
        if (isActivated) classes += ' activated';
        if (tile.power) classes += ` power-${tile.power.replace(/_/g, '-')}`;
        
        const powerIcon = hasPower ? this.getPowerIcon(tile.power) : '';
        spaces += `<span class="${classes}" title="${tile.power || 'No power'}">${i + 1}${powerIcon}</span>`;
    }
    return spaces;
}
```

#### B. CSS Styling for Superpower Tiles
```css
.track-space.power {
    position: relative;
    border: 2px solid #gold;
    background: linear-gradient(45deg, var(--track-color), #gold);
}

.track-space.power.activated {
    animation: powerPulse 2s infinite;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
}

.track-space.power-investigate::before {
    content: "🔍";
    position: absolute;
    top: -10px;
    right: -10px;
    font-size: 12px;
}

@keyframes powerPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}
```

### 4. **Benefits of This Approach**

1. **Immediate Feedback**: Players see exactly which tile grants which power
2. **Strategic Depth**: Players can plan around specific tile activations
3. **Visual Appeal**: Enhanced board with dynamic, animated tiles
4. **Modular Design**: Easy to add new superpowers to specific tiles
5. **Balance Control**: Fine-tune power distribution across the track

### 5. **Implementation Priority**

1. **Phase 1**: Implement basic tile data structure and activation logic
2. **Phase 2**: Add visual enhancements and power icons
3. **Phase 3**: Implement liberal-specific superpowers
4. **Phase 4**: Add animation and polish

## Summary
This system would transform the static policy tracks into dynamic, engaging game elements that provide immediate visual and mechanical feedback when policies are enacted. Each tile becomes a meaningful milestone that grants specific abilities, making the game more strategic and visually appealing.

## Files to Modify
- `js/app.js` - Main game logic and tile system
- `styles/app.css` - Visual styling for superpower tiles
- Potentially create new utility files for power management

## Estimated Effort
- **Development**: 2-3 days
- **Testing**: 1-2 days
- **Polish**: 1 day
