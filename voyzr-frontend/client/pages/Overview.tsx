import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, MapPin, Receipt, TrendingUp, Calendar, Plane, UserPlus, Check, X, Sparkles, Globe } from "lucide-react";
import { useTrips, usePendingInvitations } from "@/hooks/useTrips";
import { useAllExpenses } from "@/hooks/useExpenses";
import { Sidebar } from "@/components/Sidebar";
import { formatDate } from "@/lib/utils";
import { StatCard } from "@/components/v0/StatCard";
import { TravelInsights } from "@/components/v0/TravelInsights";
import { ActivityFeed } from "@/components/v0/ActivityFeed";
import { RadialProgressCard } from "@/components/v0/RadialProgressCard";
import GlobalTripMap from "@/components/GlobalTripMap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

export default function Overview() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { trips: rawTrips, isLoading } = useTrips();
  const { invitations, respondToInvitation } = usePendingInvitations();
  const trips = Array.isArray(rawTrips) ? rawTrips : [];
  const tripIds = useMemo(() => trips.map(t => t.id), [trips]);
  const { data: allExpenses = [] } = useAllExpenses(tripIds);

  const stats = useMemo(() => {
    const activeTrips = trips.filter((t) => t.status === "LIVE").length;
    const upcomingTrips = trips.filter((t) => t.status === "UPCOMING").length;
    const completedTrips = trips.filter((t) => t.status === "COMPLETED").length;
    const totalMembers = trips.reduce((acc, t) => acc + (t.memberCount || 0), 0);
    const totalSpent = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const regionCounts = trips.reduce((acc, trip) => {
      const parts = trip.destination.split(",").map((p) => p.trim());
      const region = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topRegions = Object.entries(regionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const upcomingTripsList = trips
      .filter((t) => t.status === "UPCOMING")
      .sort((a, b) => new Date(a.tripDate).getTime() - new Date(b.tripDate).getTime());

    const nextTrip = upcomingTripsList[0]
      ? {
          title: upcomingTripsList[0].name,
          date: formatDate(upcomingTripsList[0].tripDate),
          daysUntil: Math.max(0, Math.ceil((new Date(upcomingTripsList[0].tripDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
        }
      : null;

    return {
      activeTrips,
      upcomingTrips,
      completedTrips,
      totalMembers,
      totalSpent,
      topRegions,
      nextTrip,
    };
  }, [trips, allExpenses]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-2xl border-2 border-slate-200 border-t-slate-900 animate-spin" />
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preparing Your Journey</div>
            </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900 transition-colors duration-300 overflow-hidden">
      <Sidebar />

      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8 relative z-10 overflow-y-auto h-screen custom-scrollbar">
        {/* Header Section */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
              Trip Overview
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              Welcome back, {authUser?.username || "Explorer"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/create-trip")}
              className="group flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 font-black text-white shadow-xl transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
            >
              <Plane className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              New Trip
            </button>
          </div>
        </header>

        {/* Pending Invitations Section */}
        {invitations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 space-y-4"
          >
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
              <UserPlus className="h-4 w-4" />
              Trip Invitations ({invitations.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-3xl bg-slate-50 p-5 border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-slate-900 font-black border border-slate-200 shadow-sm">
                      {inv.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm uppercase">{inv.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                          <MapPin className="h-3 w-3" /> {inv.destination.split(',')[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondToInvitation({ tripId: String(inv.id), accept: true })}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition-all hover:bg-slate-800 active:scale-95"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => respondToInvitation({ tripId: String(inv.id), accept: false })}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 transition-all hover:bg-slate-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-8">
          <StatCard label="Total Trips" value={trips.length} color="slate" />
          <RadialProgressCard 
            label="Live Now" 
            current={stats.activeTrips} 
            total={trips.length} 
            color="bg-slate-900" 
            icon={Plane}
            suffix="Active"
          />
          <RadialProgressCard 
            label="Upcoming" 
            current={stats.upcomingTrips} 
            total={trips.length} 
            color="bg-slate-600" 
            icon={Calendar}
            suffix="Planned"
          />
          <RadialProgressCard 
            label="Completed" 
            current={stats.completedTrips} 
            total={trips.length} 
            color="bg-slate-400" 
            icon={Check}
            suffix="Finished"
          />
        </div>

        {/* Travel Insights */}
        <div className="mb-8">
          <TravelInsights
            totalTrips={trips.length}
            topRegions={stats.topRegions}
            nextTrip={stats.nextTrip}
          />
        </div>

        {/* Summary + Activity Feed */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Interactive Map Grid */}
            <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Travel Map</h2>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <Globe className="h-3.5 w-3.5 text-slate-600" />
                  <span className="text-[9px] font-black text-slate-700 uppercase">{stats.topRegions.length} Regions Explored</span>
                </div>
              </div>
              <GlobalTripMap trips={trips} />
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-8">
                <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-5 border border-slate-100 transition-all hover:bg-white hover:scale-[1.02] shadow-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Users className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter">{stats.totalMembers}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Travel Buddies</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-5 border border-slate-100 transition-all hover:bg-white hover:scale-[1.02] shadow-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Receipt className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter">₹{stats.totalSpent.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Expenses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Itinerary Preview */}
            <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Upcoming Trips</h2>
                    <Plane className="h-4 w-4 text-slate-400" />
                </div>
                <div className="space-y-4">
                {trips.filter(t => t.status === 'UPCOMING').slice(0, 3).map((trip) => (
                    <div
                        key={trip.id}
                        className="flex items-center gap-5 rounded-3xl border border-slate-100 bg-slate-50 p-5 transition-all hover:scale-[1.01]"
                    >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-900 border border-slate-100 shadow-sm">
                            <Plane className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 truncate uppercase text-sm tracking-tight">{trip.name}</p>
                            <p className="text-[10px] font-black text-slate-500 truncate uppercase tracking-widest mt-0.5">
                                {trip.destination}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5 text-[9px] font-black uppercase text-slate-900 tracking-widest">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(trip.tripDate)}</span>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-[0.1em] bg-white px-2 py-1 rounded-lg border border-slate-100">
                                In {Math.max(0, Math.ceil((new Date(trip.tripDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                            </p>
                        </div>
                    </div>
                ))}
                {trips.filter(t => t.status === 'UPCOMING').length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-4 uppercase tracking-widest font-black">No upcoming trips planned.</p>
                )}
                </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
