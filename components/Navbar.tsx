"use client";

import { LogOut, Map, Plane, Upload, ClipboardList } from "lucide-react";
import type { ActiveTab } from "@/components/Dashboard";

export default function Navbar({
  activeTab,
  setActiveTab,
  onLogout,
}: {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onLogout: () => void;
}) {
  const tabs = [
    { key: "packages", label: "Packages", icon: Plane },
    { key: "intake", label: "Intake", icon: ClipboardList },
    { key: "upload", label: "Upload", icon: Upload },
  ] as const;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#06111f]/82 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("packages")}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-100 ring-1 ring-sky-300/25">
              <Map className="h-4 w-4" />
            </span>
            <span className="hidden text-xl font-bold tracking-tight text-white sm:inline">
              Travel<span className="text-gradient">Dash</span>
            </span>
          </button>

          <div className="flex items-center gap-1 rounded-lg bg-white/6 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex h-10 min-w-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? "bg-sky-500/20 text-sky-200"
                    : "text-slate-400 hover:bg-white/7 hover:text-white"
                }`}
                title={tab.label}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:border-rose-400/30 hover:text-rose-200"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
