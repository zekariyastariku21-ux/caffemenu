let currentRestaurant = null;
let foods = {};

let restaurantProfile = {
    logo: '',
    phone_numbers: [],
    addresses: []
};

let adminLoadingTimer = null;


/* ================================================================
   REMOVE EMPTY CATEGORIES
================================================================ */

function removeEmptyCategories() {

    Object.keys(foods).forEach(category => {

        if (
            !Array.isArray(foods[category]) ||
            foods[category].length === 0
        ) {
            delete foods[category];
        }

    });

}


/* ================================================================
   PROFESSIONAL LOADING SCREEN
================================================================ */

function showAdminLoading(message = 'Please wait...') {

    clearTimeout(adminLoadingTimer);

    let overlay =
        document.getElementById('adminLoadingOverlay');

    if (!overlay) {

        overlay =
            document.createElement('div');

        overlay.id =
            'adminLoadingOverlay';

        overlay.innerHTML = `
            <div class="admin-loading-box">

                <div class="admin-loading-spinner"></div>

                <div
                    id="adminLoadingMessage"
                    class="admin-loading-message"
                ></div>

                <div class="admin-loading-submessage">
                    Please wait...
                </div>

            </div>
        `;

        const style =
            document.createElement('style');

        style.id =
            'admin-loading-style';

        style.textContent = `

            #adminLoadingOverlay {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: none;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.48);
                backdrop-filter: blur(5px);
                -webkit-backdrop-filter: blur(5px);
                cursor: wait;
            }

            #adminLoadingOverlay.active {
                display: flex;
            }

            .admin-loading-box {
                width: min(90%, 360px);
                padding: 30px 25px;
                background: #fff;
                border-radius: 18px;
                text-align: center;
                box-shadow:
                    0 20px 60px
                    rgba(0, 0, 0, 0.28);
            }

            .admin-loading-spinner {
                width: 50px;
                height: 50px;
                margin: 0 auto 18px;
                border: 5px solid #eadfd4;
                border-top-color: #4a2f22;
                border-radius: 50%;
                animation:
                    adminLoadingSpin
                    0.8s linear infinite;
            }

            .admin-loading-message {
                color: #3b2a20;
                font-size: 19px;
                font-weight: 700;
                margin-bottom: 7px;
            }

            .admin-loading-submessage {
                color: #777;
                font-size: 14px;
            }

            @keyframes adminLoadingSpin {

                from {
                    transform: rotate(0deg);
                }

                to {
                    transform: rotate(360deg);
                }

            }

            body.admin-loading-active {
                overflow: hidden;
            }

        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }

    const messageElement =
        document.getElementById(
            'adminLoadingMessage'
        );

    if (messageElement) {
        messageElement.textContent =
            message;
    }

    overlay.classList.add('active');

    document.body.classList.add(
        'admin-loading-active'
    );

}


function hideAdminLoading(minimumTime = 150) {

    clearTimeout(adminLoadingTimer);

    adminLoadingTimer =
        setTimeout(() => {

            const overlay =
                document.getElementById(
                    'adminLoadingOverlay'
                );

            if (overlay) {
                overlay.classList.remove(
                    'active'
                );
            }

            document.body.classList.remove(
                'admin-loading-active'
            );

        }, minimumTime);

}


/* ================================================================
   CENTER SCREEN MESSAGE
================================================================ */

function showMessage(text, type = 'success') {

    const oldMessage =
        document.getElementById('message');

    if (oldMessage) {
        oldMessage.style.display = 'none';
    }

    const existingPopup =
        document.getElementById(
            'adminCenterMessage'
        );

    if (existingPopup) {
        existingPopup.remove();
    }

    const popup =
        document.createElement('div');

    popup.id =
        'adminCenterMessage';

    popup.className =
        type === 'success'
            ? 'admin-center-message success'
            : 'admin-center-message error';

    popup.innerHTML = `
        <div class="admin-center-message-icon">
            ${
                type === 'success'
                    ? '✓'
                    : '!'
            }
        </div>

        <div class="admin-center-message-text">
            ${escapeHtmlForAdmin(text)}
        </div>
    `;

    if (
        !document.getElementById(
            'admin-center-message-style'
        )
    ) {

        const style =
            document.createElement('style');

        style.id =
            'admin-center-message-style';

        style.textContent = `

            #adminCenterMessage {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;

                transform:
                    translate(-50%, -50%)
                    scale(0.85);

                z-index: 1000000 !important;

                display: flex;
                align-items: center;
                gap: 14px;

                width: max-content;
                max-width: 90vw;

                padding: 18px 24px;

                border-radius: 16px;

                background: #ffffff;

                box-shadow:
                    0 20px 60px
                    rgba(0, 0, 0, 0.25);

                opacity: 0;

                transition:
                    opacity 0.25s ease,
                    transform 0.25s ease;

                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;

                pointer-events: none;
            }

            #adminCenterMessage.success {
                border: 2px solid #9fd3aa;
                color: #245b32;
            }

            #adminCenterMessage.error {
                border: 2px solid #e2a1a1;
                color: #8b2525;
            }

            #adminCenterMessage.visible {
                opacity: 1;

                transform:
                    translate(-50%, -50%)
                    scale(1);
            }

            .admin-center-message-icon {
                width: 34px;
                height: 34px;
                min-width: 34px;

                border-radius: 50%;

                display: flex;
                align-items: center;
                justify-content: center;

                font-size: 19px;
                font-weight: 800;
            }

            #adminCenterMessage.success
            .admin-center-message-icon {
                background: #dff2e3;
                color: #245b32;
            }

            #adminCenterMessage.error
            .admin-center-message-icon {
                background: #f9dddd;
                color: #8b2525;
            }

            .admin-center-message-text {
                font-size: 16px;
                font-weight: 600;
                line-height: 1.4;
                text-align: left;
            }

        `;

        document.head.appendChild(style);
    }

    document.body.appendChild(popup);

    requestAnimationFrame(() => {

        popup.classList.add('visible');

    });

    popup._messageTimer =
        setTimeout(() => {

            popup.classList.remove('visible');

            setTimeout(() => {

                if (popup) {
                    popup.remove();
                }

            }, 300);

        }, 3000);

}


/* ================================================================
   PROFESSIONAL CONFIRMATION MODAL
================================================================ */

function showAdminConfirm({
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    icon = '⚠'
} = {}) {

    return new Promise(resolve => {

        const existing =
            document.getElementById(
                'adminConfirmModal'
            );

        if (existing) {
            existing.remove();
        }

        let finished = false;

        const modal =
            document.createElement('div');

        modal.id =
            'adminConfirmModal';

        modal.setAttribute(
            'role',
            'dialog'
        );

        modal.setAttribute(
            'aria-modal',
            'true'
        );

        modal.setAttribute(
            'aria-labelledby',
            'adminConfirmTitle'
        );

        modal.innerHTML = `

            <div class="admin-confirm-card">

                <div class="admin-confirm-icon">
                    ${icon}
                </div>

                <div class="admin-confirm-content">

                    <h2 id="adminConfirmTitle">
                        ${escapeHtmlForAdmin(title)}
                    </h2>

                    <p id="adminConfirmMessage">
                        ${escapeHtmlForAdmin(message)}
                    </p>

                </div>

                <div class="admin-confirm-actions">

                    <button
                        type="button"
                        class="admin-confirm-cancel"
                        id="adminConfirmCancel"
                    >
                        ${escapeHtmlForAdmin(cancelText)}
                    </button>

                    <button
                        type="button"
                        class="admin-confirm-danger"
                        id="adminConfirmOk"
                    >
                        ${escapeHtmlForAdmin(confirmText)}
                    </button>

                </div>

            </div>

        `;


        if (
            !document.getElementById(
                'admin-confirm-style'
            )
        ) {

            const style =
                document.createElement('style');

            style.id =
                'admin-confirm-style';

            style.textContent = `

                #adminConfirmModal {
                    position: fixed;
                    inset: 0;

                    z-index: 1000002;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    padding: 20px;

                    background:
                        rgba(24, 17, 13, 0.62);

                    backdrop-filter:
                        blur(7px);

                    -webkit-backdrop-filter:
                        blur(7px);

                    opacity: 0;
                    visibility: hidden;

                    transition:
                        opacity 0.22s ease,
                        visibility 0.22s ease;

                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;
                }

                #adminConfirmModal.visible {
                    opacity: 1;
                    visibility: visible;
                }

                body.admin-confirm-active {
                    overflow: hidden;
                }

                .admin-confirm-card {

                    width: min(
                        100%,
                        440px
                    );

                    padding: 30px;

                    background:
                        linear-gradient(
                            180deg,
                            #ffffff 0%,
                            #fffdfb 100%
                        );

                    border:
                        1px solid
                        rgba(74, 47, 34, 0.10);

                    border-radius: 24px;

                    box-shadow:
                        0 30px 90px
                        rgba(0, 0, 0, 0.30);

                    text-align: center;

                    transform:
                        translateY(18px)
                        scale(0.96);

                    transition:
                        transform 0.25s ease;
                }

                #adminConfirmModal.visible
                .admin-confirm-card {

                    transform:
                        translateY(0)
                        scale(1);

                }

                .admin-confirm-icon {

                    width: 68px;
                    height: 68px;

                    margin:
                        0 auto 20px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 50%;

                    background:
                        linear-gradient(
                            145deg,
                            #fff4df,
                            #ffe1a8
                        );

                    border:
                        1px solid
                        #f2c978;

                    color: #9a5a00;

                    font-size: 30px;

                    box-shadow:
                        0 8px 24px
                        rgba(180, 120, 30, 0.15);
                }

                .admin-confirm-content h2 {

                    margin:
                        0 0 10px;

                    color:
                        #34251e;

                    font-size: 22px;

                    font-weight: 800;

                    letter-spacing:
                        -0.2px;
                }

                .admin-confirm-content p {

                    margin:
                        0 auto;

                    max-width: 350px;

                    color:
                        #71645d;

                    font-size: 15px;

                    font-weight: 500;

                    line-height: 1.6;
                }

                .admin-confirm-actions {

                    display: flex;

                    justify-content: center;

                    gap: 12px;

                    margin-top: 28px;
                }

                .admin-confirm-actions button {

                    min-height: 46px;

                    padding:
                        0 20px;

                    border-radius: 12px;

                    border: 1px solid transparent;

                    font-family: inherit;

                    font-size: 14px;

                    font-weight: 750;

                    cursor: pointer;

                    transition:
                        transform 0.18s ease,
                        box-shadow 0.18s ease,
                        background 0.18s ease;
                }

                .admin-confirm-actions button:hover {

                    transform:
                        translateY(-1px);

                }

                .admin-confirm-actions button:active {

                    transform:
                        translateY(0);

                }

                .admin-confirm-cancel {

                    background:
                        #f5f1ee;

                    border-color:
                        #ded5cf !important;

                    color:
                        #4b3a30;

                }

                .admin-confirm-cancel:hover {

                    background:
                        #ebe5e0;

                    box-shadow:
                        0 5px 14px
                        rgba(60, 40, 30, 0.10);

                }

                .admin-confirm-danger {

                    background:
                        linear-gradient(
                            135deg,
                            #b83b32,
                            #962c25
                        );

                    color:
                        #ffffff;

                    box-shadow:
                        0 6px 16px
                        rgba(150, 44, 37, 0.22);

                }

                .admin-confirm-danger:hover {

                    box-shadow:
                        0 9px 22px
                        rgba(150, 44, 37, 0.30);

                }

                .admin-confirm-actions button:focus-visible {

                    outline:
                        3px solid
                        rgba(74, 47, 34, 0.22);

                    outline-offset:
                        2px;
                }

                @media (max-width: 520px) {

                    #adminConfirmModal {

                        padding:
                            16px;

                    }

                    .admin-confirm-card {

                        padding:
                            26px 20px;

                        border-radius:
                            20px;

                    }

                    .admin-confirm-icon {

                        width: 60px;
                        height: 60px;

                        font-size: 27px;

                        margin-bottom:
                            16px;

                    }

                    .admin-confirm-content h2 {

                        font-size:
                            20px;

                    }

                    .admin-confirm-content p {

                        font-size:
                            14px;

                    }

                    .admin-confirm-actions {

                        flex-direction:
                            column-reverse;

                        gap:
                            10px;

                    }

                    .admin-confirm-actions button {

                        width:
                            100%;

                    }

                }

                @media (prefers-reduced-motion: reduce) {

                    #adminConfirmModal,
                    .admin-confirm-card,
                    .admin-confirm-actions button {

                        transition:
                            none !important;

                    }

                }

            `;

            document.head.appendChild(style);

        }


        document.body.appendChild(
            modal
        );

        document.body.classList.add(
            'admin-confirm-active'
        );


        const cancelButton =
            document.getElementById(
                'adminConfirmCancel'
            );

        const confirmButton =
            document.getElementById(
                'adminConfirmOk'
            );


        const previousActiveElement =
            document.activeElement;


        function close(result) {

            if (finished) {
                return;
            }

            finished = true;

            document.body.classList.remove(
                'admin-confirm-active'
            );

            modal.classList.remove(
                'visible'
            );

            document.removeEventListener(
                'keydown',
                handleKeydown
            );

            setTimeout(() => {

                if (modal) {
                    modal.remove();
                }

                if (
                    previousActiveElement &&
                    typeof previousActiveElement.focus ===
                        'function'
                ) {

                    try {
                        previousActiveElement.focus();
                    } catch (error) {
                        // Ignore focus restoration errors.
                    }

                }

                resolve(result);

            }, 220);

        }


        function handleKeydown(event) {

            if (event.key === 'Escape') {

                event.preventDefault();

                close(false);

                return;
            }

            if (
                event.key === 'Enter' &&
                document.activeElement !==
                    cancelButton
            ) {

                event.preventDefault();

                close(true);

            }

        }


        cancelButton?.addEventListener(
            'click',
            () => close(false)
        );


        confirmButton?.addEventListener(
            'click',
            () => close(true)
        );


        modal.addEventListener(
            'click',
            event => {

                if (
                    event.target === modal
                ) {

                    close(false);

                }

            }
        );


        document.addEventListener(
            'keydown',
            handleKeydown
        );


        requestAnimationFrame(() => {

            modal.classList.add(
                'visible'
            );

            if (cancelButton) {
                cancelButton.focus();
            }

        });

    });

}


/* ================================================================
   CHECK LOGIN / RESTAURANT ACCESS
================================================================ */

async function checkCafeAdminAccess() {

    try {

        const response =
            await fetch(
                '/api/admin/session',
                {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store'
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.ok
        ) {

            window.location.replace(
                '/admin.html'
            );

            return;
        }

        if (
            !data.user ||
            data.user.role !== 'cafe_admin'
        ) {

            window.location.replace(
                '/admin.html'
            );

            return;
        }

        currentRestaurant = {

            id:
                data.user.restaurant_id,

            name:
                data.user.restaurant_name,

            slug:
                data.user.restaurant_slug

        };

        const params =
            new URLSearchParams(
                window.location.search
            );

        const urlRestaurant =
            params.get('restaurant');

        if (
            urlRestaurant &&
            urlRestaurant !==
                currentRestaurant.slug
        ) {

            window.location.replace(
                '/admin.html'
            );

            return;
        }

        const restaurantName =
            document.getElementById(
                'restaurantName'
            );

        if (restaurantName) {

            restaurantName.textContent =
                currentRestaurant.name ||
                'Restaurant';

        }

        const pageLoading =
            document.getElementById(
                'pageLoading'
            );

        if (pageLoading) {
            pageLoading.style.display = 'none';
        }

        await loadRestaurantMenu();

        updateAdminCategoryOptions();

        updateCategoryManager();

        updateExistingItemCategorySelect();

        refreshExistingItemsSelect();

        renderCurrentMenu();

        console.log(
            'Cafe menu loaded successfully:',
            currentRestaurant.slug,
            foods
        );

    } catch (error) {

        console.error(
            'Cafe admin access error:',
            error
        );

        const pageLoading =
            document.getElementById(
                'pageLoading'
            );

        if (pageLoading) {
            pageLoading.style.display = 'none';
        }

        showMessage(
            error.message ||
            'Unable to load restaurant menu.',
            'error'
        );
    }

}


/* ================================================================
   LOAD RESTAURANT MENU
================================================================ */

async function loadRestaurantMenu() {

    if (!currentRestaurant) {

        throw new Error(
            'Restaurant information is not available.'
        );

    }

    if (!currentRestaurant.slug) {

        throw new Error(
            'Restaurant slug is missing.'
        );

    }

    console.log(
        'Loading restaurant menu:',
        currentRestaurant.slug
    );

    const response =
        await fetch(
            '/api/menu/' +
            encodeURIComponent(
                currentRestaurant.slug
            ),
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );

    let data = {};

    try {

        data =
            await response.json();

    } catch (jsonError) {

        throw new Error(
            'The server returned an invalid menu response.'
        );

    }

    console.log(
        'Restaurant menu API response:',
        data
    );

    if (
        !response.ok ||
        !data.ok
    ) {

        throw new Error(
            data.message ||
            'Unable to load restaurant menu.'
        );

    }

    if (
        !data.menu ||
        typeof data.menu !== 'object'
    ) {

        throw new Error(
            'Restaurant menu data is empty or invalid.'
        );

    }

    foods =
        data.menu;

    if (
        data.profile &&
        typeof data.profile === 'object'
    ) {

        restaurantProfile = {

            logo:
                typeof data.profile.logo === 'string'
                    ? data.profile.logo
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

    console.log(
        'Restaurant profile loaded:',
        restaurantProfile
    );

    return foods;

}


/* ================================================================
   RENDER MENU
================================================================ */

function renderCurrentMenu() {

    const menuList =
        document.getElementById(
            'menuList'
        );

    if (!menuList) {
        return;
    }

    menuList.innerHTML = '';

    const categories =
        Object.keys(foods);

    if (!categories.length) {

        menuList.innerHTML =
            '<p>No menu items yet.</p>';

        return;
    }

    categories.forEach(category => {

        const items =
            Array.isArray(
                foods[category]
            )
                ? foods[category]
                : [];

        const categoryBox =
            document.createElement('div');

        categoryBox.className =
            'menu-category';

        const title =
            document.createElement('h4');

        title.textContent =
            category;

        categoryBox.appendChild(
            title
        );

        items.forEach(item => {

            const div =
                document.createElement('div');

            div.className =
                'menu-item';

            const special =
                item.isDaySpecial === true
                    ? `
                        <span class="menu-item-day-special">
                            ⭐ DAY SPECIAL
                        </span>
                    `
                    : '';

            div.innerHTML = `
                ${escapeHtmlForAdmin(
                    item.name || ''
                )}
                -
                ${escapeHtmlForAdmin(
                    item.price || 0
                )} ETB
                ${special}
            `;

            categoryBox.appendChild(
                div
            );

        });

        menuList.appendChild(
            categoryBox
        );

    });

}


/* ================================================================
   CATEGORY SELECTS
================================================================ */

function updateAdminCategoryOptions() {

    const newCategory =
        document.getElementById(
            'newItemCategory'
        );

    const editCategory =
        document.getElementById(
            'editItemCategory'
        );

    const categories =
        Object.keys(foods);

    if (newCategory) {

        const previous =
            newCategory.value;

        newCategory.innerHTML =
            '<option value="">Select category</option>';

        categories.forEach(category => {

            const option =
                document.createElement('option');

            option.value =
                category;

            option.textContent =
                category;

            newCategory.appendChild(
                option
            );

        });

        if (
            categories.includes(previous)
        ) {

            newCategory.value =
                previous;

        }

    }

    if (editCategory) {

        const previous =
            editCategory.value;

        editCategory.innerHTML =
            '<option value="">Select category</option>';

        categories.forEach(category => {

            const option =
                document.createElement('option');

            option.value =
                category;

            option.textContent =
                category;

            editCategory.appendChild(
                option
            );

        });

        if (
            categories.includes(previous)
        ) {

            editCategory.value =
                previous;

        }

    }

}


/* ================================================================
   UPDATE / DELETE CATEGORY SELECT
================================================================ */

function updateExistingItemCategorySelect() {

    const select =
        document.getElementById(
            'existingItemCategorySelect'
        );

    if (!select) {
        return;
    }

    const previous =
        select.value;

    select.innerHTML =
        '<option value="">Select category</option>';

    Object.keys(foods).forEach(category => {

        const option =
            document.createElement('option');

        option.value =
            category;

        option.textContent =
            category;

        select.appendChild(
            option
        );

    });

    if (
        previous &&
        Object.prototype.hasOwnProperty.call(
            foods,
            previous
        )
    ) {

        select.value =
            previous;

    }

}


/* ================================================================
   EXISTING ITEMS
================================================================ */

function refreshExistingItemsSelect() {

    const select =
        document.getElementById(
            'existingItemSelect'
        );

    const categorySelect =
        document.getElementById(
            'existingItemCategorySelect'
        );

    if (!select) {
        return;
    }

    const category =
        categorySelect
            ? categorySelect.value
            : '';

    select.innerHTML = '';

    if (!category) {

        select.disabled = true;

        select.innerHTML =
            '<option value="">Select category first</option>';

        clearEditFields();

        return;
    }

    const items =
        Array.isArray(foods[category])
            ? foods[category]
            : [];

    select.disabled = false;

    select.innerHTML =
        '<option value="">Select item</option>';

    items.forEach((item, index) => {

        const option =
            document.createElement('option');

        option.value =
            String(index);

        option.textContent =
            item.name || 'Unnamed item';

        select.appendChild(
            option
        );

    });

    if (!items.length) {

        select.innerHTML =
            '<option value="">No items in this category</option>';

        select.disabled = true;

        clearEditFields();
    }

}


/* ================================================================
   CATEGORY → ITEM
================================================================ */

function updateExistingItemsByCategory() {

    const categorySelect =
        document.getElementById(
            'existingItemCategorySelect'
        );

    const itemSelect =
        document.getElementById(
            'existingItemSelect'
        );

    if (!categorySelect || !itemSelect) {
        return;
    }

    itemSelect.value = '';

    clearEditFields();

    refreshExistingItemsSelect();

    if (categorySelect.value) {

        showMessage(
            `Select an item from "${categorySelect.value}".`,
            'success'
        );

    }

}


/* ================================================================
   GET SELECTED ITEM
================================================================ */

function getSelectedItemData() {

    const categorySelect =
        document.getElementById(
            'existingItemCategorySelect'
        );

    const itemSelect =
        document.getElementById(
            'existingItemSelect'
        );

    if (
        !categorySelect ||
        !itemSelect ||
        !categorySelect.value ||
        itemSelect.value === ''
    ) {

        return null;
    }

    const category =
        categorySelect.value;

    const itemIndex =
        Number(itemSelect.value);

    const items =
        Array.isArray(foods[category])
            ? foods[category]
            : [];

    if (
        !Number.isInteger(itemIndex) ||
        itemIndex < 0 ||
        itemIndex >= items.length
    ) {

        return null;
    }

    return {

        category:
            category,

        itemId:
            items[itemIndex]?.id,

        items:
            items,

        index:
            itemIndex,

        item:
            items[itemIndex]

    };

}


/* ================================================================
   POPULATE EDIT FIELDS
================================================================ */

function populateSelectedItemFields() {

    const selected =
        getSelectedItemData();

    if (!selected) {

        clearEditFields();

        return;
    }

    const item =
        selected.item;

    const name =
        document.getElementById(
            'editItemName'
        );

    const price =
        document.getElementById(
            'editItemPrice'
        );

    const ingredient =
        document.getElementById(
            'editItemIngredient'
        );

    const editCategory =
        document.getElementById(
            'editItemCategory'
        );

    const available =
        document.getElementById(
            'editItemAvailable'
        );

    if (name) {
        name.value =
            item.name || '';
    }

    if (price) {
        price.value =
            item.price ?? '';
    }

    if (ingredient) {
        ingredient.value =
            item.ingridient ||
            item.ingredient ||
            '';
    }

    if (editCategory) {
        editCategory.value =
            selected.category;
    }

    if (available) {
        available.checked =
            item.isAvailable !== false;
    }

    renderEditItemImage(item);
}


/* ================================================================
   EDIT ITEM IMAGE
================================================================ */

function renderEditItemImage(item) {

    const image =
        document.getElementById(
            'editItemImagePreviewImg'
        );

    const placeholder =
        document.getElementById(
            'editItemImagePlaceholder'
        );

    if (!image || !placeholder) {
        return;
    }

    const src =
        typeof item?.image === 'string'
            ? item.image.trim()
            : '';

    if (src) {

        image.src = src;
        image.style.display = 'block';

        placeholder.style.display = 'none';

    } else {

        image.removeAttribute('src');
        image.style.display = 'none';

        placeholder.style.display = 'flex';

    }
}


function handleEditItemImageChange(event) {

    const file =
        event.target.files &&
        event.target.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith('image/')) {

        showMessage(
            'Please choose an image file.',
            'error'
        );

        event.target.value = '';

        return;
    }

    const maxSize =
        5 * 1024 * 1024;

    if (file.size > maxSize) {

        showMessage(
            'Item image must be smaller than 5 MB.',
            'error'
        );

        event.target.value = '';

        return;
    }

    const image =
        document.getElementById(
            'editItemImagePreviewImg'
        );

    const placeholder =
        document.getElementById(
            'editItemImagePlaceholder'
        );

    if (!image || !placeholder) {
        return;
    }

    const reader =
        new FileReader();

    reader.onload =
        event => {

            image.src =
                event.target.result;

            image.style.display =
                'block';

            placeholder.style.display =
                'none';

        };

    reader.onerror =
        () => {

            showMessage(
                'Could not preview the selected image.',
                'error'
            );

            event.target.value = '';

        };

    reader.readAsDataURL(file);

}


function clearEditItemImage() {

    const input =
        document.getElementById(
            'editItemImage'
        );

    const image =
        document.getElementById(
            'editItemImagePreviewImg'
        );

    const placeholder =
        document.getElementById(
            'editItemImagePlaceholder'
        );

    if (input) {
        input.value = '';
    }

    if (image) {

        image.removeAttribute('src');

        image.style.display =
            'none';

    }

    if (placeholder) {

        placeholder.style.display =
            'flex';

    }

}


function clearEditFields() {

    [
        'editItemName',
        'editItemPrice',
        'editItemIngredient',
        'editItemCategory'
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = '';
        }

    });

    const available =
        document.getElementById(
            'editItemAvailable'
        );

    if (available) {
        available.checked = false;
    }

    clearEditItemImage();
}


/* ================================================================
   ADD CATEGORY
================================================================ */

function addCategoryFromUI() {

    const input =
        document.getElementById(
            'newCategoryName'
        );

    if (!input) {
        return;
    }

    const category =
        input.value.trim();

    if (!category) {

        showMessage(
            'Please enter a category name.',
            'error'
        );

        return;
    }

    const exists =
        Object.keys(foods).some(
            currentCategory =>
                currentCategory.toLowerCase() ===
                category.toLowerCase()
        );

    if (exists) {

        showMessage(
            'Category already exists.',
            'error'
        );

        return;
    }

    showAdminLoading(
        'Adding category...'
    );

    setTimeout(() => {

        const newFoods = {};

        Object.keys(foods).forEach(
            existingCategory => {

                newFoods[existingCategory] =
                    foods[existingCategory];

            }
        );

        newFoods[category] = [];

        foods =
            newFoods;

        input.value = '';

        updateAdminCategoryOptions();

        updateCategoryManager();

        updateExistingItemCategorySelect();

        refreshExistingItemsSelect();

        renderCurrentMenu();

        showMessage(
            `Category "${category}" added. Click Save Menu to save it.`,
            'success'
        );

        hideAdminLoading();

    }, 450);

}


/* ================================================================
   MANAGE CATEGORIES
================================================================ */

function updateCategoryManager() {

    const select =
        document.getElementById(
            'existingCategorySelect'
        );

    if (!select) {
        return;
    }

    const previous =
        select.value;

    select.innerHTML =
        '<option value="">Select category</option>';

    Object.keys(foods).forEach(category => {

        const option =
            document.createElement('option');

        option.value =
            category;

        option.textContent =
            category;

        select.appendChild(
            option
        );

    });

    if (
        previous &&
        Object.prototype.hasOwnProperty.call(
            foods,
            previous
        )
    ) {

        select.value =
            previous;

    }

}


function populateSelectedCategory() {

    const select =
        document.getElementById(
            'existingCategorySelect'
        );

    const input =
        document.getElementById(
            'editCategoryName'
        );

    if (!select || !input) {
        return;
    }

    if (!select.value) {

        input.value = '';

        return;
    }

    input.value =
        select.value;

}


async function updateSelectedCategory() {

    const select =
        document.getElementById(
            'existingCategorySelect'
        );

    const input =
        document.getElementById(
            'editCategoryName'
        );

    if (!select || !input) {
        return;
    }

    const oldCategory =
        select.value;

    const newCategory =
        input.value.trim();

    if (!oldCategory) {

        showMessage(
            'Please select a category first.',
            'error'
        );

        return;
    }

    if (!newCategory) {

        showMessage(
            'Please enter a new category name.',
            'error'
        );

        return;
    }

    if (
        newCategory === oldCategory
    ) {

        showMessage(
            'The category name has not changed.',
            'error'
        );

        return;
    }

    const duplicate =
        Object.keys(foods).some(
            category =>
                category.toLowerCase() ===
                newCategory.toLowerCase()
        );

    if (duplicate) {

        showMessage(
            'A category with this name already exists.',
            'error'
        );

        return;
    }

    if (
        !Object.prototype.hasOwnProperty.call(
            foods,
            oldCategory
        )
    ) {

        showMessage(
            'The selected category no longer exists.',
            'error'
        );

        return;
    }

    if (
        !confirm(
            `Rename "${oldCategory}" to "${newCategory}"?`
        )
    ) {

        return;
    }

    showAdminLoading(
        'Updating category...'
    );

    try {

        const newFoods = {};

        Object.keys(foods).forEach(category => {

            if (
                category === oldCategory
            ) {

                newFoods[newCategory] =
                    foods[category];

            } else {

                newFoods[category] =
                    foods[category];

            }

        });

        foods =
            newFoods;

        updateAdminCategoryOptions();

        updateCategoryManager();

        updateExistingItemCategorySelect();

        refreshExistingItemsSelect();

        const categoryManager =
            document.getElementById(
                'existingCategorySelect'
            );

        const categoryInput =
            document.getElementById(
                'editCategoryName'
            );

        const itemCategory =
            document.getElementById(
                'existingItemCategorySelect'
            );

        if (categoryManager) {

            categoryManager.value =
                newCategory;

        }

        if (categoryInput) {

            categoryInput.value =
                newCategory;

        }

        if (itemCategory) {

            itemCategory.value =
                newCategory;

        }

        refreshExistingItemsSelect();

        renderCurrentMenu();

        showMessage(
            `Category renamed to "${newCategory}". Click Save Menu to save it.`,
            'success'
        );

    } catch (error) {

        console.error(
            'Update category error:',
            error
        );

        showMessage(
            error.message ||
            'Could not update category.',
            'error'
        );

    } finally {

        hideAdminLoading();

    }

}


/* ================================================================
   READ IMAGE
================================================================ */

function readImageFile(file) {

    return new Promise(
        (resolve, reject) => {

            if (!file) {

                resolve('');

                return;

            }

            const reader =
                new FileReader();

            reader.onload =
                event => {

                    resolve(
                        event.target.result
                    );

                };

            reader.onerror =
                () => {

                    reject(
                        new Error(
                            'Could not read the image file.'
                        )
                    );

                };

            reader.readAsDataURL(file);

        }
    );

}


/* ================================================================
   ADD ITEM
================================================================ */

async function addItemFromUI() {

    const nameInput =
        document.getElementById(
            'newItemName'
        );

    const priceInput =
        document.getElementById(
            'newItemPrice'
        );

    const imageInput =
        document.getElementById(
            'newItemImage'
        );

    const ingredientInput =
        document.getElementById(
            'newItemIngredient'
        );

    const categoryInput =
        document.getElementById(
            'newItemCategory'
        );

    const availableInput =
        document.getElementById(
            'newItemAvailable'
        );

    if (
        !nameInput ||
        !priceInput ||
        !categoryInput
    ) {
        return;
    }

    const name =
        nameInput.value.trim();

    const price =
        Number(
            priceInput.value
        );

    const ingredient =
        ingredientInput
            ? ingredientInput.value.trim()
            : '';

    const category =
        categoryInput.value;

    const available =
        availableInput
            ? availableInput.checked
            : true;

    const file =
        imageInput &&
        imageInput.files
            ? imageInput.files[0]
            : null;

    if (
        !name ||
        !category
    ) {

        showMessage(
            'Item name and category are required.',
            'error'
        );

        return;
    }

    if (
        !Number.isFinite(price)
    ) {

        showMessage(
            'Please enter a valid price.',
            'error'
        );

        return;
    }

    showAdminLoading(
        'Adding item...'
    );

    try {

        const image =
            await readImageFile(file);

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    file ? 0 : 450
                )
        );

        if (!foods[category]) {

            foods[category] = [];

        }

        foods[category].push({

            id:
                Date.now(),

            name:
                name,

            price:
                price,

            image:
                image,

            ingridient:
                ingredient,

            isAvailable:
                available

        });

        nameInput.value = '';

        priceInput.value = '';

        if (ingredientInput) {

            ingredientInput.value = '';

        }

        if (imageInput) {

            imageInput.value = '';

        }

        updateAdminCategoryOptions();

        updateCategoryManager();

        updateExistingItemCategorySelect();

        refreshExistingItemsSelect();

        renderCurrentMenu();

        showMessage(
            `"${name}" added. Click Save Menu to save it.`,
            'success'
        );

    } catch (error) {

        console.error(
            'Add item error:',
            error
        );

        showMessage(
            error.message ||
            'Could not add item.',
            'error'
        );

    } finally {

        hideAdminLoading();

    }

}


/* ================================================================
   UPDATE ITEM
================================================================ */

async function updateSelectedItem() {

    const selected =
        getSelectedItemData();

    if (!selected) {

        showMessage(
            'Please choose a category and then choose an item.',
            'error'
        );

        return;
    }

    const item =
        selected.item;

    const oldCategory =
        selected.category;

    const index =
        selected.index;

    const nameElement =
        document.getElementById(
            'editItemName'
        );

    const priceElement =
        document.getElementById(
            'editItemPrice'
        );

    const ingredientElement =
        document.getElementById(
            'editItemIngredient'
        );

    const categoryElement =
        document.getElementById(
            'editItemCategory'
        );

    const availableElement =
        document.getElementById(
            'editItemAvailable'
        );

    const imageElement =
        document.getElementById(
            'editItemImage'
        );

    const newName =
        nameElement
            ? nameElement.value.trim()
            : '';

    const newPrice =
        Number(
            priceElement
                ? priceElement.value
                : ''
        );

    const newIngredient =
        ingredientElement
            ? ingredientElement.value.trim()
            : '';

    const newCategory =
        categoryElement?.value ||
        oldCategory;

    const newImageFile =
        imageElement?.files?.[0] ||
        null;

    if (!newName) {

        showMessage(
            'Item name is required.',
            'error'
        );

        return;
    }

    if (!Number.isFinite(newPrice)) {

        showMessage(
            'Please enter a valid price.',
            'error'
        );

        return;
    }

    if (newImageFile) {

        if (
            !newImageFile.type.startsWith(
                'image/'
            )
        ) {

            showMessage(
                'Please choose a valid image file.',
                'error'
            );

            return;
        }

        if (
            newImageFile.size >
            5 * 1024 * 1024
        ) {

            showMessage(
                'Item image must be smaller than 5 MB.',
                'error'
            );

            return;
        }

    }

    showAdminLoading(
        newImageFile
            ? 'Preparing new image...'
            : 'Updating item...'
    );

    try {

        if (newImageFile) {

            item.image =
                await readImageFile(
                    newImageFile
                );

        }

        item.name =
            newName;

        item.price =
            newPrice;

        item.ingridient =
            newIngredient;

        item.isAvailable =
            availableElement
                ? availableElement.checked
                : true;


        if (
            newCategory &&
            newCategory !== oldCategory
        ) {

            selected.items.splice(
                index,
                1
            );

            if (!foods[newCategory]) {

                foods[newCategory] =
                    [];

            }

            foods[newCategory].push(
                item
            );

        }


        updateAdminCategoryOptions();

        updateCategoryManager();

        updateExistingItemCategorySelect();

        const categorySelect =
            document.getElementById(
                'existingItemCategorySelect'
            );

        if (categorySelect) {

            categorySelect.value =
                newCategory;

        }

        refreshExistingItemsSelect();

        const itemSelect =
            document.getElementById(
                'existingItemSelect'
            );

        if (
            itemSelect &&
            foods[newCategory]
        ) {

            const updatedIndex =
                foods[newCategory].findIndex(
                    currentItem =>
                        currentItem === item
                );

            if (updatedIndex !== -1) {

                itemSelect.value =
                    String(updatedIndex);

                populateSelectedItemFields();

            }

        }

        renderCurrentMenu();

        showMessage(
            `"${item.name}" updated. ${
                newImageFile
                    ? 'Image replaced. '
                    : ''
            }Click Save Menu to save it.`,
            'success'
        );

    } catch (error) {

        console.error(
            'Update item error:',
            error
        );

        showMessage(
            error.message ||
            'Could not update item.',
            'error'
        );

    } finally {

        hideAdminLoading();

    }

}


/* ================================================================
   DELETE ITEM
================================================================ */

async function deleteSelectedItem() {

    const selected =
        getSelectedItemData();

    if (!selected) {

        showMessage(
            'Please choose a category and then choose an item.',
            'error'
        );

        return;
    }

    const itemName =
        selected.item.name ||
        'this item';

    const categoryName =
        selected.category;

    if (
        !confirm(
            `Delete "${itemName}"?`
        )
    ) {

        return;
    }

    showAdminLoading(
        'Deleting item...'
    );

    try {

        selected.items.splice(
            selected.index,
            1
        );

        removeEmptyCategories();

        updateAdminCategoryOptions();

        updateCategoryManager();

        updateExistingItemCategorySelect();

        const categorySelect =
            document.getElementById(
                'existingItemCategorySelect'
            );

        const itemSelect =
            document.getElementById(
                'existingItemSelect'
            );

        if (
            Object.prototype.hasOwnProperty.call(
                foods,
                categoryName
            )
        ) {

            if (categorySelect) {

                categorySelect.value =
                    categoryName;

            }

            refreshExistingItemsSelect();

        } else {

            if (categorySelect) {

                categorySelect.value = '';

            }

            if (itemSelect) {

                itemSelect.innerHTML =
                    '<option value="">Select category first</option>';

                itemSelect.disabled = true;

            }

            clearEditFields();

        }

        renderCurrentMenu();

        showMessage(
            `"${itemName}" deleted. Click Save Menu to save the change.`,
            'success'
        );

    } catch (error) {

        console.error(
            'Delete item error:',
            error
        );

        showMessage(
            error.message ||
            'Could not delete item.',
            'error'
        );

    } finally {

        hideAdminLoading();

    }

}


/* ================================================================
   SAVE MENU TO SERVER
================================================================ */

async function saveMenuToServer() {

    if (!currentRestaurant) {

        showMessage(
            'Restaurant information is not available.',
            'error'
        );

        return;
    }

    showAdminLoading(
        'Saving menu...'
    );

    try {

        removeEmptyCategories();

        const response =
            await fetch(
                '/api/admin/menu/' +
                encodeURIComponent(
                    currentRestaurant.slug
                ),
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({
                            menu: foods
                        })
                }
            );

        let data = {};

        try {

            data =
                await response.json();

        } catch (jsonError) {

            data = {};

        }

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            showMessage(
                data.message ||
                'Your admin session has expired. Please log in again.',
                'error'
            );

            setTimeout(
                () => {

                    window.location.replace(
                        '/admin.html'
                    );

                },
                1200
            );

            return;
        }

        if (
            !response.ok ||
            !data.ok
        ) {

            throw new Error(
                data.message ||
                'Failed to save menu.'
            );

        }

        showMessage(
            data.message ||
            'Menu saved successfully.',
            'success'
        );

    } catch (error) {

        console.error(
            'Save menu error:',
            error
        );

        showMessage(
            error.message ||
            'Failed to save menu.',
            'error'
        );

    } finally {

        hideAdminLoading(150);

    }

}


/* ================================================================
   REFRESH MENU
================================================================ */

async function refreshAdminMenu() {

    showAdminLoading(
        'Refreshing menu...'
    );

    const button =
        document.getElementById(
            'adminRefreshBtn'
        );

    if (button) {

        button.disabled = true;

        button.textContent =
            '↻ Refreshing...';

    }

    try {

        await loadRestaurantMenu();

        updateAdminCategoryOptions();

        updateCategoryManager();

        updateExistingItemCategorySelect();

        refreshExistingItemsSelect();

        renderCurrentMenu();

        showMessage(
            'Menu refreshed successfully.',
            'success'
        );

    } catch (error) {

        console.error(
            'Refresh error:',
            error
        );

        showMessage(
            'Refresh failed: ' +
            error.message,
            'error'
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                '↻ Refresh';

        }

        hideAdminLoading(150);

    }

}


/* ================================================================
   LOAD RESTAURANT PROFILE
================================================================ */

async function loadRestaurantProfile() {

    if (!currentRestaurant) {

        throw new Error(
            'Restaurant information is not available.'
        );

    }

    if (!currentRestaurant.slug) {

        throw new Error(
            'Restaurant slug is missing.'
        );

    }

    const response =
        await fetch(
            '/api/admin/profile/' +
            encodeURIComponent(
                currentRestaurant.slug
            ),
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );

    let data = {};

    try {

        data =
            await response.json();

    } catch (error) {

        throw new Error(
            'The server returned an invalid profile response.'
        );

    }

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        throw new Error(
            data.message ||
            'Your admin session has expired.'
        );

    }

    if (
        !response.ok ||
        !data.ok
    ) {

        throw new Error(
            data.message ||
            'Unable to load restaurant profile.'
        );

    }

    restaurantProfile = {

        logo:
            typeof data.profile?.logo === 'string'
                ? data.profile.logo
                : '',

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

    return restaurantProfile;

}


/* ================================================================
   RENDER PROFILE LOGO
================================================================ */

function renderProfileLogo() {

    const preview =
        document.getElementById('profileLogoPreview');

    const image =
        document.getElementById('profileLogoImage');

    const placeholder =
        document.getElementById('profileLogoPlaceholder');

    const removeButton =
        document.getElementById('profileLogoRemoveBtn');

    const logo =
        typeof restaurantProfile.logo === 'string'
            ? restaurantProfile.logo.trim()
            : '';

    const validLogo =
        logo.startsWith('data:image/');


    if (image) {

        if (validLogo) {

            image.src = logo;

            image.style.display = 'block';

        } else {

            image.removeAttribute('src');

            image.style.display = 'none';

        }
    }


    if (placeholder) {

        placeholder.style.display =
            validLogo ? 'none' : 'flex';

    }


    if (removeButton) {

        removeButton.style.display =
            validLogo ? 'inline-flex' : 'none';

    }


    if (preview) {

        preview.classList.toggle(
            'has-logo',
            validLogo
        );

    }

}


/* ================================================================
   HANDLE LOGO FILE
================================================================ */

async function handleProfileLogoChange(event) {

    const file =
        event.target.files &&
        event.target.files[0];

    if (!file) {
        return;
    }

    if (
        !file.type.startsWith('image/')
    ) {

        showMessage(
            'Please choose an image file.',
            'error'
        );

        event.target.value = '';

        return;
    }

    const maxSize =
        5 * 1024 * 1024;

    if (
        file.size > maxSize
    ) {

        showMessage(
            'Logo image must be smaller than 5 MB.',
            'error'
        );

        event.target.value = '';

        return;
    }

    showAdminLoading(
        'Preparing logo...'
    );

    try {

        const logo =
            await readImageFile(file);

        if (
            !logo ||
            !logo.startsWith('data:image/')
        ) {

            throw new Error(
                'The selected logo could not be processed.'
            );

        }

        restaurantProfile.logo =
            logo;

        renderProfileLogo();

        showMessage(
            'Logo selected. Click Save Profile to save it.',
            'success'
        );

    } catch (error) {

        console.error(
            'Logo selection error:',
            error
        );

        showMessage(
            error.message ||
            'Could not load the logo.',
            'error'
        );

    } finally {

        event.target.value = '';

        hideAdminLoading(150);

    }

}


/* ================================================================
   REMOVE LOGO
================================================================ */

function removeProfileLogo() {

    if (
        !restaurantProfile.logo
    ) {

        showMessage(
            'There is no logo to remove.',
            'error'
        );

        return;
    }

    if (
        !confirm(
            'Remove the restaurant logo?'
        )
    ) {

        return;
    }

    restaurantProfile.logo =
        '';

    renderProfileLogo();

    showMessage(
        'Logo removed. Click Save Profile to apply the change.',
        'success'
    );

}


/* ================================================================
   OPEN PROFILE MODAL
================================================================ */

async function openProfileModal() {

    const modal =
        document.getElementById(
            'profileModal'
        );

    if (!modal) {

        showMessage(
            'Profile window is not available.',
            'error'
        );

        return;
    }

    showAdminLoading(
        'Loading profile...'
    );

    try {

        await loadRestaurantProfile();

        const restaurantName =
            document.getElementById(
                'profileRestaurantName'
            );

        if (restaurantName) {

            restaurantName.textContent =
                currentRestaurant?.name ||
                'Restaurant Profile';

        }

        renderProfileLogo();

        renderProfilePhones();

        renderProfileLocations();

        modal.classList.add('active');

        modal.style.display = 'flex';

    } catch (error) {

        console.error(
            'Open profile error:',
            error
        );

        showMessage(
            error.message ||
            'Unable to load profile.',
            'error'
        );

    } finally {

        hideAdminLoading(150);

    }

}


/* ================================================================
   CLOSE PROFILE MODAL
================================================================ */

function closeProfileModal() {

    const modal =
        document.getElementById(
            'profileModal'
        );

    if (!modal) {
        return;
    }

    modal.classList.remove('active');

    modal.style.display = 'none';

}


/* ================================================================
   RENDER PHONE NUMBERS
================================================================ */

function renderProfilePhones() {

    const list =
        document.getElementById(
            'phoneList'
        );

    if (!list) {
        return;
    }

    list.innerHTML = '';

    if (
        !Array.isArray(
            restaurantProfile.phone_numbers
        ) ||
        restaurantProfile.phone_numbers.length === 0
    ) {

        const empty =
            document.createElement('div');

        empty.className =
            'profile-empty';

        empty.textContent =
            'No phone numbers added yet.';

        list.appendChild(empty);

        return;
    }

    restaurantProfile.phone_numbers.forEach(
        (phone, index) => {

            const row =
                document.createElement('div');

            row.className =
                'profile-entry';

            const fields =
                document.createElement('div');

            fields.className =
                'profile-entry-fields';

            const input =
                document.createElement('input');

            input.type =
                'tel';

            input.className =
                'profile-phone-input';

            input.placeholder =
                'Phone number';

            input.value =
                phone || '';

            input.dataset.index =
                String(index);

            fields.appendChild(input);

            const deleteButton =
                document.createElement('button');

            deleteButton.type =
                'button';

            deleteButton.className =
                'profile-delete-btn';

            deleteButton.textContent =
                'Delete';

            deleteButton.addEventListener(
                'click',
                () => {

                    restaurantProfile.phone_numbers.splice(
                        index,
                        1
                    );

                    renderProfilePhones();

                }
            );

            row.appendChild(fields);

            row.appendChild(
                deleteButton
            );

            list.appendChild(row);

        }
    );

}


/* ================================================================
   ADD PHONE
================================================================ */

function addPhoneRow() {

    if (
        !Array.isArray(
            restaurantProfile.phone_numbers
        )
    ) {

        restaurantProfile.phone_numbers = [];

    }

    restaurantProfile.phone_numbers.push('');

    renderProfilePhones();

    const inputs =
        document.querySelectorAll(
            '.profile-phone-input'
        );

    if (inputs.length) {

        inputs[
            inputs.length - 1
        ].focus();

    }

}


/* ================================================================
   RENDER LOCATIONS
================================================================ */

function renderProfileLocations() {

    const list =
        document.getElementById(
            'locationList'
        );

    if (!list) {
        return;
    }

    list.innerHTML = '';

    if (
        !Array.isArray(
            restaurantProfile.addresses
        ) ||
        restaurantProfile.addresses.length === 0
    ) {

        const empty =
            document.createElement('div');

        empty.className =
            'profile-empty';

        empty.textContent =
            'No locations added yet.';

        list.appendChild(empty);

        return;
    }

    restaurantProfile.addresses.forEach(
        (location, index) => {

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

            nameInput.type =
                'text';

            nameInput.className =
                'profile-location-name';

            nameInput.placeholder =
                'Location name';

            nameInput.value =
                location?.name || '';

            nameInput.dataset.index =
                String(index);

            const urlInput =
                document.createElement('input');

            urlInput.type =
                'url';

            urlInput.className =
                'profile-location-url';

            urlInput.placeholder =
                'Google Maps URL';

            urlInput.value =
                location?.url || '';

            urlInput.dataset.index =
                String(index);

            fields.appendChild(
                nameInput
            );

            fields.appendChild(
                urlInput
            );

            const deleteButton =
                document.createElement('button');

            deleteButton.type =
                'button';

            deleteButton.className =
                'profile-delete-btn';

            deleteButton.textContent =
                'Delete';

            deleteButton.addEventListener(
                'click',
                () => {

                    restaurantProfile.addresses.splice(
                        index,
                        1
                    );

                    renderProfileLocations();

                }
            );

            row.appendChild(fields);

            row.appendChild(
                deleteButton
            );

            list.appendChild(row);

        }
    );

}


/* ================================================================
   ADD LOCATION
================================================================ */

function addLocationRow() {

    if (
        !Array.isArray(
            restaurantProfile.addresses
        )
    ) {

        restaurantProfile.addresses = [];

    }

    restaurantProfile.addresses.push({

        name: '',
        url: ''

    });

    renderProfileLocations();

    const inputs =
        document.querySelectorAll(
            '.profile-location-name'
        );

    if (inputs.length) {

        inputs[
            inputs.length - 1
        ].focus();

    }

}


/* ================================================================
   SAVE RESTAURANT PROFILE
================================================================ */

async function saveRestaurantProfile() {

    if (!currentRestaurant) {

        showMessage(
            'Restaurant information is not available.',
            'error'
        );

        return;
    }

    const phoneInputs =
        document.querySelectorAll(
            '.profile-phone-input'
        );

    const locationNames =
        document.querySelectorAll(
            '.profile-location-name'
        );

    const locationUrls =
        document.querySelectorAll(
            '.profile-location-url'
        );

    const phoneNumbers = [];

    phoneInputs.forEach(input => {

        const phone =
            input.value.trim();

        if (phone) {

            phoneNumbers.push(phone);

        }

    });

    const addresses = [];

    for (
        let index = 0;
        index < locationNames.length;
        index++
    ) {

        const name =
            locationNames[index]
                .value
                .trim();

        const url =
            locationUrls[index]
                ? locationUrls[index]
                    .value
                    .trim()
                : '';

        if (!name && !url) {
            continue;
        }

        if (!name || !url) {

            showMessage(
                'Please enter both the location name and map URL.',
                'error'
            );

            return;
        }

        if (
            !/^https?:\/\//i.test(url)
        ) {

            showMessage(
                'Map URL must start with http:// or https://.',
                'error'
            );

            return;
        }

        addresses.push({

            name:
                name,

            url:
                url

        });

    }

    const logo =
        typeof restaurantProfile.logo === 'string'
            ? restaurantProfile.logo
            : '';

    if (
        logo &&
        !logo.startsWith('data:image/')
    ) {

        showMessage(
            'The restaurant logo is invalid.',
            'error'
        );

        return;
    }

    showAdminLoading(
        'Saving profile...'
    );

    const saveButton =
        document.getElementById(
            'profileSaveBtn'
        );

    if (saveButton) {

        saveButton.disabled = true;

    }

    try {

        const response =
            await fetch(
                '/api/admin/profile/' +
                encodeURIComponent(
                    currentRestaurant.slug
                ),
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({

                            logo:
                                logo,

                            phone_numbers:
                                phoneNumbers,

                            addresses:
                                addresses

                        })
                }
            );

        let data = {};

        try {

            data =
                await response.json();

        } catch (error) {

            data = {};

        }

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            showMessage(
                data.message ||
                'Your admin session has expired. Please log in again.',
                'error'
            );

            setTimeout(
                () => {

                    window.location.replace(
                        '/admin.html'
                    );

                },
                1200
            );

            return;
        }

        if (
            !response.ok ||
            !data.ok
        ) {

            throw new Error(
                data.message ||
                'Failed to save restaurant profile.'
            );

        }

        restaurantProfile = {

            logo:
                typeof data.profile?.logo === 'string'
                    ? data.profile.logo
                    : logo,

            phone_numbers:
                phoneNumbers,

            addresses:
                addresses

        };

        renderProfileLogo();

        showMessage(
            data.message ||
            'Profile saved successfully.',
            'success'
        );

        setTimeout(
            () => {

                closeProfileModal();

            },
            700
        );

    } catch (error) {

        console.error(
            'Save profile error:',
            error
        );

        showMessage(
            error.message ||
            'Could not save restaurant profile.',
            'error'
        );

    } finally {

        if (saveButton) {

            saveButton.disabled = false;

        }

        hideAdminLoading(150);

    }

}


/* ================================================================
   DAY SPECIAL - MAXIMUM 5
================================================================ */

const MAX_DAY_SPECIALS = 5;


/* ================================================================
   GET ALL DAY SPECIALS
================================================================ */

function getDaySpecialItems() {

    const specials = [];

    Object.keys(foods).forEach(category => {

        const items =
            Array.isArray(foods[category])
                ? foods[category]
                : [];

        items.forEach((item, index) => {

            if (
                item &&
                item.isDaySpecial === true
            ) {

                specials.push({
                    category: category,
                    index: index,
                    item: item
                });

            }

        });

    });

    return specials;
}


/* ================================================================
   GET ONE DAY SPECIAL
   Compatibility helper
================================================================ */

function getDaySpecialItem() {

    const specials =
        getDaySpecialItems();

    return specials.length
        ? {
            category: specials[0].category,
            item: specials[0].item
        }
        : null;
}


/* ================================================================
   OPEN DAY SPECIAL MODAL
================================================================ */

function openDaySpecialModal() {

    const existing =
        document.getElementById(
            'daySpecialModal'
        );

    if (existing) {
        existing.remove();
    }

    const specials =
        getDaySpecialItems();

    const modal =
        document.createElement('div');

    modal.id =
        'daySpecialModal';

    modal.className =
        'day-special-modal-overlay active';

    modal.innerHTML = `

        <div class="day-special-modal">

            <div class="day-special-modal-header">

                <div class="day-special-modal-title">

                    <div class="day-special-icon">
                        ⭐
                    </div>

                    <div>

                        <h2>
                            Day Specials
                        </h2>

                        <p>
                            Choose up to ${MAX_DAY_SPECIALS} items
                            to feature today.
                        </p>

                    </div>

                </div>

                <button
                    type="button"
                    class="day-special-close"
                    id="daySpecialCloseBtn"
                >
                    ×
                </button>

            </div>


            <div class="day-special-modal-body">

                <div class="day-special-counter"
                     id="daySpecialCounter">

                    ⭐ ${specials.length}
                    / ${MAX_DAY_SPECIALS}
                    Day Specials Selected

                </div>


                <div class="day-special-field">

                    <label for="daySpecialCategory">
                        Choose Category
                    </label>

                    <select id="daySpecialCategory">

                        <option value="">
                            Select category
                        </option>

                    </select>

                </div>


                <div class="day-special-field">

                    <label for="daySpecialItem">
                        Choose Item
                    </label>

                    <select
                        id="daySpecialItem"
                        disabled
                    >

                        <option value="">
                            Select category first
                        </option>

                    </select>

                </div>


                <div
                    id="daySpecialPreview"
                    class="day-special-preview"
                >
                </div>


                <div
                    id="daySpecialCurrentList"
                    class="day-special-current-list"
                >
                </div>

            </div>


            <div class="day-special-modal-footer">

                <button
                    type="button"
                    id="daySpecialRemoveBtn"
                    class="day-special-remove-btn"
                    ${specials.length ? '' : 'disabled'}
                >
                    Remove Selected Special
                </button>

                <div class="day-special-footer-right">

                    <button
                        type="button"
                        id="daySpecialCancelBtn"
                        class="day-special-cancel-btn"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        id="daySpecialSaveBtn"
                        class="day-special-save-btn"
                        disabled
                    >
                        ⭐ Add Day Special
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );


    const categorySelect =
        document.getElementById(
            'daySpecialCategory'
        );

    const itemSelect =
        document.getElementById(
            'daySpecialItem'
        );

    const saveButton =
        document.getElementById(
            'daySpecialSaveBtn'
        );

    const removeButton =
        document.getElementById(
            'daySpecialRemoveBtn'
        );


    Object.keys(foods).forEach(
        category => {

            const items =
                Array.isArray(
                    foods[category]
                )
                    ? foods[category]
                    : [];

            if (!items.length) {
                return;
            }

            const option =
                document.createElement(
                    'option'
                );

            option.value =
                category;

            option.textContent =
                category;

            categorySelect.appendChild(
                option
            );

        }
    );


    categorySelect.addEventListener(
        'change',
        () => {

            populateDaySpecialItems(
                categorySelect.value
            );

        }
    );


    itemSelect.addEventListener(
        'change',
        () => {

            const category =
                categorySelect.value;

            const index =
                Number(
                    itemSelect.value
                );

            const items =
                Array.isArray(
                    foods[category]
                )
                    ? foods[category]
                    : [];

            const item =
                items[index];

            renderDaySpecialPreview(
                item
            );

            if (saveButton) {

                saveButton.disabled =
                    !item;

            }

            updateDaySpecialRemoveButton();

        }
    );


    document
        .getElementById(
            'daySpecialCloseBtn'
        )
        ?.addEventListener(
            'click',
            closeDaySpecialModal
        );


    document
        .getElementById(
            'daySpecialCancelBtn'
        )
        ?.addEventListener(
            'click',
            closeDaySpecialModal
        );


    modal.addEventListener(
        'click',
        event => {

            if (
                event.target === modal
            ) {

                closeDaySpecialModal();

            }

        }
    );


    if (saveButton) {

        saveButton.addEventListener(
            'click',
            saveDaySpecial
        );

    }


    if (removeButton) {

        removeButton.addEventListener(
            'click',
            removeDaySpecial
        );

    }


    renderCurrentDaySpecialList();

    updateDaySpecialCounter();

    updateDaySpecialRemoveButton();

}


/* ================================================================
   POPULATE ITEMS
================================================================ */

function populateDaySpecialItems(
    category
) {

    const itemSelect =
        document.getElementById(
            'daySpecialItem'
        );

    if (!itemSelect) {
        return;
    }

    itemSelect.innerHTML =
        '<option value="">Select item</option>';

    itemSelect.disabled =
        !category;

    const saveButton =
        document.getElementById(
            'daySpecialSaveBtn'
        );

    if (saveButton) {

        saveButton.disabled =
            true;

    }

    if (!category) {

        renderDaySpecialPreview(
            null
        );

        updateDaySpecialRemoveButton();

        return;

    }


    const items =
        Array.isArray(
            foods[category]
        )
            ? foods[category]
            : [];


    items.forEach(
        (item, index) => {

            const option =
                document.createElement(
                    'option'
                );

            option.value =
                String(index);

            option.textContent =
                item.name ||
                'Unnamed item';

            itemSelect.appendChild(
                option
            );

        }
    );


    renderDaySpecialPreview(
        null
    );

    updateDaySpecialRemoveButton();

}


/* ================================================================
   UPDATE COUNTER
================================================================ */

function updateDaySpecialCounter() {

    const counter =
        document.getElementById(
            'daySpecialCounter'
        );

    if (!counter) {
        return;
    }

    const count =
        getDaySpecialItems().length;

    counter.innerHTML = `
        ⭐ <strong>${count}</strong>
        / ${MAX_DAY_SPECIALS}
        Day Specials Selected
    `;


    if (count >= MAX_DAY_SPECIALS) {

        counter.classList.add(
            'limit-reached'
        );

    } else {

        counter.classList.remove(
            'limit-reached'
        );

    }

}


/* ================================================================
   CURRENT SPECIALS LIST
================================================================ */

function renderCurrentDaySpecialList() {

    const container =
        document.getElementById(
            'daySpecialCurrentList'
        );

    if (!container) {
        return;
    }

    const specials =
        getDaySpecialItems();

    if (!specials.length) {

        container.innerHTML = `
            <div class="day-special-no-current">
                No Day Specials selected yet.
            </div>
        `;

        return;

    }


    container.innerHTML = `

        <div class="day-special-current-heading">
            Current Day Specials
        </div>

        <div class="day-special-current-items">

            ${specials.map(
                (special, number) => {

                    const item =
                        special.item;

                    const image =
                        typeof item.image === 'string' &&
                        item.image.trim()
                            ? item.image
                            : '';

                    return `

                        <div
                            class="day-special-current-item"
                            data-special-category="${escapeAttributeForAdmin(
                                special.category
                            )}"
                            data-special-index="${special.index}"
                        >

                            <div
                                class="day-special-current-number"
                            >
                                ${number + 1}
                            </div>

                            <div
                                class="day-special-current-image"
                            >

                                ${
                                    image
                                        ? `
                                            <img
                                                src="${escapeAttributeForAdmin(
                                                    image
                                                )}"
                                                alt="${escapeAttributeForAdmin(
                                                    item.name || ''
                                                )}"
                                            >
                                        `
                                        : `
                                            <span>⭐</span>
                                        `
                                }

                            </div>

                            <div
                                class="day-special-current-info"
                            >

                                <strong>
                                    ${escapeHtmlForAdmin(
                                        item.name ||
                                        'Unnamed item'
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtmlForAdmin(
                                        special.category
                                    )}
                                    •
                                    ${escapeHtmlForAdmin(
                                        item.price ?? 0
                                    )} ETB
                                </small>

                            </div>

                            <button
                                type="button"
                                class="day-special-remove-one"
                                data-category="${escapeAttributeForAdmin(
                                    special.category
                                )}"
                                data-index="${special.index}"
                                title="Remove this Day Special"
                            >
                                ×
                            </button>

                        </div>

                    `;

                }
            ).join('')}

        </div>
    `;


    container
        .querySelectorAll(
            '.day-special-remove-one'
        )
        .forEach(button => {

            button.addEventListener(
                'click',
                async event => {

                    event.preventDefault();

                    const category =
                        button.dataset.category;

                    const index =
                        Number(
                            button.dataset.index
                        );

                    await removeSpecificDaySpecial(
                        category,
                        index
                    );

                }
            );

        });

}


/* ================================================================
   REMOVE BUTTON STATE
================================================================ */

function updateDaySpecialRemoveButton() {

    const button =
        document.getElementById(
            'daySpecialRemoveBtn'
        );

    if (!button) {
        return;
    }

    const categorySelect =
        document.getElementById(
            'daySpecialCategory'
        );

    const itemSelect =
        document.getElementById(
            'daySpecialItem'
        );

    const selectedCategory =
        categorySelect?.value || '';

    const selectedIndex =
        itemSelect?.value ?? '';

    let selectedItem = null;

    if (
        selectedCategory &&
        selectedIndex !== ''
    ) {

        const items =
            Array.isArray(
                foods[selectedCategory]
            )
                ? foods[selectedCategory]
                : [];

        selectedItem =
            items[Number(selectedIndex)];

    }


    if (
        selectedItem &&
        selectedItem.isDaySpecial === true
    ) {

        button.disabled = false;

        button.textContent =
            'Remove Selected Special';

        return;

    }


    button.disabled =
        true;

    button.textContent =
        'Select a Current Special';

}


/* ================================================================
   PREVIEW
================================================================ */

function renderDaySpecialPreview(
    item
) {

    const preview =
        document.getElementById(
            'daySpecialPreview'
        );

    if (!preview) {
        return;
    }

    if (!item) {

        preview.innerHTML = `

            <div class="day-special-empty">
                Select a menu item to see its preview.
            </div>

        `;

        return;

    }


    const image =
        typeof item.image === 'string' &&
        item.image.trim()
            ? item.image
            : '';

    const ingredient =
        item.ingridient ||
        item.ingredient ||
        '';


    preview.innerHTML = `

        <div class="day-special-preview-card">

            <div class="day-special-preview-image">

                ${
                    image
                        ? `
                            <img
                                src="${escapeAttributeForAdmin(
                                    image
                                )}"
                                alt="${escapeAttributeForAdmin(
                                    item.name || ''
                                )}"
                            >
                        `
                        : `
                            <div class="day-special-empty">
                                No image
                            </div>
                        `
                }

            </div>


            <div class="day-special-preview-info">

                <h3>
                    ${escapeHtmlForAdmin(
                        item.name ||
                        'Unnamed item'
                    )}
                </h3>

                <p class="special-price">

                    ${escapeHtmlForAdmin(
                        item.price ?? 0
                    )} ETB

                </p>

                <p class="special-ingredient">

                    ${escapeHtmlForAdmin(
                        ingredient ||
                        'No ingredient description'
                    )}

                </p>


                ${
                    item.isDaySpecial === true
                        ? `
                            <span class="day-special-current">
                                ⭐ CURRENT DAY SPECIAL
                            </span>
                        `
                        : ''
                }

            </div>

        </div>

    `;

}


/* ================================================================
   SAVE / ADD DAY SPECIAL
================================================================ */

async function saveDaySpecial() {

    const categorySelect =
        document.getElementById(
            'daySpecialCategory'
        );

    const itemSelect =
        document.getElementById(
            'daySpecialItem'
        );

    if (
        !categorySelect ||
        !itemSelect ||
        !categorySelect.value ||
        itemSelect.value === ''
    ) {

        showMessage(
            'Please choose a menu item first.',
            'error'
        );

        return;

    }


    const category =
        categorySelect.value;

    const index =
        Number(
            itemSelect.value
        );

    const items =
        Array.isArray(
            foods[category]
        )
            ? foods[category]
            : [];

    const selectedItem =
        items[index];


    if (!selectedItem) {

        showMessage(
            'The selected menu item could not be found.',
            'error'
        );

        return;

    }


    if (
        selectedItem.isDaySpecial === true
    ) {

        showMessage(
            `"${selectedItem.name}" is already a Day Special.`,
            'error'
        );

        return;

    }


    const currentSpecials =
        getDaySpecialItems();

    if (
        currentSpecials.length >=
        MAX_DAY_SPECIALS
    ) {

        showMessage(
            `You can have a maximum of ${MAX_DAY_SPECIALS} Day Specials.`,
            'error'
        );

        return;

    }


    const saveButton =
        document.getElementById(
            'daySpecialSaveBtn'
        );

    if (saveButton) {

        saveButton.disabled =
            true;

    }


    showAdminLoading(
        'Adding Day Special...'
    );


    try {

        selectedItem.isDaySpecial =
            true;


        await saveMenuDataSilently();


        renderCurrentMenu();

        renderCurrentDaySpecialList();

        updateDaySpecialCounter();

        updateDaySpecialRemoveButton();


        if (itemSelect) {

            itemSelect.value =
                '';

        }

        renderDaySpecialPreview(
            null
        );


        if (
            getDaySpecialItems().length >=
            MAX_DAY_SPECIALS
        ) {

            if (saveButton) {

                saveButton.disabled =
                    true;

            }

            showMessage(
                `Maximum of ${MAX_DAY_SPECIALS} Day Specials reached.`,
                'success'
            );

        } else {

            showMessage(
                `"${selectedItem.name}" added as a Day Special.`,
                'success'
            );

        }

    } catch (error) {

        console.error(
            'Save Day Special error:',
            error
        );


        delete selectedItem.isDaySpecial;


        renderCurrentMenu();

        renderCurrentDaySpecialList();

        updateDaySpecialCounter();


        showMessage(
            error.message ||
            'Could not save Day Special.',
            'error'
        );

    } finally {

        if (
            saveButton &&
            getDaySpecialItems().length <
                MAX_DAY_SPECIALS
        ) {

            saveButton.disabled =
                false;

        }

        hideAdminLoading();

    }

}


/* ================================================================
   REMOVE SELECTED DAY SPECIAL
================================================================ */

async function removeDaySpecial() {

    const categorySelect =
        document.getElementById(
            'daySpecialCategory'
        );

    const itemSelect =
        document.getElementById(
            'daySpecialItem'
        );

    if (
        !categorySelect ||
        !itemSelect ||
        !categorySelect.value ||
        itemSelect.value === ''
    ) {

        showMessage(
            'Select a current Day Special first.',
            'error'
        );

        return;

    }


    const category =
        categorySelect.value;

    const index =
        Number(
            itemSelect.value
        );

    const items =
        Array.isArray(
            foods[category]
        )
            ? foods[category]
            : [];

    const item =
        items[index];


    if (
        !item ||
        item.isDaySpecial !== true
    ) {

        showMessage(
            'The selected item is not a Day Special.',
            'error'
        );

        return;

    }


    /* =========================================================
       PROFESSIONAL CONFIRMATION
    ========================================================= */

    const itemName =
        item.name ||
        'this item';

    const confirmed =
        await showAdminConfirm({

            title:
                'Remove Day Special?',

            message:
                `"${itemName}" will be removed from today's Day Specials.`,

            confirmText:
                'Remove Special',

            cancelText:
                'Keep Special',

            icon:
                '⭐'

        });


    if (!confirmed) {

        return;

    }


    const removeButton =
        document.getElementById(
            'daySpecialRemoveBtn'
        );

    if (removeButton) {

        removeButton.disabled =
            true;

    }


    showAdminLoading(
        'Removing Day Special...'
    );


    try {

        item.isDaySpecial =
            false;


        await saveMenuDataSilently();


        renderCurrentMenu();

        renderCurrentDaySpecialList();

        updateDaySpecialCounter();

        updateDaySpecialRemoveButton();

        renderDaySpecialPreview(
            null
        );


        itemSelect.value =
            '';


        showMessage(
            `"${itemName}" removed from Day Specials.`,
            'success'
        );

    } catch (error) {

        console.error(
            'Remove Day Special error:',
            error
        );


        item.isDaySpecial =
            true;


        renderCurrentMenu();

        renderCurrentDaySpecialList();

        updateDaySpecialCounter();


        showMessage(
            error.message ||
            'Could not remove Day Special.',
            'error'
        );

    } finally {

        hideAdminLoading();

    }

}


/* ================================================================
   REMOVE ONE SPECIFIC DAY SPECIAL
================================================================ */

async function removeSpecificDaySpecial(
    category,
    index
) {

    const items =
        Array.isArray(
            foods[category]
        )
            ? foods[category]
            : [];

    const item =
        items[index];


    if (
        !item ||
        item.isDaySpecial !== true
    ) {

        showMessage(
            'Day Special could not be found.',
            'error'
        );

        return;

    }


    /* =========================================================
       PROFESSIONAL CONFIRMATION
    ========================================================= */

    const itemName =
        item.name ||
        'this item';

    const confirmed =
        await showAdminConfirm({

            title:
                'Remove Day Special?',

            message:
                `"${itemName}" will be removed from today's Day Specials.`,

            confirmText:
                'Remove Special',

            cancelText:
                'Keep Special',

            icon:
                '⭐'

        });


    if (!confirmed) {

        return;

    }


    showAdminLoading(
        'Removing Day Special...'
    );


    try {

        item.isDaySpecial =
            false;


        await saveMenuDataSilently();


        renderCurrentMenu();

        renderCurrentDaySpecialList();

        updateDaySpecialCounter();

        updateDaySpecialRemoveButton();


        const itemSelect =
            document.getElementById(
                'daySpecialItem'
            );

        if (itemSelect) {

            itemSelect.value =
                '';

        }


        renderDaySpecialPreview(
            null
        );


        showMessage(
            `"${itemName}" removed from Day Specials.`,
            'success'
        );

    } catch (error) {

        console.error(
            'Remove specific Day Special error:',
            error
        );


        item.isDaySpecial =
            true;


        renderCurrentMenu();

        renderCurrentDaySpecialList();

        updateDaySpecialCounter();


        showMessage(
            error.message ||
            'Could not remove Day Special.',
            'error'
        );

    } finally {

        hideAdminLoading();

    }

}


/* ================================================================
   SAVE MENU SILENTLY
================================================================ */

async function saveMenuDataSilently() {

    if (!currentRestaurant) {

        throw new Error(
            'Restaurant information is not available.'
        );

    }


    const response =
        await fetch(
            '/api/admin/menu/' +
            encodeURIComponent(
                currentRestaurant.slug
            ),
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                credentials:
                    'same-origin',

                body:
                    JSON.stringify({
                        menu: foods
                    })
            }
        );


    let data = {};

    try {

        data =
            await response.json();

    } catch (error) {

        data = {};

    }


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        window.location.replace(
            '/admin.html'
        );

        throw new Error(
            data.message ||
            'Your admin session has expired.'
        );

    }


    if (
        !response.ok ||
        !data.ok
    ) {

        throw new Error(
            data.message ||
            'Failed to save menu.'
        );

    }


    return data;

}


/* ================================================================
   CLOSE DAY SPECIAL MODAL
================================================================ */

function closeDaySpecialModal() {

    const modal =
        document.getElementById(
            'daySpecialModal'
        );

    if (modal) {

        modal.classList.remove(
            'active'
        );

        setTimeout(
            () => {

                if (modal) {
                    modal.remove();
                }

            },
            200
        );

    }

}


/* ================================================================
   ESCAPE HTML
================================================================ */

function escapeHtmlForAdmin(value) {

    return String(value ?? '')
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );

}


/* ================================================================
   ESCAPE ATTRIBUTE
================================================================ */

function escapeAttributeForAdmin(value) {

    return String(value ?? '')
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        );

}


/* ================================================================
   LOGOUT
================================================================ */

async function logoutAdmin() {

    showAdminLoading(
        'Logging out...'
    );

    try {

        await fetch(
            '/api/admin/logout',
            {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );

    } catch (error) {

        console.error(
            'Logout error:',
            error
        );

    }

    localStorage.removeItem(
        'adminToken'
    );

    localStorage.removeItem(
        'adminRole'
    );

    localStorage.removeItem(
        'adminRestaurantId'
    );

    localStorage.removeItem(
        'adminRestaurantSlug'
    );

    localStorage.removeItem(
        'adminRestaurantName'
    );

    localStorage.removeItem(
        'selectedRestaurantSlug'
    );

    window.location.replace(
        '/admin.html'
    );

}


/* ================================================================
   BUTTON EVENTS
================================================================ */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        const refreshBtn =
            document.getElementById(
                'adminRefreshBtn'
            );

        const profileBtn =
            document.getElementById(
                'profileBtn'
            );

        const daySpecialBtn =
            document.getElementById(
                'daySpecialBtn'
            );

        const logoutBtn =
            document.getElementById(
                'logoutBtn'
            );

        const profileCloseBtn =
            document.getElementById(
                'profileCloseBtn'
            );

        const profileCancelBtn =
            document.getElementById(
                'profileCancelBtn'
            );

        const addPhoneBtn =
            document.getElementById(
                'addPhoneBtn'
            );

        const addLocationBtn =
            document.getElementById(
                'addLocationBtn'
            );

        const profileSaveBtn =
            document.getElementById(
                'profileSaveBtn'
            );

        const profileLogoInput =
            document.getElementById(
                'profileLogoInput'
            );

        const profileLogoRemoveBtn =
            document.getElementById(
                'profileLogoRemoveBtn'
            );

        const editItemImage =
            document.getElementById(
                'editItemImage'
            );


        /* =========================================================
           REFRESH
        ========================================================= */

        if (refreshBtn) {

            refreshBtn.addEventListener(
                'click',
                refreshAdminMenu
            );

        }


        /* =========================================================
           PROFILE
        ========================================================= */

        if (profileBtn) {

            profileBtn.addEventListener(
                'click',
                openProfileModal
            );

        }

        if (profileCloseBtn) {

            profileCloseBtn.addEventListener(
                'click',
                closeProfileModal
            );

        }

        if (profileCancelBtn) {

            profileCancelBtn.addEventListener(
                'click',
                closeProfileModal
            );

        }

        if (addPhoneBtn) {

            addPhoneBtn.addEventListener(
                'click',
                addPhoneRow
            );

        }

        if (addLocationBtn) {

            addLocationBtn.addEventListener(
                'click',
                addLocationRow
            );

        }

        if (profileSaveBtn) {

            profileSaveBtn.addEventListener(
                'click',
                saveRestaurantProfile
            );

        }


        /* =========================================================
           EDIT ITEM IMAGE
        ========================================================= */

        if (editItemImage) {

            editItemImage.addEventListener(
                'change',
                handleEditItemImageChange
            );

        }


        /* =========================================================
           PROFILE LOGO
        ========================================================= */

        if (profileLogoInput) {

            profileLogoInput.addEventListener(
                'change',
                handleProfileLogoChange
            );

        }

        if (profileLogoRemoveBtn) {

            profileLogoRemoveBtn.addEventListener(
                'click',
                removeProfileLogo
            );

        }


        /* =========================================================
           PROFILE MODAL CLICK OUTSIDE
        ========================================================= */

        const profileModal =
            document.getElementById(
                'profileModal'
            );

        if (profileModal) {

            profileModal.addEventListener(
                'click',
                event => {

                    if (
                        event.target ===
                        profileModal
                    ) {

                        closeProfileModal();

                    }

                }
            );

        }


        /* =========================================================
           ESC KEY
        ========================================================= */

        document.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Escape'
                ) {

                    const confirmModal =
                        document.getElementById(
                            'adminConfirmModal'
                        );

                    if (confirmModal) {

                        return;

                    }

                    const daySpecialModal =
                        document.getElementById(
                            'daySpecialModal'
                        );

                    if (daySpecialModal) {

                        closeDaySpecialModal();

                        return;

                    }

                    closeProfileModal();

                }

            }
        );


        /* =========================================================
           DAY SPECIAL
        ========================================================= */

        if (daySpecialBtn) {

            daySpecialBtn.addEventListener(
                'click',
                openDaySpecialModal
            );

        }


        /* =========================================================
           LOGOUT
        ========================================================= */

        if (logoutBtn) {

            logoutBtn.addEventListener(
                'click',
                logoutAdmin
            );

        }


        /* =========================================================
           START ADMIN
        ========================================================= */

        checkCafeAdminAccess();

    }
);