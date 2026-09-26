import React, { useMemo } from 'react';
import { PoliceDistrict, PoliceSubdivision, PoliceStation, UserRole, UserAccount } from '../types';
import {
  getUserJurisdictionContext,
  getEffectiveDistricts,
  getSubdivisionsForDistrict,
  getPoliceStationsForJurisdiction,
} from '../utils/jurisdictionHelpers';
import { Building2, MapPin, Shield, Layers, Filter } from 'lucide-react';

interface JurisdictionFilterControlsProps {
  currentRole: UserRole;
  currentUserAccount: UserAccount | null;
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  availablePoliceStations?: PoliceStation[];
  selectedDistrict: string;
  selectedSubdivision: string;
  selectedPS: string;
  onChangeDistrict: (district: string) => void;
  onChangeSubdivision: (subdivision: string) => void;
  onChangePS: (ps: string) => void;
  compact?: boolean;
  className?: string;
  includeAllOption?: boolean;
}

export const JurisdictionFilterControls: React.FC<JurisdictionFilterControlsProps> = ({
  currentRole,
  currentUserAccount,
  districts,
  subdivisions,
  availablePoliceStations,
  selectedDistrict,
  selectedSubdivision,
  selectedPS,
  onChangeDistrict,
  onChangeSubdivision,
  onChangePS,
  compact = false,
  className = '',
  includeAllOption = true,
}) => {
  const { isAdministrator, isDistrictLevel, userDistrict, userSubdivision, isSubdivisionLevel, isPSLevel } =
    getUserJurisdictionContext(currentRole, currentUserAccount);

  const effectiveDistricts = useMemo(() => getEffectiveDistricts(districts), [districts]);

  // For SP and below, active district is always userDistrict
  const activeDistrict = isAdministrator ? selectedDistrict : userDistrict;

  // Available subdivisions based on role & active district
  const availableSubdivisions = useMemo(() => {
    return getSubdivisionsForDistrict(activeDistrict, subdivisions, districts);
  }, [activeDistrict, subdivisions, districts]);

  // Available police stations based on role, district, and selected subdivision
  const availableStations = useMemo(() => {
    const activeSubdiv = isSubdivisionLevel
      ? userSubdivision
      : isDistrictLevel
      ? selectedSubdivision
      : isAdministrator
      ? selectedSubdivision
      : userSubdivision;

    return getPoliceStationsForJurisdiction(activeDistrict, activeSubdiv, availablePoliceStations);
  }, [activeDistrict, selectedSubdivision, isSubdivisionLevel, isDistrictLevel, isAdministrator, userSubdivision, availablePoliceStations]);

  // Handlers with cascading resets
  const handleDistrictChange = (dist: string) => {
    onChangeDistrict(dist);
    onChangeSubdivision('ALL');
    onChangePS('ALL');
  };

  const handleSubdivisionChange = (subdiv: string) => {
    onChangeSubdivision(subdiv);
    onChangePS('ALL');
  };

  const handlePSChange = (ps: string) => {
    onChangePS(ps);
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* 1. DISTRICT FILTER */}
      {isAdministrator ? (
        <div className="flex items-center gap-1.5 min-w-[150px]">
          {!compact && (
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-500" />
              <span>District:</span>
            </label>
          )}
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full text-xs font-bold py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
            title="Filter by Police District"
          >
            {includeAllOption && <option value="ALL">All Districts (State View)</option>}
            {effectiveDistricts.map((d) => (
              <option key={d.id || d.name} value={d.name}>
                {d.name} District
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-bold shrink-0">
          <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>District: {userDistrict}</span>
        </div>
      )}

      {/* 2. SUBDIVISION FILTER */}
      {isAdministrator || isDistrictLevel ? (
        <div className="flex items-center gap-1.5 min-w-[150px]">
          {!compact && (
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-500" />
              <span>Subdivision:</span>
            </label>
          )}
          <select
            value={selectedSubdivision}
            onChange={(e) => handleSubdivisionChange(e.target.value)}
            className="w-full text-xs font-bold py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
            title="Filter by Police Subdivision"
          >
            {includeAllOption && (
              <option value="ALL">
                {isDistrictLevel ? 'All Subdivisions (District View)' : 'All Subdivisions'}
              </option>
            )}
            {availableSubdivisions.map((s) => (
              <option key={s.id || s.name} value={s.name}>
                {s.name} Subdiv
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300 rounded-lg text-xs font-bold shrink-0">
          <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Subdiv: {userSubdivision}</span>
        </div>
      )}

      {/* 3. POLICE STATION FILTER */}
      {!isPSLevel ? (
        <div className="flex items-center gap-1.5 min-w-[160px]">
          {!compact && (
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-emerald-500" />
              <span>Station:</span>
            </label>
          )}
          <select
            value={selectedPS}
            onChange={(e) => handlePSChange(e.target.value)}
            className="w-full text-xs font-bold py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
            title="Filter by Police Station"
          >
            {includeAllOption && <option value="ALL">All Police Stations</option>}
            <option value="Subdivision HQ">Subdivision HQ</option>
            {availableStations.map((ps) => (
              <option key={ps.id || ps.name} value={ps.name}>
                {ps.name} PS
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-bold shrink-0">
          <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Station: {currentUserAccount?.policeStation || 'Local PS'}</span>
        </div>
      )}
    </div>
  );
};
