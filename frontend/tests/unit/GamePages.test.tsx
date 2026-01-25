import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OverviewPage from '../../src/pages/OverviewPage';
import MapPage from '../../src/pages/MapPage';
import * as api from '../../src/api';

// Mock the GameContext
const mockRefreshState = vi.fn();
const mockUseGame = vi.fn();

vi.mock('../../src/GameContext', () => ({
    useGame: () => mockUseGame(),
    GameProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock the API module
vi.mock('../../src/api', () => ({
    getGameState: vi.fn(),
    buildBuilding: vi.fn(),
    getMap: vi.fn(),
    getBuildingDetails: vi.fn(),
    getFleetMissions: vi.fn().mockResolvedValue({ outgoing: [], incoming: [] }),
}));

describe('OverviewPage', () => {
    const mockGameState = {
        user: { id: 1, username: 'testuser', email: 'test@test.com', gold: 100, created_at: '', updated_at: '' },
        planet: { id: 1, x: 5, y: 5, name: 'Colony', owner_id: 1 },
        buildings: [
            { id: 1, name: 'gold_mine', level: 1, is_constructing: false, finish_time: null }
        ],
        units: [],
        construction_options: [],
        unread_messages_count: 0
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
            { id: 1, x: 5, y: 5, name: 'Colony', owner_id: 1, owner_username: 'testuser' },
            { id: 2, x: 10, y: 10, name: 'Enemy', owner_id: 2, owner_username: 'enemy' }
        ]
    };

    const mockGameState = {
        user: { id: 1, username: 'testuser', email: 'test@test.com', gold: 100, created_at: '', updated_at: '' },
        planet: { id: 1, x: 5, y: 5, name: 'Colony', owner_id: 1 },
        buildings: [],
        units: [{ id: 1, name: 'space_ship', count: 5 }],
        construction_options: []
    };

    it('renders grid with planets', async () => {
        vi.mocked(api.getMap).mockResolvedValue(mockMapState);
        vi.mocked(api.getGameState).mockResolvedValue(mockGameState);
        
        const mockOnPlanetClick = vi.fn();
        render(<MapPage onPlanetClick={mockOnPlanetClick} />);

        // Wait for loading to finish (scanning sector...)
        await waitFor(() => {
            expect(screen.queryByText(/Scanning sector/i)).not.toBeInTheDocument();
        });

        // Verify the map page header is rendered
        expect(screen.getByText(/Galaxy Map/i)).toBeInTheDocument();
        expect(screen.getByText(/Ships: 5/i)).toBeInTheDocument();
        
        // Find hint text
        expect(screen.getByText(/Click on a planet/i)).toBeInTheDocument();
    });
});
