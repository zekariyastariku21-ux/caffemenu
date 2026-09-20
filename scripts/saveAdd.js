let cart = [];

const STORAGE_KEY = 'simple-cart';

let currentCategory = 'all';

let searchTerm = '';

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
    localStorage.getItem('selectedRestaurantSlug') ||
    'etete-coffee';

let foods = {};


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
        logoElement.src =
            getRestaurantLoadingLogo();

        logoElement.alt =
            'Loading restaurant';

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
            'Cafe Menu';

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
            'image/latte.jpeg';

        logoElement.alt =
            'Restaurant Logo';

        logoElement.style.display =
            'block';
    }
}


/* ==========================================================================
   LOAD MENU FROM SERVER
   ========================================================================== */

async function loadMenuFromServer() {

    showRestaurantHeaderLoading();

    try {
        const response =
            await fetch(
                API_BASE +
                `/api/menu/${encodeURIComponent(CAFE_SLUG)}`,
                {
                    cache: 'no-store'
                }
            );

        const text =
            await response.text();

        let data = null;

        try {
            data = text
                ? JSON.parse(text)
                : null;
        } catch (error) {
            throw new Error(
                'Invalid server response: ' + text
            );
        }

        if (!response.ok) {
            throw new Error(
                data?.message ||
                'Failed to fetch menu'
            );
        }

        /* ------------------------------------------------------------------
           RESTAURANT INFORMATION
           ------------------------------------------------------------------ */

        if (data?.restaurant) {
            const restaurantName =
                document.getElementById(
                    'restaurantName'
                );

            if (restaurantName) {
                restaurantName.textContent =
                    data.restaurant.name ||
                    'Cafe Menu';
            }

            document.title =
                `${data.restaurant.name || 'Cafe'} Menu`;
        }

        /* ------------------------------------------------------------------
           RESTAURANT PROFILE
           ------------------------------------------------------------------ */

        if (
            data?.profile &&
            typeof data.profile === 'object'
        ) {
            restaurantProfile = {
                logo:
                    typeof data.profile.logo === 'string'
                        ? data.profile.logo.trim()
                        : '',

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

        hideRestaurantHeaderLoading();

        renderRestaurantProfile();

        /* ------------------------------------------------------------------
           MENU
           ------------------------------------------------------------------ */

        if (
            data &&
            data.menu &&
            typeof data.menu === 'object' &&
            !Array.isArray(data.menu)
        ) {
            foods = data.menu;

            console.log(
                'Loaded menu for:',
                data.restaurant?.name
            );

            console.log(
                'Restaurant profile:',
                restaurantProfile
            );

            console.log(
                'Menu:',
                foods
            );

            renderItems();
            renderCategoryButtons();

            /*
             * setupDaySpecial() is safe to call repeatedly because
             * it checks data-day-special-ready.
             */
            setupDaySpecial();
        } else {
            foods = {};

            renderItems();
            renderCategoryButtons();
            setupDaySpecial();
        }

    } catch (error) {
        console.error(
            'Could not load menu from server:',
            error
        );

        foods = {};

        restaurantProfile = {
            logo: '',
            phone_numbers: [],
            addresses: []
        };

        showRestaurantHeaderError();

        renderRestaurantProfile();
        renderItems();
        renderCategoryButtons();
        setupDaySpecial();
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
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                }
            );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

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
                    typeof data.profile.logo === 'string'
                        ? data.profile.logo.trim()
                        : '',

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

        /*
         * Do NOT call setupDaySpecial() repeatedly unless necessary.
         * updateDaySpecialButtonState() is enough because the event
         * listener was already installed on first page load.
         */
        updateDaySpecialButtonState();

        /*
         * If the Day Special modal is currently open,
         * leave it alone. The customer can close it normally.
         */
    } catch (error) {
        /*
         * Silent refresh errors should not disturb the customer.
         */
        console.warn(
            'Silent menu refresh failed:',
            error
        );
    }
}


/* ==========================================================================
   RESTAURANT PROFILE
   ========================================================================== */

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

        if (logo) {
            logoElement.src = logo;
            logoElement.style.display = 'block';
            logoElement.alt = 'Restaurant Logo';
        } else {
            logoElement.src = 'image/latte.jpeg';
            logoElement.style.display = 'block';
            logoElement.alt = 'Restaurant Logo';
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
                📞
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
                📍
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
}


/* ==========================================================================
   CATEGORY BUTTONS
   ========================================================================== */

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
        Object.keys(foods);

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
            Object.values(foods)
                .filter(Array.isArray)
                .flat();

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
                    food.isAvailable !== false;

                const ingredient =
                    food.ingridient ||
                    food.ingredient ||
                    '';

                const image =
                    food.image ||
                    'image/latte.jpeg';

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
                                    <div class="menu-item-day-special">
                                        ⭐ Day Special ⭐
                                    </div>
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
                                onerror="this.onerror=null;this.src='image/latte.jpeg';"
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
                                        ${escapeHtml(
                                            food.price || 0
                                        )} ETB
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

    Object.keys(foods).forEach(category => {

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
                    ×
                </button>


                <div class="customer-day-special-empty-icon">
                    ⭐
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
                    item.isAvailable !== false;

                const ingredient =
                    item.ingridient ||
                    item.ingredient ||
                    '';

                const image =
                    item.image ||
                    'image/latte.jpeg';

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
                                    this.src = 'image/latte.jpeg';
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
                                ${escapeHtml(price)} ETB
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
                    ⭐ TODAY'S SPECIALS ⭐
                </h2>


                <button
                    type="button"
                    class="customer-day-special-close"
                    id="customerDaySpecialClose"
                    aria-label="Close"
                >
                    ×
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
                        '✓ Added to Cart';

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
        food.isAvailable === false
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


    saveCart();

    renderCart();


    if (
        button &&
        'textContent' in button
    ) {

        const originalText =
            button.textContent;


        button.textContent =
            '✓ Added';


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


    if (!cart.length) {

        cartBody.innerHTML = `
            <tr>
                <td colspan="3">
                    Your cart is empty
                </td>
            </tr>
        `;

    } else {

        cartBody.innerHTML =
            cart
                .map(item => {

                    const itemPrice =
                        Number(item.price) || 0;

                    const quantity =
                        Number(item.quantity) || 0;


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    item.name
                                )}
                            </td>


                            <td>
                                ${
                                    itemPrice *
                                    quantity
                                }
                            </td>


                            <td>

                                <div class="qty-controls">

                                    <button
                                        type="button"
                                        class="minus"
                                        onclick="decreaseQuantity('${escapeJs(
                                            item.name
                                        )}')"
                                    >
                                        −
                                    </button>


                                    ${quantity}


                                    <button
                                        type="button"
                                        class="plus"
                                        onclick="increaseQuantity('${escapeJs(
                                            item.name
                                        )}')"
                                    >
                                        +
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                })
                .join('');
    }


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

        totalElement.textContent =
            `${total} ETB`;
    }
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


    cartButton.addEventListener(
        'click',
        () => {

            container2.classList.toggle(
                'open'
            );
        }
    );
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


/* ==========================================================================
   PAYMENT MODAL
   ========================================================================== */

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

        paymentTotal.textContent =
            `${total} ETB`;
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
}


/* ==========================================================================
   PAYMENT SETUP
   ========================================================================== */

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


    const accountNumber =
        document.getElementById(
            'telebirrAccount'
        )?.value.trim();


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


    if (
        !/^0\d{9}$/.test(
            accountNumber
        )
    ) {

        showToast(
            'Enter a valid 10-digit Telebirr account number.',
            'error'
        );

        return;
    }


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
                            accountNumber,
                            amount: total,
                            items: cart
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

        setupSearch();

        setupPayment();

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
 *        ↓
 * Server saves it
 *        ↓
 * Customer automatically requests latest data
 *        ↓
 * Menu/profile/day-special updates
 *
 * The cart is NOT touched.
 */

setInterval(
    refreshCustomerMenuSilently,
    15000
);