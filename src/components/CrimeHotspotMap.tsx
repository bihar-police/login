import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FIRCase,
  PoliceStation,
  UserRole,
  UserAccount,
} from '../types';
import {
  Search,
  RotateCcw,
  Download,
  Calendar,
  Layers,
  MapPin,
  Flame,
  AlertTriangle,
  Eye,
  X,
  ChevronDown,
  Check,
  Building2,
  Scale,
  Shield,
  Clock,
  Compass,
  Maximize2,
  Activity,
  Crosshair,
  Radio,
  Lock,
} from 'lucide-react';
import { exportToExcel } from '../utils/reportExport';
import { getDeadlineInfo } from '../utils/helpers';
import { DISPLAY_CRIME_HEADS, CRIME_COLORS, getStrictCrimeHead } from './CrimeSpectrumComparison';
import { getCaseCoordinates } from '../utils/geoCoder';
import L from 'leaflet';

export interface CrimeHotspotMapProps {
  cases: FIRCase[];
  availablePoliceStations?: PoliceStation[];
  currentRole: UserRole;
  currentUserAccount?: UserAccount | null;
  activePS?: string | null;
  onViewCase?: (c: FIRCase) => void;
}

export const CrimeHotspotMap: React.FC<CrimeHotspotMapProps> = ({
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
  const [selectedDistrict, setSelectedDistrict] = useState<string>(isAdministrator ? 'ALL' : userDistrict);
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>(isSdpo ? userSubdivision : 'ALL');
  const [selectedStations, setSelectedStations] = useState<string[]>(isShoOrStationLevel ? [userStation] : []);

  // Sync state if activePS changes
  useEffect(() => {
    if (isShoOrStationLevel) {
      setSelectedStations([userStation]);
    }
  }, [isShoOrStationLevel, userStation]);

  // Available Districts (Administrator only)
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    availablePoliceStations.forEach((ps) => { if (ps.districtName) set.add(ps.districtName); });
    cases.forEach((c) => { if ((c as any).district) set.add((c as any).district); });
    if (set.size === 0) set.add('Munger');
    return Array.from(set).sort();
  }, [availablePoliceStations, cases]);

  // Available Subdivisions (Administrator & SP)
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

  // Available Police Stations
  const availablePoliceStationsList = useMemo(() => {
    if (isShoOrStationLevel) {
      return [userStation];
    }

    if (isSdpo) {
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

    // Administrator
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
    psToDistrictMap,
  ]);

  // =========================================================================
  // 3. FILTER STATES (YEARS, MONTHS, CRIMES, STATUS, DESIGNATION)
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedCrimeHeads, setSelectedCrimeHeads] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('ALL');
  const [selectedPunishmentTerm, setSelectedPunishmentTerm] = useState<string>('ALL');
  const [selectedDeadlineStatus, setSelectedDeadlineStatus] = useState<string>('ALL');
  const [selectedArrestStatus, setSelectedArrestStatus] = useState<string>('ALL');

  // Map view layer settings
  const [mapLayerType, setMapLayerType] = useState<
    'GOOGLE_ROADMAP' | 'GOOGLE_HYBRID' | 'GOOGLE_TERRAIN' | 'DARK' | 'STREET'
  >('GOOGLE_ROADMAP');
  const [hotspotDisplayMode, setHotspotDisplayMode] = useState<'ALL' | 'HOTSPOTS_ONLY' | 'PINS_ONLY'>('ALL');
  const [selectedHotspotCluster, setSelectedHotspotCluster] = useState<string | null>(null);

  // Hovered case for floating popup on mouse over
  const [hoveredCase, setHoveredCase] = useState<{
    caseItem: FIRCase & { color?: string; strictHead?: string; coordinates?: { lat: number; lng: number; gr: string } };
    x: number;
    y: number;
    coordinates: { lat: number; lng: number; gr: string };
  } | null>(null);

  // Dropdown open management
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

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

  // Derive unique years (2016 - 2026)
  const allYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (let y = 2026; y >= 2016; y--) yearsSet.add(y);
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
    if (isShoOrStationLevel) return;
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
    setSelectedHotspotCluster(null);
  };

  // =========================================================================
  // 4. COMPREHENSIVE FILTER ENGINE (STRICT ROLE JURISDICTION ENFORCEMENT)
  // =========================================================================
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // A. Role Boundaries
      if (isShoOrStationLevel) {
        if (c.ps?.toLowerCase() !== userStation.toLowerCase()) return false;
      } else if (isSdpo) {
        const cSub = c.subdivision || psToSubdivisionMap.get((c.ps || '').toLowerCase());
        if (cSub?.toLowerCase() !== userSubdivision.toLowerCase()) return false;
      } else if (isSpOrDistrictAdmin) {
        const cDist = (c as any).district || psToDistrictMap.get((c.ps || '').toLowerCase());
        if (cDist && cDist.toLowerCase() !== userDistrict.toLowerCase()) return false;
      }

      // Hierarchy UI Filters
      if (isAdministrator && selectedDistrict !== 'ALL') {
        const cDist = (c as any).district || psToDistrictMap.get((c.ps || '').toLowerCase());
        if (cDist && cDist.toLowerCase() !== selectedDistrict.toLowerCase()) return false;
      }

      if ((isAdministrator || isSpOrDistrictAdmin) && selectedSubdivision !== 'ALL') {
        const cSub = c.subdivision || psToSubdivisionMap.get((c.ps || '').toLowerCase());
        if (cSub && cSub.toLowerCase() !== selectedSubdivision.toLowerCase()) return false;
      }

      // Police Station Multi-Select
      if (!isShoOrStationLevel && selectedStations.length > 0) {
        if (!selectedStations.includes(c.ps)) return false;
      }

      // B. Search Bar
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchFir = c.firNumber?.toLowerCase().includes(q);
        const matchSec = c.sections?.toLowerCase().includes(q);
        const matchPO = c.placeOfOccurrence?.toLowerCase().includes(q) || c.poAddress?.toLowerCase().includes(q);
        const matchGR = c.grNumber?.toLowerCase().includes(q);
        const matchAccused = (c.accusedList || []).some((a) => a.name?.toLowerCase().includes(q));
        const matchComp = c.complainantName?.toLowerCase().includes(q);
        const matchIO = c.ioName?.toLowerCase().includes(q);
        if (!matchFir && !matchSec && !matchPO && !matchGR && !matchAccused && !matchComp && !matchIO) {
          return false;
        }
      }

      // C. Crime Heads
      const strictHead = getStrictCrimeHead(c);
      if (selectedCrimeHeads.length > 0 && !selectedCrimeHeads.includes(strictHead)) {
        return false;
      }

      // E. Date
      if (c.firDate) {
        const d = new Date(c.firDate);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = d.getMonth();
          if (selectedYears.length > 0 && !selectedYears.includes(y)) return false;
          if (selectedMonths.length > 0 && !selectedMonths.includes(m)) return false;
        }
      }

      // F. Status
      if (selectedStatus !== 'ALL') {
        const st = c.status || 'Under Investigation';
        if (selectedStatus === 'UNDER_INVESTIGATION' && st !== 'Under Investigation') return false;
        if (selectedStatus === 'CHARGESHEETED' && !st.includes('Chargesheeted')) return false;
        if (selectedStatus === 'DISPOSED' && !st.includes('Disposed') && !st.includes('Chargesheeted') && !st.includes('False Case')) return false;
        if (selectedStatus === 'FALSE_CASE' && !st.includes('False Case')) return false;
      }

      // G. Designation
      if (selectedDesignation !== 'ALL') {
        if (selectedDesignation === 'SR' && c.designation !== 'SR') return false;
        if (selectedDesignation === 'NON_SR' && c.designation === 'SR') return false;
      }

      // H. Punishment
      if (selectedPunishmentTerm !== 'ALL' && c.punishmentTerm && c.punishmentTerm !== selectedPunishmentTerm) {
        return false;
      }

      // I. Deadline
      if (selectedDeadlineStatus !== 'ALL') {
        const dl = getDeadlineInfo(c);
        if (selectedDeadlineStatus === 'OVERDUE' && dl.code !== 'OVERDUE') return false;
        if (selectedDeadlineStatus === 'CRITICAL' && dl.code !== 'APPROACHING') return false;
        if (selectedDeadlineStatus === 'ON_TIME' && dl.code !== 'ON_TRACK') return false;
        if (selectedDeadlineStatus === 'COMPLETED' && dl.code !== 'COMPLETED') return false;
      }

      // J. Arrests
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

  // Processed Geocoded Cases for Map
  const geoCases = useMemo(() => {
    return filteredCases.map((c) => {
      const coords = getCaseCoordinates(c);
      const strictHead = getStrictCrimeHead(c);
      const color = CRIME_COLORS[strictHead] || '#64748b';
      return {
        ...c,
        coordinates: coords,
        strictHead,
        color,
      };
    });
  }, [filteredCases]);

  // Aggregate Top Crime Hotspot Clusters (Group by Place of Occurrence / Location)
  const hotspotClusters = useMemo(() => {
    const clusterMap: Record<
      string,
      {
        locationName: string;
        ps: string;
        subdivision: string;
        district: string;
        lat: number;
        lng: number;
        gr: string;
        count: number;
        srCount: number;
        crimeBreakdown: Record<string, number>;
        cases: typeof geoCases;
      }
    > = {};

    geoCases.forEach((c) => {
      const locKey = `${(c.placeOfOccurrence || c.poAddress || c.ps || 'General PO').trim().toLowerCase()}_${c.ps}`;
      if (!clusterMap[locKey]) {
        clusterMap[locKey] = {
          locationName: c.placeOfOccurrence || c.poAddress || `${c.ps} Area`,
          ps: c.ps,
          subdivision: c.subdivision || userSubdivision,
          district: (c as any).district || userDistrict,
          lat: c.coordinates.lat,
          lng: c.coordinates.lng,
          gr: c.coordinates.gr,
          count: 0,
          srCount: 0,
          crimeBreakdown: {},
          cases: [],
        };
      }
      clusterMap[locKey].count++;
      if (c.designation === 'SR') clusterMap[locKey].srCount++;
      clusterMap[locKey].crimeBreakdown[c.strictHead] =
        (clusterMap[locKey].crimeBreakdown[c.strictHead] || 0) + 1;
      clusterMap[locKey].cases.push(c);
    });

    return Object.values(clusterMap).sort((a, b) => b.count - a.count);
  }, [geoCases, userSubdivision, userDistrict]);

  // Active Hotspots visible based on cluster filter
  const visibleCases = useMemo(() => {
    if (!selectedHotspotCluster) return geoCases;
    return geoCases.filter(
      (c) =>
        (c.placeOfOccurrence || c.poAddress || `${c.ps} Area`).toLowerCase() ===
        selectedHotspotCluster.toLowerCase()
    );
  }, [geoCases, selectedHotspotCluster]);

  // =========================================================================
  // 5. LEAFLET MAP INITIALIZATION & LAYER RENDERING
  // =========================================================================
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      // Initialize map centered at Tarapur / Munger jurisdiction
      const map = L.map(mapContainerRef.current, {
        center: [25.1228, 86.6492],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      // Add Zoom control at top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Helper to get Tile Layer URL for Google Maps and Base Layers
      const getTileUrl = (layer: string) => {
        switch (layer) {
          case 'GOOGLE_ROADMAP':
            return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
          case 'GOOGLE_HYBRID':
            return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
          case 'GOOGLE_TERRAIN':
            return 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
          case 'DARK':
            return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
          case 'STREET':
          default:
            return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        }
      };

      L.tileLayer(getTileUrl(mapLayerType), {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3', 'a', 'b', 'c'],
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
      layerGroupRef.current = layerGroup;
    } else {
      // Update tile layer if mapLayerType changes
      const map = leafletMapRef.current;
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });

      const getTileUrl = (layer: string) => {
        switch (layer) {
          case 'GOOGLE_ROADMAP':
            return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
          case 'GOOGLE_HYBRID':
            return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
          case 'GOOGLE_TERRAIN':
            return 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
          case 'DARK':
            return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
          case 'STREET':
          default:
            return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        }
      };

      L.tileLayer(getTileUrl(mapLayerType), {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3', 'a', 'b', 'c'],
      }).addTo(map);
    }
  }, [mapLayerType]);

  // Render Markers and Hotspot Circles on Map
  useEffect(() => {
    if (!leafletMapRef.current || !layerGroupRef.current) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const bounds: [number, number][] = [];

    // 1. Render Hotspot Clusters (Density heat rings)
    if (hotspotDisplayMode !== 'PINS_ONLY') {
      hotspotClusters.forEach((cluster) => {
        const radius = Math.min(200 + cluster.count * 150, 1200);
        const isSelected = selectedHotspotCluster === cluster.locationName;
        const color = cluster.srCount > 0 ? '#ef4444' : cluster.count > 2 ? '#f59e0b' : '#3b82f6';

        const circle = L.circle([cluster.lat, cluster.lng], {
          radius: radius,
          color: isSelected ? '#ffffff' : color,
          weight: isSelected ? 3 : 1.5,
          fillColor: color,
          fillOpacity: isSelected ? 0.35 : 0.18,
          dashArray: cluster.srCount > 0 ? '4, 4' : undefined,
        });

        circle.on('click', () => {
          setSelectedHotspotCluster((prev) => (prev === cluster.locationName ? null : cluster.locationName));
        });

        circle.addTo(layerGroup);
      });
    }

    // 2. Render Incident Pins with crime-color pulses
    if (hotspotDisplayMode !== 'HOTSPOTS_ONLY') {
      visibleCases.forEach((c) => {
        bounds.push([c.coordinates.lat, c.coordinates.lng]);

        const isHeinous = c.designation === 'SR';
        const pinHtml = `
          <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
            <div class="w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform hover:scale-125" style="background-color: ${c.color};">
              <span class="text-[9px] font-black text-white">${c.strictHead.slice(0, 2).toUpperCase()}</span>
            </div>
            ${
              isHeinous
                ? `<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white animate-ping"></div>`
                : ''
            }
          </div>
        `;

        const customIcon = L.divIcon({
          html: pinHtml,
          className: 'crime-hotspot-pin',
          iconSize: [28, 28],
        });

        const marker = L.marker([c.coordinates.lat, c.coordinates.lng], { icon: customIcon });

        // Hover popup trigger
        marker.on('mouseover', (e: L.LeafletMouseEvent) => {
          const containerPoint = leafletMapRef.current?.latLngToContainerPoint(e.latlng);
          if (containerPoint) {
            setHoveredCase({
              caseItem: c,
              x: containerPoint.x,
              y: containerPoint.y,
              coordinates: c.coordinates,
            });
          }
        });

        marker.on('mouseout', () => {
          setHoveredCase(null);
        });

        marker.on('click', () => {
          if (onViewCase) onViewCase(c);
        });

        marker.addTo(layerGroup);
      });
    }

    // Auto fit bounds if points exist
    if (bounds.length > 0 && !selectedHotspotCluster) {
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [visibleCases, hotspotClusters, hotspotDisplayMode, selectedHotspotCluster, onViewCase]);

  // Center on jurisdiction helper
  const handleRecenter = () => {
    if (!leafletMapRef.current) return;
    if (visibleCases.length > 0) {
      const bounds = visibleCases.map((c) => [c.coordinates.lat, c.coordinates.lng] as [number, number]);
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else {
      leafletMapRef.current.setView([25.1228, 86.6492], 12);
    }
  };

  // Export filtered crime hotspot report to Excel
  const handleExportData = () => {
    const headers = [
      'Sl No',
      'FIR No',
      'Police Station',
      'Subdivision',
      'District',
      'FIR Date',
      'Crime Head',
      'Sections',
      'PO Address',
      'Grid Reference (GR)',
      'Latitude',
      'Longitude',
      'Designation',
      'Status',
      'IO Name',
      'Complainant',
      'Accused List',
      'Statutory Deadline',
    ];

    const rows = filteredCases.map((c, i) => {
      const coords = getCaseCoordinates(c);
      const dl = getDeadlineInfo(c);
      return [
        i + 1,
        c.firNumber,
        c.ps,
        c.subdivision || userSubdivision,
        (c as any).district || userDistrict,
        c.firDate,
        getStrictCrimeHead(c),
        c.sections,
        c.placeOfOccurrence || c.poAddress || 'N/A',
        coords.gr,
        coords.lat,
        coords.lng,
        c.designation || 'Non-SR',
        c.status,
        c.ioName || 'N/A',
        c.complainantName || 'N/A',
        (c.accusedList || []).map((a) => a.name).join(', ') || 'N/A',
        dl.label,
      ];
    });

    exportToExcel('BiharPolice_Crime_Hotspots', headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TOP FILTER CONTROLS CARD (IDENTICAL MULTI-PS SPECTRUM CONTROLS) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        {/* Top Search Bar & Scope Indicator */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by FIR No, Accused, PO Address, GR coordinates, Sections, Acts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
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
          {/* ADMINISTRATOR: DISTRICT DROPDOWN */}
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
                {availableDistricts.map((d, idx) => (
                  <option key={`${d}-${idx}`} value={d}>
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

          {/* SUBDIVISION DROPDOWN (FOR ADMIN & SP) */}
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
                {availableSubdivisions.map((sub, idx) => (
                  <option key={`${sub}-${idx}`} value={sub}>
                    {sub} Subdivision
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* POLICE STATIONS DROPDOWN */}
          {!isShoOrStationLevel && (
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                {isSdpo
                  ? 'PS under SDPO'
                  : isSpOrDistrictAdmin
                  ? 'PS under SP'
                  : 'Police Station(s)'}
              </label>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'stations' ? null : 'stations')}
                className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  selectedStations.length > 0
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <span className="truncate">
                  {selectedStations.length === 0
                    ? `All Stations (${availablePoliceStationsList.length})`
                    : `${selectedStations.length} Selected`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 ml-1 shrink-0 text-slate-400" />
              </button>

              {openDropdown === 'stations' && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-fadeIn"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Filter Stations ({availablePoliceStationsList.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedStations([])}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Search station..."
                    value={psSearch}
                    onChange={(e) => setPsSearch(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {availablePoliceStationsList
                      .filter((p) => p.toLowerCase().includes(psSearch.toLowerCase()))
                      .map((psName, idx) => {
                        const isChecked = selectedStations.includes(psName);
                        return (
                          <button
                            key={`${psName}-${idx}`}
                            type="button"
                            onClick={() => toggleStation(psName)}
                            className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isChecked
                                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span>{psName} PS</span>
                            {isChecked && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* YEARS FILTER */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
              Registration Year
            </label>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'years' ? null : 'years')}
              className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                selectedYears.length > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-400/40'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span className="truncate">
                {selectedYears.length === 0
                  ? 'All Years'
                  : selectedYears.length === 1
                  ? selectedYears[0]
                  : `${selectedYears.length} Years`}
              </span>
              <Calendar className="w-3.5 h-3.5 ml-1 shrink-0 text-slate-400" />
            </button>

            {openDropdown === 'years' && (
              <div
                ref={dropdownRef}
                className="absolute left-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Years</span>
                  <button
                    type="button"
                    onClick={() => setSelectedYears([])}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    All
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                  {allYears.map((yr, idx) => {
                    const isChecked = selectedYears.includes(yr);
                    return (
                      <button
                        key={`${yr}-${idx}`}
                        type="button"
                        onClick={() => toggleYear(yr)}
                        className={`py-1 px-2 rounded-md text-xs font-bold transition text-center cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* MONTHS FILTER */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
              Incident Month
            </label>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'months' ? null : 'months')}
              className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                selectedMonths.length > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-400/40'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span className="truncate">
                {selectedMonths.length === 0
                  ? 'All Months'
                  : `${selectedMonths.length} Months`}
              </span>
              <Clock className="w-3.5 h-3.5 ml-1 shrink-0 text-slate-400" />
            </button>

            {openDropdown === 'months' && (
              <div
                ref={dropdownRef}
                className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Months</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMonths([])}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    All
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {monthLabels.map((m, idx) => {
                    const isChecked = selectedMonths.includes(m.index);
                    return (
                      <button
                        key={`${m.label}-${idx}`}
                        type="button"
                        onClick={() => toggleMonth(m.index)}
                        className={`py-1 px-1.5 rounded-md text-xs font-bold transition text-center cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* CRIME HEADS DROPDOWN */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
              Crime Spectrum
            </label>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'crimes' ? null : 'crimes')}
              className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                selectedCrimeHeads.length > 0
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-400/40'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span className="truncate">
                {selectedCrimeHeads.length === 0
                  ? 'All Crime Heads'
                  : `${selectedCrimeHeads.length} Heads`}
              </span>
              <Flame className="w-3.5 h-3.5 ml-1 shrink-0 text-rose-500" />
            </button>

            {openDropdown === 'crimes' && (
              <div
                ref={dropdownRef}
                className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Crime Heads ({DISPLAY_CRIME_HEADS.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCrimeHeads([])}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search crime head..."
                  value={crimeSearch}
                  onChange={(e) => setCrimeSearch(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />

                <div className="max-h-52 overflow-y-auto space-y-1">
                  {DISPLAY_CRIME_HEADS.filter((ch) =>
                    ch.toLowerCase().includes(crimeSearch.toLowerCase())
                  ).map((ch, idx) => {
                    const isChecked = selectedCrimeHeads.includes(ch);
                    const color = CRIME_COLORS[ch] || '#64748b';
                    return (
                      <button
                        key={`${ch}-${idx}`}
                        type="button"
                        onClick={() => toggleCrimeHead(ch)}
                        className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isChecked
                            ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate">{ch}</span>
                        </div>
                        {isChecked && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DROPDOWNS ROW 2: ADVANCED FILTERS & MAP CONTROLS */}
        {/* ========================================================================= */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          {/* Active stats */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-slate-600 dark:text-slate-400">
              Showing <strong className="text-slate-900 dark:text-white font-black">{visibleCases.length}</strong> of{' '}
              {cases.length} Geocoded Cases across{' '}
              <strong className="text-indigo-600 dark:text-indigo-400 font-black">{hotspotClusters.length} Hotspot Zones</strong>
            </span>
            {selectedHotspotCluster && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center gap-1">
                Zone: {selectedHotspotCluster}
                <button
                  type="button"
                  onClick={() => setSelectedHotspotCluster(null)}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Quick Filter Reset & Export */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
            <button
              type="button"
              onClick={handleExportData}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Export Hotspot Data (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE CRIME HOTSPOT GIS MAP VIEWPORT & SIDEBAR */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Map Box (3 Columns on Large Screens) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col relative min-h-[560px]">
          {/* Map Controls Header Bar */}
          <div className="p-3 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500 text-white shadow-xs">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  CRIME HOTSPOT GIS MAP
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                    Live Density
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Hover marker to inspect FIR details • Click to view case dossier
                </p>
              </div>
            </div>

            {/* Layer and Viewport Controls */}
            <div className="flex items-center gap-1.5">
              {/* Map Layer Switcher */}
              <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[10px] font-bold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setMapLayerType('GOOGLE_ROADMAP')}
                  className={`px-2 py-0.5 rounded-md transition whitespace-nowrap cursor-pointer ${
                    mapLayerType === 'GOOGLE_ROADMAP'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Google Maps Standard"
                >
                  🗺️ Google Map
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayerType('GOOGLE_HYBRID')}
                  className={`px-2 py-0.5 rounded-md transition whitespace-nowrap cursor-pointer ${
                    mapLayerType === 'GOOGLE_HYBRID'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Google Maps Satellite Hybrid"
                >
                  🛰️ Satellite
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayerType('GOOGLE_TERRAIN')}
                  className={`px-2 py-0.5 rounded-md transition whitespace-nowrap cursor-pointer ${
                    mapLayerType === 'GOOGLE_TERRAIN'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Google Maps Terrain"
                >
                  ⛰️ Terrain
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayerType('DARK')}
                  className={`px-2 py-0.5 rounded-md transition whitespace-nowrap cursor-pointer ${
                    mapLayerType === 'DARK'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Dark Tactical Mode"
                >
                  🌙 Dark
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayerType('STREET')}
                  className={`px-2 py-0.5 rounded-md transition whitespace-nowrap cursor-pointer ${
                    mapLayerType === 'STREET'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="OpenStreetMap Standard"
                >
                  OSM
                </button>
              </div>

              {/* Display Mode */}
              <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setHotspotDisplayMode('ALL')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    hotspotDisplayMode === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setHotspotDisplayMode('HOTSPOTS_ONLY')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    hotspotDisplayMode === 'HOTSPOTS_ONLY'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Hotspots
                </button>
                <button
                  type="button"
                  onClick={() => setHotspotDisplayMode('PINS_ONLY')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    hotspotDisplayMode === 'PINS_ONLY'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Pins
                </button>
              </div>

              {/* Center Map */}
              <button
                type="button"
                onClick={handleRecenter}
                className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-2xs"
                title="Recenter Map"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Leaflet Map DOM Node */}
          <div className="flex-1 relative min-h-[500px] w-full z-0">
            <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />

            {/* Hover Dossier Popup Card */}
            {hoveredCase && (
              <div
                className="absolute z-50 pointer-events-none transition-all duration-75 ease-out"
                style={{
                  left: `${Math.min(hoveredCase.x + 15, (mapContainerRef.current?.clientWidth || 600) - 290)}px`,
                  top: `${Math.max(hoveredCase.y - 140, 10)}px`,
                }}
              >
                <div className="w-72 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: hoveredCase.caseItem.color }}
                      />
                      <span className="font-mono text-xs font-black text-amber-400">
                        {hoveredCase.caseItem.firNumber}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {hoveredCase.caseItem.ps} PS
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-extrabold text-white flex items-center gap-1">
                      <span>{hoveredCase.caseItem.strictHead}</span>
                      {hoveredCase.caseItem.designation === 'SR' && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-red-600 text-white rounded">
                          SR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium line-clamp-1 mt-0.5">
                      {hoveredCase.caseItem.sections || 'General Sections'}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span>Place of Occurrence:</span>
                      <strong className="text-slate-200 text-right truncate max-w-[140px]">
                        {hoveredCase.caseItem.placeOfOccurrence || hoveredCase.caseItem.poAddress || 'PO Area'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Grid Reference (GR):</span>
                      <strong className="text-indigo-400 font-mono">
                        {hoveredCase.coordinates.gr}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Investigating Officer:</span>
                      <strong className="text-slate-200">
                        {hoveredCase.caseItem.ioName || 'Not Assigned'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Complainant:</span>
                      <strong className="text-slate-200 truncate max-w-[140px]">
                        {hoveredCase.caseItem.complainantName || 'Confidential'}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-800 text-[9px] text-indigo-300 font-bold flex items-center justify-between">
                    <span>Status: {hoveredCase.caseItem.status}</span>
                    <span className="text-slate-400">Click pin to open case</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Hotspot Ranking Sidebar (1 Column) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3 flex flex-col h-full max-h-[640px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-500" />
              <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">
                Top Hotspots
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-500">
              {hotspotClusters.length} Zones
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {hotspotClusters.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No crime hotspots found for the selected filters.
              </div>
            ) : (
              hotspotClusters.map((cluster, idx) => {
                const isSelected = selectedHotspotCluster === cluster.locationName;
                return (
                  <div
                    key={`${cluster.locationName}-${idx}`}
                    onClick={() =>
                      setSelectedHotspotCluster(isSelected ? null : cluster.locationName)
                    }
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-400/30'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {cluster.locationName}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                          PS: {cluster.ps} • Subdiv: {cluster.subdivision}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          {cluster.count} Cases
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        GR: {cluster.gr}
                      </span>
                      {cluster.srCount > 0 && (
                        <span className="text-red-500 font-black">
                          🔥 {cluster.srCount} Heinous (SR)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
