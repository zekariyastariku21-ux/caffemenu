let cart = [];

const STORAGE_KEY = 'simple-cart';

let currentCategory = 'all';
let searchTerm = '';

const API_BASE =
  (location.port && location.port !== '3000')
    ? `${location.protocol}//${location.hostname}:3000`
    : '';

/*
|--------------------------------------------------------------------------
| RESTAURANT SLUG
|--------------------------------------------------------------------------
|
| Customer URL example:
| /etete-coffee
|
|--------------------------------------------------------------------------
*/

const pathSlug =
  window.location.pathname
    .split('/')
    .filter(Boolean)[0];

const CAFE_SLUG =
  (pathSlug && pathSlug !== 'save.html'
    ? pathSlug
    : null) ||
  localStorage.getItem('selectedRestaurantSlug') ||
  'etete-coffee';


let foods = {};


/*
|--------------------------------------------------------------------------
| TOAST NOTIFICATIONS
|--------------------------------------------------------------------------
*/

function showToast(
  message,
  type = 'success',
  duration = 3000
) {

  let toastContainer =
    document.getElementById(
      'toast-container'
    );

  if (!toastContainer) {

    toastContainer =
      document.createElement('div');

    toastContainer.id =
      'toast-container';

    document.body.appendChild(
      toastContainer
    );

  }

  toastContainer.innerHTML = '';


  const toast =
    document.createElement('div');

  toast.className =
    `toast-message toast-${type}`;


  if (type === 'loading') {

    toast.innerHTML =
      `<span class="toast-spinner"></span>
       <span>${message}</span>`;

  } else {

    toast.innerHTML =
      `<span>${message}</span>`;

  }


  toastContainer.appendChild(
    toast
  );


  if (type !== 'loading') {

    setTimeout(() => {

      toast.classList.add(
        'toast-hide'
      );

      setTimeout(
        () => toast.remove(),
        300
      );

    }, duration);

  }

}


function hideToast() {

  const toastContainer =
    document.getElementById(
      'toast-container'
    );

  if (toastContainer) {
    toastContainer.innerHTML = '';
  }

}


/*
|--------------------------------------------------------------------------
| LOAD MENU
|--------------------------------------------------------------------------
*/

async function loadMenuFromServer() {

  try {

    const response =
      await fetch(
        API_BASE +
        `/api/menu/${encodeURIComponent(CAFE_SLUG)}`,
        {
          cache: 'no-store'
        }
      );


    const text =
      await response.text();


    let data = null;


    try {

      data =
        text
          ? JSON.parse(text)
          : null;

    } catch (error) {

      throw new Error(
        'Invalid server response: ' +
        text
      );

    }


    if (!response.ok) {

      throw new Error(
        data?.message ||
        'Failed to fetch menu'
      );

    }


    if (
      data &&
      data.menu &&
      typeof data.menu === 'object'
    ) {

      foods =
        data.menu;


      console.log(
        'Loaded menu for:',
        data.restaurant?.name
      );


      console.log(
        'Menu:',
        foods
      );


      /*
       * Restaurant name
       */

      const cafeName =
        document.getElementById(
          'cafeName'
        );


      if (
        cafeName &&
        data.restaurant?.name
      ) {

        cafeName.textContent =
          data.restaurant.name;

      }


      /*
       * Amharic name is optional.
       * Leave existing HTML unchanged.
       */

      renderItems();

      renderCategoryButtons();

    }

  } catch (error) {

    console.error(
      'Could not load menu from server:',
      error
    );


    foods = {};


    const cafeName =
      document.getElementById(
        'cafeName'
      );


    if (cafeName) {

      cafeName.textContent =
        error.message;

    }


    renderItems();

    renderCategoryButtons();

  }

}


/*
|--------------------------------------------------------------------------
| CATEGORY BUTTONS
|--------------------------------------------------------------------------
*/

function renderCategoryButtons() {

    const container =
        document.getElementById('categoryButtons');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    /*
     * =========================================================
     * ALL ITEMS — ALWAYS FIRST
     * =========================================================
     */

    const allButton =
        document.createElement('button');

    allButton.textContent = 'all item';

    if (currentCategory === 'all') {
        allButton.classList.add('active');
    }

    allButton.onclick = () => {
        showCatagories('all');
    };

    container.appendChild(allButton);


    /*
     * =========================================================
     * CATEGORY ORDER
     *
     * Object.keys(foods) is used directly.
     *
     * We do NOT sort the categories.
     * We do NOT alphabetically reorder them.
     *
     * The order received from the saved menu is preserved.
     * =========================================================
     */

    const categories =
        Object.keys(foods);

    categories.forEach(category => {

        const button =
            document.createElement('button');

        button.textContent =
            category;

        if (
            currentCategory === category
        ) {
            button.classList.add('active');
        }

        button.onclick = () => {

            showCatagories(category);

        };

        container.appendChild(button);

    });

}


/*
|--------------------------------------------------------------------------
| CATEGORY SELECTION
|--------------------------------------------------------------------------
*/

function showCatagories(
  category
) {

  currentCategory =
    category;


  renderItems();

  renderCategoryButtons();

}


/*
|--------------------------------------------------------------------------
| RENDER MENU ITEMS
|--------------------------------------------------------------------------
*/

function renderItems() {

  const container =
    document.querySelector(
      '.container'
    );


  if (!container) {
    return;
  }


  const items =
    currentCategory === 'all'
      ? Object.values(foods).flat()
      : (foods[currentCategory] || []);


  const search =
    searchTerm.toLowerCase();


  const filteredItems =
    items.filter(food => {

      const text =
        `${food.name || ''} ${
          food.ingridient || ''
        }`.toLowerCase();


      return text.includes(
        search
      );

    });


  if (!filteredItems.length) {

    container.innerHTML =
      `
      <div class="empty-state">
        No items match your search.
      </div>
      `;

    return;

  }


  /*
   * Build menu in one DOM update
   */

  container.innerHTML =
    filteredItems.map(
      food => {

        const isAvailable =
          food.isAvailable !== false;


        return `
          <div class="foodd ${
            !isAvailable
              ? 'unavailable'
              : ''
          }">

            <div class="divimage">

              <img
                class="image"
                src="${food.image || ''}"
                alt="${food.name || ''}"
                loading="lazy"
                onclick="zoomImage(this.src)"
              >

            </div>


            <div class="divinfo">

              <p>
                ${food.name || ''}
              </p>

              <p class="ingredient">
                ${food.ingridient || ''}
              </p>


              <div class="info2">

                <p>
                  <strong>
                    ${food.price || 0} ETB
                  </strong>
                </p>

                ${
                  isAvailable
                    ? `
                      <button
                        type="button"
                        class="addbutton"
                        data-name="${escapeAttribute(
                          food.name || ''
                        )}"
                      >
                        +add
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        class="addbutton"
                        disabled
                        style="
                          background:#ccc;
                          cursor:not-allowed;
                        "
                      >
                        Unavailable
                      </button>
                    `
                }

              </div>

            </div>

          </div>
        `;

      }
    ).join('');


  /*
   * Add button events
   */

  container
    .querySelectorAll(
      '.addbutton:not([disabled])'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        event => {

          event.preventDefault();
          event.stopPropagation();

          addToCart(
            event,
            button
          );

        }
      );

    });

}


/*
|--------------------------------------------------------------------------
| SMALL HTML ATTRIBUTE HELPER
|--------------------------------------------------------------------------
*/

function escapeAttribute(value) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

}


/*
|--------------------------------------------------------------------------
| CART LOCAL STORAGE
|--------------------------------------------------------------------------
*/

function loadFromLocalStorage() {

  try {

    const stored =
      localStorage.getItem(
        STORAGE_KEY
      );


    return stored
      ? JSON.parse(stored)
      : [];

  } catch (error) {

    console.warn(
      'Could not load cart from local storage:',
      error
    );

    return [];

  }

}


function saveToLocalStorage() {

  const smallCart =
    cart.map(item => ({

      id: item.id,

      name: item.name,

      price: item.price,

      ingridient:
        item.ingridient || '',

      quantity:
        item.quantity

    }));


  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(smallCart)
  );

}


/*
|--------------------------------------------------------------------------
| CART
|--------------------------------------------------------------------------
*/

function loadCart() {

  cart =
    loadFromLocalStorage();


  renderCart();

}


function saveCart() {

  saveToLocalStorage();

}


function addToCart(
  event,
  button
) {

  const name =
    button.dataset.name;


  const food =
    Object.values(foods)
      .flat()
      .find(
        item =>
          item.name === name
      );


  if (!food) {
    return;
  }


  const matchingItem =
    cart.find(
      item =>
        item.name ===
        food.name
    );


  if (matchingItem) {

    matchingItem.quantity += 1;

  } else {

    cart.push({

      id:
        food.id,

      name:
        food.name,

      price:
        food.price,

      ingridient:
        food.ingridient || '',

      quantity:
        1

    });

  }


  saveCart();

  renderCart();


  /*
   * Button feedback
   */

  const originalText =
    button.textContent;


  button.textContent =
    '✓ Added';


  button.disabled = true;


  setTimeout(
    () => {

      button.textContent =
        originalText;

      button.disabled = false;

    },
    250
  );

}


/*
|--------------------------------------------------------------------------
| RENDER CART
|--------------------------------------------------------------------------
*/

function renderCart() {

  const cartBody =
    document.getElementById(
      'cart-body'
    );


  if (!cartBody) {
    return;
  }


  if (!cart.length) {

    cartBody.innerHTML = `
      <tr>
        <td colspan="3">
          Your cart is empty
        </td>
      </tr>
    `;

  } else {

    cartBody.innerHTML =
      cart.map(
        item => `
          <tr>

            <td>
              ${item.name}
            </td>

            <td>
              ${
                item.price *
                item.quantity
              }
            </td>

            <td>

              <div class="qty-controls">

                <button
                  class="minus"
                  onclick="decreaseQuantity(
                    '${escapeJs(item.name)}'
                  )"
                >
                  −
                </button>

                ${item.quantity}

                <button
                  class="plus"
                  onclick="increaseQuantity(
                    '${escapeJs(item.name)}'
                  )"
                >
                  +
                </button>

              </div>

            </td>

          </tr>
        `
      ).join('');

  }


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        (
          item.price *
          item.quantity
        ),
      0
    );


  const totalElement =
    document.getElementById(
      'total-price'
    );


  if (totalElement) {

    totalElement.textContent =
      total + ' ETB';

  }

}


/*
|--------------------------------------------------------------------------
| CART TEXT ESCAPING
|--------------------------------------------------------------------------
*/

function escapeJs(value) {

  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');

}


/*
|--------------------------------------------------------------------------
| QUANTITY
|--------------------------------------------------------------------------
*/

function increaseQuantity(
  name
) {

  const item =
    cart.find(
      currentItem =>
        currentItem.name === name
    );


  if (item) {
    item.quantity++;
  }


  saveCart();

  renderCart();

}


function decreaseQuantity(
  name
) {

  const item =
    cart.find(
      currentItem =>
        currentItem.name === name
    );


  if (!item) {
    return;
  }


  item.quantity--;


  if (
    item.quantity <= 0
  ) {

    cart =
      cart.filter(
        currentItem =>
          currentItem.name !== name
      );

  }


  saveCart();

  renderCart();

}


/*
|--------------------------------------------------------------------------
| CART BUTTON
|--------------------------------------------------------------------------
*/

function setupCartButton() {

  const cartButton =
    document.querySelector(
      '.cartbutton'
    );


  const container2 =
    document.querySelector(
      '.container2'
    );


  if (
    cartButton &&
    container2
  ) {

    cartButton.addEventListener(
      'click',
      () => {

        container2.classList.toggle(
          'open'
        );

      }
    );

  }

}


/*
|--------------------------------------------------------------------------
| IMAGE VIEWER
|--------------------------------------------------------------------------
*/

function zoomImage(src) {

  const viewer =
    document.getElementById(
      'imageViewer'
    );


  const image =
    document.getElementById(
      'bigImage'
    );


  if (
    viewer &&
    image
  ) {

    image.src = src;

    viewer.classList.add(
      'show'
    );

  }

}


function closeImage() {

  const viewer =
    document.getElementById(
      'imageViewer'
    );


  if (viewer) {

    viewer.classList.remove(
      'show'
    );

  }

}


/*
|--------------------------------------------------------------------------
| SEARCH
|--------------------------------------------------------------------------
*/

function setupSearch() {

  const searchInput =
    document.getElementById(
      'searchInput'
    );


  if (!searchInput) {
    return;
  }


  searchInput.addEventListener(
    'input',
    event => {

      searchTerm =
        event.target.value;

      renderItems();

    }
  );

}


/*
|--------------------------------------------------------------------------
| PAYMENT MODAL
|--------------------------------------------------------------------------
*/

function openPaymentModal() {

  const paymentModal =
    document.getElementById(
      'paymentModal'
    );


  const paymentTotal =
    document.getElementById(
      'payment-total'
    );


  const paymentMessage =
    document.getElementById(
      'paymentMessage'
    );


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        (
          item.price *
          item.quantity
        ),
      0
    );


  if (!total) {

    showToast(
      'Add an item to the cart before paying.',
      'error'
    );

    return;

  }


  if (paymentTotal) {

    paymentTotal.textContent =
      `${total} ETB`;

  }


  if (paymentMessage) {

    paymentMessage.textContent =
      '';

  }


  if (paymentModal) {

    paymentModal.classList.add(
      'show'
    );

  }

}


function closePaymentModal() {

  const modal =
    document.getElementById(
      'paymentModal'
    );


  if (modal) {

    modal.classList.remove(
      'show'
    );

  }

}


/*
|--------------------------------------------------------------------------
| PAYMENT SETUP
|--------------------------------------------------------------------------
*/

function setupPayment() {

  const paymentButton =
    document.querySelector(
      '.payment'
    );


  const paymentModal =
    document.getElementById(
      'paymentModal'
    );


  const paymentForm =
    document.getElementById(
      'telebirrPaymentForm'
    );


  if (
    !paymentButton ||
    !paymentModal ||
    !paymentForm
  ) {

    return;

  }


  paymentButton.addEventListener(
    'click',
    openPaymentModal
  );


  paymentModal.addEventListener(
    'click',
    event => {

      if (
        event.target ===
        paymentModal
      ) {

        closePaymentModal();

      }

    }
  );


  paymentModal
    .querySelectorAll(
      '.payment-option'
    )
    .forEach(option => {

      option.addEventListener(
        'click',
        () => {

          paymentModal
            .querySelectorAll(
              '.payment-option'
            )
            .forEach(
              item =>
                item.classList.remove(
                  'selected'
                )
            );


          option.classList.add(
            'selected'
          );


          paymentForm.hidden =
            option.dataset.method !==
            'Telebirr';


          const paymentMessage =
            document.getElementById(
              'paymentMessage'
            );


          if (paymentMessage) {

            paymentMessage.textContent =
              option.dataset.method ===
              'BOA'
                ? 'BOA payment is not configured yet.'
                : '';

          }

        }
      );

    });


  paymentForm.addEventListener(
    'submit',
    startTelebirrPayment
  );

}


/*
|--------------------------------------------------------------------------
| TELEBIRR PAYMENT
|--------------------------------------------------------------------------
*/

async function startTelebirrPayment(
  event
) {

  event.preventDefault();


  const accountNumber =
    document.getElementById(
      'telebirrAccount'
    )?.value.trim();


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        (
          item.price *
          item.quantity
        ),
      0
    );


  const submitButton =
    event.target.querySelector(
      '.payment-submit'
    );


  if (
    !/^0\d{9}$/.test(
      accountNumber
    )
  ) {

    showToast(
      'Enter a valid 10-digit Telebirr account number.',
      'error'
    );

    return;

  }


  if (submitButton) {

    submitButton.disabled =
      true;

  }


  showToast(
    'Preparing Telebirr payment...',
    'loading'
  );


  try {

    const response =
      await fetch(
        API_BASE +
        '/api/payments/telebirr/create',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              accountNumber,
              amount: total,
              items: cart
            })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        'Could not create payment.'
      );

    }


    await copyPaymentDetails(
      `Telebirr: ${total} ETB to ${data.merchantAccount}`
    );


    if (submitButton) {

      submitButton.textContent =
        'Payment details copied';

      submitButton.disabled =
        false;

    }


    showToast(
      'Payment details copied successfully!',
      'success'
    );


  } catch (error) {

    if (submitButton) {
      submitButton.disabled = false;
    }


    showToast(
      error.message ||
      'Payment creation failed.',
      'error'
    );

  }

}


/*
|--------------------------------------------------------------------------
| COPY PAYMENT DETAILS
|--------------------------------------------------------------------------
*/

async function copyPaymentDetails(
  details
) {

  try {

    await navigator.clipboard.writeText(
      details
    );

  } catch (error) {

    console.warn(
      'Could not copy payment details:',
      error
    );

  }

}


/*
|--------------------------------------------------------------------------
| START CUSTOMER PAGE
|--------------------------------------------------------------------------
*/

window.addEventListener(
  'DOMContentLoaded',
  async () => {

    setupSearch();

    setupPayment();

    setupCartButton();

    await loadMenuFromServer();

    loadCart();

  }
);