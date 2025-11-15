/**
 * i18n Strings Module
 * Provides translation function and string key mappings
 * Supports: en, hi, ta, te, kn, ml, mr, gu, bn, pa
 */

// String bank cache
let currentStrings = null;
let currentLocale = 'en';

// Fallback English strings
const fallbackStrings = {
  // Intent Assist System
  'intent.question1': 'Who is this gift for?',
  'intent.question2': "What's the occasion?",
  'intent.question3': 'What feeling should it convey?',
  'intent.skip': 'Skip',
  'intent.progress': 'Question {current} of {total}',

  // Relationship options
  'intent.relationship.romantic': 'Romantic Partner',
  'intent.relationship.family': 'Family Member',
  'intent.relationship.friend': 'Friend',
  'intent.relationship.colleague': 'Colleague',
  'intent.relationship.self': 'Self',

  // Occasion options
  'intent.occasion.birthday': 'Birthday',
  'intent.occasion.anniversary': 'Anniversary',
  'intent.occasion.apology': 'Apology',
  'intent.occasion.celebration': 'Celebration',
  'intent.occasion.justbecause': 'Just Because',
  'intent.occasion.sympathy': 'Sympathy',

  // Tone options
  'intent.tone.joyful': 'Joyful',
  'intent.tone.romantic': 'Romantic',
  'intent.tone.supportive': 'Supportive',
  'intent.tone.elegant': 'Elegant',
  'intent.tone.bright': 'Bright',
  'intent.tone.calm': 'Calm',

  // Budget guidance (privacy-focused, no prices)
  'intent.budget.classic': "I'll focus on Classic options",
  'intent.budget.signature': "I'll focus on Signature options",
  'intent.budget.luxury': "I'll focus on Luxury options",

  // Search and curation
  'search.placeholder': 'Describe your perfect bouquet...',
  'search.submit': 'Find My Flowers',
  'search.analyzing': 'Understanding your request...',
  'search.curating': 'Curating personalized options...',

  // Gallery
  'gallery.loading': 'Loading curated options...',
  'gallery.empty': 'No results found. Try adjusting your description.',
  'gallery.error': 'Something went wrong. Please try again.',

  // Accessibility
  'a11y.close': 'Close',
  'a11y.loading': 'Loading',
  'a11y.selected': 'Selected',
  'a11y.menu': 'Menu',
  'a11y.skip_to_content': 'Skip to content',

  // Common UI
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.done': 'Done',

  // Navigation
  'nav.home': 'Home',
  'nav.about': 'About',
  'nav.contact': 'Contact',
  'nav.language': 'Language',

  // Footer
  'footer.copyright': '© 2025 Arvyam. All rights reserved.',
  'footer.privacy': 'Privacy Policy',
  'footer.terms': 'Terms of Service'
};

/**
 * Load string bank for a specific locale
 * @param {string} locale - Language code (en, hi, ta, etc.)
 * @returns {Promise<Object>} String bank object
 */
async function loadStringBank(locale) {
  try {
    const response = await fetch(`/locales/${locale}/arvy_stringbank.json`);
    if (!response.ok) {
      throw new Error(`Failed to load stringbank for ${locale}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`Stringbank load failed for ${locale}, using fallback:`, error);
    return fallbackStrings;
  }
}

/**
 * Initialize strings for a locale
 * @param {string} locale - Language code
 */
export async function initStrings(locale = 'en') {
  currentLocale = locale;
  currentStrings = await loadStringBank(locale);
  return currentStrings;
}

/**
 * Translation function
 * @param {string} key - String key (e.g., 'intent.question1')
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string} Translated string
 *
 * @example
 * t('intent.progress', { current: 1, total: 3 }) // "Question 1 of 3"
 * t('intent.question1') // "Who is this gift for?"
 */
export function t(key, params = {}) {
  // Get string from current locale or fallback
  let str = currentStrings?.[key] || fallbackStrings[key] || key;

  // Interpolate parameters
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(paramKey => {
      const placeholder = `{${paramKey}}`;
      str = str.replace(new RegExp(placeholder, 'g'), params[paramKey]);
    });
  }

  return str;
}

/**
 * Get current locale
 * @returns {string} Current locale code
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Check if a string key exists
 * @param {string} key - String key
 * @returns {boolean} True if key exists
 */
export function hasKey(key) {
  return !!(currentStrings?.[key] || fallbackStrings[key]);
}

/**
 * Get all strings for a namespace
 * @param {string} namespace - Namespace prefix (e.g., 'intent.relationship')
 * @returns {Object} Object with keys and values
 */
export function getNamespace(namespace) {
  const result = {};
  const prefix = namespace + '.';

  const strings = currentStrings || fallbackStrings;
  Object.keys(strings).forEach(key => {
    if (key.startsWith(prefix)) {
      const shortKey = key.substring(prefix.length);
      result[shortKey] = strings[key];
    }
  });

  return result;
}

// Auto-initialize with English on module load
if (typeof window !== 'undefined') {
  initStrings('en').catch(err => {
    console.warn('Failed to auto-initialize strings:', err);
    currentStrings = fallbackStrings;
  });
}
