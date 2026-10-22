export interface Activity {
  id: string;
  tripId: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  location?: string;
  lat?: number;
  lng?: number;
  type: "TRANSPORT" | "ACCOMMODATION" | "SIGHTSEEING" | "DINING" | "ACTIVITY" | "OTHER" | "SIDE_QUEST";
}

export interface SideQuest {
  id: string;
  name: string;
  address: string;
  description: string;
  category: string;
  imageUrl: string;
  lat: number;
  lng: number;
  type: 'FEAST' | 'LANDSCAPE' | 'INTEL';
  status: 'SCOUTED' | 'ACTIVE' | 'COMPLETED' | 'SKIPPED';
}

// Trip Types
export interface Trip {
  id: string;
  name: string;
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
  tripDate: string; // From backend LocalDate
  targetArrivalTime?: string;
  description: string;
  imageUrl?: string;
  status: "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";
  memberCount: number;
  inviteCode?: string;
  myRole?: "ORGANIZER" | "MEMBER";
  organizerName: string;
  members: TripMember[];
  sideQuests?: SideQuest[];
  createdAt: string;
}

export interface TripMember extends User {
  role: "ORGANIZER" | "CO_ADMIN" | "MEMBER";
  joinedAt: string;
  latitude?: number;
  longitude?: number;
  lastUpdated?: string;
  etaMinutes?: number;
  distanceKm?: number;
  recommendedStartTime?: string;
  eta?: string;
}

export interface CreateTripRequest {
  name: string;
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
  targetArrivalTime?: string;
  description: string;
  startDate: string;
}

// User Types
export interface User {
  id: string;
  userId?: string; // Some parts of the app might use userId
  userName?: string;
  userEmail?: string;
  name: string;
  email: string;
  avatar?: string;
}

// Expense Types
export interface Expense {
  id: string;
  tripId: number;
  userId: number;
  description: string;
  amount: number;
  paidBy: string;
  category: string;
  notes?: string;
  receiptUrl?: string;
  settlementStatus: "PENDING" | "SETTLED";
  splitType: "EQUAL" | "CUSTOM";
  splits?: ExpenseSplit[];
  timestamp: string;
}

export interface ExpenseSplit {
  id?: string;
  expenseId?: string;
  userId?: number;
  userName: string;
  userEmail?: string;
  owedAmount: number;
  isPaid: boolean;
}

// Chat Types
export interface ChatMessage {
  id: string;
  tripId: string | number;
  senderName: string;
  senderEmail: string;
  content: string;
  timestamp: string;
  isAi: boolean;
  type?: "TEXT" | "IMAGE" | "LINK_PREVIEW" | "POLL" | "SYSTEM" | "SANDBOX_ITEM" | "LOCATION" | "DOCUMENT";
  imageUrl?: string;
  metadata?: Record<string, any>;
  reactions?: Record<string, string[]>; // emoji -> list of user emails
}

export interface LocationUpdate {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  status?: number;
}
