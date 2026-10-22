import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Lock, 
  Globe, 
  Shield, 
  Terminal,
  Play,
  Moon,
  Sun,
  Camera,
  Check,
  Loader2
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useNotifications } from "@/components/NotificationProvider";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";

import { useAuth } from "@/components/AuthProvider";

export default function Settings() {
  const { simulateInvitation } = useNotifications() as any;
  const { theme, setTheme, highContrast, setHighContrast } = useTheme();
  const { user: authUser } = useAuth();
  const { user, isLoading, updateProfile, isUpdating } = useUser();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    bio: ""
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || user.userName || authUser?.username || "",
        email: user.email || user.userEmail || authUser?.email || "",
        bio: (user as any).bio || "Passionate traveler and trip organizer."
      });
    }
  }, [user, authUser]);

  const handleSaveProfile = () => {
    updateProfile(profile, {
      onSuccess: () => {
        toast.success("Profile updated!");
        setIsEditing(false);
      },
      onError: (err) => {
        toast.error("Failed to update profile: " + (err as Error).message);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900 transition-colors duration-300">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <header className="mb-10 flex justify-between items-end border-b border-slate-100 pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase">Settings</h1>
            <p className="mt-2 text-slate-500 font-medium">Manage your account preferences and application behavior.</p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[10px] h-12 px-6 border-2 border-slate-100 text-slate-900 hover:bg-slate-50">
              Edit Account
            </Button>
          )}
        </header>

        <div className="max-w-4xl space-y-8">
          {/* Profile Section */}
          <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <User className="h-5 w-5 text-slate-900" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Profile Information</CardTitle>
                  <CardDescription>Update your personal details and how others see you.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-8">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-[2rem] bg-slate-900 flex items-center justify-center text-3xl font-black text-white shadow-lg uppercase">
                    {profile.name ? profile.name.charAt(0) : "?"}
                  </div>
                  {isEditing && (
                    <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-md border border-slate-200 group-hover:scale-110 transition-transform">
                      <Camera className="h-4 w-4 text-slate-900" />
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight">{profile.name}</h3>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-slate-500">{profile.email}</p>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] bg-slate-100 w-fit px-2 py-1 rounded-md border border-slate-200">
                      ID: {authUser?.uniquePublicId || "VOYZR-PENDING"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Display Name</Label>
                  <Input 
                    value={profile.name} 
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="rounded-2xl border-2 h-14 bg-white border-slate-100 disabled:opacity-70 focus:border-slate-900" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                  <Input 
                    value={profile.email} 
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    className="rounded-2xl border-2 h-14 bg-white border-slate-100 disabled:opacity-70 focus:border-slate-900" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Short Bio</Label>
                <Input 
                  value={profile.bio} 
                  disabled={!isEditing}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  className="rounded-2xl border-2 h-14 bg-white border-slate-100 disabled:opacity-70 focus:border-slate-900" 
                />
              </div>

              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSaveProfile} disabled={isUpdating} className="rounded-2xl font-black uppercase tracking-widest text-xs px-10 h-14 gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xl">
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} 
                    Save Changes
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="ghost" className="rounded-2xl font-black uppercase tracking-widest text-xs px-8 h-14 text-slate-500 hover:bg-slate-50">
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Theme & Appearance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm bg-white p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm">
                    {theme === 'dark' ? <Moon className="h-6 w-6 text-slate-900" /> : <Sun className="h-6 w-6 text-slate-900" />}
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight">Appearance</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toggle Dark Mode</p>
                  </div>
                </div>
                <Switch 
                  checked={theme === 'dark'} 
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} 
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={theme === 'light' ? 'default' : 'outline'} 
                  onClick={() => setTheme('light')}
                  className={cn("flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest h-10", theme === 'light' ? "bg-slate-900 text-white" : "border-slate-100 text-slate-900")}
                >
                  Light
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'default' : 'outline'} 
                  onClick={() => setTheme('dark')}
                  className={cn("flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest h-10", theme === 'dark' ? "bg-slate-900 text-white" : "border-slate-100 text-slate-900")}
                >
                  Dark
                </Button>
              </div>
            </Card>

            <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm bg-white p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm">
                    <Shield className="h-6 w-6 text-slate-900" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight">Accessibility</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">High Contrast Mode</p>
                  </div>
                </div>
                <Switch 
                  checked={highContrast} 
                  onCheckedChange={setHighContrast} 
                />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm">
                    <Globe className="h-6 w-6 text-slate-900" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight">Privacy</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Public Profile</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </Card>
          </div>

          {/* Developer Section */}
          <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden bg-slate-50 text-slate-900">
            <CardHeader className="bg-white pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl">
                  <Terminal className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900">Developer Tools</CardTitle>
                  <CardDescription className="text-slate-500">Tools for testing and debugging application features.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-tight">Notification Simulation</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Trigger a mock trip invitation to test the real-time toast system.</p>
                </div>
                <Button 
                  onClick={simulateInvitation}
                  className="bg-slate-900 hover:bg-slate-800 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 h-12 px-8 text-white shadow-lg"
                >
                  <Play className="h-4 w-4 fill-current" /> Run Simulation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
