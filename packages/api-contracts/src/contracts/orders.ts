import { HttpMethod } from "./http.js";
import type { ApiEndpoint } from "./endpoint.js";
import { IdParams } from "./params.js";
import { ORDER_ENDPOINTS } from "../endpoints/orders.js";
import { ErrorCode } from "../common.js";
import { PermissionKeys } from "../rbac.js";
import {
  CreateOrderBody,
  ListOrdersQuery,
  OrderResponse,
  OrdersListResponse,
} from "../orders.js";

export const ORDER_CONTRACTS = {
  LIST: {
    method: HttpMethod.GET,
    path: ORDER_ENDPOINTS.ROOT,
    auth: "required",
    permission: PermissionKeys.OrdersRead,
    query: ListOrdersQuery,
    response: { 200: OrdersListResponse },
    errors: [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.VALIDATION_ERROR,
    ],
    operationId: "orders.list",
    summary: "List visible orders",
    tags: ["Orders"],
  },
  CREATE: {
    method: HttpMethod.POST,
    path: ORDER_ENDPOINTS.ROOT,
    auth: "required",
    permission: PermissionKeys.OrdersCreate,
    body: CreateOrderBody,
    response: { 201: OrderResponse },
    errors: [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.VALIDATION_ERROR,
      ErrorCode.CONFLICT,
    ],
    operationId: "orders.create",
    summary: "Create an order using server-side product prices",
    tags: ["Orders"],
  },
  GET_BY_ID: {
    method: HttpMethod.GET,
    path: ORDER_ENDPOINTS.ROUTE_BY_ID,
    auth: "required",
    permission: PermissionKeys.OrdersRead,
    params: IdParams,
    response: { 200: OrderResponse },
    errors: [ErrorCode.UNAUTHORIZED, ErrorCode.FORBIDDEN, ErrorCode.NOT_FOUND],
    operationId: "orders.get",
    summary: "Get an order",
    tags: ["Orders"],
  },
  CANCEL: {
    method: HttpMethod.POST,
    path: ORDER_ENDPOINTS.ROUTE_CANCEL,
    auth: "required",
    permission: PermissionKeys.OrdersCancel,
    params: IdParams,
    response: { 200: OrderResponse },
    errors: [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.NOT_FOUND,
      ErrorCode.CONFLICT,
    ],
    operationId: "orders.cancel",
    summary: "Cancel a pending order",
    tags: ["Orders"],
  },
} satisfies Record<string, ApiEndpoint>;
