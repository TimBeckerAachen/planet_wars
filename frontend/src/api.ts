// API service for authentication
const API_BASE_URL = '/api';

export interface User {
    id: number;
    username: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface AuthError {
    detail: string;
}

const TOKEN_KEY = 'planet_wars_token';

/**
 * Get the stored authentication token from localStorage
 */
export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store the authentication token in localStorage
 */
export function setAuthToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the authentication token from localStorage
 */
export function removeAuthToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Make an authenticated API request with automatic token injection
 */
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Merge with provided headers
    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error: AuthError = await response.json();
        throw new Error(error.detail || 'Request failed');
    }

    return response.json();
}

/**
 * Sign up a new user
 */
export async function signupUser(
    username: string,
    email: string,
    password: string
): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });

    // Store the token
    setAuthToken(response.access_token);
    return response;
}

/**
 * Log in an existing user
 */
export async function loginUser(
    identifier: string,
    password: string
): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
    });

    // Store the token
    setAuthToken(response.access_token);
    return response;
}

/**
 * Get current user information using the stored token
 */
export async function getCurrentUser(): Promise<User> {
    return apiRequest<User>('/auth/me');
}

/**
 * Log out the current user
 */
export function logout(): void {
    removeAuthToken();
}
