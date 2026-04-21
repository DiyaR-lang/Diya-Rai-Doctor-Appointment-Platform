import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import Doctor from '../src/models/Doctor.js';

describe('Doctor Model Unit Tests', () => {
  
  test('should fail validation if nmcId is missing', () => {
    const doctor = new Doctor({
      specialty: "Cardiology",
      experience: 5,
      fee: 500,
      userId: new mongoose.Types.ObjectId() 
    });

    const err = doctor.validateSync();
    expect(err.errors.nmcId).toBeDefined();
  });

  test('should have isVerified set to false by default', () => {
    const doctor = new Doctor({
      specialty: "Neurology",
      experience: 10,
      fee: 800,
      nmcId: "NMC-12345",
      userId: new mongoose.Types.ObjectId()
    });

    // No need to validateSync here for a default value check
    expect(doctor.isVerified).toBe(false);
  });

  test('should create a valid doctor object with correct schema fields', () => {
    const doctorData = {
      nmcId: "NMC-9988",
      specialty: "General Physician",
      experience: 10,
      fee: 1500,
      description: "Expert in general health",
      phone: "9841234567",
      address: "Kathmandu, Nepal",
      userId: new mongoose.Types.ObjectId(),
      availability: [] // Supports your dashboard logic
    };

    const doctor = new Doctor(doctorData);
    const err = doctor.validateSync();
    
    expect(err).toBeUndefined(); // Should pass now!
    expect(doctor.nmcId).toBe("NMC-9988");
    expect(doctor.specialty).toBe("General Physician");
  });
});