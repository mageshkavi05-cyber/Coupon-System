const { spawn } = require('node:child_process');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, ['index.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore'
  });

  let ready = false;

  for (let i = 0; i < 50; i++) {
    if (server.exitCode !== null) {
      throw new Error('Coupon System server exited before starting');
    }

    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (!ready) {
    server.kill();
    throw new Error('Coupon System did not start on port 3100');
  }
});

after(() => {
  if (server && server.exitCode === null) {
    server.kill();
  }
});

test('health endpoint reports V3', async () => {
  const response = await fetch(`${BASE_URL}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.version, 'v3');
});

test('creates a coupon', async () => {
  const response = await fetch(`${BASE_URL}/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'TEST10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 100,
      usageLimit: 5
    })
  });

  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.coupon.code, 'TEST10');
});

test('applies a coupon and calculates the discount', async () => {
  const response = await fetch(`${BASE_URL}/coupons/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'TEST10',
      orderAmount: 500
    })
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.discountAmount, 50);
  assert.equal(body.finalAmount, 450);
  assert.equal(body.remainingUses, 4);
});
