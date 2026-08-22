"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Compass, FileText, Ship, Sparkles } from "lucide-react";
import calendarEntries from "@/data/master-calendar.json";

type CalendarCategory = "destination" | "international" | "cruise" | "research" | "follow-up" | "note";

type CalendarEntry = {
  id: string;
  date: string;
  destination: string;
  category: CalendarCategory;
  title: string;
  description: string;
  source?: string;
};

const entries = calendarEntries as CalendarEntry[];

const categoryStyles: Record<CalendarCategory, { label: string; dot: string; pill: string; icon: typeof Compass }> = {
  destination: {
    label: "Destination",
    dot: "bg-sky-300",
    pill: "border-sky-300/20 bg-sky-400/10 text-sky-100",
    icon: Compass,
  },
  international: {
    label: "International",
    dot: "bg-violet-300",
    pill: "border-violet-300/20 bg-violet-400/10 text-violet-100",
    icon: Sparkles,
  },
  cruise: {
    label: "Cruise",
    dot: "bg-cyan-300",
    pill: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
    icon: Ship,
  },
  research: {
    label: "Research",
    dot: "bg-amber-300",
    pill: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    icon: FileText,
  },
  "follow-up": {
    label: "Follow-up",
    dot: "bg-rose-300",
    pill: "border-rose-300/20 bg-rose-400/10 text-rose-100",
    icon: CalendarDays,
  },
  note: {
    label: "Note",
    dot: "bg-emerald-300",
    pill: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    icon: FileText,
  },
};

export default function MasterCalendar() {
  const initialMonth = getMonthStart(entries[0]?.date || new Date().toISOString());
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);

  const entriesByDate = useMemo(() => {
    return entries.reduce<Record<string, CalendarEntry[]>>((acc, entry) => {
      acc[entry.date] = [...(acc[entry.date] || []), entry];
      return acc;
    }, {});
  }, []);

  const monthDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const visibleEntries = useMemo(
    () => entries.filter((entry) => entry.date.startsWith(formatMonthKey(visibleMonth))),
    [visibleMonth],
  );

  function shiftMonth(offset: number) {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1));
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-200/80">Master Calendar</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Destination checks and research log</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Color-coded travel checks, refreshes, research notes, and follow-ups pulled from the workspace calendar file.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/6 text-slate-300 transition hover:text-white"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-40 rounded-lg border border-white/10 bg-white/6 px-4 py-2 text-center font-semibold text-white">
            {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/6 text-slate-300 transition hover:text-white"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="glass-card p-4 sm:p-5">
          <div className="grid grid-cols-7 gap-2 pb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day) => {
              const key = formatDateKey(day);
              const dayEntries = entriesByDate[key] || [];
              const muted = day.getMonth() !== visibleMonth.getMonth();
              return (
                <div
                  key={key}
                  className={`min-h-28 rounded-lg border p-2 transition ${
                    muted ? "border-white/5 bg-white/[0.025] text-slate-600" : "border-white/10 bg-white/5 text-slate-200"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{day.getDate()}</span>
                    {dayEntries.length > 0 && <span className="text-xs text-slate-500">{dayEntries.length}</span>}
                  </div>
                  <div className="space-y-1">
                    {dayEntries.slice(0, 3).map((entry) => {
                      const style = categoryStyles[entry.category];
                      return (
                        <div key={entry.id} className="rounded-md bg-black/22 px-2 py-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                            <span className="truncate text-xs font-medium text-white">{entry.destination}</span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-400">{entry.title}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-white">Legend</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(categoryStyles).map(([key, style]) => {
                const Icon = style.icon;
                return (
                  <span key={key} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${style.pill}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {style.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-white">This Month</h2>
            <div className="mt-4 space-y-3">
              {visibleEntries.length ? (
                visibleEntries.map((entry) => {
                  const style = categoryStyles[entry.category];
                  return (
                    <article key={entry.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{entry.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatReadableDate(entry.date)} - {entry.destination}
                          </p>
                        </div>
                        <span className={`h-3 w-3 shrink-0 rounded-full ${style.dot}`} title={style.label} />
                      </div>
                      <p className="mt-2 text-sm leading-5 text-slate-400">{entry.description}</p>
                      {entry.source && <p className="mt-2 text-xs text-slate-600">Source: {entry.source}</p>}
                    </article>
                  );
                })
              ) : (
                <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">
                  No entries for this month yet.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function getMonthStart(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarDays(monthStart: Date) {
  const first = new Date(monthStart);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatReadableDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
