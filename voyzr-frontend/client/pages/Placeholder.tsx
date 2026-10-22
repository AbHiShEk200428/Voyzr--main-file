import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronLeft, Lightbulb } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

interface PlaceholderProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function Placeholder({
  title,
  description,
  icon: Icon = Lightbulb,
}: PlaceholderProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="ml-64 flex-1 p-8">
        <Link to="/">
          <button className="mb-6 flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900">
            <ChevronLeft className="h-5 w-5" />
            Back to My Trips
          </button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex h-96 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white"
        >
          <div className="text-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Icon className="mx-auto h-16 w-16 text-slate-400" />
            </motion.div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-slate-600">{description}</p>
            <p className="mt-4 text-sm text-slate-500">
              This feature is coming soon. Keep building!
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
