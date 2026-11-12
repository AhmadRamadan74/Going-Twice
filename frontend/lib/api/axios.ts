import axios, { type AxiosInstance } from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000/api/v1";

/**
 * Shared Axios instance. Interceptors are attached in `interceptors.ts`
 * via `setupInterceptors`.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 20_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

export default apiClient;
