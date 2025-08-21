/**
 * Component Loader for Secret Hitler
 * Dynamically loads and injects HTML components into the page
 */

class ComponentLoader {
    constructor() {
        this.componentsPath = this.getComponentsPath();
        this.cache = {};
    }

    /**
     * Determines the correct path to components folder based on current page location
     */
    getComponentsPath() {
        const path = window.location.pathname;
        if (path.includes('/pages/')) {
            return '../components/';
        }
        return 'components/';
    }

    /**
     * Loads a component from the components folder
     * @param {string} componentName - Name of the component file (without .html)
     * @param {Object} data - Optional data to pass to the component for template replacement
     * @returns {Promise<string>} - The component HTML
     */
    async loadComponent(componentName, data = {}) {
        const cacheKey = `${componentName}_${JSON.stringify(data)}`;
        
        // Return cached component if available
        if (this.cache[cacheKey]) {
            return this.cache[cacheKey];
        }

        try {
            const response = await fetch(`${this.componentsPath}${componentName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentName}`);
            }
            
            let html = await response.text();
            
            // Replace template variables with data
            html = this.processTemplate(html, data);
            
            // Cache the processed component
            this.cache[cacheKey] = html;
            
            return html;
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
            return '';
        }
    }

    /**
     * Processes template variables in the HTML
     * @param {string} html - The HTML template
     * @param {Object} data - Data object with values to replace
     * @returns {string} - Processed HTML
     */
    processTemplate(html, data) {
        // Handle conditional blocks {{#if variable}}...{{/if}}
        html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
            return data[key] ? content : '';
        });
        
        // Replace {{variable}} with data.variable
        html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : '';
        });
        
        return html;
    }

    /**
     * Injects a component into a DOM element
     * @param {string} elementId - ID of the element to inject into
     * @param {string} componentName - Name of the component
     * @param {Object} data - Optional data for the component
     * @param {boolean} append - Whether to append or replace content
     */
    async injectComponent(elementId, componentName, data = {}, append = false) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with ID ${elementId} not found`);
            return;
        }

        const html = await this.loadComponent(componentName, data);
        
        if (append) {
            element.insertAdjacentHTML('beforeend', html);
        } else {
            element.innerHTML = html;
        }
    }

    /**
     * Loads multiple components and returns them as an object
     * @param {Array} components - Array of component configurations
     * @returns {Promise<Object>} - Object with component HTML keyed by name
     */
    async loadMultipleComponents(components) {
        const promises = components.map(config => {
            if (typeof config === 'string') {
                return this.loadComponent(config).then(html => ({ [config]: html }));
            } else {
                return this.loadComponent(config.name, config.data).then(html => ({ [config.name]: html }));
            }
        });

        const results = await Promise.all(promises);
        return Object.assign({}, ...results);
    }

    /**
     * Auto-loads components based on data-component attributes
     */
    async autoLoadComponents() {
        const elements = document.querySelectorAll('[data-component]');
        
        for (const element of elements) {
            const componentName = element.dataset.component;
            const data = element.dataset.componentData ? 
                JSON.parse(element.dataset.componentData) : {};
            
            const html = await this.loadComponent(componentName, data);
            element.innerHTML = html;
        }
    }

    /**
     * Initializes the page with common components
     */
    async initializePage(config = {}) {
        const {
            header = true,
            footer = true,
            title = 'Secret Hitler',
            subtitle = 'Mobile Edition',
            headerData = {},
            footerData = {},
            customComponents = []
        } = config;

        // Load header
        if (header) {
            const headerElement = document.getElementById('app-header');
            if (headerElement) {
                const defaultHeaderData = {
                    title: title,
                    subtitle: subtitle,
                    homeUrl: this.componentsPath.includes('../') ? '../index.html' : 'index.html'
                };
                await this.injectComponent('app-header', 'header', { ...defaultHeaderData, ...headerData });
            }
        }

        // Load footer
        if (footer) {
            const footerElement = document.getElementById('app-footer');
            if (footerElement) {
                const defaultFooterData = {
                    rulesUrl: this.componentsPath.includes('../') ? '../pages/rules.html' : 'pages/rules.html',
                    playUrl: this.componentsPath.includes('../') ? '../index.html' : 'index.html'
                };
                await this.injectComponent('app-footer', 'footer', { ...defaultFooterData, ...footerData });
            }
        }

        // Load any custom components
        for (const component of customComponents) {
            await this.injectComponent(
                component.elementId,
                component.name,
                component.data || {},
                component.append || false
            );
        }

        // Auto-load components with data-component attribute
        await this.autoLoadComponents();
    }
}

// Export for use in other scripts
window.ComponentLoader = ComponentLoader;

// Create global instance
window.componentLoader = new ComponentLoader();