import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Plus, Sparkles, Plane, Calendar, MapPin, Users, ArrowRight, Wallet, AlertTriangle } from "lucide-react";
import { useTrips } from "@/hooks/useTrips";
import { useAllExpenses } from "@/hooks/useExpenses";
import { TripCard } from "@/components/TripCard";
import { Sidebar } from "@/components/Sidebar";
import { useMemo, useState, useEffect } from "react";

import { tripApi } from "@/services/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { trips: rawTrips, isLoading, error } = useTrips();
  const trips = Array.isArray(rawTrips) ? rawTrips : [];
  const navigate = useNavigate();

  const handleJoinTrip = async () => {
    const code = window.prompt("Enter Trip Invite Code (e.g. TRIP-ABCD1234):");
    if (!code) return;

    try {
      const response = await tripApi.joinByCode(code.trim().toUpperCase());
      toast.success("Join request sent! The organizer will need to approve you.");
      // Invalidate trips query to show the trip (it will show as pending if we implement UI for it)
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to join trip. Check the code.");
    }
  };

  const tripIds = useMemo(() => trips.map(t => t.id), [trips]);
  const { data: allExpenses = [] } = useAllExpenses(tripIds);

  const [aiInsights, setAiInsights] = useState<{title: string, desc: string, type: 'tip' | 'warning'}[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    if (isLoading || trips.length === 0) return;

    setIsGeneratingInsights(true);
    // Simulate AI analyzing data
    const timer = setTimeout(() => {
        const insights: {title: string, desc: string, type: 'tip' | 'warning'}[] = [];
        
        // 1. Expense Analysis
        const activeTrips = trips.filter(t => t.status === 'LIVE' || t.status === 'UPCOMING');
        activeTrips.forEach(trip => {
            const tripExpenses = allExpenses.filter(e => e.tripId === trip.id);
            const totalSpent = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
            
            // Mock budget logic: If spent > $500, trigger warning
            if (totalSpent > 500) {
                insights.push({
                    type: 'warning',
                    title: `Budget Alert: ${trip.name}`,
                    desc: `Current spending ($${totalSpent}) is trending high. Consider reviewing recent expenses to stay on track.`
                });
            }
        });

        // 2. Contextual Suggestions
        const nextTrip = trips.filter(t => t.status === 'UPCOMING')
                             .sort((a, b) => new Date(a.tripDate).getTime() - new Date(b.tripDate).getTime())[0];
                             
        if (nextTrip) {
            insights.push({
                type: 'tip',
                title: `Upcoming: ${nextTrip.destination}`,
                desc: `Based on your itinerary, consider packing layers. Would you like me to generate a complete packing list or find hidden gems nearby?`
            });
        }

        setAiInsights(insights);
        setIsGeneratingInsights(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [trips, allExpenses, isLoading]);

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      <Sidebar />

      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8">
        {/* Header Section */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <Plane className="h-8 w-8 text-slate-900" />
              My Itineraries
            </h1>
            <p className="mt-1 text-slate-500 font-medium italic">Manage and organize your travel adventures</p>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoinTrip}
              className="flex items-center gap-2 rounded-2xl bg-white border-2 border-slate-100 px-8 py-4 font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 text-xs shadow-sm"
            >
              <Users className="h-5 w-5" />
              Join Trip
            </motion.button>
            <Link to="/create-trip">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 font-black uppercase tracking-widest text-white transition-all hover:shadow-xl shadow-slate-900/20 text-xs"
              >
                <Plus className="h-5 w-5" />
                New Adventure
              </motion.button>
            </Link>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-900"
          >
            <p className="font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Connection Error
            </p>
            <p className="mt-1 text-sm font-medium opacity-80">
              {error instanceof Error ? error.message : "Failed to connect to the travel gateway."}
            </p>
          </motion.div>
        )}

        {/* Active Trips Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Active & Upcoming ({trips.filter(t => t.status !== 'COMPLETED').length})</h2>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-80 animate-pulse rounded-[2.5rem] bg-slate-50 border border-slate-100"
                  />
                ))}
              </div>
            ) : trips.length === 0 ? (
              <div className="rounded-[3rem] border-2 border-dashed border-slate-200 bg-white p-24 text-center">
                <div className="mx-auto h-24 w-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-8">
                  <Sparkles className="h-12 w-12 text-slate-200" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                  Your itinerary is empty
                </h3>
                <p className="mt-2 text-slate-500 font-medium max-w-sm mx-auto italic">
                  "The world is a book and those who do not travel read only one page."
                </p>
                <Link to="/create-trip">
                  <button className="mt-10 rounded-2xl bg-slate-900 px-12 py-5 font-black text-white uppercase tracking-widest text-xs transition-all hover:shadow-xl shadow-slate-900/30">
                    Plan Your First Trip
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 pb-12">
                {trips.map((trip, index) => (
                  <TripCard key={trip.id} trip={trip} index={index} />
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Proactive AI Insights */}
        {!isLoading && trips.length > 0 && (
            <div className="mt-6 mb-12 space-y-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" /> Voyzr AI Advisor
                </h2>
                
                {isGeneratingInsights ? (
                    <div className="rounded-[2.5rem] bg-slate-50 p-8 border border-slate-100 flex items-center gap-4 animate-pulse">
                        <div className="h-12 w-12 rounded-full bg-slate-200" />
                        <div className="space-y-2">
                            <div className="h-3 w-48 bg-slate-200 rounded" />
                            <div className="h-2 w-32 bg-slate-200 rounded" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {aiInsights.map((insight, idx) => (
                            <Card key={idx} className={`rounded-[2.5rem] p-8 border border-slate-100 relative overflow-hidden group ${
                                insight.type === 'warning' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                            }`}>
                                <div className="relative z-10 flex flex-col items-start gap-4">
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                                        insight.type === 'warning' ? 'bg-slate-100 text-slate-900' : 'bg-white/20 text-white'
                                    }`}>
                                        {insight.type === 'warning' ? <AlertTriangle className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tight">{insight.title}</h3>
                                        <p className={`mt-1 font-medium text-sm leading-relaxed ${
                                            insight.type === 'warning' ? 'text-slate-500' : 'text-slate-300'
                                        }`}>{insight.desc}</p>
                                    </div>
                                    <Link to="/ai-assistant" state={{ prompt: insight.type === 'warning' ? `Briefly help me analyze my budget for ${insight.title}. Essential advice only.` : `Tell me essential highlights about ${insight.title}. Max 3 points.` }}>
                                        <button className={`mt-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center gap-2 group-hover:gap-3 ${
                                            insight.type === 'warning' ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-white text-slate-900 hover:bg-slate-50'
                                        }`}>
                                            {insight.type === 'warning' ? 'Review Expenses' : 'Ask Assistant'} <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}

// Simple internal card for the Pro Tip
function Card({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={className}>{children}</div>
}
