// reCAPTCHA v3 utility for spam protection
class ReCaptchaManager {
    constructor() {
        this.siteKey = '6Lf5TrUrAAAAAGYRvnOM3iYMhMSABS1ndvIb5CGO';
        this.secretKey = '6Lf5TrUrAAAAAFRsI6QPFcFnJtEGVqZ4cp9HxT_2';
        this.isLoaded = false;
        this.lastActionTime = 0;
        this.actionCooldown = 5000; // 5 seconds between actions
        this.maxActionsPerMinute = 10;
        this.actionCount = 0;
        this.lastMinuteReset = Date.now();
        
        // Load reCAPTCHA script
        this.loadScript();
    }

    loadScript() {
        if (window.grecaptcha) {
            this.isLoaded = true;
            return;
        }

        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            this.isLoaded = true;
            console.log('reCAPTCHA loaded successfully');
        };
        
        script.onerror = () => {
            console.error('Failed to load reCAPTCHA');
        };
        
        document.head.appendChild(script);
    }

    // Check if user can perform an action (rate limiting)
    canPerformAction() {
        const now = Date.now();
        
        // Reset action count every minute
        if (now - this.lastMinuteReset > 60000) {
            this.actionCount = 0;
            this.lastMinuteReset = now;
        }
        
        // Check cooldown between actions
        if (now - this.lastActionTime < this.actionCooldown) {
            return { allowed: false, reason: 'cooldown', remaining: this.actionCooldown - (now - this.lastActionTime) };
        }
        
        // Check rate limit per minute
        if (this.actionCount >= this.maxActionsPerMinute) {
            return { allowed: false, reason: 'rate_limit', remaining: 60000 - (now - this.lastMinuteReset) };
        }
        
        return { allowed: true };
    }

    // Execute reCAPTCHA action
    async execute(action = 'submit') {
        // Check rate limiting first
        const canPerform = this.canPerformAction();
        if (!canPerform.allowed) {
            const reason = canPerform.reason === 'cooldown' ? 
                `Please wait ${Math.ceil(canPerform.remaining / 1000)} seconds before trying again` :
                `Too many attempts. Please wait ${Math.ceil(canPerform.remaining / 1000)} seconds`;
            throw new Error(reason);
        }

        // Wait for reCAPTCHA to load
        if (!this.isLoaded) {
            await new Promise((resolve) => {
                const checkLoaded = () => {
                    if (window.grecaptcha && window.grecaptcha.ready) {
                        resolve();
                    } else {
                        setTimeout(checkLoaded, 100);
                    }
                };
                checkLoaded();
            });
        }

        try {
            // Execute reCAPTCHA
            const token = await new Promise((resolve, reject) => {
                window.grecaptcha.ready(() => {
                    window.grecaptcha.execute(this.siteKey, { action })
                        .then(resolve)
                        .catch(reject);
                });
            });

            // Update rate limiting
            this.lastActionTime = Date.now();
            this.actionCount++;

            return token;
        } catch (error) {
            console.error('reCAPTCHA execution failed:', error);
            throw new Error('Verification failed. Please try again.');
        }
    }

    // Verify token with backend (this would typically be done server-side)
    async verifyToken(token, action = 'submit') {
        // In a real implementation, you would send this token to your backend
        // For now, we'll do basic client-side validation
        if (!token || typeof token !== 'string' || token.length < 100) {
            throw new Error('Invalid verification token');
        }
        
        // Simulate server verification delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return { success: true, score: 0.9, action };
    }

    // Get remaining cooldown time
    getRemainingCooldown() {
        const now = Date.now();
        const remaining = this.actionCooldown - (now - this.lastActionTime);
        return Math.max(0, remaining);
    }

    // Get remaining actions this minute
    getRemainingActions() {
        const now = Date.now();
        if (now - this.lastMinuteReset > 60000) {
            return this.maxActionsPerMinute;
        }
        return Math.max(0, this.maxActionsPerMinute - this.actionCount);
    }
}

// Create global instance
window.recaptchaManager = new ReCaptchaManager();

export default window.recaptchaManager;
