import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';
import './AuthPage.css';

export default function AuthPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const { login, signup } = useAuth();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'signup') {
                // Validate passwords match
                if (formData.password !== formData.confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }

                // Validate password length
                if (formData.password.length < 8) {
                    setError('Password must be at least 8 characters');
                    setLoading(false);
                    return;
                }

                await signup(formData.username, formData.email, formData.password);
            } else {
                await login(formData.username, formData.password);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setError('');
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
    };

    return (
        <div className="auth-page">
            <div className="auth-background">
                <div className="stars"></div>
                <div className="planet planet-1"></div>
                <div className="planet planet-2"></div>
            </div>

            <div className="auth-container">
                <div className="auth-card">
                    <h1 className="auth-title">Planet Wars</h1>
                    <p className="auth-subtitle">
                        {mode === 'login' ? 'Welcome back, Commander' : 'Join the battle'}
                    </p>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="username">
                                {mode === 'login' ? 'Username or Email' : 'Username'}
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={formData.username}
                                onChange={(e) =>
                                    setFormData({ ...formData, username: e.target.value })
                                }
                                required
                                placeholder={mode === 'login' ? 'Enter username or email' : 'Choose a username'}
                            />
                        </div>

                        {mode === 'signup' && (
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    required
                                    placeholder="Enter your email"
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                required
                                placeholder={mode === 'signup' ? 'Min 8 characters' : 'Enter password'}
                            />
                        </div>

                        {mode === 'signup' && (
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) =>
                                        setFormData({ ...formData, confirmPassword: e.target.value })
                                    }
                                    required
                                    placeholder="Re-enter password"
                                />
                            </div>
                        )}

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <button onClick={toggleMode} className="toggle-btn">
                            {mode === 'login'
                                ? "Don't have an account? Sign up"
                                : 'Already have an account? Login'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
