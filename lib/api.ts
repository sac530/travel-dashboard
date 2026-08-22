import { supabase, type Package, type Deal, type Extra, type ManualUpload, type IntakeSubmission } from './supabase';

// ─── Packages ──────────────────────────────────────────────
export async function getActivePackages() {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .in('status', ['active', 'refresh_requested'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Package[];
}

export async function getPackageById(id: string) {
  const { data } = await supabase.from('packages').select('*').eq('id', id).single();
  return data as Package | null;
}

export async function createPackage(pkg: Omit<Package, 'id' | 'created_at' | 'expires_at'> & Partial<Pick<Package, 'expires_at'>>) {
  const expiresAt = pkg.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase.from('packages').insert({ ...pkg, expires_at: expiresAt }).select().single();
  return data as Package;
}

export async function updatePackage(id: string, updates: Partial<Package>) {
  const { data, error } = await supabase.from('packages').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Package | null;
}

export async function requestPackageRenewal(pkg: Package, deals: Deal[] = []) {
  const flightDeals = deals.filter((deal) => deal.deal_type === 'flight');
  const hotelDeals = deals.filter((deal) => deal.deal_type === 'hotel');
  const carDeals = deals.filter((deal) => deal.deal_type === 'car');

  const summarizeDeals = (items: Deal[]) =>
    items
      .map((deal) => `${deal.provider}: ${deal.title}${deal.price ? ` (${formatMoney(deal.price)})` : ''}`)
      .join('\n') || null;

  const notes = [
    `Renew expired TravelDash package: ${pkg.title}.`,
    pkg.notes ? `Previous notes: ${pkg.notes}` : null,
    carDeals.length ? `Recheck car options:\n${summarizeDeals(carDeals)}` : 'Recheck car rental options if useful for this trip.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const submission = await createIntakeSubmission({
    destination: pkg.destination,
    origin: pkg.origin || null,
    start_date: pkg.start_date || null,
    end_date: pkg.end_date || null,
    flight_info: summarizeDeals(flightDeals),
    hotel_info: summarizeDeals(hotelDeals),
    budget_max: pkg.total_price || null,
    notes,
    status: 'pending',
  });

  await updatePackage(pkg.id, { status: 'refresh_requested' });
  return submission;
}

// ─── Deals ──────────────────────────────────────────────────
export async function getDealsByPackage(packageId: string) {
  const { data, error } = await supabase.from('deals').select('*').eq('package_id', packageId).order('deal_type');
  if (error) throw error;
  return (data || []) as Deal[];
}

export async function addDeal(deal: Omit<Deal, 'id' | 'created_at'>) {
  const { data } = await supabase.from('deals').insert(deal).select().single();
  return data as Deal;
}

// ─── Extras ────────────────────────────────────────────────
export async function getExtrasByPackage(packageId: string) {
  const { data, error } = await supabase.from('extras').select('*').eq('package_id', packageId).order('category');
  if (error) throw error;
  return (data || []) as Extra[];
}

export async function addExtra(extra: Omit<Extra, 'id' | 'created_at'>) {
  const { data } = await supabase.from('extras').insert(extra).select().single();
  return data as Extra;
}

// ─── Manual Uploads ────────────────────────────────────────
export async function getUploadsByPackage(packageId: string) {
  const { data } = await supabase.from('manual_uploads').select('*').eq('package_id', packageId).order('created_at', { ascending: false });
  return (data || []) as ManualUpload[];
}

export async function addUpload(upload: Omit<ManualUpload, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('manual_uploads').insert(upload).select().single();
  if (error) throw error;
  return data as ManualUpload;
}

// ─── Intake Submissions ────────────────────────────────────
export async function getIntakeSubmissions(status?: string) {
  let query = supabase.from('intake_submissions').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data } = await query;
  return (data || []) as IntakeSubmission[];
}

export async function createIntakeSubmission(submission: Omit<IntakeSubmission, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('intake_submissions').insert(submission).select().single();
  if (error) throw error;
  return data as IntakeSubmission;
}

// ─── Cleanup (expired packages) ────────────────────────────
export async function getExpiredPackages() {
  const now = new Date().toISOString();
  const { data } = await supabase.from('packages').select('*')
    .eq('status', 'active')
    .lte('expires_at', now);
  return (data || []) as Package[];
}

export async function markPackageExpired(id: string) {
  const { data } = await supabase.from('packages').update({ status: 'expired' }).eq('id', id).select().single();
  return data;
}

function formatMoney(value?: number | string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(numeric);
}
