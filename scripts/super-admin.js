/* ================================================================
   CAFFE MENU — SUPER ADMIN DASHBOARD
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

let ownerPreviousFocus = null;

/* ================================================================
   BASIC HELPERS
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
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
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
        restaurant => Number(restaurant.id) === Number(id)
    );
}

/* ================================================================
   SUPER ADMIN ACCESS
   ================================================================ */

async function checkSuperAdminAccess() {
    console.log('🟢 Super Admin page loaded');

    showOwnerLoading('Checking administrator access...');

    try {
        const token = localStorage.getItem('adminToken');

        console.log('🔑 Token exists:', !!token);

        if (!token) {
            console.log('❌ No token — redirecting to admin login');
            window.location.href = '/admin.html';
            return;
        }

        console.log('📡 Checking /api/admin/session...');

        const response = await fetch('/api/admin/session', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            },
            credentials: 'same-origin'
        });

        console.log('📡 Session status:', response.status);

        const data = await response.json();

        console.log('📦 Session response:', data);

        if (!response.ok) {
            console.log('❌ Session rejected');

            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminRole');
            localStorage.removeItem('adminRestaurantId');
            localStorage.removeItem('adminRestaurantSlug');

            window.location.href = '/admin.html';
            return;
        }

        if (!data || !data.user) {
            console.log('❌ No user object in session response');
            window.location.href = '/admin.html';
            return;
        }

        console.log('👤 User:', data.user);
        console.log('👑 Role:', data.user.role);

        if (data.user.role !== 'super_admin') {
            console.log('❌ Not super admin — redirecting');
            window.location.href = '/admin.html';
            return;
        }

        console.log('✅ Super Admin verified');

        localStorage.setItem('adminRole', data.user.role);

        await loadOwnerCafes();

        console.log('✅ Dashboard data loaded');

    } catch (error) {
        console.error('🔥 Super admin access error:', error);

        showOwnerNotification(
            'Connection Error',
            'Unable to verify administrator access.',
            'error'
        );

        setTimeout(() => {
            window.location.href = '/admin.html';
        }, 1200);

    } finally {
        hideOwnerLoading();
    }
}

/* ================================================================
   LOADING OVERLAY
   ================================================================ */

function showOwnerLoading(message = 'Please wait...') {
    ownerLoadingDepth++;

    let overlay = document.getElementById('ownerLoadingOverlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ownerLoadingOverlay';

        overlay.innerHTML = `
            <div class="owner-loading-card">
                <div class="owner-loading-spinner"></div>
                <div class="owner-loading-title">Please wait</div>
                <div class="owner-loading-message"></div>
            </div>
        `;

        document.body.appendChild(overlay);

        if (!document.getElementById('ownerLoadingRuntimeStyles')) {
            const style = document.createElement('style');
            style.id = 'ownerLoadingRuntimeStyles';

            style.textContent = `
                #ownerLoadingOverlay {
                    position: fixed;
                    inset: 0;
                    z-index: 12000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    background: rgba(43, 27, 20, 0.42);
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                }

                .owner-loading-card {
                    width: min(360px, calc(100vw - 40px));
                    padding: 30px 26px;
                    border: 1px solid rgba(255,255,255,.65);
                    border-radius: 22px;
                    background: rgba(255,255,255,.97);
                    box-shadow: 0 28px 80px rgba(43,27,20,.28);
                    text-align: center;
                }

                .owner-loading-spinner {
                    width: 42px;
                    height: 42px;
                    margin: 0 auto 18px;
                    border: 4px solid #eee6df;
                    border-top-color: #8a5a3c;
                    border-radius: 50%;
                    animation: ownerLoadingSpin .75s linear infinite;
                }

                .owner-loading-title {
                    color: #3a2419;
                    font-size: 17px;
                    font-weight: 800;
                }

                .owner-loading-message {
                    margin-top: 7px;
                    color: #706861;
                    font-size: 13px;
                    line-height: 1.5;
                }

                @keyframes ownerLoadingSpin {
                    to {
                        transform: rotate(360deg);
                    }
                }
            `;

            document.head.appendChild(style);
        }
    }

    const messageElement =
        overlay.querySelector('.owner-loading-message');

    if (messageElement) {
        messageElement.textContent = message;
    }

    overlay.style.display = 'flex';
    document.body.classList.add('owner-loading-open');
}

function hideOwnerLoading() {
    ownerLoadingDepth = Math.max(0, ownerLoadingDepth - 1);

    if (ownerLoadingDepth > 0) {
        return;
    }

    const overlay = document.getElementById('ownerLoadingOverlay');

    if (overlay) {
        overlay.style.display = 'none';
    }

    document.body.classList.remove('owner-loading-open');
}

/* ================================================================
   RESTAURANT LOADING / FILTERING
   ================================================================ */

function filterOwnerRestaurants(filter) {
    ownerRestaurantFilter = filter;

    document.querySelectorAll('.stat-filter').forEach(button => {
        button.classList.remove('active-filter');
    });

    const activeButton = document.querySelector(
        `.stat-filter[onclick*="'${filter}'"]`
    );

    if (activeButton) {
        activeButton.classList.add('active-filter');
    }

    renderOwnerRestaurantList();
}

async function loadOwnerCafes() {
    const token = localStorage.getItem('adminToken');

    if (!token) {
        window.location.href = '/admin.html';
        return;
    }

    try {
        const response = await fetch('/api/owner/restaurants', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            },
            credentials: 'same-origin'
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminRole');
            localStorage.removeItem('adminRestaurantId');
            localStorage.removeItem('adminRestaurantSlug');

            window.location.href = '/admin.html';
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to load restaurants.'
            );
        }

        ownerRestaurantsData =
            Array.isArray(data.restaurants)
                ? data.restaurants
                : Array.isArray(data)
                    ? data
                    : [];

        updateOwnerRestaurantStats();
        renderOwnerRestaurantList();

    } catch (error) {
        console.error('Load restaurants error:', error);

        ownerRestaurantsData = [];

        updateOwnerRestaurantStats();

        const list = document.getElementById('ownerCafeList');

        if (list) {
            list.innerHTML = `
                <div class="owner-empty-state owner-error-state">
                    <div class="owner-empty-icon">!</div>
                    <h3>Unable to load restaurants</h3>
                    <p>${escapeHtml(error.message)}</p>
                    <button type="button"
                            class="owner-secondary-btn"
                            onclick="loadOwnerCafes()">
                        Try Again
                    </button>
                </div>
            `;
        }

        showOwnerNotification(
            'Loading Failed',
            error.message,
            'error'
        );
    }
}

function updateOwnerRestaurantStats() {
    const total = ownerRestaurantsData.length;

    const active = ownerRestaurantsData.filter(
        restaurant =>
            restaurant.status === 'active' ||
            restaurant.is_active === true
    ).length;

    const disabled = total - active;

    const totalElement =
        document.getElementById('totalRestaurants');

    const activeElement =
        document.getElementById('activeRestaurants');

    const disabledElement =
        document.getElementById('disabledRestaurants');

    if (totalElement) {
        totalElement.textContent = total;
    }

    if (activeElement) {
        activeElement.textContent = active;
    }

    if (disabledElement) {
        disabledElement.textContent = disabled;
    }
}

function renderOwnerRestaurantList() {
    const list = document.getElementById('ownerCafeList');

    if (!list) {
        return;
    }

    const searchInput =
        document.getElementById('restaurantSearch');

    const search =
        String(searchInput?.value || '')
            .trim()
            .toLowerCase();

    let restaurants = ownerRestaurantsData.filter(restaurant => {
        const active =
            restaurant.status === 'active' ||
            restaurant.is_active === true;

        if (ownerRestaurantFilter === 'active' && !active) {
            return false;
        }

        if (ownerRestaurantFilter === 'disabled' && active) {
            return false;
        }

        if (!search) {
            return true;
        }

        const text = [
            restaurant.name,
            restaurant.slug,
            restaurant.id
        ]
            .join(' ')
            .toLowerCase();

        return text.includes(search);
    });

    if (!restaurants.length) {
        list.innerHTML = `
            <div class="owner-empty-state">
                <div class="owner-empty-icon">⌕</div>
                <h3>No restaurants found</h3>
                <p>
                    ${
                        search
                            ? 'Try a different search.'
                            : 'There are no restaurants in this view yet.'
                    }
                </p>
            </div>
        `;

        return;
    }

    list.innerHTML = '';

    restaurants.forEach((restaurant, index) => {
        const row = document.createElement('div');

        row.className = 'restaurant-row';

        if (
            Number(ownerOpenRestaurantId) ===
            Number(restaurant.id)
        ) {
            row.classList.add('open');
        }

        const isActive =
            restaurant.status === 'active' ||
            restaurant.is_active === true;

        const identity = document.createElement('div');
        identity.className = 'restaurant-identity';

        identity.innerHTML = `
            <div class="restaurant-number">
                ${String(index + 1).padStart(2, '0')}
            </div>

            <div class="restaurant-avatar">
                ${escapeHtml(
                    String(restaurant.name || 'C')
                        .trim()
                        .charAt(0)
                        .toUpperCase()
                )}
            </div>

            <div class="restaurant-name-block">
                <strong>
                    ${escapeHtml(
                        restaurant.name || 'Unnamed Restaurant'
                    )}
                </strong>

                <span>
                    Restaurant ID #${escapeHtml(restaurant.id)}
                </span>
            </div>
        `;

        const slug = document.createElement('div');
        slug.className = 'restaurant-slug';

        slug.innerHTML = `
            <span>/</span>${escapeHtml(
                restaurant.slug || ''
            )}
        `;

        const status = document.createElement('div');
        status.className = 'restaurant-status';

        status.innerHTML = `
            <span class="status-dot ${isActive ? 'active' : 'disabled'}"></span>
            <span class="status-pill ${isActive ? 'active' : 'disabled'}">
                ${isActive ? 'Active' : 'Disabled'}
            </span>
        `;

        const access = document.createElement('div');
        access.className = 'restaurant-access';

        access.innerHTML = `
            <button type="button"
                    class="restaurant-manage-btn"
                    onclick="toggleOwnerRestaurantActions(${Number(restaurant.id)})">
                Manage
                <span class="manage-chevron">⌄</span>
            </button>
        `;

        row.appendChild(identity);
        row.appendChild(slug);
        row.appendChild(status);
        row.appendChild(access);

        const actions = document.createElement('div');

        actions.className = 'restaurant-actions';

        actions.innerHTML = `
            <button type="button"
                    class="owner-action-btn"
                    onclick="editOwnerCafe(${Number(restaurant.id)})">
                <span>✎</span>
                <strong>Edit Restaurant</strong>
                <small>Change name or slug</small>
            </button>

            <button type="button"
                    class="owner-action-btn"
                    onclick="editOwnerCafeAdmin(${Number(restaurant.id)})">
                <span>♙</span>
                <strong>Admin Account</strong>
                <small>Update email or password</small>
            </button>

            <button type="button"
                    class="owner-action-btn"
                    onclick="openDuplicateCafeFromRestaurant(${Number(restaurant.id)})">
                <span>⧉</span>
                <strong>Duplicate Café</strong>
                <small>Create an independent copy</small>
            </button>

            ${
                isActive
                    ? `
                        <button type="button"
                                class="owner-action-btn"
                                onclick="openPriceManagementForRestaurant(${Number(restaurant.id)})">
                            <span>%</span>
                            <strong>Price Management</strong>
                            <small>Adjust menu prices</small>
                        </button>
                    `
                    : ''
            }

            <button type="button"
                    class="owner-action-btn"
                    onclick="toggleOwnerCafeStatus(${Number(restaurant.id)})">
                <span>${isActive ? '⏸' : '▶'}</span>
                <strong>${isActive ? 'Disable Restaurant' : 'Enable Restaurant'}</strong>
                <small>${isActive ? 'Temporarily hide menu' : 'Make menu active'}</small>
            </button>

            <button type="button"
                    class="owner-action-btn danger"
                    onclick="deleteOwnerCafe(${Number(restaurant.id)})">
                <span>⌫</span>
                <strong>Delete Restaurant</strong>
                <small>Permanently remove restaurant</small>
            </button>

            <button type="button"
                    class="owner-action-btn"
                    onclick="manageOwnerCafeMenu('${escapeHtml(
                        restaurant.slug || ''
                    )}')">
                <span>↗</span>
                <strong>Open Customer Menu</strong>
                <small>View public menu</small>
            </button>
        `;

        actions.addEventListener('click', event => {
            event.stopPropagation();
        });

        list.appendChild(row);
        list.appendChild(actions);
    });
}

/* ================================================================
   RESTAURANT ACTION EXPANDER
   ================================================================ */

function toggleOwnerRestaurantActions(restaurantId) {
    const numericId = Number(restaurantId);

    if (ownerOpenRestaurantId === numericId) {
        ownerOpenRestaurantId = null;
    } else {
        ownerOpenRestaurantId = numericId;
    }

    renderOwnerRestaurantList();
}

/* ================================================================
   DASHBOARD REFRESH
   ================================================================ */

async function refreshOwnerDashboard() {
    const button = document.getElementById('ownerRefreshBtn');

    if (button) {
        button.disabled = true;
        button.classList.add('is-refreshing');
    }

    showOwnerLoading('Refreshing dashboard...');

    try {
        await loadOwnerCafes();

        showOwnerNotification(
            'Dashboard Updated',
            'Restaurant information is up to date.',
            'success'
        );

    } finally {
        hideOwnerLoading();

        if (button) {
            button.disabled = false;
            button.classList.remove('is-refreshing');
        }
    }
}

/* ================================================================
   CREATE RESTAURANT
   ================================================================ */

function openCreateCafePanel() {
    closeSuperAdminMenu();

    openOwnerActionPanel(
        'Create New Café',
        `
            <div class="owner-form-shell">
                <div class="owner-form-hero create-hero">
                    <div class="owner-form-hero-icon">＋</div>
                    <div>
                        <span class="owner-form-eyebrow">NEW RESTAURANT</span>
                        <h2>Create a new café</h2>
                        <p>
                            Create the restaurant and its café administrator
                            in one step.
                        </p>
                    </div>
                </div>

                <form id="createOwnerCafeForm"
                      class="owner-form"
                      onsubmit="submitCreateOwnerCafe(event)">

                    <div class="owner-form-section">
                        <div class="owner-form-section-title">
                            Restaurant Information
                        </div>

                        <div class="owner-field-grid">
                            <label class="owner-field">
                                <span>Café Name</span>
                                <input id="createCafeName"
                                       type="text"
                                       maxlength="120"
                                       required
                                       placeholder="Example: Demis Coffee">
                            </label>

                            <label class="owner-field">
                                <span>Public Slug</span>
                                <input id="createCafeSlug"
                                       type="text"
                                       maxlength="80"
                                       required
                                       placeholder="demis-coffee">
                                <small>
                                    Used in the public URL.
                                </small>
                            </label>
                        </div>
                    </div>

                    <div class="owner-form-section">
                        <div class="owner-form-section-title">
                            Café Administrator
                        </div>

                        <div class="owner-field-grid">
                            <label class="owner-field">
                                <span>Admin Email</span>
                                <input id="createCafeEmail"
                                       type="email"
                                       maxlength="160"
                                       required
                                       placeholder="admin@example.com">
                            </label>

                            <label class="owner-field">
                                <span>Password</span>
                                <input id="createCafePassword"
                                       type="password"
                                       minlength="6"
                                       maxlength="100"
                                       required
                                       placeholder="Minimum 6 characters">
                            </label>
                        </div>
                    </div>

                    <div class="owner-info-box">
                        <span class="owner-info-icon">✓</span>
                        <div>
                            <strong>Ready to launch</strong>
                            <p>
                                The café will be created as an active
                                restaurant with its own administrator account.
                            </p>
                        </div>
                    </div>

                    <div class="owner-form-actions">
                        <button type="button"
                                class="owner-secondary-btn"
                                onclick="closeOwnerActionPanel()">
                            Cancel
                        </button>

                        <button type="submit"
                                class="owner-primary-btn">
                            Create Café
                        </button>
                    </div>
                </form>
            </div>
        `
    );

    const nameInput =
        document.getElementById('createCafeName');

    const slugInput =
        document.getElementById('createCafeSlug');

    if (nameInput && slugInput) {
        nameInput.addEventListener('input', () => {
            if (!slugInput.dataset.manual) {
                slugInput.value =
                    createSlugFromName(nameInput.value);
            }
        });

        slugInput.addEventListener('input', () => {
            slugInput.dataset.manual = 'true';
        });
    }
}

async function submitCreateOwnerCafe(event) {
    event.preventDefault();

    const name =
        document.getElementById('createCafeName')?.value.trim();

    const slug =
        document.getElementById('createCafeSlug')?.value.trim().toLowerCase();

    const adminEmail =
        document.getElementById('createCafeEmail')?.value.trim();

    const adminPassword =
        document.getElementById('createCafePassword')?.value;

    if (!name || !slug || !adminEmail || !adminPassword) {
        showOwnerNotification(
            'Missing Information',
            'Please complete all required fields.',
            'error'
        );
        return;
    }

    if (adminPassword.length < 6) {
        showOwnerNotification(
            'Invalid Password',
            'The administrator password must contain at least 6 characters.',
            'error'
        );
        return;
    }

    const slugPattern =
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    if (!slugPattern.test(slug)) {
        showOwnerNotification(
            'Invalid Slug',
            'Use lowercase letters, numbers, and single hyphens only.',
            'error'
        );
        return;
    }

    const token = localStorage.getItem('adminToken');

    showOwnerLoading('Creating café...');

    try {
        const response = await fetch('/api/owner/restaurants', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                name,
                slug,
                adminEmail,
                adminPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to create café.'
            );
        }

        closeOwnerActionPanel();

        await loadOwnerCafes();

        showOwnerNotification(
            'Café Created',
            `${name} has been created successfully.`,
            'success'
        );

    } catch (error) {
        console.error('Create café error:', error);

        showOwnerNotification(
            'Creation Failed',
            error.message,
            'error'
        );

    } finally {
        hideOwnerLoading();
    }
}

/* ================================================================
   EDIT RESTAURANT
   ================================================================ */

function editOwnerCafe(restaurantId) {
    const restaurant = getRestaurantById(restaurantId);

    if (!restaurant) {
        showOwnerNotification(
            'Restaurant Not Found',
            'The selected restaurant could not be found.',
            'error'
        );
        return;
    }

    closeOwnerActionPanel();

    openOwnerActionPanel(
        'Edit Restaurant',
        `
            <form class="owner-form"
                  onsubmit="saveOwnerCafeEdit(event, ${Number(restaurant.id)})">

                <div class="owner-form-hero edit-hero">
                    <div class="owner-form-hero-icon">✎</div>
                    <div>
                        <span class="owner-form-eyebrow">RESTAURANT SETTINGS</span>
                        <h2>Edit restaurant</h2>
                        <p>
                            Update the public restaurant identity.
                        </p>
                    </div>
                </div>

                <div class="owner-form-section">
                    <div class="owner-field-grid">
                        <label class="owner-field">
                            <span>Café Name</span>
                            <input id="editCafeName"
                                   type="text"
                                   maxlength="120"
                                   required
                                   value="${escapeHtml(
                                       restaurant.name || ''
                                   )}">
                        </label>

                        <label class="owner-field">
                            <span>Public Slug</span>
                            <input id="editCafeSlug"
                                   type="text"
                                   maxlength="80"
                                   required
                                   value="${escapeHtml(
                                       restaurant.slug || ''
                                   )}">
                        </label>
                    </div>
                </div>

                <div class="owner-info-box">
                    <span class="owner-info-icon">i</span>
                    <div>
                        <strong>Public URL</strong>
                        <p>
                            The customer menu will be available at
                            <strong>/${escapeHtml(
                                restaurant.slug || ''
                            )}</strong>.
                        </p>
                    </div>
                </div>

                <div class="owner-form-actions">
                    <button type="button"
                            class="owner-secondary-btn"
                            onclick="closeOwnerActionPanel()">
                        Cancel
                    </button>

                    <button type="submit"
                            class="owner-primary-btn">
                        Save Changes
                    </button>
                </div>
            </form>
        `
    );
}

async function saveOwnerCafeEdit(event, restaurantId) {
    event.preventDefault();

    const name =
        document.getElementById('editCafeName')?.value.trim();

    const slug =
        document.getElementById('editCafeSlug')?.value.trim().toLowerCase();

    if (!name || !slug) {
        showOwnerNotification(
            'Missing Information',
            'Restaurant name and slug are required.',
            'error'
        );
        return;
    }

    const slugPattern =
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    if (!slugPattern.test(slug)) {
        showOwnerNotification(
            'Invalid Slug',
            'Use lowercase letters, numbers, and hyphens only.',
            'error'
        );
        return;
    }

    const token = localStorage.getItem('adminToken');

    showOwnerLoading('Saving restaurant changes...');

    try {
        const response = await fetch(
            `/api/owner/restaurants/${Number(restaurantId)}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name,
                    slug
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to update restaurant.'
            );
        }

        closeOwnerActionPanel();

        await loadOwnerCafes();

        showOwnerNotification(
            'Restaurant Updated',
            'Restaurant information was updated successfully.',
            'success'
        );

    } catch (error) {
        console.error('Edit restaurant error:', error);

        showOwnerNotification(
            'Update Failed',
            error.message,
            'error'
        );

    } finally {
        hideOwnerLoading();
    }
}

/* ================================================================
   ADMIN ACCOUNT
   ================================================================ */

function editOwnerCafeAdmin(restaurantId) {
    const restaurant = getRestaurantById(restaurantId);

    if (!restaurant) {
        return;
    }

    openOwnerActionPanel(
        'Admin Account',
        `
            <form class="owner-form"
                  onsubmit="saveOwnerCafeAdmin(event, ${Number(restaurant.id)})">

                <div class="owner-form-hero admin-hero">
                    <div class="owner-form-hero-icon">♙</div>
                    <div>
                        <span class="owner-form-eyebrow">ACCESS CONTROL</span>
                        <h2>Café administrator</h2>
                        <p>
                            Update the login credentials for
                            ${escapeHtml(restaurant.name)}.
                        </p>
                    </div>
                </div>

                <div class="owner-form-section">
                    <label class="owner-field">
                        <span>Admin Email</span>
                        <input id="ownerAdminEmail"
                               type="email"
                               maxlength="160"
                               required
                               value="${escapeHtml(
                                   restaurant.admin_email ||
                                   restaurant.email ||
                                   ''
                               )}">
                    </label>

                    <label class="owner-field">
                        <span>New Password</span>
                        <input id="ownerAdminPassword"
                               type="password"
                               minlength="6"
                               maxlength="100"
                               placeholder="Leave blank to keep current password">
                        <small>
                            Enter a new password only if you want to change it.
                        </small>
                    </label>
                </div>

                <div class="owner-info-box">
                    <span class="owner-info-icon">🔐</span>
                    <div>
                        <strong>Administrator access</strong>
                        <p>
                            These credentials are used by the café owner
                            to access their restaurant dashboard.
                        </p>
                    </div>
                </div>

                <div class="owner-form-actions">
                    <button type="button"
                            class="owner-secondary-btn"
                            onclick="closeOwnerActionPanel()">
                        Cancel
                    </button>

                    <button type="submit"
                            class="owner-primary-btn">
                        Save Account
                    </button>
                </div>
            </form>
        `
    );
}

async function saveOwnerCafeAdmin(event, restaurantId) {
    event.preventDefault();

    const email =
        document.getElementById('ownerAdminEmail')?.value.trim();

    const password =
        document.getElementById('ownerAdminPassword')?.value;

    if (!email) {
        showOwnerNotification(
            'Missing Email',
            'Administrator email is required.',
            'error'
        );
        return;
    }

    if (password && password.length < 6) {
        showOwnerNotification(
            'Invalid Password',
            'The password must contain at least 6 characters.',
            'error'
        );
        return;
    }

    const token = localStorage.getItem('adminToken');

    showOwnerLoading('Updating administrator account...');

    try {
        const body = {
            email
        };

        if (password) {
            body.password = password;
        }

        const response = await fetch(
            `/api/owner/restaurants/${Number(restaurantId)}/admin`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                credentials: 'same-origin',
                body: JSON.stringify(body)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to update administrator.'
            );
        }

        closeOwnerActionPanel();

        await loadOwnerCafes();

        showOwnerNotification(
            'Account Updated',
            'Administrator credentials were updated successfully.',
            'success'
        );

    } catch (error) {
        console.error('Admin account error:', error);

        showOwnerNotification(
            'Update Failed',
            error.message,
            'error'
        );

    } finally {
        hideOwnerLoading();
    }
}

/* ================================================================
   STATUS
   ================================================================ */

function toggleOwnerCafeStatus(restaurantId) {
    const restaurant = getRestaurantById(restaurantId);

    if (!restaurant) {
        return;
    }

    const active =
        restaurant.status === 'active' ||
        restaurant.is_active === true;

    openOwnerActionPanel(
        active
            ? 'Disable Restaurant'
            : 'Enable Restaurant',
        `
            <div class="owner-confirmation">
                <div class="owner-confirmation-icon ${active ? 'warning' : 'success'}">
                    ${active ? '⏸' : '✓'}
                </div>

                <span class="owner-form-eyebrow">
                    RESTAURANT STATUS
                </span>

                <h2>
                    ${active ? 'Disable' : 'Enable'}
                    ${escapeHtml(restaurant.name)}?
                </h2>

                <p>
                    ${
                        active
                            ? 'Customers will no longer be able to access this restaurant menu while it is disabled.'
                            : 'Customers will be able to access this restaurant menu again.'
                    }
                </p>

                <div class="owner-confirmation-actions">
                    <button type="button"
                            class="owner-secondary-btn"
                            onclick="closeOwnerActionPanel()">
                        Cancel
                    </button>

                    <button type="button"
                            class="owner-primary-btn ${active ? 'danger-btn' : ''}"
                            onclick="saveOwnerCafeStatus(${Number(restaurant.id)}, ${active ? 'false' : 'true'})">
                        ${active ? 'Disable Restaurant' : 'Enable Restaurant'}
                    </button>
                </div>
            </div>
        `
    );
}

async function saveOwnerCafeStatus(restaurantId, shouldBeActive) {
    const token = localStorage.getItem('adminToken');

    showOwnerLoading(
        shouldBeActive
            ? 'Enabling restaurant...'
            : 'Disabling restaurant...'
    );

    try {
        const response = await fetch(
            `/api/owner/restaurants/${Number(restaurantId)}/status`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    active: shouldBeActive === true ||
                           shouldBeActive === 'true'
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to update restaurant status.'
            );
        }

        closeOwnerActionPanel();

        await loadOwnerCafes();

        showOwnerNotification(
            'Status Updated',
            shouldBeActive === true || shouldBeActive === 'true'
                ? 'Restaurant is now active.'
                : 'Restaurant has been disabled.',
            'success'
        );

    } catch (error) {
        console.error('Status update error:', error);

        showOwnerNotification(
            'Status Update Failed',
            error.message,
            'error'
        );

    } finally {
        hideOwnerLoading();
    }
}

/* ================================================================
   DELETE
   ================================================================ */

function deleteOwnerCafe(restaurantId) {
    const restaurant = getRestaurantById(restaurantId);

    if (!restaurant) {
        return;
    }

    openOwnerActionPanel(
        'Delete Restaurant',
        `
            <div class="owner-confirmation delete-confirmation">
                <div class="owner-confirmation-icon danger">
                    ⌫
                </div>

                <span class="owner-form-eyebrow danger-eyebrow">
                    PERMANENT ACTION
                </span>

                <h2>
                    Delete ${escapeHtml(restaurant.name)}?
                </h2>

                <p>
                    This action permanently removes the restaurant
                    and its associated menu/profile data.
                </p>

                <div class="owner-danger-box">
                    <strong>This cannot be undone.</strong>
                    <span>
                        Make sure you are deleting the correct restaurant.
                    </span>
                </div>

                <div class="owner-confirmation-actions">
                    <button type="button"
                            class="owner-secondary-btn"
                            onclick="closeOwnerActionPanel()">
                        Cancel
                    </button>

                    <button type="button"
                            class="owner-primary-btn danger-btn"
                            onclick="confirmDeleteOwnerCafe(${Number(restaurant.id)})">
                        Delete Permanently
                    </button>
                </div>
            </div>
        `
    );
}

async function confirmDeleteOwnerCafe(restaurantId) {
    const token = localStorage.getItem('adminToken');

    showOwnerLoading('Deleting restaurant...');

    try {
        const response = await fetch(
            `/api/owner/restaurants/${Number(restaurantId)}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                credentials: 'same-origin'
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to delete restaurant.'
            );
        }

        ownerOpenRestaurantId = null;

        closeOwnerActionPanel();

        await loadOwnerCafes();

        showOwnerNotification(
            'Restaurant Deleted',
            'The restaurant was permanently removed.',
            'success'
        );

    } catch (error) {
        console.error('Delete restaurant error:', error);

        showOwnerNotification(
            'Delete Failed',
            error.message,
            'error'
        );

    } finally {
        hideOwnerLoading();
    }
}

/* ================================================================
   DUPLICATE CAFÉ
   ================================================================ */

function openDuplicateCafeFromRestaurant(restaurantId) {
    closeOwnerActionPanel();
    openDuplicateCafePanel(restaurantId);
}

function openDuplicateCafePanel(preselectedRestaurantId = '') {
    closeSuperAdminMenu();

    const activeRestaurants =
        ownerRestaurantsData.filter(
            restaurant =>
                restaurant.status === 'active' ||
                restaurant.is_active === true
        );

    if (!activeRestaurants.length) {
        showOwnerNotification(
            'No Active Cafés',
            'Create or enable a restaurant before creating a duplicate.',
            'error'
        );
        return;
    }

    const options = activeRestaurants.map(restaurant => `
        <option value="${Number(restaurant.id)}"
                ${Number(preselectedRestaurantId) === Number(restaurant.id) ? 'selected' : ''}>
            ${escapeHtml(restaurant.name)}
        </option>
    `).join('');

    openOwnerActionPanel(
        'Duplicate Café',
        `
            <div class="duplicate-cafe-form">

                <div class="duplicate-hero">
                    <div class="duplicate-hero-icon">⧉</div>
                    <div>
                        <span class="owner-form-eyebrow">
                            CLONE RESTAURANT
                        </span>
                        <h2>Create an independent café copy</h2>
                        <p>
                            Copy the selected café's menu and profile
                            into a completely separate restaurant.
                        </p>
                    </div>
                </div>

                <div class="duplicate-step">
                    <div class="duplicate-step-heading">
                        <span>01</span>
                        <div>
                            <strong>Source Café</strong>
                            <small>Select the café to copy.</small>
                        </div>
                    </div>

                    <label class="owner-field">
                        <span>Copy From</span>
                        <select id="duplicateSourceCafe"
                                onchange="updateDuplicateCafeSourceInfo()"
                                required>
                            <option value="">Choose a café...</option>
                            ${options}
                        </select>
                    </label>

                    <div id="duplicateSourceInfo"
                         class="duplicate-source-info">
                        Select a café to see what will be copied.
                    </div>
                </div>

                <div class="duplicate-step">
                    <div class="duplicate-step-heading">
                        <span>02</span>
                        <div>
                            <strong>New Café</strong>
                            <small>Give the duplicate its own identity.</small>
                        </div>
                    </div>

                    <div class="owner-field-grid">
                        <label class="owner-field">
                            <span>New Café Name</span>
                            <input id="duplicateCafeName"
                                   type="text"
                                   maxlength="120"
                                   required
                                   placeholder="Example: New Branch Coffee">
                        </label>

                        <label class="owner-field">
                            <span>New Public Slug</span>
                            <input id="duplicateCafeSlug"
                                   type="text"
                                   maxlength="80"
                                   required
                                   placeholder="new-branch-coffee">
                        </label>
                    </div>
                </div>

                <div class="duplicate-step">
                    <div class="duplicate-step-heading">
                        <span>03</span>
                        <div>
                            <strong>New Administrator</strong>
                            <small>The duplicate needs its own login.</small>
                        </div>
                    </div>

                    <div class="owner-field-grid">
                        <label class="owner-field">
                            <span>Admin Email</span>
                            <input id="duplicateAdminEmail"
                                   type="email"
                                   maxlength="160"
                                   required
                                   placeholder="admin@example.com">
                        </label>

                        <label class="owner-field">
                            <span>Admin Password</span>
                            <input id="duplicateAdminPassword"
                                   type="password"
                                   minlength="6"
                                   maxlength="100"
                                   required
                                   placeholder="Minimum 6 characters">
                        </label>

                        <label class="owner-field">
                            <span>Confirm Password</span>
                            <input id="duplicateAdminPasswordConfirm"
                                   type="password"
                                   minlength="6"
                                   maxlength="100"
                                   required
                                   placeholder="Repeat password">
                        </label>
                    </div>
                </div>

                <div class="duplicate-info-box">
                    <div class="duplicate-info-icon">✓</div>
                    <div>
                        <strong>What will be copied?</strong>
                        <ul>
                            <li>Menu categories and menu items</li>
                            <li>Current menu prices</li>
                            <li>Restaurant logo/profile data</li>
                            <li>Phone numbers and addresses</li>
                        </ul>
                        <p>
                            The new café receives its own restaurant ID
                            and admin account. Future changes are independent.
                        </p>
                    </div>
                </div>

                <div class="owner-form-actions">
                    <button type="button"
                            class="owner-secondary-btn"
                            onclick="closeOwnerActionPanel()">
                        Cancel
                    </button>

                    <button type="button"
                            class="owner-primary-btn"
                            onclick="submitDuplicateCafe()">
                        Create Duplicate
                    </button>
                </div>
            </div>
        `
    );

    const nameInput =
        document.getElementById('duplicateCafeName');

    const slugInput =
        document.getElementById('duplicateCafeSlug');

    if (nameInput && slugInput) {
        nameInput.addEventListener('input', () => {
            if (!slugInput.dataset.manual) {
                slugInput.value =
                    createSlugFromName(nameInput.value);
            }
        });

        slugInput.addEventListener('input', () => {
            slugInput.dataset.manual = 'true';
        });
    }

    updateDuplicateCafeSourceInfo();
}

function updateDuplicateCafeSourceInfo() {
    const select =
        document.getElementById('duplicateSourceCafe');

    const info =
        document.getElementById('duplicateSourceInfo');

    if (!select || !info) {
        return;
    }

    const restaurant =
        getRestaurantById(select.value);

    if (!restaurant) {
        info.innerHTML =
            'Select a café to see what will be copied.';
        info.className =
            'duplicate-source-info empty';
        return;
    }

    info.className =
        'duplicate-source-info selected';

    info.innerHTML = `
        <div class="duplicate-source-avatar">
            ${escapeHtml(
                String(restaurant.name || 'C')
                    .charAt(0)
                    .toUpperCase()
            )}
        </div>

        <div>
            <strong>${escapeHtml(restaurant.name)}</strong>
            <span>
                /${escapeHtml(restaurant.slug || '')}
            </span>
        </div>

        <div class="duplicate-source-badge">
            ACTIVE
        </div>
    `;
}

async function submitDuplicateCafe() {
    const sourceId =
        Number(
            document.getElementById('duplicateSourceCafe')?.value
        );

    const name =
        document.getElementById('duplicateCafeName')?.value.trim();

    const slug =
        document.getElementById('duplicateCafeSlug')?.value.trim().toLowerCase();

    const adminEmail =
        document.getElementById('duplicateAdminEmail')?.value.trim();

    const adminPassword =
        document.getElementById('duplicateAdminPassword')?.value;

    const confirmPassword =
        document.getElementById('duplicateAdminPasswordConfirm')?.value;

    const sourceRestaurant =
        getRestaurantById(sourceId);

    if (!sourceRestaurant) {
        showOwnerNotification(
            'Select a Café',
            'Choose the source café first.',
            'error'
        );
        return;
    }

    if (!name || !slug || !adminEmail || !adminPassword) {
        showOwnerNotification(
            'Missing Information',
            'Please complete all required fields.',
            'error'
        );
        return;
    }

    if (adminPassword.length < 6) {
        showOwnerNotification(
            'Invalid Password',
            'The administrator password must contain at least 6 characters.',
            'error'
        );
        return;
    }

    if (adminPassword !== confirmPassword) {
        showOwnerNotification(
            'Passwords Do Not Match',
            'Please make sure both password fields are identical.',
            'error'
        );
        return;
    }

    const slugPattern =
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    if (!slugPattern.test(slug)) {
        showOwnerNotification(
            'Invalid Slug',
            'Use lowercase letters, numbers, and hyphens only.',
            'error'
        );
        return;
    }

    showOwnerActionPanel(
        'Confirm Duplicate Café',
        `
            <div class="owner-confirmation">
                <div class="owner-confirmation-icon success">
                    ⧉
                </div>

                <span class="owner-form-eyebrow">
                    FINAL CONFIRMATION
                </span>

                <h2>Create ${escapeHtml(name)}?</h2>

                <p>
                    A new independent restaurant will be created from
                    ${escapeHtml(sourceRestaurant.name)}.
                </p>

                <div class="owner-confirmation-summary">
                    <div>
                        <span>Source</span>
                        <strong>${escapeHtml(sourceRestaurant.name)}</strong>
                    </div>

                    <div>
                        <span>New Café</span>
                        <strong>${escapeHtml(name)}</strong>
                    </div>

                    <div>
                        <span>Public URL</span>
                        <strong>/${escapeHtml(slug)}</strong>
                    </div>

                    <div>
                        <span>Admin</span>
                        <strong>${escapeHtml(adminEmail)}</strong>
                    </div>
                </div>

                <div class="owner-info-box">
                    <span class="owner-info-icon">✓</span>
                    <div>
                        <strong>Independent copy</strong>
                        <p>
                            The copied café will have its own restaurant
                            record and menu data.
                        </p>
                    </div>
                </div>

                <div class="owner-confirmation-actions">
                    <button type="button"
                            class="owner-secondary-btn"
                            onclick="openDuplicateCafePanel(${sourceId})">
                        Go Back
                    </button>

                    <button type="button"
                            class="owner-primary-btn"
                            onclick="executeDuplicateCafe(
                                ${sourceId},
                                ${JSON.stringify(name)},
                                ${JSON.stringify(slug)},
                                ${JSON.stringify(adminEmail)},
                                ${JSON.stringify(adminPassword)}
                            )">
                        Create Café
                    </button>
                </div>
            </div>
        `
    );
}

async function executeDuplicateCafe(
    sourceId,
    name,
    slug,
    adminEmail,
    adminPassword
) {
    const token = localStorage.getItem('adminToken');

    showOwnerLoading('Creating independent café copy...');

    try {
        const response = await fetch(
            `/api/owner/restaurants/${Number(sourceId)}/duplicate`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name,
                    slug,
                    adminEmail,
                    adminPassword
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to duplicate café.'
            );
        }

        closeOwnerActionPanel();

        await loadOwnerCafes();

        showOwnerNotification(
            'Café Duplicated',
            `${name} was created as an independent café.`,
            'success'
        );

    } catch (error) {
        console.error('Duplicate café error:', error);

        showOwnerNotification(
            'Duplicate Failed',
            error.message,
            'error'
        );

    } finally {
        hideOwnerLoading();
    }
}

/* ================================================================
   PRICE MANAGEMENT
   ================================================================ */

function openPriceManagementForRestaurant(restaurantId) {
    closeOwnerActionPanel();
    openPriceManagementPanel(restaurantId);
}

function openPriceManagementPanel(preselectedRestaurantId = '') {
    closeSuperAdminMenu();

    const activeRestaurants =
        ownerRestaurantsData.filter(
            restaurant =>
                restaurant.status === 'active' ||
                restaurant.is_active === true
        );

    if (!activeRestaurants.length) {
        showOwnerNotification(
            'No Active Cafés',
            'Price management is available for active restaurants only.',
            'error'
        );
        return;
    }

    priceManagementRestaurant = null;
    priceManagementMenu = {};
    priceManagementSearch = '';
    priceManagementSelectedItems = new Set();

    const options = activeRestaurants.map(restaurant => `
        <option value="${Number(restaurant.id)}"
                ${Number(preselectedRestaurantId) === Number(restaurant.id) ? 'selected' : ''}>
            ${escapeHtml(restaurant.name)}
        </option>
    `).join('');

    openOwnerActionPanel(
        'Price Management',
        `
            <div class="price-management">

                <div class="price-management-hero">
                    <div class="price-management-icon">%</div>
                    <div>
                        <span class="price-management-eyebrow">
                            MENU PRICING
                        </span>
                        <h2>Price Management</h2>
                        <p>
                            Adjust menu prices for one café without affecting
                            any other restaurant.
                        </p>
                    </div>
                </div>

                <div class="price-cafe-selector">
                    <label class="owner-field">
                        <span>01 · Choose Café</span>
                        <select id="priceManagementCafe"
                                onchange="openPriceEditorForCafe(this.value)">
                            <option value="">Choose a café...</option>
                            ${options}
                        </select>
                    </label>
                </div>

                <div id="priceManagementEditor">
                    <div class="price-empty-editor">
                        <div class="price-empty-icon">%</div>
                        <strong>Select a café to continue</strong>
                        <span>
                            Price changes will apply only to the café you select.
                        </span>
                    </div>
                </div>

            </div>
        `
    );

    if (preselectedRestaurantId) {
        openPriceEditorForCafe(preselectedRestaurantId);
    }
}

async function openPriceEditorForCafe(restaurantId) {
    const restaurant =
        getRestaurantById(restaurantId);

    const editor =
        document.getElementById('priceManagementEditor');

    if (!restaurant || !editor) {
        return;
    }

    const active =
        restaurant.status === 'active' ||
        restaurant.is_active === true;

    if (!active) {
        showOwnerNotification(
            'Restaurant Disabled',
            'Price management is available for active restaurants only.',
            'error'
        );
        return;
    }

    priceManagementRestaurant = restaurant;
    priceManagementMenu = {};
    priceManagementSearch = '';
    priceManagementSelectedItems = new Set();

    editor.innerHTML = `
        <div class="price-loading-editor">
            <div class="owner-loading-spinner"></div>
            <strong>Loading menu prices...</strong>
            <span>
                Preparing ${escapeHtml(restaurant.name)}.
            </span>
        </div>
    `;

    try {
        const response = await fetch(
            `/api/menu/${encodeURIComponent(
                restaurant.slug
            )}?priceManagement=${Date.now()}`,
            {
                method: 'GET',
                cache: 'no-store'
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to load restaurant menu.'
            );
        }

        priceManagementMenu =
            data.menu && typeof data.menu === 'object'
                ? data.menu
                : {};

        renderPriceManagementForm();

    } catch (error) {
        console.error('Price menu loading error:', error);

        editor.innerHTML = `
            <div class="price-error-editor">
                <div class="price-empty-icon">!</div>
                <strong>Unable to load menu</strong>
                <span>${escapeHtml(error.message)}</span>

                <button type="button"
                        class="owner-secondary-btn"
                        onclick="openPriceEditorForCafe(${Number(restaurant.id)})">
                    Try Again
                </button>
            </div>
        `;
    }
}

function renderPriceManagementForm() {
    const editor =
        document.getElementById('priceManagementEditor');

    if (!editor || !priceManagementRestaurant) {
        return;
    }

    const categories =
        Object.keys(priceManagementMenu)
            .filter(category =>
                Array.isArray(priceManagementMenu[category])
            );

    const allItems = getAllPriceItems();

    const categoryOptions = categories.map(category => `
        <option value="${escapeHtml(category)}">
            ${escapeHtml(formatPriceCategoryName(category))}
        </option>
    `).join('');

    editor.innerHTML = `
        <div class="price-management-editor">

            <div class="price-selected-cafe">
                <div class="price-selected-cafe-icon">
                    ${escapeHtml(
                        String(priceManagementRestaurant.name || 'C')
                            .charAt(0)
                            .toUpperCase()
                    )}
                </div>

                <div>
                    <span>Selected Café</span>
                    <strong>
                        ${escapeHtml(priceManagementRestaurant.name)}
                    </strong>
                </div>

                <button type="button"
                        class="price-change-cafe-btn"
                        onclick="openPriceManagementPanel()">
                    Change Café
                </button>
            </div>

            <div class="price-summary-strip">
                <div>
                    <span>Categories</span>
                    <strong>${categories.length}</strong>
                </div>

                <div>
                    <span>Priced Items</span>
                    <strong>${allItems.length}</strong>
                </div>

                <div>
                    <span>Status</span>
                    <strong class="price-status-ready">
                        Ready
                    </strong>
                </div>
            </div>

            <section class="price-step">
                <div class="price-section-heading">
                    <div class="price-section-number">02</div>
                    <div>
                        <span>ADJUSTMENT</span>
                        <h3>How should prices change?</h3>
                    </div>
                </div>

                <div class="price-operation-toggle">
                    <label class="price-operation-option selected"
                           data-operation="increase">
                        <input type="radio"
                               name="priceOperation"
                               value="increase"
                               checked>

                        <span class="price-operation-icon">↗</span>

                        <span>
                            <strong>Increase</strong>
                            <small>Add to current prices</small>
                        </span>
                    </label>

                    <label class="price-operation-option"
                           data-operation="decrease">
                        <input type="radio"
                               name="priceOperation"
                               value="decrease">

                        <span class="price-operation-icon">↘</span>

                        <span>
                            <strong>Decrease</strong>
                            <small>Reduce current prices</small>
                        </span>
                    </label>
                </div>

                <div class="price-percentage-row">
                    <label class="owner-field percentage-field">
                        <span>Percentage</span>

                        <div class="percentage-input-wrap">
                            <input id="pricePercentage"
                                   type="number"
                                   min="0.01"
                                   max="1000"
                                   step="0.01"
                                   value="10"
                                   inputmode="decimal">

                            <span>%</span>
                        </div>
                    </label>

                    <div class="percentage-example">
                        <span>Example</span>
                        <strong>100 ETB → 110 ETB</strong>
                        <small>
                            With a 10% increase
                        </small>
                    </div>
                </div>
            </section>

            <section class="price-step">
                <div class="price-section-heading">
                    <div class="price-section-number">03</div>
                    <div>
                        <span>APPLY TO</span>
                        <h3>Choose which menu items to change</h3>
                    </div>
                </div>

                <div class="price-scope-grid">

                    <label class="price-scope-option selected"
                           data-scope="all">
                        <input type="radio"
                               name="priceScope"
                               value="all"
                               checked>

                        <span class="price-scope-icon">◎</span>

                        <span>
                            <strong>All Menu Items</strong>
                            <small>
                                Update every priced item
                            </small>
                        </span>
                    </label>

                    <label class="price-scope-option"
                           data-scope="category">
                        <input type="radio"
                               name="priceScope"
                               value="category">

                        <span class="price-scope-icon">▦</span>

                        <span>
                            <strong>Selected Category</strong>
                            <small>
                                Update one category
                            </small>
                        </span>
                    </label>

                    <label class="price-scope-option"
                           data-scope="items">
                        <input type="radio"
                               name="priceScope"
                               value="items">

                        <span class="price-scope-icon">☷</span>

                        <span>
                            <strong>Selected Items</strong>
                            <small>
                                Choose individual items
                            </small>
                        </span>
                    </label>

                </div>

                <div id="priceCategoryArea"
                     class="price-hidden-area">

                    <label class="owner-field">
                        <span>Category</span>
                        <select id="priceCategory">
                            <option value="">
                                Choose category...
                            </option>
                            ${categoryOptions}
                        </select>
                    </label>

                </div>

                <div id="priceItemsArea"
                     class="price-hidden-area">

                    <div class="price-items-toolbar">
                        <div class="price-items-toolbar-title">
                            <strong>Select menu items</strong>
                            <span id="priceSelectedCount">
                                0 selected
                            </span>
                        </div>

                        <button type="button"
                                id="priceSelectAllBtn"
                                class="price-select-all-btn">
                            Select Visible
                        </button>
                    </div>

                    <div class="price-search-wrap">
                        <span>⌕</span>

                        <input id="priceItemSearch"
                               type="search"
                               placeholder="Search menu items..."
                               autocomplete="off">

                        <button type="button"
                                id="priceItemSearchClear"
                                aria-label="Clear search">
                            ✕
                        </button>
                    </div>

                    <div id="priceItemsList"
                         class="price-items-list"></div>
                </div>
            </section>

            <section class="price-step price-preview-step">
                <div class="price-section-heading">
                    <div class="price-section-number">04</div>
                    <div>
                        <span>PREVIEW</span>
                        <h3>Review the price changes</h3>
                    </div>
                </div>

                <div id="pricePreview"
                     class="price-preview"></div>
            </section>

            <div class="price-warning-box">
                <div class="price-warning-icon">!</div>
                <div>
                    <strong>Review before applying</strong>
                    <p>
                        The selected prices will be updated in the database.
                        Make sure the café and adjustment are correct.
                    </p>
                </div>
            </div>

            <div class="price-form-actions">
                <button type="button"
                        class="owner-secondary-btn"
                        onclick="openPriceManagementPanel()">
                    Change Café
                </button>

                <button type="button"
                        class="owner-primary-btn price-apply-btn"
                        onclick="confirmPriceManagement()">
                    Review & Apply
                </button>
            </div>

        </div>
    `;

    setupPriceManagementEvents();
    renderPriceItemsList();
    updatePriceManagementUI();
}

function formatPriceCategoryName(category) {
    return String(category || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

/* ================================================================
   PRICE EVENTS
   ================================================================ */

function setupPriceManagementEvents() {
    document
        .querySelectorAll('input[name="priceOperation"]')
        .forEach(input => {
            input.addEventListener('change', updatePriceManagementUI);
        });

    document
        .querySelectorAll('input[name="priceScope"]')
        .forEach(input => {
            input.addEventListener('change', updatePriceManagementUI);
        });

    const percentage =
        document.getElementById('pricePercentage');

    if (percentage) {
        percentage.addEventListener(
            'input',
            updatePriceManagementUI
        );
    }

    const category =
        document.getElementById('priceCategory');

    if (category) {
        category.addEventListener(
            'change',
            updatePriceManagementUI
        );
    }

    const search =
        document.getElementById('priceItemSearch');

    if (search) {
        search.addEventListener('input', () => {
            priceManagementSearch =
                search.value.trim().toLowerCase();

            renderPriceItemsList();
        });
    }

    const clearSearch =
        document.getElementById('priceItemSearchClear');

    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            if (search) {
                search.value = '';
            }

            priceManagementSearch = '';

            renderPriceItemsList();
        });
    }

    const selectAll =
        document.getElementById('priceSelectAllBtn');

    if (selectAll) {
        selectAll.addEventListener(
            'click',
            toggleAllPriceItems
        );
    }
}

function updatePriceManagementUI() {
    const operation =
        document.querySelector(
            'input[name="priceOperation"]:checked'
        )?.value || 'increase';

    const scope =
        document.querySelector(
            'input[name="priceScope"]:checked'
        )?.value || 'all';

    document
        .querySelectorAll('.price-operation-option')
        .forEach(option => {
            option.classList.toggle(
                'selected',
                option.dataset.operation === operation
            );
        });

    document
        .querySelectorAll('.price-scope-option')
        .forEach(option => {
            option.classList.toggle(
                'selected',
                option.dataset.scope === scope
            );
        });

    const categoryArea =
        document.getElementById('priceCategoryArea');

    const itemsArea =
        document.getElementById('priceItemsArea');

    if (categoryArea) {
        categoryArea.classList.toggle(
            'visible',
            scope === 'category'
        );
    }

    if (itemsArea) {
        itemsArea.classList.toggle(
            'visible',
            scope === 'items'
        );
    }

    updatePricePreview();
}

function getAllPriceItems() {
    const items = [];

    Object.keys(priceManagementMenu || {}).forEach(category => {
        const categoryItems =
            priceManagementMenu[category];

        if (!Array.isArray(categoryItems)) {
            return;
        }

        categoryItems.forEach((item, index) => {
            if (!item || typeof item !== 'object') {
                return;
            }

            const price = Number(item.price);

            if (!Number.isFinite(price)) {
                return;
            }

            items.push({
                category,
                index,
                item
            });
        });
    });

    return items;
}

function getPriceItemName(item, fallback = 'Menu Item') {
    return String(
        item?.name ||
        item?.title ||
        fallback
    );
}

function renderPriceItemsList() {
    const list =
        document.getElementById('priceItemsList');

    if (!list) {
        return;
    }

    const allItems = getAllPriceItems();

    const filtered = allItems.filter(entry => {
        if (!priceManagementSearch) {
            return true;
        }

        const itemName =
            getPriceItemName(entry.item).toLowerCase();

        const category =
            formatPriceCategoryName(entry.category)
                .toLowerCase();

        return (
            itemName.includes(priceManagementSearch) ||
            category.includes(priceManagementSearch)
        );
    });

    if (!filtered.length) {
        list.innerHTML = `
            <div class="price-items-empty">
                <span>⌕</span>
                <strong>No matching items</strong>
                <small>
                    Try another search.
                </small>
            </div>
        `;

        updateSelectedPriceCount();
        return;
    }

    list.innerHTML = '';

    filtered.forEach(entry => {
        const key =
            `${entry.category}::${entry.index}`;

        const checked =
            priceManagementSelectedItems.has(key);

        const itemName =
            getPriceItemName(
                entry.item,
                `Item ${entry.index + 1}`
            );

        const price =
            Number(entry.item.price);

        const row =
            document.createElement('label');

        row.className =
            `price-item-row ${checked ? 'selected' : ''}`;

        row.innerHTML = `
            <input class="price-item-checkbox"
                   type="checkbox"
                   data-price-item-key="${escapeHtml(key)}"
                   ${checked ? 'checked' : ''}>

            <span class="price-item-check">
                ✓
            </span>

            <span class="price-item-info">
                <strong>
                    ${escapeHtml(itemName)}
                </strong>

                <small>
                    ${escapeHtml(
                        formatPriceCategoryName(entry.category)
                    )}
                </small>
            </span>

            <span class="price-item-current">
                ${formatETB(price)}
            </span>
        `;

        const checkbox =
            row.querySelector('.price-item-checkbox');

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                priceManagementSelectedItems.add(key);
                row.classList.add('selected');
            } else {
                priceManagementSelectedItems.delete(key);
                row.classList.remove('selected');
            }

            updateSelectedPriceCount();
            updatePricePreview();
        });

        list.appendChild(row);
    });

    updateSelectedPriceCount();
}

function updateSelectedPriceCount() {
    const countElement =
        document.getElementById('priceSelectedCount');

    if (countElement) {
        const count =
            priceManagementSelectedItems.size;

        countElement.textContent =
            `${count} selected`;
    }
}

function toggleAllPriceItems() {
    const allItems = getAllPriceItems();

    const visibleItems =
        allItems.filter(entry => {
            if (!priceManagementSearch) {
                return true;
            }

            const itemName =
                getPriceItemName(entry.item).toLowerCase();

            const category =
                formatPriceCategoryName(entry.category)
                    .toLowerCase();

            return (
                itemName.includes(priceManagementSearch) ||
                category.includes(priceManagementSearch)
            );
        });

    if (!visibleItems.length) {
        return;
    }

    const allVisibleSelected =
        visibleItems.every(entry =>
            priceManagementSelectedItems.has(
                `${entry.category}::${entry.index}`
            )
        );

    visibleItems.forEach(entry => {
        const key =
            `${entry.category}::${entry.index}`;

        if (allVisibleSelected) {
            priceManagementSelectedItems.delete(key);
        } else {
            priceManagementSelectedItems.add(key);
        }
    });

    renderPriceItemsList();
    updatePricePreview();
}

function getSelectedPriceItems() {
    return getAllPriceItems().filter(entry =>
        priceManagementSelectedItems.has(
            `${entry.category}::${entry.index}`
        )
    );
}

/* ================================================================
   PRICE CALCULATION
   ================================================================ */

function calculateNewPrice(price, mode, percentage) {
    const original =
        Number(price);

    const percent =
        Number(percentage);

    if (
        !Number.isFinite(original) ||
        !Number.isFinite(percent)
    ) {
        return original;
    }

    const multiplier =
        mode === 'decrease'
            ? 1 - (percent / 100)
            : 1 + (percent / 100);

    return Math.round(
        (original * multiplier + Number.EPSILON) * 100
    ) / 100;
}

function updatePricePreview() {
    const preview =
        document.getElementById('pricePreview');

    if (!preview) {
        return;
    }

    const mode =
        document.querySelector(
            'input[name="priceOperation"]:checked'
        )?.value || 'increase';

    const percentage =
        Number(
            document.getElementById('pricePercentage')?.value
        );

    const scope =
        document.querySelector(
            'input[name="priceScope"]:checked'
        )?.value || 'all';

    if (
        !Number.isFinite(percentage) ||
        percentage <= 0
    ) {
        preview.innerHTML = `
            <div class="price-preview-empty">
                Enter a valid percentage to preview the changes.
            </div>
        `;
        return;
    }

    let affectedItems = [];

    if (scope === 'all') {
        affectedItems = getAllPriceItems();

    } else if (scope === 'category') {
        const category =
            document.getElementById('priceCategory')?.value;

        if (category) {
            affectedItems =
                getAllPriceItems().filter(
                    entry => entry.category === category
                );
        }

    } else if (scope === 'items') {
        affectedItems =
            getSelectedPriceItems();
    }

    const previewItems =
        affectedItems.slice(0, 8);

    const skippedCount =
        getAllPriceItems().length -
        affectedItems.length;

    const operationLabel =
        mode === 'increase'
            ? `+${percentage}%`
            : `-${percentage}%`;

    const scopeLabel =
        scope === 'all'
            ? 'All menu items'
            : scope === 'category'
                ? (
                    document.getElementById('priceCategory')?.value
                        ? formatPriceCategoryName(
                            document.getElementById('priceCategory').value
                        )
                        : 'No category selected'
                )
                : `${affectedItems.length} selected items`;

    let rows = '';

    previewItems.forEach(entry => {
        const name =
            getPriceItemName(entry.item);

        const oldPrice =
            Number(entry.item.price);

        const newPrice =
            calculateNewPrice(
                oldPrice,
                mode,
                percentage
            );

        rows += `
            <div class="price-preview-row">
                <div class="price-preview-item">
                    <strong>
                        ${escapeHtml(name)}
                    </strong>
                    <small>
                        ${escapeHtml(
                            formatPriceCategoryName(
                                entry.category
                            )
                        )}
                    </small>
                </div>

                <div class="price-preview-old">
                    ${formatETB(oldPrice)}
                </div>

                <div class="price-preview-arrow">
                    →
                </div>

                <div class="price-preview-new">
                    ${formatETB(newPrice)}
                </div>
            </div>
        `;
    });

    if (!previewItems.length) {
        preview.innerHTML = `
            <div class="price-preview-empty">
                <span class="price-preview-empty-icon">◎</span>
                <strong>No items selected yet</strong>
                <small>
                    ${
                        scope === 'category'
                            ? 'Choose a category to preview prices.'
                            : scope === 'items'
                                ? 'Select at least one menu item.'
                                : 'No priced menu items were found.'
                    }
                </small>
            </div>
        `;

        return;
    }

    preview.innerHTML = `
        <div class="price-preview-summary">
            <div>
                <span>Adjustment</span>
                <strong>${operationLabel}</strong>
            </div>

            <div>
                <span>Scope</span>
                <strong>${escapeHtml(scopeLabel)}</strong>
            </div>

            <div>
                <span>Affected</span>
                <strong>${affectedItems.length}</strong>
            </div>
        </div>

        <div class="price-preview-list">
            ${rows}
        </div>

        ${
            affectedItems.length > previewItems.length
                ? `
                    <div class="price-preview-more">
                        + ${affectedItems.length - previewItems.length}
                        more item${
                            affectedItems.length -
                            previewItems.length === 1
                                ? ''
                                : 's'
                        }
                    </div>
                `
                : ''
        }

        ${
            skippedCount > 0 && scope === 'all'
                ? `
                    <div class="price-preview-note">
                        ${skippedCount} menu item${
                            skippedCount === 1 ? '' : 's'
                        } without a valid numeric price will not be changed.
                    </div>
                `
                : ''
        }
    `;
}

/* ================================================================
   PRICE CONFIRMATION
   ================================================================ */

function confirmPriceManagement() {
    if (!priceManagementRestaurant) {
        showOwnerNotification(
            'Choose a Café',
            'Select a restaurant before applying price changes.',
            'error'
        );
        return;
    }

    const mode =
        document.querySelector(
            'input[name="priceOperation"]:checked'
        )?.value || 'increase';

    const percentage =
        Number(
            document.getElementById('pricePercentage')?.value
        );

    const scope =
        document.querySelector(
            'input[name="priceScope"]:checked'
        )?.value || 'all';

    if (
        !Number.isFinite(percentage) ||
        percentage <= 0
    ) {
        showOwnerNotification(
            'Invalid Percentage',
            'Enter a percentage greater than 0.',
            'error'
        );
        return;
    }

    if (percentage > 1000) {
        showOwnerNotification(
            'Percentage Too High',
            'The maximum allowed adjustment is 1000%.',
            'error'
        );
        return;
    }

    if (
        mode === 'decrease' &&
        percentage >= 100
    ) {
        showOwnerNotification(
            'Invalid Decrease',
            'A decrease must be less than 100%.',
            'error'
        );
        return;
    }

    let affectedItems = [];

    if (scope === 'all') {
        affectedItems = getAllPriceItems();

    } else if (scope === 'category') {
        const category =
            document.getElementById('priceCategory')?.value;

        if (!category) {
            showOwnerNotification(
                'Choose a Category',
                'Select a category before continuing.',
                'error'
            );
            return;
        }

        affectedItems =
            getAllPriceItems().filter(
                entry => entry.category === category
            );

    } else if (scope === 'items') {
        affectedItems =
            getSelectedPriceItems();

        if (!affectedItems.length) {
            showOwnerNotification(
                'No Items Selected',
                'Select at least one menu item.',
                'error'
            );
            return;
        }
    }

    if (!affectedItems.length) {
        showOwnerNotification(
            'No Priced Items',
            'There are no valid priced items in the selected scope.',
            'error'
        );
        return;
    }

    const operation =
        mode === 'increase'
            ? `Increase prices by ${percentage}%`
            : `Decrease prices by ${percentage}%`;

    const scopeText =
        scope === 'all'
            ? 'All menu items'
            : scope === 'category'
                ? formatPriceCategoryName(
                    document.getElementById('priceCategory')?.value
                )
                : `${affectedItems.length} selected items`;

    openOwnerActionPanel(
        'Confirm Price Changes',
        `
            <div class="price-confirmation">

                <div class="price-confirmation-icon">
                    %
                </div>

                <span class="price-management-eyebrow">
                    FINAL REVIEW
                </span>

                <h2>
                    Apply price changes?
                </h2>

                <p>
                    Please review this operation carefully before applying it.
                </p>

                <div class="price-confirmation-summary">

                    <div>
                        <span>Café</span>
                        <strong>
                            ${escapeHtml(
                                priceManagementRestaurant.name
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Adjustment</span>
                        <strong>
                            ${escapeHtml(operation)}
                        </strong>
                    </div>

                    <div>
                        <span>Applies To</span>
                        <strong>
                            ${escapeHtml(scopeText)}
                        </strong>
                    </div>

                    <div>
                        <span>Affected Items</span>
                        <strong>
                            ${affectedItems.length}
                        </strong>
                    </div>

                </div>

                <div class="price-confirmation-warning">
                    <div>!</div>
                    <p>
                        These changes will be saved permanently to
                        ${escapeHtml(
                            priceManagementRestaurant.name
                        )}'s menu. Other cafés will not be affected.
                    </p>
                </div>

                <div class="owner-confirmation-actions">
                    <button type="button"
                            class="owner-secondary-btn"
                            onclick="renderPriceManagementForm()">
                        Go Back
                    </button>

                    <button type="button"
                            class="owner-primary-btn"
                            onclick="applyPriceManagement()">
                        Apply ${percentage}%
                    </button>
                </div>

            </div>
        `
    );
}

/* ================================================================
   APPLY PRICE MANAGEMENT
   ================================================================ */

async function applyPriceManagement() {
    if (!priceManagementRestaurant) {
        return;
    }

    const mode =
        document.querySelector(
            'input[name="priceOperation"]:checked'
        )?.value || 'increase';

    const percentage =
        Number(
            document.getElementById('pricePercentage')?.value
        );

    const scope =
        document.querySelector(
            'input[name="priceScope"]:checked'
        )?.value || 'all';

    const category =
        document.getElementById('priceCategory')?.value || null;

    if (
        !Number.isFinite(percentage) ||
        percentage <= 0 ||
        percentage > 1000
    ) {
        showOwnerNotification(
            'Invalid Percentage',
            'Enter a percentage between 0.01 and 1000.',
            'error'
        );
        return;
    }

    if (
        mode === 'decrease' &&
        percentage >= 100
    ) {
        showOwnerNotification(
            'Invalid Decrease',
            'A decrease must be less than 100%.',
            'error'
        );
        return;
    }

    if (scope === 'category' && !category) {
        showOwnerNotification(
            'Choose a Category',
            'Select a category before applying the changes.',
            'error'
        );
        return;
    }

    const selectedItems =
        scope === 'items'
            ? getSelectedPriceItems().map(entry => ({
                category: entry.category,
                index: entry.index
            }))
            : [];

    if (
        scope === 'items' &&
        !selectedItems.length
    ) {
        showOwnerNotification(
            'No Items Selected',
            'Select at least one item.',
            'error'
        );
        return;
    }

    const token =
        localStorage.getItem('adminToken');

    showOwnerLoading('Applying menu price changes...');

    try {
        const response = await fetch(
            `/api/owner/restaurants/${Number(
                priceManagementRestaurant.id
            )}/price-management`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    mode,
                    percentage,
                    scope,
                    category:
                        scope === 'category'
                            ? category
                            : null,
                    items: selectedItems
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                'Unable to apply price changes.'
            );
        }

        const affected =
            Number(data.affectedCount || 0);

        closeOwnerActionPanel();

        await loadOwnerCafes();

        showOwnerNotification(
            'Prices Updated',
            `${affected} menu item${affected === 1 ? '' : 's'} updated successfully.`,
            'success'
        );

        priceManagementRestaurant = null;
        priceManagementMenu = {};
        priceManagementSelectedItems = new Set();

    } catch (error) {
        console.error('Price management error:', error);

        showOwnerNotification(
            'Price Update Failed',
            error.message,
            'error'
        );

    } finally {
        hideOwnerLoading();
    }
}

/* ================================================================
   PUBLIC MENU / COMPANY PROFILE
   ================================================================ */

function manageOwnerCafeMenu(slug) {
    if (!slug) {
        return;
    }

    window.open(
        `/${encodeURIComponent(slug)}`,
        '_blank',
        'noopener'
    );
}

function openCompanyProfile() {
    closeSuperAdminMenu();

    window.open(
        '/',
        '_blank',
        'noopener'
    );
}

/* ================================================================
   NOTIFICATIONS
   ================================================================ */

function showOwnerNotification(
    title,
    message,
    type = 'success'
) {
    const notification =
        document.getElementById('ownerTopNotification');

    const titleElement =
        document.getElementById('ownerNotificationTitle');

    const messageElement =
        document.getElementById('ownerNotificationMessage');

    const iconElement =
        document.getElementById('ownerNotificationIcon');

    if (
        !notification ||
        !titleElement ||
        !messageElement ||
        !iconElement
    ) {
        return;
    }

    clearTimeout(ownerNotificationTimer);

    notification.classList.remove(
        'show',
        'success',
        'error',
        'warning'
    );

    notification.classList.add(type);

    titleElement.textContent =
        title || 'Notification';

    messageElement.textContent =
        message || '';

    iconElement.textContent =
        type === 'error'
            ? '!'
            : type === 'warning'
                ? '!'
                : '✓';

    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    ownerNotificationTimer =
        setTimeout(() => {
            closeOwnerNotification();
        }, 5000);
}

function closeOwnerNotification() {
    const notification =
        document.getElementById('ownerTopNotification');

    if (!notification) {
        return;
    }

    notification.classList.remove('show');

    clearTimeout(ownerNotificationTimer);
}

/* ================================================================
   ACTION PANEL / BACKDROP
   ================================================================ */

function ensureOwnerActionBackdrop() {
    let backdrop =
        document.getElementById('ownerActionBackdrop');

    if (!backdrop) {
        backdrop = document.createElement('div');

        backdrop.id =
            'ownerActionBackdrop';

        backdrop.className =
            'owner-action-backdrop';

        backdrop.addEventListener('click', () => {
            closeOwnerActionPanel();
        });

        document.body.appendChild(backdrop);
    }

    return backdrop;
}

function openOwnerActionPanel(title, html) {
    const panel =
        document.getElementById('ownerActionPanel');

    const titleElement =
        document.getElementById('ownerActionTitle');

    const contentElement =
        document.getElementById('ownerActionContent');

    if (!panel || !titleElement || !contentElement) {
        return;
    }

    ownerPreviousFocus =
        document.activeElement;

    titleElement.textContent =
        title || 'Restaurant Action';

    contentElement.innerHTML =
        html || '';

    const backdrop =
        ensureOwnerActionBackdrop();

    backdrop.classList.add('show');

    panel.classList.add('show');

    document.body.classList.add(
        'owner-action-open'
    );

    setTimeout(() => {
        const firstFocusable =
            panel.querySelector(
                'input, select, textarea, button'
            );

        if (firstFocusable) {
            firstFocusable.focus();
        }
    }, 80);
}

function closeOwnerActionPanel() {
    const panel =
        document.getElementById('ownerActionPanel');

    const backdrop =
        document.getElementById('ownerActionBackdrop');

    if (panel) {
        panel.classList.remove('show');
    }

    if (backdrop) {
        backdrop.classList.remove('show');
    }

    document.body.classList.remove(
        'owner-action-open'
    );

    if (
        ownerPreviousFocus &&
        typeof ownerPreviousFocus.focus === 'function' &&
        document.contains(ownerPreviousFocus)
    ) {
        setTimeout(() => {
            ownerPreviousFocus.focus();
        }, 50);
    }

    ownerPreviousFocus = null;
}

/* ================================================================
   SUPER ADMIN MENU
   ================================================================ */

function ensureSuperAdminFeatureMenu() {
    const menu =
        document.getElementById('superAdminMenu');

    if (!menu) {
        return;
    }

    if (
        !menu.querySelector(
            '[data-owner-menu-action="duplicate"]'
        )
    ) {
        const createButton =
            menu.querySelector(
                'button[onclick*="openCreateCafePanel"]'
            );

        const duplicateButton =
            document.createElement('button');

        duplicateButton.type = 'button';

        duplicateButton.dataset.ownerMenuAction =
            'duplicate';

        duplicateButton.className =
            'owner-menu-feature duplicate';

        duplicateButton.innerHTML = `
            <span class="owner-menu-feature-icon">
                ⧉
            </span>
            <span>
                <strong>Duplicate Café</strong>
                <small>Create an independent copy</small>
            </span>
        `;

        duplicateButton.addEventListener(
            'click',
            () => {
                openDuplicateCafePanel();
            }
        );

        if (createButton) {
            createButton.insertAdjacentElement(
                'afterend',
                duplicateButton
            );
        } else {
            menu.prepend(duplicateButton);
        }
    }

    if (
        !menu.querySelector(
            '[data-owner-menu-action="price"]'
        )
    ) {
        const duplicateButton =
            menu.querySelector(
                '[data-owner-menu-action="duplicate"]'
            );

        const priceButton =
            document.createElement('button');

        priceButton.type = 'button';

        priceButton.dataset.ownerMenuAction =
            'price';

        priceButton.className =
            'owner-menu-feature price';

        priceButton.innerHTML = `
            <span class="owner-menu-feature-icon">
                %
            </span>
            <span>
                <strong>Price Management</strong>
                <small>Adjust café menu prices</small>
            </span>
        `;

        priceButton.addEventListener(
            'click',
            () => {
                openPriceManagementPanel();
            }
        );

        if (duplicateButton) {
            duplicateButton.insertAdjacentElement(
                'afterend',
                priceButton
            );
        } else {
            menu.prepend(priceButton);
        }
    }
}

function toggleSuperAdminMenu(event) {
    if (event) {
        event.stopPropagation();
    }

    const menu =
        document.getElementById('superAdminMenu');

    const toggle =
        document.getElementById('superAdminMenuToggle');

    if (!menu) {
        return;
    }

    const isOpen =
        menu.classList.toggle('show');

    if (toggle) {
        toggle.setAttribute(
            'aria-expanded',
            String(isOpen)
        );

        toggle.classList.toggle(
            'is-open',
            isOpen
        );
    }
}

function closeSuperAdminMenu() {
    const menu =
        document.getElementById('superAdminMenu');

    const toggle =
        document.getElementById('superAdminMenuToggle');

    if (menu) {
        menu.classList.remove('show');
    }

    if (toggle) {
        toggle.setAttribute(
            'aria-expanded',
            'false'
        );

        toggle.classList.remove(
            'is-open'
        );
    }
}

/* ================================================================
   SEARCH
   ================================================================ */

function setupRestaurantSearch() {
    const input =
        document.getElementById('restaurantSearch');

    const clear =
        document.getElementById('restaurantSearchClear');

    if (!input) {
        return;
    }

    input.addEventListener('input', () => {
        renderOwnerRestaurantList();

        if (clear) {
            clear.classList.toggle(
                'visible',
                Boolean(input.value)
            );
        }
    });

    if (clear) {
        clear.addEventListener('click', () => {
            input.value = '';

            clear.classList.remove(
                'visible'
            );

            input.focus();

            renderOwnerRestaurantList();
        });
    }
}

/* ================================================================
   MENU EVENTS
   ================================================================ */

function setupSuperAdminMenuEvents() {
    const toggle =
        document.getElementById(
            'superAdminMenuToggle'
        );

    const menu =
        document.getElementById(
            'superAdminMenu'
        );

    if (toggle) {
        toggle.addEventListener(
            'click',
            event => {
                toggleSuperAdminMenu(event);
            }
        );
    }

    if (menu) {
        menu.addEventListener(
            'click',
            event => {
                event.stopPropagation();
            }
        );
    }

    document.addEventListener(
        'click',
        () => {
            closeSuperAdminMenu();
        }
    );
}

function setupActionPanelEvents() {
    document.addEventListener(
        'keydown',
        event => {
            if (event.key !== 'Escape') {
                return;
            }

            closeSuperAdminMenu();

            const panel =
                document.getElementById(
                    'ownerActionPanel'
                );

            if (
                panel &&
                panel.classList.contains('show')
            ) {
                closeOwnerActionPanel();
            }
        }
    );
}

/* ================================================================
   LOGOUT
   ================================================================ */

async function logoutAdmin() {
    closeSuperAdminMenu();

    try {
        const token =
            localStorage.getItem('adminToken');

        await fetch(
            '/api/admin/logout',
            {
                method: 'POST',
                headers: token
                    ? {
                        Authorization: `Bearer ${token}`
                    }
                    : {},
                credentials: 'same-origin'
            }
        );
    } catch (error) {
        console.warn(
            'Logout request failed:',
            error
        );
    }

    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminRestaurantId');
    localStorage.removeItem('adminRestaurantSlug');
    localStorage.removeItem('selectedRestaurantSlug');

    window.location.href =
        '/admin.html';
}

function goBackToAdminLogin() {
    window.location.href =
        '/admin.html';
}

/* ================================================================
   STARTUP
   ================================================================ */

document.addEventListener(
    'DOMContentLoaded',
    async () => {
        ensureSuperAdminFeatureMenu();

        setupRestaurantSearch();
        setupSuperAdminMenuEvents();
        setupActionPanelEvents();

        await checkSuperAdminAccess();
    }
);