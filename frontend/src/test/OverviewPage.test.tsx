
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OverviewPage from '../pages/OverviewPage';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as GameContext from '../GameContext';
import * as api from '../api';

// Mock dependencies
vi.mock('../GameContext');
vi.mock('../api');

const mockGameState = {
    user: { id: 1, username: 'tester', email: 't@t.com', gold: 1000 },
    planet: { id: 1, name: 'TestPlanet', x: 5, y: 5, owner_id: 1 },
    buildings: [],
    units: [],
    construction_options: []
};

describe('OverviewPage Rename', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        (GameContext.useGame as any).mockReturnValue({
            gameState: mockGameState,
            loading: false,
            refreshState: vi.fn()
        });
    });

    it('shows rename button and switches to input', () => {
        render(<OverviewPage onBuildingClick={vi.fn()} />);
        // Should show current name
        expect(screen.getByText('Planet: TestPlanet')).toBeInTheDocument();
        
        // Click edit
        const editBtn = screen.getByTitle('Rename Planet');
        fireEvent.click(editBtn);
        
        // Expect input and buttons
        expect(screen.getByPlaceholderText('New Name')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
    
    it('cancels rename', () => {
        render(<OverviewPage onBuildingClick={vi.fn()} />);
        const editBtn = screen.getByTitle('Rename Planet');
        fireEvent.click(editBtn);
        
        const cancelBtn = screen.getByText('Cancel');
        fireEvent.click(cancelBtn);
        
        expect(screen.queryByPlaceholderText('New Name')).not.toBeInTheDocument();
        expect(screen.getByText('Planet: TestPlanet')).toBeInTheDocument();
    });
    
    it('submits rename', async () => {
        const refreshMock = vi.fn();
        (GameContext.useGame as any).mockReturnValue({
            gameState: mockGameState,
            loading: false,
            refreshState: refreshMock
        });
        
        render(<OverviewPage onBuildingClick={vi.fn()} />);
        
        // Enter edit mode
        fireEvent.click(screen.getByTitle('Rename Planet'));
        
        // Type new name
        const input = screen.getByPlaceholderText('New Name');
        fireEvent.change(input, { target: { value: 'NewName123' } });
        
        // Save
        const saveBtn = screen.getByText('Save');
        fireEvent.click(saveBtn);
        
        // Verify API call
        expect(api.renamePlanet).toHaveBeenCalledWith('NewName123');
    });
});
