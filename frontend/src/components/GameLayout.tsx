import { useState } from 'react';
import { User } from '../types';
import { logout } from '../api';

interface GameLayoutProps {
    user: User;
    children: React.ReactNode;
    onNavigate: (page: 'overview' | 'map') => void;
    currentPage: 'overview' | 'map';
}

export default function GameLayout({ user, children, onNavigate, currentPage }: GameLayoutProps) {
    const [showSettings, setShowSettings] = useState(false);

    return (
        <div className="game-layout" style={{
            minHeight: '100vh',
            background: '#0f0c29',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Top Bar */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '1rem 2rem',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <div className="logo" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Planet Wars</div>

                    {/* Resources */}
                    <div className="resources" style={{
                        display: 'flex',
                        gap: '1rem',
                        padding: '0.5rem 1rem',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '20px',
                        border: '1px solid gold'
                    }}>
                        <span style={{ color: 'gold' }}>Gold: {user.gold}</span>
                    </div>

                    {/* Navigation */}
                    <nav style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => onNavigate('overview')}
                            style={{
                                background: currentPage === 'overview' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                border: 'none',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => onNavigate('map')}
                            style={{
                                background: currentPage === 'map' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                border: 'none',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Map
                        </button>
                    </nav>
                </div>

                {/* Right Settings */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        ⚙️
                    </button>
                    {showSettings && (
                        <div style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            background: '#1a1a2e',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            width: '150px',
                            zIndex: 100
                        }}>
                            <button
                                onClick={() => { logout(); window.location.reload(); }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ff4444',
                                    cursor: 'pointer'
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '2rem' }}>
                {children}
            </main>
        </div>
    );
}
