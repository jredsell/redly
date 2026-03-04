import React, { useState, useEffect } from 'react';
import { useNotes } from './context/NotesContext';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import HelpModal from './components/HelpModal';
import TrashModal from './components/TrashModal';
import SyncModal from './components/SyncModal';
import SyncConflictModal from './components/SyncConflictModal';
import GlobalTasks from './components/GlobalTasks';
import WelcomeScreen from './components/WelcomeScreen';
import GlobalSearch from './components/GlobalSearch';
import { Menu, Sun, Moon, Bell, CheckCircle } from 'lucide-react';
import RedlyLogo from './components/RedlyLogo';
import PullToRefresh from './components/PullToRefresh';
import { requestNotificationPermission } from './utils/notificationManager';
import * as syncEngine from './lib/sync_engine';

function NotificationToggle() {
  const { notificationSettings, setNotificationSettings } = useNotes();
  const [expanded, setExpanded] = useState(false);

  const handleToggle = async () => {
    if (!notificationSettings.enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    setNotificationSettings(prev => ({ ...prev, enabled: !prev.enabled }));
    if (!notificationSettings.enabled) setExpanded(true);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
      <button
        className="icon-button"
        onClick={handleToggle}
        title={notificationSettings.enabled ? 'Notifications on — click to disable' : 'Enable task notifications'}
        style={{ position: 'relative' }}
      >
        <Bell size={18} style={{ color: notificationSettings.enabled ? 'var(--accent-color)' : 'inherit' }} />
        {notificationSettings.enabled && (
          <span style={{
            position: 'absolute', top: 4, right: 4, width: 7, height: 7,
            borderRadius: '50%', background: 'var(--accent-color)',
            border: '1.5px solid var(--bg-primary)'
          }} />
        )}
      </button>
      {notificationSettings.enabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            Alert
          </label>
          <input
            name="notification-lead-time"
            id="notification-lead-time"
            type="number"
            min="0"
            max="1440"
            value={notificationSettings.leadTime}
            onChange={e => setNotificationSettings(prev => ({ ...prev, leadTime: Number(e.target.value) }))}
            style={{
              width: '44px', fontSize: '12px', padding: '2px 4px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: '4px', color: 'var(--text-primary)', textAlign: 'center'
            }}
            title="Minutes before task is due to notify"
          />
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            min before
          </label>
        </div>
      )}
    </div>
  );
}

function App() {
  const { isInitializing, activeFileId, setActiveFileId, workspaceHandle, disconnectWorkspace, notificationSettings, setNotificationSettings, isDarkMode, setIsDarkMode, loadNodes, triggerSyncPulse } = useNotes();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [pairingRequest, setPairingRequest] = useState(null);
  const [syncConflicts, setSyncConflicts] = useState(null);
  const [syncToasts, setSyncToasts] = useState([]);
  const [syncSuccessModal, setSyncSuccessModal] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  useEffect(() => {
    syncEngine.initSyncEngine({
      onRequest: (peerId, accept, reject) => {
        setPairingRequest({ id: peerId, accept, reject });
      },
      onProgress: (peerId, msg) => { },
      onComplete: (peerId, isAutoSync) => {
        // console.log(`[Sync ${peerId}] Complete. AutoSync: ${!!isAutoSync}`);
        loadNodes();
        triggerSyncPulse();
        if (!isAutoSync) {
          setSyncOpen(false);
          setSyncSuccessModal(true);
        }
      },
      onError: (err) => console.error("Sync Engine Error:", err),
      onConflict: (peerId, conflictsData) => {
        setSyncConflicts({ peerId, conflicts: conflictsData });
      }
    }).catch(e => console.error("Failed to init sync engine", e));
  }, [loadNodes]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || (e.target.closest('.ProseMirror') && !e.altKey)) {
        return;
      }

      if (e.altKey && e.key === '/') {
        e.preventDefault();
        setHelpOpen(prev => !prev);
      }
      if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setActiveFileId(null);
        setShowTasks(false);
        setSidebarOpen(false);
      }
      if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const editor = document.querySelector('.ProseMirror');
        if (editor) {
          editor.focus();
        }
      }
      if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSidebarOpen(true);
        // Explicitly focus the sidebar content or the last interacted node
        setTimeout(() => {
          const sidebarContent = document.querySelector('.sidebar-content');
          if (sidebarContent) {
            const focusedItem = sidebarContent.querySelector('.tree-item.focused') ||
              sidebarContent.querySelector('.tree-item.active') ||
              sidebarContent.querySelector('.tree-item');
            focusedItem?.focus();
          }
        }, 50);
      }
      if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setActiveFileId(null);
        setShowTasks(true);
        setSidebarOpen(false);
      }
      if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        disconnectWorkspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (activeFileId && showTasks) {
      setShowTasks(false);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId, showTasks, disconnectWorkspace]);

  if (isInitializing) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)' }}>Loading Redly...</p>
      </div>
    );
  }

  if (!workspaceHandle) {
    return (
      <div className="app-container" style={{ height: '100dvh' }}>
        <WelcomeScreen openHelp={() => setHelpOpen(true)} />
        <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 100 }}>
          <button
            className="icon-button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Theme"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh>
      <div className="app-container">
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        ></div>

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenTrash={() => setTrashOpen(true)}
          onOpenSync={() => setSyncOpen(true)}
          setShowTasks={() => { setShowTasks(true); setActiveFileId(null); setSidebarOpen(false); }}
          onGoHome={() => { setActiveFileId(null); setShowTasks(false); setSidebarOpen(false); }}
        />
        <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        <TrashModal isOpen={trashOpen} onClose={() => setTrashOpen(false)} />
        {syncOpen && <SyncModal onClose={() => setSyncOpen(false)} />}

        {syncConflicts && (
          <SyncConflictModal
            peerId={syncConflicts.peerId}
            conflicts={syncConflicts.conflicts}
            onResolvedAll={() => setSyncConflicts(null)}
          />
        )}

        {syncToasts.length > 0 && (
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999, pointerEvents: 'none' }}>
            {syncToasts.map(toast => (
              <div key={toast.id} style={{
                background: 'var(--success-color)', color: 'white', padding: '10px 16px', borderRadius: '8px',
                fontSize: '13.5px', fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {toast.msg}
              </div>
            ))}
          </div>
        )}

        {syncSuccessModal && (
          <div className="modal-overlay" onClick={() => setSyncSuccessModal(false)} style={{ zIndex: 9999 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--success-color)' }}>
                <CheckCircle size={48} />
              </div>
              <h2 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600' }}>Sync Successful</h2>
              <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                Your devices are connected and fully synced. We will automatically keep your files up to date in the background.
              </p>
              <button className="primary-btn" onClick={() => setSyncSuccessModal(false)} style={{ padding: '10px 32px', display: 'inline-flex' }}>
                Okay
              </button>
            </div>
          </div>
        )}

        {pairingRequest && (
          <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-content" style={{ maxWidth: '400px' }}>
              <h2 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Device Pairing Request</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginBottom: '28px', lineHeight: '1.5' }}>
                Device <strong style={{ color: 'var(--text-primary)' }}>{pairingRequest.id.substring(0, 16)}...</strong> wants to sync notes. Do you trust this device?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button className="secondary-btn" onClick={() => { pairingRequest.reject(); setPairingRequest(null); }} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}>Deny Request</button>
                <button className="primary-btn" onClick={() => { pairingRequest.accept(); setPairingRequest(null); }} style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Accept & Sync</button>
              </div>
            </div>
          </div>
        )}

        <main className="main-area">
          <div className="app-toolbar" style={{ display: 'flex', gap: '16px', borderBottom: activeFileId ? '1px solid var(--border-color)' : 'none', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button
                className="icon-button mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
                style={{ display: 'none' }}
              >
                <Menu size={20} />
              </button>
              <div
                className="mobile-logo"
                style={{ display: 'none', cursor: 'pointer' }}
                onClick={() => { setActiveFileId(null); setShowTasks(false); }}
              >
                <RedlyLogo size={24} showText={true} />
              </div>
              <style>{`
              @media (max-width: 768px) {
                .mobile-menu-btn { display: flex !important; }
                .mobile-logo { display: block !important; }
              }
            `}</style>
            </div>

            <GlobalSearch />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
              <button
                className="icon-button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <NotificationToggle />
            </div>
          </div>

          {showTasks && <GlobalTasks />}
          {!showTasks && activeFileId && <Editor key={activeFileId} fileId={activeFileId} />}
          {!showTasks && !activeFileId && <WelcomeScreen openHelp={() => setHelpOpen(true)} />}
        </main>
      </div>
    </PullToRefresh>
  );
}

export default App;
