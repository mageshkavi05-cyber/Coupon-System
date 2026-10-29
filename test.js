const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('./index');

test('health endpoint reports V2', async () => {
  const response = await request(app).get('/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.version, 'v2');
});

test('creates and validates a coupon', async () => {
  const code = 'V2TEST1001';

  const created = await request(app)
    .post('/coupons')
    .send({
      code,
      discountType: 'percentage',
      discountValue: 10,
      usageLimit: 5
    });

  assert.equal(created.status, 201);
  assert.equal(created.body.coupon.code, code);

  const validated = await request(app)
    .get(`/coupons/validate/${code.toLowerCase()}`);

  assert.equal(validated.status, 200);
  assert.equal(validated.body.valid, true);
});

test('rejects duplicate coupon codes', async () => {
  const code = 'V2DUPLICATE1001';
  const coupon = {
    code,
    discountType: 'fixed',
    discountValue: 25
  };

  const first = await request(app)
    .post('/coupons')
    .send(coupon);

  const duplicate = await request(app)
    .post('/coupons')
    .send({ ...coupon, code: code.toLowerCase() });

  assert.equal(first.status, 201);
  assert.equal(duplicate.status, 409);
});

test('returns invalid when a coupon does not exist', async () => {
  const response = await request(app)
    .get('/coupons/validate/DOESNOTEXISTV2');

  assert.equal(response.status, 404);
  assert.equal(response.body.valid, false);
});
