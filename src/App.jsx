import React, { useState, useEffect } from 'react';
import { useNotes } from './context/NotesContext';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import HelpModal from './components/HelpModal';
import GlobalTasks from './components/GlobalTasks';
import WelcomeScreen from './components/WelcomeScreen';
import { Menu, Sun, Moon } from 'lucide-react';

function App() {
  const { isInitializing, activeFileId, setActiveFileId, workspaceHandle, disconnectWorkspace } = useNotes();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.closest('.ProseMirror')) {
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
        <p style={{ color: 'var(--text-tertiary)' }}>Loading your workspace...</p>
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
    <div className="app-container">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenHelp={() => setHelpOpen(true)}
        setShowTasks={() => { setShowTasks(true); setActiveFileId(null); setSidebarOpen(false); }}
        onGoHome={() => { setActiveFileId(null); setShowTasks(false); setSidebarOpen(false); }}
      />
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      <main className="main-area">
        <div className="editor-header" style={{ display: 'flex', gap: '16px', borderBottom: activeFileId ? '1px solid var(--border-color)' : 'none', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              className="icon-button mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              style={{ display: 'none' }}
            >
              <Menu size={20} />
            </button>
            <style>{`
              @media (max-width: 768px) {
                .mobile-menu-btn { display: flex !important; }
              }
            `}</style>
          </div>

          <button
            className="icon-button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Theme"
            style={{ marginRight: '16px' }}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {showTasks && <GlobalTasks />}
        {!showTasks && activeFileId && <Editor fileId={activeFileId} />}
        {!showTasks && !activeFileId && <WelcomeScreen openHelp={() => setHelpOpen(true)} />}
      </main>
    </div>
  );
}

export default App;
