import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BuildingDetailsPage from '../../src/pages/BuildingDetailsPage';
import * as api from '../../src/api';

// Mock GameContext
const mockRefreshState = vi.fn();
const mockUseGame = vi.fn();

vi.mock('../../src/GameContext', () => ({
    useGame: () => mockUseGame(),
    GameProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock API
vi.mock('../../src/api', () => ({
    getBuildingDetails: vi.fn(),
    buildBuilding: vi.fn(),
    produceUnit: vi.fn(),
}));

describe('BuildingDetailsPage', () => {
    const mockDetails = {
        id: 1,
        planet_id: 1,
        name: 'space_ship_factory',
        level: 1,
        is_constructing: false,
        finish_time: null,
        production_options: [
            {
                name: 'space_ship',
                cost: { gold: 100, pilot: 1 },
                duration: 1200,
                base_time: 1200
            }
        ]
    };

    beforeEach(() => {
        vi.resetAllMocks();
        // Setup default context state
        mockUseGame.mockReturnValue({
            gameState: { user: { gold: 500 } },
            loading: false,
            refreshState: mockRefreshState
        });
    });

    it('renders details and production options', async () => {
        vi.mocked(api.getBuildingDetails).mockResolvedValue(mockDetails as any);

        render(<BuildingDetailsPage buildingId={1} onBack={vi.fn()} />);

        // Wait for details fetch
        await waitFor(() => {
            expect(screen.getByText(/space ship factory/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/Lvl 1/i)).toBeInTheDocument();

        // Use getAllByText because unit name appears in both title and list
        expect(screen.getAllByText(/space ship/i).length).toBeGreaterThan(0);

        expect(screen.queryByText(/1200 gold/i)).not.toBeInTheDocument();
    });

    it('handles production click', async () => {
        vi.mocked(api.getBuildingDetails).mockResolvedValue(mockDetails as any);
        vi.mocked(api.produceUnit).mockResolvedValue({ status: 'ok', finish_time: '2025-01-01' });

        render(<BuildingDetailsPage buildingId={1} onBack={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText(/Produce/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Produce/i));

        await waitFor(() => {
            expect(api.produceUnit).toHaveBeenCalledWith(1, 'space_ship');
        });

        expect(mockRefreshState).toHaveBeenCalled();
    });
});
