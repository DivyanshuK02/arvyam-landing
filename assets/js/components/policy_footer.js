/**
 * ARVYAM PolicyFooter Component
 * Step 9: Legal footer with Privacy, Terms, and Cookie Settings
 * 
 * Features:
 * - Displays links to Privacy Policy, Terms & Conditions
 * - Cookie Settings button opens ConsentBanner manage view
 * - Full i18n support with language-change event listener
 * - Progressive enhancement (attaches to #policy-footer or creates floating)
 * - Zero analytics/tracking
 * 
 * Constitutional Compliance:
 * - Guest-First: Clear, simple links with no jargon
 * - ARVY Persona: Calm typographic footer, minimal clutter
 * - Privacy: No tracking on footer interactions
 * 
 * Accessibility:
 * - Semantic <footer> with role="contentinfo"
 * - <nav> with aria-label for legal links
 * - Min 44px touch targets
 * - Visible focus indicators
 * - Keyboard navigable
 * 
 * @module PolicyFooter
 * @version 1.0.0
 */

import { t } from '../i18n/strings.js';

/**
 * PolicyFooter Class
 * Renders a legal footer with policy links and cookie settings
 */
export default class PolicyFooter {
  /**
   * Create a PolicyFooter instance
   * @param {Object} config - Configuration options
   * @param {string} config.lang - Language code (e.g., 'en', 'hi')
   * @param {string} config.privacyUrl - URL to Privacy Policy page
   * @param {string} config.termsUrl - URL to Terms & Conditions page
   * @param {string} config.copyrightYear - Copyright year (defaults to current year)
   * @param {string} config.companyName - Company name for copyright
   */
  constructor({
    lang = 'en',
    privacyUrl = '/privacy',
    termsUrl = '/terms',
    copyrightYear = new Date().getFullYear(),
    companyName = 'ARVYAM'
  } = {}) {
    this.lang = lang;
    this.privacyUrl = '/privacy.html';
    this.termsUrl = '/terms.html';
    this.copyrightYear = copyrightYear;
    this.companyName = companyName;
    this.container = null;
    this.manageButton = null;
    
    console.log('[PolicyFooter] Initialized with config:', {
      lang,
      privacyUrl,
      termsUrl,
      copyrightYear,
      companyName
    });
  }

  /**
   * Mount the footer to the DOM
   * Progressive enhancement: uses #policy-footer if exists, else creates new footer
   * @param {HTMLElement} [target] - Optional target element
   */
  async mount(target) {
    console.log('[PolicyFooter] Mounting...');
    
    // Find or create container
    let host = target;
    
    if (!host) {
      // Try to find #policy-footer in DOM
      host = document.getElementById('policy-footer');
      
      if (!host) {
        // Create new footer and append to body
        host = document.createElement('footer');
        host.id = 'policy-footer';
        document.body.appendChild(host);
        console.log('[PolicyFooter] Created new footer element');
      } else {
        console.log('[PolicyFooter] Attached to existing #policy-footer');
      }
    }
    
    // Set ARIA and classes
    host.classList.add('policy-footer');
    host.setAttribute('role', 'contentinfo');
    
    // Render content
    await this.render(host);
    
    this.container = host;
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('[PolicyFooter] Mounted successfully');
  }

  /**
   * Render footer content
   * @param {HTMLElement} host - Container element
   */
  async render(host) {
    // Clear existing content
    host.innerHTML = '';
    
    // Get translated strings
    const privacyText = await t('policy.privacy', this.lang);
    const termsText = await t('policy.terms', this.lang);
    const cookiesText = await t('policy.cookies', this.lang);
    const copyrightText = await t('policy.copyright', this.lang, {
      year: this.copyrightYear,
      company: this.companyName
    });
    const legalNavLabel = await t('policy.legal_nav', this.lang);
    
    // Create nav element
    const nav = document.createElement('nav');
    nav.classList.add('policy-footer__nav');
    nav.setAttribute('aria-label', legalNavLabel);
    
    // Create links and buttons
    nav.innerHTML = `
      <a 
        href="${this.privacyUrl}" 
        class="policy-footer__link" 
        target="_blank" 
        rel="noopener noreferrer"
        data-test="privacy-link"
      >
        ${privacyText}
      </a>
      
      <span class="policy-footer__separator" aria-hidden="true">·</span>
      
      <a 
        href="${this.termsUrl}" 
        class="policy-footer__link" 
        target="_blank" 
        rel="noopener noreferrer"
        data-test="terms-link"
      >
        ${termsText}
      </a>
      
      <span class="policy-footer__separator" aria-hidden="true">·</span>
      
      <button 
        type="button" 
        class="policy-footer__link policy-footer__manage" 
        data-test="cookies-link"
      >
        ${cookiesText}
      </button>
    `;
    
    host.appendChild(nav);
    
    // Create copyright line
    const copyright = document.createElement('p');
    copyright.classList.add('policy-footer__copyright');
    copyright.textContent = copyrightText;
    
    host.appendChild(copyright);
    
    // Cache manage button reference
    this.manageButton = nav.querySelector('.policy-footer__manage');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (!this.manageButton) {
      console.warn('[PolicyFooter] Manage button not found');
      return;
    }
    
    // Cookie Settings button opens ConsentBanner in manage mode
    this.manageButton.addEventListener('click', () => {
      console.log('[PolicyFooter] Cookie Settings clicked - opening ConsentBanner');
      
      // Dispatch custom event for ConsentBanner to listen for
      const event = new CustomEvent('consent:open-manage', {
        bubbles: true,
        detail: { source: 'policy-footer' }
      });
      
      document.dispatchEvent(event);
    });
  }

  /**
   * Update language and re-render
   * @param {string} lang - New language code
   */
  async updateLanguage(lang) {
    console.log(`[PolicyFooter] Language changed: ${this.lang} → ${lang}`);
    
    this.lang = lang;
    
    if (!this.container) {
      console.warn('[PolicyFooter] Container not found - cannot update language');
      return;
    }
    
    // Re-render with new language
    await this.render(this.container);
    
    // Re-attach event listeners
    this.setupEventListeners();
  }

  /**
   * Destroy the footer and clean up
   */
  destroy() {
    if (this.manageButton) {
      // Remove event listeners (they'll be garbage collected with the element)
      this.manageButton = null;
    }
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    
    console.log('[PolicyFooter] Destroyed');
  }
}
