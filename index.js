
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERSION = 'v1';

// In-memory storage for V1
const coupons = new Map();

function normalizeCode(code) {
    return typeof code === 'string'
        ? code.trim().toUpperCase()
        : '';
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'coupon-system',
        version: VERSION
    });
});

// V1: Add / Create a coupon
app.post('/coupons', (req, res) => {
    const body = req.body || {};

    const code = normalizeCode(body.code);
    const discountType = body.discountType;
    const discountValue = Number(body.discountValue);

    const expiresAt = body.expiresAt || null;

    const minOrderAmount = body.minOrderAmount === undefined
        ? 0
        : Number(body.minOrderAmount);

    const usageLimit = body.usageLimit === undefined
        ? null
        : Number(body.usageLimit);

    // Validate coupon code
    if (!code || code.length > 50) {
        return res.status(400).json({
            error: 'Provide a coupon code of 1 to 50 characters'
        });
    }

    // Prevent duplicate coupons
    if (coupons.has(code)) {
        return res.status(409).json({
            error: 'Coupon already exists'
        });
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(discountType)) {
        return res.status(400).json({
            error: 'discountType must be percentage or fixed'
        });
    }

    // Validate discount value
    if (
        !Number.isFinite(discountValue) ||
        discountValue <= 0 ||
        (discountType === 'percentage' && discountValue > 100)
    ) {
        return res.status(400).json({
            error: 'Invalid discountValue'
        });
    }

    // Validate minimum order amount
    if (
        !Number.isFinite(minOrderAmount) ||
        minOrderAmount < 0
    ) {
        return res.status(400).json({
            error: 'minOrderAmount must be zero or greater'
        });
    }

    // Validate usage limit
    if (
        usageLimit !== null &&
        (!Number.isInteger(usageLimit) || usageLimit < 1)
    ) {
        return res.status(400).json({
            error: 'usageLimit must be a positive integer'
        });
    }

    // Validate expiry date
    if (
        expiresAt &&
        (
            !Number.isFinite(Date.parse(expiresAt)) ||
            Date.parse(expiresAt) <= Date.now()
        )
    ) {
        return res.status(400).json({
            error: 'expiresAt must be a valid future date'
        });
    }

    // Create the coupon
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

// View all created coupons
app.get('/coupons', (req, res) => {
    res.json({
        coupons: Array.from(coupons.values())
    });
});

// Handle invalid JSON and unexpected errors
app.use((err, req, res, next) => {
    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        'body' in err
    ) {
        return res.status(400).json({
            error: 'Invalid JSON body'
        });
    }

    console.error(err);

    res.status(500).json({
        error: 'Internal server error'
    });
});

// Start the application when run directly
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(
            `Coupon System ${VERSION} running on port ${PORT}`
        );
    });
}

module.exports = app;