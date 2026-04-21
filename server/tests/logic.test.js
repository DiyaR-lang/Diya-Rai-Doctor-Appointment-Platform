import { jest } from '@jest/globals';

// A mock function that simulates your controller's NMC check logic
const validateRegistration = (role, nmcId) => {
  if (role === 'doctor' && !nmcId) {
    return "NMC ID is required";
  }
  return "Valid";
};

describe('Registration Business Logic', () => {
  test('Doctor registration should fail without NMC ID', () => {
    const result = validateRegistration('doctor', null);
    expect(result).toBe("NMC ID is required");
  });

  test('Patient registration should pass without NMC ID', () => {
    const result = validateRegistration('patient', null);
    expect(result).toBe("Valid");
  });
});