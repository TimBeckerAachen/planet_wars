import { AuthProvider, useAuth } from './AuthContext';
import AuthPage from './AuthPage';

function MainApp() {
    const { user, loading, logout } = useAuth();

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
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem'
            }}>
                <h1>Welcome, {user.username}!</h1>
                <button
                    onClick={logout}
                    style={{
                        padding: '10px 20px',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Logout
                </button>
            </div>
            <div style={{
                padding: '1rem',
                border: '1px solid #ccc',
                borderRadius: '8px',
                background: '#f9fafb'
            }}>
                <h2>Planet Wars - Game Coming Soon</h2>
                <p>You are successfully authenticated!</p>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
        </div>
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
