import React, { useState, useMemo, useEffect } from 'react';
import {
  DailyCrimeReport,
  PoliceStationName,
  InvestigatingOfficer,
  RegisteredFIRItem,
  CaseArrestItem,
  RankStrengthDetails,
  OfficerOnDutyDetails,
  GastiPatrolDetails,
  ODShiftItem,
  GastiShiftItem,
  LeaveLedgerEntry,
  OfficerLeaveRank,
  PoliceStation,
  PoliceDistrict,
  PoliceSubdivision,
  UserRole,
  UserAccount,
  FIRCase,
} from '../types';
import { INITIAL_POLICE_STATIONS } from '../data/mockData';
import { getUserJurisdictionContext, getPoliceStationsForJurisdiction } from '../utils/jurisdictionHelpers';
import { JurisdictionFilterControls } from './JurisdictionFilterControls';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Users,
  Shield,
  Clock,
  Car,
  Wine,
  AlertTriangle,
  Package,
  Calendar,
  CheckCircle2,
  Info,
  UserMinus,
  ArrowRight,
} from 'lucide-react';
import { calculateArrivalDate, formatIndianDate, normalizeLeaveType } from '../utils/helpers';

interface DailyReportSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reportData: Omit<DailyCrimeReport, 'id'>) => void;
  investigatingOfficers: InvestigatingOfficer[];
  cases?: FIRCase[];
  defaultPS?: PoliceStationName | null;
  isSuperUser?: boolean;
  availablePoliceStations?: PoliceStation[];
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  currentRole?: UserRole;
  currentUserAccount?: UserAccount | null;
}

const DEFAULT_RANKS: RankStrengthDetails['rank'][] = [
  'Inspector',
  'Sub-Inspector (SI)',
  'ASI & PTC',
  'Constable',
];

export const DailyReportSubmitModal: React.FC<DailyReportSubmitModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  investigatingOfficers,
  cases = [],
  defaultPS,
  isSuperUser = false,
  availablePoliceStations,
  districts,
  subdivisions,
  currentRole = 'ADMINISTRATOR',
  currentUserAccount = null,
}) => {
  const { isAdministrator, isDistrictLevel, userDistrict, userSubdivision, isSubdivisionLevel } =
    getUserJurisdictionContext(currentRole, currentUserAccount);

  const modalIsSuperUser = isSuperUser || isAdministrator || isDistrictLevel || isSubdivisionLevel;

  const [selectedDistrict, setSelectedDistrict] = useState<string>(isAdministrator ? 'ALL' : userDistrict);
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>(isSubdivisionLevel ? userSubdivision : 'ALL');

  // Filter available stations based on selected District and Subdivision
  const filteredAvailableStations = useMemo(() => {
    const activeDist = isAdministrator ? selectedDistrict : userDistrict;
    const activeSubdiv = isSubdivisionLevel ? userSubdivision : selectedSubdivision;
    return getPoliceStationsForJurisdiction(activeDist, activeSubdiv, availablePoliceStations);
  }, [selectedDistrict, selectedSubdivision, isAdministrator, userDistrict, isSubdivisionLevel, userSubdivision, availablePoliceStations]);

  const psOptions = useMemo(() => {
    return Array.from(new Set(filteredAvailableStations.map((p) => p.name as PoliceStationName)));
  }, [filteredAvailableStations]);

  const initialPS = defaultPS || (psOptions[0] as PoliceStationName) || 'Tarapur';
  const todayStr = new Date().toISOString().split('T')[0];

  const [ps, setPs] = useState<PoliceStationName>(initialPS);

  // Sync selected PS when filtered options change
  useEffect(() => {
    if (defaultPS) {
      setPs(defaultPS);
    } else if (psOptions.length > 0 && !psOptions.includes(ps)) {
      setPs(psOptions[0]);
    }
  }, [psOptions, defaultPS]);
  const [date, setDate] = useState(todayStr);
  const [submittedBy, setSubmittedBy] = useState(`SHO ${initialPS} PS`);

  // 1. Total FIR registered last day
  const [registeredFirs, setRegisteredFirs] = useState<RegisteredFIRItem[]>([]);

  // 2. OD (Officer on Duty) shifts of Today
  const [odShifts, setOdShifts] = useState<ODShiftItem[]>([
    { shiftName: 'OD 1 (Day Shift)', timeSlot: '06:00 - 14:00', ioName: '', remarks: '' },
    { shiftName: 'OD 2 (Evening Shift)', timeSlot: '14:00 - 22:00', ioName: '', remarks: '' },
    { shiftName: 'OD 3 (Night Shift)', timeSlot: '22:00 - 06:00', ioName: '', remarks: '' },
  ]);

  // 3. GASTI (Patrol) shifts of Today
  const [gastiShifts, setGastiShifts] = useState<GastiShiftItem[]>([
    { shiftName: 'Morning Gasti', timeSlot: '06:00 - 14:00', ioName: '', sectorArea: 'Town & Market Sector', vehicleNumber: '', forceCount: 2, remarks: '' },
    { shiftName: 'Day / Mobile Gasti', timeSlot: '14:00 - 22:00', ioName: '', sectorArea: 'Main Highway & Border Checkpoint', vehicleNumber: '', forceCount: 3, remarks: '' },
    { shiftName: 'Night Gasti / Nakabandi', timeSlot: '22:00 - 06:00', ioName: '', sectorArea: 'Sensitive Naka Points & Rural Patrol', vehicleNumber: '', forceCount: 4, remarks: '' },
  ]);

interface EnhancedCaseArrestItem {
  caseId?: string;
  caseNumber: string;
  arrestCount: number;
  isLiquorRelated: boolean;
  arrestedAccusedNames?: string[];
  manualAccusedNames?: string[];
}

  // 4. Arresting details of last day
  const [caseArrests, setCaseArrests] = useState<EnhancedCaseArrestItem[]>([]);
  const [otherArrestsCount, setOtherArrestsCount] = useState<number>(0);
  const [manualInputs, setManualInputs] = useState<Record<number, string>>({});
  const [firAccusedInputs, setFirAccusedInputs] = useState<Record<number, string>>({});

  // 5. Leave Management (Rank-Wise)
  const [rankStrengths, setRankStrengths] = useState<RankStrengthDetails[]>([
    { rank: 'Inspector', totalStrength: 1, present: 1, onLeave: 0, arrivingToday: 0, departingToday: 0 },
    { rank: 'Sub-Inspector (SI)', totalStrength: 6, present: 5, onLeave: 1, arrivingToday: 0, departingToday: 0 },
    { rank: 'ASI & PTC', totalStrength: 10, present: 9, onLeave: 1, arrivingToday: 0, departingToday: 0 },
    { rank: 'Constable', totalStrength: 24, present: 22, onLeave: 2 },
  ]);

  // Departing Officers Leave Registry (Except Constable)
  const [departingOfficers, setDepartingOfficers] = useState<LeaveLedgerEntry[]>([]);

  // 6. Seizures and Incidents
  const [seizuresSummary, setSeizuresSummary] = useState('');
  const [majorIncidentsNotes, setMajorIncidentsNotes] = useState('');

  // Filter IO list to only officers of the selected Police Station
  const psOfficers = useMemo(() => {
    return investigatingOfficers.filter((io) => io.ps === ps);
  }, [investigatingOfficers, ps]);

  // Non-constable officers for leave selection (Inspector, SI, ASI & PTC)
  const nonConstableOfficers = useMemo(() => {
    return psOfficers;
  }, [psOfficers]);

  // Calculate Arrest Totals
  const totalCaseArrests = caseArrests.reduce((acc, c) => acc + (Number(c.arrestCount) || 0), 0);
  const liquorArrests = caseArrests
    .filter((c) => c.isLiquorRelated)
    .reduce((acc, c) => acc + (Number(c.arrestCount) || 0), 0);
  const totalArrests = totalCaseArrests + (Number(otherArrestsCount) || 0);

  // Helper to add empty FIR row
  const handleAddFIRRow = () => {
    setRegisteredFirs((prev) => [
      ...prev,
      {
        firNumber: '',
        date: todayStr,
        sections: '',
        ioName: psOfficers[0]?.name || '',
        placeOfOccurrence: '',
        complainantName: '',
        complainantPhone: '',
        accusedCount: 0,
        accusedNames: [],
      },
    ]);
  };

  const handleRemoveFIRRow = (index: number) => {
    setRegisteredFirs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateFIRRow = (index: number, field: keyof RegisteredFIRItem, val: any) => {
    setRegisteredFirs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleAddAccusedToFIR = (idx: number, accusedName: string) => {
    if (!accusedName.trim()) return;
    setRegisteredFirs((prev) => {
      const next = [...prev];
      const currentNames = next[idx].accusedNames || [];
      if (!currentNames.includes(accusedName.trim())) {
        const updatedNames = [...currentNames, accusedName.trim()];
        next[idx] = {
          ...next[idx],
          accusedNames: updatedNames,
          accusedCount: Math.max(next[idx].accusedCount || 0, updatedNames.length),
        };
      }
      return next;
    });
  };

  const handleRemoveAccusedFromFIR = (firIdx: number, accusedName: string) => {
    setRegisteredFirs((prev) => {
      const next = [...prev];
      const updatedNames = (next[firIdx].accusedNames || []).filter((name) => name !== accusedName);
      next[firIdx] = {
        ...next[firIdx],
        accusedNames: updatedNames,
        accusedCount: Math.max(next[firIdx].accusedCount || 0, updatedNames.length),
      };
      return next;
    });
  };

  // Helper to add Case Arrest row
  const handleAddCaseArrestRow = () => {
    setCaseArrests((prev) => [
      ...prev,
      {
        caseId: '',
        caseNumber: '',
        arrestCount: 0,
        isLiquorRelated: false,
        arrestedAccusedNames: [],
        manualAccusedNames: [],
      },
    ]);
  };

  const handleRemoveCaseArrestRow = (index: number) => {
    setCaseArrests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCaseArrestRow = (
    index: number,
    field: keyof EnhancedCaseArrestItem,
    val: any
  ) => {
    setCaseArrests((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Helper to add OD Shift row
  const handleAddODShift = () => {
    const shiftNum = odShifts.length + 1;
    setOdShifts((prev) => [
      ...prev,
      {
        id: `od-${Date.now()}`,
        shiftName: `OD ${shiftNum} (Special Duty)`,
        timeSlot: '08:00 - 20:00',
        ioName: '',
        remarks: '',
      },
    ]);
  };

  const handleRemoveODShift = (index: number) => {
    setOdShifts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateODShift = (index: number, field: keyof ODShiftItem, val: string) => {
    setOdShifts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Helper to add Gasti Patrol row
  const handleAddGastiShift = () => {
    const shiftNum = gastiShifts.length + 1;
    setGastiShifts((prev) => [
      ...prev,
      {
        id: `gasti-${Date.now()}`,
        shiftName: `Patrol Shift ${shiftNum}`,
        timeSlot: '20:00 - 04:00',
        ioName: '',
        sectorArea: 'Rural & Naka Zone',
        vehicleNumber: '',
        forceCount: 3,
        remarks: '',
      },
    ]);
  };

  const handleRemoveGastiShift = (index: number) => {
    setGastiShifts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateGastiShift = (index: number, field: keyof GastiShiftItem, val: any) => {
    setGastiShifts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Helper for rank strength edits
  const handleUpdateRank = (
    rankName: RankStrengthDetails['rank'],
    field: keyof RankStrengthDetails,
    val: number
  ) => {
    setRankStrengths((prev) =>
      prev.map((item) => {
        if (item.rank === rankName) {
          return { ...item, [field]: Math.max(0, val) };
        }
        return item;
      })
    );
  };

  // Synchronize departing count in rankStrengths table
  const syncRankDepartingCounts = (list: LeaveLedgerEntry[]) => {
    setRankStrengths((prev) =>
      prev.map((rs) => {
        if (rs.rank === 'Constable') return rs;
        const count = list.filter((item) => item.rank === rs.rank).length;
        return { ...rs, departingToday: count };
      })
    );
  };

  // Handlers for Departing Officers Leave Ledger (except Constable)
  const handleAddDepartingOfficer = () => {
    const defaultOfficer = nonConstableOfficers[0]?.name || '';
    const defaultRank: OfficerLeaveRank =
      (nonConstableOfficers[0]?.rank as OfficerLeaveRank) || 'Sub-Inspector (SI)';
    const defaultDays = 4;
    const computedArrival = calculateArrivalDate(date, defaultDays);

    const newEntry: LeaveLedgerEntry = {
      id: `leave-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ps,
      officerName: defaultOfficer,
      rank: defaultRank,
      departureDate: date,
      daysOnLeave: defaultDays,
      arrivalDate: computedArrival,
      status: 'ON_LEAVE',
      leaveType: 'CL',
      remarks: '',
    };

    const updated = [...departingOfficers, newEntry];
    setDepartingOfficers(updated);
    syncRankDepartingCounts(updated);
  };

  const handleRemoveDepartingOfficer = (index: number) => {
    const updated = departingOfficers.filter((_, i) => i !== index);
    setDepartingOfficers(updated);
    syncRankDepartingCounts(updated);
  };

  const handleUpdateDepartingOfficer = (
    index: number,
    field: keyof LeaveLedgerEntry,
    val: any
  ) => {
    const updated = [...departingOfficers];
    const item = { ...updated[index], [field]: val };

    // Auto-detect rank if officer name changes from IO list
    if (field === 'officerName') {
      const matched = psOfficers.find((io) => io.name === val);
      if (matched) {
        if (matched.rank === 'Inspector') item.rank = 'Inspector';
        else if (matched.rank === 'Sub-Inspector (SI)') item.rank = 'Sub-Inspector (SI)';
        else item.rank = 'ASI & PTC';
      }
    }

    // Auto-recalculate arrival date if departureDate or daysOnLeave changes
    if (field === 'departureDate' || field === 'daysOnLeave') {
      const dep = field === 'departureDate' ? val : item.departureDate;
      const days = field === 'daysOnLeave' ? Number(val) : item.daysOnLeave;
      item.arrivalDate = calculateArrivalDate(dep, days);
    }

    updated[index] = item;
    setDepartingOfficers(updated);
    syncRankDepartingCounts(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const firsCount = registeredFirs.length;

    // Filter valid OD shifts
    const validOdShifts = odShifts.filter((s) => s.ioName && s.ioName.trim().length > 0);
    const odDetails: OfficerOnDutyDetails = {
      od1IoName: validOdShifts[0]?.ioName || undefined,
      od2IoName: validOdShifts[1]?.ioName || undefined,
      od3IoName: validOdShifts[2]?.ioName || undefined,
      odShifts: validOdShifts,
    };

    // Filter valid Gasti shifts
    const validGastiShifts = gastiShifts.filter((s) => s.ioName && s.ioName.trim().length > 0);
    const morningShift = validGastiShifts.find((s) => s.shiftName.toLowerCase().includes('morning')) || validGastiShifts[0];
    const dayShift = validGastiShifts.find((s) => s.shiftName.toLowerCase().includes('day') || s.shiftName.toLowerCase().includes('mobile')) || validGastiShifts[1];
    const nightShift = validGastiShifts.find((s) => s.shiftName.toLowerCase().includes('night') || s.shiftName.toLowerCase().includes('naka')) || validGastiShifts[2];

    const gastiDetails: GastiPatrolDetails = {
      morningGastiIoName: morningShift?.ioName || undefined,
      dayGastiIoName: dayShift?.ioName || undefined,
      nightGastiIoName: nightShift?.ioName || undefined,
      gastiShifts: validGastiShifts,
    };

    const arrestDetails = {
      caseArrests: caseArrests.filter((ca) => ca.caseNumber.trim().length > 0 || ca.arrestCount > 0),
      otherArrestsCount: Number(otherArrestsCount) || 0,
      totalArrestsCount: totalArrests,
      liquorArrestsCount: liquorArrests,
    };

    onSubmit({
      ps,
      date,
      firsRegisteredCount: firsCount,
      registeredFirs: registeredFirs.filter((f) => f.firNumber.trim().length > 0),
      odDetails,
      gastiDetails,
      arrestsCount: totalArrests,
      arrestDetails,
      rankStrengths,
      leaveLedgerEntries: departingOfficers.filter((o) => o.officerName.trim().length > 0),
      seizuresSummary: seizuresSummary.trim() || undefined,
      majorIncidentsNotes: majorIncidentsNotes.trim() || undefined,
      submittedBy: submittedBy.trim() || `SHO ${ps} PS`,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Submit Daily Police Station Crime & Patrol Diary
              </h2>
              <p className="text-xs text-slate-400">
                Log FIRs, OD officers, patrol shifts, arrest figures, and leave strength
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 text-xs">
          {/* Station, Date, Officer metadata */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
            {/* If superuser, show cascading District & Subdivision filters to restrict PS options */}
            {modalIsSuperUser && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider block">
                    Target Jurisdiction Filters
                  </span>
                  <p className="text-[10px] text-slate-500">
                    Filters the Police Station options available below based on your command level
                  </p>
                </div>
                <JurisdictionFilterControls
                  currentRole={currentRole}
                  currentUserAccount={currentUserAccount}
                  districts={districts}
                  subdivisions={subdivisions}
                  availablePoliceStations={availablePoliceStations}
                  selectedDistrict={selectedDistrict}
                  selectedSubdivision={selectedSubdivision}
                  selectedPS="ALL"
                  onChangeDistrict={(d) => {
                    setSelectedDistrict(d);
                    setSelectedSubdivision('ALL');
                  }}
                  onChangeSubdivision={setSelectedSubdivision}
                  onChangePS={() => {}}
                  compact={true}
                  includeAllOption={true}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Police Station *
                </label>
                <select
                  value={ps}
                  onChange={(e) => {
                    const newPS = e.target.value as PoliceStationName;
                    setPs(newPS);
                    setSubmittedBy(`SHO ${newPS} PS`);
                  }}
                  disabled={!modalIsSuperUser && Boolean(defaultPS)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white disabled:opacity-75"
                >
                  {psOptions.map((st) => (
                    <option key={st} value={st}>
                      {st} PS
                    </option>
                  ))}
                </select>
              </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Report Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Submitted By (Officer / Rank) *
              </label>
              <input
                type="text"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder="e.g. SHO Tarapur PS"
                required
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>
          </div>

          {/* Section 1: Total FIR registered last day */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                  Total FIR Registered Last Day
                </span>
                <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded text-[11px] font-bold">
                  {registeredFirs.length} FIRs
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddFIRRow}
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More FIR</span>
              </button>
            </div>

            {registeredFirs.length === 0 ? (
              <div className="py-4 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                <span>No FIRs registered yesterday. Click "Add More FIR" if any cases were lodged.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {registeredFirs.map((fir, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4 shadow-sm"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                        FIR Record Details #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFIRRow(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded transition flex items-center gap-1 font-bold text-[10px]"
                        title="Remove FIR"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove FIR</span>
                      </button>
                    </div>

                    {/* Field Grid 1: Basic FIR Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                          FIR No. *
                        </label>
                        <input
                          type="text"
                          value={fir.firNumber}
                          onChange={(e) => handleUpdateFIRRow(idx, 'firNumber', e.target.value)}
                          placeholder="e.g. 104/2025"
                          required
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                          FIR Date *
                        </label>
                        <input
                          type="date"
                          value={fir.date}
                          onChange={(e) => handleUpdateFIRRow(idx, 'date', e.target.value)}
                          required
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                          Sections *
                        </label>
                        <input
                          type="text"
                          value={fir.sections}
                          onChange={(e) => handleUpdateFIRRow(idx, 'sections', e.target.value)}
                          placeholder="e.g. 379/411 IPC"
                          required
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                          Investigating Officer (IO) *
                        </label>
                        <select
                          value={fir.ioName}
                          onChange={(e) => handleUpdateFIRRow(idx, 'ioName', e.target.value)}
                          required
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                        >
                          <option value="">Select {ps} PS Officer...</option>
                          {psOfficers.map((io) => (
                            <option key={io.id} value={io.name}>
                              {io.name} ({io.rank})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Field Grid 2: Circumstantial details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                          Place of Occurrence *
                        </label>
                        <input
                          type="text"
                          value={fir.placeOfOccurrence || ''}
                          onChange={(e) => handleUpdateFIRRow(idx, 'placeOfOccurrence', e.target.value)}
                          placeholder="e.g. Tarapur Village Chowk"
                          required
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                          Complainant Name *
                        </label>
                        <input
                          type="text"
                          value={fir.complainantName || ''}
                          onChange={(e) => handleUpdateFIRRow(idx, 'complainantName', e.target.value)}
                          placeholder="Complainant Name"
                          required
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                          Complainant Mob No
                        </label>
                        <input
                          type="text"
                          value={fir.complainantPhone || ''}
                          onChange={(e) => handleUpdateFIRRow(idx, 'complainantPhone', e.target.value)}
                          placeholder="e.g. +91 9988776655"
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    {/* Field Grid 3: Accused and Supervision Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1 items-start text-xs">
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                          No of Accused *
                        </label>
                        <input
                          type="number"
                          min={(fir.accusedNames || []).length}
                          value={fir.accusedCount || 0}
                          onChange={(e) => handleUpdateFIRRow(idx, 'accusedCount', Math.max((fir.accusedNames || []).length, Number(e.target.value) || 0))}
                          required
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-bold"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 italic">
                          Can be higher than added names if some are unknown.
                        </p>
                      </div>

                      <div className="sm:col-span-9 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                          Add Accused Person Name
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={fir.accusedInput || ''}
                            onChange={(e) => handleUpdateFIRRow(idx, 'accusedInput', e.target.value)}
                            placeholder="Type name (e.g. Pappu Singh) and press Enter or Add"
                            className="flex-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white text-xs font-semibold"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAccusedToFIR(idx, fir.accusedInput || '');
                                handleUpdateFIRRow(idx, 'accusedInput', '');
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleAddAccusedToFIR(idx, fir.accusedInput || '');
                              handleUpdateFIRRow(idx, 'accusedInput', '');
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[10px] transition shrink-0 cursor-pointer shadow-xs"
                          >
                            Add Accused
                          </button>
                        </div>

                        {/* List of Accused added for this FIR */}
                        <div>
                          {(fir.accusedNames || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                              {(fir.accusedNames || []).map((name) => (
                                <span
                                  key={name}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                                >
                                  <span>{name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAccusedFromFIR(idx, name)}
                                    className="text-rose-500 hover:text-rose-700 font-extrabold cursor-pointer"
                                    title={`Remove ${name}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">No named accused added yet. (Case registered against unknown person/persons)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2 & 3: OD Details & GASTI Patrol Details (Side-by-side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* OD Details of Today */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded">
                    <Clock className="w-4 h-4" />
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    OD Details of Today ({odShifts.length} Shifts)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddODShift}
                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-[11px] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add OD Shift</span>
                </button>
              </div>

              <div className="space-y-3">
                {odShifts.map((shift, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={shift.shiftName}
                        onChange={(e) => handleUpdateODShift(idx, 'shiftName', e.target.value)}
                        placeholder="Shift Name"
                        className="font-bold text-xs text-amber-900 dark:text-amber-300 bg-transparent border-b border-amber-300 dark:border-amber-700 px-1 py-0.5 outline-none flex-1"
                      />

                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={shift.timeSlot}
                          onChange={(e) => handleUpdateODShift(idx, 'timeSlot', e.target.value)}
                          placeholder="Time (e.g. 06:00 - 14:00)"
                          className="font-mono text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-slate-900 dark:text-white font-bold w-32"
                        />
                        {odShifts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveODShift(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition cursor-pointer"
                            title="Remove Shift"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                        Officer on Duty (Selected from {ps} PS IOs)
                      </label>
                      <select
                        value={shift.ioName}
                        onChange={(e) => handleUpdateODShift(idx, 'ioName', e.target.value)}
                        className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-bold text-xs"
                      >
                        <option value="">Select Officer for {shift.shiftName}...</option>
                        {psOfficers.map((io) => (
                          <option key={io.id} value={io.name}>
                            {io.name} ({io.rank}) {io.phone ? `— ${io.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={shift.remarks || ''}
                        onChange={(e) => handleUpdateODShift(idx, 'remarks', e.target.value)}
                        placeholder="Optional remarks (e.g. PS Desk Duty, Wireless Incharge)"
                        className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GASTI Details of Today (Morning, Day, Night, Rural, Naka) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded">
                    <Car className="w-4 h-4" />
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    GASTI (Patrol) Shifts ({gastiShifts.length} Shifts)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddGastiShift}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[11px] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Patrol Shift</span>
                </button>
              </div>

              <div className="space-y-3">
                {gastiShifts.map((shift, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={shift.shiftName}
                        onChange={(e) => handleUpdateGastiShift(idx, 'shiftName', e.target.value)}
                        placeholder="Shift Name (e.g. Night Gasti)"
                        className="font-bold text-xs text-emerald-900 dark:text-emerald-300 bg-transparent border-b border-emerald-300 dark:border-emerald-700 px-1 py-0.5 outline-none flex-1"
                      />

                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={shift.timeSlot}
                          onChange={(e) => handleUpdateGastiShift(idx, 'timeSlot', e.target.value)}
                          placeholder="Time (e.g. 22:00 - 06:00)"
                          className="font-mono text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-slate-900 dark:text-white font-bold w-32"
                        />
                        {gastiShifts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGastiShift(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition cursor-pointer"
                            title="Remove Shift"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                        Gasti Officer (from {ps} PS IOs)
                      </label>
                      <select
                        value={shift.ioName}
                        onChange={(e) => handleUpdateGastiShift(idx, 'ioName', e.target.value)}
                        className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-bold text-xs"
                      >
                        <option value="">Select Officer for {shift.shiftName}...</option>
                        {psOfficers.map((io) => (
                          <option key={io.id} value={io.name}>
                            {io.name} ({io.rank}) {io.phone ? `— ${io.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          value={shift.sectorArea || ''}
                          onChange={(e) => handleUpdateGastiShift(idx, 'sectorArea', e.target.value)}
                          placeholder="Patrol Sector / Area"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-300 font-medium"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={shift.vehicleNumber || ''}
                          onChange={(e) => handleUpdateGastiShift(idx, 'vehicleNumber', e.target.value)}
                          placeholder="Vehicle No. (e.g. BR-08-G-1234)"
                          className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Arresting Details of Last Day */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded">
                  <Shield className="w-4 h-4" />
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                  Arresting Details of Last Day
                </span>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded font-extrabold text-[11px]">
                    Total: {totalArrests}
                  </span>
                  {liquorArrests > 0 && (
                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-extrabold text-[11px] flex items-center gap-1">
                      <Wine className="w-3 h-3" />
                      Liquor: {liquorArrests}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCaseArrestRow}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Case Arrest</span>
              </button>
            </div>

            {/* Case Arrests List */}
            {caseArrests.length === 0 ? (
              <div className="py-3 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-[11px]">
                No case-specific arrests registered yesterday. Click "Add Case Arrest" if any arrests were made in cases.
              </div>
            ) : (
              <div className="space-y-3">
                {caseArrests.map((ca, idx) => {
                  // Filter cases for the selected PS
                  const activePsCases = cases.filter(
                    (c) => c.ps.toLowerCase() === ps.toLowerCase()
                  );

                  const selectedCaseObj = cases.find((c) => c.id === ca.caseId);

                  const handleCaseSelect = (caseId: string) => {
                    const matched = cases.find((c) => c.id === caseId);
                    if (matched) {
                      handleUpdateCaseArrestRow(idx, 'caseId', caseId);
                      handleUpdateCaseArrestRow(idx, 'caseNumber', `${matched.ps} PS Case No. ${matched.firNumber}`);
                      handleUpdateCaseArrestRow(idx, 'isLiquorRelated', Boolean(matched.isLiquorCase));
                      handleUpdateCaseArrestRow(idx, 'arrestedAccusedNames', []);
                      handleUpdateCaseArrestRow(idx, 'manualAccusedNames', []);
                      handleUpdateCaseArrestRow(idx, 'arrestCount', 0);
                    } else {
                      handleUpdateCaseArrestRow(idx, 'caseId', '');
                    }
                  };

                  const handleCheckboxToggle = (accusedName: string, checked: boolean) => {
                    const currentNames = ca.arrestedAccusedNames || [];
                    let nextNames: string[];
                    if (checked) {
                      nextNames = [...currentNames, accusedName];
                    } else {
                      nextNames = currentNames.filter((n) => n !== accusedName);
                    }
                    handleUpdateCaseArrestRow(idx, 'arrestedAccusedNames', nextNames);
                    handleUpdateCaseArrestRow(idx, 'arrestCount', nextNames.length + (ca.manualAccusedNames || []).length);
                  };

                  const handleAddManualName = () => {
                    const inputVal = manualInputs[idx] || '';
                    if (!inputVal.trim()) return;
                    const manualNames = ca.manualAccusedNames || [];
                    if (manualNames.includes(inputVal.trim())) {
                      alert('Name already added manually.');
                      return;
                    }
                    const nextManual = [...manualNames, inputVal.trim()];
                    handleUpdateCaseArrestRow(idx, 'manualAccusedNames', nextManual);
                    handleUpdateCaseArrestRow(idx, 'arrestCount', (ca.arrestedAccusedNames || []).length + nextManual.length);
                    setManualInputs((prev) => ({ ...prev, [idx]: '' }));
                  };

                  const handleRemoveManualName = (name: string) => {
                    const nextManual = (ca.manualAccusedNames || []).filter((n) => n !== name);
                    handleUpdateCaseArrestRow(idx, 'manualAccusedNames', nextManual);
                    handleUpdateCaseArrestRow(idx, 'arrestCount', (ca.arrestedAccusedNames || []).length + nextManual.length);
                  };

                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        {/* Select Case Dropdown */}
                        <div className="md:col-span-5">
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-wide">
                            Select Case Record *
                          </label>
                          <select
                            value={ca.caseId || ''}
                            onChange={(e) => handleCaseSelect(e.target.value)}
                            required
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                          >
                            <option value="">-- Choose Case from {ps} PS --</option>
                            {activePsCases.map((c) => (
                              <option key={c.id} value={c.id}>
                                FIR {c.firNumber} — {c.crimeHead || 'Other'} ({c.sections})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Case Number Display (Fallback for manually selected cases if necessary) */}
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-wide">
                            Case Reference Number
                          </label>
                          <input
                            type="text"
                            value={ca.caseNumber}
                            onChange={(e) => handleUpdateCaseArrestRow(idx, 'caseNumber', e.target.value)}
                            placeholder="Mapped automatically"
                            required
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                          />
                        </div>

                        {/* Liquor Related Checkbox */}
                        <div className="md:col-span-3 flex items-center pt-3.5">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200 select-none">
                            <input
                              type="checkbox"
                              checked={ca.isLiquorRelated}
                              onChange={(e) =>
                                handleUpdateCaseArrestRow(idx, 'isLiquorRelated', e.target.checked)
                              }
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                            />
                            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                              Liquor Related Case?
                            </span>
                          </label>
                        </div>

                        {/* Remove Row Button */}
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveCaseArrestRow(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 rounded-lg transition"
                            title="Remove Case Arrest Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Interactive Section if Case Object Is Selected */}
                      {selectedCaseObj && (
                        <div className="bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-fadeIn">
                          {/* Case Accused Checkbox List */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                              Select Arrested Accused (from Case Supervision list):
                            </span>
                            {selectedCaseObj.accusedList && selectedCaseObj.accusedList.filter(accused => accused.status !== 'Arrested').length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {selectedCaseObj.accusedList.filter(accused => accused.status !== 'Arrested').map((accused) => {
                                  const isArrested = (ca.arrestedAccusedNames || []).includes(accused.name);
                                  return (
                                    <label
                                      key={accused.id}
                                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition ${
                                        isArrested
                                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold'
                                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isArrested}
                                        onChange={(e) => handleCheckboxToggle(accused.name, e.target.checked)}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                      />
                                      <div className="truncate flex-1">
                                        <div className="truncate text-xs">{accused.name}</div>
                                        <div className="text-[9px] text-slate-400 font-medium">Status: {accused.status}</div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">
                                No pending accused remaining to be arrested in this case's database. All registered accused are already arrested, or you can add new arrested person manually below.
                              </p>
                            )}
                          </div>

                          {/* Manual Accused Name Addition */}
                          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                              Or Add Arrested Person manually (automatically updates case records):
                            </span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={manualInputs[idx] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setManualInputs((prev) => ({ ...prev, [idx]: val }));
                                }}
                                placeholder="Enter name of arrested person..."
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={handleAddManualName}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] transition shadow-xs cursor-pointer"
                              >
                                Add Name
                              </button>
                            </div>

                            {/* Display Manual Names */}
                            {ca.manualAccusedNames && ca.manualAccusedNames.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {ca.manualAccusedNames.map((name) => (
                                  <span
                                    key={name}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded-lg font-bold"
                                  >
                                    <span>{name} (Manual)</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveManualName(name)}
                                      className="text-rose-500 hover:text-rose-700 font-bold"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Display Row Arrest Count Summaries */}
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span>Accused Arrest Count for Row:</span>
                        <span className="text-rose-600 dark:text-rose-400 font-black text-xs">
                          {ca.arrestCount} Arrested
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Other Arresting Count */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Other Arresting (Preventive / Warrants / Miscellaneous)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter count of non-FIR preventive arrests (Sec 107/116/151 CrPC, execution of warrants, etc.)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={otherArrestsCount}
                  onChange={(e) => setOtherArrestsCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-extrabold text-right text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Leave Management (Rank-Wise) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 rounded">
                  <Users className="w-4 h-4" />
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                  Leave Management & Force Strength (Rank-Wise)
                </span>
              </div>
              <span className="text-[10px] text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded font-bold border border-cyan-200 dark:border-cyan-800">
                Live Force Status
              </span>
            </div>

            {/* Explanatory Rule Callout */}
            <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900 flex items-start gap-2 text-blue-900 dark:text-blue-200 text-[11px]">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong>Operational Rule:</strong> For Inspector, Sub-Inspector (SI), and ASI & PTC, officers who arrive or depart on leave today are considered <span className="underline decoration-blue-500 font-bold">Present for duty on that day</span>.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-3">Designation / Rank</th>
                    <th className="py-2 px-2 text-center">Sanctioned / Total</th>
                    <th className="py-2 px-2 text-center">Present</th>
                    <th className="py-2 px-2 text-center">On Leave</th>
                    <th className="py-2 px-2 text-center">Arriving Today</th>
                    <th className="py-2 px-2 text-center">Departing Today</th>
                    <th className="py-2 px-2 text-center">Effective Present</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {rankStrengths.map((item) => {
                    const isConstable = item.rank === 'Constable';
                    const effectivePresent = item.present;

                    return (
                      <tr key={item.rank} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {item.rank}
                        </td>

                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.totalStrength}
                            onChange={(e) =>
                              handleUpdateRank(item.rank, 'totalStrength', parseInt(e.target.value) || 0)
                            }
                            className="w-16 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-center font-bold"
                          />
                        </td>

                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.present}
                            onChange={(e) =>
                              handleUpdateRank(item.rank, 'present', parseInt(e.target.value) || 0)
                            }
                            className="w-16 p-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded text-center font-bold"
                          />
                        </td>

                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.onLeave}
                            onChange={(e) =>
                              handleUpdateRank(item.rank, 'onLeave', parseInt(e.target.value) || 0)
                            }
                            className="w-16 p-1 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded text-center font-bold"
                          />
                        </td>

                        <td className="py-2 px-2 text-center">
                          {!isConstable ? (
                            <input
                              type="number"
                              min="0"
                              value={item.arrivingToday || 0}
                              onChange={(e) =>
                                handleUpdateRank(item.rank, 'arrivingToday', parseInt(e.target.value) || 0)
                              }
                              className="w-16 p-1 bg-blue-50 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 rounded text-center font-bold"
                            />
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-2 px-2 text-center">
                          {!isConstable ? (
                            <input
                              type="number"
                              min="0"
                              value={item.departingToday || 0}
                              onChange={(e) =>
                                handleUpdateRank(item.rank, 'departingToday', parseInt(e.target.value) || 0)
                              }
                              className="w-16 p-1 bg-blue-50 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 rounded text-center font-bold"
                            />
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-2 px-2 text-center">
                          <span className="inline-block px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-extrabold text-[11px]">
                            {effectivePresent} Present
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Departing Officers Registry (Except Constable) */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200/60 dark:border-amber-900/60">
                    <UserMinus className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                        Departing Officers Leave Registry
                      </h5>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-extrabold text-[10px] rounded border border-amber-300 dark:border-amber-800">
                        Except Constables
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Specify officer departing & days on leave. Arrival date is computed automatically (e.g. departed 01/01/2026 for 4 days = arrival on 06/01/2026).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddDepartingOfficer}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Departing Officer</span>
                </button>
              </div>

              {departingOfficers.length === 0 ? (
                <div className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-xs">
                  No officers (Inspector, SI, ASI) departing on leave today. Click <strong className="text-slate-700 dark:text-slate-300">"Add Departing Officer"</strong> to log an officer leaving and compute their expected return date.
                </div>
              ) : (
                <div className="space-y-3">
                  {departingOfficers.map((item, idx) => {
                    const arrivalFormatted = formatIndianDate(item.arrivalDate);
                    const departureFormatted = formatIndianDate(item.departureDate);

                    return (
                      <div
                        key={item.id || idx}
                        className="p-3.5 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-900/60 space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                          {/* Officer Name */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Select Departing Officer *
                            </label>
                            {nonConstableOfficers.length > 0 ? (
                              <select
                                value={item.officerName}
                                onChange={(e) => handleUpdateDepartingOfficer(idx, 'officerName', e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold text-xs"
                              >
                                <option value="">Select Officer...</option>
                                {nonConstableOfficers.map((io) => (
                                  <option key={io.id} value={io.name}>
                                    {io.name} ({io.rank})
                                  </option>
                                ))}
                                <option value={item.officerName && !nonConstableOfficers.some(o => o.name === item.officerName) ? item.officerName : 'Custom'}>
                                  {item.officerName && !nonConstableOfficers.some(o => o.name === item.officerName) ? item.officerName : 'Other / Non-listed Officer'}
                                </option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder="Enter Officer Name..."
                                value={item.officerName}
                                onChange={(e) => handleUpdateDepartingOfficer(idx, 'officerName', e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold text-xs"
                              />
                            )}
                          </div>

                          {/* Rank */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Rank / Designation *
                            </label>
                            <select
                              value={item.rank}
                              onChange={(e) =>
                                handleUpdateDepartingOfficer(idx, 'rank', e.target.value as OfficerLeaveRank)
                              }
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold text-xs"
                            >
                              <option value="Inspector">Inspector</option>
                              <option value="Sub-Inspector (SI)">Sub-Inspector (SI)</option>
                              <option value="ASI & PTC">ASI & PTC</option>
                            </select>
                          </div>

                          {/* Departure Date */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Departure Date *
                            </label>
                            <input
                              type="date"
                              value={item.departureDate}
                              onChange={(e) => handleUpdateDepartingOfficer(idx, 'departureDate', e.target.value)}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold text-xs"
                            />
                          </div>

                          {/* Days on leave */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Days on Leave *
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.daysOnLeave}
                              onChange={(e) =>
                                handleUpdateDepartingOfficer(idx, 'daysOnLeave', Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-black text-xs text-center"
                            />
                          </div>

                          {/* Remove button */}
                          <div className="sm:col-span-1 flex justify-end pb-0.5">
                            <button
                              type="button"
                              onClick={() => handleRemoveDepartingOfficer(idx)}
                              className="p-2 text-rose-500 hover:bg-rose-100/60 dark:hover:bg-rose-950/60 rounded-lg transition"
                              title="Remove Officer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Calculated Arrival Date Notice & Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1 items-center">
                          <div className="sm:col-span-6 flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
                            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="text-xs text-emerald-900 dark:text-emerald-200">
                              <span>Expected Arrival Date: </span>
                              <strong className="text-emerald-700 dark:text-emerald-300 underline font-black text-xs">
                                {arrivalFormatted}
                              </strong>
                              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400 ml-1.5 font-medium">
                                ({departureFormatted} + {item.daysOnLeave}d leave + 1d)
                              </span>
                            </div>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Leave Type
                            </label>
                            <select
                              value={normalizeLeaveType(item.leaveType)}
                              onChange={(e) => handleUpdateDepartingOfficer(idx, 'leaveType', e.target.value)}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs font-semibold"
                            >
                              <option value="CL">CL (Casual Leave)</option>
                              <option value="CPL">CPL (Compensatory Leave)</option>
                              <option value="OTHERS">OTHERS</option>
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <input
                              type="text"
                              placeholder="Remarks (Reason, Order No...)"
                              value={item.remarks || ''}
                              onChange={(e) => handleUpdateDepartingOfficer(idx, 'remarks', e.target.value)}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 6 & 7: Major Seizure & Major Incident/Accident */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <label className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">
                  Major Seizure Last Day
                </label>
              </div>
              <textarea
                rows={3}
                value={seizuresSummary}
                onChange={(e) => setSeizuresSummary(e.target.value)}
                placeholder="e.g. 50 Litres illicit country liquor, 1 stolen motorcycle (BR-08-X-1234), ₹15,000 cash recovered."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <label className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">
                  Major Incident / Accident Last Day
                </label>
              </div>
              <textarea
                rows={3}
                value={majorIncidentsNotes}
                onChange={(e) => setMajorIncidentsNotes(e.target.value)}
                placeholder="e.g. Road accident on SH-22 near Asarganj Chowk involving tractor, injured shifted to PHC; Law & order peaceful."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              * Required fields. This report is instantly synced to SDPO Tarapur Subdivision Portal.
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Official Daily Report</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
