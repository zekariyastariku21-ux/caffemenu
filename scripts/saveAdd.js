let cart = [];
const STORAGE_KEY = 'simple-cart';
const LOCAL_ADMIN_EMAIL = 'admin@example.com';
const LOCAL_ADMIN_PASSWORD = 'admin123';
let currentCategory = 'all';
let searchTerm = '';
let isAdminLoggedIn = false;
// If the page is served from a different port (eg. Live Server on 5506),
// point API requests to the node server on port 3000 so fetch calls reach it.
const API_BASE = (location.port && location.port !== '3000') ? `${location.protocol}//${location.hostname}:3000` : '';
let foods = {
  breakfast: [{
    image: 'image/foul.jpeg',
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

  async function loadMenuFromServer() {
    try {
      const res = await fetch(API_BASE + '/api/menu');
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { throw new Error('Invalid server response: ' + text); }
      if (!res.ok) throw new Error((data && data.message) || 'Failed to fetch menu');
      if (data && typeof data === 'object') {
        foods = data;
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

  // All Items Button
  const allBtn = document.createElement('button');
  allBtn.textContent = 'all item';
  if (currentCategory === 'all') allBtn.classList.add('active'); // Add active class
  allBtn.onclick = () => { showCatagories('all'); };
  container.appendChild(allBtn);

  // Dynamic Category Buttons
  Object.keys(foods).forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    if (currentCategory === cat) btn.classList.add('active'); // Add active class
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
    const isAvailable = food.isAvailable !== false; // true unless explicitly false

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
  console.debug('showCatagories called with', catagory);
  currentCategory = catagory;
  renderItems();
  renderCategoryButtons(); // Refresh buttons to update active state
}


async function loadCart() {
  cart = loadFromLocalStorage();
  renderCart();
  // No server calls: cart is device-local only (localStorage)
}

async function saveCart() {
  saveToLocalStorage();
  // Cart is saved to localStorage only for this device.
}

function addToCart(event, button) {
  console.debug('addToCart called', { currentCategory, buttonName: button && button.dataset && button.dataset.name });
  const name = button.dataset.name;

  // preserve current category and scroll position so UI doesn't jump
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

  // Re-show the previous category and restore scroll position to avoid UI jumping
  console.debug('showing previous category', prevCategory);
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

  const total = cart.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
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
    alert('Add an item to the cart before paying.');
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
  const message = document.getElementById('paymentMessage');
  const accountNumber = document.getElementById('telebirrAccount').value.trim();
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const submitButton = event.target.querySelector('.payment-submit');

  if (!/^0\d{9}$/.test(accountNumber)) {
    message.textContent = 'Enter a valid 10-digit Telebirr account number.';
    return;
  }

  submitButton.disabled = true;
  message.textContent = 'Preparing Telebirr...';

  try {
    const response = await fetch(API_BASE + '/api/payments/telebirr/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumber, amount: total, items: cart })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not create payment.');
    await copyPaymentDetails(`Telebirr: ${total} ETB to ${data.merchantAccount}`);
    message.textContent = '';
    submitButton.textContent = 'Payment details copied';
    submitButton.disabled = false;
  } catch (error) {
    message.textContent = error.message;
    submitButton.disabled = false;
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

cartButton.addEventListener('click', () => {
  container2.classList.toggle('open');
});


function zoomImage(src){

  const viewer = document.getElementById("imageViewer");
  const image = document.getElementById("bigImage");

  image.src = src;

  viewer.classList.add("show");
}



function closeImage(){

  const viewer = document.getElementById("imageViewer");

  viewer.classList.remove("show");
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
  const msg = document.getElementById('adminLoginMessage');
  msg.textContent = '';

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
    msg.textContent = 'Logged in as admin.';
    closeAdminLogin();
    openAdminPanel();
  } catch (err) {
    msg.textContent = 'Login error: ' + (err.message || err);
  }
}

function openAdminPanel() {
  if (!isAdminLoggedIn) return openAdminLogin();
  document.getElementById('adminPanelModal').classList.add('show');
  // populate category / item selects in the admin UI
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
  // Restore previous selection if still available
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
  } else {
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemPrice').value = '';
    document.getElementById('newItemImage').value = '';
    document.getElementById('newItemIngredient').value = '';
    document.getElementById('newItemAvailable').checked = true; // Default to available
  }
}








function populateSelectedItemFields() {
  const cat = (document.getElementById('newItemCategory')||{}).value;
  const itemIdx = (document.getElementById('existingItemSelect')||{}).value;
  if (!cat || itemIdx === '') return;
  const list = foods[cat] || [];
  const idx = Number(itemIdx);
  if (!Number.isInteger(idx) || !list[idx]) return;
  const it = list[idx];
  document.getElementById('newItemName').value = it.name || '';
  document.getElementById('newItemPrice').value = it.price || '';
  document.getElementById('newItemIngredient').value = it.ingridient || '';
  
  // Set checkbox state (defaults to true if property doesn't exist)
  document.getElementById('newItemAvailable').checked = it.isAvailable !== false;
  
  const imgInput = document.getElementById('newItemImage');
  if (imgInput && imgInput.type === 'file') {
    imgInput.value = '';
  }
}






function addCategoryFromUI() {
  const nameEl = document.getElementById('newCategoryName');
  const msg = document.getElementById('adminPanelMessage');
  const raw = nameEl && nameEl.value;
  const name = raw ? raw.trim() : '';
  if (!name) { msg.textContent = 'Provide a category name.'; return; }
  // Prevent case-insensitive duplicates
  const exists = Object.keys(foods).some(k => k.toLowerCase() === name.toLowerCase());
  if (exists) { msg.textContent = 'Category already exists.'; return; }
  foods[name] = [];
  updateAdminCategoryOptions();
  renderCategoryButtons();
  msg.textContent = 'Category added.';
}




function addItemFromUI() {
  const name = (document.getElementById('newItemName')||{}).value || '';
  const priceRaw = (document.getElementById('newItemPrice')||{}).value || '';
  const imageInput = document.getElementById('newItemImage');
  const ingredient = (document.getElementById('newItemIngredient')||{}).value || '';
  const category = (document.getElementById('newItemCategory')||{}).value;
  const isAvailable = document.getElementById('newItemAvailable').checked; // Read availability
  const msg = document.getElementById('adminPanelMessage');

  if (!name || !priceRaw || !category) { 
    msg.textContent = 'Fill name, price and category.'; 
    return; 
  }

  const price = Number(priceRaw);
  if (Number.isNaN(price)) { 
    msg.textContent = 'Price must be a number.'; 
    return; 
  }

  const file = imageInput && imageInput.files ? imageInput.files[0] : null;

  const saveItem = (imageData) => {
    const id = Date.now();
    if (!foods[category]) foods[category] = [];
    foods[category].push({ 
      name: name.trim(), 
      price, 
      image: imageData, 
      ingridient: ingredient.trim() || '', 
      isAvailable, // Save flag
      id 
    });

    renderItems();
    renderCategoryButtons();
    updateAdminCategoryOptions();
    refreshExistingItemsSelect();
    msg.textContent = 'Item added to ' + category + '.';
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
  const msg = document.getElementById('adminPanelMessage');
  
  if (!cat || itemIdx === '') { msg.textContent = 'Select category and item.'; return; }
  const list = foods[cat] || [];
  const idx = Number(itemIdx);
  if (!Number.isInteger(idx) || !list[idx]) { msg.textContent = 'Invalid item selected.'; return; }
  
  const it = list[idx];
  const name = (document.getElementById('newItemName')||{}).value;
  const priceRaw = (document.getElementById('newItemPrice')||{}).value;
  const imageInput = document.getElementById('newItemImage');
  const ingredient = (document.getElementById('newItemIngredient')||{}).value;
  const isAvailable = document.getElementById('newItemAvailable').checked;

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
    
    // Save updated flag
    it.isAvailable = isAvailable;

    renderItems();
    updateAdminCategoryOptions();
    renderCategoryButtons();
    refreshExistingItemsSelect();
    if (itemSel && Array.from(itemSel.options).some(o => o.value === String(idx))) {
      itemSel.value = String(idx);
      populateSelectedItemFields();
    }
    msg.textContent = 'Item updated.';
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
  const msg = document.getElementById('adminPanelMessage');
  
  if (!cat || itemIdx === '') { 
    msg.textContent = 'Select category and item.'; 
    return; 
  }
  
  const list = foods[cat] || [];
  const idx = Number(itemIdx);
  
  if (!Number.isInteger(idx) || !list[idx]) { 
    msg.textContent = 'Invalid item selected.'; 
    return; 
  }
  
  list.splice(idx, 1);
  renderItems();
  msg.textContent = 'Item deleted.';
  refreshExistingItemsSelect();
}



async function saveMenuToServer() {
  const msg = document.getElementById('adminPanelMessage');
  msg.textContent = '';
  try {
    // Strip empty categories before saving
    const menuToSave = {};
    Object.keys(foods).forEach(k => {
      if (Array.isArray(foods[k]) && foods[k].length > 0) {
        menuToSave[k] = foods[k];
      }
    });

    const res = await fetch(API_BASE + '/api/admin/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu: menuToSave })
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { throw new Error('Invalid server response: ' + text); }
    if (!res.ok) throw new Error((data && data.message) || `Server returned ${res.status}`);
    if (!data || !data.ok) throw new Error((data && data.message) || 'Save failed');

    // Remove empty categories locally as they are not saved
    Object.keys(foods).forEach(k => {
      if (!Array.isArray(foods[k]) || foods[k].length === 0) delete foods[k];
    });
    renderItems();
    renderCategoryButtons();
    updateAdminCategoryOptions();
    refreshExistingItemsSelect();
    msg.textContent = 'Menu saved successfully.';
  } catch (err) {
    msg.textContent = 'Save error: ' + (err.message || err);
  }
}

// Clean up: remove any remaining references to menu editor if present elsewhere
