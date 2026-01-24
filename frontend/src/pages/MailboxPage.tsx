import { useEffect, useState } from 'react';
import { Message, MessageListState } from '../types';
import { getMessages, markMessageRead, deleteMessage, sendMessage } from '../api';
import { useGame } from '../GameContext';

export default function MailboxPage() {
    const { refreshState } = useGame();
    const [messageState, setMessageState] = useState<MessageListState | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Reply state
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [replyBody, setReplyBody] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [replyError, setReplyError] = useState<string | null>(null);
    const [replySuccess, setReplySuccess] = useState<string | null>(null);

    const loadMessages = async () => {
        try {
            const data = await getMessages();
            setMessageState(data);
            refreshState(); // Sync global unread count
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
            setReplyingTo(null);
        } else {
            setExpandedId(message.id);
            setReplyingTo(null);
            setReplySuccess(null);
            setReplyError(null);
            if (!message.is_read) {
                await markMessageRead(message.id);
                loadMessages(); // Refresh to update read status
            }
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this message?')) return;
        
        try {
            await deleteMessage(id);
            if (expandedId === id) setExpandedId(null);
            loadMessages();
        } catch (err) {
            alert('Failed to delete message');
        }
    };

    const parseSender = (body: string) => {
        const match = body.match(/^From: (.*?)\n\n/);
        return match ? match[1] : null;
    };

    const handleStartReply = (message: Message, e: React.MouseEvent) => {
        e.stopPropagation();
        setReplyingTo(message);
        setReplyBody('');
        setExpandedId(message.id); // Ensure expanded
    };

    const handleSendReply = async () => {
        if (!replyingTo) return;
        
        const sender = parseSender(replyingTo.body);
        if (!sender) {
            setReplyError('Cannot reply: Sender not found in message.');
            return;
        }

        setSendingReply(true);
        setReplyError(null);
        setReplySuccess(null);

        try {
            await sendMessage(sender, `Re: ${replyingTo.subject}`, replyBody);
            setReplySuccess('Reply sent successfully!');
            setTimeout(() => {
                setReplyingTo(null);
                setReplySuccess(null);
            }, 1500);
        } catch (err) {
            setReplyError(err instanceof Error ? err.message : 'Failed to send reply');
        } finally {
            setSendingReply(false);
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
        <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
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
                    {messageState.messages.map(message => {
                        const sender = parseSender(message.body);
                        return (
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
                                            gap: '0.5rem',
                                            color: sender ? '#60a5fa' : 'inherit'
                                        }}>
                                            {!message.is_read && (
                                                <span style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    background: '#3b82f6',
                                                    borderRadius: '50%'
                                                }} />
                                            )}
                                            {sender ? `From: ${sender} - ${message.subject}` : message.subject}
                                        </div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: '#888',
                                            marginTop: '0.25rem'
                                        }}>
                                            {formatDate(message.created_at)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => handleDelete(message.id, e)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#f87171',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                fontSize: '1rem',
                                                opacity: 0.7
                                            }}
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                        <span style={{
                                            transform: expandedId === message.id ? 'rotate(180deg)' : 'rotate(0)',
                                            transition: 'transform 0.2s'
                                        }}>
                                            ▼
                                        </span>
                                    </div>
                                </div>

                                {expandedId === message.id && (
                                    <div style={{
                                        marginTop: '1rem',
                                        paddingTop: '1rem',
                                        borderTop: '1px solid rgba(255,255,255,0.1)',
                                        color: '#ddd',
                                        whiteSpace: 'pre-wrap',
                                        cursor: 'default'
                                    }} onClick={e => e.stopPropagation()}>
                                        {message.body}

                                        {/* Actions */}
                                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            {sender && !replyingTo && (
                                                <button
                                                    onClick={(e) => handleStartReply(message, e)}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        background: '#3b82f6',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        color: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ↩️ Reply
                                                </button>
                                            )}
                                        </div>

                                        {/* Reply Form */}
                                        {replyingTo?.id === message.id && (
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '1rem',
                                                background: 'rgba(0,0,0,0.3)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                <h4>Reply to {sender}</h4>
                                                <textarea
                                                    value={replyBody}
                                                    onChange={e => setReplyBody(e.target.value)}
                                                    placeholder="Type your reply..."
                                                    style={{
                                                        width: '100%',
                                                        minHeight: '80px',
                                                        padding: '0.5rem',
                                                        borderRadius: '6px',
                                                        background: '#1a1a1a',
                                                        border: '1px solid #444',
                                                        color: 'white',
                                                        marginBottom: '0.5rem',
                                                        resize: 'vertical'
                                                    }}
                                                />
                                                {replyError && <div style={{ color: '#ef4444', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{replyError}</div>}
                                                {replySuccess && <div style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{replySuccess}</div>}
                                                
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={handleSendReply}
                                                        disabled={sendingReply || !replyBody.trim()}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            background: sendingReply ? '#666' : '#22c55e',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            color: 'white',
                                                            cursor: sendingReply ? 'default' : 'pointer'
                                                        }}
                                                    >
                                                        {sendingReply ? 'Sending...' : 'Send Reply'}
                                                    </button>
                                                    <button
                                                        onClick={() => setReplyingTo(null)}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            background: 'transparent',
                                                            border: '1px solid #666',
                                                            borderRadius: '6px',
                                                            color: '#aaa',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
