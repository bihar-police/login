import React from 'react';
import {
  FIRCase,
  LandDispute,
  PoliceStationName,
  UserRole,
  FilterOptions,
  PoliceStation,
  PoliceSubdivision,
  PoliceDistrict,
  UserAccount,
  InvestigatingOfficer,
  DailyCrimeReport,
} from '../types';
import { getDeadlineInfo, getPSFromRole } from '../utils/helpers';
import { Shield, ShieldAlert, AlertCircle, Scale, Building2, Clock, CloudUpload, ExternalLink } from 'lucide-react';
import { InteractiveCrimeDashboard } from './InteractiveCrimeDashboard';

interface DashboardStatsProps {
  cases: FIRCase[];
  allMasterCases?: FIRCase[];
  landDisputes: LandDispute[];
  ios?: InvestigatingOfficer[];
  dailyReports?: DailyCrimeReport[];
  currentRole: UserRole;
  currentUserAccount?: UserAccount | null;
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  availablePoliceStations?: PoliceStation[];
  selectedDistrict?: string;
  selectedSubdivision?: string;
  onSelectDistrict?: (dist: string) => void;
  onSelectSubdivision?: (sub: string) => void;
  onSelectFilterPS?: (ps: PoliceStationName | 'ALL') => void;
  onTabChange: (tab: string) => void;
  onApplyFilter: (filters: Partial<FilterOptions>) => void;
  onViewCase?: (c: FIRCase) => void;
  onUpdateCasesList?: (updatedCases: FIRCase[]) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  cases,
  allMasterCases,
  landDisputes,
  ios = [],
  dailyReports = [],
  currentRole,
  currentUserAccount,
  districts = [],
  subdivisions = [],
  availablePoliceStations = [],
  selectedDistrict = 'ALL',
  selectedSubdivision = 'ALL',
  onSelectDistrict,
  onSelectSubdivision,
  onSelectFilterPS,
  onTabChange,
  onApplyFilter = (_f: Partial<FilterOptions>) => {},
  onViewCase = () => {},
  onUpdateCasesList,
}) => {
  const activePS = getPSFromRole(currentRole) || (
    currentUserAccount?.policeStation &&
    currentUserAccount.policeStation !== 'District HQ' &&
    currentUserAccount.policeStation !== 'Subdivision HQ' &&
    currentUserAccount.policeStation !== 'State Police HQ'
      ? currentUserAccount.policeStation
      : null
  );

  // Filter cases if user is logged in as a specific PS
  const visibleCases = activePS ? cases.filter((c) => c.ps.toLowerCase() === activePS.toLowerCase()) : cases;
  const visibleLandDisputes = activePS ? landDisputes.filter((l) => l.ps.toLowerCase() === activePS.toLowerCase()) : landDisputes;

  // Key metrics
  const totalCases = visibleCases.length;
  const pendingCases = visibleCases.filter((c) => c.status === 'Under Investigation');
  const completedCases = visibleCases.filter(
    (c) =>
      c.status === 'Chargesheeted / Final Form Submitted' ||
      c.status === 'Disposed' ||
      c.status === 'Chargesheeted / Final Form Submitted / Mistake of Fact'
  );

  let overdueCount = 0;
  let approachingCount = 0;
  let onTrackCount = 0;

  visibleCases.forEach((c) => {
    const info = getDeadlineInfo(c);
    if (info.code === 'OVERDUE') overdueCount++;
    else if (info.code === 'APPROACHING') approachingCount++;
    else if (info.code === 'ON_TRACK') onTrackCount++;
  });

  const srCasesCount = visibleCases.filter((c) => c.designation === 'SR').length;
  const nonSrCasesCount = visibleCases.filter((c) => c.designation === 'NON_SR').length;
  const pendingDesignationCount = visibleCases.filter((c) => c.designation === 'PENDING_DESIGNATION').length;

  const csUploadedCCTNSCount = visibleCases.filter((c) => c.chargesheetUploadedCCTNS).length;
  const cdUploadedCCTNSCount = visibleCases.filter((c) => c.caseDiaryUploadedCCTNS).length;

  const pendingLandDisputes = visibleLandDisputes.filter((l) => l.status === 'Pending').length;
  const disposedLandDisputes = visibleLandDisputes.filter((l) => l.status === 'Disposed').length;

  // Helper click handlers to jump to filtered view
  const handleClickTotalFIRs = () => {
    onApplyFilter({ statuses: [], designations: [], policeStations: [], deadlineStatus: 'ALL' });
    onTabChange('firs');
  };

  const handleClickPendingIO = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyFilter({ statuses: ['Under Investigation'] });
    onTabChange('firs');
  };

  const handleClickChargesheeted = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyFilter({ statuses: ['Chargesheeted / Final Form Submitted'] });
    onTabChange('firs');
  };

  const handleClickOverdue = () => {
    onApplyFilter({ deadlineStatus: 'OVERDUE' });
    onTabChange('firs');
  };

  const handleClickApproaching = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyFilter({ deadlineStatus: 'APPROACHING' });
    onTabChange('firs');
  };

  const handleClickOnTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyFilter({ deadlineStatus: 'ON_TRACK' });
    onTabChange('firs');
  };

  const handleClickSR = () => {
    onApplyFilter({ designations: ['SR'] });
    onTabChange('firs');
  };

  const handleClickNonSR = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyFilter({ designations: ['NON_SR'] });
    onTabChange('firs');
  };

  const handleClickPendingDesig = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyFilter({ designations: ['PENDING_DESIGNATION'] });
    onTabChange('firs');
  };

  return (
    <div className="space-y-6">
      {/* High-Level Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cases Registered Card */}
        <div
          onClick={handleClickTotalFIRs}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Total Jurisdiction FIRs
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition">
              <Shield className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2 font-heading">
              <span className="tabular-nums">{totalCases}</span>
              <span className="text-xs font-normal text-slate-400">Total Cases</span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span
                onClick={handleClickPendingIO}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                {pendingCases.length} Pending IO
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span
                onClick={handleClickChargesheeted}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {completedCases.length} Disposed
              </span>
            </div>
          </div>
        </div>

        {/* Overdue / Statutory Deadline Card */}
        <div
          onClick={handleClickOverdue}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-rose-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Statutory Deadlines (60/90d)
            </span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight flex items-baseline gap-2 font-heading">
              <span className="tabular-nums">{overdueCount}</span>
              <span className="text-xs font-normal text-rose-500/80">Overdue Cases</span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span
                onClick={handleClickApproaching}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                {approachingCount} &le;15 Days
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span
                onClick={handleClickOnTrack}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                {onTrackCount} On Track
              </span>
            </div>
          </div>
        </div>

        {/* SR / Non-SR Heinous Crime Classification Card */}
        <div
          onClick={handleClickSR}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Special Report (SR) Heinous
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/60 rounded-xl text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight flex items-baseline gap-2 font-heading">
              <span className="tabular-nums">{srCasesCount}</span>
              <span className="text-xs font-normal text-purple-500/80">Supervised SR</span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span
                onClick={handleClickNonSR}
                className="text-slate-600 dark:text-slate-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                {nonSrCasesCount} Non-SR
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span
                onClick={handleClickPendingDesig}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                {pendingDesignationCount} Pending
              </span>
            </div>
          </div>
        </div>

        {/* Land Disputes / Janata Darbar Card */}
        <div
          onClick={() => onTabChange('land_disputes')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Land Disputes (Saturday Darbar)
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition">
              <Scale className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight flex items-baseline gap-2 font-heading">
              <span className="tabular-nums">{pendingLandDisputes}</span>
              <span className="text-xs font-normal text-amber-500/80">Pending Action</span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {disposedLandDisputes} Disposed
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-slate-500 font-medium">CO-SHO Joint</span>
            </div>
          </div>
        </div>
      </div>

      {/* CCTNS Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => {
            onApplyFilter({ chargesheetCCTNS: 'YES' });
            onTabChange('firs');
          }}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-400 transition-all"
        >
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <CloudUpload className="w-3.5 h-3.5 text-blue-500" />
              <span>Chargesheet CCTNS Sync Rate</span>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums font-heading">
                {completedCases.length > 0 ? Math.round((csUploadedCCTNSCount / completedCases.length) * 100) : 0}%
              </span>
              <span className="text-xs text-slate-500">
                ({csUploadedCCTNSCount} of {completedCases.length} chargesheets synced)
              </span>
            </div>
          </div>
          <div className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            CCTNS
          </div>
        </div>

        <div
          onClick={() => {
            onApplyFilter({ caseDiaryCCTNS: 'YES' });
            onTabChange('firs');
          }}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <CloudUpload className="w-3.5 h-3.5 text-emerald-500" />
              <span>Case Diary (CD) CCTNS Upload</span>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums font-heading">
                {totalCases > 0 ? Math.round((cdUploadedCCTNSCount / totalCases) * 100) : 0}%
              </span>
              <span className="text-xs text-slate-500">
                ({cdUploadedCCTNSCount} of {totalCases} active cases synced)
              </span>
            </div>
          </div>
          <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            CD Sync
          </div>
        </div>
      </div>

      {/* Main Interactive Crime Spectrum, Multi-Level Comparisons & IO Performance Engine */}
      <InteractiveCrimeDashboard
        cases={visibleCases}
        allMasterCases={allMasterCases || cases}
        ios={ios}
        dailyReports={dailyReports}
        currentRole={currentRole}
        currentUserAccount={currentUserAccount}
        districts={districts}
        subdivisions={subdivisions}
        availablePoliceStations={availablePoliceStations}
        selectedDistrict={selectedDistrict}
        selectedSubdivision={selectedSubdivision}
        onSelectDistrict={onSelectDistrict}
        onSelectSubdivision={onSelectSubdivision}
        onApplyFilter={onApplyFilter}
        onTabChange={onTabChange}
        onViewCase={onViewCase}
        onUpdateCasesList={onUpdateCasesList}
      />
    </div>
  );
};
