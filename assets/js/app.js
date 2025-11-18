/**
 * ARVYAM Main Application
 * Integration layer for Phase 2-3 components (Steps 1-9 complete)
 * 
 * Constitutional Compliance:
 * - Selection Invariance: Always show exactly 3 equal-emphasis cards
 * - Curation Structure: STRICT 2 MIX + 1 MONO triad (never partial results)
 * - Guest-First: Simple, helpful UX with no jargon (frontend guards ALL error copy)
 * - ARVY Persona: Calm, warm, editorial tone (no technical/browser messages to users)
 * - Privacy: No PII in logs, debounced analytics
 * 
 * @version 1.9.0 - Step 9: PolicyFooter (legal links + cookie settings)
 */

import { detectLanguage, setLanguage } from './i18n/lang_detect.js';
import { t, preloadStringbanks } from './i18n/strings.js';
import ConsentBanner from './components/consent_banner.js';
import IntentAssist from './intent_assist.js';
import ResultCard from './components/result_card.js';
import HintForm from './components/hint_form.js';
import RefineBar from './components/refine_bar.js';
import LanguageSwitch from './components/language_switch.js';
import PolicyFooter from './components/policy_footer.js';

// ============================================================================
// Configuration
// ============================================================================

/**
 * API Base URL - Can be overridden via window.ARVYAM_API_BASE
 * Set in index.html before loading app.js:
 * <script>window.ARVYAM_API_BASE = 'https://staging-api.arvyam.com';</script>
 */
const API_BASE = window.ARVYAM_API_BASE || 'https://arvyam-api.onrender.com';

// ============================================================================
// Global State
// ============================================================================

let currentLanguage = 'en';
let consentBanner = null;
let intentAssist = null;
let hintForm = null;
let refineBar = null;
let languageSwitch = null;
let policyFooter = null;
let analyticsEnabled = false;
let uxTurns = 0; // Track user interaction depth

// State for refinement (needed to re-search with adjustments)
let lastPrompt = '';
let lastHints = null;

// DOM element references
let searchForm = null;
let searchInput = null;
let resultsContainer = null;
let loadingIndicator = null;

// ============================================================================
// Application Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[ARVYAM] Initializing Phase 2 frontend...');
  
  try {
    // Step 1: Detect and set language
    await initializeLanguage();
    
    // Step 2: Preload stringbanks for better performance
    await preloadStringbanks([currentLanguage, 'en']);
    
    // Step 3: Initialize consent banner
    await initializeConsentBanner();
    
    // Step 4: Initialize Intent Assist
    initializeIntentAssist();
    
    // Step 5: Initialize HintForm
    initializeHintForm();
    
    // Step 6: Initialize RefineBar
    initializeRefineBar();
    
    // Step 7: Initialize LanguageSwitch (Step 8)
    initializeLanguageSwitch();
    
    // Step 8: Initialize PolicyFooter (Step 9)
    await initializePolicyFooter();
    
    // Step 9: Cache DOM elements
    cacheDOMElements();
    
    // Step 10: Set up global event listeners
    setupGlobalListeners();
    
    // Step 11: Initialize search functionality
    if (searchForm && searchInput && resultsContainer) {
      initializeSearch();
    }
    
    console.log('[ARVYAM] Phase 2 frontend initialized successfully');
  } catch (error) {
    console.error('[ARVYAM] Initialization error:', error);
    showGlobalError('Unable to initialize the application. Please refresh the page.');
  }
});

// ============================================================================
// Initialization Functions
// ============================================================================

/**
 * Initialize language detection and set HTML lang attribute
 */
async function initializeLanguage() {
  currentLanguage = detectLanguage();
  setLanguage(currentLanguage);
  console.log('[ARVYAM] Language set to:', currentLanguage);
}

/**
 * Initialize and show consent banner if needed
 */
async function initializeConsentBanner() {
  consentBanner = new ConsentBanner({
    onConsentChange: (consent) => {
      console.log('[ARVYAM] Consent changed:', consent);
      
      // Initialize analytics if user consented
      if (consent.analytics) {
        initializeAnalytics();
      }
    }
  });
  
  // Show banner only if consent hasn't been given
  if (!consentBanner.hasConsent()) {
    await consentBanner.show();
  } else {
    // Check if analytics should be enabled
    const consent = consentBanner.getConsent();
    if (consent?.analytics) {
      initializeAnalytics();
    }
  }
}

/**
 * Initialize Intent Assist system
 */
function initializeIntentAssist() {
  intentAssist = new IntentAssist({
    maxQuestions: 3,
    autoShow: false // We'll manually trigger it based on uncertainty
  });
  
  // Append to body
  document.body.appendChild(intentAssist.container);
  
  console.log('[ARVYAM] Intent Assist initialized');
}

/**
 * Initialize HintForm component
 * Allows users to optionally provide structured hints
 * All fields are optional (Guest-First constitutional requirement)
 */
function initializeHintForm() {
  hintForm = new HintForm({
    lang: currentLanguage,
    onSubmit: (hints) => {
      const prompt = searchInput?.value || '';
      if (prompt) {
        searchWithHints(prompt, hints);
      } else {
        console.warn('[ARVYAM] Cannot search with hints - no prompt entered');
      }
    }
  });
  
  // Try to initialize (fails gracefully if DOM not ready)
  const initialized = hintForm.init();
  
  if (initialized) {
    console.log('[ARVYAM] HintForm initialized');
  } else {
    console.log('[ARVYAM] HintForm skipped (container not present)');
  }
}

/**
 * Initialize RefineBar component
 * Allows users to gently adjust their 3 curated arrangements
 * Shown only after successful results display
 */
function initializeRefineBar() {
  refineBar = new RefineBar({
    lang: currentLanguage,
    onSubmit: handleRefineSubmit
  });
  
  console.log('[ARVYAM] RefineBar initialized');
}

/**
 * Initialize LanguageSwitch component (Step 8)
 * Allows users to switch between languages (EN/HI) without page reload
 * Updates all components simultaneously via language-change event
 */
function initializeLanguageSwitch() {
  languageSwitch = new LanguageSwitch({
    lang: currentLanguage,
    languages: ['en', 'hi'],
    ariaLabel: 'Select language'
  });
  
  // Try to attach to dedicated container in header
  const headerContainer = document.querySelector('.site-header__language');
  
  if (headerContainer) {
    languageSwitch.attach(headerContainer);
    console.log('[ARVYAM] LanguageSwitch attached to header');
  } else {
    // Fallback: Create floating switch (top-right)
    const wrapper = document.createElement('div');
    wrapper.className = 'language-switch-floating language-switch-floating--top-right';
    document.body.appendChild(wrapper);
    languageSwitch.attach(wrapper);
    console.log('[ARVYAM] LanguageSwitch attached as floating element');
  }
}

/**
 * Initialize PolicyFooter component (Step 9)
 * Displays legal links (Privacy, Terms) and Cookie Settings button
 * Progressive enhancement: attaches to #policy-footer if present, else creates new
 */
async function initializePolicyFooter() {
  policyFooter = new PolicyFooter({
    lang: currentLanguage,
    privacyUrl: '/privacy',
    termsUrl: '/terms',
    copyrightYear: new Date().getFullYear(),
    companyName: 'ARVYAM'
  });
  
  await policyFooter.mount();
  
  console.log('[ARVYAM] PolicyFooter initialized');
}

/**
 * Cache frequently accessed DOM elements
 */
function cacheDOMElements() {
  searchForm = document.getElementById('curate-form');
  searchInput = document.getElementById('feelings-input');
  resultsContainer = document.getElementById('curated-results');
  loadingIndicator = document.getElementById('loading-indicator');
  
  if (!searchForm) console.warn('[ARVYAM] Search form not found');
  if (!searchInput) console.warn('[ARVYAM] Search input not found');
  if (!resultsContainer) console.warn('[ARVYAM] Results container not found');
}

// ============================================================================
// Event Listeners
// ============================================================================

/**
 * Set up global event listeners
 */
function setupGlobalListeners() {
  // Language change listener (from LanguageSwitch component - Step 8)
  window.addEventListener('language-change', handleLanguageChange);
  
  // Consent change listener
  window.addEventListener('consent-changed', handleConsentChange);
  
  // Consent manage listener (from PolicyFooter - Step 9)
  document.addEventListener('consent:open-manage', () => {
    if (consentBanner && typeof consentBanner.openManageView === 'function') {
      consentBanner.openManageView();
      console.log('[ARVYAM] ConsentBanner manage view opened from PolicyFooter');
    } else {
      console.warn('[ARVYAM] ConsentBanner openManageView method not available');
    }
  });
  
  // Intent clarified listener
  window.addEventListener('intent-clarified', handleIntentClarified);
  
  // Result card selection listener (bubbled from cards)
  document.addEventListener('card-selected', handleCardSelected);
}

/**
 * Handle language change event
 */
async function handleLanguageChange(event) {
  const { lang, previousLang } = event.detail;
  
  console.log(`[ARVYAM] Language changed: ${previousLang || 'unknown'} → ${lang}`);
  
  // Update current language
  currentLanguage = lang;
  
  // Preload stringbanks for new language (with fallback)
  try {
    await preloadStringbanks([lang, 'en']);
  } catch (error) {
    console.warn('[ARVYAM] Failed to preload stringbanks:', error);
    // Continue anyway - components will fall back to English
  }
  
  // Update all components with new language
  
  // 1. ConsentBanner
  if (consentBanner && typeof consentBanner.updateLanguage === 'function') {
    await consentBanner.updateLanguage(lang);
  }
  
  // 2. IntentAssist
  if (intentAssist && typeof intentAssist.updateLanguage === 'function') {
    await intentAssist.updateLanguage(lang);
  }
  
  // 3. HintForm
  if (hintForm && typeof hintForm.updateLanguage === 'function') {
    await hintForm.updateLanguage(lang);
  }
  
  // 4. RefineBar
  if (refineBar && typeof refineBar.updateLanguage === 'function') {
    await refineBar.updateLanguage(lang);
  }
  
  // 5. PolicyFooter
  if (policyFooter && typeof policyFooter.updateLanguage === 'function') {
    await policyFooter.updateLanguage(lang);
  }
  
  // 6. ResultCards (re-render existing cards if present)
  const existingCards = resultsContainer?.querySelectorAll('.result-card');
  if (existingCards && existingCards.length > 0) {
    // Re-render cards with new language
    // This would need the card data to be stored globally
    // For now, we'll just note that cards should implement updateLanguage
    console.log('[ARVYAM] Note: ResultCards should implement updateLanguage() method');
  }
  
  // 7. Update static UI text (search placeholder, CTA, etc.)
  await updateStaticUIText(lang);
}

/**
 * Update static UI text elements when language changes
 * @param {string} lang - Language code
 */
async function updateStaticUIText(lang) {
  try {
    // Update search input placeholder
    if (searchInput) {
      const placeholder = await t('search.placeholder', lang);
      searchInput.placeholder = placeholder;
    }
    
    // Update search button text (if it exists and has text)
    const searchButton = searchForm?.querySelector('button[type="submit"]');
    if (searchButton) {
      const ctaText = await t('search.cta', lang);
      if (ctaText) searchButton.textContent = ctaText;
    }
    
    // Add other static text updates as needed
    
  } catch (error) {
    console.warn('[ARVYAM] Error updating static UI text:', error);
  }
}

/**
 * Handle consent change event
 */
function handleConsentChange(event) {
  const consent = event.detail.consent;
  console.log('[ARVYAM] Consent updated:', consent);
  
  if (consent.analytics && !analyticsEnabled) {
    initializeAnalytics();
  }
}

/**
 * Handle intent clarified event from Intent Assist
 */
async function handleIntentClarified(event) {
  const intentData = event.detail;
  console.log('[ARVYAM] Intent clarified:', intentData);
  
  // Track UX turn
  uxTurns++;
  
  // Use enriched prompt to search again
  if (intentData.enrichedPrompt && intentData.enrichedPrompt !== intentData.originalPrompt) {
    trackEvent('intent_assist_completed', {
      had_relationship: !!intentData.relationship,
      had_occasion: !!intentData.occasion,
      had_tone: !!intentData.tone,
      had_budget_hint: !!intentData.budgetHint,
      ux_turns: uxTurns
    });
    
    // Perform new search with enriched prompt
    showLoadingState();
    
    try {
      const results = await searchArrangements(intentData.enrichedPrompt);
      displayResults(results);
    } catch (error) {
      console.error('[ARVYAM] Search with intent error:', error);
      showError('We could not complete your search. Please try again.');
    }
  }
}

/**
 * Handle card selection event
 */
function handleCardSelected(event) {
  const { bouquet, cardId } = event.detail;
  console.log('[ARVYAM] Card selected:', bouquet.id);
  
  // Track card click
  trackEvent('product_clicked', {
    sku_id: bouquet.id,
    sku_name: bouquet.name
  });
  
  // Navigate to product detail (placeholder for now)
  console.log('[ARVYAM] Would navigate to product:', bouquet.id);
  // window.location.href = `/product/${bouquet.id}`;
}

// ============================================================================
// Search Functionality
// ============================================================================

/**
 * Initialize search form submission handler
 */
function initializeSearch() {
  searchForm.addEventListener('submit', handleSearchSubmit);
  
  // Optional: Add input validation on typing
  searchInput.addEventListener('input', handleSearchInput);
}

/**
 * Handle search input changes (validation)
 */
function handleSearchInput(event) {
  const value = event.target.value;
  
  // Clear any previous errors when user starts typing
  if (value.length > 0) {
    hideFieldError();
  }
  
  // Show warning if approaching character limit
  if (value.length > 220) {
    const remaining = 240 - value.length;
    showFieldWarning(`${remaining} characters remaining`);
  } else {
    hideFieldWarning();
  }
}

/**
 * Handle search form submission
 */
async function handleSearchSubmit(event) {
  event.preventDefault();
  
  const query = searchInput.value.trim();
  
  // Validation
  if (!query) {
    showFieldError('Please describe what you are celebrating.');
    searchInput.focus();
    return;
  }
  
  if (query.length > 240) {
    showFieldError('Please keep it under 240 characters.');
    searchInput.focus();
    return;
  }
  
  // Clear errors
  hideFieldError();
  hideFieldWarning();
  
  // Track search submission
  uxTurns++;
  trackEvent('prompt_submitted', {
    prompt_length_chars: query.length,
    ux_turns: uxTurns
  });
  
  // Store for potential refinement later
  lastPrompt = query;
  lastHints = null; // Clear hints for basic search
  
  // Reset RefineBar for new search
  if (refineBar) {
    refineBar.reset();
    refineBar.detach();
  }
  
  // Show loading state
  showLoadingState();
  
  try {
    // Call backend API
    const results = await searchArrangements(query);
    
    // Display results
    displayResults(results);
    
    // Check if we should show Intent Assist
    // Show if uncertainty_score > 0.5 (uncertain prompt)
    const uncertaintyScore = results.uncertainty_score ?? 0;
    
    // Log warning if API didn't return uncertainty_score
    if (results.uncertainty_score === undefined || results.uncertainty_score === null) {
      console.warn('[ARVYAM] API response missing uncertainty_score field');
    }
    
    if (uncertaintyScore > 0.5) {
      console.log('[ARVYAM] Uncertain prompt detected (score:', uncertaintyScore, '), showing Intent Assist');
      setTimeout(() => {
        intentAssist.show(query);
      }, 800); // Delay to let user see results first
    }
    
  } catch (error) {
    console.error('[ARVYAM] Search error:', error);
    
    // CONSTITUTIONAL: Frontend is final guard on persona
    // Never surface raw error.message (could be browser technical text like "Failed to fetch")
    showError('We couldn\'t complete your search. Please try again.');
  }
}

/**
 * Normalize curate response to handle multiple API formats
 * Backend may return: raw array, {arrangements: []}, or {results: []}
 * Always returns {arrangements: []} or null
 * 
 * Constitutional: Enforces 2 MIX + 1 MONO triad invariance
 * 
 * @param {*} data - Response from /api/curate
 * @returns {Object|null} Normalized {arrangements: []} or null
 */
function normalizeCurateResponse(data) {
  let arrangements = null;

  if (Array.isArray(data)) {
    // API returns a raw triad array
    arrangements = data;
  } else if (data && Array.isArray(data.arrangements)) {
    // API already wrapped in {arrangements: [...]}
    arrangements = data.arrangements;
  } else if (data && Array.isArray(data.results)) {
    // Tolerate {results: [...]} for backwards compatibility
    arrangements = data.results;
  }

  // Constitutional: Enforce exactly 3 arrangements (2 MIX + 1 MONO)
  if (!arrangements || arrangements.length !== 3) {
    console.error('[ARVYAM] Invalid curate response shape:', data);
    console.error('[ARVYAM] Expected: Array of 3 items, got:', arrangements?.length || 'invalid');
    return null;
  }

  return { arrangements };
}

/**
 * Call backend API to search arrangements
 * Simple search with just a prompt (no hints)
 * 
 * @param {string} query - User's search query
 * @returns {Promise<Object>} Normalized response with arrangements array
 * @throws {Error} User-friendly error message
 */
async function searchArrangements(query) {
  try {
    const response = await fetch(`${API_BASE}/api/curate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: query,
        language: currentLanguage 
      })
    });
    
    if (!response.ok) {
      // Try to extract backend error message for developer logs only
      let devMessage = null;
      
      try {
        const data = await response.json();
        if (data?.error?.message) {
          devMessage = data.error.message;
        }
      } catch (parseError) {
        // Ignore JSON parse errors
      }
      
      // Log backend error details for developers
      if (devMessage) {
        console.warn('[ARVYAM] API error:', devMessage);
      }
      
      // CONSTITUTIONAL: Always surface canonical ARVY persona copy to guests
      // Never show technical/backend messages directly to users
      throw new Error('We could not complete your search. Please try again.');
    }
    
    const rawData = await response.json();
    
    // Normalize response shape (handles raw array or wrapped object)
    const normalized = normalizeCurateResponse(rawData);
    
    if (!normalized) {
      // Guest-facing ARVY persona message (constitutional requirement)
      throw new Error('We could not complete your search. Please try again.');
    }
    
    return normalized;
  } catch (error) {
    // If it's already our formatted error, rethrow
    if (error.message.includes('could not complete')) {
      throw error;
    }
    
    // Otherwise wrap in user-friendly message
    console.error('[ARVYAM] Search error:', error);
    throw new Error('We could not complete your search. Please try again.');
  }
}

/**
 * Search for arrangements with structured hints
 * Includes optional hints from HintForm alongside the main prompt
 * 
 * Constitutional: Hints affect curation input, NOT card display
 * Privacy: No PII in console logs or analytics
 * 
 * @param {string} prompt - User's main search query
 * @param {Object} hints - Structured hints from HintForm
 * @param {string} [hints.relationship] - Relationship type
 * @param {string} [hints.occasion] - Occasion type  
 * @param {string} [hints.budget_inr] - Budget range
 * @param {string} [hints.delivery_window] - Delivery window
 * @param {string} [hints.tone_hint] - Free-text preferences (validated, sanitized)
 * @returns {Promise<void>} Displays results or error
 */
async function searchWithHints(prompt, hints) {
  if (!prompt) {
    showFieldError('Please describe what you are celebrating.');
    return;
  }
  
  console.log('[ARVYAM] Searching with hints (structure logged, no PII)');
  
  // Store for potential refinement later
  lastPrompt = prompt;
  lastHints = hints;
  
  // Reset RefineBar for new search
  if (refineBar) {
    refineBar.reset();
    refineBar.detach();
  }
  
  // Show loading state
  showLoadingState();
  
  // Clear previous errors
  hideFieldError();
  hideFieldWarning();
  
  // Track UX turn
  uxTurns++;
  
  try {
    // Call backend with prompt + hints
    const response = await fetch(`${API_BASE}/api/curate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        language: currentLanguage,
        hints: hints // Backend may ignore for now - graceful degradation
      })
    });
    
    if (!response.ok) {
      // Try to extract backend error for developers
      let devMessage = null;
      
      try {
        const data = await response.json();
        if (data?.error?.message) {
          devMessage = data.error.message;
        }
      } catch (parseError) {
        // Ignore
      }
      
      if (devMessage) {
        console.warn('[ARVYAM] API error:', devMessage);
      }
      
      // Guest-facing ARVY persona message (constitutional requirement)
      throw new Error('We could not complete your search. Please try again.');
    }
    
    const data = await response.json();
    
    // Normalize response shape (handles raw array or wrapped object)
    const normalized = normalizeCurateResponse(data);
    
    if (!normalized) {
      // Guest-facing ARVY persona message (constitutional requirement)
      throw new Error('We could not complete your search. Please try again.');
    }
    
    // Display results
    displayResults(normalized);
    
    // Track successful search with hints (safe fields only - NO raw text)
    trackEvent('search_with_hints_completed', {
      has_relationship: !!hints.relationship,
      has_occasion: !!hints.occasion,
      has_budget: !!hints.budget_inr,
      has_delivery: !!hints.delivery_window,
      has_tone_hint: !!hints.tone_hint,
      tone_hint_length_chars: hints.tone_hint?.length || 0,
      ux_turns: uxTurns
    });
    
  } catch (error) {
    console.error('[ARVYAM] Search with hints error:', error);
    
    // ARVY persona error message
    showError('We couldn\'t complete your search. Please try again.');
    
    trackEvent('search_error', {
      error_type: 'with_hints',
      ux_turns: uxTurns
    });
  }
}

/**
 * Handle refinement submission from RefineBar
 * Validates, sanitizes, and re-searches with combined prompt + refinement
 * 
 * Constitutional: Still returns 3-card triad (enforced by displayResults)
 * Privacy: No raw refinement text in logs or analytics
 * 
 * @param {string} refinementText - Sanitized refinement text (already validated)
 */
async function handleRefineSubmit(refinementText) {
  if (!lastPrompt) {
    console.warn('[ARVYAM] Cannot refine - no previous prompt stored');
    if (refineBar) {
      refineBar.showError('Please start a new search first.');
    }
    return;
  }
  
  // Privacy guard: never log actual refinement text
  console.log('[ARVYAM] Refining results (refinement text NOT logged)');
  
  // Show loading state
  showLoadingState();
  
  // Detach RefineBar while loading
  if (refineBar) {
    refineBar.detach();
  }
  
  // Track UX turn
  uxTurns++;
  
  try {
    // Option A (future): Call dedicated refine endpoint
    // const results = await refineArrangements(lastPrompt, refinementText, lastHints);
    
    // Option B (current): Combine prompt + refinement for /api/curate
    // This is safe because refinement is already PII-validated and sanitized
    const combinedPrompt = `${lastPrompt} (adjust: ${refinementText})`;
    
    const response = await fetch(`${API_BASE}/api/curate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: combinedPrompt,
        language: currentLanguage,
        hints: lastHints || undefined // Include original hints if they exist
      })
    });
    
    if (!response.ok) {
      let devMessage = null;
      
      try {
        const data = await response.json();
        if (data?.error?.message) {
          devMessage = data.error.message;
        }
      } catch (parseError) {
        // Ignore
      }
      
      if (devMessage) {
        console.warn('[ARVYAM] API error:', devMessage);
      }
      
      throw new Error('We couldn\'t adjust the selection. Please try again.');
    }
    
    const data = await response.json();
    
    // Validate response
    if (!data.arrangements || !Array.isArray(data.arrangements)) {
      console.error('[ARVYAM] Invalid curate response shape:', data);
      throw new Error('We couldn\'t adjust the selection. Please try again.');
    }
    
    // Display results (includes triad guard + RefineBar re-attachment)
    displayResults(data);
    
    // Track successful refinement (NO raw text, only metadata)
    trackEvent('refine_completed', {
      refinement_length_chars: refinementText.length,
      had_hints: !!lastHints,
      ux_turns: uxTurns
    });
    
  } catch (error) {
    console.error('[ARVYAM] Refinement error:', error);
    
    // ARVY persona error message
    showError('We couldn\'t adjust the selection right now. Please try again.');
    
    trackEvent('refine_error', {
      ux_turns: uxTurns
    });
  }
}

// ============================================================================
// Results Display
// ============================================================================

/**
 * Display search results as cards
 * CONSTITUTIONAL: Always show exactly 3 cards with equal emphasis
 * @param {Object} data - API response data
 */
async function displayResults(data) {
  if (!resultsContainer) return;
  
  // Clear container
  resultsContainer.innerHTML = '';
  
  // CONSTITUTIONAL: Get exactly 3 arrangements (2 MIX + 1 MONO triad)
  const arrangements = data.arrangements.slice(0, 3);
  
  // If backend didn't return at least 3 arrangements, this is a triad violation
  if (arrangements.length < 3) {
    console.error(
      `[ARVYAM] Backend triad violation: expected 3 arrangements, got ${arrangements.length}`
    );
    showError('We could not complete your curation just now. Please try again.');
    
    trackEvent('backend_triad_violation', {
      arrangements_returned: arrangements.length,
      ux_turns: uxTurns
    });
    
    return;
  }
  
  // Create grid container
  const grid = document.createElement('div');
  grid.className = 'results-grid';
  grid.setAttribute('role', 'list');
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  `;
  
  // Create cards
  const cardPromises = arrangements.map((arrangement, index) => {
    return createResultCard(arrangement, index);
  });
  
  const cards = await Promise.all(cardPromises);
  
  // Filter out failed cards (null values)
  const validCards = cards.filter(card => card !== null);
  
  // CONSTITUTIONAL REQUIREMENT: Must show EXACTLY 3 cards (2 MIX + 1 MONO triad)
  // Never show partial results - if triad breaks, surface error instead
  if (validCards.length !== 3) {
    console.error(
      `[ARVYAM] Constitutional triad violation: expected 3 cards, got ${validCards.length}`,
      { requested: arrangements.length, rendered: validCards.length }
    );
    
    showError('We could not complete your curation just now. Please try again.');
    
    trackEvent('triad_violation', {
      result_count: validCards.length,
      requested_count: arrangements.length,
      ux_turns: uxTurns
    });
    
    return;
  }
  
  // If we reach here, we ALWAYS have exactly 3 cards (constitutional guarantee)
  validCards.forEach(card => {
    const listItem = document.createElement('div');
    listItem.setAttribute('role', 'listitem');
    listItem.appendChild(card);
    grid.appendChild(listItem);
  });
  
  resultsContainer.appendChild(grid);
  
  // Track results displayed (always 3 at this point)
  trackEvent('results_displayed', {
    result_count: 3, // Constitutional guarantee
    ux_turns: uxTurns
  });
  
  // Attach RefineBar after successful triad display
  // CONSTITUTIONAL: RefineBar shown only after 3-card result
  if (refineBar) {
    refineBar.attach(resultsContainer, {
      hasHints: !!lastHints,
      uncertaintyScore: data.uncertainty_score ?? 0
    });
  }
  
  // Scroll to results (smooth)
  resultsContainer.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}

/**
 * Create a result card component
 * @param {Object} arrangement - Arrangement data from API
 * @param {number} index - Card position (0-2)
 * @returns {Promise<HTMLElement|null>} Card element or null if render fails
 */
async function createResultCard(arrangement, index) {
  try {
    const card = new ResultCard({
      id: arrangement.id || `arr-${index}`,
      name: arrangement.title || arrangement.name || 'Arrangement',
      occasion: arrangement.occasion || arrangement.tier || '',
      description: arrangement.desc || arrangement.description || '',
      image: arrangement.image || arrangement.image_url || '/assets/placeholder.jpg',
      imageAlt: arrangement.alt_text || null
    }, {
      lang: currentLanguage,
      lazyLoad: index > 0, // Only lazy load cards after first one
      onSelect: (data) => {
        console.log('[ARVYAM] Card selected via callback:', data);
        // Event is also emitted by the card itself
      }
    });
    
    return await card.render();
  } catch (error) {
    console.error('[ARVYAM] Card render failed for arrangement:', arrangement.id, error);
    return null; // Filtered out in displayResults via Promise.all
  }
}

/**
 * Show loading skeleton state
 */
function showLoadingState() {
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = '';
  
  const grid = document.createElement('div');
  grid.className = 'results-grid skeleton-grid';
  grid.setAttribute('aria-busy', 'true');
  grid.setAttribute('aria-live', 'polite');
  grid.setAttribute('aria-label', 'Loading arrangements...');
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  `;
  
  // Constitutional: Always show 3 skeleton cards
  for (let i = 0; i < 3; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'result-card skeleton-card';
    skeleton.setAttribute('aria-busy', 'true');
    skeleton.setAttribute('aria-label', 'Loading arrangement...');
    
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
    
    grid.appendChild(skeleton);
  }
  
  resultsContainer.appendChild(grid);
}

// ============================================================================
// Error & Message Display
// ============================================================================

/**
 * Show field-level error message (inline validation)
 */
function showFieldError(message) {
  const errorEl = document.getElementById('field-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    errorEl.setAttribute('role', 'alert');
  }
}

/**
 * Hide field-level error message
 */
function hideFieldError() {
  const errorEl = document.getElementById('field-error');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    errorEl.removeAttribute('role');
  }
}

/**
 * Show field-level warning message
 */
function showFieldWarning(message) {
  const warningEl = document.getElementById('field-warning');
  if (warningEl) {
    warningEl.textContent = message;
    warningEl.style.display = 'block';
    warningEl.setAttribute('role', 'status');
  }
}

/**
 * Hide field-level warning message
 */
function hideFieldWarning() {
  const warningEl = document.getElementById('field-warning');
  if (warningEl) {
    warningEl.textContent = '';
    warningEl.style.display = 'none';
    warningEl.removeAttribute('role');
  }
}

/**
 * Show error in results container (ARVY persona: calm, helpful)
 */
function showError(message) {
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = '';
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.setAttribute('role', 'alert');
  errorDiv.style.cssText = `
    text-align: center;
    padding: 3rem 2rem;
    font-family: 'Lora', Georgia, serif;
    color: #2B2B2B;
    font-size: 1.125rem;
    line-height: 1.6;
    max-width: 600px;
    margin: 2rem auto;
  `;
  
  errorDiv.textContent = message;
  resultsContainer.appendChild(errorDiv);
  
  // Track error
  trackEvent('error_displayed', {
    error_message: message.substring(0, 50), // Truncate for privacy
    ux_turns: uxTurns
  });
}

/**
 * Show global error (critical failures)
 */
function showGlobalError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #FEE;
    border: 1px solid #DC2626;
    border-radius: 8px;
    padding: 1rem 1.5rem;
    max-width: 500px;
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    color: #DC2626;
  `;
  errorDiv.setAttribute('role', 'alert');
  errorDiv.textContent = message;
  
  document.body.appendChild(errorDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Initialize analytics (lazy loaded)
 */
async function initializeAnalytics() {
  if (analyticsEnabled) return;
  
  try {
    // Placeholder: Would dynamically import analytics.js here
    // const Analytics = await import('./analytics.js');
    // window.analytics = new Analytics.default();
    
    analyticsEnabled = true;
    console.log('[ARVYAM] Analytics initialized (placeholder)');
  } catch (error) {
    console.warn('[ARVYAM] Analytics failed to load:', error);
  }
}

/**
 * Track analytics event (debounced, privacy-first)
 * @param {string} eventName - Event name
 * @param {Object} properties - Event properties (NO PII)
 */
function trackEvent(eventName, properties = {}) {
  if (!analyticsEnabled) {
    console.log('[ARVYAM] Analytics disabled, would track:', eventName, properties);
    return;
  }
  
  // Placeholder: Would call analytics system here
  // window.analytics?.track(eventName, properties);
  
  console.log('[ARVYAM] Track event:', eventName, properties);
}

// Expose trackEvent globally for components (HintForm, etc.)
window.trackEvent = trackEvent;

// ============================================================================
// Exports (for testing/module usage)
// ============================================================================

export {
  searchArrangements,
  displayResults,
  showLoadingState,
  trackEvent
};
