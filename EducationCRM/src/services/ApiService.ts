import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, CancelTokenSource } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

// TEMPORARY FIX: Hardcode the IP address since react-native-config isn't loading .env
// TODO: Fix react-native-config configuration
const API_BASE_URL = Config.API_BASE_URL || 'https://snvs.dpdns.org/api';

// Log the API base URL for debugging
console.log('[ApiService] API_BASE_URL:', API_BASE_URL);
console.log('[ApiService] Config.API_BASE_URL:', Config.API_BASE_URL);
console.log('[ApiService] Using hardcoded fallback for physical device testing');

const TOKEN_KEY = '@education_crm_token';
const REFRESH_TOKEN_KEY = '@education_crm_refresh_token';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

// Request cancellation and deduplication
const pendingRequests = new Map<string, CancelTokenSource>();
const ongoingRequests = new Map<string, Promise<any>>();

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * Generate a unique key for request deduplication
 */
const generateRequestKey = (config: InternalAxiosRequestConfig): string => {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
};

/**
 * Cancel pending request by key
 */
export const cancelRequest = (key: string): void => {
  const source = pendingRequests.get(key);
  if (source) {
    source.cancel('Request cancelled by user');
    pendingRequests.delete(key);
    ongoingRequests.delete(key);
  }
};

/**
 * Cancel all pending requests
 */
export const cancelAllRequests = (): void => {
  pendingRequests.forEach((source) => {
    source.cancel('All requests cancelled');
  });
  pendingRequests.clear();
  ongoingRequests.clear();
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token, handle cancellation and deduplication
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Generate request key for deduplication
    const requestKey = generateRequestKey(config);

    // Check if identical request is already in progress
    const ongoingRequest = ongoingRequests.get(requestKey);
    if (ongoingRequest) {
      if (__DEV__) {
        console.log(`[API Request] Deduplicating request: ${config.method?.toUpperCase()} ${config.url}`);
      }
      // Return the ongoing request instead of making a new one
      throw { __deduplicated: true, promise: ongoingRequest };
    }

    // Create cancel token for this request
    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    pendingRequests.set(requestKey, source);

    // Log request for debugging
    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('[API Request Error]', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors, token refresh, and cleanup
apiClient.interceptors.response.use(
  (response) => {
    // Clean up request tracking
    const requestKey = generateRequestKey(response.config as InternalAxiosRequestConfig);
    pendingRequests.delete(requestKey);
    ongoingRequests.delete(requestKey);

    // Log response for debugging
    if (__DEV__) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError | any) => {
    // Handle deduplicated requests
    if (error.__deduplicated) {
      return error.promise;
    }

    // Handle cancelled requests
    if (axios.isCancel(error)) {
      if (__DEV__) {
        console.log('[API Request] Cancelled:', error.message);
      }
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Clean up request tracking on error
    if (originalRequest) {
      const requestKey = generateRequestKey(originalRequest);
      pendingRequests.delete(requestKey);
      ongoingRequests.delete(requestKey);
    }

    // Log error for debugging
    if (__DEV__) {
      console.error('[API Response Error]', {
        url: originalRequest?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    // Handle 401 Unauthorized - Token expired
    // Skip token refresh for auth endpoints (login, refresh)
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue the request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh token endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token: newToken, refresh_token: newRefreshToken } = response.data.data;

        // Store new tokens
        await AsyncStorage.setItem(TOKEN_KEY, newToken);
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);

        // Update authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        processQueue(null, newToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);

        // Clear tokens and force logout
        await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL, TOKEN_KEY, REFRESH_TOKEN_KEY };
