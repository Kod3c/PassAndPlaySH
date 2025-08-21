# Component System Documentation

## Overview
This component system allows you to create reusable HTML components that can be dynamically loaded and injected into your pages, reducing code duplication and improving maintainability.

## Components Directory Structure
```
components/
├── loader.js           # Component loader script
├── header.html         # Header component
├── footer.html         # Footer component
├── meta-tags.html      # Common meta tags
├── card.html           # Card component
├── button.html         # Button component
├── feature-card.html   # Feature card component
├── game-info-card.html # Game info card component
├── section-header.html # Section header component
├── page-wrapper.html   # Page wrapper component
└── README.md          # This documentation
```

## How to Use Components

### 1. Include the Component Loader
Add this to your HTML head:
```html
<script src="../components/loader.js"></script>
```
Note: Adjust the path based on your file location.

### 2. Add Component Placeholders
Add div elements with specific IDs where components should be injected:
```html
<div id="app-header"></div>
<div id="app-footer"></div>
```

### 3. Initialize Components
In your JavaScript, initialize the components when the page loads:
```javascript
document.addEventListener('DOMContentLoaded', async function() {
    await componentLoader.initializePage({
        title: 'Secret Hitler',
        subtitle: 'Your Page Subtitle'
    });
});
```

### 4. Using Custom Components
You can load any component dynamically:
```javascript
// Load a single component
const html = await componentLoader.loadComponent('button', {
    btnClass: 'btn-primary',
    btnText: 'Click Me',
    btnEmoji: '🎮'
});

// Inject a component into an element
await componentLoader.injectComponent('my-element-id', 'card', {
    cardTitle: 'My Card',
    cardContent: 'Card content here'
});
```

### 5. Using Data-Component Attributes
You can also use data attributes for automatic loading:
```html
<div data-component="feature-card" 
     data-component-data='{"featureIcon":"🎮","featureTitle":"Gaming","featureDescription":"Play games"}'></div>
```

## Template Variables

Components use template variables with `{{variableName}}` syntax:
- Simple variables: `{{title}}`
- Conditional blocks: `{{#if hasHeader}}...{{/if}}`

## Available Components

### Header Component
Variables:
- `title`: Main title text
- `subtitle`: Subtitle text
- `homeUrl`: URL for home link

### Footer Component
Variables:
- `rulesUrl`: URL for rules page
- `playUrl`: URL for play page

### Card Component
Variables:
- `cardClass`: Additional CSS classes
- `hasHeader`: Whether to show header
- `cardIcon`: Icon for the card
- `cardTitle`: Card title
- `cardDescription`: Card description
- `cardContent`: Main card content

### Button Component
Variables:
- `btnClass`: CSS classes (e.g., 'btn-primary')
- `btnId`: Button ID
- `btnOnclick`: Click handler
- `btnDisabled`: Whether button is disabled
- `btnEmoji`: Emoji icon
- `btnText`: Button text

### Feature Card Component
Variables:
- `featureIcon`: Feature icon
- `featureTitle`: Feature title
- `featureDescription`: Feature description

### Game Info Card Component
Variables:
- `icon`: Card icon
- `title`: Card title
- `description`: Card description

### Section Header Component
Variables:
- `icon`: Section icon
- `title`: Section title
- `subtitle`: Optional subtitle

## Example: Refactoring a Page

### Before (with duplicated code):
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <span class="logo-icon">🎭</span>
                    <div class="logo-text">
                        <h1>Secret Hitler</h1>
                        <p class="subtitle">My Page</p>
                    </div>
                </div>
            </div>
        </div>
    </header>
    
    <!-- Page content -->
    
    <footer class="main-footer">
        <div class="container">
            <div class="footer-content">
                <p class="footer-text">Built for offline play</p>
            </div>
        </div>
    </footer>
</body>
</html>
```

### After (using components):
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
    <script src="../components/loader.js"></script>
</head>
<body>
    <div class="page-wrapper">
        <div id="app-header"></div>
        
        <!-- Page content -->
        
        <div id="app-footer"></div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', async function() {
            await componentLoader.initializePage({
                title: 'Secret Hitler',
                subtitle: 'My Page'
            });
        });
    </script>
</body>
</html>
```

## Advanced Usage

### Custom Component Configuration
```javascript
await componentLoader.initializePage({
    header: true,
    footer: true,
    title: 'My App',
    subtitle: 'Page Name',
    customComponents: [
        {
            elementId: 'feature-section',
            name: 'feature-card',
            data: { 
                featureIcon: '🎮',
                featureTitle: 'Gaming',
                featureDescription: 'Play awesome games'
            }
        }
    ]
});
```

### Caching
Components are automatically cached after first load for better performance. The cache key includes both the component name and the data passed to it.

### Error Handling
The loader includes error handling and will log errors to the console if a component fails to load. It will return an empty string instead of breaking the page.

## Best Practices

1. **Keep components small and focused** - Each component should have a single responsibility
2. **Use semantic naming** - Component names should clearly describe what they are
3. **Document template variables** - Always document what variables a component expects
4. **Test components in isolation** - Create a test page to verify components work correctly
5. **Use consistent styling** - Ensure components use consistent CSS classes
6. **Avoid inline scripts** - Keep JavaScript separate from component HTML when possible

## Migration Guide

To migrate existing pages to use the component system:

1. Identify repeated HTML patterns across pages
2. Extract them into component files
3. Replace the HTML with component placeholders
4. Add the loader script and initialization code
5. Test thoroughly to ensure functionality is preserved

## Troubleshooting

### Component not loading
- Check the console for errors
- Verify the component file exists
- Ensure the path to components folder is correct
- Check that variable names match exactly

### Styling issues
- Ensure CSS files are loaded before components
- Check that CSS classes in components match your stylesheets
- Verify component HTML structure matches expected CSS selectors

### JavaScript errors
- Make sure loader.js is loaded before trying to use componentLoader
- Ensure async functions are properly awaited
- Check that DOM elements exist before trying to inject components