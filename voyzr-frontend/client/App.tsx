import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { NotificationProvider } from "./components/NotificationProvider";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Overview from "./pages/Overview";
import Map from "./pages/Map";
import Chat from "./pages/Chat";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import TripDetail from "./pages/TripDetail";
import CreateTrip from "./pages/CreateTrip";
import AiAssistant from "./pages/AiAssistant";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TripLiveView from "./pages/TripLiveView";
import { motion } from "framer-motion";
import { AiAssistantPopup } from "./components/AiAssistantPopup";
import InviteLink from "./pages/InviteLink";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-900">
        <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-2xl border-2 border-slate-200 border-t-slate-900 animate-spin" />
            <div className="animate-pulse text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Synchronizing
            </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="voyzr-ui-theme">
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <div className="relative min-h-screen bg-white">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/invite/:code" element={<InviteLink />} />

                    {/* Protected Routes */}
                    <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />
                    <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                    <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/trips/:id" element={<ProtectedRoute><TripDetail /></ProtectedRoute>} />
                    <Route path="/trips/:id/live" element={<ProtectedRoute><TripLiveView /></ProtectedRoute>} />
                    <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
                    <Route path="/assistant" element={<ProtectedRoute><AiAssistant /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <AiAssistantPopup />
                </div>
              </BrowserRouter>
            </TooltipProvider>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
