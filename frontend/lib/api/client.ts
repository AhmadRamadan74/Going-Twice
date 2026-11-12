import { apiClient } from "./axios";
import { setupInterceptors } from "./interceptors";

let interceptorsReady = false;

/**
 * Ensures interceptors are registered once (safe for HMR / repeated imports).
 */
export function getApiClient() {
  if (!interceptorsReady) {
    setupInterceptors(apiClient);
    interceptorsReady = true;
  }
  return apiClient;
}

export const api = getApiClient();
