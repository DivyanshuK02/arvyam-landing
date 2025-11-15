/**
 * ARVYAM Cookie Consent Banner
 * Handles cookie consent with i18n support
 */

import { t, preloadStringbanks } from '../i18n/strings.js';
import { detectLanguage, setLanguage } from '../i18n/lang_detect.js';

const CONSENT_STORAGE_KEY = 'arvyam_cookie_consent';
const BANNER_VISIBLE_CLASS = 'visible';

/**
 * Cookie consent banner class
 */
export class ConsentBanner {
  constructor() {
    this.banner = null;
    this.lang = detectLanguage();
    this.isInitialized = false;
  }

  /**
   * Initialize the consent banner
   */
  async init() {
    if (this.isInitialized) {
      return;
    }

    // Preload stringbanks for current language and fallback
    await preloadStringbanks([this.lang, 'en']);

    // Set the language
    setLanguage(this.lang);

    // Check if user has already given consent
    if (this.hasConsent()) {
      this.isInitialized = true;
      return;
    }

    // Create and show banner
    await this.createBanner();
    this.showBanner();
    this.isInitialized = true;
  }

  /**
   * Check if user has already given consent
   * @returns {boolean} True if consent was given
   */
  hasConsent() {
    try {
      return localStorage.getItem(CONSENT_STORAGE_KEY) === 'accepted';
    } catch (error) {
      console.warn('Error checking consent status:', error);
      return false;
    }
  }

  /**
   * Save consent status
   * @param {string} status - Consent status ('accepted' or 'rejected')
   */
  saveConsent(status) {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, status);
    } catch (error) {
      console.error('Error saving consent:', error);
    }
  }

  /**
   * Create the banner DOM element
   */
  async createBanner() {
    // Get translated strings
    const title = await t('consent.title', this.lang);
    const message = await t('consent.message', this.lang);
    const acceptBtn = await t('consent.accept', this.lang);
    const rejectBtn = await t('consent.reject', this.lang);
    const learnMore = await t('consent.learnMore', this.lang);
    const privacyUrl = await t('consent.privacyUrl', this.lang);

    // Create banner element
    this.banner = document.createElement('div');
    this.banner.className = 'consent-banner';
    this.banner.setAttribute('role', 'dialog');
    this.banner.setAttribute('aria-labelledby', 'consent-title');
    this.banner.setAttribute('aria-describedby', 'consent-message');

    this.banner.innerHTML = `
      <div class="consent-content">
        <div class="consent-text">
          <h2 id="consent-title" class="consent-title">${title}</h2>
          <p id="consent-message" class="consent-message">
            ${message}
            <a href="${privacyUrl}" class="consent-link" target="_blank" rel="noopener noreferrer">
              ${learnMore}
            </a>
          </p>
        </div>
        <div class="consent-actions">
          <button type="button" class="consent-btn consent-btn-accept" data-action="accept">
            ${acceptBtn}
          </button>
          <button type="button" class="consent-btn consent-btn-reject" data-action="reject">
            ${rejectBtn}
          </button>
        </div>
      </div>
    `;

    // Attach event listeners
    this.attachEventListeners();

    // Append to body
    document.body.appendChild(this.banner);
  }

  /**
   * Attach event listeners to banner buttons
   */
  attachEventListeners() {
    if (!this.banner) {
      return;
    }

    const acceptBtn = this.banner.querySelector('[data-action="accept"]');
    const rejectBtn = this.banner.querySelector('[data-action="reject"]');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => this.handleAccept());
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => this.handleReject());
    }
  }

  /**
   * Handle accept button click
   */
  handleAccept() {
    this.saveConsent('accepted');
    this.hideBanner();

    // Trigger custom event for other scripts
    window.dispatchEvent(new CustomEvent('arvyam:consent', {
      detail: { status: 'accepted' }
    }));
  }

  /**
   * Handle reject button click
   */
  handleReject() {
    this.saveConsent('rejected');
    this.hideBanner();

    // Trigger custom event for other scripts
    window.dispatchEvent(new CustomEvent('arvyam:consent', {
      detail: { status: 'rejected' }
    }));
  }

  /**
   * Show the banner
   */
  showBanner() {
    if (!this.banner) {
      return;
    }

    // Use setTimeout to ensure CSS transition works
    setTimeout(() => {
      this.banner.classList.add(BANNER_VISIBLE_CLASS);
    }, 100);
  }

  /**
   * Hide the banner
   */
  hideBanner() {
    if (!this.banner) {
      return;
    }

    this.banner.classList.remove(BANNER_VISIBLE_CLASS);

    // Remove from DOM after transition
    setTimeout(() => {
      if (this.banner && this.banner.parentNode) {
        this.banner.parentNode.removeChild(this.banner);
      }
      this.banner = null;
    }, 300);
  }

  /**
   * Change the banner language
   * @param {string} newLang - New language code
   */
  async changeLanguage(newLang) {
    this.lang = newLang;
    setLanguage(newLang);

    // Preload new language
    await preloadStringbanks([newLang, 'en']);

    // Recreate banner if it's visible
    if (this.banner) {
      this.hideBanner();
      setTimeout(async () => {
        await this.createBanner();
        this.showBanner();
      }, 300);
    }
  }
}

// Create and export singleton instance
const consentBanner = new ConsentBanner();
export default consentBanner;

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    consentBanner.init().catch(error => {
      console.error('Error initializing consent banner:', error);
    });
  });
} else {
  // DOM already loaded
  consentBanner.init().catch(error => {
    console.error('Error initializing consent banner:', error);
  });
}
