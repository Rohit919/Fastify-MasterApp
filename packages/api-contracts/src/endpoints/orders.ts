import { API_VERSION, encodeId } from "./common.js";

/**
 * Order endpoint paths (planned).
 *
 * The orders module exists as a placeholder and is NOT yet registered in the
 * API. These paths are defined ahead of implementation so the Admin orders
 * page and future routes share one canonical definition instead of hardcoding
 * strings when the resource lands. Remove this note once orders routes ship.
 */
const ORDERS_BASE = `${API_VERSION}/orders`;

export const ORDER_ENDPOINTS = {
  ROOT: ORDERS_BASE,

  BY_ID: (orderId: string) => `${ORDERS_BASE}/${encodeId(orderId)}`,
  CANCEL: (orderId: string) => `${ORDERS_BASE}/${encodeId(orderId)}/cancel`,

  // Fastify route templates
  ROUTE_BY_ID: `${ORDERS_BASE}/:id`,
  ROUTE_CANCEL: `${ORDERS_BASE}/:id/cancel`,
} as const;
