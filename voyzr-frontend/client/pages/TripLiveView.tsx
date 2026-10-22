import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  MapPin, 
  Clock, 
  Users, 
  Navigation, 
  Timer, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  RefreshCw
} from "lucide-react";
import { useTrip } from "@/hooks/useTrips";
import { Sidebar } from "@/components/Sidebar";
import LiveTrackingMap from "@/components/LiveTrackingMap";
import { useLocation } from "@/hooks/useLocation";
import { getInitials, cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

export default function TripLiveView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { data: trip, isLoading, error } = useTrip(id || "");
  
  // Real-time location hook
  const { 
    memberLocations, 
    syncReport, 
    isConnected, 
    sendUpdate,
    refreshSync 
  } = useLocation(id, authUser?.id);

  // Load accepted quests and activities from localStorage - MOVED UP
  const [sideQuests, setSideQuests] = useState<any[]>([]);
  useEffect(() => {
    if (!id) return;
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
        allQuests = [...allQuests, ...scheduledQuests];
      } catch (e) {
        console.error("Failed to parse itinerary", e);
      }
    }
    
    setSideQuests(allQuests);
  }, [id]);

  // Use real geolocation
  useEffect(() => {
    if (!isConnected || !authUser?.id) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        sendUpdate(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isConnected, authUser?.id, sendUpdate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="ml-64 flex-1 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="ml-64 flex-1 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Trip not found</h2>
          <button onClick={() => navigate("/")} className="mt-4 text-indigo-600 hover:underline">
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }

  const members = trip.members || [];

  return (
    <div className="flex min-h-screen bg-transparent text-white overflow-hidden">
      <Sidebar />

      <main className="ml-64 flex-1 p-8 relative z-10 overflow-y-auto h-screen custom-scrollbar">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate(`/trip/${id}`)}
            className="mb-4 flex items-center gap-2 text-slate-500 hover:text-blue-400 transition-colors font-black text-[10px] uppercase tracking-[0.2em]"
          >
            <ChevronLeft className="h-4 w-4" />
            Abort Live Feed
          </button>
          
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase neon-glow">{trip.name}</h1>
                <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-500/30 shadow-lg accent-glow animate-pulse">
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  Live Uplink Active
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-6 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  {trip.destination}
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  <Clock className="h-4 w-4 text-blue-400" />
                  ETA Window: {trip.targetArrivalTime ? new Date(trip.targetArrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Flexible"}
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={refreshSync}
                className="bg-white/5 p-3 rounded-2xl border border-white/10 shadow-xl hover:bg-white/10 transition-all active:rotate-180"
                title="Resync telemetry"
              >
                <RefreshCw className="h-5 w-5 text-slate-400" />
              </button>
              <div className="glass-panel px-6 py-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4">
                <div className="flex -space-x-2">
                  {members.slice(0, 3).map((m, i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-slate-900 bg-blue-600/20 flex items-center justify-center text-[10px] font-black text-blue-400 shadow-xl">
                      {getInitials(m.userName || m.name || "?")}
                    </div>
                  ))}
                </div>
                <div className="h-6 w-[1px] bg-white/10" />
                <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest">
                  <Users className="h-4 w-4 text-blue-400" />
                  {members.length} Tracking
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Map Section */}
          <div className="lg:col-span-3 space-y-6">
            <LiveTrackingMap 
              tripId={id || ""}
              destination={{ 
                lat: trip.destinationLat || 9.9312, 
                lng: trip.destinationLng || 76.2673, 
                name: trip.destination 
              }} 
              members={members}
              currentUserId={String(authUser?.id || "")}
              memberLocations={memberLocations}
              onLocationUpdate={(lat, lng) => sendUpdate(lat, lng)}
              targetArrivalTime={trip.targetArrivalTime}
              sideQuests={sideQuests}
            />

            {/* Synchronization Dashboard */}
            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <h2 className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.2em] mb-8 flex items-center gap-3 neon-glow">
                <Timer className="h-4 w-4 text-blue-400" />
                Telemetry Synchronization Engine
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {syncReport?.memberStatus.map((status) => (
                  <div key={status.userId} className="p-5 rounded-3xl border border-white/5 bg-white/5 shadow-inner group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-black text-blue-400 shadow-xl group-hover:scale-110 transition-transform">
                        {getInitials(status.userName)}
                      </div>
                      <span className="text-[11px] font-black text-white uppercase tracking-tight truncate">{status.userName}</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Current ETA</p>
                        <p className="text-xl font-black text-white tabular-nums neon-glow">{status.currentEtaText || "--"}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Recommended Departure</p>
                        <p className="text-[11px] font-black text-blue-400 uppercase tracking-tight">
                          {status.recommendedStartTime ? new Date(status.recommendedStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Processing..."}
                        </p>
                      </div>
                      <div className={cn(
                        "mt-2 py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-center border shadow-lg",
                        status.syncMessage.includes("🟢") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        status.syncMessage.includes("🔴") ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                        "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      )}>
                        {status.syncMessage.replace(/[🟢🔴🟠]/g, "") || "Analyzing..."}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Member List Section */}
          <div className="space-y-6">
            <h2 className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.2em] flex items-center gap-3 neon-glow px-2">
              <Navigation className="h-4 w-4 text-blue-400" />
              Tactical Intel Feed
            </h2>
            
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {members.map((member) => {
                const mId = String(member.userId || member.id);
                const loc = memberLocations[mId];
                const sync = syncReport?.memberStatus.find(s => String(s.userId) === mId);
                const isActive = !!loc;
                
                return (
                  <motion.div
                    key={mId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "glass-card p-5 rounded-3xl border transition-all shadow-xl",
                      isActive ? "border-blue-500/20 bg-blue-600/5 ring-1 ring-blue-500/10" : "border-white/5 opacity-40 grayscale"
                    )}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-2xl transition-all",
                          isActive ? "bg-blue-600 text-white accent-glow scale-105" : "bg-slate-800 text-slate-500"
                        )}>
                          {getInitials(member.userName || member.name || "?")}
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-white uppercase tracking-tight">{member.userName || member.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-slate-600")} />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              {isActive ? 'Uplink Established' : 'Signal Lost'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isActive && sync && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Operational Progress</p>
                              <p className="text-[11px] font-black text-blue-400 uppercase tracking-tight">{sync.currentEtaText}</p>
                           </div>
                           <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                           </div>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: "65%" }}
                             className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                           />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="p-6 glass-panel rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-3 relative z-10 neon-glow">
                Encryption Status
              </h3>
              <p className="text-[10px] text-slate-500 mt-4 leading-relaxed relative z-10 font-bold uppercase tracking-tight">
                Voyzr Neural Mesh active. Real-time packet tunneling enabled for all Operative telemetry.
              </p>
              <div className="mt-6 flex items-center gap-3 relative z-10">
                 <div className={cn("h-2.5 w-2.5 rounded-full", isConnected ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" : "bg-rose-500")} />
                 <span className="text-[9px] font-black text-white uppercase tracking-widest">
                   {isConnected ? "Secure Uplink Active" : "Reconnecting Link..."}
                 </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
