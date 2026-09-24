import React from 'react';
import { UserRole, UserAccount, PoliceDistrict, PoliceSubdivision } from '../types';
import { getRoleDisplayTitle } from '../utils/helpers';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  FileText,
  UserCheck,
  Scale,
  AlertTriangle,
  Sun,
  Moon,
  Key,
  LogOut,
  User,
  Lock,
  Database,
  CheckCircle2,
  Bot,
  Sparkles,
  FolderTree,
  Building2,
  MapPin,
  ClipboardCheck,
} from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentUserAccount: UserAccount | null;
  onOpenUserManagement: () => void;
  onOpenHierarchyModal?: () => void;
  onOpenSupabaseConfig?: () => void;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenNewFIR: () => void;
  onOpenNewLandDispute: () => void;
  overdueCount: number;
  pendingSRCount: number;
  pendingLandDisputesCount: number;
  unreadMessagesCount?: number;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  isReadOnly?: boolean;
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  selectedDistrict?: string;
  onSelectDistrict?: (dist: string) => void;
  selectedSubdivision?: string;
  onSelectSubdivision?: (subdiv: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  currentUserAccount,
  onOpenUserManagement,
  onOpenHierarchyModal,
  onOpenSupabaseConfig,
  onLogout,
  activeTab,
  onTabChange,
  onOpenNewFIR,
  onOpenNewLandDispute,
  overdueCount,
  pendingSRCount,
  pendingLandDisputesCount,
  unreadMessagesCount = 0,
  theme = 'light',
  onToggleTheme,
  isReadOnly = false,
  districts = [],
  subdivisions = [],
  selectedDistrict = 'ALL',
  onSelectDistrict,
  selectedSubdivision = 'ALL',
  onSelectSubdivision,
}) => {
  const isAdministrator =
    currentRole === 'ADMINISTRATOR' ||
    currentUserAccount?.role === 'ADMINISTRATOR' ||
    currentUserAccount?.userId?.toLowerCase() === 'admin';

  const isDistrictLevel =
    !isAdministrator &&
    (currentRole === 'SP' ||
      currentRole === 'DISTRICT_ADMIN' ||
      currentUserAccount?.role === 'SP' ||
      currentUserAccount?.role === 'DISTRICT_ADMIN' ||
      currentUserAccount?.policeStation === 'District HQ');

  const isSubdivisionLevel =
    !isAdministrator && !isDistrictLevel && (currentRole === 'SDPO' || currentRole === 'CI');

  const isSuperUser = isAdministrator || isDistrictLevel || currentRole === 'SDPO';

  const currentDistrictName = currentUserAccount?.district || 'Munger';
  const currentSubdivName = currentUserAccount?.subdivision || 'Tarapur';

  // Subdivisions available based on administrator selected district or user's district
  const effectiveDistrict = isAdministrator
    ? selectedDistrict && selectedDistrict !== 'ALL'
      ? selectedDistrict
      : null
    : currentDistrictName;

  const districtSubdivisions = effectiveDistrict
    ? subdivisions.filter(
        (s) => !s.districtName || s.districtName.toLowerCase() === effectiveDistrict.toLowerCase()
      )
    : subdivisions;

  return (
    <header className="bg-slate-950/95 dark:bg-slate-950 text-white border-b border-slate-800/80 shadow-xs backdrop-blur-md sticky top-0 z-30">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3.5 pb-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
          
          {/* Title & Organization Sub-heading */}
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-400/25 flex items-center justify-center text-amber-400 shadow-xs ring-1 ring-amber-500/10">
              <Shield className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-sky-400" />
                  {isAdministrator
                    ? 'State Police Headquarters • Supreme Command'
                    : `Police HQ • ${currentDistrictName} District`}
                </span>
                {isAdministrator ? (
                  <span className="text-[10px] font-black text-rose-300 uppercase tracking-wider bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/30">
                    ★ Master Administrator
                  </span>
                ) : isDistrictLevel ? (
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                    • District Command (SP)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                    • {currentSubdivName} Subdivision
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white mt-0.5 font-heading">
                {isAdministrator
                  ? 'State Police Command — Crime & Jurisdictions Directorate'
                  : isDistrictLevel
                  ? `${currentDistrictName} District Police — Crime & Investigation Command`
                  : isSubdivisionLevel
                  ? `SDPO ${currentSubdivName} — Crime & Investigation Command`
                  : `${currentUserAccount?.officerName || currentUserAccount?.policeStation || 'Police Station'} — Portal`}
              </h1>
            </div>
          </div>

          {/* User Profile, User ID & Role Actions */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shadow-xs">
            
            {/* Supabase Status Button */}
            <button
              type="button"
              onClick={onOpenSupabaseConfig}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 border transition cursor-pointer ${
                isSupabaseConfigured()
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800/80'
                  : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border-amber-800/80'
              }`}
              title="Click to configure Supabase Cloud Database & run diagnostics"
            >
              <Database className="w-3 h-3 shrink-0 text-emerald-400" />
              <span>{isSupabaseConfigured() ? 'Cloud Database Active' : 'Local Storage'}</span>
            </button>

            {/* Authenticated Officer Info Badge */}
            {currentUserAccount ? (
              <div className="flex items-center gap-2 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800">
                <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{currentUserAccount.officerName}</span>
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-950/80 px-1.5 py-0.2 rounded border border-sky-800/80">
                    ID: {currentUserAccount.userId}
                  </span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${
                    currentUserAccount.permissionLevel === 'ADMIN' || isDistrictLevel || currentUserAccount.role === 'SDPO'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : currentUserAccount.permissionLevel === 'VIEWER'
                      ? 'bg-slate-800 text-slate-300 border-slate-700'
                      : 'bg-blue-900/80 text-blue-300 border-blue-700'
                  }`}>
                    {currentUserAccount.permissionLevel || (isDistrictLevel || currentUserAccount.role === 'SDPO' ? 'ADMIN' : 'EDITOR')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-slate-300 font-semibold">{getRoleDisplayTitle(currentRole)}</span>
              </div>
            )}

            {/* Hierarchy & Jurisdictions Management Button */}
            {onOpenHierarchyModal && (
              <button
                type="button"
                onClick={onOpenHierarchyModal}
                title="Manage Districts, Subdivisions & Police Stations"
                className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <FolderTree className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Hierarchy</span>
              </button>
            )}

            {/* User ID & Password Management Button */}
            <button
              onClick={onOpenUserManagement}
              title="Manage Officer User IDs & Passwords"
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Access Keys</span>
            </button>

            {/* Logout / Lock Button */}
            <button
              onClick={onLogout}
              title="Logout from portal"
              className="bg-slate-950 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-800 font-bold text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Theme Toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 rounded-lg transition flex items-center justify-center cursor-pointer"
              >
                {theme === 'light' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-indigo-300" />
                )}
              </button>
            )}

            {/* Quick Action Buttons (Hidden if Read-Only) */}
            {!isReadOnly ? (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={onOpenNewFIR}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1 rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ FIR Entry</span>
                </button>
                <button
                  onClick={onOpenNewLandDispute}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-300" />
                  <span>Land Dispute</span>
                </button>
              </div>
            ) : (
              <div className="ml-auto flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>View-Only</span>
              </div>
            )}
          </div>
        </div>

        {/* Operational Status Ticker with District Level Subdivision Switcher */}
        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs bg-slate-900/60 p-1.5 px-2.5 rounded-xl border border-slate-800/80">
          
          {/* Administrator District & Subdivision Filters */}
          {isAdministrator && (
            <div className="flex flex-wrap items-center gap-2">
              {onSelectDistrict && (
                <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-lg">
                  <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                  <span className="text-[10px] font-bold text-rose-300 whitespace-nowrap">District:</span>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => {
                      onSelectDistrict(e.target.value);
                      if (onSelectSubdivision) onSelectSubdivision('ALL');
                    }}
                    className="bg-slate-950 text-white text-[11px] font-bold border border-rose-700/60 rounded px-1.5 py-0.2 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Districts</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} District
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {onSelectSubdivision && (
                <div className="flex items-center gap-1.5 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-lg">
                  <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="text-[10px] font-bold text-sky-300 whitespace-nowrap">Subdivision:</span>
                  <select
                    value={selectedSubdivision}
                    onChange={(e) => onSelectSubdivision(e.target.value)}
                    className="bg-slate-950 text-white text-[11px] font-bold border border-sky-700/60 rounded px-1.5 py-0.2 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Subdivisions</option>
                    {districtSubdivisions.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} Subdiv
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* District Level Subdivision Switcher */}
          {!isAdministrator && isDistrictLevel && onSelectSubdivision && (
            <div className="flex items-center gap-1.5 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-lg">
              <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="text-[10px] font-bold text-sky-300 whitespace-nowrap">Subdivision:</span>
              <select
                value={selectedSubdivision}
                onChange={(e) => onSelectSubdivision(e.target.value)}
                className="bg-slate-950 text-white text-[11px] font-bold border border-sky-700/60 rounded px-1.5 py-0.2 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Subdivisions</option>
                {districtSubdivisions.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} Subdivision
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subdivision Level Locked Jurisdiction Badge */}
          {isSubdivisionLevel && (
            <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-lg">
              <Building2 className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="text-[10px] font-bold text-indigo-200">
                Subdivision: <span className="text-white font-extrabold">{currentSubdivName}</span>
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-400">Officer:</span>
            <strong className="text-white font-semibold">{currentUserAccount?.officerName || getRoleDisplayTitle(currentRole)}</strong>
          </div>

          <div className="h-3 w-px bg-slate-800 hidden sm:block"></div>

          {overdueCount > 0 ? (
            <div className="flex items-center gap-1 text-rose-300 font-extrabold bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800/60 text-[11px]">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span><strong>{overdueCount}</strong> Overdue Deadlines</span>
            </div>
          ) : (
            <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Deadlines Compliant
            </span>
          )}

          <div className="h-3 w-px bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-1 text-[11px] text-slate-300">
            <span className="text-slate-400">Special Reports:</span>
            <strong className="text-amber-400 font-bold">{pendingSRCount}</strong>
          </div>

          <div className="h-3 w-px bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-1 text-[11px] text-slate-300">
            <span className="text-slate-400">Land Disputes:</span>
            <strong className="text-emerald-400 font-bold">{pendingLandDisputesCount}</strong>
          </div>
        </div>
      </div>

      {/* Clean Modern Navigation Tab Links */}
      <div className="bg-slate-900/90 dark:bg-slate-950 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center overflow-x-auto scrollbar-none gap-1 py-1.5">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600/90 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onTabChange('firs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'firs'
                ? 'bg-indigo-600/90 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>FIR Records</span>
          </button>

          <button
            onClick={() => onTabChange('deadlines')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 relative cursor-pointer ${
              activeTab === 'deadlines'
                ? 'bg-indigo-600/90 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Deadline Monitor</span>
            {overdueCount > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 rounded-full">
                {overdueCount}
              </span>
            )}
          </button>

          {/* Supervision Status Tab - Super User (SDPO / CI / SP / Admin) */}
          {(isSuperUser || currentRole === 'CI') && (
            <button
              onClick={() => onTabChange('supervision')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'supervision'
                  ? 'bg-purple-600/90 text-white shadow-xs'
                  : 'text-purple-300 hover:text-white hover:bg-purple-950/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Supervision Status</span>
              <span className={`text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                currentRole === 'CI' ? 'bg-blue-600' : 'bg-purple-700'
              }`}>
                {currentRole === 'CI' ? 'NON-SR' : 'SR'}
              </span>
            </button>
          )}

          {/* Case Review & Parameters Tab */}
          <button
            onClick={() => onTabChange('case_review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'case_review'
                ? 'bg-indigo-600/90 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Case Review & Register</span>
            <span className="bg-purple-500/30 text-purple-200 border border-purple-400/30 text-[9px] font-black px-1.5 py-0.2 rounded-full">
              New
            </span>
          </button>

          <button
            onClick={() => onTabChange('land_disputes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'land_disputes'
                ? 'bg-indigo-600/90 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>Land Disputes</span>
          </button>

          <button
            onClick={() => onTabChange('ud_cases')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ud_cases'
                ? 'bg-indigo-600/90 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>UD & NON-SR Desk</span>
          </button>

          <button
            onClick={() => onTabChange('ios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-indigo-600/90 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>IO Management</span>
          </button>

          <button
            onClick={() => onTabChange('daily_reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 relative cursor-pointer ${
              activeTab === 'daily_reports'
                ? 'bg-indigo-600/90 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-300" />
            <span>Daily Reports</span>
            {unreadMessagesCount > 0 && (
              <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('ai_assistant')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 relative cursor-pointer ${
              activeTab === 'ai_assistant'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                : 'text-purple-300 hover:text-purple-100 hover:bg-purple-950/50'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Assistant</span>
            <span className="px-1.5 py-0.2 text-[8px] uppercase font-black bg-purple-500/20 text-purple-200 border border-purple-400/30 rounded-full">
              Gemini
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
