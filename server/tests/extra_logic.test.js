import { jest } from '@jest/globals';

// --- THE LOGIC FUNCTIONS ---

const verifyKhaltiStatus = (status) => {
    // Logic: Only "Completed" is a successful payment
    return status === "Completed" ? "PAYMENT_SUCCESS" : "PAYMENT_FAILED";
};

const canDoctorSeeAppointment = (paymentStatus) => {
    // Rule: Doctor shouldn't know/see the appointment until money is paid
    return paymentStatus === "paid" ? true : false;
};

const validateNmcIdFormat = (id) => {
    // Logic: NMC ID must start with 'NMC-' and have numbers
    const regex = /^NMC-\d+$/;
    return regex.test(id);
};

// --- THE 5 NEW UNIT TESTS ---

describe('MediHub Nepal - Extended Logic Tests', () => {

    // TEST 1: Khalti Success Logic
    test('1. Should return SUCCESS when Khalti status is Completed', () => {
        const result = verifyKhaltiStatus("Completed");
        expect(result).toBe("PAYMENT_SUCCESS");
    });

    // TEST 2: Khalti Failure Logic
    test('2. Should return FAILED for any other Khalti status (Pending/Expired)', () => {
        const result = verifyKhaltiStatus("Pending");
        expect(result).toBe("PAYMENT_FAILED");
    });

    // TEST 3: Doctor Privacy/Notification Logic
    test('3. Doctor should NOT be notified if payment is unpaid', () => {
        const isVisible = canDoctorSeeAppointment("unpaid");
        expect(isVisible).toBe(false);
    });

    // TEST 4: Doctor Visibility Logic
    test('4. Doctor SHOULD be notified once payment is confirmed', () => {
        const isVisible = canDoctorSeeAppointment("paid");
        expect(isVisible).toBe(true);
    });

    // TEST 5: NMC ID String Formatting
    test('5. Should validate that NMC ID follows the correct prefix format', () => {
        const validId = validateNmcIdFormat("NMC-12345");
        const invalidId = validateNmcIdFormat("12345-NMC");
        
        expect(validId).toBe(true);
        expect(invalidId).toBe(false);
    });

});