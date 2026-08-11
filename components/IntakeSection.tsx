"use client";

import { useState } from "react";
import { Plane, MapPin, Calendar, DollarSign, Send } from "lucide-react";

export default function IntakeSection() {
  const [submitted, setSubmitted] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // In production, this would POST to the API → intake_submissions table
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <section>
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">Find a Deal? Start a Package</h2>
        <p className="text-gray-400 max-w-xl">
          Found flights or hotels at great prices? Tell us what you found and I'll build 
          out the rest — hotel, car rental, activities, even beach gear.
        </p>
      </div>

      {submitted && (
        <div className="mb-8 p-5 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
          <p className="text-green-300 font-semibold text-lg">✓ Submission received!</p>
          <p className="text-sm text-gray-400 mt-1">I'll build a package around your findings. Check back in a few minutes.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
        {/* Trip Details */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            🗺️ Trip Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Destination *</label>
              <input
                type="text"
                required
                placeholder="e.g., Cancún, Mexico"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-ocean-500 focus:outline-none focus:ring-1 focus:ring-ocean-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Origin (where you fly from)</label>
              <input
                type="text"
                placeholder="e.g., DFW"
                value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-ocean-500 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-ocean-500 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-ocean-500 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* What you found */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            ✈️ What You Found
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Flight Details</label>
              <textarea
                rows={3}
                placeholder='e.g., Found United DFW→CUN for $289 roundtrip Aug 15-22, non-stop'
                value={form.flightInfo}
                onChange={(e) => setForm({ ...form, flightInfo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-ocean-500 focus:outline-none transition-all resize-vertical"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Hotel Details</label>
              <textarea
                rows={3}
                placeholder='e.g., Hyatt Ziva Cancún $1,400/night all-inclusive for 7 nights'
                value={form.hotelInfo}
                onChange={(e) => setForm({ ...form, hotelInfo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-ocean-500 focus:outline-none transition-all resize-vertical"
              />
            </div>
          </div>
        </div>

        {/* Budget & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Total Budget (max)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-600" />
              <input
                type="number"
                placeholder="5000"
                value={form.budgetMax}
                onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-ocean-500 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-ocean-500 to-sunset-500 hover:from-ocean-400 hover:to-sunset-400 text-white font-semibold transition-all shadow-lg shadow-ocean-500/20"
            >
              <Send className="w-4 h-4" /> Build Package
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Additional Notes</label>
          <textarea
            rows={2}
            placeholder="Any preferences? Beach vs city? Luxury or budget?"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-ocean-500 focus:outline-none transition-all resize-vertical"
          />
        </div>
      </form>

      <p className="text-center text-xs text-gray-600 mt-4">
        Submissions are processed automatically. I'll search for flights, hotels, cars and build a complete package around your findings.
      </p>
    </section>
  );
}
