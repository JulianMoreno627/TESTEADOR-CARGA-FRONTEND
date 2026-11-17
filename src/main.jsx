import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { wakeUpBackend } from './api/wakeUp.js';
import App from './App.jsx';
import { API_URL } from './config.js';
import './styles/global.css';

// Render gratuito apaga el backend sin uso: se le avisa apenas abre la app.
wakeUpBackend(API_URL);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
