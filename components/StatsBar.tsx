"use client";

import { Plane, Hotel, Car, AlertTriangle } from "lucide-react";

const stats = [
  { icon: Plane, label: "Active Packages", value: "3", color: "text-sky-300" },
  { icon: Hotel, label: "Total Deals Found", value: "12", color: "text-orange-300" },
  { icon: Car, label: "Avg. Savings", value: "$340", color: "text-emerald-300" },
  { icon: AlertTriangle, label: "Expiring Soon", value: "1", color: "text-orange-400" },
];

export default function StatsBar() {
  return (
    <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card p-5 shadow-xl shadow-black/15 hover-lift">
          <stat.icon className={`mb-3 h-6 w-6 ${stat.color}`} />
          <p className="text-3xl font-bold text-white">{stat.value}</p>
          <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
