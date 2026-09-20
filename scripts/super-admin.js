'use strict';

/* ================================================================
   CAFFE MENU — SUPER ADMIN DASHBOARD
   COMPLETE PROFESSIONAL JAVASCRIPT
   CREATE CAFÉ + DUPLICATE + PRICE MANAGEMENT + BLUR FIX
   ================================================================ */


/* ================================================================
   GLOBAL STATE
   ================================================================ */

let ownerRestaurantFilter = 'all';
let ownerRestaurantsData = [];
let ownerOpenRestaurantId = null;

let ownerLoadingDepth = 0;
let ownerNotificationTimer = null;

let priceManagementRestaurant = null;
let priceManagementMenu = {};
let priceManagementSearch = '';
let priceManagementSelectedItems = new Set();
let ownerPriceOperation = 'increase';

let ownerPreviousFocus = null;

let duplicateSourceRestaurant = null;


/* ================================================================
   SESSION
   ================================================================ */

function clearAdminSession() {

    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminRestaurantId');
    localStorage.removeItem('adminRestaurantSlug');
    localStorage.removeItem('selectedRestaurantSlug');
}


function getAdminToken() {

    return (
        localStorage.getItem('adminToken') ||
        ''
    );
}


/* ================================================================
   GENERAL HELPERS
   ================================================================ */

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function createSlugFromName(name) {

    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}


function formatETB(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 'ETB 0.00';
    }

    return `ETB ${number.toFixed(2)}`;
}


function getRestaurantById(id) {

    return ownerRestaurantsData.find(
        restaurant =>
            Number(restaurant.id) === Number(id)
    );
}


function isRestaurantActive(restaurant) {

    if (!restaurant) {
        return false;
    }

    const status =
        String(
            restaurant.status ??
            restaurant.active ??
            ''
        ).toLowerCase();

    if (
        status === 'disabled' ||
        status === 'inactive' ||
        status === 'false' ||
        status === '0'
    ) {
        return false;
    }

    if (
        restaurant.disabled === true ||
        restaurant.active === false
    ) {
        return false;
    }

    return true;
}


function getRestaurantName(restaurant) {

    return (
        restaurant?.name ||
        restaurant?.restaurant_name ||
        restaurant?.restaurantName ||
        'Restaurant'
    );
}


function getRestaurantSlug(restaurant) {

    return (
        restaurant?.slug ||
        restaurant?.restaurant_slug ||
        restaurant?.restaurantSlug ||
        ''
    );
}


/* ================================================================
   API RESPONSE HELPER
   ================================================================ */

async function readOwnerApiResponse(response) {

    const text =
        await response.text();

    let data = {};

    if (text) {

        try {

            data =
                JSON.parse(text);

        } catch {

            data = {
                message: text
            };
        }
    }

    if (!response.ok) {

        const message =
            data?.message ||
            data?.error ||
            `Request failed with status ${response.status}`;

        throw new Error(message);
    }

    return data;
}


/* ================================================================
   RUNTIME STYLES
   DO NOT MODIFY super-admin.css
   ================================================================ */

function ensureSuperAdminRuntimeStyles() {

    if (
        document.getElementById(
            'ownerRuntimeStyles'
        )
    ) {
        return;
    }

    const style =
        document.createElement('style');

    style.id =
        'ownerRuntimeStyles';

    style.textContent = `

        body.owner-action-open {
            overflow:hidden !important;
        }

        /*
         * Never allow a closed modal/backdrop to visually blur
         * the dashboard.
         */

        body:not(.owner-action-open) .super-admin-app {
            filter:none !important;
            backdrop-filter:none !important;
            -webkit-backdrop-filter:none !important;
            opacity:1 !important;
        }

        #ownerActionBackdrop {
            position:fixed !important;
            inset:0 !important;
            width:100% !important;
            height:100% !important;
            background:rgba(25,15,9,.42) !important;
            backdrop-filter:blur(8px);
            -webkit-backdrop-filter:blur(8px);
            z-index:99998 !important;
            display:none !important;
        }

        #ownerActionPanel {
            position:fixed !important;
            top:50% !important;
            left:50% !important;
            right:auto !important;
            bottom:auto !important;
            transform:translate(-50%,-50%) !important;

            width:min(850px,calc(100vw - 32px)) !important;
            max-width:calc(100vw - 32px) !important;

            max-height:calc(100vh - 32px) !important;

            margin:0 !important;
            padding:0 !important;

            flex-direction:column !important;

            overflow:hidden !important;

            z-index:99999 !important;

            display:none !important;
        }

        #ownerActionPanel.show,
        #ownerActionPanel.active,
        #ownerActionPanel.open {
            display:flex !important;
        }

        #ownerActionContent {
            width:100% !important;
            box-sizing:border-box !important;
            overflow-x:hidden !important;
            overflow-y:auto !important;
        }

        #ownerLoadingOverlay {
            position:fixed !important;
            inset:0 !important;
            width:100% !important;
            height:100% !important;

            display:flex !important;
            align-items:center !important;
            justify-content:center !important;

            background:rgba(31,20,13,.38) !important;

            backdrop-filter:blur(6px);
            -webkit-backdrop-filter:blur(6px);

            z-index:1000000 !important;
        }

        #ownerLoadingCard {
            width:min(340px,calc(100vw - 40px));
            padding:24px 22px;
            border-radius:20px;
            background:#fffdf9;
            box-shadow:0 30px 80px rgba(0,0,0,.22);
            text-align:center;
        }

        #ownerLoadingSpinner {
            width:34px;
            height:34px;
            margin:0 auto 14px;
            border:3px solid rgba(66,42,27,.12);
            border-top-color:#a8792e;
            border-radius:50%;
            animation:ownerLoadingSpin .75s linear infinite;
        }

        #ownerLoadingText {
            color:#351d12;
            font-size:12px;
            font-weight:800;
        }

        .owner-form-grid {
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:16px;
        }

        .owner-form-field {
            min-width:0;
        }

        .owner-form-field label {
            color:#4a382d;
            font-size:10px;
            font-weight:800;
        }

        .owner-form-field input,
        .owner-form-field select {
            width:100%;
            min-height:43px;
            box-sizing:border-box;
            border:1px solid rgba(66,42,27,.14);
            border-radius:11px;
            background:#fff;
            color:#21120c;
            padding:0 13px;
            outline:none;
        }

        .owner-form-field input:focus,
        .owner-form-field select:focus {
            border-color:#a8792e;
            box-shadow:0 0 0 3px rgba(168,121,46,.10);
        }

        .owner-form-actions {
            display:flex;
            justify-content:flex-end;
            align-items:center;
            gap:10px;
            margin-top:20px;
        }

        .owner-action-btn,
        .restaurant-action-btn {
            min-height:40px;
            border-radius:10px;
            padding:0 15px;
            cursor:pointer;
            font-size:11px;
            font-weight:800;
        }

        .owner-action-btn {
            border:1px solid #351d12;
            background:#351d12;
            color:#fff;
        }

        .owner-action-btn:disabled,
        .restaurant-action-btn:disabled {
            opacity:.55;
            cursor:not-allowed;
        }

        .restaurant-action-btn {
            border:1px solid rgba(66,42,27,.14);
            background:#fff;
            color:#351d12;
        }

        .owner-empty-state {
            padding:35px 20px;
            text-align:center;
        }

        .owner-empty-icon {
            width:50px;
            height:50px;
            margin:0 auto 12px;
            display:flex;
            align-items:center;
            justify-content:center;
            border-radius:50%;
            background:#fff5df;
            color:#a8792e;
            font-size:22px;
            font-weight:900;
        }

        .owner-empty-title {
            margin:0;
            color:#21120c;
            font-size:17px;
        }

        .owner-empty-text {
            margin:8px auto 18px;
            max-width:400px;
            color:#766960;
            font-size:11px;
            line-height:1.55;
        }

        .owner-empty-create-btn {
            min-height:42px;
            padding:0 18px;
            border:0;
            border-radius:10px;
            background:#351d12;
            color:#fff;
            cursor:pointer;
            font-weight:800;
        }

        .price-operation-option.active {
            background:#351d12 !important;
            color:#fff !important;
            border-color:#351d12 !important;
        }

        @keyframes ownerLoadingSpin {
            from {
                transform:rotate(0deg);
            }
            to {
                transform:rotate(360deg);
            }
        }

        @media (max-width:680px) {

            .owner-form-grid {
                grid-template-columns:1fr;
            }

            .owner-form-actions {
                flex-direction:column-reverse;
                align-items:stretch;
            }

            .owner-form-actions button {
                width:100%;
            }

            #ownerActionPanel {
                width:calc(100vw - 20px) !important;
                max-width:calc(100vw - 20px) !important;
                max-height:calc(100vh - 20px) !important;
            }
        }
    `;

    document.head.appendChild(style);
}


/* ================================================================
   CLEANUP HELPERS
   ================================================================ */

function cleanupOwnerVisualState() {

    /*
     * Remove every stale loading overlay.
     */

    document
        .querySelectorAll(
            '#ownerLoadingOverlay'
        )
        .forEach(
            overlay =>
                overlay.remove()
        );

    ownerLoadingDepth = 0;


    /*
     * Remove every stale modal backdrop.
     */

    document
        .querySelectorAll(
            '#ownerActionBackdrop'
        )
        .forEach(
            backdrop =>
                backdrop.remove()
        );


    /*
     * Close modal state.
     */

    const panel =
        document.getElementById(
            'ownerActionPanel'
        );

    if (panel) {

        panel.classList.remove(
            'show',
            'active',
            'open'
        );

        panel.setAttribute(
            'aria-hidden',
            'true'
        );

        panel.style.setProperty(
            'display',
            'none',
            'important'
        );

        panel.style.setProperty(
            'visibility',
            'hidden',
            'important'
        );

        panel.style.setProperty(
            'opacity',
            '0',
            'important'
        );

        panel.style.setProperty(
            'pointer-events',
            'none',
            'important'
        );
    }


    /*
     * Remove body modal state.
     */

    document.body.classList.remove(
        'owner-action-open'
    );


    /*
     * Remove accidental blur/filter from dashboard.
     */

    const app =
        document.querySelector(
            '.super-admin-app'
        );

    if (app) {

        app.style.removeProperty('filter');
        app.style.removeProperty('backdrop-filter');
        app.style.removeProperty('-webkit-backdrop-filter');
        app.style.removeProperty('opacity');
    }


    /*
     * Remove accidental blur from body/html too.
     */

    document.body.style.removeProperty(
        'filter'
    );

    document.body.style.removeProperty(
        'backdrop-filter'
    );

    document.body.style.removeProperty(
        '-webkit-backdrop-filter'
    );

    document.documentElement.style.removeProperty(
        'filter'
    );

    document.documentElement.style.removeProperty(
        'backdrop-filter'
    );

    document.documentElement.style.removeProperty(
        '-webkit-backdrop-filter'
    );


    /*
     * Restore scrolling.
     */

    document.body.style.removeProperty(
        'overflow'
    );

    document.documentElement.style.removeProperty(
        'overflow'
    );
}


function cleanupOwnerLoadingState() {

    document
        .querySelectorAll(
            '#ownerLoadingOverlay'
        )
        .forEach(
            overlay =>
                overlay.remove()
        );

    ownerLoadingDepth = 0;


    /*
     * Important:
     * Loading cleanup must also remove accidental blur.
     */

    const app =
        document.querySelector(
            '.super-admin-app'
        );

    if (app) {

        app.style.removeProperty('filter');
        app.style.removeProperty('backdrop-filter');
        app.style.removeProperty('-webkit-backdrop-filter');
        app.style.removeProperty('opacity');
    }
}


/* ================================================================
   ACCESS CHECK
   ================================================================ */

async function checkSuperAdminAccess() {

    const token =
        getAdminToken();

    if (!token) {

        window.location.href =
            '/admin.html';

        return false;
    }

    try {

        const response =
            await fetch(
                '/api/admin/session',
                {
                    method:'GET',

                    headers:{
                        Accept:
                            'application/json',

                        Authorization:
                            `Bearer ${token}`
                    },

                    credentials:
                        'same-origin',

                    cache:
                        'no-store'
                }
            );

        if (!response.ok) {

            clearAdminSession();

            window.location.href =
                '/admin.html';

            return false;
        }

        const data =
            await readOwnerApiResponse(
                response
            );

        const role =
            data?.role ||
            data?.user?.role ||
            localStorage.getItem(
                'adminRole'
            );

        if (
            role !== 'super_admin'
        ) {

            clearAdminSession();

            window.location.href =
                '/admin.html';

            return false;
        }

        return true;

    } catch (error) {

        console.error(
            '[super-admin] Access check failed:',
            error
        );

        clearAdminSession();

        window.location.href =
            '/admin.html';

        return false;
    }
}


/* ================================================================
   LOADING
   ================================================================ */

function showOwnerLoading(
    message = 'Please wait...'
) {

    let overlay =
        document.getElementById(
            'ownerLoadingOverlay'
        );

    if (!overlay) {

        overlay =
            document.createElement(
                'div'
            );

        overlay.id =
            'ownerLoadingOverlay';

        overlay.innerHTML = `
            <div id="ownerLoadingCard">

                <div id="ownerLoadingSpinner"></div>

                <div id="ownerLoadingText">
                    ${escapeHtml(message)}
                </div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );
    }

    const text =
        document.getElementById(
            'ownerLoadingText'
        );

    if (text) {
        text.textContent =
            message;
    }

    ownerLoadingDepth++;

    overlay.style.setProperty(
        'display',
        'flex',
        'important'
    );
}


function hideOwnerLoading() {

    ownerLoadingDepth = 0;

    cleanupOwnerLoadingState();
}


/* ================================================================
   STATS
   ================================================================ */

function updateOwnerRestaurantStats() {

    const total =
        ownerRestaurantsData.length;

    const active =
        ownerRestaurantsData.filter(
            isRestaurantActive
        ).length;

    const disabled =
        total - active;

    const totalElement =
        document.getElementById(
            'totalRestaurants'
        );

    const activeElement =
        document.getElementById(
            'activeRestaurants'
        );

    const disabledElement =
        document.getElementById(
            'disabledRestaurants'
        );

    if (totalElement) {
        totalElement.textContent =
            total;
    }

    if (activeElement) {
        activeElement.textContent =
            active;
    }

    if (disabledElement) {
        disabledElement.textContent =
            disabled;
    }
}


/* ================================================================
   FILTER
   ================================================================ */

function filterOwnerRestaurants(
    filter
) {

    ownerRestaurantFilter =
        filter || 'all';

    document
        .querySelectorAll(
            '.stat-filter'
        )
        .forEach(card => {

            card.classList.remove(
                'active-filter'
            );

            card.classList.remove(
                'active-stat'
            );

            card.classList.remove(
                'disabled-stat-active'
            );
        });


    if (
        ownerRestaurantFilter ===
        'all'
    ) {

        document
            .querySelector(
                '.stat-filter:nth-child(1)'
            )
            ?.classList.add(
                'active-filter'
            );

    } else if (
        ownerRestaurantFilter ===
        'active'
    ) {

        document
            .querySelector(
                '.stat-filter:nth-child(2)'
            )
            ?.classList.add(
                'active-stat'
            );

    } else if (
        ownerRestaurantFilter ===
        'disabled'
    ) {

        document
            .querySelector(
                '.stat-filter:nth-child(3)'
            )
            ?.classList.add(
                'disabled-stat-active'
            );
    }

    renderOwnerRestaurantList();
}


/* ================================================================
   RESTAURANT LIST
   ================================================================ */

function renderOwnerRestaurantList() {

    const container =
        document.getElementById(
            'ownerCafeList'
        );

    if (!container) return;

    const searchInput =
        document.getElementById(
            'restaurantSearch'
        );

    const search =
        String(
            searchInput?.value || ''
        )
            .trim()
            .toLowerCase();

    let restaurants =
        [...ownerRestaurantsData];


    if (
        ownerRestaurantFilter ===
        'active'
    ) {

        restaurants =
            restaurants.filter(
                isRestaurantActive
            );

    } else if (
        ownerRestaurantFilter ===
        'disabled'
    ) {

        restaurants =
            restaurants.filter(
                restaurant =>
                    !isRestaurantActive(
                        restaurant
                    )
            );
    }


    if (search) {

        restaurants =
            restaurants.filter(
                restaurant => {

                    const name =
                        getRestaurantName(
                            restaurant
                        )
                            .toLowerCase();

                    const slug =
                        getRestaurantSlug(
                            restaurant
                        )
                            .toLowerCase();

                    return (
                        name.includes(search) ||
                        slug.includes(search)
                    );
                }
            );
    }


    if (
        restaurants.length === 0
    ) {

        container.innerHTML = `
            <div
                style="
                    padding:35px 18px;
                    text-align:center;
                    color:#9b8e84;
                    font-size:11px;
                "
            >
                No restaurants found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        restaurants
            .map(
                (restaurant,index) =>
                    renderOwnerRestaurantRow(
                        restaurant,
                        index
                    )
            )
            .join('');
}


/* ================================================================
   RESTAURANT ROW
   ================================================================ */

function renderOwnerRestaurantRow(
    restaurant,
    index
) {

    const id =
        Number(
            restaurant.id
        );

    const name =
        getRestaurantName(
            restaurant
        );

    const slug =
        getRestaurantSlug(
            restaurant
        );

    const active =
        isRestaurantActive(
            restaurant
        );

    const statusText =
        active
            ? 'Active'
            : 'Disabled';

    const rowId =
        `ownerRestaurantRow-${id}`;

    return `
        <div
            class="owner-restaurant-row"
            data-restaurant-id="${id}"
        >

            <div class="owner-restaurant-number">
                ${index + 1}
            </div>

            <div class="owner-restaurant-main">

                <strong>
                    ${escapeHtml(name)}
                </strong>

                <span>
                    ${escapeHtml(
                        restaurant.admin_email ||
                        restaurant.adminEmail ||
                        'Restaurant'
                    )}
                </span>

            </div>

            <div class="owner-restaurant-slug">
                /${escapeHtml(slug)}
            </div>

            <div>
                <span
                    class="owner-status-badge"
                    style="
                        display:inline-flex;
                        align-items:center;
                        gap:5px;
                        padding:5px 9px;
                        border-radius:999px;
                        background:${active ? '#eaf6ee' : '#fbeceb'};
                        color:${active ? '#28734b' : '#ae4941'};
                        font-size:9px;
                        font-weight:900;
                    "
                >
                    <span>
                        ${active ? '●' : '●'}
                    </span>
                    ${statusText}
                </span>
            </div>

            <div class="owner-restaurant-access">

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="toggleOwnerRestaurantActions(${id})"
                >
                    Manage
                </button>

            </div>

            <div
                id="${rowId}"
                class="owner-restaurant-actions"
                style="
                    display:none;
                    grid-column:1 / -1;
                    padding:12px 0 2px;
                    grid-template-columns:repeat(4,minmax(0,1fr));
                    gap:7px;
                "
            >

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="manageOwnerCafeMenu('${escapeHtml(slug)}')"
                >
                    Open Menu
                </button>

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="editOwnerCafe(${id})"
                >
                    Edit
                </button>

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="editOwnerCafeAdmin(${id})"
                >
                    Admin
                </button>

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="openPriceManagementForRestaurant(${id})"
                    ${active ? '' : 'disabled'}
                >
                    Prices
                </button>

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="toggleOwnerCafeStatus(${id})"
                >
                    ${active ? 'Disable' : 'Enable'}
                </button>

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="deleteOwnerCafe(${id})"
                >
                    Delete
                </button>

            </div>

        </div>
    `;
}


function toggleOwnerRestaurantActions(
    restaurantId
) {

    const row =
        document.getElementById(
            `ownerRestaurantRow-${Number(restaurantId)}`
        );

    if (!row) return;

    const isOpen =
        row.style.display ===
        'grid';

    document
        .querySelectorAll(
            '.owner-restaurant-actions'
        )
        .forEach(
            element => {
                element.style.display =
                    'none';
            }
        );

    if (!isOpen) {

        row.style.display =
            'grid';

        ownerOpenRestaurantId =
            Number(restaurantId);

    } else {

        ownerOpenRestaurantId =
            null;
    }
}


/* ================================================================
   LOAD RESTAURANTS
   ================================================================ */

async function loadOwnerCafes() {

    const token =
        getAdminToken();

    if (!token) {

        clearAdminSession();

        window.location.href =
            '/admin.html';

        return false;
    }

    showOwnerLoading(
        'Loading restaurants...'
    );

    try {

        const response =
            await fetch(
                '/api/owner/restaurants',
                {
                    method:'GET',

                    headers:{
                        Accept:
                            'application/json',

                        Authorization:
                            `Bearer ${token}`
                    },

                    credentials:
                        'same-origin',

                    cache:
                        'no-store'
                }
            );

        const data =
            await readOwnerApiResponse(
                response
            );

        ownerRestaurantsData =
            Array.isArray(data)
                ? data
                : (
                    Array.isArray(
                        data.restaurants
                    )
                        ? data.restaurants
                        : []
                );

        updateOwnerRestaurantStats();

        renderOwnerRestaurantList();

        return true;

    } catch (error) {

        console.error(
            '[super-admin] Restaurant load failed:',
            error
        );

        showOwnerNotification(
            'Unable to load restaurants',
            error.message ||
                'Please refresh and try again.',
            'error'
        );

        return false;

    } finally {

        hideOwnerLoading();
    }
}


/* ================================================================
   REFRESH
   ================================================================ */

async function refreshOwnerDashboard() {

    const button =
        document.getElementById(
            'ownerRefreshBtn'
        );

    if (button) {

        button.disabled =
            true;

        button.style.opacity =
            '.55';

        button.style.transform =
            'rotate(90deg)';
    }

    try {

        await loadOwnerCafes();

        showOwnerNotification(
            'Dashboard refreshed',
            'Restaurant information is up to date.',
            'success'
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.style.opacity =
                '';

            button.style.transform =
                '';
        }

        cleanupOwnerVisualState();
    }
}


/* ================================================================
   CREATE CAFÉ
   ================================================================ */

function openCreateCafePanel() {

    closeSuperAdminMenu();

    const content = `

        <form
            id="ownerCreateCafeForm"
            onsubmit="submitCreateOwnerCafe(event)"
        >

            <div
                style="
                    padding:18px;
                    margin-bottom:3px;
                    border:1px solid rgba(196,150,66,.20);
                    border-radius:15px;
                    background:linear-gradient(
                        135deg,
                        #fff8e9,
                        #fffdf9
                    );
                "
            >

                <div
                    style="
                        color:#805a20;
                        font-size:9px;
                        font-weight:900;
                        letter-spacing:.18em;
                        text-transform:uppercase;
                        margin-bottom:5px;
                    "
                >
                    NEW RESTAURANT
                </div>

                <div
                    style="
                        color:#21120c;
                        font-family:Georgia,'Times New Roman',serif;
                        font-size:18px;
                        font-weight:700;
                    "
                >
                    Create New Café
                </div>

                <div
                    style="
                        margin-top:6px;
                        color:#766960;
                        font-size:11px;
                        line-height:1.5;
                    "
                >
                    Create a new restaurant and its café administrator account.
                </div>

            </div>


            <div class="owner-form-grid">

                <div class="owner-form-field">

                    <label
                        for="ownerCreateCafeName"
                    >
                        Café Name
                    </label>

                    <input
                        type="text"
                        id="ownerCreateCafeName"
                        placeholder="Example Café"
                        autocomplete="organization"
                        required
                    >

                </div>


                <div class="owner-form-field">

                    <label
                        for="ownerCreateCafeSlug"
                    >
                        Public Slug
                    </label>

                    <input
                        type="text"
                        id="ownerCreateCafeSlug"
                        placeholder="example-cafe"
                        autocomplete="off"
                        required
                    >

                </div>


                <div class="owner-form-field">

                    <label
                        for="ownerCreateAdminEmail"
                    >
                        Café Admin Email
                    </label>

                    <input
                        type="email"
                        id="ownerCreateAdminEmail"
                        placeholder="admin@example.com"
                        autocomplete="email"
                        required
                    >

                </div>


                <div class="owner-form-field">

                    <label
                        for="ownerCreateAdminPassword"
                    >
                        Initial Password
                    </label>

                    <input
                        type="password"
                        id="ownerCreateAdminPassword"
                        placeholder="Minimum 6 characters"
                        autocomplete="new-password"
                        minlength="6"
                        required
                    >

                </div>

            </div>


            <div
                style="
                    margin-top:15px;
                    padding:13px 15px;
                    border:1px solid rgba(196,150,66,.16);
                    border-radius:12px;
                    background:#fffaf0;
                    color:#735727;
                    font-size:10px;
                    line-height:1.55;
                "
            >
                The café administrator will use these credentials to access the restaurant dashboard.
            </div>


            <div class="owner-form-actions">

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="closeOwnerActionPanel()"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    id="ownerCreateCafeSubmit"
                    class="owner-action-btn"
                    style="
                        min-height:43px;
                        padding:0 20px;
                        background:#351d12;
                        border-color:#351d12;
                        color:#ffffff;
                    "
                >
                    Create Café
                </button>

            </div>

        </form>
    `;

    openOwnerActionPanel(
        'Create New Café',
        content
    );


    requestAnimationFrame(() => {

        const nameInput =
            document.getElementById(
                'ownerCreateCafeName'
            );

        const slugInput =
            document.getElementById(
                'ownerCreateCafeSlug'
            );

        if (
            nameInput &&
            slugInput
        ) {

            nameInput.addEventListener(
                'input',
                () => {

                    if (
                        !slugInput.dataset.manuallyEdited
                    ) {

                        slugInput.value =
                            createSlugFromName(
                                nameInput.value
                            );
                    }
                }
            );
        }

        if (slugInput) {

            slugInput.addEventListener(
                'input',
                () => {

                    slugInput.dataset.manuallyEdited =
                        'true';

                    slugInput.value =
                        slugInput.value
                            .toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(
                                /[^a-z0-9-]/g,
                                ''
                            )
                            .replace(
                                /-{2,}/g,
                                '-'
                            );
                }
            );
        }

        nameInput?.focus();
    });
}


/* ================================================================
   SUBMIT CREATE CAFÉ
   ================================================================ */

async function submitCreateOwnerCafe(
    event
) {

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }


    const form =
        document.getElementById(
            'ownerCreateCafeForm'
        );

    const submitButton =
        document.getElementById(
            'ownerCreateCafeSubmit'
        );


    if (
        submitButton?.dataset.submitting ===
        'true'
    ) {
        return;
    }


    const token =
        getAdminToken();

    if (!token) {

        clearAdminSession();

        window.location.href =
            '/admin.html';

        return;
    }


    const name =
        document
            .getElementById(
                'ownerCreateCafeName'
            )
            ?.value
            .trim();


    const slug =
        document
            .getElementById(
                'ownerCreateCafeSlug'
            )
            ?.value
            .trim()
            .toLowerCase();


    const adminEmail =
        document
            .getElementById(
                'ownerCreateAdminEmail'
            )
            ?.value
            .trim()
            .toLowerCase();


    const adminPassword =
        document
            .getElementById(
                'ownerCreateAdminPassword'
            )
            ?.value || '';


    if (!name) {

        showOwnerNotification(
            'Missing café name',
            'Please enter the new restaurant name.',
            'error'
        );

        return;
    }


    if (
        !slug ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            slug
        )
    ) {

        showOwnerNotification(
            'Invalid slug',
            'Use lowercase letters, numbers and hyphens only.',
            'error'
        );

        return;
    }


    if (!adminEmail) {

        showOwnerNotification(
            'Missing admin email',
            'Please enter the café administrator email.',
            'error'
        );

        return;
    }


    if (
        adminPassword.length < 6
    ) {

        showOwnerNotification(
            'Password too short',
            'The administrator password must contain at least 6 characters.',
            'error'
        );

        return;
    }


    if (submitButton) {

        submitButton.dataset.submitting =
            'true';

        submitButton.disabled =
            true;

        submitButton.textContent =
            'Creating...';
    }


    showOwnerLoading(
        'Creating café...'
    );


    let createdSuccessfully =
        false;

    try {

        const response =
            await fetch(
                '/api/owner/restaurants',
                {
                    method:'POST',

                    headers:{
                        Authorization:
                            `Bearer ${token}`,

                        'Content-Type':
                            'application/json',

                        Accept:
                            'application/json'
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({
                            name,
                            slug,
                            adminEmail,
                            adminPassword
                        })
                }
            );


        const data =
            await readOwnerApiResponse(
                response
            );


        createdSuccessfully =
            true;


        /*
         * Close first.
         * The refresh is a separate operation and must not make
         * a successful creation look like a failed creation.
         */

        closeOwnerActionPanel();


        let refreshWorked =
            false;

        try {

            refreshWorked =
                await loadOwnerCafes();

        } catch (refreshError) {

            console.warn(
                '[super-admin] Café created but refresh failed:',
                refreshError
            );
        }


        if (refreshWorked) {

            showOwnerNotification(
                'Café created',
                data.message ||
                    `${name} was created successfully.`,
                'success'
            );

        } else {

            showOwnerNotification(
                'Café created',
                `${name} was created successfully. Refresh the dashboard if it does not appear immediately.`,
                'success'
            );
        }


    } catch (error) {

        console.error(
            '[super-admin] Create café failed:',
            error
        );


        showOwnerNotification(
            'Unable to create café',
            error.message ||
                'Please check the information and try again.',
            'error'
        );


    } finally {

        hideOwnerLoading();


        if (
            !createdSuccessfully &&
            submitButton
        ) {

            submitButton.dataset.submitting =
                'false';

            submitButton.disabled =
                false;

            submitButton.textContent =
                'Create Café';
        }


        cleanupOwnerVisualState();
    }
}


/* ================================================================
   EDIT RESTAURANT
   ================================================================ */

function editOwnerCafe(
    restaurantId
) {

    const restaurant =
        getRestaurantById(
            restaurantId
        );

    if (!restaurant) {

        showOwnerNotification(
            'Restaurant not found',
            'The selected restaurant could not be found.',
            'error'
        );

        return;
    }


    const name =
        getRestaurantName(
            restaurant
        );

    const slug =
        getRestaurantSlug(
            restaurant
        );


    openOwnerActionPanel(
        'Edit Restaurant',
        `
            <form
                id="ownerEditCafeForm"
                onsubmit="submitEditOwnerCafe(event, ${Number(restaurantId)})"
            >

                <div class="owner-form-grid">

                    <div class="owner-form-field">

                        <label for="ownerEditCafeName">
                            Café Name
                        </label>

                        <input
                            type="text"
                            id="ownerEditCafeName"
                            value="${escapeHtml(name)}"
                            required
                        >

                    </div>

                    <div class="owner-form-field">

                        <label for="ownerEditCafeSlug">
                            Public Slug
                        </label>

                        <input
                            type="text"
                            id="ownerEditCafeSlug"
                            value="${escapeHtml(slug)}"
                            required
                        >

                    </div>

                </div>

                <div class="owner-form-actions">

                    <button
                        type="button"
                        class="restaurant-action-btn"
                        onclick="closeOwnerActionPanel()"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="owner-action-btn"
                    >
                        Save Changes
                    </button>

                </div>

            </form>
        `
    );
}


async function submitEditOwnerCafe(
    event,
    restaurantId
) {

    event.preventDefault();


    const token =
        getAdminToken();

    if (!token) {

        clearAdminSession();

        window.location.href =
            '/admin.html';

        return;
    }


    const name =
        document
            .getElementById(
                'ownerEditCafeName'
            )
            ?.value
            .trim();


    const slug =
        document
            .getElementById(
                'ownerEditCafeSlug'
            )
            ?.value
            .trim()
            .toLowerCase();


    if (!name) {

        showOwnerNotification(
            'Missing café name',
            'Please enter a restaurant name.',
            'error'
        );

        return;
    }


    if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            slug
        )
    ) {

        showOwnerNotification(
            'Invalid slug',
            'Use lowercase letters, numbers and hyphens only.',
            'error'
        );

        return;
    }


    showOwnerLoading(
        'Saving restaurant...'
    );


    try {

        const response =
            await fetch(
                `/api/owner/restaurants/${Number(restaurantId)}`,
                {
                    method:'PUT',

                    headers:{
                        Authorization:
                            `Bearer ${token}`,

                        'Content-Type':
                            'application/json',

                        Accept:
                            'application/json'
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({
                            name,
                            slug
                        })
                }
            );


        const data =
            await readOwnerApiResponse(
                response
            );


        closeOwnerActionPanel();

        await loadOwnerCafes();


        showOwnerNotification(
            'Restaurant updated',
            data.message ||
                'Restaurant information was updated successfully.',
            'success'
        );


    } catch (error) {

        console.error(
            '[super-admin] Restaurant update failed:',
            error
        );

        showOwnerNotification(
            'Unable to update restaurant',
            error.message ||
                'Please try again.',
            'error'
        );

    } finally {

        hideOwnerLoading();

        cleanupOwnerVisualState();
    }
}


/* ================================================================
   EDIT CAFÉ ADMIN
   ================================================================ */

function editOwnerCafeAdmin(
    restaurantId
) {

    const restaurant =
        getRestaurantById(
            restaurantId
        );

    if (!restaurant) {

        showOwnerNotification(
            'Restaurant not found',
            'The selected restaurant could not be found.',
            'error'
        );

        return;
    }


    const email =
        restaurant.admin_email ||
        restaurant.adminEmail ||
        '';


    openOwnerActionPanel(
        'Café Administrator',
        `
            <form
                id="ownerEditCafeAdminForm"
                onsubmit="submitEditOwnerCafeAdmin(event, ${Number(restaurantId)})"
            >

                <div
                    style="
                        margin-bottom:16px;
                        padding:14px;
                        border:1px solid rgba(196,150,66,.16);
                        border-radius:12px;
                        background:#fffaf0;
                        color:#735727;
                        font-size:10px;
                        line-height:1.55;
                    "
                >
                    Update the login credentials for
                    <strong>
                        ${escapeHtml(
                            getRestaurantName(
                                restaurant
                            )
                        )}
                    </strong>.
                </div>

                <div class="owner-form-grid">

                    <div class="owner-form-field">

                        <label for="ownerEditAdminEmail">
                            Café Admin Email
                        </label>

                        <input
                            type="email"
                            id="ownerEditAdminEmail"
                            value="${escapeHtml(email)}"
                            autocomplete="email"
                            required
                        >

                    </div>

                    <div class="owner-form-field">

                        <label for="ownerEditAdminPassword">
                            New Password
                        </label>

                        <input
                            type="password"
                            id="ownerEditAdminPassword"
                            placeholder="Minimum 6 characters"
                            autocomplete="new-password"
                            minlength="6"
                            required
                        >

                    </div>

                </div>

                <div class="owner-form-actions">

                    <button
                        type="button"
                        class="restaurant-action-btn"
                        onclick="closeOwnerActionPanel()"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="owner-action-btn"
                    >
                        Save Credentials
                    </button>

                </div>

            </form>
        `
    );
}


async function submitEditOwnerCafeAdmin(
    event,
    restaurantId
) {

    event.preventDefault();


    const token =
        getAdminToken();

    if (!token) {

        clearAdminSession();

        window.location.href =
            '/admin.html';

        return;
    }


    const email =
        document
            .getElementById(
                'ownerEditAdminEmail'
            )
            ?.value
            .trim()
            .toLowerCase();


    const password =
        document
            .getElementById(
                'ownerEditAdminPassword'
            )
            ?.value || '';


    if (!email) {

        showOwnerNotification(
            'Missing email',
            'Please enter the administrator email.',
            'error'
        );

        return;
    }


    if (
        password.length < 6
    ) {

        showOwnerNotification(
            'Password too short',
            'The password must contain at least 6 characters.',
            'error'
        );

        return;
    }


    showOwnerLoading(
        'Updating administrator...'
    );


    try {

        const response =
            await fetch(
                `/api/owner/restaurants/${Number(restaurantId)}/admin`,
                {
                    method:'PUT',

                    headers:{
                        Authorization:
                            `Bearer ${token}`,

                        'Content-Type':
                            'application/json',

                        Accept:
                            'application/json'
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({
                            email,
                            password
                        })
                }
            );


        const data =
            await readOwnerApiResponse(
                response
            );


        closeOwnerActionPanel();

        await loadOwnerCafes();


        showOwnerNotification(
            'Administrator updated',
            data.message ||
                'Café administrator credentials were updated.',
            'success'
        );


    } catch (error) {

        console.error(
            '[super-admin] Admin update failed:',
            error
        );

        showOwnerNotification(
            'Unable to update administrator',
            error.message ||
                'Please try again.',
            'error'
        );

    } finally {

        hideOwnerLoading();

        cleanupOwnerVisualState();
    }
}


/* ================================================================
   ENABLE / DISABLE
   ================================================================ */

async function toggleOwnerCafeStatus(
    restaurantId
) {

    const restaurant =
        getRestaurantById(
            restaurantId
        );

    if (!restaurant) {

        showOwnerNotification(
            'Restaurant not found',
            'The selected restaurant could not be found.',
            'error'
        );

        return;
    }


    const active =
        isRestaurantActive(
            restaurant
        );

    const nextStatus =
        active
            ? 'disabled'
            : 'active';


    showOwnerLoading(
        active
            ? 'Disabling restaurant...'
            : 'Enabling restaurant...'
    );


    try {

        const token =
            getAdminToken();

        if (!token) {

            clearAdminSession();

            window.location.href =
                '/admin.html';

            return;
        }


        const response =
            await fetch(
                `/api/owner/restaurants/${Number(restaurantId)}/status`,
                {
                    method:'PUT',

                    headers:{
                        Authorization:
                            `Bearer ${token}`,

                        'Content-Type':
                            'application/json',

                        Accept:
                            'application/json'
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({
                            status:
                                nextStatus
                        })
                }
            );


        const data =
            await readOwnerApiResponse(
                response
            );


        await loadOwnerCafes();


        showOwnerNotification(
            active
                ? 'Restaurant disabled'
                : 'Restaurant enabled',
            data.message ||
                (
                    active
                        ? 'The restaurant is now disabled.'
                        : 'The restaurant is now active.'
                ),
            'success'
        );


    } catch (error) {

        console.error(
            '[super-admin] Status update failed:',
            error
        );

        showOwnerNotification(
            'Unable to change status',
            error.message ||
                'Please try again.',
            'error'
        );

    } finally {

        hideOwnerLoading();

        cleanupOwnerVisualState();
    }
}


/* ================================================================
   DELETE
   ================================================================ */

function deleteOwnerCafe(
    restaurantId
) {

    const restaurant =
        getRestaurantById(
            restaurantId
        );

    if (!restaurant) {

        showOwnerNotification(
            'Restaurant not found',
            'The selected restaurant could not be found.',
            'error'
        );

        return;
    }


    confirmDeleteOwnerCafe(
        restaurantId
    );
}


function confirmDeleteOwnerCafe(
    restaurantId
) {

    const restaurant =
        getRestaurantById(
            restaurantId
        );

    if (!restaurant) return;


    const name =
        getRestaurantName(
            restaurant
        );


    openOwnerActionPanel(
        'Delete Restaurant',
        `
            <div
                style="
                    padding:18px;
                    border:1px solid rgba(174,73,65,.16);
                    border-radius:14px;
                    background:#fff6f5;
                "
            >

                <div
                    style="
                        color:#ae4941;
                        font-size:9px;
                        font-weight:900;
                        letter-spacing:.16em;
                        text-transform:uppercase;
                    "
                >
                    PERMANENT ACTION
                </div>

                <div
                    style="
                        margin-top:7px;
                        color:#21120c;
                        font-family:Georgia,'Times New Roman',serif;
                        font-size:18px;
                        font-weight:700;
                    "
                >
                    Delete ${escapeHtml(name)}?
                </div>

                <div
                    style="
                        margin-top:8px;
                        color:#766960;
                        font-size:11px;
                        line-height:1.55;
                    "
                >
                    This action will permanently remove the restaurant.
                    Make sure you really want to continue.
                </div>

            </div>

            <div class="owner-form-actions">

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="closeOwnerActionPanel()"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="owner-action-btn"
                    onclick="executeDeleteOwnerCafe(${Number(restaurantId)})"
                    style="
                        background:#ae4941;
                        border-color:#ae4941;
                    "
                >
                    Delete Restaurant
                </button>

            </div>
        `
    );
}


async function executeDeleteOwnerCafe(
    restaurantId
) {

    const token =
        getAdminToken();

    if (!token) {

        clearAdminSession();

        window.location.href =
            '/admin.html';

        return;
    }


    showOwnerLoading(
        'Deleting restaurant...'
    );


    try {

        const response =
            await fetch(
                `/api/owner/restaurants/${Number(restaurantId)}`,
                {
                    method:'DELETE',

                    headers:{
                        Authorization:
                            `Bearer ${token}`,

                        Accept:
                            'application/json'
                    },

                    credentials:
                        'same-origin'
                }
            );


        const data =
            await readOwnerApiResponse(
                response
            );


        closeOwnerActionPanel();

        await loadOwnerCafes();


        showOwnerNotification(
            'Restaurant deleted',
            data.message ||
                'The restaurant was deleted successfully.',
            'success'
        );


    } catch (error) {

        console.error(
            '[super-admin] Delete restaurant failed:',
            error
        );

        showOwnerNotification(
            'Unable to delete restaurant',
            error.message ||
                'Please try again.',
            'error'
        );

    } finally {

        hideOwnerLoading();

        cleanupOwnerVisualState();
    }
}


/* ================================================================
   DUPLICATE CAFÉ
   ================================================================ */

function openDuplicateCafePanel() {

    closeSuperAdminMenu();

    const activeRestaurants =
        ownerRestaurantsData.filter(
            restaurant =>
                isRestaurantActive(
                    restaurant
                )
        );


    if (
        !duplicateSourceRestaurant
    ) {

        if (
            activeRestaurants.length === 0
        ) {

            openOwnerActionPanel(
                'Duplicate Café',
                `
                    <div class="owner-empty-state">

                        <div class="owner-empty-icon">
                            ⧉
                        </div>

                        <h3 class="owner-empty-title">
                            No Active Restaurants
                        </h3>

                        <p class="owner-empty-text">
                            Create or enable a restaurant before duplicating a menu.
                        </p>

                        <button
                            type="button"
                            class="owner-empty-create-btn"
                            onclick="openCreateCafePanel()"
                        >
                            <span>＋</span>
                            Create Café
                        </button>

                    </div>
                `
            );

            return;
        }


        const sourceList =
            activeRestaurants
                .map(
                    restaurant => `
                        <button
                            type="button"
                            onclick="selectDuplicateSourceRestaurant(${Number(restaurant.id)})"
                            style="
                                width:100%;
                                min-height:64px;
                                display:flex;
                                align-items:center;
                                justify-content:space-between;
                                gap:15px;
                                padding:12px 15px;
                                margin-bottom:8px;
                                border:1px solid rgba(66,42,27,.10);
                                border-radius:13px;
                                background:#ffffff;
                                color:#2b211b;
                                text-align:left;
                                cursor:pointer;
                            "
                            onmouseover="this.style.background='#fffaf3'"
                            onmouseout="this.style.background='#ffffff'"
                        >

                            <span>

                                <strong
                                    style="
                                        display:block;
                                        color:#21120c;
                                        font-size:12px;
                                    "
                                >
                                    ${escapeHtml(
                                        getRestaurantName(
                                            restaurant
                                        )
                                    )}
                                </strong>

                                <span
                                    style="
                                        display:block;
                                        margin-top:3px;
                                        color:#9b8e84;
                                        font-size:10px;
                                    "
                                >
                                    /${escapeHtml(
                                        getRestaurantSlug(
                                            restaurant
                                        )
                                    )}
                                </span>

                            </span>

                            <span
                                style="
                                    color:#a8792e;
                                    font-size:18px;
                                    font-weight:900;
                                "
                            >
                                →
                            </span>

                        </button>
                    `
                )
                .join('');


        openOwnerActionPanel(
            'Duplicate Café',
            `
                <div
                    style="
                        margin-bottom:18px;
                        color:#766960;
                        font-size:12px;
                        line-height:1.55;
                    "
                >
                    Select the active restaurant whose menu
                    you want to duplicate.
                </div>

                <div>
                    ${sourceList}
                </div>
            `
        );

        return;
    }


    const source =
        duplicateSourceRestaurant;

    const sourceName =
        getRestaurantName(source);

    const sourceSlug =
        getRestaurantSlug(source);

    const suggestedSlug =
        createSlugFromName(
            `${sourceName} Copy`
        );


    const content = `

        <form
            id="ownerDuplicateCafeForm"
            onsubmit="submitDuplicateCafe(event)"
        >

            <div
                style="
                    padding:18px;
                    margin-bottom:3px;
                    border:1px solid rgba(196,150,66,.20);
                    border-radius:15px;
                    background:linear-gradient(
                        135deg,
                        #fff8e9,
                        #fffdf9
                    );
                "
            >

                <div
                    style="
                        color:#805a20;
                        font-size:9px;
                        font-weight:900;
                        letter-spacing:.18em;
                        text-transform:uppercase;
                        margin-bottom:5px;
                    "
                >
                    DUPLICATE RESTAURANT
                </div>

                <div
                    style="
                        color:#21120c;
                        font-family:Georgia,'Times New Roman',serif;
                        font-size:18px;
                        font-weight:700;
                    "
                >
                    Duplicate Café
                </div>

                <div
                    style="
                        margin-top:6px;
                        color:#766960;
                        font-size:11px;
                        line-height:1.5;
                    "
                >
                    Copy the menu structure from
                    <strong>
                        ${escapeHtml(sourceName)}
                    </strong>
                    into a new restaurant.
                </div>

            </div>

            <div
                style="
                    padding:13px 15px;
                    border:1px solid rgba(196,150,66,.16);
                    border-radius:12px;
                    background:#fffaf0;
                    color:#735727;
                    font-size:10px;
                    line-height:1.55;
                "
            >
                Source:
                <strong>
                    ${escapeHtml(sourceName)}
                </strong>
                <br>
                /${escapeHtml(sourceSlug)}
            </div>

            <div class="owner-form-grid">

                <div class="owner-form-field">

                    <label
                        for="ownerDuplicateCafeName"
                        style="
                            display:block;
                            margin-bottom:7px;
                        "
                    >
                        New Café Name
                    </label>

                    <input
                        type="text"
                        id="ownerDuplicateCafeName"
                        value="${escapeHtml(
                            `${sourceName} Copy`
                        )}"
                        required
                    >

                </div>

                <div class="owner-form-field">

                    <label
                        for="ownerDuplicateCafeSlug"
                        style="
                            display:block;
                            margin-bottom:7px;
                        "
                    >
                        Public Slug
                    </label>

                    <input
                        type="text"
                        id="ownerDuplicateCafeSlug"
                        value="${escapeHtml(
                            suggestedSlug
                        )}"
                        required
                    >

                </div>

                <div class="owner-form-field">

                    <label
                        for="ownerDuplicateAdminEmail"
                        style="
                            display:block;
                            margin-bottom:7px;
                        "
                    >
                        Café Admin Email
                    </label>

                    <input
                        type="email"
                        id="ownerDuplicateAdminEmail"
                        placeholder="admin@example.com"
                        autocomplete="email"
                        required
                    >

                </div>

                <div class="owner-form-field">

                    <label
                        for="ownerDuplicateAdminPassword"
                        style="
                            display:block;
                            margin-bottom:7px;
                        "
                    >
                        Initial Password
                    </label>

                    <input
                        type="password"
                        id="ownerDuplicateAdminPassword"
                        placeholder="Minimum 6 characters"
                        autocomplete="new-password"
                        minlength="6"
                        required
                    >

                </div>

            </div>

            <div class="owner-form-actions">

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="closeOwnerActionPanel()"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="owner-action-btn"
                    style="
                        min-height:43px;
                        padding:0 20px;
                        background:#351d12;
                        border-color:#351d12;
                        color:#ffffff;
                    "
                >
                    Duplicate Café
                </button>

            </div>

        </form>
    `;


    openOwnerActionPanel(
        'Duplicate Café',
        content
    );


    requestAnimationFrame(() => {

        const nameInput =
            document.getElementById(
                'ownerDuplicateCafeName'
            );

        const slugInput =
            document.getElementById(
                'ownerDuplicateCafeSlug'
            );

        if (
            nameInput &&
            slugInput
        ) {

            nameInput.addEventListener(
                'input',
                () => {

                    if (
                        !slugInput.dataset.manuallyEdited
                    ) {

                        slugInput.value =
                            createSlugFromName(
                                nameInput.value
                            );
                    }
                }
            );
        }

        if (slugInput) {

            slugInput.addEventListener(
                'input',
                () => {

                    slugInput.dataset.manuallyEdited =
                        'true';
                }
            );
        }
    });
}


function selectDuplicateSourceRestaurant(
    restaurantId
) {

    const restaurant =
        getRestaurantById(
            restaurantId
        );

    if (!restaurant) {

        showOwnerNotification(
            'Restaurant not found',
            'The selected restaurant could not be found.',
            'error'
        );

        return;
    }


    duplicateSourceRestaurant =
        restaurant;

    openDuplicateCafePanel();
}


function updateDuplicateCafeSourceInfo() {

    const source =
        duplicateSourceRestaurant;

    if (!source) return;

    const sourceInfo =
        document.getElementById(
            'duplicateSourceInfo'
        );

    if (!sourceInfo) return;

    sourceInfo.innerHTML = `
        <strong>
            ${escapeHtml(
                getRestaurantName(source)
            )}
        </strong>
        <br>
        /${escapeHtml(
            getRestaurantSlug(source)
        )}
    `;
}


/* ================================================================
   SUBMIT DUPLICATE
   ================================================================ */

async function submitDuplicateCafe(
    event
) {

    event.preventDefault();

    if (!duplicateSourceRestaurant) {

        showOwnerNotification(
            'Source restaurant missing',
            'Please select a restaurant to duplicate.',
            'error'
        );

        return;
    }


    const token =
        getAdminToken();

    if (!token) {

        clearAdminSession();

        window.location.href =
            '/admin.html';

        return;
    }


    const name =
        document
            .getElementById(
                'ownerDuplicateCafeName'
            )
            ?.value
            .trim();


    const slug =
        document
            .getElementById(
                'ownerDuplicateCafeSlug'
            )
            ?.value
            .trim()
            .toLowerCase();


    const adminEmail =
        document
            .getElementById(
                'ownerDuplicateAdminEmail'
            )
            ?.value
            .trim()
            .toLowerCase();


    const adminPassword =
        document
            .getElementById(
                'ownerDuplicateAdminPassword'
            )
            ?.value || '';


    if (!name) {

        showOwnerNotification(
            'Missing café name',
            'Please enter the new restaurant name.',
            'error'
        );

        return;
    }


    if (
        !slug ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            slug
        )
    ) {

        showOwnerNotification(
            'Invalid slug',
            'Use lowercase letters, numbers and hyphens only.',
            'error'
        );

        return;
    }


    if (!adminEmail) {

        showOwnerNotification(
            'Missing admin email',
            'Please enter the café administrator email.',
            'error'
        );

        return;
    }


    if (
        adminPassword.length < 6
    ) {

        showOwnerNotification(
            'Password too short',
            'The administrator password must contain at least 6 characters.',
            'error'
        );

        return;
    }


    await executeDuplicateCafe({
        name,
        slug,
        adminEmail,
        adminPassword
    });
}


/* ================================================================
   EXECUTE DUPLICATE
   ================================================================ */

async function executeDuplicateCafe(
    details
) {

    if (!duplicateSourceRestaurant) {

        showOwnerNotification(
            'Source restaurant missing',
            'Please select a source restaurant.',
            'error'
        );

        return;
    }


    const token =
        getAdminToken();

    if (!token) {

        clearAdminSession();

        window.location.href =
            '/admin.html';

        return;
    }


    const sourceSlug =
        getRestaurantSlug(
            duplicateSourceRestaurant
        );


    showOwnerLoading(
        'Copying restaurant menu...'
    );


    try {

        const menuResponse =
            await fetch(
                `/api/menu/${encodeURIComponent(sourceSlug)}`,
                {
                    method:'GET',

                    headers:{
                        Accept:
                            'application/json',

                        Authorization:
                            `Bearer ${token}`
                    },

                    credentials:
                        'same-origin',

                    cache:
                        'no-store'
                }
            );


        const menuData =
            await readOwnerApiResponse(
                menuResponse
            );


        const menu =
            (
                menuData &&
                menuData.menu &&
                typeof menuData.menu === 'object' &&
                !Array.isArray(menuData.menu)
            )
                ? menuData.menu
                : (
                    duplicateSourceRestaurant.menu ||
                    {}
                );


        const createResponse =
            await fetch(
                '/api/owner/restaurants',
                {
                    method:'POST',

                    headers:{
                        Authorization:
                            `Bearer ${token}`,

                        'Content-Type':
                            'application/json',

                        Accept:
                            'application/json'
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({
                            name:
                                details.name,

                            slug:
                                details.slug,

                            adminEmail:
                                details.adminEmail,

                            adminPassword:
                                details.adminPassword
                        })
                }
            );


        const createData =
            await readOwnerApiResponse(
                createResponse
            );


        const newRestaurant =
            createData.restaurant ||
            createData;


        const newSlug =
            newRestaurant.slug ||
            details.slug;


        if (
            menu &&
            typeof menu === 'object'
        ) {

            const menuSaveResponse =
                await fetch(
                    `/api/admin/menu/${encodeURIComponent(newSlug)}`,
                    {
                        method:'POST',

                        headers:{
                            Authorization:
                                `Bearer ${token}`,

                            'Content-Type':
                                'application/json',

                            Accept:
                                'application/json'
                        },

                        credentials:
                            'same-origin',

                        body:
                            JSON.stringify({
                                menu
                            })
                    }
                );


            await readOwnerApiResponse(
                menuSaveResponse
            );
        }


        duplicateSourceRestaurant =
            null;


        closeOwnerActionPanel();

        await loadOwnerCafes();


        showOwnerNotification(
            'Café duplicated',
            createData.message ||
                `${details.name} was created successfully with the copied menu.`,
            'success'
        );


    } catch (error) {

        console.error(
            '[super-admin] Duplicate café failed:',
            error
        );

        showOwnerNotification(
            'Unable to duplicate café',
            error.message ||
                'Please try again.',
            'error'
        );


    } finally {

        hideOwnerLoading();

        cleanupOwnerVisualState();
    }
}


/* ================================================================
   PRICE MANAGEMENT — RESTAURANT SELECTOR
   ================================================================ */

async function openPriceManagementForRestaurant(
    restaurantId
) {

    const restaurant =
        getRestaurantById(
            restaurantId
        );

    if (!restaurant) {

        showOwnerNotification(
            'Restaurant not found',
            'The selected restaurant could not be found.',
            'error'
        );

        return;
    }


    if (
        !isRestaurantActive(
            restaurant
        )
    ) {

        showOwnerNotification(
            'Restaurant is disabled',
            'Enable the restaurant before managing its prices.',
            'error'
        );

        return;
    }


    await openPriceEditorForCafe(
        restaurant
    );
}


function openPriceManagementPanel() {

    closeSuperAdminMenu();


    const activeRestaurants =
        ownerRestaurantsData.filter(
            restaurant =>
                isRestaurantActive(
                    restaurant
                )
        );


    if (
        activeRestaurants.length === 0
    ) {

        openOwnerActionPanel(
            'Price Management',
            `
                <div class="owner-empty-state">

                    <div class="owner-empty-icon">
                        %
                    </div>

                    <h3 class="owner-empty-title">
                        No Active Restaurants
                    </h3>

                    <p class="owner-empty-text">
                        Create or enable a restaurant before managing prices.
                    </p>

                    <button
                        type="button"
                        class="owner-empty-create-btn"
                        onclick="openCreateCafePanel()"
                    >
                        <span>＋</span>
                        Create Café
                    </button>

                </div>
            `
        );

        return;
    }


    const list =
        activeRestaurants
            .map(
                restaurant => `
                    <button
                        type="button"
                        onclick="openPriceManagementForRestaurant(${Number(restaurant.id)})"
                        style="
                            width:100%;
                            min-height:64px;
                            display:flex;
                            align-items:center;
                            justify-content:space-between;
                            gap:15px;
                            padding:12px 15px;
                            margin-bottom:8px;
                            border:1px solid rgba(66,42,27,.10);
                            border-radius:13px;
                            background:#ffffff;
                            color:#2b211b;
                            text-align:left;
                            cursor:pointer;
                        "
                        onmouseover="this.style.background='#fffaf3'"
                        onmouseout="this.style.background='#ffffff'"
                    >

                        <span>

                            <strong
                                style="
                                    display:block;
                                    color:#21120c;
                                    font-size:12px;
                                "
                            >
                                ${escapeHtml(
                                    getRestaurantName(
                                        restaurant
                                    )
                                )}
                            </strong>

                            <span
                                style="
                                    display:block;
                                    margin-top:3px;
                                    color:#9b8e84;
                                    font-size:10px;
                                "
                            >
                                /${escapeHtml(
                                    getRestaurantSlug(
                                        restaurant
                                    )
                                )}
                            </span>

                        </span>

                        <span
                            style="
                                color:#a8792e;
                                font-size:18px;
                                font-weight:900;
                            "
                        >
                            →
                        </span>

                    </button>
                `
            )
            .join('');


    openOwnerActionPanel(
        'Price Management',
        `
            <div
                style="
                    margin-bottom:18px;
                    color:#766960;
                    font-size:12px;
                    line-height:1.55;
                "
            >
                Select the active restaurant whose menu prices you want to manage.
            </div>

            <div>
                ${list}
            </div>
        `
    );
}


/* ================================================================
   LOAD PRICE EDITOR
   ================================================================ */

async function openPriceEditorForCafe(
    restaurant
) {

    if (!restaurant) return;


    priceManagementRestaurant =
        restaurant;

    priceManagementSearch =
        '';

    priceManagementSelectedItems =
        new Set();


    /*
     * Always reset to increase when opening a new restaurant.
     */

    ownerPriceOperation =
        'increase';

    window.ownerPriceOperation =
        'increase';


    showOwnerLoading(
        'Loading menu prices...'
    );


    try {

        const token =
            getAdminToken();


        if (!token) {

            clearAdminSession();

            window.location.href =
                '/admin.html';

            return;
        }


        const slug =
            getRestaurantSlug(
                restaurant
            );


        const response =
            await fetch(
                `/api/menu/${encodeURIComponent(slug)}`,
                {
                    method:'GET',

                    headers:{
                        Accept:
                            'application/json',

                        Authorization:
                            `Bearer ${token}`
                    },

                    credentials:
                        'same-origin',

                    cache:
                        'no-store'
                }
            );


        const data =
            await readOwnerApiResponse(
                response
            );


        const serverMenu =
            data?.menu;


        if (
            serverMenu &&
            typeof serverMenu === 'object' &&
            !Array.isArray(serverMenu)
        ) {

            priceManagementMenu =
                serverMenu;

        } else if (
            restaurant.menu &&
            typeof restaurant.menu === 'object' &&
            !Array.isArray(restaurant.menu)
        ) {

            priceManagementMenu =
                restaurant.menu;

        } else {

            priceManagementMenu =
                {};
        }


        openOwnerActionPanel(
            `Price Management · ${getRestaurantName(restaurant)}`,
            renderPriceManagementForm()
        );


        setupPriceManagementEvents();

        updatePriceManagementUI();


    } catch (error) {

        console.error(
            '[super-admin] Price management load failed:',
            error
        );

        showOwnerNotification(
            'Unable to load menu',
            error.message ||
                'The restaurant menu could not be loaded.',
            'error'
        );


    } finally {

        hideOwnerLoading();
    }
}


/* ================================================================
   PRICE FORM
   ================================================================ */

function renderPriceManagementForm() {

    return `

        <div class="price-management">

            <div class="price-management-hero">

                <div class="price-management-icon">
                    %
                </div>

                <span class="price-management-eyebrow">
                    PRICE CONTROL
                </span>

                <div
                    style="
                        font-family:Georgia,'Times New Roman',serif;
                        font-size:21px;
                        font-weight:600;
                    "
                >
                    Manage Menu Prices
                </div>

                <div
                    style="
                        margin-top:7px;
                        color:rgba(255,255,255,.65);
                        font-size:11px;
                        line-height:1.5;
                    "
                >
                    Apply a percentage increase or decrease to selected menu items.
                </div>

            </div>


            <div class="price-summary-strip">

                <div class="price-step">

                    <div
                        style="
                            color:#9b8e84;
                            font-size:9px;
                            font-weight:900;
                            text-transform:uppercase;
                        "
                    >
                        Restaurant
                    </div>

                    <div
                        id="priceRestaurantName"
                        style="
                            margin-top:6px;
                            color:#21120c;
                            font-size:12px;
                            font-weight:850;
                        "
                    >
                        ${escapeHtml(
                            getRestaurantName(
                                priceManagementRestaurant
                            )
                        )}
                    </div>

                </div>


                <div class="price-step">

                    <div
                        style="
                            color:#9b8e84;
                            font-size:9px;
                            font-weight:900;
                            text-transform:uppercase;
                        "
                    >
                        Selected
                    </div>

                    <div
                        id="priceSelectedCount"
                        style="
                            margin-top:6px;
                            color:#21120c;
                            font-size:18px;
                            font-weight:850;
                        "
                    >
                        0
                    </div>

                </div>


                <div class="price-step">

                    <div
                        style="
                            color:#9b8e84;
                            font-size:9px;
                            font-weight:900;
                            text-transform:uppercase;
                        "
                    >
                        Menu Items
                    </div>

                    <div
                        id="priceTotalCount"
                        style="
                            margin-top:6px;
                            color:#21120c;
                            font-size:18px;
                            font-weight:850;
                        "
                    >
                        0
                    </div>

                </div>

            </div>


            <div class="price-form-section">

                <div class="price-section-heading">
                    <span class="price-section-number">1</span>
                    Price Operation
                </div>

                <div
                    class="price-operation-toggle"
                    id="priceOperationToggle"
                >

                    <button
                        type="button"
                        class="price-operation-option"
                        data-operation="increase"
                    >
                        ↑ Increase Prices
                    </button>

                    <button
                        type="button"
                        class="price-operation-option"
                        data-operation="decrease"
                    >
                        ↓ Decrease Prices
                    </button>

                </div>

            </div>


            <div class="price-form-section">

                <div class="price-section-heading">
                    <span class="price-section-number">2</span>
                    Percentage
                </div>

                <div class="price-percentage-row">

                    <div class="percentage-input-wrap">

                        <input
                            type="number"
                            id="pricePercentage"
                            min="0"
                            max="100"
                            step="0.1"
                            value="10"
                            placeholder="10"
                        >

                        <span
                            style="
                                position:absolute;
                                right:13px;
                                top:50%;
                                transform:translateY(-50%);
                                color:#9b8e84;
                                font-weight:800;
                            "
                        >
                            %
                        </span>

                    </div>

                    <div
                        style="
                            color:#766960;
                            font-size:11px;
                        "
                    >
                        Enter the percentage to apply.
                    </div>

                </div>

            </div>


            <div class="price-form-section">

                <div class="price-section-heading">
                    <span class="price-section-number">3</span>
                    Select Items
                </div>

                <div class="price-items-toolbar">

                    <div class="price-search-wrap">

                        <input
                            type="search"
                            id="priceItemSearch"
                            placeholder="Search menu item..."
                            autocomplete="off"
                        >

                    </div>

                    <button
                        type="button"
                        class="restaurant-action-btn"
                        id="priceSelectAllBtn"
                    >
                        Select All
                    </button>

                </div>

                <div
                    id="priceItemsList"
                    class="price-items-list"
                >
                </div>

            </div>


            <div
                id="pricePreview"
                class="price-preview"
            >
            </div>


            <div class="price-warning-box">

                Price changes will be saved to the selected
                restaurant's menu. Review the preview before applying.

            </div>


            <div class="owner-form-actions">

                <button
                    type="button"
                    class="restaurant-action-btn"
                    onclick="closeOwnerActionPanel()"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="owner-action-btn"
                    onclick="confirmPriceManagement()"
                    style="
                        min-height:43px;
                        padding:0 20px;
                        background:#351d12;
                        border-color:#351d12;
                        color:#fff;
                    "
                >
                    Apply Price Changes
                </button>

            </div>

        </div>
    `;
}


function formatPriceCategoryName(
    name
) {

    return String(name || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}


/* ================================================================
   PRICE EVENTS
   ================================================================ */

function setupPriceManagementEvents() {

    document
        .querySelectorAll(
            '#priceOperationToggle [data-operation]'
        )
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    document
                        .querySelectorAll(
                            '#priceOperationToggle [data-operation]'
                        )
                        .forEach(item =>
                            item.classList.remove(
                                'active'
                            )
                        );


                    button.classList.add(
                        'active'
                    );


                    ownerPriceOperation =
                        button.dataset.operation ===
                            'decrease'
                            ? 'decrease'
                            : 'increase';


                    /*
                     * Keep compatibility with the previous code.
                     */

                    window.ownerPriceOperation =
                        ownerPriceOperation;


                    updatePricePreview();
                }
            );
        });


    const defaultOperation =
        document.querySelector(
            '#priceOperationToggle [data-operation="increase"]'
        );


    if (defaultOperation) {

        defaultOperation.classList.add(
            'active'
        );

        ownerPriceOperation =
            'increase';

        window.ownerPriceOperation =
            'increase';
    }


    const search =
        document.getElementById(
            'priceItemSearch'
        );


    if (search) {

        search.addEventListener(
            'input',
            () => {

                priceManagementSearch =
                    search.value
                        .trim()
                        .toLowerCase();

                renderPriceItemsList();
            }
        );
    }


    const percentage =
        document.getElementById(
            'pricePercentage'
        );


    if (percentage) {

        percentage.addEventListener(
            'input',
            updatePricePreview
        );
    }


    const selectAll =
        document.getElementById(
            'priceSelectAllBtn'
        );


    if (selectAll) {

        selectAll.addEventListener(
            'click',
            toggleAllPriceItems
        );
    }
}


/* ================================================================
   PRICE UI
   ================================================================ */

function updatePriceManagementUI() {

    renderPriceItemsList();

    updateSelectedPriceCount();

    updatePricePreview();
}


function getAllPriceItems() {

    const items = [];

    const menu =
        priceManagementMenu || {};


    Object.entries(menu).forEach(
        ([category, categoryItems]) => {

            if (
                !Array.isArray(
                    categoryItems
                )
            ) {
                return;
            }


            categoryItems.forEach(
                (item,index) => {

                    if (!item) return;


                    items.push({
                        key:
                            `${category}::${index}`,

                        category,

                        index,

                        item
                    });
                }
            );
        }
    );


    return items;
}


function getPriceItemName(
    item
) {

    if (!item) {
        return 'Menu Item';
    }


    return (
        item.name ||
        item.title ||
        item.itemName ||
        'Menu Item'
    );
}


function getPriceItemPrice(
    item
) {

    const number =
        Number(
            item?.price
        );


    return Number.isFinite(number)
        ? number
        : 0;
}


/* ================================================================
   PRICE LIST
   ================================================================ */

function renderPriceItemsList() {

    const container =
        document.getElementById(
            'priceItemsList'
        );


    if (!container) return;


    const allItems =
        getAllPriceItems();


    const filtered =
        allItems.filter(
            entry => {

                if (
                    !priceManagementSearch
                ) {
                    return true;
                }


                const name =
                    getPriceItemName(
                        entry.item
                    )
                        .toLowerCase();


                const category =
                    formatPriceCategoryName(
                        entry.category
                    )
                        .toLowerCase();


                return (
                    name.includes(
                        priceManagementSearch
                    ) ||
                    category.includes(
                        priceManagementSearch
                    )
                );
            }
        );


    if (
        filtered.length === 0
    ) {

        container.innerHTML = `

            <div
                style="
                    padding:30px 18px;
                    text-align:center;
                    color:#9b8e84;
                    font-size:11px;
                "
            >
                No menu items found.
            </div>
        `;


        updateSelectedPriceCount();

        return;
    }


    container.innerHTML =
        filtered
            .map(
                entry => {

                    const key =
                        entry.key;


                    const selected =
                        priceManagementSelectedItems
                            .has(key);


                    const name =
                        getPriceItemName(
                            entry.item
                        );


                    const price =
                        getPriceItemPrice(
                            entry.item
                        );


                    return `

                        <label
                            class="price-item-checkbox"
                        >

                            <input
                                type="checkbox"
                                class="price-item-check"
                                data-price-key="${escapeHtml(key)}"
                                ${selected ? 'checked' : ''}
                            >

                            <span class="price-item-info">

                                <span
                                    style="
                                        display:block;
                                        color:#2b211b;
                                        font-size:11px;
                                        font-weight:800;
                                    "
                                >
                                    ${escapeHtml(name)}
                                </span>

                                <span
                                    class="price-item-current"
                                >
                                    ${escapeHtml(
                                        formatPriceCategoryName(
                                            entry.category
                                        )
                                    )}
                                    ·
                                    ${formatETB(price)}
                                </span>

                            </span>

                        </label>
                    `;
                }
            )
            .join('');


    container
        .querySelectorAll(
            '.price-item-check'
        )
        .forEach(checkbox => {

            checkbox.addEventListener(
                'change',
                () => {

                    const key =
                        checkbox.dataset.priceKey;


                    if (
                        checkbox.checked
                    ) {

                        priceManagementSelectedItems
                            .add(key);

                    } else {

                        priceManagementSelectedItems
                            .delete(key);
                    }


                    updateSelectedPriceCount();

                    updatePricePreview();
                }
            );
        });


    updateSelectedPriceCount();
}


/* ================================================================
   PRICE SELECTION COUNT
   ================================================================ */

function updateSelectedPriceCount() {

    const count =
        document.getElementById(
            'priceSelectedCount'
        );


    const total =
        document.getElementById(
            'priceTotalCount'
        );


    if (count) {

        count.textContent =
            priceManagementSelectedItems.size;
    }


    if (total) {

        total.textContent =
            getAllPriceItems().length;
    }


    const selectAll =
        document.getElementById(
            'priceSelectAllBtn'
        );


    if (selectAll) {

        const totalItems =
            getAllPriceItems().length;


        const selectedCount =
            priceManagementSelectedItems.size;


        selectAll.textContent =
            totalItems > 0 &&
            selectedCount === totalItems
                ? 'Clear All'
                : 'Select All';
    }
}


/* ================================================================
   SELECT ALL
   ================================================================ */

function toggleAllPriceItems() {

    const allItems =
        getAllPriceItems();


    if (
        allItems.length === 0
    ) {
        return;
    }


    const allSelected =
        allItems.every(
            item =>
                priceManagementSelectedItems
                    .has(item.key)
        );


    if (allSelected) {

        priceManagementSelectedItems
            .clear();

    } else {

        allItems.forEach(
            item =>
                priceManagementSelectedItems
                    .add(item.key)
        );
    }


    renderPriceItemsList();

    updateSelectedPriceCount();

    updatePricePreview();
}


/* ================================================================
   SELECTED ITEMS
   ================================================================ */

function getSelectedPriceItems() {

    return getAllPriceItems()
        .filter(
            item =>
                priceManagementSelectedItems
                    .has(item.key)
        );
}


/* ================================================================
   CALCULATE PRICE
   ================================================================ */

function calculateNewPrice(
    oldPrice,
    operation,
    percentage
) {

    const oldValue =
        Number(oldPrice);


    const percent =
        Number(percentage);


    if (
        !Number.isFinite(oldValue) ||
        !Number.isFinite(percent)
    ) {

        return oldValue;
    }


    const multiplier =
        operation === 'decrease'
            ? 1 - percent / 100
            : 1 + percent / 100;


    return Math.max(
        0,
        oldValue * multiplier
    );
}


/* ================================================================
   PRICE PREVIEW
   ================================================================ */

function updatePricePreview() {

    const preview =
        document.getElementById(
            'pricePreview'
        );


    if (!preview) return;


    const selected =
        getSelectedPriceItems();


    const percentage =
        Number(
            document.getElementById(
                'pricePercentage'
            )?.value || 0
        );


    const activeOperation =
        document.querySelector(
            '#priceOperationToggle [data-operation].active'
        )?.dataset.operation;


    const operation =
        activeOperation === 'decrease'
            ? 'decrease'
            : (
                ownerPriceOperation === 'decrease'
                    ? 'decrease'
                    : 'increase'
            );


    ownerPriceOperation =
        operation;

    window.ownerPriceOperation =
        operation;


    if (
        selected.length === 0
    ) {

        preview.innerHTML = `

            <div
                class="price-preview-summary"
            >
                Select menu items to preview price changes.
            </div>
        `;

        return;
    }


    const previewItems =
        selected.slice(
            0,
            8
        );


    preview.innerHTML = `

        <div
            class="price-preview-summary"
        >
            ${
                operation === 'increase'
                    ? 'Increase'
                    : 'Decrease'
            }
            selected prices by
            ${
                Number.isFinite(
                    percentage
                )
                    ? percentage
                    : 0
            }%
        </div>


        <div class="price-preview-list">

            ${
                previewItems
                    .map(
                        entry => {

                            const oldPrice =
                                getPriceItemPrice(
                                    entry.item
                                );


                            const newPrice =
                                calculateNewPrice(
                                    oldPrice,
                                    operation,
                                    percentage
                                );


                            return `

                                <div
                                    class="price-preview-row"
                                >

                                    <span>
                                        <strong>
                                            ${escapeHtml(
                                                getPriceItemName(
                                                    entry.item
                                                )
                                            )}
                                        </strong>
                                    </span>

                                    <span>

                                        <span
                                            class="price-preview-old"
                                        >
                                            ${formatETB(
                                                oldPrice
                                            )}
                                        </span>

                                        &nbsp;→&nbsp;

                                        <span
                                            class="price-preview-new"
                                        >
                                            ${formatETB(
                                                newPrice
                                            )}
                                        </span>

                                    </span>

                                </div>
                            `;
                        }
                    )
                    .join('')
            }

        </div>


        ${
            selected.length > 8
                ? `
                    <div
                        class="price-preview-more"
                        style="margin-top:8px;"
                    >
                        + ${selected.length - 8}
                        more selected items
                    </div>
                `
                : ''
        }
    `;
}


/* ================================================================
   CONFIRM PRICE MANAGEMENT
   ================================================================ */

function confirmPriceManagement() {

    const selected =
        getSelectedPriceItems();


    if (
        selected.length === 0
    ) {

        showOwnerNotification(
            'No items selected',
            'Select at least one menu item.',
            'error'
        );

        return;
    }


    const percentage =
        Number(
            document.getElementById(
                'pricePercentage'
            )?.value || 0
        );


    if (
        !Number.isFinite(percentage) ||
        percentage <= 0 ||
        percentage > 100
    ) {

        showOwnerNotification(
            'Invalid percentage',
            'Enter a percentage between 0 and 100.',
            'error'
        );

        return;
    }


    const activeOperation =
        document.querySelector(
            '#priceOperationToggle [data-operation].active'
        )?.dataset.operation;


    const operation =
        activeOperation === 'decrease'
            ? 'decrease'
            : (
                ownerPriceOperation === 'decrease'
                    ? 'decrease'
                    : 'increase'
            );


    ownerPriceOperation =
        operation;

    window.ownerPriceOperation =
        operation;


    const summary =
        `
            ${
                operation === 'increase'
                    ? 'Increase'
                    : 'Decrease'
            }
            ${selected.length} menu item${
                selected.length === 1
                    ? ''
                    : 's'
            }
            by ${percentage}%?
        `;


    const content = `

        <div class="price-confirmation">

            <div class="price-confirmation-icon">
                ✓
            </div>

            <div class="price-confirmation-eyebrow">
                Review Changes
            </div>

            <div class="price-confirmation-summary">
                ${escapeHtml(summary)}
            </div>

            <div class="price-confirmation-warning">
                This will update the selected restaurant's menu prices.
            </div>

        </div>


        <div
            style="
                margin-top:18px;
                padding:14px;
                border:1px solid rgba(196,150,66,.16);
                border-radius:12px;
                background:#fffaf0;
                color:#735727;
                font-size:10px;
                line-height:1.55;
            "
        >
            Restaurant:
            <strong>
                ${escapeHtml(
                    getRestaurantName(
                        priceManagementRestaurant
                    )
                )}
            </strong>
        </div>


        <div class="owner-form-actions"
             style="margin-top:18px;">

            <button
                type="button"
                class="restaurant-action-btn"
                onclick="openPriceEditorForCafe(priceManagementRestaurant)"
            >
                Back
            </button>


            <button
                type="button"
                class="owner-action-btn"
                onclick="applyPriceManagement()"
                style="
                    min-height:43px;
                    padding:0 20px;
                    background:#28734b;
                    border-color:#28734b;
                    color:#fff;
                "
            >
                Confirm & Save
            </button>

        </div>
    `;


    openOwnerActionPanel(
        'Confirm Price Changes',
        content
    );
}


/* ================================================================
   APPLY PRICE MANAGEMENT
   ================================================================ */

async function applyPriceManagement() {

    const restaurant =
        priceManagementRestaurant;


    if (!restaurant) {

        showOwnerNotification(
            'Restaurant missing',
            'The selected restaurant could not be found.',
            'error'
        );

        return;
    }


    const slug =
        getRestaurantSlug(
            restaurant
        );


    const selected =
        getSelectedPriceItems();


    const percentage =
        Number(
            document.getElementById(
                'pricePercentage'
            )?.value || 0
        );


    const activeOperation =
        document.querySelector(
            '#priceOperationToggle [data-operation].active'
        )?.dataset.operation;


    const operation =
        activeOperation === 'decrease'
            ? 'decrease'
            : (
                ownerPriceOperation === 'decrease'
                    ? 'decrease'
                    : 'increase'
            );


    ownerPriceOperation =
        operation;

    window.ownerPriceOperation =
        operation;


    if (
        selected.length === 0
    ) {

        showOwnerNotification(
            'No items selected',
            'No menu items were selected.',
            'error'
        );

        return;
    }


    if (
        !Number.isFinite(percentage) ||
        percentage <= 0 ||
        percentage > 100
    ) {

        showOwnerNotification(
            'Invalid percentage',
            'Enter a percentage between 0 and 100.',
            'error'
        );

        return;
    }


    const token =
        getAdminToken();


    if (!token) {

        clearAdminSession();

        window.location.href =
            '/admin.html';

        return;
    }


    /*
     * Deep copy the complete menu.
     */

    let updatedMenu;

    try {

        updatedMenu =
            JSON.parse(
                JSON.stringify(
                    priceManagementMenu || {}
                )
            );

    } catch (error) {

        showOwnerNotification(
            'Menu error',
            'The menu data could not be prepared for saving.',
            'error'
        );

        return;
    }


    let updatedCount =
        0;


    selected.forEach(
        entry => {

            const category =
                updatedMenu[
                    entry.category
                ];


            if (
                !Array.isArray(
                    category
                )
            ) {
                return;
            }


            const item =
                category[
                    entry.index
                ];


            if (!item) {
                return;
            }


            const oldPrice =
                getPriceItemPrice(
                    item
                );


            const newPrice =
                calculateNewPrice(
                    oldPrice,
                    operation,
                    percentage
                );


            item.price =
                Number(
                    newPrice.toFixed(2)
                );


            updatedCount++;
        }
    );


    if (
        updatedCount === 0
    ) {

        showOwnerNotification(
            'Nothing to update',
            'The selected menu items could not be found.',
            'error'
        );

        return;
    }


    showOwnerLoading(
        'Saving price changes...'
    );


    try {

        const response =
            await fetch(
                `/api/admin/menu/${encodeURIComponent(slug)}`,
                {
                    method:'POST',

                    headers:{
                        Authorization:
                            `Bearer ${token}`,

                        'Content-Type':
                            'application/json',

                        Accept:
                            'application/json'
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({
                            menu:
                                updatedMenu
                        })
                }
            );


        const data =
            await readOwnerApiResponse(
                response
            );


        /*
         * Update local price-management state.
         */

        priceManagementMenu =
            updatedMenu;


        /*
         * Close modal before dashboard refresh.
         */

        closeOwnerActionPanel();


        /*
         * Refresh dashboard independently.
         */

        await loadOwnerCafes();


        showOwnerNotification(
            'Prices updated',
            data.message ||
                `${updatedCount} menu item${
                    updatedCount === 1
                        ? ''
                        : 's'
                } updated successfully.`,
            'success'
        );


    } catch (error) {

        console.error(
            '[super-admin] Price update failed:',
            error
        );


        /*
         * Keep confirmation/modal closed only if it was already
         * closed. On error the dashboard remains usable.
         */

        showOwnerNotification(
            'Unable to save prices',
            error.message ||
                'Please try again.',
            'error'
        );


    } finally {

        hideOwnerLoading();

        cleanupOwnerVisualState();
    }
}


/* ================================================================
   PUBLIC CUSTOMER MENU
   ================================================================ */

function manageOwnerCafeMenu(
    slug
) {

    if (!slug) {

        showOwnerNotification(
            'Menu unavailable',
            'This restaurant does not have a valid public slug.',
            'error'
        );

        return;
    }


    window.open(
        `/${encodeURIComponent(slug)}`,
        '_blank',
        'noopener,noreferrer'
    );
}


/* ================================================================
   COMPANY PROFILE
   ================================================================ */

function openCompanyProfile() {

    closeSuperAdminMenu();

    cleanupOwnerVisualState();

    window.location.href =
        '/';
}


/* ================================================================
   NOTIFICATIONS
   ================================================================ */

function showOwnerNotification(
    title,
    message,
    type = 'info'
) {

    /*
     * Support:
     *
     * showOwnerNotification("message", "error")
     */

    if (
        (
            message === 'success' ||
            message === 'error' ||
            message === 'warning' ||
            message === 'info'
        ) &&
        type === 'info'
    ) {

        type =
            message;

        message =
            title;

        title =
            type === 'error'
                ? 'Something went wrong'
                : type === 'success'
                    ? 'Success'
                    : 'Notice';
    }


    const notification =
        document.getElementById(
            'ownerTopNotification'
        );


    if (!notification) {

        showDynamicOwnerNotification(
            title,
            message,
            type
        );

        return;
    }


    const icon =
        document.getElementById(
            'ownerNotificationIcon'
        );


    const titleElement =
        document.getElementById(
            'ownerNotificationTitle'
        );


    const messageElement =
        document.getElementById(
            'ownerNotificationMessage'
        );


    if (titleElement) {

        titleElement.textContent =
            title || 'Notice';
    }


    if (messageElement) {

        messageElement.textContent =
            message || '';
    }


    if (icon) {

        if (
            type === 'success'
        ) {

            icon.textContent =
                '✓';

        } else if (
            type === 'error'
        ) {

            icon.textContent =
                '!';

        } else if (
            type === 'warning'
        ) {

            icon.textContent =
                '!';

        } else {

            icon.textContent =
                'i';
        }


        icon.style.background =
            type === 'error'
                ? '#fbeceb'
                : type === 'warning'
                    ? '#fff3d8'
                    : type === 'success'
                        ? '#eaf6ee'
                        : '#edf3fa';


        icon.style.color =
            type === 'error'
                ? '#ae4941'
                : type === 'warning'
                    ? '#805a20'
                    : type === 'success'
                        ? '#28734b'
                        : '#496d9a';
    }


    notification.classList.add(
        'show'
    );


    clearTimeout(
        ownerNotificationTimer
    );


    ownerNotificationTimer =
        setTimeout(
            closeOwnerNotification,
            4500
        );
}


function showDynamicOwnerNotification(
    title,
    message,
    type
) {

    let notification =
        document.getElementById(
            'ownerDynamicNotification'
        );


    if (!notification) {

        notification =
            document.createElement(
                'div'
            );


        notification.id =
            'ownerDynamicNotification';


        notification.style.cssText = `
            position:fixed;
            top:20px;
            left:50%;
            transform:translate(-50%,-20px);
            z-index:9999999;
            width:min(510px,calc(100vw - 30px));
            padding:16px 18px;
            border-radius:16px;
            background:#21120c;
            color:#fff;
            box-shadow:0 25px 70px rgba(0,0,0,.25);
            opacity:0;
            transition:all .25s ease;
        `;


        document.body.appendChild(
            notification
        );
    }


    notification.innerHTML = `

        <div
            style="
                font-weight:850;
                font-size:12px;
            "
        >
            ${escapeHtml(title)}
        </div>

        <div
            style="
                margin-top:4px;
                color:rgba(255,255,255,.68);
                font-size:11px;
                line-height:1.45;
            "
        >
            ${escapeHtml(message)}
        </div>
    `;


    requestAnimationFrame(
        () => {

            notification.style.opacity =
                '1';

            notification.style.transform =
                'translate(-50%,0)';
        }
    );


    clearTimeout(
        ownerNotificationTimer
    );


    ownerNotificationTimer =
        setTimeout(
            () => {

                notification.style.opacity =
                    '0';

                notification.style.transform =
                    'translate(-50%,-20px)';

            },
            4500
        );
}


function closeOwnerNotification() {

    const notification =
        document.getElementById(
            'ownerTopNotification'
        );


    if (notification) {

        notification.classList.remove(
            'show',
            'active',
            'visible'
        );
    }


    const dynamic =
        document.getElementById(
            'ownerDynamicNotification'
        );


    if (dynamic) {

        dynamic.style.opacity =
            '0';

        dynamic.style.transform =
            'translate(-50%,-20px)';
    }


    clearTimeout(
        ownerNotificationTimer
    );
}


/* ================================================================
   ACTION BACKDROP
   ================================================================ */

function ensureOwnerActionBackdrop() {

    let backdrop =
        document.getElementById(
            'ownerActionBackdrop'
        );


    if (!backdrop) {

        backdrop =
            document.createElement(
                'div'
            );


        backdrop.id =
            'ownerActionBackdrop';


        backdrop.setAttribute(
            'aria-hidden',
            'true'
        );


        backdrop.addEventListener(
            'click',
            event => {

                if (
                    event.target ===
                    backdrop
                ) {

                    closeOwnerActionPanel();
                }
            }
        );


        document.body.appendChild(
            backdrop
        );
    }


    return backdrop;
}


/* ================================================================
   OPEN ACTION PANEL
   ================================================================ */

function openOwnerActionPanel(
    title,
    content
) {

    ensureSuperAdminRuntimeStyles();


    /*
     * Remove only stale backdrops.
     *
     * Do NOT remove the active loading overlay here because
     * some actions open a modal while loading finishes.
     */

    document
        .querySelectorAll(
            '#ownerActionBackdrop'
        )
        .forEach(
            oldBackdrop =>
                oldBackdrop.remove()
        );


    const panel =
        document.getElementById(
            'ownerActionPanel'
        );


    if (!panel) {

        console.error(
            '[super-admin] ownerActionPanel not found.'
        );

        return;
    }


    const titleElement =
        document.getElementById(
            'ownerActionTitle'
        );


    const contentElement =
        document.getElementById(
            'ownerActionContent'
        );


    if (
        !titleElement ||
        !contentElement
    ) {

        console.error(
            '[super-admin] Action panel elements missing.'
        );

        return;
    }


    /*
     * Store focus only when opening a completely new modal.
     */

    if (
        !panel.classList.contains('show') &&
        !panel.classList.contains('active') &&
        !panel.classList.contains('open')
    ) {

        ownerPreviousFocus =
            document.activeElement;
    }


    titleElement.textContent =
        title ||
        'Restaurant Action';


    contentElement.innerHTML =
        content ||
        '';


    /*
     * Move panel directly under body.
     */

    if (
        panel.parentElement !==
        document.body
    ) {

        document.body.appendChild(
            panel
        );
    }


    const backdrop =
        ensureOwnerActionBackdrop();


    /*
     * Fixed centered modal.
     */

    Object.assign(
        panel.style,
        {
            position:'fixed',
            top:'50%',
            left:'50%',
            right:'auto',
            bottom:'auto',

            transform:
                'translate(-50%, -50%)',

            width:
                'min(850px, calc(100vw - 32px))',

            maxWidth:
                'calc(100vw - 32px)',

            height:'auto',

            maxHeight:
                'calc(100vh - 32px)',

            margin:'0',
            padding:'0',

            flexDirection:'column',

            overflow:'hidden',

            zIndex:'99999'
        }
    );


    panel.style.setProperty(
        'display',
        'flex',
        'important'
    );


    panel.style.setProperty(
        'visibility',
        'visible',
        'important'
    );


    panel.style.setProperty(
        'opacity',
        '1',
        'important'
    );


    panel.style.setProperty(
        'pointer-events',
        'auto',
        'important'
    );


    /*
     * Content.
     */

    Object.assign(
        contentElement.style,
        {
            display:'block',
            visibility:'visible',
            opacity:'1',
            width:'100%',
            maxWidth:'none',
            margin:'0',
            overflowY:'auto',
            overflowX:'hidden',
            boxSizing:'border-box'
        }
    );


    /*
     * Backdrop.
     */

    backdrop.style.setProperty(
        'position',
        'fixed',
        'important'
    );

    backdrop.style.setProperty(
        'inset',
        '0',
        'important'
    );

    backdrop.style.setProperty(
        'display',
        'block',
        'important'
    );

    backdrop.style.setProperty(
        'visibility',
        'visible',
        'important'
    );

    backdrop.style.setProperty(
        'opacity',
        '1',
        'important'
    );

    backdrop.style.setProperty(
        'pointer-events',
        'auto',
        'important'
    );

    backdrop.style.setProperty(
        'z-index',
        '99998',
        'important'
    );


    /*
     * Open.
     */

    panel.classList.add(
        'show',
        'active',
        'open'
    );


    panel.setAttribute(
        'aria-hidden',
        'false'
    );


    backdrop.setAttribute(
        'aria-hidden',
        'false'
    );


    document.body.classList.add(
        'owner-action-open'
    );


    /*
     * Exact centering after layout.
     */

    requestAnimationFrame(
        () => {

            if (
                !document.body.contains(
                    panel
                )
            ) {
                return;
            }


            panel.style.position =
                'fixed';

            panel.style.top =
                '50%';

            panel.style.left =
                '50%';

            panel.style.right =
                'auto';

            panel.style.bottom =
                'auto';

            panel.style.transform =
                'translate(-50%, -50%)';
        }
    );


    requestAnimationFrame(
        () => {

            const firstFocusable =
                contentElement.querySelector(
                    'input, select, textarea, button'
                );


            if (firstFocusable) {

                try {

                    firstFocusable.focus();

                } catch {
                    // Ignore focus errors.
                }
            }
        }
    );
}


/* ================================================================
   CLOSE ACTION PANEL
   COMPLETE BLUR FIX
   ================================================================ */

function closeOwnerActionPanel() {

    const panel =
        document.getElementById(
            'ownerActionPanel'
        );


    if (panel) {

        panel.classList.remove(
            'show',
            'active',
            'open'
        );


        panel.setAttribute(
            'aria-hidden',
            'true'
        );


        panel.style.setProperty(
            'display',
            'none',
            'important'
        );


        panel.style.setProperty(
            'visibility',
            'hidden',
            'important'
        );


        panel.style.setProperty(
            'opacity',
            '0',
            'important'
        );


        panel.style.setProperty(
            'pointer-events',
            'none',
            'important'
        );
    }


    /*
     * Completely REMOVE backdrop.
     */

    document
        .querySelectorAll(
            '#ownerActionBackdrop'
        )
        .forEach(
            backdrop =>
                backdrop.remove()
        );


    /*
     * Remove body modal state.
     */

    document.body.classList.remove(
        'owner-action-open'
    );


    /*
     * Remove accidental dashboard blur.
     */

    const app =
        document.querySelector(
            '.super-admin-app'
        );


    if (app) {

        app.style.removeProperty(
            'filter'
        );

        app.style.removeProperty(
            'backdrop-filter'
        );

        app.style.removeProperty(
            '-webkit-backdrop-filter'
        );

        app.style.removeProperty(
            'opacity'
        );
    }


    document.body.style.removeProperty(
        'filter'
    );

    document.body.style.removeProperty(
        'backdrop-filter'
    );

    document.body.style.removeProperty(
        '-webkit-backdrop-filter'
    );


    document.documentElement.style.removeProperty(
        'filter'
    );

    document.documentElement.style.removeProperty(
        'backdrop-filter'
    );

    document.documentElement.style.removeProperty(
        '-webkit-backdrop-filter'
    );


    /*
     * Restore scrolling.
     */

    document.documentElement.style.removeProperty(
        'overflow'
    );

    document.body.style.removeProperty(
        'overflow'
    );


    /*
     * Restore focus only if the element still exists.
     */

    const focusTarget =
        ownerPreviousFocus;


    ownerPreviousFocus =
        null;


    if (
        focusTarget &&
        typeof focusTarget.focus ===
            'function' &&
        document.contains(
            focusTarget
        )
    ) {

        try {

            focusTarget.focus();

        } catch {
            // Ignore focus restoration errors.
        }
    }
}


/* ================================================================
   SUPER ADMIN MENU
   ================================================================ */

function openSuperAdminMenu() {

    const menu =
        document.getElementById(
            'superAdminMenu'
        );


    const button =
        document.getElementById(
            'superAdminMenuToggle'
        );


    if (!menu) return;


    menu.classList.add(
        'show',
        'open',
        'active'
    );


    if (button) {

        button.setAttribute(
            'aria-expanded',
            'true'
        );
    }
}


function closeSuperAdminMenu() {

    const menu =
        document.getElementById(
            'superAdminMenu'
        );


    const button =
        document.getElementById(
            'superAdminMenuToggle'
        );


    if (!menu) return;


    menu.classList.remove(
        'show',
        'open',
        'active'
    );


    if (button) {

        button.setAttribute(
            'aria-expanded',
            'false'
        );
    }
}


function toggleSuperAdminMenu() {

    const menu =
        document.getElementById(
            'superAdminMenu'
        );


    if (!menu) return;


    const isOpen =
        menu.classList.contains(
            'show'
        ) ||
        menu.classList.contains(
            'open'
        ) ||
        menu.classList.contains(
            'active'
        );


    if (isOpen) {

        closeSuperAdminMenu();

    } else {

        openSuperAdminMenu();
    }
}


/* ================================================================
   FEATURE MENU EVENTS
   ================================================================ */

function ensureSuperAdminFeatureMenu() {

    const menu =
        document.getElementById(
            'superAdminMenu'
        ) ||
        document.getElementById(
            'superAdminFeatureMenu'
        );


    const button =
        document.getElementById(
            'superAdminMenuToggle'
        ) ||
        document.getElementById(
            'superAdminMenuBtn'
        );


    if (
        !menu ||
        !button
    ) {
        return;
    }


    button.setAttribute(
        'aria-expanded',
        'false'
    );
}


function setupSuperAdminMenuEvents() {

    const button =
        document.getElementById(
            'superAdminMenuToggle'
        ) ||
        document.getElementById(
            'superAdminMenuBtn'
        );


    const menu =
        document.getElementById(
            'superAdminMenu'
        ) ||
        document.getElementById(
            'superAdminFeatureMenu'
        );


    if (
        !button ||
        !menu
    ) {
        return;
    }


    if (
        button.dataset.ownerMenuBound ===
        'true'
    ) {
        return;
    }


    button.dataset.ownerMenuBound =
        'true';


    button.addEventListener(
        'click',
        event => {

            event.preventDefault();

            event.stopPropagation();

            toggleSuperAdminMenu();
        }
    );


    menu.addEventListener(
        'click',
        event => {

            event.stopPropagation();
        }
    );


    document.addEventListener(
        'click',
        event => {

            if (
                !menu.contains(
                    event.target
                ) &&
                !button.contains(
                    event.target
                )
            ) {

                closeSuperAdminMenu();
            }
        }
    );


    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key !==
                'Escape'
            ) {
                return;
            }


            closeSuperAdminMenu();


            const panel =
                document.getElementById(
                    'ownerActionPanel'
                );


            if (
                panel &&
                (
                    panel.classList.contains(
                        'show'
                    ) ||
                    panel.classList.contains(
                        'active'
                    ) ||
                    panel.classList.contains(
                        'open'
                    )
                )
            ) {

                closeOwnerActionPanel();
            }
        }
    );
}


/* ================================================================
   SEARCH
   ================================================================ */

function clearRestaurantSearch() {

    const input =
        document.getElementById(
            'restaurantSearch'
        );


    if (input) {

        input.value =
            '';
    }


    renderOwnerRestaurantList();
}


function setupRestaurantSearch() {

    const input =
        document.getElementById(
            'restaurantSearch'
        );


    const clearButton =
        document.getElementById(
            'restaurantSearchClear'
        );


    if (
        input &&
        input.dataset.ownerSearchBound !==
            'true'
    ) {

        input.dataset.ownerSearchBound =
            'true';


        input.addEventListener(
            'input',
            () => {

                renderOwnerRestaurantList();


                if (clearButton) {

                    clearButton.style.display =
                        input.value
                            ? 'flex'
                            : '';
                }
            }
        );
    }


    if (
        clearButton &&
        clearButton.dataset.ownerSearchBound !==
            'true'
    ) {

        clearButton.dataset.ownerSearchBound =
            'true';


        clearButton.addEventListener(
            'click',
            clearRestaurantSearch
        );
    }
}


/* ================================================================
   ACTION PANEL EVENTS
   ================================================================ */

function setupOwnerActionPanelEvents() {

    const panel =
        document.getElementById(
            'ownerActionPanel'
        );


    if (!panel) return;


    if (
        panel.dataset.ownerPanelBound ===
        'true'
    ) {
        return;
    }


    panel.dataset.ownerPanelBound =
        'true';


    panel.addEventListener(
        'click',
        event => {

            const closeButton =
                event.target.closest(
                    '.owner-action-close'
                );


            if (closeButton) {

                closeOwnerActionPanel();
            }
        }
    );
}


/* ================================================================
   RESIZE
   ================================================================ */

function setupOwnerResizeHandling() {

    if (
        window.__ownerResizeBound
    ) {
        return;
    }


    window.__ownerResizeBound =
        true;


    window.addEventListener(
        'resize',
        () => {

            const panel =
                document.getElementById(
                    'ownerActionPanel'
                );


            if (
                panel &&
                (
                    panel.classList.contains(
                        'show'
                    ) ||
                    panel.classList.contains(
                        'active'
                    ) ||
                    panel.classList.contains(
                        'open'
                    )
                )
            ) {

                panel.style.position =
                    'fixed';

                panel.style.top =
                    '50%';

                panel.style.left =
                    '50%';

                panel.style.right =
                    'auto';

                panel.style.bottom =
                    'auto';

                panel.style.transform =
                    'translate(-50%, -50%)';
            }
        }
    );
}


/* ================================================================
   LOGOUT
   ================================================================ */

function logoutAdmin() {

    closeSuperAdminMenu();

    cleanupOwnerVisualState();

    clearAdminSession();

    window.location.href =
        '/admin.html';
}


/* ================================================================
   BACK TO LOGIN
   ================================================================ */

function backToAdminLogin() {

    cleanupOwnerVisualState();

    clearAdminSession();

    window.location.href =
        '/admin.html';
}


/* ================================================================
   GLOBAL ERROR HANDLING
   ================================================================ */

window.addEventListener(
    'error',
    event => {

        console.error(
            '[super-admin] Global error:',
            event.error ||
                event.message
        );


        /*
         * Do not leave the dashboard unusable after an unexpected
         * JavaScript error.
         */

        cleanupOwnerVisualState();
    }
);


window.addEventListener(
    'unhandledrejection',
    event => {

        console.error(
            '[super-admin] Unhandled promise rejection:',
            event.reason
        );


        cleanupOwnerVisualState();
    }
);


/* ================================================================
   BFCACHE / PAGE RESTORE SAFETY
   ================================================================ */

window.addEventListener(
    'pageshow',
    () => {

        cleanupOwnerVisualState();
    }
);


/* ================================================================
   STARTUP
   ================================================================ */

async function initializeSuperAdminDashboard() {

    ensureSuperAdminRuntimeStyles();


    /*
     * Remove stale visual states first.
     */

    cleanupOwnerVisualState();


    ensureSuperAdminFeatureMenu();

    setupSuperAdminMenuEvents();

    setupRestaurantSearch();

    setupOwnerActionPanelEvents();

    setupOwnerResizeHandling();


    /*
     * Make action panel start hidden.
     */

    const panel =
        document.getElementById(
            'ownerActionPanel'
        );


    if (panel) {

        panel.classList.remove(
            'show',
            'active',
            'open'
        );


        panel.style.setProperty(
            'display',
            'none',
            'important'
        );


        panel.style.setProperty(
            'visibility',
            'hidden',
            'important'
        );


        panel.style.setProperty(
            'opacity',
            '0',
            'important'
        );


        panel.style.setProperty(
            'pointer-events',
            'none',
            'important'
        );


        panel.setAttribute(
            'aria-hidden',
            'true'
        );
    }


    /*
     * Check access.
     */

    const access =
        await checkSuperAdminAccess();


    if (!access) {

        cleanupOwnerVisualState();

        return;
    }


    /*
     * Load dashboard.
     */

    await loadOwnerCafes();


    /*
     * Final safety cleanup.
     */

    cleanupOwnerVisualState();
}


/* ================================================================
   START
   ================================================================ */

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initializeSuperAdminDashboard
    );

} else {

    initializeSuperAdminDashboard();
}