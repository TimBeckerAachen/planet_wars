import { useState, useEffect } from 'react'

function App() {
    const [data, setData] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(true)

    useEffect(() => {
        fetch('http://localhost:8000/')
            .then(res => res.json())
            .then(data => {
                setData(data.message)
                setLoading(false)
            })
            .catch(err => {
                console.error('Error fetching data:', err)
                setData('Error connecting to backend')
                setLoading(false)
            })
    }, [])

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
            <h1>Full-Stack Application</h1>
            <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
                <h2>Backend Status</h2>
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <p data-testid="backend-message">{data}</p>
                )}
            </div>
        </div>
    )
}

export default App
