import { useEffect, useState } from 'react';
import { buildBuilding } from '../api';
import { useGame } from '../GameContext';

interface OverviewPageProps {
    onBuildingClick: (id: number) => void;
}

export default function OverviewPage({ onBuildingClick }: OverviewPageProps) {
    const { gameState, loading, refreshState } = useGame();

    // State for construction timers (visual only)
    const [timers, setTimers] = useState<Record<number, string>>({});

    // Construction Countdown Effect
    useEffect(() => {
        if (!gameState) return;

        const updateTimers = () => {
            const now = new Date().getTime();
            const newTimers: Record<number, string> = {};

            gameState.buildings.forEach(b => {
                if (b.is_constructing && b.finish_time) {
                    const finish = new Date(b.finish_time).getTime();
                    const diff = finish - now;

                    if (diff > 0) {
                        const mins = Math.floor(diff / 60000);
                        const secs = Math.floor((diff % 60000) / 1000);
                        newTimers[b.id] = `${mins}m ${secs}s`;
                    } else {
                        newTimers[b.id] = "Finishing...";
                    }
                }
            });
            setTimers(newTimers);
        };

        updateTimers(); // Initial call
        const interval = setInterval(updateTimers, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    const handleBuild = async (name: string) => {
        try {
            await buildBuilding(name);
            refreshState(); // Refresh via context
        } catch (err) {
            alert('Failed to build: ' + (err as Error).message);
        }
    };

    if (loading || !gameState) return <div>Loading command center...</div>;

    const { planet, buildings, units, construction_options } = gameState;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
            {/* Left Column: Planet Info & Lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="planet-info" style={{
                    background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2>Planet: {planet.name}</h2>
                        <p>Coordinates: {planet.x}, {planet.y}</p>
                    </div>
                </div>

                <div className="section">
                    <h3>Buildings</h3>
                    <div className="card-list" style={{ display: 'grid', gap: '1rem' }}>
                        {buildings.map(b => (
                            <div
                                key={b.id}
                                data-testid={`building-card-${b.id}`}
                                onClick={() => onBuildingClick(b.id)}
                                style={{
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    border: b.is_constructing ? '1px solid orange' : '1px solid rgba(255,255,255,0.1)',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                title={b.name === 'gold_mine' ? `Produces ${10 * b.level} Gold/Hr` : 'Click for details'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                        {b.name.replace(/_/g, ' ')} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>(Lvl {b.level})</span>
                                    </div>
                                    {b.is_constructing && timers[b.id] && (
                                        <div style={{ color: 'orange', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                            ⏱ {timers[b.id]}
                                        </div>
                                    )}
                                </div>
                                {b.is_constructing && (
                                    <div style={{ color: 'orange', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                        🚧 Under Construction...
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
                    Quick Build / Upgrade
                </p>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {construction_options.map(opt => {
                        const isAffordable = (gameState.user.gold) >= opt.cost;
                        const current = buildings.find(b => b.name === opt.name);
                        const isBusy = current?.is_constructing;

                        return (
                            <div key={opt.name} style={{
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                <div style={{ padding: '1rem 1rem 0.5rem 1rem' }}>
                                    <div style={{ fontWeight: 'bold', textTransform: 'capitalize', marginBottom: '0.2rem' }}>
                                        {opt.type === 'build' ? 'Build' : 'Upgrade'} {opt.name.replace(/_/g, ' ')}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                        To Level {opt.level}
                                    </div>

                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem',
                                        fontSize: '0.9rem', fontFamily: 'monospace'
                                    }}>
                                        <span style={{ color: isAffordable ? '#ffd700' : '#ff4444' }}>
                                            {opt.cost} 💰
                                        </span>
                                        <span>
                                            {(opt.duration / 60).toFixed(0)}m ⏳
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleBuild(opt.name)}
                                    disabled={!isAffordable || isBusy}
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem',
                                        background: isBusy ? '#444' : (!isAffordable ? '#555' : '#2563eb'),
                                        color: (!isAffordable && !isBusy) ? '#aaa' : 'white',
                                        border: 'none',
                                        marginTop: '0.5rem',
                                        cursor: (!isAffordable || isBusy) ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        fontSize: '0.8rem',
                                        letterSpacing: '1px'
                                    }}
                                >
                                    {isBusy ? 'In Progress' : (isAffordable ? (opt.type === 'build' ? 'Construct' : 'Upgrade') : 'Need Gold')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
