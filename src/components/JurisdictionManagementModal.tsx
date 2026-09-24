import React, { useState } from 'react';
import { PoliceDistrict, PoliceSubdivision, PoliceStation, UserAccount } from '../types';
import {
  MapPin,
  Building2,
  Shield,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FolderTree,
  Building,
  Phone,
  UserCheck,
  Lock,
} from 'lucide-react';

interface JurisdictionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  districts: PoliceDistrict[];
  subdivisions: PoliceSubdivision[];
  policeStations: PoliceStation[];
  currentUserAccount: UserAccount | null;
  onAddDistrict: (district: PoliceDistrict) => void;
  onUpdateDistrict: (district: PoliceDistrict) => void;
  onDeleteDistrict: (districtId: string) => void;
  onAddSubdivision: (subdiv: PoliceSubdivision) => void;
  onUpdateSubdivision: (subdiv: PoliceSubdivision) => void;
  onDeleteSubdivision: (subdivId: string) => void;
  onAddPoliceStation: (ps: PoliceStation) => void;
  onUpdatePoliceStation: (ps: PoliceStation) => void;
  onDeletePoliceStation: (psId: string) => void;
}

export const JurisdictionManagementModal: React.FC<JurisdictionManagementModalProps> = ({
  isOpen,
  onClose,
  districts,
  subdivisions,
  policeStations,
  currentUserAccount,
  onAddDistrict,
  onUpdateDistrict,
  onDeleteDistrict,
  onAddSubdivision,
  onUpdateSubdivision,
  onDeleteSubdivision,
  onAddPoliceStation,
  onUpdatePoliceStation,
  onDeletePoliceStation,
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'districts' | 'subdivisions' | 'stations'>('tree');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(districts[0]?.id || '');
  const [selectedSubdivId, setSelectedSubdivId] = useState<string>('');

  // Add District Form State
  const [isAddingDistrict, setIsAddingDistrict] = useState(false);
  const [newDistrictName, setNewDistrictName] = useState('');
  const [newDistrictState, setNewDistrictState] = useState('Bihar');
  const [newDistrictHq, setNewDistrictHq] = useState('');
  const [newDistrictDesc, setNewDistrictDesc] = useState('');

  // Add Subdivision Form State
  const [isAddingSubdiv, setIsAddingSubdiv] = useState(false);
  const [subdivTargetDistrictId, setSubdivTargetDistrictId] = useState('');
  const [newSubdivName, setNewSubdivName] = useState('');
  const [newSubdivHq, setNewSubdivHq] = useState('');
  const [newSubdivSDPO, setNewSubdivSDPO] = useState('');

  // Add Police Station Form State
  const [isAddingPS, setIsAddingPS] = useState(false);
  const [psTargetDistrictId, setPsTargetDistrictId] = useState('');
  const [psTargetSubdivId, setPsTargetSubdivId] = useState('');
  const [newPSName, setNewPSName] = useState('');
  const [newPSCode, setNewPSCode] = useState('');
  const [newPSSHO, setNewPSSHO] = useState('');
  const [newPSPhone, setNewPSPhone] = useState('');

  // Editing items
  const [editingDistrictId, setEditingDistrictId] = useState<string | null>(null);
  const [editDistrictName, setEditDistrictName] = useState('');
  const [editDistrictHq, setEditDistrictHq] = useState('');

  const [editingSubdivId, setEditingSubdivId] = useState<string | null>(null);
  const [editSubdivName, setEditSubdivName] = useState('');
  const [editSubdivHq, setEditSubdivHq] = useState('');
  const [editSubdivSDPO, setEditSubdivSDPO] = useState('');

  const [editingPSId, setEditingPSId] = useState<string | null>(null);
  const [editPSName, setEditPSName] = useState('');
  const [editPSSHO, setEditPSSHO] = useState('');
  const [editPSPhone, setEditPSPhone] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Determine user authorization
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

  // Exact permissions:
  // 1. Only Administrator can add/edit/delete Districts
  const canAddDistrict = isAdministrator;
  const canEditDistrict = isAdministrator;
  const canDeleteDistrict = isAdministrator;

  // 2. Only District Command (SP) and Administrator can add/edit/delete Subdivisions
  const canAddSubdivision = isAdministrator || isDistrictOfficer;
  const canEditSubdivision = isAdministrator || isDistrictOfficer;
  const canDeleteSubdivision = isAdministrator || isDistrictOfficer;

  // 3. PS creation: Admin (any), District Officer (any in district), Subdivision Officer (in own subdivision only)
  const canAddPS = isAdministrator || isDistrictOfficer || isSubdivisionOfficer;

  // Find user's assigned jurisdiction objects
  const userSubdivisionObj = subdivisions.find(
    (s) =>
      s.name.toLowerCase() === (currentUserAccount?.subdivision || '').toLowerCase() ||
      s.id === currentUserAccount?.subdivision
  );

  const userDistrictObj = districts.find(
    (d) =>
      d.name.toLowerCase() === (currentUserAccount?.district || '').toLowerCase() ||
      d.id === currentUserAccount?.district
  );

  const userDistrictName = userDistrictObj?.name || currentUserAccount?.district || 'Munger';
  const userSubdivisionName = userSubdivisionObj?.name || currentUserAccount?.subdivision || 'Tarapur';

  // Strictly Scoped Lists based on user hierarchy:
  // - Administrator: Can see & manage all Districts, Subdivisions, Police Stations
  // - District Command (SP): Can see/manage Subdivisions & PS of their district only
  // - Subdivision Command (SDPO): Can see/manage PS of their subdivision only
  const visibleDistricts = isAdministrator
    ? districts
    : districts.filter(
        (d) =>
          d.name.toLowerCase() === userDistrictName.toLowerCase() ||
          (userDistrictObj && d.id === userDistrictObj.id)
      );

  const visibleSubdivisions = isAdministrator
    ? subdivisions
    : isDistrictOfficer
    ? subdivisions.filter(
        (s) =>
          s.districtName?.toLowerCase() === userDistrictName.toLowerCase() ||
          (userDistrictObj && s.districtId === userDistrictObj.id)
      )
    : subdivisions.filter(
        (s) =>
          (s.name.toLowerCase() === userSubdivisionName.toLowerCase() ||
            (userSubdivisionObj && s.id === userSubdivisionObj.id)) &&
          (s.districtName?.toLowerCase() === userDistrictName.toLowerCase() ||
            (userDistrictObj && s.districtId === userDistrictObj.id))
      );

  const visiblePoliceStations = isAdministrator
    ? policeStations
    : isDistrictOfficer
    ? policeStations.filter(
        (p) =>
          p.districtName?.toLowerCase() === userDistrictName.toLowerCase() ||
          (userDistrictObj && p.districtId === userDistrictObj.id)
      )
    : policeStations.filter(
        (p) =>
          p.subdivisionName?.toLowerCase() === userSubdivisionName.toLowerCase() ||
          (userSubdivisionObj && p.subdivisionId === userSubdivisionObj.id)
      );

  // Subdivisions filtered by district
  const filteredSubdivisions = selectedDistrictId
    ? visibleSubdivisions.filter((s) => s.districtId === selectedDistrictId)
    : visibleSubdivisions;

  // Handlers for District
  const handleSaveNewDistrict = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddDistrict) {
      showFeedback('Unauthorized: Only State Police Administrator can add districts.', 'error');
      return;
    }
    if (!newDistrictName.trim()) {
      showFeedback('District Name cannot be empty.', 'error');
      return;
    }
    const cleanName = newDistrictName.trim();
    if (districts.some((d) => d.name.toLowerCase() === cleanName.toLowerCase())) {
      showFeedback(`District "${cleanName}" already exists.`, 'error');
      return;
    }

    const newDist: PoliceDistrict = {
      id: `dist-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      name: cleanName,
      state: newDistrictState.trim() || 'Bihar',
      hqName: newDistrictHq.trim() || `${cleanName} District Police HQ`,
      description: newDistrictDesc.trim() || 'Superintendent of Police Jurisdiction',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddDistrict(newDist);
    setIsAddingDistrict(false);
    setNewDistrictName('');
    setNewDistrictHq('');
    setNewDistrictDesc('');
    setSelectedDistrictId(newDist.id);
    showFeedback(`District "${cleanName}" created successfully!`);
  };

  const handleSaveEditDistrict = (dist: PoliceDistrict) => {
    if (!canEditDistrict) {
      showFeedback('Unauthorized: Only State Police Administrator can edit districts.', 'error');
      return;
    }
    if (!editDistrictName.trim()) {
      showFeedback('District name cannot be empty', 'error');
      return;
    }
    onUpdateDistrict({
      ...dist,
      name: editDistrictName.trim(),
      hqName: editDistrictHq.trim() || dist.hqName,
    });
    setEditingDistrictId(null);
    showFeedback(`District "${editDistrictName.trim()}" updated.`);
  };

  const handleDeleteDistrictConfirm = (dist: PoliceDistrict) => {
    if (!canDeleteDistrict) {
      showFeedback('Unauthorized: Only State Police Administrator can delete districts.', 'error');
      return;
    }
    const hasSubdivs = subdivisions.some((s) => s.districtId === dist.id);
    if (hasSubdivs) {
      if (!window.confirm(`District "${dist.name}" contains subdivisions. Deleting this district will remove all associated subdivisions and police stations. Proceed?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete District "${dist.name}"?`)) {
        return;
      }
    }
    onDeleteDistrict(dist.id);
    showFeedback(`District "${dist.name}" deleted.`);
  };

  // Handlers for Subdivision
  const handleSaveNewSubdivision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddSubdivision) {
      showFeedback('Unauthorized: Officers at Subdivision Command cannot add new subdivisions. Only District Command (SP) or Administrator can add subdivisions.', 'error');
      return;
    }
    const targetDistId = isDistrictOfficer && userDistrictObj
      ? userDistrictObj.id
      : (subdivTargetDistrictId || selectedDistrictId || districts[0]?.id);
    const parentDistrict = districts.find((d) => d.id === targetDistId);
    if (!parentDistrict) {
      showFeedback('Please select a valid parent District.', 'error');
      return;
    }
    if (!newSubdivName.trim()) {
      showFeedback('Subdivision Name cannot be empty.', 'error');
      return;
    }
    const cleanName = newSubdivName.trim();
    if (subdivisions.some((s) => s.districtId === targetDistId && s.name.toLowerCase() === cleanName.toLowerCase())) {
      showFeedback(`Subdivision "${cleanName}" already exists in ${parentDistrict.name} District.`, 'error');
      return;
    }

    const newSub: PoliceSubdivision = {
      id: `subdiv-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      districtId: parentDistrict.id,
      districtName: parentDistrict.name,
      name: cleanName,
      headquarters: newSubdivHq.trim() || `${cleanName} Subdivision Police HQ`,
      sdpoOfficerName: newSubdivSDPO.trim() || `SDPO ${cleanName}`,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddSubdivision(newSub);
    setIsAddingSubdiv(false);
    setNewSubdivName('');
    setNewSubdivHq('');
    setNewSubdivSDPO('');
    showFeedback(`Subdivision "${cleanName}" added under ${parentDistrict.name} District!`);
  };

  const handleSaveEditSubdivision = (sub: PoliceSubdivision) => {
    if (!canEditSubdivision) {
      showFeedback('Unauthorized: Officers at Subdivision Command cannot edit subdivisions.', 'error');
      return;
    }
    if (!editSubdivName.trim()) {
      showFeedback('Subdivision name cannot be empty', 'error');
      return;
    }
    onUpdateSubdivision({
      ...sub,
      name: editSubdivName.trim(),
      headquarters: editSubdivHq.trim() || sub.headquarters,
      sdpoOfficerName: editSubdivSDPO.trim() || sub.sdpoOfficerName,
    });
    setEditingSubdivId(null);
    showFeedback(`Subdivision "${editSubdivName.trim()}" updated.`);
  };

  const handleDeleteSubdivConfirm = (sub: PoliceSubdivision) => {
    if (!canDeleteSubdivision) {
      showFeedback('Unauthorized: Officers at Subdivision Command cannot delete subdivisions.', 'error');
      return;
    }
    const hasStations = policeStations.some((p) => p.subdivisionId === sub.id);
    if (hasStations) {
      if (!window.confirm(`Subdivision "${sub.name}" contains active police stations. Deleting it will also remove those police stations. Proceed?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete Subdivision "${sub.name}"?`)) {
        return;
      }
    }
    onDeleteSubdivision(sub.id);
    showFeedback(`Subdivision "${sub.name}" deleted.`);
  };

  // Handlers for Police Station
  const handleSaveNewPoliceStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddPS) {
      showFeedback('Unauthorized to add police stations.', 'error');
      return;
    }

    // Subdivision officers can ONLY add in their own subdivision
    let targetSubId = psTargetSubdivId || selectedSubdivId || subdivisions[0]?.id;
    if (isSubdivisionOfficer && userSubdivisionObj) {
      targetSubId = userSubdivisionObj.id;
    }

    const parentSub = subdivisions.find((s) => s.id === targetSubId);
    if (!parentSub) {
      showFeedback('Please select a valid parent Subdivision.', 'error');
      return;
    }
    if (!newPSName.trim()) {
      showFeedback('Police Station Name cannot be empty.', 'error');
      return;
    }
    const cleanName = newPSName.trim();
    if (policeStations.some((p) => p.subdivisionId === targetSubId && p.name.toLowerCase() === cleanName.toLowerCase())) {
      showFeedback(`Police Station "${cleanName}" already exists in ${parentSub.name} Subdivision.`, 'error');
      return;
    }

    const newPS: PoliceStation = {
      id: `ps-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      subdivisionId: parentSub.id,
      subdivisionName: parentSub.name,
      districtId: parentSub.districtId,
      districtName: parentSub.districtName,
      name: cleanName,
      code: newPSCode.trim().toUpperCase() || cleanName.slice(0, 3).toUpperCase(),
      shoName: newPSSHO.trim() || `SHO ${cleanName}`,
      contactNumber: newPSPhone.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddPoliceStation(newPS);
    setIsAddingPS(false);
    setNewPSName('');
    setNewPSCode('');
    setNewPSSHO('');
    setNewPSPhone('');
    showFeedback(`Police Station "${cleanName} PS" added under ${parentSub.name} Subdivision!`);
  };

  const handleSaveEditPS = (ps: PoliceStation) => {
    const canManageThisPS =
      isAdministrator ||
      isDistrictOfficer ||
      (isSubdivisionOfficer &&
        (ps.subdivisionId === userSubdivisionObj?.id ||
          ps.subdivisionName?.toLowerCase() === (currentUserAccount?.subdivision || '').toLowerCase()));

    if (!canManageThisPS) {
      showFeedback('Unauthorized: You can only edit police stations in your own subdivision.', 'error');
      return;
    }

    if (!editPSName.trim()) {
      showFeedback('Police Station name cannot be empty', 'error');
      return;
    }
    onUpdatePoliceStation({
      ...ps,
      name: editPSName.trim(),
      shoName: editPSSHO.trim() || ps.shoName,
      contactNumber: editPSPhone.trim() || ps.contactNumber,
    });
    setEditingPSId(null);
    showFeedback(`Police Station "${editPSName.trim()}" updated.`);
  };

  const handleDeletePSConfirm = (ps: PoliceStation) => {
    const canManageThisPS =
      isAdministrator ||
      isDistrictOfficer ||
      (isSubdivisionOfficer &&
        (ps.subdivisionId === userSubdivisionObj?.id ||
          ps.subdivisionName?.toLowerCase() === (currentUserAccount?.subdivision || '').toLowerCase()));

    if (!canManageThisPS) {
      showFeedback('Unauthorized: You can only delete police stations in your own subdivision.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${ps.name} Police Station?`)) {
      return;
    }
    onDeletePoliceStation(ps.id);
    showFeedback(`Police Station "${ps.name}" deleted.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-400/30 rounded-xl text-amber-400">
              <FolderTree className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  ADMINISTRATION • JURISDICTION & STRUCTURE
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.2 rounded border border-emerald-800">
                  {districts.length} Districts • {subdivisions.length} Subdivisions • {policeStations.length} PS
                </span>
              </div>
              <h2 className="text-lg font-black text-white tracking-tight mt-0.5">
                Police Hierarchy & Jurisdiction Management
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authority Banner */}
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
          isAdministrator
            ? 'bg-rose-950/60 text-rose-200 border-rose-800'
            : isDistrictOfficer
            ? 'bg-amber-950/60 text-amber-200 border-amber-800'
            : 'bg-indigo-950/60 text-indigo-200 border-indigo-800'
        }`}>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            <span>
              {isAdministrator && (
                <><strong>Master Administrator:</strong> Full control over all Districts, Subdivisions, and Police Stations (Add / Edit / Delete).</>
              )}
              {isDistrictOfficer && (
                <><strong>District Command (SP):</strong> You can create and manage Subdivisions and Police Stations within your district. District creation is restricted to State Admin.</>
              )}
              {isSubdivisionOfficer && (
                <><strong>Subdivision Command ({userSubdivisionObj?.name || 'Tarapur'} Subdiv):</strong> You can add and manage Police Stations in your subdivision only. Adding new Subdivisions is restricted to District Command (SP).</>
              )}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/40 border border-white/10">
            {isAdministrator ? 'SUPREME ADMIN' : isDistrictOfficer ? 'DISTRICT COMMAND' : 'SUBDIVISION COMMAND'}
          </span>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-slate-100 dark:bg-slate-950 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none py-2">
          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'tree'
                ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-amber-400" />
            <span>Complete Hierarchy Tree</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('districts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'districts'
                ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>Districts ({visibleDistricts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subdivisions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'subdivisions'
                ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Subdivisions ({visibleSubdivisions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stations')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'stations'
                ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-emerald-400" />
            <span>Police Stations ({visiblePoliceStations.length})</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: Complete Hierarchy Tree */}
          {activeTab === 'tree' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-900 dark:text-white">Active District:</strong> Select a district to inspect its subdivisions and police stations.
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDistrictId || visibleDistricts[0]?.id || ''}
                    onChange={(e) => setSelectedDistrictId(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {visibleDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} District
                      </option>
                    ))}
                  </select>
                  {canAddDistrict && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingDistrict(true);
                        setActiveTab('districts');
                      }}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add District</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tree Visualizer */}
              <div className="space-y-4">
                {visibleDistricts
                  .filter((d) => !selectedDistrictId || d.id === selectedDistrictId || visibleDistricts.length === 1)
                  .map((district) => {
                    const distSubdivs = visibleSubdivisions.filter((s) => s.districtId === district.id || s.districtName?.toLowerCase() === district.name.toLowerCase());

                    return (
                      <div
                        key={district.id}
                        className="bg-white dark:bg-slate-900 rounded-xl border-2 border-sky-200 dark:border-sky-900/60 overflow-hidden shadow-sm"
                      >
                        {/* District Card Header */}
                        <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-sky-950 text-white p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-400/30">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                                  DISTRICT LEVEL
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                                  {district.state || 'Bihar'}
                                </span>
                              </div>
                              <h3 className="text-base font-black text-white mt-0.5">
                                {district.name} District
                              </h3>
                              <p className="text-[11px] text-slate-300">
                                {district.hqName || `${district.name} District Police HQ`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {canAddSubdivision && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSubdivTargetDistrictId(district.id);
                                  setIsAddingSubdiv(true);
                                  setActiveTab('subdivisions');
                                }}
                                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Add Subdivision</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Subdivisions List inside District */}
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                          {distSubdivs.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                              No subdivisions registered yet in {district.name} District.
                            </div>
                          ) : (
                            distSubdivs.map((subdiv) => {
                              const subdivPS = policeStations.filter((p) => p.subdivisionId === subdiv.id);
                              const canAddPSToThisSubdiv =
                                isAdministrator ||
                                isDistrictOfficer ||
                                (isSubdivisionOfficer &&
                                  (subdiv.id === userSubdivisionObj?.id ||
                                    subdiv.name.toLowerCase() === (currentUserAccount?.subdivision || '').toLowerCase()));

                              return (
                                <div
                                  key={subdiv.id}
                                  className="ml-0 sm:ml-4 bg-white dark:bg-slate-850 rounded-xl border border-purple-200 dark:border-purple-900/50 overflow-hidden shadow-xs"
                                >
                                  {/* Subdivision Header */}
                                  <div className="bg-purple-50 dark:bg-purple-950/40 p-3.5 border-b border-purple-100 dark:border-purple-900/40 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg">
                                        <Building2 className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700 dark:text-purple-300">
                                            SUBDIVISION LEVEL
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                                            {subdivPS.length} Police Stations
                                          </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                          {subdiv.name} Subdivision
                                        </h4>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                          <span>HQ: {subdiv.headquarters || `${subdiv.name} HQ`}</span>
                                          {subdiv.sdpoOfficerName && (
                                            <>
                                              <span>•</span>
                                              <span>Officer: {subdiv.sdpoOfficerName}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {canAddPSToThisSubdiv ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPsTargetDistrictId(district.id);
                                            setPsTargetSubdivId(subdiv.id);
                                            setIsAddingPS(true);
                                            setActiveTab('stations');
                                          }}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>+ Add Police Station</span>
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic">
                                          Outside your subdivision
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Police Stations Grid */}
                                  <div className="p-3.5">
                                    {subdivPS.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic">
                                        No police stations in this subdivision yet.
                                      </p>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                        {subdivPS.map((ps) => (
                                          <div
                                            key={ps.id}
                                            className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl hover:border-emerald-300 dark:hover:border-emerald-700 transition group"
                                          >
                                            <div className="flex items-start justify-between">
                                              <div className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                                  {ps.name} PS
                                                </span>
                                              </div>
                                              {ps.code && (
                                                <span className="text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-700 px-1 rounded text-slate-700 dark:text-slate-300">
                                                  {ps.code}
                                                </span>
                                              )}
                                            </div>

                                            <div className="mt-2 text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400">
                                              {ps.shoName && (
                                                <div className="truncate flex items-center gap-1">
                                                  <UserCheck className="w-3 h-3 text-slate-400" />
                                                  <span>{ps.shoName}</span>
                                                </div>
                                              )}
                                              {ps.contactNumber && (
                                                <div className="truncate flex items-center gap-1 font-mono">
                                                  <Phone className="w-3 h-3 text-slate-400" />
                                                  <span>{ps.contactNumber}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 2: Districts Management */}
          {activeTab === 'districts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Police Districts ({districts.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Highest jurisdictional tier overseen by the Superintendent of Police (SP).
                  </p>
                </div>
                {!isAddingDistrict && canAddDistrict && (
                  <button
                    type="button"
                    onClick={() => setIsAddingDistrict(true)}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add New District</span>
                  </button>
                )}
                {!canAddDistrict && (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    District creation restricted to Administrator
                  </span>
                )}
              </div>

              {/* Add District Form */}
              {isAddingDistrict && (
                <form
                  onSubmit={handleSaveNewDistrict}
                  className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl space-y-3 animate-fadeIn"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-sky-200 dark:border-sky-800">
                    <span className="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">
                      Add New Police District
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingDistrict(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        District Name *
                      </label>
                      <input
                        type="text"
                        value={newDistrictName}
                        onChange={(e) => setNewDistrictName(e.target.value)}
                        placeholder="e.g. Munger, Bhagalpur, Patna"
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={newDistrictState}
                        onChange={(e) => setNewDistrictState(e.target.value)}
                        placeholder="e.g. Bihar"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        District HQ Name
                      </label>
                      <input
                        type="text"
                        value={newDistrictHq}
                        onChange={(e) => setNewDistrictHq(e.target.value)}
                        placeholder="e.g. Munger District Police Control Room"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Jurisdiction Description
                      </label>
                      <input
                        type="text"
                        value={newDistrictDesc}
                        onChange={(e) => setNewDistrictDesc(e.target.value)}
                        placeholder="e.g. Superintendent of Police Office"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingDistrict(false)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-sm"
                    >
                      Save District
                    </button>
                  </div>
                </form>
              )}

              {/* Districts Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">District Name</th>
                      <th className="py-2.5 px-3">State</th>
                      <th className="py-2.5 px-3">Subdivisions</th>
                      <th className="py-2.5 px-3">Police Stations</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleDistricts.map((dist) => {
                      const distSubdivCount = visibleSubdivisions.filter((s) => s.districtId === dist.id || s.districtName?.toLowerCase() === dist.name.toLowerCase()).length;
                      const distPSCount = visiblePoliceStations.filter((p) => p.districtId === dist.id || p.districtName?.toLowerCase() === dist.name.toLowerCase()).length;
                      const isEditing = editingDistrictId === dist.id;

                      return (
                        <tr key={dist.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editDistrictName}
                                onChange={(e) => setEditDistrictName(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border rounded text-xs w-full"
                              />
                            ) : (
                              <div>
                                <strong className="text-slate-900 dark:text-white block font-bold">
                                  {dist.name} District
                                </strong>
                                <span className="text-[10px] text-slate-400 block">{dist.hqName}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{dist.state || 'Bihar'}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-purple-600 dark:text-purple-400">
                              {distSubdivCount} Subdivisions
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {distPSCount} Police Stations
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {canEditDistrict ? (
                              isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditDistrict(dist)}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingDistrictId(null)}
                                    className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDistrictId(dist.id);
                                      setEditDistrictName(dist.name);
                                      setEditDistrictHq(dist.hqName || '');
                                    }}
                                    className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 rounded transition"
                                    title="Edit District"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {districts.length > 1 && canDeleteDistrict && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDistrictConfirm(dist)}
                                      className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition"
                                      title="Delete District"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium italic">Read-only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Subdivisions Management */}
          {activeTab === 'subdivisions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Police Subdivisions ({subdivisions.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Headed by the Subdivisional Police Officer (SDPO) supervising police stations within.
                  </p>
                </div>
                {!isAddingSubdiv && canAddSubdivision && (
                  <button
                    type="button"
                    onClick={() => setIsAddingSubdiv(true)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add New Subdivision</span>
                  </button>
                )}
                {!canAddSubdivision && (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    Subdivision Command cannot add new subdivisions (SP / Administrator only)
                  </span>
                )}
              </div>

              {/* Add Subdivision Form */}
              {isAddingSubdiv && (
                <form
                  onSubmit={handleSaveNewSubdivision}
                  className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-3 animate-fadeIn"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-purple-200 dark:border-purple-800">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                      Add New Police Subdivision
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingSubdiv(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Parent District *
                      </label>
                      {isAdministrator ? (
                        <select
                          value={subdivTargetDistrictId || selectedDistrictId || districts[0]?.id}
                          onChange={(e) => setSubdivTargetDistrictId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
                        >
                          {districts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} District
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300">
                          {userDistrictObj?.name || 'Munger'} District (Your Assigned District)
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Subdivision Name *
                      </label>
                      <input
                        type="text"
                        value={newSubdivName}
                        onChange={(e) => setNewSubdivName(e.target.value)}
                        placeholder="e.g. Tarapur, Munger Sadar, Kharagpur"
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Subdivision HQ Name
                      </label>
                      <input
                        type="text"
                        value={newSubdivHq}
                        onChange={(e) => setNewSubdivHq(e.target.value)}
                        placeholder="e.g. Tarapur Subdivision Police HQ"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        SDPO Officer Title / Name
                      </label>
                      <input
                        type="text"
                        value={newSubdivSDPO}
                        onChange={(e) => setNewSubdivSDPO(e.target.value)}
                        placeholder="e.g. Subdivisional Police Officer (SDPO)"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingSubdiv(false)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm"
                    >
                      Save Subdivision
                    </button>
                  </div>
                </form>
              )}

              {/* Subdivisions Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Subdivision</th>
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-3">Headquarters</th>
                      <th className="py-2.5 px-3">Police Stations</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleSubdivisions.map((sub) => {
                      const subPSCount = visiblePoliceStations.filter((p) => p.subdivisionId === sub.id || p.subdivisionName?.toLowerCase() === sub.name.toLowerCase()).length;
                      const isEditing = editingSubdivId === sub.id;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editSubdivName}
                                onChange={(e) => setEditSubdivName(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border rounded text-xs w-full"
                              />
                            ) : (
                              <div>
                                <strong className="text-slate-900 dark:text-white font-bold block">
                                  {sub.name} Subdivision
                                </strong>
                                <span className="text-[10px] text-slate-400">{sub.sdpoOfficerName}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-sky-700 dark:text-sky-400">
                              {sub.districtName || 'Munger'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editSubdivHq}
                                onChange={(e) => setEditSubdivHq(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border rounded text-xs w-full"
                              />
                            ) : (
                              sub.headquarters || '—'
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {subPSCount} PS
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {canEditSubdivision ? (
                              isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditSubdivision(sub)}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSubdivId(null)}
                                    className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSubdivId(sub.id);
                                      setEditSubdivName(sub.name);
                                      setEditSubdivHq(sub.headquarters || '');
                                      setEditSubdivSDPO(sub.sdpoOfficerName || '');
                                    }}
                                    className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 rounded transition"
                                    title="Edit Subdivision"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {canDeleteSubdivision && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubdivConfirm(sub)}
                                      className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition"
                                      title="Delete Subdivision"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium italic">Read-only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Police Stations Management */}
          {activeTab === 'stations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Police Stations ({policeStations.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Primary operational field units lodging FIRs and Daily Crime Reports.
                  </p>
                </div>
                {!isAddingPS && (
                  <button
                    type="button"
                    onClick={() => setIsAddingPS(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add New Police Station</span>
                  </button>
                )}
              </div>

              {/* Add Police Station Form */}
              {isAddingPS && (
                <form
                  onSubmit={handleSaveNewPoliceStation}
                  className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3 animate-fadeIn"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-800">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                      Add New Police Station
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingPS(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Parent Subdivision *
                      </label>
                      {isSubdivisionOfficer ? (
                        <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300">
                          {userSubdivisionObj?.name || currentUserAccount?.subdivision || 'Tarapur'} Subdivision (Your Jurisdiction)
                        </div>
                      ) : isDistrictOfficer ? (
                        <select
                          value={psTargetSubdivId || selectedSubdivId || (userDistrictObj ? subdivisions.find(s => s.districtId === userDistrictObj.id)?.id : subdivisions[0]?.id)}
                          onChange={(e) => setPsTargetSubdivId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
                        >
                          {subdivisions
                            .filter((s) => !userDistrictObj || s.districtId === userDistrictObj.id || s.districtName?.toLowerCase() === (currentUserAccount?.district || '').toLowerCase())
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} Subdiv ({s.districtName || 'Munger'})
                              </option>
                            ))}
                        </select>
                      ) : (
                        <select
                          value={psTargetSubdivId || selectedSubdivId || subdivisions[0]?.id}
                          onChange={(e) => setPsTargetSubdivId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
                        >
                          {subdivisions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} Subdiv ({s.districtName || 'Munger'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Police Station Name *
                      </label>
                      <input
                        type="text"
                        value={newPSName}
                        onChange={(e) => setNewPSName(e.target.value)}
                        placeholder="e.g. Tarapur, Kotwali, Kharagpur"
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Station Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={newPSCode}
                        onChange={(e) => setNewPSCode(e.target.value)}
                        placeholder="e.g. TAR, ASR, KTW"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono uppercase text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Station House Officer (SHO)
                      </label>
                      <input
                        type="text"
                        value={newPSSHO}
                        onChange={(e) => setNewPSSHO(e.target.value)}
                        placeholder="e.g. Inspector Ram Ashish Singh"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Official Contact Number / CCTNS Landline
                      </label>
                      <input
                        type="text"
                        value={newPSPhone}
                        onChange={(e) => setNewPSPhone(e.target.value)}
                        placeholder="e.g. 06342-234222"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPS(false)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                    >
                      Save Police Station
                    </button>
                  </div>
                </form>
              )}

              {/* Police Stations Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Police Station</th>
                      <th className="py-2.5 px-3">Subdivision</th>
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-3">SHO Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visiblePoliceStations.map((ps) => {
                      const isEditing = editingPSId === ps.id;
                      const canManageThisPS =
                        isAdministrator ||
                        isDistrictOfficer ||
                        (isSubdivisionOfficer &&
                          (ps.subdivisionId === userSubdivisionObj?.id ||
                            ps.subdivisionName?.toLowerCase() === (currentUserAccount?.subdivision || '').toLowerCase()));

                      return (
                        <tr key={ps.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editPSName}
                                onChange={(e) => setEditPSName(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border rounded text-xs w-full"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {ps.name} PS
                                </span>
                                {ps.code && (
                                  <span className="text-[9px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                    {ps.code}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-purple-700 dark:text-purple-300 font-medium">
                            {ps.subdivisionName || 'Tarapur'}
                          </td>
                          <td className="py-3 px-3 text-sky-700 dark:text-sky-300 font-medium">
                            {ps.districtName || 'Munger'}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editPSSHO}
                                onChange={(e) => setEditPSSHO(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border rounded text-xs w-full"
                              />
                            ) : (
                              ps.shoName || '—'
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editPSPhone}
                                onChange={(e) => setEditPSPhone(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border rounded text-xs w-full"
                              />
                            ) : (
                              ps.contactNumber || '—'
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {canManageThisPS ? (
                              isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditPS(ps)}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPSId(null)}
                                    className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPSId(ps.id);
                                      setEditPSName(ps.name);
                                      setEditPSSHO(ps.shoName || '');
                                      setEditPSPhone(ps.contactNumber || '');
                                    }}
                                    className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded transition"
                                    title="Edit Police Station"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePSConfirm(ps)}
                                    className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition"
                                    title="Delete Police Station"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium italic">Other Subdiv</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <span>Changes are saved in real-time and immediately accessible across all portal modules.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
