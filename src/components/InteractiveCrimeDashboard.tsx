import React, { useState, useMemo, useEffect } from 'react';
import {
  FIRCase,
  PoliceStationName,
  UserRole,
  FilterOptions,
  PoliceStation,
  PoliceSubdivision,
  PoliceDistrict,
  UserAccount,
  CrimeHead,
  InvestigatingOfficer,
  DailyCrimeReport,
} from '../types';
import {
  CRIME_HEADS_CONFIG,
  ALL_CRIME_HEADS,
  MAJOR_CRIME_HEADS,
  classifyCrimeHead,
  classifyAllCrimeHeads,
  getCaseCrimeHeads,
  autoSortAllCasesCrimeHeads,
  getDynamicCrimeHeadsConfig,
  saveCustomStatutoryConfig,
  upsertStatutoryEntry,
  deleteStatutoryEntry,
  resetStatutoryConfigToDefault,
  CrimeHeadMeta,
  StatutoryCategory,
} from '../utils/crimeClassifier';
import {
  getDeadlineInfo,
  getPSFromRole,
  formatReadableDate,
} from '../utils/helpers';
import {
  BarChart3,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  Clock,
  Building2,
  Users,
  Eye,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  ArrowUpRight,
  Search,
  Zap,
  Scale,
  X,
  Layers,
  Activity,
  Building,
  MapPin,
  Flame,
  Check,
  Edit3,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  SlidersHorizontal,
  BookOpen,
  Download,
  Info,
} from 'lucide-react';
import { exportToExcel } from '../utils/reportExport';
import { CustomReportGenerator } from './CustomReportGenerator';

interface InteractiveCrimeDashboardProps {
  cases: FIRCase[];
  allMasterCases?: FIRCase[];
  ios: InvestigatingOfficer[];
  dailyReports: DailyCrimeReport[];
  currentRole: UserRole;
  currentUserAccount?: UserAccount | null;
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  availablePoliceStations?: PoliceStation[];
  selectedDistrict?: string;
  selectedSubdivision?: string;
  onSelectDistrict?: (dist: string) => void;
  onSelectSubdivision?: (sub: string) => void;
  onApplyFilter: (filters: Partial<FilterOptions>) => void;
  onTabChange: (tab: string) => void;
  onViewCase: (c: FIRCase) => void;
  onUpdateCasesList?: (updatedCases: FIRCase[]) => void;
}

type TimeRangeFilter = 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'LAST_3_MONTHS' | 'YEAR_2026' | 'YEAR_2025' | 'YEAR_2024' | 'CUSTOM';
type ActiveViewTab = 'CRIME_HEADS' | 'DISTRICT_COMPARISON' | 'SUBDIV_COMPARISON' | 'PS_COMPARISON' | 'IO_PERFORMANCE' | 'STATUTORY_MATRIX' | 'GENERATE_REPORT' | 'STATION_ANALYSIS';

export const InteractiveCrimeDashboard: React.FC<InteractiveCrimeDashboardProps> = ({
  cases,
  allMasterCases,
  ios,
  dailyReports,
  currentRole,
  currentUserAccount,
  districts = [],
  subdivisions = [],
  availablePoliceStations = [],
  selectedDistrict = 'ALL',
  selectedSubdivision = 'ALL',
  onSelectDistrict,
  onSelectSubdivision,
  onApplyFilter,
  onTabChange,
  onViewCase,
  onUpdateCasesList,
}) => {
  // Use master cases pool if available, otherwise cases
  const masterCases = allMasterCases && allMasterCases.length > 0 ? allMasterCases : cases;

  // Role Level Detection
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

  const activeRolePS = getPSFromRole(currentRole) || (
    !isAdministrator && !isDistrictLevel && !isSubdivisionLevel && currentUserAccount?.policeStation &&
    currentUserAccount.policeStation !== 'District HQ' && currentUserAccount.policeStation !== 'Subdivision HQ'
      ? currentUserAccount.policeStation
      : null
  );

  const isPSLevel = Boolean(activeRolePS);

  const userDistrict = currentUserAccount?.district || 'Munger';
  const userSubdivision = currentUserAccount?.subdivision || 'Tarapur';

  // Available Police Stations scoped by current jurisdiction
  const scopedPoliceStations = useMemo(() => {
    if (isPSLevel && activeRolePS) {
      return availablePoliceStations.filter(
        (ps) => ps.name.toLowerCase() === activeRolePS.toLowerCase()
      );
    }
    if (isSubdivisionLevel) {
      return availablePoliceStations.filter(
        (ps) => ps.subdivisionName.toLowerCase() === userSubdivision.toLowerCase()
      );
    }
    if (isDistrictLevel) {
      let filtered = availablePoliceStations.filter(
        (ps) => ps.districtName.toLowerCase() === userDistrict.toLowerCase()
      );
      if (selectedSubdivision && selectedSubdivision !== 'ALL') {
        filtered = filtered.filter((ps) => ps.subdivisionName.toLowerCase() === selectedSubdivision.toLowerCase());
      }
      return filtered;
    }
    if (isAdministrator) {
      let filtered = availablePoliceStations;
      if (selectedDistrict && selectedDistrict !== 'ALL') {
        filtered = filtered.filter((ps) => ps.districtName.toLowerCase() === selectedDistrict.toLowerCase());
      }
      if (selectedSubdivision && selectedSubdivision !== 'ALL') {
        filtered = filtered.filter((ps) => ps.subdivisionName.toLowerCase() === selectedSubdivision.toLowerCase());
      }
      return filtered;
    }
    return availablePoliceStations;
  }, [availablePoliceStations, isPSLevel, activeRolePS, isSubdivisionLevel, userSubdivision, isDistrictLevel, userDistrict, selectedSubdivision, isAdministrator, selectedDistrict]);

  const scopedSubdivisions = useMemo(() => {
    if (isSubdivisionLevel) {
      return subdivisions.filter((s) => s.name.toLowerCase() === userSubdivision.toLowerCase());
    }
    if (isDistrictLevel) {
      return subdivisions.filter((s) => s.districtName.toLowerCase() === userDistrict.toLowerCase());
    }
    if (isAdministrator) {
      if (selectedDistrict && selectedDistrict !== 'ALL') {
        return subdivisions.filter((s) => s.districtName.toLowerCase() === selectedDistrict.toLowerCase());
      }
      return subdivisions;
    }
    return subdivisions;
  }, [subdivisions, isSubdivisionLevel, userSubdivision, isDistrictLevel, userDistrict, isAdministrator, selectedDistrict]);

  // PS Names list for selectors
  const psNamesList: PoliceStationName[] = useMemo(() => {
    if (scopedPoliceStations.length > 0) {
      return scopedPoliceStations.map((p) => p.name);
    }
    return ['Tarapur', 'Asarganj', 'Sangrampur', 'Harpur'];
  }, [scopedPoliceStations]);

  // Set default active tab based on role
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('CRIME_HEADS');

  // Filter States
  const [selectedPS, setSelectedPS] = useState<PoliceStationName | 'ALL'>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Dynamic Statutory Reference Matrix State
  const [statutoryConfig, setStatutoryConfig] = useState<Record<string, CrimeHeadMeta>>(() => getDynamicCrimeHeadsConfig());
  const [statutorySearchQuery, setStatutorySearchQuery] = useState('');
  const [statutoryCategoryFilter, setStatutoryCategoryFilter] = useState<string>('ALL');
  const [statutorySortField, setStatutorySortField] = useState<'name' | 'category' | 'bns' | 'ipc' | 'remand' | 'forensic' | 'cases'>('name');
  const [statutorySortAsc, setStatutorySortAsc] = useState<boolean>(true);
  const [editingEntry, setEditingEntry] = useState<CrimeHeadMeta | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [statutorySuccessMessage, setStatutorySuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleStatutoryUpdate = () => {
      setStatutoryConfig(getDynamicCrimeHeadsConfig());
    };
    window.addEventListener('sdpo-statutory-matrix-updated', handleStatutoryUpdate);
    return () => window.removeEventListener('sdpo-statutory-matrix-updated', handleStatutoryUpdate);
  }, []);

  // AI Classification state
  const [isClassifyingAI, setIsClassifyingAI] = useState(false);
  const [aiClassificationSuccessMsg, setAiClassificationSuccessMsg] = useState<string | null>(null);

  // Drilldown Modal State
  const [drilldownTitle, setDrilldownTitle] = useState<string | null>(null);
  const [drilldownCases, setDrilldownCases] = useState<FIRCase[] | null>(null);

  // Auto ensure crime heads using dynamic statutory config
  const enrichedCases = useMemo(() => {
    return cases.map((c) => {
      return { ...c, crimeHead: classifyCrimeHead(c, statutoryConfig) };
    });
  }, [cases, statutoryConfig]);

  const enrichedMasterCases = useMemo(() => {
    return masterCases.map((c) => {
      return { ...c, crimeHead: classifyCrimeHead(c, statutoryConfig) };
    });
  }, [masterCases, statutoryConfig]);

  // Filtered cases for the primary view
  const filteredCases = useMemo(() => {
    return enrichedCases.filter((c) => {
      // Station level lock
      if (activeRolePS && c.ps.toLowerCase() !== activeRolePS.toLowerCase()) {
        return false;
      }

      // PS filter in UI
      if (selectedPS !== 'ALL' && c.ps.toLowerCase() !== selectedPS.toLowerCase()) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.firNumber.toLowerCase().includes(q) ||
          c.sections.toLowerCase().includes(q) ||
          c.ioName.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q) ||
          c.ps.toLowerCase().includes(q) ||
          (c.crimeHead && c.crimeHead.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Time Range Filter
      if (!c.firDate) return true;
      const caseDate = new Date(c.firDate);
      const now = new Date();

      if (timeRange === 'THIS_MONTH') {
        return caseDate.getMonth() === now.getMonth() && caseDate.getFullYear() === now.getFullYear();
      } else if (timeRange === 'LAST_30_DAYS') {
        const past30 = new Date();
        past30.setDate(now.getDate() - 30);
        return caseDate >= past30 && caseDate <= now;
      } else if (timeRange === 'LAST_3_MONTHS') {
        const past90 = new Date();
        past90.setDate(now.getDate() - 90);
        return caseDate >= past90 && caseDate <= now;
      } else if (timeRange === 'YEAR_2026') {
        return caseDate.getFullYear() === 2026;
      } else if (timeRange === 'YEAR_2025') {
        return caseDate.getFullYear() === 2025;
      } else if (timeRange === 'YEAR_2024') {
        return caseDate.getFullYear() === 2024;
      } else if (timeRange === 'CUSTOM') {
        if (customStartDate && c.firDate < customStartDate) return false;
        if (customEndDate && c.firDate > customEndDate) return false;
      }

      return true;
    });
  }, [enrichedCases, activeRolePS, selectedPS, searchQuery, timeRange, customStartDate, customEndDate]);

  // Overall Statistics for Filtered Scope
  const totalFilteredCount = filteredCases.length;
  const pendingCount = filteredCases.filter((c) => c.status === 'Under Investigation').length;
  const disposedCount = filteredCases.filter(
    (c) =>
      c.status === 'Chargesheeted / Final Form Submitted' ||
      c.status === 'Disposed' ||
      c.status === 'Chargesheeted / Final Form Submitted / Mistake of Fact'
  ).length;
  const overdueCount = filteredCases.filter((c) => getDeadlineInfo(c).code === 'OVERDUE').length;

  // Active Statutory Keys
  const activeAllCrimeHeads = useMemo(() => {
    return Object.keys(statutoryConfig);
  }, [statutoryConfig]);

  // Compute Crime Head Counts & Breakdown (Multi-Crime Head support: a case can count in multiple heads)
  const crimeHeadStats = useMemo(() => {
    const stats: Record<
      string,
      {
        total: number;
        pending: number;
        disposed: number;
        overdue: number;
        percentage: number;
        cases: FIRCase[];
      }
    > = {};

    activeAllCrimeHeads.forEach((h) => {
      stats[h] = { total: 0, pending: 0, disposed: 0, overdue: 0, percentage: 0, cases: [] };
    });

    filteredCases.forEach((c) => {
      const caseHeads = getCaseCrimeHeads(c, statutoryConfig);
      caseHeads.forEach((head) => {
        if (!stats[head]) {
          stats[head] = { total: 0, pending: 0, disposed: 0, overdue: 0, percentage: 0, cases: [] };
        }
        stats[head].total++;
        stats[head].cases.push(c);

        if (c.status === 'Under Investigation') {
          stats[head].pending++;
        } else if (
          c.status === 'Chargesheeted / Final Form Submitted' ||
          c.status === 'Disposed' ||
          c.status === 'Chargesheeted / Final Form Submitted / Mistake of Fact'
        ) {
          stats[head].disposed++;
        }

        const deadline = getDeadlineInfo(c);
        if (deadline.code === 'OVERDUE') {
          stats[head].overdue++;
        }
      });
    });

    activeAllCrimeHeads.forEach((h) => {
      if (stats[h]) {
        stats[h].percentage = totalFilteredCount > 0 ? Math.round((stats[h].total / totalFilteredCount) * 100) : 0;
      }
    });

    return stats;
  }, [filteredCases, totalFilteredCount, activeAllCrimeHeads, statutoryConfig]);

  // Filtered Heads based on category
  const displayedCrimeHeads = useMemo(() => {
    let heads = activeAllCrimeHeads;

    if (selectedCategoryFilter === 'MAJOR_SR') {
      heads = heads.filter((h) => statutoryConfig[h]?.isMajorHead);
    } else if (selectedCategoryFilter === 'PROPERTY') {
      heads = heads.filter((h) => statutoryConfig[h]?.category === 'Property & Economic');
    } else if (selectedCategoryFilter === 'WOMEN_CHILD') {
      heads = heads.filter((h) => statutoryConfig[h]?.category === 'Women & Children');
    } else if (selectedCategoryFilter === 'SLL') {
      heads = heads.filter((h) => statutoryConfig[h]?.category === 'Special & Local Laws (SLL)');
    } else if (selectedCategoryFilter === 'NON_ZERO') {
      heads = heads.filter((h) => (crimeHeadStats[h]?.total || 0) > 0);
    }

    return heads.sort((a, b) => (crimeHeadStats[b]?.total || 0) - (crimeHeadStats[a]?.total || 0));
  }, [selectedCategoryFilter, crimeHeadStats, activeAllCrimeHeads, statutoryConfig]);

  // PS Matrix Data
  const psMatrixData = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    psNamesList.forEach((ps) => {
      matrix[ps] = {};
      activeAllCrimeHeads.forEach((h) => {
        matrix[ps][h] = 0;
      });
    });

    filteredCases.forEach((c) => {
      const caseHeads = getCaseCrimeHeads(c, statutoryConfig);
      const psMatch = psNamesList.find((p) => p.toLowerCase() === c.ps.toLowerCase());
      if (psMatch && matrix[psMatch]) {
        caseHeads.forEach((head) => {
          matrix[psMatch][head] = (matrix[psMatch][head] || 0) + 1;
        });
      }
    });

    return matrix;
  }, [psNamesList, filteredCases, activeAllCrimeHeads, statutoryConfig]);

  // ==========================================
  // COMPARISON ENGINE 1: SUBDIVISION COMPARISON
  // (Available to SP, District Admin, and Administrator)
  // ==========================================
  const subdivisionComparisonData = useMemo(() => {
    // List of subdivisions to compare
    const targetSubdivisions = isAdministrator && (!selectedDistrict || selectedDistrict === 'ALL')
      ? subdivisions
      : isDistrictLevel
      ? subdivisions.filter((s) => s.districtName.toLowerCase() === userDistrict.toLowerCase())
      : subdivisions.filter((s) => selectedDistrict === 'ALL' || s.districtName.toLowerCase() === selectedDistrict.toLowerCase());

    return targetSubdivisions.map((sub) => {
      // Find all cases belonging to this subdivision
      const subCases = enrichedMasterCases.filter((c) => {
        if (c.subdivision) {
          return c.subdivision.toLowerCase() === sub.name.toLowerCase();
        }
        // Fallback match by PS in this subdivision
        const psInSub = availablePoliceStations.filter((p) => p.subdivisionName.toLowerCase() === sub.name.toLowerCase());
        return psInSub.some((p) => p.name.toLowerCase() === c.ps.toLowerCase());
      });

      const total = subCases.length;
      const pending = subCases.filter((c) => c.status === 'Under Investigation').length;
      const disposed = subCases.filter(
        (c) =>
          c.status === 'Chargesheeted / Final Form Submitted' ||
          c.status === 'Disposed' ||
          c.status === 'Chargesheeted / Final Form Submitted / Mistake of Fact'
      ).length;

      const overdue = subCases.filter((c) => getDeadlineInfo(c).code === 'OVERDUE').length;
      const srCases = subCases.filter((c) => c.designation === 'SR').length;
      const nonSrCases = subCases.filter((c) => c.designation === 'NON_SR').length;
      const csCCTNSCount = subCases.filter((c) => c.chargesheetUploadedCCTNS).length;
      const cdCCTNSCount = subCases.filter((c) => c.caseDiaryUploadedCCTNS).length;

      const disposalRate = total > 0 ? Math.round((disposed / total) * 100) : 0;
      const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;
      const cctnsSyncRate = disposed > 0 ? Math.round((csCCTNSCount / disposed) * 100) : 0;

      const psList = availablePoliceStations.filter((p) => p.subdivisionName.toLowerCase() === sub.name.toLowerCase());

      return {
        id: sub.id,
        name: sub.name,
        districtName: sub.districtName,
        headquarters: sub.headquarters || `${sub.name} HQ`,
        sdpoOfficerName: sub.sdpoOfficerName || 'SDPO',
        policeStationCount: psList.length,
        policeStations: psList.map((p) => p.name),
        totalCases: total,
        pendingCases: pending,
        disposedCases: disposed,
        overdueCases: overdue,
        srCases,
        nonSrCases,
        disposalRate,
        overdueRate,
        cctnsSyncRate,
        cases: subCases,
      };
    }).sort((a, b) => b.disposalRate - a.disposalRate || b.totalCases - a.totalCases);
  }, [subdivisions, isAdministrator, selectedDistrict, isDistrictLevel, userDistrict, enrichedMasterCases, availablePoliceStations]);

  // ==========================================
  // COMPARISON ENGINE 2: DISTRICT COMPARISON
  // (Available to Administrator)
  // ==========================================
  const districtComparisonData = useMemo(() => {
    return districts.map((dist) => {
      const distCases = enrichedMasterCases.filter((c) => {
        if (c.district) {
          return c.district.toLowerCase() === dist.name.toLowerCase();
        }
        return true;
      });

      const total = distCases.length;
      const pending = distCases.filter((c) => c.status === 'Under Investigation').length;
      const disposed = distCases.filter(
        (c) =>
          c.status === 'Chargesheeted / Final Form Submitted' ||
          c.status === 'Disposed' ||
          c.status === 'Chargesheeted / Final Form Submitted / Mistake of Fact'
      ).length;

      const overdue = distCases.filter((c) => getDeadlineInfo(c).code === 'OVERDUE').length;
      const srCases = distCases.filter((c) => c.designation === 'SR').length;
      const csCCTNSCount = distCases.filter((c) => c.chargesheetUploadedCCTNS).length;

      const disposalRate = total > 0 ? Math.round((disposed / total) * 100) : 0;
      const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;
      const cctnsSyncRate = disposed > 0 ? Math.round((csCCTNSCount / disposed) * 100) : 0;

      const subList = subdivisions.filter((s) => s.districtName.toLowerCase() === dist.name.toLowerCase());
      const psList = availablePoliceStations.filter((p) => p.districtName.toLowerCase() === dist.name.toLowerCase());

      return {
        id: dist.id,
        name: dist.name,
        state: dist.state || 'Bihar',
        hqName: dist.hqName || `${dist.name} District Police HQ`,
        subdivisionCount: subList.length,
        policeStationCount: psList.length,
        totalCases: total,
        pendingCases: pending,
        disposedCases: disposed,
        overdueCases: overdue,
        srCases,
        disposalRate,
        overdueRate,
        cctnsSyncRate,
        cases: distCases,
      };
    }).sort((a, b) => b.disposalRate - a.disposalRate || b.totalCases - a.totalCases);
  }, [districts, enrichedMasterCases, subdivisions, availablePoliceStations]);

  // ==========================================
  // COMPARISON ENGINE 3: PS-WISE COMPARISON & RANKING
  // ==========================================
  const psPerformanceRanking = useMemo(() => {
    return psNamesList.map((psName) => {
      const psCases = filteredCases.filter((c) => c.ps.toLowerCase() === psName.toLowerCase());
      const total = psCases.length;
      const pending = psCases.filter((c) => c.status === 'Under Investigation').length;
      const disposed = psCases.filter(
        (c) =>
          c.status === 'Chargesheeted / Final Form Submitted' ||
          c.status === 'Disposed' ||
          c.status === 'Chargesheeted / Final Form Submitted / Mistake of Fact'
      ).length;
      const overdue = psCases.filter((c) => getDeadlineInfo(c).code === 'OVERDUE').length;
      const srCases = psCases.filter((c) => c.designation === 'SR').length;
      const disposalRate = total > 0 ? Math.round((disposed / total) * 100) : 0;
      const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;

      const psMeta = availablePoliceStations.find((p) => p.name.toLowerCase() === psName.toLowerCase());

      return {
        psName,
        subdivisionName: psMeta?.subdivisionName || 'Tarapur',
        shoName: psMeta?.shoName || 'SHO Incharge',
        totalCases: total,
        pendingCases: pending,
        disposedCases: disposed,
        overdueCases: overdue,
        srCases,
        disposalRate,
        overdueRate,
        cases: psCases,
      };
    }).sort((a, b) => b.disposalRate - a.disposalRate || b.totalCases - a.totalCases);
  }, [psNamesList, filteredCases, availablePoliceStations]);

  // ==========================================
  // IO Performance, Field Duty & Gasti Analytics
  // ==========================================
  const ioPerformanceData = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        rank: string;
        ps: string;
        subdivision?: string;
        totalCases: number;
        pendingCases: number;
        disposedCases: number;
        overdueCases: number;
        disposalRate: number;
        odCount: number;
        gastiCount: number;
        cases: FIRCase[];
      }
    > = {};

    // Seed with registered IOs in current scope
    ios.forEach((io) => {
      if (isPSLevel && activeRolePS && io.ps.toLowerCase() !== activeRolePS.toLowerCase()) return;
      if (isSubdivisionLevel && io.subdivision && io.subdivision.toLowerCase() !== userSubdivision.toLowerCase()) return;
      if (selectedPS !== 'ALL' && io.ps.toLowerCase() !== selectedPS.toLowerCase()) return;

      map[io.name] = {
        name: io.name,
        rank: io.rank || 'Investigating Officer',
        ps: io.ps,
        subdivision: io.subdivision,
        totalCases: 0,
        pendingCases: 0,
        disposedCases: 0,
        overdueCases: 0,
        disposalRate: 0,
        odCount: 0,
        gastiCount: 0,
        cases: [],
      };
    });

    // Match FIRs
    filteredCases.forEach((c) => {
      if (!c.ioName || c.ioName === 'Pending Assignment' || c.ioName === 'Unassigned') return;
      if (!map[c.ioName]) {
        map[c.ioName] = {
          name: c.ioName,
          rank: 'Investigating Officer',
          ps: c.ps,
          subdivision: c.subdivision,
          totalCases: 0,
          pendingCases: 0,
          disposedCases: 0,
          overdueCases: 0,
          disposalRate: 0,
          odCount: 0,
          gastiCount: 0,
          cases: [],
        };
      }

      map[c.ioName].totalCases++;
      map[c.ioName].cases.push(c);

      if (c.status === 'Under Investigation') {
        map[c.ioName].pendingCases++;
      } else if (
        c.status === 'Chargesheeted / Final Form Submitted' ||
        c.status === 'Disposed' ||
        c.status === 'Chargesheeted / Final Form Submitted / Mistake of Fact'
      ) {
        map[c.ioName].disposedCases++;
      }

      const deadline = getDeadlineInfo(c);
      if (deadline.code === 'OVERDUE') {
        map[c.ioName].overdueCases++;
      }
    });

    // Match Daily Reports (OD & Gasti Duty)
    dailyReports.forEach((report) => {
      if (isPSLevel && activeRolePS && report.ps.toLowerCase() !== activeRolePS.toLowerCase()) return;
      if (selectedPS !== 'ALL' && report.ps.toLowerCase() !== selectedPS.toLowerCase()) return;

      if (report.odDetails) {
        const odNames = [
          report.odDetails.od1IoName,
          report.odDetails.od2IoName,
          report.odDetails.od3IoName,
          ...(report.odDetails.odShifts || []).map((s) => s.ioName),
        ].filter(Boolean) as string[];

        odNames.forEach((name) => {
          if (map[name]) {
            map[name].odCount++;
          }
        });
      }

      if (report.gastiDetails) {
        const gastiNames = [
          report.gastiDetails.morningGastiIoName,
          report.gastiDetails.dayGastiIoName,
          report.gastiDetails.nightGastiIoName,
          ...(report.gastiDetails.gastiShifts || []).map((s) => s.ioName),
        ].filter(Boolean) as string[];

        gastiNames.forEach((name) => {
          if (map[name]) {
            map[name].gastiCount++;
          }
        });
      }
    });

    // Calculate rates
    Object.values(map).forEach((item) => {
      item.disposalRate = item.totalCases > 0 ? Math.round((item.disposedCases / item.totalCases) * 100) : 0;
    });

    return Object.values(map).sort((a, b) => b.disposalRate - a.disposalRate || b.totalCases - a.totalCases);
  }, [ios, filteredCases, dailyReports, isPSLevel, activeRolePS, isSubdivisionLevel, userSubdivision, selectedPS]);

  // AI Classification Trigger
  const handleRunAIAutoClassification = async () => {
    setIsClassifyingAI(true);
    setAiClassificationSuccessMsg(null);
    try {
      const { updatedCases, modifiedCount } = autoSortAllCasesCrimeHeads(cases);
      if (onUpdateCasesList) {
        onUpdateCasesList(updatedCases);
      }
      setAiClassificationSuccessMsg(`✅ Successfully auto-classified ${updatedCases.length} FIR cases across crime heads (${modifiedCount} updated).`);
    } catch (e: any) {
      console.error(e);
      setAiClassificationSuccessMsg('Failed to run AI classification.');
    } finally {
      setIsClassifyingAI(false);
    }
  };

  const handleOpenDrilldown = (title: string, caseList: FIRCase[]) => {
    setDrilldownTitle(title);
    setDrilldownCases(caseList);
  };

  const timePresets: { id: TimeRangeFilter; label: string }[] = [
    { id: 'ALL', label: 'All Time' },
    { id: 'YEAR_2026', label: '2026' },
    { id: 'YEAR_2025', label: '2025' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
    { id: 'LAST_3_MONTHS', label: 'Last 90 Days' },
    { id: 'CUSTOM', label: 'Custom' },
  ];

  return (
    <div className="space-y-6">
      {/* Scope & Role Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-500/30 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10 pointer-events-none">
          <Shield className="w-64 h-64 text-indigo-300" />
        </div>

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            {isAdministrator && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>State Administrator Command View</span>
              </span>
            )}
            {isDistrictLevel && (
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-400" />
                <span>District Police Chief (SP - {userDistrict}) View</span>
              </span>
            )}
            {isSubdivisionLevel && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                <span>SDPO Jurisdiction: {userSubdivision} Subdivision</span>
              </span>
            )}
            {isPSLevel && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Station Portal: {activeRolePS} Police Station</span>
              </span>
            )}

            <span className="text-xs text-slate-300 font-medium">
              {currentUserAccount ? `${currentUserAccount.officerName} (${currentUserAccount.rank})` : currentRole}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>Crime Intelligence & Performance Spectrum</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            {isAdministrator
              ? 'Multi-district command center with full comparative analytics across districts, subdivisions, and police stations.'
              : isDistrictLevel
              ? `Superintendent of Police dashboard with cross-subdivision and inter-station performance rankings across ${userDistrict} district.`
              : isSubdivisionLevel
              ? `Subdivisional Police Officer dashboard with inter-station comparison across ${scopedPoliceStations.map((p) => p.name).join(', ')} police stations.`
              : `Station House Officer portal showing crime head incidence, statutory deadlines, and investigating officer workloads for ${activeRolePS} PS.`}
          </p>
        </div>

        {/* Action Controls & Auto Classifier */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            type="button"
            onClick={handleRunAIAutoClassification}
            disabled={isClassifyingAI}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-900/40 transition flex items-center gap-2 border border-purple-400/30 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isClassifyingAI ? 'animate-spin' : 'text-amber-300'}`} />
            <span>{isClassifyingAI ? 'AI Classifying...' : 'AI Auto-Sort Crime Heads'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onApplyFilter({
                policeStations: selectedPS !== 'ALL' ? [selectedPS] : [],
                startDate: timeRange === 'CUSTOM' ? customStartDate : '',
                endDate: timeRange === 'CUSTOM' ? customEndDate : '',
              });
              onTabChange('firs');
            }}
            className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-blue-400" />
            <span>View Cases ({totalFilteredCount})</span>
          </button>
        </div>

        {/* AI Success Feedback */}
        {aiClassificationSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-between w-full animate-fadeIn z-10">
            <span>{aiClassificationSuccessMsg}</span>
            <button onClick={() => setAiClassificationSuccessMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Interactive Global Filters & Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Main Navigation Tabs based on Role */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
            {/* Tab 1: Crime Head Graphs */}
            <button
              type="button"
              onClick={() => setActiveTab('CRIME_HEADS')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'CRIME_HEADS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Head-Wise Crime Graphs</span>
            </button>

            {/* Tab: District Comparison (Admin only) */}
            {isAdministrator && (
              <button
                type="button"
                onClick={() => setActiveTab('DISTRICT_COMPARISON')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'DISTRICT_COMPARISON'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-500" />
                <span>District Comparison Matrix ({districts.length})</span>
              </button>
            )}

            {/* Tab: Subdivision Comparison (Admin & SP / District Admin) */}
            {(isAdministrator || isDistrictLevel) && (
              <button
                type="button"
                onClick={() => setActiveTab('SUBDIV_COMPARISON')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'SUBDIV_COMPARISON'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building className="w-4 h-4 text-blue-500" />
                <span>Subdivision Comparison Matrix</span>
              </button>
            )}

            {/* Tab: PS Comparison (Admin, SP, SDPO/CI) */}
            {!isPSLevel && (
              <button
                type="button"
                onClick={() => setActiveTab('PS_COMPARISON')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'PS_COMPARISON'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span>PS-Wise Comparison Matrix</span>
              </button>
            )}

            {/* Tab: IO Performance */}
            <button
              type="button"
              onClick={() => setActiveTab('IO_PERFORMANCE')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'IO_PERFORMANCE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-4 h-4 text-amber-500" />
              <span>IO Performance & Duty</span>
            </button>

            {/* Tab: Statutory BNS / IPC / BNSS Mapping Matrix */}
            <button
              type="button"
              onClick={() => setActiveTab('STATUTORY_MATRIX')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'STATUTORY_MATRIX'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scale className="w-4 h-4 text-indigo-500" />
              <span>BNS / BNSS Statutory Reference</span>
            </button>

            {/* Tab: Custom Generate Report & Case Review Linkage */}
            <button
              type="button"
              onClick={() => setActiveTab('GENERATE_REPORT')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'GENERATE_REPORT'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>📄 Generate Report</span>
              <span className="px-1.5 py-0.2 bg-white/20 text-[9px] rounded-full uppercase tracking-widest font-black">
                Pro
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search section, IO, PS, crime..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Row: Jurisdiction Selectors & Time Period */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {/* Station / Jurisdiction Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {isPSLevel ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Station-Locked View: {activeRolePS} PS</span>
              </div>
            ) : (
              <>
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
                  Station:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPS('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    selectedPS === 'ALL'
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All Stations ({psNamesList.length})
                </button>
                {psNamesList.map((ps) => {
                  const isSelected = selectedPS.toLowerCase() === ps.toLowerCase();
                  return (
                    <button
                      key={ps}
                      type="button"
                      onClick={() => setSelectedPS(ps)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {ps} PS
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Time Filter Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
              Time:
            </span>
            {timePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setTimeRange(preset.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  timeRange === preset.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers */}
        {timeRange === 'CUSTOM' && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-xs text-rose-600 font-bold hover:underline ml-2"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HEAD-WISE CRIME SPECTRUM & GRAPHS */}
      {/* ========================================================================= */}
      {activeTab === 'CRIME_HEADS' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'All 30+ Crime Heads' },
              { id: 'MAJOR_SR', label: '🔥 Major Heinous Crimes (SR)' },
              { id: 'PROPERTY', label: '🏠 Property Offences (Theft/Loot)' },
              { id: 'WOMEN_CHILD', label: '🛡️ Women & Child Safety (POCSO/Rape)' },
              { id: 'SLL', label: '⚖️ Special & Local Laws (Arms/NDPS/Mining)' },
              { id: 'NON_ZERO', label: '⚡ Active Cases Only' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Interactive Bars Grid */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span>Crime Distribution Spectrum ({displayedCrimeHeads.length} Heads Displayed)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click on any crime bar to view matching FIR dossiers, IO details, and statutory timelines.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>Scope Total: <strong className="text-indigo-600 dark:text-indigo-400">{totalFilteredCount} FIRs</strong></span>
                <span>•</span>
                <span>Disposed: <strong className="text-emerald-600 dark:text-emerald-400">{disposedCount}</strong></span>
              </div>
            </div>

            <div className="space-y-3">
              {displayedCrimeHeads.map((headId) => {
                const meta = CRIME_HEADS_CONFIG[headId];
                const stat = crimeHeadStats[headId] || { total: 0, pending: 0, disposed: 0, overdue: 0, percentage: 0, cases: [] };
                const maxCount = Math.max(...Object.values(crimeHeadStats).map((s) => s.total), 1);
                const barWidthPercent = Math.max((stat.total / maxCount) * 100, 2);

                return (
                  <div
                    key={headId}
                    onClick={() => handleOpenDrilldown(`${meta.name} Cases (${stat.total})`, stat.cases)}
                    className="p-3 bg-slate-50 dark:bg-slate-950/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 border border-slate-200/80 dark:border-slate-800/80 rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-[240px]">
                        <span className="text-base">{meta.icon}</span>
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {meta.name}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">
                            ({meta.hindiName})
                          </span>
                        </div>
                      </div>

                      {/* Interactive Visual Bar */}
                      <div className="flex-1 mx-0 sm:mx-4">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-4 rounded-full overflow-hidden flex">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${barWidthPercent}%`,
                              backgroundColor: meta.color.chartColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Quantitative Stats */}
                      <div className="flex items-center gap-2.5 justify-end text-[11px] font-bold flex-wrap">
                        <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                          <span>{meta.remandTrack.includes('•') ? meta.remandTrack.split('•')[1]?.trim() || meta.remandTrack : meta.remandTrack}</span>
                          {meta.isForensicMandatory && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold" title="Mandatory Forensic Visit (BNSS 176(3))">
                              • 🔬 Forensic
                            </span>
                          )}
                        </span>
                        <span className="text-slate-900 dark:text-white px-2 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                          {stat.total} Cases ({stat.percentage}%)
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">{stat.pending} Pending</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{stat.disposed} Disposed</span>
                        {stat.overdue > 0 && (
                          <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                            🚨 {stat.overdue} Overdue
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DISTRICT COMPARISON MATRIX (Admin View) */}
      {/* ========================================================================= */}
      {activeTab === 'DISTRICT_COMPARISON' && isAdministrator && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Inter-District Performance & Crime Comparison Matrix</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparative ranking and statutory compliance across all districts in the state. Click any row to inspect matching records.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-500">
              Total Districts: <span className="text-slate-900 dark:text-white font-extrabold">{districts.length}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">District & HQ</th>
                    <th className="py-3 px-3 text-center">Subdivisions / PS</th>
                    <th className="py-3 px-3 text-center">Total FIRs</th>
                    <th className="py-3 px-3 text-center">Disposed (CS/Final)</th>
                    <th className="py-3 px-3 text-center">Pending Cases</th>
                    <th className="py-3 px-3 text-center">Overdue (&gt;60/90d)</th>
                    <th className="py-3 px-3 text-center">Disposal Rate</th>
                    <th className="py-3 px-3 text-center">SR Heinous</th>
                    <th className="py-3 px-3 text-center">CCTNS Sync</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {districtComparisonData.map((dItem, idx) => (
                    <tr key={dItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {dItem.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{dItem.hqName}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {dItem.subdivisionCount} Subdiv / {dItem.policeStationCount} PS
                      </td>

                      <td
                        onClick={() => handleOpenDrilldown(`Cases in ${dItem.name} District (${dItem.totalCases})`, dItem.cases)}
                        className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                      >
                        {dItem.totalCases}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {dItem.disposedCases}
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                        {dItem.pendingCases}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {dItem.overdueCases > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                            {dItem.overdueCases} Overdue ({dItem.overdueRate}%)
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${dItem.disposalRate}%` }} />
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-[11px]">
                            {dItem.disposalRate}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-amber-700 dark:text-amber-400">
                        {dItem.srCases}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                        {dItem.cctnsSyncRate}%
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectDistrict) onSelectDistrict(dItem.name);
                            setActiveTab('SUBDIV_COMPARISON');
                          }}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white font-bold text-[11px] rounded-lg transition cursor-pointer"
                        >
                          View Subdivisions &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUBDIVISION COMPARISON MATRIX (SP & Admin View) */}
      {/* ========================================================================= */}
      {activeTab === 'SUBDIV_COMPARISON' && (isAdministrator || isDistrictLevel) && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-500" />
                <span>Subdivision-Wise Performance & Crime Comparison Matrix</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparative ranking of Subdivisions (Tarapur, Munger Sadar, Kharagpur, etc.) on disposal velocity, statutory overdue rate, and heinous crime load.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-500">
              Subdivisions: <span className="text-slate-900 dark:text-white font-extrabold">{subdivisionComparisonData.length}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Subdivision & SDPO</th>
                    <th className="py-3 px-3">District</th>
                    <th className="py-3 px-3 text-center">Police Stations</th>
                    <th className="py-3 px-3 text-center">Total FIRs</th>
                    <th className="py-3 px-3 text-center">Disposed (CS/Final)</th>
                    <th className="py-3 px-3 text-center">Pending IO</th>
                    <th className="py-3 px-3 text-center">Overdue (&gt;60/90d)</th>
                    <th className="py-3 px-3 text-center">Disposal Rate</th>
                    <th className="py-3 px-3 text-center">SR Heinous Cases</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {subdivisionComparisonData.map((sItem, idx) => (
                    <tr key={sItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-black flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {sItem.name} Subdivision
                            </span>
                            <span className="text-[10px] text-slate-400 block">{sItem.headquarters}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">
                        {sItem.districtName}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        <span className="text-xs">{sItem.policeStationCount} PS</span>
                        <span className="text-[10px] text-slate-400 block">({sItem.policeStations.slice(0, 2).join(', ')}{sItem.policeStations.length > 2 ? '...' : ''})</span>
                      </td>

                      <td
                        onClick={() => handleOpenDrilldown(`Cases in ${sItem.name} Subdivision (${sItem.totalCases})`, sItem.cases)}
                        className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                      >
                        {sItem.totalCases}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {sItem.disposedCases}
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                        {sItem.pendingCases}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {sItem.overdueCases > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                            {sItem.overdueCases} Overdue
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${sItem.disposalRate}%` }} />
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-[11px]">
                            {sItem.disposalRate}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-amber-700 dark:text-amber-400">
                        {sItem.srCases}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectSubdivision) onSelectSubdivision(sItem.name);
                            setActiveTab('PS_COMPARISON');
                          }}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white font-bold text-[11px] rounded-lg transition cursor-pointer"
                        >
                          View Police Stations &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PS-WISE COMPARISON & RANKING MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'PS_COMPARISON' && !isPSLevel && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span>Police Station Performance & Crime Head Matrix</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cross-station comparison and incidence matrix. Click any non-zero count to inspect matching FIR records.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-500">
              Stations: <span className="text-slate-900 dark:text-white font-extrabold">{psNamesList.join(', ')}</span>
            </div>
          </div>

          {/* PS Leaderboard Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {psPerformanceRanking.map((psItem, idx) => (
              <div
                key={psItem.psName}
                onClick={() => handleOpenDrilldown(`${psItem.psName} PS Cases (${psItem.totalCases})`, psItem.cases)}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span>{psItem.psName} PS</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{psItem.subdivisionName}</span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{psItem.totalCases}</span>
                    <span className="text-[10px] text-slate-400 ml-1">Total</span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    {psItem.disposalRate}% Disposed
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-amber-600 font-bold">{psItem.pendingCases} Pending</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-rose-600 font-bold">{psItem.overdueCases} Overdue</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-purple-600 font-bold">{psItem.srCases} SR</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Crime Head Cross-Station Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Crime Head</th>
                    <th className="py-3 px-3">Category</th>
                    {psNamesList.map((ps) => (
                      <th key={ps} className="py-3 px-3 text-center">
                        {ps} PS
                      </th>
                    ))}
                    <th className="py-3 px-4 text-center">Jurisdiction Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {ALL_CRIME_HEADS.map((headId) => {
                    const meta = CRIME_HEADS_CONFIG[headId];
                    const stat = crimeHeadStats[headId] || { total: 0, pending: 0, disposed: 0, overdue: 0, percentage: 0, cases: [] };

                    return (
                      <tr key={headId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{meta.icon}</span>
                          <span>{meta.name}</span>
                        </td>

                        <td className="py-3 px-3 text-[11px] text-slate-500">
                          {meta.category}
                        </td>

                        {psNamesList.map((ps) => {
                          const count = psMatrixData[ps] ? psMatrixData[ps][headId] || 0 : 0;
                          const matchingCases = filteredCases.filter(
                            (c) =>
                              c.ps.toLowerCase() === ps.toLowerCase() &&
                              ((c.crimeHead as CrimeHead) || classifyCrimeHead(c)) === headId
                          );

                          return (
                            <td
                              key={ps}
                              onClick={() => {
                                if (count > 0) {
                                  handleOpenDrilldown(`${meta.name} at ${ps} PS (${count})`, matchingCases);
                                }
                              }}
                              className={`py-3 px-3 text-center font-bold ${
                                count > 0
                                  ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer underline'
                                  : 'text-slate-400'
                              }`}
                            >
                              {count}
                            </td>
                          );
                        })}

                        <td
                          onClick={() => {
                            if (stat.total > 0) {
                              handleOpenDrilldown(`Total: ${meta.name} (${stat.total})`, stat.cases);
                            }
                          }}
                          className={`py-3 px-4 text-center font-black ${
                            stat.total > 0
                              ? 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                              : 'text-slate-400'
                          }`}
                        >
                          {stat.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: IO PERFORMANCE & FIELD DUTY ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === 'IO_PERFORMANCE' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Investigating Officer (IO) Performance & Field Duty Scorecard</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation based on statutory disposal velocity, active caseload, OD Station Shifts, and Gasti night patrols.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Active IOs Tracked: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{ioPerformanceData.length}</span>
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Investigating Officer</th>
                    <th className="py-3 px-3">Rank & PS</th>
                    <th className="py-3 px-3 text-center">Total Cases</th>
                    <th className="py-3 px-3 text-center">Disposed (CS/Final)</th>
                    <th className="py-3 px-3 text-center">Pending IO</th>
                    <th className="py-3 px-3 text-center">Overdue (&gt;60/90d)</th>
                    <th className="py-3 px-3 text-center">Disposal Rate</th>
                    <th className="py-3 px-3 text-center">OD Duty Shifts</th>
                    <th className="py-3 px-3 text-center">Gasti Patrols</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {ioPerformanceData.map((ioItem, idx) => (
                    <tr key={ioItem.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-black flex items-center justify-center text-slate-700 dark:text-slate-300">
                          {idx + 1}
                        </span>
                        <span>{ioItem.name}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-900 dark:text-white font-semibold">{ioItem.rank}</span>
                        <span className="text-slate-400 text-[10px] block">{ioItem.ps} PS</span>
                      </td>

                      <td
                        onClick={() => handleOpenDrilldown(`Cases with IO: ${ioItem.name} (${ioItem.totalCases})`, ioItem.cases)}
                        className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                      >
                        {ioItem.totalCases}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {ioItem.disposedCases}
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                        {ioItem.pendingCases}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {ioItem.overdueCases > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                            {ioItem.overdueCases} Overdue
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${ioItem.disposalRate}%` }} />
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-[11px]">
                            {ioItem.disposalRate}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-[10px]">
                          🛡️ {ioItem.odCount} Shifts
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[10px]">
                          🚓 {ioItem.gastiCount} Gasti
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDrilldown(`Cases with IO: ${ioItem.name}`, ioItem.cases)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg transition cursor-pointer"
                        >
                          View {ioItem.totalCases} Cases
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: STANDARDIZED BNS / IPC / BNSS STATUTORY REFERENCE MATRIX (EDITABLE) */}
      {/* ========================================================================= */}
      {activeTab === 'STATUTORY_MATRIX' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & Controls */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Scale className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>BNS / BNSS Statutory Reference & Special Local Laws Matrix</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        ⚡ Live Dynamic & Editable
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Statutory mapping between Bharatiya Nyaya Sanhita (BNS 2023), IPC, Remand Track (BNSS Sec. 187), Forensic Scene Visit (BNSS Sec. 176(3)), and Special & Local Laws (SLL).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEntry({
                      id: '' as any,
                      name: '',
                      hindiName: '',
                      category: 'Special & Local Laws (SLL)',
                      isMajorHead: false,
                      isSpecialLocalLaw: true,
                      bnsSections: [],
                      ipcSections: [],
                      sllProvisions: [],
                      lawKeywords: [],
                      remandTrack: '60-Day Track (up to 7 Yrs)',
                      forensicSceneVisit: 'Not Mandatory',
                      isForensicMandatory: false,
                      punishmentTerm: '',
                      guidelines: '',
                      isCustom: true,
                      isEditable: true,
                      color: {
                        bg: 'bg-indigo-600',
                        text: 'text-indigo-600',
                        border: 'border-indigo-300 dark:border-indigo-800',
                        badgeBg: 'bg-indigo-100 dark:bg-indigo-950',
                        badgeText: 'text-indigo-800 dark:text-indigo-300',
                        darkBadgeBg: 'bg-indigo-950',
                        darkBadgeText: 'text-indigo-300',
                        chartColor: '#4f46e5',
                      },
                      icon: '⚖️',
                      description: '',
                    });
                    setIsAddEditModalOpen(true);
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Statutory Law / Crime Head</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset all statutory reference heads and local laws to Bihar Police Standard Defaults? Custom entries will be removed.')) {
                      resetStatutoryConfigToDefault();
                      setStatutorySuccessMessage('Statutory reference matrix restored to official Bihar Police defaults.');
                      setTimeout(() => setStatutorySuccessMessage(null), 4000);
                    }
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Restore default BNS / BNSS Statutory Reference Matrix"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const headers = [
                      'S.No.',
                      'Standardized Crime Head',
                      'Hindi Name',
                      'Category',
                      'Special Local Law (SLL)',
                      'Relevant BNS 2023 Section(s)',
                      'Corresponding IPC / SLL Provision(s)',
                      'Law Matching Keywords',
                      'Remand Track (BNSS Sec. 187)',
                      'Forensic Scene Visit (BNSS Sec. 176(3))',
                      'Punishment Term',
                      'Supervisory Guidelines',
                      'Active Scope Cases',
                    ];
                    const rows = activeAllCrimeHeads.map((head, idx) => {
                      const meta = statutoryConfig[head] || CRIME_HEADS_CONFIG[head as CrimeHead];
                      const count = crimeHeadStats[head]?.total || 0;
                      return [
                        idx + 1,
                        meta?.name || head,
                        meta?.hindiName || '',
                        meta?.category || '',
                        meta?.isSpecialLocalLaw ? 'Yes (Name-Based Match)' : 'No',
                        meta?.bnsSections?.join(', ') || '',
                        meta?.ipcSections?.join(', ') || '',
                        meta?.lawKeywords?.join(', ') || '',
                        meta?.remandTrack || '',
                        meta?.forensicSceneVisit || '',
                        meta?.punishmentTerm || '',
                        meta?.guidelines || '',
                        count,
                      ];
                    });
                    exportToExcel('BNS_BNSS_Statutory_Matrix_Reference', headers, rows);
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Legal Matrix</span>
                </button>
              </div>
            </div>

            {/* Success Banner */}
            {statutorySuccessMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{statutorySuccessMessage}</span>
                </div>
                <button type="button" onClick={() => setStatutorySuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Category Filter Pills & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'All Statutory Heads', count: activeAllCrimeHeads.length },
                  { id: 'Special & Local Laws (SLL)', label: 'Special & Local Laws (SLL)', count: activeAllCrimeHeads.filter(h => statutoryConfig[h]?.category === 'Special & Local Laws (SLL)').length },
                  { id: 'Heinous & Violent', label: 'Heinous & Violent', count: activeAllCrimeHeads.filter(h => statutoryConfig[h]?.category === 'Heinous & Violent').length },
                  { id: 'Property & Economic', label: 'Property & Economic', count: activeAllCrimeHeads.filter(h => statutoryConfig[h]?.category === 'Property & Economic').length },
                  { id: 'Women & Children', label: 'Women & Children', count: activeAllCrimeHeads.filter(h => statutoryConfig[h]?.category === 'Women & Children').length },
                  { id: 'Cyber & General', label: 'Cyber & General', count: activeAllCrimeHeads.filter(h => statutoryConfig[h]?.category === 'Cyber & General').length },
                  { id: 'CUSTOM', label: 'Custom Added', count: activeAllCrimeHeads.filter(h => statutoryConfig[h]?.isCustom).length },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setStatutoryCategoryFilter(cat.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      statutoryCategoryFilter === cat.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      statutoryCategoryFilter === cat.id ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search law, section, keyword, remand..."
                  value={statutorySearchQuery}
                  onChange={(e) => setStatutorySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {statutorySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStatutorySearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Statutory Matrix Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">S.No.</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-indigo-600 select-none"
                      onClick={() => {
                        if (statutorySortField === 'name') {
                          setStatutorySortAsc(!statutorySortAsc);
                        } else {
                          setStatutorySortField('name');
                          setStatutorySortAsc(true);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Standardized Crime Head</span>
                        {statutorySortField === 'name' && (
                          <span className="text-indigo-600 font-bold">{statutorySortAsc ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-indigo-600 select-none"
                      onClick={() => {
                        if (statutorySortField === 'category') {
                          setStatutorySortAsc(!statutorySortAsc);
                        } else {
                          setStatutorySortField('category');
                          setStatutorySortAsc(true);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Category / Matching Basis</span>
                        {statutorySortField === 'category' && (
                          <span className="text-indigo-600 font-bold">{statutorySortAsc ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4">Relevant BNS, 2023 Section(s)</th>
                    <th className="py-3 px-4">Corresponding IPC / SLL Provision(s)</th>
                    <th className="py-3 px-4">Remand Track (BNSS Sec. 187)</th>
                    <th className="py-3 px-4">Forensic Scene Visit (BNSS Sec. 176(3))</th>
                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-indigo-600 select-none"
                      onClick={() => {
                        if (statutorySortField === 'cases') {
                          setStatutorySortAsc(!statutorySortAsc);
                        } else {
                          setStatutorySortField('cases');
                          setStatutorySortAsc(false);
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Active Cases</span>
                        {statutorySortField === 'cases' && (
                          <span className="text-indigo-600 font-bold">{statutorySortAsc ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {(() => {
                    let rows = activeAllCrimeHeads.map((head) => {
                      const meta: CrimeHeadMeta = statutoryConfig[head] || CRIME_HEADS_CONFIG[head as CrimeHead] || {
                        id: head as any,
                        name: head,
                        hindiName: '',
                        category: 'Special & Local Laws (SLL)',
                        isMajorHead: false,
                        isSpecialLocalLaw: true,
                        bnsSections: [],
                        ipcSections: [],
                        sllProvisions: [],
                        lawKeywords: [],
                        remandTrack: '60-Day Track',
                        forensicSceneVisit: 'Not Mandatory',
                        isForensicMandatory: false,
                        punishmentTerm: '',
                        guidelines: '',
                        isCustom: false,
                        isEditable: true,
                        icon: '⚖️',
                        color: {
                          bg: 'bg-indigo-500',
                          text: 'text-indigo-500',
                          border: 'border-indigo-300',
                          badgeBg: 'bg-indigo-100',
                          badgeText: 'text-indigo-800',
                          darkBadgeBg: 'bg-indigo-950',
                          darkBadgeText: 'text-indigo-300',
                          chartColor: '#6366f1',
                        },
                        description: '',
                      };
                      const stat = crimeHeadStats[head] || { total: 0, cases: [] };
                      return { head, meta, stat };
                    });

                    // Category filter
                    if (statutoryCategoryFilter === 'CUSTOM') {
                      rows = rows.filter((r) => r.meta.isCustom);
                    } else if (statutoryCategoryFilter !== 'ALL') {
                      rows = rows.filter((r) => r.meta.category === statutoryCategoryFilter);
                    }

                    // Search query filter
                    if (statutorySearchQuery.trim()) {
                      const q = statutorySearchQuery.toLowerCase();
                      rows = rows.filter((r) => {
                        const m = r.meta;
                        return (
                          m.name.toLowerCase().includes(q) ||
                          (m.hindiName && m.hindiName.toLowerCase().includes(q)) ||
                          (m.category && m.category.toLowerCase().includes(q)) ||
                          (m.remandTrack && m.remandTrack.toLowerCase().includes(q)) ||
                          (m.forensicSceneVisit && m.forensicSceneVisit.toLowerCase().includes(q)) ||
                          (m.punishmentTerm && m.punishmentTerm.toLowerCase().includes(q)) ||
                          (m.guidelines && m.guidelines.toLowerCase().includes(q)) ||
                          (m.bnsSections && m.bnsSections.some((s) => s.toLowerCase().includes(q))) ||
                          (m.ipcSections && m.ipcSections.some((s) => s.toLowerCase().includes(q))) ||
                          (m.lawKeywords && m.lawKeywords.some((s) => s.toLowerCase().includes(q)))
                        );
                      });
                    }

                    // Sorting
                    rows.sort((a, b) => {
                      if (statutorySortField === 'cases') {
                        return statutorySortAsc ? a.stat.total - b.stat.total : b.stat.total - a.stat.total;
                      }
                      if (statutorySortField === 'category') {
                        const comp = (a.meta.category || '').localeCompare(b.meta.category || '');
                        return statutorySortAsc ? comp : -comp;
                      }
                      const comp = a.meta.name.localeCompare(b.meta.name);
                      return statutorySortAsc ? comp : -comp;
                    });

                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No statutory heads matched your search or category filter.
                          </td>
                        </tr>
                      );
                    }

                    return rows.map(({ head, meta, stat }, idx) => {
                      return (
                        <tr key={head} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
                          <td className="py-3 px-3 text-center font-black text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                                {meta.icon || '⚖️'}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{meta.name}</span>
                                  {meta.isMajorHead && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                      MAJOR
                                    </span>
                                  )}
                                  {meta.isCustom && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                      CUSTOM
                                    </span>
                                  )}
                                </div>
                                {meta.hindiName && (
                                  <div className="text-[11px] text-slate-500 font-medium">
                                    {meta.hindiName}
                                  </div>
                                )}
                                {meta.punishmentTerm && (
                                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                    ⚖️ {meta.punishmentTerm}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-block">
                                {meta.category || 'Special & Local Laws (SLL)'}
                              </span>
                              {meta.isSpecialLocalLaw && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                                  <span>🏷️ Name-Based Match</span>
                                </div>
                              )}
                              {meta.lawKeywords && meta.lawKeywords.length > 0 && (
                                <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5" title={meta.lawKeywords.join(', ')}>
                                  KW: {meta.lawKeywords.slice(0, 3).join(', ')}{meta.lawKeywords.length > 3 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-mono font-bold text-[11px] inline-block max-w-[200px] break-words">
                              {meta.bnsSections && meta.bnsSections.length > 0 ? meta.bnsSections.join(', ') : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px] inline-block max-w-[200px] break-words">
                              {meta.ipcSections && meta.ipcSections.length > 0 ? meta.ipcSections.join(', ') : meta.sllProvisions?.join(', ') || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[11px] whitespace-pre-line leading-relaxed">
                              {meta.remandTrack || '60-Day Track'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {meta.isForensicMandatory ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] inline-flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                                  🔬 Mandatory (≥ 7 Yrs)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px]">
                                  {meta.forensicSceneVisit || 'Not Mandatory'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`font-black text-xs px-2.5 py-1 rounded-lg ${stat.total > 0 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                              {stat.total}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEntry(JSON.parse(JSON.stringify(meta)));
                                  setIsAddEditModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/60 rounded-lg transition cursor-pointer"
                                title="Edit BNS / BNSS Statutory Reference"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {meta.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Delete custom statutory head "${meta.name}"?`)) {
                                      deleteStatutoryEntry(meta.name);
                                      setStatutorySuccessMessage(`Statutory head "${meta.name}" removed.`);
                                      setTimeout(() => setStatutorySuccessMessage(null), 3000);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
                                  title="Delete Custom Statutory Head"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenDrilldown(`${meta.name} Cases (${stat.total})`, stat.cases)}
                                disabled={stat.total === 0}
                                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                                  stat.total > 0
                                    ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950 dark:text-indigo-400'
                                    : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}
                              >
                                Dossiers
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT STATUTORY HEAD MODAL */}
      {/* ========================================================================= */}
      {isAddEditModalOpen && editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
                  {editingEntry.icon || '⚖️'}
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingEntry.name ? `Edit Statutory Reference: ${editingEntry.name}` : 'Add New Statutory Law / Crime Head'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure BNS, IPC, SLL Provisions, law-name keywords, Remand Track, and Forensic visits.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddEditModalOpen(false);
                  setEditingEntry(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Standardized Crime Head / Law Name *
                  </label>
                  <input
                    type="text"
                    value={editingEntry.name}
                    onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value, id: e.target.value as any })}
                    placeholder="e.g., Arms Act, Dowry Death, Mining Act"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Hindi Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hindi Name / Description
                  </label>
                  <input
                    type="text"
                    value={editingEntry.hindiName || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, hindiName: e.target.value })}
                    placeholder="e.g., आर्म्स एक्ट (अवैध हथियार), बालू खनन"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Statutory Category
                  </label>
                  <select
                    value={editingEntry.category}
                    onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value as StatutoryCategory })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Special & Local Laws (SLL)">Special & Local Laws (SLL)</option>
                    <option value="Heinous & Violent">Heinous & Violent</option>
                    <option value="Property & Economic">Property & Economic</option>
                    <option value="Women & Children">Women & Children</option>
                    <option value="Cyber & General">Cyber & General</option>
                    <option value="Custom / Local Laws">Custom / Local Laws</option>
                  </select>
                </div>

                {/* Icon Emoji */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Icon / Emoji
                  </label>
                  <input
                    type="text"
                    value={editingEntry.icon}
                    onChange={(e) => setEditingEntry({ ...editingEntry, icon: e.target.value })}
                    placeholder="e.g., 🔫, 🩸, ⚖️, 🍾, 🌾, 💎, 🚗"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingEntry.isSpecialLocalLaw ?? true}
                    onChange={(e) => setEditingEntry({ ...editingEntry, isSpecialLocalLaw: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs block">Special / Local Law (SLL) Mode</span>
                    <span className="text-[10px] text-slate-500">Filter/classify cases by law name & keywords without requiring specific section numbers</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingEntry.isMajorHead}
                    onChange={(e) => setEditingEntry({ ...editingEntry, isMajorHead: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs block">Major Highlight Head</span>
                    <span className="text-[10px] text-slate-500">Display prominently on executive overview cards</span>
                  </div>
                </label>
              </div>

              {/* BNS Sections */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Relevant BNS 2023 Section(s) (Comma-separated)
                </label>
                <input
                  type="text"
                  value={editingEntry.bnsSections?.join(', ') || ''}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      bnsSections: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g., Section 103(1), Section 109, Sec 25/27 Arms Act"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Corresponding IPC Sections */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Corresponding IPC / SLL Provision(s) (Comma-separated)
                </label>
                <input
                  type="text"
                  value={editingEntry.ipcSections?.join(', ') || ''}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      ipcSections: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g., Section 302 IPC, Section 307 IPC, Arms Act 1959"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Law Keywords */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Law Name Keywords & Aliases for Matching (Comma-separated, ignores section numbers)
                </label>
                <input
                  type="text"
                  value={editingEntry.lawKeywords?.join(', ') || ''}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      lawKeywords: e.target.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
                    })
                  }
                  placeholder="e.g., arms, arms act, tamancha, katta, pistol, firearm, ammo, golibari"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Any FIR text containing these keywords will be recognized as matching this law.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Remand Track */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Remand Track (BNSS Sec. 187)
                  </label>
                  <input
                    type="text"
                    value={editingEntry.remandTrack || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, remandTrack: e.target.value })}
                    placeholder="e.g., 90-Day Track (Death / Life) or 60-Day Track (up to 7 Yrs)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Forensic Scene Visit */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Forensic Scene Visit (BNSS Sec. 176(3))
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingEntry.forensicSceneVisit || ''}
                      onChange={(e) => setEditingEntry({ ...editingEntry, forensicSceneVisit: e.target.value })}
                      placeholder="e.g., Mandatory (≥ 7 Years) or Not Mandatory"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingEntry.isForensicMandatory}
                        onChange={(e) => setEditingEntry({ ...editingEntry, isForensicMandatory: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Mark Forensic Visit as Mandatory (≥ 7 Years)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Punishment Term */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Statutory Punishment Term
                  </label>
                  <input
                    type="text"
                    value={editingEntry.punishmentTerm || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, punishmentTerm: e.target.value })}
                    placeholder="e.g., 7 Years to Life Imprisonment + Fine"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Guidelines */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supervisory Instructions / Standard SOP
                  </label>
                  <input
                    type="text"
                    value={editingEntry.guidelines || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, guidelines: e.target.value })}
                    placeholder="e.g., SDPO supervision note within 48 hrs. Armorer test for weapons."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsAddEditModalOpen(false);
                  setEditingEntry(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!editingEntry.name.trim()) {
                    alert('Please provide a valid Crime Head / Law Name.');
                    return;
                  }
                  upsertStatutoryEntry(editingEntry);
                  setIsAddEditModalOpen(false);
                  setEditingEntry(null);
                  setStatutorySuccessMessage(`Statutory reference entry "${editingEntry.name}" saved successfully.`);
                  setTimeout(() => setStatutorySuccessMessage(null), 3000);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Statutory Reference</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB: DYNAMIC GENERATE REPORT & CASE REVIEW LINKAGE */}
      {/* ========================================================================= */}
      {activeTab === 'GENERATE_REPORT' && (
        <CustomReportGenerator
          cases={enrichedMasterCases}
          ios={ios}
          currentRole={currentRole}
          currentUserAccount={currentUserAccount}
          districts={districts}
          subdivisions={subdivisions}
          availablePoliceStations={scopedPoliceStations}
          onViewCase={onViewCase}
        />
      )}

      {/* ========================================================================= */}
      {/* DRILLDOWN MODAL FOR CASE INSPECTION */}
      {/* ========================================================================= */}
      {drilldownCases && drilldownTitle && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderOpenIcon className="w-4 h-4 text-indigo-500" />
                  <span>{drilldownTitle}</span>
                </h3>
                <span className="text-xs text-slate-500">{drilldownCases.length} records matching selection</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!drilldownCases || drilldownCases.length === 0) return;
                    const headers = ['FIR Number', 'PS', 'Subdivision', 'District', 'Date', 'Crime Head', 'Sections', 'IO Name', 'Status', 'Designation'];
                    const rows = drilldownCases.map((c) => [
                      c.firNumber,
                      c.ps,
                      c.subdivision || '',
                      c.district || '',
                      c.firDate || '',
                      c.crimeHead || classifyCrimeHead(c),
                      c.sections,
                      c.ioName,
                      c.status,
                      c.designation || 'PENDING',
                    ]);
                    exportToExcel(`Crime_Cases_${(drilldownTitle || 'Export').replace(/[^a-zA-Z0-9]/g, '_')}`, headers, rows);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrilldownCases(null);
                    setDrilldownTitle(null);
                  }}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cases List */}
            <div className="p-4 overflow-y-auto space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800 flex-1">
              {drilldownCases.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                  No cases found matching this specific filter.
                </div>
              ) : (
                drilldownCases.map((c) => {
                  const deadline = getDeadlineInfo(c);
                  const head = (c.crimeHead as CrimeHead) || classifyCrimeHead(c);
                  const meta = CRIME_HEADS_CONFIG[head] || CRIME_HEADS_CONFIG['Other / General IPC & BNS'];

                  return (
                    <div
                      key={c.id}
                      className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 p-2.5 rounded-xl transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-slate-900 dark:text-white">
                            FIR No. {c.firNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                            {c.ps} PS
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.color.badgeBg} ${meta.color.badgeText}`}>
                            {meta.icon} {meta.name}
                          </span>
                          {c.designation && (
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px]">
                              {c.designation}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">Sections:</span> {c.sections} • <span className="font-semibold">IO:</span> {c.ioName || 'Not Assigned'}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          Filing Date: {formatReadableDate(c.firDate)} • PO: {c.placeOfOccurrence || 'N/A'} • Complainant: {c.complainantName}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            c.status === 'Under Investigation'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {c.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDrilldownCases(null);
                            setDrilldownTitle(null);
                            onViewCase(c);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Dossier</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper icon component
function FolderOpenIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
