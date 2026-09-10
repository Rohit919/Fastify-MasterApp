import { API_VERSION } from "./common.js";

/**
 * Example module endpoint paths (registered under `/api/v1/examples`).
 */
const EXAMPLES_BASE = `${API_VERSION}/examples`;

export const EXAMPLE_ENDPOINTS = {
  ROOT: EXAMPLES_BASE,
} as const;
