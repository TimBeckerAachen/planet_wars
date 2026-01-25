import { useMemo } from 'react';
import { useGame } from '../GameContext';

interface UnitDetailsPageProps {
    readonly unitId: number;
    readonly onBack: () => void;
}

// Static definition of unit stats (mirroring backend logic)
const UNIT_INFO: Record<string, {
    description: string;
    stats: Record<string, string>;
    requirements?: string[];
}> = {
    'pilot': {
        description: "Skilled pilots capable of maneuvering spacecraft. Essential for operating space ships.",
        stats: {
            "Role": "Crew",
            "Training Time": "10m (Base)"
        },
        requirements: ["University"]
    },
    'space_ship': {
        description: "Versatile spacecraft used for transport and combat. Requires a pilot to operate.",
        stats: {
            "Attack Strength": "10",
            "Cargo Capacity": "10 Gold",
            "Travel Speed": "10s / Sector",
            "Build Time": "20m (Base)"
        },
        requirements: ["Space Ship Factory", "1 Pilot"]
    }
};

export default function UnitDetailsPage({ unitId, onBack }: UnitDetailsPageProps) {
    const { gameState } = useGame();
    
    // Find unit in current game state
    const unit = useMemo(() => 
        gameState?.units.find(u => u.id === unitId),
        [gameState?.units, unitId]
    );

    if (!gameState || !unit) {
        return <div style={{ padding: '2rem' }}>Unit not found or loading... <button onClick={onBack}>Back</button></div>;
    }

    const info = UNIT_INFO[unit.name] || {
        description: "Unknown Unit",
        stats: {}
    };

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
                        {unit.name.replace(/_/g, ' ')}
                    </h2>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#60a5fa' }}>
                       Count: {unit.count}
                    </div>
                </div>

                <div style={{ 
                    marginBottom: '2rem', 
                    padding: '1rem', 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '8px',
                    lineHeight: '1.6'
                }}>
                    <p style={{ marginTop: 0 }}>{info.description}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {Object.entries(info.stats).map(([label, value]) => (
                        <div key={label} style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {label}
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.2rem' }}>
                                {value}
                            </div>
                        </div>
                    ))}
                </div>

                {info.requirements && (
                    <div style={{ marginTop: '2rem' }}>
                        <h4 style={{ marginBottom: '0.5rem', opacity: 0.8 }}>Requirements / Production Info</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {info.requirements.map(req => (
                                <span key={req} style={{
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    padding: '0.3rem 0.8rem',
                                    borderRadius: '100px',
                                    fontSize: '0.9rem',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {req}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
