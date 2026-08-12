import { createClient } from '@supabase/supabase-js';

const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function cleanEnv(value?: string) {
  return (value || "").trim().replace(/^\uFEFF/, "").replace(/^['"]|['"]$/g, "");
}

// Types
export interface Package {
  id: string;
  title: string;
  destination: string;
  origin?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_price?: number | null;
  status: 'active' | 'expired' | 'refresh_requested';
  created_at: string;
  expires_at: string;
  notes?: string | null;
  user_created: boolean;
}

export interface Deal {
  id: string;
  package_id: string;
  deal_type: 'flight' | 'hotel' | 'car' | 'activity';
  provider: string;
  title: string;
  description?: string | null;
  price: number;
  original_price?: number | null;
  order_url?: string | null;
  booking_details?: Record<string, unknown>;
  rating?: number | null;
  created_at: string;
}

export interface Extra {
  id: string;
  package_id: string;
  category: 'beach' | 'safety' | 'transport' | 'misc';
  name: string;
  description?: string | null;
  estimated_price?: number | null;
  suggested_url?: string | null;
  purchased: boolean;
  created_at: string;
}

export interface ManualUpload {
  id: string;
  package_id?: string | null;
  upload_type: 'screenshot' | 'url' | 'note';
  content: string;
  caption?: string | null;
  parsed: boolean;
  added_to_package: boolean;
  created_at: string;
}

export interface IntakeSubmission {
  id: string;
  destination: string;
  origin?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  flight_info?: string | null;
  hotel_info?: string | null;
  budget_max?: number | null;
  notes?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'archived';
  created_at: string;
}
