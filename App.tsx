import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BedDouble, 
  UserPlus, 
  Users, 
  LogOut, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  X,
  Clock,
  Activity,
  Stethoscope,
  Phone,
  User,
  Calendar,
  Filter,
  Bell,
  Settings as SettingsIcon,
  Shield,
  Mail,
  MapPin,
  CheckCircle,
  Info,
  AlertCircle,
  CreditCard,
  History as HistoryIcon,
  ChevronRight,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { cn } from './lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { Bed, Patient, Stats, HistoryRecord } from './types';
import StatCard from './components/StatCard';
import { WARD_TYPES, WARD_RATES, DOCTORS, REASONS } from '../shared/constants';
import { useFetch } from './hooks/useFetch';

// --- Toast System ---
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[300px] max-w-md",
              toast.type === 'success' && "bg-emerald-50 border-emerald-100 text-emerald-800",
              toast.type === 'error' && "bg-rose-50 border-rose-100 text-rose-800",
              toast.type === 'warning' && "bg-amber-50 border-amber-100 text-amber-800",
              toast.type === 'info' && "bg-blue-50 border-blue-100 text-blue-800"
            )}
          >
            {toast.type === 'success' && <CheckCircle className="text-emerald-500 shrink-0" size={20} />}
            {toast.type === 'error' && <XCircle className="text-rose-500 shrink-0" size={20} />}
            {toast.type === 'warning' && <AlertCircle className="text-amber-500 shrink-0" size={20} />}
            {toast.type === 'info' && <Info className="text-blue-500 shrink-0" size={20} />}
            
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};
// --- End Toast System ---

// --- Utils ---
const calculateDays = (admissionDate: string, expectedDays: number = 0) => {
  const start = new Date(new Date(admissionDate).setHours(0, 0, 0, 0));
  const end = new Date(new Date().setHours(0, 0, 0, 0));
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const actualDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(actualDays, expectedDays);
};

const calculateTotalBill = (patient: Patient) => {
  const days = calculateDays(patient.admission_date, patient.expected_days);
  const rate = WARD_RATES[patient.bed_type as keyof typeof WARD_RATES] || 1000;
  return (days * rate) + (patient.total_fees || 0);
};

// --- Components ---

/**
 * Sidebar Component
 * Navigation menu for the application.
 */
const Sidebar = () => {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: BedDouble, label: 'Bed Management', path: '/beds' },
    { icon: UserPlus, label: 'Admission', path: '/admission' },
    { icon: Users, label: 'Patients', path: '/patients' },
    { icon: Clock, label: 'History', path: '/history' },
    { icon: Shield, label: 'Pending Payments', path: '/pending-payments' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity className="text-emerald-500" />
          MedTrack
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

/**
 * Layout Component
 * Main application layout with sidebar and header.
 */
const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const user = localStorage.getItem('user');
  let userData = null;
  try {
    userData = user ? JSON.parse(user) : null;
  } catch (e) {
    localStorage.removeItem('user');
  }
  
  if (!user || !userData) return <Navigate to="/login" />;

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 pl-64">
      <Sidebar />
      
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-30">
        <div className="flex-1 max-w-md relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Quick search patients..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(`/patients?search=${(e.target as HTMLInputElement).value}`);
              }
            }}
          />
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/notifications" 
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors relative"
            title="Notifications"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </Link>
          <Link 
            to="/settings" 
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors"
            title="Settings"
          >
            <SettingsIcon size={20} />
          </Link>
          <div className="h-8 w-px bg-slate-100 mx-2"></div>
          
          {/* Profile Section with Logout */}
          <div className="group relative flex items-center gap-3 cursor-pointer py-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{userData?.username === 'admin@gmail.com' ? 'Admin User' : userData?.username}</p>
              <p className="text-xs text-slate-500">Hospital Admin</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
              {userData?.username?.substring(0, 2).toUpperCase() || 'AD'}
            </div>

            {/* Dropdown menu on hover/click */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-50">
                <p className="text-sm font-bold text-slate-900 truncate">{userData?.username}</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

// --- Pages ---

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "shri123") {
      const userData = { username };

      localStorage.setItem('user', JSON.stringify(userData));
      navigate('/');
    } else {
      setError("Wrong password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl mb-4">
            <Activity size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Hospital Admin</h2>
          <p className="text-slate-500">Sign in to manage bed capacity</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="admin@gmail.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Sign In
          </button>
        </form>
      </motion.div>
    </div>
  );
};

/**
 * Dashboard Component
 * Main overview page with statistics and ward breakdown.
 */
const Dashboard = () => {
  const { data: stats, loading, error } = useFetch<Stats>('/api/stats');

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
      Error loading dashboard: {error}
    </div>
  );

  if (!stats) return null;

  const chartData = [
    { name: 'Occupied', value: stats.occupied || 0, color: '#f43f5e' },
    { name: 'Available', value: stats.available || 0, color: '#10b981' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Hospital Dashboard</h2>
        <p className="text-slate-500">Real-time overview of bed capacity and admissions</p>
      </header>

      {stats.available < 5 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm">
          <Activity className="animate-pulse" size={24} />
          <div>
            <h3 className="font-bold text-lg">⚠ Warning: Beds are almost full</h3>
            <p className="text-sm opacity-90">Only {stats.available} beds remaining. Please manage admissions carefully.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Beds" value={stats.total} icon={BedDouble} color="blue" />
        <StatCard label="Occupied" value={stats.occupied} icon={XCircle} color="rose" />
        <StatCard label="Available" value={stats.available} icon={CheckCircle2} color="emerald" />
        <StatCard label="ICU Available" value={stats.icuAvailable} icon={Activity} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-6">Bed Occupancy</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-6">Bed Availability by Type</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={stats.breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="type" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="available" fill="#10b981" radius={[4, 4, 0, 0]} name="Available" />
                <Bar dataKey="occupied" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Occupied" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4">
            <Link to="/admission" className="p-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <UserPlus size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold">New Admission</p>
                <p className="text-xs opacity-70">Register a new patient</p>
              </div>
            </Link>
            <Link to="/beds" className="p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <Plus size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold">Manage Beds</p>
                <p className="text-xs opacity-70">Add or update bed status</p>
              </div>
            </Link>
            <Link to="/history" className="p-4 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <Clock size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold">Admission History</p>
                <p className="text-xs opacity-70">View past records</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Recent Admissions</h3>
            <Link to="/patients" className="text-sm text-emerald-600 font-bold hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                  <th className="pb-3">Patient</th>
                  <th className="pb-3">Bed</th>
                  <th className="pb-3">Doctor</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <RecentPatientsList />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecentPatientsList = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  
  useEffect(() => {
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPatients(data.slice(0, 5));
        }
      })
      .catch(console.error);
  }, []);

  return (
    <>
      {patients.map(p => (
        <tr key={p.id} className="group">
          <td className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                {(p.name || 'NA').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500">{p.age} yrs • {p.gender}</p>
              </div>
            </div>
          </td>
          <td className="py-4">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">{p.bed_id}</span>
          </td>
          <td className="py-4 text-sm text-slate-600">{p.doctor}</td>
          <td className="py-4">
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">Admitted</span>
          </td>
        </tr>
      ))}
      {patients.length === 0 && (
        <tr>
          <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">No recent admissions</td>
        </tr>
      )}
    </>
  );
};

/**
 * BedManagement Component
 * Page for monitoring and managing hospital beds.
 */
const BedManagement = () => {
  const { showToast } = useToast();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [filter, setFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBed, setNewBed] = useState<{ id: string; type: string; patientId?: string; patientName?: string }>({ id: '', type: 'Normal' });

  useEffect(() => {
    Promise.all([
      fetch('/api/beds').then(res => res.json()),
      fetch('/api/patients').then(res => res.json())
    ]).then(([bedsData, patientsData]) => {
      if (Array.isArray(bedsData)) setBeds(bedsData);
      if (Array.isArray(patientsData)) setPatients(patientsData);
    }).catch(console.error);
  }, []);

  const filteredBeds = beds.filter(b => {
    const typeMatch = filter === 'All' || b.type === filter;
    const statusMatch = statusFilter === 'All' || b.status === statusFilter;
    return typeMatch && statusMatch;
  });

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/beds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBed),
    });
    if (res.ok) {
      setShowAddModal(false);
      showToast('New bed added successfully.', 'success');
      fetch('/api/beds').then(res => res.json()).then(setBeds);
    } else {
      showToast('Failed to add new bed.', 'error');
    }
  };

  const handleBedClick = (bed: Bed) => {
    if (bed.status === 'Occupied') {
      const patient = patients.find(p => p.bed_id === bed.id);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bed Management</h2>
          <p className="text-slate-500">Monitor and manage hospital bed inventory</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700"
        >
          <Plus size={20} /> Add New Bed
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 p-1 bg-slate-200 rounded-lg w-fit">
          {['All', 'Normal', 'ICU', 'Emergency', 'Special Ward'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                filter === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-2 p-1 bg-slate-200 rounded-lg w-fit">
          {['All', 'Available', 'Occupied'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                statusFilter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {filteredBeds.map(bed => (
          <div 
            key={bed.id}
            onClick={() => handleBedClick(bed)}
            className={cn(
              "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer",
              bed.status === 'Available' ? "border-emerald-100 bg-emerald-50/50 hover:border-emerald-200" : "border-rose-100 bg-rose-50/50 hover:border-rose-200"
            )}
          >
            <BedDouble className={bed.status === 'Available' ? "text-emerald-600" : "text-rose-600"} />
            <span className="font-bold text-slate-900">{bed.id}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{bed.type}</span>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold",
              bed.status === 'Available' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            )}>
              {bed.status}
            </span>
          </div>
        ))}
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{selectedPatient.name}</h3>
                <p className="text-emerald-100 text-sm">Patient ID: {selectedPatient.id}</p>
              </div>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-bold">Age / Gender</p>
                  <p className="text-slate-900">{selectedPatient.age} yrs / {selectedPatient.gender}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-bold">Nationality</p>
                  <p className="text-slate-900">{selectedPatient.nationality}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-bold">Contact</p>
                  <p className="text-slate-900">{selectedPatient.contact}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-bold">Bed ID</p>
                  <p className="text-slate-900">{selectedPatient.bed_id} ({selectedPatient.bed_type})</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Assigned Doctor</p>
                    <p className="text-slate-900 font-medium">{selectedPatient.doctor}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-bold">Reason for Admission</p>
                  <p className="text-slate-600 text-sm">{selectedPatient.reason}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Amount Paid</p>
                  <p className="text-emerald-600 text-lg font-bold">₹{selectedPatient.amount_paid}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Amount Due</p>
                  <p className="text-rose-600 text-lg font-bold">₹{selectedPatient.amount_due}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPatient(null)}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add New Bed</h3>
            <form onSubmit={handleAddBed} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bed ID (e.g., B201)</label>
                <input
                  type="text"
                  value={newBed.id}
                  onChange={e => setNewBed({ ...newBed, id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Patient ID</label>
                <input
                  type="text"
                  value={newBed.patientId || ''}
                  onChange={e => setNewBed({ ...newBed, patientId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Patient Name</label>
                <input
                  type="text"
                  value={newBed.patientName || ''}
                  onChange={e => setNewBed({ ...newBed, patientName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bed Type</label>
                <select
                  value={newBed.type}
                  onChange={e => setNewBed({ ...newBed, type: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Normal">Normal</option>
                  <option value="ICU">ICU</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Special Ward">Special Ward</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Add Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Admission Component
 * Form for admitting new patients and assigning beds.
 */
const Admission = () => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    age: 0,
    gender: 'Male',
    contact: '+91 ',
    nationality: 'Indian',
    bedType: 'Normal',
    doctor: 'Dr. Rajesh (Oncology)',
    reason: '',
    admission_date: new Date().toISOString().split('T')[0],
    expectedDays: 1,
    amountPaid: 0,
  });

  const getRate = (type: string) => {
    if (type === 'ICU') return 5000;
    if (type === 'Emergency') return 2500;
    if (type === 'Special Ward') return 3500;
    return 1000;
  };

  const totalAmount = formData.expectedDays * getRate(formData.bedType);
  const balanceAmount = totalAmount - formData.amountPaid;

  const doctors = DOCTORS;
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Success! Patient assigned to Bed ${data.bedId}`, 'success');
        setTimeout(() => navigate('/patients'), 2000);
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('An error occurred during admission.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <UserPlus className="text-emerald-600" />
          Patient Admission
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value === '' ? 0 : Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nationality</label>
              <input
                type="text"
                value={formData.nationality}
                onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admission Date</label>
              <input
                type="date"
                value={formData.admission_date}
                onChange={e => setFormData({ ...formData, admission_date: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="tel"
                  value={formData.contact}
                  onChange={e => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bed Type Required</label>
              <select
                value={formData.bedType}
                onChange={e => setFormData({ ...formData, bedType: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {WARD_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <p className="mt-1 text-xs font-bold text-emerald-600">
                Daily Rate: ₹{WARD_RATES[formData.bedType as keyof typeof WARD_RATES]?.toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Doctor</label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <select
                  value={formData.doctor}
                  onChange={e => setFormData({ ...formData, doctor: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {doctors.map(doc => (
                    <option key={doc} value={doc}>{doc}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Days</label>
              <input
                type="number"
                value={formData.expectedDays}
                onChange={e => setFormData({ ...formData, expectedDays: e.target.value === '' ? 0 : Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Amount Paid (₹)</label>
              <input
                type="number"
                value={formData.amountPaid}
                onChange={e => setFormData({ ...formData, amountPaid: e.target.value === '' ? 0 : Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Admission</label>
              <textarea
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 h-24"
                required
              />
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-4">
            <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <Activity size={16} />
              Billing Estimation & Initial Payment
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-emerald-700">Ward Rate ({formData.bedType})</p>
                <p className="font-bold text-emerald-900">₹{getRate(formData.bedType).toLocaleString()} / day</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-emerald-700">Total Amount Needed to Pay ({formData.expectedDays} days)</p>
                <p className="font-bold text-emerald-900">₹{totalAmount.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-emerald-700">Amount Paid By Patient</p>
                <p className="font-bold text-emerald-900">₹{formData.amountPaid.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-emerald-700">Balance Amount</p>
                <p className={cn(
                  "font-bold",
                  balanceAmount > 0 ? "text-rose-600" : "text-emerald-900"
                )}>₹{balanceAmount.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-[10px] text-emerald-600 border-t border-emerald-200 pt-2">* Final bill will be adjusted at discharge based on actual stay duration.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirm Admission'}
          </button>
        </form>
      </div>
    </div>
  );
};

/**
 * PatientList Component
 * Page displaying all currently admitted patients.
 */
const PatientList = () => {
  const { showToast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [billingPatient, setBillingPatient] = useState<Patient | null>(null);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [feePatient, setFeePatient] = useState<Patient | null>(null);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [paymentPatient, setPaymentPatient] = useState<Patient | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPatients(data.filter(p => p.status !== 'Payment Pending'));
      })
      .catch(console.error);
    const query = searchParams.get('search');
    if (query) setSearch(query);
  }, [searchParams]);

  const handleAddFee = async () => {
    if (!feePatient) return;
    const res = await fetch(`/api/patients/${feePatient.id}/fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: feeAmount }),
    });
    if (res.ok) {
      const data = await res.json();
      setPatients(patients.map(p => p.id === feePatient.id ? { ...p, total_fees: data.total_fees } : p));
      setFeePatient(null);
      setFeeAmount(0);
      showToast('Fees added successfully.', 'success');
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentPatient) return;
    const res = await fetch(`/api/patients/${paymentPatient.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: paymentAmount }),
    });
    if (res.ok) {
      const data = await res.json();
      setPatients(patients.map(p => p.id === paymentPatient.id ? { ...p, amount_paid: data.amount_paid } : p));
      setPaymentPatient(null);
      setPaymentAmount(0);
      showToast('Payment recorded successfully.', 'success');
    }
  };

  const handleDischargeClick = (patient: Patient) => {
    setBillingPatient(patient);
    setAmountPaid(0); // This will be the "Additional Payment"
  };

  const confirmDischarge = async () => {
    if (!billingPatient) return;
    
    try {
      const totalBill = calculateTotalBill(billingPatient);
      const totalPaidSoFar = (billingPatient.amount_paid || 0) + amountPaid;
      const amountDue = Math.max(0, totalBill - totalPaidSoFar);

      const res = await fetch('/api/discharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId: billingPatient.id, 
          bedId: billingPatient.bed_id,
          amount_paid: totalPaidSoFar,
          amount_due: amountDue
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPatients(patients.filter(p => p.id !== billingPatient.id));
          setBillingPatient(null);
          if (data.status === 'Payment Pending') {
            showToast('Patient moved to Pending Payments list.', 'info');
          } else {
            showToast('Patient discharged successfully.', 'success');
          }
        } else {
          showToast(`Discharge failed: ${data.message}`, 'error');
        }
      } else {
        const errorData = await res.json();
        showToast(`Error: ${errorData.message || 'Failed to discharge patient'}`, 'error');
      }
    } catch (err) {
      console.error("Discharge error:", err);
      showToast('An error occurred during discharge. Please try again.', 'error');
    }
  };

  const filteredPatients = patients.filter(p => 
    (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.bed_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Current Patients</h2>
          <p className="text-slate-500">Manage admitted patients and discharges</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search patients or beds..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Patient</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Bed Info</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Admission Date</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Doctor</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Billing</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPatients.map(patient => (
              <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-bold text-slate-900">{patient.name}</p>
                    <p className="text-xs text-slate-500">{patient.age} yrs • {patient.gender}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">{patient.bed_id}</span>
                    <span className="text-xs text-slate-500 uppercase font-bold">{patient.bed_type}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar size={14} />
                    {new Date(patient.admission_date).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Stethoscope size={14} />
                    {patient.doctor}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <p className="font-bold text-slate-900">₹{calculateTotalBill(patient).toLocaleString()}</p>
                    <p className="text-xs text-emerald-600">Paid: ₹{(patient.amount_paid || 0).toLocaleString()}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setFeePatient(patient);
                        setFeeAmount(0);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-bold px-3 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Add Fee
                    </button>
                    <button
                      onClick={() => {
                        setPaymentPatient(patient);
                        setPaymentAmount(0);
                      }}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-bold px-3 py-1 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      Payment
                    </button>
                    <button
                      onClick={() => setSelectedPatient(patient)}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-bold px-3 py-1 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => handleDischargeClick(patient)}
                      className="text-rose-600 hover:text-rose-700 text-sm font-bold px-3 py-1 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Discharge
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPatients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No patients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedPatient && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg">
                    {selectedPatient.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedPatient.name}</h3>
                    <p className="text-sm text-slate-500">Patient ID: {selectedPatient.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPatient(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Personal Information</p>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Age / Gender</span>
                        <span className="text-slate-900 font-medium text-sm">{selectedPatient.age} yrs • {selectedPatient.gender}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Nationality</span>
                        <span className="text-slate-900 font-medium text-sm">{selectedPatient.nationality}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Contact</span>
                        <span className="text-slate-900 font-medium text-sm">{selectedPatient.contact}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Admission Details</p>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Admission Date</span>
                        <span className="text-slate-900 font-medium text-sm">{new Date(selectedPatient.admission_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Bed Assigned</span>
                        <span className="text-slate-900 font-medium text-sm">{selectedPatient.bed_id} ({selectedPatient.bed_type})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Days Admitted</span>
                        <span className="text-slate-900 font-medium text-sm">{calculateDays(selectedPatient.admission_date, selectedPatient.expected_days)} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Primary Doctor</span>
                        <span className="text-slate-900 font-medium text-sm">{selectedPatient.doctor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billing Summary</p>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700">Ward Rate ({selectedPatient.bed_type})</span>
                        <span className="font-bold text-emerald-900">₹{
                          selectedPatient.bed_type === 'ICU' ? '5,000' :
                          selectedPatient.bed_type === 'Emergency' ? '2,500' :
                          selectedPatient.bed_type === 'Special Ward' ? '3,500' : '1,000'
                        } / day</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700">Ward Total ({calculateDays(selectedPatient.admission_date, selectedPatient.expected_days)} days)</span>
                        <span className="font-bold text-emerald-900">₹{(calculateTotalBill(selectedPatient) - (selectedPatient.total_fees || 0)).toLocaleString()}</span>
                      </div>
                      {selectedPatient.total_fees ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-700">Additional Fees</span>
                          <span className="font-bold text-emerald-900">₹{selectedPatient.total_fees.toLocaleString()}</span>
                        </div>
                      ) : null}
                      <div className="pt-2 border-t border-emerald-200 flex justify-between items-center">
                        <span className="font-bold text-emerald-900">Total Amount</span>
                        <span className="text-xl font-bold text-emerald-900">₹{calculateTotalBill(selectedPatient).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reason for Admission</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-700 leading-relaxed">{selectedPatient.reason}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billing Information</p>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Amount Paid</span>
                        <span className="text-emerald-600 font-bold text-sm">₹{(selectedPatient.amount_paid || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Amount Due</span>
                        <span className="text-rose-600 font-bold text-sm">₹{(selectedPatient.amount_due || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <QRCodeSVG 
                      value={`Patient ID: ${selectedPatient.id}\nName: ${selectedPatient.name}\nBed: ${selectedPatient.bed_id}\nDoctor: ${selectedPatient.doctor}`}
                      size={120}
                      level="Q"
                      includeMargin={true}
                    />
                    <p className="text-xs text-slate-500 mt-4 text-center">Scan for quick patient details</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedPatient(null)}
                  className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    handleDischargeClick(selectedPatient);
                    setSelectedPatient(null);
                  }}
                  className="px-6 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors"
                >
                  Discharge Patient
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {paymentPatient && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900">Record Mid-Stay Payment</h3>
                <button onClick={() => setPaymentPatient(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Patient Name</span>
                    <span className="font-bold text-slate-900">{paymentPatient.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Current Total Bill</span>
                    <span className="font-bold text-slate-900">₹{calculateTotalBill(paymentPatient).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Amount Paid So Far</span>
                    <span className="font-bold text-emerald-600">₹{(paymentPatient.amount_paid || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">Current Remaining Due</span>
                    <span className="font-bold text-rose-600">₹{Math.max(0, calculateTotalBill(paymentPatient) - (paymentPatient.amount_paid || 0)).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter amount to record"
                  />
                </div>

                <button
                  onClick={handleRecordPayment}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                >
                  Record Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feePatient && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900">Add Additional Fees</h3>
                <button onClick={() => setFeePatient(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Patient Name</span>
                    <span className="font-bold text-slate-900">{feePatient.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Current Total Bill</span>
                    <span className="font-bold text-slate-900">₹{calculateTotalBill(feePatient).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fee Amount (₹)</label>
                  <input
                    type="number"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 500 for medicine"
                  />
                </div>

                <button
                  onClick={handleAddFee}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Add Fee to Bill
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {billingPatient && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900">Patient Discharge & Billing</h3>
                <button onClick={() => setBillingPatient(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Patient Name</span>
                    <span className="font-bold text-slate-900">{billingPatient.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Admission Date</span>
                    <span className="font-bold text-slate-900">{new Date(billingPatient.admission_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Days</span>
                    <span className="font-bold text-slate-900">{calculateDays(billingPatient.admission_date, billingPatient.expected_days)} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Bill</span>
                    <span className="font-bold text-slate-900">₹{calculateTotalBill(billingPatient).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Amount Paid So Far</span>
                    <span className="font-bold text-emerald-600">₹{(billingPatient.amount_paid || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Additional Payment (₹)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value === '' ? 0 : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter additional payment"
                  />
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                  <span className="font-medium text-slate-700">Remaining Due</span>
                  <span className={cn(
                    "text-xl font-bold",
                    calculateTotalBill(billingPatient) - (billingPatient.amount_paid || 0) - amountPaid > 0 ? "text-rose-600" : "text-emerald-600"
                  )}>
                    ₹{Math.max(0, calculateTotalBill(billingPatient) - (billingPatient.amount_paid || 0) - amountPaid).toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={confirmDischarge}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                >
                  Confirm Discharge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * PatientHistory Component
 * Page displaying historical records of discharged patients.
 */
const PatientHistory = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHistory(data);
      })
      .catch(console.error);
  }, []);

  const filteredHistory = history.filter(p => 
    (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.bed_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Patient History</h2>
          <p className="text-slate-500">Record of all discharged patients</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search history..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Patient</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Bed Info</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Dates</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Doctor</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredHistory.map((record, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-bold text-slate-900">{record.name}</p>
                    <p className="text-xs text-slate-500">{record.age} yrs • {record.gender} • {record.nationality}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">{record.bed_id}</span>
                    <span className="text-xs text-slate-500 uppercase font-bold">{record.bed_type}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs space-y-1">
                    <p className="text-emerald-600 font-medium flex items-center gap-1">
                      <Calendar size={12} /> In: {new Date(record.admission_date).toLocaleDateString()}
                    </p>
                    <p className="text-rose-600 font-medium flex items-center gap-1">
                      <Clock size={12} /> Out: {new Date(record.discharge_date).toLocaleDateString()}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Stethoscope size={14} />
                    {record.doctor}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600 truncate max-w-[200px]">{record.reason}</p>
                </td>
              </tr>
            ))}
            {filteredHistory.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No history records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Notifications Component
 * Page for viewing system alerts and activity logs.
 */
const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
        <p className="text-slate-500">Stay updated with hospital activities</p>
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div key={n.id} className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4 items-start shadow-sm">
              <div className={cn(
                "p-2 rounded-lg",
                n.type === 'info' ? "bg-blue-50 text-blue-600" :
                n.type === 'warning' ? "bg-amber-50 text-amber-600" :
                n.type === 'success' ? "bg-emerald-50 text-emerald-600" :
                "bg-rose-50 text-rose-600"
              )}>
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-900">{n.title}</h3>
                  <span className="text-xs text-slate-400">{n.time}</span>
                </div>
                <p className="text-slate-600 text-sm mt-1">{n.message}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center">
            <Bell className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">No notifications yet. Your activities will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  let user: any = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    user = {};
  }

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500">Manage your account and preferences</p>
      </div>

      <div className="grid gap-6">
        {/* Account Details */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <User className="text-emerald-500" size={20} />
              Account Details
            </h3>
            <button className="text-sm text-emerald-600 font-bold hover:underline">Edit Profile</button>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Full Name</p>
              <p className="text-slate-900 font-medium">{user.username === 'admin' ? 'Administrator' : user.username}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Email Address</p>
              <p className="text-slate-900 font-medium flex items-center gap-2">
                <Mail size={14} className="text-slate-400" />
                {user.username}@medtrack.com
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Role</p>
              <p className="text-slate-900 font-medium flex items-center gap-2">
                <Shield size={14} className="text-slate-400" />
                Hospital Administrator
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Location</p>
              <p className="text-slate-900 font-medium flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                Main Campus, Block A
              </p>
            </div>
          </div>
        </div>

        {/* Security & Preferences */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Shield className="text-blue-500" size={20} />
              Security & Preferences
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
              <div>
                <p className="font-bold text-slate-900">Change Password</p>
                <p className="text-xs text-slate-500">Last changed 3 months ago</p>
              </div>
              <X size={16} className="text-slate-300 rotate-45" />
            </div>
            <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
              <div>
                <p className="font-bold text-slate-900">Two-Factor Authentication</p>
                <p className="text-xs text-slate-500 text-emerald-600 font-bold">Enabled</p>
              </div>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-rose-50 rounded-2xl border border-rose-100 overflow-hidden">
          <div className="p-6">
            <h3 className="font-bold text-rose-900 flex items-center gap-2">
              <LogOut size={20} />
              Session Management
            </h3>
            <p className="text-rose-700 text-sm mt-1">Sign out of your current session on this device.</p>
            <button 
              onClick={handleLogout}
              className="mt-4 bg-rose-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-rose-700 transition-colors flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout from MedTrack
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * PendingPayments Component
 * Page for tracking and processing outstanding patient bills.
 */
const PendingPayments = () => {
  const { showToast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [billingPatient, setBillingPatient] = useState<Patient | null>(null);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  useEffect(() => {
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPatients(data.filter(p => p.status === 'Payment Pending'));
      })
      .catch(console.error);
  }, []);

  const handlePayClick = (patient: Patient) => {
    setBillingPatient(patient);
    setAmountPaid(0);
  };

  const confirmPayment = async () => {
    if (!billingPatient) return;
    
    try {
      const remainingDue = (billingPatient.amount_due || 0) - amountPaid;
      const isFullPayment = remainingDue <= 0;

      const res = await fetch('/api/discharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId: billingPatient.id, 
          bedId: billingPatient.bed_id,
          amount_paid: (billingPatient.amount_paid || 0) + amountPaid,
          amount_due: Math.max(0, remainingDue)
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.status === 'Discharged') {
            setPatients(patients.filter(p => p.id !== billingPatient.id));
            showToast('Payment complete. Patient discharged successfully.', 'success');
          } else {
            setPatients(patients.map(p => p.id === billingPatient.id ? { 
              ...p, 
              amount_paid: (p.amount_paid || 0) + amountPaid, 
              amount_due: Math.max(0, remainingDue) 
            } : p));
            showToast('Partial payment recorded.', 'info');
          }
          setBillingPatient(null);
          setAmountPaid(0);
        } else {
          showToast(`Payment failed: ${data.message}`, 'error');
        }
      } else {
        const errorData = await res.json();
        showToast(`Error: ${errorData.message || 'Failed to process payment'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred while processing payment', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Pending Payments</h2>
        <p className="text-slate-500">Patients awaiting full payment clearance</p>
      </header>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Patient Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Bed Info</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Total Bill</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Amount Due</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map((patient) => (
              <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{patient.name}</td>
                <td className="px-6 py-4 text-slate-600">{patient.bed_id} ({patient.bed_type})</td>
                <td className="px-6 py-4 text-slate-900 font-bold">₹{calculateTotalBill(patient).toLocaleString()}</td>
                <td className="px-6 py-4 text-rose-600 font-bold">₹{(patient.amount_due || 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handlePayClick(patient)}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-bold px-3 py-1 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    Pay & Discharge
                  </button>
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No pending payments
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {billingPatient && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900">Clear Payment</h3>
                <button onClick={() => setBillingPatient(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Patient Name</span>
                    <span className="font-bold text-slate-900">{billingPatient.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Bill</span>
                    <span className="font-bold text-slate-900">₹{calculateTotalBill(billingPatient)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Amount Paid So Far</span>
                    <span className="font-bold text-emerald-600">₹{billingPatient.amount_paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Current Amount Due</span>
                    <span className="font-bold text-rose-600">₹{billingPatient.amount_due || 0}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Payment Amount (₹)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value === '' ? 0 : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                  <span className="font-medium text-slate-700">Remaining Due</span>
                  <span className={cn(
                    "text-xl font-bold",
                    (billingPatient.amount_due || 0) - amountPaid > 0 ? "text-rose-600" : "text-emerald-600"
                  )}>
                    ₹{Math.max(0, (billingPatient.amount_due || 0) - amountPaid)}
                  </span>
                </div>

                <button
                  onClick={confirmPayment}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                >
                  Confirm Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BedAvailabilityViewer = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setStats(data);
        }
      })
      .catch(console.error);
  }, []);

  if (!stats) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
            <Activity size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Live Bed Availability</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Check real-time bed availability before visiting the hospital. Data is updated instantly.
          </p>
        </div>

        {stats.available < 5 && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm max-w-2xl mx-auto">
            <Activity className="animate-pulse" size={24} />
            <div>
              <h3 className="font-bold text-lg">⚠ Warning: Beds are almost full</h3>
              <p className="text-sm opacity-90">Only {stats.available} beds remaining across all wards.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.breakdown?.map((item) => (
            <div key={item.type} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                item.available > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
              )}>
                <BedDouble size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">{item.type}</h3>
              <div className="mt-auto pt-4 w-full border-t border-slate-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Available</span>
                  <span className={cn(
                    "text-2xl font-black",
                    item.available > 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {item.available}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center max-w-2xl mx-auto">
          <h3 className="font-bold text-blue-900 mb-2">Need immediate assistance?</h3>
          <p className="text-blue-700 mb-4">If this is a medical emergency, please call our emergency hotline immediately.</p>
          <a href="tel:108" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
            <Phone size={20} />
            Call Emergency: 108
          </a>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/beds" element={<Layout><BedManagement /></Layout>} />
          <Route path="/admission" element={<Layout><Admission /></Layout>} />
          <Route path="/patients" element={<Layout><PatientList /></Layout>} />
          <Route path="/history" element={<Layout><PatientHistory /></Layout>} />
          <Route path="/pending-payments" element={<Layout><PendingPayments /></Layout>} />
          <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/viewer" element={<BedAvailabilityViewer />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

