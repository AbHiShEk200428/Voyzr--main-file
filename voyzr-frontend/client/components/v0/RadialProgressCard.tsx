import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RadialProgressCardProps {
  label: string;
  current: number;
  total: number;
  color: string;
  icon: React.ElementType;
  suffix?: string;
}

export function RadialProgressCard({ label, current, total, color, icon: Icon, suffix }: RadialProgressCardProps) {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  
  const data = [
    { value: percentage },
    { value: 100 - percentage },
  ];

  return (
    <Card className="relative overflow-hidden glass-card border-black/5 shadow-2xl rounded-[2rem] p-6 transition-all hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter neon-glow">{current}</h3>
            {suffix && <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest ml-1">{suffix}</span>}
          </div>
        </div>
        <div className={cn("p-2.5 rounded-xl text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]", color === 'bg-green-500' ? "bg-emerald-500" : "bg-primary")}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="h-32 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill="currentColor" className={cn(color === 'bg-green-500' ? "text-emerald-500" : "text-sky-500")} />
              <Cell fill="rgba(0,0,0,0.05)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-2">
          <span className="text-xs font-black text-slate-900">{percentage}%</span>
        </div>
      </div>
    </Card>
  );
}
