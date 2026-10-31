let cart = [];
let editingCartNoteName = null;
let recentlyAddedCartItemName = null;

let currentCategory = 'all';

let searchTerm = '';

let restaurantAppearance = null;
let defaultCompanyImage = getRestaurantLoadingLogo();

const CUSTOMER_LANGUAGE_KEY = 'customer-menu-language';
let customerLanguage = 'en';
let customerTranslationTimer = null;

async function loadDefaultCompanyImage() {
    try {
        const response =
            await fetch('/api/company-settings');

        const data =
            await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(
                data.message || 'Unable to load the shared default image.'
            );
        }

        defaultCompanyImage =
            data.settings?.defaultImage || getRestaurantLoadingLogo();

        if (!restaurantProfile.logo) {
            const logoElement =
                document.getElementById('restaurantLogo');

            if (logoElement) {
                logoElement.src = defaultCompanyImage;
            }

        }
    } catch (error) {
        console.warn(
            '[menu:default-image] Could not load shared default image:',
            error.message || error
        );
    }
}


function formatCustomerNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return '0';
    }

    const locales = {
        en: 'en',
        am: 'am-ET',
        ar: 'ar-EG-u-nu-arab',
        'zh-CN': 'zh-CN'
    };

    return new Intl.NumberFormat(
        locales[customerLanguage] || 'en',
        { maximumFractionDigits: 2 }
    ).format(number);
}


function localizeCustomerDigits(value) {
    if (customerLanguage !== 'ar') {
        return String(value);
    }

    const arabicDigits = 'Ã™Â Ã™Â¡Ã™Â¢Ã™Â£Ã™Â¤Ã™Â¥Ã™Â¦Ã™Â§Ã™Â¨Ã™Â©';

    return String(value).replace(
        /[0-9]/g,
        digit => arabicDigits[Number(digit)]
    );
}


function protectCustomerNumbers(root = document.body) {
    const walker =
        document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT
        );

    const textNodes = [];
    let textNode;

    while ((textNode = walker.nextNode())) {
        if (!/\d/.test(textNode.nodeValue)) {
            continue;
        }

        if (textNode.parentElement?.closest(
            'input, textarea, select, script, style, .notranslate, [translate="no"], [class*="goog-te"], .customer-language-control'
        )) {
            continue;
        }

        textNodes.push(textNode);
    }

    textNodes.forEach(node => {
        const fragment =
            document.createDocumentFragment();

        node.nodeValue
            .split(/(\d+(?:[,.Ã™Â¬Ã™Â«]\d+)*)/g)
            .forEach(part => {
                if (!part) {
                    return;
                }

                if (/^\d+(?:[,.Ã™Â¬Ã™Â«]\d+)*$/.test(part)) {
                    const number =
                        document.createElement('span');

                    number.className = 'notranslate';
                    number.setAttribute('translate', 'no');
                    number.textContent =
                        localizeCustomerDigits(part);

                    fragment.appendChild(number);
                    return;
                }

                fragment.appendChild(
                    document.createTextNode(part)
                );
            });

        node.parentNode.replaceChild(fragment, node);
    });
}


function formatCustomerCurrency(value) {
    return `<span class="notranslate" translate="no">${formatCustomerNumber(value)}</span> <span class="notranslate" translate="no">ETB</span>`;
}


function applyCustomerLanguageAppearance(background) {
    const control =
        document.querySelector('.customer-language-control');

    const menu =
        document.getElementById('customerLanguageMenu');

    if (!control || !menu || !background) {
        return;
    }

    const popupBackground =
        String(background).match(/#[0-9a-fA-F]{6}/)?.[0] ||
        background;

    control.style.background = background;
    menu.style.background = popupBackground;
}


function updateCustomerLanguageControl() {
    const selector =
        document.getElementById('customerLanguage');

    const label =
        document.getElementById('customerLanguageLabel');

    const toggle =
        document.getElementById('customerLanguageToggle');

    const options =
        document.querySelectorAll('[data-language-option]');

    if (selector) {
        selector.value = customerLanguage;
    }

    options.forEach(option => {
        const selected =
            option.dataset.languageOption === customerLanguage;

        option.setAttribute(
            'aria-checked',
            String(selected)
        );

        if (selected && label) {
            label.textContent =
                option.querySelector('.customer-language-name')?.textContent ||
                'English';
        }
    });

    if (toggle && label) {
        toggle.setAttribute(
            'aria-label',
            `Menu language: ${label.textContent}`
        );
    }
}


function setCustomerLanguageMenuOpen(open, focusOption = false) {
    const toggle =
        document.getElementById('customerLanguageToggle');

    const menu =
        document.getElementById('customerLanguageMenu');

    const control =
        document.getElementById('customerLanguageControl');

    if (!toggle || !menu || !control) {
        return;
    }

    menu.hidden = !open;
    control.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));

    if (open && focusOption) {
        const selectedOption =
            menu.querySelector('[aria-checked="true"]') ||
            menu.querySelector('[data-language-option]');

        selectedOption?.focus();
    }
}


function setCustomerLanguage(language) {
    const supportedLanguages = ['en', 'am', 'ar', 'zh-CN'];

    customerLanguage = supportedLanguages.includes(language)
        ? language
        : 'en';

    localStorage.setItem(
        CUSTOMER_LANGUAGE_KEY,
        customerLanguage
    );

    document.documentElement.lang =
        customerLanguage === 'zh-CN'
            ? 'zh-CN'
            : customerLanguage;

    document.documentElement.dir =
        customerLanguage === 'ar'
            ? 'rtl'
            : 'ltr';

    updateCustomerLanguageControl();
    setCustomerLanguageMenuOpen(false);

    if (Object.keys(foods).length) {
        renderItems();
        renderCategoryButtons();
        renderCart();
    }

    applyCustomerLanguage();
}


function applyCustomerLanguage() {
    updateCustomerLanguageControl();

    const translatorSelect =
        document.querySelector('.goog-te-combo');

    if (!translatorSelect) {
        return false;
    }

    if (customerLanguage === 'en') {
        const translated =
            Boolean(translatorSelect.value) ||
            document.documentElement.classList.contains('translated-ltr') ||
            document.documentElement.classList.contains('translated-rtl');

        if (translated) {
            const expiredCookie =
                'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

            document.cookie = expiredCookie;
            document.cookie =
                `${expiredCookie}; domain=${location.hostname}`;

            window.location.reload();
            return true;
        }
    }

    translatorSelect.value =
        customerLanguage;

    translatorSelect.dispatchEvent(
        new Event('change')
    );

    return true;
}


function queueCustomerTranslation() {
    if (customerLanguage === 'en') {
        return;
    }

    protectCustomerNumbers();

    clearTimeout(customerTranslationTimer);

    customerTranslationTimer = setTimeout(
        applyCustomerLanguage,
        250
    );
}


window.googleTranslateElementInit = function () {
    if (!window.google?.translate?.TranslateElement) {
        return;
    }

    new google.translate.TranslateElement(
        {
            pageLanguage: 'en',
            includedLanguages: 'am,ar,zh-CN',
            autoDisplay: false
        },
        'google_translate_element'
    );

    const storedLanguage =
        localStorage.getItem(CUSTOMER_LANGUAGE_KEY) || 'en';

    setCustomerLanguage(storedLanguage);
};


function applyMenuButtonAppearance(
    appearance = restaurantAppearance
) {

    document
        .querySelectorAll(
            '.buttons button'
        )
        .forEach(button => {

            button.style.background = '';
            button.style.color = '';

            if (!appearance) {
                return;
            }

            button.style.background =
                appearance.button_background || '';

            button.style.color =
                appearance.button_text || '';

            if (button.classList.contains('active')) {
                button.style.background =
                    appearance.selected_button || '';

                button.style.color =
                    appearance.selected_button_text || '';
            }
        });

    document
        .querySelectorAll(
            '.addbutton:not([disabled])'
        )
        .forEach(button => {
            button.style.background =
                appearance
                    ? appearance.add_button_background || ''
                    : '';

            button.style.color =
                appearance
                    ? appearance.add_button_text || ''
                    : '';
        });

    const cartButton =
        document.querySelector(
            '.cartbutton'
        );

    if (cartButton) {
        cartButton.style.background =
            appearance
                ? appearance.cart_button_background || ''
                : '';

        cartButton.style.color =
            appearance
                ? appearance.cart_button_text || ''
                : '';
    }
}


function applyRestaurantAppearance(
    appearance = null
) {

    restaurantAppearance =
        appearance;

    const header =
        document.querySelector(
            '.menu-profile-header'
        );

    if (header) {
        header.style.background = '';
    }

    const languageControl =
        document.querySelector('.customer-language-control');

    const languageSelector =
        document.getElementById('customerLanguage');

    if (languageControl) {
        languageControl.style.background = '';
    }

    if (languageSelector) {
        languageSelector.value = customerLanguage;
    }

    const languageMenu =
        document.getElementById('customerLanguageMenu');

    if (languageMenu) {
        languageMenu.style.background = '';
    }


    const restaurantName =
        document.getElementById(
            'restaurantName'
        );

    if (restaurantName) {
        restaurantName.style.background = '';
        restaurantName.style.color = '';
    }


    document
        .querySelectorAll(
            '.buttons button'
        )
        .forEach(
            button => {
                button.style.background = '';
                button.style.color = '';
            }
        );


    document
        .querySelectorAll(
            '.foodd'
        )
        .forEach(
            card => {
                card.style.background = '';
            }
        );


    document
        .querySelectorAll(
            '.divinfo p'
        )
        .forEach(
            element => {
                element.style.color = '';
            }
        );


    document
        .querySelectorAll(
            '.ingredient'
        )
        .forEach(
            element => {
                element.style.color = '';
            }
        );


    document
        .querySelectorAll(
            '.info2 p'
        )
        .forEach(
            element => {
                element.style.color = '';
            }
        );


    const container =
        document.querySelector(
            '.container'
        );

    if (container) {
        container.style.background = '';
    }

    applyMenuButtonAppearance();

    if (!appearance) {
        return;
    }


    if (header) {
        header.style.background =
            appearance.header_background || '';

        applyCustomerLanguageAppearance(
            appearance.header_background ||
                getComputedStyle(header).background
        );
    }


    if (restaurantName) {

        restaurantName.style.background =
            appearance.restaurant_name || '';

        restaurantName.style.color =
            appearance.restaurant_name_text || '';
    }


    document
        .querySelectorAll(
            '.foodd'
        )
        .forEach(
            card => {
                card.style.background =
                    appearance.card_background || '';
            }
        );


    document
        .querySelectorAll(
            '.divinfo p'
        )
        .forEach(
            element => {
                element.style.color =
                    appearance.item_name || '';
            }
        );


    document
        .querySelectorAll(
            '.ingredient'
        )
        .forEach(
            element => {
                element.style.color =
                    appearance.description || '';
            }
        );


    document
        .querySelectorAll(
            '.info2 p'
        )
        .forEach(
            element => {
                element.style.color =
                    appearance.price || '';
            }
        );


    if (container) {
        container.style.background =
            appearance.page_background || '';
    }
}

let restaurantProfile = {
    logo: '',
    phone_numbers: [],
    addresses: []
};

const API_BASE = '';

/* ==========================================================================
   RESTAURANT SLUG
   ========================================================================== */

const pathSlug =
    window.location.pathname
        .split('/')
        .filter(Boolean)[0];

const CAFE_SLUG =
    (pathSlug && pathSlug !== 'save.html'
        ? pathSlug
        : null) ||
    localStorage.getItem('selectedRestaurantSlug')?.trim() ||
    '';

const STORAGE_KEY =
    `simple-cart:${encodeURIComponent(CAFE_SLUG)}`;

let foods = {};
let customerMenuExpirationTimer = null;


/* ==========================================================================
   TOAST NOTIFICATIONS
   ========================================================================== */

function showToast(
    message,
    type = 'success',
    duration = 3000
) {
    let toastContainer =
        document.getElementById('toast-container');

    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    toastContainer.innerHTML = '';

    const toast = document.createElement('div');

    toast.className =
        `toast-message toast-${type}`;

    if (type === 'loading') {
        toast.innerHTML = `
            <span class="toast-spinner"></span>
            <span>${escapeHtml(message)}</span>
        `;
    } else {
        toast.innerHTML = `
            <span>${escapeHtml(message)}</span>
        `;
    }

    toastContainer.appendChild(toast);

    if (type !== 'loading') {
        setTimeout(() => {
            toast.classList.add('toast-hide');

            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    queueCustomerTranslation();
}


function hideToast() {
    const toastContainer =
        document.getElementById('toast-container');

    if (toastContainer) {
        toastContainer.innerHTML = '';
    }
}


/* ==========================================================================
   HTML ESCAPING
   ========================================================================== */

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function escapeAttribute(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}


/* ==========================================================================
   RESTAURANT HEADER LOADING
   ========================================================================== */

function getRestaurantLoadingLogo() {
    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="180"
            height="180"
            viewBox="0 0 180 180"
        >
            <rect
                width="180"
                height="180"
                rx="24"
                fill="#f5efe6"
            />

            <circle
                cx="90"
                cy="72"
                r="25"
                fill="none"
                stroke="#9a6b3f"
                stroke-width="6"
                stroke-linecap="round"
                stroke-dasharray="90 70"
            >
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 90 72"
                    to="360 90 72"
                    dur="1s"
                    repeatCount="indefinite"
                />
            </circle>

            <text
                x="90"
                y="125"
                text-anchor="middle"
                font-family="Arial, sans-serif"
                font-size="15"
                font-weight="700"
                fill="#6b4a2f"
            >
                Loading...
            </text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}


function showRestaurantHeaderLoading() {
    const restaurantName =
        document.getElementById('restaurantName');

    if (restaurantName) {
        restaurantName.textContent = 'Loading...';

        restaurantName.classList.add(
            'restaurant-loading-name'
        );

        restaurantName.setAttribute(
            'aria-busy',
            'true'
        );
    }

    const logoElement =
        document.getElementById('restaurantLogo');

    if (logoElement) {
        logoElement.src = defaultCompanyImage;

        logoElement.alt = '';

        logoElement.onerror = function () {
            this.onerror = null;
            this.src = defaultCompanyImage;
            this.alt = '';
        };

        logoElement.classList.add(
            'restaurant-loading-logo'
        );

        logoElement.style.display =
            'block';

        logoElement.setAttribute(
            'aria-busy',
            'true'
        );
    }
}


function hideRestaurantHeaderLoading() {
    const restaurantName =
        document.getElementById('restaurantName');

    if (restaurantName) {
        restaurantName.classList.remove(
            'restaurant-loading-name'
        );

        restaurantName.removeAttribute(
            'aria-busy'
        );
    }

    const logoElement =
        document.getElementById('restaurantLogo');

    if (logoElement) {
        logoElement.classList.remove(
            'restaurant-loading-logo'
        );

        logoElement.removeAttribute(
            'aria-busy'
        );
    }
}


function showRestaurantHeaderError() {
    const restaurantName =
        document.getElementById('restaurantName');

    if (restaurantName) {
        restaurantName.textContent =
            'Menu unavailable';

        restaurantName.classList.remove(
            'restaurant-loading-name'
        );

        restaurantName.removeAttribute(
            'aria-busy'
        );
    }

    const logoElement =
        document.getElementById('restaurantLogo');

    if (logoElement) {
    logoElement.classList.remove(
        'restaurant-loading-logo'
    );

    logoElement.removeAttribute(
        'aria-busy'
    );

    logoElement.src =
        defaultCompanyImage;

    logoElement.alt = '';

    logoElement.style.display =
        'block';
}
}


function getCustomerMenuErrorDetails(error) {
    const status = Number(error?.httpStatus) || 0;
    const responseData = error?.responseData || {};

    if (error?.code === 'MISSING_RESTAURANT_SLUG') {
        return {
            title: 'Restaurant slug missing',
            message:
                'This menu link does not identify a restaurant. Open the menu using the restaurantâ€™s registered menu link.'
        };
    }

    if (status === 404) {
        return {
            title: 'Restaurant not found',
            message: `The restaurant slug "${CAFE_SLUG}" is not registered. Check the menu link and try again.`
        };
    }

    if (status === 403) {
        return {
            title: 'Restaurant menu unavailable',
            message:
                responseData.message ||
                'This restaurant is disabled and its customer menu is unavailable.'
        };
    }

    if (status === 410) {
        return {
            title: 'Menu access expired',
            message:
                responseData.message ||
                'This restaurant menu has expired.'
        };
    }

    if (
        !status &&
        ['TypeError', 'NetworkError'].includes(error?.name)
    ) {
        return {
            title: 'Network connection problem',
            message:
                'The menu could not be reached. Check your internet connection and try again.'
        };
    }

    if (error?.name === 'AbortError') {
        return {
            title: 'Menu request interrupted',
            message: 'The menu request was interrupted. Please try again.'
        };
    }

    if (status >= 500) {
        return {
            title: 'Server error',
            message:
                responseData.message ||
                'The menu service is temporarily unavailable. Please try again shortly.'
        };
    }

    return {
        title: 'Could not load menu',
        message:
            responseData.message ||
            error?.message ||
            'The menu could not be loaded. Please try again.'
    };
}


function showCustomerMenuLoadError(error, { blockMenu = true } = {}) {
    hideCustomerMenuLoading();
    const details = getCustomerMenuErrorDetails(error);
    const panel =
        document.getElementById('customerMenuLoadError');

    if (!panel) {
        console.error(
            '[menu:load] Customer error panel is missing.',
            error
        );
        return;
    }

    document.getElementById('customerMenuLoadErrorTitle')
        .textContent = details.title;
    document.getElementById('customerMenuLoadErrorMessage')
        .textContent = details.message;
    document.getElementById('customerMenuLoadErrorSlug')
        .textContent = CAFE_SLUG;
    document.getElementById('customerMenuLoadErrorStatus')
        .textContent = error?.code === 'MISSING_RESTAURANT_SLUG'
            ? 'Request not sent'
            : error?.httpStatus
                ? `HTTP ${error.httpStatus}`
                : 'No HTTP response (network)';

    document.getElementById('customerMenuRetryButton').onclick =
        () => loadMenuFromServer();

    panel.hidden = false;

    const header = document.querySelector('.menu-profile-header');
    if (header) {
        header.hidden = blockMenu;
    }

    const main = document.querySelector('.main');
    if (main) {
        main.hidden = blockMenu;
    }

    document.title = `${details.title} - Cafe Menu`;
}

function showCustomerMenuLoading() {
    const loading =
        document.getElementById('customerMenuLoading');

    if (loading) {
        loading.hidden = false;
    }
}

function hideCustomerMenuLoading() {
    const loading =
        document.getElementById('customerMenuLoading');

    if (loading) {
        loading.hidden = true;
    }
}


function hideCustomerMenuLoadError() {
    const panel =
        document.getElementById('customerMenuLoadError');

    if (panel) {
        panel.hidden = true;
    }
}


async function loadRestaurantLogo() {

    console.log(
        '[menu:logo] Loading restaurant logo...'
    );

    try {

        const response = await fetch(
            `${API_BASE}/api/menu/${encodeURIComponent(CAFE_SLUG)}/logo`,
            {
                method: 'GET',
                cache: 'default',
                headers: {
                    'Accept': 'text/plain'
                }
            }
        );

        console.log(
            '[menu:logo] Server response:',
            response.status,
            response.statusText
        );

        if (!response.ok) {

            throw new Error(
                `Logo request returned HTTP ${response.status}`
            );
        }


        /* =========================================================
           LOGO ENDPOINT RETURNS THE BASE64 DATA URI AS TEXT
           ========================================================= */

        const logo =
            (await response.text()).trim();


        if (!logo) {

            throw new Error(
                'Restaurant logo is empty.'
            );
        }


        /* =========================================================
           VALIDATE LOGO FORMAT
           ========================================================= */

        if (
            !logo.startsWith('data:image/')
        ) {

            throw new Error(
                'Invalid restaurant logo format.'
            );
        }


        /* =========================================================
           SAVE LOGO
           ========================================================= */

        restaurantProfile.logo = logo;


        /* =========================================================
           UPDATE IMAGE WITHOUT RE-RENDERING THE MENU
           ========================================================= */

        const logoElement =
            document.getElementById(
                'restaurantLogo'
            );

        if (logoElement) {

            logoElement.src = logo;

            logoElement.alt = '';

            logoElement.onerror = function () {
                this.onerror = null;
                this.src = defaultCompanyImage;
                this.alt = '';
            };

            logoElement.style.display =
                'block';

            logoElement.classList.remove(
                'restaurant-loading-logo'
            );

            logoElement.removeAttribute(
                'aria-busy'
            );
        }


        const cartSheet =
            document.getElementById('cartSheet');

        const cartSheetBackground =
            document.getElementById('cartSheetBackground');

        if (cartSheet && cartSheetBackground) {
            cartSheetBackground.fetchPriority = 'high';
            cartSheetBackground.decoding = 'async';

            cartSheetBackground.onload = () => {
                cartSheet.classList.add(
                    'has-restaurant-background'
                );
            };

            cartSheetBackground.onerror = () => {
                cartSheet.classList.remove(
                    'has-restaurant-background'
                );
            };

            if (
                cartSheetBackground.getAttribute('src') !== logo
            ) {
                cartSheetBackground.src = logo;
            }

            if (
                cartSheetBackground.complete &&
                cartSheetBackground.naturalWidth > 0
            ) {
                cartSheet.classList.add(
                    'has-restaurant-background'
                );
            }
        }
        console.log(
            '[menu:logo] Restaurant logo loaded successfully.'
        );

    } catch (error) {

        /*
         * IMPORTANT:
         * Logo failure must NOT break the menu.
         * The white logo board simply remains visible.
         */

        console.warn(
            '[menu:logo] Could not load restaurant logo:',
            error?.message || error
        );

        restaurantProfile.logo = '';

        const logoElement =
            document.getElementById(
                'restaurantLogo'
            );

        if (logoElement) {

            logoElement.src =
                defaultCompanyImage;

            logoElement.alt = '';

            logoElement.onerror = function () {
                this.onerror = null;
                this.src = defaultCompanyImage;
                this.alt = '';
            };

            logoElement.style.display =
                'block';

            logoElement.classList.remove(
                'restaurant-loading-logo'
            );

            logoElement.removeAttribute(
                'aria-busy'
            );
        }
    }
}




function showCustomerMenuExpirationStatus(data) {
    const existing =
        document.getElementById('customerMenuExpirationStatus');

    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'customerMenuExpirationStatus';
    overlay.className = 'menu-expiration-overlay';
    overlay.setAttribute('role', 'presentation');

    const dialog = document.createElement('section');
    dialog.className = 'menu-expiration-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'customerMenuExpirationTitle');

    const header = document.createElement('div');
    header.className = 'menu-expiration-dialog-header';

    const heading = document.createElement('h2');
    heading.id = 'customerMenuExpirationTitle';
    heading.textContent = 'Menu access expired';
    header.appendChild(heading);

    const content = document.createElement('div');
    content.className = 'menu-expiration-warning-list';

    const card = document.createElement('article');
    card.className = 'menu-expiration-warning-card is-expired';

    const status = document.createElement('strong');
    status.className = 'menu-expiration-days';
    status.textContent = 'Expired Â· 0 days remaining';

    const message = document.createElement('p');
    message.className = 'menu-expiration-explanation';
    message.textContent =
        'The restaurant menu has passed its expiration date. Please contact the restaurant for assistance.';

    const details = document.createElement('dl');
    details.className = 'menu-expiration-details';

    [
        ['Restaurant', data.restaurant?.name || 'Restaurant'],
        ['Slug', data.restaurant?.slug || ''],
        ['Expiration', formatMenuExpirationDate(data.expirationDate)]
    ].forEach(([label, value]) => {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value;
        row.append(term, description);
        details.appendChild(row);
    });

    card.append(status, message, details);
    content.appendChild(card);

    dialog.append(header, content);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}


function scheduleCustomerMenuExpiration(expirationDate, restaurant) {
    if (customerMenuExpirationTimer) {
        window.clearInterval(customerMenuExpirationTimer);
        customerMenuExpirationTimer = null;
    }

    if (!expirationDate) {
        return;
    }

    const enforceExpiration = () => {
        if (getMenuExpirationDaysRemaining(expirationDate) > 0) {
            return false;
        }

        window.clearInterval(customerMenuExpirationTimer);
        customerMenuExpirationTimer = null;
        foods = {};
        renderItems();
        renderCategoryButtons();
        showCustomerMenuExpirationStatus({
            expired: true,
            restaurant,
            expirationDate
        });
        return true;
    };

    if (enforceExpiration()) {
        return;
    }

    customerMenuExpirationTimer = window.setInterval(
        enforceExpiration,
        60000
    );
}


async function loadMenuFromServer() {
    if (!CAFE_SLUG) {
        const error = new Error(
            'The menu link does not contain a restaurant slug.'
        );
        error.code = 'MISSING_RESTAURANT_SLUG';
        showCustomerMenuLoadError(error);
        return;
    }

    console.log(
        '[menu:load] Restaurant slug:',
        CAFE_SLUG
    );

    console.log(
        '[menu:load] Request URL:',
        `${API_BASE}/api/menu/${encodeURIComponent(CAFE_SLUG)}`
    );

    showCustomerMenuLoading();
    showRestaurantHeaderLoading();
    hideCustomerMenuLoadError();

    try {

        /* =========================================================
           LOAD FAST MENU API
           ========================================================= */

        const response = await fetch(
            `${API_BASE}/api/menu/${encodeURIComponent(CAFE_SLUG)}`,
            {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        console.log(
            '[menu:load] Server response:',
            response.status,
            response.statusText
        );

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            const error = new Error(
                'The server returned an unreadable menu response.'
            );
            error.httpStatus = response.status;
            error.cause = parseError;
            throw error;
        }

        console.log(
            '[menu:load] API data received:',
            data
        );

        if (!response.ok) {
            const error = new Error(
                data?.message ||
                `Server returned HTTP ${response.status}`
            );

            error.httpStatus = response.status;
            error.responseData = data;
            error.menuExpiration = data;
            throw error;
        }

        if (!data || data.ok !== true) {
            throw new Error(
                data?.message ||
                'Invalid restaurant response.'
            );
        }

        if (!data.restaurant) {
            throw new Error(
                'Restaurant information is missing.'
            );
        }

        if (!data.menu || typeof data.menu !== 'object') {
            throw new Error(
                'Restaurant menu is missing.'
            );
        }

        scheduleCustomerMenuExpiration(
            data.restaurant.menuExpirationDate,
            data.restaurant
        );

        const header = document.querySelector('.menu-profile-header');
        if (header) {
            header.hidden = false;
        }

        const main = document.querySelector('.main');
        if (main) {
            main.hidden = false;
        }


        /* =========================================================
           RESTAURANT NAME
           ========================================================= */

        const realRestaurantName =
            String(
                data.restaurant.name || ''
            ).trim();

        const restaurantNameElement =
            document.getElementById(
                'restaurantName'
            );

        if (restaurantNameElement) {

            restaurantNameElement.textContent =
                realRestaurantName ||
                'Cafe Menu';

            restaurantNameElement.removeAttribute(
                'aria-busy'
            );

            restaurantNameElement.classList.remove(
                'restaurant-loading-name'
            );
        }


        /* =========================================================
           PAGE TITLE
           ========================================================= */

        if (realRestaurantName) {

            document.title =
                `${realRestaurantName} - Cafe Menu`;
        }


        /* =========================================================
           RESTAURANT PROFILE
           
           IMPORTANT:
           The main menu API no longer contains the logo.
           The logo will be loaded separately below.
           ========================================================= */

        restaurantProfile = {

            logo: '',

            phone_numbers:
                Array.isArray(
                    data.profile?.phone_numbers
                )
                    ? data.profile.phone_numbers
                    : [],

            addresses:
                Array.isArray(
                    data.profile?.addresses
                )
                    ? data.profile.addresses
                    : []
        };



        restaurantAppearance =
            data.appearance ||
            null;

        /* =========================================================
           MENU
           ========================================================= */

        foods = data.menu;

        console.log(
            '[menu:load] Restaurant loaded:',
            realRestaurantName
        );

        console.log(
            '[menu:load] Menu categories:',
            Object.keys(foods)
        );

        console.log(
            '[menu:load] Menu items:',
            foods
        );


        /* =========================================================
           RENDER MENU IMMEDIATELY
           
           Do NOT wait for the large logo.
           ========================================================= */

        renderRestaurantProfile();

        renderItems();

        renderCategoryButtons();

        applyRestaurantAppearance(
            restaurantAppearance
        );


        /* =========================================================
           DAY SPECIAL
           ========================================================= */

        setupDaySpecial();


        /* =========================================================
           MENU IS READY
           
           Hide loading immediately.
           ========================================================= */

        hideRestaurantHeaderLoading();

        console.log(
            '[menu:load] Restaurant menu loaded successfully.'
        );


        /* =========================================================
           LOAD LARGE RESTAURANT LOGO IN BACKGROUND
           
           This does NOT block the menu.
           If the logo fails, the menu still works.
           ========================================================= */

        loadRestaurantLogo()
            .catch(error => {

                console.warn(
                    '[menu:logo] Background logo loading failed:',
                    error?.message || error
                );

            });


    } catch (error) {

        console.error(
            '[menu:load] Could not load restaurant:',
            error
        );

        foods = {};

        restaurantProfile = {
            logo: '',
            phone_numbers: [],
            addresses: []
        };

        if (error?.menuExpiration?.expired) {
            showCustomerMenuExpirationStatus(
                error.menuExpiration
            );
        }

        showRestaurantHeaderError();
        showCustomerMenuLoadError(error);

        renderRestaurantProfile();

        renderItems();

        renderCategoryButtons();

        setupDaySpecial();


        if (error?.name === 'AbortError') {

            console.error(
                '[menu:load] Restaurant menu request was aborted.'
            );

        } else {

            console.error(
                '[menu:load] Restaurant menu request failed:',
                error?.message || error
            );
        }
    } finally {

        hideCustomerMenuLoading();
        hideRestaurantHeaderLoading();

    }
}







/* ==========================================================================
   SILENT CUSTOMER MENU REFRESH
   ========================================================================== */

/*
 * This refresh runs automatically every 15 seconds.
 *
 * IMPORTANT:
 * - It does NOT show the Loading... screen.
 * - It does NOT clear the customer's cart.
 * - It does NOT reset the selected category.
 * - It does NOT reset the search box.
 * - It does NOT create duplicate Day Special listeners.
 *
 * This allows changes made by the restaurant admin to appear
 * automatically on the customer menu.
 */

async function refreshCustomerMenuSilently() {

    /*
     * Do not refresh while the browser tab is hidden.
     * This prevents unnecessary requests.
     */
    if (document.hidden) {
        return;
    }

    try {
        const response =
            await fetch(
                API_BASE +
                `/api/menu/${encodeURIComponent(CAFE_SLUG)}`,
                {
                    method: 'GET',
                    cache: 'default',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                }
            );

        if (!response.ok) {
            let responseData = {};
            try {
                responseData = await response.json();
            } catch (parseError) {
                console.warn(
                    '[menu:refresh] Server returned an unreadable error response:',
                    parseError
                );
            }

            const error = new Error(
                responseData.message ||
                `Server returned HTTP ${response.status}`
            );
            error.httpStatus = response.status;
            error.responseData = responseData;

            if ([403, 404, 410].includes(response.status)) {
                foods = {};
                renderItems();
                renderCategoryButtons();
                showCustomerMenuLoadError(error);
            } else {
                showCustomerMenuLoadError(error, {
                    blockMenu: false
                });
            }
            return;
        }

        const data =
            await response.json();

        hideCustomerMenuLoadError();
        const header = document.querySelector('.menu-profile-header');
        if (header) {
            header.hidden = false;
        }
        const main = document.querySelector('.main');
        if (main) {
            main.hidden = false;
        }

        /*
         * Restaurant name
         */
        if (data?.restaurant) {
            const restaurantName =
                document.getElementById(
                    'restaurantName'
                );

            if (restaurantName) {
                restaurantName.textContent =
                    data.restaurant.name ||
                    'Cafe Menu';

                restaurantName.classList.remove(
                    'restaurant-loading-name'
                );

                restaurantName.removeAttribute(
                    'aria-busy'
                );
            }

            document.title =
                `${data.restaurant.name || 'Cafe'} Menu`;
        }

        /*
         * Restaurant profile
         *
         * This is important because profile/logo changes
         * are saved separately from menu_data.
         */
        if (
            data?.profile &&
            typeof data.profile === 'object'
        ) {
            restaurantProfile = {
                logo:
                    typeof data.profile.logo === 'string' &&
                    data.profile.logo.trim()
                        ? data.profile.logo.trim()
                        : restaurantProfile.logo,

                phone_numbers:
                    Array.isArray(
                        data.profile.phone_numbers
                    )
                        ? data.profile.phone_numbers
                        : [],

                addresses:
                    Array.isArray(
                        data.profile.addresses
                    )
                        ? data.profile.addresses
                        : []
            };
        } else {
            restaurantProfile = {
                logo: '',
                phone_numbers: [],
                addresses: []
            };
        }

        restaurantAppearance =
            data.appearance ||
            null;


        /*
         * Menu
         */
        if (
            data?.menu &&
            typeof data.menu === 'object' &&
            !Array.isArray(data.menu)
        ) {
            foods = data.menu;
        } else {
            foods = {};
        }

        /*
         * Re-render current customer view.
         *
         * currentCategory and searchTerm are NOT changed,
         * so the customer stays where they are.
         */
        renderRestaurantProfile();

        renderItems();

        renderCategoryButtons();

        applyRestaurantAppearance(
            restaurantAppearance
        );

        /*
         * Do NOT call setupDaySpecial() repeatedly unless necessary.
         * updateDaySpecialButtonState() is enough because the event
         * listener was already installed on first page load.
         */
        updateDaySpecialButtonState();


    } catch (error) {
        console.error(
            'Silent customer menu refresh failed:',
            error
        );
        showCustomerMenuLoadError(error, {
            blockMenu: false
        });
    }
}

function renderRestaurantProfile() {

    /* ----------------------------------------------------------------------
       RESTAURANT LOGO
       ---------------------------------------------------------------------- */

    const logoElement =
        document.getElementById(
            'restaurantLogo'
        );

    const logo =
        typeof restaurantProfile.logo === 'string'
            ? restaurantProfile.logo.trim()
            : '';

    if (logoElement) {
        logoElement.fetchPriority = 'high';
        logoElement.decoding = 'async';

        if (logo) {
            logoElement.src = logo;
            logoElement.style.display = 'block';
            logoElement.alt = '';
        } else {
            logoElement.src = defaultCompanyImage;
            logoElement.style.display = 'block';
            logoElement.alt = '';
        }
    }

    const cartSheet =
        document.getElementById('cartSheet');

    const cartSheetBackground =
        document.getElementById('cartSheetBackground');

    if (cartSheet && cartSheetBackground) {
        cartSheetBackground.fetchPriority = 'high';
        cartSheetBackground.decoding = 'async';

        const clearCartBackground = () => {
            cartSheet.classList.remove(
                'has-restaurant-background'
            );
            cartSheetBackground.removeAttribute('src');
        };

        cartSheetBackground.onload = () => {
            cartSheet.classList.add(
                'has-restaurant-background'
            );
        };

        cartSheetBackground.onerror = () => {
            clearCartBackground();
        };

        if (logo) {
            const backgroundSource =
                logoElement?.currentSrc ||
                logoElement?.src ||
                logo;

            if (
                cartSheetBackground.getAttribute('src') !==
                backgroundSource
            ) {
                cartSheetBackground.src = backgroundSource;
            }

            if (
                cartSheetBackground.complete &&
                cartSheetBackground.naturalWidth
            ) {
                cartSheet.classList.add(
                    'has-restaurant-background'
                );
            }
        } else {
            clearCartBackground();
        }
    }
    /* ----------------------------------------------------------------------
       CONTACT CONTAINER
       ---------------------------------------------------------------------- */

    const container =
        document.getElementById(
            'restaurantContactRow'
        );

    if (!container) {
        return;
    }

    container.innerHTML = '';


    /* ----------------------------------------------------------------------
       PHONE NUMBERS
       ---------------------------------------------------------------------- */

    const phones =
        Array.isArray(
            restaurantProfile.phone_numbers
        )
            ? restaurantProfile.phone_numbers
            : [];

    phones.forEach(phone => {

        const cleanPhone =
            String(phone || '').trim();

        if (!cleanPhone) {
            return;
        }

        const link =
            document.createElement('a');

        link.className =
            'menu-contact-link';

        const telNumber =
            cleanPhone.replace(
                /[^\d+]/g,
                ''
            );

        link.href =
            `tel:${telNumber}`;

        link.innerHTML = `
            <span class="contact-icon">
                ðŸ“ž
            </span>

            <span class="contact-text">
                <strong>
                    ${escapeHtml(cleanPhone)}
                </strong>

                <small>
                    Call Us
                </small>
            </span>
        `;

        container.appendChild(link);
    });


    /* ----------------------------------------------------------------------
       LOCATIONS
       ---------------------------------------------------------------------- */

    const addresses =
        Array.isArray(
            restaurantProfile.addresses
        )
            ? restaurantProfile.addresses
            : [];

    addresses.forEach(address => {

        if (
            !address ||
            typeof address !== 'object'
        ) {
            return;
        }

        const name =
            String(
                address.name || ''
            ).trim();

        const url =
            String(
                address.url || ''
            ).trim();

        if (!name) {
            return;
        }

        const link =
            document.createElement('a');

        link.className =
            'menu-contact-link';

        if (
            url &&
            /^https?:\/\/.+/i.test(url)
        ) {
            link.href =
                url;

            link.target =
                '_blank';

            link.rel =
                'noopener noreferrer';

        } else {

            link.href =
                '#';

            link.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                }
            );
        }

        link.innerHTML = `
            <span class="contact-icon">
                ðŸ“
            </span>

            <span class="contact-text">
                <strong>
                    ${escapeHtml(name)}
                </strong>

                <small>
                    Our Location
                </small>
            </span>
        `;

        container.appendChild(link);
    });


    /* ----------------------------------------------------------------------
       NO PROFILE INFORMATION
       ---------------------------------------------------------------------- */

    if (!container.children.length) {

        container.innerHTML = `
            <div class="menu-contact-empty">
                Contact information unavailable
            </div>
        `;
    }

    queueCustomerTranslation();
}


/* ==========================================================================
   CATEGORY BUTTONS
   ========================================================================== */

function getOrderedMenuCategories() {
    const categories = Object.keys(foods).filter(category =>
        Array.isArray(foods[category])
    );
    const originalPositions = new Map(
        categories.map((category, index) => [category, index])
    );

    const getPosition = category => {
        const item = foods[category].find(
            value =>
                value &&
                typeof value === 'object' &&
                Number.isInteger(value.__categoryOrder)
        );

        return item
            ? item.__categoryOrder
            : originalPositions.get(category);
    };

    return categories.sort(
        (firstCategory, secondCategory) =>
            getPosition(firstCategory) - getPosition(secondCategory)
    );
}

function renderCategoryButtons() {

    const container =
        document.getElementById(
            'categoryButtons'
        );

    if (!container) {
        return;
    }

    container.innerHTML = '';


    /* ----------------------------------------------------------------------
       ALL ITEMS ALWAYS FIRST
       ---------------------------------------------------------------------- */

    const allButton =
        document.createElement('button');

    allButton.textContent =
        'all item';

    if (
        currentCategory === 'all'
    ) {
        allButton.classList.add(
            'active'
        );
    }

    allButton.onclick = () => {
        showCatagories('all');
    };

    container.appendChild(
        allButton
    );


    /* ----------------------------------------------------------------------
       CATEGORIES
       ---------------------------------------------------------------------- */

    const categories =
        getOrderedMenuCategories();

    categories.forEach(category => {

        const button =
            document.createElement('button');

        button.textContent =
            category;

        if (
            currentCategory === category
        ) {
            button.classList.add(
                'active'
            );
        }

        button.onclick = () => {
            showCatagories(category);
        };

        container.appendChild(
            button
        );
    });

    applyMenuButtonAppearance();
    queueCustomerTranslation();
}


/* ==========================================================================
   CATEGORY SELECTION
   ========================================================================== */

function showCatagories(category) {

    currentCategory =
        category;

    renderItems();
    renderCategoryButtons();
}


/* ==========================================================================
   RENDER MENU ITEMS
   ========================================================================== */

function renderItems() {

    const container =
        document.querySelector(
            '.container'
        );

    if (!container) {
        return;
    }

    let items = [];

    if (currentCategory === 'all') {

        items =
            getOrderedMenuCategories()
                .flatMap(category => foods[category]);

    } else {

        items =
            Array.isArray(
                foods[currentCategory]
            )
                ? foods[currentCategory]
                : [];
    }


    const search =
        String(searchTerm || '')
            .trim()
            .toLowerCase();


    const filteredItems =
        items.filter(food => {

            if (
                !food ||
                typeof food !== 'object'
            ) {
                return false;
            }

            const ingredient =
                food.ingridient ||
                food.ingredient ||
                '';

            const text =
                `${food.name || ''} ${ingredient}`
                    .toLowerCase();

            return text.includes(search);
        });


    if (!filteredItems.length) {

        container.innerHTML = `
            <div class="empty-state">
                No items match your search.
            </div>
        `;

        return;
    }


    /* ----------------------------------------------------------------------
       BUILD MENU
       ---------------------------------------------------------------------- */

    container.innerHTML =
        filteredItems
            .map(food => {

                const isAvailable =
                    food.available !== false;

                const ingredient =
                    food.ingridient ||
                    food.ingredient ||
                    '';

                const image =
                    food.image || 'image/food.jpeg';

                const daySpecial =
                    food.isDaySpecial === true;


                return `
                    <div class="foodd ${
                        !isAvailable
                            ? 'unavailable'
                            : ''
                    } ${
                        daySpecial
                            ? 'has-day-special'
                            : ''
                    }">

                        ${
                            daySpecial
                                ? `
                                    <div class="menu-item-day-special">Day Special</div>
                                `
                                : ''
                        }

                        <div class="divimage">

                            <img
                                class="image"
                                src="${escapeAttribute(
                                    image
                                )}"
                                alt="${escapeAttribute(
                                    food.name || ''
                                )}"
                                loading="lazy"
                                onclick="zoomImage(this.src)"
                                onerror="this.onerror=null;this.src='image/food.jpeg';"
                            >

                        </div>


                        <div class="divinfo">

                            <p>
                                ${escapeHtml(
                                    food.name || ''
                                )}
                            </p>


                            <p class="ingredient">
                                ${escapeHtml(
                                    ingredient
                                )}
                            </p>


                            <div class="info2">

                                <p>
                                    <strong>
                                        ${formatCustomerCurrency(
                                            food.price || 0
                                        )}
                                    </strong>
                                </p>


                                ${
                                    isAvailable
                                        ? `
                                            <button
                                                type="button"
                                                class="addbutton"
                                                data-name="${escapeAttribute(
                                                    food.name || ''
                                                )}"
                                            >
                                                +add
                                            </button>
                                        `
                                        : `
                                            <button
                                                type="button"
                                                class="addbutton"
                                                disabled
                                                style="
                                                    background:#ccc;
                                                    cursor:not-allowed;
                                                "
                                            >
                                                Unavailable
                                            </button>
                                        `
                                }

                            </div>

                        </div>

                    </div>
                `;
            })
            .join('');


    /* ----------------------------------------------------------------------
       ADD BUTTON EVENTS
       ---------------------------------------------------------------------- */

    container
        .querySelectorAll(
            '.addbutton:not([disabled])'
        )
        .forEach(button => {

            button.addEventListener(
                'click',
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    addToCart(
                        event,
                        button
                    );
                }
            );
        });

    applyMenuButtonAppearance();
    queueCustomerTranslation();
}


/* ==========================================================================
   DAY SPECIALS
   ========================================================================== */

const MAX_CUSTOMER_DAY_SPECIALS = 5;


/* --------------------------------------------------------------------------
   GET ALL DAY SPECIALS
   -------------------------------------------------------------------------- */

function getDaySpecialItems() {

    const specials = [];

    getOrderedMenuCategories().forEach(category => {

        const categoryItems =
            Array.isArray(foods[category])
                ? foods[category]
                : [];

        categoryItems.forEach(item => {

            if (
                item &&
                typeof item === 'object' &&
                item.isDaySpecial === true
            ) {
                specials.push({
                    category,
                    item
                });
            }
        });
    });

    return specials.slice(
        0,
        MAX_CUSTOMER_DAY_SPECIALS
    );
}


/* --------------------------------------------------------------------------
   GET FIRST DAY SPECIAL
   -------------------------------------------------------------------------- */

function getDaySpecialItem() {

    const specials =
        getDaySpecialItems();

    return specials.length
        ? specials[0]
        : null;
}


/* ==========================================================================
   CUSTOMER DAY SPECIAL BUTTON
   ========================================================================== */

function setupDaySpecial() {

    const button =
        document.getElementById(
            'daySpecialBtn'
        );

    if (!button) {
        return;
    }

    if (
        button.dataset.daySpecialReady === 'true'
    ) {
        updateDaySpecialButtonState();
        return;
    }

    button.dataset.daySpecialReady =
        'true';

    button.addEventListener(
        'click',
        openCustomerDaySpecial
    );

    updateDaySpecialButtonState();
}


/* ==========================================================================
   UPDATE DAY SPECIAL BUTTON
   ========================================================================== */

function updateDaySpecialButtonState() {

    const button =
        document.getElementById(
            'daySpecialBtn'
        );

    if (!button) {
        return;
    }

    const specials =
        getDaySpecialItems();

    if (specials.length) {

        button.classList.add(
            'has-special'
        );

        button.removeAttribute(
            'aria-disabled'
        );

        button.title =
            specials.length === 1
                ? `Today's special: ${specials[0].item.name}`
                : `${specials.length} Day Specials available today`;

    } else {

        button.classList.remove(
            'has-special'
        );

        button.removeAttribute(
            'title'
        );
    }
}


/* ==========================================================================
   OPEN CUSTOMER DAY SPECIALS
   ========================================================================== */

function openCustomerDaySpecial() {

    closeCustomerDaySpecial();

    const specials =
        getDaySpecialItems();

    const overlay =
        document.createElement('div');

    overlay.id =
        'customerDaySpecialModal';

    overlay.className =
        'customer-day-special-overlay';


    /* ============================================================
       NO SPECIAL AVAILABLE
       ============================================================ */

    if (!specials.length) {

        overlay.innerHTML = `
            <div
                class="customer-day-special-empty-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="daySpecialEmptyTitle"
            >

                <button
                    type="button"
                    class="customer-day-special-close"
                    id="customerDaySpecialClose"
                    aria-label="Close"
                >
                    Ã—
                </button>


                <div class="customer-day-special-empty-icon">
                    âœ¨
                </div>


                <h2 id="daySpecialEmptyTitle">
                    No Day Special
                </h2>


                <p>
                    There is no special item available today.
                    Please check back later.
                </p>


                <button
                    type="button"
                    class="customer-day-special-close-button"
                    id="customerDaySpecialCloseButton"
                >
                    Close
                </button>

            </div>
        `;

        document.body.appendChild(
            overlay
        );

        document.body.classList.add(
            'customer-day-special-open'
        );

        queueCustomerTranslation();

        requestAnimationFrame(() => {

            overlay.classList.add(
                'active'
            );
        });

        attachCustomerDaySpecialCloseEvents(
            overlay
        );

        return;
    }


    /* ============================================================
       SPECIAL ITEMS
       ============================================================ */

    const specialCards =
        specials
            .map(special => {

                const item =
                    special.item;

                const isAvailable =
                    item.available !== false;

                const ingredient =
                    item.ingridient ||
                    item.ingredient ||
                    '';

                const image =
                    item.image || 'image/food.jpeg';

                const price =
                    Number(item.price) || 0;

                const itemName =
                    item.name ||
                    'Day Special';


                return `
                    <div
                        class="customer-day-special-card"
                    >

                        <div
                            class="customer-day-special-image-wrap"
                        >

                            <img
                                src="${escapeAttribute(image)}"
                                alt="${escapeAttribute(itemName)}"
                                class="customer-day-special-image"
                                onerror="
                                    this.onerror = null;
                                    this.src = 'image/food.jpeg';
                                "
                            >

                        </div>


                        <div
                            class="customer-day-special-content"
                        >

                            <h2>
                                ${escapeHtml(itemName)}
                            </h2>


                            ${
                                ingredient
                                    ? `
                                        <p
                                            class="customer-day-special-ingredient"
                                        >
                                            ${escapeHtml(
                                                ingredient
                                            )}
                                        </p>
                                    `
                                    : ''
                            }


                            <div
                                class="customer-day-special-price"
                            >
                                ${formatCustomerCurrency(price)}
                            </div>

                        </div>


                        <div
                            class="customer-day-special-actions"
                        >

                            ${
                                isAvailable
                                    ? `
                                        <button
                                            type="button"
                                            class="customer-day-special-add"
                                            data-name="${escapeAttribute(
                                                itemName
                                            )}"
                                        >
                                            + Add to Cart
                                        </button>
                                    `
                                    : `
                                        <button
                                            type="button"
                                            class="customer-day-special-add disabled"
                                            disabled
                                        >
                                            Currently Unavailable
                                        </button>
                                    `
                            }

                        </div>

                    </div>
                `;
            })
            .join('');


    /* ============================================================
       MODAL
       ============================================================ */

    overlay.innerHTML = `
        <div
            class="customer-day-special-multiple-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customerDaySpecialTitle"
        >

            <div class="customer-day-special-top">

                <h2
                    id="customerDaySpecialTitle"
                    class="customer-day-special-heading"
                >
                    âœ¨ TODAY'S SPECIALS âœ¨
                </h2>


                <button
                    type="button"
                    class="customer-day-special-close"
                    id="customerDaySpecialClose"
                    aria-label="Close"
                >
                    Ã—
                </button>

            </div>


            <div class="customer-day-special-list">
                ${specialCards}
            </div>


            <div
                class="customer-day-special-modal-footer"
            >

                <button
                    type="button"
                    class="customer-day-special-close-button"
                    id="customerDaySpecialCloseButton"
                >
                    Continue Browsing
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        overlay
    );

    document.body.classList.add(
        'customer-day-special-open'
    );

    queueCustomerTranslation();


    /* ============================================================
       OPEN ANIMATION
       ============================================================ */

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            overlay.classList.add(
                'active'
            );
        });
    });


    /* ============================================================
       CLOSE EVENTS
       ============================================================ */

    attachCustomerDaySpecialCloseEvents(
        overlay
    );


    /* ============================================================
       ADD TO CART
       ============================================================ */

    overlay
        .querySelectorAll(
            '.customer-day-special-add:not(.disabled)'
        )
        .forEach(addButton => {

            addButton.addEventListener(
                'click',
                event => {

                    const fakeButton = {

                        dataset: {
                            name:
                                addButton.dataset.name
                        },

                        textContent:
                            addButton.textContent,

                        disabled: false
                    };


                    addToCart(
                        event,
                        fakeButton
                    );


                    addButton.textContent =
                        'Ã¢Å“â€œ Added to Cart';

                    addButton.disabled =
                        true;


                    setTimeout(() => {

                        if (
                            document.body.contains(
                                addButton
                            )
                        ) {

                            addButton.textContent =
                                '+ Add to Cart';

                            addButton.disabled =
                                false;
                        }

                    }, 900);
                }
            );
        });
}


/* ==========================================================================
   DAY SPECIAL CLOSE EVENTS
   ========================================================================== */

function attachCustomerDaySpecialCloseEvents(
    overlay
) {

    const closeButton =
        overlay.querySelector(
            '#customerDaySpecialClose'
        );

    const closeBottomButton =
        overlay.querySelector(
            '#customerDaySpecialCloseButton'
        );


    if (closeButton) {

        closeButton.addEventListener(
            'click',
            closeCustomerDaySpecial
        );
    }


    if (closeBottomButton) {

        closeBottomButton.addEventListener(
            'click',
            closeCustomerDaySpecial
        );
    }


    /* Click outside modal */

    overlay.addEventListener(
        'click',
        event => {

            if (
                event.target === overlay
            ) {

                closeCustomerDaySpecial();
            }
        }
    );
}


function closeCustomerDaySpecial() {

    const modal =
        document.getElementById(
            'customerDaySpecialModal'
        );

    if (!modal) {

        document.body.classList.remove(
            'customer-day-special-open'
        );

        return;
    }


    modal.classList.remove(
        'active'
    );

    document.body.classList.remove(
        'customer-day-special-open'
    );


    setTimeout(() => {

        if (
            modal &&
            modal.parentNode
        ) {

            modal.remove();
        }

    }, 280);
}


/* ==========================================================================
   CART LOCAL STORAGE
   ========================================================================== */

function loadFromLocalStorage() {

    try {

        const stored =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!stored) {
            return [];
        }


        const parsed =
            JSON.parse(stored);


        if (!Array.isArray(parsed)) {
            return [];
        }


        return parsed.filter(
            item =>
                item &&
                typeof item === 'object' &&
                Number(item.quantity) > 0
        );

    } catch (error) {

        console.warn(
            'Could not load cart from local storage:',
            error
        );

        return [];
    }
}


function saveToLocalStorage() {

    const smallCart =
        cart.map(item => ({

            id:
                item.id,

            name:
                item.name,

            price:
                item.price,

            ingridient:
                item.ingridient ||
                item.ingredient ||
                '',

            note:
                String(item.note || ''),

            quantity:
                Number(item.quantity) || 1
        }));


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(smallCart)
    );
}


/* ==========================================================================
   CART
   ========================================================================== */

function loadCart() {

    cart =
        loadFromLocalStorage();

    renderCart();
}


function saveCart() {

    saveToLocalStorage();
}


function addToCart(
    event,
    button
) {

    if (!button) {
        return;
    }


    const name =
        button.dataset?.name;


    if (!name) {
        return;
    }


    const food =
        Object.values(foods)
            .filter(Array.isArray)
            .flat()
            .find(
                item =>
                    item &&
                    item.name === name
            );


    if (!food) {

        showToast(
            'This item is no longer available.',
            'error'
        );

        return;
    }


    if (
        food.available === false
    ) {

        showToast(
            'This item is currently unavailable.',
            'error'
        );

        return;
    }


    const matchingItem =
        cart.find(
            item =>
                item.name ===
                food.name
        );


    if (matchingItem) {

        matchingItem.quantity =
            Number(
                matchingItem.quantity || 0
            ) + 1;

    } else {

        const ingredient =
            food.ingridient ||
            food.ingredient ||
            '';


        cart.push({

            id:
                food.id,

            name:
                food.name,

            price:
                food.price,

            ingridient:
                ingredient,

            quantity:
                1
        });
    }

    recentlyAddedCartItemName =
        food.name;

    saveCart();

    renderCart();

    const cartSheet =
        document.getElementById('cartSheet');

    const cartButton =
        document.querySelector('.cartbutton');

    if (cartSheet && cartButton) {
        cartSheet.classList.add('open');
        cartSheet.classList.remove('expanded');
        cartButton.setAttribute('aria-expanded', 'true');
        cartSheet
            .querySelector('.cart-sheet-handle')
            ?.setAttribute('aria-label', 'Expand cart');
    }

    if (
        button &&
        'textContent' in button
    ) {

        const originalText =
            button.textContent;


        button.textContent =
            'Ã¢Å“â€œ Added';


        button.disabled =
            true;


        setTimeout(() => {

            if (
                button &&
                button.parentNode
            ) {

                button.textContent =
                    originalText;

                button.disabled =
                    false;
            }

        }, 250);
    }
}


/* ==========================================================================
   RENDER CART
   ========================================================================== */

function renderCart() {

    const cartBody =
        document.getElementById(
            'cart-body'
        );


    if (!cartBody) {
        return;
    }

    const clearCartButton =
    document.getElementById('clearCartButton');

const orderNowButton =
    document.getElementById('orderNowButton');

if (clearCartButton) {
    clearCartButton.disabled = cart.length === 0;
}

if (orderNowButton) {
    orderNowButton.disabled = cart.length === 0;
}

    const totalItemCount =
        cart.reduce(
            (total, item) =>
                total + Math.max(0, Number(item.quantity) || 0),
            0
        );

    const cartItemCount =
        document.getElementById('cart-item-count');

    if (cartItemCount) {
        cartItemCount.textContent =
            `${formatCustomerNumber(totalItemCount)} ${totalItemCount === 1 ? 'item' : 'items'}`;
    }

    const cartButtonCount =
        document.getElementById('cart-button-count');

    if (cartButtonCount) {
        cartButtonCount.textContent =
            formatCustomerNumber(totalItemCount);
    }

    const cartButton =
        document.querySelector('.cartbutton');

    if (cartButton) {
        cartButton.setAttribute(
            'aria-label',
            `Cart, ${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'}`
        );
    }

    const cartSheetElement =
        document.getElementById('cartSheet');

    cartSheetElement?.classList.toggle(
        'has-recently-added',
        cart.some(item => item.name === recentlyAddedCartItemName)
    );


    if (!cart.length) {

        cartBody.innerHTML = `
            <tr>
                <td colspan="3">
                    Your cart is empty
                </td>
            </tr>
        `;

    } else {

        const menuItems =
            Object.values(foods)
                .filter(Array.isArray)
                .flat();

        cartBody.innerHTML =
            cart
                .map(item => {

                    const itemPrice =
                        Number(item.price) || 0;

                    const quantity =
                        Number(item.quantity) || 0;

                    const itemName =
                        String(item.name ?? '');

                    const note =
                        String(item.note || '').trim();

                    const isEditingNote =
                        editingCartNoteName === itemName;

                    const menuItem =
                        menuItems.find(
                            food =>
                                food &&
                                ((item.id && food.id === item.id) ||
                                    food.name === itemName)
                        );

                    const itemImage =
                        menuItem?.image || 'image/food.jpeg';

                    return `
                        <tr
                            class="cart-item-row${itemName === recentlyAddedCartItemName ? ' is-recently-added' : ''}"
                            data-cart-item-name="${escapeAttribute(itemName)}"
                        >

                            <td>
                                <div class="cart-item-layout">
                                    <img
                                        class="cart-item-image"
                                        src="${escapeAttribute(itemImage)}"
                                        alt="${escapeAttribute(itemName)}"
                                        loading="lazy"
                                        onerror="this.onerror=null;this.src='image/food.jpeg';"
                                    >
                                    <div class="cart-item-details">
                                        <div class="cart-item-heading">
                                            <span class="cart-item-name">${escapeHtml(itemName)}</span>
                                            <button
                                                type="button"
                                                class="cart-note-toggle"
                                                data-action="edit-note"
                                                data-name="${escapeAttribute(itemName)}"
                                                aria-label="Add or edit note for ${escapeAttribute(itemName)}"
                                                title="Add or edit item note"
                                            >âœŽ</button>
                                        </div>
                                        <span class="cart-item-unit-price">${formatCustomerCurrency(itemPrice)}</span>
                                        ${note ? `<span class="cart-item-note">(${escapeHtml(note)})</span>` : ''}
                                        ${isEditingNote ? `
                                            <div class="cart-note-editor">
                                                <input
                                                    type="text"
                                                    class="cart-note-input"
                                                    value="${escapeAttribute(note)}"
                                                    maxlength="200"
                                                    aria-label="Note for ${escapeAttribute(itemName)}"
                                                    placeholder="e.g. No sugar, extra spicy"
                                                >
                                                <div class="cart-note-actions">
                                                    <button type="button" data-action="save-note" data-name="${escapeAttribute(itemName)}">Done</button>
                                                    <button type="button" data-action="cancel-note" data-name="${escapeAttribute(itemName)}">Cancel</button>
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </td>


                            <td>
                                <div class="qty-controls">

                                    <button
                                        type="button"
                                        class="minus"
                                        data-action="decrease"
                                        data-name="${escapeAttribute(itemName)}"
                                    >
                                        -
                                    </button>


                                    <span class="notranslate" translate="no">${formatCustomerNumber(quantity)}</span>


                                    <button
                                        type="button"
                                        class="plus"
                                        data-action="increase"
                                        data-name="${escapeAttribute(itemName)}"
                                    >
                                        +
                                    </button>

                                </div>

                            </td>

                            <td class="cart-item-total">
                                ${formatCustomerCurrency(
                                    itemPrice * quantity
                                )}
                            </td>

                        </tr>
                    `;
                })
                .join('');
    }

    cartBody.querySelectorAll('button[data-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            const name = button.dataset.name;

            if (!name) {
                return;
            }

            if (action === 'increase') {
                increaseQuantity(name);
                return;
            }

            if (action === 'decrease') {
                decreaseQuantity(name);
                return;
            }

            if (action === 'edit-note') {
                editingCartNoteName = name;
                renderCart();
                cartBody.querySelector('.cart-note-input')?.focus();
                return;
            }

            if (action === 'save-note') {
                const noteInput =
                    button.closest('tr')?.querySelector('.cart-note-input');

                const item =
                    cart.find(currentItem => currentItem.name === name);

                if (!item || !noteInput) {
                    return;
                }

                item.note = noteInput.value.trim();
                editingCartNoteName = null;
                saveCart();
                renderCart();
                return;
            }

            if (action === 'cancel-note') {
                editingCartNoteName = null;
                renderCart();
            }
        });
    });


    const total =
        cart.reduce(
            (sum, item) =>
                sum +
                (
                    (Number(item.price) || 0) *
                    (Number(item.quantity) || 0)
                ),
            0
        );


    const totalElement =
        document.getElementById(
            'total-price'
        );


    if (totalElement) {

        totalElement.innerHTML =
            formatCustomerCurrency(total);
    }

    const cartSheet =
        document.getElementById('cartSheet');

    const cartPanel =
        cartSheet?.querySelector('.cart');

    const cartHandle =
        cartSheet?.querySelector('.cart-sheet-handle');

    if (cartSheet && cartPanel && cartHandle) {
        const cartTopbar =
            cartPanel.querySelector('.cart-topbar');

        const focusedRow =
            Array.from(
                cartBody.querySelectorAll('tr[data-cart-item-name]')
            ).find(
                row =>
                    row.dataset.cartItemName === recentlyAddedCartItemName
            ) || cartBody.querySelector('tr[data-cart-item-name]');

        const cartStyles =
            getComputedStyle(cartPanel);

        const contentHeight =
            (cartTopbar?.offsetHeight || 0) +
            (focusedRow?.offsetHeight || 0) +
            (focusedRow ? 20 : 0) +
            cartHandle.offsetHeight +
            (Number.parseFloat(cartStyles.paddingTop) || 0) +
            (Number.parseFloat(cartStyles.paddingBottom) || 0);

        cartSheet.style.setProperty(
            '--cart-sheet-peek',
            `${Math.min(contentHeight, window.innerHeight * 0.8)}px`
        );
    }

    queueCustomerTranslation();
}

function escapeAttribute(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}


/* ==========================================================================
   CART TEXT ESCAPING
   ========================================================================== */

function escapeJs(value) {

    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
}


/* ==========================================================================
   QUANTITY
   ========================================================================== */

function increaseQuantity(name) {

    const item =
        cart.find(
            currentItem =>
                currentItem.name === name
        );


    if (!item) {
        return;
    }


    item.quantity =
        Number(item.quantity || 0) + 1;


    saveCart();

    renderCart();
}


function decreaseQuantity(name) {

    const item =
        cart.find(
            currentItem =>
                currentItem.name === name
        );


    if (!item) {
        return;
    }


    item.quantity =
        Number(item.quantity || 0) - 1;


    if (
        item.quantity <= 0
    ) {

        cart =
            cart.filter(
                currentItem =>
                    currentItem.name !== name
            );
    }


    saveCart();

    renderCart();
}

function clearCart() {
    if (!cart.length) {
        return;
    }

    cart = [];
    editingCartNoteName = null;
    recentlyAddedCartItemName = null;
    saveCart();
    renderCart();
}


/* ==========================================================================
   CART BUTTON
   ========================================================================== */

function setupCartButton() {

    const cartButton =
        document.querySelector(
            '.cartbutton'
        );

    const container2 =
        document.querySelector(
            '.container2'
        );

    const cartClose =
        document.querySelector(
            '.cart-close'
        );

    const cartHandle =
        document.querySelector(
            '.cart-sheet-handle'
        );

    const clearCartButton =
        document.getElementById('clearCartButton');


    if (
        !cartButton ||
        !container2
    ) {
        return;
    }


    if (
        cartButton.dataset.cartReady === 'true'
    ) {
        return;
    }


    cartButton.dataset.cartReady =
        'true';

    clearCartButton?.addEventListener(
        'click',
        clearCart
    );
    document.getElementById('orderNowButton')?.addEventListener('click', () => {
        if (cart.length === 0) return;
        openOrderFormModal();
    });

    function setCartOpen(open) {
        container2.classList.toggle(
            'open',
            open
        );

        container2.classList.remove(
            'expanded',
            'dragging'
        );

        container2.style.removeProperty(
            '--cart-sheet-drag-offset'
        );

        cartButton.setAttribute(
            'aria-expanded',
            String(open)
        );

        if (cartHandle) {
            cartHandle.setAttribute(
                'aria-label',
                'Expand cart'
            );
        }
    }

    function setCartExpanded(expanded) {
        container2.classList.toggle(
            'expanded',
            expanded
        );

        if (cartHandle) {
            cartHandle.setAttribute(
                'aria-label',
                expanded ? 'Collapse cart' : 'Expand cart'
            );
        }
    }

    function getCartPeekHeight(sheetHeight) {
        const configuredPeekHeight =
            Number.parseFloat(
                getComputedStyle(container2).getPropertyValue(
                    '--cart-sheet-peek'
                )
            ) || 190;

        return Math.min(
            configuredPeekHeight,
            sheetHeight * 0.8
        );
    }

    cartButton.addEventListener(
        'click',
        () => {
            setCartOpen(
                !container2.classList.contains('open')
            );
        }
    );

    if (cartClose) {

        cartClose.addEventListener(
            'click',
            () => {
                setCartOpen(false);
            }
        );
    }

    if (cartHandle) {
        let pointerStartY = 0;
        let startingOffset = 0;
        let activePointerId = null;
        let didDrag = false;
        let suppressHandleClick = false;

        cartHandle.addEventListener('click', event => {
            if (suppressHandleClick) {
                suppressHandleClick = false;
                event.preventDefault();
                return;
            }

            setCartExpanded(
                !container2.classList.contains('expanded')
            );
        });

        cartHandle.addEventListener('pointerdown', event => {
            if (!event.isPrimary || event.button !== 0) {
                return;
            }

            activePointerId = event.pointerId;
            pointerStartY = event.clientY;
            didDrag = false;

            const sheetHeight =
                container2.getBoundingClientRect().height;

            const peekHeight =
                getCartPeekHeight(sheetHeight);

            startingOffset =
                container2.classList.contains('expanded')
                    ? 0
                    : sheetHeight - peekHeight;

            cartHandle.setPointerCapture(event.pointerId);
        });

        const handlePointerMove = event => {
            if (event.pointerId !== activePointerId) {
                return;
            }

            const deltaY = event.clientY - pointerStartY;

            if (Math.abs(deltaY) > 5) {
                didDrag = true;
                container2.classList.add('dragging');
            }

            if (!didDrag) {
                return;
            }

            const sheetHeight =
                container2.getBoundingClientRect().height;

            const offset = Math.max(
                0,
                Math.min(sheetHeight, startingOffset + deltaY)
            );

            container2.style.setProperty(
                '--cart-sheet-drag-offset',
                `${offset}px`
            );
        };
        cartHandle.addEventListener('pointermove', handlePointerMove);

        function finishCartDrag(event) {
            if (event.pointerId !== activePointerId) {
                return;
            }

            activePointerId = null;

            if (!didDrag) {
                return;
            }

            suppressHandleClick = true;
            setTimeout(() => {
                suppressHandleClick = false;
            }, 0);

            const sheetHeight =
                container2.getBoundingClientRect().height;

            const peekHeight =
                getCartPeekHeight(sheetHeight);

            const collapsedOffset =
                sheetHeight - peekHeight;

            const currentOffset =
                Number.parseFloat(
                    container2.style.getPropertyValue(
                        '--cart-sheet-drag-offset'
                    )
                ) || 0;

            const snapPoints = [
                { offset: 0, state: 'expanded' },
                { offset: collapsedOffset, state: 'peek' },
                { offset: sheetHeight, state: 'closed' }
            ];

            const nearestSnap = snapPoints.reduce(
                (nearest, point) =>
                    Math.abs(point.offset - currentOffset) <
                    Math.abs(nearest.offset - currentOffset)
                        ? point
                        : nearest
            );

            if (nearestSnap.state === 'closed') {
                setCartOpen(false);
                return;
            }

            container2.classList.remove('dragging');

            container2.style.removeProperty(
                '--cart-sheet-drag-offset'
            );

            setCartExpanded(
                nearestSnap.state === 'expanded'
            );
        }

        cartHandle.addEventListener('pointerup', finishCartDrag);
        cartHandle.addEventListener('pointercancel', finishCartDrag);
    }
}


/* ==========================================================================
   IMAGE VIEWER
   ========================================================================== */

function zoomImage(src) {

    const viewer =
        document.getElementById(
            'imageViewer'
        );

    const image =
        document.getElementById(
            'bigImage'
        );


    if (
        !viewer ||
        !image ||
        !src
    ) {
        return;
    }


    image.src =
        src;


    viewer.classList.add(
        'show'
    );
}


function closeImage() {

    const viewer =
        document.getElementById(
            'imageViewer'
        );


    if (viewer) {

        viewer.classList.remove(
            'show'
        );
    }
}


/* ==========================================================================
   SEARCH
   ========================================================================== */

function setupSearch() {

    const searchInput =
        document.getElementById(
            'searchInput'
        );


    if (!searchInput) {
        return;
    }


    if (
        searchInput.dataset.searchReady === 'true'
    ) {
        return;
    }


    searchInput.dataset.searchReady =
        'true';


    searchInput.addEventListener(
        'input',
        event => {

            searchTerm =
                event.target.value || '';

            renderItems();
        }
    );
}


function setupCustomerLanguageSelector() {
    const selector =
        document.getElementById('customerLanguage');

    const control =
        document.getElementById('customerLanguageControl');

    const toggle =
        document.getElementById('customerLanguageToggle');

    const menu =
        document.getElementById('customerLanguageMenu');

    if (!selector || !control || !toggle || !menu) {
        return;
    }

    const storedLanguage =
        localStorage.getItem(CUSTOMER_LANGUAGE_KEY) || 'en';

    selector.value =
        ['en', 'am', 'ar', 'zh-CN'].includes(storedLanguage)
            ? storedLanguage
            : 'en';

    setCustomerLanguage(selector.value);

    toggle.addEventListener(
        'click',
        () => setCustomerLanguageMenuOpen(menu.hidden)
    );

    menu.addEventListener(
        'click',
        event => {
            const option =
                event.target.closest('[data-language-option]');

            if (option) {
                setCustomerLanguage(option.dataset.languageOption);
                toggle.focus();
            }
        }
    );

    toggle.addEventListener(
        'keydown',
        event => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
                return;
            }

            event.preventDefault();
            setCustomerLanguageMenuOpen(true, true);
        }
    );

    menu.addEventListener(
        'keydown',
        event => {
            const options =
                Array.from(
                    menu.querySelectorAll('[data-language-option]')
                );

            const currentIndex =
                options.indexOf(document.activeElement);

            let nextIndex = currentIndex;

            if (event.key === 'ArrowDown') {
                nextIndex = (currentIndex + 1) % options.length;
            } else if (event.key === 'ArrowUp') {
                nextIndex = (currentIndex - 1 + options.length) % options.length;
            } else if (event.key === 'Home') {
                nextIndex = 0;
            } else if (event.key === 'End') {
                nextIndex = options.length - 1;
            } else if (event.key === 'Escape') {
                event.preventDefault();
                setCustomerLanguageMenuOpen(false);
                toggle.focus();
                return;
            } else {
                return;
            }

            event.preventDefault();
            options[nextIndex]?.focus();
        }
    );

    document.addEventListener(
        'click',
        event => {
            if (!control.contains(event.target)) {
                setCustomerLanguageMenuOpen(false);
            }
        }
    );
}


/* ==========================================================================
   PAYMENT MODAL
   ========================================================================== */

function renderOrderFormSummary() {
    const itemsContainer = document.getElementById('orderFormItems');
    const totalElement = document.getElementById('orderFormTotal');

    if (!itemsContainer || !totalElement) return;

    if (!cart.length) {
        itemsContainer.innerHTML = '<p>Your cart is empty.</p>';
        totalElement.textContent = '0 ETB';
        return;
    }

    itemsContainer.innerHTML = `
        <div class="order-form-item-list">
            ${cart.map(item => {
                const name = String(item.name ?? '');
                const note = String(item.note || '').trim();
                const quantity = Math.max(0, Number(item.quantity) || 0);
                const price = Math.max(0, Number(item.price) || 0);
                const lineTotal = quantity * price;

                return `
                    <article class="order-form-item">
                        <div class="order-form-item-heading">
                            <strong>${escapeHtml(name)}</strong>
                            <span>${formatCustomerCurrency(lineTotal)}</span>
                        </div>
                        <div class="order-form-item-details">
                            Qty: ${formatCustomerNumber(quantity)}
                            Â· ${formatCustomerCurrency(price)} each
                        </div>
                        ${note ? `<p class="order-form-item-note">Note: ${escapeHtml(note)}</p>` : ''}
                    </article>
                `;
            }).join('')}
        </div>
    `;

    const total = cart.reduce(
        (sum, item) =>
            sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
        0
    );

    totalElement.innerHTML = formatCustomerCurrency(total);
}

function updateOrderFormFields() {
    const type = document.getElementById('orderType')?.value || 'dine-in';
    const tableField = document.getElementById('orderTableField');
    const addressField = document.getElementById('orderAddressField');
    const tableInput = document.getElementById('orderTableNumber');
    const addressInput = document.getElementById('orderCustomerAddress');

    const isDineIn = type === 'dine-in';
    const needsAddress = type === 'delivery';

    if (tableField) tableField.hidden = !isDineIn;
    if (tableInput) tableInput.required = isDineIn;

    if (addressField) addressField.hidden = !needsAddress;
    if (addressInput) addressInput.required = needsAddress;
}

function setupOrderFormEvents() {
    const form = document.getElementById('customerOrderForm');

    if (!form || form.dataset.orderFormReady === 'true') return;
    form.dataset.orderFormReady = 'true';

    document.getElementById('orderType')?.addEventListener(
        'change',
        () => {
            updateOrderFormFields();
            const message = document.getElementById('orderFormMessage');
            if (message) message.textContent = '';
        }
    );

    form.addEventListener('input', () => {
        const message = document.getElementById('orderFormMessage');
        if (message) message.textContent = '';
    });

    form.addEventListener('submit', event => {
        event.preventDefault();

        const message = document.getElementById('orderFormMessage');

        if (!cart.length) {
            if (message) message.textContent = 'Your cart is empty. Add items before continuing.';
            return;
        }

        updateOrderFormFields();

        if (!form.reportValidity()) return;

        const phone = document.getElementById('orderCustomerPhone')?.value.trim() || '';

        if (!/^[+\d][\d\s()+.-]{5,29}$/.test(phone)) {
            const phoneInput = document.getElementById('orderCustomerPhone');
            phoneInput?.setCustomValidity('Enter a valid phone number.');
            phoneInput?.reportValidity();
            phoneInput?.addEventListener('input', () => phoneInput.setCustomValidity(''), { once: true });
            return;
        }

        closeOrderFormModal();
        openPaymentModal();
    });
}

function openOrderFormModal() {
    if (!cart.length) return;

    setupOrderFormEvents();
    renderOrderFormSummary();
    updateOrderFormFields();

    const modal = document.getElementById('orderFormModal');
    const message = document.getElementById('orderFormMessage');

    if (message) message.textContent = '';

    if (modal) {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function closeOrderFormModal() {
    const modal = document.getElementById('orderFormModal');

    if (modal) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    }
}
function openPaymentModal() {

    const paymentModal =
        document.getElementById(
            'paymentModal'
        );

    const paymentTotal =
        document.getElementById(
            'payment-total'
        );

    const paymentMessage =
        document.getElementById(
            'paymentMessage'
        );


    const total =
        cart.reduce(
            (sum, item) =>
                sum +
                (
                    (Number(item.price) || 0) *
                    (Number(item.quantity) || 0)
                ),
            0
        );


    if (!total) {

        showToast(
            'Add an item to the cart before paying.',
            'error'
        );

        return;
    }


    if (paymentTotal) {

        paymentTotal.innerHTML =
            formatCustomerCurrency(total);
    }


    if (paymentMessage) {

        paymentMessage.textContent =
            '';
    }


    if (paymentModal) {

        paymentModal.classList.add(
            'show'
        );
    }
}


function closePaymentModal() {

    const modal =
        document.getElementById(
            'paymentModal'
        );


    if (modal) {

        modal.classList.remove(
            'show'
        );
    }

    openOrderFormModal();
}


/* ==========================================================================
   PAYMENT SETUP
   ========================================================================== */

async function loadCustomerTelebirrSetting() {
    const orderNowButton = document.getElementById('orderNowButton');
    const paymentButton = document.querySelector('.payment');
    const telebirrOption = document.querySelector(
        '.payment-option[data-method="Telebirr"]'
    );

    if (orderNowButton) orderNowButton.hidden = false;
    if (paymentButton) paymentButton.hidden = true;
    if (telebirrOption) telebirrOption.hidden = true;

    if (!CAFE_SLUG) return;

    try {
        const response = await fetch(
            `${API_BASE}/api/public/payment-settings/${encodeURIComponent(CAFE_SLUG)}`,
            { method: 'GET', cache: 'no-store' }
        );

        if (!response.ok) {
            if (orderNowButton) orderNowButton.hidden = false;
            return;
        }

        const data = await response.json();

        if (orderNowButton) {
            orderNowButton.hidden = data?.ok === false || data?.order_now_enabled === false;
        }

        const enabled =
            data?.ok === true &&
            data?.telebirr_enabled === true;

        if (paymentButton) paymentButton.hidden = !enabled;
        if (telebirrOption) telebirrOption.hidden = !enabled;
    } catch (error) {
        console.error(
            '[payment-settings] Unable to load cafÃ© setting:',
            error
        );
    }
}

function setupPayment() {

    const paymentButton =
        document.querySelector(
            '.payment'
        );

    const paymentModal =
        document.getElementById(
            'paymentModal'
        );

    const paymentForm =
        document.getElementById(
            'telebirrPaymentForm'
        );


    if (
        !paymentButton ||
        !paymentModal ||
        !paymentForm
    ) {
        return;
    }


    if (
        paymentButton.dataset.paymentReady === 'true'
    ) {
        return;
    }


    paymentButton.dataset.paymentReady =
        'true';


    paymentButton.addEventListener(
        'click',
        openPaymentModal
    );


    paymentModal.addEventListener(
        'click',
        event => {

            if (
                event.target ===
                paymentModal
            ) {

                closePaymentModal();
            }
        }
    );


    paymentModal
        .querySelectorAll(
            '.payment-option'
        )
        .forEach(option => {

            option.addEventListener(
                'click',
                () => {

                    paymentModal
                        .querySelectorAll(
                            '.payment-option'
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    'selected'
                                )
                        );


                    option.classList.add(
                        'selected'
                    );


                    paymentForm.hidden =
                        option.dataset.method !==
                        'Telebirr';


                    const paymentMessage =
                        document.getElementById(
                            'paymentMessage'
                        );


                    if (paymentMessage) {

                        paymentMessage.textContent =
                            option.dataset.method ===
                            'BOA'
                                ? 'BOA payment is not configured yet.'
                                : '';
                    }
                }
            );
        });


    paymentForm.addEventListener(
        'submit',
        startTelebirrPayment
    );
}


/* ==========================================================================
   TELEBIRR PAYMENT
   ========================================================================== */

async function startTelebirrPayment(
    event
) {

    event.preventDefault();


    const total =
        cart.reduce(
            (sum, item) =>
                sum +
                (
                    (Number(item.price) || 0) *
                    (Number(item.quantity) || 0)
                ),
            0
        );


    const submitButton =
        event.target.querySelector(
            '.payment-submit'
        );


    if (!total) {

        showToast(
            'Your cart is empty.',
            'error'
        );

        return;
    }


    if (submitButton) {

        submitButton.disabled =
            true;
    }


    showToast(
        'Preparing Telebirr payment...',
        'loading'
    );


    try {

        const response =
            await fetch(
                API_BASE +
                '/api/payments/telebirr/create',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({
                            amount: total,
                            items: cart,
                            slug: CAFE_SLUG
                        })
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch (error) {

            data = null;
        }


        if (!response.ok) {

            throw new Error(
                data?.message ||
                'Could not create payment.'
            );
        }


        const merchantAccount =
            data?.merchantAccount ||
            '';


        await copyPaymentDetails(
            `Telebirr: ${total} ETB to ${merchantAccount}`
        );


        if (submitButton) {

            submitButton.textContent =
                'Payment details copied';

            submitButton.disabled =
                false;
        }


        hideToast();


        showToast(
            'Payment details copied successfully!',
            'success'
        );


    } catch (error) {

        if (submitButton) {

            submitButton.disabled =
                false;
        }


        hideToast();


        showToast(
            error.message ||
            'Payment creation failed.',
            'error'
        );
    }
}


/* ==========================================================================
   COPY PAYMENT DETAILS
   ========================================================================== */

async function copyPaymentDetails(
    details
) {

    try {

        if (
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {

            await navigator.clipboard.writeText(
                details
            );

            return true;
        }

    } catch (error) {

        console.warn(
            'Could not copy payment details:',
            error
        );
    }


    /* ----------------------------------------------------------------------
       FALLBACK
       ---------------------------------------------------------------------- */

    try {

        const textarea =
            document.createElement(
                'textarea'
            );


        textarea.value =
            details;


        textarea.style.position =
            'fixed';


        textarea.style.opacity =
            '0';


        document.body.appendChild(
            textarea
        );


        textarea.focus();

        textarea.select();


        const copied =
            document.execCommand(
                'copy'
            );


        textarea.remove();


        return copied;

    } catch (error) {

        console.warn(
            'Clipboard fallback failed:',
            error
        );

        return false;
    }
}


/* ==========================================================================
   ESC KEY
   ========================================================================== */

function setupEscapeKey() {

    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key !== 'Escape'
            ) {
                return;
            }


            closeCustomerDaySpecial();

            closePaymentModal();

            closeImage();
        }
    );
}


/* ==========================================================================
   START CUSTOMER PAGE
   ========================================================================== */

window.addEventListener(
    'DOMContentLoaded',
    async () => {

        loadDefaultCompanyImage();

        setupSearch();

        setupCustomerLanguageSelector();

        setupPayment();
        loadCustomerTelebirrSetting();

        setupCartButton();

        setupEscapeKey();

        await loadMenuFromServer();

        loadCart();
    }
);


/* ==========================================================================
   AUTOMATIC CUSTOMER MENU REFRESH
   ========================================================================== */

/*
 * Every 15 seconds:
 *
 * Admin changes menu
 *        Ã¢â€ â€™
 * Server saves it
 *        Ã¢â€ â€™
 * Customer automatically requests latest data
 *        Ã¢â€ â€™
 * Menu/profile/day-special updates
 *
 * The cart is NOT touched.
 */

setInterval(
    refreshCustomerMenuSilently,
    60000
);
