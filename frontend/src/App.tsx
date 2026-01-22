import { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { GameProvider } from './GameContext';
import AuthPage from './AuthPage';
import GameLayout from './components/GameLayout';
import OverviewPage from './pages/OverviewPage';
import MapPage from './pages/MapPage';
import BuildingDetailsPage from './pages/BuildingDetailsPage';

type PageState = { view: 'overview' | 'map' } | { view: 'building', id: number };

function MainApp() {
    const { user, loading } = useAuth();
    const [pageState, setPageState] = useState<PageState>({ view: 'overview' });

    if (loading) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: 'white'
            }}>
                <h2>Loading...</h2>
            </div>
        );
    }

    if (!user) return <AuthPage />;

    // Helper for GameLayout nav
    const handleNav = (page: 'overview' | 'map') => setPageState({ view: page });

    return (
        <GameLayout
            user={user}
            currentPage={pageState.view === 'map' ? 'map' : 'overview'}
            onNavigate={handleNav}
        >
            {pageState.view === 'overview' && (
                <OverviewPage onBuildingClick={(id) => setPageState({ view: 'building', id })} />
            )}

            {pageState.view === 'map' && (
                <MapPage currentPlanetId={undefined} />
            )}

            {pageState.view === 'building' && (
                <BuildingDetailsPage
                    buildingId={pageState.id}
                    onBack={() => setPageState({ view: 'overview' })}
                />
            )}
        </GameLayout>
    );
}

function App() {
    return (
        <AuthProvider>
            <GameProvider>
                <MainApp />
            </GameProvider>
        </AuthProvider>
    );
}

export default App;
