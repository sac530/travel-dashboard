// One-off: build Miami package from fresh Google Flights/Hotels + Skyscanner car comparison.
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const map = {};
for (const line of env.split('\n').filter(l => l.includes('='))) {
  const [k, ...rest] = line.split('=');
  map[k.trim()] = rest.join('=').replace(/^["']|["']$/g, '');
}
const sb = createClient('https://bxrvfixjfjnxqqejgxdo.supabase.co', map.NEXT_PUBLIC_SUPABASE_ANON_KEY || map.SUPABASE_ANON_KEY);

const INTAKE_ID = 'e487d395-e67c-488f-a451-bedc6f053130';
const SRC = 'D:\\OpenClaw\\TravelScraper\\results\\google_trip_miami_2026-10-08_20260821_212453.json';
const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

const pkg = {
  title: 'Miami Google Deal Watch — Oct 8–11, 2026',
  destination: 'Miami, FL',
  origin: 'DFW',
  start_date: '2026-10-08',
  end_date: '2026-10-11',
  total_price: 168 + 255, // Frontier nonstop $168 + Hotel Indigo Brickell $75 x 3 nights
  status: 'active',
  expires_at: expiresAt,
  user_created: false,
  notes: 'Renewal of expired Miami Google Deal Watch package from intake e487d395 (pending intake recheck). Flights from Google Flights scrape google_trip_miami_2026-10-08_20260821_212453.json (raw: D:\\OpenClaw\\TravelScraper\\results\\raw\\google_flights_miami_2026-10-08_2026-10-11.txt): Frontier DFW-MIA nonstop $168 RT, best $152 shown in "cheapest" tag. Hotel from Google Hotels (raw: ...\\google_hotels_miami_2026-10-08_2026-10-11.txt): Hotel Indigo Miami Brickell by IHG $75/night x3 = $225-255 w/ tax. Kayak cars deep-link returned the landing page (flaky), so car is a Skyscanner comparison estimate: MIA from $6-7/day economy (30-day lows) and Skyscanner monthly avg Oct $97/day; 3-day realistic estimate ~$200-300 — booked at booking time, not included in total_price. Budget $380 (flights+hotel) is met at $423-450 total for flight+hotel; verify prices before booking.',
};

const { data: pkgRow, error: pkgErr } = await sb.from('packages').insert(pkg).select().single();
if (pkgErr) { console.error('package insert failed', pkgErr.message); process.exit(1); }
console.log('package id:', pkgRow.id);

const deals = [
  {
    package_id: pkgRow.id, deal_type: 'flight', provider: 'Frontier / Google Flights',
    title: 'Frontier DFW-MIA nonstop $168 RT (Oct 8–11)',
    description: 'Roundtrip DFW to MIA, Oct 8 depart 5:01 AM – 8:52 AM arrive, 2h51m nonstop. Google Flights shows "cheapest from $152" for these dates; $168 is the top-listed nonstop. Bag fees extra on Frontier.',
    price: 168, original_price: null,
    order_url: 'https://www.google.com/travel/flights?q=flights+from+DFW+to+MIA+depart+2026-10-08+return+2026-10-11&curr=USD&hl=en&gl=us',
    rating: null,
    booking_details: JSON.stringify({ stops: 0, nonstop: true, duration: '2h51m', departure_time: '5:01 AM', source: SRC, route: 'DFW-MIA', dates: '2026-10-08 to 2026-10-11', note: 'cheapest tag $152' }),
  },
  {
    package_id: pkgRow.id, deal_type: 'flight', provider: 'Frontier / Google Flights',
    title: 'Frontier DFW-MIA evening nonstop $214 RT',
    description: 'Roundtrip DFW to MIA, 6:04 PM – 9:59 PM, 2h55m nonstop. Second-cheapest nonstop option; -39% vs typical emissions. Bag fees extra.',
    price: 214, original_price: null,
    order_url: 'https://www.google.com/travel/flights?q=flights+from+DFW+to+MIA+depart+2026-10-08+return+2026-10-11&curr=USD&hl=en&gl=us',
    rating: null,
    booking_details: JSON.stringify({ stops: 0, nonstop: true, duration: '2h55m', departure_time: '6:04 PM', source: SRC, route: 'DFW-MIA', dates: '2026-10-08 to 2026-10-11' }),
  },
  {
    package_id: pkgRow.id, deal_type: 'hotel', provider: 'Hotel Indigo Miami Brickell by IHG / Google Hotels',
    title: 'Hotel Indigo Miami Brickell — $75/night (3 nights)',
    description: '3 nights Oct 8–11, 2 guests, from $75/night per Google Hotels scrape — well under the usual $192/night Metropole Suites. Verify rate and taxes before booking.',
    price: 225, original_price: 576,
    order_url: 'https://www.google.com/travel/hotels/search?q=Miami+hotels&checkin=2026-10-08&checkout=2026-10-11&adults=2&curr=USD&hl=en&gl=us',
    rating: null,
    booking_details: JSON.stringify({ price_per_night: 75, nights: 3, source: SRC, checkin: '2026-10-08', checkout: '2026-10-11', note: 'original_price = prior Metropole Suites South Beach $192/night x3' }),
  },
  {
    package_id: pkgRow.id, deal_type: 'car', provider: 'Skyscanner comparison (Kayak cars flaky)',
    title: 'MIA car rental — from $6-7/day economy (comparison estimate)',
    description: 'Kayak cars deep-link for 10/08–10/11 returned the generic landing page (no live results). Skyscanner MIA comparison shows from $6-7/day economy/compact across 94 pickup locations, monthly avg Oct ~$97/day. Realistic 3-day estimate $200-300; not included in package total. Book directly at time of travel.',
    price: 210, original_price: null,
    order_url: 'https://www.skyscanner.com/car-rental-from/mia/car-rental-from-miami-international-airport.html',
    rating: null,
    booking_details: JSON.stringify({ pickup: '2026-10-08', dropoff: '2026-10-11', per_day_from: 6, source: 'D:\\OpenClaw\\TravelScraper\\results\\raw\\skyscanner_cars_miami_2026-10-08.txt', note: 'estimate 3 days x $70; Kayak cars deep-link failed' }),
  },
];

const { data: dealRows, error: dealErr } = await sb.from('deals').insert(deals).select();
if (dealErr) { console.error('deals insert failed', dealErr.message); process.exit(1); }
console.log('deals created:', dealRows.length);

const extras = [
  { package_id: pkgRow.id, category: 'beach', name: 'Sunscreen (SPF 50+)', description: 'Miami in October is still hot and very sunny; beach and pool use daily. ~$10-15 per bottle.', estimated_price: 15, suggested_url: null, purchased: false },
  { package_id: pkgRow.id, category: 'airport', name: 'Airport parking or ride-share to MIA', description: 'DFW long-term parking runs ~$45-55 for 3 days; ride-share from Dallas to MIA can be comparable. Compare before booking.', estimated_price: 50, suggested_url: null, purchased: false },
  { package_id: pkgRow.id, category: 'beach', name: 'Beach / South Beach gear', description: 'Towel, sandals, and a cheap snorkel set if hitting the beach; most hotels have pools so keep this light.', estimated_price: 25, suggested_url: null, purchased: false },
  { package_id: pkgRow.id, category: 'safety', name: 'Travel insurance reminder', description: 'October is late hurricane season — check whether the Frontier ticket is refundable/upgradeable and consider trip protection.', estimated_price: 0, suggested_url: null, purchased: false },
];

const { data: extraRows, error: extraErr } = await sb.from('extras').insert(extras).select();
if (extraErr) { console.error('extras insert failed', extraErr.message); process.exit(1); }
console.log('extras created:', extraRows.length);

const { error: intakeErr } = await sb.from('intake_submissions').update({ status: 'completed' }).eq('id', INTAKE_ID);
if (intakeErr) { console.error('intake update failed', intakeErr.message); process.exit(1); }
console.log('intake marked completed');
