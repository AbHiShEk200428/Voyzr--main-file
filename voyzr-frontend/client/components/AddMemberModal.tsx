import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus, Check, Loader2, UserX, AlertCircle } from "lucide-react";
import { useInviteMember } from "@/hooks/useTrips";
import { userApi } from "@/services/api";
import { getInitials } from "@/lib/utils";

interface UserResult {
    id: number;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
}

interface AddMemberModalProps {
    tripId: string;
    existingMemberIds?: number[];
    onClose: () => void;
}

export default function AddMemberModal({ tripId, existingMemberIds = [], onClose }: AddMemberModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [invitedIds, setInvitedIds] = useState<Set<number>>(new Set());
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { inviteMemberAsync } = useInviteMember(tripId);

    // Auto-focus the input when the modal opens
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query.trim() || query.trim().length < 2) {
            setResults([]);
            setSearchError(null);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            setSearchError(null);
            try {
                const data = await userApi.searchUsers(query.trim()) as UserResult[];
                setResults(Array.isArray(data) ? data : []);
            } catch (err: any) {
                setSearchError("Could not search users. Is the backend running?");
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const handleInvite = async (user: UserResult) => {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
        try {
            await inviteMemberAsync({ userId: String(user.id), userName: fullName, userEmail: user.email });
            setInvitedIds((prev) => new Set(prev).add(user.id));
        } catch (err: any) {
            // Error is surfaced per-row via inviteError — no global error needed
        }
    };

    const getDisplayName = (user: UserResult) =>
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

    const isAlreadyMember = (userId: number) => existingMemberIds.includes(userId);

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <UserPlus className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Add Member</h2>
                            <p className="text-xs text-slate-500">Invitations must be accepted to join the squad</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Search Input */}
                <div className="px-6 pt-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        {isSearching && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search users by name or email..."
                            className="w-full pl-11 pr-11 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Results Area */}
                <div className="px-6 pb-6 min-h-[200px] max-h-[360px] overflow-y-auto">
                    <AnimatePresence mode="wait">

                        {/* Error */}
                        {searchError && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600"
                            >
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <p className="text-sm">{searchError}</p>
                            </motion.div>
                        )}

                        {/* Empty prompt */}
                        {!query.trim() && !searchError && (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-slate-400"
                            >
                                <Search className="h-10 w-10 mb-3 opacity-30" />
                                <p className="text-sm font-medium">Start typing to search for users</p>
                                <p className="text-xs mt-1">Minimum 2 characters</p>
                            </motion.div>
                        )}

                        {/* No results */}
                        {query.trim().length >= 2 && !isSearching && !searchError && results.length === 0 && (
                            <motion.div
                                key="no-results"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-slate-400"
                            >
                                <UserX className="h-10 w-10 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No users found for "{query}"</p>
                            </motion.div>
                        )}

                        {/* Results list */}
                        {results.length > 0 && (
                            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-1">
                                {results.map((user) => {
                                    const alreadyMember = isAlreadyMember(user.id);
                                    const invited = invitedIds.has(user.id);
                                    const displayName = getDisplayName(user);

                                    return (
                                        <motion.div
                                            key={user.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all"
                                        >
                                            {/* Avatar */}
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                                                {getInitials(displayName)}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">{displayName}</p>
                                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                            </div>

                                            {/* Action */}
                                            {alreadyMember ? (
                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                                                    <Check className="h-3 w-3" />
                                                    Member
                                                </span>
                                            ) : invited ? (
                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                                                    <Check className="h-3 w-3" />
                                                    Invited!
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleInvite(user)}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full transition-all hover:shadow-md hover:shadow-blue-200 active:scale-95"
                                                >
                                                    <UserPlus className="h-3.5 w-3.5" />
                                                    Invite
                                                </button>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
