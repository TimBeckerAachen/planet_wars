import { useEffect, useState } from 'react';
import { Message, MessageListState } from '../types';
import { getMessages, markMessageRead } from '../api';

export default function MailboxPage() {
    const [messageState, setMessageState] = useState<MessageListState | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const loadMessages = async () => {
        try {
            const data = await getMessages();
            setMessageState(data);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMessages();
    }, []);

    const handleExpand = async (message: Message) => {
        if (expandedId === message.id) {
            setExpandedId(null);
        } else {
            setExpandedId(message.id);
            if (!message.is_read) {
                await markMessageRead(message.id);
                loadMessages(); // Refresh to update read status
            }
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>📬 Loading messages...</h2>
            </div>
        );
    }

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <h2 style={{ margin: 0 }}>📬 Mailbox</h2>
                {messageState && messageState.unread_count > 0 && (
                    <span style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.875rem'
                    }}>
                        {messageState.unread_count} unread
                    </span>
                )}
            </div>

            {!messageState || messageState.messages.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#888',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px'
                }}>
                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
                    <p>No messages yet</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {messageState.messages.map(message => (
                        <div
                            key={message.id}
                            onClick={() => handleExpand(message)}
                            style={{
                                background: message.is_read
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(59, 130, 246, 0.2)',
                                borderRadius: '8px',
                                padding: '1rem',
                                cursor: 'pointer',
                                border: message.is_read
                                    ? '1px solid transparent'
                                    : '1px solid rgba(59, 130, 246, 0.5)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: message.is_read ? 'normal' : 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        {!message.is_read && (
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                background: '#3b82f6',
                                                borderRadius: '50%'
                                            }} />
                                        )}
                                        {message.subject}
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        color: '#888',
                                        marginTop: '0.25rem'
                                    }}>
                                        {formatDate(message.created_at)}
                                    </div>
                                </div>
                                <span style={{
                                    transform: expandedId === message.id ? 'rotate(180deg)' : 'rotate(0)',
                                    transition: 'transform 0.2s'
                                }}>
                                    ▼
                                </span>
                            </div>

                            {expandedId === message.id && (
                                <div style={{
                                    marginTop: '1rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    color: '#ddd',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {message.body}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
