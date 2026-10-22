import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { tripApi } from "@/services/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function InviteLink() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !code) return;

    const processInvite = async () => {
      // 1. Unauthenticated users -> Save intent & redirect to signup
      if (!isAuthenticated) {
        sessionStorage.setItem("pendingJoinCode", code);
        toast.info("Create an account to join this trip!");
        // We defer redirecting so the toast shows successfully
        setTimeout(() => navigate("/signup"), 100);
        return;
      }

      // 2. Authenticated users -> Attempt join immediately
      setIsProcessing(true);
      try {
        const responseData = await tripApi.joinByCode(code) as any;
        // Depending on backend, might return the trip or might have {data: trip} wrapper
        const tripId = responseData?.data?.id || responseData?.id;
        
        toast.success("Successfully joined the trip!");
        if (tripId) {
          navigate(`/trips/${tripId}`);
        } else {
          navigate("/dashboard");
        }
      } catch (err: any) {
        console.error("Failed to join trip:", err);
        setError(err.message || "Failed to join trip. The code might be invalid or expired.");
        toast.error("Invite Link Error: " + (err.message || "Invalid code"));
      } finally {
        setIsProcessing(false);
      }
    };

    processInvite();
  }, [code, isAuthenticated, isLoading, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-900 border-2">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="h-16 w-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Connection Failed</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-tight opacity-70">
            {error}
          </p>
          <button 
            onClick={() => navigate("/dashboard")}
            className="mt-6 h-12 w-full rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Loading Screen
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-900">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="h-16 w-16 bg-slate-50 border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-slate-900 animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">
            Processing Magic Link
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
            Establishing secure handshake...
          </p>
        </div>
      </motion.div>
    </div>
  );
}
