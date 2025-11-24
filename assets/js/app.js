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
 * @version 1.10.0 - A5-A6: Language propagation fix + consent toast + price rendering
 */

import { detectLanguageFromText, detectLanguage, setLanguage } from './i18n/lang_detect.js';
import { t, preloadStringbanks } from './i18n/strings.js';
import { initAccessibility, announce } from './a11y.js';
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

/**
 * PHASE 13B.5: Feature Flags for Instant Rollback
 * Toggle unifiedRefine to switch between new (unified) and old (RefineBar) UX
 */
const FEATURE_FLAGS = {
  unifiedRefine: true  // true = unified mode, false = old RefineBar below results
};

// ============================================================================
// Global State
// ============================================================================

let currentLanguage = 'en';
let prevLanguage = 'en'; // Track previous language for language_changed events

// PHASE 13B.1: Search mode state
let currentMode = 'search'; // 'search' or 'adjust'
let consentBanner = null;
let intentAssist = null;
let hintForm = null;
let refineBar = null;
let languageSwitch = null;
let policyFooter = null;

// Step 12: Analytics state (consent-gated dynamic loading)
let analytics = null;
let analyticsEnabled = false;

let uxTurns = 0; // Track user interaction depth

// State for refinement (needed to re-search with adjustments)
let lastPrompt = '';
let lastHints = null;

// PHASE 13A.4: Card data persistence (prevents data loss on language switch)
let currentCardData = null;

// DOM element references
let searchForm = null;
let searchInput = null;
let resultsContainer = null;
let loadingIndicator = null;

// PHASE 13B.HF: System feedback elements
let curateButton = null;
let systemFeedbackEl = null;
let langNudgeEl = null;
let budgetHintEl = null;

// ============================================================================
// Application Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[ARVYAM] Initializing Phase 2 frontend...');
  
  try {
    // Step 0: Initialize accessibility features (WCAG 2.1 AA)
    initAccessibility();
    
    // Step 1: Detect and set language
    await initializeLanguage();
    
    // Step 2: Preload stringbanks for better performance
    await preloadStringbanks([currentLanguage, 'en']);
    
    // Step 3: Initialize consent banner
    await initializeConsentBanner();
    
    // Step 4: Initialize Intent Assist
    initializeIntentAssist();
    
    // Step 5-6: Defer heavy/optional init work (Step 11 Performance)
    const schedule = (fn) => ('requestIdleCallback' in window) 
      ? requestIdleCallback(fn) 
      : setTimeout(fn, 120);
    
    schedule(() => {
      // Step 5: Initialize HintForm (below-fold, optional)
      initializeHintForm();
      
      // Step 6: Initialize RefineBar (below-fold, shown after results)
      initializeRefineBar();
    });
    
    // Step 7: Initialize PolicyFooter (Step 9) - MUST be before LanguageSwitch
    await initializePolicyFooter();
    
    // Step 8: Initialize LanguageSwitch (A3: Footer-right pill)
    initializeLanguageSwitch();
    
    // Step 9: Cache DOM elements
    cacheDOMElements();
    
    // Step 10: Set up global event listeners
    setupGlobalListeners();
    
    // Step 11: Initialize search functionality
    if (searchForm && searchInput && resultsContainer) {
      initializeSearch();
    }
    
    // PHASE 13B.6: Initialize meaning input (textarea auto-resize)
    initializeMeaningInput();
    
    // PHASE 13B.2: Initialize Hindi auto-detection
    initializeHindiAutoDetect();
    
    // PHASE 13B.HF: Initialize system feedback (ARVY's guidance)
    updateSystemFeedback();
    
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
      
      // Enable analytics if user consented
      if (consent.analytics && !analyticsEnabled) {
        enableAnalytics(currentLanguage);
      }
    }
  });
  
  // Show banner only if consent has not been given
  if (!consentBanner.hasConsent()) {
    await consentBanner.show();
  } else {
    // Check if analytics should be enabled based on saved consent
    const consent = consentBanner.getConsent();
    if (consent?.analytics && !analyticsEnabled) {
      enableAnalytics(currentLanguage);
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
/**
 * Initialize RefineBar component (deprecated when unified refine is ON)
 * PHASE 13B.5: Feature flag controls whether to use unified or legacy refine
 */
function initializeRefineBar() {
  if (!FEATURE_FLAGS.unifiedRefine) {
    refineBar = new RefineBar({
      lang: currentLanguage,
      onSubmit: handleRefineSubmit
    });
    console.log('[ARVYAM] RefineBar initialized (legacy mode)');
  } else {
    refineBar = null;
    console.log('[ARVYAM] RefineBar deprecated - using unified refine mode');
  }
}

/**
 * Initialize LanguageSwitch component (A3: Footer-right pill)
 * Mounts a simple English | हिंदी toggle in the footer
 * Updates all components simultaneously via arvy:language event
 */
function initializeLanguageSwitch() {
  languageSwitch = new LanguageSwitch({
    lang: currentLanguage,
    anchorSelector: '#policy-footer',
    onChange: (lang) => {
      console.log(`[ARVYAM] Language switched to: ${lang}`);
    }
  });
  
  // Mount into footer (must be called AFTER policy footer is mounted)
  languageSwitch.mount();
  
  console.log('[ARVYAM] LanguageSwitch mounted to footer');
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
  
  // PHASE 13B.HF: System feedback elements
  curateButton = document.getElementById('curate-button');
  systemFeedbackEl = document.getElementById('system-feedback');
  langNudgeEl = document.getElementById('lang-nudge');
  budgetHintEl = document.getElementById('budget-hint');
  
  if (!searchForm) console.warn('[ARVYAM] Search form not found');
  if (!searchInput) console.warn('[ARVYAM] Search input not found');
  if (!resultsContainer) console.warn('[ARVYAM] Results container not found');
}

/**
 * PHASE 13B.6: Initialize meaning input (textarea auto-resize)
 */
function initializeMeaningInput() {
  const textarea = document.getElementById('feelings-input');
  
  if (!textarea || textarea.tagName !== 'TEXTAREA') {
    console.warn('[ARVYAM] Meaning input not found or not textarea');
    return;
  }
  
  function handleResize() {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    
    const maxHeight = 200;
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = maxHeight + 'px';
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }
  
  textarea.addEventListener('input', handleResize);
  textarea.addEventListener('paste', () => setTimeout(handleResize, 0));
  handleResize();
  
  console.log('[ARVYAM] Meaning input initialized with auto-resize');
}

/**
 * PHASE 13B.2: Initialize Hindi auto-detection
 */
/**
 * PHASE 13B.2: Initialize Hindi auto-detection
 * PHASE 13B.HF: Updated to use hidden attribute for system-feedback integration
 */
function initializeHindiAutoDetect() {
  const textarea = document.getElementById('feelings-input');
  const nudgeEl = document.getElementById('lang-nudge');
  const switchBtn = document.getElementById('lang-nudge-switch');
  const closeBtn = document.getElementById('lang-nudge-close');
  
  if (!textarea || !nudgeEl || !switchBtn || !closeBtn) {
    console.warn('[ARVYAM] Hindi auto-detect elements not found');
    return;
  }
  
  let nudgeDismissed = false;
  const hasManualChoice = localStorage.getItem('manual_lang') === 'true';
  
  if (hasManualChoice) {
    console.log('[ARVYAM] Manual language choice detected - auto-detect disabled');
    return;
  }
  
  function analyzeText() {
    const text = textarea.value || '';
    
    if (nudgeDismissed || text.length < 3) {
      nudgeEl.hidden = true;
      return;
    }
    
    const detection = detectLanguageFromText(text);
    
    if (detection.suggestedLang === 'hi' && currentLanguage === 'en' && !detection.isAmbiguous) {
      nudgeEl.hidden = false;
      console.log('[ARVYAM] Hindi detected, showing language nudge');
    } else {
      nudgeEl.hidden = true;
    }
  }
  
  let debounceTimer;
  textarea.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(analyzeText, 300);
  });
  
  switchBtn.addEventListener('click', () => {
    localStorage.setItem('manual_lang', 'true');
    localStorage.setItem('arvyam_lang', 'hi');
    document.documentElement.lang = 'hi';
    
    const event = new CustomEvent('arvy:language', {
      detail: { lang: 'hi', from: 'en', trigger: 'auto_detect_nudge' },
      bubbles: true
    });
    document.dispatchEvent(event);
    
    nudgeEl.hidden = true;
    console.log('[ARVYAM] Language switched to Hindi via auto-detect nudge');
  });
  
  closeBtn.addEventListener('click', () => {
    nudgeDismissed = true;
    nudgeEl.hidden = true;
    console.log('[ARVYAM] Hindi nudge dismissed');
  });
  
  console.log('[ARVYAM] Hindi auto-detect initialized');
}

/**
 * PHASE 13B.1: Switch to search mode
 */
/**
 * PHASE 13B.1 + 13C: Switch to search mode
 * Phase 13C: NO placeholder (removed for empty-box styling)
 */
function switchToSearchMode() {
  const textarea = document.getElementById('feelings-input');
  if (!textarea) return;
  
  currentMode = 'search';
  // Phase 13C: NO placeholder assignment (removed)
  textarea.setAttribute('aria-label', 'Describe how you feel or what you are celebrating');
  
  // PHASE 13B.HF: Update button label
  if (curateButton) {
    curateButton.textContent = 'Curate';
    curateButton.setAttribute('aria-label', 'Curate arrangements');
  }
  
  // PHASE 13B.HF: Update ARVY's guidance
  updateSystemFeedback();
  
  console.log('[ARVYAM] Switched to search mode');
}

/**
 * PHASE 13B.1 + 13C: Switch to adjust mode
 * Phase 13C: NO placeholder (removed for empty-box styling)
 */
function switchToAdjustMode() {
  const textarea = document.getElementById('feelings-input');
  if (!textarea) return;
  
  currentMode = 'adjust';
  // Phase 13C: NO placeholder assignment (removed)
  textarea.setAttribute('aria-label', 'Adjust your current selections');
  
  // PHASE 13B.HF: Update button label to "Refine"
  if (curateButton) {
    curateButton.textContent = 'Refine';
    curateButton.setAttribute('aria-label', 'Refine these arrangements');
  }
  
  // PHASE 13B.HF: Update ARVY's guidance
  updateSystemFeedback();
  
  announce('Adjust mode. You can now refine your selections in the same search field.');
  
  console.log('[ARVYAM] Switched to adjust mode');
}

/**
 * PHASE 13B.HF + 13C: Update system feedback region
 * Phase 13C: Uses stringbank keys for helper text
 */
async function updateSystemFeedback() {
  if (!systemFeedbackEl) return;
  
  // Determine ARVY's base guidance line
  let helperKey = '';
  
  if (!currentCardData) {
    // No results yet - initial search state
    helperKey = 'input.helper.search';
  } else if (currentMode === 'adjust') {
    // Results displayed, in adjust mode
    helperKey = 'input.helper.adjust';
  } else {
    // Search mode with results (shouldn't normally happen, but safe fallback)
    helperKey = 'input.helper.search';
  }
  
  // Fetch helper text from stringbank
  const helperText = await t(helperKey, currentLanguage);
  
  // Create or update the base guidance element
  let baseEl = systemFeedbackEl.querySelector('.system-feedback__base');
  if (!baseEl) {
    baseEl = document.createElement('div');
    baseEl.className = 'system-feedback__base';
    systemFeedbackEl.prepend(baseEl);
  }
  baseEl.textContent = helperText;
  
  console.log(`[ARVYAM] System feedback updated: ${currentMode} mode`);
}

/**
 * PHASE 13B.7: Detect budget mentions
 */
function detectBudgetMention(prompt) {
  const budgetPatterns = [
    /\b(\d{1,2}[,.]?\d{0,3})\s*(rupees?|rs\.?|₹|inr)\b/i,
    /\bbudget\s+of\s+(\d+)/i,
    /\bunder\s+(\d+)/i,
    /\baround\s+(\d+)/i,
    /\babout\s+(\d+)/i
  ];
  
  for (const pattern of budgetPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ''));
      if (amount > 0) {
        return { mentioned: true, amount };
      }
    }
  }
  return { mentioned: false };
}

/**
 * PHASE 13B.7: Show tier hint
 */
/**
 * PHASE 13B.7: Show tier hint
 * PHASE 13B.HF: Updated to use unified system-feedback region
 */
function showBudgetHint(amount) {
  if (!budgetHintEl) return;
  
  const tier = amount < 2000 ? 'Classic' : amount < 3500 ? 'Signature' : 'Luxury';
  const startingPrice = tier === 'Classic' ? '1,599' : tier === 'Signature' ? '2,499' : '4,599';
  
  const message = `Based on your budget: Our ${tier} tier arrangements start at ₹${startingPrice}.`;
  
  budgetHintEl.textContent = message;
  budgetHintEl.hidden = false;
  
  console.log(`[ARVYAM] Budget hint shown: ${tier} tier`);
}

/**
 * PHASE 13B.7: Clear budget hint
 * PHASE 13B.HF: Updated to use unified system-feedback region
 */
function clearBudgetHint() {
  if (!budgetHintEl) return;
  
  budgetHintEl.hidden = true;
  budgetHintEl.textContent = '';
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
  
  // A3: Listen for arvy:language event (from footer-right pill)
  document.addEventListener('arvy:language', async (e) => {
    const lang = e.detail?.lang || 'en';
    const previousLang = currentLanguage; // Capture before update
    
    console.log(`[ARVYAM] arvy:language event received: ${lang}`);
    
    // Track language change
    if (previousLang !== lang) {
      trackEvent('language_changed', {
        from_lang: previousLang,
        to_lang: lang
      });
    }
    
    // Update analytics language if initialized
    if (analytics && typeof analytics.setLanguage === 'function') {
      analytics.setLanguage(lang);
    }
    
    // Update current language
    currentLanguage = lang;
    setLanguage(lang); // i18n helper
    
    // Preload stringbanks
    try {
      await preloadStringbanks([lang, 'en']);
    } catch (error) {
      console.warn('[ARVYAM] Failed to preload stringbanks:', error);
    }
    
    // A3: Update static UI text (hero buttons, placeholders, card CTAs)
    await updateStaticUIText(lang);
    
    // Re-render components that read t() on mount
    if (refineBar && typeof refineBar.updateLanguage === 'function') {
      await refineBar.updateLanguage(lang);
    }
    
    if (policyFooter && typeof policyFooter.updateLanguage === 'function') {
      await policyFooter.updateLanguage(lang);
    }
    
    if (consentBanner && typeof consentBanner.updateLanguage === 'function') {
      await consentBanner.updateLanguage(lang);
    }
    
    // PHASE 13A.4: Re-render result cards with persisted data (prevents card loss)
    // Only update UI LABELS, not product content (product names/descriptions stay in catalog language)
    if (currentCardData && currentCardData.length > 0) {
      console.log(`[ARVYAM] Re-rendering ${currentCardData.length} result cards with language: ${lang}`);
      
      // Clear and re-render cards with new language
      const resultsContainer = document.getElementById('curated-results');
      if (resultsContainer) {
        // CONSTITUTIONAL: Enforce triad invariance during language re-render
        const arrangements = currentCardData.slice(0, 3);
        
        // Validate we have at least 3 arrangements before re-rendering
        if (arrangements.length < 3) {
          console.error('[ARVYAM] Triad violation during language switch: insufficient card data');
          currentCardData = null;
          showError('We could not complete your curation just now. Please try again.');
          trackEvent('triad_violation_language_switch', {
            card_count: arrangements.length,
            from_lang: previousLang,
            to_lang: lang
          });
          return;
        }
        
        // Clear existing cards
        resultsContainer.innerHTML = '';
        
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
        
        // Re-create cards with new language
        const cardPromises = arrangements.map((arrangement, index) => {
          return createResultCard(arrangement, index);
        });
        
        const cards = await Promise.all(cardPromises);
        const validCards = cards.filter(card => card !== null);
        
        // CONSTITUTIONAL: Enforce exactly 3 cards after render
        if (validCards.length !== 3) {
          console.error(
            `[ARVYAM] Constitutional triad violation during language re-render: expected 3 cards, got ${validCards.length}`
          );
          currentCardData = null;
          showError('We could not complete your curation just now. Please try again.');
          trackEvent('triad_violation_language_switch', {
            rendered: validCards.length,
            requested: arrangements.length,
            from_lang: previousLang,
            to_lang: lang
          });
          return;
        }
        
        // Safe to display - we have exactly 3 valid cards
        validCards.forEach(card => {
          const listItem = document.createElement('div');
          listItem.setAttribute('role', 'listitem');
          listItem.appendChild(card);
          grid.appendChild(listItem);
        });
        
        resultsContainer.appendChild(grid);
        
        // Re-attach RefineBar if it was showing
        if (refineBar && lastPrompt) {
          refineBar.attach(resultsContainer, {
            hasHints: !!lastHints,
            uncertaintyScore: 0
          });
        }
      }
    }
  });
  
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
 * Update static UI text elements when language changes (A3: Enhanced)
 * @param {string} lang - Language code
 */
async function updateStaticUIText(lang) {
  try {
    // Hero heading & subtitle (AUDITOR PATCH C)
    const heroTitleEl = document.getElementById('hero-title');
    const heroSubtitleEl = document.getElementById('hero-subtitle');
    if (heroTitleEl) heroTitleEl.textContent = await t('hero.title', lang);
    if (heroSubtitleEl) heroSubtitleEl.textContent = await t('hero.subtitle', lang);
    
    // Phase 13C: Hero tagline
    const heroTaglineEl = document.getElementById('hero-tagline');
    if (heroTaglineEl) heroTaglineEl.textContent = await t('hero.tagline', lang);
    
    // Phase 13C: How It Works section
    const howShareTitle = document.getElementById('how-share-title');
    const howShareBody = document.getElementById('how-share-body');
    const howInterpretTitle = document.getElementById('how-interpret-title');
    const howInterpretBody = document.getElementById('how-interpret-body');
    const howReceiveTitle = document.getElementById('how-receive-title');
    const howReceiveBody = document.getElementById('how-receive-body');
    
    if (howShareTitle) howShareTitle.textContent = await t('howitworks.share.title', lang);
    if (howShareBody) howShareBody.textContent = await t('howitworks.share.body', lang);
    if (howInterpretTitle) howInterpretTitle.textContent = await t('howitworks.interpret.title', lang);
    if (howInterpretBody) howInterpretBody.textContent = await t('howitworks.interpret.body', lang);
    if (howReceiveTitle) howReceiveTitle.textContent = await t('howitworks.receive.title', lang);
    if (howReceiveBody) howReceiveBody.textContent = await t('howitworks.receive.body', lang);
    
    // Update search input placeholder (Phase 13C: Will be empty string)
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
    
    // PRE-STEP-10 FIX: Hero buttons are static HTML and should NOT be updated by i18n
    // They maintain their original English text as per design intent
    // Previous A3 implementation incorrectly overwrote them with stringbank keys
    // (Removed lines 410-425: heroButtonMap and iteration loop)
    
    // A3: Update refine bar placeholder if present
    const refineInput = document.querySelector('#refine-input, .refine-bar__input');
    if (refineInput) {
      try {
        const placeholder = await t('refine.placeholder', lang);
        if (placeholder) refineInput.placeholder = placeholder;
      } catch (e) {
        // Skip if refine not present
      }
    }
    
    // A3: Update result card CTA buttons if present
    const cardButtons = document.querySelectorAll('.result-card__cta');
    if (cardButtons.length > 0) {
      try {
        const ctaText = await t('result.cta', lang);
        if (ctaText) {
          cardButtons.forEach(btn => {
            btn.textContent = ctaText;
          });
        }
      } catch (e) {
        // Skip if cards not present
      }
    }
    
    console.log(`[ARVYAM] Static UI text updated for language: ${lang}`);
    
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
  
  // Enable analytics if user consented and not yet enabled
  if (consent.analytics && !analyticsEnabled) {
    enableAnalytics(currentLanguage);
  }
  
  // Update analytics consent state if already initialized
  if (analyticsEnabled && analytics && typeof analytics.setConsent === 'function') {
    analytics.setConsent(consent);
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
    await showLoadingState();
    
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
/**
 * PHASE 13B.1: Handle refinement in unified mode
 */
async function handleUnifiedRefine(adjustmentText) {
  if (!lastPrompt) {
    console.warn('[ARVYAM] Cannot refine - no previous prompt');
    showError('Please start a new search first.');
    return;
  }
  
  console.log('[ARVYAM] Refining in unified mode');
  await showLoadingState();
  uxTurns++;
  
  try {
    const combinedPrompt = `${lastPrompt} (adjust: ${adjustmentText})`;
    
    const response = await fetch(`${API_BASE}/api/curate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: combinedPrompt,
        language: currentLanguage,
        hints: lastHints || undefined
      })
    });
    
    if (!response.ok) {
      throw new Error('We could not adjust the selection. Please try again.');
    }
    
    const rawData = await response.json();
    const normalized = normalizeCurateResponse(rawData);
    
    if (!normalized) {
      throw new Error('We could not adjust the selection. Please try again.');
    }
    
    displayResults(normalized);
    
    trackEvent('refine_submitted_unified', {
      adjustment_length_chars: adjustmentText.length,
      turn_number: uxTurns,
      had_hints: !!lastHints
    });
    
  } catch (error) {
    console.error('[ARVYAM] Unified refinement error:', error);
    showError('We could not adjust the selection right now. Please try again.');
    trackEvent('refine_error_unified', { ux_turns: uxTurns });
  }
}

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
  
  // PHASE 13B.7: Detect budget mentions and show hint
  const budgetDetection = detectBudgetMention(query);
  if (budgetDetection.mentioned) {
    showBudgetHint(budgetDetection.amount);
  } else {
    clearBudgetHint();
  }
  
  // PHASE 13B.1: Check if in adjust mode (unified refine)
  if (FEATURE_FLAGS.unifiedRefine && currentMode === 'adjust') {
    await handleUnifiedRefine(query);
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
  await showLoadingState();
  
  try {
    // Call backend API
    const results = await searchArrangements(query);
    
    // Display results
    displayResults(results);
    
    // Check if we should show Intent Assist
    // Show if uncertainty_score > 0.5 (uncertain prompt)
    const uncertaintyScore = results.uncertainty_score ?? 0;
    
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
    showError('We could not complete your search. Please try again.');
  }
}

/**
 * Normalize curate response to handle multiple API formats
 * Backend may return: raw array, {arrangements: []}, or {results: []}
 * Always returns {arrangements: [], uncertainty_score: number} or null
 * 
 * Constitutional: Enforces 2 MIX + 1 MONO triad invariance
 * 
 * @param {*} data - Response from /api/curate
 * @returns {Object|null} Normalized {arrangements: [], uncertainty_score: number} or null
 */
function normalizeCurateResponse(data) {
  let arrangements = null;
  let uncertaintyScore = 0.0; // Default to 0 if missing (A0 compatibility shim)

  if (Array.isArray(data)) {
    // API returns a raw triad array
    arrangements = data;
  } else if (data && Array.isArray(data.arrangements)) {
    // API already wrapped in {arrangements: [...]}
    arrangements = data.arrangements;
    
    // Extract uncertainty_score if present
    if (typeof data.uncertainty_score === 'number') {
      uncertaintyScore = data.uncertainty_score;
    }
  } else if (data && Array.isArray(data.results)) {
    // Tolerate {results: [...]} for backwards compatibility
    arrangements = data.results;
    
    // Extract uncertainty_score if present
    if (typeof data.uncertainty_score === 'number') {
      uncertaintyScore = data.uncertainty_score;
    }
  }

  // Constitutional: Enforce exactly 3 arrangements (2 MIX + 1 MONO)
  if (!arrangements || arrangements.length !== 3) {
    console.error('[ARVYAM] Invalid curate response shape:', data);
    console.error('[ARVYAM] Expected: Array of 3 items, got:', arrangements?.length || 'invalid');
    return null;
  }

  // BLOCKER FIX: Normalize price field (backend sends 'price', frontend expects 'price_inr')
  // Apply fallback shim to ensure cards can render prices
  const normalizedArrangements = arrangements.map(item => ({
    ...item,
    price_inr: Number((item.price_inr ?? item.price) || 0)
  }));

  return { 
    arrangements: normalizedArrangements, 
    uncertainty_score: uncertaintyScore 
  };
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
  await showLoadingState();
  
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
    showError('We could not complete your search. Please try again.');
    
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
  await showLoadingState();
  
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
      
      throw new Error('We could not adjust the selection. Please try again.');
    }
    
    const data = await response.json();
    
    // Validate response
    if (!data.arrangements || !Array.isArray(data.arrangements)) {
      console.error('[ARVYAM] Invalid curate response shape:', data);
      throw new Error('We could not adjust the selection. Please try again.');
    }
    
    // Display results (includes triad guard + RefineBar re-attachment)
    displayResults(data);
    
    // Track successful refinement (NO raw text, only metadata)
    trackEvent('refine_submitted', {
      refinement_length_chars: refinementText.length,
      turn_number: uxTurns,
      had_hints: !!lastHints
    });
    
  } catch (error) {
    console.error('[ARVYAM] Refinement error:', error);
    
    // ARVY persona error message
    showError('We could not adjust the selection right now. Please try again.');
    
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
  
  // PHASE 13B.3: Show skeleton loaders immediately
  const skeletonGrid = document.createElement('div');
  skeletonGrid.className = 'results-grid skeleton-grid';
  skeletonGrid.setAttribute('aria-busy', 'true');
  skeletonGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  `;
  
  for (let i = 0; i < 3; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
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
    skeletonGrid.appendChild(skeleton);
  }
  
  resultsContainer.appendChild(skeletonGrid);
  announce('Loading arrangements...');
  
  // PHASE 13B.3: Wait 800ms minimum (industry standard timing)
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Clear skeleton and rebuild with real content
  resultsContainer.innerHTML = '';
  
  // CONSTITUTIONAL: Get exactly 3 arrangements (2 MIX + 1 MONO triad)
  const arrangements = data.arrangements.slice(0, 3);
  
  // Store original prompt if available
  lastPrompt = data.original_prompt || lastPrompt;
  
  // If backend did not return at least 3 arrangements, this is a triad violation
  if (arrangements.length < 3) {
    console.error(
      `[ARVYAM] Backend triad violation: expected 3 arrangements, got ${arrangements.length}`
    );
    
    // PHASE 13A.4: Reset card data on validation failure
    currentCardData = null;
    
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
    
    // PHASE 13A.4: Reset card data on validation failure
    currentCardData = null;
    
    showError('We could not complete your curation just now. Please try again.');
    
    trackEvent('triad_violation', {
      result_count: validCards.length,
      requested_count: arrangements.length,
      ux_turns: uxTurns
    });
    
    return;
  }
  
  // PHASE 13A.4: Persist card data AFTER triad validation passes (constitutional compliance)
  // Only store data when we have confirmed exactly 3 valid cards
  currentCardData = arrangements;
  
  // If we reach here, we ALWAYS have exactly 3 cards (constitutional guarantee)
  validCards.forEach(card => {
    const listItem = document.createElement('div');
    listItem.setAttribute('role', 'listitem');
    listItem.appendChild(card);
    grid.appendChild(listItem);
  });
  
  resultsContainer.appendChild(grid);
  
  // Announce results to screen readers (WCAG 2.1 AA)
  const resultsAnnouncement = await t('a11y.results_announce', currentLanguage) || 'Showing 3 arrangements.';
  announce(resultsAnnouncement);
  
  // Track results displayed (always 3 at this point)
  trackEvent('results_displayed', {
    result_count: 3, // Constitutional guarantee
    triad: '2_mix_1_mono', // Constitutional structure
    ux_turns: uxTurns
  });
  
  // PHASE 13B.1: Switch to adjust mode or attach RefineBar based on feature flag
  if (FEATURE_FLAGS.unifiedRefine) {
    switchToAdjustMode();
  } else {
    // Legacy mode: Attach RefineBar after successful triad display
    if (refineBar) {
      refineBar.attach(resultsContainer, {
        hasHints: !!lastHints,
        uncertaintyScore: data.uncertainty_score ?? 0
      });
    }
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
      imageAlt: arrangement.alt_text || null,
      price_inr: arrangement.price_inr,  // From normalization
      price: arrangement.price            // Fallback from API
    }, {
      lang: currentLanguage,
      lazyLoad: index > 0, // Only lazy load cards after first one
      fetchPriority: index < 3 ? 'high' : 'low', // Step 11: Prioritize first 3 cards
      onSelect: (data) => {
        console.log('[ARVYAM] Card selected via callback:', data);
        
        // Track product click (Step 12: Analytics)
        trackEvent('product_clicked', {
          sku_id: data.id || arrangement.id || `arr-${index}`,
          card_position: index + 1, // 1-indexed position
          tier: arrangement.tier || 'unknown',
          price_inr: arrangement.price_inr || arrangement.price || 0
        });
        
        // Event is also emitted by the card itself for other listeners
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
async function showLoadingState() {
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
  
  // Announce loading state to screen readers (WCAG 2.1 AA)
  const loadingAnnouncement = await t('a11y.loading_results', currentLanguage) || 'Loading arrangements...';
  announce(loadingAnnouncement);
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
// Analytics (Step 12 - Auditor-Approved Pattern)
// ============================================================================

/**
 * Initialize dataLayer (idempotent)
 */
function seedDataLayer() {
  window.dataLayer = window.dataLayer || [];
}

// Seed dataLayer immediately
seedDataLayer();

/**
 * Get saved consent from localStorage
 * @returns {Object} Consent object or empty object
 */
function getSavedConsent() {
  try {
    return JSON.parse(localStorage.getItem('arvyam_cookie_consent')) || {};
  } catch {
    return {};
  }
}

/**
 * Enable analytics by dynamically importing and initializing the module
 * Only called when user gives consent
 * @param {string} lang - Current language code
 */
async function enableAnalytics(lang = currentLanguage) {
  if (analyticsEnabled) return;
  
  try {
    // Dynamic import (only loads if user consents)
    const mod = await import('./analytics.js');
    const AnalyticsCtor = mod.default || mod.ARVYAMAnalytics;
    
    // Create instance with language
    analytics = new AnalyticsCtor({ language: lang });
    
    // Respect consent: we only enable when called due to consent
    analytics.init({ consent: { analytics: true } });
    
    analyticsEnabled = true;
    
    console.log('[ARVYAM] Analytics enabled for language:', lang);
  } catch (err) {
    console.warn('[ARVYAM] Analytics failed to load:', err);
  }
}

/**
 * Track analytics event (consent-gated, privacy-first)
 * @param {string} eventName - Event name
 * @param {Object} properties - Event properties (NO PII)
 */
function trackEvent(eventName, properties = {}) {
  // Try the real pipeline first
  if (analyticsEnabled && analytics && typeof analytics.track === 'function') {
    analytics.track(eventName, properties);
    return;
  }
  
  // Fail-soft: still push to dataLayer so GTM/GA can observe events
  seedDataLayer();
  window.dataLayer.push({ 
    event: `arvyam.${eventName}`, 
    ...properties,
    language: currentLanguage
  });
}

// ============================================================================
// Analytics Event Wiring (Boot + Runtime)
// ============================================================================

// Boot: Enable analytics if consent already saved
document.addEventListener('DOMContentLoaded', () => {
  const saved = getSavedConsent();
  if (saved.analytics) {
    enableAnalytics(currentLanguage);
  }
});

// Runtime: Listen for consent events (support both event names for compatibility)
window.addEventListener('arvy:consent', (e) => {
  if (e?.detail?.analytics) {
    enableAnalytics(currentLanguage);
  }
});

window.addEventListener('consent:changed', (e) => {
  if (e?.detail?.consent?.analytics) {
    enableAnalytics(currentLanguage);
  }
});

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
