/**
 * ARVYAM RefineBar Component
 * Allows guests to gently adjust their 3 curated arrangements
 * 
 * Features:
 * - Single-line input field (1-50 chars, PII validated)
 * - Shown only after successful 3-card result
 * - Privacy-safe: No raw text in analytics
 * - Calm ARVY persona error messages
 * 
 * Constitutional Compliance:
 * - Selection Invariance: Still returns 3 cards (triad enforced by backend)
 * - Guest-First: Simple language, optional refinement
 * - ARVY Persona: "We will keep three options, just tuned" tone
 * - Privacy: PII blocked, no raw text logged
 * 
 * @module RefineBar
 * @version 1.0.0
 */

import { validateRefinement, sanitizeInput, containsPII } from '../validators.js';

// ============================================================================
// RefineBar Class
// ============================================================================

export default class RefineBar {
  /**
   * Create a RefineBar instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} [options.lang='en'] - Language code for localization
   * @param {Function} [options.onSubmit] - Callback when refinement submitted: (text) => void
   * 
   * @example
   * const refineBar = new RefineBar({
   *   lang: 'en',
   *   onSubmit: (refinement) => {
   *     console.log('User wants to refine');
   *     handleRefinement(refinement);
   *   }
   * });
   */
  constructor(options = {}) {
    this.lang = options.lang || 'en';
    this.onSubmit = options.onSubmit || null;
    
    // Component state
    this.isAttached = false;
    this.container = null;
    this.parentContainer = null;
    
    // DOM references
    this.form = null;
    this.input = null;
    this.submitButton = null;
    this.errorElement = null;
    this.helperElement = null;
    
    // Event handlers (bound for cleanup)
    this.boundHandlers = {
      submit: null,
      input: null
    };
    
    // Metadata from last attachment
    this.metadata = {
      hasHints: false,
      uncertaintyScore: 0
    };
  }
  
  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================
  
  /**
   * Attach the RefineBar to a parent container
   * Creates DOM elements and binds event handlers
   * Should be called after successful 3-card result display
   * 
   * @param {HTMLElement} parentContainer - Container to attach to (e.g., #curated-results)
   * @param {Object} [metadata={}] - Optional metadata about current results
   * @param {boolean} [metadata.hasHints] - Whether hints were used in search
   * @param {number} [metadata.uncertaintyScore] - Uncertainty score from backend
   */
  attach(parentContainer, metadata = {}) {
    if (!parentContainer) {
      console.warn('[RefineBar] No parent container provided');
      return;
    }
    
    // Detach existing instance if already attached
    if (this.isAttached) {
      this.detach();
    }
    
    this.parentContainer = parentContainer;
    this.metadata = {
      hasHints: metadata.hasHints || false,
      uncertaintyScore: metadata.uncertaintyScore || 0
    };
    
    // Create DOM structure
    this.createDOM();
    
    // Append to parent
    this.parentContainer.appendChild(this.container);
    
    // Bind events
    this.bindEvents();
    
    this.isAttached = true;
    console.log('[RefineBar] Attached successfully');
  }
  
  /**
   * Detach the RefineBar from DOM
   * Removes event listeners and cleans up references
   */
  detach() {
    if (!this.isAttached) return;
    
    // Remove event listeners
    this.unbindEvents();
    
    // Remove from DOM
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Clear references
    this.container = null;
    this.form = null;
    this.input = null;
    this.submitButton = null;
    this.errorElement = null;
    this.helperElement = null;
    this.isAttached = false;
    
    console.log('[RefineBar] Detached');
  }
  
  /**
   * Reset the RefineBar state
   * Clears input, errors, and resets to initial state
   */
  reset() {
    if (!this.isAttached) return;
    
    if (this.form) {
      this.form.reset();
    }
    
    this.clearError();
    
    console.log('[RefineBar] Reset');
  }
  
  /**
   * Destroy the component completely
   * Removes all references and event listeners
   */
  destroy() {
    this.detach();
    this.parentContainer = null;
    this.boundHandlers = {};
    
    console.log('[RefineBar] Destroyed');
  }
  
  // ==========================================================================
  // DOM Creation
  // ==========================================================================
  
  /**
   * Create the RefineBar DOM structure
   * @private
   */
  createDOM() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'refine-bar';
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', 'Refine search results');
    
    // Create form
    this.form = document.createElement('form');
    this.form.className = 'refine-bar__form';
    this.form.id = 'refine-form';
    
    // Create title
    const title = document.createElement('h3');
    title.className = 'refine-bar__title';
    title.textContent = 'Adjust the selection';
    
    // Create form group
    const formGroup = document.createElement('div');
    formGroup.className = 'refine-bar__form-group';
    
    // Create label (visually hidden, for a11y)
    const label = document.createElement('label');
    label.htmlFor = 'refine-input';
    label.className = 'refine-bar__label sr-only';
    label.textContent = 'Adjustment preferences';
    
    // Create input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.id = 'refine-input';
    this.input.name = 'refinement';
    this.input.className = 'refine-bar__input';
    this.input.placeholder = 'E.g., warmer colors • softer palette';
    this.input.maxLength = 50;
    this.input.setAttribute('aria-describedby', 'refine-error');
    this.input.setAttribute('aria-required', 'true');
    
    // Create helper text (hidden - length limit shown via inline counter only when needed)
    this.helperElement = document.createElement('small');
    this.helperElement.id = 'refine-helper';
    this.helperElement.className = 'refine-bar__helper';
    this.helperElement.style.display = 'none'; // Hidden by default
    this.helperElement.textContent = '';
    
    // Create error element
    this.errorElement = document.createElement('span');
    this.errorElement.id = 'refine-error';
    this.errorElement.className = 'refine-bar__error';
    this.errorElement.style.display = 'none';
    this.errorElement.setAttribute('aria-live', 'assertive');
    
    // Create submit button
    this.submitButton = document.createElement('button');
    this.submitButton.type = 'submit';
    this.submitButton.className = 'refine-bar__submit btn btn-primary tap-target';
    this.submitButton.textContent = 'Refine';
    this.submitButton.setAttribute('aria-label', 'Refine search results');
    
    // Assemble DOM
    formGroup.appendChild(label);
    formGroup.appendChild(this.input);
    formGroup.appendChild(this.helperElement);
    formGroup.appendChild(this.errorElement);
    
    this.form.appendChild(title);
    this.form.appendChild(formGroup);
    this.form.appendChild(this.submitButton);
    
    this.container.appendChild(this.form);
  }
  
  // ==========================================================================
  // Event Handling
  // ==========================================================================
  
  /**
   * Bind event handlers
   * @private
   */
  bindEvents() {
    if (!this.form || !this.input) return;
    
    // Form submit handler
    this.boundHandlers.submit = (e) => {
      e.preventDefault();
      this.handleSubmit();
    };
    this.form.addEventListener('submit', this.boundHandlers.submit);
    
    // Input handler (clear errors on typing)
    this.boundHandlers.input = () => {
      if (this.input.value.length > 0) {
        this.clearError();
      }
    };
    this.input.addEventListener('input', this.boundHandlers.input);
  }
  
  /**
   * Unbind event handlers
   * @private
   */
  unbindEvents() {
    if (this.form && this.boundHandlers.submit) {
      this.form.removeEventListener('submit', this.boundHandlers.submit);
    }
    
    if (this.input && this.boundHandlers.input) {
      this.input.removeEventListener('input', this.boundHandlers.input);
    }
  }
  
  /**
   * Handle form submission
   * Validates input and calls onSubmit callback
   * @private
   */
  handleSubmit() {
    // Get input value
    const rawValue = this.input?.value || '';
    
    // Validate (1-50 chars, no PII)
    const validation = validateRefinement(rawValue);
    
    if (!validation.valid) {
      this.showError(validation.error);
      
      // Set ARIA attributes
      if (this.input) {
        this.input.setAttribute('aria-invalid', 'true');
        this.input.focus();
      }
      
      // Track validation error (NO raw text)
      this.trackEvent('refine_validation_error', {
        error_type: validation.error.includes('email') ? 'email' :
                   validation.error.includes('phone') ? 'phone' :
                   validation.error.includes('50') ? 'length' : 'empty'
      });
      
      return;
    }
    
    // Sanitize input
    const sanitized = sanitizeInput(rawValue, 50);
    
    // Privacy check (for analytics only, never log actual text)
    const hasPII = containsPII(sanitized);
    
    // Track submission (safe fields only)
    this.trackEvent('refine_submitted', {
      refinement_length_chars: sanitized.length,
      has_pii: hasPII, // Boolean flag only
      from_uncertain_search: this.metadata.uncertaintyScore > 0.5,
      had_hints: this.metadata.hasHints
    });
    
    // Call onSubmit callback with sanitized text
    if (typeof this.onSubmit === 'function') {
      this.onSubmit(sanitized);
    }
    
    console.log('[RefineBar] Submitted (refinement sent, no PII logged)');
  }
  
  // ==========================================================================
  // Error Display (ARVY Persona)
  // ==========================================================================
  
  /**
   * Show error message inline
   * Uses ARIA live region for screen reader announcement
   * 
   * @param {string} message - Error message (already in ARVY persona tone)
   */
  showError(message) {
    if (!this.errorElement) return;
    
    this.errorElement.textContent = message;
    this.errorElement.style.display = 'block';
    this.errorElement.setAttribute('role', 'alert');
  }
  
  /**
   * Clear error message
   */
  clearError() {
    if (!this.errorElement) return;
    
    this.errorElement.textContent = '';
    this.errorElement.style.display = 'none';
    this.errorElement.removeAttribute('role');
    
    if (this.input) {
      this.input.removeAttribute('aria-invalid');
    }
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
   * Note: For Step 7, this is a stub. Full i18n integration is Step 12.
   * For now, it just updates the internal language reference.
   */
  updateLanguage(lang) {
    this.lang = lang;
    console.log('[RefineBar] Language updated to:', lang);
    
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
      console.log('[RefineBar] Analytics event:', eventName, properties);
    }
  }
  
  // ==========================================================================
  // Getters (for testing/debugging)
  // ==========================================================================
  
  /**
   * Get current attachment state
   * @returns {boolean} True if component is attached
   */
  getAttached() {
    return this.isAttached;
  }
  
  /**
   * Get current input value (for testing)
   * Does NOT sanitize or validate
   * @returns {string} Raw input value
   */
  getInputValue() {
    return this.input?.value || '';
  }
  
  /**
   * Get current metadata
   * @returns {Object} Metadata from last attachment
   */
  getMetadata() {
    return { ...this.metadata };
  }
}

// ============================================================================
// Module Exports
// ============================================================================

/**
 * Export summary:
 * 
 * Default export: RefineBar class
 * 
 * Public methods:
 * - constructor(options)
 * - attach(parentContainer, metadata)
 * - detach()
 * - reset()
 * - destroy()
 * - showError(message)
 * - clearError()
 * - updateLanguage(lang)
 * 
 * Getters (for testing):
 * - getAttached() → boolean
 * - getInputValue() → string
 * - getMetadata() → object
 * 
 * Usage:
 * import RefineBar from './components/refine_bar.js';
 * 
 * const refineBar = new RefineBar({
 *   lang: 'en',
 *   onSubmit: (refinement) => handleRefinement(refinement)
 * });
 * 
 * // After displaying results:
 * refineBar.attach(resultsContainer, {
 *   hasHints: true,
 *   uncertaintyScore: 0.3
 * });
 */
