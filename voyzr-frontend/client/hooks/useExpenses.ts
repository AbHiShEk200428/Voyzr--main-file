import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { Expense } from "@/types";
import { expenseApi } from "@/services/api";

export function useTripExpenses(tripId: string) {
  return useQuery({
    queryKey: ["expenses", tripId],
    queryFn: () => expenseApi.getTripExpenses(tripId) as Promise<Expense[]>,
    enabled: !!tripId,
    placeholderData: keepPreviousData,
  });
}

export function useAllExpenses(tripIds: string[]) {
  const sortedIds = [...tripIds].sort().join(",");
  return useQuery({
    queryKey: ["expenses", "all", sortedIds],
    queryFn: () => expenseApi.getExpensesByTrips(tripIds) as Promise<Expense[]>,
    enabled: tripIds.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown) => expenseApi.createExpense(data),
    onSuccess: (_, variables) => {
      const tripId = (variables as { tripId: string }).tripId;
      queryClient.invalidateQueries({ queryKey: ["expenses", tripId] });
      queryClient.invalidateQueries({ queryKey: ["expenses", "all"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => expenseApi.deleteExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useSettleExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string, action: "settle" | "unsettle" }) => 
      action === "settle" ? expenseApi.settleExpense(id) : expenseApi.unsettleExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    }
  });
}

export function useExpenseSplits(expenseId: string | undefined) {
  return useQuery({
    queryKey: ["expenses", "splits", expenseId],
    queryFn: () => expenseApi.getExpenseSplits(expenseId!),
    enabled: !!expenseId,
  });
}

export function useSaveSplits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, splits }: { id: string, splits: any[] }) => expenseApi.saveExpenseSplits(id, splits),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expenses", "splits", variables.id] });
    }
  });
}
