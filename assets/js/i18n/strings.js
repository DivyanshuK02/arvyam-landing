/**
 * ARVYAM i18n Translation System
 * Provides translation helpers with caching and fallback support
 */

// Cache for loaded stringbanks to avoid repeated fetches
const stringbankCache = new Map();

// Track loading promises to prevent duplicate fetches
const loadingPromises = new Map();

/**
 * Loads a stringbank for a given language
 * @param {string} lang - Language code (e.g., 'en', 'hi', 'ta')
 * @returns {Promise<Object>} The stringbank object
 */
async function loadStringbank(lang) {
  // Return cached version if available
  if (stringbankCache.has(lang)) {
    return stringbankCache.get(lang);
  }

  // Return existing loading promise if in progress
  if (loadingPromises.has(lang)) {
    return loadingPromises.get(lang);
  }

  // Create new loading promise
  const loadPromise = fetch(`/locales/${lang}/arvy_stringbank.json`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load stringbank for language: ${lang}`);
      }
      return response.json();
    })
    .then(data => {
      stringbankCache.set(lang, data);
      loadingPromises.delete(lang);
      return data;
    })
    .catch(error => {
      loadingPromises.delete(lang);
      console.error(`Error loading stringbank for ${lang}:`, error);
      throw error;
    });

  loadingPromises.set(lang, loadPromise);
  return loadPromise;
}

/**
 * Gets a nested value from an object using dot notation
 * @param {Object} obj - The object to traverse
 * @param {string} path - Dot-notated path (e.g., 'intent.question1')
 * @returns {*} The value at the path, or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

/**
 * Interpolates variables in a string template
 * Replaces {variable} patterns with values from the vars object
 * @param {string} template - String with {variable} placeholders
 * @param {Object} vars - Object with variable values
 * @returns {string} Interpolated string
 */
function interpolate(template, vars = {}) {
  if (typeof template !== 'string') {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars.hasOwnProperty(key) ? vars[key] : match;
  });
}

/**
 * Main translation function
 * @param {string} key - Translation key in dot notation (e.g., 'search.placeholder')
 * @param {string} lang - Language code, defaults to 'en'
 * @param {Object} vars - Optional variables for string interpolation
 * @returns {Promise<string>} Translated string
 */
export async function t(key, lang = 'en', vars = {}) {
  try {
    // Try to get translation in requested language
    const stringbank = await loadStringbank(lang);
    const translation = getNestedValue(stringbank, key);

    if (translation !== undefined) {
      return interpolate(translation, vars);
    }

    // Fallback to English if translation not found and not already English
    if (lang !== 'en') {
      console.warn(`Translation missing for key "${key}" in language "${lang}", falling back to English`);
      const englishStringbank = await loadStringbank('en');
      const englishTranslation = getNestedValue(englishStringbank, key);

      if (englishTranslation !== undefined) {
        return interpolate(englishTranslation, vars);
      }
    }

    // If still not found, return the key itself
    console.error(`Translation key "${key}" not found in any language`);
    return key;

  } catch (error) {
    console.error(`Error translating key "${key}":`, error);
    return key;
  }
}

/**
 * Synchronous translation function (requires stringbank to be preloaded)
 * Use this only when you are sure the stringbank is already loaded
 * @param {string} key - Translation key in dot notation
 * @param {string} lang - Language code, defaults to 'en'
 * @param {Object} vars - Optional variables for string interpolation
 * @returns {string} Translated string or key if not found
 */
export function tSync(key, lang = 'en', vars = {}) {
  const stringbank = stringbankCache.get(lang);

  if (stringbank) {
    const translation = getNestedValue(stringbank, key);
    if (translation !== undefined) {
      return interpolate(translation, vars);
    }
  }

  // Try English fallback
  if (lang !== 'en') {
    const englishStringbank = stringbankCache.get('en');
    if (englishStringbank) {
      const englishTranslation = getNestedValue(englishStringbank, key);
      if (englishTranslation !== undefined) {
        return interpolate(englishTranslation, vars);
      }
    }
  }

  return key;
}

/**
 * Preloads stringbanks for given languages
 * Call this on app initialization for better performance
 * @param {string[]} langs - Array of language codes to preload
 * @returns {Promise<void>}
 */
export async function preloadStringbanks(langs) {
  try {
    await Promise.all(langs.map(lang => loadStringbank(lang)));
  } catch (error) {
    console.error('Error preloading stringbanks:', error);
  }
}

/**
 * Clears the stringbank cache
 * Useful for development or if you need to reload translations
 */
export function clearCache() {
  stringbankCache.clear();
  loadingPromises.clear();
}
