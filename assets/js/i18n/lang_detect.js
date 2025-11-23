/**
 * ARVYAM Language Detection and Management
 * Handles language detection from various sources and persistence
 */

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'ta', 'te', 'bn'];
const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'arvyam_lang';

// Browser language code mappings
const BROWSER_LANG_MAP = {
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-CA': 'en',
  'en-AU': 'en',
  'hi': 'hi',
  'hi-IN': 'hi',
  'ta': 'ta',
  'ta-IN': 'ta',
  'te': 'te',
  'te-IN': 'te',
  'bn': 'bn',
  'bn-IN': 'bn',
  'bn-BD': 'bn'
};

/**
 * Gets language from URL parameter
 * @returns {string|null} Language code or null
 */
function getLanguageFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');

  if (langParam && SUPPORTED_LANGUAGES.includes(langParam)) {
    return langParam;
  }

  return null;
}

/**
 * Gets language from localStorage
 * @returns {string|null} Language code or null
 */
function getLanguageFromStorage() {
  try {
    const storedLang = localStorage.getItem(STORAGE_KEY);

    if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
      return storedLang;
    }
  } catch (error) {
    console.warn('Error reading from localStorage:', error);
  }

  return null;
}

/**
 * Gets language from browser settings
 * @returns {string|null} Language code or null
 */
function getLanguageFromBrowser() {
  if (!navigator.language) {
    return null;
  }

  // Try exact match first
  const browserLang = navigator.language;
  const mappedLang = BROWSER_LANG_MAP[browserLang];

  if (mappedLang) {
    return mappedLang;
  }

  // Try matching just the language part (before hyphen)
  const langCode = browserLang.split('-')[0];
  if (SUPPORTED_LANGUAGES.includes(langCode)) {
    return langCode;
  }

  return null;
}

/**
 * Detects the appropriate language based on multiple sources
 * Priority: URL param > localStorage > browser setting > default
 * @returns {string} Detected language code
 */
export function detectLanguage() {
  // 1. Check URL parameter
  const urlLang = getLanguageFromURL();
  if (urlLang) {
    return urlLang;
  }

  // 2. Check localStorage
  const storedLang = getLanguageFromStorage();
  if (storedLang) {
    return storedLang;
  }

  // 3. Check browser language
  const browserLang = getLanguageFromBrowser();
  if (browserLang) {
    return browserLang;
  }

  // 4. Default to English
  return DEFAULT_LANGUAGE;
}

/**
 * PHASE 13B.2: Detect language from text content (Hindi auto-detection)
 * Analyzes text for Devanagari characters to suggest Hindi
 * @param {string} text - Text to analyze
 * @returns {Object} Detection result { devanagariPercent, suggestedLang, isAmbiguous }
 */
export function detectLanguageFromText(text) {
  if (!text || text.length === 0) {
    return {
      devanagariPercent: 0,
      suggestedLang: 'en',
      isAmbiguous: false
    };
  }

  // Count Devanagari characters (U+0900 to U+097F)
  const devanagariPattern = /[\u0900-\u097F]/g;
  const devanagariMatches = text.match(devanagariPattern);
  const devanagariCount = devanagariMatches ? devanagariMatches.length : 0;

  // Total meaningful characters (excluding spaces, punctuation)
  const meaningfulPattern = /[^\s\p{P}]/gu;
  const meaningfulMatches = text.match(meaningfulPattern);
  const totalCount = meaningfulMatches ? meaningfulMatches.length : 0;

  if (totalCount === 0) {
    return {
      devanagariPercent: 0,
      suggestedLang: 'en',
      isAmbiguous: false
    };
  }

  const devanagariPercent = (devanagariCount / totalCount) * 100;

  // Hysteresis thresholds to prevent flip-flopping
  // ≥65% Devanagari → Suggest Hindi
  // ≤35% Devanagari → Prefer English
  // 35-65% → Ambiguous, maintain current language
  let suggestedLang;
  let isAmbiguous;

  if (devanagariPercent >= 65) {
    suggestedLang = 'hi';
    isAmbiguous = false;
  } else if (devanagariPercent <= 35) {
    suggestedLang = 'en';
    isAmbiguous = false;
  } else {
    // Ambiguous range - no strong recommendation
    suggestedLang = null;
    isAmbiguous = true;
  }

  return {
    devanagariPercent,
    suggestedLang,
    isAmbiguous
  };
}

/**
 * Sets the application language
 * Validates the language, saves to localStorage, and updates HTML lang attribute
 * @param {string} lang - Language code to set
 * @returns {string} The validated and set language code
 * @throws {Error} If language is not supported
 */
export function setLanguage(lang) {
  // Validate language
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.error(`Unsupported language: ${lang}`);
    throw new Error(`Language "${lang}" is not supported. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }

  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (error) {
    console.warn('Error saving to localStorage:', error);
  }

  // Set HTML lang attribute for WCAG compliance
  document.documentElement.lang = lang;

  return lang;
}

/**
 * Gets the list of supported languages
 * @returns {string[]} Array of supported language codes
 */
export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Gets the default language
 * @returns {string} Default language code
 */
export function getDefaultLanguage() {
  return DEFAULT_LANGUAGE;
}

/**
 * Checks if a language is supported
 * @param {string} lang - Language code to check
 * @returns {boolean} True if supported
 */
export function isLanguageSupported(lang) {
  return SUPPORTED_LANGUAGES.includes(lang);
}
