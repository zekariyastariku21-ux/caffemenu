require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();

/*
|--------------------------------------------------------------------------
| DATABASE
|--------------------------------------------------------------------------
*/

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,

  connectionTimeoutMillis: 15000,

  idleTimeoutMillis: 10000,

  query_timeout: 15000,

  max: 10,

  keepAlive: true,

  keepAliveInitialDelayMillis: 10000
});

pool.on('error', (error) => {
  console.error(
    'PostgreSQL pool error:',
    error.message
  );
});

/*
|--------------------------------------------------------------------------
| MENU CACHE
|--------------------------------------------------------------------------
*/

const menuCache = new Map();



/*
|--------------------------------------------------------------------------
| RESTAURANT PROFILE TABLE
|--------------------------------------------------------------------------
*/

async function ensureRestaurantProfilesTable() {

  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS restaurant_profiles (

        id SERIAL PRIMARY KEY,

        restaurant_id INTEGER NOT NULL UNIQUE
          REFERENCES restaurants(id)
          ON DELETE CASCADE,

        phone_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,

        addresses JSONB NOT NULL DEFAULT '[]'::jsonb,

        updated_at TIMESTAMP NOT NULL DEFAULT NOW()

      )
    `);

    console.log(
      'Restaurant profiles table ready'
    );

  } catch (error) {

    console.error(
      'Restaurant profiles table error:',
      error.message
    );

  }

}

ensureRestaurantProfilesTable();

/*
|--------------------------------------------------------------------------
| DATABASE CONNECTION TEST
|--------------------------------------------------------------------------
*/

pool.query('SELECT NOW()')
  .then(() => console.log('PostgreSQL connected'))
  .catch(err =>
    console.error('PostgreSQL connection error:', err.message)
  );

/*
|--------------------------------------------------------------------------
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(express.json({ limit: '50mb' }));

app.use(
  express.urlencoded({
    limit: '50mb',
    extended: true
  })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  console.log(`[req] ${req.method} ${req.path}`);

  next();
});

/*
|--------------------------------------------------------------------------
| OPTIONS / PREFLIGHT
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  if (
    req.method === 'OPTIONS' &&
    req.path &&
    req.path.startsWith('/api/')
  ) {
    return res.sendStatus(200);
  }

  next();
});

/*
|--------------------------------------------------------------------------
| AUTHENTICATION HELPERS
|--------------------------------------------------------------------------
*/

/*
 * Get JWT token from:
 *
 * 1. Authorization: Bearer TOKEN
 * 2. HttpOnly adminToken cookie
 */

function getTokenFromRequest(req) {

  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookieHeader = req.headers.cookie || '';

  const match = cookieHeader.match(
    /(?:^|;\s*)adminToken=([^;]+)/
  );

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch (error) {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| SUPER ADMIN AUTH
|--------------------------------------------------------------------------
*/

function requireOwner(req, res, next) {

  try {

    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: 'Owner authentication required.'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

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

/*
|--------------------------------------------------------------------------
| RESTAURANT ADMIN AUTH
|--------------------------------------------------------------------------
*/

function requireRestaurantAdmin(req, res, next) {

  try {

    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: 'Admin authentication required.'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (
      decoded.role !== 'super_admin' &&
      decoded.role !== 'cafe_admin'
    ) {
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

/*
|--------------------------------------------------------------------------
| PROTECTED CAFE ADMIN HTML PAGE
|--------------------------------------------------------------------------
*/

app.get('/admin-panel.html', (req, res) => {

  try {

    const token = getTokenFromRequest(req);

    if (!token) {
      return res.redirect('/admin.html');
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== 'cafe_admin') {
      return res.redirect('/admin.html');
    }

    return res.sendFile(
      path.join(__dirname, 'admin-panel.html')
    );

  } catch (error) {

    return res.redirect('/admin.html');

  }

});

/*
|--------------------------------------------------------------------------
| PROTECTED SUPER ADMIN HTML PAGE
|--------------------------------------------------------------------------
*/

app.get('/super-admin-panel.html', (req, res) => {

  try {

    const token = getTokenFromRequest(req);

    if (!token) {
      return res.redirect('/admin.html');
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== 'super_admin') {
      return res.redirect('/admin.html');
    }

    return res.sendFile(
      path.join(__dirname, 'super-admin-panel.html')
    );

  } catch (error) {

    return res.redirect('/admin.html');

  }

});

/*
|--------------------------------------------------------------------------
| ADMIN LOGIN PAGE
|--------------------------------------------------------------------------
*/

app.get('/admin.html', (req, res) => {

  res.sendFile(
    path.join(__dirname, 'admin.html')
  );

});

/*
|--------------------------------------------------------------------------
| BLOCK DIRECT ACCESS TO save.html
|--------------------------------------------------------------------------
*/

app.get('/save.html', (req, res) => {

  res.status(404).send('Not Found');

});

/*
|--------------------------------------------------------------------------
| STATIC FILES
|--------------------------------------------------------------------------
*/

app.use(express.static(__dirname));

app.use(
  '/image',
  express.static(
    path.join(__dirname, 'image')
  )
);

/*
|--------------------------------------------------------------------------
| HOME PAGE
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {

  res.sendFile(
    path.join(__dirname, 'company.html')
  );

});

/*
|--------------------------------------------------------------------------
| RESTAURANT PUBLIC URL
|--------------------------------------------------------------------------
|
| Example:
| /etete-coffee
|
| This serves save.html to customers.
|
|--------------------------------------------------------------------------
*/

app.get('/:slug', (req, res, next) => {

  const { slug } = req.params;

  /*
   * Never treat API as restaurant slug.
   */
  if (slug === 'api') {
    return next();
  }

  /*
   * Admin pages are handled above.
   */
  if (
    slug === 'admin.html' ||
    slug === 'admin-panel.html' ||
    slug === 'super-admin-panel.html'
  ) {
    return next();
  }

  res.sendFile(
    path.join(__dirname, 'save.html')
  );

});

/*
|--------------------------------------------------------------------------
| ADMIN LOGIN
|--------------------------------------------------------------------------
*/

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

    /*
     * Check password
     */

    if (user.password !== password) {

      return res.status(401).json({
        ok: false,
        message: 'Invalid email or password.'
      });

    }

    /*
     * Disabled cafe cannot log in
     */

    if (
      user.role === 'cafe_admin' &&
      user.restaurant_status !== 'active'
    ) {

      return res.status(403).json({
        ok: false,
        message: 'This restaurant is currently disabled.'
      });

    }

    /*
     * Create JWT
     */

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

    /*
     * Save token in HttpOnly cookie
     */

    res.setHeader(
      'Set-Cookie',
      `adminToken=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

    /*
     * Return login information
     */

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

    console.error(
      'Admin login error:',
      err.message
    );

    res.status(500).json({
      ok: false,
      message: 'Server error'
    });

  }

});

/*
|--------------------------------------------------------------------------
| ADMIN LOGOUT
|--------------------------------------------------------------------------
*/

app.post('/api/admin/logout', (req, res) => {

  res.setHeader(
    'Set-Cookie',
    `adminToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );

  res.json({
    ok: true,
    message: 'Logged out successfully.'
  });

});

/*
|--------------------------------------------------------------------------
| OLD FILE VARIABLES
|--------------------------------------------------------------------------
*/

const CART_FILE = './cart.json';
const MENU_FILE = './menu.json';

const ADMIN_USERS = {
  'admin@example.com': 'admin123'
};

const TELEBIRR_MERCHANT_ACCOUNT =
  process.env.TELEBIRR_MERCHANT_ACCOUNT || '';

/*
|--------------------------------------------------------------------------
| OLD LOCAL MENU HELPERS
|--------------------------------------------------------------------------
|
| Kept here so your existing project does not lose them.
|
|--------------------------------------------------------------------------
*/

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

    return JSON.parse(
      fs.readFileSync(
        MENU_FILE,
        'utf8'
      )
    );

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

  fs.writeFileSync(
    MENU_FILE,
    JSON.stringify(menu, null, 2)
  );

}

/*
|--------------------------------------------------------------------------
| ADMIN SESSION
|--------------------------------------------------------------------------
*/

app.get('/api/admin/session', async (req, res) => {

  try {

    const token = getTokenFromRequest(req);

    if (!token) {

      return res.status(401).json({
        ok: false,
        message: 'Not logged in.'
      });

    }

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

    /*
     * Disabled restaurant check
     */

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




/*
|--------------------------------------------------------------------------
| RESTAURANT PROFILE
|--------------------------------------------------------------------------
*/

/*
 * Check that the logged-in cafe admin
 * owns the requested restaurant.
 */

async function getRestaurantForProfile(
  req,
  res,
  slug
) {

  const result = await pool.query(
    `
    SELECT
      id,
      name,
      slug,
      status
    FROM restaurants
    WHERE slug = $1
    `,
    [slug]
  );

  if (result.rows.length === 0) {

    res.status(404).json({
      ok: false,
      message: 'Restaurant not found.'
    });

    return null;

  }

  const restaurant =
    result.rows[0];

  /*
   * Cafe admin can only manage
   * their own restaurant.
   */

  if (
    req.user.role === 'cafe_admin' &&
    Number(req.user.restaurant_id) !==
      Number(restaurant.id)
  ) {

    res.status(403).json({
      ok: false,
      message:
        'You can only manage your own restaurant profile.'
    });

    return null;

  }

  /*
   * Disabled restaurants cannot
   * be edited.
   */

  if (
    restaurant.status !== 'active'
  ) {

    res.status(403).json({
      ok: false,
      message:
        'Restaurant is not active.'
    });

    return null;

  }

  return restaurant;

}


/*
|--------------------------------------------------------------------------
| GET RESTAURANT PROFILE - ADMIN
|--------------------------------------------------------------------------
*/

app.get(
  '/api/admin/profile/:slug',
  requireRestaurantAdmin,
  async (req, res) => {

    try {

      const { slug } =
        req.params;

      const restaurant =
        await getRestaurantForProfile(
          req,
          res,
          slug
        );

      if (!restaurant) {
        return;
      }

      /*
       * Get profile.
       */

      const profileResult =
        await pool.query(
          `
          SELECT
            phone_numbers,
            addresses,
            updated_at
          FROM restaurant_profiles
          WHERE restaurant_id = $1
          `,
          [restaurant.id]
        );

      /*
       * Create profile automatically
       * if it does not exist.
       */

      if (
        profileResult.rows.length === 0
      ) {

        await pool.query(
          `
          INSERT INTO restaurant_profiles
            (
              restaurant_id,
              phone_numbers,
              addresses
            )
          VALUES
            (
              $1,
              '[]'::jsonb,
              '[]'::jsonb
            )
          `,
          [restaurant.id]
        );

        return res.json({

          ok: true,

          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug
          },

          profile: {
            phone_numbers: [],
            addresses: []
          }

        });

      }

      const profile =
        profileResult.rows[0];

      res.json({

        ok: true,

        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug
        },

        profile: {
          phone_numbers:
            Array.isArray(profile.phone_numbers)
              ? profile.phone_numbers
              : [],

          addresses:
            Array.isArray(profile.addresses)
              ? profile.addresses
              : []
        }

      });

    } catch (error) {

      console.error(
        'Error loading restaurant profile:',
        error.message
      );

      res.status(500).json({
        ok: false,
        message:
          'Failed to load restaurant profile.'
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| SAVE RESTAURANT PROFILE - ADMIN
|--------------------------------------------------------------------------
*/

app.put(
  '/api/admin/profile/:slug',
  requireRestaurantAdmin,
  async (req, res) => {

    try {

      const { slug } =
        req.params;

      const restaurant =
        await getRestaurantForProfile(
          req,
          res,
          slug
        );

      if (!restaurant) {
        return;
      }

      let {
        phone_numbers,
        addresses
      } = req.body || {};

      /*
       * Validate arrays.
       */

      if (
        !Array.isArray(phone_numbers)
      ) {

        phone_numbers = [];

      }

      if (
        !Array.isArray(addresses)
      ) {

        addresses = [];

      }

      /*
       * Clean phone numbers.
       */

      phone_numbers =
        phone_numbers
          .map(phone =>
            String(phone || '').trim()
          )
          .filter(Boolean)
          .slice(0, 10);

      /*
       * Clean addresses.
       *
       * Each address:
       *
       * {
       *   name: "Bole Branch",
       *   url: "https://maps.google.com/..."
       * }
       */

      addresses =
        addresses
          .map(address => {

            if (
              !address ||
              typeof address !== 'object'
            ) {

              return null;

            }

            return {

              name:
                String(
                  address.name || ''
                ).trim(),

              url:
                String(
                  address.url || ''
                ).trim()

            };

          })
          .filter(address =>
            address &&
            address.name
          )
          .slice(0, 10);

      /*
       * Save profile.
       */

      await pool.query(
        `
        INSERT INTO restaurant_profiles
          (
            restaurant_id,
            phone_numbers,
            addresses,
            updated_at
          )
        VALUES
          (
            $1,
            $2::jsonb,
            $3::jsonb,
            NOW()
          )

        ON CONFLICT (restaurant_id)

        DO UPDATE SET
          phone_numbers = EXCLUDED.phone_numbers,
          addresses = EXCLUDED.addresses,
          updated_at = NOW()
        `,
        [
          restaurant.id,
          JSON.stringify(phone_numbers),
          JSON.stringify(addresses)
        ]
      );

      /*
       * Clear customer cache.
       */

      menuCache.delete(
        restaurant.slug
      );

      res.json({

        ok: true,

        profile: {
          phone_numbers,
          addresses
        },

        message:
          'Restaurant profile saved successfully.'

      });

    } catch (error) {

      console.error(
        'Error saving restaurant profile:',
        error.message
      );

      res.status(500).json({
        ok: false,
        message:
          'Failed to save restaurant profile.'
      });

    }

  }
);




/*
|
--------------------------------------------------------------------------
| GET RESTAURANT MENU
|--------------------------------------------------------------------------
*/

app.get('/api/menu/:slug', async (req, res) => {

  try {

    const { slug } = req.params;

    /*
     * Return cached menu
     */

    if (menuCache.has(slug)) {

      console.log(
        `[cache] HIT ${slug}`
      );

      const cached =
        menuCache.get(slug);

      return res.json(cached);

    }

    console.log(
      `[cache] MISS ${slug}`
    );

    /*
     * Find restaurant
     */

    console.time(
      'restaurant-query'
    );

    const restaurantResult =
      await pool.query(
        `
        SELECT
          id,
          name,
          slug,
          status
        FROM restaurants
        WHERE slug = $1
        `,
        [slug]
      );

    console.timeEnd(
      'restaurant-query'
    );

    if (
      restaurantResult.rows.length === 0
    ) {

      return res.status(404).json({
        ok: false,
        message: 'Restaurant not found.'
      });

    }

    const restaurant =
      restaurantResult.rows[0];

    /*
     * Disabled restaurant
     */

    if (
      restaurant.status !== 'active'
    ) {

      return res.status(403).json({
        ok: false,
        message:
          `${restaurant.name} is temporarily unavailable. Please check back later.`
      });

    }

    /*
     * Load menu
     */

    console.time('menu-query');

    const menuResult =
      await pool.query(
        `
        SELECT menu
        FROM menu_data
        WHERE restaurant_id = $1
        `,
        [restaurant.id]
      );

    console.timeEnd('menu-query');

    if (
      menuResult.rows.length === 0
    ) {

      return res.status(404).json({
        ok: false,
        message:
          'Menu not found for this restaurant.'
      });

    }

    /*
 * Load restaurant profile
 */

const profileResult =
  await pool.query(
    `
    SELECT
      phone_numbers,
      addresses
    FROM restaurant_profiles
    WHERE restaurant_id = $1
    `,
    [restaurant.id]
  );

const profile =
  profileResult.rows.length > 0
    ? profileResult.rows[0]
    : {
        phone_numbers: [],
        addresses: []
      };

    /*
     * Response
     */

    const responseData = {

  ok: true,

  restaurant: {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug
  },

  profile: {

    phone_numbers:
      Array.isArray(profile.phone_numbers)
        ? profile.phone_numbers
        : [],

    addresses:
      Array.isArray(profile.addresses)
        ? profile.addresses
        : []

  },

  menu:
    menuResult.rows[0].menu

};

    /*
     * Cache
     */

    menuCache.set(
      slug,
      responseData
    );

    res.json(responseData);

  } catch (error) {

    console.error(
      'Error loading restaurant menu:',
      error.message
    );

    res.status(500).json({
      ok: false,
      message:
        'Failed to load restaurant menu.'
    });

  }

});

/*
|--------------------------------------------------------------------------
| TELEBIRR PAYMENT
|--------------------------------------------------------------------------
*/

app.post(
  '/api/payments/telebirr/create',
  (req, res) => {

    const {
      accountNumber,
      amount,
      items
    } = req.body || {};

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Array.isArray(items) ||
      !items.length
    ) {

      return res.status(400).json({
        ok: false,
        message:
          'A valid cart and amount are required.'
      });

    }

    if (!TELEBIRR_MERCHANT_ACCOUNT) {

      return res.status(503).json({

        ok: false,

        message:
          'Cafe Telebirr account is not configured. Set TELEBIRR_MERCHANT_ACCOUNT in the server environment.'

      });

    }

    const paymentId =
      `order-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    res.json({

      ok: true,

      paymentId,

      merchantAccount:
        TELEBIRR_MERCHANT_ACCOUNT

    });

  }
);

/*
|--------------------------------------------------------------------------
| SAVE RESTAURANT MENU
|--------------------------------------------------------------------------
*/

app.post(
  '/api/admin/menu/:slug',
  requireRestaurantAdmin,
  async (req, res) => {

    const { slug } = req.params;

    const { menu } = req.body;

    if (
      !menu ||
      typeof menu !== 'object' ||
      Array.isArray(menu)
    ) {

      return res.status(400).json({
        ok: false,
        message: 'Menu data is required.'
      });

    }

    try {

      /*
       * Find restaurant
       */

      const restaurantResult =
        await pool.query(
          `
          SELECT
            id,
            name,
            slug,
            status
          FROM restaurants
          WHERE slug = $1
          `,
          [slug]
        );

      if (
        restaurantResult.rows.length === 0
      ) {

        return res.status(404).json({
          ok: false,
          message:
            'Restaurant not found.'
        });

      }

      const restaurant =
        restaurantResult.rows[0];

      /*
       * Cafe admins can only
       * edit their own restaurant.
       */

      if (
        req.user.role === 'cafe_admin' &&
        Number(req.user.restaurant_id) !==
          Number(restaurant.id)
      ) {

        return res.status(403).json({
          ok: false,
          message:
            'You can only edit your own restaurant menu.'
        });

      }

      /*
       * Disabled restaurant
       */

      if (
        restaurant.status !== 'active'
      ) {

        return res.status(403).json({
          ok: false,
          message:
            'Restaurant is not active.'
        });

      }

      /*
       * Save menu
       */

      const menuResult =
        await pool.query(
          `
          UPDATE menu_data
          SET
            menu = $1,
            updated_at = NOW()
          WHERE restaurant_id = $2
          `,
          [
            menu,
            restaurant.id
          ]
        );

      /*
       * Clear cache
       */

      menuCache.delete(
        slug
      );

      /*
       * No menu record
       */

      if (
        menuResult.rowCount === 0
      ) {

        return res.status(404).json({
          ok: false,
          message:
            'Menu record not found for this restaurant.'
        });

      }

      console.log(
        `Menu saved for ${restaurant.name} (${restaurant.slug}).`
      );

      res.json({

        ok: true,

        message:
          `Menu saved for ${restaurant.name}.`

      });

    } catch (error) {

      console.error(
        'Error saving restaurant menu:',
        error.message
      );

      res.status(500).json({
        ok: false,
        message:
          'Failed to save restaurant menu.'
      });

    }

  }
);

/*
|--------------------------------------------------------------------------
| SUPER ADMIN: GET ALL RESTAURANTS
|--------------------------------------------------------------------------
*/

app.get(
  '/api/owner/restaurants',
  requireOwner,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            slug,
            status
          FROM restaurants
          ORDER BY id ASC
          `
        );

      res.json({

        ok: true,

        restaurants:
          result.rows

      });

    } catch (error) {

      console.error(
        'Error loading restaurants:',
        error.message
      );

      res.status(500).json({
        ok: false,
        message:
          'Failed to load restaurants.'
      });

    }

  }
);

/*
|--------------------------------------------------------------------------
| SUPER ADMIN: CREATE RESTAURANT + CAFE ADMIN
|--------------------------------------------------------------------------
*/

app.post(
  '/api/owner/restaurants',
  requireOwner,
  async (req, res) => {

    try {

      const {
        name,
        slug,
        adminEmail,
        adminPassword
      } = req.body;

      if (
        !name ||
        !slug ||
        !adminEmail ||
        !adminPassword
      ) {

        return res.status(400).json({
          ok: false,
          message:
            'Restaurant name, slug, admin email, and admin password are required.'
        });

      }

      const cleanName =
        name.trim();

      const cleanSlug =
        slug.trim().toLowerCase();

      const cleanEmail =
        adminEmail.trim().toLowerCase();

      /*
       * Check slug
       */

      const slugCheck =
        await pool.query(
          `
          SELECT id
          FROM restaurants
          WHERE slug = $1
          `,
          [cleanSlug]
        );

      if (
        slugCheck.rows.length > 0
      ) {

        return res.status(400).json({
          ok: false,
          message:
            'A restaurant with this slug already exists.'
        });

      }

      /*
       * Check email
       */

      const emailCheck =
        await pool.query(
          `
          SELECT id
          FROM users
          WHERE email = $1
          `,
          [cleanEmail]
        );

      if (
        emailCheck.rows.length > 0
      ) {

        return res.status(400).json({
          ok: false,
          message:
            'This admin email is already in use.'
        });

      }

      /*
       * Create restaurant
       */

      const result =
        await pool.query(
          `
          INSERT INTO restaurants
            (name, slug, status)
          VALUES
            ($1, $2, 'active')
          RETURNING
            id,
            name,
            slug,
            status
          `,
          [
            cleanName,
            cleanSlug
          ]
        );

      const restaurant =
        result.rows[0];

      /*
       * Create empty menu
       */

      await pool.query(
        `
        INSERT INTO menu_data
          (id, restaurant_id, menu)
        VALUES
          (
            (SELECT COALESCE(MAX(id), 0) + 1 FROM menu_data),
            $1,
            $2
          )
        `,
        [
          restaurant.id,
          {}
        ]
      );

      /*
       * Create cafe admin
       */

      await pool.query(
        `
        INSERT INTO users
          (
            email,
            password,
            role,
            restaurant_id
          )
        VALUES
          (
            $1,
            $2,
            'cafe_admin',
            $3
          )
        `,
        [
          cleanEmail,
          adminPassword,
          restaurant.id
        ]
      );

      res.status(201).json({

        ok: true,

        restaurant,

        admin: {
          email: cleanEmail,
          role: 'cafe_admin',
          restaurant_id:
            restaurant.id
        }

      });

    } catch (error) {

      console.error(
        'Error creating restaurant:',
        error.message
      );

      res.status(500).json({
        ok: false,
        message:
          'Failed to create restaurant.'
      });

    }

  }
);

/*
|--------------------------------------------------------------------------
| SUPER ADMIN: UPDATE RESTAURANT NAME + SLUG
|--------------------------------------------------------------------------
*/

app.put(
  '/api/owner/restaurants/:id',
  requireOwner,
  async (req, res) => {

    try {

      const restaurantId =
        Number(req.params.id);

      const {
        name,
        slug
      } = req.body;

      if (
        !restaurantId ||
        !name ||
        !slug
      ) {

        return res.status(400).json({
          ok: false,
          message:
            'Restaurant ID, name, and slug are required.'
        });

      }

      const cleanName =
        name.trim();

      const cleanSlug =
        slug.trim().toLowerCase();

      /*
       * Check duplicate slug
       */

      const slugCheck =
        await pool.query(
          `
          SELECT id
          FROM restaurants
          WHERE slug = $1
            AND id <> $2
          `,
          [
            cleanSlug,
            restaurantId
          ]
        );

      if (
        slugCheck.rows.length > 0
      ) {

        return res.status(400).json({
          ok: false,
          message:
            'Another restaurant already uses this slug.'
        });

      }

      /*
       * Update
       */

      const result =
        await pool.query(
          `
          UPDATE restaurants
          SET
            name = $1,
            slug = $2
          WHERE id = $3
          RETURNING
            id,
            name,
            slug,
            status
          `,
          [
            cleanName,
            cleanSlug,
            restaurantId
          ]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          ok: false,
          message:
            'Restaurant not found.'
        });

      }

      res.json({

        ok: true,

        restaurant:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        'Error updating restaurant:',
        error.message
      );

      res.status(500).json({
        ok: false,
        message:
          'Failed to update restaurant.'
      });

    }

  }
);

/*
|--------------------------------------------------------------------------
| SUPER ADMIN: UPDATE CAFE ADMIN EMAIL / PASSWORD
|--------------------------------------------------------------------------
*/

app.put(
  '/api/owner/restaurants/:id/admin',
  requireOwner,
  async (req, res) => {

    try {

      const restaurantId =
        Number(req.params.id);

      const {
        email,
        password
      } = req.body;

      if (!restaurantId) {

        return res.status(400).json({
          ok: false,
          message:
            'Restaurant ID is required.'
        });

      }

      if (
        !email &&
        !password
      ) {

        return res.status(400).json({
          ok: false,
          message:
            'Enter an email or password to update.'
        });

      }

      /*
       * Find cafe admin
       */

      const userResult =
        await pool.query(
          `
          SELECT
            id,
            email,
            password
          FROM users
          WHERE restaurant_id = $1
            AND role = 'cafe_admin'
          LIMIT 1
          `,
          [restaurantId]
        );

      if (
        userResult.rows.length === 0
      ) {

        return res.status(404).json({
          ok: false,
          message:
            'Cafe admin account not found.'
        });

      }

      const admin =
        userResult.rows[0];

      /*
       * Update email
       */

      if (email) {

        const cleanEmail =
          email.trim().toLowerCase();

        if (!cleanEmail) {

          return res.status(400).json({
            ok: false,
            message:
              'Admin email cannot be empty.'
          });

        }

        const emailCheck =
          await pool.query(
            `
            SELECT id
            FROM users
            WHERE email = $1
              AND id <> $2
            `,
            [
              cleanEmail,
              admin.id
            ]
          );

        if (
          emailCheck.rows.length > 0
        ) {

          return res.status(400).json({
            ok: false,
            message:
              'This email is already in use.'
          });

        }

        await pool.query(
          `
          UPDATE users
          SET email = $1
          WHERE id = $2
          `,
          [
            cleanEmail,
            admin.id
          ]
        );

      }

      /*
       * Update password
       */

      if (password) {

        await pool.query(
          `
          UPDATE users
          SET password = $1
          WHERE id = $2
          `,
          [
            password,
            admin.id
          ]
        );

      }

      /*
       * Return updated admin
       */

      const updatedResult =
        await pool.query(
          `
          SELECT
            id,
            email,
            role,
            restaurant_id
          FROM users
          WHERE id = $1
          `,
          [admin.id]
        );

      res.json({

        ok: true,

        admin:
          updatedResult.rows[0],

        message:
          'Admin account updated successfully.'

      });

    } catch (error) {

      console.error(
        'Error updating restaurant admin:',
        error.message
      );

      res.status(500).json({
        ok: false,
        message:
          'Failed to update admin account.'
      });

    }

  }
);

/*
|--------------------------------------------------------------------------
| SUPER ADMIN: ENABLE / DISABLE RESTAURANT
|--------------------------------------------------------------------------
*/

app.put(
  '/api/owner/restaurants/:id/status',
  requireOwner,
  async (req, res) => {

    try {

      const restaurantId =
        Number(req.params.id);

      const {
        status
      } = req.body;

      if (!restaurantId) {

        return res.status(400).json({
          ok: false,
          message:
            'Restaurant ID is required.'
        });

      }

      if (
        !['active', 'disabled']
          .includes(status)
      ) {

        return res.status(400).json({
          ok: false,
          message:
            'Status must be active or disabled.'
        });

      }

      const result =
        await pool.query(
          `
          UPDATE restaurants
          SET status = $1
          WHERE id = $2
          RETURNING
            id,
            name,
            slug,
            status
          `,
          [
            status,
            restaurantId
          ]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          ok: false,
          message:
            'Restaurant not found.'
        });

      }

      /*
       * Remove cached menu
       */

      menuCache.delete(
        result.rows[0].slug
      );

      res.json({

        ok: true,

        restaurant:
          result.rows[0],

        message:
          status === 'active'
            ? 'Restaurant enabled successfully.'
            : 'Restaurant disabled successfully.'

      });

    } catch (error) {

      console.error(
        'Error changing restaurant status:',
        error.message
      );

      res.status(500).json({
        ok: false,
        message:
          'Failed to change restaurant status.'
      });

    }

  }
);

/*
|--------------------------------------------------------------------------
| SUPER ADMIN: DELETE RESTAURANT
|--------------------------------------------------------------------------
*/

app.delete(
  '/api/owner/restaurants/:id',
  requireOwner,
  async (req, res) => {

    const client =
      await pool.connect();

    try {

      const restaurantId =
        Number(req.params.id);

      if (!restaurantId) {

        return res.status(400).json({
          ok: false,
          message:
            'Invalid restaurant ID.'
        });

      }

      await client.query(
        'BEGIN'
      );

      /*
       * Find restaurant
       */

      const restaurantResult =
        await client.query(
          `
          SELECT
            id,
            name,
            slug
          FROM restaurants
          WHERE id = $1
          `,
          [restaurantId]
        );

      if (
        restaurantResult.rows.length === 0
      ) {

        await client.query(
          'ROLLBACK'
        );

        return res.status(404).json({
          ok: false,
          message:
            'Restaurant not found.'
        });

      }

      const restaurant =
        restaurantResult.rows[0];

      /*
       * Delete cafe admin
       */

      await client.query(
        `
        DELETE FROM users
        WHERE restaurant_id = $1
          AND role = 'cafe_admin'
        `,
        [restaurantId]
      );

      /*
       * Delete menu
       */

      await client.query(
        `
        DELETE FROM menu_data
        WHERE restaurant_id = $1
        `,
        [restaurantId]
      );

      /*
       * Delete restaurant
       */

      await client.query(
        `
        DELETE FROM restaurants
        WHERE id = $1
        `,
        [restaurantId]
      );

      await client.query(
        'COMMIT'
      );

      /*
       * Clear cache
       */

      menuCache.delete(
        restaurant.slug
      );

      res.json({

        ok: true,

        message:
          `${restaurant.name} deleted successfully.`

      });

    } catch (error) {

      await client.query(
        'ROLLBACK'
      );

      console.error(
        'Error deleting restaurant:',
        error.message
      );

      res.status(500).json({
        ok: false,
        message:
          'Failed to delete restaurant.'
      });

    } finally {

      client.release();

    }

  }
);

/*
|--------------------------------------------------------------------------
| FALLBACK FOR UNMATCHED API ROUTES
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {

  if (
    req.path &&
    req.path.startsWith('/api/')
  ) {

    console.log(
      `[api] No matching route for ${req.method} ${req.path}`
    );

    return res.status(404).json({
      ok: false,
      message:
        'API route not found'
    });

  }

  next();

});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  '0.0.0.0',
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

  }
);