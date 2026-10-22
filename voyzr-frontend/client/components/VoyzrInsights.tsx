import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Map, 
  Wallet, 
  Calendar, 
  Sparkles, 
  ArrowRight,
  Plane,
  Clock,
  CheckCircle2
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { useTrips } from "@/hooks/useTrips";
import { useAllExpenses } from "@/hooks/useExpenses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function VoyzrInsights() {
  const { trips = [] } = useTrips();
  const tripIds = useMemo(() => trips.map(t => t.id), [trips]);
  const { data: allExpenses = [] } = useAllExpenses(tripIds);

  // ── Stats Calculations ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalSpent = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const completedTrips = trips.filter(t => t.status === "COMPLETED").length;
    const upcomingTrips = trips.filter(t => t.status === "UPCOMING").length;
    const liveTrips = trips.filter(t => t.status === "LIVE").length;
    
    // Estimate "Miles" based on destinations (mock for now, or could use simple lat/lng diff)
    const estimatedMiles = trips.length * 450; 
    
    return {
      totalSpent,
      completedTrips,
      upcomingTrips,
      liveTrips,
      estimatedMiles,
      totalMembers: trips.reduce((sum, t) => sum + (t.memberCount || 0), 0)
    };
  }, [trips, allExpenses]);

  // ── Chart Data ─────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    // Group expenses by month
    const months: Record<string, number> = {};
    allExpenses.forEach(exp => {
      const date = new Date(exp.createdAt);
      const monthYear = date.toLocaleString('default', { month: 'short' });
      months[monthYear] = (months[monthYear] || 0) + exp.amount;
    });

    return Object.entries(months).map(([name, total]) => ({ name, total }));
  }, [allExpenses]);

  // ── AI Suggestions ──────────────────────────────────────────────────────
  const aiTips = [
    {
      title: "Budget Alert",
      desc: "Your spending in 'Summer Beach' is 15% higher than your last trip.",
      icon: Wallet,
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
    {
      title: "Packing Pro",
      desc: "Rain is expected for your Paris trip. Don't forget an umbrella!",
      icon: Sparkles,
      color: "text-blue-500",
      bg: "bg-blue-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
      {/* ── Main Stats Area ────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-3xl border-none shadow-sm bg-indigo-600 text-white overflow-hidden relative group">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Plane className="h-5 w-5" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Distance Traveled</span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black">{stats.estimatedMiles.toLocaleString()}</h3>
                <span className="text-sm font-bold opacity-70 uppercase">KM</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold">
                <TrendingUp className="h-3 w-3" />
                <span>+12% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm bg-white text-slate-900 overflow-hidden border border-slate-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Investment</span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black">${stats.totalSpent.toLocaleString()}</h3>
                <span className="text-sm font-bold text-slate-400 uppercase">USD</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-slate-400">Budget Used</span>
                  <span className="text-emerald-600">64%</span>
                </div>
                <Progress value={64} className="h-1.5 bg-slate-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm bg-white text-slate-900 overflow-hidden border border-slate-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Map className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Cities Explored</span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black">{trips.length}</h3>
                <span className="text-sm font-bold text-slate-400 uppercase">Destinations</span>
              </div>
              <div className="mt-4 flex -space-x-2">
                {[...Array(Math.min(4, stats.totalMembers))].map((_, i) => (
                  <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                {stats.totalMembers > 4 && (
                   <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[10px] font-black text-white">
                    +{stats.totalMembers - 4}
                   </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Spending Chart ────────────────────────────────────────────── */}
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Spending Trend</CardTitle>
              <CardDescription className="text-lg font-black text-slate-900">Monthly Expense Distribution</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold uppercase tracking-widest text-[10px]">Last 6 Months</Badge>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#4f46e5" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                 <Wallet className="h-12 w-12 mb-2 opacity-20" />
                 <p className="text-[10px] font-black uppercase tracking-widest">No spending data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Sidebar Insights ────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* AI Suggestions Card */}
        <Card className="rounded-3xl border-none shadow-lg shadow-indigo-100/50 bg-white overflow-hidden border border-indigo-50">
          <CardHeader className="bg-indigo-600 text-white py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-200 fill-indigo-200" />
              <CardTitle className="text-xs font-black uppercase tracking-widest">Voyzr AI Advisor</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {aiTips.map((tip, i) => (
              <div key={i} className={`p-4 rounded-2xl ${tip.bg} flex gap-4 transition-transform hover:scale-[1.02] cursor-pointer`}>
                <div className={`shrink-0 h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm ${tip.color}`}>
                  <tip.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight">{tip.title}</h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-black transition-colors group">
              Talk to Assistant
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden border border-slate-100">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {[
                { type: 'joined', user: 'Aswin', trip: 'Goa Trip', time: '2h ago', icon: CheckCircle2, color: 'text-emerald-500' },
                { type: 'expense', user: 'Adil', trip: 'Summer Trip', time: '5h ago', icon: Wallet, color: 'text-blue-500' },
                { type: 'upcoming', user: 'Voyzr', trip: 'Paris Trip', time: '1d ago', icon: Clock, color: 'text-amber-500' }
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors border-b last:border-none border-slate-50">
                  <div className={`h-8 w-8 rounded-lg ${activity.color} bg-white flex items-center justify-center shadow-sm border border-slate-100`}>
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">
                      <span className="font-black uppercase">{activity.user}</span> {activity.type === 'joined' ? 'joined' : activity.type === 'expense' ? 'added expense to' : 'reminded about'} <span className="text-indigo-600">{activity.trip}</span>
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
