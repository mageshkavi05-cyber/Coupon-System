const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('./index');

const couponCode = `V1TEST${Date.now()}`;

test('health endpoint reports V1', async () => {
    const response = await request(app).get('/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(response.body.version, 'v1');
});

test('creates a valid coupon', async () => {
    const response = await request(app)
        .post('/coupons')
        .send({
            code: couponCode,
            discountType: 'percentage',
            discountValue: 10
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.coupon.code, couponCode);
    assert.equal(response.body.coupon.discountValue, 10);
});

test('rejects a duplicate coupon code', async () => {
    const response = await request(app)
        .post('/coupons')
        .send({
            code: couponCode,
            discountType: 'percentage',
            discountValue: 10
        });

    assert.equal(response.status, 409);
});

test('rejects an invalid discount type', async () => {
    const response = await request(app)
        .post('/coupons')
        .send({
            code: 'INVALIDTYPE',
            discountType: 'invalid',
            discountValue: 10
        });

    assert.equal(response.status, 400);
});

test('lists created coupons', async () => {
    const response = await request(app).get('/coupons');

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.coupons));
    assert.ok(
        response.body.coupons.some(
            coupon => coupon.code === couponCode
        )
    );
});
