import type { ChatMessage, LocationUpdate } from "@/types";

const WS_BASE_URL = "ws://localhost:8080";

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Map<string, (data: unknown) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(tripId: string) {
    this.url = `${WS_BASE_URL}/ws-voyzr?tripId=${tripId}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const type = data.type || "message";
            const handler = this.messageHandlers.get(type);
            if (handler) {
              handler(data.payload);
            }
          } catch (e) {
            console.error("Failed to parse WebSocket message:", e);
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("WebSocket disconnected");
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      setTimeout(() => {
        this.connect().catch((e) => console.error("Reconnection failed:", e));
      }, this.reconnectDelay);
    }
  }

  sendMessage(
    message: ChatMessage
  ): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "chat.message",
          payload: message,
        })
      );
    }
  }

  sendLocationUpdate(location: LocationUpdate): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "location.update",
          payload: location,
        })
      );
    }
  }

  onMessage(handler: (message: ChatMessage) => void): void {
    this.messageHandlers.set("chat.message", handler as (data: unknown) => void);
  }

  onLocationUpdate(handler: (location: LocationUpdate) => void): void {
    this.messageHandlers.set(
      "location.update",
      handler as (data: unknown) => void
    );
  }

  onError(handler: (error: Event) => void): void {
    if (this.ws) {
      this.ws.onerror = handler;
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export default WebSocketService;
