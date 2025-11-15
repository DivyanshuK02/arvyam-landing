/**
 * Language Detection Module
 * Detects user's preferred language from browser, URL, localStorage
 * Supports: en, hi, ta, te, kn, ml, mr, gu, bn, pa
 */

import { initStrings } from './strings.js';

// Supported languages
const SUPPORTED_LANGUAGES = [
  'en', // English
  'hi', // Hindi
  'ta', // Tamil
  'te', // Telugu
  'kn', // Kannada
  'ml', // Malayalam
  'mr', // Marathi
  'gu', // Gujarati
  'bn', // Bengali
  'pa'  // Punjabi
];

const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'arvyam_locale';

/**
 * Detect language from URL parameter
 * @returns {string|null} Language code or null
 */
function detectFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang') || params.get('locale');
    if (lang && SUPPORTED_LANGUAGES.includes(lang.toLowerCase())) {
      return lang.toLowerCase();
    }
  } catch (error) {
    console.warn('URL language detection failed:', error);
  }
  return null;
}

/**
 * Detect language from localStorage
 * @returns {string|null} Language code or null
 */
function detectFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored.toLowerCase())) {
      return stored.toLowerCase();
    }
  } catch (error) {
    console.warn('localStorage language detection failed:', error);
  }
  return null;
}

/**
 * Detect language from browser settings
 * @returns {string|null} Language code or null
 */
function detectFromBrowser() {
  try {
    // Get browser languages in order of preference
    const browserLangs = navigator.languages || [navigator.language || navigator.userLanguage];

    for (let browserLang of browserLangs) {
      // Extract primary language code (e.g., 'en' from 'en-US')
      const primaryLang = browserLang.split('-')[0].toLowerCase();

      if (SUPPORTED_LANGUAGES.includes(primaryLang)) {
        return primaryLang;
      }
    }
  } catch (error) {
    console.warn('Browser language detection failed:', error);
  }
  return null;
}

/**
 * Detect language from geolocation (IP-based)
 * This is a fallback for Indian languages based on common patterns
 * @returns {string|null} Language code or null
 */
function detectFromGeo() {
  try {
    // Check timezone for India
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && timezone.includes('Kolkata') || timezone.includes('Asia/Calcutta')) {
      // Default to Hindi for India if no other preference
      return 'hi';
    }
  } catch (error) {
    console.warn('Geo language detection failed:', error);
  }
  return null;
}

/**
 * Main language detection function
 * Priority: URL > localStorage > Browser > Geo > Default
 * @returns {string} Detected language code
 */
export function detectLanguage() {
  // Priority 1: URL parameter (explicit user choice)
  let lang = detectFromURL();
  if (lang) {
    console.log('Language detected from URL:', lang);
    return lang;
  }

  // Priority 2: localStorage (previous user choice)
  lang = detectFromStorage();
  if (lang) {
    console.log('Language detected from storage:', lang);
    return lang;
  }

  // Priority 3: Browser settings
  lang = detectFromBrowser();
  if (lang) {
    console.log('Language detected from browser:', lang);
    return lang;
  }

  // Priority 4: Geolocation (timezone-based)
  lang = detectFromGeo();
  if (lang) {
    console.log('Language detected from geo:', lang);
    return lang;
  }

  // Fallback: Default language
  console.log('Using default language:', DEFAULT_LANGUAGE);
  return DEFAULT_LANGUAGE;
}

/**
 * Save language preference to localStorage
 * @param {string} lang - Language code
 */
export function saveLanguagePreference(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.warn('Unsupported language:', lang);
    return false;
  }

  try {
    localStorage.setItem(STORAGE_KEY, lang);
    console.log('Language preference saved:', lang);
    return true;
  } catch (error) {
    console.error('Failed to save language preference:', error);
    return false;
  }
}

/**
 * Initialize language and load strings
 * @param {string|null} forceLocale - Optional locale to force
 * @returns {Promise<string>} Initialized locale
 */
export async function initLanguage(forceLocale = null) {
  const locale = forceLocale || detectLanguage();

  try {
    await initStrings(locale);
    saveLanguagePreference(locale);

    // Update HTML lang attribute for accessibility
    document.documentElement.lang = locale;

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('language-changed', {
      detail: { locale }
    }));

    return locale;
  } catch (error) {
    console.error('Language initialization failed:', error);
    // Fallback to English
    await initStrings(DEFAULT_LANGUAGE);
    return DEFAULT_LANGUAGE;
  }
}

/**
 * Get supported languages list
 * @returns {Array<string>} Array of language codes
 */
export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Check if a language is supported
 * @param {string} lang - Language code
 * @returns {boolean} True if supported
 */
export function isLanguageSupported(lang) {
  return SUPPORTED_LANGUAGES.includes(lang.toLowerCase());
}

// Auto-initialize on module load (only in browser)
if (typeof window !== 'undefined') {
  initLanguage().catch(err => {
    console.error('Auto language initialization failed:', err);
  });
}
