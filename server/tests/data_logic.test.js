import { jest } from '@jest/globals';

// --- THE UTILITY FUNCTIONS ---

const formatPhoneNumber = (phone) => {
    // Logic: Remove spaces, dashes, and ensure it starts with 98 for Nepal
    const cleaned = phone.replace(/[\s-]/g, '');
    return cleaned.startsWith('98') && cleaned.length === 10 ? cleaned : "INVALID";
};

const filterVerifiedDoctors = (doctors) => {
    // Logic: Only return doctors where isVerified is true
    return doctors.filter(doc => doc.isVerified === true);
};

const calculateDiscountedFee = (fee, couponCode) => {
    // Logic: Apply 10% discount if code is 'MEDIHUB10'
    if (couponCode === "MEDIHUB10") return fee * 0.9;
    return fee;
};

// --- THE 5 NEW UNIT TESTS ---

describe('MediHub Nepal - Data & Utility Logic', () => {

    // TEST 11: Phone Number Cleaning
    test('11. Should clean spaces and dashes from Nepali phone numbers', () => {
        const result = formatPhoneNumber("9841-234 567");
        expect(result).toBe("9841234567");
    });

    // TEST 12: Invalid Phone Detection
    test('12. Should return INVALID for numbers not starting with 98', () => {
        const result = formatPhoneNumber("9741234567");
        expect(result).toBe("INVALID");
    });

    // TEST 13: Search Filtering Logic
    test('13. Should filter out unverified doctors from the search list', () => {
        const doctors = [
            { name: "Dr. A", isVerified: true },
            { name: "Dr. B", isVerified: false }
        ];
        const verified = filterVerifiedDoctors(doctors);
        expect(verified.length).toBe(1);
        expect(verified[0].name).toBe("Dr. A");
    });

    // TEST 14: Discount Logic (Coupon Applied)
    test('14. Should apply 10% discount with valid coupon code', () => {
        const finalPrice = calculateDiscountedFee(1000, "MEDIHUB10");
        expect(finalPrice).toBe(900);
    });

    // TEST 15: Discount Logic (No Coupon)
    test('15. Should not change the fee if the coupon is invalid', () => {
        const finalPrice = calculateDiscountedFee(1000, "WRONGCODE");
        expect(finalPrice).toBe(1000);
    });

});