import React, { useState, useRef, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import {
  Send,
  Sparkles,
  User as UserIcon,
  Bot,
  Plane,
  Compass,
  Map as MapIcon,
  HelpCircle,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  content: string;
  isAi: boolean;
  timestamp: string;
}

const STORAGE_KEY = "voyzr_ai_page_history";
const MAX_HISTORY = 20;

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex justify-start"
    >
      <div className="flex gap-4 max-w-[85%]">
        <div className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-md bg-indigo-600">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="rounded-2xl px-5 py-4 shadow-sm border bg-white border-indigo-100 rounded-tl-none flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function AiAssistant() {
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialPromptProcessed = useRef(false);

  // Get user location on mount
  useEffect(() => {
    // Try Geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            // Primary: Geoapify
            const apiKey = "6de209a5add94a398bfea16528c7981b";
            const res = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${apiKey}`);
            
            if (res.ok) {
              const data = await res.json();
              if (data.features && data.features[0]) {
                const props = data.features[0].properties;
                const city = props.city || props.town || props.village;
                const country = props.country;
                if (city && country) {
                  setUserLocation(`${city}, ${country}`);
                  return;
                }
              }
            }
            
            // Fallback: Nominatim (OpenStreetMap)
            const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`);
            if (fallbackRes.ok) {
              const data = await fallbackRes.json();
              const city = data.address.city || data.address.town || data.address.village;
              const country = data.address.country;
              if (city && country) {
                setUserLocation(`${city}, ${country}`);
              } else {
                setUserLocation(data.display_name.split(',').slice(0, 2).join(','));
              }
            }
          } catch (e) {
            console.warn("[AiAssistant] Location detection fallback activated.");
            setUserLocation(`lat:${latitude.toFixed(2)}, lng:${longitude.toFixed(2)}`);
          }
        },
        (err) => {
          console.warn("Geolocation permission denied or failed, using timezone hint", err);
          // Fallback to timezone
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setUserLocation(`Timezone: ${tz}`);
        }
      );
    } else {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserLocation(`Timezone: ${tz}`);
    }
  }, []);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved AI history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Handle incoming prompt from navigation state
  useEffect(() => {
    const state = location.state as { prompt?: string };
    if (state?.prompt && !initialPromptProcessed.current) {
      initialPromptProcessed.current = true;
      sendMessage(state.prompt);
      // Clear location state to prevent re-sending on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
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
      return updated.slice(-MAX_HISTORY);
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
        console.warn(`[AiAssistant] API returned ${res.status}, using fallback/server message.`);
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        content: reply,
        isAi: true,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const updated = [...prev, aiMessage];
        return updated.slice(-MAX_HISTORY);
      });
    } catch (err) {
      console.error("[AiAssistant] Fetch error:", err);
      setMessages((prev) => {
        const updated = [...prev, {
          id: crypto.randomUUID(),
          content: getFallbackResponse(text),
          isAi: true,
          timestamp: new Date().toISOString(),
        }];
        return updated.slice(-MAX_HISTORY);
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes("kochi")) return "Kochi (Cochin) is a beautiful coastal city! You should visit the Fort Kochi area, see the Chinese Fishing Nets, and definitely catch a Kathakali performance at the Kerala Kathakali Centre. 🌴🚢";
    if (q.includes("munnar")) return "Munnar is tea heaven! Don't miss the Eravikulam National Park, Mattupetty Dam, and the Tea Museum. The views from Top Station are also breathtaking! 🍵🏔️";
    if (q.includes("goa")) return "Goa is all about sun, sand, and fun! South Goa has quieter beaches like Palolem, while North Goa is great for nightlife (Baga, Anjuna). Don't forget the Basilica of Bom Jesus in Old Goa! 🏖️🍹";
    if (q.includes("shimla")) return "Shimla is a classic hill station! Pack warm clothes even in summer. The Mall Road, Jakhu Temple, and a ride on the Kalka-Shimla Toy Train are absolute musts! ❄️🚂";
    if (q.includes("attraction") || q.includes("place")) return "There are so many great places to visit! Are you looking for nature, history, or nightlife? Let me know a city and I'll give you specific suggestions. 📍🗺️";
    if (q.includes("hello") || q.includes("hi")) return "Hello there! I'm your Voyzr AI assistant. I'm currently in a limited offline mode, but I can still tell you about Kochi, Munnar, Goa, or Shimla! How can I help? 👋✨";
    return "I'm currently having a bit of trouble connecting to my main brain (Gemini). I can still help you with travel tips for popular destinations in India if you ask! 🌍💡";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const quickPrompts = [
    { icon: Plane, label: "Trip ideas for Kochi", query: "Can you give me trip ideas for Kochi?" },
    { icon: Compass, label: "Top attractions in Munnar", query: "What are the top attractions in Munnar?" },
    { icon: MapIcon, label: "Plan a weekend in Goa", query: "Help me plan a weekend trip to Goa!" },
    { icon: HelpCircle, label: "Packing list for Shimla", query: "What should I pack for a trip to Shimla?" },
  ];

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">
      <Sidebar />
      <main className="md:ml-64 flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <div className="bg-white p-6 border-b border-slate-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 accent-glow">
              <Sparkles className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Voyzr AI Assistant</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Online and Ready
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearHistory}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"
          >
            <Trash2 className="h-4 w-4" />
            Clear Chat
          </Button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
          <ScrollArea className="flex-1 p-8 custom-scrollbar" viewportRef={scrollRef}>
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Empty state */}
              {messages.length === 0 && !isLoading && (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="h-24 w-24 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl flex items-center justify-center mb-8 animate-float">
                    <Bot className="h-12 w-12 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">AI Travel Assistant</h3>
                  <p className="text-slate-500 mt-2 max-w-md font-bold uppercase tracking-widest text-[11px]">
                    Helping you plan your next adventure with smart travel insights.
                  </p>
                  <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt.query)}
                        className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-blue-50 hover:border-blue-200 transition-all text-left flex items-center gap-4 group"
                      >
                        <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <prompt.icon className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900">
                          {prompt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <AnimatePresence>
                {messages.map((msg) => {
                  const isAi = msg.isAi;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: isAi ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${isAi ? "justify-start" : "justify-end"}`}
                    >
                      <div className={`flex gap-4 max-w-[85%] ${isAi ? "flex-row" : "flex-row-reverse"}`}>
                        <div className={`h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md border border-slate-200 ${isAi ? "bg-blue-50 text-blue-600" : "bg-slate-900 text-white"}`}>
                          {isAi ? <Bot className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                        </div>
                        <div className={`space-y-2 ${isAi ? "" : "items-end text-right"}`}>
                          <div className={`rounded-2xl px-6 py-4 shadow-md border ${isAi ? "bg-white text-slate-800 border-slate-200 rounded-tl-none" : "bg-blue-600 text-white border-blue-500 rounded-tr-none accent-glow"}`}>
                            <p className="text-[14px] font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          </div>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] px-2">
                            {isAi ? "AI" : "YOU"} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Typing indicator */}
              <AnimatePresence>{isLoading && <TypingIndicator />}</AnimatePresence>
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-8 bg-white border-t border-slate-200">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit} className="flex gap-4">
                <div className="relative flex-1">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask me anything about your trip..."
                    disabled={isLoading}
                    className="h-14 pl-6 pr-14 bg-slate-50 border-slate-200 rounded-2xl text-[14px] focus-visible:ring-blue-500/30 text-slate-900 placeholder:text-slate-400 font-medium"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="h-14 w-14 rounded-2xl p-0 bg-blue-600 hover:bg-blue-500 shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  <Send className="h-6 w-6 text-white" />
                </Button>
              </form>
              <p className="mt-4 text-[9px] font-black text-slate-400 text-center uppercase tracking-widest">
                Powered by Gemini · Smart Travel Planning Enabled
              </p>
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
