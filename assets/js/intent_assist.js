/**
 * Intent Assist System
 * Helps clarify uncertain prompts through progressive questioning
 * Max 3 questions, privacy-focused budget handling, WCAG 2.1 AA compliant
 */

import { t } from './i18n/strings.js';
import { detectLanguage } from './i18n/lang_detect.js';

export default class IntentAssist {
  constructor(options = {}) {
    this.options = {
      maxQuestions: 3,
      autoShow: true,
      containerSelector: options.containerSelector || 'body',
      ...options
    };

    // State
    this.originalPrompt = '';
    this.currentQuestion = 0;
    this.answers = {
      relationship: null,
      occasion: null,
      tone: null
    };
    this.budgetHint = null;
    this.skipCount = 0;
    this.isVisible = false;

    // DOM elements
    this.container = null;
    this.questionCard = null;
    this.focusTrap = null;

    // Keywords for uncertainty detection
    this.emotionKeywords = [
      'happy', 'sad', 'love', 'sorry', 'congratulations', 'sympathy',
      'joy', 'romance', 'apology', 'celebration', 'grief', 'support'
    ];

    this.occasionKeywords = [
      'birthday', 'anniversary', 'wedding', 'funeral', 'graduation',
      'promotion', 'sorry', 'apology', 'thank', 'congratulations',
      'get well', 'sympathy', 'condolence', 'valentine', 'mother',
      'father', 'christmas', 'diwali', 'holi'
    ];

    this.genericWords = ['flowers', 'bouquet', 'arrangement', 'gift', 'send'];

    // Budget patterns (for privacy-focused extraction)
    this.budgetPatterns = {
      classic: /\b(affordable|budget|cheap|under\s*1500|below\s*1500)\b/i,
      signature: /\b(mid[\s-]?range|moderate|1500|2000|2500|3000)\b/i,
      luxury: /\b(luxury|premium|expensive|high[\s-]?end|above\s*3000|over\s*3000)\b/i
    };

    this._init();
  }

  /**
   * Initialize the Intent Assist system
   * @private
   */
  _init() {
    this._createContainer();
    this._setupEventListeners();
  }

  /**
   * Create container and card elements
   * @private
   */
  _createContainer() {
    // Main container
    this.container = document.createElement('div');
    this.container.id = 'intent-assist-container';
    this.container.className = 'intent-assist-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      max-width: 600px;
      width: calc(100% - 40px);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
    `;

    // Question card
    this.questionCard = document.createElement('div');
    this.questionCard.className = 'intent-assist-card';
    this.questionCard.setAttribute('role', 'dialog');
    this.questionCard.setAttribute('aria-modal', 'false');
    this.questionCard.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      transform: translateY(20px);
      transition: transform 0.3s ease-in-out;
    `;

    this.container.appendChild(this.questionCard);

    // Append to DOM
    const targetContainer = document.querySelector(this.options.containerSelector);
    if (targetContainer) {
      targetContainer.appendChild(this.container);
    }
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for prompt submission
    window.addEventListener('prompt-submitted', (event) => {
      if (event.detail && event.detail.prompt) {
        this.show(event.detail.prompt);
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isVisible) return;

      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }

  /**
   * Check if prompt is uncertain and needs clarification
   * @param {string} prompt - User's original prompt
   * @returns {boolean} True if uncertain
   */
  isUncertain(prompt) {
    const normalized = prompt.toLowerCase().trim();
    const wordCount = normalized.split(/\s+/).length;

    // Check 1: Very short prompt (< 3 words)
    if (wordCount < 3) {
      console.log('Uncertainty detected: prompt too short');
      return true;
    }

    // Check 2: No emotion keywords
    const hasEmotion = this.emotionKeywords.some(keyword =>
      normalized.includes(keyword)
    );

    // Check 3: No occasion keywords
    const hasOccasion = this.occasionKeywords.some(keyword =>
      normalized.includes(keyword)
    );

    // Check 4: Only generic words
    const words = normalized.split(/\s+/);
    const isOnlyGeneric = words.every(word =>
      this.genericWords.includes(word) ||
      word.length <= 2 // articles, prepositions
    );

    // Uncertain if: no emotion AND no occasion, OR only generic words
    const uncertain = (!hasEmotion && !hasOccasion) || isOnlyGeneric;

    if (uncertain) {
      console.log('Uncertainty detected:', {
        hasEmotion,
        hasOccasion,
        isOnlyGeneric,
        wordCount
      });
    }

    return uncertain;
  }

  /**
   * Extract budget hint from prompt (privacy-focused, no direct asking)
   * @param {string} prompt - User's prompt
   * @returns {string|null} Budget tier: 'classic' | 'signature' | 'luxury' | null
   * @private
   */
  _extractBudgetHint(prompt) {
    for (const [tier, pattern] of Object.entries(this.budgetPatterns)) {
      if (pattern.test(prompt)) {
        console.log(`Budget hint detected: ${tier}`);
        return tier;
      }
    }
    return null;
  }

  /**
   * Show Intent Assist dialog
   * @param {string} prompt - User's original prompt
   */
  show(prompt) {
    this.originalPrompt = prompt;
    this.budgetHint = this._extractBudgetHint(prompt);

    // Check if prompt is uncertain
    if (!this.isUncertain(prompt)) {
      console.log('Prompt is confident, skipping Intent Assist');
      // Emit event with original prompt only
      this._emitIntentClarified();
      return;
    }

    // Reset state
    this.currentQuestion = 0;
    this.answers = {
      relationship: null,
      occasion: null,
      tone: null
    };
    this.skipCount = 0;

    // Show first question
    this.askQuestion(1);
    this._show();
  }

  /**
   * Hide Intent Assist dialog
   */
  hide() {
    this.container.style.opacity = '0';
    this.container.style.visibility = 'hidden';
    this.questionCard.style.transform = 'translateY(20px)';
    this.isVisible = false;

    // Release focus trap
    if (this.focusTrap) {
      this.focusTrap = null;
    }

    // Clear content after animation
    setTimeout(() => {
      this.questionCard.innerHTML = '';
    }, 300);
  }

  /**
   * Show dialog with animation
   * @private
   */
  _show() {
    this.container.style.visibility = 'visible';
    this.container.style.opacity = '1';
    this.questionCard.style.transform = 'translateY(0)';
    this.isVisible = true;

    // Set up focus trap
    this._setupFocusTrap();
  }

  /**
   * Ask a specific question
   * @param {number} questionNum - Question number (1, 2, or 3)
   */
  askQuestion(questionNum) {
    this.currentQuestion = questionNum;

    let questionText, options, answerKey;

    switch (questionNum) {
      case 1:
        // Question 1: Relationship
        questionText = t('intent.question1');
        answerKey = 'relationship';
        options = [
          { value: 'romantic', label: t('intent.relationship.romantic') },
          { value: 'family', label: t('intent.relationship.family') },
          { value: 'friend', label: t('intent.relationship.friend') },
          { value: 'colleague', label: t('intent.relationship.colleague') },
          { value: 'self', label: t('intent.relationship.self') }
        ];
        break;

      case 2:
        // Question 2: Occasion
        questionText = t('intent.question2');
        answerKey = 'occasion';
        options = [
          { value: 'birthday', label: t('intent.occasion.birthday') },
          { value: 'anniversary', label: t('intent.occasion.anniversary') },
          { value: 'apology', label: t('intent.occasion.apology') },
          { value: 'celebration', label: t('intent.occasion.celebration') },
          { value: 'justbecause', label: t('intent.occasion.justbecause') },
          { value: 'sympathy', label: t('intent.occasion.sympathy') }
        ];
        break;

      case 3:
        // Question 3: Tone
        questionText = t('intent.question3');
        answerKey = 'tone';
        options = [
          { value: 'joyful', label: t('intent.tone.joyful') },
          { value: 'romantic', label: t('intent.tone.romantic') },
          { value: 'supportive', label: t('intent.tone.supportive') },
          { value: 'elegant', label: t('intent.tone.elegant') },
          { value: 'bright', label: t('intent.tone.bright') },
          { value: 'calm', label: t('intent.tone.calm') }
        ];
        break;

      default:
        console.error('Invalid question number:', questionNum);
        return;
    }

    this._renderQuestion(questionText, options, answerKey);
  }

  /**
   * Render question UI
   * @param {string} questionText - Question text
   * @param {Array} options - Answer options
   * @param {string} answerKey - Answer key (relationship/occasion/tone)
   * @private
   */
  _renderQuestion(questionText, options, answerKey) {
    const progressText = t('intent.progress', {
      current: this.currentQuestion,
      total: this.options.maxQuestions
    });

    this.questionCard.innerHTML = `
      <div class="intent-assist-progress" aria-label="${progressText}">
        ${progressText}
      </div>
      <h3 class="intent-assist-question" id="intent-question">
        ${questionText}
      </h3>
      <div class="intent-assist-options" role="group" aria-labelledby="intent-question">
        ${options.map(option => `
          <button
            class="intent-assist-option"
            data-answer="${option.value}"
            data-key="${answerKey}"
            aria-label="${option.label}"
          >
            ${option.label}
          </button>
        `).join('')}
      </div>
      <button class="intent-assist-skip" aria-label="${t('intent.skip')}">
        ${t('intent.skip')}
      </button>
    `;

    this.questionCard.setAttribute('aria-labelledby', 'intent-question');

    // Add styles
    this._applyStyles();

    // Add event listeners
    this._attachAnswerListeners();
  }

  /**
   * Apply inline styles to question elements
   * @private
   */
  _applyStyles() {
    const progressEl = this.questionCard.querySelector('.intent-assist-progress');
    if (progressEl) {
      progressEl.style.cssText = `
        font-size: 14px;
        color: #666;
        margin-bottom: 12px;
        font-weight: 500;
      `;
    }

    const questionEl = this.questionCard.querySelector('.intent-assist-question');
    if (questionEl) {
      questionEl.style.cssText = `
        font-size: 20px;
        font-weight: 600;
        color: #1a1a1a;
        margin: 0 0 20px 0;
      `;
    }

    const optionsEl = this.questionCard.querySelector('.intent-assist-options');
    if (optionsEl) {
      optionsEl.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      `;

      // Mobile responsive
      if (window.innerWidth < 640) {
        optionsEl.style.gridTemplateColumns = '1fr';
      }
    }

    const optionButtons = this.questionCard.querySelectorAll('.intent-assist-option');
    optionButtons.forEach(btn => {
      btn.style.cssText = `
        background: #f5f5f5;
        border: 2px solid transparent;
        border-radius: 8px;
        padding: 12px 16px;
        font-size: 16px;
        font-weight: 500;
        color: #333;
        cursor: pointer;
        transition: all 0.2s ease;
        min-height: 44px;
        text-align: center;
      `;

      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#e8f5e9';
        btn.style.borderColor = '#4caf50';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#f5f5f5';
        btn.style.borderColor = 'transparent';
      });

      btn.addEventListener('focus', () => {
        btn.style.outline = '2px solid #4caf50';
        btn.style.outlineOffset = '2px';
      });

      btn.addEventListener('blur', () => {
        btn.style.outline = 'none';
      });
    });

    const skipBtn = this.questionCard.querySelector('.intent-assist-skip');
    if (skipBtn) {
      skipBtn.style.cssText = `
        background: transparent;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 10px 20px;
        font-size: 14px;
        color: #666;
        cursor: pointer;
        width: 100%;
        min-height: 44px;
        transition: all 0.2s ease;
      `;

      skipBtn.addEventListener('mouseenter', () => {
        skipBtn.style.background = '#f5f5f5';
      });

      skipBtn.addEventListener('mouseleave', () => {
        skipBtn.style.background = 'transparent';
      });
    }
  }

  /**
   * Attach event listeners to answer buttons
   * @private
   */
  _attachAnswerListeners() {
    const optionButtons = this.questionCard.querySelectorAll('.intent-assist-option');
    optionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const answer = btn.getAttribute('data-answer');
        const key = btn.getAttribute('data-key');
        this.handleAnswer({ key, value: answer });
      });
    });

    const skipBtn = this.questionCard.querySelector('.intent-assist-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.handleAnswer({ skip: true });
      });
    }
  }

  /**
   * Handle user's answer or skip
   * @param {Object} answer - Answer object { key, value } or { skip: true }
   */
  handleAnswer(answer) {
    if (answer.skip) {
      this.skipCount++;
      console.log(`Question ${this.currentQuestion} skipped`);
    } else {
      this.answers[answer.key] = answer.value;
      console.log(`Answer recorded: ${answer.key} = ${answer.value}`);
    }

    // Check if we should continue or finish
    if (this.currentQuestion >= this.options.maxQuestions || this.skipCount >= this.options.maxQuestions) {
      // Finish and emit event
      this._finish();
    } else {
      // Show next question
      this.askQuestion(this.currentQuestion + 1);
    }
  }

  /**
   * Finish questioning and emit intent-clarified event
   * @private
   */
  _finish() {
    this.hide();
    this._emitIntentClarified();
  }

  /**
   * Enrich prompt with answers
   * @returns {string} Enriched prompt
   */
  enrichPrompt() {
    let enriched = this.originalPrompt;

    if (this.answers.relationship) {
      enriched += ` for my ${this.answers.relationship}`;
    }

    if (this.answers.occasion) {
      enriched += ` for ${this.answers.occasion}`;
    }

    if (this.answers.tone) {
      enriched += ` with a ${this.answers.tone} feeling`;
    }

    return enriched.trim();
  }

  /**
   * Emit intent-clarified event
   * @private
   */
  _emitIntentClarified() {
    const eventData = {
      relationship: this.answers.relationship,
      occasion: this.answers.occasion,
      tone: this.answers.tone,
      originalPrompt: this.originalPrompt,
      enrichedPrompt: this.enrichPrompt(),
      budgetHint: this.budgetHint
    };

    console.log('Emitting intent-clarified event:', eventData);

    window.dispatchEvent(new CustomEvent('intent-clarified', {
      detail: eventData
    }));

    // Show budget guidance if available (privacy-focused)
    if (this.budgetHint) {
      const guidanceText = t(`intent.budget.${this.budgetHint}`);
      console.log('Budget guidance:', guidanceText);
      // Could show a subtle toast notification here
    }
  }

  /**
   * Setup focus trap for accessibility
   * @private
   */
  _setupFocusTrap() {
    const focusableElements = this.questionCard.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();

    // Trap focus within dialog
    this.focusTrap = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', this.focusTrap);
  }
}
