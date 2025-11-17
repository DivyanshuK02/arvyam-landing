/**
 * ARVYAM HintForm Component
 * Optional 5-field form for collecting structured hints about the occasion
 * 
 * Fields (all optional - Guest-First constitutional requirement):
 * 1. relationship (enum) - Who is this gift for?
 * 2. occasion (enum) - What's the occasion?
 * 3. budget_inr (enum) - Preferred budget range
 * 4. delivery_window (enum) - When do you need this?
 * 5. tone_hint (free-text, validated) - Any specific preferences?
 * 
 * Constitutional Compliance:
 * - Selection Invariance: Does NOT affect card display, only curation input
 * - Guest-First: All fields optional, simple language, helpful labels
 * - ARVY Persona: Calm error messages, no jargon
 * - Privacy: PII validation on free-text, no raw text in analytics
 * 
 * @module HintForm
 * @version 1.0.0
 */

import { validateToneHint, sanitizeInput } from '../validators.js';

// ============================================================================
// HintForm Class
// ============================================================================

export default class HintForm {
  /**
   * Create a HintForm instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} [options.lang='en'] - Language code for localization
   * @param {Function} [options.onSubmit] - Callback when form submitted: (hints) => void
   * 
   * @example
   * const hintForm = new HintForm({
   *   lang: 'en',
   *   onSubmit: (hints) => {
   *     console.log('User submitted hints:', hints);
   *     searchWithHints(prompt, hints);
   *   }
   * });
   * hintForm.init();
   */
  constructor(options = {}) {
    this.lang = options.lang || 'en';
    this.onSubmit = options.onSubmit || null;
    
    // Component state
    this.isVisible = false;
    this.isInitialized = false;
    
    // DOM references (null until init)
    this.container = null;
    this.form = null;
    this.submitButton = null;
    this.cancelButton = null;
    this.toggleButton = null;
    
    // Field references
    this.fields = {
      relationship: null,
      occasion: null,
      budget: null,
      delivery: null,
      tone: null,
      toneError: null
    };
    
    // Event handlers (bound for cleanup)
    this.boundHandlers = {
      submit: null,
      cancel: null,
      toggle: null,
      escape: null
    };
  }
  
  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================
  
  /**
   * Initialize the component
   * Finds DOM elements and binds event handlers
   * Fails gracefully if container not found (DOM guard)
   * 
   * @returns {boolean} True if initialization succeeded
   */
  init() {
    if (this.isInitialized) {
      console.warn('[HintForm] Already initialized');
      return true;
    }
    
    // Find container (DOM guard - fail silently if not present)
    this.container = document.getElementById('hint-form-section');
    
    if (!this.container) {
      console.log('[HintForm] Container #hint-form-section not found, skipping init');
      return false;
    }
    
    // Find form
    this.form = this.container.querySelector('#hints-submit-form') || 
                this.container.querySelector('form');
    
    if (!this.form) {
      console.warn('[HintForm] Form not found in container');
      return false;
    }
    
    // Cache field references
    this.cacheFieldReferences();
    
    // Set initial ARIA state (hidden by default)
    if (this.container) {
      this.container.setAttribute('aria-expanded', 'false');
    }
    if (this.toggleButton) {
      this.toggleButton.setAttribute('aria-expanded', 'false');
    }
    
    // Bind event handlers
    this.bindEvents();
    
    this.isInitialized = true;
    console.log('[HintForm] Initialized successfully');
    
    return true;
  }
  
  /**
   * Cache references to form fields
   * @private
   */
  cacheFieldReferences() {
    this.fields.relationship = document.getElementById('hint-relationship');
    this.fields.occasion = document.getElementById('hint-occasion');
    this.fields.budget = document.getElementById('hint-budget');
    this.fields.delivery = document.getElementById('hint-delivery');
    this.fields.tone = document.getElementById('hint-tone');
    this.fields.toneError = document.getElementById('tone-error');
    
    this.submitButton = this.form.querySelector('button[type="submit"]');
    this.cancelButton = document.getElementById('hints-cancel');
    this.toggleButton = document.getElementById('hints-toggle');
  }
  
  /**
   * Bind event handlers
   * @private
   */
  bindEvents() {
    if (!this.form) return;
    
    // Form submit handler
    this.boundHandlers.submit = (e) => {
      e.preventDefault();
      this.handleSubmit();
    };
    this.form.addEventListener('submit', this.boundHandlers.submit);
    
    // Cancel button handler
    if (this.cancelButton) {
      this.boundHandlers.cancel = () => {
        this.hide();
        this.trackEvent('hints_form_cancelled');
      };
      this.cancelButton.addEventListener('click', this.boundHandlers.cancel);
    }
    
    // Toggle button handler (show form)
    if (this.toggleButton) {
      this.boundHandlers.toggle = () => {
        this.show();
        // Mirror aria-expanded on toggle button for screen readers
        if (this.toggleButton) {
          this.toggleButton.setAttribute('aria-expanded', 'true');
        }
        this.trackEvent('hints_form_opened');
      };
      this.toggleButton.addEventListener('click', this.boundHandlers.toggle);
    }
    
    // Escape key handler (close form)
    this.boundHandlers.escape = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
        this.trackEvent('hints_form_cancelled');
      }
    };
    document.addEventListener('keydown', this.boundHandlers.escape);
  }
  
  /**
   * Destroy the component
   * Removes event listeners and clears references
   */
  destroy() {
    if (!this.isInitialized) return;
    
    // Remove event listeners
    if (this.form && this.boundHandlers.submit) {
      this.form.removeEventListener('submit', this.boundHandlers.submit);
    }
    
    if (this.cancelButton && this.boundHandlers.cancel) {
      this.cancelButton.removeEventListener('click', this.boundHandlers.cancel);
    }
    
    if (this.toggleButton && this.boundHandlers.toggle) {
      this.toggleButton.removeEventListener('click', this.boundHandlers.toggle);
    }
    
    if (this.boundHandlers.escape) {
      document.removeEventListener('keydown', this.boundHandlers.escape);
    }
    
    // Clear references
    this.container = null;
    this.form = null;
    this.submitButton = null;
    this.cancelButton = null;
    this.toggleButton = null;
    this.fields = {};
    this.boundHandlers = {};
    this.isInitialized = false;
    
    console.log('[HintForm] Destroyed');
  }
  
  // ==========================================================================
  // Form Handling
  // ==========================================================================
  
  /**
   * Handle form submission
   * Validates tone hint, builds hints object, calls onSubmit callback
   * @private
   */
  handleSubmit() {
    // Clear previous errors
    this.clearError();
    
    // Get tone hint value
    const toneValue = this.fields.tone?.value || '';
    
    // Validate tone hint (PII check)
    const validation = validateToneHint(toneValue);
    
    if (!validation.valid) {
      this.showError(validation.error);
      
      // Set ARIA attributes for accessibility
      if (this.fields.tone) {
        this.fields.tone.setAttribute('aria-invalid', 'true');
        this.fields.tone.focus();
      }
      
      // Track validation error (NO raw text, only type)
      this.trackEvent('hints_validation_error', {
        error_type: 'tone_hint_pii'
      });
      
      return;
    }
    
    // Build hints object
    const hints = this.collectHints();
    
    // Track submission (safe fields only - NO raw text)
    this.trackEvent('hints_form_submitted', {
      has_relationship: !!hints.relationship,
      has_occasion: !!hints.occasion,
      has_budget: !!hints.budget_inr,
      has_delivery: !!hints.delivery_window,
      has_tone_hint: !!hints.tone_hint,
      tone_hint_length_chars: hints.tone_hint?.length || 0
    });
    
    // Call onSubmit callback
    if (typeof this.onSubmit === 'function') {
      this.onSubmit(hints);
    }
    
    // Hide form after successful submission
    this.hide();
    
    console.log('[HintForm] Submitted (hints collected, no PII logged)');
  }
  
  /**
   * Collect hints from form fields
   * Returns object with all hint values (sanitized)
   * 
   * @returns {Object} Hints object
   * @returns {string} [hints.relationship] - Relationship type
   * @returns {string} [hints.occasion] - Occasion type
   * @returns {string} [hints.budget_inr] - Budget range
   * @returns {string} [hints.delivery_window] - Delivery window
   * @returns {string} [hints.tone_hint] - Tone hint (sanitized, max 100 chars)
   * 
   * @private
   */
  collectHints() {
    const hints = {};
    
    // Collect enum fields (only if selected)
    if (this.fields.relationship?.value) {
      hints.relationship = this.fields.relationship.value;
    }
    
    if (this.fields.occasion?.value) {
      hints.occasion = this.fields.occasion.value;
    }
    
    if (this.fields.budget?.value) {
      hints.budget_inr = this.fields.budget.value;
    }
    
    if (this.fields.delivery?.value) {
      hints.delivery_window = this.fields.delivery.value;
    }
    
    // Collect and sanitize tone hint
    if (this.fields.tone?.value) {
      const toneValue = sanitizeInput(this.fields.tone.value, 100);
      if (toneValue) {
        hints.tone_hint = toneValue;
      }
    }
    
    return hints;
  }
  
  // ==========================================================================
  // Error Display (ARVY Persona)
  // ==========================================================================
  
  /**
   * Show error message inline
   * Uses ARIA live region for screen reader announcement
   * 
   * @param {string} message - Error message (already in ARVY persona tone)
   * @private
   */
  showError(message) {
    if (!this.fields.toneError) return;
    
    this.fields.toneError.textContent = message;
    this.fields.toneError.style.display = 'block';
    this.fields.toneError.setAttribute('role', 'alert');
    this.fields.toneError.setAttribute('aria-live', 'assertive');
  }
  
  /**
   * Clear error message
   * @private
   */
  clearError() {
    if (!this.fields.toneError) return;
    
    this.fields.toneError.textContent = '';
    this.fields.toneError.style.display = 'none';
    this.fields.toneError.removeAttribute('role');
    this.fields.toneError.removeAttribute('aria-live');
    
    if (this.fields.tone) {
      this.fields.tone.removeAttribute('aria-invalid');
    }
  }
  
  // ==========================================================================
  // Visibility Control
  // ==========================================================================
  
  /**
   * Show the hint form
   * Sets visibility state and updates ARIA attributes
   */
  show() {
    if (!this.container) return;
    
    this.container.removeAttribute('hidden');
    this.container.setAttribute('aria-expanded', 'true');
    
    // Mirror aria-expanded on toggle button for screen readers
    if (this.toggleButton) {
      this.toggleButton.setAttribute('aria-expanded', 'true');
    }
    
    this.isVisible = true;
    
    // Focus first field for accessibility
    if (this.fields.relationship) {
      this.fields.relationship.focus();
    }
    
    console.log('[HintForm] Shown');
  }
  
  /**
   * Hide the hint form
   * Resets form and updates ARIA attributes
   */
  hide() {
    if (!this.container) return;
    
    this.container.setAttribute('hidden', '');
    this.container.setAttribute('aria-expanded', 'false');
    this.isVisible = false;
    
    // Mirror aria-expanded on toggle button for screen readers
    if (this.toggleButton) {
      this.toggleButton.setAttribute('aria-expanded', 'false');
    }
    
    // Reset form
    if (this.form) {
      this.form.reset();
    }
    
    // Clear any errors
    this.clearError();
    
    console.log('[HintForm] Hidden');
  }
  
  // ==========================================================================
  // Localization
  // ==========================================================================
  
  /**
   * Update component language
   * Re-renders labels and messages in new language
   * 
   * @param {string} lang - New language code
   * 
   * Note: For Step 6, this is a stub. Full i18n integration is Step 12.
   * For now, it just updates the internal language reference.
   */
  updateLanguage(lang) {
    this.lang = lang;
    console.log('[HintForm] Language updated to:', lang);
    
    // TODO Step 12: Re-render labels using t() helper
    // For now, English-only is acceptable per spec
  }
  
  // ==========================================================================
  // Analytics Helper
  // ==========================================================================
  
  /**
   * Track analytics event (privacy-safe)
   * Uses global trackEvent if available (from app.js)
   * 
   * @param {string} eventName - Event name
   * @param {Object} [properties={}] - Event properties (NO PII)
   * @private
   */
  trackEvent(eventName, properties = {}) {
    if (typeof window.trackEvent === 'function') {
      window.trackEvent(eventName, properties);
    } else {
      console.log('[HintForm] Analytics event:', eventName, properties);
    }
  }
  
  // ==========================================================================
  // Getters (for testing/debugging)
  // ==========================================================================
  
  /**
   * Get current visibility state
   * @returns {boolean} True if form is visible
   */
  getVisibility() {
    return this.isVisible;
  }
  
  /**
   * Get initialization state
   * @returns {boolean} True if component is initialized
   */
  getInitialized() {
    return this.isInitialized;
  }
  
  /**
   * Get current form values (for testing)
   * Does NOT sanitize or validate - use collectHints() for that
   * 
   * @returns {Object} Raw form values
   */
  getFormValues() {
    return {
      relationship: this.fields.relationship?.value || '',
      occasion: this.fields.occasion?.value || '',
      budget: this.fields.budget?.value || '',
      delivery: this.fields.delivery?.value || '',
      tone: this.fields.tone?.value || ''
    };
  }
}

// ============================================================================
// Module Exports
// ============================================================================

/**
 * Export summary:
 * 
 * Default export: HintForm class
 * 
 * Public methods:
 * - constructor(options)
 * - init() → boolean
 * - destroy()
 * - show()
 * - hide()
 * - updateLanguage(lang)
 * 
 * Getters (for testing):
 * - getVisibility() → boolean
 * - getInitialized() → boolean
 * - getFormValues() → object
 * 
 * Usage:
 * import HintForm from './components/hint_form.js';
 * 
 * const hintForm = new HintForm({
 *   lang: 'en',
 *   onSubmit: (hints) => searchWithHints(prompt, hints)
 * });
 * 
 * hintForm.init();
 */
