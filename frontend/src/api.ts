// API Service for Dompetrack Backend Integration
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  userId?: string;
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description?: string;
  date: string;
  categoryId?: string;
  category?: Category;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

// Token helper helpers
export const getAccessToken = () => localStorage.getItem('dompetrack_accessToken');
export const getRefreshToken = () => localStorage.getItem('dompetrack_refreshToken');

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('dompetrack_accessToken', accessToken);
  localStorage.setItem('dompetrack_refreshToken', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('dompetrack_accessToken');
  localStorage.removeItem('dompetrack_refreshToken');
  localStorage.removeItem('dompetrack_user');
};

let isRefreshing = false;
let refreshSubscribers: { resolve: (token: string) => void; reject: (err: Error) => void }[] = [];

const subscribeTokenRefresh = (
  resolve: (token: string) => void,
  reject: (err: Error) => void
) => {
  refreshSubscribers.push({ resolve, reject });
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((sub) => sub.resolve(token));
  refreshSubscribers = [];
};

const onRefreshFailed = (error: Error) => {
  refreshSubscribers.forEach((sub) => sub.reject(error));
  refreshSubscribers = [];
};

/**
 * Handle refreshing of JWT tokens when an API call gets 401 Unauthorized.
 */
async function handleTokenRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${refreshToken}`,
    },
  });

  if (!response.ok) {
    clearTokens();
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Refresh token invalid or expired');
  }

  const result = await response.json();
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = result.data || result;
  setTokens(newAccessToken, newRefreshToken);
  return newAccessToken;
}

/**
 * Custom wrapper around fetch to handle API calls with authentication and token rotation.
 */
export async function apiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${BASE_URL}${path}`;
  const accessToken = getAccessToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (response.status === 401 && getRefreshToken()) {
      // If unauthorized and we have a refresh token, try to refresh
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newAccessToken = await handleTokenRefresh();
          isRefreshing = false;
          onRefreshed(newAccessToken);
          
          // Retry the request directly using the new access token
          const retryHeaders = new Headers(options.headers || {});
          if (!retryHeaders.has('Content-Type') && !(options.body instanceof FormData)) {
            retryHeaders.set('Content-Type', 'application/json');
          }
          retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
          const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
          const json = await retryResponse.json();
          if (!retryResponse.ok) {
            throw new Error(json.message || 'API request failed');
          }
          return json.data ?? json;
        } catch (error) {
          isRefreshing = false;
          onRefreshFailed(error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      }

      // Wait for refresh to complete
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(
          (newToken) => {
            const retryHeaders = new Headers(options.headers || {});
            if (!retryHeaders.has('Content-Type') && !(options.body instanceof FormData)) {
              retryHeaders.set('Content-Type', 'application/json');
            }
            retryHeaders.set('Authorization', `Bearer ${newToken}`);
            fetch(url, { ...options, headers: retryHeaders })
              .then(async (res) => {
                const json = await res.json();
                if (!res.ok) {
                  reject(new Error(json.message || 'API request failed'));
                } else {
                  resolve(json.data ?? json);
                }
              })
              .catch((err) => reject(err));
          },
          (err) => {
            reject(err);
          }
        );
      });
    }

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || 'API request failed');
    }

    return json.data ?? json;
  } catch (error: any) {
    console.error(`API Error on ${path}:`, error);
    throw error;
  }
}

// Export specific API calls
export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem('dompetrack_user', JSON.stringify(data.user));
      return data;
    },
    register: async (name: string, email: string, password: string) => {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem('dompetrack_user', JSON.stringify(data.user));
      return data;
    },
    logout: async () => {
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } catch (err) {
        console.warn('Backend logout failed or session already cleared', err);
      } finally {
        clearTokens();
        window.dispatchEvent(new Event('auth-logout'));
      }
    },
  },
  categories: {
    getAll: async (): Promise<Category[]> => {
      return apiRequest('/categories');
    },
    create: async (name: string, icon?: string, color?: string): Promise<Category> => {
      return apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify({ name, icon, color }),
      });
    },
  },
  transactions: {
    getAll: async (month?: number, year?: number): Promise<Transaction[]> => {
      let path = '/transactions';
      const params = new URLSearchParams();
      if (month !== undefined && year !== undefined) {
        params.append('month', String(month));
        params.append('year', String(year));
      }
      if (params.toString()) {
        path += `?${params.toString()}`;
      }
      return apiRequest(path);
    },
    create: async (payload: {
      type: 'INCOME' | 'EXPENSE';
      amount: number;
      description?: string;
      date?: string;
      categoryId?: string;
    }): Promise<Transaction> => {
      return apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    delete: async (id: string): Promise<any> => {
      return apiRequest(`/transactions/${id}`, {
        method: 'DELETE',
      });
    },
    update: async (id: string, payload: {
      type?: 'INCOME' | 'EXPENSE';
      amount?: number;
      description?: string;
      date?: string;
      categoryId?: string;
    }): Promise<Transaction> => {
      return apiRequest(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    getSummary: async (month?: number, year?: number): Promise<{
      income: number;
      expense: number;
      balance: number;
      transactionCount: number;
    }> => {
      let path = '/transactions/summary';
      const params = new URLSearchParams();
      if (month !== undefined && year !== undefined) {
        params.append('month', String(month));
        params.append('year', String(year));
      }
      if (params.toString()) {
        path += `?${params.toString()}`;
      }
      return apiRequest(path);
    },
    getAiInsight: async (month?: number, year?: number): Promise<{ insight: string }> => {
      let path = '/transactions/ai-insight';
      const params = new URLSearchParams();
      if (month !== undefined && year !== undefined) {
        params.append('month', String(month));
        params.append('year', String(year));
      }
      if (params.toString()) {
        path += `?${params.toString()}`;
      }
      return apiRequest(path);
    },
  },
};
