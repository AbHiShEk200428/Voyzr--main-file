import type { ChatMessage, Trip } from "@/types";

const API_BASE_URL = "/api";

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function request<T>(
  endpoint: string,
  method: RequestMethod = "GET",
  body?: unknown,
  options: FetchOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const token = localStorage.getItem("voyzr_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...options.headers,
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    ...options,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    config.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw new Error(
      `Unable to connect to the server. Please ensure the backend is running.`
    );
  }

  if (!response.ok) {
    // Handle 401 Unauthorized globally
    if (response.status === 401 && !url.includes("/auth/login")) {
      console.warn("Unauthorized request detected, clearing session...");
      localStorage.removeItem("voyzr_token");
      localStorage.removeItem("voyzr_user");
      // Force a page reload to the login page to reset the AuthProvider state
      window.location.href = "/login";
      return Promise.reject(new Error("Session expired. Please login again."));
    }

    let errorMessage = response.statusText;
    let errorDetail = "";
    try {
      const error = await response.json();
      console.error("Backend Error Response Detail:", JSON.stringify(error, null, 2));
      // In Spring, when a controller isn't hit, the body is {error, message, status}
      errorMessage = error.message || error.error || errorMessage;
      // If validation failed, sometimes it's in an 'errors' array
      if (Array.isArray(error.errors)) {
        errorDetail = error.errors.map((e: any) => e.defaultMessage || e.message).join(", ");
      }
    } catch {
      // Response wasn't JSON
    }
    throw new Error(`API Error ${response.status}: ${errorMessage}${errorDetail ? " (" + errorDetail + ")" : ""}`);
  }

  const text = await response.text();
  if (!text || text.trim() === "") {
    return {} as T;
  }

  try {
    const data = JSON.parse(text);
    return data as T;
  } catch {
    throw new Error("Invalid response format from server");
  }
}

// Trip API
export const tripApi = {
  getMyTrips: () => request("/trips/my-trips", "GET"),
  getTrip: (id: string) => request(`/trips/${id}`, "GET"),
  createTrip: (data: any) => {
    const formatDateTime = (val: string) => {
      if (!val) return null;
      // HTML datetime-local inputs usually give YYYY-MM-DDTHH:mm
      // We append :00 to make it a standard ISO local date time string
      if (val.split(":").length === 2) {
        return `${val}:00`;
      }
      return val;
    };

    const payload = {
      name: data.name,
      destination: data.destination,
      destinationLat: data.destinationLat,
      destinationLng: data.destinationLng,
      tripDate: data.startDate, // already "YYYY-MM-DD"
      targetArrivalTime: formatDateTime(data.targetArrivalTime),
      description: data.description || ""
    };

    console.log("SENDING FINAL PAYLOAD:", JSON.stringify(payload, null, 2));
    return request("/trips", "POST", payload);
  },
  updateTrip: (id: string, data: unknown) =>
    request(`/trips/${id}`, "PUT", data),
  deleteTrip: (id: string) => request(`/trips/${id}`, "DELETE"),
  inviteMember: (tripId: string, userId: string, userName: string, userEmail: string) =>
    request(`/trips/${tripId}/invite/${userId}`, "POST", { userName, userEmail }),
  getPendingInvitations: () => request("/trips/invitations/pending", "GET"),
  respondToInvitation: (tripId: string, accept: boolean) =>
    request(`/trips/${tripId}/invitation/respond?accept=${accept}`, "POST"),
  removeMember: (tripId: string, userId: string) =>
    request<void>(`/trips/${tripId}/members/${userId}`, "DELETE"),
  updateMemberRole: (tripId: string, userId: string, role: string) =>
    request<void>(`/trips/${tripId}/members/${userId}/role`, "PUT", { role }),
  updateTripImage: (tripId: string, imageUrl: string) =>
    request<void>(`/trips/${tripId}/image`, "PUT", { imageUrl }),
  joinByCode: (code: string) =>
    request<Trip>(`/trips/join-by-code?code=${code}`, "POST"),
  respondToJoinRequest: (tripId: string, userId: string, accept: boolean) =>
    request<void>(`/trips/${tripId}/join-request/${userId}/respond?accept=${accept}`, "POST"),
  addSideQuest: (tripId: string, quest: any) =>
    request<void>(`/trips/${tripId}/side-quests`, "POST", quest),
  removeSideQuest: (tripId: string, questId: string) =>
    request<void>(`/trips/${tripId}/side-quests/${questId}`, "DELETE"),
  };

export const expenseApi = {
  getTripExpenses: (tripId: string) =>
    request(`/expenses/trip/${tripId}`, "GET"),
  getExpensesByTrips: (tripIds: string[]) =>
    request(`/expenses/bulk?ids=${tripIds.join(",")}`, "GET"),
  createExpense: (data: unknown) => request("/expenses", "POST", data),
  updateExpense: (id: string, data: unknown) =>
    request(`/expenses/${id}`, "PUT", data),
  deleteExpense: (id: string) => request(`/expenses/${id}`, "DELETE"),
  settleExpense: (id: string) => request(`/expenses/${id}/settle`, "PUT"),
  unsettleExpense: (id: string) => request(`/expenses/${id}/unsettle`, "PUT"),
  getExpenseSplits: (id: string) => request(`/expenses/${id}/splits`, "GET"),
  saveExpenseSplits: (id: string, splits: any[]) => request(`/expenses/${id}/splits`, "POST", splits),
};

// User API
export const userApi = {
  register: (data: any) => request("/auth/register", "POST", data),
  login: (data: any) => request("/auth/login", "POST", data),
  searchUsers: (query: string) =>
    request(`/users/search?query=${encodeURIComponent(query)}`, "GET"),
  getUser: (id: string) => request(`/users/${id}`, "GET"),
  updateProfile: (id: string, data: any) => request(`/users/${id}/profile`, "PUT", data),
  // Step 5: Find user by their VOYZR-XXXXXXXX public ID (no auth needed)
  lookupByPublicId: (publicId: string) => request(`/users/public/${encodeURIComponent(publicId)}`, "GET"),
};

// Notification API
export const notificationApi = {
  getNotifications: (userId: string) => request(`/notifications/user/${userId}`, "GET"),
  getUnreadCount: (userId: string) => request(`/notifications/user/${userId}/unread-count`, "GET"),
  markAsRead: (id: string) => request(`/notifications/${id}/read`, "PUT"),
  markAllAsRead: (userId: string) => request(`/notifications/user/${userId}/read-all`, "PUT"),
  deleteNotification: (id: string) => request(`/notifications/${id}`, "DELETE"),
};

// Chat API
export const chatApi = {
  getHistory: (tripId: string | number) =>
    request<ChatMessage[]>(`/chat/history/${tripId}`, "GET"),
  vote: (messageId: string, optionIndex: number, voterEmail: string) =>
    request<ChatMessage>(`/chat/messages/${messageId}/vote`, "POST", { optionIndex, voterEmail }),
  react: (messageId: string, emoji: string, voterEmail: string) =>
    request<ChatMessage>(`/chat/messages/${messageId}/react`, "POST", { emoji, voterEmail }),
};

// Location API
export const locationApi = {
  getSyncReport: (tripId: string | number) => 
    request<any>(`/location/sync/${tripId}`, "GET"),
};

export default {
  tripApi,
  expenseApi,
  userApi,
  chatApi,
  notificationApi,
  locationApi,
};
