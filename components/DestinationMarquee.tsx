const DESTINATIONS = [
  "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=900&q=80",
  "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=900&q=80",
  "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=900&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80",
  "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=900&q=80",
  "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=900&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80",
];

export default function DestinationMarquee({ compact = false }: { compact?: boolean }) {
  const places = [...DESTINATIONS, ...DESTINATIONS];

  return (
    <div className="destination-marquee" aria-label="Travel destination photos">
      <div className="destination-track">
        {places.map((image, index) => (
          <figure
            key={`${image}-${index}`}
            className={`destination-tile ${compact ? "destination-tile-compact" : ""}`}
          >
            <img src={image} alt={`Travel destination ${index + 1}`} />
          </figure>
        ))}
      </div>
    </div>
  );
}
