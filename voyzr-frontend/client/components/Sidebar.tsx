import { Link, useLocation } from "react-router-dom";
import { cn, getInitials } from "@/lib/utils";
import {
  MapPin,
  Plane,
  MessageCircle,
  Wallet,
  Settings,
  LogOut,
  Sparkles,
  Bell,
  LayoutDashboard,
  Menu,
  X,
  Plus
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, href: "/" },
  { label: "My Trips", icon: Plane, href: "/dashboard" },
  { label: "Explorer", icon: MapPin, href: "/map" },
  { label: "Messages", icon: MessageCircle, href: "/chat" },
  { label: "Financials", icon: Wallet, href: "/expenses" },
  { label: "Alerts", icon: Bell, href: "/notifications" },
  { label: "Assistant", icon: Sparkles, href: "/assistant", small: true },
  { label: "Settings", icon: Settings, href: "/settings" },
];

// Bottom nav shows only the 5 most-used items on mobile
const mobileNavItems = [
  { label: "Home", icon: LayoutDashboard, href: "/" },
  { label: "Trips", icon: Plane, href: "/dashboard" },
  { label: "Map", icon: MapPin, href: "/map" },
  { label: "Chat", icon: MessageCircle, href: "/chat" },
  { label: "More", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <>
      {/* ── Desktop Sidebar (hidden on mobile) ─────────────────────────────── */}
      <div
        className={cn(
          "hidden md:flex fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-100 transition-all duration-500 ease-in-out flex-col p-6",
          isCollapsed ? "w-24" : "w-64"
        )}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 hover:text-slate-900 shadow-sm transition-all"
        >
          {isCollapsed ? <Menu className="h-3 w-3" /> : <X className="h-3 w-3" />}
        </button>

        <div className={cn("mb-12 transition-all", isCollapsed ? "flex justify-center" : "px-2")}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-4"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 logo-3d-glass shadow-xl shadow-slate-200">
              <Plane className="h-7 w-7 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900 tracking-tight">Voyzr</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest -mt-1">Expedition Command</span>
              </div>
            )}
          </motion.div>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.href} to={item.href}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full flex items-center rounded-2xl transition-all relative group h-12 sidebar-button-standard",
                    isCollapsed ? "justify-center" : "px-4 py-3 gap-3",
                    isActive
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-200 border-slate-800"
                      : "text-slate-900"
                  )}
                >
                  {isActive && !isCollapsed && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full" />
                  )}
                  
                  <Icon className={cn(
                    item.small ? "h-4 w-4" : "h-5 w-5",
                    isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                  )} />
                  
                  {!isCollapsed && (
                    <span className={cn(
                      "font-bold uppercase tracking-widest text-[10px]",
                      isActive ? "text-white" : "text-slate-900 group-hover:text-white"
                    )}>
                      {item.label}
                    </span>
                  )}
                </motion.button>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 space-y-4">
          <div className={cn(
            "rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all",
            isCollapsed ? "flex justify-center p-2" : "flex items-center gap-3"
          )}>
            <Avatar className={cn("h-10 w-10 border border-slate-200 shadow-sm", isCollapsed && "h-9 w-9")}>
              <AvatarFallback className="bg-white text-slate-600 text-[10px] font-bold uppercase">
                {getInitials(user?.username || "U")}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-900 truncate uppercase tracking-tight">{user?.username || "Guest"}</p>
                <p className="text-[9px] font-medium text-slate-500 truncate uppercase tracking-widest">Traveler</p>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className={cn(
              "flex w-full items-center rounded-xl p-3 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100",
              isCollapsed ? "justify-center" : "px-3 gap-3"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="font-bold uppercase tracking-widest text-[10px]">Logout</span>}
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Navigation Bar ───────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 flex items-center justify-around shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} to={item.href} className="flex-1">
              <motion.button
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full py-3 transition-colors",
                  isActive ? "text-slate-900" : "text-slate-400"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center rounded-xl w-10 h-7 transition-colors",
                  isActive ? "bg-slate-50" : ""
                )}>
                  <Icon className={cn("h-5 w-5", isActive ? "text-slate-900" : "text-slate-400")} />
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider",
                  isActive ? "text-slate-900" : "text-slate-400"
                )}>
                  {item.label}
                </span>
              </motion.button>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
