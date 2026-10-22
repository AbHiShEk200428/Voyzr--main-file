import React, { createContext, useContext, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { usePendingInvitations } from "@/hooks/useTrips";
import { Button } from "@/components/ui/button";
import { Bell, Check, X } from "lucide-react";

const NotificationContext = createContext({});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { invitations: rawInvitations = [], respondToInvitation } = usePendingInvitations();
  const invitations = useMemo(() => Array.isArray(rawInvitations) ? rawInvitations : [], [rawInvitations]);
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check for new invitations to show toast
    invitations.forEach((invitation) => {
      const id = String(invitation.id);
      if (!notifiedIds.current.has(id)) {
        notifiedIds.current.add(id);
        
        // Show persistent toast for the invitation
        toast.custom((t) => (
          <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-2xl p-5 flex flex-col gap-4 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Trip Invitation</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  You've been invited to join <span className="text-primary font-bold">"{invitation.name}"</span> by {invitation.organizerName}.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase tracking-widest gap-2"
                onClick={() => {
                  respondToInvitation({ tripId: id, accept: true });
                  toast.dismiss(t);
                }}
              >
                <Check className="h-3 w-3" /> Accept
              </Button>
              <Button 
                variant="outline"
                className="flex-1 h-10 rounded-xl border-2 border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest gap-2"
                onClick={() => {
                  respondToInvitation({ tripId: id, accept: false });
                  toast.dismiss(t);
                }}
              >
                <X className="h-3 w-3" /> Decline
              </Button>
            </div>
          </div>
        ), { duration: Infinity, id: `invitation-${id}` });
      }
    });

    // Cleanup: remove IDs that are no longer in invitations list
    const currentIds = new Set(invitations.map(i => String(i.id)));
    notifiedIds.current.forEach(id => {
      if (!currentIds.has(id)) {
        notifiedIds.current.delete(id);
        toast.dismiss(`invitation-${id}`);
      }
    });
  }, [invitations, respondToInvitation]);

  const simulateInvitation = () => {
    const mockId = "mock-" + Math.random().toString(36).substr(2, 9);
    toast.custom((t) => (
      <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-2xl p-5 flex flex-col gap-4 max-w-sm w-full">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">MOCK Trip Invitation</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              [SIMULATION] You've been invited to join <span className="text-primary font-bold">"Beach Getaway"</span> by Voyzr Admin.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            className="flex-1 h-10 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest gap-2"
            onClick={() => {
              toast.success("Accepted (Mock)");
              toast.dismiss(t);
            }}
          >
            <Check className="h-3 w-3" /> Accept
          </Button>
          <Button 
            variant="outline"
            className="flex-1 h-10 rounded-xl border-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest gap-2"
            onClick={() => {
              toast.error("Declined (Mock)");
              toast.dismiss(t);
            }}
          >
            <X className="h-3 w-3" /> Decline
          </Button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  return (
    <NotificationContext.Provider value={{ simulateInvitation }}>
      {children}
    </NotificationContext.Provider>
  );
};
