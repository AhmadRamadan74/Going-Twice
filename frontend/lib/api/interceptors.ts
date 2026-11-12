import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { ApiError } from "./types";
import { tokenStorage } from "./token";
import { endpoints } from "./endpoints";

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type Envelope = {
  status?: string;
  message?: string;
  data?: unknown;
  errors?: Record<string, string[]>;
};

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function flushRefreshQueue(token: string | null) {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
}

function getErrorMessage(error: AxiosError<Envelope>): string {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function unwrapEnvelope(response: AxiosResponse) {
  const body = response.data as Envelope | unknown;
  if (
    body &&
    typeof body === "object" &&
    "status" in body &&
    "data" in body
  ) {
    response.data = (body as Envelope).data;
  }
  return response;
}

/**
 * Attach request + response interceptors to the shared Axios client.
 */
export function setupInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenStorage.getAccessToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      }

      return config;
    },
    (error: AxiosError) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response: AxiosResponse) => unwrapEnvelope(response),
    async (error: AxiosError<Envelope>) => {
      const originalRequest = error.config as RetryConfig | undefined;
      const status = error.response?.status;

      if (
        status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.url?.includes(endpoints.auth.refresh) &&
        !originalRequest.url?.includes(endpoints.auth.login) &&
        !originalRequest.url?.includes(endpoints.auth.register) &&
        !originalRequest.url?.includes(endpoints.auth.forgotPassword) &&
        !originalRequest.url?.includes(endpoints.auth.resetPassword)
      ) {
        const refreshToken = tokenStorage.getRefreshToken();

        if (!refreshToken) {
          tokenStorage.clear();
          return Promise.reject(
            new ApiError(
              getErrorMessage(error),
              401,
              error.response?.data?.errors,
              error.response?.data,
            ),
          );
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshQueue.push((token) => {
              if (!token) {
                reject(new ApiError("Session expired. Please sign in again.", 401));
                return;
              }
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(client(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { data } = await client.post<{
            access_token: string;
            refresh_token?: string;
          }>(endpoints.auth.refresh, { refresh_token: refreshToken });

          tokenStorage.setTokens(data.access_token, data.refresh_token);
          flushRefreshQueue(data.access_token);

          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return client(originalRequest);
        } catch (refreshError) {
          flushRefreshQueue(null);
          tokenStorage.clear();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      const apiError = new ApiError(
        getErrorMessage(error),
        status ?? 500,
        error.response?.data?.errors,
        error.response?.data,
      );

      return Promise.reject(apiError);
    },
  );
}
