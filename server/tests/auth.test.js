import request from 'supertest';
import { jest } from '@jest/globals';
// We point to your express app file
import app from '../src/server.js'; 

describe('Auth Controller Integration', () => {
  
  test('POST /api/register should fail if role is Admin', async () => {
    const res = await request(app)
      .post('/api/user/register')
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        role: "admin" // This should be blocked
      });

    // You expect a 400 or 403 error because Admin registration is restricted
    expect(res.statusCode).not.toBe(200);
  });
});