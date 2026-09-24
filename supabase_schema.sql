-- ========================================================================
-- POLICE CRIME & INVESTIGATION COMMAND PORTAL - SUPABASE DATABASE SCHEMA
-- Compatible with PostgreSQL 14+ / Supabase
-- ========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SHO',
    permission_level TEXT NOT NULL DEFAULT 'ADMIN', -- ADMIN, EDITOR, VIEWER, OPERATOR
    officer_name TEXT NOT NULL,
    rank TEXT NOT NULL,
    district TEXT DEFAULT 'Munger',
    subdivision TEXT DEFAULT 'Tarapur',
    police_station TEXT NOT NULL DEFAULT 'Subdivision HQ',
    contact_number TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- 5. INVESTIGATING OFFICERS (IOs) TABLE
CREATE TABLE IF NOT EXISTS public.investigating_officers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    rank TEXT NOT NULL, -- 'SDPO', 'Circle Inspector', 'Inspector', 'Sub-Inspector (SI)', 'Asst. Sub-Inspector (ASI)', 'PTC'
    district TEXT DEFAULT 'Munger',
    subdivision TEXT DEFAULT 'Tarapur',
    ps TEXT NOT NULL,
    phone TEXT,
    active_cases_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE' | 'TRANSFERRED'
    transferred_to TEXT,
    transfer_date DATE,
    leave_quotas JSONB DEFAULT '{"2026": {"cl": 16, "cpl": 20, "others": 30}}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FIR CASES TABLE (Comprehensive Case Register & Review Matrix)
CREATE TABLE IF NOT EXISTS public.fir_cases (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    fir_number TEXT NOT NULL, -- e.g. "124/2026"
    district TEXT DEFAULT 'Munger',
    subdivision TEXT DEFAULT 'Tarapur',
    ps TEXT NOT NULL, -- e.g. "Tarapur", "Asarganj", "Sangrampur", "Harpur"
    fir_date DATE NOT NULL,
    sections TEXT NOT NULL,
    crime_head TEXT,
    crime_heads JSONB DEFAULT '[]'::JSONB,
    punishment_term TEXT, -- '7_years_or_more' | 'less_than_7_years'
    complainant_name TEXT NOT NULL,
    complainant_phone TEXT,
    place_of_occurrence TEXT NOT NULL,
    io_name TEXT NOT NULL,
    designation TEXT NOT NULL DEFAULT 'PENDING_DESIGNATION', -- 'SR' | 'NON_SR' | 'PENDING_DESIGNATION'
    designation_date DATE,
    deadline_days INTEGER NOT NULL DEFAULT 60, -- 60 or 90 days
    
    -- Status & Final Form
    status TEXT NOT NULL DEFAULT 'Under Investigation',
    chargesheet_number TEXT,
    chargesheet_date DATE,
    disposed_date DATE,
    disposal_type TEXT,
    disposal_remarks TEXT,
    
    -- CCTNS Sync Tracking
    chargesheet_uploaded_cctns BOOLEAN DEFAULT FALSE,
    chargesheet_cctns_date DATE,
    case_diary_uploaded_cctns BOOLEAN DEFAULT FALSE,
    last_case_diary_no TEXT,
    last_case_diary_date DATE,
    
    -- Supervision & Notes
    po_visit_date DATE,
    supervision_date DATE,
    pr_dates JSONB DEFAULT '[]'::JSONB,
    final_pr_date DATE,
    case_review_dates JSONB DEFAULT '[]'::JSONB,
    sdpo_supervision_note TEXT,
    ci_supervision_note TEXT,
    ps_progress_remarks TEXT,
    
    -- Medical, Forensics & FSL
    is_injury_present BOOLEAN DEFAULT FALSE,
    injury_report_received TEXT DEFAULT 'NA', -- 'YES' | 'PENDING' | 'NA'
    pm_report_received TEXT DEFAULT 'NA',
    viscera_preserved TEXT DEFAULT 'NA',
    fsl_visited_po TEXT DEFAULT 'NA',
    fsl_item_preserved_name TEXT,
    fsl_item_sent_or_permission_taken TEXT DEFAULT 'NA',
    fsl_report_received TEXT DEFAULT 'NA',
    
    -- Accused Tracking, 41A Notice & Bail
    pending_for_arrest BOOLEAN DEFAULT FALSE,
    pending_arrest_count INTEGER DEFAULT 0,
    pending_arrest_names TEXT,
    any_person_arrested BOOLEAN DEFAULT FALSE,
    arrested_count INTEGER DEFAULT 0,
    arrested_names TEXT,
    any_person_served_notice BOOLEAN DEFAULT FALSE,
    notice_served_count INTEGER DEFAULT 0,
    notice_served_names TEXT,
    any_person_on_bail_or_surrendered BOOLEAN DEFAULT FALSE,
    bail_surrendered_count INTEGER DEFAULT 0,
    bail_surrendered_names TEXT,
    other_pending_reasons TEXT,
    
    -- Victim Recovery (Kidnapping / POCSO)
    is_victim_recovery_case BOOLEAN DEFAULT FALSE,
    victim_count INTEGER DEFAULT 0,
    victim_age_type TEXT, -- 'minor' | 'major'
    victim_recovered BOOLEAN DEFAULT FALSE,
    victim_recovery_date DATE,
    victim_recovery_details TEXT,
    
    -- Special Acts: Arms, Liquor, NDPS
    is_arms_case BOOLEAN DEFAULT FALSE,
    arms_sent_for_verification TEXT DEFAULT 'NA',
    arms_report_received TEXT DEFAULT 'NA',
    
    is_liquor_case BOOLEAN DEFAULT FALSE,
    liquor_sent_to_lab TEXT DEFAULT 'NA',
    liquor_lab_report_received TEXT DEFAULT 'NA',
    confiscation_of_liquor TEXT DEFAULT 'NA',
    liquor_vehicle_seized BOOLEAN DEFAULT FALSE,
    vehicle_verified_rto TEXT DEFAULT 'NA',
    vehicle_rajsat_status TEXT DEFAULT 'NA',
    
    is_ndps_case BOOLEAN DEFAULT FALSE,
    ndps_sample_sent_to_lab TEXT DEFAULT 'NA',
    ndps_lab_report_received TEXT DEFAULT 'NA',
    ndps_exhibit_sent_to_safe_house TEXT DEFAULT 'NA',
    
    -- Digital & Case Performance
    total_cd_uploaded INTEGER DEFAULT 0,
    po_preserved TEXT DEFAULT 'NA',
    po_videography_done TEXT DEFAULT 'NA',
    total_sid_created INTEGER DEFAULT 0,
    sid_linked_with_fir TEXT DEFAULT 'NA',
    target_disposal_date DATE,
    target_remarks TEXT,
    last_case_review_date DATE,
    no_of_reviews INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. LAND DISPUTES TABLE
CREATE TABLE IF NOT EXISTS public.land_disputes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    district TEXT DEFAULT 'Munger',
    subdivision TEXT DEFAULT 'Tarapur',
    ps TEXT NOT NULL,
    date DATE NOT NULL,
    victim_name TEXT NOT NULL,
    victim_address TEXT NOT NULL,
    opposite_party_name TEXT,
    plot_details TEXT NOT NULL,
    dispute_nature TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending' | 'Disposed'
    disposal_date DATE,
    disposal_remarks TEXT,
    janata_darbar_action TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. UNNATURAL DEATH (UD) CASES TABLE
CREATE TABLE IF NOT EXISTS public.ud_cases (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    ud_case_no TEXT NOT NULL,
    district TEXT DEFAULT 'Munger',
    subdivision TEXT DEFAULT 'Tarapur',
    ps TEXT NOT NULL,
    date DATE NOT NULL,
    deceased_name TEXT NOT NULL,
    deceased_age_gender TEXT,
    place_of_occurrence TEXT NOT NULL,
    cause_of_death TEXT NOT NULL,
    post_mortem_report_status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending' | 'Received'
    visceral_report_status TEXT NOT NULL DEFAULT 'Not Required', -- 'Not Required' | 'Sent for Testing' | 'Report Received'
    status TEXT NOT NULL DEFAULT 'Under Investigation', -- 'Under Investigation' | 'Final Report Submitted' | 'Closed'
    ci_supervision_remarks TEXT,
    sdpo_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. LEAVE LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.leave_ledger (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    report_id TEXT,
    district TEXT DEFAULT 'Munger',
    subdivision TEXT DEFAULT 'Tarapur',
    ps TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    rank TEXT NOT NULL,
    departure_date DATE NOT NULL,
    days_on_leave INTEGER NOT NULL DEFAULT 1,
    arrival_date DATE NOT NULL,
    actual_arrival_date DATE,
    status TEXT NOT NULL DEFAULT 'ON_LEAVE', -- 'ON_LEAVE' | 'ARRIVED' | 'OVERDUE'
    leave_type TEXT DEFAULT 'CL', -- 'CL' | 'CPL' | 'OTHERS'
    remarks TEXT,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. DAILY CRIME REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.daily_crime_reports (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    district TEXT DEFAULT 'Munger',
    subdivision TEXT DEFAULT 'Tarapur',
    ps TEXT NOT NULL,
    date DATE NOT NULL,
    firs_registered_count INTEGER NOT NULL DEFAULT 0,
    registered_firs JSONB DEFAULT '[]'::JSONB,
    od_details JSONB DEFAULT '{}'::JSONB,
    gasti_details JSONB DEFAULT '{}'::JSONB,
    arrests_count INTEGER NOT NULL DEFAULT 0,
    arrest_details JSONB DEFAULT '{}'::JSONB,
    rank_strengths JSONB DEFAULT '[]'::JSONB,
    leave_ledger_entries JSONB DEFAULT '[]'::JSONB,
    seizures_summary TEXT,
    major_incidents_notes TEXT,
    submitted_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. USER MESSAGES & POLICE DIRECTIVES TABLE
CREATE TABLE IF NOT EXISTS public.user_messages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    sender_user_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    recipient_user_id TEXT NOT NULL,
    recipient_user_ids JSONB DEFAULT '[]'::JSONB,
    recipient_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    message_text TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Routine', -- 'Routine' | 'Urgent' | 'Directive'
    read_by JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. MONTHLY ARREST ADJUSTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.monthly_arrest_adjustments (
    month_key TEXT NOT NULL, -- e.g. "2026-03"
    ps TEXT NOT NULL DEFAULT 'ALL',
    adjusted_figure INTEGER NOT NULL,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (month_key, ps)
);

-- ========================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_fir_cases_ps ON public.fir_cases (ps);
CREATE INDEX IF NOT EXISTS idx_fir_cases_status ON public.fir_cases (status);
CREATE INDEX IF NOT EXISTS idx_fir_cases_designation ON public.fir_cases (designation);
CREATE INDEX IF NOT EXISTS idx_fir_cases_fir_date ON public.fir_cases (fir_date DESC);
CREATE INDEX IF NOT EXISTS idx_fir_cases_io ON public.fir_cases (io_name);

CREATE INDEX IF NOT EXISTS idx_land_disputes_ps ON public.land_disputes (ps);
CREATE INDEX IF NOT EXISTS idx_ud_cases_ps ON public.ud_cases (ps);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_crime_reports (date DESC, ps);
CREATE INDEX IF NOT EXISTS idx_user_messages_recipient ON public.user_messages (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_leave_ledger_status ON public.leave_ledger (status);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allows full access via Supabase Public Anon Key
-- ========================================================================
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'user_accounts',
        'police_districts',
        'police_subdivisions',
        'police_stations',
        'investigating_officers',
        'fir_cases',
        'land_disputes',
        'ud_cases',
        'leave_ledger',
        'daily_crime_reports',
        'user_messages',
        'monthly_arrest_adjustments'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public access for all operations on %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Public access for all operations on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END $$;

-- ========================================================================
-- SEED INITIAL POLICE HIERARCHY & DEFAULT LOGIN ACCOUNTS
-- ========================================================================

-- Insert Initial Districts
INSERT INTO public.police_districts (id, name, state, hq_name, description)
VALUES 
    ('dist-munger', 'Munger', 'Bihar', 'Munger District Police HQ', 'District Superintendent of Police Jurisdiction'),
    ('dist-bhagalpur', 'Bhagalpur', 'Bihar', 'Bhagalpur District Police HQ', 'Senior Superintendent of Police Jurisdiction')
ON CONFLICT (id) DO NOTHING;

-- Insert Initial Subdivisions
INSERT INTO public.police_subdivisions (id, district_id, district_name, name, headquarters, sdpo_officer_name)
VALUES 
    ('subdiv-tarapur', 'dist-munger', 'Munger', 'Tarapur', 'Tarapur Subdivision Police HQ', 'Subdivisional Police Officer (SDPO) Tarapur'),
    ('subdiv-mungersadar', 'dist-munger', 'Munger', 'Munger Sadar', 'Munger Sadar Subdivision Police HQ', 'Subdivisional Police Officer (SDPO) Sadar'),
    ('subdiv-kharagpur', 'dist-munger', 'Munger', 'Kharagpur', 'Haveli Kharagpur Subdivision Police HQ', 'Subdivisional Police Officer (SDPO) Kharagpur')
ON CONFLICT (id) DO NOTHING;

-- Insert Initial Police Stations
INSERT INTO public.police_stations (id, subdivision_id, subdivision_name, district_id, district_name, name, code, sho_name, contact_number)
VALUES 
    ('ps-tarapur', 'subdiv-tarapur', 'Tarapur', 'dist-munger', 'Munger', 'Tarapur', 'TPR-01', 'SHO Tarapur PS', '9431800001'),
    ('ps-asarganj', 'subdiv-tarapur', 'Tarapur', 'dist-munger', 'Munger', 'Asarganj', 'ASG-02', 'SHO Asarganj PS', '9431800002'),
    ('ps-sangrampur', 'subdiv-tarapur', 'Tarapur', 'dist-munger', 'Munger', 'Sangrampur', 'SGP-03', 'SHO Sangrampur PS', '9431800003'),
    ('ps-harpur', 'subdiv-tarapur', 'Tarapur', 'dist-munger', 'Munger', 'Harpur', 'HRP-04', 'SHO Harpur PS', '9431800004')
ON CONFLICT (id) DO NOTHING;

-- Insert Initial User Accounts (Passwords in plain text for portal auth verification)
INSERT INTO public.user_accounts (id, user_id, password, role, permission_level, officer_name, rank, district, subdivision, police_station, contact_number, is_active)
VALUES 
    ('acc-admin', 'admin', 'admin123', 'ADMINISTRATOR', 'ADMIN', 'State Police Administrator', 'Director General / Admin', 'Munger', 'Tarapur', 'District HQ', '9431800000', TRUE),
    ('acc-sp', 'sp_munger', 'sp123', 'SP', 'ADMIN', 'Superintendent of Police', 'SP / Senior SP', 'Munger', '', 'District HQ', '9431800010', TRUE),
    ('acc-sdpo', 'sdpo_tarapur', 'sdpo123', 'SDPO', 'ADMIN', 'SDPO Tarapur', 'Sub-Divisional Police Officer (DSP)', 'Munger', 'Tarapur', 'Subdivision HQ', '9431800011', TRUE),
    ('acc-ci', 'ci_tarapur', 'ci123', 'CI', 'EDITOR', 'Circle Inspector Tarapur', 'Circle Inspector', 'Munger', 'Tarapur', 'Subdivision HQ', '9431800012', TRUE),
    ('acc-tarapur', 'sho_tarapur', 'ps123', 'SHO', 'EDITOR', 'SHO Tarapur Police Station', 'Inspector / SI', 'Munger', 'Tarapur', 'Tarapur', '9431800001', TRUE),
    ('acc-asarganj', 'sho_asarganj', 'ps123', 'SHO', 'EDITOR', 'SHO Asarganj Police Station', 'Inspector / SI', 'Munger', 'Tarapur', 'Asarganj', '9431800002', TRUE),
    ('acc-sangrampur', 'sho_sangrampur', 'ps123', 'SHO', 'EDITOR', 'SHO Sangrampur Police Station', 'Inspector / SI', 'Munger', 'Tarapur', 'Sangrampur', '9431800003', TRUE),
    ('acc-harpur', 'sho_harpur', 'ps123', 'SHO', 'EDITOR', 'SHO Harpur Police Station', 'Inspector / SI', 'Munger', 'Tarapur', 'Harpur', '9431800004', TRUE)
ON CONFLICT (user_id) DO NOTHING;
