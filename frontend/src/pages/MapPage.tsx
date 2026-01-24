import { useEffect, useState } from 'react';
import { MapState, Planet, GameState, Unit } from '../types';
import { getMap, getGameState, sendFleet } from '../api';

interface FleetModalState {
    planet: Planet;
    missionType: 'attack' | 'transport';
    shipCount: number;
    goldAmount: number;
}

export default function MapPage({ currentPlanetId }: { currentPlanetId?: number }) {
    const [mapState, setMapState] = useState<MapState | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState<{ x: number, y: number, content: Planet, clientX: number, clientY: number } | null>(null);
    const [fleetModal, setFleetModal] = useState<FleetModalState | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    const grid: (Planet | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    mapState.planets.forEach(p => {
        if (p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE) {
            grid[p.y][p.x] = p;
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

    const handlePlanetClick = (planet: Planet | null) => {
        if (!planet || planet.id === myPlanetId) return;

        const isOwnPlanet = planet.owner_id === myUserId;
        setFleetModal({
            planet,
            missionType: isOwnPlanet ? 'transport' : 'attack',
            shipCount: 1,
            goldAmount: 0
        });
        setError(null);
    };

    const handleSendFleet = async () => {
        if (!fleetModal) return;
        setSending(true);
        setError(null);

        try {
            await sendFleet(
                fleetModal.planet.id,
                fleetModal.missionType,
                fleetModal.shipCount,
                fleetModal.goldAmount
            );
            setFleetModal(null);
            // Refresh game state
            const game = await getGameState();
            setGameState(game);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send fleet');
        } finally {
            setSending(false);
        }
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
                        onClick={() => handlePlanetClick(planet)}
                        style={{
                            width: '40px',
                            height: '40px',
                            background: planet
                                ? (planet.id === myPlanetId ? '#4ade80' : '#60a5fa')
                                : '#1a1a2e',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            cursor: planet && planet.id !== myPlanetId ? 'pointer' : 'default',
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
                    {tooltip.content.id !== myPlanetId && (
                        <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '0.5rem' }}>
                            Click to send fleet
                        </div>
                    )}
                </div>
            )}

            {/* Fleet Action Modal */}
            {fleetModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }} onClick={() => setFleetModal(null)}>
                    <div style={{
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        borderRadius: '16px',
                        padding: '2rem',
                        maxWidth: '400px',
                        width: '90%',
                        border: '1px solid #333'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 1rem 0' }}>
                            {fleetModal.missionType === 'attack' ? '⚔️ Attack' : '📦 Transport'}
                            {' '}to {fleetModal.planet.name}
                        </h3>

                        <div style={{ marginBottom: '1rem', color: '#aaa', fontSize: '0.9rem' }}>
                            Owner: {fleetModal.planet.owner_username || 'Unknown'}
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>
                                Ships to send (Available: {myShips})
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={myShips}
                                value={fleetModal.shipCount}
                                onChange={e => setFleetModal({
                                    ...fleetModal,
                                    shipCount: Math.max(1, Math.min(myShips, parseInt(e.target.value) || 1))
                                })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #444',
                                    background: '#0a0a1a',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        {fleetModal.missionType === 'transport' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>
                                    Gold to transport (Max: {fleetModal.shipCount * 10})
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={Math.min(gameState?.user.gold || 0, fleetModal.shipCount * 10)}
                                    value={fleetModal.goldAmount}
                                    onChange={e => setFleetModal({
                                        ...fleetModal,
                                        goldAmount: Math.max(0, parseInt(e.target.value) || 0)
                                    })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid #444',
                                        background: '#0a0a1a',
                                        color: 'white',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        )}

                        {fleetModal.missionType === 'attack' && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                fontSize: '0.85rem'
                            }}>
                                ⚔️ Attack strength: {fleetModal.shipCount * 10}
                                <br />
                                💰 Can steal up to {fleetModal.shipCount * 10} gold
                            </div>
                        )}

                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.3)',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                color: '#ff6b6b'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setFleetModal(null)}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #444',
                                    background: 'transparent',
                                    color: '#ccc',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendFleet}
                                disabled={sending || myShips < 1}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: fleetModal.missionType === 'attack'
                                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                        : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    color: 'white',
                                    cursor: sending || myShips < 1 ? 'not-allowed' : 'pointer',
                                    opacity: sending || myShips < 1 ? 0.5 : 1
                                }}
                            >
                                {sending ? 'Sending...' : 'Send Fleet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
