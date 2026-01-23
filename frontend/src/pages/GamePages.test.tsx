import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OverviewPage from './OverviewPage';
import MapPage from './MapPage';
import * as api from '../api';

// Mock the GameContext
const mockRefreshState = vi.fn();
const mockUseGame = vi.fn();

vi.mock('../GameContext', () => ({
    useGame: () => mockUseGame(),
    GameProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock the API module
vi.mock('../api', () => ({
    getGameState: vi.fn(),
    buildBuilding: vi.fn(),
    getMap: vi.fn(),
    getBuildingDetails: vi.fn(),
}));

describe('OverviewPage', () => {
    const mockGameState = {
        user: { id: 1, username: 'testuser', email: 'test@test.com', gold: 100, created_at: '', updated_at: '' },
        planet: { id: 1, x: 5, y: 5, name: 'Colony', owner_id: 1 },
        buildings: [
            { id: 1, name: 'gold_mine', level: 1, is_constructing: false, finish_time: null }
        ],
        units: [],
        construction_options: []
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('renders loading state initially', () => {
        mockUseGame.mockReturnValue({
            gameState: null,
            loading: true,
            refreshState: mockRefreshState
        });

        render(<OverviewPage onBuildingClick={vi.fn()} />);
        expect(screen.getByText(/Loading command center/i)).toBeInTheDocument();
    });

    it('renders game state after loading', async () => {
        mockUseGame.mockReturnValue({
            gameState: mockGameState,
            loading: false,
            refreshState: mockRefreshState,
            displayGold: 100
        });

        render(<OverviewPage onBuildingClick={vi.fn()} />);

        expect(screen.getByText(/Planet: Colony/i)).toBeInTheDocument();

        // Use test ID to verify the card presence
        const card = screen.getByTestId('building-card-1');
        expect(card).toBeInTheDocument();
        expect(card).toHaveTextContent(/gold mine/i);
        expect(card).toHaveTextContent(/Lvl 1/i);

        expect(screen.getByText(/Construction Hub/i)).toBeInTheDocument();
    });
});

describe('MapPage', () => {
    const mockMapState = {
        planets: [
            { id: 1, x: 5, y: 5, name: 'Colony', owner_id: 1 },
            { id: 2, x: 10, y: 10, name: 'Enemy', owner_id: 2 }
        ]
    };

    it('renders grid with planets', async () => {
        vi.mocked(api.getMap).mockResolvedValue(mockMapState);
        render(<MapPage />);

        // Wait for loading to finish (scanning sector...)
        await waitFor(() => {
            expect(screen.queryByText(/Scanning sector/i)).not.toBeInTheDocument();
        });

        // Hover over planet to trigger tooltip (simulated by finding the planet div first)
        // Since we don't have titles anymore, we find by emoji or other attribute?
        // We can find by text '🌍' which represents a planet
        const planetEmoji = screen.getAllByText('🌍')[0];
        
        // Find the parent div of the emoji
        const planetDiv = planetEmoji.closest('div');
        if (!planetDiv) throw new Error('Planet div not found');
        
        // Simulate hover
        // Note: We need to fire mouseEnter. Testing Library 'userEvent' is better but fireEvent works.
        const { fireEvent } = require('@testing-library/react');
        fireEvent.mouseEnter(planetDiv);
        
        // Check tooltip content
        expect(screen.getByText('Colony')).toBeInTheDocument();
        // Since owner isn't mocked in MapPage, it might be undefined/Unknown or implicit from ID?
        // In mockMapState, owner_id is 1. owner_username might differ.
        // Let's verify what we can.
    });
});
