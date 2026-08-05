const authPanel = document.getElementById('authPanel');
const cartSummary = document.getElementById('cartSummary');
const productGrid = document.getElementById('productGrid');
const cartItems = document.getElementById('cartItems');
const productCount = document.getElementById('productCount');
const checkoutForm = document.getElementById('checkoutForm');
const orderMessage = document.getElementById('orderMessage');

let state = { user: null, products: [], cart: { items: [], total: 0 } };

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAuth() {
  if (!state.user) {
    authPanel.innerHTML = `
      <div class="auth-form">
        <input id="identifier" placeholder="Username or email" />
        <input id="password" type="password" placeholder="Password" />
        <div class="auth-row">
          <button class="primary" onclick="login()">Log in</button>
          <button class="secondary" onclick="register()">Create account</button>
        </div>
      </div>
    `;
    return;
  }

  authPanel.innerHTML = `
    <div>
      <strong>${escapeHtml(state.user.username)}</strong>
      <div class="muted">Signed in</div>
      <button class="secondary" onclick="logout()" style="margin-top:8px;">Log out</button>
    </div>
  `;
}

function renderProducts() {
  productCount.textContent = `${state.products.length} items available`;
  productGrid.innerHTML = state.products.map(product => `
    <article class="product-card">
      <img src="${product.image}" alt="${escapeHtml(product.name)}" />
      <h4>${escapeHtml(product.name)}</h4>
      <p class="muted">${escapeHtml(product.description)}</p>
      <div class="auth-row" style="justify-content:space-between;align-items:center;">
        <strong>$${product.price.toFixed(2)}</strong>
        <div class="auth-row">
          <a class="secondary" href="/product.html?id=${product.id}">Details</a>
          <button class="primary" onclick="addToCart('${product.id}')">Add</button>
        </div>
      </div>
    </article>
  `).join('');
}

function renderCart() {
  cartSummary.innerHTML = `Cart · $${state.cart.total.toFixed(2)}`;
  if (!state.cart.items.length) {
    cartItems.innerHTML = '<div class="muted">Your cart is empty.</div>';
    return;
  }

  cartItems.innerHTML = state.cart.items.map(item => `
    <div class="cart-item">
      <strong>${escapeHtml(item.name)}</strong>
      <div class="muted">Qty ${item.quantity} · $${item.lineTotal.toFixed(2)}</div>
      <button class="secondary" onclick="removeFromCart('${item.productId}')">Remove</button>
    </div>
  `).join('');
}

async function loadInitialData() {
  try {
    const [auth, products, cart] = await Promise.all([
      api('/api/auth/me').catch(() => ({ user: null })),
      api('/api/products'),
      api('/api/cart')
    ]);
    state.user = auth.user || null;
    state.products = products;
    state.cart = cart;
  } catch (error) {
    console.error(error);
  }

  renderAuth();
  renderProducts();
  renderCart();
}

async function login() {
  const identifier = document.getElementById('identifier').value;
  const password = document.getElementById('password').value;
  try {
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
    state.user = result.user;
    renderAuth();
  } catch (error) {
    alert(error.message);
  }
}

async function register() {
  const identifier = document.getElementById('identifier').value;
  const password = document.getElementById('password').value;
  const username = identifier;
  const email = prompt('Enter your email address');
  if (!email) return;
  try {
    const result = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
    state.user = result.user;
    renderAuth();
  } catch (error) {
    alert(error.message);
  }
}

async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error(error);
  }
  state.user = null;
  renderAuth();
}

async function addToCart(productId) {
  try {
    const cart = await api('/api/cart/add', { method: 'POST', body: JSON.stringify({ productId, quantity: 1 }) });
    state.cart = cart;
    renderCart();
  } catch (error) {
    alert(error.message);
  }
}

async function removeFromCart(productId) {
  try {
    const cart = await api('/api/cart/remove', { method: 'POST', body: JSON.stringify({ productId }) });
    state.cart = cart;
    renderCart();
  } catch (error) {
    alert(error.message);
  }
}

checkoutForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const address = document.getElementById('address').value;
  try {
    const order = await api('/api/orders', { method: 'POST', body: JSON.stringify({ address }) });
    orderMessage.textContent = `Order placed successfully! ID ${order.orderId} for $${order.total.toFixed(2)}.`;
    document.getElementById('address').value = '';
    state.cart = { items: [], total: 0 };
    renderCart();
  } catch (error) {
    orderMessage.textContent = error.message;
  }
});

loadInitialData();
