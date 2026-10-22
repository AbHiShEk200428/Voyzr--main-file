import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation as useRouteLocation } from "react-router-dom";
import { ChevronLeft, MapPin, Clock, Type, AlignLeft, Timer, Sparkles, Navigation, Map as MapIcon } from "lucide-react";
import { useTrips } from "@/hooks/useTrips";
import { Sidebar } from "@/components/Sidebar";
import MapPicker from "@/components/MapPicker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FormData {
  name: string;
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
  targetArrivalTime: string;
  startDate: string;
  description: string;
}

export default function CreateTrip() {
  const navigate = useNavigate();
  const routeLocation = useRouteLocation();
  const { createTrip, isCreating } = useTrips();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    destination: "",
    destinationLat: undefined,
    destinationLng: undefined,
    targetArrivalTime: "",
    startDate: "",
    description: "",
  });

  const [travelTime, setTravelTime] = useState<number | null>(null); // in seconds
  const [isCalculating, setIsCalculating] = useState(false);

  // Pre-fill location if coming from Freeroam Map
  useEffect(() => {
    if (routeLocation.state && routeLocation.state.destination) {
      const destination = routeLocation.state.destination;
      const shortName = destination.split(',')[0];
      
      setFormData(prev => ({
        ...prev,
        name: prev.name || `Trip to ${shortName}`,
        destination: destination,
        destinationLat: routeLocation.state.lat,
        destinationLng: routeLocation.state.lng,
      }));
    }
  }, [routeLocation.state]);

  const calculateTravelTime = useCallback(async (lat: number, lng: number) => {
    setIsCalculating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      
      const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || "6de209a5add94a398bfea16528c7981b";
      const url = `https://api.geoapify.com/v1/routing?waypoints=${pos.coords.latitude},${pos.coords.longitude}|${lat},${lng}&mode=drive&apiKey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features[0]) {
        setTravelTime(data.features[0].properties.time);
      }
    } catch (error) {
      console.error("Error calculating travel time:", error);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  useEffect(() => {
    if (formData.destinationLat && formData.destinationLng) {
      calculateTravelTime(formData.destinationLat, formData.destinationLng);
    }
  }, [formData.destinationLat, formData.destinationLng, calculateTravelTime]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "targetArrivalTime") {
      setFormData((prev) => ({ 
        ...prev, 
        [name]: value,
        startDate: value.split("T")[0]
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setFormData((prev) => ({
      ...prev,
      destination: address,
      destinationLat: lat,
      destinationLng: lng,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.destination || !formData.targetArrivalTime) {
      alert("Please fill in all required fields: Name, Destination, and Arrival Time.");
      return;
    }

    createTrip(formData, {
      onSuccess: () => navigate("/"),
      onError: (err) => alert("Failed to create trip: " + (err instanceof Error ? err.message : "Internal Error"))
    });
  };

  const getRecommendedStartData = () => {
    if (!formData.targetArrivalTime || travelTime === null) return null;
    
    const arrivalDate = new Date(formData.targetArrivalTime);
    // Subtract travel time + 15 mins buffer
    const startTime = new Date(arrivalDate.getTime() - (travelTime * 1000) - (15 * 60 * 1000));
    const now = new Date();
    
    return {
      date: startTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      time: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isPossible: startTime > now,
      rawDate: startTime
    };
  };

  const recommendedStart = getRecommendedStartData();

  // Get current time in ISO format for the 'min' attribute (YYYY-MM-DDTHH:mm)
  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    // Format to YYYY-MM-DDTHH:mm correctly adjusted for local timezone
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-900 overflow-hidden">
      <Sidebar />

      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-24 relative z-10 overflow-y-auto h-screen custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <button
              onClick={() => navigate("/")}
              className="group mb-6 flex items-center gap-3 text-slate-500 transition-all hover:text-blue-500 font-black text-[10px] uppercase tracking-[0.2em]"
            >
              <div className="p-2.5 rounded-2xl bg-white border border-slate-200 group-hover:border-blue-500/30 group-hover:bg-blue-600/10 transition-all shadow-xl">
                <ChevronLeft className="h-4 w-4" />
              </div>
              Return to Trips
            </button>
            
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-[2rem] bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3 accent-glow">
                <Sparkles className="h-10 w-10 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-1">Plan Your Adventure</h1>
                <p className="text-slate-500 font-black uppercase text-[11px] tracking-widest flex items-center gap-2">
                   <Timer className="h-4 w-4 text-slate-400" /> Trip initialization sequence
                </p>
              </div>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Main Form Section */}
            <section className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl space-y-10">
              
              {/* Row 1: Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                    <Type className="h-4 w-4 text-slate-400" /> Trip Identity
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Weekend at the Coast"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-slate-900 font-bold placeholder-slate-400 transition-all focus:border-blue-500/50 focus:bg-white outline-none shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                    <Clock className="h-4 w-4 text-slate-400" /> Target Arrival
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      name="targetArrivalTime"
                      value={formData.targetArrivalTime}
                      onChange={handleInputChange}
                      required
                      min={getCurrentDateTimeLocal()}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-slate-900 font-bold transition-all focus:border-blue-500/50 focus:bg-white outline-none shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Section with Map Picker */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <MapPin className="h-4 w-4 text-slate-400" /> Destination & Waypoints
                  </label>
                  {formData.destination && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black text-[9px] uppercase tracking-widest">
                      Destination Selected
                    </Badge>
                  )}
                </div>
                
                <div className="rounded-[2.5rem] border-4 border-slate-100 bg-slate-100 overflow-hidden shadow-2xl h-[500px] relative group flex flex-col">
                  <MapPicker 
                    fullHeight
                    onLocationSelect={handleLocationSelect}
                    initialLat={formData.destinationLat}
                    initialLng={formData.destinationLng}
                    initialAddress={formData.destination}
                  />
                </div>
                
                {formData.destination && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg"
                  >
                    <MapIcon className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{formData.destination}</span>
                  </motion.div>
                )}
              </div>

              {/* Recommendations Panel */}
              <AnimatePresence>
                {recommendedStart && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "rounded-[2.5rem] p-8 text-white shadow-2xl border border-white/10",
                      recommendedStart.isPossible 
                        ? "bg-blue-600 border-blue-500/30 accent-glow" 
                        : "bg-rose-600 border-rose-500/30"
                    )}
                  >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-3xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                          {recommendedStart.isPossible ? (
                            <Navigation className="h-8 w-8 text-white animate-pulse" />
                          ) : (
                            <Clock className="h-8 w-8 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                            {recommendedStart.isPossible ? "Recommended Departure" : "Travel Warning"}
                          </p>
                          <h3 className="text-4xl font-black tracking-tighter text-white">
                            {recommendedStart.isPossible ? recommendedStart.time : "ARRIVING LATE"}
                          </h3>
                          <p className="text-[10px] font-black text-white/80 uppercase tracking-widest mt-1">
                            {recommendedStart.isPossible ? recommendedStart.date : "Immediate departure recommended!"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="bg-white/10 px-6 py-4 rounded-3xl border border-white/10 text-center shadow-inner">
                          <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-1">Travel Duration</p>
                          <p className="text-2xl font-black text-white">~{Math.round(travelTime! / 60)}m</p>
                        </div>
                        <div className="bg-white/10 px-6 py-4 rounded-3xl border border-white/10 text-center shadow-inner">
                          <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-1">Buffer Time</p>
                          <p className="text-2xl font-black text-white">15m</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Final Notes */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                  <AlignLeft className="h-4 w-4 text-slate-400" /> Trip Details
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Operational notes, gear requirements, or meetup points..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-slate-900 font-bold placeholder-slate-400 transition-all focus:border-blue-500/50 focus:bg-white outline-none shadow-inner resize-none"
                />
              </div>

            </section>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 h-20 rounded-[2rem] border border-slate-200 bg-white text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 hover:text-slate-800 shadow-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isCreating}
                className="flex-[2] h-20 rounded-[2rem] bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-1 transition-all active:scale-95 accent-glow"
              >
                {isCreating ? "Saving..." : "Create Trip"}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .color-scheme-dark {
          color-scheme: light;
        }
      `}} />
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={cn("px-2 py-1 rounded-full text-[10px] font-black", className)}>
      {children}
    </span>
  );
}
