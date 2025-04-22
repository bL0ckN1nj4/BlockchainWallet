// emailVerifier.js
// Utility to check email deliverability using AbstractAPI
// Usage: await verifyEmailDeliverability(email)

const fetch = require('node-fetch');

const ABSTRACT_API_KEY = process.env.ABSTRACT_API_KEY || '79ac4f8fe01d434092896273ff6aa8d2'; // <-- Replace with your actual key or use env
const ABSTRACT_API_URL = `https://emailvalidation.abstractapi.com/v1/?api_key=${ABSTRACT_API_KEY}`;

async function verifyEmailDeliverability(email) {
    try {
        const res = await fetch(`${ABSTRACT_API_URL}&email=${encodeURIComponent(email)}`);
        const data = await res.json();
        console.log('AbstractAPI response:', data); // <-- Debug log
        // Check deliverability ("DELIVERABLE" is the best result)
        if (data && data.deliverability === 'DELIVERABLE') {
            return { deliverable: true };
        } else {
            return { deliverable: false, reason: data ? data.deliverability : 'unknown' };
        }
    } catch (err) {
        console.error('Email verification error:', err);
        // Fail safe: treat as undeliverable if API fails
        return { deliverable: false, reason: 'api_error' };
    }
}

module.exports = { verifyEmailDeliverability };
