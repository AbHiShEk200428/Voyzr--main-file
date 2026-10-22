import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/services/api";
import { useAuth } from "@/components/AuthProvider";
import type { User } from "@/types";

export function useUser(userIdParam?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  
  const userId = userIdParam || (authUser?.id ? String(authUser.id) : null);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => userApi.getUser(userId!) as Promise<User>,
    enabled: !!userId,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<User>) => userApi.updateProfile(userId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
    },
  });

  return {
    user,
    isLoading,
    error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
}
