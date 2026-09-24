import React, { useState, useMemo } from 'react';
import {
  FIRCase,
  PoliceStationName,
  CaseReviewFilterOptions,
  InvestigatingOfficer,
  UserRole,
} from '../types';
import {
  Search,
  Filter,
  FileText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Printer,
  Edit3,
  Eye,
  UserCheck,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  HeartPulse,
  Crosshair,
  Wine,
  Pill,
  Camera,
  FolderArchive,
  Users,
  Target,
  ArrowRight,
  Check,
  X,
  Building,
  UserX,
  ArrowUpDown,
  Plus,
  QrCode,
} from 'lucide-react';
import { formatReadableDate, matchesReviewFilter, normalizeReviewStatus } from '../utils/helpers';

interface CaseReviewSectionProps {
  cases: FIRCase[];
  ios?: InvestigatingOfficer[];
  currentRole: UserRole;
  onEditCase: (caseItem: FIRCase) => void;
  onViewCase: (caseItem: FIRCase) => void;
  onDeleteCase?: (caseId: string) => void;
  onOpenQRCode?: (caseItem: FIRCase) => void;
  isReadOnly?: boolean;
}

export type ReviewSortField =
  | 'firDate'
  | 'firNumber'
  | 'disposedDate'
  | 'ioName'
  | 'ps'
  | 'status'
  | 'pendingArrests'
  | 'reviewCount'
  | 'lastReviewDate'
  | 'targetDisposalDate';

export interface SortRule {
  field: ReviewSortField;
  order: 'asc' | 'desc';
}

const SORT_FIELD_LABELS: Record<ReviewSortField, string> = {
  firDate: 'FIR Date',
  firNumber: 'FIR Number',
  disposedDate: 'Disposed Date',
  ioName: 'Officer / IO Name',
  ps: 'Police Station',
  status: 'Case Status',
  pendingArrests: 'Pending Arrests Count',
  reviewCount: 'Review Sessions Count',
  lastReviewDate: 'Last Review Date',
  targetDisposalDate: 'Target Disposal Date',
};

const DEFAULT_REVIEW_FILTERS: CaseReviewFilterOptions = {
  searchQuery: '',
  policeStation: 'ALL',
  designation: 'ALL',
  status: 'ALL',
  ioName: '',
  firStartDate: '',
  firEndDate: '',
  disposedStartDate: '',
  disposedEndDate: '',
  isInjuryPresent: 'ALL',
  injuryReportReceived: 'ALL',
  pmReportReceived: 'ALL',
  visceraPreserved: 'ALL',
  fslVisitedPO: 'ALL',
  fslItemPreserved: 'ALL',
  fslItemSentOrPermission: 'ALL',
  fslReportReceived: 'ALL',
  pendingForArrest: 'ALL',
  anyPersonArrested: 'ALL',
  anyPersonServedNotice: 'ALL',
  anyPersonOnBailOrSurrendered: 'ALL',
  isVictimRecoveryCase: 'ALL',
  victimAgeType: 'ALL',
  victimRecovered: 'ALL',
  isArmsCase: 'ALL',
  armsVerificationStatus: 'ALL',
  isLiquorCase: 'ALL',
  liquorLabReport: 'ALL',
  liquorVehicleSeized: 'ALL',
  isNdpsCase: 'ALL',
  ndpsLabReport: 'ALL',
  ndpsSafeHouse: 'ALL',
  poPreserved: 'ALL',
  poVideographyDone: 'ALL',
  sidLinkedWithFir: 'ALL',
  reviewCountFilter: 'ALL',
  targetDateStatus: 'ALL',
  startDate: '',
  endDate: '',
};

export const CaseReviewSection: React.FC<CaseReviewSectionProps> = ({
  cases,
  ios = [],
  currentRole,
  onEditCase,
  onViewCase,
  onDeleteCase,
  onOpenQRCode,
  isReadOnly = false,
}) => {
  const [filters, setFilters] = useState<CaseReviewFilterOptions>(DEFAULT_REVIEW_FILTERS);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [selectedCaseForReport, setSelectedCaseForReport] = useState<FIRCase | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { field: 'firDate', order: 'desc' },
  ]);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  // Available Police Stations
  const policeStationOptions = useMemo(() => {
    const list = Array.from(new Set(cases.map((c) => c.ps))).filter(Boolean);
    return list.sort();
  }, [cases]);

  // Available IO Names filtered by selected Police Station (if any)
  const ioOptions = useMemo(() => {
    let relevantCases = cases;
    let relevantIos = ios;

    if (filters.policeStation && filters.policeStation !== 'ALL') {
      const selectedPs = filters.policeStation.toLowerCase().trim();
      relevantCases = cases.filter(
        (c) => (c.ps || '').toLowerCase().trim() === selectedPs
      );
      relevantIos = ios.filter(
        (i) => (i.ps || '').toLowerCase().trim() === selectedPs
      );
    }

    const fromCases = relevantCases.map((c) => c.ioName?.trim()).filter(Boolean) as string[];
    const fromIos = relevantIos.map((i) => i.name?.trim()).filter(Boolean);
    const set = Array.from(new Set([...fromCases, ...fromIos]));
    return set.sort((a, b) => a.localeCompare(b));
  }, [cases, ios, filters.policeStation]);

  // Filter Cases Logic
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // PS Filter
      if (filters.policeStation !== 'ALL' && c.ps !== filters.policeStation) return false;

      // Classification Filter
      if (filters.designation !== 'ALL' && c.designation !== filters.designation) return false;

      // Status Filter
      if (filters.status !== 'ALL') {
        if (filters.status === 'Under Investigation' && c.status !== 'Under Investigation') return false;
        if (filters.status === 'Disposed' && c.status !== 'Disposed') return false;
      }

      // Officer / IO Filter
      if (filters.ioName && filters.ioName.trim() && filters.ioName !== 'ALL') {
        const targetIo = filters.ioName.toLowerCase().trim();
        const caseIo = (c.ioName || '').toLowerCase().trim();
        if (!caseIo.includes(targetIo) && !targetIo.includes(caseIo)) return false;
      }

      // Search Query
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const textToMatch = [
          c.firNumber,
          c.ps,
          c.sections,
          c.complainantName,
          c.ioName,
          c.placeOfOccurrence,
          c.pendingArrestNames,
          c.arrestedNames,
          c.noticeServedNames,
          c.bailSurrenderedNames,
          c.victimRecoveryDetails,
          c.fslItemPreservedName,
          c.sdpoSupervisionNote,
          c.psProgressRemarks,
          c.targetRemarks,
          c.otherPendingReasons,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!textToMatch.includes(query)) return false;
      }

      // FIR Date Range
      const fStartDate = filters.firStartDate || filters.startDate;
      const fEndDate = filters.firEndDate || filters.endDate;
      if (fStartDate && c.firDate && c.firDate < fStartDate) return false;
      if (fEndDate && c.firDate && c.firDate > fEndDate) return false;

      // Disposed Date Range
      if (filters.disposedStartDate || filters.disposedEndDate) {
        if (c.status !== 'Disposed') return false;
        const dDate = c.disposedDate || c.updatedAt || '';
        if (filters.disposedStartDate && (!dDate || dDate < filters.disposedStartDate)) return false;
        if (filters.disposedEndDate && (!dDate || dDate > filters.disposedEndDate)) return false;
      }

      // 1. Injury & Forensics
      if (filters.isInjuryPresent === 'YES' && !c.isInjuryPresent) return false;
      if (filters.isInjuryPresent === 'NO' && c.isInjuryPresent) return false;

      if (!matchesReviewFilter(c.injuryReportReceived, filters.injuryReportReceived)) return false;
      if (!matchesReviewFilter(c.pmReportReceived, filters.pmReportReceived)) return false;
      if (!matchesReviewFilter(c.visceraPreserved, filters.visceraPreserved)) return false;
      if (!matchesReviewFilter(c.fslVisitedPO, filters.fslVisitedPO)) return false;

      if (filters.fslItemPreserved === 'YES' && (!c.fslItemPreservedName || !c.fslItemPreservedName.trim())) return false;
      if (filters.fslItemPreserved === 'NO' && Boolean(c.fslItemPreservedName && c.fslItemPreservedName.trim())) return false;

      if (!matchesReviewFilter(c.fslItemSentOrPermissionTaken, filters.fslItemSentOrPermission)) return false;
      if (!matchesReviewFilter(c.fslReportReceived, filters.fslReportReceived)) return false;

      // 2. Accused Tracking, Arrests, Notice & Bail
      if (filters.pendingForArrest === 'YES' && !c.pendingForArrest && (!c.pendingArrestCount || c.pendingArrestCount <= 0)) return false;
      if (filters.pendingForArrest === 'NO' && (c.pendingForArrest || (c.pendingArrestCount && c.pendingArrestCount > 0))) return false;

      if (filters.anyPersonArrested === 'YES' && !c.anyPersonArrested && (!c.arrestedCount || c.arrestedCount <= 0)) return false;
      if (filters.anyPersonArrested === 'NO' && (c.anyPersonArrested || (c.arrestedCount && c.arrestedCount > 0))) return false;

      if (filters.anyPersonServedNotice === 'YES' && !c.anyPersonServedNotice && (!c.noticeServedCount || c.noticeServedCount <= 0)) return false;
      if (filters.anyPersonServedNotice === 'NO' && (c.anyPersonServedNotice || (c.noticeServedCount && c.noticeServedCount > 0))) return false;

      if (filters.anyPersonOnBailOrSurrendered === 'YES' && !c.anyPersonOnBailOrSurrendered && (!c.bailSurrenderedCount || c.bailSurrenderedCount <= 0)) return false;
      if (filters.anyPersonOnBailOrSurrendered === 'NO' && (c.anyPersonOnBailOrSurrendered || (c.bailSurrenderedCount && c.bailSurrenderedCount > 0))) return false;

      // 3. Recovery of Girl / Boy
      if (filters.isVictimRecoveryCase === 'YES' && !c.isVictimRecoveryCase) return false;
      if (filters.isVictimRecoveryCase === 'NO' && c.isVictimRecoveryCase) return false;

      if (filters.victimAgeType !== 'ALL' && c.victimAgeType !== filters.victimAgeType) return false;

      if (filters.victimRecovered === 'YES' && (!c.isVictimRecoveryCase || !c.victimRecovered)) return false;
      if (filters.victimRecovered === 'NO' && (!c.isVictimRecoveryCase || c.victimRecovered)) return false;

      // 4. Special Acts: Arms
      if (filters.isArmsCase === 'YES' && !c.isArmsCase) return false;
      if (filters.isArmsCase === 'NO' && c.isArmsCase) return false;

      if (!matchesReviewFilter(c.armsSentForVerification, filters.armsSentForVerification)) return false;
      if (!matchesReviewFilter(c.armsReportReceived, filters.armsReportReceived)) return false;

      if (filters.armsVerificationStatus === 'SENT' && (!c.isArmsCase || normalizeReviewStatus(c.armsSentForVerification) !== 'YES')) return false;
      if (filters.armsVerificationStatus === 'REPORT_RECEIVED' && (!c.isArmsCase || normalizeReviewStatus(c.armsReportReceived) !== 'YES')) return false;
      if (filters.armsVerificationStatus === 'PENDING' && (!c.isArmsCase || normalizeReviewStatus(c.armsReportReceived) === 'YES')) return false;

      // 5. Special Acts: Liquor
      if (filters.isLiquorCase === 'YES' && !c.isLiquorCase) return false;
      if (filters.isLiquorCase === 'NO' && c.isLiquorCase) return false;

      if (!matchesReviewFilter(c.liquorSentToLab, filters.liquorSentToLab)) return false;
      if (!matchesReviewFilter(c.liquorLabReportReceived, filters.liquorLabReport)) return false;
      if (!matchesReviewFilter(c.confiscationOfLiquor, filters.confiscationOfLiquor)) return false;

      if (filters.liquorVehicleSeized === 'YES' && (!c.isLiquorCase || !c.liquorVehicleSeized)) return false;
      if (filters.liquorVehicleSeized === 'NO' && (!c.isLiquorCase || c.liquorVehicleSeized)) return false;
      if (!matchesReviewFilter(c.vehicleVerifiedRTO, filters.vehicleVerifiedRTO)) return false;

      // 6. Special Acts: NDPS
      if (filters.isNdpsCase === 'YES' && !c.isNdpsCase) return false;
      if (filters.isNdpsCase === 'NO' && c.isNdpsCase) return false;

      if (!matchesReviewFilter(c.ndpsSampleSentToLab, filters.ndpsSampleSentToLab)) return false;
      if (!matchesReviewFilter(c.ndpsLabReportReceived, filters.ndpsLabReport)) return false;
      if (!matchesReviewFilter(c.ndpsExhibitSentToSafeHouse, filters.ndpsSafeHouse)) return false;

      // 7. Forensics & Digital
      if (!matchesReviewFilter(c.poPreserved, filters.poPreserved)) return false;
      if (!matchesReviewFilter(c.poVideographyDone, filters.poVideographyDone)) return false;
      if (!matchesReviewFilter(c.sidLinkedWithFir, filters.sidLinkedWithFir)) return false;

      // Review Count
      const reviewCount = c.noOfReviews ?? (c.caseReviewDates?.length || 0);
      if (filters.reviewCountFilter === 'ZERO' && reviewCount > 0) return false;
      if (filters.reviewCountFilter === '1_OR_MORE' && reviewCount < 1) return false;
      if (filters.reviewCountFilter === '2_OR_MORE' && reviewCount < 2) return false;
      if (filters.reviewCountFilter === '3_OR_MORE' && reviewCount < 3) return false;

      // Target Date Status
      if (filters.targetDateStatus === 'SET' && !c.targetDisposalDate) return false;
      if (filters.targetDateStatus === 'NOT_SET' && Boolean(c.targetDisposalDate)) return false;

      return true;
    });
  }, [cases, filters]);

  // Multi-Sort Comparator Logic
  const sortedAndFilteredCases = useMemo(() => {
    if (!sortRules || sortRules.length === 0) return filteredCases;

    const list = [...filteredCases];
    list.sort((a, b) => {
      for (const rule of sortRules) {
        let diff = 0;
        const isAsc = rule.order === 'asc';

        switch (rule.field) {
          case 'firDate': {
            const dateA = a.firDate || '';
            const dateB = b.firDate || '';
            diff = dateA.localeCompare(dateB);
            break;
          }
          case 'firNumber': {
            const numA = parseInt(a.firNumber, 10) || 0;
            const numB = parseInt(b.firNumber, 10) || 0;
            diff = numA !== numB ? numA - numB : a.firNumber.localeCompare(b.firNumber);
            break;
          }
          case 'disposedDate': {
            const dateA = a.disposedDate || a.updatedAt || '';
            const dateB = b.disposedDate || b.updatedAt || '';
            diff = dateA.localeCompare(dateB);
            break;
          }
          case 'ioName': {
            const nameA = a.ioName || '';
            const nameB = b.ioName || '';
            diff = nameA.localeCompare(nameB);
            break;
          }
          case 'ps': {
            diff = (a.ps || '').localeCompare(b.ps || '');
            break;
          }
          case 'status': {
            diff = (a.status || '').localeCompare(b.status || '');
            break;
          }
          case 'pendingArrests': {
            const countA = a.pendingArrestCount ? Number(a.pendingArrestCount) : a.pendingForArrest ? 1 : 0;
            const countB = b.pendingArrestCount ? Number(b.pendingArrestCount) : b.pendingForArrest ? 1 : 0;
            diff = countA - countB;
            break;
          }
          case 'reviewCount': {
            const revA = a.noOfReviews ?? (a.caseReviewDates?.length || 0);
            const revB = b.noOfReviews ?? (b.caseReviewDates?.length || 0);
            diff = revA - revB;
            break;
          }
          case 'lastReviewDate': {
            const dateA = a.lastCaseReviewDate || (a.caseReviewDates && a.caseReviewDates[a.caseReviewDates.length - 1]) || '';
            const dateB = b.lastCaseReviewDate || (b.caseReviewDates && b.caseReviewDates[b.caseReviewDates.length - 1]) || '';
            diff = dateA.localeCompare(dateB);
            break;
          }
          case 'targetDisposalDate': {
            const targetA = a.targetDisposalDate || '';
            const targetB = b.targetDisposalDate || '';
            diff = targetA.localeCompare(targetB);
            break;
          }
          default:
            diff = 0;
        }

        if (diff !== 0) {
          return isAsc ? diff : -diff;
        }
      }
      return 0;
    });

    return list;
  }, [filteredCases, sortRules]);

  // Sorting Helper Functions
  const handleAddSortRule = () => {
    const existingFields = new Set(sortRules.map((r) => r.field));
    const allFields: ReviewSortField[] = [
      'firDate',
      'firNumber',
      'ioName',
      'ps',
      'status',
      'pendingArrests',
      'reviewCount',
      'lastReviewDate',
      'disposedDate',
      'targetDisposalDate',
    ];
    const nextField = allFields.find((f) => !existingFields.has(f)) || 'firDate';
    setSortRules((prev) => [...prev, { field: nextField, order: 'desc' }]);
  };

  const handleUpdateSortRule = (index: number, updates: Partial<SortRule>) => {
    setSortRules((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleRemoveSortRule = (index: number) => {
    setSortRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickSortToggle = (field: ReviewSortField) => {
    setSortRules((prev) => {
      const idx = prev.findIndex((r) => r.field === field);
      if (idx === -1) {
        return [{ field, order: 'asc' }, ...prev];
      }
      const existing = prev[idx];
      if (existing.order === 'asc') {
        const copy = [...prev];
        copy[idx] = { field, order: 'desc' };
        return copy;
      } else {
        return prev.filter((_, i) => i !== idx);
      }
    });
  };

  // Aggregate Metrics for Review Dashboard
  const summaryMetrics = useMemo(() => {
    let totalReviewedCases = 0;
    let totalPendingArrestsCount = 0;
    let totalArrestedCount = 0;
    let totalNoticeServedCount = 0;
    let totalBailSurrenderedCount = 0;

    let totalVictimCases = 0;
    let totalVictimsCount = 0;
    let totalVictimsRecovered = 0;
    let totalMinorVictims = 0;
    let totalMajorVictims = 0;

    let fslPendingReports = 0;
    let armsCases = 0;
    let liquorCases = 0;
    let ndpsCases = 0;
    let poVideographyCases = 0;
    let sidLinkedCases = 0;

    cases.forEach((c) => {
      const reviewCount = c.noOfReviews ?? (c.caseReviewDates?.length || 0);
      if (reviewCount > 0 || c.lastCaseReviewDate) totalReviewedCases++;

      if (c.pendingArrestCount) totalPendingArrestsCount += Number(c.pendingArrestCount);
      else if (c.pendingForArrest) totalPendingArrestsCount += 1;

      if (c.arrestedCount) totalArrestedCount += Number(c.arrestedCount);
      else if (c.anyPersonArrested) totalArrestedCount += 1;

      if (c.noticeServedCount) totalNoticeServedCount += Number(c.noticeServedCount);
      else if (c.anyPersonServedNotice) totalNoticeServedCount += 1;

      if (c.bailSurrenderedCount) totalBailSurrenderedCount += Number(c.bailSurrenderedCount);
      else if (c.anyPersonOnBailOrSurrendered) totalBailSurrenderedCount += 1;

      if (c.isVictimRecoveryCase) {
        totalVictimCases++;
        totalVictimsCount += Number(c.victimCount || 1);
        if (c.victimRecovered) totalVictimsRecovered += Number(c.victimCount || 1);
        if (c.victimAgeType === 'minor') totalMinorVictims += Number(c.victimCount || 1);
        if (c.victimAgeType === 'major') totalMajorVictims += Number(c.victimCount || 1);
      }

      if (c.fslItemPreservedName && !c.fslReportReceived) fslPendingReports++;
      if (c.isArmsCase) armsCases++;
      if (c.isLiquorCase) liquorCases++;
      if (c.isNdpsCase) ndpsCases++;
      if (c.poVideographyDone) poVideographyCases++;
      if (c.sidLinkedWithFir) sidLinkedCases++;
    });

    return {
      totalReviewedCases,
      totalPendingArrestsCount,
      totalArrestedCount,
      totalNoticeServedCount,
      totalBailSurrenderedCount,
      totalVictimCases,
      totalVictimsCount,
      totalVictimsRecovered,
      totalMinorVictims,
      totalMajorVictims,
      fslPendingReports,
      armsCases,
      liquorCases,
      ndpsCases,
      poVideographyCases,
      sidLinkedCases,
    };
  }, [cases]);

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = [
      'FIR Number',
      'Police Station',
      'FIR Date',
      'Classification',
      'Status',
      'IO Name',
      'Sections',
      'Injury Present',
      'PM Report',
      'Viscera Preserved',
      'FSL Visited PO',
      'FSL Item Preserved',
      'FSL Report Received',
      'Pending for Arrest (Count)',
      'Pending Arrest Names',
      'Persons Arrested (Count)',
      'Arrested Names',
      'Notice (41A) Served',
      'Notice Served Names',
      'Bail / Surrendered',
      'Bail / Surrendered Names',
      'Recovery Case',
      'Victim Age',
      'Girl/Boy Recovered',
      'Recovery Date',
      'Arms Case',
      'Arms Verification Status',
      'Liquor Case',
      'Liquor Lab Report',
      'Vehicle Seized',
      'NDPS Case',
      'NDPS Lab Report',
      'NDPS Safe House',
      'PO Preserved',
      'PO Videography',
      'Total CD Uploaded',
      'Total SID Created',
      'SID Linked with FIR',
      'Target Date',
      'Target Remarks',
      'Last Review Date',
      'Total Reviews',
      'Other Pending Reasons',
    ];

    const rows = sortedAndFilteredCases.map((c) => [
      `"${c.firNumber}"`,
      `"${c.ps}"`,
      `"${c.firDate}"`,
      `"${c.designation}"`,
      `"${c.status}"`,
      `"${c.ioName}"`,
      `"${(c.sections || '').replace(/"/g, '""')}"`,
      c.isInjuryPresent ? 'Yes' : 'No',
      c.pmReportReceived ? 'Yes' : 'No',
      c.visceraPreserved ? 'Yes' : 'No',
      c.fslVisitedPO ? 'Yes' : 'No',
      `"${(c.fslItemPreservedName || '').replace(/"/g, '""')}"`,
      c.fslReportReceived ? 'Yes' : 'No',
      c.pendingArrestCount || (c.pendingForArrest ? '1' : '0'),
      `"${(c.pendingArrestNames || '').replace(/"/g, '""')}"`,
      c.arrestedCount || (c.anyPersonArrested ? '1' : '0'),
      `"${(c.arrestedNames || '').replace(/"/g, '""')}"`,
      c.noticeServedCount || (c.anyPersonServedNotice ? '1' : '0'),
      `"${(c.noticeServedNames || '').replace(/"/g, '""')}"`,
      c.bailSurrenderedCount || (c.anyPersonOnBailOrSurrendered ? '1' : '0'),
      `"${(c.bailSurrenderedNames || '').replace(/"/g, '""')}"`,
      c.isVictimRecoveryCase ? 'Yes' : 'No',
      c.victimAgeType || 'N/A',
      c.victimRecovered ? 'Yes' : 'No',
      `"${c.victimRecoveryDate || ''}"`,
      c.isArmsCase ? 'Yes' : 'No',
      c.armsReportReceived ? 'Report Received' : c.armsSentForVerification ? 'Sent for Verification' : 'Pending',
      c.isLiquorCase ? 'Yes' : 'No',
      c.liquorLabReportReceived ? 'Received' : 'Pending',
      c.liquorVehicleSeized ? 'Yes' : 'No',
      c.isNdpsCase ? 'Yes' : 'No',
      c.ndpsLabReportReceived ? 'Received' : 'Pending',
      c.ndpsExhibitSentToSafeHouse ? 'Yes' : 'No',
      c.poPreserved ? 'Yes' : 'No',
      c.poVideographyDone ? 'Yes' : 'No',
      c.totalCdUploaded ?? (c.lastCaseDiaryNo || '0'),
      c.totalSidCreated ?? '0',
      c.sidLinkedWithFir ? 'Yes' : 'No',
      `"${c.targetDisposalDate || ''}"`,
      `"${(c.targetRemarks || '').replace(/"/g, '""')}"`,
      `"${c.lastCaseReviewDate || (c.caseReviewDates?.[c.caseReviewDates.length - 1] || '')}"`,
      c.noOfReviews ?? (c.caseReviewDates?.length || 0),
      `"${(c.otherPendingReasons || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Case_Review_Analysis_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-xl border border-purple-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-200 border border-purple-400/40 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>Supervisory Command & Judicial Case Review</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <span>Case Review & Comprehensive Investigation Analytics</span>
          </h2>
          <p className="text-xs text-purple-200/90 max-w-3xl">
            In-depth multi-dimensional review register tracking medical/forensic evidence, FSL samples, accused arrest pipelines, 41A notices, victim girl/boy recoveries, Arms/Liquor/NDPS protocols, digital forensics, and disposal targets.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel (CSV)</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-600/50 text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-purple-300" />
            <span>Print Official Review Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Total Reviewed */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cases Reviewed</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {summaryMetrics.totalReviewedCases}{' '}
            <span className="text-xs font-semibold text-slate-400">/ {cases.length}</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
            {Math.round((summaryMetrics.totalReviewedCases / (cases.length || 1)) * 100)}% Coverage
          </div>
        </div>

        {/* Metric 2: Pending Arrests */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Arrests</span>
            <UserX className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400">
            {summaryMetrics.totalPendingArrestsCount}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Accused to be arrested
          </div>
        </div>

        {/* Metric 3: Arrested & Notice Served */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Arrested / 41A Notice</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {summaryMetrics.totalArrestedCount}{' '}
            <span className="text-xs font-semibold text-slate-400">| {summaryMetrics.totalNoticeServedCount} Ntc</span>
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
            {summaryMetrics.totalBailSurrenderedCount} on Bail/Surrendered
          </div>
        </div>

        {/* Metric 4: Victim Girl/Boy Recovery */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Victim Recovery</span>
            <HeartPulse className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400">
            {summaryMetrics.totalVictimsRecovered}{' '}
            <span className="text-xs font-semibold text-slate-400">/ {summaryMetrics.totalVictimsCount}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            {summaryMetrics.totalMinorVictims} Minors • {summaryMetrics.totalMajorVictims} Majors
          </div>
        </div>

        {/* Metric 5: FSL & Forensics Pipeline */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">FSL Reports Due</span>
            <FolderArchive className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {summaryMetrics.fslPendingReports}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Pending Laboratory Results
          </div>
        </div>

        {/* Metric 6: Special Acts & Digital */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Special Acts</span>
            <Crosshair className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>🔫 {summaryMetrics.armsCases} Arms</span>
            <span>🍾 {summaryMetrics.liquorCases} Liq</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            💊 {summaryMetrics.ndpsCases} NDPS • 📹 {summaryMetrics.poVideographyCases} Video
          </div>
        </div>
      </div>

      {/* Comprehensive Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        {/* Search & Header Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search by FIR #, Accused Name, Sections, IO, Complainant, Victim Name, FSL Item, Directives..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-purple-500" />
              <span>{showAdvancedFilters ? 'Collapse Filters' : 'All Review Filters'}</span>
              {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setFilters(DEFAULT_REVIEW_FILTERS)}
              className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Filter Matrix (When Expanded) */}
        {showAdvancedFilters && (
          <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Row 1: Jurisdiction & Core Status */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase text-purple-900 dark:text-purple-300 block tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>1. Core Case Identification & Jurisdiction</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Filter by Officer/IO, Police Station, and Date Ranges
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2">
                {/* Police Station */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Police Station</label>
                  <select
                    value={filters.policeStation}
                    onChange={(e) => {
                      const newPs = e.target.value as any;
                      setFilters((prev) => ({
                        ...prev,
                        policeStation: newPs,
                        // Reset IO filter if switching stations
                        ioName: '',
                      }));
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Stations ({policeStationOptions.length})</option>
                    {policeStationOptions.map((ps) => (
                      <option key={ps} value={ps}>
                        {ps} PS
                      </option>
                    ))}
                  </select>
                </div>

                {/* Officer / IO Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                    Officer / IO {filters.policeStation !== 'ALL' ? `(${filters.policeStation})` : ''}
                  </label>
                  <select
                    value={filters.ioName || 'ALL'}
                    onChange={(e) => setFilters((prev) => ({ ...prev, ioName: e.target.value === 'ALL' ? '' : e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg text-xs p-1.5 font-bold text-purple-900 dark:text-purple-300"
                  >
                    <option value="ALL">
                      {filters.policeStation !== 'ALL'
                        ? `All ${filters.policeStation} IOs (${ioOptions.length})`
                        : `All Officers / IOs (${ioOptions.length})`}
                    </option>
                    {ioOptions.map((io) => (
                      <option key={io} value={io}>
                        👮 {io}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Classification */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Classification</label>
                  <select
                    value={filters.designation}
                    onChange={(e) => setFilters((prev) => ({ ...prev, designation: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All (SR & NON-SR)</option>
                    <option value="SR">⭐ SR Cases (SDPO)</option>
                    <option value="NON_SR">👮 NON-SR Cases (CI)</option>
                  </select>
                </div>

                {/* Investigation Status */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Investigation Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Under Investigation">Under Investigation</option>
                    <option value="Disposed">Disposed</option>
                  </select>
                </div>

                {/* FIR Date Range: From */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">FIR Date (From)</label>
                  <input
                    type="date"
                    value={filters.firStartDate || filters.startDate || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, firStartDate: e.target.value, startDate: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {/* FIR Date Range: To */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">FIR Date (To)</label>
                  <input
                    type="date"
                    value={filters.firEndDate || filters.endDate || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, firEndDate: e.target.value, endDate: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {/* Disposed Date Range: From */}
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">Disposed Date (From)</label>
                  <input
                    type="date"
                    value={filters.disposedStartDate || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, disposedStartDate: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs p-1 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {/* Disposed Date Range: To */}
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">Disposed Date (To)</label>
                  <input
                    type="date"
                    value={filters.disposedEndDate || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, disposedEndDate: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs p-1 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Extra row for Review Frequency & Target Disposal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                {/* Number of Reviews */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Review Frequency</label>
                  <select
                    value={filters.reviewCountFilter}
                    onChange={(e) => setFilters((prev) => ({ ...prev, reviewCountFilter: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Review Counts</option>
                    <option value="ZERO">0 Reviews (Not Reviewed)</option>
                    <option value="1_OR_MORE">≥ 1 Review Done</option>
                    <option value="2_OR_MORE">≥ 2 Reviews Done</option>
                    <option value="3_OR_MORE">≥ 3 Reviews Done</option>
                  </select>
                </div>

                {/* Target Date Status */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">TARGET Disposal Date Status</label>
                  <select
                    value={filters.targetDateStatus}
                    onChange={(e) => setFilters((prev) => ({ ...prev, targetDateStatus: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Target Statuses</option>
                    <option value="SET">🎯 Target Set</option>
                    <option value="NOT_SET">✕ No Target Set</option>
                  </select>
                </div>

                {/* Active Filter Clear Info */}
                <div className="flex items-end justify-between">
                  {(filters.ioName || filters.firStartDate || filters.firEndDate || filters.disposedStartDate || filters.disposedEndDate) && (
                    <button
                      type="button"
                      onClick={() => setFilters((prev) => ({
                        ...prev,
                        ioName: '',
                        firStartDate: '',
                        firEndDate: '',
                        startDate: '',
                        endDate: '',
                        disposedStartDate: '',
                        disposedEndDate: '',
                      }))}
                      className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/70 hover:bg-purple-200 text-purple-700 dark:text-purple-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Clear Core Filters</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Medical, Injury & FSL Forensics */}
            <div className="bg-purple-50/40 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-200/80 dark:border-purple-800/40 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-purple-900 dark:text-purple-300 block tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>2. Injury, Post-Mortem & FSL Forensic Parameters</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {/* Injury Present */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Injury Present</label>
                  <select
                    value={filters.isInjuryPresent}
                    onChange={(e) => setFilters((prev) => ({ ...prev, isInjuryPresent: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Cases</option>
                    <option value="YES">🩸 Yes (Injury Reported)</option>
                    <option value="NO">No Injury</option>
                  </select>
                </div>

                {/* Injury Report Received */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Injury Report</label>
                  <select
                    value={filters.injuryReportReceived}
                    onChange={(e) => setFilters((prev) => ({ ...prev, injuryReportReceived: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="YES">✓ Yes (Received)</option>
                    <option value="PENDING">⏳ Pending</option>
                    <option value="NA">⚪ NA (Not Applicable)</option>
                  </select>
                </div>

                {/* PM Report Received */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">PM Report</label>
                  <select
                    value={filters.pmReportReceived}
                    onChange={(e) => setFilters((prev) => ({ ...prev, pmReportReceived: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="YES">✓ Yes (PM Received)</option>
                    <option value="PENDING">⏳ Pending PM</option>
                    <option value="NA">⚪ NA (Not Applicable)</option>
                  </select>
                </div>

                {/* Viscera Preserved */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Viscera Preserved</label>
                  <select
                    value={filters.visceraPreserved}
                    onChange={(e) => setFilters((prev) => ({ ...prev, visceraPreserved: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="YES">✓ Yes (Preserved)</option>
                    <option value="PENDING">⏳ Pending</option>
                    <option value="NA">⚪ NA (Not Applicable)</option>
                  </select>
                </div>

                {/* FSL Visited PO */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">FSL Visited PO</label>
                  <select
                    value={filters.fslVisitedPO}
                    onChange={(e) => setFilters((prev) => ({ ...prev, fslVisitedPO: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="YES">✓ Yes (Visited)</option>
                    <option value="PENDING">⏳ Pending Visit</option>
                    <option value="NA">⚪ NA (Not Applicable)</option>
                  </select>
                </div>

                {/* FSL Item Preserved */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">FSL Item Preserved</label>
                  <select
                    value={filters.fslItemPreserved}
                    onChange={(e) => setFilters((prev) => ({ ...prev, fslItemPreserved: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="YES">📦 Yes (Preserved)</option>
                    <option value="NO">No Item Preserved</option>
                  </select>
                </div>

                {/* FSL Report Received */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">FSL Report Status</label>
                  <select
                    value={filters.fslReportReceived}
                    onChange={(e) => setFilters((prev) => ({ ...prev, fslReportReceived: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="YES">✓ Yes (Received)</option>
                    <option value="PENDING">⏳ Pending Report</option>
                    <option value="NA">⚪ NA (Not Applicable)</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Row 3: Accused Tracking, Arrests, Notice 41A, Bail & Victim Recovery */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-indigo-900 dark:text-indigo-300 block tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>3. Accused Enforcement, 41A Notice & Girl / Boy Recovery</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {/* Pending for Arrest */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Pending for Arrest</label>
                  <select
                    value={filters.pendingForArrest}
                    onChange={(e) => setFilters((prev) => ({ ...prev, pendingForArrest: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">🚨 Pending Arrest</option>
                    <option value="NO">None Pending</option>
                  </select>
                </div>

                {/* Any Person Arrested */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Accused Arrested</label>
                  <select
                    value={filters.anyPersonArrested}
                    onChange={(e) => setFilters((prev) => ({ ...prev, anyPersonArrested: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">👮 Person(s) Arrested</option>
                    <option value="NO">0 Arrested</option>
                  </select>
                </div>

                {/* Notice Served 41A */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">41A Notice Served</label>
                  <select
                    value={filters.anyPersonServedNotice}
                    onChange={(e) => setFilters((prev) => ({ ...prev, anyPersonServedNotice: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">📄 Notice 41A Served</option>
                    <option value="NO">No Notice</option>
                  </select>
                </div>

                {/* Bail / Surrendered */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Bail / Surrendered</label>
                  <select
                    value={filters.anyPersonOnBailOrSurrendered}
                    onChange={(e) => setFilters((prev) => ({ ...prev, anyPersonOnBailOrSurrendered: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">⚖️ On Bail / Surrendered</option>
                    <option value="NO">None</option>
                  </select>
                </div>

                {/* Girl / Boy Recovery Case */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Recovery of Girl/Boy</label>
                  <select
                    value={filters.isVictimRecoveryCase}
                    onChange={(e) => setFilters((prev) => ({ ...prev, isVictimRecoveryCase: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Cases</option>
                    <option value="YES">👧 Girl / Boy Case</option>
                    <option value="NO">Other Cases</option>
                  </select>
                </div>

                {/* Victim Age Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Victim Minor / Major</label>
                  <select
                    value={filters.victimAgeType}
                    onChange={(e) => setFilters((prev) => ({ ...prev, victimAgeType: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Age Types</option>
                    <option value="minor">👶 Minor (POCSO/Child)</option>
                    <option value="major">🧑 Major (Adult)</option>
                  </select>
                </div>

                {/* Victim Recovered Status */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Recovery Status</label>
                  <select
                    value={filters.victimRecovered}
                    onChange={(e) => setFilters((prev) => ({ ...prev, victimRecovered: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">✓ Girl/Boy Recovered</option>
                    <option value="NO">✕ Pending Recovery</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Row 4: Special Acts (Arms, Liquor, NDPS) & Forensics/SID */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-emerald-900 dark:text-emerald-300 block tracking-wider flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>4. Special Acts (Arms, Liquor, NDPS) & Digital Forensics / SID</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {/* Arms Case */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Arms Act Case</label>
                  <select
                    value={filters.isArmsCase}
                    onChange={(e) => setFilters((prev) => ({ ...prev, isArmsCase: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">🔫 Arms Act Case</option>
                    <option value="NO">Non-Arms</option>
                  </select>
                </div>

                {/* Liquor Case */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Liquor / Excise Case</label>
                  <select
                    value={filters.isLiquorCase}
                    onChange={(e) => setFilters((prev) => ({ ...prev, isLiquorCase: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">🍾 Liquor Case</option>
                    <option value="NO">Non-Liquor</option>
                  </select>
                </div>

                {/* NDPS Case */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">NDPS Case</label>
                  <select
                    value={filters.isNdpsCase}
                    onChange={(e) => setFilters((prev) => ({ ...prev, isNdpsCase: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">💊 NDPS Case</option>
                    <option value="NO">Non-NDPS</option>
                  </select>
                </div>

                {/* PO Preserved */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">PO Preserved</label>
                  <select
                    value={filters.poPreserved}
                    onChange={(e) => setFilters((prev) => ({ ...prev, poPreserved: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="YES">✓ Yes (PO Preserved)</option>
                    <option value="PENDING">⏳ Pending</option>
                    <option value="NA">⚪ NA (Not Applicable)</option>
                  </select>
                </div>

                {/* PO Videography */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">PO Videography</label>
                  <select
                    value={filters.poVideographyDone}
                    onChange={(e) => setFilters((prev) => ({ ...prev, poVideographyDone: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="YES">📹 Yes (Done)</option>
                    <option value="PENDING">⏳ Pending</option>
                    <option value="NA">⚪ NA (Not Applicable)</option>
                  </select>
                </div>

                {/* SID Linked With FIR */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">SID Linked With FIR</label>
                  <select
                    value={filters.sidLinkedWithFir}
                    onChange={(e) => setFilters((prev) => ({ ...prev, sidLinkedWithFir: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="YES">🔗 Yes (Linked)</option>
                    <option value="PENDING">⏳ Pending Link</option>
                    <option value="NA">⚪ NA (Not Applicable)</option>
                  </select>
                </div>


                {/* Vehicle Seized (Liquor) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Vehicle Seized</label>
                  <select
                    value={filters.liquorVehicleSeized}
                    onChange={(e) => setFilters((prev) => ({ ...prev, liquorVehicleSeized: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">🚗 Vehicle Seized</option>
                    <option value="NO">No Vehicle</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Summary & Count Bar */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            Showing <strong className="text-purple-600 dark:text-purple-400">{sortedAndFilteredCases.length}</strong> of{' '}
            <strong>{cases.length}</strong> total registered cases
          </div>
          {sortedAndFilteredCases.length === 0 && (
            <span className="text-rose-500 font-bold">No cases match the selected review criteria.</span>
          )}
        </div>
      </div>

      {/* Multi-Sort Controls & Active Sort Badges */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            <ArrowUpDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Multi-Sort:</span>
          </div>

          {/* Active Sort Chips */}
          {sortRules.map((rule, idx) => (
            <div
              key={rule.field}
              className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-lg px-2.5 py-1 text-xs font-bold text-purple-900 dark:text-purple-200"
            >
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-black">{idx + 1}.</span>
              <span>{SORT_FIELD_LABELS[rule.field]}</span>
              <button
                type="button"
                onClick={() =>
                  handleUpdateSortRule(idx, {
                    order: rule.order === 'asc' ? 'desc' : 'asc',
                  })
                }
                className="px-1 py-0.5 bg-purple-200 dark:bg-purple-900/80 hover:bg-purple-300 dark:hover:bg-purple-800 rounded text-[10px] uppercase font-black cursor-pointer"
                title={`Toggle Sort Order (${rule.order.toUpperCase()})`}
              >
                {rule.order === 'asc' ? '▲ ASC' : '▼ DESC'}
              </button>
              {sortRules.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSortRule(idx)}
                  className="text-purple-400 hover:text-rose-500 font-bold ml-0.5 cursor-pointer"
                  title="Remove this sort rule"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Add Sort Level Button */}
          {sortRules.length < 5 && (
            <button
              type="button"
              onClick={handleAddSortRule}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Sort Level</span>
            </button>
          )}
        </div>

        {/* Quick Sort Options */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Sort:</span>
          <button
            type="button"
            onClick={() => handleQuickSortToggle('firDate')}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              sortRules.some((r) => r.field === 'firDate')
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            FIR Date {sortRules.find((r) => r.field === 'firDate')?.order === 'asc' ? '▲' : sortRules.find((r) => r.field === 'firDate') ? '▼' : ''}
          </button>

          <button
            type="button"
            onClick={() => handleQuickSortToggle('pendingArrests')}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              sortRules.some((r) => r.field === 'pendingArrests')
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Pending Arrests {sortRules.find((r) => r.field === 'pendingArrests')?.order === 'asc' ? '▲' : sortRules.find((r) => r.field === 'pendingArrests') ? '▼' : ''}
          </button>

          <button
            type="button"
            onClick={() => handleQuickSortToggle('ioName')}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              sortRules.some((r) => r.field === 'ioName')
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            IO Name {sortRules.find((r) => r.field === 'ioName')?.order === 'asc' ? '▲' : sortRules.find((r) => r.field === 'ioName') ? '▼' : ''}
          </button>

          <button
            type="button"
            onClick={() => handleQuickSortToggle('lastReviewDate')}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              sortRules.some((r) => r.field === 'lastReviewDate')
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Last Review {sortRules.find((r) => r.field === 'lastReviewDate')?.order === 'asc' ? '▲' : sortRules.find((r) => r.field === 'lastReviewDate') ? '▼' : ''}
          </button>
        </div>
      </div>

      {/* Main Review Register Table / Cards */}
      <div className="space-y-4">
        {sortedAndFilteredCases.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl w-fit mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">No Review Records Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Try adjusting your review filters or search terms. You can review any case by clicking "Edit Case & Dates" in the supervision portal.
            </p>
            <button
              onClick={() => setFilters(DEFAULT_REVIEW_FILTERS)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Clear All Review Filters
            </button>
          </div>
        ) : (
          sortedAndFilteredCases.map((c) => {
            const reviewCount = c.noOfReviews ?? (c.caseReviewDates?.length || 0);
            const isSR = c.designation === 'SR';
            const lastRevDate = c.lastCaseReviewDate || (c.caseReviewDates && c.caseReviewDates[c.caseReviewDates.length - 1]);

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition p-4 sm:p-5 space-y-4"
              >
                {/* Header Row: FIR Info, PS, Badge, Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      FIR No. {c.firNumber}
                    </span>
                    <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                      {c.ps} PS
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase ${
                      isSR
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        : 'bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                    }`}>
                      {isSR ? '⭐ SR Case' : '👮 NON-SR'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      c.status === 'Disposed'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300'
                        : 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Review Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {onOpenQRCode && (
                      <button
                        type="button"
                        onClick={() => onOpenQRCode(c)}
                        className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1 cursor-pointer"
                        title="Generate Field QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">QR Code</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onViewCase(c)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Dossier</span>
                    </button>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => onEditCase(c)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update Review Data</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid of Key Case Attributes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">FIR Date</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {formatReadableDate(c.firDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">IO Assigned</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{c.ioName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Sections / Acts</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{c.sections}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Last Review Date</span>
                    <span className="font-extrabold text-purple-700 dark:text-purple-300">
                      {lastRevDate ? formatReadableDate(lastRevDate) : 'Pending Review'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Review Count</span>
                    <span className="font-black text-slate-900 dark:text-white">{reviewCount} Reviews</span>
                  </div>
                </div>

                {/* Review Parameters Badges Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
                  
                  {/* Block 1: Forensics & Medical */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-purple-900 dark:text-purple-300 block flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <HeartPulse className="w-3.5 h-3.5 text-purple-500" />
                        <span>Medical & FSL Forensics</span>
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {c.isInjuryPresent ? (
                        <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold px-1.5 py-0.5 rounded">
                          🩸 Injury ({c.injuryReportReceived ? 'Rep Recvd' : 'Rep Pending'})
                        </span>
                      ) : (
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                          No Injury
                        </span>
                      )}

                      {c.pmReportReceived && (
                        <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                          ✓ PM Recvd
                        </span>
                      )}

                      {c.visceraPreserved && (
                        <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                          🧪 Viscera
                        </span>
                      )}

                      {c.fslVisitedPO && (
                        <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
                          ✓ FSL Visited PO
                        </span>
                      )}

                      {c.fslItemPreservedName && (
                        <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
                          📦 Item: {c.fslItemPreservedName}
                        </span>
                      )}

                      {c.fslReportReceived ? (
                        <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                          ✓ FSL Report Done
                        </span>
                      ) : c.fslItemPreservedName ? (
                        <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold px-1.5 py-0.5 rounded">
                          ✕ FSL Report Pending
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Block 2: Accused, Arrests, Notice & Bail */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-indigo-900 dark:text-indigo-300 block flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Accused & Arrests Pipeline</span>
                      </span>
                    </span>
                    <div className="space-y-1 text-[11px]">
                      {c.pendingForArrest || (c.pendingArrestCount && c.pendingArrestCount > 0) ? (
                        <div className="text-rose-600 dark:text-rose-400 font-extrabold flex items-start gap-1">
                          <UserX className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            Pending Arrest: <strong>{c.pendingArrestCount || 1}</strong>
                            {c.pendingArrestNames && ` (${c.pendingArrestNames})`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">No pending arrests recorded</span>
                      )}

                      <div className="flex flex-wrap gap-1 pt-1">
                        {(c.anyPersonArrested || (c.arrestedCount && c.arrestedCount > 0)) && (
                          <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            👮 Arrested: {c.arrestedCount || 1} {c.arrestedNames ? `(${c.arrestedNames})` : ''}
                          </span>
                        )}

                        {(c.anyPersonServedNotice || (c.noticeServedCount && c.noticeServedCount > 0)) && (
                          <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            📄 41A Notice: {c.noticeServedCount || 1}
                          </span>
                        )}

                        {(c.anyPersonOnBailOrSurrendered || (c.bailSurrenderedCount && c.bailSurrenderedCount > 0)) && (
                          <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            ⚖️ Bail/Surr: {c.bailSurrenderedCount || 1}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Block 3: Girl / Boy Recovery */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-300 block flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <HeartPulse className="w-3.5 h-3.5 text-amber-500" />
                        <span>Girl / Boy Recovery</span>
                      </span>
                    </span>
                    <div className="space-y-1 text-[11px]">
                      {c.isVictimRecoveryCase ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              c.victimRecovered
                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300'
                            }`}>
                              {c.victimRecovered ? '✓ Recovered' : '✕ Pending Recovery'}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {c.victimAgeType === 'minor' ? '👶 Minor' : '🧑 Major'} ({c.victimCount || 1} Person)
                            </span>
                          </div>
                          {c.victimRecoveryDate && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                              Recovered on: {formatReadableDate(c.victimRecoveryDate)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">Not a girl/boy recovery case</span>
                      )}
                    </div>
                  </div>

                  {/* Block 4: Special Acts, Forensics & Target */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-emerald-900 dark:text-emerald-300 block flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Special Acts & Digital</span>
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {c.isArmsCase && (
                        <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                          🔫 Arms ({c.armsReportReceived ? 'Rep Recvd' : c.armsSentForVerification ? 'Sent Verif' : 'Pending'})
                        </span>
                      )}

                      {c.isLiquorCase && (
                        <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                          🍾 Liquor ({c.liquorLabReportReceived ? 'Lab Done' : 'Lab Pending'})
                        </span>
                      )}

                      {c.isNdpsCase && (
                        <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
                          💊 NDPS ({c.ndpsExhibitSentToSafeHouse ? 'Safe House ✓' : 'Safe House ✕'})
                        </span>
                      )}

                      {c.poVideographyDone && (
                        <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
                          📹 PO Video ✓
                        </span>
                      )}

                      {c.poPreserved && (
                        <span className="bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300 font-bold px-1.5 py-0.5 rounded">
                          🛡️ PO Preserved ✓
                        </span>
                      )}

                      {c.sidLinkedWithFir && (
                        <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded">
                          🔗 SID Linked
                        </span>
                      )}

                      {c.targetDisposalDate && (
                        <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 font-bold px-1.5 py-0.5 rounded">
                          🎯 Target: {formatReadableDate(c.targetDisposalDate)}
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Other Reasons / Directives Preview */}
                {(c.otherPendingReasons || c.sdpoSupervisionNote) && (
                  <div className="bg-purple-50/50 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-200/80 dark:border-purple-900/60 text-xs flex flex-col sm:flex-row items-start justify-between gap-2">
                    {c.otherPendingReasons && (
                      <div>
                        <span className="font-bold text-rose-800 dark:text-rose-300 block text-[10px] uppercase">
                          Reason for Pending:
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-medium">{c.otherPendingReasons}</p>
                      </div>
                    )}
                    {c.sdpoSupervisionNote && (
                      <div>
                        <span className="font-bold text-purple-800 dark:text-purple-300 block text-[10px] uppercase">
                          SDPO Supervision Directive:
                        </span>
                        <p className="text-purple-900 dark:text-purple-200 font-medium italic">"{c.sdpoSupervisionNote}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
