/**
 * VieTool API Client
 * HTTP client for connecting to PHP backend on cPanel hosting
 */

// API Configuration - Change this to your cPanel domain
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-domain.com/api';

// Token storage
const TOKEN_KEY = 'vietool_token';
const USER_KEY = 'vietool_user';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
  pagination?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: 'admin' | 'user';
  status: 'active' | 'suspended' | 'banned';
  wallet_balance?: number;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
  expires_in: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Set token
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  // Clear token
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Get stored user
  getStoredUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Set user
  setStoredUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // Check if logged in
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Make API request
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/${endpoint}`.replace(/\/+/g, '/').replace(':/', '://');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 401 - clear auth
        if (response.status === 401) {
          this.clearToken();
        }
        throw new ApiError(data.message || 'Request failed', response.status, data);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error', 0, null);
    }
  }

  // GET request
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>(`${endpoint}${queryString}`, { method: 'GET' });
  }

  // POST request
  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // PUT request
  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // DELETE request
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ==================== AUTH ====================

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.post<AuthResponse>('auth/login', { email, password });
    if (response.success && response.data) {
      this.setToken(response.data.access_token);
      this.setStoredUser(response.data.user);
    }
    return response;
  }

  async register(data: {
    email: string;
    password: string;
    full_name: string;
    username?: string;
  }): Promise<ApiResponse<AuthResponse>> {
    const response = await this.post<AuthResponse>('auth/register', data);
    if (response.success && response.data) {
      this.setToken(response.data.access_token);
      this.setStoredUser(response.data.user);
    }
    return response;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.get<User>('auth/me');
    if (response.success && response.data) {
      this.setStoredUser(response.data);
    }
    return response;
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.put<User>('auth/me', data);
    if (response.success && response.data) {
      this.setStoredUser(response.data);
    }
    return response;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    return this.post('auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  async logout(): Promise<void> {
    try {
      await this.post('auth/logout');
    } catch {
      // Ignore errors
    }
    this.clearToken();
  }

  // ==================== PRODUCTS ====================

  async getProducts(params?: {
    page?: number;
    limit?: number;
    category_id?: string;
    search?: string;
    featured?: boolean;
  }): Promise<ApiResponse<any[]>> {
    return this.get('products', params as Record<string, any>);
  }

  async getProduct(idOrSlug: string): Promise<ApiResponse<any>> {
    return this.get(`products/${idOrSlug}`);
  }

  async getProductAssets(productId: string): Promise<ApiResponse<any[]>> {
    return this.get(`products/${productId}/assets`);
  }

  // ==================== CATEGORIES ====================

  async getCategories(): Promise<ApiResponse<any[]>> {
    return this.get('categories');
  }

  async getCategory(idOrSlug: string): Promise<ApiResponse<any>> {
    return this.get(`categories/${idOrSlug}`);
  }

  // ==================== SETTINGS ====================

  async getSettings(): Promise<ApiResponse<Record<string, any>>> {
    return this.get('settings');
  }

  async getSetting(key: string): Promise<ApiResponse<any>> {
    return this.get(`settings/${key}`);
  }

  // ==================== WALLET ====================

  async getWalletBalance(): Promise<ApiResponse<{ balance: number }>> {
    return this.get('wallet/balance');
  }

  async getWalletTransactions(params?: {
    page?: number;
    limit?: number;
    type?: 'credit' | 'debit';
  }): Promise<ApiResponse<any[]>> {
    return this.get('wallet/transactions', params as Record<string, any>);
  }

  // ==================== TOPUP ====================

  async createTopupRequest(amount: number, method: string = 'bank_transfer'): Promise<ApiResponse<any>> {
    return this.post('topup', { amount, method });
  }

  async getTopupRequests(params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'approved' | 'denied';
  }): Promise<ApiResponse<any[]>> {
    return this.get('topup', params as Record<string, any>);
  }

  async verifyTopup(topupId: string): Promise<ApiResponse<any>> {
    return this.post(`topup/${topupId}/verify`);
  }

  // ==================== CHECKOUT ====================

  async checkout(data: {
    items: Array<{ productId: string; price: number; quantity: number }>;
    couponId?: string;
    discountAmount?: number;
  }): Promise<ApiResponse<any>> {
    return this.post('checkout', data);
  }

  // ==================== ORDERS ====================

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<any[]>> {
    return this.get('orders', params as Record<string, any>);
  }

  async getOrder(orderId: string): Promise<ApiResponse<any>> {
    return this.get(`orders/${orderId}`);
  }

  // ==================== ENTITLEMENTS ====================

  async getEntitlements(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    return this.get('entitlements', params as Record<string, any>);
  }

  async getEntitlement(idOrProductId: string): Promise<ApiResponse<any>> {
    return this.get(`entitlements/${idOrProductId}`);
  }

  // ==================== BLOG ====================

  async getBlogPosts(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    return this.get('blog', params as Record<string, any>);
  }

  async getBlogPost(idOrSlug: string): Promise<ApiResponse<any>> {
    return this.get(`blog/${idOrSlug}`);
  }

  // ==================== ADMIN ====================

  async getAdminDashboard(): Promise<ApiResponse<any>> {
    return this.get('admin/dashboard');
  }

  async getAdminUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
  }): Promise<ApiResponse<any[]>> {
    return this.get('admin/users', params as Record<string, any>);
  }

  async updateAdminUser(userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
    return this.put(`admin/users/${userId}`, data);
  }

  async approveTopup(topupId: string, adminNote?: string): Promise<ApiResponse<any>> {
    return this.put(`admin/topups/${topupId}`, { action: 'approve', admin_note: adminNote });
  }

  async denyTopup(topupId: string, adminNote?: string): Promise<ApiResponse<any>> {
    return this.put(`admin/topups/${topupId}`, { action: 'deny', admin_note: adminNote });
  }

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    return this.get('admin/audit', params as Record<string, any>);
  }
}

// Custom error class
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export class for custom instances
export { ApiClient };
