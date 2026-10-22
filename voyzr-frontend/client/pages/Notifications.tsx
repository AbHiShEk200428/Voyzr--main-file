import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  MapPin, 
  MessageCircle, 
  Wallet, 
  Calendar,
  Check,
  X,
  Clock,
  Trash2,
  Settings,
  BellOff,
  Sparkles,
  Info
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useNotifications } from "@/hooks/useNotifications";

export default function Notifications() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();

  const getTypeIcon = (type: string) => {

    switch (type) {
      case 'trip': return <MapPin className="h-6 w-6 text-blue-600" />;
      case 'chat': return <MessageCircle className="h-6 w-6 text-emerald-600" />;
      case 'expense': return <Wallet className="h-6 w-6 text-amber-600" />;
      default: return <Sparkles className="h-6 w-6 text-indigo-600" />;
    }
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'trip': return "bg-blue-500/10";
      case 'chat': return "bg-emerald-500/10";
      case 'expense': return "bg-amber-500/10";
      default: return "bg-indigo-500/10";
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />

      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <span className="rounded-2xl bg-primary px-4 py-1.5 text-xs font-black uppercase text-primary-foreground shadow-lg shadow-primary/20">
                  {unreadCount} New
                </span>
              )}
            </h1>
            <p className="mt-1 text-slate-500 font-medium italic">
              Stay updated on trip activities and group updates
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={markAllAsRead}
              className="bg-white rounded-2xl border-2 border-slate-100 font-black uppercase tracking-widest text-[10px] h-12 px-6 hover:bg-slate-50 transition-all"
            >
              Mark all as read
            </Button>
            <Button variant="outline" size="icon" className="bg-white rounded-2xl border-2 border-slate-100 h-12 w-12 hover:bg-slate-50 transition-all">
              <Settings className="h-5 w-5 text-slate-400" />
            </Button>
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-4">
          {notifications.length === 0 ? (
            <div className="flex h-[60vh] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mb-8 rounded-[2rem] bg-slate-50 p-10 shadow-xl shadow-slate-100/50">
                <BellOff className="h-16 w-16 text-slate-200" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">All Caught Up</h3>
              <p className="mt-2 max-w-xs text-slate-500 font-medium italic">
                You've cleared all alerts. Time for your next adventure?
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={cn(
                    "overflow-hidden border-none shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50 rounded-[2rem] bg-white group",
                    !notification.read && "ring-2 ring-primary/10 bg-indigo-50/10"
                  )}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-6">
                        <div className={cn(
                          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-110",
                          getTypeColor(notification.type)
                        )}>
                          {getTypeIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className={cn(
                                "text-lg font-black uppercase tracking-tight",
                                notification.read ? "text-slate-900" : "text-primary"
                                )}>
                                {notification.title}
                                </h3>
                                {!notification.read && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                            </div>
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium leading-relaxed">{notification.message}</p>
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex gap-2">
                              {notification.actionUrl && (
                                <Button variant="secondary" className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-black transition-all">
                                  View Details
                                </Button>
                              )}
                              {!notification.read && (
                                <Button 
                                  variant="ghost" 
                                  className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  Mark as read
                                </Button>
                              )}
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}
