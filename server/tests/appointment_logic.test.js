import { jest } from '@jest/globals';

// --- THE SCHEDULING LOGIC FUNCTIONS ---

const validateTimeSlot = (time) => {
    // Logic: Clinic only allows bookings between 06:00 and 19:00
    const hour = parseInt(time.split(':')[0]);
    return (hour >= 6 && hour < 19);
};

const updateAppointmentStatus = (currentStatus, action) => {
    // Logic: A 'Cancelled' appointment cannot be 'Completed'
    if (currentStatus === "Cancelled") return "INVALID_TRANSITION";
    if (action === "FINISH") return "Completed";
    return "Pending";
};

const calculateRemainingSlots = (totalSlots, bookedCount) => {
    // Logic: Basic math for the Dashboard
    return totalSlots - bookedCount;
};

// --- THE 5 FINAL UNIT TESTS ---

describe('MediHub Nepal - Appointment & Dashboard Logic', () => {

    // TEST 6: Working Hours Validation
    test('6. Should accept a time slot within clinic hours (10:00)', () => {
        const isValid = validateTimeSlot("10:00");
        expect(isValid).toBe(true);
    });

    // TEST 7: Outside Hours Validation
    test('7. Should reject a time slot outside clinic hours (21:00)', () => {
        const isValid = validateTimeSlot("21:00");
        expect(isValid).toBe(false);
    });

    // TEST 8: Appointment State Machine (Security)
    test('8. Should not allow a Cancelled appointment to be marked as Completed', () => {
        const result = updateAppointmentStatus("Cancelled", "FINISH");
        expect(result).toBe("INVALID_TRANSITION");
    });

    // TEST 9: Successful Status Update
    test('9. Should transition from Pending to Completed successfully', () => {
        const result = updateAppointmentStatus("Pending", "FINISH");
        expect(result).toBe("Completed");
    });

    // TEST 10: Dashboard Math (Capacity)
    test('10. Should correctly calculate available slots for the Doctor Dashboard', () => {
        const remaining = calculateRemainingSlots(10, 3);
        expect(remaining).toBe(7);
    });

});