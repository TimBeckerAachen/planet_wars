import { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { GameState } from './types';
import { getGameState } from './api';
import { useAuth } from './AuthContext';

interface GameContextType {
    gameState: GameState | null;
    displayGold: number;
    loading: boolean;
    refreshState: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [displayGold, setDisplayGold] = useState(0);
    const [loading, setLoading] = useState(false);

    const refreshState = useCallback(async () => {
        if (!user) return;
        try {
            // Don't set global loading true on refresh to avoid flickering
            const data = await getGameState();
            setGameState(data);
            // On hard refresh, sync display gold immediately
            // But let the ticker handle smooth updates otherwise?
            // Actually, if authoritative gold jumps (e.g. bought something), we should sync.
            // But we can't easily expect if it was a jump or just time.
            // Let's rely on the ticker effect to align it?
            // For now, syncing on fetch is safe.
            setDisplayGold(data.user.gold);
        } catch (error) {
            console.error("Failed to fetch game state", error);
        }
    }, [user]);

    // Initial fetch
    useEffect(() => {
        if (user) {
            setLoading(true);
            refreshState().finally(() => setLoading(false));
        }
    }, [user]);

    // Polling (every 10s)
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(refreshState, 10000);
        return () => clearInterval(interval);
    }, [user, refreshState]);

    // Gold Ticker
    useEffect(() => {
        if (!gameState) return;

        // Calculate production rate
        const productionRatePerHour = gameState.buildings
            .filter(b => b.name === 'gold_mine' && !b.is_constructing)
            .reduce((sum, b) => sum + (10 * b.level), 0);

        const productionPerSecond = productionRatePerHour / 3600;

        if (productionPerSecond === 0) return;

        const interval = setInterval(() => {
            setDisplayGold(prev => prev + (productionPerSecond / 10)); // Update 10 times a second for smoothness? Or 1s?
            // User asked for "updated in real time". 1s is fine.
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState]);

    return (
        <GameContext.Provider value={{ gameState, displayGold, loading, refreshState }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within GameProvider');
    return context;
}
