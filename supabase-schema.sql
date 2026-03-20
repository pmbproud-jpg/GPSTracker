-- =============================================
-- GPSTracker — Schemat bazy danych Supabase
-- =============================================

-- Typy
CREATE TYPE user_role AS ENUM ('super_admin', 'client', 'worker');

-- =============================================
-- Firmy (klienci)
-- =============================================
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  owner_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  max_workers INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Profile użytkowników
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'worker',
  company_id UUID REFERENCES companies(id),
  -- Kod pracownika do logowania (zamiast email/hasło)
  worker_code TEXT UNIQUE,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  -- Ostatnia znana lokalizacja (cache do szybkiego podglądu)
  last_latitude DOUBLE PRECISION,
  last_longitude DOUBLE PRECISION,
  last_location_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Kody zaproszeń (klient generuje kod → pracownik wpisuje)
-- =============================================
CREATE TABLE invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) NOT NULL,
  code TEXT UNIQUE NOT NULL,
  worker_name TEXT,
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Lokalizacje GPS
-- =============================================
CREATE TABLE locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  company_id UUID REFERENCES companies(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksy dla szybkiego query
CREATE INDEX idx_locations_user_time ON locations (user_id, recorded_at DESC);
CREATE INDEX idx_locations_company_time ON locations (company_id, recorded_at DESC);
CREATE INDEX idx_profiles_company ON profiles (company_id);
CREATE INDEX idx_profiles_worker_code ON profiles (worker_code);
CREATE INDEX idx_invite_codes_code ON invite_codes (code);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Super admin widzi wszystko
CREATE POLICY "super_admin_all" ON companies FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "super_admin_all" ON profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "super_admin_all" ON invite_codes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "super_admin_all" ON locations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Klient widzi swoją firmę
CREATE POLICY "client_own_company" ON companies FOR SELECT
  USING (owner_id = auth.uid());
CREATE POLICY "client_update_company" ON companies FOR UPDATE
  USING (owner_id = auth.uid());

-- Klient widzi pracowników swojej firmy
CREATE POLICY "client_company_profiles" ON profiles FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "client_own_profile" ON profiles FOR ALL
  USING (id = auth.uid());

-- Klient zarządza kodami swojej firmy
CREATE POLICY "client_own_codes" ON invite_codes FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- Klient widzi lokalizacje swoich pracowników
CREATE POLICY "client_company_locations" ON locations FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- Pracownik widzi/edytuje swój profil
CREATE POLICY "worker_own_profile" ON profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY "worker_update_profile" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Pracownik dodaje swoje lokalizacje
CREATE POLICY "worker_insert_location" ON locations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- Trigger: nowy user → profil
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
