import React, { useState, useEffect, useMemo } from 'react';
import {
  FIRCase,
  PoliceStationName,
  InvestigatingOfficer,
  UserRole,
  PunishmentTerm,
  PoliceStation,
  PoliceDistrict,
  PoliceSubdivision,
  UserAccount,
  CrimeHead,
} from '../types';
import {
  INITIAL_DISTRICTS,
  INITIAL_SUBDIVISIONS,
  INITIAL_POLICE_STATIONS,
} from '../data/mockData';
import { getPSFromRole } from '../utils/helpers';
import {
  CRIME_HEADS_CONFIG,
  ALL_CRIME_HEADS,
  classifyCrimeHead,
  classifyAllCrimeHeads,
  getDynamicCrimeHeadsConfig,
} from '../utils/crimeClassifier';
import {
  X,
  Shield,
  Plus,
  Calendar,
  MapPin,
  User,
  FileText,
  Clock,
  Scale,
  Building2,
  Building,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface NewFIREntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newCase: Omit<FIRCase, 'id' | 'createdAt' | 'updatedAt'>) => void;
  currentRole: UserRole;
  currentUserAccount?: UserAccount | null;
  investigatingOfficers: InvestigatingOfficer[];
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  policeStations?: PoliceStation[];
  availablePoliceStations?: PoliceStation[];
}

export const NewFIREntryModal: React.FC<NewFIREntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentRole,
  currentUserAccount,
  investigatingOfficers,
  districts = [],
  subdivisions = [],
  policeStations = [],
  availablePoliceStations,
}) => {
  const isAdministrator =
    currentRole === 'ADMINISTRATOR' ||
    currentUserAccount?.role === 'ADMINISTRATOR' ||
    currentUserAccount?.userId?.toLowerCase() === 'admin';

  const isDistrictOfficer =
    !isAdministrator &&
    (currentRole === 'SP' ||
      currentRole === 'DISTRICT_ADMIN' ||
      currentUserAccount?.role === 'SP' ||
      currentUserAccount?.role === 'DISTRICT_ADMIN' ||
      currentUserAccount?.policeStation === 'District HQ');

  const isSubdivisionOfficer =
    !isAdministrator &&
    !isDistrictOfficer &&
    (currentRole === 'SDPO' ||
      currentRole === 'CI' ||
      currentUserAccount?.role === 'SDPO' ||
      currentUserAccount?.role === 'CI' ||
      currentUserAccount?.policeStation === 'Subdivision HQ');

  // Fallback safety guards ensure the dropdowns NEVER show empty or only 4 hardcoded stations
  const effectiveDistricts = useMemo(() => {
    return districts && districts.length > 0 ? districts : INITIAL_DISTRICTS;
  }, [districts]);

  const effectiveSubdivisions = useMemo(() => {
    return subdivisions && subdivisions.length > 0 ? subdivisions : INITIAL_SUBDIVISIONS;
  }, [subdivisions]);

  const effectivePoliceStations = useMemo(() => {
    if (policeStations && policeStations.length > 0) return policeStations;
    if (availablePoliceStations && availablePoliceStations.length > 0) return availablePoliceStations;
    return INITIAL_POLICE_STATIONS;
  }, [policeStations, availablePoliceStations]);

  // Default District Resolution
  const defaultUserDistrict = useMemo(() => {
    if (currentUserAccount?.district && currentUserAccount.district !== 'ALL') {
      return currentUserAccount.district;
    }
    return effectiveDistricts[0]?.name || 'Munger';
  }, [currentUserAccount, effectiveDistricts]);

  // Default Subdivision Resolution
  const defaultUserSubdivision = useMemo(() => {
    if (isSubdivisionOfficer && currentUserAccount?.subdivision && currentUserAccount.subdivision !== 'ALL') {
      return currentUserAccount.subdivision;
    }
    const matching = effectiveSubdivisions.filter(
      (s) => !s.districtName || s.districtName.toLowerCase() === defaultUserDistrict.toLowerCase()
    );
    return matching[0]?.name || effectiveSubdivisions[0]?.name || 'Tarapur';
  }, [isSubdivisionOfficer, currentUserAccount, defaultUserDistrict, effectiveSubdivisions]);

  const activePS =
    isAdministrator || isDistrictOfficer || isSubdivisionOfficer
      ? null
      : currentUserAccount?.policeStation &&
        currentUserAccount.policeStation !== 'District HQ' &&
        currentUserAccount.policeStation !== 'Subdivision HQ'
      ? currentUserAccount.policeStation
      : getPSFromRole(currentRole);

  // Cascading Selection State
  const [selectedDistrict, setSelectedDistrict] = useState<string>(defaultUserDistrict);
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>(defaultUserSubdivision);
  const [ps, setPs] = useState<PoliceStationName>(
    (activePS as PoliceStationName) || 'Tarapur'
  );

  // Available Subdivisions based on selectedDistrict
  const availableSubdivisions = useMemo(() => {
    if (!selectedDistrict || selectedDistrict === 'ALL') return effectiveSubdivisions;
    const filtered = effectiveSubdivisions.filter(
      (s) => !s.districtName || s.districtName.toLowerCase() === selectedDistrict.toLowerCase()
    );
    return filtered.length > 0 ? filtered : effectiveSubdivisions;
  }, [selectedDistrict, effectiveSubdivisions]);

  // Available Police Stations based on selectedSubdivision
  const filteredPoliceStations = useMemo(() => {
    if (activePS) {
      return [{ id: 'ps-active', name: activePS, subdivisionName: selectedSubdivision, districtName: selectedDistrict }];
    }
    if (selectedSubdivision && selectedSubdivision !== 'ALL') {
      const match = effectivePoliceStations.filter(
        (p) =>
          !p.subdivisionName ||
          p.subdivisionName.toLowerCase() === selectedSubdivision.toLowerCase()
      );
      if (match.length > 0) return match;
    }
    if (selectedDistrict && selectedDistrict !== 'ALL') {
      const match = effectivePoliceStations.filter(
        (p) => !p.districtName || p.districtName.toLowerCase() === selectedDistrict.toLowerCase()
      );
      if (match.length > 0) return match;
    }
    return effectivePoliceStations;
  }, [selectedSubdivision, selectedDistrict, activePS, effectivePoliceStations]);

  // Sync cascading dropdowns when modal opens or selections change
  useEffect(() => {
    if (!isOpen) return;
    if (isAdministrator) {
      if (!selectedDistrict || !effectiveDistricts.some((d) => d.name.toLowerCase() === selectedDistrict.toLowerCase())) {
        setSelectedDistrict(defaultUserDistrict);
      }
    } else {
      setSelectedDistrict(defaultUserDistrict);
    }
  }, [isOpen, isAdministrator, defaultUserDistrict, effectiveDistricts]);

  useEffect(() => {
    if (!isOpen) return;
    if (isAdministrator || isDistrictOfficer) {
      if (availableSubdivisions.length > 0) {
        const match = availableSubdivisions.find(
          (s) => s.name.toLowerCase() === selectedSubdivision.toLowerCase()
        );
        if (!match) {
          setSelectedSubdivision(availableSubdivisions[0].name);
        }
      }
    } else {
      setSelectedSubdivision(defaultUserSubdivision);
    }
  }, [isOpen, availableSubdivisions, isAdministrator, isDistrictOfficer, defaultUserSubdivision]);

  useEffect(() => {
    if (!isOpen) return;
    if (activePS) {
      setPs(activePS as PoliceStationName);
    } else if (filteredPoliceStations.length > 0) {
      const match = filteredPoliceStations.find(
        (p) => p.name.toLowerCase() === ps.toLowerCase()
      );
      if (!match) {
        setPs(filteredPoliceStations[0].name as PoliceStationName);
      }
    }
  }, [isOpen, filteredPoliceStations, activePS]);

  // Filter IO list to only show IOs for the selected PS or subdivision
  const availableIOs = useMemo(() => {
    const matching = investigatingOfficers.filter(
      (io) =>
        io.ps === ps ||
        io.ps === 'Subdivision HQ' ||
        io.ps === 'District HQ' ||
        (selectedSubdivision && io.subdivision?.toLowerCase() === selectedSubdivision.toLowerCase())
    );
    return matching.length > 0 ? matching : investigatingOfficers;
  }, [investigatingOfficers, ps, selectedSubdivision]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [firNumber, setFirNumber] = useState('');
  const [firDate, setFirDate] = useState(todayStr);
  const [sections, setSections] = useState('');
  const [selectedCrimeHeads, setSelectedCrimeHeads] = useState<CrimeHead[]>(['Other / General IPC & BNS']);
  const [isCrimeHeadManuallySet, setIsCrimeHeadManuallySet] = useState(false);
  const [addHeadSelectValue, setAddHeadSelectValue] = useState('');
  const [complainantName, setComplainantName] = useState('');
  const [complainantPhone, setComplainantPhone] = useState('');
  const [placeOfOccurrence, setPlaceOfOccurrence] = useState('');
  const [ioName, setIoName] = useState(
    availableIOs[0]?.name || 'SDPO Command Desk'
  );
  const [deadlineDays, setDeadlineDays] = useState<60 | 90>(60);
  const [punishmentTerm, setPunishmentTerm] = useState<PunishmentTerm>('7_years_or_more');
  const [psProgressRemarks, setPsProgressRemarks] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFirNumber('');
      setFirDate(todayStr);
      setSections('');
      setSelectedCrimeHeads(['Other / General IPC & BNS']);
      setIsCrimeHeadManuallySet(false);
      setAddHeadSelectValue('');
      setComplainantName('');
      setComplainantPhone('');
      setPlaceOfOccurrence('');
      setDeadlineDays(60);
      setPunishmentTerm('7_years_or_more');
      setPsProgressRemarks('');
    }
  }, [isOpen]);

  // Auto-detect multi-crime heads when sections change if not manually overridden
  useEffect(() => {
    if (!isCrimeHeadManuallySet && sections.trim()) {
      const autoHeads = classifyAllCrimeHeads({
        sections,
        placeOfOccurrence,
        complainantName,
      });
      setSelectedCrimeHeads(autoHeads.length > 0 ? autoHeads : ['Other / General IPC & BNS']);
    }
  }, [sections, placeOfOccurrence, complainantName, isCrimeHeadManuallySet]);

  // Update IO selection when availableIOs change
  useEffect(() => {
    if (availableIOs.length > 0 && !availableIOs.some((io) => io.name === ioName)) {
      setIoName(availableIOs[0].name);
    }
  }, [availableIOs]);

  if (!isOpen) return null;

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

    if (!firNumber.trim() || !sections.trim() || !complainantName.trim() || !placeOfOccurrence.trim()) {
      alert('Please fill in all mandatory fields (FIR Number, Sections, Complainant, Place of Occurrence).');
      return;
    }

    const effectiveHeads = selectedCrimeHeads.length > 0 ? selectedCrimeHeads : ['Other / General IPC & BNS'];
    const primaryHead = effectiveHeads[0];
    const joinedCrimeHeadStr = effectiveHeads.join(', ');

    onSubmit({
      district: selectedDistrict,
      subdivision: selectedSubdivision,
      firNumber: firNumber.trim(),
      ps,
      firDate,
      sections: sections.trim(),
      crimeHead: primaryHead,
      crimeHeads: effectiveHeads,
      punishmentTerm,
      complainantName: complainantName.trim(),
      complainantPhone: complainantPhone.trim(),
      placeOfOccurrence: placeOfOccurrence.trim(),
      ioName,
      designation: 'PENDING_DESIGNATION', // Super User will classify later
      deadlineDays,
      status: 'Under Investigation',
      chargesheetUploadedCCTNS: false,
      caseDiaryUploadedCCTNS: false,
      psProgressRemarks: psProgressRemarks.trim() || 'FIR registered and investigation initiated.',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 flex justify-center items-start min-h-screen">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] animate-fadeIn">
        
        {/* Modal Header (Fixed/Sticky at top) */}
        <div className="shrink-0 bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">New FIR Entry Registration</h2>
                {isAdministrator && (
                  <span className="text-[10px] font-black text-rose-300 uppercase tracking-wider bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
                    Administrator Command (All Districts)
                  </span>
                )}
                {isDistrictOfficer && (
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                    District Level (SP Command)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Register case record into official crime database with statutory deadline tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body (Scrollable from top to bottom) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Cascading Jurisdiction Selection: District -> Subdivision -> Police Station */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>Jurisdiction Hierarchy & Police Station Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* 1. District Selector */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  1. District {isAdministrator && <span className="text-rose-500">*</span>}
                </label>
                {isAdministrator ? (
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                  >
                    {effectiveDistricts.map((d) => (
                      <option key={d.id || d.name} value={d.name}>
                        🏛️ {d.name} District
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-sky-500" />
                    <span>{selectedDistrict} District</span>
                  </div>
                )}
              </div>

              {/* 2. Subdivision Selector */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  2. Subdivision {(isAdministrator || isDistrictOfficer) && <span className="text-rose-500">*</span>}
                </label>
                {isAdministrator || isDistrictOfficer ? (
                  <select
                    value={selectedSubdivision}
                    onChange={(e) => setSelectedSubdivision(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                  >
                    {availableSubdivisions.length > 0 ? (
                      availableSubdivisions.map((s) => (
                        <option key={s.id || s.name} value={s.name}>
                          🏢 {s.name} Subdiv
                        </option>
                      ))
                    ) : (
                      <option value="Tarapur">🏢 Tarapur Subdiv</option>
                    )}
                  </select>
                ) : (
                  <div className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-amber-500" />
                    <span>{selectedSubdivision} Subdiv</span>
                  </div>
                )}
              </div>

              {/* 3. Police Station Selector */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  3. Police Station <span className="text-rose-500">*</span>
                </label>
                <select
                  value={ps}
                  onChange={(e) => setPs(e.target.value as PoliceStationName)}
                  disabled={Boolean(activePS)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {filteredPoliceStations.map((st) => (
                    <option key={st.id || st.name} value={st.name}>
                      👮 {st.name} PS
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* FIR Number */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                FIR Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={firNumber}
                onChange={(e) => setFirNumber(e.target.value)}
                placeholder="e.g. 145/2026"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* FIR Date */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                FIR Registration Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={firDate}
                onChange={(e) => setFirDate(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500"
              />
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Statutory Investigation Deadline */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Statutory Deadline Limit <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeadlineDays(60)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    deadlineDays === 60
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>60 Days</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeadlineDays(90)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    deadlineDays === 90
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>90 Days</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">90 days for major offences (death/life/&gt;10y), 60 days for standard cases.</p>
            </div>

            {/* Punishment Term Selector */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Punishment Term <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPunishmentTerm('7_years_or_more')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    punishmentTerm === '7_years_or_more'
                      ? 'bg-purple-600 text-white border-purple-600 shadow'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>≥ 7 Yrs or More</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPunishmentTerm('less_than_7_years')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    punishmentTerm === 'less_than_7_years'
                      ? 'bg-teal-600 text-white border-teal-600 shadow'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>&lt; 7 Yrs (Less)</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Classification for statutory arrest guidelines & judicial reporting.</p>
            </div>

          </div>

          {/* Legal Sections */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              IPC / BNS & Special Acts Sections <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={sections}
              onChange={(e) => setSections(e.target.value)}
              placeholder="e.g. Sec 302, 120B IPC / BNS Sec 103, 61 & Arms Act"
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Multi-Crime Head Classification */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
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
                  title="Auto-detect all applicable crime heads from sections and context"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Complainant Name */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Complainant Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                placeholder="Full Complainant Name"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Complainant Phone */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Complainant Phone / Mobile
              </label>
              <input
                type="text"
                value={complainantPhone}
                onChange={(e) => setComplainantPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
              />
            </div>

          </div>

          {/* Place of Occurrence */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Place of Occurrence (PO) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={placeOfOccurrence}
              onChange={(e) => setPlaceOfOccurrence(e.target.value)}
              placeholder="Village, Landmark, Ward No., Panchayat"
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Investigating Officer Dropdown */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Investigating Officer (IO) <span className="text-rose-500">*</span>
            </label>
            <select
              value={ioName}
              onChange={(e) => setIoName(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500"
            >
              {availableIOs.map((io) => (
                <option key={io.id} value={io.name}>
                  {io.name} — ({io.rank}, {io.ps})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Investigating officers affiliated with {ps} PS and subdivision headquarters.</p>
          </div>

          {/* Initial Remarks */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Initial Investigation Remarks / Notes
            </label>
            <textarea
              rows={2}
              value={psProgressRemarks}
              onChange={(e) => setPsProgressRemarks(e.target.value)}
              placeholder="Brief details of initial action taken by PS IO..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
            />
          </div>

        </form>

        {/* Modal Actions (Fixed/Docked at bottom) */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Register FIR Case</span>
          </button>
        </div>

      </div>
    </div>
  );
};
