import { jest } from '@jest/globals';

describe('Initial System Check', () => {
  test('should verify that the testing environment is active', () => {
    const status = "active";
    expect(status).toBe("active");
  });

  test('math check: 10 + 20 should be 30', () => {
    expect(10 + 20).toBe(30);
  });
});