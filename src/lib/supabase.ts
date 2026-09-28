import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve Supabase URL & Anon Key from localStorage first, then fallback to import.meta.env
export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  let url = '';
  let anonKey = '';

  try {
    const savedUrl = localStorage.getItem('sdpo_supabase_url');
    const savedKey = localStorage.getItem('sdpo_supabase_anon_key');
    if (savedUrl && savedUrl.trim()) url = savedUrl.trim();
    if (savedKey && savedKey.trim()) anonKey = savedKey.trim();
  } catch {
    // localStorage not accessible
  }

  if (!url || !anonKey) {
    const metaEnv = (import.meta as unknown as { env: Record<string, string> }).env || {};
    if (!url) url = (metaEnv.VITE_SUPABASE_URL || '').trim();
    if (!anonKey) anonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();
  }

  const isConfigured =
    Boolean(url) &&
    Boolean(anonKey) &&
    url.startsWith('https://') &&
    url !== 'https://your-project-ref.supabase.co' &&
    anonKey !== 'your-anon-public-key' &&
    anonKey.length > 20;

  return { url, anonKey, isConfigured };
}

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseCredentials().isConfigured;
};

// Singleton Supabase Client Cache
let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) {
    cachedClient = null;
    return null;
  }

  if (cachedClient && lastUsedUrl === url && lastUsedKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Proxy export for backward compatibility so `supabase.from(...)` always uses the active client
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    if (!client) {
      // Return a safe dummy handler if client is not configured
      if (prop === 'from') {
        return () => ({
          select: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
          upsert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
          insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
          delete: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
          update: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        });
      }
      return undefined;
    }
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

export function saveSupabaseConfig(url: string, anonKey: string): { success: boolean; error?: string } {
  try {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl.startsWith('https://')) {
      return { success: false, error: 'Supabase URL must start with https:// (e.g. https://yourproject.supabase.co)' };
    }
    if (cleanKey.length < 20) {
      return { success: false, error: 'Invalid Anon API Key. Please provide a valid Supabase public anon key.' };
    }

    localStorage.setItem('sdpo_supabase_url', cleanUrl);
    localStorage.setItem('sdpo_supabase_anon_key', cleanKey);
    cachedClient = null; // force reload client
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save configuration' };
  }
}

export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem('sdpo_supabase_url');
    localStorage.removeItem('sdpo_supabase_anon_key');
    cachedClient = null;
  } catch (e) {
    console.error(e);
  }
}

// SQL Schema for the user to run in Supabase SQL Editor
export const SUPABASE_SQL_SETUP_SCRIPT = `-- ====================================================================
-- BIHAR POLICE PORTAL - SUPABASE POSTGRESQL DATABASE SCHEMA
-- Execute this complete script in your Supabase Project -> SQL Editor
-- ====================================================================

-- 1. USER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  permission_level TEXT DEFAULT 'EDITOR',
  officer_name TEXT NOT NULL,
  rank TEXT NOT NULL,
  police_station TEXT NOT NULL,
  subdivision TEXT DEFAULT 'Tarapur',
  district TEXT DEFAULT 'Munger',
  contact_number TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. POLICE DISTRICTS TABLE
CREATE TABLE IF NOT EXISTS public.police_districts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT DEFAULT 'Bihar',
  hq_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. POLICE SUBDIVISIONS TABLE
CREATE TABLE IF NOT EXISTS public.police_subdivisions (
  id TEXT PRIMARY KEY,
  district_id TEXT REFERENCES public.police_districts(id) ON DELETE CASCADE,
  district_name TEXT NOT NULL,
  name TEXT NOT NULL,
  headquarters TEXT,
  sdpo_officer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. POLICE STATIONS TABLE
CREATE TABLE IF NOT EXISTS public.police_stations (
  id TEXT PRIMARY KEY,
  subdivision_id TEXT REFERENCES public.police_subdivisions(id) ON DELETE CASCADE,
  subdivision_name TEXT NOT NULL,
  district_id TEXT REFERENCES public.police_districts(id) ON DELETE CASCADE,
  district_name TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  sho_name TEXT,
  contact_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FIR CASES TABLE (Comprehensive GIS & Statutory Review Parameters)
CREATE TABLE IF NOT EXISTS public.fir_cases (
  id TEXT PRIMARY KEY,
  fir_number TEXT NOT NULL,
  district TEXT DEFAULT 'Munger',
  subdivision TEXT DEFAULT 'Tarapur',
  ps TEXT NOT NULL,
  fir_date TEXT NOT NULL,
  sections TEXT NOT NULL,
  crime_head TEXT,
  crime_heads JSONB DEFAULT '[]'::jsonb,
  punishment_term TEXT,
  complainant_name TEXT NOT NULL,
  complainant_phone TEXT,
  place_of_occurrence TEXT NOT NULL,
  po_address TEXT,
  gr_number TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  io_name TEXT NOT NULL,
  designation TEXT DEFAULT 'PENDING_DESIGNATION',
  designation_date TEXT,
  deadline_days INTEGER DEFAULT 60,
  status TEXT DEFAULT 'Under Investigation',
  disposed_date TEXT,
  disposal_type TEXT,
  disposal_remarks TEXT,
  chargesheet_number TEXT,
  chargesheet_date TEXT,
  chargesheet_uploaded_cctns BOOLEAN DEFAULT false,
  chargesheet_cctns_date TEXT,
  case_diary_uploaded_cctns BOOLEAN DEFAULT false,
  last_case_diary_no TEXT,
  last_case_diary_date TEXT,
  po_visit_date TEXT,
  supervision_date TEXT,
  pr_dates JSONB DEFAULT '[]'::jsonb,
  final_pr_date TEXT,
  case_review_dates JSONB DEFAULT '[]'::jsonb,
  sdpo_supervision_note TEXT,
  ci_supervision_note TEXT,
  ps_progress_remarks TEXT,
  accused_list JSONB DEFAULT '[]'::jsonb,
  accused_count INTEGER DEFAULT 0,
  pending_for_arrest BOOLEAN DEFAULT false,
  pending_arrest_count INTEGER DEFAULT 0,
  pending_arrest_names TEXT,
  any_person_arrested BOOLEAN DEFAULT false,
  arrested_count INTEGER DEFAULT 0,
  arrested_names TEXT,
  any_person_served_notice BOOLEAN DEFAULT false,
  notice_served_count INTEGER DEFAULT 0,
  notice_served_names TEXT,
  any_person_on_bail_or_surrendered BOOLEAN DEFAULT false,
  bail_surrendered_count INTEGER DEFAULT 0,
  bail_surrendered_names TEXT,
  other_pending_reasons TEXT,
  is_injury_present BOOLEAN DEFAULT false,
  injury_report_received TEXT DEFAULT 'NA',
  pm_report_received TEXT DEFAULT 'NA',
  viscera_preserved TEXT DEFAULT 'NA',
  fsl_visited_po TEXT DEFAULT 'NA',
  fsl_item_preserved_name TEXT,
  fsl_item_sent_or_permission_taken TEXT DEFAULT 'NA',
  fsl_report_received TEXT DEFAULT 'NA',
  is_arms_case BOOLEAN DEFAULT false,
  arms_sent_for_verification TEXT DEFAULT 'NA',
  arms_report_received TEXT DEFAULT 'NA',
  is_liquor_case BOOLEAN DEFAULT false,
  liquor_sent_to_lab TEXT DEFAULT 'NA',
  liquor_lab_report_received TEXT DEFAULT 'NA',
  confiscation_of_liquor TEXT DEFAULT 'NA',
  liquor_vehicle_seized BOOLEAN DEFAULT false,
  vehicle_verified_rto TEXT DEFAULT 'NA',
  vehicle_rajsat_status TEXT DEFAULT 'NA',
  is_ndps_case BOOLEAN DEFAULT false,
  ndps_sample_sent_to_lab TEXT DEFAULT 'NA',
  ndps_lab_report_received TEXT DEFAULT 'NA',
  ndps_exhibit_sent_to_safe_house TEXT DEFAULT 'NA',
  is_victim_recovery_case BOOLEAN DEFAULT false,
  victim_count INTEGER DEFAULT 0,
  victim_age_type TEXT DEFAULT 'minor',
  victim_recovered BOOLEAN DEFAULT false,
  victim_recovery_date TEXT,
  victim_recovery_details TEXT,
  po_preserved TEXT DEFAULT 'NA',
  po_videography_done TEXT DEFAULT 'NA',
  total_cd_uploaded INTEGER DEFAULT 0,
  total_sid_created INTEGER DEFAULT 0,
  sid_linked_with_fir TEXT DEFAULT 'NA',
  target_disposal_date TEXT,
  target_remarks TEXT,
  last_case_review_date TEXT,
  no_of_reviews INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

-- 6. INVESTIGATING OFFICERS TABLE
CREATE TABLE IF NOT EXISTS public.investigating_officers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank TEXT NOT NULL,
  district TEXT DEFAULT 'Munger',
  subdivision TEXT DEFAULT 'Tarapur',
  ps TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'ACTIVE',
  transferred_to TEXT,
  transfer_date TEXT,
  leave_quotas JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. LEAVE LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.leave_ledger (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  district TEXT DEFAULT 'Munger',
  subdivision TEXT DEFAULT 'Tarapur',
  ps TEXT NOT NULL,
  officer_name TEXT NOT NULL,
  rank TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  days_on_leave INTEGER DEFAULT 1,
  arrival_date TEXT NOT NULL,
  actual_arrival_date TEXT,
  status TEXT DEFAULT 'ON_LEAVE',
  leave_type TEXT DEFAULT 'CL',
  remarks TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DAILY CRIME REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.daily_crime_reports (
  id TEXT PRIMARY KEY,
  district TEXT DEFAULT 'Munger',
  subdivision TEXT DEFAULT 'Tarapur',
  ps TEXT NOT NULL,
  date TEXT NOT NULL,
  firs_registered_count INTEGER DEFAULT 0,
  registered_firs JSONB DEFAULT '[]'::jsonb,
  od_details JSONB DEFAULT '{}'::jsonb,
  gasti_details JSONB DEFAULT '{}'::jsonb,
  arrests_count INTEGER DEFAULT 0,
  arrest_details JSONB DEFAULT '{}'::jsonb,
  "arrestDetails" JSONB DEFAULT '{}'::jsonb,
  rank_strengths JSONB DEFAULT '[]'::jsonb,
  leave_ledger_entries JSONB DEFAULT '[]'::jsonb,
  seizures_summary TEXT,
  major_incidents_notes TEXT,
  submitted_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. LAND DISPUTES TABLE
CREATE TABLE IF NOT EXISTS public.land_disputes (
  id TEXT PRIMARY KEY,
  district TEXT DEFAULT 'Munger',
  subdivision TEXT DEFAULT 'Tarapur',
  ps TEXT NOT NULL,
  date TEXT NOT NULL,
  victim_name TEXT NOT NULL,
  victim_address TEXT NOT NULL,
  opposite_party_name TEXT,
  plot_details TEXT NOT NULL,
  dispute_nature TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  disposal_date TEXT,
  disposal_remarks TEXT,
  janata_darbar_action TEXT,
  remarks TEXT,
  created_at TEXT
);

-- 10. UNNATURAL DEATH (UD) CASES TABLE
CREATE TABLE IF NOT EXISTS public.ud_cases (
  id TEXT PRIMARY KEY,
  district TEXT DEFAULT 'Munger',
  subdivision TEXT DEFAULT 'Tarapur',
  ud_case_no TEXT NOT NULL,
  ps TEXT NOT NULL,
  date TEXT NOT NULL,
  deceased_name TEXT NOT NULL,
  deceased_age_gender TEXT,
  place_of_occurrence TEXT NOT NULL,
  cause_of_death TEXT NOT NULL,
  post_mortem_report_status TEXT DEFAULT 'Pending',
  visceral_report_status TEXT DEFAULT 'Not Required',
  status TEXT DEFAULT 'Under Investigation',
  ci_supervision_remarks TEXT,
  sdpo_remarks TEXT
);

-- 11. USER MESSAGES & DIRECTIVES TABLE
CREATE TABLE IF NOT EXISTS public.user_messages (
  id TEXT PRIMARY KEY,
  sender_user_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message_text TEXT NOT NULL,
  priority TEXT DEFAULT 'Routine',
  read_by JSONB DEFAULT '[]'::jsonb,
  recipient_user_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. MONTHLY ARREST ADJUSTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.monthly_arrest_adjustments (
  month_key TEXT NOT NULL,
  ps TEXT NOT NULL DEFAULT 'ALL',
  adjusted_figure INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (month_key, ps)
);

-- 13. INDEXES FOR LIGHTNING FAST SEARCH & FILTERING
CREATE INDEX IF NOT EXISTS idx_fir_cases_ps ON public.fir_cases (ps);
CREATE INDEX IF NOT EXISTS idx_fir_cases_district ON public.fir_cases (district);
CREATE INDEX IF NOT EXISTS idx_fir_cases_subdivision ON public.fir_cases (subdivision);
CREATE INDEX IF NOT EXISTS idx_fir_cases_fir_number ON public.fir_cases (fir_number);
CREATE INDEX IF NOT EXISTS idx_fir_cases_status ON public.fir_cases (status);
CREATE INDEX IF NOT EXISTS idx_fir_cases_fir_date ON public.fir_cases (fir_date);
CREATE INDEX IF NOT EXISTS idx_daily_crime_reports_ps_date ON public.daily_crime_reports (ps, date);
CREATE INDEX IF NOT EXISTS idx_ios_ps ON public.investigating_officers (ps);

-- 14. IDEMPOTENT COLUMN MIGRATION CHECKS (Safe to execute on existing DB)
DO $$
BEGIN
  -- GIS Coordinates & PO fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='latitude') THEN
    ALTER TABLE public.fir_cases ADD COLUMN latitude DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='longitude') THEN
    ALTER TABLE public.fir_cases ADD COLUMN longitude DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='gr_number') THEN
    ALTER TABLE public.fir_cases ADD COLUMN gr_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='po_address') THEN
    ALTER TABLE public.fir_cases ADD COLUMN po_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='crime_heads') THEN
    ALTER TABLE public.fir_cases ADD COLUMN crime_heads JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='disposal_type') THEN
    ALTER TABLE public.fir_cases ADD COLUMN disposal_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='disposal_remarks') THEN
    ALTER TABLE public.fir_cases ADD COLUMN disposal_remarks TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='disposed_date') THEN
    ALTER TABLE public.fir_cases ADD COLUMN disposed_date TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='is_victim_recovery_case') THEN
    ALTER TABLE public.fir_cases ADD COLUMN is_victim_recovery_case BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='victim_count') THEN
    ALTER TABLE public.fir_cases ADD COLUMN victim_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='victim_recovered') THEN
    ALTER TABLE public.fir_cases ADD COLUMN victim_recovered BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='victim_recovery_date') THEN
    ALTER TABLE public.fir_cases ADD COLUMN victim_recovery_date TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='victim_recovery_details') THEN
    ALTER TABLE public.fir_cases ADD COLUMN victim_recovery_details TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='total_cd_uploaded') THEN
    ALTER TABLE public.fir_cases ADD COLUMN total_cd_uploaded INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='target_disposal_date') THEN
    ALTER TABLE public.fir_cases ADD COLUMN target_disposal_date TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='target_remarks') THEN
    ALTER TABLE public.fir_cases ADD COLUMN target_remarks TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='last_case_review_date') THEN
    ALTER TABLE public.fir_cases ADD COLUMN last_case_review_date TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='no_of_reviews') THEN
    ALTER TABLE public.fir_cases ADD COLUMN no_of_reviews INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fir_cases' AND column_name='other_pending_reasons') THEN
    ALTER TABLE public.fir_cases ADD COLUMN other_pending_reasons TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_crime_reports' AND column_name='arrest_details') THEN
    ALTER TABLE public.daily_crime_reports ADD COLUMN arrest_details JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_crime_reports' AND column_name='arrestDetails') THEN
    ALTER TABLE public.daily_crime_reports ADD COLUMN "arrestDetails" JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 11. OFFICIAL LETTERS & CORRESPONDENCE REGISTER
CREATE TABLE IF NOT EXISTS public.official_letters (
  id TEXT PRIMARY KEY,
  source TEXT,
  letter_type TEXT,
  memo_no TEXT,
  received_date TEXT,
  reply_deadline TEXT,
  complainant_name TEXT,
  forwarded_to TEXT[] DEFAULT '{}'::text[],
  is_forwarded TEXT DEFAULT 'PENDING',
  forwarded_memo_no TEXT,
  forwarded_date TEXT,
  reply_by_assigned TEXT DEFAULT 'PENDING',
  assigned_replies TEXT, -- JSON string or TEXT
  reply_received TEXT DEFAULT 'PENDING',
  reply_received_date TEXT,
  reply_sent_to_source TEXT DEFAULT 'PENDING',
  source_reply_memo_no TEXT,
  source_reply_date TEXT,
  source_reminders TEXT, -- JSON string or TEXT
  forwarded_reminders TEXT, -- JSON string or TEXT
  created_by_unit TEXT,
  created_by_role TEXT,
  created_by_user TEXT,
  district TEXT,
  subdivision TEXT,
  police_station TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. DISABLE ROW LEVEL SECURITY (RLS) FOR DIRECT APP SYNCHRONIZATION
ALTER TABLE public.user_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_districts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_subdivisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_stations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fir_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigating_officers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_crime_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_disputes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ud_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_arrest_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_letters DISABLE ROW LEVEL SECURITY;

-- 16. INSERT DEFAULT POLICE OFFICER ACCOUNTS IF EMPTY
INSERT INTO public.user_accounts (id, user_id, password, role, permission_level, officer_name, rank, police_station, is_active)
VALUES
  ('user-sdpo', 'sdpo.tarapur', 'sdpo@1234', 'SDPO', 'ADMIN', 'Subdivisional Police Officer', 'SDPO Tarapur', 'Subdivision HQ', true),
  ('user-ci', 'ci.tarapur', 'ci@1234', 'CI', 'EDITOR', 'Circle Inspector', 'Circle Inspector (CI)', 'Subdivision HQ', true),
  ('user-tarapur', 'sho.tarapur', 'ps@tarapur', 'PS_TARAPUR', 'EDITOR', 'SHO Tarapur', 'Station House Officer (SHO)', 'Tarapur', true),
  ('user-asarganj', 'sho.asarganj', 'ps@asarganj', 'PS_ASARGANJ', 'EDITOR', 'SHO Asarganj', 'Station House Officer (SHO)', 'Asarganj', true),
  ('user-sangrampur', 'sho.sangrampur', 'ps@sangrampur', 'PS_SANGRAMPUR', 'EDITOR', 'SHO Sangrampur', 'Station House Officer (SHO)', 'Sangrampur', true),
  ('user-harpur', 'sho.harpur', 'ps@harpur', 'PS_HARPUR', 'EDITOR', 'SHO Harpur', 'Station House Officer (SHO)', 'Harpur', true),
  ('user-op-tarapur', 'operator.tarapur', 'op@tarapur', 'PS_TARAPUR', 'OPERATOR', 'Operator Tarapur PS', 'Computer Operator / Munshi', 'Tarapur', true),
  ('user-op-asarganj', 'operator.asarganj', 'op@asarganj', 'PS_ASARGANJ', 'OPERATOR', 'Operator Asarganj PS', 'Computer Operator / Munshi', 'Asarganj', true)
ON CONFLICT (id) DO NOTHING;
`;
