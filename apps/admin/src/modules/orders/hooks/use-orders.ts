import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrderStatus } from "@app/api-contracts";
import { cancelOrder, getOrders } from "../api/orders";

export function useOrders(page: number, status?: OrderStatus) {
  return useQuery({
    queryKey: ["orders", { page, status }],
    queryFn: () => getOrders({ page, pageSize: 25, status }),
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}
