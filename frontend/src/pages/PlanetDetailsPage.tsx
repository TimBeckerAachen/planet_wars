import { useState, useEffect } from 'react';
import { Planet, GameState, Unit, FleetMissionsState } from '../types';
import { getMap, getGameState, sendFleet, sendMessage, getFleetMissions } from '../api';

interface PlanetDetailsPageProps {
    planetId: number;
    onBack: () => void;
}

export default function PlanetDetailsPage({ planetId, onBack }: PlanetDetailsPageProps) {
    const [planet, setPlanet] = useState<Planet | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [fleetMissions, setFleetMissions] = useState<FleetMissionsState | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'fleet' | 'message'>('info');

    // Fleet form state
    const [missionType, setMissionType] = useState<'attack' | 'transport'>('attack');
    const [shipCount, setShipCount] = useState(1);
    const [goldAmount, setGoldAmount] = useState(0);
    const [fleetError, setFleetError] = useState<string | null>(null);
    const [fleetSuccess, setFleetSuccess] = useState<string | null>(null);
    const [sendingFleet, setSendingFleet] = useState(false);

    // Message form state
    const [messageSubject, setMessageSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [messageError, setMessageError] = useState<string | null>(null);
    const [messageSuccess, setMessageSuccess] = useState<string | null>(null);
    const [sendingMessage, setSendingMessage] = useState(false);

    const loadData = async () => {
        try {
            const [mapData, gameData, missions] = await Promise.all([
                getMap(),
                getGameState(),
                getFleetMissions()
            ]);
            const foundPlanet = mapData.planets.find(p => p.id === planetId);
            setPlanet(foundPlanet || null);
            setGameState(gameData);
            setFleetMissions(missions);

            // Set default mission type based on ownership
            if (foundPlanet && gameData && foundPlanet.owner_id === gameData.user.id) {
                setMissionType('transport');
            } else {
                setMissionType('attack');
            }
        } catch (error) {
            console.error('Failed to load planet data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [planetId]);

    const myShips = gameState?.units.find((u: Unit) => u.name === 'space_ship')?.count || 0;
    const isOwnPlanet = planet && gameState && planet.owner_id === gameState.user.id;
    const isSourcePlanet = planet && gameState && planet.id === gameState.planet.id;

    // Live clock for updates
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const missionCardStyle = (type: 'primary' | 'info' | 'warning' | 'error'): React.CSSProperties => {
        const colors = {
            primary: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
            info: { bg: 'rgba(59, 130, 246, 0.05)', border: 'rgba(59, 130, 246, 0.2)' },
            warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
            error: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' }
        };
        return {
            padding: '0.75rem', 
            background: colors[type].bg, 
            borderRadius: '6px',
            marginBottom: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: `1px solid ${colors[type].border}`
        };
    };

    // Calculate travel time (Manhattan distance * 10 seconds)
    const calculateTravelTime = () => {
        if (!planet || !gameState) return 0;
        const sourcePlanet = gameState.planet;
        const distance = Math.abs(planet.x - sourcePlanet.x) + Math.abs(planet.y - sourcePlanet.y);
        return distance * 10;
    };

    const travelTime = calculateTravelTime();
    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    // Get missions related to this planet
    const missionsToThisPlanet = fleetMissions?.outgoing.filter(m => m.target_planet_id === planetId) || [];

    const handleSendFleet = async () => {
        if (!planet) return;
        setSendingFleet(true);
        setFleetError(null);
        setFleetSuccess(null);

        try {
            await sendFleet(planet.id, missionType, shipCount, goldAmount);
            setFleetSuccess(`Fleet of ${shipCount} ships sent! ETA: ${formatTime(travelTime)}`);
            await loadData(); // Refresh all data
        } catch (err) {
            setFleetError(err instanceof Error ? err.message : 'Failed to send fleet');
        } finally {
            setSendingFleet(false);
        }
    };

    const handleSendMessage = async () => {
        if (!planet || !planet.owner_username) return;
        setSendingMessage(true);
        setMessageError(null);
        setMessageSuccess(null);

        try {
            await sendMessage(planet.owner_username, messageSubject, messageBody);
            setMessageSuccess('Message sent!');
            setMessageSubject('');
            setMessageBody('');
        } catch (err) {
            setMessageError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setSendingMessage(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Loading planet data...</h2>
            </div>
        );
    }

    if (!planet) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Planet not found</h2>
                <button onClick={onBack} style={buttonStyle}>← Back to Map</button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button onClick={onBack} style={{ ...buttonStyle, background: '#374151', padding: '0.5rem 1rem' }}>
                    ← Back
                </button>
                <h2 style={{ margin: 0, flex: 1 }}>🌍 {planet.name}</h2>
            </div>

            {/* Planet Info Card */}
            <div style={cardStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                        <span style={{ color: '#888' }}>Owner</span>
                        <div style={{ fontSize: '1.1rem', color: isOwnPlanet ? '#4ade80' : '#f87171' }}>
                            {planet.owner_username || 'Unknown'}
                            {isOwnPlanet && ' (You)'}
                        </div>
                    </div>
                    <div>
                        <span style={{ color: '#888' }}>Coordinates</span>
                        <div style={{ fontSize: '1.1rem' }}>({planet.x}, {planet.y})</div>
                    </div>
                    <div>
                        <span style={{ color: '#888' }}>Travel Time</span>
                        <div style={{ fontSize: '1.1rem' }}>🚀 {formatTime(travelTime)}</div>
                    </div>
                </div>
            </div>

            {/* Missions Section */}
            {(missionsToThisPlanet.length > 0 || (isOwnPlanet && fleetMissions && (fleetMissions.incoming.length > 0 || fleetMissions.outgoing.length > 0))) && (
                <div style={{ ...cardStyle, background: 'rgba(0,0,0,0.2)', padding: '1rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0' }}>🚀 Active Fleets</h3>
                    
                    {/* 1. Incoming to ME (Only visible on own planet) */}
                    {isOwnPlanet && fleetMissions?.incoming.map(mission => {
                        const arrival = new Date(mission.arrival_time).getTime();
                        const secsRemaining = Math.max(0, Math.floor((arrival - now) / 1000));
                        const isAttack = mission.mission_type === 'attack';
                        return (
                            <div key={mission.id} style={missionCardStyle(isAttack ? 'error' : 'warning')}>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: isAttack ? '#ef4444' : '#fbbf24' }}>
                                        {isAttack ? '⚔️ Incoming Attack' : '📦 Incoming Transport'}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                        {mission.ship_count} ships from {mission.source_owner_username}
                                    </div>
                                </div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    {formatTime(secsRemaining)}
                                </div>
                            </div>
                        );
                    })}

                    {/* 2. My Outgoing to THIS planet */}
                    {!isOwnPlanet && missionsToThisPlanet.map(mission => {
                        const arrival = new Date(mission.arrival_time).getTime();
                        const secsRemaining = Math.max(0, Math.floor((arrival - now) / 1000));
                        const isAttack = mission.mission_type === 'attack';
                        return (
                            <div key={mission.id} style={missionCardStyle('primary')}>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: isAttack ? '#ef4444' : '#60a5fa' }}>
                                        {isAttack ? '⚔️ Attacking' : '📦 Transporting'}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                        {mission.ship_count} ships from You
                                        {mission.gold_carried > 0 && ` + ${mission.gold_carried} gold`}
                                    </div>
                                </div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    {formatTime(secsRemaining)}
                                </div>
                            </div>
                        );
                    })}

                    {/* 3. My Outgoing (General) - Only shown on My Planet Details to show what's leaving */}
                    {isOwnPlanet && fleetMissions?.outgoing.map(mission => {
                         const arrival = new Date(mission.arrival_time).getTime();
                         const secsRemaining = Math.max(0, Math.floor((arrival - now) / 1000));
                         const isAttack = mission.mission_type === 'attack';
                         return (
                             <div key={mission.id} style={missionCardStyle('info')}>
                                 <div>
                                     <div style={{ fontWeight: 'bold', color: isAttack ? '#ef4444' : '#60a5fa' }}>
                                         {isAttack ? '⚔️ Outgoing Attack' : '📦 Outgoing Transport'}
                                     </div>
                                     <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                         {mission.ship_count} ships → {mission.target_planet_name || `Planet ${mission.target_planet_id}`}
                                     </div>
                                 </div>
                                 <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                     {formatTime(secsRemaining)}
                                 </div>
                             </div>
                         );
                    })}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    onClick={() => setActiveTab('info')}
                    style={{ ...tabStyle, background: activeTab === 'info' ? 'rgba(255,255,255,0.2)' : 'transparent' }}
                >
                    📋 Info
                </button>
                {!isSourcePlanet && (
                    <button
                        onClick={() => setActiveTab('fleet')}
                        style={{ ...tabStyle, background: activeTab === 'fleet' ? 'rgba(255,255,255,0.2)' : 'transparent' }}
                    >
                        🚀 Send Fleet
                    </button>
                )}
                {!isOwnPlanet && planet.owner_username && (
                    <button
                        onClick={() => setActiveTab('message')}
                        style={{ ...tabStyle, background: activeTab === 'message' ? 'rgba(255,255,255,0.2)' : 'transparent' }}
                    >
                        ✉️ Message
                    </button>
                )}
            </div>

            {/* Tab Content */}
            {activeTab === 'info' && (
                <div style={cardStyle}>
                    <p style={{ color: '#aaa', margin: 0 }}>
                        {isSourcePlanet
                            ? 'This is your home planet.'
                            : isOwnPlanet
                            ? 'You own this planet. You can transport gold here.'
                            : `This planet belongs to ${planet.owner_username}. You can attack or send them gold.`}
                    </p>
                </div>
            )}

            {activeTab === 'fleet' && !isSourcePlanet && (
                <div style={cardStyle}>
                    <h3 style={{ marginTop: 0 }}>
                        {missionType === 'attack' ? '⚔️ Attack' : '📦 Transport'}
                    </h3>

                    {/* Always show mission type buttons for non-source planets */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Mission Type</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setMissionType('attack')}
                                disabled={isOwnPlanet as boolean}
                                style={{
                                    ...buttonStyle,
                                    flex: 1,
                                    background: missionType === 'attack' ? '#ef4444' : 'transparent',
                                    border: '1px solid #ef4444',
                                    opacity: isOwnPlanet ? 0.3 : 1
                                }}
                            >
                                ⚔️ Attack
                            </button>
                            <button
                                onClick={() => setMissionType('transport')}
                                style={{
                                    ...buttonStyle,
                                    flex: 1,
                                    background: missionType === 'transport' ? '#3b82f6' : 'transparent',
                                    border: '1px solid #3b82f6'
                                }}
                            >
                                📦 Transport
                            </button>
                        </div>
                        {isOwnPlanet && (
                            <p style={{ fontSize: '0.8rem', color: '#888', margin: '0.5rem 0 0 0' }}>
                                Cannot attack your own planet
                            </p>
                        )}
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Ships to send (Available: {myShips})</label>
                        <input
                            type="number"
                            min={1}
                            max={myShips}
                            value={shipCount}
                            onChange={e => setShipCount(Math.max(1, Math.min(myShips, Number.parseInt(e.target.value) || 1)))}
                            style={inputStyle}
                        />
                    </div>

                    {missionType === 'transport' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Gold to transport (Max: {Math.min(gameState?.user.gold || 0, shipCount * 10)})</label>
                            <input
                                type="number"
                                min={0}
                                max={Math.min(gameState?.user.gold || 0, shipCount * 10)}
                                value={goldAmount}
                                onChange={e => setGoldAmount(Math.max(0, Number.parseInt(e.target.value) || 0))}
                                style={inputStyle}
                            />
                        </div>
                    )}

                    {/* Mission preview */}
                    <div style={{ 
                        background: missionType === 'attack' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
                        padding: '0.75rem', 
                        borderRadius: '8px', 
                        marginBottom: '1rem' 
                    }}>
                        {missionType === 'attack' ? (
                            <>
                                ⚔️ Attack strength: {shipCount * 10}<br />
                                💰 Can steal up to {shipCount * 10} gold<br />
                            </>
                        ) : (
                            <>
                                📦 Transporting {goldAmount} gold<br />
                            </>
                        )}
                        🕐 Travel time: {formatTime(travelTime)}
                    </div>

                    {fleetError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.3)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', color: '#ff6b6b' }}>
                            {fleetError}
                        </div>
                    )}

                    {fleetSuccess && (
                        <div style={{ background: 'rgba(74, 222, 128, 0.3)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', color: '#4ade80' }}>
                            {fleetSuccess}
                        </div>
                    )}

                    <button
                        onClick={handleSendFleet}
                        disabled={sendingFleet || myShips < 1}
                        style={{
                            ...buttonStyle,
                            width: '100%',
                            background: missionType === 'attack'
                                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            opacity: sendingFleet || myShips < 1 ? 0.5 : 1
                        }}
                    >
                        {sendingFleet ? 'Sending...' : `Send Fleet (${formatTime(travelTime)})`}
                    </button>
                </div>
            )}

            {activeTab === 'message' && !isOwnPlanet && planet.owner_username && (
                <div style={cardStyle}>
                    <h3 style={{ marginTop: 0 }}>✉️ Send Message to {planet.owner_username}</h3>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Subject</label>
                        <input
                            type="text"
                            value={messageSubject}
                            onChange={e => setMessageSubject(e.target.value)}
                            placeholder="Enter subject..."
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Message</label>
                        <textarea
                            value={messageBody}
                            onChange={e => setMessageBody(e.target.value)}
                            placeholder="Type your message..."
                            rows={4}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </div>

                    {messageError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.3)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', color: '#ff6b6b' }}>
                            {messageError}
                        </div>
                    )}

                    {messageSuccess && (
                        <div style={{ background: 'rgba(74, 222, 128, 0.3)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', color: '#4ade80' }}>
                            {messageSuccess}
                        </div>
                    )}

                    <button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || !messageSubject || !messageBody}
                        style={{
                            ...buttonStyle,
                            width: '100%',
                            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                            opacity: sendingMessage || !messageSubject || !messageBody ? 0.5 : 1
                        }}
                    >
                        {sendingMessage ? 'Sending...' : 'Send Message'}
                    </button>
                </div>
            )}
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.1)'
};

const buttonStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem'
};

const tabStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)'
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#ccc'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #444',
    background: '#0a0a1a',
    color: 'white',
    fontSize: '1rem',
    boxSizing: 'border-box'
};
