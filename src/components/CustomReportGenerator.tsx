import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FIRCase,
  CrimeHead,
  UserRole,
  UserAccount,
  PoliceDistrict,
  PoliceSubdivision,
  PoliceStation,
  InvestigatingOfficer,
  CaseDesignation,
  CaseStatus,
  ReviewFilterValue,
} from '../types';
import {
  getDynamicCrimeHeadsConfig,
  doesCaseMatchCrimeHead as matchCaseCrimeHead,
  classifyCrimeHead,
  classifyAllCrimeHeads,
  getCaseCrimeHeads,
  CRIME_HEADS_CONFIG,
  ALL_CRIME_HEADS,
  CrimeHeadMeta,
} from '../utils/crimeClassifier';
import {
  getDeadlineInfo,
  formatReadableDate,
  isCaseCompleted,
  isCaseChargesheetedOrFinalForm,
} from '../utils/helpers';
import { exportToExcel, generateDirectPDF } from '../utils/reportExport';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  CheckSquare,
  Square,
  ArrowUpDown,
  Search,
  RotateCcw,
  Eye,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Scale,
  Shield,
  Clock,
  Calendar,
  Building,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  X,
  Download,
  Check,
  Tag,
  Stethoscope,
  UserCheck,
  HeartHandshake,
  FileSearch,
  Zap,
} from 'lucide-react';

interface CustomReportGeneratorProps {
  cases: FIRCase[];
  ios: InvestigatingOfficer[];
  currentRole: UserRole;
  currentUserAccount?: UserAccount | null;
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  availablePoliceStations?: PoliceStation[];
  onViewCase: (c: FIRCase) => void;
}

// =========================================================================
// MULTI-SELECT DROPDOWN COMPONENT WITH SEARCH & CHIPS
// =========================================================================
interface MultiSelectDropdownProps<T extends string> {
  label: string;
  options: { value: T; label: string; icon?: string | React.ReactNode; subtext?: string }[];
  selectedValues: T[];
  onChange: (values: T[]) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  badgeColor?: string;
}

function MultiSelectDropdown<T extends string>({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select items...',
  icon,
  badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const toggleOption = (val: T) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        {selectedValues.length > 0 && (
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold">
            {selectedValues.length} Selected
          </span>
        )}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[38px] px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-left flex items-center justify-between gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
      >
        <div className="flex items-center gap-1.5 flex-wrap flex-1 max-h-16 overflow-y-auto">
          {selectedValues.length === 0 ? (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          ) : (
            selectedValues.map((val) => {
              const opt = options.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badgeColor}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(val);
                  }}
                >
                  {opt?.icon && <span>{opt.icon}</span>}
                  <span className="truncate max-w-[120px]">{opt ? opt.label : val}</span>
                  <X className="w-3 h-3 hover:text-rose-500 cursor-pointer" />
                </span>
              );
            })
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[260px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-scaleUp">
          {/* Search box */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white"
                autoFocus
              />
            </div>
            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-1.5 px-1 text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Select All ({options.length})
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-rose-500 font-bold hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50 dark:divide-slate-800/40">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">No matching items found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      {opt.icon && <span>{opt.icon}</span>}
                      <div>
                        <div className="truncate font-bold">{opt.label}</div>
                        {opt.subtext && (
                          <div className="text-[10px] text-slate-400 font-normal">{opt.subtext}</div>
                        )}
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Available export fields definition
export interface ReportFieldDef {
  id: string;
  label: string;
  category: 'basic' | 'legal' | 'status' | 'review' | 'forensics' | 'accused' | 'victim' | 'sll' | 'cctns';
  defaultSelected: boolean;
  getValue: (c: FIRCase) => string | number;
}

export const AVAILABLE_REPORT_FIELDS: ReportFieldDef[] = [
  // 1. Basic Info
  { id: 'firNumber', label: 'FIR Number', category: 'basic', defaultSelected: true, getValue: (c) => c.firNumber },
  { id: 'ps', label: 'Police Station (PS)', category: 'basic', defaultSelected: true, getValue: (c) => `${c.ps} PS` },
  { id: 'subdivision', label: 'Subdivision', category: 'basic', defaultSelected: true, getValue: (c) => c.subdivision || 'Tarapur' },
  { id: 'district', label: 'District', category: 'basic', defaultSelected: false, getValue: (c) => c.district || 'Munger' },
  { id: 'firDate', label: 'FIR Date', category: 'basic', defaultSelected: true, getValue: (c) => formatReadableDate(c.firDate) },
  { id: 'placeOfOccurrence', label: 'Place of Occurrence (PO)', category: 'basic', defaultSelected: false, getValue: (c) => c.placeOfOccurrence || '-' },
  { id: 'complainantName', label: 'Complainant Name', category: 'basic', defaultSelected: false, getValue: (c) => c.complainantName || '-' },

  // 2. Legal & Crime Heads
  { id: 'crimeHead', label: 'Standardized Crime Head(s)', category: 'legal', defaultSelected: true, getValue: (c) => {
    const heads = getCaseCrimeHeads(c);
    return heads.length > 0 ? heads.join(', ') : ((c.crimeHead as string) || classifyCrimeHead(c));
  }},
  { id: 'sections', label: 'Statutory Sections (BNS / IPC / SLL)', category: 'legal', defaultSelected: true, getValue: (c) => c.sections },
  { id: 'designation', label: 'Designation (SR / Non-SR)', category: 'legal', defaultSelected: true, getValue: (c) => c.designation || 'PENDING' },
  { id: 'remandTrack', label: 'Remand Track (BNSS 187)', category: 'legal', defaultSelected: false, getValue: (c) => {
    const heads = getCaseCrimeHeads(c);
    const primaryHead = heads[0] || (c.crimeHead as CrimeHead) || classifyCrimeHead(c);
    return CRIME_HEADS_CONFIG[primaryHead]?.remandTrack || `${c.deadlineDays || 60}-Day Track`;
  }},
  { id: 'forensicMandatory', label: 'Forensic Scene Visit (BNSS 176(3))', category: 'legal', defaultSelected: false, getValue: (c) => {
    const heads = getCaseCrimeHeads(c);
    const primaryHead = heads[0] || (c.crimeHead as CrimeHead) || classifyCrimeHead(c);
    return CRIME_HEADS_CONFIG[primaryHead]?.forensicSceneVisit || 'Not Mandatory';
  }},

  // 3. Status & Timelines
  { id: 'status', label: 'Case Status', category: 'status', defaultSelected: true, getValue: (c) => c.status },
  { id: 'ioName', label: 'Investigating Officer (IO)', category: 'status', defaultSelected: true, getValue: (c) => c.ioName || 'Not Assigned' },
  { id: 'daysElapsed', label: 'Days Since FIR', category: 'status', defaultSelected: false, getValue: (c) => getDeadlineInfo(c).daysElapsed },
  { id: 'overdueStatus', label: 'Statutory Overdue Status', category: 'status', defaultSelected: true, getValue: (c) => {
    const dl = getDeadlineInfo(c);
    if (c.status !== 'Under Investigation') return 'Disposed';
    if (dl.code === 'OVERDUE') return `Overdue (${Math.abs(dl.daysRemaining)}d)`;
    return `Within Deadline (${dl.daysRemaining}d left)`;
  }},
  { id: 'targetDisposalDate', label: 'Target Disposal Date', category: 'status', defaultSelected: false, getValue: (c) => c.targetDisposalDate ? formatReadableDate(c.targetDisposalDate) : '-' },
  { id: 'chargesheetNumber', label: 'Chargesheet / Final Form No.', category: 'status', defaultSelected: false, getValue: (c) => c.chargesheetNumber || '-' },
  { id: 'chargesheetDate', label: 'Chargesheet / Final Form Date', category: 'status', defaultSelected: false, getValue: (c) => c.chargesheetDate ? formatReadableDate(c.chargesheetDate) : '-' },

  // 4. Case Review & Supervision Notes
  { id: 'noOfReviews', label: 'No. of Case Reviews', category: 'review', defaultSelected: true, getValue: (c) => c.noOfReviews ?? (c.caseReviewDates?.length || (c.lastCaseReviewDate ? 1 : 0)) },
  { id: 'lastCaseReviewDate', label: 'Last Case Review Date', category: 'review', defaultSelected: true, getValue: (c) => c.lastCaseReviewDate ? formatReadableDate(c.lastCaseReviewDate) : '-' },
  { id: 'supervisionDate', label: 'SDPO Supervision Date', category: 'review', defaultSelected: false, getValue: (c) => c.supervisionDate ? formatReadableDate(c.supervisionDate) : '-' },
  { id: 'sdpoSupervisionNote', label: 'SDPO Supervision Remarks', category: 'review', defaultSelected: false, getValue: (c) => c.sdpoSupervisionNote || '-' },
  { id: 'ciSupervisionNote', label: 'CI Supervision Remarks', category: 'review', defaultSelected: false, getValue: (c) => c.ciSupervisionNote || '-' },
  { id: 'psProgressRemarks', label: 'PS Investigation Remarks', category: 'review', defaultSelected: false, getValue: (c) => c.psProgressRemarks || '-' },

  // 5. Forensics & Medical
  { id: 'injuryReportReceived', label: 'Injury Report Status', category: 'forensics', defaultSelected: false, getValue: (c) => c.injuryReportReceived === true || c.injuryReportReceived === 'YES' ? 'Received' : c.isInjuryPresent ? 'Pending' : 'N/A' },
  { id: 'pmReportReceived', label: 'Post-Mortem (PM) Report', category: 'forensics', defaultSelected: false, getValue: (c) => c.pmReportReceived === true || c.pmReportReceived === 'YES' ? 'Received' : 'Pending/NA' },
  { id: 'fslVisitedPO', label: 'FSL Scene Visit Done', category: 'forensics', defaultSelected: false, getValue: (c) => c.fslVisitedPO === true || c.fslVisitedPO === 'YES' ? 'Yes' : 'Pending/No' },
  { id: 'fslReportReceived', label: 'FSL Forensic Report', category: 'forensics', defaultSelected: false, getValue: (c) => c.fslReportReceived === true || c.fslReportReceived === 'YES' ? 'Received' : 'Pending/NA' },

  // 6. Accused, Arrests & Bail
  { id: 'pendingArrestCount', label: 'Pending Arrest Count', category: 'accused', defaultSelected: true, getValue: (c) => c.pendingArrestCount || (c.pendingForArrest ? 1 : 0) },
  { id: 'pendingArrestNames', label: 'Pending Arrest Accused Names', category: 'accused', defaultSelected: false, getValue: (c) => c.pendingArrestNames || '-' },
  { id: 'arrestedCount', label: 'Arrested Accused Count', category: 'accused', defaultSelected: true, getValue: (c) => c.arrestedCount || (c.anyPersonArrested ? 1 : 0) },
  { id: 'arrestedNames', label: 'Arrested Accused Names', category: 'accused', defaultSelected: false, getValue: (c) => c.arrestedNames || '-' },
  { id: 'noticeServedCount', label: 'Notice Served (41A / 35 BNSS)', category: 'accused', defaultSelected: false, getValue: (c) => c.noticeServedCount || (c.anyPersonServedNotice ? 1 : 0) },
  { id: 'bailSurrenderedCount', label: 'Bail / Surrendered Count', category: 'accused', defaultSelected: false, getValue: (c) => c.bailSurrenderedCount || (c.anyPersonOnBailOrSurrendered ? 1 : 0) },

  // 7. Victim Recovery
  { id: 'victimRecovered', label: 'Victim Recovery Status', category: 'victim', defaultSelected: false, getValue: (c) => c.isVictimRecoveryCase ? (c.victimRecovered ? 'Recovered' : 'Pending Recovery') : 'N/A' },
  { id: 'victimRecoveryDetails', label: 'Victim Recovery Details', category: 'victim', defaultSelected: false, getValue: (c) => c.victimRecoveryDetails || '-' },

  // 8. Special Laws (Arms / Liquor / NDPS)
  { id: 'armsReportReceived', label: 'Arms Verification Report', category: 'sll', defaultSelected: false, getValue: (c) => c.isArmsCase ? (c.armsReportReceived === true || c.armsReportReceived === 'YES' ? 'Received' : 'Pending') : 'N/A' },
  { id: 'liquorLabReportReceived', label: 'Liquor Lab / Confiscation', category: 'sll', defaultSelected: false, getValue: (c) => c.isLiquorCase ? (c.liquorLabReportReceived === true || c.liquorLabReportReceived === 'YES' ? 'Received' : 'Pending') : 'N/A' },
  { id: 'vehicleRajsatStatus', label: 'Seized Vehicle Rajsat Status', category: 'sll', defaultSelected: false, getValue: (c) => c.vehicleRajsatStatus ? String(c.vehicleRajsatStatus) : 'N/A' },
  { id: 'ndpsLabReportReceived', label: 'NDPS Forensic Lab Report', category: 'sll', defaultSelected: false, getValue: (c) => c.isNdpsCase ? (c.ndpsLabReportReceived === true || c.ndpsLabReportReceived === 'YES' ? 'Received' : 'Pending') : 'N/A' },

  // 9. CCTNS Tracking
  { id: 'chargesheetUploadedCCTNS', label: 'Chargesheet Uploaded CCTNS', category: 'cctns', defaultSelected: false, getValue: (c) => c.chargesheetUploadedCCTNS ? 'Yes' : 'No' },
  { id: 'lastCaseDiaryNo', label: 'Last Case Diary (CD) No.', category: 'cctns', defaultSelected: false, getValue: (c) => c.lastCaseDiaryNo || '-' },
  { id: 'lastCaseDiaryDate', label: 'Last Case Diary (CD) Date', category: 'cctns', defaultSelected: false, getValue: (c) => c.lastCaseDiaryDate ? formatReadableDate(c.lastCaseDiaryDate) : '-' },
  { id: 'totalCdUploaded', label: 'Total CDs Uploaded CCTNS', category: 'cctns', defaultSelected: false, getValue: (c) => c.totalCdUploaded ?? (c.caseDiaryUploadedCCTNS ? 1 : 0) },
];

export const PRESET_FIELD_SELECTIONS = [
  {
    id: 'STANDARD',
    name: '📋 Standard Case & Review Sheet',
    fieldIds: ['firNumber', 'ps', 'firDate', 'crimeHead', 'sections', 'designation', 'status', 'ioName', 'overdueStatus', 'noOfReviews', 'lastCaseReviewDate', 'pendingArrestCount', 'arrestedCount'],
  },
  {
    id: 'SUPERVISION',
    name: '🔍 Supervisory Review & Remarks',
    fieldIds: ['firNumber', 'ps', 'firDate', 'crimeHead', 'sections', 'ioName', 'status', 'noOfReviews', 'lastCaseReviewDate', 'supervisionDate', 'sdpoSupervisionNote', 'ciSupervisionNote', 'psProgressRemarks'],
  },
  {
    id: 'ACCUSED_WARRANT',
    name: '🚨 Accused, Arrest & 41A Tracking',
    fieldIds: ['firNumber', 'ps', 'crimeHead', 'sections', 'ioName', 'status', 'pendingArrestCount', 'pendingArrestNames', 'arrestedCount', 'arrestedNames', 'noticeServedCount', 'bailSurrenderedCount'],
  },
  {
    id: 'FORENSICS_MEDICAL',
    name: '🔬 Forensics, Medical & FSL Matrix',
    fieldIds: ['firNumber', 'ps', 'crimeHead', 'sections', 'ioName', 'injuryReportReceived', 'pmReportReceived', 'fslVisitedPO', 'fslReportReceived', 'armsReportReceived', 'liquorLabReportReceived', 'ndpsLabReportReceived'],
  },
  {
    id: 'ALL_FIELDS',
    name: '👑 Complete Master Dossier (All 35+ Fields)',
    fieldIds: AVAILABLE_REPORT_FIELDS.map((f) => f.id),
  },
];

export const CustomReportGenerator: React.FC<CustomReportGeneratorProps> = ({
  cases,
  ios,
  currentRole,
  currentUserAccount,
  districts = [],
  subdivisions = [],
  availablePoliceStations = [],
  onViewCase,
}) => {
  // -------------------------------------------------------------------------
  // 1. DYNAMIC STATUTORY CONFIG STATE
  // -------------------------------------------------------------------------
  const [statutoryConfig, setStatutoryConfig] = useState<Record<string, CrimeHeadMeta>>(() => getDynamicCrimeHeadsConfig());

  useEffect(() => {
    const handleUpdate = () => {
      setStatutoryConfig(getDynamicCrimeHeadsConfig());
    };
    window.addEventListener('sdpo-statutory-matrix-updated', handleUpdate);
    return () => window.removeEventListener('sdpo-statutory-matrix-updated', handleUpdate);
  }, []);

  // -------------------------------------------------------------------------
  // 2. COLLAPSIBLE ACCORDION STATES
  // -------------------------------------------------------------------------
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    crimeHeads: true,
    register: true,
    review: true,
    forensics: false,
    accused: false,
    specialLaws: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // -------------------------------------------------------------------------
  // 2. CRIME HEADS MULTI-SELECT & MATCH ANY / MATCH ALL
  // -------------------------------------------------------------------------
  const [selectedCrimeHeads, setSelectedCrimeHeads] = useState<CrimeHead[]>([]);
  const [crimeHeadMatchMode, setCrimeHeadMatchMode] = useState<'ANY' | 'ALL'>('ANY');

  // -------------------------------------------------------------------------
  // 3. REGISTER & GENERAL CASE FILTERS
  // -------------------------------------------------------------------------
  const [selectedPSs, setSelectedPSs] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedIOs, setSelectedIOs] = useState<string[]>([]);
  const [selectedDesignations, setSelectedDesignations] = useState<CaseDesignation[]>([]);
  const [deadlineStatusFilter, setDeadlineStatusFilter] = useState<'ALL' | 'ON_TRACK' | 'APPROACHING' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [remandTrackFilter, setRemandTrackFilter] = useState<'ALL' | '90_DAYS' | '60_DAYS'>('ALL');
  const [punishmentFilter, setPunishmentFilter] = useState<'ALL' | '7_years_or_more' | 'less_than_7_years'>('ALL');

  // Date Filters
  const [dateFilterType, setDateFilterType] = useState<'FIR_DATE' | 'REVIEW_DATE' | 'TARGET_DATE' | 'CHARGESHEET_DATE' | 'DISPOSED_DATE'>('FIR_DATE');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // -------------------------------------------------------------------------
  // 4. CASE REVIEW & SUPERVISION FILTERS
  // -------------------------------------------------------------------------
  const [reviewCountFilter, setReviewCountFilter] = useState<'ALL' | 'ZERO' | '1_OR_MORE' | '2_OR_MORE' | '3_OR_MORE'>('ALL');
  const [supervisionNoteFilter, setSupervisionNoteFilter] = useState<'ALL' | 'HAS_SDPO_NOTE' | 'HAS_CI_NOTE' | 'HAS_BOTH' | 'NO_NOTE'>('ALL');
  const [targetDateStatusFilter, setTargetDateStatusFilter] = useState<'ALL' | 'SET' | 'OVERDUE' | 'NOT_SET'>('ALL');

  // -------------------------------------------------------------------------
  // 5. FORENSICS & MEDICAL FILTERS
  // -------------------------------------------------------------------------
  const [isInjuryPresentFilter, setIsInjuryPresentFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [injuryReportFilter, setInjuryReportFilter] = useState<ReviewFilterValue>('ALL');
  const [pmReportFilter, setPmReportFilter] = useState<ReviewFilterValue>('ALL');
  const [visceraPreservedFilter, setVisceraPreservedFilter] = useState<ReviewFilterValue>('ALL');
  const [fslVisitedPOFilter, setFslVisitedPOFilter] = useState<ReviewFilterValue>('ALL');
  const [fslItemPreservedFilter, setFslItemPreservedFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [fslItemSentFilter, setFslItemSentFilter] = useState<ReviewFilterValue>('ALL');
  const [fslReportFilter, setFslReportFilter] = useState<ReviewFilterValue>('ALL');
  const [poPreservedFilter, setPoPreservedFilter] = useState<ReviewFilterValue>('ALL');
  const [poVideographyFilter, setPoVideographyFilter] = useState<ReviewFilterValue>('ALL');

  // -------------------------------------------------------------------------
  // 6. ACCUSED, ARRESTS, 41A & BAIL FILTERS
  // -------------------------------------------------------------------------
  const [pendingArrestFilter, setPendingArrestFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [anyPersonArrestedFilter, setAnyPersonArrestedFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [noticeServedFilter, setNoticeServedFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [bailSurrenderedFilter, setBailSurrenderedFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');

  // -------------------------------------------------------------------------
  // 7. VICTIM RECOVERY & SPECIAL ACTS FILTERS
  // -------------------------------------------------------------------------
  const [isVictimRecoveryFilter, setIsVictimRecoveryFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [victimRecoveredFilter, setVictimRecoveredFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [victimAgeFilter, setVictimAgeFilter] = useState<'ALL' | 'minor' | 'major'>('ALL');

  const [isArmsCaseFilter, setIsArmsCaseFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [armsVerificationFilter, setArmsVerificationFilter] = useState<'ALL' | 'SENT' | 'REPORT_RECEIVED' | 'PENDING'>('ALL');

  const [isLiquorCaseFilter, setIsLiquorCaseFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [liquorLabReportFilter, setLiquorLabReportFilter] = useState<ReviewFilterValue>('ALL');
  const [vehicleSeizedFilter, setVehicleSeizedFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');

  const [isNdpsCaseFilter, setIsNdpsCaseFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [ndpsLabReportFilter, setNdpsLabReportFilter] = useState<ReviewFilterValue>('ALL');

  // CCTNS
  const [chargesheetCCTNSFilter, setChargesheetCCTNSFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [caseDiaryCCTNSFilter, setCaseDiaryCCTNSFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [sidLinkedFilter, setSidLinkedFilter] = useState<ReviewFilterValue>('ALL');

  // Global Search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // -------------------------------------------------------------------------
  // 8. SORTING STATE
  // -------------------------------------------------------------------------
  const [sortField, setSortField] = useState<string>('firDate');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

  // -------------------------------------------------------------------------
  // 9. COLUMN / FIELD PICKER STATE
  // -------------------------------------------------------------------------
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>(
    AVAILABLE_REPORT_FIELDS.filter((f) => f.defaultSelected).map((f) => f.id)
  );
  const [showColumnPicker, setShowColumnPicker] = useState<boolean>(false);
  const [columnFilterSearch, setColumnFilterSearch] = useState<string>('');
  const [reportCustomTitle, setReportCustomTitle] = useState<string>('Comprehensive Crime Head & Case Review Report');

  // -------------------------------------------------------------------------
  // Police Station and IO Options
  // -------------------------------------------------------------------------
  const psOptions = useMemo(() => {
    const list = availablePoliceStations.map((p) => p.name);
    const set = new Set(list.length > 0 ? list : ['Tarapur', 'Asarganj', 'Sangrampur', 'Harpur']);
    return Array.from(set).map((ps) => ({
      value: ps,
      label: `${ps} PS`,
    }));
  }, [availablePoliceStations]);

  const ioOptions = useMemo(() => {
    const map = new Map<string, { label: string; subtext: string }>();
    ios.forEach((io) => {
      map.set(io.name, {
        label: io.name,
        subtext: `${io.rank} • ${io.ps} PS`,
      });
    });
    cases.forEach((c) => {
      if (c.ioName && !map.has(c.ioName)) {
        map.set(c.ioName, {
          label: c.ioName,
          subtext: `${c.ps} PS`,
        });
      }
    });
    return Array.from(map.entries()).map(([name, meta]) => ({
      value: name,
      label: meta.label,
      subtext: meta.subtext,
    }));
  }, [ios, cases]);

  const crimeHeadOptions = useMemo(() => {
    return Object.values(statutoryConfig).map((meta) => ({
      value: meta.name,
      label: meta.name,
      icon: meta.icon || '⚖️',
      subtext: `${meta.hindiName ? meta.hindiName + ' | ' : ''}BNS / SLL: ${meta.bnsSections?.join(', ') || meta.sllProvisions?.join(', ') || '-'}`,
    }));
  }, [statutoryConfig]);

  const statusOptions = [
    { value: 'Under Investigation', label: 'Under Investigation' },
    { value: 'Disposed', label: 'Disposed' },
  ];

  const designationOptions = [
    { value: 'SR', label: 'Special Report (SR)' },
    { value: 'NON_SR', label: 'Non-SR' },
    { value: 'PENDING_DESIGNATION', label: 'Pending Designation' },
  ];

  // -------------------------------------------------------------------------
  // Helper: check if a case matches a specific crime head using active matrix
  // -------------------------------------------------------------------------
  const doesCaseMatchCrimeHead = (c: FIRCase, head: CrimeHead | string): boolean => {
    return matchCaseCrimeHead(c, head, statutoryConfig);
  };

  // -------------------------------------------------------------------------
  // Count Active Filters
  // -------------------------------------------------------------------------
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCrimeHeads.length > 0) count++;
    if (selectedPSs.length > 0) count++;
    if (selectedStatuses.length > 0) count++;
    if (selectedIOs.length > 0) count++;
    if (selectedDesignations.length > 0) count++;
    if (deadlineStatusFilter !== 'ALL') count++;
    if (remandTrackFilter !== 'ALL') count++;
    if (punishmentFilter !== 'ALL') count++;
    if (startDate || endDate) count++;
    if (reviewCountFilter !== 'ALL') count++;
    if (supervisionNoteFilter !== 'ALL') count++;
    if (targetDateStatusFilter !== 'ALL') count++;
    if (isInjuryPresentFilter !== 'ALL') count++;
    if (injuryReportFilter !== 'ALL') count++;
    if (pmReportFilter !== 'ALL') count++;
    if (visceraPreservedFilter !== 'ALL') count++;
    if (fslVisitedPOFilter !== 'ALL') count++;
    if (fslReportFilter !== 'ALL') count++;
    if (poPreservedFilter !== 'ALL') count++;
    if (pendingArrestFilter !== 'ALL') count++;
    if (anyPersonArrestedFilter !== 'ALL') count++;
    if (noticeServedFilter !== 'ALL') count++;
    if (bailSurrenderedFilter !== 'ALL') count++;
    if (isVictimRecoveryFilter !== 'ALL') count++;
    if (victimRecoveredFilter !== 'ALL') count++;
    if (isArmsCaseFilter !== 'ALL') count++;
    if (isLiquorCaseFilter !== 'ALL') count++;
    if (isNdpsCaseFilter !== 'ALL') count++;
    if (chargesheetCCTNSFilter !== 'ALL') count++;
    if (caseDiaryCCTNSFilter !== 'ALL') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [
    selectedCrimeHeads,
    selectedPSs,
    selectedStatuses,
    selectedIOs,
    selectedDesignations,
    deadlineStatusFilter,
    remandTrackFilter,
    punishmentFilter,
    startDate,
    endDate,
    reviewCountFilter,
    supervisionNoteFilter,
    targetDateStatusFilter,
    isInjuryPresentFilter,
    injuryReportFilter,
    pmReportFilter,
    visceraPreservedFilter,
    fslVisitedPOFilter,
    fslReportFilter,
    poPreservedFilter,
    pendingArrestFilter,
    anyPersonArrestedFilter,
    noticeServedFilter,
    bailSurrenderedFilter,
    isVictimRecoveryFilter,
    victimRecoveredFilter,
    isArmsCaseFilter,
    isLiquorCaseFilter,
    isNdpsCaseFilter,
    chargesheetCCTNSFilter,
    caseDiaryCCTNSFilter,
    searchQuery,
  ]);

  // -------------------------------------------------------------------------
  // FILTERING LOGIC
  // -------------------------------------------------------------------------
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // Free search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const primaryHead = (c.crimeHead as string) || classifyCrimeHead(c);
        const match =
          c.firNumber.toLowerCase().includes(q) ||
          c.ps.toLowerCase().includes(q) ||
          c.sections.toLowerCase().includes(q) ||
          c.ioName.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q) ||
          primaryHead.toLowerCase().includes(q) ||
          (c.sdpoSupervisionNote && c.sdpoSupervisionNote.toLowerCase().includes(q)) ||
          (c.ciSupervisionNote && c.ciSupervisionNote.toLowerCase().includes(q)) ||
          (c.pendingArrestNames && c.pendingArrestNames.toLowerCase().includes(q)) ||
          (c.arrestedNames && c.arrestedNames.toLowerCase().includes(q));
        if (!match) return false;
      }

      // 1. Crime Heads Multi-Select with Match Any / Match All
      if (selectedCrimeHeads.length > 0) {
        if (crimeHeadMatchMode === 'ANY') {
          const matchAny = selectedCrimeHeads.some((head) => doesCaseMatchCrimeHead(c, head));
          if (!matchAny) return false;
        } else {
          // ALL (AND) - Must match every selected crime head
          const matchAll = selectedCrimeHeads.every((head) => doesCaseMatchCrimeHead(c, head));
          if (!matchAll) return false;
        }
      }

      // 2. Police Stations Multi-Select
      if (selectedPSs.length > 0) {
        if (!selectedPSs.some((ps) => ps.toLowerCase() === c.ps.toLowerCase())) return false;
      }

      // 3. Status Multi-Select (Under Investigation / Disposed)
      if (selectedStatuses.length > 0) {
        const wantsUI = selectedStatuses.includes('Under Investigation');
        const wantsDisposed = selectedStatuses.includes('Disposed');

        if (wantsUI && wantsDisposed) {
          // Both selected -> matches all
        } else if (wantsUI) {
          if (c.status !== 'Under Investigation' || isCaseCompleted(c.status)) return false;
        } else if (wantsDisposed) {
          if (c.status === 'Under Investigation' && !isCaseCompleted(c.status)) return false;
        }
      }

      // 4. IO Multi-Select
      if (selectedIOs.length > 0) {
        if (!selectedIOs.some((io) => io.toLowerCase() === c.ioName.toLowerCase())) return false;
      }

      // 5. Designation (SR / Non-SR)
      if (selectedDesignations.length > 0) {
        if (!selectedDesignations.includes(c.designation)) return false;
      }

      // 6. Deadline Status Filter
      if (deadlineStatusFilter !== 'ALL') {
        const dl = getDeadlineInfo(c);
        if (deadlineStatusFilter === 'COMPLETED') {
          if (!isCaseCompleted(c.status)) return false;
        } else if (deadlineStatusFilter === 'OVERDUE') {
          if (c.status !== 'Under Investigation' || dl.code !== 'OVERDUE') return false;
        } else if (deadlineStatusFilter === 'APPROACHING') {
          if (c.status !== 'Under Investigation' || dl.code !== 'APPROACHING') return false;
        } else if (deadlineStatusFilter === 'ON_TRACK') {
          if (c.status !== 'Under Investigation' || dl.code !== 'ON_TRACK') return false;
        }
      }

      // 7. Remand Track (BNSS 187)
      if (remandTrackFilter !== 'ALL') {
        const head = (c.crimeHead as CrimeHead) || classifyCrimeHead(c);
        const meta = CRIME_HEADS_CONFIG[head];
        const is90 = meta?.remandTrack.includes('90-Day') || c.deadlineDays === 90;
        if (remandTrackFilter === '90_DAYS' && !is90) return false;
        if (remandTrackFilter === '60_DAYS' && is90) return false;
      }

      // 8. Punishment Term
      if (punishmentFilter !== 'ALL') {
        if (c.punishmentTerm && c.punishmentTerm !== punishmentFilter) return false;
      }

      // 9. Case Review & Supervision Notes
      if (reviewCountFilter !== 'ALL') {
        const reviewsCount = c.noOfReviews ?? (c.caseReviewDates?.length || (c.lastCaseReviewDate ? 1 : 0));
        if (reviewCountFilter === 'ZERO' && reviewsCount > 0) return false;
        if (reviewCountFilter === '1_OR_MORE' && reviewsCount < 1) return false;
        if (reviewCountFilter === '2_OR_MORE' && reviewsCount < 2) return false;
        if (reviewCountFilter === '3_OR_MORE' && reviewsCount < 3) return false;
      }

      if (supervisionNoteFilter !== 'ALL') {
        const hasSdpo = Boolean(c.sdpoSupervisionNote || c.supervisionDate);
        const hasCi = Boolean(c.ciSupervisionNote);
        if (supervisionNoteFilter === 'HAS_SDPO_NOTE' && !hasSdpo) return false;
        if (supervisionNoteFilter === 'HAS_CI_NOTE' && !hasCi) return false;
        if (supervisionNoteFilter === 'HAS_BOTH' && (!hasSdpo || !hasCi)) return false;
        if (supervisionNoteFilter === 'NO_NOTE' && (hasSdpo || hasCi)) return false;
      }

      if (targetDateStatusFilter !== 'ALL') {
        if (targetDateStatusFilter === 'SET' && !c.targetDisposalDate) return false;
        if (targetDateStatusFilter === 'NOT_SET' && c.targetDisposalDate) return false;
        if (targetDateStatusFilter === 'OVERDUE') {
          if (!c.targetDisposalDate) return false;
          const target = new Date(c.targetDisposalDate);
          const today = new Date();
          if (c.status === 'Under Investigation' && target < today) {
            // Overdue
          } else {
            return false;
          }
        }
      }

      // 10. Medical & Forensics
      if (isInjuryPresentFilter !== 'ALL') {
        const isPresent = Boolean(c.isInjuryPresent);
        if (isInjuryPresentFilter === 'YES' && !isPresent) return false;
        if (isInjuryPresentFilter === 'NO' && isPresent) return false;
      }

      const matchReviewValue = (fieldVal: string | boolean | undefined, filterVal: ReviewFilterValue) => {
        if (filterVal === 'ALL') return true;
        if (filterVal === 'YES') return fieldVal === true || fieldVal === 'YES';
        if (filterVal === 'NO' || filterVal === 'PENDING') return fieldVal === false || fieldVal === 'PENDING' || fieldVal === 'NO';
        if (filterVal === 'NA') return fieldVal === 'NA' || fieldVal === undefined;
        return true;
      };

      if (!matchReviewValue(c.injuryReportReceived, injuryReportFilter)) return false;
      if (!matchReviewValue(c.pmReportReceived, pmReportFilter)) return false;
      if (!matchReviewValue(c.visceraPreserved, visceraPreservedFilter)) return false;
      if (!matchReviewValue(c.fslVisitedPO, fslVisitedPOFilter)) return false;
      if (!matchReviewValue(c.fslReportReceived, fslReportFilter)) return false;
      if (!matchReviewValue(c.poPreserved, poPreservedFilter)) return false;
      if (!matchReviewValue(c.poVideographyDone, poVideographyFilter)) return false;

      // 11. Accused & Arrests
      if (pendingArrestFilter !== 'ALL') {
        const hasPending = Boolean(c.pendingForArrest || (c.pendingArrestCount && c.pendingArrestCount > 0));
        if (pendingArrestFilter === 'YES' && !hasPending) return false;
        if (pendingArrestFilter === 'NO' && hasPending) return false;
      }

      if (anyPersonArrestedFilter !== 'ALL') {
        const hasArrest = Boolean(c.anyPersonArrested || (c.arrestedCount && c.arrestedCount > 0));
        if (anyPersonArrestedFilter === 'YES' && !hasArrest) return false;
        if (anyPersonArrestedFilter === 'NO' && hasArrest) return false;
      }

      if (noticeServedFilter !== 'ALL') {
        const hasNotice = Boolean(c.anyPersonServedNotice || (c.noticeServedCount && c.noticeServedCount > 0));
        if (noticeServedFilter === 'YES' && !hasNotice) return false;
        if (noticeServedFilter === 'NO' && hasNotice) return false;
      }

      if (bailSurrenderedFilter !== 'ALL') {
        const hasBail = Boolean(c.anyPersonOnBailOrSurrendered || (c.bailSurrenderedCount && c.bailSurrenderedCount > 0));
        if (bailSurrenderedFilter === 'YES' && !hasBail) return false;
        if (bailSurrenderedFilter === 'NO' && hasBail) return false;
      }

      // 12. Victim Recovery
      if (isVictimRecoveryFilter !== 'ALL') {
        const isVictimCase = Boolean(c.isVictimRecoveryCase);
        if (isVictimRecoveryFilter === 'YES' && !isVictimCase) return false;
        if (isVictimRecoveryFilter === 'NO' && isVictimCase) return false;
      }

      if (victimRecoveredFilter !== 'ALL') {
        const recovered = Boolean(c.victimRecovered);
        if (victimRecoveredFilter === 'YES' && !recovered) return false;
        if (victimRecoveredFilter === 'NO' && recovered) return false;
      }

      // 13. Special Acts (Arms / Liquor / NDPS)
      if (isArmsCaseFilter !== 'ALL') {
        const isArms = Boolean(c.isArmsCase);
        if (isArmsCaseFilter === 'YES' && !isArms) return false;
        if (isArmsCaseFilter === 'NO' && isArms) return false;
      }

      if (isLiquorCaseFilter !== 'ALL') {
        const isLiquor = Boolean(c.isLiquorCase);
        if (isLiquorCaseFilter === 'YES' && !isLiquor) return false;
        if (isLiquorCaseFilter === 'NO' && isLiquor) return false;
      }

      if (isNdpsCaseFilter !== 'ALL') {
        const isNdps = Boolean(c.isNdpsCase);
        if (isNdpsCaseFilter === 'YES' && !isNdps) return false;
        if (isNdpsCaseFilter === 'NO' && isNdps) return false;
      }

      // 14. CCTNS Sync
      if (chargesheetCCTNSFilter !== 'ALL') {
        const csUploaded = Boolean(c.chargesheetUploadedCCTNS);
        if (chargesheetCCTNSFilter === 'YES' && !csUploaded) return false;
        if (chargesheetCCTNSFilter === 'NO' && csUploaded) return false;
      }

      if (caseDiaryCCTNSFilter !== 'ALL') {
        const cdUploaded = Boolean(c.caseDiaryUploadedCCTNS);
        if (caseDiaryCCTNSFilter === 'YES' && !cdUploaded) return false;
        if (caseDiaryCCTNSFilter === 'NO' && cdUploaded) return false;
      }

      // 15. Date Filters
      let targetDateStr: string | undefined;
      if (dateFilterType === 'FIR_DATE') targetDateStr = c.firDate;
      else if (dateFilterType === 'REVIEW_DATE') targetDateStr = c.lastCaseReviewDate || c.supervisionDate;
      else if (dateFilterType === 'TARGET_DATE') targetDateStr = c.targetDisposalDate;
      else if (dateFilterType === 'CHARGESHEET_DATE') targetDateStr = c.chargesheetDate;
      else if (dateFilterType === 'DISPOSED_DATE') targetDateStr = c.disposedDate;

      if (startDate && targetDateStr && targetDateStr < startDate) return false;
      if (endDate && targetDateStr && targetDateStr > endDate) return false;
      if ((startDate || endDate) && !targetDateStr) return false;

      return true;
    });
  }, [
    cases,
    searchQuery,
    selectedCrimeHeads,
    crimeHeadMatchMode,
    selectedPSs,
    selectedStatuses,
    selectedIOs,
    selectedDesignations,
    deadlineStatusFilter,
    remandTrackFilter,
    punishmentFilter,
    reviewCountFilter,
    supervisionNoteFilter,
    targetDateStatusFilter,
    isInjuryPresentFilter,
    injuryReportFilter,
    pmReportFilter,
    visceraPreservedFilter,
    fslVisitedPOFilter,
    fslReportFilter,
    poPreservedFilter,
    poVideographyFilter,
    pendingArrestFilter,
    anyPersonArrestedFilter,
    noticeServedFilter,
    bailSurrenderedFilter,
    isVictimRecoveryFilter,
    victimRecoveredFilter,
    isArmsCaseFilter,
    isLiquorCaseFilter,
    isNdpsCaseFilter,
    chargesheetCCTNSFilter,
    caseDiaryCCTNSFilter,
    dateFilterType,
    startDate,
    endDate,
  ]);

  // -------------------------------------------------------------------------
  // SORTING
  // -------------------------------------------------------------------------
  const sortedCases = useMemo(() => {
    return [...filteredCases].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'firDate') {
        valA = a.firDate || '';
        valB = b.firDate || '';
      } else if (sortField === 'firNumber') {
        valA = a.firNumber || '';
        valB = b.firNumber || '';
      } else if (sortField === 'lastCaseReviewDate') {
        valA = a.lastCaseReviewDate || '';
        valB = b.lastCaseReviewDate || '';
      } else if (sortField === 'targetDisposalDate') {
        valA = a.targetDisposalDate || '';
        valB = b.targetDisposalDate || '';
      } else if (sortField === 'noOfReviews') {
        valA = a.noOfReviews || 0;
        valB = b.noOfReviews || 0;
      } else if (sortField === 'pendingArrestCount') {
        valA = a.pendingArrestCount || (a.pendingForArrest ? 1 : 0);
        valB = b.pendingArrestCount || (b.pendingForArrest ? 1 : 0);
      } else if (sortField === 'arrestedCount') {
        valA = a.arrestedCount || (a.anyPersonArrested ? 1 : 0);
        valB = b.arrestedCount || (b.anyPersonArrested ? 1 : 0);
      } else if (sortField === 'ps') {
        valA = a.ps || '';
        valB = b.ps || '';
      } else if (sortField === 'ioName') {
        valA = a.ioName || '';
        valB = b.ioName || '';
      } else if (sortField === 'crimeHead') {
        valA = (a.crimeHead as string) || classifyCrimeHead(a);
        valB = (b.crimeHead as string) || classifyCrimeHead(b);
      } else if (sortField === 'overdueDays') {
        const dlA = getDeadlineInfo(a);
        const dlB = getDeadlineInfo(b);
        valA = dlA.daysRemaining < 0 ? Math.abs(dlA.daysRemaining) : 0;
        valB = dlB.daysRemaining < 0 ? Math.abs(dlB.daysRemaining) : 0;
      }

      if (valA < valB) return sortDirection === 'ASC' ? -1 : 1;
      if (valA > valB) return sortDirection === 'ASC' ? 1 : -1;
      return 0;
    });
  }, [filteredCases, sortField, sortDirection]);

  // Active Selected Columns
  const activeFields = useMemo(() => {
    return AVAILABLE_REPORT_FIELDS.filter((f) => selectedFieldIds.includes(f.id));
  }, [selectedFieldIds]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = sortedCases.length;
    const underInvestigation = sortedCases.filter((c) => c.status === 'Under Investigation').length;
    const disposed = sortedCases.filter((c) => c.status !== 'Under Investigation').length;
    const srCases = sortedCases.filter((c) => c.designation === 'SR').length;
    const reviewed = sortedCases.filter((c) => (c.noOfReviews && c.noOfReviews > 0) || c.lastCaseReviewDate).length;
    const overdue = sortedCases.filter((c) => c.status === 'Under Investigation' && getDeadlineInfo(c).code === 'OVERDUE').length;
    const totalArrests = sortedCases.reduce((acc, c) => acc + (c.arrestedCount || (c.anyPersonArrested ? 1 : 0)), 0);
    const totalPendingArrests = sortedCases.reduce((acc, c) => acc + (c.pendingArrestCount || (c.pendingForArrest ? 1 : 0)), 0);

    return {
      total,
      underInvestigation,
      disposed,
      srCases,
      reviewed,
      overdue,
      totalArrests,
      totalPendingArrests,
    };
  }, [sortedCases]);

  // -------------------------------------------------------------------------
  // EXPORT HANDLERS
  // -------------------------------------------------------------------------
  const handleExportCSV = () => {
    if (sortedCases.length === 0) return;
    const headers = activeFields.map((f) => f.label);
    const rows = sortedCases.map((c) => activeFields.map((f) => f.getValue(c)));
    const filename = reportCustomTitle || 'Crime_Case_Review_Report';
    exportToExcel(filename, headers, rows);
  };

  const handleExportPDF = () => {
    if (sortedCases.length === 0) return;
    const headers = activeFields.map((f) => f.label);
    const rows = sortedCases.map((c) => activeFields.map((f) => f.getValue(c)));
    const subtitle = `Total Cases: ${summaryMetrics.total} | Pending UI: ${summaryMetrics.underInvestigation} | Disposed: ${summaryMetrics.disposed} | Overdue: ${summaryMetrics.overdue}`;
    const badges = [
      { label: 'Total FIRs', value: summaryMetrics.total },
      { label: 'Under Investigation', value: summaryMetrics.underInvestigation },
      { label: 'Disposed', value: summaryMetrics.disposed },
      { label: 'SR Cases', value: summaryMetrics.srCases },
      { label: 'Overdue (>60/90d)', value: summaryMetrics.overdue },
      { label: 'Arrests Made', value: summaryMetrics.totalArrests },
    ];
    generateDirectPDF(reportCustomTitle, reportCustomTitle, subtitle, headers, rows, badges);
  };

  const handleResetAllFilters = () => {
    setSelectedCrimeHeads([]);
    setCrimeHeadMatchMode('ANY');
    setSelectedPSs([]);
    setSelectedStatuses([]);
    setSelectedIOs([]);
    setSelectedDesignations([]);
    setDeadlineStatusFilter('ALL');
    setRemandTrackFilter('ALL');
    setPunishmentFilter('ALL');
    setDateFilterType('FIR_DATE');
    setStartDate('');
    setEndDate('');
    setReviewCountFilter('ALL');
    setSupervisionNoteFilter('ALL');
    setTargetDateStatusFilter('ALL');
    setIsInjuryPresentFilter('ALL');
    setInjuryReportFilter('ALL');
    setPmReportFilter('ALL');
    setVisceraPreservedFilter('ALL');
    setFslVisitedPOFilter('ALL');
    setFslItemPreservedFilter('ALL');
    setFslItemSentFilter('ALL');
    setFslReportFilter('ALL');
    setPoPreservedFilter('ALL');
    setPoVideographyFilter('ALL');
    setPendingArrestFilter('ALL');
    setAnyPersonArrestedFilter('ALL');
    setNoticeServedFilter('ALL');
    setBailSurrenderedFilter('ALL');
    setIsVictimRecoveryFilter('ALL');
    setVictimRecoveredFilter('ALL');
    setVictimAgeFilter('ALL');
    setIsArmsCaseFilter('ALL');
    setArmsVerificationFilter('ALL');
    setIsLiquorCaseFilter('ALL');
    setLiquorLabReportFilter('ALL');
    setVehicleSeizedFilter('ALL');
    setIsNdpsCaseFilter('ALL');
    setNdpsLabReportFilter('ALL');
    setChargesheetCCTNSFilter('ALL');
    setCaseDiaryCCTNSFilter('ALL');
    setSidLinkedFilter('ALL');
    setSearchQuery('');
  };

  const handleToggleField = (fieldId: string) => {
    setSelectedFieldIds((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = PRESET_FIELD_SELECTIONS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedFieldIds(preset.fieldIds);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. TOP TITLE & ACTION BAR */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Report Engine Pro
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Multi-Crime Correlation & Comprehensive Register / Review Matrix
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
            <span>Custom Crime Head & Case Review Report Generator</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Filter and cross-correlate across all crime heads (Match Any / Match All), register statuses, IO assignments, case review remarks, forensic visits, accused warrants, and special laws with PDF & CSV export.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Full Filter Panel */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
              isFilterPanelOpen
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Filter className="w-4 h-4 text-indigo-500" />
            <span>Filters ({activeFiltersCount} active)</span>
            {isFilterPanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Field / Column Selector Toggle */}
          <button
            type="button"
            onClick={() => setShowColumnPicker(!showColumnPicker)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            <span>Columns ({selectedFieldIds.length}/{AVAILABLE_REPORT_FIELDS.length})</span>
            {showColumnPicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Export to CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={sortedCases.length === 0}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
              sortedCases.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV ({sortedCases.length})</span>
          </button>

          {/* Export to PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={sortedCases.length === 0}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
              sortedCases.length > 0
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export PDF ({sortedCases.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY METRICS TILES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Filtered Cases</span>
          <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block">{summaryMetrics.total}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Under Invest.</span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5 block">{summaryMetrics.underInvestigation}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Disposed</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{summaryMetrics.disposed}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">SR Cases</span>
          <span className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5 block">{summaryMetrics.srCases}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Reviewed</span>
          <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">{summaryMetrics.reviewed}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Overdue (&gt;60/90d)</span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5 block">{summaryMetrics.overdue}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Arrests Made</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5 block">{summaryMetrics.totalArrests}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Pending Arrest</span>
          <span className="text-lg font-black text-orange-600 dark:text-orange-400 mt-0.5 block">{summaryMetrics.totalPendingArrests}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. COLUMN / FIELD PICKER PANEL (EXPANDABLE) */}
      {/* ========================================================================= */}
      {showColumnPicker && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-indigo-500/40 shadow-lg animate-scaleUp space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                <span>Select & Customize Columns for PDF & CSV Report</span>
              </h3>
              <p className="text-xs text-slate-500">
                Choose precisely which fields appear in your downloaded PDF, CSV, and live data table.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Presets:</span>
              {PRESET_FIELD_SELECTIONS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Search Columns & Bulk Select/Unselect */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedFieldIds(AVAILABLE_REPORT_FIELDS.map((f) => f.id))}
                className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Select All ({AVAILABLE_REPORT_FIELDS.length})
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={() => setSelectedFieldIds(['firNumber', 'ps', 'crimeHead', 'status', 'ioName'])}
                className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Minimal Only
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={columnFilterSearch}
                onChange={(e) => setColumnFilterSearch(e.target.value)}
                placeholder="Search available fields..."
                className="w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Columns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
            {AVAILABLE_REPORT_FIELDS.filter(
              (f) => !columnFilterSearch || f.label.toLowerCase().includes(columnFilterSearch.toLowerCase())
            ).map((field) => {
              const isSelected = selectedFieldIds.includes(field.id);
              return (
                <div
                  key={field.id}
                  onClick={() => handleToggleField(field.id)}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate mr-2">{field.label}</span>
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom Report Title Box */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Report Letterhead Title:</span>
              <input
                type="text"
                value={reportCustomTitle}
                onChange={(e) => setReportCustomTitle(e.target.value)}
                className="w-full px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowColumnPicker(false)}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition cursor-pointer self-end sm:self-auto"
            >
              Done Customizing
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. COMPREHENSIVE COLLAPSIBLE FILTER CONTROLS */}
      {/* ========================================================================= */}
      {isFilterPanelOpen && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          
          {/* Header Bar with Global Search & Reset All */}
          <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Comprehensive Crime & Case Review Filters
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-xs">
                {activeFiltersCount} Active
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Global search FIR, IO, Accused, Notes..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleResetAllFilters}
                className="px-3 py-1.5 bg-slate-200/80 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 1: CRIME HEADS & MULTI-MATCH (AND / OR) */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-4 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleSection('crimeHeads')}
            >
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  1. Standardized Crime Heads Multi-Select & Correlation
                </h4>
                {selectedCrimeHeads.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold">
                    {selectedCrimeHeads.length} Selected ({crimeHeadMatchMode === 'ALL' ? 'Match ALL (AND)' : 'Match ANY (OR)'})
                  </span>
                )}
              </div>
              {openSections.crimeHeads ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {openSections.crimeHeads && (
              <div className="pt-2 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {/* MultiSelect Dropdown */}
                  <div className="md:col-span-2">
                    <MultiSelectDropdown
                      label="Select Crime Head(s) (Multi-Select)"
                      options={crimeHeadOptions}
                      selectedValues={selectedCrimeHeads}
                      onChange={setSelectedCrimeHeads}
                      placeholder="Select one or multiple crime heads (e.g., Murder, Robbery / Loot, Arms Act)..."
                      icon={<Tag className="w-3 h-3 text-indigo-500" />}
                      badgeColor="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
                    />
                  </div>

                  {/* Match Mode Toggle */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Multi-Crime Logic Mode
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setCrimeHeadMatchMode('ANY')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          crimeHeadMatchMode === 'ANY'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <span>Match Any (OR)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCrimeHeadMatchMode('ALL')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          crimeHeadMatchMode === 'ALL'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                        title="Filter cases that involve ALL selected crime heads together (e.g. Murder + Loot)"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Match All (AND)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {crimeHeadMatchMode === 'ALL' && selectedCrimeHeads.length > 1 && (
                  <div className="p-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-medium text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>
                      <strong>Cross-Crime Intersection Active:</strong> Filtering cases that contain <u>ALL</u> of:{' '}
                      <b>{selectedCrimeHeads.join(' AND ')}</b>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 2: REGISTER, JURISDICTION, STATUS & TIMELINES */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-4 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleSection('register')}
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  2. Crime Register, Jurisdiction, IO & Deadline Filters
                </h4>
                {(selectedPSs.length > 0 || selectedStatuses.length > 0 || selectedIOs.length > 0 || selectedDesignations.length > 0) && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold">
                    Active
                  </span>
                )}
              </div>
              {openSections.register ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {openSections.register && (
              <div className="pt-2 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Police Stations Multi-Select */}
                  <MultiSelectDropdown
                    label="Police Stations (PS)"
                    options={psOptions}
                    selectedValues={selectedPSs}
                    onChange={setSelectedPSs}
                    placeholder="All Police Stations..."
                    icon={<Building2 className="w-3 h-3 text-blue-500" />}
                    badgeColor="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                  />

                  {/* Case Status Multi-Select */}
                  <MultiSelectDropdown
                    label="Case Status"
                    options={statusOptions}
                    selectedValues={selectedStatuses}
                    onChange={setSelectedStatuses}
                    placeholder="All Statuses..."
                    icon={<Shield className="w-3 h-3 text-emerald-500" />}
                    badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                  />

                  {/* IO Multi-Select */}
                  <MultiSelectDropdown
                    label="Investigating Officers (IO)"
                    options={ioOptions}
                    selectedValues={selectedIOs}
                    onChange={setSelectedIOs}
                    placeholder="All IOs..."
                    icon={<Users className="w-3 h-3 text-amber-500" />}
                    badgeColor="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                  />

                  {/* Designation (SR / Non-SR) */}
                  <MultiSelectDropdown
                    label="Designation (SR / Non-SR)"
                    options={designationOptions}
                    selectedValues={selectedDesignations}
                    onChange={(vals) => setSelectedDesignations(vals as CaseDesignation[])}
                    placeholder="All Designations..."
                    icon={<FileText className="w-3 h-3 text-purple-500" />}
                    badgeColor="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
                  />
                </div>

                {/* Additional Register Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
                  {/* Deadline Status */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Statutory Deadline Status
                    </label>
                    <select
                      value={deadlineStatusFilter}
                      onChange={(e) => setDeadlineStatusFilter(e.target.value as any)}
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="ALL">All Deadline Statuses</option>
                      <option value="ON_TRACK">On Track (&gt;15 days remaining)</option>
                      <option value="APPROACHING">Approaching Deadline (≤15 days)</option>
                      <option value="OVERDUE">Overdue (&gt;60/90 Days)</option>
                      <option value="COMPLETED">Disposed / Completed</option>
                    </select>
                  </div>

                  {/* Remand Track (BNSS 187) */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Remand Track (BNSS 187)
                    </label>
                    <select
                      value={remandTrackFilter}
                      onChange={(e) => setRemandTrackFilter(e.target.value as any)}
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="ALL">All Remand Tracks</option>
                      <option value="90_DAYS">90-Day Track (Death / Life / ≥10 Yrs)</option>
                      <option value="60_DAYS">60-Day Track (&lt;10 Yrs)</option>
                    </select>
                  </div>

                  {/* Punishment Term */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Punishment Threshold
                    </label>
                    <select
                      value={punishmentFilter}
                      onChange={(e) => setPunishmentFilter(e.target.value as any)}
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="ALL">All Punishment Terms</option>
                      <option value="7_years_or_more">≥ 7 Years (Mandatory Forensics)</option>
                      <option value="less_than_7_years">&lt; 7 Years</option>
                    </select>
                  </div>

                  {/* Date Type Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Date Field To Filter
                    </label>
                    <select
                      value={dateFilterType}
                      onChange={(e) => setDateFilterType(e.target.value as any)}
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="FIR_DATE">FIR Date</option>
                      <option value="REVIEW_DATE">Last Review / Note Date</option>
                      <option value="TARGET_DATE">Target Disposal Date</option>
                      <option value="CHARGESHEET_DATE">Chargesheet / Final Form Date</option>
                      <option value="DISPOSED_DATE">Disposed Date</option>
                    </select>
                  </div>

                  {/* Date Inputs */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">From</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">To</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 3: CASE REVIEW & SUPERVISORY INSPECTION FILTERS */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-4 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleSection('review')}
            >
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-purple-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  3. Supervisory Inspection, Review Notes & Target Dates
                </h4>
                {(reviewCountFilter !== 'ALL' || supervisionNoteFilter !== 'ALL' || targetDateStatusFilter !== 'ALL') && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold">
                    Active
                  </span>
                )}
              </div>
              {openSections.review ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {openSections.review && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
                {/* Review Count Filter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Number of Case Reviews
                  </label>
                  <select
                    value={reviewCountFilter}
                    onChange={(e) => setReviewCountFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Review Counts</option>
                    <option value="ZERO">Zero Reviews (Never Reviewed)</option>
                    <option value="1_OR_MORE">1 or More Reviews Done</option>
                    <option value="2_OR_MORE">2 or More Reviews Done</option>
                    <option value="3_OR_MORE">3 or More Reviews Done</option>
                  </select>
                </div>

                {/* Supervision Note Filter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Supervision Note Status
                  </label>
                  <select
                    value={supervisionNoteFilter}
                    onChange={(e) => setSupervisionNoteFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Supervision Note States</option>
                    <option value="HAS_SDPO_NOTE">Has SDPO Supervision Note</option>
                    <option value="HAS_CI_NOTE">Has CI Supervision Note</option>
                    <option value="HAS_BOTH">Has Both SDPO & CI Notes</option>
                    <option value="NO_NOTE">No Supervision Note Recorded</option>
                  </select>
                </div>

                {/* Target Disposal Date Status */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Disposal Date Status
                  </label>
                  <select
                    value={targetDateStatusFilter}
                    onChange={(e) => setTargetDateStatusFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Target Date States</option>
                    <option value="SET">Target Date Set by Officer</option>
                    <option value="OVERDUE">Target Date Expired / Overdue</option>
                    <option value="NOT_SET">Target Date Not Assigned</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 4: MEDICAL, INJURY & FSL FORENSICS FILTERS */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-4 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleSection('forensics')}
            >
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  4. Medical, Post-Mortem & FSL Forensic Scene Visits
                </h4>
                {(isInjuryPresentFilter !== 'ALL' || pmReportFilter !== 'ALL' || fslVisitedPOFilter !== 'ALL' || fslReportFilter !== 'ALL') && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                    Active
                  </span>
                )}
              </div>
              {openSections.forensics ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {openSections.forensics && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn">
                {/* Injury Report */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Injury Report
                  </label>
                  <select
                    value={injuryReportFilter}
                    onChange={(e) => setInjuryReportFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Received</option>
                    <option value="PENDING">Pending</option>
                    <option value="NA">N/A</option>
                  </select>
                </div>

                {/* Post-Mortem Report */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Post-Mortem (PM) Report
                  </label>
                  <select
                    value={pmReportFilter}
                    onChange={(e) => setPmReportFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Received</option>
                    <option value="PENDING">Pending</option>
                    <option value="NA">N/A</option>
                  </select>
                </div>

                {/* FSL PO Visited */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    FSL Scene Visit (BNSS 176(3))
                  </label>
                  <select
                    value={fslVisitedPOFilter}
                    onChange={(e) => setFslVisitedPOFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">FSL Visited PO</option>
                    <option value="PENDING">FSL Visit Pending</option>
                  </select>
                </div>

                {/* FSL Lab Report */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    FSL Lab Report
                  </label>
                  <select
                    value={fslReportFilter}
                    onChange={(e) => setFslReportFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Received</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 5: ACCUSED, ARRESTS, 41A NOTICE & BAIL FILTERS */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-4 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleSection('accused')}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-orange-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  5. Accused Tracking, Arrests, 41A Notice & Bail
                </h4>
                {(pendingArrestFilter !== 'ALL' || anyPersonArrestedFilter !== 'ALL' || noticeServedFilter !== 'ALL' || bailSurrenderedFilter !== 'ALL') && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-[10px] font-extrabold">
                    Active
                  </span>
                )}
              </div>
              {openSections.accused ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {openSections.accused && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn">
                {/* Pending Arrest */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Accused Pending Arrest
                  </label>
                  <select
                    value={pendingArrestFilter}
                    onChange={(e) => setPendingArrestFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Yes (Pending Arrest)</option>
                    <option value="NO">No Pending Arrests</option>
                  </select>
                </div>

                {/* Arrest Made */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Arrest(s) Made
                  </label>
                  <select
                    value={anyPersonArrestedFilter}
                    onChange={(e) => setAnyPersonArrestedFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Yes (Arrest Executed)</option>
                    <option value="NO">No Arrests</option>
                  </select>
                </div>

                {/* 41A Notice Served */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Notice Served (41A CrPC / Sec 35 BNSS)
                  </label>
                  <select
                    value={noticeServedFilter}
                    onChange={(e) => setNoticeServedFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Notice Served</option>
                    <option value="NO">No Notice Served</option>
                  </select>
                </div>

                {/* On Bail / Surrendered */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Bail / Surrendered in Court
                  </label>
                  <select
                    value={bailSurrenderedFilter}
                    onChange={(e) => setBailSurrenderedFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Yes (On Bail / Surrendered)</option>
                    <option value="NO">No</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 6: VICTIM RECOVERY, SPECIAL LAWS & CCTNS FILTERS */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-4 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleSection('specialLaws')}
            >
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-rose-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  6. Victim Recovery, Special Acts (Arms/Liquor/NDPS) & CCTNS
                </h4>
                {(isVictimRecoveryFilter !== 'ALL' || isArmsCaseFilter !== 'ALL' || isLiquorCaseFilter !== 'ALL' || chargesheetCCTNSFilter !== 'ALL' || caseDiaryCCTNSFilter !== 'ALL') && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold">
                    Active
                  </span>
                )}
              </div>
              {openSections.specialLaws ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {openSections.specialLaws && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 animate-fadeIn">
                {/* Victim Recovery */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Victim Recovery Status
                  </label>
                  <select
                    value={victimRecoveredFilter}
                    onChange={(e) => setVictimRecoveredFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Recovered</option>
                    <option value="NO">Pending Recovery</option>
                  </select>
                </div>

                {/* Arms Act */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Arms Act Cases
                  </label>
                  <select
                    value={isArmsCaseFilter}
                    onChange={(e) => setIsArmsCaseFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Arms Act Only</option>
                    <option value="NO">Non-Arms Cases</option>
                  </select>
                </div>

                {/* Liquor Prohibition */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Liquor / Prohibition Case
                  </label>
                  <select
                    value={isLiquorCaseFilter}
                    onChange={(e) => setIsLiquorCaseFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Liquor Cases Only</option>
                    <option value="NO">Non-Liquor Cases</option>
                  </select>
                </div>

                {/* Chargesheet Uploaded CCTNS */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Chargesheet Uploaded CCTNS
                  </label>
                  <select
                    value={chargesheetCCTNSFilter}
                    onChange={(e) => setChargesheetCCTNSFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Yes (Uploaded)</option>
                    <option value="NO">Pending Upload</option>
                  </select>
                </div>

                {/* Case Diary Uploaded CCTNS */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Case Diary Uploaded CCTNS
                  </label>
                  <select
                    value={caseDiaryCCTNSFilter}
                    onChange={(e) => setCaseDiaryCCTNSFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Yes (Uploaded)</option>
                    <option value="NO">Pending Upload</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DATA TABLE PREVIEW WITH COLUMN SORTING */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        {/* Table Controls Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-500" />
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Report Data Preview ({sortedCases.length} Records)
            </h3>
            <span className="text-xs text-slate-400">
              Showing {activeFields.length} selected columns
            </span>
          </div>

          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Sort By:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="firDate">FIR Date</option>
              <option value="firNumber">FIR Number</option>
              <option value="lastCaseReviewDate">Last Review Date</option>
              <option value="noOfReviews">No. of Reviews</option>
              <option value="targetDisposalDate">Target Disposal Date</option>
              <option value="overdueDays">Overdue Days</option>
              <option value="pendingArrestCount">Pending Arrests</option>
              <option value="arrestedCount">Arrests Made</option>
              <option value="ps">Police Station</option>
              <option value="ioName">IO Name</option>
            </select>

            <button
              type="button"
              onClick={() => setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC')}
              className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortDirection}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          {sortedCases.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No cases match the combined crime & review criteria.</p>
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  {activeFields.map((field) => (
                    <th
                      key={field.id}
                      onClick={() => {
                        if (sortField === field.id) {
                          setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
                        } else {
                          setSortField(field.id);
                          setSortDirection('DESC');
                        }
                      }}
                      className="py-3 px-3 cursor-pointer hover:text-indigo-600 transition whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>{field.label}</span>
                        {sortField === field.id && (
                          <span className="text-indigo-600 font-extrabold">{sortDirection === 'ASC' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {sortedCases.map((c, idx) => {
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
                      <td className="py-3 px-3 text-center font-bold text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      {activeFields.map((field) => {
                        const val = field.getValue(c);
                        return (
                          <td key={field.id} className="py-3 px-3 whitespace-nowrap">
                            {field.id === 'firNumber' ? (
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {String(val)}
                              </span>
                            ) : field.id === 'crimeHead' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {String(val)}
                              </span>
                            ) : field.id === 'status' ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  val === 'Under Investigation'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                {String(val)}
                              </span>
                            ) : field.id === 'designation' ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  val === 'SR'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {String(val)}
                              </span>
                            ) : (
                              <span className="text-slate-800 dark:text-slate-200">
                                {String(val)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onViewCase(c)}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-600 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
