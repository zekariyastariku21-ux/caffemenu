
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');


function requireOwner(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        message: 'Owner authentication required.'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'super_admin') {
      return res.status(403).json({
        ok: false,
        message: 'Owner access required.'
      });
    }

    req.user = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Invalid or expired authentication token.'
    });
  }
}




function requireRestaurantAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        message: 'Admin authentication required.'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'super_admin' && decoded.role !== 'cafe_admin') {
      return res.status(403).json({
        ok: false,
        message: 'Restaurant admin access required.'
      });
    }

    req.user = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Invalid or expired authentication token.'
    });
  }
}

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

pool.query('SELECT NOW()')
  .then(() => console.log('PostgreSQL connected'))
  .catch(err => console.error('PostgreSQL connection error:', err.message));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from root and image directories
app.use(express.static(__dirname));
app.use('/image', express.static(path.join(__dirname, 'image')));

// Enable CORS for all routes (simple dev convenience)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  console.log(`[req] ${req.method} ${req.path}`);
  next();
});

// Handle OPTIONS for any API path to avoid preflight 405 errors
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' && req.path && req.path.startsWith('/api/')) {
    return res.sendStatus(200);
  }
  next();
});

app.get('/', (req, res) => {
  res.redirect('/save.html');
});

const CART_FILE = './cart.json';
const MENU_FILE = './menu.json';

const ADMIN_USERS = {
  'admin@example.com': 'admin123'
};

const TELEBIRR_MERCHANT_ACCOUNT = process.env.TELEBIRR_MERCHANT_ACCOUNT || '';

function loadMenu() {
  if (!fs.existsSync(MENU_FILE)) {
    return {
      breakfast: [],
      lunch: [],
      dessert: [],
      hotdrinks: [],
      mocktail: []
    };
  }

  try {
    return JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
  } catch (error) {
    return {
      breakfast: [],
      lunch: [],
      dessert: [],
      hotdrinks: [],
      mocktail: []
    };
  }
}

function saveMenu(menu) {
  fs.writeFileSync(MENU_FILE, JSON.stringify(menu, null, 2));
}


app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Email and password are required.'
      });
    }

  
    const result = await pool.query(
  `
  SELECT
    users.*,
    restaurants.slug AS restaurant_slug,
    restaurants.name AS restaurant_name
  FROM users
  LEFT JOIN restaurants
    ON users.restaurant_id = restaurants.id
  WHERE users.email = $1
  `,
  [email]
);





    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        message: 'Invalid email or password.'
      });
    }

    const user = result.rows[0];

    if (user.password !== password) {
      return res.status(401).json({
        ok: false,
        message: 'Invalid email or password.'
      });
    }


    const token = jwt.sign(
        {
          user_id: user.id,
          role: user.role,
          restaurant_id: user.restaurant_id
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '7d'
        }
      );

    
    res.json({
      ok: true,
      token,
      role: user.role,
      restaurant_id: user.restaurant_id,
      restaurant_slug: user.restaurant_slug,
      restaurant_name: user.restaurant_name,
      message: 'Login successful.'
    });



  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      message: 'Server error'
    });
  }
});





app.get('/api/menu/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const restaurantResult = await pool.query(
      `
      SELECT id, name, slug, status
      FROM restaurants
      WHERE slug = $1
      `,
      [slug]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Restaurant not found.'
      });
    }

    const restaurant = restaurantResult.rows[0];

    if (restaurant.status !== 'active') {
      return res.status(403).json({
        ok: false,
        message: 'Restaurant is not active.'
      });
    }

    const menuResult = await pool.query(
      `
      SELECT menu
      FROM menu_data
      WHERE restaurant_id = $1
      `,
      [restaurant.id]
    );

    if (menuResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Menu not found for this restaurant.'
      });
    }

    res.json({
      ok: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug
      },
      menu: menuResult.rows[0].menu
    });

  } catch (error) {
    console.error('Error loading restaurant menu:', error.message);

    res.status(500).json({
      ok: false,
      message: 'Failed to load restaurant menu.'
    });
  }
});






app.post('/api/payments/telebirr/create', (req, res) => {
  const { accountNumber, amount, items } = req.body || {};
  if (!Number.isFinite(amount) || amount <= 0 || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ ok: false, message: 'A valid cart and amount are required.' });
  }

  if (!TELEBIRR_MERCHANT_ACCOUNT) {
    return res.status(503).json({
      ok: false,
      message: 'Cafe Telebirr account is not configured. Set TELEBIRR_MERCHANT_ACCOUNT in the server environment.'
    });
  }

  const paymentId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.json({ ok: true, paymentId, merchantAccount: TELEBIRR_MERCHANT_ACCOUNT });
});




app.post('/api/admin/menu/:slug', requireRestaurantAdmin, async (req, res) => {
  const { slug } = req.params;
  const { menu } = req.body;

  if (!menu || typeof menu !== 'object') {
    return res.status(400).json({
      ok: false,
      message: 'Menu data is required.'
    });
  }

  try {
    // Find the restaurant using its slug
    const restaurantResult = await pool.query(
      `
      SELECT id, name, slug, status
      FROM restaurants
      WHERE slug = $1
      `,
      [slug]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Restaurant not found.'
      });
    }

    const restaurant = restaurantResult.rows[0];

    // Cafe admins can only edit their own restaurant.
    // Super admins can edit any restaurant.
    if (
      req.user.role === 'cafe_admin' &&
      Number(req.user.restaurant_id) !== Number(restaurant.id)
    ) {
      return res.status(403).json({
        ok: false,
        message: 'You can only edit your own restaurant menu.'
      });
    }

    if (restaurant.status !== 'active') {
      return res.status(403).json({
        ok: false,
        message: 'Restaurant is not active.'
      });
    }

    // Save this menu only for this restaurant
    

    const menuResult = await pool.query(
  `
  UPDATE menu_data
  SET
    menu = $1,
    updated_at = NOW()
  WHERE restaurant_id = $2
  `,
  [menu, restaurant.id]
);

if (menuResult.rowCount === 0) {
  return res.status(404).json({
    ok: false,
    message: 'Menu record not found for this restaurant.'
  });
}




    console.log(`Menu saved for ${restaurant.name} (${restaurant.slug}).`);

    res.json({
      ok: true,
      message: `Menu saved for ${restaurant.name}.`
    });

  } catch (error) {
    console.error('Error saving restaurant menu:', error.message);

    res.status(500).json({
      ok: false,
      message: 'Failed to save restaurant menu.'
    });
  }
});






// Debug endpoint
app.all('/api/debug', (req, res) => {
  console.log('[api-debug] method=%s path=%s headers=%o body=%o', req.method, req.path, req.headers, req.body);
  res.json({ ok: true, method: req.method, path: req.path, headers: req.headers, body: req.body });
});



// OWNER: Get all restaurants
app.get('/api/owner/restaurants', requireOwner, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        slug,
        status
      FROM restaurants
      ORDER BY id ASC
    `);

    res.json({
      ok: true,
      restaurants: result.rows
    });

  } catch (error) {
    console.error('Error loading restaurants:', error.message);

    res.status(500).json({
      ok: false,
      message: 'Failed to load restaurants.'
    });
  }
});



// OWNER: Create a new restaurant
app.post('/api/owner/restaurants', requireOwner, async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        ok: false,
        message: 'Restaurant name and slug are required.'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO restaurants (name, slug, status)
      VALUES ($1, $2, 'active')
      RETURNING id, name, slug, status
      `,
      [name.trim(), slug.trim().toLowerCase()]
    );

      await pool.query(
        `
        INSERT INTO menu_data (id, restaurant_id, menu)
        VALUES (
          (SELECT COALESCE(MAX(id), 0) + 1 FROM menu_data),
          $1,
          $2
        )
        `,
        [result.rows[0].id, {}]
      );

    res.status(201).json({
      ok: true,
      restaurant: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating restaurant:', error.message);

    res.status(500).json({
      ok: false,
      message: 'Failed to create restaurant.'
    });
  }
});



app.get('/api/setup-amare-menu', async (req, res) => {
  try {
    const restaurantResult = await pool.query(
      `
      SELECT id, name, slug
      FROM restaurants
      WHERE slug = 'amare-cafe'
      `
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Amare Cafe not found.'
      });
    }

    const restaurant = restaurantResult.rows[0];

    const nextIdResult = await pool.query(
      `
      SELECT COALESCE(MAX(id), 0) + 1 AS next_id
      FROM menu_data
      `
    );

    const nextId = nextIdResult.rows[0].next_id;

    const menuResult = await pool.query(
      `
      INSERT INTO menu_data (id, restaurant_id, menu)
      VALUES ($1, $2, $3)
      `,
      [nextId, restaurant.id, {}]
    );

    res.json({
      ok: true,
      restaurant,
      menu_data_id: nextId,
      created: menuResult.rowCount === 1
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
});






// Fallback for unmatched API routes
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) {
    console.log(`[api] No matching route for ${req.method} ${req.path}`);
    return res.status(404).json({ ok: false, message: 'API route not found' });
  }
  next();
});


app.get('/api/setup-amare-menu', async (req, res) => {
  try {
    const restaurantResult = await pool.query(
      `
      SELECT id, name, slug
      FROM restaurants
      WHERE slug = 'amare-cafe'
      `
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Amare Cafe not found.'
      });
    }

    const restaurant = restaurantResult.rows[0];

    const menuResult = await pool.query(
  `
  SELECT id, restaurant_id
  FROM menu_data
  ORDER BY id
  `
);

    res.json({
      ok: true,
      restaurant,
      menus: menuResult.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});







