import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Mail, Lock, User, Loader2, ArrowRight } from "lucide-react";
import { userApi } from "@/services/api";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

export default function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response: any = await userApi.register(formData);
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
        toast.success("Account created! Connecting you to the trip...");
        navigate(`/invite/${pendingCode}`);
      } else {
        toast.success("Account created successfully!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8 rounded-3xl border border-slate-100 bg-white p-10 shadow-xl"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
            <LayoutDashboard className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
            Join Voyzr
          </h1>
          <p className="mt-2 text-sm font-medium italic text-slate-500">
            Start your journey with us today.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 px-6 text-sm font-bold text-slate-900 outline-none transition-all focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5"
                placeholder="John"
              />
            </div>

            <div className="relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 px-6 text-sm font-bold text-slate-900 outline-none transition-all focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5"
                placeholder="Doe"
              />
            </div>

            <div className="relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">
                Username
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition-all focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5"
                  placeholder="johndoe"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition-all focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="relative md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
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
                Create Account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-black uppercase tracking-widest text-primary hover:underline underline-offset-4"
            >
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
