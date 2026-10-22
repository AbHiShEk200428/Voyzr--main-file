import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Users, Calendar, Navigation, Trash2, LogOut } from "lucide-react";
import type { Trip } from "@/types";
import { cn } from "@/lib/utils";
import { useTrips } from "@/hooks/useTrips";
import { useAuth } from "@/components/AuthProvider";

interface TripCardProps {
  trip: Trip;
  index?: number;
}

export function TripCard({ trip, index = 0 }: TripCardProps) {
  const { user } = useAuth();
  const { deleteTrip, leaveTrip } = useTrips();
  const formattedDate = new Date(trip.tripDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleLeaveOrDelete = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent Navigating to Link
    if (trip.myRole === 'ORGANIZER') {
       if (window.confirm("Are you sure you want to completely delete this trip? This action cannot be undone.")) {
           deleteTrip(trip.id);
       }
    } else {
       if (window.confirm("Are you sure you want to leave this trip?")) {
           leaveTrip({ tripId: trip.id, userId: String(user?.id) });
       }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="relative h-full"
    >
      <Link to={`/trips/${trip.id}`}>
        <div className="group h-full overflow-hidden rounded-[2rem] glass-card transition-all pb-16 shadow-xl border border-slate-200/50 hover:border-primary/20">
          {/* Header with gradient or Image */}
          <div className="relative h-40 bg-slate-900 text-white overflow-hidden">
            {trip.imageUrl ? (
              <img src={trip.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" alt="" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-indigo-600/40 to-slate-900/40 opacity-80" />
            )}
            <div className="absolute inset-0 bg-black/20" />
            
            <div className="relative p-6 flex justify-between items-start h-full flex-col z-10">
              <div className="w-full flex justify-between items-start">
                <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                  <Navigation className="h-5 w-5 text-blue-400" />
                </div>
                <button 
                   onClick={handleLeaveOrDelete}
                   className="h-8 w-8 rounded-lg bg-white/10 hover:bg-red-500/80 backdrop-blur-md flex items-center justify-center transition-colors shadow-sm"
                   title={trip.myRole === 'ORGANIZER' ? "Delete Trip" : "Leave Trip"}
                >
                   {trip.myRole === 'ORGANIZER' ? <Trash2 className="h-4 w-4 text-white" /> : <LogOut className="h-4 w-4 text-white" />}
                </button>
              </div>

              <div className="mt-auto">
                <h3 className="text-xl font-black uppercase tracking-tight leading-tight neon-glow">{trip.name}</h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-blue-300 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {trip.destination.split(',')[0]}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Status Badge */}
            <div className="mb-5 flex items-center justify-between">
              <span
                className={cn(
                  "inline-block rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest shadow-lg accent-glow",
                  trip.status === "LIVE" ? "bg-green-500/80 text-white" : 
                  trip.status === "UPCOMING" ? "bg-blue-600/80 text-white" : "bg-slate-600/80 text-white"
                )}
              >
                {trip.status}
              </span>
              {trip.status === "LIVE" && (
                 <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5 neon-glow">
                   <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                   Live Now
                 </span>
              )}
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                  <Calendar className="h-4 w-4 text-blue-400" />
                </div>
                <span>{formattedDate}</span>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <span>
                  {trip.memberCount || 0}{" "}
                  {(trip.memberCount || 0) === 1 ? "member" : "members"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
      
      {/* Action Buttons */}
      <div className="absolute bottom-4 left-6 right-6 flex gap-2">
        <Link 
          to={`/trips/${trip.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 accent-glow"
        >
          <Users className="h-3.5 w-3.5" />
          Mission Details
        </Link>
      </div>
    </motion.div>
  );
}
