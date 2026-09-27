import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FIRCase,
  PoliceStation,
  PoliceDistrict,
  PoliceSubdivision,
  UserRole,
  UserAccount,
  CrimeHead,
} from '../types';

// Safely obtain Leaflet instance from window.L (loaded via CDN in index.html) or global scope
const getLeaflet = (): any => {
  if (typeof window !== 'undefined' && (window as any).L) {
    return (window as any).L;
  }
  return null;
};
import {
  MapPin,
  Flame,
  Layers,
  Search,
  Filter,
  Eye,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Compass,
  Maximize2,
  Minimize2,
  RotateCcw,
  Navigation,
  FileText,
  Activity,
  Calendar,
  Building2,
  Crosshair,
  TrendingUp,
  Sparkles,
  Download,
  Info,
  CheckCircle2,
  Clock,
  Wine,
  Pill,
  Radio,
  Sliders,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  ExternalLink,
  Target,
  Zap,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { formatReadableDate, getDeadlineInfo, getPSFromRole } from '../utils/helpers';
import { LOCAL_GEO_DATABASE, formatGR } from '../utils/geoCoder';
import {
  getCaseCrimeHeads,
  ALL_CRIME_HEADS,
  DEFAULT_CRIME_HEADS_CONFIG,
  StatutoryCategory,
  doesCaseMatchCrimeHead,
} from '../utils/crimeClassifier';

export interface CrimeHotspotMapProps {
  cases: FIRCase[];
  districts?: PoliceDistrict[];
  subdivisions?: PoliceSubdivision[];
  availablePoliceStations?: PoliceStation[];
  currentRole: UserRole;
  currentUserAccount?: UserAccount | null;
  activePS?: string | null;
  onViewCase?: (c: FIRCase) => void;
  onEditCase?: (c: FIRCase) => void;
}

type MapTileProvider = 'GOOGLE_ROADMAP' | 'GOOGLE_HYBRID' | 'OPENSTREETMAP' | 'CARTO_DARK';

interface MappedCasePoint {
  caseItem: FIRCase;
  lat: number;
  lng: number;
  locationName: string;
  isExact: boolean;
  category: string;
  statutoryCategory: StatutoryCategory;
  primaryHead: string;
  color: string;
  iconSymbol: string;
}

interface HotspotCluster {
  id: string;
  name: string;
  psName: string;
  subdivisionName: string;
  centerLat: number;
  centerLng: number;
  count: number;
  srCount: number;
  violentCount: number;
  armsCount: number;
  liquorCount: number;
  ndpsCount: number;
  landDisputeCount: number;
  theftCount: number;
  cyberCount: number;
  cases: FIRCase[];
  radiusMeters: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  topCrimeHeads: { head: string; count: number }[];
}

const TILE_LAYERS: Record<
  MapTileProvider,
  { name: string; url: string; subdomains?: string; maxZoom: number; attribution: string }
> = {
  GOOGLE_ROADMAP: {
    name: 'Google Roadmap (Standard)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: 'Map data &copy; Google Maps',
  },
  GOOGLE_HYBRID: {
    name: 'Google Satellite & Tactical Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: 'Imagery &copy; Google Maps',
  },
  CARTO_DARK: {
    name: 'Tactical Night Command (Dark GIS)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; CARTO & OpenStreetMap',
  },
  OPENSTREETMAP: {
    name: 'OpenStreetMap Detailed Topo',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
};

// Deterministic jitter for cases lacking unique GPS coordinates
function computeCoordHash(seed: string): { dLat: number; dLng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const f1 = ((Math.abs(hash) % 1000) - 500) / 1000;
  const f2 = ((Math.abs(hash >> 4) % 1000) - 500) / 1000;
  return {
    dLat: f1 * 0.007,
    dLng: f2 * 0.007,
  };
}

// Map statutory crime head to styling & icons
function getCategoryInfo(c: FIRCase): {
  category: string;
  statutoryCategory: StatutoryCategory;
  primaryHead: string;
  color: string;
  iconSymbol: string;
} {
  const heads = getCaseCrimeHeads(c);
  const primaryHead = heads[0] || c.crimeHead || 'Other / General IPC & BNS';
  const headMeta = DEFAULT_CRIME_HEADS_CONFIG[primaryHead];

  if (c.designation === 'SR' || primaryHead.includes('Murder') || primaryHead.includes('Dacoity') || primaryHead.includes('Robbery') || primaryHead.includes('Rape') || primaryHead.includes('POCSO')) {
    return {
      category: 'Heinous & Violent',
      statutoryCategory: 'Heinous & Violent',
      primaryHead,
      color: '#ef4444',
      iconSymbol: '🩸',
    };
  }

  if (c.isArmsCase || primaryHead.includes('Arms Act')) {
    return {
      category: 'Arms Act',
      statutoryCategory: 'Special & Local Laws (SLL)',
      primaryHead: 'Arms Act (Illegal Weapons & Firing)',
      color: '#a855f7',
      iconSymbol: '🔫',
    };
  }

  if (c.isNdpsCase || primaryHead.includes('NDPS')) {
    return {
      category: 'NDPS / Narcotics',
      statutoryCategory: 'Special & Local Laws (SLL)',
      primaryHead: 'NDPS (Narcotics & Drugs)',
      color: '#f97316',
      iconSymbol: '💊',
    };
  }

  if (c.isLiquorCase || primaryHead.includes('Excise') || primaryHead.includes('Liquor')) {
    return {
      category: 'Excise / Liquor Prohibition',
      statutoryCategory: 'Special & Local Laws (SLL)',
      primaryHead: 'Excise / Prohibition / Liquor Cases',
      color: '#eab308',
      iconSymbol: '🍷',
    };
  }

  if (primaryHead.includes('Land Dispute') || primaryHead.includes('Rioting')) {
    return {
      category: 'Land Dispute & Rioting',
      statutoryCategory: 'Property & Economic',
      primaryHead,
      color: '#06b6d4',
      iconSymbol: '⚔️',
    };
  }

  if (primaryHead.includes('Theft') || primaryHead.includes('Burglary') || primaryHead.includes('Extortion')) {
    return {
      category: 'Property & Theft',
      statutoryCategory: 'Property & Economic',
      primaryHead,
      color: '#3b82f6',
      iconSymbol: '💰',
    };
  }

  if (primaryHead.includes('Cyber') || primaryHead.includes('Fraud')) {
    return {
      category: 'Cyber & Economic Fraud',
      statutoryCategory: 'Cyber & General',
      primaryHead,
      color: '#ec4899',
      iconSymbol: '💻',
    };
  }

  if (c.status === 'Disposed') {
    return {
      category: 'Disposed Case',
      statutoryCategory: headMeta?.category || 'Cyber & General',
      primaryHead,
      color: '#10b981',
      iconSymbol: '✅',
    };
  }

  return {
    category: headMeta?.category || 'General IPC / BNS',
    statutoryCategory: headMeta?.category || 'Cyber & General',
    primaryHead,
    color: '#6366f1',
    iconSymbol: '⚖️',
  };
}

export const CrimeHotspotMap: React.FC<CrimeHotspotMapProps> = ({
  cases,
  districts = [],
  subdivisions = [],
  availablePoliceStations = [],
  currentRole,
  currentUserAccount,
  activePS,
  onViewCase,
  onEditCase,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerGroupRef = useRef<any>(null);
  const hotspotCirclesLayerGroupRef = useRef<any>(null);
  const radarMarkersLayerGroupRef = useRef<any>(null);

  // Determine Login Level & Scoping capabilities
  const isAdministrator =
    currentRole === 'ADMINISTRATOR' ||
    currentRole === 'ADMIN' ||
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
    !isAdministrator &&
    !isDistrictLevel &&
    (currentRole === 'SDPO' || currentRole === 'CI' || currentUserAccount?.role === 'SDPO' || currentUserAccount?.role === 'CI');

  const isStationLevel = !isAdministrator && !isDistrictLevel && !isSubdivisionLevel;

  // Default values from user profile
  const userDistrict = currentUserAccount?.district || 'Munger';
  const userSubdivision = currentUserAccount?.subdivision || 'Tarapur';
  const userStation = getPSFromRole(currentRole) || currentUserAccount?.policeStation || activePS || 'Tarapur';

  // Hierarchy Filter States
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    isAdministrator ? 'ALL' : userDistrict
  );
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>(
    isAdministrator || isDistrictLevel ? 'ALL' : userSubdivision
  );
  const [selectedPS, setSelectedPS] = useState<string>(
    isStationLevel ? userStation : 'ALL'
  );

  // Crime Head & Category Filters
  const [selectedStatutoryCategory, setSelectedStatutoryCategory] = useState<string>('ALL');
  const [selectedCrimeHeads, setSelectedCrimeHeads] = useState<string[]>([]);
  const [isCrimeHeadDropdownOpen, setIsCrimeHeadDropdownOpen] = useState<boolean>(false);
  const [crimeHeadSearchQuery, setCrimeHeadSearchQuery] = useState<string>('');
  const crimeHeadDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedDesignation, setSelectedDesignation] = useState<'ALL' | 'SR' | 'NON_SR'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'DISPOSED'>('ALL');
  const [timeRangeFilter, setTimeRangeFilter] = useState<'ALL' | '7_DAYS' | '30_DAYS' | '90_DAYS' | '1_YEAR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Map Animation & Layer Display States
  const [selectedLayer, setSelectedLayer] = useState<MapTileProvider>('GOOGLE_ROADMAP');
  const [showRadarAnimation, setShowRadarAnimation] = useState<boolean>(true);
  const [showHotspotHeat, setShowHotspotHeat] = useState<boolean>(true);
  const [showIncidentMarkers, setShowIncidentMarkers] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedCluster, setSelectedCluster] = useState<HotspotCluster | null>(null);
  const [selectedCaseForDrawer, setSelectedCaseForDrawer] = useState<FIRCase | null>(null);

  // Available Subdivisions based on Selected District
  const filteredSubdivisions = useMemo(() => {
    if (selectedDistrict === 'ALL') return subdivisions;
    return subdivisions.filter(
      (s) => !s.districtName || s.districtName.toLowerCase() === selectedDistrict.toLowerCase()
    );
  }, [subdivisions, selectedDistrict]);

  // Available Police Stations based on Selected Subdivision & District
  const filteredPoliceStations = useMemo(() => {
    let list = availablePoliceStations;
    if (selectedDistrict !== 'ALL') {
      list = list.filter(
        (p) =>
          !p.districtName ||
          p.districtName.toLowerCase() === selectedDistrict.toLowerCase() ||
          (p as any).district?.toLowerCase() === selectedDistrict.toLowerCase()
      );
    }
    if (selectedSubdivision !== 'ALL') {
      list = list.filter(
        (p) =>
          !p.subdivisionName ||
          p.subdivisionName.toLowerCase() === selectedSubdivision.toLowerCase() ||
          (p as any).subdivision?.toLowerCase() === selectedSubdivision.toLowerCase()
      );
    }
    return list;
  }, [availablePoliceStations, selectedDistrict, selectedSubdivision]);

  // Handle cascading hierarchy changes
  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    setSelectedSubdivision('ALL');
    setSelectedPS('ALL');
  };

  const handleSubdivisionChange = (sub: string) => {
    setSelectedSubdivision(sub);
    setSelectedPS('ALL');
  };

  // Close crime head dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        crimeHeadDropdownRef.current &&
        !crimeHeadDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCrimeHeadDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered crime heads list based on search and optional statutory category
  const filteredCrimeHeadsList = useMemo(() => {
    let list: string[] = ALL_CRIME_HEADS;
    if (selectedStatutoryCategory !== 'ALL') {
      list = list.filter((head) => DEFAULT_CRIME_HEADS_CONFIG[head]?.category === selectedStatutoryCategory);
    }
    if (crimeHeadSearchQuery.trim()) {
      const q = crimeHeadSearchQuery.toLowerCase();
      list = list.filter((head) => {
        const meta = DEFAULT_CRIME_HEADS_CONFIG[head];
        return (
          head.toLowerCase().includes(q) ||
          meta?.hindiName?.toLowerCase().includes(q) ||
          meta?.description?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [selectedStatutoryCategory, crimeHeadSearchQuery]);

  const toggleCrimeHead = (head: string) => {
    setSelectedCrimeHeads((prev) =>
      prev.includes(head) ? prev.filter((h) => h !== head) : [...prev, head]
    );
  };

  const selectAllCrimeHeads = () => {
    setSelectedCrimeHeads([...filteredCrimeHeadsList]);
  };

  const clearAllCrimeHeads = () => {
    setSelectedCrimeHeads([]);
  };

  // Convert raw FIR Cases to Geocoded map data points
  const mappedPoints = useMemo<MappedCasePoint[]>(() => {
    const today = new Date().getTime();

    return cases.map((c) => {
      let lat = c.latitude;
      let lng = c.longitude;
      let isExact = Boolean(lat && lng);
      let locationName = c.placeOfOccurrence || c.poAddress || c.ps;

      if (!lat || !lng) {
        // Look up in Bihar Police Local Geo Database
        const lowerPO = (c.placeOfOccurrence || c.poAddress || '').toLowerCase();
        const lowerPS = (c.ps || '').toLowerCase();
        let matched = null;

        for (const [key, val] of Object.entries(LOCAL_GEO_DATABASE)) {
          if (lowerPO && lowerPO.includes(key)) {
            matched = val;
            break;
          }
        }
        if (!matched && lowerPS) {
          for (const [key, val] of Object.entries(LOCAL_GEO_DATABASE)) {
            if (lowerPS.includes(key) || key.includes(lowerPS)) {
              matched = val;
              break;
            }
          }
        }

        if (matched) {
          const jitter = computeCoordHash(`${c.id}_${c.firNumber}_${c.ps}`);
          lat = matched.lat + jitter.dLat;
          lng = matched.lng + jitter.dLng;
          locationName = `${matched.name}, PS ${c.ps}`;
        } else {
          // Default fallback to Tarapur / Sub-division center with deterministic spatial distribution
          const base = LOCAL_GEO_DATABASE['tarapur'] || { lat: 25.1228, lng: 86.6492, name: 'Tarapur' };
          const jitter = computeCoordHash(`${c.id}_${c.firNumber}_${c.ps}`);
          lat = base.lat + jitter.dLat;
          lng = base.lng + jitter.dLng;
          locationName = `${c.placeOfOccurrence || c.ps}`;
        }
      }

      const catInfo = getCategoryInfo(c);

      return {
        caseItem: c,
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        locationName,
        isExact,
        category: catInfo.category,
        statutoryCategory: catInfo.statutoryCategory,
        primaryHead: catInfo.primaryHead,
        color: catInfo.color,
        iconSymbol: catInfo.iconSymbol,
      };
    });
  }, [cases]);

  // Apply all multi-level filters (Hierarchy, Crime Heads, Time, Status, Search)
  const filteredPoints = useMemo(() => {
    const now = new Date().getTime();

    return mappedPoints.filter((p) => {
      const c = p.caseItem;

      // 1. Hierarchy Filter (District / Subdivision / PS)
      if (selectedDistrict !== 'ALL') {
        const cDist = (c as any).district;
        if (cDist && cDist.toLowerCase() !== selectedDistrict.toLowerCase()) {
          // Check if station belongs to selected district
          const st = availablePoliceStations.find((s) => s.name === c.ps);
          const stDist = st?.districtName || (st as any)?.district;
          if (stDist && stDist.toLowerCase() !== selectedDistrict.toLowerCase()) {
            return false;
          }
        }
      }

      if (selectedSubdivision !== 'ALL') {
        const cSub = c.subdivision;
        if (cSub && cSub.toLowerCase() !== selectedSubdivision.toLowerCase()) {
          const st = availablePoliceStations.find((s) => s.name === c.ps);
          const stSub = st?.subdivisionName || (st as any)?.subdivision;
          if (stSub && stSub.toLowerCase() !== selectedSubdivision.toLowerCase()) {
            return false;
          }
        }
      }

      if (selectedPS !== 'ALL' && c.ps !== selectedPS) {
        return false;
      }

      // 2. Designation Filter
      if (selectedDesignation !== 'ALL' && c.designation !== selectedDesignation) {
        return false;
      }

      // 3. Status Filter
      if (selectedStatus === 'ACTIVE' && c.status === 'Disposed') return false;
      if (selectedStatus === 'DISPOSED' && c.status !== 'Disposed') return false;

      // 4. Time Range Filter
      if (timeRangeFilter !== 'ALL' && c.firDate) {
        const caseTime = new Date(c.firDate).getTime();
        if (!isNaN(caseTime)) {
          const diffDays = (now - caseTime) / (1000 * 60 * 60 * 24);
          if (timeRangeFilter === '7_DAYS' && diffDays > 7) return false;
          if (timeRangeFilter === '30_DAYS' && diffDays > 30) return false;
          if (timeRangeFilter === '90_DAYS' && diffDays > 90) return false;
          if (timeRangeFilter === '1_YEAR' && diffDays > 365) return false;
        }
      }

      // 5. Statutory Category Filter
      if (selectedStatutoryCategory !== 'ALL') {
        if (p.statutoryCategory !== selectedStatutoryCategory) {
          return false;
        }
      }

      // 6. Specific Crime Head Filter (Multiple Selection Supported)
      if (selectedCrimeHeads.length > 0) {
        const heads = getCaseCrimeHeads(c);
        const matchesAny = selectedCrimeHeads.some((targetHead) => {
          if (doesCaseMatchCrimeHead(c, targetHead)) return true;
          if (heads.includes(targetHead as CrimeHead) || c.crimeHead === targetHead) return true;

          const lowerTarget = targetHead.toLowerCase();
          if (lowerTarget.includes('arms') && c.isArmsCase) return true;
          if (lowerTarget.includes('ndps') && c.isNdpsCase) return true;
          if ((lowerTarget.includes('excise') || lowerTarget.includes('liquor')) && c.isLiquorCase) return true;
          if (p.primaryHead && (p.primaryHead === targetHead || p.primaryHead.toLowerCase().includes(lowerTarget))) return true;

          return false;
        });

        if (!matchesAny) {
          return false;
        }
      }

      // 7. Search Query across all fields
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const firNum = (c.firNumber || '').toLowerCase();
        const po = (c.placeOfOccurrence || '').toLowerCase();
        const ps = (c.ps || '').toLowerCase();
        const comp = (c.complainantName || '').toLowerCase();
        const sec = (c.sections || '').toLowerCase();
        const io = (c.ioName || '').toLowerCase();
        const heads = getCaseCrimeHeads(c).join(' ').toLowerCase();

        if (
          !firNum.includes(q) &&
          !po.includes(q) &&
          !ps.includes(q) &&
          !comp.includes(q) &&
          !sec.includes(q) &&
          !io.includes(q) &&
          !heads.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    mappedPoints,
    selectedDistrict,
    selectedSubdivision,
    selectedPS,
    selectedDesignation,
    selectedStatus,
    timeRangeFilter,
    selectedStatutoryCategory,
    selectedCrimeHeads,
    searchQuery,
    availablePoliceStations,
  ]);

  // Spatial Hotspot Clustering (~750m proximity aggregation)
  const hotspotClusters = useMemo<HotspotCluster[]>(() => {
    const clusters: HotspotCluster[] = [];
    const used = new Set<string>();

    filteredPoints.forEach((pt) => {
      if (used.has(pt.caseItem.id)) return;

      const group: MappedCasePoint[] = [pt];
      used.add(pt.caseItem.id);

      filteredPoints.forEach((other) => {
        if (used.has(other.caseItem.id)) return;
        const dist = Math.hypot(pt.lat - other.lat, pt.lng - other.lng);
        // ~0.0075 deg ~= 750-800 meters
        if (dist < 0.0075) {
          group.push(other);
          used.add(other.caseItem.id);
        }
      });

      if (group.length >= 2) {
        const avgLat = group.reduce((sum, g) => sum + g.lat, 0) / group.length;
        const avgLng = group.reduce((sum, g) => sum + g.lng, 0) / group.length;
        const srCount = group.filter((g) => g.caseItem.designation === 'SR').length;
        const violentCount = group.filter((g) => {
          const heads = getCaseCrimeHeads(g.caseItem);
          return heads.some((h) =>
            h.includes('Murder') || h.includes('Rape') || h.includes('Dacoity') || h.includes('Robbery')
          );
        }).length;
        const armsCount = group.filter((g) => g.caseItem.isArmsCase).length;
        const liquorCount = group.filter((g) => g.caseItem.isLiquorCase).length;
        const ndpsCount = group.filter((g) => g.caseItem.isNdpsCase).length;
        const landDisputeCount = group.filter((g) => {
          const heads = getCaseCrimeHeads(g.caseItem);
          return heads.some((h) => h.includes('Land Dispute') || h.includes('Rioting'));
        }).length;
        const theftCount = group.filter((g) => {
          const heads = getCaseCrimeHeads(g.caseItem);
          return heads.some((h) => h.includes('Theft') || h.includes('Burglary'));
        }).length;
        const cyberCount = group.filter((g) => {
          const heads = getCaseCrimeHeads(g.caseItem);
          return heads.some((h) => h.includes('Cyber') || h.includes('Fraud'));
        }).length;

        // Head frequency map
        const headCounts: Record<string, number> = {};
        group.forEach((g) => {
          getCaseCrimeHeads(g.caseItem).forEach((h) => {
            headCounts[h] = (headCounts[h] || 0) + 1;
          });
        });
        const topCrimeHeads = Object.entries(headCounts)
          .map(([head, count]) => ({ head, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        let severity: HotspotCluster['severity'] = 'LOW';
        if (group.length >= 5 || violentCount >= 2 || srCount >= 3 || armsCount >= 2) {
          severity = 'CRITICAL';
        } else if (group.length >= 3 || armsCount >= 1 || violentCount >= 1 || liquorCount >= 2) {
          severity = 'HIGH';
        } else if (group.length >= 2) {
          severity = 'MEDIUM';
        }

        clusters.push({
          id: `cluster-${clusters.length + 1}`,
          name: group[0].locationName || `Zone near PS ${group[0].caseItem.ps}`,
          psName: group[0].caseItem.ps,
          subdivisionName: group[0].caseItem.subdivision || 'Tarapur',
          centerLat: Number(avgLat.toFixed(5)),
          centerLng: Number(avgLng.toFixed(5)),
          count: group.length,
          srCount,
          violentCount,
          armsCount,
          liquorCount,
          ndpsCount,
          landDisputeCount,
          theftCount,
          cyberCount,
          cases: group.map((g) => g.caseItem),
          radiusMeters: Math.min(950, 400 + group.length * 100),
          severity,
          topCrimeHeads,
        });
      }
    });

    return clusters.sort((a, b) => b.count - a.count);
  }, [filteredPoints]);

  // Spatial Analytics Metrics
  const stats = useMemo(() => {
    const total = filteredPoints.length;
    const sr = filteredPoints.filter((p) => p.caseItem.designation === 'SR').length;
    const active = filteredPoints.filter((p) => p.caseItem.status !== 'Disposed').length;
    const violent = filteredPoints.filter((p) => p.statutoryCategory === 'Heinous & Violent').length;
    const arms = filteredPoints.filter((p) => p.caseItem.isArmsCase).length;
    const liquor = filteredPoints.filter((p) => p.caseItem.isLiquorCase).length;
    const ndps = filteredPoints.filter((p) => p.caseItem.isNdpsCase).length;
    const criticalHotspots = hotspotClusters.filter((c) => c.severity === 'CRITICAL').length;
    const highHotspots = hotspotClusters.filter((c) => c.severity === 'HIGH').length;

    return {
      total,
      sr,
      active,
      violent,
      arms,
      liquor,
      ndps,
      criticalHotspots,
      highHotspots,
      totalHotspots: hotspotClusters.length,
    };
  }, [filteredPoints, hotspotClusters]);

  // Initialize Map
  useEffect(() => {
    const L = getLeaflet();
    if (!L || !mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const initialLat = 25.1228;
      const initialLng = 86.6492;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 12,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Tile layer
      const config = TILE_LAYERS[selectedLayer];
      const layer = L.tileLayer(config.url, {
        maxZoom: config.maxZoom,
        subdomains: config.subdomains || 'abc',
        attribution: config.attribution,
      }).addTo(map);

      tileLayerRef.current = layer;

      // Layer groups
      hotspotCirclesLayerGroupRef.current = L.layerGroup().addTo(map);
      radarMarkersLayerGroupRef.current = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = L.layerGroup().addTo(map);

      leafletMapRef.current = map;
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    const L = getLeaflet();
    if (!L || !leafletMapRef.current) return;
    if (tileLayerRef.current) {
      leafletMapRef.current.removeLayer(tileLayerRef.current);
    }
    const config = TILE_LAYERS[selectedLayer];
    const newLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || 'abc',
      attribution: config.attribution,
    }).addTo(leafletMapRef.current);
    tileLayerRef.current = newLayer;
  }, [selectedLayer]);

  // Render Hotspots, Animated Radars, and Incident Pins
  useEffect(() => {
    const L = getLeaflet();
    const map = leafletMapRef.current;
    if (!L || !map) return;

    // Clear previous elements
    hotspotCirclesLayerGroupRef.current?.clearLayers();
    radarMarkersLayerGroupRef.current?.clearLayers();
    markersLayerGroupRef.current?.clearLayers();

    // 1. Render Animated Radar Sweep and Concentric Ripple Waves on Hotspots
    if (showRadarAnimation && radarMarkersLayerGroupRef.current) {
      hotspotClusters.forEach((cluster) => {
        const isCritical = cluster.severity === 'CRITICAL';
        const isHigh = cluster.severity === 'HIGH';

        const radarPulseHtml = `
          <div class="relative flex items-center justify-center w-24 h-24 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <!-- Outer Pulsing Ripple Wave 1 -->
            <div class="absolute inset-0 rounded-full border-2 ${
              isCritical
                ? 'border-rose-500 bg-rose-500/25 animate-hotspot-ripple'
                : isHigh
                ? 'border-amber-500 bg-amber-500/25 animate-hotspot-ripple'
                : 'border-sky-500 bg-sky-500/20 animate-hotspot-ripple'
            }"></div>

            <!-- Delayed Outer Pulsing Ripple Wave 2 -->
            <div class="absolute inset-2 rounded-full border-2 ${
              isCritical
                ? 'border-rose-400 bg-rose-500/15 animate-hotspot-ripple-delay'
                : isHigh
                ? 'border-amber-400 bg-amber-500/15 animate-hotspot-ripple-delay'
                : 'border-sky-400 bg-sky-500/15 animate-hotspot-ripple-delay'
            }"></div>

            <!-- Rotating Radar Sweep Beam on Critical Hotspots -->
            ${
              isCritical
                ? `
                <div class="absolute inset-0 rounded-full animate-radar-sweep opacity-75 overflow-hidden">
                  <div class="w-1/2 h-1/2 bg-gradient-to-br from-rose-500/40 via-rose-500/10 to-transparent"></div>
                </div>
              `
                : ''
            }

            <!-- Center Core Glow Beacon -->
            <div class="relative w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[11px] shadow-2xl border-2 border-white dark:border-slate-950 ${
              isCritical
                ? 'bg-rose-600 animate-hotspot-beacon shadow-rose-600/80'
                : isHigh
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/80'
                : 'bg-sky-600 shadow-sky-600/80'
            }">
              <span class="z-10">${cluster.count}</span>
            </div>
          </div>
        `;

        const radarIcon = L.divIcon({
          html: radarPulseHtml,
          className: 'radar-cluster-icon',
          iconSize: [96, 96],
          iconAnchor: [48, 48],
        });

        const radarMarker = L.marker([cluster.centerLat, cluster.centerLng], {
          icon: radarIcon,
          zIndexOffset: 500,
        });

        radarMarker.on('click', () => {
          setSelectedCluster(cluster);
          map.flyTo([cluster.centerLat, cluster.centerLng], 15, { duration: 1.2 });
        });

        radarMarkersLayerGroupRef.current?.addLayer(radarMarker);
      });
    }

    // 2. Render Static / Semi-transparent Hotspot Heat Radius Rings
    if (showHotspotHeat && hotspotCirclesLayerGroupRef.current) {
      hotspotClusters.forEach((cluster) => {
        let strokeColor = '#0284c7';
        let fillColor = '#38bdf8';
        let opacity = 0.2;

        if (cluster.severity === 'CRITICAL') {
          strokeColor = '#dc2626';
          fillColor = '#ef4444';
          opacity = 0.35;
        } else if (cluster.severity === 'HIGH') {
          strokeColor = '#d97706';
          fillColor = '#f59e0b';
          opacity = 0.28;
        }

        const circle = L.circle([cluster.centerLat, cluster.centerLng], {
          radius: cluster.radiusMeters,
          color: strokeColor,
          weight: 2,
          fillColor: fillColor,
          fillOpacity: opacity,
          dashArray: cluster.severity === 'CRITICAL' ? '5, 5' : undefined,
        });

        circle.bindTooltip(
          `
            <div class="px-2.5 py-1.5 font-sans text-xs bg-slate-950 text-white rounded-lg shadow-xl border border-slate-700">
              <div class="font-extrabold text-amber-400 flex items-center gap-1">
                <span>🔥 ${cluster.name}</span>
              </div>
              <div class="text-[11px] font-semibold text-rose-300 mt-0.5">
                ${cluster.count} Incidents • ${cluster.srCount} SR Cases
              </div>
              <div class="text-[10px] text-slate-300">
                Threat: <span class="font-bold text-amber-300">${cluster.severity}</span> (PS ${cluster.psName})
              </div>
            </div>
          `,
          { sticky: true, className: 'leaflet-custom-tooltip' }
        );

        circle.on('click', () => {
          setSelectedCluster(cluster);
          map.flyTo([cluster.centerLat, cluster.centerLng], 15, { duration: 1.2 });
        });

        hotspotCirclesLayerGroupRef.current?.addLayer(circle);
      });
    }

    // 3. Render Individual Incident Markers
    if (showIncidentMarkers && markersLayerGroupRef.current) {
      filteredPoints.forEach((pt) => {
        const isSR = pt.caseItem.designation === 'SR';
        const isDisposed = pt.caseItem.status === 'Disposed';

        const markerHtml = `
          <div class="relative group cursor-pointer transition-transform hover:scale-125 duration-150" style="transform: translate(-50%, -100%);">
            <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-lg border-2 border-white dark:border-slate-900 text-white font-black text-[11px]" style="background-color: ${pt.color};">
              <span>${pt.iconSymbol}</span>
            </div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rounded-full border border-white"></div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'tactical-crime-pin',
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -28],
        });

        const marker = L.marker([pt.lat, pt.lng], { icon: customIcon });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-3 font-sans text-slate-900 dark:text-white text-xs min-w-[240px] max-w-[280px]';
        popupContent.innerHTML = `
          <div class="border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
            <div class="flex items-center justify-between gap-2">
              <span class="font-black text-sm text-slate-900 dark:text-white">FIR No. ${pt.caseItem.firNumber}</span>
              <span class="text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                isSR
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
              }">
                ${pt.caseItem.designation}
              </span>
            </div>
            <div class="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              PS ${pt.caseItem.ps} • ${formatReadableDate(pt.caseItem.firDate)}
            </div>
          </div>

          <div class="space-y-1.5 text-[11px] mb-3">
            <div>
              <span class="font-bold text-slate-500 dark:text-slate-400">Head:</span>
              <span class="ml-1 font-bold text-slate-900 dark:text-slate-100">${pt.primaryHead}</span>
            </div>
            <div>
              <span class="font-bold text-slate-500 dark:text-slate-400">Sections:</span>
              <span class="ml-1 text-slate-700 dark:text-slate-300 font-mono text-[10px]">${pt.caseItem.sections || 'IPC/BNS'}</span>
            </div>
            <div>
              <span class="font-bold text-slate-500 dark:text-slate-400">PO:</span>
              <span class="ml-1 text-slate-800 dark:text-slate-200">${pt.locationName}</span>
            </div>
            <div>
              <span class="font-bold text-slate-500 dark:text-slate-400">IO:</span>
              <span class="ml-1 text-slate-800 dark:text-slate-200">${pt.caseItem.ioName || 'Not Assigned'}</span>
            </div>
            <div class="flex items-center gap-1.5 pt-1">
              <span class="font-bold text-slate-500 dark:text-slate-400">Status:</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-black ${
                isDisposed
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }">
                ${pt.caseItem.status}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button id="btn-view-dossier-${pt.caseItem.id}" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition">
              <span>Inspect Case Dossier</span>
              <span>➔</span>
            </button>
          </div>
        `;

        popupContent.querySelector(`#btn-view-dossier-${pt.caseItem.id}`)?.addEventListener('click', () => {
          if (onViewCase) {
            onViewCase(pt.caseItem);
          } else {
            setSelectedCaseForDrawer(pt.caseItem);
          }
        });

        marker.bindPopup(popupContent, { maxWidth: 300 });
        markersLayerGroupRef.current?.addLayer(marker);
      });
    }

    // Adjust map extent to show all points
    if (filteredPoints.length > 0 && map) {
      const bounds = L.latLngBounds(filteredPoints.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [filteredPoints, hotspotClusters, showRadarAnimation, showHotspotHeat, showIncidentMarkers, onViewCase]);

  // Smooth Fly-to helper
  const handleFlyToCluster = (cluster: HotspotCluster) => {
    setSelectedCluster(cluster);
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([cluster.centerLat, cluster.centerLng], 15, {
        duration: 1.2,
      });
    }
  };

  // Re-invalidate map size whenever fullscreen mode changes
  useEffect(() => {
    const triggerResize = () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize({ pan: false, debounceMoveend: true });
      }
    };

    // Immediate frame
    triggerResize();
    requestAnimationFrame(triggerResize);

    // Staggered timers to ensure layout transitions and tile fetches are fully loaded
    const t1 = setTimeout(triggerResize, 50);
    const t2 = setTimeout(triggerResize, 150);
    const t3 = setTimeout(triggerResize, 350);
    const t4 = setTimeout(triggerResize, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isFullscreen]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Reset Map View to default extent
  const handleResetView = () => {
    const L = getLeaflet();
    if (leafletMapRef.current) {
      if (filteredPoints.length > 0 && L) {
        const bounds = L.latLngBounds(filteredPoints.map((p) => [p.lat, p.lng]));
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } else {
        leafletMapRef.current.setView([25.1228, 86.6492], 12);
      }
      setSelectedCluster(null);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner & Spatial Tactical Command Header */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-indigo-500/20 shadow-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 relative overflow-hidden">
        
        {/* Glow ambient background circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3.5 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-2xl font-black shadow-xl shadow-amber-500/25 flex items-center justify-center shrink-0">
            <Radio className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black tracking-widest uppercase text-amber-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Bihar Police Spatial GIS Tactical Command
              </span>
              <span className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span> Live Spatial Pulse
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
              <span>Interactive Crime Hotspot & Radar Intelligence Desk</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-category statutory crime mapping, animated radar proximity detection, and automated patrol deployment zones.
            </p>
          </div>
        </div>

        {/* Tactical Key Metrics Ribbon */}
        <div className="flex items-center flex-wrap gap-2 text-xs relative z-10">
          <div className="bg-slate-900/90 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-2xl font-bold flex items-center gap-2 shadow-inner">
            <MapPin className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Total POs Mapped</div>
              <div className="text-sm font-black text-white">{stats.total} Incidents</div>
            </div>
          </div>

          <div className="bg-rose-950/70 border border-rose-600/40 text-rose-200 px-3.5 py-2 rounded-2xl font-bold flex items-center gap-2 shadow-inner">
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            <div>
              <div className="text-[10px] text-rose-300 uppercase font-semibold">Hotspot Clusters</div>
              <div className="text-sm font-black text-rose-400">{stats.totalHotspots} Zones ({stats.criticalHotspots} Critical)</div>
            </div>
          </div>

          <div className="bg-purple-950/70 border border-purple-600/40 text-purple-200 px-3.5 py-2 rounded-2xl font-bold flex items-center gap-2 shadow-inner">
            <Crosshair className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-[10px] text-purple-300 uppercase font-semibold">Arms & Heinous</div>
              <div className="text-sm font-black text-purple-300">{stats.violent + stats.arms} Cases</div>
            </div>
          </div>

          <div className="bg-amber-950/70 border border-amber-600/40 text-amber-200 px-3.5 py-2 rounded-2xl font-bold flex items-center gap-2 shadow-inner">
            <Wine className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-amber-300 uppercase font-semibold">Excise & NDPS</div>
              <div className="text-sm font-black text-amber-300">{stats.liquor + stats.ndps} Cases</div>
            </div>
          </div>
        </div>

      </div>

      {/* Role-Based Hierarchy & Category Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm space-y-3.5">
        
        {/* Tier 1: Role-Adaptive Jurisdiction Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* District Selector (Only for Administrator Login) */}
          {isAdministrator ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>District Jurisdiction</span>
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden cursor-pointer"
              >
                <option value="ALL">All Districts (State Command)</option>
                {districts.map((d) => (
                  <option key={d.id || d.name} value={d.name}>
                    {d.name} District
                  </option>
                ))}
                <option value="Munger">Munger District</option>
                <option value="Bhagalpur">Bhagalpur District</option>
                <option value="Patna">Patna District</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Assigned District</span>
              </label>
              <div className="w-full px-3 py-2 text-xs font-black rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200">
                {userDistrict} District
              </div>
            </div>
          )}

          {/* Subdivision Selector (Available for Administrator & SP Login) */}
          {isAdministrator || isDistrictLevel ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Subdivision Jurisdiction</span>
              </label>
              <select
                value={selectedSubdivision}
                onChange={(e) => handleSubdivisionChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden cursor-pointer"
              >
                <option value="ALL">All Subdivisions</option>
                {filteredSubdivisions.map((s) => (
                  <option key={s.id || s.name} value={s.name}>
                    {s.name} Subdivision
                  </option>
                ))}
                <option value="Tarapur">Tarapur Subdivision</option>
                <option value="Munger Sadar">Munger Sadar Subdivision</option>
                <option value="Kharagpur">Haveli Kharagpur Subdivision</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Subdivision</span>
              </label>
              <div className="w-full px-3 py-2 text-xs font-black rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200">
                {userSubdivision} Sub-Division
              </div>
            </div>
          )}

          {/* Police Station Selector (Available for Administrator, SP, and SDPO Login) */}
          {!isStationLevel ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Police Station</span>
              </label>
              <select
                value={selectedPS}
                onChange={(e) => setSelectedPS(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden cursor-pointer"
              >
                <option value="ALL">All Police Stations</option>
                {filteredPoliceStations.map((ps) => (
                  <option key={ps.id || ps.name} value={ps.name}>
                    PS {ps.name}
                  </option>
                ))}
                <option value="Tarapur">PS Tarapur</option>
                <option value="Asarganj">PS Asarganj</option>
                <option value="Sangrampur">PS Sangrampur</option>
                <option value="Harpur">PS Harpur</option>
                <option value="Haveli Kharagpur">PS Haveli Kharagpur</option>
                <option value="Tetiabambar">PS Tetiabambar</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Police Station</span>
              </label>
              <div className="w-full px-3 py-2 text-xs font-black rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200">
                PS {userStation}
              </div>
            </div>
          )}

          {/* Statutory Category Group */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              <span>Statutory Group</span>
            </label>
            <select
              value={selectedStatutoryCategory}
              onChange={(e) => setSelectedStatutoryCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden cursor-pointer"
            >
              <option value="ALL">All Statutory Groups</option>
              <option value="Heinous & Violent">🩸 Heinous & Violent</option>
              <option value="Special & Local Laws (SLL)">⚖️ Special & Local Laws (SLL)</option>
              <option value="Property & Economic">💰 Property & Economic</option>
              <option value="Women & Children">🛡️ Women & Children</option>
              <option value="Cyber & General">🌐 Cyber & General IPC/BNS</option>
            </select>
          </div>

          {/* Specific Crime Head Multi-Select Selector */}
          <div className="relative" ref={crimeHeadDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-rose-500" />
                <span>Specific Crime Head</span>
                {selectedCrimeHeads.length > 0 && (
                  <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                    {selectedCrimeHeads.length}
                  </span>
                )}
              </label>
              {selectedCrimeHeads.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllCrimeHeads}
                  className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Clear ({selectedCrimeHeads.length})
                </button>
              )}
            </div>

            {/* Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCrimeHeadDropdownOpen(!isCrimeHeadDropdownOpen)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden cursor-pointer flex items-center justify-between gap-1.5 text-left transition hover:border-amber-400 dark:hover:border-amber-500"
            >
              <div className="truncate flex-1">
                {selectedCrimeHeads.length === 0 ? (
                  <span className="text-slate-600 dark:text-slate-400">All Specific Crime Heads</span>
                ) : selectedCrimeHeads.length === 1 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1.5 truncate">
                    <span>{DEFAULT_CRIME_HEADS_CONFIG[selectedCrimeHeads[0]]?.icon || '📌'}</span>
                    <span className="truncate">{selectedCrimeHeads[0]}</span>
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1.5 truncate">
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0">
                      {selectedCrimeHeads.length} Selected
                    </span>
                    <span className="truncate text-slate-800 dark:text-slate-200">
                      {selectedCrimeHeads[0]} +{selectedCrimeHeads.length - 1} more
                    </span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {selectedCrimeHeads.length > 0 && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllCrimeHeads();
                    }}
                    className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-rose-500 cursor-pointer"
                    title="Clear selected crime heads"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    isCrimeHeadDropdownOpen ? 'rotate-180 text-amber-500' : ''
                  }`}
                />
              </div>
            </button>

            {/* Dropdown Popover */}
            {isCrimeHeadDropdownOpen && (
              <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-80 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2.5 space-y-2 max-w-[95vw] animate-in fade-in zoom-in-95 duration-150">
                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={crimeHeadSearchQuery}
                    onChange={(e) => setCrimeHeadSearchQuery(e.target.value)}
                    placeholder="Search crime heads..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500 outline-hidden"
                    autoFocus
                  />
                  {crimeHeadSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCrimeHeadSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Quick Actions Header */}
                <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span>
                    {selectedCrimeHeads.length} of {ALL_CRIME_HEADS.length} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllCrimeHeads}
                      className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={clearAllCrimeHeads}
                      className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* List of Heads with Checkboxes */}
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {filteredCrimeHeadsList.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No crime heads matching "{crimeHeadSearchQuery}"
                    </div>
                  ) : (
                    filteredCrimeHeadsList.map((head) => {
                      const isSelected = selectedCrimeHeads.includes(head);
                      const meta = DEFAULT_CRIME_HEADS_CONFIG[head];
                      return (
                        <div
                          key={head}
                          onClick={() => toggleCrimeHead(head)}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition select-none ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-slate-900 dark:text-white font-extrabold border border-amber-300 dark:border-amber-800'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                isSelected
                                  ? 'bg-amber-500 border-amber-500 text-slate-950'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="shrink-0">{meta?.icon || '📌'}</span>
                            <div className="truncate">
                              <div className="truncate leading-tight">{head}</div>
                              {meta?.hindiName && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">
                                  {meta.hindiName}
                                </div>
                              )}
                            </div>
                          </div>

                          {meta?.category && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                              {meta.category.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Apply Button */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Select multiple heads to combine
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCrimeHeadDropdownOpen(false)}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs cursor-pointer shadow-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Time Window Recency Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Incident Timeframe</span>
            </label>
            <select
              value={timeRangeFilter}
              onChange={(e) => setTimeRangeFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden cursor-pointer"
            >
              <option value="ALL">All Time History</option>
              <option value="7_DAYS">Last 7 Days (Emergency QRT)</option>
              <option value="30_DAYS">Last 30 Days (Monthly Hotspots)</option>
              <option value="90_DAYS">Last 90 Days (Quarterly Spatial)</option>
              <option value="1_YEAR">Last 1 Year (Annual Trends)</option>
            </select>
          </div>

        </div>

        {/* Tier 2: Search Bar + Quick Category Filter Chips */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Place of Occurrence (PO), FIR No., Complainant, Sections, IO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedStatutoryCategory('ALL');
                clearAllCrimeHeads();
              }}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                selectedStatutoryCategory === 'ALL' && selectedCrimeHeads.length === 0
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>All Crimes</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedStatutoryCategory('Heinous & Violent');
                clearAllCrimeHeads();
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                selectedStatutoryCategory === 'Heinous & Violent' && selectedCrimeHeads.length === 0
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <span>🩸 Heinous / SR</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCrimeHead('Arms Act')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCrimeHeads.includes('Arms Act')
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/40'
                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 hover:bg-purple-100'
              }`}
            >
              <span>🔫 Arms Act</span>
              {selectedCrimeHeads.includes('Arms Act') && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            <button
              type="button"
              onClick={() => toggleCrimeHead('Bihar Prohibition & Excise Act (Liquor)')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCrimeHeads.includes('Bihar Prohibition & Excise Act (Liquor)')
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/40'
                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <span>🍷 Excise / Liquor</span>
              {selectedCrimeHeads.includes('Bihar Prohibition & Excise Act (Liquor)') && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            <button
              type="button"
              onClick={() => toggleCrimeHead('NDPS Act')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCrimeHeads.includes('NDPS Act')
                  ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/40'
                  : 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 hover:bg-orange-100'
              }`}
            >
              <span>💊 NDPS</span>
              {selectedCrimeHeads.includes('NDPS Act') && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            <button
              type="button"
              onClick={() => toggleCrimeHead('Land Dispute / Rioting')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCrimeHeads.includes('Land Dispute / Rioting')
                  ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400/40'
                  : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 hover:bg-sky-100'
              }`}
            >
              <span>⚔️ Land Disputes</span>
              {selectedCrimeHeads.includes('Land Dispute / Rioting') && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            <button
              type="button"
              onClick={() => toggleCrimeHead('Theft')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCrimeHeads.includes('Theft')
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100'
              }`}
            >
              <span>💰 Theft</span>
              {selectedCrimeHeads.includes('Theft') && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            <button
              type="button"
              onClick={() => toggleCrimeHead('POCSO Act')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCrimeHeads.includes('POCSO Act')
                  ? 'bg-pink-600 text-white shadow-md ring-2 ring-pink-400/40'
                  : 'bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300 hover:bg-pink-100'
              }`}
            >
              <span>🛡️ POCSO Act</span>
              {selectedCrimeHeads.includes('POCSO Act') && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
          </div>

        </div>

        {/* Active Multi-Selected Crime Heads Pills */}
        {selectedCrimeHeads.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-500" />
              <span>Active Selected Heads ({selectedCrimeHeads.length}):</span>
            </span>
            {selectedCrimeHeads.map((head) => (
              <span
                key={head}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-2xs"
              >
                <span>{DEFAULT_CRIME_HEADS_CONFIG[head]?.icon || '📌'}</span>
                <span>{head}</span>
                <button
                  type="button"
                  onClick={() => toggleCrimeHead(head)}
                  className="p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-md text-amber-700 dark:text-amber-300 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                  title={`Remove ${head}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAllCrimeHeads}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline px-1.5 cursor-pointer ml-1"
            >
              Clear All ({selectedCrimeHeads.length})
            </button>
          </div>
        )}

        {/* Tier 3: Map View Controls & Tactical Layer Toggles */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          
          {/* Map Layer Mode */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Map Layer:
            </span>
            {(['GOOGLE_ROADMAP', 'GOOGLE_HYBRID', 'CARTO_DARK', 'OPENSTREETMAP'] as MapTileProvider[]).map((layer) => (
              <button
                key={layer}
                onClick={() => setSelectedLayer(layer)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  selectedLayer === layer
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {layer === 'GOOGLE_ROADMAP' && 'Roadmap'}
                {layer === 'GOOGLE_HYBRID' && 'Satellite Hybrid'}
                {layer === 'CARTO_DARK' && 'Dark Command HUD'}
                {layer === 'OPENSTREETMAP' && 'OSM Standard'}
              </button>
            ))}
          </div>

          {/* Interactive Animations & Visibility Toggles */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Animated Radar Toggle */}
            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRadarAnimation}
                onChange={(e) => setShowRadarAnimation(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400"
              />
              <span className="flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Radar Pulse Wave</span>
              </span>
            </label>

            {/* Density Rings Toggle */}
            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showHotspotHeat}
                onChange={(e) => setShowHotspotHeat(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Heat Density Rings</span>
            </label>

            {/* Incident Pins Toggle */}
            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showIncidentMarkers}
                onChange={(e) => setShowIncidentMarkers(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400"
              />
              <span>Incident Pins</span>
            </label>

            <button
              onClick={handleResetView}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Extent</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm text-xs"
              title={isFullscreen ? 'Exit Full Screen Map' : 'Expand Only Map to Full Screen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? 'Exit Map Full Screen' : 'Map Full Screen'}</span>
            </button>

          </div>

        </div>

      </div>

      {/* Main Tactical Grid: Leaflet Map Surface + Hotspots Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Interactive GIS Map */}
        <div
          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col ${
            isFullscreen
              ? 'fixed inset-0 z-[9999] rounded-none border-none h-screen w-screen bg-slate-950'
              : 'lg:col-span-8'
          }`}
        >
          
          {/* Map Top Status Bar */}
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-800 flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-300">Live Spatial GIS Stream</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 font-mono font-bold">{filteredPoints.length} Crimes Displayed</span>
              {isFullscreen && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Full Screen Map Mode
                </span>
              )}
            </div>

            {/* Quick Map Legend & Fullscreen Close/Controls */}
            <div className="flex items-center gap-3 text-[11px] flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Heinous / SR
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Arms Act
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Excise
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> NDPS
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Land Disputes
              </span>

              {/* Direct Fullscreen Exit / Toggle Button on Map Header */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`ml-2 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer text-xs ${
                  isFullscreen
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title={isFullscreen ? 'Exit Full Screen Map' : 'View Only Map in Full Screen'}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Map Full Screen</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Leaflet Canvas Container */}
          <div
            ref={mapContainerRef}
            style={
              isFullscreen
                ? { height: 'calc(100vh - 84px)', width: '100vw', minHeight: '400px' }
                : { height: '600px', minHeight: '520px', width: '100%' }
            }
            className="w-full bg-slate-900 relative z-10"
          />

          {/* Map Bottom Coordinates & SOP Indicator */}
          <div className="bg-slate-50 dark:bg-slate-950/90 px-4 py-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2 shrink-0">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>Bihar Police Spatial Coordinate Reference (EPSG:4326 / WGS84)</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-slate-600 dark:text-slate-400">
                Click any pulsating cluster or pin to inspect case dossier
              </span>
              {isFullscreen && (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-[10px] cursor-pointer"
                >
                  ESC / Close
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Hotspot Threat Ranking & Cluster Intelligence */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Top Identified Hotspots Cards */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                <span>Identified Crime Hotspot Zones</span>
              </h3>
              <span className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                {hotspotClusters.length} Active Zones
              </span>
            </div>

            {hotspotClusters.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <span className="font-bold">No high-density cluster detected in selected scope.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {hotspotClusters.map((cluster) => {
                  const isSelected = selectedCluster?.id === cluster.id;
                  const isCritical = cluster.severity === 'CRITICAL';
                  const isHigh = cluster.severity === 'HIGH';

                  return (
                    <div
                      key={cluster.id}
                      onClick={() => handleFlyToCluster(cluster)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow-lg ring-2 ring-amber-500/30'
                          : isCritical
                          ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 hover:border-rose-400 hover:shadow-md'
                          : isHigh
                          ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-300'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <MapPin className={`w-3.5 h-3.5 ${isCritical ? 'text-rose-500' : 'text-amber-500'}`} />
                            <span>{cluster.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            PS {cluster.psName} • {cluster.subdivisionName}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            isCritical
                              ? 'bg-rose-600 text-white shadow-sm'
                              : isHigh
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {cluster.count} Incidents
                        </span>
                      </div>

                      {/* Crime Composition Breakdown Tags */}
                      <div className="flex items-center flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                        {cluster.srCount > 0 && (
                          <span className="bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 font-extrabold px-2 py-0.5 rounded-md">
                            {cluster.srCount} SR
                          </span>
                        )}
                        {cluster.violentCount > 0 && (
                          <span className="bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300 font-bold px-2 py-0.5 rounded-md">
                            {cluster.violentCount} Violent
                          </span>
                        )}
                        {cluster.armsCount > 0 && (
                          <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 font-bold px-2 py-0.5 rounded-md">
                            {cluster.armsCount} Arms
                          </span>
                        )}
                        {cluster.liquorCount > 0 && (
                          <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-bold px-2 py-0.5 rounded-md">
                            {cluster.liquorCount} Excise
                          </span>
                        )}
                        {cluster.landDisputeCount > 0 && (
                          <span className="bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 font-bold px-2 py-0.5 rounded-md">
                            {cluster.landDisputeCount} Land
                          </span>
                        )}

                        <span className="ml-auto text-amber-600 dark:text-amber-400 font-black flex items-center gap-0.5 hover:underline">
                          Focus ➔
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cluster Case Drill-Down Card */}
          {selectedCluster && (
            <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-4 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>Cases in {selectedCluster.name}</span>
                </div>
                <button
                  onClick={() => setSelectedCluster(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {selectedCluster.cases.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>FIR {c.firNumber}</span>
                        <span className="font-normal text-[11px] text-slate-500">
                          ({formatReadableDate(c.firDate)})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[190px]">
                        {c.sections} • IO: {c.ioName || 'Not Assigned'}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onViewCase) {
                          onViewCase(c);
                        } else {
                          setSelectedCaseForDrawer(c);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] shadow-xs cursor-pointer shrink-0 transition"
                    >
                      Dossier
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tactical Spatial SOP Deployment Card */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-indigo-100 p-4 rounded-3xl border border-indigo-500/30 text-xs space-y-2.5 shadow-lg">
            <div className="font-extrabold text-amber-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Patrol & Spatial SOP Mandate</span>
            </div>
            <p className="text-[11px] text-indigo-200 leading-relaxed">
              Pulsating crimson zones highlight crime repeats within 750m. Sub-divisional SOP orders motorized QRT mobile patrolling, static checkposts, and intense vehicle frisking during 22:00 to 04:00 hours.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default CrimeHotspotMap;
