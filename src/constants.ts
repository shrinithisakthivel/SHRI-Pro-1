/**
 * Application Constants
 * Centralized configuration for ward types, rates, and doctors.
 */

export const WARD_TYPES = ['Normal', 'ICU', 'Emergency', 'Special Ward'] as const;

export type WardType = typeof WARD_TYPES[number];

export const WARD_RATES: Record<WardType, number> = {
  'Normal': 1000,
  'ICU': 5000,
  'Emergency': 2500,
  'Special Ward': 3500,
};

export const DOCTORS = [
  "Dr. Rajesh Kumar - Cardiologist",
  "Dr. Priya Singh - Neurologist",
  "Dr. Amit Shah - Orthopedic Surgeon",
  "Dr. Sneha Reddy - Pediatrician",
  "Dr. Vikram Malhotra - General Physician",
  "Dr. Anjali Desai - Dermatologist",
  "Dr. Rohan Mehta - Psychiatrist",
  "Dr. Kavita Sharma - Gynecologist",
  "Dr. Sunil Verma - Oncologist",
  "Dr. Neha Gupta - Endocrinologist"
];

export const REASONS = {
  'Normal': ['General Treatment', 'Fever & Cold', 'Routine Checkup', 'Minor Injury'],
  'ICU': ['Post-Surgery Recovery', 'Cardiac Monitoring', 'Respiratory Distress', 'Severe Infection'],
  'Emergency': ['Trauma Care', 'Acute Pain', 'Accident Response', 'Critical Stabilization'],
  'Special Ward': ['Private Care', 'Maternity', 'Post-Operative Monitoring', 'Specialized Therapy'],
};
