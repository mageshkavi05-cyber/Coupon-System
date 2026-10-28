const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERSION = 'v1';

// In-memory storage for this first version
const coupons = new Map();

function normalizeCode(code) {
    return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

function checkCoupon(coupon) {
    if (!coupon) {
        return { valid: false, reason: 'Coupon not found' };
    }

    if (!coupon.active) {
        return { valid: false, reason: 'Coupon is inactive' };
    }

    if (coupon.expiresAt && Date.now() > new Date(coupon.expiresAt).getTime()) {
        return { valid: false, reason: 'Coupon has expired' };
    }

    if (coupon.usageLimit !== null &&
        coupon.usedCount >= coupon.usageLimit) {
        return { valid: false, reason: 'Coupon usage limit reached' };
    }

    return { valid: true, reason: 'Coupon is valid' };
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'coupon-system',
        version: VERSION
    });
});

// Add a new coupon
app.post('/coupons', (req, res) => {
    const code = normalizeCode(req.body.code);
    const discountType = req.body.discountType;
    const discountValue = Number(req.body.discountValue);
    const expiresAt = req.body.expiresAt || null;
    const minOrderAmount = req.body.minOrderAmount === undefined
        ? 0 : Number(req.body.minOrderAmount);
    const usageLimit = req.body.usageLimit === undefined
        ? null : Number(req.body.usageLimit);

    if (!code || code.length > 50) {
        return res.status(400).json({
            error: 'Provide a coupon code of 1 to 50 characters'
        });
    }

    if (coupons.has(code)) {
        return res.status(409).json({ error: 'Coupon already exists' });
    }

    if (!['percentage', 'fixed'].includes(discountType)) {
        return res.status(400).json({
            error: 'discountType must be percentage or fixed'
        });
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0 ||
        (discountType === 'percentage' && discountValue > 100)) {
        return res.status(400).json({
            error: 'Invalid discountValue'
        });
    }

    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
        return res.status(400).json({
            error: 'minOrderAmount must be zero or greater'
        });
    }

    if (usageLimit !== null &&
        (!Number.isInteger(usageLimit) || usageLimit < 1)) {
        return res.status(400).json({
            error: 'usageLimit must be a positive integer'
        });
    }

    if (expiresAt &&
        (!Number.isFinite(Date.parse(expiresAt)) ||
         Date.parse(expiresAt) <= Date.now())) {
        return res.status(400).json({
            error: 'expiresAt must be a valid future date'
        });
    }

    const coupon = {
        code,
        discountType,
        discountValue,
        expiresAt,
        minOrderAmount,
        usageLimit,
        usedCount: 0,
        active: true,
        createdAt: new Date().toISOString()
    };

    coupons.set(code, coupon);

    res.status(201).json({
        message: 'Coupon created successfully',
        coupon
    });
});

// List all coupons
app.get('/coupons', (req, res) => {
    res.json({ coupons: Array.from(coupons.values()) });
});

// Validate a coupon
app.get('/coupons/validate/:code', (req, res) => {
    const code = normalizeCode(req.params.code);
    const coupon = coupons.get(code);
    const result = checkCoupon(coupon);

    res.json({
        code,
        ...result
    });
});

// Apply a coupon to an order
app.post('/coupons/apply', (req, res) => {
    const code = normalizeCode(req.body.code);
    const orderAmount = Number(req.body.orderAmount);
    const coupon = coupons.get(code);

    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
        return res.status(400).json({
            error: 'orderAmount must be greater than zero'
        });
    }

    const result = checkCoupon(coupon);

    if (!result.valid) {
        return res.status(400).json(result);
    }

    if (orderAmount < coupon.minOrderAmount) {
        return res.status(400).json({
            error: 'Order does not meet the minimum purchase amount',
            minOrderAmount: coupon.minOrderAmount
        });
    }

    let discountAmount = coupon.discountType === 'percentage'
        ? orderAmount * coupon.discountValue / 100
        : coupon.discountValue;

    discountAmount = Math.min(orderAmount, Math.round(discountAmount * 100) / 100);
    const finalAmount = Math.round((orderAmount - discountAmount) * 100) / 100;

    coupon.usedCount += 1;

    res.json({
        message: 'Coupon applied successfully',
        code,
        orderAmount,
        discountAmount,
        finalAmount,
        currency: 'INR'
    });
});

// Handle invalid JSON and unexpected errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Coupon System ${VERSION} running on port ${PORT}`);
});
