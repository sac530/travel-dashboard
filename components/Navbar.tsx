"use client";

import { Plane, Upload, ClipboardList } from "lucide-react";

export default function Navbar({ activeTab, setActiveTab }: { activeTab: "packages" | "intake" | "upload"; setActiveTab: (tab: "packages" | "intake" | "upload") => void }) {
  const tabs = [
    { key: "packages", label: "Packages", icon: Plane },
    { key: "intake", label: "Intake Form", icon: ClipboardList },
    { key: "upload", label: "Upload Deals", icon: Upload },
  ] as const;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0c1222]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-ocean-400 to-sunset-500 flex items-center justify-center text-white font-bold text-sm">
              TD
            </div>
            <span className="text-xl font-bold tracking-tight">
              Travel<span className="text-gradient">Dash</span>
            </span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-ocean-500/20 text-ocean-300 shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
            </span>
            <span className="text-xs text-gray-400 hidden sm:block">Auto-refresh: 2h</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
