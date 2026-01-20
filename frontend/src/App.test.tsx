import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

// Mock the API module
vi.mock('./api', () => ({
    getAuthToken: vi.fn(),
    getCurrentUser: vi.fn(),
    loginUser: vi.fn(),
    signupUser: vi.fn(),
    logout: vi.fn()
}))

describe('App', () => {
    it('renders AuthPage when not authenticated', async () => {
        render(<App />)
        // Should find login form elements after loading
        expect(await screen.findByPlaceholderText('Enter username or email')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    })
})

