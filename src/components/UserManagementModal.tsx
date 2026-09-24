import React, { useState } from 'react';
import {
  UserAccount,
  UserRole,
  PoliceStationName,
  PermissionLevel,
  PoliceDistrict,
  PoliceSubdivision,
  PoliceStation,
} from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  Shield,
  User,
  Key,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Database,
  CheckCircle2,
  MapPin,
  FolderTree,
  Copy,
  Check,
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: UserAccount[];
  currentUserAccount: UserAccount | null;
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  policeStations?: PoliceStation[];
  onUpdateAccount: (updatedAccount: UserAccount) => void;
  onAddAccount: (newAccount: UserAccount) => void;
  onDeleteAccount?: (accountId: string) => void;
  onResetToDefaults: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currentUserAccount,
  districts = [],
  subdivisions = [],
  policeStations = [],
  onUpdateAccount,
  onAddAccount,
  onDeleteAccount,
  onResetToDefaults,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editOfficerName, setEditOfficerName] = useState('');
  const [editRank, setEditRank] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('PS_TARAPUR');
  const [editPermissionLevel, setEditPermissionLevel] = useState<PermissionLevel>('EDITOR');
  const [editDistrict, setEditDistrict] = useState('Munger');
  const [editSubdivision, setEditSubdivision] = useState('Tarapur');
  const [editPS, setEditPS] = useState<PoliceStationName>('Tarapur');
  
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add account form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newOfficerName, setNewOfficerName] = useState('');
  const [newRank, setNewRank] = useState('Station House Officer (SHO)');
  const [newRole, setNewRole] = useState<UserRole>('SHO');
  const [newPermissionLevel, setNewPermissionLevel] = useState<PermissionLevel>('EDITOR');
  const [newDistrict, setNewDistrict] = useState(districts[0]?.name || 'Munger');
  const [newSubdivision, setNewSubdivision] = useState('Tarapur');
  const [newPS, setNewPS] = useState<PoliceStationName>('Tarapur');

  if (!isOpen) return null;

  const isAdministrator =
    currentUserAccount?.role === 'ADMINISTRATOR' ||
    currentUserAccount?.userId?.toLowerCase() === 'admin';

  const isDistrictOfficer =
    !isAdministrator &&
    (currentUserAccount?.role === 'SP' ||
      currentUserAccount?.role === 'DISTRICT_ADMIN' ||
      currentUserAccount?.policeStation === 'District HQ');

  const isSubdivisionOfficer =
    !isAdministrator &&
    !isDistrictOfficer &&
    (currentUserAccount?.role === 'SDPO' ||
      currentUserAccount?.role === 'CI' ||
      currentUserAccount?.policeStation === 'Subdivision HQ');

  const isPSOfficer = !isAdministrator && !isDistrictOfficer && !isSubdivisionOfficer;

  // Exact Add User Privileges:
  // - Administrator: Full Control (any district, subdiv, PS)
  // - District Command (SP): Can add users of his district ONLY
  // - Subdivision Command (SDPO/CI): Can add users of his subdivision ONLY
  // - PS Command (SHO/IO/Operator/Reader): CANNOT add users
  const canAddUser = isAdministrator || isDistrictOfficer || isSubdivisionOfficer;

  const userDistrict = (currentUserAccount?.district || 'Munger').trim();
  const userSubdivision = (currentUserAccount?.subdivision || 'Tarapur').trim();

  // Strict Hierarchical Access Key Visibility:
  // 1. Administrator: Can see access keys of all user accounts across all districts & subdivisions.
  // 2. SP / District Command: Can see access keys of his whole district (SDPOs, CIs, SHOs, Operators, and other officers in his district).
  //    SP cannot see Master Admin, and cannot see officers of other districts.
  // 3. SDPO / Subdivision Command: Can see access keys of his whole subdivision (SDPO, CI, SHOs, Operators, and PS officers in his subdivision).
  //    SDPO cannot see Master Admin, SP/District HQ, or other subdivisions / other districts.
  // 4. PS Level Officer: Can only see their own access key.
  const displayedAccounts = accounts.filter((a) => {
    // 1. Master Administrator sees all accounts across the state
    if (isAdministrator) {
      return true;
    }

    const accDistrict = (a.district || '').trim();
    const accSubdivision = (a.subdivision || '').trim();
    const accRole = (a.role || '').toUpperCase();
    const accUserId = (a.userId || '').toLowerCase();

    // Never show Master Administrator credentials to non-administrators
    if (accRole === 'ADMINISTRATOR' || accUserId === 'admin') {
      return false;
    }

    // 2. SP / District Level Command:
    if (isDistrictOfficer) {
      if (!accDistrict || accDistrict.toUpperCase() === 'ALL') {
        return false;
      }
      return accDistrict.toLowerCase() === userDistrict.toLowerCase();
    }

    // 3. SDPO / Subdivision Level Command:
    if (isSubdivisionOfficer) {
      // Cannot see SP or District HQ accounts
      if (accRole === 'SP' || accRole === 'DISTRICT_ADMIN' || a.policeStation === 'District HQ') {
        return false;
      }
      const matchesDistrict = Boolean(accDistrict && accDistrict.toLowerCase() === userDistrict.toLowerCase());
      const matchesSubdivision = Boolean(
        accSubdivision &&
        accSubdivision.toUpperCase() !== 'ALL' &&
        accSubdivision.toLowerCase() === userSubdivision.toLowerCase()
      );

      return matchesDistrict && matchesSubdivision;
    }

    // 4. PS Level Officer: Only their own account
    return a.id === currentUserAccount?.id || accUserId === currentUserAccount?.userId?.toLowerCase();
  });

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllPasswords = () => {
    const nextState = !showAllPasswords;
    setShowAllPasswords(nextState);
    const updated: Record<string, boolean> = {};
    displayedAccounts.forEach((acc) => {
      updated[acc.id] = nextState;
    });
    setShowPasswords(updated);
  };

  const handleCopyCredentials = (acc: UserAccount) => {
    const credText = `User ID: ${acc.userId}\nPassword: ${acc.password}\nOfficer: ${acc.officerName} (${acc.rank})\nJurisdiction: ${acc.policeStation} (${acc.subdivision || 'HQ'}, ${acc.district})`;
    navigator.clipboard.writeText(credText).then(() => {
      setCopiedId(acc.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleDeleteUser = (acc: UserAccount) => {
    if (!canAddUser) {
      setErrorMsg('Permission Denied: Police Station level officers cannot delete user accounts.');
      return;
    }

    if (currentUserAccount?.id === acc.id) {
      setErrorMsg('Action Denied: You cannot delete your own active account while logged in.');
      return;
    }

    // Check scope
    if (isDistrictOfficer && acc.district && acc.district.toLowerCase() !== userDistrict.toLowerCase()) {
      setErrorMsg(`Permission Denied: You can only delete accounts within ${userDistrict} District.`);
      return;
    }

    if (isSubdivisionOfficer && acc.subdivision && acc.subdivision.toLowerCase() !== userSubdivision.toLowerCase()) {
      setErrorMsg(`Permission Denied: You can only delete accounts within ${userSubdivision} Subdivision.`);
      return;
    }

    setDeletingId(acc.id);
    setErrorMsg('');
  };

  const confirmDeleteUser = (acc: UserAccount) => {
    if (onDeleteAccount) {
      onDeleteAccount(acc.id);
      setSuccessMsg(`User account (${acc.userId}) deleted successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
    setDeletingId(null);
  };

  const startEdit = (acc: UserAccount) => {
    setEditingId(acc.id);
    setEditUserId(acc.userId);
    setEditPassword(acc.password);
    setEditOfficerName(acc.officerName);
    setEditRank(acc.rank);
    setEditRole(acc.role);
    setEditPermissionLevel(acc.permissionLevel || (acc.role === 'SDPO' || acc.role === 'SP' || acc.role === 'ADMINISTRATOR' ? 'ADMIN' : 'EDITOR'));
    setEditDistrict(acc.district || userDistrict);
    setEditSubdivision(acc.subdivision || userSubdivision);
    setEditPS(acc.policeStation || 'Tarapur');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSaveEdit = (acc: UserAccount) => {
    const isEditingSelf = currentUserAccount?.id === acc.id;
    if (!canAddUser && !isEditingSelf) {
      setErrorMsg('Permission Denied: Police station level officers cannot modify other users.');
      return;
    }

    if (isDistrictOfficer && acc.district && acc.district.toLowerCase() !== userDistrict.toLowerCase()) {
      setErrorMsg(`Permission Denied: You can only modify accounts within ${userDistrict} District.`);
      return;
    }

    if (isSubdivisionOfficer && acc.subdivision && acc.subdivision.toLowerCase() !== userSubdivision.toLowerCase()) {
      setErrorMsg(`Permission Denied: You can only modify accounts within ${userSubdivision} Subdivision.`);
      return;
    }

    if (!editUserId.trim() || !editPassword.trim()) {
      setErrorMsg('User ID and Password cannot be empty.');
      return;
    }

    // Check duplicate User ID in another account
    const duplicate = accounts.find(
      (a) => a.id !== acc.id && a.userId.toLowerCase() === editUserId.trim().toLowerCase()
    );
    if (duplicate) {
      setErrorMsg(`User ID "${editUserId}" is already assigned to another account.`);
      return;
    }

    const updated: UserAccount = {
      ...acc,
      userId: editUserId.trim(),
      password: editPassword.trim(),
      officerName: editOfficerName.trim() || acc.officerName,
      rank: editRank.trim() || acc.rank,
      role: canAddUser ? editRole : acc.role,
      permissionLevel: canAddUser ? editPermissionLevel : acc.permissionLevel,
      district: isAdministrator ? editDistrict : (acc.district || userDistrict),
      subdivision: isAdministrator || isDistrictOfficer ? editSubdivision : (acc.subdivision || userSubdivision),
      policeStation: canAddUser ? editPS : acc.policeStation,
    };

    onUpdateAccount(updated);
    setEditingId(null);
    setSuccessMsg(`Credentials for ${updated.officerName} (${updated.userId}) updated successfully!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddUser) {
      setErrorMsg('Permission Denied: Police station level officers cannot create user accounts.');
      return;
    }

    if (!newUserId.trim() || !newPassword.trim() || !newOfficerName.trim()) {
      setErrorMsg('Please fill in User ID, Password, and Officer Name.');
      return;
    }

    const duplicate = accounts.find(
      (a) => a.userId.toLowerCase() === newUserId.trim().toLowerCase()
    );
    if (duplicate) {
      setErrorMsg(`User ID "${newUserId}" already exists.`);
      return;
    }

    const targetDistrict = isAdministrator ? newDistrict : userDistrict;
    const targetSubdivision = isAdministrator
      ? (newRole === 'SP' || newRole === 'DISTRICT_ADMIN' ? '' : newSubdivision)
      : isDistrictOfficer
      ? (newRole === 'SP' || newRole === 'DISTRICT_ADMIN' ? '' : newSubdivision)
      : userSubdivision;

    const targetPS =
      newRole === 'SP' || newRole === 'DISTRICT_ADMIN'
        ? 'District HQ'
        : newRole === 'SDPO' || newRole === 'CI'
        ? 'Subdivision HQ'
        : newPS;

    const created: UserAccount = {
      id: `user-${Date.now()}`,
      userId: newUserId.trim().toLowerCase(),
      password: newPassword.trim(),
      role: newRole,
      permissionLevel: newPermissionLevel,
      officerName: newOfficerName.trim(),
      rank: newRank.trim(),
      district: targetDistrict,
      subdivision: targetSubdivision,
      policeStation: targetPS,
      isActive: true,
    };

    onAddAccount(created);
    setIsAddingNew(false);
    setNewUserId('');
    setNewPassword('');
    setNewOfficerName('');
    setSuccessMsg(`New user account (${created.userId}) created successfully!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleResetDefaults = () => {
    if (!isAdministrator) {
      setErrorMsg('Permission Denied: Only Master Administrator can reset all credentials to defaults.');
      return;
    }
    setIsConfirmingReset(true);
  };

  const confirmResetDefaults = () => {
    onResetToDefaults();
    setIsConfirmingReset(false);
    setSuccessMsg('All user credentials have been reset to factory defaults.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-400/30">
              <Key className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">
                  PORTAL ACCESS KEYS & CREDENTIALS
                </span>
                {isAdministrator ? (
                  <span className="bg-rose-500/20 text-rose-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-rose-500/40 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-rose-400" /> Master Admin — All Districts
                  </span>
                ) : isDistrictOfficer ? (
                  <span className="bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-amber-500/40 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-400" /> District Command (SP) — Whole {userDistrict} District
                  </span>
                ) : isSubdivisionOfficer ? (
                  <span className="bg-sky-500/20 text-sky-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-sky-500/40 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-sky-400" /> Subdivision Command (SDPO) — Whole {userSubdivision} Subdivision
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-slate-700 uppercase">
                    Individual Officer Account
                  </span>
                )}

                {/* Supabase status badge */}
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                    isSupabaseConfigured()
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800'
                  }`}
                >
                  <Database className="w-2.5 h-2.5" />
                  {isSupabaseConfigured() ? 'Supabase Cloud Sync' : 'Local Storage Mode'}
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white mt-0.5">
                Officer Access Keys & User Account Credentials
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Notifications */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>Access Keys ({displayedAccounts.length} Active Accounts)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  {isAdministrator
                    ? 'Statewide Scope (All Districts)'
                    : isDistrictOfficer
                    ? `${userDistrict} District Scope (SP, SDPOs, CIs, SHOs)`
                    : isSubdivisionOfficer
                    ? `${userSubdivision} Subdivision Scope (SDPO, CI, SHOs)`
                    : `${currentUserAccount?.policeStation || 'PS Level'}`}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdministrator && 'Master Administrator: Access keys of all police officers across all districts and subdivisions are visible.'}
                {isDistrictOfficer && `District Chief (SP): Access keys of your entire district (${userDistrict}) are visible, including SDPOs, CIs, and SHOs.`}
                {isSubdivisionOfficer && `Subdivision Officer (SDPO): Access keys of your entire subdivision (${userSubdivision}) are visible, including CI, SHOs, and PS officers.`}
                {isPSOfficer && 'Police Station Level: You can view and copy your own credentials only.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {displayedAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllPasswords}
                  className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  title={showAllPasswords ? 'Hide All Passwords' : 'Show All Passwords'}
                >
                  {showAllPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showAllPasswords ? 'Hide All Keys' : 'Reveal All Keys'}</span>
                </button>
              )}

              {canAddUser ? (
                <>
                  <button
                    onClick={() => {
                      setIsAddingNew(true);
                      setNewDistrict(userDistrict);
                      setNewSubdivision(userSubdivision);
                      const matchingPs = policeStations.filter(
                        (p) => !p.subdivisionName || p.subdivisionName.toLowerCase() === userSubdivision.toLowerCase()
                      );
                      if (matchingPs[0]) setNewPS(matchingPs[0].name);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>
                      {isAdministrator
                        ? '+ Add New Officer Account'
                        : isDistrictOfficer
                        ? `+ Add User (${userDistrict} District)`
                        : `+ Add User (${userSubdivision} Subdiv)`}
                    </span>
                  </button>

                  {isAdministrator && (
                    isConfirmingReset ? (
                      <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-950 p-1.5 rounded-lg border border-amber-300 dark:border-amber-700">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Reset all users to defaults?</span>
                        <button
                          type="button"
                          onClick={confirmResetDefaults}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded cursor-pointer"
                        >
                          Yes, Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingReset(false)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleResetDefaults}
                        className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                        title="Reset all User IDs and Passwords to initial defaults"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Defaults</span>
                      </button>
                    )
                  )}
                </>
              ) : (
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Police Station Command cannot add new users</span>
                </div>
              )}
            </div>
          </div>

          {/* Create New Account Form (Admin / District / Subdiv Command Only) */}
          {isAddingNew && canAddUser && (
            <form onSubmit={handleCreateAccount} className="p-4 bg-blue-50/70 dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-900 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-blue-200 dark:border-slate-700 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>
                    Create New Officer Account —{' '}
                    {isAdministrator
                      ? 'Master Admin Creation'
                      : isDistrictOfficer
                      ? `${userDistrict} District Officer`
                      : `${userSubdivision} Subdivision Officer`}
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Officer Name *
                  </label>
                  <input
                    type="text"
                    value={newOfficerName}
                    onChange={(e) => setNewOfficerName(e.target.value)}
                    placeholder="e.g. SI Anand Kumar"
                    required
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official User ID *
                  </label>
                  <input
                    type="text"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="e.g. sho.tarapur2"
                    required
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-blue-700 dark:text-blue-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password (Access Key) *
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. pass@1234"
                    required
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Designation / Rank
                  </label>
                  <input
                    type="text"
                    value={newRank}
                    onChange={(e) => setNewRank(e.target.value)}
                    placeholder="e.g. Station House Officer (SHO)"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {/* District Selection / Lock */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    District
                  </label>
                  {isAdministrator ? (
                    <select
                      value={newDistrict}
                      onChange={(e) => {
                        const dist = e.target.value;
                        setNewDistrict(dist);
                        const matchSubs = subdivisions.filter((s) => !s.districtName || s.districtName.toLowerCase() === dist.toLowerCase());
                        if (matchSubs[0]) setNewSubdivision(matchSubs[0].name);
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                    >
                      {districts.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} District
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{userDistrict} District</span>
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">
                        Locked
                      </span>
                    </div>
                  )}
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    User Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setNewRole(r);
                      if (r === 'SP' || r === 'DISTRICT_ADMIN') {
                        setNewPS('District HQ');
                        setNewSubdivision('');
                        setNewPermissionLevel('ADMIN');
                      } else if (r === 'SDPO' || r === 'CI') {
                        setNewPS('Subdivision HQ');
                        setNewPermissionLevel(r === 'SDPO' ? 'ADMIN' : 'EDITOR');
                      } else if (r === 'OPERATOR') {
                        setNewPermissionLevel('OPERATOR');
                      }
                    }}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                  >
                    {isAdministrator && (
                      <optgroup label="System / Master">
                        <option value="ADMINISTRATOR">Administrator (Master Control)</option>
                      </optgroup>
                    )}
                    {(isAdministrator || isDistrictOfficer) && (
                      <optgroup label="District Command">
                        {isAdministrator && <option value="SP">Superintendent of Police (SP / District Chief)</option>}
                        <option value="DISTRICT_ADMIN">District Command / Crime Bureau</option>
                      </optgroup>
                    )}
                    {(isAdministrator || isDistrictOfficer) && (
                      <optgroup label="Subdivision Command">
                        <option value="SDPO">Subdivisional Police Officer (SDPO)</option>
                        <option value="CI">Circle Inspector (CI)</option>
                      </optgroup>
                    )}
                    <optgroup label="Police Station Level">
                      <option value="SHO">Station House Officer (SHO)</option>
                      <option value="OPERATOR">Computer Operator (Daily Crime Reports)</option>
                      <option value="PS_TARAPUR">PS Tarapur Officer</option>
                      <option value="PS_ASARGANJ">PS Asarganj Officer</option>
                      <option value="PS_SANGRAMPUR">PS Sangrampur Officer</option>
                      <option value="PS_HARPUR">PS Harpur Officer</option>
                    </optgroup>
                  </select>
                </div>

                {/* Subdivision Selection / Lock */}
                {newRole !== 'SP' && newRole !== 'DISTRICT_ADMIN' && (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subdivision
                    </label>
                    {isSubdivisionOfficer ? (
                      <div className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>{userSubdivision} Subdivision</span>
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                          Locked
                        </span>
                      </div>
                    ) : (
                      <select
                        value={newSubdivision}
                        onChange={(e) => {
                          const sub = e.target.value;
                          setNewSubdivision(sub);
                          const firstPs = policeStations.find((p) => p.subdivisionName?.toLowerCase() === sub.toLowerCase());
                          if (firstPs) setNewPS(firstPs.name);
                        }}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                      >
                        {subdivisions
                          .filter((s) => !s.districtName || s.districtName.toLowerCase() === (isAdministrator ? newDistrict : userDistrict).toLowerCase())
                          .map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name} Subdivision
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Police Station Dropdown */}
                {newRole !== 'SP' && newRole !== 'DISTRICT_ADMIN' && newRole !== 'SDPO' && newRole !== 'CI' && (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Police Station
                    </label>
                    <select
                      value={newPS}
                      onChange={(e) => setNewPS(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                    >
                      {policeStations
                        .filter(
                          (ps) =>
                            !ps.subdivisionName ||
                            ps.subdivisionName.toLowerCase() === (isSubdivisionOfficer ? userSubdivision : newSubdivision).toLowerCase()
                        )
                        .map((ps) => (
                          <option key={ps.id} value={ps.name}>
                            {ps.name} PS
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Permission Level *
                  </label>
                  <select
                    value={newPermissionLevel}
                    onChange={(e) => setNewPermissionLevel(e.target.value as PermissionLevel)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-bold text-amber-700 dark:text-amber-400"
                  >
                    <option value="EDITOR">EDITOR — Can View, Add & Update Cases</option>
                    <option value="OPERATOR">OPERATOR — Viewer-like (Daily Crime Reports Entry Only)</option>
                    <option value="VIEWER">VIEWER — Read-Only Access (No Edit Rights)</option>
                    {(isAdministrator || isDistrictOfficer) && (
                      <option value="ADMIN">ADMIN — Super User (Full Control & Manage Accounts)</option>
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2 md:col-span-3 flex justify-end gap-2 pt-2 border-t border-blue-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-1.5 rounded-lg transition text-xs shadow-sm cursor-pointer"
                  >
                    Save & Activate Officer Account
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Accounts Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-[10px]">
                  <th className="p-3">Police Station / Unit</th>
                  <th className="p-3">Officer Name & Rank</th>
                  <th className="p-3">Permission Level</th>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Access Key (Password)</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {displayedAccounts.map((acc) => {
                  const isEditing = editingId === acc.id;
                  const isVisiblePass = showPasswords[acc.id] || showAllPasswords;
                  const isCopied = copiedId === acc.id;

                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      {/* PS / Jurisdiction */}
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-bold">{acc.policeStation}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 space-y-0.5">
                          <span className="block font-medium text-slate-600 dark:text-slate-300">
                            {acc.district || 'Munger'} {acc.subdivision ? `• ${acc.subdivision} Subdiv` : '• District HQ'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">Role: {acc.role}</span>
                        </div>
                      </td>

                      {/* Officer Name */}
                      <td className="p-3">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editOfficerName}
                              onChange={(e) => setEditOfficerName(e.target.value)}
                              className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-300 rounded text-xs font-semibold"
                              placeholder="Officer Name"
                            />
                            <input
                              type="text"
                              value={editRank}
                              onChange={(e) => setEditRank(e.target.value)}
                              className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-300 rounded text-[11px]"
                              placeholder="Rank / Designation"
                            />
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {acc.officerName}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {acc.rank}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Permission Level Badge / Selector */}
                      <td className="p-3">
                        {isEditing && canAddUser ? (
                          <select
                            value={editPermissionLevel}
                            onChange={(e) => setEditPermissionLevel(e.target.value as PermissionLevel)}
                            className="p-1 bg-white dark:bg-slate-900 border border-amber-400 rounded text-xs font-bold text-amber-700 dark:text-amber-300"
                          >
                            {(isAdministrator || isDistrictOfficer) && <option value="ADMIN">ADMIN (Super User)</option>}
                            <option value="EDITOR">EDITOR (Add/Edit)</option>
                            <option value="OPERATOR">OPERATOR (Daily Reports Only)</option>
                            <option value="VIEWER">VIEWER (Read Only)</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                              acc.permissionLevel === 'ADMIN' || acc.role === 'SDPO'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : acc.permissionLevel === 'OPERATOR'
                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : acc.permissionLevel === 'VIEWER'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                : 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {acc.permissionLevel || (acc.role === 'SDPO' ? 'ADMIN' : 'EDITOR')}
                          </span>
                        )}
                      </td>

                      {/* User ID */}
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editUserId}
                            onChange={(e) => setEditUserId(e.target.value)}
                            className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-300 rounded text-xs font-mono font-bold text-blue-700 dark:text-blue-400"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded border border-blue-200 dark:border-blue-900 inline-block">
                              {acc.userId}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Password / Access Key */}
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-300 rounded text-xs font-mono font-bold text-slate-800 dark:text-white"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs font-bold px-2 py-1 rounded border transition ${
                              isVisiblePass
                                ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                            }`}>
                              {isVisiblePass ? acc.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(acc.id)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                              title={isVisiblePass ? 'Hide Access Key' : 'Reveal Access Key'}
                            >
                              {isVisiblePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-amber-500" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(acc)}
                              className={`p-1 rounded transition cursor-pointer ${
                                isCopied
                                  ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950'
                                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800'
                              }`}
                              title="Copy Credentials to Clipboard"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(acc)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : deletingId === acc.id ? (
                          <div className="flex items-center justify-end gap-1.5 bg-rose-50 dark:bg-rose-950/80 p-1.5 rounded-lg border border-rose-300 dark:border-rose-800 animate-fadeIn">
                            <span className="text-[11px] font-bold text-rose-800 dark:text-rose-200">Delete user?</span>
                            <button
                              type="button"
                              onClick={() => confirmDeleteUser(acc)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded transition shadow-xs cursor-pointer"
                            >
                              Yes, Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] rounded transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {(canAddUser || currentUserAccount?.id === acc.id) && (
                              <button
                                onClick={() => startEdit(acc)}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded border border-slate-300 dark:border-slate-700 transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3 text-slate-500" />
                                <span>Edit</span>
                              </button>
                            )}
                            {canAddUser && (
                              <button
                                onClick={() => handleDeleteUser(acc)}
                                disabled={currentUserAccount?.id === acc.id}
                                className={`px-2 py-1 rounded border transition inline-flex items-center gap-1 cursor-pointer ${
                                  currentUserAccount?.id === acc.id
                                    ? 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                    : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                }`}
                                title={currentUserAccount?.id === acc.id ? 'Cannot delete active logged in account' : 'Delete User Account'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-xs font-bold">Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 rounded-lg text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
            <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <strong>Supervisory Access Key Hierarchy:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10px]">
                <li><strong>Administrator:</strong> Can view, manage, and reset access keys across all Districts & Subdivisions.</li>
                <li><strong>SP (District Command):</strong> Can view and manage access keys for all officers within their District (SDPO, CI, SHO, and PS officers).</li>
                <li><strong>SDPO (Subdivision Command):</strong> Can view and manage access keys for all officers within their Subdivision (CI, SHO, and PS officers).</li>
              </ul>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 font-bold text-xs rounded-lg transition cursor-pointer"
          >
            Close Settings
          </button>
        </div>

      </div>
    </div>
  );
};
