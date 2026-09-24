import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import {
  UserAccount,
  FIRCase,
  LandDispute,
  UDCase,
  InvestigatingOfficer,
  DailyCrimeReport,
  UserMessage,
  LeaveLedgerEntry,
  PoliceDistrict,
  PoliceSubdivision,
  PoliceStation,
} from '../types';
import { INITIAL_USER_ACCOUNTS } from '../data/mockData';

/**
 * Robust Supabase Service for Tarapur Police Subdivision System.
 * Supports standard PostgreSQL snake_case schema with automatic camelCase fallback
 * and intelligent missing-column pruning to ensure persistent cloud synchronization.
 */

// Helper to convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/gi, (_, letter) => letter.toUpperCase());
}

// Helper to convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Helper to extract missing column name from PostgREST / PostgreSQL error responses
function extractMissingColumn(error: any): string | null {
  if (!error) return null;
  const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
  // PostgREST: "Could not find the 'xyz' column of 'table' in the schema cache"
  const m1 = msg.match(/Could not find the ['"]([^'"]+)['"] column/i);
  if (m1 && m1[1]) return m1[1];
  // PostgreSQL: 'column "xyz" of relation ... does not exist'
  const m2 = msg.match(/column ['"]([^'"]+)['"] .* does not exist/i);
  if (m2 && m2[1]) return m2[1];
  // PostgreSQL: 'column xyz does not exist'
  const m3 = msg.match(/column ([a-zA-Z0-9_]+) does not exist/i);
  if (m3 && m3[1]) return m3[1];
  return null;
}

// Safely attempts an upsert, dynamically pruning unrecognised or unmigrated columns on the fly
async function attemptUpsertWithColumnPruning(
  client: any,
  tableName: string,
  initialPayload: Record<string, any>,
  conflictKey: string
): Promise<{ success: boolean; error?: any }> {
  const currentPayload = { ...initialPayload };
  const maxRetries = 30;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { error } = await client
      .from(tableName)
      .upsert([currentPayload], { onConflict: conflictKey });

    if (!error) {
      return { success: true };
    }

    const missingCol = extractMissingColumn(error);
    if (missingCol) {
      const candidates = [
        missingCol,
        missingCol.toLowerCase(),
        toCamelCase(missingCol),
        toSnakeCase(missingCol),
      ];

      let pruned = false;
      for (const [key] of Object.entries(currentPayload)) {
        if (
          candidates.some(
            (c) => c.toLowerCase() === key.toLowerCase() || c === key
          )
        ) {
          delete currentPayload[key];
          pruned = true;
        }
      }

      if (pruned) {
        continue;
      }
    }

    // If PostgreSQL reports type mismatch (e.g., column is TEXT in database, but JS object/array was sent), serialize objects to JSON strings
    if (
      error.message?.includes('type') ||
      error.message?.includes('invalid input syntax') ||
      error.message?.includes('cannot cast') ||
      error.code === '22P02' ||
      error.code === '42804'
    ) {
      let modified = false;
      const stringifiedPayload: Record<string, any> = { ...currentPayload };
      for (const [key, val] of Object.entries(stringifiedPayload)) {
        if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
          stringifiedPayload[key] = JSON.stringify(val);
          modified = true;
        }
      }
      if (modified) {
        const { error: retryErr } = await client
          .from(tableName)
          .upsert([stringifiedPayload], { onConflict: conflictKey });
        if (!retryErr) {
          return { success: true };
        }
      }
    }

    return { success: false, error };
  }

  return { success: false, error: new Error(`Exceeded retries while pruning columns on '${tableName}'`) };
}

// Helper to execute upsert with graceful fallback for column casing and schema variations
async function resilientUpsert(
  tableName: string,
  snakePayload: Record<string, any>,
  camelPayload: Record<string, any>,
  conflictKey: string = 'id'
): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;

  try {
    // 1. Try standard PostgreSQL snake_case payload with intelligent column pruning
    const snakeResult = await attemptUpsertWithColumnPruning(client, tableName, snakePayload, conflictKey);
    if (snakeResult.success) return true;

    // 2. If snake_case had schema mismatch, retry with camelCase payload and column pruning
    const snakeErr = snakeResult.error;
    if (
      snakeErr?.message?.includes('column') ||
      snakeErr?.code === 'PGRST204' ||
      snakeErr?.code === '42703' ||
      snakeErr?.code === 'PGRST100'
    ) {
      console.warn(`Attempting fallback camelCase upsert on table '${tableName}'...`);
      const camelResult = await attemptUpsertWithColumnPruning(client, tableName, camelPayload, conflictKey);
      if (camelResult.success) return true;

      console.error(
        `Supabase upsert failed on '${tableName}':`,
        camelResult.error?.message || snakeErr.message,
        camelResult.error || snakeErr
      );
      return false;
    }

    console.error(`Supabase upsert error on '${tableName}':`, snakeErr?.message || snakeErr);
    return false;
  } catch (err: any) {
    console.error(`Exception in resilientUpsert on '${tableName}':`, err?.message || err);
    return false;
  }
}

// --- DIAGNOSTICS & TABLE VERIFICATION ---
export async function testAllSupabaseTables(): Promise<{
  connected: boolean;
  message: string;
  tables: Record<string, { status: 'ok' | 'missing' | 'error'; count?: number; error?: string }>;
}> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) {
    return {
      connected: false,
      message: 'Supabase is not configured. Please provide Project URL & Public Anon Key.',
      tables: {},
    };
  }

  const tableNames = [
    'user_accounts',
    'police_districts',
    'police_subdivisions',
    'police_stations',
    'fir_cases',
    'investigating_officers',
    'leave_ledger',
    'daily_crime_reports',
    'land_disputes',
    'ud_cases',
    'user_messages',
    'monthly_arrest_adjustments',
  ];

  const results: Record<string, { status: 'ok' | 'missing' | 'error'; count?: number; error?: string }> = {};
  let anySuccess = false;

  for (const t of tableNames) {
    try {
      const { data, error, count } = await client.from(t).select('*', { count: 'exact', head: true });
      if (!error) {
        results[t] = { status: 'ok', count: count || 0 };
        anySuccess = true;
      } else {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          results[t] = { status: 'missing', error: 'Table does not exist. Run SQL script.' };
        } else {
          results[t] = { status: 'error', error: error.message };
        }
      }
    } catch (e: any) {
      results[t] = { status: 'error', error: e?.message || 'Network exception' };
    }
  }

  return {
    connected: anySuccess,
    message: anySuccess
      ? 'Successfully connected to Supabase database.'
      : 'Could not query Supabase tables. Ensure SQL tables are created in Supabase SQL editor.',
    tables: results,
  };
}

// --- DIRECT CLOUD AUTHENTICATION ---
export async function authenticateOfficerWithSupabase(
  userId: string,
  plainPassword: string
): Promise<{ success: boolean; account?: UserAccount; error?: string }> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) {
    return { success: false, error: 'Supabase not connected' };
  }

  const cleanUser = userId.trim().toLowerCase();
  const cleanPass = plainPassword.trim();

  try {
    // 1. Try matching snake_case user_id
    let { data, error } = await client
      .from('user_accounts')
      .select('*')
      .ilike('user_id', cleanUser)
      .eq('password', cleanPass)
      .limit(1);

    // 2. Fallback to userId if column casing is camelCase
    if ((error || !data || data.length === 0) && (error?.code === '42703' || !data || data.length === 0)) {
      const camelQuery = await client
        .from('user_accounts')
        .select('*')
        .ilike('userId', cleanUser)
        .eq('password', cleanPass)
        .limit(1);
      if (!camelQuery.error && camelQuery.data && camelQuery.data.length > 0) {
        data = camelQuery.data;
        error = null;
      }
    }

    if (error) {
      console.warn('Supabase auth error:', error.message);
      return { success: false, error: error.message };
    }

    if (data && data.length > 0) {
      const d = data[0];
      const account: UserAccount = {
        id: d.id,
        userId: d.user_id || d.userId || cleanUser,
        password: d.password,
        role: d.role,
        permissionLevel: d.permission_level || d.permissionLevel || 'ADMIN',
        officerName: d.officer_name || d.officerName || 'Police Officer',
        rank: d.rank || 'Officer',
        policeStation: d.police_station || d.policeStation || 'Subdivision HQ',
        contactNumber: d.contact_number || d.contactNumber,
        isActive: d.is_active !== undefined ? d.is_active : (d.isActive !== undefined ? d.isActive : true),
        lastLogin: new Date().toISOString(),
      };

      if (!account.isActive) {
        return { success: false, error: 'This officer account has been deactivated by the Admin.' };
      }

      // Update last_login timestamp in Supabase
      saveUserAccountToSupabase(account).catch(() => {});
      return { success: true, account };
    }

    return { success: false, error: 'Account not found in Supabase database with these credentials.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Authentication error' };
  }
}

// --- USER ACCOUNTS ---
export async function fetchUserAccountsFromSupabase(): Promise<UserAccount[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client.from('user_accounts').select('*');
    if (error) {
      console.warn('Error fetching user accounts from Supabase:', error.message);
      return null;
    }

    // If table exists but is empty, seed INITIAL_USER_ACCOUNTS automatically
    if (!data || data.length === 0) {
      console.log('Supabase user_accounts table is empty. Auto-seeding default accounts...');
      for (const acc of INITIAL_USER_ACCOUNTS) {
        await saveUserAccountToSupabase(acc);
      }
      return INITIAL_USER_ACCOUNTS;
    }

    return (data || []).map((d: any) => ({
      id: d.id,
      userId: d.user_id || d.userId || '',
      password: d.password || '',
      role: d.role,
      permissionLevel: d.permission_level || d.permissionLevel || 'ADMIN',
      officerName: d.officer_name || d.officerName || '',
      rank: d.rank || '',
      district: d.district || 'Munger',
      subdivision: d.subdivision || (d.role === 'SP' || d.role === 'DISTRICT_ADMIN' ? '' : 'Tarapur'),
      policeStation: d.police_station || d.policeStation || 'Subdivision HQ',
      contactNumber: d.contact_number || d.contactNumber,
      isActive: d.is_active !== undefined ? d.is_active : (d.isActive !== undefined ? d.isActive : true),
      lastLogin: d.last_login || d.lastLogin,
    })) as UserAccount[];
  } catch (err) {
    console.warn('Supabase exception in fetchUserAccounts:', err);
    return null;
  }
}

export async function saveUserAccountToSupabase(account: UserAccount): Promise<boolean> {
  const snakePayload = {
    id: account.id,
    user_id: account.userId,
    password: account.password,
    role: account.role,
    permission_level: account.permissionLevel,
    officer_name: account.officerName,
    rank: account.rank,
    district: account.district || 'Munger',
    subdivision: account.subdivision || '',
    police_station: account.policeStation,
    contact_number: account.contactNumber || null,
    is_active: account.isActive,
    last_login: account.lastLogin || null,
  };

  const camelPayload = {
    id: account.id,
    userId: account.userId,
    password: account.password,
    role: account.role,
    permissionLevel: account.permissionLevel,
    officerName: account.officerName,
    rank: account.rank,
    district: account.district || 'Munger',
    subdivision: account.subdivision || '',
    policeStation: account.policeStation,
    contactNumber: account.contactNumber || null,
    isActive: account.isActive,
    lastLogin: account.lastLogin || null,
  };

  return resilientUpsert('user_accounts', snakePayload, camelPayload);
}

export async function deleteUserAccountFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('user_accounts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting user account from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deleteUserAccount:', err);
    return false;
  }
}

// --- FIR CASES ---
export async function fetchFIRCasesFromSupabase(): Promise<FIRCase[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client
      .from('fir_cases')
      .select('*');

    if (error) {
      console.warn('Error fetching FIR cases from Supabase:', error.message);
      return null;
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      firNumber: d.fir_number || d.firNumber || '',
      ps: d.ps || 'Tarapur',
      district: d.district || 'Munger',
      subdivision: d.subdivision || 'Tarapur',
      firDate: d.fir_date || d.firDate || '',
      sections: d.sections || '',
      punishmentTerm: d.punishment_term || d.punishmentTerm,
      complainantName: d.complainant_name || d.complainantName || '',
      complainantPhone: d.complainant_phone || d.complainantPhone,
      placeOfOccurrence: d.place_of_occurrence || d.placeOfOccurrence || '',
      ioName: d.io_name || d.ioName || '',
      designation: d.designation || 'PENDING_DESIGNATION',
      designationDate: d.designation_date || d.designationDate,
      deadlineDays: Number(d.deadline_days ?? d.deadlineDays) || 60,
      status: d.status || 'Under Investigation',
      chargesheetNumber: d.chargesheet_number || d.chargesheetNumber,
      chargesheetDate: d.chargesheet_date || d.chargesheetDate,
      chargesheetUploadedCCTNS: Boolean(d.chargesheet_uploaded_cctns ?? d.chargesheetUploadedCCTNS),
      chargesheetCCTNSDate: d.chargesheet_cctns_date || d.chargesheetCCTNSDate,
      caseDiaryUploadedCCTNS: Boolean(d.case_diary_uploaded_cctns ?? d.caseDiaryUploadedCCTNS),
      lastCaseDiaryNo: d.last_case_diary_no || d.lastCaseDiaryNo,
      lastCaseDiaryDate: d.last_case_diary_date || d.lastCaseDiaryDate,
      poVisitDate: d.po_visit_date || d.poVisitDate,
      supervisionDate: d.supervision_date || d.supervisionDate,
      prDates: Array.isArray(d.pr_dates) ? d.pr_dates : (Array.isArray(d.prDates) ? d.prDates : []),
      finalPrDate: d.final_pr_date || d.finalPrDate,
      caseReviewDates: Array.isArray(d.case_review_dates) ? d.case_review_dates : (Array.isArray(d.caseReviewDates) ? d.caseReviewDates : []),
      sdpoSupervisionNote: d.sdpo_supervision_note || d.sdpoSupervisionNote,
      ciSupervisionNote: d.ci_supervision_note || d.ciSupervisionNote,
      psProgressRemarks: d.ps_progress_remarks || d.psProgressRemarks,
      createdAt: d.created_at || d.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: d.updated_at || d.updatedAt || new Date().toISOString().split('T')[0],
    })) as FIRCase[];
  } catch (err) {
    console.warn('Supabase exception in fetchFIRCases:', err);
    return null;
  }
}

export async function saveFIRCaseToSupabase(firCase: FIRCase): Promise<boolean> {
  const snakePayload = {
    id: firCase.id,
    fir_number: firCase.firNumber,
    ps: firCase.ps,
    district: firCase.district || 'Munger',
    subdivision: firCase.subdivision || 'Tarapur',
    fir_date: firCase.firDate,
    sections: firCase.sections,
    punishment_term: firCase.punishmentTerm || null,
    complainant_name: firCase.complainantName,
    complainant_phone: firCase.complainantPhone || null,
    place_of_occurrence: firCase.placeOfOccurrence,
    io_name: firCase.ioName,
    designation: firCase.designation,
    designation_date: firCase.designationDate || null,
    deadline_days: firCase.deadlineDays,
    status: firCase.status,
    chargesheet_number: firCase.chargesheetNumber || null,
    chargesheet_date: firCase.chargesheetDate || null,
    chargesheet_uploaded_cctns: firCase.chargesheetUploadedCCTNS,
    chargesheet_cctns_date: firCase.chargesheetCCTNSDate || null,
    case_diary_uploaded_cctns: firCase.caseDiaryUploadedCCTNS,
    last_case_diary_no: firCase.lastCaseDiaryNo || null,
    last_case_diary_date: firCase.lastCaseDiaryDate || null,
    po_visit_date: firCase.poVisitDate || null,
    supervision_date: firCase.supervisionDate || null,
    pr_dates: firCase.prDates || [],
    final_pr_date: firCase.finalPrDate || null,
    case_review_dates: firCase.caseReviewDates || [],
    sdpo_supervision_note: firCase.sdpoSupervisionNote || null,
    ci_supervision_note: firCase.ciSupervisionNote || null,
    ps_progress_remarks: firCase.psProgressRemarks || null,
    created_at: firCase.createdAt,
    updated_at: firCase.updatedAt || new Date().toISOString().split('T')[0],
  };

  const camelPayload = {
    id: firCase.id,
    firNumber: firCase.firNumber,
    ps: firCase.ps,
    district: firCase.district || 'Munger',
    subdivision: firCase.subdivision || 'Tarapur',
    firDate: firCase.firDate,
    sections: firCase.sections,
    punishmentTerm: firCase.punishmentTerm || null,
    complainantName: firCase.complainantName,
    complainantPhone: firCase.complainantPhone || null,
    placeOfOccurrence: firCase.placeOfOccurrence,
    ioName: firCase.ioName,
    designation: firCase.designation,
    designationDate: firCase.designationDate || null,
    deadlineDays: firCase.deadlineDays,
    status: firCase.status,
    chargesheetNumber: firCase.chargesheetNumber || null,
    chargesheetDate: firCase.chargesheetDate || null,
    chargesheetUploadedCCTNS: firCase.chargesheetUploadedCCTNS,
    chargesheetCCTNSDate: firCase.chargesheetCCTNSDate || null,
    caseDiaryUploadedCCTNS: firCase.caseDiaryUploadedCCTNS,
    lastCaseDiaryNo: firCase.lastCaseDiaryNo || null,
    lastCaseDiaryDate: firCase.lastCaseDiaryDate || null,
    poVisitDate: firCase.poVisitDate || null,
    supervisionDate: firCase.supervisionDate || null,
    prDates: firCase.prDates || [],
    finalPrDate: firCase.finalPrDate || null,
    caseReviewDates: firCase.caseReviewDates || [],
    sdpoSupervisionNote: firCase.sdpoSupervisionNote || null,
    ciSupervisionNote: firCase.ciSupervisionNote || null,
    psProgressRemarks: firCase.psProgressRemarks || null,
    createdAt: firCase.createdAt,
    updatedAt: firCase.updatedAt || new Date().toISOString().split('T')[0],
  };

  return resilientUpsert('fir_cases', snakePayload, camelPayload);
}

export async function deleteFIRCaseFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('fir_cases').delete().eq('id', id);
    if (error) {
      console.error('Error deleting FIR case from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deleteFIRCase:', err);
    return false;
  }
}

// --- LAND DISPUTES ---
export async function fetchLandDisputesFromSupabase(): Promise<LandDispute[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client
      .from('land_disputes')
      .select('*');

    if (error) {
      console.warn('Error fetching land disputes from Supabase:', error.message);
      return null;
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      ps: d.ps || 'Tarapur',
      date: d.date || '',
      victimName: d.victim_name || d.victimName || '',
      victimAddress: d.victim_address || d.victimAddress || '',
      oppositePartyName: d.opposite_party_name || d.oppositePartyName,
      plotDetails: d.plot_details || d.plotDetails || '',
      disputeNature: d.dispute_nature || d.disputeNature || '',
      status: d.status || 'Pending',
      disposalDate: d.disposal_date || d.disposalDate,
      disposalRemarks: d.disposal_remarks || d.disposalRemarks,
      janata_darbar_action: d.janata_darbar_action || d.janataDarbarAction,
      remarks: d.remarks,
      createdAt: d.created_at || d.createdAt || new Date().toISOString().split('T')[0],
    })) as LandDispute[];
  } catch (err) {
    console.warn('Supabase exception in fetchLandDisputes:', err);
    return null;
  }
}

export async function saveLandDisputeToSupabase(dispute: LandDispute): Promise<boolean> {
  const snakePayload = {
    id: dispute.id,
    ps: dispute.ps,
    date: dispute.date,
    victim_name: dispute.victimName,
    victim_address: dispute.victimAddress,
    opposite_party_name: dispute.oppositePartyName || null,
    plot_details: dispute.plotDetails,
    dispute_nature: dispute.disputeNature,
    status: dispute.status,
    disposal_date: dispute.disposalDate || null,
    disposal_remarks: dispute.disposalRemarks || null,
    janata_darbar_action: dispute.janataDarbarAction || null,
    remarks: dispute.remarks || null,
    created_at: dispute.createdAt,
  };

  const camelPayload = {
    id: dispute.id,
    ps: dispute.ps,
    date: dispute.date,
    victimName: dispute.victimName,
    victimAddress: dispute.victimAddress,
    oppositePartyName: dispute.oppositePartyName || null,
    plotDetails: dispute.plotDetails,
    disputeNature: dispute.disputeNature,
    status: dispute.status,
    disposalDate: dispute.disposalDate || null,
    disposalRemarks: dispute.disposalRemarks || null,
    janataDarbarAction: dispute.janataDarbarAction || null,
    remarks: dispute.remarks || null,
    createdAt: dispute.createdAt,
  };

  return resilientUpsert('land_disputes', snakePayload, camelPayload);
}

export async function deleteLandDisputeFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('land_disputes').delete().eq('id', id);
    if (error) {
      console.error('Error deleting land dispute from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deleteLandDispute:', err);
    return false;
  }
}

// --- UD CASES ---
export async function fetchUDCasesFromSupabase(): Promise<UDCase[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client.from('ud_cases').select('*');
    if (error) {
      console.warn('Error fetching UD cases from Supabase:', error.message);
      return null;
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      udCaseNo: d.ud_case_no || d.udCaseNo || '',
      ps: d.ps || 'Tarapur',
      date: d.date || '',
      deceasedName: d.deceased_name || d.deceasedName || '',
      deceasedAgeGender: d.deceased_age_gender || d.deceasedAgeGender,
      placeOfOccurrence: d.place_of_occurrence || d.placeOfOccurrence || '',
      causeOfDeath: d.cause_of_death || d.causeOfDeath || '',
      postMortemReportStatus: d.post_mortem_report_status || d.postMortemReportStatus || 'Pending',
      visceralReportStatus: d.visceral_report_status || d.visceralReportStatus || 'Not Required',
      status: d.status || 'Under Investigation',
      ciSupervisionRemarks: d.ci_supervision_remarks || d.ciSupervisionRemarks,
      sdpoRemarks: d.sdpo_remarks || d.sdpoRemarks,
    })) as UDCase[];
  } catch (err) {
    console.warn('Supabase exception in fetchUDCases:', err);
    return null;
  }
}

export async function saveUDCaseToSupabase(udCase: UDCase): Promise<boolean> {
  const snakePayload = {
    id: udCase.id,
    ud_case_no: udCase.udCaseNo,
    ps: udCase.ps,
    date: udCase.date,
    deceased_name: udCase.deceasedName,
    deceased_age_gender: udCase.deceasedAgeGender || null,
    place_of_occurrence: udCase.placeOfOccurrence,
    cause_of_death: udCase.causeOfDeath,
    post_mortem_report_status: udCase.postMortemReportStatus,
    visceral_report_status: udCase.visceralReportStatus,
    status: udCase.status,
    ci_supervision_remarks: udCase.ciSupervisionRemarks || null,
    sdpo_remarks: udCase.sdpoRemarks || null,
  };

  const camelPayload = {
    id: udCase.id,
    udCaseNo: udCase.udCaseNo,
    ps: udCase.ps,
    date: udCase.date,
    deceasedName: udCase.deceasedName,
    deceasedAgeGender: udCase.deceasedAgeGender || null,
    placeOfOccurrence: udCase.placeOfOccurrence,
    causeOfDeath: udCase.causeOfDeath,
    postMortemReportStatus: udCase.postMortemReportStatus,
    visceralReportStatus: udCase.visceralReportStatus,
    status: udCase.status,
    ciSupervisionRemarks: udCase.ciSupervisionRemarks || null,
    sdpoRemarks: udCase.sdpoRemarks || null,
  };

  return resilientUpsert('ud_cases', snakePayload, camelPayload);
}

export async function deleteUDCaseFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('ud_cases').delete().eq('id', id);
    if (error) {
      console.error('Error deleting UD case from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deleteUDCase:', err);
    return false;
  }
}

// --- INVESTIGATING OFFICERS (IOs) ---
export async function fetchIOsFromSupabase(): Promise<InvestigatingOfficer[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client.from('investigating_officers').select('*');
    if (error) {
      console.warn('Error fetching IOs from Supabase:', error.message);
      return null;
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name || '',
      rank: d.rank || 'Sub-Inspector (SI)',
      ps: d.ps || 'Tarapur',
      phone: d.phone || d.phone_number || undefined,
      activeCasesCount: d.active_cases_count !== undefined ? d.active_cases_count : d.activeCasesCount,
      status: d.status || 'ACTIVE',
      transferredTo: d.transferred_to || d.transferredTo || undefined,
      transferDate: d.transfer_date || d.transferDate || undefined,
      leaveQuotas: typeof d.leave_quotas === 'string'
        ? JSON.parse(d.leave_quotas)
        : (d.leave_quotas || d.leaveQuotas || undefined),
    })) as InvestigatingOfficer[];
  } catch (err) {
    console.warn('Supabase exception in fetchIOs:', err);
    return null;
  }
}

export async function saveIOToSupabase(io: InvestigatingOfficer): Promise<boolean> {
  const isTransferred = io.status === 'TRANSFERRED';
  const snakePayload = {
    id: io.id,
    name: io.name,
    rank: io.rank,
    ps: io.ps,
    phone: io.phone || null,
    status: io.status || 'ACTIVE',
    transferred_to: isTransferred ? (io.transferredTo || 'Other Unit') : null,
    transfer_date: isTransferred ? (io.transferDate || new Date().toISOString().split('T')[0]) : null,
    leave_quotas: io.leaveQuotas ? JSON.stringify(io.leaveQuotas) : null,
  };

  const camelPayload = {
    id: io.id,
    name: io.name,
    rank: io.rank,
    ps: io.ps,
    phone: io.phone || null,
    status: io.status || 'ACTIVE',
    transferredTo: isTransferred ? (io.transferredTo || 'Other Unit') : null,
    transferDate: isTransferred ? (io.transferDate || new Date().toISOString().split('T')[0]) : null,
    leaveQuotas: io.leaveQuotas || null,
  };

  return resilientUpsert('investigating_officers', snakePayload, camelPayload);
}

export async function deleteIOFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('investigating_officers').delete().eq('id', id);
    if (error) {
      console.error('Error deleting IO from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deleteIO:', err);
    return false;
  }
}

// --- LEAVE LEDGER ---
export async function fetchLeaveLedgerFromSupabase(): Promise<LeaveLedgerEntry[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client
      .from('leave_ledger')
      .select('*')
      .order('departure_date', { ascending: false });

    if (error) {
      console.warn('Error fetching leave ledger from Supabase:', error.message);
      return null;
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      reportId: d.report_id || d.reportId,
      ps: d.ps || 'Tarapur',
      officerName: d.officer_name || d.officerName || '',
      rank: d.rank || 'Sub-Inspector (SI)',
      departureDate: d.departure_date || d.departureDate || '',
      daysOnLeave: Number(d.days_on_leave ?? d.daysOnLeave) || 1,
      arrivalDate: d.arrival_date || d.arrivalDate || '',
      actualArrivalDate: d.actual_arrival_date || d.actualArrivalDate,
      status: d.status || 'ON_LEAVE',
      leaveType: d.leave_type || d.leaveType || 'CL',
      remarks: d.remarks || '',
      recordedBy: d.recorded_by || d.recordedBy || '',
      createdAt: d.created_at || d.createdAt || new Date().toISOString(),
    })) as LeaveLedgerEntry[];
  } catch (err) {
    console.warn('Supabase exception in fetchLeaveLedger:', err);
    return null;
  }
}

export async function saveLeaveLedgerEntryToSupabase(entry: LeaveLedgerEntry): Promise<boolean> {
  const snakePayload = {
    id: entry.id,
    report_id: entry.reportId || null,
    ps: entry.ps,
    officer_name: entry.officerName,
    rank: entry.rank,
    departure_date: entry.departureDate,
    days_on_leave: entry.daysOnLeave,
    arrival_date: entry.arrivalDate,
    actual_arrival_date: entry.actualArrivalDate || null,
    status: entry.status,
    leave_type: entry.leaveType || 'CL',
    remarks: entry.remarks || null,
    recorded_by: entry.recordedBy || null,
    created_at: entry.createdAt || new Date().toISOString(),
  };

  const camelPayload = {
    id: entry.id,
    reportId: entry.reportId || null,
    ps: entry.ps,
    officerName: entry.officerName,
    rank: entry.rank,
    departureDate: entry.departureDate,
    daysOnLeave: entry.daysOnLeave,
    arrivalDate: entry.arrivalDate,
    actualArrivalDate: entry.actualArrivalDate || null,
    status: entry.status,
    leaveType: entry.leaveType || 'CL',
    remarks: entry.remarks || null,
    recordedBy: entry.recordedBy || null,
    createdAt: entry.createdAt || new Date().toISOString(),
  };

  return resilientUpsert('leave_ledger', snakePayload, camelPayload);
}

export async function deleteLeaveLedgerEntryFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('leave_ledger').delete().eq('id', id);
    if (error) {
      console.error('Error deleting leave ledger entry from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deleteLeaveLedgerEntry:', err);
    return false;
  }
}

// --- DAILY CRIME REPORTS ---
export async function fetchDailyReportsFromSupabase(): Promise<DailyCrimeReport[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client
      .from('daily_crime_reports')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Error fetching daily reports from Supabase:', error.message);
      return null;
    }

    const safeParse = (val: any, fallback: any = undefined) => {
      if (val === null || val === undefined) return fallback;
      if (typeof val === 'object') return val;
      if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
        try {
          return JSON.parse(val);
        } catch {
          return fallback;
        }
      }
      return fallback;
    };

    return (data || []).map((d: any) => ({
      id: d.id,
      ps: d.ps || 'Tarapur',
      district: d.district || 'Munger',
      subdivision: d.subdivision || 'Tarapur',
      date: d.date || '',
      firsRegisteredCount: Number(d.firs_registered_count ?? d.firsRegisteredCount) || 0,
      registeredFirs: safeParse(d.registered_firs ?? d.registeredFirs, []),
      odDetails: safeParse(d.od_details ?? d.odDetails, undefined),
      gastiDetails: safeParse(d.gasti_details ?? d.gastiDetails, undefined),
      arrestsCount: Number(d.arrests_count ?? d.arrestsCount) || 0,
      arrestDetails: safeParse(d.arrest_details ?? d.arrestDetails, undefined),
      rankStrengths: safeParse(d.rank_strengths ?? d.rankStrengths, []),
      leaveLedgerEntries: safeParse(d.leave_ledger_entries ?? d.leaveLedgerEntries, []),
      seizuresSummary: d.seizures_summary || d.seizuresSummary,
      majorIncidentsNotes: d.major_incidents_notes || d.majorIncidentsNotes,
      submittedBy: d.submitted_by || d.submittedBy || '',
      createdAt: d.created_at || d.createdAt || new Date().toISOString(),
    })) as DailyCrimeReport[];
  } catch (err) {
    console.warn('Supabase exception in fetchDailyReports:', err);
    return null;
  }
}

export async function saveDailyReportToSupabase(report: DailyCrimeReport): Promise<boolean> {
  const snakePayload = {
    id: report.id,
    ps: report.ps,
    district: report.district || 'Munger',
    subdivision: report.subdivision || 'Tarapur',
    date: report.date,
    firs_registered_count: report.firsRegisteredCount,
    registered_firs: report.registeredFirs || [],
    od_details: report.odDetails || null,
    gasti_details: report.gastiDetails || null,
    arrests_count: report.arrestsCount,
    arrest_details: report.arrestDetails || null,
    rank_strengths: report.rankStrengths || [],
    leave_ledger_entries: report.leaveLedgerEntries || [],
    seizures_summary: report.seizuresSummary || null,
    major_incidents_notes: report.majorIncidentsNotes || null,
    submitted_by: report.submittedBy,
    created_at: report.createdAt || new Date().toISOString(),
  };

  const camelPayload = {
    id: report.id,
    ps: report.ps,
    district: report.district || 'Munger',
    subdivision: report.subdivision || 'Tarapur',
    date: report.date,
    firsRegisteredCount: report.firsRegisteredCount,
    registeredFirs: report.registeredFirs || [],
    odDetails: report.odDetails || null,
    gastiDetails: report.gastiDetails || null,
    arrestsCount: report.arrestsCount,
    arrestDetails: report.arrestDetails || null,
    rankStrengths: report.rankStrengths || [],
    leaveLedgerEntries: report.leaveLedgerEntries || [],
    seizuresSummary: report.seizuresSummary || null,
    majorIncidentsNotes: report.majorIncidentsNotes || null,
    submittedBy: report.submittedBy,
    createdAt: report.createdAt || new Date().toISOString(),
  };

  return resilientUpsert('daily_crime_reports', snakePayload, camelPayload);
}

export async function deleteDailyReportFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('daily_crime_reports').delete().eq('id', id);
    if (error) {
      console.error('Error deleting daily report from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deleteDailyReport:', err);
    return false;
  }
}

// --- USER MESSAGES & POLICE DIRECTIVES ---
export async function fetchUserMessagesFromSupabase(): Promise<UserMessage[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client
      .from('user_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching user messages from Supabase:', error.message);
      return null;
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      senderUserId: d.sender_user_id || d.senderUserId,
      senderName: d.sender_name || d.senderName,
      senderRole: d.sender_role || d.senderRole,
      recipientUserId: d.recipient_user_id || d.recipientUserId,
      recipientUserIds: d.recipient_user_ids || d.recipientUserIds,
      recipientName: d.recipient_name || d.recipientName,
      subject: d.subject,
      messageText: d.message_text || d.messageText,
      priority: d.priority || 'Routine',
      createdAt: d.created_at || d.createdAt || new Date().toISOString(),
      readBy: d.read_by || d.readBy || [],
    })) as UserMessage[];
  } catch (err) {
    console.warn('Supabase exception in fetchUserMessages:', err);
    return null;
  }
}

export async function saveUserMessageToSupabase(msg: UserMessage): Promise<boolean> {
  const snakePayload = {
    id: msg.id,
    sender_user_id: msg.senderUserId,
    sender_name: msg.senderName,
    sender_role: msg.senderRole,
    recipient_user_id: msg.recipientUserId,
    recipient_user_ids: msg.recipientUserIds || (msg.recipientUserId ? [msg.recipientUserId] : []),
    recipient_name: msg.recipientName,
    subject: msg.subject,
    message_text: msg.messageText,
    priority: msg.priority,
    read_by: msg.readBy || [],
    created_at: msg.createdAt,
  };

  const camelPayload = {
    id: msg.id,
    senderUserId: msg.senderUserId,
    senderName: msg.senderName,
    senderRole: msg.senderRole,
    recipientUserId: msg.recipientUserId,
    recipientUserIds: msg.recipientUserIds || (msg.recipientUserId ? [msg.recipientUserId] : []),
    recipientName: msg.recipientName,
    subject: msg.subject,
    messageText: msg.messageText,
    priority: msg.priority,
    readBy: msg.readBy || [],
    createdAt: msg.createdAt,
  };

  return resilientUpsert('user_messages', snakePayload, camelPayload);
}

export async function deleteUserMessageFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('user_messages').delete().eq('id', id);
    if (error) {
      console.error('Error deleting user message from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deleteUserMessage:', err);
    return false;
  }
}

// --- MONTHLY ARREST ADJUSTMENTS ---
export async function fetchMonthlyArrestOverridesFromSupabase(): Promise<Record<string, number> | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client.from('monthly_arrest_adjustments').select('*');
    if (error) {
      console.warn('Could not fetch monthly arrest adjustments from Supabase:', error.message);
      return null;
    }
    const map: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const key = `${row.month_key || row.monthKey}_${row.ps || 'ALL'}`;
      map[key] = row.adjusted_figure !== undefined ? row.adjusted_figure : row.adjustedFigure;
    });
    return map;
  } catch (err) {
    console.warn('Supabase monthly arrest exception:', err);
    return null;
  }
}

export async function saveMonthlyArrestOverrideToSupabase(
  monthKey: string,
  ps: string,
  figure: number,
  updatedBy: string
): Promise<boolean> {
  const snakePayload = {
    month_key: monthKey,
    ps: ps || 'ALL',
    adjusted_figure: figure,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  const camelPayload = {
    monthKey: monthKey,
    ps: ps || 'ALL',
    adjustedFigure: figure,
    updatedBy: updatedBy,
    updatedAt: new Date().toISOString(),
  };

  return resilientUpsert('monthly_arrest_adjustments', snakePayload, camelPayload, 'month_key');
}

// --- POLICE DISTRICTS ---
export async function fetchPoliceDistrictsFromSupabase(): Promise<PoliceDistrict[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client.from('police_districts').select('*').order('name', { ascending: true });
    if (error) {
      console.warn('Error fetching police districts from Supabase:', error.message);
      return null;
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name || '',
      state: d.state || 'Bihar',
      hqName: d.hq_name || d.hqName || '',
      description: d.description || '',
      createdAt: d.created_at || d.createdAt,
    })) as PoliceDistrict[];
  } catch (err) {
    console.warn('Supabase exception in fetchPoliceDistricts:', err);
    return null;
  }
}

export async function savePoliceDistrictToSupabase(district: PoliceDistrict): Promise<boolean> {
  const snakePayload = {
    id: district.id,
    name: district.name,
    state: district.state || 'Bihar',
    hq_name: district.hqName || null,
    description: district.description || null,
    created_at: district.createdAt || new Date().toISOString(),
  };

  const camelPayload = {
    id: district.id,
    name: district.name,
    state: district.state || 'Bihar',
    hqName: district.hqName || null,
    description: district.description || null,
    createdAt: district.createdAt || new Date().toISOString(),
  };

  return resilientUpsert('police_districts', snakePayload, camelPayload);
}

export async function deletePoliceDistrictFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('police_districts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting police district from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deletePoliceDistrict:', err);
    return false;
  }
}

// --- POLICE SUBDIVISIONS ---
export async function fetchPoliceSubdivisionsFromSupabase(): Promise<PoliceSubdivision[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client.from('police_subdivisions').select('*').order('name', { ascending: true });
    if (error) {
      console.warn('Error fetching police subdivisions from Supabase:', error.message);
      return null;
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      districtId: d.district_id || d.districtId || '',
      districtName: d.district_name || d.districtName || '',
      name: d.name || '',
      headquarters: d.headquarters || '',
      sdpoOfficerName: d.sdpo_officer_name || d.sdpoOfficerName || '',
      createdAt: d.created_at || d.createdAt,
    })) as PoliceSubdivision[];
  } catch (err) {
    console.warn('Supabase exception in fetchPoliceSubdivisions:', err);
    return null;
  }
}

export async function savePoliceSubdivisionToSupabase(subdivision: PoliceSubdivision): Promise<boolean> {
  const snakePayload = {
    id: subdivision.id,
    district_id: subdivision.districtId,
    district_name: subdivision.districtName,
    name: subdivision.name,
    headquarters: subdivision.headquarters || null,
    sdpo_officer_name: subdivision.sdpoOfficerName || null,
    created_at: subdivision.createdAt || new Date().toISOString(),
  };

  const camelPayload = {
    id: subdivision.id,
    districtId: subdivision.districtId,
    districtName: subdivision.districtName,
    name: subdivision.name,
    headquarters: subdivision.headquarters || null,
    sdpoOfficerName: subdivision.sdpoOfficerName || null,
    createdAt: subdivision.createdAt || new Date().toISOString(),
  };

  return resilientUpsert('police_subdivisions', snakePayload, camelPayload);
}

export async function deletePoliceSubdivisionFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('police_subdivisions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting police subdivision from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deletePoliceSubdivision:', err);
    return false;
  }
}

// --- POLICE STATIONS ---
export async function fetchPoliceStationsFromSupabase(): Promise<PoliceStation[] | null> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return null;
  try {
    const { data, error } = await client.from('police_stations').select('*').order('name', { ascending: true });
    if (error) {
      console.warn('Error fetching police stations from Supabase:', error.message);
      return null;
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      subdivisionId: d.subdivision_id || d.subdivisionId || '',
      subdivisionName: d.subdivision_name || d.subdivisionName || '',
      districtId: d.district_id || d.districtId || '',
      districtName: d.district_name || d.districtName || '',
      name: d.name || '',
      code: d.code || '',
      shoName: d.sho_name || d.shoName || '',
      contactNumber: d.contact_number || d.contactNumber || '',
      createdAt: d.created_at || d.createdAt,
    })) as PoliceStation[];
  } catch (err) {
    console.warn('Supabase exception in fetchPoliceStations:', err);
    return null;
  }
}

export async function savePoliceStationToSupabase(station: PoliceStation): Promise<boolean> {
  const snakePayload = {
    id: station.id,
    subdivision_id: station.subdivisionId,
    subdivision_name: station.subdivisionName,
    district_id: station.districtId,
    district_name: station.districtName,
    name: station.name,
    code: station.code || null,
    sho_name: station.shoName || null,
    contact_number: station.contactNumber || null,
    created_at: station.createdAt || new Date().toISOString(),
  };

  const camelPayload = {
    id: station.id,
    subdivisionId: station.subdivisionId,
    subdivisionName: station.subdivisionName,
    districtId: station.districtId,
    districtName: station.districtName,
    name: station.name,
    code: station.code || null,
    shoName: station.shoName || null,
    contactNumber: station.contactNumber || null,
    createdAt: station.createdAt || new Date().toISOString(),
  };

  return resilientUpsert('police_stations', snakePayload, camelPayload);
}

export async function deletePoliceStationFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!isSupabaseConfigured() || !client) return false;
  try {
    const { error } = await client.from('police_stations').delete().eq('id', id);
    if (error) {
      console.error('Error deleting police station from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception in deletePoliceStation:', err);
    return false;
  }
}

// --- SEED ALL LOCAL DATA TO SUPABASE ---
export async function seedAllDataToSupabase(data: {
  userAccounts: UserAccount[];
  cases: FIRCase[];
  ios: InvestigatingOfficer[];
  leaveLedger: LeaveLedgerEntry[];
  landDisputes: LandDispute[];
  udCases: UDCase[];
  dailyReports: DailyCrimeReport[];
  messages: UserMessage[];
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  policeStations?: PoliceStation[];
}): Promise<{ success: boolean; message: string; countSummary: Record<string, number> }> {
  if (!isSupabaseConfigured() || !getSupabase()) {
    return {
      success: false,
      message: 'Supabase is not configured. Please set your Supabase URL & Anon Key first.',
      countSummary: {},
    };
  }

  const counts: Record<string, number> = {
    districts: 0,
    subdivisions: 0,
    policeStations: 0,
    userAccounts: 0,
    cases: 0,
    ios: 0,
    leaveLedger: 0,
    landDisputes: 0,
    udCases: 0,
    dailyReports: 0,
    messages: 0,
  };

  try {
    // 1. Seed Hierarchy first (foreign key dependency: districts -> subdivisions -> stations)
    if (data.districts && data.districts.length > 0) {
      for (const d of data.districts) {
        if (await savePoliceDistrictToSupabase(d)) counts.districts++;
      }
    }
    if (data.subdivisions && data.subdivisions.length > 0) {
      for (const s of data.subdivisions) {
        if (await savePoliceSubdivisionToSupabase(s)) counts.subdivisions++;
      }
    }
    if (data.policeStations && data.policeStations.length > 0) {
      for (const ps of data.policeStations) {
        if (await savePoliceStationToSupabase(ps)) counts.policeStations++;
      }
    }

    // 2. Seed Users and Operations
    for (const acc of data.userAccounts) {
      if (await saveUserAccountToSupabase(acc)) counts.userAccounts++;
    }
    for (const c of data.cases) {
      if (await saveFIRCaseToSupabase(c)) counts.cases++;
    }
    for (const io of data.ios) {
      if (await saveIOToSupabase(io)) counts.ios++;
    }
    for (const l of data.leaveLedger) {
      if (await saveLeaveLedgerEntryToSupabase(l)) counts.leaveLedger++;
    }
    for (const ld of data.landDisputes) {
      if (await saveLandDisputeToSupabase(ld)) counts.landDisputes++;
    }
    for (const ud of data.udCases) {
      if (await saveUDCaseToSupabase(ud)) counts.udCases++;
    }
    for (const rep of data.dailyReports) {
      if (await saveDailyReportToSupabase(rep)) counts.dailyReports++;
    }
    for (const msg of data.messages) {
      if (await saveUserMessageToSupabase(msg)) counts.messages++;
    }

    return {
      success: true,
      message: `Successfully synchronized all records with Supabase Cloud Database!`,
      countSummary: counts,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Sync partially failed: ${err?.message || err}`,
      countSummary: counts,
    };
  }
}
