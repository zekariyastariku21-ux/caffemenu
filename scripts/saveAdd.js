let cart = [];
const STORAGE_KEY = 'simple-cart';
const LOCAL_ADMIN_EMAIL = 'admin@example.com';
const LOCAL_ADMIN_PASSWORD = 'admin123';
let currentCategory = 'all';
let searchTerm = '';
let isAdminLoggedIn = false;

const API_BASE = (location.port && location.port !== '3000') ? `${location.protocol}//${location.hostname}:3000` : '';



const urlRestaurant = new URLSearchParams(window.location.search).get('restaurant');

// Support both:
// /save.html?restaurant=etete-coffee
// /etete-coffee
const pathSlug = window.location.pathname
  .split('/')
  .filter(Boolean)[0];

const CAFE_SLUG =
  urlRestaurant ||
  (pathSlug && pathSlug !== 'save.html' ? pathSlug : null) ||
  localStorage.getItem('selectedRestaurantSlug') ||
  localStorage.getItem('adminRestaurantSlug') ||
  'etete-coffee';



let foods = {};

/**
 * Centered Toast Notification System
 * @param {string} message - Text to display
 * @param {'success' | 'error' | 'loading'} type - Type of toast notification
 * @param {number} duration - Time in ms before auto-hiding (ignored if type === 'loading')
 */
function showToast(message, type = 'success', duration = 3000) {
  let toastContainer = document.getElementById('toast-container');

  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  // Clear existing toasts
  toastContainer.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;

  if (type === 'loading') {
    toast.innerHTML = `<span class="toast-spinner"></span><span>${message}</span>`;
  } else {
    toast.innerHTML = `<span>${message}</span>`;
  }

  toastContainer.appendChild(toast);

  if (type !== 'loading') {
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

function hideToast() {
  const toastContainer = document.getElementById('toast-container');
  if (toastContainer) toastContainer.innerHTML = '';
}

async function loadMenuFromServer() {
  try {
    const res = await fetch(API_BASE + `/api/menu/${CAFE_SLUG}`);

    const text = await res.text();

    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      throw new Error('Invalid server response: ' + text);
    }

    if (!res.ok) {
      throw new Error((data && data.message) || 'Failed to fetch menu');
    }


    if (data && data.menu && typeof data.menu === 'object') {
  foods = data.menu;

  console.log('Loaded menu for:', data.restaurant?.name);
  console.log('Menu:', foods);

  // Show restaurant name at the top of the page
  const cafeName = document.getElementById('cafeName');

  if (cafeName && data.restaurant?.name) {
    cafeName.textContent = data.restaurant.name;
  }

  renderItems();
  renderCategoryButtons();
}




  } catch (err) {
  console.error('Could not load menu from server:', err);

  foods = {};

  const cafeName = document.getElementById('cafeName');

  if (cafeName) {
    cafeName.textContent = err.message;
  }

  renderItems();
  renderCategoryButtons();
}
}





function renderCategoryButtons() {

  const container = document.getElementById('categoryButtons');
  if (!container) return;

  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.textContent = 'all item';

  if (currentCategory === 'all') allBtn.classList.add('active');

  allBtn.onclick = () => {
    showCatagories('all');
  };

  container.appendChild(allBtn);

  const categoryOrder = [
    'breakfast',
    'lunch',
    'dessert',
    'hotdrinks',
    'mocktail',
    'tortas'
  ];

  // Show ordered categories first
  categoryOrder.forEach(cat => {
    if (!foods[cat]) return;

    const btn = document.createElement('button');
    btn.textContent = cat;

    if (currentCategory === cat) btn.classList.add('active');

    btn.onclick = () => {
      showCatagories(cat);
    };

    container.appendChild(btn);
  });

  // Show any new categories not in categoryOrder
  Object.keys(foods).forEach(cat => {

    if (categoryOrder.includes(cat)) return;

    const btn = document.createElement('button');
    btn.textContent = cat;

    if (currentCategory === cat) btn.classList.add('active');

    btn.onclick = () => {
      showCatagories(cat);
    };

    container.appendChild(btn);
  });
}




function loadFromLocalStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Could not load cart from local storage:', error);
    return [];
  }
}


function saveToLocalStorage() {
  const smallCart = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    ingridient: item.ingridient || '',
    quantity: item.quantity
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(smallCart));
}



function renderItems() {
  const Container = document.querySelector('.container');
  if (!Container) return;

  const items = currentCategory === 'all'
    ? Object.values(foods).flat()
    : (foods[currentCategory] || []);

  const search = searchTerm.toLowerCase();

  const filteredItems = items.filter(food => {
    const text = `${food.name} ${food.ingridient || ''}`.toLowerCase();
    return text.includes(search);
  });

  if (!filteredItems.length) {
    Container.innerHTML =
      '<div class="empty-state">No items match your search.</div>';
    return;
  }

  // Build everything first, then update the DOM only once
  Container.innerHTML = filteredItems.map(food => {
    const isAvailable = food.isAvailable !== false;

    return `
      <div class="foodd ${!isAvailable ? 'unavailable' : ''}">
        <div class="divimage">
          <img
            class="image"
            src="${food.image}"
            alt="${food.name}"
            loading="lazy"
            onclick="zoomImage(this.src)"
          >
        </div>

        <div class="divinfo">
          <p>${food.name}</p>
          <p class="ingredient">${food.ingridient || ''}</p>

          <div class="info2">
            <p><strong>${food.price} ETB</strong></p>

            ${
              isAvailable
                ? `<button
                    type="button"
                    class="addbutton"
                    data-name="${food.name}"
                  >+add</button>`
                : `<button
                    type="button"
                    class="addbutton"
                    disabled
                    style="background:#ccc;cursor:not-allowed;"
                  >Unavailable</button>`
            }
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach click handlers
  Container.querySelectorAll('.addbutton:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addToCart(e, btn);
    });
  });
}




function showCatagories(catagory) {
  currentCategory = catagory;
  renderItems();
  renderCategoryButtons();
}

async function loadCart() {
  cart = loadFromLocalStorage();
  renderCart();
}

async function saveCart() {
  saveToLocalStorage();
}


function addToCart(event, button) {
  const name = button.dataset.name;

  const food = Object.values(foods)
    .flat()
    .find(item => item.name === name);

  if (!food) return;

  const matchingItem = cart.find(item => item.name === food.name);

  if (matchingItem) {
    matchingItem.quantity += 1;
  } else {
    cart.push({
      id: food.id,
      name: food.name,
      price: food.price,
      ingridient: food.ingridient || '',
      quantity: 1
    });
  }

  // Save cart
  saveCart();

  // Update cart display only
  renderCart();

  // Small visual feedback
  const originalText = button.textContent;
  button.textContent = '✓ Added';
  button.disabled = true;

  setTimeout(() => {
    button.textContent = originalText;
    button.disabled = false;
  }, 250);
}




function renderCart() {
  const cartBody = document.getElementById('cart-body');
  if (!cartBody) return;

  if (!cart.length) {
    cartBody.innerHTML = `
      <tr>
        <td colspan="3">Your cart is empty</td>
      </tr>
    `;
  } else {
    cartBody.innerHTML = cart.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.price * item.quantity}</td>
        <td>
          <div class="qty-controls">
            <button class="minus" onclick="decreaseQuantity('${item.name}')">−</button>
            ${item.quantity}
            <button class="plus" onclick="increaseQuantity('${item.name}')">+</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('total-price').textContent = total + ' ETB';
}

function increaseQuantity(name) {
  const item = cart.find(item => item.name === name);
  if (item) {
    item.quantity++;
  }
  saveCart();
  renderCart();
}

function decreaseQuantity(name) {
  const item = cart.find(item => item.name === name);
  if (!item) return;

  item.quantity--;
  if (item.quantity <= 0) {
    cart = cart.filter(item => item.name !== name);
  }
  saveCart();
  renderCart();
}

function openPaymentModal() {
  const paymentModal = document.getElementById('paymentModal');
  const paymentTotal = document.getElementById('payment-total');
  const paymentMessage = document.getElementById('paymentMessage');
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (!total) {
    showToast('Add an item to the cart before paying.', 'error');
    return;
  }

  paymentTotal.textContent = `${total} ETB`;
  paymentMessage.textContent = '';
  paymentModal.classList.add('show');
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('show');
}

function setupPayment() {
  const paymentButton = document.querySelector('.payment');
  const paymentModal = document.getElementById('paymentModal');
  const paymentForm = document.getElementById('telebirrPaymentForm');

  if (!paymentButton || !paymentModal || !paymentForm) return;

  paymentButton.addEventListener('click', openPaymentModal);
  paymentModal.addEventListener('click', event => {
    if (event.target === paymentModal) closePaymentModal();
  });

  paymentModal.querySelectorAll('.payment-option').forEach(option => {
    option.addEventListener('click', () => {
      paymentModal.querySelectorAll('.payment-option').forEach(item => item.classList.remove('selected'));
      option.classList.add('selected');
      paymentForm.hidden = option.dataset.method !== 'Telebirr';
      document.getElementById('paymentMessage').textContent = option.dataset.method === 'BOA'
        ? 'BOA payment is not configured yet.'
        : '';
    });
  });

  paymentForm.addEventListener('submit', startTelebirrPayment);
}

async function startTelebirrPayment(event) {
  event.preventDefault();
  const accountNumber = document.getElementById('telebirrAccount').value.trim();
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const submitButton = event.target.querySelector('.payment-submit');

  if (!/^0\d{9}$/.test(accountNumber)) {
    showToast('Enter a valid 10-digit Telebirr account number.', 'error');
    return;
  }

  submitButton.disabled = true;
  showToast('Preparing Telebirr payment...', 'loading');

  try {
    const response = await fetch(API_BASE + '/api/payments/telebirr/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumber, amount: total, items: cart })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not create payment.');
    await copyPaymentDetails(`Telebirr: ${total} ETB to ${data.merchantAccount}`);
    submitButton.textContent = 'Payment details copied';
    submitButton.disabled = false;
    showToast('Payment details copied successfully!', 'success');
  } catch (error) {
    submitButton.disabled = false;
    showToast(error.message || 'Payment creation failed.', 'error');
  }
}

async function copyPaymentDetails(details) {
  try {
    await navigator.clipboard.writeText(details);
  } catch (error) {
    console.warn('Could not copy payment details:', error);
  }
}

const cartButton = document.querySelector('.cartbutton');
const container2 = document.querySelector('.container2');

if (cartButton && container2) {
  cartButton.addEventListener('click', () => {
    container2.classList.toggle('open');
  });
}

function zoomImage(src){
  const viewer = document.getElementById("imageViewer");
  const image = document.getElementById("bigImage");
  if (viewer && image) {
    image.src = src;
    viewer.classList.add("show");
  }
}

function closeImage(){
  const viewer = document.getElementById("imageViewer");
  if (viewer) viewer.classList.remove("show");
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      searchTerm = event.target.value;
      renderItems();
    });
  }
}



window.onload = async function() {

  setupSearch();
  setupPayment();

  await loadMenuFromServer();

  renderItems();
  renderCategoryButtons();

  loadCart();

  // Restore admin login after refresh
  await restoreAdminSession();
};




// Admin UI functions
function openAdminLogin() {
  document.getElementById('adminLoginModal').classList.add('show');
}

function closeAdminLogin() {
  document.getElementById('adminLoginModal').classList.remove('show');
}

function closeAdminPanel() {
  document.getElementById('adminPanelModal').classList.remove('show');
}

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

      <label>Restaurant Name</label>

      <input
        id="newCafeName"
        type="text"
        placeholder="Example: Zekariyas Coffee"
        autocomplete="off"
      >

      <label>Restaurant Slug</label>

      <input
        id="newCafeSlug"
        type="text"
        placeholder="Example: zekariyas-coffee"
        autocomplete="off"
      >

      <div style="
        margin-top:5px;
        font-size:12px;
        color:#777;
      ">
        The slug is used in the restaurant's public URL.
      </div>

      <label>Admin Email</label>

      <input
        id="newCafeAdminEmail"
        type="email"
        placeholder="admin@example.com"
        autocomplete="off"
      >

      <label>Admin Password</label>

      <input
        id="newCafeAdminPassword"
        type="password"
        placeholder="Create admin password"
        autocomplete="new-password"
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


async function submitCreateOwnerCafe() {

  const nameInput =
    document.getElementById('newCafeName');

  const slugInput =
    document.getElementById('newCafeSlug');

  const emailInput =
    document.getElementById('newCafeAdminEmail');

  const passwordInput =
    document.getElementById('newCafeAdminPassword');

  if (
    !nameInput ||
    !slugInput ||
    !emailInput ||
    !passwordInput
  ) {
    return;
  }

  const name = nameInput.value.trim();

  const slug =
    slugInput.value.trim().toLowerCase();

  const adminEmail =
    emailInput.value.trim().toLowerCase();

  const adminPassword =
    passwordInput.value.trim();


  if (!name || !slug || !adminEmail || !adminPassword) {

    showOwnerNotification(
      'Please complete all café and administrator fields.',
      'warning',
      'Missing Information'
    );

    return;
  }


  try {

    const token =
      localStorage.getItem('adminToken');

    const response = await fetch(
      API_BASE + '/api/owner/restaurants',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },

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

    console.error(error);

    showOwnerNotification(
      error.message,
      'error',
      'Creation Failed'
    );

  }
}


async function restoreAdminSession() {

  const token = localStorage.getItem('adminToken');
  const role = localStorage.getItem('adminRole');

  // No saved login
  if (!token || !role) {
    return;
  }

  console.log('Admin session restored:', role);

  // Keep the login/session information,
  // but DO NOT automatically open the admin window.

  isAdminLoggedIn = true;

  return;
}



async function adminLogin() {
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;

  showToast('Logging in...', 'loading');

  try {
    const res = await fetch(API_BASE + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { throw new Error('Invalid server response: ' + text); }
    if (!res.ok) throw new Error((data && data.message) || `Server returned ${res.status}`);
    if (!data || !data.ok) throw new Error((data && data.message) || 'Login failed');
    isAdminLoggedIn = true;

    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminRole', data.role);
    localStorage.setItem('adminRestaurantId', data.restaurant_id || '');
    localStorage.setItem('adminRestaurantSlug', data.restaurant_slug || '');
    closeAdminLogin();


    if (data.role === 'super_admin') {
      openOwnerDashboard();
    } else {
      openAdminPanel();
    }


    showToast('Logged in successfully!', 'success');
  } catch (err) {
    showToast('Login error: ' + (err.message || err), 'error');
  }
}

function openAdminPanel() {
  if (!isAdminLoggedIn) return openAdminLogin();
  document.getElementById('adminPanelModal').classList.add('show');
  updateAdminCategoryOptions();
  refreshExistingItemsSelect();
}

function updateAdminCategoryOptions() {
  const sel = document.getElementById('newItemCategory');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  Object.keys(foods).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
  if (prev && Array.from(sel.options).some(o => o.value === prev)) {
    sel.value = prev;
  }
}

function refreshExistingItemsSelect() {
  const catSel = document.getElementById('newItemCategory');
  const itemSel = document.getElementById('existingItemSelect');
  if (!catSel || !itemSel) return;
  const cat = catSel.value || Object.keys(foods)[0];
  const prevItem = itemSel.value;
  itemSel.innerHTML = '<option value="">-- select item --</option>';
  const list = foods[cat] || [];
  list.forEach((it, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${it.name} — ${it.price} ${it.isAvailable === false ? '(Unavailable)' : ''}`;
    itemSel.appendChild(opt);
  });

  if (prevItem !== undefined && prevItem !== null && prevItem !== '' && Array.from(itemSel.options).some(o => o.value === prevItem)) {
    itemSel.value = prevItem;
  }
}

function populateSelectedItemFields() {
  const cat = (document.getElementById('newItemCategory')||{}).value;
  const itemIdx = (document.getElementById('existingItemSelect')||{}).value;
  if (!cat || itemIdx === '') {
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemPrice').value = '';
    document.getElementById('newItemIngredient').value = '';
    document.getElementById('newItemAvailable').checked = true;
    return;
  }
  const list = foods[cat] || [];
  const idx = Number(itemIdx);
  if (!Number.isInteger(idx) || !list[idx]) return;
  const it = list[idx];
  document.getElementById('newItemName').value = it.name || '';
  document.getElementById('newItemPrice').value = it.price || '';
  document.getElementById('newItemIngredient').value = it.ingridient || '';

  document.getElementById('newItemAvailable').checked = it.isAvailable !== false;

  const imgInput = document.getElementById('newItemImage');
  if (imgInput && imgInput.type === 'file') {
    imgInput.value = '';
  }
}

function addCategoryFromUI() {
  const nameEl = document.getElementById('newCategoryName');
  const raw = nameEl && nameEl.value;
  const name = raw ? raw.trim() : '';
  if (!name) {
    showToast('Please provide a category name.', 'error');
    return;
  }
  const exists = Object.keys(foods).some(k => k.toLowerCase() === name.toLowerCase());
  if (exists) {
    showToast('Category already exists.', 'error');
    return;
  }
  foods[name] = [];
  updateAdminCategoryOptions();
  renderCategoryButtons();
  showToast(`Category "${name}" added successfully!`, 'success');
}

function addItemFromUI() {
  const name = (document.getElementById('newItemName')||{}).value || '';
  const priceRaw = (document.getElementById('newItemPrice')||{}).value || '';
  const imageInput = document.getElementById('newItemImage');
  const ingredient = (document.getElementById('newItemIngredient')||{}).value || '';
  const category = (document.getElementById('newItemCategory')||{}).value;
  const isAvailable = document.getElementById('newItemAvailable').checked;

  if (!name || !priceRaw || !category) {
    showToast('Please fill in name, price, and category.', 'error');
    return;
  }

  const price = Number(priceRaw);
  if (Number.isNaN(price)) {
    showToast('Price must be a valid number.', 'error');
    return;
  }

  const file = imageInput && imageInput.files ? imageInput.files[0] : null;

  showToast('Adding item...', 'loading');

  const saveItem = (imageData) => {
    const id = Date.now();
    if (!foods[category]) foods[category] = [];
    foods[category].push({
      name: name.trim(),
      price,
      image: imageData,
      ingridient: ingredient.trim() || '',
      isAvailable,
      id
    });

    renderItems();
    renderCategoryButtons();
    updateAdminCategoryOptions();
    refreshExistingItemsSelect();
    showToast(`"${name.trim()}" added to ${category}!`, 'success');
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => saveItem(e.target.result);
    reader.readAsDataURL(file);
  } else {
    saveItem('');
  }
}

function updateSelectedItem() {
  const cat = (document.getElementById('newItemCategory')||{}).value;
  const itemSel = document.getElementById('existingItemSelect');
  const itemIdx = itemSel ? itemSel.value : '';

  if (!cat || itemIdx === '') {
    showToast('Please select a category and an item to update.', 'error');
    return;
  }
  const list = foods[cat] || [];
  const idx = Number(itemIdx);
  if (!Number.isInteger(idx) || !list[idx]) {
    showToast('Invalid item selected.', 'error');
    return;
  }

  const it = list[idx];
  const name = (document.getElementById('newItemName')||{}).value;
  const priceRaw = (document.getElementById('newItemPrice')||{}).value;
  const imageInput = document.getElementById('newItemImage');
  const ingredient = (document.getElementById('newItemIngredient')||{}).value;

  showToast('Updating item...', 'loading');

  const saveUpdates = (imageData) => {
    if (name !== undefined && name !== null && name.trim() !== '') it.name = name.trim();
    if (priceRaw !== undefined && priceRaw !== null && priceRaw !== '') {
      const p = Number(priceRaw);
      if (!Number.isNaN(p)) it.price = p;
    }

    if (imageData !== null) {
      it.image = imageData;
    }

    if (ingredient !== undefined && ingredient !== null) it.ingridient = ingredient.trim();

    it.isAvailable = document.getElementById('newItemAvailable').checked;

    renderItems();
    updateAdminCategoryOptions();
    renderCategoryButtons();
    refreshExistingItemsSelect();

    if (itemSel && Array.from(itemSel.options).some(o => o.value === String(idx))) {
      itemSel.value = String(idx);
      populateSelectedItemFields();
    }
    showToast(`Item "${it.name}" updated successfully!`, 'success');
  };

  const file = imageInput && imageInput.files ? imageInput.files[0] : null;
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => saveUpdates(e.target.result);
    reader.readAsDataURL(file);
  } else {
    saveUpdates(null);
  }
}

function deleteSelectedItem() {
  const cat = (document.getElementById('newItemCategory')||{}).value;
  const itemIdx = (document.getElementById('existingItemSelect')||{}).value;

  if (!cat || itemIdx === '') {
    showToast('Please select a category and an item to delete.', 'error');
    return;
  }

  const list = foods[cat] || [];
  const idx = Number(itemIdx);

  if (!Number.isInteger(idx) || !list[idx]) {
    showToast('Invalid item selected.', 'error');
    return;
  }

  const deletedName = list[idx].name;
  list.splice(idx, 1);
  renderItems();
  refreshExistingItemsSelect();
  populateSelectedItemFields();
  showToast(`Item "${deletedName}" deleted.`, 'success');
}

async function saveMenuToServer() {
  showToast('Saving menu to server...', 'loading');

  try {
    const menuToSave = {};

    Object.keys(foods).forEach(k => {
      if (Array.isArray(foods[k]) && foods[k].length > 0) {
        menuToSave[k] = foods[k];
      }
    });

    const token = localStorage.getItem('adminToken');

    const res = await fetch(API_BASE + `/api/admin/menu/${CAFE_SLUG}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ menu: menuToSave })
    });

    const text = await res.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      throw new Error('Invalid server response: ' + text);
    }

    if (!res.ok) throw new Error((data && data.message) || `Server returned ${res.status}`);
    if (!data || !data.ok) throw new Error((data && data.message) || 'Save failed');

    Object.keys(foods).forEach(k => {
      if (!Array.isArray(foods[k]) || foods[k].length === 0) delete foods[k];
    });

    renderItems();
    renderCategoryButtons();
    updateAdminCategoryOptions();
    refreshExistingItemsSelect();

    showToast('Menu saved successfully to server!', 'success');

  } catch (err) {
    showToast('Save error: ' + (err.message || err), 'error');
  }
}



function openOwnerDashboard() {
  const modal = document.getElementById('ownerDashboardModal');

  if (modal) {
    modal.style.display = 'flex';
    loadOwnerCafes();
  }
}

function closeOwnerDashboard() {
  const modal = document.getElementById('ownerDashboardModal');

  if (modal) {
    modal.style.display = 'none';
  }
}
let ownerRestaurantFilter = 'all';
let ownerRestaurantsData = [];


function filterOwnerRestaurants(filter) {

  ownerRestaurantFilter = filter;

  renderOwnerRestaurantList();

  // Highlight selected filter
  document
    .querySelectorAll('.stat-filter')
    .forEach(button => {
      button.classList.remove('selected');
    });

  const buttons = document.querySelectorAll('.stat-filter');

  if (filter === 'all' && buttons[0]) {
    buttons[0].classList.add('selected');
  }

  if (filter === 'active' && buttons[1]) {
    buttons[1].classList.add('selected');
  }

  if (filter === 'disabled' && buttons[2]) {
    buttons[2].classList.add('selected');
  }
}


function renderOwnerRestaurantList() {

  const container =
    document.getElementById('ownerCafeList');

  if (!container) return;

  let restaurants = ownerRestaurantsData;

  if (ownerRestaurantFilter === 'active') {

    restaurants = ownerRestaurantsData.filter(
      cafe => cafe.status === 'active'
    );

  } else if (ownerRestaurantFilter === 'disabled') {

    restaurants = ownerRestaurantsData.filter(
      cafe => cafe.status === 'disabled'
    );
  }

  if (restaurants.length === 0) {

    const message =
      ownerRestaurantFilter === 'active'
        ? 'No active restaurants found.'
        : ownerRestaurantFilter === 'disabled'
          ? 'No disabled restaurants found.'
          : 'No restaurants found.';

    container.innerHTML = `
      <div class="owner-empty-state">
        ${message}
      </div>
    `;

    return;
  }

  container.innerHTML = restaurants.map(cafe => `
    <div class="owner-cafe-card">

      <div class="owner-cafe-info">

        <div class="owner-cafe-name">
          ${cafe.name}
        </div>

        <div class="owner-cafe-details">
          Slug: ${cafe.slug}
        </div>

        <div class="owner-cafe-status ${cafe.status}">
          ${cafe.status}
        </div>

      </div>

      <div class="owner-cafe-actions">

        <button
          onclick="manageOwnerCafeMenu('${cafe.slug}')"
        >
          Manage Menu
        </button>

        <button
          onclick="editOwnerCafe(
            ${cafe.id},
            '${cafe.name}',
            '${cafe.slug}'
          )"
        >
          Edit Restaurant
        </button>

        <button
          onclick="editOwnerCafeAdmin(
            ${cafe.id},
            '${cafe.name}'
          )"
        >
          Admin Account
        </button>

        <button
          onclick="toggleOwnerCafeStatus(
            ${cafe.id},
            '${cafe.name}',
            '${cafe.status}'
          )"
        >
          ${cafe.status === 'active'
            ? 'Disable'
            : 'Enable'}
        </button>

        <button
          onclick="deleteOwnerCafe(
            ${cafe.id},
            '${cafe.name}'
          )"
          class="owner-delete-button"
        >
          Delete
        </button>

      </div>

    </div>
  `).join('');
}


async function loadOwnerCafes() {
  const container = document.getElementById('ownerCafeList');

  if (!container) return;

  container.innerHTML = 'Loading cafés...';

  try {
    const token = localStorage.getItem('adminToken');

    const response = await fetch(
      API_BASE + '/api/owner/restaurants',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to load cafés.'
      );
    }

    // Store restaurants for filtering
    ownerRestaurantsData = data.restaurants || [];

    // ================================
    // UPDATE RESTAURANT STATISTICS
    // ================================

    const restaurants = ownerRestaurantsData;

    const totalRestaurants = restaurants.length;

    const activeRestaurants = restaurants.filter(
      cafe => cafe.status === 'active'
    ).length;

    const disabledRestaurants = restaurants.filter(
      cafe => cafe.status === 'disabled'
    ).length;

    const totalEl =
      document.getElementById('totalRestaurants');

    const activeEl =
      document.getElementById('activeRestaurants');

    const disabledEl =
      document.getElementById('disabledRestaurants');

    if (totalEl) {
      totalEl.textContent = totalRestaurants;
    }

    if (activeEl) {
      activeEl.textContent = activeRestaurants;
    }

    if (disabledEl) {
      disabledEl.textContent = disabledRestaurants;
    }

    // ================================
    // DISPLAY RESTAURANTS
    // ================================

    renderOwnerRestaurantList();

  } catch (error) {

    console.error(error);

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
          ${error.message}
        </div>
      </div>
    `;
  }
}


async function refreshOwnerDashboard() {
  const button = document.getElementById('ownerRefreshBtn');

  if (button) {
    button.textContent = '↻ Refreshing...';
    button.disabled = true;
  }

  try {
    await loadOwnerCafes();

    if (button) {
      button.textContent = '↻ Refresh';
      button.disabled = false;
    }

  } catch (error) {
    console.error('Owner refresh error:', error);

    if (button) {
      button.textContent = '↻ Refresh';
      button.disabled = false;
    }
  }
}


function editOwnerCafeAdmin(id, cafeName) {

  openOwnerActionPanel(
    'Admin Account',
    `
      <div style="margin-bottom:14px;color:#666;font-size:14px;">
        Update the administrator account for
        <strong>${cafeName}</strong>.
      </div>

      <label>Admin Email</label>

      <input
        id="ownerAdminEmail"
        type="email"
        placeholder="admin@example.com"
      >

      <label>New Password</label>

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
          onclick="saveOwnerCafeAdmin(${id})"
        >
          Update Account
        </button>

      </div>
    `
  );
}


async function saveOwnerCafeAdmin(id) {

  const emailInput =
    document.getElementById('ownerAdminEmail');

  const passwordInput =
    document.getElementById('ownerAdminPassword');

  if (!emailInput || !passwordInput) {
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();

  if (!email || !password) {

    showOwnerNotification(
      'Admin email and password are required.',
      'warning',
      'Missing Information'
    );

    return;
  }

  try {

    const token = localStorage.getItem('adminToken');

    const response = await fetch(
      API_BASE + `/api/owner/restaurants/${id}/admin`,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },

        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to update admin account.'
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

    console.error(error);

    showOwnerNotification(
      error.message,
      'error',
      'Update Failed'
    );
  }
}




function editOwnerCafe(id, currentName, currentSlug) {

  openOwnerActionPanel(
    'Edit Restaurant',
    `
      <div style="margin-bottom:14px;color:#666;font-size:14px;">
        Update the restaurant name and public URL slug.
      </div>

      <label>Restaurant Name</label>

      <input
        id="ownerEditName"
        type="text"
        value="${currentName}"
        placeholder="Restaurant name"
      >

      <label>Restaurant Slug</label>

      <input
        id="ownerEditSlug"
        type="text"
        value="${currentSlug}"
        placeholder="restaurant-slug"
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
          onclick="saveOwnerCafeEdit(${id})"
        >
          Save Changes
        </button>

      </div>
    `
  );
}


async function saveOwnerCafeEdit(id) {

  const nameInput = document.getElementById('ownerEditName');
  const slugInput = document.getElementById('ownerEditSlug');

  if (!nameInput || !slugInput) {
    return;
  }

  const name = nameInput.value.trim();
  const slug = slugInput.value.trim().toLowerCase();

  if (!name || !slug) {

    showOwnerNotification(
      'Restaurant name and slug are required.',
      'warning',
      'Missing Information'
    );

    return;
  }

  try {

    const token = localStorage.getItem('adminToken');

    const response = await fetch(
      API_BASE + `/api/owner/restaurants/${id}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },

        body: JSON.stringify({
          name: name,
          slug: slug
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to update restaurant.'
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

    console.error(error);

    showOwnerNotification(
      error.message,
      'error',
      'Update Failed'
    );
  }
}


function toggleOwnerCafeStatus(
  id,
  cafeName,
  currentStatus
) {

  const isActive = currentStatus === 'active';

  const action = isActive
    ? 'Disable Restaurant'
    : 'Enable Restaurant';

  const description = isActive
    ? `
      Disabling <strong>${cafeName}</strong> will temporarily
      hide its public menu.
    `
    : `
      Enabling <strong>${cafeName}</strong> will make its
      public menu available again.
    `;

  const buttonText = isActive
    ? 'Disable Restaurant'
    : 'Enable Restaurant';

  const buttonClass = isActive
    ? 'owner-danger-btn'
    : 'owner-primary-btn';

  openOwnerActionPanel(
    action,
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
        ${cafeName}
      </div>

      <div class="owner-action-buttons">

        <button
          class="owner-secondary-btn"
          onclick="closeOwnerActionPanel()"
        >
          Cancel
        </button>

        <button
          class="${buttonClass}"
          onclick="saveOwnerCafeStatus(${id}, '${isActive ? 'disabled' : 'active'}')"
        >
          ${buttonText}
        </button>

      </div>
    `
  );
}


async function saveOwnerCafeStatus(id, status) {

  try {

    const token = localStorage.getItem('adminToken');

    const response = await fetch(
      API_BASE + `/api/owner/restaurants/${id}/status`,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },

        body: JSON.stringify({
          status
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to update restaurant status.'
      );
    }

    closeOwnerActionPanel();

    showOwnerNotification(
      data.message ||
        (status === 'active'
          ? 'Restaurant enabled successfully.'
          : 'Restaurant disabled successfully.'),
      'success',
      status === 'active'
        ? 'Restaurant Enabled'
        : 'Restaurant Disabled'
    );

    await loadOwnerCafes();

  } catch (error) {

    console.error(error);

    showOwnerNotification(
      error.message,
      'error',
      'Status Update Failed'
    );
  }
}



function deleteOwnerCafe(id, cafeName) {

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
          ${cafeName}
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
          onclick="confirmDeleteOwnerCafe(${id})"
        >
          Permanently Delete
        </button>

      </div>
    `
  );
}


async function confirmDeleteOwnerCafe(id) {

  const input =
    document.getElementById(
      'deleteRestaurantConfirmation'
    );

  if (!input) {
    return;
  }

  if (input.value.trim().toUpperCase() !== 'DELETE') {

    showOwnerNotification(
      'Please type DELETE to confirm permanent deletion.',
      'warning',
      'Confirmation Required'
    );

    input.focus();

    return;
  }

  try {

    const token = localStorage.getItem('adminToken');

    const response = await fetch(
      API_BASE + `/api/owner/restaurants/${id}`,
      {
        method: 'DELETE',

        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to delete restaurant.'
      );
    }

    closeOwnerActionPanel();

    showOwnerNotification(
      data.message || 'Restaurant deleted successfully.',
      'success',
      'Restaurant Deleted'
    );

    await loadOwnerCafes();

  } catch (error) {

    console.error(error);

    showOwnerNotification(
      error.message,
      'error',
      'Delete Failed'
    );
  }
}









function manageOwnerCafeMenu(slug) {
  localStorage.setItem('selectedRestaurantSlug', slug);

  window.location.href = '/save.html?restaurant=' + encodeURIComponent(slug);
}


/* =========================================================
   SUPER ADMIN PROFESSIONAL NOTIFICATIONS
   ========================================================= */

let ownerNotificationTimer = null;


function showOwnerNotification(
  message,
  type = 'success',
  title = ''
) {
  const box = document.getElementById('ownerTopNotification');
  const icon = document.getElementById('ownerNotificationIcon');
  const titleEl = document.getElementById('ownerNotificationTitle');
  const messageEl = document.getElementById('ownerNotificationMessage');

  if (!box || !messageEl) return;

  clearTimeout(ownerNotificationTimer);

  box.className = 'owner-top-notification show ' + type;

  const settings = {
    success: {
      icon: '✓',
      title: title || 'Success'
    },
    error: {
      icon: '✕',
      title: title || 'Something went wrong'
    },
    warning: {
      icon: '⚠',
      title: title || 'Warning'
    },
    info: {
      icon: 'ⓘ',
      title: title || 'Information'
    }
  };

  const setting = settings[type] || settings.info;

  icon.textContent = setting.icon;
  titleEl.textContent = setting.title;
  messageEl.textContent = message;

  ownerNotificationTimer = setTimeout(() => {
    closeOwnerNotification();
  }, 5000);
}


function closeOwnerNotification() {
  const box = document.getElementById('ownerTopNotification');

  if (!box) return;

  box.classList.remove('show');
}


function openOwnerActionPanel(title, html) {
  const panel = document.getElementById('ownerActionPanel');
  const titleEl = document.getElementById('ownerActionTitle');
  const content = document.getElementById('ownerActionContent');

  if (!panel || !content) return;

  titleEl.textContent = title;
  content.innerHTML = html;

  panel.classList.add('show');
}


function closeOwnerActionPanel() {
  const panel = document.getElementById('ownerActionPanel');

  if (!panel) return;

  panel.classList.remove('show');

  const content = document.getElementById('ownerActionContent');

  if (content) {
    content.innerHTML = '';
  }
}

async function refreshAdminMenu() {
  const button = document.getElementById('adminRefreshBtn');

  if (button) {
    button.textContent = '↻ Refreshing...';
    button.disabled = true;
  }

  try {
    await loadMenuFromServer();

    // Menu finished loading, so immediately restore the button
    if (button) {
      button.textContent = '↻ Refresh';
      button.disabled = false;
    }

    updateAdminCategoryOptions();
    refreshExistingItemsSelect();

    showToast('Menu refreshed', 'success');

  } catch (error) {
    console.error('Refresh error:', error);

    if (button) {
      button.textContent = '↻ Refresh';
      button.disabled = false;
    }

    showToast(
      'Refresh failed: ' + (error.message || error),
      'error'
    );
  }
}