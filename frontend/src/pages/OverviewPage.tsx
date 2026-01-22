import { useEffect, useState } from 'react';
import { GameState } from '../types';
import { getGameState, buildBuilding } from '../api';

export default function OverviewPage() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchState = async () => {
        try {
            const data = await getGameState();
            setGameState(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchState();
        // Poll every 10 seconds for resources/construction
        const interval = setInterval(fetchState, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleBuild = async (name: string) => {
        try {
            await buildBuilding(name);
            fetchState(); // Refresh immediately
        } catch (err) {
            alert('Failed to build: ' + (err as Error).message);
        }
    };

    if (loading || !gameState) return <div>Loading command center...</div>;

    const { planet, buildings, units } = gameState;

    // Helper to find building
    const getBuilding = (name: string) => buildings.find(b => b.name === name);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
            {/* Left Column: Planet Info & Lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="planet-info">
                    <h2>Planet: {planet.name}</h2>
                    <p>Coordinates: {planet.x}, {planet.y}</p>
                </div>

                <div className="section">
                    <h3>Buildings</h3>
                    <div className="card-list" style={{ display: 'grid', gap: '1rem' }}>
                        {buildings.map(b => (
                            <div key={b.id} style={{
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                border: b.is_constructing ? '1px solid orange' : '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                    {b.name.replace(/_/g, ' ')} (Lvl {b.level})
                                </div>
                                {b.is_constructing && (
                                    <div style={{ color: 'orange', fontSize: '0.9rem' }}>
                                        🚧 Under Construction...
                                        {/* Timer could go here */}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section">
                    <h3>Units</h3>
                    {units.length === 0 ? <p style={{ opacity: 0.5 }}>No units deployed.</p> : (
                        <div className="card-list">
                            {units.map(u => (
                                <div key={u.id}>
                                    {u.name}: {u.count}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Construction */}
            <div className="construction-panel" style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '1.5rem',
                borderRadius: '12px',
                height: 'fit-content'
            }}>
                <h3>Construction Hub</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                    Build new facilities. Cost: 50 Gold. Time: 2h.
                </p>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {['space_ship_factory', 'university', 'gold_mine'].map(type => {
                        const existing = getBuilding(type);
                        const isUpgrading = existing?.is_constructing;
                        const label = type === 'gold_mine' ? 'Upgrade Gold Mine' : `Build ${type.replace(/_/g, ' ')}`;

                        return (
                            <button
                                key={type}
                                onClick={() => handleBuild(type)}
                                disabled={isUpgrading}
                                style={{
                                    padding: '1rem',
                                    background: isUpgrading ? '#444' : '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isUpgrading ? 'not-allowed' : 'pointer',
                                    textAlign: 'left',
                                    fontWeight: 'bold',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {label}
                                {isUpgrading && <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'normal' }}>Busy...</span>}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
