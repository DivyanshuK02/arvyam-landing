/**
 * ARVYAM Result Card Component
 * Displays a single curated bouquet with image, title, subtitle, description, and CTA
 * Phase 2 UI/UX - Step 5
 */

import { t } from '../i18n/strings.js';

/**
 * ResultCard class - Displays a single bouquet result
 * @class
 */
export default class ResultCard {
  /**
   * Create a ResultCard
   * @param {Object} data - Bouquet data
   * @param {string} data.id - Unique bouquet ID
   * @param {string} data.name - Bouquet name (1-2 words)
   * @param {string} data.occasion - Occasion/relationship hint (3-5 words)
   * @param {string} data.description - Brief description (≤25 words)
   * @param {string} data.imageWebp - Path to WebP image
   * @param {string} data.imageJpg - Path to JPG fallback image
   * @param {string} [data.imageAlt] - Optional alt text override
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.lang='en'] - Language code
   * @param {boolean} [options.lazyLoad=true] - Enable lazy loading
   * @param {string} [options.aspectRatio='4/3'] - CSS aspect ratio
   * @param {Function} [options.onSelect] - Callback when card is selected
   */
  constructor(data, options = {}) {
    this.data = data;
    this.options = {
      lang: 'en',
      lazyLoad: true,
      aspectRatio: '4/3',
      onSelect: null,
      ...options
    };

    this.element = null;
    this.boundHandlers = new Map();
    this.cardId = `result-card-${data.id}`;
    this.titleId = `${this.cardId}-title`;
  }

  /**
   * Renders the skeleton loading state
   * @returns {HTMLElement} Skeleton card element
   */
  renderSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'result-card skeleton-card';
    skeleton.setAttribute('aria-busy', 'true');
    skeleton.setAttribute('aria-label', 'Loading bouquet...');

    skeleton.innerHTML = `
      <div class="skeleton__image"></div>
      <div class="skeleton__content">
        <div class="skeleton__text skeleton__text--title"></div>
        <div class="skeleton__text skeleton__text--subtitle"></div>
        <div class="skeleton__text skeleton__text--line"></div>
        <div class="skeleton__text skeleton__text--line"></div>
        <div class="skeleton__text skeleton__text--button"></div>
      </div>
    `;

    return skeleton;
  }

  /**
   * Renders the complete card element
   * @returns {Promise<HTMLElement>} Card element
   */
  async render() {
    const card = document.createElement('article');
    card.className = 'result-card';
    card.id = this.cardId;
    card.setAttribute('role', 'article');
    card.setAttribute('tabindex', '0');
    card.setAttribute('data-bouquet-id', this.data.id);

    // Get translated strings
    const [title, subtitle, description, ctaText, altText] = await Promise.all([
      t('result.title', this.options.lang, { name: this.data.name }),
      t('result.subtitle', this.options.lang, { occasion: this.data.occasion }),
      t('result.description', this.options.lang, { description: this.data.description }),
      t('result.cta', this.options.lang),
      this.data.imageAlt
        ? Promise.resolve(this.data.imageAlt)
        : t('result.image_alt', this.options.lang, { name: this.data.name })
    ]);

    card.innerHTML = `
      <div class="result-card__image-wrapper">
        <picture class="result-card__picture">
          <source srcset="${this.escapeHtml(this.data.imageWebp)}" type="image/webp">
          <img
            src="${this.escapeHtml(this.data.imageJpg)}"
            alt="${this.escapeHtml(altText)}"
            ${this.options.lazyLoad ? 'loading="lazy"' : ''}
            class="result-card__image"
            style="aspect-ratio: ${this.options.aspectRatio}"
          >
        </picture>
      </div>

      <div class="result-card__content">
        <h3 class="result-card__title" id="${this.titleId}">
          ${this.escapeHtml(title)}
        </h3>

        <p class="result-card__subtitle">
          ${this.escapeHtml(subtitle)}
        </p>

        <p class="result-card__description">
          ${this.escapeHtml(description)}
        </p>

        <button
          type="button"
          class="result-card__cta"
          aria-label="${this.escapeHtml(ctaText)} - ${this.escapeHtml(title)}"
        >
          ${this.escapeHtml(ctaText)}
        </button>
      </div>
    `;

    // Set aria-labelledby to title
    card.setAttribute('aria-labelledby', this.titleId);

    this.element = card;
    this.bindEvents();

    return card;
  }

  /**
   * Binds event listeners to the card
   */
  bindEvents() {
    if (!this.element) return;

    // Click handler for card
    const handleCardClick = (e) => {
      // Don't trigger if clicking directly on the button
      if (e.target.closest('.result-card__cta')) return;
      this.handleSelect();
    };

    // Keyboard handler for card
    const handleCardKeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleSelect();
      }
    };

    // Button click handler
    const handleButtonClick = (e) => {
      e.stopPropagation();
      this.handleSelect();
    };

    // Button keyboard handler
    const handleButtonKeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        this.handleSelect();
      }
    };

    // Store bound handlers for cleanup
    this.boundHandlers.set('cardClick', handleCardClick);
    this.boundHandlers.set('cardKeydown', handleCardKeydown);
    this.boundHandlers.set('buttonClick', handleButtonClick);
    this.boundHandlers.set('buttonKeydown', handleButtonKeydown);

    // Attach listeners
    this.element.addEventListener('click', handleCardClick);
    this.element.addEventListener('keydown', handleCardKeydown);

    const button = this.element.querySelector('.result-card__cta');
    if (button) {
      button.addEventListener('click', handleButtonClick);
      button.addEventListener('keydown', handleButtonKeydown);
    }
  }

  /**
   * Handles card selection
   * Emits custom event and calls callback
   */
  handleSelect() {
    // Emit custom event
    const event = new CustomEvent('card-selected', {
      detail: {
        bouquet: this.data,
        cardId: this.cardId
      },
      bubbles: true,
      cancelable: true
    });

    this.element.dispatchEvent(event);

    // Call optional callback
    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect(this.data);
    }
  }

  /**
   * Removes event listeners and cleans up
   */
  destroy() {
    if (!this.element) return;

    // Remove event listeners
    const button = this.element.querySelector('.result-card__cta');

    if (this.boundHandlers.has('cardClick')) {
      this.element.removeEventListener('click', this.boundHandlers.get('cardClick'));
    }

    if (this.boundHandlers.has('cardKeydown')) {
      this.element.removeEventListener('keydown', this.boundHandlers.get('cardKeydown'));
    }

    if (button) {
      if (this.boundHandlers.has('buttonClick')) {
        button.removeEventListener('click', this.boundHandlers.get('buttonClick'));
      }

      if (this.boundHandlers.has('buttonKeydown')) {
        button.removeEventListener('keydown', this.boundHandlers.get('buttonKeydown'));
      }
    }

    // Clear handlers map
    this.boundHandlers.clear();

    // Remove element reference
    this.element = null;
  }

  /**
   * Updates card language
   * Re-renders text content with new language
   * @param {string} lang - New language code
   * @returns {Promise<void>}
   */
  async updateLanguage(lang) {
    if (!this.element) return;

    this.options.lang = lang;

    // Get new translations
    const [title, subtitle, description, ctaText, altText] = await Promise.all([
      t('result.title', lang, { name: this.data.name }),
      t('result.subtitle', lang, { occasion: this.data.occasion }),
      t('result.description', lang, { description: this.data.description }),
      t('result.cta', lang),
      this.data.imageAlt
        ? Promise.resolve(this.data.imageAlt)
        : t('result.image_alt', lang, { name: this.data.name })
    ]);

    // Update text content
    const titleEl = this.element.querySelector('.result-card__title');
    const subtitleEl = this.element.querySelector('.result-card__subtitle');
    const descEl = this.element.querySelector('.result-card__description');
    const ctaEl = this.element.querySelector('.result-card__cta');
    const imgEl = this.element.querySelector('.result-card__image');

    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
    if (descEl) descEl.textContent = description;
    if (ctaEl) {
      ctaEl.textContent = ctaText;
      ctaEl.setAttribute('aria-label', `${ctaText} - ${title}`);
    }
    if (imgEl) imgEl.setAttribute('alt', altText);
  }

  /**
   * Escapes HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return '';

    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Gets the card element
   * @returns {HTMLElement|null} Card element
   */
  getElement() {
    return this.element;
  }

  /**
   * Gets the bouquet data
   * @returns {Object} Bouquet data
   */
  getData() {
    return this.data;
  }
}
