import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { useTrips, useTrip } from "@/hooks/useTrips";
import { useLocation } from "@/hooks/useLocation";
import type { Trip } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  MapPin, Search, Star, Loader2, Globe, ChevronRight, ChevronLeft, Plus, Users, Navigation, Map as MapIcon, Layers, LocateFixed, Target, X, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LiveTrackingMap from "@/components/LiveTrackingMap";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getDistance } from "@/lib/mapUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CURRENT_USER = {
  id: "1",
  name: "Voyzr Admin"
};

const customPinIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const selfIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
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

function UserLocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  return position === null ? null : (
    <Marker position={position} icon={selfIcon}>
      <Popup>
        <div className="p-1 text-center font-black uppercase text-[10px]">
          You are here
        </div>
      </Popup>
    </Marker>
  );
}

function MapUpdater({ center, zoom = 14 }: { center: [number, number], zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const MAP_STYLES = [
  { id: 'positron',    name: 'Light',     emoji: '☀️' },
  { id: 'dark-matter', name: 'Dark',      emoji: '🌑' },
  { id: 'satellite',   name: 'Satellite', emoji: '🛰️' },
];

const getMapTileUrl = (styleId: string) =>
  styleId === 'satellite'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : `https://maps.geoapify.com/v1/tile/${styleId}/{z}/{x}/{y}.png?apiKey=6de209a5add94a398bfea16528c7981b`;

const getMapAttribution = (styleId: string) =>
  styleId === 'satellite'
    ? '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.geoapify.com/">Geoapify</a>';

function ClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Attraction {
  name: string;
  address: string;
  photoReference?: string;
  rating: number;
  type?: string;
}

interface TripTrackingWrapperProps {
  trip: Trip;
  reconTrigger: number;
  onDiscoveredPlaces: (places: any[]) => void;
  forceCenter: [number, number] | null;
  onPinPlace?: (place: any, color: string) => void;
  pinnedPlaces?: any[];
  onAddQuest?: (quest: any) => void;
}

export function TripTrackingWrapper({ 
  trip, 
  reconTrigger, 
  onDiscoveredPlaces,
  forceCenter,
  onPinPlace,
  pinnedPlaces,
  onAddQuest
}: TripTrackingWrapperProps) {
  const { user: authUser } = useAuth();
  const { memberLocations, sendUpdate, rallyPoint, dropRallyPoint, clearRallyPoint } = useLocation(String(trip.id), authUser?.id);
  
  // Fallback to India Center if trip coordinates are missing
  const destLat = trip.destinationLat || 20.5937;
  const destLng = trip.destinationLng || 78.9629;

  // Load accepted quests and activities from localStorage
  const [sideQuests, setSideQuests] = useState<any[]>([]);
  const [refreshToggle, setRefreshToggle] = useState(0);

  useEffect(() => {
    const id = trip.id;
    const questSaved = localStorage.getItem(`voyzr_accepted_quests_${id}`);
    const itinerarySaved = localStorage.getItem(`voyzr_itinerary_${id}`);
    
    let allQuests: any[] = [];
    
    if (questSaved) {
      try {
        allQuests = [...JSON.parse(questSaved)];
      } catch (e) {
        console.error("Failed to parse side quests", e);
      }
    }

    if (itinerarySaved) {
      try {
        const activities = JSON.parse(itinerarySaved);
        const scheduledQuests = activities
          .filter((a: any) => a.type === 'SIDE_QUEST' && a.lat !== undefined && a.lng !== undefined)
          .map((a: any) => ({
            id: a.id,
            name: a.title,
            lat: a.lat,
            lng: a.lng,
            type: 'SCHEDULED'
          }));
        
        // Dedup
        scheduledQuests.forEach(sq => {
          if (!allQuests.find(aq => aq.id === sq.id)) {
            allQuests.push(sq);
          }
        });
      } catch (e) {
        console.error("Failed to parse itinerary", e);
      }
    }
    
    // Also include backend-synced sideQuests
    if (trip.sideQuests) {
       trip.sideQuests.forEach((q: any) => {
         if (!allQuests.find(aq => aq.id === q.id)) {
           allQuests.push(q);
         }
       });
    }

    setSideQuests(allQuests);
  }, [trip.id, trip.sideQuests, refreshToggle]);

  return (
    <div className="flex-1 flex flex-col h-full relative" key={trip.id}>
      <LiveTrackingMap 
        tripId={trip.id}
        destination={{ 
          lat: destLat, 
          lng: destLng, 
          name: trip.destination 
        }} 
        members={trip.members || []}
        currentUserId={String(authUser?.id || "unknown")}
        memberLocations={memberLocations}
        onLocationUpdate={(lat, lng) => sendUpdate(lat, lng)}
        targetArrivalTime={trip.targetArrivalTime}
        sideQuests={sideQuests}
        triggerRecon={reconTrigger > 0}
        rallyPoint={rallyPoint}
        onDropRallyPoint={(lat, lng) => dropRallyPoint(lat, lng, authUser?.username || "Traveler")}
        onClearRallyPoint={clearRallyPoint}
        onDiscoveredPlaces={onDiscoveredPlaces}
        forceCenter={forceCenter}
        onPinPlace={onPinPlace}
        pinnedPlaces={pinnedPlaces}
        onAddQuest={onAddQuest}
      />
    </div>
  );
}

export default function MapPage() {
  const navigate = useNavigate();
  const { trips, isLoading: isLoadingTrips } = useTrips();
  const [selectedTripSummary, setSelectedTripSummary] = useState<Trip | null>(null);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const { data: fullTrip, updateTrip } = useTrip(selectedTripSummary ? String(selectedTripSummary.id) : "");
  
  // Only derive selectedTrip if we actually have a summary selected
  const selectedTrip = selectedTripSummary ? (fullTrip || selectedTripSummary) : null;

  const [searchQuery, setSearchQuery] = useState("");
  const [curatedAttractions, setCuratedAttractions] = useState<any[]>([]);

  useEffect(() => {
    // Fetch all curated database attractions on mount
    const fetchAllCurated = async () => {
      try {
        const res = await fetch("/api/places/all");
        if (res.ok) {
          const data = await res.json();
          setCuratedAttractions(data);
        }
      } catch (err) {
        console.error("Failed to load global curated landmarks", err);
      }
    };
    fetchAllCurated();
  }, []);

  const [mapStyle, setMapStyle] = useState('positron');
  const [forceZoom, setForceZoom] = useState(5);
  const [reconTrigger, setReconTrigger] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedAttractionLoc, setSelectedAttractionLoc] = useState<[number, number] | null>(null);
  const [pinnedPlaces, setPinnedPlaces] = useState<any[]>([]);

  useEffect(() => {
    if (reconTrigger > 0 && selectedTrip) {
      const lat = selectedTrip.destinationLat || 20.5937;
      const lng = selectedTrip.destinationLng || 78.9629;
      fetchAttractions(lat, lng, selectedTrip.destination);
    }
  }, [reconTrigger, selectedTrip?.id]);

  // Clear stale data when switching trips
  useEffect(() => {
    setAttractions([]);
    setFreeRoamMarker(null);
    setFreeRoamAddress("");
    setMapSearchQuery("");
    setReconTrigger(0);
    setSelectedAttractionLoc(null);
    setPinnedPlaces([]);

    // If trip selected, fetch its attractions immediately
    if (selectedTrip) {
      const lat = selectedTrip.destinationLat || 20.5937;
      const lng = selectedTrip.destinationLng || 78.9629;
      fetchAttractions(lat, lng, selectedTrip.destination);
    }
  }, [selectedTrip?.id]);

  // Recommendations state
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [isLoadingAttractions, setIsLoadingAttractions] = useState(false);
  const [recommendationTitle, setRecommendationTitle] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");

  const handleAddToQuest = async (attraction: any) => {
    if (selectedTrip) {
      const currentQuests = selectedTrip.sideQuests || [];
      if (!currentQuests.find((q: any) => q.id === attraction.id)) {
        const newQuest = {
          id: attraction.id,
          name: attraction.name,
          address: attraction.address || '',
          description: attraction.description || '',
          category: attraction.category || attraction.type || '',
          imageUrl: attraction.photoUrl || '',
          lat: attraction.lat,
          lng: attraction.lng,
          type: attraction.type || 'POI',
          status: 'ACTIVE'
        };
        const updated = [...currentQuests, newQuest];
        updateTrip({ sideQuests: updated });
        toast.success(`Pinned ${attraction.name} to itinerary!`);
      } else {
        toast.info("Already in itinerary");
      }
    } else {
      toast.success(`Pinned ${attraction.name}. Start a trip to save permanently!`);
    }
  };

  const handleFocusAttraction = (attraction: any) => {
    if (attraction.lat && attraction.lng) {
      setFreeRoamCenter([attraction.lat, attraction.lng]);
      setSelectedAttractionLoc([attraction.lat, attraction.lng]);
      setForceZoom(16);
      toast.info(`Centering on ${attraction.name}`);
    }
  };

  const handlePinPlace = (place: any, color: string) => {
    setPinnedPlaces(prev => {
      // Toggle off if already pinned with same color, or just update color
      const exists = prev.find(p => p.id === place.id);
      if (exists && exists.color === color) {
        toast.info(`Removed pin for ${place.name}`);
        return prev.filter(p => p.id !== place.id);
      }
      toast.success(`Pinned ${place.name} with a new color vector!`);
      const newPin = { 
        id: place.id, 
        name: place.name, 
        lat: place.lat, 
        lng: place.lng, 
        color 
      };
      if (exists) {
        return prev.map(p => p.id === place.id ? newPin : p);
      }
      return [...prev, newPin];
    });
  };

  // Free Roam State

  const [freeRoamCenter, setFreeRoamCenter] = useState<[number, number]>([20.5937, 78.9629]); // India
  const [freeRoamMarker, setFreeRoamMarker] = useState<[number, number] | null>(null);
  const [freeRoamAddress, setFreeRoamAddress] = useState("");
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  const fetchAttractions = async (lat: number, lng: number, address: string) => {
    setIsLoadingAttractions(true);
    setRecommendationTitle(address);
    
    try {
      // 1. Fetch CUSTOM attractions from our own backend
      const url = `/api/places/attractions?lat=${lat}&lng=${lng}`;
      console.log(`[Map] Fetching attractions from: ${url}`);
      const customRes = await fetch(url);
      
      if (!customRes.ok) {
        const text = await customRes.text();
        console.error(`[Map] Attractions API Error (${customRes.status}):`, text.substring(0, 200));
        setAttractions([]);
      } else {
        const data = await customRes.json();
        if (data.length === 0) {
          toast.info("No curated attractions found for this sector.");
        }
        const customPlaces = data.map((p: any) => ({ 
          ...p, 
          id: p.id || `attr-${p.name}-${p.lat}-${p.lng}`,
          type: 'CUSTOM',
          rating: p.rating || 5.0 
        }));

        setAttractions(customPlaces);
      }
    } catch (error) {
      console.error("Failed to fetch attractions:", error);
      toast.error("Failed to fetch sector intelligence.");
    } finally {
      setIsLoadingAttractions(false);
    }
  };

  const closeSidebar = () => {
    setAttractions([]);
    setIsLoadingAttractions(false);
  };

  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSearchQuery.trim()) return;
    setIsSearchingMap(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&accept-language=en&q=${encodeURIComponent(mapSearchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setFreeRoamCenter([lat, lon]);
        setFreeRoamMarker([lat, lon]);
        setForceZoom(14);
        setFreeRoamAddress(data[0].display_name);
        // Removed automatic fetchAttractions
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setFreeRoamMarker([lat, lng]);
    setFreeRoamCenter([lat, lng]);
    setForceZoom(14);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&accept-language=en&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      const address = data.display_name || "Selected Location";
      setFreeRoamAddress(address);
      // Removed automatic fetchAttractions
    } catch (err) {
      console.error(err);
    }
  };

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setFreeRoamCenter([latitude, longitude]);
        setFreeRoamMarker([latitude, longitude]);
        setForceZoom(14);
        handleMapClick(latitude, longitude);
      });
    }
  };

  const filteredTrips = trips.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-slate-900">
      <Sidebar />

      <main className="md:ml-64 flex flex-1 overflow-hidden pb-[72px] md:pb-0">
        {/* ── Trips Sidebar ────────────────────────────────────── */}
        <div className={cn(
          "w-full md:w-80 border-r border-slate-200 bg-white flex-col shrink-0 z-10 shadow-sm",
          isMobileListVisible ? "flex" : "hidden md:flex"
        )}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" /> Global Map
              </h2>
              <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-widest bg-blue-50 text-blue-600 border-blue-100">{trips.length} Active</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Filter trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-slate-50 border-slate-200 rounded-2xl h-12 text-sm font-medium focus-visible:ring-blue-600/20"
              />
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4 h-12 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-all"
              onClick={() => { setSelectedTripSummary(null); setIsMobileListVisible(false); }}
            >
              <MapIcon className="h-4 w-4 mr-2" /> Free Roam Explorer
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-3 pb-6 space-y-2">
              {filteredTrips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => { setSelectedTripSummary(trip); setIsMobileListVisible(false); }}
                  className={`w-full text-left p-4 rounded-2xl transition-all group border-2 ${selectedTripSummary?.id === trip.id
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : "bg-white border-transparent hover:border-slate-100 hover:bg-slate-50 text-slate-700"
                    }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-bold truncate pr-2 tracking-tight text-sm uppercase">{trip.name}</span>
                    <div className={`flex items-center justify-center h-5 px-2 rounded-full text-[9px] font-black uppercase ${selectedTripSummary?.id === trip.id ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                      <Users className="h-3 w-3 mr-1" /> {trip.memberCount || (trip.members || []).length}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className={`h-3 w-3 ${selectedTripSummary?.id === trip.id ? "text-blue-200" : "text-slate-400"}`} />
                    <p className={`text-[11px] font-semibold truncate ${selectedTripSummary?.id === trip.id ? "text-blue-50" : "text-slate-500"}`}>
                      {trip.destination}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* ── Map Area ────────────────────────────────────────────────────── */}
        <div className={cn(
          "flex-1 flex-col relative z-10",
          !isMobileListVisible ? "flex" : "hidden md:flex"
        )}>
          {!isMobileListVisible && (
            <Button
              variant="secondary"
              size="icon"
              className="md:hidden absolute top-6 left-4 z-[2000] h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-xl hover:bg-slate-50"
              onClick={() => setIsMobileListVisible(true)}
            >
              <ChevronLeft className="h-6 w-6 text-slate-700" />
            </Button>
          )}

          <div className="flex-1 relative flex">
            
            {/* Map Container */}
            <div className="flex-1 relative bg-slate-50">
              {selectedTrip ? (
                <>
                  <TripTrackingWrapper 
                    key={selectedTrip.id} 
                    trip={selectedTrip} 
                    reconTrigger={reconTrigger}
                    onDiscoveredPlaces={(places) => setAttractions(places)}
                    forceCenter={selectedAttractionLoc}
                    onAddQuest={async (place) => {
                       const currentQuests = selectedTrip.sideQuests || [];
                       if (!currentQuests.find((q: any) => q.id === place.id)) {
                          const newQuest = {
                            id: place.id,
                            name: place.name,
                            address: place.address || '',
                            description: place.description || '',
                            category: place.category || place.type || '',
                            imageUrl: place.photoUrl || '',
                            lat: place.lat,
                            lng: place.lng,
                            type: place.type || 'POI',
                            status: 'ACTIVE'
                          };
                          const updated = [...currentQuests, newQuest];
                          updateTrip({ sideQuests: updated });
                          toast.success("Added to Itinerary");
                       } else {
                          toast.info("Already in itinerary");
                       }
                    }}
                  />
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
                    <Button 
                      onClick={() => setReconTrigger(prev => prev + 1)}
                      className="rounded-full h-14 px-8 bg-slate-900 text-white shadow-2xl hover:bg-black font-black uppercase tracking-widest text-xs flex items-center gap-3 border-4 border-white/20"
                    >
                      <Star className="h-5 w-5 text-amber-400" />
                      Route Attractions
                    </Button>
                  </div>
                </>
              ) : (
                <div className="h-full w-full relative">
                  {/* Free Roam Search Overlay */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md">
                    <form onSubmit={handleMapSearch} className="relative flex shadow-2xl rounded-2xl overflow-hidden border-2 border-white/20">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none bg-white/90 backdrop-blur-md rounded-l-2xl">
                        <Search className="h-5 w-5 text-blue-600" />
                      </div>
                      <input 
                        type="text"
                        value={mapSearchQuery}
                        onChange={e => setMapSearchQuery(e.target.value)}
                        placeholder="Search for any destination globally..."
                        className="w-full pl-12 pr-24 py-4 bg-white/90 backdrop-blur-md outline-none text-slate-900 font-bold placeholder:text-slate-500 placeholder:font-medium"
                      />
                      <button 
                        type="submit"
                        disabled={isSearchingMap}
                        className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isSearchingMap ? "..." : "Find"}
                      </button>
                    </form>
                  </div>

                  <MapContainer
                    center={freeRoamCenter}
                    zoom={5}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                  >
                    <TileLayer
                      key={mapStyle}
                      attribution={getMapAttribution(mapStyle)}
                      url={getMapTileUrl(mapStyle)}
                    />
                    <MapUpdater center={freeRoamCenter} zoom={forceZoom} />
                    <ClickHandler onLocationSelect={handleMapClick} />
                    <UserLocationMarker />
                    
                    {/* Curated Global Landmarks Layer (Filtered by proximity to active pin) */}
                    {freeRoamMarker && curatedAttractions
                      .filter(attr => getDistance(freeRoamMarker[0], freeRoamMarker[1], attr.lat, attr.lng) < 50)
                      .map((attr) => (
                        <Marker 
                          key={attr.id} 
                          position={[attr.lat, attr.lng]} 
                          icon={curatedPinIcon}
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
                              <Button 
                                size="sm" 
                                className="w-full mt-2 h-7 bg-slate-900 text-white font-black uppercase text-[8px] tracking-widest rounded-lg"
                                onClick={() => handleFocusAttraction(attr)}
                              >
                                Deep Intel
                              </Button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    
                    {freeRoamMarker && (
                      <Marker position={freeRoamMarker} icon={customPinIcon}>
                        <Popup>
                          <div className="p-2 text-center min-w-[200px]">
                            <p className="font-bold text-slate-900 text-sm mb-2">{freeRoamAddress}</p>
                            <Button 
                              size="sm" 
                              onClick={() => navigate('/create-trip', { state: { destination: freeRoamAddress, lat: freeRoamMarker[0], lng: freeRoamMarker[1] }})}
                              className="w-full bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg h-8"
                            >
                              Create Trip Here
                            </Button>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                  
                  {/* Free Roam Controls Overlay */}
                  <div className="absolute top-24 right-6 z-[1000] flex flex-col gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-xl hover:bg-slate-50 transition-all">
                          <Layers className="h-5 w-5 text-blue-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2">
                        {MAP_STYLES.map((style) => (
                          <DropdownMenuItem
                            key={style.id}
                            onClick={() => setMapStyle(style.id)}
                            className={`text-[10px] font-black uppercase tracking-widest cursor-pointer rounded-xl mb-1 last:mb-0 flex items-center gap-2 ${mapStyle === style.id ? "text-blue-600 bg-blue-50" : "text-slate-600"}`}
                          >
                            <span>{style.emoji}</span> {style.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button 
                      onClick={handleLocateMe}
                      variant="secondary" 
                      size="icon" 
                      className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-xl hover:bg-slate-50 transition-all group"
                    >
                      <LocateFixed className="h-5 w-5 text-blue-600 group-active:text-blue-400" />
                    </Button>
                  </div>
                  
                  {/* Create Trip CTA */}
                  {freeRoamMarker && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
                      <Button 
                        onClick={() => fetchAttractions(freeRoamMarker[0], freeRoamMarker[1], freeRoamAddress)}
                        className="rounded-full h-14 px-8 bg-white text-slate-900 shadow-2xl hover:bg-slate-50 font-black uppercase tracking-widest text-[10px] flex items-center gap-2 border border-slate-200"
                      >
                        <Star className="h-4 w-4 text-amber-500" />
                        Recommendations
                      </Button>
                      <Button 
                        onClick={() => navigate('/create-trip', { state: { destination: freeRoamAddress, lat: freeRoamMarker[0], lng: freeRoamMarker[1] }})}
                        className="rounded-full h-14 px-8 bg-blue-600 text-white shadow-2xl hover:bg-blue-700 font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Start New Trip
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recommendations Sidebar Overlay */}
            <AnimatePresence>
              {(attractions.length > 0 || isLoadingAttractions) && (
                <motion.div 
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  className="absolute top-6 right-6 bottom-6 w-80 bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-[2.5rem] z-[1000] flex flex-col overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-widest leading-none">Intelligence</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1 truncate max-w-[120px]">{recommendationTitle}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={closeSidebar}
                      className="h-8 w-8 rounded-xl hover:bg-slate-100 text-slate-400"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    {isLoadingAttractions ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scouring sector data...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {attractions.map((attr: any) => (
                          <motion.div 
                            key={attr.id}
                            className="group bg-white border border-slate-100 p-3 rounded-2xl transition-all hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-100 cursor-pointer"
                            onClick={() => handleFocusAttraction(attr)}
                          >
                            <div className="flex gap-3">
                              <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 border border-slate-100 bg-slate-50">
                                <img 
                                  src={attr.photoUrl || `/api/places/photo?name=${encodeURIComponent(attr.name)}`} 
                                  alt={attr.name} 
                                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              </div>
                              <div className="min-w-0 flex-1 flex flex-col justify-center">
                                <h5 className="font-black text-slate-900 text-[11px] truncate uppercase leading-tight group-hover:text-blue-600 transition-colors">{attr.name}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center gap-0.5">
                                    <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                                    <span className="text-[9px] font-black text-slate-900">{attr.rating?.toFixed(1)}</span>
                                  </div>
                                  <span className="h-1 w-1 rounded-full bg-slate-200" />
                                  <span className="text-[8px] font-bold text-slate-400 uppercase truncate">{attr.address?.split(',')[0]}</span>
                                </div>
                                <div className="flex gap-1 mt-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="h-6 px-2 rounded-lg text-[7px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 hover:bg-blue-600 hover:text-white disabled:opacity-50"
                                    disabled={selectedTrip && selectedTrip.sideQuests?.find((q: any) => q.id === attr.id)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToQuest(attr);
                                    }}
                                  >
                                    <Plus className="h-2.5 w-2.5 mr-1" /> {selectedTrip && selectedTrip.sideQuests?.find((q: any) => q.id === attr.id) ? "Added" : "Add"}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="h-6 px-2 rounded-lg text-[7px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFocusAttraction(attr);
                                    }}
                                  >
                                    <Target className="h-2.5 w-2.5 mr-1" /> Focus
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {attractions.length > 0 && (
                    <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                      <Button 
                        onClick={closeSidebar}
                        className="w-full h-10 text-[9px] font-black uppercase tracking-[0.2em] bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl shadow-sm transition-all"
                        variant="outline"
                      >
                        Clear Intelligence
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
