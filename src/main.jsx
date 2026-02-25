import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { NotesProvider } from './context/NotesContext.jsx'

console.log('[main.jsx] V3: Script execution started');

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('[Fatal Error]', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: 'white', zIndex: 99999, position: 'relative' }}>
          <h1>Something went wrong.</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <p>Check the console for more details.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (!container) {
  console.error('Fatal: #root element not found in DOM');
} else {
  console.log('[main.jsx] Root element found, starting render');
  try {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <NotesProvider>
            <App />
          </NotesProvider>
        </ErrorBoundary>
      </StrictMode>
    );
    console.log('[main.jsx] Render called successfully');
  } catch (err) {
    console.error('[main.jsx] createRoot/render failed:', err);
  }
}