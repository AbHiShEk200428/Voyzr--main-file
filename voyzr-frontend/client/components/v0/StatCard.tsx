import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  color: "blue" | "green" | "purple" | "amber" | "violet" | "slate"
}

const colorMap = {
  blue: "bg-blue-100 text-blue-600 shadow-blue-500/20",
  green: "bg-emerald-100 text-emerald-600 shadow-emerald-500/20",
  purple: "bg-purple-100 text-purple-600 shadow-purple-500/20",
  amber: "bg-amber-100 text-amber-600 shadow-amber-500/20",
  violet: "bg-violet-100 text-violet-600 shadow-violet-500/20",
  slate: "bg-slate-100 text-slate-900 shadow-slate-500/20",
}

export function StatCard({ label, value, color }: StatCardProps) {
  const styles = colorMap[color] || colorMap.slate;
  const classes = styles.split(" ");
  
  return (
    <Card className="flex flex-col gap-1 p-6 glass-card border-black/5 shadow-2xl rounded-3xl transition-all hover:scale-[1.02] active:scale-[0.98]">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</p>
      <div className="flex items-center gap-3 mt-1">
        <p className={cn("text-3xl font-black tabular-nums tracking-tighter", classes[1])}>
          {value}
        </p>
        <div className={cn("h-2 w-2 rounded-full shadow-[0_0_10px_currentColor]", classes[0])} />
      </div>
    </Card>
  )
}
