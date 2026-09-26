import React, { useState, useEffect } from 'react';
import {
  UserRole,
  UserAccount,
  FIRCase,
  LandDispute,
  UDCase,
  InvestigatingOfficer,
  DailyCrimeReport,
  UserMessage,
  FilterOptions,
  CaseDesignation,
  PoliceStationName,
  LeaveLedgerEntry,
  PoliceDistrict,
  PoliceSubdivision,
  PoliceStation,
} from './types';
import {
  INITIAL_USER_ACCOUNTS,
  INITIAL_FIRS,
  INITIAL_LAND_DISPUTES,
  INITIAL_UD_CASES,
  INITIAL_IOS,
  INITIAL_CRIME_REPORTS,
  INITIAL_MESSAGES,
  INITIAL_LEAVE_LEDGER,
  INITIAL_DISTRICTS,
  INITIAL_SUBDIVISIONS,
  INITIAL_POLICE_STATIONS,
} from './data/mockData';
import { getDeadlineInfo, getPSFromRole, matchesCaseFullDatabaseSearch, isCaseChargesheetedOrFinalForm } from './utils/helpers';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { FIRFilterBar } from './components/FIRFilterBar';
import { FIRTable } from './components/FIRTable';
import { NewFIREntryModal } from './components/NewFIREntryModal';
import { EditFIRModal } from './components/EditFIRModal';
import { ViewCaseModal } from './components/ViewCaseModal';
import { LandDisputeSection } from './components/LandDisputeSection';
import { DeadlineMonitor } from './components/DeadlineMonitor';
import { UDCaseSection } from './components/UDCaseSection';
import { IOManagement } from './components/IOManagement';
import { DailyCrimeReportSection } from './components/DailyCrimeReport';
import { SupervisionStatusSection } from './components/SupervisionStatusSection';
import { CaseReviewSection } from './components/CaseReviewSection';
import { AIChatbot } from './components/AIChatbot';
import { LoginModal } from './components/LoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { JurisdictionManagementModal } from './components/JurisdictionManagementModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { CaseQRCodeModal } from './components/CaseQRCodeModal';
import { FieldVerificationView } from './components/FieldVerificationView';
import { isSupabaseConfigured } from './lib/supabase';
import {
  fetchUserAccountsFromSupabase,
  saveUserAccountToSupabase,
  deleteUserAccountFromSupabase,
  fetchFIRCasesFromSupabase,
  saveFIRCaseToSupabase,
  deleteFIRCaseFromSupabase,
  fetchLandDisputesFromSupabase,
  saveLandDisputeToSupabase,
  deleteLandDisputeFromSupabase,
  fetchUDCasesFromSupabase,
  saveUDCaseToSupabase,
  deleteUDCaseFromSupabase,
  fetchIOsFromSupabase,
  saveIOToSupabase,
  deleteIOFromSupabase,
  fetchLeaveLedgerFromSupabase,
  saveLeaveLedgerEntryToSupabase,
  deleteLeaveLedgerEntryFromSupabase,
  fetchDailyReportsFromSupabase,
  saveDailyReportToSupabase,
  deleteDailyReportFromSupabase,
  fetchUserMessagesFromSupabase,
  saveUserMessageToSupabase,
  deleteUserMessageFromSupabase,
  fetchMonthlyArrestOverridesFromSupabase,
  saveMonthlyArrestOverrideToSupabase,
  fetchPoliceDistrictsFromSupabase,
  savePoliceDistrictToSupabase,
  deletePoliceDistrictFromSupabase,
  fetchPoliceSubdivisionsFromSupabase,
  savePoliceSubdivisionToSupabase,
  deletePoliceSubdivisionFromSupabase,
  fetchPoliceStationsFromSupabase,
  savePoliceStationToSupabase,
  deletePoliceStationFromSupabase,
} from './services/supabaseService';

const DEFAULT_FILTERS: FilterOptions = {
  searchQuery: '',
  policeStations: [],
  designations: [],
  deadlineStatus: 'ALL',
  statuses: [],
  cctnsSyncFilter: 'ALL',
  chargesheetCCTNS: 'ALL',
  caseDiaryCCTNS: 'ALL',
  ioNames: [],
  startDate: '',
  endDate: '',
  chargesheetStartDate: '',
  chargesheetEndDate: '',
  deadlineCategories: [],
};

export default function App() {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('sdpo_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('sdpo_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // User Accounts & Security State
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_user_accounts');
      return saved ? JSON.parse(saved) : INITIAL_USER_ACCOUNTS;
    } catch {
      return INITIAL_USER_ACCOUNTS;
    }
  });

  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('sdpo_current_user_account');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // Persistent State
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (currentUserAccount) return currentUserAccount.role;
    try {
      const saved = localStorage.getItem('sdpo_current_role');
      return (saved as UserRole) || 'SDPO';
    } catch {
      return 'SDPO';
    }
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [cases, setCases] = useState<FIRCase[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_firs');
      return saved ? JSON.parse(saved) : INITIAL_FIRS;
    } catch {
      return INITIAL_FIRS;
    }
  });

  const [landDisputes, setLandDisputes] = useState<LandDispute[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_land_disputes');
      return saved ? JSON.parse(saved) : INITIAL_LAND_DISPUTES;
    } catch {
      return INITIAL_LAND_DISPUTES;
    }
  });

  const [udCases, setUdCases] = useState<UDCase[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_ud_cases');
      return saved ? JSON.parse(saved) : INITIAL_UD_CASES;
    } catch {
      return INITIAL_UD_CASES;
    }
  });

  const [ios, setIos] = useState<InvestigatingOfficer[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_ios');
      return saved ? JSON.parse(saved) : INITIAL_IOS;
    } catch {
      return INITIAL_IOS;
    }
  });

  const [dailyReports, setDailyReports] = useState<DailyCrimeReport[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_daily_reports');
      return saved ? JSON.parse(saved) : INITIAL_CRIME_REPORTS;
    } catch {
      return INITIAL_CRIME_REPORTS;
    }
  });

  const [messages, setMessages] = useState<UserMessage[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_messages');
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [monthlyArrestOverrides, setMonthlyArrestOverrides] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('sdpo_monthly_arrest_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [leaveLedger, setLeaveLedger] = useState<LeaveLedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_leave_ledger');
      return saved ? JSON.parse(saved) : INITIAL_LEAVE_LEDGER;
    } catch {
      return INITIAL_LEAVE_LEDGER;
    }
  });

  // Hierarchy Data States (Districts, Subdivisions, Police Stations)
  const [districts, setDistricts] = useState<PoliceDistrict[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_districts');
      return saved ? JSON.parse(saved) : INITIAL_DISTRICTS;
    } catch {
      return INITIAL_DISTRICTS;
    }
  });

  const [subdivisions, setSubdivisions] = useState<PoliceSubdivision[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_subdivisions');
      return saved ? JSON.parse(saved) : INITIAL_SUBDIVISIONS;
    } catch {
      return INITIAL_SUBDIVISIONS;
    }
  });

  const [policeStations, setPoliceStations] = useState<PoliceStation[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_police_stations');
      return saved ? JSON.parse(saved) : INITIAL_POLICE_STATIONS;
    } catch {
      return INITIAL_POLICE_STATIONS;
    }
  });

  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>('ALL');
  const [isJurisdictionModalOpen, setIsJurisdictionModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('sdpo_districts', JSON.stringify(districts));
    } catch (e) {
      console.warn('Failed to save districts to localStorage', e);
    }
  }, [districts]);

  useEffect(() => {
    try {
      localStorage.setItem('sdpo_subdivisions', JSON.stringify(subdivisions));
    } catch (e) {
      console.warn('Failed to save subdivisions to localStorage', e);
    }
  }, [subdivisions]);

  useEffect(() => {
    try {
      localStorage.setItem('sdpo_police_stations', JSON.stringify(policeStations));
    } catch (e) {
      console.warn('Failed to save policeStations to localStorage', e);
    }
  }, [policeStations]);

  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Modals state
  const [isNewFIRModalOpen, setIsNewFIRModalOpen] = useState(false);
  const [isNewLandDisputeModalOpen, setIsNewLandDisputeModalOpen] = useState(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<FIRCase | null>(null);
  const [viewingCase, setViewingCase] = useState<FIRCase | null>(null);

  // Field Verification & QR Code States
  const [activeVerificationCaseId, setActiveVerificationCaseId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const verifyId = params.get('verify_case') || params.get('verify_fir') || params.get('case_id');
      if (verifyId) return verifyId;

      const hash = window.location.hash;
      if (hash.startsWith('#verify/')) {
        return hash.replace('#verify/', '');
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [qrModalCase, setQrModalCase] = useState<FIRCase | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const verifyId = params.get('verify_case') || params.get('verify_fir') || params.get('case_id');
        if (verifyId) {
          setActiveVerificationCaseId(verifyId);
        } else if (window.location.hash.startsWith('#verify/')) {
          setActiveVerificationCaseId(window.location.hash.replace('#verify/', ''));
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const handleOpenQRCode = (c: FIRCase) => {
    setQrModalCase(c);
    setIsQrModalOpen(true);
  };

  const handleExitVerification = () => {
    setActiveVerificationCaseId(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('verify_case');
      url.searchParams.delete('verify_fir');
      url.searchParams.delete('case_id');
      if (url.hash.startsWith('#verify/')) {
        url.hash = '';
      }
      window.history.pushState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  // Function to refresh all data from Supabase Cloud
  const handleRefreshAllFromSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const [
        accounts,
        firList,
        landList,
        udList,
        ioList,
        leaveList,
        reports,
        msgs,
        overrides,
        districtsList,
        subdivisionsList,
        policeStationsList,
      ] = await Promise.all([
        fetchUserAccountsFromSupabase(),
        fetchFIRCasesFromSupabase(),
        fetchLandDisputesFromSupabase(),
        fetchUDCasesFromSupabase(),
        fetchIOsFromSupabase(),
        fetchLeaveLedgerFromSupabase(),
        fetchDailyReportsFromSupabase(),
        fetchUserMessagesFromSupabase(),
        fetchMonthlyArrestOverridesFromSupabase(),
        fetchPoliceDistrictsFromSupabase(),
        fetchPoliceSubdivisionsFromSupabase(),
        fetchPoliceStationsFromSupabase(),
      ]);

      // 1. Sync Hierarchy
      if (districtsList && districtsList.length > 0) {
        setDistricts(districtsList);
      } else if (districtsList && districtsList.length === 0) {
        // Table exists in Supabase but is empty, populate initial districts
        for (const d of INITIAL_DISTRICTS) {
          savePoliceDistrictToSupabase(d).catch(() => {});
        }
      }

      if (subdivisionsList && subdivisionsList.length > 0) {
        setSubdivisions(subdivisionsList);
      } else if (subdivisionsList && subdivisionsList.length === 0) {
        for (const s of INITIAL_SUBDIVISIONS) {
          savePoliceSubdivisionToSupabase(s).catch(() => {});
        }
      }

      if (policeStationsList && policeStationsList.length > 0) {
        setPoliceStations(policeStationsList);
      } else if (policeStationsList && policeStationsList.length === 0) {
        for (const ps of INITIAL_POLICE_STATIONS) {
          savePoliceStationToSupabase(ps).catch(() => {});
        }
      }

      // 2. Sync Users & Operations
      if (accounts && accounts.length > 0) {
        // Merge with initial accounts to ensure nobody is lost
        const mergedMap = new Map<string, UserAccount>();
        INITIAL_USER_ACCOUNTS.forEach((a) => mergedMap.set(a.userId.toLowerCase(), a));
        accounts.forEach((a) => mergedMap.set(a.userId.toLowerCase(), a));
        setUserAccounts(Array.from(mergedMap.values()));
      }
      if (firList && firList.length > 0) setCases(firList);
      if (landList && landList.length > 0) setLandDisputes(landList);
      if (udList && udList.length > 0) setUdCases(udList);
      if (ioList && ioList.length > 0) setIos(ioList);
      if (leaveList && leaveList.length > 0) setLeaveLedger(leaveList);
      if (reports && reports.length > 0) setDailyReports(reports);
      if (msgs && msgs.length > 0) setMessages(msgs);
      if (overrides) setMonthlyArrestOverrides(overrides);
    } catch (err) {
      console.error('Error in handleRefreshAllFromSupabase:', err);
    }
  };

  // Save user accounts to LocalStorage
  useEffect(() => {
    localStorage.setItem('sdpo_user_accounts', JSON.stringify(userAccounts));
  }, [userAccounts]);

  useEffect(() => {
    if (currentUserAccount) {
      localStorage.setItem('sdpo_current_user_account', JSON.stringify(currentUserAccount));
    } else {
      localStorage.removeItem('sdpo_current_user_account');
    }
  }, [currentUserAccount]);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('sdpo_current_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('sdpo_firs', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    localStorage.setItem('sdpo_land_disputes', JSON.stringify(landDisputes));
  }, [landDisputes]);

  useEffect(() => {
    localStorage.setItem('sdpo_ud_cases', JSON.stringify(udCases));
  }, [udCases]);

  useEffect(() => {
    localStorage.setItem('sdpo_ios', JSON.stringify(ios));
  }, [ios]);

  useEffect(() => {
    localStorage.setItem('sdpo_daily_reports', JSON.stringify(dailyReports));
  }, [dailyReports]);

  useEffect(() => {
    localStorage.setItem('sdpo_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('sdpo_monthly_arrest_overrides', JSON.stringify(monthlyArrestOverrides));
  }, [monthlyArrestOverrides]);

  useEffect(() => {
    localStorage.setItem('sdpo_leave_ledger', JSON.stringify(leaveLedger));
  }, [leaveLedger]);

  // Supabase Initial Sync on Mount
  useEffect(() => {
    if (isSupabaseConfigured()) {
      handleRefreshAllFromSupabase();
    }
  }, []);

  // Auth Handlers
  const handleLoginSuccess = (account: UserAccount) => {
    setCurrentUserAccount(account);
    setCurrentRole(account.role);
  };

  const handleLogout = () => {
    setCurrentUserAccount(null);
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    // Find matching account or update current account role
    const matchingAccount = userAccounts.find((a) => a.role === role);
    if (matchingAccount) {
      setCurrentUserAccount(matchingAccount);
    }
  };

  const handleUpdateUserAccount = (updated: UserAccount) => {
    setUserAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (currentUserAccount?.id === updated.id) {
      setCurrentUserAccount(updated);
      setCurrentRole(updated.role);
    }
    saveUserAccountToSupabase(updated);
  };

  const handleAddUserAccount = (newAccount: UserAccount) => {
    setUserAccounts((prev) => [...prev, newAccount]);
    saveUserAccountToSupabase(newAccount);
  };

  const handleDeleteUserAccount = (accountId: string) => {
    if (currentUserAccount?.id === accountId) {
      alert('Action Denied: You cannot delete your own active account while logged in.');
      return;
    }
    setUserAccounts((prev) => prev.filter((a) => a.id !== accountId));
    deleteUserAccountFromSupabase(accountId);
  };

  const handleResetUserAccountsToDefaults = () => {
    setUserAccounts(INITIAL_USER_ACCOUNTS);
    if (currentUserAccount) {
      const match = INITIAL_USER_ACCOUNTS.find((a) => a.role === currentUserAccount.role);
      if (match) setCurrentUserAccount(match);
    }
  };

  // Hierarchy & Jurisdiction Level Scoping
  const isAdministrator =
    currentRole === 'ADMINISTRATOR' ||
    currentUserAccount?.role === 'ADMINISTRATOR' ||
    currentUserAccount?.userId?.toLowerCase() === 'admin';

  const isDistrictLevel =
    !isAdministrator &&
    (currentRole === 'SP' ||
      currentRole === 'DISTRICT_ADMIN' ||
      currentUserAccount?.role === 'SP' ||
      currentUserAccount?.role === 'DISTRICT_ADMIN' ||
      currentUserAccount?.policeStation === 'District HQ');

  const isSubdivisionLevel =
    !isAdministrator &&
    !isDistrictLevel &&
    (currentRole === 'SDPO' ||
      currentRole === 'CI' ||
      currentUserAccount?.role === 'SDPO' ||
      currentUserAccount?.role === 'CI' ||
      currentUserAccount?.policeStation === 'Subdivision HQ');

  const userDistrict = currentUserAccount?.district || 'Munger';
  const userSubdivision = currentUserAccount?.subdivision || 'Tarapur';

  const userPS =
    currentUserAccount?.policeStation &&
    currentUserAccount.policeStation !== 'District HQ' &&
    currentUserAccount.policeStation !== 'Subdivision HQ'
      ? currentUserAccount.policeStation
      : getPSFromRole(currentRole);

  // Active PS is only non-null if user is a PS-level officer
  const activePS = isAdministrator || isDistrictLevel || isSubdivisionLevel ? null : userPS;

  const getSubdivisionForPS = (psName?: string): string => {
    if (!psName) return 'Tarapur';
    const found = (policeStations && policeStations.length > 0 ? policeStations : INITIAL_POLICE_STATIONS).find(
      (p) => p.name.toLowerCase() === psName.toLowerCase()
    );
    if (found?.subdivisionName) return found.subdivisionName;
    const lower = psName.toLowerCase();
    if (['tarapur', 'asarganj', 'sangrampur', 'harpur'].includes(lower)) return 'Tarapur';
    if (['munger kotwali', 'kotwali', 'kasim bazar', 'purabsarai', 'mufassil', 'muffasil', 'nayaramnagar', 'safiasarai'].includes(lower)) return 'Munger Sadar';
    if (['kharagpur', 'shamshabad', 'tetiyabambar', 'gangta'].includes(lower)) return 'Kharagpur';
    if (['bhagalpur sadar', 'kotwali bhagalpur', 'ishakchak', 'babarganj'].includes(lower)) return 'Bhagalpur Sadar';
    if (['kahalgaon', 'sanokhar'].includes(lower)) return 'Kahalgaon';
    return 'Tarapur';
  };

  const getDistrictForPS = (psName?: string): string => {
    if (!psName) return 'Munger';
    const found = (policeStations && policeStations.length > 0 ? policeStations : INITIAL_POLICE_STATIONS).find(
      (p) => p.name.toLowerCase() === psName.toLowerCase()
    );
    if (found?.districtName) return found.districtName;
    return 'Munger';
  };

  const isRecordInJurisdictionScope = (item: { ps?: string; district?: string; subdivision?: string }) => {
    if (isAdministrator) {
      if (selectedDistrict && selectedDistrict !== 'ALL') {
        const itemDistrict = item.district || 'Munger';
        if (itemDistrict.toLowerCase() !== selectedDistrict.toLowerCase()) return false;
      }
      if (selectedSubdivision && selectedSubdivision !== 'ALL') {
        const itemSubdivision = item.subdivision || getSubdivisionForPS(item.ps);
        if (itemSubdivision && itemSubdivision.toLowerCase() !== selectedSubdivision.toLowerCase()) {
          return false;
        }
      }
      return true;
    }

    if (isDistrictLevel) {
      const itemDistrict = item.district || 'Munger';
      if (itemDistrict.toLowerCase() !== userDistrict.toLowerCase()) return false;
      if (selectedSubdivision && selectedSubdivision !== 'ALL') {
        const itemSubdivision = item.subdivision || getSubdivisionForPS(item.ps);
        if (itemSubdivision && itemSubdivision.toLowerCase() !== selectedSubdivision.toLowerCase()) {
          return false;
        }
      }
      return true;
    }

    if (isSubdivisionLevel) {
      const itemSubdivision = item.subdivision || getSubdivisionForPS(item.ps);
      return !itemSubdivision || itemSubdivision.toLowerCase() === userSubdivision.toLowerCase();
    }

    // Police Station level
    return !activePS || item.ps === activePS;
  };

  const isRecordInUserBaseScope = (item: { ps?: string; district?: string; subdivision?: string }) => {
    if (isAdministrator) return true;
    if (isDistrictLevel) {
      const itemDistrict = item.district || getDistrictForPS(item.ps);
      return itemDistrict.toLowerCase() === userDistrict.toLowerCase();
    }
    if (isSubdivisionLevel) {
      const itemSubdivision = item.subdivision || getSubdivisionForPS(item.ps);
      return itemSubdivision.toLowerCase() === userSubdivision.toLowerCase();
    }
    return !activePS || item.ps === activePS;
  };

  // Permission levels check
  const isViewer = currentUserAccount?.permissionLevel === 'VIEWER';
  const isOperator = currentUserAccount?.permissionLevel === 'OPERATOR';
  // Operator is like viewer for FIRs, UD, IOs, Land Disputes
  const isReadOnly = isViewer || isOperator;
  // Operator CAN add to daily reports, only VIEWER is read-only for daily reports
  const isDailyReportReadOnly = isViewer;

  // Handlers for FIRs
  const handleCreateFIR = (newCaseData: Omit<FIRCase, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access. You cannot create new FIR records.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const targetSubdivision = newCaseData.subdivision && newCaseData.subdivision !== 'ALL'
      ? newCaseData.subdivision
      : getSubdivisionForPS(newCaseData.ps);
    const targetDistrict = newCaseData.district && newCaseData.district !== 'ALL'
      ? newCaseData.district
      : (currentUserAccount?.district && currentUserAccount.district !== 'ALL' ? currentUserAccount.district : getDistrictForPS(newCaseData.ps));

    const newCase: FIRCase = {
      ...newCaseData,
      id: `fir-${Date.now()}`,
      district: targetDistrict,
      subdivision: targetSubdivision,
      createdAt: todayStr,
      updatedAt: todayStr,
    };
    setCases((prev) => [newCase, ...prev]);
    saveFIRCaseToSupabase(newCase);
  };

  const handleUpdateFIR = (updatedCase: FIRCase) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access. You cannot modify case records.');
      return;
    }
    setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    saveFIRCaseToSupabase(updatedCase);
  };

  const handleDeleteFIR = (caseId: string) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const targetCase = cases.find((c) => c.id === caseId);
    if (!targetCase) return;

    // Permissions check: Superuser (SP / SDPO) can delete anything in their scope. PS can delete their cases. CI can delete NON-SR cases.
    const isSuperUser = isDistrictLevel || currentRole === 'SDPO';
    const isOwnPS = activePS && targetCase.ps === activePS;
    const isCI = currentRole === 'CI';

    if (!isSuperUser && !isOwnPS && !isCI) {
      alert(`Permission Denied: ${currentRole} cannot delete FIR cases belonging to ${targetCase.ps} PS.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete FIR ${targetCase.firNumber} (${targetCase.ps} PS)? This action cannot be undone.`)) {
      return;
    }

    setCases((prev) => prev.filter((c) => c.id !== caseId));
    deleteFIRCaseFromSupabase(caseId);
  };

  const handleDeleteSupervisionNote = (caseId: string) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const isSuperUser = isDistrictLevel || currentRole === 'SDPO';
    if (!isSuperUser) {
      alert('Permission Denied: Only SP (District Chief) or SDPO can delete or clear supervision directives.');
      return;
    }
    const targetCase = cases.find((c) => c.id === caseId);
    if (!targetCase) return;

    if (!window.confirm(`Are you sure you want to clear/delete the Supervision directive for FIR ${targetCase.firNumber}?`)) {
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedCase: FIRCase = {
      ...targetCase,
      sdpoSupervisionNote: undefined,
      supervisionDate: undefined,
      updatedAt: todayStr,
    };

    setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
    saveFIRCaseToSupabase(updatedCase);
  };

  const handleDesignateCase = (caseId: string, designation: CaseDesignation) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const isSuperUser = isDistrictLevel || currentRole === 'SDPO';
    if (!isSuperUser && currentRole !== 'CI') {
      alert('Permission Denied: Only SP, SDPO or CI can assign SR / NON-SR case designation.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const targetCase = cases.find((c) => c.id === caseId);
    if (targetCase) {
      const updatedCase: FIRCase = {
        ...targetCase,
        designation,
        designationDate: todayStr,
        updatedAt: todayStr,
      };
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
      saveFIRCaseToSupabase(updatedCase);
    }
  };

  // Handlers for Land Disputes
  const handleAddLandDispute = (newDisputeData: Omit<LandDispute, 'id' | 'createdAt'>) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const targetSubdivision = getSubdivisionForPS(newDisputeData.ps);
    const newDispute: LandDispute = {
      ...newDisputeData,
      id: `ld-${Date.now()}`,
      district: currentUserAccount?.district || 'Munger',
      subdivision: targetSubdivision,
      createdAt: todayStr,
    };
    setLandDisputes((prev) => [newDispute, ...prev]);
    saveLandDisputeToSupabase(newDispute);
  };

  const handleUpdateLandDisputeStatus = (
    id: string,
    status: 'Pending' | 'Disposed',
    disposalRemarks?: string
  ) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const target = landDisputes.find((l) => l.id === id);
    if (target) {
      const updated: LandDispute = {
        ...target,
        status,
        disposalDate: status === 'Disposed' ? todayStr : undefined,
        disposalRemarks: status === 'Disposed' ? disposalRemarks || target.disposalRemarks : undefined,
      };
      setLandDisputes((prev) => prev.map((l) => (l.id === id ? updated : l)));
      saveLandDisputeToSupabase(updated);
    }
  };

  const handleDeleteLandDispute = (id: string) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const target = landDisputes.find((l) => l.id === id);
    if (!target) return;

    const isSuperUser = isDistrictLevel || currentRole === 'SDPO';
    const isOwnPS = activePS && target.ps === activePS;

    if (!isSuperUser && !isOwnPS) {
      alert(`Permission Denied: ${currentRole} cannot delete Land Disputes belonging to ${target.ps} PS.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete this Land Dispute record for ${target.victimName}?`)) {
      return;
    }

    setLandDisputes((prev) => prev.filter((l) => l.id !== id));
    deleteLandDisputeFromSupabase(id);
  };

  // Handlers for UD Cases
  const handleAddUDCase = (newUDData: Omit<UDCase, 'id'>) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const targetSubdivision = getSubdivisionForPS(newUDData.ps);
    const newUD: UDCase = {
      ...newUDData,
      id: `ud-${Date.now()}`,
      district: currentUserAccount?.district || 'Munger',
      subdivision: targetSubdivision,
    };
    setUdCases((prev) => [newUD, ...prev]);
    saveUDCaseToSupabase(newUD);
  };

  const handleUpdateUDCase = (updatedUD: UDCase) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    setUdCases((prev) => prev.map((u) => (u.id === updatedUD.id ? updatedUD : u)));
    saveUDCaseToSupabase(updatedUD);
  };

  const handleDeleteUDCase = (id: string) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const target = udCases.find((u) => u.id === id);
    if (!target) return;

    const isSuperUser = isDistrictLevel || currentRole === 'SDPO';
    const isOwnPS = activePS && target.ps === activePS;

    if (!isSuperUser && !isOwnPS) {
      alert(`Permission Denied: ${currentRole} cannot delete UD cases belonging to ${target.ps} PS.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete UD Case ${target.udCaseNo} (${target.ps} PS)?`)) {
      return;
    }

    setUdCases((prev) => prev.filter((u) => u.id !== id));
    deleteUDCaseFromSupabase(id);
  };

  // Handlers for IOs
  const handleAddIO = (newIOData: Omit<InvestigatingOfficer, 'id'>) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const targetSubdivision = getSubdivisionForPS(newIOData.ps);
    const newIO: InvestigatingOfficer = {
      ...newIOData,
      id: `io-${Date.now()}`,
      district: currentUserAccount?.district || 'Munger',
      subdivision: targetSubdivision,
    };
    setIos((prev) => [...prev, newIO]);
    saveIOToSupabase(newIO);
  };

  const handleUpdateIO = (updatedIO: InvestigatingOfficer) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    setIos((prev) => prev.map((io) => (io.id === updatedIO.id ? updatedIO : io)));
    saveIOToSupabase(updatedIO);
  };

  const handleDeleteIO = (ioId: string) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const targetIO = ios.find((i) => i.id === ioId);
    if (!targetIO) return;

    const isSuperUser = isDistrictLevel || currentRole === 'SDPO';
    const isOwnPS = activePS && targetIO.ps === activePS;
    const isCI = currentRole === 'CI';

    if (!isSuperUser && !isOwnPS && !isCI) {
      alert(`Permission Denied: ${currentRole} cannot delete IO assigned to ${targetIO.ps} PS.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete IO ${targetIO.name} (${targetIO.ps} PS)?`)) {
      return;
    }

    setIos((prev) => prev.filter((i) => i.id !== ioId));
    deleteIOFromSupabase(ioId);
  };

  // Handlers for Daily Crime Reports
  const handleAddDailyReport = (newReportData: Omit<DailyCrimeReport, 'id'>) => {
    if (isViewer) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) access.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const targetSubdivision = getSubdivisionForPS(newReportData.ps);
    const newReport: DailyCrimeReport = {
      ...newReportData,
      id: `dcr-${Date.now()}`,
      district: currentUserAccount?.district || 'Munger',
      subdivision: targetSubdivision,
    };
    setDailyReports((prev) => [newReport, ...prev]);
    saveDailyReportToSupabase(newReport);

    // 1. Process Case-Specific Arrests logged in the Daily Report
    if (newReport.arrestDetails?.caseArrests && newReport.arrestDetails.caseArrests.length > 0) {
      setCases((prevCases) => {
        let updatedCases = [...prevCases];

        newReport.arrestDetails!.caseArrests.forEach((ca: any) => {
          // Find FIRCase by ID or fallback to matching typed FIR number in the same PS
          let matchedCaseIdx = updatedCases.findIndex((c) => c.id === ca.caseId);
          if (matchedCaseIdx === -1 && ca.caseNumber) {
            const match = ca.caseNumber.match(/(\d+\/\d+)/);
            const extractedNo = match ? match[1] : ca.caseNumber.trim();
            matchedCaseIdx = updatedCases.findIndex(
              (c) =>
                c.ps.toLowerCase() === newReport.ps.toLowerCase() &&
                c.firNumber.toLowerCase() === extractedNo.toLowerCase()
            );
          }

          if (matchedCaseIdx !== -1) {
            const targetCase = { ...updatedCases[matchedCaseIdx] };
            let list = [...(targetCase.accusedList || [])];

            // A: Update selected accused checkboxes to 'Arrested'
            const checkedNames = ca.arrestedAccusedNames || [];
            list = list.map((a) => {
              if (checkedNames.includes(a.name)) {
                return { ...a, status: 'Arrested' as const };
              }
              return a;
            });

            // B: Add manually added accused names to 'Arrested'
            const manualNames = ca.manualAccusedNames || [];
            manualNames.forEach((mName: string) => {
              const cleaned = mName.trim();
              const existingIdx = list.findIndex((a) => a.name.toLowerCase() === cleaned.toLowerCase());
              if (existingIdx !== -1) {
                list[existingIdx] = { ...list[existingIdx], status: 'Arrested' as const };
              } else {
                list.push({
                  id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                  name: cleaned,
                  status: 'Arrested' as const,
                });
              }
            });

            // C: Recalculate counts & string rosters
            const arrested = list.filter((a) => a.status === 'Arrested');
            const toArrest = list.filter((a) => a.status !== 'Arrested');

            targetCase.accusedList = list;
            targetCase.arrestedCount = arrested.length;
            targetCase.arrestedNames = arrested.map((a) => a.name).join(', ');
            targetCase.anyPersonArrested = arrested.length > 0;

            targetCase.pendingArrestCount = toArrest.length;
            targetCase.pendingArrestNames = toArrest.map((a) => a.name).join(', ');
            targetCase.pendingForArrest = toArrest.length > 0;

            updatedCases[matchedCaseIdx] = targetCase;
            saveFIRCaseToSupabase(targetCase);
          }
        });

        return updatedCases;
      });
    }

    // 2. Auto-create FIR cases from daily report registered FIRs
    if (newReport.registeredFirs && newReport.registeredFirs.length > 0) {
      newReport.registeredFirs.forEach((f, idx) => {
        const targetSubdiv = newReport.subdivision || getSubdivisionForPS(newReport.ps);
        const targetDist = newReport.district || getDistrictForPS(newReport.ps);
        
        // Map accused names if any were entered
        const parsedAccusedList = (f.accusedNames || []).map((name, aIdx) => ({
          id: `acc-${Date.now()}-${idx}-${aIdx}-${Math.random().toString(36).substring(2, 5)}`,
          name: name.trim(),
          status: 'Enquiry' as const,
        }));

        const newCase: FIRCase = {
          id: `fir-auto-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          firNumber: f.firNumber.trim(),
          district: targetDist,
          subdivision: targetSubdiv,
          ps: newReport.ps,
          firDate: f.date || newReport.date,
          sections: f.sections.trim(),
          crimeHead: 'Other / General IPC & BNS',
          crimeHeads: ['Other / General IPC & BNS'],
          punishmentTerm: 'less_than_7_years',
          complainantName: (f.complainantName || 'Unknown').trim(),
          complainantPhone: (f.complainantPhone || '').trim(),
          placeOfOccurrence: (f.placeOfOccurrence || 'Unknown').trim(),
          ioName: f.ioName,
          designation: 'PENDING_DESIGNATION',
          deadlineDays: 60,
          status: 'Under Investigation',
          chargesheetUploadedCCTNS: false,
          caseDiaryUploadedCCTNS: false,
          psProgressRemarks: 'Registered automatically via Daily Police Station Diary.',
          accusedList: parsedAccusedList,
          createdAt: todayStr,
          updatedAt: todayStr,
        };

        setCases((prev) => {
          if (prev.some((c) => c.firNumber.toLowerCase() === newCase.firNumber.toLowerCase() && c.ps.toLowerCase() === newCase.ps.toLowerCase())) {
            return prev;
          }
          saveFIRCaseToSupabase(newCase);
          return [newCase, ...prev];
        });
      });
    }

    // Auto-sync newly recorded departing officers to leave ledger
    if (newReport.leaveLedgerEntries && newReport.leaveLedgerEntries.length > 0) {
      setLeaveLedger((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        const toAdd = (newReport.leaveLedgerEntries || []).filter((e) => !existingIds.has(e.id));
        toAdd.forEach((entry) => saveLeaveLedgerEntryToSupabase(entry));
        return [...toAdd, ...prev];
      });
    }
  };

  const handleUpdateLeaveStatus = (leaveId: string, status: 'ON_LEAVE' | 'ARRIVED' | 'OVERDUE', actualArrivalDate?: string) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has view-only access to the leave ledger.');
      return;
    }
    setLeaveLedger((prev) => {
      const exists = prev.some((item) => item.id === leaveId);
      if (exists) {
        return prev.map((item) => {
          if (item.id === leaveId) {
            const updated: LeaveLedgerEntry = {
              ...item,
              status,
              actualArrivalDate: status === 'ARRIVED' ? (actualArrivalDate || new Date().toISOString().split('T')[0]) : undefined,
            };
            saveLeaveLedgerEntryToSupabase(updated);
            return updated;
          }
          return item;
        });
      } else {
        let foundEntry: LeaveLedgerEntry | undefined;
        for (const r of dailyReports) {
          const entry = (r.leaveLedgerEntries || []).find((e) => e.id === leaveId);
          if (entry) {
            foundEntry = entry;
            break;
          }
        }
        if (foundEntry) {
          const updated: LeaveLedgerEntry = {
            ...foundEntry,
            status,
            actualArrivalDate: status === 'ARRIVED' ? (actualArrivalDate || new Date().toISOString().split('T')[0]) : undefined,
          };
          saveLeaveLedgerEntryToSupabase(updated);
          return [updated, ...prev];
        }
        return prev;
      }
    });

    setDailyReports((prev) =>
      prev.map((report) => {
        const hasLeave = (report.leaveLedgerEntries || []).some((e) => e.id === leaveId);
        if (hasLeave) {
          const updatedEntries = (report.leaveLedgerEntries || []).map((e) => {
            if (e.id === leaveId) {
              return {
                ...e,
                status,
                actualArrivalDate: status === 'ARRIVED' ? (actualArrivalDate || new Date().toISOString().split('T')[0]) : undefined,
              };
            }
            return e;
          });
          const updatedReport = {
            ...report,
            leaveLedgerEntries: updatedEntries,
          };
          saveDailyReportToSupabase(updatedReport);
          return updatedReport;
        }
        return report;
      })
    );
  };

  const handleUpdateLeaveEntry = (updatedEntry: LeaveLedgerEntry) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has view-only access to the leave ledger.');
      return;
    }
    setLeaveLedger((prev) =>
      prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item))
    );
    saveLeaveLedgerEntryToSupabase(updatedEntry);

    // Also update any reference in daily reports
    setDailyReports((prev) =>
      prev.map((report) => {
        const hasLeave = (report.leaveLedgerEntries || []).some((e) => e.id === updatedEntry.id);
        if (hasLeave) {
          const updatedEntries = (report.leaveLedgerEntries || []).map((e) =>
            e.id === updatedEntry.id ? updatedEntry : e
          );
          const updatedReport = {
            ...report,
            leaveLedgerEntries: updatedEntries,
          };
          saveDailyReportToSupabase(updatedReport);
          return updatedReport;
        }
        return report;
      })
    );
  };

  const handleAddLeaveEntry = (entry: LeaveLedgerEntry) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has view-only access to the leave ledger.');
      return;
    }
    setLeaveLedger((prev) => [entry, ...prev]);
    saveLeaveLedgerEntryToSupabase(entry);
  };

  const handleDeleteLeaveEntry = (leaveId: string) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has view-only access to the leave ledger.');
      return;
    }
    setLeaveLedger((prev) => prev.filter((item) => item.id !== leaveId));
    deleteLeaveLedgerEntryFromSupabase(leaveId);

    setDailyReports((prev) =>
      prev.map((report) => {
        const hasLeave = (report.leaveLedgerEntries || []).some((e) => e.id === leaveId);
        if (hasLeave) {
          const updatedEntries = (report.leaveLedgerEntries || []).filter((e) => e.id !== leaveId);
          const updatedReport = {
            ...report,
            leaveLedgerEntries: updatedEntries,
          };
          saveDailyReportToSupabase(updatedReport);
          return updatedReport;
        }
        return report;
      })
    );
  };

  const handleDeleteDailyReport = (id: string) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account does not have permission to delete reports.');
      return;
    }
    const target = dailyReports.find((r) => r.id === id);
    if (!target) return;

    const isSuperUser = currentRole === 'SDPO';
    const isOwnPS = activePS && target.ps === activePS;

    if (!isSuperUser && !isOwnPS) {
      alert(`Permission Denied: ${currentRole} cannot delete daily reports belonging to ${target.ps} PS.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete this daily crime report entry?`)) {
      return;
    }

    setDailyReports((prev) => prev.filter((r) => r.id !== id));
    deleteDailyReportFromSupabase(id);
  };

  // Handlers for Inter-Desk Messages
  const handleSendMessage = (msgData: Omit<UserMessage, 'id' | 'createdAt'>) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has view-only access to the messages desk.');
      return;
    }
    const newMsg: UserMessage = {
      ...msgData,
      id: `msg-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [newMsg, ...prev]);
    saveUserMessageToSupabase(newMsg);
  };

  const handleDeleteMessage = (msgId: string) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account has view-only access to messages.');
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    deleteUserMessageFromSupabase(msgId);
  };

  const handleMarkMessageAsRead = (msgId: string) => {
    const currentUserId = currentUserAccount?.userId || currentRole;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const currentRead = m.readBy || [];
          if (!currentRead.includes(currentUserId)) {
            const updated = { ...m, readBy: [...currentRead, currentUserId] };
            saveUserMessageToSupabase(updated);
            return updated;
          }
        }
        return m;
      })
    );
  };

  // Handler for Super User Monthly Arrest Override
  const handleUpdateMonthlyArrestOverride = (monthKey: string, ps: string, figure: number) => {
    if (isReadOnly) {
      alert('Permission Denied: Your account cannot modify arrest overrides.');
      return;
    }
    const key = `${monthKey}_${ps || 'ALL'}`;
    setMonthlyArrestOverrides((prev) => ({ ...prev, [key]: figure }));
    saveMonthlyArrestOverrideToSupabase(
      monthKey,
      ps,
      figure,
      currentUserAccount?.officerName || currentRole
    );
  };

  // Calculate filtered FIR cases
  const visibleCases = cases.filter((c) => {
    // Jurisdiction Scoping (District / Subdivision / PS)
    if (!isRecordInJurisdictionScope(c)) return false;

    // Filters
    if (filters.policeStations && filters.policeStations.length > 0 && !filters.policeStations.includes(c.ps)) {
      return false;
    }
    if (filters.designations && filters.designations.length > 0 && !filters.designations.includes(c.designation)) {
      return false;
    }
    if (filters.statuses && filters.statuses.length > 0) {
      const matchStatus = filters.statuses.some((st) => {
        if (st === 'Disposed') {
          return c.status === 'Disposed' || c.status === 'False Case / Mistake of Fact';
        }
        if (st === 'Under Investigation') {
          return c.status === 'Under Investigation';
        }
        return c.status === st;
      });
      if (!matchStatus) return false;
    }

    // Chargesheeted / Final Form Submitted / Mistake of Fact Filter
    if (filters.chargesheetedFilter && filters.chargesheetedFilter !== 'ALL') {
      const isCS = isCaseChargesheetedOrFinalForm(c);
      if (filters.chargesheetedFilter === 'YES' && !isCS) return false;
      if (filters.chargesheetedFilter === 'NO' && isCS) return false;
    }
    if (
      filters.deadlineCategories &&
      filters.deadlineCategories.length > 0 &&
      !filters.deadlineCategories.includes(c.deadlineDays)
    ) {
      return false;
    }
    if (filters.ioNames && filters.ioNames.length > 0 && !filters.ioNames.includes(c.ioName)) {
      return false;
    }

    // Punishment Term Filter
    if (filters.punishmentFilter && filters.punishmentFilter !== 'ALL') {
      if (c.punishmentTerm !== filters.punishmentFilter) return false;
    }

    // CCTNS Sync Filter
    if (filters.cctnsSyncFilter === 'CS_SYNC' && (!c.chargesheetUploadedCCTNS || c.caseDiaryUploadedCCTNS)) return false;
    if (filters.cctnsSyncFilter === 'CD_SYNC' && (!c.caseDiaryUploadedCCTNS || c.chargesheetUploadedCCTNS)) return false;
    if (filters.cctnsSyncFilter === 'BOTH_SYNC' && (!c.chargesheetUploadedCCTNS || !c.caseDiaryUploadedCCTNS)) return false;
    if (filters.cctnsSyncFilter === 'NONE_SYNC' && (c.chargesheetUploadedCCTNS || c.caseDiaryUploadedCCTNS)) return false;

    if (filters.chargesheetCCTNS === 'YES' && !c.chargesheetUploadedCCTNS) return false;
    if (filters.chargesheetCCTNS === 'NO' && c.chargesheetUploadedCCTNS) return false;

    if (filters.caseDiaryCCTNS === 'YES' && !c.caseDiaryUploadedCCTNS) return false;
    if (filters.caseDiaryCCTNS === 'NO' && c.caseDiaryUploadedCCTNS) return false;

    // Deadline Status filter
    const deadlineInfo = getDeadlineInfo(c);
    if (filters.deadlineStatus !== 'ALL' && deadlineInfo.code !== filters.deadlineStatus) return false;

    // Search Query - Full database search across all fields (FIR, SDPO Orders, CI Remarks, IO Progress Updates, Sections, Dates, Accused, etc.)
    if (filters.searchQuery && filters.searchQuery.trim()) {
      if (!matchesCaseFullDatabaseSearch(c, filters.searchQuery)) {
        return false;
      }
    }

    // FIR Date range
    if (filters.startDate && c.firDate < filters.startDate) return false;
    if (filters.endDate && c.firDate > filters.endDate) return false;

    // Chargesheet Date range
    if (filters.chargesheetStartDate) {
      if (!c.chargesheetDate || c.chargesheetDate < filters.chargesheetStartDate) return false;
    }
    if (filters.chargesheetEndDate) {
      if (!c.chargesheetDate || c.chargesheetDate > filters.chargesheetEndDate) return false;
    }

    // Disposed Date range
    const caseDisposedDate = c.disposedDate || (c.status === 'Disposed' ? c.updatedAt : '');
    if (filters.disposedStartDate) {
      if (!caseDisposedDate || caseDisposedDate < filters.disposedStartDate) return false;
    }
    if (filters.disposedEndDate) {
      if (!caseDisposedDate || caseDisposedDate > filters.disposedEndDate) return false;
    }

    return true;
  });

  const handleApplyFilter = (newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Global overdue count
  const overdueCount = cases.filter((c) => {
    if (!isRecordInJurisdictionScope(c)) return false;
    return getDeadlineInfo(c).code === 'OVERDUE';
  }).length;

  const pendingSRCount = cases.filter((c) => {
    if (!isRecordInJurisdictionScope(c)) return false;
    return c.designation === 'SR' && c.status === 'Under Investigation';
  }).length;

  const pendingLandDisputesCount = landDisputes.filter((l) => {
    if (!isRecordInJurisdictionScope(l)) return false;
    return l.status === 'Pending';
  }).length;

  // Field Verification View for QR Code Scans (Works for public field officers without requiring admin portal sign-in)
  if (activeVerificationCaseId) {
    const matchedVerificationCase =
      cases.find(
        (c) =>
          c.id.toLowerCase() === activeVerificationCaseId.toLowerCase() ||
          c.firNumber.toLowerCase() === activeVerificationCaseId.toLowerCase() ||
          c.firNumber.replace(/\D/g, '') === activeVerificationCaseId.replace(/\D/g, '')
      ) || null;

    return (
      <FieldVerificationView
        caseItem={matchedVerificationCase}
        caseId={activeVerificationCaseId}
        onExit={handleExitVerification}
        onLoginPortal={() => {
          handleExitVerification();
        }}
      />
    );
  }

  if (!currentUserAccount) {
    return (
      <>
        <LoginModal
          isOpen={true}
          accounts={userAccounts}
          onLoginSuccess={handleLoginSuccess}
          onResetAccounts={handleResetUserAccountsToDefaults}
          onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        />
        <SupabaseConfigModal
          isOpen={isSupabaseConfigOpen}
          onClose={() => setIsSupabaseConfigOpen(false)}
          onRefreshAllData={handleRefreshAllFromSupabase}
          localData={{
            userAccounts,
            cases,
            ios,
            leaveLedger,
            landDisputes,
            udCases,
            dailyReports,
            messages,
          }}
        />
      </>
    );
  }

  // Count unread messages for current user
  const currentUserId = currentUserAccount?.userId || currentRole;
  const unreadMessagesCount = messages.filter((m) => {
    const isTarget =
      m.recipientUserId === 'ALL' ||
      m.recipientUserId === currentUserId ||
      m.recipientUserId === currentRole ||
      m.recipientUserIds?.includes(currentUserId) ||
      m.recipientUserIds?.includes(currentRole) ||
      (m.recipientUserId &&
        m.recipientUserId
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .some((s) => s === currentUserId.toLowerCase() || s === currentRole.toLowerCase() || s === 'all'));
    return isTarget && !m.readBy?.includes(currentUserId);
  }).length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      
      {/* Primary Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        currentUserAccount={currentUserAccount}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewFIR={() => setIsNewFIRModalOpen(true)}
        onOpenNewLandDispute={() => setIsNewLandDisputeModalOpen(true)}
        overdueCount={overdueCount}
        pendingSRCount={pendingSRCount}
        pendingLandDisputesCount={pendingLandDisputesCount}
        unreadMessagesCount={unreadMessagesCount}
        theme={theme}
        onToggleTheme={toggleTheme}
        isReadOnly={isReadOnly}
        districts={districts}
        subdivisions={subdivisions}
        selectedDistrict={selectedDistrict}
        onSelectDistrict={setSelectedDistrict}
        selectedSubdivision={selectedSubdivision}
        onSelectSubdivision={setSelectedSubdivision}
        onOpenHierarchyModal={() => setIsJurisdictionModalOpen(true)}
      />

      {/* Main Body Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Tab 1: Dashboard Stats */}
        {activeTab === 'dashboard' && (
          <DashboardStats
            cases={cases.filter(isRecordInJurisdictionScope)}
            allMasterCases={cases}
            landDisputes={landDisputes.filter(isRecordInJurisdictionScope)}
            ios={ios}
            dailyReports={dailyReports}
            currentRole={currentRole}
            currentUserAccount={currentUserAccount}
            districts={districts}
            subdivisions={subdivisions}
            availablePoliceStations={policeStations}
            selectedDistrict={selectedDistrict}
            selectedSubdivision={selectedSubdivision}
            onSelectDistrict={setSelectedDistrict}
            onSelectSubdivision={setSelectedSubdivision}
            onSelectFilterPS={(ps) => {
              setFilters((prev) => ({ ...prev, policeStations: ps === 'ALL' ? [] : [ps] }));
              setActiveTab('firs');
            }}
            onTabChange={setActiveTab}
            onApplyFilter={handleApplyFilter}
            onViewCase={(c) => setViewingCase(c)}
            onUpdateCasesList={setCases}
          />
        )}

        {/* Tab 2: FIR & Case Register */}
        {activeTab === 'firs' && (
          <div className="space-y-4">
            <FIRFilterBar
              filters={filters}
              onFilterChange={setFilters}
              onResetFilters={() => setFilters(DEFAULT_FILTERS)}
              investigatingOfficers={ios}
              hidePSFilter={!isAdministrator && !isDistrictLevel && currentRole !== 'SDPO'}
              activePS={activePS}
              availablePoliceStations={policeStations}
              filteredCases={visibleCases}
              districts={districts}
              subdivisions={subdivisions}
              currentRole={currentRole}
              currentUserAccount={currentUserAccount}
              selectedDistrict={selectedDistrict}
              selectedSubdivision={selectedSubdivision}
              onSelectDistrict={setSelectedDistrict}
              onSelectSubdivision={setSelectedSubdivision}
            />

            <FIRTable
              cases={visibleCases}
              currentRole={currentRole}
              onViewCase={(c) => setViewingCase(c)}
              onEditCase={(c) => setEditingCase(c)}
              onDeleteCase={handleDeleteFIR}
              onDesignateCase={handleDesignateCase}
              onOpenQRCode={handleOpenQRCode}
              isReadOnly={isReadOnly}
            />
          </div>
        )}

        {/* Tab 3: 60/90 Days Deadline Monitor */}
        {activeTab === 'deadlines' && (
          <DeadlineMonitor
            cases={cases.filter(isRecordInUserBaseScope)}
            onViewCase={(c) => setViewingCase(c)}
            onEditCase={(c) => setEditingCase(c)}
            isReadOnly={isReadOnly}
            availablePoliceStations={policeStations}
            districts={districts}
            subdivisions={subdivisions}
            currentRole={currentRole}
            currentUserAccount={currentUserAccount}
          />
        )}

        {/* Tab 4: Land Dispute Register */}
        {activeTab === 'land_disputes' && (
          <LandDisputeSection
            landDisputes={landDisputes.filter(isRecordInJurisdictionScope)}
            currentRole={currentRole}
            onAddLandDispute={handleAddLandDispute}
            onUpdateLandDisputeStatus={handleUpdateLandDisputeStatus}
            onDeleteLandDispute={handleDeleteLandDispute}
            isNewModalOpen={isNewLandDisputeModalOpen}
            setIsNewModalOpen={setIsNewLandDisputeModalOpen}
            isReadOnly={isReadOnly}
            availablePoliceStations={policeStations}
          />
        )}

        {/* Tab 5: UD & NON-SR Desk */}
        {activeTab === 'ud_cases' && (
          <UDCaseSection
            udCases={udCases.filter(isRecordInUserBaseScope)}
            nonSrCases={cases.filter(isRecordInUserBaseScope).filter((c) => c.designation === 'NON_SR')}
            currentRole={currentRole}
            onAddUDCase={handleAddUDCase}
            onUpdateUDCase={handleUpdateUDCase}
            onDeleteUDCase={handleDeleteUDCase}
            onViewFIR={(c) => setViewingCase(c)}
            onEditFIR={(c) => setEditingCase(c)}
            isReadOnly={isReadOnly}
            availablePoliceStations={policeStations}
            districts={districts}
            subdivisions={subdivisions}
            currentUserAccount={currentUserAccount}
          />
        )}

        {/* Supervision Status Tab (Super User: SP / SDPO / Administrator / CI) */}
        {activeTab === 'supervision' && (currentRole === 'SDPO' || isDistrictLevel || isAdministrator || currentRole === 'CI') && (
          <SupervisionStatusSection
            cases={cases.filter(isRecordInUserBaseScope)}
            onEditCase={(c) => setEditingCase(c)}
            onViewCase={(c) => setViewingCase(c)}
            onDeleteSupervisionNote={handleDeleteSupervisionNote}
            onDeleteCase={handleDeleteFIR}
            onOpenQRCode={handleOpenQRCode}
            currentRole={currentRole}
            isReadOnly={isReadOnly}
            availablePoliceStations={policeStations}
            districts={districts}
            subdivisions={subdivisions}
            currentUserAccount={currentUserAccount}
          />
        )}

        {/* Case Review & Reporting Section */}
        {activeTab === 'case_review' && (
          <CaseReviewSection
            cases={cases.filter(isRecordInUserBaseScope)}
            ios={ios}
            onEditCase={(c) => setEditingCase(c)}
            onViewCase={(c) => setViewingCase(c)}
            onDeleteCase={handleDeleteFIR}
            onOpenQRCode={handleOpenQRCode}
            currentRole={currentRole}
            isReadOnly={isReadOnly}
            availablePoliceStations={policeStations}
            districts={districts}
            subdivisions={subdivisions}
            currentUserAccount={currentUserAccount}
          />
        )}

        {/* Tab 6: IO List & Allocation */}
        {activeTab === 'ios' && (
          <IOManagement
            ios={ios.filter(isRecordInUserBaseScope)}
            cases={cases.filter(isRecordInUserBaseScope)}
            leaveLedger={leaveLedger}
            dailyReports={dailyReports.filter(isRecordInUserBaseScope)}
            onAddIO={handleAddIO}
            onUpdateIO={handleUpdateIO}
            onDeleteIO={handleDeleteIO}
            onUpdateLeaveStatus={handleUpdateLeaveStatus}
            onAddLeaveEntry={handleAddLeaveEntry}
            onDeleteLeaveEntry={handleDeleteLeaveEntry}
            onUpdateLeaveEntry={handleUpdateLeaveEntry}
            currentRole={currentRole}
            availablePoliceStations={policeStations}
            districts={districts}
            subdivisions={subdivisions}
            currentUserAccount={currentUserAccount}
            onSelectIOCasesFilter={(ioName) => {
              setFilters((prev) => ({ ...prev, ioNames: [ioName] }));
              setActiveTab('firs');
            }}
            isReadOnly={isReadOnly}
          />
        )}

        {/* Tab 7: Daily PS Crime Reports */}
        {activeTab === 'daily_reports' && (
          <DailyCrimeReportSection
            reports={dailyReports.filter(isRecordInJurisdictionScope)}
            cases={cases.filter(isRecordInJurisdictionScope)}
            ios={ios.filter(isRecordInJurisdictionScope)}
            userAccounts={userAccounts}
            currentUserAccount={currentUserAccount}
            currentRole={currentRole}
            onAddReport={handleAddDailyReport}
            onDeleteReport={handleDeleteDailyReport}
            isReadOnly={isReadOnly}
            canSubmitReport={!isViewer}
            messages={messages}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            onMarkMessageAsRead={handleMarkMessageAsRead}
            monthlyArrestOverrides={monthlyArrestOverrides}
            onUpdateMonthlyArrestOverride={handleUpdateMonthlyArrestOverride}
            leaveLedger={leaveLedger}
            onUpdateLeaveStatus={handleUpdateLeaveStatus}
            onAddLeaveEntry={handleAddLeaveEntry}
            onDeleteLeaveEntry={handleDeleteLeaveEntry}
            availablePoliceStations={policeStations}
            districts={districts}
            subdivisions={subdivisions}
          />
        )}

        {/* Tab 8: Embedded AI Assistant */}
        {activeTab === 'ai_assistant' && (
          <AIChatbot
            cases={cases.filter(isRecordInJurisdictionScope)}
            landDisputes={landDisputes.filter(isRecordInJurisdictionScope)}
            udCases={udCases.filter(isRecordInJurisdictionScope)}
            ios={ios.filter(isRecordInJurisdictionScope)}
            dailyReports={dailyReports.filter(isRecordInJurisdictionScope)}
            currentRole={currentRole}
            activePS={activePS}
            onViewCase={(c) => setViewingCase(c)}
            isEmbeddedTab={true}
          />
        )}

      </main>

      {/* Floating AI Chatbot Widget (active on other tabs) */}
      {activeTab !== 'ai_assistant' && (
        <AIChatbot
          cases={cases.filter(isRecordInJurisdictionScope)}
          landDisputes={landDisputes.filter(isRecordInJurisdictionScope)}
          udCases={udCases.filter(isRecordInJurisdictionScope)}
          ios={ios.filter(isRecordInJurisdictionScope)}
          dailyReports={dailyReports.filter(isRecordInJurisdictionScope)}
          currentRole={currentRole}
          activePS={activePS}
          onViewCase={(c) => setViewingCase(c)}
          isEmbeddedTab={false}
        />
      )}

      {/* Modals */}
      <NewFIREntryModal
        isOpen={isNewFIRModalOpen}
        onClose={() => setIsNewFIRModalOpen(false)}
        onSubmit={handleCreateFIR}
        currentRole={currentRole}
        currentUserAccount={currentUserAccount}
        investigatingOfficers={ios}
        districts={districts}
        subdivisions={subdivisions}
        policeStations={policeStations}
        availablePoliceStations={policeStations}
      />

      <EditFIRModal
        caseItem={editingCase}
        isOpen={Boolean(editingCase)}
        onClose={() => setEditingCase(null)}
        onUpdate={handleUpdateFIR}
        onDeleteSupervisionNote={handleDeleteSupervisionNote}
        onDeleteCase={handleDeleteFIR}
        currentRole={currentRole}
        currentUserAccount={currentUserAccount}
        investigatingOfficers={ios}
        districts={districts}
        subdivisions={subdivisions}
        policeStations={policeStations}
        availablePoliceStations={policeStations}
        isSupervisionMode={activeTab === 'supervision'}
        isReadOnly={isReadOnly}
      />

      <ViewCaseModal
        caseItem={viewingCase}
        isOpen={Boolean(viewingCase)}
        onClose={() => setViewingCase(null)}
        onEdit={(c) => setEditingCase(c)}
        onDeleteCase={handleDeleteFIR}
        onOpenQRCode={handleOpenQRCode}
        isReadOnly={isReadOnly}
      />

      <CaseQRCodeModal
        caseItem={qrModalCase}
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onOpenVerificationView={(cId) => {
          setIsQrModalOpen(false);
          setActiveVerificationCaseId(cId);
        }}
      />

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        accounts={userAccounts}
        currentUserAccount={currentUserAccount}
        districts={districts}
        subdivisions={subdivisions}
        policeStations={policeStations}
        onUpdateAccount={handleUpdateUserAccount}
        onAddAccount={handleAddUserAccount}
        onDeleteAccount={handleDeleteUserAccount}
        onResetToDefaults={handleResetUserAccountsToDefaults}
      />

      <JurisdictionManagementModal
        isOpen={isJurisdictionModalOpen}
        onClose={() => setIsJurisdictionModalOpen(false)}
        districts={districts}
        subdivisions={subdivisions}
        policeStations={policeStations}
        currentUserAccount={currentUserAccount}
        onAddDistrict={(d) => {
          setDistricts((prev) => [...prev, d]);
          savePoliceDistrictToSupabase(d);
        }}
        onUpdateDistrict={(d) => {
          setDistricts((prev) => prev.map((item) => (item.id === d.id ? d : item)));
          savePoliceDistrictToSupabase(d);
        }}
        onDeleteDistrict={(id) => {
          setDistricts((prev) => prev.filter((d) => d.id !== id));
          deletePoliceDistrictFromSupabase(id);
        }}
        onAddSubdivision={(s) => {
          setSubdivisions((prev) => [...prev, s]);
          savePoliceSubdivisionToSupabase(s);
        }}
        onUpdateSubdivision={(s) => {
          setSubdivisions((prev) => prev.map((item) => (item.id === s.id ? s : item)));
          savePoliceSubdivisionToSupabase(s);
        }}
        onDeleteSubdivision={(id) => {
          setSubdivisions((prev) => prev.filter((s) => s.id !== id));
          deletePoliceSubdivisionFromSupabase(id);
        }}
        onAddPoliceStation={(ps) => {
          setPoliceStations((prev) => [...prev, ps]);
          savePoliceStationToSupabase(ps);
        }}
        onUpdatePoliceStation={(ps) => {
          setPoliceStations((prev) => prev.map((item) => (item.id === ps.id ? ps : item)));
          savePoliceStationToSupabase(ps);
        }}
        onDeletePoliceStation={(id) => {
          setPoliceStations((prev) => prev.filter((p) => p.id !== id));
          deletePoliceStationFromSupabase(id);
        }}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseConfigOpen}
        onClose={() => setIsSupabaseConfigOpen(false)}
        onRefreshAllData={handleRefreshAllFromSupabase}
        localData={{
          userAccounts,
          cases,
          ios,
          leaveLedger,
          landDisputes,
          udCases,
          dailyReports,
          messages,
          districts,
          subdivisions,
          policeStations,
        }}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
          <p className="font-semibold text-slate-300">
            Bihar Police Crime Supervision & CCTNS Progress Management Portal
          </p>
          <p className="text-slate-500 text-[11px]">
            District Level • Subdivisional Desks • Police Station Management • High Command Monitoring
          </p>
        </div>
      </footer>

    </div>
  ); 
}
