import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FilterOptions, PoliceStationName, CaseDesignation, CaseStatus, InvestigatingOfficer, FIRCase, PoliceStation, CrimeHead, PoliceDistrict, PoliceSubdivision, UserRole, UserAccount } from '../types';
import { INITIAL_POLICE_STATIONS } from '../data/mockData';
import { JurisdictionFilterControls } from './JurisdictionFilterControls';
import { Search, RotateCcw, Calendar, Check, ChevronDown, Download, FileSpreadsheet, Printer, FileCheck, X, CheckCircle2, ShieldAlert, Building2, Tag, Zap, CheckSquare, Square } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/reportExport';
import { CRIME_HEADS_CONFIG, ALL_CRIME_HEADS, getDynamicCrimeHeadsConfig, CrimeHeadMeta } from '../utils/crimeClassifier';
import { getUserJurisdictionContext, getPoliceStationsForJurisdiction } from '../utils/jurisdictionHelpers';

interface FIRFilterBarProps {
  filters: FilterOptions;
  onFilterChange: (newFilters: FilterOptions) => void;
  onResetFilters: () => void;
  investigatingOfficers: InvestigatingOfficer[];
  hidePSFilter?: boolean;
  filteredCases: FIRCase[];
  activePS?: PoliceStationName | null;
  availablePoliceStations?: PoliceStation[];
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  currentRole?: UserRole;
  currentUserAccount?: UserAccount | null;
  selectedDistrict?: string;
  selectedSubdivision?: string;
  onSelectDistrict?: (district: string) => void;
  onSelectSubdivision?: (subdivision: string) => void;
}

export const FIRFilterBar: React.FC<FIRFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  investigatingOfficers,
  hidePSFilter = false,
  filteredCases,
  activePS,
  availablePoliceStations,
  districts,
  subdivisions,
  currentRole = 'ADMINISTRATOR',
  currentUserAccount = null,
  selectedDistrict = 'ALL',
  selectedSubdivision = 'ALL',
  onSelectDistrict,
  onSelectSubdivision,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [crimeHeadSearch, setCrimeHeadSearch] = useState('');
  const [psSearch, setPsSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const policeStations = filters.policeStations || [];
  const statuses = filters.statuses || [];
  const designations = filters.designations || [];
  const deadlineCategories = filters.deadlineCategories || [];
  const ioNames = filters.ioNames || [];
  const crimeHeads = filters.crimeHeads || [];

  const toggleDropdown = (name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const handleChange = (key: keyof FilterOptions, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  // Toggle multi-select array values
  const toggleArrayItem = <T,>(key: keyof FilterOptions, currentArray: T[] = [], item: T) => {
    const exists = currentArray.includes(item);
    const newArray = exists ? currentArray.filter((i) => i !== item) : [...currentArray, item];
    onFilterChange({ ...filters, [key]: newArray });
  };

  // Dynamic Statutory Crime Heads Configuration
  const [statutoryConfig, setStatutoryConfig] = useState<Record<string, CrimeHeadMeta>>(() => getDynamicCrimeHeadsConfig());

  useEffect(() => {
    const handleUpdate = () => {
      setStatutoryConfig(getDynamicCrimeHeadsConfig());
    };
    window.addEventListener('sdpo-statutory-matrix-updated', handleUpdate);
    return () => window.removeEventListener('sdpo-statutory-matrix-updated', handleUpdate);
  }, []);

  const crimeHeadOptions = useMemo(() => {
    return Object.values(statutoryConfig).map((meta) => ({
      value: meta.name,
      label: meta.name,
      icon: meta.icon || '⚖️',
      subtext: `${meta.hindiName ? meta.hindiName + ' • ' : ''}BNS / SLL: ${meta.bnsSections?.slice(0, 2).join(', ') || meta.sllProvisions?.slice(0, 1).join(', ') || '-'}`,
    }));
  }, [statutoryConfig]);

  const filteredCrimeHeadOptions = useMemo(() => {
    if (!crimeHeadSearch.trim()) return crimeHeadOptions;
    const q = crimeHeadSearch.toLowerCase();
    return crimeHeadOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(q))
    );
  }, [crimeHeadOptions, crimeHeadSearch]);

  // Command Jurisdiction Scoping for Police Stations
  const { isAdministrator, isDistrictLevel, isSubdivisionLevel, userDistrict, userSubdivision } =
    getUserJurisdictionContext(currentRole, currentUserAccount);

  const activeDistrict = isAdministrator ? selectedDistrict : userDistrict;
  const activeSubdivision = isSubdivisionLevel
    ? userSubdivision
    : isDistrictLevel
    ? selectedSubdivision
    : isAdministrator
    ? selectedSubdivision
    : userSubdivision;

  const scopedStations = useMemo(() => {
    return getPoliceStationsForJurisdiction(activeDistrict, activeSubdivision, availablePoliceStations);
  }, [activeDistrict, activeSubdivision, availablePoliceStations]);

  const allPSOptions: PoliceStationName[] = useMemo(() => {
    if (activePS) {
      return [activePS];
    }
    const names = scopedStations.map((p) => p.name as PoliceStationName);
    return Array.from(new Set(names));
  }, [scopedStations, activePS]);

  // Clean up selected police stations if jurisdiction (district / subdivision) changes
  useEffect(() => {
    if (policeStations.length > 0) {
      const valid = policeStations.filter((psName) =>
        allPSOptions.some((opt) => opt.toLowerCase().trim() === psName.toLowerCase().trim())
      );
      if (valid.length !== policeStations.length) {
        handleChange('policeStations', valid);
      }
    }
  }, [allPSOptions]);

  const filteredPSOptions = useMemo(() => {
    if (!psSearch.trim()) return allPSOptions;
    const q = psSearch.toLowerCase();
    return allPSOptions.filter((ps) => ps.toLowerCase().includes(q));
  }, [allPSOptions, psSearch]);
  const allDesignationOptions: { label: string; value: CaseDesignation }[] = [
    { label: 'SR Cases (SDPO)', value: 'SR' },
    { label: 'NON-SR Cases (CI)', value: 'NON_SR' },
    { label: 'Unassigned / Pending', value: 'PENDING_DESIGNATION' },
  ];
  const allStatusOptions: { label: string; value: CaseStatus }[] = [
    { label: 'Under Investigation', value: 'Under Investigation' },
    { label: 'Disposed', value: 'Disposed' },
  ];
  const allLimitOptions: { label: string; value: 60 | 90 }[] = [
    { label: '60 Days Limit', value: 60 },
    { label: '90 Days Limit', value: 90 },
  ];

  // Report Export Handlers
  const handleExportExcel = () => {
    const headers = [
      'FIR No',
      'Police Station',
      'FIR Date',
      'Sections',
      'Punishment Term',
      'Complainant',
      'IO Name',
      'Classification',
      'Statutory Limit',
      'Status',
      'Chargesheet No',
      'Chargesheet Date',
      'CCTNS Chargesheet Sync',
      'CCTNS Case Diary Sync',
    ];

    const rows = filteredCases.map((c) => [
      c.firNumber,
      `${c.ps} PS`,
      c.firDate,
      c.sections,
      c.punishmentTerm === '7_years_or_more' ? '≥ 7 Yrs' : c.punishmentTerm === 'less_than_7_years' ? '< 7 Yrs' : 'Unclassified',
      c.complainantName,
      c.ioName,
      c.designation,
      `${c.deadlineDays} Days`,
      c.status,
      c.chargesheetNumber || 'N/A',
      c.chargesheetDate || 'N/A',
      c.chargesheetUploadedCCTNS ? 'YES' : 'NO',
      c.caseDiaryUploadedCCTNS ? 'YES' : 'NO',
    ]);

    exportToExcel('FIR_Records_Report', headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ['FIR No & PS', 'FIR Date', 'Sections & Complainant', 'Punishment', 'IO Name', 'Type', 'Status', 'CCTNS'];
    const rows = filteredCases.map((c) => [
      `FIR ${c.firNumber} (${c.ps} PS)`,
      c.firDate,
      `${c.sections} — ${c.complainantName}`,
      c.punishmentTerm === '7_years_or_more' ? '≥ 7 Yrs' : c.punishmentTerm === 'less_than_7_years' ? '< 7 Yrs' : 'General',
      c.ioName,
      c.designation,
      c.status,
      `CS: ${c.chargesheetUploadedCCTNS ? 'Synced' : 'Pending'} | CD: ${c.caseDiaryUploadedCCTNS ? 'Synced' : 'Pending'}`,
    ]);

    exportToPDF(
      'FIR & Case Register Supervision Report',
      `Filtered Report (${filteredCases.length} Cases)`,
      headers,
      rows,
      [{ label: 'Total Cases Exported', value: filteredCases.length }]
    );
  };

  return (
    <div ref={containerRef} className="bg-white dark:bg-slate-900 rounded-xl p-4.5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3.5">
      
      {/* Command Jurisdiction Filter Bar */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 dark:text-white">
              FIR Register Command Jurisdiction
            </span>
            <p className="text-[10px] text-slate-500">
              Filter FIR records across District, Subdivision & Police Station
            </p>
          </div>
        </div>
        <JurisdictionFilterControls
          currentRole={currentRole}
          currentUserAccount={currentUserAccount}
          districts={districts}
          subdivisions={subdivisions}
          availablePoliceStations={availablePoliceStations}
          selectedDistrict={selectedDistrict}
          selectedSubdivision={selectedSubdivision}
          selectedPS={policeStations.length === 1 ? policeStations[0] : 'ALL'}
          onChangeDistrict={(d) => {
            if (onSelectDistrict) onSelectDistrict(d);
            handleChange('policeStations', []);
          }}
          onChangeSubdivision={(s) => {
            if (onSelectSubdivision) onSelectSubdivision(s);
            handleChange('policeStations', []);
          }}
          onChangePS={(ps) => {
            handleChange('policeStations', ps === 'ALL' ? [] : [ps]);
          }}
          compact={true}
        />
      </div>

      {/* Top Search Bar, Export Actions & Reset */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleChange('searchQuery', e.target.value)}
            placeholder="Search everything in database (FIR #, Sections, IO, PO, Accused, Notes, CCTNS, Dates...)"
            className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
          />
        </div>

        {/* Quick Deadline Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => handleChange('deadlineStatus', 'ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap ${
              filters.deadlineStatus === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-700 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            All Limits
          </button>
          <button
            onClick={() => handleChange('deadlineStatus', 'OVERDUE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap ${
              filters.deadlineStatus === 'OVERDUE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
            }`}
          >
            Overdue (&gt;60/90d)
          </button>
          <button
            onClick={() => handleChange('deadlineStatus', 'APPROACHING')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap ${
              filters.deadlineStatus === 'APPROACHING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
            }`}
          >
            Urgent (&lt;15d)
          </button>
          <button
            onClick={() => handleChange('deadlineStatus', 'ON_TRACK')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap ${
              filters.deadlineStatus === 'ON_TRACK'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
            }`}
          >
            On Track
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition flex items-center gap-1.5 shadow-sm"
            title="Export filtered records as Excel CSV (.xls)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xls)</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded transition flex items-center gap-1.5 shadow-sm"
            title="Export official printable PDF report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF Report</span>
          </button>

          <button
            onClick={onResetFilters}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition flex items-center gap-1 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

      </div>

      {/* Multi-Select Filters Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        
        {/* Multi-Select Police Station */}
        {!hidePSFilter && (
          <div className="relative">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Police Station (Multi)
            </label>
            <button
              type="button"
              onClick={() => toggleDropdown('ps')}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs p-1.5 text-left text-slate-900 dark:text-white font-medium flex items-center justify-between"
            >
              <span className="truncate">
                {policeStations.length === 0
                  ? `All (${allPSOptions.length} PS)`
                  : `${policeStations.length} Selected`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {openDropdown === 'ps' && (
              <div className="absolute top-full left-0 mt-1 w-56 max-h-72 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 p-2 space-y-1">
                {allPSOptions.length > 5 && (
                  <div className="relative mb-1">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={psSearch}
                      onChange={(e) => setPsSearch(e.target.value)}
                      placeholder="Search stations..."
                      className="w-full pl-6 pr-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => handleChange('policeStations', [])}
                    className="text-left text-[11px] font-bold text-blue-600 dark:text-blue-400 py-1 hover:underline"
                  >
                    Clear (All {allPSOptions.length} PS)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('policeStations', allPSOptions)}
                    className="text-right text-[11px] font-bold text-slate-500 hover:underline"
                  >
                    Select All
                  </button>
                </div>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                {filteredPSOptions.length === 0 ? (
                  <div className="text-[11px] text-slate-400 p-2 text-center">No stations found</div>
                ) : (
                  filteredPSOptions.map((ps) => {
                    const checked = policeStations.some((p) => p.toLowerCase().trim() === ps.toLowerCase().trim());
                    return (
                      <label
                        key={ps}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const exists = policeStations.some((p) => p.toLowerCase().trim() === ps.toLowerCase().trim());
                            const next = exists
                              ? policeStations.filter((p) => p.toLowerCase().trim() !== ps.toLowerCase().trim())
                              : [...policeStations, ps];
                            handleChange('policeStations', next);
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{ps} PS</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Multi-Select Case Status */}
        <div className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Status (Multi)
          </label>
          <button
            type="button"
            onClick={() => toggleDropdown('status')}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs p-1.5 text-left text-slate-900 dark:text-white font-medium flex items-center justify-between"
          >
            <span className="truncate">
              {statuses.length === 0
                ? 'All Statuses'
                : `${statuses.length} Selected`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {openDropdown === 'status' && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xl z-30 p-2 space-y-1">
              <button
                type="button"
                onClick={() => handleChange('statuses', [])}
                className="w-full text-left text-[11px] font-bold text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Clear Selection (All Statuses)
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
              {allStatusOptions.map((st) => {
                const checked = statuses.includes(st.value);
                return (
                  <label
                    key={st.value}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayItem('statuses', statuses, st.value)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{st.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Separate Filter: Chargesheeted / Final Form Submitted / Mistake of Fact */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 truncate" title="Chargesheeted / Final Form / Mistake of Fact">
            CS / Final Form / MoF
          </label>
          <select
            value={filters.chargesheetedFilter || 'ALL'}
            onChange={(e) => handleChange('chargesheetedFilter', e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs p-1.5 text-slate-900 dark:text-white font-semibold focus:border-blue-500"
          >
            <option value="ALL">All (CS/FF/MoF)</option>
            <option value="YES">✓ Yes (Submitted)</option>
            <option value="NO">✕ No (Pending)</option>
          </select>
        </div>

        {/* Multi-Select Classification */}
        <div className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Classification (Multi)
          </label>
          <button
            type="button"
            onClick={() => toggleDropdown('designation')}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs p-1.5 text-left text-slate-900 dark:text-white font-medium flex items-center justify-between"
          >
            <span className="truncate">
              {designations.length === 0
                ? 'All Types'
                : `${designations.length} Selected`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {openDropdown === 'designation' && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xl z-30 p-2 space-y-1">
              <button
                type="button"
                onClick={() => handleChange('designations', [])}
                className="w-full text-left text-[11px] font-bold text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Clear Selection (All Types)
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
              {allDesignationOptions.map((des) => {
                const checked = designations.includes(des.value);
                return (
                  <label
                    key={des.value}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayItem('designations', designations, des.value)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{des.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Multi-Select Limit (60 vs 90) */}
        <div className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Statutory Limit
          </label>
          <button
            type="button"
            onClick={() => toggleDropdown('limit')}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs p-1.5 text-left text-slate-900 dark:text-white font-medium flex items-center justify-between"
          >
            <span className="truncate">
              {deadlineCategories.length === 0
                ? '60d & 90d'
                : `${deadlineCategories.length} Selected`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {openDropdown === 'limit' && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xl z-30 p-2 space-y-1">
              <button
                type="button"
                onClick={() => handleChange('deadlineCategories', [])}
                className="w-full text-left text-[11px] font-bold text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Clear Selection
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
              {allLimitOptions.map((lim) => {
                const checked = deadlineCategories.includes(lim.value);
                return (
                  <label
                    key={lim.value}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayItem('deadlineCategories', deadlineCategories, lim.value)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{lim.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Multi-Select Crime Head (Pro Interactive Selector identical to Generate Report Pro) */}
        <div className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-500" />
            <span>Crime Head</span>
          </label>
          <button
            type="button"
            onClick={() => toggleDropdown('crimeHead')}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs p-1.5 text-left text-slate-900 dark:text-white font-medium flex items-center justify-between"
          >
            <span className="truncate">
              {crimeHeads.length === 0
                ? 'All Crime Heads'
                : `${crimeHeads.length} Selected (${filters.crimeHeadMatchMode === 'ALL' ? 'AND' : 'OR'})`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {openDropdown === 'crimeHead' && (
            <div className="absolute top-full left-0 mt-1 w-72 sm:w-80 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-30 p-2.5 space-y-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={crimeHeadSearch}
                  onChange={(e) => setCrimeHeadSearch(e.target.value)}
                  placeholder="Search crime heads (e.g. Murder, Arms, Loot)..."
                  className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                {crimeHeadSearch && (
                  <button
                    type="button"
                    onClick={() => setCrimeHeadSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Match Mode Toggle & Quick Actions */}
              <div className="flex items-center justify-between gap-1 text-[11px] pt-0.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('crimeHeads', filteredCrimeHeadOptions.map((o) => o.value))}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Select All ({filteredCrimeHeadOptions.length})
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={() => handleChange('crimeHeads', [])}
                    className="text-rose-500 font-bold hover:underline"
                  >
                    Clear
                  </button>
                </div>

                {/* Match Mode (ANY vs ALL) */}
                <div className="flex items-center rounded-md bg-slate-100 dark:bg-slate-800 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleChange('crimeHeadMatchMode', 'ANY')}
                    className={`px-1.5 py-0.5 rounded transition ${
                      (filters.crimeHeadMatchMode || 'ANY') === 'ANY'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                    title="Match Any (OR) - Case matches if it has ANY of the selected crime heads"
                  >
                    OR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('crimeHeadMatchMode', 'ALL')}
                    className={`px-1.5 py-0.5 rounded transition ${
                      filters.crimeHeadMatchMode === 'ALL'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xs'
                        : 'text-slate-500'
                    }`}
                    title="Match All (AND) - Case must involve ALL selected crime heads together"
                  >
                    AND
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>

              {/* Crime Heads List */}
              <div className="max-h-52 overflow-y-auto space-y-1 divide-y divide-slate-50 dark:divide-slate-800/40">
                {filteredCrimeHeadOptions.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">
                    No crime heads found matching "{crimeHeadSearch}"
                  </div>
                ) : (
                  filteredCrimeHeadOptions.map((opt) => {
                    const checked = crimeHeads.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition select-none ${
                          checked
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArrayItem('crimeHeads', crimeHeads, opt.value)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold truncate">
                            <span>{opt.icon}</span>
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {opt.subtext && (
                            <div className="text-[10px] text-slate-400 font-normal truncate">
                              {opt.subtext}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* CCTNS Sync Toggle */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            CCTNS Sync
          </label>
          <select
            value={filters.cctnsSyncFilter || 'ALL'}
            onChange={(e) => handleChange('cctnsSyncFilter', e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs p-1.5 text-slate-900 dark:text-white font-semibold focus:border-blue-500"
          >
            <option value="ALL">All Sync Statuses</option>
            <option value="CD_SYNC">Only CD sync</option>
            <option value="CS_SYNC">Only CS sync</option>
            <option value="BOTH_SYNC">both sync</option>
            <option value="NONE_SYNC">None</option>
          </select>
        </div>

        {/* Punishment Term Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Punishment
          </label>
          <select
            value={filters.punishmentFilter || 'ALL'}
            onChange={(e) => handleChange('punishmentFilter', e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs p-1.5 text-slate-900 dark:text-white font-semibold focus:border-blue-500"
          >
            <option value="ALL">All Punishments</option>
            <option value="7_years_or_more">≥ 7 Yrs or More</option>
            <option value="less_than_7_years">&lt; 7 Yrs (Less)</option>
          </select>
        </div>

        {/* Multi-Select IO Filter (Scoped to active Police Stations in Subdivision) */}
        <div className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Officer / IO (Multi)
          </label>
          <button
            type="button"
            onClick={() => toggleDropdown('io')}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs p-1.5 text-left text-slate-900 dark:text-white font-medium flex items-center justify-between"
          >
            <span className="truncate">
              {ioNames.length === 0
                ? 'All IOs'
                : `${ioNames.length} Selected`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {openDropdown === 'io' && (
            <div className="absolute top-full right-0 mt-1 w-64 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xl z-30 p-2 space-y-1">
              <button
                type="button"
                onClick={() => handleChange('ioNames', [])}
                className="w-full text-left text-[11px] font-bold text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Clear Selection (All IOs)
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
              {(() => {
                const availableIOs = investigatingOfficers.filter((io) => {
                  if (activePS) {
                    return io.ps.toLowerCase() === activePS.toLowerCase();
                  }
                  if (policeStations.length > 0) {
                    return policeStations.some((p) => p.toLowerCase() === io.ps.toLowerCase());
                  }
                  return allPSOptions.some((p) => p.toLowerCase() === io.ps.toLowerCase());
                });

                if (availableIOs.length === 0) {
                  return (
                    <div className="text-[11px] text-slate-400 p-2 italic text-center">
                      No IOs registered for selected jurisdiction
                    </div>
                  );
                }

                return availableIOs.map((io) => {
                  const checked = ioNames.includes(io.name);
                  return (
                    <label
                      key={io.id}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleArrayItem('ioNames', ioNames, io.name)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">
                        {io.name} ({io.ps} PS)
                      </span>
                    </label>
                  );
                });
              })()}
            </div>
          )}
        </div>

      </div>

      {/* Active Crime Heads Chips Bar */}
      {crimeHeads.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-500" />
            <span>Active Crime Heads ({crimeHeads.length}):</span>
          </span>
          {crimeHeads.map((head) => {
            const meta = statutoryConfig[head] || CRIME_HEADS_CONFIG[head as CrimeHead];
            return (
              <span
                key={head}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] shadow-2xs"
              >
                <span>{meta?.icon || '⚖️'}</span>
                <span>{head}</span>
                <button
                  type="button"
                  onClick={() => toggleArrayItem('crimeHeads', crimeHeads, head)}
                  className="hover:text-rose-500 cursor-pointer ml-1"
                  title="Remove this crime head filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => handleChange('crimeHeads', [])}
            className="text-[11px] font-bold text-rose-500 hover:underline ml-1 cursor-pointer"
          >
            Clear All Heads
          </button>
        </div>
      )}

      {/* Date Range Inputs: FIR Date Range & Chargesheet Date Range */}
      <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4 pt-2.5 text-xs border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
          {/* FIR Date Range */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider whitespace-nowrap">
              FIR Date:
            </span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs px-2 py-0.5 text-slate-900 dark:text-white"
            />
            <span className="text-slate-400 text-[11px]">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs px-2 py-0.5 text-slate-900 dark:text-white"
            />
            {(filters.startDate || filters.endDate) && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, startDate: '', endDate: '' })}
                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                title="Clear FIR Date Range"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Chargesheet Date Range */}
          <div className="flex items-center gap-1.5 bg-emerald-50/70 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-900 dark:text-emerald-300 text-[11px] uppercase tracking-wider whitespace-nowrap">
              Chargesheet Date:
            </span>
            <input
              type="date"
              value={filters.chargesheetStartDate || ''}
              onChange={(e) => handleChange('chargesheetStartDate', e.target.value)}
              className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded text-xs px-2 py-0.5 text-slate-900 dark:text-white"
            />
            <span className="text-slate-400 text-[11px]">to</span>
            <input
              type="date"
              value={filters.chargesheetEndDate || ''}
              onChange={(e) => handleChange('chargesheetEndDate', e.target.value)}
              className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded text-xs px-2 py-0.5 text-slate-900 dark:text-white"
            />
            {(filters.chargesheetStartDate || filters.chargesheetEndDate) && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, chargesheetStartDate: '', chargesheetEndDate: '' })}
                className="p-0.5 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 rounded cursor-pointer"
                title="Clear Chargesheet Date Range"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Disposed Date Range */}
          <div className="flex items-center gap-1.5 bg-purple-50/70 dark:bg-purple-950/30 px-2.5 py-1 rounded-lg border border-purple-200/80 dark:border-purple-800/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="font-bold text-purple-900 dark:text-purple-300 text-[11px] uppercase tracking-wider whitespace-nowrap">
              Disposed Date:
            </span>
            <input
              type="date"
              value={filters.disposedStartDate || ''}
              onChange={(e) => handleChange('disposedStartDate', e.target.value)}
              className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded text-xs px-2 py-0.5 text-slate-900 dark:text-white"
            />
            <span className="text-slate-400 text-[11px]">to</span>
            <input
              type="date"
              value={filters.disposedEndDate || ''}
              onChange={(e) => handleChange('disposedEndDate', e.target.value)}
              className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded text-xs px-2 py-0.5 text-slate-900 dark:text-white"
            />
            {(filters.disposedStartDate || filters.disposedEndDate) && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, disposedStartDate: '', disposedEndDate: '' })}
                className="p-0.5 text-purple-600 hover:text-purple-800 dark:text-purple-400 rounded cursor-pointer"
                title="Clear Disposed Date Range"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">
          Showing <strong className="text-slate-900 dark:text-white">{filteredCases.length}</strong> matching case records
        </div>
      </div>

    </div>
  );
};
