import { apiClient } from "@/lib/api-client";
import {
  API_CONTRACTS,
  type OrderResponse,
  type OrdersListResponse,
  type OrderStatus,
} from "@app/api-contracts";

export function getOrders(query: {
  page: number;
  pageSize: number;
  status?: OrderStatus;
}) {
  return apiClient.request<OrdersListResponse>(API_CONTRACTS.ORDERS.LIST, {
    query,
  });
}

export async function cancelOrder(id: string) {
  const response = await apiClient.request<OrderResponse>(
    API_CONTRACTS.ORDERS.CANCEL,
    {
      params: { id },
    },
  );
  return response.data;
}
