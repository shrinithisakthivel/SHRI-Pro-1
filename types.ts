export interface Bed {
  id: string;
  type: 'Normal' | 'ICU' | 'Emergency' | 'Special Ward';
  status: 'Available' | 'Occupied' | 'Maintenance';
}

export interface Patient {
  id: string | number;
  name: string;
  age: number;
  gender: string;
  contact: string;
  nationality: string;
  admission_date: string;
  bed_id: string;
  bed_type: string;
  doctor: string;
  reason: string;
  amount_paid: number;
  amount_due: number;
  total_fees?: number;
  expected_days?: number;
  status?: 'Admitted' | 'Payment Pending';
}

export interface HistoryRecord extends Patient {
  discharge_date: string;
}

export interface BedStats {
  type: string;
  total: number;
  occupied: number;
  available: number;
}

export interface Stats {
  total: number;
  occupied: number;
  available: number;
  icuAvailable: number;
  breakdown: BedStats[];
}
