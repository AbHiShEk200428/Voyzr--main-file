import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { TripMember } from "@/types";
import { cn, getInitials } from "@/lib/utils";
import { simplifyPolyline, getSectorTileUrls } from "@/lib/mapUtils";
import { Navigation, Map as MapIcon, ExternalLink, Clock, Clock4, Timer, User as UserIcon, LocateFixed, Layers, ChevronDown, Radar, Zap, MapPin, Flag, X, Sparkles, Plus, RefreshCw, Trash2, Target, Radio, Download, Star, TrendingUp, Pin, Car } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "@/hooks/useLocation";
import type { MemberLocation, MemberCursor, SyncReport } from "@/hooks/useLocation";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

// Standard Leaflet Marker Icons
const destinationIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const curatedPinIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [20, 32],
  iconAnchor: [10, 32],
  popupAnchor: [1, -30],
});

const rallyIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [35, 50],
  iconAnchor: [17, 50],
  popupAnchor: [1, -45],
});

// Origin (route start)
const originIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute inset-0 rounded-full bg-blue-500 opacity-20 marker-pulse-dot" style="width: 30px; height: 30px; margin: -5px"></div>
      <div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.2);position:relative;z-index:10"></div>
    </div>
  `,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Category pin for POIs
const getColoredPin = (color: string): L.DivIcon => {
  return L.divIcon({
    html: `<div style="width:24px;height:24px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:white;border-radius:50%"></div></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const getCategoryPin = (type: string): L.DivIcon => {
  const map: Record<string, { color: string; emoji: string }> = {
    FEAST:     { color: '#0f172a', emoji: '🍽' },
    STAY:      { color: '#0f172a', emoji: '🏨' },
    LANDMARK:  { color: '#0f172a', emoji: '🏛' },
    INTEL:     { color: '#0f172a', emoji: '📍' },
    CUSTOM:    { color: '#3b82f6', emoji: '⭐' },
  };
  const entry = map[type] || { color: '#0f172a', emoji: '📍' };
  return L.divIcon({
    html: `<div style="width:24px;height:24px;background:white;border:2px solid ${entry.color};border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;font-size:11px">${entry.emoji}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const TacticalProbe = ({ 
  position, 
  onDrag, 
  onDragStart,
  onDragEnd,
  eta,
  isDragging
}: { 
  position: [number, number], 
  onDrag: (e: L.LeafletEvent) => void,
  onDragStart: () => void,
  onDragEnd: (e: L.DragEndEvent) => void,
  eta: string | null,
  isDragging: boolean
}) => {
  const probeIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 bg-slate-900 rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden transition-transform duration-200 ${isDragging ? 'scale-110' : 'scale-100'}">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
        ${eta ? `<div class="absolute top-10 whitespace-nowrap bg-slate-900 px-2 py-1 rounded text-[8px] font-bold text-white uppercase tracking-widest shadow-lg">${eta}</div>` : ''}
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <Marker 
      position={position} 
      icon={probeIcon} 
      draggable={true}
      eventHandlers={{ 
        drag: onDrag,
        dragstart: onDragStart,
        dragend: onDragEnd 
      }}
      zIndexOffset={3000}
    >
      <Popup>
        <div className="p-2 text-center bg-white rounded shadow-sm">
          <p className="font-bold text-[10px] uppercase text-slate-900">Map Probe</p>
          <p className="text-[8px] font-medium text-slate-500 uppercase">Interactive Scanner</p>
        </div>
      </Popup>
    </Marker>
  );
};

// ── UI COMPONENTS ────────────────────────────────────────────────

const ElevationProfile = ({ data }: { data: { name: string; elevation: number }[] }) => (
  <div className="h-24 w-full mt-4 bg-slate-50 rounded-xl border border-slate-200 p-2 overflow-hidden">
    <div className="flex items-center gap-2 mb-1 px-2">
      <TrendingUp className="h-3 w-3 text-slate-600" />
      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Elevation (Meters)</span>
    </div>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <RechartsTooltip 
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '8px' }}
        />
        <Area 
          type="monotone" 
          dataKey="elevation" 
          stroke="#0f172a" 
          fill="#f1f5f9" 
          strokeWidth={2}
          isAnimationActive={true}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const CoordinateHUD = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const map = useMapEvents({
    move() {
      const center = map.getCenter();
      setCoords({ lat: center.lat, lng: center.lng });
    },
    load() {
      const center = map.getCenter();
      setCoords({ lat: center.lat, lng: center.lng });
    }
  });

  useEffect(() => {
    const center = map.getCenter();
    setCoords({ lat: center.lat, lng: center.lng });
  }, [map]);

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-3 shadow-sm">
      <div className="flex items-center gap-1">
        <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Lat</span>
        <span className="text-[9px] font-mono text-slate-900 font-bold">{coords.lat.toFixed(6)}</span>
      </div>
      <div className="w-[1px] h-3 bg-slate-200" />
      <div className="flex items-center gap-1">
        <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Lng</span>
        <span className="text-[9px] font-mono text-slate-900 font-bold">{coords.lng.toFixed(6)}</span>
      </div>
    </div>
  );
};

const SectorDownloadManager = ({ onDownload }: { onDownload: (map: L.Map) => void }) => {
  const map = useMap();
  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      <Button
        onClick={() => onDownload(map)}
        className="h-10 w-10 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-all group"
        variant="outline"
        title="Download Map Area"
      >
        <Download className="h-4 w-4 text-slate-600" />
      </Button>
    </div>
  );
};

const DownloadProgressHUD = ({ progress }: { progress: { current: number; total: number } }) => (
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5000] w-64 bg-white p-6 rounded-2xl border border-slate-200 shadow-xl text-center">
    <div className="mb-4">
      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Download className="h-5 w-5 text-slate-900 animate-bounce" />
      </div>
      <h4 className="text-slate-900 font-bold text-xs uppercase tracking-widest">Downloading Area</h4>
      <p className="text-[8px] text-slate-500 font-medium uppercase tracking-widest mt-1">Caching for offline use</p>
    </div>
    
    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
      <motion.div 
        className="bg-slate-900 h-full"
        initial={{ width: 0 }}
        animate={{ width: `${(progress.current / progress.total) * 100}%` }}
      />
    </div>
    
    <div className="flex justify-between items-center">
      <span className="text-[8px] font-bold text-slate-400 uppercase">{progress.current} / {progress.total}</span>
      <span className="text-[8px] font-bold text-slate-900 uppercase">{Math.round((progress.current / progress.total) * 100)}%</span>
    </div>
  </div>
);

interface LiveTrackingMapProps {
  tripId: string | number;
  destination: { lat: number; lng: number; name: string };
  members: TripMember[];
  currentUserId: string;
  memberLocations: Record<string, { lat: number; lng: number; status: string }>;
  onLocationUpdate?: (lat: number, lng: number) => void;
  targetArrivalTime?: string;
  sideQuests?: { id: string; name: string; lat: number; lng: number; type: string }[];
  triggerRecon?: boolean;
  rallyPoint?: { lat: number; lng: number; droppedBy: string } | null;
  onDropRallyPoint?: (lat: number, lng: number) => void;
  onClearRallyPoint?: () => void;
  onQuestsUpdated?: () => void;
  onDiscoveredPlaces?: (places: any[]) => void;
  forceCenter?: [number, number] | null;
  pinnedPlaces?: { id: string; name: string; lat: number; lng: number; color: string }[];
  onPinPlace?: (place: any, color: string) => void;
  curatedAttractions?: any[];
  onAddQuest?: (quest: any) => void;
}

function TripBoundsManager({ userLocation, destination, sideQuests, tripId }: { 
  userLocation: [number, number] | null, 
  destination: { lat: number; lng: number }, 
  sideQuests: any[],
  tripId: string | number
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [
      [destination.lat, destination.lng]
    ];
    if (userLocation) points.push(userLocation);
    sideQuests.forEach(q => {
      if (typeof q.lat === 'number' && typeof q.lng === 'number') {
        points.push([q.lat, q.lng]);
      }
    });

    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { 
        padding: [50, 50],
        animate: true,
        duration: 2.0 
      });
    } else {
      map.flyTo([destination.lat, destination.lng], 13, { 
        animate: true, 
        duration: 1.5 
      });
    }
  }, [tripId, destination.lat, destination.lng, sideQuests.length, map]);

  return null;
}

function MapEvents({ onMapClick, onMouseMove }: { 
  onMapClick: (e: L.LeafletMouseEvent) => void,
  onMouseMove: (e: L.LeafletMouseEvent) => void 
}) {
  useMapEvents({
    click: onMapClick,
    mousemove: onMouseMove,
  });
  return null;
}

const MAP_STYLES = [
  { id: 'positron',    name: 'Standard',  emoji: '🗺️' },
  { id: 'osm-carto',   name: 'Detailed',  emoji: '📍' },
  { id: 'satellite',   name: 'Satellite', emoji: '🛰️' },
];

const getTileUrl = (styleId: string) => {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || "6de209a5add94a398bfea16528c7981b";
  if (styleId === 'satellite') return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  if (styleId === 'osm-carto') return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  return `https://maps.geoapify.com/v1/tile/${styleId}/{z}/{x}/{y}.png?apiKey=${apiKey}`;
};

const getTileAttribution = (styleId: string) =>
  styleId === 'satellite'
    ? '&copy; Esri'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function MapUpdater({ center, destinationId, forceCenterCount }: { 
  center: [number, number], 
  destinationId: string, 
  forceCenterCount: number 
}) {
  const map = useMap();
  const lastId = useRef("");
  const lastCount = useRef(0);

  useEffect(() => {
    if (lastId.current !== destinationId || forceCenterCount > lastCount.current) {
      map.flyTo(center, 14, {
        animate: true,
        duration: 1.5
      });
      lastId.current = destinationId;
      lastCount.current = forceCenterCount;
    }
  }, [center, destinationId, forceCenterCount, map]);

  return null;
}

const createMemberIcon = (avatar: string | undefined, initials: string) => {
  return L.divIcon({
    className: '',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute inset-0 rounded-full bg-slate-900 opacity-20 marker-pulse-dot" style="width: 46px; height: 46px; margin: -5px"></div>
        <div class="relative w-9 h-9 rounded-full border-2 bg-white shadow-md flex items-center justify-center overflow-hidden border-slate-900 z-10">
          ${avatar ? `<img src="${avatar}" class="w-full h-full object-cover" />` : `<div class="bg-slate-100 text-slate-900 font-bold text-[10px] w-full h-full flex items-center justify-center">${initials}</div>`}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

export default function LiveTrackingMap({ 
  tripId,
  destination, 
  members, 
  currentUserId,
  onLocationUpdate,
  targetArrivalTime,
  sideQuests = [],
  triggerRecon,
  onDropRallyPoint,
  onClearRallyPoint,
  onQuestsUpdated,
  onDiscoveredPlaces,
  forceCenter,
  pinnedPlaces = [],
  onPinPlace,
  curatedAttractions = [],
  onAddQuest
}: LiveTrackingMapProps) {
  const { 
    memberLocations, 
    sendCursorUpdate,
    syncReport,
    rallyPoint
  } = useLocation(tripId, currentUserId);

  useEffect(() => {
    if (forceCenter && mapRef.current) {
      mapRef.current.flyTo(forceCenter, 16, { animate: true });
    }
  }, [forceCenter]);

  const handleMouseMove = useCallback((e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    const currentUser = members.find(m => String(m.userId || m.id) === String(currentUserId));
    sendCursorUpdate(lat, lng, currentUser?.userName || "User");
  }, [sendCursorUpdate, members, currentUserId]);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [travelTimeDirect, setTravelTimeDirect] = useState<{ duration: string; arrival: string } | null>(null);
  const [mapStyle, setMapStyle] = useState('osm-carto');
  const [showTraffic, setShowTraffic] = useState(false);
  const [forceCenterCount, setForceCenterCount] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);

  const fetchRoute = async (waypointsStr: string) => {
    try {
      // Use the internal proxy instead of direct Geoapify call to avoid timeout/CORS issues on remote devices
      const url = `/api/places/routing?waypoints=${encodeURIComponent(waypointsStr)}&mode=drive`;
      console.log(`[LiveTrackingMap] Fetching route from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[LiveTrackingMap] Routing API Error (${response.status}):`, errText.substring(0, 200));
        return null;
      }
      
      const data = await response.json();

      if (data.features && data.features[0]) {
        const routeFeature = data.features[0];
        let coords: [number, number][] = [];
        if (routeFeature.geometry.type === 'MultiLineString') {
           coords = routeFeature.geometry.coordinates.flat().map((coord: any) => [coord[1], coord[0]]);
        } else {
           coords = routeFeature.geometry.coordinates[0].map((coord: any) => [coord[1], coord[0]]);
        }

        if (coords.length > 500) {
          coords = simplifyPolyline(coords, 0.0001);
        }

        const durationSeconds = (routeFeature.properties.time || 0);
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.ceil((durationSeconds % 3600) / 60);
        const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        
        const arrivalDate = new Date(Date.now() + (durationSeconds * 1000));
        const arrivalString = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return { coords, timeString, arrivalString };
      }
    } catch (error) {
      console.error("[LiveTrackingMap] Exception fetching route:", error);
    }
    return null;
  };

  const lastFetchedLocation = useRef<[number, number] | null>(null);
  const fetchTimer = useRef<NodeJS.Timeout | null>(null);

  const getDirections = useCallback(async (force = false) => {
    // Determine origin: use userLocation, or first available member location, or null
    let origin: [number, number] | null = userLocation;
    
    if (!origin) {
      const firstMemberLoc = Object.values(memberLocations).find(loc => typeof loc.lat === 'number' && typeof loc.lng === 'number');
      if (firstMemberLoc) {
        origin = [firstMemberLoc.lat, firstMemberLoc.lng];
      }
    }

    if (!origin) return;

    // Calculate distance from last fetch
    if (!force && lastFetchedLocation.current) {
      const dist = L.latLng(origin).distanceTo(L.latLng(lastFetchedLocation.current));
      if (dist < 20) return; // Only fetch if moved more than 20 meters
    }

    // Build waypoints string including side quests
    const wpArray = [`${origin[0]},${origin[1]}`];
    
    // Add active side quests in the middle
    if (sideQuests && sideQuests.length > 0) {
      sideQuests.forEach(q => {
        if (q.lat && q.lng) {
          wpArray.push(`${q.lat},${q.lng}`);
        }
      });
    }
    
    wpArray.push(`${destination.lat},${destination.lng}`);
    const waypointsStr = wpArray.join('|');

    // If forced (initial load or new side quest), skip debounce for instant feedback
    if (force) {
      if (fetchTimer.current) clearTimeout(fetchTimer.current);
      try {
        const direct = await fetchRoute(waypointsStr);
        if (direct) {
          setTravelTimeDirect({ duration: direct.timeString, arrival: direct.arrivalString });
          setRoute(direct.coords);
          lastFetchedLocation.current = origin;
        }
      } catch (error) {
        console.error(error);
      }
      return;
    }

    // Regular debounced fetch for movement
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    
    const targetOrigin = origin; // capture for closure
    fetchTimer.current = setTimeout(async () => {
      try {
        const direct = await fetchRoute(waypointsStr);
        if (direct) {
          setTravelTimeDirect({ duration: direct.timeString, arrival: direct.arrivalString });
          setRoute(direct.coords);
          lastFetchedLocation.current = targetOrigin;
        }
      } catch (error) {
        console.error(error);
      }
    }, 2000); // 2s debounce for movement
  }, [userLocation, memberLocations, destination, sideQuests]);

  useEffect(() => {
    // 1. Initial fetch only (triggered on mount or when missions change)
    const initTimer = setTimeout(() => {
      getDirections(true);
    }, 100);

    // 2. Geolocation logic
    if ("geolocation" in navigator) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          if (onLocationUpdate) onLocationUpdate(loc[0], loc[1]);
        },
        (err) => console.error("Initial geolocation failed:", err),
        { enableHighAccuracy: true }
      );

      // Start continuous watching
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          if (onLocationUpdate) onLocationUpdate(loc[0], loc[1]);
        },
        (err) => console.error("Continuous geolocation failed:", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(initTimer);
      };
    }
    return () => {
      clearTimeout(initTimer);
    };
  }, [onLocationUpdate, getDirections, sideQuests.length]);
  
  // Tactical State
  const [isProbeActive, setIsProbeActive] = useState(false);
  const [probeLocation, setProbeLocation] = useState<[number, number] | null>(null);
  const [probeETA, setProbeETA] = useState<string | null>(null);
  const [isDraggingProbe, setIsDraggingProbe] = useState(false);
  const [elevationData, setElevationData] = useState<{ name: string; elevation: number }[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<{ title: string; desc: string; poi: any } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredPlaces, setDiscoveredPlaces] = useState<any[]>([]);
  const [poiOverlayActive, setPoiOverlayActive] = useState(true);
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'recon' | 'mission'>('recon');
  const [selectedQuestRoute, setSelectedQuestRoute] = useState<[number, number][] | null>(null);
  const [detourInfo, setDetourInfo] = useState<{ time: string; distance: string } | null>(null);
  const [isCalculatingDetour, setIsCalculatingDetour] = useState(false);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [reconCategory, setReconCategory] = useState<'all' | 'catering' | 'accommodation' | 'tourism'>('all');
  const [optimisticAddedQuests, setOptimisticAddedQuests] = useState<Set<string>>(new Set());

  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (triggerRecon && mapRef.current) {
      runReconScan(mapRef.current);
      getDirections(true); // Force a route refresh including side quests when Route Attractions is clicked
    }
  }, [triggerRecon, getDirections]);

  const toggleProbe = () => {
    const newActive = !isProbeActive;
    setIsProbeActive(newActive);
    if (newActive && !probeLocation) {
      if (userLocation) {
        setProbeLocation(userLocation);
      } else {
        setProbeLocation([destination.lat, destination.lng]);
      }
    }
  };

  // Handle Download
  const handleDownloadSector = useCallback((map: L.Map) => {
    const bounds = map.getBounds();
    const minLat = bounds.getSouth();
    const minLng = bounds.getWest();
    const maxLat = bounds.getNorth();
    const maxLng = bounds.getEast();
    
    const zoomLevels = [10, 11, 12, 13, 14, 15];
    const urlTemplate = getTileUrl(mapStyle);
    
    const tiles = getSectorTileUrls(minLat, minLng, maxLat, maxLng, zoomLevels, urlTemplate);
    
    if (tiles.length > 1000) {
      if (!confirm(`Download ${tiles.length} map tiles for offline use?`)) return;
    }

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'DOWNLOAD_SECTOR',
        tiles
      });
      setDownloadProgress({ current: 0, total: tiles.length });
    }
  }, [mapStyle]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'DOWNLOAD_PROGRESS') {
        setDownloadProgress({ current: event.data.current, total: event.data.total });
      } else if (event.data.type === 'DOWNLOAD_COMPLETE') {
        setDownloadProgress(null);
        toast.success("Map download complete.");
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, []);

  const handleLocateMe = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setUserLocation(loc);
      setForceCenterCount(prev => prev + 1);
    });
  };

  const center: [number, number] = useMemo(() => {
    if (forceCenterCount > 0 && userLocation) return userLocation;
    return [destination.lat, destination.lng];
  }, [forceCenterCount, userLocation, destination]);

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`, '_blank');
  };

  // Probe Logic
  const handleProbeDrag = async (e: any) => {
    const { lat, lng } = e.target.getLatLng();
    setProbeLocation([lat, lng]);
    
    // Update ETA to probe periodically or on drop instead of every drag move to save API calls
    // But we can keep it here if it's not too heavy. 
    // The main issue is the runReconScan being too heavy for onDrag.
  };

  // Recon Logic
  const runReconScan = async (map: L.Map, overrideCenter?: { lat: number, lng: number }) => {
    setIsScanning(true);
    const scanCenter = overrideCenter || map.getCenter();
    
    try {
      const customUrl = `/api/places/attractions?lat=${scanCenter.lat}&lng=${scanCenter.lng}`;
      const customRes = await fetch(customUrl);
      
      if (customRes.ok) {
        const customData = await customRes.json();
        const standardizedPlaces = customData.map((p: any) => ({
          ...p,
          id: p.id || `recon-${p.name}-${p.lat}-${p.lng}`,
          type: p.type || 'POI',
          photoUrl: p.photoUrl || `/api/places/photo?name=${encodeURIComponent(p.name)}`
        }));

        setDiscoveredPlaces(standardizedPlaces);
        if (onDiscoveredPlaces) onDiscoveredPlaces(standardizedPlaces);
        toast.success(`Discovered ${standardizedPlaces.length} locations near probe.`);
      }
    } catch (e) {
      toast.error("Tactical scan failed.");
    } finally {
      setIsScanning(false);
    }
  };

  const showQuestRoute = async (questLat: number, questLng: number, questId: string) => {
    if (!userLocation) {
        toast.info("Waiting for live location...");
        return;
    }
    setIsCalculatingDetour(true);
    setSelectedQuestId(questId);
    try {
      const waypoints = `${userLocation[0]},${userLocation[1]}|${questLat},${questLng}|${destination.lat},${destination.lng}`;
      const res = await fetchRoute(waypoints);
      if (res) {
        setSelectedQuestRoute(res.coords);
        setDetourInfo({ time: res.timeString, distance: "Exploration Vector" });
      }
    } finally {
      setIsCalculatingDetour(false);
    }
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (isProbeActive) {
      const { lat, lng } = e.latlng;
      setProbeLocation([lat, lng]);
      
      // Update ETA to probe
      if (userLocation) {
        const wp = `${userLocation[0]},${userLocation[1]}|${lat},${lng}`;
        fetchRoute(wp).then(res => {
          if (res) setProbeETA(res.timeString);
        });
      }

      // Auto-scan at clicked location
      if (mapRef.current) {
        const map = mapRef.current;
        // Temporarily fly map to the click for the scan center if needed, or just scan
        runReconScan(map, { lat, lng });
      }
      return;
    }

    if (onDropRallyPoint) {
      onDropRallyPoint(e.latlng.lat, e.latlng.lng);
    }
  };

  return (
    <div className="relative h-[500px] md:h-full min-h-[400px] w-full rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <MapContainer
        center={[destination.lat, destination.lng]}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <MapRefSetter mapRef={mapRef} />
        <MapEvents onMapClick={handleMapClick} onMouseMove={handleMouseMove} />
        <CoordinateHUD />
        
        <TripBoundsManager 
          userLocation={userLocation} 
          destination={destination} 
          sideQuests={sideQuests} 
          tripId={tripId} 
        />
        
        <TileLayer
          key={mapStyle}
          attribution={getTileAttribution(mapStyle)}
          url={getTileUrl(mapStyle)}
          eventHandlers={{
            tileerror: () => {
              toast.error("Map tile service is currently overwhelmed (503). Try switching Map Styles.");
            }
          }}
        />

         {showTraffic && (
           <TileLayer
             key="traffic"
             attribution='&copy; <a href="https://www.geoapify.com/">Geoapify</a>'
             url={`https://maps.geoapify.com/v1/tile/traffic_flow/{z}/{x}/{y}.png?apiKey=${import.meta.env.GEOAPIFY_ROUTING_KEY || import.meta.env.VITE_GEOAPIFY_API_KEY || "6de209a5add94a398bfea16528c7981b"}`}
             zIndex={100}
             eventHandlers={{
               tileerror: () => {
                 setShowTraffic(false);
                 toast.error("Traffic data is currently unavailable (API Limit).");
               }
             }}
           />
         )}
        {/* Destination Marker */}
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup>
            <div className="p-2 text-center">
              <p className="font-bold text-slate-900 text-sm">{destination.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Destination</p>
            </div>
          </Popup>
        </Marker>

        {/* Tactical Probe */}
        {isProbeActive && probeLocation && (
          <TacticalProbe 
            position={probeLocation} 
            onDrag={handleProbeDrag}
            onDragStart={() => setIsDraggingProbe(true)}
            onDragEnd={async (e) => {
              setIsDraggingProbe(false);
              const { lat, lng } = e.target.getLatLng();
              if (mapRef.current) {
                runReconScan(mapRef.current, { lat, lng });
              }
              // Update ETA to probe on drop
              if (userLocation) {
                const wp = `${userLocation[0]},${userLocation[1]}|${lat},${lng}`;
                const routeData = await fetchRoute(wp);
                if (routeData) setProbeETA(routeData.timeString);
              }
            }}
            eta={probeETA}            isDragging={isDraggingProbe}
          />
        )}

        {/* Discovered Places */}
        {discoveredPlaces.map((p) => {
          return (
            <Marker 
              key={p.id} 
              position={[p.lat, p.lng]} 
              icon={getCategoryPin(p.type)}
              eventHandlers={{ click: () => showQuestRoute(p.lat, p.lng, p.id) }}
            >
              <Popup>
                <div className="p-2 w-48">
                  <p className="font-black text-slate-900 text-[10px] uppercase truncate">{p.name}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{p.type}</p>
                  
                  {detourInfo && selectedQuestId === p.id && (
                    <div className="bg-slate-100 rounded p-1.5 mt-2 flex items-center justify-between border border-slate-200">
                        <span className="text-[8px] font-black uppercase text-slate-500">Detour Time</span>
                        <span className="text-[9px] font-black uppercase text-orange-600">+{detourInfo.time}</span>
                    </div>
                  )}

                  <div className="flex gap-1 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-[8px] font-black uppercase" onClick={() => showQuestRoute(p.lat, p.lng, p.id)}>Detour ?</Button>
                    <Button 
                      size="sm" 
                      disabled={optimisticAddedQuests.has(String(p.id)) || (sideQuests && sideQuests.some(sq => String(sq.id) === String(p.id)))}
                      className="flex-1 h-7 text-[8px] font-black uppercase bg-slate-900 text-white disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500" 
                      onClick={() => {
                        setOptimisticAddedQuests(prev => new Set(prev).add(String(p.id)));
                        onAddQuest?.(p);
                      }}
                    >
                      {optimisticAddedQuests.has(String(p.id)) || (sideQuests && sideQuests.some(sq => String(sq.id) === String(p.id))) ? "Added" : "Save Quest"}
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" className="w-full h-6 mt-1 text-[7px] font-black uppercase text-slate-400 hover:text-slate-900" onClick={() => onDropRallyPoint?.(p.lat, p.lng)}>Set Rally Point</Button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Pinned Places */}
        {pinnedPlaces.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={getColoredPin(p.color)} eventHandlers={{ click: () => showQuestRoute(p.lat, p.lng, p.id) }}>
            <Popup>
              <div className="p-2 w-48">
                <p className="font-black text-slate-900 text-[10px] uppercase truncate">{p.name}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-bold">Pinned Objective</p>
                
                {detourInfo && selectedQuestId === p.id && (
                  <div className="bg-slate-100 rounded p-1.5 mt-2 flex items-center justify-between border border-slate-200">
                      <span className="text-[8px] font-black uppercase text-slate-500">Detour Time</span>
                      <span className="text-[9px] font-black uppercase text-orange-600">+{detourInfo.time}</span>
                  </div>
                )}

                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-[8px] font-black uppercase" onClick={() => showQuestRoute(p.lat, p.lng, p.id)}>Detour ?</Button>
                  <Button 
                    size="sm" 
                    disabled={optimisticAddedQuests.has(String(p.id)) || (sideQuests && sideQuests.some(sq => String(sq.id) === String(p.id)))}
                    className="flex-1 h-7 text-[8px] font-black uppercase bg-slate-900 text-white disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500" 
                    onClick={() => {
                      setOptimisticAddedQuests(prev => new Set(prev).add(String(p.id)));
                      onAddQuest?.(p);
                    }}
                  >
                    {optimisticAddedQuests.has(String(p.id)) || (sideQuests && sideQuests.some(sq => String(sq.id) === String(p.id))) ? "Added" : "Save Quest"}
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* User Location */}
        {userLocation && (
          <Marker position={userLocation} icon={originIcon}>
            <Popup>
              <p className="text-[10px] font-bold uppercase text-slate-900">Your Location</p>
            </Popup>
          </Marker>
        )}

        {/* Accepted Side Quests */}
        {sideQuests?.map((sq) => (
          <Marker key={`sq-${sq.id}`} position={[sq.lat, sq.lng]} icon={getColoredPin("orange")} eventHandlers={{ click: () => showQuestRoute(sq.lat, sq.lng, sq.id) }}>
            <Popup>
              <div className="p-2 w-48">
                <p className="font-black text-slate-900 text-[10px] uppercase truncate">{sq.name || (sq as any).title}</p>
                <p className="text-[8px] font-bold text-orange-600 uppercase tracking-widest">{sq.type === "SCHEDULED" ? "Itinerary" : "Active Mission"}</p>
                
                {detourInfo && selectedQuestId === sq.id && (
                  <div className="bg-slate-100 rounded p-1.5 mt-2 flex items-center justify-between border border-slate-200">
                      <span className="text-[8px] font-black uppercase text-slate-500">Detour Time</span>
                      <span className="text-[9px] font-black uppercase text-orange-600">+{detourInfo.time}</span>
                  </div>
                )}

                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-[8px] font-black uppercase" onClick={() => showQuestRoute(sq.lat, sq.lng, sq.id)}>Detour Path</Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="flex-1 h-7 text-[8px] font-black uppercase text-rose-600 hover:bg-rose-50" 
                    onClick={() => {
                       toast.info("Remove from Mission Tab");
                    }}
                  >
                    Active
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Curated Global Landmarks Layer */}
        {curatedAttractions.map((attr) => (
          <Marker 
            key={attr.id} 
            position={[attr.lat, attr.lng]} 
            icon={curatedPinIcon}
            eventHandlers={{ click: () => showQuestRoute(attr.lat, attr.lng, attr.id) }}
          >
            <Popup className="custom-popup">
              <div className="w-48 overflow-hidden rounded-xl bg-white p-0">
                <div className="h-24 w-full relative">
                  <img 
                    src={attr.photoUrl} 
                    alt={attr.name} 
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-white/90 px-1.5 py-0.5 rounded text-[8px] font-black">
                    ⭐ {attr.rating?.toFixed(1)}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-black text-[10px] uppercase truncate leading-none text-slate-900">{attr.name}</h4>
                  <p className="text-[8px] font-medium text-slate-500 mt-1 uppercase tracking-tight">{attr.address}</p>
                  {detourInfo && selectedQuestId === attr.id && (
                    <div className="bg-slate-100 rounded-lg p-2 mt-2 flex items-center justify-between border border-slate-200 shadow-inner">
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Added Travel</span>
                        <span className="text-[9px] font-black uppercase text-orange-600">+{detourInfo.time}</span>
                    </div>
                  )}

                  <div className="flex gap-1.5 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 h-7 font-black uppercase text-[8px] tracking-widest rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                      onClick={() => showQuestRoute(attr.lat, attr.lng, attr.id)}
                    >
                      Detour
                    </Button>
                    <Button 
                      size="sm" 
                      disabled={optimisticAddedQuests.has(String(attr.id)) || (sideQuests && sideQuests.some(sq => String(sq.id) === String(attr.id)))}
                      className="flex-1 h-7 bg-slate-900 text-white font-black uppercase text-[8px] tracking-widest rounded-lg shadow-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100"
                      onClick={() => {
                        setOptimisticAddedQuests(prev => new Set(prev).add(String(attr.id)));
                        onAddQuest?.(attr);
                      }}
                    >
                      {optimisticAddedQuests.has(String(attr.id)) || (sideQuests && sideQuests.some(sq => String(sq.id) === String(attr.id))) ? "Added" : "+ Mission"}
                    </Button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route */}
        {route && (
          <>
            {/* Glow Layer */}
            <Polyline 
              positions={route} 
              color="#3b82f6" 
              weight={12} 
              opacity={0.2} 
            />
            {/* Main Path */}
            <Polyline 
              positions={route} 
              color="#3b82f6" 
              weight={5} 
              opacity={0.8} 
            />
        {/* Detour Route */}
        {selectedQuestRoute && (
          <Polyline 
            positions={selectedQuestRoute} 
            color="#eab308" 
            weight={4} 
            dashArray="10, 10" 
            opacity={0.8}
          />
        )}
      </>
    )}

        {/* Member Markers */}
        {(Object.entries(memberLocations) as [string, MemberLocation][]).map(([mId, loc]) => {
          if (typeof loc.lat !== 'number') return null;
          const member = members.find(m => String(m.userId || m.id) === mId);
          const icon = createMemberIcon(
            member?.avatar, 
            getInitials(member?.userName || "U")
          );
          return (
            <Marker key={mId} position={[loc.lat, loc.lng]} icon={icon}>
              <Popup>
                <div className="p-1">
                  <p className="font-bold text-slate-900 text-xs">{member?.userName || "Traveler"}</p>
                  <p className="text-[8px] text-slate-500 uppercase">{loc.status}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapUpdater 
          center={center} 
          destinationId={String(destination.lat + destination.lng)} 
          forceCenterCount={forceCenterCount}
        />

        <SectorDownloadManager onDownload={handleDownloadSector} />
        {downloadProgress && <DownloadProgressHUD progress={downloadProgress} />}
      </MapContainer>

      {/* Main Overlays */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-[1000]">
        <div className="flex flex-col gap-4 items-start max-w-sm">
          <div className="bg-white/95 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 pointer-events-auto shadow-sm w-full">
            <h3 className="font-black text-slate-900 text-base uppercase tracking-tight">{destination.name}</h3>
            
            {travelTimeDirect && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-2xl font-black text-slate-900">{travelTimeDirect.duration}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Arrival {travelTimeDirect.arrival}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setForceCenterCount(prev => prev + 1);
              }}
              className="hidden md:flex h-10 w-10 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
              variant="outline"
              size="icon"
              title="Jump to Destination"
            >
              <MapPin className="h-4 w-4" />
            </Button>

            <Button 
              onClick={handleLocateMe}
              className="h-10 w-10 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
              variant="outline"
              size="icon"
              title="Jump to My Location"
            >
              <LocateFixed className="h-4 w-4" />
            </Button>

            <Button 
              onClick={() => setShowTraffic(!showTraffic)}
              className={cn(
                "hidden md:flex h-10 w-10 border shadow-sm transition-all",
                showTraffic ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
              variant={showTraffic ? "default" : "outline"}
              size="icon"
              title={showTraffic ? "Hide Traffic" : "Show Traffic"}
            >
              <Car className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 w-10 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm" variant="outline" size="icon">
                  <Layers className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white border border-slate-200">
                {MAP_STYLES.map((style) => (
                  <DropdownMenuItem key={style.id} onClick={() => setMapStyle(style.id)} className="text-[10px] font-bold uppercase tracking-widest cursor-pointer">
                    {style.emoji} {style.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={openInGoogleMaps} className="h-10 px-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm text-[10px] font-bold uppercase" variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Navigate
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={toggleProbe}
              className={cn(
                "h-10 w-10 rounded-xl transition-all shadow-sm",
                isProbeActive ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
              variant={isProbeActive ? "default" : "outline"}
              size="icon"
            >
              <Radio className="h-4 w-4" />
            </Button>

            <Button 
              onClick={(e) => {
                const map = (e.currentTarget.closest('.relative')?.querySelector('.leaflet-container') as any)?._leaflet_map;
                if (map) runReconScan(map);
              }}
              className="h-10 w-10 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm rounded-xl"
              variant="outline"
              size="icon"
            >
              <Radar className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

