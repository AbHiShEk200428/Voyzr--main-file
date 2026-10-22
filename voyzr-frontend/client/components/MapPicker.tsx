import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search as SearchIcon, LocateFixed as LocateFixedIcon, Loader2 as Loader2Icon, MapPin as MapPinIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const customPinIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  fullHeight?: boolean;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

function ClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ onLocationSelect, initialLat, initialLng, initialAddress, fullHeight }: MapPickerProps) {
  const [searchQuery, setSearchQuery] = useState(initialAddress || "");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialLat && initialLng ? [initialLat, initialLng] : [20.5937, 78.9629] // India default
  );

  // Sync state if props change (e.g. redirected from Free Roam)
  useEffect(() => {
    if (initialLat && initialLng) {
      setMarkerPos([initialLat, initialLng]);
      setMapCenter([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  const handleLocationUpdate = useCallback(async (lat: number, lng: number, customAddress?: string) => {
    setIsSearching(true);
    let address = customAddress;
    if (!address) {
      try {
        // Force English with accept-language=en
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&accept-language=en&lat=${lat}&lon=${lng}`;
        const response = await fetch(url);
        const data = await response.json();
        address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      } catch (error) { 
        address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; 
      }
    }
    setMarkerPos([lat, lng]);
    setSearchQuery(address || "");
    onLocationSelect(lat, lng, address || "");
    setIsSearching(false);
  }, [onLocationSelect]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      // Force English with accept-language=en
      const url = `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMapCenter([lat, lon]);
        handleLocationUpdate(lat, lon, data[0].display_name);
      }
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsSearching(false); 
    }
  };

  const handleLocateMe = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        handleLocationUpdate(latitude, longitude);
        setIsLocating(false);
      }, () => { 
        setIsLocating(false); 
        alert("Locate failed."); 
      });
    }
  };

  return (
    <div className={cn("space-y-4", fullHeight && "flex-1 flex flex-col min-h-0")}>
      <div className="relative z-10 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(searchQuery);
              }
            }}
            placeholder="Search destination (e.g. Munnar, London...)"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 pl-12 text-[13px] font-bold text-white placeholder:text-slate-600 transition-all focus:border-blue-500/50 focus:bg-white/10 outline-none shadow-inner"
          />
        </div>
        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={handleLocateMe} 
            className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors shadow-xl text-slate-400 hover:text-blue-400"
          >
            {isLocating ? <Loader2Icon className="h-5 w-5 animate-spin text-blue-400" /> : <LocateFixedIcon className="h-5 w-5" />}
          </button>
          <button 
            type="button" 
            onClick={() => performSearch(searchQuery)}
            disabled={isSearching} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-2xl accent-glow"
          >
            {isSearching ? "..." : "Search"}
          </button>
        </div>
      </div>

      <div className={cn(
        "w-full rounded-[2rem] border-4 border-white/5 overflow-hidden relative shadow-2xl group flex-1",
        fullHeight ? "flex-1" : "h-[450px]"
      )}>
        <MapContainer
          center={mapCenter}
          zoom={initialLat ? 14 : 5}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.geoapify.com/">Geoapify</a>'
            url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=6de209a5add94a398bfea16528c7981b`}
          />
          <MapUpdater center={mapCenter} />
          <ClickHandler onLocationSelect={handleLocationUpdate} />
          
          {markerPos && (
            <Marker position={markerPos} icon={customPinIcon}>
              <Popup className="custom-popup">
                <div className="p-2 text-center bg-slate-900 text-white border-white/10">
                  <p className="font-black text-[9px] uppercase tracking-widest text-blue-400 mb-1">Target Identified</p>
                  <p className="font-bold text-slate-300 text-xs line-clamp-2">{searchQuery}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        
        <div className="absolute bottom-6 right-6 z-[1000]">
           <div className="bg-slate-900/90 px-4 py-2 rounded-xl border border-white/10 shadow-2xl flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-blue-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tactical Map Interaction Enabled</span>
           </div>
        </div>
      </div>
    </div>

  );
}
