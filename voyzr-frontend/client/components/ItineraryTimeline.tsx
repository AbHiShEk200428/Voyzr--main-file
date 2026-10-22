import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { 
  Plus, 
  Clock, 
  MapPin, 
  MoreVertical, 
  Trash2, 
  Calendar as CalendarIcon,
  Map,
  Coffee,
  Plane,
  Camera,
  Utensils, 
  Backpack, 
  GripVertical,
  Zap,
  Radar,
  Loader2,
  Check,
  Star,
  Camera as CameraIcon,
  X
} from "lucide-react";
import { format, parseISO, addDays, isSameDay, isAfter, isBefore, startOfDay, setHours, setMinutes } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import type { Activity, Trip } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ItineraryTimelineProps {
  trip: Trip;
  acceptedQuests: any[];
  setAcceptedQuests: React.Dispatch<React.SetStateAction<any[]>>;
}

const STORAGE_KEY = (tripId: string) => `voyzr_itinerary_${tripId}`;

const activityTypeIcons = {
  TRANSPORT: Plane,
  ACCOMMODATION: Coffee,
  SIGHTSEEING: Camera,
  DINING: Utensils,
  ACTIVITY: Backpack,
  OTHER: Map,
  SIDE_QUEST: Zap
};

const activityTypeColors = {
  TRANSPORT: "bg-blue-500/10 text-blue-600 border-blue-200",
  ACCOMMODATION: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  SIGHTSEEING: "bg-purple-500/10 text-purple-600 border-purple-200",
  DINING: "bg-amber-500/10 text-amber-600 border-amber-200",
  ACTIVITY: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  OTHER: "bg-slate-500/10 text-slate-600 border-slate-200",
  SIDE_QUEST: "bg-yellow-500/10 text-yellow-600 border-yellow-200"
};

export function ItineraryTimeline({ trip, acceptedQuests, setAcceptedQuests }: ItineraryTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedQuests, setScannedQuests] = useState<any[]>([]);
  const [assigningQuestId, setAssigningQuestId] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    type: "ACTIVITY",
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  const tripId = trip.id;
  const startDate = trip.tripDate;

  // Load activities from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(tripId));
    if (saved) {
      try {
        setActivities(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse activities", e);
      }
    }
  }, [tripId]);

  // Save activities to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY(tripId), JSON.stringify(activities));
  }, [activities, tripId]);

  const handleAcceptQuest = (quest: any) => {
    if (acceptedQuests.find(q => q.id === quest.id)) {
      toast.info("Mission already active.");
      return;
    }
    setAcceptedQuests(prev => [...prev, quest]);
    toast.success(`Side Quest Accepted: ${quest.name}`);
  };

  const handleScanRecon = async () => {
    if (!trip?.destinationLat || !trip?.destinationLng) {
      toast.error("Coordinates not available for scanning.");
      return;
    }

    setIsScanning(true);
    setScannedQuests([]);

    try {
      const fsqApiKey = import.meta.env.VITE_FOURSQUARE_API_KEY;

      if (!fsqApiKey || !fsqApiKey.startsWith('fsq3')) {
        await handleGeoapifyFallback();
        return;
      }

      const lat = Number(trip.destinationLat);
      const lng = Number(trip.destinationLng);
      const categories = "16000,13000,16015,10000";
      const url = `https://api.foursquare.com/v3/places/search?ll=${lat},${lng}&categories=${categories}&radius=15000&limit=50&fields=fsq_id,name,location,categories,description,photos,rating,geocodes`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': fsqApiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error("Uplink failed");
      const data = await response.json();

      const processed = data.results.map((p: any) => ({
        id: p.fsq_id,
        name: p.name,
        address: p.location.formatted_address || p.location.address || "Sector Unknown",
        description: p.description || `Tactical landmark identified in ${p.location.locality || 'local sector'}.`,
        type: p.categories[0]?.id >= 13000 && p.categories[0]?.id < 14000 ? 'FEAST' : 
              p.categories[0]?.id >= 16000 && p.categories[0]?.id < 17000 ? 'LANDSCAPE' : 'INTEL',
        category: p.categories[0]?.name || "Unclassified",
        imageUrl: p.photos?.[0] ? `${p.photos[0].prefix}original${p.photos[0].suffix}` : 
                 `/api/places/photo?name=${encodeURIComponent(p.name || 'landmark')}`,
        rating: p.rating || (Math.random() * 2 + 3).toFixed(1),
        lat: p.geocodes?.main?.latitude,
        lng: p.geocodes?.main?.longitude
      }));

      setScannedQuests(processed.slice(0, 6));
      toast.success("Sector Scan Complete: Intelligence Updated");
    } catch (err) {
      toast.error("Reconnaissance Failed: Signal Lost");
    } finally {
      setIsScanning(false);
    }
  };

  const handleGeoapifyFallback = async () => {
    try {
      const geoKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
      const lat = Number(trip.destinationLat);
      const lng = Number(trip.destinationLng);
      const categories = "entertainment,tourism,catering";
      const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lng},${lat},15000&limit=20&apiKey=${geoKey}`;

      const response = await fetch(url);
      const data = await response.json();

      const processed = data.features.map((f: any) => ({
        id: f.properties.place_id,
        name: f.properties.name || "Unnamed Point of Interest",
        address: f.properties.address_line2 || "Local Sector",
        description: `Strategic location identified in ${f.properties.city || 'target area'}. Recommended for exploration.`,
        type: f.properties.categories.includes('catering') ? 'FEAST' : 
              f.properties.categories.includes('tourism.sight') ? 'LANDSCAPE' : 'INTEL',
        category: f.properties.categories[0]?.split('.').pop()?.toUpperCase() || "POI",
        imageUrl: `/api/places/photo?name=${encodeURIComponent(f.properties.name || f.properties.categories[0]?.split('.').pop() || 'landmark')}`,
        rating: (Math.random() * 1.5 + 3.5).toFixed(1),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0]
      }));

      setScannedQuests(processed.slice(0, 6));
      toast.success("Geo-Sector Scan Complete");
    } catch (err) {
      toast.error("Fallback Recon Failed");
    } finally {
      setIsScanning(false);
    }
  };

  const days = useMemo(() => {
    const tripStart = parseISO(startDate);
    const dayList = [];
    for (let i = 0; i < 7; i++) { // Show 7 days for now
      dayList.push(addDays(tripStart, i));
    }
    return dayList;
  }, [startDate]);

  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    activities.forEach(act => {
      const dateKey = format(parseISO(act.startTime), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(act);
    });
    // Sort activities within each group by time
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return groups;
  }, [activities]);

  const handleAddActivity = () => {
    if (!newActivity.title || !newActivity.startTime) return;

    const activity: Activity = {
      id: crypto.randomUUID(),
      tripId,
      title: newActivity.title,
      description: newActivity.description,
      startTime: newActivity.startTime,
      type: (newActivity.type as any) || "ACTIVITY",
      location: newActivity.location,
      lat: newActivity.lat,
      lng: newActivity.lng
    };

    setActivities(prev => [...prev, activity]);
    
    // Remove from accepted quests if this was an assigned mission
    if (assigningQuestId) {
      setAcceptedQuests(prev => prev.filter(q => q.id !== assigningQuestId));
      setAssigningQuestId(null);
    }

    setIsAddOpen(false);
    setNewActivity({
      type: "ACTIVITY",
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    });
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const handleDropQuestOnDate = (questId: string, targetDate: Date) => {
    const quest = acceptedQuests.find(q => q.id === questId);
    if (!quest) return;

    const suggestedTime = setMinutes(setHours(targetDate, 14), 0); // Default to 2 PM
    
    const activity: Activity = {
      id: crypto.randomUUID(),
      tripId,
      title: quest.name,
      description: quest.description,
      startTime: format(suggestedTime, "yyyy-MM-dd'T'HH:mm"),
      type: "SIDE_QUEST",
      location: quest.address,
      lat: quest.lat,
      lng: quest.lng
    };

    setActivities(prev => [...prev, activity]);
    setAcceptedQuests(prev => prev.filter(q => q.id !== questId));
    toast.success(`Mission deployed to ${format(targetDate, "MMM do")}`);
  };

  const handleAssignQuest = (quest: any) => {
    setAssigningQuestId(quest.id);
    // 1. Determine the best date
    let bestDate = parseISO(startDate);
    const now = new Date();
    const tripStart = parseISO(startDate);
    const tripEnd = addDays(tripStart, 7);

    // If trip is live, start looking from today
    const searchStart = (isAfter(now, tripStart) && isBefore(now, tripEnd)) 
      ? startOfDay(now) 
      : tripStart;

    // 2. Find the day with the fewest activities
    let minActivities = Infinity;
    
    for (let i = 0; i < 7; i++) {
      const currentDay = addDays(tripStart, i);
      if (isBefore(currentDay, searchStart) && !isSameDay(currentDay, searchStart)) continue;

      const dateKey = format(currentDay, "yyyy-MM-dd");
      const activityCount = (groupedActivities[dateKey] || []).length;

      if (activityCount < minActivities) {
        minActivities = activityCount;
        bestDate = currentDay;
        if (activityCount === 0) break; // Found an empty day, perfect
      }
    }

    // 3. Set a tactical time (e.g., 14:00 / 2 PM for side quests)
    const suggestedTime = setMinutes(setHours(bestDate, 14), 0);

    setNewActivity({
      title: quest.name,
      location: quest.address,
      description: quest.description,
      type: "SIDE_QUEST",
      startTime: format(suggestedTime, "yyyy-MM-dd'T'HH:mm"),
      lat: quest.lat,
      lng: quest.lng
    });
    setIsAddOpen(true);
    toast.info(`Suggested deployment: ${format(bestDate, "EEEE, MMM do")} (Lightest Schedule)`);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Mission Timeline</h2>
          <p className="text-sm text-slate-500 font-medium">Coordinate your daily operational parameters</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleScanRecon} 
            disabled={isScanning}
            variant="outline"
            className="rounded-xl border-2 border-blue-500/20 bg-blue-50/50 px-6 py-2 font-black uppercase tracking-widest text-blue-600 hover:bg-blue-100 transition-all text-[10px] h-11 flex items-center gap-2"
          >
            {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            {isScanning ? "Scanning Sector..." : "Tactical Recon"}
          </Button>
          <Button 
            onClick={() => setIsAddOpen(true)}
            className="rounded-xl bg-slate-900 px-6 py-2 font-black uppercase tracking-widest text-white hover:bg-black transition-all text-[10px] h-11 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {scannedQuests.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-600/5 border-2 border-blue-500/20 rounded-[2.5rem] p-8 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Button variant="ghost" size="icon" onClick={() => setScannedQuests([])} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                  <Radar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em]">Tactical Recommendations</h3>
                  <p className="text-[10px] text-blue-500/60 font-bold uppercase">Sector intelligence identifies the following objectives</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scannedQuests.map((quest) => (
                  <Card key={quest.id} className="rounded-3xl border-none shadow-sm bg-white hover:shadow-md transition-all group overflow-hidden flex flex-col h-full">
                    <div className="relative h-28 overflow-hidden">
                      <img src={quest.imageUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-white/20 backdrop-blur-md text-white border-none text-[8px] font-black uppercase">{quest.type}</Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="font-black text-slate-900 text-[11px] uppercase tracking-tight truncate mb-1">{quest.name}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase truncate flex items-center gap-1">
                          <MapPin className="h-2 w-2" /> {quest.address}
                        </p>
                      </div>
                      <Button 
                        onClick={() => handleAcceptQuest(quest)}
                        disabled={acceptedQuests.some(q => q.id === quest.id)}
                        className="w-full h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-600/20"
                      >
                        {acceptedQuests.some(q => q.id === quest.id) ? (
                          <span className="flex items-center gap-2"><Check className="h-3 w-3" /> Accepted</span>
                        ) : "Add to Missions"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {acceptedQuests.length > 0 && (
        <div className="bg-amber-500/5 border-2 border-dashed border-amber-500/20 rounded-[2.5rem] p-8 shadow-inner">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-600 uppercase tracking-[0.2em]">Active Side Missions</h3>
              <p className="text-[10px] text-amber-500/60 font-bold uppercase">Tactical objectives to complete during the mission</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {acceptedQuests.map((quest) => (
              <div 
                key={quest.id} 
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("questId", quest.id);
                }}
                className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 group cursor-grab active:cursor-grabbing hover:border-amber-300 transition-colors"
              >
                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0", activityTypeColors.SIDE_QUEST)}>
                  <Zap className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight truncate">{quest.name}</h4>
                  <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
                    <MapPin className="h-2 w-2" />
                    <span className="truncate">{quest.address}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    onClick={() => handleAssignQuest(quest)}
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    title="Assign to Timeline"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Badge className="bg-amber-500/10 text-amber-600 border-none text-[8px] font-black uppercase px-1.5 py-0">Quest</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {days.map((day, index) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayActivities = groupedActivities[dateKey] || [];

          return (
            <div 
              key={dateKey} 
              className="relative rounded-[2rem] border-2 border-transparent transition-all duration-200"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('bg-blue-50/50', 'border-blue-200', 'scale-[1.01]');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-blue-50/50', 'border-blue-200', 'scale-[1.01]');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-blue-50/50', 'border-blue-200', 'scale-[1.01]');
                const questId = e.dataTransfer.getData("questId");
                if (questId) {
                  handleDropQuestOnDate(questId, day);
                }
              }}
            >
              <div className="flex items-center gap-3 mb-3 px-2 pt-2">
                <div className="h-10 w-10 rounded-xl bg-white border-2 border-slate-100 flex flex-col items-center justify-center shadow-sm shrink-0">
                  <span className="text-[8px] font-black uppercase text-slate-400 leading-none">{format(day, "MMM")}</span>
                  <span className="text-sm font-black text-slate-900 leading-none mt-0.5">{format(day, "dd")}</span>
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Day {index + 1}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{format(day, "EEEE")}</p>
                </div>
              </div>

              <div className="ml-5 border-l-2 border-dashed border-slate-200 pl-6 space-y-3 pb-2">
                {dayActivities.length > 0 ? (
                  <Reorder.Group axis="y" values={dayActivities} onReorder={(newOrder) => {
                    const otherActivities = activities.filter(a => format(parseISO(a.startTime), "yyyy-MM-dd") !== dateKey);
                    setActivities([...otherActivities, ...newOrder]);
                  }}>
                    {dayActivities.map((act) => {
                      const Icon = activityTypeIcons[act.type] || Map;
                      return (
                        <Reorder.Item key={act.id} value={act}>
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="group relative"
                          >
                            {/* Dot on the timeline */}
                            <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-[3px] border-slate-50 bg-slate-200 group-hover:bg-primary group-hover:scale-125 transition-all" />
                            
                            <Card className="rounded-xl border-none shadow-sm bg-white hover:shadow-md transition-all group-hover:translate-x-1 overflow-hidden">
                              <CardContent className="p-3 flex items-center gap-3">
                                <div className="h-8 w-6 shrink-0 cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400 flex items-center justify-center">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                
                                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shadow-inner shrink-0", activityTypeColors[act.type])}>
                                  <Icon className="h-4 w-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight truncate">{act.title}</h4>
                                    <Badge variant="outline" className={cn("text-[7px] font-black uppercase px-1 py-0 border-none", activityTypeColors[act.type])}>
                                      {act.type}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                                      <Clock className="h-2.5 w-2.5" />
                                      {format(parseISO(act.startTime), "p")}
                                    </div>
                                    {act.location && (
                                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase truncate max-w-[150px]">
                                        <MapPin className="h-2.5 w-2.5" />
                                        {act.location}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteActivity(act.id)}
                                  className="h-8 w-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </CardContent>
                            </Card>
                          </motion.div>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                ) : (
                  <div className="py-4 text-center bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-100 pointer-events-none">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Drop mission here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-slate-900 p-8 text-white">
            <DialogHeader className="mb-6 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                <Plus className="h-6 w-6 text-primary" />
                Add Activity
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">
                Schedule a new stop or activity for your trip.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Activity Title</label>
                <Input 
                  placeholder="e.g. Visit Eiffel Tower" 
                  value={newActivity.title || ""}
                  onChange={e => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-600 h-12 rounded-xl focus-visible:ring-primary"
                />
              </div>
            </div>
          </div>
          <div className="p-8 bg-white space-y-6 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</label>
                <Input 
                  type="datetime-local"
                  value={newActivity.startTime || ""}
                  onChange={e => setNewActivity(prev => ({ ...prev, startTime: e.target.value }))}
                  className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                <Select 
                  value={newActivity.type} 
                  onValueChange={val => setNewActivity(prev => ({ ...prev, type: val as any }))}
                >
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ACTIVITY">Activity</SelectItem>
                    <SelectItem value="SIGHTSEEING">Sightseeing</SelectItem>
                    <SelectItem value="DINING">Dining</SelectItem>
                    <SelectItem value="TRANSPORT">Transport</SelectItem>
                    <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                    <SelectItem value="SIDE_QUEST">Side Quest</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location (Optional)</label>
              <Input 
                placeholder="e.g. Champ de Mars, Paris" 
                value={newActivity.location || ""}
                onChange={e => setNewActivity(prev => ({ ...prev, location: e.target.value }))}
                className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-sm"
              />
            </div>

            <DialogFooter className="mt-8 pt-4">
              <Button onClick={handleAddActivity} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20">
                Confirm Schedule
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
