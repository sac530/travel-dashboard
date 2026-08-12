"use client";

import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { Calendar, DollarSign, MapPin, Plane, Send } from "lucide-react";
import { createIntakeSubmission } from "@/lib/api";

export default function IntakeSection() {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    destination: "",
    origin: "",
    startDate: "",
    endDate: "",
    flightInfo: "",
    hotelInfo: "",
    budgetMax: "",
    notes: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");

    try {
      await createIntakeSubmission({
        destination: form.destination.trim(),
        origin: form.origin.trim() || null,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        flight_info: form.flightInfo.trim() || null,
        hotel_info: form.hotelInfo.trim() || null,
        budget_max: form.budgetMax ? Number(form.budgetMax) : null,
        notes: form.notes.trim() || null,
        status: "pending",
      });
      setStatus("saved");
      setForm({
        destination: "",
        origin: "",
        startDate: "",
        endDate: "",
        flightInfo: "",
        hotelInfo: "",
        budgetMax: "",
        notes: "",
      });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not save the intake request.");
    }
  }

  return (
    <section>
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-sky-300">
          <MapPin className="h-4 w-4" />
          Intake queue
        </div>
        <h2 className="text-3xl font-bold text-white">Start a Travel Package</h2>
        <p className="mt-3 max-w-xl text-slate-400">
          Add enough detail for the scraper or a local LLM to turn this into flights,
          hotels, cars, activities, and essentials.
        </p>
      </div>

      {status === "saved" && (
        <div className="mb-6 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-200">
          Submission saved as pending. The intake checker can pick it up from Supabase.
        </div>
      )}
      {status === "error" && (
        <div className="mb-6 rounded-lg border border-rose-400/20 bg-rose-400/10 p-4 text-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card space-y-6 p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Destination" required>
            <input
              required
              placeholder="Cancun, Mexico"
              value={form.destination}
              onChange={(event) => setForm({ ...form, destination: event.target.value })}
              className="field-input"
            />
          </Field>
          <Field label="Origin">
            <input
              placeholder="DFW"
              value={form.origin}
              onChange={(event) => setForm({ ...form, origin: event.target.value.toUpperCase() })}
              className="field-input"
            />
          </Field>
          <Field label="Start Date" icon={<Calendar className="h-4 w-4" />}>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              className="field-input"
            />
          </Field>
          <Field label="End Date" icon={<Calendar className="h-4 w-4" />}>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              className="field-input"
            />
          </Field>
        </div>

        <Field label="Flight Details" icon={<Plane className="h-4 w-4" />}>
          <textarea
            rows={3}
            placeholder="Example: United DFW to CUN for $289 roundtrip, nonstop, Aug 15-22."
            value={form.flightInfo}
            onChange={(event) => setForm({ ...form, flightInfo: event.target.value })}
            className="field-input resize-y"
          />
        </Field>

        <Field label="Hotel Details">
          <textarea
            rows={3}
            placeholder="Example: Hyatt Ziva Cancun all-inclusive, ocean view, $1,400 total."
            value={form.hotelInfo}
            onChange={(event) => setForm({ ...form, hotelInfo: event.target.value })}
            className="field-input resize-y"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Total Budget" icon={<DollarSign className="h-4 w-4" />}>
            <input
              type="number"
              min="0"
              placeholder="2500"
              value={form.budgetMax}
              onChange={(event) => setForm({ ...form, budgetMax: event.target.value })}
              className="field-input"
            />
          </Field>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={status === "saving"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-6 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              {status === "saving" ? "Saving..." : "Build Package"}
            </button>
          </div>
        </div>

        <Field label="Additional Notes">
          <textarea
            rows={3}
            placeholder="Preferences, flexibility, must-haves, passport notes, luggage, activities, or deal links."
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            className="field-input resize-y"
          />
        </Field>
      </form>
    </section>
  );
}

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
        {icon}
        {label}
        {required ? <span className="text-sky-300">*</span> : null}
      </span>
      {children}
    </label>
  );
}
