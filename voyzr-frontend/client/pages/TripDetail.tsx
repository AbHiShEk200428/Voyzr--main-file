import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  ChevronLeft, 
  Users, 
  Calendar, 
  MapPin, 
  FileText, 
  Edit2, 
  X, 
  Check, 
  UserPlus, 
  Info, 
  LayoutList,
  Map,
  MessageCircle,
  ArrowRight,
  WifiOff,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Target,
  Wallet,
  Plus,
  Receipt,
  Settings,
  Flag,
  Trash2,
  RefreshCw,
  Clock,
  LogOut,
  Link as LinkIcon
} from "lucide-react";
import { useTrip, useRemoveMember, useJoinRequests } from "@/hooks/useTrips";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { formatDateRange, getStatusColor, cn, getInitials, formatDate } from "@/lib/utils";
import MapPicker from "@/components/MapPicker";
import AddMemberModal from "@/components/AddMemberModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItineraryTimeline } from "@/components/ItineraryTimeline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { tripApi } from "@/services/api";
import { toast } from "sonner";
import { useCreateExpense } from "@/hooks/useExpenses";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddDialogOpen] = useState(false);
  const [acceptedQuests, setAcceptedQuests] = useState<any[]>([]);
  const [intelData, setIntelData] = useState<{
    weather?: { temp: number; condition: string; humidity: number };
    time?: { local: string; offset: string };
    currency?: { code: string; rate: string };
  }>({});
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);

  // Declare trip early so fetchIntelligence can reference it without a temporal dead zone
  const { data: trip, isLoading, error, updateTrip, isUpdating, refetch } = useTrip(id || "");
  const { removeMember } = useRemoveMember(id || "");
  const { respondToJoinRequest } = useJoinRequests(id || "");
  const createExpenseMutation = useCreateExpense();

  const userMember = trip?.members?.find(m => String(m.userId) === String(authUser?.id));
  const isOrganizer = userMember?.role === 'ORGANIZER';
  const isCoAdmin = userMember?.role === 'CO_ADMIN';
  const canManageGroup = isOrganizer || isCoAdmin;

  const pendingRequests = trip?.members?.filter(m => m.status === 'PENDING') || [];

  // Simulated high-tech data uplink based on destination
  const fetchIntelligence = useCallback(async () => {
    if (!trip?.destination) return;
    setIsLoadingIntel(true);
    try {
      // In a real app, these would call actual Weather/Time/FX APIs
      await new Promise(r => setTimeout(r, 1200)); // Simulate uplink lag
      const isInternational = !trip.destination.toLowerCase().includes("india");
      
      setIntelData({
        weather: { 
          temp: 22 + Math.floor(Math.random() * 10), 
          condition: "Optimal / Clear Skies", 
          humidity: 58 
        },
        time: { 
          local: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
          offset: isInternational ? "+4.5H Sector Shift" : "Synchronized with Home"
        },
        currency: {
          code: isInternational ? "USD / EUR" : "INR (Native)",
          rate: isInternational ? "1.00 : 0.92 Global" : "Local Sector Currency"
        }
      });
    } catch (e) {
      console.error("Intel uplink failed", e);
    } finally {
      setIsLoadingIntel(false);
    }
  }, [trip?.destination]);

  useEffect(() => {
    if (trip?.destination) fetchIntelligence();
  }, [trip?.destination, fetchIntelligence]);

  // Persist accepted quests to localStorage
  useEffect(() => {
    if (!id) return;
    const saved = localStorage.getItem(`voyzr_accepted_quests_${id}`);
    if (saved) {
      try {
        setAcceptedQuests(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse accepted quests", e);
      }
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`voyzr_accepted_quests_${id}`, JSON.stringify(acceptedQuests));
  }, [acceptedQuests, id]);

  const [editForm, setEditForm] = useState({
    destination: "",
    destinationLat: 0,
    destinationLng: 0,
    targetArrivalTime: "",
    status: "UPCOMING",
  });

  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "Transport",
    paidBy: authUser?.username || "You"
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const heroY = useTransform(scrollY, [0, 300], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.8]);

  const groupPhotoInputRef = useRef<HTMLInputElement>(null);



  const handleEditOpen = () => {
    if (trip) {
      setEditForm({
        destination: trip.destination,
        destinationLat: trip.destinationLat || 0,
        destinationLng: trip.destinationLng || 0,
        targetArrivalTime: trip.targetArrivalTime || "",
        status: trip.status || "UPCOMING",
      });
      setIsEditing(true);
    }
  };

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setEditForm(prev => ({
      ...prev,
      destination: address,
      destinationLat: lat,
      destinationLng: lng
    }));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tripDate = editForm.targetArrivalTime.split("T")[0];

    updateTrip({
      destination: editForm.destination,
      destinationLat: editForm.destinationLat,
      destinationLng: editForm.destinationLng,
      targetArrivalTime: editForm.targetArrivalTime,
      tripDate: tripDate,
      status: editForm.status as any
    }, {
      onSuccess: () => {
        setIsEditing(false);
      }
    });
  };

  const handleAddExpense = async () => {
    if (!id) return;
    if (!newExpense.description || !newExpense.amount) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        tripId: id,
        description: newExpense.description,
        amount: Number(newExpense.amount),
        category: newExpense.category,
        paidBy: newExpense.paidBy,
        userId: authUser?.id
      });
      toast.success("Expense added successfully!");
      setIsAddDialogOpen(false);
      setNewExpense({
        description: "",
        amount: "",
        category: "Transport",
        paidBy: authUser?.username || "You"
      });
    } catch (err) {
      toast.error("Failed to add expense");
    }
  };

  const handleRemoveMember = (userId: string | number) => {
    if (confirm("Are you sure you want to remove this member?")) {
      removeMember(String(userId));
    }
  };

  const handleToggleAdmin = async (member: any) => {
    if (!id) return;
    const newRole = member.role === 'CO_ADMIN' ? 'MEMBER' : 'CO_ADMIN';
    try {
      await tripApi.updateMemberRole(id, String(member.userId), newRole);
      toast.success(`${member.userName} role updated`);
      refetch();
    } catch (err) {
      toast.error("Failed to update role");
    }
  };

  const handleGroupPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await tripApi.updateTripImage(id, base64String);
        toast.success("Group photo updated");
        refetch();
      } catch (err) {
        toast.error("Failed to update group photo");
      }
    };
    reader.readAsDataURL(file);
  };

  if (!id) {
    return (
      <div className="flex min-h-screen bg-white text-slate-900">
        <Sidebar />
        <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8 flex items-center justify-center">
          <div className="text-center font-black uppercase tracking-widest text-red-500">Invalid trip ID</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900 overflow-hidden">
      <Sidebar />
      <input type="file" ref={groupPhotoInputRef} onChange={handleGroupPhotoUpload} accept="image/*" className="hidden" />

      <main ref={scrollRef} className="md:ml-64 flex-1 overflow-y-auto h-screen relative z-10 custom-scrollbar">
        <div className="p-8 pb-32">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => navigate("/dashboard")}
            className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Itineraries
          </motion.button>

          {isLoading ? (
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-[2.5rem] bg-slate-50 border border-slate-100" />
              <div className="h-64 animate-pulse rounded-[2.5rem] bg-slate-50 border border-slate-100" />
            </div>
          ) : error ? (
            <div className="rounded-[2.5rem] border border-slate-100 bg-slate-50 p-10 text-center">
              <WifiOff className="h-8 w-8 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Connection Lost</h3>
              <p className="mt-2 text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Unable to load trip details.</p>
              <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 font-black text-white uppercase tracking-widest text-[9px]">Retry Connection</button>
            </div>
          ) : trip ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 max-w-6xl mx-auto"
            >
              {/* Parallax Hero Header */}
              <div className="relative h-[400px] rounded-[3rem] overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0">
                  {trip.imageUrl ? (
                    <img src={trip.imageUrl} className="w-full h-full object-cover opacity-40" alt="" />
                  ) : (
                    <div className="absolute inset-0 bg-slate-100" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-90" />
                </motion.div>

                <div className="absolute inset-0 flex flex-col justify-end p-12">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest border-none text-white", trip.status === 'LIVE' ? 'bg-slate-900' : trip.status === 'UPCOMING' ? 'bg-slate-600' : 'bg-slate-400')}>{trip.status}</Badge>
                        <Badge className="bg-white/80 backdrop-blur-sm text-slate-900 border border-slate-200 px-3 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <MapPin className="h-3 w-3 text-slate-900" /> {trip.destination}
                        </Badge>
                      </div>
                      <h1 className="text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none">{trip.name}</h1>
                      <div className="flex items-center gap-6">
                        <div className="flex -space-x-3">
                          {trip.members?.slice(0, 5).map(m => (
                            <Avatar key={m.userId} className="h-10 w-10 border-4 border-white shadow-sm ring-1 ring-slate-100">
                              <AvatarImage src={m.avatar} />
                              <AvatarFallback className="bg-slate-900 text-white font-black text-xs uppercase">{getInitials(m.userName)}</AvatarFallback>
                            </Avatar>
                          ))}
                          {trip.memberCount > 5 && (
                            <div className="h-10 w-10 rounded-full bg-slate-100 border-4 border-white flex items-center justify-center text-slate-600 text-[10px] font-black shadow-sm ring-1 ring-slate-100">+{trip.memberCount - 5}</div>
                          )}
                        </div>
                        <div className="h-8 w-[1px] bg-slate-200" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Trip Date</span>
                          <span className="text-slate-900 font-black text-sm uppercase tracking-widest">{formatDate(trip.tripDate)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => navigate(`/chat`)} className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3">
                        <MessageCircle className="h-4 w-4" /> Trip Chat
                      </button>
                      {trip && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                              <Settings className="h-5 w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-white border border-slate-100 shadow-xl text-slate-900">
                            {canManageGroup && (
                              <DropdownMenuItem onClick={() => groupPhotoInputRef.current?.click()} className="rounded-xl p-3 focus:bg-slate-50 cursor-pointer gap-3">
                                <Camera className="h-4 w-4" /> <span className="font-black text-[9px] uppercase tracking-widest text-slate-600">Update Visuals</span>
                              </DropdownMenuItem>
                            )}
                            {isOrganizer && (
                              <DropdownMenuItem onClick={handleEditOpen} className="rounded-xl p-3 focus:bg-slate-50 cursor-pointer gap-3">
                                <Edit2 className="h-4 w-4" /> <span className="font-black text-[9px] uppercase tracking-widest text-slate-600">Edit Trip</span>
                              </DropdownMenuItem>
                            )}
                            {isOrganizer ? (
                               <DropdownMenuItem onClick={() => {
                                  if (window.confirm("Are you sure you want to completely delete this trip?")) {
                                     tripApi.deleteTrip(trip.id).then(() => navigate('/dashboard'));
                                  }
                               }} className="rounded-xl p-3 focus:bg-red-50 text-red-600 cursor-pointer gap-3 mt-2 border-t border-slate-100">
                                 <Trash2 className="h-4 w-4" /> <span className="font-black text-[9px] uppercase tracking-widest text-red-600">Delete Trip</span>
                               </DropdownMenuItem>
                            ) : (
                               <DropdownMenuItem onClick={() => {
                                  if (window.confirm("Are you sure you want to leave this trip?")) {
                                     removeMember(String(authUser?.id)); // Assuming useRemoveMember supports leaving self, wait, we actually need to navigate away on success
                                     navigate('/dashboard');
                                  }
                               }} className="rounded-xl p-3 focus:bg-red-50 text-red-600 cursor-pointer gap-3 mt-2 border-t border-slate-100">
                                 <LogOut className="h-4 w-4" /> <span className="font-black text-[9px] uppercase tracking-widest text-red-600">Leave Trip</span>
                               </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <Tabs defaultValue="directives" className="space-y-6">
                    <TabsList className="bg-slate-100 border border-slate-200 p-1.5 rounded-2xl h-14 w-fit">
                      <TabsTrigger value="directives" className="rounded-xl px-8 h-11 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all flex items-center gap-2">
                        <Target className="h-4 w-4" /> Trip Description
                      </TabsTrigger>
                      <TabsTrigger value="intel" className="rounded-xl px-8 h-11 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all flex items-center gap-2">
                        <Info className="h-4 w-4" /> Trip Info
                      </TabsTrigger>
                      <TabsTrigger value="missions" className="rounded-xl px-8 h-11 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Missions
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="directives" className="m-0 outline-none space-y-6">
                      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Trip Description</h3>
                        <p className="text-slate-700 font-bold text-lg leading-relaxed uppercase opacity-80 tracking-tight">{trip.description || "No specific trip details defined."}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-[2rem] p-6 text-slate-900 border border-slate-100 shadow-sm flex flex-col justify-between">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Invite Code</p>
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-black tracking-widest text-slate-900">{trip.inviteCode}</span>
                              <button className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors" onClick={() => { navigator.clipboard.writeText(trip.inviteCode); toast.success("Code copied"); }} title="Copy Code text"><FileText className="h-4 w-4 text-slate-900" /></button>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const inviteLink = `${window.location.origin}/invite/${trip.inviteCode}`;
                              navigator.clipboard.writeText(inviteLink);
                              toast.success("Magic Link copied! Send it to your friends.");
                            }}
                            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-[0.98]"
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5" /> Copy Magic Link</span>
                          </button>
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Trip Members</p>
                          <span className="text-2xl font-black text-slate-900">{trip.memberCount} TRAVELERS</span>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="intel" className="m-0 outline-none">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Weather Module */}
                        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Weather</p>
                          {isLoadingIntel ? (
                            <div className="h-16 flex items-center"><Loader2 className="h-6 w-6 animate-spin text-slate-200" /></div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-4xl font-black text-slate-900">{intelData.weather?.temp}°C</span>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{intelData.weather?.condition}</p>
                              <div className="mt-4 flex items-center gap-2">
                                <Badge className="bg-slate-100 text-slate-600 border-none text-[7px] uppercase">Optimal</Badge>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Financial Module */}
                        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Currency</p>
                          {isLoadingIntel ? (
                            <div className="h-16 flex items-center"><Loader2 className="h-6 w-6 animate-spin text-slate-200" /></div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{intelData.currency?.code}</span>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-1">{intelData.currency?.rate}</p>
                              <div className="mt-4">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Status: Stable</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Time Module */}
                        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Local Time</p>
                          {isLoadingIntel ? (
                            <div className="h-16 flex items-center"><Loader2 className="h-6 w-6 animate-spin text-slate-200" /></div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-2xl font-black text-slate-900">{intelData.time?.local}</span>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-1">{intelData.time?.offset}</p>
                              <button onClick={fetchIntelligence} className="mt-4 flex items-center gap-1.5 text-[7px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                                <RefreshCw className="h-2.5 w-2.5" /> Re-sync
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 mt-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Info className="h-5 w-5 text-slate-900" />
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Travel Tip</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase opacity-70">
                          Sector analysis complete. Environment is currently favoring travel. Ensure all logistics are synchronized with the primary objective before departure.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="missions" className="m-0 outline-none space-y-6">
                      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Active Missions</h3>
                          <Badge className="bg-slate-100 text-slate-900 border-none pointer-events-none uppercase tracking-widest text-[9px] font-black px-3 py-1">{trip.sideQuests?.length || 0} Synced</Badge>
                        </div>
                        
                        {trip.sideQuests && trip.sideQuests.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {trip.sideQuests.map((quest: any) => (
                              <div key={quest.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group">
                                <div className="flex items-center gap-4">
                                  {quest.imageUrl ? (
                                    <img src={quest.imageUrl} alt={quest.name} className="h-12 w-12 rounded-xl object-cover" />
                                  ) : (
                                    <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                      <MapPin className="h-5 w-5" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-black text-xs uppercase text-slate-900 line-clamp-1">{quest.name}</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{quest.type} • {quest.category}</p>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    if(confirm("Remove this mission from the itinerary?")) {
                                      const updated = trip.sideQuests!.filter((q: any) => q.id !== quest.id);
                                      updateTrip({ sideQuests: updated });
                                    }
                                  }}
                                  className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 border border-slate-100 border-dashed rounded-3xl">
                            <MapPin className="h-10 w-10 text-slate-300 mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">No active missions scheduled</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 max-w-sm">Open the Tactical Map to discover nearby attractions and assign missions.</p>
                            <Button 
                              onClick={() => navigate('/map')}
                              className="mt-6 bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest h-10 px-6 rounded-xl shadow-lg hover:scale-105 transition-transform"
                            >
                              Open Map
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-8">
                  {/* Team Section */}
                  <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col h-fit">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Trip Members</h3>
                      {canManageGroup && (
                        <button onClick={() => setIsAddMemberOpen(true)} className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm"><Plus className="h-4 w-4" /></button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {trip.members?.map(member => (
                        <div key={member.userId} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="bg-slate-100 text-slate-900 font-black text-[10px] uppercase">{getInitials(member.userName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-black text-slate-900 uppercase truncate max-w-[120px]">{member.userName}</p>
                              <div className="mt-0.5">
                                {member.role === 'ORGANIZER' ? <span className="text-[7px] font-black uppercase tracking-tighter bg-slate-900 text-white px-1 py-0.5 rounded shadow-sm">Organizer</span> :
                                 member.role === 'CO_ADMIN' ? <span className="text-[7px] font-black uppercase tracking-tighter bg-slate-100 text-slate-900 px-1 py-0.5 rounded">Co-Admin</span> :
                                 <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400">Traveler</span>}
                              </div>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                            {isOrganizer && member.role !== 'ORGANIZER' && (
                              <button onClick={() => handleToggleAdmin(member)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors" title={member.role === 'CO_ADMIN' ? "Dismiss" : "Promote"}>
                                {member.role === 'CO_ADMIN' ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            {canManageGroup && member.role !== 'ORGANIZER' && member.userId !== authUser?.id && (
                              <button onClick={() => handleRemoveMember(member.userId)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financials Shortcut */}
                  <div className="bg-white rounded-[2.5rem] p-8 text-slate-900 shadow-sm relative overflow-hidden group cursor-pointer border border-slate-100" onClick={() => navigate('/expenses')}>
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform text-slate-900">
                      <Wallet className="h-16 w-16" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 relative z-10">Expenses</h3>
                    <p className="text-2xl font-black relative z-10 uppercase tracking-tighter text-slate-900">Trip Budget <ArrowRight className="inline-block h-5 w-5 ml-2 text-slate-900 group-hover:translate-x-2 transition-transform" /></p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* Mobile Quick Actions FAB */}
        <div className="fixed bottom-24 right-5 z-[100] md:hidden">
          <AnimatePresence>
            {isQuickActionsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="flex flex-col items-end gap-4 mb-4"
              >
                <button
                  onClick={() => { setIsAddDialogOpen(true); setIsQuickActionsOpen(false); }}
                  className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  <span className="font-black text-[9px] uppercase tracking-widest text-slate-900">Log Expense</span>
                  <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                    <Receipt className="h-5 w-5" />
                  </div>
                </button>
                <button
                  onClick={() => { /* Logic to trigger Itinerary Add activity? Or just navigat? */ }}
                  className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  <span className="font-black text-[9px] uppercase tracking-widest text-slate-900">New Activity</span>
                  <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                    <Calendar className="h-5 w-5" />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-90 border border-slate-200",
              isQuickActionsOpen ? "bg-slate-800 rotate-45" : "bg-slate-900"
            )}
          >
            <Plus className="h-8 w-8" />
          </button>
        </div>
      </main>

      {/* Modals & Dialogs */}
      <AnimatePresence>
        {isAddMemberOpen && <AddMemberModal tripId={id} existingMemberIds={(trip.members || []).map((m: any) => m.userId)} onClose={() => setIsAddMemberOpen(false)} />}
        
        {/* Quick Add Expense Dialog */}
        {isAddExpenseOpen && (
          <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-2xl max-w-md text-slate-900">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900">Add Expense</DialogTitle>
                <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Register an expense to the trip expenses.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</Label>
                  <Input 
                    value={newExpense.description} 
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})} 
                    className="rounded-2xl bg-slate-50 border-slate-200 h-12 px-5 font-bold text-slate-900 placeholder:text-slate-400 focus:border-slate-900" 
                    placeholder="e.g. Dinner, Tickets..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount (₹)</Label>
                    <Input 
                      type="number"
                      value={newExpense.amount} 
                      onChange={e => setNewExpense({...newExpense, amount: e.target.value})} 
                      className="rounded-2xl bg-slate-50 border-slate-200 h-12 px-5 font-black text-lg text-slate-900" 
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</Label>
                    <Select value={newExpense.category} onValueChange={v => setNewExpense({...newExpense, category: v})}>
                      <SelectTrigger className="rounded-2xl bg-slate-50 border-slate-200 h-12 px-5 font-bold text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-2xl font-bold text-slate-900">
                        {["Transport", "Food", "Accommodation", "Activities", "Others"].map(c => (
                          <SelectItem key={c} value={c} className="focus:bg-slate-50">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddExpense} disabled={createExpenseMutation.isPending} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white shadow-xl">
                  {createExpenseMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Add Expense"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {isEditing && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl rounded-[3rem] bg-white p-10 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-100 text-slate-900">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Edit Trip Details</h2>
                <button onClick={() => setIsEditing(false)} className="h-12 w-12 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors border border-slate-200 shadow-sm"><X className="h-6 w-6 text-slate-900" /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Destination</label>
                      <Input value={editForm.destination} readOnly className="rounded-2xl bg-slate-50 border-slate-200 h-14 font-bold text-sm px-6 text-slate-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Arrival Date & Time</label>
                      <input type="datetime-local" value={editForm.targetArrivalTime} onChange={(e) => setEditForm(prev => ({ ...prev, targetArrivalTime: e.target.value }))} className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-slate-200 font-bold text-sm text-slate-900 focus:border-slate-900 outline-none transition-all" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Trip Status</label>
                      <select value={editForm.status} onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))} className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-slate-200 font-black text-xs uppercase tracking-widest text-slate-900 focus:border-slate-900 outline-none appearance-none cursor-pointer">
                        <option value="UPCOMING">📅 UPCOMING</option>
                        <option value="LIVE">🚀 LIVE</option>
                        <option value="COMPLETED">✅ COMPLETED</option>
                      </select>
                    </div>
                    <Button type="submit" disabled={isUpdating} className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] bg-slate-900 hover:bg-slate-800 text-white shadow-xl transition-all">
                        {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
                    </Button>
                  </div>
                  <div className="h-[450px] rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm bg-slate-50">
                    <MapPicker onLocationSelect={handleLocationSelect} initialLat={editForm.destinationLat} initialLng={editForm.destinationLng} initialAddress={editForm.destination} />
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
