"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { getActivePackages, getDealsByPackage, getExtrasByPackage, requestPackageRenewal } from "@/lib/api";
import type { Deal, Extra, Package } from "@/lib/supabase";

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
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [autoRefreshNote, setAutoRefreshNote] = useState("");
  const [error, setError] = useState("");
  const [renewingPackageId, setRenewingPackageId] = useState<string | null>(null);
  const [renewedPackageIds, setRenewedPackageIds] = useState<Set<string>>(new Set());

  const loadPackages = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const active = await getActivePackages();
      if (!active.length) {
        setPackages([]);
        setDetails({});
        setLoadState("ready");
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
      setPackages([]);
      setDetails({});
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

  // Auto-refresh: if every package is expired (or none exist), automatically
  // queue a renewal for each so the background agent re-scrapes them. The grid
  // shows an honest empty/queued state - never sample cards.
  const autoRefreshStartedRef = React.useRef(false);
  useEffect(() => {
    if (loadState !== "ready" || autoRefreshStartedRef.current) return;
    const now = Date.now();
    const expiredPackages = packages.filter((pkg) => new Date(pkg.expires_at).getTime() <= now && pkg.status === "active");
    const allExpired = packages.length > 0 && expiredPackages.length >= packages.length;
    if (packages.length === 0 || allExpired) {
      autoRefreshStartedRef.current = true;
      setAutoRefreshNote(
        packages.length === 0
          ? "No packages yet - auto-refresh is starting for the next 1-2 months of travel."
          : `${expiredPackages.length} package(s) expired - auto-refresh queued for the next 1-2 months. New cards will appear automatically.`,
      );
      (async () => {
        let queued = 0;
        for (const pkg of expiredPackages) {
          try {
            await requestPackageRenewal(pkg, details[pkg.id]?.deals || []);
            queued += 1;
          } catch {
            // keep going - one failure should not block the rest
          }
        }
        if (queued > 0) {
          setPackages((current) => current.map((item) => (expiredPackages.some((e) => e.id === item.id) ? { ...item, status: "refresh_requested" as const } : item)));
        }
        // Poll for fresh active packages for up to 15 minutes so the grid
        // updates automatically when the agent finishes the refresh.
        const startedAt = Date.now();
        while (Date.now() - startedAt < 15 * 60 * 1000) {
          await new Promise((resolve) => setTimeout(resolve, 60_000));
          try {
            const fresh = await getActivePackages();
            if (fresh.some((p) => p.status === "active")) {
              setAutoRefreshNote("");
              void loadPackages();
              return;
            }
          } catch {
            // ignore polling errors
          }
        }
      })();
    }
  }, [loadState, packages, details]);

  const activeDetails = selectedPackage ? details[selectedPackage.id] || { deals: [], extras: [] } : null;

  async function handleRenewPackage(pkg: Package) {
    setRenewingPackageId(pkg.id);
    setError("");
    try {
      await requestPackageRenewal(pkg, details[pkg.id]?.deals || []);
      setPackages((current) => current.map((item) => (item.id === pkg.id ? { ...item, status: "refresh_requested" } : item)));
      setRenewedPackageIds((current) => new Set(current).add(pkg.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue package renewal.");
    } finally {
      setRenewingPackageId(null);
    }
  }

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
          {autoRefreshNote && <p className="mt-1 text-sm text-sky-200">{autoRefreshNote}</p>}
          {loadState === "error" && <p className="mt-1 text-sm text-rose-200">Could not load packages: {error}</p>}
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

      {packages.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-sky-300" />
          <h3 className="text-lg font-semibold text-white">No packages yet</h3>
          <p className="max-w-md text-sm text-slate-400">
            Auto-refresh is running. Fresh packages for the next 1-2 months will appear here automatically - no samples, real deals only.
          </p>
          <button
            type="button"
            onClick={onOpenIntake}
            className="mt-2 flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            <Plus className="h-4 w-4" />
            Request a destination
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, index) => {
          const packageDeals = details[pkg.id]?.deals || [];
          const primaryDealUrl = findPrimaryDealUrl(packageDeals);
          const isExpired = getDaysRemaining(pkg.expires_at, REFERENCE_NOW) <= 0;
          const renewalQueued = pkg.status === "refresh_requested" || renewedPackageIds.has(pkg.id);

          return (
            <article
              key={pkg.id}
              className="glass-card group overflow-hidden text-left shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/20"
            >
              <button type="button" onClick={() => setSelectedPackage(pkg)} className="block w-full text-left">
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
              </button>
              <div className="p-5">
                <button type="button" onClick={() => setSelectedPackage(pkg)} className="block w-full text-left">
                  <h3 className="min-h-[3.5rem] text-lg font-bold leading-7 text-white transition group-hover:text-sky-200">
                    {pkg.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="h-4 w-4" />
                    {formatDate(pkg.start_date)} - {formatDate(pkg.end_date)}
                  </div>
                </button>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-slate-500">Package total</span>
                    <p className="text-2xl font-bold text-gradient">{formatMoney(pkg.total_price)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <DaysRemaining expiresAt={pkg.expires_at} now={REFERENCE_NOW} status={pkg.status} />
                    {isExpired && (
                      <button
                        type="button"
                        onClick={() => void handleRenewPackage(pkg)}
                        disabled={renewingPackageId === pkg.id || renewalQueued}
                        className="rounded-md border border-sky-300/30 bg-sky-400/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-sky-100 transition hover:border-sky-200/60 hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                      >
                        {renewalQueued ? "Queued" : renewingPackageId === pkg.id ? "Renewing" : "Renew"}
                      </button>
                    )}
                  </div>
                </div>
                {primaryDealUrl && (
                  <a
                    href={primaryDealUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
                    title="Open the best available booking link for this package"
                  >
                    Book package
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <DealBadge icon={Plane} label="Flight" url={findDealUrl(packageDeals, "flight")} />
                  <DealBadge icon={Hotel} label="Hotel" url={findDealUrl(packageDeals, "hotel")} />
                  <DealBadge icon={Car} label="Car" url={findDealUrl(packageDeals, "car")} />
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}
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
              <DaysRemaining expiresAt={pkg.expires_at} now={REFERENCE_NOW} status={pkg.status} />
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
              <ExtraCard key={extra.id} extra={extra} />
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

function ExtraCard({ extra }: { extra: Extra }) {
  const content = (
    <div className="flex items-start gap-3">
      <CheckCircle2 className={`mt-0.5 h-5 w-5 ${extra.purchased ? "text-emerald-300" : "text-slate-600"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-semibold text-white">{extra.name}</h4>
          {extra.suggested_url && <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-500" />}
        </div>
        {extra.description && <p className="mt-1 text-sm text-slate-400">{extra.description}</p>}
        <p className="mt-2 text-sm font-medium text-sky-200">{formatMoney(extra.estimated_price)}</p>
      </div>
    </div>
  );

  if (extra.suggested_url) {
    return (
      <a
        href={extra.suggested_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-sky-300/40 hover:bg-white/8"
        title={`Open purchase link for ${extra.name}`}
      >
        {content}
      </a>
    );
  }

  return <div className="rounded-lg border border-white/10 bg-white/5 p-4">{content}</div>;
}

function DealCard({ deal }: { deal: Deal }) {
  const savings = deal.original_price ? Number(deal.original_price) - Number(deal.price) : 0;
  const content = (showAction: boolean) => (
    <>
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
        {showAction && deal.order_url && (
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
    </>
  );

  if (deal.order_url) {
    return (
      <a
        href={deal.order_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 transition hover:border-sky-300/40 hover:bg-white/8"
        title={`Open booking link for ${deal.title}`}
      >
        {content(false)}
        <span className="mt-4 inline-flex items-center gap-1 rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-400">
          Open
          <ExternalLink className="h-3.5 w-3.5" />
        </span>
      </a>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 transition hover:border-white/20">
      {content(true)}
    </div>
  );
}

function DaysRemaining({ expiresAt, now, status }: { expiresAt: string; now: number; status?: Package["status"] }) {
  if (status === "refresh_requested") {
    return <span className="rounded-full bg-sky-400/10 px-3 py-1 text-sm font-semibold text-sky-200">Renewal queued</span>;
  }
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

function getDestinationImage(pkg: Package, index: number) {
  const haystack = `${pkg.destination || ""} ${pkg.title || ""}`.toLowerCase();
  const match = DESTINATION_IMAGE_MATCHES.find((item) => haystack.includes(item.match));
  return match?.image || DEST_IMAGES[index % DEST_IMAGES.length];
}

function DealBadge({
  icon: Icon,
  label,
  url,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  url?: string | null;
}) {
  const className =
    "flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-xs text-slate-300 transition";

  if (!url) {
    return (
      <span className={className} title={`${label} booking link not available yet`}>
        <Icon className="h-3.5 w-3.5 text-sky-300" />
        {label}
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} hover:border-sky-300/40 hover:text-sky-100`}
      title={`Open ${label.toLowerCase()} booking link`}
    >
      <Icon className="h-3.5 w-3.5 text-sky-300" />
      {label}
      <ExternalLink className="h-3 w-3 text-slate-500" />
    </a>
  );
}

function findDealUrl(deals: Deal[], type: Deal["deal_type"]) {
  return deals.find((deal) => deal.deal_type === type && deal.order_url)?.order_url || null;
}

function findPrimaryDealUrl(deals: Deal[]) {
  return (
    findDealUrl(deals, "flight") ||
    findDealUrl(deals, "hotel") ||
    findDealUrl(deals, "car") ||
    deals.find((deal) => deal.order_url)?.order_url ||
    null
  );
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
