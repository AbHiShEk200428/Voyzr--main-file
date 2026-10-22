import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { Trip, CreateTripRequest, ApiResponse } from "@/types";
import { tripApi } from "@/services/api";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

export function useTrips() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const {
    data: trips = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const response = await tripApi.getMyTrips() as ApiResponse<Trip[]>;
      return response.data || [];
    },
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });

  const createTripMutation = useMutation({
    mutationFn: async (data: CreateTripRequest) => {
      const response = await tripApi.createTrip(data) as ApiResponse<Trip>;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Mission registered successfully");
    },
    onError: (err: any) => {
      toast.error(`Deployment failed: ${err.message}`);
    }
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await tripApi.deleteTrip(id) as ApiResponse<void>;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Mission aborted and purged from records");
    },
    onError: (err: any) => {
      console.error("DELETE TRIP ERROR:", err);
      toast.error(`Purge failed: ${err.message}`);
    }
  });

  const leaveTripMutation = useMutation({
    mutationFn: async ({ tripId, userId }: { tripId: string, userId: string }) => {
      const response = await tripApi.removeMember(tripId, userId) as any;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("You have successfully left the trip");
    },
    onError: (err: any) => {
      toast.error(`Failed to leave trip: ${err.message}`);
    }
  });

  return {
    trips,
    isLoading,
    error,
    createTrip: createTripMutation.mutate,
    isCreating: createTripMutation.isPending,
    deleteTrip: deleteTripMutation.mutate,
    deleteTripAsync: deleteTripMutation.mutateAsync,
    isDeleting: deleteTripMutation.isPending,
    leaveTrip: leaveTripMutation.mutate,
    isLeaving: leaveTripMutation.isPending,
  };
}

export function useTrip(id: string) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const updateTripMutation = useMutation({
    mutationFn: async (data: Partial<Trip>) => {
      const response = await tripApi.updateTrip(id, data) as ApiResponse<Trip>;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async () => {
      const response = await tripApi.deleteTrip(id) as ApiResponse<void>;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Mission aborted and purged from records");
    },
    onError: (err: any) => {
      console.error("DELETE TRIP ERROR:", err);
      toast.error(`Purge failed: ${err.message}`);
    }
  });

  return {
    ...useQuery({
      queryKey: ["trip", id],
      queryFn: async () => {
        const response = await tripApi.getTrip(id) as ApiResponse<Trip>;
        return response.data;
      },
      enabled: !!id && isAuthenticated,
      placeholderData: keepPreviousData,
    }),
    updateTrip: updateTripMutation.mutate,
    isUpdating: updateTripMutation.isPending,
    deleteTrip: deleteTripMutation.mutate,
    isDeleting: deleteTripMutation.isPending,
  };
}

export function useInviteMember(tripId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ userId, userName, userEmail }: { userId: string; userName: string; userEmail: string }) => {
      return tripApi.inviteMember(tripId, userId, userName, userEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
  });

  return {
    inviteMember: mutation.mutate,
    inviteMemberAsync: mutation.mutateAsync,
    isInviting: mutation.isPending,
    inviteError: mutation.error,
  };
}

export function usePendingInvitations() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["pending-invitations"],
    queryFn: async () => {
      const response = await tripApi.getPendingInvitations() as ApiResponse<Trip[]>;
      return response.data || [];
    },
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ tripId, accept }: { tripId: string; accept: boolean }) => {
      return tripApi.respondToInvitation(tripId, accept);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });

  return {
    invitations,
    isLoading,
    respondToInvitation: respondMutation.mutate,
    isResponding: respondMutation.isPending,
  };
}

export function useRemoveMember(tripId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (userId: string) => {
      return tripApi.removeMember(tripId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });

  return {
    removeMember: mutation.mutate,
    removeMemberAsync: mutation.mutateAsync,
    isRemoving: mutation.isPending,
  };
}

export function useJoinRequests(tripId: string) {
  const queryClient = useQueryClient();

  const respondMutation = useMutation({
    mutationFn: async ({ userId, accept }: { userId: string; accept: boolean }) => {
      return tripApi.respondToJoinRequest(tripId, userId, accept);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
  });

  return {
    respondToJoinRequest: respondMutation.mutate,
    isResponding: respondMutation.isPending,
  };
}
