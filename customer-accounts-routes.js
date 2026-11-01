'use strict';

/* ================================================================
   CUSTOMER ACCOUNTS (sign-up / log-in with SMS OTP)
   ----------------------------------------------------------------
   Public customer routes   : /api/customer/:slug/...
   Cafe-admin routes        : /api/admin/branches/:slug
                              /api/admin/customer-accounts/:slug
   Gate                     : the super-admin "Self-Ordering" switch
                              (restaurant_payment_settings
                               .super_admin_order_now_enabled)
   ================================================================ */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const OTP_TTL_MS = 5 * 60 * 1000;          // code is valid for 5 minutes
const OTP_RESEND_WAIT_S = 45;              // minimum gap between codes
const OTP_MAX_PER_HOUR = 5;                // codes per phone per hour
const OTP_MAX_ATTEMPTS = 5;                // wrong guesses per code
const SESSION_DAYS = 30;                   // customer login lasts 30 days
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 100;
const LOGIN_MAX_FAILS = 5;                 // wrong passwords before a temporary lock
const LOGIN_LOCK_MINUTES = 15;

/* ---------------- helpers ---------------- */

function normalizePhone(input) {
  let raw = String(input || '').trim();
  if (!raw) return null;

  const hasPlus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (hasPlus) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('251')) {
    // already Ethiopian international without +
  } else if (digits.startsWith('0') && digits.length === 10) {
    digits = '251' + digits.slice(1);          // 09XXXXXXXX -> 2519XXXXXXXX
  } else if (digits.length === 9 && /^[79]/.test(digits)) {
    digits = '251' + digits;                   // 9XXXXXXXX  -> 2519XXXXXXXX
  } else {
    return null;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith('251') && digits.length !== 12) return null;
  return '+' + digits;
}

function cleanName(input) {
  return String(input || '').replace(/\s+/g, ' ').trim();
}

function jwtSecret() {
  const base = process.env.JWT_SECRET;
  if (!base) throw new Error('JWT_SECRET is not configured.');
  // Separate signing key so a customer token can never be used as an admin token.
  return base + ':customer-account';
}

function hashOtp(code, restaurantId, phone) {
  return crypto
    .createHmac('sha256', jwtSecret())
    .update(`${restaurantId}|${phone}|${code}`)
    .digest('hex');
}

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a), 'hex');
  const y = Buffer.from(String(b), 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function bearerToken(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

/* ---------------- passwords ---------------- */

const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '11111111', '00000000', '87654321',
  'password', 'password1', 'qwertyui', 'qwerty123', 'abcd1234', 'iloveyou', 'welcome1'
]);

// Returns an error message, or '' when the password is acceptable.
function validatePassword(password, confirm) {
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  if (confirm !== undefined && password !== confirm) return 'Passwords do not match.';
  if (COMMON_PASSWORDS.has(password.toLowerCase()) || /^(.)\1+$/.test(password)) {
    return 'That password is too easy to guess. Please choose another.';
  }
  return '';
}

function scryptAsync(password, salt, n) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password.normalize('NFKC'), salt, 64, { N: n, r: 8, p: 1, maxmem: 128 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)));
  });
}

async function hashPassword(password) {
  const n = 16384;
  const salt = crypto.randomBytes(16);
  const key = await scryptAsync(password, salt, n);
  return `scrypt$${n}$${salt.toString('hex')}$${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const n = Number(parts[1]);
  const expected = Buffer.from(parts[3], 'hex');
  const key = await scryptAsync(password, Buffer.from(parts[2], 'hex'), n);
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// Used for unknown phone numbers so the response time does not reveal whether an account exists.
let dummyHashPromise = null;
const dummyHash = () => (dummyHashPromise = dummyHashPromise || hashPassword('not-a-real-password'));

/* ---------------- code delivery: SMS + WhatsApp ---------------- */

const env = name => String(process.env[name] || '').trim();

function smsConfigured() {
  const provider = env('SMS_PROVIDER').toLowerCase();
  if (provider === 'smsethiopia') return !!env('SMS_ETHIOPIA_API_KEY');
  if (provider === 'afromessage') return !!env('AFROMESSAGE_TOKEN');
  if (provider === 'twilio') return !!(env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_FROM'));
  return false;
}

function whatsappConfigured() {
  const provider = env('WHATSAPP_PROVIDER').toLowerCase();
  if (provider === 'meta') {
    return !!(env('WHATSAPP_TOKEN') && env('WHATSAPP_PHONE_NUMBER_ID') && env('WHATSAPP_TEMPLATE_NAME'));
  }
  if (provider === 'twilio') {
    return !!(env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_WHATSAPP_FROM'));
  }
  return false;
}

// Channels the customer may choose from, in display order.
// OTP_CHANNELS (optional, e.g. "whatsapp,sms") controls the order / restricts the list.
function availableChannels() {
  const ready = { sms: smsConfigured(), whatsapp: whatsappConfigured() };
  const wanted = (env('OTP_CHANNELS') || 'sms,whatsapp')
    .toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  return wanted.filter((c, i) => ready[c] && wanted.indexOf(c) === i);
}

async function postJson(url, headers, body, label) {
  const response = await fetch(url, { method: 'POST', headers, body });
  const data = await response.json().catch(() => ({}));
  return { response, data, label };
}

async function sendSms(phone, text) {
  const provider = env('SMS_PROVIDER').toLowerCase();

  if (provider === 'smsethiopia') {
    const { response, data } = await postJson(
      'https://smsethiopia.com/api/sms/send',
      { KEY: env('SMS_ETHIOPIA_API_KEY'), 'Content-Type': 'application/json' },
      JSON.stringify({ msisdn: phone.replace(/^\+/, ''), text })
    );

    if (!response.ok || !(String(data.status || '').toLowerCase() === 'success' || data.sent === true)) {
      const reason = String(data.message || data.error || data.description || 'Unknown provider error').slice(0, 200);
      throw new Error('SMSEthiopia rejected SMS (HTTP ' + response.status + '): ' + reason);
    }
    return;
  }

  if (provider === 'afromessage') {
    const payload = { to: phone, message: text };
    if (env('AFROMESSAGE_IDENTIFIER_ID')) payload.from = env('AFROMESSAGE_IDENTIFIER_ID');
    if (env('AFROMESSAGE_SENDER_NAME')) payload.sender = env('AFROMESSAGE_SENDER_NAME');

    const { response, data } = await postJson(
      'https://api.afromessage.com/api/send',
      { Authorization: `Bearer ${env('AFROMESSAGE_TOKEN')}`, 'Content-Type': 'application/json' },
      JSON.stringify(payload)
    );
    if (!response.ok || String(data.acknowledge || '').toLowerCase() !== 'success') {
      throw new Error(`AfroMessage rejected the SMS: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return;
  }

  if (provider === 'twilio') {
    const from = env('TWILIO_FROM');
    const body = new URLSearchParams({ To: phone, Body: text });
    if (/^MG/i.test(from)) body.set('MessagingServiceSid', from);
    else body.set('From', from);

    const { response, data } = await postJson(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env('TWILIO_ACCOUNT_SID'))}/Messages.json`,
      {
        Authorization: 'Basic ' + Buffer.from(`${env('TWILIO_ACCOUNT_SID')}:${env('TWILIO_AUTH_TOKEN')}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    );
    if (!response.ok) throw new Error(`Twilio rejected the SMS: ${JSON.stringify(data).slice(0, 300)}`);
    return;
  }

  throw new Error('SMS is not configured.');
}

async function sendWhatsapp(phone, code, text) {
  const provider = env('WHATSAPP_PROVIDER').toLowerCase();

  // Meta WhatsApp Cloud API: needs an approved "authentication" message template.
  if (provider === 'meta') {
    const version = env('WHATSAPP_API_VERSION') || 'v25.0';
    const components = [{ type: 'body', parameters: [{ type: 'text', text: code }] }];
    // Authentication templates carry a "copy code" button that also needs the code.
    if (env('WHATSAPP_TEMPLATE_BUTTON').toLowerCase() !== 'false') {
      components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] });
    }

    const { response, data } = await postJson(
      `https://graph.facebook.com/${version}/${encodeURIComponent(env('WHATSAPP_PHONE_NUMBER_ID'))}/messages`,
      { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
      JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: env('WHATSAPP_TEMPLATE_NAME'),
          language: { code: env('WHATSAPP_TEMPLATE_LANG') || 'en_US' },
          components
        }
      })
    );
    if (!response.ok || !Array.isArray(data.messages) || !data.messages.length) {
      throw new Error(`WhatsApp (Meta) rejected the message: ${JSON.stringify(data).slice(0, 400)}`);
    }
    return;
  }

  // Twilio WhatsApp (sandbox for testing, or an approved sender / content template)
  if (provider === 'twilio') {
    let from = env('TWILIO_WHATSAPP_FROM');
    if (!/^whatsapp:/i.test(from)) from = 'whatsapp:' + from;

    const body = new URLSearchParams({ To: 'whatsapp:' + phone, From: from });
    if (env('TWILIO_WHATSAPP_CONTENT_SID')) {
      body.set('ContentSid', env('TWILIO_WHATSAPP_CONTENT_SID'));
      body.set('ContentVariables', JSON.stringify({ 1: code }));
    } else {
      body.set('Body', text);
    }

    const { response, data } = await postJson(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env('TWILIO_ACCOUNT_SID'))}/Messages.json`,
      {
        Authorization: 'Basic ' + Buffer.from(`${env('TWILIO_ACCOUNT_SID')}:${env('TWILIO_AUTH_TOKEN')}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    );
    if (!response.ok) throw new Error(`Twilio rejected the WhatsApp message: ${JSON.stringify(data).slice(0, 300)}`);
    return;
  }

  throw new Error('WhatsApp is not configured.');
}

async function deliverCode(channel, phone, code, cafeName) {
  const text = `${code} is your ${cafeName} verification code. It expires in 5 minutes.`;
  if (channel === 'whatsapp') return sendWhatsapp(phone, code, text);
  return sendSms(phone, text);
}

/* ---------------- module ---------------- */

module.exports = function registerCustomerAccounts(app, deps) {
  const { pool, requireRestaurantAdmin, getAdminRestaurant } = deps;

  /* ---------- database ---------- */

  async function ensureTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_accounts (
        id BIGSERIAL PRIMARY KEY,
        restaurant_id INTEGER NOT NULL
          REFERENCES restaurants(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ,
        UNIQUE (restaurant_id, phone)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_otps (
        id BIGSERIAL PRIMARY KEY,
        restaurant_id INTEGER NOT NULL
          REFERENCES restaurants(id) ON DELETE CASCADE,
        phone TEXT NOT NULL,
        purpose TEXT NOT NULL,
        full_name TEXT NOT NULL DEFAULT '',
        code_hash TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        consumed BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Password login (added after the first version)
    await pool.query(`
      ALTER TABLE customer_accounts
        ADD COLUMN IF NOT EXISTS password_hash TEXT,
        ADD COLUMN IF NOT EXISTS failed_logins INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ
    `);
    await pool.query(`
      ALTER TABLE customer_otps ADD COLUMN IF NOT EXISTS password_hash TEXT
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_otps_lookup
      ON customer_otps (restaurant_id, phone, created_at DESC)
    `);

    await pool.query(`
      ALTER TABLE customer_orders
      ADD COLUMN IF NOT EXISTS customer_account_id BIGINT
        REFERENCES customer_accounts(id) ON DELETE SET NULL
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_orders_account
      ON customer_orders (customer_account_id, created_at DESC)
    `);
  }

  /* ---------- restaurant + super-admin switch ---------- */

  async function loadRestaurant(slug) {
    const found = await pool.query(
      `SELECT id, name, slug
         FROM restaurants
        WHERE slug = $1 AND status = 'active'
        LIMIT 1`,
      [String(slug || '').trim()]
    );
    return found.rows[0] || null;
  }

  // Same flag the super admin toggles with "Disable / Enable Self-Ordering".
  async function isSelfOrderingEnabled(restaurantId) {
    const result = await pool.query(
      `SELECT super_admin_order_now_enabled
         FROM restaurant_payment_settings
        WHERE restaurant_id = $1
        LIMIT 1`,
      [restaurantId]
    );
    return result.rows.length === 0 ||
      result.rows[0].super_admin_order_now_enabled !== false;
  }

  /* ---------- customer session ---------- */

  function signSession(account) {
    return jwt.sign(
      { type: 'customer', cid: Number(account.id), rid: Number(account.restaurant_id) },
      jwtSecret(),
      { expiresIn: `${SESSION_DAYS}d` }
    );
  }

  // Returns the account row or null. Never throws for bad tokens.
  async function getCustomerFromRequest(req, restaurantId) {
    const token = bearerToken(req);
    if (!token) return null;

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret());
    } catch (_) {
      return null;
    }

    if (!decoded || decoded.type !== 'customer') return null;
    if (Number(decoded.rid) !== Number(restaurantId)) return null;

    const found = await pool.query(
      `SELECT id, restaurant_id, full_name, phone, created_at
         FROM customer_accounts
        WHERE id = $1 AND restaurant_id = $2
        LIMIT 1`,
      [Number(decoded.cid), Number(restaurantId)]
    );
    return found.rows[0] || null;
  }

  // Loads restaurant, checks the super-admin switch, checks the customer.
  async function requireCustomer(req, res, next) {
    try {
      const restaurant = await loadRestaurant(req.params.slug);
      if (!restaurant) {
        return res.status(404).json({ ok: false, message: 'Cafe not found.' });
      }
      if (!(await isSelfOrderingEnabled(restaurant.id))) {
        return res.status(403).json({
          ok: false,
          code: 'self_ordering_disabled',
          message: 'Customer accounts are not available for this cafe right now.'
        });
      }
      const customer = await getCustomerFromRequest(req, restaurant.id);
      if (!customer) {
        return res.status(401).json({
          ok: false,
          code: 'login_required',
          message: 'Please log in again.'
        });
      }
      req.restaurant = restaurant;
      req.customer = customer;
      return next();
    } catch (error) {
      console.error('[customer:auth] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to verify your account.' });
    }
  }

  const publicCustomer = account => ({
    id: Number(account.id),
    full_name: account.full_name,
    phone: account.phone,
    created_at: account.created_at
  });

  /* ================================================================
     PUBLIC: which ways can the code be sent? (no secrets are exposed)
     ================================================================ */

  app.get('/api/customer/:slug/otp-options', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const restaurant = await loadRestaurant(req.params.slug);
      if (!restaurant) return res.status(404).json({ ok: false, message: 'Cafe not found.' });
      return res.json({ ok: true, channels: availableChannels() });
    } catch (error) {
      console.error('[customer:otp-options] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to load options.' });
    }
  });

  /* ================================================================
     PUBLIC: request a code
     ================================================================ */

  app.post('/api/customer/:slug/request-otp', async (req, res) => {
    res.set('Cache-Control', 'no-store');

    try {
      const restaurant = await loadRestaurant(req.params.slug);
      if (!restaurant) {
        return res.status(404).json({ ok: false, message: 'Cafe not found.' });
      }

      if (!(await isSelfOrderingEnabled(restaurant.id))) {
        return res.status(403).json({
          ok: false,
          code: 'self_ordering_disabled',
          message: 'Customer accounts are not available for this cafe right now.'
        });
      }

      // OTP is only used to create an account ("signup") or to recover a password ("reset").
      // Normal log-in uses phone + password (see /login).
      const mode = String(req.body?.mode || '').trim();
      if (mode !== 'signup' && mode !== 'reset') {
        return res.status(400).json({ ok: false, message: 'Invalid request.' });
      }

      const phone = normalizePhone(req.body?.phone);
      if (!phone) {
        return res.status(400).json({
          ok: false,
          message: 'Enter a valid phone number, for example 0912345678.'
        });
      }

      let fullName = '';
      if (mode === 'signup') {
        fullName = cleanName(req.body?.full_name);
        if (fullName.length < 2 || fullName.length > 120) {
          return res.status(400).json({ ok: false, message: 'Enter your full name.' });
        }
      }

      // The (new) password is checked now and stored hashed with the code;
      // it only takes effect once the phone number is confirmed.
      const password = String(req.body?.password ?? '');
      const passwordProblem = validatePassword(password, String(req.body?.confirm_password ?? ''));
      if (passwordProblem) {
        return res.status(400).json({ ok: false, code: 'bad_password', message: passwordProblem });
      }

      const existing = await pool.query(
        `SELECT id FROM customer_accounts
          WHERE restaurant_id = $1 AND phone = $2
          LIMIT 1`,
        [restaurant.id, phone]
      );

      if (mode === 'signup' && existing.rows.length) {
        return res.status(409).json({
          ok: false,
          code: 'account_exists',
          message: 'This phone number already has an account. Please log in with your password.'
        });
      }
      if (mode === 'reset' && !existing.rows.length) {
        return res.status(404).json({
          ok: false,
          code: 'account_not_found',
          message: 'No account found for this number. Please create an account first.'
        });
      }

      // Rate limits (per cafe + phone)
      const recent = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::int AS last_hour,
           MAX(created_at) AS last_sent,
           EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))::int AS seconds_since
         FROM customer_otps
         WHERE restaurant_id = $1 AND phone = $2`,
        [restaurant.id, phone]
      );
      const stats = recent.rows[0] || {};
      if (stats.last_sent && stats.seconds_since < OTP_RESEND_WAIT_S) {
        return res.status(429).json({
          ok: false,
          message: `Please wait ${OTP_RESEND_WAIT_S - stats.seconds_since} seconds before requesting another code.`
        });
      }
      if (Number(stats.last_hour) >= OTP_MAX_PER_HOUR) {
        return res.status(429).json({
          ok: false,
          message: 'Too many codes requested. Please try again in an hour.'
        });
      }

      const code = String(crypto.randomInt(100000, 1000000));
      const devMode = String(process.env.OTP_DEV_MODE || '').toLowerCase() === 'true';
      const channels = availableChannels();

      // Which way should the code travel?
      const asked = String(req.body?.channel || '').trim().toLowerCase();
      let channel = '';
      if (channels.length) {
        if (asked && !channels.includes(asked)) {
          return res.status(400).json({ ok: false, message: 'That delivery method is not available.' });
        }
        channel = asked || channels[0];
      } else if (!devMode) {
        console.error('[customer:otp] No SMS/WhatsApp provider configured and OTP_DEV_MODE is not true.');
        return res.status(503).json({
          ok: false,
          message: 'Verification messages are not set up yet. Please contact the cafe.'
        });
      }

      // Older unused codes for this phone become invalid.
      await pool.query(
        `UPDATE customer_otps SET consumed = TRUE
          WHERE restaurant_id = $1 AND phone = $2 AND consumed = FALSE`,
        [restaurant.id, phone]
      );

      const passwordHash = await hashPassword(password);

      const inserted = await pool.query(
        `INSERT INTO customer_otps
           (restaurant_id, phone, purpose, full_name, code_hash, password_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '5 minutes')
         RETURNING id`,
        [restaurant.id, phone, mode, fullName, hashOtp(code, restaurant.id, phone), passwordHash]
      );

      // Housekeeping: drop codes older than a day.
      pool.query(`DELETE FROM customer_otps WHERE created_at < NOW() - INTERVAL '1 day'`)
        .catch(() => {});

      const reply = {
        ok: true,
        phone,
        channel: channel || 'screen',
        channels,
        expires_in: Math.round(OTP_TTL_MS / 1000),
        resend_in: OTP_RESEND_WAIT_S
      };

      if (channel) {
        try {
          await deliverCode(channel, phone, code, restaurant.name);
        } catch (sendError) {
          console.error(`[customer:otp] ${channel} delivery failed:`, sendError.message);
          await pool.query('UPDATE customer_otps SET consumed = TRUE WHERE id = $1', [inserted.rows[0].id]);
          const other = channels.filter(c => c !== channel);
          return res.status(502).json({
            ok: false,
            message: channel === 'whatsapp'
              ? 'We could not send the WhatsApp message. Check the number has WhatsApp' +
                (other.length ? ', or choose SMS.' : '.')
              : 'We could not send the SMS. Check the number' +
                (other.length ? ', or choose WhatsApp.' : '.')
          });
        }
        reply.message = channel === 'whatsapp'
          ? 'We sent a 6-digit code to your WhatsApp.'
          : 'We sent a 6-digit code by SMS.';
      } else {
        // Test mode only (no provider configured): show the code on screen + server log.
        console.log(`[customer:otp] TEST MODE code for ${phone} (${restaurant.slug}): ${code}`);
        reply.dev_otp = code;
        reply.message = 'Test mode: the code is shown below.';
      }

      return res.json(reply);
    } catch (error) {
      console.error('[customer:request-otp] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to send the code right now.' });
    }
  });

  /* ================================================================
     PUBLIC: verify the code (creates the account on sign-up)
     ================================================================ */

  app.post('/api/customer/:slug/verify-otp', async (req, res) => {
    res.set('Cache-Control', 'no-store');

    try {
      const restaurant = await loadRestaurant(req.params.slug);
      if (!restaurant) {
        return res.status(404).json({ ok: false, message: 'Cafe not found.' });
      }
      if (!(await isSelfOrderingEnabled(restaurant.id))) {
        return res.status(403).json({
          ok: false,
          code: 'self_ordering_disabled',
          message: 'Customer accounts are not available for this cafe right now.'
        });
      }

      const mode = String(req.body?.mode || '').trim();
      const phone = normalizePhone(req.body?.phone);
      const code = String(req.body?.code || '').replace(/\D/g, '');

      if ((mode !== 'signup' && mode !== 'reset') || !phone || code.length !== 6) {
        return res.status(400).json({ ok: false, message: 'Enter the 6-digit code.' });
      }

      const otpResult = await pool.query(
        `SELECT id, full_name, code_hash, password_hash, attempts
           FROM customer_otps
          WHERE restaurant_id = $1 AND phone = $2 AND purpose = $3
            AND consumed = FALSE AND expires_at > NOW()
          ORDER BY id DESC
          LIMIT 1`,
        [restaurant.id, phone, mode]
      );

      if (!otpResult.rows.length) {
        return res.status(400).json({
          ok: false,
          code: 'otp_expired',
          message: 'This code has expired. Please request a new one.'
        });
      }

      const otp = otpResult.rows[0];

      if (otp.attempts >= OTP_MAX_ATTEMPTS) {
        return res.status(429).json({
          ok: false,
          code: 'otp_locked',
          message: 'Too many wrong attempts. Please request a new code.'
        });
      }

      if (!safeEqualHex(otp.code_hash, hashOtp(code, restaurant.id, phone))) {
        await pool.query('UPDATE customer_otps SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
        const left = Math.max(0, OTP_MAX_ATTEMPTS - (otp.attempts + 1));
        return res.status(400).json({
          ok: false,
          code: 'otp_wrong',
          message: left > 0
            ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
            : 'Incorrect code. Please request a new code.'
        });
      }

      if (!otp.password_hash) {
        return res.status(400).json({
          ok: false,
          code: 'otp_expired',
          message: 'Please start again and request a new code.'
        });
      }

      // Burn the code atomically so it can never be used twice.
      const burned = await pool.query(
        `UPDATE customer_otps SET consumed = TRUE
          WHERE id = $1 AND consumed = FALSE
          RETURNING id`,
        [otp.id]
      );
      if (!burned.rows.length) {
        return res.status(400).json({
          ok: false,
          code: 'otp_expired',
          message: 'This code has already been used. Please request a new one.'
        });
      }

      let account;

      if (mode === 'signup') {
        const created = await pool.query(
          `INSERT INTO customer_accounts (restaurant_id, full_name, phone, password_hash, last_login_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (restaurant_id, phone)
           DO UPDATE SET last_login_at = NOW()
           RETURNING id, restaurant_id, full_name, phone, created_at`,
          [restaurant.id, otp.full_name || 'Customer', phone, otp.password_hash]
        );
        account = created.rows[0];
      } else {
        const found = await pool.query(
          `UPDATE customer_accounts
              SET password_hash = $3, failed_logins = 0, locked_until = NULL, last_login_at = NOW()
            WHERE restaurant_id = $1 AND phone = $2
            RETURNING id, restaurant_id, full_name, phone, created_at`,
          [restaurant.id, phone, otp.password_hash]
        );
        account = found.rows[0];
        if (!account) {
          return res.status(404).json({
            ok: false,
            code: 'account_not_found',
            message: 'No account found for this number. Please create an account first.'
          });
        }
      }

      return res.json({
        ok: true,
        message: mode === 'signup' ? 'Your account is ready.' : 'Your password was updated. You are logged in.',
        token: signSession(account),
        customer: publicCustomer(account)
      });
    } catch (error) {
      console.error('[customer:verify-otp] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to verify the code right now.' });
    }
  });

  /* ================================================================
     PUBLIC: log in with phone + password (no code needed)
     ================================================================ */

  app.post('/api/customer/:slug/login', async (req, res) => {
    res.set('Cache-Control', 'no-store');

    try {
      const restaurant = await loadRestaurant(req.params.slug);
      if (!restaurant) {
        return res.status(404).json({ ok: false, message: 'Cafe not found.' });
      }
      if (!(await isSelfOrderingEnabled(restaurant.id))) {
        return res.status(403).json({
          ok: false,
          code: 'self_ordering_disabled',
          message: 'Customer accounts are not available for this cafe right now.'
        });
      }

      const phone = normalizePhone(req.body?.phone);
      const password = String(req.body?.password ?? '');
      if (!phone || !password) {
        return res.status(400).json({ ok: false, message: 'Enter your phone number and password.' });
      }

      const wrong = () => res.status(401).json({
        ok: false,
        code: 'bad_credentials',
        message: 'Incorrect phone number or password.'
      });

      const found = await pool.query(
        `SELECT id, restaurant_id, full_name, phone, created_at,
                password_hash, failed_logins, locked_until
           FROM customer_accounts
          WHERE restaurant_id = $1 AND phone = $2
          LIMIT 1`,
        [restaurant.id, phone]
      );
      const account = found.rows[0];

      if (password.length > PASSWORD_MAX) {
        return wrong();
      }

      if (!account) {
        await verifyPassword(password, await dummyHash());   // same timing as a real check
        return wrong();
      }

      const lockedFor = account.locked_until ? new Date(account.locked_until).getTime() - Date.now() : 0;
      if (lockedFor > 0) {
        return res.status(429).json({
          ok: false,
          code: 'login_locked',
          message: `Too many wrong attempts. Try again in ${Math.ceil(lockedFor / 60000)} minute(s), or tap "Forgot password?".`
        });
      }

      if (!account.password_hash) {
        return res.status(401).json({
          ok: false,
          code: 'password_not_set',
          message: 'Please set a password for your account: tap "Forgot password?".'
        });
      }

      if (!(await verifyPassword(password, account.password_hash))) {
        const failed = await pool.query(
          `UPDATE customer_accounts SET
             failed_logins = CASE WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN 1 ELSE failed_logins + 1 END,
             locked_until = CASE
               WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN 1 ELSE failed_logins + 1 END) >= $2::int
                 THEN NOW() + make_interval(mins => $3::int)
               WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN NULL
               ELSE locked_until END
           WHERE id = $1
           RETURNING locked_until`,
          [account.id, LOGIN_MAX_FAILS, LOGIN_LOCK_MINUTES]
        );
        const lock = failed.rows[0]?.locked_until;
        if (lock && new Date(lock).getTime() > Date.now()) {
          return res.status(429).json({
            ok: false,
            code: 'login_locked',
            message: `Too many wrong attempts. Try again in ${LOGIN_LOCK_MINUTES} minutes, or tap "Forgot password?".`
          });
        }
        return wrong();
      }

      await pool.query(
        `UPDATE customer_accounts
            SET failed_logins = 0, locked_until = NULL, last_login_at = NOW()
          WHERE id = $1`,
        [account.id]
      );

      return res.json({
        ok: true,
        message: 'Welcome back!',
        token: signSession(account),
        customer: publicCustomer(account)
      });
    } catch (error) {
      console.error('[customer:login] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to log in right now.' });
    }
  });

  /* ================================================================
     CUSTOMER (logged in): profile + own orders
     ================================================================ */

  app.get('/api/customer/:slug/me', requireCustomer, (req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json({ ok: true, customer: publicCustomer(req.customer) });
  });

  app.get('/api/customer/:slug/orders', requireCustomer, async (req, res) => {
    res.set('Cache-Control', 'no-store');

    try {
      const result = await pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM customer_orders AS earlier
             WHERE earlier.restaurant_id = customer_orders.restaurant_id
               AND earlier.id <= customer_orders.id) AS display_number,
           id, status, created_at, preparing_at, ready_at, completed_at,
           branch_name, order_type, table_number, customer_address, items, total
         FROM customer_orders
         WHERE restaurant_id = $1 AND customer_account_id = $2
         ORDER BY created_at DESC, id DESC
         LIMIT 100`,
        [req.restaurant.id, req.customer.id]
      );

      return res.json({
        ok: true,
        orders: result.rows.map(order => ({
          ...order,
          total: Number(order.total),
          items: Array.isArray(order.items) ? order.items : []
        }))
      });
    } catch (error) {
      console.error('[customer:orders] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to load your orders.' });
    }
  });

  /* ================================================================
     CAFE ADMIN: branches (for the branch filter) + customer accounts
     ================================================================ */

  function branchFilter(req) {
    const value = Number(req.query.branch_id);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  app.get('/api/admin/branches/:slug', requireRestaurantAdmin, async (req, res) => {
    try {
      const restaurant = await getAdminRestaurant(req, res);
      if (!restaurant) return;

      const result = await pool.query(
        `SELECT id, name
           FROM restaurant_payment_branches
          WHERE restaurant_id = $1
          ORDER BY id ASC`,
        [restaurant.id]
      );
      res.set('Cache-Control', 'no-store');
      return res.json({ ok: true, branches: result.rows });
    } catch (error) {
      console.error('[admin:branches] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to load branches.' });
    }
  });

  app.get('/api/admin/customer-accounts/:slug', requireRestaurantAdmin, async (req, res) => {
    try {
      const restaurant = await getAdminRestaurant(req, res);
      if (!restaurant) return;

      const branchId = branchFilter(req);

      const result = await pool.query(
        `SELECT a.id, a.full_name, a.phone, a.created_at, a.last_login_at,
                COUNT(o.id)::int AS order_count,
                COALESCE(SUM(o.total), 0) AS total_spent,
                MAX(o.created_at) AS last_order_at
           FROM customer_accounts a
           LEFT JOIN customer_orders o
                  ON o.customer_account_id = a.id
                 AND ($2::int IS NULL OR o.branch_id = $2::int)
          WHERE a.restaurant_id = $1
          GROUP BY a.id
         HAVING ($2::int IS NULL OR COUNT(o.id) > 0)
          ORDER BY a.created_at DESC, a.id DESC`,
        [restaurant.id, branchId]
      );

      const totalResult = await pool.query(
        'SELECT COUNT(*)::int AS total FROM customer_accounts WHERE restaurant_id = $1',
        [restaurant.id]
      );

      res.set('Cache-Control', 'no-store');
      return res.json({
        ok: true,
        total_accounts: totalResult.rows[0].total,
        accounts: result.rows.map(a => ({ ...a, total_spent: Number(a.total_spent) }))
      });
    } catch (error) {
      console.error('[admin:customer-accounts] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to load customer accounts.' });
    }
  });

  app.get('/api/admin/customer-accounts/:slug/:accountId/orders', requireRestaurantAdmin, async (req, res) => {
    try {
      const restaurant = await getAdminRestaurant(req, res);
      if (!restaurant) return;

      const accountId = Number(req.params.accountId);
      if (!Number.isSafeInteger(accountId) || accountId < 1) {
        return res.status(400).json({ ok: false, message: 'Invalid account.' });
      }

      const result = await pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM customer_orders AS earlier
             WHERE earlier.restaurant_id = customer_orders.restaurant_id
               AND earlier.id <= customer_orders.id) AS display_number,
           id, status, created_at, preparing_at, ready_at, completed_at,
           customer_name, customer_phone, branch_name, order_type,
           table_number, customer_address, items, total
         FROM customer_orders
         WHERE restaurant_id = $1
           AND customer_account_id = $2
           AND ($3::int IS NULL OR branch_id = $3::int)
         ORDER BY created_at DESC, id DESC`,
        [restaurant.id, accountId, branchFilter(req)]
      );

      res.set('Cache-Control', 'no-store');
      return res.json({
        ok: true,
        orders: result.rows.map(order => ({
          ...order,
          total: Number(order.total),
          items: Array.isArray(order.items) ? order.items : []
        }))
      });
    } catch (error) {
      console.error('[admin:customer-account-orders] Failed:', error);
      return res.status(500).json({ ok: false, message: 'Unable to load this customer\'s orders.' });
    }
  });

  return {
    ensureTables,
    isSelfOrderingEnabled,
    getCustomerFromRequest,
    normalizePhone
  };
};

module.exports.normalizePhone = normalizePhone;
module.exports.availableChannels = availableChannels;
module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
module.exports.validatePassword = validatePassword;
