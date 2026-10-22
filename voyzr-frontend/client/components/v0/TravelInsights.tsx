import { MapPin, Clock, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"

interface TravelInsightsProps {
  totalTrips: number
  topRegions: { name: string; count: number }[]
  nextTrip: { title: string; date: string; daysUntil: number } | null
}

export function TravelInsights({ totalTrips, topRegions, nextTrip }: TravelInsightsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Total Trips */}
      <Card className="flex items-center gap-4 p-5 border border-white/5 shadow-2xl glass-card rounded-3xl">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-[0_0_15px_rgba(59,130,246,0.4)] text-white">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Journeys</p>
          <p className="text-2xl font-black text-white neon-glow">{totalTrips}</p>
        </div>
      </Card>

      {/* Top Regions */}
      <Card className="p-5 border border-white/5 shadow-2xl glass-card rounded-3xl">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Frequent Routes</p>
        </div>
        <div className="flex flex-col gap-2">
          {topRegions.length > 0 ? topRegions.slice(0, 3).map((region, index) => (
            <div key={region.name} className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
              <span className="text-xs font-bold text-white truncate max-w-[120px]">{region.name}</span>
              <span className="text-[10px] font-black text-indigo-400">{region.count} {region.count === 1 ? 'TRIP' : 'TRIPS'}</span>
            </div>
          )) : (
            <p className="text-xs text-slate-500 italic">No regions recorded yet</p>
          )}
        </div>
      </Card>

      {/* Next Adventure Countdown */}
      <Card className="relative overflow-hidden p-5 border border-white/5 shadow-2xl glass-card rounded-3xl">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent" />
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Departure</p>
        </div>
        {nextTrip ? (
          <div>
            <p className="font-black text-white truncate uppercase text-sm">{nextTrip.title}</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-black text-indigo-400 tracking-tighter neon-glow">{nextTrip.daysUntil}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">days left</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic mt-2">No upcoming adventures</p>
        )}
      </Card>
    </div>
  )
}
