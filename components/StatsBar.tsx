"use client";

import { useEffect, useState } from "react";
import { Plane, Hotel, Car, AlertTriangle } from "lucide-react";
import { getActivePackages, getDealsByPackage } from "@/lib/api";

type Stat = {
  icon: typeof Plane;
  label: string;
  value: string;
  color: string;
};

export default function StatsBar() {
  const [stats, setStats] = useState<Stat[]>([
    { icon: Plane, label: "Active Packages", value: "-", color: "text-sky-300" },
    { icon: Hotel, label: "Total Deals Found", value: "-", color: "text-orange-300" },
    { icon: Car, label: "Best Package", value: "-", color: "text-emerald-300" },
    { icon: AlertTriangle, label: "Expiring Soon", value: "-", color: "text-orange-400" },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      const activePackages = await getActivePackages();
      const dealGroups = await Promise.all(activePackages.map((pkg) => getDealsByPackage(pkg.id)));
      const deals = dealGroups.flat();
      const now = Date.now();
      const expiringSoon = activePackages.filter((pkg) => {
        const days = Math.ceil((new Date(pkg.expires_at).getTime() - now) / 86400000);
        return days > 0 && days <= 3;
      }).length;
      const bestPackage = activePackages
        .filter((pkg) => Number(pkg.total_price || 0) > 0)
        .sort((a, b) => Number(a.total_price || 0) - Number(b.total_price || 0))[0];

      if (cancelled) return;
      setStats([
        { icon: Plane, label: "Active Packages", value: String(activePackages.length), color: "text-sky-300" },
        { icon: Hotel, label: "Total Deals Found", value: String(deals.length), color: "text-orange-300" },
        { icon: Car, label: "Best Package", value: formatMoney(bestPackage?.total_price), color: "text-emerald-300" },
        { icon: AlertTriangle, label: "Expiring Soon", value: String(expiringSoon), color: "text-orange-400" },
      ]);
    }

    loadStats().catch(() => {
      if (cancelled) return;
      setStats([
        { icon: Plane, label: "Active Packages", value: "?", color: "text-sky-300" },
        { icon: Hotel, label: "Total Deals Found", value: "?", color: "text-orange-300" },
        { icon: Car, label: "Best Package", value: "?", color: "text-emerald-300" },
        { icon: AlertTriangle, label: "Expiring Soon", value: "?", color: "text-orange-400" },
      ]);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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

function formatMoney(value?: number | string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "TBD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numeric);
}
