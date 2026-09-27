import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FIRCase,
  PoliceStation,
  UserRole,
  UserAccount,
} from '../types';
import {
  Calendar,
  Download,
  Search,
  RotateCcw,
  TrendingUp,
  BarChart2,
  PieChart as PieChartIcon,
  Crosshair,
  Clock,
  Flame,
  Eye,
  X,
  ChevronDown,
  Filter,
  Check,
  Building2,
  Scale,
  Shield,
  AlertTriangle,
  FileCheck,
  SlidersHorizontal,
  MapPin,
  Lock,
} from 'lucide-react';
import { exportToExcel } from '../utils/reportExport';
import { getDeadlineInfo, isCaseCompleted } from '../utils/helpers';

export interface CrimeSpectrumComparisonProps {
  cases: FIRCase[];
  availablePoliceStations?: PoliceStation[];
  currentRole: UserRole;
  currentUserAccount?: UserAccount | null;
  activePS?: string | null;
  onViewCase?: (c: FIRCase) => void;
}

// Canonical Crime Heads matching image styling & categories
export const DISPLAY_CRIME_HEADS = [
  'Assault',
  'Attempt to Murder',
  'Culpable Homicide',
  'Dacoity',
  'Extortion',
  'Fraud',
  'Murder',
  'Other',
  'Ransom',
  'Robbery',
  'Theft',
  'POCSO Act',
  'Excise / Liquor',
  'Arms Act',
  'NDPS Act',
  'Cyber Crime',
];

// Color mapping precisely calibrated with the image
export const CRIME_COLORS: Record<string, string> = {
  'Assault': '#ec4899',           // Pink/Magenta
  'Attempt to Murder': '#f43f5e', // Rose Red
  'Culpable Homicide': '#f97316', // Orange
  'Dacoity': '#10b981',           // Emerald Green
  'Extortion': '#06b6d4',         // Cyan Blue
  'Fraud': '#ef4444',             // Bright Red
  'Murder': '#b91c1c',            // Deep Crimson Red
  'Other': '#f59e0b',             // Amber/Golden Orange
  'Ransom': '#3b82f6',            // Royal Blue
  'Robbery': '#eab308',           // Yellow
  'Theft': '#8b5cf6',             // Purple/Violet
  'POCSO Act': '#a855f7',         // Violet
  'Excise / Liquor': '#14b8a6',   // Teal
  'Arms Act': '#6366f1',          // Indigo
  'NDPS Act': '#0284c7',          // Sky Blue
  'Cyber Crime': '#059669',       // Deep Emerald
};

// Strict isolation of crime heads (Attempt to Murder strictly separated from Murder)
export function getStrictCrimeHead(caseItem: FIRCase): string {
  const ch = (caseItem.crimeHead || '').trim().toLowerCase();
  const sec = (caseItem.sections || '').trim().toLowerCase();
  const combined = `${ch} ${sec}`;

  // 1. Attempt to Murder FIRST
  if (
    ch.includes('attempt to murder') ||
    ch.includes('attempted murder') ||
    combined.includes('307') ||
    combined.includes('109 bns')
  ) {
    return 'Attempt to Murder';
  }

  // 2. Murder
  if (
    ch.includes('murder') ||
    combined.includes('302') ||
    combined.includes('103 bns')
  ) {
    return 'Murder';
  }

  // 3. Culpable Homicide
  if (
    ch.includes('culpable homicide') ||
    combined.includes('304') ||
    combined.includes('105 bns')
  ) {
    return 'Culpable Homicide';
  }

  // 4. Ransom / Kidnapping for Ransom
  if (
    ch.includes('ransom') ||
    ch.includes('kidnap') ||
    ch.includes('abduction') ||
    combined.includes('364a') ||
    combined.includes('140 bns')
  ) {
    return 'Ransom';
  }

  // 5. Dacoity
  if (
    ch.includes('dacoity') ||
    combined.includes('395') ||
    combined.includes('396') ||
    combined.includes('310 bns')
  ) {
    return 'Dacoity';
  }

  // 6. Robbery
  if (
    ch.includes('robbery') ||
    ch.includes('loot') ||
    ch.includes('snatch') ||
    combined.includes('392') ||
    combined.includes('394') ||
    combined.includes('309 bns')
  ) {
    return 'Robbery';
  }

  // 7. Extortion
  if (
    ch.includes('extortion') ||
    ch.includes('rangdari') ||
    combined.includes('384') ||
    combined.includes('386') ||
    combined.includes('308 bns')
  ) {
    return 'Extortion';
  }

  // 8. Theft & Burglary
  if (
    ch.includes('theft') ||
    ch.includes('burglary') ||
    ch.includes('house-breaking') ||
    combined.includes('379') ||
    combined.includes('380') ||
    combined.includes('457') ||
    combined.includes('303 bns') ||
    combined.includes('305 bns')
  ) {
    return 'Theft';
  }

  // 9. Fraud & Cheating
  if (
    ch.includes('fraud') ||
    ch.includes('forgery') ||
    ch.includes('cheating') ||
    ch.includes('cbt') ||
    ch.includes('gaban') ||
    combined.includes('420') ||
    combined.includes('406') ||
    combined.includes('468') ||
    combined.includes('318 bns') ||
    combined.includes('316 bns')
  ) {
    return 'Fraud';
  }

  // 10. Assault, Rioting, Grievous Hurt
  if (
    ch.includes('assault') ||
    ch.includes('rioting') ||
    ch.includes('hurt') ||
    ch.includes('dispute') ||
    combined.includes('147') ||
    combined.includes('148') ||
    combined.includes('323') ||
    combined.includes('324') ||
    combined.includes('325') ||
    combined.includes('115 bns') ||
    combined.includes('117 bns') ||
    combined.includes('191 bns')
  ) {
    return 'Assault';
  }

  // 11. POCSO / Rape
  if (
    ch.includes('pocso') ||
    ch.includes('rape') ||
    ch.includes('molestation') ||
    combined.includes('376') ||
    combined.includes('64 bns')
  ) {
    return 'POCSO Act';
  }

  // 12. Arms Act
  if (ch.includes('arms') || combined.includes('25(1-b)') || combined.includes('27 arms')) {
    return 'Arms Act';
  }

  // 13. Excise / Liquor
  if (ch.includes('excise') || ch.includes('prohibition') || ch.includes('liquor')) {
    return 'Excise / Liquor';
  }

  // 14. NDPS
  if (ch.includes('ndps') || ch.includes('narcotic') || ch.includes('ganja') || ch.includes('smack')) {
    return 'NDPS Act';
  }

  // 15. Cyber Crime
  if (ch.includes('cyber') || ch.includes('it act') || combined.includes('66c') || combined.includes('66d')) {
    return 'Cyber Crime';
  }

  return 'Other';
}

export const CrimeSpectrumComparison: React.FC<CrimeSpectrumComparisonProps> = ({
  cases,
  availablePoliceStations = [],
  currentRole,
  currentUserAccount,
  activePS,
  onViewCase,
}) => {
  // =========================================================================
  // 1. ROLE HIERARCHY SCOPING LOGIC
  // =========================================================================
  const isAdministrator =
    currentRole === 'ADMINISTRATOR' ||
    currentUserAccount?.role === 'ADMINISTRATOR' ||
    currentUserAccount?.userId?.toLowerCase() === 'admin';

  const isSpOrDistrictAdmin =
    !isAdministrator &&
    (currentRole === 'SP' ||
      currentRole === 'DISTRICT_ADMIN' ||
      currentUserAccount?.role === 'SP' ||
      currentUserAccount?.role === 'DISTRICT_ADMIN' ||
      currentUserAccount?.policeStation === 'District HQ');

  const isSdpo =
    !isAdministrator &&
    !isSpOrDistrictAdmin &&
    (currentRole === 'SDPO' ||
      currentRole === 'CI' ||
      currentUserAccount?.role === 'SDPO' ||
      currentUserAccount?.role === 'CI' ||
      currentUserAccount?.policeStation === 'Subdivision HQ');

  const isShoOrStationLevel = !isAdministrator && !isSpOrDistrictAdmin && !isSdpo;

  // Hierarchy Mapping Helpers
  const psToSubdivisionMap = useMemo(() => {
    const map = new Map<string, string>();
    availablePoliceStations.forEach((ps) => {
      if (ps.subdivisionName) map.set(ps.name.toLowerCase(), ps.subdivisionName);
    });
    cases.forEach((c) => {
      if (c.ps && c.subdivision && !map.has(c.ps.toLowerCase())) {
        map.set(c.ps.toLowerCase(), c.subdivision);
      }
    });
    return map;
  }, [availablePoliceStations, cases]);

  const psToDistrictMap = useMemo(() => {
    const map = new Map<string, string>();
    availablePoliceStations.forEach((ps) => {
      if (ps.districtName) map.set(ps.name.toLowerCase(), ps.districtName);
    });
    cases.forEach((c) => {
      if (c.ps && (c as any).district && !map.has(c.ps.toLowerCase())) {
        map.set(c.ps.toLowerCase(), (c as any).district);
      }
    });
    return map;
  }, [availablePoliceStations, cases]);

  const subdivisionToDistrictMap = useMemo(() => {
    const map = new Map<string, string>();
    availablePoliceStations.forEach((ps) => {
      if (ps.subdivisionName && ps.districtName) {
        map.set(ps.subdivisionName.toLowerCase(), ps.districtName);
      }
    });
    cases.forEach((c) => {
      if (c.subdivision && (c as any).district && !map.has(c.subdivision.toLowerCase())) {
        map.set(c.subdivision.toLowerCase(), (c as any).district);
      }
    });
    return map;
  }, [availablePoliceStations, cases]);

  // Derived user primary jurisdiction
  const userSubdivision = useMemo(() => {
    if (currentUserAccount?.subdivision) return currentUserAccount.subdivision;
    if (activePS && activePS !== 'ALL') {
      const sub = psToSubdivisionMap.get(activePS.toLowerCase());
      if (sub) return sub;
    }
    const firstPs = availablePoliceStations.find((p) => p.subdivisionName);
    return firstPs?.subdivisionName || 'Tarapur';
  }, [currentUserAccount, activePS, psToSubdivisionMap, availablePoliceStations]);

  const userDistrict = useMemo(() => {
    if (currentUserAccount?.district) return currentUserAccount.district;
    if (activePS && activePS !== 'ALL') {
      const dist = psToDistrictMap.get(activePS.toLowerCase());
      if (dist) return dist;
    }
    const firstPs = availablePoliceStations.find((p) => p.districtName);
    return firstPs?.districtName || 'Munger';
  }, [currentUserAccount, activePS, psToDistrictMap, availablePoliceStations]);

  // User station (for SHO)
  const userStation = useMemo(() => {
    if (
      currentUserAccount?.policeStation &&
      currentUserAccount.policeStation !== 'District HQ' &&
      currentUserAccount.policeStation !== 'Subdivision HQ'
    ) {
      return currentUserAccount.policeStation;
    }
    if (activePS && activePS !== 'ALL') return activePS;
    return availablePoliceStations[0]?.name || 'Tarapur';
  }, [currentUserAccount, activePS, availablePoliceStations]);

  // =========================================================================
  // 2. HIERARCHY DROPDOWN OPTIONS (SCOPED BY ROLE)
  // =========================================================================

  // Selected hierarchy filters
  const [selectedDistrict, setSelectedDistrict] = useState<string>(isAdministrator ? 'ALL' : userDistrict);
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>(isSdpo ? userSubdivision : 'ALL');
  const [selectedStations, setSelectedStations] = useState<string[]>(isShoOrStationLevel ? [userStation] : []);

  // Sync state if activePS changes
  useEffect(() => {
    if (isShoOrStationLevel) {
      setSelectedStations([userStation]);
    }
  }, [isShoOrStationLevel, userStation]);

  // A. Available Districts (Administrator only)
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    availablePoliceStations.forEach((ps) => { if (ps.districtName) set.add(ps.districtName); });
    cases.forEach((c) => { if ((c as any).district) set.add((c as any).district); });
    if (set.size === 0) set.add('Munger');
    return Array.from(set).sort();
  }, [availablePoliceStations, cases]);

  // B. Available Subdivisions (Administrator & SP)
  const availableSubdivisions = useMemo(() => {
    if (isSdpo || isShoOrStationLevel) {
      return [userSubdivision];
    }
    const targetDistrict = isAdministrator ? selectedDistrict : userDistrict;
    const set = new Set<string>();
    availablePoliceStations.forEach((ps) => {
      if (ps.subdivisionName) {
        if (targetDistrict === 'ALL' || !ps.districtName || ps.districtName.toLowerCase() === targetDistrict.toLowerCase()) {
          set.add(ps.subdivisionName);
        }
      }
    });
    cases.forEach((c) => {
      if (c.subdivision) {
        const cDist = (c as any).district || subdivisionToDistrictMap.get(c.subdivision.toLowerCase());
        if (targetDistrict === 'ALL' || !cDist || cDist.toLowerCase() === targetDistrict.toLowerCase()) {
          set.add(c.subdivision);
        }
      }
    });
    if (set.size === 0) set.add(userSubdivision);
    return Array.from(set).sort();
  }, [isSdpo, isShoOrStationLevel, isAdministrator, selectedDistrict, userDistrict, userSubdivision, availablePoliceStations, cases, subdivisionToDistrictMap]);

  // C. Available Police Stations (Scoped dynamically based on Role, District, and Subdivision selection)
  const availablePoliceStationsList = useMemo(() => {
    if (isShoOrStationLevel) {
      return [userStation];
    }

    if (isSdpo) {
      // SDPO: Only police stations under his subdivision
      const set = new Set<string>();
      availablePoliceStations.forEach((ps) => {
        if (ps.subdivisionName?.toLowerCase() === userSubdivision.toLowerCase()) {
          set.add(ps.name);
        }
      });
      cases.forEach((c) => {
        const cSub = c.subdivision || psToSubdivisionMap.get((c.ps || '').toLowerCase());
        if (cSub?.toLowerCase() === userSubdivision.toLowerCase()) {
          set.add(c.ps);
        }
      });
      if (set.size === 0) set.add(userStation);
      return Array.from(set).sort();
    }

    if (isSpOrDistrictAdmin) {
      // SP: Subdivisions and PS under him
      const set = new Set<string>();
      availablePoliceStations.forEach((ps) => {
        const inDist = !ps.districtName || ps.districtName.toLowerCase() === userDistrict.toLowerCase();
        const inSub = selectedSubdivision === 'ALL' || ps.subdivisionName?.toLowerCase() === selectedSubdivision.toLowerCase();
        if (inDist && inSub) {
          set.add(ps.name);
        }
      });
      cases.forEach((c) => {
        const cDist = (c as any).district || psToDistrictMap.get((c.ps || '').toLowerCase());
        const cSub = c.subdivision || psToSubdivisionMap.get((c.ps || '').toLowerCase());
        const inDist = !cDist || cDist.toLowerCase() === userDistrict.toLowerCase();
        const inSub = selectedSubdivision === 'ALL' || cSub?.toLowerCase() === selectedSubdivision.toLowerCase();
        if (inDist && inSub) {
          set.add(c.ps);
        }
      });
      return Array.from(set).sort();
    }

    // Administrator: District, Subdivision, and PS options
    const set = new Set<string>();
    availablePoliceStations.forEach((ps) => {
      const inDist = selectedDistrict === 'ALL' || !ps.districtName || ps.districtName.toLowerCase() === selectedDistrict.toLowerCase();
      const inSub = selectedSubdivision === 'ALL' || !ps.subdivisionName || ps.subdivisionName.toLowerCase() === selectedSubdivision.toLowerCase();
      if (inDist && inSub) {
        set.add(ps.name);
      }
    });
    cases.forEach((c) => {
      const cDist = (c as any).district || psToDistrictMap.get((c.ps || '').toLowerCase());
      const cSub = c.subdivision || psToSubdivisionMap.get((c.ps || '').toLowerCase());
      const inDist = selectedDistrict === 'ALL' || !cDist || cDist.toLowerCase() === selectedDistrict.toLowerCase();
      const inSub = selectedSubdivision === 'ALL' || !cSub || cSub.toLowerCase() === selectedSubdivision.toLowerCase();
      if (inDist && inSub) {
        set.add(c.ps);
      }
    });
    return Array.from(set).sort();
  }, [
    isShoOrStationLevel,
    isSdpo,
    isSpOrDistrictAdmin,
    userStation,
    userSubdivision,
    userDistrict,
    selectedDistrict,
    selectedSubdivision,
    availablePoliceStations,
    cases,
    psToSubdivisionMap,
    psToDistrictMap
  ]);

  // =========================================================================
  // 3. OTHER FILTER STATES (YEARS, MONTHS, CRIMES, STATUS, DESIGNATION)
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]); // empty = ALL
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]); // empty = ALL (0-11)
  const [selectedCrimeHeads, setSelectedCrimeHeads] = useState<string[]>([]); // empty = ALL
  
  // Advanced filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL'); // 'ALL' | 'UNDER_INVESTIGATION' | 'CHARGESHEETED' | 'DISPOSED' | 'FALSE_CASE'
  const [selectedDesignation, setSelectedDesignation] = useState<string>('ALL'); // 'ALL' | 'SR' | 'NON_SR'
  const [selectedPunishmentTerm, setSelectedPunishmentTerm] = useState<string>('ALL'); // 'ALL' | '7_years_or_more' | 'less_than_7_years'
  const [selectedDeadlineStatus, setSelectedDeadlineStatus] = useState<string>('ALL'); // 'ALL' | 'OVERDUE' | 'CRITICAL' | 'ON_TIME' | 'COMPLETED'
  const [selectedArrestStatus, setSelectedArrestStatus] = useState<string>('ALL'); // 'ALL' | 'ARRESTED' | 'NO_ARREST'

  // Dropdown open management
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [psSearch, setPsSearch] = useState('');
  const [crimeSearch, setCrimeSearch] = useState('');

  // Drill-down Modal
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    cases: FIRCase[];
  } | null>(null);

  // Derive unique years (2016 - 2026)
  const allYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (let y = 2026; y >= 2016; y--) {
      yearsSet.add(y);
    }
    cases.forEach((c) => {
      if (c.firDate) {
        const y = new Date(c.firDate).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [cases]);

  const monthLabels = [
    { index: 0, label: 'Jan' },
    { index: 1, label: 'Feb' },
    { index: 2, label: 'Mar' },
    { index: 3, label: 'Apr' },
    { index: 4, label: 'May' },
    { index: 5, label: 'Jun' },
    { index: 6, label: 'Jul' },
    { index: 7, label: 'Aug' },
    { index: 8, label: 'Sep' },
    { index: 9, label: 'Oct' },
    { index: 10, label: 'Nov' },
    { index: 11, label: 'Dec' },
  ];

  // Multi-select Pill Toggle Helpers
  const toggleYear = (yr: number) => {
    setSelectedYears((prev) =>
      prev.includes(yr) ? prev.filter((y) => y !== yr) : [...prev, yr]
    );
  };

  const toggleMonth = (mIdx: number) => {
    setSelectedMonths((prev) =>
      prev.includes(mIdx) ? prev.filter((m) => m !== mIdx) : [...prev, mIdx]
    );
  };

  const toggleStation = (ps: string) => {
    if (isShoOrStationLevel) return; // SHO is locked to his PS
    setSelectedStations((prev) =>
      prev.includes(ps) ? prev.filter((p) => p !== ps) : [...prev, ps]
    );
  };

  const toggleCrimeHead = (ch: string) => {
    setSelectedCrimeHeads((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedYears([]);
    setSelectedMonths([]);
    if (isAdministrator) setSelectedDistrict('ALL');
    if (isAdministrator || isSpOrDistrictAdmin) setSelectedSubdivision('ALL');
    setSelectedStations(isShoOrStationLevel ? [userStation] : []);
    setSelectedCrimeHeads([]);
    setSelectedStatus('ALL');
    setSelectedDesignation('ALL');
    setSelectedPunishmentTerm('ALL');
    setSelectedDeadlineStatus('ALL');
    setSelectedArrestStatus('ALL');
  };

  // =========================================================================
  // 4. COMPREHENSIVE FILTER ENGINE (STRICT ROLE JURISDICTION ENFORCEMENT)
  // =========================================================================
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // A. STRICT ROLE-BASED JURISDICTION BOUNDARIES
      if (isShoOrStationLevel) {
        // SHO / Operator: STRICTLY his Police Station only
        if (c.ps.toLowerCase() !== userStation.toLowerCase()) {
          return false;
        }
      } else if (isSdpo) {
        // SDPO: STRICTLY police stations under his subdivision
        const cSub = c.subdivision || psToSubdivisionMap.get((c.ps || '').toLowerCase());
        if (cSub?.toLowerCase() !== userSubdivision.toLowerCase()) {
          return false;
        }
      } else if (isSpOrDistrictAdmin) {
        // SP / District Admin: Subdivisions and PS under his district
        const cDist = (c as any).district || psToDistrictMap.get((c.ps || '').toLowerCase());
        if (cDist && cDist.toLowerCase() !== userDistrict.toLowerCase()) {
          return false;
        }
        // If SP selected a specific subdivision:
        if (selectedSubdivision !== 'ALL') {
          const cSub = c.subdivision || psToSubdivisionMap.get((c.ps || '').toLowerCase());
          if (cSub?.toLowerCase() !== selectedSubdivision.toLowerCase()) {
            return false;
          }
        }
      } else if (isAdministrator) {
        // Administrator: Filter by selected district and subdivision
        if (selectedDistrict !== 'ALL') {
          const cDist = (c as any).district || psToDistrictMap.get((c.ps || '').toLowerCase());
          if (cDist && cDist.toLowerCase() !== selectedDistrict.toLowerCase()) {
            return false;
          }
        }
        if (selectedSubdivision !== 'ALL') {
          const cSub = c.subdivision || psToSubdivisionMap.get((c.ps || '').toLowerCase());
          if (cSub?.toLowerCase() !== selectedSubdivision.toLowerCase()) {
            return false;
          }
        }
      }

      // B. POLICE STATION MULTI-SELECT FILTER (WITHIN ALLOWED SCOPE)
      if (selectedStations.length > 0 && !selectedStations.includes(c.ps)) {
        return false;
      }

      // C. SEARCH QUERY
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (c.firNumber || '').toLowerCase().includes(q) ||
          (c.ps || '').toLowerCase().includes(q) ||
          (c.ioName || '').toLowerCase().includes(q) ||
          (c.sections || '').toLowerCase().includes(q) ||
          (c.complainantName || '').toLowerCase().includes(q) ||
          (c.crimeHead || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // D. STRICT CRIME HEAD CLASSIFICATION
      const strictHead = getStrictCrimeHead(c);
      if (selectedCrimeHeads.length > 0 && !selectedCrimeHeads.includes(strictHead)) {
        return false;
      }

      // E. DATE PARSING (YEAR & MONTH)
      if (c.firDate) {
        const d = new Date(c.firDate);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = d.getMonth();
          if (selectedYears.length > 0 && !selectedYears.includes(y)) return false;
          if (selectedMonths.length > 0 && !selectedMonths.includes(m)) return false;
        }
      }

      // F. CASE INVESTIGATION / DISPOSAL STATUS
      if (selectedStatus !== 'ALL') {
        const st = c.status || 'Under Investigation';
        if (selectedStatus === 'UNDER_INVESTIGATION') {
          if (st !== 'Under Investigation') return false;
        } else if (selectedStatus === 'CHARGESHEETED') {
          if (
            st !== 'Chargesheeted / Final Form Submitted' &&
            st !== 'Chargesheeted / Final Form Submitted / Mistake of Fact'
          ) {
            return false;
          }
        } else if (selectedStatus === 'DISPOSED') {
          if (
            st !== 'Disposed' &&
            st !== 'Chargesheeted / Final Form Submitted' &&
            st !== 'Chargesheeted / Final Form Submitted / Mistake of Fact' &&
            st !== 'False Case / Mistake of Fact'
          ) {
            return false;
          }
        } else if (selectedStatus === 'FALSE_CASE') {
          if (st !== 'False Case / Mistake of Fact') return false;
        }
      }

      // G. CASE DESIGNATION (SR / NON-SR)
      if (selectedDesignation !== 'ALL') {
        if (selectedDesignation === 'SR' && c.designation !== 'SR') return false;
        if (selectedDesignation === 'NON_SR' && c.designation === 'SR') return false;
      }

      // H. PUNISHMENT TERM (7+ YEARS / < 7 YEARS)
      if (selectedPunishmentTerm !== 'ALL') {
        if (c.punishmentTerm && c.punishmentTerm !== selectedPunishmentTerm) return false;
      }

      // I. DEADLINE & BACKLOG STATUS
      if (selectedDeadlineStatus !== 'ALL') {
        const deadline = getDeadlineInfo(c);
        if (selectedDeadlineStatus === 'OVERDUE' && deadline.code !== 'OVERDUE') return false;
        if (selectedDeadlineStatus === 'CRITICAL' && deadline.code !== 'APPROACHING') return false;
        if (selectedDeadlineStatus === 'ON_TIME' && deadline.code !== 'ON_TRACK') return false;
        if (selectedDeadlineStatus === 'COMPLETED' && deadline.code !== 'COMPLETED') return false;
      }

      // J. ACCUSED ARREST STATUS
      if (selectedArrestStatus !== 'ALL') {
        const hasArrest = Boolean(
          c.anyPersonArrested ||
          (c.arrestedCount && c.arrestedCount > 0) ||
          (c.accusedList && c.accusedList.some((a) => (a.status || '').toLowerCase().includes('arrest')))
        );
        if (selectedArrestStatus === 'ARRESTED' && !hasArrest) return false;
        if (selectedArrestStatus === 'NO_ARREST' && hasArrest) return false;
      }

      return true;
    });
  }, [
    cases,
    isShoOrStationLevel,
    isSdpo,
    isSpOrDistrictAdmin,
    isAdministrator,
    userStation,
    userSubdivision,
    userDistrict,
    selectedDistrict,
    selectedSubdivision,
    selectedStations,
    searchQuery,
    selectedCrimeHeads,
    selectedYears,
    selectedMonths,
    selectedStatus,
    selectedDesignation,
    selectedPunishmentTerm,
    selectedDeadlineStatus,
    selectedArrestStatus,
    psToSubdivisionMap,
    psToDistrictMap,
  ]);

  // Active Crime Heads in current view
  const activeCrimes = useMemo(() => {
    if (selectedCrimeHeads.length > 0) return selectedCrimeHeads;
    return [
      'Assault',
      'Culpable Homicide',
      'Dacoity',
      'Extortion',
      'Fraud',
      'Murder',
      'Other',
      'Ransom',
      'Robbery',
      'Theft',
    ];
  }, [selectedCrimeHeads]);

  // Total active filter count
  const activeFilterCount = useMemo(() => {
    let cnt = 0;
    if (selectedYears.length > 0) cnt += selectedYears.length;
    if (selectedMonths.length > 0) cnt += selectedMonths.length;
    if (isAdministrator && selectedDistrict !== 'ALL') cnt++;
    if ((isAdministrator || isSpOrDistrictAdmin) && selectedSubdivision !== 'ALL') cnt++;
    if (!isShoOrStationLevel && selectedStations.length > 0) cnt += selectedStations.length;
    if (selectedCrimeHeads.length > 0) cnt += selectedCrimeHeads.length;
    if (selectedStatus !== 'ALL') cnt++;
    if (selectedDesignation !== 'ALL') cnt++;
    if (selectedPunishmentTerm !== 'ALL') cnt++;
    if (selectedDeadlineStatus !== 'ALL') cnt++;
    if (selectedArrestStatus !== 'ALL') cnt++;
    if (searchQuery.trim()) cnt++;
    return cnt;
  }, [
    selectedYears,
    selectedMonths,
    isAdministrator,
    selectedDistrict,
    isSpOrDistrictAdmin,
    selectedSubdivision,
    isShoOrStationLevel,
    selectedStations,
    selectedCrimeHeads,
    selectedStatus,
    selectedDesignation,
    selectedPunishmentTerm,
    selectedDeadlineStatus,
    selectedArrestStatus,
    searchQuery,
  ]);

  // =========================================================================
  // 5. DATA AGGREGATIONS FOR THE 8 CHARTS
  // =========================================================================

  // 1. YEAR-WISE CRIME HEADS (2016 - 2026)
  const yearWiseData = useMemo(() => {
    const yearsToShow = allYears.slice(0, 11).sort((a, b) => a - b);
    return yearsToShow.map((yr) => {
      const casesInYr = filteredCases.filter((c) => {
        if (!c.firDate) return false;
        return new Date(c.firDate).getFullYear() === yr;
      });

      const counts: Record<string, number> = {};
      activeCrimes.forEach((cr) => (counts[cr] = 0));

      casesInYr.forEach((c) => {
        const head = getStrictCrimeHead(c);
        if (counts[head] !== undefined) {
          counts[head]++;
        }
      });

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { year: yr, total, counts, cases: casesInYr };
    });
  }, [filteredCases, allYears, activeCrimes]);

  const maxYearTotal = Math.max(...yearWiseData.map((y) => y.total), 1);

  // 2 & 3. MONTHLY CRIME PATTERN (Jan - Dec)
  const monthlyData = useMemo(() => {
    return monthLabels.map((m) => {
      const casesInMonth = filteredCases.filter((c) => {
        if (!c.firDate) return false;
        return new Date(c.firDate).getMonth() === m.index;
      });

      const counts: Record<string, number> = {};
      activeCrimes.forEach((cr) => (counts[cr] = 0));

      casesInMonth.forEach((c) => {
        const head = getStrictCrimeHead(c);
        if (counts[head] !== undefined) {
          counts[head]++;
        }
      });

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { monthName: m.label, monthIndex: m.index, total, counts, cases: casesInMonth };
    });
  }, [filteredCases, monthLabels, activeCrimes]);

  const maxMonthTotal = Math.max(...monthlyData.map((m) => m.total), 1);

  // 4. CRIME HEAD TRENDS (YEARLY) - Multi-line data
  const yearlyLineTrends = useMemo(() => {
    const yearsToShow = allYears.slice(0, 11).sort((a, b) => a - b);
    return activeCrimes.map((cr) => {
      const dataPoints = yearsToShow.map((yr) => {
        const count = filteredCases.filter((c) => {
          if (!c.firDate) return false;
          return new Date(c.firDate).getFullYear() === yr && getStrictCrimeHead(c) === cr;
        }).length;
        return { year: yr, count };
      });
      return { crime: cr, color: CRIME_COLORS[cr] || '#64748b', dataPoints };
    });
  }, [filteredCases, allYears, activeCrimes]);

  const maxLineVal = Math.max(
    ...yearlyLineTrends.flatMap((t) => t.dataPoints.map((p) => p.count)),
    1
  );

  // 5. MAJOR CRIME DAYS (Day of Week)
  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const casesByDay: FIRCase[][] = [[], [], [], [], [], [], []];

    filteredCases.forEach((c) => {
      if (!c.firDate) return;
      const dayIdx = new Date(c.firDate).getDay();
      if (!isNaN(dayIdx)) {
        counts[dayIdx]++;
        casesByDay[dayIdx].push(c);
      }
    });

    return days.map((name, idx) => ({
      day: name,
      count: counts[idx],
      cases: casesByDay[idx],
    }));
  }, [filteredCases]);

  const maxDayCount = Math.max(...dayOfWeekData.map((d) => d.count), 1);

  // 6. CRIME INTENSITY PROFILE (Spider / Radar Polygon)
  const radarAxes = useMemo(() => {
    const primaryRadarCrimes = [
      'Murder',
      'Culpable Homicide',
      'Robbery',
      'Dacoity',
      'Extortion',
      'Theft',
      'Assault',
      'Fraud',
      'Other',
    ];
    return primaryRadarCrimes.map((cr) => {
      const count = filteredCases.filter((c) => getStrictCrimeHead(c) === cr).length;
      return { crime: cr, count };
    });
  }, [filteredCases]);

  const maxRadarCount = Math.max(...radarAxes.map((a) => a.count), 1);

  // 7. DISTRICT VS CRIME CATEGORY (Ranked by volume)
  const districtData = useMemo(() => {
    const dMap: Record<string, { total: number; counts: Record<string, number>; cases: FIRCase[] }> = {};
    
    // Target districts to show based on user role
    const targetDistList = isAdministrator
      ? (selectedDistrict === 'ALL' ? availableDistricts : [selectedDistrict])
      : [userDistrict];

    targetDistList.forEach((d) => {
      dMap[d] = { total: 0, counts: {}, cases: [] };
      activeCrimes.forEach((cr) => (dMap[d].counts[cr] = 0));
    });

    filteredCases.forEach((c) => {
      const d = (c as any).district || psToDistrictMap.get((c.ps || '').toLowerCase()) || userDistrict;
      if (!dMap[d]) {
        dMap[d] = { total: 0, counts: {}, cases: [] };
        activeCrimes.forEach((cr) => (dMap[d].counts[cr] = 0));
      }
      const head = getStrictCrimeHead(c);
      dMap[d].total++;
      dMap[d].counts[head] = (dMap[d].counts[head] || 0) + 1;
      dMap[d].cases.push(c);
    });

    return Object.entries(dMap).map(([name, val]) => ({
      district: name,
      ...val,
    }));
  }, [filteredCases, isAdministrator, selectedDistrict, availableDistricts, userDistrict, activeCrimes, psToDistrictMap]);

  const maxDistrictTotal = Math.max(...districtData.map((d) => d.total), 1);

  // 8. POLICE STATION VS CRIME CATEGORY (Scoped to user allowed stations & ranked)
  const stationRankedData = useMemo(() => {
    const psMap: Record<string, { total: number; counts: Record<string, number>; cases: FIRCase[] }> = {};
    
    // Initialize with available allowed stations
    availablePoliceStationsList.forEach((ps) => {
      psMap[ps] = { total: 0, counts: {}, cases: [] };
      activeCrimes.forEach((cr) => (psMap[ps].counts[cr] = 0));
    });

    filteredCases.forEach((c) => {
      const ps = c.ps || 'Unknown PS';
      if (!psMap[ps]) {
        psMap[ps] = { total: 0, counts: {}, cases: [] };
        activeCrimes.forEach((cr) => (psMap[ps].counts[cr] = 0));
      }
      const head = getStrictCrimeHead(c);
      psMap[ps].total++;
      psMap[ps].counts[head] = (psMap[ps].counts[head] || 0) + 1;
      psMap[ps].cases.push(c);
    });

    return Object.entries(psMap)
      .map(([ps, val]) => ({ ps, ...val }))
      .sort((a, b) => b.total - a.total);
  }, [filteredCases, availablePoliceStationsList, activeCrimes]);

  const maxStationTotal = Math.max(...stationRankedData.map((p) => p.total), 1);

  // Excel Export Handler
  const handleExportData = () => {
    const headers = [
      'Police Station',
      'Total Cases',
      ...activeCrimes,
      'Status',
      'Designation',
    ];
    const rows = stationRankedData.map((s) => [
      s.ps,
      s.total,
      ...activeCrimes.map((cr) => s.counts[cr] || 0),
      selectedStatus,
      selectedDesignation,
    ]);
    exportToExcel(`CrimeInsight_Spectrum_Export_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const openDrillDown = (title: string, subtitle: string, casesList: FIRCase[]) => {
    setDrillDownModal({
      isOpen: true,
      title,
      subtitle,
      cases: casesList,
    });
  };

  return (
    <div className="space-y-4 bg-slate-50/70 dark:bg-slate-950 p-2 sm:p-4 rounded-3xl" ref={dropdownRef}>
      {/* ========================================================================= */}
      {/* 1. TOP FILTER CONTROLS CARD (ROLE-AWARE DROPDOWN MENUS) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        
        {/* Top Search Bar with Role Scope Indicator */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by FIR No, Accused, Complainant, PS, Sections, Acts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
            />
          </div>

          {/* User Role Jurisdiction Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
            {isShoOrStationLevel ? (
              <>
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span>Station: {userStation} PS</span>
              </>
            ) : isSdpo ? (
              <>
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Subdivision: {userSubdivision} (SDPO Scope)</span>
              </>
            ) : isSpOrDistrictAdmin ? (
              <>
                <Scale className="w-3.5 h-3.5 text-purple-500" />
                <span>District: {userDistrict} (SP Scope)</span>
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>Administrator (State / All Districts)</span>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DROPDOWNS ROW 1: ROLE-BASED JURISDICTION & TIME CONTROLS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 relative">
          
          {/* 1. ADMINISTRATOR: DISTRICT DROPDOWN */}
          {isAdministrator && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                District Level
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedSubdivision('ALL');
                  setSelectedStations([]);
                }}
                className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  selectedDistrict !== 'ALL'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <option value="ALL">All Districts</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d} District
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SP: FIXED DISTRICT BADGE */}
          {isSpOrDistrictAdmin && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                District Jurisdiction
              </label>
              <div className="py-1.5 px-2.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/80 dark:bg-purple-950/40 text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center justify-between">
                <span className="truncate">{userDistrict} (SP HQ)</span>
                <Lock className="w-3 h-3 text-purple-400 shrink-0" />
              </div>
            </div>
          )}

          {/* SDPO: FIXED SUBDIVISION BADGE */}
          {isSdpo && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                Subdivision Scope
              </label>
              <div className="py-1.5 px-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                <span className="truncate">{userSubdivision} (SDPO)</span>
                <Lock className="w-3 h-3 text-indigo-400 shrink-0" />
              </div>
            </div>
          )}

          {/* SHO: FIXED STATION BADGE */}
          {isShoOrStationLevel && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                Your Police Station
              </label>
              <div className="py-1.5 px-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-xs font-black text-blue-900 dark:text-blue-200 flex items-center justify-between">
                <span className="truncate">{userStation} PS (Fixed)</span>
                <Lock className="w-3 h-3 text-blue-400 shrink-0" />
              </div>
            </div>
          )}

          {/* 2. SUBDIVISION DROPDOWN (FOR ADMINISTRATOR & SP LOGIN) */}
          {(isAdministrator || isSpOrDistrictAdmin) && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                {isSpOrDistrictAdmin ? 'Subdivisions under SP' : 'Subdivision Level'}
              </label>
              <select
                value={selectedSubdivision}
                onChange={(e) => {
                  setSelectedSubdivision(e.target.value);
                  setSelectedStations([]);
                }}
                className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  selectedSubdivision !== 'ALL'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <option value="ALL">
                  {isSpOrDistrictAdmin ? `All Subdivisions (${availableSubdivisions.length})` : 'All Subdivisions'}
                </option>
                {availableSubdivisions.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub} Subdivision
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. POLICE STATIONS DROPDOWN (FOR ADMIN, SP, AND SDPO LOGINS) */}
          {!isShoOrStationLevel && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                {isSdpo
                  ? 'PS under SDPO'
                  : isSpOrDistrictAdmin
                  ? 'PS under SP'
                  : 'Police Station Level'}
              </label>

              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'STATIONS' ? null : 'STATIONS')}
                className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer ${
                  selectedStations.length > 0
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">
                  {selectedStations.length === 0
                    ? isSdpo
                      ? `All PS (${availablePoliceStationsList.length})`
                      : `Stations: All (${availablePoliceStationsList.length})`
                    : `Selected (${selectedStations.length})`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${openDropdown === 'STATIONS' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'STATIONS' && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-64 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      {isSdpo ? `PS in ${userSubdivision}` : 'Filter Police Stations'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedStations([])}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search station name..."
                    value={psSearch}
                    onChange={(e) => setPsSearch(e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {availablePoliceStationsList
                      .filter((ps) => ps.toLowerCase().includes(psSearch.toLowerCase()))
                      .map((ps) => {
                        const isSelected = selectedStations.includes(ps);
                        return (
                          <div
                            key={ps}
                            onClick={() => toggleStation(ps)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <span className="truncate">{ps} PS</span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. YEARS DROPDOWN */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
              Year Timeline
            </label>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'YEARS' ? null : 'YEARS')}
              className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer ${
                selectedYears.length > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-400/40'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="truncate">
                {selectedYears.length === 0
                  ? 'Years: All'
                  : `Years (${selectedYears.length})`}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${openDropdown === 'YEARS' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'YEARS' && (
              <div className="absolute left-0 top-full mt-1.5 z-40 w-56 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase text-slate-400">Select Years</span>
                  <button
                    type="button"
                    onClick={() => setSelectedYears([])}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Reset All
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {allYears.slice(0, 11).map((yr) => {
                    const isSelected = selectedYears.includes(yr);
                    return (
                      <div
                        key={yr}
                        onClick={() => toggleYear(yr)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>Calendar Year {yr}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. MONTHS DROPDOWN */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
              Month Period
            </label>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'MONTHS' ? null : 'MONTHS')}
              className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer ${
                selectedMonths.length > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-400/40'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="truncate">
                {selectedMonths.length === 0
                  ? 'Months: All'
                  : `Months (${selectedMonths.length})`}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${openDropdown === 'MONTHS' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'MONTHS' && (
              <div className="absolute left-0 top-full mt-1.5 z-40 w-56 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase text-slate-400">Select Months</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMonths([])}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Reset All
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto pr-1">
                  {monthLabels.map((m) => {
                    const isSelected = selectedMonths.includes(m.index);
                    return (
                      <div
                        key={m.label}
                        onClick={() => toggleMonth(m.index)}
                        className={`p-1.5 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {m.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 6. CRIME HEADS DROPDOWN */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
              Crime Categories
            </label>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'CRIMES' ? null : 'CRIMES')}
              className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer ${
                selectedCrimeHeads.length > 0
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-400/40'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="truncate">
                {selectedCrimeHeads.length === 0
                  ? 'Crimes: All'
                  : `Crimes (${selectedCrimeHeads.length})`}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${openDropdown === 'CRIMES' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'CRIMES' && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-64 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase text-slate-400">Select Crime Heads</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCrimeHeads([])}
                    className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search crime..."
                  value={crimeSearch}
                  onChange={(e) => setCrimeSearch(e.target.value)}
                  className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs"
                />
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {DISPLAY_CRIME_HEADS.filter((ch) =>
                    ch.toLowerCase().includes(crimeSearch.toLowerCase())
                  ).map((ch) => {
                    const isSelected = selectedCrimeHeads.includes(ch);
                    return (
                      <div
                        key={ch}
                        onClick={() => toggleCrimeHead(ch)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: CRIME_COLORS[ch] || '#64748b' }}
                          />
                          <span className="truncate">{ch}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* FOR SDPO & SHO: EXTRA FILTERS IN ROW 1 TO FULLY POPULATE THE 6-COL GRID */}
          {(isSdpo || isShoOrStationLevel) && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                Investigation / Disposal
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  selectedStatus !== 'ALL'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <option value="ALL">All Statuses</option>
                <option value="UNDER_INVESTIGATION">🔍 Under Investigation</option>
                <option value="CHARGESHEETED">📋 Chargesheeted</option>
                <option value="DISPOSED">✅ Disposed</option>
                <option value="FALSE_CASE">🚫 False Case</option>
              </select>
            </div>
          )}

          {isShoOrStationLevel && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                Case Designation (SR)
              </label>
              <select
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  selectedDesignation !== 'ALL'
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <option value="ALL">All Designations</option>
                <option value="SR">🔥 Special Report (SR)</option>
                <option value="NON_SR">📋 Non-SR</option>
              </select>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* DROPDOWNS ROW 2: ADVANCED INVESTIGATION & STATUS FILTERS */}
        {/* ========================================================================= */}
        <div className={`pt-2 border-t border-slate-100 dark:border-slate-800 grid gap-2 ${
          isShoOrStationLevel
            ? 'grid-cols-2 sm:grid-cols-3'
            : isSdpo
            ? 'grid-cols-2 sm:grid-cols-4'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
        }`}>
          {/* INVESTIGATION STATUS (FOR ADMIN & SP) */}
          {(isAdministrator || isSpOrDistrictAdmin) && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                Investigation / Disposal
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  selectedStatus !== 'ALL'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <option value="ALL">All Statuses (Full Spectrum)</option>
                <option value="UNDER_INVESTIGATION">🔍 Under Investigation</option>
                <option value="CHARGESHEETED">📋 Chargesheeted / Final Form</option>
                <option value="DISPOSED">✅ Disposed / Closed</option>
                <option value="FALSE_CASE">🚫 False Case / Mistake of Fact</option>
              </select>
            </div>
          )}

          {/* SR / DESIGNATION (FOR ADMIN, SP, SDPO) */}
          {!isShoOrStationLevel && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                Case Designation (SR)
              </label>
              <select
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  selectedDesignation !== 'ALL'
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <option value="ALL">All Designations</option>
                <option value="SR">🔥 Special Report (SR / Heinous)</option>
                <option value="NON_SR">📋 Non-SR (General Cases)</option>
              </select>
            </div>
          )}

          {/* DEADLINE / TIMELINE */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
              Timeline & Backlog
            </label>
            <select
              value={selectedDeadlineStatus}
              onChange={(e) => setSelectedDeadlineStatus(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                selectedDeadlineStatus !== 'ALL'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/40'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <option value="ALL">All Timelines</option>
              <option value="OVERDUE">⚠️ Overdue (&gt;60/90 Days Backlog)</option>
              <option value="CRITICAL">⏳ Critical (Due in &lt;7 Days)</option>
              <option value="ON_TIME">🟢 Active (Within Deadline)</option>
              <option value="COMPLETED">✅ Completed / Disposed</option>
            </select>
          </div>

          {/* PUNISHMENT TERM */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
              Punishment Gravity
            </label>
            <select
              value={selectedPunishmentTerm}
              onChange={(e) => setSelectedPunishmentTerm(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                selectedPunishmentTerm !== 'ALL'
                  ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-900 dark:text-purple-200 ring-1 ring-purple-400/40'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <option value="ALL">All Terms</option>
              <option value="7_years_or_more">⚖️ 7 Years or More</option>
              <option value="less_than_7_years">⚖️ Less than 7 Years</option>
            </select>
          </div>

          {/* ACCUSED ARRESTS */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
              Accused Arrests
            </label>
            <select
              value={selectedArrestStatus}
              onChange={(e) => setSelectedArrestStatus(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                selectedArrestStatus !== 'ALL'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 ring-1 ring-blue-400/40'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <option value="ALL">All Arrest Statuses</option>
              <option value="ARRESTED">🎯 Accused Arrested / Forwarded</option>
              <option value="NO_ARREST">⏳ No Arrests Made Yet</option>
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ACTIVE FILTER CHIPS RIBBON & RESET ALL */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-slate-600 dark:text-slate-400 mr-1">
              Showing <strong className="text-slate-900 dark:text-white font-black">{filteredCases.length}</strong> of{' '}
              {cases.length} records
            </span>

            {/* Selected Active Chips */}
            {isAdministrator && selectedDistrict !== 'ALL' && (
              <span
                onClick={() => setSelectedDistrict('ALL')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 cursor-pointer hover:bg-blue-200"
              >
                <span>District: {selectedDistrict}</span>
                <X className="w-2.5 h-2.5" />
              </span>
            )}

            {(isAdministrator || isSpOrDistrictAdmin) && selectedSubdivision !== 'ALL' && (
              <span
                onClick={() => setSelectedSubdivision('ALL')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 cursor-pointer hover:bg-purple-200"
              >
                <span>Subdivision: {selectedSubdivision}</span>
                <X className="w-2.5 h-2.5" />
              </span>
            )}

            {!isShoOrStationLevel && selectedStations.map((ps) => (
              <span
                key={ps}
                onClick={() => toggleStation(ps)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-300"
              >
                <span>{ps} PS</span>
                <X className="w-2.5 h-2.5" />
              </span>
            ))}

            {selectedYears.map((yr) => (
              <span
                key={yr}
                onClick={() => toggleYear(yr)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 cursor-pointer hover:bg-indigo-200"
              >
                <span>{yr}</span>
                <X className="w-2.5 h-2.5" />
              </span>
            ))}

            {selectedMonths.map((mIdx) => (
              <span
                key={mIdx}
                onClick={() => toggleMonth(mIdx)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 cursor-pointer hover:bg-indigo-200"
              >
                <span>{monthLabels[mIdx]?.label}</span>
                <X className="w-2.5 h-2.5" />
              </span>
            ))}

            {selectedCrimeHeads.map((ch) => (
              <span
                key={ch}
                onClick={() => toggleCrimeHead(ch)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black text-white cursor-pointer hover:opacity-90"
                style={{ backgroundColor: CRIME_COLORS[ch] || '#64748b' }}
              >
                <span>{ch}</span>
                <X className="w-2.5 h-2.5" />
              </span>
            ))}

            {selectedStatus !== 'ALL' && (
              <span
                onClick={() => setSelectedStatus('ALL')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 cursor-pointer hover:bg-emerald-200"
              >
                <span>Status: {selectedStatus.replace(/_/g, ' ')}</span>
                <X className="w-2.5 h-2.5" />
              </span>
            )}

            {selectedDesignation !== 'ALL' && (
              <span
                onClick={() => setSelectedDesignation('ALL')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 cursor-pointer hover:bg-rose-200"
              >
                <span>{selectedDesignation}</span>
                <X className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-rose-600 hover:text-rose-700 font-black flex items-center gap-1 cursor-pointer transition shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters ({activeFilterCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GRID OF 4 PRIMARY CHARTS (2x2 GRID) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CHART 1: YEAR-WISE CRIME HEADS (STACKED BAR) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">
                YEAR-WISE CRIME HEADS
              </h4>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Download Data"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stacked Bars Graph */}
          <div className="h-56 flex items-end justify-between gap-1.5 pt-4 px-2 border-b border-slate-100 dark:border-slate-800">
            {yearWiseData.map((yd) => {
              const heightPercent = Math.max((yd.total / maxYearTotal) * 100, 3);
              return (
                <div
                  key={yd.year}
                  onClick={() => openDrillDown(`Year ${yd.year} Crime Cases`, `Total: ${yd.total} FIRs`, yd.cases)}
                  className="flex-1 flex flex-col items-center gap-1 group cursor-pointer h-full justify-end"
                >
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-900 tabular-nums">
                    {yd.total > 0 ? yd.total : ''}
                  </span>
                  <div
                    className="w-full max-w-[28px] bg-slate-100 rounded-t-md overflow-hidden flex flex-col-reverse shadow-inner transition-all group-hover:scale-105"
                    style={{ height: `${heightPercent}%` }}
                  >
                    {activeCrimes.map((cr) => {
                      const count = yd.counts[cr] || 0;
                      if (count === 0) return null;
                      const segmentHeight = (count / (yd.total || 1)) * 100;
                      return (
                        <div
                          key={cr}
                          style={{
                            height: `${segmentHeight}%`,
                            backgroundColor: CRIME_COLORS[cr] || '#94a3b8',
                          }}
                          title={`${cr}: ${count} cases`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                    {yd.year}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Crime Dots Legend */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            {activeCrimes.map((cr) => (
              <div key={cr} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CRIME_COLORS[cr] }} />
                <span>{cr}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 2: MONTHLY CRIME PATTERN (AREA) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">
                MONTHLY CRIME PATTERN (AREA)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stacked Area SVG Chart */}
          <div className="h-56 relative flex items-center justify-center">
            <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="areaGradOrange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="areaGradPink" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="areaGradPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0.25, 0.5, 0.75, 1.0].map((lvl, idx) => (
                <line
                  key={idx}
                  x1="20"
                  y1={180 - lvl * 160}
                  x2="480"
                  y2={180 - lvl * 160}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
              ))}

              {/* Area Path Layer 1 (Total/Orange) */}
              <path
                d={`M 30,${180 - (monthlyData[0].total / maxMonthTotal) * 150} ` +
                  monthlyData.map((m, idx) => `L ${30 + idx * 38},${180 - (m.total / maxMonthTotal) * 150}`).join(' ') +
                  ` L 448,180 L 30,180 Z`}
                fill="url(#areaGradOrange)"
                stroke="#f97316"
                strokeWidth="2"
              />

              {/* Area Path Layer 2 (Violent/Pink) */}
              <path
                d={`M 30,${180 - ((monthlyData[0].counts['Assault'] || 0) + (monthlyData[0].counts['Murder'] || 0)) / maxMonthTotal * 150} ` +
                  monthlyData.map((m, idx) => {
                    const sub = (m.counts['Assault'] || 0) + (m.counts['Murder'] || 0) + (m.counts['Robbery'] || 0);
                    return `L ${30 + idx * 38},${180 - (sub / maxMonthTotal) * 150}`;
                  }).join(' ') +
                  ` L 448,180 L 30,180 Z`}
                fill="url(#areaGradPink)"
                stroke="#ec4899"
                strokeWidth="1.5"
              />

              {/* Area Path Layer 3 (Theft/Purple) */}
              <path
                d={`M 30,${180 - (monthlyData[0].counts['Theft'] || 0) / maxMonthTotal * 150} ` +
                  monthlyData.map((m, idx) => `L ${30 + idx * 38},${180 - ((m.counts['Theft'] || 0) / maxMonthTotal) * 150}`).join(' ') +
                  ` L 448,180 L 30,180 Z`}
                fill="url(#areaGradPurple)"
                stroke="#8b5cf6"
                strokeWidth="1.5"
              />

              {/* Month X Labels */}
              {monthlyData.map((m, idx) => (
                <text
                  key={m.monthName}
                  x={30 + idx * 38}
                  y="195"
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-slate-500"
                >
                  {m.monthName}
                </text>
              ))}
            </svg>
          </div>

          {/* Crime Dots Legend */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            {activeCrimes.map((cr) => (
              <div key={cr} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CRIME_COLORS[cr] }} />
                <span>{cr}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 3: MONTHLY CRIME PATTERN (COLUMN) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">
                MONTHLY CRIME PATTERN (COLUMN)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stacked Monthly Column Bars */}
          <div className="h-56 flex items-end justify-between gap-1.5 pt-4 px-2 border-b border-slate-100 dark:border-slate-800">
            {monthlyData.map((md) => {
              const heightPercent = Math.max((md.total / maxMonthTotal) * 100, 3);
              return (
                <div
                  key={md.monthName}
                  onClick={() => openDrillDown(`${md.monthName} FIR Cases`, `Total: ${md.total} Incidences`, md.cases)}
                  className="flex-1 flex flex-col items-center gap-1 group cursor-pointer h-full justify-end"
                >
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-900 tabular-nums">
                    {md.total > 0 ? md.total : ''}
                  </span>
                  <div
                    className="w-full max-w-[24px] bg-slate-100 rounded-t-md overflow-hidden flex flex-col-reverse shadow-inner transition-all group-hover:scale-105"
                    style={{ height: `${heightPercent}%` }}
                  >
                    {activeCrimes.map((cr) => {
                      const count = md.counts[cr] || 0;
                      if (count === 0) return null;
                      const segmentHeight = (count / (md.total || 1)) * 100;
                      return (
                        <div
                          key={cr}
                          style={{
                            height: `${segmentHeight}%`,
                            backgroundColor: CRIME_COLORS[cr] || '#94a3b8',
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                    {md.monthName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            {activeCrimes.map((cr) => (
              <div key={cr} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CRIME_COLORS[cr] }} />
                <span>{cr}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 4: CRIME HEAD TRENDS (YEARLY LINE CHARTS) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">
                CRIME HEAD TRENDS (YEARLY)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Multi-Line Curves SVG Chart */}
          <div className="h-56 relative flex items-center justify-center">
            <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
              {/* Guidelines */}
              {[0.25, 0.5, 0.75, 1.0].map((lvl, idx) => (
                <line
                  key={idx}
                  x1="20"
                  y1={180 - lvl * 160}
                  x2="480"
                  y2={180 - lvl * 160}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
              ))}

              {/* Trend Lines for Each Crime Head */}
              {yearlyLineTrends.map((trend) => {
                const points = trend.dataPoints.map((dp, idx) => {
                  const x = 30 + idx * 42;
                  const y = 180 - (dp.count / maxLineVal) * 150;
                  return { x, y, count: dp.count, year: dp.year };
                });

                const pathString = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;

                return (
                  <g key={trend.crime}>
                    <path
                      d={pathString}
                      fill="none"
                      stroke={trend.color}
                      strokeWidth="2.5"
                      className="transition-all duration-300"
                    />
                    {points.map((p) => (
                      <circle
                        key={`${trend.crime}-${p.year}`}
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        fill="white"
                        stroke={trend.color}
                        strokeWidth="2"
                        className="hover:r-5 cursor-pointer transition-all"
                      >
                        <title>{`${trend.crime} (${p.year}): ${p.count} cases`}</title>
                      </circle>
                    ))}
                  </g>
                );
              })}

              {/* Year Labels on X Axis */}
              {allYears.slice(0, 11).sort((a, b) => a - b).map((yr, idx) => (
                <text
                  key={yr}
                  x={30 + idx * 42}
                  y="195"
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-slate-500"
                >
                  {yr}
                </text>
              ))}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            {activeCrimes.map((cr) => (
              <div key={cr} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CRIME_COLORS[cr] }} />
                <span>{cr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ROW OF 3 MIDDLE CARDS (MAJOR CRIME DAYS, SPIDER WEB, DISTRICT) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 5: MAJOR CRIME DAYS */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">
                MAJOR CRIME DAYS
              </h4>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Day of week bar chart */}
          <div className="h-48 flex items-end justify-between gap-2 pt-2 px-1 border-b border-slate-100 dark:border-slate-800">
            {dayOfWeekData.map((d) => {
              const heightPercent = Math.max((d.count / maxDayCount) * 100, 6);
              return (
                <div
                  key={d.day}
                  onClick={() => openDrillDown(`${d.day}day Crime Cases`, `${d.count} Total Recorded`, d.cases)}
                  className="flex-1 flex flex-col items-center gap-1 group cursor-pointer h-full justify-end"
                >
                  <div
                    className="w-full max-w-[28px] bg-indigo-500 hover:bg-indigo-600 rounded-t-md transition-all shadow-xs"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD 6: CRIME INTENSITY PROFILE (SPIDER / RADAR POLYGON) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">
                CRIME INTENSITY PROFILE
              </h4>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Spider Web SVG */}
          <div className="h-48 flex items-center justify-center">
            <svg viewBox="0 0 240 240" className="w-full max-w-[210px] overflow-visible">
              {/* Concentric Guideline Polygons */}
              {[0.25, 0.5, 0.75, 1.0].map((lvl, idx) => {
                const points = radarAxes
                  .map((_, aIdx) => {
                    const angle = (aIdx * 2 * Math.PI) / radarAxes.length - Math.PI / 2;
                    const r = 80 * lvl;
                    return `${120 + r * Math.cos(angle)},${120 + r * Math.sin(angle)}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={idx}
                    points={points}
                    className="fill-none stroke-slate-200 dark:stroke-slate-700"
                    strokeWidth={0.8}
                  />
                );
              })}

              {/* Axis lines and labels */}
              {radarAxes.map((axis, aIdx) => {
                const angle = (aIdx * 2 * Math.PI) / radarAxes.length - Math.PI / 2;
                const x2 = 120 + 80 * Math.cos(angle);
                const y2 = 120 + 80 * Math.sin(angle);
                const lx = 120 + 95 * Math.cos(angle);
                const ly = 120 + 95 * Math.sin(angle);

                return (
                  <g key={axis.crime}>
                    <line x1="120" y1="120" x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth={0.8} />
                    <text
                      x={lx}
                      y={ly + 3}
                      textAnchor="middle"
                      className="text-[7.5px] font-bold fill-slate-500 select-none"
                    >
                      {axis.crime}
                    </text>
                  </g>
                );
              })}

              {/* Filled Radar Polygon */}
              <polygon
                points={radarAxes
                  .map((axis, aIdx) => {
                    const ratio = Math.max(axis.count / maxRadarCount, 0.05);
                    const angle = (aIdx * 2 * Math.PI) / radarAxes.length - Math.PI / 2;
                    const r = 80 * ratio;
                    return `${120 + r * Math.cos(angle)},${120 + r * Math.sin(angle)}`;
                  })
                  .join(' ')}
                fill="#ef4444"
                fillOpacity={0.25}
                stroke="#ef4444"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>

        {/* CARD 7: DISTRICT VS CRIME CATEGORY */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">
                DISTRICT VS CRIME CATEGORY
              </h4>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* District Stacked Bars */}
          <div className="h-48 flex items-end justify-center gap-6 pt-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {districtData.map((d) => {
              const heightPercent = Math.max((d.total / maxDistrictTotal) * 100, 10);
              return (
                <div
                  key={d.district}
                  onClick={() => openDrillDown(`${d.district} District Crime Cases`, `Total: ${d.total} Cases`, d.cases)}
                  className="flex flex-col items-center gap-1 group cursor-pointer h-full justify-end"
                >
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-900 tabular-nums">
                    {d.total}
                  </span>
                  <div
                    className="w-24 sm:w-32 bg-slate-100 rounded-t-md overflow-hidden flex flex-col-reverse shadow-inner transition-all group-hover:scale-105"
                    style={{ height: `${heightPercent}%` }}
                  >
                    {activeCrimes.map((cr) => {
                      const count = d.counts[cr] || 0;
                      if (count === 0) return null;
                      const segmentHeight = (count / (d.total || 1)) * 100;
                      return (
                        <div
                          key={cr}
                          style={{
                            height: `${segmentHeight}%`,
                            backgroundColor: CRIME_COLORS[cr] || '#94a3b8',
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 mt-1">
                    {d.district}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            {activeCrimes.slice(0, 6).map((cr) => (
              <div key={cr} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CRIME_COLORS[cr] }} />
                <span>{cr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FULL-WIDTH CARD 8: POLICE STATION VS CRIME CATEGORY (MATCHING IMAGE) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">
              {isShoOrStationLevel
                ? `${userStation} POLICE STATION CRIME BREAKDOWN`
                : isSdpo
                ? `POLICE STATIONS UNDER ${userSubdivision.toUpperCase()} SUBDIVISION`
                : isSpOrDistrictAdmin && selectedSubdivision !== 'ALL'
                ? `POLICE STATIONS IN ${selectedSubdivision.toUpperCase()} SUBDIVISION`
                : 'POLICE STATION VS CRIME CATEGORY'}
            </h4>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grand Full-Width Multi-PS Stacked Bars */}
        <div className="h-64 flex items-end justify-between gap-1 sm:gap-2 pt-6 px-1 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
          {stationRankedData.map((psData) => {
            const heightPercent = Math.max((psData.total / maxStationTotal) * 100, 2);
            return (
              <div
                key={psData.ps}
                onClick={() => openDrillDown(`${psData.ps} PS Crime Spectrum`, `Total Volume: ${psData.total} Cases`, psData.cases)}
                className="flex-1 min-w-[28px] max-w-[55px] flex flex-col items-center gap-1 group cursor-pointer h-full justify-end"
              >
                <span className="text-[8px] font-bold text-slate-400 group-hover:text-slate-900 tabular-nums">
                  {psData.total > 0 ? psData.total : ''}
                </span>
                <div
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-md overflow-hidden flex flex-col-reverse shadow-inner transition-all group-hover:scale-105"
                  style={{ height: `${heightPercent}%` }}
                >
                  {activeCrimes.map((cr) => {
                    const count = psData.counts[cr] || 0;
                    if (count === 0) return null;
                    const segmentHeight = (count / (psData.total || 1)) * 100;
                    return (
                      <div
                        key={cr}
                        style={{
                          height: `${segmentHeight}%`,
                          backgroundColor: CRIME_COLORS[cr] || '#94a3b8',
                        }}
                        title={`${psData.ps} - ${cr}: ${count} cases`}
                      />
                    );
                  })}
                </div>
                <span className="text-[8px] font-bold text-slate-600 dark:text-slate-400 mt-1 truncate max-w-[50px] text-center">
                  {psData.ps}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend Ribbon matching bottom of screenshot */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
          {activeCrimes.map((cr) => (
            <div key={cr} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CRIME_COLORS[cr] }} />
              <span>{cr}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CASE DRILL-DOWN MODAL */}
      {/* ========================================================================= */}
      {drillDownModal && drillDownModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>{drillDownModal.title}</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">{drillDownModal.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setDrillDownModal(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Cases List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {drillDownModal.cases.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No specific FIR records found.</p>
              ) : (
                drillDownModal.cases.map((c) => (
                  <div
                    key={c.id || c.firNumber}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          FIR No: {c.firNumber || 'N/A'}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {c.ps} PS
                        </span>
                        {c.designation === 'SR' && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                            SR
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                          {c.status || 'Under Investigation'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {c.crimeHead || 'Crime Head'} • Sections: {c.sections || 'IPC/BNS'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Date: {c.firDate || 'N/A'} | IO: {c.ioName || 'Not Assigned'}
                      </div>
                    </div>

                    {onViewCase && (
                      <button
                        type="button"
                        onClick={() => {
                          setDrillDownModal(null);
                          onViewCase(c);
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View FIR</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
