let currentRestaurant = null;
let foods = {};


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

let adminLoadingTimer = null;

/* ================================================================
PROFESSIONAL LOADING SCREEN
================================================================ */

function showAdminLoading(message = 'Please wait...') {


clearTimeout(adminLoadingTimer);

let overlay =
    document.getElementById(
        'adminLoadingOverlay'
    );

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

function hideAdminLoading(
minimumTime = 150
) {


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

function showMessage(
text,
type = 'success'
) {


const oldMessage =
    document.getElementById(
        'message'
    );

if (oldMessage) {
    oldMessage.style.display =
        'none';
}

const existingPopup =
    document.getElementById(
        'adminCenterMessage'
    );

if (existingPopup) {
    existingPopup.remove();
}

const popup =
    document.createElement(
        'div'
    );

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
        document.createElement(
            'style'
        );

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

document.body.appendChild(
    popup
);

requestAnimationFrame(() => {

    popup.classList.add(
        'visible'
    );

});

popup._messageTimer =
    setTimeout(() => {

        popup.classList.remove(
            'visible'
        );

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
        params.get(
            'restaurant'
        );

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
        pageLoading.style.display =
            'none';
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
        pageLoading.style.display =
            'none';
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

menuList.innerHTML =
    '';

const categories =
    Object.keys(
        foods
    );

if (!categories.length) {

    menuList.innerHTML =
        '<p>No menu items yet.</p>';

    return;
}

categories.forEach(
    category => {

        const items =
            Array.isArray(
                foods[category]
            )
                ? foods[category]
                : [];

        const categoryBox =
            document.createElement(
                'div'
            );

        categoryBox.className =
            'menu-category';

        const title =
            document.createElement(
                'h4'
            );

        title.textContent =
            category;

        categoryBox.appendChild(
            title
        );

        items.forEach(
            item => {

                const div =
                    document.createElement(
                        'div'
                    );

                div.className =
                    'menu-item';

                div.textContent =
                    `${item.name || ''} - ${item.price || 0} ETB`;

                categoryBox.appendChild(
                    div
                );

            }
        );

        menuList.appendChild(
            categoryBox
        );

    }
);


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
    Object.keys(
        foods
    );

if (newCategory) {

    const previous =
        newCategory.value;

    newCategory.innerHTML =
        '<option value="">Select category</option>';

    categories.forEach(
        category => {

            const option =
                document.createElement(
                    'option'
                );

            option.value =
                category;

            option.textContent =
                category;

            newCategory.appendChild(
                option
            );

        }
    );

    if (
        categories.includes(
            previous
        )
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

    categories.forEach(
        category => {

            const option =
                document.createElement(
                    'option'
                );

            option.value =
                category;

            option.textContent =
                category;

            editCategory.appendChild(
                option
            );

        }
    );

    if (
        categories.includes(
            previous
        )
    ) {

        editCategory.value =
            previous;

    }

}


}

/* ================================================================
UPDATE/DELETE CATEGORY SELECT
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

Object.keys(
    foods
).forEach(
    category => {

        const option =
            document.createElement(
                'option'
            );

        option.value =
            category;

        option.textContent =
            category;

        select.appendChild(
            option
        );

    }
);

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

    items.forEach(
        (item, index) => {

            const option =
                document.createElement('option');

            /*
             * Use the item's position inside the
             * selected category instead of its ID.
             */

            option.value =
                String(index);

            option.textContent =
                item.name || 'Unnamed item';

            select.appendChild(option);

        }
    );

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

itemSelect.value =
    '';

clearEditFields();

refreshExistingItemsSelect();

if (
    categorySelect.value
) {

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
        item.name ||
        '';

}

if (price) {

    price.value =
        item.price ??
        '';

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
].forEach(
    id => {

        const element =
            document.getElementById(
                id
            );

        if (element) {

            element.value =
                '';

        }

    }
);

const available =
    document.getElementById(
        'editItemAvailable'
    );

if (available) {

    available.checked =
        false;

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

        /*
         * =====================================================
         * PRESERVE EXISTING CATEGORY ORDER
         *
         * Existing categories stay exactly where they are.
         * New category is added at the very bottom.
         * =====================================================
         */

        const newFoods = {};

        Object.keys(foods).forEach(
            existingCategory => {

                newFoods[existingCategory] =
                    foods[existingCategory];

            }
        );

        /*
         * Add the new category LAST
         */

        newFoods[category] = [];

        /*
         * Replace foods with the newly ordered object
         */

        foods = newFoods;

        console.log(
            'CATEGORY ORDER AFTER ADD:',
            Object.keys(foods)
        );

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

Object.keys(
    foods
).forEach(
    category => {

        const option =
            document.createElement(
                'option'
            );

        option.value =
            category;

        option.textContent =
            category;

        select.appendChild(
            option
        );

    }
);

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

    input.value =
        '';

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
        newCategory ===
        oldCategory
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

        /*
         * Build a new object while preserving
         * the EXACT original category positions.
         */

        const newFoods = {};

        Object.keys(foods).forEach(
            category => {

                if (
                    category ===
                    oldCategory
                ) {

                    /*
                     * Put renamed category
                     * exactly where the old one was.
                     */

                    newFoods[newCategory] =
                        foods[category];

                } else {

                    /*
                     * Keep every other category
                     * exactly where it was.
                     */

                    newFoods[category] =
                        foods[category];

                }

            }
        );


        foods =
            newFoods;


        /*
         * Refresh UI without changing order.
         */

        updateAdminCategoryOptions();

        updateCategoryManager();

        updateExistingItemCategorySelect();

        refreshExistingItemsSelect();

        renderCurrentMenu();


        /*
         * Restore renamed category selection.
         */

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

            reader.readAsDataURL(
                file
            );

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
        await readImageFile(
            file
        );

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                file ? 0 : 450
            )
    );

    if (!foods[category]) {

        foods[category] =
            [];

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

    nameInput.value =
        '';

    priceInput.value =
        '';

    if (ingredientInput) {

        ingredientInput.value =
            '';

    }

    if (imageInput) {

        imageInput.value =
            '';

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
    !Number.isFinite(
        newPrice
    )
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

    /*
     * If the item moved to another category,
     * automatically select the new category.
     */

    const categorySelect =
        document.getElementById(
            'existingItemCategorySelect'
        );

    if (categorySelect) {

        categorySelect.value =
            newCategory;

    }

    refreshExistingItemsSelect();

    /*
     * Re-select the updated item when possible.
     */


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

        /*
         * Remove ONLY the selected item.
         */

        selected.items.splice(
            selected.index,
            1
        );


        /*
         * Remove every empty category.
         */

        removeEmptyCategories();


        /*
         * Refresh category controls.
         */

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


        /*
         * If the category still exists,
         * keep that category selected.
         */

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

        }

        /*
         * If the category became empty,
         * remove it from the selection completely.
         */

        else {

            if (categorySelect) {

                categorySelect.value =
                    '';

            }

            if (itemSelect) {

                itemSelect.innerHTML =
                    '<option value="">Select category first</option>';

                itemSelect.disabled =
                    true;

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

    hideAdminLoading(
        150
    );

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

    button.disabled =
        true;

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

        button.disabled =
            false;

        button.textContent =
            '↻ Refresh';

    }

    hideAdminLoading(
        150
    );

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
START
================================================================ */

document.addEventListener(
'DOMContentLoaded',
() => {

    checkCafeAdminAccess();

}


);
