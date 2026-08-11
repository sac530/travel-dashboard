"use client";

import { useState } from "react";
import {
  Plane, Hotel, Car, Calendar, DollarSign, Star,
  Plus, AlertTriangle, RefreshCw, ExternalLink, FileText, Trash2, CheckCircle2, XCircle, Upload
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface PackageItem {
  id: string; title: string; destination: string; origin?: string | null;
  start_date?: string | null; end_date?: string | null; total_price?: number | null;
  status: "active" | "expired" | "refresh_requested"; created_at: string; expires_at: string; notes?: string | null; user_created: boolean;
}

interface DealItem {
  id: string; package_id: string; deal_type: "flight" | "hotel" | "car" | "activity"; provider: string; title: string;
  description?: string | null; price: number; original_price?: number | null; order_url?: string | null; rating?: number | null; created_at?: string;
}

interface ExtraItem {
  id: string; package_id: string; category: string; name: string; description?: string | null;
  estimated_price?: number | null; suggested_url?: string | null; purchased: boolean; created_at?: string;
}

// ─── Sample data (replace with Supabase) ──────────────
const SAMPLE_PACKAGES: PackageItem[] = [
  { id: "1", title: "Cancun All-Inclusive Escape", destination: "Cancún, Mexico", origin: "DFW", start_date: "2026-09-15", end_date: "2026-09-22", total_price: 1847, status: "active", created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 5 * 86400000).toISOString(), notes: null, user_created: false },
  { id: "2", title: "Paris Romantic Getaway", destination: "Paris, France", origin: "JFK", start_date: "2026-10-01", end_date: "2026-10-08", total_price: 2340, status: "active", created_at: new Date(Date.now() - 86400000).toISOString(), expires_at: new Date(Date.now() + 6 * 86400000).toISOString(), notes: null, user_created: false },
  { id: "3", title: "Miami Beach Weekend", destination: "Miami, FL", origin: "ATL", start_date: "2026-08-22", end_date: "2026-08-24", total_price: 895, status: "active", created_at: new Date(Date.now() - 172800000).toISOString(), expires_at: new Date(Date.now() + 4 * 86400000).toISOString(), notes: null, user_created: false },
];

const SAMPLE_DEALS: DealItem[] = [
  { id: "d1", package_id: "1", deal_type: "flight", provider: "United Airlines", title: "DFW → CUN Roundtrip", description: "Non-stop, economy plus, carry-on included", price: 347, original_price: 489, order_url: "#", rating: 4.2 },
  { id: "d2", package_id: "1", deal_type: "hotel", provider: "Booking.com", title: "Hyatt Ziva Cancún — 5★ All Inclusive", description: "Ocean view suite, all meals & drinks included, beachfront pool", price: 1200, original_price: 1680, order_url: "#", rating: 4.7 },
  { id: "d3", package_id: "1", deal_type: "car", provider: "Hertz", title: "Compact Car — Cancún Airport Pickup", description: "Nissan Versa or similar, full-to-full, unlimited mileage", price: 189, original_price: null, order_url: "#", rating: 4.0 },
];

const SAMPLE_EXTRAS: ExtraItem[] = [
  { id: "e1", package_id: "1", category: "beach", name: "Snorkel Set (Mask + Fins)", description: "Quality silicone mask, tempered glass lens, quick-dry fins", estimated_price: 35, suggested_url: "#", purchased: false },
  { id: "e2", package_id: "1", category: "beach", name: "Waterproof Phone Case", description: "IPX8 rated, works up to 30ft underwater", estimated_price: 15, suggested_url: "#", purchased: false },
  { id: "e3", package_id: "1", category: "safety", name: "Travel Insurance — Trip Protection", description: "Covers trip cancellation, medical emergencies, baggage loss", estimated_price: 89, suggested_url: "#", purchased: false },
  { id: "e4", package_id: "1", category: "misc", name: "Portable Power Bank (20000mAh)", description: "Charges phone 5x, fast charge, airline-safe capacity", estimated_price: 45, suggested_url: "#", purchased: true },
];

const DEST_IMAGES = [
  "https://images.unsplash.com/photo-1552074282-5e3f52949450?w=600&q=75",
  "https://images.unsplash.com/photo-1502602898657-4e33ee1a1dfc?w=600&q=75",
  "https://images.unsplash.com/photo-1535498730771-e735b95874cd?w=600&q=75",
];

// ─── Sub-components ─────────────────────────────────────
function DaysRemaining({ expiresAt }: { expiresAt: string }) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0) return <span className="text-red-400 font-semibold">Expired</span>;
  if (days <= 3) return <span className="text-orange-400 font-semibold">{days}d left!</span>;
  return <span className="text-green-400">{days}d left</span>;
}

function DealIcon({ type }: { type: string }) {
  switch (type) {
    case "flight": return <Plane className="w-5 h-5" />;
    case "hotel": return <Hotel className="w-5 h-5" />;
    case "car": return <Car className="w-5 h-5" />;
    default: return <Star className="w-5 h-5" />;
  }
}

// ─── Main Component ─────────────────────────────────────
export default function PackageGrid({ loading }: { loading?: boolean }) {
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey(p => p + 1);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Active Packages</h2>
          <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ocean-500/10 border border-ocean-500/20 text-ocean-300 hover:bg-ocean-500/20 transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card animate-pulse p-6 h-[320px]" />
        ))}
      </div>
    );
  }

  // ─── Package detail view ──────────────────────────────
  if (selectedPackage) {
    const pkg = selectedPackage;
    const deals = SAMPLE_DEALS;
    const extras = SAMPLE_EXTRAS;
    const totalDealPrice = deals.reduce((s, d) => s + (d.price || 0), 0);

    return (
      <section>
        {/* Back */}
        <button onClick={() => setSelectedPackage(null)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          ← Back to Packages
        </button>

        {/* Header card */}
        <div className="glass-card p-8 shimmer-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[200px] bg-gradient-to-bl from-ocean-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">{pkg.title}</h2>
              <p className="flex items-center gap-2 text-gray-400 flex-wrap">
                <Plane className="w-4 h-4" /> {pkg.origin || "TBD"} → {pkg.destination}
                <span className="mx-2 hidden sm:inline">•</span>
                <Calendar className="w-4 h-4 inline" /> {pkg.start_date} to {pkg.end_date}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DaysRemaining expiresAt={pkg.expires_at} />
              <button onClick={handleRefresh} className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors" title="Request refresh">
                <RefreshCw className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Plane, label: "Flights", count: deals.filter(d => d.deal_type === "flight").length },
              { icon: Hotel, label: "Hotels", count: deals.filter(d => d.deal_type === "hotel").length },
              { icon: Car, label: "Cars", count: deals.filter(d => d.deal_type === "car").length },
              { icon: DollarSign, label: "Total", value: `$${totalDealPrice.toLocaleString()}` },
            ].map(s => (
              <div key={s.label} className="glass-card-light p-4 text-center">
                <s.icon className="w-5 h-5 mx-auto mb-1 text-ocean-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
                <p className={`text-lg font-bold ${s.value ? "text-gradient" : "text-white"}`}>{s.value || s.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Deals */}
        <div className="mt-8 space-y-6">
          {["flight", "hotel", "car"].map(type => {
            const typeDeals = deals.filter(d => d.deal_type === type);
            if (typeDeals.length === 0) return null;
            return (
              <div key={type} className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 capitalize">
                  <DealIcon type={type} /> {type}s
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {typeDeals.map(deal => (
                    <div key={deal.id} className={`p-5 rounded-xl border transition-all hover-lift ${deal.original_price ? "border-green-500/20 bg-green-500/5" : "border-white/10 bg-white/[0.03]"}`}>
                      {deal.original_price && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 mb-2">
                          Save ${Math.round(deal.original_price - deal.price)} ({Math.round((1 - deal.price / deal.original_price) * 100)}% off)
                        </div>
                      )}
                      <h4 className="font-semibold text-white">{deal.title}</h4>
                      {deal.provider && <p className="text-sm text-gray-500 mt-0.5">{deal.provider}</p>}
                      {deal.description && <p className="text-sm text-gray-400 mt-2 leading-relaxed">{deal.description}</p>}
                      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                        <div>
                          {deal.original_price && (
                            <span className="text-sm text-gray-500 line-through mr-2">${deal.original_price.toLocaleString()}</span>
                          )}
                          <span className="text-xl font-bold text-gradient">${deal.price.toLocaleString()}</span>
                        </div>
                        {deal.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{deal.rating}</span>
                          </div>
                        )}
                        {deal.order_url && (
                          <a href={deal.order_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-ocean-500 hover:bg-ocean-600 text-white font-medium text-sm transition-colors">
                            Book Now <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Activities */}
          {deals.filter(d => d.deal_type === "activity").length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">🎯 Activities</h3>
              {deals.filter(d => d.deal_type === "activity").map(deal => (
                <div key={deal.id} className="p-5 rounded-xl border border-white/10 bg-white/[0.03] hover-lift transition-all">
                  <h4 className="font-semibold text-white">{deal.title}</h4>
                  {deal.description && <p className="text-sm text-gray-400 mt-2">{deal.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xl font-bold text-gradient">${deal.price.toLocaleString()}</span>
                    {deal.order_url && (
                      <a href={deal.order_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-ocean-500 hover:bg-ocean-600 text-white font-medium text-sm transition-colors">
                        Book Now <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trip Essentials */}
        <div className="mt-8 glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">🎒 Trip Essentials</h3>
          <p className="text-sm text-gray-500 mb-4">Things you might need for this destination.</p>

          {["beach", "safety", "misc"].map(cat => {
            const catExtras = extras.filter(e => e.category === cat);
            if (catExtras.length === 0) return null;
            return (
              <div key={cat} className="mb-6">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">{cat}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catExtras.map(extra => (
                    <div key={extra.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${extra.purchased ? "border-green-500/20 bg-green-500/[0.05] opacity-60" : "border-white/10 bg-white/[0.03] hover-lift"}`}>
                      <div className="flex-shrink-0 mt-0.5">
                        {extra.purchased ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-gray-600 hover:text-gray-400 cursor-pointer transition-colors" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className={`font-medium ${extra.purchased ? "line-through text-gray-500" : "text-white"}`}>{extra.name}</h5>
                        <p className="text-sm text-gray-400 mt-0.5">{extra.description}</p>
                      </div>
                      {extra.estimated_price && (
                        <span className={`font-semibold flex-shrink-0 ${extra.purchased ? "text-green-500" : "text-ocean-300"}`}>~${extra.estimated_price}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <button className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-white/15 text-gray-500 hover:text-ocean-300 hover:border-ocean-500/30 transition-colors">
            <Plus className="w-4 h-4" /> Add Custom Essential
          </button>

          {extras.some(e => !e.purchased) && (
            <div className="mt-6 p-4 rounded-xl bg-sunset-500/10 border border-sunset-500/20">
              <p className="text-sm text-gray-400">Not-yet-purchased essentials total:</p>
              <p className="text-2xl font-bold text-gradient mt-1">~${extras.filter(e => !e.purchased).reduce((s, e) => s + (e.estimated_price || 0), 0)}</p>
            </div>
          )}
        </div>

        {/* Uploads */}
        <div className="mt-8 glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">📎 Your Uploads & Notes</h3>
          <p className="text-sm text-gray-500 mb-4">Screenshots, URLs, and notes for this package.</p>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-white/10 text-gray-500 text-sm mb-4">
            <FileText className="w-5 h-5 flex-shrink-0" /> No uploads yet for this package.
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ocean-500/10 border border-ocean-500/20 text-ocean-300 hover:bg-ocean-500/20 transition-colors">
            <Upload className="w-4 h-4" /> Upload to This Package
          </button>
        </div>

        {/* Stale notice */}
        {(() => {
          const daysLeft = Math.ceil((new Date(pkg.expires_at).getTime() - Date.now()) / 86400000);
          if (daysLeft <= 3 && daysLeft > 0) {
            return (
              <div className="mt-6 p-5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3 pulse-glow">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-300 font-semibold">Package expires in {daysLeft} days!</p>
                  <p className="text-sm text-gray-400 mt-1">Would you like me to refresh this package with updated deals?</p>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3 justify-end">
          <button onClick={handleRefresh} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ocean-500 hover:bg-ocean-600 text-white font-medium transition-colors shadow-lg shadow-ocean-500/20">
            <RefreshCw className="w-4 h-4" /> Refresh Package
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete Package
          </button>
        </div>
      </section>
    );
  }

  // ─── Grid view ────────────────────────────────────────
  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">Active Packages</h2>
        <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ocean-500/10 border border-ocean-500/20 text-ocean-300 hover:bg-ocean-500/20 transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SAMPLE_PACKAGES.map((pkg, idx) => (
          <button key={pkg.id} onClick={() => setSelectedPackage(pkg)} className={`glass-card hover-lift text-left group cursor-pointer overflow-hidden shimmer-border`}>
            <div className="h-44 bg-cover bg-center relative" style={{ backgroundImage: `url('${DEST_IMAGES[idx % DEST_IMAGES.length]}')` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c1222] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <span className="text-xs text-white/70 font-medium px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">{pkg.origin} → {pkg.destination}</span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-ocean-300 transition-colors">{pkg.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                <Calendar className="w-4 h-4" /> {pkg.start_date} — {pkg.end_date}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
                  <p className="text-2xl font-bold text-gradient">${pkg.total_price?.toLocaleString()}</p>
                </div>
                <DaysRemaining expiresAt={pkg.expires_at} />
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-ocean-500/15 text-ocean-300 border border-ocean-500/20">✈ Flight</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-sunset-500/15 text-sunset-400 border border-sunset-500/20">🏨 Hotel</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">🚗 Car</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {SAMPLE_PACKAGES.length === 0 && (
        <div className="text-center py-20">
          <Plane className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No active packages yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">Packages auto-generate from our travel scrapers. Fill out the Intake Form to kick one off now.</p>
        </div>
      )}
    </section>
  );
}
