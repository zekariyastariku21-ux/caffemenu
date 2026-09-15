let cart = [];
const STORAGE_KEY = 'simple-cart';
const LOCAL_ADMIN_EMAIL = 'admin@example.com';
const LOCAL_ADMIN_PASSWORD = 'admin123';
let currentCategory = 'all';
let searchTerm = '';
let isAdminLoggedIn = false;

const API_BASE = (location.port && location.port !== '3000') ? `${location.protocol}//${location.hostname}:3000` : '';

const CAFE_SLUG = localStorage.getItem('adminRestaurantSlug') || 'etete-coffee';



let foods = {
  breakfast: [{
    image: 'image/fouls.jpeg',
    ingridient: 'Freshly baked pita, rich beans, eggs, and a touch of spice.',
    name: 'SPECIAL FOUL',
    price: 750,
    id: 1
  },{
    image: 'image/qus.jpeg',
    ingridient: 'Honey glaze, soft tortilla, cheese, and fresh vegetables.',
    name: 'HONEY QUSSADILA',
    price: 150,
    id: 2
  }],
  lunch: [{
    image: 'image/wrap.jpeg',
    ingridient: 'Grilled chicken, lettuce, tomato, and creamy sauce wrapped in soft bread.',
    name: 'CHICKEN WRAP',
    price: 350,
    id: 1
  },{
    image: 'image/salad.jpeg',
    ingridient: 'Tender steak slices, greens, crunchy toppings, and creamy dressing.',
    name: 'CREAMY STEAK SALAD',
    price: 150,
    id: 2
  }],
  dessert: [{
    image: 'image/choc.jpeg',
    ingridient: 'Chocolate sponge, creamy frosting, and a rich cocoa finish.',
    name: 'CHOCOLATE SLICE CAKE',
    price: 250,
    id: 1
  },{
    image: 'image/caramel.jpeg',
    ingridient: 'Soft caramel layers, vanilla cream, and buttery cake.',
    name: 'CARAMEL CREAM CAKE',
    price: 230,
    id: 2
  }],
  hotdrinks: [{
    image: 'image/latte.jpeg',
    ingridient: 'Espresso, steamed milk, and a smooth creamy texture.',
    name: 'CAFFE LATTE',
    price: 450,
    id: 2
  },{
    image: 'image/macchiato.jpeg',
    ingridient: 'Bold espresso with a light layer of frothy milk.',
    name: 'MACCHIATO',
    price: 290,
    id: 2
  }],
  mocktail: [{
    image: 'image/classicmojito.jpeg',
    ingridient: 'Mint, lime, soda, and a refreshing citrus blend.',
    name: 'MOCKTAIL',
    price: 350,
    id: 2
  },{
    image: 'image/orgreat.jpeg',
    ingridient: 'Orange zest, mint, lime, and sparkling fruit flavor.',
    name: 'ORGREAT MOJITO',
    price: 450,
    id: 2
  }]
};

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
    console.warn('Could not load menu from server, using local menu.', err);
  }
}





function renderCategoryButtons() {

  const container = document.getElementById('categoryButtons');

  if (!container) return;

  container.innerHTML = '';

  const allBtn = document.createElement('button');

  allBtn.textContent = 'all item';

  if (currentCategory === 'all') allBtn.classList.add('active');

  allBtn.onclick = () => { showCatagories('all'); };

  container.appendChild(allBtn);

  const categoryOrder = [
    'breakfast',
    'lunch',
    'dessert',
    'hotdrinks',
    'mocktail',
    'tortas'
  ];

  categoryOrder.forEach(cat => {

    if (!foods[cat]) return;

    const btn = document.createElement('button');

    btn.textContent = cat;

    if (currentCategory === cat) btn.classList.add('active');

    btn.onclick = () => { showCatagories(cat); };

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function renderItems() {
  const Container = document.querySelector('.container');
  if (!Container) return;

  Container.innerHTML = '';

  const items = (currentCategory === 'all')
    ? Object.values(foods).flat()
    : (foods[currentCategory] || []);

  const filteredItems = items.filter(food => {
    const text = `${food.name} ${food.ingridient || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  if (!filteredItems.length) {
    Container.innerHTML = '<div class="empty-state">No items match your search.</div>';
    return;
  }

  filteredItems.forEach((food) => {
    const isAvailable = food.isAvailable !== false;

    Container.innerHTML += `
    <div class="foodd ${!isAvailable ? 'unavailable' : ''}">
      <div class="divimage">
        <img class="image" src="${food.image}" alt="${food.image}" onclick="zoomImage(this.src)">
      </div>
      <div class="divinfo">
        <p>${food.name}</p>
        <p class="ingredient">${food.ingridient}</p>
        <div class="info2">
          <p><strong>${food.price} ETB</strong></p>
          ${
            isAvailable 
              ? `<button type="button" class="addbutton" data-name="${food.name}">+add</button>`
              : `<button type="button" class="addbutton" disabled style="background:#ccc;cursor:not-allowed;">Unavailable</button>`
          }
        </div>
      </div>
    </div>
    `;
  });

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
  const containerEl = document.querySelector('.container');
  const prevScroll = containerEl ? containerEl.scrollTop : 0;
  const prevCategory = currentCategory;

  const food = Object.values(foods)
    .flat()
    .find(item => item.name === name);

  if (!food) return;

  const matchingItem = cart.find(item => item.name === food.name);

  if (matchingItem) {
    matchingItem.quantity += 1;
  } else {
    cart.push({ ...food, quantity: 1 });
  }
  saveCart();
  renderCart();

  showCatagories(prevCategory);
  if (containerEl) containerEl.scrollTop = prevScroll;
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

    const res = await fetch(API_BASE + `/api/admin/menu/${CAFE_SLUG}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu: menuToSave })
    });

    
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { throw new Error('Invalid server response: ' + text); }
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

async function loadOwnerCafes() {
  const container = document.getElementById('ownerCafeList');

  if (!container) return;

  container.innerHTML = 'Loading cafés...';

  try {
    const token = localStorage.getItem('adminToken');

    const response = await fetch(API_BASE + '/api/owner/restaurants', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load cafés.');
    }

    if (!data.restaurants || data.restaurants.length === 0) {
      container.innerHTML = '<p>No cafés found.</p>';
      return;
    }

    container.innerHTML = data.restaurants.map(cafe => `
      <div style="
        border:1px solid #ddd;
        padding:10px;
        margin:8px 0;
        border-radius:6px;
      ">
        <strong>${cafe.name}</strong><br>
        Slug: ${cafe.slug}<br>
        Status: ${cafe.status}
      </div>
    `).join('');

  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <p style="color:#a00;">
        ${error.message}
      </p>
    `;
  }
}

async function createOwnerCafe() {
  const nameInput = document.getElementById('newCafeName');
  const slugInput = document.getElementById('newCafeSlug');
  const message = document.getElementById('ownerDashboardMessage');

  const name = nameInput.value.trim();
  const slug = slugInput.value.trim().toLowerCase();

  if (!name || !slug) {
    message.style.color = '#a00';
    message.textContent = 'Please enter both café name and slug.';
    return;
  }

  try {
    const token = localStorage.getItem('adminToken');

    const response = await fetch(API_BASE + '/api/owner/restaurants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: name,
        slug: slug
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create café.');
    }

    message.style.color = 'green';
    message.textContent = `Café "${data.restaurant.name}" created successfully.`;

    nameInput.value = '';
    slugInput.value = '';

    await loadOwnerCafes();

  } catch (error) {
    console.error(error);

    message.style.color = '#a00';
    message.textContent = error.message;
  }
}
