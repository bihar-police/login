import React, { useState, useEffect, useMemo } from 'react';
import {
  FIRCase,
  CaseStatus,
  CaseDesignation,
  UserRole,
  InvestigatingOfficer,
  PoliceStationName,
  PunishmentTerm,
  PoliceStation,
  PoliceDistrict,
  PoliceSubdivision,
  UserAccount,
  ReviewStatus,
  CrimeHead,
} from '../types';
import { INITIAL_POLICE_STATIONS } from '../data/mockData';
import { getDeadlineInfo, formatReadableDate, getPSFromRole, normalizeReviewStatus } from '../utils/helpers';
import {
  CRIME_HEADS_CONFIG,
  ALL_CRIME_HEADS,
  classifyCrimeHead,
  classifyAllCrimeHeads,
  getCaseCrimeHeads,
  getDynamicCrimeHeadsConfig,
} from '../utils/crimeClassifier';
import {
  X,
  Shield,
  Save,
  Clock,
  FileText,
  AlertTriangle,
  Trash2,
  Scale,
  CheckCircle2,
  HeartPulse,
  Users,
  Crosshair,
  Wine,
  Pill,
  Camera,
  FolderArchive,
  Calendar,
  Sparkles,
  Check,
  UserCheck,
  UserX,
  Target,
  ArrowRight,
} from 'lucide-react';

// =========================================================================
// REUSABLE TOGGLE COMPONENTS FOR CASE REVIEWS
// =========================================================================

/**
 * QuestionYesNo: Binary [ Yes ] [ No ] control for questions (e.g. Is this case related to Arms Act?)
 */
interface QuestionYesNoProps {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
  icon?: React.ReactNode;
  subtitle?: string;
  badge?: string;
  disabled?: boolean;
}

export const QuestionYesNo: React.FC<QuestionYesNoProps> = ({
  label,
  value,
  onChange,
  icon,
  subtitle,
  badge,
  disabled = false,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-600">
    <div className="flex items-start sm:items-center gap-2">
      {icon && <div className="mt-0.5 sm:mt-0 text-slate-600 dark:text-slate-400">{icon}</div>}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{label}</span>
          {badge && (
            <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 text-[10px] px-1.5 py-0.2 rounded font-bold">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{subtitle}</div>}
      </div>
    </div>
    <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`px-3 py-1 rounded-md font-black text-xs transition cursor-pointer flex items-center gap-1 ${
          value === true
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span>Yes</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`px-3 py-1 rounded-md font-black text-xs transition cursor-pointer flex items-center gap-1 ${
          value === false
            ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span>No</span>
      </button>
    </div>
  </div>
);

/**
 * ReviewTriOption: Tri-State [ Yes ] [ Pending ] [ NA ] control for review progress fields
 */
interface ReviewTriOptionProps {
  label: string;
  value: ReviewStatus;
  onChange: (val: ReviewStatus) => void;
  icon?: React.ReactNode;
  subtitle?: string;
  disabled?: boolean;
}

export const ReviewTriOption: React.FC<ReviewTriOptionProps> = ({
  label,
  value,
  onChange,
  icon,
  subtitle,
  disabled = false,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-600">
    <div className="flex items-start sm:items-center gap-2">
      {icon && <div className="mt-0.5 sm:mt-0 text-slate-600 dark:text-slate-400">{icon}</div>}
      <div>
        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{label}</div>
        {subtitle && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{subtitle}</div>}
      </div>
    </div>
    <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('YES')}
        className={`px-2.5 py-1 rounded-md font-black text-[11px] transition cursor-pointer ${
          value === 'YES'
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('PENDING')}
        className={`px-2.5 py-1 rounded-md font-black text-[11px] transition cursor-pointer ${
          value === 'PENDING'
            ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-600'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Pending
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('NA')}
        className={`px-2.5 py-1 rounded-md font-black text-[11px] transition cursor-pointer ${
          value === 'NA'
            ? 'bg-slate-600 text-white shadow-sm ring-1 ring-slate-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        NA
      </button>
    </div>
  </div>
);

// =========================================================================
// MAIN MODAL PROPS & COMPONENT
// =========================================================================

interface EditFIRModalProps {
  caseItem: FIRCase | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedCase: FIRCase) => void;
  onDeleteSupervisionNote?: (caseId: string) => void;
  onDeleteCase?: (caseId: string) => void;
  currentRole: UserRole;
  currentUserAccount?: UserAccount | null;
  investigatingOfficers: InvestigatingOfficer[];
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  policeStations?: PoliceStation[];
  isSupervisionMode?: boolean;
  isReadOnly?: boolean;
  availablePoliceStations?: PoliceStation[];
}

type ActiveModalTab = 'case_review' | 'general' | 'supervision_dates';

export const EditFIRModal: React.FC<EditFIRModalProps> = ({
  caseItem,
  isOpen,
  onClose,
  onUpdate,
  onDeleteSupervisionNote,
  onDeleteCase,
  currentRole,
  currentUserAccount,
  investigatingOfficers,
  districts = [],
  subdivisions = [],
  policeStations = [],
  isSupervisionMode = false,
  isReadOnly = false,
  availablePoliceStations,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveModalTab>(
    isSupervisionMode ? 'case_review' : 'case_review'
  );

  const effectivePoliceStations = useMemo(() => {
    if (policeStations && policeStations.length > 0) return policeStations;
    if (availablePoliceStations && availablePoliceStations.length > 0) return availablePoliceStations;
    return INITIAL_POLICE_STATIONS;
  }, [policeStations, availablePoliceStations]);

  const psOptions = useMemo(() => {
    const list = effectivePoliceStations.map((p) => p.name);
    if (caseItem?.ps && !list.includes(caseItem.ps)) {
      list.unshift(caseItem.ps);
    }
    return Array.from(new Set(list));
  }, [effectivePoliceStations, caseItem]);

  const isDistrictLevel = currentRole === 'SP' || currentRole === 'DISTRICT_ADMIN';
  const isSuperUser = currentRole === 'SDPO' || isDistrictLevel;
  const isCircleInspector = currentRole === 'CI';
  const activePS = getPSFromRole(currentRole);

  // Filter IOs to match current PS context or all if SDPO
  const availableIOs = isSuperUser || isCircleInspector
    ? investigatingOfficers
    : investigatingOfficers.filter((io) => io.ps === (activePS || caseItem?.ps) || io.ps === 'Subdivision HQ');

  // Form Fields State - General
  const [ps, setPs] = useState<PoliceStationName>(caseItem?.ps || 'Tarapur');
  const [firNumber, setFirNumber] = useState(caseItem?.firNumber || '');
  const [firDate, setFirDate] = useState(caseItem?.firDate || '');
  const [deadlineDays, setDeadlineDays] = useState<60 | 90>(caseItem?.deadlineDays || 60);
  const [punishmentTerm, setPunishmentTerm] = useState<PunishmentTerm>(caseItem?.punishmentTerm || '7_years_or_more');
  const [sections, setSections] = useState(caseItem?.sections || '');
  const [selectedCrimeHeads, setSelectedCrimeHeads] = useState<CrimeHead[]>(() => {
    return caseItem ? getCaseCrimeHeads(caseItem) : ['Other / General IPC & BNS'];
  });
  const [isCrimeHeadManuallySet, setIsCrimeHeadManuallySet] = useState(
    Boolean(caseItem?.crimeHeads?.length || (caseItem?.crimeHead && caseItem.crimeHead !== 'Other / General IPC & BNS'))
  );
  const [addHeadSelectValue, setAddHeadSelectValue] = useState('');
  const [complainantName, setComplainantName] = useState(caseItem?.complainantName || '');
  const [complainantPhone, setComplainantPhone] = useState(caseItem?.complainantPhone || '');
  const [placeOfOccurrence, setPlaceOfOccurrence] = useState(caseItem?.placeOfOccurrence || '');

  const [status, setStatus] = useState<CaseStatus>(caseItem?.status || 'Under Investigation');
  const [disposedDate, setDisposedDate] = useState(caseItem?.disposedDate || '');
  const [disposalType, setDisposalType] = useState(caseItem?.disposalType || 'Disposed');
  const [disposalRemarks, setDisposalRemarks] = useState(caseItem?.disposalRemarks || '');
  const [designation, setDesignation] = useState<CaseDesignation>(caseItem?.designation || 'PENDING_DESIGNATION');
  const [ioName, setIoName] = useState(caseItem?.ioName || '');
  const [chargesheetNumber, setChargesheetNumber] = useState(caseItem?.chargesheetNumber || '');
  const [chargesheetDate, setChargesheetDate] = useState(caseItem?.chargesheetDate || '');
  const [chargesheetUploadedCCTNS, setChargesheetUploadedCCTNS] = useState<boolean>(Boolean(caseItem?.chargesheetUploadedCCTNS));
  
  const [caseDiaryUploadedCCTNS, setCaseDiaryUploadedCCTNS] = useState<boolean>(Boolean(caseItem?.caseDiaryUploadedCCTNS));
  const [lastCaseDiaryNo, setLastCaseDiaryNo] = useState(caseItem?.lastCaseDiaryNo || '');
  const [lastCaseDiaryDate, setLastCaseDiaryDate] = useState(caseItem?.lastCaseDiaryDate || '');

  // Supervision Notes & Dates
  const [sdpoNote, setSdpoNote] = useState(caseItem?.sdpoSupervisionNote || '');
  const [ciNote, setCiNote] = useState(caseItem?.ciSupervisionNote || '');
  const [psProgressRemarks, setPsProgressRemarks] = useState(caseItem?.psProgressRemarks || '');
  const [poVisitDate, setPoVisitDate] = useState(caseItem?.poVisitDate || '');
  const [supervisionDate, setSupervisionDate] = useState(caseItem?.supervisionDate || '');
  const [prDates, setPrDates] = useState<string[]>(caseItem?.prDates || []);
  const [finalPrDate, setFinalPrDate] = useState(caseItem?.finalPrDate || '');
  const [caseReviewDates, setCaseReviewDates] = useState<string[]>(caseItem?.caseReviewDates || []);
  const [newPrDateInput, setNewPrDateInput] = useState('');
  const [newReviewDateInput, setNewReviewDateInput] = useState('');

  // Comprehensive Case Review Parameters
  // Default parameter for review should be NA wherever applicable
  const initialIsDisposed = caseItem?.status === 'Disposed';

  // Helper to resolve initial review parameter: defaults to NA, if disposed & was pending -> auto YES
  const getInitialReviewStatus = (val: any): ReviewStatus => {
    const normalized = normalizeReviewStatus(val, 'NA');
    if (initialIsDisposed && normalized === 'PENDING') return 'YES';
    return normalized;
  };

  // 1. Injury & Medical / FSL
  const [isInjuryPresent, setIsInjuryPresent] = useState<boolean>(Boolean(caseItem?.isInjuryPresent));
  const [injuryReportReceived, setInjuryReportReceived] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.injuryReportReceived));
  const [pmReportReceived, setPmReportReceived] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.pmReportReceived));
  const [visceraPreserved, setVisceraPreserved] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.visceraPreserved));
  const [fslVisitedPO, setFslVisitedPO] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.fslVisitedPO));
  const [fslItemPreservedName, setFslItemPreservedName] = useState<string>(caseItem?.fslItemPreservedName || '');
  const [fslItemSentOrPermissionTaken, setFslItemSentOrPermissionTaken] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.fslItemSentOrPermissionTaken));
  const [fslReportReceived, setFslReportReceived] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.fslReportReceived));

  // 2. Accused Tracking, Arrests, Notice 41A, Bail & Surrender
  const [pendingForArrest, setPendingForArrest] = useState<boolean>(Boolean(caseItem?.pendingForArrest || (caseItem?.pendingArrestCount && caseItem.pendingArrestCount > 0)));
  const [pendingArrestCount, setPendingArrestCount] = useState<number>(caseItem?.pendingArrestCount || (caseItem?.pendingForArrest ? 1 : 0));
  const [pendingArrestNames, setPendingArrestNames] = useState<string>(caseItem?.pendingArrestNames || '');

  const [anyPersonArrested, setAnyPersonArrested] = useState<boolean>(Boolean(caseItem?.anyPersonArrested || (caseItem?.arrestedCount && caseItem.arrestedCount > 0)));
  const [arrestedCount, setArrestedCount] = useState<number>(caseItem?.arrestedCount || (caseItem?.anyPersonArrested ? 1 : 0));
  const [arrestedNames, setArrestedNames] = useState<string>(caseItem?.arrestedNames || '');

  const [anyPersonServedNotice, setAnyPersonServedNotice] = useState<boolean>(Boolean(caseItem?.anyPersonServedNotice || (caseItem?.noticeServedCount && caseItem.noticeServedCount > 0)));
  const [noticeServedCount, setNoticeServedCount] = useState<number>(caseItem?.noticeServedCount || (caseItem?.anyPersonServedNotice ? 1 : 0));
  const [noticeServedNames, setNoticeServedNames] = useState<string>(caseItem?.noticeServedNames || '');

  const [anyPersonOnBailOrSurrendered, setAnyPersonOnBailOrSurrendered] = useState<boolean>(Boolean(caseItem?.anyPersonOnBailOrSurrendered || (caseItem?.bailSurrenderedCount && caseItem.bailSurrenderedCount > 0)));
  const [bailSurrenderedCount, setBailSurrenderedCount] = useState<number>(caseItem?.bailSurrenderedCount || (caseItem?.anyPersonOnBailOrSurrendered ? 1 : 0));
  const [bailSurrenderedNames, setBailSurrenderedNames] = useState<string>(caseItem?.bailSurrenderedNames || '');

  const [otherPendingReasons, setOtherPendingReasons] = useState<string>(caseItem?.otherPendingReasons || '');

  // 3. Recovery of Girl / Boy (POCSO / Kidnapping / Missing)
  const [isVictimRecoveryCase, setIsVictimRecoveryCase] = useState<boolean>(Boolean(caseItem?.isVictimRecoveryCase));
  const [victimCount, setVictimCount] = useState<number>(caseItem?.victimCount || (caseItem?.isVictimRecoveryCase ? 1 : 0));
  const [victimAgeType, setVictimAgeType] = useState<'minor' | 'major'>(caseItem?.victimAgeType || 'minor');
  const [victimRecovered, setVictimRecovered] = useState<boolean>(
    Boolean(caseItem?.victimRecovered || (initialIsDisposed && caseItem?.isVictimRecoveryCase))
  );
  const [victimRecoveryDate, setVictimRecoveryDate] = useState<string>(
    caseItem?.victimRecoveryDate || (initialIsDisposed && caseItem?.isVictimRecoveryCase ? caseItem.disposedDate || '' : '')
  );
  const [victimRecoveryDetails, setVictimRecoveryDetails] = useState<string>(caseItem?.victimRecoveryDetails || '');

  // 4. Arms Act Case
  const [isArmsCase, setIsArmsCase] = useState<boolean>(Boolean(caseItem?.isArmsCase));
  const [armsSentForVerification, setArmsSentForVerification] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.armsSentForVerification));
  const [armsReportReceived, setArmsReportReceived] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.armsReportReceived));

  // 5. Liquor / Excise Prohibition Case
  const [isLiquorCase, setIsLiquorCase] = useState<boolean>(Boolean(caseItem?.isLiquorCase));
  const [liquorSentToLab, setLiquorSentToLab] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.liquorSentToLab));
  const [liquorLabReportReceived, setLiquorLabReportReceived] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.liquorLabReportReceived));
  const [confiscationOfLiquor, setConfiscationOfLiquor] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.confiscationOfLiquor));
  const [liquorVehicleSeized, setLiquorVehicleSeized] = useState<boolean>(Boolean(caseItem?.liquorVehicleSeized));
  const [vehicleVerifiedRTO, setVehicleVerifiedRTO] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.vehicleVerifiedRTO));
  const [vehicleRajsatStatus, setVehicleRajsatStatus] = useState<string>(
    typeof caseItem?.vehicleRajsatStatus === 'string'
      ? caseItem.vehicleRajsatStatus
      : caseItem?.vehicleRajsatStatus
      ? 'Yes'
      : ''
  );

  // 6. NDPS (Narcotics)
  const [isNdpsCase, setIsNdpsCase] = useState<boolean>(Boolean(caseItem?.isNdpsCase));
  const [ndpsSampleSentToLab, setNdpsSampleSentToLab] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.ndpsSampleSentToLab));
  const [ndpsLabReportReceived, setNdpsLabReportReceived] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.ndpsLabReportReceived));
  const [ndpsExhibitSentToSafeHouse, setNdpsExhibitSentToSafeHouse] = useState<ReviewStatus>(getInitialReviewStatus(caseItem?.ndpsExhibitSentToSafeHouse));

  // 7. Forensics, Digital & Metrics (strictly manual, untouched by auto cascade)
  const [totalCdUploaded, setTotalCdUploaded] = useState<number>(caseItem?.totalCdUploaded ?? (caseItem?.lastCaseDiaryNo ? parseInt(caseItem.lastCaseDiaryNo) || 1 : 0));
  const [poPreserved, setPoPreserved] = useState<ReviewStatus>(normalizeReviewStatus(caseItem?.poPreserved, 'NA'));
  const [poVideographyDone, setPoVideographyDone] = useState<ReviewStatus>(normalizeReviewStatus(caseItem?.poVideographyDone, 'NA'));
  const [totalSidCreated, setTotalSidCreated] = useState<number>(caseItem?.totalSidCreated || 0);
  const [sidLinkedWithFir, setSidLinkedWithFir] = useState<ReviewStatus>(normalizeReviewStatus(caseItem?.sidLinkedWithFir, 'NA'));
  const [targetDisposalDate, setTargetDisposalDate] = useState<string>(caseItem?.targetDisposalDate || '');
  const [targetRemarks, setTargetRemarks] = useState<string>(caseItem?.targetRemarks || '');
  const [lastCaseReviewDate, setLastCaseReviewDate] = useState<string>(caseItem?.lastCaseReviewDate || '');

  // Sync state when caseItem changes
  useEffect(() => {
    if (caseItem) {
      const isCaseDisposed = caseItem.status === 'Disposed';
      const getStatusVal = (val: any): ReviewStatus => {
        const normalized = normalizeReviewStatus(val, 'NA');
        if (isCaseDisposed && normalized === 'PENDING') return 'YES';
        return normalized;
      };

      setPs(caseItem.ps);
      setFirNumber(caseItem.firNumber);
      setFirDate(caseItem.firDate);
      setDeadlineDays(caseItem.deadlineDays);
      setPunishmentTerm(caseItem.punishmentTerm || '7_years_or_more');
      setSections(caseItem.sections);
      setSelectedCrimeHeads(getCaseCrimeHeads(caseItem));
      setIsCrimeHeadManuallySet(Boolean(caseItem.crimeHeads?.length || (caseItem.crimeHead && caseItem.crimeHead !== 'Other / General IPC & BNS')));
      setComplainantName(caseItem.complainantName);
      setComplainantPhone(caseItem.complainantPhone || '');
      setPlaceOfOccurrence(caseItem.placeOfOccurrence);
      setStatus(caseItem.status);
      setDisposedDate(caseItem.disposedDate || '');
      setDisposalType(caseItem.disposalType || 'Disposed');
      setDisposalRemarks(caseItem.disposalRemarks || '');
      setDesignation(caseItem.designation);
      setIoName(caseItem.ioName);
      setChargesheetNumber(caseItem.chargesheetNumber || '');
      setChargesheetDate(caseItem.chargesheetDate || '');
      setChargesheetUploadedCCTNS(Boolean(caseItem.chargesheetUploadedCCTNS));
      setCaseDiaryUploadedCCTNS(Boolean(caseItem.caseDiaryUploadedCCTNS));
      setLastCaseDiaryNo(caseItem.lastCaseDiaryNo || '');
      setLastCaseDiaryDate(caseItem.lastCaseDiaryDate || '');
      setPsProgressRemarks(caseItem.psProgressRemarks || '');
      setSdpoNote(caseItem.sdpoSupervisionNote || '');
      setCiNote(caseItem.ciSupervisionNote || '');
      setPoVisitDate(caseItem.poVisitDate || '');
      setSupervisionDate(caseItem.supervisionDate || '');
      setPrDates(caseItem.prDates || []);
      setFinalPrDate(caseItem.finalPrDate || '');
      setCaseReviewDates(caseItem.caseReviewDates || []);

      // Case Review Fields - Default is NA, pending in disposed becomes YES
      setIsInjuryPresent(Boolean(caseItem.isInjuryPresent));
      setInjuryReportReceived(getStatusVal(caseItem.injuryReportReceived));
      setPmReportReceived(getStatusVal(caseItem.pmReportReceived));
      setVisceraPreserved(getStatusVal(caseItem.visceraPreserved));
      setFslVisitedPO(getStatusVal(caseItem.fslVisitedPO));
      setFslItemPreservedName(caseItem.fslItemPreservedName || '');
      setFslItemSentOrPermissionTaken(getStatusVal(caseItem.fslItemSentOrPermissionTaken));
      setFslReportReceived(getStatusVal(caseItem.fslReportReceived));

      setPendingForArrest(Boolean(caseItem.pendingForArrest || (caseItem.pendingArrestCount && caseItem.pendingArrestCount > 0)));
      setPendingArrestCount(caseItem.pendingArrestCount || (caseItem.pendingForArrest ? 1 : 0));
      setPendingArrestNames(caseItem.pendingArrestNames || '');

      setAnyPersonArrested(Boolean(caseItem.anyPersonArrested || (caseItem.arrestedCount && caseItem.arrestedCount > 0)));
      setArrestedCount(caseItem.arrestedCount || (caseItem.anyPersonArrested ? 1 : 0));
      setArrestedNames(caseItem.arrestedNames || '');

      setAnyPersonServedNotice(Boolean(caseItem.anyPersonServedNotice || (caseItem.noticeServedCount && caseItem.noticeServedCount > 0)));
      setNoticeServedCount(caseItem.noticeServedCount || (caseItem.anyPersonServedNotice ? 1 : 0));
      setNoticeServedNames(caseItem.noticeServedNames || '');

      setAnyPersonOnBailOrSurrendered(Boolean(caseItem.anyPersonOnBailOrSurrendered || (caseItem.bailSurrenderedCount && caseItem.bailSurrenderedCount > 0)));
      setBailSurrenderedCount(caseItem.bailSurrenderedCount || (caseItem.anyPersonOnBailOrSurrendered ? 1 : 0));
      setBailSurrenderedNames(caseItem.bailSurrenderedNames || '');

      setOtherPendingReasons(caseItem.otherPendingReasons || '');

      const isVictimRec = Boolean(caseItem.isVictimRecoveryCase);
      setIsVictimRecoveryCase(isVictimRec);
      setVictimCount(caseItem.victimCount || (isVictimRec ? 1 : 0));
      setVictimAgeType(caseItem.victimAgeType || 'minor');
      if (isVictimRec && isCaseDisposed) {
        setVictimRecovered(true);
        setVictimRecoveryDate(caseItem.victimRecoveryDate || caseItem.disposedDate || '');
      } else {
        setVictimRecovered(Boolean(caseItem.victimRecovered));
        setVictimRecoveryDate(caseItem.victimRecoveryDate || '');
      }
      setVictimRecoveryDetails(caseItem.victimRecoveryDetails || '');

      setIsArmsCase(Boolean(caseItem.isArmsCase));
      setArmsSentForVerification(getStatusVal(caseItem.armsSentForVerification));
      setArmsReportReceived(getStatusVal(caseItem.armsReportReceived));

      setIsLiquorCase(Boolean(caseItem.isLiquorCase));
      setLiquorSentToLab(getStatusVal(caseItem.liquorSentToLab));
      setLiquorLabReportReceived(getStatusVal(caseItem.liquorLabReportReceived));
      setConfiscationOfLiquor(getStatusVal(caseItem.confiscationOfLiquor));
      setLiquorVehicleSeized(Boolean(caseItem.liquorVehicleSeized));
      setVehicleVerifiedRTO(getStatusVal(caseItem.vehicleVerifiedRTO));
      setVehicleRajsatStatus(
        typeof caseItem.vehicleRajsatStatus === 'string'
          ? caseItem.vehicleRajsatStatus
          : caseItem.vehicleRajsatStatus
          ? 'Yes'
          : ''
      );

      setIsNdpsCase(Boolean(caseItem.isNdpsCase));
      setNdpsSampleSentToLab(getStatusVal(caseItem.ndpsSampleSentToLab));
      setNdpsLabReportReceived(getStatusVal(caseItem.ndpsLabReportReceived));
      setNdpsExhibitSentToSafeHouse(getStatusVal(caseItem.ndpsExhibitSentToSafeHouse));

      setTotalCdUploaded(caseItem.totalCdUploaded ?? (caseItem.lastCaseDiaryNo ? parseInt(caseItem.lastCaseDiaryNo) || 1 : 0));
      setPoPreserved(normalizeReviewStatus(caseItem.poPreserved, 'NA'));
      setPoVideographyDone(normalizeReviewStatus(caseItem.poVideographyDone, 'NA'));
      setTotalSidCreated(caseItem.totalSidCreated || 0);
      setSidLinkedWithFir(normalizeReviewStatus(caseItem.sidLinkedWithFir, 'NA'));
      setTargetDisposalDate(caseItem.targetDisposalDate || '');
      setTargetRemarks(caseItem.targetRemarks || '');
      setLastCaseReviewDate(caseItem.lastCaseReviewDate || '');
    }
  }, [caseItem, isOpen]);

  // Automated cascading logic based on user interactions
  const handleStatusChange = (newStatus: CaseStatus) => {
    setStatus(newStatus);
    if (newStatus === 'Disposed') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (!disposedDate) setDisposedDate(todayStr);

      // When a case is marked as or switched to Disposed, all tri-state review parameters
      // if it is pending mark it yes automatically. If NA do not make any change automatically.
      if (injuryReportReceived === 'PENDING') setInjuryReportReceived('YES');
      if (pmReportReceived === 'PENDING') setPmReportReceived('YES');
      if (visceraPreserved === 'PENDING') setVisceraPreserved('YES');
      if (fslVisitedPO === 'PENDING') setFslVisitedPO('YES');
      if (fslItemSentOrPermissionTaken === 'PENDING') setFslItemSentOrPermissionTaken('YES');
      if (fslReportReceived === 'PENDING') setFslReportReceived('YES');
      if (armsSentForVerification === 'PENDING') setArmsSentForVerification('YES');
      if (armsReportReceived === 'PENDING') setArmsReportReceived('YES');
      if (liquorSentToLab === 'PENDING') setLiquorSentToLab('YES');
      if (liquorLabReportReceived === 'PENDING') setLiquorLabReportReceived('YES');
      if (confiscationOfLiquor === 'PENDING') setConfiscationOfLiquor('YES');
      if (vehicleVerifiedRTO === 'PENDING') setVehicleVerifiedRTO('YES');
      if (ndpsSampleSentToLab === 'PENDING') setNdpsSampleSentToLab('YES');
      if (ndpsLabReportReceived === 'PENDING') setNdpsLabReportReceived('YES');
      if (ndpsExhibitSentToSafeHouse === 'PENDING') setNdpsExhibitSentToSafeHouse('YES');

      // For Recovery of Girl / Boy (POCSO / Kidnapping / Missing) if it is yes:
      // when case is disposed automatically transfer to recovered.
      if (isVictimRecoveryCase) {
        setVictimRecovered(true);
        if (!victimRecoveryDate) {
          setVictimRecoveryDate(disposedDate || todayStr);
        }
      }
    }
  };

  const handleInjuryToggle = (val: boolean) => {
    setIsInjuryPresent(val);
  };

  const handleFslVisitedPOChange = (val: ReviewStatus) => {
    setFslVisitedPO(val);
  };

  const handleFslItemSentChange = (val: ReviewStatus) => {
    setFslItemSentOrPermissionTaken(val);
  };

  const handleFslItemPreservedNameChange = (val: string) => {
    setFslItemPreservedName(val);
  };

  const handleVictimRecoveryCaseToggle = (val: boolean) => {
    setIsVictimRecoveryCase(val);
    if (val) {
      if (!victimCount || victimCount <= 0) setVictimCount(1);
      if (status === 'Disposed') {
        setVictimRecovered(true);
        if (!victimRecoveryDate) {
          setVictimRecoveryDate(disposedDate || new Date().toISOString().split('T')[0]);
        }
      }
    }
  };

  const handleArmsCaseToggle = (val: boolean) => {
    setIsArmsCase(val);
  };

  const handleLiquorCaseToggle = (val: boolean) => {
    setIsLiquorCase(val);
  };

  const handleLiquorVehicleSeizedToggle = (val: boolean) => {
    setLiquorVehicleSeized(val);
  };

  const handleNdpsCaseToggle = (val: boolean) => {
    setIsNdpsCase(val);
  };

  const deadline = getDeadlineInfo({ ...caseItem, firDate, deadlineDays, status });

  const handleAddPrDate = () => {
    if (!newPrDateInput) return;
    if (!prDates.includes(newPrDateInput)) {
      setPrDates([...prDates, newPrDateInput].sort());
    }
    setNewPrDateInput('');
  };

  const handleRemovePrDate = (dateToRemove: string) => {
    setPrDates(prDates.filter((d) => d !== dateToRemove));
  };

  const handleAddReviewDate = () => {
    if (!newReviewDateInput) return;
    if (!caseReviewDates.includes(newReviewDateInput)) {
      const updatedDates = [...caseReviewDates, newReviewDateInput].sort();
      setCaseReviewDates(updatedDates);
      setLastCaseReviewDate(newReviewDateInput);
    }
    setNewReviewDateInput('');
  };

  const handleRemoveReviewDate = (dateToRemove: string) => {
    const updated = caseReviewDates.filter((d) => d !== dateToRemove);
    setCaseReviewDates(updated);
    if (updated.length > 0) {
      setLastCaseReviewDate(updated[updated.length - 1]);
    } else {
      setLastCaseReviewDate('');
    }
  };

  const handleTransferToRecovered = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setVictimRecovered(true);
    setVictimRecoveryDate(todayStr);
  };

  const handleToggleOrAddHead = (headToAdd: CrimeHead) => {
    if (!headToAdd) return;
    setIsCrimeHeadManuallySet(true);
    setSelectedCrimeHeads((prev) => {
      const withoutOther = prev.filter((h) => h !== 'Other / General IPC & BNS');
      if (withoutOther.includes(headToAdd)) {
        const next = withoutOther.filter((h) => h !== headToAdd);
        return next.length > 0 ? next : ['Other / General IPC & BNS'];
      }
      return [...withoutOther, headToAdd];
    });
    setAddHeadSelectValue('');
  };

  const handleRemoveHead = (headToRemove: CrimeHead) => {
    setIsCrimeHeadManuallySet(true);
    setSelectedCrimeHeads((prev) => {
      const next = prev.filter((h) => h !== headToRemove);
      return next.length > 0 ? next : ['Other / General IPC & BNS'];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!caseItem) return;

    if (isReadOnly) {
      alert('Permission Denied: Your account has Read-Only (VIEWER) permissions. You cannot edit case records.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const computedReviewDates = caseReviewDates;
    const computedLastReview = lastCaseReviewDate || (computedReviewDates.length > 0 ? computedReviewDates[computedReviewDates.length - 1] : undefined);
    const finalizeDisposedStatus = (val: ReviewStatus): ReviewStatus => (status === 'Disposed' && val === 'PENDING' ? 'YES' : val);

    const effectiveHeads = selectedCrimeHeads.length > 0 ? selectedCrimeHeads : ['Other / General IPC & BNS'];
    const primaryHead = effectiveHeads[0];

    const updated: FIRCase = {
      ...caseItem,
      ps,
      firNumber: firNumber.trim(),
      firDate,
      deadlineDays,
      punishmentTerm,
      sections: sections.trim(),
      crimeHead: primaryHead,
      crimeHeads: effectiveHeads,
      complainantName: complainantName.trim(),
      complainantPhone: complainantPhone.trim() || undefined,
      placeOfOccurrence: placeOfOccurrence.trim(),
      status,
      disposedDate: status === 'Disposed' ? (disposedDate || todayStr) : undefined,
      disposalType: status === 'Disposed' ? disposalType : undefined,
      disposalRemarks: status === 'Disposed' ? disposalRemarks.trim() || undefined : undefined,
      designation: isSuperUser ? designation : caseItem.designation,
      ioName,
      chargesheetNumber: chargesheetNumber.trim() || undefined,
      chargesheetDate: chargesheetDate || undefined,
      chargesheetUploadedCCTNS,
      chargesheetCCTNSDate: chargesheetUploadedCCTNS ? (caseItem.chargesheetCCTNSDate || todayStr) : undefined,
      caseDiaryUploadedCCTNS,
      lastCaseDiaryNo: lastCaseDiaryNo.trim() || undefined,
      lastCaseDiaryDate: lastCaseDiaryDate || undefined,
      poVisitDate: poVisitDate || undefined,
      supervisionDate: supervisionDate || undefined,
      prDates: prDates.length > 0 ? prDates : undefined,
      finalPrDate: finalPrDate || undefined,
      caseReviewDates: computedReviewDates.length > 0 ? computedReviewDates : undefined,
      sdpoSupervisionNote: sdpoNote.trim() || undefined,
      ciSupervisionNote: ciNote.trim() || undefined,
      psProgressRemarks: psProgressRemarks.trim() || undefined,

      // Comprehensive Review Parameters
      isInjuryPresent,
      injuryReportReceived: isInjuryPresent ? finalizeDisposedStatus(injuryReportReceived) : 'NA',
      pmReportReceived: isInjuryPresent ? finalizeDisposedStatus(pmReportReceived) : 'NA',
      visceraPreserved: isInjuryPresent ? finalizeDisposedStatus(visceraPreserved) : 'NA',
      fslVisitedPO: finalizeDisposedStatus(fslVisitedPO),
      fslItemPreservedName: fslItemPreservedName.trim() || undefined,
      fslItemSentOrPermissionTaken: finalizeDisposedStatus(fslItemSentOrPermissionTaken),
      fslReportReceived: finalizeDisposedStatus(fslReportReceived),

      pendingForArrest,
      pendingArrestCount: pendingForArrest ? Number(pendingArrestCount || 1) : 0,
      pendingArrestNames: pendingForArrest ? pendingArrestNames.trim() || undefined : undefined,

      anyPersonArrested,
      arrestedCount: anyPersonArrested ? Number(arrestedCount || 1) : 0,
      arrestedNames: anyPersonArrested ? arrestedNames.trim() || undefined : undefined,

      anyPersonServedNotice,
      noticeServedCount: anyPersonServedNotice ? Number(noticeServedCount || 1) : 0,
      noticeServedNames: anyPersonServedNotice ? noticeServedNames.trim() || undefined : undefined,

      anyPersonOnBailOrSurrendered,
      bailSurrenderedCount: anyPersonOnBailOrSurrendered ? Number(bailSurrenderedCount || 1) : 0,
      bailSurrenderedNames: anyPersonOnBailOrSurrendered ? bailSurrenderedNames.trim() || undefined : undefined,

      otherPendingReasons: otherPendingReasons.trim() || undefined,

      isVictimRecoveryCase,
      victimCount: isVictimRecoveryCase ? Number(victimCount || 1) : undefined,
      victimAgeType: isVictimRecoveryCase ? victimAgeType : undefined,
      victimRecovered: isVictimRecoveryCase ? (status === 'Disposed' ? true : victimRecovered) : undefined,
      victimRecoveryDate: isVictimRecoveryCase
        ? status === 'Disposed'
          ? victimRecoveryDate || disposedDate || todayStr
          : victimRecovered
          ? victimRecoveryDate || todayStr
          : undefined
        : undefined,
      victimRecoveryDetails: isVictimRecoveryCase ? victimRecoveryDetails.trim() || undefined : undefined,

      isArmsCase,
      armsSentForVerification: isArmsCase ? finalizeDisposedStatus(armsSentForVerification) : 'NA',
      armsReportReceived: isArmsCase ? finalizeDisposedStatus(armsReportReceived) : 'NA',

      isLiquorCase,
      liquorSentToLab: isLiquorCase ? finalizeDisposedStatus(liquorSentToLab) : 'NA',
      liquorLabReportReceived: isLiquorCase ? finalizeDisposedStatus(liquorLabReportReceived) : 'NA',
      confiscationOfLiquor: isLiquorCase ? finalizeDisposedStatus(confiscationOfLiquor) : 'NA',
      liquorVehicleSeized: isLiquorCase ? liquorVehicleSeized : false,
      vehicleVerifiedRTO: isLiquorCase && liquorVehicleSeized ? finalizeDisposedStatus(vehicleVerifiedRTO) : 'NA',
      vehicleRajsatStatus: isLiquorCase && liquorVehicleSeized ? vehicleRajsatStatus.trim() || undefined : undefined,

      isNdpsCase,
      ndpsSampleSentToLab: isNdpsCase ? finalizeDisposedStatus(ndpsSampleSentToLab) : 'NA',
      ndpsLabReportReceived: isNdpsCase ? finalizeDisposedStatus(ndpsLabReportReceived) : 'NA',
      ndpsExhibitSentToSafeHouse: isNdpsCase ? finalizeDisposedStatus(ndpsExhibitSentToSafeHouse) : 'NA',

      totalCdUploaded: Number(totalCdUploaded || 0),
      poPreserved,
      poVideographyDone,
      totalSidCreated: Number(totalSidCreated || 0),
      sidLinkedWithFir,
      targetDisposalDate: targetDisposalDate || undefined,
      targetRemarks: targetRemarks.trim() || undefined,
      lastCaseReviewDate: computedLastReview,
      noOfReviews: computedReviewDates.length,

      updatedAt: todayStr,
    };

    onUpdate(updated);
    onClose();
  };

  if (!isOpen || !caseItem) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 flex justify-center items-start min-h-screen">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="shrink-0 bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-amber-400">
                  {caseItem.ps} POLICE STATION • CASE DOSSIER & REVIEW
                </span>
                <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                  {caseItem.id}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                <span>FIR No. {caseItem.firNumber}</span>
                <span className="text-xs font-normal text-slate-400">
                  ({formatReadableDate(caseItem.firDate)})
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="shrink-0 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex gap-2 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('case_review')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'case_review'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Case Review Parameters & Forensics</span>
            {caseReviewDates.length > 0 && (
              <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {caseReviewDates.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'general'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>FIR Basics & Classification</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supervision_dates')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'supervision_dates'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Supervision Dates, PR & Directives</span>
            {prDates.length > 0 && (
              <span className="bg-purple-100 text-purple-900 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                PR: {prDates.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">

          {/* ========================================================================= */}
          {/* TAB 1: CASE REVIEW PARAMETERS (FORENSICS, ARRESTS, TARGETS) */}
          {/* ========================================================================= */}
          {activeTab === 'case_review' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* 1. Injury & Medical / FSL Details */}
              <div className="bg-purple-50/40 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-3">
                <div className="font-black text-purple-900 dark:text-purple-300 flex items-center gap-2 uppercase tracking-wide">
                  <HeartPulse className="w-4 h-4 text-purple-600" />
                  <span>1. Injury, Post-Mortem & FSL Forensics</span>
                </div>

                {/* Injury Question (Yes / No) */}
                <div className="space-y-2.5">
                  <QuestionYesNo
                    label="Is there Injury reported in case?"
                    value={isInjuryPresent}
                    onChange={handleInjuryToggle}
                    subtitle="Select Yes if injured persons, medico-legal examination or autopsy applies"
                    badge={isInjuryPresent ? 'Injury Case' : undefined}
                  />

                  {/* If Injury Present: Injury Received, PM Report, Viscera (Yes / Pending / NA) */}
                  {isInjuryPresent && (
                    <div className="space-y-2 p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-700 animate-fadeIn">
                      <div className="text-[11px] font-bold text-purple-900 dark:text-purple-200 mb-1">
                        Medical & Injury Verification Status:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <ReviewTriOption
                          label="Injury Report Received"
                          value={injuryReportReceived}
                          onChange={setInjuryReportReceived}
                        />
                        <ReviewTriOption
                          label="PM Report Received"
                          value={pmReportReceived}
                          onChange={setPmReportReceived}
                          subtitle="Post-Mortem Autopsy Report"
                        />
                        <ReviewTriOption
                          label="Viscera Preserved"
                          value={visceraPreserved}
                          onChange={setVisceraPreserved}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* FSL Visit & Preserved Items (Yes / Pending / NA) */}
                <div className="space-y-2 pt-2 border-t border-purple-200/50 dark:border-purple-800/50">
                  <div className="text-[11px] font-bold text-purple-900 dark:text-purple-200">
                    Forensic Science Laboratory (FSL) Parameters:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <ReviewTriOption
                      label="FSL Team Visited PO"
                      value={fslVisitedPO}
                      onChange={handleFslVisitedPOChange}
                      subtitle="Scene of crime forensic inspection"
                    />

                    <ReviewTriOption
                      label="Item Sent / FSL Permission"
                      value={fslItemSentOrPermissionTaken}
                      onChange={handleFslItemSentChange}
                      subtitle="Permission taken or exhibit sent"
                    />

                    <ReviewTriOption
                      label="FSL Report Received"
                      value={fslReportReceived}
                      onChange={setFslReportReceived}
                    />
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Name of Item Preserved for FSL
                    </label>
                    <input
                      type="text"
                      value={fslItemPreservedName}
                      onChange={(e) => handleFslItemPreservedNameChange(e.target.value)}
                      placeholder="e.g., Blood stained soil, weapon of offence, viscera bottle, ballistic shell..."
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Accused Tracking, Arrests, Notice 41A, Bail & Surrender */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2 uppercase tracking-wide">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>2. Accused Tracking, Arrests, Notice (41A) & Bail</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* A: Pending for Arrest (Yes / No Question) */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <QuestionYesNo
                      label="Pending for Arresting?"
                      value={pendingForArrest}
                      onChange={setPendingForArrest}
                      icon={<UserX className="w-4 h-4 text-rose-500" />}
                      badge={pendingForArrest ? `${pendingArrestCount || 1} Pending` : undefined}
                    />

                    {pendingForArrest && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Pending for Arresting (No. of Persons)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={pendingArrestCount}
                            onChange={(e) => setPendingArrestCount(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Name of Person(s) to be Arrested
                          </label>
                          <textarea
                            rows={2}
                            value={pendingArrestNames}
                            onChange={(e) => setPendingArrestNames(e.target.value)}
                            placeholder="e.g. Ramesh Kumar s/o Dinesh, Suresh Singh..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* B: Any Person Arrested (Yes / No Question) */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <QuestionYesNo
                      label="Any Person Arrested?"
                      value={anyPersonArrested}
                      onChange={setAnyPersonArrested}
                      icon={<UserCheck className="w-4 h-4 text-emerald-500" />}
                      badge={anyPersonArrested ? `${arrestedCount || 1} Arrested` : undefined}
                    />

                    {anyPersonArrested && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            No. of Person(s) Arrested
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={arrestedCount}
                            onChange={(e) => setArrestedCount(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Name of Person(s) Arrested
                          </label>
                          <textarea
                            rows={2}
                            value={arrestedNames}
                            onChange={(e) => setArrestedNames(e.target.value)}
                            placeholder="e.g. Amit Kumar, Rajesh Sharma..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* C: Notice Served 41A (Yes / No Question) */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <QuestionYesNo
                      label="Any Person Served Notice (41A / Sec 35 BNSS)?"
                      value={anyPersonServedNotice}
                      onChange={setAnyPersonServedNotice}
                      icon={<FileText className="w-4 h-4 text-blue-500" />}
                      badge={anyPersonServedNotice ? `${noticeServedCount || 1} Served` : undefined}
                    />

                    {anyPersonServedNotice && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            No. of Person(s) Notice Served
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={noticeServedCount}
                            onChange={(e) => setNoticeServedCount(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Name of Person(s) Notice Served
                          </label>
                          <textarea
                            rows={2}
                            value={noticeServedNames}
                            onChange={(e) => setNoticeServedNames(e.target.value)}
                            placeholder="e.g. Manoj Mandal, Arvind Roy..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* D: Bail / Surrendered (Yes / No Question) */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <QuestionYesNo
                      label="Any Person on Bail / Surrendered?"
                      value={anyPersonOnBailOrSurrendered}
                      onChange={setAnyPersonOnBailOrSurrendered}
                      icon={<Scale className="w-4 h-4 text-amber-500" />}
                      badge={anyPersonOnBailOrSurrendered ? `${bailSurrenderedCount || 1} on Bail` : undefined}
                    />

                    {anyPersonOnBailOrSurrendered && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            No. of Person(s) on Bail / Surrendered
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={bailSurrenderedCount}
                            onChange={(e) => setBailSurrenderedCount(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Name of Person(s) on Bail / Surrendered
                          </label>
                          <textarea
                            rows={2}
                            value={bailSurrenderedNames}
                            onChange={(e) => setBailSurrenderedNames(e.target.value)}
                            placeholder="e.g. Pappu Yadav, Kundan Singh..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Other Reason for Pending */}
                <div className="pt-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Other Reason for Pending Investigation
                  </label>
                  <textarea
                    rows={2}
                    value={otherPendingReasons}
                    onChange={(e) => setOtherPendingReasons(e.target.value)}
                    placeholder="e.g., CDR analysis awaited from nodal officer, certified revenue map pending from CO..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* 3. Recovery of Girl / Boy */}
              <div className="bg-amber-50/40 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-3">
                <div className="font-black text-amber-900 dark:text-amber-300 flex items-center gap-2 uppercase tracking-wide">
                  <HeartPulse className="w-4 h-4 text-amber-600" />
                  <span>3. Recovery of Girl / Boy (POCSO / Kidnapping / Missing)</span>
                </div>

                {/* Question: Is this case related to recovery of girl/boy? (Yes / No) */}
                <QuestionYesNo
                  label="Is this case related to recovery of girl/boy?"
                  value={isVictimRecoveryCase}
                  onChange={handleVictimRecoveryCaseToggle}
                  subtitle="Applicable for Kidnapping, Abduction, POCSO, and Missing Persons"
                  badge={isVictimRecoveryCase ? (victimRecovered ? 'Recovered' : 'Pending Recovery') : undefined}
                />

                {isVictimRecoveryCase && (
                  <div className="space-y-3 pt-2 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          No. of Victims
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={victimCount}
                          onChange={(e) => setVictimCount(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Age Classification
                        </label>
                        <select
                          value={victimAgeType}
                          onChange={(e) => setVictimAgeType(e.target.value as 'minor' | 'major')}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                        >
                          <option value="minor">👶 Minor (Below 18 yrs - POCSO)</option>
                          <option value="major">🧑 Major (Adult - 18+ yrs)</option>
                        </select>
                      </div>

                      {/* Prominent Transfer Button / Status */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Recovery State & Transfer
                        </label>
                        {!victimRecovered ? (
                          <button
                            type="button"
                            onClick={handleTransferToRecovered}
                            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Transfer to: Girl/Boy Recovered</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 py-2 px-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-lg font-black text-xs border border-emerald-300 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>✓ Recovered</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setVictimRecovered(false)}
                              className="px-2 py-2 text-rose-600 dark:text-rose-400 hover:underline text-[11px] font-bold cursor-pointer"
                              title="Mark back to pending recovery"
                            >
                              Undo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {victimRecovered && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-fadeIn">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Recovery Date
                          </label>
                          <input
                            type="date"
                            value={victimRecoveryDate}
                            onChange={(e) => setVictimRecoveryDate(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Victim Recovery Details / Place / Statement
                          </label>
                          <input
                            type="text"
                            value={victimRecoveryDetails}
                            onChange={(e) => setVictimRecoveryDetails(e.target.value)}
                            placeholder="e.g. Recovered from Patna railway station, 164 statement done..."
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Special Acts: Arms, Liquor, NDPS */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-2 uppercase tracking-wide">
                  <Crosshair className="w-4 h-4 text-emerald-600" />
                  <span>4. Special Acts: Arms, Liquor / Excise & NDPS</span>
                </div>

                {/* Sub-block A: Arms Act Case */}
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <QuestionYesNo
                    label="Is this case related to Arms Act?"
                    value={isArmsCase}
                    onChange={handleArmsCaseToggle}
                    icon={<Crosshair className="w-4 h-4 text-amber-600" />}
                    subtitle="Arms & ammunition recovery, fire arms verification"
                  />
                  
                  {isArmsCase && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 animate-fadeIn">
                      <ReviewTriOption
                        label="Sent for Arms Verification"
                        value={armsSentForVerification}
                        onChange={setArmsSentForVerification}
                      />
                      <ReviewTriOption
                        label="Arms Verification Report Received"
                        value={armsReportReceived}
                        onChange={setArmsReportReceived}
                      />
                    </div>
                  )}
                </div>

                {/* Sub-block B: Liquor / Excise Prohibition Case */}
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <QuestionYesNo
                    label="Is this a Liquor / Excise Case?"
                    value={isLiquorCase}
                    onChange={handleLiquorCaseToggle}
                    icon={<Wine className="w-4 h-4 text-emerald-600" />}
                    subtitle="Bihar Prohibition & Excise Act offences"
                  />

                  {isLiquorCase && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <ReviewTriOption
                          label="Liquor Sent to Lab"
                          value={liquorSentToLab}
                          onChange={setLiquorSentToLab}
                        />
                        <ReviewTriOption
                          label="Liquor Lab Report Received"
                          value={liquorLabReportReceived}
                          onChange={setLiquorLabReportReceived}
                        />
                        <ReviewTriOption
                          label="Confiscation of Liquor"
                          value={confiscationOfLiquor}
                          onChange={setConfiscationOfLiquor}
                        />
                      </div>

                      {/* Vehicle Seized (Yes / No Question) */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                        <QuestionYesNo
                          label="Vehicle Seized?"
                          value={liquorVehicleSeized}
                          onChange={handleLiquorVehicleSeizedToggle}
                          subtitle="Seizure of motorcycle, auto, car, truck in liquor transport"
                        />

                        {liquorVehicleSeized && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
                            <ReviewTriOption
                              label="Verified from RTO"
                              value={vehicleVerifiedRTO}
                              onChange={setVehicleVerifiedRTO}
                            />
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                Rajsat / Confiscation Proposal Status
                              </label>
                              <input
                                type="text"
                                value={vehicleRajsatStatus}
                                onChange={(e) => setVehicleRajsatStatus(e.target.value)}
                                placeholder="e.g. Proposal sent to DM for Rajsat, Order pending..."
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-medium"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-block C: NDPS Case */}
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <QuestionYesNo
                    label="Is this case related to NDPS (Narcotics)?"
                    value={isNdpsCase}
                    onChange={handleNdpsCaseToggle}
                    icon={<Pill className="w-4 h-4 text-purple-600" />}
                    subtitle="Ganja, smack, brown sugar, synthetic narcotics offences"
                  />

                  {isNdpsCase && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 animate-fadeIn">
                      <ReviewTriOption
                        label="Sample Sent to Lab"
                        value={ndpsSampleSentToLab}
                        onChange={setNdpsSampleSentToLab}
                      />
                      <ReviewTriOption
                        label="Lab Report Received"
                        value={ndpsLabReportReceived}
                        onChange={setNdpsLabReportReceived}
                      />
                      <ReviewTriOption
                        label="Exhibit Sent to Safe House"
                        value={ndpsExhibitSentToSafeHouse}
                        onChange={setNdpsExhibitSentToSafeHouse}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Forensics, Digital & Review Targets */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                  <Camera className="w-4 h-4 text-blue-500" />
                  <span>5. Digital Forensics, SID, CD Uploads & TARGET Disposal</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <ReviewTriOption
                    label="PO Preserved"
                    value={poPreserved}
                    onChange={setPoPreserved}
                    subtitle="Place of Occurrence preserved"
                  />

                  <ReviewTriOption
                    label="PO Videography Done"
                    value={poVideographyDone}
                    onChange={setPoVideographyDone}
                    subtitle="Mandatory scene videography"
                  />

                  <ReviewTriOption
                    label="SID Linked With FIR"
                    value={sidLinkedWithFir}
                    onChange={setSidLinkedWithFir}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Total CD Uploaded
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalCdUploaded}
                      onChange={(e) => setTotalCdUploaded(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                    />
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Total SID Created
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalSidCreated}
                      onChange={(e) => setTotalSidCreated(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                    />
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-rose-500" />
                      <span>TARGET Disposal Date</span>
                    </label>
                    <input
                      type="date"
                      value={targetDisposalDate}
                      onChange={(e) => setTargetDisposalDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-xs font-bold"
                    />
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target & Disposal Remarks
                    </label>
                    <input
                      type="text"
                      value={targetRemarks}
                      onChange={(e) => setTargetRemarks(e.target.value)}
                      placeholder="e.g. Complete by Month End..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Formal Case Review Dates History */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span>Logged Case Review Dates ({caseReviewDates.length} Reviews Completed)</span>
                    </label>
                    {lastCaseReviewDate && (
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        Last Review: {lastCaseReviewDate}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    {caseReviewDates.length === 0 ? (
                      <span className="text-slate-400 text-xs italic">No formal case reviews logged yet.</span>
                    ) : (
                      caseReviewDates.map((date, idx) => (
                        <span
                          key={date}
                          className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-700"
                        >
                          <span>Review #{idx + 1}: {date}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReviewDate(date)}
                            className="text-blue-400 hover:text-rose-600 font-extrabold ml-1 cursor-pointer"
                            title="Remove review date"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="date"
                      value={newReviewDateInput}
                      onChange={(e) => setNewReviewDateInput(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddReviewDate}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                    >
                      + Add Review Date
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: GENERAL FIR BASICS & CLASSIFICATION */}
          {/* ========================================================================= */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* PS & FIR Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Police Station <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={ps}
                    onChange={(e) => setPs(e.target.value as PoliceStationName)}
                    disabled={!isSuperUser}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500"
                  >
                    {psOptions.map((p) => (
                      <option key={p} value={p}>{p} PS</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    FIR Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firNumber}
                    onChange={(e) => setFirNumber(e.target.value)}
                    placeholder="e.g. 104/2026"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    FIR Registration Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={firDate}
                    onChange={(e) => setFirDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Punishment & Statutory Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Punishment Term
                  </label>
                  <select
                    value={punishmentTerm}
                    onChange={(e) => {
                      const term = e.target.value as PunishmentTerm;
                      setPunishmentTerm(term);
                      if (term === '7_years_or_more') {
                        setDeadlineDays(90);
                      } else {
                        setDeadlineDays(60);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="7_years_or_more">7 Years or More (≥ 7 Yrs) - 90 Days Limit</option>
                    <option value="less_than_7_years">Less than 7 Years (&lt; 7 Yrs) - 60 Days Limit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Statutory Investigation Limit
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeadlineDays(60)}
                      className={`p-2.5 rounded-xl font-bold border transition ${
                        deadlineDays === 60
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      60 Days Limit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeadlineDays(90)}
                      className={`p-2.5 rounded-xl font-bold border transition ${
                        deadlineDays === 90
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      90 Days Limit
                    </button>
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  IPC / BNS & Special Sections <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sections}
                  onChange={(e) => setSections(e.target.value)}
                  placeholder="e.g. 302/34 IPC or 103(1) BNS, 27 Arms Act"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Multi-Crime Head Classification */}
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-rose-500" />
                    <span>Standardized Crime Heads (Multi-Head Supported)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>{isCrimeHeadManuallySet ? 'Custom Selection' : 'Auto-Detected'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCrimeHeadManuallySet(false);
                        const autoHeads = classifyAllCrimeHeads({ sections, placeOfOccurrence, complainantName });
                        setSelectedCrimeHeads(autoHeads.length > 0 ? autoHeads : ['Other / General IPC & BNS']);
                      }}
                      className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Auto-detect all applicable crime heads from sections and review context"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Auto-Detect</span>
                    </button>
                  </div>
                </div>

                {/* Selected Crime Head Tags */}
                <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {selectedCrimeHeads.map((head) => {
                    const config = getDynamicCrimeHeadsConfig();
                    const meta = config[head] || CRIME_HEADS_CONFIG[head as CrimeHead];
                    return (
                      <span
                        key={head}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 animate-fadeIn"
                      >
                        <span>{meta?.icon || '⚖️'}</span>
                        <span>{meta?.name || head}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHead(head)}
                          className="ml-1 hover:text-rose-600 p-0.5 rounded cursor-pointer transition"
                          title={`Remove ${head}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Add / Toggle More Heads Dropdown */}
                <div className="flex items-center gap-2">
                  <select
                    value={addHeadSelectValue}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleToggleOrAddHead(e.target.value as CrimeHead);
                      }
                    }}
                    className="flex-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">+ Add or Toggle Another Crime Head (e.g. Arms Act, Attempt to Murder, Murder)...</option>
                    {ALL_CRIME_HEADS.map((headId) => {
                      const meta = CRIME_HEADS_CONFIG[headId];
                      const isSelected = selectedCrimeHeads.includes(headId);
                      return (
                        <option key={headId} value={headId}>
                          {isSelected ? '✓ ' : '+ '} {meta?.icon || '⚖️'} {meta?.name || headId} ({meta?.hindiName || ''}) — {meta?.category || 'SLL'}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  💡 One case can have multiple crime heads (e.g. <strong>Attempt to Murder</strong> + <strong>Arms Act</strong>, or <strong>Murder</strong> + <strong>Arms Act</strong>).
                </p>
              </div>

              {/* Complainant & Place */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Complainant Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={complainantName}
                    onChange={(e) => setComplainantName(e.target.value)}
                    placeholder="Enter informant name"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Complainant Contact No.
                  </label>
                  <input
                    type="tel"
                    value={complainantPhone}
                    onChange={(e) => setComplainantPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Place of Occurrence (PO) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={placeOfOccurrence}
                    onChange={(e) => setPlaceOfOccurrence(e.target.value)}
                    placeholder="Village / Location"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Case Classification (SR / Non-SR) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span>Case Classification (SR / NON-SR)</span>
                  </label>
                  {!isSuperUser && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                      (SDPO Authorization Required to Modify)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={!isSuperUser}
                    onClick={() => setDesignation('SR')}
                    className={`p-2.5 rounded-xl font-bold border transition flex items-center justify-center gap-1.5 ${
                      designation === 'SR'
                        ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    } ${!isSuperUser ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span>⭐ Special Report (SR) Case</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isSuperUser}
                    onClick={() => setDesignation('NON_SR')}
                    className={`p-2.5 rounded-xl font-bold border transition flex items-center justify-center gap-1.5 ${
                      designation === 'NON_SR'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    } ${!isSuperUser ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span>👮 NON-SR (CI Supervision)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isSuperUser}
                    onClick={() => setDesignation('PENDING_DESIGNATION')}
                    className={`p-2.5 rounded-xl font-bold border transition flex items-center justify-center gap-1.5 ${
                      designation === 'PENDING_DESIGNATION'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    } ${!isSuperUser ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span>❓ Pending Designation</span>
                  </button>
                </div>
              </div>

              {/* Status & IO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Investigation Stage Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Under Investigation">Under Investigation</option>
                    <option value="Disposed">Disposed (Investigation Completed / Final Form / CS / MoF)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Investigating Officer (IO)
                  </label>
                  <select
                    value={ioName}
                    onChange={(e) => setIoName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500"
                  >
                    {availableIOs.map((io) => (
                      <option key={io.id} value={io.name}>
                        {io.name} ({io.ps})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Disposed Details */}
              {status === 'Disposed' && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Case Disposal & Final Order Details</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Disposed Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={disposedDate}
                        onChange={(e) => setDisposedDate(e.target.value)}
                        required={status === 'Disposed'}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Disposal Category / Reason
                      </label>
                      <select
                        value={disposalType}
                        onChange={(e) => setDisposalType(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="Chargesheet Concluded in Court">Chargesheet Concluded in Court</option>
                        <option value="False Case">False Case</option>
                        <option value="Mistake of Fact">Mistake of Fact</option>
                        <option value="Final Report (Disposed / Untraced)">Final Report (Disposed / Untraced)</option>
                        <option value="Quashed by High Court">Quashed by High Court</option>
                        <option value="Compromise / Lok Adalat">Compromise / Lok Adalat</option>
                        <option value="Other Judicial Closure">Other Judicial Closure</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Disposal Order / Court Reference / Judicial Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={disposalRemarks}
                      onChange={(e) => setDisposalRemarks(e.target.value)}
                      placeholder="Enter court disposal order number, judge remarks, or closure grounds..."
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Chargesheet & Final Form Submission Details */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>Chargesheet / Final Form & CCTNS Upload Status</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Chargesheet / Final Form No.
                    </label>
                    <input
                      type="text"
                      value={chargesheetNumber}
                      onChange={(e) => setChargesheetNumber(e.target.value)}
                      placeholder="e.g. CS-45/2026 or FF-12/2026"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Chargesheet / Final Form Date
                    </label>
                    <input
                      type="date"
                      value={chargesheetDate}
                      onChange={(e) => setChargesheetDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                {/* Yes / No Questions for CCTNS Portal Uploads */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <QuestionYesNo
                    label="Chargesheet Uploaded to CCTNS Portal?"
                    value={chargesheetUploadedCCTNS}
                    onChange={setChargesheetUploadedCCTNS}
                    subtitle="CS / Final Form successfully uploaded"
                    badge={chargesheetUploadedCCTNS ? 'Uploaded' : 'Pending'}
                  />

                  <QuestionYesNo
                    label="Case Diary (CD) Uploaded to CCTNS Portal?"
                    value={caseDiaryUploadedCCTNS}
                    onChange={setCaseDiaryUploadedCCTNS}
                    subtitle="CDs synchronized with CCTNS server"
                    badge={caseDiaryUploadedCCTNS ? 'Synced' : 'Pending'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SUPERVISION DATES, PR & DIRECTIVES */}
          {/* ========================================================================= */}
          {activeTab === 'supervision_dates' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Supervision Milestone Dates */}
              <div className="bg-purple-50/50 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200/80 dark:border-purple-900/60 space-y-3">
                <div className="font-black text-purple-900 dark:text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Supervision Milestones Tracking</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Place of Occurrence (PO) Visit Date
                    </label>
                    <input
                      type="date"
                      value={poVisitDate}
                      onChange={(e) => setPoVisitDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      SDPO Supervision Note Date
                    </label>
                    <input
                      type="date"
                      value={supervisionDate}
                      onChange={(e) => setSupervisionDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Final Progress Report (PR) Date
                    </label>
                    <input
                      type="date"
                      value={finalPrDate}
                      onChange={(e) => setFinalPrDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                {/* PR Dates Multi-Selector */}
                <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/60 space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Progress Report (PR) Issue Dates ({prDates.length} issued)
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    {prDates.length === 0 ? (
                      <span className="text-slate-400 text-xs italic">No Progress Reports (PR) recorded yet.</span>
                    ) : (
                      prDates.map((date, idx) => (
                        <span
                          key={date}
                          className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 text-xs font-bold px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-700"
                        >
                          <span>PR #{idx + 1}: {date}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePrDate(date)}
                            className="text-purple-400 hover:text-rose-600 font-extrabold ml-1 cursor-pointer"
                            title="Remove PR date"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="date"
                      value={newPrDateInput}
                      onChange={(e) => setNewPrDateInput(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddPrDate}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                    >
                      + Add PR Date
                    </button>
                  </div>
                </div>

                {/* Case Review Dates Multi-Selector */}
                <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/60 space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Case Review Dates ({caseReviewDates.length} recorded)
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    {caseReviewDates.length === 0 ? (
                      <span className="text-slate-400 text-xs italic">No formal case reviews logged yet.</span>
                    ) : (
                      caseReviewDates.map((date, idx) => (
                        <span
                          key={date}
                          className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 text-xs font-bold px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-700"
                        >
                          <span>Review #{idx + 1}: {date}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReviewDate(date)}
                            className="text-blue-400 hover:text-rose-600 font-extrabold ml-1 cursor-pointer"
                            title="Remove review date"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="date"
                      value={newReviewDateInput}
                      onChange={(e) => setNewReviewDateInput(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddReviewDate}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                    >
                      + Add Review Date
                    </button>
                  </div>
                </div>
              </div>

              {/* SDPO Supervision Note */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-purple-500" />
                    <span>SDPO Supervision Orders / Directives</span>
                  </label>
                  {isSuperUser && onDeleteSupervisionNote && (caseItem.sdpoSupervisionNote || sdpoNote) && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteSupervisionNote(caseItem.id);
                        setSdpoNote('');
                      }}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear / Delete Supervision Note</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={sdpoNote}
                  onChange={(e) => setSdpoNote(e.target.value)}
                  disabled={!isSuperUser}
                  placeholder={isSuperUser ? "Enter SDPO Supervision Memo / Instructions..." : "SDPO Supervision directive..."}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium ${
                    !isSuperUser ? 'opacity-80' : ''
                  }`}
                />
              </div>

              {/* Circle Inspector Supervision Note */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  <span>Circle Inspector (CI) Supervision Remarks (For NON-SR & UD Cases)</span>
                </label>
                <textarea
                  rows={2}
                  value={ciNote}
                  onChange={(e) => setCiNote(e.target.value)}
                  disabled={!isCircleInspector && !isSuperUser}
                  placeholder="Circle Inspector Supervision Note..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* PS Progress Remarks */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Police Station IO Investigation Progress Updates
                </label>
                <textarea
                  rows={2}
                  value={psProgressRemarks}
                  onChange={(e) => setPsProgressRemarks(e.target.value)}
                  placeholder="Update ongoing witness statements, arrests, property recovery, FSL reports..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="shrink-0 p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-4">
            {!isReadOnly && onDeleteCase ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete FIR ${caseItem.firNumber}?`)) {
                    onDeleteCase(caseItem.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 hover:bg-rose-600 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Case Record</span>
              </button>
            ) : isReadOnly ? (
              <div className="text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Read-Only Mode: You cannot modify case records.</span>
              </div>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs cursor-pointer"
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Case Updates</span>
                </button>
              )}
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
