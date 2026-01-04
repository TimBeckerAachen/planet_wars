import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

// Mock fetch
global.fetch = vi.fn()

function createFetchResponse(data: any) {
    return { json: () => new Promise((resolve) => resolve(data)) }
}

describe('App', () => {
    it('renders title', () => {
        render(<App />)
        expect(screen.getByText('Full-Stack Application')).toBeInTheDocument()
    })

    it('fetches and displays backend message', async () => {
        // Setup mock
        (fetch as any).mockResolvedValue(createFetchResponse({ message: 'Hello from FastAPI!' }))

        render(<App />)

        // Should show loading initially
        expect(screen.getByText('Loading...')).toBeInTheDocument()

        // Wait for the message to appear
        await waitFor(() => {
            expect(screen.getByTestId('backend-message')).toHaveTextContent('Hello from FastAPI!')
        })
    })
})
