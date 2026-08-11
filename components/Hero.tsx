export default function Hero() {
  return (
    <section className="relative py-20 sm:py-32 overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506929562872-bb4b83c9630e?w=1920&q=70')" }}
      />
      
      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ocean-500/10 border border-ocean-500/20 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-ocean-300 font-medium">Live deals refreshed every 2 hours</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
          Your Next Adventure,{"\n"}
          <span className="text-gradient">One Click Away</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
          Auto-generated travel packages with the best deals on flights, hotels, and cars. 
          Upload your own finds and let us build the perfect package around them.
        </p>

        <div className="flex flex-wrap justify-center gap-4 text-sm">
          {[
            { icon: "✈️", label: "Flights" },
            { icon: "🏨", label: "Hotels" },
            { icon: "🚗", label: "Car Rentals" },
            { icon: "🎯", label: "Activities" },
            { icon: "⚡", label: "Auto-Expiry 7 Days" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <span>{item.icon}</span>
              <span className="text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative gradient */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-t from-ocean-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
    </section>
  );
}
