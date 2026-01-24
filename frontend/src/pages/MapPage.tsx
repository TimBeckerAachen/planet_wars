import { useEffect, useState } from 'react';
import { MapState, Planet, GameState, Unit } from '../types';
import { getMap, getGameState } from '../api';

interface MapPageProps {
    onPlanetClick: (planetId: number) => void;
}

export default function MapPage({ onPlanetClick }: MapPageProps) {
    const [mapState, setMapState] = useState<MapState | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getMap(), getGameState()])
            .then(([map, game]) => {
                setMapState(map);
                setGameState(game);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading || !mapState) return <div>Scanning sector...</div>;

    const GRID_SIZE = 30;
    const myPlanetId = gameState?.planet.id;
    const myUserId = gameState?.user.id;
    const myShips = gameState?.units.find((u: Unit) => u.name === 'space_ship')?.count || 0;

    // Create grid map
    const grid: (Planet | null)[][] = new Array(GRID_SIZE).fill(null).map(() => new Array(GRID_SIZE).fill(null));
    mapState.planets.forEach(p => {
        if (p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE) {
            grid[p.y][p.x] = p;
        }
    });

    const getPlanetEmoji = (planet: Planet) => {
        if (planet.id === myPlanetId) return '🏠';
        if (planet.owner_id === myUserId) return '🌍';
        return '🌑';
    };

    const getPlanetColor = (planet: Planet) => {
        if (planet.id === myPlanetId) return '#4ade80';
        if (planet.owner_id === myUserId) return '#22d3ee';
        return '#f87171';
    };

    return (
        <div style={{ padding: '1rem', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>🗺️ Galaxy Map</h2>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                    <span>🏠 Home</span>
                    <span>🌍 Your planets</span>
                    <span>🌑 Other players</span>
                    <span>🚀 Ships: {myShips}</span>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, 28px)`,
                gap: '1px',
                background: 'rgba(255,255,255,0.05)',
                padding: '4px',
                borderRadius: '8px',
                width: 'fit-content'
            }}>
                {grid.map((row, y) =>
                    row.map((planet, x) => (
                        <button
                            key={`${x}-${y}`}
                            onClick={() => planet && onPlanetClick(planet.id)}
                            disabled={!planet}
                            style={{
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: planet ? `rgba(${planet.id === myPlanetId ? '74, 222, 128' : planet.owner_id === myUserId ? '34, 211, 238' : '248, 113, 113'}, 0.2)` : 'transparent',
                                border: planet ? `1px solid ${getPlanetColor(planet)}` : '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '4px',
                                cursor: planet ? 'pointer' : 'default',
                                fontSize: '14px',
                                transition: 'transform 0.1s, background 0.2s',
                                padding: 0
                            }}
                            onMouseEnter={(e) => planet && (e.currentTarget.style.transform = 'scale(1.3)')}
                            onMouseLeave={(e) => planet && (e.currentTarget.style.transform = 'scale(1)')}
                            title={planet ? `${planet.name} (${planet.owner_username || 'Unknown'})` : undefined}
                        >
                            {planet && getPlanetEmoji(planet)}
                        </button>
                    ))
                )}
            </div>

            <p style={{ marginTop: '1rem', color: '#888', fontSize: '0.875rem' }}>
                Click on a planet to view details, send messages, or attack.
            </p>
        </div>
    );
}
