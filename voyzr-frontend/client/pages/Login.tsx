import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { userApi } from "@/services/api";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response: any = await userApi.login({ email, password });
      login(
        {
          id: response.id,
          email: response.email,
          username: response.username,
          uniquePublicId: response.uniquePublicId,
        },
        response.token
      );
      
      const pendingCode = sessionStorage.getItem("pendingJoinCode");
      if (pendingCode) {
        toast.success("Welcome back! Connecting you to the trip...");
        navigate(`/invite/${pendingCode}`);
      } else {
        toast.success("Welcome back to Voyzr!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 rounded-3xl border border-slate-100 bg-white p-10 shadow-xl"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
            <LayoutDashboard className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
            Voyzr Login
          </h1>
          <p className="mt-2 text-sm font-medium italic text-slate-500">
            Adventure is calling. Sign in to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition-all focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition-all focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 hover:shadow-lg active:scale-[0.98] disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-black uppercase tracking-widest text-primary hover:underline underline-offset-4"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
