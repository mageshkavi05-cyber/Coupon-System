const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERSION = 'v2';

const coupons = new Map();

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'coupon-system',
    version: VERSION
  });
});

// Create a coupon
app.post('/coupons', (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    minOrderAmount = 0,
    usageLimit = 100,
    expiresAt
  } = req.body || {};

  const normalizedCode = normalizeCode(code);

  if (!normalizedCode || normalizedCode.length > 50) {
    return res.status(400).json({
      message: 'Coupon code is required and must be at most 50 characters'
    });
  }

  if (coupons.has(normalizedCode)) {
    return res.status(409).json({
      message: 'Coupon already exists'
    });
  }

  if (!['percentage', 'fixed'].includes(discountType)) {
    return res.status(400).json({
      message: 'discountType must be percentage or fixed'
    });
  }

  if (
    typeof discountValue !== 'number' ||
    !Number.isFinite(discountValue) ||
    discountValue <= 0
  ) {
    return res.status(400).json({
      message: 'discountValue must be a positive number'
    });
  }

  if (discountType === 'percentage' && discountValue > 100) {
    return res.status(400).json({
      message: 'Percentage discount cannot exceed 100'
    });
  }

  if (
    typeof minOrderAmount !== 'number' ||
    !Number.isFinite(minOrderAmount) ||
    minOrderAmount < 0
  ) {
    return res.status(400).json({
      message: 'minOrderAmount must be zero or greater'
    });
  }

  if (!Number.isInteger(usageLimit) || usageLimit < 1) {
    return res.status(400).json({
      message: 'usageLimit must be a positive integer'
    });
  }

  if (expiresAt) {
    const expiryDate = new Date(expiresAt);

    if (
      Number.isNaN(expiryDate.getTime()) ||
      expiryDate <= new Date()
    ) {
      return res.status(400).json({
        message: 'expiresAt must be a valid future date'
      });
    }
  }

  const coupon = {
    code: normalizedCode,
    discountType,
    discountValue,
    minOrderAmount,
    usageLimit,
    expiresAt: expiresAt || null,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString()
  };

  coupons.set(normalizedCode, coupon);

  return res.status(201).json({
    message: 'Coupon created successfully',
    coupon
  });
});

// List all coupons
app.get('/coupons', (req, res) => {
  res.status(200).json({
    coupons: Array.from(coupons.values())
  });
});

// V2: Validate a coupon
app.get('/coupons/validate/:code', (req, res) => {
  const code = normalizeCode(req.params.code);
  const coupon = coupons.get(code);

  if (!coupon) {
    return res.status(404).json({
      valid: false,
      message: 'Coupon not found'
    });
  }

  if (!coupon.active) {
    return res.status(400).json({
      valid: false,
      message: 'Coupon is inactive'
    });
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) {
    return res.status(400).json({
      valid: false,
      message: 'Coupon has expired'
    });
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({
      valid: false,
      message: 'Coupon usage limit reached'
    });
  }

  return res.status(200).json({
    valid: true,
    message: 'Coupon is valid',
    coupon
  });
});

// Handle errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      message: 'Invalid JSON'
    });
  }

  console.error(err);

  return res.status(500).json({
    message: 'Internal server error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Coupon System ' + VERSION + ' running on port ' + PORT);
});
