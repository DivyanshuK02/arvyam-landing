/**
 * ARVYAM Input Validators
 * Privacy-first validation patterns for user-submitted free-text fields
 * 
 * Constitutional Compliance:
 * - Privacy: Strict PII detection (email, phone, name context)
 * - Guest-First: Calm, helpful error messages (no technical jargon)
 * - ARVY Persona: "We will ask for contact details later" tone
 * 
 * Reusable by: HintForm (tone_hint), RefineBar (refinement input)
 * 
 * @module validators
 * @version 1.0.0
 */

// ============================================================================
// PII Detection Patterns
// ============================================================================

/**
 * Regular expressions for detecting personally identifiable information
 * Used to prevent accidental PII submission in free-text fields
 * 
 * Constitutional requirement: No PII in logs, analytics, or backend
 */
export const PII_PATTERNS = {
  /**
   * Email detection
   * Matches common email formats including:
   * - Standard: user@domain.com
   * - Subdomains: user@mail.domain.com
   * - Plus addressing: user+tag@domain.com
   * - Dots in local part: first.last@domain.com
   */
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  
  /**
   * Phone number detection
   * Matches various phone formats:
   * - Indian mobile: +91 98765 43210, 9876543210
   * - With separators: (987) 654-3210, 987-654-3210
   * - International: +1-234-567-8900
   * 
   * Pattern: 10+ consecutive digits with optional separators/country codes
   */
  phone: /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4,}/,
  
  /**
   * Name context detection
   * Catches phrases like:
   * - "my name is John"
   * - "I'm Sarah"
   * - "call me Mike"
   * 
   * Note: Intentionally conservative to avoid false positives on common phrases
   * Does NOT catch standalone names (too many false positives)
   */
  nameContext: /(my name is|i'm|i am|call me)\s+[A-Z][a-z]+/i
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates free-text tone hint field
 * Used by HintForm for the optional "Any specific preferences?" field
 * 
 * Validation rules:
 * 1. Length: 0-100 characters (after trim)
 * 2. No email addresses
 * 3. No phone numbers
 * 4. No "my name is..." patterns
 * 
 * @param {string} value - Raw input value from tone hint field
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - Whether input is valid
 * @returns {string} [result.error] - Error message if invalid (ARVY persona tone)
 * 
 * @example
 * validateToneHint("bright colors, modern style")
 * // => { valid: true }
 * 
 * @example
 * validateToneHint("contact me at user@email.com")
 * // => { valid: false, error: "Please do not include email addresses..." }
 */
export function validateToneHint(value) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return { valid: true }; // Empty is valid (optional field)
  }
  
  // Convert to string and trim
  const trimmed = String(value).trim();
  
  // Empty is valid (optional field)
  if (trimmed.length === 0) {
    return { valid: true };
  }
  
  // Length check (max 100 characters)
  if (trimmed.length > 100) {
    return { 
      valid: false, 
      error: "Please keep preferences under 100 characters." 
    };
  }
  
  // PII checks with calm, helpful error messages
  
  // Check for email addresses
  if (PII_PATTERNS.email.test(trimmed)) {
    return { 
      valid: false, 
      error: "Please do not include email addresses. We will ask for contact details later." 
    };
  }
  
  // Check for phone numbers
  if (PII_PATTERNS.phone.test(trimmed)) {
    return { 
      valid: false, 
      error: "Please do not include phone numbers. We will ask for contact details later." 
    };
  }
  
  // Check for name context patterns
  if (PII_PATTERNS.nameContext.test(trimmed)) {
    return { 
      valid: false, 
      error: "Please focus on style preferences rather than personal details." 
    };
  }
  
  // All checks passed
  return { valid: true };
}

/**
 * Validates refinement text field
 * Used by RefineBar for "how should we adjust?" input
 * 
 * Validation rules:
 * 1. Length: 1-50 characters (after trim) - NOT optional, shorter than tone hint
 * 2. No email addresses
 * 3. No phone numbers
 * 
 * @param {string} value - Raw input value from refinement field
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - Whether input is valid
 * @returns {string} [result.error] - Error message if invalid
 * 
 * @example
 * validateRefinement("brighter colors")
 * // => { valid: true }
 * 
 * @example
 * validateRefinement("")
 * // => { valid: false, error: "Please describe how we should adjust..." }
 */
export function validateRefinement(value) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return { 
      valid: false, 
      error: "Please describe how we should adjust the selection." 
    };
  }
  
  // Convert to string and trim
  const trimmed = String(value).trim();
  
  // Empty is INVALID for refinement (required field)
  if (trimmed.length === 0) {
    return { 
      valid: false, 
      error: "Please describe how we should adjust the selection." 
    };
  }
  
  // Length check (max 50 characters - shorter than tone hint)
  if (trimmed.length > 50) {
    return { 
      valid: false, 
      error: "Please keep refinements under 50 characters." 
    };
  }
  
  // PII checks (same as tone hint)
  
  if (PII_PATTERNS.email.test(trimmed)) {
    return { 
      valid: false, 
      error: "Please do not include email addresses." 
    };
  }
  
  if (PII_PATTERNS.phone.test(trimmed)) {
    return { 
      valid: false, 
      error: "Please do not include phone numbers." 
    };
  }
  
  // All checks passed
  return { valid: true };
}

/**
 * Sanitizes user input by trimming and limiting length
 * Does NOT validate - use validation functions first
 * 
 * @param {string} value - Raw input value
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized value (trimmed and truncated)
 * 
 * @example
 * sanitizeInput("  hello world  ", 5)
 * // => "hello"
 */
export function sanitizeInput(value, maxLength = 100) {
  if (value === null || value === undefined) {
    return '';
  }
  
  const trimmed = String(value).trim();
  return trimmed.slice(0, maxLength);
}

/**
 * Checks if a string contains any PII patterns
 * Useful for logging/analytics guards
 * 
 * @param {string} value - String to check
 * @returns {boolean} True if any PII pattern detected
 * 
 * @example
 * containsPII("bright colors")
 * // => false
 * 
 * @example
 * containsPII("call me at 555-1234")
 * // => true
 */
export function containsPII(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  const trimmed = value.trim();
  
  return (
    PII_PATTERNS.email.test(trimmed) ||
    PII_PATTERNS.phone.test(trimmed) ||
    PII_PATTERNS.nameContext.test(trimmed)
  );
}

// ============================================================================
// Enum Validators (for structured fields)
// ============================================================================

/**
 * Valid relationship types for hint form
 * Constitutional requirement: Guest-First - simple, non-corporate language
 */
export const VALID_RELATIONSHIPS = [
  'partner',
  'parent',
  'friend',
  'colleague',
  'client',
  'other'
];

/**
 * Valid occasion types for hint form
 * Occasion enum used by HintForm (not the 8 emotion anchors)
 */
export const VALID_OCCASIONS = [
  'birthday',
  'anniversary',
  'celebration',
  'sympathy',
  'gratitude',
  'apology',
  'just_because'
];

/**
 * Valid budget ranges (INR)
 * Note: Backend uses tier mapping, these are just UI hints
 */
export const VALID_BUDGET_RANGES = [
  '1000-2000',
  '2000-3500',
  '3500-5000',
  '5000+'
];

/**
 * Valid delivery windows
 */
export const VALID_DELIVERY_WINDOWS = [
  'today',
  'tomorrow',
  'this_week',
  'next_week',
  'flexible'
];

/**
 * Validates enum field value
 * 
 * @param {string} value - Value to validate
 * @param {string[]} validValues - Array of valid enum values
 * @returns {boolean} True if value is in validValues array
 */
export function isValidEnum(value, validValues) {
  if (!value) return true; // Empty is valid (optional fields)
  return validValues.includes(value);
}

// ============================================================================
// Exports Summary
// ============================================================================

/**
 * Module exports:
 * 
 * Patterns:
 * - PII_PATTERNS: { email, phone, nameContext }
 * 
 * Validators:
 * - validateToneHint(value) → { valid, error? }
 * - validateRefinement(value) → { valid, error? }
 * - containsPII(value) → boolean
 * - isValidEnum(value, validValues) → boolean
 * 
 * Utilities:
 * - sanitizeInput(value, maxLength) → string
 * 
 * Constants:
 * - VALID_RELATIONSHIPS: string[]
 * - VALID_OCCASIONS: string[]
 * - VALID_BUDGET_RANGES: string[]
 * - VALID_DELIVERY_WINDOWS: string[]
 */
