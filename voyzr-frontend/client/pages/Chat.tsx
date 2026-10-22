import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useTrips } from "@/hooks/useTrips";
import { useChat } from "@/hooks/useChat";
import type { Trip, ChatMessage, User as UserType, TripMember } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Send, MessageCircle, Sparkles, Search, Loader2, Bot, Image as ImageIcon, MapPin, 
  Clock, CheckCircle2, Pin, Settings, Plus, X, Globe, Trash2,
  BarChart3, Paperclip, ShieldAlert, ShieldCheck, Camera, CheckCheck, ChevronLeft, ChevronRight, Map,
  ChevronDown, Maximize2, Heart, ThumbsUp, Laugh
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { getInitials, cn } from "@/lib/utils";
import { useTripExpenses } from "@/hooks/useExpenses";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import { chatApi, tripApi } from "@/services/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/AuthProvider";

// ── Typing indicator dots animation ─────────────────────────────────────────
function TypingIndicator({ users }: { users: string[] }) {
  const text = users.length === 1 
    ? `${users[0]} is typing...` 
    : users.length === 2 
      ? `${users[0]} and ${users[1]} are typing...`
      : "Several people are typing...";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex flex-col justify-start mb-4 ml-12">
      <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm inline-flex items-center gap-3 w-fit">
        <div className="flex items-center gap-1.5">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div key={i} className="h-1 w-1 rounded-full bg-slate-400" animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.1, 0.8] }} transition={{ repeat: Infinity, duration: 1, delay, ease: "easeInOut" }} />
          ))}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{text}</span>
      </div>
    </motion.div>
  );
}

// ── Main Chat Component ───────────────────────────────────────────────────
export default function Chat() {
  const { user: authUser } = useAuth();
  const { trips, isLoading: isLoadingTrips, refetch: refetchTrips } = useTrips();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", "", ""]);
  
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [editTripName, setEditTripName] = useState("");
  const [editTripDestination, setEditTripDestination] = useState("");

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user location for AI context
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/places/geocode?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features[0]) {
              const props = data.features[0].properties;
              const city = props.city || props.town || props.village;
              const country = props.country;
              if (city && country) setUserLocation(`${city}, ${country}`);
              else setUserLocation(props.formatted || `lat:${latitude.toFixed(2)}, lng:${longitude.toFixed(2)}`);
            }
          }
        } catch (e) { console.warn("Chat location geocode failed", e); }
      }, () => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setUserLocation(`Timezone: ${tz}`);
      });
    }
  }, []);

  const CURRENT_USER = {
    senderName: authUser?.username || "Anonymous",
    senderEmail: authUser?.email || "anon@voyzr.com",
  };

  const { messages, isConnected, sendMessage, sendTypingStatus, isAiTyping, typingUsers } =
    useChat(selectedTrip?.id ?? null, {
      ...CURRENT_USER,
      tripName: selectedTrip?.name,
      destination: selectedTrip?.destination,
      userLocation: userLocation
    });

  useEffect(() => {
    if (selectedTrip) {
      setEditTripName(selectedTrip.name);
      setEditTripDestination(selectedTrip.destination);
    }
  }, [selectedTrip]);

  useEffect(() => {
    if (scrollRef.current) {
      const isAtBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop <= scrollRef.current.clientHeight + 100;
      if (isAtBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        setUnreadCount(0);
      } else {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages, isAiTyping]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 200;
    setShowScrollButton(!isNearBottom);
    if (isNearBottom) setUnreadCount(0);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setUnreadCount(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 2000);
  };

  const [selectedPersona, setSelectedPersona] = useState("default");
  const [intelDialog, setIntelDialog] = useState<{ open: boolean, title: string, content: string, loading: boolean }>({
    open: false, title: "", content: "", loading: false
  });

  const handleFetchDeepIntel = async (name: string) => {
    setIntelDialog({ open: true, title: name, content: "", loading: true });
    try {
      const res = await fetch(`/api/places/wikipedia-summary?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setIntelDialog(prev => ({ ...prev, content: data.summary, loading: false }));
      } else {
        throw new Error("Fetch failed");
      }
    } catch (err) {
      setIntelDialog(prev => ({ ...prev, content: "Intelligence gathering failed. Wikipedia may not have a record for this specific coordinate name.", loading: false }));
    }
  };
  
  const PERSONAS = [
    { id: "default", name: "Standard AI", icon: <Bot className="h-3 w-3" />, desc: "Helpful travel assistant" },
    { id: "historian", name: "Historian", icon: <ShieldCheck className="h-3 w-3" />, desc: "Facts & Culture" },
    { id: "budget", name: "Budget Buddy", icon: <ThumbsUp className="h-3 w-3" />, desc: "Deals & Savings" },
    { id: "adventurer", name: "Adventurer", icon: <Globe className="h-3 w-3" />, desc: "Hidden Gems & Thrills" }
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !isConnected) return;
    
    // Auto-prefix with persona if selected
    let finalMessage = inputValue;
    if (selectedPersona !== "default" && !inputValue.startsWith("@bot:")) {
      finalMessage = `@bot:${selectedPersona} ${inputValue}`;
    }
    
    sendMessage(finalMessage);
    setInputValue("");
    setIsTyping(false);
    sendTypingStatus(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleAddSideQuest = async (place: any) => {
    if (!selectedTrip) return;
    try {
      await tripApi.addSideQuest(String(selectedTrip.id), {
        title: place.name,
        location: place.address || place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        status: 'PENDING',
        priority: 'MEDIUM',
        description: `Recommended by Voyzr AI (${selectedPersona} persona)`
      });
      toast.success(`${place.name} added to trip!`);
    } catch (err) {
      console.error("Failed to add side quest:", err);
      toast.error("Failed to add to itinerary");
    }
  };

  const handleReact = async (messageId: string | undefined | null, emoji: string) => {
    if (!messageId || messageId === 'null') return;
    try {
      await chatApi.react(messageId, emoji, CURRENT_USER.senderEmail);
    } catch (err) {
      console.error("Reaction failed:", err);
    }
  };

  const formatDateHeader = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const handleVote = async (messageId: string | undefined | null, optionIndex: number) => {
    if (!messageId || messageId === 'null') return;
    try {
      await chatApi.vote(messageId, optionIndex, CURRENT_USER.senderEmail);
    } catch (err) {
      console.error("Vote failed:", err);
      toast.error("Failed to register vote");
    }
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        sendMessage("My Current Location", "LOCATION", undefined, {
          latitude,
          longitude,
          address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`
        });
      }, () => {
        toast.error("Unable to retrieve location");
      });
    }
  };

  const handleUpdateTrip = async () => {
    if (!selectedTrip) return;
    try {
      await tripApi.updateTrip(String(selectedTrip.id), {
        name: editTripName,
        destination: editTripDestination
      });
      toast.success("Trip updated successfully");
      refetchTrips();
    } catch (err) {
      toast.error("Failed to update trip");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTrip) return;
    try {
      await tripApi.removeMember(String(selectedTrip.id), userId);
      toast.success("Member removed");
      refreshSelectedTrip();
    } catch (err) {
      toast.error("Failed to remove member");
    }
  };

  const handleToggleAdmin = async (member: TripMember) => {
    if (!selectedTrip) return;
    const newRole = member.role === 'CO_ADMIN' ? 'MEMBER' : 'CO_ADMIN';
    try {
      await tripApi.updateMemberRole(String(selectedTrip.id), String(member.userId), newRole);
      toast.success(`${member.userName} is now ${newRole === 'CO_ADMIN' ? 'a co-admin' : 'a member'}`);
      refreshSelectedTrip();
    } catch (err) {
      toast.error("Failed to update role");
    }
  };

  const refreshSelectedTrip = async () => {
    if (!selectedTrip) return;
    try {
      const refreshedTrip: any = await tripApi.getTrip(String(selectedTrip.id));
      if (refreshedTrip && refreshedTrip.data) {
        setSelectedTrip(refreshedTrip.data);
      }
    } catch (err) {
      console.error("Failed to refresh trip data", err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        sendMessage("Shared a photo", "IMAGE", compressedBase64);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleGroupPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTrip) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await tripApi.updateTripImage(String(selectedTrip.id), base64String);
        toast.success("Group photo updated");
        refreshSelectedTrip();
        refetchTrips();
      } catch (err) {
        toast.error("Failed to update group photo");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setInputValue("");
  };

  const filteredTrips = trips.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDestinationTime = () => {
    const now = new Date();
    if (selectedTrip?.destination.toLowerCase().includes("paris") || selectedTrip?.destination.toLowerCase().includes("europe")) {
      return now.toLocaleTimeString('en-US', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }) + " (CET)";
    }
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " (Local)";
  };

  const isOrganizer = selectedTrip?.members?.find(m => String(m.userId) === String(authUser?.id))?.role === 'ORGANIZER';
  const isCoAdmin = selectedTrip?.members?.find(m => String(m.userId) === String(authUser?.id))?.role === 'CO_ADMIN';
  const canManageGroup = isOrganizer || isCoAdmin;

  return (
    <div className="flex h-screen bg-white text-slate-900 transition-colors duration-300 overflow-hidden font-sans relative">
      <Sidebar />
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      <input type="file" ref={groupPhotoInputRef} onChange={handleGroupPhotoUpload} accept="image/*" className="hidden" />

      <main className="md:ml-64 flex flex-1 overflow-hidden relative z-10 pb-[72px] md:pb-0">
        {/* ── Trips List Sidebar ── */}
        <div className={cn(
          "w-full md:w-80 border-r border-slate-100 bg-slate-50 flex-col shrink-0 z-10",
          selectedTrip ? "hidden md:flex" : "flex"
        )}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Globe className="h-5 w-5 text-slate-900" /> Trip Chats
              </h2>
              <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-widest bg-white text-slate-500 border-slate-200">{trips.length} Active</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-white border-slate-200 rounded-2xl h-12 text-sm font-medium focus-visible:ring-slate-200 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-3">
            {isLoadingTrips ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</span>
              </div>
            ) : (
              <div className="pb-6 space-y-1.5">
                {filteredTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip)}
                    className={`w-full text-left p-4 rounded-[1.5rem] transition-all group ${selectedTrip?.id === trip.id
                      ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                      : "hover:bg-white text-slate-500"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0 border-2 border-slate-100 shadow-sm">
                        <AvatarImage src={trip.imageUrl} />
                        <AvatarFallback className={selectedTrip?.id === trip.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-900"}>
                          {getInitials(trip.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="font-black truncate pr-2 tracking-tight text-xs uppercase block">{trip.name}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className={`h-2.5 w-2.5 ${selectedTrip?.id === trip.id ? "text-white/60" : "text-slate-400"}`} />
                          <p className={`text-[10px] font-bold truncate ${selectedTrip?.id === trip.id ? "text-white/80" : "text-slate-500"}`}>
                            {trip.destination}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ── Chat Area ── */}
        <div className={cn(
          "flex-1 flex-col bg-white relative",
          !selectedTrip ? "hidden md:flex" : "flex"
        )}>
          {selectedTrip ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-4 flex items-center justify-between z-20 shadow-sm sticky top-0 transition-all">
                <div className="flex items-center gap-2 md:gap-4 flex-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden shrink-0 -ml-2" 
                    onClick={() => handleSelectTrip(null)}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <div 
                    className="flex items-center gap-2 md:gap-4 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
                    onClick={() => setIsGroupInfoOpen(true)}
                  >
                  <div className="relative">
                    <Avatar className="h-12 w-12 rounded-2xl shadow-sm border-2 border-slate-100">
                      <AvatarImage src={selectedTrip.imageUrl} />
                      <AvatarFallback className="bg-slate-900 text-white font-black">
                        {getInitials(selectedTrip.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 tracking-tighter text-lg uppercase leading-none">{selectedTrip.name}</h3>
                      <Badge className="bg-slate-100 text-slate-900 text-[8px] font-black uppercase px-1.5 h-4 border-slate-200">Live</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-slate-900 shadow-[0_0_8px_rgba(0,0,0,0.2)]" : "bg-slate-300 animate-pulse"}`} />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isConnected ? "Connected" : "Connecting"}</span>
                      <span className="text-slate-200">/</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-900" /> {getDestinationTime()}
                      </span>
                    </div>
                  </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Sheet open={isGroupInfoOpen} onOpenChange={setIsGroupInfoOpen}>
                    <SheetContent 
                      className="w-[400px] p-0 flex flex-col border-l border-slate-100 bg-white shadow-2xl overflow-hidden"
                      overlayClassName="bg-black/20"
                    >
                      {/* Integrated Briefing Header */}
                      <div className="bg-slate-50 p-8 text-slate-900 relative border-b border-slate-100">
                        <SheetHeader className="mb-8 relative z-10">
                          <SheetTitle className="text-slate-900 text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                            <Settings className="h-7 w-7 text-slate-900" /> Trip Details
                          </SheetTitle>
                          <SheetDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                            Trip information and members
                          </SheetDescription>
                        </SheetHeader>
                        
                        <div className="space-y-5 relative z-10">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Trip Name</label>
                            <div className="relative">
                               <Input 
                                 value={editTripName} 
                                 onChange={e => setEditTripName(e.target.value)} 
                                 disabled={!canManageGroup} 
                                 className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl focus:bg-slate-50 transition-all font-bold" 
                               />
                               <Pin className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Destination</label>
                            <div className="relative">
                               <Input 
                                 value={editTripDestination} 
                                 onChange={e => setEditTripDestination(e.target.value)} 
                                 disabled={!canManageGroup} 
                                 className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl focus:bg-slate-50 transition-all font-bold" 
                               />
                               <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                            </div>
                          </div>
                          {canManageGroup && (
                            <Button 
                              onClick={handleUpdateTrip} 
                              className="w-full h-12 rounded-xl font-black uppercase tracking-[0.15em] bg-slate-900 hover:bg-slate-800 text-white text-[10px] shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                            >
                              Update Trip
                            </Button>
                          )}
                        </div>
                      </div>

                      <ScrollArea className="flex-1 px-8 pt-8 pb-12">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trip Members</h4>
                            <Badge variant="outline" className="rounded-lg border-slate-100 text-slate-400 font-black text-[9px] uppercase tracking-tighter">
                                {selectedTrip.members?.length || 0} Registered
                            </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          {selectedTrip.members?.map(member => (
                            <div key={member.userId} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 group hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm">
                                  <AvatarImage src={member.avatar} />
                                  <AvatarFallback className="bg-slate-100 text-slate-400 text-[10px] font-black uppercase">{getInitials(member.userName || 'U')}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-black text-slate-900 leading-tight">{member.userName || 'Unknown'}</p>
                                  <div className="mt-1 flex items-center gap-2">
                                    {member.role === 'ORGANIZER' ? (
                                      <span className="text-[7px] bg-slate-900 text-white px-1.5 py-0.5 rounded-md uppercase font-black tracking-widest">Admin</span>
                                    ) : member.role === 'CO_ADMIN' ? (
                                      <span className="text-[7px] bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded-md uppercase font-black tracking-widest">Co-Admin</span>
                                    ) : (
                                      <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest">Traveler</span>
                                    )}
                                    <span className="h-1 w-1 rounded-full bg-slate-200" />
                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">Active</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isOrganizer && member.role !== 'ORGANIZER' && (
                                  <Button variant="ghost" size="icon" onClick={() => handleToggleAdmin(member)} className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200">
                                    {member.role === 'CO_ADMIN' ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                  </Button>
                                )}
                                {canManageGroup && member.role !== 'ORGANIZER' && member.userId !== authUser?.id && (
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(String(member.userId))} className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-12 p-6 rounded-3xl bg-slate-50 border border-slate-100 text-slate-900 flex items-center justify-between overflow-hidden relative group cursor-pointer" onClick={() => groupPhotoInputRef.current?.click()}>
                           <div className="absolute inset-0 bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <div className="relative z-10">
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Trip Photo</h5>
                              <p className="text-xs font-bold text-slate-600">Update workspace cover photo</p>
                           </div>
                           <Camera className="h-5 w-5 text-slate-400 relative z-10 transition-transform group-hover:scale-110" />
                        </div>
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <ScrollArea className="flex-1 p-6" viewportRef={scrollRef} onScroll={handleScroll}>
                  <div className="space-y-1 max-w-4xl mx-auto pb-12">
                    {messages.length === 0 && !isAiTyping && (
                      <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="h-20 w-20 bg-slate-50 rounded-[2rem] shadow-sm flex items-center justify-center mb-6 border border-slate-100">
                          <MessageCircle className="h-8 w-8 text-slate-300" />
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic opacity-10">Start a conversation</h4>
                      </div>
                    )}
                    <AnimatePresence initial={false}>
                      {messages.map((msg, idx) => {
                        const isMe = msg.senderEmail === CURRENT_USER.senderEmail;
                        const isAi = msg.isAi || msg.senderName === 'Voyzr AI';
                        
                        // Date Header logic
                        const showDateHeader = idx === 0 || 
                          new Date(messages[idx-1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();

                        // Check grouping logic for tails
                        const prevMsg = messages[idx - 1];
                        const nextMsg = messages[idx + 1];
                        const isFirstInGroup = !prevMsg || prevMsg.senderEmail !== msg.senderEmail || showDateHeader;
                        const isLastInGroup = !nextMsg || nextMsg.senderEmail !== msg.senderEmail || 
                          (nextMsg && new Date(nextMsg.timestamp).toDateString() !== new Date(msg.timestamp).toDateString());
                        const member = selectedTrip.members?.find(m => m.userEmail === msg.senderEmail);
                        
                        return (
                          <React.Fragment key={msg.id || idx}>
                            {showDateHeader && (
                              <div className="flex justify-center my-8 sticky top-0 z-10">
                                <span className="bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 shadow-sm">
                                  {formatDateHeader(msg.timestamp)}
                                </span>
                              </div>
                            )}
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              className={cn(
                                "flex group/msg w-full",
                                isMe ? "justify-end" : "justify-start",
                                isFirstInGroup ? "mt-6" : "mt-1"
                              )}
                            >
                              <div className={cn(
                                "flex gap-3 max-w-[80%] items-end",
                                isMe ? "flex-row-reverse" : "flex-row"
                              )}>
                                {/* Avatar - only show for first message in group */}
                                <div className="w-8 shrink-0">
                                  {!isMe && isFirstInGroup && (
                                    <Avatar className={cn(
                                      "h-8 w-8 shadow-sm border border-slate-100",
                                      isAi ? "bg-slate-900" : "bg-slate-200"
                                    )}>
                                      <AvatarImage src={member?.avatar} />
                                      <AvatarFallback className={cn("text-[10px] font-black", isAi ? "text-white" : "text-slate-500")}>
                                        {isAi ? <Bot className="h-4 w-4" /> : getInitials(msg.senderName)}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>

                                <div className={cn(
                                  "flex flex-col relative",
                                  isMe ? "items-end" : "items-start"
                                )}>
                                  {/* Name - only show for first message in group */}
                                  {!isMe && isFirstInGroup && !isAi && (
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                                      {msg.senderName}
                                      {member?.role === 'ORGANIZER' && <span className="ml-2 text-[8px] text-slate-900 bg-slate-100 px-1 rounded uppercase tracking-tighter font-black">Admin</span>}
                                    </span>
                                  )}

                                  {/* Message Bubble */}
                                  <div className={cn(
                                    "relative shadow-sm transition-all group-hover/msg:shadow-md",
                                    isAi ? "bg-slate-50 text-slate-900 rounded-3xl rounded-tl-sm p-0 overflow-hidden border border-slate-200" : 
                                    isMe 
                                      ? "bg-slate-900 text-white rounded-[1.5rem]" 
                                      : "bg-slate-100 border border-slate-100 text-slate-800 rounded-[1.5rem]",
                                    isMe && isFirstInGroup && "rounded-tr-sm",
                                    !isMe && isFirstInGroup && "rounded-tl-sm"
                                  )}>
                                    
                                    {/* WhatsApp Style Tails */}
                                    {isFirstInGroup && (
                                      <div className={cn(
                                        "absolute top-0 w-3 h-3",
                                        isMe 
                                          ? "-right-1.5 bg-slate-900 rounded-bl-full" 
                                          : "-left-1.5 bg-slate-100 border-l border-t border-slate-100 rounded-br-full",
                                        isAi && "bg-slate-50 border-slate-200"
                                      )} style={{ clipPath: isMe ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(0 0, 100% 0, 100% 100%)" }} />
                                    )}

                                    {msg.type === 'IMAGE' && msg.imageUrl && (
                                      <div className="p-1.5 relative group/img">
                                        <img 
                                          src={msg.imageUrl} 
                                          alt="Shared" 
                                          className="rounded-2xl max-w-sm w-full object-cover max-h-80 shadow-sm cursor-pointer hover:opacity-95 transition-opacity" 
                                          onClick={() => setLightboxImage(msg.imageUrl || null)}
                                        />
                                        <Button 
                                          variant="secondary" 
                                          size="icon" 
                                          className="absolute top-4 right-4 h-8 w-8 rounded-xl opacity-0 group-hover/img:opacity-100 transition-opacity bg-white/20 backdrop-blur-md text-white border-white/20"
                                          onClick={() => setLightboxImage(msg.imageUrl || null)}
                                        >
                                          <Maximize2 className="h-4 w-4" />
                                        </Button>
                                        {msg.content && <p className="px-4 py-3 text-[14px] font-bold leading-tight">{msg.content}</p>}
                                      </div>
                                    )}

                                    {msg.type === 'LOCATION' && msg.metadata && (
                                      <div className="w-72 bg-white text-slate-900 rounded-2xl overflow-hidden border border-slate-200">
                                        <div className="h-32 bg-slate-50 flex items-center justify-center relative">
                                          <MapPin className="h-8 w-8 text-slate-900 relative z-10" />
                                          <div className="absolute inset-0 bg-slate-900/5" />
                                        </div>
                                        <div className="p-4">
                                          <h4 className="font-black text-xs text-slate-900 uppercase tracking-tight">Shared Location</h4>
                                          <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-widest">{msg.metadata.address}</p>
                                          <Button size="sm" className="w-full mt-4 h-8 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95" onClick={() => window.open(`https://www.google.com/maps?q=${msg.metadata?.latitude},${msg.metadata?.longitude}`, '_blank')}>Track</Button>
                                        </div>
                                      </div>
                                    )}

                                    {msg.type === 'POLL' && (
                                      <div className={cn("p-6 w-80", isMe ? "bg-slate-900 text-white" : "bg-white text-slate-900 border border-slate-100")}>
                                        <h4 className="font-black text-lg mb-6 leading-tight tracking-tighter uppercase italic">{msg.content}</h4>
                                        <div className="space-y-2">
                                          {(msg.metadata?.options || []).map((opt: any, i: number) => {
                                            const hasVoted = opt.voters?.includes(CURRENT_USER.senderEmail);
                                            const voteCount = opt.voters?.length || 0;
                                            const totalVotes = (msg.metadata.options as any[]).reduce((sum, o) => sum + (o.voters?.length || 0), 0);
                                            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                            return (
                                              <button key={i} onClick={() => handleVote(msg.id!, i)} className={cn(
                                                "w-full relative overflow-hidden flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                                                hasVoted ? "bg-slate-100 border-slate-200 text-slate-900" : isMe ? "bg-white/10 border-white/10 text-white" : "bg-slate-50 border-slate-100 text-slate-600"
                                              )}>
                                                <div className="absolute left-0 top-0 h-full opacity-20 bg-slate-400" style={{ width: `${percentage}%` }} />
                                                <span className="relative z-10 font-black uppercase text-[11px] tracking-widest">{opt.text}</span>
                                                <div className="relative z-10 flex items-center gap-2">
                                                  <span className="text-[10px] font-black opacity-60">{percentage}%</span>
                                                  <div className="h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-black bg-slate-100">{voteCount}</div>
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {msg.type === 'PLACE_CARD' && msg.metadata && (
                                      <div className="w-80 bg-white text-slate-900 rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm">
                                        <div className="h-44 relative group/place">
                                          <img src={msg.metadata.photoUrl} alt={msg.metadata.name} className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                          <Badge className="absolute top-3 right-3 bg-white/90 text-slate-900 border-none font-black text-[10px]">
                                            ⭐ {msg.metadata.rating || '4.5'}
                                          </Badge>
                                          <div className="absolute bottom-4 left-4 right-4 text-white">
                                            <h4 className="font-black text-sm uppercase tracking-tight leading-none">{msg.metadata.name}</h4>
                                            <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest mt-1 truncate">{msg.metadata.address}</p>
                                          </div>
                                        </div>
                                        <div className="p-4 bg-slate-50/50">
                                          <div className="flex gap-2">
                                            <Button 
                                              size="sm" 
                                              variant="outline"
                                              className="flex-1 h-10 rounded-xl border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
                                              onClick={() => window.open(`https://www.google.com/maps?q=${msg.metadata?.latitude},${msg.metadata?.longitude}`, '_blank')}
                                            >
                                              <MapPin className="h-3.5 w-3.5 mr-2" /> View Map
                                            </Button>
                                            <Button 
                                              size="sm" 
                                              className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-200"
                                              onClick={() => handleAddSideQuest(msg.metadata)}
                                            >
                                              <Plus className="h-3.5 w-3.5 mr-2" /> Add to Trip
                                            </Button>
                                          </div>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="w-full mt-2 h-8 rounded-lg text-slate-400 hover:text-slate-900 font-black uppercase text-[8px] tracking-widest border border-slate-50 hover:bg-slate-50"
                                            onClick={() => handleFetchDeepIntel(msg.metadata.name)}
                                          >
                                            <Sparkles className="h-3 w-3 mr-2" /> Deep Intel (Wikipedia)
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    {(!msg.type || msg.type === 'TEXT') && (
                                      <div className="px-5 py-3.5 min-w-[60px]">
                                        <p className="text-[14px] whitespace-pre-wrap leading-relaxed font-bold tracking-tight">{msg.content}</p>
                                      </div>
                                    )}

                                    {/* Timestamp + Checkmarks */}
                                    <div className={cn(
                                      "px-4 pb-2 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 opacity-40 justify-end",
                                      isMe ? "text-white/60" : "text-slate-500"
                                    )}>
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      {isMe && (
                                        <div className="flex items-center ml-1">
                                          {msg.isPending ? (
                                            <Clock className="h-3 w-3 text-white/70" />
                                          ) : (
                                            <CheckCheck className="h-3 w-3 text-white" />
                                          )}
                                        </div>
                                      )}
                                      </div>
                                    {/* Reaction Display */}
                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                      <div className={cn(
                                        "absolute -bottom-3 flex items-center gap-1",
                                        isMe ? "right-2" : "left-2"
                                      )}>
                                        {Object.entries(msg.reactions).map(([emoji, voters]) => (
                                          <button
                                            key={emoji}
                                            onClick={() => handleReact(msg.id!, emoji)}
                                            className={cn(
                                              "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white border border-slate-100 shadow-sm hover:scale-110 transition-transform",
                                              voters.includes(CURRENT_USER.senderEmail) ? "border-slate-900 bg-slate-50" : ""
                                            )}
                                          >
                                            <span>{emoji}</span>
                                            <span className="text-slate-500">{voters.length}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    {/* Reaction Picker (Hover) */}
                                    <div className={cn(
                                      "absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-slate-100 rounded-full p-1 shadow-lg z-10",
                                      isMe ? "-left-20" : "-right-20"
                                    )}>
                                      {['👍', '❤️', '😂', '🔥'].map(emoji => (
                                        <button 
                                          key={emoji}
                                          onClick={() => handleReact(msg.id!, emoji)}
                                          className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-slate-50 text-sm active:scale-125 transition-all"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </React.Fragment>
                        );
                      })}
                    </AnimatePresence>
                    {(isAiTyping || typingUsers.length > 0) && <TypingIndicator users={isAiTyping ? ['Voyzr AI', ...typingUsers] : typingUsers} />}
                  </div>
                </ScrollArea>

                {/* Scroll to Bottom Button */}
                <AnimatePresence>
                  {showScrollButton && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      onClick={scrollToBottom}
                      className="absolute bottom-6 right-6 h-12 w-12 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-center group z-30 overflow-visible"
                    >
                      <ChevronDown className="h-6 w-6 group-hover:translate-y-0.5 transition-transform" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center border-2 border-white">
                          {unreadCount}
                        </span>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Image Lightbox */}
                <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
                  <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/90 border-none">
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      <img src={lightboxImage || ''} alt="Full screen" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-4 right-4 text-white hover:bg-white/10"
                      >
                        <X className="h-6 w-6" />
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-slate-100 sticky bottom-0 z-20">
                <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-6xl mx-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-full text-slate-400 hover:bg-slate-50"><Paperclip className="h-6 w-6" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-56 rounded-[2rem] p-2 bg-white border border-slate-100 shadow-2xl mb-2">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="rounded-2xl p-3 flex items-center gap-4 cursor-pointer focus:bg-slate-50 group">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 shadow-sm"><ImageIcon className="h-5 w-5" /></div>
                        <span className="font-black text-[10px] uppercase tracking-widest text-slate-600">Send Photo</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsPollModalOpen(true)} className="rounded-2xl p-3 flex items-center gap-4 cursor-pointer focus:bg-slate-50 group">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 shadow-sm"><BarChart3 className="h-5 w-5" /></div>
                        <span className="font-black text-[10px] uppercase tracking-widest text-slate-600">Create Poll</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShareLocation} className="rounded-2xl p-3 flex items-center gap-4 cursor-pointer focus:bg-slate-50 group">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 shadow-sm"><MapPin className="h-5 w-5" /></div>
                        <span className="font-black text-[10px] uppercase tracking-widest text-slate-600">Share Location</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" className={cn(
                        "h-12 px-4 rounded-3xl gap-2 font-black uppercase tracking-widest text-[10px] border border-slate-100 shadow-sm transition-all",
                        selectedPersona !== "default" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 hover:bg-slate-50"
                      )}>
                        {PERSONAS.find(p => p.id === selectedPersona)?.icon}
                        <span className="hidden sm:inline">{PERSONAS.find(p => p.id === selectedPersona)?.name}</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-64 rounded-[2rem] p-2 bg-white border border-slate-100 shadow-2xl mb-2">
                      <div className="px-4 py-3 border-b border-slate-50 mb-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Select AI Persona</h4>
                      </div>
                      {PERSONAS.map(p => (
                        <DropdownMenuItem 
                          key={p.id} 
                          onClick={() => setSelectedPersona(p.id)} 
                          className={cn(
                            "rounded-2xl p-3 flex items-center gap-4 cursor-pointer focus:bg-slate-50 group transition-all",
                            selectedPersona === p.id && "bg-slate-50 border border-slate-100 shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm transition-colors",
                            selectedPersona === p.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-900"
                          )}>
                            {p.icon}
                          </div>
                          <div>
                            <p className="font-black text-[10px] uppercase tracking-widest text-slate-900">{p.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{p.desc}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex-1 bg-slate-50 rounded-[2rem] border border-slate-200 shadow-inner focus-within:bg-white focus-within:border-slate-300 transition-all">
                    <textarea 
                      value={inputValue} 
                      onChange={handleInputChange} 
                      placeholder="Type a message..." 
                      rows={1} 
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }} 
                      className="w-full px-6 py-3 bg-transparent border-none focus:ring-0 text-[15px] font-black tracking-tight resize-none placeholder:text-slate-400 text-slate-900" 
                    />
                  </div>
                  <Button type="submit" disabled={!isConnected || !inputValue.trim()} className="h-12 w-12 rounded-full p-0 bg-slate-900 shadow-lg hover:scale-105 transition-transform"><Send className="h-5 w-5 text-white" /></Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
              <div className="h-24 w-24 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-sm flex items-center justify-center mb-8">
                <Globe className="h-10 w-10 text-slate-300 animate-pulse" />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tighter italic text-slate-900">Select a Chat</h3>
            </div>
          )}
        </div>
      </main>

      <Dialog open={intelDialog.open} onOpenChange={(open) => setIntelDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-lg rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            </div>
            <div className="flex items-center gap-3 mb-2 relative z-10">
              <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-amber-400" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Deep Intelligence</h4>
            </div>
            <h3 className="text-3xl font-black tracking-tighter uppercase italic relative z-10">{intelDialog.title}</h3>
          </div>
          <div className="p-8 bg-white">
            {intelDialog.loading ? (
              <div className="flex flex-col items-center py-12 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scouring global records...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  {intelDialog.content}
                </p>
                <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Source: Wikipedia Encyclopedia</span>
                  <Button 
                    onClick={() => setIntelDialog(prev => ({ ...prev, open: false }))}
                    className="h-10 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-6"
                  >
                    Acknowledged
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
