import { useEffect, useState } from 'react';
import { BuildingDetails } from '../types';
import { getBuildingDetails, buildBuilding, produceUnit } from '../api';
import { useGame } from '../GameContext';

interface BuildingDetailsPageProps {
    buildingId: number;
    onBack: () => void;
}

export default function BuildingDetailsPage({ buildingId, onBack }: BuildingDetailsPageProps) {
    const { gameState, refreshState } = useGame();
    const [details, setDetails] = useState<BuildingDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setActionLoading] = useState(false);

    // Timer state for production
    const [prodTimer, setProdTimer] = useState<string | null>(null);

    const fetchDetails = async () => {
        try {
            const data = await getBuildingDetails(buildingId);
            setDetails(data);
        } catch (error) {
            console.error(error);
            alert("Failed to load building details");
            onBack();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
        const interval = setInterval(fetchDetails, 10000); // Poll details (sync with main loop?)
        return () => clearInterval(interval);
    }, [buildingId]);

    // Local production timer effect
    useEffect(() => {
        if (!details?.production_finish_time) {
            setProdTimer(null);
            return;
        }

        const updateTimer = () => {
            const now = new Date().getTime();
            const finish = new Date(details.production_finish_time!).getTime();
            const diff = finish - now;

            if (diff > 0) {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setProdTimer(`${mins}m ${secs}s`);
            } else {
                setProdTimer("Finishing...");
                refreshState(); // Refresh global state since unit count changed
                fetchDetails(); // Refresh local details
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);

    }, [details?.production_finish_time]);


    const handleUpgrade = async () => {
        if (!details) return;
        setActionLoading(true);
        try {
            await buildBuilding(details.name);
            await fetchDetails();
            refreshState(); // Sync gold
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleProduce = async (unitName: string) => {
        if (!details) return;
        setActionLoading(true);
        try {
            await produceUnit(details.id, unitName);
            await fetchDetails();
            refreshState(); // Sync gold
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || !details) return <div>Loading details...</div>;

    const isUpgrading = details.is_constructing;
    const isProducing = !!details.production_type;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={onBack}
                style={{
                    background: 'transparent', border: '1px solid #aaa', color: 'white',
                    padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', marginBottom: '1rem'
                }}
            >
                ← Back
            </button>

            <div style={{
                background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ textTransform: 'capitalize', margin: 0 }}>
                        {details.name.replace(/_/g, ' ')}
                    </h2>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffd700' }}>
                        Lvl {details.level}
                    </div>
                </div>

                {/* Upgrade Section */}
                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <h3>Upgrade</h3>
                    {details.upgrade_cost ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div>
                                Next Level: {details.level + 1} <br />
                                Cost: <span style={{ color: '#ffd700' }}>{details.upgrade_cost} 💰</span> <br />
                                Time: {details.upgrade_duration ? (details.upgrade_duration / 60).toFixed(0) : '?'} min
                            </div>
                            <button
                                onClick={handleUpgrade}
                                disabled={isUpgrading || isActionLoading || (gameState?.user.gold || 0) < details.upgrade_cost}
                                style={{
                                    padding: '0.8rem 1.5rem',
                                    background: isUpgrading ? '#555' : '#2563eb',
                                    color: 'white', border: 'none', borderRadius: '4px',
                                    cursor: isUpgrading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isUpgrading ? 'Upgrading...' : 'Upgrade Now'}
                            </button>
                        </div>
                    ) : (
                        <p>Max Level Reached (or specific max)</p>
                    )}
                </div>

                {/* Production Section */}
                {details.production_options.length > 0 && (
                    <div>
                        <h3>Unit Production</h3>
                        <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                            Speed Bonus: {(100 / details.level).toFixed(0)}% base time (Faster with levels)
                        </p>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {details.production_options.map(opt => {
                                const costString = Object.entries(opt.cost)
                                    .map(([res, amt]) => `${amt} ${res === 'gold' ? '💰' : res}`)
                                    .join(', ');

                                const canAfford = (gameState?.user.gold || 0) >= (opt.cost.gold || 0);
                                // Simplified check (doesn't check pilot count locally, API will reject)

                                return (
                                    <div key={opt.name} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{opt.name.replace(/_/g, ' ')}</div>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                                Cost: {costString} | Time: {(opt.duration / 60).toFixed(1)}m
                                            </div>
                                        </div>

                                        {isProducing && details.production_type === opt.name ? (
                                            <div style={{ color: 'orange', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                                Producing: {prodTimer || '...'}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleProduce(opt.name)}
                                                disabled={isProducing || isActionLoading || !canAfford || (isUpgrading)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: isProducing || !canAfford ? '#444' : '#28a745',
                                                    color: 'white', border: 'none', borderRadius: '4px',
                                                    cursor: (isProducing || !canAfford) ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isProducing ? 'Busy' : 'Produce'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
