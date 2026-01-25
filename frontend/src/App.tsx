import { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { GameProvider } from './GameContext';
import AuthPage from './AuthPage';
import GameLayout from './components/GameLayout';
import OverviewPage from './pages/OverviewPage';
import MapPage from './pages/MapPage';
import BuildingDetailsPage from './pages/BuildingDetailsPage';
import MailboxPage from './pages/MailboxPage';
import PlanetDetailsPage from './pages/PlanetDetailsPage';
import UnitDetailsPage from './pages/UnitDetailsPage';

type PageState =
    | { view: 'overview' | 'map' | 'mailbox' }
    | { view: 'building', id: number }
    | { view: 'unit', id: number }
    | { view: 'planet', id: number };

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
    const handleNav = (page: 'overview' | 'map' | 'mailbox') => setPageState({ view: page });
    const getCurrentPage = () => {
        if (pageState.view === 'map' || pageState.view === 'planet') return 'map';
        if (pageState.view === 'mailbox') return 'mailbox';
        return 'overview';
    };

    return (
        <GameLayout
            user={user}
            currentPage={getCurrentPage()}
            onNavigate={handleNav}
        >
            {pageState.view === 'overview' && (
                <OverviewPage 
                    onBuildingClick={(id) => setPageState({ view: 'building', id })} 
                    onUnitClick={(id) => setPageState({ view: 'unit', id })}
                />
            )}

            {pageState.view === 'map' && (
                <MapPage onPlanetClick={(id) => setPageState({ view: 'planet', id })} />
            )}

            {pageState.view === 'mailbox' && (
                <MailboxPage />
            )}

            {pageState.view === 'building' && (
                <BuildingDetailsPage
                    buildingId={pageState.id}
                    onBack={() => setPageState({ view: 'overview' })}
                />
            )}

            {pageState.view === 'unit' && (
                <UnitDetailsPage
                    unitId={pageState.id}
                    onBack={() => setPageState({ view: 'overview' })}
                />
            )}

            {pageState.view === 'planet' && (
                <PlanetDetailsPage
                    planetId={pageState.id}
                    onBack={() => setPageState({ view: 'map' })}
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
