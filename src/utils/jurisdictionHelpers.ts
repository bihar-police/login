import { PoliceDistrict, PoliceSubdivision, PoliceStation, PoliceStationName, UserRole, UserAccount } from '../types';
import { INITIAL_DISTRICTS, INITIAL_SUBDIVISIONS, INITIAL_POLICE_STATIONS } from '../data/mockData';

export function getEffectiveDistricts(districts?: PoliceDistrict[]): PoliceDistrict[] {
  if (districts && districts.length > 0) return districts;
  return INITIAL_DISTRICTS;
}

export function getEffectiveSubdivisions(subdivisions?: PoliceSubdivision[]): PoliceSubdivision[] {
  if (subdivisions && subdivisions.length > 0) return subdivisions;
  return INITIAL_SUBDIVISIONS;
}

export function getEffectivePoliceStations(policeStations?: PoliceStation[]): PoliceStation[] {
  if (policeStations && policeStations.length > 0) return policeStations;
  return INITIAL_POLICE_STATIONS;
}

export function getDistrictForPS(psName?: string, policeStations?: PoliceStation[]): string {
  if (!psName) return 'Munger';
  const stations = getEffectivePoliceStations(policeStations);
  const found = stations.find((p) => p.name.toLowerCase() === psName.toLowerCase());
  if (found?.districtName) return found.districtName;
  const lower = psName.toLowerCase();
  if (['kotwali bhagalpur', 'ishakchak', 'babarganj', 'bhagalpur sadar', 'kahalgaon', 'sanokhar'].includes(lower)) {
    return 'Bhagalpur';
  }
  return 'Munger';
}

export function getSubdivisionForPS(psName?: string, policeStations?: PoliceStation[]): string {
  if (!psName) return 'Tarapur';
  const stations = getEffectivePoliceStations(policeStations);
  const found = stations.find((p) => p.name.toLowerCase() === psName.toLowerCase());
  if (found?.subdivisionName) return found.subdivisionName;
  const lower = psName.toLowerCase();
  if (['tarapur', 'asarganj', 'sangrampur', 'harpur'].includes(lower)) return 'Tarapur';
  if (['munger kotwali', 'kotwali', 'kasim bazar', 'purabsarai', 'mufassil', 'muffasil', 'nayaramnagar', 'safiasarai'].includes(lower)) return 'Munger Sadar';
  if (['kharagpur', 'shamshabad', 'tetiyabambar', 'gangta'].includes(lower)) return 'Kharagpur';
  if (['bhagalpur sadar', 'kotwali bhagalpur', 'ishakchak', 'babarganj'].includes(lower)) return 'Bhagalpur Sadar';
  if (['kahalgaon', 'sanokhar'].includes(lower)) return 'Kahalgaon';
  return 'Tarapur';
}

/**
 * Filter subdivisions based on district. If districtName is 'ALL' or empty, returns all subdivisions.
 */
export function getSubdivisionsForDistrict(
  districtName: string,
  subdivisions?: PoliceSubdivision[],
  districts?: PoliceDistrict[]
): PoliceSubdivision[] {
  const allSubdivs = getEffectiveSubdivisions(subdivisions);
  if (!districtName || districtName === 'ALL') return allSubdivs;
  
  // Find district by name or ID
  const allDists = getEffectiveDistricts(districts);
  const distObj = allDists.find(
    (d) => d.name.toLowerCase() === districtName.toLowerCase() || d.id.toLowerCase() === districtName.toLowerCase()
  );

  return allSubdivs.filter((s) => {
    if (s.districtName && s.districtName.toLowerCase() === districtName.toLowerCase()) return true;
    if (distObj && s.districtId && s.districtId.toLowerCase() === distObj.id.toLowerCase()) return true;
    return false;
  });
}

/**
 * Filter police stations based on district and subdivision.
 */
export function getPoliceStationsForJurisdiction(
  districtName: string,
  subdivisionName: string,
  policeStations?: PoliceStation[]
): PoliceStation[] {
  const allStations = getEffectivePoliceStations(policeStations);
  return allStations.filter((ps) => {
    if (districtName && districtName !== 'ALL') {
      const psDistrict = ps.districtName || getDistrictForPS(ps.name, allStations);
      if (psDistrict.toLowerCase() !== districtName.toLowerCase()) return false;
    }
    if (subdivisionName && subdivisionName !== 'ALL') {
      const psSubdiv = ps.subdivisionName || getSubdivisionForPS(ps.name, allStations);
      if (psSubdiv.toLowerCase() !== subdivisionName.toLowerCase()) return false;
    }
    return true;
  });
}

/**
 * Checks if a record (FIR, UD, IO, Land Dispute, Daily Report) matches the given jurisdiction criteria.
 */
export function matchesJurisdictionFilter(
  item: { ps?: string; district?: string; subdivision?: string },
  districtFilter: string = 'ALL',
  subdivisionFilter: string = 'ALL',
  psFilter: string = 'ALL',
  policeStations?: PoliceStation[]
): boolean {
  const stations = getEffectivePoliceStations(policeStations);

  // District Match
  if (districtFilter && districtFilter !== 'ALL') {
    const itemDistrict = item.district || getDistrictForPS(item.ps, stations);
    if (itemDistrict.toLowerCase() !== districtFilter.toLowerCase()) return false;
  }

  // Subdivision Match
  if (subdivisionFilter && subdivisionFilter !== 'ALL') {
    const itemSubdiv = item.subdivision || getSubdivisionForPS(item.ps, stations);
    if (itemSubdiv.toLowerCase() !== subdivisionFilter.toLowerCase()) return false;
  }

  // Police Station Match
  if (psFilter && psFilter !== 'ALL') {
    if (!item.ps || item.ps.toLowerCase() !== psFilter.toLowerCase()) return false;
  }

  return true;
}

/**
 * Determine user role jurisdiction capabilities:
 * - isAdministrator: Can view and select State (All), any District, any Subdivision, any PS
 * - isDistrictLevel (SP / District Admin): District is locked to their assigned district. Can select any Subdivision & PS in their district.
 * - isSubdivisionLevel (SDPO / CI): District & Subdivision locked. Can select any PS in their subdivision.
 * - isPSLevel: Locked to their PS.
 */
export function getUserJurisdictionContext(
  currentRole: UserRole,
  currentUserAccount: UserAccount | null
) {
  const isAdministrator =
    currentRole === 'ADMINISTRATOR' ||
    currentRole === 'ADMIN' ||
    currentUserAccount?.role === 'ADMINISTRATOR' ||
    currentUserAccount?.role === 'ADMIN';

  const isDistrictLevel =
    !isAdministrator &&
    (currentRole === 'SP' ||
      currentRole === 'DISTRICT_ADMIN' ||
      currentUserAccount?.role === 'SP' ||
      currentUserAccount?.role === 'DISTRICT_ADMIN' ||
      currentUserAccount?.policeStation === 'District HQ');

  const isSubdivisionLevel =
    !isAdministrator &&
    !isDistrictLevel &&
    (currentRole === 'SDPO' ||
      currentRole === 'CI' ||
      currentUserAccount?.role === 'SDPO' ||
      currentUserAccount?.role === 'CI' ||
      currentUserAccount?.policeStation === 'Subdivision HQ');

  const userDistrict = currentUserAccount?.district || 'Munger';
  const userSubdivision = currentUserAccount?.subdivision || 'Tarapur';

  return {
    isAdministrator,
    isDistrictLevel,
    isSubdivisionLevel,
    isPSLevel: !isAdministrator && !isDistrictLevel && !isSubdivisionLevel,
    userDistrict,
    userSubdivision,
  };
}
