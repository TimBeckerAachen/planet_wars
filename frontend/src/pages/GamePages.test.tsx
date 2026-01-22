import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OverviewPage from './OverviewPage';
import MapPage from './MapPage';
import * as api from '../api';

// Mock the API module
vi.mock('../api', () => ({
    getGameState: vi.fn(),
    buildBuilding: vi.fn(),
    getMap: vi.fn(),
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
        // Return a promise that doesn't resolve immediately to test loading state
        vi.mocked(api.getGameState).mockImplementation(() => new Promise(() => { }));
        render(<OverviewPage />);
        expect(screen.getByText(/Loading command center/i)).toBeInTheDocument();
    });

    it('renders game state after loading', async () => {
        vi.mocked(api.getGameState).mockResolvedValue(mockGameState);
        render(<OverviewPage />);

        await waitFor(() => {
            expect(screen.getByText(/Planet: Colony/i)).toBeInTheDocument();
        });
        expect(screen.getByText(/gold mine/i)).toBeInTheDocument();
        expect(screen.getByText(/Lvl 1/i)).toBeInTheDocument();
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

        // Check if planets are rendered (looking for titles or emoji)
        // Since we used title attribute on divs:
        const planet1 = screen.getByTitle(/Planet: Colony \(5,5\)/i);
        expect(planet1).toBeInTheDocument();
        expect(planet1).toHaveTextContent('🌍');
    });
});
