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
The current state makes the site look unprofessional and difficult to use for dark mode users, which is a significant UX problem that should be addressed promptly.

## **Files Affected**
- `styles/app.css` - Main stylesheet with incomplete dark mode support
- All HTML files that use the current CSS classes
- Potentially JavaScript files if implementing theme switching

## **Notes**
- The site has a strong 1930s European propaganda poster aesthetic that should be preserved in dark mode
- Many mobile users prefer dark mode for battery life and eye comfort
- This affects all pages of the application, not just the home page
