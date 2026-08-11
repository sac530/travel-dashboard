"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PackageGrid from "@/components/PackageGrid";
import IntakeSection from "@/components/IntakeSection";
import UploadSection from "@/components/UploadSection";
import StatsBar from "@/components/StatsBar";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"packages" | "intake" | "upload">("packages");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0c1222]">
      {/* Background layers */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1222]/95 via-[#0f1a2e]/90 to-[#0c1222]/95" />
      </div>

      {/* Floating orbs for visual depth */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-ocean-500/10 blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-sunset-500/8 blur-[100px]" />
        <div className="absolute -bottom-20 left-1/3 w-[500px] h-[500px] rounded-full bg-ocean-600/8 blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {activeTab === "packages" && (
          <>
            <Hero />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              {!loading && <StatsBar />}
              <PackageGrid loading={loading} />
            </main>
          </>
        )}

        {activeTab === "intake" && (
          <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <IntakeSection />
          </main>
        )}

        {activeTab === "upload" && (
          <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <UploadSection />
          </main>
        )}

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/5 mt-24 py-8 text-center text-sm text-gray-500">
          Travel Dashboard © 2026 — Auto-refreshing packages • Stale deals auto-expire in 7 days
        </footer>
      </div>
    </div>
  );
}
