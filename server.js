
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
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15000,
  query_timeout: 30000
});



// Cache restaurant menus in server memory
const menuCache = new Map();



pool.query('SELECT NOW()')
  .then(() => console.log('PostgreSQL connected'))
  .catch(err => console.error('PostgreSQL connection error:', err.message));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Block direct access to the internal menu page
app.get('/save.html', (req, res) => {
  res.status(404).send('Not Found');
});

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
  res.sendFile(path.join(__dirname, 'company.html'));
});



app.get('/:slug', (req, res, next) => {
  const { slug } = req.params;

  // Don't treat API routes as restaurant slugs
  if (slug === 'api') {
    return next();
  }

  res.sendFile(path.join(__dirname, 'save.html'));
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
  SELECT users.*,
       restaurants.slug AS restaurant_slug,
       restaurants.name AS restaurant_name,
       restaurants.status AS restaurant_status
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

    if (
  user.role === 'cafe_admin' &&
  user.restaurant_status !== 'active'
) {
  return res.status(403).json({
    ok: false,
    message: 'This restaurant is currently disabled.'
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

        // Return cached menu if available
    if (menuCache.has(slug)) {
  console.log(`[cache] HIT ${slug}`);
  const cached = menuCache.get(slug);
  return res.json(cached);
}

console.log(`[cache] MISS ${slug}`);

    console.time('restaurant-query');

    const restaurantResult = await pool.query(
      `
      SELECT id, name, slug, status
      FROM restaurants
      WHERE slug = $1
      `,
      [slug]
    );

    console.timeEnd('restaurant-query');

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
        message: `${restaurant.name} is temporarily unavailable. Please check back later.`
      });
    }

    console.time('menu-query');

    const menuResult = await pool.query(
      `
      SELECT menu
      FROM menu_data
      WHERE restaurant_id = $1
      `,
      [restaurant.id]
    );

    console.timeEnd('menu-query');

    if (menuResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Menu not found for this restaurant.'
      });
    }

    
    const responseData = {
  ok: true,
  restaurant: {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug
  },
  menu: menuResult.rows[0].menu
};

// Save menu in memory cache
menuCache.set(slug, responseData);

res.json(responseData);


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

// Clear cached menu so the next customer gets the updated menu
menuCache.delete(slug);

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



app.get('/api/admin/session', async (req, res) => {

  try {

    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        message: 'Not logged in.'
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.email,
        u.role,
        u.restaurant_id,
        r.name AS restaurant_name,
        r.slug AS restaurant_slug,
        r.status AS restaurant_status
      FROM users u
      LEFT JOIN restaurants r
        ON r.id = u.restaurant_id
      WHERE u.id = $1
      `,
      [decoded.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        message: 'Account not found.'
      });
    }

    const user = result.rows[0];

    if (
      user.role === 'cafe_admin' &&
      user.restaurant_status !== 'active'
    ) {
      return res.status(403).json({
        ok: false,
        message: 'This restaurant is currently disabled.'
      });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        restaurant_id: user.restaurant_id,
        restaurant_name: user.restaurant_name,
        restaurant_slug: user.restaurant_slug
      }
    });

  } catch (error) {

    console.error(
      'Admin session check error:',
      error.message
    );

    return res.status(401).json({
      ok: false,
      message: 'Session expired.'
    });
  }
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
// OWNER: Create a new restaurant + cafe admin
app.post('/api/owner/restaurants', requireOwner, async (req, res) => {
  try {
    const { name, slug, adminEmail, adminPassword } = req.body;

    if (!name || !slug || !adminEmail || !adminPassword) {
      return res.status(400).json({
        ok: false,
        message: 'Restaurant name, slug, admin email, and admin password are required.'
      });
    }

    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();
    const cleanEmail = adminEmail.trim().toLowerCase();

    // Check whether the slug already exists
    const slugCheck = await pool.query(
      `SELECT id FROM restaurants WHERE slug = $1`,
      [cleanSlug]
    );

    if (slugCheck.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'A restaurant with this slug already exists.'
      });
    }

    // Check whether the email already exists
    const emailCheck = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [cleanEmail]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'This admin email is already in use.'
      });
    }

    // Create restaurant
    const result = await pool.query(
      `
      INSERT INTO restaurants (name, slug, status)
      VALUES ($1, $2, 'active')
      RETURNING id, name, slug, status
      `,
      [cleanName, cleanSlug]
    );

    const restaurant = result.rows[0];

    // Create empty menu for the restaurant
    await pool.query(
      `
      INSERT INTO menu_data (id, restaurant_id, menu)
      VALUES (
        (SELECT COALESCE(MAX(id), 0) + 1 FROM menu_data),
        $1,
        $2
      )
      `,
      [restaurant.id, {}]
    );

    // Create cafe admin account
    await pool.query(
      `
      INSERT INTO users (email, password, role, restaurant_id)
      VALUES ($1, $2, 'cafe_admin', $3)
      `,
      [cleanEmail, adminPassword, restaurant.id]
    );

    res.status(201).json({
      ok: true,
      restaurant,
      admin: {
        email: cleanEmail,
        role: 'cafe_admin',
        restaurant_id: restaurant.id
      }
    });

  } catch (error) {
    console.error('Error creating restaurant:', error.message);

    res.status(500).json({
      ok: false,
      message: 'Failed to create restaurant.'
    });
  }
});



// OWNER: Update restaurant name and slug
app.put('/api/owner/restaurants/:id', requireOwner, async (req, res) => {
  try {
    const restaurantId = Number(req.params.id);
    const { name, slug } = req.body;

    if (!restaurantId || !name || !slug) {
      return res.status(400).json({
        ok: false,
        message: 'Restaurant ID, name, and slug are required.'
      });
    }

    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();

    // Check whether another restaurant already uses this slug
    const slugCheck = await pool.query(
      `
      SELECT id
      FROM restaurants
      WHERE slug = $1 AND id <> $2
      `,
      [cleanSlug, restaurantId]
    );

    if (slugCheck.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'Another restaurant already uses this slug.'
      });
    }

    const result = await pool.query(
      `
      UPDATE restaurants
      SET name = $1,
          slug = $2
      WHERE id = $3
      RETURNING id, name, slug, status
      `,
      [cleanName, cleanSlug, restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Restaurant not found.'
      });
    }

    res.json({
      ok: true,
      restaurant: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating restaurant:', error.message);

    res.status(500).json({
      ok: false,
      message: 'Failed to update restaurant.'
    });
  }
});


// OWNER: Update restaurant admin email and/or password
app.put('/api/owner/restaurants/:id/admin', requireOwner, async (req, res) => {
  try {
    const restaurantId = Number(req.params.id);
    const { email, password } = req.body;

    if (!restaurantId) {
      return res.status(400).json({
        ok: false,
        message: 'Restaurant ID is required.'
      });
    }

    if (!email && !password) {
      return res.status(400).json({
        ok: false,
        message: 'Enter an email or password to update.'
      });
    }

    const userResult = await pool.query(
      `
      SELECT id, email, password
      FROM users
      WHERE restaurant_id = $1
        AND role = 'cafe_admin'
      LIMIT 1
      `,
      [restaurantId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Cafe admin account not found.'
      });
    }

    const admin = userResult.rows[0];

    if (email) {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        return res.status(400).json({
          ok: false,
          message: 'Admin email cannot be empty.'
        });
      }

      const emailCheck = await pool.query(
        `
        SELECT id
        FROM users
        WHERE email = $1
          AND id <> $2
        `,
        [cleanEmail, admin.id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          ok: false,
          message: 'This email is already in use.'
        });
      }

      await pool.query(
        `
        UPDATE users
        SET email = $1
        WHERE id = $2
        `,
        [cleanEmail, admin.id]
      );
    }

    if (password) {
      await pool.query(
        `
        UPDATE users
        SET password = $1
        WHERE id = $2
        `,
        [password, admin.id]
      );
    }

    const updatedResult = await pool.query(
      `
      SELECT id, email, role, restaurant_id
      FROM users
      WHERE id = $1
      `,
      [admin.id]
    );

    res.json({
      ok: true,
      admin: updatedResult.rows[0],
      message: 'Admin account updated successfully.'
    });

  } catch (error) {
    console.error('Error updating restaurant admin:', error.message);

    res.status(500).json({
      ok: false,
      message: 'Failed to update admin account.'
    });
  }
});



// OWNER: Enable or disable a restaurant
app.put('/api/owner/restaurants/:id/status', requireOwner, async (req, res) => {
  try {
    const restaurantId = Number(req.params.id);
    const { status } = req.body;

    if (!restaurantId) {
      return res.status(400).json({
        ok: false,
        message: 'Restaurant ID is required.'
      });
    }

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({
        ok: false,
        message: 'Status must be active or disabled.'
      });
    }

    const result = await pool.query(
      `
      UPDATE restaurants
      SET status = $1
      WHERE id = $2
      RETURNING id, name, slug, status
      `,
      [status, restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Restaurant not found.'
      });
    }

    res.json({
      ok: true,
      restaurant: result.rows[0],
      message:
        status === 'active'
          ? 'Restaurant enabled successfully.'
          : 'Restaurant disabled successfully.'
    });

  } catch (error) {
    console.error('Error changing restaurant status:', error.message);

    res.status(500).json({
      ok: false,
      message: 'Failed to change restaurant status.'
    });
  }
});


app.delete('/api/owner/restaurants/:id', requireOwner, async (req, res) => {
  const client = await pool.connect();

  try {
    const restaurantId = Number(req.params.id);

    if (!restaurantId) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid restaurant ID.'
      });
    }

    await client.query('BEGIN');

    // Make sure the restaurant exists
    const restaurantResult = await client.query(
      `SELECT id, name, slug
       FROM restaurants
       WHERE id = $1`,
      [restaurantId]
    );

    if (restaurantResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        ok: false,
        message: 'Restaurant not found.'
      });
    }

    const restaurant = restaurantResult.rows[0];

    // Delete café admin account
    await client.query(
      `DELETE FROM users
       WHERE restaurant_id = $1
         AND role = 'cafe_admin'`,
      [restaurantId]
    );

    // Delete restaurant menu
    await client.query(
      `DELETE FROM menu_data
       WHERE restaurant_id = $1`,
      [restaurantId]
    );

    // Delete restaurant
    await client.query(
      `DELETE FROM restaurants
       WHERE id = $1`,
      [restaurantId]
    );

    await client.query('COMMIT');

    res.json({
      ok: true,
      message: `${restaurant.name} deleted successfully.`
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error deleting restaurant:', error.message);

    res.status(500).json({
      ok: false,
      message: 'Failed to delete restaurant.'
    });

  } finally {
    client.release();
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




const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});







