
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/App';
import * as api from '../../src/api';

// Mock the API module
vi.mock('../../src/api', () => ({
    loginUser: vi.fn(),
    signupUser: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    getGameState: vi.fn(),
    build: vi.fn(),
    getMap: vi.fn(),
    getFleetMissions: vi.fn(),
}));

describe('Integration: Login Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('allows a user to login and see the dashboard', async () => {
        // 1. Mock API responses
        // Successful login returns token and user info
        (api.loginUser as any).mockResolvedValue({
            access_token: 'fake-token',
            user: { id: 1, username: 'testuser' }
        });

        // getCurrentUser needs to return null or throw initially to simulate logged out state
        (api.getCurrentUser as any).mockRejectedValue(new Error('Not authenticated'));

        // Game state returns the user's planet and resources
        (api.getGameState as any).mockResolvedValue({
            user: { id: 1, username: 'testuser', gold: 100 },
            planet: { id: 1, name: 'Home Planet', owner_id: 1, x: 0, y: 0 },
            buildings: [
                { name: 'gold_mine', level: 1, is_constructing: false }
            ],
            units: [],
            fleets: [],
            construction_options: []
        });

        (api.getFleetMissions as any).mockResolvedValue({
            outgoing: [],
            incoming: []
        });

        // 2. Render the App
        render(<App />);

        // 3. User should be on the Auth Page initially (Login)
        // Wait for potential initial auth check to fail
        await waitFor(() => {
             expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
        });

        // 4. Fill in credentials
        fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });

        // Switch to Login tab if necessary
        const switchButton = screen.queryByText(/switch to login/i);
        if (switchButton) {
            fireEvent.click(switchButton);
        }
        
        // 5. Submit form
        const submitButton = screen.getByRole('button', { name: /login/i });
        fireEvent.click(submitButton);

        // 6. Verify API called
        await waitFor(() => {
            expect(api.loginUser).toHaveBeenCalledWith('testuser', 'password123');
        });

        // 7. Verify Redirect to Dashboard
        await waitFor(() => {
            expect(screen.getByText(/overview/i)).toBeInTheDocument();
            expect(screen.getByText(/gold: 100/i)).toBeInTheDocument();
        });
    });
});
