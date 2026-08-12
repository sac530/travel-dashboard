import { Camera, ClipboardList, Plane, RefreshCw } from "lucide-react";
import DestinationMarquee from "@/components/DestinationMarquee";

export default function Hero({ onOpenIntake }: { onOpenIntake: () => void }) {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=2400&q=85')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07111f]/96 via-[#07111f]/76 to-[#07111f]/52" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07111f] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-end">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Live travel deals across flights, stays, cars, and extras
          </div>
          <h1 className="max-w-4xl text-5xl font-bold leading-[1.02] text-white sm:text-7xl">
            TravelDash
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
            A private travel desk for turning good fares, hotel finds, screenshots,
            and trip ideas into bookable packages before the prices move.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenIntake}
              className="flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-3 font-semibold text-white shadow-lg shadow-sky-950/30 transition hover:bg-sky-400"
            >
              <ClipboardList className="h-4 w-4" />
              Plan a Trip
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-300">
              <RefreshCw className="h-4 w-4 text-sky-300" />
              Auto-refresh: 2h
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Curated packages",
              image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80",
              icon: Plane,
            },
            {
              label: "Deal screenshots",
              image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80",
              icon: Camera,
            },
          ].map((item) => (
            <div key={item.label} className="overflow-hidden rounded-lg border border-white/10 bg-black/24 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="h-44 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
              <div className="flex items-center gap-2 p-3 text-sm font-medium text-slate-200">
                <item.icon className="h-4 w-4 text-sky-300" />
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mx-auto mt-12 max-w-7xl">
        <DestinationMarquee />
      </div>
    </section>
  );
}
