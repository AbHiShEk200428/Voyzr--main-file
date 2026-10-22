import { UserPlus, Receipt, MapPin, Calendar, MessageSquare, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useTrips, usePendingInvitations } from "@/hooks/useTrips"
import { useAllExpenses } from "@/hooks/useExpenses"
import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"

// Helper to safely parse dates and avoid "Invalid Date" errors
const safeParseDate = (dateVal: any): Date => {
  const d = new Date(dateVal || Date.now());
  return isNaN(d.getTime()) ? new Date() : d;
};

type ActivityType = "member_joined" | "expense_added" | "location_shared" | "itinerary_changed" | "message" | "invitation"

interface Activity {
  id: string
  type: ActivityType
  user: string
  trip: string
  description: string
  time: Date
}

const activityIcons: Record<ActivityType, typeof UserPlus> = {
  member_joined: UserPlus,
  expense_added: Receipt,
  location_shared: MapPin,
  itinerary_changed: Calendar,
  message: MessageSquare,
  invitation: UserPlus,
}

const activityColors: Record<ActivityType, string> = {
  member_joined: "bg-emerald-500/20 text-emerald-400 shadow-emerald-500/10",
  expense_added: "bg-amber-500/20 text-amber-400 shadow-amber-500/10",
  location_shared: "bg-primary/20 text-indigo-400 shadow-indigo-500/10",
  itinerary_changed: "bg-purple-500/20 text-purple-400 shadow-purple-500/10",
  message: "bg-primary/20 text-indigo-400 shadow-indigo-500/10",
  invitation: "bg-indigo-500/20 text-indigo-400 shadow-indigo-500/10",
}

export function ActivityFeed() {
  const { trips: rawTrips = [] } = useTrips();
  const trips = useMemo(() => Array.isArray(rawTrips) ? rawTrips : [], [rawTrips]);
  const tripIds = useMemo(() => trips.map(t => t.id), [trips]);
  const { data: rawAllExpenses } = useAllExpenses(tripIds);
  const allExpenses = useMemo(() => rawAllExpenses || [], [rawAllExpenses]);
  const { invitations = [] } = usePendingInvitations();

  const activities = useMemo(() => {
    const list: Activity[] = [];

    // Add trip creation as an activity
    trips.forEach(t => {
      list.push({
        id: `trip-${t.id}`,
        type: "itinerary_changed",
        user: "System",
        trip: t.name,
        description: `Trip to ${t.destination} created`,
        time: safeParseDate(t.createdAt)
      });
    });

    // Add expenses
    allExpenses.forEach(e => {
      list.push({
        id: `expense-${e.id}`,
        type: "expense_added",
        user: e.paidBy?.name || "Someone",
        trip: trips.find(t => t.id === e.tripId)?.name || "Trip",
        description: `added expense: ${e.description} ($${e.amount})`,
        time: safeParseDate(e.createdAt)
      });
    });

    // Add invitations
    invitations.forEach(inv => {
      list.push({
        id: `inv-${inv.id}`,
        type: "invitation",
        user: inv.organizerName || "Organizer",
        trip: inv.name,
        description: `invited you to join the trip`,
        time: safeParseDate(inv.createdAt)
      });
    });

    return list.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);
  }, [trips, allExpenses, invitations]);

  return (
    <Card className="p-6 border border-white/5 shadow-2xl glass-panel rounded-[2.5rem] overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-black text-white uppercase tracking-widest text-xs flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]">
                <Clock className="h-4 w-4" />
            </div>
            Live Activity Feed
        </h3>
      </div>
      <div className="flex flex-col gap-4">
        {activities.length > 0 ? activities.map((activity) => {
          const Icon = activityIcons[activity.type]
          return (
            <div key={activity.id} className="flex items-start gap-3 group glass-card p-3 rounded-2xl border-white/5 transition-all hover:scale-[1.02]">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activityColors[activity.type]} shadow-sm transition-transform group-hover:scale-110`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/90 leading-tight">
                  <span className="font-bold text-white">{activity.user}</span>{" "}
                  <span className="text-slate-400 font-medium">{activity.description}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="truncate text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                        {activity.trip}
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {formatDistanceToNow(activity.time, { addSuffix: true })}
                    </span>
                </div>
              </div>
            </div>
          )
        }) : (
            <div className="py-10 text-center text-slate-500">
                <p className="text-xs font-bold uppercase tracking-widest">No recent activity</p>
            </div>
        )}
      </div>
    </Card>
  )
}
