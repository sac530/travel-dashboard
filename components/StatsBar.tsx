"use client";

import { Plane, Hotel, Car, AlertTriangle, TrendingDown } from "lucide-react";

const stats = [
  { icon: Plane, label: "Active Packages", value: "3", color: "text-ocean-400" },
  { icon: Hotel, label: "Total Deals Found", value: "12", color: "text-sunset-400" },
  { icon: Car, label: "Avg. Savings", value: "$340", color: "text-green-400" },
  { icon: AlertTriangle, label: "Expiring Soon", value: "1", color: "text-orange-400" },
];

export default function StatsBar() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card p-5 hover-lift">
          <stat.icon className={`w-6 h-6 ${stat.color} mb-3`} />
          <p className="text-3xl font-bold text-white">{stat.value}</p>
          <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
