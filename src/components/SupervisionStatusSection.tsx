import React, { useState, useMemo } from 'react';
import { FIRCase, PoliceStationName, CaseStatus, UserRole, PoliceStation, CaseDesignation, PunishmentTerm, CCTNSSyncOption, PoliceDistrict, PoliceSubdivision, UserAccount } from '../types';
import { INITIAL_POLICE_STATIONS } from '../data/mockData';
import { formatReadableDate, getDeadlineInfo, matchesCaseFullDatabaseSearch, isCaseChargesheetedOrFinalForm } from '../utils/helpers';
import { matchesJurisdictionFilter } from '../utils/jurisdictionHelpers';
import { JurisdictionFilterControls } from './JurisdictionFilterControls';
import { exportToExcel, exportToPDF } from '../utils/reportExport';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Edit3,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  FileText,
  MapPin,
  FolderOpen,
  FileSpreadsheet,
  Download,
  UserCheck,
  Hourglass,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  SlidersHorizontal,
  Scale,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  QrCode,
} from 'lucide-react';

export type SupervisionSortField =
  | 'firDate'
  | 'firNumber'
  | 'ps'
  | 'status'
  | 'daysRemaining'
  | 'poVisitDate'
  | 'supervisionDate'
  | 'prCount'
  | 'finalPrDate'
  | 'chargesheetDate'
  | 'disposedDate'
  | 'ioName';

export interface SupervisionSortRule {
  field: SupervisionSortField;
  direction: 'asc' | 'desc';
}

const SUPERVISION_SORT_LABELS: Record<SupervisionSortField, string> = {
  firDate: 'FIR Date',
  firNumber: 'FIR Number',
  ps: 'Police Station',
  status: 'Case Status',
  daysRemaining: 'Days Left (Statutory Limit)',
  poVisitDate: 'PO Visit Date',
  supervisionDate: 'Supervision Note Date',
  prCount: 'PRs Logged Count',
  finalPrDate: 'Final PR Date',
  chargesheetDate: 'Chargesheet Date',
  disposedDate: 'Disposed Date',
  ioName: 'Investigating Officer',
};

interface SupervisionStatusSectionProps {
  cases: FIRCase[];
  onEditCase: (c: FIRCase) => void;
  onViewCase: (c: FIRCase) => void;
  onDeleteSupervisionNote?: (caseId: string) => void;
  onDeleteCase?: (caseId: string) => void;
  onOpenQRCode?: (caseItem: FIRCase) => void;
  currentRole: UserRole;
  isReadOnly?: boolean;
  availablePoliceStations?: PoliceStation[];
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  currentUserAccount?: UserAccount | null;
}

export const SupervisionStatusSection: React.FC<SupervisionStatusSectionProps> = ({
  cases,
  onEditCase,
  onViewCase,
  onDeleteSupervisionNote,
  onDeleteCase,
  onOpenQRCode,
  currentRole,
  isReadOnly = false,
  availablePoliceStations,
  districts,
  subdivisions,
  currentUserAccount,
}) => {
  const psOptions =
    availablePoliceStations && availablePoliceStations.length > 0
      ? Array.from(new Set(availablePoliceStations.map((p) => p.name)))
      : Array.from(new Set(INITIAL_POLICE_STATIONS.map((p) => p.name)));

  const isCircleInspector = currentRole === 'CI';

  // Jurisdiction Filter State
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>('ALL');

  // For SDPO / SP / District Admin, supervise SR cases. For Circle Inspector (CI), supervise NON-SR cases!
  const baseTargetCases = useMemo(() => {
    if (isCircleInspector) {
      return cases.filter((c) => c.designation === 'NON_SR');
    }
    return cases.filter((c) => c.designation === 'SR');
  }, [cases, isCircleInspector]);

  // Local Filter States
  const [psFilter, setPsFilter] = useState<PoliceStationName | 'ALL'>('ALL');
  const [designationFilter, setDesignationFilter] = useState<CaseDesignation | 'ALL'>('ALL');
  const [deadlineLimitFilter, setDeadlineLimitFilter] = useState<'ALL' | '60' | '90'>('ALL');
  const [deadlineStatusFilter, setDeadlineStatusFilter] = useState<'ALL' | 'ON_TRACK' | 'APPROACHING' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [ioFilter, setIoFilter] = useState<string>('ALL');
  const [punishmentFilter, setPunishmentFilter] = useState<'ALL' | '7_years_or_more' | 'less_than_7_years'>('ALL');
  const [cctnsSyncFilter, setCctnsSyncFilter] = useState<CCTNSSyncOption>('ALL');
  const [chargesheetedFilter, setChargesheetedFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'ALL'>('ALL');

  // Extract unique IO names for IO-wise filter (filtered by selected Police Station if any)
  const uniqueIOs = useMemo(() => {
    const set = new Set<string>();
    const pool = psFilter !== 'ALL'
      ? baseTargetCases.filter((c) => (c.ps || '').toLowerCase().trim() === psFilter.toLowerCase().trim())
      : baseTargetCases;

    pool.forEach((c) => {
      if (c.ioName && c.ioName.trim()) set.add(c.ioName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [baseTargetCases, psFilter]);

  const [poVisitFilter, setPoVisitFilter] = useState<'ALL' | 'VISITED' | 'PENDING'>('ALL');
  const [supervisionFilter, setSupervisionFilter] = useState<'ALL' | 'ISSUED' | 'PENDING'>('ALL');
  const [prFilter, setPrFilter] = useState<'ALL' | 'ISSUED' | 'PENDING'>('ALL');
  const [finalPrFilter, setFinalPrFilter] = useState<'ALL' | 'ISSUED' | 'PENDING'>('ALL');
  const [caseReviewFilter, setCaseReviewFilter] = useState<'ALL' | 'REVIEWED' | 'PENDING'>('ALL');

  // Date Range Filters
  const [firStartDate, setFirStartDate] = useState('');
  const [firEndDate, setFirEndDate] = useState('');
  const [chargesheetStartDate, setChargesheetStartDate] = useState('');
  const [chargesheetEndDate, setChargesheetEndDate] = useState('');
  const [supervisionStartDate, setSupervisionStartDate] = useState('');
  const [supervisionEndDate, setSupervisionEndDate] = useState('');
  const [finalPrStartDate, setFinalPrStartDate] = useState('');
  const [finalPrEndDate, setFinalPrEndDate] = useState('');
  const [prStartDate, setPrStartDate] = useState('');
  const [prEndDate, setPrEndDate] = useState('');
  const [disposedStartDate, setDisposedStartDate] = useState('');
  const [disposedEndDate, setDisposedEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Multi-Sort State for Supervision
  const [sortRules, setSortRules] = useState<SupervisionSortRule[]>([
    { field: 'firDate', direction: 'desc' },
  ]);
  const [isAddingSort, setIsAddingSort] = useState(false);
  const [selectedNewField, setSelectedNewField] = useState<SupervisionSortField>('ps');

  // Active Filter Count for Collapsed Indicator
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (psFilter !== 'ALL') count++;
    if (designationFilter !== 'ALL') count++;
    if (deadlineLimitFilter !== 'ALL') count++;
    if (deadlineStatusFilter !== 'ALL') count++;
    if (ioFilter !== 'ALL') count++;
    if (punishmentFilter !== 'ALL') count++;
    if (cctnsSyncFilter !== 'ALL') count++;
    if (chargesheetedFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (poVisitFilter !== 'ALL') count++;
    if (supervisionFilter !== 'ALL') count++;
    if (prFilter !== 'ALL') count++;
    if (finalPrFilter !== 'ALL') count++;
    if (caseReviewFilter !== 'ALL') count++;
    if (firStartDate || firEndDate) count++;
    if (chargesheetStartDate || chargesheetEndDate) count++;
    if (supervisionStartDate || supervisionEndDate) count++;
    if (finalPrStartDate || finalPrEndDate) count++;
    if (prStartDate || prEndDate) count++;
    if (disposedStartDate || disposedEndDate) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [
    psFilter,
    designationFilter,
    deadlineLimitFilter,
    deadlineStatusFilter,
    ioFilter,
    punishmentFilter,
    cctnsSyncFilter,
    chargesheetedFilter,
    statusFilter,
    poVisitFilter,
    supervisionFilter,
    prFilter,
    finalPrFilter,
    caseReviewFilter,
    firStartDate,
    firEndDate,
    chargesheetStartDate,
    chargesheetEndDate,
    supervisionStartDate,
    supervisionEndDate,
    finalPrStartDate,
    finalPrEndDate,
    prStartDate,
    prEndDate,
    disposedStartDate,
    disposedEndDate,
    searchQuery,
  ]);

  // Reset Filters
  const handleReset = () => {
    setSelectedDistrict('ALL');
    setSelectedSubdivision('ALL');
    setPsFilter('ALL');
    setDesignationFilter('ALL');
    setDeadlineLimitFilter('ALL');
    setDeadlineStatusFilter('ALL');
    setIoFilter('ALL');
    setPunishmentFilter('ALL');
    setCctnsSyncFilter('ALL');
    setChargesheetedFilter('ALL');
    setStatusFilter('ALL');
    setPoVisitFilter('ALL');
    setSupervisionFilter('ALL');
    setPrFilter('ALL');
    setFinalPrFilter('ALL');
    setCaseReviewFilter('ALL');
    setFirStartDate('');
    setFirEndDate('');
    setChargesheetStartDate('');
    setChargesheetEndDate('');
    setSupervisionStartDate('');
    setSupervisionEndDate('');
    setFinalPrStartDate('');
    setFinalPrEndDate('');
    setPrStartDate('');
    setPrEndDate('');
    setDisposedStartDate('');
    setDisposedEndDate('');
    setSearchQuery('');
  };

  // Filter Logic
  const filteredCases = useMemo(() => {
    // When searching, search from everything in database (all cases)
    const baseCases = searchQuery.trim() ? cases : baseTargetCases;

    return baseCases.filter((c) => {
      // Jurisdiction Filter (District, Subdivision, PS)
      if (!matchesJurisdictionFilter(c, selectedDistrict, selectedSubdivision, psFilter, availablePoliceStations)) {
        return false;
      }

      // Classification / Designation Filter
      if (designationFilter !== 'ALL' && c.designation !== designationFilter) return false;

      // 60/90 Days Limit Filter
      if (deadlineLimitFilter === '60' && c.deadlineDays !== 60) return false;
      if (deadlineLimitFilter === '90' && c.deadlineDays !== 90) return false;

      // Deadline Status Filter
      const deadlineInfo = getDeadlineInfo(c);
      if (deadlineStatusFilter !== 'ALL' && deadlineInfo.code !== deadlineStatusFilter) return false;

      // IO Wise Filter
      if (ioFilter !== 'ALL' && c.ioName !== ioFilter) return false;

      // Status Filter (All, Under Investigation, Disposed)
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Disposed') {
          if (c.status !== 'Disposed' && c.status !== 'False Case / Mistake of Fact') {
            return false;
          }
        } else if (c.status !== statusFilter) {
          return false;
        }
      }

      // Chargesheeted / Final Form / Mistake of Fact Filter (ALL, YES, NO)
      if (chargesheetedFilter !== 'ALL') {
        const isCS = isCaseChargesheetedOrFinalForm(c);
        if (chargesheetedFilter === 'YES' && !isCS) return false;
        if (chargesheetedFilter === 'NO' && isCS) return false;
      }

      // Punishment Term Filter
      if (punishmentFilter !== 'ALL' && c.punishmentTerm !== punishmentFilter) return false;

      // CCTNS Sync Filter
      if (cctnsSyncFilter === 'CS_SYNC' && (!c.chargesheetUploadedCCTNS || c.caseDiaryUploadedCCTNS)) return false;
      if (cctnsSyncFilter === 'CD_SYNC' && (!c.caseDiaryUploadedCCTNS || c.chargesheetUploadedCCTNS)) return false;
      if (cctnsSyncFilter === 'BOTH_SYNC' && (!c.chargesheetUploadedCCTNS || !c.caseDiaryUploadedCCTNS)) return false;
      if (cctnsSyncFilter === 'NONE_SYNC' && (c.chargesheetUploadedCCTNS || c.caseDiaryUploadedCCTNS)) return false;

      // FIR Registration Date Range
      if (firStartDate && c.firDate < firStartDate) return false;
      if (firEndDate && c.firDate > firEndDate) return false;

      // Chargesheet Date Range
      if (chargesheetStartDate && (!c.chargesheetDate || c.chargesheetDate < chargesheetStartDate)) return false;
      if (chargesheetEndDate && (!c.chargesheetDate || c.chargesheetDate > chargesheetEndDate)) return false;

      // PO Visit Filter
      if (poVisitFilter === 'VISITED' && !c.poVisitDate) return false;
      if (poVisitFilter === 'PENDING' && c.poVisitDate) return false;

      // Supervision Note Status Filter
      if (supervisionFilter === 'ISSUED' && !c.supervisionDate) return false;
      if (supervisionFilter === 'PENDING' && c.supervisionDate) return false;

      // Supervision Note Date Range
      if (supervisionStartDate && (!c.supervisionDate || c.supervisionDate < supervisionStartDate)) return false;
      if (supervisionEndDate && (!c.supervisionDate || c.supervisionDate > supervisionEndDate)) return false;

      // PR Issued Status Filter
      const hasPr = Boolean(c.prDates && c.prDates.length > 0);
      if (prFilter === 'ISSUED' && !hasPr) return false;
      if (prFilter === 'PENDING' && hasPr) return false;

      // PR Date Range Filter (checks if any PR date falls in range)
      if (prStartDate || prEndDate) {
        if (!c.prDates || c.prDates.length === 0) return false;
        const inRange = c.prDates.some((d) => {
          if (prStartDate && d < prStartDate) return false;
          if (prEndDate && d > prEndDate) return false;
          return true;
        });
        if (!inRange) return false;
      }

      // Final PR Status Filter
      if (finalPrFilter === 'ISSUED' && !c.finalPrDate) return false;
      if (finalPrFilter === 'PENDING' && c.finalPrDate) return false;

      // Final PR Date Range
      if (finalPrStartDate && (!c.finalPrDate || c.finalPrDate < finalPrStartDate)) return false;
      if (finalPrEndDate && (!c.finalPrDate || c.finalPrDate > finalPrEndDate)) return false;

      // Disposed Date Range Filter
      const caseDisposedDate = c.disposedDate || (c.status === 'Disposed' ? c.updatedAt : '');
      if (disposedStartDate && (!caseDisposedDate || caseDisposedDate < disposedStartDate)) return false;
      if (disposedEndDate && (!caseDisposedDate || caseDisposedDate > disposedEndDate)) return false;

      // Case Review Filter
      const hasReview = Boolean(c.caseReviewDates && c.caseReviewDates.length > 0);
      if (caseReviewFilter === 'REVIEWED' && !hasReview) return false;
      if (caseReviewFilter === 'PENDING' && hasReview) return false;

      // Search Query: Search from everything in database
      if (searchQuery.trim() && !matchesCaseFullDatabaseSearch(c, searchQuery)) {
        return false;
      }

      return true;
    });
  }, [
    cases,
    baseTargetCases,
    selectedDistrict,
    selectedSubdivision,
    availablePoliceStations,
    psFilter,
    designationFilter,
    deadlineLimitFilter,
    deadlineStatusFilter,
    ioFilter,
    statusFilter,
    chargesheetedFilter,
    punishmentFilter,
    cctnsSyncFilter,
    firStartDate,
    firEndDate,
    chargesheetStartDate,
    chargesheetEndDate,
    poVisitFilter,
    supervisionFilter,
    supervisionStartDate,
    supervisionEndDate,
    prFilter,
    prStartDate,
    prEndDate,
    finalPrFilter,
    finalPrStartDate,
    finalPrEndDate,
    disposedStartDate,
    disposedEndDate,
    caseReviewFilter,
    searchQuery,
  ]);

  // Multi-Sort Comparator Logic
  const getSupervisionFieldValue = (c: FIRCase, field: SupervisionSortField): any => {
    switch (field) {
      case 'firNumber': {
        const num = parseInt(c.firNumber.replace(/\D/g, ''), 10);
        return isNaN(num) ? c.firNumber.toLowerCase() : num;
      }
      case 'firDate':
        return c.firDate || '';
      case 'ps':
        return (c.ps || '').toLowerCase();
      case 'status':
        return (c.status || '').toLowerCase();
      case 'daysRemaining': {
        const info = getDeadlineInfo(c);
        return info.daysRemaining ?? 9999;
      }
      case 'poVisitDate':
        return c.poVisitDate || '';
      case 'supervisionDate':
        return c.supervisionDate || '';
      case 'prCount':
        return c.prDates?.length || 0;
      case 'finalPrDate':
        return c.finalPrDate || '';
      case 'chargesheetDate':
        return c.chargesheetDate || '';
      case 'disposedDate':
        return c.disposedDate || (c.status === 'Disposed' ? c.updatedAt : '');
      case 'ioName':
        return (c.ioName || '').toLowerCase();
      default:
        return '';
    }
  };

  const sortedFilteredCases = useMemo(() => {
    if (sortRules.length === 0) return filteredCases;
    return [...filteredCases].sort((a, b) => {
      for (const rule of sortRules) {
        const valA = getSupervisionFieldValue(a, rule.field);
        const valB = getSupervisionFieldValue(b, rule.field);
        let cmp = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          cmp = valA - valB;
        } else {
          cmp = String(valA).localeCompare(String(valB));
        }
        if (cmp !== 0) {
          return rule.direction === 'asc' ? cmp : -cmp;
        }
      }
      return 0;
    });
  }, [filteredCases, sortRules]);

  const handleHeaderSort = (field: SupervisionSortField, e: React.MouseEvent) => {
    const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
    setSortRules((prev) => {
      const existingIdx = prev.findIndex((r) => r.field === field);
      if (existingIdx >= 0) {
        const current = prev[existingIdx];
        if (current.direction === 'asc') {
          const updated = [...prev];
          updated[existingIdx] = { ...current, direction: 'desc' };
          return updated;
        } else {
          if (isMulti) {
            return prev.filter((_, idx) => idx !== existingIdx);
          } else {
            return [{ field, direction: 'asc' }];
          }
        }
      } else {
        if (isMulti) {
          return [...prev, { field, direction: 'asc' }];
        } else {
          return [{ field, direction: 'asc' }];
        }
      }
    });
  };

  const handleToggleRuleDirection = (index: number) => {
    setSortRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, direction: r.direction === 'asc' ? 'desc' : 'asc' } : r))
    );
  };

  const handleRemoveRule = (index: number) => {
    setSortRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddRule = () => {
    if (sortRules.some((r) => r.field === selectedNewField)) {
      setIsAddingSort(false);
      return;
    }
    setSortRules((prev) => [...prev, { field: selectedNewField, direction: 'asc' }]);
    setIsAddingSort(false);
  };

  // Statistics Metrics
  const stats = useMemo(() => {
    const total = baseTargetCases.length;
    const poVisited = baseTargetCases.filter((c) => Boolean(c.poVisitDate)).length;
    const poPending = total - poVisited;

    const supervisionIssued = baseTargetCases.filter((c) => Boolean(c.supervisionDate)).length;
    const supervisionPending = total - supervisionIssued;

    const prIssuedCount = baseTargetCases.filter((c) => c.prDates && c.prDates.length > 0).length;
    const totalPrsCount = baseTargetCases.reduce((acc, c) => acc + (c.prDates?.length || 0), 0);

    const finalPrIssued = baseTargetCases.filter((c) => Boolean(c.finalPrDate)).length;
    
    const reviewedCount = baseTargetCases.filter((c) => c.caseReviewDates && c.caseReviewDates.length > 0).length;
    const totalReviewsCount = baseTargetCases.reduce((acc, c) => acc + (c.caseReviewDates?.length || 0), 0);

    return {
      total,
      poVisited,
      poPending,
      supervisionIssued,
      supervisionPending,
      prIssuedCount,
      totalPrsCount,
      finalPrIssued,
      reviewedCount,
      totalReviewsCount,
    };
  }, [baseTargetCases]);

  // Export Handlers
  const handleExportExcel = () => {
    const headers = [
      'FIR Number',
      'Police Station',
      'FIR Date',
      'Sections',
      'Complainant',
      'IO Name',
      'Limit',
      'PO Visit Date',
      'Supervision Date',
      'PR Dates',
      'Final PR Date',
      'Case Review Dates',
      'Status',
      'SDPO Supervision Note',
    ];

    const rows = sortedFilteredCases.map((c) => [
      c.firNumber,
      c.ps,
      c.firDate,
      c.sections,
      c.complainantName,
      c.ioName,
      `${c.deadlineDays} Days`,
      c.poVisitDate || 'Pending',
      c.supervisionDate || 'Pending',
      c.prDates && c.prDates.length > 0 ? c.prDates.join('; ') : 'None',
      c.finalPrDate || 'Pending',
      c.caseReviewDates && c.caseReviewDates.length > 0 ? c.caseReviewDates.join('; ') : 'None',
      c.status,
      c.sdpoSupervisionNote || 'N/A',
    ]);

    exportToExcel('SDPO_Supervision_Report', headers, rows);
  };

  const handleExportPDF = () => {
    const headers = [
      'FIR #',
      'PS',
      'FIR Date',
      'IO Name',
      'Limit',
      'PO Visit',
      'Supervision',
      'PR Dates',
      'Final PR',
      'Status',
    ];

    const rows = sortedFilteredCases.map((c) => [
      c.firNumber,
      c.ps,
      c.firDate,
      c.ioName,
      `${c.deadlineDays}d`,
      c.poVisitDate || 'Pending',
      c.supervisionDate || 'Pending',
      c.prDates && c.prDates.length > 0 ? c.prDates.join(', ') : '-',
      c.finalPrDate || 'Pending',
      c.status,
    ]);

    const badges = [
      { label: 'Supervised SR Cases', value: sortedFilteredCases.length },
      { label: 'PO Visited', value: sortedFilteredCases.filter((c) => c.poVisitDate).length },
      { label: 'Supervision Issued', value: sortedFilteredCases.filter((c) => c.supervisionDate).length },
      { label: 'Final PR Issued', value: sortedFilteredCases.filter((c) => c.finalPrDate).length },
    ];

    exportToPDF(
      'SPECIAL REPORT (SR) CASES SUPERVISION DOSSIER',
      'Official SDPO Supervision & Progress Monitoring Report',
      headers,
      rows,
      badges
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 border border-purple-800/60 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-purple-600/10 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-600/30 text-purple-300 rounded-2xl border border-purple-500/40 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                  Super User Only
                </span>
                <span className="text-purple-300 text-xs font-mono font-bold">
                  SDPO Tarapur Command
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Special Report (SR) Cases Supervision Dashboard
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Comprehensive supervision tracking for all Special Report (SR) cases across Tarapur, Asarganj, Sangrampur, and Harpur Police Stations. Monitor PO Visit Dates, Supervision Notes, Progress Reports (PRs), Final PRs, and Case Reviews.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-900/80 p-3 rounded-xl border border-purple-800/60 text-center">
              <div>
                <span className="text-[10px] text-purple-300 font-bold block uppercase tracking-wider">Supervised SR Cases</span>
                <span className="text-2xl font-black text-white">{stats.total}</span>
              </div>
            </div>

            {/* Export Buttons in Header */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                title="Export Filtered SR Supervision Cases to Excel / CSV"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel Export</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                title="Generate Printable PDF Supervision Report"
              >
                <Download className="w-4 h-4" />
                <span>Printable PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Supervision KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {/* Total SR */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total SR</span>
            <FolderOpen className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Cases Under SDPO</span>
        </div>

        {/* PO Visit */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">PO Visit</span>
            <MapPin className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.poVisited}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {stats.poPending > 0 ? `${stats.poPending} Pending Visit` : '100% Visited'}
          </span>
        </div>

        {/* Supervision Note */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Supervision</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.supervisionIssued}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {stats.supervisionPending > 0 ? `${stats.supervisionPending} Pending Memo` : 'All Memos Issued'}
          </span>
        </div>

        {/* Progress Reports (PR) */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">PR Issued</span>
            <FileCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.prIssuedCount}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {stats.totalPrsCount} Total PRs Logged
          </span>
        </div>

        {/* Final PR */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Final PR</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.finalPrIssued}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {stats.total - stats.finalPrIssued} Pending Final PR
          </span>
        </div>

        {/* Case Reviews */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Case Reviews</span>
            <Calendar className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400">{stats.reviewedCount}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {stats.totalReviewsCount} Review Sessions
          </span>
        </div>
      </div>

      {/* Advanced Supervision Filter Panel (Collapsible) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-xs transition-all">
        {/* Header with Collapsible Toggle */}
        <div
          onClick={() => setIsFiltersOpen((prev) => !prev)}
          className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition select-none"
        >
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg">
              <Filter className="w-4 h-4" />
            </div>
            <span>Advanced Supervision Case Filters</span>
            <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-purple-200 dark:border-purple-800">
              Showing {filteredCases.length} of {baseTargetCases.length} {isCircleInspector ? 'NON-SR' : 'SR'} Cases
            </span>
            {activeFilterCount > 0 && (
              <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                {activeFilterCount} Active Filter{activeFilterCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel Export</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF Report</span>
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 font-bold flex items-center gap-1 transition ml-1 cursor-pointer"
                title="Reset all filters to default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ml-1"
            >
              {isFiltersOpen ? (
                <>
                  <span>Collapse Filters</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Expand Filters</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Filter Body */}
        {isFiltersOpen && (
          <div className="p-4 space-y-4 animate-fadeIn">

        {/* Statutory Limit Status Tabs (Overdue, Urgent, On Track) */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800 text-[11px]">
          <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Statutory Limit Status:</span>
          </span>
          <button
            onClick={() => setDeadlineStatusFilter('ALL')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
              deadlineStatusFilter === 'ALL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Limits
          </button>
          <button
            onClick={() => setDeadlineStatusFilter('OVERDUE')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer flex items-center gap-1 ${
              deadlineStatusFilter === 'OVERDUE'
                ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <span>🚨 Overdue (&gt;60/90d)</span>
          </button>
          <button
            onClick={() => setDeadlineStatusFilter('APPROACHING')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer flex items-center gap-1 ${
              deadlineStatusFilter === 'APPROACHING'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <span>⚠️ Urgent (&lt;15d)</span>
          </button>
          <button
            onClick={() => setDeadlineStatusFilter('ON_TRACK')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer flex items-center gap-1 ${
              deadlineStatusFilter === 'ON_TRACK'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            <span>✓ On Track</span>
          </button>
          <button
            onClick={() => setDeadlineStatusFilter('COMPLETED')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer flex items-center gap-1 ${
              deadlineStatusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <span>🏁 Disposed / Closed</span>
          </button>
        </div>

        {/* Primary Filter Row 1: Search, PS, Classification, IO Wise, Statutory Limit, Punishment, CCTNS Sync */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {/* Search Query */}
          <div className="lg:col-span-2 relative">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Database Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search database (FIR #, Directives, IO, Sections, Notes...)"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Police Station Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Police Station</label>
            <select
              value={psFilter}
              onChange={(e) => {
                const newPs = e.target.value as PoliceStationName | 'ALL';
                setPsFilter(newPs);
                setIoFilter('ALL');
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">All Police Stations ({psOptions.length})</option>
              {psOptions.map((st) => (
                <option key={st} value={st}>
                  {st} PS
                </option>
              ))}
            </select>
          </div>

          {/* Classification / Designation */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Classification</label>
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">All Case Types</option>
              <option value="SR">⭐ SR Cases (SDPO)</option>
              <option value="NON_SR">👮 NON-SR Cases (CI)</option>
              <option value="PENDING_DESIGNATION">❓ Pending Designation</option>
            </select>
          </div>

          {/* IO Wise Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
              IO Wise Filter {psFilter !== 'ALL' ? `(${psFilter})` : ''}
            </label>
            <select
              value={ioFilter}
              onChange={(e) => setIoFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">
                {psFilter !== 'ALL' ? `All ${psFilter} IOs (${uniqueIOs.length})` : `All IOs (${uniqueIOs.length})`}
              </option>
              {uniqueIOs.map((io) => (
                <option key={io} value={io}>
                  👮 {io}
                </option>
              ))}
            </select>
          </div>

          {/* Statutory Limit (60 / 90 Days) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Statutory Limit</label>
            <select
              value={deadlineLimitFilter}
              onChange={(e) => setDeadlineLimitFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">60d & 90d Limits</option>
              <option value="60">60 Days Limit</option>
              <option value="90">90 Days Limit</option>
            </select>
          </div>

          {/* Punishment Term Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Punishment Term</label>
            <select
              value={punishmentFilter}
              onChange={(e) => setPunishmentFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">All Punishments</option>
              <option value="7_years_or_more">≥ 7 Yrs or More</option>
              <option value="less_than_7_years">&lt; 7 Yrs (Less)</option>
            </select>
          </div>
        </div>

        {/* Primary Filter Row 2: Status, CS/FF/MoF, CCTNS Sync, PO Visit, Supervision Note, PR, Final PR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Investigation Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Investigation Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Disposed">Disposed</option>
            </select>
          </div>

          {/* CS / Final Form / MoF Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">CS / Final Form / MoF</label>
            <select
              value={chargesheetedFilter}
              onChange={(e) => setChargesheetedFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">CS/FF/MoF: All</option>
              <option value="YES">✓ Yes (Submitted)</option>
              <option value="NO">✕ No (Pending)</option>
            </select>
          </div>

          {/* CCTNS Sync Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">CCTNS Portal Sync</label>
            <select
              value={cctnsSyncFilter}
              onChange={(e) => setCctnsSyncFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">All Sync Statuses</option>
              <option value="CD_SYNC">Only CD sync</option>
              <option value="CS_SYNC">Only CS sync</option>
              <option value="BOTH_SYNC">Both sync</option>
              <option value="NONE_SYNC">None</option>
            </select>
          </div>

          {/* PO Visit Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">PO Visit Status</label>
            <select
              value={poVisitFilter}
              onChange={(e) => setPoVisitFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">All PO Visit Status</option>
              <option value="VISITED">✓ PO Visited</option>
              <option value="PENDING">✕ Pending PO Visit</option>
            </select>
          </div>

          {/* Supervision Note Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Supervision Note Status</label>
            <select
              value={supervisionFilter}
              onChange={(e) => setSupervisionFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">All Supervision Notes</option>
              <option value="ISSUED">✓ Note Issued</option>
              <option value="PENDING">✕ Pending Note</option>
            </select>
          </div>

          {/* PR Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Progress Report (PR)</label>
            <select
              value={prFilter}
              onChange={(e) => setPrFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">All PR Status</option>
              <option value="ISSUED">✓ PR Issued</option>
              <option value="PENDING">✕ Pending PR</option>
            </select>
          </div>

          {/* Final PR Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Final PR Status</label>
            <select
              value={finalPrFilter}
              onChange={(e) => setFinalPrFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-white font-semibold"
            >
              <option value="ALL">All Final PR Status</option>
              <option value="ISSUED">✓ Final PR Issued</option>
              <option value="PENDING">✕ Pending Final PR</option>
            </select>
          </div>
        </div>

        {/* Date Range Filters Section */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 bg-slate-50/70 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
          
          {/* FIR Registration Date Range */}
          <div>
            <span className="font-bold text-[11px] text-amber-900 dark:text-amber-300 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>FIR Date Range</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={firStartDate}
                onChange={(e) => setFirStartDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="Start"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={firEndDate}
                onChange={(e) => setFirEndDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="End"
              />
            </div>
          </div>

          {/* Chargesheet Date Range */}
          <div>
            <span className="font-bold text-[11px] text-emerald-900 dark:text-emerald-300 block mb-1 flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Chargesheet Date Range</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={chargesheetStartDate}
                onChange={(e) => setChargesheetStartDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="Start"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={chargesheetEndDate}
                onChange={(e) => setChargesheetEndDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="End"
              />
            </div>
          </div>

          {/* Supervision Note Date Range */}
          <div>
            <span className="font-bold text-[11px] text-purple-900 dark:text-purple-300 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span>Supervision Note Range</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={supervisionStartDate}
                onChange={(e) => setSupervisionStartDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="Start"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={supervisionEndDate}
                onChange={(e) => setSupervisionEndDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="End"
              />
            </div>
          </div>

          {/* PR Date Range */}
          <div>
            <span className="font-bold text-[11px] text-blue-900 dark:text-blue-300 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>PR Date Range (Any PR)</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={prStartDate}
                onChange={(e) => setPrStartDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="Start"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={prEndDate}
                onChange={(e) => setPrEndDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="End"
              />
            </div>
          </div>

          {/* Final PR Date Range */}
          <div>
            <span className="font-bold text-[11px] text-teal-900 dark:text-teal-300 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-500" />
              <span>Final PR Date Range</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={finalPrStartDate}
                onChange={(e) => setFinalPrStartDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="Start"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={finalPrEndDate}
                onChange={(e) => setFinalPrEndDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="End"
              />
            </div>
          </div>

          {/* Disposed Date Range */}
          <div>
            <span className="font-bold text-[11px] text-purple-900 dark:text-purple-300 block mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
              <span>Disposed Date Range</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={disposedStartDate}
                onChange={(e) => setDisposedStartDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="Start"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={disposedEndDate}
                onChange={(e) => setDisposedEndDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-[11px] text-slate-900 dark:text-white"
                placeholder="End"
              />
            </div>
          </div>

        </div>

        {/* Quick Toggles: Status, CS/FF/MoF, Case Review */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
          {/* Case Status Tabs (Under Investigation, Disposed) */}
          <span className="font-bold text-slate-500">Case Status:</span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('Under Investigation')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
              statusFilter === 'Under Investigation'
                ? 'bg-amber-500 text-slate-950 font-extrabold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Under Investigation
          </button>
          <button
            onClick={() => setStatusFilter('Disposed')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
              statusFilter === 'Disposed'
                ? 'bg-purple-600 text-white font-extrabold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Disposed
          </button>

          <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 mx-2 hidden sm:block"></div>

          {/* Chargesheeted / Final Form Submitted / Mistake of Fact Quick Tabs */}
          <span className="font-bold text-slate-500">CS / Final Form / MoF:</span>
          <button
            onClick={() => setChargesheetedFilter('ALL')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
              chargesheetedFilter === 'ALL'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setChargesheetedFilter('YES')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
              chargesheetedFilter === 'YES'
                ? 'bg-emerald-600 text-white font-extrabold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            ✓ Yes (Submitted)
          </button>
          <button
            onClick={() => setChargesheetedFilter('NO')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
              chargesheetedFilter === 'NO'
                ? 'bg-rose-600 text-white font-extrabold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            ✕ No (Pending)
          </button>

          <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 mx-2 hidden sm:block"></div>

          {/* Case Review Status Tabs */}
          <span className="font-bold text-slate-500">Case Review:</span>
          <button
            onClick={() => setCaseReviewFilter('ALL')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
              caseReviewFilter === 'ALL'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setCaseReviewFilter('REVIEWED')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
              caseReviewFilter === 'REVIEWED'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            ✓ Reviewed
          </button>
          <button
            onClick={() => setCaseReviewFilter('PENDING')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
              caseReviewFilter === 'PENDING'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            ✕ Review Pending
          </button>
        </div>
        </div>
        )}
      </div>

      {/* Multiple Sorting Controls Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Supervision Multiple Sorting:</span>
          </div>

          {/* Active Sort Rules */}
          <div className="flex flex-wrap items-center gap-1.5">
            {sortRules.map((rule, idx) => (
              <span
                key={rule.field}
                className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-xs"
              >
                <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-extrabold">
                  {idx + 1}
                </span>
                <span>{SUPERVISION_SORT_LABELS[rule.field]}</span>
                <button
                  type="button"
                  onClick={() => handleToggleRuleDirection(idx)}
                  className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-purple-700 dark:text-purple-300 cursor-pointer flex items-center gap-0.5"
                  title="Click to toggle Ascending / Descending"
                >
                  {rule.direction === 'asc' ? (
                    <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <ArrowUp className="w-3 h-3" /> Asc
                    </span>
                  ) : (
                    <span className="flex items-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      <ArrowDown className="w-3 h-3" /> Desc
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveRule(idx)}
                  className="ml-0.5 p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                  title="Remove this sort level"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add Sort Rule */}
          {isAddingSort ? (
            <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700">
              <select
                value={selectedNewField}
                onChange={(e) => setSelectedNewField(e.target.value as SupervisionSortField)}
                className="bg-white dark:bg-slate-900 text-[11px] font-semibold rounded px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                {(Object.keys(SUPERVISION_SORT_LABELS) as SupervisionSortField[])
                  .filter((f) => !sortRules.some((r) => r.field === f))
                  .map((f) => (
                    <option key={f} value={f}>
                      {SUPERVISION_SORT_LABELS[f]}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddRule}
                className="px-2 py-0.5 bg-purple-600 text-white rounded text-[11px] font-bold hover:bg-purple-700 cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingSort(false)}
                className="p-0.5 text-slate-500 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingSort(true)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 px-2 py-0.5 rounded-lg cursor-pointer transition"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span>+ Add Sort Level</span>
            </button>
          )}
        </div>

        {/* Reset Sort Button */}
        {sortRules.length > 0 && (
          <button
            type="button"
            onClick={() => setSortRules([{ field: 'firDate', direction: 'desc' }])}
            className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            title="Reset to default FIR Date (Newest first)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Sort</span>
          </button>
        )}
      </div>

      {/* Supervision Cases List */}
      <div className="space-y-4">
        {sortedFilteredCases.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No {isCircleInspector ? 'Non-SR' : 'Special Report (SR)'} Cases Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No cases match the current filter criteria. Try clearing or adjusting your supervision filters.
            </p>
            <button
              onClick={handleReset}
              className="mt-4 px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl shadow hover:bg-purple-700 transition cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          sortedFilteredCases.map((c) => {
            const deadline = getDeadlineInfo(c);

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-base">
                      FIR {c.firNumber}
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 font-bold text-xs px-2.5 py-0.5 rounded border border-amber-500/40">
                      {c.ps} PS
                    </span>
                    <span className="bg-purple-600 text-white font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                      {c.designation === 'NON_SR' ? 'NON-SR Case (CI)' : '⭐ Special Report (SR)'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      FIR Date: <strong>{formatReadableDate(c.firDate)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${deadline.badgeBg}`}>
                      {deadline.label} ({c.deadlineDays} Days Limit)
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.status === 'Disposed'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : c.status?.includes('Chargesheeted')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {c.status}
                    </span>
                    {c.disposedDate && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Disposed: {formatReadableDate(c.disposedDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Case Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Sections</span>
                    <p className="font-bold text-slate-900 dark:text-white">{c.sections}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Complainant</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {c.complainantName} {c.complainantPhone && `(${c.complainantPhone})`}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Investigating Officer (IO)</span>
                    <p className="font-extrabold text-amber-600 dark:text-amber-400">{c.ioName}</p>
                  </div>
                </div>

                {/* Supervision Dates & Milestone Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
                  {/* PO Visit Date */}
                  <div className={`p-2.5 rounded-xl border ${
                    c.poVisitDate
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                  }`}>
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 block">
                      PO Visit Date
                    </span>
                    <div className="font-extrabold mt-0.5 flex items-center gap-1">
                      {c.poVisitDate ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-emerald-900 dark:text-emerald-300">{formatReadableDate(c.poVisitDate)}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="text-rose-700 dark:text-rose-400">✕ Pending Visit</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Supervision Date */}
                  <div className={`p-2.5 rounded-xl border ${
                    c.supervisionDate
                      ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                  }`}>
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 block">
                      Supervision Date
                    </span>
                    <div className="font-extrabold mt-0.5 flex items-center gap-1">
                      {c.supervisionDate ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span className="text-purple-900 dark:text-purple-300">{formatReadableDate(c.supervisionDate)}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-amber-700 dark:text-amber-400">✕ Pending Note</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* PR Dates */}
                  <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 block">
                      Progress Reports (PR)
                    </span>
                    <div className="font-bold mt-0.5">
                      {c.prDates && c.prDates.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.prDates.map((d, idx) => (
                            <span key={d} className="bg-purple-100 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200 font-extrabold text-[10px] px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-700">
                              PR#{idx+1}: {formatReadableDate(d)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No PR issued</span>
                      )}
                    </div>
                  </div>

                  {/* Final PR Date */}
                  <div className={`p-2.5 rounded-xl border ${
                    c.finalPrDate
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}>
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 block">
                      Final PR Date
                    </span>
                    <div className="font-extrabold mt-0.5">
                      {c.finalPrDate ? (
                        <span className="text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{formatReadableDate(c.finalPrDate)}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Pending Final PR</span>
                      )}
                    </div>
                  </div>

                  {/* Case Review Dates */}
                  <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 block">
                      Case Reviews
                    </span>
                    <div className="font-bold mt-0.5">
                      {c.caseReviewDates && c.caseReviewDates.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.caseReviewDates.map((d, idx) => (
                            <span key={d} className="bg-blue-100 dark:bg-blue-900/80 text-blue-900 dark:text-blue-200 font-extrabold text-[10px] px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-700">
                              Rev#{idx+1}: {formatReadableDate(d)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No review dates</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* SDPO Note Preview */}
                {c.sdpoSupervisionNote && (
                  <div className="p-3 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 text-xs flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-purple-900 dark:text-purple-300 block mb-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                        <span>SDPO Directive Memo:</span>
                      </span>
                      <p className="text-slate-800 dark:text-purple-100 font-medium italic">
                        "{c.sdpoSupervisionNote}"
                      </p>
                    </div>

                    {currentRole === 'SDPO' && onDeleteSupervisionNote && (
                      <button
                        onClick={() => onDeleteSupervisionNote(c.id)}
                        className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0 flex items-center gap-1 mt-0.5"
                        title="Delete SDPO Supervision Note"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear Note</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Actions Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    CCTNS Sync: <strong>{c.chargesheetUploadedCCTNS ? 'CS Uploaded' : 'CS Pending'}</strong> •{' '}
                    <strong>{c.caseDiaryUploadedCCTNS ? 'CD Synced' : 'CD Pending'}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenQRCode && (
                      <button
                        type="button"
                        onClick={() => onOpenQRCode(c)}
                        className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1 cursor-pointer"
                        title="Generate Field QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Code</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onViewCase(c)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Dossier</span>
                    </button>
                    {!isReadOnly && (
                      <button
                        onClick={() => onEditCase(c)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Case & Dates</span>
                      </button>
                    )}
                    {!isReadOnly && onDeleteCase && (
                      <button
                        onClick={() => onDeleteCase(c.id)}
                        className="px-3 py-1.5 bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 hover:bg-rose-600 hover:text-white font-bold text-xs rounded-lg transition flex items-center gap-1"
                        title="Delete Case Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
