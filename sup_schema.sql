-- Travel Dashboard Database Schema

-- Packages table
CREATE TABLE IF NOT EXISTS packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  origin TEXT,
  start_date DATE,
  end_date DATE,
  total_price DECIMAL(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'refresh_requested')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  user_created BOOLEAN DEFAULT false -- true if Boss manually started it
);

-- Individual deals within a package
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('flight', 'hotel', 'car', 'activity')),
  provider TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  order_url TEXT,
  booking_details JSONB DEFAULT '{}'::jsonb,
  rating DECIMAL(2,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extras (snorkels, beach gear, etc.)
CREATE TABLE IF NOT EXISTS extras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'beach', 'safety', 'transport', 'misc'
  name TEXT NOT NULL,
  description TEXT,
  estimated_price DECIMAL(10,2),
  suggested_url TEXT,
  purchased BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manual uploads (screenshots, URLs, notes from Boss)
CREATE TABLE IF NOT EXISTS manual_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('screenshot', 'url', 'note')),
  content TEXT NOT NULL, -- URL to image, or text for notes/URLs
  caption TEXT,
  parsed BOOLEAN DEFAULT false,
  added_to_package BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intake form submissions (Boss finds deals independently)
CREATE TABLE IF NOT EXISTS intake_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destination TEXT NOT NULL,
  origin TEXT,
  start_date DATE,
  end_date DATE,
  flight_info TEXT,
  hotel_info TEXT,
  budget_max DECIMAL(10,2),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_expires ON packages(expires_at);
CREATE INDEX IF NOT EXISTS idx_deals_package ON deals(package_id);
CREATE INDEX IF NOT EXISTS idx_deals_type ON deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_intake_status ON intake_submissions(status);
