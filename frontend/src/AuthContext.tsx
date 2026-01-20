import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, getCurrentUser, logout as apiLogout, signupUser, loginUser } from './api';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (identifier: string, password: string) => Promise<void>;
    signup: (username: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Auto-login on mount if token exists
    useEffect(() => {
        const initAuth = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                // Token invalid or expired, clear it
                apiLogout();
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (identifier: string, password: string) => {
        const response = await loginUser(identifier, password);
        setUser(response.user);
    };

    const signup = async (username: string, email: string, password: string) => {
        const response = await signupUser(username, email, password);
        setUser(response.user);
    };

    const logout = () => {
        apiLogout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
