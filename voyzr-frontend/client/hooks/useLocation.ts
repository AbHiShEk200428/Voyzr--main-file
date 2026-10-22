import { useState, useEffect, useRef, useCallback } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { locationApi } from "@/services/api";

export interface MemberLocation {
  lat: number;
  lng: number;
  status: string;
}

export interface MemberCursor {
  lat: number;
  lng: number;
  userName: string;
}

export interface SyncMemberStatus {
  userId: number;
  userName: string;
  currentEtaText: string;
  recommendedStartTime: string;
  syncMessage: string;
}

export interface SyncReport {
  tripId: number;
  destinationName: string;
  targetArrivalTime: string;
  memberStatus: SyncMemberStatus[];
}

interface LocationUpdate {
  tripId: number | string;
  userId: number | string;
  userName?: string;
  lat: number;
  lng: number;
  status: string;
  type?: 'LOCATION' | 'RALLY_POINT' | 'CURSOR';
}

export function useLocation(tripId: string | number | undefined, userId: string | number | undefined) {
  const [memberLocations, setMemberLocations] = useState<Record<string, MemberLocation>>({});
  const [memberCursors, setMemberCursors] = useState<Record<string, MemberCursor>>({});
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rallyPoint, setRallyPoint] = useState<{ lat: number; lng: number; droppedBy: string } | null>(null);
  const stompClient = useRef<Stomp.Client | null>(null);
  const lastCursorSendRef = useRef<number>(0);

  const sendCursorUpdate = useCallback((lat: number, lng: number, userName: string) => {
    const now = Date.now();
    // 100ms throttle for cursor updates to keep network light
    if (now - lastCursorSendRef.current < 100) return;
    
    if (stompClient.current && isConnected && tripId && userId) {
      stompClient.current.send("/app/location.update", {}, JSON.stringify({
        tripId,
        userId,
        userName,
        lat,
        lng,
        status: "ACTIVE",
        type: 'CURSOR'
      }));
      lastCursorSendRef.current = now;
    }
  }, [isConnected, tripId, userId]);

  const fetchSyncReport = useCallback(async () => {
    if (!tripId) return;
    try {
      const data = await locationApi.getSyncReport(tripId);
      setSyncReport(data);
    } catch (e) {
      console.error("Failed to fetch sync report", e);
    }
  }, [tripId]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!tripId) return;

    // Use relative path to hit the Vite/Express proxy
    const socket = new SockJS("/ws-location");
    const client = Stomp.over(socket);
    client.debug = () => {}; // Disable logging in production

    const connectCallback = () => {
      setIsConnected(true);
      
      // Subscribe to trip location updates
      client.subscribe(`/topic/location/${tripId}`, (msg) => {
        try {
          const update = JSON.parse(msg.body);
          const type = update.type || 'LOCATION'; // Default to LOCATION for legacy
          
          if (type === 'RALLY_POINT') {
            setRallyPoint(update.data);
          } else if (type === 'CURSOR') {
            const cursorUpdate: LocationUpdate = update;
            // Filter out our own cursor echo
            if (String(cursorUpdate.userId) !== String(userId)) {
              setMemberCursors((prev) => ({
                ...prev,
                [cursorUpdate.userId]: { lat: cursorUpdate.lat, lng: cursorUpdate.lng, userName: cursorUpdate.userName || "Unknown Operative" }
              }));
            }
          } else if (type === 'LOCATION') {
            const locUpdate: LocationUpdate = update;
            // Filter out our own location echo to prevent jitter
            if (String(locUpdate.userId) !== String(userId)) {
              setMemberLocations((prev) => ({
                ...prev,
                [locUpdate.userId]: { lat: locUpdate.lat, lng: locUpdate.lng, status: locUpdate.status }
              }));
            }
            
            // Refresh sync report when someone updates their location (debounced)
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
              fetchSyncReport();
            }, 5000);
          }
        } catch (err) {
          console.error("Error parsing location update:", err);
        }
      });

      stompClient.current = client;
    };

    const errorCallback = (error: any) => {
      console.error("STOMP error:", error);
      setIsConnected(false);
    };

    const token = localStorage.getItem("voyzr_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    client.connect(headers, connectCallback, errorCallback);

    // Initial fetch
    fetchSyncReport();

    // Auto-update sync report every 30 seconds
    const interval = setInterval(fetchSyncReport, 30000);

    return () => {
      console.log(`[useLocation] Cleaning up for trip ${tripId}`);
      if (stompClient.current && stompClient.current.connected) {
        stompClient.current.disconnect(() => {});
      }
      setIsConnected(false);
      clearInterval(interval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [tripId, userId, fetchSyncReport]);

  const sendUpdate = useCallback((lat: number, lng: number, status: string = "ACTIVE") => {
    if (stompClient.current && isConnected && tripId && userId) {
      const update: LocationUpdate = {
        tripId,
        userId,
        lat,
        lng,
        status,
        type: 'LOCATION'
      };
      stompClient.current.send("/app/location.update", {}, JSON.stringify(update));
    }
  }, [isConnected, tripId, userId]);

  const dropRallyPoint = useCallback((lat: number, lng: number, userName: string) => {
    if (stompClient.current && isConnected && tripId) {
      const update = { 
        tripId, 
        userId, 
        type: 'RALLY_POINT',
        data: { lat, lng, droppedBy: userName }
      };
      stompClient.current.send("/app/location.update", {}, JSON.stringify(update));
    }
  }, [isConnected, tripId, userId]);

  const clearRallyPoint = useCallback(() => {
    if (stompClient.current && isConnected && tripId) {
      const update = { 
        tripId, 
        userId, 
        type: 'RALLY_POINT',
        data: null
      };
      stompClient.current.send("/app/location.update", {}, JSON.stringify(update));
    }
  }, [isConnected, tripId, userId]);

  return { 
    memberLocations, 
    memberCursors,
    syncReport, 
    isConnected, 
    sendUpdate, 
    sendCursorUpdate,
    refreshSync: fetchSyncReport,
    rallyPoint,
    dropRallyPoint,
    clearRallyPoint
  };
}
