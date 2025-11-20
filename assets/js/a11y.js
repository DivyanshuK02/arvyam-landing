/**
 * ARVYAM Accessibility Helpers
 * Focus management, live regions, keyboard navigation utilities
 * WCAG 2.1 AA compliance helpers
 * 
 * Constitutional Compliance:
 * - Guest-First: Simple, clear accessibility features
 * - ARVY Persona: Calm announcements, no technical jargon
 * - Privacy: No PII in announcements or logs
 * 
 * @module a11y
 * @version 1.0.0
 */

// ============================================================================
// Live Announcer (for screen readers)
// ============================================================================

let liveRegion = null;

/**
 * Initialize the live announcer region
 * Creates a screen reader-only div with aria-live attribute
 * Should be called once during app initialization
 */
export function announcerInit() {
  if (liveRegion) {
    console.warn('[A11y] Live announcer already initialized');
    return;
  }
  
  liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.id = 'arvy-live-announcer';
  document.body.appendChild(liveRegion);
  
  console.log('[A11y] Live announcer initialized');
}

/**
 * Announce a message to screen readers
 * Uses polite aria-live region to avoid interrupting user
 * 
 * @param {string} message - Message to announce
 * 
 * @example
 * announce('Loading arrangements...');
 * announce('Showing 3 arrangements.');
 */
export function announce(message) {
  if (!liveRegion) {
    console.warn('[A11y] Live announcer not initialized, initializing now');
    announcerInit();
  }
  
  if (!message || typeof message !== 'string') {
    console.warn('[A11y] Invalid announcement message:', message);
    return;
  }
  
  // Clear first to force screen reader to re-announce
  liveRegion.textContent = '';
  
  // Small delay so screen readers pick up the text change
  setTimeout(() => {
    liveRegion.textContent = message;
    console.log('[A11y] Announced:', message);
  }, 100);
}

// ============================================================================
// Focus Trap (for modals/dialogs)
// ============================================================================

/**
 * Trap focus within a container element
 * Cycles Tab/Shift+Tab between first and last focusable elements
 * 
 * @param {HTMLElement} container - Container to trap focus within
 * @returns {Function} Cleanup function to release the trap and restore focus
 * 
 * @example
 * const releaseTrap = trapFocusOpen(dialogElement);
 * // Later...
 * releaseTrap(); // Removes trap and restores focus
 */
export function trapFocusOpen(container) {
  if (!container) {
    console.warn('[A11y] Focus trap: No container provided');
    return () => {};
  }
  
  // Find all focusable elements
  const focusableSelector = 
    'a[href], button:not([disabled]), input:not([disabled]), ' +
    'textarea:not([disabled]), select:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"])';
  
  const focusableElements = container.querySelectorAll(focusableSelector);
  
  if (focusableElements.length === 0) {
    console.warn('[A11y] Focus trap: No focusable elements found');
    return () => {};
  }
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  // Store previously focused element to restore later
  const previouslyFocused = document.activeElement;
  
  // Focus first element
  firstFocusable.focus();
  
  /**
   * Handle Tab key to cycle focus
   * @param {KeyboardEvent} e - Keyboard event
   */
  function onKeyDown(e) {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab (forward)
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }
  
  container.addEventListener('keydown', onKeyDown);
  
  console.log('[A11y] Focus trap activated');
  
  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', onKeyDown);
    
    // Restore focus to previously focused element
    if (previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }
    
    console.log('[A11y] Focus trap released');
  };
}

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

/**
 * Enable global keyboard shortcuts
 * - / (forward slash): Focus main search input
 * - Escape: Close modals/dialogs
 * 
 * Should be called once during app initialization
 */
export function enableKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Forward slash (/) focuses search
    // Only if not already in an input field
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target;
      const isInputField = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;
      
      if (!isInputField) {
        const searchInput = document.getElementById('feelings-input');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          console.log('[A11y] Focused search input via "/" shortcut');
        }
      }
    }
    
    // Escape closes modals
    if (e.key === 'Escape') {
      // Close hint form if visible
      const hintForm = document.getElementById('hint-form-section');
      if (hintForm && !hintForm.hasAttribute('hidden')) {
        hintForm.setAttribute('hidden', '');
        
        // Return focus to toggle button
        const toggleBtn = document.getElementById('hints-toggle');
        if (toggleBtn) {
          toggleBtn.focus();
          console.log('[A11y] Closed hint form via Escape, focus restored to toggle');
        }
      }
      
      // Consent banner will handle its own Escape via internal handler
    }
  });
  
  console.log('[A11y] Keyboard shortcuts enabled');
}

// ============================================================================
// Reduced Motion Support
// ============================================================================

/**
 * Respect user's reduced motion preference
 * Adds .reduced-motion class to <html> if prefers-reduced-motion is set
 * Should be called early in app initialization
 */
export function respectReducedMotion() {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  function applyReducedMotion() {
    if (mediaQuery.matches) {
      document.documentElement.classList.add('reduced-motion');
      console.log('[A11y] Reduced motion enabled');
    } else {
      document.documentElement.classList.remove('reduced-motion');
      console.log('[A11y] Reduced motion disabled');
    }
  }
  
  // Apply on load
  applyReducedMotion();
  
  // Listen for changes (user might toggle system preference)
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', applyReducedMotion);
  } else if (mediaQuery.addListener) {
    // Legacy support for older browsers
    mediaQuery.addListener(applyReducedMotion);
  }
}

// ============================================================================
// ARIA Helpers
// ============================================================================

/**
 * Set aria-expanded attribute
 * @param {HTMLElement} element - Element to update
 * @param {boolean} isExpanded - Whether element is expanded
 */
export function setAriaExpanded(element, isExpanded) {
  if (!element) return;
  element.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
}

/**
 * Set aria-hidden attribute
 * @param {HTMLElement} element - Element to update
 * @param {boolean} isHidden - Whether element is hidden
 */
export function setAriaHidden(element, isHidden) {
  if (!element) return;
  element.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
}

/**
 * Set aria-invalid attribute for form validation
 * @param {HTMLElement} element - Input element to update
 * @param {boolean} isInvalid - Whether input is invalid
 * @param {string} [errorId] - Optional ID of error message element
 */
export function setAriaInvalid(element, isInvalid, errorId = null) {
  if (!element) return;
  
  element.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
  
  if (isInvalid && errorId) {
    element.setAttribute('aria-describedby', errorId);
  } else if (!isInvalid) {
    element.removeAttribute('aria-describedby');
  }
}

// ============================================================================
// Touch Target Validation (for development/testing)
// ============================================================================

/**
 * Check for insufficient touch targets
 * Logs warnings for interactive elements < 44px
 * For development use - should not run in production
 * 
 * @param {boolean} [logWarnings=true] - Whether to log warnings
 * @returns {Array} Array of elements with insufficient touch targets
 */
export function validateTouchTargets(logWarnings = true) {
  const interactiveElements = document.querySelectorAll(
    'button, a[href], input, select, textarea, [role="button"]'
  );
  
  const insufficientTargets = [];
  
  interactiveElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    
    // Skip if element is hidden
    if (rect.width === 0 || rect.height === 0) return;
    
    // Check if element is too small (< 44px minimum)
    if (rect.width < 44 || rect.height < 44) {
      insufficientTargets.push({
        element: el,
        width: rect.width,
        height: rect.height
      });
      
      if (logWarnings) {
        console.warn(
          `[A11y] Touch target too small (${rect.width}x${rect.height}):`,
          el
        );
      }
    }
  });
  
  return insufficientTargets;
}

// ============================================================================
// Initialization Helper
// ============================================================================

/**
 * Initialize all accessibility features
 * Call this once during app startup
 * 
 * @example
 * import { initAccessibility } from './assets/js/a11y.js';
 * 
 * document.addEventListener('DOMContentLoaded', () => {
 *   initAccessibility();
 *   // ... rest of app initialization
 * });
 */
export function initAccessibility() {
  console.log('[A11y] Initializing accessibility features...');
  
  // Apply reduced motion preference
  respectReducedMotion();
  
  // Initialize live announcer
  announcerInit();
  
  // Enable keyboard shortcuts
  enableKeyboardShortcuts();
  
  // Validate images have alt text
  const images = document.querySelectorAll('img:not([alt])');
  if (images.length > 0) {
    console.warn(`[A11y] Found ${images.length} images without alt text`);
  }
  
  // Validate buttons have accessible names
  const buttons = document.querySelectorAll(
    'button:not([aria-label]):not([aria-labelledby])'
  );
  buttons.forEach(btn => {
    if (!btn.textContent.trim()) {
      console.warn('[A11y] Button without accessible name:', btn);
    }
  });
  
  console.log('[A11y] Accessibility initialization complete');
}

// ============================================================================
// Module Exports Summary
// ============================================================================

/**
 * Exported functions:
 * 
 * Core:
 * - initAccessibility() - Initialize all a11y features
 * 
 * Live Announcer:
 * - announcerInit() - Initialize live region
 * - announce(message) - Announce to screen readers
 * 
 * Focus Management:
 * - trapFocusOpen(container) - Trap focus in container, returns cleanup fn
 * 
 * Motion:
 * - respectReducedMotion() - Apply reduced motion preference
 * 
 * Keyboard:
 * - enableKeyboardShortcuts() - Enable / and Escape shortcuts
 * 
 * ARIA:
 * - setAriaExpanded(element, isExpanded)
 * - setAriaHidden(element, isHidden)
 * - setAriaInvalid(element, isInvalid, errorId)
 * 
 * Development:
 * - validateTouchTargets(logWarnings) - Check touch target sizes
 */
