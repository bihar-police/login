import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Search,
  Compass,
  CheckCircle2,
  Navigation,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  LocateFixed,
  AlertCircle,
} from 'lucide-react';
import {
  fetchGRForAddress,
  searchPlaceSuggestions,
  reverseGeocodeLatLng,
  formatGR,
  PlaceSuggestion,
  LOCAL_GEO_DATABASE,
} from '../utils/geoCoder';

// Safely obtain Leaflet instance from window.L (loaded via CDN in index.html) or global scope
const getLeaflet = (): any => {
  if (typeof window !== 'undefined' && (window as any).L) {
    return (window as any).L;
  }
  return null;
};

export interface POAddressMapPickerProps {
  value: string;
  onChange: (address: string) => void;
  grNumber: string;
  onGrChange: (gr: string) => void;
  latitude?: number;
  longitude?: number;
  onCoordinatesChange: (lat: number, lng: number, formattedAddress?: string) => void;
  psName?: string;
  subdivisionName?: string;
  districtName?: string;
  disabled?: boolean;
  required?: boolean;
}

export const POAddressMapPicker: React.FC<POAddressMapPickerProps> = ({
  value,
  onChange,
  grNumber,
  onGrChange,
  latitude,
  longitude,
  onCoordinatesChange,
  psName,
  subdivisionName,
  districtName,
  disabled = false,
  required = false,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [mapLayerType, setMapLayerType] = useState<'GOOGLE_ROADMAP' | 'GOOGLE_HYBRID' | 'STREET'>('GOOGLE_ROADMAP');
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick localities list for this PS or default
  const localChips = React.useMemo(() => {
    const list: { name: string; lat: number; lng: number }[] = [];
    const cleanPS = (psName || '').toLowerCase();
    for (const [, val] of Object.entries(LOCAL_GEO_DATABASE)) {
      if (cleanPS && (val.name.toLowerCase().includes(cleanPS) || val.subdivision.toLowerCase().includes(cleanPS))) {
        list.push({ name: val.name, lat: val.lat, lng: val.lng });
      }
    }
    if (list.length === 0) {
      return [
        { name: 'Tarapur Bazaar', lat: 25.1245, lng: 86.6510 },
        { name: 'Belbihari Chowk', lat: 25.1280, lng: 86.6450 },
        { name: 'Dhuria', lat: 25.1160, lng: 86.6580 },
        { name: 'Asarganj Market', lat: 25.1540, lng: 86.6910 },
        { name: 'Sangrampur Block', lat: 25.0760, lng: 86.6230 },
      ];
    }
    return list.slice(0, 5);
  }, [psName]);

  // Live Place Search on Typing
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddr = e.target.value;
    onChange(newAddr);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (newAddr.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await searchPlaceSuggestions(newAddr, psName, subdivisionName, districtName);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch {
          // ignore
        } finally {
          setIsSearching(false);
        }
      }, 350);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Select place from suggestions
  const handleSelectSuggestion = (s: PlaceSuggestion) => {
    onChange(s.name);
    const gr = formatGR(s.lat, s.lng);
    onGrChange(gr);
    onCoordinatesChange(s.lat, s.lng, s.formattedAddress);
    setShowSuggestions(false);
    setStatusMessage(`📍 Location picked: ${s.name} (${gr})`);
    setTimeout(() => setStatusMessage(null), 4000);

    // Pan map to location
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([s.lat, s.lng], 15);
      updateMarker(s.lat, s.lng, s.name);
    }
  };

  // Trigger explicit Fetch / Search on Map
  const handleSearchOnMap = async () => {
    if (!value.trim()) {
      setStatusMessage('Please enter a Place of Occurrence (PO) address first.');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setIsSearching(true);
    setStatusMessage('Searching on Google Maps & Police GIS...');
    try {
      const res = await fetchGRForAddress(value, psName, subdivisionName, districtName);
      onGrChange(res.grNumber);
      onCoordinatesChange(res.latitude, res.longitude, res.formattedLocation);
      setStatusMessage(`✓ Picked GR ${res.grNumber} (${res.formattedLocation})`);
      setTimeout(() => setStatusMessage(null), 4000);

      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
        leafletMapRef.current.setView([res.latitude, res.longitude], 15);
        updateMarker(res.latitude, res.longitude, res.formattedLocation || value);
      }
    } catch {
      setStatusMessage('Unable to resolve location. Click anywhere on the map to pick GR.');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsSearching(false);
    }
  };

  // Get current device GPS location
  const handlePickCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingGPS(true);
    setStatusMessage('Fetching GPS fix from device sensors...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const gr = formatGR(lat, lng);
        onGrChange(gr);
        onCoordinatesChange(lat, lng);
        setIsLocatingGPS(false);

        // Try reverse geocode
        try {
          const revAddr = await reverseGeocodeLatLng(lat, lng);
          if (revAddr && !value.trim()) {
            onChange(revAddr);
          }
        } catch {
          // ignore
        }

        setStatusMessage(`✓ GPS locked: ${gr}`);
        setTimeout(() => setStatusMessage(null), 4000);

        if (leafletMapRef.current) {
          leafletMapRef.current.setView([lat, lng], 16);
          updateMarker(lat, lng, 'Current GPS PO');
        }
      },
      (err) => {
        setIsLocatingGPS(false);
        setStatusMessage(`GPS error: ${err.message || 'Location access denied'}`);
        setTimeout(() => setStatusMessage(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Update marker helper
  const updateMarker = useCallback((lat: number, lng: number, title?: string) => {
    const L = getLeaflet();
    if (!L || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    const pinHtml = `
      <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
        <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center animate-bounce">
          <span class="text-[10px] font-black text-white">PO</span>
        </div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-rose-600 rotate-45 border-r border-b border-white"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: pinHtml,
      className: 'po-picker-marker',
      iconSize: [32, 32],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setIcon(customIcon);
    } else {
      const marker = L.marker([lat, lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      // Drag event to pick new GR
      marker.on('dragend', async (e: any) => {
        const target = e.target;
        const newPos = target.getLatLng();
        const newLat = Number(newPos.lat.toFixed(5));
        const newLng = Number(newPos.lng.toFixed(5));
        const newGr = formatGR(newLat, newLng);
        onGrChange(newGr);
        onCoordinatesChange(newLat, newLng);

        setStatusMessage(`📍 GR updated to ${newGr}`);
        setTimeout(() => setStatusMessage(null), 3000);
      });

      markerRef.current = marker;
    }

    if (title) {
      markerRef.current.bindPopup(
        `<div class="p-1 text-xs"><strong>PO:</strong> ${title}<br/><span class="font-mono text-[10px] text-indigo-600">${formatGR(lat, lng)}</span></div>`
      );
    }
  }, [onCoordinatesChange, onGrChange]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!isMapExpanded || !mapContainerRef.current) return;
    const L = getLeaflet();
    if (!L) return;

    if (!leafletMapRef.current) {
      const initialLat = latitude || 25.1228;
      const initialLng = longitude || 86.6492;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: latitude && longitude ? 15 : 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      const getTileUrl = (layer: string) => {
        switch (layer) {
          case 'GOOGLE_ROADMAP':
            return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
          case 'GOOGLE_HYBRID':
            return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
          case 'STREET':
          default:
            return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        }
      };

      L.tileLayer(getTileUrl(mapLayerType), {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3', 'a', 'b', 'c'],
      }).addTo(map);

      // CLICK ON MAP TO PICK GR
      map.on('click', async (e: any) => {
        const clickedLat = Number(e.latlng.lat.toFixed(5));
        const clickedLng = Number(e.latlng.lng.toFixed(5));
        const newGr = formatGR(clickedLat, clickedLng);

        onGrChange(newGr);
        onCoordinatesChange(clickedLat, clickedLng);
        updateMarker(clickedLat, clickedLng, value || 'Selected Point of Occurrence');

        // Reverse geocode to refine address if empty or user clicks
        try {
          const approxName = await reverseGeocodeLatLng(clickedLat, clickedLng);
          if (approxName && (!value.trim() || value.startsWith('PO Location'))) {
            onChange(approxName);
          }
        } catch {
          // ignore
        }

        setStatusMessage(`📍 GR picked on map: ${newGr}`);
        setTimeout(() => setStatusMessage(null), 3500);
      });

      leafletMapRef.current = map;

      setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 250);

      if (latitude && longitude) {
        updateMarker(latitude, longitude, value);
      }
    } else {
      // Switch tile layer
      const map = leafletMapRef.current;
      map.eachLayer((layer: any) => {
        if (layer && (layer._url || (L.TileLayer && layer instanceof L.TileLayer))) {
          map.removeLayer(layer);
        }
      });

      const getTileUrl = (layer: string) => {
        switch (layer) {
          case 'GOOGLE_ROADMAP':
            return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
          case 'GOOGLE_HYBRID':
            return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
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
  }, [isMapExpanded, mapLayerType, latitude, longitude, value, onChange, onCoordinatesChange, onGrChange, updateMarker]);

  // Sync marker if coordinates change from external prop
  useEffect(() => {
    if (latitude && longitude && leafletMapRef.current) {
      updateMarker(latitude, longitude, value);
    }
  }, [latitude, longitude, value, updateMarker]);

  return (
    <div ref={containerRef} className="space-y-2.5">
      {/* Top Header Label & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs sm:text-sm flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-rose-500" />
          <span>Place of Occurrence (PO) Address {required && <span className="text-rose-500">*</span>}</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePickCurrentGPS}
            disabled={disabled || isLocatingGPS}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
            title="Pick device GPS location"
          >
            <LocateFixed className={`w-3 h-3 text-blue-500 ${isLocatingGPS ? 'animate-spin' : ''}`} />
            <span>{isLocatingGPS ? 'Locating...' : 'GPS Fix'}</span>
          </button>
          <button
            type="button"
            onClick={handleSearchOnMap}
            disabled={disabled || isSearching}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
            title="Search PO on Google Maps and fetch Grid Reference (GR)"
          >
            <Compass className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
            <span>{isSearching ? 'Searching...' : 'Search on Map & Fetch GR'}</span>
          </button>
        </div>
      </div>

      {/* Address Search Input with Autocomplete Dropdown */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={handleAddressInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchOnMap();
              }
            }}
            disabled={disabled}
            required={required}
            placeholder="Type PO address e.g. Belbihari Chowk, Tarapur Bazaar, Dhuria Village, Main Market..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 transition shadow-2xs"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Autocomplete Suggestions Menu */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-fadeIn">
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Google Maps & GIS Place Suggestions</span>
              <span className="text-indigo-600 dark:text-indigo-400">{suggestions.length} Found</span>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/60 transition flex items-start gap-2.5 cursor-pointer group"
                >
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.formattedAddress}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded">
                        GR: {item.gr}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400">
                        {item.source}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Select Locality Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Quick PO:</span>
        </span>
        {localChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onChange(chip.name);
              const gr = formatGR(chip.lat, chip.lng);
              onGrChange(gr);
              onCoordinatesChange(chip.lat, chip.lng, chip.name);
              if (leafletMapRef.current) {
                leafletMapRef.current.setView([chip.lat, chip.lng], 15);
                updateMarker(chip.lat, chip.lng, chip.name);
              }
              setStatusMessage(`📍 Picked: ${chip.name} (${gr})`);
              setTimeout(() => setStatusMessage(null), 3000);
            }}
            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-700 hover:text-indigo-900 dark:text-slate-300 dark:hover:text-indigo-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            {chip.name}
          </button>
        ))}
      </div>

      {/* Grid Reference (GR) Value & Locked Badge */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Compass className="w-3 h-3 text-indigo-500" />
            <span>Grid Reference (GR) Coordinates</span>
          </label>
          <input
            type="text"
            value={grNumber}
            onChange={(e) => {
              const val = e.target.value;
              onGrChange(val);
              const parts = val.split(',').map((p) => parseFloat(p.trim()));
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                onCoordinatesChange(parts[0], parts[1]);
                if (leafletMapRef.current) {
                  leafletMapRef.current.setView([parts[0], parts[1]], 15);
                  updateMarker(parts[0], parts[1], value || 'Manual GR Input');
                }
              }
            }}
            placeholder="e.g. 25.12280, 86.64920"
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300"
          />
        </div>

        <div className="flex items-center">
          {latitude && longitude ? (
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 w-full flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <div>GIS Point Locked</div>
                  <div className="font-mono text-[9px] text-slate-500">
                    {latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E
                  </div>
                </div>
              </div>
              <span className="px-1.5 py-0.5 bg-emerald-200/60 dark:bg-emerald-900/60 rounded text-[9px] font-bold text-emerald-900 dark:text-emerald-200">
                Hotspot Active
              </span>
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] font-semibold text-amber-800 dark:text-amber-300 w-full flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Type PO or click on the map below to lock exact GPS Grid Reference.</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-900 dark:text-indigo-200 animate-fadeIn flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Embedded Interactive Google / GIS Map Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-900">
        {/* Map Header Toolbar */}
        <div className="px-3 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Interactive Map Location Picker</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
              (Click anywhere or drag pin to pick GR)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Map Layer Switcher */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-md text-[9px] font-bold">
              <button
                type="button"
                onClick={() => setMapLayerType('GOOGLE_ROADMAP')}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                  mapLayerType === 'GOOGLE_ROADMAP'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Google Map
              </button>
              <button
                type="button"
                onClick={() => setMapLayerType('GOOGLE_HYBRID')}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                  mapLayerType === 'GOOGLE_HYBRID'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={() => setMapLayerType('STREET')}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                  mapLayerType === 'STREET'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                OSM
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              title={isMapExpanded ? 'Collapse Map' : 'Expand Map'}
            >
              {isMapExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Map Viewport */}
        {isMapExpanded && (
          <div className="relative w-full h-[220px] sm:h-[260px] bg-slate-100 dark:bg-slate-950">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            <div className="absolute bottom-2 left-2 z-10 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-1 rounded-md text-[10px] font-mono shadow">
              🎯 Click anywhere on map to set GR
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
