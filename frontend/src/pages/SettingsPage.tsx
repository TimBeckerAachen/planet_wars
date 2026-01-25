import { useState } from 'react';
import { User } from '../types';
import { changePassword, deleteUser, logout } from '../api';

interface SettingsPageProps {
    user: User;
    onBack: () => void;
}

export default function SettingsPage({ user, onBack }: SettingsPageProps) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            await changePassword(oldPassword, newPassword);
            setSuccess('Password changed successfully');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone. Your planets will be abandoned.')) {
            return;
        }

        const confirmName = window.prompt(`Type your username "${user.username}" to confirm deletion:`);
        if (confirmName !== user.username) {
            alert('Username does not match. Deletion cancelled.');
            return;
        }

        try {
            await deleteUser();
            logout();
            window.location.reload();
        } catch (err) {
            alert('Failed to delete account: ' + (err as Error).message);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', color: 'white' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <button 
                    onClick={onBack}
                    style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    ← Back
                </button>
                <h2>User Settings</h2>
            </div>

            <div style={{ display: 'grid', gap: '2rem' }}>
                {/* Profile Info */}
                <section style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '2rem',
                    borderRadius: '12px'
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                        Profile Information
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem 2rem', alignItems: 'center' }}>
                        <div style={{ opacity: 0.7 }}>User ID</div>
                        <div style={{ fontFamily: 'monospace' }}>{user.id}</div> 

                        <div style={{ opacity: 0.7 }}>Username</div>
                        <div style={{ fontWeight: 'bold' }}>{user.username}</div>

                        <div style={{ opacity: 0.7 }}>Email</div>
                        <div>{user.email}</div>

                        <div style={{ opacity: 0.7 }}>Joined</div>
                        <div>{new Date(user.created_at).toLocaleDateString()}</div>
                    </div>
                </section>

                {/* Security */}
                <section style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '2rem',
                    borderRadius: '12px'
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                        Security
                    </h3>
                    
                    <form onSubmit={handleChangePassword} style={{ maxWidth: '400px' }}>
                        <h4 style={{ margin: '0 0 1rem 0' }}>Change Password</h4>
                        
                        {error && (
                            <div style={{ background: 'rgba(255,0,0,0.2)', color: '#ff8888', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div style={{ background: 'rgba(0,255,0,0.2)', color: '#88ff88', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
                                {success}
                            </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Current Password</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none', background: 'rgba(0,0,0,0.5)', color: 'white' }}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none', background: 'rgba(0,0,0,0.5)', color: 'white' }}
                                required
                                minLength={8}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none', background: 'rgba(0,0,0,0.5)', color: 'white' }}
                                required
                                minLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: '#2563eb',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '6px',
                                cursor: loading ? 'wait' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </section>

                {/* Danger Zone */}
                <section style={{
                    background: 'rgba(255, 0, 0, 0.05)',
                    border: '1px solid rgba(255, 0, 0, 0.2)',
                    padding: '2rem',
                    borderRadius: '12px'
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#ff6b6b' }}>
                        Danger Zone
                    </h3>
                    <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
                        Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                        onClick={handleDeleteUser}
                        style={{
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Delete Account
                    </button>
                </section>
            </div>
        </div>
    );
}
