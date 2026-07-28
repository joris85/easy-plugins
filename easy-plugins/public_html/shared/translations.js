// Universal translation system for Easy Plugins
let translations = {
    'nl-NL': {},
    'en-GB': {}
};
let currentLanguage = 'en-GB';

// Function to load translation file from server
async function loadTranslations(lang) {
    try {
        const response = await fetch(`/lang/${lang}.ini`);
        const text = await response.text();
        const parsed = parseIniFile(text);
        return parsed;
    } catch (error) {
        console.error(`Error loading translations for ${lang}:`, error);
        // Fallback to embedded translations
        const embedded = getEmbeddedTranslations(lang);
        return embedded;
    }
}

// Embedded translations as fallback
function getEmbeddedTranslations(lang) {
    const embeddedTranslations = {
        'nl-NL': {
            // Basic fallback translations
            HOME_TITLE: "Easy Plugins - Eenvoudige Tools voor Iedereen",
            HOME_SUBTITLE: "Gratis, privacy-gerichte web tools voor dagelijkse taken",
            NAV_EASY_IMAGE: "Easy Image",
            NAV_EASY_HTML: "Easy HTML",
            NAV_EASY_TEXT: "Easy Text",
            NAV_EASY_PRICING: "Easy Pricing",
            NAV_HOME: "Home",
            LANG_SWITCH: "Wissel Taal"
        },
        'en-GB': {
            // Basic fallback translations
            HOME_TITLE: "Easy Plugins - Simple Tools for Everyone",
            HOME_SUBTITLE: "Free, privacy-focused web tools for everyday tasks",
            NAV_EASY_IMAGE: "Easy Image",
            NAV_EASY_HTML: "Easy HTML",
            NAV_EASY_TEXT: "Easy Text",
            NAV_EASY_PRICING: "Easy Pricing",
            NAV_HOME: "Home",
            LANG_SWITCH: "Switch Language"
        }
    };
    return embeddedTranslations[lang] || {};
}

// Function to parse INI file
function parseIniFile(text) {
    const translations = {};
    // Remove BOM if present
    text = text.replace(/^\uFEFF/, '');
    const lines = text.split('\n');
    
    for (let line of lines) {
        line = line.trim();
        
        // Skip empty lines and comments
        if (line === '' || line.startsWith(';')) {
            continue;
        }
        
        // Parse KEY="VALUE" format with more flexible regex
        const match = line.match(/^([A-Z_0-9]+)="(.+?)"$/);
        if (match) {
            translations[match[1]] = match[2];
        }
    }
    
    return translations;
}

// Function to translate text
function translate(key, defaultValue = '') {
    // Check if translation exists
    if (translations[currentLanguage] && translations[currentLanguage][key]) {
        return translations[currentLanguage][key];
    }
    
    // If no translation found, return default value or key
    return defaultValue || key;
}

// Function to set cookie
function setCookie(name, value, days = 365) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

// Function to get cookie
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Function to change language
async function changeLanguage(lang) {
    currentLanguage = lang;
    
    // Load translations from server
    const loadedTranslations = await loadTranslations(lang);
    translations[lang] = loadedTranslations;
    
    // Save to cookie (365 days)
    setCookie('selectedLanguage', lang, 365);
    
    // Also save to localStorage as backup
    localStorage.setItem('selectedLanguage', lang);
    
    // Update active language button
    updateLanguageSwitcher();
    
    // Translate all elements
    translatePage();
}

// Function to update language switcher display
function updateLanguageSwitcher() {
    const langLabel = document.getElementById('lang-label');
    if (langLabel) {
        // Show the inactive language
        if (currentLanguage === 'en-GB') {
            langLabel.textContent = 'NL';
        } else {
            langLabel.textContent = 'EN';
        }
    }
}

// Function to toggle language
function toggleLanguage() {
    const newLang = currentLanguage === 'en-GB' ? 'nl-NL' : 'en-GB';
    changeLanguage(newLang).then(() => {
        // Refresh page to apply translations cleanly
        window.location.reload();
    });
}

// Function to translate page
function translatePage() {
    // Translate elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        const translatedText = translate(key, element.textContent);
        element.textContent = translatedText;
    });
    
    // Translate specific elements by ID
    const elementsToTranslate = {
        'title': 'HOME_TITLE',
        'subtitle': 'HOME_SUBTITLE',
        'nav-easy-image': 'NAV_EASY_IMAGE',
        'nav-easy-html': 'NAV_EASY_HTML',
        'nav-easy-text': 'NAV_EASY_TEXT',
        'nav-easy-pricing': 'NAV_EASY_PRICING',
        'nav-home': 'NAV_HOME'
    };
    
    for (const [elementId, translationKey] of Object.entries(elementsToTranslate)) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = translate(translationKey, element.textContent);
        }
    }
    
    // Force translate with multiple attempts for dynamic content
    setTimeout(() => {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translatedText = translate(key, element.textContent);
            element.textContent = translatedText;
        });
    }, 100);
    
    setTimeout(() => {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translatedText = translate(key, element.textContent);
            element.textContent = translatedText;
        });
    }, 500);
    
    setTimeout(() => {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translatedText = translate(key, element.textContent);
            element.textContent = translatedText;
        });
    }, 1000);
}

// Function to initialize translations
async function initializeTranslations() {
    // Load saved language from cookie, then localStorage, then default to English
    let savedLanguage = getCookie('selectedLanguage');
    if (!savedLanguage) {
        savedLanguage = localStorage.getItem('selectedLanguage');
    }
    if (!savedLanguage) {
        savedLanguage = 'en-GB';
    }
    
    await changeLanguage(savedLanguage);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeTranslations);



