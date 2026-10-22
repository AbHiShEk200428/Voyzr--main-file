import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Calendar,
  Tag,
  Trash2,
  PieChart,
  User,
  Receipt,
  TrendingUp,
  History,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Image as ImageIcon,
  X,
  UploadCloud,
  Check,
  ChevronDown
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { useTrips } from "@/hooks/useTrips";
import { 
  useTripExpenses, 
  useCreateExpense, 
  useAllExpenses, 
  useDeleteExpense,
  useSettleExpense,
  useExpenseSplits
} from "@/hooks/useExpenses";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { ExpenseSplit } from "@/types";
import { useUser } from "@/hooks/useUser";

export default function Expenses() {
  const { user } = useUser();
  const { trips = [] } = useTrips();
  const tripIds = useMemo(() => trips.map(t => String(t.id)), [trips]);
  
  const { data: allExpenses = [] } = useAllExpenses(tripIds);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const { data: expenses = [], isLoading: loadingExpenses } = useTripExpenses(selectedTripId || "");
  
  const createExpenseMutation = useCreateExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const settleExpenseMutation = useSettleExpense();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // For lightbox
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // Form State
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "Transport",
    paidBy: user?.name || "You",
    notes: "",
    receiptUrl: "", // base64
    splitType: "EQUAL" as "EQUAL" | "CUSTOM"
  });
  
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTrip = useMemo(() => 
    trips.find(t => String(t.id) === selectedTripId), 
    [trips, selectedTripId]
  );

  useEffect(() => {
    if (selectedTrip && newExpense.splitType === "EQUAL" && newExpense.amount) {
      const amount = Number(newExpense.amount) || 0;
      const perPerson = amount / Math.max(selectedTrip.members?.length || 1, 1);
      const newSplits: Record<string, number> = {};
      (selectedTrip.members || []).forEach(m => {
        newSplits[m.id] = perPerson;
      });
      setCustomSplits(newSplits);
    }
  }, [selectedTrip, newExpense.amount, newExpense.splitType]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           exp.paidBy.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || exp.category === categoryFilter;
      const matchesStatus = statusFilter === "ALL" || exp.settlementStatus === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [expenses, searchQuery, categoryFilter, statusFilter]);

  const totalSpentOnCurrentTrip = useMemo(() => 
    expenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
    [expenses]
  );
  
  const totalPendingOnCurrentTrip = useMemo(() => 
    expenses.filter(e => e.settlementStatus === "PENDING")
            .reduce((sum, exp) => sum + Number(exp.amount), 0),
    [expenses]
  );

  const globalTotalSpent = useMemo(() => 
    allExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
    [allExpenses]
  );

  const categories = ["Transport", "Food", "Accommodation", "Activities", "Shopping", "Others"];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewExpense(prev => ({ ...prev, receiptUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddExpense = async () => {
    if (!selectedTripId || !selectedTrip) return;
    if (!newExpense.description || !newExpense.amount) {
      toast.error("Please fill in all required fields (Description & Amount)");
      return;
    }

    const totalAmount = Number(newExpense.amount);
    
    // Validate custom splits
    if (newExpense.splitType === "CUSTOM") {
      const splitTotal = Object.values(customSplits).reduce((sum, val) => sum + Number(val), 0);
      if (Math.abs(splitTotal - totalAmount) > 0.01) { // Floating point tolerance
        toast.error(`Custom splits must equal total amount. Current: ${formatCurrency(splitTotal)} / ${formatCurrency(totalAmount)}`);
        return;
      }
    }

    try {
      // Create Splits Payload
      const members = selectedTrip.members || [];
      const splitsPayload: ExpenseSplit[] = members.map(member => ({
        userId: Number(member.id),
        userName: member.name,
        userEmail: member.email,
        owedAmount: newExpense.splitType === "CUSTOM" 
          ? Number(customSplits[member.id] || 0)
          : totalAmount / Math.max(members.length, 1),
        isPaid: false
      })).filter(s => s.owedAmount > 0);

      await createExpenseMutation.mutateAsync({
        tripId: selectedTripId,
        description: newExpense.description,
        amount: totalAmount,
        category: newExpense.category,
        paidBy: newExpense.paidBy,
        notes: newExpense.notes,
        receiptUrl: newExpense.receiptUrl,
        splitType: newExpense.splitType,
        splits: splitsPayload // The backend expects this to be handled, or we hit the new /splits endpoint. Let's adjust backend if it needs separate call.
      });
      
      toast.success("Expense added successfully");
      setIsAddDialogOpen(false);
      setNewExpense({
        description: "",
        amount: "",
        category: "Transport",
        paidBy: user?.name || "You",
        notes: "",
        receiptUrl: "",
        splitType: "EQUAL"
      });
      setCustomSplits({});
    } catch (error) {
      toast.error("Failed to add expense");
    }
  };

  const handleCustomSplitChange = (memberId: string, value: string) => {
    setCustomSplits(prev => ({
      ...prev,
      [memberId]: parseFloat(value) || 0
    }));
  };

  const handleSettleToggle = (expense: any) => {
    const newStatus = expense.settlementStatus === "SETTLED" ? "unsettle" : "settle";
    settleExpenseMutation.mutate({ id: expense.id, action: newStatus });
    toast.success(newStatus === "settle" ? "Expense marked as settled" : "Expense moved to pending");
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-900 overflow-hidden">
      <Sidebar />

      {/* Lightbox for Receipts */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-black/50 text-white rounded-full hover:bg-black/70" onClick={() => setSelectedImage(null)}>
                <X className="h-5 w-5" />
              </Button>
              <img src={selectedImage} alt="Receipt" className="max-w-full max-h-[90vh] object-contain bg-slate-900" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8 relative z-10 overflow-y-auto h-screen custom-scrollbar">
        {/* Top Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
              Expenses
            </h1>
            <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-xs">
              Track, split, and settle group spending
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-4">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex items-center gap-6 shadow-sm">
              <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                <History className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trip Pending</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-500">{formatCurrency(totalPendingOnCurrentTrip)}</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex items-center gap-6 shadow-sm hidden md:flex">
              <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                <TrendingUp className="h-8 w-8 text-slate-900" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Lifetime</p>
                <p className="text-3xl font-black text-slate-900">{formatCurrency(globalTotalSpent)}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Trip Selector */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Select a Trip</h2>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{trips.length} Trips Tracked</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {trips.map((trip) => (
              <motion.button
                key={trip.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedTripId(String(trip.id))}
                className={cn(
                  "flex-shrink-0 w-64 rounded-2xl p-5 text-left transition-all border-2",
                  selectedTripId === String(trip.id)
                    ? "bg-slate-900 border-slate-900 shadow-xl text-white"
                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 shadow-sm"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center border shadow-inner",
                    selectedTripId === String(trip.id) ? "bg-white/10 border-white/20" : "bg-slate-50 border-slate-100"
                  )}>
                    <MapPin className={cn("h-5 w-5", selectedTripId === String(trip.id) ? "text-white" : "text-slate-400")} />
                  </div>
                  {selectedTripId === String(trip.id) && <CheckCircle2 className="h-5 w-5 text-white" />}
                </div>
                <h3 className={cn("font-black text-lg truncate uppercase tracking-tight", selectedTripId === String(trip.id) ? "text-white" : "text-slate-900")}>{trip.name}</h3>
                <p className={cn("text-[10px] mt-1 font-black uppercase tracking-widest truncate opacity-60", selectedTripId === String(trip.id) ? "text-slate-400" : "text-slate-500")}>
                  {trip.destination}
                </p>
              </motion.button>
            ))}
          </div>
        </div>

        {!selectedTripId ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex h-80 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <div className="mb-6 rounded-3xl bg-white p-8 border border-slate-200 shadow-sm">
              <History className="h-16 w-16 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Trip Selected</h3>
            <p className="mt-2 max-w-sm text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-relaxed">
              Select a trip to view and manage its expenses.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-10">
            {/* Action Bar */}
            <div className="flex flex-col lg:flex-row gap-6">
              <Card className="flex-1 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Trip Spending</CardTitle>
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div>
                    <div className="text-5xl font-black tracking-tighter text-slate-900">
                      {formatCurrency(totalSpentOnCurrentTrip)}
                    </div>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-slate-500">
                      <ChevronRight className="h-4 w-4" /> {selectedTrip?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Per Person (Avg)</p>
                    <p className="text-xl font-black text-slate-600">
                      {formatCurrency(totalSpentOnCurrentTrip / (selectedTrip?.memberCount || 1))}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Add Expense Dialog */}
              <div className="flex flex-col gap-4 w-full lg:w-72">
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-full rounded-3xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg py-8 shadow-xl transition-all group">
                      <Plus className="mr-2 h-6 w-6 group-hover:rotate-90 transition-transform" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[2rem] bg-white border border-slate-100 text-slate-900 p-0 overflow-x-hidden">
                    <div className="p-8">
                      <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900">New Expense</DialogTitle>
                        <DialogDescription className="font-bold uppercase tracking-widest text-[10px] text-slate-400">
                          Record a new expense for {selectedTrip?.name}.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6">
                        {/* Basic Details */}
                        <div className="grid gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <div className="grid gap-2">
                            <Label htmlFor="description" className="font-black text-[10px] uppercase tracking-widest text-slate-500">Description</Label>
                            <Input id="description" placeholder="Lunch, Taxi, Tickets..." className="rounded-xl border-slate-300 bg-white text-slate-900 font-bold focus:border-slate-900" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="amount" className="font-black text-[10px] uppercase tracking-widest text-slate-500">Amount (₹)</Label>
                              <Input id="amount" type="number" placeholder="0.00" className="rounded-xl border-slate-300 bg-white text-slate-900 font-black text-lg focus:border-slate-900" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} />
                            </div>
                            <div className="grid gap-2">
                              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Category</Label>
                              <Select value={newExpense.category} onValueChange={(v) => setNewExpense({...newExpense, category: v})}>
                                <SelectTrigger className="rounded-xl border-slate-300 bg-white font-bold h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl bg-white border-slate-200">
                                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="paidBy" className="font-black text-[10px] uppercase tracking-widest text-slate-500">Paid By</Label>
                            <Input id="paidBy" placeholder="Who paid?" className="rounded-xl border-slate-300 bg-white" value={newExpense.paidBy} onChange={(e) => setNewExpense({...newExpense, paidBy: e.target.value})} />
                          </div>
                        </div>

                        {/* Split Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Expense Split</Label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                              <button 
                                className={cn("px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", newExpense.splitType === "EQUAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                onClick={() => setNewExpense(p => ({...p, splitType: "EQUAL"}))}
                              >EQUAL</button>
                              <button 
                                className={cn("px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", newExpense.splitType === "CUSTOM" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                onClick={() => setNewExpense(p => ({...p, splitType: "CUSTOM"}))}
                              >CUSTOM</button>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {(selectedTrip.members || []).map(member => (
                              <div key={member.id} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-100/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">
                                    {member.name.charAt(0)}
                                  </div>
                                  <span className="font-bold text-sm text-slate-700">{member.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-bold">₹</span>
                                  <Input 
                                    type="number" 
                                    className={cn("w-24 text-right h-8 rounded-lg font-black", newExpense.splitType === "EQUAL" ? "bg-transparent border-transparent" : "bg-white border-slate-200")} 
                                    value={newExpense.splitType === "EQUAL" 
                                      ? (Number(newExpense.amount||0) / Math.max(selectedTrip.members?.length || 1, 1)).toFixed(2) 
                                      : customSplits[member.id] || ""}
                                    readOnly={newExpense.splitType === "EQUAL"}
                                    onChange={(e) => handleCustomSplitChange(member.id, e.target.value)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Extras (Receipt & Notes) */}
                        <div className="grid gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Extras</Label>
                          <div className="grid gap-2">
                            <Input id="notes" placeholder="Additional notes... (optional)" className="rounded-xl border-slate-300 bg-white" value={newExpense.notes} onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})} />
                          </div>
                          <div className="mt-2 text-center">
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                            {!newExpense.receiptUrl ? (
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white hover:bg-slate-100 transition-colors group text-slate-500 hover:text-slate-800"
                              >
                                <UploadCloud className="h-8 w-8 mb-2 opacity-50 group-hover:opacity-100 group-hover:-translate-y-1 transition-all" />
                                <span className="font-bold text-xs uppercase tracking-widest">Upload Receipt</span>
                              </button>
                            ) : (
                              <div className="relative inline-block">
                                <img src={newExpense.receiptUrl} alt="Receipt preview" className="h-32 rounded-xl border-4 border-white shadow-md object-cover" />
                                <button className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform" onClick={() => setNewExpense(p => ({...p, receiptUrl: ""}))} >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        <Button 
                          onClick={handleAddExpense} 
                          disabled={createExpenseMutation.isPending}
                          className="w-full rounded-2xl h-14 font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white"
                        >
                          {createExpenseMutation.isPending ? "PROCESSING..." : "CONFIRM EXPENSE"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Filters & Log */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input placeholder="Search expenses..." className="pl-12 bg-white rounded-2xl border-none shadow-sm h-12 font-bold uppercase text-xs tracking-widest focus-visible:ring-1 focus-visible:ring-slate-300" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-white rounded-2xl border-none shadow-sm h-12 font-black uppercase tracking-widest text-[10px]">
                      <Filter className="mr-2 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-white rounded-2xl border-none shadow-sm h-12 font-black uppercase tracking-widest text-[10px]">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100">
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="SETTLED">Settled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-8 bg-slate-900 border border-slate-900 rounded-[2rem] text-white shadow-xl">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-80">Trip Expense Log</h3>
                  <p className="text-2xl font-black uppercase tracking-tight mt-1 text-white">{selectedTrip?.name}</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Unsettled</h3>
                    <p className="text-2xl font-black tracking-tighter mt-1 text-amber-400">{formatCurrency(totalPendingOnCurrentTrip)}</p>
                  </div>
                </div>
              </div>

              <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden bg-white">
                <div className="p-8">
                  {loadingExpenses ? (
                    <div className="space-y-6">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-slate-50 border border-slate-100" />)}
                    </div>
                  ) : filteredExpenses.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 border border-slate-100 shadow-inner mb-6">
                        <Receipt className="h-12 w-12 text-slate-300" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Expenses Found</h4>
                      <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        Adjust your filters or add a new expense.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredExpenses.map((expense) => {
                         const isPending = expense.settlementStatus === "PENDING";
                         return (
                          <motion.div
                            layout
                            key={expense.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              "group flex flex-col p-5 rounded-[2rem] transition-all border shadow-sm",
                              isPending ? "bg-white border-amber-100 hover:border-amber-300 hover:shadow-md" : "bg-slate-50 border-slate-100 opacity-80"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-5">
                                <div className={cn(
                                  "flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm border transition-transform group-hover:scale-105",
                                  isPending ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-slate-200 text-slate-500 border-slate-300"
                                )}>
                                  {expense.category === 'Food' ? <Receipt className="h-6 w-6" /> :
                                  expense.category === 'Transport' ? <TrendingUp className="h-6 w-6" /> :
                                  expense.category === 'Accommodation' ? <MapPin className="h-6 w-6" /> :
                                  <Wallet className="h-6 w-6" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">{expense.description}</h4>
                                    <span className={cn(
                                      "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded flex items-center gap-1",
                                      isPending ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                    )}>
                                      {isPending ? "PENDING" : <><Check className="h-3 w-3" /> SETTLED</>}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                      <User className="h-3 w-3 text-slate-400" /> Paid by <span className="font-black text-slate-700">{expense.paidBy}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100">
                                      {expense.category}
                                    </span>
                                    {expense.receiptUrl && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedImage(expense.receiptUrl!); }}
                                        className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                                      >
                                        <ImageIcon className="h-3 w-3" /> Receipt attached
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <div className={cn("text-2xl font-black tracking-tighter", isPending ? "text-slate-900" : "text-slate-500")}>
                                    {formatCurrency(expense.amount)}
                                  </div>
                                  <button 
                                    className="flex items-center justify-end gap-1 w-full mt-1 text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 transition-colors"
                                    onClick={() => setExpandedExpenseId(expandedExpenseId === expense.id ? null : expense.id)}
                                  >
                                    {expense.splitType} SPLIT <ChevronDown className={cn("h-3 w-3 transition-transform", expandedExpenseId === expense.id && "rotate-180")} />
                                  </button>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button 
                                    size="sm"
                                    variant={isPending ? "default" : "outline"}
                                    onClick={() => handleSettleToggle(expense)}
                                    className={cn("h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest", isPending ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100")}
                                  >
                                    {isPending ? "Mark Settled" : "Unsettle"}
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                      if(confirm("Are you sure you want to delete this expense?")) {
                                        deleteExpenseMutation.mutate(expense.id);
                                      }
                                    }}
                                    className="h-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Splits Panel */}
                            <AnimatePresence>
                              {expandedExpenseId === expense.id && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden mt-6 pt-6 border-t border-slate-100"
                                >
                                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Split Breakdown</h5>
                                    {expense.splits ? (
                                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {expense.splits.map((s, idx) => (
                                          <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white border border-slate-100">
                                            <span className="font-bold text-xs uppercase text-slate-700">{s.userName}</span>
                                            <span className="font-black text-slate-900">{formatCurrency(s.owedAmount)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs font-bold text-slate-500">Split details were generated on the backend but not populated yet.</p> // Ideally your backend returns the split list nested in the expense GET call. If not, we fetch it.
                                    )}
                                    {expense.notes && (
                                      <div className="mt-4 pt-4 border-t border-slate-200">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Notes</h5>
                                        <p className="text-sm font-medium text-slate-700">{expense.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
