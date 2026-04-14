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
import CollaborationModal from './components/CollaborationModal';
import { Menu, Sun, Moon, Bell, CheckCircle, RefreshCw, Share2, Activity, PanelLeft } from 'lucide-react';
import RedlyLogo from './components/RedlyLogo';
import PullToRefresh from './components/PullToRefresh';
import { requestNotificationPermission } from './utils/notificationManager';
import * as syncEngine from './lib/sync_engine';
import { exportSandboxData } from './lib/db';
import { migrateSandboxToLocal } from './lib/migration';

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
  const { 
    isInitializing, activeFileId, setActiveFileId, workspaceHandle, 
    disconnectWorkspace, notificationSettings, setNotificationSettings, 
    isDarkMode, setIsDarkMode, loadNodes, triggerSyncPulse, 
    storageMode, nodes, selectWorkspace,
    collaboration, stopCollaboration
  } = useNotes();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('redly_sidebar_width');
    return saved ? parseInt(saved, 10) : 260;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('redly_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('redly_sidebar_width', sidebarWidth);
    localStorage.setItem('redly_sidebar_collapsed', isSidebarCollapsed);
  }, [sidebarWidth, isSidebarCollapsed]);

  const [helpOpen, setHelpOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [storageWarningOpen, setStorageWarningOpen] = useState(false);
  const [backupWarningOpen, setBackupWarningOpen] = useState(false);
  const [pairingRequest, setPairingRequest] = useState(null);
  const [syncConflicts, setSyncConflicts] = useState(null);
  const [syncToasts, setSyncToasts] = useState([]);
  const [syncSuccessModal, setSyncSuccessModal] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);

  const handleExport = async () => {
    try {
      const data = await exportSandboxData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `redly-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();

      localStorage.setItem('redly_last_backup_time', Date.now().toString());
      setBackupWarningOpen(false);

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  };

  useEffect(() => {
    // Check if we need to show the 48-hour browser storage warning
    if (workspaceHandle && storageMode === 'sandbox') {
      const startTimeStr = localStorage.getItem('redly_sandbox_start_time');
      const now = Date.now();

      // 48 Hour Local Storage Warning
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isFileSystemSupported = 'showDirectoryPicker' in window;

      let showingStorageWarning = false;
      if (!isMobile && isFileSystemSupported) {
        const dismissed = localStorage.getItem('redly_sandbox_warning_dismissed') === 'true';
        if (!dismissed && startTimeStr) {
          const startTime = parseInt(startTimeStr, 10);
          const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
          if (now - startTime > FORTY_EIGHT_HOURS) {
            setStorageWarningOpen(true);
            showingStorageWarning = true;
          }
        }
      }

      // 7-day Backup Warning
      if (!showingStorageWarning) {
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const lastBackupTimeStr = localStorage.getItem('redly_last_backup_time');
        const snoozeTimeStr = localStorage.getItem('redly_backup_snooze_time');

        let lastValidTime = null;
        if (lastBackupTimeStr) {
          lastValidTime = parseInt(lastBackupTimeStr, 10);
        } else if (startTimeStr) {
          lastValidTime = parseInt(startTimeStr, 10);
        }

        let isSnoozed = false;
        if (snoozeTimeStr) {
          const snoozeTime = parseInt(snoozeTimeStr, 10);
          if (now - snoozeTime < ONE_DAY) {
            isSnoozed = true;
          }
        }

        if (!isSnoozed && lastValidTime && (now - lastValidTime > SEVEN_DAYS)) {
          setBackupWarningOpen(true);
        }
      }
    }
  }, [workspaceHandle, storageMode]);

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
  }, [loadNodes, triggerSyncPulse]);

  useEffect(() => {
    const handleKeyDown = async (e) => { // Made async to support await in migration logic
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
    };
    window.addEventListener('keydown', handleKeyDown);
    if (activeFileId && showTasks) {
      setShowTasks(false);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId, showTasks, disconnectWorkspace]);

  useEffect(() => {
    if (collaboration.active && collaboration.role === 'host') {
      setShowCollabModal(true);
    }
  }, [collaboration.active, collaboration.role]);

    if (isInitializing) {
    const { migrationStatus } = useNotes();
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          {migrationStatus === 'migrating' ? (
            <>
              <RefreshCw className="spin" size={32} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
              <h2 style={{ fontSize: '20px', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Migrating Data...</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Moving your notes to the new storage system. Please wait.</p>
              <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spin { animation: spin 2s linear infinite; }
              `}</style>
            </>
          ) : (
            <p style={{ color: 'var(--text-tertiary)' }}>Loading Redly...</p>
          )}
        </div>
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
      <div className="app-container" style={{ '--sidebar-width': isSidebarCollapsed ? '0px' : `${sidebarWidth}px` }}>
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        ></div>

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          sidebarWidth={sidebarWidth}
          setSidebarWidth={setSidebarWidth}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenTrash={() => setTrashOpen(true)}
          onOpenSync={() => setSyncOpen(true)}
          setShowTasks={() => { setShowTasks(true); setActiveFileId(null); setSidebarOpen(false); }}
          onGoHome={() => { setActiveFileId(null); setShowTasks(false); setSidebarOpen(false); }}
        />
        <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        <TrashModal isOpen={trashOpen} onClose={() => setTrashOpen(false)} />
        {syncOpen && <SyncModal onClose={() => setSyncOpen(false)} />}
        <CollaborationModal 
          isOpen={showCollabModal} 
          onClose={() => setShowCollabModal(false)} 
          collaboration={collaboration}
          onStop={stopCollaboration}
        />

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

        {storageWarningOpen && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-content" style={{ maxWidth: '420px', padding: '32px' }}>
              <h2 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>Browser Storage Warning</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginBottom: '24px', lineHeight: '1.5' }}>
                You're using temporary browser storage. For total peace of mind, switch to a Local Folder to save notes directly to your device.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="primary-btn"
                  onClick={() => {
                    localStorage.setItem('redly_sandbox_warning_dismissed', 'true');
                    setStorageWarningOpen(false);
                  }}
                  style={{ padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {backupWarningOpen && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-content" style={{ maxWidth: '420px', padding: '32px' }}>
              <h2 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>Backup Recommended</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginBottom: '24px', lineHeight: '1.5' }}>
                It's been over 7 days since you last backed up your Browser Storage notes. Do you want to export a secure backup now?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="secondary-btn"
                  onClick={() => {
                    localStorage.setItem('redly_backup_snooze_time', Date.now().toString());
                    setBackupWarningOpen(false);
                  }}
                  style={{ padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  Later
                </button>
                <button
                  className="primary-btn"
                  onClick={handleExport}
                  style={{ padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Backup Now
                </button>
              </div>
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
              {isSidebarCollapsed && (
                <button
                  className="icon-button desktop-menu-btn"
                  onClick={() => setIsSidebarCollapsed(false)}
                  title="Show Sidebar"
                >
                  <PanelLeft size={20} />
                </button>
              )}
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
                .desktop-menu-btn { display: none !important; }
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

              {/* {collaboration.active && (
                <button
                  className="icon-button collab-pulse-btn"
                  onClick={() => setShowCollabModal(true)}
                  title="Collaboration Active - Click for options"
                  style={{ 
                    background: 'rgba(37, 99, 235, 0.1)', 
                    color: 'var(--accent-color)',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  <Activity size={16} className="collab-pulse" />
                  Live
                </button>
              )} */}

              <NotificationToggle />
            </div>
          </div>

          <style>{`
            .collab-pulse {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.4; }
              100% { opacity: 1; }
            }
          `}</style>

          {showTasks && <GlobalTasks />}
          {!showTasks && activeFileId && <Editor key={`${activeFileId}-${collaboration.roomId ?? 'local'}`} fileId={activeFileId} />}
          {!showTasks && !activeFileId && <WelcomeScreen openHelp={() => setHelpOpen(true)} />}
        </main>
      </div>
    </PullToRefresh>
  );
}

export default App;
