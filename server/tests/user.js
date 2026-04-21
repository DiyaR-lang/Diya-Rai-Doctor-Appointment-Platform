// src/tests/user.test.js
const User = require('../models/User');

describe('User Model Unit Tests', () => {
    test('should validate if username is provided', () => {
        const user = new User({ email: 'test@example.com' });
        // Example of checking for a validation error without hitting the DB
        const err = user.validateSync();
        expect(err.errors.username).toBeDefined();
    });
});