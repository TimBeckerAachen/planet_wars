import { useEffect, useState } from 'react';
import { GameState } from '../types';
import { getGameState, buildBuilding } from '../api';

export default function OverviewPage() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(true);

    const [errorCount, setErrorCount] = useState(0);

    const fetchState = async () => {
        try {
            const data = await getGameState();
            setGameState(data);
            setErrorCount(0); // Reset on success
        } catch (error: any) {
            console.error(error);
            setErrorCount(prev => prev + 1);
            // Stop polling on Auth failure or Too Many Requests
            if (error.message.includes('401') || error.message.includes('429')) {
                return false; // Signal to stop
            }
        } finally {
            setLoading(false);
        }
        return true;
    };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        fetchState();

        // Poll every 10 seconds, but stop if too many errors
        interval = setInterval(async () => {
            if (errorCount > 3) {
                clearInterval(interval);
                return;
            }
            const shouldContinue = await fetchState();
            if (!shouldContinue) clearInterval(interval);
        }, 10000);

        return () => clearInterval(interval);
    }, [errorCount]);

    const handleBuild = async (name: string) => {
        try {
            await buildBuilding(name);
            fetchState(); // Refresh immediately
        } catch (err) {
            alert('Failed to build: ' + (err as Error).message);
        }
    };

    // State for real-time gold ticker
    const [displayGold, setDisplayGold] = useState(0);

    // State for timers
    const [timers, setTimers] = useState<Record<number, string>>({});

    // Update display gold when authoritative gold changes
    useEffect(() => {
        if (gameState) {
            setDisplayGold(gameState.user.gold);
        }
    }, [gameState?.user.gold]);

    // Gold Ticker Effect
    useEffect(() => {
        if (!gameState) return;

        // Calculate production rate (Gold Mines)
        const productionRatePerHour = gameState.buildings
            .filter(b => b.name === 'gold_mine' && !b.is_constructing)
            .reduce((sum, b) => sum + (10 * b.level), 0);

        const productionPerSecond = productionRatePerHour / 3600;

        if (productionPerSecond === 0) return;

        const interval = setInterval(() => {
            setDisplayGold(prev => prev + productionPerSecond);
        }, 1000); // Update every second

        return () => clearInterval(interval);
    }, [gameState]);

    // Construction Countdown Effect
    useEffect(() => {
        if (!gameState) return;

        const updateTimers = () => {
            const now = new Date().getTime();
            const newTimers: Record<number, string> = {};

            gameState.buildings.forEach(b => {
                if (b.is_constructing && b.finish_time) {
                    const finish = new Date(b.finish_time).getTime(); // finish_time is UTC string
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


    // Helper to format gold
    const formatGold = (amount: number) => Math.floor(amount).toLocaleString();

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
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '2rem', color: '#ffd700', fontWeight: 'bold' }}>
                            {formatGold(displayGold)} 💰
                        </div>
                        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Gold (Updating real-time)</div>
                    </div>
                </div>

                <div className="section">
                    <h3>Buildings</h3>
                    <div className="card-list" style={{ display: 'grid', gap: '1rem' }}>
                        {buildings.map(b => (
                            <div key={b.id} style={{
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                border: b.is_constructing ? '1px solid orange' : '1px solid rgba(255,255,255,0.1)',
                                position: 'relative'
                            }} title={b.name === 'gold_mine' ? `Produces ${10 * b.level} Gold/Hr` : 'Production Facility'}>
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
                    Upgrade mechanics enabled.
                </p>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {construction_options.map(opt => {
                        const isAffordable = Math.floor(displayGold) >= opt.cost;
                        // Find current building status to check if busy
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

                    {construction_options.length === 0 && (
                        <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>
                            Loading options...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
