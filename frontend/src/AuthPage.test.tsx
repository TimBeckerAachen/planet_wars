import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthPage from './AuthPage';
import { AuthProvider } from './AuthContext';
import { vi } from 'vitest';

// Mock the API calls
vi.mock('./api', () => ({
    loginUser: vi.fn(),
    signupUser: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    getAuthToken: vi.fn().mockReturnValue(null),
}));

describe('AuthPage', () => {
    it('renders login form by default', () => {
        render(
            <AuthProvider>
                <AuthPage />
            </AuthProvider>
        );

        expect(screen.getByPlaceholderText('Enter username or email')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('switches to signup form', () => {
        render(
            <AuthProvider>
                <AuthPage />
            </AuthProvider>
        );

        fireEvent.click(screen.getByText("Don't have an account? Sign up"));

        expect(screen.getByPlaceholderText('Choose a username')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
    });

    it('validates password match during signup', async () => {
        render(
            <AuthProvider>
                <AuthPage />
            </AuthProvider>
        );

        // Switch to signup
        fireEvent.click(screen.getByText("Don't have an account? Sign up"));

        // Fill form with mismatched passwords
        fireEvent.change(screen.getByPlaceholderText('Choose a username'), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Min 8 characters'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { value: 'mismatch' } });

        fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

        expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    });
});
