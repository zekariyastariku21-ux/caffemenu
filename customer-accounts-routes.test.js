'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const registerCustomerAccounts = require('./customer-accounts-routes');

const restaurant = { id: 12 };
const customer = { id: 34 };

function registerRoutes(pool) {
  const routes = {};
  const app = {
    get(path, ...handlers) { routes['GET ' + path] = handlers[handlers.length - 1]; },
    post(path, ...handlers) { routes['POST ' + path] = handlers[handlers.length - 1]; },
    delete(path, ...handlers) { routes['DELETE ' + path] = handlers[handlers.length - 1]; }
  };

  registerCustomerAccounts(app, {
    pool,
    requireRestaurantAdmin: function () {},
    getAdminRestaurant: function () {}
  });
  return routes;
}

function makeResponse() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    set() { return this; },
    json(body) { this.body = body; return this; }
  };
}

function makePool(eligibleRows) {
  const queries = [];
  return {
    queries,
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('INSERT INTO customer_hidden_order_history')) return { rows: [] };
      return { rows: eligibleRows };
    }
  };
}

test('customers can hide only eligible history orders without deleting cafe records', async function () {
  const pool = makePool([{ id: '81' }]);
  const handler = registerRoutes(pool)['DELETE /api/customer/:slug/orders/:orderId'];
  const response = makeResponse();

  await handler({
    params: { orderId: '81' },
    restaurant,
    customer
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.match(pool.queries[0].sql, /customer_account_id = \$3 AND status = 'completed'/);
  assert.match(pool.queries[0].sql, /FROM admin_removed_orders/);
  assert.deepEqual(pool.queries[0].params, ['81', restaurant.id, customer.id]);
  assert.match(pool.queries[1].sql, /INSERT INTO customer_hidden_order_history/);
  assert.deepEqual(pool.queries[1].params, [restaurant.id, customer.id, '81']);
});

test('customers cannot hide an order that is not in their history', async function () {
  const pool = makePool([]);
  const handler = registerRoutes(pool)['DELETE /api/customer/:slug/orders/:orderId'];
  const response = makeResponse();

  await handler({
    params: { orderId: '81' },
    restaurant,
    customer
  }, response);

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.ok, false);
  assert.equal(pool.queries.length, 1);
});

test('history removal rejects invalid order IDs before querying the database', async function () {
  const pool = makePool([]);
  const handler = registerRoutes(pool)['DELETE /api/customer/:slug/orders/:orderId'];
  for (const orderId of ['0', '9223372036854775808']) {
    const response = makeResponse();
    await handler({ params: { orderId }, restaurant, customer }, response);
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.ok, false);
  }
  assert.equal(pool.queries.length, 0);
});
