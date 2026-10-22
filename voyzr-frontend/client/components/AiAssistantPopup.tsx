import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Send,
  Sparkles,
  User as UserIcon,
  Bot,
  X,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  isAi: boolean;
  timestamp: string; // Store as string for localStorage compatibility
}

const STORAGE_KEY = "voyzr_ai_popup_history";
const MAX_HISTORY = 20;

export function AiAssistantPopup() {
  const location = useLocation();
  const isChatPage = location.pathname === "/chat";
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get user location for context
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/places/geocode?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features[0]) {
              const props = data.features[0].properties;
              const city = props.city || props.town || props.village;
              const country = props.country;
              if (city && country) setUserLocation(`${city}, ${country}`);
              else setUserLocation(props.formatted || `lat:${latitude.toFixed(2)}, lng:${longitude.toFixed(2)}`);
            }
          }
        } catch (e) { console.warn("Popup location geocode failed", e); }
      }, () => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setUserLocation(`Timezone: ${tz}`);
      });
    }
  }, []);

  // Initialize history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved AI history", e);
      }
    } else {
      // Default welcome message
      setMessages([
        {
          id: "welcome",
          content: "Hi! I'm your Voyzr assistant. How can I help with your trip today? 🌍",
          isAi: true,
          timestamp: new Date().toISOString(),
        }
      ]);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const clearHistory = () => {
    const welcome = {
      id: "welcome",
      content: "History cleared! How can I help you now? ✨",
      isAi: true,
      timestamp: new Date().toISOString(),
    };
    setMessages([welcome]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const getFallbackResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes("kochi")) return "Kochi is great! Visit Fort Kochi and the Chinese Fishing Nets. 🚢";
    if (q.includes("munnar")) return "Munnar is beautiful! Check out the tea gardens and Eravikulam Park. 🍵";
    if (q.includes("goa")) return "Goa is perfect for beaches and nightlife! Try Palolem for peace or Baga for parties. 🏖️";
    if (q.includes("shimla")) return "Shimla is a classic! Visit the Mall Road and take the Toy Train. ❄️";
    if (q.includes("hello") || q.includes("hi")) return "Hello! How can I help you plan your trip? 👋";
    return "I'm in a quick-access mode. Ask me about Kochi, Munnar, Goa, or Shimla! 🌍";
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: text,
      isAi: false,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      return updated.slice(-MAX_HISTORY); // Keep only last N messages
    });
    
    setInputValue("");
    setIsLoading(true);

    try {
      const context = userLocation ? `[User Location: ${userLocation}] ` : "";
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `${context}${text}` }),
      });

      let reply = "";
      if (res.ok) {
        const data = await res.json();
        reply = data.reply || "I received your message but couldn't generate a specific response. Could you try rephrasing?";
      } else {
        const errData = await res.json().catch(() => ({}));
        reply = errData.reply || (errData.error?.message ? `AI Error: ${errData.error.message}` : getFallbackResponse(text));
        console.warn(`[AiAssistantPopup] API returned ${res.status}, using fallback/server message.`);
      }

      const aiMsg = {
        id: crypto.randomUUID(),
        content: reply,
        isAi: true,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const updated = [...prev, aiMsg];
        return updated.slice(-MAX_HISTORY);
      });
    } catch (err) {
      const errorMsg = {
        id: crypto.randomUUID(),
        content: getFallbackResponse(text),
        isAi: true,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => {
        const updated = [...prev, errorMsg];
        return updated.slice(-MAX_HISTORY);
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn(
      "fixed right-4 md:right-6 z-50 flex flex-col items-end transition-all duration-500",
      isChatPage ? "bottom-24 md:bottom-24" : "bottom-20 md:bottom-6"
    )}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 sm:w-96 h-[500px] glass-panel rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-blue-600/20 backdrop-blur-md text-white flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
                <span className="font-black uppercase tracking-widest text-[11px] neon-glow">Voyzr AI Intelligence</span>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={clearHistory}
                  title="Clear History"
                  className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 custom-scrollbar" viewportRef={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isAi ? "justify-start" : "justify-end"}`}>
                    <div className={`flex gap-2 max-w-[85%] ${msg.isAi ? "flex-row" : "flex-row-reverse"}`}>
                      <div className={`h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center border border-white/10 ${msg.isAi ? "bg-blue-600/20 text-blue-400" : "bg-slate-700 text-white"}`}>
                        {msg.isAi ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                      </div>
                      <div className={`p-3 rounded-2xl text-[13px] font-medium leading-relaxed ${msg.isAi ? "bg-white/5 text-slate-200 border border-white/5 rounded-tl-none shadow-inner" : "bg-blue-600/80 text-white rounded-tr-none accent-glow"}`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className={`text-[9px] mt-1.5 font-bold uppercase tracking-tighter opacity-40 ${msg.isAi ? "text-slate-400" : "text-white"}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/5 p-3 rounded-2xl rounded-tl-none flex gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}
              className="p-4 border-t border-white/5 bg-black/20 flex gap-2"
            >
              <Input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Direct command..."
                className="flex-1 rounded-xl h-10 text-xs bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:ring-blue-500/50"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={!inputValue.trim() || isLoading} className="h-10 w-10 bg-blue-600 hover:bg-blue-500 shadow-lg accent-glow">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-14 w-14 rounded-full shadow-2xl transition-all duration-300 border border-white/10 ${isOpen ? "bg-slate-800 rotate-90" : "bg-blue-600 hover:scale-110 accent-glow"}`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
