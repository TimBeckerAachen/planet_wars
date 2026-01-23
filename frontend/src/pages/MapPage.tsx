import { useEffect, useState } from 'react';
import { MapState, Planet } from '../types';
import { getMap } from '../api';

export default function MapPage({ currentPlanetId }: { currentPlanetId?: number }) {
    const [mapState, setMapState] = useState<MapState | null>(null);
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState<{ x: number, y: number, content: Planet, clientX: number, clientY: number } | null>(null);

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

    const handleMouseEnter = (e: React.MouseEvent, planet: Planet | null, x: number, y: number) => {
        if (!planet) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            x,
            y,
            content: planet,
            clientX: rect.left + window.scrollX + 20,
            clientY: rect.top + window.scrollY - 40
        });
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    return (
        <div style={{ overflow: 'auto', height: '80vh', border: '1px solid #444', borderRadius: '8px', position: 'relative' }}>
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
                        onMouseEnter={(e) => handleMouseEnter(e, planet, x, y)}
                        onMouseLeave={handleMouseLeave}
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
                            cursor: 'default',
                            position: 'relative'
                        }}
                    >
                        {planet ? '🌍' : ''}
                    </div>
                )))}
            </div>
            
            {tooltip && (
                <div style={{
                    position: 'fixed',
                    top: tooltip.clientY,
                    left: tooltip.clientX,
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid #666',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    pointerEvents: 'none',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    minWidth: '150px'
                }}>
                    <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '0.3rem' }}>
                        {tooltip.content.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                        Owner: <span style={{ color: '#4ade80' }}>{tooltip.content.owner_username || 'Unknown'}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.3rem' }}>
                        Coords: ({tooltip.x}, {tooltip.y})
                    </div>
                </div>
            )}
        </div>
    );
}
