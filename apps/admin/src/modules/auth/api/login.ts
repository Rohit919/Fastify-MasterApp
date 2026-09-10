import { apiClient } from "@/lib/api-client";
import {
  API_ENDPOINTS,
  type LoginBody,
  type AuthResponse,
} from "@app/api-contracts";

/** Data payload the API returns inside the success envelope. */
type LoginData = AuthResponse["data"];

export function login(body: LoginBody): Promise<LoginData> {
  // anonymous = true — no bearer token on the login request
  return apiClient.post<LoginData>(API_ENDPOINTS.AUTH.LOGIN, body, true);
}
