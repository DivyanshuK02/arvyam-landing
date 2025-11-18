/**
 * Cookie Consent Banner Component
 *
 * A WCAG 2.1 AA compliant consent banner for cookie management.
 * Supports granular consent options, i18n, keyboard navigation, and focus management.
 *
 * @module ConsentBanner
 * @version 1.0.2 - Fixed async translation rendering
 */

import { t } from '../i18n/strings.js';
import { detectLanguage } from '../i18n/lang_detect.js';

// Constants
const STORAGE_KEY = 'arvyam_consent';
const COOKIE_NAME = 'arvy_consent_v1';
const COOKIE_EXPIRY_DAYS = 365;

/**
 * ConsentBanner Class
 * Manages cookie consent UI and preferences
 */
export default class ConsentBanner {
  /**
   * Create a ConsentBanner instance
   * @param {Object} options - Configuration options
   * @param {Function} options.onConsentChange - Callback when consent changes
   */
  constructor(options = {}) {
    this.options = {
      onConsentChange: options.onConsentChange || null,
    };

    this.overlay = null;
    this.modal = null;
    this.focusedElementBeforeOpen = null;
    this.isCustomizeMode = false;
    this.currentLanguage = detectLanguage();

    // Bind methods
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleLanguageChange = this.handleLanguageChange.bind(this);

    // Listen for language changes (support both event names)
    window.addEventListener('language-change', this.handleLanguageChange);
    window.addEventListener('language-changed', this.handleLanguageChange);
  }

  /**
   * Handle language change events
   * @param {CustomEvent} event - Language change event
   */
  async handleLanguageChange(event) {
    this.currentLanguage = event.detail.language;
    // Re-render modal if it's currently shown
    if (this.modal && document.body.contains(this.modal)) {
      this.hide();
      await this.show();
    }
  }

  /**
   * Get current consent from localStorage
   * @returns {Object|null} Consent object or null
   */
  getConsent() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const consent = JSON.parse(stored);
      // Validate consent object
      if (consent && typeof consent === 'object' && consent.timestamp) {
        return consent;
      }
      return null;
    } catch (e) {
      console.warn('[ConsentBanner] Failed to read consent:', e);
      return null;
    }
  }

  /**
   * Check if user has given consent
   * @returns {boolean} True if consent exists
   */
  hasConsent() {
    return this.getConsent() !== null;
  }

  /**
   * Save consent to localStorage and cookie
   * @param {Object} consent - Consent preferences
   * @param {boolean} consent.functional - Functional cookies (always true)
   * @param {boolean} consent.analytics - Analytics cookies
   * @param {string} consent.timestamp - ISO timestamp
   */
  saveConsent(consent) {
    const consentData = {
      functional: true, // Always enabled
      analytics: consent.analytics || false,
      timestamp: new Date().toISOString(),
    };

    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));

      // Set cookie
      this.setCookie(COOKIE_NAME, consentData.timestamp, COOKIE_EXPIRY_DAYS);

      // Emit custom event
      window.dispatchEvent(new CustomEvent('consent-changed', {
        detail: { consent: consentData }
      }));

      // Call callback
      if (typeof this.options.onConsentChange === 'function') {
        this.options.onConsentChange(consentData);
      }

      console.log('[ConsentBanner] Consent saved:', consentData);
    } catch (e) {
      console.error('[ConsentBanner] Failed to save consent:', e);
    }
  }

  /**
   * Set a cookie
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {number} days - Expiry in days
   */
  setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
  }

  /**
   * Show the consent banner
   */
  async show() {
    // Don't show if consent already exists
    if (this.hasConsent()) {
      console.log('[ConsentBanner] Consent already given, skipping modal');
      return;
    }

    // Store currently focused element
    this.focusedElementBeforeOpen = document.activeElement;

    // Create modal (await translations)
    await this.createModal();

    // Add to DOM
    document.body.appendChild(this.overlay);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Focus first interactive element
    setTimeout(() => {
      const firstButton = this.modal.querySelector('button');
      if (firstButton) firstButton.focus();
    }, 100);

    // Add keyboard listener
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Hide the consent banner
   */
  hide() {
    if (this.overlay && document.body.contains(this.overlay)) {
      // Remove from DOM
      document.body.removeChild(this.overlay);

      // Restore body scroll
      document.body.style.overflow = '';

      // Remove keyboard listener
      document.removeEventListener('keydown', this.handleKeyDown);

      // Return focus
      if (this.focusedElementBeforeOpen) {
        this.focusedElementBeforeOpen.focus();
      }

      // Clean up references
      this.overlay = null;
      this.modal = null;
      this.isCustomizeMode = false;
    }
  }

  /**
   * Handle keyboard events (ESC, Tab for focus trap)
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    if (!this.modal) return;

    // ESC key - Reject non-essential
    if (event.key === 'Escape') {
      event.preventDefault();
      this.handleRejectNonEssential();
      return;
    }

    // Tab key - Focus trap
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  /**
   * Trap focus within modal
   * @param {KeyboardEvent} event - Tab key event
   */
  trapFocus(event) {
    const focusableElements = this.modal.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Create modal HTML structure
   */
  async createModal() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'consent-overlay';
    this.overlay.setAttribute('aria-hidden', 'false');

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'consent-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'consent-title');
    this.modal.setAttribute('aria-describedby', 'consent-explanation');

    // Create card
    const card = document.createElement('div');
    card.className = 'consent-card';

    // Close button (P0-4 spec requirement)
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'consent-close';
    closeButton.setAttribute('aria-label', 'Close banner');
    closeButton.textContent = '✕';
    closeButton.addEventListener('click', () => this.handleRejectNonEssential());

    // Title
    const title = document.createElement('h2');
    title.id = 'consent-title';
    title.className = 'consent-title';
    title.textContent = await t('consent.title', this.currentLanguage);

    // Explanation
    const explanation = document.createElement('p');
    explanation.id = 'consent-explanation';
    explanation.className = 'consent-explanation';
    explanation.textContent = await t('consent.explanation', this.currentLanguage);

    // Checkbox group (initially hidden in simple mode)
    const checkboxGroup = await this.createCheckboxGroup();

    // Buttons
    const buttons = await this.createButtons();

    // Assemble card
    card.appendChild(closeButton);
    card.appendChild(title);
    card.appendChild(explanation);
    card.appendChild(checkboxGroup);
    card.appendChild(buttons);

    this.modal.appendChild(card);
    this.overlay.appendChild(this.modal);
  }

  /**
   * Create checkbox group for granular consent
   * @returns {HTMLElement} Checkbox group element
   */
  async createCheckboxGroup() {
    const group = document.createElement('div');
    group.className = 'consent-checkbox-group';
    group.style.display = 'none'; // Hidden by default

    // Fetch all translations at once
    const [functionalLabel, functionalDesc, analyticsLabel, analyticsDesc] = await Promise.all([
      t('consent.functional', this.currentLanguage),
      t('consent.functionalDesc', this.currentLanguage),
      t('consent.analytics', this.currentLanguage),
      t('consent.analyticsDesc', this.currentLanguage),
    ]);

    // Functional cookies (required, disabled)
    const functionalItem = this.createCheckboxItem({
      id: 'consent-functional',
      name: 'functional',
      label: functionalLabel,
      description: functionalDesc,
      checked: true,
      disabled: true,
      required: true
    });

    // Analytics cookies (optional)
    const analyticsItem = this.createCheckboxItem({
      id: 'consent-analytics',
      name: 'analytics',
      label: analyticsLabel,
      description: analyticsDesc,
      checked: false,
      disabled: false,
      required: false
    });

    // TODO: Marketing cookies (hidden for now)
    // Will be added in future iteration when marketing features are implemented
    // const marketingItem = this.createCheckboxItem({
    //   id: 'consent-marketing',
    //   name: 'marketing',
    //   label: t('consent.marketing'),
    //   description: t('consent.marketingDesc'),
    //   checked: false,
    //   disabled: false,
    //   required: false
    // });

    group.appendChild(functionalItem);
    group.appendChild(analyticsItem);

    return group;
  }

  /**
   * Create individual checkbox item
   * @param {Object} options - Checkbox options
   * @returns {HTMLElement} Checkbox item element
   */
  createCheckboxItem(options) {
    const item = document.createElement('div');
    item.className = 'consent-checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = options.id;
    checkbox.name = options.name;
    checkbox.checked = options.checked;
    checkbox.disabled = options.disabled;
    checkbox.className = 'consent-checkbox';
    checkbox.setAttribute('aria-describedby', `${options.id}-desc`);

    const labelWrapper = document.createElement('div');
    labelWrapper.className = 'consent-checkbox-label-wrapper';

    const label = document.createElement('label');
    label.htmlFor = options.id;
    label.className = 'consent-checkbox-label';
    label.textContent = options.label;

    if (options.required) {
      const required = document.createElement('span');
      required.className = 'consent-required';
      required.textContent = ' (Required)';
      label.appendChild(required);
    }

    const description = document.createElement('p');
    description.id = `${options.id}-desc`;
    description.className = 'consent-checkbox-description';
    description.textContent = options.description;

    labelWrapper.appendChild(label);
    labelWrapper.appendChild(description);

    item.appendChild(checkbox);
    item.appendChild(labelWrapper);

    return item;
  }

  /**
   * Create button group
   * @returns {HTMLElement} Button group element
   */
  async createButtons() {
    const container = document.createElement('div');
    container.className = 'consent-buttons';

    // Fetch all button translations at once
    const [acceptText, rejectText, customizeText] = await Promise.all([
      t('consent.acceptAll', this.currentLanguage),
      t('consent.rejectNonEssential', this.currentLanguage),
      t('consent.customize', this.currentLanguage),
    ]);

    // Accept All button
    const acceptAll = document.createElement('button');
    acceptAll.className = 'consent-btn consent-btn-primary';
    acceptAll.textContent = acceptText;
    acceptAll.setAttribute('aria-label', acceptText);
    acceptAll.addEventListener('click', () => this.handleAcceptAll());

    // Reject Non-Essential button
    const rejectNonEssential = document.createElement('button');
    rejectNonEssential.className = 'consent-btn consent-btn-secondary';
    rejectNonEssential.textContent = rejectText;
    rejectNonEssential.setAttribute('aria-label', rejectText);
    rejectNonEssential.addEventListener('click', () => this.handleRejectNonEssential());

    // Customize button
    const customize = document.createElement('button');
    customize.className = 'consent-btn consent-btn-tertiary';
    customize.textContent = customizeText;
    customize.setAttribute('aria-label', customizeText);
    customize.addEventListener('click', () => this.handleCustomize());

    container.appendChild(acceptAll);
    container.appendChild(rejectNonEssential);
    container.appendChild(customize);

    return container;
  }

  /**
   * Handle "Accept All" button click
   */
  handleAcceptAll() {
    this.saveConsent({
      functional: true,
      analytics: true
    });
    this.hide();
  }

  /**
   * Handle "Reject Non-Essential" button click
   */
  handleRejectNonEssential() {
    this.saveConsent({
      functional: true,
      analytics: false
    });
    this.hide();
  }

  /**
   * Handle "Customize" button click
   */
  async handleCustomize() {
    if (this.isCustomizeMode) return;

    this.isCustomizeMode = true;

    // Show checkbox group
    const checkboxGroup = this.modal.querySelector('.consent-checkbox-group');
    if (checkboxGroup) {
      checkboxGroup.style.display = 'block';
    }

    // Replace buttons with "Save Preferences"
    const buttonContainer = this.modal.querySelector('.consent-buttons');
    if (buttonContainer) {
      buttonContainer.innerHTML = '';

      const savePreferences = document.createElement('button');
      savePreferences.className = 'consent-btn consent-btn-primary consent-btn-full';
      
      // Fetch translation for save button
      const saveText = await t('consent.savePreferences', this.currentLanguage);
      savePreferences.textContent = saveText;
      savePreferences.setAttribute('aria-label', saveText);
      savePreferences.addEventListener('click', () => this.handleSavePreferences());

      buttonContainer.appendChild(savePreferences);

      // Focus the save button
      setTimeout(() => savePreferences.focus(), 100);
    }
  }

  /**
   * Handle "Save Preferences" button click
   */
  handleSavePreferences() {
    const analyticsCheckbox = this.modal.querySelector('#consent-analytics');

    this.saveConsent({
      functional: true,
      analytics: analyticsCheckbox ? analyticsCheckbox.checked : false
    });

    this.hide();
  }

  /**
   * Public API: Update language and re-render modal if shown
   * Used by app.js for language switching
   * @param {string} lang - Language code
   */
  async updateLanguage(lang) {
    this.currentLanguage = lang;
    if (this.modal && document.body.contains(this.modal)) {
      this.hide();
      await this.show();
    }
  }

  /**
   * Public API: Open the manage view (customize mode)
   * Used by PolicyFooter for "Cookie Settings" link
   */
  async openManageView() {
    await this.show();
    if (this.modal && document.body.contains(this.modal)) {
      await this.handleCustomize();
    }
  }

  /**
   * Destroy the banner and clean up
   */
  destroy() {
    this.hide();
    window.removeEventListener('language-change', this.handleLanguageChange);
    window.removeEventListener('language-changed', this.handleLanguageChange);
  }
}
