import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

import './styles/index.css';

import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { applyTheme, getStoredTheme, persistTheme } from './utils/theme';

// ✅ React mount se PEHLE — stored theme seedha HTML pe apply karo
const storedTheme = getStoredTheme();
persistTheme(storedTheme);
applyTheme(storedTheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);