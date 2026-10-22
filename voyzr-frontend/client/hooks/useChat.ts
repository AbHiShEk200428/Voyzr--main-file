import { useState, useEffect, useRef, useCallback } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import type { ChatMessage } from "@/types";
import { chatApi } from "@/services/api";

export interface UseChatOptions {
    /** The currently logged-in user's name */
    senderName: string;
    /** The currently logged-in user's email */
    senderEmail: string;
    /** Current trip context */
    tripName?: string;
    /** Current trip destination */
    destination?: string;
    /** User's current physical location (city/country) */
    userLocation?: string;
}

export interface UseChatReturn {
    messages: ChatMessage[];
    isConnected: boolean;
    /** null = no error, string = human-readable error */
    connectionError: string | null;
    sendMessage: (content: string, type?: string, imageUrl?: string, metadata?: Record<string, any>) => void;
    sendTypingStatus: (isTyping: boolean) => void;
    /** True while the AI is computing a response (optimistic) */
    isAiTyping: boolean;
    /** List of users currently typing */
    typingUsers: string[];
}

const MAX_RECONNECT_ATTEMPTS = 3;
const AI_TYPING_KEYWORDS = ["ai", "attraction", "place", "visit"];

/**
 * Manages a STOMP-over-SockJS WebSocket connection for a specific trip chat.
 * Automatically:
 *  - Connects when tripId is truthy
 *  - Fetches message history
 *  - Subscribes to /topic/chat/{tripId}
 *  - Reconnects on failure (exponential back-off, up to MAX_RECONNECT_ATTEMPTS)
 *  - Disconnects and cleans up on tripId change or unmount
 */
export function useChat(
    tripId: string | number | null | undefined,
    options: UseChatOptions
): UseChatReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    const stompClientRef = useRef<Stomp.Client | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep options in a ref so the connect closure doesn't become stale
    const optionsRef = useRef(options);
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    const connect = useCallback((id: string | number) => {
        const socket = new SockJS("/ws-voyzr");
        const client = Stomp.over(socket);
        client.debug = () => { }; // suppress STOMP frame noise in console

        const token = localStorage.getItem("voyzr_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        client.connect(
            headers,
            () => {
                // ── Connected ────────────────────────────────────────────────────────
                stompClientRef.current = client;
                reconnectAttemptsRef.current = 0;
                setIsConnected(true);
                setConnectionError(null);

                // Fetch history
                chatApi
                    .getHistory(id)
                    .then((history) => setMessages(history))
                    .catch((err) =>
                        console.warn("[useChat] Failed to fetch chat history:", err)
                    );

                // Subscribe to real-time messages
                client.subscribe(`/topic/chat/${id}`, (frame) => {
                    try {
                        const incoming: ChatMessage = JSON.parse(frame.body);
                        
                        // Handle message updates (like reactions/votes) or new messages
                        setMessages((prev) => {
                            const existingIdx = prev.findIndex(m => m.id === incoming.id);
                            if (existingIdx !== -1) {
                                // Update existing message
                                const updated = [...prev];
                                updated[existingIdx] = incoming;
                                return updated;
                            }
                            return [...prev, incoming];
                        });
                        
                        // Clear AI typing indicator when AI message arrives
                        if (incoming.isAi) {
                            setIsAiTyping(false);
                        }
                    } catch (e) {
                        console.error("[useChat] Failed to parse message:", e);
                    }
                });

                // Subscribe to typing indicators
                client.subscribe(`/topic/chat/${id}/typing`, (frame) => {
                    try {
                        const data = JSON.parse(frame.body);
                        const { senderName, isTyping } = data;
                        if (senderName === optionsRef.current.senderName) return;

                        setTypingUsers((prev) => {
                            if (isTyping) {
                                if (prev.includes(senderName)) return prev;
                                return [...prev, senderName];
                            } else {
                                return prev.filter(u => u !== senderName);
                            }
                        });
                    } catch (e) {
                        console.error("[useChat] Failed to parse typing status:", e);
                    }
                });
            },
            (error: string | Stomp.Frame) => {
                // ── Connection Failed ────────────────────────────────────────────────
                const errorMsg = typeof error === "string" ? error : error.toString();
                console.error("[useChat] STOMP error:", errorMsg);
                setIsConnected(false);
                stompClientRef.current = null;

                if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttemptsRef.current++;
                    const delay = 2000 * reconnectAttemptsRef.current; // 2s, 4s, 6s
                    console.log(
                        `[useChat] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
                    );
                    reconnectTimerRef.current = setTimeout(() => connect(id), delay);
                } else {
                    setConnectionError(
                        "Unable to connect to chat. Please refresh the page."
                    );
                }
            }
        );
    }, []);

    // ── Main effect: connect when tripId changes ─────────────────────────────
    useEffect(() => {
        if (!tripId) return;

        // Reset state for new trip
        setMessages([]);
        setIsConnected(false);
        setConnectionError(null);
        setIsAiTyping(false);
        reconnectAttemptsRef.current = 0;

        // Disconnect any previous client
        clearReconnectTimer();
        if (stompClientRef.current) {
            try {
                stompClientRef.current.disconnect(() => { });
            } catch (_) { }
            stompClientRef.current = null;
        }

        connect(tripId);

        return () => {
            clearReconnectTimer();
            if (stompClientRef.current) {
                try {
                    stompClientRef.current.disconnect(() => {
                        setIsConnected(false);
                    });
                } catch (_) { }
                stompClientRef.current = null;
            }
        };
    }, [tripId, connect, clearReconnectTimer]);

    // ── Send a message via STOMP ─────────────────────────────────────────────
    const sendMessage = useCallback(
        (content: string, type: string = "TEXT", imageUrl?: string, metadata?: Record<string, any>) => {
            if (!stompClientRef.current || !tripId || (!content.trim() && !imageUrl)) return;

            const payload = {
                tripId,
                senderName: optionsRef.current.senderName,
                senderEmail: optionsRef.current.senderEmail,
                content: content.trim(),
                isAi: false,
                type,
                imageUrl,
                metadata: metadata || {}
            };

            // Send the user's message
            stompClientRef.current.send(
                "/app/chat.send",
                {},
                JSON.stringify(payload)
            );

            const lowerContent = content.toLowerCase();
            const isBotMentioned = lowerContent.includes("@bot") || lowerContent.includes("@ai") || lowerContent.includes("@voyzr");

            // Show AI typing indicator if bot is explicitly mentioned or keywords are found
            if (type === "TEXT" && (isBotMentioned || AI_TYPING_KEYWORDS.some((kw) => lowerContent.includes(kw)))) {
                setIsAiTyping(true);
                // The backend ChatController/AiChatService will now handle the response.
                // We'll auto-clear the indicator if no AI message arrives within 10s.
                setTimeout(() => setIsAiTyping(false), 10000);
            }
        },
        [tripId]
    );

    // ── Send typing status via STOMP ─────────────────────────────────────────
    const sendTypingStatus = useCallback(
        (isTyping: boolean) => {
            if (!stompClientRef.current || !tripId) return;

            stompClientRef.current.send(
                "/app/chat.typing",
                {},
                JSON.stringify({
                    tripId,
                    senderName: optionsRef.current.senderName,
                    isTyping
                })
            );
        },
        [tripId]
    );

    return { messages, isConnected, connectionError, sendMessage, sendTypingStatus, isAiTyping, typingUsers };
}
