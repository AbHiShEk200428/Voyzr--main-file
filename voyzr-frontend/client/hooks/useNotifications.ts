import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/services/api";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'trip' | 'chat' | 'expense' | 'system';
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

const CURRENT_USER_ID = "1"; // Default for now

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["notifications", CURRENT_USER_ID],
    queryFn: async () => {
      const data = await notificationApi.getNotifications(CURRENT_USER_ID);
      return data as Notification[];
    },
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread", CURRENT_USER_ID],
    queryFn: async () => {
      return await notificationApi.getUnreadCount(CURRENT_USER_ID) as number;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", CURRENT_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread", CURRENT_USER_ID] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(CURRENT_USER_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", CURRENT_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread", CURRENT_USER_ID] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", CURRENT_USER_ID] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.markAllAsRead,
    deleteNotification: deleteMutation.mutate,
  };
}
