# Issue: Dark Mode Support is Incomplete and Broken

## **Problem Description**
The Secret Hitler website currently has severely limited and broken dark mode support that makes the site nearly unusable when users have dark mode enabled on their devices. While there is a basic `@media (prefers-color-scheme: dark)` query in the CSS, it only covers a tiny fraction of the necessary elements and creates a jarring, inconsistent user experience.

## **Current Issues**

### 1. **Incomplete Dark Mode Coverage**
The existing dark mode styles only target:
- Basic background colors (`--bg-primary`, `--bg-secondary`, `--bg-card`)
- Text colors (`--text-primary`, `--text-secondary`, `--text-muted`)
- A few form elements and cards
- Header background

### 2. **Missing Critical Elements**
The dark mode styles completely ignore:
- Body background (still shows light beige)
- Most buttons and interactive elements
- Feature cards and game sections
- Footer elements
- Status messages and notifications
- Form labels and help text
- Decorative elements and borders

### 3. **Visual Inconsistencies**
Users see a mix of:
- Dark backgrounds on some elements
- Light backgrounds on others
- Light text on light backgrounds (unreadable)
- Dark text on dark backgrounds (unreadable)
- Inconsistent border colors

### 4. **Accessibility Problems**
The incomplete dark mode creates:
- Poor contrast ratios
- Unreadable text
- Confusing visual hierarchy
- Eye strain for dark mode users

## **Why This Happens**
The current CSS uses a light-first approach with hardcoded colors throughout, and the dark mode media query only overrides a handful of CSS custom properties. The vast majority of elements still use the light theme colors, creating a broken hybrid appearance.

## **How to Fix It**

### **Immediate Solution (Quick Fix)**
1. **Complete the CSS Variable Overrides**: Extend the dark mode media query to override ALL color-related CSS custom properties
2. **Add Missing Element Styles**: Ensure every component has proper dark mode styling
3. **Fix Contrast Issues**: Ensure all text has proper contrast against backgrounds

### **Proper Solution (Recommended)**
1. **Refactor CSS Architecture**: 
   - Move all colors to CSS custom properties
   - Create comprehensive light and dark theme variable sets
   - Use semantic color names instead of hardcoded values

2. **Implement Theme Switching**:
   - Add a manual theme toggle button
   - Respect user's system preference by default
   - Store user's choice in localStorage

3. **Comprehensive Dark Theme**:
   - Dark backgrounds for all containers
   - Light text with proper contrast
   - Adjusted shadows and borders for dark mode
   - Maintain the 1930s propaganda aesthetic in dark colors

4. **Testing and Validation**:
   - Test on various devices and browsers
   - Validate contrast ratios meet WCAG guidelines
   - Ensure all interactive elements remain visible

## **Priority**
This should be considered a **high priority** issue as it affects:
- User experience and accessibility
- Site usability for a significant portion of users
- Professional appearance and credibility
- Mobile device compatibility (many mobile users prefer dark mode)

## **Estimated Effort**
- **Quick Fix**: 2-4 hours to complete the existing dark mode styles
- **Proper Solution**: 1-2 days to refactor the CSS architecture and implement comprehensive theming

## **Current State**
✅ **RESOLVED** - Comprehensive dark mode support has been implemented with the following improvements:

### **Completed Changes:**
1. **Complete CSS Variable System**: Added comprehensive dark theme variables and semantic color naming
2. **Enhanced Dark Mode Media Query**: Complete overhaul of `@media (prefers-color-scheme: dark)` with full coverage
3. **Manual Theme Toggle**: Added theme toggle button to all pages with localStorage persistence
4. **Theme Management JavaScript**: Created `js/theme.js` for theme switching functionality
5. **Comprehensive Component Coverage**: Dark mode styles for all UI elements including:
   - Body and background elements
   - Typography and text
   - Buttons and interactive elements
   - Cards and containers
   - Form elements and inputs
   - Header and navigation
   - Footer elements
   - Status messages and notifications
   - Game-specific components (boards, policy cards, player cards)
   - Modal and overlay elements
   - Tables and lists
   - Badges and labels
   - Progress and loading elements
   - Tooltips and popovers

### **Accessibility Improvements:**
- Proper contrast ratios meeting WCAG AA standards
- Visible focus indicators for all interactive elements
- Color-independent information conveyance
- Smooth transitions for theme switching

### **Design Preservation:**
- Maintained 1930s propaganda poster aesthetic in dark mode
- Preserved color symbolism (Liberal blue, Fascist red)
- Adjusted shadows and borders for dark backgrounds
- Updated paper texture overlay for dark mode

### **Technical Implementation:**
- System preference detection with manual override
- localStorage persistence for user preferences
- Cross-browser compatibility
- Mobile-responsive dark mode support
- Game-specific dark mode styles in `play-styles.css`

The dark mode experience is now professional, consistent, and fully functional across all pages and components.

## **Files Affected**
- `styles/app.css` - Main stylesheet with incomplete dark mode support
- All HTML files that use the current CSS classes
- Potentially JavaScript files if implementing theme switching

## **Notes**
- The site has a strong 1930s European propaganda poster aesthetic that should be preserved in dark mode
- Many mobile users prefer dark mode for battery life and eye comfort
- This affects all pages of the application, not just the home page
