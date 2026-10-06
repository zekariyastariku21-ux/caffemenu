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
let ownerDefaultImage = 'image/z-menu.jpg';
let accountDefaultImage = '';
let accountDefaultImageChanged = false;
let accountDefaultImageLoading = false;


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
   RESTAURANT APPEARANCE
   ================================================================ */

const DEFAULT_APPEARANCE = {
    header_background: '#f8e8d6',
    restaurant_name: '#fff4e8',
    restaurant_name_text: '#4a2f22',
    button_background: '#ffffff',
    button_text: '#563827',
    selected_button: '#a96327',
    selected_button_text: '#ffffff',
    add_button_background: '#a55d20',
    add_button_text: '#ffffff',
    cart_button_background: '#a96832',
    cart_button_text: '#fffaf5',
    card_background: '#fffdf9',
    item_name: '#4b2a0a',
    description: '#745b47',
    price: '#9a4b09',
    page_background: '#f4eadf'
};

const APPEARANCE_FIELDS = [
    ['header_background', 'Header Background'],
    ['restaurant_name', 'Restaurant Name'],
    ['restaurant_name_text', 'Restaurant Name Text'],
    ['button_background', 'Button Background'],
    ['button_text', 'Button Text'],
    ['selected_button', 'Selected Button'],
    ['selected_button_text', 'Selected Button Text'],
    ['add_button_background', '+ Add Button Background'],
    ['add_button_text', '+ Add Button Text'],
    ['cart_button_background', 'Cart Button Background'],
    ['cart_button_text', 'Cart Button Text'],
    ['card_background', 'Card Background'],
    ['item_name', 'Item Name'],
    ['description', 'Description'],
    ['price', 'Price'],
    ['page_background', 'Page Background']
];

const APPEARANCE_BACKGROUND_FIELDS = new Set([
    'header_background',
    'restaurant_name',
    'button_background',
    'selected_button',
    'add_button_background',
    'cart_button_background',
    'card_background',
    'page_background'
]);
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

        .company-content-edit-hint {
            margin:6px 0 12px;
            color:#766960;
            font-size:11px;
            line-height:1.5;
        }

        #companySettingsForm input:disabled,
        #companySettingsForm textarea:disabled,
        #companySettingsForm select:disabled {
            border-color:rgba(66,42,27,.1);
            background:#f3f0ec;
            color:#71675f;
            cursor:not-allowed;
            opacity:.86;
        }

        #companyContentList input:disabled,
        #companyContentList textarea:disabled {
            background:#f3f0ec;
        }

        .caffemenu-appearance-wrap {
            width:min(100%,780px);
            box-sizing:border-box;
            margin:0 auto;
            padding:4px 2px 112px;
        }

        .caffemenu-appearance-intro {
            position:relative;
            overflow:hidden;
            margin-bottom:18px;
            padding:22px 24px;
            border:1px solid rgba(168,121,46,.2);
            border-radius:18px;
            background:linear-gradient(120deg,#fffaf0,#fff 70%);
            box-shadow:0 8px 24px rgba(53,29,18,.045);
        }

        .caffemenu-appearance-intro::after {
            position:absolute;
            top:-38px;
            right:-22px;
            width:150px;
            height:150px;
            border:24px solid rgba(168,121,46,.07);
            border-radius:50%;
            content:"";
            pointer-events:none;
        }

        .caffemenu-appearance-intro-kicker {
            margin:0 0 7px;
            color:#a8792e;
            font-size:10px;
            font-weight:900;
            letter-spacing:.15em;
            text-transform:uppercase;
        }

        .caffemenu-appearance-intro h2 {
            margin:0;
            color:#351d12;
            font-family:Georgia,"Times New Roman",serif;
            font-size:24px;
            line-height:1.2;
        }

        .caffemenu-appearance-intro p:last-child {
            max-width:560px;
            margin:8px 0 0;
            color:#766960;
            font-size:12px;
            line-height:1.6;
        }

        .caffemenu-appearance-editing {
            position:relative;
            z-index:1;
            display:flex;
            align-items:center;
            gap:11px;
            margin-top:17px;
            padding:10px 12px;
            border:1px solid rgba(168,121,46,.18);
            border-radius:12px;
            background:rgba(255,255,255,.82);
        }

        .caffemenu-appearance-editing-mark {
            width:34px;
            height:34px;
            flex:0 0 34px;
            display:flex;
            align-items:center;
            justify-content:center;
            border-radius:10px;
            background:#351d12;
            color:#fff8e9;
            font-size:13px;
            font-weight:900;
        }

        .caffemenu-appearance-editing-copy {
            display:grid;
            gap:3px;
            min-width:0;
        }

        .caffemenu-appearance-editing-copy span {
            color:#84776e;
            font-size:9px;
            font-weight:850;
            letter-spacing:.1em;
            text-transform:uppercase;
        }

        .caffemenu-appearance-editing-copy strong {
            overflow:hidden;
            color:#351d12;
            font-size:14px;
            font-weight:850;
            text-overflow:ellipsis;
            white-space:nowrap;
        }

        .caffemenu-appearance-section {
            margin-bottom:14px;
            padding:19px;
            border:1px solid rgba(66,42,27,.1);
            border-radius:17px;
            background:rgba(255,255,255,.88);
            box-shadow:0 6px 20px rgba(53,29,18,.035);
        }

        .caffemenu-appearance-section-heading {
            display:flex;
            align-items:flex-start;
            gap:11px;
            margin-bottom:15px;
        }

        .caffemenu-appearance-section-number {
            width:30px;
            height:30px;
            flex:0 0 30px;
            display:flex;
            align-items:center;
            justify-content:center;
            border:1px solid rgba(168,121,46,.2);
            border-radius:10px;
            background:#fff8e9;
            color:#966820;
            font-size:11px;
            font-weight:900;
        }

        .caffemenu-appearance-section-heading h3 {
            margin:1px 0 3px;
            color:#351d12;
            font-family:Georgia,"Times New Roman",serif;
            font-size:16px;
            line-height:1.3;
        }

        .caffemenu-appearance-section-heading p {
            margin:0;
            color:#84776e;
            font-size:11px;
            line-height:1.45;
        }

        .caffemenu-appearance-grid {
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:11px;
        }

        .caffemenu-appearance-field {
            min-width:0;
            padding:13px;
            border:1px solid rgba(66,42,27,.09);
            border-radius:12px;
            background:#fffdfa;
            transition:border-color 150ms ease,box-shadow 150ms ease;
        }

        .caffemenu-appearance-field:focus-within {
            border-color:rgba(168,121,46,.48);
            box-shadow:0 0 0 3px rgba(168,121,46,.08);
        }

        .caffemenu-appearance-label {
            display:block;
            margin-bottom:10px;
            color:#351d12;
            font-size:11px;
            font-weight:850;
        }

        .caffemenu-appearance-mode-label,
        .caffemenu-gradient-angle-label {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            margin:0 0 9px;
            color:#766960;
            font-size:10px;
            font-weight:700;
        }

        .caffemenu-appearance-mode {
            width:68%;
            min-height:32px;
            min-width:0;
            padding:0 9px;
            border:1px solid rgba(66,42,27,.16);
            border-radius:8px;
            background:#fff;
            color:#351d12;
            font-family:inherit;
            font-size:11px;
            font-weight:700;
        }

        .caffemenu-appearance-mode:focus,
        .caffemenu-appearance-controls input:focus {
            outline:none;
            border-color:#a8792e;
            box-shadow:0 0 0 2px rgba(168,121,46,.11);
        }

        .caffemenu-appearance-controls {
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:9px;
        }

        .caffemenu-appearance-controls input {
            width:100%;
            min-width:0;
            min-height:37px;
            box-sizing:border-box;
            border:1px solid rgba(66,42,27,.16);
            border-radius:8px;
            background:#fff;
            color:#351d12;
            font-family:inherit;
            font-size:11px;
        }

        .caffemenu-solid-color-preview {
            display:flex;
            align-items:center;
            gap:11px;
            min-height:54px;
            margin-bottom:10px;
            padding:7px 9px;
            border:1px solid rgba(66,42,27,.11);
            border-radius:10px;
            background:linear-gradient(120deg,#fff,#faf6f0);
        }

        .caffemenu-solid-color-swatch {
            width:40px;
            height:40px;
            flex:0 0 40px;
            border:1px solid rgba(35,22,15,.2);
            border-radius:9px;
            box-shadow:inset 0 1px 2px rgba(255,255,255,.5),0 2px 5px rgba(35,22,15,.1);
        }

        .caffemenu-solid-color-info {
            display:grid;
            gap:3px;
            min-width:0;
        }

        .caffemenu-solid-color-info span {
            color:#84776e;
            font-size:9px;
            font-weight:800;
            letter-spacing:.08em;
            text-transform:uppercase;
        }

        .caffemenu-solid-color-info strong {
            overflow:hidden;
            color:#351d12;
            font-family:Consolas,"Courier New",monospace;
            font-size:12px;
            letter-spacing:.03em;
            text-overflow:ellipsis;
        }

        .caffemenu-solid-color-preview input[type="color"] {
            width:40px;
            height:40px;
            margin-left:auto;
            padding:3px;
            border:1px solid rgba(66,42,27,.16);
            border-radius:9px;
            background:#fff;
            cursor:pointer;
        }

        .caffemenu-appearance-input-label {
            display:grid;
            gap:5px;
            color:#84776e;
            font-size:9px;
            font-weight:800;
            letter-spacing:.06em;
            text-transform:uppercase;
        }

        .caffemenu-appearance-controls input[type="text"] {
            text-transform:none;
            padding:0 8px;
        }

        .caffemenu-appearance-gradient[hidden],
        .caffemenu-appearance-controls[hidden] {
            display:none !important;
        }

        .caffemenu-appearance-gradient {
            padding-top:2px;
        }

        .caffemenu-appearance-gradient-preview {
            height:42px;
            margin-bottom:13px;
            border:1px solid rgba(66,42,27,.14);
            border-radius:9px;
            box-shadow:inset 0 1px 2px rgba(0,0,0,.06);
        }

        .caffemenu-gradient-angle-label {
            margin-bottom:11px;
        }

        .caffemenu-gradient-angle-label input {
            flex:1;
            min-width:50px;
            accent-color:#a8792e;
        }

        .caffemenu-gradient-stops {
            display:grid;
            gap:6px;
        }

        .caffemenu-gradient-stop {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:8px;
            padding:6px 8px;
            border:1px solid rgba(66,42,27,.1);
            border-radius:8px;
            background:#fff;
        }

        .caffemenu-gradient-stop label {
            display:flex;
            align-items:center;
            gap:9px;
            color:#4a382d;
            font-size:10px;
            font-weight:700;
        }

        .caffemenu-gradient-stop input[type="color"] {
            width:34px;
            height:27px;
            padding:2px;
            border:1px solid rgba(66,42,27,.16);
            border-radius:6px;
            background:#fff;
            cursor:pointer;
        }

        .caffemenu-gradient-stop button,
        .caffemenu-gradient-add {
            min-height:28px;
            padding:0 9px;
            border:1px solid rgba(66,42,27,.14);
            border-radius:7px;
            background:#fff;
            color:#5b4537;
            font-family:inherit;
            font-size:10px;
            font-weight:700;
            cursor:pointer;
        }

        .caffemenu-gradient-stop button:disabled,
        .caffemenu-gradient-add:disabled {
            opacity:.45;
            cursor:not-allowed;
        }

        .caffemenu-gradient-add {
            width:100%;
            margin-top:8px;
            border-color:rgba(168,121,46,.28);
            background:#fff9ec;
            color:#81591e;
        }

        .caffemenu-appearance-actions {
            position:fixed;
            bottom:16px;
            left:50%;
            z-index:1;

            display:flex;
            justify-content:flex-end;
            width:min(850px,calc(100vw - 32px));
            gap:10px;
            box-sizing:border-box;
            padding:13px 24px;
            transform:translateX(-50%);
            border-right:1px solid rgba(66,42,27,.1);
            border-bottom:1px solid rgba(66,42,27,.1);
            border-left:1px solid rgba(66,42,27,.1);
            border-radius:0 0 20px 20px;
            border-top:1px solid rgba(66,42,27,.14);
            background:#fffdf9;
            box-shadow:0 -8px 20px rgba(53,29,18,.08);
        }

        @media (max-width:600px) {
            .caffemenu-appearance-wrap {
                padding:0 0 106px;
            }

            .caffemenu-appearance-intro {
                padding:18px;
            }

            .caffemenu-appearance-intro h2 {
                font-size:21px;
            }

            .caffemenu-appearance-section {
                padding:14px;
            }

            .caffemenu-appearance-grid {
                grid-template-columns:minmax(0,1fr);
                gap:9px;
            }

            .caffemenu-appearance-field {
                padding:12px;
            }

            .caffemenu-appearance-actions {
                bottom:16px;
                padding:11px 13px;
            }

            .caffemenu-appearance-actions button {
                flex:1;
                min-width:0;
                padding:0 8px;
            }
        }

        .appearance-clear-confirm-backdrop {
            position:fixed;
            inset:0;
            z-index:1000001;
            display:flex;
            align-items:center;
            justify-content:center;
            box-sizing:border-box;
            padding:20px;
            background:rgba(25,15,9,.58);
            backdrop-filter:blur(5px);
            -webkit-backdrop-filter:blur(5px);
        }

        .appearance-clear-confirm-dialog {
            width:min(420px,100%);
            box-sizing:border-box;
            padding:30px;
            border:1px solid rgba(255,255,255,.75);
            border-radius:22px;
            background:#fffdf9;
            box-shadow:0 28px 80px rgba(0,0,0,.3);
            text-align:center;
            animation:appearanceConfirmIn 160ms ease-out;
        }

        .appearance-clear-confirm-icon {
            width:54px;
            height:54px;
            display:flex;
            align-items:center;
            justify-content:center;
            margin:0 auto 18px;
            border:1px solid #f0c5bc;
            border-radius:17px;
            background:linear-gradient(135deg,#fff1ed,#ffe3dc);
            color:#a43f35;
            font-size:25px;
            font-weight:800;
        }

        .appearance-clear-confirm-kicker {
            margin:0 0 8px;
            color:#a8792e;
            font-size:10px;
            font-weight:900;
            letter-spacing:.16em;
            text-transform:uppercase;
        }

        .appearance-clear-confirm-dialog h2 {
            margin:0;
            color:#351d12;
            font-family:Georgia,"Times New Roman",serif;
            font-size:24px;
            line-height:1.25;
        }

        .appearance-clear-confirm-message {
            margin:12px 0 0;
            color:#766960;
            font-size:13px;
            line-height:1.6;
        }

        .appearance-clear-confirm-actions {
            display:flex;
            justify-content:center;
            gap:10px;
            margin-top:25px;
        }

        .appearance-clear-confirm-actions button {
            min-height:44px;
            padding:0 18px;
            border-radius:11px;
            font-family:inherit;
            font-size:12px;
            font-weight:800;
            cursor:pointer;
            transition:transform 160ms ease,box-shadow 160ms ease;
        }

        .appearance-clear-cancel {
            border:1px solid rgba(66,42,27,.17);
            background:#fff;
            color:#4a382d;
        }

        .appearance-clear-confirm {
            border:1px solid #a43f35;
            background:linear-gradient(135deg,#b34e45,#963b34);
            color:#fff;
            box-shadow:0 7px 16px rgba(174,73,65,.2);
        }

        .appearance-clear-confirm-actions button:hover {
            transform:translateY(-1px);
        }

        .appearance-clear-confirm-actions button:focus-visible {
            outline:3px solid rgba(168,121,46,.45);
            outline-offset:2px;
        }

        .company-content-delete-backdrop {
            position:fixed;
            inset:0;
            z-index:1000002;
            display:flex;
            align-items:center;
            justify-content:center;
            box-sizing:border-box;
            padding:20px;
            background:rgba(25,15,9,.58);
            backdrop-filter:blur(5px);
            -webkit-backdrop-filter:blur(5px);
        }

        .company-content-delete-dialog {
            width:min(420px,100%);
            box-sizing:border-box;
            padding:30px;
            border:1px solid rgba(255,255,255,.75);
            border-radius:22px;
            background:#fffdf9;
            box-shadow:0 28px 80px rgba(0,0,0,.3);
            text-align:center;
            animation:appearanceConfirmIn 160ms ease-out;
        }

        .company-content-delete-icon {
            width:54px;
            height:54px;
            display:flex;
            align-items:center;
            justify-content:center;
            margin:0 auto 18px;
            border:1px solid #f0c5bc;
            border-radius:17px;
            background:linear-gradient(135deg,#fff1ed,#ffe3dc);
            color:#a43f35;
            font-size:25px;
            font-weight:800;
        }

        .company-content-delete-dialog h2 {
            margin:0;
            color:#351d12;
            font-family:Georgia,"Times New Roman",serif;
            font-size:24px;
            line-height:1.25;
        }

        .company-content-delete-message {
            margin:12px 0 0;
            color:#766960;
            font-size:13px;
            line-height:1.6;
            overflow-wrap:anywhere;
        }

        .company-content-delete-actions {
            display:flex;
            justify-content:center;
            gap:10px;
            margin-top:25px;
        }

        .company-content-delete-actions button {
            min-height:44px;
            padding:0 18px;
            border-radius:11px;
            font-family:inherit;
            font-size:12px;
            font-weight:800;
            cursor:pointer;
            transition:transform 160ms ease,box-shadow 160ms ease;
        }

        .company-content-delete-cancel {
            border:1px solid rgba(66,42,27,.17);
            background:#fff;
            color:#4a382d;
        }

        .company-content-delete-confirm {
            border:1px solid #a43f35;
            background:linear-gradient(135deg,#b34e45,#963b34);
            color:#fff;
            box-shadow:0 7px 16px rgba(174,73,65,.2);
        }

        .company-content-delete-actions button:hover {
            transform:translateY(-1px);
        }

        .company-content-delete-actions button:focus-visible {
            outline:3px solid rgba(168,121,46,.45);
            outline-offset:2px;
        }

        @keyframes appearanceConfirmIn {
            from { opacity:0; transform:translateY(8px) scale(.98); }
            to { opacity:1; transform:translateY(0) scale(1); }
        }

        @media (max-width:520px) {
            .appearance-clear-confirm-dialog {
                padding:25px 20px;
            }

            .appearance-clear-confirm-dialog h2 {
                font-size:21px;
            }

            .appearance-clear-confirm-actions {
                flex-direction:column-reverse;
            }

            .appearance-clear-confirm-actions button {
                width:100%;
            }
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

        .owner-account-profile {
            display:flex;
            align-items:center;
            gap:16px;
            margin-bottom:20px;
            padding:16px;
            border:1px solid rgba(168,121,46,.18);
            border-radius:14px;
            background:linear-gradient(120deg,#fffaf0,#fff 75%);
        }

        .owner-account-avatar {
            width:72px;
            height:72px;
            flex:none;
            border:2px solid rgba(168,121,46,.35);
            border-radius:50%;
            object-fit:cover;
            box-shadow:0 4px 12px rgba(66,42,27,.14);
        }

        .owner-account-profile-name {
            margin:0 0 4px;
            color:#351d12;
            font-family:Georgia,"Times New Roman",serif;
            font-size:18px;
            font-weight:700;
        }

        .owner-account-profile-email {
            margin:0;
            color:#766960;
            font-size:13px;
            overflow-wrap:anywhere;
        }

        .owner-account-image-field {
            display:flex;
            align-items:center;
            flex-wrap:wrap;
            gap:10px;
            margin-bottom:18px;
        }

        .owner-account-image-field label {
            width:100%;
        }

        .owner-account-image-field input {
            flex:1;
            min-width:200px;
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
                        ${active ? '✓' : '!'}
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
                    onclick="openRestaurantAppearance(${id})"
                    ${active ? '' : 'disabled'}
                >
                    Appearance
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


function toggleOwnerPassword(button) {

    const input =
        document.getElementById(
            button.dataset.passwordTarget
        );

    if (!input) return;

    const isHidden = input.type === 'password';

    input.type = isHidden ? 'text' : 'password';

    button.textContent = isHidden ? '\u25CB' : '\u25C9';

    button.setAttribute(
        'aria-label',
        isHidden ? 'Hide password' : 'Show password'
    );
}

async function editOwnerCafeAdmin(
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


    const token =
        localStorage.getItem(
            'adminToken'
        );


    if (!token) {

        showOwnerNotification(
            'Session expired',
            'Please log in again.',
            'error'
        );

        return;
    }


    try {

        const response =
            await fetch(
                `/api/owner/restaurants/${Number(restaurantId)}/admin`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization':
                            `Bearer ${token}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.ok) {

            throw new Error(
                data.message ||
                'Unable to load admin account.'
            );
        }


        const admin =
            data.admin || {};


        const email =
            admin.email || '';


        const currentPassword =
            admin.password || '';


        openOwnerActionPanel(
            'Admin Account',
            `
                <form
                    id="ownerEditCafeAdminForm"
                    onsubmit="submitEditOwnerCafeAdmin(event, ${Number(restaurantId)})"
                >

                    <div
                        style="
                            display:grid;
                            grid-template-columns:1fr 1fr auto;
                            gap:16px;
                            align-items:end;
                            margin-bottom:18px;
                        "
                    >

                        <div class="owner-form-field">

                            <label>
                                Current Email
                            </label>

                            <input
                                type="email"
                                value="${escapeHtml(email)}"
                                readonly
                            >

                        </div>


                        <div class="owner-form-field">

                            <label>
                                Current Password
                            </label>

                            <input
                                type="password"
                                id="ownerCurrentAdminPassword"
                                value="${escapeHtml(currentPassword)}"
                                readonly
                            >

                        </div>


                        <label
                            style="
                                display:flex;
                                align-items:center;
                                gap:7px;
                                cursor:pointer;
                                font-size:13px;
                                padding-bottom:10px;
                                white-space:nowrap;
                            "
                        >

                            <input
                                type="checkbox"
                                id="ownerShowAdminPassword"
                                onchange="
                                    document.getElementById('ownerCurrentAdminPassword').type =
                                    this.checked ? 'text' : 'password';
                                "
                            >

                            Show Password

                        </label>

                    </div>


                    <div class="owner-form-grid">

                        <div class="owner-form-field">

                            <label for="ownerEditAdminEmail">
                                New Email
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

                                <div class="owner-password-wrapper">

                                    <input
                                        type="password"
                                        id="ownerEditAdminPassword"
                                        autocomplete="new-password"
                                    >

                                    <button
                                        type="button"
                                        class="owner-password-toggle"
                                        data-password-target="ownerEditAdminPassword"
                                        onclick="toggleOwnerPassword(this)"
                                        aria-label="Show password"
                                    >&#9673;</button>

                                </div>


                        <div class="owner-form-field">

                            <label for="ownerEditAdminPasswordConfirm">
                                Confirm Password
                            </label>
                                <div class="owner-password-wrapper">

                                    <input
                                        type="password"
                                        id="ownerEditAdminPasswordConfirm"
                                        autocomplete="new-password"
                                    >

                                    <button
                                        type="button"
                                        class="owner-password-toggle"
                                        data-password-target="ownerEditAdminPasswordConfirm"
                                        onclick="toggleOwnerPassword(this)"
                                        aria-label="Show password"
                                    >&#9673;</button>

                                </div>

                    </div>


                    <div
                        class="owner-action-buttons"
                        style="
                            margin-top:18px;
                            display:flex;
                            justify-content:flex-end;
                            gap:10px;
                        "
                    >

                        <button
                            type="button"
                            onclick="closeOwnerActionPanel()"
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                        >
                            Save Changes
                        </button>

                    </div>

                </form>
            `
        );

    } catch (error) {

        console.error(
            '[owner:restaurant:admin:get]',
            error
        );

        showOwnerNotification(
            'Unable to load admin account',
            error.message ||
            'Unable to load the current admin account.',
            'error'
        );
    }
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


    const confirmPassword =
        document
            .getElementById(
                'ownerEditAdminPasswordConfirm'
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


    if (
        password !== confirmPassword
    ) {

        showOwnerNotification(
            'Passwords do not match',
            'New password and confirm password must match.',
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


    const restaurantName =
        getRestaurantName(
            restaurant
        );

    openOwnerActionPanel(
        active
            ? 'Disable Restaurant'
            : 'Enable Restaurant',
        `
            <div class="owner-status-confirm">

                <div class="owner-status-confirm-icon ${active ? 'disable' : 'enable'}">
                    ${active ? '!' : '✓'}
                </div>

                <div class="owner-status-confirm-kicker">
                    ${active ? 'RESTAURANT STATUS' : 'RESTAURANT STATUS'}
                </div>

                <h3>
                    ${active
                        ? 'Disable this restaurant?'
                        : 'Enable this restaurant?'}
                </h3>

                <p class="owner-status-confirm-name">
                    ${escapeHtml(restaurantName)}
                </p>

                <p class="owner-status-confirm-message">
                    ${active
                        ? 'Customers will no longer be able to use this restaurant while it is disabled.'
                        : 'This restaurant will become active and available to customers again.'}
                </p>

                <div class="owner-status-confirm-actions">

                    <button
                        type="button"
                        class="owner-status-cancel-btn"
                        onclick="closeOwnerActionPanel()"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        class="owner-status-confirm-btn ${active ? 'disable' : 'enable'}"
                        onclick="executeOwnerCafeStatus(${Number(restaurantId)}, '${nextStatus}', ${active})"
                    >
                        ${active
                            ? 'Disable Restaurant'
                            : 'Enable Restaurant'}
                    </button>

                </div>

            </div>
        `
    );
}


async function executeOwnerCafeStatus(
    restaurantId,
    nextStatus,
    wasActive
) {

    showOwnerLoading(
        wasActive
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


        closeOwnerActionPanel();


        showOwnerNotification(
            wasActive
                ? 'Restaurant disabled'
                : 'Restaurant enabled',
            data.message ||
                (
                    wasActive
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
                            →
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


            <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
        ">

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
                            value="0"
                            placeholder="0"
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

                    

                </div>

            </div>


            <div class="price-form-section">

    <div class="price-section-heading">
        <span class="price-section-number">3</span>
        Menu Selection
    </div>


    <div
        style="
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-bottom:12px;
        "
    >

        <button
            type="button"
            class="restaurant-action-btn"
            id="priceAllMenuBtn"
            style="
                min-height:38px; padding:0 8px; font-size:11px; font-weight:900; white-space:nowrap;
            "
        >
            All Menu
        </button>


        <button
            type="button"
            class="restaurant-action-btn"
            id="priceSelectCategoryBtn"
            style="
                min-height:38px; padding:0 8px; font-size:11px; font-weight:900; white-space:nowrap;
            "
        >
            Select Category
        </button>

        <button
            type="button"
            class="restaurant-action-btn"
            id="priceSelectItemsBtn"
            style="
                min-height:38px; padding:0 8px; font-size:11px; font-weight:900; white-space:nowrap;
            "
        >
            Select Items
        </button>


        <button
            type="button"
            class="restaurant-action-btn"
            id="priceClearSelectionBtn"
            style="
                min-height:38px; padding:0 8px; font-size:11px; font-weight:900; white-space:nowrap;
            "
        >
            Clear Selection
        </button>

    </div>

    <div
    id="priceCategoryPanel"
    style="
        display:none;
        margin-bottom:12px;
        padding:12px;
        border:1px solid rgba(196,150,66,.18);
        border-radius:12px;
        background:#fffaf0;
    "
>
</div>

<div
    id="priceItemsSelectionPanel"
    style="
        display:none;
        margin-bottom:12px;
        padding:12px;
        border:1px solid rgba(196,150,66,.18);
        border-radius:12px;
        background:#fffaf0;
    "
>
    <div class="price-items-toolbar">

        <div class="price-search-wrap">

            <input
                type="search"
                id="priceItemSearch"
                placeholder="Search menu item..."
                autocomplete="off"
            >

        </div>

    </div>

    <div
        id="priceItemsList"
        class="price-items-list"
    >
    </div>

</div>


    <div
        style="
            margin-bottom:12px;
            padding:12px;
            border:1px solid rgba(196,150,66,.18);
            border-radius:12px;
            background:#fffaf0;
        "
    >

        


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

function renderPriceCategoryPanel() {

    const panel =
        document.getElementById(
            'priceCategoryPanel'
        );

    if (!panel) {
        return;
    }

    const categories =
        Object.keys(
            priceManagementMenu || {}
        ).filter(
            category =>
                Array.isArray(
                    priceManagementMenu[category]
                )
        );

    if (!categories.length) {

        panel.innerHTML = `
            <div
                style="
                    padding:10px;
                    color:#735727;
                    font-size:11px;
                    font-weight:800;
                "
            >
                No categories found.
            </div>
        `;

        return;
    }

    panel.innerHTML =
        categories.map(
            category => `
                <button
                    type="button"
                    class="restaurant-action-btn"
                    data-price-category="${escapeHtml(category)}"
                    style="
                        width:100%;
                        min-height:42px;
                        margin-bottom:8px;
                        font-weight:800;
                        text-align:left;
                    "
                >
                    ${escapeHtml(
                        formatPriceCategoryName(
                            category
                        )
                    )}
                </button>
            `
        ).join('');

    panel
        .querySelectorAll(
            '[data-price-category]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        const category =
                            button.dataset
                                .priceCategory;

                        const categoryItems =
                            getAllPriceItems()
                                .filter(
                                    item =>
                                        item.category ===
                                        category
                                );

                        categoryItems.forEach(
                            item => {
                                priceManagementSelectedItems
                                    .add(item.key);
                            }
                        );

                        renderPriceItemsList();
                        updateSelectedPriceCount();
                        updatePricePreview();
                    }
                );
            }
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

        function setActivePriceButton(activeButtonId) {

    [
        'priceAllMenuBtn',
        'priceSelectCategoryBtn',
        'priceSelectItemsBtn',
        'priceClearSelectionBtn'
    ].forEach(id => {

        const button = document.getElementById(id);

        if (button) {
            button.classList.toggle(
                'active',
                id === activeButtonId
            );
        }

    });
}

const allMenuButton =
    document.getElementById(
        'priceAllMenuBtn'
    );

if (allMenuButton) {
    allMenuButton.addEventListener(
        'click',
        () => {

            setActivePriceButton('priceAllMenuBtn');

            const categoryPanel =
    document.getElementById('priceCategoryPanel');

const itemsPanel =
    document.getElementById('priceItemsSelectionPanel');

if (categoryPanel) {
    categoryPanel.style.display = 'none';
}

if (itemsPanel) {
    itemsPanel.style.display = 'none';
}


            getAllPriceItems().forEach(
                item => {
                    priceManagementSelectedItems.add(
                        item.key
                    );
                }
            );

            renderPriceItemsList();
            updateSelectedPriceCount();
            updatePricePreview();
        }
    );
}


const selectCategoryButton =
    document.getElementById(
        'priceSelectCategoryBtn'
    );

if (selectCategoryButton) {
    selectCategoryButton.addEventListener(
        'click',
        () => {

            setActivePriceButton('priceSelectCategoryBtn');

            const categoryPanel =
                document.getElementById(
                    'priceCategoryPanel'
                );

            const itemsPanel =
                document.getElementById(
                    'priceItemsSelectionPanel'
                );

            if (itemsPanel) {
                itemsPanel.style.display = 'none';
            }

            if (categoryPanel) {
                categoryPanel.style.display = 'block';
            }

            renderPriceCategoryPanel();
        }
    );
}


const selectItemsButton =
    document.getElementById(
        'priceSelectItemsBtn'
    );

if (selectItemsButton) {
    selectItemsButton.addEventListener(
        'click',
        () => {

            setActivePriceButton('priceSelectItemsBtn');

            const categoryPanel =
                document.getElementById(
                    'priceCategoryPanel'
                );

            const itemsPanel =
                document.getElementById(
                    'priceItemsSelectionPanel'
                );

            if (categoryPanel) {
                categoryPanel.style.display = 'none';
            }

            if (itemsPanel) {
                itemsPanel.style.display = 'block';
            }

            renderPriceItemsList();
            updateSelectedPriceCount();
            updatePricePreview();
        }
    );
}


const clearSelectionButton =
    document.getElementById(
        'priceClearSelectionBtn'
    );

if (clearSelectionButton) {
    clearSelectionButton.addEventListener(
        'click',
        () => {

            setActivePriceButton('priceClearSelectionBtn');

            const categoryPanel =
                document.getElementById('priceCategoryPanel');

            const itemsPanel =
                document.getElementById('priceItemsSelectionPanel');

            if (categoryPanel) {
                categoryPanel.style.display = 'none';
            }

            if (itemsPanel) {
                itemsPanel.style.display = 'none';
            }


            priceManagementSelectedItems.clear();

            renderPriceItemsList();
            updateSelectedPriceCount();
            updatePricePreview();
        }
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
                                style="
        width:14px;
        height:14px;
        margin:0;
        flex:0 0 14px;
    "
                            >

                            <span class="price-item-info">

                                <span
                                    style="
                                        display:block;
                                        color:#2b211b;
                                        font-size:18px;
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
        percentage < 0 ||
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
                onclick="applyPriceManagement(${percentage})"
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

async function applyPriceManagement(confirmedPercentage) {

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
    Number(confirmedPercentage);


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
        percentage < 0 ||
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
        `/api/owner/restaurants/${encodeURIComponent(
            restaurant.id
        )}/price-management`,
        {
            method: 'POST',

            headers: {
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
                    mode:
                        operation,

                    percentage:
                        percentage,

                    scope:
                        'items',

                    items:
                        selected.map(
                            entry => ({
                                category:
                                    entry.category,

                                index:
                                    entry.index
                            })
                        )
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
   SUPER ADMIN ACCOUNT SETTINGS
   ================================================================ */

async function openSuperAdminAccountSettings() {
    closeSuperAdminMenu();

    const token = getAdminToken();

    if (!token) {
        clearAdminSession();
        window.location.href = '/admin.html';
        return;
    }

    showOwnerLoading('Loading account settings...');

    try {
        const response = await fetch(
            '/api/admin/session',
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                },
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );

        const data = await readOwnerApiResponse(response);
        const user = data.user || {};

        if (!data.ok || user.role !== 'super_admin') {
            throw new Error('Super admin account details are unavailable.');
        }

        const settingsResponse = await fetch(
            '/api/owner/company-settings',
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                },
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );

        const settingsData =
            await readOwnerApiResponse(settingsResponse);

        if (!settingsData.ok) {
            throw new Error(
                'Unable to load the shared default image.'
            );
        }

        accountDefaultImage =
            settingsData.settings?.defaultImage || '';

        ownerDefaultImage =
            accountDefaultImage || 'image/z-menu.jpg';

        accountDefaultImageChanged = false;

        openOwnerActionPanel(
            'Account Settings',
            `
                <form
                    id="ownerSuperAdminAccountForm"
                    onsubmit="submitSuperAdminAccountSettings(event)"
                >
                    <div class="owner-account-profile">
                        <img
                            id="ownerDefaultImagePreview"
                            class="owner-account-avatar"
                            src="${escapeHtml(ownerDefaultImage)}"
                            alt="Shared default image preview"
                        >
                        <div>
                            <p class="owner-account-profile-name">Default App Image</p>
                            <p class="owner-account-profile-email">Used anywhere the app would otherwise show the Z Menu placeholder. Custom restaurant logos are not changed.</p>
                        </div>
                    </div>

                    <div class="owner-form-field owner-account-image-field">
                        <label for="ownerDefaultImageInput">Change shared default image</label>
                        <input
                            id="ownerDefaultImageInput"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onchange="previewAccountDefaultImage(event)"
                        >
                        <button
                            type="button"
                            class="restaurant-action-btn"
                            onclick="resetAccountDefaultImage()"
                        >
                            Restore original default
                        </button>
                    </div>

                    <div class="owner-form-grid">
                        <div class="owner-form-field">
                            <label for="ownerAccountCurrentEmail">Current Email</label>
                            <input
                                id="ownerAccountCurrentEmail"
                                type="email"
                                value="${escapeHtml(user.email || '')}"
                                readonly
                            >
                        </div>

                        <div class="owner-form-field">
                            <label for="ownerAccountNewEmail">New Email</label>
                            <input
                                id="ownerAccountNewEmail"
                                type="email"
                                value="${escapeHtml(user.email || '')}"
                                autocomplete="email"
                                required
                            >
                        </div>

                        <div class="owner-form-field">
                            <label for="ownerAccountPasswordReadOnly">Current Password</label>
                            <input
                                id="ownerAccountPasswordReadOnly"
                                type="password"
                                value="********"
                                aria-label="Saved password is hidden"
                                readonly
                            >
                        </div>

                        <div class="owner-form-field">
                            <label for="ownerAccountVerifyPassword">Verify Current Password</label>
                            <div class="owner-password-wrapper">
                                <input
                                    id="ownerAccountVerifyPassword"
                                    type="password"
                                    autocomplete="current-password"
                                    required
                                >
                                <button
                                    type="button"
                                    class="owner-password-toggle"
                                    data-password-target="ownerAccountVerifyPassword"
                                    onclick="toggleOwnerPassword(this)"
                                    aria-label="Show password"
                                >&#9673;</button>
                            </div>
                        </div>

                        <div class="owner-form-field">
                            <label for="ownerAccountNewPassword">New Password</label>
                            <div class="owner-password-wrapper">
                                <input
                                    id="ownerAccountNewPassword"
                                    type="password"
                                    autocomplete="new-password"
                                    minlength="6"
                                >
                                <button
                                    type="button"
                                    class="owner-password-toggle"
                                    data-password-target="ownerAccountNewPassword"
                                    onclick="toggleOwnerPassword(this)"
                                    aria-label="Show password"
                                >&#9673;</button>
                            </div>
                        </div>

                        <div class="owner-form-field">
                            <label for="ownerAccountConfirmPassword">Confirm New Password</label>
                            <div class="owner-password-wrapper">
                                <input
                                    id="ownerAccountConfirmPassword"
                                    type="password"
                                    autocomplete="new-password"
                                    minlength="6"
                                >
                                <button
                                    type="button"
                                    class="owner-password-toggle"
                                    data-password-target="ownerAccountConfirmPassword"
                                    onclick="toggleOwnerPassword(this)"
                                    aria-label="Show password"
                                >&#9673;</button>
                            </div>
                        </div>
                    </div>

                    <p class="company-content-edit-hint">
                        Verify your password to save changes. Leave the new password fields blank to update only your email. Image changes are shared across the app and apply after saving.
                    </p>

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
                            id="ownerAccountSaveButton"
                            class="owner-action-btn"
                        >
                            Save Account Changes
                        </button>
                    </div>
                </form>
            `
        );

        requestAnimationFrame(() => {
            document
                .getElementById('ownerAccountNewEmail')
                ?.focus();
        });

    } catch (error) {
        showOwnerNotification(
            'Unable to load account settings',
            error.message || 'Please try again.',
            'error'
        );
    } finally {
        hideOwnerLoading();
    }
}


async function submitSuperAdminAccountSettings(event) {
    event.preventDefault();

    const email =
        document.getElementById('ownerAccountNewEmail')?.value.trim();

    const currentPassword =
        document.getElementById('ownerAccountVerifyPassword')?.value || '';

    const newPassword =
        document.getElementById('ownerAccountNewPassword')?.value || '';

    const confirmPassword =
        document.getElementById('ownerAccountConfirmPassword')?.value || '';

    const submitButton =
        document.getElementById('ownerAccountSaveButton');

    if (accountDefaultImageLoading) {
        showOwnerNotification(
            'Image is still loading',
            'Please wait for the selected image to finish loading.',
            'error'
        );
        return;
    }

    if (newPassword !== confirmPassword) {
        showOwnerNotification(
            'Passwords do not match',
            'New password and confirmation must match.',
            'error'
        );
        return;
    }

    if (newPassword && newPassword.length < 6) {
        showOwnerNotification(
            'Password too short',
            'The new password must contain at least 6 characters.',
            'error'
        );
        return;
    }

    const token = getAdminToken();

    if (!token) {
        clearAdminSession();
        window.location.href = '/admin.html';
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
    }

    showOwnerLoading('Updating account...');

    try {
        const response = await fetch(
            '/api/owner/account',
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    email,
                    currentPassword,
                    newPassword,
                    ...(accountDefaultImageChanged
                        ? { defaultImage: accountDefaultImage }
                        : {})
                })
            }
        );

        const data = await readOwnerApiResponse(response);

        if (data.token) {
            localStorage.setItem('adminToken', data.token);
        }

        ownerDefaultImage =
            accountDefaultImage || 'image/z-menu.jpg';

        closeOwnerActionPanel();
        showOwnerNotification(
            'Account updated',
            data.message || 'Super admin account updated successfully.',
            'success'
        );

    } catch (error) {
        showOwnerNotification(
            'Unable to update account',
            error.message || 'Please check your details and try again.',
            'error'
        );
    } finally {
        hideOwnerLoading();

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Account Changes';
        }
    }
}

function previewAccountDefaultImage(event) {
    const file =
        event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showOwnerNotification(
            'Unsupported image type',
            'Choose a JPEG, PNG, or WebP image.',
            'error'
        );
        event.target.value = '';
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showOwnerNotification(
            'Image is too large',
            'Choose an image smaller than 5 MB.',
            'error'
        );
        event.target.value = '';
        return;
    }

    accountDefaultImageLoading = true;

    const reader = new FileReader();

    reader.onload = () => {
        if (typeof reader.result !== 'string') {
            accountDefaultImageLoading = false;
            showOwnerNotification(
                'Unable to preview image',
                'Select the image again and retry.',
                'error'
            );
            return;
        }

        accountDefaultImage = reader.result;
        accountDefaultImageChanged = true;
        accountDefaultImageLoading = false;

        const preview =
            document.getElementById('ownerDefaultImagePreview');

        if (preview) {
            preview.src = accountDefaultImage;
        }
    };

    reader.onerror = () => {
        accountDefaultImageLoading = false;
        showOwnerNotification(
            'Unable to read image',
            'Select the image again and retry.',
            'error'
        );
    };

    reader.readAsDataURL(file);
}

function resetAccountDefaultImage() {
    accountDefaultImage = '';
    accountDefaultImageChanged = true;
    accountDefaultImageLoading = false;

    const preview =
        document.getElementById('ownerDefaultImagePreview');

    if (preview) {
        preview.src = 'image/z-menu.jpg';
    }

    const input =
        document.getElementById('ownerDefaultImageInput');

    if (input) {
        input.value = '';
    }
}


/* ================================================================
   COMPANY PROFILE
   ================================================================ */

function openCompanyProfile() {

    closeSuperAdminMenu();

    openOwnerActionPanel(
        'Company Settings',
        `
            <form
                id="companySettingsForm"
                onsubmit="return false"
            >

                <div class="owner-form-group">
                    <label for="companyName">
                        Company Name
                    </label>

                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:10px;
                        "
                    >
                        <input
                            id="companyName"
                            type="text"
                            placeholder="Company name"
                            disabled
                            style="flex:1;"
                        >

                        <button
                            type="button"
                            class="restaurant-action-btn"
                            onclick="toggleCompanyFieldEdit(this, ['companyName'])"
                        >
                            &#9998; Edit
                        </button>
                    </div>
                </div>

                <div class="owner-form-group">
    <label for="companySlogan">
        Slogan
    </label>

    <div
        style="
            display:flex;
            align-items:center;
            gap:10px;
        "
    >
        <input
            id="companySlogan"
            type="text"
            placeholder="Company slogan"
            disabled
            style="flex:1;"
        >

        <button
            type="button"
            class="restaurant-action-btn"
            onclick="toggleCompanyFieldEdit(this, ['companySlogan'])"
        >
            &#9998; Edit
        </button>
    </div>
</div>

                <div class="owner-form-group">
                    <label>
                        Company Logo
                    </label>

                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:14px;
                            margin-bottom:12px;
                        "
                    >
                        <img
                            id="companyLogoPreview"
                            src="${escapeHtml(ownerDefaultImage)}"
                            alt="Company Logo"
                            style="
                                width:80px;
                                height:80px;
                                object-fit:cover;
                                border-radius:10px;
                                border:1px solid #ddd;
                            "
                        >

                        <div
                            style="
                                display:flex;
                                gap:8px;
                                flex-wrap:wrap;
                            "
                        >
                            <button
                                type="button"
                                class="restaurant-action-btn"
                                onclick="toggleCompanyFieldEdit(this, ['companyLogoInput', 'companyLogoDeleteButton'])"
                            >
                                &#9998; Edit Logo
                            </button>

                            <label
                                for="companyLogoInput"
                                class="restaurant-action-btn"
                                style="cursor:not-allowed;"
                            >
                                Replace Logo
                            </label>

                            <input
                                id="companyLogoInput"
                                type="file"
                                accept="image/*"
                                style="display:none;"
                                onchange="previewCompanyLogo(event)"
                            >

                            <button
                                id="companyLogoDeleteButton"
                                type="button"
                                class="restaurant-action-btn"
                                disabled
                                onclick="deleteCompanyLogo()"
                            >
                                Delete Logo
                            </button>
                        </div>
                    </div>
                </div>



                <div class="owner-form-group">
                    <label>
                        Company Content
                    </label>

                    <p class="company-content-edit-hint">
                        Company Profile fields are read-only until you choose Edit for that field or row. Hold and drag the grip to reorder; the Company Profile page follows this order after you save.
                    </p>

                    <div
                        id="companyContentList"
                        class="profile-entry-list"
                    ></div>

                    <button
                        type="button"
                        class="restaurant-action-btn"
                        onclick="addCompanyContent()"
                        style="margin-top:10px;"
                    >
                        + Add Content
                    </button>
                </div>

                <div class="owner-form-group">
    <label>
        Phone Numbers
    </label>

    <div
        id="companyPhoneList"
        class="profile-entry-list"
    ></div>

    <button
        type="button"
        class="restaurant-action-btn"
        onclick="addCompanyPhone()"
        style="margin-top:10px;"
    >
        + Add Phone
    </button>
</div>
                
               <div class="owner-form-group">
    <label>
        Locations
    </label>

    <div
        id="companyLocationList"
        class="profile-entry-list"
    ></div>

    <button
        type="button"
        class="restaurant-action-btn"
        onclick="addCompanyLocation()"
        style="margin-top:10px;"
    >
        + Add Location
    </button>
</div>



<div class="owner-form-group">
    <label for="companyEmail">
        Email
    </label>

    <div
        style="
            display:flex;
            align-items:center;
            gap:10px;
        "
    >
        <input
            id="companyEmail"
            type="email"
            placeholder="Email address"
            disabled
            style="flex:1;"
        >

        <button
            type="button"
            class="restaurant-action-btn"
            onclick="toggleCompanyFieldEdit(this, ['companyEmail'])"
        >
            &#9998; Edit
        </button>
    </div>
</div>

                <div style="height: 15px;"></div>





                <div class="company-settings-actions">

                    <button
                        type="button"
                        class="restaurant-action-btn"
                        onclick="closeOwnerActionPanel()"
                    >
                        Cancel
                    </button>

                    <button
                        id="companySettingsSaveButton"
                        type="button"
                        class="restaurant-action-btn company-settings-save-button"
                        onclick="saveCompanySettings()"
                    >
                        Save Changes
                    </button>

                </div>

            </form>
        `
    );

    loadCompanySettings();
}

let companyPhoneNumbers = [];
let companyLocations = [];

function toggleCompanyFieldEdit(button, fieldIds) {

    const fields =
        fieldIds
            .map(id => document.getElementById(id))
            .filter(Boolean);

    if (!button || !fields.length) {
        return;
    }

    const isEditing =
        fields.some(field => field.disabled);

    fields.forEach(field => {
        field.disabled = !isEditing;
    });

    const logoInput =
        fieldIds.includes('companyLogoInput')
            ? document.getElementById('companyLogoInput')
            : null;

    if (logoInput) {
        const logoLabel =
            document.querySelector(
                'label[for="companyLogoInput"]'
            );

        if (logoLabel) {
            logoLabel.style.cursor =
                isEditing
                    ? 'pointer'
                    : 'not-allowed';
        }
    }

    button.textContent =
        isEditing
            ? 'Done'
            : fieldIds.includes('companyLogoInput')
                ? '✎ Edit Logo'
                : '✎ Edit';

    button.setAttribute(
        'aria-pressed',
        String(isEditing)
    );

    if (isEditing && fields[0].type !== 'file') {
        fields[0].focus();
    }
}


function renderCompanyPhones() {
    const list =
        document.getElementById('companyPhoneList');

    if (!list) {
        return;
    }

    list.innerHTML = '';

    companyPhoneNumbers.forEach((phone, index) => {
        const row =
            document.createElement('div');

        row.style.cssText =
            'display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;background:#fff;';

        const input =
            document.createElement('input');

        input.type = 'text';
        input.value = phone;
        input.disabled = true;
        input.style.cssText =
            'flex:1;border:none;outline:none;background:transparent;font-size:15px;';

        input.addEventListener('input', () => {
            companyPhoneNumbers[index] =
                input.value;
        });

        const editButton =
            document.createElement('button');

        editButton.type = 'button';
        editButton.className =
            'restaurant-action-btn';
        editButton.textContent =
            '✎ Edit';

        editButton.onclick = () => {
            const isEditing =
                input.disabled;

            input.disabled =
                !isEditing;

            editButton.textContent =
                isEditing
                    ? 'Done'
                    : '✎ Edit';

            editButton.setAttribute(
                'aria-pressed',
                String(isEditing)
            );

            if (isEditing) {
                input.focus();
            }
        };

        const deleteButton =
            document.createElement('button');

        deleteButton.type = 'button';
        deleteButton.className =
            'restaurant-action-btn';
        deleteButton.innerHTML =
            '&#128465; Delete';

        deleteButton.onclick = () => {
            companyPhoneNumbers.splice(index, 1);
            renderCompanyPhones();
        };

        row.appendChild(input);
        row.appendChild(editButton);
        row.appendChild(deleteButton);

        list.appendChild(row);
    });
}

function addCompanyPhone() {
    companyPhoneNumbers.push('');
    renderCompanyPhones();
}


function renderCompanyLocations() {
    const list =
        document.getElementById('companyLocationList');

    if (!list) {
        return;
    }

    list.innerHTML = '';

    if (companyLocations.length === 0) {
        const emptyMessage =
            document.createElement('div');

        emptyMessage.textContent =
            'No locations added yet.';

        emptyMessage.style.cssText =
            'color:#777;font-size:14px;padding:8px 0;';

        list.appendChild(emptyMessage);

        return;
    }

    companyLocations.forEach((location, index) => {
        const row =
            document.createElement('div');

        row.className =
            'profile-entry profile-location-entry';

        const fields =
            document.createElement('div');

        fields.className =
            'profile-entry-fields';

        const nameInput =
            document.createElement('input');

        nameInput.type = 'text';
        nameInput.className =
            'profile-location-name';
        nameInput.placeholder =
            'Location name';
        nameInput.value =
            location.name || '';
        nameInput.disabled = true;

        nameInput.addEventListener('input', () => {
            companyLocations[index].name =
                nameInput.value;
        });

        const urlInput =
            document.createElement('input');

        urlInput.type = 'url';
        urlInput.className =
            'profile-location-url';
        urlInput.placeholder =
            'Google Maps URL';
        urlInput.value =
            location.url || '';
        urlInput.disabled = true;

        urlInput.addEventListener('input', () => {
            companyLocations[index].url =
                urlInput.value;
        });

        fields.appendChild(nameInput);
        fields.appendChild(urlInput);

        const actions =
            document.createElement('div');

        actions.style.cssText =
            'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';

        const editButton =
            document.createElement('button');

        editButton.type = 'button';
        editButton.className =
            'restaurant-action-btn';
        editButton.textContent =
            '✎ Edit';

        editButton.onclick = () => {
            const isEditing =
                nameInput.disabled ||
                urlInput.disabled;

            nameInput.disabled =
                !isEditing;

            urlInput.disabled =
                !isEditing;

            editButton.textContent =
                isEditing
                    ? 'Done'
                    : '✎ Edit';

            editButton.setAttribute(
                'aria-pressed',
                String(isEditing)
            );

            if (isEditing) {
                nameInput.focus();
            }
        };

        const deleteButton =
            document.createElement('button');

        deleteButton.type = 'button';
        deleteButton.className =
            'restaurant-action-btn';
        deleteButton.innerHTML =
            '&#128465; Delete';

        deleteButton.onclick = () => {
            companyLocations.splice(index, 1);
            renderCompanyLocations();

        };

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        row.appendChild(fields);
        row.appendChild(actions);

        list.appendChild(row);
    });
}

function addCompanyLocation() {
    companyLocations.push({
        name: '',
        url: ''
    });

    renderCompanyLocations();
}

let companyContent = [];

function renderCompanyContent(expandedIndex = -1) {
    const list =
        document.getElementById('companyContentList');

    if (!list) {
        return;
    }

    list.innerHTML = '';

    companyContent.forEach((item, index) => {
        const row =
            document.createElement('div');

        row.dataset.companyContentRow = 'true';
        row.dataset.companyContentIndex = String(index);
        row.style.cssText =
            'display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid #ddd;border-radius:10px;background:#fff;margin-bottom:10px;';

        const summary =
            document.createElement('div');

        summary.style.cssText =
            'display:flex;align-items:center;gap:12px;min-width:0;';

        const summaryText =
            document.createElement('div');

        summaryText.style.cssText =
            'display:flex;flex:1;flex-direction:column;gap:4px;min-width:0;';

        const positionLabel =
            document.createElement('span');

        const ordinalSuffix =
            index % 10 === 1 && index % 100 !== 11
                ? 'st'
                : index % 10 === 2 && index % 100 !== 12
                    ? 'nd'
                    : index % 10 === 3 && index % 100 !== 13
                        ? 'rd'
                        : 'th';

        positionLabel.textContent =
            `${index + 1}${ordinalSuffix}`;

        positionLabel.style.cssText =
            'color:#766960;font-size:12px;font-weight:600;flex:none;';

        const topicSummary =
            document.createElement('strong');

        const subTopicSummary =
            document.createElement('span');

        subTopicSummary.style.cssText =
            'color:#766960;font-size:13px;';

        const summaryImage =
            document.createElement('img');

        summaryImage.src =
            item.image || ownerDefaultImage;

        summaryImage.alt =
            item.topic || item.subTopic || 'Content Image';

        summaryImage.style.cssText =
            'width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #ddd;flex:none;';

        const updateSummary = () => {
            topicSummary.textContent =
                item.topic || 'Untitled topic';

            subTopicSummary.textContent =
                item.subTopic || 'No subtopic';

            summaryImage.src =
                item.image || ownerDefaultImage;

            summaryImage.alt =
                item.topic || item.subTopic || 'Content Image';
        };

        updateSummary();

        summaryText.appendChild(topicSummary);
        summaryText.appendChild(subTopicSummary);
        summary.appendChild(positionLabel);
        summary.appendChild(summaryText);
        summary.appendChild(summaryImage);

        const dragHandle =
            document.createElement('button');

        dragHandle.type = 'button';
        dragHandle.textContent = '☷';
        dragHandle.title = 'Hold and drag to reorder';
        dragHandle.setAttribute(
            'aria-label',
            `Hold and drag to reorder content item ${index + 1}`
        );
        dragHandle.style.cssText =
            'border:0;background:transparent;color:#766960;font-size:22px;cursor:grab;touch-action:none;padding:6px;flex:none;';
        summary.appendChild(dragHandle);

        let holdTimer;
        let isDragging = false;
        let pointerStartX = 0;
        let pointerStartY = 0;

        const finishReordering = () => {
            if (!isDragging) {
                return;
            }

            isDragging = false;
            row.style.opacity = '';
            row.style.borderColor = '#ddd';
            row.style.boxShadow = '';

            const reorderedIndexes =
                Array.from(list.children).map(element =>
                    Number(element.dataset.companyContentIndex)
                );

            const reorderedIndex =
                reorderedIndexes.indexOf(
                    Number(row.dataset.companyContentIndex)
                );

            companyContent =
                reorderedIndexes.map(oldIndex => companyContent[oldIndex]);

            renderCompanyContent(
                row.querySelector('[aria-expanded="true"]')
                    ? reorderedIndex
                    : -1
            );
        };

        dragHandle.addEventListener('pointerdown', event => {
            if (event.button !== 0 || !event.isPrimary) {
                return;
            }

            pointerStartX = event.clientX;
            pointerStartY = event.clientY;

            if (dragHandle.setPointerCapture) {
                dragHandle.setPointerCapture(event.pointerId);
            }

            holdTimer = setTimeout(() => {
                isDragging = true;
                row.style.opacity = '0.65';
                row.style.borderColor = '#a8792e';
                row.style.boxShadow = '0 4px 14px rgba(0,0,0,.16)';
            }, 450);
        });

        dragHandle.addEventListener('pointermove', event => {
            if (!isDragging) {
                if (
                    Math.abs(event.clientX - pointerStartX) > 8 ||
                    Math.abs(event.clientY - pointerStartY) > 8
                ) {
                    clearTimeout(holdTimer);
                }
                return;
            }

            const target =
                document.elementFromPoint(event.clientX, event.clientY);

            const targetRow =
                target && target.closest('[data-company-content-row]');

            if (!targetRow || targetRow === row || targetRow.parentElement !== list) {
                return;
            }

            const targetBounds =
                targetRow.getBoundingClientRect();

            if (event.clientY < targetBounds.top + targetBounds.height / 2) {
                list.insertBefore(row, targetRow);
            } else {
                list.insertBefore(row, targetRow.nextSibling);
            }
        });

        dragHandle.addEventListener('pointerup', () => {
            clearTimeout(holdTimer);
            finishReordering();
        });

        dragHandle.addEventListener('pointercancel', () => {
            clearTimeout(holdTimer);
            finishReordering();
        });

        dragHandle.addEventListener('lostpointercapture', () => {
            clearTimeout(holdTimer);
            finishReordering();
        });

        const topicInput =
            document.createElement('input');

        topicInput.type = 'text';
        topicInput.placeholder = 'Topic';
        topicInput.value = item.topic || '';
        topicInput.disabled = true;
        topicInput.style.cssText =
            'width:100%;box-sizing:border-box;';

        topicInput.oninput = () => {
            item.topic = topicInput.value;
            updateSummary();
        };

        const subTopicInput =
            document.createElement('input');

        subTopicInput.type = 'text';
        subTopicInput.placeholder = 'Sub Topic';
        subTopicInput.value = item.subTopic || '';
        subTopicInput.disabled = true;
        subTopicInput.style.cssText =
            'width:100%;box-sizing:border-box;';

        subTopicInput.oninput = () => {
            item.subTopic = subTopicInput.value;
            updateSummary();
        };

        const imageRow =
            document.createElement('div');

        imageRow.style.cssText =
            'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

        const imagePreview =
            document.createElement('img');

        imagePreview.src =
            item.image || ownerDefaultImage;

        imagePreview.alt = 'Content Image';

        imagePreview.style.cssText =
            'width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid #ddd;';

        const imageInput =
            document.createElement('input');

        imageInput.type = 'file';
        imageInput.accept = 'image/*';
        imageInput.disabled = true;

        imageInput.onchange = () => {
            const file =
                imageInput.files &&
                imageInput.files[0];

            if (!file) {
                return;
            }

            const reader =
                new FileReader();

            reader.onload = () => {
                item.image = reader.result;
                imagePreview.src = reader.result;
                updateSummary();
            };

            reader.readAsDataURL(file);
        };

        imageRow.appendChild(imagePreview);
        imageRow.appendChild(imageInput);

        const descriptionInput =
            document.createElement('textarea');

        descriptionInput.rows = 4;
        descriptionInput.placeholder = 'Description';
        descriptionInput.value =
            item.description || '';
        descriptionInput.disabled = true;

        descriptionInput.style.cssText =
            'width:100%;box-sizing:border-box;resize:vertical;';

        descriptionInput.oninput = () => {
            item.description =
                descriptionInput.value;
        };

        const editorFields =
            document.createElement('div');

        editorFields.style.cssText =
            'display:flex;flex-direction:column;gap:10px;';

        const actions =
            document.createElement('div');

        actions.style.cssText =
            'display:flex;gap:8px;justify-content:flex-end;';

        const editButton =
            document.createElement('button');

        editButton.type = 'button';
        editButton.className =
            'restaurant-action-btn';
        editButton.textContent =
            '✎ Edit';

        let isEditing = index === expandedIndex;

        editorFields.style.display =
            isEditing ? 'flex' : 'none';

        [
            topicInput,
            subTopicInput,
            imageInput,
            descriptionInput
        ].forEach(input => {
            input.disabled = !isEditing;
        });

        editButton.textContent =
            isEditing ? 'Done' : '✎ Edit';

        editButton.setAttribute(
            'aria-expanded',
            String(isEditing)
        );

        editButton.onclick = () => {
            isEditing = !isEditing;

            editorFields.style.display =
                isEditing ? 'flex' : 'none';

            [
                topicInput,
                subTopicInput,
                imageInput,
                descriptionInput
            ].forEach(input => {
                input.disabled = !isEditing;
            });

            editButton.textContent =
                isEditing
                    ? 'Done'
                    : '✎ Edit';

            editButton.setAttribute(
                'aria-expanded',
                String(isEditing)
            );

            if (isEditing) {
                topicInput.focus();
            }
        };

        const deleteButton =
            document.createElement('button');

        deleteButton.type = 'button';
        deleteButton.className =
            'restaurant-action-btn';
        deleteButton.innerHTML =
            '&#128465; Delete';

        deleteButton.onclick = async () => {
            const confirmed =
                await confirmDeleteCompanyContent(
                    item.topic || item.subTopic || `item ${index + 1}`
                );

            if (!confirmed) {
                return;
            }

            companyContent.splice(index, 1);
            renderCompanyContent();
        };

        const moveButton =
            (direction, label) => {
                const button =
                    document.createElement('button');

                button.type = 'button';
                button.className =
                    'restaurant-action-btn';
                button.textContent = label;
                button.title =
                    direction < 0
                        ? 'Move content up'
                        : 'Move content down';
                button.disabled =
                    direction < 0
                        ? index === 0
                        : index === companyContent.length - 1;

                button.onclick = () => {
                    const [movedItem] =
                        companyContent.splice(index, 1);

                    companyContent.splice(
                        index + direction,
                        0,
                        movedItem
                    );

                    renderCompanyContent(
                        isEditing
                            ? index + direction
                            : -1
                    );
                };

                return button;
            };

        actions.appendChild(moveButton(-1, '↑'));
        actions.appendChild(moveButton(1, '↓'));
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        row.appendChild(summary);
        summary.insertBefore(dragHandle, summary.firstChild);
        editorFields.appendChild(topicInput);
        editorFields.appendChild(subTopicInput);
        editorFields.appendChild(imageRow);
        editorFields.appendChild(descriptionInput);
        row.appendChild(editorFields);
        row.appendChild(actions);

        list.appendChild(row);
    });
}

function addCompanyContent() {
    companyContent.push({
        topic: '',
        subTopic: '',
        image: '',
        description: ''
    });

    renderCompanyContent(companyContent.length - 1);
}

function confirmDeleteCompanyContent(itemLabel) {
    const previousFocus =
        document.activeElement;

    const backdrop =
        document.createElement('div');

    backdrop.className =
        'company-content-delete-backdrop';

    backdrop.innerHTML = `
        <section
            class="company-content-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="companyContentDeleteTitle"
            aria-describedby="companyContentDeleteMessage"
            tabindex="-1">
            <div class="company-content-delete-icon" aria-hidden="true">!</div>
            <h2 id="companyContentDeleteTitle">Delete this content?</h2>
            <p class="company-content-delete-message" id="companyContentDeleteMessage"></p>
            <div class="company-content-delete-actions">
                <button type="button" class="company-content-delete-cancel">
                    Keep content
                </button>
                <button type="button" class="company-content-delete-confirm">
                    Yes, delete
                </button>
            </div>
        </section>
    `;

    const dialog =
        backdrop.querySelector('.company-content-delete-dialog');

    const message =
        backdrop.querySelector('#companyContentDeleteMessage');

    const cancelButton =
        backdrop.querySelector('.company-content-delete-cancel');

    const confirmButton =
        backdrop.querySelector('.company-content-delete-confirm');

    if (!dialog || !message || !cancelButton || !confirmButton) {
        throw new Error(
            'Unable to create the company content delete confirmation dialog.'
        );
    }

    message.textContent =
        `“${itemLabel}” will be removed from the Company Profile when you save. This action cannot be undone.`;

    document.body.appendChild(backdrop);
    cancelButton.focus();

    return new Promise(resolve => {
        let finished = false;

        const finish = confirmed => {
            if (finished) {
                return;
            }

            finished = true;
            document.removeEventListener(
                'keydown',
                handleDialogKeydown
            );
            backdrop.remove();

            if (
                previousFocus instanceof HTMLElement &&
                previousFocus.isConnected
            ) {
                previousFocus.focus();
            }

            resolve(confirmed);
        };

        const handleDialogKeydown = event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                finish(false);
                return;
            }

            if (event.key === 'Tab') {
                const focusable = [
                    cancelButton,
                    confirmButton
                ];

                const currentIndex =
                    focusable.indexOf(document.activeElement);

                if (currentIndex === -1) {
                    event.preventDefault();
                    cancelButton.focus();
                } else if (event.shiftKey && currentIndex === 0) {
                    event.preventDefault();
                    confirmButton.focus();
                } else if (!event.shiftKey && currentIndex === 1) {
                    event.preventDefault();
                    cancelButton.focus();
                }
            }
        };

        cancelButton.addEventListener(
            'click',
            () => finish(false),
            { once: true }
        );

        confirmButton.addEventListener(
            'click',
            () => finish(true),
            { once: true }
        );

        backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
                finish(false);
            }
        });

        document.addEventListener(
            'keydown',
            handleDialogKeydown
        );
    });
}

async function loadCompanySettings() {

    try {

        const response =
            await fetch(
                '/api/owner/company-settings',
                {
                    credentials: 'include'
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(
                data.message ||
                'Unable to load company settings.'
            );
        }

        document.getElementById('companyName').value =
            data.settings.companyName || '';

        document.getElementById('companySlogan').value =
            data.settings.slogan || '';

        companyPhoneNumbers =
            Array.isArray(data.settings.phoneNumbers)
                ? data.settings.phoneNumbers
                : (data.settings.phone ? [data.settings.phone] : []);

        renderCompanyPhones();

companyLocations =
    Array.isArray(data.settings.addresses)
        ? data.settings.addresses
        : [];

renderCompanyLocations();

document.getElementById('companyEmail').value =
    data.settings.email || '';

ownerDefaultImage =
    data.settings.defaultImage || 'image/z-menu.jpg';

companyContent = Array.isArray(data.settings.companyContent) ? data.settings.companyContent : [];

renderCompanyContent();

        const logoPreview =
            document.getElementById('companyLogoPreview');

        if (logoPreview) {
            logoPreview.src =
                data.settings.logo ||
                ownerDefaultImage;
        }
    } catch (error) {

        console.error(
            '[company-settings:get] Error:',
            error
        );

    }
}


function previewCompanyLogo(event) {
    const file = event.target.files && event.target.files[0];
    const preview = document.getElementById('companyLogoPreview');

    if (!file || !preview) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {
        preview.src = reader.result;
    };

    reader.readAsDataURL(file);
}

async function saveCompanySettings() {

    showOwnerLoading('Saving...');

    const saveButton =
        document.getElementById('companySettingsSaveButton');

    if (saveButton) {
        saveButton.disabled = true;
    }
    const logoInput =
        document.getElementById('companyLogoInput');

    let companyLogo = '';

    if (
        logoInput &&
        logoInput.files &&
        logoInput.files.length > 0
    ) {
        companyLogo =
            await new Promise((resolve, reject) => {

                const reader =
                    new FileReader();

                reader.onload = () => {
                    resolve(reader.result);
                };

                reader.onerror = () => {
                    reject(
                        new Error(
                            'Unable to read company logo.'
                        )
                    );
                };

                reader.readAsDataURL(
                    logoInput.files[0]
                );
            });
    } else {
        const logoPreview =
            document.getElementById(
                'companyLogoPreview'
            );

        if (
            logoPreview &&
            logoPreview.src &&
            !logoPreview.src.endsWith(
                'image/z%20logo.jpeg'
            )
        ) {
            companyLogo =
                logoPreview.src;
        }
    }


    try {

        const response =
            await fetch(
                '/api/owner/company-settings',
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    credentials: 'include',

                    body: JSON.stringify({
                        companyName:
                            document.getElementById(
                                'companyName'
                            ).value,

                        slogan:
                            document.getElementById(
                                'companySlogan'
                            ).value,

                        phoneNumbers: companyPhoneNumbers
    .map(phone => String(phone || '').trim())
    .filter(Boolean),

addresses: companyLocations
    .map(location => ({
        name: String(location.name || '').trim(),
        url: String(location.url || '').trim()
    }))
    .filter(location => location.name),

email: document.getElementById('companyEmail').value,

                        address:
    companyLocations.length > 0
        ? String(companyLocations[0].name || '').trim()
        : '',


                        companyContent:
                            companyContent
                                .map(item => ({
                                    topic: String(item.topic || '').trim(),
                                    subTopic: String(item.subTopic || '').trim(),
                                    image: String(item.image || ''),
                                    description: String(item.description || '').trim()
                                }))
                                .filter(item =>
                                    item.topic ||
                                    item.subTopic ||
                                    item.image ||
                                    item.description
                                ),
                        logo:
                            companyLogo
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(
                data.message ||
                'Unable to save company settings.'
            );
        }
        const loadingOverlay =
            document.getElementById('ownerLoadingOverlay');

        if (loadingOverlay) {
            loadingOverlay.remove();
        }

        showOwnerNotification(
            'Saved successfully',
            'success'
        );

        if (saveButton) {
            saveButton.disabled = false;
        }


    } catch (error) {

        console.error(
            '[company-settings:update] Error:',
            error
        );

        
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
        }
        const loadingOverlay = document.getElementById('ownerLoadingOverlay');

        if (loadingOverlay) {
            loadingOverlay.remove();
        }

        showOwnerNotification('Unable to save', 'error');

    }
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

            height:'calc(100vh - 32px)',

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
        maxHeight:'100%',
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

}


/* ================================================================
   CLOSE ACTION PANEL
   COMPLETE BLUR FIX
   ================================================================ */

function closeOwnerActionPanel() {

        duplicateSourceRestaurant = null;

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

function appearanceHexToRgb(hex) {

    const clean =
        String(hex || '').replace('#', '');


    if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
        return '';
    }


    const r =
        parseInt(
            clean.slice(0, 2),
            16
        );

    const g =
        parseInt(
            clean.slice(2, 4),
            16
        );

    const b =
        parseInt(
            clean.slice(4, 6),
            16
        );


    return `${r}, ${g}, ${b}`;
}


function appearanceRgbToHex(rgb) {

    const match =
        String(rgb || '').match(
            /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/
        );


    if (!match) {
        return null;
    }


    const values =
        match
            .slice(1)
            .map(Number);


    if (
        values.some(
            value =>
                value < 0 ||
                value > 255
        )
    ) {
        return null;
    }


    return '#' +
        values
            .map(
                value =>
                    value
                        .toString(16)
                        .padStart(2, '0')
            )
            .join('');
}

function parseAppearanceGradient(value) {

    const match =
        String(value || '').match(
            /^linear-gradient\(\s*(\d{1,3})deg\s*,\s*(#[0-9a-fA-F]{6}(?:\s*,\s*#[0-9a-fA-F]{6}){1,7})\s*\)$/i
        );

    if (!match) {
        return null;
    }

    const angle =
        Number(match[1]);

    if (angle > 360) {
        return null;
    }

    return {
        angle,
        colors: match[2]
            .split(',')
            .map(color => color.trim().toLowerCase())
    };
}


function renderAppearanceGradientStops(field, colors) {

    const stopsContainer =
        document.getElementById(
            `appearance_${field}_gradient_stops`
        );

    if (!stopsContainer) return;

    const safeColors =
        colors
            .filter(color =>
                /^#[0-9a-fA-F]{6}$/.test(color)
            )
            .slice(0, 8);

    stopsContainer.innerHTML =
        safeColors
            .map((color, index) => `
                <div class="caffemenu-gradient-stop">
                    <label>
                        <span>Stop ${index + 1}</span>
                        <input
                            type="color"
                            class="caffemenu-gradient-stop-color"
                            value="${color}"
                            aria-label="Gradient color stop ${index + 1}"
                            oninput="appearanceGradientChanged('${field}')">
                    </label>
                    <button
                        type="button"
                        aria-label="Remove color stop ${index + 1}"
                        ${safeColors.length <= 2 ? 'disabled' : ''}
                        onclick="removeAppearanceGradientStop('${field}', ${index})">
                        Remove
                    </button>
                </div>
            `)
            .join('');

    const addButton =
        document.getElementById(
            `appearance_${field}_add_stop`
        );

    if (addButton) {
        addButton.disabled =
            safeColors.length >= 8;
    }

    appearanceGradientChanged(field);
}


function appearanceGradientChanged(field) {

    const editor =
        document.getElementById(
            `appearance_${field}_gradient`
        );

    const preview =
        document.getElementById(
            `appearance_${field}_gradient_preview`
        );

    const angleInput =
        document.getElementById(
            `appearance_${field}_gradient_angle`
        );

    if (!editor || !preview || !angleInput) return;

    const colors =
        Array.from(
            editor.querySelectorAll(
                '.caffemenu-gradient-stop-color'
            )
        ).map(input => input.value);

    preview.style.background =
        `linear-gradient(${Number(angleInput.value)}deg, ${colors.join(', ')})`;
}


function addAppearanceGradientStop(field) {

    const editor =
        document.getElementById(
            `appearance_${field}_gradient`
        );

    if (!editor) return;

    const colors =
        Array.from(
            editor.querySelectorAll(
                '.caffemenu-gradient-stop-color'
            )
        ).map(input => input.value);

    if (colors.length >= 8) return;

    colors.push('#ffffff');
    renderAppearanceGradientStops(field, colors);
}


function removeAppearanceGradientStop(field, index) {

    const editor =
        document.getElementById(
            `appearance_${field}_gradient`
        );

    if (!editor) return;

    const colors =
        Array.from(
            editor.querySelectorAll(
                '.caffemenu-gradient-stop-color'
            )
        ).map(input => input.value);

    if (colors.length <= 2) return;

    colors.splice(index, 1);
    renderAppearanceGradientStops(field, colors);
}


function appearanceModeChanged(field) {

    const modeInput =
        document.getElementById(
            `appearance_${field}_mode`
        );

    const solidControls =
        document.getElementById(
            `appearance_${field}_solid`
        );

    const gradientEditor =
        document.getElementById(
            `appearance_${field}_gradient`
        );

    if (!modeInput || !solidControls || !gradientEditor) {
        return;
    }

    const useGradient =
        modeInput.value === 'gradient';

    solidControls.hidden =
        useGradient;

    gradientEditor.hidden =
        !useGradient;

    if (useGradient) {
        appearanceGradientChanged(field);
    }
}


function getRestaurantAppearanceFormValues() {

    const appearance = {};


    for (
        const [field] of APPEARANCE_FIELDS
    ) {

        if (APPEARANCE_BACKGROUND_FIELDS.has(field)) {

            const modeInput =
                document.getElementById(
                    `appearance_${field}_mode`
                );

            if (modeInput?.value === 'gradient') {

                const editor =
                    document.getElementById(
                        `appearance_${field}_gradient`
                    );

                const angleInput =
                    document.getElementById(
                        `appearance_${field}_gradient_angle`
                    );

                const colors =
                    Array.from(
                        editor?.querySelectorAll(
                            '.caffemenu-gradient-stop-color'
                        ) || []
                    ).map(input => input.value);

                const angle =
                    Number(angleInput?.value);

                if (
                    colors.length < 2 ||
                    colors.length > 8 ||
                    !Number.isInteger(angle) ||
                    angle < 0 ||
                    angle > 360 ||
                    colors.some(color =>
                        !/^#[0-9a-fA-F]{6}$/.test(color)
                    )
                ) {
                    throw new Error(
                        `Invalid gradient value for ${field}.`
                    );
                }

                appearance[field] =
                    `linear-gradient(${angle}deg, ${colors.join(', ')})`;

                continue;
            }
        }

        const input =
            document.getElementById(
                `appearance_${field}`
            );


        if (
            !input ||
            !/^#[0-9a-fA-F]{6}$/.test(
                input.value
            )
        ) {
            throw new Error(
                `Invalid color value for ${field}.`
            );
        }


        appearance[field] =
            input.value.toLowerCase();
    }


    return appearance;
}


function setRestaurantAppearanceFormValues(
    appearance
) {

    for (
        const [field] of APPEARANCE_FIELDS
    ) {

        const value =
            appearance[field] ||
            DEFAULT_APPEARANCE[field];

        if (APPEARANCE_BACKGROUND_FIELDS.has(field)) {

            const gradient =
                parseAppearanceGradient(value);

            const modeInput =
                document.getElementById(
                    `appearance_${field}_mode`
                );

            if (modeInput) {

                modeInput.value =
                    gradient ? 'gradient' : 'solid';

                renderAppearanceGradientStops(
                    field,
                    gradient
                        ? gradient.colors
                        : [
                            DEFAULT_APPEARANCE[field],
                            '#ffffff'
                        ]
                );

                const angleInput =
                    document.getElementById(
                        `appearance_${field}_gradient_angle`
                    );

                if (angleInput) {
                    angleInput.value =
                        gradient
                            ? String(gradient.angle)
                            : '90';
                }

                appearanceModeChanged(field);
            }
        }

        const colorInput =
            document.getElementById(
                `appearance_${field}`
            );


        const rgbInput =
            document.getElementById(
                `appearance_${field}_rgb`
            );


        if (colorInput) {

            colorInput.value =
                /^#[0-9a-fA-F]{6}$/.test(value)
                    ? value
                    : DEFAULT_APPEARANCE[field];
        }


        if (rgbInput) {

            rgbInput.value =
                appearanceHexToRgb(
                    colorInput?.value ||
                        DEFAULT_APPEARANCE[field]
                );
        }

        updateAppearanceSolidColorPreview(field);
    }
}

function updateAppearanceSolidColorPreview(field) {

    const colorInput =
        document.getElementById(
            `appearance_${field}`
        );

    const swatch =
        document.getElementById(
            `appearance_${field}_solid_swatch`
        );

    const valueLabel =
        document.getElementById(
            `appearance_${field}_solid_value`
        );

    if (!colorInput) return;

    const color =
        colorInput.value.toLowerCase();

    if (swatch) {
        swatch.style.backgroundColor =
            color;
    }

    if (valueLabel) {
        valueLabel.textContent =
            color;
    }
}


function appearanceColorChanged(field) {

    const colorInput =
        document.getElementById(
            `appearance_${field}`
        );


    const rgbInput =
        document.getElementById(
            `appearance_${field}_rgb`
        );


    const hexInput =
        document.getElementById(
            `appearance_${field}_hex`
        );


    if (!colorInput) return;


    if (rgbInput) {

        rgbInput.value =
            appearanceHexToRgb(
                colorInput.value
            );
    }


    if (hexInput) {

        hexInput.value =
            colorInput.value.toLowerCase();
    }

    updateAppearanceSolidColorPreview(field);
}


function appearanceRgbChanged(field) {

    const rgbInput =
        document.getElementById(
            `appearance_${field}_rgb`
        );


    const colorInput =
        document.getElementById(
            `appearance_${field}`
        );


    const hexInput =
        document.getElementById(
            `appearance_${field}_hex`
        );


    if (!rgbInput || !colorInput) return;


    const hex =
        appearanceRgbToHex(
            rgbInput.value
        );


    if (!hex) {

        rgbInput.value =
            appearanceHexToRgb(
                colorInput.value
            );

        return;
    }


    colorInput.value =
        hex;


    if (hexInput) {

        hexInput.value =
            hex;
    }

    updateAppearanceSolidColorPreview(field);
}


function appearanceHexChanged(field) {

    const hexInput =
        document.getElementById(
            `appearance_${field}_hex`
        );


    const colorInput =
        document.getElementById(
            `appearance_${field}`
        );


    const rgbInput =
        document.getElementById(
            `appearance_${field}_rgb`
        );


    if (!hexInput || !colorInput) return;


    const value =
        hexInput.value.trim();


    if (!/^#[0-9a-fA-F]{6}$/.test(value)) {

        hexInput.value =
            colorInput.value.toLowerCase();

        return;
    }


    colorInput.value =
        value.toLowerCase();


    if (rgbInput) {

        rgbInput.value =
            appearanceHexToRgb(
                colorInput.value
            );
    }

    updateAppearanceSolidColorPreview(field);
}

function appearanceFieldHtml(field, label, value) {
    const isBackground =
        APPEARANCE_BACKGROUND_FIELDS.has(field);

    const safeValue =
        /^#[0-9a-fA-F]{6}$/.test(value || '')
            ? value
            : DEFAULT_APPEARANCE[field];

    const savedGradient =
        isBackground
            ? parseAppearanceGradient(value)
            : null;

    const initialGradientColors =
        savedGradient
            ? savedGradient.colors
            : [safeValue, '#ffffff'];

    const initialGradientAngle =
        savedGradient
            ? savedGradient.angle
            : 90;

    const initialGradient =
        `linear-gradient(${initialGradientAngle}deg, ${initialGradientColors.join(', ')})`;

    const jsField =
        String(field).replace(/'/g, "\\'");

    return `
        <div class="caffemenu-appearance-field">
            <label class="caffemenu-appearance-label" for="appearance_${field}">${label}</label>

            ${isBackground ? `
                <label class="caffemenu-appearance-mode-label" for="appearance_${field}_mode">
                    Fill style
                    <select
                        id="appearance_${field}_mode"
                        class="caffemenu-appearance-mode"
                        onchange="appearanceModeChanged('${jsField}')">
                        <option value="solid" ${savedGradient ? '' : 'selected'}>Solid color</option>
                        <option value="gradient" ${savedGradient ? 'selected' : ''}>Multi-color gradient</option>
                    </select>
                </label>
            ` : ''}

            <div
                id="appearance_${field}_solid"
                class="caffemenu-appearance-controls"
                ${savedGradient ? 'hidden' : ''}>

                <div class="caffemenu-solid-color-preview">
                    <span
                        id="appearance_${field}_solid_swatch"
                        class="caffemenu-solid-color-swatch"
                        style="background-color:${safeValue}"></span>
                    <span class="caffemenu-solid-color-info">
                        <span>Current color</span>
                        <strong id="appearance_${field}_solid_value">${safeValue.toLowerCase()}</strong>
                    </span>
                    <input
                        type="color"
                        id="appearance_${field}"
                        value="${safeValue}"
                        aria-label="Choose ${label} color"
                        oninput="appearanceColorChanged('${jsField}')">
                </div>

                <label class="caffemenu-appearance-input-label">
                    RGB
                    <input
                        type="text"
                        id="appearance_${field}_rgb"
                        value="${appearanceHexToRgb(safeValue)}"
                        placeholder="R, G, B"
                        onchange="appearanceRgbChanged('${jsField}')">
                </label>

                <label class="caffemenu-appearance-input-label">
                    HEX
                    <input
                        type="text"
                        id="appearance_${field}_hex"
                        value="${safeValue}"
                        maxlength="7"
                        onchange="appearanceHexChanged('${jsField}')">
                </label>

            </div>

            ${isBackground ? `
                <div
                    id="appearance_${field}_gradient"
                    class="caffemenu-appearance-gradient"
                    ${savedGradient ? '' : 'hidden'}>
                    <div
                        id="appearance_${field}_gradient_preview"
                        class="caffemenu-appearance-gradient-preview"
                        style="background:${initialGradient}"></div>
                    <label class="caffemenu-gradient-angle-label">
                        Direction
                        <input
                            type="range"
                            id="appearance_${field}_gradient_angle"
                            min="0"
                            max="360"
                            step="1"
                            value="${initialGradientAngle}"
                            oninput="appearanceGradientChanged('${jsField}')">
                        <span>0°–360°</span>
                    </label>
                    <div
                        id="appearance_${field}_gradient_stops"
                        class="caffemenu-gradient-stops"></div>
                    <button
                        type="button"
                        id="appearance_${field}_add_stop"
                        class="caffemenu-gradient-add"
                        onclick="addAppearanceGradientStop('${jsField}')">
                        + Add color stop
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}
async function openRestaurantAppearance(
    restaurantId
    ) {

    if (!restaurantId) return;


    try {

        const token =
            getAdminToken();


        const response =
            await fetch(
                `/api/owner/restaurants/${restaurantId}/appearance`,
                {
                    method: 'GET',
                    headers: {
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


        const appearance = {
            ...DEFAULT_APPEARANCE,
            ...(data.appearance || {})
        };

        const restaurant =
            getRestaurantById(restaurantId);

        const restaurantName =
            getRestaurantName(restaurant);


        openOwnerActionPanel(
            'Appearance',

            '<div class="caffemenu-appearance-wrap" data-appearance-restaurant-id="' +
                restaurantId +
                '">' +

                '<div class="caffemenu-appearance-intro">' +
                    '<p class="caffemenu-appearance-intro-kicker">Restaurant styling</p>' +
                    '<h2>Make the menu yours</h2>' +
                    '<p>Choose colors for the customer menu. Use solid colors or build multi-color gradients for background areas.</p>' +
                    '<div class="caffemenu-appearance-editing">' +
                        '<span class="caffemenu-appearance-editing-mark" aria-hidden="true">R</span>' +
                        '<span class="caffemenu-appearance-editing-copy">' +
                            '<span>Currently editing</span>' +
                            '<strong>' +
                                escapeHtml(restaurantName) +
                            '</strong>' +
                        '</span>' +
                    '</div>' +
                '</div>' +

                '<div class="caffemenu-appearance-section">' +
                    '<div class="caffemenu-appearance-section-heading">' +
                        '<span class="caffemenu-appearance-section-number">01</span>' +
                        '<div><h3>Header</h3><p>Set the header surface and restaurant name styling.</p></div>' +
                    '</div>' +
                    '<div class="caffemenu-appearance-grid">' +

                        appearanceFieldHtml(
                            'header_background',
                            'Header Background',
                            appearance.header_background
                        ) +

                        appearanceFieldHtml(
                            'restaurant_name',
                            'Restaurant Name',
                            appearance.restaurant_name
                        ) +

                        appearanceFieldHtml(
                            'restaurant_name_text',
                            'Restaurant Name Text',
                            appearance.restaurant_name_text
                        ) +

                    '</div>' +
                '</div>' +

                '<div class="caffemenu-appearance-section">' +
                    '<div class="caffemenu-appearance-section-heading">' +
                        '<span class="caffemenu-appearance-section-number">02</span>' +
                        '<div><h3>Category buttons</h3><p>Choose the default button colors and the colors for the selected category.</p></div>' +
                    '</div>' +
                    '<div class="caffemenu-appearance-grid">' +

                        appearanceFieldHtml(
                            'button_background',
                            'Button Background',
                            appearance.button_background
                        ) +

                        appearanceFieldHtml(
                            'button_text',
                            'Button Text',
                            appearance.button_text
                        ) +

                        appearanceFieldHtml(
                            'selected_button',
                            'Selected Button',
                            appearance.selected_button
                        ) +

                        appearanceFieldHtml(
                            'selected_button_text',
                            'Selected Button Text',
                            appearance.selected_button_text
                        ) +

                    '</div>' +
                '</div>' +

                '<div class="caffemenu-appearance-section">' +
                    '<div class="caffemenu-appearance-section-heading">' +
                        '<span class="caffemenu-appearance-section-number">03</span>' +
                        '<div><h3>Action buttons</h3><p>Style the add-to-cart button on each menu item and the fixed Cart button separately.</p></div>' +
                    '</div>' +
                    '<div class="caffemenu-appearance-grid">' +
                        appearanceFieldHtml(
                            'add_button_background',
                            '+ Add Button Background',
                            appearance.add_button_background
                        ) +
                        appearanceFieldHtml(
                            'add_button_text',
                            '+ Add Button Text',
                            appearance.add_button_text
                        ) +
                        appearanceFieldHtml(
                            'cart_button_background',
                            'Cart Button Background',
                            appearance.cart_button_background
                        ) +
                        appearanceFieldHtml(
                            'cart_button_text',
                            'Cart Button Text',
                            appearance.cart_button_text
                        ) +
                    '</div>' +
                '</div>' +

                '<div class="caffemenu-appearance-section">' +
                    '<div class="caffemenu-appearance-section-heading">' +
                        '<span class="caffemenu-appearance-section-number">04</span>' +
                        '<div><h3>Menu items</h3><p>Adjust item cards, names, descriptions, and prices.</p></div>' +
                    '</div>' +
                    '<div class="caffemenu-appearance-grid">' +

                        appearanceFieldHtml(
                            'card_background',
                            'Card Background',
                            appearance.card_background
                        ) +

                        appearanceFieldHtml(
                            'item_name',
                            'Item Name',
                            appearance.item_name
                        ) +

                        appearanceFieldHtml(
                            'description',
                            'Description',
                            appearance.description
                        ) +

                        appearanceFieldHtml(
                            'price',
                            'Price',
                            appearance.price
                        ) +

                    '</div>' +
                '</div>' +

                '<div class="caffemenu-appearance-section">' +
                    '<div class="caffemenu-appearance-section-heading">' +
                        '<span class="caffemenu-appearance-section-number">05</span>' +
                        '<div><h3>Page background</h3><p>Set the canvas behind the menu content.</p></div>' +
                    '</div>' +
                    '<div class="caffemenu-appearance-grid">' +

                        appearanceFieldHtml(
                            'page_background',
                            'Page Background',
                            appearance.page_background
                        ) +

                    '</div>' +
                '</div>' +

                '<div class="owner-action-actions caffemenu-appearance-actions">' +

                    '<button type="button" ' +
                        'id="saveRestaurantAppearanceBtn" ' +
                        'class="owner-action-btn" ' +
                        'data-restaurant-id="' +
                        restaurantId +
                        '">Save Appearance</button>' +

                    '<button type="button" ' +
                        'id="clearRestaurantAppearanceBtn" ' +
                        'class="restaurant-action-btn" ' +
                        'data-restaurant-id="' +
                        restaurantId +
                        '">Clear All</button>' +

                '</div>' +

            '</div>'
        );


        setRestaurantAppearanceFormValues(
            appearance
        );

    } catch (error) {

        console.error(
            '[appearance:open]',
            error
        );


        showOwnerNotification(
            'Appearance could not be loaded',
            error.message ||
                'Unable to load restaurant appearance.',
            'error'
        );
    }
}

function confirmClearRestaurantAppearance() {

    const previousFocus =
        document.activeElement;

    const backdrop =
        document.createElement('div');

    backdrop.className =
        'appearance-clear-confirm-backdrop';

    backdrop.innerHTML = `
        <section
            class="appearance-clear-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="appearanceClearConfirmTitle"
            aria-describedby="appearanceClearConfirmMessage"
            tabindex="-1">
            <div class="appearance-clear-confirm-icon" aria-hidden="true">↺</div>
            <p class="appearance-clear-confirm-kicker">Reset appearance</p>
            <h2 id="appearanceClearConfirmTitle">Clear all appearance settings?</h2>
            <p
                class="appearance-clear-confirm-message"
                id="appearanceClearConfirmMessage">
                This restores the restaurant's appearance to its default colors.
                Your restaurant and menu content will not be changed.
            </p>
            <div class="appearance-clear-confirm-actions">
                <button type="button" class="appearance-clear-cancel">
                    Keep current settings
                </button>
                <button type="button" class="appearance-clear-confirm">
                    Reset appearance
                </button>
            </div>
        </section>
    `;

    const dialog =
        backdrop.querySelector(
            '.appearance-clear-confirm-dialog'
        );

    const cancelButton =
        backdrop.querySelector(
            '.appearance-clear-cancel'
        );

    const confirmButton =
        backdrop.querySelector(
            '.appearance-clear-confirm'
        );

    if (!dialog || !cancelButton || !confirmButton) {
        throw new Error(
            'Unable to create the appearance confirmation dialog.'
        );
    }

    document.body.appendChild(backdrop);
    cancelButton.focus();

    return new Promise(resolve => {

        const finish = confirmed => {
            document.removeEventListener(
                'keydown',
                handleDialogKeydown
            );
            backdrop.remove();

            if (
                previousFocus instanceof HTMLElement &&
                previousFocus.isConnected
            ) {
                previousFocus.focus();
            }

            resolve(confirmed);
        };

        const handleDialogKeydown = event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                finish(false);
                return;
            }

            if (event.key === 'Tab') {
                const focusable = [
                    cancelButton,
                    confirmButton
                ];

                const currentIndex =
                    focusable.indexOf(document.activeElement);

                if (currentIndex === -1) {
                    event.preventDefault();
                    cancelButton.focus();
                } else if (
                    event.shiftKey &&
                    (currentIndex <= 0)
                ) {
                    event.preventDefault();
                    confirmButton.focus();
                } else if (
                    !event.shiftKey &&
                    currentIndex === focusable.length - 1
                ) {
                    event.preventDefault();
                    cancelButton.focus();
                }
            }
        };

        cancelButton.addEventListener(
            'click',
            () => finish(false),
            { once: true }
        );

        confirmButton.addEventListener(
            'click',
            () => finish(true),
            { once: true }
        );

        backdrop.addEventListener(
            'click',
            event => {
                if (event.target === backdrop) {
                    finish(false);
                }
            }
        );

        document.addEventListener(
            'keydown',
            handleDialogKeydown
        );
    });
}

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
        async event => {

            const closeButton =
                event.target.closest(
                    '.owner-action-close'
                );


            if (closeButton) {

                    }


            const saveAppearanceButton =
                event.target.closest(
                    '#saveRestaurantAppearanceBtn'
                );


            if (saveAppearanceButton) {

                const restaurantId =
                    saveAppearanceButton.dataset
                        .restaurantId;


                if (!restaurantId) return;


                try {

                    const appearance =
                        getRestaurantAppearanceFormValues();


                    saveAppearanceButton.disabled =
                        true;

                    showOwnerLoading(
                        'Saving appearance...'
                    );

                    const token =
                        getAdminToken();


                    const response =
                        await fetch(
                            `/api/owner/restaurants/${restaurantId}/appearance`,
                            {
                                method: 'PUT',
                                headers: {
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
                                    JSON.stringify(
                                        appearance
                                    )
                            }
                        );


                    const data =
                        await readOwnerApiResponse(
                            response
                        );

                    const buttonAppearanceFields = [
                        'add_button_background',
                        'add_button_text',
                        'cart_button_background',
                        'cart_button_text'
                    ];

                    const unsavedButtonFields =
                        buttonAppearanceFields.filter(
                            field =>
                                data.appearance?.[field] !==
                                appearance[field]
                        );

                    if (unsavedButtonFields.length) {
                        throw new Error(
                            'The + Add and Cart settings were not confirmed by the server. Restart or redeploy the latest server.js, then save again.'
                        );
                    }


                    if (
                        data.appearance &&
                        typeof data.appearance ===
                            'object'
                    ) {

                        setRestaurantAppearanceFormValues(
                            {
                                ...DEFAULT_APPEARANCE,
                                ...data.appearance
                            }
                        );
                    }


                    showOwnerNotification(
                        'Appearance saved',
                        'Restaurant appearance has been saved successfully.',
                        'success'
                    );

                } catch (error) {

                    console.error(
                        '[appearance:save]',
                        error
                    );


                    showOwnerNotification(
                        'Appearance could not be saved',
                        error.message ||
                            'Unable to save restaurant appearance.',
                        'error'
                    );

                } finally {

                    saveAppearanceButton.disabled =
                        false;

                    hideOwnerLoading();
                }


                return;
            }


            const clearAppearanceButton =
                event.target.closest(
                    '#clearRestaurantAppearanceBtn'
                );


            if (clearAppearanceButton) {

                const restaurantId =
                    clearAppearanceButton.dataset
                        .restaurantId;


                if (!restaurantId) return;


                const confirmed =
                    await confirmClearRestaurantAppearance();

                if (!confirmed) {
                    return;
                }

                clearAppearanceButton.disabled =
                    true;


                try {

                    clearAppearanceButton.disabled =
                        true;


                    const token =
                        getAdminToken();


                    const response =
                        await fetch(
                            `/api/owner/restaurants/${restaurantId}/appearance`,
                            {
                                method: 'DELETE',
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                    Accept:
                                        'application/json'
                                },
                                credentials:
                                    'same-origin'
                            }
                        );


                    await readOwnerApiResponse(
                        response
                    );


                    setRestaurantAppearanceFormValues(
                        DEFAULT_APPEARANCE
                    );


                    showOwnerNotification(
                        'Appearance cleared',
                        'Restaurant appearance has been reset to the default theme.',
                        'success'
                    );

                } catch (error) {

                    console.error(
                        '[appearance:clear]',
                        error
                    );


                    showOwnerNotification(
                        'Appearance could not be cleared',
                        error.message ||
                            'Unable to clear restaurant appearance.',
                        'error'
                    );

                } finally {

                    clearAppearanceButton.disabled =
                        false;
                }


                return;
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

    const dashboardAccess =
    sessionStorage.getItem(
        'dashboardAccess'
    );

if (dashboardAccess !== 'super_admin') {
    window.location.replace('/admin.html');
    return;
}

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
