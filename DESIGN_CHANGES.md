# Secret Hitler App - Design System Update

## Overview
The Secret Hitler app has been completely redesigned with a modern, clean, mobile-first approach. All styling has been consolidated into a single, comprehensive stylesheet (`app.css`) that provides consistent design across all pages.

## Key Changes

### 1. **Single Unified Stylesheet**
- Created `/styles/app.css` as the single source of truth for all styling
- Removed dependencies on multiple CSS files (themes.css, main.css)
- Eliminated all inline styles from HTML files

### 2. **Modern Design System**
The new design system features:

#### **Color Palette**
- Primary: `#FF5722` (Material Design Deep Orange)
- Secondary: `#607D8B` (Blue Grey)
- Accent: `#2196F3` (Blue)
- Clean neutrals from white to dark grey
- Semantic colors for success, warning, danger, and info states

#### **Typography**
- System font stack for optimal readability across all devices
- Consistent type scale from `0.75rem` to `2.5rem`
- Clear hierarchy with font weights and sizes

#### **Spacing System**
- Consistent spacing scale: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`
- Predictable padding and margins throughout

#### **Components**
- **Cards**: Clean white cards with subtle shadows and hover effects
- **Buttons**: Multiple variants (primary, secondary, outline, ghost) with consistent styling
- **Forms**: Clean input fields with focus states and helpful text
- **Grid System**: Flexible grid with responsive columns

### 3. **Mobile-First Responsive Design**
- Base styles designed for mobile devices
- Progressive enhancement for tablets (768px+) and desktops (1024px+)
- Touch-friendly targets with appropriate sizing
- Optimized layouts that stack on mobile and expand on larger screens

### 4. **Clean, Minimalist Aesthetic**
- Removed complex gradients and heavy shadows
- Flat design with subtle depth through careful use of shadows
- White backgrounds with light grey accents
- Clear visual hierarchy through typography and spacing

### 5. **Improved User Experience**
- Sticky header for easy navigation
- Smooth transitions and micro-animations
- Clear hover states and interactive feedback
- Accessible focus states for keyboard navigation

### 6. **Dark Mode Support**
- Automatic dark mode based on system preferences
- Carefully adjusted colors for dark backgrounds
- Maintained readability and contrast in dark mode

### 7. **Accessibility Features**
- Screen reader only class for hidden content
- Focus visible states for keyboard navigation
- High contrast mode support
- Semantic HTML structure

## File Structure

```
/workspace/
├── styles/
│   ├── app.css          # Main unified stylesheet
│   ├── main.css         # (deprecated - kept for reference)
│   └── themes.css       # (deprecated - kept for reference)
├── pages/
│   └── play.html        # Updated to use app.css
└── index.html           # Updated to use app.css
```

## Updated Pages

### index.html
- Simplified structure with semantic HTML
- Removed theme switcher (now automatic based on system preference)
- Clean card-based layout for features
- Improved button hierarchy

### play.html
- Removed 600+ lines of inline CSS
- Clean form layouts with proper spacing
- Mobile-friendly player controls
- Improved visual hierarchy for game setup sections

## Benefits

1. **Performance**: Single CSS file reduces HTTP requests
2. **Maintainability**: One source of truth for all styles
3. **Consistency**: Unified design system across all pages
4. **Accessibility**: Better keyboard navigation and screen reader support
5. **Modern**: Clean, contemporary design that feels current
6. **Mobile-First**: Optimized for mobile devices from the ground up
7. **Scalability**: Easy to add new components using existing design tokens

## CSS Architecture

The stylesheet is organized into clear sections:

1. CSS Variables & Root
2. Reset & Base Styles
3. Typography
4. Layout Components
5. Header
6. Cards
7. Buttons
8. Forms
9. Grid System
10. Feature Cards
11. Game Setup Specific
12. Status Messages
13. Footer
14. Utilities
15. Responsive Design
16. Animations
17. Accessibility
18. Print Styles

## How to Use

Simply link to the single stylesheet in your HTML:

```html
<link href="styles/app.css" rel="stylesheet">
```

The design system provides utility classes and components that can be combined to create any interface needed for the game.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Automatic fallbacks for older browsers
- Progressive enhancement approach