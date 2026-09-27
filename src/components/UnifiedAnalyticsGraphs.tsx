import React, { useState, useMemo } from 'react';
import {
  FIRCase,
  InvestigatingOfficer,
  DailyCrimeReport,
  PoliceStation,
  UserRole,
  UserAccount,
  LeaveLedgerEntry,
} from '../types';
import {
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Users,
  Building2,
  Download,
  Filter,
  Layers,
  Sparkles,
  Award,
  Activity,
  Calendar,
  Compass,
  Sun,
  Sunset,
  Moon,
  Search,
  ArrowUpDown,
  X,
  UserCheck,
  Flame,
  FileSpreadsheet,
  Zap,
  Target,
  FileText,
  UserX,
  Radio,
  ChevronRight,
  CheckSquare,
  Square,
  BarChart2,
  Grid,
  Crosshair,
  Radar,
  Disc,
  LayoutGrid,
} from 'lucide-react';
import { getDeadlineInfo, formatReadableDate } from '../utils/helpers';
import { exportToExcel } from '../utils/reportExport';
import { CrimeSpectrumComparison } from './CrimeSpectrumComparison';

interface UnifiedAnalyticsGraphsProps {
  cases: FIRCase[];
  ios: InvestigatingOfficer[];
  dailyReports: DailyCrimeReport[];
  leaveLedger?: LeaveLedgerEntry[];
  availablePoliceStations?: PoliceStation[];
  currentRole: UserRole;
  currentUserAccount?: UserAccount | null;
  activePS?: string | null;
  onViewCase?: (c: FIRCase) => void;
  onApplyFilter?: (filters: any) => void;
  onTabChange?: (tab: string) => void;
}

// User-specified Dimensions:
// 1. IO vs Day Gasti, IO vs Evening Gasti, IO vs Night Gasti
// 2. IO vs Day OD, IO vs Evening OD, IO vs Night OD
// 3. Different Crime Head wise reporting, Different Head wise disposal
// 4. IO 360° Performance Comparison
// 5. IO-Wise Arresting Comparison, IO Case Disposal, IO Leaves Availed
// 6. Multi-PS Crime Distribution Spectrum Comparison
export type GraphDataSource =
  | 'CRIME_SPECTRUM_COMPARISON'
  | 'IO_VS_DAY_GASTI'
  | 'IO_VS_EVENING_GASTI'
  | 'IO_VS_NIGHT_GASTI'
  | 'IO_VS_OVERALL_GASTI'
  | 'IO_VS_DAY_OD'
  | 'IO_VS_EVENING_OD'
  | 'IO_VS_NIGHT_OD'
  | 'IO_VS_OVERALL_OD'
  | 'SUBDIVISION_COMPARISON'
  | 'CRIME_HEAD_REPORTING'
  | 'CRIME_HEAD_DISPOSAL'
  | 'IO_360_PERFORMANCE'
  | 'IO_ARRESTS_COMPARISON'
  | 'IO_CASE_DISPOSAL'
  | 'IO_LEAVES_AVAILED';

// Advanced Graph Types:
// 1. Multi-Bar (Comparative Grouped)
// 2. Horizontal Lollipop Ranking
// 3. Multi-Axis Radar / Spider Web
// 4. Polar Area / Nightingale Rose Chart
// 5. Area Spectrum Treemap Tiles
// 6. Density Heatmap Matrix Grid
// 7. Pie & Donut Chart
// 8. Side-by-Side Breakdown Cards
export type ChartDisplayType =
  | 'MULTI_BAR'
  | 'LOLLIPOP_RANKING'
  | 'RADAR_SPIDER'
  | 'POLAR_ROSE'
  | 'TREEMAP_SPECTRUM'
  | 'HEATMAP_MATRIX'
  | 'PIE_DONUT'
  | 'SIDE_BY_SIDE';

interface ChartSliceData {
  label: string;
  value: number;
  color: string;
  percentage: number;
  sublabel?: string;
  extraInfo?: string;
  metric1?: { name: string; val: number; color: string };
  metric2?: { name: string; val: number; color: string };
  metric3?: { name: string; val: number; color: string };
  metric4?: { name: string; val: number; color: string };
}

export const UnifiedAnalyticsGraphs: React.FC<UnifiedAnalyticsGraphsProps> = ({
  cases,
  ios,
  dailyReports,
  leaveLedger = [],
  availablePoliceStations = [],
  currentRole,
  currentUserAccount,
  activePS,
  onViewCase,
  onApplyFilter,
  onTabChange,
}) => {
  const [selectedSource, setSelectedSource] = useState<GraphDataSource>('IO_VS_DAY_GASTI');
  const [chartType, setChartType] = useState<ChartDisplayType>('MULTI_BAR');
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>('ALL');
  const [selectedPS, setSelectedPS] = useState<string>(activePS || 'ALL');

  // Derive PS to Subdivision Map and list of Subdivisions
  const psToSubdivisionMap = useMemo(() => {
    const map = new Map<string, string>();
    availablePoliceStations.forEach((ps) => {
      if (ps.subdivisionName) {
        map.set(ps.name.toLowerCase(), ps.subdivisionName);
      }
    });
    cases.forEach((c) => {
      if (c.ps && c.subdivision && !map.has(c.ps.toLowerCase())) {
        map.set(c.ps.toLowerCase(), c.subdivision);
      }
    });
    return map;
  }, [availablePoliceStations, cases]);

  const subdivisionList = useMemo(() => {
    const set = new Set<string>();
    availablePoliceStations.forEach((ps) => {
      if (ps.subdivisionName) set.add(ps.subdivisionName);
    });
    cases.forEach((c) => {
      if (c.subdivision) set.add(c.subdivision);
    });
    return Array.from(set);
  }, [availablePoliceStations, cases]);

  const isDistrictOrStateAdmin =
    currentRole === 'ADMINISTRATOR' ||
    currentRole === 'SP' ||
    currentRole === 'DISTRICT_ADMIN' ||
    subdivisionList.length > 1;

  // Date Range Period Options
  const [timePreset, setTimePreset] = useState<
    | 'ALL'
    | 'TODAY'
    | 'YESTERDAY'
    | 'LAST_7_DAYS'
    | 'THIS_MONTH'
    | 'LAST_MONTH'
    | 'LAST_30_DAYS'
    | 'LAST_90_DAYS'
    | 'THIS_YEAR'
    | 'CUSTOM'
  >('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Search and Filter within IO list
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRankFilter, setSelectedRankFilter] = useState<string>('ALL');
  const [hoveredSlice, setHoveredSlice] = useState<ChartSliceData | null>(null);

  // Dynamic Floating Hover Tooltip State for All Graphs
  const [hoverTooltip, setHoverTooltip] = useState<{
    x: number;
    y: number;
    visible: boolean;
    title: string;
    subtitle?: string;
    value: string | number;
    percentage?: number;
    sublabel?: string;
    metrics?: { name: string; val: number | string; color?: string }[];
    badge?: string;
  } | null>(null);

  const showTooltip = (
    e: React.MouseEvent,
    item: {
      title: string;
      subtitle?: string;
      value: string | number;
      percentage?: number;
      sublabel?: string;
      metrics?: { name: string; val: number | string; color?: string }[];
      badge?: string;
    }
  ) => {
    setHoverTooltip({
      x: e.clientX,
      y: e.clientY - 12,
      visible: true,
      ...item,
    });
  };

  const updateTooltipPos = (e: React.MouseEvent) => {
    if (hoverTooltip && hoverTooltip.visible) {
      setHoverTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY - 12 } : null));
    }
  };

  const hideTooltip = () => {
    setHoverTooltip(null);
  };

  // Direct Multi-IO Comparison Selection (List-type checklist)
  const [selectedIOsForComparison, setSelectedIOsForComparison] = useState<string[]>([]);
  const [showIOListDrawer, setShowIOListDrawer] = useState<boolean>(true);

  // Sorting state for master ledger
  const [sortField, setSortField] = useState<string>('totalDuties');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Date filtering helper
  const isDateInSelectedRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yest = new Date();
    yest.setDate(now.getDate() - 1);
    const yesterdayStr = yest.toISOString().split('T')[0];

    const itemDate = new Date(dateStr);

    if (timePreset === 'TODAY') return dateStr === todayStr;
    if (timePreset === 'YESTERDAY') return dateStr === yesterdayStr;
    if (timePreset === 'LAST_7_DAYS') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      return itemDate >= past7 && itemDate <= now;
    }
    if (timePreset === 'THIS_MONTH') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    if (timePreset === 'LAST_MONTH') {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return itemDate.getMonth() === prevMonth && itemDate.getFullYear() === prevYear;
    }
    if (timePreset === 'LAST_30_DAYS') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      return itemDate >= past30 && itemDate <= now;
    }
    if (timePreset === 'LAST_90_DAYS') {
      const past90 = new Date();
      past90.setDate(now.getDate() - 90);
      return itemDate >= past90 && itemDate <= now;
    }
    if (timePreset === 'THIS_YEAR') {
      return itemDate.getFullYear() === 2026 || itemDate.getFullYear() === now.getFullYear();
    }
    if (timePreset === 'CUSTOM') {
      if (customStartDate && dateStr < customStartDate) return false;
      if (customEndDate && dateStr > customEndDate) return false;
    }
    return true;
  };

  // Filter cases, daily reports, and leave entries by subdivision, station & date
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const cSubdiv = c.subdivision || psToSubdivisionMap.get(c.ps.toLowerCase());
      if (selectedSubdivision !== 'ALL' && cSubdiv?.toLowerCase() !== selectedSubdivision.toLowerCase()) {
        return false;
      }
      if (selectedPS !== 'ALL' && c.ps.toLowerCase() !== selectedPS.toLowerCase()) return false;
      return isDateInSelectedRange(c.firDate);
    });
  }, [cases, selectedSubdivision, selectedPS, psToSubdivisionMap, timePreset, customStartDate, customEndDate]);

  const filteredReports = useMemo(() => {
    return dailyReports.filter((r) => {
      const rSubdiv = r.subdivision || psToSubdivisionMap.get(r.ps.toLowerCase());
      if (selectedSubdivision !== 'ALL' && rSubdiv?.toLowerCase() !== selectedSubdivision.toLowerCase()) {
        return false;
      }
      if (selectedPS !== 'ALL' && r.ps.toLowerCase() !== selectedPS.toLowerCase()) return false;
      return isDateInSelectedRange(r.date);
    });
  }, [dailyReports, selectedSubdivision, selectedPS, psToSubdivisionMap, timePreset, customStartDate, customEndDate]);

  const allLeaveEntries = useMemo(() => {
    const map = new Map<string, LeaveLedgerEntry>();
    leaveLedger.forEach((l) => map.set(l.id, l));
    filteredReports.forEach((r) => {
      (r.leaveLedgerEntries || []).forEach((l) => {
        if (!map.has(l.id)) map.set(l.id, l);
      });
    });
    return Array.from(map.values()).filter((l) => {
      const lSubdiv = l.subdivision || psToSubdivisionMap.get(l.ps.toLowerCase());
      if (selectedSubdivision !== 'ALL' && lSubdiv?.toLowerCase() !== selectedSubdivision.toLowerCase()) {
        return false;
      }
      if (selectedPS !== 'ALL' && l.ps.toLowerCase() !== selectedPS.toLowerCase()) return false;
      return isDateInSelectedRange(l.departureDate);
    });
  }, [leaveLedger, filteredReports, selectedSubdivision, selectedPS, psToSubdivisionMap, timePreset, customStartDate, customEndDate]);

  // Scoped IOs list based on Subdivision, Station & Rank filter
  const scopedIOs = useMemo(() => {
    let list = ios;
    if (selectedSubdivision !== 'ALL') {
      list = list.filter((i) => {
        const ioSubdiv = i.subdivision || psToSubdivisionMap.get(i.ps.toLowerCase());
        return ioSubdiv?.toLowerCase() === selectedSubdivision.toLowerCase();
      });
    }
    if (selectedPS !== 'ALL') {
      list = list.filter((i) => i.ps.toLowerCase() === selectedPS.toLowerCase());
    }
    if (selectedRankFilter !== 'ALL') {
      list = list.filter((i) => (i.rank || '').toLowerCase().includes(selectedRankFilter.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.rank || '').toLowerCase().includes(q) ||
          i.ps.toLowerCase().includes(q)
      );
    }
    return list;
  }, [ios, selectedSubdivision, selectedPS, psToSubdivisionMap, selectedRankFilter, searchQuery]);

  // =========================================================================
  // MASTER INTER-IO COMPARATIVE STATS ENGINE
  // Computes IO vs Day Gasti, Eve Gasti, Night Gasti, Day OD, Eve OD, Night OD, Arrests, Leaves, 360 Score
  // =========================================================================
  const ioMasterComparisonList = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        rank: string;
        ps: string;
        // Gasti Shifts
        dayGasti: number; // Morning / Day S1
        eveGasti: number; // Day Mobile / Eve S2
        nightGasti: number; // Night Nakabandi S3
        totalGasti: number;

        // OD Shifts
        dayOD: number; // OD 1 (06:00 - 14:00)
        eveOD: number; // OD 2 (14:00 - 22:00)
        nightOD: number; // OD 3 (22:00 - 06:00)
        totalOD: number;

        totalDuties: number;

        // Arrests & Accused Breakdown
        totalArrests: number;
        heinousArrests: number;
        exciseArrests: number;
        otherArrests: number;

        // Comprehensive Legal & Process Actions
        personToBeArrested: number; // Accused persons required to be arrested
        arrestPending: number; // Accused persons where arrest is still pending
        noticeServed: number; // Notice served under Sec 41A CrPC / Sec 35 BNSS

        // Leaves availed
        leaveDaysConsumed: number;
        clDays: number;
        cplDays: number;
        otherLeaveDays: number;
        isOnLeaveNow: boolean;

        // Case Disposal & Workload (with SR / Non-SR segregation)
        casesGiven: number;
        casesGivenSR: number;
        casesGivenNonSR: number;
        casesDisposed: number;
        casesDisposedSR: number;
        casesDisposedNonSR: number;
        casesPending: number;
        casesPendingSR: number;
        casesPendingNonSR: number;
        casesOverdue: number;
        disposalRate: number;

        // IO 360° Composite Performance Score (0-100)
        performanceScore360: number;
      }
    > = {};

    // Initialize all scoped IOs
    scopedIOs.forEach((io) => {
      map[io.name.trim()] = {
        name: io.name.trim(),
        rank: io.rank || 'Investigating Officer',
        ps: io.ps,
        dayGasti: 0,
        eveGasti: 0,
        nightGasti: 0,
        totalGasti: 0,
        dayOD: 0,
        eveOD: 0,
        nightOD: 0,
        totalOD: 0,
        totalDuties: 0,
        totalArrests: 0,
        heinousArrests: 0,
        exciseArrests: 0,
        otherArrests: 0,
        personToBeArrested: 0,
        arrestPending: 0,
        noticeServed: 0,
        leaveDaysConsumed: 0,
        clDays: 0,
        cplDays: 0,
        otherLeaveDays: 0,
        isOnLeaveNow: false,
        casesGiven: 0,
        casesGivenSR: 0,
        casesGivenNonSR: 0,
        casesDisposed: 0,
        casesDisposedSR: 0,
        casesDisposedNonSR: 0,
        casesPending: 0,
        casesPendingSR: 0,
        casesPendingNonSR: 0,
        casesOverdue: 0,
        disposalRate: 0,
        performanceScore360: 0,
      };
    });

    // Populate OD and Gasti duties across Day, Evening, and Night shifts
    filteredReports.forEach((r) => {
      // 1. OD Shifts
      if (r.odDetails) {
        const { od1IoName, od2IoName, od3IoName, odShifts = [] } = r.odDetails;
        if (od1IoName?.trim() && map[od1IoName.trim()]) {
          map[od1IoName.trim()].dayOD++;
          map[od1IoName.trim()].totalOD++;
          map[od1IoName.trim()].totalDuties++;
        }
        if (od2IoName?.trim() && map[od2IoName.trim()]) {
          map[od2IoName.trim()].eveOD++;
          map[od2IoName.trim()].totalOD++;
          map[od2IoName.trim()].totalDuties++;
        }
        if (od3IoName?.trim() && map[od3IoName.trim()]) {
          map[od3IoName.trim()].nightOD++;
          map[od3IoName.trim()].totalOD++;
          map[od3IoName.trim()].totalDuties++;
        }
        odShifts.forEach((s) => {
          if (!s.ioName?.trim() || !map[s.ioName.trim()]) return;
          const target = map[s.ioName.trim()];
          const sName = (s.shiftName || '').toLowerCase();
          if (sName.includes('1') || sName.includes('day') || sName.includes('06:00')) target.dayOD++;
          else if (sName.includes('2') || sName.includes('evening') || sName.includes('14:00')) target.eveOD++;
          else if (sName.includes('3') || sName.includes('night') || sName.includes('22:00')) target.nightOD++;
          else target.eveOD++;
          target.totalOD++;
          target.totalDuties++;
        });
      }

      // 2. Gasti Shifts
      if (r.gastiDetails) {
        const { morningGastiIoName, dayGastiIoName, nightGastiIoName, gastiShifts = [] } = r.gastiDetails;
        if (morningGastiIoName?.trim() && map[morningGastiIoName.trim()]) {
          map[morningGastiIoName.trim()].dayGasti++;
          map[morningGastiIoName.trim()].totalGasti++;
          map[morningGastiIoName.trim()].totalDuties++;
        }
        if (dayGastiIoName?.trim() && map[dayGastiIoName.trim()]) {
          map[dayGastiIoName.trim()].eveGasti++;
          map[dayGastiIoName.trim()].totalGasti++;
          map[dayGastiIoName.trim()].totalDuties++;
        }
        if (nightGastiIoName?.trim() && map[nightGastiIoName.trim()]) {
          map[nightGastiIoName.trim()].nightGasti++;
          map[nightGastiIoName.trim()].totalGasti++;
          map[nightGastiIoName.trim()].totalDuties++;
        }
        gastiShifts.forEach((g) => {
          if (!g.ioName?.trim() || !map[g.ioName.trim()]) return;
          const target = map[g.ioName.trim()];
          const gName = (g.shiftName || '').toLowerCase();
          if (gName.includes('morning') || gName.includes('1') || gName.includes('06:00')) target.dayGasti++;
          else if (gName.includes('night') || gName.includes('nakabandi') || gName.includes('3') || gName.includes('22:00')) target.nightGasti++;
          else target.eveGasti++;
          target.totalGasti++;
          target.totalDuties++;
        });
      }
    });

    // Populate Leave Availed / Consumed
    allLeaveEntries.forEach((entry) => {
      const name = entry.officerName.trim();
      if (map[name]) {
        const days = entry.daysOnLeave || 1;
        map[name].leaveDaysConsumed += days;
        const lType = (entry.leaveType || 'CL').toUpperCase();
        if (lType === 'CL') map[name].clDays += days;
        else if (lType === 'CPL') map[name].cplDays += days;
        else map[name].otherLeaveDays += days;
        if (entry.status === 'ON_LEAVE') map[name].isOnLeaveNow = true;
      }
    });

    // Populate Case Disposal, Accused Arrests, Notice Served, and Pending Statistics from Cases
    filteredCases.forEach((c) => {
      if (!c.ioName || !map[c.ioName.trim()]) return;
      const target = map[c.ioName.trim()];
      target.casesGiven++;

      const isSR = c.designation === 'SR';
      if (isSR) {
        target.casesGivenSR++;
      } else {
        target.casesGivenNonSR++;
      }

      const isDisposed =
        c.status === 'Chargesheeted / Final Form Submitted' ||
        c.status === 'Disposed' ||
        c.status === 'Chargesheeted / Final Form Submitted / Mistake of Fact' ||
        c.status === 'False Case / Mistake of Fact';

      if (isDisposed) {
        target.casesDisposed++;
        if (isSR) {
          target.casesDisposedSR++;
        } else {
          target.casesDisposedNonSR++;
        }
      } else {
        target.casesPending++;
        if (isSR) {
          target.casesPendingSR++;
        } else {
          target.casesPendingNonSR++;
        }
      }

      if (getDeadlineInfo(c).code === 'OVERDUE') target.casesOverdue++;

      // 1. Accused Arrests Made (Accused Forwarded)
      let caseArrestCount = 0;
      if (c.accusedList && c.accusedList.length > 0) {
        c.accusedList.forEach((acc) => {
          if ((acc.status || '').toLowerCase().includes('arrested') || (acc.status || '').toLowerCase() === 'arrest') {
            caseArrestCount++;
          }
        });
      } else if (c.arrestedCount && c.arrestedCount > 0) {
        caseArrestCount = c.arrestedCount;
      } else if (c.anyPersonArrested) {
        caseArrestCount = 1;
      }

      if (caseArrestCount > 0) {
        target.totalArrests += caseArrestCount;
        const isHeinous =
          isSR ||
          (c.crimeHead || '').toLowerCase().includes('murder') ||
          (c.crimeHead || '').toLowerCase().includes('dacoity') ||
          (c.crimeHead || '').toLowerCase().includes('robbery') ||
          (c.crimeHead || '').toLowerCase().includes('rape');
        const isExcise =
          (c.crimeHead || '').toLowerCase().includes('liquor') ||
          (c.crimeHead || '').toLowerCase().includes('ndps') ||
          (c.crimeHead || '').toLowerCase().includes('arms');

        if (isHeinous) target.heinousArrests += caseArrestCount;
        else if (isExcise) target.exciseArrests += caseArrestCount;
        else target.otherArrests += caseArrestCount;
      }

      // 2. Person to be Arrested (Accused ordered/required to be arrested)
      let casePersonToBeArrested = 0;
      if (c.accusedList && c.accusedList.length > 0) {
        c.accusedList.forEach((acc) => {
          const st = (acc.status || '').toLowerCase();
          if (
            st.includes('arresting order') ||
            st.includes('charge true') ||
            st.includes('arrested') ||
            st === 'arrest'
          ) {
            casePersonToBeArrested++;
          }
        });
      }
      // If no explicit accused list status, compute from pendingArrestCount + arrestedCount or total accused required
      if (casePersonToBeArrested === 0) {
        const pendingCount = c.pendingArrestCount || (c.pendingForArrest ? 1 : 0);
        casePersonToBeArrested = caseArrestCount + pendingCount;
      }
      target.personToBeArrested += casePersonToBeArrested;

      // 3. Arrest Pending (Accused persons where arrest is still pending)
      let caseArrestPending = 0;
      if (c.accusedList && c.accusedList.length > 0) {
        c.accusedList.forEach((acc) => {
          const st = (acc.status || '').toLowerCase();
          if (
            st.includes('arresting order') ||
            (st.includes('charge true') && !st.includes('arrested'))
          ) {
            caseArrestPending++;
          }
        });
      }
      if (caseArrestPending === 0) {
        if (c.pendingArrestCount && c.pendingArrestCount > 0) {
          caseArrestPending = c.pendingArrestCount;
        } else if (c.pendingForArrest) {
          caseArrestPending = 1;
        } else if (casePersonToBeArrested > caseArrestCount) {
          caseArrestPending = casePersonToBeArrested - caseArrestCount;
        }
      }
      target.arrestPending += caseArrestPending;

      // 4. Notice Served (Sec 41A CrPC / Sec 35 BNSS Notice Served)
      let caseNoticeServed = 0;
      if (c.noticeServedCount && c.noticeServedCount > 0) {
        caseNoticeServed = c.noticeServedCount;
      } else if (c.anyPersonServedNotice) {
        caseNoticeServed = 1;
      }
      target.noticeServed += caseNoticeServed;
    });

    // Compute clearance % and IO 360° Composite Performance Index
    // NOTE: Pending cases or pending arrests have NO negative impact on performance score
    Object.values(map).forEach((io) => {
      io.disposalRate = io.casesGiven > 0 ? Math.round((io.casesDisposed / io.casesGiven) * 100) : 0;

      // Composite Index: 30% duty attendance + 30% case clearance + 25% arrests made + 15% promptness
      // Pending cases and pending arrests have 0 penalty on the performance score
      const dutyScore = Math.min(io.totalDuties * 8, 30);
      const clearanceScore = Math.round(io.disposalRate * 0.3);
      const arrestScore = Math.min(io.totalArrests * 6, 25);
      const timelinessScore = Math.max(15 - io.casesOverdue * 3, 0);

      io.performanceScore360 = Math.min(dutyScore + clearanceScore + arrestScore + timelinessScore, 100);
    });

    return Object.values(map);
  }, [scopedIOs, filteredReports, allLeaveEntries, filteredCases]);

  // Color Palettes
  const COLOR_PALETTE = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4',
    '#f97316', '#6366f1', '#14b8a6', '#ef4444', '#a855f7', '#64748b',
    '#0ea5e9', '#84cc16', '#e11d48', '#d946ef', '#22c55e', '#eab308'
  ];

  // Toggle single IO selection in checklist
  const toggleIOSelection = (ioName: string) => {
    setSelectedIOsForComparison((prev) =>
      prev.includes(ioName) ? prev.filter((n) => n !== ioName) : [...prev, ioName]
    );
  };

  const selectAllIOs = () => {
    setSelectedIOsForComparison(ioMasterComparisonList.map((i) => i.name));
  };

  const clearAllIOSelection = () => {
    setSelectedIOsForComparison([]);
  };

  const selectTopActiveIOs = (limit = 6) => {
    const top = [...ioMasterComparisonList]
      .sort((a, b) => b.totalDuties - a.totalDuties)
      .slice(0, limit)
      .map((i) => i.name);
    setSelectedIOsForComparison(top);
  };

  const selectTopArrestIOs = (limit = 6) => {
    const top = [...ioMasterComparisonList]
      .sort((a, b) => b.totalArrests - a.totalArrests)
      .slice(0, limit)
      .map((i) => i.name);
    setSelectedIOsForComparison(top);
  };

  // Filtered target list based on checklist selection
  const targetIOList = useMemo(() => {
    if (selectedIOsForComparison.length > 0) {
      return ioMasterComparisonList.filter((io) => selectedIOsForComparison.includes(io.name));
    }
    return ioMasterComparisonList;
  }, [ioMasterComparisonList, selectedIOsForComparison]);

  // =========================================================================
  // COMPUTE CHART DATA BASED ON SELECTED USER DIMENSION
  // =========================================================================
  const chartData = useMemo((): {
    title: string;
    subtitle: string;
    slices: ChartSliceData[];
    total: number;
    legendGuide?: { label: string; color: string }[];
  } => {
    let slices: ChartSliceData[] = [];
    let title = '';
    let subtitle = '';
    let legendGuide: { label: string; color: string }[] | undefined;

    // 1. IO vs DAY GASTI
    if (selectedSource === 'IO_VS_DAY_GASTI') {
      title = 'IO vs Day Gasti (Morning / Day Mobile Patrol)';
      subtitle = 'Comparative ranking of Day Gasti patrol shifts (06:00 - 14:00) served by Investigating Officers';
      legendGuide = [{ label: '🏃 Day Gasti Shifts', color: '#10b981' }];

      const total = targetIOList.reduce((a, b) => a + b.dayGasti, 0) || 1;
      slices = targetIOList
        .filter((io) => io.dayGasti > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.dayGasti - a.dayGasti)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.dayGasti,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.dayGasti / total) * 100),
          sublabel: `Day Gasti: ${io.dayGasti} shifts | Total Duties: ${io.totalDuties} [${io.ps}]`,
          metric1: { name: 'Day Gasti Shifts', val: io.dayGasti, color: '#10b981' },
        }));
      return { title, subtitle, slices, total };
    }

    // 2. IO vs EVENING GASTI
    if (selectedSource === 'IO_VS_EVENING_GASTI') {
      title = 'IO vs Evening Gasti (Day Mobile / Evening Patrol)';
      subtitle = 'Comparative ranking of Evening Gasti patrol shifts (14:00 - 22:00) served by Investigating Officers';
      legendGuide = [{ label: '🏃 Evening Gasti Shifts', color: '#06b6d4' }];

      const total = targetIOList.reduce((a, b) => a + b.eveGasti, 0) || 1;
      slices = targetIOList
        .filter((io) => io.eveGasti > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.eveGasti - a.eveGasti)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.eveGasti,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.eveGasti / total) * 100),
          sublabel: `Evening Gasti: ${io.eveGasti} shifts | Total Duties: ${io.totalDuties} [${io.ps}]`,
          metric1: { name: 'Evening Gasti Shifts', val: io.eveGasti, color: '#06b6d4' },
        }));
      return { title, subtitle, slices, total };
    }

    // 3. IO vs NIGHT GASTI
    if (selectedSource === 'IO_VS_NIGHT_GASTI') {
      title = 'IO vs Night Gasti (Night Nakabandi / Patrol)';
      subtitle = 'Comparative ranking of Night Gasti / Nakabandi shifts (22:00 - 06:00) served by Investigating Officers';
      legendGuide = [{ label: '🚔 Night Gasti Shifts', color: '#ef4444' }];

      const total = targetIOList.reduce((a, b) => a + b.nightGasti, 0) || 1;
      slices = targetIOList
        .filter((io) => io.nightGasti > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.nightGasti - a.nightGasti)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.nightGasti,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.nightGasti / total) * 100),
          sublabel: `Night Gasti: ${io.nightGasti} shifts | Total Duties: ${io.totalDuties} [${io.ps}]`,
          metric1: { name: 'Night Gasti Shifts', val: io.nightGasti, color: '#ef4444' },
        }));
      return { title, subtitle, slices, total };
    }

    // 4. IO vs OVERALL GASTI
    if (selectedSource === 'IO_VS_OVERALL_GASTI') {
      title = 'IO vs Overall Gasti (Total Patrolling Across All Shifts)';
      subtitle = 'Comparative ranking of total Gasti field patrols served by IOs across Day, Evening, and Night combined';
      legendGuide = [
        { label: 'Day Gasti', color: '#10b981' },
        { label: 'Evening Gasti', color: '#06b6d4' },
        { label: 'Night Gasti', color: '#ef4444' },
      ];

      const total = targetIOList.reduce((a, b) => a + b.totalGasti, 0) || 1;
      slices = targetIOList
        .filter((io) => io.totalGasti > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.totalGasti - a.totalGasti)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.totalGasti,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.totalGasti / total) * 100),
          sublabel: `Total Gasti: ${io.totalGasti} (Day: ${io.dayGasti} | Eve: ${io.eveGasti} | Night: ${io.nightGasti}) [${io.ps}]`,
          metric1: { name: 'Day Gasti', val: io.dayGasti, color: '#10b981' },
          metric2: { name: 'Evening Gasti', val: io.eveGasti, color: '#06b6d4' },
          metric3: { name: 'Night Gasti', val: io.nightGasti, color: '#ef4444' },
        }));
      return { title, subtitle, slices, total, legendGuide };
    }

    // 5. IO vs DAY OD
    if (selectedSource === 'IO_VS_DAY_OD') {
      title = 'IO vs Day OD (06:00 - 14:00 Station Desk Duty)';
      subtitle = 'Comparative ranking of Day Officer-on-Duty (OD 1) shifts served at police station desk';
      legendGuide = [{ label: '☀️ Day OD 1 Shifts', color: '#3b82f6' }];

      const total = targetIOList.reduce((a, b) => a + b.dayOD, 0) || 1;
      slices = targetIOList
        .filter((io) => io.dayOD > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.dayOD - a.dayOD)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.dayOD,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.dayOD / total) * 100),
          sublabel: `Day OD: ${io.dayOD} shifts | Total Duties: ${io.totalDuties} [${io.ps}]`,
          metric1: { name: 'Day OD Shifts', val: io.dayOD, color: '#3b82f6' },
        }));
      return { title, subtitle, slices, total };
    }

    // 6. IO vs EVENING OD
    if (selectedSource === 'IO_VS_EVENING_OD') {
      title = 'IO vs Evening OD (14:00 - 22:00 Station Desk Duty)';
      subtitle = 'Comparative ranking of Evening Officer-on-Duty (OD 2) shifts served at police station desk';
      legendGuide = [{ label: '🌆 Evening OD 2 Shifts', color: '#f59e0b' }];

      const total = targetIOList.reduce((a, b) => a + b.eveOD, 0) || 1;
      slices = targetIOList
        .filter((io) => io.eveOD > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.eveOD - a.eveOD)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.eveOD,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.eveOD / total) * 100),
          sublabel: `Evening OD: ${io.eveOD} shifts | Total Duties: ${io.totalDuties} [${io.ps}]`,
          metric1: { name: 'Evening OD Shifts', val: io.eveOD, color: '#f59e0b' },
        }));
      return { title, subtitle, slices, total };
    }

    // 7. IO vs NIGHT OD
    if (selectedSource === 'IO_VS_NIGHT_OD') {
      title = 'IO vs Night OD (22:00 - 06:00 Station Desk Duty)';
      subtitle = 'Comparative ranking of Night Officer-on-Duty (OD 3) shifts served at police station desk';
      legendGuide = [{ label: '🌙 Night OD 3 Shifts', color: '#8b5cf6' }];

      const total = targetIOList.reduce((a, b) => a + b.nightOD, 0) || 1;
      slices = targetIOList
        .filter((io) => io.nightOD > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.nightOD - a.nightOD)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.nightOD,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.nightOD / total) * 100),
          sublabel: `Night OD: ${io.nightOD} shifts | Total Duties: ${io.totalDuties} [${io.ps}]`,
          metric1: { name: 'Night OD Shifts', val: io.nightOD, color: '#8b5cf6' },
        }));
      return { title, subtitle, slices, total };
    }

    // 8. IO vs OVERALL OD
    if (selectedSource === 'IO_VS_OVERALL_OD') {
      title = 'IO vs Overall OD (Total Station Desk Duties Across All Shifts)';
      subtitle = 'Comparative ranking of total Officer-on-Duty desk shifts served by IOs across Day, Evening, and Night combined';
      legendGuide = [
        { label: 'Day OD 1', color: '#3b82f6' },
        { label: 'Evening OD 2', color: '#f59e0b' },
        { label: 'Night OD 3', color: '#8b5cf6' },
      ];

      const total = targetIOList.reduce((a, b) => a + b.totalOD, 0) || 1;
      slices = targetIOList
        .filter((io) => io.totalOD > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.totalOD - a.totalOD)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.totalOD,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.totalOD / total) * 100),
          sublabel: `Total OD: ${io.totalOD} (Day: ${io.dayOD} | Eve: ${io.eveOD} | Night: ${io.nightOD}) [${io.ps}]`,
          metric1: { name: 'Day OD 1', val: io.dayOD, color: '#3b82f6' },
          metric2: { name: 'Evening OD 2', val: io.eveOD, color: '#f59e0b' },
          metric3: { name: 'Night OD 3', val: io.nightOD, color: '#8b5cf6' },
        }));
      return { title, subtitle, slices, total, legendGuide };
    }

    // 9. SUBDIVISION-WISE COMPARISON
    if (selectedSource === 'SUBDIVISION_COMPARISON') {
      title = 'Subdivision-Wise Workload & Case Clearance Comparison';
      subtitle = 'Inter-subdivision comparison of registered cases, disposal clearance %, pending backlog, and field duties';
      legendGuide = [
        { label: 'Cases Given', color: '#3b82f6' },
        { label: 'Disposed Cases', color: '#10b981' },
        { label: 'Pending Cases', color: '#f59e0b' },
      ];

      const subdivStats: Record<
        string,
        {
          name: string;
          given: number;
          disposed: number;
          pending: number;
          overdue: number;
        }
      > = {};

      filteredCases.forEach((c) => {
        const subdiv = c.subdivision || psToSubdivisionMap.get(c.ps.toLowerCase()) || 'General Subdivision';
        if (!subdivStats[subdiv]) {
          subdivStats[subdiv] = { name: subdiv, given: 0, disposed: 0, pending: 0, overdue: 0 };
        }
        subdivStats[subdiv].given++;
        if (
          c.status === 'Chargesheeted / Final Form Submitted' ||
          c.status === 'Disposed' ||
          c.status === 'Chargesheeted / Final Form Submitted / Mistake of Fact' ||
          c.status === 'False Case / Mistake of Fact'
        ) {
          subdivStats[subdiv].disposed++;
        } else {
          subdivStats[subdiv].pending++;
        }
        if (getDeadlineInfo(c).code === 'OVERDUE') subdivStats[subdiv].overdue++;
      });

      const totalCases = filteredCases.length || 1;
      slices = Object.values(subdivStats)
        .sort((a, b) => b.given - a.given)
        .map((sd, idx) => {
          const rate = sd.given > 0 ? Math.round((sd.disposed / sd.given) * 100) : 0;
          return {
            label: `${sd.name} Subdivision`,
            value: sd.given,
            color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
            percentage: Math.round((sd.given / totalCases) * 100),
            sublabel: `Given: ${sd.given} | ✅ Disposed: ${sd.disposed} (${rate}%) | ⏳ Pending: ${sd.pending} | ⚠️ Overdue: ${sd.overdue}`,
            metric1: { name: 'Given', val: sd.given, color: '#3b82f6' },
            metric2: { name: 'Disposed', val: sd.disposed, color: '#10b981' },
            metric3: { name: 'Pending', val: sd.pending, color: '#f59e0b' },
          };
        });

      return { title, subtitle, slices, total: filteredCases.length, legendGuide };
    }

    // 10. CRIME HEAD WISE REPORTING
    if (selectedSource === 'CRIME_HEAD_REPORTING') {
      title = 'Crime Head-Wise Reporting (Case Registration Incidence)';
      subtitle = 'Distribution and frequency of registered cases categorized by statutory crime heads in selected period';

      const counts: Record<string, number> = {};
      filteredCases.forEach((c) => {
        const head = c.crimeHead || 'Other / General IPC & BNS';
        counts[head] = (counts[head] || 0) + 1;
      });

      const totalCases = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      slices = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 16)
        .map(([head, count], idx) => ({
          label: head,
          value: count,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((count / totalCases) * 100),
          sublabel: `Registered: ${count} cases (${Math.round((count / totalCases) * 100)}% of reported crime)`,
          metric1: { name: 'Registered Cases', val: count, color: COLOR_PALETTE[idx % COLOR_PALETTE.length] },
        }));
      return { title, subtitle, slices, total: totalCases };
    }

    // 8. CRIME HEAD WISE DISPOSAL & CLEARANCE
    if (selectedSource === 'CRIME_HEAD_DISPOSAL') {
      title = 'Crime Head-Wise Case Disposal & Clearance Rate %';
      subtitle = 'Comparison of chargesheet / final form disposal velocity and clearance rate across different crime categories';
      legendGuide = [
        { label: '✅ Disposed Cases', color: '#10b981' },
        { label: '⏳ Pending Cases', color: '#f59e0b' },
      ];

      const headMap: Record<string, { total: number; disposed: number; pending: number }> = {};
      filteredCases.forEach((c) => {
        const head = c.crimeHead || 'General IPC / BNS';
        if (!headMap[head]) headMap[head] = { total: 0, disposed: 0, pending: 0 };
        headMap[head].total++;
        if (
          c.status === 'Chargesheeted / Final Form Submitted' ||
          c.status === 'Disposed' ||
          c.status === 'Chargesheeted / Final Form Submitted / Mistake of Fact' ||
          c.status === 'False Case / Mistake of Fact'
        ) {
          headMap[head].disposed++;
        } else {
          headMap[head].pending++;
        }
      });

      slices = Object.entries(headMap)
        .filter(([_, d]) => d.total >= 1)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 14)
        .map(([head, d], idx) => {
          const rate = Math.round((d.disposed / d.total) * 100);
          return {
            label: head,
            value: rate,
            color: rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444',
            percentage: rate,
            sublabel: `Total: ${d.total} | ✅ Disposed: ${d.disposed} | ⏳ Pending: ${d.pending} (${rate}% Clearance)`,
            metric1: { name: 'Disposed', val: d.disposed, color: '#10b981' },
            metric2: { name: 'Pending', val: d.pending, color: '#f59e0b' },
          };
        });
      return { title, subtitle, slices, total: filteredCases.length, legendGuide };
    }

    // 9. IO 360° COMPOSITE PERFORMANCE COMPARISON
    if (selectedSource === 'IO_360_PERFORMANCE') {
      title = 'IO 360° Comprehensive Performance Index (Composite 0-100 Score)';
      subtitle = 'Holistic evaluation benchmark combining Shift Attendance (OD+Gasti), Accused Arrests, Case Disposal %, and Investigation Timeliness';
      legendGuide = [
        { label: 'Duties Served', color: '#6366f1' },
        { label: 'Arrests Made', color: '#ef4444' },
        { label: 'Disposed Cases', color: '#10b981' },
      ];

      slices = targetIOList
        .sort((a, b) => b.performanceScore360 - a.performanceScore360 || b.totalDuties - a.totalDuties)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.performanceScore360,
          color: io.performanceScore360 >= 75 ? '#10b981' : io.performanceScore360 >= 50 ? '#3b82f6' : '#f59e0b',
          percentage: io.performanceScore360,
          sublabel: `Score: ${io.performanceScore360}/100 | Duties: ${io.totalDuties} | Arrests: ${io.totalArrests} | Disposed: ${io.casesDisposed}/${io.casesGiven} [${io.ps}]`,
          metric1: { name: 'Total Duties', val: io.totalDuties, color: '#6366f1' },
          metric2: { name: 'Accused Arrests', val: io.totalArrests, color: '#ef4444' },
          metric3: { name: 'Cases Disposed', val: io.casesDisposed, color: '#10b981' },
        }));
      return { title, subtitle, slices, total: targetIOList.length, legendGuide };
    }

    // 10. IO ARRESTS COMPARISON
    if (selectedSource === 'IO_ARRESTS_COMPARISON') {
      title = 'IO-Wise Accused Arresting Comparison (Forwarded to Court)';
      subtitle = 'Comparative ranking of total accused arrests made, accused to be arrested, and pending arrests across Investigating Officers';
      legendGuide = [
        { label: '🎯 To Be Arrested', color: '#f59e0b' },
        { label: '✅ Arrests Made', color: '#10b981' },
        { label: '⏳ Arrest Pending', color: '#ef4444' },
      ];

      const totalArrests = targetIOList.reduce((a, b) => a + b.totalArrests, 0) || 1;
      slices = targetIOList
        .filter((io) => io.totalArrests > 0 || io.personToBeArrested > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.totalArrests - a.totalArrests || b.personToBeArrested - a.personToBeArrested)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.totalArrests,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.totalArrests / totalArrests) * 100),
          sublabel: `Arrests Made: ${io.totalArrests}/${io.personToBeArrested || io.totalArrests} to be arrested | Pending: ${io.arrestPending} | Notices: ${io.noticeServed} [${io.ps}]`,
          metric1: { name: 'To Be Arrested', val: io.personToBeArrested, color: '#f59e0b' },
          metric2: { name: 'Arrests Made', val: io.totalArrests, color: '#10b981' },
          metric3: { name: 'Pending Arrests', val: io.arrestPending, color: '#ef4444' },
        }));
      return { title, subtitle, slices, total: targetIOList.reduce((a, b) => a + b.totalArrests, 0), legendGuide };
    }

    // 11. IO CASE DISPOSAL
    if (selectedSource === 'IO_CASE_DISPOSAL') {
      title = 'IO-Wise Case Disposal & Workload Clearance';
      subtitle = 'Investigation clearance benchmark: Cases Allotted vs Disposed (SR / Non-SR) vs Active Pending (SR / Non-SR)';
      legendGuide = [
        { label: 'Cases Given', color: '#3b82f6' },
        { label: 'Cases Disposed', color: '#10b981' },
        { label: 'Cases Pending', color: '#f59e0b' },
      ];

      slices = targetIOList
        .filter((io) => io.casesGiven > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.casesDisposed - a.casesDisposed || b.casesGiven - a.casesGiven)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.casesDisposed,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.casesDisposed / (targetIOList.reduce((a, b) => a + b.casesDisposed, 0) || 1)) * 100),
          sublabel: `Disposed: ${io.casesDisposed} (${io.casesDisposedSR} SR / ${io.casesDisposedNonSR} NSR) | Pending: ${io.casesPending} (${io.casesPendingSR} SR / ${io.casesPendingNonSR} NSR) | ${io.disposalRate}% Clearance`,
          metric1: { name: 'Cases Given', val: io.casesGiven, color: '#3b82f6' },
          metric2: { name: 'Cases Disposed', val: io.casesDisposed, color: '#10b981' },
          metric3: { name: 'Cases Pending', val: io.casesPending, color: '#f59e0b' },
        }));
      return { title, subtitle, slices, total: targetIOList.reduce((a, b) => a + b.casesDisposed, 0), legendGuide };
    }

    // 12. IO LEAVES AVAILED
    if (selectedSource === 'IO_LEAVES_AVAILED') {
      title = 'IO-Wise Leave Availed & Consumed Days';
      subtitle = 'Comparison of sanctioned leave days availed across Casual Leave (CL), Compensatory (CPL), and Other Leaves';
      legendGuide = [
        { label: 'CL Days', color: '#f59e0b' },
        { label: 'CPL Days', color: '#3b82f6' },
        { label: 'Other Days', color: '#ec4899' },
      ];

      const totalLeaves = targetIOList.reduce((a, b) => a + b.leaveDaysConsumed, 0) || 1;
      slices = targetIOList
        .filter((io) => io.leaveDaysConsumed > 0 || selectedIOsForComparison.includes(io.name))
        .sort((a, b) => b.leaveDaysConsumed - a.leaveDaysConsumed)
        .slice(0, 16)
        .map((io, idx) => ({
          label: `${io.name} (${io.rank})`,
          value: io.leaveDaysConsumed,
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          percentage: Math.round((io.leaveDaysConsumed / totalLeaves) * 100),
          sublabel: `CL: ${io.clDays}d | CPL: ${io.cplDays}d | Other: ${io.otherLeaveDays}d${io.isOnLeaveNow ? ' [Currently ON LEAVE]' : ''}`,
          metric1: { name: 'CL Days', val: io.clDays, color: '#f59e0b' },
          metric2: { name: 'CPL Days', val: io.cplDays, color: '#3b82f6' },
          metric3: { name: 'Other Days', val: io.otherLeaveDays, color: '#ec4899' },
        }));
      return { title, subtitle, slices, total: totalLeaves, legendGuide };
    }

    return { title: '', subtitle: '', slices: [], total: 0 };
  }, [selectedSource, targetIOList, filteredCases, selectedIOsForComparison]);

  const maxSliceValue = Math.max(...chartData.slices.map((s) => s.value), 1);

  // =========================================================================
  // ADVANCED GRAPH 1: POLAR AREA / NIGHTINGALE ROSE CHART (SVG)
  // =========================================================================
  const polarRoseChartSVG = useMemo(() => {
    const slices = chartData.slices.slice(0, 12);
    if (slices.length === 0) return null;

    const cx = 150;
    const cy = 150;
    const maxR = 110;
    const minR = 20;
    const numSlices = slices.length;
    const anglePerSlice = (2 * Math.PI) / numSlices;

    return (
      <svg viewBox="0 0 300 300" className="w-64 h-64 sm:w-72 sm:h-72 drop-shadow-md">
        {/* Background Concentric Guideline Rings */}
        {[0.25, 0.5, 0.75, 1.0].map((lvl, idx) => (
          <circle
            key={`polar-ring-${idx}`}
            cx={cx}
            cy={cy}
            r={minR + (maxR - minR) * lvl}
            className="fill-none stroke-slate-200 dark:stroke-slate-700"
            strokeWidth={1}
            strokeDasharray={lvl < 1 ? '2 2' : 'none'}
          />
        ))}

        {/* Rose Petal Slices */}
        {slices.map((slice, idx) => {
          const r = minR + (maxR - minR) * (slice.value / maxSliceValue);
          const startAngle = idx * anglePerSlice - Math.PI / 2;
          const endAngle = (idx + 1) * anglePerSlice - Math.PI / 2;

          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);

          const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
          const isHovered = hoveredSlice?.label === slice.label;

          return (
            <path
              key={`rose-${slice.label}`}
              d={pathData}
              fill={slice.color}
              fillOpacity={isHovered ? 0.95 : 0.75}
              stroke="white"
              strokeWidth={1.5}
              className="transition-all duration-300 cursor-pointer hover:opacity-100"
              style={{
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: `${cx}px ${cy}px`,
              }}
              onMouseEnter={(e) => {
                setHoveredSlice(slice);
                showTooltip(e, {
                  title: slice.label,
                  value: slice.value,
                  percentage: slice.percentage,
                  sublabel: slice.sublabel,
                  badge: `Rank #${idx + 1}`,
                  metrics: [
                    ...(slice.metric1 ? [{ name: slice.metric1.name, val: slice.metric1.val, color: slice.metric1.color }] : []),
                    ...(slice.metric2 ? [{ name: slice.metric2.name, val: slice.metric2.val, color: slice.metric2.color }] : []),
                    ...(slice.metric3 ? [{ name: slice.metric3.name, val: slice.metric3.val, color: slice.metric3.color }] : []),
                  ],
                });
              }}
              onMouseMove={updateTooltipPos}
              onMouseLeave={() => {
                setHoveredSlice(null);
                hideTooltip();
              }}
            >
              <title>{`${slice.label}: ${slice.value}`}</title>
            </path>
          );
        })}

        {/* Center Rose Hub */}
        <circle cx={cx} cy={cy} r={minR - 4} className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700 stroke-1" />
        <text x={cx} y={cy + 3} textAnchor="middle" className="text-[9px] font-black fill-slate-800 dark:fill-white">
          🌹 Rose
        </text>
      </svg>
    );
  }, [chartData, hoveredSlice, maxSliceValue]);

  // =========================================================================
  // ADVANCED GRAPH 2: MULTI-AXIS RADAR / SPIDER WEB CHART (SVG)
  // =========================================================================
  const radarChartSVG = useMemo(() => {
    const officersToCompare = targetIOList.slice(0, 6);
    if (officersToCompare.length === 0) return null;

    const axes = [
      { key: 'dayGasti', label: 'Day Gasti', max: Math.max(...targetIOList.map((i) => i.dayGasti), 1) },
      { key: 'eveGasti', label: 'Eve Gasti', max: Math.max(...targetIOList.map((i) => i.eveGasti), 1) },
      { key: 'nightGasti', label: 'Night Gasti', max: Math.max(...targetIOList.map((i) => i.nightGasti), 1) },
      { key: 'dayOD', label: 'Day OD', max: Math.max(...targetIOList.map((i) => i.dayOD), 1) },
      { key: 'eveOD', label: 'Eve OD', max: Math.max(...targetIOList.map((i) => i.eveOD), 1) },
      { key: 'nightOD', label: 'Night OD', max: Math.max(...targetIOList.map((i) => i.nightOD), 1) },
      { key: 'totalArrests', label: 'Arrests', max: Math.max(...targetIOList.map((i) => i.totalArrests), 1) },
      { key: 'casesDisposed', label: 'Disposed', max: Math.max(...targetIOList.map((i) => i.casesDisposed), 1) },
    ];

    const cx = 175;
    const cy = 175;
    const r = 115;
    const numAxes = axes.length;
    const angleStep = (2 * Math.PI) / numAxes;

    return (
      <div className="flex flex-col items-center justify-center p-2">
        <svg viewBox="0 0 350 350" className="w-full max-w-[340px] sm:max-w-[380px] drop-shadow-sm">
          {[0.25, 0.5, 0.75, 1.0].map((lvl, idx) => {
            const points = axes
              .map((_, aIdx) => {
                const angle = aIdx * angleStep - Math.PI / 2;
                const x = cx + r * lvl * Math.cos(angle);
                const y = cy + r * lvl * Math.sin(angle);
                return `${x},${y}`;
              })
              .join(' ');
            return (
              <polygon
                key={`radar-grid-${idx}`}
                points={points}
                className="fill-none stroke-slate-200 dark:stroke-slate-700"
                strokeWidth={1}
                strokeDasharray={lvl < 1 ? '2 2' : 'none'}
              />
            );
          })}

          {axes.map((axis, aIdx) => {
            const angle = aIdx * angleStep - Math.PI / 2;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            const labelX = cx + (r + 18) * Math.cos(angle);
            const labelY = cy + (r + 18) * Math.sin(angle) + 3;

            return (
              <g key={`radar-axis-${axis.key}`}>
                <line x1={cx} y1={cy} x2={x} y2={y} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth={1} />
                <text x={labelX} y={labelY} textAnchor="middle" className="text-[9px] font-bold fill-slate-600 dark:fill-slate-400 select-none">
                  {axis.label}
                </text>
              </g>
            );
          })}

          {officersToCompare.map((io, oIdx) => {
            const color = COLOR_PALETTE[oIdx % COLOR_PALETTE.length];
            const vertexPoints: { x: number; y: number; val: number; axisLabel: string }[] = [];
            const points = axes
              .map((axis, aIdx) => {
                const rawVal = (io as any)[axis.key] || 0;
                const normalized = Math.min(rawVal / axis.max, 1.0);
                const effectiveRatio = normalized > 0 ? 0.08 + normalized * 0.92 : 0.03;
                const angle = aIdx * angleStep - Math.PI / 2;
                const x = cx + r * effectiveRatio * Math.cos(angle);
                const y = cy + r * effectiveRatio * Math.sin(angle);
                vertexPoints.push({ x, y, val: rawVal, axisLabel: axis.label });
                return `${x},${y}`;
              })
              .join(' ');

            return (
              <g
                key={`radar-poly-${io.name}`}
                className="cursor-pointer"
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    title: `${io.name} (${io.rank})`,
                    subtitle: `Station: ${io.ps} | 360° Score: ${io.performanceScore360}/100`,
                    value: `${io.totalDuties} Total Duties Served`,
                    sublabel: `Day Gasti: ${io.dayGasti} | Eve Gasti: ${io.eveGasti} | Night Gasti: ${io.nightGasti} | Day OD: ${io.dayOD} | Eve OD: ${io.eveOD} | Night OD: ${io.nightOD} | Arrests: ${io.totalArrests} | Disposed: ${io.casesDisposed}`,
                    badge: `${io.disposalRate}% Clearance`,
                    metrics: [
                      { name: 'Total Duties', val: io.totalDuties, color: '#6366f1' },
                      { name: 'Total Arrests', val: io.totalArrests, color: '#ef4444' },
                      { name: 'Disposed Cases', val: io.casesDisposed, color: '#10b981' },
                      { name: '360° Score', val: io.performanceScore360, color: '#8b5cf6' },
                    ],
                  })
                }
                onMouseMove={updateTooltipPos}
                onMouseLeave={hideTooltip}
              >
                <polygon
                  points={points}
                  fill={color}
                  fillOpacity={0.25}
                  stroke={color}
                  strokeWidth={2}
                  className="transition-all hover:fill-opacity-50"
                />
                {vertexPoints.map((vp, vIdx) => (
                  <circle
                    key={`vp-${io.name}-${vIdx}`}
                    cx={vp.x}
                    cy={vp.y}
                    r={3.5}
                    fill={color}
                    stroke="white"
                    strokeWidth={1}
                    className="hover:r-5 transition-all"
                  />
                ))}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-3 max-w-md">
          {officersToCompare.map((io, idx) => (
            <div
              key={io.name}
              onMouseEnter={(e) =>
                showTooltip(e, {
                  title: `${io.name} (${io.rank})`,
                  subtitle: `Station: ${io.ps} | 360° Score: ${io.performanceScore360}/100`,
                  value: `${io.totalDuties} Total Duties`,
                  sublabel: `Gasti: ${io.dayGasti + io.eveGasti + io.nightGasti} | OD: ${io.dayOD + io.eveOD + io.nightOD} | Arrests: ${io.totalArrests} | Disposed: ${io.casesDisposed}`,
                  badge: `${io.disposalRate}% Clearance`,
                })
              }
              onMouseMove={updateTooltipPos}
              onMouseLeave={hideTooltip}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-400 transition"
            >
              <span className="w-2.5 h-2.5 rounded-full ring-1 ring-white" style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }} />
              <span className="truncate max-w-[130px]">{io.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }, [targetIOList]);

  // =========================================================================
  // GRAPH: PIE & DONUT CHART (SVG)
  // =========================================================================
  const pieChartSVG = useMemo(() => {
    const slices = chartData.slices;
    const total = slices.reduce((acc, s) => acc + s.value, 0);
    if (total === 0) return null;

    let cumulativeAngle = 0;
    const radius = 100;
    const center = 120;
    const innerRadius = 55;

    return (
      <svg viewBox="0 0 240 240" className="w-56 h-56 sm:w-64 sm:h-64 drop-shadow-md">
        {slices.map((slice, sIdx) => {
          const sliceAngle = (slice.value / total) * 360;
          const startAngle = cumulativeAngle;
          const endAngle = cumulativeAngle + sliceAngle;
          cumulativeAngle += sliceAngle;

          const startRad = ((startAngle - 90) * Math.PI) / 180;
          const endRad = ((endAngle - 90) * Math.PI) / 180;

          const x1 = center + radius * Math.cos(startRad);
          const y1 = center + radius * Math.sin(startRad);
          const x2 = center + radius * Math.cos(endRad);
          const y2 = center + radius * Math.sin(endRad);

          const ix1 = center + innerRadius * Math.cos(endRad);
          const iy1 = center + innerRadius * Math.sin(endRad);
          const ix2 = center + innerRadius * Math.cos(startRad);
          const iy2 = center + innerRadius * Math.sin(startRad);

          const largeArc = sliceAngle > 180 ? 1 : 0;
          const pathData =
            slices.length === 1
              ? `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.01} ${center - radius} M ${center} ${center - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${center - 0.01} ${center - innerRadius} Z`
              : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

          const isHovered = hoveredSlice?.label === slice.label;

          return (
            <path
              key={slice.label}
              d={pathData}
              fill={slice.color}
              className="transition-all duration-300 cursor-pointer hover:opacity-90 stroke-white dark:stroke-slate-900 stroke-2"
              style={{
                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                transformOrigin: `${center}px ${center}px`,
              }}
              onMouseEnter={(e) => {
                setHoveredSlice(slice);
                showTooltip(e, {
                  title: slice.label,
                  value: slice.value,
                  percentage: slice.percentage,
                  sublabel: slice.sublabel,
                  badge: `Rank #${sIdx + 1}`,
                  metrics: [
                    ...(slice.metric1 ? [{ name: slice.metric1.name, val: slice.metric1.val, color: slice.metric1.color }] : []),
                    ...(slice.metric2 ? [{ name: slice.metric2.name, val: slice.metric2.val, color: slice.metric2.color }] : []),
                    ...(slice.metric3 ? [{ name: slice.metric3.name, val: slice.metric3.val, color: slice.metric3.color }] : []),
                  ],
                });
              }}
              onMouseMove={updateTooltipPos}
              onMouseLeave={() => {
                setHoveredSlice(null);
                hideTooltip();
              }}
            />
          );
        })}

        <circle cx={center} cy={center} r={innerRadius - 4} className="fill-white dark:fill-slate-900" />
        <text x={center} y={center - 6} textAnchor="middle" className="text-[10px] font-bold fill-slate-400 uppercase">
          Total
        </text>
        <text x={center} y={center + 14} textAnchor="middle" className="text-base font-black fill-slate-900 dark:fill-white tabular-nums">
          {chartData.total}
        </text>
      </svg>
    );
  }, [chartData, hoveredSlice]);

  // Sorted list for master table
  const sortedIOMasterList = useMemo(() => {
    return [...targetIOList].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });
  }, [targetIOList, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportDataCSV = () => {
    const headers = [
      'Officer Name',
      'Rank',
      'Station',
      'Day Gasti',
      'Evening Gasti',
      'Night Gasti',
      'Day OD',
      'Evening OD',
      'Night OD',
      'Total Duties',
      'Person To Be Arrested',
      'Total Arrests Made',
      'Arrests Pending',
      'Notice Served (41A/35)',
      'Total Cases Given',
      'Cases Disposed (Total)',
      'Disposed (SR)',
      'Disposed (Non-SR)',
      'Cases Pending (Total)',
      'Pending (SR)',
      'Pending (Non-SR)',
      'Clearance %',
      '360 Score',
    ];
    const rows = sortedIOMasterList.map((io) => [
      io.name,
      io.rank,
      io.ps,
      io.dayGasti,
      io.eveGasti,
      io.nightGasti,
      io.dayOD,
      io.eveOD,
      io.nightOD,
      io.totalDuties,
      io.personToBeArrested,
      io.totalArrests,
      io.arrestPending,
      io.noticeServed,
      io.casesGiven,
      io.casesDisposed,
      io.casesDisposedSR,
      io.casesDisposedNonSR,
      io.casesPending,
      io.casesPendingSR,
      io.casesPendingNonSR,
      `${io.disposalRate}%`,
      `${io.performanceScore360}/100`,
    ]);
    exportToExcel(`Officer_Shift_Duty_Comparison_${selectedSource}_${timePreset}`, headers, rows);
  };

  const psList = useMemo(() => {
    let stations = availablePoliceStations;
    if (selectedSubdivision !== 'ALL') {
      stations = stations.filter(
        (p) => (p.subdivisionName || '').toLowerCase() === selectedSubdivision.toLowerCase()
      );
    }
    if (stations.length > 0) return Array.from(new Set(stations.map((p) => p.name)));
    return Array.from(
      new Set(
        cases
          .filter(
            (c) =>
              selectedSubdivision === 'ALL' ||
              (c.subdivision || psToSubdivisionMap.get(c.ps.toLowerCase()) || '').toLowerCase() ===
                selectedSubdivision.toLowerCase()
          )
          .map((c) => c.ps)
      )
    );
  }, [availablePoliceStations, cases, selectedSubdivision, psToSubdivisionMap]);

  return (
    <div className="space-y-3.5">
      {/* Top Banner (50% less vertically wide) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 py-2.5 px-4 rounded-xl border border-indigo-500/30 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shrink-0">
            <Activity className="w-4 h-4 text-indigo-400" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-white truncate">
                Inter-Officer Shift, OD, Gasti, Arrest & Crime Head Analytics
              </h3>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                360° Hub
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate hidden sm:block">
              Direct comparisons: IO vs Day/Eve/Night Gasti & OD, Crime Reporting, Disposals, and 360° Scores.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportDataCSV}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Primary Selector: 15 User-Requested Dimensions (50% less vertically wide) */}
      <div className="bg-white dark:bg-slate-900 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Comparison Dimension:</span>
          </span>

          {/* 8 Advanced Graph Types Selector */}
          <div className="flex flex-wrap items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setChartType('MULTI_BAR')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                chartType === 'MULTI_BAR' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Vertical Multi-Bar Comparative Chart"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Multi-Bar</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('LOLLIPOP_RANKING')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                chartType === 'LOLLIPOP_RANKING' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Horizontal Lollipop / Stem-and-Leaf Ranking Chart"
            >
              <BarChart2 className="w-3 h-3 rotate-90" />
              <span>Lollipop</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('RADAR_SPIDER')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                chartType === 'RADAR_SPIDER' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Multi-Axis Polygon Radar / Spider Chart"
            >
              <Crosshair className="w-3 h-3" />
              <span>Radar Web</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('POLAR_ROSE')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                chartType === 'POLAR_ROSE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Polar Area / Nightingale Rose Chart"
            >
              <Disc className="w-3 h-3" />
              <span>Polar Rose</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('TREEMAP_SPECTRUM')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                chartType === 'TREEMAP_SPECTRUM' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Area Spectrum Treemap Tiles"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Treemap Tiles</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('HEATMAP_MATRIX')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                chartType === 'HEATMAP_MATRIX' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Duty & Arrest Density Heatmap Matrix Grid"
            >
              <Grid className="w-3 h-3" />
              <span>Heatmap Grid</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('PIE_DONUT')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                chartType === 'PIE_DONUT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Pie & Donut Chart"
            >
              <PieChartIcon className="w-3 h-3" />
              <span>Donut</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('SIDE_BY_SIDE')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                chartType === 'SIDE_BY_SIDE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Side-by-Side Breakdown Cards"
            >
              <Layers className="w-3 h-3" />
              <span>Cards</span>
            </button>
          </div>
        </div>

        {/* Dimension Selection Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-1.5">
          {/* 0. Crime Spectrum Comparison (PS Wise / Multi-Crime / Multi-Jurisdiction) */}
          <button
            type="button"
            onClick={() => setSelectedSource('CRIME_SPECTRUM_COMPARISON')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer col-span-2 sm:col-span-1 ${
              selectedSource === 'CRIME_SPECTRUM_COMPARISON'
                ? 'bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white border-rose-500 shadow-sm ring-1 ring-rose-300'
                : 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Disc className="w-3.5 h-3.5 text-rose-300" />
              <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-white/20 text-white">Spectrum</span>
            </div>
            <span className="font-black text-[10px] leading-tight">Multi-PS Crime Spectrum</span>
          </button>

          {/* 1. IO vs Day Gasti */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_VS_DAY_GASTI')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_VS_DAY_GASTI'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Sun className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-[8px] font-black uppercase opacity-80">06:00-14:00</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO vs Day Gasti</span>
          </button>

          {/* 2. IO vs Evening Gasti */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_VS_EVENING_GASTI')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_VS_EVENING_GASTI'
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs ring-1 ring-cyan-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Sunset className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-[8px] font-black uppercase opacity-80">14:00-22:00</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO vs Eve Gasti</span>
          </button>

          {/* 3. IO vs Night Gasti */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_VS_NIGHT_GASTI')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_VS_NIGHT_GASTI'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-1 ring-rose-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Moon className="w-3.5 h-3.5 text-rose-300" />
              <span className="text-[8px] font-black uppercase opacity-80">22:00-06:00</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO vs Night Gasti</span>
          </button>

          {/* 4. IO vs Overall Gasti */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_VS_OVERALL_GASTI')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_VS_OVERALL_GASTI'
                ? 'bg-teal-600 text-white border-teal-600 shadow-xs ring-1 ring-teal-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Compass className="w-3.5 h-3.5 text-teal-300" />
              <span className="text-[8px] font-black uppercase opacity-80">All Patrols</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO vs Overall Gasti</span>
          </button>

          {/* 5. IO vs Day OD */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_VS_DAY_OD')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_VS_DAY_OD'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Shield className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-[8px] font-black uppercase opacity-80">06:00-14:00</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO vs Day OD</span>
          </button>

          {/* 6. IO vs Evening OD */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_VS_EVENING_OD')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_VS_EVENING_OD'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-1 ring-amber-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[8px] font-black uppercase opacity-80">14:00-22:00</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO vs Eve OD</span>
          </button>

          {/* 7. IO vs Night OD */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_VS_NIGHT_OD')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_VS_NIGHT_OD'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-1 ring-purple-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Shield className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-[8px] font-black uppercase opacity-80">22:00-06:00</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO vs Night OD</span>
          </button>

          {/* 8. IO vs Overall OD */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_VS_OVERALL_OD')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_VS_OVERALL_OD'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-1 ring-indigo-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Clock className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-[8px] font-black uppercase opacity-80">All Desk</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO vs Overall OD</span>
          </button>

          {/* 9. Subdivision Comparison */}
          <button
            type="button"
            onClick={() => setSelectedSource('SUBDIVISION_COMPARISON')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'SUBDIVISION_COMPARISON'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white border-blue-600 shadow-xs ring-1 ring-blue-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Building2 className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-[8px] font-black uppercase opacity-80">Subdivisions</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">Subdivision Comp</span>
          </button>

          {/* 10. Crime Head Reporting */}
          <button
            type="button"
            onClick={() => setSelectedSource('CRIME_HEAD_REPORTING')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'CRIME_HEAD_REPORTING'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-1 ring-indigo-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <FileText className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-[8px] font-black uppercase opacity-80">Incidence</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">Crime Reporting</span>
          </button>

          {/* 11. Crime Head Disposal */}
          <button
            type="button"
            onClick={() => setSelectedSource('CRIME_HEAD_DISPOSAL')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'CRIME_HEAD_DISPOSAL'
                ? 'bg-teal-600 text-white border-teal-600 shadow-xs ring-1 ring-teal-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Scale className="w-3.5 h-3.5 text-teal-300" />
              <span className="text-[8px] font-black uppercase opacity-80">Clearance %</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">Head Disposal %</span>
          </button>

          {/* 12. IO 360 Performance */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_360_PERFORMANCE')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_360_PERFORMANCE'
                ? 'bg-violet-600 text-white border-violet-600 shadow-xs ring-1 ring-violet-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Award className="w-3.5 h-3.5 text-yellow-300" />
              <span className="text-[8px] font-black uppercase opacity-80">Index</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO 360° Benchmark</span>
          </button>

          {/* 13. IO Arrests */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_ARRESTS_COMPARISON')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_ARRESTS_COMPARISON'
                ? 'bg-red-600 text-white border-red-600 shadow-xs ring-1 ring-red-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Target className="w-3.5 h-3.5 text-red-300" />
              <span className="text-[8px] font-black uppercase opacity-80">Arrests</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO Arrests</span>
          </button>

          {/* 14. IO Case Disposal */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_CASE_DISPOSAL')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_CASE_DISPOSAL'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-[8px] font-black uppercase opacity-80">Disposal</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO Case Disposal</span>
          </button>

          {/* 15. IO Leaves */}
          <button
            type="button"
            onClick={() => setSelectedSource('IO_LEAVES_AVAILED')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition text-left flex flex-col justify-between gap-0.5 cursor-pointer ${
              selectedSource === 'IO_LEAVES_AVAILED'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-1 ring-amber-400/40'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[8px] font-black uppercase opacity-80">Leaves</span>
            </div>
            <span className="font-extrabold text-[10px] leading-tight">IO Leaves</span>
          </button>
        </div>
      </div>

      {/* Period & Hierarchy Filter Controls Bar (50% less vertically wide) */}
      <div className="bg-white dark:bg-slate-900 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Subdivision & Station Hierarchy Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Subdivision Selector for SP & Administrator logins */}
            {isDistrictOrStateAdmin && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-indigo-500" />
                  <span>Subdivision:</span>
                </span>
                <select
                  value={selectedSubdivision}
                  onChange={(e) => {
                    setSelectedSubdivision(e.target.value);
                    setSelectedPS('ALL');
                    setSelectedIOsForComparison([]);
                  }}
                  className="px-2 py-1 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">All Subdivisions (District View)</option>
                  {subdivisionList.map((subdiv, idx) => (
                    <option key={`subdiv-${subdiv}-${idx}`} value={subdiv}>
                      {subdiv} Subdivision
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Station Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-500" />
                <span>Station:</span>
              </span>
              <select
                value={selectedPS}
                onChange={(e) => {
                  setSelectedPS(e.target.value);
                  setSelectedIOsForComparison([]);
                }}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">
                  {selectedSubdivision === 'ALL'
                    ? 'All Police Stations'
                    : `All Police Stations in ${selectedSubdivision}`}
                </option>
                {psList.map((ps, idx) => (
                  <option key={`ps-${ps}-${idx}`} value={ps}>
                    {ps} Police Station
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
              { id: 'THIS_YEAR', label: '2026' },
              { id: 'CUSTOM', label: 'Custom' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setTimePreset(preset.id as any)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  timePreset === preset.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {timePreset === 'CUSTOM' && (
          <div className="flex items-center gap-2 p-2 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-900/60">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Date Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium"
            />
            <span className="text-xs text-slate-500">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium"
            />
          </div>
        )}
      </div>

      {selectedSource === 'CRIME_SPECTRUM_COMPARISON' ? (
        <CrimeSpectrumComparison
          cases={cases}
          availablePoliceStations={availablePoliceStations}
          currentRole={currentRole}
          currentUserAccount={currentUserAccount}
          activePS={activePS}
          onViewCase={onViewCase}
        />
      ) : (
        <>
          {/* LIST-TYPE OFFICER COMPARISON SELECTOR (50% less vertically wide header) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="py-1.5 px-3 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-md">
              <Users className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="truncate">Filter / Compare Specific Officers</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                  {selectedIOsForComparison.length === 0
                    ? `Comparing All (${scopedIOs.length})`
                    : `Comparing (${selectedIOsForComparison.length}/${scopedIOs.length})`}
                </span>
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={selectAllIOs}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => selectTopActiveIOs(6)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
            >
              Top Active Shifts
            </button>
            <button
              type="button"
              onClick={() => selectTopArrestIOs(6)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 cursor-pointer"
            >
              Top Arrests
            </button>
            {selectedIOsForComparison.length > 0 && (
              <button
                type="button"
                onClick={clearAllIOSelection}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 cursor-pointer flex items-center gap-0.5"
              >
                <X className="w-2.5 h-2.5" />
                <span>Show All</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowIOListDrawer(!showIOListDrawer)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 cursor-pointer"
            >
              {showIOListDrawer ? 'Collapse ▲' : 'Expand ▼'}
            </button>
          </div>
        </div>

        {showIOListDrawer && (
          <div className="p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search officer name, rank, or PS in checklist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
              <select
                value={selectedRankFilter}
                onChange={(e) => setSelectedRankFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Ranks (SI / ASI / CI / Insp)</option>
                <option value="Inspector">Inspector</option>
                <option value="Sub-Inspector">Sub-Inspector (SI)</option>
                <option value="Asst. Sub-Inspector">Asst. Sub-Inspector (ASI)</option>
                <option value="PTC">PTC</option>
              </select>
            </div>

            <div className="max-h-56 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {scopedIOs.map((io, ioIdx) => {
                const stats = ioMasterComparisonList.find((i) => i.name === io.name.trim());
                const isSelected = selectedIOsForComparison.includes(io.name.trim());

                return (
                  <div
                    key={io.id || `scoped-io-${io.name}-${ioIdx}`}
                    onClick={() => toggleIOSelection(io.name.trim())}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-400/40 shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                    }`}
                  >
                    <div className="mt-0.5 text-indigo-600 dark:text-indigo-400">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">{io.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                          {io.ps}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{io.rank || 'Investigating Officer'}</div>

                      {stats && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[9px] font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            🏃 Gasti (D:{stats.dayGasti}/E:{stats.eveGasti}/N:{stats.nightGasti})
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            ☀️ OD (D:{stats.dayOD}/E:{stats.eveOD}/N:{stats.nightOD})
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                            🎯 Arr: {stats.totalArrests}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                            ⭐ 360°: {stats.performanceScore360}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Comparative Graph Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{chartData.title}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full">
                {timePreset.replace(/_/g, ' ')}
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{chartData.subtitle}</p>
          </div>

          {chartData.legendGuide && (
            <div className="flex flex-wrap items-center gap-2">
              {chartData.legendGuide.map((g, gIdx) => (
                <div
                  key={`guide-${g.label}-${gIdx}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  <span>{g.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart Viewport Switcher */}
        {chartData.slices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="font-bold text-sm">No records found for the selected filter & period.</p>
          </div>
        ) : chartType === 'MULTI_BAR' ? (
          /* 1. Multi-Bar */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {chartData.slices.map((slice, sIdx) => (
              <div
                key={`multi-bar-${slice.label}-${sIdx}`}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    title: slice.label,
                    value: slice.value,
                    percentage: slice.percentage,
                    sublabel: slice.sublabel,
                    badge: `Rank #${sIdx + 1}`,
                    metrics: [
                      ...(slice.metric1 ? [{ name: slice.metric1.name, val: slice.metric1.val, color: slice.metric1.color }] : []),
                      ...(slice.metric2 ? [{ name: slice.metric2.name, val: slice.metric2.val, color: slice.metric2.color }] : []),
                      ...(slice.metric3 ? [{ name: slice.metric3.name, val: slice.metric3.val, color: slice.metric3.color }] : []),
                    ],
                  })
                }
                onMouseMove={updateTooltipPos}
                onMouseLeave={hideTooltip}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-indigo-400 transition shadow-2xs space-y-2.5 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">{slice.label}</span>
                  <span
                    className="px-2 py-0.5 text-xs font-black rounded-lg text-white tabular-nums shrink-0"
                    style={{ backgroundColor: slice.color }}
                  >
                    {slice.value}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {slice.metric1 && (
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                        <span>{slice.metric1.name}</span>
                        <span>{slice.metric1.val}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(slice.metric1.val / (maxSliceValue || 1)) * 100}%`,
                            backgroundColor: slice.metric1.color,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {slice.metric2 && (
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                        <span>{slice.metric2.name}</span>
                        <span>{slice.metric2.val}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(slice.metric2.val / (maxSliceValue || 1)) * 100}%`,
                            backgroundColor: slice.metric2.color,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{slice.sublabel}</div>
              </div>
            ))}
          </div>
        ) : chartType === 'LOLLIPOP_RANKING' ? (
          /* 2. Horizontal Lollipop Ranking */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
            {chartData.slices.map((slice, idx) => {
              const widthPercent = Math.max((slice.value / maxSliceValue) * 100, 4);
              return (
                <div
                  key={`slice-gauge-${slice.label}-${idx}`}
                  onMouseEnter={(e) =>
                    showTooltip(e, {
                      title: slice.label,
                      value: slice.value,
                      percentage: slice.percentage,
                      sublabel: slice.sublabel,
                      badge: `Rank #${idx + 1}`,
                      metrics: [
                        ...(slice.metric1 ? [{ name: slice.metric1.name, val: slice.metric1.val, color: slice.metric1.color }] : []),
                        ...(slice.metric2 ? [{ name: slice.metric2.name, val: slice.metric2.val, color: slice.metric2.color }] : []),
                      ],
                    })
                  }
                  onMouseMove={updateTooltipPos}
                  onMouseLeave={hideTooltip}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-400 transition shadow-2xs space-y-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-black text-slate-900 dark:text-white truncate">{slice.label}</span>
                    </div>
                    <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {slice.value}
                    </span>
                  </div>

                  <div className="relative w-full h-7 flex items-center">
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    <div
                      className="absolute left-0 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${widthPercent}%`, backgroundColor: slice.color }}
                    />
                    <div
                      className="absolute -translate-y-1/2 top-1/2 flex items-center justify-center transition-all duration-500"
                      style={{ left: `calc(${widthPercent}% - 14px)` }}
                    >
                      <div
                        className="w-7 h-7 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900"
                        style={{ backgroundColor: slice.color }}
                      >
                        {slice.value}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{slice.sublabel}</div>
                </div>
              );
            })}
          </div>
        ) : chartType === 'RADAR_SPIDER' ? (
          /* 3. Multi-Axis Radar Spider Web */
          <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            {radarChartSVG}
          </div>
        ) : chartType === 'POLAR_ROSE' ? (
          /* 4. Polar Rose Chart */
          <div className="flex flex-col lg:flex-row items-center gap-8 justify-center py-2">
            <div className="shrink-0 flex flex-col items-center">
              {polarRoseChartSVG}
            </div>

            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
              {chartData.slices.map((slice, idx) => (
                <div
                  key={`slice-rose-list-${slice.label}-${idx}`}
                  onMouseEnter={(e) => {
                    setHoveredSlice(slice);
                    showTooltip(e, {
                      title: slice.label,
                      value: slice.value,
                      percentage: slice.percentage,
                      sublabel: slice.sublabel,
                      badge: `Rank #${idx + 1}`,
                    });
                  }}
                  onMouseMove={updateTooltipPos}
                  onMouseLeave={() => {
                    setHoveredSlice(null);
                    hideTooltip();
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    hoveredSlice?.label === slice.label
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-400 shadow-sm scale-[1.01]'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3.5 h-3.5 rounded-md shrink-0 ring-2 ring-white dark:ring-slate-900" style={{ backgroundColor: slice.color }} />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate block">{slice.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">{slice.sublabel}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block tabular-nums">{slice.value}</span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{slice.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : chartType === 'TREEMAP_SPECTRUM' ? (
          /* 5. Treemap Spectrum Tiles */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
            {chartData.slices.map((slice, idx) => (
              <div
                key={`slice-tree-${slice.label}-${idx}`}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    title: slice.label,
                    value: slice.value,
                    percentage: slice.percentage,
                    sublabel: slice.sublabel,
                    badge: `Rank #${idx + 1}`,
                  })
                }
                onMouseMove={updateTooltipPos}
                onMouseLeave={hideTooltip}
                className="p-4 rounded-2xl text-white shadow-md transition transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[110px] cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${slice.color}dd, ${slice.color})`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-black drop-shadow-xs line-clamp-2">{slice.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold backdrop-blur-xs shrink-0">
                    #{idx + 1}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl font-black drop-shadow-md tabular-nums">{slice.value}</span>
                  <span className="text-xs font-bold opacity-90">{slice.percentage}% share</span>
                </div>
              </div>
            ))}
          </div>
        ) : chartType === 'HEATMAP_MATRIX' ? (
          /* 6. Heatmap Matrix Grid */
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px]">
                  <th className="p-3 border-b border-slate-200 dark:border-slate-700">Officer / Station</th>
                  <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">🏃 Day Gasti</th>
                  <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">🏃 Eve Gasti</th>
                  <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">🚔 Night Gasti</th>
                  <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">☀️ Day OD</th>
                  <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">🌆 Eve OD</th>
                  <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">🌙 Night OD</th>
                  <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">🎯 Arrests</th>
                  <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">⚖️ Disposed</th>
                  <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">⭐ 360° Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {targetIOList.map((io, idx) => {
                  const getHeatStyle = (val: number) => {
                    if (val === 0) return 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-normal';
                    if (val <= 2) return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold';
                    if (val <= 5) return 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-extrabold';
                    if (val <= 10) return 'bg-indigo-500 text-white font-black';
                    return 'bg-indigo-700 text-white font-black';
                  };

                  const triggerCellTooltip = (e: React.MouseEvent, metricTitle: string, metricVal: number | string, extra?: string) => {
                    showTooltip(e, {
                      title: `${io.name} (${io.rank})`,
                      subtitle: `Station: ${io.ps} | Total Duties: ${io.totalDuties}`,
                      value: `${metricTitle}: ${metricVal}`,
                      sublabel: extra || `Day Gasti: ${io.dayGasti} | Eve Gasti: ${io.eveGasti} | Night Gasti: ${io.nightGasti} | Day OD: ${io.dayOD} | Eve OD: ${io.eveOD} | Night OD: ${io.nightOD}`,
                      badge: `360° Score: ${io.performanceScore360}`,
                    });
                  };

                  return (
                    <tr key={(io as any).id || `heat-io-${io.name}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="p-3">
                        <div className="font-black text-slate-900 dark:text-white">{io.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{io.rank} • {io.ps} PS</div>
                      </td>
                      <td
                        onMouseEnter={(e) => triggerCellTooltip(e, '🏃 Day Gasti Shifts', io.dayGasti)}
                        onMouseMove={updateTooltipPos}
                        onMouseLeave={hideTooltip}
                        className="p-2 text-center cursor-pointer"
                      >
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs tabular-nums ${getHeatStyle(io.dayGasti)}`}>{io.dayGasti}</span>
                      </td>
                      <td
                        onMouseEnter={(e) => triggerCellTooltip(e, '🏃 Evening Gasti Shifts', io.eveGasti)}
                        onMouseMove={updateTooltipPos}
                        onMouseLeave={hideTooltip}
                        className="p-2 text-center cursor-pointer"
                      >
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs tabular-nums ${getHeatStyle(io.eveGasti)}`}>{io.eveGasti}</span>
                      </td>
                      <td
                        onMouseEnter={(e) => triggerCellTooltip(e, '🚔 Night Gasti Shifts', io.nightGasti)}
                        onMouseMove={updateTooltipPos}
                        onMouseLeave={hideTooltip}
                        className="p-2 text-center cursor-pointer"
                      >
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs tabular-nums ${getHeatStyle(io.nightGasti)}`}>{io.nightGasti}</span>
                      </td>
                      <td
                        onMouseEnter={(e) => triggerCellTooltip(e, '☀️ Day OD Shifts', io.dayOD)}
                        onMouseMove={updateTooltipPos}
                        onMouseLeave={hideTooltip}
                        className="p-2 text-center cursor-pointer"
                      >
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs tabular-nums ${getHeatStyle(io.dayOD)}`}>{io.dayOD}</span>
                      </td>
                      <td
                        onMouseEnter={(e) => triggerCellTooltip(e, '🌆 Evening OD Shifts', io.eveOD)}
                        onMouseMove={updateTooltipPos}
                        onMouseLeave={hideTooltip}
                        className="p-2 text-center cursor-pointer"
                      >
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs tabular-nums ${getHeatStyle(io.eveOD)}`}>{io.eveOD}</span>
                      </td>
                      <td
                        onMouseEnter={(e) => triggerCellTooltip(e, '🌙 Night OD Shifts', io.nightOD)}
                        onMouseMove={updateTooltipPos}
                        onMouseLeave={hideTooltip}
                        className="p-2 text-center cursor-pointer"
                      >
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs tabular-nums ${getHeatStyle(io.nightOD)}`}>{io.nightOD}</span>
                      </td>
                      <td
                        onMouseEnter={(e) => triggerCellTooltip(e, '🎯 Accused Arrests Forwarded', io.totalArrests, `🔥 Heinous: ${io.heinousArrests} | 🍷 Excise: ${io.exciseArrests} | 📋 Other: ${io.otherArrests}`)}
                        onMouseMove={updateTooltipPos}
                        onMouseLeave={hideTooltip}
                        className="p-2 text-center cursor-pointer"
                      >
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs tabular-nums ${io.totalArrests > 0 ? 'bg-rose-500 text-white font-black' : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400'}`}>
                          {io.totalArrests}
                        </span>
                      </td>
                      <td
                        onMouseEnter={(e) => triggerCellTooltip(e, '⚖️ Cases Disposed', io.casesDisposed, `Allotted: ${io.casesGiven} | Disposed: ${io.casesDisposed} | Pending: ${io.casesPending} (${io.disposalRate}% Clearance)`)}
                        onMouseMove={updateTooltipPos}
                        onMouseLeave={hideTooltip}
                        className="p-2 text-center cursor-pointer"
                      >
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs tabular-nums ${io.casesDisposed > 0 ? 'bg-emerald-500 text-white font-black' : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400'}`}>
                          {io.casesDisposed}
                        </span>
                      </td>
                      <td
                        onMouseEnter={(e) => triggerCellTooltip(e, '⭐ 360° Performance Score', `${io.performanceScore360}/100`, `Clearance: ${io.disposalRate}% | Total Duties: ${io.totalDuties} | Arrests: ${io.totalArrests}`)}
                        onMouseMove={updateTooltipPos}
                        onMouseLeave={hideTooltip}
                        className="p-2 text-center cursor-pointer"
                      >
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs tabular-nums font-black ${io.performanceScore360 >= 75 ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-800'}`}>
                          {io.performanceScore360}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : chartType === 'PIE_DONUT' ? (
          /* 7. Donut Chart */
          <div className="flex flex-col lg:flex-row items-center gap-8 justify-center py-2">
            <div className="shrink-0 flex flex-col items-center">
              {pieChartSVG}
            </div>
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
              {chartData.slices.map((slice, sIdx) => (
                <div
                  key={`slice-polar-legend-${slice.label}-${sIdx}`}
                  onMouseEnter={(e) =>
                    showTooltip(e, {
                      title: slice.label,
                      value: slice.value,
                      percentage: slice.percentage,
                      sublabel: slice.sublabel,
                      badge: `Rank #${sIdx + 1}`,
                    })
                  }
                  onMouseMove={updateTooltipPos}
                  onMouseLeave={hideTooltip}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-indigo-400 transition flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3.5 h-3.5 rounded-md shrink-0 ring-2 ring-white" style={{ backgroundColor: slice.color }} />
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">{slice.label}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{slice.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 8. Side-by-Side Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {chartData.slices.map((slice, sIdx) => (
              <div
                key={`slice-side-${slice.label}-${sIdx}`}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    title: slice.label,
                    value: slice.value,
                    percentage: slice.percentage,
                    sublabel: slice.sublabel,
                    badge: `Rank #${sIdx + 1}`,
                    metrics: [
                      ...(slice.metric1 ? [{ name: slice.metric1.name, val: slice.metric1.val, color: slice.metric1.color }] : []),
                      ...(slice.metric2 ? [{ name: slice.metric2.name, val: slice.metric2.val, color: slice.metric2.color }] : []),
                      ...(slice.metric3 ? [{ name: slice.metric3.name, val: slice.metric3.val, color: slice.metric3.color }] : []),
                    ],
                  })
                }
                onMouseMove={updateTooltipPos}
                onMouseLeave={hideTooltip}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-indigo-400 hover:shadow-md transition shadow-2xs space-y-3 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">{slice.label}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black text-white" style={{ backgroundColor: slice.color }}>
                    {slice.value} Total
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{slice.sublabel}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Master Inter-IO Comparison Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Master Comparison Matrix: Shift Duties, Arrests, Disposals & 360° Score</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {sortedIOMasterList.length} Officers
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comprehensive operational tracking: Shift Duties, Person to be Arrested vs Arrests Made, Arrests Pending, 41A/35 Notices Served, and SR / Non-SR Case Disposals & Pendency. (Note: Pending figures do not penalize 360° score).
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportDataCSV}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export Table (.xlsx)</span>
          </button>
        </div>

        <div className="overflow-x-auto max-h-[560px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[10px] shadow-2xs">
              <tr>
                <th onClick={() => handleSort('name')} className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 border-r border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-1"><span>Officer Name & PS</span><ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort('dayGasti')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center" title="Morning / Day Gasti Shift">
                  <div className="flex items-center justify-center gap-0.5"><span>🏃 Day Gasti</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('eveGasti')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center" title="Evening / Mobile Gasti Shift">
                  <div className="flex items-center justify-center gap-0.5"><span>🏃 Eve Gasti</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('nightGasti')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center" title="Night Nakabandi / Patrol Shift">
                  <div className="flex items-center justify-center gap-0.5"><span>🚔 Night Gasti</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('dayOD')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center" title="Officer on Duty 06:00 - 14:00">
                  <div className="flex items-center justify-center gap-0.5"><span>☀️ Day OD</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('eveOD')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center" title="Officer on Duty 14:00 - 22:00">
                  <div className="flex items-center justify-center gap-0.5"><span>🌆 Eve OD</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('nightOD')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center" title="Officer on Duty 22:00 - 06:00">
                  <div className="flex items-center justify-center gap-0.5"><span>🌙 Night OD</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('totalDuties')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center bg-indigo-50/70 dark:bg-indigo-950/40 border-r border-indigo-200 dark:border-indigo-900/60" title="Total Gasti & OD Duties">
                  <div className="flex items-center justify-center gap-0.5 text-indigo-700 dark:text-indigo-300"><span>Total Duties</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>

                {/* Accused & Process Metrics */}
                <th onClick={() => handleSort('personToBeArrested')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center bg-amber-50/70 dark:bg-amber-950/30" title="Person To Be Arrested (Accused ordered/required to be arrested)">
                  <div className="flex items-center justify-center gap-0.5 text-amber-700 dark:text-amber-300"><span>🎯 To Be Arrested</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('totalArrests')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center bg-emerald-50/70 dark:bg-emerald-950/30" title="Total Accused Arrested & Forwarded">
                  <div className="flex items-center justify-center gap-0.5 text-emerald-700 dark:text-emerald-300"><span>✅ Arrests Made</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('arrestPending')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center bg-rose-50/70 dark:bg-rose-950/30" title="Arrests Still Pending (No impact on 360° performance score)">
                  <div className="flex items-center justify-center gap-0.5 text-rose-700 dark:text-rose-300"><span>⏳ Arrest Pending</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('noticeServed')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center bg-sky-50/70 dark:bg-sky-950/30 border-r border-slate-200 dark:border-slate-700/60" title="Notice Served under 41A CrPC / Sec 35 BNSS">
                  <div className="flex items-center justify-center gap-0.5 text-sky-700 dark:text-sky-300"><span>📜 Notice Served</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>

                {/* Cases Given, Disposed (SR / NSR), Pending (SR / NSR) */}
                <th onClick={() => handleSort('casesGiven')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center" title="Total Cases Allotted / Given">
                  <div className="flex items-center justify-center gap-0.5"><span>Given (SR/NSR)</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('casesDisposed')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center bg-emerald-50/40 dark:bg-emerald-950/20" title="Disposed Cases (Total & SR / NSR breakdown)">
                  <div className="flex items-center justify-center gap-0.5 text-emerald-800 dark:text-emerald-300"><span>Disposed (SR/NSR)</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('casesPending')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center bg-amber-50/40 dark:bg-amber-950/20" title="Pending Cases (Total & SR / NSR breakdown - No impact on 360° performance score)">
                  <div className="flex items-center justify-center gap-0.5 text-amber-800 dark:text-amber-300"><span>Pending (SR/NSR)</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('disposalRate')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center" title="Case Clearance Percentage">
                  <div className="flex items-center justify-center gap-0.5"><span>Clearance %</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
                <th onClick={() => handleSort('performanceScore360')} className="p-2.5 cursor-pointer hover:bg-slate-200 text-center bg-violet-50/70 dark:bg-violet-950/40" title="Composite 360° Performance Index (Duties + Arrests + Clearance + Promptness)">
                  <div className="flex items-center justify-center gap-0.5 text-violet-700 dark:text-violet-300"><span>⭐ 360° Score</span><ArrowUpDown className="w-2.5 h-2.5" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedIOMasterList.map((io, idx) => (
                <tr key={(io as any).id || `master-io-${io.name}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 border-r border-slate-100 dark:border-slate-800">
                    <div className="font-black text-slate-900 dark:text-white">{io.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{io.rank} • {io.ps} PS</div>
                  </td>
                  <td className="p-2.5 text-center font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{io.dayGasti}</td>
                  <td className="p-2.5 text-center font-bold tabular-nums text-cyan-600 dark:text-cyan-400">{io.eveGasti}</td>
                  <td className="p-2.5 text-center font-bold tabular-nums text-rose-600 dark:text-rose-400">{io.nightGasti}</td>
                  <td className="p-2.5 text-center font-bold tabular-nums text-blue-600 dark:text-blue-400">{io.dayOD}</td>
                  <td className="p-2.5 text-center font-bold tabular-nums text-amber-600 dark:text-amber-400">{io.eveOD}</td>
                  <td className="p-2.5 text-center font-bold tabular-nums text-purple-600 dark:text-purple-400">{io.nightOD}</td>
                  <td className="p-2.5 text-center font-black tabular-nums bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border-r border-indigo-100 dark:border-indigo-950">
                    {io.totalDuties}
                  </td>

                  {/* Accused & Process Details */}
                  <td className="p-2.5 text-center font-black tabular-nums bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-900/60 font-black">
                      {io.personToBeArrested}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-black tabular-nums bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-900/60 font-black">
                      {io.totalArrests}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-black tabular-nums bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300">
                    <span className={`px-1.5 py-0.5 rounded font-black ${
                      io.arrestPending > 0
                        ? 'bg-rose-100/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {io.arrestPending}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-black tabular-nums bg-sky-50/40 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 border-r border-slate-100 dark:border-slate-800">
                    <span className={`px-1.5 py-0.5 rounded font-black ${
                      io.noticeServed > 0
                        ? 'bg-sky-100/80 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {io.noticeServed}
                    </span>
                  </td>

                  {/* Case Disposal & Workload with SR/NSR */}
                  <td className="p-2.5 text-center font-medium tabular-nums">
                    <div className="font-extrabold text-slate-800 dark:text-slate-200">{io.casesGiven}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">
                      <span className="text-rose-600 dark:text-rose-400">{io.casesGivenSR} SR</span> / <span className="text-slate-500 dark:text-slate-400">{io.casesGivenNonSR} NSR</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-bold tabular-nums bg-emerald-50/30 dark:bg-emerald-950/10">
                    <div className="font-black text-emerald-700 dark:text-emerald-400">{io.casesDisposed}</div>
                    <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500">
                      <span>{io.casesDisposedSR} SR</span> / <span>{io.casesDisposedNonSR} NSR</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-bold tabular-nums bg-amber-50/30 dark:bg-amber-950/10">
                    <div className="font-black text-amber-700 dark:text-amber-400">{io.casesPending}</div>
                    <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-500">
                      <span>{io.casesPendingSR} SR</span> / <span>{io.casesPendingNonSR} NSR</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                      io.disposalRate >= 75 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' :
                      io.disposalRate >= 40 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {io.disposalRate}%
                    </span>
                  </td>
                  <td className="p-2.5 text-center bg-violet-50/40 dark:bg-violet-950/20">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black tabular-nums ${
                      io.performanceScore360 >= 75 ? 'bg-violet-600 text-white shadow-xs' :
                      io.performanceScore360 >= 50 ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {io.performanceScore360}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Dynamic Floating Hover Details Popup Card */}
      {hoverTooltip && hoverTooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 dark:bg-slate-950/95 text-white p-3 rounded-xl shadow-2xl border border-indigo-400/60 backdrop-blur-md transition-opacity duration-150 animate-fadeIn text-xs max-w-xs sm:max-w-sm pointer-events-none"
          style={{
            left: `${Math.max(140, Math.min(window.innerWidth - 140, hoverTooltip.x))}px`,
            top: `${Math.max(80, hoverTooltip.y - 8)}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1.5 mb-1.5">
            <span className="font-black text-indigo-300 truncate">{hoverTooltip.title}</span>
            {hoverTooltip.badge && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 shrink-0">
                {hoverTooltip.badge}
              </span>
            )}
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-black text-white">{hoverTooltip.value}</span>
            {hoverTooltip.percentage !== undefined && (
              <span className="text-[11px] font-bold text-emerald-400">{hoverTooltip.percentage}% Share</span>
            )}
          </div>

          {hoverTooltip.subtitle && (
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">{hoverTooltip.subtitle}</p>
          )}

          {hoverTooltip.sublabel && (
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed border-t border-slate-800/80 pt-1 font-mono">
              {hoverTooltip.sublabel}
            </p>
          )}

          {hoverTooltip.metrics && hoverTooltip.metrics.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-slate-800/80 grid grid-cols-2 gap-1.5 text-[10px]">
              {hoverTooltip.metrics.map((m, mIdx) => (
                <div key={`metric-${m.name}-${mIdx}`} className="flex items-center justify-between p-1 bg-slate-800/90 rounded border border-slate-700/50">
                  <span className="text-slate-400 truncate mr-1">{m.name}:</span>
                  <span className="font-bold shrink-0" style={{ color: m.color || '#fff' }}>{m.val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
