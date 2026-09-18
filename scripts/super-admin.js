let ownerRestaurantFilter = 'all';
let ownerRestaurantsData = [];
let ownerOpenRestaurantId = null;


/*
|--------------------------------------------------------------------------
| PROFESSIONAL LOADING SCREEN
|--------------------------------------------------------------------------
*/

let ownerLoadingDepth = 0;

function showOwnerLoading(
    message = 'Please wait...'
) {

    ownerLoadingDepth++;

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

            <div class="owner-loading-box">

                <div class="owner-loading-spinner"></div>

                <div
                    id="ownerLoadingMessage"
                    class="owner-loading-message"
                >
                    ${escapeHtml(message)}
                </div>

                <div class="owner-loading-submessage">
                    Please wait...
                </div>

            </div>

        `;

        overlay.style.cssText = `

            position: fixed;
            inset: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.48);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            cursor: wait;

        `;

        const style =
            document.createElement(
                'style'
            );

        style.textContent = `

            .owner-loading-box {
                width: min(90%, 360px);
                background: #ffffff;
                border-radius: 18px;
                padding: 30px 25px;
                text-align: center;
                box-shadow:
                    0 20px 60px rgba(0,0,0,0.25);
            }

            .owner-loading-spinner {
                width: 48px;
                height: 48px;
                margin: 0 auto 18px;
                border: 5px solid #eadfd4;
                border-top-color: #4a2f22;
                border-radius: 50%;
                animation:
                    ownerLoadingSpin
                    0.8s linear infinite;
            }

            .owner-loading-message {
                font-size: 19px;
                font-weight: 700;
                color: #3b2a20;
                margin-bottom: 7px;
            }

            .owner-loading-submessage {
                font-size: 14px;
                color: #777;
            }

            @keyframes ownerLoadingSpin {

                to {
                    transform: rotate(360deg);
                }

            }

            body.owner-loading-active {
                overflow: hidden;
            }

            #ownerLoadingOverlay * {
                pointer-events: none;
            }

        `;

        document.head.appendChild(
            style
        );

        document.body.appendChild(
            overlay
        );

    }

    const messageElement =
        document.getElementById(
            'ownerLoadingMessage'
        );

    if (messageElement) {

        messageElement.textContent =
            message;

    }

    overlay.style.display =
        'flex';

    document.body.classList.add(
        'owner-loading-active'
    );

}


function hideOwnerLoading() {

    if (
        ownerLoadingDepth > 0
    ) {

        ownerLoadingDepth--;

    }

    if (
        ownerLoadingDepth > 0
    ) {

        return;

    }

    const overlay =
        document.getElementById(
            'ownerLoadingOverlay'
        );

    if (overlay) {

        overlay.style.display =
            'none';

    }

    document.body.classList.remove(
        'owner-loading-active'
    );

}


/*
|--------------------------------------------------------------------------
| HTML ESCAPE
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {

    return String(
        value ?? ''
    )
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


/*
|--------------------------------------------------------------------------
| CHECK SUPER ADMIN LOGIN
|--------------------------------------------------------------------------
*/

async function checkSuperAdminAccess() {

    showOwnerLoading(
        'Checking login...'
    );

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
            data.user.role !==
            'super_admin'
        ) {

            window.location.replace(
                '/admin.html'
            );

            return;

        }

        await loadOwnerCafes();

    } catch (error) {

        console.error(
            'Super admin access error:',
            error
        );

        window.location.replace(
            '/admin.html'
        );

    } finally {

        hideOwnerLoading();

    }

}


/*
|--------------------------------------------------------------------------
| FILTER RESTAURANTS
|--------------------------------------------------------------------------
*/

function filterOwnerRestaurants(
    filter
) {

    ownerRestaurantFilter =
        filter;

    ownerOpenRestaurantId =
        null;

    renderOwnerRestaurantList();

    document
        .querySelectorAll(
            '.stat-filter'
        )
        .forEach(
            button => {

                button.classList.remove(
                    'selected'
                );

            }
        );

    const buttons =
        document.querySelectorAll(
            '.stat-filter'
        );

    if (
        filter === 'all' &&
        buttons[0]
    ) {

        buttons[0].classList.add(
            'selected'
        );

    }

    if (
        filter === 'active' &&
        buttons[1]
    ) {

        buttons[1].classList.add(
            'selected'
        );

    }

    if (
        filter === 'disabled' &&
        buttons[2]
    ) {

        buttons[2].classList.add(
            'selected'
        );

    }

}


/*
|--------------------------------------------------------------------------
| OPEN / CLOSE RESTAURANT ACTIONS
|--------------------------------------------------------------------------
*/

function toggleOwnerRestaurantActions(
    restaurantId
) {

    const normalizedId =
        String(
            restaurantId
        );

    if (
        ownerOpenRestaurantId ===
        normalizedId
    ) {

        ownerOpenRestaurantId =
            null;

    } else {

        ownerOpenRestaurantId =
            normalizedId;

    }

    renderOwnerRestaurantList();

}


/*
|--------------------------------------------------------------------------
| RENDER RESTAURANT LIST
|--------------------------------------------------------------------------
*/

function renderOwnerRestaurantList() {

    const container =
        document.getElementById(
            'ownerCafeList'
        );

    if (!container) {
        return;
    }

    let restaurants =
        ownerRestaurantsData;

    if (
        ownerRestaurantFilter ===
        'active'
    ) {

        restaurants =
            ownerRestaurantsData.filter(
                cafe =>
                    cafe.status ===
                    'active'
            );

    }

    if (
        ownerRestaurantFilter ===
        'disabled'
    ) {

        restaurants =
            ownerRestaurantsData.filter(
                cafe =>
                    cafe.status ===
                    'disabled'
            );

    }

    if (!restaurants.length) {

        const message =
            ownerRestaurantFilter ===
            'active'
                ? 'No active restaurants found.'
                : ownerRestaurantFilter ===
                  'disabled'
                    ? 'No disabled restaurants found.'
                    : 'No restaurants found.';

        container.innerHTML = `

            <div class="owner-empty-state">
                ${escapeHtml(message)}
            </div>

        `;

        return;

    }

    /*
     * Build list
     */

    container.innerHTML = '';

    restaurants.forEach(
        (cafe, index) => {

            const cafeId =
                String(
                    cafe.id
                );

            const isOpen =
                ownerOpenRestaurantId ===
                cafeId;

            /*
             * Main restaurant row
             */

            const card =
                document.createElement(
                    'div'
                );

            card.className =
                'owner-cafe-card';

            if (isOpen) {

                card.classList.add(
                    'open'
                );

            }

            /*
             * Restaurant main row
             */

            const row =
                document.createElement(
                    'div'
                );

            row.className =
                'owner-cafe-row';

            /*
             * Number
             */

            const number =
                document.createElement(
                    'div'
                );

            number.className =
                'owner-cafe-number';

            number.textContent =
                index + 1;

            /*
             * Restaurant information
             */

            const info =
                document.createElement(
                    'div'
                );

            info.className =
                'owner-cafe-info';

            const name =
                document.createElement(
                    'div'
                );

            name.className =
                'owner-cafe-name';

            name.textContent =
                cafe.name ||
                'Restaurant';

            const slug =
                document.createElement(
                    'div'
                );

            slug.className =
                'owner-cafe-slug';

            slug.textContent =
                cafe.slug ||
                '—';

            info.appendChild(
                name
            );

            info.appendChild(
                slug
            );

            /*
             * Status
             */

            const status =
                document.createElement(
                    'div'
                );

            status.className =
                'owner-cafe-status';

            const statusIsActive =
                cafe.status ===
                'active';

            status.classList.add(
                statusIsActive
                    ? 'active'
                    : 'disabled'
            );

            const statusDot =
                document.createElement(
                    'span'
                );

            statusDot.className =
                'owner-status-dot';

            const statusText =
                document.createElement(
                    'span'
                );

            statusText.textContent =
                statusIsActive
                    ? 'Active'
                    : 'Disabled';

            status.appendChild(
                statusDot
            );

            status.appendChild(
                statusText
            );

            /*
             * Open button
             */

            const mainActions =
                document.createElement(
                    'div'
                );

            mainActions.className =
                'owner-cafe-main-actions';

            const openButton =
                document.createElement(
                    'button'
                );

            openButton.type =
                'button';

            openButton.className =
                'open-cafe-btn';

            openButton.textContent =
                isOpen
                    ? 'Close'
                    : 'Open';

            openButton.setAttribute(
                'aria-expanded',
                isOpen
                    ? 'true'
                    : 'false'
            );

            openButton.addEventListener(
                'click',
                () => {

                    toggleOwnerRestaurantActions(
                        cafe.id
                    );

                }
            );

            mainActions.appendChild(
                openButton
            );

            /*
             * Add main row pieces
             */

            row.appendChild(
                number
            );

            row.appendChild(
                info
            );

            row.appendChild(
                status
            );

            row.appendChild(
                mainActions
            );

            card.appendChild(
                row
            );

            /*
             * ACTION PANEL
             */

            if (isOpen) {

                const actionPanel =
                    document.createElement(
                        'div'
                    );

                actionPanel.className =
                    'owner-cafe-action-panel';

                /*
                 * Action title
                 */

                const actionHeader =
                    document.createElement(
                        'div'
                    );

                actionHeader.className =
                    'owner-cafe-action-header';

                actionHeader.innerHTML = `

                    <div>
                        <div class="owner-cafe-action-title">
                            ${escapeHtml(
                                cafe.name ||
                                'Restaurant'
                            )}
                        </div>

                        <div class="owner-cafe-action-subtitle">
                            Restaurant management
                        </div>
                    </div>

                `;

                actionPanel.appendChild(
                    actionHeader
                );

                /*
                 * Action buttons
                 */

                const actionButtons =
                    document.createElement(
                        'div'
                    );

                actionButtons.className =
                    'owner-cafe-action-buttons';

                /*
                 * Edit Restaurant
                 */

                const editButton =
                    document.createElement(
                        'button'
                    );

                editButton.type =
                    'button';

                editButton.className =
                    'owner-cafe-action-btn';

                editButton.innerHTML = `
                    <span class="owner-action-icon">✎</span>
                    <span>Edit Restaurant</span>
                `;

                editButton.addEventListener(
                    'click',
                    () => {

                        editOwnerCafe(
                            cafe.id,
                            cafe.name,
                            cafe.slug
                        );

                    }
                );

                /*
                 * Admin Account
                 */

                const adminButton =
                    document.createElement(
                        'button'
                    );

                adminButton.type =
                    'button';

                adminButton.className =
                    'owner-cafe-action-btn';

                adminButton.innerHTML = `
                    <span class="owner-action-icon">♙</span>
                    <span>Admin Account</span>
                `;

                adminButton.addEventListener(
                    'click',
                    () => {

                        editOwnerCafeAdmin(
                            cafe.id,
                            cafe.name
                        );

                    }
                );

                /*
                 * Enable / Disable
                 */

                const statusButton =
                    document.createElement(
                        'button'
                    );

                statusButton.type =
                    'button';

                statusButton.className =
                    statusIsActive
                        ? 'owner-cafe-action-btn owner-disable-action'
                        : 'owner-cafe-action-btn owner-enable-action';

                statusButton.innerHTML =
                    statusIsActive
                        ? `
                            <span class="owner-action-icon">◐</span>
                            <span>Disable</span>
                          `
                        : `
                            <span class="owner-action-icon">●</span>
                            <span>Enable</span>
                          `;

                statusButton.addEventListener(
                    'click',
                    () => {

                        toggleOwnerCafeStatus(
                            cafe.id,
                            cafe.name,
                            cafe.status
                        );

                    }
                );

                /*
                 * Delete
                 */

                const deleteButton =
                    document.createElement(
                        'button'
                    );

                deleteButton.type =
                    'button';

                deleteButton.className =
                    'owner-cafe-action-btn owner-delete-action';

                deleteButton.innerHTML = `
                    <span class="owner-action-icon">⌫</span>
                    <span>Delete</span>
                `;

                deleteButton.addEventListener(
                    'click',
                    () => {

                        deleteOwnerCafe(
                            cafe.id,
                            cafe.name
                        );

                    }
                );

                actionButtons.appendChild(
                    editButton
                );

                actionButtons.appendChild(
                    adminButton
                );

                actionButtons.appendChild(
                    statusButton
                );

                actionButtons.appendChild(
                    deleteButton
                );

                actionPanel.appendChild(
                    actionButtons
                );

                card.appendChild(
                    actionPanel
                );

            }

            container.appendChild(
                card
            );

        }
    );

}


/*
|--------------------------------------------------------------------------
| LOAD RESTAURANTS
|--------------------------------------------------------------------------
*/

async function loadOwnerCafes() {

    const container =
        document.getElementById(
            'ownerCafeList'
        );

    if (!container) {
        return;
    }

    showOwnerLoading(
        'Loading restaurants...'
    );

    container.innerHTML =
        'Loading cafés...';

    try {

        const token =
            localStorage.getItem(
                'adminToken'
            );

        if (!token) {

            window.location.replace(
                '/admin.html'
            );

            return;

        }

        const response =
            await fetch(
                '/api/owner/restaurants',
                {
                    method: 'GET',

                    headers: {
                        'Authorization':
                            'Bearer ' +
                            token
                    },

                    credentials:
                        'same-origin',

                    cache:
                        'no-store'
                }
            );

        const data =
            await response.json();

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            window.location.replace(
                '/admin.html'
            );

            return;

        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                'Failed to load cafés.'
            );

        }

        ownerRestaurantsData =
            Array.isArray(
                data.restaurants
            )
                ? data.restaurants
                : [];

        /*
         * Keep currently opened restaurant only
         * if it still exists.
         */

        if (
            ownerOpenRestaurantId !== null
        ) {

            const exists =
                ownerRestaurantsData.some(
                    cafe =>
                        String(cafe.id) ===
                        String(
                            ownerOpenRestaurantId
                        )
                );

            if (!exists) {

                ownerOpenRestaurantId =
                    null;

            }

        }

        /*
         * Statistics
         */

        const total =
            ownerRestaurantsData.length;

        const active =
            ownerRestaurantsData.filter(
                cafe =>
                    cafe.status ===
                    'active'
            ).length;

        const disabled =
            ownerRestaurantsData.filter(
                cafe =>
                    cafe.status ===
                    'disabled'
            ).length;

        const totalEl =
            document.getElementById(
                'totalRestaurants'
            );

        const activeEl =
            document.getElementById(
                'activeRestaurants'
            );

        const disabledEl =
            document.getElementById(
                'disabledRestaurants'
            );

        if (totalEl) {

            totalEl.textContent =
                total;

        }

        if (activeEl) {

            activeEl.textContent =
                active;

        }

        if (disabledEl) {

            disabledEl.textContent =
                disabled;

        }

        renderOwnerRestaurantList();

    } catch (error) {

        console.error(
            'Load restaurants error:',
            error
        );

        container.innerHTML = `

            <div class="owner-empty-state">

                <div style="
                    font-size:18px;
                    margin-bottom:6px;
                ">
                    ⚠
                </div>

                <strong>
                    Failed to load restaurants
                </strong>

                <div style="
                    margin-top:5px;
                    color:#777;
                ">
                    ${escapeHtml(
                        error.message
                    )}
                </div>

            </div>

        `;

    } finally {

        hideOwnerLoading();

    }

}


/*
|--------------------------------------------------------------------------
| REFRESH DASHBOARD
|--------------------------------------------------------------------------
*/

async function refreshOwnerDashboard() {

    const button =
        document.getElementById(
            'ownerRefreshBtn'
        );

    if (button) {

        button.disabled =
            true;

        button.textContent =
            '↻ Refreshing...';

    }

    showOwnerLoading(
        'Refreshing dashboard...'
    );

    try {

        await loadOwnerCafes();

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                '↻ Refresh';

        }

        hideOwnerLoading();

    }

}


/*
|--------------------------------------------------------------------------
| CREATE CAFE
|--------------------------------------------------------------------------
*/

function openCreateCafePanel() {

    openOwnerActionPanel(
        'Create New Café',
        `

        <div style="
            margin-bottom:18px;
            color:#666;
            font-size:14px;
            line-height:1.5;
        ">
            Create a new restaurant and its café administrator.
            The restaurant will be active after creation.
        </div>

        <label>
            Restaurant Name
        </label>

        <input
            id="newCafeName"
            type="text"
            placeholder="Example: Zekariyas Coffee"
        >

        <label>
            Restaurant Slug
        </label>

        <input
            id="newCafeSlug"
            type="text"
            placeholder="Example: zekariyas-coffee"
        >

        <div style="
            margin-top:5px;
            font-size:12px;
            color:#777;
        ">
            The slug is used in the public restaurant URL.
        </div>

        <label>
            Admin Email
        </label>

        <input
            id="newCafeAdminEmail"
            type="email"
            placeholder="admin@example.com"
        >

        <label>
            Admin Password
        </label>

        <input
            id="newCafeAdminPassword"
            type="password"
            placeholder="Create admin password"
        >

        <div class="owner-action-buttons">

            <button
                class="owner-secondary-btn"
                onclick="closeOwnerActionPanel()"
            >
                Cancel
            </button>

            <button
                class="owner-primary-btn"
                onclick="submitCreateOwnerCafe()"
            >
                Create Café
            </button>

        </div>

        `
    );

}


/*
|--------------------------------------------------------------------------
| CREATE CAFE REQUEST
|--------------------------------------------------------------------------
*/

async function submitCreateOwnerCafe() {

    const name =
        document.getElementById(
            'newCafeName'
        )?.value.trim();

    const slug =
        document.getElementById(
            'newCafeSlug'
        )?.value.trim().toLowerCase();

    const adminEmail =
        document.getElementById(
            'newCafeAdminEmail'
        )?.value.trim().toLowerCase();

    const adminPassword =
        document.getElementById(
            'newCafeAdminPassword'
        )?.value.trim();

    if (
        !name ||
        !slug ||
        !adminEmail ||
        !adminPassword
    ) {

        showOwnerNotification(
            'Please complete all café and administrator fields.',
            'warning',
            'Missing Information'
        );

        return;

    }

    showOwnerLoading(
        'Creating café...'
    );

    try {

        const token =
            localStorage.getItem(
                'adminToken'
            );

        const response =
            await fetch(
                '/api/owner/restaurants',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',

                        'Authorization':
                            'Bearer ' +
                            token
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
            await response.json();

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            window.location.replace(
                '/admin.html'
            );

            return;

        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                'Failed to create café.'
            );

        }

        closeOwnerActionPanel();

        showOwnerNotification(
            `${name} has been created successfully.`,
            'success',
            'Café Created'
        );

        await loadOwnerCafes();

    } catch (error) {

        console.error(
            'Create café error:',
            error
        );

        showOwnerNotification(
            error.message,
            'error',
            'Creation Failed'
        );

    } finally {

        hideOwnerLoading();

    }

}


/*
|--------------------------------------------------------------------------
| EDIT RESTAURANT
|--------------------------------------------------------------------------
*/

function editOwnerCafe(
    id,
    currentName,
    currentSlug
) {

    openOwnerActionPanel(
        'Edit Restaurant',
        `

        <div style="
            margin-bottom:14px;
            color:#666;
            font-size:14px;
        ">
            Update the restaurant name and public URL slug.
        </div>

        <label>
            Restaurant Name
        </label>

        <input
            id="ownerEditName"
            type="text"
            value="${escapeHtml(
                currentName
            )}"
        >

        <label>
            Restaurant Slug
        </label>

        <input
            id="ownerEditSlug"
            type="text"
            value="${escapeHtml(
                currentSlug
            )}"
        >

        <div class="owner-action-buttons">

            <button
                class="owner-secondary-btn"
                onclick="closeOwnerActionPanel()"
            >
                Cancel
            </button>

            <button
                class="owner-primary-btn"
                onclick="saveOwnerCafeEdit(${Number(id)})"
            >
                Save Changes
            </button>

        </div>

        `
    );

}


/*
|--------------------------------------------------------------------------
| SAVE RESTAURANT EDIT
|--------------------------------------------------------------------------
*/

async function saveOwnerCafeEdit(
    id
) {

    const name =
        document.getElementById(
            'ownerEditName'
        )?.value.trim();

    const slug =
        document.getElementById(
            'ownerEditSlug'
        )?.value.trim().toLowerCase();

    if (!name || !slug) {

        showOwnerNotification(
            'Restaurant name and slug are required.',
            'warning',
            'Missing Information'
        );

        return;

    }

    showOwnerLoading(
        'Updating restaurant...'
    );

    try {

        const token =
            localStorage.getItem(
                'adminToken'
            );

        const response =
            await fetch(
                `/api/owner/restaurants/${id}`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json',

                        'Authorization':
                            'Bearer ' +
                            token
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
            await response.json();

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            window.location.replace(
                '/admin.html'
            );

            return;

        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                'Failed to update restaurant.'
            );

        }

        closeOwnerActionPanel();

        showOwnerNotification(
            'Restaurant information has been updated successfully.',
            'success',
            'Restaurant Updated'
        );

        await loadOwnerCafes();

    } catch (error) {

        console.error(
            'Update restaurant error:',
            error
        );

        showOwnerNotification(
            error.message,
            'error',
            'Update Failed'
        );

    } finally {

        hideOwnerLoading();

    }

}


/*
|--------------------------------------------------------------------------
| EDIT CAFE ADMIN
|--------------------------------------------------------------------------
*/

function editOwnerCafeAdmin(
    id,
    cafeName
) {

    openOwnerActionPanel(
        'Admin Account',
        `

        <div style="
            margin-bottom:14px;
            color:#666;
            font-size:14px;
        ">
            Update the administrator account for
            <strong>
                ${escapeHtml(
                    cafeName
                )}
            </strong>.
        </div>

        <label>
            Admin Email
        </label>

        <input
            id="ownerAdminEmail"
            type="email"
            placeholder="admin@example.com"
        >

        <label>
            New Password
        </label>

        <input
            id="ownerAdminPassword"
            type="password"
            placeholder="Enter new password"
        >

        <div class="owner-action-buttons">

            <button
                class="owner-secondary-btn"
                onclick="closeOwnerActionPanel()"
            >
                Cancel
            </button>

            <button
                class="owner-primary-btn"
                onclick="saveOwnerCafeAdmin(${Number(id)})"
            >
                Update Account
            </button>

        </div>

        `
    );

}


/*
|--------------------------------------------------------------------------
| SAVE CAFE ADMIN
|--------------------------------------------------------------------------
*/

async function saveOwnerCafeAdmin(
    id
) {

    const email =
        document.getElementById(
            'ownerAdminEmail'
        )?.value.trim().toLowerCase();

    const password =
        document.getElementById(
            'ownerAdminPassword'
        )?.value.trim();

    if (!email || !password) {

        showOwnerNotification(
            'Admin email and password are required.',
            'warning',
            'Missing Information'
        );

        return;

    }

    showOwnerLoading(
        'Updating admin account...'
    );

    try {

        const token =
            localStorage.getItem(
                'adminToken'
            );

        const response =
            await fetch(
                `/api/owner/restaurants/${id}/admin`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json',

                        'Authorization':
                            'Bearer ' +
                            token
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
            await response.json();

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            window.location.replace(
                '/admin.html'
            );

            return;

        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                'Failed to update admin account.'
            );

        }

        closeOwnerActionPanel();

        showOwnerNotification(
            'Administrator account updated successfully.',
            'success',
            'Admin Account Updated'
        );

        await loadOwnerCafes();

    } catch (error) {

        console.error(
            'Update admin error:',
            error
        );

        showOwnerNotification(
            error.message,
            'error',
            'Update Failed'
        );

    } finally {

        hideOwnerLoading();

    }

}


/*
|--------------------------------------------------------------------------
| ENABLE / DISABLE
|--------------------------------------------------------------------------
*/

function toggleOwnerCafeStatus(
    id,
    cafeName,
    currentStatus
) {

    const isActive =
        currentStatus === 'active';

    const title =
        isActive
            ? 'Disable Restaurant'
            : 'Enable Restaurant';

    const description =
        isActive
            ? `
                Disabling
                <strong>
                    ${escapeHtml(cafeName)}
                </strong>
                will temporarily hide its public menu.
              `
            : `
                Enabling
                <strong>
                    ${escapeHtml(cafeName)}
                </strong>
                will make its public menu available again.
              `;

    openOwnerActionPanel(
        title,
        `

        <div style="
            background:${isActive ? '#fff5f5' : '#f4fbf6'};
            border:1px solid ${isActive ? '#f1caca' : '#c9e8d2'};
            border-radius:12px;
            padding:15px;
            margin-bottom:16px;
            line-height:1.5;
        ">
            ${description}
        </div>

        <div style="
            font-size:14px;
            color:#666;
            margin-bottom:5px;
        ">
            Restaurant
        </div>

        <div style="
            font-size:18px;
            font-weight:700;
            color:#3b2108;
        ">
            ${escapeHtml(cafeName)}
        </div>

        <div class="owner-action-buttons">

            <button
                class="owner-secondary-btn"
                onclick="closeOwnerActionPanel()"
            >
                Cancel
            </button>

            <button
                class="${isActive ? 'owner-danger-btn' : 'owner-primary-btn'}"
                onclick="saveOwnerCafeStatus(
                    ${Number(id)},
                    '${isActive ? 'disabled' : 'active'}'
                )"
            >
                ${
                    isActive
                        ? 'Disable Restaurant'
                        : 'Enable Restaurant'
                }
            </button>

        </div>

        `
    );

}


/*
|--------------------------------------------------------------------------
| SAVE STATUS
|--------------------------------------------------------------------------
*/

async function saveOwnerCafeStatus(
    id,
    status
) {

    showOwnerLoading(
        status === 'active'
            ? 'Enabling restaurant...'
            : 'Disabling restaurant...'
    );

    try {

        const token =
            localStorage.getItem(
                'adminToken'
            );

        const response =
            await fetch(
                `/api/owner/restaurants/${id}/status`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json',

                        'Authorization':
                            'Bearer ' +
                            token
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({
                            status
                        })
                }
            );

        const data =
            await response.json();

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            window.location.replace(
                '/admin.html'
            );

            return;

        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                'Failed to update restaurant status.'
            );

        }

        closeOwnerActionPanel();

        ownerOpenRestaurantId =
            null;

        showOwnerNotification(
            data.message,
            'success',
            status === 'active'
                ? 'Restaurant Enabled'
                : 'Restaurant Disabled'
        );

        await loadOwnerCafes();

    } catch (error) {

        console.error(
            'Status update error:',
            error
        );

        showOwnerNotification(
            error.message,
            'error',
            'Status Update Failed'
        );

    } finally {

        hideOwnerLoading();

    }

}


/*
|--------------------------------------------------------------------------
| DELETE RESTAURANT
|--------------------------------------------------------------------------
*/

function deleteOwnerCafe(
    id,
    cafeName
) {

    openOwnerActionPanel(
        'Delete Restaurant',
        `

        <div style="
            background:#fff5f5;
            border:1px solid #f0caca;
            border-radius:12px;
            padding:18px;
            margin-bottom:18px;
        ">

            <div style="
                font-size:18px;
                font-weight:700;
                color:#a61b1b;
                margin-bottom:8px;
            ">
                ⚠ Permanent Deletion
            </div>

            <div style="
                color:#555;
                line-height:1.6;
            ">
                You are about to permanently delete:
            </div>

            <div style="
                font-size:19px;
                font-weight:700;
                margin:8px 0;
                color:#3b2108;
            ">
                ${escapeHtml(cafeName)}
            </div>

            <div style="
                color:#555;
                line-height:1.6;
            ">
                This will delete:
                <br>• Restaurant
                <br>• Restaurant menu
                <br>• Café admin account
            </div>

            <div style="
                margin-top:12px;
                font-weight:700;
                color:#a61b1b;
            ">
                This action cannot be undone.
            </div>

        </div>

        <label>
            Type DELETE to confirm
        </label>

        <input
            id="deleteRestaurantConfirmation"
            type="text"
            placeholder="Type DELETE"
            autocomplete="off"
        >

        <div class="owner-action-buttons">

            <button
                class="owner-secondary-btn"
                onclick="closeOwnerActionPanel()"
            >
                Cancel
            </button>

            <button
                class="owner-danger-btn"
                onclick="confirmDeleteOwnerCafe(${Number(id)})"
            >
                Permanently Delete
            </button>

        </div>

        `
    );

}


/*
|--------------------------------------------------------------------------
| CONFIRM DELETE
|--------------------------------------------------------------------------
*/

async function confirmDeleteOwnerCafe(
    id
) {

    const input =
        document.getElementById(
            'deleteRestaurantConfirmation'
        );

    if (!input) {
        return;
    }

    if (
        input.value
            .trim()
            .toUpperCase() !==
        'DELETE'
    ) {

        showOwnerNotification(
            'Please type DELETE to confirm permanent deletion.',
            'warning',
            'Confirmation Required'
        );

        input.focus();

        return;

    }

    showOwnerLoading(
        'Deleting restaurant...'
    );

    try {

        const token =
            localStorage.getItem(
                'adminToken'
            );

        const response =
            await fetch(
                `/api/owner/restaurants/${id}`,
                {
                    method: 'DELETE',

                    headers: {
                        'Authorization':
                            'Bearer ' +
                            token
                    },

                    credentials:
                        'same-origin'
                }
            );

        const data =
            await response.json();

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            window.location.replace(
                '/admin.html'
            );

            return;

        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                'Failed to delete restaurant.'
            );

        }

        closeOwnerActionPanel();

        ownerOpenRestaurantId =
            null;

        showOwnerNotification(
            data.message ||
            'Restaurant deleted successfully.',
            'success',
            'Restaurant Deleted'
        );

        await loadOwnerCafes();

    } catch (error) {

        console.error(
            'Delete restaurant error:',
            error
        );

        showOwnerNotification(
            error.message,
            'error',
            'Delete Failed'
        );

    } finally {

        hideOwnerLoading();

    }

}


/*
|--------------------------------------------------------------------------
| MANAGE MENU
|--------------------------------------------------------------------------
|
| Kept for compatibility with existing dashboard code.
|--------------------------------------------------------------------------
*/

function manageOwnerCafeMenu(
    slug
) {

    localStorage.setItem(
        'selectedRestaurantSlug',
        slug
    );

    window.location.href =
        '/' +
        encodeURIComponent(
            slug
        );

}


/*
|--------------------------------------------------------------------------
| OWNER NOTIFICATIONS
|--------------------------------------------------------------------------
*/

let ownerNotificationTimer =
    null;


function showOwnerNotification(
    message,
    type = 'success',
    title = ''
) {

    const box =
        document.getElementById(
            'ownerTopNotification'
        );

    const icon =
        document.getElementById(
            'ownerNotificationIcon'
        );

    const titleEl =
        document.getElementById(
            'ownerNotificationTitle'
        );

    const messageEl =
        document.getElementById(
            'ownerNotificationMessage'
        );

    if (
        !box ||
        !messageEl
    ) {

        return;

    }

    clearTimeout(
        ownerNotificationTimer
    );

    box.className =
        'owner-top-notification show ' +
        type;

    const settings = {

        success: {
            icon: '✓',
            title:
                title || 'Success'
        },

        error: {
            icon: '✕',
            title:
                title || 'Something went wrong'
        },

        warning: {
            icon: '⚠',
            title:
                title || 'Warning'
        },

        info: {
            icon: 'ⓘ',
            title:
                title || 'Information'
        }

    };

    const setting =
        settings[type] ||
        settings.info;

    if (icon) {

        icon.textContent =
            setting.icon;

    }

    if (titleEl) {

        titleEl.textContent =
            setting.title;

    }

    messageEl.textContent =
        message;

    ownerNotificationTimer =
        setTimeout(
            () => {

                closeOwnerNotification();

            },
            5000
        );

}


function closeOwnerNotification() {

    const box =
        document.getElementById(
            'ownerTopNotification'
        );

    if (!box) {
        return;
    }

    box.classList.remove(
        'show'
    );

}


/*
|--------------------------------------------------------------------------
| OWNER ACTION PANEL
|--------------------------------------------------------------------------
*/

function openOwnerActionPanel(
    title,
    html
) {

    const panel =
        document.getElementById(
            'ownerActionPanel'
        );

    const titleEl =
        document.getElementById(
            'ownerActionTitle'
        );

    const content =
        document.getElementById(
            'ownerActionContent'
        );

    if (
        !panel ||
        !content
    ) {

        return;

    }

    if (titleEl) {

        titleEl.textContent =
            title;

    }

    content.innerHTML =
        html;

    panel.classList.add(
        'show'
    );

}


function closeOwnerActionPanel() {

    const panel =
        document.getElementById(
            'ownerActionPanel'
        );

    if (!panel) {
        return;
    }

    panel.classList.remove(
        'show'
    );

    const content =
        document.getElementById(
            'ownerActionContent'
        );

    if (content) {

        content.innerHTML =
            '';

    }

}


/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

async function logoutAdmin() {

    showOwnerLoading(
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


/*
|--------------------------------------------------------------------------
| COMPATIBILITY
|--------------------------------------------------------------------------
*/

function goBackToAdminLogin() {

    logoutAdmin();

}


/*
|--------------------------------------------------------------------------
| START SUPER ADMIN
|--------------------------------------------------------------------------
*/

document.addEventListener(
    'DOMContentLoaded',
    () => {

        checkSuperAdminAccess();

    }
);


/* ================================================================
   SUPER ADMIN HEADER MENU
================================================================ */

function toggleSuperAdminMenu() {
    const menu = document.getElementById('superAdminMenu');

    if (!menu) {
        console.error('Super Admin menu not found.');
        return;
    }

    menu.classList.toggle('show');
}


function closeSuperAdminMenu() {
    const menu = document.getElementById('superAdminMenu');

    if (!menu) return;

    menu.classList.remove('show');
}


/* ================================================================
   MENU BUTTON
================================================================ */

const superAdminMenuToggle =
    document.getElementById('superAdminMenuToggle');

const superAdminMenu =
    document.getElementById('superAdminMenu');


if (superAdminMenuToggle && superAdminMenu) {

    superAdminMenuToggle.addEventListener('click', function (event) {

        event.stopPropagation();

        superAdminMenu.classList.toggle('show');

    });


    superAdminMenu.addEventListener('click', function (event) {

        event.stopPropagation();

    });


    document.addEventListener('click', function () {

        superAdminMenu.classList.remove('show');

    });

}