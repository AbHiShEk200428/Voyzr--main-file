import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Trip } from "@/types";
import { MapPin, Plane, Globe } from "lucide-react";
import { useEffect, useRef } from "react";

// Standard Leaflet Marker Icons
const tripIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const activeTripIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface GlobalTripMapProps {
  trips: Trip[];
}

function MapBounds({ trips }: { trips: Trip[] }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || trips.length === 0) return;
    
    const validPoints = trips
      .filter(t => t.destinationLat && t.destinationLng)
      .map(t => [t.destinationLat!, t.destinationLng!] as [number, number]);

    if (validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
      initialized.current = true;
    }
  }, [trips, map]);

  return null;
}

export default function GlobalTripMap({ trips }: GlobalTripMapProps) {
  const validTrips = trips.filter(t => t.destinationLat && t.destinationLng);
  
  // Default to a world view if no trips
  const center: [number, number] = [20, 0];
  const zoom = 2;

  return (
    <div className="relative h-[400px] w-full rounded-[2rem] border-2 border-white/20 overflow-hidden shadow-2xl group">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.geoapify.com/">Geoapify</a>'
          url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=6de209a5add94a398bfea16528c7981b`}
        />
        
        {validTrips.map((trip) => (
          <Marker 
            key={trip.id} 
            position={[trip.destinationLat!, trip.destinationLng!]} 
            icon={trip.status === 'LIVE' ? activeTripIcon : tripIcon}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[150px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-2 w-2 rounded-full ${trip.status === 'LIVE' ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{trip.status}</span>
                </div>
                <h3 className="font-black text-slate-900 text-sm uppercase leading-tight mb-1">{trip.name}</h3>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">{trip.destination}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase tracking-widest">
                        <Plane className="h-3 w-3" /> {new Date(trip.tripDate).toLocaleDateString()}
                    </div>
                    <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600">{trip.memberCount} members</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        <MapBounds trips={trips} />
      </MapContainer>

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-xl flex items-center gap-3 pointer-events-auto">
          <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Expedition Map</h4>
            <p className="text-xs font-black text-slate-900 uppercase">{validTrips.length} Destinations Active</p>
          </div>
        </div>
      </div>
      
      {validTrips.length === 0 && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center p-8 pointer-events-none">
              <div className="bg-white/95 p-8 rounded-[2rem] shadow-2xl text-center max-w-xs border border-white/20">
                  <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <MapPin className="h-8 w-8 text-slate-200" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">No Active Coordinates</h3>
                  <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest leading-relaxed">Destinations with valid coordinates will be plotted here automatically.</p>
              </div>
          </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { font-family: inherit; }
        .custom-popup .leaflet-popup-content-wrapper { 
          border-radius: 1.5rem; 
          padding: 0; 
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .custom-popup .leaflet-popup-content { margin: 0; }
        .custom-popup .leaflet-popup-tip { box-shadow: none; }
      `}} />
    </div>
  );
}
