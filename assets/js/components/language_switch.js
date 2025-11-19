/**
 * ARVYAM LanguageSwitch Component (A3: Footer-Right Pill)
 * Simplified language toggle for footer placement
 * 
 * Features:
 * - Mounts into #policy-footer as a right-aligned pill
 * - English | हिंदी toggle button
 * - Instant language switching with CustomEvent broadcast
 * - Persists choice with manual_lang flag
 * - Full WCAG 2.1 AA compliance
 * 
 * Constitutional Compliance:
 * - Guest-First: Simple, clear language selection
 * - Privacy: No analytics on language preference (functional only)
 * - ARVY Persona: Minimal UI, no jargon
 * 
 * @module LanguageSwitch
 * @version 2.0.0 (A3: Footer-right pill)
 */

import { detectLanguage, setLanguage } from '../i18n/lang_detect.js';

/**
 * LanguageSwitch Class
 * Footer-mounted language toggle
 */
export default class LanguageSwitch {
  /**
   * Create a LanguageSwitch instance
   * @param {Object} opts - Configuration options
   * @param {string} [opts.lang] - Initial language code
   * @param {Function} [opts.onChange] - Callback when language changes
   * @param {string} [opts.anchorSelector] - Selector for mount point (default: #policy-footer)
   */
  constructor(opts = {}) {
    this.lang = opts.lang || detectLanguage();
    this.onChange = opts.onChange || (() => {});
    this.anchorSelector = opts.anchorSelector || '#policy-footer';
    this.el = null;
  }

  /**
   * Mount the language switch into the footer
   * Creates a pill button with English | हिंदी toggle
   */
  mount() {
    const host = document.querySelector(this.anchorSelector);
    if (!host) {
      console.warn('[LanguageSwitch] Anchor not found:', this.anchorSelector);
      return;
    }

    // Create pill container
    this.el = document.createElement('div');
    this.el.className = 'lang-pill';
    this.el.setAttribute('role', 'group');
    this.el.setAttribute('aria-label', 'Language selection');

    // Get current language from localStorage (with manual flag check)
    const storedLang = localStorage.getItem('arvyam_lang') || 'en';
    const isManual = localStorage.getItem('manual_lang') === 'true';
    this.lang = storedLang;

    // Create toggle button with both languages visible
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lang-pill__btn';
    button.setAttribute('aria-label', 'Change language');

    // Build button content: English | हिंदी (with current language emphasized)
    const enSpan = document.createElement('span');
    enSpan.dataset.lang = 'en';
    enSpan.textContent = 'English';
    enSpan.className = this.lang === 'en' ? 'lang-pill__active' : '';

    const separator = document.createElement('span');
    separator.className = 'lang-pill__sep';
    separator.textContent = ' | ';
    separator.setAttribute('aria-hidden', 'true');

    const hiSpan = document.createElement('span');
    hiSpan.dataset.lang = 'hi';
    hiSpan.textContent = 'हिंदी';
    hiSpan.className = this.lang === 'hi' ? 'lang-pill__active' : '';

    button.appendChild(enSpan);
    button.appendChild(separator);
    button.appendChild(hiSpan);

    // Click handler: toggle between EN and HI
    button.addEventListener('click', () => {
      const current = localStorage.getItem('arvyam_lang') || 'en';
      const next = current === 'en' ? 'hi' : 'en';

      // Update localStorage with manual flag
      localStorage.setItem('arvyam_lang', next);
      localStorage.setItem('manual_lang', 'true'); // Manual choice wins over auto-detect

      // Update visual state
      enSpan.className = next === 'en' ? 'lang-pill__active' : '';
      hiSpan.className = next === 'hi' ? 'lang-pill__active' : '';

      // Update document lang
      document.documentElement.lang = next;

      // Dispatch custom event for components to listen
      const event = new CustomEvent('arvy:language', {
        detail: { lang: next, from: current, trigger: 'manual_footer_pill' },
        bubbles: true,
        cancelable: false
      });
      document.dispatchEvent(event);

      // Call onChange callback
      this.onChange(next);

      console.log(`[LanguageSwitch] Language changed: ${current} → ${next}`);
    });

    this.el.appendChild(button);
    host.appendChild(this.el);

    console.log('[LanguageSwitch] Mounted to', this.anchorSelector);
  }

  /**
   * Update language programmatically
   * @param {string} lang - Language code ('en' or 'hi')
   */
  updateLanguage(lang) {
    if (!this.el) return;

    this.lang = lang;
    localStorage.setItem('arvyam_lang', lang);

    // Update visual state
    const enSpan = this.el.querySelector('[data-lang="en"]');
    const hiSpan = this.el.querySelector('[data-lang="hi"]');

    if (enSpan) enSpan.className = lang === 'en' ? 'lang-pill__active' : '';
    if (hiSpan) hiSpan.className = lang === 'hi' ? 'lang-pill__active' : '';
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
  }
}
