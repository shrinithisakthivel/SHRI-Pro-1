/**
 * Hospital Bed Capacity Management System - Backend Server
 * Handles API requests, database interactions, and business logic.
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import Database from "better-sqlite3";
import { WARD_TYPES, WARD_RATES, DOCTORS, REASONS } from "./shared/constants.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * MongoDB Schemas for Hospital Data
 */

// Staff Schema for administrative credentials
const staffSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

// Bed Schema for hospital bed inventory
const bedSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  type: { type: String, enum: WARD_TYPES, required: true },
  status: { type: String, enum: ['Available', 'Occupied', 'Maintenance'], default: 'Available' }
});

// Patient Schema for currently admitted patients
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  blood_group: { type: String, default: 'Not Specified' },
  contact: { type: String, required: true },
  nationality: { type: String, default: 'Indian' },
  admission_date: { type: Date, default: Date.now },
  bed_id: { type: String, ref: 'Bed', required: true },
  doctor: { type: String, required: true },
  reason: { type: String, required: true },
  amount_paid: { type: Number, default: 0 },
  amount_due: { type: Number, default: 0 },
  total_fees: { type: Number, default: 0 },
  expected_days: { type: Number, default: 1 },
  status: { type: String, enum: ['Admitted'], default: 'Admitted' }
});

// History Schema for discharged patient records
const historySchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  blood_group: { type: String, default: 'Not Specified' },
  contact: { type: String, required: true },
  nationality: { type: String, required: true },
  admission_date: { type: Date, required: true },
  discharge_date: { type: Date, default: Date.now },
  bed_id: { type: String, required: true },
  bed_type: { type: String, required: true },
  doctor: { type: String, required: true },
  reason: { type: String, required: true },
  amount_paid: { type: Number, default: 0 },
  amount_due: { type: Number, default: 0 },
  total_fees: { type: Number, default: 0 }
});

const Staff = mongoose.model("Staff", staffSchema);
const Bed = mongoose.model("Bed", bedSchema);
const Patient = mongoose.model("Patient", patientSchema);
const History = mongoose.model("History", historySchema);

// Demo Data (Fallback)
let demoStaff = [{ username: "admin@gmail.com", password: "shri123" }];
let demoBeds: any[] = [];
let demoPatients: any[] = [];
let demoHistory: any[] = [];
let demoNotifications: any[] = [];

// Generate 100 beds
// Normal: 50, ICU: 25, Emergency: 15, Special Ward: 10 (Total 100)
for (let i = 1; i <= 100; i++) {
  let type: 'Normal' | 'ICU' | 'Emergency' | 'Special Ward' = 'Normal';
  if (i > 50 && i <= 75) type = 'ICU';
  if (i > 75 && i <= 90) type = 'Emergency';
  if (i > 90) type = 'Special Ward';
  demoBeds.push({ id: `B${100 + i}`, type, status: 'Available' });
}

let isDemoMode = false;
let db: any = null;

// Initialize SQLite fallback
function initSQLite() {
  try {
    db = new Database('hospital.db');
    db.exec(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT,
        age INTEGER,
        gender TEXT,
        blood_group TEXT,
        contact TEXT,
        nationality TEXT,
        admission_date TEXT,
        bed_id TEXT,
        doctor TEXT,
        reason TEXT,
        amount_paid REAL,
        amount_due REAL,
        total_fees REAL,
        expected_days INTEGER,
        status TEXT
      );
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        name TEXT,
        age INTEGER,
        gender TEXT,
        blood_group TEXT,
        contact TEXT,
        nationality TEXT,
        admission_date TEXT,
        discharge_date TEXT,
        bed_id TEXT,
        bed_type TEXT,
        doctor TEXT,
        reason TEXT,
        amount_paid REAL,
        amount_due REAL,
        total_fees REAL
      );
    `);
    console.log("Local SQLite database initialized for permanent storage.");
    
    // Load existing data into demo arrays for compatibility
    demoPatients = db.prepare("SELECT * FROM patients").all().map((p: any) => ({
      ...p,
      admission_date: new Date(p.admission_date)
    }));
    demoHistory = db.prepare("SELECT * FROM history").all().map((h: any) => ({
      ...h,
      admission_date: new Date(h.admission_date),
      discharge_date: new Date(h.discharge_date)
    }));
    
    // Update bed status based on loaded patients
    demoPatients.forEach(p => {
      const bed = demoBeds.find(b => b.id === p.bed_id);
      if (bed) bed.status = 'Occupied';
    });
  } catch (e) {
    console.error("SQLite initialization failed:", e);
  }
}

// Helper to persist demo/SQLite data
function persistData() {
  if (!db) return;
  try {
    const deletePatients = db.prepare("DELETE FROM patients");
    const insertPatient = db.prepare(`
      INSERT INTO patients (id, name, age, gender, blood_group, contact, nationality, admission_date, bed_id, doctor, reason, amount_paid, amount_due, total_fees, expected_days, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const deleteHistory = db.prepare("DELETE FROM history");
    const insertHistory = db.prepare(`
      INSERT INTO history (id, name, age, gender, blood_group, contact, nationality, admission_date, discharge_date, bed_id, bed_type, doctor, reason, amount_paid, amount_due, total_fees)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      deletePatients.run();
      for (const p of demoPatients) {
        insertPatient.run(p.id, p.name, p.age, p.gender, p.blood_group, p.contact, p.nationality, p.admission_date.toISOString(), p.bed_id, p.doctor, p.reason, p.amount_paid, p.amount_due, p.total_fees || 0, p.expected_days, p.status);
      }
      deleteHistory.run();
      for (const h of demoHistory) {
        insertHistory.run(h.id, h.name, h.age, h.gender, h.blood_group, h.contact, h.nationality, h.admission_date.toISOString(), h.discharge_date.toISOString(), h.bed_id, h.bed_type, h.doctor, h.reason, h.amount_paid, h.amount_due, h.total_fees || 0);
      }
    });
    transaction();
    console.log(`[DATABASE] Success! ${demoPatients.length} patients and ${demoHistory.length} history records saved to hospital.db`);
  } catch (e) {
    console.error("Data persistence failed:", e);
  }
}

// Seed initial data
async function seedData() {
  if (isDemoMode) return;
  try {
    // Ensure the specific admin exists with the correct password
    const hashedPassword = await bcrypt.hash("shri123", 10);
    await Staff.findOneAndUpdate(
      { username: "admin@gmail.com" },
      { password: hashedPassword },
      { upsert: true, new: true }
    );
    console.log("Admin user seeded/verified with secure password");

    const bedCount = await Bed.countDocuments();
    if (bedCount === 0) {
      await Bed.insertMany(demoBeds);
      console.log("Beds seeded (all available)");
    }
  } catch (err) {
    console.error("Seeding error:", err);
    isDemoMode = true;
  }
}

async function startServer() {
  try {
    mongoose.set('strictQuery', false);
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not found");
    }
    // Try to connect to Cloud MongoDB
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("☁️ CLOUD DATABASE CONNECTED: Live Hospital storage is active.");
    isDemoMode = false;
    await seedData();
  } catch (err: any) {
    // Fallback to local SQLite if Cloud fails
    console.log("💻 LOCAL STORAGE ACTIVE: Could not reach cloud, using secure laptop file.");
    isDemoMode = true;
    initSQLite();
  }
  
  const app = express();
  // Clear all patient and history data
  app.post("/api/admin/clear-data", async (req, res) => {
    try {
      if (isDemoMode) {
        demoPatients = [];
        demoHistory = [];
        demoNotifications = [];
        // Reset all beds to available
        demoBeds.forEach(bed => bed.status = 'Available');
        persistData();
      } else {
        await Patient.deleteMany({});
        await History.deleteMany({});
        // Reset all beds to available
        await Bed.updateMany({}, { status: 'Available' });
      }
      res.json({ message: "All patient data cleared successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  /**
   * Login API
   * Authenticates staff members using a master password or database check.
   */
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log(`Login attempt for: ${username}`);

      // Special rule: Any email allowed if password is 'shri123'
      if (password === "shri123") {
        console.log("Login successful (Master Password)");
        return res.json({ success: true, user: { username } });
      }

      // Normal database check
      const user = await Staff.findOne({ username });
      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          console.log("Login successful (Database)");
          return res.json({ success: true, user: { username: user.username } });
        }
      }

      console.log("Login failed: Invalid credentials");
      res.status(401).json({ success: false, message: "Invalid credentials" });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({
        success: false,
        message: `Server error during login: ${err.message || 'Unknown error'}. Check your MONGODB_URI.`
      });
    }
  });

  /**
   * Dashboard Stats API
   * Returns overall bed occupancy statistics and ward-wise breakdown.
   */
  app.get("/api/stats", async (req, res) => {
    if (isDemoMode) {
      const types = ['Normal', 'ICU', 'Emergency', 'Special Ward'];
      const breakdown = types.map(type => ({
        type,
        total: demoBeds.filter(b => b.type === type).length,
        occupied: demoBeds.filter(b => b.type === type && b.status === 'Occupied').length,
        available: demoBeds.filter(b => b.type === type && b.status === 'Available').length
      }));

      return res.json({
        total: demoBeds.length,
        occupied: demoBeds.filter(b => b.status === 'Occupied').length,
        available: demoBeds.filter(b => b.status === 'Available').length,
        icuAvailable: demoBeds.filter(b => b.type === 'ICU' && b.status === 'Available').length,
        breakdown
      });
    }
    const total = await Bed.countDocuments();
    const occupied = await Bed.countDocuments({ status: 'Occupied' });
    const available = await Bed.countDocuments({ status: 'Available' });
    const icuAvailable = await Bed.countDocuments({ type: 'ICU', status: 'Available' });

    const types = ['Normal', 'ICU', 'Emergency', 'Special Ward'];
    const breakdown = await Promise.all(types.map(async type => ({
      type,
      total: await Bed.countDocuments({ type }),
      occupied: await Bed.countDocuments({ type, status: 'Occupied' }),
      available: await Bed.countDocuments({ type, status: 'Available' })
    })));

    res.json({
      total,
      occupied,
      available,
      icuAvailable,
      breakdown
    });
  });

  /**
   * Bed Inventory API
   * GET: Returns all beds.
   * POST: Adds a new bed to the inventory.
   */
  app.get("/api/beds", async (req, res) => {
    if (isDemoMode) return res.json(demoBeds);
    const beds = await Bed.find();
    res.json(beds);
  });

  app.post("/api/beds", async (req, res) => {
    const { id, type } = req.body;
    if (isDemoMode) {
      demoBeds.push({ id, type, status: 'Available' });
      return res.json({ success: true });
    }
    try {
      await Bed.create({ id, type, status: 'Available' });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, message: "Bed ID already exists" });
    }
  });

  /**
   * Patient Admission API
   * Handles the admission of a new patient and bed assignment.
   */
  app.post("/api/admissions", async (req, res) => {
    let { 
      name, age, gender, contact, nationality, 
      bed_type, doctor, reason, admission_date, 
      expected_days, amount_paid, blood_group 
    } = req.body;

    // Ensure contact starts with +91
    if (contact && !contact.startsWith('+91')) {
      contact = `+91 ${contact}`;
    }

    const getRate = (type: string) => {
      if (type === 'ICU') return 5000;
      if (type === 'Emergency') return 2500;
      if (type === 'Special Ward') return 3500;
      return 1000;
    };

    const totalAmount = (parseInt(expected_days) || 1) * getRate(bed_type);
    const balanceAmount = totalAmount - (parseFloat(amount_paid) || 0);

    if (isDemoMode) {
      const bed = demoBeds.find(b => b.type === bed_type && b.status === 'Available');
      if (!bed) {
        return res.json({ success: false, message: `No available ${bed_type} beds.` });
      }

      const newPatient = {
        id: `P${1000 + demoPatients.length + demoHistory.length}`,
        name, age, gender, contact, blood_group, nationality: nationality || 'Indian',
        bed_id: bed.id, doctor, reason,
        admission_date: admission_date ? new Date(admission_date) : new Date(),
        amount_paid: parseFloat(amount_paid) || 0,
        amount_due: Math.max(0, balanceAmount),
        total_fees: 0,
        expected_days: parseInt(expected_days) || 1,
        status: 'Admitted'
      };
      demoPatients.push(newPatient);
      bed.status = 'Occupied';
      persistData();

      demoNotifications.unshift({
        id: Date.now(),
        title: 'New Admission',
        message: `Patient ${name} admitted to ${bed_type} Bed ${bed.id}`,
        time: 'Just now',
        type: 'info'
      });

      return res.json({ success: true, bedId: bed.id });
    }

    try {
      const bed = await Bed.findOne({ type: bed_type, status: 'Available' });

      if (!bed) {
        return res.json({ success: false, message: `No available ${bed_type} beds.` });
      }
      await Patient.create({
        name,
        age,
        gender,
        blood_group,
        contact,
        nationality: nationality || 'Indian', 
        bed_id: bed.id, 
        doctor, 
        reason,
        admission_date: admission_date ? new Date(admission_date) : new Date(),
        amount_paid: parseFloat(amount_paid) || 0,
        amount_due: Math.max(0, balanceAmount),
        total_fees: 0,
        expected_days: parseInt(expected_days) || 1,
        status: 'Admitted'
      });

      bed.status = 'Occupied';
      await bed.save();

      res.json({ success: true, bedId: bed.id });
    } catch (error: any) {
      console.error("Admission error:", error);
      res.status(500).json({ success: false, message: `Admission failed: ${error.message}` });
    }
  });

  /**
   * Patient List API
   * Returns a list of all currently admitted patients with their bed types.
   */
  app.get("/api/patients", async (req, res) => {
    if (isDemoMode) {
      const patientsWithBedType = demoPatients.map(p => {
        const bed = demoBeds.find(b => b.id === p.bed_id);
        return { ...p, bed_type: bed ? bed.type : 'Unknown' };
      });
      return res.json(patientsWithBedType);
    }
    const patients = await Patient.find().lean();
    const beds = await Bed.find().lean();

    const patientsWithBedType = patients.map(p => {
      const bed = beds.find(b => b.id === p.bed_id);
      return { ...p, id: p._id.toString(), bed_type: bed ? bed.type : 'Unknown' };
    });

    res.json(patientsWithBedType);
  });
  
  // Update patient details (used for stay extension)
  app.put("/api/patients/:id", async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (isDemoMode) {
      const patient = demoPatients.find(p => p.id === id);
      if (patient) {
        Object.assign(patient, updateData);
        // Recalculate amount_due if key fields changed
        if ('expected_days' in updateData || 'amount_paid' in updateData || 'total_fees' in updateData) {
          const bed = demoBeds.find(b => b.id === patient.bed_id);
          const rate = WARD_RATES[(bed?.type || 'Normal') as keyof typeof WARD_RATES] || 1000;
          const totalAmount = (patient.expected_days || 1) * rate;
          patient.amount_due = Math.max(0, totalAmount - (patient.amount_paid || 0) + (patient.total_fees || 0));
        }
        persistData();
        return res.json({ success: true, patient });
      }
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    try {
      const patient = await Patient.findById(id);
      if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

      Object.assign(patient, updateData);
      
      // Recalculate amount_due if key fields changed
      if ('expected_days' in updateData || 'amount_paid' in updateData || 'total_fees' in updateData) {
        const bed = await Bed.findOne({ id: patient.bed_id });
        const rate = WARD_RATES[(bed?.type || 'Normal') as keyof typeof WARD_RATES] || 1000;
        const totalAmount = (patient.expected_days || 1) * rate;
        patient.amount_due = Math.max(0, totalAmount - (patient.amount_paid || 0) + (patient.total_fees || 0));
        console.log(`Recalculated balance for ${patient.name}: Total ${totalAmount}, Paid ${patient.amount_paid}, Due ${patient.amount_due}`);
      }

      await patient.save();
      res.json({ success: true, patient });
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ success: false, message: "Failed to update patient" });
    }
  });

  /**
   * Patient History API
   * Returns a list of all past patient records sorted by discharge date.
   */
  app.get("/api/history", async (req, res) => {
    if (isDemoMode) return res.json(demoHistory);
    const history = await History.find().sort({ discharge_date: -1 }).lean();
    res.json(history.map(h => ({ ...h, id: h._id.toString() })));
  });

  // Record payment for patient
  app.post("/api/patients/:id/payment", async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    if (isDemoMode) {
      const patient = demoPatients.find(p => p.id === id);
      if (patient) {
        patient.amount_paid = (patient.amount_paid || 0) + amount;
        persistData();

        demoNotifications.unshift({
          id: Date.now(),
          title: 'Payment Recorded',
          message: `Recorded payment of ₹${amount.toLocaleString()} for ${patient.name}`,
          time: 'Just now',
          type: 'success'
        });

        return res.json({ success: true, amount_paid: patient.amount_paid });
      }
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    try {
      const patient = await Patient.findById(id);
      if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

      patient.amount_paid = (patient.amount_paid || 0) + amount;
      await patient.save();
      res.json({ success: true, amount_paid: patient.amount_paid });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to record payment" });
    }
  });

  // Add fees to patient
  app.post("/api/patients/:id/fees", async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    if (isDemoMode) {
      const patient = demoPatients.find(p => p.id === id);
      if (patient) {
        patient.total_fees = (patient.total_fees || 0) + amount;
        persistData();

        demoNotifications.unshift({
          id: Date.now(),
          title: 'Fees Added',
          message: `Added additional fees of ₹${amount.toLocaleString()} to ${patient.name}`,
          time: 'Just now',
          type: 'warning'
        });

        return res.json({ success: true, total_fees: patient.total_fees });
      }
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    try {
      const patient = await Patient.findById(id);
      if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

      patient.total_fees = (patient.total_fees || 0) + amount;
      await patient.save();
      res.json({ success: true, total_fees: patient.total_fees });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to add fees" });
    }
  });

  // Patient Discharge
  app.post("/api/discharge", async (req, res) => {
    const { patientId, bedId, amount_paid, amount_due } = req.body;
    console.log(`Discharge request for Patient ID: ${patientId}, Bed ID: ${bedId}`);

    if (isDemoMode) {
      const patientIndex = demoPatients.findIndex(p => p.id === patientId || p._id === patientId);
      if (patientIndex !== -1) {
        const patient = demoPatients[patientIndex];

        patient.amount_paid = amount_paid;
        patient.amount_due = amount_due;

        // Free the bed as soon as discharge process starts
        const bed = demoBeds.find(b => b.id === bedId);
        if (bed) bed.status = 'Available';

        if (amount_due > 0) {
          return res.status(400).json({ success: false, message: 'Total balance must be cleared before discharge.' });
        } else {
          demoHistory.push({
            ...patient,
            discharge_date: new Date(),
            bed_type: bed ? bed.type : 'Unknown'
          });
          demoPatients.splice(patientIndex, 1);
          persistData();

          demoNotifications.unshift({
            id: Date.now(),
            title: 'Discharge Complete',
            message: `Patient ${patient.name} has been discharged from Bed ${bedId}`,
            time: 'Just now',
            type: 'success'
          });

          return res.json({ success: true, status: 'Discharged' });
        }
      }
      return res.status(404).json({ success: false, message: 'Patient not found in demo data' });
    }

    try {
      // Validate patientId
      if (!mongoose.Types.ObjectId.isValid(patientId)) {
        console.error(`Invalid Patient ID format: ${patientId}`);
        return res.status(400).json({ success: false, message: 'Invalid Patient ID format' });
      }

      const patient = await Patient.findById(patientId);
      if (!patient) {
        console.error(`Patient not found in database: ${patientId}`);
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      patient.amount_paid = amount_paid;
      patient.amount_due = amount_due;

      // Find the bed once
      const bed = bedId ? await Bed.findOne({ id: bedId }) : null;
      if (bed) {
        bed.status = 'Available';
        await bed.save();
      }

      if (amount_due > 0) {
        return res.status(400).json({ success: false, message: 'All pending dues must be paid before discharge.' });
      } else {
        // Move to history
        await History.create({
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          blood_group: patient.blood_group,
          contact: patient.contact,
          emergency_contact: patient.emergency_contact,
          nationality: patient.nationality,
          admission_date: patient.admission_date,
          discharge_date: new Date(),
          bed_id: bedId,
          bed_type: bed ? bed.type : 'Unknown',
          doctor: patient.doctor,
          reason: patient.reason,
          amount_paid: amount_paid,
          amount_due: amount_due,
          total_fees: patient.total_fees || 0
        });

        await Patient.findByIdAndDelete(patientId);

        return res.json({ success: true, status: 'Discharged' });
      }
    } catch (error: any) {
      console.error("Discharge error:", error);
      res.status(500).json({ success: false, message: `Discharge failed: ${error.message}` });
    }
  });

  // Notifications API
  app.get("/api/notifications", (req, res) => {
    res.json(demoNotifications);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
