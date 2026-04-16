import React from 'react';

/**
 * StatCard Component
 * Reusable card for displaying key statistics.
 */
const StatCard = ({ label, value, icon: Icon, color }: any) => {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-50 text-indigo-600",
    slate: "bg-slate-50 text-slate-600",
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${colors[color] || colors.slate}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
