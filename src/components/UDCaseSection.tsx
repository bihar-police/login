import React, { useState, useEffect, useMemo } from 'react';
import {
  UDCase,
  FIRCase,
  PoliceStationName,
  UserRole,
  PoliceStation,
  CaseStatus,
  CaseDesignation,
  PunishmentTerm,
  CCTNSSyncOption,
} from '../types';
import { INITIAL_POLICE_STATIONS } from '../data/mockData';
import {
  formatReadableDate,
  getPSFromRole,
  getDeadlineInfo,
  matchesCaseFullDatabaseSearch,
  isCaseChargesheetedOrFinalForm,
} from '../utils/helpers';
import {
  Shield,
  ShieldCheck,
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Edit3,
  X,
  FileSpreadsheet,
  Printer,
  Trash2,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Scale,
  HeartPulse,
  Users,
  Crosshair,
  Wine,
  Camera,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/reportExport';

interface UDCaseSectionProps {
  udCases: UDCase[];
  nonSrCases: FIRCase[];
  currentRole: UserRole;
  onAddUDCase: (newUD: Omit<UDCase, 'id'>) => void;
  onUpdateUDCase: (updatedUD: UDCase) => void;
  onDeleteUDCase?: (id: string) => void;
  onViewFIR: (caseItem: FIRCase) => void;
  onEditFIR: (caseItem: FIRCase) => void;
  isReadOnly?: boolean;
  availablePoliceStations?: PoliceStation[];
}

export const UDCaseSection: React.FC<UDCaseSectionProps> = ({
  udCases,
  nonSrCases,
  currentRole,
  onAddUDCase,
  onUpdateUDCase,
  onDeleteUDCase,
  onViewFIR,
  onEditFIR,
  isReadOnly = false,
  availablePoliceStations,
}) => {
  const activePS = getPSFromRole(currentRole);
  const isSuperUser = currentRole === 'SDPO' || currentRole === 'SP' || currentRole === 'DISTRICT_ADMIN' || currentRole === 'ADMINISTRATOR';
  const isCI = currentRole === 'CI';

  const psOptions =
    availablePoliceStations && availablePoliceStations.length > 0
      ? Array.from(new Set(availablePoliceStations.map((p) => p.name)))
      : Array.from(new Set(INITIAL_POLICE_STATIONS.map((p) => p.name)));

  const [activeSubTab, setActiveSubTab] = useState<'UD' | 'NON_SR'>('NON_SR');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUD, setEditingUD] = useState<UDCase | null>(null);

  // New UD Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [ps, setPs] = useState<PoliceStationName>(activePS || (psOptions[0] as PoliceStationName) || 'Tarapur');
  const [udCaseNo, setUdCaseNo] = useState('');
  const [date, setDate] = useState(todayStr);
  const [deceasedName, setDeceasedName] = useState('');
  const [deceasedAgeGender, setDeceasedAgeGender] = useState('');
  const [placeOfOccurrence, setPlaceOfOccurrence] = useState('');
  const [causeOfDeath, setCauseOfDeath] = useState('');
  const [pmStatus, setPmStatus] = useState<'Pending' | 'Received'>('Pending');
  const [visceraStatus, setVisceraStatus] = useState<'Not Required' | 'Sent for Testing' | 'Report Received'>('Not Required');

  // ==========================================
  // NON-SR SUPERVISION & REVIEW FILTER STATES
  // ==========================================
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [psFilter, setPsFilter] = useState<PoliceStationName | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'ALL'>('ALL');
  const [chargesheetedFilter, setChargesheetedFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [deadlineLimitFilter, setDeadlineLimitFilter] = useState<'ALL' | '60' | '90'>('ALL');
  const [deadlineStatusFilter, setDeadlineStatusFilter] = useState<'ALL' | 'ON_TRACK' | 'APPROACHING' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [ioFilter, setIoFilter] = useState<string>('ALL');
  const [punishmentFilter, setPunishmentFilter] = useState<'ALL' | '7_years_or_more' | 'less_than_7_years'>('ALL');
  const [cctnsSyncFilter, setCctnsSyncFilter] = useState<CCTNSSyncOption>('ALL');

  // Milestone Status Filters
  const [poVisitFilter, setPoVisitFilter] = useState<'ALL' | 'VISITED' | 'PENDING'>('ALL');
  const [ciSupervisionFilter, setCiSupervisionFilter] = useState<'ALL' | 'ISSUED' | 'PENDING'>('ALL');
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
  const [disposedStartDate, setDisposedStartDate] = useState('');
  const [disposedEndDate, setDisposedEndDate] = useState('');

  // Extract unique IOs for NON-SR Cases
  const uniqueIOs = useMemo(() => {
    const set = new Set<string>();
    nonSrCases.forEach((c) => {
      if (c.ioName) set.add(c.ioName);
    });
    return Array.from(set).sort();
  }, [nonSrCases]);

  useEffect(() => {
    if (activePS) {
      setPs(activePS);
    } else if (psOptions.length > 0 && !psOptions.includes(ps)) {
      setPs(psOptions[0] as PoliceStationName);
    }
  }, [availablePoliceStations, activePS]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setPsFilter('ALL');
    setStatusFilter('ALL');
    setChargesheetedFilter('ALL');
    setDeadlineLimitFilter('ALL');
    setDeadlineStatusFilter('ALL');
    setIoFilter('ALL');
    setPunishmentFilter('ALL');
    setCctnsSyncFilter('ALL');
    setPoVisitFilter('ALL');
    setCiSupervisionFilter('ALL');
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
    setDisposedStartDate('');
    setDisposedEndDate('');
  };

  // Filtered UD cases
  const visibleUDCases = activePS ? udCases.filter((u) => u.ps === activePS) : udCases;

  // Filtered NON-SR cases with all Supervision & Review filters applied
  const filteredNonSrCases = useMemo(() => {
    const baseCases = activePS ? nonSrCases.filter((c) => c.ps === activePS) : nonSrCases;

    return baseCases.filter((c) => {
      // PS Filter
      if (psFilter !== 'ALL' && c.ps !== psFilter) return false;

      // Status Filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;

      // Chargesheeted / Final Form Submitted / MoF Filter
      if (chargesheetedFilter !== 'ALL') {
        const isCS = isCaseChargesheetedOrFinalForm(c);
        if (chargesheetedFilter === 'YES' && !isCS) return false;
        if (chargesheetedFilter === 'NO' && isCS) return false;
      }

      // 60/90 Days Limit Filter
      if (deadlineLimitFilter === '60' && c.deadlineDays !== 60) return false;
      if (deadlineLimitFilter === '90' && c.deadlineDays !== 90) return false;

      // Deadline Status Filter
      const deadlineInfo = getDeadlineInfo(c);
      if (deadlineStatusFilter !== 'ALL' && deadlineInfo.code !== deadlineStatusFilter) return false;

      // IO Filter
      if (ioFilter !== 'ALL' && c.ioName !== ioFilter) return false;

      // Punishment Term Filter
      if (punishmentFilter !== 'ALL' && c.punishmentTerm !== punishmentFilter) return false;

      // CCTNS Sync Filter
      if (cctnsSyncFilter === 'CS_SYNC' && (!c.chargesheetUploadedCCTNS || c.caseDiaryUploadedCCTNS)) return false;
      if (cctnsSyncFilter === 'CD_SYNC' && (!c.caseDiaryUploadedCCTNS || c.chargesheetUploadedCCTNS)) return false;
      if (cctnsSyncFilter === 'BOTH_SYNC' && (!c.chargesheetUploadedCCTNS || !c.caseDiaryUploadedCCTNS)) return false;
      if (cctnsSyncFilter === 'NONE_SYNC' && (c.chargesheetUploadedCCTNS || c.caseDiaryUploadedCCTNS)) return false;

      // PO Visit Filter
      if (poVisitFilter === 'VISITED' && !c.poVisitDate) return false;
      if (poVisitFilter === 'PENDING' && c.poVisitDate) return false;

      // CI Supervision Directive Filter
      if (ciSupervisionFilter === 'ISSUED' && !c.ciSupervisionNote && !c.supervisionDate) return false;
      if (ciSupervisionFilter === 'PENDING' && (c.ciSupervisionNote || c.supervisionDate)) return false;

      // PR Filter
      if (prFilter === 'ISSUED' && (!c.prDates || c.prDates.length === 0)) return false;
      if (prFilter === 'PENDING' && c.prDates && c.prDates.length > 0) return false;

      // Final PR Filter
      if (finalPrFilter === 'ISSUED' && !c.finalPrDate) return false;
      if (finalPrFilter === 'PENDING' && c.finalPrDate) return false;

      // Case Review Filter
      if (caseReviewFilter === 'REVIEWED' && (!c.caseReviewDates || c.caseReviewDates.length === 0)) return false;
      if (caseReviewFilter === 'PENDING' && c.caseReviewDates && c.caseReviewDates.length > 0) return false;

      // Date Range Filters
      if (firStartDate && c.firDate < firStartDate) return false;
      if (firEndDate && c.firDate > firEndDate) return false;

      if (chargesheetStartDate && (!c.chargesheetDate || c.chargesheetDate < chargesheetStartDate)) return false;
      if (chargesheetEndDate && (!c.chargesheetDate || c.chargesheetDate > chargesheetEndDate)) return false;

      if (supervisionStartDate && (!c.supervisionDate || c.supervisionDate < supervisionStartDate)) return false;
      if (supervisionEndDate && (!c.supervisionDate || c.supervisionDate > supervisionEndDate)) return false;

      if (finalPrStartDate && (!c.finalPrDate || c.finalPrDate < finalPrStartDate)) return false;
      if (finalPrEndDate && (!c.finalPrDate || c.finalPrDate > finalPrEndDate)) return false;

      const caseDisposedDate = c.disposedDate || (c.status === 'Disposed' ? c.updatedAt : '');
      if (disposedStartDate && (!caseDisposedDate || caseDisposedDate < disposedStartDate)) return false;
      if (disposedEndDate && (!caseDisposedDate || caseDisposedDate > disposedEndDate)) return false;

      // Full Database Search Query
      if (searchQuery.trim()) {
        if (!matchesCaseFullDatabaseSearch(c, searchQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [
    activePS,
    nonSrCases,
    psFilter,
    statusFilter,
    chargesheetedFilter,
    deadlineLimitFilter,
    deadlineStatusFilter,
    ioFilter,
    punishmentFilter,
    cctnsSyncFilter,
    poVisitFilter,
    ciSupervisionFilter,
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
    disposedStartDate,
    disposedEndDate,
    searchQuery,
  ]);

  // NON-SR Summary Stats
  const nonSrStats = useMemo(() => {
    const total = filteredNonSrCases.length;
    const underInv = filteredNonSrCases.filter((c) => c.status === 'Under Investigation').length;
    const disposed = filteredNonSrCases.filter((c) => c.status === 'Disposed').length;
    const chargesheeted = filteredNonSrCases.filter((c) => isCaseChargesheetedOrFinalForm(c)).length;
    const overdue = filteredNonSrCases.filter((c) => getDeadlineInfo(c).code === 'OVERDUE').length;
    const pendingCiDirective = filteredNonSrCases.filter((c) => c.status === 'Under Investigation' && !c.ciSupervisionNote).length;
    const forensicsPresent = filteredNonSrCases.filter((c) => c.isInjuryPresent || c.fslVisitedPO || c.fslReportReceived).length;
    const pendingArrests = filteredNonSrCases.filter((c) => c.pendingForArrest || (c.pendingArrestCount && c.pendingArrestCount > 0)).length;

    return {
      total,
      underInv,
      disposed,
      chargesheeted,
      overdue,
      pendingCiDirective,
      forensicsPresent,
      pendingArrests,
    };
  }, [filteredNonSrCases]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!udCaseNo.trim() || !deceasedName.trim() || !placeOfOccurrence.trim() || !causeOfDeath.trim()) {
      alert('Please fill in all mandatory fields.');
      return;
    }

    onAddUDCase({
      udCaseNo: udCaseNo.trim(),
      ps,
      date,
      deceasedName: deceasedName.trim(),
      deceasedAgeGender: deceasedAgeGender.trim() || undefined,
      placeOfOccurrence: placeOfOccurrence.trim(),
      causeOfDeath: causeOfDeath.trim(),
      postMortemReportStatus: pmStatus,
      visceralReportStatus: visceraStatus,
      status: 'Under Investigation',
      ciSupervisionRemarks: isCI || isSuperUser ? 'Reviewed by Circle Inspector.' : undefined,
    });

    setIsAddModalOpen(false);
    setUdCaseNo('');
    setDeceasedName('');
    setDeceasedAgeGender('');
    setPlaceOfOccurrence('');
    setCauseOfDeath('');
  };

  const handleUpdateUDSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUD) return;
    onUpdateUDCase(editingUD);
    setEditingUD(null);
  };

  const handleExportExcel = () => {
    if (activeSubTab === 'UD') {
      const headers = ['UD Case No', 'Police Station', 'Date', 'Deceased Name', 'Age / Gender', 'Place of Occurrence', 'Cause of Death', 'Post Mortem Report', 'Viscera Report', 'CI Remarks'];
      const rows = visibleUDCases.map((u) => [
        u.udCaseNo,
        `${u.ps} PS`,
        u.date,
        u.deceasedName,
        u.deceasedAgeGender || 'N/A',
        u.placeOfOccurrence,
        u.causeOfDeath,
        u.postMortemReportStatus,
        u.visceralReportStatus,
        u.ciSupervisionRemarks || 'N/A',
      ]);
      exportToExcel('UD_Cases_Register_Report', headers, rows);
    } else {
      const headers = [
        'FIR No',
        'Police Station',
        'FIR Date',
        'Statutory Limit',
        'Limit Status',
        'Sections',
        'IO Name',
        'Stage Status',
        'CS/FF/MoF',
        'Chargesheet No/Date',
        'PO Visit Date',
        'CI Directive / Note',
        'PR Count',
        'Review Count',
        'Injury Details',
        'Forensics/FSL',
        'Arrests Made',
        'Pending Arrests',
        'TARGET Date',
      ];
      const rows = filteredNonSrCases.map((c) => {
        const dl = getDeadlineInfo(c);
        const isCS = isCaseChargesheetedOrFinalForm(c);
        return [
          c.firNumber,
          `${c.ps} PS`,
          c.firDate,
          `${c.deadlineDays} Days`,
          dl.label,
          c.sections,
          c.ioName,
          c.status,
          isCS ? 'Yes' : 'No',
          c.chargesheetNumber ? `${c.chargesheetNumber} (${c.chargesheetDate || 'Date N/A'})` : 'Pending',
          c.poVisitDate || 'Pending',
          c.ciSupervisionNote || 'Pending Directive',
          c.prDates?.length || 0,
          c.caseReviewDates?.length || 0,
          c.isInjuryPresent ? 'Injury Present' : 'No Injury',
          c.fslReportReceived ? 'FSL Received' : c.fslVisitedPO ? 'FSL Visited' : 'No FSL',
          c.arrestedCount || (c.anyPersonArrested ? 'Yes' : 0),
          c.pendingArrestCount || (c.pendingForArrest ? 'Yes' : 0),
          c.targetDisposalDate || 'N/A',
        ];
      });
      exportToExcel('NON_SR_Cases_Supervision_and_Review_Report', headers, rows);
    }
  };

  const handleExportPDF = () => {
    if (activeSubTab === 'UD') {
      const headers = ['UD Case & Station', 'Deceased Particulars', 'Occurrence & Cause', 'Post Mortem', 'Viscera', 'CI Remarks'];
      const rows = visibleUDCases.map((u) => [
        `${u.udCaseNo}\n${u.ps} PS (${u.date})`,
        `${u.deceasedName}\n${u.deceasedAgeGender || ''}`,
        `Cause: ${u.causeOfDeath}\nPO: ${u.placeOfOccurrence}`,
        u.postMortemReportStatus,
        u.visceralReportStatus,
        u.ciSupervisionRemarks || 'N/A',
      ]);
      exportToPDF(
        'Unnatural Death (UD) Cases Register Report',
        `Circle Inspector Supervision Audit (${visibleUDCases.length} Records)`,
        headers,
        rows,
        [{ label: 'Total UD Cases', value: visibleUDCases.length }]
      );
    } else {
      const headers = ['FIR No & PS', 'FIR Date / Limit', 'Sections & Offence', 'IO Name', 'Status & CS', 'CI Directive & Review'];
      const rows = filteredNonSrCases.map((c) => {
        const dl = getDeadlineInfo(c);
        return [
          `FIR ${c.firNumber}\n(${c.ps} PS)`,
          `${c.firDate}\n[${dl.label}]`,
          c.sections,
          c.ioName,
          `${c.status}\nCS Upload: ${c.chargesheetUploadedCCTNS ? 'Yes' : 'No'}`,
          `CI Note: ${c.ciSupervisionNote || 'Pending'}\nReviews: ${c.caseReviewDates?.length || 0} logged`,
        ];
      });
      exportToPDF(
        'NON-SR Cases Supervision & Case Review Audit Report',
        `Subdivision NON-SR Case Audit (${filteredNonSrCases.length} Cases)`,
        headers,
        rows,
        [
          { label: 'Total Filtered Cases', value: filteredNonSrCases.length },
          { label: 'Under Investigation', value: nonSrStats.underInv },
          { label: 'Disposed', value: nonSrStats.disposed },
          { label: 'Overdue Limit', value: nonSrStats.overdue },
        ]
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">
                Circle Inspector (CI) & SDPO Supervision Desk {activePS ? `— ${activePS} PS` : ''}
              </h2>
              <span className="bg-blue-500/20 text-blue-300 font-mono text-xs px-2 py-0.5 rounded border border-blue-400/30">
                NON-SR & UD Case Management
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive supervision, investigation milestones, evidence parameters, and review registry for all NON-SR criminal cases & Unnatural Deaths.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xls)</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition border border-slate-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF Dossier</span>
          </button>

          {!isReadOnly && activeSubTab === 'UD' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New UD Case Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
        <button
          onClick={() => setActiveSubTab('NON_SR')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'NON_SR'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>NON-SR Cases Supervision & Review ({nonSrCases.length})</span>
          <span className="bg-blue-900/40 text-blue-100 text-[10px] px-1.5 py-0.2 rounded-full font-black">
            Full Parameters
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('UD')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'UD'
              ? 'bg-slate-900 text-white dark:bg-slate-700 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Unnatural Death (UD) Register ({visibleUDCases.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NON-SR CASES SUPERVISION & COMPREHENSIVE CASE REVIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'NON_SR' && (
        <div className="space-y-4">
          
          {/* NON-SR Command KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total NON-SR</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{nonSrStats.total}</div>
            </div>

            <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block">Under Inv.</span>
              <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{nonSrStats.underInv}</div>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">Disposed / CS</span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{nonSrStats.disposed}</div>
            </div>

            <div className="bg-rose-50/70 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-400 block">Overdue Limit</span>
              <div className="text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5">{nonSrStats.overdue}</div>
            </div>

            <div className="bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200/80 dark:border-blue-900/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-400 block">Pending CI Memo</span>
              <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5">{nonSrStats.pendingCiDirective}</div>
            </div>

            <div className="bg-purple-50/70 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200/80 dark:border-purple-900/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-400 block">FSL / Medical</span>
              <div className="text-xl font-black text-purple-700 dark:text-purple-300 mt-0.5">{nonSrStats.forensicsPresent}</div>
            </div>

            <div className="bg-orange-50/70 dark:bg-orange-950/40 p-3 rounded-xl border border-orange-200/80 dark:border-orange-900/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-orange-800 dark:text-orange-400 block">Pending Arrest</span>
              <div className="text-xl font-black text-orange-700 dark:text-orange-300 mt-0.5">{nonSrStats.pendingArrests}</div>
            </div>

            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-400 block">CS/FF Ratio</span>
              <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5">{nonSrStats.chargesheeted}</div>
            </div>
          </div>

          {/* Complete Supervision & Review Filter Matrix */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 text-xs">
            
            {/* Search Bar & Primary Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Full Search (FIR No, Complainant, Accused, Sections, CI Directives, Target)..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div>
                <select
                  value={psFilter}
                  onChange={(e) => setPsFilter(e.target.value as PoliceStationName | 'ALL')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Police Stations</option>
                  {psOptions.map((st) => (
                    <option key={st} value={st}>
                      {st} PS
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CaseStatus | 'ALL')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="ALL">Status: All (Investigation & Disposed)</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Disposed">Disposed (Investigation Completed / CS / FF)</option>
                </select>
              </div>
            </div>

            {/* Quick Row 2: CS/FF/MoF, Statutory Limit, Limit Status, IO Filter */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                  CS / Final Form / MoF
                </label>
                <select
                  value={chargesheetedFilter}
                  onChange={(e) => setChargesheetedFilter(e.target.value as 'ALL' | 'YES' | 'NO')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="ALL">Chargesheeted / FF: All</option>
                  <option value="YES">Yes (Chargesheeted / FF Submitted)</option>
                  <option value="NO">No (Pending Chargesheet / FF)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                  Statutory Limit
                </label>
                <select
                  value={deadlineLimitFilter}
                  onChange={(e) => setDeadlineLimitFilter(e.target.value as 'ALL' | '60' | '90')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="ALL">60 / 90 Days: All</option>
                  <option value="60">60 Days Limit Cases</option>
                  <option value="90">90 Days Limit Cases</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                  Deadline Status
                </label>
                <select
                  value={deadlineStatusFilter}
                  onChange={(e) => setDeadlineStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="ALL">Deadline: All Statuses</option>
                  <option value="ON_TRACK">🟢 On Track (&gt;15 Days)</option>
                  <option value="APPROACHING">🟡 Approaching (≤15 Days)</option>
                  <option value="OVERDUE">🔴 Overdue (&gt;60/90 Days)</option>
                  <option value="COMPLETED">🟣 Completed / Disposed</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                  Investigating Officer (IO)
                </label>
                <select
                  value={ioFilter}
                  onChange={(e) => setIoFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Investigating Officers</option>
                  {uniqueIOs.map((io) => (
                    <option key={io} value={io}>
                      {io}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toggle Advanced Filters Button */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  {isAdvancedFiltersOpen ? 'Hide Milestone & Date Filters' : 'Show Milestone, PR, Review & Date Filters'}
                </span>
                {isAdvancedFiltersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-slate-500 hover:text-rose-600 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            </div>

            {/* Expandable Advanced Filters */}
            {isAdvancedFiltersOpen && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fadeIn">
                
                {/* Milestone Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      PO Visit Date
                    </label>
                    <select
                      value={poVisitFilter}
                      onChange={(e) => setPoVisitFilter(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold"
                    >
                      <option value="ALL">PO Visit: All</option>
                      <option value="VISITED">✓ PO Visited</option>
                      <option value="PENDING">✗ Visit Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      CI Directive / Memo
                    </label>
                    <select
                      value={ciSupervisionFilter}
                      onChange={(e) => setCiSupervisionFilter(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold"
                    >
                      <option value="ALL">CI Directive: All</option>
                      <option value="ISSUED">✓ Memo Issued</option>
                      <option value="PENDING">✗ Memo Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Progress Reports (PR)
                    </label>
                    <select
                      value={prFilter}
                      onChange={(e) => setPrFilter(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold"
                    >
                      <option value="ALL">PRs: All</option>
                      <option value="ISSUED">✓ PR Issued</option>
                      <option value="PENDING">✗ No PR Issued</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Final PR Status
                    </label>
                    <select
                      value={finalPrFilter}
                      onChange={(e) => setFinalPrFilter(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold"
                    >
                      <option value="ALL">Final PR: All</option>
                      <option value="ISSUED">✓ Final PR Done</option>
                      <option value="PENDING">✗ Final PR Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Case Reviews Logged
                    </label>
                    <select
                      value={caseReviewFilter}
                      onChange={(e) => setCaseReviewFilter(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold"
                    >
                      <option value="ALL">Reviews: All</option>
                      <option value="REVIEWED">✓ Reviewed (≥1)</option>
                      <option value="PENDING">✗ No Reviews Logged</option>
                    </select>
                  </div>
                </div>

                {/* Additional Classifiers: Punishment & CCTNS Sync */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Punishment Classification
                    </label>
                    <select
                      value={punishmentFilter}
                      onChange={(e) => setPunishmentFilter(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold"
                    >
                      <option value="ALL">Punishment: All Categories</option>
                      <option value="7_years_or_more">≥ 7 Years or More</option>
                      <option value="less_than_7_years">&lt; 7 Years (Less)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      CCTNS Synchronization
                    </label>
                    <select
                      value={cctnsSyncFilter}
                      onChange={(e) => setCctnsSyncFilter(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold"
                    >
                      <option value="ALL">CCTNS Sync: All</option>
                      <option value="BOTH_SYNC">✓ Both CS & CD Uploaded</option>
                      <option value="CS_SYNC">Chargesheet Uploaded Only</option>
                      <option value="CD_SYNC">Case Diary (CD) Uploaded Only</option>
                      <option value="NONE_SYNC">✗ Neither Uploaded</option>
                    </select>
                  </div>
                </div>

                {/* Date Ranges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">FIR Registration From</label>
                    <input
                      type="date"
                      value={firStartDate}
                      onChange={(e) => setFirStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">FIR Registration To</label>
                    <input
                      type="date"
                      value={firEndDate}
                      onChange={(e) => setFirEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Chargesheet From</label>
                    <input
                      type="date"
                      value={chargesheetStartDate}
                      onChange={(e) => setChargesheetStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Chargesheet To</label>
                    <input
                      type="date"
                      value={chargesheetEndDate}
                      onChange={(e) => setChargesheetEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NON-SR Cases Supervision Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>NON-SR Cases Supervision & Review Register ({filteredNonSrCases.length} Records)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3">FIR No & PS</th>
                    <th className="py-3 px-3">FIR Date & Limit</th>
                    <th className="py-3 px-3">Sections & Offence</th>
                    <th className="py-3 px-3">IO Name</th>
                    <th className="py-3 px-3">Status & CS</th>
                    <th className="py-3 px-3">PO & CI Directive</th>
                    <th className="py-3 px-3">Review & Forensics</th>
                    <th className="py-3 px-3 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {filteredNonSrCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-bold text-xs uppercase tracking-wider">No NON-SR cases found matching the active filters</p>
                      </td>
                    </tr>
                  ) : (
                    filteredNonSrCases.map((c) => {
                      const deadline = getDeadlineInfo(c);
                      const isCS = isCaseChargesheetedOrFinalForm(c);
                      const reviewsCount = c.caseReviewDates?.length || 0;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          
                          {/* FIR No & PS */}
                          <td className="py-3 px-3">
                            <div className="font-black text-slate-900 dark:text-white text-xs">
                              FIR {c.firNumber}
                            </div>
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                              {c.ps} PS
                            </span>
                          </td>

                          {/* FIR Date & Limit */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {formatReadableDate(c.firDate)}
                            </div>
                            <span className={`inline-block mt-0.5 text-[10px] font-black px-1.5 py-0.2 rounded ${deadline.badgeBg}`}>
                              {deadline.label} ({c.deadlineDays}d)
                            </span>
                          </td>

                          {/* Sections */}
                          <td className="py-3 px-3 max-w-xs">
                            <div className="font-mono text-[11px] text-slate-900 dark:text-slate-100 line-clamp-2" title={c.sections}>
                              {c.sections}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              Complainant: {c.complainantName}
                            </div>
                          </td>

                          {/* IO Name */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">{c.ioName}</div>
                            <span className="text-[10px] text-slate-500">
                              {c.punishmentTerm === '7_years_or_more' ? '≥ 7 Yrs' : '< 7 Yrs'}
                            </span>
                          </td>

                          {/* Status & CS */}
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                                c.status === 'Disposed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {c.status}
                            </span>
                            <div className="text-[10px] mt-0.5 font-semibold text-slate-500">
                              CS: {isCS ? <span className="text-emerald-600 font-bold">✓ Submitted</span> : '✗ Pending'}
                            </div>
                          </td>

                          {/* PO & CI Directive */}
                          <td className="py-3 px-3 max-w-xs">
                            <div className="text-[10px] text-slate-500">
                              PO Visit: {c.poVisitDate ? <span className="text-purple-600 font-bold">{formatReadableDate(c.poVisitDate)}</span> : <span className="text-amber-600">Pending</span>}
                            </div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 italic line-clamp-2 mt-0.5">
                              {c.ciSupervisionNote ? `CI Memo: ${c.ciSupervisionNote}` : <span className="text-slate-400">No CI memo entered</span>}
                            </p>
                          </td>

                          {/* Case Review & Forensics Badges */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {reviewsCount > 0 ? (
                                <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-black px-1.5 py-0.2 rounded border border-blue-200">
                                  {reviewsCount} Reviews
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] px-1.5 py-0.2 rounded">
                                  0 Reviews
                                </span>
                              )}

                              {c.isInjuryPresent && (
                                <span className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  Injury
                                </span>
                              )}

                              {c.fslVisitedPO && (
                                <span className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  FSL
                                </span>
                              )}

                              {(c.pendingForArrest || (c.pendingArrestCount && c.pendingArrestCount > 0)) && (
                                <span className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  {c.pendingArrestCount || 1} To Arrest
                                </span>
                              )}

                              {c.targetDisposalDate && (
                                <span className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded">
                                  Target: {c.targetDisposalDate}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions: Review Case & View */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onViewFIR(c)}
                                className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                                title="View Dossier"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => onEditFIR(c)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                                  title="Review Case & Update All Forensics/Supervision Parameters"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Review Case</span>
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UNNATURAL DEATH (UD) CASES VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'UD' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleUDCases.length === 0 ? (
            <div className="col-span-2 bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">No Unnatural Death (UD) Cases Found</p>
            </div>
          ) : (
            visibleUDCases.map((u) => (
              <div key={u.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white font-bold text-xs px-2 py-0.5 rounded">
                      {u.udCaseNo}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {u.ps} PS
                    </span>
                  </div>

                  <span className="text-xs text-slate-500 font-medium">
                    {formatReadableDate(u.date)}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    Deceased: {u.deceasedName}
                  </div>
                  {u.deceasedAgeGender && (
                    <div className="text-slate-500 text-[11px]">Age/Gender: {u.deceasedAgeGender}</div>
                  )}
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Cause of Death:</strong> {u.causeOfDeath}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    <strong>PO:</strong> {u.placeOfOccurrence}
                  </p>
                </div>

                {/* Medical & FSL Status */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Post Mortem:</span>
                    <span className={`font-bold ${u.postMortemReportStatus === 'Received' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {u.postMortemReportStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Viscera Testing:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{u.visceralReportStatus}</span>
                  </div>
                </div>

                {/* Supervision Remarks */}
                {u.ciSupervisionRemarks && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs">
                    <strong>CI Directive:</strong> {u.ciSupervisionRemarks}
                  </div>
                )}

                {!isReadOnly && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingUD(u)}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Edit Status & Remarks
                    </button>
                    {onDeleteUDCase && (
                      <button
                        onClick={() => onDeleteUDCase(u.id)}
                        className="bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 hover:bg-rose-600 hover:text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title="Delete UD Case"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* New UD Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">New Unnatural Death (UD) Case Entry</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Police Station</label>
                  <select
                    value={ps}
                    onChange={(e) => setPs(e.target.value as PoliceStationName)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold"
                  >
                    {psOptions.map((st) => (
                      <option key={st} value={st}>
                        {st} PS
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">UD Case Number</label>
                  <input
                    type="text"
                    value={udCaseNo}
                    onChange={(e) => setUdCaseNo(e.target.value)}
                    placeholder="e.g. UD 14/2026"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deceased Name & Particulars</label>
                <input
                  type="text"
                  value={deceasedName}
                  onChange={(e) => setDeceasedName(e.target.value)}
                  placeholder="Full Name of Deceased"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Age / Gender</label>
                  <input
                    type="text"
                    value={deceasedAgeGender}
                    onChange={(e) => setDeceasedAgeGender(e.target.value)}
                    placeholder="e.g. 30 Yrs / Male"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Occurrence Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Place of Occurrence</label>
                <input
                  type="text"
                  value={placeOfOccurrence}
                  onChange={(e) => setPlaceOfOccurrence(e.target.value)}
                  placeholder="Village, River bank, Railway track..."
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Suspected Cause of Death</label>
                <input
                  type="text"
                  value={causeOfDeath}
                  onChange={(e) => setCauseOfDeath(e.target.value)}
                  placeholder="Drowning, Electrocution, Poisoning, Traffic Accident..."
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Post Mortem Report</label>
                  <select
                    value={pmStatus}
                    onChange={(e) => setPmStatus(e.target.value as 'Pending' | 'Received')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Received">Received</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Viscera Testing</label>
                  <select
                    value={visceraStatus}
                    onChange={(e) => setVisceraStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value="Not Required">Not Required</option>
                    <option value="Sent for Testing">Sent for Testing</option>
                    <option value="Report Received">Report Received</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md"
                >
                  Create Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit UD Modal */}
      {editingUD && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit UD Case #{editingUD.udCaseNo}</h3>
                <span className="text-slate-500">{editingUD.ps} PS • Deceased: {editingUD.deceasedName}</span>
              </div>
              <button onClick={() => setEditingUD(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUDSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Post Mortem Report</label>
                  <select
                    value={editingUD.postMortemReportStatus}
                    onChange={(e) => setEditingUD({ ...editingUD, postMortemReportStatus: e.target.value as 'Pending' | 'Received' })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Received">Received</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Viscera Status</label>
                  <select
                    value={editingUD.visceralReportStatus}
                    onChange={(e) => setEditingUD({ ...editingUD, visceralReportStatus: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold"
                  >
                    <option value="Not Required">Not Required</option>
                    <option value="Sent for Testing">Sent for Testing</option>
                    <option value="Report Received">Report Received</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Investigation Status</label>
                <select
                  value={editingUD.status}
                  onChange={(e) => setEditingUD({ ...editingUD, status: e.target.value as 'Under Investigation' | 'Final Report Submitted' | 'Closed' })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold"
                >
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Final Report Submitted">Final Report Submitted</option>
                  <option value="Closed">Closed (Inquest & Investigation Concluded)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Circle Inspector (CI) Supervision Remarks</label>
                <textarea
                  rows={3}
                  value={editingUD.ciSupervisionRemarks || ''}
                  onChange={(e) => setEditingUD({ ...editingUD, ciSupervisionRemarks: e.target.value })}
                  placeholder="Enter CI directives, inquest observations, or final order..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUD(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md"
                >
                  Update UD Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
