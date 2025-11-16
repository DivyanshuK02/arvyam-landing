# Cookie Consent Banner

A WCAG 2.1 AA compliant cookie consent banner component with i18n support, granular consent options, and full keyboard accessibility.

## Features

- ✅ Granular consent options (Functional, Analytics, Marketing*)
- ✅ Multi-language support (English, Hindi)
- ✅ Full keyboard navigation and focus management
- ✅ WCAG 2.1 AA compliant
- ✅ Responsive design (mobile-first)
- ✅ LocalStorage + Cookie persistence
- ✅ Custom events for consent changes
- ✅ ESC key to reject non-essential cookies
- ✅ Focus trap within modal
- ✅ Reduced motion support

*Marketing cookies are planned for future implementation (currently hidden)

## Installation

### 1. Include CSS

Add the component styles to your HTML:

```html
<link rel="stylesheet" href="/assets/css/components.css">
```

### 2. Include JavaScript Module

Import and initialize the consent banner:

```html
<script type="module">
  import ConsentBanner from './assets/js/components/consent_banner.js';

  // Initialize consent banner
  const consentBanner = new ConsentBanner({
    onConsentChange: (consent) => {
      console.log('Consent changed:', consent);

      // Initialize analytics if allowed
      if (consent.analytics) {
        // Initialize your analytics here (e.g., Google Analytics)
        console.log('Analytics enabled');
      }
    }
  });

  // Show banner on page load (only if consent not given)
  document.addEventListener('DOMContentLoaded', () => {
    consentBanner.show();
  });
</script>
```

## Usage

### Basic Usage

```javascript
import ConsentBanner from './assets/js/components/consent_banner.js';

const banner = new ConsentBanner();
banner.show();
```

### With Callback

```javascript
const banner = new ConsentBanner({
  onConsentChange: (consent) => {
    // Handle consent change
    if (consent.analytics) {
      initializeAnalytics();
    }
  }
});

banner.show();
```

### Check Existing Consent

```javascript
const banner = new ConsentBanner();

// Check if user has given consent
if (banner.hasConsent()) {
  const consent = banner.getConsent();
  console.log('User consent:', consent);
  // { functional: true, analytics: true/false, timestamp: "2025-11-15T..." }
}
```

### Listen for Consent Changes

```javascript
window.addEventListener('consent-changed', (event) => {
  const consent = event.detail.consent;
  console.log('Consent updated:', consent);

  // Initialize or disable services based on consent
  if (consent.analytics) {
    initializeAnalytics();
  } else {
    disableAnalytics();
  }
});
```

## API Reference

### Constructor

```javascript
new ConsentBanner(options)
```

**Options:**
- `onConsentChange` (Function): Callback function called when consent changes. Receives consent object as argument.

### Methods

#### `show()`
Display the consent banner modal. Only shows if user hasn't given consent yet.

```javascript
banner.show();
```

#### `hide()`
Dismiss the consent banner modal.

```javascript
banner.hide();
```

#### `getConsent()`
Get the current consent preferences from localStorage.

**Returns:** `Object|null`
```javascript
{
  functional: true,
  analytics: true,
  timestamp: "2025-11-15T12:34:56.789Z"
}
```

#### `hasConsent()`
Check if user has given consent.

**Returns:** `boolean`

```javascript
if (banner.hasConsent()) {
  // User has made a choice
}
```

#### `destroy()`
Clean up the banner and remove event listeners.

```javascript
banner.destroy();
```

## Consent Object Structure

```javascript
{
  functional: true,     // Always true (required cookies)
  analytics: boolean,   // User's choice for analytics
  timestamp: string     // ISO 8601 timestamp
}
```

## Storage

### LocalStorage
Key: `arvyam_consent`
Value: JSON string of consent object

### Cookie
Name: `arvy_consent_v1`
Value: Timestamp of consent
Expiry: 365 days
Path: `/`
SameSite: `Lax`

## Events

### `consent-changed`
Fired when user changes their consent preferences.

```javascript
window.addEventListener('consent-changed', (event) => {
  console.log(event.detail.consent);
});
```

### `language-changed`
The consent banner listens for this event to update UI language.

```javascript
import { saveLanguage } from './assets/js/i18n/lang_detect.js';

// Change language
saveLanguage('hi'); // Triggers language-changed event
```

## Keyboard Navigation

- **Tab** / **Shift+Tab**: Navigate between interactive elements
- **Space** / **Enter**: Activate buttons and checkboxes
- **Escape**: Reject non-essential cookies and close modal

## Accessibility Features

- Semantic HTML with ARIA attributes
- Focus trap within modal
- Clear focus indicators (visible outline + halo)
- Minimum touch target size: 44x44px
- Color contrast ≥ 4.5:1
- Screen reader friendly labels and descriptions
- Keyboard-only navigation support
- Reduced motion support
- High contrast mode support

## Internationalization (i18n)

The banner supports multiple languages. Currently implemented:
- English (en)
- Hindi (hi)

Language is automatically detected from:
1. LocalStorage preference
2. Browser language
3. Default (English)

### Adding New Languages

Edit `assets/js/i18n/strings.js`:

```javascript
const STRINGS = {
  en: { /* ... */ },
  hi: { /* ... */ },
  es: {  // Add Spanish
    consent: {
      title: 'Su privacidad importa',
      // ... more translations
    }
  }
};
```

Update supported languages in `assets/js/i18n/lang_detect.js`:

```javascript
const SUPPORTED_LANGUAGES = ['en', 'hi', 'es'];
```

## Browser Support

- Modern browsers with ES6 module support
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

## License

Part of the ARVYAM project.
