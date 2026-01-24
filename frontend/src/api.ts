// API service for authentication
import { User, GameState, MapState } from './types';

const API_BASE_URL = '/api';

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

/**
 * Get current game state
 */
export async function getGameState(): Promise<GameState> {
    return apiRequest<GameState>('/game/state');
}

/**
 * Start construction of a building
 */
export async function buildBuilding(buildingName: string): Promise<{ status: string; finish_time: string }> {
    return apiRequest<{ status: string; finish_time: string }>(`/game/build?building_name=${buildingName}`, {
        method: 'POST'
    });
}

/**
 * Get map state
 */
export async function getMap(): Promise<MapState> {
    return apiRequest<MapState>('/game/map');
}

/**
 * Get building details including production options
 */
export async function getBuildingDetails(id: number): Promise<import('./types').BuildingDetails> {
    return apiRequest<import('./types').BuildingDetails>(`/game/building/${id}`);
}

/**
 * Start unit production
 */
export async function produceUnit(buildingId: number, unitName: string): Promise<{ status: string; finish_time: string }> {
    return apiRequest(`/game/produce?building_id=${buildingId}&unit_name=${unitName}`, {
        method: 'POST'
    });
}

/**
 * Rename planet
 */
export async function renamePlanet(name: string): Promise<import('./types').Planet> {
    return apiRequest<import('./types').Planet>('/game/planet/rename', {
        method: 'PATCH',
        body: JSON.stringify({ name })
    });
}

// Fleet Mission API

/**
 * Send a fleet on a mission
 */
export async function sendFleet(
    targetPlanetId: number,
    missionType: 'attack' | 'transport',
    shipCount: number,
    goldAmount: number = 0
): Promise<import('./types').FleetMission> {
    return apiRequest<import('./types').FleetMission>('/game/fleet/send', {
        method: 'POST',
        body: JSON.stringify({
            target_planet_id: targetPlanetId,
            mission_type: missionType,
            ship_count: shipCount,
            gold_amount: goldAmount
        })
    });
}

/**
 * Get active fleet missions
 */
export async function getFleetMissions(): Promise<import('./types').FleetMissionsState> {
    return apiRequest<import('./types').FleetMissionsState>('/game/fleet/missions');
}

// Message API

/**
 * Get all messages
 */
export async function getMessages(): Promise<import('./types').MessageListState> {
    return apiRequest<import('./types').MessageListState>('/game/messages');
}

/**
 * Mark a message as read
 */
export async function markMessageRead(messageId: number): Promise<{ status: string }> {
    return apiRequest<{ status: string }>(`/game/messages/${messageId}/read`, {
        method: 'PATCH'
    });
}

/**
 * Send a message to another player
 */
export async function sendMessage(
    recipientUsername: string,
    subject: string,
    body: string
): Promise<import('./types').Message> {
    return apiRequest<import('./types').Message>('/game/messages/send', {
        method: 'POST',
        body: JSON.stringify({
            recipient_username: recipientUsername,
            subject,
            body
        })
    });
}
