"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Hotel,
  Plane,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { getActivePackages, getDealsByPackage, getExtrasByPackage } from "@/lib/api";
import type { Deal, Extra, Package } from "@/lib/supabase";

const SAMPLE_PACKAGES: Package[] = [
  {
    id: "sample-cancun",
    title: "Cancun All-Inclusive Escape",
    destination: "Cancun, Mexico",
    origin: "DFW",
    start_date: "2026-09-15",
    end_date: "2026-09-22",
    total_price: 1847,
    status: "active",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    notes: "Sample package shown when Supabase has no active packages.",
    user_created: false,
  },
  {
    id: "sample-paris",
    title: "Paris Rail + Boutique Hotel",
    destination: "Paris, France",
    origin: "JFK",
    start_date: "2026-10-01",
    end_date: "2026-10-08",
    total_price: 2340,
    status: "active",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    notes: null,
    user_created: false,
  },
  {
    id: "sample-miami",
    title: "Miami Beach Weekend",
    destination: "Miami, FL",
    origin: "ATL",
    start_date: "2026-08-22",
    end_date: "2026-08-24",
    total_price: 895,
    status: "active",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    notes: null,
    user_created: false,
  },
];

const SAMPLE_DEALS: Deal[] = [
  {
    id: "d1",
    package_id: "sample-cancun",
    deal_type: "flight",
    provider: "United Airlines",
    title: "DFW to CUN roundtrip",
    description: "Nonstop, carry-on included, morning departure.",
    price: 347,
    original_price: 489,
    order_url: "https://www.google.com/travel/flights",
    rating: 4.2,
    booking_details: {},
    created_at: new Date().toISOString(),
  },
  {
    id: "d2",
    package_id: "sample-cancun",
    deal_type: "hotel",
    provider: "Booking.com",
    title: "Hyatt Ziva Cancun all-inclusive",
    description: "Ocean view room, meals and drinks included, beachfront pool.",
    price: 1200,
    original_price: 1680,
    order_url: "https://www.booking.com",
    rating: 4.7,
    booking_details: {},
    created_at: new Date().toISOString(),
  },
  {
    id: "d3",
    package_id: "sample-cancun",
    deal_type: "car",
    provider: "Hertz",
    title: "Compact car at Cancun airport",
    description: "Unlimited mileage, full-to-full fuel policy.",
    price: 189,
    original_price: null,
    order_url: "https://www.hertz.com",
    rating: 4,
    booking_details: {},
    created_at: new Date().toISOString(),
  },
];

const SAMPLE_EXTRAS: Extra[] = [
  {
    id: "e1",
    package_id: "sample-cancun",
    category: "beach",
    name: "Reef-safe sunscreen",
    description: "Good fit for beach trips and excursions.",
    estimated_price: 18,
    suggested_url: "https://www.amazon.com",
    purchased: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "e2",
    package_id: "sample-cancun",
    category: "safety",
    name: "Travel insurance",
    description: "Trip cancellation, medical coverage, baggage delay.",
    estimated_price: 89,
    suggested_url: "https://www.squaremouth.com",
    purchased: false,
    created_at: new Date().toISOString(),
  },
];

const DEST_IMAGES = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1000&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&q=80",
  "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1000&q=80",
  "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1000&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1000&q=80",
];

const DESTINATION_IMAGE_MATCHES = [
  { match: "cancun", image: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=1200&q=80" },
  { match: "paris", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80" },
  { match: "miami", image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&q=80" },
  { match: "new york", image: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1200&q=80" },
  { match: "tokyo", image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=80" },
  { match: "dublin", image: "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=1200&q=80" },
  { match: "beach", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80" },
];

const REFERENCE_NOW = Date.now();

type PackageDetails = { deals: Deal[]; extras: Extra[] };

export default function PackageGrid({
  loading,
  onOpenIntake,
}: {
  loading?: boolean;
  onOpenIntake: () => void;
}) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [details, setDetails] = useState<Record<string, PackageDetails>>({});
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "sample" | "error">("loading");
  const [error, setError] = useState("");

  const loadPackages = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const active = await getActivePackages();
      if (!active.length) {
        setPackages(SAMPLE_PACKAGES);
        setDetails({ "sample-cancun": { deals: SAMPLE_DEALS, extras: SAMPLE_EXTRAS } });
        setLoadState("sample");
        return;
      }

      const nextDetails: Record<string, PackageDetails> = {};
      await Promise.all(
        active.map(async (pkg) => {
          const [deals, extras] = await Promise.all([getDealsByPackage(pkg.id), getExtrasByPackage(pkg.id)]);
          nextDetails[pkg.id] = { deals, extras };
        }),
      );
      setPackages(active);
      setDetails(nextDetails);
      setLoadState("ready");
    } catch (err) {
      setPackages(SAMPLE_PACKAGES);
      setDetails({ "sample-cancun": { deals: SAMPLE_DEALS, extras: SAMPLE_EXTRAS } });
      setLoadState("error");
      setError(err instanceof Error ? err.message : "Could not load Supabase packages.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPackages();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPackages]);

  const activeDetails = selectedPackage ? details[selectedPackage.id] || { deals: [], extras: [] } : null;

  if (loading || loadState === "loading") {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Active Packages</h2>
          <div className="h-10 w-28 rounded-lg bg-white/8" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="glass-card h-[330px] animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (selectedPackage && activeDetails) {
    return (
      <PackageDetail
        pkg={selectedPackage}
        deals={activeDetails.deals}
        extras={activeDetails.extras}
        onBack={() => setSelectedPackage(null)}
        onRefresh={loadPackages}
        onOpenIntake={onOpenIntake}
      />
    );
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Active Packages</h2>
          {loadState === "sample" && (
            <p className="mt-1 text-sm text-amber-200">Showing sample cards because Supabase has no active packages yet.</p>
          )}
          {loadState === "error" && <p className="mt-1 text-sm text-rose-200">Supabase fallback active: {error}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadPackages}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-300/30 hover:text-sky-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={onOpenIntake}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            <Plus className="h-4 w-4" />
            Intake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg, index) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => setSelectedPackage(pkg)}
            className="glass-card group overflow-hidden text-left shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/20"
          >
            <div className="relative h-52 overflow-hidden bg-slate-900">
              <img
                src={getDestinationImage(pkg, index)}
                alt={`${pkg.destination} travel photo`}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/90 via-[#07111f]/10 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  {pkg.origin || "TBD"} to {pkg.destination}
                </span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="min-h-[3.5rem] text-lg font-bold leading-7 text-white transition group-hover:text-sky-200">
                {pkg.title}
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="h-4 w-4" />
                {formatDate(pkg.start_date)} - {formatDate(pkg.end_date)}
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <span className="text-xs uppercase tracking-wide text-slate-500">Package total</span>
                  <p className="text-2xl font-bold text-gradient">{formatMoney(pkg.total_price)}</p>
                </div>
                <DaysRemaining expiresAt={pkg.expires_at} now={REFERENCE_NOW} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge icon={Plane} label="Flight" />
                <Badge icon={Hotel} label="Hotel" />
                <Badge icon={Car} label="Car" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function PackageDetail({
  pkg,
  deals,
  extras,
  onBack,
  onRefresh,
  onOpenIntake,
}: {
  pkg: Package;
  deals: Deal[];
  extras: Extra[];
  onBack: () => void;
  onRefresh: () => void;
  onOpenIntake: () => void;
}) {
  const totalDealPrice = useMemo(() => deals.reduce((sum, deal) => sum + Number(deal.price || 0), 0), [deals]);
  const daysLeft = getDaysRemaining(pkg.expires_at, REFERENCE_NOW);
  const dealTypes = ["flight", "hotel", "car", "activity"] as const;

  return (
    <section>
      <button type="button" onClick={onBack} className="mb-6 text-sm font-medium text-slate-400 transition hover:text-white">
        Back to packages
      </button>

      <div className="glass-card overflow-hidden shadow-2xl shadow-black/20">
        <div className="relative h-64 overflow-hidden">
          <img src={getDestinationImage(pkg, 0)} alt={`${pkg.destination} travel photo`} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/82 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-5 rounded-full bg-black/48 px-3 py-1 text-sm font-medium text-white backdrop-blur">
            {pkg.destination}
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h2 className="text-3xl font-bold text-white">{pkg.title}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-slate-400">
                <Plane className="h-4 w-4" />
                {pkg.origin || "TBD"} to {pkg.destination}
                <span className="hidden sm:inline">|</span>
                <Calendar className="h-4 w-4" />
                {formatDate(pkg.start_date)} - {formatDate(pkg.end_date)}
              </p>
              {pkg.notes && <p className="mt-3 max-w-2xl text-sm text-slate-400">{pkg.notes}</p>}
            </div>
            <div className="flex items-center gap-3">
              <DaysRemaining expiresAt={pkg.expires_at} now={REFERENCE_NOW} />
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-lg border border-white/10 bg-white/6 p-2.5 text-slate-300 transition hover:text-sky-200"
                title="Refresh package data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric icon={Plane} label="Flights" value={String(deals.filter((deal) => deal.deal_type === "flight").length)} />
            <Metric icon={Hotel} label="Hotels" value={String(deals.filter((deal) => deal.deal_type === "hotel").length)} />
            <Metric icon={Car} label="Cars" value={String(deals.filter((deal) => deal.deal_type === "car").length)} />
            <Metric icon={DollarSign} label="Deals Total" value={formatMoney(totalDealPrice || pkg.total_price)} />
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {dealTypes.map((type) => {
          const typeDeals = deals.filter((deal) => deal.deal_type === type);
          if (!typeDeals.length) return null;
          return (
            <div key={type} className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold capitalize text-white">
                <DealIcon type={type} />
                {type}s
              </h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {typeDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            </div>
          );
        })}

        {!deals.length && (
          <div className="glass-card p-6 text-slate-400">
            No deals are attached yet. Use intake or uploads so the processor has source material.
          </div>
        )}
      </div>

      <div className="mt-8 glass-card p-6">
        <h3 className="mb-1 text-xl font-bold text-white">Trip Essentials</h3>
        <p className="mb-4 text-sm text-slate-500">Destination-specific items and purchase reminders.</p>
        {extras.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {extras.map((extra) => (
              <div key={extra.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`mt-0.5 h-5 w-5 ${extra.purchased ? "text-emerald-300" : "text-slate-600"}`} />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-white">{extra.name}</h4>
                    {extra.description && <p className="mt-1 text-sm text-slate-400">{extra.description}</p>}
                    <p className="mt-2 text-sm font-medium text-sky-200">{formatMoney(extra.estimated_price)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">
            No essentials yet. The processor should add beach, safety, transport, and misc items when it builds the package.
          </p>
        )}
      </div>

      {daysLeft <= 3 && daysLeft > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-orange-400/20 bg-orange-400/10 p-5 text-orange-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">This package expires in {daysLeft} days.</p>
            <p className="mt-1 text-sm text-orange-100/80">Refresh it before booking so prices and availability are current.</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onOpenIntake}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-5 py-2.5 font-medium text-slate-200 transition hover:text-sky-200"
        >
          <Upload className="h-4 w-4" />
          Add Source
        </button>
        <button type="button" className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-5 py-2.5 font-medium text-slate-400">
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </section>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const savings = deal.original_price ? Number(deal.original_price) - Number(deal.price) : 0;
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 transition hover:border-white/20">
      {savings > 0 && (
        <div className="mb-2 inline-flex rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
          Save {formatMoney(savings)}
        </div>
      )}
      <h4 className="font-semibold text-white">{deal.title}</h4>
      <p className="mt-1 text-sm text-slate-500">{deal.provider}</p>
      {deal.description && <p className="mt-3 text-sm leading-6 text-slate-400">{deal.description}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {deal.original_price && <span className="mr-2 text-sm text-slate-500 line-through">{formatMoney(deal.original_price)}</span>}
          <span className="text-xl font-bold text-gradient">{formatMoney(deal.price)}</span>
        </div>
        {deal.rating && (
          <span className="flex items-center gap-1 text-sm text-amber-200">
            <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
            {deal.rating}
          </span>
        )}
        {deal.order_url && (
          <a
            href={deal.order_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Open
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function DaysRemaining({ expiresAt, now }: { expiresAt: string; now: number }) {
  const days = getDaysRemaining(expiresAt, now);
  if (days <= 0) return <span className="rounded-full bg-rose-400/10 px-3 py-1 text-sm font-semibold text-rose-200">Expired</span>;
  if (days <= 3) return <span className="rounded-full bg-orange-400/10 px-3 py-1 text-sm font-semibold text-orange-200">{days}d left</span>;
  return <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-200">{days}d left</span>;
}

function getDaysRemaining(expiresAt: string, now: number) {
  return Math.ceil((new Date(expiresAt).getTime() - now) / 86400000);
}

function DealIcon({ type }: { type: Deal["deal_type"] }) {
  if (type === "flight") return <Plane className="h-5 w-5 text-sky-300" />;
  if (type === "hotel") return <Hotel className="h-5 w-5 text-orange-300" />;
  if (type === "car") return <Car className="h-5 w-5 text-emerald-300" />;
  return <Star className="h-5 w-5 text-violet-300" />;
}

function Metric({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
      <Icon className="mx-auto mb-2 h-5 w-5 text-sky-300" />
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function Badge({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-xs text-slate-300">
      <Icon className="h-3.5 w-3.5 text-sky-300" />
      {label}
    </span>
  );
}

function getDestinationImage(pkg: Package, index: number) {
  const haystack = `${pkg.destination || ""} ${pkg.title || ""}`.toLowerCase();
  const match = DESTINATION_IMAGE_MATCHES.find((item) => haystack.includes(item.match));
  return match?.image || DEST_IMAGES[index % DEST_IMAGES.length];
}

function formatMoney(value?: number | string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "TBD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numeric);
}

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
