import React from 'react';
import { Bell, BellOff, Clock, X } from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { requestNotificationPermission } from '../utils/notificationManager';

export default function NotificationSettings({ onClose }) {
    const { notificationSettings, setNotificationSettings } = useNotes();

    const handleToggle = async () => {
        if (!notificationSettings.enabled) {
            const granted = await requestNotificationPermission();
            if (!granted) {
                alert('Notification permission denied. Please enable it in your browser settings to use this feature.');
                return;
            }
        }
        setNotificationSettings(prev => ({ ...prev, enabled: !prev.enabled }));
    };

    const handleLeadTimeChange = (e) => {
        const leadTime = parseInt(e.target.value, 10);
        setNotificationSettings(prev => ({ ...prev, leadTime }));
    };

    return (
        <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)',
            minWidth: '280px',
            color: 'var(--text-primary)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={18} style={{ color: 'var(--accent-color)' }} />
                    Task Notifications
                </h3>
                <button onClick={onClose} className="icon-button">
                    <X size={18} />
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px' }}>Enable Alerts</span>
                <button
                    onClick={handleToggle}
                    style={{
                        width: '44px',
                        height: '24px',
                        backgroundColor: notificationSettings.enabled ? 'var(--accent-color)' : 'var(--bg-accent)',
                        borderRadius: '12px',
                        border: 'none',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                >
                    <div style={{
                        width: '18px',
                        height: '18px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '3px',
                        left: notificationSettings.enabled ? '23px' : '3px',
                        transition: 'left 0.2s'
                    }} />
                </button>
            </div>

            {notificationSettings.enabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        <Clock size={14} />
                        Lead Time: <strong>{notificationSettings.leadTime} minutes</strong>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="60"
                        step="5"
                        value={notificationSettings.leadTime}
                        onChange={handleLeadTimeChange}
                        style={{
                            width: '100%',
                            cursor: 'pointer',
                            accentColor: 'var(--accent-color)'
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        <span>Immediate</span>
                        <span>30m</span>
                        <span>1h</span>
                    </div>
                </div>
            )}

            {!notificationSettings.enabled && (
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center' }}>
                    Notifications are currently disabled.
                </div>
            )}
        </div>
    );
}
