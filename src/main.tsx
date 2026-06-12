import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { applyTheme } from './themes/themes';
import { loadSettings } from './storage/persist';
import { primeOnInteraction } from './sound/sound';
import { registerWebUpdates } from './pwa/registerWebUpdates';
import './styles/global.css';

// Apply persisted theme before first paint to avoid a flash.
applyTheme(loadSettings().theme);
primeOnInteraction();
registerWebUpdates();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
