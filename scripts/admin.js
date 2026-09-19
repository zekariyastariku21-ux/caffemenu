let currentRestaurant = null;
let foods = {};

let restaurantProfile = {
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
            ${text}
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

    }

    console.log(
        'foods loaded:',
        foods
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

            div.textContent =
                `${item.name || ''} - ${item.price || 0} ETB`;

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

        renderCurrentMenu();

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

    const newName =
        document.getElementById(
            'editItemName'
        )?.value.trim();

    const newPrice =
        Number(
            document.getElementById(
                'editItemPrice'
            )?.value
        );

    const newIngredient =
        document.getElementById(
            'editItemIngredient'
        )?.value.trim() ||
        '';

    const newCategory =
        document.getElementById(
            'editItemCategory'
        )?.value ||
        oldCategory;

    const available =
        document.getElementById(
            'editItemAvailable'
        );

    if (!newName) {

        showMessage(
            'Item name is required.',
            'error'
        );

        return;
    }

    if (
        !Number.isFinite(newPrice)
    ) {

        showMessage(
            'Please enter a valid price.',
            'error'
        );

        return;
    }

    showAdminLoading(
        'Updating item...'
    );

    try {

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    450
                )
        );

        item.name =
            newName;

        item.price =
            newPrice;

        item.ingridient =
            newIngredient;

        item.isAvailable =
            available
                ? available.checked
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

                foods[newCategory] = [];

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
            `"${item.name}" updated. Click Save Menu to save it.`,
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
   PROFILE
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

            row.appendChild(input);

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

            row.appendChild(nameInput);

            row.appendChild(urlInput);

            row.appendChild(deleteButton);

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

            phone_numbers:
                phoneNumbers,

            addresses:
                addresses

        };

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


        /* ============================================================
           REFRESH
        ============================================================ */

        if (refreshBtn) {

            refreshBtn.addEventListener(
                'click',
                refreshAdminMenu
            );

        }


        /* ============================================================
           PROFILE
        ============================================================ */

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


        /* ============================================================
           CLOSE PROFILE BY CLICKING OUTSIDE
        ============================================================ */

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


        /* ============================================================
           ESCAPE KEY
        ============================================================ */

        document.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Escape'
                ) {

                    closeProfileModal();

                }

            }
        );


        /* ============================================================
           DAY SPECIAL
        ============================================================ */

        if (daySpecialBtn) {

            daySpecialBtn.addEventListener(
                'click',
                () => {

                    showMessage(
                        'Day Special feature is coming next.',
                        'success'
                    );

                }
            );

        }


        /* ============================================================
           LOGOUT
        ============================================================ */

        if (logoutBtn) {

            logoutBtn.addEventListener(
                'click',
                logoutAdmin
            );

        }


        /* ============================================================
           START DASHBOARD
        ============================================================ */

        checkCafeAdminAccess();

    }
);