/**
 * Shared API types used across services and interceptors.
 */

export type BackendEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data: T;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiFailure = {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  data?: unknown;

  constructor(
    message: string,
    status = 500,
    errors?: Record<string, string[]>,
    data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.data = data;
  }
}
