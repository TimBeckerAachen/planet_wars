import { useEffect, useState } from 'react';
import { MapState, Planet } from '../types';
import { getMap } from '../api';

export default function MapPage({ currentPlanetId }: { currentPlanetId?: number }) {
    const [mapState, setMapState] = useState<MapState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMap().then(setMapState).finally(() => setLoading(false));
    }, []);

    if (loading || !mapState) return <div>Scanning sector...</div>;

    const GRID_SIZE = 30;

    // Create grid map
    const grid: (Planet | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    mapState.planets.forEach(p => {
        if (p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE) {
            grid[p.y][p.x] = p; // y is row, x is col
        }
    });

    return (
        <div style={{ overflow: 'auto', height: '80vh', border: '1px solid #444', borderRadius: '8px' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, 40px)`,
                gap: '1px',
                width: 'fit-content',
                background: '#000',
                padding: '1rem'
            }}>
                {grid.map((row, y) => row.map((planet, x) => (
                    <div
                        key={`${x}-${y}`}
                        title={planet ? `Planet: ${planet.name}\nOwner: ${planet.owner_username || 'Unknown'}\nCoords: (${x},${y})` : `Empty Space (${x},${y})`}
                        style={{
                            width: '40px',
                            height: '40px',
                            background: planet
                                ? (planet.id === currentPlanetId ? '#4ade80' : '#60a5fa')
                                : '#1a1a2e',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            cursor: 'default'
                        }}
                    >
                        {planet ? '🌍' : ''}
                    </div>
                )))}
            </div>
        </div>
    );
}
