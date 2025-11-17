/**
 * ARVYAM LanguageSwitch Component
 * Allows guests to switch between languages (EN/HI) without reload
 * 
 * Features:
 * - Single-line toggle with language labels
 * - Instant updates (CustomEvent broadcasts to all components)
 * - Persists choice to localStorage
 * - Full WCAG 2.1 AA compliance
 * - ARVY Persona: Calm, clean, no clutter
 * 
 * Constitutional Compliance:
 * - Guest-First: Simple, clear language selection
 * - Privacy: No analytics on language preference (functional only)
 * - ARVY Persona: Minimal UI, no jargon
 * 
 * @module LanguageSwitch
 * @version 1.0.0
 */

import { detectLanguage, setLanguage, SUPPORTED_LANGUAGES } from '../i18n/lang_detect.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const LANGUAGE_LABELS = {
  en: 'English',
  hi: 'हिंदी'
};

const DEFAULT_OPTIONS = {
  languages: ['en', 'hi'], // Step 8: EN/HI only (ta/te/bn placeholders for Phase 4)
  containerSelector: null, // If null, creates floating switch
  position: 'top-right', // top-right, top-left, bottom-right, bottom-left
  ariaLabel: 'Select language'
};

// ═══════════════════════════════════════════════════════════════════════════════
// LanguageSwitch Class
// ═══════════════════════════════════════════════════════════════════════════════

export default class LanguageSwitch {
  /**
   * Create a LanguageSwitch instance
   * @param {Object} options - Configuration options
   * @param {string} [options.lang='en'] - Initial language code
   * @param {Array<string>} [options.languages=['en','hi']] - Supported languages
   * @param {string} [options.containerSelector] - Optional container selector
   * @param {string} [options.position='top-right'] - Position if no container
   * @param {string} [options.ariaLabel] - ARIA label for group
   */
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.currentLang = options.lang || detectLanguage();
    this.container = null;
    this.buttons = new Map(); // lang -> button element
    
    // Lifecycle state
    this._isAttached = false;
    this._isDestroyed = false;
  }

  /**
   * Create DOM structure
   * @private
   */
  _createDOM() {
    // Container with role="group"
    const container = document.createElement('div');
    container.className = 'language-switch';
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', this.options.ariaLabel);
    
    // Create button for each language
    this.options.languages.forEach((lang, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'language-switch__button';
      button.dataset.lang = lang;
      button.textContent = LANGUAGE_LABELS[lang] || lang.toUpperCase();
      button.setAttribute('aria-label', `Switch to ${LANGUAGE_LABELS[lang] || lang}`);
      button.setAttribute('aria-pressed', lang === this.currentLang ? 'true' : 'false');
      
      // Add active class to current language
      if (lang === this.currentLang) {
        button.classList.add('language-switch__button--active');
      }
      
      // Event listeners
      button.addEventListener('click', () => this._handleSwitch(lang));
      button.addEventListener('keydown', (e) => this._handleKeyboard(e, index));
      
      this.buttons.set(lang, button);
      container.appendChild(button);
    });
    
    this.container = container;
    return container;
  }

  /**
   * Handle language switch
   * @private
   * @param {string} lang - Target language code
   */
  _handleSwitch(lang) {
    if (this._isDestroyed) return;
    if (lang === this.currentLang) return; // Already selected
    
    const previousLang = this.currentLang;
    this.currentLang = lang;
    
    // Update DOM
    this._updateButtonStates();
    
    // Update document lang attribute
    document.documentElement.lang = lang;
    
    // Persist to localStorage
    setLanguage(lang);
    
    // Emit CustomEvent for all components to update
    const event = new CustomEvent('language-change', {
      detail: { 
        lang, 
        previousLang 
      },
      bubbles: true,
      cancelable: false
    });
    
    window.dispatchEvent(event);
    
    // Announce to screen readers
    this._announceChange(lang);
  }

  /**
   * Handle keyboard navigation
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   * @param {number} currentIndex - Current button index
   */
  _handleKeyboard(event, currentIndex) {
    const { languages } = this.options;
    let targetIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        targetIndex = (currentIndex - 1 + languages.length) % languages.length;
        break;
        
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        targetIndex = (currentIndex + 1) % languages.length;
        break;
        
      case 'Home':
        event.preventDefault();
        targetIndex = 0;
        break;
        
      case 'End':
        event.preventDefault();
        targetIndex = languages.length - 1;
        break;
        
      case ' ':
      case 'Enter':
        // Activate current button (already handled by click)
        return;
        
      default:
        return; // Don't handle other keys
    }
    
    // Focus and activate target button
    const targetLang = languages[targetIndex];
    const targetButton = this.buttons.get(targetLang);
    
    if (targetButton) {
      targetButton.focus();
      this._handleSwitch(targetLang);
    }
  }

  /**
   * Update button states (aria-pressed, active class)
   * @private
   */
  _updateButtonStates() {
    this.buttons.forEach((button, lang) => {
      const isActive = lang === this.currentLang;
      
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.classList.toggle('language-switch__button--active', isActive);
    });
  }

  /**
   * Announce language change to screen readers
   * @private
   * @param {string} lang - New language code
   */
  _announceChange(lang) {
    const announcement = `Language changed to ${LANGUAGE_LABELS[lang] || lang}`;
    
    // Create or update live region
    let liveRegion = document.getElementById('language-switch-live');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'language-switch-live';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only'; // Visually hidden
      document.body.appendChild(liveRegion);
    }
    
    // Clear and set new announcement
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion.textContent = announcement;
    }, 100);
  }

  /**
   * Attach component to DOM
   * @param {string|HTMLElement} target - Target container or selector
   * @returns {LanguageSwitch} this
   */
  attach(target) {
    if (this._isDestroyed) {
      console.warn('[LanguageSwitch] Cannot attach destroyed instance');
      return this;
    }
    
    if (this._isAttached) {
      console.warn('[LanguageSwitch] Already attached');
      return this;
    }
    
    // Resolve target
    const targetElement = typeof target === 'string'
      ? document.querySelector(target)
      : target;
    
    if (!targetElement) {
      console.error('[LanguageSwitch] Target element not found:', target);
      return this;
    }
    
    // Create DOM if not already created
    if (!this.container) {
      this._createDOM();
    }
    
    // Append to target
    targetElement.appendChild(this.container);
    this._isAttached = true;
    
    // Set initial language (sync with current state)
    if (this.currentLang) {
      this._updateButtonStates();
    }
    
    return this;
  }

  /**
   * Detach component from DOM
   * @returns {LanguageSwitch} this
   */
  detach() {
    if (!this._isAttached) return this;
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    this._isAttached = false;
    return this;
  }

  /**
   * Update language programmatically
   * @param {string} lang - Target language code
   * @returns {LanguageSwitch} this
   */
  updateLanguage(lang) {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      this._handleSwitch(lang);
    }
    return this;
  }

  /**
   * Get current language
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.currentLang;
  }

  /**
   * Destroy component and clean up
   */
  destroy() {
    if (this._isDestroyed) return;
    
    // Detach from DOM
    this.detach();
    
    // Remove event listeners
    this.buttons.forEach(button => {
      button.replaceWith(button.cloneNode(true)); // Remove all listeners
    });
    
    // Clear references
    this.buttons.clear();
    this.container = null;
    this._isDestroyed = true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility: Create floating language switch (if no container provided)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a floating language switch (top-right corner by default)
 * @param {Object} options - Options for LanguageSwitch
 * @returns {LanguageSwitch} Language switch instance
 */
export function createFloatingSwitch(options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `language-switch-floating language-switch-floating--${options.position || 'top-right'}`;
  document.body.appendChild(wrapper);
  
  const languageSwitch = new LanguageSwitch(options);
  languageSwitch.attach(wrapper);
  
  return languageSwitch;
}
