import { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import AuthPage from './AuthPage';
import GameLayout from './components/GameLayout';
import OverviewPage from './pages/OverviewPage';
import MapPage from './pages/MapPage';

function MainApp() {
    const { user, loading } = useAuth();
    const [currentPage, setCurrentPage] = useState<'overview' | 'map'>('overview');

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
                color: 'white'
            }}>
                <h2>Loading...</h2>
            </div>
        );
    }

    if (!user) {
        return <AuthPage />;
    }

    return (
        <GameLayout
            user={user}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
        >
            {currentPage === 'overview' ? (
                <OverviewPage />
            ) : (
                <MapPage currentPlanetId={undefined} />
            )}
        </GameLayout>
    );
}

function App() {
    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
}

export default App;
