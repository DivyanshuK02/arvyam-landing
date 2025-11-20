/**
 * ARVYAM Analytics System
 * Privacy-safe, consent-gated event tracking
 * 
 * Features:
 * - Provider-agnostic (uses window.dataLayer by default)
 * - Consent-gated (respects cookie preferences)
 * - Session management (anonymous session IDs)
 * - NO PII tracking (only metadata, counts, IDs)
 * - Graceful degradation (silent failures)
 * 
 * Constitutional Compliance:
 * - Guest-First: Zero UI impact, transparent operation
 * - ARVY Persona: No aggressive tracking, calm data collection
 * - Privacy-First: Consent-required, no personal data
 * 
 * @module Analytics
 * @version 1.0.0
 */

// ============================================================================
// Event Schema Definition
// ============================================================================

/**
 * Defines required fields for each analytics event
 * Used for validation before sending events
 */
const ANALYTICS_EVENTS = {
  // User submits initial search prompt
  prompt_submitted: {
    required: ['persona', 'language', 'prompt_length_chars', 'session_id'],
    description: 'User submits search query'
  },
  
  // Results displayed (3-card triad)
  results_displayed: {
    required: ['persona', 'language', 'triad', 'result_count', 'session_id'],
    description: 'Search results shown to user'
  },
  
  // User clicks on a product card
  product_clicked: {
    required: ['persona', 'sku_id', 'card_position', 'session_id'],
    description: 'User selects a product card'
  },
  
  // User submits refinement
  refine_submitted: {
    required: ['persona', 'language', 'refinement_length_chars', 'turn_number', 'session_id'],
    description: 'User refines search results'
  },
  
  // User changes language
  language_changed: {
    required: ['persona', 'from_lang', 'to_lang', 'session_id'],
    description: 'User switches interface language'
  },
  
  // User updates consent preferences
  consent_updated: {
    required: ['persona', 'analytics_enabled', 'session_id'],
    description: 'User changes cookie consent'
  },
  
  // Page view (on load)
  page_view: {
    required: ['persona', 'page_path', 'referrer', 'session_id'],
    description: 'Page load event'
  },
  
  // Session end (on unload)
  session_ended: {
    required: ['persona', 'session_duration_seconds', 'ux_turns', 'session_id'],
    description: 'User session completed'
  }
};

// ============================================================================
// Analytics Class
// ============================================================================

class ARVYAMAnalytics {
  constructor(options = {}) {
    // Core identity
    this.persona = 'ARVY'; // Always included (AC6 requirement)
    this.language = options.language || 'en'; // Initial language
    
    // Session tracking
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.uxTurns = 0;
    this.pagesViewed = 1;
    
    // Consent state (default: disabled until explicitly enabled)
    this.enabled = false;
    
    // Queue for events fired before consent loaded
    this.eventQueue = [];
    this.consentChecked = false;
    
    console.log('[Analytics] Initialized with session:', this.sessionId, 'language:', this.language);
  }
  
  // ==========================================================================
  // Initialization & Consent Management
  // ==========================================================================
  
  /**
   * Initialize analytics with consent state
   * @param {Object} options - Initialization options
   * @param {Object} options.consent - Consent preferences
   * @param {boolean} options.consent.analytics - Analytics consent flag
   */
  init({ consent } = {}) {
    this.consentChecked = true;
    this.enabled = !!(consent && consent.analytics);
    
    console.log('[Analytics] Initialized - enabled:', this.enabled);
    
    // Process queued events if consent given
    if (this.enabled && this.eventQueue.length > 0) {
      console.log('[Analytics] Processing', this.eventQueue.length, 'queued events');
      this.eventQueue.forEach(({ eventName, properties }) => {
        this.track(eventName, properties);
      });
      this.eventQueue = [];
    } else if (!this.enabled) {
      // Clear queue if consent denied
      this.eventQueue = [];
    }
    
    // Track initial page view
    if (this.enabled) {
      this.track('page_view', {
        page_path: window.location.pathname,
        referrer: this.sanitizeReferrer(document.referrer)
      });
    }
    
    // Track session end on page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }
  
  /**
   * Update consent state
   * @param {Object} consent - New consent preferences
   * @param {boolean} consent.analytics - Analytics consent flag
   */
  setConsent(consent) {
    const wasEnabled = this.enabled;
    this.enabled = !!(consent && consent.analytics);
    this.consentChecked = true;
    
    console.log('[Analytics] Consent updated - enabled:', this.enabled);
    
    // Track consent change
    if (this.enabled) {
      this.track('consent_updated', {
        analytics_enabled: true
      });
      
      // Process queued events if newly enabled
      if (!wasEnabled && this.eventQueue.length > 0) {
        console.log('[Analytics] Processing', this.eventQueue.length, 'queued events after consent');
        this.eventQueue.forEach(({ eventName, properties }) => {
          this.track(eventName, properties);
        });
        this.eventQueue = [];
      }
    } else {
      // Clear queue and track consent withdrawal
      this.eventQueue = [];
      
      // Send final event before disabling
      if (wasEnabled) {
        this.send({
          persona: this.persona,
          event: 'consent_updated',
          timestamp: new Date().toISOString(),
          session_id: this.sessionId,
          analytics_enabled: false
        });
      }
    }
  }
  
  // ==========================================================================
  // Session Management
  // ==========================================================================
  
  /**
   * Generate anonymous session ID
   * Uses crypto.getRandomValues for strong entropy
   * @returns {string} Session ID
   */
  generateSessionId() {
    if (window.crypto && window.crypto.getRandomValues) {
      // Use cryptographically strong random values
      const array = new Uint32Array(2);
      window.crypto.getRandomValues(array);
      return `${Date.now()}-${array[0].toString(36)}${array[1].toString(36)}`;
    } else {
      // Fallback for older browsers
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }
  
  /**
   * Sanitize referrer URL (strip query params for privacy)
   * @param {string} referrer - Full referrer URL
   * @returns {string} Sanitized referrer (origin + pathname only)
   */
  sanitizeReferrer(referrer) {
    if (!referrer) return '';
    
    try {
      const url = new URL(referrer);
      // Return origin + pathname only (strips query params and hash)
      return url.origin + url.pathname;
    } catch (e) {
      return '';
    }
  }
  
  /**
   * Update language
   * @param {string} lang - New language code
   */
  setLanguage(lang) {
    const oldLang = this.language;
    this.language = lang;
    console.log('[Analytics] Language updated:', oldLang, '→', lang);
  }
  
  /**
   * Increment UX turns counter
   * Called after each search refinement
   */
  incrementUXTurns() {
    this.uxTurns++;
  }
  
  /**
   * End session and track metrics
   * Called on page unload
   */
  endSession() {
    if (!this.enabled) return;
    
    const duration = Math.floor((Date.now() - this.sessionStart) / 1000);
    
    this.track('session_ended', {
      session_duration_seconds: duration,
      pages_viewed: this.pagesViewed,
      ux_turns: this.uxTurns
    });
  }
  
  // ==========================================================================
  // Event Tracking
  // ==========================================================================
  
  /**
   * Track an analytics event
   * Validates event against schema and sends if consent given
   * 
   * @param {string} eventName - Event name (must be in ANALYTICS_EVENTS)
   * @param {Object} properties - Event properties
   * 
   * @example
   * analytics.track('product_clicked', {
   *   sku_id: 'BQ-001',
   *   card_position: 1
   * });
   */
  track(eventName, properties = {}) {
    // Queue event if consent not yet checked
    if (!this.consentChecked) {
      this.eventQueue.push({ eventName, properties });
      console.log('[Analytics] Event queued (consent pending):', eventName);
      return;
    }
    
    // Silent fail if consent not given
    if (!this.enabled) {
      console.log('[Analytics] Event not tracked (no consent):', eventName);
      return;
    }
    
    // Validate event name
    const schema = ANALYTICS_EVENTS[eventName];
    if (!schema) {
      console.warn('[Analytics] Unknown event:', eventName);
      return;
    }
    
    // Build payload
    const payload = {
      persona: this.persona,
      event: eventName,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      ...properties
    };
    
    // Validate required fields
    const missingFields = schema.required.filter(field => !(field in payload));
    if (missingFields.length > 0) {
      console.warn(`[Analytics] Missing required fields for ${eventName}:`, missingFields);
      return;
    }
    
    // Send event
    this.send(payload);
    
    console.log('[Analytics] Event tracked:', eventName, properties);
  }
  
  /**
   * Send event payload to analytics backend
   * Uses sendBeacon for reliability or fetch as fallback
   * 
   * @param {Object} payload - Event payload
   */
  send(payload) {
    // Initialize dataLayer if needed
    window.dataLayer = window.dataLayer || [];
    
    // Push to dataLayer (for Google Tag Manager or similar)
    window.dataLayer.push(payload);
    
    // Also send to custom analytics endpoint via sendBeacon
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics', blob);
    } else {
      // Fallback to fetch with keepalive
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {
        // Silently fail - analytics should never block user
      });
    }
  }
}

// ============================================================================
// Module Exports
// ============================================================================

/**
 * Export ARVYAMAnalytics class for dynamic instantiation
 * 
 * Usage:
 * 
 * import Analytics from './analytics.js';
 * 
 * // Create instance with language
 * const analytics = new Analytics({ language: 'en' });
 * 
 * // Initialize with consent
 * analytics.init({ consent: { analytics: true } });
 * 
 * // Track event
 * analytics.track('product_clicked', { sku_id: 'BQ-001', card_position: 1 });
 */
export default ARVYAMAnalytics;

// Named export for explicit class access
export { ARVYAMAnalytics };
